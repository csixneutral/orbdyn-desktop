import React, { useState } from 'react';
import {
  Paper,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Container,
  Group,
  ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconShieldCheck, IconRocket } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';

export function SetupView() {
  const { setup } = useAuth();

  const [orgName, setOrgName] = useState('My Team');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orgName.trim() || !name.trim() || !username.trim() || !password) {
      notifications.show({ title: 'Error', message: 'Please fill in all fields', color: 'red' });
      return;
    }
    if (password.length < 6) {
      notifications.show({ title: 'Error', message: 'Password must be at least 6 characters', color: 'red' });
      return;
    }
    try {
      setLoading(true);
      await setup({ orgName, name, username, password });
      notifications.show({ title: 'Welcome to Orbdyn!', message: 'Workspace created successfully.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Setup Failed', message: err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={460} my={60}>
      <Stack align="center" mb="lg">
        <ThemeIcon size={60} radius="xl" color="blue" variant="filled">
          <IconRocket size={32} />
        </ThemeIcon>
        <Title order={2} ta="center">Setup Your Orbdyn Workspace</Title>
        <Text color="dimmed" size="sm" ta="center">
          Private, zero-cloud desktop tracking & document sharing. All your data stays on this computer.
        </Text>
      </Stack>

      <Paper withBorder shadow="md" p={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack spacing="md">
            <TextInput
              label="Workspace Name"
              placeholder="e.g. Acme Studio / My Company"
              value={orgName}
              onChange={(e) => setOrgName(e.currentTarget.value)}
              required
            />
            <TextInput
              label="Your Full Name"
              placeholder="e.g. Alex Morgan"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              required
            />
            <TextInput
              label="Admin Username"
              placeholder="e.g. alex"
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
              required
            />
            <PasswordInput
              label="Admin Password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
            />

            <Group spacing="xs" mt="xs">
              <IconShieldCheck size={18} color="#10b981" />
              <Text size="xs" color="dimmed">Your credentials are encrypted & stored strictly on this machine.</Text>
            </Group>

            <Button type="submit" fullWidth mt="md" size="md" color="blue" loading={loading}>
              Create Workspace & Get Started
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
