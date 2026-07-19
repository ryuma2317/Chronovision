import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Upload, CheckCircle2, BarChart2, Pencil, FileText, X } from 'lucide-react';
import * as teacherApi from '../../lib/endpoints/teacher';
import { apiErrorMessage } from '../../lib/api';
import useMyClasses from '../../hooks/useMyClasses';
import { Card, CardHeader } from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
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

// A quiz coming back from the API -> the shape the manual form edits.
const toFormQuestions = (questions) =>
  (questions || []).map((q) => ({
    question_text: q.question_text || '',
    explanation: q.explanation || '',
    options: (q.options || []).map((o) => ({
      label: o.option_label || o.label,
      text: o.option_text ?? o.text ?? '',
      is_correct: !!o.is_correct,
    })),
  }));

export default function QuizManager() {
  const { classes, isLoading: classesLoading, selectedClassId, setSelectedClassId } = useMyClasses();
  const [quizzes, setQuizzes] = useState(null);
  const [mode, setMode] = useState('manual'); // manual | upload
  const [editingId, setEditingId] = useState(null); // set when modifying an existing quiz (either type)
  const [editingSourceUrl, setEditingSourceUrl] = useState(null); // current file, when editing a file quiz
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [uploadFile, setUploadFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const toast = useToast();

  const refresh = () => {
    if (!selectedClassId) return;
    teacherApi.getQuizzesForClass(selectedClassId).then(setQuizzes).catch(() => setQuizzes([]));
  };
  useEffect(refresh, [selectedClassId]);

  const resetForm = () => {
    setEditingId(null);
    setEditingSourceUrl(null);
    setTitle('');
    setQuestions([emptyQuestion()]);
    setUploadFile(null);
    setError('');
  };

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

  // Modify is only offered once no student has submitted an answer yet — the
  // backend enforces this too, but hiding/disabling it here avoids a round
  // trip just to find out. `attempted` comes from the quiz list row.
  const startEdit = async (quiz) => {
    setError('');
    try {
      const full = await teacherApi.getQuiz(quiz.quiz_id);
      setEditingId(quiz.quiz_id);
      setTitle(full.title);
      if (full.quiz_type === 'file') {
        setMode('upload');
        setUploadFile(null);
        setEditingSourceUrl(full.source_file_url || null);
      } else {
        setMode('manual');
        setQuestions(full.questions?.length ? toFormQuestions(full.questions) : [emptyQuestion()]);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast?.(apiErrorMessage(err, 'Could not load this quiz for editing.'), 'error');
    }
  };

  const handleCreateManual = async (e) => {
    e.preventDefault();
    setError(''); setIsSaving(true);
    try {
      if (editingId) {
        await teacherApi.updateQuiz(editingId, { title, questions });
        toast?.('Quiz updated.', 'success');
      } else {
        await teacherApi.createQuiz({ class_id: selectedClassId, title, questions });
        toast?.('Quiz created.', 'success');
      }
      resetForm();
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the quiz.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError(''); setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      if (uploadFile) formData.append('file', uploadFile);

      if (editingId) {
        // Replacing the file is optional here — leave it out to keep the
        // current one and just change the title.
        await teacherApi.updateQuizFile(editingId, formData);
        toast?.('Quiz updated.', 'success');
      } else {
        formData.append('class_id', selectedClassId);
        await teacherApi.uploadQuizFile(formData);
        toast?.('File quiz uploaded.', 'success');
      }
      resetForm();
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err, editingId ? 'Could not update this quiz.' : 'Could not upload the quiz file.'));
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await teacherApi.deleteQuiz(target.quiz_id);
      if (editingId === target.quiz_id) resetForm();
      refresh();
      toast?.('Quiz deleted.', 'success');
    } catch (err) {
      // A student having already submitted comes back as a clear 409 message
      // from the backend rather than a crash — surface it as-is.
      toast?.(apiErrorMessage(err, 'Could not delete this quiz.'), 'error');
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
          <Button size="sm" variant={mode === 'manual' ? 'primary' : 'secondary'} onClick={() => { setMode('manual'); resetForm(); }}>Create Manually</Button>
          <Button size="sm" variant={mode === 'upload' ? 'primary' : 'secondary'} onClick={() => { setMode('upload'); resetForm(); }}>Upload File Quiz</Button>
        </div>

        {editingId && (
          <div className="flex items-center justify-between rounded-lg bg-card-alt px-4 py-2.5 mb-5">
            <span className="text-sm text-muted">Editing an existing quiz.</span>
            <button type="button" onClick={resetForm} className="text-xs font-semibold text-gold inline-flex items-center gap-1"><X size={13} /> Cancel edit</button>
          </div>
        )}

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
            <Button type="submit" isLoading={isSaving} className="self-start">{editingId ? 'Save Changes' : 'Create Quiz'}</Button>
          </form>
        ) : (
          <form onSubmit={handleUpload} className="flex flex-col gap-4 max-w-md">
            <p className="text-sm text-muted">
              Upload a file (like a lesson) to use as the quiz paper. Students answer by uploading
              their own file back, and you review and grade those submissions yourself.
            </p>
            <Input label="Quiz title" required value={title} onChange={(e) => setTitle(e.target.value)} />

            {editingId && editingSourceUrl && (
              <a href={`/${editingSourceUrl}`.replace(/\/+/g, '/')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-gold">
                <FileText size={15} /> Current file
              </a>
            )}

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-heading mb-1.5 block">
                {editingId ? 'Replace file (optional — leave blank to keep the current one)' : 'Quiz file (PDF, DOCX, PPTX, image, or text)'}
              </label>
              <input type="file" accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg,.txt" onChange={(e) => setUploadFile(e.target.files[0])} className="text-sm text-body" />
            </div>
            {error && <p className="text-sm text-danger bg-danger-bg rounded-lg px-4 py-2.5">{error}</p>}
            <Button type="submit" isLoading={isSaving} disabled={!editingId && !uploadFile} className="self-start">
              <Upload size={15} /> {editingId ? 'Save Changes' : 'Upload Quiz'}
            </Button>
          </form>
        )}
      </Card>

      <Card>
        <CardHeader title="Existing quizzes" />
        {quizzes === null ? <PageSpinner /> : quizzes.length === 0 ? (
          <p className="text-sm text-muted">No quizzes yet for this class.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {quizzes.map((q) => {
              const isFile = q.quiz_type === 'file';
              return (
                <div key={q.quiz_id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-heading">{q.title}</p>
                    <p className="text-xs text-muted">
                      {isFile ? 'File submission quiz' : `${q.question_count} questions`}
                      {q.quiz_type === 'ai_generated' && ' · AI-generated'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isFile && q.source_file_url && (
                      <a href={`/${q.source_file_url}`.replace(/\/+/g, '/')} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="secondary"><FileText size={14} /> File</Button>
                      </a>
                    )}
                    <Link to={`/teacher/quizzes/${q.quiz_id}/results`}>
                      <Button size="sm" variant="secondary"><BarChart2 size={14} /> Results</Button>
                    </Link>
                    <button onClick={() => startEdit(q)} className="text-muted hover:text-gold p-1.5" title="Modify quiz"><Pencil size={15} /></button>
                    {q.is_published ? (
                      <Badge tone="success"><CheckCircle2 size={12} className="inline mr-1" />Published</Badge>
                    ) : (
                      <Button size="sm" onClick={() => handlePublish(q.quiz_id)}>Publish</Button>
                    )}
                    <button onClick={() => setDeleteTarget(q)} className="text-muted hover:text-danger p-1.5" title="Delete quiz"><Trash2 size={15} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this quiz?"
        description={`"${deleteTarget?.title}" will be permanently removed. If a student has already submitted an answer, this will be blocked to protect their results.`}
      />
    </div>
  );
}
