# Maternal Anemia & Pregnancy-Risk Model

Two XGBoost models turn routine antenatal inputs into two clinical outputs.
`Anemia_Status` and `Pregnancy_Risk` are **always model outputs** — never typed
in by the patient.

| Output | Classes | Accuracy on the synthetic cohort |
|---|---|---|
| Anemia Status | Normal / Mild / Moderate / Severe | ~100% (Hb defines anemia by the WHO cut-offs) |
| Pregnancy Risk | Low / Medium / High | ~82% 5-fold CV (weighted F1 ≈ 0.81) |

## Where each input comes from

Asked **once**, at onboarding (`/patient/questionnaire`), and reused forever:

| Field | Stored as | Used as |
|---|---|---|
| Date of birth | `patients/{uid}.dob` | `Age` |
| Height (cm) | `patients/{uid}.heightCm` | half of `BMI` |
| LMP date (if pregnant) | `patients/{uid}.lmpDate` | pre-fills `Gestational_Week` |

Asked **at every visit** (`/patient/maternal-health`):

| Field | Model feature |
|---|---|
| Weight (kg) | `BMI`, with the stored height |
| Gestational week | `Gestational_Week` |
| Hemoglobin (g/dL) | `Hemoglobin_g_dL` |
| Iron supplement (Yes/No) | `Iron_Supplement` |
| Blood pressure (sys/dia) | `Systolic_BP`, `Diastolic_BP`, and the engineered `MAP` + `Pulse_Pressure` |

Weight is re-asked each visit because it changes through pregnancy; height and
date of birth do not.

## Training

```bash
cd backend
pip install -r requirements.txt
python train_maternal_anemia.py
```

Reads `backend/data/Synthetic_Maternal_Anemia_Realistic.csv` and writes
`backend/models/anemia_status_xgb.pkl`, `pregnancy_risk_xgb.pkl` and
`maternal_model_schema.json`. The schema pins the feature order and the median
fallbacks, so the API can never drift from the training-time transform. The
exploratory version of the same pipeline (plots, SHAP) lives in
`notebooks/maternal_anemia_risk_model.ipynb`.

The committed `.pkl` files are what production serves — retrain locally and
commit the new files when the dataset changes.

## API

`POST /maternal/predict`

```json
{
  "Patient_ID": "P001",
  "Date_of_Birth": "1998-04-12",
  "Height_cm": 157,
  "Weight_kg": 52,
  "Gestational_Week": 30,
  "Hemoglobin_g_dL": 9.6,
  "Iron_Supplement": "No",
  "Systolic_BP": 138,
  "Diastolic_BP": 89
}
```

`Age` may be sent instead of `Date_of_Birth`, `BMI` instead of
`Weight_kg` + `Height_cm`, and `Blood_Pressure: "138/89"` instead of the split
fields. Response:

```json
{
  "success": true,
  "data": {
    "anemia_status": "Moderate",
    "anemia_confidence": 1.0,
    "anemia_probabilities": { "Normal": 0.0, "Mild": 0.0, "Moderate": 1.0, "Severe": 0.0 },
    "pregnancy_risk": "High",
    "risk_confidence": 0.787,
    "risk_probabilities": { "Low": 0.0, "Medium": 0.213, "High": 0.787 },
    "features_used": { "Age": 28.0, "BMI": 21.1, "MAP": 105.33, "...": 0 }
  }
}
```

Missing models return HTTP 500 with the retraining instruction; invalid inputs
return HTTP 400 naming the offending field.

## Deployment (Render)

`render.yaml` at the repo root is a Render blueprint with two services:

- **prakriva-api** — Python web service, `rootDir: backend`, started with
  `gunicorn app:app`. Health check on `/health`, which also reports whether the
  maternal models loaded.
- **prakriva-web** — static site built with `npm run build`, pointed at the API
  through `VITE_API_URL`.

After the first deploy, set the real URLs: `VITE_API_URL` on the web service and
`CORS_ORIGINS` on the API. Upload `firebase_key.json` as a Render secret file and
point `FIREBASE_KEY_PATH` at it (e.g. `/etc/secrets/firebase_key.json`).

Use the Starter instance rather than the free one: pandas + xgboost need more
than the free tier's memory, and free services sleep between requests.
