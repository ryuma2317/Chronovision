import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PREDICTION_FORM_SECTIONS, defaultFeatureValues } from '../../lib/predictionFormSpec';
import * as studentApi from '../../lib/endpoints/student';
import { apiErrorMessage } from '../../lib/api';
import useMyClasses from '../../hooks/useMyClasses';
import { Card, CardHeader } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { GraduationCap } from 'lucide-react';

export default function ScoreEntry() {
  const navigate = useNavigate();
  const { classes, isLoading: classesLoading, selectedClassId, setSelectedClassId } = useMyClasses();
  const [values, setValues] = useState(defaultFeatureValues());
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedClassId) {
      setError('Select a class first.');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await studentApi.submitPrediction(selectedClassId, values);
      navigate('/student/predict/result', { state: { result } });
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not generate a prediction. Check your inputs and try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (classesLoading) return <PageSpinner />;

  if (classes.length === 0) {
    return (
      <EmptyState
        icon={<GraduationCap size={40} />}
        title="You're not enrolled in a class yet"
        description="Your administrator needs to add you to a class before you can run a GPA prediction."
      />
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-heading mb-1">Score Entry & Prediction</h1>
      <p className="text-sm text-muted mb-6">
        Enter your current habits and scores. We'll predict your GPA trajectory and flag your risk level.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader title="Class" />
          <Select label="Which class is this for?" value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
            {classes.map((c) => (
              <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
            ))}
          </Select>
        </Card>

        {PREDICTION_FORM_SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardHeader title={section.title} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {section.fields.map((f) => {
                if (f.type === 'select') {
                  return (
                    <Select key={f.name} label={f.label} value={values[f.name]} onChange={(e) => setField(f.name, e.target.value)}>
                      {f.options.map((opt) => (
                        <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>
                      ))}
                    </Select>
                  );
                }
                if (f.type === 'boolean') {
                  return (
                    <label key={f.name} className="flex items-center gap-2.5 text-sm text-heading font-medium pt-6">
                      <input
                        type="checkbox"
                        checked={!!values[f.name]}
                        onChange={(e) => setField(f.name, e.target.checked ? 1 : 0)}
                        className="h-4 w-4 rounded accent-gold"
                      />
                      {f.label}
                    </label>
                  );
                }
                return (
                  <Input
                    key={f.name}
                    label={f.label}
                    type="number"
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={values[f.name]}
                    onChange={(e) => setField(f.name, Number(e.target.value))}
                  />
                );
              })}
            </div>
          </Card>
        ))}

        {error && <p className="text-sm text-danger bg-danger-bg rounded-lg px-4 py-2.5">{error}</p>}

        <Button type="submit" size="lg" isLoading={isSubmitting} className="self-start">
          Generate Prediction
        </Button>
      </form>
    </div>
  );
}
