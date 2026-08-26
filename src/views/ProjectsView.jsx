import React, { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Pencil, CalendarDays, Trash2, AlertTriangle, LayoutGrid, List, Search, Folder, FolderPlus, History, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { canCreateContent } from '@/lib/roles';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const PROJECT_SEARCH_HISTORY_KEY = 'orbdyn.projectSearchHistory';
const MAX_PROJECT_SEARCH_HISTORY = 3;

function readProjectSearchHistory() {
  try {
    const data = JSON.parse(localStorage.getItem(PROJECT_SEARCH_HISTORY_KEY) || '[]');
    return Array.isArray(data) ? data.filter(Boolean).slice(0, MAX_PROJECT_SEARCH_HISTORY) : [];
  } catch {
    return [];
  }
}

function writeProjectSearchHistory(items) {
  localStorage.setItem(
    PROJECT_SEARCH_HISTORY_KEY,
    JSON.stringify(items.slice(0, MAX_PROJECT_SEARCH_HISTORY))
  );
}

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

function getProjectStats(project, tasks, users) {
  const pTasks = tasks.filter((t) => t.projectId === project.id);
  const doneCount = pTasks.filter((t) => t.status === 'done').length;
  const progress = pTasks.length
    ? Math.round(
        pTasks.reduce((a, t) => a + (t.status === 'done' ? 100 : t.progress), 0) / pTasks.length
      )
    : 0;
  const members = users.filter(
    (u) => (project.memberIds || []).includes(u.id) || u.id === project.ownerId
  );

  return { pTasks, doneCount, progress, members };
}

function ProjectActionsMenu({ onEdit, onDelete, triggerClassName }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={triggerClassName || 'h-7 w-7 shrink-0'}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Project actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            onEdit?.();
          }}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={(e) => {
            e.preventDefault();
            onDelete?.();
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProjectCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-1 w-full rounded-none" />
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-7 w-7 rounded-md" />
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

function ProjectListSkeleton() {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="w-[88px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }, (_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-36" /></TableCell>
              <TableCell><Skeleton className="h-4 w-full max-w-[240px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-7 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-7 w-16" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
  const [viewMode, setViewMode] = useState('card');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState(readProjectSearchHistory);

  const addSearchHistory = (term) => {
    const value = String(term || '').trim();
    if (!value) return;
    setSearchHistory((prev) => {
      const next = [value, ...prev.filter((t) => t !== value)].slice(0, MAX_PROJECT_SEARCH_HISTORY);
      writeProjectSearchHistory(next);
      return next;
    });
  };

  const handleSearchOpenChange = (open) => {
    setSearchOpen(open);
    if (!open) setSearchQuery('');
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleOpenCreate = () => {
    setSelectedProject(null);
    setModalOpened(true);
  };

  useEffect(() => {
    if (!openCreateOnMount || !canCreateContent(user)) return;
    setSelectedProject(null);
    setModalOpened(true);
    onCreateMountHandled?.();
  }, [openCreateOnMount, user?.role, onCreateMountHandled]);

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
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
            <div className="flex items-center rounded-md border bg-background p-0.5">
              <Button
                type="button"
                variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 gap-1.5 px-2.5"
                onClick={() => setViewMode('card')}
              >
                <LayoutGrid className="h-4 w-4" />
                Cards
              </Button>
              <Button
                type="button"
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 gap-1.5 px-2.5"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
                List
              </Button>
            </div>
            {canCreateContent(user) && (
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            )}
          </div>
        </PageHeader>

        <CommandDialog
          open={searchOpen}
          onOpenChange={handleSearchOpenChange}
          search={searchQuery}
          onSearchChange={setSearchQuery}
        >
          <CommandInput placeholder="Search projects" />
          <CommandList>
            <CommandEmpty>No projects found.</CommandEmpty>
            {!searchQuery.trim() && searchHistory.length > 0 && (
              <>
                <CommandGroup heading="Recent">
                  {searchHistory.map((term) => (
                    <CommandItem
                      key={term}
                      value={`recent ${term}`}
                      onSelect={() => setSearchQuery(term)}
                    >
                      <History className="text-muted-foreground" />
                      <span className="truncate">{term}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            <CommandGroup heading="Projects">
              {projects.map((p) => {
                const { progress, pTasks } = getProjectStats(p, tasks, users);
                return (
                  <CommandItem
                    key={p.id}
                    value={`${p.name} ${p.description || ''} ${p.client || ''}`}
                    onSelect={() => {
                      addSearchHistory(searchQuery.trim() || p.name);
                      setSearchOpen(false);
                      setSearchQuery('');
                      onOpenProject?.(p.id);
                    }}
                  >
                    <Folder className="text-primary" />
                    <span className="truncate">{p.name}</span>
                    <CommandShortcut>
                      {pTasks.length} tasks · {progress}%
                    </CommandShortcut>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="View">
              <CommandItem
                value="card view grid"
                onSelect={() => {
                  setViewMode('card');
                  setSearchOpen(false);
                  setSearchQuery('');
                }}
              >
                <LayoutGrid />
                <span>Card view</span>
              </CommandItem>
              <CommandItem
                value="list view table"
                onSelect={() => {
                  setViewMode('list');
                  setSearchOpen(false);
                  setSearchQuery('');
                }}
              >
                <List />
                <span>List view</span>
              </CommandItem>
            </CommandGroup>
            {canCreateContent(user) && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Actions">
                  <CommandItem
                    value="new project create"
                    onSelect={() => {
                      setSearchOpen(false);
                      setSearchQuery('');
                      handleOpenCreate();
                    }}
                  >
                    <FolderPlus />
                    <span>New project</span>
                    <CommandShortcut>⌘N</CommandShortcut>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </CommandDialog>

        {loading ? (
          viewMode === 'card' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <ProjectCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <ProjectListSkeleton />
          )
        ) : projects.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="mb-4 text-muted-foreground">
              No projects found. Create your first project to organize tasks and shared documents.
            </p>
            {canCreateContent(user) && (
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4" />
                Create First Project
              </Button>
            )}
          </Card>
        ) : viewMode === 'card' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const { pTasks, doneCount, progress, members } = getProjectStats(p, tasks, users);

              return (
                <Card
                  key={p.id}
                  className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
                  onClick={() => onOpenProject?.(p.id)}
                >
                  <div className="h-1 w-full" style={{ backgroundColor: p.colour || '#3b82f6' }} />
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="min-w-0 flex-1 truncate text-base font-semibold leading-tight">
                        {p.name}
                      </h3>
                      {(user?.role === 'admin' || p.ownerId === user?.id) && (
                        <ProjectActionsMenu
                          onEdit={() => {
                            setSelectedProject(p);
                            setModalOpened(true);
                          }}
                          onDelete={() => {
                            setProjectToDelete(p);
                            setDeleteModalOpened(true);
                          }}
                        />
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
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="w-[88px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => {
                  const { pTasks, doneCount, progress, members } = getProjectStats(p, tasks, users);
                  const canManage = user?.role === 'admin' || p.ownerId === user?.id;

                  return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer"
                      onClick={() => onOpenProject?.(p.id)}
                    >
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: p.colour || '#3b82f6' }}
                          />
                          <span className="truncate font-semibold">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <span className="line-clamp-2 text-sm text-muted-foreground">
                          {p.description || 'No description provided.'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-[140px] space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              {doneCount}/{pTasks.length} done
                            </span>
                            <span className="font-bold text-foreground">{progress}%</span>
                          </div>
                          <Progress
                            value={progress}
                            className="h-1.5"
                            indicatorClassName="bg-[var(--project-color)]"
                            style={{ '--project-color': p.colour || '#3b82f6' }}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        {p.dueDate ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {p.dueDate}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {canManage ? (
                          <ProjectActionsMenu
                            onEdit={() => {
                              setSelectedProject(p);
                              setModalOpened(true);
                            }}
                            onDelete={() => {
                              setProjectToDelete(p);
                              setDeleteModalOpened(true);
                            }}
                          />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
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
