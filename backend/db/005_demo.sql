-- ============================================================================
-- CHRONOVISION — 005b: QUERY OPTIMIZATION DEMO  (run LIVE, block by block)
--
-- ⚠  DO NOT run this whole file at once. Run ONE BLOCK AT A TIME by
--    selecting it and pressing Ctrl+Enter (Cmd+Enter on Mac).
--
-- ⚠  STEP 0 IS MANDATORY. Every later block contains :student_uuid which you
--    must replace with a real UUID from Step 0, or you get:
--       ERROR 22P02: invalid input syntax for type uuid
-- ============================================================================


-- ═══ STEP 0 — GET A REAL STUDENT UUID (run this first, copy the result) ═════
SELECT u.user_id, u.email
FROM users u
JOIN class_students cs ON cs.student_id = u.user_id
LIMIT 1;

-- Copy the user_id. Now use Find & Replace (Ctrl+H) to swap every
-- :student_uuid below for that value, keeping the single quotes.


-- ═══ STEP 1 — WITHOUT THE INDEX  (screenshot this) ══════════════════════════
-- Drop the index and watch the planner fall back to reading the whole table.

DROP INDEX IF EXISTS idx_class_students_student;
ANALYZE class_students;

EXPLAIN (ANALYZE, BUFFERS)
SELECT co.course_name, co.credits
FROM courses co
JOIN class_students cs ON cs.class_id = co.class_id
WHERE cs.student_id = ':student_uuid' AND co.is_active = 1;

-- LOOK FOR:  "Seq Scan on class_students"
--   Postgres reads EVERY enrolment row in the system to find one student's.
--   Note the Execution Time and the "Buffers: shared read=" count.


-- ═══ STEP 2 — WITH THE INDEX  (screenshot this — the payoff) ════════════════
CREATE INDEX idx_class_students_student ON class_students(student_id);
ANALYZE class_students;

EXPLAIN (ANALYZE, BUFFERS)
SELECT co.course_name, co.credits
FROM courses co
JOIN class_students cs ON cs.class_id = co.class_id
WHERE cs.student_id = ':student_uuid' AND co.is_active = 1;

-- LOOK FOR:  "Index Scan using idx_class_students_student"
--
-- SAY THIS:  "Sequential scan became an index scan. The B-tree turns a full
--             table read into a logarithmic lookup — O(n) to O(log n). On this
--             dataset it saves milliseconds; at 10,000 students it is the
--             difference between a page that loads and one that times out."


-- ═══ STEP 3 — COVERING INDEX / INDEX ONLY SCAN ══════════════════════════════
EXPLAIN (ANALYZE)
SELECT course_name, predicted_final, credits
FROM course_predictions
WHERE prediction_id = (SELECT prediction_id FROM gpa_predictions LIMIT 1);

-- LOOK FOR:  "Index Only Scan"
-- SAY THIS:  "Every column we need is IN the index, so Postgres answers from
--             the index alone and never reads the table. Zero heap access."


-- ═══ STEP 4 — WHICH INDEXES ARE EARNING THEIR KEEP? ═════════════════════════
SELECT relname       AS table_name,
       indexrelname  AS index_name,
       idx_scan      AS times_used,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;

-- SAY THIS:  "We monitor idx_scan. An unused index is not free — it costs
--             write throughput and disk on every INSERT. If it stays at zero,
--             it gets removed."


-- ═══ STEP 5 — TABLE SIZES ═══════════════════════════════════════════════════
SELECT relname AS table_name,
       n_live_tup AS row_count,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;


-- ════════════════════════════════════════════════════════════════════════════
-- THE HONEST CAVEAT — say this BEFORE the examiner points it out:
--
--   On a small development database, Postgres may STILL choose a sequential
--   scan even with the index present, because reading 30 rows directly is
--   genuinely cheaper than descending a B-tree. That is the planner being
--   correct, not the index being useless.
--
--   So the evidence is the PLAN CHANGE (Seq Scan -> Index Scan), not the
--   milliseconds. The time saving is what happens at 10,000 rows, not 30.
-- ════════════════════════════════════════════════════════════════════════════