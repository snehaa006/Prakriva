"""
Maternal anemia & pregnancy-risk prediction.

Mirrors the preprocessing used to train the two XGBoost models in
`notebooks/maternal_anemia_risk_model.ipynb`, so the dashboard can never drift
from what the models were trained on.

Inputs come from two places:
  * captured once at onboarding  -> Date of birth (age), height
  * captured at every visit      -> weight, gestational week, hemoglobin,
                                    iron supplement, blood pressure

Outputs (never entered by the user):
  * Anemia_Status  -> Normal / Mild / Moderate / Severe
  * Pregnancy_Risk -> Low / Medium / High
"""
import json
import os
import re
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Union

import numpy as np
import pandas as pd
from loguru import logger

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

ANEMIA_MODEL_PATH = os.path.join(MODELS_DIR, "anemia_status_xgb.pkl")
RISK_MODEL_PATH = os.path.join(MODELS_DIR, "pregnancy_risk_xgb.pkl")
SCHEMA_PATH = os.path.join(MODELS_DIR, "maternal_model_schema.json")

DATASET_PATH = os.path.join(BASE_DIR, "data", "Synthetic_Maternal_Anemia_Realistic.csv")

FEATURE_COLUMNS = [
    "Age", "Gestational_Week", "Hemoglobin_g_dL", "Iron_Supplement",
    "Systolic_BP", "Diastolic_BP", "MAP", "Pulse_Pressure", "BMI",
]

ANEMIA_LABELS = ["Normal", "Mild", "Moderate", "Severe"]
RISK_LABELS = ["Low", "Medium", "High"]


# --------------------------------------------------------------------------- #
# Field helpers — shared by training and inference
# --------------------------------------------------------------------------- #
def _num(series: pd.Series) -> pd.Series:
    """Pull the first number out of a possibly messy string column."""
    return pd.to_numeric(
        series.astype(str).str.extract(r"(\d+\.?\d*)")[0], errors="coerce"
    )


def _parse_bp(series: pd.Series):
    """'118/76' -> (118, 76)."""
    parts = series.astype(str).str.extract(r"(?P<sys>\d+)\s*/\s*(?P<dia>\d+)")
    return (
        pd.to_numeric(parts["sys"], errors="coerce"),
        pd.to_numeric(parts["dia"], errors="coerce"),
    )


def height_to_cm(value: Any) -> float:
    """Accept 165, '165 cm' or feet.inches ('5.2' -> 5ft 2in)."""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return float("nan")
    match = re.search(r"(\d+\.?\d*)", str(value))
    if not match:
        return float("nan")
    v = float(match.group(1))
    if v < 8.0:                        # feet.inches notation
        feet = int(v)
        inches = round((v - feet) * 10)
        return (feet * 12 + inches) * 2.54
    return v                           # already centimetres


def age_from_dob(dob: Union[str, date, datetime], today: Optional[date] = None) -> Optional[int]:
    """Age in whole years from the date of birth captured at onboarding."""
    if dob is None or (isinstance(dob, float) and np.isnan(dob)) or dob == "":
        return None
    if isinstance(dob, datetime):
        born = dob.date()
    elif isinstance(dob, date):
        born = dob
    else:
        try:
            born = datetime.fromisoformat(str(dob)[:10]).date()
        except ValueError:
            logger.warning(f"Unparseable date of birth: {dob!r}")
            return None
    ref = today or date.today()
    return ref.year - born.year - ((ref.month, ref.day) < (born.month, born.day))


