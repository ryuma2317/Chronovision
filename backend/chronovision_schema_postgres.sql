-- ============================================================
-- CHRONOVISION - Database Schema (PostgreSQL / Supabase)
-- Converted from the original MySQL 8.0 schema.
-- Run this in the Supabase SQL Editor (or via psql).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- provides gen_random_uuid()

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE users (
  user_id        UUID     NOT NULL DEFAULT gen_random_uuid(),
  email          VARCHAR(255) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  role           VARCHAR(32) NOT NULL CHECK (role IN ('admin','teacher','student')),
  first_name     VARCHAR(100) NOT NULL,
  last_name      VARCHAR(100) NOT NULL,
  is_active      SMALLINT   NOT NULL DEFAULT 1,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT uq_users_email UNIQUE (email)
);


-- ============================================================
-- 2. CLASSES
-- ============================================================
CREATE TABLE classes (
  class_id      UUID     NOT NULL DEFAULT gen_random_uuid(),
  created_by    UUID     NOT NULL,
  class_name    VARCHAR(200) NOT NULL,
  description   TEXT,
  academic_year VARCHAR(20)  NOT NULL,
  semester      SMALLINT      NOT NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (class_id),
  CONSTRAINT chk_classes_semester CHECK (semester BETWEEN 1 AND 8),
  CONSTRAINT fk_classes_admin FOREIGN KEY (created_by) REFERENCES users(user_id)
);


-- ============================================================
-- 3. CLASS MEMBERSHIPS
-- ============================================================
CREATE TABLE class_teachers (
  id          UUID NOT NULL DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL,
  teacher_id  UUID NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_class_teacher UNIQUE (class_id, teacher_id),
  CONSTRAINT fk_ct_class   FOREIGN KEY (class_id)   REFERENCES classes(class_id) ON DELETE CASCADE,
  CONSTRAINT fk_ct_teacher FOREIGN KEY (teacher_id) REFERENCES users(user_id)    ON DELETE CASCADE
);

CREATE TABLE class_students (
  id          UUID NOT NULL DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL,
  student_id  UUID NOT NULL,
  enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_class_student UNIQUE (class_id, student_id),
  CONSTRAINT fk_cs_class   FOREIGN KEY (class_id)   REFERENCES classes(class_id) ON DELETE CASCADE,
  CONSTRAINT fk_cs_student FOREIGN KEY (student_id) REFERENCES users(user_id)    ON DELETE CASCADE
);


