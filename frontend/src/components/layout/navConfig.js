// Primary nav items are wired to real backend features.
// "preview" items live in the More dropdown — static/mock pages.
export const NAV_CONFIG = {
  student: {
    primary: [
      { label: 'Dashboard', to: '/student' },
      { label: 'Predict', to: '/student/predict' },
      { label: 'Study Plan', to: '/student/study-plan' },
      { label: 'What-If', to: '/student/what-if' },
      { label: 'Quizzes', to: '/student/quizzes' },
      { label: 'Leaderboard', to: '/student/leaderboard' },
      { label: 'Attendance', to: '/student/attendance' },
      { label: 'Lessons', to: '/student/lessons' },
      { label: 'Subject Prediction', to: '/student/predict-subjects' },

    ],
    preview: [
      { label: 'EduBot Assistant', to: '/student/edubot' },
      { label: 'Notifications', to: '/student/notifications' },
    ],
  },
  teacher: {
    primary: [
      { label: 'Dashboard', to: '/teacher' },
      { label: 'Classes', to: '/teacher/classes' },
      { label: 'At-Risk', to: '/teacher/at-risk' },
      { label: 'Lessons', to: '/teacher/lessons' },
      { label: 'Quizzes', to: '/teacher/quizzes' },
      { label: 'Attendance', to: '/teacher/attendance' },
    ],
    preview: [
      { label: 'EduBot Assistant', to: '/teacher/edubot' },
      { label: 'Faculty Hub', to: '/teacher/faculty-hub' },
      { label: 'Analytics', to: '/teacher/analytics' },
      { label: 'Reports', to: '/teacher/reports' },
      { label: 'Notifications', to: '/teacher/notifications' },
    ],
  },
  admin: {
    primary: [
      { label: 'Dashboard', to: '/admin' },
      { label: 'Users', to: '/admin/users' },
      { label: 'Classes', to: '/admin/classes' },
    ],
    preview: [
      { label: 'Audit Log', to: '/admin/audit-log' },
      { label: 'AI Model Management', to: '/admin/ai-models' },
      { label: 'Reports', to: '/admin/reports' },
      { label: 'Notifications', to: '/admin/notifications' },
    ],
  },
};
