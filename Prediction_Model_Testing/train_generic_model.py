"""
Chronovision — ONE course-agnostic model that works at ANY point in the semester.

THE PROBLEM THIS SOLVES
-----------------------
The previous model required a midterm. That makes it useless in week 3, which is
exactly when a struggling student could still turn things around. A prediction
system that only works once it's too late to act isn't a prediction system.

THE TRICK: TRAIN WITH RANDOM MASKING.
XGBoost handles missing values natively — at every split it learns a default
direction for NaN. So instead of training two models (an "early" one and a
"midterm" one), we train ONE model on data where the course observables are
randomly hidden:

    stage        what the model sees                      ~when
    ─────────────────────────────────────────────────────────────
    week_1       difficulty only                          day one
    week_2       + course attendance                      week 2
    week_5       + quiz average                           week 5
    week_7       + assignment average                     week 7
    week_9       + midterm  (everything)                  week 9

Each training row is randomly assigned a stage, and anything that hasn't
"arrived" yet is set to NaN. The model therefore learns to predict from whatever
it is given.

At runtime the student fills in what they have. Blank boxes go to Flask as null,
land in the model as NaN, and the model copes — the prediction just gets sharper
as the semester supplies more evidence. Same model, same endpoint, one pickle.

We report R2 PER STAGE, because a single headline R2 would be dishonest: a
week-2 prediction genuinely IS less certain than a week-9 one, and the UI must
say so.

OUTPUT: model/generic_model.pkl
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import r2_score, mean_absolute_error
from xgboost import XGBRegressor

DATA_PATH = os.path.join('..', 'data_generation', 'chronovision_training_data_v3.csv')
OUT_DIR = 'model'
os.makedirs(OUT_DIR, exist_ok=True)

COURSES = {
    'course_1': 5.0, 'course_2': 4.0, 'course_3': 3.5,
    'course_4': 3.0, 'course_5': 2.0, 'course_6': 1.0,
}

# The 15 survivors. No demographics, no socioeconomics, no learning_style.
STUDENT_FEATURES = [
    'study_hours_per_day', 'attendance_percentage', 'time_management_score',
    'study_environment', 'course_load',
    'sleep_hours', 'social_media_hours', 'exercise_frequency', 'diet_quality',
    'stress_level', 'mental_health_rating', 'exam_anxiety_score', 'motivation_level',
    'previous_gpa', 'aptitude_score',
]
CATEGORICAL_COLS = ['study_environment', 'diet_quality']

# Course inputs. difficulty_level is ALWAYS known (the admin set it).
# The other four are maskable — they arrive over the semester.
COURSE_FEATURES = ['difficulty_level', 'course_attendance', 'quiz_average',
                   'assignment_average', 'midterm']
MASKABLE = ['course_attendance', 'quiz_average', 'assignment_average', 'midterm']

FEATURE_ORDER = STUDENT_FEATURES + COURSE_FEATURES

# What each stage knows. Anything absent is NaN.
STAGES = {
    'week_1': [],
    'week_2': ['course_attendance'],
    'week_5': ['course_attendance', 'quiz_average'],
    'week_7': ['course_attendance', 'quiz_average', 'assignment_average'],
    'week_9': ['course_attendance', 'quiz_average', 'assignment_average', 'midterm'],
}
STAGE_NAMES = list(STAGES.keys())
STAGE_PROBS = [0.10, 0.20, 0.20, 0.20, 0.30]

rng = np.random.default_rng(42)

print(f"Loading {DATA_PATH} ...")
df = pd.read_csv(DATA_PATH)
print(f"   {len(df):,} students")

encoders = {}
for col in CATEGORICAL_COLS:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col].astype(str))
    encoders[col] = le

# ─── WIDE -> LONG: one row per (student, course) ─────────────────────────────
print("Reshaping wide -> long (one row per student per course)...")
frames = []
for course, level in COURSES.items():
    block = df[STUDENT_FEATURES].copy()
    block['difficulty_level']   = level
    block['course_attendance']  = df[f'{course}_attendance']
    block['quiz_average']       = df[f'{course}_quiz']
    block['assignment_average'] = df[f'{course}_assignment']
    block['midterm']            = df[f'{course}_midterm']
    block['final']              = df[f'{course}_final']
    frames.append(block)

long_df = pd.concat(frames, ignore_index=True)
print(f"   {len(long_df):,} rows ({len(df):,} students x {len(COURSES)} courses)")

# ─── APPLY THE MASK ──────────────────────────────────────────────────────────
print("Masking course observables by semester stage...")
long_df['_stage'] = rng.choice(STAGE_NAMES, size=len(long_df), p=STAGE_PROBS)

for stage, known in STAGES.items():
    rows = long_df['_stage'] == stage
    for col in MASKABLE:
        if col not in known:
            long_df.loc[rows, col] = np.nan

for stage in STAGE_NAMES:
    n = int((long_df['_stage'] == stage).sum())
    knows = STAGES[stage] or ['difficulty only']
    print(f"   {stage:<8} {n:>9,} rows  (knows: {knows})")

X = long_df[FEATURE_ORDER]
y = long_df['final']
stage_col = long_df['_stage']

X_train, X_test, y_train, y_test, _, stage_test = train_test_split(
    X, y, stage_col, test_size=0.2, random_state=42
)

model = XGBRegressor(
    n_estimators=450,
    max_depth=7,
    learning_rate=0.08,
    subsample=0.9,
    colsample_bytree=0.9,
    random_state=42,
    n_jobs=-1,
)
print("\nTraining (XGBoost handles the NaNs natively — no imputation)...")
model.fit(X_train, y_train)

# ─── PER-STAGE METRICS — the honest way to report this ───────────────────────
pred = model.predict(X_test)
overall_r2 = r2_score(y_test, pred)
overall_mae = mean_absolute_error(y_test, pred)

print("\n── Accuracy by semester stage ──")
stage_metrics = {}
for stage in STAGE_NAMES:
    m = (stage_test == stage).values
    if m.sum() == 0:
        continue
    r2 = r2_score(y_test[m], pred[m])
    mae = mean_absolute_error(y_test[m], pred[m])
    stage_metrics[stage] = {'r2': float(r2), 'mae': float(mae), 'n': int(m.sum())}
    print(f"   {stage:<8}  R2 = {r2:.4f}   MAE = {mae:5.2f} marks   (n={int(m.sum()):,})")

print(f"\n   overall   R2 = {overall_r2:.4f}   MAE = {overall_mae:.2f} marks")
print("\n   R2 MUST rise from week_1 to week_9. That IS the product: the")
print("   prediction sharpens as the semester gives it more to work with.")

bundle = {
    'model': model,
    'encoders': encoders,
    'features': FEATURE_ORDER,
    'student_features': STUDENT_FEATURES,
    'course_features': COURSE_FEATURES,
    'maskable': MASKABLE,
    'categorical_cols': CATEGORICAL_COLS,
    'stages': STAGES,
    'stage_metrics': stage_metrics,
    'metrics': {'r2': float(overall_r2), 'mae': float(overall_mae)},
}
out_path = os.path.join(OUT_DIR, 'generic_model.pkl')
joblib.dump(bundle, out_path)
print(f"\nSaved -> {out_path}")

# ─── GATE 1: does it work with NOTHING but difficulty? ───────────────────────
print("\n── Gate 1: a brand-new course, week 1, no coursework yet ──")
sample = X_test.iloc[[0]].copy()
for col in MASKABLE:
    sample[col] = np.nan
for lvl in [1, 3, 5]:
    sample['difficulty_level'] = lvl
    p = float(np.clip(model.predict(sample)[0], 0, 100))
    print(f"   difficulty {lvl}, no coursework -> predicted final {p:.1f}")
print("   ^ must return a real number, and FALL as difficulty rises.")

# ─── GATE 2: does more evidence sharpen the prediction? ──────────────────────
print("\n── Gate 2: same student, same course, evidence arriving ──")
row = X_test.iloc[[1]].copy()
truth = float(y_test.iloc[1])
full = {c: row[c].iloc[0] for c in MASKABLE}
for stage, known in STAGES.items():
    s = row.copy()
    for col in MASKABLE:
        s[col] = full[col] if col in known else np.nan
    p = float(np.clip(model.predict(s)[0], 0, 100))
    print(f"   {stage:<8} -> {p:5.1f}   (actual: {truth:.1f}, off by {abs(p - truth):5.1f})")
print("   ^ the error should generally SHRINK as the weeks go on.")