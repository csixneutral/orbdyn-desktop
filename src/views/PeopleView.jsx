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
  Avatar,
  ActionIcon,
  Modal,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUserPlus, IconPencil, IconTrash, IconAlertTriangle } from '@tabler/icons-react';
import { api } from '../api';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { UserModal } from '../components/UserModal';

export function PeopleView() {
  const { user } = useAuth();
  const { users, refresh } = useData();

  const [modalOpened, setModalOpened] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleOpenCreate = () => {
    setSelectedUser(null);
    setModalOpened(true);
  };

  const handleOpenEdit = (u) => {
    setSelectedUser(u);
    setModalOpened(true);
  };

  const handleOpenDelete = (u) => {
    setUserToDelete(u);
    setDeleteModalOpened(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setDeleting(true);
      await api.deleteUser(userToDelete.id);
      notifications.show({ title: 'Moved to Recycle Bin', message: `"${userToDelete.name}" was moved to the Recycle Bin.`, color: 'blue' });
      setDeleteModalOpened(false);
      setUserToDelete(null);
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
          <Title order={2}>People & Roles</Title>
          <Text c="dimmed" size="sm">Workspace members, roles, and access credentials</Text>
        </div>
        {user?.role === 'admin' && (
          <Button leftSection={<IconUserPlus size={16} />} color="blue" onClick={handleOpenCreate}>
            Add Person
          </Button>
        )}
      </Group>

      <Paper withBorder radius="md">
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Person</Table.Th>
              <Table.Th>Username</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Joined Date</Table.Th>
              {user?.role === 'admin' && <Table.Th>Actions</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {[...users]
              .sort((a, b) => (a.id === user?.id ? -1 : b.id === user?.id ? 1 : 0))
              .map((u) => (
                <Table.Tr key={u.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <Avatar radius="xl" color={u.color || 'blue'}>
                        {u.name ? u.name[0].toUpperCase() : '?'}
                      </Avatar>
                      <Text size="sm" fw={600}>
                        {u.name}{u.id === user?.id ? ' (me)' : ''}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td><Text size="sm" c="dimmed">@{u.username}</Text></Table.Td>
                  <Table.Td><Text size="sm">{u.email || '-'}</Text></Table.Td>
                  <Table.Td>
                    <Badge color={u.role === 'admin' ? 'purple' : u.role === 'viewer' ? 'gray' : 'blue'} variant="filled">
                      {u.role}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={u.active !== false ? 'green' : 'red'} variant="dot">
                      {u.active !== false ? 'Active' : 'Switched Off'}
                    </Badge>
                  </Table.Td>
                  <Table.Td><Text size="xs">{new Date(u.createdAt).toLocaleDateString()}</Text></Table.Td>
                  {user?.role === 'admin' && (
                    <Table.Td>
                      <Group gap={4}>
                        <ActionIcon onClick={() => handleOpenEdit(u)}>
                          <IconPencil size={16} />
                        </ActionIcon>
                        {u.id !== user?.id && (
                          <ActionIcon color="red" variant="subtle" onClick={() => handleOpenDelete(u)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <UserModal
        editUser={selectedUser}
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
            <Text fw={700}>Remove Person?</Text>
          </Group>
        }
        size={520}
        radius="lg"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to remove <strong>"{userToDelete?.name}"</strong>? This account will be moved to the Recycle Bin where you can restore it or delete it permanently.
          </Text>

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setDeleteModalOpened(false)}>
              Cancel
            </Button>
            <Button color="red" loading={deleting} onClick={handleConfirmDelete}>
              Remove Person
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
