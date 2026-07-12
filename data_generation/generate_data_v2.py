"""
Chronovision — training data generator v2 (subject-level midterm → final)

WHAT CHANGED FROM v1, AND WHY IT MATTERS
----------------------------------------
v1 generated the GPA first, then invented each subject score by working
*backwards* from the GPA. That meant the dataset contained no midterm, no final,
and no real "midterm predicts final" relationship — so no honest model could ever
learn one.

v2 inverts the causality so it matches reality:

    1. Each subject gets a MIDTERM score, driven by the student's ability
       (persona, aptitude, previous GPA) plus subject-specific talent.
    2. Each subject's FINAL score is then driven by:
         - that subject's midterm       (strongest signal — you build on where you are)
         - the student's behaviour      (study hours, attendance, stress, sleep, ...)
         - a subject-specific difficulty/improvement term
         - noise
    3. The GPA is COMPUTED from the finals, credit-weighted (a subject with 3
       credits counts more than one with 2) — exactly like a real transcript.

Because the final is genuinely generated *from* the midterm + behaviour, a model
trained on (midterm + behaviour) -> final is learning a relationship that really
exists in the data. That is what makes the new feature defensible.

OUTPUT COLUMNS (per subject): <subject>_midterm and <subject>_final
Plus: gpa (credit-weighted from the finals) and all the behavioural features.
"""

import numpy as np
import pandas as pd
from numpy.random import default_rng

N = 200_000          # rows (lower than v1's 500k — trains 6 models, keeps it quick)
rng = default_rng(42)

print("Generating Chronovision training data v2 (midterm -> final per subject)...")

# ─── SUBJECTS AND CREDITS ────────────────────────────────────────────────────
# Credits decide how much each subject pulls on the final GPA.
# These defaults are mirrored in the database `subjects` table so an admin can
# change them later; keep the two in sync if you edit these.
SUBJECTS = {
    'mathematics':      {'credits': 3, 'difficulty': -3.0},
    'physics':          {'credits': 3, 'difficulty': -2.0},
    'chemistry':        {'credits': 2, 'difficulty': -1.0},
    'biology':          {'credits': 2, 'difficulty':  1.0},
    'computer_science': {'credits': 3, 'difficulty':  2.0},
    'statistics':       {'credits': 2, 'difficulty':  0.0},
}
TOTAL_CREDITS = sum(s['credits'] for s in SUBJECTS.values())   # 15

# ─── PERSONAS ────────────────────────────────────────────────────────────────
PERSONAS      = ['high_achiever', 'average', 'struggling', 'burnout', 'social_butterfly']
PERSONA_PROBS = [0.20,             0.35,      0.20,         0.10,      0.15]
personas = rng.choice(PERSONAS, size=N, p=PERSONA_PROBS)
p_mask = {p: personas == p for p in PERSONAS}


def persona_sample(means, stds, lo, hi):
    out = np.empty(N)
    for i, p in enumerate(PERSONAS):
        m = p_mask[p]
        out[m] = rng.normal(means[i], stds[i], m.sum())
    return np.clip(out, lo, hi)


def normalize(arr, lo, hi):
    return (np.clip(arr, lo, hi) - lo) / (hi - lo)


# ─── BEHAVIOURAL / LIFESTYLE FEATURES ────────────────────────────────────────
#                              HA    AVG   STR   BRN   SOC
study_hours  = persona_sample([7.0,  4.0,  2.0,  7.5,  2.0], [1.0, 1.0, 0.8, 1.5, 0.8], 0.5, 12.0)
sleep_hours  = persona_sample([7.5,  6.5,  6.0,  4.5,  6.5], [0.8, 1.0, 1.2, 0.8, 1.0], 3.0, 10.0)
social_media = persona_sample([2.0,  3.0,  4.0,  2.5,  5.5], [0.8, 1.0, 1.2, 1.0, 1.2], 0.0, 10.0)
netflix_hrs  = persona_sample([1.0,  2.0,  3.0,  1.5,  3.5], [0.5, 0.8, 1.0, 0.8, 1.0], 0.0, 8.0)
attendance   = persona_sample([92,   80,   68,   77,   72],  [5,   8,   10,  10,  10],  30.0, 100.0).round(1)
stress_raw   = persona_sample([5.0,  5.0,  7.0,  8.5,  3.5], [1.5, 1.5, 1.5, 1.0, 1.5], 1.0, 10.0)
motiv_raw    = persona_sample([8.0,  6.0,  4.0,  5.0,  5.0], [1.0, 1.5, 1.5, 2.0, 1.5], 1.0, 10.0)
tmgmt_raw    = persona_sample([8.0,  6.0,  4.0,  4.5,  5.0], [1.2, 1.5, 1.5, 1.5, 1.5], 1.0, 10.0)

