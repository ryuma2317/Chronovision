import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, AlertTriangle, BookOpen, ClipboardList } from 'lucide-react';
import * as teacherApi from '../../lib/endpoints/teacher';
import { Card, CardHeader } from '../../components/ui/Card';
import { PageSpinner } from '../../components/ui/Spinner';
import { useAuth } from '../../context/AuthContext';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState(null);
  const [totals, setTotals] = useState({ students: 0, atRisk: 0 });

  useEffect(() => {
    teacherApi.getMyClasses().then(async (data) => {
      setClasses(data);
      const dashboards = await Promise.all(
        data.map((c) => teacherApi.getClassAtRisk(c.class_id).catch(() => null))
      );
      setTotals({
        students: dashboards.reduce((s, d) => s + (d?.total_students || 0), 0),
        atRisk: dashboards.reduce((s, d) => s + (d?.at_risk_count || 0), 0),
      });
    }).catch(() => setClasses([]));
  }, []);

  if (classes === null) return <PageSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-heading mb-1">Welcome back, {user?.first_name}</h1>
      <p className="text-sm text-muted mb-6">{classes.length} class{classes.length === 1 ? '' : 'es'} assigned to you.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card><Users size={18} className="text-gold mb-2" /><p className="text-2xl font-extrabold text-heading">{totals.students}</p><p className="text-xs text-muted">total students</p></Card>
        <Card><AlertTriangle size={18} className="text-danger mb-2" /><p className="text-2xl font-extrabold text-heading">{totals.atRisk}</p><p className="text-xs text-muted">flagged at-risk</p></Card>
        <Card><BookOpen size={18} className="text-gold mb-2" /><p className="text-2xl font-extrabold text-heading">{classes.length}</p><p className="text-xs text-muted">classes taught</p></Card>
      </div>

      <Card>
        <CardHeader title="Quick links" />
        <div className="flex flex-wrap gap-3">
          <Link to="/teacher/classes" className="text-sm font-semibold text-gold flex items-center gap-1.5"><Users size={14} /> View Classes</Link>
          <Link to="/teacher/at-risk" className="text-sm font-semibold text-gold flex items-center gap-1.5"><AlertTriangle size={14} /> At-Risk Dashboard</Link>
          <Link to="/teacher/lessons" className="text-sm font-semibold text-gold flex items-center gap-1.5"><BookOpen size={14} /> Manage Lessons</Link>
          <Link to="/teacher/quizzes" className="text-sm font-semibold text-gold flex items-center gap-1.5"><ClipboardList size={14} /> Manage Quizzes</Link>
        </div>
      </Card>
    </div>
  );
}
