import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Upload, CheckCircle2, BarChart2 } from 'lucide-react';
import * as teacherApi from '../../lib/endpoints/teacher';
import { apiErrorMessage } from '../../lib/api';
import useMyClasses from '../../hooks/useMyClasses';
import { Card, CardHeader } from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';

const emptyQuestion = () => ({
  question_text: '', explanation: '',
  options: [
    { label: 'A', text: '', is_correct: true },
    { label: 'B', text: '', is_correct: false },
    { label: 'C', text: '', is_correct: false },
    { label: 'D', text: '', is_correct: false },
  ],
});

export default function QuizManager() {
  const { classes, isLoading: classesLoading, selectedClassId, setSelectedClassId } = useMyClasses();
  const [quizzes, setQuizzes] = useState(null);
  const [mode, setMode] = useState('manual'); // manual | upload
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [uploadFile, setUploadFile] = useState(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const refresh = () => {
    if (!selectedClassId) return;
    teacherApi.getQuizzesForClass(selectedClassId).then(setQuizzes).catch(() => setQuizzes([]));
  };
  useEffect(refresh, [selectedClassId]);

  const updateQuestion = (qi, field, value) => setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, [field]: value } : q)));
  const updateOption = (qi, oi, field, value) => setQuestions((qs) => qs.map((q, i) => {
    if (i !== qi) return q;
    const options = q.options.map((o, j) => {
      if (field === 'is_correct') return { ...o, is_correct: j === oi };
      return j === oi ? { ...o, [field]: value } : o;
    });
    return { ...q, options };
  }));
  const addQuestion = () => setQuestions((qs) => [...qs, emptyQuestion()]);
  const removeQuestion = (qi) => setQuestions((qs) => qs.filter((_, i) => i !== qi));

  const handleCreateManual = async (e) => {
    e.preventDefault();
    setError(''); setIsSaving(true);
    try {
      await teacherApi.createQuiz({ class_id: selectedClassId, title, questions });
      setTitle(''); setQuestions([emptyQuestion()]);
      refresh();
      toast?.('Quiz created.', 'success');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create the quiz.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError(''); setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('class_id', selectedClassId);
      formData.append('title', title);
      formData.append('question_count', questionCount);
      formData.append('file', uploadFile);
      await teacherApi.uploadQuizFile(formData);
      setTitle(''); setUploadFile(null);
      refresh();
      toast?.('Quiz generated from file.', 'success');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not generate the quiz. AI generation requires ANTHROPIC_API_KEY to be configured on the backend.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async (id) => {
    try {
      await teacherApi.publishQuiz(id);
      refresh();
      toast?.('Quiz published.', 'success');
    } catch (err) {
      toast?.(apiErrorMessage(err, 'Could not publish.'), 'error');
    }
  };

  if (classesLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-heading">Quizzes</h1>
        <Select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-56">
          {classes.map((c) => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
        </Select>
      </div>

      <Card className="mb-6">
        <div className="flex gap-2 mb-5">
          <Button size="sm" variant={mode === 'manual' ? 'primary' : 'secondary'} onClick={() => setMode('manual')}>Create Manually</Button>
          <Button size="sm" variant={mode === 'upload' ? 'primary' : 'secondary'} onClick={() => setMode('upload')}>Generate from File</Button>
        </div>

        {mode === 'manual' ? (
          <form onSubmit={handleCreateManual} className="flex flex-col gap-5">
            <Input label="Quiz title" required value={title} onChange={(e) => setTitle(e.target.value)} />
            {questions.map((q, qi) => (
              <Card key={qi} className="bg-card-alt">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-heading">Question {qi + 1}</p>
                  {questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(qi)} className="text-danger"><Trash2 size={15} /></button>
                  )}
                </div>
                <Input label="Question text" required value={q.question_text} onChange={(e) => updateQuestion(qi, 'question_text', e.target.value)} className="mb-3" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {q.options.map((o, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input type="radio" name={`correct-${qi}`} checked={o.is_correct} onChange={() => updateOption(qi, oi, 'is_correct', true)} className="accent-gold" />
                      <Input placeholder={`Option ${o.label}`} required value={o.text} onChange={(e) => updateOption(qi, oi, 'text', e.target.value)} className="flex-1" />
                    </div>
                  ))}
                </div>
                <Input label="Explanation (optional)" value={q.explanation} onChange={(e) => updateQuestion(qi, 'explanation', e.target.value)} />
              </Card>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={addQuestion} className="self-start"><Plus size={14} /> Add question</Button>
            {error && <p className="text-sm text-danger bg-danger-bg rounded-lg px-4 py-2.5">{error}</p>}
            <Button type="submit" isLoading={isSaving} className="self-start">Create Quiz</Button>
          </form>
        ) : (
          <form onSubmit={handleUpload} className="flex flex-col gap-4 max-w-md">
            <Input label="Quiz title" required value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input label="Number of questions" type="number" min={1} max={30} value={questionCount} onChange={(e) => setQuestionCount(e.target.value)} />
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-heading mb-1.5 block">Lesson file (PDF or DOCX)</label>
              <input type="file" accept=".pdf,.docx" onChange={(e) => setUploadFile(e.target.files[0])} className="text-sm text-body" />
            </div>
            {error && <p className="text-sm text-danger bg-danger-bg rounded-lg px-4 py-2.5">{error}</p>}
            <Button type="submit" isLoading={isSaving} disabled={!uploadFile} className="self-start"><Upload size={15} /> Generate Quiz</Button>
          </form>
        )}
      </Card>

      <Card>
        <CardHeader title="Existing quizzes" />
        {quizzes === null ? <PageSpinner /> : quizzes.length === 0 ? (
          <p className="text-sm text-muted">No quizzes yet for this class.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {quizzes.map((q) => (
              <div key={q.quiz_id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-semibold text-heading">{q.title}</p>
                  <p className="text-xs text-muted">{q.question_count} questions {q.quiz_type === 'ai_generated' && '· AI-generated'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/teacher/quizzes/${q.quiz_id}/results`}>
                    <Button size="sm" variant="secondary"><BarChart2 size={14} /> Results</Button>
                  </Link>
                  {q.is_published ? (
                    <Badge tone="success"><CheckCircle2 size={12} className="inline mr-1" />Published</Badge>
                  ) : (
                    <Button size="sm" onClick={() => handlePublish(q.quiz_id)}>Publish</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
