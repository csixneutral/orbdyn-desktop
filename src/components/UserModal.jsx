import React, { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  PasswordInput,
  Select,
  Switch,
  Button,
  Group,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUser } from '@tabler/icons-react';
import { api } from '../api';
import { useData } from '../context/DataContext';

export function UserModal({ editUser, opened, onClose }) {
  const { refresh } = useData();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('member');
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editUser) {
      setName(editUser.name || '');
      setUsername(editUser.username || '');
      setEmail(editUser.email || '');
      setPassword('');
      setRole(editUser.role || 'member');
      setActive(editUser.active !== false);
    } else {
      setName('');
      setUsername('');
      setEmail('');
      setPassword('');
      setRole('member');
      setActive(true);
    }
  }, [editUser, opened]);

  const handleSave = async () => {
    if (!name.trim() || !username.trim()) {
      notifications.show({ title: 'Error', message: 'Name and Username are required', color: 'red' });
      return;
    }
    if (!editUser && (!password || password.length < 6)) {
      notifications.show({ title: 'Error', message: 'Password must be at least 6 characters', color: 'red' });
      return;
    }
    try {
      setSubmitting(true);
      if (editUser?.id) {
        const payload = { name, role, email, active };
        if (password) payload.password = password;
        await api.updateUser(editUser.id, payload);
        notifications.show({ title: 'Success', message: 'Person updated', color: 'green' });
      } else {
        await api.createUser({ name, username, email, password, role });
        notifications.show({ title: 'Success', message: 'Person added to workspace', color: 'green' });
      }
      refresh();
      onClose();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      centered
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <ThemeIcon size={36} radius="md" color="blue" variant="light">
            <IconUser size={22} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="lg">{editUser ? 'Edit Person' : 'Add Person'}</Text>
            <Text size="xs" c="dimmed">Manage workspace member roles and access</Text>
          </div>
        </Group>
      }
      size={620}
      radius="lg"
      overlayProps={{ backgroundOpacity: 0.6, blur: 4 }}
      padding="xl"
    >
      <Stack spacing="md">
        <TextInput
          label="Full Name"
          placeholder="e.g. Sarah Jenkins"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
        />

        <Group grow>
          <TextInput
            label="Username"
            placeholder="e.g. sjenkins"
            value={username}
            onChange={(e) => setUsername(e.currentTarget.value)}
            disabled={!!editUser}
            required
          />
          <TextInput
            label="Email (Optional)"
            placeholder="sarah@example.com"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
        </Group>

        <PasswordInput
          label={editUser ? 'New Password (leave blank to keep current)' : 'Starting Password'}
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          required={!editUser}
        />

        <Select
          label="Role & Permissions"
          data={[
            { value: 'admin', label: 'Administrator (Full Access)' },
            { value: 'member', label: 'Member (Create & Edit Work)' },
            { value: 'viewer', label: 'Viewer (Read-only)' },
          ]}
          value={role}
          onChange={setRole}
        />

        {editUser && (
          <Switch
            label="Account Active"
            checked={active}
            onChange={(e) => setActive(e.currentTarget.checked)}
          />
        )}

        <Group position="right" mt="md">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button color="blue" onClick={handleSave} loading={submitting}>
            {editUser ? 'Save Changes' : 'Add Person'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