-- ============================================================
-- 4. STUDENT ACADEMIC PROFILES  (36 ML input features)
-- ============================================================
CREATE TABLE student_academic_profiles (
  profile_id                    UUID     NOT NULL DEFAULT gen_random_uuid(),
  student_id                    UUID     NOT NULL,
  class_id                      UUID     NOT NULL,
  -- student info
  age                           SMALLINT      NOT NULL,
  gender                        VARCHAR(32) NOT NULL CHECK (gender IN ('male','female','other')),
  major                         VARCHAR(100) NOT NULL,
  semester                      SMALLINT      NOT NULL,
  course_load                   SMALLINT      NOT NULL,
  -- study behavior
  study_hours_per_day           DECIMAL(4,2) NOT NULL,
  attendance_percentage         DECIMAL(5,2) NOT NULL,
  time_management_score         SMALLINT      NOT NULL,
  study_environment             VARCHAR(32) NOT NULL CHECK (study_environment IN ('home','library','cafe','dormitory')),
  -- lifestyle
  social_media_hours            DECIMAL(4,2) NOT NULL,
  netflix_hours                 DECIMAL(4,2) NOT NULL,
  sleep_hours                   DECIMAL(4,2) NOT NULL,
  diet_quality                  VARCHAR(32) NOT NULL CHECK (diet_quality IN ('poor','average','good')),
  exercise_frequency            SMALLINT      NOT NULL,
  part_time_job                 SMALLINT   NOT NULL DEFAULT 0,
  extracurricular_participation SMALLINT   NOT NULL DEFAULT 0,
  -- mental & psychological
  stress_level                  SMALLINT      NOT NULL,
  mental_health_rating          SMALLINT      NOT NULL,
  exam_anxiety_score            SMALLINT      NOT NULL,
  motivation_level              SMALLINT      NOT NULL,
  learning_style                VARCHAR(32) NOT NULL CHECK (learning_style IN ('visual','auditory','reading','kinesthetic')),
  -- background & support
  parental_education_level      VARCHAR(32) NOT NULL CHECK (parental_education_level IN ('high_school','bachelor','master','phd')),
  parental_support_level        SMALLINT      NOT NULL,
  family_income_range           VARCHAR(32) NOT NULL CHECK (family_income_range IN ('low','middle','high')),
  internet_quality              VARCHAR(32) NOT NULL CHECK (internet_quality IN ('poor','moderate','good','excellent')),
  access_to_tutoring            SMALLINT   NOT NULL DEFAULT 0,
  -- academic performance
  previous_gpa                  DECIMAL(3,2) NOT NULL,
  aptitude_score                SMALLINT      NOT NULL,
  exam_score                    DECIMAL(5,2) NOT NULL,
  mathematics_score             DECIMAL(5,2) NOT NULL,
  biology_score                 DECIMAL(5,2) NOT NULL,
  chemistry_score               DECIMAL(5,2) NOT NULL,
  physics_score                 DECIMAL(5,2) NOT NULL,
  computer_science_score        DECIMAL(5,2) NOT NULL,
  statistics_score              DECIMAL(5,2) NOT NULL,
  created_at                    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- constraints
  CONSTRAINT chk_sap_age          CHECK (age BETWEEN 15 AND 40),
  CONSTRAINT chk_sap_semester     CHECK (semester BETWEEN 1 AND 8),
  CONSTRAINT chk_sap_course_load  CHECK (course_load BETWEEN 1 AND 10),
  CONSTRAINT chk_sap_study_hours  CHECK (study_hours_per_day >= 0),
  CONSTRAINT chk_sap_attendance   CHECK (attendance_percentage BETWEEN 0 AND 100),
  CONSTRAINT chk_sap_time_mgmt    CHECK (time_management_score BETWEEN 1 AND 10),
  CONSTRAINT chk_sap_social_media CHECK (social_media_hours >= 0),
  CONSTRAINT chk_sap_netflix      CHECK (netflix_hours >= 0),
  CONSTRAINT chk_sap_sleep        CHECK (sleep_hours BETWEEN 0 AND 24),
  CONSTRAINT chk_sap_exercise     CHECK (exercise_frequency BETWEEN 0 AND 7),
  CONSTRAINT chk_sap_stress       CHECK (stress_level BETWEEN 1 AND 10),
  CONSTRAINT chk_sap_mh           CHECK (mental_health_rating BETWEEN 1 AND 10),
  CONSTRAINT chk_sap_anxiety      CHECK (exam_anxiety_score BETWEEN 1 AND 10),
  CONSTRAINT chk_sap_motivation   CHECK (motivation_level BETWEEN 1 AND 10),
  CONSTRAINT chk_sap_par_support  CHECK (parental_support_level BETWEEN 1 AND 10),
  CONSTRAINT chk_sap_prev_gpa     CHECK (previous_gpa BETWEEN 0.0 AND 4.0),
  CONSTRAINT chk_sap_aptitude     CHECK (aptitude_score BETWEEN 0 AND 100),
  CONSTRAINT chk_sap_exam         CHECK (exam_score BETWEEN 0 AND 100),
  CONSTRAINT chk_sap_math         CHECK (mathematics_score BETWEEN 0 AND 100),
  CONSTRAINT chk_sap_bio          CHECK (biology_score BETWEEN 0 AND 100),
  CONSTRAINT chk_sap_chem         CHECK (chemistry_score BETWEEN 0 AND 100),
  CONSTRAINT chk_sap_phys         CHECK (physics_score BETWEEN 0 AND 100),
  CONSTRAINT chk_sap_cs           CHECK (computer_science_score BETWEEN 0 AND 100),
  CONSTRAINT chk_sap_stats        CHECK (statistics_score BETWEEN 0 AND 100),
  PRIMARY KEY (profile_id),
  CONSTRAINT uq_sap_student_class UNIQUE (student_id, class_id),
  CONSTRAINT fk_sap_student FOREIGN KEY (student_id) REFERENCES users(user_id)    ON DELETE CASCADE,
  CONSTRAINT fk_sap_class   FOREIGN KEY (class_id)   REFERENCES classes(class_id) ON DELETE CASCADE
);


