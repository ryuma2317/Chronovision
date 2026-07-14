const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkRole = require('../middleware/role');

const simulationController = require('../controllers/simulation.controller');
const iqtestController = require('../controllers/iqtest.controller');
const studyplanController = require('../controllers/studyplan.controller');
const lessonController = require('../controllers/lesson.controller');
const quizController = require('../controllers/quiz.controller');
const attendanceController = require('../controllers/attendance.controller');
const gamificationController = require('../controllers/gamification.controller');
const coursePredictionController = require('../controllers/coursePrediction.controller');

// Every course from every class the admin enrolled this student in.
router.get('/courses', auth, checkRole('student'), coursePredictionController.getMyCourses);
router.post('/prediction/courses', auth, checkRole('student'), coursePredictionController.submitCoursePrediction);
router.get('/prediction/:id/courses', auth, coursePredictionController.getCourseBreakdown);

// All routes below require authentication + student role
router.use(auth, checkRole('student'));

/**
 * @swagger
 * /api/student/classes:
 *   get:
 *     summary: Get the classes the logged-in student is enrolled in
 *     tags: [Student]
 *     responses:
 *       200: { description: List of classes }
 */
router.get('/classes', async (req, res, next) => {
  try {
    const classRepo = require('../repositories/class.repo');
    const classes = await classRepo.findByStudent(req.user.user_id);
    res.json(classes);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/student/prediction:
 *   post:
 *     summary: Submit academic features for a class to get a GPA prediction
 *     tags: [Student]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [class_id, features]
 *             properties:
 *               class_id: { type: string }
 *               features: { type: object }
 *     responses:
 *       201: { description: Prediction saved }
 */


/**
 * @swagger
 * /api/student/prediction/history:
 *   get:
 *     summary: Get the student's prediction history
 *     tags: [Student]
 *     responses:
 *       200: { description: List of past predictions }
 */

/**
 * @swagger
 * /api/student/prediction/peer-comparison:
 *   get:
 *     summary: Compare your latest predicted GPA against your classmates
 *     tags: [Student]
 *     parameters:
 *       - in: query
 *         name: class_id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Class average, your GPA, and your percentile }
 */


/**
 * @swagger
 * /api/student/iq/questions:
 *   get:
 *     summary: Get the active aptitude/IQ test questions (no answers included)
 *     tags: [Student]
 *     responses:
 *       200: { description: List of questions with options }
 */
router.get('/iq/questions', iqtestController.getQuestions);

/**
 * @swagger
 * /api/student/iq/submit:
 *   post:
 *     summary: Submit aptitude/IQ test answers — graded server-side against the answer key
 *     tags: [Student]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [answers]
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     question_id: { type: string }
 *                     selected_option_id: { type: string }
 *               time_taken_seconds: { type: integer }
 *     responses:
 *       201: { description: IQ test result with estimate, percentile, score }
 */
router.post('/iq/submit', iqtestController.submitIqTest);

/**
 * @swagger
 * /api/student/iq/latest:
 *   get:
 *     summary: Get the student's most recent IQ test result
 *     tags: [Student]
 *     responses:
 *       200: { description: Latest IQ test result }
 *       404: { description: No IQ test result found }
 */
router.get('/iq/latest', iqtestController.getLatestResult);

/**
 * @swagger
 * /api/student/studyplan/auto:
 *   post:
 *     summary: Stage 1 — get a suggested weekly subject-hour allocation toward a target GPA (default 3.5)
 *     tags: [Student]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               target_gpa: { type: number }
 *     responses:
 *       201: { description: Suggested subjects + hours, saved as a draft plan }
 *       404: { description: Submit a prediction and take the IQ test first }
 */
router.post('/studyplan/auto', studyplanController.generateAutoPlan);

/**
 * @swagger
 * /api/student/studyplan/schedule:
 *   post:
 *     summary: Stage 2 — confirm subject hours + free-time slots and generate the weekly calendar
 *     tags: [Student]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subjects, freeSlots]
 *             properties:
 *               plan_id: { type: string, description: "Optional — reuse a draft plan from /studyplan/auto" }
 *               subjects:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     subject: { type: string }
 *                     hours_per_week: { type: number }
 *                     priority: { type: string, enum: [high, medium, low] }
 *               freeSlots:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day: { type: string }
 *                     start: { type: string }
 *                     end: { type: string }
 *               sessionLengthMinutes: { type: integer }
 *     responses:
 *       201: { description: Weekly schedule generated }
 *       422: { description: Free time is insufficient to cover the requested study hours }
 */
router.post('/studyplan/schedule', studyplanController.confirmSchedule);

/**
 * @swagger
 * /api/student/studyplan/latest:
 *   get:
 *     summary: Get the student's most recent study plan (subjects + schedule)
 *     tags: [Student]
 *     responses:
 *       200: { description: Latest study plan }
 *       404: { description: No study plan found }
 */
router.get('/studyplan/latest', studyplanController.getLatestStudyPlan);

/**
 * @swagger
 * /api/student/whatif:
 *   post:
 *     summary: Run a what-if simulation against the latest baseline prediction
 *     tags: [Student]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [overrides]
 *             properties:
 *               overrides: { type: object }
 *     responses:
 *       201: { description: Simulation result }
 *       404: { description: No baseline prediction found }
 */
router.post('/whatif', simulationController.runWhatIf);

/**
 * @swagger
 * /api/student/whatif/history:
 *   get:
 *     summary: Get the student's past what-if simulations
 *     tags: [Student]
 *     responses:
 *       200: { description: List of simulations }
 */
router.get('/whatif/history', simulationController.getHistory);

/**
 * @swagger
 * /api/student/lessons:
 *   get:
 *     summary: Get published lessons for a class
 *     tags: [Student]
 *     parameters:
 *       - in: query
 *         name: class_id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of lessons }
 */
router.get('/lessons', lessonController.getLessons);

/**
 * @swagger
 * /api/student/lessons/{id}/view:
 *   post:
 *     summary: Mark a lesson as viewed (awards points)
 *     tags: [Student]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Lesson marked as viewed }
 */
router.post('/lessons/:id/view', lessonController.viewLesson);

/**
 * @swagger
 * /api/student/quizzes:
 *   get:
 *     summary: Get published quizzes for a class (answers hidden)
 *     tags: [Student]
 *     parameters:
 *       - in: query
 *         name: class_id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of quizzes }
 */
router.get('/quizzes', quizController.getQuizzes);

/**
 * @swagger
 * /api/student/quizzes/{id}/start:
 *   post:
 *     summary: Start a quiz attempt (enforces max_attempts and availability window)
 *     tags: [Student]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201: { description: Attempt created, questions returned without answers }
 */
router.post('/quizzes/:id/start', quizController.startQuiz);

/**
 * @swagger
 * /api/student/quizzes/{id}/submit:
 *   post:
 *     summary: Submit answers for a quiz attempt (auto-grades server-side, marks attendance, awards points)
 *     tags: [Student]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [attempt_id, answers]
 *             properties:
 *               attempt_id: { type: string }
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     question_id: { type: string }
 *                     selected_option_id: { type: string }
 *     responses:
 *       200: { description: Quiz graded and submitted }
 */
router.post('/quizzes/:id/submit', quizController.submitQuiz);

/**
 * @swagger
 * /api/student/quizzes/{id}/answers:
 *   get:
 *     summary: Get the answer sheet for a quiz after submission
 *     tags: [Student]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Quiz answer sheet with explanations }
 *       403: { description: Must submit the quiz before viewing answers }
 */
router.get('/quizzes/:id/answers', quizController.getAnswers);

/**
 * @swagger
 * /api/student/attendance:
 *   get:
 *     summary: Get the student's own attendance record
 *     tags: [Student]
 *     responses:
 *       200: { description: Attendance records }
 */
router.get('/attendance', attendanceController.getMyAttendance);

/**
 * @swagger
 * /api/student/leaderboard:
 *   get:
 *     summary: Get the points leaderboard
 *     tags: [Student]
 *     parameters:
 *       - in: query
 *         name: limit
 *         required: false
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Leaderboard rankings }
 */
router.get('/leaderboard', gamificationController.getLeaderboard);

/**
 * @swagger
 * /api/student/badges:
 *   get:
 *     summary: Get the student's point total and earned badges
 *     tags: [Student]
 *     responses:
 *       200: { description: Gamification profile }
 */
router.get('/badges', gamificationController.getBadges);

/**
 * @swagger
 * /api/student/points/history:
 *   get:
 *     summary: Get the student's point history log
 *     tags: [Student]
 *     responses:
 *       200: { description: Point history }
 */
router.get('/points/history', gamificationController.getPointHistory);

module.exports = router;