def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    """Raw dashboard/CSV columns -> clean numeric feature columns."""
    out = pd.DataFrame(index=df.index)

    age = pd.Series(np.nan, index=df.index, dtype=float)
    if "Age" in df.columns:
        age = _num(df["Age"])
    if "Date_of_Birth" in df.columns:
        # Age is derived from the date of birth captured at onboarding.
        age = age.fillna(df["Date_of_Birth"].apply(age_from_dob))
    out["Age"] = age

    out["Gestational_Week"] = _num(df["Gestational_Week"])
    out["Hemoglobin_g_dL"] = _num(df["Hemoglobin_g_dL"])
    out["Iron_Supplement"] = (
        df["Iron_Supplement"].astype(str).str.strip().str.lower().eq("yes").astype(int)
    )

    sys_bp = pd.Series(np.nan, index=df.index, dtype=float)
    dia_bp = pd.Series(np.nan, index=df.index, dtype=float)
    if "Blood_Pressure" in df.columns:
        sys_bp, dia_bp = _parse_bp(df["Blood_Pressure"])
    # Separate systolic/diastolic fields fill in wherever the combined one is absent.
    if "Systolic_BP" in df.columns:
        sys_bp = sys_bp.fillna(_num(df["Systolic_BP"]))
    if "Diastolic_BP" in df.columns:
        dia_bp = dia_bp.fillna(_num(df["Diastolic_BP"]))
    out["Systolic_BP"] = sys_bp
    out["Diastolic_BP"] = dia_bp

    # BMI: use it directly if present, else compute from weight + height.
    bmi = pd.Series(np.nan, index=df.index, dtype=float)
    if "BMI" in df.columns:
        bmi = _num(df["BMI"])
    if "Weight_kg" in df.columns:
        height = pd.Series(np.nan, index=df.index, dtype=float)
        if "Height_cm" in df.columns:
            height = _num(df["Height_cm"])
        if "Height" in df.columns:
            # Height (feet.inches or cm) fills in wherever Height_cm is absent.
            height = height.fillna(df["Height"].apply(height_to_cm))
        bmi = bmi.fillna(_num(df["Weight_kg"]) / ((height / 100.0) ** 2))
    out["BMI"] = bmi

    return out


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["MAP"] = out["Diastolic_BP"] + (1.0 / 3.0) * (out["Systolic_BP"] - out["Diastolic_BP"])
    out["Pulse_Pressure"] = out["Systolic_BP"] - out["Diastolic_BP"]
    return out


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    return engineer_features(preprocess(df))


def align_features(X: pd.DataFrame, cols: List[str], defaults: Dict[str, float]) -> pd.DataFrame:
    X = X.copy()
    for c in cols:
        d = defaults.get(c, 0.0)
        if c not in X.columns:
            X[c] = d
        X[c] = X[c].fillna(d)
    return X[cols]


# --------------------------------------------------------------------------- #
# Predictor
# --------------------------------------------------------------------------- #
class MaternalAnemiaPredictor:
    """Lazily loads the two saved XGBoost models and the shared feature schema."""

    def __init__(self):
        self._anemia_model = None
        self._risk_model = None
        self._schema: Optional[Dict[str, Any]] = None

    @property
    def is_ready(self) -> bool:
        return all(
            os.path.exists(p) for p in (ANEMIA_MODEL_PATH, RISK_MODEL_PATH, SCHEMA_PATH)
        )

    def load(self) -> None:
        if self._anemia_model is not None:
            return
        if not self.is_ready:
            raise FileNotFoundError(
                "Maternal anemia models not found. Run "
                "`python train_maternal_anemia.py` from the backend directory first."
            )
        import joblib

        self._anemia_model = joblib.load(ANEMIA_MODEL_PATH)
        self._risk_model = joblib.load(RISK_MODEL_PATH)
        with open(SCHEMA_PATH) as f:
            self._schema = json.load(f)
        logger.success("Maternal anemia + pregnancy risk models loaded")

    def predict(self, records: Union[Dict[str, Any], List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """
        records: dict or list of dicts with keys
            Age (or Date_of_Birth), Gestational_Week, Hemoglobin_g_dL,
            Iron_Supplement ('Yes'/'No'), Blood_Pressure ('118/76') or
            Systolic_BP + Diastolic_BP, and either BMI or (Weight_kg + Height/Height_cm).
        """
        self.load()
        if isinstance(records, dict):
            records = [records]

        raw = pd.DataFrame(records)
        features = align_features(
            build_features(raw),
            self._schema["feature_columns"],
            self._schema["feature_defaults"],
        )

        anemia_labels = self._schema["anemia_labels"]
        risk_labels = self._schema["risk_labels"]

        a_pred = self._anemia_model.predict(features)
        a_proba = self._anemia_model.predict_proba(features)
        r_pred = self._risk_model.predict(features)
        r_proba = self._risk_model.predict_proba(features)

        results = []
        for i in range(len(features)):
            results.append({
                "anemia_status": anemia_labels[int(a_pred[i])],
                "anemia_confidence": round(float(a_proba[i].max()), 3),
                "anemia_probabilities": {
                    label: round(float(p), 3) for label, p in zip(anemia_labels, a_proba[i])
                },
                "pregnancy_risk": risk_labels[int(r_pred[i])],
                "risk_confidence": round(float(r_proba[i].max()), 3),
                "risk_probabilities": {
                    label: round(float(p), 3) for label, p in zip(risk_labels, r_proba[i])
                },
                "features_used": {
                    c: (None if pd.isna(features.iloc[i][c]) else round(float(features.iloc[i][c]), 2))
                    for c in features.columns
                },
            })
        return results


maternal_predictor = MaternalAnemiaPredictor()
