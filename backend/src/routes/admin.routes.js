const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkRole = require('../middleware/role');
const adminController = require('../controllers/admin.controller');

// All routes below require authentication + admin role
router.use(auth, checkRole('admin'));

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Create a new user (student, teacher, or admin)
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [first_name, last_name, email, password, role]
 *             properties:
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               role: { type: string, enum: [student, teacher, admin] }
 *     responses:
 *       201: { description: User created }
 *   get:
 *     summary: Get all users (optionally filter by ?role=)
 *     tags: [Admin]
 *     responses:
 *       200: { description: List of users }
 */
router.post('/users', adminController.createUser);
router.get('/users', adminController.getUsers);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: Update a user
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User updated }
 *       404: { description: User not found }
 *   delete:
 *     summary: Deactivate a user
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User deactivated }
 *       404: { description: User not found }
 */
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

/**
 * @swagger
 * /api/admin/classes:
 *   post:
 *     summary: Create a new class
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, teacher_id]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               teacher_id: { type: integer }
 *     responses:
 *       201: { description: Class created }
 *   get:
 *     summary: Get all classes
 *     tags: [Admin]
 *     responses:
 *       200: { description: List of classes }
 */
router.post('/classes', adminController.createClass);
router.get('/classes', adminController.getClasses);

/**
 * @swagger
 * /api/admin/classes/{id}:
 *   put:
 *     summary: Update a class
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Class updated }
 *   delete:
 *     summary: Delete a class
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Class deleted }
 */
router.put('/classes/:id', adminController.updateClass);
router.delete('/classes/:id', adminController.deleteClass);

/**
 * @swagger
 * /api/admin/classes/{id}/teachers:
 *   post:
 *     summary: Add a teacher to a class
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [teacher_id]
 *             properties:
 *               teacher_id: { type: integer }
 *     responses:
 *       201: { description: Teacher added }
 */
router.post('/classes/:id/teachers', adminController.addTeacherToClass);

/**
 * @swagger
 * /api/admin/classes/{id}/students:
 *   post:
 *     summary: Add a student to a class
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [student_id]
 *             properties:
 *               student_id: { type: integer }
 *     responses:
 *       201: { description: Student added }
 */
router.post('/classes/:id/students', adminController.addStudentToClass);

/**
 * @swagger
 * /api/admin/classes/{id}/members:
 *   get:
 *     summary: Get all teachers and students assigned to a class
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Class with its members }
 */
router.get('/classes/:id/members', adminController.getClassMembers);

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get platform-wide dashboard stats
 *     tags: [Admin]
 *     responses:
 *       200: { description: Dashboard statistics }
 */
router.get('/dashboard', adminController.getDashboard);

module.exports = router;
