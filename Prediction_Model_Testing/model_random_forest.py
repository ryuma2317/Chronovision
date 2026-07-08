import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


print("   CHRONOVISION — Random Forest")



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


# Training on a 100K sample — still very representative.
SAMPLE = 100_000
rng = np.random.default_rng(42)
idx = rng.choice(len(X_train), SAMPLE, replace=False)
print(f"\n Training Random Forest (sample: {SAMPLE:,} rows)...")

model = RandomForestRegressor(
    n_estimators     = 100,
    max_depth        = 10,
    min_samples_leaf = 50,
    max_features     = 'sqrt',
    random_state     = 42,
    n_jobs           = -1,
)
model.fit(X_train[idx], y_train[idx])
print("   Done!")


print("\n Evaluating on full test set...")
y_pred = np.clip(model.predict(X_test), 0.0, 4.0)

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


print("\n Top 10 Features:")
importance = pd.Series(model.feature_importances_, index=FEATURES)
for i, (feat, score) in enumerate(importance.sort_values(ascending=False).head(10).items(), 1):
    print(f"   {i:>2}. {feat:<30} {score:.4f}")


os.makedirs('model', exist_ok=True)
joblib.dump({'model': model, 'encoders': encoders, 'features': FEATURES},
            'model/random_forest.pkl')

print("\n Saved → model/random_forest.pkl")

