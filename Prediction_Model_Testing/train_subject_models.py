"""
Chronovision — train ONE model PER SUBJECT (midterm + behaviour -> predicted final)

WHY SIX MODELS INSTEAD OF ONE
------------------------------
The old system had a single model: 36 features -> one GPA number. It could never
answer "what will this student get in their Maths final?" because it never
predicted subject scores at all.

Here we train six separate XGBoost regressors — one for each subject. Each one
learns the same job for its own subject:

    inputs : that subject's MIDTERM + all the behavioural features
    output : that subject's predicted FINAL (0-100)

Each model gets its own subject's midterm (and NOT the other subjects' midterms)
so that the prediction for Maths is genuinely about Maths. The behavioural
features (study hours, attendance, stress, ...) are shared, because they affect
every subject.

Once all six finals are predicted, the app combines them into a credit-weighted
GPA — that arithmetic lives in the Flask service, not in a model.

OUTPUT: model/subject_models.pkl containing, for each subject, the trained model
plus the shared encoders and the exact feature order it expects.
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from xgboost import XGBRegressor

DATA_PATH = os.path.join('..', 'data_generation', 'chronovision_training_data_v2.csv')
OUT_DIR = 'model'
os.makedirs(OUT_DIR, exist_ok=True)

SUBJECTS = ['mathematics', 'physics', 'chemistry', 'biology', 'computer_science', 'statistics']

# Behavioural / demographic features shared by every subject model.
SHARED_FEATURES = [
    'age', 'gender', 'major', 'semester', 'course_load',
    'study_hours_per_day', 'attendance_percentage', 'time_management_score',
    'study_environment', 'social_media_hours', 'netflix_hours', 'sleep_hours',
    'diet_quality', 'exercise_frequency', 'part_time_job',
    'extracurricular_participation', 'stress_level', 'mental_health_rating',
    'exam_anxiety_score', 'motivation_level', 'learning_style',
    'parental_education_level', 'parental_support_level', 'family_income_range',
    'internet_quality', 'access_to_tutoring', 'previous_gpa', 'aptitude_score',
]

CATEGORICAL_COLS = [
    'gender', 'major', 'diet_quality', 'study_environment',
    'learning_style', 'parental_education_level',
    'family_income_range', 'internet_quality',
]

print(f"Loading {DATA_PATH} ...")
df = pd.read_csv(DATA_PATH)
print(f"   {len(df):,} rows")

# ─── Encode categoricals ONCE; all six models share the same encoders ────────
encoders = {}
for col in CATEGORICAL_COLS:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col].astype(str))
    encoders[col] = le

bundle = {'encoders': encoders, 'subjects': {}}
results = []

for subject in SUBJECTS:
    midterm_col = f'{subject}_midterm'
    final_col   = f'{subject}_final'

    # This subject's model sees the SHARED features + ITS OWN midterm.
    features = SHARED_FEATURES + [midterm_col]

    X = df[features]
    y = df[final_col]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = XGBRegressor(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    pred = model.predict(X_test)
    r2   = r2_score(y_test, pred)
    mae  = mean_absolute_error(y_test, pred)
    rmse = float(np.sqrt(mean_squared_error(y_test, pred)))
    results.append((subject, r2, mae, rmse))

    print(f"   {subject:<18} R2={r2:.4f}  MAE={mae:.2f}  RMSE={rmse:.2f}")

    bundle['subjects'][subject] = {
        'model': model,
        'features': features,       # exact order Flask must rebuild
        'midterm_col': midterm_col,
        'metrics': {'r2': float(r2), 'mae': float(mae), 'rmse': rmse},
    }

out_path = os.path.join(OUT_DIR, 'subject_models.pkl')
joblib.dump(bundle, out_path)

print("\n── Summary ──")
print(f"{'subject':<18}{'R2':>8}{'MAE':>8}{'RMSE':>8}")
for s, r2, mae, rmse in results:
    print(f"{s:<18}{r2:>8.4f}{mae:>8.2f}{rmse:>8.2f}")
print(f"\nSaved 6 models -> {out_path}")
print("\nInterpreting these numbers for your defense:")
print("  R2  ~ how much of the variation in the final the model explains (1.0 = perfect).")
print("  MAE ~ average error in points, e.g. MAE 4.0 means predictions are off by ~4 marks.")
print("  A high R2 is EXPECTED here because the midterm is a strong signal — that is")
print("  the point of the feature, not a bug. Be ready to say so.")
