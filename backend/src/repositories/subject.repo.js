const db = require('../config/db');

// The subject catalogue (admin-editable credits) and the per-subject rows of a
// prediction.

// All active subjects, ordered so the UI is stable.
const findAllActive = async () => {
  const [rows] = await db.query(
    `SELECT subject_id, subject_key, display_name, credits
     FROM subjects
     WHERE is_active = 1
     ORDER BY credits DESC, display_name ASC`
  );
  return rows;
};

// Returns { mathematics: 3, physics: 3, ... } — the shape the Flask service and
// the GPA maths expect.
const getCreditsMap = async () => {
  const rows = await findAllActive();
  return rows.reduce((acc, r) => {
    acc[r.subject_key] = Number(r.credits);
    return acc;
  }, {});
};

// Admin: change a subject's credits. This is what makes the weighting
// configurable rather than hard-coded.
const updateCredits = async (subject_key, credits) => {
  const [result] = await db.query(
    `UPDATE subjects SET credits = ? WHERE subject_key = ?`,
    [credits, subject_key]
  );
  return result.affectedRows > 0;
};

// Save the six per-subject rows for one prediction (bulk insert — the db.js
// shim expands `VALUES ?` into one multi-row INSERT).
const createSubjectPredictions = async (prediction_id, subjects) => {
  if (!subjects.length) return;
  const values = subjects.map((s) => [
    prediction_id,
    s.subject,
    s.midterm,
    s.predicted_final,
    s.credits,
    s.grade_point,
    s.contribution_points,
    s.contribution_pct,
    s.weight_pct,
  ]);
  await db.query(
    `INSERT INTO subject_predictions
       (prediction_id, subject_key, midterm_score, predicted_final, credits,
        grade_point, contribution_points, contribution_pct, weight_pct)
     VALUES ?`,
    [values]
  );
};

// Fetch the six subject rows belonging to a prediction, biggest contributor first.
const findByPrediction = async (prediction_id) => {
  const [rows] = await db.query(
    `SELECT sp.*, s.display_name
     FROM subject_predictions sp
     LEFT JOIN subjects s ON s.subject_key = sp.subject_key
     WHERE sp.prediction_id = ?
     ORDER BY sp.contribution_points DESC`,
    [prediction_id]
  );
  return rows;
};

module.exports = {
  findAllActive,
  getCreditsMap,
  updateCredits,
  createSubjectPredictions,
  findByPrediction,
};
