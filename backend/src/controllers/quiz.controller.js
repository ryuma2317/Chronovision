const fs = require('fs');
const jobQueue = require('../lib/jobQueue');
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

// POST /api/teacher/quizzes/upload — "upload a file as a quiz", like a lesson.
// The uploaded file IS the quiz paper. There are no auto-generated questions and
// no auto-scoring: students answer by uploading their own file, and the teacher
// reviews those submissions manually.
const uploadQuizFile = async (req, res, next) => {
  try {
    const { class_id, title, time_limit_minutes, max_attempts } = req.body;
    const teacher_id = req.user.user_id;

    if (!req.file) {
      return res.status(400).json({ message: 'A quiz file is required' });
    }
    if (!class_id || !title) {
      return res.status(400).json({ message: 'class_id and title are required' });
    }

    const quiz = await quizRepo.create({
      class_id,
      teacher_id,
      title,
      questions: [],                 // a file quiz carries no structured questions
      quiz_type: 'file',
      source_file_url: req.file.path,
      time_limit_minutes,
      max_attempts,
    });

    res.status(201).json({ ...quiz, quiz_type: 'file', source_file_url: req.file.path });
  } catch (err) {
    // Clean up the uploaded file if persisting the quiz failed partway through
    if (req.file) fs.unlink(req.file.path, () => {});
    next(err);
  }
};

// DELETE /api/teacher/quizzes/:id
const deleteQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quiz = await quizRepo.findById(id, false);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    if (quiz.teacher_id !== req.user.user_id) {
      return res.status(403).json({ message: 'You can only delete quizzes you created' });
    }

    // Once a student has actually submitted (not just opened) the quiz, it's
    // locked so their results aren't silently erased.
    const submitted = await quizRepo.countSubmittedAttempts(id);
    if (submitted > 0) {
      return res.status(409).json({
        message: 'A student has already submitted an answer to this quiz, so it can no longer be deleted. This protects their existing results.',
      });
    }

    await quizRepo.remove(id);
    if (quiz.source_file_url) fs.unlink(quiz.source_file_url, () => {});

    res.json({ message: 'Quiz deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/teacher/quizzes/:id — modify a quiz's title (and, for manual
// quizzes, its questions; for file quizzes, optionally the uploaded file).
// Only allowed before anyone has actually submitted an answer, so past
// results stay meaningful. Accepts either a JSON body (manual quiz) or a
// multipart body with an optional `file` field (file quiz).
const updateQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, questions } = req.body;

    const quiz = await quizRepo.findById(id, false);
    if (!quiz) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: 'Quiz not found' });
    }
    if (quiz.teacher_id !== req.user.user_id) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(403).json({ message: 'You can only modify quizzes you created' });
    }

    const submitted = await quizRepo.countSubmittedAttempts(id);
    if (submitted > 0) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(409).json({
        message: 'A student has already submitted an answer to this quiz, so it can no longer be edited. Create a new quiz instead.',
      });
    }

    if (quiz.quiz_type === 'file') {
      const oldFileUrl = quiz.source_file_url;
      await quizRepo.updateFileQuiz(id, {
        title,
        source_file_url: req.file ? req.file.path : undefined,
      });
      // Only remove the old file once the new one is safely recorded, and
      // only if it was actually replaced.
      if (req.file && oldFileUrl) fs.unlink(oldFileUrl, () => {});
      return res.json({ message: 'Quiz updated successfully' });
    }

    if (questions !== undefined) {
      const validationError = validateQuestions(questions);
      if (validationError) {
        return res.status(422).json({ message: validationError });
      }
    }

    await quizRepo.update(id, { title, questions });
    res.json({ message: 'Quiz updated successfully' });
  } catch (err) {
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

    // For a file quiz, opening it shouldn't consume the student's only attempt.
    // Resume an existing in-progress attempt instead of creating a new one.
    if (quiz.quiz_type === 'file') {
      const existing = await quizRepo.findAttemptsByStudent(id, student_id);
      const inProgress = existing.find((a) => a.status === 'in_progress');
      if (inProgress) {
        return res.status(200).json({
          ...inProgress,
          questions: quiz.questions,
          quiz_type: quiz.quiz_type,
          title: quiz.title,
          source_file_url: quiz.source_file_url,
          time_limit_minutes: quiz.time_limit_minutes,
        });
      }
    }

    const attemptCount = await quizRepo.countAttemptsByStudent(id, student_id);
    if (attemptCount >= quiz.max_attempts) {
      return res.status(403).json({ message: `You have used all ${quiz.max_attempts} attempt(s) for this quiz` });
    }

    const attempt = await quizRepo.createAttempt({ quiz_id: id, student_id, total_questions: quiz.questions.length });
    res.status(201).json({
      ...attempt,
      questions: quiz.questions,
      quiz_type: quiz.quiz_type,
      title: quiz.title,
      source_file_url: quiz.source_file_url,
      time_limit_minutes: quiz.time_limit_minutes,
    });
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

    // Attendance marking is a side-effect the student doesn't need to wait for.
    jobQueue.enqueue('quiz-attendance', async () => {
      await attendanceService.autoMarkPresent({
        class_id: quiz.class_id, student_id, quiz_attempt_id: attempt_id,
      });
    });

    // Points/badges: kept awaited because new_badges goes back in the response.
    const { new_badges } = await gamificationService.awardPoints(student_id, 'QUIZ_COMPLETED', { class_id: quiz.class_id });
    if (score === 100) {
      await gamificationService.awardPoints(student_id, 'QUIZ_PERFECT_SCORE', { class_id: quiz.class_id });
    }

    res.json({ score, correct_answers, total_questions: quiz.questions.length, new_badges, message: 'Quiz submitted successfully' });
  } catch (err) {
    next(err);
  }
};

