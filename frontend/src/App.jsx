import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import RoleRoute from './components/layout/RoleRoute';
import { useAuth } from './context/AuthContext';
import { PageSpinner } from './components/ui/Spinner';

import Login from './pages/auth/Login';
import NotFound from './pages/shared/NotFound';
import Profile from './pages/shared/Profile';

import StudentDashboard from './pages/student/StudentDashboard';
import ScoreEntry from './pages/student/ScoreEntry';
import PredictionDetail from './pages/student/PredictionDetail';
import SubjectPrediction from './pages/student/SubjectPrediction';
import WhatIfSimulator from './pages/student/WhatIfSimulator';
import WhatIfHistory from './pages/student/WhatIfHistory';
import IqTest from './pages/student/IqTest';
import StudyPlanWizard from './pages/student/StudyPlanWizard';
import StudyPlanWeekly from './pages/student/StudyPlanWeekly';
import QuizList from './pages/student/QuizList';
import QuizTake from './pages/student/QuizTake';
import QuizAnswers from './pages/student/QuizAnswers';
import Leaderboard from './pages/student/Leaderboard';
import Attendance from './pages/student/Attendance';
import Lessons from './pages/student/Lessons';

import TeacherDashboard from './pages/teacher/TeacherDashboard';
import ClassList from './pages/teacher/ClassList';
import ClassDetail from './pages/teacher/ClassDetail';
import AtRiskDashboard from './pages/teacher/AtRiskDashboard';
import StudentDetail from './pages/teacher/StudentDetail';
import LessonsManager from './pages/teacher/LessonsManager';
import QuizManager from './pages/teacher/QuizManager';
import QuizResultsView from './pages/teacher/QuizResultsView';
import AttendanceManager from './pages/teacher/AttendanceManager';

import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import ClassManagement from './pages/admin/ClassManagement';
import ClassMembersView from './pages/admin/ClassMembersView';

import EduBotChat from './pages/mock/EduBotChat';
import NotificationCenter from './pages/mock/NotificationCenter';
import AuditLog from './pages/mock/AuditLog';
import AIModelManagement from './pages/mock/AIModelManagement';
import ReportsHub from './pages/mock/ReportsHub';
import FacultyHub from './pages/mock/FacultyHub';
import ClassAnalytics from './pages/mock/ClassAnalytics';

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />

        {/* Student */}
        <Route path="/student" element={<RoleRoute role="student" />}>
          <Route index element={<StudentDashboard />} />
          <Route path="predict-subjects" element={<SubjectPrediction />} />
          <Route path="predict" element={<ScoreEntry />} />
          <Route path="predict/result" element={<PredictionDetail />} />
          <Route path="iq" element={<IqTest />} />
          <Route path="study-plan" element={<StudyPlanWeekly />} />
          <Route path="study-plan/new" element={<StudyPlanWizard />} />
          <Route path="what-if" element={<WhatIfSimulator />} />
          <Route path="what-if/history" element={<WhatIfHistory />} />
          <Route path="quizzes" element={<QuizList />} />
          <Route path="quizzes/:id" element={<QuizTake />} />
          <Route path="quizzes/:id/answers" element={<QuizAnswers />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="lessons" element={<Lessons />} />
          <Route path="profile" element={<Profile />} />
          <Route path="edubot" element={<EduBotChat />} />
          <Route path="notifications" element={<NotificationCenter />} />
        </Route>

        {/* Teacher */}
        <Route path="/teacher" element={<RoleRoute role="teacher" />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="classes" element={<ClassList />} />
          <Route path="classes/:id" element={<ClassDetail />} />
          <Route path="at-risk" element={<AtRiskDashboard />} />
          <Route path="students/:id" element={<StudentDetail />} />
          <Route path="lessons" element={<LessonsManager />} />
          <Route path="quizzes" element={<QuizManager />} />
          <Route path="quizzes/:id/results" element={<QuizResultsView />} />
          <Route path="attendance" element={<AttendanceManager />} />
          <Route path="profile" element={<Profile />} />
          <Route path="edubot" element={<EduBotChat />} />
          <Route path="faculty-hub" element={<FacultyHub />} />
          <Route path="analytics" element={<ClassAnalytics />} />
          <Route path="reports" element={<ReportsHub />} />
          <Route path="notifications" element={<NotificationCenter />} />
        </Route>

        {/* Admin */}
        <Route path="/admin" element={<RoleRoute role="admin" />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="classes" element={<ClassManagement />} />
          <Route path="classes/:id" element={<ClassMembersView />} />
          <Route path="profile" element={<Profile />} />
          <Route path="audit-log" element={<AuditLog />} />
          <Route path="ai-models" element={<AIModelManagement />} />
          <Route path="reports" element={<ReportsHub />} />
          <Route path="notifications" element={<NotificationCenter />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </ToastProvider>
  );
}
