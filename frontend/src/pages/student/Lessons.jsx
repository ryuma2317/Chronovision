import { useEffect, useState } from 'react';
import { BookOpen, FileText, Video, Image as ImageIcon, Link as LinkIcon, FileBox } from 'lucide-react';
import * as studentApi from '../../lib/endpoints/student';
import useMyClasses from '../../hooks/useMyClasses';
import { Card } from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

const ICONS = { pdf: <FileText size={18} />, video: <Video size={18} />, pptx: <FileBox size={18} />, docx: <FileText size={18} />, image: <ImageIcon size={18} />, link: <LinkIcon size={18} /> };

export default function Lessons() {
  const { classes, isLoading: classesLoading, selectedClassId, setSelectedClassId } = useMyClasses();
  const [lessons, setLessons] = useState(null);
  const [viewedIds, setViewedIds] = useState(new Set());

  useEffect(() => {
    if (!selectedClassId) return;
    setLessons(null);
    studentApi.getLessons(selectedClassId).then(setLessons).catch(() => setLessons([]));
  }, [selectedClassId]);

  const handleView = async (lesson) => {
    try {
      await studentApi.viewLesson(lesson.lesson_id);
      setViewedIds((s) => new Set(s).add(lesson.lesson_id));
    } catch {
      // non-critical — viewing the file still works even if logging the view fails
    }
    window.open(`/${lesson.file_url}`.replace(/\/+/g, '/'), '_blank');
  };

  if (classesLoading) return <PageSpinner />;
  if (classes.length === 0) {
    return <EmptyState icon={<BookOpen size={40} />} title="No classes yet" description="Lessons will show up here once you're enrolled in a class." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-heading">Lessons</h1>
        <Select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-56">
          {classes.map((c) => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
        </Select>
      </div>

      {lessons === null ? (
        <PageSpinner />
      ) : lessons.length === 0 ? (
        <EmptyState icon={<BookOpen size={40} />} title="No lessons published yet" description="Your teacher hasn't shared any lesson material for this class yet." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lessons.map((l) => (
            <Card key={l.lesson_id} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="text-gold">{ICONS[l.file_type] || <FileText size={18} />}</div>
                <div>
                  <p className="text-sm font-semibold text-heading">{l.title}</p>
                  <p className="text-xs text-muted">{l.description}</p>
                </div>
              </div>
              <Button size="sm" variant={viewedIds.has(l.lesson_id) ? 'secondary' : 'primary'} onClick={() => handleView(l)}>
                {viewedIds.has(l.lesson_id) ? 'Viewed' : 'View'}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