// POST /api/student/quizzes/:id/submit-file  (multipart: file)
// For "file" quizzes only — the student uploads their answer file. The attempt
// is marked 'submitted' but left ungraded (score stays NULL); the teacher grades
// it manually by reviewing the file.
const submitFileQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { attempt_id } = req.body;
    const student_id = req.user.user_id;

    if (!req.file) {
      return res.status(400).json({ message: 'An answer file is required' });
    }
    if (!attempt_id) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: 'attempt_id is required' });
    }

    const attempt = await quizRepo.findAttemptById(attempt_id);
    if (!attempt || attempt.student_id !== student_id || attempt.quiz_id !== id) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }
    if (attempt.status !== 'in_progress') {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(409).json({ message: 'This attempt has already been submitted' });
    }

    await quizRepo.submitFileAttempt({
      attempt_id,
      submission_file_url: req.file.path,
      submission_file_name: req.file.originalname,
    });

    const quiz = await quizRepo.findById(id, false);

    // Attendance + participation points, same as an MCQ submission.
    jobQueue.enqueue('quiz-attendance', async () => {
      await attendanceService.autoMarkPresent({
        class_id: quiz.class_id, student_id, quiz_attempt_id: attempt_id,
      });
    });
    const { new_badges } = await gamificationService.awardPoints(student_id, 'QUIZ_COMPLETED', { class_id: quiz.class_id });

    res.json({ message: 'Your file was submitted. Your teacher will review it.', new_badges });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    next(err);
  }
};

// GET /api/teacher/quizzes/:id/results
const getResults = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quiz = await quizRepo.findById(id, false);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    const attempts = await quizRepo.findAllAttempts(id);
    res.json({ quiz_type: quiz.quiz_type, title: quiz.title, attempts });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/teacher/quizzes/:id/attempts/:attemptId/grade
// body: { graded: true | false } — a simple toggle for file-submission
// quizzes. There's no score to enter; the teacher reviews the file elsewhere
// and just flips this once they're done.
const setAttemptGraded = async (req, res, next) => {
  try {
    const { id, attemptId } = req.params;
    const { graded } = req.body;

    const quiz = await quizRepo.findById(id, false);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    if (quiz.teacher_id !== req.user.user_id) {
      return res.status(403).json({ message: 'You can only grade quizzes you created' });
    }
    if (quiz.quiz_type !== 'file') {
      return res.status(422).json({ message: 'Only file-submission quizzes can be graded this way' });
    }

    const attempt = await quizRepo.findAttemptById(attemptId);
    if (!attempt || attempt.quiz_id !== id) {
      return res.status(404).json({ message: 'Attempt not found' });
    }
    if (attempt.status === 'in_progress') {
      return res.status(409).json({ message: 'This student has not submitted a file yet' });
    }

    await quizRepo.setAttemptGraded(attemptId, !!graded);
    res.json({ message: graded ? 'Marked as graded' : 'Marked as not graded' });
  } catch (err) {
    next(err);
  }
};

// GET /api/teacher/quizzes/:id/attempts/:attemptId/answers
// Full per-question breakdown for one student's attempt: what they chose, what
// was correct, and whether they got it right — so the teacher sees mistakes, not
// just the overall score.
const getAttemptReview = async (req, res, next) => {
  try {
    const { id, attemptId } = req.params;

    const attempt = await quizRepo.findAttemptById(attemptId);
    if (!attempt || attempt.quiz_id !== id) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    const quiz = await quizRepo.findById(id, true); // include correct answers
    const raw = await quizRepo.findAttemptAnswersRaw(attemptId);
    const chosen = {};
    raw.forEach((r) => { chosen[r.question_id] = r; });

    const questions = quiz.questions.map((q) => {
      const mine = chosen[q.question_id];
      const correctOption = q.options.find((o) => o.is_correct);
      return {
        question_id: q.question_id,
        question_text: q.question_text,
        explanation: q.explanation,
        options: q.options,
        selected_option_id: mine ? mine.selected_option_id : null,
        correct_option_id: correctOption ? correctOption.option_id : null,
        is_correct: mine ? !!mine.is_correct : false,
      };
    });

    res.json({
      attempt_id: attemptId,
      score: attempt.score,
      correct_answers: attempt.correct_answers,
      total_questions: attempt.total_questions,
      status: attempt.status,
      questions,
    });
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

// GET /api/teacher/quizzes/:id  — full quiz incl. questions/answers, for editing
const getQuizForTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quiz = await quizRepo.findById(id, true);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    res.json(quiz);
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
  updateQuiz,
  deleteQuiz,
  publishQuiz,
  getQuizzes,
  startQuiz,
  submitQuiz,
  submitFileQuiz,
  getResults,
  getAttemptReview,
  setAttemptGraded,
  getQuizForTeacher,
  getAnswers,
  getQuizzesForTeacher,
};