-- ============================================================
-- CHRONOVISION — Database Schema
-- MySQL 8.0+
-- Encoding: utf8mb4
-- ============================================================

CREATE DATABASE IF NOT EXISTS chronovision
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE chronovision;


-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE users (
  user_id        CHAR(36)     NOT NULL DEFAULT (UUID()),
  email          VARCHAR(255) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  role           ENUM('admin','teacher','student') NOT NULL,
  first_name     VARCHAR(100) NOT NULL,
  last_name      VARCHAR(100) NOT NULL,
  is_active      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email)
);


-- ============================================================
-- 2. CLASSES
-- ============================================================
CREATE TABLE classes (
  class_id      CHAR(36)     NOT NULL DEFAULT (UUID()),
  created_by    CHAR(36)     NOT NULL,
  class_name    VARCHAR(200) NOT NULL,
  description   TEXT,
  academic_year VARCHAR(20)  NOT NULL,
  semester      TINYINT      NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (class_id),
  CONSTRAINT chk_classes_semester CHECK (semester BETWEEN 1 AND 8),
  CONSTRAINT fk_classes_admin FOREIGN KEY (created_by) REFERENCES users(user_id)
);


-- ============================================================
-- 3. CLASS MEMBERSHIPS
-- ============================================================
CREATE TABLE class_teachers (
  id          CHAR(36) NOT NULL DEFAULT (UUID()),
  class_id    CHAR(36) NOT NULL,
  teacher_id  CHAR(36) NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_class_teacher (class_id, teacher_id),
  CONSTRAINT fk_ct_class   FOREIGN KEY (class_id)   REFERENCES classes(class_id) ON DELETE CASCADE,
  CONSTRAINT fk_ct_teacher FOREIGN KEY (teacher_id) REFERENCES users(user_id)    ON DELETE CASCADE
);

CREATE TABLE class_students (
  id          CHAR(36) NOT NULL DEFAULT (UUID()),
  class_id    CHAR(36) NOT NULL,
  student_id  CHAR(36) NOT NULL,
  enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_class_student (class_id, student_id),
  CONSTRAINT fk_cs_class   FOREIGN KEY (class_id)   REFERENCES classes(class_id) ON DELETE CASCADE,
  CONSTRAINT fk_cs_student FOREIGN KEY (student_id) REFERENCES users(user_id)    ON DELETE CASCADE
);


-- ============================================================
-- 4. STUDENT ACADEMIC PROFILES  (36 ML input features)
-- ============================================================
CREATE TABLE student_academic_profiles (
  profile_id                    CHAR(36)     NOT NULL DEFAULT (UUID()),
  student_id                    CHAR(36)     NOT NULL,
  class_id                      CHAR(36)     NOT NULL,
  -- student info
  age                           TINYINT      NOT NULL,
  gender                        ENUM('male','female','other') NOT NULL,
  major                         VARCHAR(100) NOT NULL,
  semester                      TINYINT      NOT NULL,
  course_load                   TINYINT      NOT NULL,
  -- study behavior
  study_hours_per_day           DECIMAL(4,2) NOT NULL,
  attendance_percentage         DECIMAL(5,2) NOT NULL,
  time_management_score         TINYINT      NOT NULL,
  study_environment             ENUM('home','library','cafe','dormitory') NOT NULL,
  -- lifestyle
  social_media_hours            DECIMAL(4,2) NOT NULL,
  netflix_hours                 DECIMAL(4,2) NOT NULL,
  sleep_hours                   DECIMAL(4,2) NOT NULL,
  diet_quality                  ENUM('poor','average','good') NOT NULL,
  exercise_frequency            TINYINT      NOT NULL,
  part_time_job                 TINYINT(1)   NOT NULL DEFAULT 0,
  extracurricular_participation TINYINT(1)   NOT NULL DEFAULT 0,
  -- mental & psychological
  stress_level                  TINYINT      NOT NULL,
  mental_health_rating          TINYINT      NOT NULL,
  exam_anxiety_score            TINYINT      NOT NULL,
  motivation_level              TINYINT      NOT NULL,
  learning_style                ENUM('visual','auditory','reading','kinesthetic') NOT NULL,
  -- background & support
  parental_education_level      ENUM('high_school','bachelor','master','phd') NOT NULL,
  parental_support_level        TINYINT      NOT NULL,
  family_income_range           ENUM('low','middle','high') NOT NULL,
  internet_quality              ENUM('poor','moderate','good','excellent') NOT NULL,
  access_to_tutoring            TINYINT(1)   NOT NULL DEFAULT 0,
  -- academic performance
  previous_gpa                  DECIMAL(3,2) NOT NULL,
  aptitude_score                TINYINT      NOT NULL,
  exam_score                    DECIMAL(5,2) NOT NULL,
  mathematics_score             DECIMAL(5,2) NOT NULL,
  biology_score                 DECIMAL(5,2) NOT NULL,
  chemistry_score               DECIMAL(5,2) NOT NULL,
  physics_score                 DECIMAL(5,2) NOT NULL,
  computer_science_score        DECIMAL(5,2) NOT NULL,
  statistics_score              DECIMAL(5,2) NOT NULL,
  created_at                    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
  UNIQUE KEY uq_sap_student_class (student_id, class_id),
  CONSTRAINT fk_sap_student FOREIGN KEY (student_id) REFERENCES users(user_id)    ON DELETE CASCADE,
  CONSTRAINT fk_sap_class   FOREIGN KEY (class_id)   REFERENCES classes(class_id) ON DELETE CASCADE
);


