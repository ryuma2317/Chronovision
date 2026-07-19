const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkRole = require('../middleware/role');
const { uploadLesson, uploadQuiz } = require('../middleware/upload');

const classController = require('../controllers/class.controller');
const lessonController = require('../controllers/lesson.controller');
const quizController = require('../controllers/quiz.controller');
const attendanceController = require('../controllers/attendance.controller');
const studyplanController = require('../controllers/studyplan.controller');
const courseController = require('../controllers/course.controller');

// All routes below require authentication + teacher role
router.use(auth, checkRole('teacher'));
router.get('/classes/:id/courses', courseController.getCoursesForMember);

/**
 * @swagger
 * /api/teacher/students/{studentId}/studyplan:
 *   get:
 *     summary: View a student's latest study plan (only if they share a class)
 *     tags: [Teacher]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Student's study plan }
 *       403: { description: You do not teach a class this student is in }
 *       404: { description: No study plan found }
 */
router.get('/students/:studentId/studyplan', studyplanController.getStudentStudyPlan);

/**
 * @swagger
 * /api/teacher/classes:
 *   get:
 *     summary: Get classes taught by the logged-in teacher
 *     tags: [Teacher]
 *     responses:
 *       200: { description: List of classes }
 */
router.get('/classes', async (req, res, next) => {
  try {
    const classRepo = require('../repositories/class.repo');
    const classes = await classRepo.findByTeacher(req.user.user_id);
    res.json(classes);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/teacher/classes/{id}/students:
 *   get:
 *     summary: Get all students in a class
 *     tags: [Teacher]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Class members }
 */
router.get('/classes/:id/students', classController.getMembers);

/**
 * @swagger
 * /api/teacher/classes/{id}/atrisk:
 *   get:
 *     summary: Get at-risk students dashboard for a class
 *     tags: [Teacher]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Class dashboard with at-risk flags }
 */
router.get('/classes/:id/atrisk', classController.getDashboard);

/**
 * @swagger
 * /api/teacher/students/{id}:
 *   get:
 *     summary: Get a single student's detail profile
 *     tags: [Teacher]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Student profile }
 */
router.get('/students/:id', async (req, res, next) => {
  try {
    const userRepo = require('../repositories/user.repo');
    const predictionRepo = require('../repositories/prediction.repo');
    const gamificationService = require('../services/gamification.service');

    const student = await userRepo.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const { password_hash, ...safeStudent } = student;
    const predictions = await predictionRepo.findAllByStudent(req.params.id);
    const gamification = await gamificationService.getStudentProfile(req.params.id);

    res.json({ student: safeStudent, predictions, gamification });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/teacher/lessons:
 *   post:
 *     summary: Upload a new lesson file
 *     tags: [Teacher]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [class_id, title, file]
 *             properties:
 *               class_id: { type: integer }
 *               title: { type: string }
 *               description: { type: string }
 *               file: { type: string, format: binary }
 *     responses:
 *       201: { description: Lesson created }
 */
router.get('/lessons', lessonController.getLessonsForTeacher);
router.post('/lessons', uploadLesson.single('file'), lessonController.uploadLesson);

/**
 * @swagger
 * /api/teacher/lessons/{id}/publish:
 *   put:
 *     summary: Publish a lesson so students can view it
 *     tags: [Teacher]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Lesson published }
 */
router.put('/lessons/:id/publish', lessonController.publishLesson);

/**
 * @swagger
 * /api/teacher/lessons/{id}:
 *   delete:
 *     summary: Delete a lesson you uploaded
 *     tags: [Teacher]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Lesson deleted }
 *       403: { description: Not your lesson }
 *       404: { description: Lesson not found }
 */
router.delete('/lessons/:id', lessonController.deleteLesson);

/**
 * @swagger
 * /api/teacher/quizzes:
 *   post:
 *     summary: Create a quiz manually with structured questions
 *     tags: [Teacher]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [class_id, title, questions]
 *             properties:
 *               class_id: { type: integer }
 *               title: { type: string }
 *               questions: { type: array }
 *               time_limit_minutes: { type: integer }
 *     responses:
 *       201: { description: Quiz created }
 */
router.get('/quizzes', quizController.getQuizzesForTeacher);
router.post('/quizzes', quizController.createQuiz);

/**
 * @swagger
 * /api/teacher/quizzes/upload:
 *   post:
 *     summary: Upload a file as a quiz (the file is the quiz paper; students answer by uploading a file)
 *     tags: [Teacher]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [class_id, title, file]
 *             properties:
 *               class_id: { type: string }
 *               title: { type: string }
 *               time_limit_minutes: { type: integer }
 *               file: { type: string, format: binary }
 *     responses:
 *       201: { description: File quiz created }
 */
router.post('/quizzes/upload', uploadQuiz.single('file'), quizController.uploadQuizFile);

/**
 * @swagger
 * /api/teacher/quizzes/{id}:
 *   put:
 *     summary: Modify a quiz (only before a student has submitted an answer). Manual quizzes take a JSON body with title/questions; file quizzes take a multipart body with an optional new title and/or replacement file.
 *     tags: [Teacher]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Quiz updated }
 *       409: { description: A student has already submitted an answer }
 *   delete:
 *     summary: Delete a quiz you created (only before a student has submitted an answer)
 *     tags: [Teacher]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Quiz deleted }
 *       409: { description: A student has already submitted an answer }
 */
router.put('/quizzes/:id', uploadQuiz.single('file'), quizController.updateQuiz);
router.delete('/quizzes/:id', quizController.deleteQuiz);

/**
 * @swagger
 * /api/teacher/quizzes/{id}:
 *   get:
 *     summary: Get a single quiz with its questions and answers (for editing)
 *     tags: [Teacher]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Quiz with questions }
 *       404: { description: Quiz not found }
 */
router.get('/quizzes/:id', quizController.getQuizForTeacher);

/**
 * @swagger
 * /api/teacher/quizzes/{id}/publish:
 *   put:
 *     summary: Publish a quiz so students can take it
 *     tags: [Teacher]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Quiz published }
 */
router.put('/quizzes/:id/publish', quizController.publishQuiz);

/**
 * @swagger
 * /api/teacher/quizzes/{id}/results:
 *   get:
 *     summary: Get all student attempts/results for a quiz
 *     tags: [Teacher]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: List of quiz attempts }
 */
router.get('/quizzes/:id/results', quizController.getResults);

/**
 * @swagger
 * /api/teacher/quizzes/{id}/attempts/{attemptId}/answers:
 *   get:
 *     summary: See one student's per-question answers and mistakes for a quiz attempt
 *     tags: [Teacher]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Per-question breakdown for the attempt }
 *       404: { description: Attempt not found }
 */
router.get('/quizzes/:id/attempts/:attemptId/answers', quizController.getAttemptReview);

/**
 * @swagger
 * /api/teacher/quizzes/{id}/attempts/{attemptId}/grade:
 *   patch:
 *     summary: Toggle a file-submission attempt between graded and not graded
 *     tags: [Teacher]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [graded]
 *             properties:
 *               graded: { type: boolean }
 *     responses:
 *       200: { description: Grade status updated }
 *       409: { description: Student has not submitted a file yet }
 */
router.patch('/quizzes/:id/attempts/:attemptId/grade', quizController.setAttemptGraded);

/**
 * @swagger
 * /api/teacher/attendance:
 *   post:
 *     summary: Manually mark attendance for a student
 *     tags: [Teacher]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [class_id, student_id, date, status]
 *             properties:
 *               class_id: { type: integer }
 *               student_id: { type: integer }
 *               date: { type: string, format: date }
 *               status: { type: string, enum: [present, absent, late, excused] }
 *     responses:
 *       200: { description: Attendance marked }
 *   get:
 *     summary: Get attendance records for a class, optionally filtered by date
 *     tags: [Teacher]
 *     parameters:
 *       - in: query
 *         name: class_id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: date
 *         required: false
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Attendance records }
 */
router.post('/attendance', attendanceController.markAttendance);
router.get('/attendance', attendanceController.getAttendanceByClass);

module.exports = router;
