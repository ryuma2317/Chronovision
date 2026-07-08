const attendanceRepo = require('../repositories/attendance.repo');

const VALID_STATUSES = ['present', 'absent', 'late', 'excused'];

// POST /api/teacher/attendance (manual mark)
const markAttendance = async (req, res, next) => {
  try {
    const { class_id, student_id, date, status } = req.body;
    const marked_by = req.user.user_id;

    if (!class_id || !student_id || !date || !status) {
      return res.status(400).json({ message: 'class_id, student_id, date, and status are required' });
    }
    if (!VALID_STATUSES.includes(status)) {
      return res.status(422).json({ message: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    await attendanceRepo.upsert({ class_id, student_id, session_date: date, status, marked_by });
    res.json({ message: 'Attendance marked successfully' });
  } catch (err) {
    next(err);
  }
};

// GET /api/teacher/attendance (by class/date)
const getAttendanceByClass = async (req, res, next) => {
  try {
    const { class_id, date } = req.query;
    if (!class_id) {
      return res.status(400).json({ message: 'class_id query parameter is required' });
    }

    const records = await attendanceRepo.findByClass(class_id, date || null);
    res.json(records);
  } catch (err) {
    next(err);
  }
};

// GET /api/student/attendance (own record)
const getMyAttendance = async (req, res, next) => {
  try {
    const student_id = req.user.user_id;
    const { class_id } = req.query;
    const records = await attendanceRepo.findByStudent(student_id, class_id || null);
    res.json(records);
  } catch (err) {
    next(err);
  }
};

module.exports = { markAttendance, getAttendanceByClass, getMyAttendance };
