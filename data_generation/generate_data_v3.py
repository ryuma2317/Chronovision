"""
Chronovision — training data generator v3

TWO CHANGES FROM v2, BOTH DRIVEN BY REAL PROBLEMS
--------------------------------------------------

1. PROGRESSIVE EVIDENCE PER COURSE.
   v2 gave each course exactly ONE observable: the midterm. That makes the
   product useless in week 3 — a student can't predict anything until the
   midterm has happened, which is precisely when a warning would still be
   worth something.

   v3 emits FOUR observables per course, which arrive at different points in
   the semester:

       course_attendance   week 1 onward   (you already collect this per class)
       quiz_average        ~week 4         (early evidence of understanding)
       assignment_average  ~week 6         (effort + ability, accumulates)
       midterm             ~week 8         (strongest single signal)

   All four causally feed the final, so a model trained on them is learning a
   relationship that genuinely exists. The trainer then MASKS them at random so
   one model can predict from whatever the student actually has yet.

2. FEATURE TRIM: 28 student features -> 15.
   Dropped: age, gender, major, semester, parental_education_level,
            parental_support_level, family_income_range, internet_quality,
            access_to_tutoring, netflix_hours, part_time_job,
            extracurricular_participation, learning_style

   Three reasons, in order of importance:
     - ETHICS. gender, family_income_range and parental_education_level let the
       model predict failure from a student's demographics. A system that tells
       a poor student they will fail BECAUSE they are poor is laundering bias
       into an academic judgement. They are gone by choice, and that choice is
       defensible out loud.
     - EVIDENCE. learning_style has no empirical support in the education
       literature. It should never have been a feature.
     - NOISE. netflix_hours duplicates social_media_hours; age/semester/major
       carry almost no signal once ability and behaviour are known.

   Every surviving feature is either ACTIONABLE (a student can change it) or
   ACADEMIC (prior attainment). Nothing is immutable demographics.

3. COURSES ARE ANONYMOUS.
   v2's columns were named mathematics_*, physics_*, biology_*. Those names
   were only ever CSV column labels — the model never saw them — but they made
   the system LOOK like a high-school subject predictor, which it is not. v3
   emits course_1 ... course_6: six anonymous courses that differ only in
   difficulty. The word "biology" does not exist in this pipeline.

OUTPUT: chronovision_training_data_v3.csv
"""

import numpy as np
import pandas as pd
from numpy.random import default_rng

N = 200_000
rng = default_rng(42)

print("Generating Chronovision training data v3 (progressive evidence per course)...")

# ─── SIX ANONYMOUS COURSES ───────────────────────────────────────────────────
# Only difficulty matters. difficulty_level is the SAME 1-5 scale the admin
# picks in the UI, so the model and the app speak one language.
COURSES = {
    'course_1': {'difficulty_level': 5.0},   # hardest
    'course_2': {'difficulty_level': 4.0},
    'course_3': {'difficulty_level': 3.5},
    'course_4': {'difficulty_level': 3.0},
    'course_5': {'difficulty_level': 2.0},
    'course_6': {'difficulty_level': 1.0},   # easiest
}
# Difficulty as a score PENALTY, centred on level 3 (moderate).
# level 5 -> -3 marks, level 1 -> +3 marks. Gentle, but real.
def difficulty_penalty(level):
    return (3.0 - level) * 1.5


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


# ─── THE 15 SURVIVING STUDENT FEATURES ───────────────────────────────────────
#                              HA    AVG   STR   BRN   SOC
study_hours  = persona_sample([7.0,  4.0,  2.0,  7.5,  2.0], [1.0, 1.0, 0.8, 1.5, 0.8], 0.5, 12.0)
sleep_hours  = persona_sample([7.5,  6.5,  6.0,  4.5,  6.5], [0.8, 1.0, 1.2, 0.8, 1.0], 3.0, 10.0)
social_media = persona_sample([2.0,  3.0,  4.0,  2.5,  5.5], [0.8, 1.0, 1.2, 1.0, 1.2], 0.0, 10.0)
attendance   = persona_sample([92,   80,   68,   77,   72],  [5,   8,   10,  10,  10],  30.0, 100.0).round(1)
stress_raw   = persona_sample([5.0,  5.0,  7.0,  8.5,  3.5], [1.5, 1.5, 1.5, 1.0, 1.5], 1.0, 10.0)
motiv_raw    = persona_sample([8.0,  6.0,  4.0,  5.0,  5.0], [1.0, 1.5, 1.5, 2.0, 1.5], 1.0, 10.0)
tmgmt_raw    = persona_sample([8.0,  6.0,  4.0,  4.5,  5.0], [1.2, 1.5, 1.5, 1.5, 1.5], 1.0, 10.0)

