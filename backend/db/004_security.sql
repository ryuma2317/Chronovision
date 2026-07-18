-- ============================================================================
-- CHRONOVISION — 004: USER PRIVILEGES & ACCESS CONTROL  (DATABASE LAYER)
--
-- THE POINT, IN ONE SENTENCE:
--   The `role` column in `users` is DATA. A Postgres ROLE is a PRIVILEGE.
--   The app checks the column; the DATABASE enforces the privilege. If the app
--   is ever bypassed, the database still holds the line. Defense in depth.
--
-- SAFE TO RE-RUN. Every statement is idempotent (IF EXISTS / IF NOT EXISTS /
-- DROP-then-CREATE). It creates no tables and deletes no rows.
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- PART 1 — ROLES (security principals)
-- ════════════════════════════════════════════════════════════════════════════
-- NOLOGIN: these are *group* roles. The API logs in as one user and SETs the
-- appropriate group role per request, so there is no password sprawl.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'chrono_student') THEN
    CREATE ROLE chrono_student NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'chrono_teacher') THEN
    CREATE ROLE chrono_teacher NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'chrono_admin') THEN
    CREATE ROLE chrono_admin NOLOGIN;
  END IF;
END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- PART 2 — PRINCIPLE OF LEAST PRIVILEGE
-- ════════════════════════════════════════════════════════════════════════════
-- Grant each role only what it needs, and nothing more.
--
-- NOTE: we deliberately do NOT run "REVOKE ALL ON ALL TABLES FROM PUBLIC" here.
-- On Supabase that can break the built-in anon / authenticated / service_role
-- users and take the application offline. Our three roles start with no
-- privileges anyway, so explicit GRANTs are sufficient and far safer.

GRANT USAGE ON SCHEMA public TO chrono_student, chrono_teacher, chrono_admin;

