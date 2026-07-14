const db = require('../config/db');
const { randomUUID } = require('crypto');

// The 36 ML input features live in student_academic_profiles, scoped to
// the student + the class they're enrolled in. A student keeps one row
// per class (their academic profile for that course); each new prediction
// snapshot updates that profile and adds a new gpa_predictions row.
// Behavioural/demographic features only. The six *_score columns and exam_score
// are GONE from this list — course scores now live in course_predictions, one
// row per course, however many the student is actually taking.
// The 15 surviving student features.
// Dropped on purpose: gender, family_income_range, parental_education_level
// (a model must not predict failure from demographics), learning_style (no
// empirical support), plus age/major/semester/netflix_hours and other noise.
// Course scores are NOT here — they live in course_predictions, one row per
// course, however many the student actually takes.
const BEHAVIOUR_FIELDS = [
  'study_hours_per_day', 'attendance_percentage', 'time_management_score',
  'study_environment', 'course_load',
  'sleep_hours', 'social_media_hours', 'exercise_frequency', 'diet_quality',
  'stress_level', 'mental_health_rating', 'exam_anxiety_score', 'motivation_level',
  'previous_gpa', 'aptitude_score',
];
const PROFILE_FIELDS = BEHAVIOUR_FIELDS;   // back-compat alias

const upsertProfile = async ({ student_id, class_id, features }) => {
  const [existing] = await db.query(
    'SELECT profile_id FROM student_academic_profiles WHERE student_id = ? AND class_id = ?',
    [student_id, class_id]
  );

  const values = PROFILE_FIELDS.map((f) => features[f]);

  if (existing[0]) {
    const profile_id = existing[0].profile_id;
    const setClause = PROFILE_FIELDS.map((f) => `${f} = ?`).join(', ');
    await db.query(
      `UPDATE student_academic_profiles SET ${setClause} WHERE profile_id = ?`,
      [...values, profile_id]
    );
    return profile_id;
  }

  const profile_id = randomUUID();
  await db.query(
    `INSERT INTO student_academic_profiles (profile_id, student_id, class_id, ${PROFILE_FIELDS.join(', ')})
     VALUES (?, ?, ?, ${PROFILE_FIELDS.map(() => '?').join(', ')})`,
    [profile_id, student_id, class_id, ...values]
  );
  return profile_id;
};

const createPrediction = async ({ student_id, profile_id, predicted_gpa, bucket, at_risk_status, confidence_lower = null, confidence_upper = null, is_partial = 0, evidence_stage = null }) => {
  const prediction_id = randomUUID();
  await db.query(
    `INSERT INTO gpa_predictions (prediction_id, student_id, profile_id, predicted_gpa, bucket, at_risk_status, confidence_lower, confidence_upper, is_partial, evidence_stage)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [prediction_id, student_id, profile_id, predicted_gpa, bucket, at_risk_status, confidence_lower, confidence_upper, is_partial, evidence_stage]
  );
  return { prediction_id, student_id, profile_id, predicted_gpa, bucket, at_risk_status, confidence_lower, confidence_upper, is_partial, evidence_stage };
};

const findLatestByStudent = async (student_id) => {
  const [rows] = await db.query(
    `SELECT p.*, sap.* FROM gpa_predictions p
     INNER JOIN student_academic_profiles sap ON p.profile_id = sap.profile_id
     WHERE p.student_id = ?
     ORDER BY p.created_at DESC LIMIT 1`,
    [student_id]
  );
  return rows[0] || null;
};

const findAllByStudent = async (student_id) => {
  const [rows] = await db.query(
    `SELECT prediction_id, profile_id, predicted_gpa, bucket, at_risk_status, created_at
     FROM gpa_predictions WHERE student_id = ? ORDER BY created_at DESC`,
    [student_id]
  );
  return rows;
};

const findById = async (prediction_id) => {
  const [rows] = await db.query(
    `SELECT p.*, sap.* FROM gpa_predictions p
     INNER JOIN student_academic_profiles sap ON p.profile_id = sap.profile_id
     WHERE p.prediction_id = ?`,
    [prediction_id]
  );
  return rows[0] || null;
};

// Aggregate comparison against classmates — used by the peer comparison view.
// Compares each student's MOST RECENT prediction within the class.
const getClassComparison = async (class_id, student_id) => {
  const [rows] = await db.query(
    `SELECT p.student_id, p.predicted_gpa
     FROM gpa_predictions p
     INNER JOIN (
       SELECT student_id, MAX(created_at) AS latest
       FROM gpa_predictions gp
       INNER JOIN class_students cs ON gp.student_id = cs.student_id
       WHERE cs.class_id = ?
       GROUP BY student_id
     ) latest ON p.student_id = latest.student_id AND p.created_at = latest.latest`,
    [class_id]
  );

  if (rows.length === 0) return null;

  const gpas = rows.map((r) => Number(r.predicted_gpa)).sort((a, b) => a - b);
  const classAverage = Math.round((gpas.reduce((s, g) => s + g, 0) / gpas.length) * 100) / 100;
  const mine = rows.find((r) => r.student_id === student_id);
  if (!mine) return null;

  const myGpa = Number(mine.predicted_gpa);
  const belowOrEqual = gpas.filter((g) => g <= myGpa).length;
  const percentile = Math.round((belowOrEqual / gpas.length) * 100);

  return {
    your_predicted_gpa: myGpa,
    class_average_gpa: classAverage,
    total_students: gpas.length,
    percentile,
  };
};

module.exports = { PROFILE_FIELDS, BEHAVIOUR_FIELDS, upsertProfile, createPrediction, findLatestByStudent, findAllByStudent, findById, getClassComparison };