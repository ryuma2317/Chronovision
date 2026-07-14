import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../lib/api';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import useAsyncAction from '../../hooks/useAsyncAction';

// ADMIN — the curriculum editor. This page is the whole point of the refactor:
// the courses a class teaches are now data an admin types in, not names baked
// into six model files.
//
// Route:  /admin/classes/:id/courses

const DIFFICULTY_LABELS = {
  1: '1 — Easy',
  2: '2 — Light',
  3: '3 — Moderate',
  4: '4 — Hard',
  5: '5 — Hardest',
};

const blankForm = { course_name: '', course_code: '', credits: 3, difficulty_level: 3 };

export default function ClassCourses() {
  const { id: classId } = useParams();

  const [cls, setCls] = useState(null);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () =>
    api
      .get(`/admin/classes/${classId}/courses`)
      .then((r) => {
        setCls(r.data.class);
        setCourses(r.data.courses);
      })
      .catch(() => setError('Could not load courses for this class.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const { run: save, loading: saving } = useAsyncAction(async () => {
    setError('');
    try {
      if (editingId) {
        await api.put(`/admin/courses/${editingId}`, form);
      } else {
        await api.post(`/admin/classes/${classId}/courses`, form);
      }
      setForm(blankForm);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the course.');
    }
  });

  const startEdit = (c) => {
    setEditingId(c.course_id);
    setForm({
      course_name: c.course_name,
      course_code: c.course_code || '',
      credits: c.credits,
      difficulty_level: c.difficulty_level,
    });
  };

  const deactivate = async (c) => {
    setError('');
    try {
      await api.delete(`/admin/courses/${c.course_id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not remove the course.');
    }
  };

  const totalCredits = courses
    .filter((c) => c.is_active)
    .reduce((sum, c) => sum + Number(c.credits), 0);

  if (loading) return <SkeletonCard />;

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="text-lg font-bold text-navy">
          Courses — {cls?.class_name}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          These are the courses this class teaches. Students enrolled in this class see
          exactly this list when they run a prediction or generate a study plan.{' '}
          <strong>Credits</strong> decide how hard a course pulls on the GPA.{' '}
          <strong>Difficulty</strong> tells the model how demanding it is — that is how a
          brand-new course gets predicted without retraining anything.
        </p>
        {totalCredits > 0 && (
          <p className="mt-2 text-sm text-gray-600">
            {courses.filter((c) => c.is_active).length} active courses ·{' '}
            <strong>{totalCredits} total credits</strong>
          </p>
        )}
      </Card>

      {/* ── Add / edit ─────────────────────────────────────────── */}
      <Card>
        <h2 className="text-base font-bold text-navy mb-4">
          {editingId ? 'Edit course' : 'Add a course'}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Course name"
            placeholder="e.g. Khmer Literature"
            value={form.course_name}
            onChange={(e) => setForm((f) => ({ ...f, course_name: e.target.value }))}
          />
          <Input
            label="Course code (optional)"
            placeholder="e.g. KHM101"
            value={form.course_code}
            onChange={(e) => setForm((f) => ({ ...f, course_code: e.target.value }))}
          />
          <Select
            label="Credits"
            value={form.credits}
            onChange={(e) => setForm((f) => ({ ...f, credits: Number(e.target.value) }))}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'credit' : 'credits'}
              </option>
            ))}
          </Select>
          <Select
            label="Difficulty"
            value={form.difficulty_level}
            onChange={(e) =>
              setForm((f) => ({ ...f, difficulty_level: Number(e.target.value) }))
            }
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {DIFFICULTY_LABELS[n]}
              </option>
            ))}
          </Select>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex gap-3">
          <Button disabled={saving || !form.course_name.trim()} onClick={save}>
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add course'}
          </Button>
          {editingId && (
            <Button
              variant="secondary"
              onClick={() => {
                setEditingId(null);
                setForm(blankForm);
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </Card>

      {/* ── List ───────────────────────────────────────────────── */}
      <Card>
        <h2 className="text-base font-bold text-navy mb-4">Current courses</h2>

        {courses.length === 0 ? (
          <EmptyState
            title="No courses yet"
            description="Add the courses this class teaches. Until you do, students in this class cannot run a prediction."
          />
        ) : (
          <div className="space-y-2">
            {courses.map((c) => (
              <div
                key={c.course_id}
                className={`flex items-center justify-between rounded-lg border border-black/5 p-3 ${
                  c.is_active ? '' : 'opacity-50'
                }`}
              >
                <div>
                  <p className="font-semibold text-navy">
                    {c.course_name}
                    {c.course_code && (
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        {c.course_code}
                      </span>
                    )}
                    {!c.is_active && (
                      <Badge className="ml-2" variant="secondary">
                        inactive
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {c.credits} credits · difficulty {c.difficulty_level}/5
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => startEdit(c)}>
                    Edit
                  </Button>
                  {c.is_active === 1 && (
                    <Button variant="danger" onClick={() => deactivate(c)}>
                      Remove
                    </Button>
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
