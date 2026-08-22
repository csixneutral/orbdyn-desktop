import React, { useState } from 'react';
import {
  SimpleGrid,
  Card,
  Text,
  Title,
  Group,
  Badge,
  Button,
  Stack,
  Progress,
  Avatar,
  Tooltip,
  ActionIcon,
  Modal,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconPencil, IconCalendarEvent, IconTrash, IconAlertTriangle } from '@tabler/icons-react';
import { api } from '../api';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ProjectModal } from '../components/ProjectModal';
import { ProjectDetailView } from './ProjectDetailView';

export function ProjectsView({ initialProjectId }) {
  const { user } = useAuth();
  const { projects, users, tasks, refresh } = useData();

  const [activeProjectId, setActiveProjectId] = useState(initialProjectId || null);
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // If a project is selected, render the full Project Details view
  if (activeProjectId) {
    return (
      <ProjectDetailView
        projectId={activeProjectId}
        onBack={() => setActiveProjectId(null)}
      />
    );
  }

  const handleOpenCreate = () => {
    setSelectedProject(null);
    setModalOpened(true);
  };

  const handleOpenEdit = (e, p) => {
    e.stopPropagation();
    setSelectedProject(p);
    setModalOpened(true);
  };

  const handleOpenDelete = (e, p) => {
    e.stopPropagation();
    setProjectToDelete(p);
    setDeleteModalOpened(true);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      setDeleting(true);
      await api.deleteProject(projectToDelete.id);
      notifications.show({ title: 'Moved to Recycle Bin', message: `"${projectToDelete.name}" was moved to the Recycle Bin.`, color: 'blue' });
      setDeleteModalOpened(false);
      setProjectToDelete(null);
      refresh();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>Projects</Title>
          <Text c="dimmed" size="sm">Manage workspace projects and access permissions</Text>
        </div>
        {user?.role !== 'viewer' && (
          <Button leftSection={<IconPlus size={16} />} color="blue" onClick={handleOpenCreate}>
            New Project
          </Button>
        )}
      </Group>

      {projects.length === 0 ? (
        <Card withBorder p="xl" radius="md" style={{ textAlign: 'center' }}>
          <Text c="dimmed" mb="md">No projects found. Create your first project to organize tasks and shared documents.</Text>
          {user?.role !== 'viewer' && (
            <Button leftSection={<IconPlus size={16} />} color="blue" onClick={handleOpenCreate}>
              Create First Project
            </Button>
          )}
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
          {projects.map((p) => {
            const pTasks = tasks.filter((t) => t.projectId === p.id);
            const doneCount = pTasks.filter((t) => t.status === 'done').length;
            const progress = pTasks.length ? Math.round(pTasks.reduce((a, t) => a + (t.status === 'done' ? 100 : t.progress), 0) / pTasks.length) : 0;
            const members = users.filter((u) => (p.memberIds || []).includes(u.id) || u.id === p.ownerId);

            return (
              <Card
                key={p.id}
                withBorder
                shadow="xs"
                p="md"
                radius="md"
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveProjectId(p.id)}
              >
                <Group justify="space-between" mb="xs">
                  <Badge color={p.colour || 'blue'} variant="filled" size="md">
                    {p.name}
                  </Badge>
                  {(user?.role === 'admin' || p.ownerId === user?.id) && (
                    <Group gap={4} onClick={(e) => e.stopPropagation()}>
                      <ActionIcon variant="subtle" color="gray" onClick={(e) => handleOpenEdit(e, p)}>
                        <IconPencil size={16} />
                      </ActionIcon>
                      <ActionIcon variant="subtle" color="red" onClick={(e) => handleOpenDelete(e, p)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  )}
                </Group>

                <Text size="sm" c="dimmed" lineClamp={2} mb="md" style={{ minHeight: 40 }}>
                  {p.description || 'No description provided.'}
                </Text>

                <Stack gap="xs" mb="md">
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Progress ({doneCount}/{pTasks.length} done)</Text>
                    <Text size="xs" fw={700}>{progress}%</Text>
                  </Group>
                  <Progress value={progress} color={p.colour || 'blue'} size="sm" radius="xl" />
                </Stack>

                <Group justify="space-between" pt="xs" style={{ borderTop: '1px solid #2C2E33' }}>
                  <Avatar.Group>
                    {members.slice(0, 4).map((m) => (
                      <Tooltip key={m.id} label={m.name} withArrow>
                        <Avatar size="sm" radius="xl" color={m.color || 'blue'}>
                          {m.name ? m.name[0].toUpperCase() : '?'}
                        </Avatar>
                      </Tooltip>
                    ))}
                    {members.length > 4 && (
                      <Avatar size="sm" radius="xl">+{members.length - 4}</Avatar>
                    )}
                  </Avatar.Group>

                  {p.dueDate && (
                    <Group gap={4}>
                      <IconCalendarEvent size={14} color="#909296" />
                      <Text size="xs" c="dimmed">{p.dueDate}</Text>
                    </Group>
                  )}
                </Group>
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      <ProjectModal
        project={selectedProject}
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        centered
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        title={
          <Group gap="xs">
            <IconAlertTriangle size={20} color="#ef4444" />
            <Text fw={700}>Delete Project?</Text>
          </Group>
        }
        size={520}
        radius="lg"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete <strong>"{projectToDelete?.name}"</strong>? It will be moved to the Recycle Bin where you can restore it or delete it permanently.
          </Text>

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setDeleteModalOpened(false)}>
              Cancel
            </Button>
            <Button color="red" loading={deleting} onClick={handleConfirmDelete}>
              Delete Project
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
