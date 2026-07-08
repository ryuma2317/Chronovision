const fs = require('fs');
const quizRepo = require('../repositories/quiz.repo');
const quizService = require('../services/quiz.service');
const attendanceService = require('../services/attendance.service');
const gamificationService = require('../services/gamification.service');

const validateQuestions = (questions) => {
  if (!Array.isArray(questions) || questions.length === 0) return 'questions must be a non-empty array';
  for (const q of questions) {
    if (!q.question_text || !Array.isArray(q.options) || q.options.length < 2) {
      return 'Each question needs question_text and at least 2 options';
    }
    const correctCount = q.options.filter((o) => o.is_correct).length;
    if (correctCount !== 1) {
      return `Question "${q.question_text.slice(0, 40)}..." must have exactly one correct option`;
    }
  }
  return null;
};

// POST /api/teacher/quizzes — manual question creation
const createQuiz = async (req, res, next) => {
  try {
    const { class_id, title, questions, time_limit_minutes, max_attempts } = req.body;
    const teacher_id = req.user.user_id;

    if (!class_id || !title || !questions) {
      return res.status(400).json({ message: 'class_id, title, and questions array are required' });
    }
    const validationError = validateQuestions(questions);
    if (validationError) {
      return res.status(422).json({ message: validationError });
    }

    const quiz = await quizRepo.create({
      class_id, teacher_id, title, questions, quiz_type: 'manual', time_limit_minutes, max_attempts,
    });
    res.status(201).json(quiz);
  } catch (err) {
    next(err);
  }
};

// POST /api/teacher/quizzes/upload — AI-generated from docx/pdf
const uploadQuizFile = async (req, res, next) => {
  try {
    const { class_id, title, time_limit_minutes, question_count, max_attempts } = req.body;
    const teacher_id = req.user.user_id;

    if (!req.file) {
      return res.status(400).json({ message: 'A source file (.pdf or .docx) is required' });
    }
    if (!class_id || !title) {
      return res.status(400).json({ message: 'class_id and title are required' });
    }

    const text = await quizService.extractText(req.file.path);
    const questions = await quizService.generateQuestions(text, Number(question_count) || 10);

    const quiz = await quizRepo.create({
      class_id,
      teacher_id,
      title,
      questions,
      quiz_type: 'ai_generated',
      source_file_url: req.file.path,
      time_limit_minutes,
      max_attempts,
    });

    res.status(201).json(quiz);
  } catch (err) {
    // Clean up the uploaded source file if generation failed partway through
    if (req.file) fs.unlink(req.file.path, () => {});
    next(err);
  }
};

// PUT /api/teacher/quizzes/:id/publish
const publishQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;
    const published = await quizRepo.publish(id);
    if (!published) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    res.json({ message: 'Quiz published successfully' });
  } catch (err) {
    next(err);
  }
};

// GET /api/student/quizzes — list, answers stripped
const getQuizzes = async (req, res, next) => {
  try {
    const { class_id } = req.query;
    if (!class_id) {
      return res.status(400).json({ message: 'class_id query parameter is required' });
    }

    const quizzes = await quizRepo.findByClass(class_id);
    const published = quizzes.filter((q) => q.is_published);
    res.json(published);
  } catch (err) {
    next(err);
  }
};

// POST /api/student/quizzes/:id/start
const startQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;
    const student_id = req.user.user_id;

    const quiz = await quizRepo.findById(id, false);
    if (!quiz || !quiz.is_published) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const now = new Date();
    if (quiz.available_from && now < new Date(quiz.available_from)) {
      return res.status(403).json({ message: 'This quiz is not available yet' });
    }
    if (quiz.available_until && now > new Date(quiz.available_until)) {
      return res.status(403).json({ message: 'This quiz is no longer available' });
    }

    const attemptCount = await quizRepo.countAttemptsByStudent(id, student_id);
    if (attemptCount >= quiz.max_attempts) {
      return res.status(403).json({ message: `You have used all ${quiz.max_attempts} attempt(s) for this quiz` });
    }

    const attempt = await quizRepo.createAttempt({ quiz_id: id, student_id, total_questions: quiz.questions.length });
    res.status(201).json({ ...attempt, questions: quiz.questions, time_limit_minutes: quiz.time_limit_minutes });
  } catch (err) {
    next(err);
  }
};

// POST /api/student/quizzes/:id/submit
// body: { attempt_id, answers: [{ question_id, selected_option_id }, ...] }
const submitQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { attempt_id, answers } = req.body;
    const student_id = req.user.user_id;

    if (!attempt_id || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'attempt_id and an answers array are required' });
    }

    const attempt = await quizRepo.findAttemptById(attempt_id);
    if (!attempt || attempt.student_id !== student_id || attempt.quiz_id !== id) {
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }
    if (attempt.status !== 'in_progress') {
      return res.status(409).json({ message: 'This attempt has already been submitted' });
    }

    // Re-fetch with answers included server-side — never trust a client-sent score
    const quiz = await quizRepo.findById(id, true);
    const { score, correct_answers, gradedAnswers } = quizService.gradeAttempt(quiz, answers);

    await quizRepo.submitAttempt({ attempt_id, gradedAnswers, score, correct_answers });
    await attendanceService.autoMarkPresent({ class_id: quiz.class_id, student_id, quiz_attempt_id: attempt_id });

    const { new_badges } = await gamificationService.awardPoints(student_id, 'QUIZ_COMPLETED', { class_id: quiz.class_id });
    if (score === 100) {
      await gamificationService.awardPoints(student_id, 'QUIZ_PERFECT_SCORE', { class_id: quiz.class_id });
    }

    res.json({ score, correct_answers, total_questions: quiz.questions.length, new_badges, message: 'Quiz submitted successfully' });
  } catch (err) {
    next(err);
  }
};

// GET /api/teacher/quizzes/:id/results
const getResults = async (req, res, next) => {
  try {
    const { id } = req.params;
    const attempts = await quizRepo.findAllAttempts(id);
    res.json(attempts);
  } catch (err) {
    next(err);
  }
};

// GET /api/student/quizzes/:id/answers — only after the student has submitted
const getAnswers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const student_id = req.user.user_id;

    const attempts = await quizRepo.findAttemptsByStudent(id, student_id);
    const submitted = attempts.find((a) => a.status === 'graded');

    if (!submitted) {
      return res.status(403).json({ message: 'You must submit the quiz before viewing the answer sheet' });
    }

    const quiz = await quizRepo.findById(id, true);
    const yourAnswers = await quizRepo.findAttemptAnswers(submitted.attempt_id);

    res.json({
      questions: quiz.questions,
      your_answers: yourAnswers,
      score: submitted.score,
      correct_answers: submitted.correct_answers,
      total_questions: submitted.total_questions,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/teacher/quizzes?class_id=
const getQuizzesForTeacher = async (req, res, next) => {
  try {
    const { class_id } = req.query;
    if (!class_id) {
      return res.status(400).json({ message: 'class_id query parameter is required' });
    }
    const quizzes = await quizRepo.findByClass(class_id);
    res.json(quizzes);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createQuiz,
  uploadQuizFile,
  publishQuiz,
  getQuizzes,
  startQuiz,
  submitQuiz,
  getResults,
  getAnswers,
  getQuizzesForTeacher,
};
