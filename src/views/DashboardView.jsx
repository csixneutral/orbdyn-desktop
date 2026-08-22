import React from "react";
import {
  Grid,
  Paper,
  Text,
  Title,
  Group,
  RingProgress,
  Badge,
  Stack,
  SimpleGrid,
  Progress,
  ThemeIcon,
  Button,
  Card,
  Avatar,
} from "@mantine/core";
import {
  IconFolder,
  IconChecklist,
  IconClock,
  IconFileText,
  IconUsers,
  IconCircleCheck,
  IconAlertTriangle,
  IconPlus,
} from "@tabler/icons-react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";

export function DashboardView({ onNavigate }) {
  const { user } = useAuth();
  const { dashboardData, projects, tasks } = useData();

  if (!dashboardData) {
    return <Text c="dimmed">Loading dashboard metrics...</Text>;
  }

  const { totals, perProject, perPerson } = dashboardData;

  const statCards = [
    {
      title: "Active Projects",
      value: totals.projects,
      icon: IconFolder,
      color: "blue",
    },
    {
      title: "Total Tasks",
      value: totals.tasks,
      icon: IconChecklist,
      color: "cyan",
    },
    {
      title: "Completed Tasks",
      value: totals.done,
      icon: IconCircleCheck,
      color: "green",
    },
    {
      title: "Overdue Tasks",
      value: totals.overdue,
      icon: IconAlertTriangle,
      color: totals.overdue > 0 ? "red" : "gray",
    },
    {
      title: "Shared Documents",
      value: totals.documents,
      icon: IconFileText,
      color: "violet",
    },
  ];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>Dashboard</Title>
          <Text c="dimmed" size="sm">
            Welcome back, {user?.name || "User"}!
          </Text>
        </div>
        <Group gap="xs">
          <Button
            variant="default"
            size="sm"
            onClick={() => onNavigate("tasks")}
          >
            View All Tasks
          </Button>
          {user?.role !== "viewer" && (
            <Button
              leftSection={<IconPlus size={16} />}
              color="blue"
              size="sm"
              onClick={() => onNavigate("projects")}
            >
              New Project
            </Button>
          )}
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 5 }} spacing="md">
        {statCards.map((st) => (
          <Paper key={st.title} p="md" radius="md" withBorder>
            <Group justify="space-between">
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                {st.title}
              </Text>
              <ThemeIcon color={st.color} variant="light" radius="md" size="md">
                <st.icon size={18} />
              </ThemeIcon>
            </Group>
            <Text fw={700} size="xl" mt="xs">
              {st.value}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>

      <Grid>
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Paper p="md" radius="md" withBorder style={{ height: "100%" }}>
            <Title order={4} mb="md">
              Projects Overview
            </Title>
            <Stack gap="md">
              {perProject.length === 0 ? (
                <Text c="dimmed" size="sm">
                  No projects added yet.
                </Text>
              ) : (
                perProject.map((p) => (
                  <Card key={p.id} withBorder radius="sm" p="xs">
                    <Group justify="space-between" mb={4}>
                      <Group gap="xs">
                        <Badge
                          color={p.colour || "blue"}
                          variant="filled"
                          size="xs"
                        >
                          {p.name}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          {p.done} / {p.total} done
                        </Text>
                      </Group>
                      <Text size="xs" fw={700}>
                        {p.progress}%
                      </Text>
                    </Group>
                    <Progress
                      value={p.progress}
                      color={p.colour || "blue"}
                      size="sm"
                      radius="xl"
                    />
                  </Card>
                ))
              )}
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5 }}>
          <Paper p="md" radius="md" withBorder style={{ height: "100%" }}>
            <Title order={4} mb="md">
              Work Load by Team Member
            </Title>
            <Stack gap="sm">
              {perPerson.length === 0 ? (
                <Text c="dimmed" size="sm">
                  No team members registered.
                </Text>
              ) : (
                [...perPerson]
                  .sort((a, b) => (a.id === user?.id ? -1 : b.id === user?.id ? 1 : 0))
                  .map((u) => (
                    <Group
                      key={u.id}
                      justify="space-between"
                      p="xs"
                      style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}
                    >
                      <Group gap="xs">
                        <Avatar size="xs" radius="xl" color={u.color || "blue"}>
                          {u.name ? u.name[0].toUpperCase() : "?"}
                        </Avatar>
                        <Text size="sm" fw={600}>
                          {u.name}{u.id === user?.id ? ' (me)' : ''}
                        </Text>
                      </Group>
                    <Group gap="xs">
                      <Badge color="blue" variant="light" size="xs">
                        {u.open} open
                      </Badge>
                      <Badge color="green" variant="light" size="xs">
                        {u.done} done
                      </Badge>
                      {u.overdue > 0 && (
                        <Badge color="red" variant="filled" size="xs">
                          {u.overdue} late
                        </Badge>
                      )}
                    </Group>
                  </Group>
                ))
              )}
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
