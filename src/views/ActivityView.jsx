import React from 'react';
import {
  Paper,
  Text,
  Title,
  Timeline,
  Stack,
  Avatar,
  Group,
} from '@mantine/core';
import { useData } from '../context/DataContext';

export function ActivityView() {
  const { activity, users } = useData();

  return (
    <Stack spacing="lg">
      <div>
        <Title order={2}>Workspace Activity Feed</Title>
        <Text color="dimmed" size="sm">Audit trail of task updates, file sharing, and project changes</Text>
      </div>

      <Paper p="xl" radius="md" withBorder>
        {activity.length === 0 ? (
          <Text color="dimmed">No activity recorded yet.</Text>
        ) : (
          <Timeline active={activity.length} bulletSize={32} lineWidth={2}>
            {activity.map((act) => {
              const actor = users.find((u) => u.id === act.actorId);
              return (
                <Timeline.Item
                  key={act.id}
                  bullet={
                    <Avatar size="sm" radius="xl" color={actor?.color || 'blue'}>
                      {actor?.name ? actor.name[0].toUpperCase() : '?'}
                    </Avatar>
                  }
                  title={
                    <Group spacing="xs">
                      <Text size="sm" fw={700}>{actor?.name || 'Someone'}</Text>
                      <Text size="sm" color="dimmed">{act.action}</Text>
                      <Text size="sm" fw={600}>{act.subject}</Text>
                    </Group>
                  }
                >
                  <Text color="dimmed" size="xs" mt={4}>
                    {new Date(act.createdAt).toLocaleString()}
                  </Text>
                </Timeline.Item>
              );
            })}
          </Timeline>
        )}
      </Paper>
    </Stack>
  );
}
