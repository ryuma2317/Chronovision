import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, RefreshCw } from 'lucide-react';
import * as studentApi from '../../lib/endpoints/student';
import { Card, CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function StudyPlanWeekly() {
  const [plan, setPlan] = useState(undefined); // undefined = loading, null = none found

  useEffect(() => {
    studentApi.getLatestStudyPlan().then(setPlan).catch(() => setPlan(null));
  }, []);

  if (plan === undefined) return <PageSpinner />;

  if (!plan) {
    return (
      <EmptyState
        icon={<CalendarDays size={40} />}
        title="No study plan yet"
        description="Take the aptitude test and we'll build a weekly schedule designed to hit your target GPA."
        action={<Link to="/student/study-plan/new"><Button>Build My Study Plan</Button></Link>}
      />
    );
  }

  const byDay = DAYS.map((day) => ({ day, blocks: plan.schedule.filter((b) => b.day_of_week === day) }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-heading">Your Weekly Study Plan</h1>
          <p className="text-sm text-muted mt-0.5">
            Target GPA {Number(plan.target_gpa).toFixed(2)} &middot; {Number(plan.total_study_hours_per_week).toFixed(1)}h/week scheduled
          </p>
        </div>
        <Link to="/student/study-plan/new">
          <Button variant="secondary" size="sm"><RefreshCw size={14} /> Regenerate</Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader title="Subject allocation" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {plan.subjects.map((s) => (
            <div key={s.id} className="rounded-lg border border-border p-3">
              <p className="text-sm font-semibold text-heading">{s.subject_name}</p>
              <p className="text-xs text-muted">{Number(s.hours_per_week).toFixed(1)}h/week</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {byDay.map(({ day, blocks }) => (
          <Card key={day}>
            <p className="text-sm font-bold text-heading mb-3">{day}</p>
            {blocks.length === 0 ? (
              <p className="text-xs text-muted">No sessions scheduled</p>
            ) : (
              <div className="flex flex-col gap-2">
                {blocks.map((b) => (
                  <div key={b.schedule_id} className="flex items-center justify-between rounded-lg bg-input px-3 py-2 text-sm">
                    <span className="text-body">{b.start_time?.slice(0, 5)}–{b.end_time?.slice(0, 5)}</span>
                    {b.activity_type === 'study' ? (
                      <Badge tone="gold">{b.subject_name}</Badge>
                    ) : (
                      <Badge tone="neutral">free</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
