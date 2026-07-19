import { useEffect, useState } from 'react';
import { Upload, FileText, CheckCircle2, Trash2 } from 'lucide-react';
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

export default function LessonsManager() {
  const { classes, isLoading: classesLoading, selectedClassId, setSelectedClassId } = useMyClasses();
  const [lessons, setLessons] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const toast = useToast();

  const refresh = () => {
    if (!selectedClassId) return;
    teacherApi.getLessonsForClass(selectedClassId).then(setLessons).catch(() => setLessons([]));
  };

  useEffect(refresh, [selectedClassId]);

  const handleUpload = async (e) => {
    e.preventDefault();
    setError('');
    if (!file) { setError('Choose a file to upload.'); return; }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('class_id', selectedClassId);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('file', file);
      await teacherApi.uploadLesson(formData);
      setTitle(''); setDescription(''); setFile(null);
      refresh();
      toast?.('Lesson uploaded.', 'success');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not upload the lesson.'));
    } finally {
      setIsUploading(false);
    }
  };

  const handlePublish = async (id) => {
    try {
      await teacherApi.publishLesson(id);
      refresh();
      toast?.('Lesson published.', 'success');
    } catch (err) {
      toast?.(apiErrorMessage(err, 'Could not publish.'), 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await teacherApi.deleteLesson(target.lesson_id);
      refresh();
      toast?.('Lesson deleted.', 'success');
    } catch (err) {
      toast?.(apiErrorMessage(err, 'Could not delete this lesson.'), 'error');
    }
  };

  if (classesLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-heading">Lessons</h1>
        <Select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-56">
          {classes.map((c) => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
        </Select>
      </div>

      <Card className="mb-6">
        <CardHeader title="Upload new lesson" />
        <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="sm:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wide text-heading mb-1.5 block">File (PDF, DOCX, PPTX, video, or image)</label>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} className="text-sm text-body" />
          </div>
          {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
          <Button type="submit" isLoading={isUploading} className="self-start"><Upload size={15} /> Upload</Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Published & draft lessons" />
        {lessons === null ? <PageSpinner /> : lessons.length === 0 ? (
          <p className="text-sm text-muted">No lessons uploaded yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {lessons.map((l) => (
              <div key={l.lesson_id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-gold" />
                  <div>
                    <p className="text-sm font-semibold text-heading">{l.title}</p>
                    <p className="text-xs text-muted">{l.description}</p>
                  </div>
                </div>
                {l.is_published ? (
                  <div className="flex items-center gap-2">
                    <Badge tone="success"><CheckCircle2 size={12} className="inline mr-1" />Published</Badge>
                    <button onClick={() => setDeleteTarget(l)} className="text-muted hover:text-danger p-1" title="Delete lesson"><Trash2 size={15} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => handlePublish(l.lesson_id)}>Publish</Button>
                    <button onClick={() => setDeleteTarget(l)} className="text-muted hover:text-danger p-1" title="Delete lesson"><Trash2 size={15} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this lesson?"
        description={`"${deleteTarget?.title}" will be removed for everyone in this class. This cannot be undone.`}
      />
    </div>
  );
}
