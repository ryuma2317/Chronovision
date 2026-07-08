import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import * as adminApi from '../../lib/endpoints/admin';
import { apiErrorMessage } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import { PageSpinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';

const emptyForm = { class_name: '', description: '', academic_year: '', semester: '' };

export default function ClassManagement() {
  const [classes, setClasses] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  const refresh = () => adminApi.getClasses().then(setClasses).catch(() => setClasses([]));
  useEffect(refresh, []);

  const openCreate = () => { setEditingClass(null); setForm(emptyForm); setError(''); setModalOpen(true); };
  const openEdit = (c) => { setEditingClass(c); setForm({ class_name: c.class_name, description: c.description || '', academic_year: c.academic_year, semester: c.semester }); setError(''); setModalOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setIsSaving(true);
    try {
      if (editingClass) {
        await adminApi.updateClass(editingClass.class_id, form);
        toast?.('Class updated.', 'success');
      } else {
        await adminApi.createClass(form);
        toast?.('Class created.', 'success');
      }
      setModalOpen(false);
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save this class.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await adminApi.deleteClass(deleteTarget.class_id);
      toast?.('Class deleted.', 'success');
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast?.(apiErrorMessage(err, 'Could not delete this class.'), 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-heading">Class Management</h1>
        <Button onClick={openCreate}><Plus size={15} /> New Class</Button>
      </div>

      {classes === null ? <PageSpinner /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => (
            <Card key={c.class_id}>
              <p className="text-sm font-bold text-heading">{c.class_name}</p>
              <p className="text-xs text-muted mb-3">{c.academic_year} &middot; {c.semester}</p>
              {c.description && <p className="text-sm text-body mb-3">{c.description}</p>}
              <div className="flex items-center gap-2">
                <Link to={`/admin/classes/${c.class_id}`}>
                  <Button size="sm" variant="secondary"><Users size={14} /> Members</Button>
                </Link>
                <button onClick={() => openEdit(c)} className="text-muted hover:text-gold p-2"><Pencil size={15} /></button>
                <button onClick={() => setDeleteTarget(c)} className="text-muted hover:text-danger p-2"><Trash2 size={15} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingClass ? 'Edit Class' : 'New Class'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Class name" required value={form.class_name} onChange={(e) => setForm((f) => ({ ...f, class_name: e.target.value }))} />
          <Input label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Academic year" required placeholder="2026-2027" value={form.academic_year} onChange={(e) => setForm((f) => ({ ...f, academic_year: e.target.value }))} />
            <Input label="Semester" required placeholder="Fall" value={form.semester} onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value }))} />
          </div>
          {error && <p className="text-sm text-danger bg-danger-bg rounded-lg px-4 py-2.5">{error}</p>}
          <Button type="submit" isLoading={isSaving}>{editingClass ? 'Save Changes' : 'Create Class'}</Button>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this class?"
        description={`This removes "${deleteTarget?.class_name}" and its teacher/student assignments. This cannot be undone.`}
      />
    </div>
  );
}
