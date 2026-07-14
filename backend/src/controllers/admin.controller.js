const userRepo = require('../repositories/user.repo');
const classRepo = require('../repositories/class.repo');
const authService = require('../services/auth.service');

// ── Users ────────────────────────────────────────────────────

// POST /api/admin/users
const createUser = async (req, res, next) => {
  try {
    const { first_name, last_name, email, password, role } = req.body;
    if (!first_name || !last_name || !email || !password || !role) {
      return res.status(400).json({ message: 'first_name, last_name, email, password, and role are required' });
    }
    if (!['admin', 'teacher', 'student'].includes(role)) {
      return res.status(422).json({ message: 'role must be one of: admin, teacher, student' });
    }

    const existing = await userRepo.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'A user with this email already exists' });
    }

    const password_hash = await authService.hashPassword(password);
    const user = await userRepo.create({ first_name, last_name, email, password_hash, role });

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    const users = role ? await userRepo.findByRole(role) : await userRepo.findAll();
    res.json(users);
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/users/:id
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, role, is_active, password } = req.body;

    const fields = { first_name, last_name, email, role, is_active };
    if (password) {
      fields.password_hash = await authService.hashPassword(password);
    }

    const updated = await userRepo.update(id, fields);
    if (!updated) {
      return res.status(404).json({ message: 'User not found, or no valid fields provided' });
    }

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/users/:id  (soft delete — deactivate, never hard-delete a user)
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deactivated = await userRepo.deactivate(id);
    if (!deactivated) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deactivated successfully' });
  } catch (err) {
    next(err);
  }
};

// ── Classes ──────────────────────────────────────────────────

// `semester` is a SMALLINT with CHECK (semester BETWEEN 1 AND 8) in the schema,
// so anything non-numeric ("Fall") makes Postgres throw and surfaces as a 500.
// Validate here and return a message the user can act on.
const parseSemester = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 8 ? n : null;
};

// POST /api/admin/classes
const createClass = async (req, res, next) => {
  try {
    const { class_name, description, academic_year, semester } = req.body;
    const created_by = req.user.user_id;

    if (!class_name || !academic_year || semester === undefined || semester === '') {
      return res.status(400).json({ message: 'class_name, academic_year, and semester are required' });
    }

    const semesterNum = parseSemester(semester);
    if (semesterNum === null) {
      return res.status(422).json({ message: 'Semester must be a whole number between 1 and 8.' });
    }

    const newClass = await classRepo.create({
      class_name, description, academic_year, semester: semesterNum, created_by,
    });
    res.status(201).json(newClass);
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/classes
const getClasses = async (req, res, next) => {
  try {
    const classes = await classRepo.findAll();
    res.json(classes);
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/classes/:id
const updateClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await classRepo.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const {
      class_name = existing.class_name,
      description = existing.description,
      academic_year = existing.academic_year,
      semester = existing.semester,
    } = req.body;

    const semesterNum = parseSemester(semester);
    if (semesterNum === null) {
      return res.status(422).json({ message: 'Semester must be a whole number between 1 and 8.' });
    }

    await classRepo.update(id, { class_name, description, academic_year, semester: semesterNum });
    res.json({ message: 'Class updated successfully' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/classes/:id
const deleteClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await classRepo.remove(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.json({ message: 'Class deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/classes/:id/teachers
const addTeacherToClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { teacher_id } = req.body;
    if (!teacher_id) {
      return res.status(400).json({ message: 'teacher_id is required' });
    }

    const teacher = await userRepo.findById(teacher_id);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(422).json({ message: 'teacher_id must reference an existing user with role=teacher' });
    }

    await classRepo.addTeacher(id, teacher_id);
    res.status(201).json({ message: 'Teacher added to class' });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/classes/:id/students
const addStudentToClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { student_id } = req.body;
    if (!student_id) {
      return res.status(400).json({ message: 'student_id is required' });
    }

    const student = await userRepo.findById(student_id);
    if (!student || student.role !== 'student') {
      return res.status(422).json({ message: 'student_id must reference an existing user with role=student' });
    }

    await classRepo.addStudent(id, student_id);
    res.status(201).json({ message: 'Student added to class' });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const users = await userRepo.findAll();
    const classes = await classRepo.findAll();

    const stats = {
      total_users: users.length,
      total_students: users.filter((u) => u.role === 'student').length,
      total_teachers: users.filter((u) => u.role === 'teacher').length,
      total_classes: classes.length,
      active_users: users.filter((u) => u.is_active).length,
    };

    res.json(stats);
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/classes/:id/members
const getClassMembers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cls = await classRepo.findById(id);
    if (!cls) {
      return res.status(404).json({ message: 'Class not found' });
    }
    const members = await classRepo.getMembers(id);
    res.json({ class: cls, members });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  createClass,
  getClasses,
  updateClass,
  deleteClass,
  addTeacherToClass,
  addStudentToClass,
  getClassMembers,
  getDashboard,
};