import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, AlertTriangle } from 'lucide-react';
import * as teacherApi from '../../lib/endpoints/teacher';
import { Card } from '../../components/ui/Card';
import { PageSpinner } from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

export default function TeacherDashboard() {
  const [classes, setClasses] = useState(null);
  const [stats, setStats] = useState({});

  useEffect(() => {
    teacherApi.getMyClasses().then(async (data) => {
      setClasses(data);
      const entries = await Promise.all(
        data.map(async (c) => {
          try {
            const dash = await teacherApi.getClassAtRisk(c.class_id);
            return [c.class_id, dash];
          } catch {
            return [c.class_id, null];
          }
        })
      );
      setStats(Object.fromEntries(entries));
    }).catch(() => setClasses([]));
  }, []);

  if (classes === null) return <PageSpinner />;
  if (classes.length === 0) {
    return <EmptyState icon={<Users size={40} />} title="No classes assigned yet" description="Your administrator hasn't assigned you to a class yet." />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-heading mb-6">Your Classes</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((c) => {
          const dash = stats[c.class_id];
          return (
            <Link key={c.class_id} to={`/teacher/classes/${c.class_id}`}>
              <Card className="hover:border-gold transition-colors h-full">
                <p className="text-sm font-bold text-heading">{c.class_name}</p>
                <p className="text-xs text-muted mb-4">{c.academic_year} &middot; {c.semester}</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-sm text-body">
                    <Users size={14} /> {dash?.total_students ?? '—'}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-danger">
                    <AlertTriangle size={14} /> {dash?.at_risk_count ?? '—'} at risk
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