stress_level          = stress_raw.round().astype(int)
motivation_level      = motiv_raw.round().astype(int)
time_management_score = tmgmt_raw.round().astype(int)
exam_anxiety          = np.clip(stress_level * 0.7 + rng.normal(0, 1.5, N), 1, 10).round().astype(int)
mental_health_rating  = np.clip(11 - stress_level + rng.normal(0, 1.2, N), 1, 10).round().astype(int)

course_load   = rng.integers(4, 8, size=N)
exercise_freq = rng.integers(0, 8, size=N)

study_environment = rng.choice(['home', 'library', 'cafe', 'dormitory'], size=N, p=[0.4, 0.3, 0.1, 0.2])
diet_quality      = rng.choice(['poor', 'average', 'good'], size=N, p=[0.25, 0.5, 0.25])

aptitude_score = persona_sample([78, 65, 52, 70, 60], [10, 12, 12, 12, 12], 20, 100).round().astype(int)
previous_gpa   = persona_sample([3.6, 2.9, 2.2, 2.8, 2.5], [0.35, 0.35, 0.35, 0.40, 0.40], 0.0, 4.0).round(2)

# ─── LATENT ABILITY (drives everything a student produces) ───────────────────
prev_n = normalize(previous_gpa, 0, 4)
apt_n  = normalize(aptitude_score, 20, 100)
ability = np.clip(0.6 * prev_n + 0.4 * apt_n + rng.normal(0, 0.05, N), 0, 1)

# ─── BEHAVIOUR INDEX (drives IMPROVEMENT over the semester) ──────────────────
study_n   = normalize(study_hours, 0.5, 12)
attend_n  = normalize(attendance, 30, 100)
motiv_n   = normalize(motivation_level, 1, 10)
sleep_n   = normalize(sleep_hours, 3, 10)
tmgmt_n   = normalize(time_management_score, 1, 10)
stress_n  = normalize(stress_level, 1, 10)
social_n  = normalize(social_media, 0, 10)
anxiety_n = normalize(exam_anxiety, 1, 10)
mh_n      = normalize(mental_health_rating, 1, 10)
exer_n    = normalize(exercise_freq, 0, 7)
load_n    = normalize(course_load, 4, 7)

diet_boost = np.where(diet_quality == 'good', 0.04,
             np.where(diet_quality == 'average', 0.0, -0.04))
# Where you study matters a little. Library > home > dorm > cafe.
env_boost = np.where(study_environment == 'library', 0.04,
            np.where(study_environment == 'home', 0.01,
            np.where(study_environment == 'dormitory', -0.02, -0.03)))

behaviour_index = (
      study_n  * 0.30
    + attend_n * 0.24
    + motiv_n  * 0.12
    + tmgmt_n  * 0.10
    + sleep_n  * 0.08
    + mh_n     * 0.05
    + exer_n   * 0.03
    + diet_boost + env_boost
    - stress_n  * 0.17
    - social_n  * 0.10
    - anxiety_n * 0.08
    - load_n    * 0.05          # a heavier load thins you out across courses
    - 0.35                      # centre it so it can go negative
)

# ─── PER-COURSE TALENT ───────────────────────────────────────────────────────
# Students are simply better at some courses than others. Two correlated
# clusters — this is real variance the model cannot see, and it is the honest
# ceiling on how good any prediction can get.
talent_a = rng.normal(0, 6, N)
talent_b = rng.normal(0, 6, N)
TALENT = {
    'course_1': talent_a,
    'course_2': talent_a * 0.8 + rng.normal(0, 3, N),
    'course_3': talent_a * 0.6 + rng.normal(0, 4, N),
    'course_4': talent_b * 0.6 + rng.normal(0, 4, N),
    'course_5': talent_b * 0.8 + rng.normal(0, 3, N),
    'course_6': talent_b,
}

# ─── PER-COURSE OBSERVABLES, IN THE ORDER THEY ARRIVE ────────────────────────
data = {}

