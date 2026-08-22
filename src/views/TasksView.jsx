import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Tabs,
  Card,
  Text,
  Title,
  Group,
  Badge,
  Button,
  Stack,
  Progress,
  Avatar,
  Select,
  TextInput,
  Table,
  ActionIcon,
  Paper,
  Tooltip,
  Modal,
  ScrollArea,
  Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconSearch,
  IconLayoutKanban,
  IconList,
  IconPencil,
  IconTrash,
  IconAlertTriangle,
  IconGripVertical,
} from '@tabler/icons-react';
import { api } from '../api';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { TaskModal } from '../components/TaskModal';
import { TaskDetailView } from './TaskDetailView';

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'gray' },
  { id: 'in_progress', title: 'In Progress', color: 'blue' },
  { id: 'review', title: 'In Review', color: 'yellow' },
  { id: 'done', title: 'Done', color: 'green' },
  { id: 'blocked', title: 'Blocked', color: 'red' },
];

function sortTasksByOrder(a, b) {
  if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
  if (a.order !== undefined) return -1;
  if (b.order !== undefined) return 1;
  return (a.createdAt || '').localeCompare(b.createdAt || '');
}

export function TasksView({ initialTaskId }) {
  const { user } = useAuth();
  const { tasks, projects, users, refresh } = useData();

  const [activeTaskId, setActiveTaskId] = useState(initialTaskId || null);

  useEffect(() => {
    if (initialTaskId) setActiveTaskId(initialTaskId);
  }, [initialTaskId]);
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState(null);
  const [filterAssignee, setFilterAssignee] = useState(null);
  
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [editTaskId, setEditTaskId] = useState(null);
  const [editModalOpened, setEditModalOpened] = useState(false);

  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Drag and Drop States
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverTaskId, setDragOverTaskId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);
  const draggedTaskIdRef = useRef(null);
  const didDragRef = useRef(false);
  const suppressClickRef = useRef(false);

  const handleTaskDrop = useCallback(async (targetColumnId, targetTaskId = null, event = null) => {
    const taskId = event?.dataTransfer?.getData('text/plain') || draggedTaskIdRef.current || draggedTaskId;
    if (!taskId) return;

    const taskToMove = tasks.find((t) => t.id === taskId);
    if (!taskToMove) return;

    const sourceColumnId = taskToMove.status;
    const isSameColumn = sourceColumnId === targetColumnId;

    try {
      const colTitle = COLUMNS.find((c) => c.id === targetColumnId)?.title || targetColumnId;

      const sourceColTasks = tasks
        .filter((t) => t.status === sourceColumnId)
        .sort(sortTasksByOrder);

      let targetColTasks = tasks
        .filter((t) => t.status === targetColumnId && t.id !== taskId)
        .sort(sortTasksByOrder);

      const updatedTask = { ...taskToMove, status: targetColumnId };

      if (targetTaskId && targetTaskId !== taskId) {
        const targetIndex = targetColTasks.findIndex((t) => t.id === targetTaskId);
        if (targetIndex >= 0) {
          if (isSameColumn) {
            const sourceIndex = sourceColTasks.findIndex((t) => t.id === taskId);
            const rawTargetIndex = sourceColTasks.findIndex((t) => t.id === targetTaskId);
            const insertIndex = sourceIndex < rawTargetIndex ? targetIndex + 1 : targetIndex;
            targetColTasks.splice(insertIndex, 0, updatedTask);
          } else {
            targetColTasks.splice(targetIndex, 0, updatedTask);
          }
        } else {
          targetColTasks.push(updatedTask);
        }
      } else {
        targetColTasks.push(updatedTask);
      }

      const reorderPayload = targetColTasks.map((t, idx) => ({
        id: t.id,
        status: targetColumnId,
        order: idx,
      }));

      if (!isSameColumn) {
        tasks
          .filter((t) => t.status === sourceColumnId && t.id !== taskId)
          .sort(sortTasksByOrder)
          .forEach((t, idx) => {
            reorderPayload.push({ id: t.id, status: sourceColumnId, order: idx });
          });
      }

      await api.reorderTasks(reorderPayload);

      notifications.show({
        title: isSameColumn ? 'Task Reordered' : 'Task Moved',
        message: isSameColumn && targetTaskId
          ? `"${taskToMove.title}" reordered in ${colTitle}`
          : `"${taskToMove.title}" moved to ${colTitle}`,
        color: 'green',
      });

      refresh();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      draggedTaskIdRef.current = null;
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      setDragOverColumnId(null);
    }
  }, [tasks, draggedTaskId, refresh]);

  // If a task is selected, show the full task details view
  if (activeTaskId) {
    return (
      <TaskDetailView
        taskId={activeTaskId}
        onBack={() => setActiveTaskId(null)}
      />
    );
  }

  const filteredTasks = tasks.filter((t) => {
    if (filterProject && t.projectId !== filterProject) return false;
    if (filterAssignee && t.assigneeId !== filterAssignee && !(t.assigneeIds || []).includes(filterAssignee)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.ref && t.ref.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenCreate = () => {
    setCreateModalOpened(true);
  };

  const handleOpenEdit = (e, id) => {
    e.stopPropagation();
    setEditTaskId(id);
    setEditModalOpened(true);
  };

  const handleOpenDelete = (e, t) => {
    e.stopPropagation();
    setTaskToDelete(t);
    setDeleteModalOpened(true);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      setDeleting(true);
      await api.deleteTask(taskToDelete.id);
      notifications.show({ title: 'Moved to Recycle Bin', message: `"${taskToDelete.title}" was moved to the Recycle Bin.`, color: 'blue' });
      setDeleteModalOpened(false);
      setTaskToDelete(null);
      refresh();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Stack gap="md" style={{ height: 'calc(100vh - 125px)', minHeight: 480 }}>
      {/* Header Bar */}
      <Group justify="space-between" style={{ flexShrink: 0 }}>
        <div>
          <Title order={2}>Tasks</Title>
          <Text c="dimmed" size="sm">Track progress, assign tasks, and drag cards to reorder or change status</Text>
        </div>
        {user?.role !== 'viewer' && (
          <Button leftSection={<IconPlus size={16} />} color="blue" onClick={handleOpenCreate}>
            New Task
          </Button>
        )}
      </Group>

      {/* Filter Controls */}
      <Group justify="space-between" style={{ flexShrink: 0 }}>
        <Group gap="sm">
          <TextInput
            placeholder="Search tasks..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ width: 240 }}
          />
          <Select
            placeholder="Filter by Project"
            data={projects.map((p) => ({ value: p.id, label: p.name }))}
            value={filterProject}
            onChange={setFilterProject}
            clearable
            style={{ width: 200 }}
          />
          <Select
            placeholder="Filter by Person"
            data={users.map((u) => ({ value: u.id, label: u.name }))}
            value={filterAssignee}
            onChange={setFilterAssignee}
            clearable
            style={{ width: 200 }}
          />
        </Group>
      </Group>

      {/* Main Tabs Container */}
      <Tabs defaultValue="kanban" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Tabs.List mb="sm" style={{ flexShrink: 0 }}>
          <Tabs.Tab value="kanban" leftSection={<IconLayoutKanban size={16} />}>
            Board View
          </Tabs.Tab>
          <Tabs.Tab value="list" leftSection={<IconList size={16} />}>
            List View
          </Tabs.Tab>
        </Tabs.List>

        {/* Board View Panel */}
        <Tabs.Panel value="kanban" style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
          <Box style={{ flex: 1, display: 'flex', gap: 16, overflowX: 'auto', alignItems: 'stretch', minHeight: 0, paddingBottom: 6 }}>
            {COLUMNS.map((col) => {
              const colTasks = filteredTasks
                .filter((t) => t.status === col.id)
                .sort(sortTasksByOrder);

              const isColumnHovered = dragOverColumnId === col.id;

              return (
                <Paper
                  key={col.id}
                  p="sm"
                  radius="md"
                  withBorder
                  style={{
                    flex: '1 0 260px',
                    minWidth: 260,
                    maxWidth: 320,
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: isColumnHovered ? '#1a2234' : '#141517',
                    outline: isColumnHovered ? '2px dashed #3b82f6' : 'none',
                    minHeight: 0,
                    transition: 'background-color 0.15s ease, outline 0.15s ease',
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverColumnId(col.id);
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget)) return;
                    setDragOverColumnId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleTaskDrop(col.id, null, e);
                  }}
                >
                  {/* Column Header */}
                  <Group justify="space-between" mb="sm" style={{ flexShrink: 0 }}>
                    <Group gap="xs">
                      <Badge color={col.color} variant="dot">
                        {col.title}
                      </Badge>
                      <Badge color="gray" variant="filled" size="xs">
                        {colTasks.length}
                      </Badge>
                    </Group>
                  </Group>

                  {/* Scrollable Cards Container */}
                  <ScrollArea style={{ flex: 1 }} offsetScrollbars scrollbars="y">
                    <Stack
                      gap="xs"
                      pr={4}
                      style={{ minHeight: 120, flex: 1 }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';
                        setDragOverColumnId(col.id);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleTaskDrop(col.id, null, e);
                      }}
                    >
                      {colTasks.length === 0 ? (
                        <Text size="xs" c="dimmed" fs="italic" py="lg" ta="center">
                          Drop tasks here
                        </Text>
                      ) : (
                        colTasks.map((task) => {
                          const project = projects.find((p) => p.id === task.projectId);
                          const assignee = users.find((u) => u.id === task.assigneeId);
                          const isDraggingThis = draggedTaskId === task.id;
                          const isDragOverThis = dragOverTaskId === task.id;

                          return (
                            <Card
                              key={task.id}
                              withBorder
                              shadow="xs"
                              p="sm"
                              radius="sm"
                              draggable={user?.role !== 'viewer'}
                              onDragStart={(e) => {
                                e.stopPropagation();
                                didDragRef.current = false;
                                e.dataTransfer.setData('text/plain', task.id);
                                e.dataTransfer.effectAllowed = 'move';
                                draggedTaskIdRef.current = task.id;
                                setDraggedTaskId(task.id);
                              }}
                              onDrag={(e) => {
                                if (e.clientX !== 0 || e.clientY !== 0) didDragRef.current = true;
                              }}
                              onDragEnd={() => {
                                if (didDragRef.current) suppressClickRef.current = true;
                                draggedTaskIdRef.current = null;
                                setDraggedTaskId(null);
                                setDragOverTaskId(null);
                                setDragOverColumnId(null);
                                window.setTimeout(() => {
                                  didDragRef.current = false;
                                  suppressClickRef.current = false;
                                }, 100);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.dataTransfer.dropEffect = 'move';
                                setDragOverTaskId(task.id);
                                setDragOverColumnId(col.id);
                              }}
                              onDragLeave={(e) => {
                                if (e.currentTarget.contains(e.relatedTarget)) return;
                                setDragOverTaskId(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleTaskDrop(col.id, task.id, e);
                              }}
                              style={{
                                cursor: user?.role !== 'viewer' ? 'grab' : 'pointer',
                                opacity: isDraggingThis ? 0.4 : 1,
                                border: isDragOverThis ? '2px solid #3b82f6' : undefined,
                                backgroundColor: isDragOverThis ? 'rgba(59, 130, 246, 0.1)' : undefined,
                                transition: 'all 0.15s ease',
                              }}
                              onClick={() => {
                                if (suppressClickRef.current) return;
                                setActiveTaskId(task.id);
                              }}
                            >
                              <Group justify="space-between" mb={4}>
                                <Group gap={4}>
                                  {user?.role !== 'viewer' && (
                                    <IconGripVertical size={14} color="#6b7280" style={{ cursor: 'grab' }} />
                                  )}
                                  <Text size="xs" c="dimmed" fw={700}>
                                    {task.ref}
                                  </Text>
                                </Group>
                                <Group gap={4} onClick={(e) => e.stopPropagation()}>
                                  {project && (
                                    <Badge color={project.colour || 'blue'} variant="light" size="xs">
                                      {project.name}
                                    </Badge>
                                  )}
                                  {(user?.role === 'admin' || task.createdBy === user?.id) && (
                                    <ActionIcon variant="subtle" color="red" size="xs" onClick={(e) => handleOpenDelete(e, task)}>
                                      <IconTrash size={14} />
                                    </ActionIcon>
                                  )}
                                </Group>
                              </Group>

                              <Text size="sm" fw={600} mb="xs" lineClamp={2}>
                                {task.title}
                              </Text>

                              <Stack gap={4} mb="xs">
                                <Progress value={task.progress} color={col.color} size="xs" radius="xl" />
                              </Stack>

                              <Group justify="space-between" pt={4}>
                                {assignee ? (
                                  <Tooltip label={`Assigned to ${assignee.name}`}>
                                    <Avatar size="xs" radius="xl" color={assignee.color || 'blue'}>
                                      {assignee.name[0].toUpperCase()}
                                    </Avatar>
                                  </Tooltip>
                                ) : <div />}

                                {task.dueDate && (
                                  <Text size="xs" c={task.dueDate < new Date().toISOString().slice(0, 10) && task.status !== 'done' ? 'red' : 'dimmed'}>
                                    {task.dueDate}
                                  </Text>
                                )}
                              </Group>
                            </Card>
                          );
                        })
                      )}
                    </Stack>
                  </ScrollArea>
                </Paper>
              );
            })}
          </Box>
        </Tabs.Panel>

        {/* List View Panel */}
        <Tabs.Panel value="list" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <Paper withBorder radius="md">
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Ref</Table.Th>
                  <Table.Th>Title</Table.Th>
                  <Table.Th>Project</Table.Th>
                  <Table.Th>Assignee</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Progress</Table.Th>
                  <Table.Th>Due Date</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredTasks.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={8} style={{ textAlign: 'center' }}>
                      <Text c="dimmed" py="md">No tasks found.</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  filteredTasks.map((t) => {
                    const project = projects.find((p) => p.id === t.projectId);
                    const assignee = users.find((u) => u.id === t.assigneeId);
                    return (
                      <Table.Tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setActiveTaskId(t.id)}>
                        <Table.Td><Text size="xs" fw={700}>{t.ref}</Text></Table.Td>
                        <Table.Td><Text size="sm" fw={600}>{t.title}</Text></Table.Td>
                        <Table.Td>
                          {project ? (
                            <Badge color={project.colour || 'blue'} variant="light" size="xs">
                              {project.name}
                            </Badge>
                          ) : '-'}
                        </Table.Td>
                        <Table.Td>{assignee ? assignee.name : 'Unassigned'}</Table.Td>
                        <Table.Td>
                          <Badge color={COLUMNS.find((c) => c.id === t.status)?.color || 'gray'} size="xs">
                            {t.status.replace('_', ' ')}
                          </Badge>
                        </Table.Td>
                        <Table.Td style={{ width: 120 }}>
                          <Group gap="xs">
                            <Progress value={t.progress} color="blue" size="xs" radius="xl" style={{ flex: 1 }} />
                            <Text size="xs">{t.progress}%</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td><Text size="xs">{t.dueDate || '-'}</Text></Table.Td>
                        <Table.Td onClick={(e) => e.stopPropagation()}>
                          <Group gap={4}>
                            <ActionIcon onClick={(e) => handleOpenEdit(e, t.id)}>
                              <IconPencil size={16} />
                            </ActionIcon>
                            {(user?.role === 'admin' || t.createdBy === user?.id) && (
                              <ActionIcon color="red" variant="subtle" onClick={(e) => handleOpenDelete(e, t)}>
                                <IconTrash size={16} />
                              </ActionIcon>
                            )}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>
      </Tabs>

      {/* New Task Modal */}
      <TaskModal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
      />

      {/* Edit Task Modal */}
      <TaskModal
        taskId={editTaskId}
        opened={editModalOpened}
        onClose={() => {
          setEditModalOpened(false);
          setEditTaskId(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        centered
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        title={
          <Group gap="xs">
            <IconAlertTriangle size={20} color="#ef4444" />
            <Text fw={700}>Delete Task?</Text>
          </Group>
        }
        size={520}
        radius="lg"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete <strong>"{taskToDelete?.title}"</strong>? It will be moved to the Recycle Bin where you can restore it or delete it permanently.
          </Text>

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setDeleteModalOpened(false)}>
              Cancel
            </Button>
            <Button color="red" loading={deleting} onClick={handleConfirmDelete}>
              Delete Task
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
