import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as teacherApi from '../../lib/endpoints/teacher';
import { Card, CardHeader } from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { BarChart2 } from 'lucide-react';

export default function QuizResultsView() {
  const { id } = useParams();
  const [attempts, setAttempts] = useState(null);

  useEffect(() => {
    teacherApi.getQuizResults(id).then(setAttempts).catch(() => setAttempts([]));
  }, [id]);

  if (attempts === null) return <PageSpinner />;

  const graded = attempts.filter((a) => a.status === 'graded');
  const avgScore = graded.length ? (graded.reduce((s, a) => s + Number(a.score), 0) / graded.length).toFixed(1) : '—';

  return (
    <div>
      <h1 className="text-2xl font-bold text-heading mb-1">Quiz Results</h1>
      <p className="text-sm text-muted mb-6">{attempts.length} attempt(s) &middot; average score {avgScore}{graded.length > 0 && '%'}</p>

      {attempts.length === 0 ? (
        <EmptyState icon={<BarChart2 size={40} />} title="No attempts yet" description="Results will appear here once students take this quiz." />
      ) : (
        <Card>
          <CardHeader title="Attempts" />
          <div className="flex flex-col divide-y divide-border">
            {attempts.map((a) => {
              const fullName = `${a.first_name} ${a.last_name}`;
              return (
                <div key={a.attempt_id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <Avatar name={fullName} size={32} />
                    <div>
                      <p className="text-sm font-semibold text-heading">{fullName}</p>
                      <p className="text-xs text-muted">{new Date(a.started_at).toLocaleString()}</p>
                    </div>
                  </div>
                  {a.status === 'graded' ? (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-heading">{Number(a.score).toFixed(0)}%</span>
                      <span className="text-xs text-muted">{a.correct_answers}/{a.total_questions}</span>
                    </div>
                  ) : (
                    <Badge tone="warning">in progress</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
