-- ============================================================================
-- CHRONOVISION — 005a: PERFORMANCE INDEXES  (the permanent migration)
--
-- Run this ONCE, as a whole file. No placeholders, nothing to edit.
-- Safe to re-run: every statement is IF NOT EXISTS.
--
-- The EXPLAIN ANALYZE demonstrations live in 005_demo.sql, which is run
-- interactively during the presentation — NOT as part of the migration.
-- ============================================================================

-- ── 1. The hot path: "which courses does this student take?" ────────────────
-- Runs on every prediction and every study plan. Without this index Postgres
-- must read the entire class_students table to find one student's enrolments.
CREATE INDEX IF NOT EXISTS idx_class_students_student
  ON class_students(student_id);

-- ── 2. Composite: attendance auto-fill ──────────────────────────────────────
-- Column ORDER matters. We always filter by student first, so student_id is
-- the leading column. Reversed, this index would be useless for our query —
-- a B-tree can only seek on a left-most prefix.
CREATE INDEX IF NOT EXISTS idx_attendance_student_class
  ON attendance(student_id, class_id);

-- ── 3. Partial: only ACTIVE courses are ever queried ────────────────────────
-- Indexing deactivated courses would cost disk and slow every INSERT for no
-- benefit, because no query ever looks for them.
CREATE INDEX IF NOT EXISTS idx_courses_class_active
  ON courses(class_id) WHERE is_active = 1;

-- ── 4. Covering: enables an INDEX ONLY SCAN ─────────────────────────────────
-- Every column the query needs is inside the index, so Postgres answers from
-- the index alone and never touches the table heap at all.
CREATE INDEX IF NOT EXISTS idx_coursepred_covering
  ON course_predictions(prediction_id)
  INCLUDE (course_name, predicted_final, credits);

-- ── 5. Supporting indexes on frequently-joined foreign keys ─────────────────
CREATE INDEX IF NOT EXISTS idx_class_teachers_teacher
  ON class_teachers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_gpa_pred_student
  ON gpa_predictions(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_class
  ON courses(class_id);

-- ── Refresh planner statistics so it knows the new indexes exist ────────────
ANALYZE class_students;
ANALYZE attendance;
ANALYZE courses;
ANALYZE course_predictions;
ANALYZE gpa_predictions;

-- ── Confirm they were created ───────────────────────────────────────────────
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;