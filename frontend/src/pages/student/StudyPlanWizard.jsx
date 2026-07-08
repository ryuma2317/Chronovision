import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import * as studentApi from '../../lib/endpoints/student';
import { apiErrorMessage } from '../../lib/api';
import { Card, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import IqTest from './IqTest';
import { PageSpinner } from '../../components/ui/Spinner';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const priorityTone = { high: 'danger', medium: 'warning', low: 'success' };

export default function StudyPlanWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState('checking'); // checking | iq | target | subjects | schedule
  const [targetGpa, setTargetGpa] = useState(3.5);
  const [plan, setPlan] = useState(null); // { plan_id, subjects, predicted_gpa }
  const [freeSlots, setFreeSlots] = useState([{ day: 'Monday', start: '16:00', end: '18:00' }]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    studentApi.getLatestIqResult()
      .then(() => setStep('target'))
      .catch(() => setStep('iq'));
  }, []);

  const generateSuggestion = async () => {
    setError('');
    setIsLoading(true);
    try {
      const data = await studentApi.generateAutoStudyPlan(Number(targetGpa));
      setPlan(data);
      setStep('subjects');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not generate a suggestion. Submit a prediction first.'));
    } finally {
      setIsLoading(false);
    }
  };

  const updateSubjectHours = (subject, hours) => {
    setPlan((p) => ({ ...p, subjects: p.subjects.map((s) => (s.subject === subject ? { ...s, hours_per_week: hours } : s)) }));
  };

  const addSlot = () => setFreeSlots((s) => [...s, { day: 'Monday', start: '16:00', end: '18:00' }]);
  const removeSlot = (i) => setFreeSlots((s) => s.filter((_, idx) => idx !== i));
  const updateSlot = (i, field, value) => setFreeSlots((s) => s.map((slot, idx) => (idx === i ? { ...slot, [field]: value } : slot)));

  const totalNeeded = plan?.subjects.reduce((sum, s) => sum + Number(s.hours_per_week), 0) || 0;
  const toMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const totalFree = freeSlots.reduce((sum, s) => sum + Math.max(0, toMinutes(s.end) - toMinutes(s.start)), 0) / 60;

  const confirmSchedule = async () => {
    setError('');
    setIsLoading(true);
    try {
      await studentApi.confirmStudyPlanSchedule({
        plan_id: plan.plan_id,
        subjects: plan.subjects.map(({ subject, hours_per_week, priority }) => ({ subject, hours_per_week: Number(hours_per_week), priority })),
        freeSlots,
      });
      navigate('/student/study-plan');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not generate the schedule.'));
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'checking') return <PageSpinner />;
  if (step === 'iq') return <IqTest onComplete={() => setStep('target')} />;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-heading mb-6">Build Your Study Plan</h1>

      {step === 'target' && (
        <Card>
          <CardHeader title="Step 1 — Set your target GPA" />
          <p className="text-sm text-muted mb-4">
            We'll suggest weekly hours per subject to help close the gap toward this target.
          </p>
          <Input
            label="Target GPA"
            type="number" min={0} max={4} step={0.1}
            value={targetGpa}
            onChange={(e) => setTargetGpa(e.target.value)}
            className="max-w-[160px]"
          />
          {error && <p className="text-sm text-danger bg-danger-bg rounded-lg px-4 py-2.5 mt-4">{error}</p>}
          <Button onClick={generateSuggestion} isLoading={isLoading} className="mt-5">
            <Sparkles size={16} /> Generate Suggestion
          </Button>
        </Card>
      )}

      {step === 'subjects' && plan && (
        <Card>
          <CardHeader title="Step 2 — Review & adjust subject hours" subtitle={`Suggested to reach ${targetGpa} GPA from ${Number(plan.predicted_gpa).toFixed(2)}`} />
          <div className="flex flex-col divide-y divide-border">
            {plan.subjects.map((s) => (
              <div key={s.subject} className="flex items-center justify-between py-3 first:pt-0 gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-heading">{s.subject}</p>
                    <Badge tone={priorityTone[s.priority]}>{s.priority}</Badge>
                  </div>
                  <p className="text-xs text-muted">{s.reason}</p>
                </div>
                <Input
                  type="number" min={0} step={0.5}
                  value={s.hours_per_week}
                  onChange={(e) => updateSubjectHours(s.subject, e.target.value)}
                  className="w-24 shrink-0"
                />
              </div>
            ))}
          </div>
          <p className="text-sm font-semibold text-heading mt-4">Total: {totalNeeded.toFixed(1)} hours / week</p>
          <Button onClick={() => setStep('schedule')} className="mt-4">Continue to Free Time</Button>
        </Card>
      )}

      {step === 'schedule' && plan && (
        <Card>
          <CardHeader title="Step 3 — Enter your free time" subtitle="We'll only schedule study sessions inside these windows." />
          <div className="flex flex-col gap-3">
            {freeSlots.map((slot, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select value={slot.day} onChange={(e) => updateSlot(i, 'day', e.target.value)} className="flex-1">
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </Select>
                <input type="time" value={slot.start} onChange={(e) => updateSlot(i, 'start', e.target.value)}
                  className="rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-heading" />
                <input type="time" value={slot.end} onChange={(e) => updateSlot(i, 'end', e.target.value)}
                  className="rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-heading" />
                <button type="button" onClick={() => removeSlot(i)} className="text-danger p-2" aria-label="Remove slot">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={addSlot} className="mt-3"><Plus size={14} /> Add time slot</Button>

          <div className={`mt-5 rounded-lg px-4 py-3 text-sm font-medium ${totalFree >= totalNeeded ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'}`}>
            You need {totalNeeded.toFixed(1)}h/week &middot; you've entered {totalFree.toFixed(1)}h/week of free time
            {totalFree < totalNeeded && ' — add more time or reduce subject hours before continuing.'}
          </div>

          {error && <p className="text-sm text-danger bg-danger-bg rounded-lg px-4 py-2.5 mt-4">{error}</p>}

          <div className="flex justify-between mt-5">
            <Button variant="secondary" onClick={() => setStep('subjects')}>Back</Button>
            <Button onClick={confirmSchedule} isLoading={isLoading}>Generate My Schedule</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