-- ============================================================
-- 5. GPA PREDICTIONS
-- ============================================================
CREATE TABLE gpa_predictions (
  prediction_id    UUID     NOT NULL DEFAULT gen_random_uuid(),
  student_id       UUID     NOT NULL,
  profile_id       UUID     NOT NULL,
  predicted_gpa    DECIMAL(3,2) NOT NULL,
  bucket           VARCHAR(50)  NOT NULL,
  at_risk_status   VARCHAR(32) NOT NULL CHECK (at_risk_status IN ('on_track','at_risk','high_risk')),
  confidence_lower DECIMAL(3,2) DEFAULT NULL,
  confidence_upper DECIMAL(3,2) DEFAULT NULL,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_gpa_predicted CHECK (predicted_gpa BETWEEN 0.0 AND 4.0),
  PRIMARY KEY (prediction_id),
  CONSTRAINT fk_gpa_student FOREIGN KEY (student_id) REFERENCES users(user_id)                        ON DELETE CASCADE,
  CONSTRAINT fk_gpa_profile FOREIGN KEY (profile_id) REFERENCES student_academic_profiles(profile_id) ON DELETE CASCADE
);


-- ============================================================
-- 6. IQ TEST RESULTS
-- ============================================================
CREATE TABLE iq_test_results (
  iq_result_id        UUID  NOT NULL DEFAULT gen_random_uuid(),
  student_id          UUID  NOT NULL,
  score               SMALLINT  NOT NULL,
  iq_estimate         SMALLINT  NOT NULL,
  percentile          DECIMAL(5,2) DEFAULT NULL,
  questions_attempted SMALLINT   NOT NULL DEFAULT 0,
  correct_answers     SMALLINT   NOT NULL DEFAULT 0,
  time_taken_seconds  INT       DEFAULT NULL,
  created_at          TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_iq_score CHECK (score >= 0),
  PRIMARY KEY (iq_result_id),
  CONSTRAINT fk_iq_student FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE
);


-- ============================================================
-- 7. STUDY PLANS
-- ============================================================
CREATE TABLE study_plans (
  plan_id                    UUID     NOT NULL DEFAULT gen_random_uuid(),
  student_id                 UUID     NOT NULL,
  prediction_id              UUID     NOT NULL,
  iq_result_id               UUID     NOT NULL,
  target_gpa                 DECIMAL(3,2) NOT NULL,
  total_study_hours_per_week DECIMAL(5,2) NOT NULL,
  free_time_hours_per_week   DECIMAL(5,2) NOT NULL,
  status                     VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed')),
  created_at                 TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_sp_target_gpa   CHECK (target_gpa BETWEEN 0.0 AND 4.0),
  CONSTRAINT chk_sp_study_hours  CHECK (total_study_hours_per_week >= 0),
  CONSTRAINT chk_sp_free_time    CHECK (free_time_hours_per_week >= 0),
  PRIMARY KEY (plan_id),
  CONSTRAINT fk_sp_student    FOREIGN KEY (student_id)    REFERENCES users(user_id)                ON DELETE CASCADE,
  CONSTRAINT fk_sp_prediction FOREIGN KEY (prediction_id) REFERENCES gpa_predictions(prediction_id),
  CONSTRAINT fk_sp_iq         FOREIGN KEY (iq_result_id)  REFERENCES iq_test_results(iq_result_id)
);

