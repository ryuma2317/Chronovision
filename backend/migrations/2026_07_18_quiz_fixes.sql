-- ============================================================
-- Migration: quiz delete/edit fixes (Postgres / Supabase)
--
-- Run this ONCE against your existing database, same way as the
-- previous migration (Supabase SQL Editor -> paste -> Run).
--
-- WHAT THIS DOES:
--   * Fixes ONE existing foreign key rule so deleting a quiz that
--     has been attempted no longer crashes with "Internal server
--     error". This does not delete or change any row of data.
--
-- WHAT THIS DOES NOT DO:
--   * Does NOT create any new table
--   * Does NOT delete any table
--   * Does NOT delete or change any existing row of data
--   Your table count stays exactly the same.
-- ============================================================


-- ------------------------------------------------------------
-- The attendance table has a foreign key pointing at quiz_attempts
-- (quiz_attempt_id), so it can remember which quiz attempt an
-- attendance record came from. That link had no rule for what to
-- do if the linked attempt gets deleted -- so deleting a quiz that
-- students had already answered would cascade-delete their
-- attempt row, hit this link, and the whole delete would be
-- rejected by Postgres. Your app then showed a generic
-- "Internal server error" instead of a clear message.
--
-- The fix: when a linked attempt is removed, just clear the link
-- (set it to NULL) instead of blocking the delete. The attendance
-- record itself is untouched -- the student still shows as having
-- attended that day, it just no longer points at a specific
-- (now-deleted) quiz attempt.
--
-- Same lookup-by-what-it-checks approach as the first migration,
-- so this works even if your constraint has a different internal
-- name than expected.
-- ------------------------------------------------------------
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'attendance'::regclass
      AND contype  = 'f'
      AND pg_get_constraintdef(oid) ILIKE '%quiz_attempt_id%'
  LOOP
    EXECUTE format('ALTER TABLE attendance DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE attendance
  ADD CONSTRAINT fk_att_attempt
  FOREIGN KEY (quiz_attempt_id) REFERENCES quiz_attempts(attempt_id) ON DELETE SET NULL;