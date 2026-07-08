const db = require('../config/db');
const { randomUUID } = require('crypto');

const create = async ({ class_name, description, academic_year, semester, created_by }) => {
  const class_id = randomUUID();
  await db.query(
    `INSERT INTO classes (class_id, created_by, class_name, description, academic_year, semester)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [class_id, created_by, class_name, description, academic_year, semester]
  );
  return { class_id, class_name, description, academic_year, semester, created_by };
};

const findById = async (id) => {
  const [rows] = await db.query('SELECT * FROM classes WHERE class_id = ?', [id]);
  return rows[0] || null;
};

const findAll = async () => {
  const [rows] = await db.query('SELECT * FROM classes');
  return rows;
};

const findByTeacher = async (teacher_id) => {
  const [rows] = await db.query(
    `SELECT c.* FROM classes c
     INNER JOIN class_teachers ct ON c.class_id = ct.class_id
     WHERE ct.teacher_id = ?`,
    [teacher_id]
  );
  return rows;
};

const findByStudent = async (student_id) => {
  const [rows] = await db.query(
    `SELECT c.* FROM classes c
     INNER JOIN class_students cs ON c.class_id = cs.class_id
     WHERE cs.student_id = ?`,
    [student_id]
  );
  return rows;
};

const addTeacher = async (class_id, teacher_id) => {
  const id = randomUUID();
  await db.query(
    `INSERT INTO class_teachers (id, class_id, teacher_id) VALUES (?, ?, ?)`,
    [id, class_id, teacher_id]
  );
  return id;
};

const addStudent = async (class_id, student_id) => {
  const id = randomUUID();
  await db.query(
    `INSERT INTO class_students (id, class_id, student_id) VALUES (?, ?, ?)`,
    [id, class_id, student_id]
  );
  return id;
};

const getTeachers = async (class_id) => {
  const [rows] = await db.query(
    `SELECT u.user_id, u.first_name, u.last_name, u.email
     FROM users u
     INNER JOIN class_teachers ct ON u.user_id = ct.teacher_id
     WHERE ct.class_id = ?`,
    [class_id]
  );
  return rows;
};

const getStudents = async (class_id) => {
  const [rows] = await db.query(
    `SELECT u.user_id, u.first_name, u.last_name, u.email
     FROM users u
     INNER JOIN class_students cs ON u.user_id = cs.student_id
     WHERE cs.class_id = ?`,
    [class_id]
  );
  return rows;
};

const getMembers = async (class_id) => {
  const teachers = await getTeachers(class_id);
  const students = await getStudents(class_id);
  return [
    ...teachers.map((t) => ({ ...t, role: 'teacher' })),
    ...students.map((s) => ({ ...s, role: 'student' })),
  ];
};

const update = async (id, { class_name, description, academic_year, semester }) => {
  const [result] = await db.query(
    `UPDATE classes SET class_name = ?, description = ?, academic_year = ?, semester = ?
     WHERE class_id = ?`,
    [class_name, description, academic_year, semester, id]
  );
  return result.affectedRows > 0;
};

const remove = async (id) => {
  const [result] = await db.query('DELETE FROM classes WHERE class_id = ?', [id]);
  return result.affectedRows > 0;
};

const isTeacherOfStudent = async (teacher_id, student_id) => {
  const [rows] = await db.query(
    `SELECT 1 FROM class_teachers ct
     INNER JOIN class_students cs ON ct.class_id = cs.class_id
     WHERE ct.teacher_id = ? AND cs.student_id = ? LIMIT 1`,
    [teacher_id, student_id]
  );
  return rows.length > 0;
};

module.exports = {
  create,
  findById,
  findAll,
  findByTeacher,
  findByStudent,
  addTeacher,
  addStudent,
  getTeachers,
  getStudents,
  getMembers,
  update,
  remove,
  isTeacherOfStudent,
};