for course, cfg in COURSES.items():
    diff_pen = difficulty_penalty(cfg['difficulty_level'])

    # base_ability: what this student is "worth" in this course, 30-90ish
    base = 30 + ability * 60 + TALENT[course] + diff_pen

    # ── WEEK 1+ : COURSE ATTENDANCE ──────────────────────────────────────────
    # Their overall attendance habit, varying a bit per course (people skip the
    # 8am lecture, not the one they like). Harder courses get skipped slightly
    # more often.
    course_attendance = np.clip(
        attendance + rng.normal(0, 6, N) + diff_pen * 0.4,
        0, 100
    ).round(1)

    # ── WEEK ~4 : QUIZ AVERAGE ───────────────────────────────────────────────
    # Low-stakes, frequent. Reflects ability and whether they're keeping up,
    # but noisy — one bad quiz doesn't mean much.
    quiz_average = np.clip(
        base
        + behaviour_index * 6.0
        + normalize(course_attendance, 0, 100) * 6.0 - 3.0
        + rng.normal(0, 8, N),
        0, 100
    ).round(1)

    # ── WEEK ~6 : ASSIGNMENT AVERAGE ─────────────────────────────────────────
    # Coursework done at home. Effort-heavy: time management and study hours
    # matter more here than raw ability. Less noisy than quizzes.
    assignment_average = np.clip(
        base * 0.85
        + 10.0
        + behaviour_index * 9.0
        + tmgmt_n * 6.0 - 3.0
        + rng.normal(0, 7, N),
        0, 100
    ).round(1)

    # ── WEEK ~8 : MIDTERM ────────────────────────────────────────────────────
    # High stakes, exam conditions. Ability-dominant, and exam anxiety bites.
    midterm = np.clip(
        base
        + behaviour_index * 5.0
        - anxiety_n * 4.0 + 2.0
        + rng.normal(0, 6, N),
        0, 100
    ).round(1)

    # ── THE FINAL — what we are trying to predict ────────────────────────────
    # Built from everything above, weighted by how informative each really is.
    # The midterm dominates, but the earlier signals carry real weight — which
    # is exactly what lets a masked model still say something useful in week 4.
    improvement        = behaviour_index * 12.0
    regression_to_mean = (65 - midterm) * 0.10

    final = np.clip(
          0.50 * midterm
        + 0.15 * quiz_average
        + 0.15 * assignment_average
        + 0.08 * (30 + ability * 60)
        + 0.06 * course_attendance
        + 0.06 * base
        + improvement
        + regression_to_mean
        + diff_pen * 0.5
        - anxiety_n * 3.0
        + rng.normal(0, 5.0, N),           # irreducible exam-day noise
        0, 100
    ).round(1)

    data[f'{course}_attendance'] = course_attendance
    data[f'{course}_quiz']       = quiz_average
    data[f'{course}_assignment'] = assignment_average
    data[f'{course}_midterm']    = midterm
    data[f'{course}_final']      = final

# ─── ASSEMBLE ────────────────────────────────────────────────────────────────
print("Assembling DataFrame...")

df = pd.DataFrame({
    'student_id':            pd.array([f'STU{i+1:06d}' for i in range(N)]),

    # -- study habits --
    'study_hours_per_day':   study_hours.round(2),
    'attendance_percentage': attendance,
    'time_management_score': time_management_score,
    'study_environment':     study_environment,
    'course_load':           course_load,

    # -- lifestyle & wellbeing --
    'sleep_hours':           sleep_hours.round(2),
    'social_media_hours':    social_media.round(2),
    'exercise_frequency':    exercise_freq,
    'diet_quality':          diet_quality,

    # -- mental state --
    'stress_level':          stress_level,
    'mental_health_rating':  mental_health_rating,
    'exam_anxiety_score':    exam_anxiety,
    'motivation_level':      motivation_level,

    # -- academic history --
    'previous_gpa':          previous_gpa,
    'aptitude_score':        aptitude_score,

    **data,                  # 6 courses x 5 columns
})

out_path = 'chronovision_training_data_v3.csv'
df.to_csv(out_path, index=False)

print(f"\nDone! {N:,} rows x {len(df.columns)} columns -> {out_path}")

# ─── SANITY CHECKS — these prove the data is learnable AT EVERY STAGE ────────
print("\nCorrelation of each observable with the final (course_1):")
for obs in ['attendance', 'quiz', 'assignment', 'midterm']:
    r = np.corrcoef(df[f'course_1_{obs}'], df['course_1_final'])[0, 1]
    print(f"   corr({obs:<11}, final) = {r:.3f}")
print("   ^ all should be clearly positive. The midterm should be strongest,")
print("     but quiz/assignment must NOT be near zero — if they are, an early")
print("     prediction (before the midterm exists) would be worthless.")

print("\nDoes difficulty actually depress finals?")
for course, cfg in COURSES.items():
    print(f"   {course} (difficulty {cfg['difficulty_level']}) -> mean final "
          f"{df[f'{course}_final'].mean():.1f}")
print("   ^ should fall as difficulty rises.")

print("\nDo good habits produce improvement (midterm -> final)?")
r = np.corrcoef(behaviour_index, df['course_1_final'] - df['course_1_midterm'])[0, 1]
print(f"   corr(behaviour_index, improvement) = {r:.3f}   (want clearly positive)")