CREATE TABLE study_plan_subjects (
  id             UUID     NOT NULL DEFAULT gen_random_uuid(),
  plan_id        UUID     NOT NULL,
  subject_name   VARCHAR(100) NOT NULL,
  hours_per_week DECIMAL(4,2) NOT NULL,
  priority       VARCHAR(32) NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  reason         TEXT         DEFAULT NULL,
  CONSTRAINT chk_sps_hours CHECK (hours_per_week >= 0),
  PRIMARY KEY (id),
  CONSTRAINT fk_sps_plan FOREIGN KEY (plan_id) REFERENCES study_plans(plan_id) ON DELETE CASCADE
);

CREATE TABLE study_plan_schedule (
  schedule_id   UUID     NOT NULL DEFAULT gen_random_uuid(),
  plan_id       UUID     NOT NULL,
  day_of_week   VARCHAR(32) NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  start_time    TIME         NOT NULL,
  end_time      TIME         NOT NULL,
  activity_type VARCHAR(32) NOT NULL CHECK (activity_type IN ('study','free','exercise','break')),
  subject_name  VARCHAR(100) DEFAULT NULL,
  notes         TEXT         DEFAULT NULL,
  CONSTRAINT chk_sch_time CHECK (end_time > start_time),
  PRIMARY KEY (schedule_id),
  CONSTRAINT fk_sch_plan FOREIGN KEY (plan_id) REFERENCES study_plans(plan_id) ON DELETE CASCADE
);


-- ============================================================
-- 8. WHAT-IF SIMULATIONS
-- ============================================================
CREATE TABLE whatif_simulations (
  simulation_id UUID     NOT NULL DEFAULT gen_random_uuid(),
  student_id    UUID     NOT NULL,
  prediction_id UUID     NOT NULL,
  overrides     JSONB         NOT NULL,
  baseline_gpa  DECIMAL(3,2) NOT NULL,
  simulated_gpa DECIMAL(3,2) NOT NULL,
  delta         DECIMAL(3,2) NOT NULL,
  improved      SMALLINT   NOT NULL DEFAULT 0,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_wi_baseline  CHECK (baseline_gpa BETWEEN 0.0 AND 4.0),
  CONSTRAINT chk_wi_simulated CHECK (simulated_gpa BETWEEN 0.0 AND 4.0),
  PRIMARY KEY (simulation_id),
  CONSTRAINT fk_wi_student    FOREIGN KEY (student_id)    REFERENCES users(user_id)               ON DELETE CASCADE,
  CONSTRAINT fk_wi_prediction FOREIGN KEY (prediction_id) REFERENCES gpa_predictions(prediction_id)
);


-- ============================================================
-- 9. LESSONS
-- ============================================================
CREATE TABLE lessons (
  lesson_id       UUID     NOT NULL DEFAULT gen_random_uuid(),
  class_id        UUID     NOT NULL,
  teacher_id      UUID     NOT NULL,
  title           VARCHAR(300) NOT NULL,
  description     TEXT         DEFAULT NULL,
  file_url        VARCHAR(500) NOT NULL,
  file_type       VARCHAR(32) NOT NULL CHECK (file_type IN ('pdf','video','pptx','docx','image','link')),
  file_size_bytes BIGINT       DEFAULT NULL,
  is_published    SMALLINT   NOT NULL DEFAULT 0,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (lesson_id),
  CONSTRAINT fk_les_class   FOREIGN KEY (class_id)   REFERENCES classes(class_id) ON DELETE CASCADE,
  CONSTRAINT fk_les_teacher FOREIGN KEY (teacher_id) REFERENCES users(user_id)
);

