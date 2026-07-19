-- ============================================================
-- CHRONOVISION — migration 002: ADMIN-MANAGED, CLASS-SCOPED COURSES
-- Run this in the Supabase SQL Editor AFTER db/subject_predictions.sql.
--
-- WHAT THIS CHANGES
--   Before: a global `subjects` table with 6 hardcoded rows that every
--           student everywhere shared, matching 6 hardcoded ML models.
--   After:  courses BELONG TO A CLASS. The admin creates a class, adds the
--           courses that class actually teaches, then enrols students. A
--           student only ever sees the courses of the classes they are in.
--
-- The ML model no longer knows subject names (see train_generic_model.py),
-- so `course_name` is free text. "Khmer Literature", "Organic Chemistry II",
-- anything.
-- ============================================================

-- ------------------------------------------------------------
-- 1. COURSES — owned by a class, created by the admin
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  course_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id         UUID NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
  course_name      VARCHAR(120) NOT NULL,
  course_code      VARCHAR(32),
  -- Credits drive the GPA weighting. Pure arithmetic, not a model input.
  credits          SMALLINT NOT NULL DEFAULT 3,
  -- Difficulty IS a model input: 1 = easy elective, 5 = hardest core course.
  -- This is how the model positions a course it has never seen by name.
  difficulty_level SMALLINT NOT NULL DEFAULT 3,
  is_active        SMALLINT NOT NULL DEFAULT 1,
  created_by       UUID REFERENCES users(user_id),
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_course_credits    CHECK (credits BETWEEN 1 AND 6),
  CONSTRAINT chk_course_difficulty CHECK (difficulty_level BETWEEN 1 AND 5),
  CONSTRAINT uq_course_per_class   UNIQUE (class_id, course_name)
);

CREATE INDEX IF NOT EXISTS idx_courses_class ON courses(class_id);

-- ------------------------------------------------------------
-- 2. COURSE_PREDICTIONS — one row per course per prediction
--    Replaces subject_predictions. Keyed by course_id, not a magic string.
--    course_name / credits / difficulty_level are SNAPSHOTTED so that a past
--    prediction still reads correctly after an admin renames or deletes the
--    course. Never re-derive history by joining to the live courses row.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_predictions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id       UUID NOT NULL REFERENCES gpa_predictions(prediction_id) ON DELETE CASCADE,
  course_id           UUID REFERENCES courses(course_id) ON DELETE SET NULL,
  course_name         VARCHAR(120) NOT NULL,
  midterm_score       DECIMAL(5,2) NOT NULL,
  predicted_final     DECIMAL(5,2) NOT NULL,
  credits             SMALLINT     NOT NULL,
  difficulty_level    SMALLINT     NOT NULL,
  grade_point         DECIMAL(4,3) NOT NULL,
  contribution_points DECIMAL(4,3) NOT NULL,
  contribution_pct    DECIMAL(5,2) NOT NULL,
  weight_pct          DECIMAL(5,2) NOT NULL,
  created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_cp_midterm CHECK (midterm_score   BETWEEN 0 AND 100),
  CONSTRAINT chk_cp_final   CHECK (predicted_final BETWEEN 0 AND 100),
  CONSTRAINT uq_pred_course UNIQUE (prediction_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_coursepred_prediction ON course_predictions(prediction_id);

-- ------------------------------------------------------------
-- 3. FREE THE ACADEMIC PROFILE FROM THE SIX FIXED SUBJECTS
--    student_academic_profiles has six NOT NULL *_score columns. Those were
--    the six hardcoded subjects. A profile can no longer know in advance what
--    courses the student takes, so they must become nullable.
--    (Keeping the columns rather than dropping them so nothing 500s if a
--    stale query still selects them. New code ignores them entirely.)
-- ------------------------------------------------------------
ALTER TABLE student_academic_profiles
  ALTER COLUMN mathematics_score      DROP NOT NULL,
  ALTER COLUMN biology_score          DROP NOT NULL,
  ALTER COLUMN chemistry_score        DROP NOT NULL,
  ALTER COLUMN physics_score          DROP NOT NULL,
  ALTER COLUMN computer_science_score DROP NOT NULL,
  ALTER COLUMN statistics_score       DROP NOT NULL,
  ALTER COLUMN exam_score             DROP NOT NULL;

-- ------------------------------------------------------------
-- 4. STUDY PLAN SUBJECTS -> point at a real course
--    The study plan generator used to read the six *_score columns. Now it
--    reads the student's predicted finals per course, so each plan row can
--    reference the actual course it is about.
-- ------------------------------------------------------------
ALTER TABLE study_plan_subjects
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(course_id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- 5. RETIRE THE GLOBAL SUBJECT CATALOGUE
--    Do NOT drop it yet if you have demo data you want to keep for the
--    defense. Just stop writing to it. Once you are happy:
--
--      DROP TABLE IF EXISTS subject_predictions;
--      DROP TABLE IF EXISTS subjects;
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 6. OPTIONAL: seed the old six as courses of one existing class, so your
--    current demo class keeps working. Replace the class_id first.
-- ------------------------------------------------------------
-- INSERT INTO courses (class_id, course_name, credits, difficulty_level) VALUES
--   ('<YOUR-CLASS-UUID>', 'Mathematics',      3, 5),
--   ('<YOUR-CLASS-UUID>', 'Physics',          3, 4),
--   ('<YOUR-CLASS-UUID>', 'Computer Science', 3, 2),
--   ('<YOUR-CLASS-UUID>', 'Chemistry',        2, 4),
--   ('<YOUR-CLASS-UUID>', 'Biology',          2, 2),
--   ('<YOUR-CLASS-UUID>', 'Statistics',       2, 3)
-- ON CONFLICT (class_id, course_name) DO NOTHING;