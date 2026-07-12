import { useEffect, useState } from 'react';
import api from '../../lib/api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import { SkeletonCard } from '../../components/ui/Skeleton';
import useAsyncAction from '../../hooks/useAsyncAction';

// Shows: each subject's midterm -> predicted final, and how much each subject
// contributes to the overall credit-weighted GPA.

export default function SubjectPrediction({ classId, features }) {
  const [subjects, setSubjects] = useState([]);
  const [midterms, setMidterms] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Load the subject catalogue (with admin-set credits) to build the form.
  useEffect(() => {
    api
      .get('/student/subjects')
      .then((r) => {
        setSubjects(r.data);
        setMidterms(Object.fromEntries(r.data.map((s) => [s.subject_key, ''])));
      })
      .catch(() => setError('Could not load subjects.'))
      .finally(() => setLoading(false));
  }, []);

  const { run: submit, loading: submitting } = useAsyncAction(async () => {
    setError('');
    try {
      const payload = {
        class_id: classId,
        features,
        midterms: Object.fromEntries(
          Object.entries(midterms).map(([k, v]) => [k, Number(v)])
        ),
      };
      const { data } = await api.post('/student/prediction/subjects', payload);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Prediction failed. Please try again.');
    }
  });

  if (loading) return <SkeletonCard />;

  return (
    <div className="space-y-6">
      {/* ── Midterm entry ─────────────────────────────────────── */}
      <Card>
        <h2 className="text-lg font-bold text-navy mb-1">Enter your midterm scores</h2>
        <p className="text-sm text-gray-500 mb-4">
          We predict your <strong>final exam score</strong> for each subject, then
          combine them into a credit-weighted GPA.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {subjects.map((s) => (
            <Input
              key={s.subject_key}
              type="number"
              min="0"
              max="100"
              label={`${s.display_name} (${s.credits} credits)`}
              placeholder="Midterm score 0–100"
              value={midterms[s.subject_key] ?? ''}
              onChange={(e) =>
                setMidterms((m) => ({ ...m, [s.subject_key]: e.target.value }))
              }
            />
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <Button className="mt-5 w-full" disabled={submitting} onClick={submit}>
          {submitting ? 'Predicting…' : 'Predict my finals'}
        </Button>
      </Card>

      {/* ── Results ──────────────────────────────────────────── */}
      {result && (
        <>
          <Card>
            <div className="text-center py-2">
              <p className="text-sm text-gray-500">Predicted GPA (credit-weighted)</p>
              <p className="text-5xl font-bold text-navy my-2">
                {Number(result.predicted_gpa).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">
                {result.bucket} · {result.total_credits} total credits
              </p>
            </div>
          </Card>

          <Card>
            <h3 className="text-base font-bold text-navy mb-1">
              Predicted final per subject
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              “Contribution” is how much of your GPA came from that subject — the six
              add up to 100%. “Weight” is how much it <em>could</em> influence, based on
              its credits. Contribution below weight means that subject is holding you
              back.
            </p>

            <div className="space-y-3">
              {result.subjects.map((s) => {
                const up = s.change_from_midterm >= 0;
                const dragging = s.performance_vs_weight < 0;
                return (
                  <div
                    key={s.subject}
                    className="rounded-lg border border-black/5 p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-navy capitalize">
                        {s.subject.replace(/_/g, ' ')}
                        <span className="ml-2 text-xs font-normal text-gray-500">
                          {s.credits} credits
                        </span>
                      </span>
                      <span className="text-sm">
                        <span className="text-gray-500">{s.midterm}</span>
                        <span className="mx-1 text-gray-400">→</span>
                        <span className="font-bold text-navy">{s.predicted_final}</span>
                        <span
                          className={`ml-2 text-xs font-semibold ${
                            up ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {up ? '+' : ''}
                          {s.change_from_midterm}
                        </span>
                      </span>
                    </div>

                    {/* contribution bar */}
                    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-navy"
                        style={{ width: `${Math.min(s.contribution_pct, 100)}%` }}
                      />
                    </div>

                    <div className="mt-1.5 flex justify-between text-xs text-gray-500">
                      <span>
                        Contributes <strong>{s.contribution_pct}%</strong> of your GPA
                      </span>
                      <span className={dragging ? 'text-red-600' : 'text-green-600'}>
                        weight {s.weight_pct}% ({dragging ? '' : '+'}
                        {s.performance_vs_weight})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
              <strong>Weakest subject:</strong>{' '}
              <span className="capitalize">
                {result.weakest_subject?.replace(/_/g, ' ')}
              </span>
              . <strong>Biggest drag on your GPA:</strong>{' '}
              <span className="capitalize">
                {result.biggest_drag?.replace(/_/g, ' ')}
              </span>{' '}
              — improving a high-credit subject moves your GPA the most.
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
