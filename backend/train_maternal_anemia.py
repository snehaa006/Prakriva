"""
Train the maternal anemia + pregnancy-risk models used by /maternal/predict.

This is the script form of `notebooks/maternal_anemia_risk_model.ipynb` — same
features, same hyper-parameters — so the API and the notebook stay in sync.

    cd backend && python train_maternal_anemia.py
"""
import json
import os

import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict, train_test_split
from xgboost import XGBClassifier

from maternal_anemia import (
    ANEMIA_LABELS, ANEMIA_MODEL_PATH, DATASET_PATH, FEATURE_COLUMNS, MODELS_DIR,
    RISK_LABELS, RISK_MODEL_PATH, SCHEMA_PATH, align_features, build_features,
)

RANDOM_STATE, TEST_SIZE = 42, 0.20
XGB_PARAMS = dict(
    n_estimators=350, max_depth=4, learning_rate=0.05,
    subsample=0.9, colsample_bytree=0.9,
    eval_metric="mlogloss", random_state=RANDOM_STATE,
)


def main() -> None:
    df_raw = pd.read_csv(DATASET_PATH)
    print(f"[INFO] Dataset: {DATASET_PATH}  rows={len(df_raw)}")

    X_full = build_features(df_raw)
    feature_defaults = {c: float(X_full[c].median()) for c in FEATURE_COLUMNS}
    X = align_features(X_full, FEATURE_COLUMNS, feature_defaults)

    y_anemia = df_raw["Anemia_Status"].map({k: i for i, k in enumerate(ANEMIA_LABELS)})
    y_risk = df_raw["Pregnancy_Risk"].map({k: i for i, k in enumerate(RISK_LABELS)})

    idx_tr, idx_te = train_test_split(
        X.index, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y_risk
    )
    cv = StratifiedKFold(5, shuffle=True, random_state=RANDOM_STATE)

    anemia_model = XGBClassifier(**XGB_PARAMS)
    anemia_model.fit(X.loc[idx_tr], y_anemia.loc[idx_tr])
    cv_anemia = cross_val_predict(XGBClassifier(**XGB_PARAMS), X, y_anemia, cv=cv)
    print(f"[ANEMIA] 5-fold CV accuracy : {accuracy_score(y_anemia, cv_anemia):.4f}")
    print(f"[ANEMIA] hold-out accuracy  : "
          f"{accuracy_score(y_anemia.loc[idx_te], anemia_model.predict(X.loc[idx_te])):.4f}")

    risk_model = XGBClassifier(**XGB_PARAMS)
    risk_model.fit(X.loc[idx_tr], y_risk.loc[idx_tr])
    cv_risk = cross_val_predict(XGBClassifier(**XGB_PARAMS), X, y_risk, cv=cv)
    print(f"[RISK]   5-fold CV accuracy : {accuracy_score(y_risk, cv_risk):.4f}")
    print(f"[RISK]   5-fold CV weighted F1: {f1_score(y_risk, cv_risk, average='weighted'):.4f}")
    print(f"[RISK]   hold-out accuracy  : "
          f"{accuracy_score(y_risk.loc[idx_te], risk_model.predict(X.loc[idx_te])):.4f}")

    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(anemia_model, ANEMIA_MODEL_PATH)
    joblib.dump(risk_model, RISK_MODEL_PATH)
    with open(SCHEMA_PATH, "w") as f:
        json.dump({
            "feature_columns": FEATURE_COLUMNS,
            "feature_defaults": feature_defaults,
            "anemia_labels": ANEMIA_LABELS,
            "risk_labels": RISK_LABELS,
        }, f, indent=2)

    print(f"[SUCCESS] saved -> {ANEMIA_MODEL_PATH}, {RISK_MODEL_PATH}, {SCHEMA_PATH}")


if __name__ == "__main__":
    main()
