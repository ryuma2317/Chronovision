import numpy as np
import pandas as pd
from numpy.random import default_rng

N = 500_000
rng = default_rng(42)

print("🚀 Generating Chronovision training data...")

# ─── PERSONAS ────────────────────────────────────────────────────────────────
# Each student gets a persona that drives their base behavior
PERSONAS      = ['high_achiever', 'average', 'struggling', 'burnout', 'social_butterfly']
PERSONA_PROBS = [0.20,             0.35,      0.20,         0.10,      0.15]
personas = rng.choice(PERSONAS, size=N, p=PERSONA_PROBS)

p_mask = {p: personas == p for p in PERSONAS}

def persona_sample(means, stds, lo, hi):
    """Sample from per-persona normal distributions, vectorized."""
    out = np.empty(N)
    for i, p in enumerate(PERSONAS):
        m = p_mask[p]
        out[m] = rng.normal(means[i], stds[i], m.sum())
    return np.clip(out, lo, hi)

def normalize(arr, lo, hi):
    return (np.clip(arr, lo, hi) - lo) / (hi - lo)


# ─── CONTINUOUS FEATURES ─────────────────────────────────────────────────────

#                              HA    AVG   STR   BRN   SOC
study_hours = persona_sample([7.0,  4.0,  2.0,  7.5,  2.0],
                              [1.0,  1.0,  0.8,  1.5,  0.8], 0.5, 12.0)

sleep_hours = persona_sample([7.5,  6.5,  6.0,  4.5,  6.5],
                              [0.8,  1.0,  1.2,  0.8,  1.0], 3.0, 10.0)

social_media = persona_sample([2.0,  3.0,  4.0,  2.5,  5.5],
                               [0.8,  1.0,  1.2,  1.0,  1.2], 0.0, 10.0)

netflix_hrs  = persona_sample([1.0,  2.0,  3.0,  1.5,  3.5],
                               [0.5,  0.8,  1.0,  0.8,  1.0], 0.0, 8.0)

attendance   = persona_sample([92,   80,   68,   77,   72],
                               [5,    8,    10,   10,   10],  30.0, 100.0).round(1)

stress_raw   = persona_sample([5.0,  5.0,  7.0,  8.5,  3.5],
                               [1.5,  1.5,  1.5,  1.0,  1.5], 1.0, 10.0)

motivation_raw = persona_sample([8.0, 6.0,  4.0,  5.0,  5.0],
                                 [1.0, 1.5,  1.5,  2.0,  1.5], 1.0, 10.0)


# ─── CATEGORICAL FEATURES ────────────────────────────────────────────────────

age      = rng.integers(17, 27, size=N)
semester = rng.integers(1, 9,  size=N)
course_load = rng.integers(4, 8, size=N)  # 4–7 subjects

gender = rng.choice(['male', 'female', 'other'], size=N, p=[0.48, 0.48, 0.04])

major = rng.choice(
    ['Computer Science', 'Engineering', 'Mathematics',
     'Biology', 'Chemistry', 'Physics', 'Statistics',
     'Business', 'Psychology', 'Education'],
    size=N, p=[0.18, 0.15, 0.12, 0.10, 0.08, 0.10, 0.08, 0.10, 0.05, 0.04]
)

family_income = rng.choice(['low', 'middle', 'high'], size=N, p=[0.30, 0.45, 0.25])

# Internet quality — conditional on income
internet_quality = np.empty(N, dtype=object)
for inc, probs in zip(
    ['low',              'middle',            'high'],
    [[0.40,0.35,0.20,0.05],[0.10,0.35,0.40,0.15],[0.03,0.15,0.40,0.42]]
):
    m = family_income == inc
    internet_quality[m] = rng.choice(['poor','moderate','good','excellent'], size=m.sum(), p=probs)

# Access to tutoring — conditional on income
tut_prob = np.where(family_income=='low', 0.20,
           np.where(family_income=='middle', 0.50, 0.80))
