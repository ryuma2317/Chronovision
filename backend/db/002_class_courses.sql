-- 1. COURSES — owned by a class, created by the admin
CREATE TABLE IF NOT EXISTS courses (
  course_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id         UUID NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
  course_name      VARCHAR(120) NOT NULL,
  course_code      VARCHAR(32),
  credits          SMALLINT NOT NULL DEFAULT 3,
  difficulty_level SMALLINT NOT NULL DEFAULT 3,
  is_active        SMALLINT NOT NULL DEFAULT 1,
  created_by       UUID REFERENCES users(user_id),
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_course_credits    CHECK (credits BETWEEN 1 AND 6),
  CONSTRAINT chk_course_difficulty CHECK (difficulty_level BETWEEN 1 AND 5),
  CONSTRAINT uq_course_per_class   UNIQUE (class_id, course_name)
);

CREATE INDEX IF NOT EXISTS idx_courses_class ON courses(class_id);

-- 2. COURSE_PREDICTIONS — one row per course per prediction
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

-- 3. Free the profile from the six fixed subjects
ALTER TABLE student_academic_profiles
  ALTER COLUMN mathematics_score      DROP NOT NULL,
  ALTER COLUMN biology_score          DROP NOT NULL,
  ALTER COLUMN chemistry_score        DROP NOT NULL,
  ALTER COLUMN physics_score          DROP NOT NULL,
  ALTER COLUMN computer_science_score DROP NOT NULL,
  ALTER COLUMN statistics_score       DROP NOT NULL,
  ALTER COLUMN exam_score             DROP NOT NULL;

-- 4. Study plan rows can point at a real course
ALTER TABLE study_plan_subjects
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(course_id) ON DELETE SET NULL;