stress_level          = stress_raw.round().astype(int)
motivation_level      = motiv_raw.round().astype(int)
time_management_score = tmgmt_raw.round().astype(int)
exam_anxiety          = np.clip(stress_level * 0.7 + rng.normal(0, 1.5, N), 1, 10).round().astype(int)
mental_health_rating  = np.clip(11 - stress_level + rng.normal(0, 1.2, N), 1, 10).round().astype(int)

age         = rng.integers(17, 27, size=N)
semester    = rng.integers(1, 9,  size=N)
course_load = rng.integers(4, 8,  size=N)
exercise_freq = rng.integers(0, 8, size=N)

gender   = rng.choice(['male', 'female', 'other'], size=N, p=[0.48, 0.48, 0.04])
# All 10 majors, Title Case — MUST match the frontend dropdown
# (predictionFormSpec.js) and the original model's encoder, so no translation
# layer is ever needed between the database, the form, and the models.
MAJORS = ['Computer Science', 'Engineering', 'Mathematics', 'Biology', 'Chemistry',
          'Physics', 'Statistics', 'Business', 'Psychology', 'Education']
MAJOR_PROBS = [0.20, 0.14, 0.10, 0.10, 0.08, 0.08, 0.07, 0.13, 0.06, 0.04]
major    = rng.choice(MAJORS, size=N, p=MAJOR_PROBS)
study_environment = rng.choice(['home', 'library', 'cafe', 'dormitory'], size=N, p=[0.4, 0.3, 0.1, 0.2])
learning_style    = rng.choice(['visual', 'auditory', 'reading', 'kinesthetic'], size=N)
diet_quality      = rng.choice(['poor', 'average', 'good'], size=N, p=[0.25, 0.5, 0.25])
internet_quality  = rng.choice(['poor', 'moderate', 'good', 'excellent'], size=N, p=[0.1, 0.25, 0.4, 0.25])
parental_edu      = rng.choice(['high_school', 'bachelor', 'master', 'phd'], size=N, p=[0.4, 0.35, 0.2, 0.05])
family_income     = rng.choice(['low', 'middle', 'high'], size=N, p=[0.3, 0.5, 0.2])

part_time_job      = rng.random(N) < 0.3
extracurricular    = rng.random(N) < 0.45
access_to_tutoring = rng.random(N) < 0.35
parental_support   = np.clip(rng.normal(6.5, 2.0, N), 1, 10).round().astype(int)

aptitude_score = persona_sample([78, 65, 52, 70, 60], [10, 12, 12, 12, 12], 20, 100).round().astype(int)
previous_gpa   = persona_sample([3.6, 2.9, 2.2, 2.8, 2.5], [0.35, 0.35, 0.35, 0.40, 0.40], 0.0, 4.0).round(2)

# ─── LATENT ABILITY (drives the MIDTERMS) ────────────────────────────────────
# A student's starting ability comes from prior achievement + aptitude, not from
# a GPA we haven't computed yet. This is what the midterm reflects.
prev_n = normalize(previous_gpa, 0, 4)
apt_n  = normalize(aptitude_score, 20, 100)
ability = np.clip(0.6 * prev_n + 0.4 * apt_n + rng.normal(0, 0.05, N), 0, 1)

# ─── BEHAVIOUR INDEX (drives the IMPROVEMENT from midterm to final) ──────────
study_n   = normalize(study_hours, 0.5, 12)
attend_n  = normalize(attendance, 30, 100)
motiv_n   = normalize(motivation_level, 1, 10)
sleep_n   = normalize(sleep_hours, 3, 10)
tmgmt_n   = normalize(time_management_score, 1, 10)
par_n     = normalize(parental_support, 1, 10)
stress_n  = normalize(stress_level, 1, 10)
social_n  = normalize(social_media, 0, 10)
anxiety_n = normalize(exam_anxiety, 1, 10)
tut_n     = access_to_tutoring.astype(float)

diet_boost = np.where(diet_quality == 'good', 0.04, np.where(diet_quality == 'average', 0.0, -0.04))
inet_boost = np.where(internet_quality == 'excellent', 0.04,
             np.where(internet_quality == 'good', 0.02,
             np.where(internet_quality == 'moderate', -0.02, -0.04)))

# behaviour_index in roughly [-1, +1]: positive = habits that lift you between
# midterm and final; negative = habits that drag you down.
behaviour_index = (
      study_n  * 0.30
    + attend_n * 0.25
    + motiv_n  * 0.12
    + tmgmt_n  * 0.10
    + sleep_n  * 0.08
    + tut_n    * 0.06
    + par_n    * 0.04
    + diet_boost + inet_boost
    - stress_n  * 0.18
    - social_n  * 0.10
    - anxiety_n * 0.09
    - 0.35                       # centre it so it can be negative
)

# ─── PER-SUBJECT MIDTERMS AND FINALS ─────────────────────────────────────────
# Subject "talent": some students are simply better at maths-y subjects than
# bio-y ones. Two correlated talent clusters, as in v1.
math_talent = rng.normal(0, 6, N)   # affects math / physics / stats / CS
bio_talent  = rng.normal(0, 6, N)   # affects biology / chemistry

