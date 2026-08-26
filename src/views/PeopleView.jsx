import React, { useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { UserPlus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { showNotification } from '@/lib/notify';
import { api } from '../api';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '@/components/ui/typography';
import { UserModal } from '../components/UserModal';
import {
  ROLE_OPTIONS,
  getRoleShortLabel,
  normalizeRole,
} from '@/lib/roles';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';

const AVATAR_COLORS = {
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
  orange: '#f59e0b',
  purple: '#8b5cf6',
  pink: '#ec4899',
  gray: '#6b7280',
  yellow: '#eab308',
};

function getAvatarBg(color) {
  if (!color) return AVATAR_COLORS.blue;
  if (color.startsWith('#')) return color;
  return AVATAR_COLORS[color] || AVATAR_COLORS.blue;
}

function roleBadgeVariant(role) {
  if (role === 'admin') return 'default';
  if (role === 'viewer') return 'secondary';
  if (role === 'member') return 'outline';
  return 'outline';
}

const ROLE_COMBO_ITEMS = ROLE_OPTIONS.map((option) => getRoleShortLabel(option.value));

export function PeopleView({ projectId }) {
  const { user } = useAuth();
  const { users, projects, refresh } = useData();

  const project = projectId ? projects.find((p) => p.id === projectId) : null;
  const visibleUsers = (
    project
      ? users.filter((u) => u.id === project.ownerId || (project.memberIds || []).includes(u.id))
      : users
  ).filter((u) => projectId || u.id !== user?.id);

  const [modalOpened, setModalOpened] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState(null);
  const [updatingActiveUserId, setUpdatingActiveUserId] = useState(null);

  const canManagePeople = user?.role === 'admin' && !projectId;
  const canManageRoles = canManagePeople;

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
      showNotification({
        title: 'Moved to Recycle Bin',
        message: `"${userToDelete.name}" was moved to the Recycle Bin.`,
        color: 'blue',
      });
      setDeleteModalOpened(false);
      setUserToDelete(null);
      refresh();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setDeleting(false);
    }
  };

  const handleRoleChange = async (person, nextRole) => {
    const currentRole = normalizeRole(person.role);
    const normalizedNextRole = normalizeRole(nextRole);
    if (currentRole === normalizedNextRole) return;

    try {
      setUpdatingRoleUserId(person.id);
      const { user: updatedUser } = await api.updateUser(person.id, { role: normalizedNextRole });
      const savedRole = normalizeRole(updatedUser?.role || normalizedNextRole);
      showNotification({
        title: 'Role updated',
        message: `${person.name} is now ${getRoleShortLabel(savedRole)}`,
        color: 'green',
      });
      refresh();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setUpdatingRoleUserId(null);
    }
  };

  const handleActiveChange = async (person, nextActive) => {
    const currentActive = person.active !== false;
    if (currentActive === nextActive) return;

    try {
      setUpdatingActiveUserId(person.id);
      await api.updateUser(person.id, { active: nextActive });
      showNotification({
        title: 'Status updated',
        message: `${person.name} is now ${nextActive ? 'Active' : 'Switched Off'}`,
        color: 'green',
      });
      refresh();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setUpdatingActiveUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={projectId ? 'Project Team' : 'People & Roles'}
        description={
          projectId
            ? 'Members assigned to this project'
            : 'Workspace members, roles, and access credentials'
        }
      >
        {canManagePeople && (
          <Button onClick={handleOpenCreate}>
            <UserPlus className="h-4 w-4" />
            Add Person
          </Button>
        )}
      </PageHeader>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined Date</TableHead>
              {canManagePeople && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          className="text-sm text-white"
                          style={{ backgroundColor: getAvatarBg(u.color) }}
                        >
                          {u.name ? u.name[0].toUpperCase() : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-semibold">
                        {u.name}
                        {u.id === user?.id ? ' (me)' : ''}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">@{u.username}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{u.email || '-'}</span>
                  </TableCell>
                  <TableCell>
                    {canManageRoles ? (
                      <Combobox
                        items={ROLE_COMBO_ITEMS}
                        value={getRoleShortLabel(u.role)}
                        disabled={updatingRoleUserId === u.id}
                        onValueChange={(label) => {
                          const option = ROLE_OPTIONS.find(
                            (item) => getRoleShortLabel(item.value) === label
                          );
                          if (option) handleRoleChange(u, option.value);
                        }}
                      >
                        <ComboboxInput
                          placeholder="Select role"
                          loading={updatingRoleUserId === u.id}
                          className="h-8 w-[132px] font-normal"
                        />
                        <ComboboxContent>
                          <ComboboxEmpty>No role found.</ComboboxEmpty>
                          <ComboboxList>
                            {(item) => {
                              const option = ROLE_OPTIONS.find(
                                (roleOption) => getRoleShortLabel(roleOption.value) === item
                              );
                              return (
                                <ComboboxItem key={item} value={item}>
                                  <span className="flex flex-col items-start gap-0.5">
                                    <span>{item}</span>
                                    {option ? (
                                      <span className="text-xs text-muted-foreground">{option.label}</span>
                                    ) : null}
                                  </span>
                                </ComboboxItem>
                              );
                            }}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    ) : (
                      <Badge variant={roleBadgeVariant(u.role)}>{getRoleShortLabel(u.role)}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={u.active !== false}
                        disabled={
                          !canManagePeople ||
                          updatingActiveUserId === u.id ||
                          u.id === user?.id
                        }
                        onCheckedChange={(checked) => handleActiveChange(u, checked)}
                        aria-label={`${u.name} account active`}
                      />
                      {updatingActiveUserId === u.id ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <span
                          className={`text-sm ${
                            u.active !== false ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {u.active !== false ? 'Active' : 'Off'}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">{new Date(u.createdAt).toLocaleDateString()}</span>
                  </TableCell>
                  {canManagePeople && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(u)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {u.id !== user?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleOpenDelete(u)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>

      <UserModal editUser={selectedUser} opened={modalOpened} onClose={() => setModalOpened(false)} />

      <AlertDialog open={deleteModalOpened} onOpenChange={setDeleteModalOpened}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Remove Person?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>&quot;{userToDelete?.name}&quot;</strong>? This
              account will be moved to the Recycle Bin where you can restore it or delete it permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={handleConfirmDelete}
            >
              {deleting && <Spinner />}
              Remove Person
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
