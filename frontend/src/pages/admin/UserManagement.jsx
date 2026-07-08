import { useEffect, useState } from 'react';
import { Plus, Pencil, UserX } from 'lucide-react';
import * as adminApi from '../../lib/endpoints/admin';
import { apiErrorMessage } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import { PageSpinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';

const emptyForm = { first_name: '', last_name: '', email: '', password: '', role: 'student' };

export default function UserManagement() {
  const [users, setUsers] = useState(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  const refresh = () => adminApi.getUsers(roleFilter || undefined).then(setUsers).catch(() => setUsers([]));
  useEffect(() => { setUsers(null); refresh(); }, [roleFilter]);

  const openCreate = () => { setEditingUser(null); setForm(emptyForm); setError(''); setModalOpen(true); };
  const openEdit = (u) => { setEditingUser(u); setForm({ first_name: u.first_name, last_name: u.last_name, email: u.email, password: '', role: u.role }); setError(''); setModalOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setIsSaving(true);
    try {
      if (editingUser) {
        const payload = { first_name: form.first_name, last_name: form.last_name, email: form.email, role: form.role };
        if (form.password) payload.password = form.password;
        await adminApi.updateUser(editingUser.user_id, payload);
        toast?.('User updated.', 'success');
      } else {
        await adminApi.createUser(form);
        toast?.('User created.', 'success');
      }
      setModalOpen(false);
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save this user.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      await adminApi.deactivateUser(deactivateTarget.user_id);
      toast?.('User deactivated.', 'success');
      setDeactivateTarget(null);
      refresh();
    } catch (err) {
      toast?.(apiErrorMessage(err, 'Could not deactivate.'), 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-heading">User Management</h1>
        <div className="flex gap-3">
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-40">
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </Select>
          <Button onClick={openCreate}><Plus size={15} /> New User</Button>
        </div>
      </div>

      {users === null ? <PageSpinner /> : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.user_id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={`${u.first_name} ${u.last_name}`} size={28} />
                        <span className="font-medium text-heading">{u.first_name} {u.last_name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-body">{u.email}</td>
                    <td className="py-2.5 pr-4"><Badge tone="gold">{u.role}</Badge></td>
                    <td className="py-2.5 pr-4">
                      <Badge tone={u.is_active ? 'success' : 'neutral'}>{u.is_active ? 'active' : 'inactive'}</Badge>
                    </td>
                    <td className="py-2.5 text-right">
                      <button onClick={() => openEdit(u)} className="text-muted hover:text-gold p-1.5"><Pencil size={15} /></button>
                      {u.is_active && (
                        <button onClick={() => setDeactivateTarget(u)} className="text-muted hover:text-danger p-1.5"><UserX size={15} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingUser ? 'Edit User' : 'New User'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First name" required value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
            <Input label="Last name" required value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
          </div>
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <Input
            label={editingUser ? 'New password (leave blank to keep current)' : 'Password'}
            type="password" required={!editingUser}
            value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <Select label="Role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </Select>
          {error && <p className="text-sm text-danger bg-danger-bg rounded-lg px-4 py-2.5">{error}</p>}
          <Button type="submit" isLoading={isSaving}>{editingUser ? 'Save Changes' : 'Create User'}</Button>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        title="Deactivate this user?"
        description={`${deactivateTarget?.first_name} ${deactivateTarget?.last_name} will no longer be able to log in. This can be reversed by editing their account.`}
      />
    </div>
  );
}
