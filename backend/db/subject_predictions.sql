-- ============================================================
-- Subject-level predictions (PostgreSQL / Supabase)
-- Run this once in the Supabase SQL Editor.
-- Click "Run without RLS" if prompted (your backend connects with the
-- full connection string, not the anon key — RLS does not apply).
-- ============================================================

-- 1. SUBJECTS — the catalogue, with ADMIN-EDITABLE credits.
--    This is what makes "different subjects have different credits" real:
--    change a row here and every future GPA calculation uses the new weight.
CREATE TABLE IF NOT EXISTS subjects (
  subject_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_key  VARCHAR(50)  NOT NULL UNIQUE,   -- must match the ML model keys
  display_name VARCHAR(100) NOT NULL,
  credits      SMALLINT     NOT NULL DEFAULT 2,
  is_active    SMALLINT     NOT NULL DEFAULT 1,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_subject_credits CHECK (credits BETWEEN 1 AND 6)
);

-- Seed the six subjects. subject_key MUST match the keys the ML models use.
INSERT INTO subjects (subject_key, display_name, credits) VALUES
  ('mathematics',      'Mathematics',      3),
  ('physics',          'Physics',          3),
  ('computer_science', 'Computer Science', 3),
  ('chemistry',        'Chemistry',        2),
  ('biology',          'Biology',          2),
  ('statistics',       'Statistics',       2)
ON CONFLICT (subject_key) DO NOTHING;


-- 2. SUBJECT_PREDICTIONS — one row PER SUBJECT per prediction.
--    Links back to gpa_predictions, so a single prediction has six of these:
--    the midterm the student entered, the final we predicted, and how much that
--    subject contributed to the overall GPA.
CREATE TABLE IF NOT EXISTS subject_predictions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id       UUID NOT NULL REFERENCES gpa_predictions(prediction_id) ON DELETE CASCADE,
  subject_key         VARCHAR(50)  NOT NULL,
  midterm_score       DECIMAL(5,2) NOT NULL,
  predicted_final     DECIMAL(5,2) NOT NULL,
  credits             SMALLINT     NOT NULL,
  grade_point         DECIMAL(4,3) NOT NULL,
  contribution_points DECIMAL(4,3) NOT NULL,  -- GPA points this subject added
  contribution_pct    DECIMAL(5,2) NOT NULL,  -- % of the GPA (the six sum to 100)
  weight_pct          DECIMAL(5,2) NOT NULL,  -- % of GPA it COULD influence (credits share)
  created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_sp_midterm CHECK (midterm_score   BETWEEN 0 AND 100),
  CONSTRAINT chk_sp_final   CHECK (predicted_final BETWEEN 0 AND 100),
  CONSTRAINT uq_pred_subject UNIQUE (prediction_id, subject_key)
);

CREATE INDEX IF NOT EXISTS idx_subpred_prediction ON subject_predictions(prediction_id);
CREATE INDEX IF NOT EXISTS idx_subpred_subject    ON subject_predictions(subject_key);
