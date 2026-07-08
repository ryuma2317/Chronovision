import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import * as studentApi from '../../lib/endpoints/student';
import { apiErrorMessage } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import QuestionCard from '../../components/QuestionCard';
import { PageSpinner } from '../../components/ui/Spinner';

export default function QuizTake() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    studentApi.startQuiz(id).then(setAttempt).catch((err) => setError(apiErrorMessage(err, 'Could not start this quiz.')));
  }, [id]);

  if (error && !attempt) {
    return <p className="text-sm text-danger bg-danger-bg rounded-lg px-4 py-3 max-w-md">{error}</p>;
  }
  if (!attempt) return <PageSpinner />;

  const q = attempt.questions[current];
  const selectAnswer = (optionId) => setAnswers((a) => ({ ...a, [q.question_id]: optionId }));

  const submit = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const payload = Object.entries(answers).map(([question_id, selected_option_id]) => ({ question_id, selected_option_id }));
      const data = await studentApi.submitQuiz(id, attempt.attempt_id, payload);
      setResult(data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not submit the quiz.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result) {
    return (
      <Card className="max-w-md mx-auto text-center py-8">
        <Trophy size={36} className="text-gold mx-auto mb-4" />
        <h2 className="text-xl font-bold text-heading mb-1">{Number(result.score).toFixed(0)}%</h2>
        <p className="text-sm text-muted mb-6">{result.correct_answers} of {result.total_questions} correct</p>
        {result.new_badges?.length > 0 && (
          <p className="text-sm text-gold font-semibold mb-4">New badge: {result.new_badges.join(', ')}</p>
        )}
        <div className="flex justify-center gap-3">
          <Link to={`/student/quizzes/${id}/answers`}><Button variant="secondary">View Answer Sheet</Button></Link>
          <Link to="/student/quizzes"><Button>Back to Quizzes</Button></Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="max-w-xl mx-auto">
      <QuestionCard
        index={current}
        total={attempt.questions.length}
        questionText={q.question_text}
        options={q.options}
        answer={answers[q.question_id]}
        onSelect={selectAnswer}
      />
      {error && <p className="text-sm text-danger bg-danger-bg rounded-lg px-4 py-2.5 mt-4">{error}</p>}
      <div className="flex justify-between mt-6">
        <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>Back</Button>
        {current < attempt.questions.length - 1 ? (
          <Button onClick={() => setCurrent((c) => c + 1)}>Next</Button>
        ) : (
          <Button isLoading={isSubmitting} onClick={submit}>Submit Quiz</Button>
        )}
      </div>
    </Card>
  );
}