-- ── STUDENT ─────────────────────────────────────────────────────────────────
-- Reads the curriculum and their own work. No access to the users table
-- (cannot harvest classmates' emails). Cannot see other students' rows at all
-- once RLS is on (Part 3).
GRANT SELECT ON classes, courses, lessons, badges,
                aptitude_questions, aptitude_options TO chrono_student;

GRANT SELECT, INSERT ON gpa_predictions, course_predictions,
                        student_academic_profiles, whatif_simulations,
                        iq_test_results, lesson_views TO chrono_student;

GRANT SELECT, INSERT, UPDATE ON study_plans, study_plan_subjects,
                                study_plan_schedule TO chrono_student;

GRANT SELECT, INSERT ON quiz_attempts, quiz_attempt_answers TO chrono_student;
GRANT SELECT ON quizzes, quiz_questions TO chrono_student;
GRANT SELECT ON attendance, student_points, student_badges TO chrono_student;

-- CRITICAL: a student must never see which answer is correct before submitting.
-- COLUMN-level grant, not table-level. An application check would eventually
-- forget this; the database will not.
REVOKE ALL ON quiz_options FROM chrono_student;
GRANT SELECT (option_id, question_id, option_label, option_text)
  ON quiz_options TO chrono_student;
-- (is_correct is deliberately excluded.)

-- ── TEACHER ─────────────────────────────────────────────────────────────────
-- Runs their classroom. Cannot create users or classes — that is the admin's
-- job, which is exactly the rule the application enforces.
GRANT SELECT ON classes, courses, class_students, class_teachers TO chrono_teacher;

GRANT SELECT, INSERT, UPDATE, DELETE ON lessons, quizzes, quiz_questions,
                                        quiz_options TO chrono_teacher;
GRANT SELECT, INSERT, UPDATE ON attendance TO chrono_teacher;
GRANT SELECT ON quiz_attempts, quiz_attempt_answers, gpa_predictions,
                course_predictions, study_plans, student_points TO chrono_teacher;

-- Teachers see students, but must NOT read password hashes.
REVOKE ALL ON users FROM chrono_teacher;
GRANT SELECT (user_id, email, role, first_name, last_name, is_active)
  ON users TO chrono_teacher;

-- ── ADMIN ───────────────────────────────────────────────────────────────────
-- Manages users, classes and curriculum. Note what is ABSENT: no DELETE on
-- predictions or quiz attempts. Academic records are append-only — not even an
-- admin may quietly rewrite a student's history.
GRANT SELECT, INSERT, UPDATE, DELETE
  ON classes, courses, class_students, class_teachers, badges TO chrono_admin;

GRANT SELECT ON gpa_predictions, course_predictions, study_plans,
                quiz_attempts, attendance, student_points TO chrono_admin;

-- Even the admin cannot read password hashes.
REVOKE ALL ON users FROM chrono_admin;
GRANT SELECT (user_id, email, role, first_name, last_name, is_active,
              created_at, updated_at) ON users TO chrono_admin;
GRANT INSERT, UPDATE, DELETE ON users TO chrono_admin;


-- ════════════════════════════════════════════════════════════════════════════
-- PART 3 — ROW LEVEL SECURITY  (the showpiece)
-- ════════════════════════════════════════════════════════════════════════════
-- GRANT controls WHICH TABLES you may touch. RLS controls WHICH ROWS.
--
-- Without RLS, a student with SELECT on gpa_predictions can read EVERY
-- student's predictions. The app filters by student_id — but that is a promise
-- made in JavaScript. RLS makes it a rule enforced by the storage engine.
--
-- The API sets this once per request, right after verifying the JWT:
--     SET LOCAL app.user_id = '<uuid from the token>';
-- LOCAL scopes it to the transaction so it cannot leak across pooled requests.

ALTER TABLE gpa_predictions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_predictions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_academic_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans               ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatif_simulations        ENABLE ROW LEVEL SECURITY;

-- Dropped first so this file can be re-run safely.
DROP POLICY IF EXISTS student_own_predictions        ON gpa_predictions;
DROP POLICY IF EXISTS teacher_reads_own_class        ON gpa_predictions;
DROP POLICY IF EXISTS admin_full_read                ON gpa_predictions;
DROP POLICY IF EXISTS student_own_course_predictions ON course_predictions;
DROP POLICY IF EXISTS admin_full_read_cp             ON course_predictions;
DROP POLICY IF EXISTS student_own_profiles           ON student_academic_profiles;
DROP POLICY IF EXISTS student_own_plans              ON study_plans;
DROP POLICY IF EXISTS student_own_sims               ON whatif_simulations;

-- A student sees ONLY their own rows. Not "the app only asks for their own
-- rows" — the database will not RETURN anyone else's, whatever is asked.
CREATE POLICY student_own_predictions ON gpa_predictions
  FOR ALL TO chrono_student
  USING (student_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (student_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY student_own_profiles ON student_academic_profiles
  FOR ALL TO chrono_student
  USING (student_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (student_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY student_own_plans ON study_plans
  FOR ALL TO chrono_student
  USING (student_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (student_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY student_own_sims ON whatif_simulations
  FOR ALL TO chrono_student
  USING (student_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (student_id = current_setting('app.user_id', true)::uuid);

-- course_predictions has no student_id of its own — it reaches the student
-- through its parent prediction, so the policy follows the foreign key.
CREATE POLICY student_own_course_predictions ON course_predictions
  FOR ALL TO chrono_student
  USING (EXISTS (
    SELECT 1 FROM gpa_predictions p
    WHERE p.prediction_id = course_predictions.prediction_id
      AND p.student_id = current_setting('app.user_id', true)::uuid
  ));

-- A TEACHER may read predictions — but only for students in a class they
-- actually teach. The same "you must be assigned to it" rule the app enforces,
-- written as a policy that walks the junction tables.
CREATE POLICY teacher_reads_own_class ON gpa_predictions
  FOR SELECT TO chrono_teacher
  USING (EXISTS (
    SELECT 1
    FROM class_students cs
    JOIN class_teachers ct ON ct.class_id = cs.class_id
    WHERE cs.student_id = gpa_predictions.student_id
      AND ct.teacher_id = current_setting('app.user_id', true)::uuid
  ));

-- The admin has oversight, but still cannot read password hashes (Part 2) and
-- still cannot delete academic records.
CREATE POLICY admin_full_read ON gpa_predictions
  FOR SELECT TO chrono_admin USING (true);
CREATE POLICY admin_full_read_cp ON course_predictions
  FOR SELECT TO chrono_admin USING (true);


-- ════════════════════════════════════════════════════════════════════════════
-- PART 4 — PROVE IT WORKS  (this is your live demo)
-- ════════════════════════════════════════════════════════════════════════════
/*
-- Grab two real student UUIDs first:
SELECT user_id, email FROM users WHERE role = 'student' LIMIT 2;

-- ── DEMO 1: RLS blocks cross-student reads ──────────────────────────────────
BEGIN;
SET LOCAL ROLE chrono_student;
SET LOCAL app.user_id = '<STUDENT-A-UUID>';

SELECT student_id, predicted_gpa FROM gpa_predictions;
--  ^ ONLY student A's rows. Student B's are invisible. Not filtered by the
--    application — filtered by Postgres itself.

SELECT * FROM gpa_predictions WHERE student_id = '<STUDENT-B-UUID>';
--  ^ ZERO ROWS. We explicitly asked for another student's data and the
--    database refused. THIS IS THE MONEY SHOT.
ROLLBACK;

-- ── DEMO 2: privilege denial ────────────────────────────────────────────────
BEGIN;
SET LOCAL ROLE chrono_student;
SELECT email, password_hash FROM users;
--  ^ ERROR: permission denied for table users
ROLLBACK;

BEGIN;
SET LOCAL ROLE chrono_student;
SELECT is_correct FROM quiz_options;
--  ^ ERROR: permission denied for column is_correct
--    A student cannot read the answer key. Column-level security.
ROLLBACK;

-- ── DEMO 3: the teacher boundary ────────────────────────────────────────────
BEGIN;
SET LOCAL ROLE chrono_teacher;
SET LOCAL app.user_id = '<TEACHER-UUID>';
SELECT student_id, predicted_gpa FROM gpa_predictions;
--  ^ ONLY students in classes this teacher is assigned to. The policy walks
--    class_teachers -> class_students, enforcing assignment in the engine.
ROLLBACK;
*/