const db = require('../config/db');
const { randomUUID } = require('crypto');

const create = async ({ class_id, teacher_id, title, description, file_url, file_type, file_size_bytes }) => {
  const lesson_id = randomUUID();
  await db.query(
    `INSERT INTO lessons (lesson_id, class_id, teacher_id, title, description, file_url, file_type, file_size_bytes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [lesson_id, class_id, teacher_id, title, description, file_url, file_type, file_size_bytes]
  );
  return { lesson_id, class_id, title };
};

const findByClass = async (class_id) => {
  const [rows] = await db.query(
    'SELECT * FROM lessons WHERE class_id = ? ORDER BY created_at DESC',
    [class_id]
  );
  return rows;
};

const findById = async (id) => {
  const [rows] = await db.query('SELECT * FROM lessons WHERE lesson_id = ?', [id]);
  return rows[0] || null;
};

const publish = async (id) => {
  const [result] = await db.query(
    'UPDATE lessons SET is_published = 1 WHERE lesson_id = ?',
    [id]
  );
  return result.affectedRows > 0;
};

const markViewed = async (lesson_id, student_id, completed = true) => {
  const view_id = randomUUID();
  await db.query(
    `INSERT INTO lesson_views (view_id, lesson_id, student_id, completed) VALUES (?, ?, ?, ?)
     ON CONFLICT (lesson_id, student_id)
     DO UPDATE SET completed = EXCLUDED.completed, viewed_at = CURRENT_TIMESTAMP`,
    [view_id, lesson_id, student_id, completed]
  );
};

const findViewsByLesson = async (lesson_id) => {
  const [rows] = await db.query(
    'SELECT * FROM lesson_views WHERE lesson_id = ?',
    [lesson_id]
  );
  return rows;
};

module.exports = { create, findByClass, findById, publish, markViewed, findViewsByLesson };
