const db = require('../config/db');
const { randomUUID } = require('crypto');

// status defaults to 'absent' at the DB level — callers always pass an
// explicit status, matching the ENUM('present','absent','late','excused')
const upsert = async ({ class_id, student_id, session_date, status, marked_by = null, quiz_attempt_id = null }) => {
  const attendance_id = randomUUID();
  await db.query(
    `INSERT INTO attendance (attendance_id, class_id, student_id, session_date, status, marked_by, quiz_attempt_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by),
       quiz_attempt_id = VALUES(quiz_attempt_id), marked_at = CURRENT_TIMESTAMP`,
    [attendance_id, class_id, student_id, session_date, status, marked_by, quiz_attempt_id]
  );
};

const findByClass = async (class_id, session_date = null) => {
  if (session_date) {
    const [rows] = await db.query(
      `SELECT a.*, u.first_name, u.last_name, u.email FROM attendance a
       INNER JOIN users u ON a.student_id = u.user_id
       WHERE a.class_id = ? AND a.session_date = ?
       ORDER BY u.last_name, u.first_name`,
      [class_id, session_date]
    );
    return rows;
  }
  const [rows] = await db.query(
    `SELECT a.*, u.first_name, u.last_name, u.email FROM attendance a
     INNER JOIN users u ON a.student_id = u.user_id
     WHERE a.class_id = ? ORDER BY a.session_date DESC`,
    [class_id]
  );
  return rows;
};

const findByStudent = async (student_id, class_id = null) => {
  if (class_id) {
    const [rows] = await db.query(
      `SELECT a.*, c.class_name FROM attendance a
       INNER JOIN classes c ON a.class_id = c.class_id
       WHERE a.student_id = ? AND a.class_id = ? ORDER BY a.session_date DESC`,
      [student_id, class_id]
    );
    return rows;
  }
  const [rows] = await db.query(
    `SELECT a.*, c.class_name FROM attendance a
     INNER JOIN classes c ON a.class_id = c.class_id
     WHERE a.student_id = ? ORDER BY a.session_date DESC`,
    [student_id]
  );
  return rows;
};

// Used by class dashboards: % of sessions a student was present/late/excused for
const getAttendanceRate = async (class_id, student_id) => {
  const [rows] = await db.query(
    `SELECT
       COUNT(*) AS total_sessions,
       SUM(status IN ('present','late','excused')) AS attended_sessions
     FROM attendance WHERE class_id = ? AND student_id = ?`,
    [class_id, student_id]
  );
  const { total_sessions, attended_sessions } = rows[0];
  if (!total_sessions) return null;
  return Math.round((attended_sessions / total_sessions) * 1000) / 10; // one decimal place
};

module.exports = { upsert, findByClass, findByStudent, getAttendanceRate };
