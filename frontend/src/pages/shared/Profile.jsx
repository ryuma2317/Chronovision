import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { apiErrorMessage } from '../../lib/api';
import * as authApi from '../../lib/endpoints/auth';
import { Card, CardHeader } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';

export default function Profile() {
  const { user, refreshProfile } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({ first_name: user?.first_name || '', last_name: user?.last_name || '', email: user?.email || '' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await authApi.updateMe(form);
      await refreshProfile();
      toast?.('Profile updated successfully.', 'success');
    } catch (err) {
      toast?.(apiErrorMessage(err, 'Could not update profile.'), 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast?.('New password and confirmation do not match.', 'error');
      return;
    }
    setSavingPw(true);
    try {
      await authApi.updateMe({ current_password: pwForm.current_password, new_password: pwForm.new_password });
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
      toast?.('Password changed successfully.', 'success');
    } catch (err) {
      toast?.(apiErrorMessage(err, 'Could not change password.'), 'error');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-heading mb-6">Profile & Account Settings</h1>

      <Card className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Avatar name={fullName} size={56} />
          <div>
            <p className="text-lg font-bold text-heading">{fullName || 'Your name'}</p>
            <Badge tone="gold">{user?.role}</Badge>
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <CardHeader title="Personal information" />
        <form onSubmit={handleProfileSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="First name" required value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
          <Input label="Last name" required value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
          <Input label="Email" type="email" required className="sm:col-span-2" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <div className="sm:col-span-2">
            <Button type="submit" isLoading={savingProfile}>Save changes</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Change password" />
        <form onSubmit={handlePasswordSubmit} className="grid grid-cols-1 gap-4">
          <Input
            label="Current password"
            type="password"
            required
            value={pwForm.current_password}
            onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="New password"
              type="password"
              required
              minLength={8}
              value={pwForm.new_password}
              onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
            />
            <Input
              label="Confirm new password"
              type="password"
              required
              value={pwForm.confirm_password}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm_password: e.target.value }))}
            />
          </div>
          <div>
            <Button type="submit" variant="secondary" isLoading={savingPw}>Update password</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