-- ============================================================
-- 5. GPA PREDICTIONS
-- ============================================================
CREATE TABLE gpa_predictions (
  prediction_id    CHAR(36)     NOT NULL DEFAULT (UUID()),
  student_id       CHAR(36)     NOT NULL,
  profile_id       CHAR(36)     NOT NULL,
  predicted_gpa    DECIMAL(3,2) NOT NULL,
  bucket           VARCHAR(50)  NOT NULL,
  at_risk_status   ENUM('on_track','at_risk','high_risk') NOT NULL,
  confidence_lower DECIMAL(3,2) DEFAULT NULL,
  confidence_upper DECIMAL(3,2) DEFAULT NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_gpa_predicted CHECK (predicted_gpa BETWEEN 0.0 AND 4.0),
  PRIMARY KEY (prediction_id),
  CONSTRAINT fk_gpa_student FOREIGN KEY (student_id) REFERENCES users(user_id)                        ON DELETE CASCADE,
  CONSTRAINT fk_gpa_profile FOREIGN KEY (profile_id) REFERENCES student_academic_profiles(profile_id) ON DELETE CASCADE
);


-- ============================================================
-- 6. IQ TEST RESULTS
-- ============================================================
CREATE TABLE iq_test_results (
  iq_result_id        CHAR(36)  NOT NULL DEFAULT (UUID()),
  student_id          CHAR(36)  NOT NULL,
  score               SMALLINT  NOT NULL,
  iq_estimate         SMALLINT  NOT NULL,
  percentile          DECIMAL(5,2) DEFAULT NULL,
  questions_attempted TINYINT   NOT NULL DEFAULT 0,
  correct_answers     TINYINT   NOT NULL DEFAULT 0,
  time_taken_seconds  INT       DEFAULT NULL,
  created_at          DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_iq_score CHECK (score >= 0),
  PRIMARY KEY (iq_result_id),
  CONSTRAINT fk_iq_student FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE
);


-- ============================================================
-- 7. STUDY PLANS
-- ============================================================
CREATE TABLE study_plans (
  plan_id                    CHAR(36)     NOT NULL DEFAULT (UUID()),
  student_id                 CHAR(36)     NOT NULL,
  prediction_id              CHAR(36)     NOT NULL,
  iq_result_id               CHAR(36)     NOT NULL,
  target_gpa                 DECIMAL(3,2) NOT NULL,
  total_study_hours_per_week DECIMAL(5,2) NOT NULL,
  free_time_hours_per_week   DECIMAL(5,2) NOT NULL,
  status                     ENUM('draft','active','completed') NOT NULL DEFAULT 'draft',
  created_at                 DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_sp_target_gpa   CHECK (target_gpa BETWEEN 0.0 AND 4.0),
  CONSTRAINT chk_sp_study_hours  CHECK (total_study_hours_per_week >= 0),
  CONSTRAINT chk_sp_free_time    CHECK (free_time_hours_per_week >= 0),
  PRIMARY KEY (plan_id),
  CONSTRAINT fk_sp_student    FOREIGN KEY (student_id)    REFERENCES users(user_id)                ON DELETE CASCADE,
  CONSTRAINT fk_sp_prediction FOREIGN KEY (prediction_id) REFERENCES gpa_predictions(prediction_id),
  CONSTRAINT fk_sp_iq         FOREIGN KEY (iq_result_id)  REFERENCES iq_test_results(iq_result_id)
);