access_to_tutoring = (rng.random(N) < tut_prob)

# Part-time job — conditional on income (inverse)
job_prob = np.where(family_income=='low', 0.60,
           np.where(family_income=='middle', 0.30, 0.10))
part_time_job = (rng.random(N) < job_prob)

parental_edu = rng.choice(
    ['high_school', 'bachelor', 'master', 'phd'],
    size=N, p=[0.30, 0.40, 0.20, 0.10]
)

# Parental support — higher for more educated parents
par_base = np.where(parental_edu=='phd', 7.5,
           np.where(parental_edu=='master', 7.0,
           np.where(parental_edu=='bachelor', 6.0, 5.0)))
parental_support = np.clip(par_base + rng.normal(0, 1.5, N), 1, 10).round().astype(int)

diet_quality      = rng.choice(['poor','average','good'], size=N, p=[0.25,0.45,0.30])
exercise_freq     = rng.integers(0, 8, size=N)
extracurricular   = rng.random(N) < 0.45
study_environment = rng.choice(['home','library','cafe','dormitory'], size=N, p=[0.45,0.25,0.15,0.15])
learning_style    = rng.choice(['visual','auditory','reading','kinesthetic'], size=N, p=[0.30,0.20,0.30,0.20])


# ─── CAUSAL ADJUSTMENTS ──────────────────────────────────────────────────────

# Part-time job: reduces study time, raises stress
study_hours = np.where(part_time_job, study_hours * 0.85 - 0.5, study_hours)
study_hours = np.clip(study_hours, 0.5, 12.0)
stress_raw  = np.where(part_time_job, stress_raw + 1.0, stress_raw)

# More courses = more stress
stress_raw  = stress_raw + (course_load - 5) * 0.3

# Parental support boosts motivation
motivation_raw = motivation_raw + (parental_support - 5) * 0.12

# Clip final values
stress_level     = np.clip(stress_raw.round(), 1, 10).astype(int)
motivation_level = np.clip(motivation_raw.round(), 1, 10).astype(int)


# ─── DERIVED FEATURES ────────────────────────────────────────────────────────

# Mental health — driven by sleep and stress
mh_base = 5 + normalize(sleep_hours, 3, 10) * 3 - normalize(stress_level, 1, 10) * 4
mental_health_rating = np.clip(mh_base + rng.normal(0, 0.8, N), 1, 10).round().astype(int)

# Exam anxiety — highly correlated with stress
exam_anxiety = np.clip(stress_level * 0.7 + rng.normal(0, 1.5, N), 1, 10).round().astype(int)
exam_anxiety = np.clip(exam_anxiety, 1, 10)

# Time management — persona-driven
time_mgmt_raw = persona_sample([8.0, 6.0, 4.0, 5.0, 5.0],
                                [1.5, 1.5, 1.5, 1.5, 1.5], 1.0, 10.0)
time_management_score = time_mgmt_raw.round().astype(int)
time_management_score = np.clip(time_management_score, 1, 10)


# ─── APTITUDE SCORE (CommonsenseQA proxy, 0–100) ─────────────────────────────
aptitude_score = persona_sample([78, 65, 52, 70, 60],
                                 [12, 10, 10, 12, 10], 20, 100).round().astype(int)


# ─── PREVIOUS GPA ────────────────────────────────────────────────────────────
previous_gpa = persona_sample([3.6, 2.9, 2.2, 2.8, 2.5],
                               [0.35,0.35,0.35,0.40,0.40], 0.0, 4.0).round(2)


