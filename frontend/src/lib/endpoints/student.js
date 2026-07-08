import api from '../api';

export const getMyClasses = () => api.get('/student/classes').then((r) => r.data);

export const submitPrediction = (class_id, features) => api.post('/student/prediction', { class_id, features }).then((r) => r.data);
export const getPredictionHistory = () => api.get('/student/prediction/history').then((r) => r.data);
export const getPeerComparison = (class_id) => api.get('/student/prediction/peer-comparison', { params: { class_id } }).then((r) => r.data);

export const getIqQuestions = () => api.get('/student/iq/questions').then((r) => r.data);
export const submitIqTest = (answers, time_taken_seconds) => api.post('/student/iq/submit', { answers, time_taken_seconds }).then((r) => r.data);
export const getLatestIqResult = () => api.get('/student/iq/latest').then((r) => r.data);

export const generateAutoStudyPlan = (target_gpa) => api.post('/student/studyplan/auto', { target_gpa }).then((r) => r.data);
export const confirmStudyPlanSchedule = (payload) => api.post('/student/studyplan/schedule', payload).then((r) => r.data);
export const getLatestStudyPlan = () => api.get('/student/studyplan/latest').then((r) => r.data);

export const runWhatIf = (overrides) => api.post('/student/whatif', { overrides }).then((r) => r.data);
export const getWhatIfHistory = () => api.get('/student/whatif/history').then((r) => r.data);

export const getLessons = (class_id) => api.get('/student/lessons', { params: { class_id } }).then((r) => r.data);
export const viewLesson = (id) => api.post(`/student/lessons/${id}/view`).then((r) => r.data);

export const getQuizzes = (class_id) => api.get('/student/quizzes', { params: { class_id } }).then((r) => r.data);
export const startQuiz = (id) => api.post(`/student/quizzes/${id}/start`).then((r) => r.data);
export const submitQuiz = (id, attempt_id, answers) => api.post(`/student/quizzes/${id}/submit`, { attempt_id, answers }).then((r) => r.data);
export const getQuizAnswers = (id) => api.get(`/student/quizzes/${id}/answers`).then((r) => r.data);

export const getMyAttendance = (class_id) => api.get('/student/attendance', { params: class_id ? { class_id } : {} }).then((r) => r.data);

export const getLeaderboard = (limit = 10) => api.get('/student/leaderboard', { params: { limit } }).then((r) => r.data);
export const getBadges = () => api.get('/student/badges').then((r) => r.data);
export const getPointHistory = () => api.get('/student/points/history').then((r) => r.data);
