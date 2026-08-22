import React, { useState } from 'react';
import {
  Table,
  Paper,
  Text,
  Title,
  Group,
  Badge,
  Button,
  Stack,
  ActionIcon,
  Select,
  Modal,
  FileInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUpload, IconDownload, IconTrash, IconEye, IconFileText, IconAlertTriangle } from '@tabler/icons-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export function DocumentsView() {
  const { user } = useAuth();
  const { files, projects, users, refresh } = useData();

  const [filterProject, setFilterProject] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProject, setUploadProject] = useState(null);
  const [uploadModalOpened, setUploadModalOpened] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleOpenDelete = (f) => {
    setFileToDelete(f);
    setDeleteModalOpened(true);
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    try {
      setDeleting(true);
      await api.deleteFile(fileToDelete.id);
      notifications.show({ title: 'Moved to Recycle Bin', message: `"${fileToDelete.name}" was moved to the Recycle Bin.`, color: 'blue' });
      setDeleteModalOpened(false);
      setFileToDelete(null);
      refresh();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setDeleting(false);
    }
  };

  const filteredFiles = files.filter((f) => {
    if (filterProject && f.projectId !== filterProject) return false;
    return true;
  });

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) {
      notifications.show({ title: 'Error', message: 'Select at least one file', color: 'red' });
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      if (uploadProject) formData.append('projectId', uploadProject);
      for (const file of selectedFiles) {
        formData.append('files', file);
      }

      await api.uploadFiles(formData);
      notifications.show({ title: 'Success', message: 'Files uploaded to Orbdyn folder', color: 'green' });
      setSelectedFiles([]);
      setUploadModalOpened(false);
      refresh();
    } catch (err) {
      notifications.show({ title: 'Upload Failed', message: err.message, color: 'red' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (f) => {
    if (!window.confirm(`Delete document "${f.name}"?`)) return;
    try {
      await api.deleteFile(f.id);
      notifications.show({ title: 'Archived', message: 'File moved to _removed folder', color: 'blue' });
      refresh();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>Shared Documents</Title>
          <Text c="dimmed" size="sm">
            Files live on this computer's disk and stream on demand to team members
          </Text>
        </div>
        {user?.role !== 'viewer' && (
          <Button leftSection={<IconUpload size={16} />} color="blue" onClick={() => setUploadModalOpened(true)}>
            Upload Document
          </Button>
        )}
      </Group>

      <Group justify="space-between">
        <Select
          placeholder="Filter by Project"
          data={projects.map((p) => ({ value: p.id, label: p.name }))}
          value={filterProject}
          onChange={setFilterProject}
          clearable
          style={{ width: 240 }}
        />
      </Group>

      <Paper withBorder radius="md">
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Document Name</Table.Th>
              <Table.Th>Project</Table.Th>
              <Table.Th>Size</Table.Th>
              <Table.Th>Uploaded By</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredFiles.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6} style={{ textAlign: 'center' }}>
                  <Text c="dimmed" py="xl">No documents uploaded yet.</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredFiles.map((f) => {
                const project = projects.find((p) => p.id === f.projectId);
                const uploader = users.find((u) => u.id === f.uploadedBy);
                const isMedia = f.mime && (f.mime.startsWith('image/') || f.mime === 'application/pdf');

                return (
                  <Table.Tr key={f.id}>
                    <Table.Td>
                      <Group gap="xs">
                        <IconFileText size={18} color="#5b8def" />
                        <Text size="sm" fw={600}>{f.name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      {project ? (
                        <Badge color={project.colour || 'blue'} variant="light" size="xs">
                          {project.name}
                        </Badge>
                      ) : (
                        <Text size="xs" c="dimmed">General</Text>
                      )}
                    </Table.Td>
                    <Table.Td><Text size="xs">{formatBytes(f.size)}</Text></Table.Td>
                    <Table.Td><Text size="xs">{uploader ? uploader.name : 'Unknown'}</Text></Table.Td>
                    <Table.Td><Text size="xs">{new Date(f.createdAt).toLocaleDateString()}</Text></Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {isMedia && (
                          <ActionIcon color="blue" variant="subtle" onClick={() => setPreviewFile(f)}>
                            <IconEye size={16} />
                          </ActionIcon>
                        )}
                        <ActionIcon
                          component="a"
                          href={`/api/files/${f.id}/download`}
                          target="_blank"
                          color="green"
                          variant="subtle"
                        >
                          <IconDownload size={16} />
                        </ActionIcon>
                        {(user?.role === 'admin' || f.uploadedBy === user?.id) && (
                          <ActionIcon color="red" variant="subtle" onClick={() => handleOpenDelete(f)}>
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

      <Modal
        opened={uploadModalOpened}
        onClose={() => setUploadModalOpened(false)}
        title={<Text fw={700}>Upload Documents</Text>}
        size={620}
        radius="lg"
      >
        <form onSubmit={handleUploadSubmit}>
          <Stack gap="md">
            <Select
              label="Associated Project (Optional)"
              placeholder="Select project"
              data={projects.map((p) => ({ value: p.id, label: p.name }))}
              value={uploadProject}
              onChange={setUploadProject}
              clearable
            />

            <FileInput
              label="Choose files"
              placeholder="Select files to share"
              multiple
              value={selectedFiles}
              onChange={setSelectedFiles}
              required
            />

            <Button type="submit" color="blue" loading={uploading}>
              Share Document
            </Button>
          </Stack>
        </form>
      </Modal>

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

      {/* Delete Document Confirmation Modal */}
      <Modal
        centered
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        title={
          <Group gap="xs">
            <IconAlertTriangle size={20} color="#ef4444" />
            <Text fw={700}>Delete Document?</Text>
          </Group>
        }
        size={520}
        radius="lg"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete <strong>"{fileToDelete?.name}"</strong>? It will be moved to the Recycle Bin where you can restore it or delete it permanently.
          </Text>

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setDeleteModalOpened(false)}>
              Cancel
            </Button>
            <Button color="red" loading={deleting} onClick={handleConfirmDelete}>
              Delete Document
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
