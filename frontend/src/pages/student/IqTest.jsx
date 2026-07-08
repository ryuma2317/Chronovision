import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain } from 'lucide-react';
import * as studentApi from '../../lib/endpoints/student';
import { apiErrorMessage } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import QuestionCard from '../../components/QuestionCard';
import { PageSpinner } from '../../components/ui/Spinner';

export default function IqTest({ onComplete }) {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [startedAt] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    studentApi.getIqQuestions().then(setQuestions).catch(() => setQuestions([]));
  }, []);

  if (questions === null) return <PageSpinner />;

  const q = questions[current];
  const selectAnswer = (optionId) => setAnswers((a) => ({ ...a, [q.question_id]: optionId }));

  const submit = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const payload = Object.entries(answers).map(([question_id, selected_option_id]) => ({ question_id, selected_option_id }));
      const time_taken_seconds = Math.round((Date.now() - startedAt) / 1000);
      const data = await studentApi.submitIqTest(payload, time_taken_seconds);
      setResult(data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not submit the test.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result) {
    return (
      <Card className="max-w-md mx-auto text-center py-8">
        <Brain size={36} className="text-gold mx-auto mb-4" />
        <h2 className="text-xl font-bold text-heading mb-1">Test complete</h2>
        <p className="text-sm text-muted mb-6">Here's your estimate — this feeds your study plan.</p>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div><p className="text-2xl font-extrabold text-heading">{result.score}%</p><p className="text-xs text-muted">Score</p></div>
          <div><p className="text-2xl font-extrabold text-heading">{result.iq_estimate}</p><p className="text-xs text-muted">IQ estimate</p></div>
          <div><p className="text-2xl font-extrabold text-heading">{result.percentile}</p><p className="text-xs text-muted">Percentile</p></div>
        </div>
        <Button onClick={() => onComplete ? onComplete() : navigate('/student/study-plan/new')}>Continue to Study Plan</Button>
      </Card>
    );
  }

  if (questions.length === 0) {
    return <p className="text-sm text-muted">No aptitude questions are available right now.</p>;
  }

  return (
    <Card className="max-w-xl mx-auto">
      <QuestionCard
        index={current}
        total={questions.length}
        questionText={q.question_text}
        options={q.options}
        answer={answers[q.question_id]}
        onSelect={selectAnswer}
      />
      {error && <p className="text-sm text-danger bg-danger-bg rounded-lg px-4 py-2.5 mt-4">{error}</p>}
      <div className="flex justify-between mt-6">
        <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>Back</Button>
        {current < questions.length - 1 ? (
          <Button disabled={!answers[q.question_id]} onClick={() => setCurrent((c) => c + 1)}>Next</Button>
        ) : (
          <Button isLoading={isSubmitting} disabled={!answers[q.question_id]} onClick={submit}>Submit Test</Button>
        )}
      </div>
    </Card>
  );
}