# ─── GPA COMPUTATION ─────────────────────────────────────────────────────────
study_n   = normalize(study_hours, 0.5, 12)
attend_n  = normalize(attendance,  30,  100)
prev_n    = normalize(previous_gpa,0,   4)
motiv_n   = normalize(motivation_level, 1, 10)
sleep_n   = normalize(sleep_hours, 3, 10)
apt_n     = normalize(aptitude_score, 20, 100)
tut_n     = access_to_tutoring.astype(float)
par_n     = normalize(parental_support, 1, 10)
stress_n  = normalize(stress_level, 1, 10)
social_n  = normalize(social_media, 0, 10)
anxiety_n = normalize(exam_anxiety, 1, 10)
tmgmt_n   = normalize(time_management_score, 1, 10)

diet_boost = np.where(diet_quality=='good',  0.05,
             np.where(diet_quality=='average', 0.0, -0.05))
inet_boost = np.where(internet_quality=='excellent', 0.05,
             np.where(internet_quality=='good', 0.02,
             np.where(internet_quality=='moderate', -0.02, -0.05)))

gpa_raw = (
      0.35                      # base intercept — anchors average GPA to realistic range
    + study_n  * 0.22
    + attend_n * 0.18
    + prev_n   * 0.18
    + motiv_n  * 0.10
    + sleep_n  * 0.07
    + apt_n    * 0.08
    + tut_n    * 0.05
    + par_n    * 0.04
    + tmgmt_n  * 0.05
    + diet_boost
    + inet_boost
    - stress_n  * 0.13
    - social_n  * 0.07
    - anxiety_n * 0.06
    + rng.normal(0, 0.04, N)
)

gpa = np.clip(gpa_raw * 4.0, 0.0, 4.0).round(2)


# ─── EXAM SCORE (GPA + noise, 0–100) ─────────────────────────────────────────
exam_score = np.clip((gpa / 4.0) * 100 + rng.normal(0, 8, N), 0, 100).round(1)


# ─── SUBJECT SCORES (correlated with GPA + inter-subject correlation) ─────────
def subject_score(base_gpa, corr_noise=None, bias=0, noise_std=8):
    if corr_noise is not None:
        g = base_gpa + corr_noise * 0.15
    else:
        g = base_gpa
    raw = (np.clip(g, 0, 4) / 4.0) * 100 + bias + rng.normal(0, noise_std, N)
    return np.clip(raw, 0, 100).round(1)

math_corr_noise = rng.normal(0, 0.3, N)

mathematics_score      = subject_score(gpa, bias=0,   noise_std=9)
statistics_score       = subject_score(gpa, corr_noise=math_corr_noise,  bias=1,  noise_std=8)   # corr w/ math
physics_score          = subject_score(gpa, corr_noise=math_corr_noise,  bias=-1, noise_std=9)   # corr w/ math
computer_science_score = subject_score(gpa, corr_noise=math_corr_noise*0.5, bias=2, noise_std=8) # mild math corr
biology_score          = subject_score(gpa, bias=0,   noise_std=9)
bio_corr_noise         = rng.normal(0, 0.3, N)
chemistry_score        = subject_score(gpa, corr_noise=bio_corr_noise, bias=0, noise_std=8)      # corr w/ bio


# ─── ASSEMBLE ────────────────────────────────────────────────────────────────
print("📦 Assembling DataFrame...")

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
    'mathematics_score':        mathematics_score,
    'biology_score':            biology_score,
    'chemistry_score':          chemistry_score,
    'physics_score':            physics_score,
    'computer_science_score':   computer_science_score,
    'statistics_score':         statistics_score,
    'gpa':                      gpa,
})

# ─── SAVE ────────────────────────────────────────────────────────────────────
out_path = 'chronovision_training_data.csv'
df.to_csv(out_path, index=False)

print(f"\n✅ Done! {N:,} rows × {len(df.columns)} columns")
print(f"\n📊 GPA Distribution:")
print(df['gpa'].describe().round(3))
print(f"\n🎭 Persona Breakdown:")
for p, prob in zip(PERSONAS, PERSONA_PROBS):
    print(f"   {p:<20} {prob*100:.0f}%  ({int(N*prob):,} students)")
print(f"\n💾 Saved to: {out_path}")