CREATE TABLE study_plan_subjects (
  id             CHAR(36)     NOT NULL DEFAULT (UUID()),
  plan_id        CHAR(36)     NOT NULL,
  subject_name   VARCHAR(100) NOT NULL,
  hours_per_week DECIMAL(4,2) NOT NULL,
  priority       ENUM('high','medium','low') NOT NULL DEFAULT 'medium',
  reason         TEXT         DEFAULT NULL,
  CONSTRAINT chk_sps_hours CHECK (hours_per_week >= 0),
  PRIMARY KEY (id),
  CONSTRAINT fk_sps_plan FOREIGN KEY (plan_id) REFERENCES study_plans(plan_id) ON DELETE CASCADE
);

CREATE TABLE study_plan_schedule (
  schedule_id   CHAR(36)     NOT NULL DEFAULT (UUID()),
  plan_id       CHAR(36)     NOT NULL,
  day_of_week   ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  start_time    TIME         NOT NULL,
  end_time      TIME         NOT NULL,
  activity_type ENUM('study','free','exercise','break') NOT NULL,
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
  simulation_id CHAR(36)     NOT NULL DEFAULT (UUID()),
  student_id    CHAR(36)     NOT NULL,
  prediction_id CHAR(36)     NOT NULL,
  overrides     JSON         NOT NULL,
  baseline_gpa  DECIMAL(3,2) NOT NULL,
  simulated_gpa DECIMAL(3,2) NOT NULL,
  delta         DECIMAL(3,2) NOT NULL,
  improved      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  lesson_id       CHAR(36)     NOT NULL DEFAULT (UUID()),
  class_id        CHAR(36)     NOT NULL,
  teacher_id      CHAR(36)     NOT NULL,
  title           VARCHAR(300) NOT NULL,
  description     TEXT         DEFAULT NULL,
  file_url        VARCHAR(500) NOT NULL,
  file_type       ENUM('pdf','video','pptx','docx','image','link') NOT NULL,
  file_size_bytes BIGINT       DEFAULT NULL,
  is_published    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (lesson_id),
  CONSTRAINT fk_les_class   FOREIGN KEY (class_id)   REFERENCES classes(class_id) ON DELETE CASCADE,
  CONSTRAINT fk_les_teacher FOREIGN KEY (teacher_id) REFERENCES users(user_id)
);

CREATE TABLE lesson_views (
  view_id    CHAR(36)   NOT NULL DEFAULT (UUID()),
  lesson_id  CHAR(36)   NOT NULL,
  student_id CHAR(36)   NOT NULL,
  completed  TINYINT(1) NOT NULL DEFAULT 0,
  viewed_at  DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (view_id),
  UNIQUE KEY uq_lesson_view (lesson_id, student_id),
  CONSTRAINT fk_lv_lesson  FOREIGN KEY (lesson_id)  REFERENCES lessons(lesson_id) ON DELETE CASCADE,
  CONSTRAINT fk_lv_student FOREIGN KEY (student_id) REFERENCES users(user_id)     ON DELETE CASCADE
);


-- ============================================================
-- 10. QUIZZES
-- ============================================================
CREATE TABLE quizzes (
  quiz_id            CHAR(36)     NOT NULL DEFAULT (UUID()),
  class_id           CHAR(36)     NOT NULL,
  teacher_id         CHAR(36)     NOT NULL,
  title              VARCHAR(300) NOT NULL,
  quiz_type          ENUM('manual','ai_generated','mmlu','file') NOT NULL DEFAULT 'manual',
  source_file_url    VARCHAR(500) DEFAULT NULL,
  time_limit_minutes INT          DEFAULT NULL,
  max_attempts       TINYINT      NOT NULL DEFAULT 1,
  is_published       TINYINT(1)   NOT NULL DEFAULT 0,
  available_from     DATETIME     DEFAULT NULL,
  available_until    DATETIME     DEFAULT NULL,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_qz_time_limit  CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0),
  CONSTRAINT chk_qz_max_attempts CHECK (max_attempts > 0),
  CONSTRAINT chk_qz_dates       CHECK (available_until IS NULL OR available_from IS NULL OR available_until > available_from),
  PRIMARY KEY (quiz_id),
  CONSTRAINT fk_qz_class   FOREIGN KEY (class_id)   REFERENCES classes(class_id) ON DELETE CASCADE,
  CONSTRAINT fk_qz_teacher FOREIGN KEY (teacher_id) REFERENCES users(user_id)
);

