import React, { useState } from 'react';
import {
  Paper,
  Title,
  Text,
  Group,
  Button,
  Stack,
  Badge,
  Table,
  ActionIcon,
  Modal,
  Tabs,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconTrash,
  IconRefresh,
  IconAlertTriangle,
  IconFolder,
  IconChecklist,
  IconFileText,
  IconUser,
} from '@tabler/icons-react';
import { api } from '../api';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

export function RecycleBinView() {
  const { user } = useAuth();
  const { trash, refresh } = useData();

  const [activeTab, setActiveTab] = useState('all');
  const [confirmModalOpened, setConfirmModalOpened] = useState(false);
  const [targetItem, setTargetItem] = useState(null);
  const [actionType, setActionType] = useState(null); // 'deletePermanent' | 'emptyAll'
  const [submitting, setSubmitting] = useState(false);

  const filteredTrash = (trash || []).filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'project') return item.type === 'project';
    if (activeTab === 'task') return item.type === 'task';
    if (activeTab === 'file') return item.type === 'file';
    if (activeTab === 'user') return item.type === 'user';
    return true;
  });

  const handleRestore = async (item) => {
    try {
      await api.restoreTrash(item.id);
      notifications.show({ title: 'Restored!', message: `"${item.name}" has been restored to your workspace.`, color: 'green' });
      refresh();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  const handlePromptDeletePermanent = (item) => {
    setTargetItem(item);
    setActionType('deletePermanent');
    setConfirmModalOpened(true);
  };

  const handlePromptEmptyAll = () => {
    setTargetItem(null);
    setActionType('emptyAll');
    setConfirmModalOpened(true);
  };

  const handleConfirmAction = async () => {
    try {
      setSubmitting(true);
      if (actionType === 'deletePermanent' && targetItem) {
        await api.deleteTrashPermanent(targetItem.id);
        notifications.show({ title: 'Permanently Deleted', message: `"${targetItem.name}" was permanently removed.`, color: 'blue' });
      } else if (actionType === 'emptyAll') {
        await api.emptyTrash();
        notifications.show({ title: 'Emptied', message: 'All items in the Recycle Bin were permanently deleted.', color: 'blue' });
      }
      setConfirmModalOpened(false);
      refresh();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'project': return <IconFolder size={16} color="#3d7fe0" />;
      case 'task': return <IconChecklist size={16} color="#10b981" />;
      case 'file': return <IconFileText size={16} color="#8b5cf6" />;
      case 'user': return <IconUser size={16} color="#f59e0b" />;
      default: return <IconTrash size={16} />;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'project': return <Badge color="blue" variant="filled" size="xs">Project</Badge>;
      case 'task': return <Badge color="green" variant="filled" size="xs">Task</Badge>;
      case 'file': return <Badge color="violet" variant="filled" size="xs">Document</Badge>;
      case 'user': return <Badge color="amber" variant="filled" size="xs">Person</Badge>;
      default: return <Badge color="gray" size="xs">{type}</Badge>;
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>Recycle Bin</Title>
          <Text c="dimmed" size="sm">
            Deleted items are held here safely. Restore them or delete permanently.
          </Text>
        </div>

        {trash.length > 0 && user?.role !== 'viewer' && (
          <Button
            leftSection={<IconTrash size={16} />}
            color="red"
            variant="light"
            onClick={handlePromptEmptyAll}
          >
            Empty Recycle Bin
          </Button>
        )}
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="md">
          <Tabs.Tab value="all">
            All ({trash.length})
          </Tabs.Tab>
          <Tabs.Tab value="project" leftSection={<IconFolder size={14} />}>
            Projects ({trash.filter((i) => i.type === 'project').length})
          </Tabs.Tab>
          <Tabs.Tab value="task" leftSection={<IconChecklist size={14} />}>
            Tasks ({trash.filter((i) => i.type === 'task').length})
          </Tabs.Tab>
          <Tabs.Tab value="file" leftSection={<IconFileText size={14} />}>
            Documents ({trash.filter((i) => i.type === 'file').length})
          </Tabs.Tab>
          <Tabs.Tab value="user" leftSection={<IconUser size={14} />}>
            People ({trash.filter((i) => i.type === 'user').length})
          </Tabs.Tab>
        </Tabs.List>

        <Paper withBorder radius="md">
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Item Name</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Deleted By</Table.Th>
                <Table.Th>Deleted Date</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredTrash.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5} style={{ textAlign: 'center' }}>
                    <Text c="dimmed" py="xl">Recycle Bin is empty.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredTrash.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      <Group gap="xs">
                        {getTypeIcon(item.type)}
                        <Text size="sm" fw={600}>{item.name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>{getTypeBadge(item.type)}</Table.Td>
                    <Table.Td><Text size="sm">{item.deletedByName || 'Unknown'}</Text></Table.Td>
                    <Table.Td><Text size="xs" c="dimmed">{new Date(item.deletedAt).toLocaleString()}</Text></Table.Td>
                    <Table.Td>
                      <Group justify="flex-end" gap="xs">
                        {user?.role !== 'viewer' && (
                          <Button
                            size="xs"
                            variant="light"
                            color="green"
                            leftSection={<IconRefresh size={14} />}
                            onClick={() => handleRestore(item)}
                          >
                            Restore
                          </Button>
                        )}
                        {user?.role !== 'viewer' && (
                          <Button
                            size="xs"
                            variant="subtle"
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={() => handlePromptDeletePermanent(item)}
                          >
                            Delete
                          </Button>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      </Tabs>

      {/* Confirmation Modal */}
      <Modal
        centered
        opened={confirmModalOpened}
        onClose={() => setConfirmModalOpened(false)}
        title={
          <Group gap="xs">
            <IconAlertTriangle size={20} color="#ef4444" />
            <Text fw={700}>
              {actionType === 'emptyAll' ? 'Empty Recycle Bin?' : 'Delete Permanently?'}
            </Text>
          </Group>
        }
        size={520}
        radius="lg"
      >
        <Stack gap="md">
          <Text size="sm">
            {actionType === 'emptyAll'
              ? 'Are you sure you want to permanently delete ALL items in the Recycle Bin? This action CANNOT be undone.'
              : `Are you sure you want to permanently delete "${targetItem?.name}"? This action CANNOT be undone.`}
          </Text>

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setConfirmModalOpened(false)}>
              Cancel
            </Button>
            <Button color="red" loading={submitting} onClick={handleConfirmAction}>
              Delete Permanently
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
