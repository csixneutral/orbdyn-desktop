import React, { useState } from 'react';
import {
  Paper,
  Text,
  Title,
  Stack,
  Group,
  TextInput,
  PasswordInput,
  Button,
  Badge,
  Switch,
  Alert,
  Code,
  Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconNetwork, IconWorld, IconLock, IconBellRinging } from '@tabler/icons-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export function SettingsView() {
  const { user, dataFolder } = useAuth();
  const { shareStatus, setShareStatus } = useData();

  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [togglingShare, setTogglingShare] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword || !nextPassword) return;
    try {
      setPasswordLoading(true);
      await api.updatePassword({ current: currentPassword, next: nextPassword });
      notifications.show({ title: 'Success', message: 'Your password has been changed', color: 'green' });
      setCurrentPassword('');
      setNextPassword('');
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleToggleShare = async () => {
    try {
      setTogglingShare(true);
      if (shareStatus.url) {
        const res = await api.stopShare();
        setShareStatus((prev) => ({ ...prev, url: null, online: false }));
        notifications.show({ title: 'Sharing Stopped', message: 'Online link disabled.', color: 'blue' });
      } else {
        notifications.show({ title: 'Starting Tunnel...', message: 'Connecting to Cloudflare...', color: 'blue' });
        const res = await api.startShare();
        if (res.url) {
          setShareStatus((prev) => ({ ...prev, url: res.url, online: true }));
          notifications.show({ title: 'Online Sharing Ready!', message: res.url, color: 'green' });
        } else if (res.error) {
          notifications.show({ title: 'Sharing Failed', message: res.error, color: 'red' });
        }
      }
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setTogglingShare(false);
    }
  };

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Settings & Sharing</Title>
        <Text c="dimmed" size="sm">Manage access addresses, passwords, and internet tunnel controls</Text>
      </div>

      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Group gap="sm">
            <IconWorld size={24} color="#5b8def" />
            <div>
              <Text fw={700}>Internet Sharing (Cloudflare Tunnel)</Text>
              <Text size="xs" c="dimmed">
                Create a temporary HTTPS link for colleagues outside your local Wi-Fi network.
              </Text>
            </div>
          </Group>
          {user?.role === 'admin' && (
            <Button
              color={shareStatus.url ? 'red' : 'blue'}
              loading={togglingShare}
              onClick={handleToggleShare}
            >
              {shareStatus.url ? 'Turn Off Sharing' : 'Turn On Internet Sharing'}
            </Button>
          )}
        </Group>

        {shareStatus.url ? (
          <Alert title="Online Address Active" color="green">
            <Text size="sm" mb="xs">Send this address to remote team members:</Text>
            <Code color="blue" size="md">{shareStatus.url}</Code>
          </Alert>
        ) : (
          <Text size="sm" c="dimmed">Internet sharing is currently turned off.</Text>
        )}
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Group gap="sm" mb="md">
          <IconNetwork size={24} color="#10b981" />
          <div>
            <Text fw={700}>Office Network Access (LAN)</Text>
            <Text size="xs" c="dimmed">Anyone on your local Wi-Fi or Ethernet can connect directly:</Text>
          </div>
        </Group>

        <Stack gap="xs">
          <Code>http://localhost:{shareStatus.port || 4380}</Code>
          {(shareStatus.lan || []).map((ip) => (
            <Code key={ip}>http://{ip}:{shareStatus.port || 4380}</Code>
          ))}
        </Stack>
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Title order={4} mb="md">Change Password</Title>
        <form onSubmit={handlePasswordChange}>
          <Stack gap="md" style={{ maxWidth: 400 }}>
            <PasswordInput
              label="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.currentTarget.value)}
              required
            />
            <PasswordInput
              label="New Password"
              value={nextPassword}
              onChange={(e) => setNextPassword(e.currentTarget.value)}
              required
            />
            <Button type="submit" color="blue" loading={passwordLoading}>
              Update Password
            </Button>
          </Stack>
        </form>
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Text size="xs" c="dimmed">Data Location on this computer:</Text>
        <Code color="gray" size="xs">{dataFolder}</Code>
      </Paper>
    </Stack>
  );
}
