import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import * as adminApi from '../../lib/endpoints/admin';
import { apiErrorMessage } from '../../lib/api';
import { Card, CardHeader } from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';

export default function ClassMembersView() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [allTeachers, setAllTeachers] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const toast = useToast();

  const refresh = () => adminApi.getClassMembers(id).then(setData).catch(() => setData(null));

  useEffect(() => {
    refresh();
    adminApi.getUsers('teacher').then(setAllTeachers).catch(() => setAllTeachers([]));
    adminApi.getUsers('student').then(setAllStudents).catch(() => setAllStudents([]));
  }, [id]);

  if (data === null) return <PageSpinner />;

  const teachers = data.members.filter((m) => m.role === 'teacher');
  const students = data.members.filter((m) => m.role === 'student');

  const addTeacher = async () => {
    if (!selectedTeacher) return;
    try {
      await adminApi.addTeacherToClass(id, selectedTeacher);
      setSelectedTeacher('');
      refresh();
      toast?.('Teacher added.', 'success');
    } catch (err) {
      toast?.(apiErrorMessage(err, 'Could not add teacher.'), 'error');
    }
  };

  const addStudent = async () => {
    if (!selectedStudent) return;
    try {
      await adminApi.addStudentToClass(id, selectedStudent);
      setSelectedStudent('');
      refresh();
      toast?.('Student added.', 'success');
    } catch (err) {
      toast?.(apiErrorMessage(err, 'Could not add student.'), 'error');
    }
  };

  const availableTeachers = allTeachers.filter((t) => !teachers.some((m) => m.user_id === t.user_id));
  const availableStudents = allStudents.filter((s) => !students.some((m) => m.user_id === s.user_id));

  return (
    <div>
      <h1 className="text-2xl font-bold text-heading mb-1">{data.class.class_name}</h1>
      <p className="text-sm text-muted mb-6">{data.class.academic_year} &middot; {data.class.semester}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Teachers" />
          <div className="flex gap-2 mb-4">
            <Select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} className="flex-1">
              <option value="">Select a teacher...</option>
              {availableTeachers.map((t) => <option key={t.user_id} value={t.user_id}>{t.first_name} {t.last_name}</option>)}
            </Select>
            <Button size="sm" onClick={addTeacher} disabled={!selectedTeacher}><UserPlus size={14} /></Button>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {teachers.map((t) => (
              <div key={t.user_id} className="flex items-center gap-3 py-2.5 first:pt-0">
                <Avatar name={`${t.first_name} ${t.last_name}`} size={28} />
                <span className="text-sm text-heading">{t.first_name} {t.last_name}</span>
              </div>
            ))}
            {teachers.length === 0 && <p className="text-sm text-muted py-2">No teacher assigned yet.</p>}
          </div>
        </Card>

        <Card>
          <CardHeader title="Students" action={<Badge tone="gold">{students.length}</Badge>} />
          <div className="flex gap-2 mb-4">
            <Select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} className="flex-1">
              <option value="">Select a student...</option>
              {availableStudents.map((s) => <option key={s.user_id} value={s.user_id}>{s.first_name} {s.last_name}</option>)}
            </Select>
            <Button size="sm" onClick={addStudent} disabled={!selectedStudent}><UserPlus size={14} /></Button>
          </div>
          <div className="flex flex-col divide-y divide-border max-h-96 overflow-y-auto">
            {students.map((s) => (
              <div key={s.user_id} className="flex items-center gap-3 py-2.5 first:pt-0">
                <Avatar name={`${s.first_name} ${s.last_name}`} size={28} />
                <span className="text-sm text-heading">{s.first_name} {s.last_name}</span>
              </div>
            ))}
            {students.length === 0 && <p className="text-sm text-muted py-2">No students enrolled yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
