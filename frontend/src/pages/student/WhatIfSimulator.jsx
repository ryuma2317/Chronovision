import { useState } from 'react';
import { Link } from 'react-router-dom';
import { History, ArrowUp, ArrowDown } from 'lucide-react';
import api from '../../lib/api';
import { apiErrorMessage } from '../../lib/api';
import { Card, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

// WHAT-IF — rewired to the course model.
//
// It was never really broken: it called port 5001, and nothing listens there.
// That was the entire "ML what-if service unavailable" message.
//
// Now it re-predicts YOUR ACTUAL COURSES with the same evidence but different
// habits. So instead of "your GPA would be 3.1", you see WHICH courses move.
// Sleeping more lifts the hard course you're failing more than the easy one
// you're already acing — and now you can see that.

const SLIDERS = [
  { name: 'study_hours_per_day', label: 'Study hours / day', min: 0.5, max: 12, step: 0.5 },
  { name: 'sleep_hours', label: 'Sleep hours / night', min: 3, max: 10, step: 0.5 },
  { name: 'social_media_hours', label: 'Social media hours / day', min: 0, max: 10, step: 0.5 },
  { name: 'attendance_percentage', label: 'Attendance %', min: 30, max: 100, step: 1 },
  { name: 'exercise_frequency', label: 'Exercise days / week', min: 0, max: 7, step: 1 },
  { name: 'stress_level', label: 'Stress level (1-10)', min: 1, max: 10, step: 1 },
  { name: 'time_management_score', label: 'Time management (1-10)', min: 1, max: 10, step: 1 },
];

const PRESETS = {
  'Low effort': { study_hours_per_day: 1.5, sleep_hours: 5.5, social_media_hours: 5, attendance_percentage: 60, exercise_frequency: 0, stress_level: 8, time_management_score: 3 },
  'High effort': { study_hours_per_day: 7, sleep_hours: 8, social_media_hours: 1, attendance_percentage: 98, exercise_frequency: 5, stress_level: 3, time_management_score: 9 },
};

export default function WhatIfSimulator() {
  const [overrides, setOverrides] = useState({
    study_hours_per_day: 4, sleep_hours: 7, social_media_hours: 2.5,
    attendance_percentage: 85, exercise_frequency: 3, stress_level: 5,
    time_management_score: 6,
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const run = async () => {
    setError('');
    setIsLoading(true);
    try {
      const { data } = await api.post('/student/whatif', { overrides });
      setResult(data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not run the simulation. Run a prediction first.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-heading">What-If Simulator</h1>
        <Link to="/student/what-if/history" className="text-sm text-gold font-semibold flex items-center gap-1.5">
          <History size={15} /> History
        </Link>
      </div>
      <p className="text-sm text-muted mb-6">
        Change your habits and we&rsquo;ll re-predict <strong>the same courses</strong> from your
        latest prediction — same coursework, different you.
      </p>

      <Card className="mb-6">
        <CardHeader title="Quick scenarios" />
        <div className="flex gap-3">
          {Object.keys(PRESETS).map((name) => (
            <Button key={name} variant="secondary" size="sm"
              onClick={() => setOverrides((o) => ({ ...o, ...PRESETS[name] }))}>
              {name}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="mb-6">
        <CardHeader title="Adjust your habits" />
        <div className="flex flex-col gap-5">
          {SLIDERS.map((s) => (
            <div key={s.name}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-body">{s.label}</span>
                <span className="font-bold text-gold">{overrides[s.name]}</span>
              </div>
              <input type="range" min={s.min} max={s.max} step={s.step}
                value={overrides[s.name]} className="w-full accent-gold"
                onChange={(e) => setOverrides((o) => ({ ...o, [s.name]: Number(e.target.value) }))} />
            </div>
          ))}
        </div>
      </Card>

      {error && <p className="text-sm text-danger bg-danger-bg rounded-lg px-4 py-2.5 mb-4">{error}</p>}

      <Button className="w-full mb-6" isLoading={isLoading} onClick={run}>Run simulation</Button>

      {result && (
        <>
          <Card className="mb-6">
            <div className="flex items-center justify-around py-3 text-center">
              <div>
                <p className="text-xs text-muted">Now</p>
                <p className="text-3xl font-bold text-muted">{Number(result.baseline_gpa).toFixed(2)}</p>
              </div>
              <div className={result.improved ? 'text-success' : 'text-danger'}>
                {result.improved ? <ArrowUp size={28} className="mx-auto" /> : <ArrowDown size={28} className="mx-auto" />}
                <p className="text-sm font-bold">{result.delta > 0 ? '+' : ''}{result.delta}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Simulated</p>
                <p className="text-3xl font-bold text-heading">{Number(result.simulated_gpa).toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Which courses move" />
            <p className="text-sm text-muted mb-4">
              The same habits don&rsquo;t help every course equally. Courses where you have the most
              room to improve move the most.
            </p>
            <div className="space-y-2">
              {result.course_deltas.map((c) => (
                <div key={c.course_id} className="flex items-center justify-between rounded-lg border border-white/5 p-3">
                  <span className="font-semibold text-heading">{c.course_name}</span>
                  <span className="text-sm">
                    <span className="text-muted">{c.before}</span>
                    <span className="mx-1.5 text-muted">→</span>
                    <span className="font-bold text-heading">{c.after}</span>
                    {c.delta != null && (
                      <Badge className={`ml-2 ${c.delta >= 0 ? 'text-success' : 'text-danger'}`}>
                        {c.delta > 0 ? '+' : ''}{c.delta}
                      </Badge>
                    )}
                  </span>
                </div>
              ))}
            </div>
            {result.biggest_gain && result.biggest_gain.delta > 0 && (
              <div className="mt-4 rounded-lg bg-success-bg border border-success/20 p-3 text-sm">
                <strong>Biggest win:</strong> {result.biggest_gain.course_name} gains{' '}
                {result.biggest_gain.delta} marks — that&rsquo;s where these habit changes pay off most.
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
