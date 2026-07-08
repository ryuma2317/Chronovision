import { useEffect, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import * as studentApi from '../../lib/endpoints/student';
import { Card, CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

const STATUS_TONE = { present: 'success', late: 'warning', excused: 'info', absent: 'danger' };
const STATUS_COLOR = { present: 'bg-success', late: 'bg-warning', excused: 'bg-info', absent: 'bg-danger' };

export default function Attendance() {
  const [records, setRecords] = useState(null);

  useEffect(() => {
    studentApi.getMyAttendance().then(setRecords).catch(() => setRecords([]));
  }, []);

  if (records === null) return <PageSpinner />;
  if (records.length === 0) {
    return <EmptyState icon={<CalendarCheck size={40} />} title="No attendance recorded yet" description="Attendance is logged automatically when you complete a quiz, or marked manually by your teacher." />;
  }

  const sorted = [...records].sort((a, b) => new Date(b.session_date) - new Date(a.session_date));
  const recent = sorted.slice(0, 35).reverse();
  const presentCount = records.filter((r) => r.status === 'present' || r.status === 'late' || r.status === 'excused').length;
  const rate = Math.round((presentCount / records.length) * 100);

  return (
    <div>
      <h1 className="text-2xl font-bold text-heading mb-6">Attendance</h1>

      <Card className="mb-6">
        <CardHeader title="Overview" />
        <div className="flex items-center gap-6">
          <div>
            <p className="text-3xl font-extrabold text-heading">{rate}%</p>
            <p className="text-xs text-muted uppercase">attendance rate</p>
          </div>
          <div className="flex-1 grid grid-cols-4 gap-2">
            {['present', 'late', 'excused', 'absent'].map((s) => (
              <div key={s} className="text-center">
                <p className="text-lg font-bold text-heading">{records.filter((r) => r.status === s).length}</p>
                <Badge tone={STATUS_TONE[s]}>{s}</Badge>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <CardHeader title="Recent sessions" subtitle="Last 35 logged sessions" />
        <div className="flex flex-wrap gap-1.5">
          {recent.map((r, i) => (
            <div
              key={i}
              title={`${r.session_date} — ${r.status}`}
              className={`h-7 w-7 rounded ${STATUS_COLOR[r.status] || 'bg-border'}`}
            />
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Full history" />
        <div className="flex flex-col divide-y divide-border">
          {sorted.map((r, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 text-sm">
              <span className="text-body">{r.class_name}</span>
              <span className="text-muted">{new Date(r.session_date).toLocaleDateString()}</span>
              <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
