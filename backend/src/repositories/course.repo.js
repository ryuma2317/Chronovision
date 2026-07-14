const db = require('../config/db');
const { randomUUID } = require('crypto');

// Courses belong to a CLASS. There is no global catalogue — that was the thing
// forcing every class in the system to teach the same six subjects.

// ── Admin CRUD ───────────────────────────────────────────────────────────────

const create = async ({ class_id, course_name, course_code, credits, difficulty_level, created_by }) => {
  const course_id = randomUUID();
  await db.query(
    `INSERT INTO courses (course_id, class_id, course_name, course_code, credits, difficulty_level, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [course_id, class_id, course_name, course_code || null, credits, difficulty_level, created_by]
  );
  return { course_id, class_id, course_name, course_code, credits, difficulty_level, is_active: 1 };
};

const findByClass = async (class_id, { activeOnly = true } = {}) => {
  const [rows] = await db.query(
    `SELECT course_id, class_id, course_name, course_code, credits, difficulty_level, is_active
     FROM courses
     WHERE class_id = ? ${activeOnly ? 'AND is_active = 1' : ''}
     ORDER BY credits DESC, course_name ASC`,
    [class_id]
  );
  return rows;
};

const findById = async (course_id) => {
  const [rows] = await db.query('SELECT * FROM courses WHERE course_id = ?', [course_id]);
  return rows[0] || null;
};

const update = async (course_id, { course_name, course_code, credits, difficulty_level, is_active }) => {
  const [result] = await db.query(
    `UPDATE courses SET course_name = ?, course_code = ?, credits = ?, difficulty_level = ?, is_active = ?
     WHERE course_id = ?`,
    [course_name, course_code || null, credits, difficulty_level, is_active ?? 1, course_id]
  );
  return result.affectedRows > 0;
};

const deactivate = async (course_id) => {
  const [r] = await db.query('UPDATE courses SET is_active = 0 WHERE course_id = ?', [course_id]);
  return r.affectedRows > 0;
};

const remove = async (course_id) => {
  const [r] = await db.query('DELETE FROM courses WHERE course_id = ?', [course_id]);
  return r.affectedRows > 0;
};

// ── The student's curriculum ─────────────────────────────────────────────────

// EVERY active course from EVERY class the admin enrolled this student in,
// with their ATTENDANCE in that class pre-computed.
//
// The gate is the JOIN itself: a course is only reachable through
// class_students. No enrolment -> zero rows -> nothing to predict. A student
// cannot smuggle in a course that isn't theirs, because there is no SQL path
// to it.
//
// attendance_percentage is auto-filled so the student never types it — you
// already record attendance per class, so week-1 evidence is free.
const findAllForStudent = async (student_id) => {
  const [rows] = await db.query(
    `SELECT co.course_id, co.class_id, c.class_name,
            co.course_name, co.course_code, co.credits, co.difficulty_level,
            COALESCE(att.pct, NULL) AS attendance_percentage
     FROM courses co
     INNER JOIN class_students cs ON cs.class_id = co.class_id
     INNER JOIN classes c         ON c.class_id  = co.class_id
     LEFT JOIN (
       SELECT class_id, student_id,
              ROUND(100.0 * SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)
                    / NULLIF(COUNT(*), 0), 1) AS pct
       FROM attendance
       GROUP BY class_id, student_id
     ) att ON att.class_id = co.class_id AND att.student_id = cs.student_id
     WHERE cs.student_id = ? AND co.is_active = 1
     ORDER BY c.class_name ASC, co.credits DESC, co.course_name ASC`,
    [student_id]
  );
  return rows;
};

// ── Per-prediction course rows ───────────────────────────────────────────────

// Snapshot course_name/credits/difficulty AND the evidence the prediction was
// based on, so renaming a course later does not silently rewrite history.
const createCoursePredictions = async (prediction_id, courses) => {
  if (!courses.length) return;
  const values = courses.map((c) => [
    randomUUID(),
    prediction_id,
    c.course_id || null,
    c.course_name,
    c.midterm ?? null,
    c.predicted_final,
    c.credits,
    c.difficulty_level,
    c.grade_point,
    c.contribution_points,
    c.contribution_pct,
    c.weight_pct,
    c.course_attendance ?? null,
    c.quiz_average ?? null,
    c.assignment_average ?? null,
    c.evidence_stage,
    c.confidence,
  ]);
  await db.query(
    `INSERT INTO course_predictions
       (id, prediction_id, course_id, course_name, midterm_score, predicted_final,
        credits, difficulty_level, grade_point, contribution_points, contribution_pct,
        weight_pct, course_attendance, quiz_average, assignment_average,
        evidence_stage, confidence)
     VALUES ?`,
    [values]
  );
};

const findByPrediction = async (prediction_id) => {
  const [rows] = await db.query(
    `SELECT * FROM course_predictions WHERE prediction_id = ?
     ORDER BY contribution_points DESC`,
    [prediction_id]
  );
  return rows;
};

// The course rows of a student's MOST RECENT prediction. Feeds both the study
// plan generator and the what-if baseline.
const findLatestForStudent = async (student_id) => {
  const [rows] = await db.query(
    `SELECT cp.*
     FROM course_predictions cp
     INNER JOIN gpa_predictions p ON p.prediction_id = cp.prediction_id
     WHERE p.student_id = ?
       AND p.prediction_id = (
         SELECT prediction_id FROM gpa_predictions
         WHERE student_id = ? ORDER BY created_at DESC LIMIT 1
       )
     ORDER BY cp.contribution_points DESC`,
    [student_id, student_id]
  );
  return rows;
};

module.exports = {
  create, findByClass, findById, update, deactivate, remove,
  findAllForStudent, createCoursePredictions, findByPrediction, findLatestForStudent,
};