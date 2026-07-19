import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trophy, FileText, Upload, CheckCircle2 } from 'lucide-react';
import * as studentApi from '../../lib/endpoints/student';
import { apiErrorMessage } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import QuestionCard from '../../components/QuestionCard';
import { PageSpinner } from '../../components/ui/Spinner';

export default function QuizTake() {
  const { id } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [file, setFile] = useState(null);
  const [fileDone, setFileDone] = useState(false);

  useEffect(() => {
    studentApi.startQuiz(id).then(setAttempt).catch((err) => setError(apiErrorMessage(err, 'Could not start this quiz.')));
  }, [id]);

  if (error && !attempt) {
    return <p className="text-sm text-danger bg-danger-bg rounded-lg px-4 py-3 max-w-md">{error}</p>;
  }
  if (!attempt) return <PageSpinner />;

  // ── File-submission quiz ──────────────────────────────────────
  if (attempt.quiz_type === 'file') {
    const submitFile = async () => {
      if (!file) return;
      setError('');
      setIsSubmitting(true);
      try {
        await studentApi.submitQuizFile(id, attempt.attempt_id, file);
        setFileDone(true);
      } catch (err) {
        setError(apiErrorMessage(err, 'Could not submit your file.'));
      } finally {
        setIsSubmitting(false);
      }
    };

    if (fileDone) {
      return (
        <Card className="max-w-md mx-auto text-center py-8">
          <CheckCircle2 size={36} className="text-success mx-auto mb-4" />
          <h2 className="text-xl font-bold text-heading mb-1">Submitted</h2>
          <p className="text-sm text-muted mb-6">Your file was submitted. Your teacher will review and grade it.</p>
          <Link to="/student/quizzes"><Button>Back to Quizzes</Button></Link>
        </Card>
      );
    }

    return (
      <Card className="max-w-xl mx-auto">
        <h2 className="text-xl font-bold text-heading mb-1">{attempt.title}</h2>
        <p className="text-sm text-muted mb-5">Download the quiz, then upload your answers as a file.</p>

        {attempt.source_file_url && (
          <a href={`/${attempt.source_file_url}`.replace(/\/+/g, '/')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-gold mb-5">
            <FileText size={16} /> Download quiz paper
          </a>
        )}

        <div className="rounded-lg border border-dashed border-border p-4">
          <label className="text-xs font-bold uppercase tracking-wide text-heading mb-2 block">Your answer file (PDF, DOCX, PPTX, image, text, or zip)</label>
          <input
            type="file"
            accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg,.txt,.zip"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm text-body"
          />
        </div>

        {error && <p className="text-sm text-danger bg-danger-bg rounded-lg px-4 py-2.5 mt-4">{error}</p>}

        <div className="flex justify-end mt-6">
          <Button isLoading={isSubmitting} disabled={!file} onClick={submitFile}><Upload size={15} /> Submit File</Button>
        </div>
      </Card>
    );
  }

  // ── Multiple-choice quiz ──────────────────────────────────────
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
