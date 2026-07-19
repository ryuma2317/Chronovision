import { useEffect, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import * as teacherApi from '../../lib/endpoints/teacher';
import { apiErrorMessage } from '../../lib/api';
import useMyClasses from '../../hooks/useMyClasses';
import { Card, CardHeader } from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Avatar from '../../components/ui/Avatar';
import { PageSpinner } from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';

const STATUSES = ['present', 'late', 'excused', 'absent'];
const STATUS_TONE = { present: 'bg-success text-white', late: 'bg-warning text-white', excused: 'bg-info text-white', absent: 'bg-danger text-white' };

export default function AttendanceManager() {
  const { classes, isLoading: classesLoading, selectedClassId, setSelectedClassId } = useMyClasses();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState(null);
  const [marks, setMarks] = useState({});
  const toast = useToast();

  useEffect(() => {
    if (!selectedClassId) return;
    // getClassStudents returns { class, members } — not a bare array. Rendering
    // used to call students.map() on that object and crash the page. Pull the
    // members out and keep only students (the endpoint also includes teachers).
    setStudents(null);
    teacherApi.getClassStudents(selectedClassId)
      .then((res) => {
        const members = Array.isArray(res) ? res : (res?.members || []);
        setStudents(members.filter((m) => m.role === 'student'));
      })
      .catch(() => setStudents([]));
  }, [selectedClassId]);

  useEffect(() => {
    if (!selectedClassId) return;
    teacherApi.getClassAttendance(selectedClassId, date).then((records) => {
      const m = {};
      records.forEach((r) => { m[r.student_id] = r.status; });
      setMarks(m);
    }).catch(() => setMarks({}));
  }, [selectedClassId, date]);

  const mark = async (studentId, status) => {
    setMarks((m) => ({ ...m, [studentId]: status }));
    try {
      await teacherApi.markAttendance({ class_id: selectedClassId, student_id: studentId, date, status });
    } catch (err) {
      toast?.(apiErrorMessage(err, 'Could not save attendance.'), 'error');
    }
  };

  if (classesLoading) return <PageSpinner />;
  if (classes.length === 0) {
    return <EmptyState icon={<CalendarCheck size={40} />} title="No classes assigned" description="You'll be able to mark attendance once you're assigned a class." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-heading">Attendance</h1>
        <div className="flex gap-3">
          <Select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-48">
            {classes.map((c) => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
          </Select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-heading" />
        </div>
      </div>

      <Card>
        <CardHeader title="Mark attendance" subtitle="Quizzes also auto-mark students present — manual marks override that." />
        {students === null ? <PageSpinner /> : (
          <div className="flex flex-col divide-y divide-border">
            {students.map((s) => {
              const fullName = `${s.first_name} ${s.last_name}`;
              return (
                <div key={s.user_id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <Avatar name={fullName} size={32} />
                    <p className="text-sm font-semibold text-heading">{fullName}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {STATUSES.map((st) => (
                      <button
                        key={st}
                        onClick={() => mark(s.user_id, st)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-colors ${
                          marks[s.user_id] === st ? STATUS_TONE[st] : 'bg-input text-muted hover:text-heading'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
