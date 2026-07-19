const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { UPLOAD_DIR } = require('../config/env');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// ── Lesson files storage ──────────────────────────────────────
const lessonStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, 'lessons');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

// ── Quiz source files storage ─────────────────────────────────
const quizStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, 'quizzes');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const lessonFileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.docx', '.pptx', '.mp4', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${ext}`), false);
  }
};

// A "file quiz" paper can be any lesson-like document, same spirit as a lesson.
const quizFileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.docx', '.pptx', '.png', '.jpg', '.jpeg', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed for quiz upload: ${ext}`), false);
  }
};

// ── Student quiz answer files storage (for "file" quizzes) ────
const quizAnswerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, 'quiz-submissions');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const quizAnswerFileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.docx', '.pptx', '.png', '.jpg', '.jpeg', '.txt', '.zip'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error(`Answer file type not allowed: ${ext}`), false);
};

const uploadLesson = multer({
  storage: lessonStorage,
  fileFilter: lessonFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const uploadQuiz = multer({
  storage: quizStorage,
  fileFilter: quizFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

const uploadQuizAnswer = multer({
  storage: quizAnswerStorage,
  fileFilter: quizAnswerFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// ── Roster files (bulk student enrollment) — parsed in memory, not stored ──
const rosterFileFilter = (req, file, cb) => {
  const allowed = ['.csv', '.txt', '.xlsx', '.xls', '.docx', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error(`Roster must be one of: ${allowed.join(', ')}`), false);
};

const uploadRoster = multer({
  storage: multer.memoryStorage(),
  fileFilter: rosterFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = { uploadLesson, uploadQuiz, uploadQuizAnswer, uploadRoster };
