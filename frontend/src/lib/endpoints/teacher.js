import api from '../api';

export const getMyClasses = () => api.get('/teacher/classes').then((r) => r.data);
export const getClassStudents = (classId) => api.get(`/teacher/classes/${classId}/students`).then((r) => r.data);
export const getClassAtRisk = (classId) => api.get(`/teacher/classes/${classId}/atrisk`).then((r) => r.data);
export const getStudentDetail = (studentId) => api.get(`/teacher/students/${studentId}`).then((r) => r.data);
export const getStudentStudyPlan = (studentId) => api.get(`/teacher/students/${studentId}/studyplan`).then((r) => r.data);

export const getLessonsForClass = (classId) => api.get('/teacher/lessons', { params: { class_id: classId } }).then((r) => r.data);
export const uploadLesson = (formData) =>
  api.post('/teacher/lessons', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
export const publishLesson = (id) => api.put(`/teacher/lessons/${id}/publish`).then((r) => r.data);
export const deleteLesson = (id) => api.delete(`/teacher/lessons/${id}`).then((r) => r.data);

export const getQuizzesForClass = (classId) => api.get('/teacher/quizzes', { params: { class_id: classId } }).then((r) => r.data);
export const getQuiz = (id) => api.get(`/teacher/quizzes/${id}`).then((r) => r.data);
export const createQuiz = (payload) => api.post('/teacher/quizzes', payload).then((r) => r.data);
export const updateQuiz = (id, payload) => api.put(`/teacher/quizzes/${id}`, payload).then((r) => r.data);
export const updateQuizFile = (id, formData) =>
  api.put(`/teacher/quizzes/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
export const deleteQuiz = (id) => api.delete(`/teacher/quizzes/${id}`).then((r) => r.data);
export const uploadQuizFile = (formData) =>
  api.post('/teacher/quizzes/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
export const publishQuiz = (id) => api.put(`/teacher/quizzes/${id}/publish`).then((r) => r.data);
export const getQuizResults = (id) => api.get(`/teacher/quizzes/${id}/results`).then((r) => r.data);
export const getAttemptReview = (quizId, attemptId) =>
  api.get(`/teacher/quizzes/${quizId}/attempts/${attemptId}/answers`).then((r) => r.data);
export const setAttemptGraded = (quizId, attemptId, graded) =>
  api.patch(`/teacher/quizzes/${quizId}/attempts/${attemptId}/grade`, { graded }).then((r) => r.data);

export const markAttendance = (payload) => api.post('/teacher/attendance', payload).then((r) => r.data);
export const getClassAttendance = (classId, date) =>
  api.get('/teacher/attendance', { params: { class_id: classId, ...(date ? { date } : {}) } }).then((r) => r.data);
