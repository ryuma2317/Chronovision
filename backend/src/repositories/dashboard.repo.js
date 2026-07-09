const db = require('../config/db');

// Batched data for the class dashboard.
//
// The old class dashboard ran TWO queries PER student (one for their latest
// prediction, one for their attendance rate). For a class of 30 that's ~60
// database round-trips. On a hosted database like Supabase, each round-trip
// carries network latency, so this was noticeably slow. These two functions
// fetch the same information in ONE query each, no matter how many students —
// that's the N+1 fix.
//
// SQL here is written to work on both MySQL 8+ and PostgreSQL:
//   - window functions (ROW_NUMBER OVER) are supported by both
//   - SUM(CASE WHEN ...) avoids dialect-specific boolean aggregation
//   - `?` placeholders are converted for Postgres by your db.js shim

// Latest prediction per student, for a set of student ids. One query.
const findLatestPredictions = async (studentIds) => {
  if (!studentIds.length) return {};
  const placeholders = studentIds.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT ranked.student_id, ranked.predicted_gpa, ranked.bucket, ranked.at_risk_status
     FROM (
       SELECT p.student_id, p.predicted_gpa, p.bucket, p.at_risk_status,
              ROW_NUMBER() OVER (PARTITION BY p.student_id ORDER BY p.created_at DESC) AS rn
       FROM gpa_predictions p
       WHERE p.student_id IN (${placeholders})
     ) ranked
     WHERE ranked.rn = 1`,
    studentIds
  );

  const byStudent = {};
  rows.forEach((r) => {
    byStudent[r.student_id] = {
      predicted_gpa: r.predicted_gpa,
      bucket: r.bucket,
      at_risk_status: r.at_risk_status,
    };
  });
  return byStudent;
};

// Attendance rate (%) per student for a class. One query.
const findAttendanceRates = async (class_id, studentIds) => {
  if (!studentIds.length) return {};
  const placeholders = studentIds.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT student_id,
            COUNT(*) AS total_sessions,
            SUM(CASE WHEN status IN ('present','late','excused') THEN 1 ELSE 0 END) AS attended_sessions
     FROM attendance
     WHERE class_id = ? AND student_id IN (${placeholders})
     GROUP BY student_id`,
    [class_id, ...studentIds]
  );

  const byStudent = {};
  rows.forEach((r) => {
    const total = Number(r.total_sessions) || 0;
    byStudent[r.student_id] = total
      ? Math.round((Number(r.attended_sessions) / total) * 1000) / 10 // one decimal
      : null;
  });
  return byStudent;
};

module.exports = { findLatestPredictions, findAttendanceRates };