CREATE TABLE lesson_views (
  view_id    UUID   NOT NULL DEFAULT gen_random_uuid(),
  lesson_id  UUID   NOT NULL,
  student_id UUID   NOT NULL,
  completed  SMALLINT NOT NULL DEFAULT 0,
  viewed_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (view_id),
  CONSTRAINT uq_lesson_view UNIQUE (lesson_id, student_id),
  CONSTRAINT fk_lv_lesson  FOREIGN KEY (lesson_id)  REFERENCES lessons(lesson_id) ON DELETE CASCADE,
  CONSTRAINT fk_lv_student FOREIGN KEY (student_id) REFERENCES users(user_id)     ON DELETE CASCADE
);


-- ============================================================
-- 10. QUIZZES
-- ============================================================
CREATE TABLE quizzes (
  quiz_id            UUID     NOT NULL DEFAULT gen_random_uuid(),
  class_id           UUID     NOT NULL,
  teacher_id         UUID     NOT NULL,
  title              VARCHAR(300) NOT NULL,
  quiz_type          VARCHAR(32) NOT NULL DEFAULT 'manual' CHECK (quiz_type IN ('manual','ai_generated','mmlu','file')),
  source_file_url    VARCHAR(500) DEFAULT NULL,
  time_limit_minutes INT          DEFAULT NULL,
  max_attempts       SMALLINT      NOT NULL DEFAULT 1,
  is_published       SMALLINT   NOT NULL DEFAULT 0,
  available_from     TIMESTAMP     DEFAULT NULL,
  available_until    TIMESTAMP     DEFAULT NULL,
  created_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_qz_time_limit  CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0),
  CONSTRAINT chk_qz_max_attempts CHECK (max_attempts > 0),
  CONSTRAINT chk_qz_dates       CHECK (available_until IS NULL OR available_from IS NULL OR available_until > available_from),
  PRIMARY KEY (quiz_id),
  CONSTRAINT fk_qz_class   FOREIGN KEY (class_id)   REFERENCES classes(class_id) ON DELETE CASCADE,
  CONSTRAINT fk_qz_teacher FOREIGN KEY (teacher_id) REFERENCES users(user_id)
);

CREATE TABLE quiz_questions (
  question_id    UUID NOT NULL DEFAULT gen_random_uuid(),
  quiz_id        UUID NOT NULL,
  question_order INT      NOT NULL,
  question_text  TEXT     NOT NULL,
  explanation    TEXT     DEFAULT NULL,
  CONSTRAINT chk_qq_order CHECK (question_order > 0),
  PRIMARY KEY (question_id),
  CONSTRAINT uq_quiz_question_order UNIQUE (quiz_id, question_order),
  CONSTRAINT fk_qq_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
);

CREATE TABLE quiz_options (
  option_id    UUID   NOT NULL DEFAULT gen_random_uuid(),
  question_id  UUID   NOT NULL,
  option_label CHAR(1)    NOT NULL,
  option_text  TEXT       NOT NULL,
  is_correct   SMALLINT NOT NULL DEFAULT 0,
  CONSTRAINT chk_qo_label CHECK (option_label IN ('A','B','C','D','E')),
  PRIMARY KEY (option_id),
  CONSTRAINT uq_option_label UNIQUE (question_id, option_label),
  CONSTRAINT fk_qo_question FOREIGN KEY (question_id) REFERENCES quiz_questions(question_id) ON DELETE CASCADE
);

CREATE TABLE quiz_attempts (
  attempt_id      UUID     NOT NULL DEFAULT gen_random_uuid(),
  quiz_id         UUID     NOT NULL,
  student_id      UUID     NOT NULL,
  started_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at    TIMESTAMP     DEFAULT NULL,
  score           DECIMAL(5,2) DEFAULT NULL,
  total_questions INT          NOT NULL DEFAULT 0,
  correct_answers INT          NOT NULL DEFAULT 0,
  status          VARCHAR(32) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','graded')),
  submission_file_url  VARCHAR(500) DEFAULT NULL,
  submission_file_name VARCHAR(300) DEFAULT NULL,
  CONSTRAINT chk_qa_score CHECK (score IS NULL OR score BETWEEN 0 AND 100),
  PRIMARY KEY (attempt_id),
  CONSTRAINT fk_qa_quiz    FOREIGN KEY (quiz_id)    REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
  CONSTRAINT fk_qa_student FOREIGN KEY (student_id) REFERENCES users(user_id)   ON DELETE CASCADE
);

