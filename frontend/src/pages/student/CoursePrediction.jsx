import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import api from '../../lib/api';
import Button from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { apiErrorMessage } from '../../lib/api';
import { PREDICTION_FORM_SECTIONS, defaultFeatureValues } from '../../lib/predictionFormSpec';

// THE prediction page. Replaces both the old ScoreEntry/Predict page and the
// midterm-only Course Prediction page.
//
// THREE THINGS IT DOES THAT THE OLD ONES COULDN'T
//   1. Courses come from the ADMIN. Whatever they put in your classes is what
//      you see. No hardcoded subject list exists anywhere.
//   2. EVERY course input is OPTIONAL. No midterm yet? Predict anyway — the
//      model was trained with these randomly masked, so it works from whatever
//      evidence exists. It just tells you how confident it is.
//   3. Predict ALL your courses, or tick a subset. One course is fine.

const STAGE_STYLE = {
  week_1: { label: 'Early estimate', tone: 'warning' },
  week_2: { label: 'Attendance only', tone: 'warning' },
  week_5: { label: 'Quizzes in', tone: 'info' },
  week_7: { label: 'Coursework in', tone: 'info' },
  week_9: { label: 'Full evidence', tone: 'success' },
};

const COURSE_INPUTS = [
  { key: 'quiz_average', label: 'Quiz avg', hint: 'from ~week 4' },
  { key: 'assignment_average', label: 'Assignment avg', hint: 'from ~week 6' },
  { key: 'midterm', label: 'Midterm', hint: 'from ~week 8' },
];

