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

const quizFileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only .pdf and .docx files are allowed for quiz upload'), false);
  }
};

const uploadLesson = multer({
  storage: lessonStorage,
  fileFilter: lessonFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const uploadQuiz = multer({
  storage: quizStorage,
  fileFilter: quizFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

module.exports = { uploadLesson, uploadQuiz };