CREATE TABLE quiz_attempt_answers (
  id                 UUID   NOT NULL DEFAULT gen_random_uuid(),
  attempt_id         UUID   NOT NULL,
  question_id        UUID   NOT NULL,
  selected_option_id UUID   DEFAULT NULL,
  is_correct         SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT uq_attempt_question UNIQUE (attempt_id, question_id),
  CONSTRAINT fk_aaa_attempt  FOREIGN KEY (attempt_id)         REFERENCES quiz_attempts(attempt_id)  ON DELETE CASCADE,
  CONSTRAINT fk_aaa_question FOREIGN KEY (question_id)        REFERENCES quiz_questions(question_id),
  CONSTRAINT fk_aaa_option   FOREIGN KEY (selected_option_id) REFERENCES quiz_options(option_id)
);


-- ============================================================
-- 11. ATTENDANCE
-- ============================================================
CREATE TABLE attendance (
  attendance_id   UUID NOT NULL DEFAULT gen_random_uuid(),
  class_id        UUID NOT NULL,
  student_id      UUID NOT NULL,
  session_date    DATE     NOT NULL,
  status          VARCHAR(32) NOT NULL DEFAULT 'absent' CHECK (status IN ('present','absent','late','excused')),
  marked_by       UUID DEFAULT NULL,
  quiz_attempt_id UUID DEFAULT NULL,
  marked_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (attendance_id),
  CONSTRAINT uq_attendance UNIQUE (class_id, student_id, session_date),
  CONSTRAINT fk_att_class   FOREIGN KEY (class_id)        REFERENCES classes(class_id)          ON DELETE CASCADE,
  CONSTRAINT fk_att_student FOREIGN KEY (student_id)      REFERENCES users(user_id)              ON DELETE CASCADE,
  CONSTRAINT fk_att_marker  FOREIGN KEY (marked_by)       REFERENCES users(user_id),
  CONSTRAINT fk_att_attempt FOREIGN KEY (quiz_attempt_id) REFERENCES quiz_attempts(attempt_id) ON DELETE SET NULL
);


-- ============================================================
-- 12. GAMIFICATION
-- ============================================================
CREATE TABLE student_points (
  id         UUID     NOT NULL DEFAULT gen_random_uuid(),
  student_id UUID     NOT NULL,
  class_id   UUID     DEFAULT NULL,
  points     INT          NOT NULL,
  reason     VARCHAR(200) NOT NULL,
  earned_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_pts_positive CHECK (points > 0),
  PRIMARY KEY (id),
  CONSTRAINT fk_pts_student FOREIGN KEY (student_id) REFERENCES users(user_id)    ON DELETE CASCADE,
  CONSTRAINT fk_pts_class   FOREIGN KEY (class_id)   REFERENCES classes(class_id) ON DELETE SET NULL
);

CREATE TABLE badges (
  badge_id       UUID     NOT NULL DEFAULT gen_random_uuid(),
  name           VARCHAR(100) NOT NULL,
  description    TEXT         DEFAULT NULL,
  icon_url       VARCHAR(500) DEFAULT NULL,
  criteria_type  VARCHAR(32) NOT NULL CHECK (criteria_type IN ('quiz_score','streak','study_plan','attendance','prediction','points')),
  criteria_value INT          NOT NULL,
  CONSTRAINT chk_badge_criteria CHECK (criteria_value > 0),
  PRIMARY KEY (badge_id),
  CONSTRAINT uq_badge_name UNIQUE (name)
);

CREATE TABLE student_badges (
  id         UUID NOT NULL DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  badge_id   UUID NOT NULL,
  earned_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_student_badge UNIQUE (student_id, badge_id),
  CONSTRAINT fk_sb_student FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_sb_badge   FOREIGN KEY (badge_id)   REFERENCES badges(badge_id)
);


