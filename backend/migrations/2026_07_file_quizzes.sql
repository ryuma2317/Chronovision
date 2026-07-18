-- ============================================================
-- Migration: "Upload a file as a quiz" support (Postgres / Supabase)
--
-- Run this ONCE against your existing database.
--
-- WHAT THIS DOES:
--   * Adds 2 columns to the existing quiz_attempts table
--   * Replaces one rule on the existing quizzes table
--
-- WHAT THIS DOES NOT DO:
--   * Does NOT create any new table
--   * Does NOT delete any table
--   * Does NOT delete or change any existing row of data
--   Your table count stays exactly the same.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Allow the new 'file' quiz type.
--
-- The quizzes table has a rule saying quiz_type must be one of
-- 'manual', 'ai_generated' or 'mmlu'. We swap that rule for one
-- that also allows 'file'. Nothing else about the table changes.
--
-- The loop below finds that rule by looking at what it actually
-- checks, rather than guessing its name -- names can differ
-- between databases, and dropping the wrong one (or none) would
-- leave the old rule silently blocking 'file'.
-- ------------------------------------------------------------
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'quizzes'::regclass
      AND contype  = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%quiz_type%'
  LOOP
    EXECUTE format('ALTER TABLE quizzes DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE quizzes
  ADD CONSTRAINT quizzes_quiz_type_check
  CHECK (quiz_type IN ('manual','ai_generated','mmlu','file'));


-- ------------------------------------------------------------
-- 2. Store the student's uploaded answer file on their attempt.
--
-- Two new optional columns on the existing quiz_attempts table.
-- Existing rows just get NULL in them, which is correct: those
-- attempts were multiple-choice and have no uploaded file.
-- ------------------------------------------------------------
ALTER TABLE quiz_attempts
  ADD COLUMN IF NOT EXISTS submission_file_url  VARCHAR(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS submission_file_name VARCHAR(300) DEFAULT NULL;