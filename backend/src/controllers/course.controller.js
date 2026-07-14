const courseRepo = require('../repositories/course.repo');
const classRepo = require('../repositories/class.repo');
const classService = require('../services/class.service');

// Admin-only writes. Reads are open to any member of the class — which is the
// access rule you asked for: a student or teacher can see a class's courses
// only because the admin put them in that class.

const parseIntInRange = (value, lo, hi) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= lo && n <= hi ? n : null;
};

// ── ADMIN ────────────────────────────────────────────────────────────────────

// POST /api/admin/classes/:id/courses
// body: { course_name, course_code?, credits, difficulty_level }
const createCourse = async (req, res, next) => {
  try {
    const { id: class_id } = req.params;
    const { course_name, course_code, credits, difficulty_level } = req.body;

    const cls = await classRepo.findById(class_id);
    if (!cls) return res.status(404).json({ message: 'Class not found' });

    if (!course_name || !course_name.trim()) {
      return res.status(400).json({ message: 'course_name is required' });
    }

    const cr = parseIntInRange(credits ?? 3, 1, 6);
    if (cr === null) {
      return res.status(422).json({ message: 'credits must be a whole number between 1 and 6' });
    }

    const dl = parseIntInRange(difficulty_level ?? 3, 1, 5);
    if (dl === null) {
      return res.status(422).json({
        message: 'difficulty_level must be a whole number between 1 (easy) and 5 (hardest)',
      });
    }

    const course = await courseRepo.create({
      class_id,
      course_name: course_name.trim(),
      course_code,
      credits: cr,
      difficulty_level: dl,
      created_by: req.user.user_id,
    });

    res.status(201).json(course);
  } catch (err) {
    // uq_course_per_class
    if (err.code === '23505') {
      return res.status(409).json({ message: 'This class already has a course with that name' });
    }
    next(err);
  }
};

// PUT /api/admin/courses/:courseId
const updateCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const existing = await courseRepo.findById(courseId);
    if (!existing) return res.status(404).json({ message: 'Course not found' });

    const course_name = (req.body.course_name ?? existing.course_name).trim();
    const course_code = req.body.course_code ?? existing.course_code;

    const cr = parseIntInRange(req.body.credits ?? existing.credits, 1, 6);
    if (cr === null) {
      return res.status(422).json({ message: 'credits must be a whole number between 1 and 6' });
    }
    const dl = parseIntInRange(req.body.difficulty_level ?? existing.difficulty_level, 1, 5);
    if (dl === null) {
      return res.status(422).json({ message: 'difficulty_level must be between 1 and 5' });
    }
    const is_active = req.body.is_active ?? existing.is_active;

    await courseRepo.update(courseId, {
      course_name, course_code, credits: cr, difficulty_level: dl, is_active,
    });

    // Past predictions snapshotted the old values, so history is untouched.
    res.json({ message: 'Course updated. Future predictions use the new credits/difficulty.' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'This class already has a course with that name' });
    }
    next(err);
  }
};

// DELETE /api/admin/courses/:courseId  (soft delete by default)
const deleteCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const hard = req.query.hard === 'true';

    const ok = hard
      ? await courseRepo.remove(courseId)
      : await courseRepo.deactivate(courseId);

    if (!ok) return res.status(404).json({ message: 'Course not found' });
    res.json({
      message: hard
        ? 'Course deleted.'
        : 'Course deactivated. It no longer appears to students, and past predictions are preserved.',
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/classes/:id/courses  — admin sees inactive ones too
const getCoursesForAdmin = async (req, res, next) => {
  try {
    const { id: class_id } = req.params;
    const cls = await classRepo.findById(class_id);
    if (!cls) return res.status(404).json({ message: 'Class not found' });

    const courses = await courseRepo.findByClass(class_id, { activeOnly: false });
    res.json({ class: cls, courses });
  } catch (err) {
    next(err);
  }
};

// ── MEMBERS (student / teacher) ──────────────────────────────────────────────

// GET /api/student/classes/:id/courses   (also mounted for teacher)
// The gate you asked for: you get the courses ONLY if the admin put you in the
// class. Not a member -> 403, no course list, nothing to predict on.
const getCoursesForMember = async (req, res, next) => {
  try {
    const { id: class_id } = req.params;
    const cls = await classRepo.findById(class_id);
    if (!cls) return res.status(404).json({ message: 'Class not found' });

    await classService.validateMembership(class_id, req.user.user_id); // throws 403

    const courses = await courseRepo.findByClass(class_id, { activeOnly: true });
    res.json({ class: cls, courses });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCourse,
  updateCourse,
  deleteCourse,
  getCoursesForAdmin,
  getCoursesForMember,
};