-- ============================================================
-- 13. APTITUDE / IQ TEST QUESTION BANK
-- Admin-managed, platform-wide (not tied to a class/teacher).
-- iq_test_results above stores the *aggregate outcome* per attempt;
-- these two tables hold the actual question bank so scoring happens
-- server-side instead of trusting client-submitted "correct answers".
-- ============================================================
CREATE TABLE aptitude_questions (
  question_id    UUID   NOT NULL DEFAULT gen_random_uuid(),
  question_order INT        NOT NULL,
  question_text  TEXT       NOT NULL,
  is_active      SMALLINT NOT NULL DEFAULT 1,
  created_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_aptq_order CHECK (question_order > 0),
  PRIMARY KEY (question_id),
  CONSTRAINT uq_aptitude_question_order UNIQUE (question_order)
);

CREATE TABLE aptitude_options (
  option_id    UUID   NOT NULL DEFAULT gen_random_uuid(),
  question_id  UUID   NOT NULL,
  option_label CHAR(1)    NOT NULL,
  option_text  TEXT       NOT NULL,
  is_correct   SMALLINT NOT NULL DEFAULT 0,
  CONSTRAINT chk_apto_label CHECK (option_label IN ('A','B','C','D','E')),
  PRIMARY KEY (option_id),
  CONSTRAINT uq_apt_option_label UNIQUE (question_id, option_label),
  CONSTRAINT fk_apto_question FOREIGN KEY (question_id) REFERENCES aptitude_questions(question_id) ON DELETE CASCADE
);

CREATE INDEX idx_aptopt_question ON aptitude_options(question_id);


-- ============================================================
-- INDEXES  (query optimization)
-- ============================================================
CREATE INDEX idx_class_teachers_class    ON class_teachers(class_id);
CREATE INDEX idx_class_teachers_teacher  ON class_teachers(teacher_id);
CREATE INDEX idx_class_students_class    ON class_students(class_id);
CREATE INDEX idx_class_students_student  ON class_students(student_id);
CREATE INDEX idx_sap_student             ON student_academic_profiles(student_id);
CREATE INDEX idx_sap_class               ON student_academic_profiles(class_id);
CREATE INDEX idx_gpa_student             ON gpa_predictions(student_id);
CREATE INDEX idx_gpa_created             ON gpa_predictions(created_at);
CREATE INDEX idx_iq_student              ON iq_test_results(student_id);
CREATE INDEX idx_sp_student              ON study_plans(student_id);
CREATE INDEX idx_wi_student              ON whatif_simulations(student_id);
CREATE INDEX idx_lessons_class           ON lessons(class_id);
CREATE INDEX idx_lessons_published       ON lessons(is_published);
CREATE INDEX idx_quizzes_class           ON quizzes(class_id);
CREATE INDEX idx_quizzes_published       ON quizzes(is_published);
CREATE INDEX idx_quiz_attempts_quiz      ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_student   ON quiz_attempts(student_id, quiz_id);
CREATE INDEX idx_attendance_lookup       ON attendance(class_id, student_id, session_date);
CREATE INDEX idx_attendance_date         ON attendance(session_date);
CREATE INDEX idx_points_student          ON student_points(student_id);




-- ============================================================
-- ENCRYPTION NOTE
-- password_hash  → bcrypt hash (handled by Node.js, never stored plain)
-- family_income_range, parental_education_level  → sensitive PII
--   Production recommendation: use AES_ENCRYPT() / AES_DECRYPT()
--   with a key stored outside the DB (env var or secrets manager)
--   Example:
--     INSERT INTO student_academic_profiles (family_income_range, ...)
--     VALUES (AES_ENCRYPT('low', UNHEX(SHA2(@enc_key,256))), ...);
--   DB connection: require_secure_transport = ON  (SSL enforced)
-- ============================================================


-- ============================================================
-- updated_at auto-touch (replaces MySQL's ON UPDATE CURRENT_TIMESTAMP)
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_sap_updated_at
  BEFORE UPDATE ON student_academic_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();