CREATE TABLE quiz_questions (
  question_id    CHAR(36) NOT NULL DEFAULT (UUID()),
  quiz_id        CHAR(36) NOT NULL,
  question_order INT      NOT NULL,
  question_text  TEXT     NOT NULL,
  explanation    TEXT     DEFAULT NULL,
  CONSTRAINT chk_qq_order CHECK (question_order > 0),
  PRIMARY KEY (question_id),
  UNIQUE KEY uq_quiz_question_order (quiz_id, question_order),
  CONSTRAINT fk_qq_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
);

CREATE TABLE quiz_options (
  option_id    CHAR(36)   NOT NULL DEFAULT (UUID()),
  question_id  CHAR(36)   NOT NULL,
  option_label CHAR(1)    NOT NULL,
  option_text  TEXT       NOT NULL,
  is_correct   TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT chk_qo_label CHECK (option_label IN ('A','B','C','D','E')),
  PRIMARY KEY (option_id),
  UNIQUE KEY uq_option_label (question_id, option_label),
  CONSTRAINT fk_qo_question FOREIGN KEY (question_id) REFERENCES quiz_questions(question_id) ON DELETE CASCADE
);

CREATE TABLE quiz_attempts (
  attempt_id      CHAR(36)     NOT NULL DEFAULT (UUID()),
  quiz_id         CHAR(36)     NOT NULL,
  student_id      CHAR(36)     NOT NULL,
  started_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at    DATETIME     DEFAULT NULL,
  score           DECIMAL(5,2) DEFAULT NULL,
  total_questions INT          NOT NULL DEFAULT 0,
  correct_answers INT          NOT NULL DEFAULT 0,
  status          ENUM('in_progress','submitted','graded') NOT NULL DEFAULT 'in_progress',
  submission_file_url  VARCHAR(500) DEFAULT NULL,
  submission_file_name VARCHAR(300) DEFAULT NULL,
  CONSTRAINT chk_qa_score CHECK (score IS NULL OR score BETWEEN 0 AND 100),
  PRIMARY KEY (attempt_id),
  CONSTRAINT fk_qa_quiz    FOREIGN KEY (quiz_id)    REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
  CONSTRAINT fk_qa_student FOREIGN KEY (student_id) REFERENCES users(user_id)   ON DELETE CASCADE
);

CREATE TABLE quiz_attempt_answers (
  id                 CHAR(36)   NOT NULL DEFAULT (UUID()),
  attempt_id         CHAR(36)   NOT NULL,
  question_id        CHAR(36)   NOT NULL,
  selected_option_id CHAR(36)   DEFAULT NULL,
  is_correct         TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attempt_question (attempt_id, question_id),
  CONSTRAINT fk_aaa_attempt  FOREIGN KEY (attempt_id)         REFERENCES quiz_attempts(attempt_id)  ON DELETE CASCADE,
  CONSTRAINT fk_aaa_question FOREIGN KEY (question_id)        REFERENCES quiz_questions(question_id),
  CONSTRAINT fk_aaa_option   FOREIGN KEY (selected_option_id) REFERENCES quiz_options(option_id)
);


