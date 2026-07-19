import api from '../api';

export const getDashboard = () => api.get('/admin/dashboard').then((r) => r.data);

export const getUsers = (role) => api.get('/admin/users', { params: role ? { role } : {} }).then((r) => r.data);
export const createUser = (payload) => api.post('/admin/users', payload).then((r) => r.data);
export const updateUser = (id, payload) => api.put(`/admin/users/${id}`, payload).then((r) => r.data);
export const deactivateUser = (id) => api.delete(`/admin/users/${id}`).then((r) => r.data);

export const getClasses = () => api.get('/admin/classes').then((r) => r.data);
export const createClass = (payload) => api.post('/admin/classes', payload).then((r) => r.data);
export const updateClass = (id, payload) => api.put(`/admin/classes/${id}`, payload).then((r) => r.data);
export const deleteClass = (id) => api.delete(`/admin/classes/${id}`).then((r) => r.data);
export const getClassMembers = (id) => api.get(`/admin/classes/${id}/members`).then((r) => r.data);
export const addTeacherToClass = (id, teacher_id) => api.post(`/admin/classes/${id}/teachers`, { teacher_id }).then((r) => r.data);
export const addStudentToClass = (id, student_id) => api.post(`/admin/classes/${id}/students`, { student_id }).then((r) => r.data);
export const removeTeacherFromClass = (id, teacher_id) => api.delete(`/admin/classes/${id}/teachers/${teacher_id}`).then((r) => r.data);
export const removeStudentFromClass = (id, student_id) => api.delete(`/admin/classes/${id}/students/${student_id}`).then((r) => r.data);

export const getClassCourses = (id) => api.get(`/admin/classes/${id}/courses`).then((r) => r.data);
export const createCourse = (id, payload) => api.post(`/admin/classes/${id}/courses`, payload).then((r) => r.data);
export const updateCourse = (courseId, payload) => api.put(`/admin/courses/${courseId}`, payload).then((r) => r.data);
export const deleteCourse = (courseId) => api.delete(`/admin/courses/${courseId}`).then((r) => r.data);