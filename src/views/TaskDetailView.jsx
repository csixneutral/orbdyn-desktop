import React, { useState, useEffect } from 'react';
import {
  Paper,
  Title,
  Text,
  Group,
  Button,
  Stack,
  Badge,
  Progress,
  Avatar,
  Select,
  MultiSelect,
  ActionIcon,
  Textarea,
  FileInput,
  Modal,
  Table,
  Card,
  Tooltip,
  Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconPencil,
  IconPaperclip,
  IconSend,
  IconFileText,
  IconDownload,
  IconEye,
  IconTrash,
  IconLink,
  IconUpload,
  IconPlus,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { api } from '../api';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { TaskModal } from '../components/TaskModal';

export function TaskDetailView({ taskId, onBack }) {
  const { user } = useAuth();
  const { projects, users, refresh } = useData();

  const [task, setTask] = useState(null);
  const [taskFiles, setTaskFiles] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  const [editModalOpened, setEditModalOpened] = useState(false);
  const [uploadModalOpened, setUploadModalOpened] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      await api.deleteTask(task.id);
      notifications.show({ title: 'Moved to Recycle Bin', message: `"${task.title}" was moved to the Recycle Bin.`, color: 'blue' });
      onBack();
      refresh();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setDeleting(false);
    }
  };

  const loadDetails = async () => {
    if (!taskId) return;
    try {
      const { tasks } = await api.getTasks();
      const t = tasks.find((item) => item.id === taskId);
      if (t) {
        setTask(t);
      }
      const { files } = await api.getFiles({ taskId });
      setTaskFiles(files || []);

      const { comments: cList } = await api.getComments({ taskId });
      setComments(cList || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [taskId]);

  if (!task) {
    return (
      <Stack gap="md">
        <Button leftSection={<IconArrowLeft size={16} />} variant="subtle" onClick={onBack} style={{ width: 'fit-content' }}>
          Back to Tasks
        </Button>
        <Text c="dimmed">Loading task details...</Text>
      </Stack>
    );
  }

  const project = projects.find((p) => p.id === task.projectId);
  const creator = users.find((u) => u.id === task.createdBy);
  const currentAssigneeIds = task.assigneeIds?.length ? task.assigneeIds : (task.assigneeId ? [task.assigneeId] : []);

  const handleStatusChange = async (newStatus) => {
    try {
      const progressVal = newStatus === 'done' ? 100 : task.progress;
      await api.updateTask(task.id, { status: newStatus, progress: progressVal });
      notifications.show({ title: 'Updated', message: `Status changed to ${newStatus.replace('_', ' ')}`, color: 'green' });
      loadDetails();
      refresh();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  const handleAssigneesChange = async (newAssigneeIds) => {
    try {
      await api.updateTask(task.id, { assigneeIds: newAssigneeIds, assigneeId: newAssigneeIds[0] || null });
      notifications.show({ title: 'Updated', message: 'Assignees updated', color: 'green' });
      loadDetails();
      refresh();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await api.createComment({ taskId: task.id, body: newComment });
      setComments((prev) => [...prev, res.comment]);
      setNewComment('');
      refresh();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('taskId', task.id);
      if (task.projectId) formData.append('projectId', task.projectId);
      for (const f of selectedFiles) {
        formData.append('files', f);
      }

      await api.uploadFiles(formData);
      notifications.show({ title: 'Success', message: 'Document attached to task', color: 'green' });
      setSelectedFiles([]);
      setUploadModalOpened(false);
      loadDetails();
      refresh();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fId) => {
    if (!window.confirm('Remove attached document?')) return;
    try {
      await api.deleteFile(fId);
      notifications.show({ title: 'Removed', message: 'Document unlinked', color: 'blue' });
      loadDetails();
      refresh();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  const handleCopyLink = (f) => {
    const fullUrl = `${window.location.origin}/api/files/${f.id}/download`;
    navigator.clipboard.writeText(fullUrl);
    notifications.show({ title: 'Copied!', message: 'Download link copied to clipboard', color: 'blue' });
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Button
          leftSection={<IconArrowLeft size={16} />}
          variant="subtle"
          color="gray"
          onClick={onBack}
          size="sm"
        >
          All work
        </Button>

        {(user?.role === 'admin' || task.createdBy === user?.id) && (
          <Group gap="xs">
            <Button
              leftSection={<IconPencil size={16} />}
              variant="default"
              size="sm"
              onClick={() => setEditModalOpened(true)}
            >
              Edit
            </Button>
            <Button
              leftSection={<IconTrash size={16} />}
              color="red"
              variant="light"
              size="sm"
              onClick={() => setDeleteModalOpened(true)}
            >
              Delete
            </Button>
          </Group>
        )}
      </Group>

      {/* Main Header & Controls Card */}
      <Paper p="xl" radius="md" withBorder>
        <Stack gap="md">
          <div>
            <Title order={2}>{task.title}</Title>
            <Text size="xs" c="dimmed" mt={4}>
              {task.ref} • created {new Date(task.createdAt).toLocaleDateString()} by {creator?.name || 'Unknown'}
            </Text>
          </div>

          {task.description && (
            <Paper p="md" radius="sm" withBorder style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
              <Text size="sm">{task.description}</Text>
            </Paper>
          )}

          <Group gap="lg" align="flex-end" wrap="wrap" mt="xs">
            <Select
              label="Status"
              data={[
                { value: 'todo', label: 'To Do' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'review', label: 'In Review' },
                { value: 'done', label: 'Done' },
                { value: 'blocked', label: 'Blocked' },
              ]}
              value={task.status}
              onChange={handleStatusChange}
              size="sm"
              variant="filled"
              style={{ width: 160 }}
            />

            <MultiSelect
              label="Awarded to"
              data={(() => {
                if (project && project.visibility === 'members') {
                  const allowedIds = new Set([project.ownerId, ...(project.memberIds || [])]);
                  return users
                    .filter((u) => u.active !== false && allowedIds.has(u.id))
                    .map((u) => ({ value: u.id, label: u.name }));
                }
                return users
                  .filter((u) => u.active !== false)
                  .map((u) => ({ value: u.id, label: u.name }));
              })()}
              value={currentAssigneeIds}
              onChange={handleAssigneesChange}
              size="sm"
              variant="filled"
              placeholder="Assign to..."
              hidePickedOptions
              searchable
              style={{ minWidth: 220, flex: 1 }}
              styles={{
                pill: {
                  backgroundColor: 'rgba(16, 185, 129, 0.18)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  fontWeight: 600,
                },
              }}
            />

            <div>
              <Text size="xs" c="dimmed" fw={600} mb={4}>Project</Text>
              {project ? (
                <Badge color={project.colour || 'blue'} size="lg" variant="light">
                  {project.name}
                </Badge>
              ) : (
                <Text size="sm">-</Text>
              )}
            </div>

            <div>
              <Text size="xs" c="dimmed" fw={600} mb={4}>Priority</Text>
              <Badge color={task.priority === 'urgent' ? 'red' : task.priority === 'high' ? 'orange' : 'blue'} size="lg" variant="filled">
                {task.priority.toUpperCase()}
              </Badge>
            </div>

            <div>
              <Text size="xs" c="dimmed" fw={600} mb={4}>Due</Text>
              <Text size="sm" fw={600}>{task.dueDate || 'No due date'}</Text>
            </div>
          </Group>

          <Stack gap={4} mt="sm">
            <Group justify="space-between">
              <Text size="xs" c="dimmed" fw={600}>Progress — {task.progress}%</Text>
            </Group>
            <Progress value={task.progress} color="blue" size="md" radius="xl" />
          </Stack>
        </Stack>
      </Paper>

      {/* Attached Documents Section */}
      <Paper p="xl" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={700} size="sm" tt="uppercase" c="dimmed">ATTACHED DOCUMENTS</Text>
          {user?.role !== 'viewer' && (
            <Button
              leftSection={<IconPaperclip size={16} />}
              variant="outline"
              size="xs"
              color="blue"
              onClick={() => setUploadModalOpened(true)}
            >
              Attach a document
            </Button>
          )}
        </Group>

        {taskFiles.length === 0 ? (
          <Text size="sm" c="dimmed" fs="italic">No attached documents on this task yet.</Text>
        ) : (
          <Stack gap="xs">
            {taskFiles.map((f) => {
              const uploader = users.find((u) => u.id === f.uploadedBy);
              const isMedia = f.mime && (f.mime.startsWith('image/') || f.mime === 'application/pdf');

              return (
                <Paper key={f.id} p="xs" radius="sm" withBorder style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <Group justify="space-between">
                    <Group gap="xs">
                      <IconFileText size={20} color="#5b8def" />
                      <div>
                        <Text size="sm" fw={600}>{f.name}</Text>
                        <Text size="xs" c="dimmed">
                          {(f.size / 1024).toFixed(1)} KB • shared by {uploader?.name || 'Someone'}
                        </Text>
                      </div>
                    </Group>

                    <Group gap="xs">
                      {isMedia && (
                        <Button size="xs" variant="default" leftSection={<IconEye size={14} />} onClick={() => setPreviewFile(f)}>
                          Open
                        </Button>
                      )}
                      <Button
                        size="xs"
                        variant="default"
                        component="a"
                        href={`/api/files/${f.id}/download`}
                        target="_blank"
                        leftSection={<IconDownload size={14} />}
                      >
                        Download
                      </Button>
                      <Button size="xs" variant="default" leftSection={<IconLink size={14} />} onClick={() => handleCopyLink(f)}>
                        Link
                      </Button>
                      {(user?.role === 'admin' || f.uploadedBy === user?.id) && (
                        <Button size="xs" variant="subtle" color="red" leftSection={<IconTrash size={14} />} onClick={() => handleDeleteFile(f.id)}>
                          Remove
                        </Button>
                      )}
                    </Group>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>

      {/* Messages & Comments Stream Section */}
      <Paper p="xl" radius="md" withBorder>
        <Text fw={700} size="sm" tt="uppercase" c="dimmed" mb="md">MESSAGES</Text>

        <Stack gap="xs" mb="lg">
          {comments.length === 0 ? (
            <Text size="sm" c="dimmed" fs="italic">No messages yet.</Text>
          ) : (
            comments.map((c) => {
              const author = users.find((u) => u.id === c.authorId);
              return (
                <Paper key={c.id} p="sm" radius="md" withBorder style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                  <Group gap="xs" mb={4}>
                    <Avatar size="xs" color={author?.color || 'blue'} radius="xl">
                      {author?.name ? author.name[0].toUpperCase() : '?'}
                    </Avatar>
                    <Text size="xs" fw={700}>{author?.name || 'Unknown'}</Text>
                    <Text size="10px" c="dimmed">{new Date(c.createdAt).toLocaleString()}</Text>
                  </Group>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{c.body}</Text>
                </Paper>
              );
            })
          )}
        </Stack>

        <form onSubmit={handleAddComment}>
          <Stack gap="xs">
            <Textarea
              placeholder="Write a message... everyone involved gets a notification."
              minRows={3}
              value={newComment}
              onChange={(e) => setNewComment(e.currentTarget.value)}
              variant="filled"
            />
            <Group justify="flex-end">
              <Button type="submit" color="blue" leftSection={<IconSend size={16} />}>
                Send
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>

      {/* Edit Modal */}
      <TaskModal
        taskId={task.id}
        opened={editModalOpened}
        onClose={() => {
          setEditModalOpened(false);
          loadDetails();
        }}
      />

      {/* Upload File Modal */}
      <Modal
        opened={uploadModalOpened}
        onClose={() => setUploadModalOpened(false)}
        title={<Text fw={700}>Attach Document to Task</Text>}
        size={620}
        radius="lg"
      >
        <form onSubmit={handleUploadSubmit}>
          <Stack gap="md">
            <FileInput
              label="Choose files"
              placeholder="Select file to attach"
              multiple
              value={selectedFiles}
              onChange={setSelectedFiles}
              required
            />
            <Button type="submit" color="blue" loading={uploading}>
              Attach Document
            </Button>
          </Stack>
        </form>
      </Modal>

      {/* Preview Modal */}
      {previewFile && (
        <Modal
          opened={!!previewFile}
          onClose={() => setPreviewFile(null)}
          title={<Text fw={700}>{previewFile.name}</Text>}
          size="xl"
        >
          {previewFile.mime && previewFile.mime.startsWith('image/') ? (
            <img
              src={`/api/files/${previewFile.id}/view`}
              alt={previewFile.name}
              style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }}
            />
          ) : (
            <iframe
              src={`/api/files/${previewFile.id}/view`}
              title={previewFile.name}
              style={{ width: '100%', height: '70vh', border: 'none' }}
            />
          )}
        </Modal>
      )}

      {/* Delete Task Confirmation Modal */}
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
            Are you sure you want to delete <strong>"{task?.title}"</strong>? It will be moved to the Recycle Bin where you can restore it or delete it permanently.
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
