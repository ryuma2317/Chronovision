import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wand2, ArrowRight, History } from 'lucide-react';
import * as studentApi from '../../lib/endpoints/student';
import { apiErrorMessage } from '../../lib/api';
import { Card, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const SLIDERS = [
  { name: 'study_hours_per_day', label: 'Study hours / day', min: 0.5, max: 12, step: 0.5 },
  { name: 'sleep_hours', label: 'Sleep hours / night', min: 3, max: 10, step: 0.5 },
  { name: 'social_media_hours', label: 'Social media hours / day', min: 0, max: 10, step: 0.5 },
  { name: 'attendance_percentage', label: 'Attendance %', min: 30, max: 100, step: 1 },
  { name: 'exercise_frequency', label: 'Exercise days / week', min: 0, max: 7, step: 1 },
  { name: 'stress_level', label: 'Stress level (1-10)', min: 1, max: 10, step: 1 },
];

const PRESETS = {
  'Low effort': { study_hours_per_day: 1.5, sleep_hours: 5.5, social_media_hours: 5, attendance_percentage: 60, exercise_frequency: 0, stress_level: 8 },
  'High effort': { study_hours_per_day: 7, sleep_hours: 8, social_media_hours: 1, attendance_percentage: 98, exercise_frequency: 5, stress_level: 3 },
};

export default function WhatIfSimulator() {
  const [overrides, setOverrides] = useState({
    study_hours_per_day: 4, sleep_hours: 7, social_media_hours: 2.5, attendance_percentage: 85, exercise_frequency: 3, stress_level: 5,
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const setVal = (name, value) => setOverrides((o) => ({ ...o, [name]: value }));
  const applyPreset = (name) => setOverrides((o) => ({ ...o, ...PRESETS[name] }));

  const runSimulation = async () => {
    setError('');
    setIsLoading(true);
    try {
      const data = await studentApi.runWhatIf(overrides);
      setResult(data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not run the simulation. Make sure you have a baseline prediction first.'));
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
        Adjust a few habits and see how your predicted GPA would shift — based on your latest prediction as the baseline.
      </p>

      <Card className="mb-6">
        <CardHeader title="Quick scenarios" />
        <div className="flex gap-3">
          {Object.keys(PRESETS).map((name) => (
            <Button key={name} variant="secondary" size="sm" onClick={() => applyPreset(name)}>{name}</Button>
          ))}
        </div>
      </Card>

      <Card className="mb-6">
        <CardHeader title="Adjust your habits" />
        <div className="flex flex-col gap-5">
          {SLIDERS.map((s) => (
            <div key={s.name}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium text-heading">{s.label}</span>
                <span className="text-gold font-bold">{overrides[s.name]}</span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={overrides[s.name]}
                onChange={(e) => setVal(s.name, Number(e.target.value))}
                className="w-full accent-gold"
              />
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-danger bg-danger-bg rounded-lg px-4 py-2.5 mt-4">{error}</p>}
        <Button onClick={runSimulation} isLoading={isLoading} className="mt-5">
          <Wand2 size={16} /> Run Simulation
        </Button>
      </Card>

      {result && (
        <Card>
          <CardHeader title="Result" />
          <div className="flex items-center justify-center gap-6 py-4">
            <div className="text-center">
              <p className="text-xs uppercase text-muted mb-1">Baseline</p>
              <p className="text-3xl font-extrabold text-heading">{Number(result.baseline_gpa).toFixed(2)}</p>
            </div>
            <ArrowRight className="text-muted" />
            <div className="text-center">
              <p className="text-xs uppercase text-muted mb-1">Simulated</p>
              <p className={`text-3xl font-extrabold ${result.improved ? 'text-success' : 'text-danger'}`}>
                {Number(result.simulated_gpa).toFixed(2)}
              </p>
            </div>
          </div>
          <p className={`text-center text-sm font-semibold ${result.improved ? 'text-success' : 'text-danger'}`}>
            {result.improved ? '+' : ''}{Number(result.delta).toFixed(2)} GPA {result.improved ? 'improvement' : 'change'} &middot; {result.bucket}
          </p>
        </Card>
      )}
    </div>
  );
}
