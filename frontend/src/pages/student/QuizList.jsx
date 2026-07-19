import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import * as studentApi from '../../lib/endpoints/student';
import useMyClasses from '../../hooks/useMyClasses';
import { Card } from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

export default function QuizList() {
  const { classes, isLoading: classesLoading, selectedClassId, setSelectedClassId } = useMyClasses();
  const [quizzes, setQuizzes] = useState(null);

  useEffect(() => {
    if (!selectedClassId) return;
    setQuizzes(null);
    studentApi.getQuizzes(selectedClassId).then(setQuizzes).catch(() => setQuizzes([]));
  }, [selectedClassId]);

  if (classesLoading) return <PageSpinner />;
  if (classes.length === 0) {
    return <EmptyState icon={<ClipboardList size={40} />} title="No classes yet" description="You'll see quizzes here once you're enrolled in a class." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-heading">Quizzes</h1>
        <Select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-56">
          {classes.map((c) => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
        </Select>
      </div>

      {quizzes === null ? (
        <PageSpinner />
      ) : quizzes.length === 0 ? (
        <EmptyState icon={<ClipboardList size={40} />} title="No quizzes yet" description="Your teacher hasn't published any quizzes for this class." />
      ) : (
        <div className="flex flex-col gap-3">
          {quizzes.map((q) => {
            const isFile = q.quiz_type === 'file';
            return (
              <Card key={q.quiz_id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-heading">{q.title}</p>
                  <p className="text-xs text-muted">
                    {isFile ? 'Upload your answer as a file' : `${q.question_count} questions`}
                    {q.time_limit_minutes ? ` · ${q.time_limit_minutes} min` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isFile && <Badge tone="info">File</Badge>}
                  {q.quiz_type === 'ai_generated' && <Badge tone="info">AI-generated</Badge>}
                  <Link to={`/student/quizzes/${q.quiz_id}`}><Button size="sm">{isFile ? 'Open' : 'Take Quiz'}</Button></Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
