import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import * as teacherApi from '../../lib/endpoints/teacher';
import useMyClasses from '../../hooks/useMyClasses';
import { Card } from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

export default function AtRiskDashboard() {
  const { classes, isLoading: classesLoading, selectedClassId, setSelectedClassId } = useMyClasses();
  const [dash, setDash] = useState(null);

  useEffect(() => {
    if (!selectedClassId) return;
    setDash(null);
    teacherApi.getClassAtRisk(selectedClassId).then(setDash).catch(() => setDash(null));
  }, [selectedClassId]);

  if (classesLoading) return <PageSpinner />;
  if (classes.length === 0) {
    return <EmptyState icon={<AlertTriangle size={40} />} title="No classes assigned" description="You'll see at-risk students here once you're assigned a class." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-heading">At-Risk Dashboard</h1>
        <Select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-56">
          {classes.map((c) => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
        </Select>
      </div>

      {dash === null ? (
        <PageSpinner />
      ) : dash.at_risk.length === 0 ? (
        <EmptyState icon={<AlertTriangle size={40} />} title="Nobody flagged right now" description="No students in this class are currently marked at-risk or high-risk." />
      ) : (
        <div className="flex flex-col gap-3">
          {dash.at_risk.map((s) => {
            const fullName = `${s.first_name} ${s.last_name}`;
            return (
              <Link key={s.user_id} to={`/teacher/students/${s.user_id}`}>
                <Card className="flex items-center justify-between hover:border-danger/50">
                  <div className="flex items-center gap-3">
                    <Avatar name={fullName} size={36} />
                    <div>
                      <p className="text-sm font-semibold text-heading">{fullName}</p>
                      <p className="text-xs text-muted">{s.latest_prediction.bucket}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-heading">{Number(s.latest_prediction.predicted_gpa).toFixed(2)}</span>
                    <Badge tone={s.latest_prediction.at_risk_status === 'high_risk' ? 'danger' : 'warning'}>
                      {s.latest_prediction.at_risk_status.replace('_', ' ')}
                    </Badge>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