-- ============================================================
-- 11. ATTENDANCE
-- ============================================================
CREATE TABLE attendance (
  attendance_id   CHAR(36) NOT NULL DEFAULT (UUID()),
  class_id        CHAR(36) NOT NULL,
  student_id      CHAR(36) NOT NULL,
  session_date    DATE     NOT NULL,
  status          ENUM('present','absent','late','excused') NOT NULL DEFAULT 'absent',
  marked_by       CHAR(36) DEFAULT NULL,
  quiz_attempt_id CHAR(36) DEFAULT NULL,
  marked_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (attendance_id),
  UNIQUE KEY uq_attendance (class_id, student_id, session_date),
  CONSTRAINT fk_att_class   FOREIGN KEY (class_id)        REFERENCES classes(class_id)          ON DELETE CASCADE,
  CONSTRAINT fk_att_student FOREIGN KEY (student_id)      REFERENCES users(user_id)              ON DELETE CASCADE,
  CONSTRAINT fk_att_marker  FOREIGN KEY (marked_by)       REFERENCES users(user_id),
  CONSTRAINT fk_att_attempt FOREIGN KEY (quiz_attempt_id) REFERENCES quiz_attempts(attempt_id) ON DELETE SET NULL
);


-- ============================================================
-- 12. GAMIFICATION
-- ============================================================
CREATE TABLE student_points (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()),
  student_id CHAR(36)     NOT NULL,
  class_id   CHAR(36)     DEFAULT NULL,
  points     INT          NOT NULL,
  reason     VARCHAR(200) NOT NULL,
  earned_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_pts_positive CHECK (points > 0),
  PRIMARY KEY (id),
  CONSTRAINT fk_pts_student FOREIGN KEY (student_id) REFERENCES users(user_id)    ON DELETE CASCADE,
  CONSTRAINT fk_pts_class   FOREIGN KEY (class_id)   REFERENCES classes(class_id) ON DELETE SET NULL
);

CREATE TABLE badges (
  badge_id       CHAR(36)     NOT NULL DEFAULT (UUID()),
  name           VARCHAR(100) NOT NULL,
  description    TEXT         DEFAULT NULL,
  icon_url       VARCHAR(500) DEFAULT NULL,
  criteria_type  ENUM('quiz_score','streak','study_plan','attendance','prediction','points') NOT NULL,
  criteria_value INT          NOT NULL,
  CONSTRAINT chk_badge_criteria CHECK (criteria_value > 0),
  PRIMARY KEY (badge_id),
  UNIQUE KEY uq_badge_name (name)
);

CREATE TABLE student_badges (
  id         CHAR(36) NOT NULL DEFAULT (UUID()),
  student_id CHAR(36) NOT NULL,
  badge_id   CHAR(36) NOT NULL,
  earned_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_student_badge (student_id, badge_id),
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
  question_id    CHAR(36)   NOT NULL DEFAULT (UUID()),
  question_order INT        NOT NULL,
  question_text  TEXT       NOT NULL,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at     DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_aptq_order CHECK (question_order > 0),
  PRIMARY KEY (question_id),
  UNIQUE KEY uq_aptitude_question_order (question_order)
);

CREATE TABLE aptitude_options (
  option_id    CHAR(36)   NOT NULL DEFAULT (UUID()),
  question_id  CHAR(36)   NOT NULL,
  option_label CHAR(1)    NOT NULL,
  option_text  TEXT       NOT NULL,
  is_correct   TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT chk_apto_label CHECK (option_label IN ('A','B','C','D','E')),
  PRIMARY KEY (option_id),
  UNIQUE KEY uq_apt_option_label (question_id, option_label),
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
-- DB-LEVEL USERS & PRIVILEGES
-- ============================================================

-- App runtime user  → used by Node.js backend (.env DB_USER)
CREATE USER IF NOT EXISTS 'chronovision_app'@'%'
  IDENTIFIED BY 'change_this_in_production';
GRANT SELECT, INSERT, UPDATE, DELETE
  ON chronovision.*
  TO 'chronovision_app'@'%';

-- Read-only user  → DBA inspection, teacher dashboards, reporting
CREATE USER IF NOT EXISTS 'chronovision_readonly'@'%'
  IDENTIFIED BY 'change_this_in_production';
GRANT SELECT
  ON chronovision.*
  TO 'chronovision_readonly'@'%';

-- Admin/migration user  → localhost only, runs migrations & backups
CREATE USER IF NOT EXISTS 'chronovision_admin'@'localhost'
  IDENTIFIED BY 'change_this_in_production';
GRANT ALL PRIVILEGES
  ON chronovision.*
  TO 'chronovision_admin'@'localhost';

FLUSH PRIVILEGES;


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
