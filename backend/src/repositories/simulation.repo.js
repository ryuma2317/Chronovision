const db = require('../config/db');
const { randomUUID } = require('crypto');

const create = async ({ student_id, prediction_id, overrides, baseline_gpa, simulated_gpa, course_deltas = null }) => {
  const simulation_id = randomUUID();
  const delta = Math.round((simulated_gpa - baseline_gpa) * 100) / 100;
  const improved = delta > 0;

  await db.query(
    `INSERT INTO whatif_simulations (simulation_id, student_id, prediction_id, overrides, baseline_gpa, simulated_gpa, delta, improved, course_deltas)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [simulation_id, student_id, prediction_id, JSON.stringify(overrides), baseline_gpa, simulated_gpa, delta, improved,
     course_deltas ? JSON.stringify(course_deltas) : null]
  );
  return { simulation_id, student_id, prediction_id, overrides, baseline_gpa, simulated_gpa, delta, improved, course_deltas };
};

const findByStudent = async (student_id) => {
  const [rows] = await db.query(
    `SELECT * FROM whatif_simulations WHERE student_id = ? ORDER BY created_at DESC`,
    [student_id]
  );
  return rows.map((r) => ({ ...r, overrides: typeof r.overrides === 'string' ? JSON.parse(r.overrides) : r.overrides }));
};

module.exports = { create, findByStudent };