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
  Badge,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconLock } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';

export function LoginView() {
  const { login, orgName } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      notifications.show({ title: 'Error', message: 'Enter username and password', color: 'red' });
      return;
    }
    try {
      setLoading(true);
      await login(username, password);
      notifications.show({ title: 'Welcome back!', message: 'Signed in successfully.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Sign In Failed', message: err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={80}>
      <Stack align="center" mb="xl">
        <ThemeIcon size={54} radius="xl" color="blue" variant="light">
          <IconLock size={28} />
        </ThemeIcon>
        <Title order={2} ta="center">Sign in to Orbdyn</Title>
        <Badge variant="filled" color="blue" size="lg">
          {orgName}
        </Badge>
      </Stack>

      <Paper withBorder shadow="md" p={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack spacing="md">
            <TextInput
              label="Username"
              placeholder="Your username"
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
              required
            />
            <PasswordInput
              label="Password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
            />

            <Button type="submit" fullWidth mt="md" size="md" color="blue" loading={loading}>
              Sign In
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