export default function CoursePrediction() {
  const [courses, setCourses] = useState(null);
  const [selected, setSelected] = useState({});     // course_id -> bool
  const [inputs, setInputs] = useState({});         // course_id -> {quiz_average, ...}
  const [features, setFeatures] = useState(defaultFeatureValues());
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    api.get('/student/courses')
      .then((r) => {
        setCourses(r.data.courses);
        setSelected(Object.fromEntries(r.data.courses.map((c) => [c.course_id, true])));
        setInputs(Object.fromEntries(r.data.courses.map((c) => [c.course_id, {}])));
      })
      .catch(() => setCourses([]));
  }, []);

  const setInput = (courseId, key, value) =>
    setInputs((prev) => ({ ...prev, [courseId]: { ...prev[courseId], [key]: value } }));

  const chosen = (courses || []).filter((c) => selected[c.course_id]);
  const allChosen = courses && chosen.length === courses.length;

  const submit = async () => {
    setError('');
    setIsLoading(true);
    try {
      const { data } = await api.post('/student/prediction/courses', {
        features,
        // Omit course_ids when everything is ticked — that's a full-GPA run.
        course_ids: allChosen ? undefined : chosen.map((c) => c.course_id),
        inputs: Object.fromEntries(chosen.map((c) => [c.course_id, inputs[c.course_id] || {}])),
      });
      setResult(data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Prediction failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  if (courses === null) return <PageSpinner />;

  // The gate, made visible.
  if (!courses.length) {
    return (
      <EmptyState
        title="No courses yet"
        description="An admin needs to add you to a class, and add courses to it, before you can predict anything."
      />
    );
  }

  const byClass = courses.reduce((acc, c) => {
    (acc[c.class_name] = acc[c.class_name] || []).push(c);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-heading mb-1">Predict my finals</h1>
      <p className="text-sm text-muted mb-6">
        Fill in whatever you have so far — <strong>every course box is optional</strong>. No
        midterm yet? Predict anyway; we&rsquo;ll tell you how much to trust the number, and it
        sharpens as the semester goes on.
      </p>

      {/* ── 1. Pick courses & enter what you have ─────────────────── */}
      <Card className="mb-6">
        <CardHeader title="Your courses" />
        <div className="flex gap-2 mb-4">
          <Button size="sm" variant="secondary"
            onClick={() => setSelected(Object.fromEntries(courses.map((c) => [c.course_id, true])))}>
            Select all
          </Button>
          <Button size="sm" variant="secondary"
            onClick={() => setSelected(Object.fromEntries(courses.map((c) => [c.course_id, false])))}>
            Clear
          </Button>
        </div>

        {Object.entries(byClass).map(([className, list]) => (
          <div key={className} className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">{className}</p>

            {list.map((c) => {
              const on = !!selected[c.course_id];
              return (
                <div key={c.course_id}
                  className={`rounded-lg border p-3 mb-2 transition ${on ? 'border-gold/40' : 'border-white/5 opacity-50'}`}>
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input type="checkbox" checked={on}
                      onChange={(e) => setSelected((s) => ({ ...s, [c.course_id]: e.target.checked }))} />
                    <span className="font-semibold text-heading">{c.course_name}</span>
                    <span className="text-xs text-muted">
                      {c.credits} credits · difficulty {c.difficulty_level}/5
                    </span>
                    {c.attendance_percentage != null && (
                      <Badge className="ml-auto">
                        <Check size={11} /> attendance {c.attendance_percentage}%
                      </Badge>
                    )}
                  </label>

                  {on && (
                    <div className="grid grid-cols-3 gap-2 pl-6">
                      {COURSE_INPUTS.map((f) => (
                        <Input key={f.key} type="number" min="0" max="100"
                          label={f.label}
                          placeholder={f.hint}
                          value={inputs[c.course_id]?.[f.key] ?? ''}
                          onChange={(e) => setInput(c.course_id, f.key, e.target.value)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </Card>

      {/* ── 2. Habits ─────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader title="Your habits and wellbeing" />
        {PREDICTION_FORM_SECTIONS.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">{section.title}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {section.fields.map((f) =>
                f.type === 'select' ? (
                  <Select key={f.name} label={f.label} value={features[f.name]}
                    onChange={(e) => setFeatures((v) => ({ ...v, [f.name]: e.target.value }))}>
                    {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                ) : (
                  <Input key={f.name} type="number" min={f.min} max={f.max} step={f.step}
                    label={f.label} value={features[f.name]}
                    onChange={(e) => setFeatures((v) => ({ ...v, [f.name]: Number(e.target.value) }))} />
                )
              )}
            </div>
          </div>
        ))}
      </Card>

      {error && <p className="text-sm text-danger bg-danger-bg rounded-lg px-4 py-2.5 mb-4">{error}</p>}

      <Button className="w-full mb-6" isLoading={isLoading} disabled={!chosen.length} onClick={submit}>
        {chosen.length === 0 ? 'Select at least one course'
          : allChosen ? `Predict all ${chosen.length} courses`
          : `Predict ${chosen.length} of ${courses.length} courses`}
      </Button>

      {/* ── 3. Results ────────────────────────────────────────────── */}
      {result && <Results result={result} />}
    </div>
  );
}

function Results({ result }) {
  const single = result.course_count === 1;
  const stage = STAGE_STYLE[result.evidence_stage] || STAGE_STYLE.week_1;

  return (
    <>
      <Card className="mb-6">
        <div className="text-center py-2">
          {/* A subset is NOT a GPA, and we must not pretend otherwise. */}
          <p className="text-sm text-muted">
            {single ? 'Predicted grade point' : result.is_partial ? 'Partial GPA' : 'Predicted GPA'}
          </p>
          <p className="text-5xl font-bold text-heading my-2">
            {single
              ? result.courses[0].predicted_final
              : Number(result.predicted_gpa).toFixed(2)}
            {single && <span className="text-2xl text-muted">/100</span>}
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge>{stage.label}</Badge>
            <span className="text-xs text-muted">
              confidence {(result.confidence * 100).toFixed(0)}%
            </span>
          </div>
          {result.is_partial && !single && (
            <p className="text-xs text-muted mt-3 max-w-md mx-auto">
              This covers only {result.course_count} of your courses, so it is not your real GPA —
              it&rsquo;s what these courses alone would average.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Per course" />
        <div className="space-y-3">
          {result.courses.map((c) => {
            const s = STAGE_STYLE[c.evidence_stage] || STAGE_STYLE.week_1;
            const dragging = c.performance_vs_weight < 0;
            return (
              <div key={c.course_id} className="rounded-lg border border-white/5 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-heading">
                    {c.course_name}
                    <span className="ml-2 text-xs font-normal text-muted">
                      {c.credits} cr · diff {c.difficulty_level}/5
                    </span>
                  </span>
                  <span className="text-lg font-bold text-heading">{c.predicted_final}</span>
                </div>

                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge>{s.label}</Badge>
                  <span className="text-xs text-muted">{c.evidence_label}</span>
                </div>

                {!single && (
                  <>
                    <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-gold"
                        style={{ width: `${Math.min(c.contribution_pct, 100)}%` }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-xs text-muted">
                      <span>Contributes <strong>{c.contribution_pct}%</strong> of this GPA</span>
                      <span className={dragging ? 'text-danger' : 'text-success'}>
                        weight {c.weight_pct}% ({dragging ? '' : '+'}{c.performance_vs_weight})
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {!single && (
          <div className="mt-4 rounded-lg bg-warning-bg border border-warning/20 p-3 text-sm">
            <strong>Weakest:</strong> {result.weakest_course}.{' '}
            {result.biggest_drag && (
              <>
                <strong>Biggest drag on your GPA:</strong> {result.biggest_drag} — a high-credit
                course you&rsquo;re underperforming in moves your GPA the most.
              </>
            )}
          </div>
        )}
      </Card>
    </>
  );
}
