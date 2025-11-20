# train_dosha_model.py
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier

import pickle
from dataset_loader import load_dosha_dataset

# Load dataset
df = load_dosha_dataset("dosha_dataset.csv")

# ----------------------------
# Preprocess
# ----------------------------
df_proc = df.copy()

# Drop irrelevant columns if exist
drop_cols = ["Hair Color", "Eyes", "Eyelashes", "Blinking of Eyes", "Cheeks",
             "Nose", "Teeth and gums", "Lips", "Nails"]
df_proc.drop(columns=[c for c in drop_cols if c in df_proc.columns], inplace=True)

# Encode categorical columns
cat_cols = df_proc.select_dtypes(include="object").columns.tolist()
cat_cols = [c for c in cat_cols if c != "Dosha"]

encoders = {}
for col in cat_cols:
    le = LabelEncoder()
    df_proc[col] = le.fit_transform(df_proc[col].astype(str))
    encoders[col] = le

# Standardize numeric columns
num_cols = df_proc.select_dtypes(include=["int64","float64"]).columns.tolist()
scaler = StandardScaler()
df_proc[num_cols] = scaler.fit_transform(df_proc[num_cols])

# ----------------------------
# Train RandomForest
# ----------------------------
X = df_proc.drop("Dosha", axis=1)
y = LabelEncoder().fit_transform(df_proc["Dosha"])

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = RandomForestClassifier(n_estimators=200, random_state=42)
model.fit(X_train, y_train)

score = model.score(X_test, y_test)
print(f"[INFO] Dosha Model Accuracy: {score*100:.2f}%")

# ----------------------------
# Save model
# ----------------------------
with open("dosha_model.pkl", "wb") as f:
    pickle.dump({
        "model": model,
        "encoders": encoders,
        "scaler": scaler,
        "target_le": LabelEncoder().fit(df_proc["Dosha"])
    }, f)


print("[INFO] dosha_model.pkl saved successfully")
