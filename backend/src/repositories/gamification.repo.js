const db = require('../config/db');
const { randomUUID } = require('crypto');

const addPoints = async ({ student_id, class_id = null, points, reason }) => {
  const id = randomUUID();
  await db.query(
    `INSERT INTO student_points (id, student_id, class_id, points, reason) VALUES (?, ?, ?, ?, ?)`,
    [id, student_id, class_id, points, reason]
  );
  return id;
};

const getTotalPoints = async (student_id) => {
  const [rows] = await db.query(
    `SELECT COALESCE(SUM(points), 0) AS total_points FROM student_points WHERE student_id = ?`,
    [student_id]
  );
  return Number(rows[0].total_points);
};

const findBadges = async (student_id) => {
  const [rows] = await db.query(
    `SELECT b.* FROM badges b
     INNER JOIN student_badges sb ON b.badge_id = sb.badge_id
     WHERE sb.student_id = ?
     ORDER BY sb.earned_at DESC`,
    [student_id]
  );
  return rows;
};

// Badges the student qualifies for under a given criteria_type but doesn't have yet
const findUnearnedEligibleBadges = async (student_id, criteria_type, currentValue) => {
  const [rows] = await db.query(
    `SELECT b.* FROM badges b
     WHERE b.criteria_type = ? AND b.criteria_value <= ?
       AND b.badge_id NOT IN (
         SELECT badge_id FROM student_badges WHERE student_id = ?
       )`,
    [criteria_type, currentValue, student_id]
  );
  return rows;
};

const awardBadge = async ({ student_id, badge_id }) => {
  const id = randomUUID();
  await db.query(
    `INSERT INTO student_badges (id, student_id, badge_id) VALUES (?, ?, ?)
     ON CONFLICT (student_id, badge_id) DO NOTHING`,
    [id, student_id, badge_id]
  );
};

const getLeaderboard = async (limit = 10) => {
  const [rows] = await db.query(
    `SELECT sp.student_id, u.first_name, u.last_name, SUM(sp.points) AS total_points,
            RANK() OVER (ORDER BY SUM(sp.points) DESC) AS "rank"
     FROM student_points sp
     INNER JOIN users u ON sp.student_id = u.user_id
     GROUP BY sp.student_id, u.first_name, u.last_name
     ORDER BY total_points DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
};

const getPointHistory = async (student_id) => {
  const [rows] = await db.query(
    `SELECT * FROM student_points WHERE student_id = ? ORDER BY earned_at DESC`,
    [student_id]
  );
  return rows;
};

module.exports = {
  addPoints,
  getTotalPoints,
  findBadges,
  findUnearnedEligibleBadges,
  awardBadge,
  getLeaderboard,
  getPointHistory,
};
