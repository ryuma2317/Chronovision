const path = require('path');
const fs = require('fs');
const lessonRepo = require('../repositories/lesson.repo');
const gamificationService = require('../services/gamification.service');

// Maps an uploaded file's extension to the lessons.file_type ENUM
const extToFileType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const map = {
    '.pdf': 'pdf',
    '.mp4': 'video',
    '.mov': 'video',
    '.pptx': 'pptx',
    '.docx': 'docx',
    '.png': 'image',
    '.jpg': 'image',
    '.jpeg': 'image',
  };
  return map[ext] || 'link';
};

// POST /api/teacher/lessons
const uploadLesson = async (req, res, next) => {
  try {
    const { class_id, title, description } = req.body;
    const teacher_id = req.user.user_id;

    if (!class_id || !title) {
      return res.status(400).json({ message: 'class_id and title are required' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'A lesson file is required' });
    }

    const lesson = await lessonRepo.create({
      class_id,
      teacher_id,
      title,
      description,
      file_url: req.file.path,
      file_type: extToFileType(req.file.originalname),
      file_size_bytes: req.file.size,
    });

    res.status(201).json(lesson);
  } catch (err) {
    next(err);
  }
};

// PUT /api/teacher/lessons/:id/publish
const publishLesson = async (req, res, next) => {
  try {
    const { id } = req.params;
    const published = await lessonRepo.publish(id);
    if (!published) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    res.json({ message: 'Lesson published successfully' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/teacher/lessons/:id
const deleteLesson = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lesson = await lessonRepo.findById(id);
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Only the teacher who owns the lesson may delete it.
    if (lesson.teacher_id !== req.user.user_id) {
      return res.status(403).json({ message: 'You can only delete lessons you uploaded' });
    }

    await lessonRepo.remove(id);

    // Best-effort cleanup of the stored file — a missing file must not fail the request.
    if (lesson.file_url) fs.unlink(lesson.file_url, () => {});

    res.json({ message: 'Lesson deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// GET /api/student/lessons
const getLessons = async (req, res, next) => {
  try {
    const { class_id } = req.query;
    if (!class_id) {
      return res.status(400).json({ message: 'class_id query parameter is required' });
    }

    const lessons = await lessonRepo.findByClass(class_id);
    const published = lessons.filter((l) => l.is_published);
    res.json(published);
  } catch (err) {
    next(err);
  }
};

// POST /api/student/lessons/:id/view
const viewLesson = async (req, res, next) => {
  try {
    const { id } = req.params;
    const student_id = req.user.user_id;

    const lesson = await lessonRepo.findById(id);
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    await lessonRepo.markViewed(id, student_id);
    const { points_awarded, new_badges } = await gamificationService.awardPoints(student_id, 'LESSON_VIEWED', { class_id: lesson.class_id });

    res.json({ message: 'Lesson marked as viewed', points_awarded, new_badges });
  } catch (err) {
    next(err);
  }
};

// GET /api/teacher/lessons?class_id=
const getLessonsForTeacher = async (req, res, next) => {
  try {
    const { class_id } = req.query;
    if (!class_id) {
      return res.status(400).json({ message: 'class_id query parameter is required' });
    }
    const lessons = await lessonRepo.findByClass(class_id);
    res.json(lessons);
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadLesson, publishLesson, deleteLesson, getLessons, viewLesson, getLessonsForTeacher };
