import React, { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  Select,
  MultiSelect,
  NumberInput,
  Slider,
  Button,
  Group,
  Stack,
  Text,
  Badge,
  Paper,
  Avatar,
  Divider,
  ActionIcon,
  SegmentedControl,
  ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconSend,
  IconTrash,
  IconChecklist,
  IconFolder,
  IconUser,
  IconCalendar,
  IconClock,
  IconProgressCheck,
  IconFileText,
  IconPlus,
} from '@tabler/icons-react';
import { api } from '../api';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

export function TaskModal({ taskId, opened, onClose }) {
  const { user } = useAuth();
  const { projects, users, refresh } = useData();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(null);
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('normal');
  const [progress, setProgress] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [estimateHours, setEstimateHours] = useState(0);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (taskId) {
      loadTaskDetails();
    } else {
      resetForm();
    }
  }, [taskId, opened]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setProjectId(projects[0]?.id || null);
    setAssigneeIds(user?.id ? [user.id] : []);
    setStatus('todo');
    setPriority('normal');
    setProgress(0);
    setDueDate('');
    setEstimateHours(0);
    setComments([]);
  };

  const loadTaskDetails = async () => {
    try {
      const { tasks } = await api.getTasks();
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        setTitle(task.title || '');
        setDescription(task.description || '');
        setProjectId(task.projectId || null);
        setAssigneeIds(task.assigneeIds?.length ? task.assigneeIds : (task.assigneeId ? [task.assigneeId] : []));
        setStatus(task.status || 'todo');
        setPriority(task.priority || 'normal');
        setProgress(task.progress || 0);
        setDueDate(task.dueDate || '');
        setEstimateHours(task.estimateHours || 0);

        const { comments: cList } = await api.getComments({ taskId });
        setComments(cList || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      notifications.show({ title: 'Error', message: 'Task title is required', color: 'red' });
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        title,
        description,
        projectId,
        assigneeIds,
        assigneeId: assigneeIds[0] || null,
        status,
        priority,
        progress,
        dueDate,
        estimateHours,
      };

      if (taskId) {
        await api.updateTask(taskId, payload);
        notifications.show({ title: 'Success', message: 'Work item updated', color: 'green' });
      } else {
        await api.createTask(payload);
        notifications.show({ title: 'Success', message: 'Work item created', color: 'green' });
      }
      refresh();
      onClose();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.deleteTask(taskId);
      notifications.show({ title: 'Deleted', message: 'Work item removed', color: 'blue' });
      refresh();
      onClose();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !taskId) return;
    try {
      const res = await api.createComment({ taskId, body: newComment });
      setComments((prev) => [...prev, res.comment]);
      setNewComment('');
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
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
            <IconChecklist size={22} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="lg">{taskId ? 'Edit Task' : 'New Task'}</Text>
            <Text size="xs" c="dimmed">{taskId ? 'Update details, track progress & discuss' : 'Create a new task and award to team members'}</Text>
          </div>
        </Group>
      }
      size={620}
      radius="lg"
      overlayProps={{ backgroundOpacity: 0.6, blur: 4 }}
      padding="xl"
    >
      <Stack gap="md" mt="xs">
        {/* Title & Description Section */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
          <Stack gap="sm">
            <TextInput
              label={
                <Group gap={6} mb={2}>
                  <IconFileText size={14} color="#5b8def" />
                  <Text size="xs" fw={600}>Title</Text>
                </Group>
              }
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              required
              variant="filled"
              size="sm"
            />

            <Textarea
              label="Description"
              placeholder="Add requirements, details, or notes..."
              minRows={3}
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
              variant="filled"
              size="sm"
            />
          </Stack>
        </Paper>

        {/* Project & Multiple Assignees Section */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
          <Group grow gap="md" align="flex-start">
            <Select
              label={
                <Group gap={6} mb={2}>
                  <IconFolder size={14} color="#3b82f6" />
                  <Text size="xs" fw={600}>Project</Text>
                </Group>
              }
              placeholder="Select project"
              data={projects.map((p) => ({ value: p.id, label: p.name }))}
              value={projectId}
              onChange={(val) => {
                setProjectId(val);
                const selProj = projects.find((p) => p.id === val);
                if (selProj && selProj.visibility === 'members') {
                  const allowedIds = new Set([selProj.ownerId, ...(selProj.memberIds || [])]);
                  setAssigneeIds((prev) => prev.filter((id) => allowedIds.has(id)));
                }
              }}
              clearable
              variant="filled"
              size="sm"
            />
            <MultiSelect
              label={
                <Group gap={6} mb={2}>
                  <IconUser size={14} color="#10b981" />
                  <Text size="xs" fw={600}>Awarded To / Assignees</Text>
                </Group>
              }
              placeholder={assigneeIds.length === 0 ? "Select assignees" : ""}
              data={(() => {
                const selProj = projects.find((p) => p.id === projectId);
                if (selProj && selProj.visibility === 'members') {
                  const allowedIds = new Set([selProj.ownerId, ...(selProj.memberIds || [])]);
                  return users
                    .filter((u) => u.active !== false && allowedIds.has(u.id))
                    .map((u) => ({ value: u.id, label: u.name }));
                }
                return users
                  .filter((u) => u.active !== false)
                  .map((u) => ({ value: u.id, label: u.name }));
              })()}
              value={assigneeIds}
              onChange={setAssigneeIds}
              clearable
              searchable
              hidePickedOptions
              variant="filled"
              size="sm"
              styles={{
                pill: {
                  backgroundColor: 'rgba(16, 185, 129, 0.18)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  fontWeight: 600,
                  fontSize: '12px',
                },
                input: {
                  minHeight: '36px',
                  display: 'flex',
                  alignItems: 'center',
                },
              }}
            />
          </Group>
        </Paper>

        {/* Status & Priority Selection */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
          <Stack gap="sm">
            <div>
              <Text size="xs" fw={600} mb={6} c="dimmed">STATUS</Text>
              <SegmentedControl
                fullWidth
                size="xs"
                radius="md"
                color="blue"
                value={status}
                onChange={(val) => {
                  setStatus(val);
                  if (val === 'done') setProgress(100);
                }}
                data={[
                  { label: 'To Do', value: 'todo' },
                  { label: 'In Progress', value: 'in_progress' },
                  { label: 'In Review', value: 'review' },
                  { label: 'Done', value: 'done' },
                  { label: 'Blocked', value: 'blocked' },
                ]}
              />
            </div>

            <div>
              <Text size="xs" fw={600} mb={6} c="dimmed">PRIORITY</Text>
              <SegmentedControl
                fullWidth
                size="xs"
                radius="md"
                color={priority === 'urgent' ? 'red' : priority === 'high' ? 'orange' : 'blue'}
                value={priority}
                onChange={setPriority}
                data={[
                  { label: 'Low', value: 'low' },
                  { label: 'Normal', value: 'normal' },
                  { label: 'High', value: 'high' },
                  { label: 'Urgent', value: 'urgent' },
                ]}
              />
            </div>
          </Stack>
        </Paper>

        {/* Progress & Estimates Section */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <IconProgressCheck size={18} color="#f59e0b" />
                <Text size="sm" fw={600}>Completion Progress</Text>
              </Group>
              <Badge color={progress === 100 ? 'green' : 'blue'} variant="filled" size="md">
                {progress}%
              </Badge>
            </Group>

            <Slider
              value={progress}
              onChange={setProgress}
              step={5}
              color="blue"
              radius="xl"
              size="md"
              marks={[
                { value: 0, label: '0%' },
                { value: 50, label: '50%' },
                { value: 100, label: '100%' },
              ]}
            />

            <Group grow gap="md" mt="sm">
              <TextInput
                label={
                  <Group gap={6} mb={2}>
                    <IconCalendar size={14} color="#8b5cf6" />
                    <Text size="xs" fw={600}>Due Date</Text>
                  </Group>
                }
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.currentTarget.value)}
                variant="filled"
                size="sm"
              />
              <NumberInput
                label={
                  <Group gap={6} mb={2}>
                    <IconClock size={14} color="#ec4899" />
                    <Text size="xs" fw={600}>Estimated Hours</Text>
                  </Group>
                }
                value={estimateHours}
                onChange={setEstimateHours}
                min={0}
                variant="filled"
                size="sm"
              />
            </Group>
          </Stack>
        </Paper>

        {/* Activity & Discussion Stream (When Editing) */}
        {taskId && (
          <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
            <Divider my="xs" label="Activity & Discussion" labelPosition="center" />

            <Stack gap="xs" style={{ maxHeight: 200, overflowY: 'auto' }}>
              {comments.length === 0 ? (
                <Text size="xs" c="dimmed" fs="italic" ta="center" py="xs">No comments yet on this task.</Text>
              ) : (
                comments.map((c) => {
                  const author = users.find((u) => u.id === c.authorId);
                  return (
                    <Paper key={c.id} p="xs" withBorder radius="sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                      <Group gap="xs" mb={4}>
                        <Avatar size="xs" color={author?.color || 'blue'} radius="xl">
                          {author?.name ? author.name[0].toUpperCase() : '?'}
                        </Avatar>
                        <Text size="xs" fw={600}>{author?.name || 'Unknown'}</Text>
                        <Text size="10px" c="dimmed">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                      </Group>
                      <Text size="sm">{c.body}</Text>
                    </Paper>
                  );
                })
              )}
            </Stack>

            <form onSubmit={handleAddComment} style={{ marginTop: 12 }}>
              <Group gap="xs">
                <TextInput
                  placeholder="Type a message or update..."
                  style={{ flex: 1 }}
                  value={newComment}
                  onChange={(e) => setNewComment(e.currentTarget.value)}
                  variant="filled"
                  size="sm"
                />
                <ActionIcon type="submit" color="blue" variant="filled" size="lg" radius="md">
                  <IconSend size={16} />
                </ActionIcon>
              </Group>
            </form>
          </Paper>
        )}

        {/* Modal Action Buttons */}
        <Group justify="space-between" mt="sm">
          {taskId ? (
            <Button color="red" variant="light" leftSection={<IconTrash size={16} />} onClick={handleDelete} radius="md">
              Delete
            </Button>
          ) : <div />}

          <Group gap="xs">
            <Button variant="subtle" color="gray" onClick={onClose} radius="md">
              Cancel
            </Button>
            <Button
              color="blue"
              onClick={handleSave}
              loading={submitting}
              radius="md"
              leftSection={taskId ? <IconProgressCheck size={16} /> : <IconPlus size={16} />}
              size="sm"
            >
              {taskId ? 'Save Changes' : 'Create Task'}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
