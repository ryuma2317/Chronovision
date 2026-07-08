import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Trophy, TrendingUp, CalendarDays } from 'lucide-react';
import * as teacherApi from '../../lib/endpoints/teacher';
import { Card, CardHeader } from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';

const RISK_TONE = { on_track: 'success', at_risk: 'warning', high_risk: 'danger' };
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function StudentDetail() {
  const { id } = useParams();
  const [detail, setDetail] = useState(undefined);
  const [plan, setPlan] = useState(undefined);

  useEffect(() => {
    teacherApi.getStudentDetail(id).then(setDetail).catch(() => setDetail(null));
    teacherApi.getStudentStudyPlan(id).then(setPlan).catch(() => setPlan(null));
  }, [id]);

  if (detail === undefined) return <PageSpinner />;
  if (!detail) return <p className="text-sm text-danger">Could not load this student.</p>;

  const { student, predictions, gamification } = detail;
  const fullName = `${student.first_name} ${student.last_name}`;
  const latest = predictions[0];

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Avatar name={fullName} size={48} />
        <div>
          <h1 className="text-2xl font-bold text-heading">{fullName}</h1>
          <p className="text-sm text-muted">{student.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <TrendingUp size={18} className="text-gold mb-2" />
          <p className="text-2xl font-extrabold text-heading">{latest ? Number(latest.predicted_gpa).toFixed(2) : '—'}</p>
          <p className="text-xs text-muted">latest predicted GPA</p>
          {latest && <Badge tone={RISK_TONE[latest.at_risk_status]} className="mt-2">{latest.at_risk_status.replace('_', ' ')}</Badge>}
        </Card>
        <Card>
          <Trophy size={18} className="text-gold mb-2" />
          <p className="text-2xl font-extrabold text-heading">{gamification.total_points}</p>
          <p className="text-xs text-muted">total points &middot; {gamification.badges.length} badges</p>
        </Card>
        <Card>
          <CalendarDays size={18} className="text-gold mb-2" />
          <p className="text-2xl font-extrabold text-heading">{plan ? `${Number(plan.total_study_hours_per_week).toFixed(1)}h` : '—'}</p>
          <p className="text-xs text-muted">study plan hours / week</p>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader title="Prediction history" />
        {predictions.length === 0 ? (
          <p className="text-sm text-muted">No predictions submitted yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {predictions.map((p) => (
              <div key={p.prediction_id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 text-sm">
                <span className="text-muted">{new Date(p.created_at).toLocaleDateString()}</span>
                <span className="text-body">{p.bucket}</span>
                <span className="font-bold text-heading">{Number(p.predicted_gpa).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Study plan" />
        {!plan ? (
          <p className="text-sm text-muted">This student hasn't built a study plan yet.</p>
        ) : (
          <>
            <p className="text-sm text-body mb-3">Target {Number(plan.target_gpa).toFixed(2)} GPA</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {plan.subjects.map((s) => (
                <div key={s.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-semibold text-heading">{s.subject_name}</p>
                  <p className="text-xs text-muted">{Number(s.hours_per_week).toFixed(1)}h/week</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {DAYS.map((day) => {
                const blocks = plan.schedule.filter((b) => b.day_of_week === day && b.activity_type === 'study');
                if (blocks.length === 0) return null;
                return (
                  <div key={day} className="flex items-start gap-2">
                    <span className="font-semibold text-heading w-20 shrink-0">{day}</span>
                    <span className="text-muted">{blocks.map((b) => `${b.subject_name} (${b.start_time?.slice(0,5)}-${b.end_time?.slice(0,5)})`).join(', ')}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
