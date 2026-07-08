import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, BookOpen, UserCheck } from 'lucide-react';
import * as adminApi from '../../lib/endpoints/admin';
import { Card, CardHeader } from '../../components/ui/Card';
import { PageSpinner } from '../../components/ui/Spinner';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    adminApi.getDashboard().then(setStats).catch(() => setStats(null));
  }, []);

  if (stats === null) return <PageSpinner />;

  const cards = [
    { label: 'Total users', value: stats.total_users, icon: <Users size={18} /> },
    { label: 'Students', value: stats.total_students, icon: <GraduationCap size={18} /> },
    { label: 'Teachers', value: stats.total_teachers, icon: <UserCheck size={18} /> },
    { label: 'Classes', value: stats.total_classes, icon: <BookOpen size={18} /> },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-heading mb-1">Platform Overview</h1>
      <p className="text-sm text-muted mb-6">Welcome back, {user?.first_name}.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <Card key={c.label}>
            <div className="text-gold mb-2">{c.icon}</div>
            <p className="text-2xl font-extrabold text-heading">{c.value}</p>
            <p className="text-xs text-muted">{c.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Quick actions" />
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/users" className="text-sm font-semibold text-gold">Manage Users &rarr;</Link>
          <Link to="/admin/classes" className="text-sm font-semibold text-gold">Manage Classes &rarr;</Link>
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Active vs. inactive users" />
        <p className="text-sm text-body">{stats.active_users} of {stats.total_users} users are currently active.</p>
      </Card>
    </div>
  );
}
