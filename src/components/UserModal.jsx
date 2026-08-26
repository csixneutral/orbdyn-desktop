import React, { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { showNotification } from '@/lib/notify';
import { api } from '../api';
import { useData } from '../context/DataContext';
import { ROLE_OPTIONS } from '@/lib/roles';

export function UserModal({ editUser, opened, onClose }) {
  const { refresh } = useData();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('manager');
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editUser) {
      setName(editUser.name || '');
      setUsername(editUser.username || '');
      setEmail(editUser.email || '');
      setPassword('');
      setRole(editUser.role || 'manager');
      setActive(editUser.active !== false);
    } else {
      setName('');
      setUsername('');
      setEmail('');
      setPassword('');
      setRole('manager');
      setActive(true);
    }
  }, [editUser, opened]);

  const handleSave = async () => {
    if (!name.trim() || !username.trim()) {
      showNotification({ title: 'Error', message: 'Name and Username are required', color: 'red' });
      return;
    }
    if (!editUser && (!password || password.length < 6)) {
      showNotification({
        title: 'Error',
        message: 'Password must be at least 6 characters',
        color: 'red',
      });
      return;
    }
    try {
      setSubmitting(true);
      if (editUser?.id) {
        const payload = { name, role, email, active };
        if (password) payload.password = password;
        await api.updateUser(editUser.id, payload);
        showNotification({ title: 'Success', message: 'Person updated', color: 'green' });
      } else {
        await api.createUser({ name, username, email, password, role });
        showNotification({ title: 'Success', message: 'Person added to workspace', color: 'green' });
      }
      refresh();
      onClose();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={opened} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[620px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{editUser ? 'Edit Person' : 'Add Person'}</DialogTitle>
              <DialogDescription>Manage workspace member roles and access</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              placeholder="e.g. Sarah Jenkins"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                placeholder="e.g. sjenkins"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!!editUser}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email (Optional)</Label>
              <Input
                placeholder="sarah@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              {editUser ? 'New Password (leave blank to keep current)' : 'Starting Password'}
            </Label>
            <PasswordInput
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!editUser}
            />
          </div>

          <div className="space-y-2">
            <Label>Role & Permissions</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {editUser && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="active-switch">Account Active</Label>
              <Switch id="active-switch" checked={active} onCheckedChange={setActive} />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting && <Spinner />}
              {editUser ? 'Save Changes' : 'Add Person'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
