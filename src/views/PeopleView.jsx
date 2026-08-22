import React, { useState } from 'react';
import { UserPlus, Pencil, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
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
  return 'outline';
}

export function PeopleView({ projectId }) {
  const { user } = useAuth();
  const { users, projects, refresh } = useData();

  const project = projectId ? projects.find((p) => p.id === projectId) : null;
  const visibleUsers = project
    ? users.filter((u) => u.id === project.ownerId || (project.memberIds || []).includes(u.id))
    : users;

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
        {user?.role === 'admin' && !projectId && (
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
              {user?.role === 'admin' && !projectId && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...visibleUsers]
              .sort((a, b) => (a.id === user?.id ? -1 : b.id === user?.id ? 1 : 0))
              .map((u) => (
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
                    <Badge variant={roleBadgeVariant(u.role)}>{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={u.active !== false ? 'default' : 'destructive'}
                      className={u.active !== false ? 'bg-emerald-600 hover:bg-emerald-600' : undefined}
                    >
                      {u.active !== false ? 'Active' : 'Switched Off'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">{new Date(u.createdAt).toLocaleDateString()}</span>
                  </TableCell>
                  {user?.role === 'admin' && !projectId && (
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
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Remove Person
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
