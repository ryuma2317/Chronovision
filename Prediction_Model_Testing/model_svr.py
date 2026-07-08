import pandas as pd
import numpy as np
import joblib
import os
from sklearn.svm import SVR
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


print("   CHRONOVISION — SVR (Support Vector Regression)")



print("\n Loading dataset...")
df = pd.read_csv('../data_generation/chronovision_training_data.csv')
df = df.drop(columns=['student_id'])
print(f"   {len(df):,} rows × {len(df.columns)} columns")


CATEGORICAL_COLS = [
    'gender', 'major', 'diet_quality', 'study_environment',
    'learning_style', 'parental_education_level',
    'family_income_range', 'internet_quality',
]
encoders = {}
for col in CATEGORICAL_COLS:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col].astype(str))
    encoders[col] = le


TARGET   = 'gpa'
FEATURES = [c for c in df.columns if c != TARGET]
X = df[FEATURES].values
y = df[TARGET].values


X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
print(f"   Train: {len(X_train):,}  |  Test: {len(X_test):,}")


# SVR requires feature scaling
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)


# Note: SVR has O(n²) memory complexity — not suitable for 500K rows.
# Training on 10K sample which is standard practice for SVR.
SAMPLE = 10_000
rng = np.random.default_rng(42)
idx = rng.choice(len(X_train_scaled), SAMPLE, replace=False)
print(f"\n Training SVR (sample: {SAMPLE:,} rows)...")
print("   Note: SVR is O(n²) — large datasets require sampling.")

model = SVR(
    kernel  = 'rbf',
    C       = 5,
    epsilon = 0.1,
    gamma   = 'scale',
)
model.fit(X_train_scaled[idx], y_train[idx])
print("   Done!")


print("\n Evaluating on full test set...")
y_pred = np.clip(model.predict(X_test_scaled), 0.0, 4.0)

mae  = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
r2   = r2_score(y_test, y_pred)

def gpa_bucket(g):
    if g >= 3.5: return 'High (3.5+)'
    elif g >= 3.0: return 'Good (3.0-3.5)'
    elif g >= 2.0: return 'Average (2.0-3.0)'
    else: return 'Low (<2.0)'

bucket_acc = np.mean([gpa_bucket(a) == gpa_bucket(b) for a, b in zip(y_test, y_pred)])

print(f"\n   R²             : {r2:.4f}")
print(f"   MAE            : {mae:.4f}")
print(f"   RMSE           : {rmse:.4f}")
print(f"   Bucket Accuracy: {bucket_acc:.2%}")


os.makedirs('model', exist_ok=True)
joblib.dump({'model': model, 'scaler': scaler, 'encoders': encoders, 'features': FEATURES},
            'model/svr.pkl')

print("\n Saved → model/svr.pkl")
