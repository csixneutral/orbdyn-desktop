import React, { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Pencil, CalendarDays, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { ProjectModal } from '../components/ProjectModal';
import { Skeleton } from '@/components/ui/skeleton';

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

function ProjectCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <Skeleton className="h-6 w-32 rounded-full" />
          <div className="flex gap-1">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
        </div>

        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="mb-4 h-4 w-4/5" />

        <div className="mb-4 space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <div className="flex -space-x-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-7 w-7 rounded-full border-2 border-background" />
            ))}
          </div>
          <Skeleton className="h-3 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectsView({ onOpenProject, openCreateOnMount = false, onCreateMountHandled }) {
  const { user } = useAuth();
  const { projects, users, tasks, refresh, loading } = useData();

  const [modalOpened, setModalOpened] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleOpenCreate = () => {
    setSelectedProject(null);
    setModalOpened(true);
  };

  useEffect(() => {
    if (!openCreateOnMount || user?.role === 'viewer') return;
    setSelectedProject(null);
    setModalOpened(true);
    onCreateMountHandled?.();
  }, [openCreateOnMount, user?.role, onCreateMountHandled]);

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
      showNotification({
        title: 'Moved to Recycle Bin',
        message: `"${projectToDelete.name}" was moved to the Recycle Bin.`,
        color: 'blue',
      });
      setDeleteModalOpened(false);
      setProjectToDelete(null);
      refresh();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <PageHeader
          title="Your Projects"
          description="Open a project to manage tasks, documents, calendar, and team"
        >
          {user?.role !== 'viewer' && (
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          )}
        </PageHeader>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="mb-4 text-muted-foreground">
              No projects found. Create your first project to organize tasks and shared documents.
            </p>
            {user?.role !== 'viewer' && (
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4" />
                Create First Project
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const pTasks = tasks.filter((t) => t.projectId === p.id);
              const doneCount = pTasks.filter((t) => t.status === 'done').length;
              const progress = pTasks.length
                ? Math.round(
                    pTasks.reduce((a, t) => a + (t.status === 'done' ? 100 : t.progress), 0) /
                      pTasks.length
                  )
                : 0;
              const members = users.filter(
                (u) => (p.memberIds || []).includes(u.id) || u.id === p.ownerId
              );

              return (
                <Card
                  key={p.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => onOpenProject?.(p.id)}
                >
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <Badge
                        className="text-white"
                        style={{ backgroundColor: p.colour || '#3b82f6' }}
                      >
                        {p.name}
                      </Badge>
                      {(user?.role === 'admin' || p.ownerId === user?.id) && (
                        <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => handleOpenEdit(e, p)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={(e) => handleOpenDelete(e, p)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <p className="mb-4 line-clamp-2 min-h-[40px] text-sm text-muted-foreground">
                      {p.description || 'No description provided.'}
                    </p>

                    <div className="mb-4 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          Progress ({doneCount}/{pTasks.length} done)
                        </span>
                        <span className="font-bold text-foreground">{progress}%</span>
                      </div>
                      <Progress
                        value={progress}
                        indicatorClassName="bg-[var(--project-color)]"
                        style={{ '--project-color': p.colour || '#3b82f6' }}
                      />
                    </div>

                    <div className="flex items-center justify-between border-t pt-3">
                      <div className="flex -space-x-2">
                        {members.slice(0, 4).map((m) => (
                          <Tooltip key={m.id}>
                            <TooltipTrigger asChild>
                              <Avatar className="h-7 w-7 border-2 border-background">
                                <AvatarFallback
                                  className="text-[10px] text-white"
                                  style={{ backgroundColor: getAvatarBg(m.color) }}
                                >
                                  {m.name ? m.name[0].toUpperCase() : '?'}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>{m.name}</TooltipContent>
                          </Tooltip>
                        ))}
                        {members.length > 4 && (
                          <Avatar className="h-7 w-7 border-2 border-background">
                            <AvatarFallback className="text-[10px] bg-muted">
                              +{members.length - 4}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>

                      {p.dueDate && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {p.dueDate}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <ProjectModal project={selectedProject} opened={modalOpened} onClose={() => setModalOpened(false)} />

        <AlertDialog open={deleteModalOpened} onOpenChange={setDeleteModalOpened}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete Project?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>&quot;{projectToDelete?.name}&quot;</strong>?
                It will be moved to the Recycle Bin where you can restore it or delete it permanently.
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
                Delete Project
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