TALENT = {
    'mathematics':      math_talent,
    'physics':          math_talent * 0.8 + rng.normal(0, 3, N),
    'statistics':       math_talent * 0.7 + rng.normal(0, 3, N),
    'computer_science': math_talent * 0.5 + rng.normal(0, 4, N),
    'biology':          bio_talent,
    'chemistry':        bio_talent * 0.8 + rng.normal(0, 3, N),
}

data = {}

for subj, cfg in SUBJECTS.items():
    # ── MIDTERM: ability + subject talent + subject difficulty + noise ───────
    midterm = (
        30 + ability * 60            # ability maps to roughly 30–90
        + TALENT[subj]
        + cfg['difficulty']
        + rng.normal(0, 6, N)
    )
    midterm = np.clip(midterm, 0, 100).round(1)

    # ── FINAL: built FROM the midterm, then moved by behaviour ───────────────
    # This is the relationship the per-subject models will learn.
    #   - 0.72 * midterm  : where you are now is the strongest predictor
    #   - behaviour swing : good habits add up to ~+12, bad habits ~-12
    #   - regression to the mean: very high/low midterms drift toward centre
    improvement = behaviour_index * 12.0
    regression_to_mean = (65 - midterm) * 0.12
    final = (
        0.72 * midterm
        + 0.28 * (30 + ability * 60)     # underlying ability still matters
        + improvement
        + regression_to_mean
        + cfg['difficulty'] * 0.5
        + rng.normal(0, 5.5, N)          # irreducible exam-day noise
    )
    final = np.clip(final, 0, 100).round(1)

    data[f'{subj}_midterm'] = midterm
    data[f'{subj}_final']   = final

# ─── GPA: CREDIT-WEIGHTED FROM THE FINALS (the real-world way) ────────────────
# Each subject's final (0–100) becomes a 0–4 grade point, then we take the
# credit-weighted mean. A 3-credit subject pulls the GPA harder than a 2-credit.
weighted_sum = np.zeros(N)
for subj, cfg in SUBJECTS.items():
    grade_point = (data[f'{subj}_final'] / 100.0) * 4.0
    weighted_sum += grade_point * cfg['credits']

gpa = np.clip(weighted_sum / TOTAL_CREDITS, 0.0, 4.0).round(2)

# Overall exam_score kept for continuity with the old schema (mean of finals).
exam_score = np.clip(
    np.mean([data[f'{s}_final'] for s in SUBJECTS], axis=0), 0, 100
).round(1)

# ─── ASSEMBLE ────────────────────────────────────────────────────────────────
print("Assembling DataFrame...")

df = pd.DataFrame({
    'student_id':               pd.array([f'STU{i+1:06d}' for i in range(N)]),
    'age':                      age,
    'gender':                   gender,
    'major':                    major,
    'semester':                 semester,
    'course_load':              course_load,
    'study_hours_per_day':      study_hours.round(2),
    'attendance_percentage':    attendance,
    'time_management_score':    time_management_score,
    'study_environment':        study_environment,
    'social_media_hours':       social_media.round(2),
    'netflix_hours':            netflix_hrs.round(2),
    'sleep_hours':              sleep_hours.round(2),
    'diet_quality':             diet_quality,
    'exercise_frequency':       exercise_freq,
    'part_time_job':            part_time_job.astype(int),
    'extracurricular_participation': extracurricular.astype(int),
    'stress_level':             stress_level,
    'mental_health_rating':     mental_health_rating,
    'exam_anxiety_score':       exam_anxiety,
    'motivation_level':         motivation_level,
    'learning_style':           learning_style,
    'parental_education_level': parental_edu,
    'parental_support_level':   parental_support,
    'family_income_range':      family_income,
    'internet_quality':         internet_quality,
    'access_to_tutoring':       access_to_tutoring.astype(int),
    'previous_gpa':             previous_gpa,
    'aptitude_score':           aptitude_score,
    'exam_score':               exam_score,
    **data,                      # all 6 midterms + 6 finals
    'gpa':                      gpa,
})

out_path = 'chronovision_training_data_v2.csv'
df.to_csv(out_path, index=False)

print(f"\nDone! {N:,} rows x {len(df.columns)} columns")
print("\nSanity checks (these prove the data is learnable):")
for subj in SUBJECTS:
    r = np.corrcoef(df[f'{subj}_midterm'], df[f'{subj}_final'])[0, 1]
    print(f"   corr(midterm, final) for {subj:<18} = {r:.3f}   (want ~0.75-0.90)")
print(f"\n   corr(behaviour_index, math improvement) = "
      f"{np.corrcoef(behaviour_index, df['mathematics_final'] - df['mathematics_midterm'])[0, 1]:.3f}"
      f"   (want clearly positive — good habits => improvement)")
print("\nGPA distribution:")
print(df['gpa'].describe().round(3))
print(f"\nSaved to: {out_path}")