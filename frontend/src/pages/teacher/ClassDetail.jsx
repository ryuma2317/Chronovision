import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import * as teacherApi from '../../lib/endpoints/teacher';
import { Card, CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import { PageSpinner } from '../../components/ui/Spinner';

const RISK_TONE = { on_track: 'success', at_risk: 'warning', high_risk: 'danger' };

export default function ClassDetail() {
  const { id } = useParams();
  const [dash, setDash] = useState(null);

  useEffect(() => {
    teacherApi.getClassAtRisk(id).then(setDash).catch(() => setDash(null));
  }, [id]);

  if (dash === null) return <PageSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-heading mb-1">{dash.class?.class_name}</h1>
      <p className="text-sm text-muted mb-6">{dash.total_students} students &middot; {dash.at_risk_count} at risk &middot; {dash.no_prediction_count} haven't predicted yet</p>

      <Card>
        <CardHeader title="Roster" />
        <div className="flex flex-col divide-y divide-border">
          {dash.students.map((s) => {
            const fullName = `${s.first_name} ${s.last_name}`;
            return (
              <Link key={s.user_id} to={`/teacher/students/${s.user_id}`} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:bg-input -mx-2 px-2 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar name={fullName} size={32} />
                  <div>
                    <p className="text-sm font-semibold text-heading">{fullName}</p>
                    <p className="text-xs text-muted">{s.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {s.attendance_rate != null && <span className="text-xs text-muted">{s.attendance_rate}% attendance</span>}
                  {s.latest_prediction ? (
                    <>
                      <span className="text-sm font-bold text-heading">{Number(s.latest_prediction.predicted_gpa).toFixed(2)}</span>
                      <Badge tone={RISK_TONE[s.latest_prediction.at_risk_status]}>{s.latest_prediction.at_risk_status.replace('_', ' ')}</Badge>
                    </>
                  ) : (
                    <Badge tone="neutral">no prediction</Badge>
                  )}
                  <ArrowRight size={14} className="text-muted" />
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      {dash.at_risk.length > 0 && (
        <Card className="mt-6 border-danger/30">
          <CardHeader title={<span className="flex items-center gap-2"><AlertTriangle size={16} className="text-danger" /> Needs attention</span>} />
          <div className="flex flex-col gap-2">
            {dash.at_risk.map((s) => (
              <Link key={s.user_id} to={`/teacher/students/${s.user_id}`} className="text-sm text-body hover:text-gold">
                {s.first_name} {s.last_name} — {s.latest_prediction.bucket}
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
