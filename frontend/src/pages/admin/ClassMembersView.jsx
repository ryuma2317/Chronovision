import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { UserPlus, Upload, Download, CheckCircle2, XCircle } from 'lucide-react';
import * as adminApi from '../../lib/endpoints/admin';
import { apiErrorMessage } from '../../lib/api';
import { Card, CardHeader } from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { PageSpinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';

const REASON_LABEL = {
  not_found: 'No account found for this email',
  not_a_student: 'Account exists but is not a student',
  already_enrolled: 'Already enrolled in this class',
  error: 'Could not be added',
};

export default function ClassMembersView() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [allTeachers, setAllTeachers] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
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

  const uploadRoster = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await adminApi.bulkEnrollStudents(id, fd);
      setResult(res);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      refresh();
      toast?.(`${res.summary.added} added, ${res.summary.skipped} skipped.`, res.summary.added ? 'success' : 'info');
    } catch (err) {
      toast?.(apiErrorMessage(err, 'Could not process the roster file.'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'Name,Email\nJohn Doe,john.doe@example.edu\nJane Smith,jane.smith@example.edu\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_roster_template.csv';
    a.click();
    URL.revokeObjectURL(url);
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

          {/* Manual add (one by one) */}
          <div className="flex gap-2 mb-3">
            <Select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} className="flex-1">
              <option value="">Select a student...</option>
              {availableStudents.map((s) => <option key={s.user_id} value={s.user_id}>{s.first_name} {s.last_name}</option>)}
            </Select>
            <Button size="sm" onClick={addStudent} disabled={!selectedStudent}><UserPlus size={14} /></Button>
          </div>

          {/* Bulk upload */}
          <div className="rounded-md border border-dashed border-border p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-heading">Bulk enroll from a file</span>
              <button onClick={downloadTemplate} className="text-xs text-muted hover:text-heading inline-flex items-center gap-1">
                <Download size={12} /> Template
              </button>
            </div>
            <div className="flex gap-2 items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.docx,.pdf,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="flex-1 text-xs text-muted file:mr-2 file:rounded file:border-0 file:bg-input file:px-2 file:py-1 file:text-heading"
              />
              <Button size="sm" onClick={uploadRoster} disabled={!file} isLoading={uploading}>
                <Upload size={14} />
              </Button>
            </div>
            <p className="text-[11px] text-muted mt-1.5">Accepts CSV, Excel, Word, PDF, or text. Students are matched by email.</p>
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

      {/* Bulk enrollment results */}
      <Modal
        isOpen={!!result}
        onClose={() => setResult(null)}
        title="Enrollment results"
        size="lg"
        footer={<Button onClick={() => setResult(null)}>Done</Button>}
      >
        {result && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-body">
              <span className="font-semibold text-heading">{result.summary.added}</span> added,{' '}
              <span className="font-semibold text-heading">{result.summary.skipped}</span> skipped
              {' '}of {result.summary.total}.
            </p>

            {result.added.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-heading mb-1.5">Added</p>
                <div className="flex flex-col gap-1">
                  {result.added.map((a) => (
                    <div key={a.email} className="flex items-center gap-2 text-sm text-body">
                      <CheckCircle2 size={15} className="text-success shrink-0" />
                      <span className="text-heading">{a.name}</span>
                      <span className="text-muted text-xs">{a.email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.skipped.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-heading mb-1.5">Skipped</p>
                <div className="flex flex-col gap-1">
                  {result.skipped.map((sk, i) => (
                    <div key={`${sk.email}-${i}`} className="flex items-center gap-2 text-sm">
                      <XCircle size={15} className="text-danger shrink-0" />
                      <span className="text-heading">{sk.name || sk.email}</span>
                      <span className="text-muted text-xs">
                        {REASON_LABEL[sk.reason] || sk.reason}{sk.reason === 'error' && sk.detail ? `: ${sk.detail}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
