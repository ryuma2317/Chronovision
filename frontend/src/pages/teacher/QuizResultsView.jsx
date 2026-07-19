import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart2, ChevronDown, ChevronRight, FileText, Check } from 'lucide-react';
import * as teacherApi from '../../lib/endpoints/teacher';
import { apiErrorMessage } from '../../lib/api';
import { Card, CardHeader } from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import QuestionCard from '../../components/QuestionCard';
import { PageSpinner } from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';

function AttemptReview({ quizId, attemptId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    teacherApi.getAttemptReview(quizId, attemptId)
      .then(setData)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load this attempt.')));
  }, [quizId, attemptId]);

  if (error) return <p className="text-sm text-danger mt-3">{error}</p>;
  if (!data) return <div className="mt-3"><PageSpinner /></div>;

  return (
    <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
      {data.questions.map((q, i) => (
        <div key={q.question_id}>
          <QuestionCard
            index={i}
            total={data.questions.length}
            questionText={q.question_text}
            options={q.options}
            answer={q.selected_option_id}
            correctOptionId={q.correct_option_id}
            showCorrectness
          />
          <p className="text-xs mt-2">
            {q.selected_option_id == null ? (
              <span className="text-muted">No answer given.</span>
            ) : q.is_correct ? (
              <span className="text-success font-semibold">Answered correctly.</span>
            ) : (
              <span className="text-danger font-semibold">Answered incorrectly.</span>
            )}
          </p>
          {q.explanation && (
            <p className="text-sm text-muted mt-1"><strong className="text-heading">Explanation:</strong> {q.explanation}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// Simple pill toggle for a file submission's graded status. No score entry —
// the teacher reviews the file elsewhere and just flips this when done.
function GradeToggle({ quizId, attempt, onChanged }) {
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();
  const isGraded = attempt.status === 'graded';

  const toggle = async () => {
    setIsSaving(true);
    try {
      await teacherApi.setAttemptGraded(quizId, attempt.attempt_id, !isGraded);
      onChanged(attempt.attempt_id, !isGraded ? 'graded' : 'submitted');
    } catch (err) {
      toast?.(apiErrorMessage(err, 'Could not update the grade status.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={isSaving}
      className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full border transition-colors ${
        isGraded
          ? 'bg-success-bg text-success border-success/40 hover:opacity-80'
          : 'bg-card-alt text-muted border-border hover:text-heading'
      }`}
      title={isGraded ? 'Click to mark as not graded' : 'Click to mark as graded'}
    >
      {isGraded && <Check size={12} />}
      {isGraded ? 'Graded' : 'Not graded'}
    </button>
  );
}

export default function QuizResultsView() {
  const { id } = useParams();
  const [quizMeta, setQuizMeta] = useState(null); // { quiz_type, title }
  const [attempts, setAttempts] = useState(null);
  const [expanded, setExpanded] = useState(null); // attempt_id currently expanded

  useEffect(() => {
    teacherApi.getQuizResults(id)
      .then((data) => {
        setQuizMeta({ quiz_type: data.quiz_type, title: data.title });
        setAttempts(data.attempts || []);
      })
      .catch(() => { setQuizMeta({ quiz_type: 'manual', title: '' }); setAttempts([]); });
  }, [id]);

  if (attempts === null) return <PageSpinner />;

  const isFile = quizMeta.quiz_type === 'file';
  const graded = attempts.filter((a) => a.status === 'graded');
  const avgScore = graded.length ? (graded.reduce((s, a) => s + Number(a.score), 0) / graded.length).toFixed(1) : '—';

  // Update one attempt's status locally after a successful grade toggle,
  // instead of refetching the whole list.
  const handleGradeChanged = (attemptId, newStatus) => {
    setAttempts((prev) => prev.map((a) => (a.attempt_id === attemptId ? { ...a, status: newStatus } : a)));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-heading mb-1">Quiz Results</h1>
      <p className="text-sm text-muted mb-6">
        {attempts.length} attempt(s)
        {isFile
          ? ' · file submissions are graded manually'
          : <> &middot; average score {avgScore}{graded.length > 0 && '%'}</>}
      </p>

      {attempts.length === 0 ? (
        <EmptyState icon={<BarChart2 size={40} />} title="No attempts yet" description="Results will appear here once students take this quiz." />
      ) : (
        <Card>
          <CardHeader title={isFile ? 'Submissions' : 'Attempts'} />
          <div className="flex flex-col divide-y divide-border">
            {attempts.map((a) => {
              const fullName = `${a.first_name} ${a.last_name}`;
              const isOpen = expanded === a.attempt_id;
              const canReview = !isFile && a.status === 'graded';
              return (
                <div key={a.attempt_id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={fullName} size={32} />
                      <div>
                        <p className="text-sm font-semibold text-heading">{fullName}</p>
                        <p className="text-xs text-muted">{new Date(a.started_at).toLocaleString()}</p>
                      </div>
                    </div>

                    {isFile ? (
                      a.status === 'in_progress' ? (
                        <Badge tone="warning">not submitted</Badge>
                      ) : (
                        <div className="flex items-center gap-3">
                          {a.submission_file_url && (
                            <a href={`/${a.submission_file_url}`.replace(/\/+/g, '/')} target="_blank" rel="noreferrer">
                              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold">
                                <FileText size={15} /> {a.submission_file_name || 'View submission'}
                              </span>
                            </a>
                          )}
                          <GradeToggle quizId={id} attempt={a} onChanged={handleGradeChanged} />
                        </div>
                      )
                    ) : a.status === 'graded' ? (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-heading">{Number(a.score).toFixed(0)}%</span>
                        <span className="text-xs text-muted">{a.correct_answers}/{a.total_questions}</span>
                        <button
                          onClick={() => setExpanded(isOpen ? null : a.attempt_id)}
                          className="text-muted hover:text-gold inline-flex items-center gap-1 text-xs font-semibold"
                        >
                          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Answers
                        </button>
                      </div>
                    ) : (
                      <Badge tone="warning">in progress</Badge>
                    )}
                  </div>

                  {canReview && isOpen && <AttemptReview quizId={id} attemptId={a.attempt_id} />}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
