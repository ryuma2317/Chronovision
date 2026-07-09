const db = require('../config/db');
const { randomUUID } = require('crypto');

const create = async ({ student_id, prediction_id, iq_result_id, target_gpa, total_study_hours_per_week, free_time_hours_per_week, status = 'draft' }) => {
  const plan_id = randomUUID();
  await db.query(
    `INSERT INTO study_plans (plan_id, student_id, prediction_id, iq_result_id, target_gpa, total_study_hours_per_week, free_time_hours_per_week, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [plan_id, student_id, prediction_id, iq_result_id, target_gpa, total_study_hours_per_week, free_time_hours_per_week, status]
  );
  return plan_id;
};

const addSubjects = async (plan_id, subjects) => {
  if (!subjects.length) return;
  const values = subjects.map((s) => [randomUUID(), plan_id, s.subject, s.hours_per_week, s.priority, s.reason || null]);
  await db.query(
    `INSERT INTO study_plan_subjects (id, plan_id, subject_name, hours_per_week, priority, reason) VALUES ?`,
    [values]
  );
};

const addScheduleEntries = async (plan_id, schedule) => {
  if (!schedule.length) return;
  const values = schedule.map((s) => [
    randomUUID(), plan_id, s.day, s.start, s.end, s.activity_type || 'study', s.subject || null, s.notes || null,
  ]);
  await db.query(
    `INSERT INTO study_plan_schedule (schedule_id, plan_id, day_of_week, start_time, end_time, activity_type, subject_name, notes) VALUES ?`,
    [values]
  );
};

const updateStatus = async (plan_id, status) => {
  const [result] = await db.query(`UPDATE study_plans SET status = ? WHERE plan_id = ?`, [status, plan_id]);
  return result.affectedRows > 0;
};

const setHours = async (plan_id, { total_study_hours_per_week, free_time_hours_per_week }) => {
  await db.query(
    `UPDATE study_plans SET total_study_hours_per_week = ?, free_time_hours_per_week = ? WHERE plan_id = ?`,
    [total_study_hours_per_week, free_time_hours_per_week, plan_id]
  );
};

const getSubjects = async (plan_id) => {
  const [rows] = await db.query(`SELECT * FROM study_plan_subjects WHERE plan_id = ?`, [plan_id]);
  return rows;
};

const getSchedule = async (plan_id) => {
  const [rows] = await db.query(
    `SELECT * FROM study_plan_schedule WHERE plan_id = ? ORDER BY
       array_position(ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']::text[], day_of_week::text), start_time`,
    [plan_id]
  );
  return rows;
};

const clearSchedule = async (plan_id) => {
  await db.query(`DELETE FROM study_plan_schedule WHERE plan_id = ?`, [plan_id]);
};

const findById = async (plan_id) => {
  const [rows] = await db.query(`SELECT * FROM study_plans WHERE plan_id = ?`, [plan_id]);
  if (!rows[0]) return null;
  const subjects = await getSubjects(plan_id);
  const schedule = await getSchedule(plan_id);
  return { ...rows[0], subjects, schedule };
};

const findLatestByStudent = async (student_id) => {
  const [rows] = await db.query(
    `SELECT * FROM study_plans WHERE student_id = ? ORDER BY created_at DESC LIMIT 1`,
    [student_id]
  );
  if (!rows[0]) return null;
  const subjects = await getSubjects(rows[0].plan_id);
  const schedule = await getSchedule(rows[0].plan_id);
  return { ...rows[0], subjects, schedule };
};

module.exports = {
  create, addSubjects, addScheduleEntries, updateStatus, setHours,
  getSubjects, getSchedule, clearSchedule, findById, findLatestByStudent,
};
