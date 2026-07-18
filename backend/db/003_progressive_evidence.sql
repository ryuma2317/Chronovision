-- ============================================================
-- CHRONOVISION — migration 003: PROGRESSIVE COURSE EVIDENCE
-- Run in the Supabase SQL Editor AFTER 002_class_courses.sql.
--
-- A prediction is no longer "one midterm per course". It is "whatever evidence
-- exists so far": attendance from week 1, quizzes from week 4, assignments from
-- week 6, midterm from week 8. Each is NULLABLE — a null means "hasn't happened
-- yet", which is a real and meaningful state, not missing data.
-- ============================================================

-- ── 1. course_predictions: store what the prediction was BASED on ───────────
ALTER TABLE course_predictions
  ADD COLUMN IF NOT EXISTS course_attendance  DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS quiz_average       DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS assignment_average DECIMAL(5,2),
  -- How far into the semester this prediction was made: week_1 | week_2 |
  -- week_5 | week_7 | week_9. Drives the confidence badge in the UI.
  ADD COLUMN IF NOT EXISTS evidence_stage     VARCHAR(16),
  ADD COLUMN IF NOT EXISTS confidence         DECIMAL(4,3);

-- midterm_score was NOT NULL. It can no longer be: a week-3 student has no
-- midterm, and that is the entire point of this migration.
ALTER TABLE course_predictions
  ALTER COLUMN midterm_score DROP NOT NULL;

-- The old CHECK forbade NULL implicitly via NOT NULL; re-state the range check
-- so it tolerates NULL (in SQL, NULL passes a CHECK).
ALTER TABLE course_predictions DROP CONSTRAINT IF EXISTS chk_cp_midterm;
ALTER TABLE course_predictions
  ADD CONSTRAINT chk_cp_midterm CHECK (midterm_score IS NULL OR midterm_score BETWEEN 0 AND 100);

-- ── 2. gpa_predictions: was this a full-GPA run, or a subset of courses? ────
-- A student predicting 2 of their 6 courses does NOT have a real GPA, and the
-- UI must not pretend otherwise.
ALTER TABLE gpa_predictions
  ADD COLUMN IF NOT EXISTS is_partial     SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evidence_stage VARCHAR(16);

-- ── 3. The academic profile drops to the 15 surviving features ─────────────
-- The 13 cut features stay as dead nullable columns rather than being dropped,
-- so no stale query 500s. New code never reads them.
--
-- gender / family_income_range / parental_education_level are gone ON PURPOSE:
-- a model that predicts failure from demographics launders bias into an
-- academic judgement. Deliberately not a feature.
ALTER TABLE student_academic_profiles
  ALTER COLUMN age                      DROP NOT NULL,
  ALTER COLUMN gender                   DROP NOT NULL,
  ALTER COLUMN major                    DROP NOT NULL,
  ALTER COLUMN semester                 DROP NOT NULL,
  ALTER COLUMN netflix_hours            DROP NOT NULL,
  ALTER COLUMN part_time_job            DROP NOT NULL,
  ALTER COLUMN extracurricular_participation DROP NOT NULL,
  ALTER COLUMN learning_style           DROP NOT NULL,
  ALTER COLUMN parental_education_level DROP NOT NULL,
  ALTER COLUMN parental_support_level   DROP NOT NULL,
  ALTER COLUMN family_income_range      DROP NOT NULL,
  ALTER COLUMN internet_quality         DROP NOT NULL,
  ALTER COLUMN access_to_tutoring       DROP NOT NULL;

-- ── 4. whatif_simulations: the baseline is now per-course, not one GPA ──────
ALTER TABLE whatif_simulations
  ADD COLUMN IF NOT EXISTS course_deltas JSONB;