import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Spinner } from '@/components/ui/spinner';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Pencil,
  Trash2,
  AlertTriangle,
  GripVertical,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { showNotification } from '@/lib/notify.js';
import { getColorClasses, getProgressStyle } from '@/lib/colors';
import { cn } from '@/lib/utils';
import { api } from '../api';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '@/components/ui/typography';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { TaskModal } from '../components/TaskModal';
import { TaskDetailView } from './TaskDetailView';
import {
  TASK_STATUS_COLUMNS,
  canChangeTaskStatus,
  canUpdateTaskStatus,
  getAllowedTaskStatuses,
  getStatusChangeBlockedMessage,
} from '@/lib/task-status';
import { canCreateContent, canDragTask, canEditTaskDetails } from '@/lib/roles';

const COLUMNS = TASK_STATUS_COLUMNS;

function sortTasksByOrder(a, b) {
  if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
  if (a.order !== undefined) return -1;
  if (b.order !== undefined) return 1;
  return (a.createdAt || '').localeCompare(b.createdAt || '');
}

function formatEstimateHours(hours) {
  const value = Number(hours) || 0;
  if (value <= 0) return '-';
  return value === 1 ? '1 hr' : `${value} hrs`;
}

export function TasksView({ initialTaskId, projectId }) {
  const { user } = useAuth();
  const { tasks, projects, users, refresh } = useData();

  const [activeTaskId, setActiveTaskId] = useState(initialTaskId || null);

  useEffect(() => {
    if (initialTaskId) setActiveTaskId(initialTaskId);
  }, [initialTaskId]);

  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState(projectId || null);
  const [filterAssignee, setFilterAssignee] = useState(null);

  useEffect(() => {
    if (projectId) setFilterProject(projectId);
  }, [projectId]);

  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [editTaskId, setEditTaskId] = useState(null);
  const [editModalOpened, setEditModalOpened] = useState(false);

  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatusTaskId, setUpdatingStatusTaskId] = useState(null);

  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverTaskId, setDragOverTaskId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);
  const draggedTaskIdRef = useRef(null);
  const didDragRef = useRef(false);
  const suppressClickRef = useRef(false);

  const handleTaskDrop = useCallback(
    async (targetColumnId, targetTaskId = null, event = null) => {
      const taskId = event?.dataTransfer?.getData('text/plain') || draggedTaskIdRef.current || draggedTaskId;
      if (!taskId) return;

      const taskToMove = tasks.find((t) => t.id === taskId);
      if (!taskToMove) return;

      const sourceColumnId = taskToMove.status;
      const isSameColumn = sourceColumnId === targetColumnId;

      if (!isSameColumn) {
        const project = projects.find((p) => p.id === taskToMove.projectId);
        if (
          !canChangeTaskStatus({
            user,
            task: taskToMove,
            project,
            fromStatus: sourceColumnId,
            toStatus: targetColumnId,
          })
        ) {
          showNotification({
            title: 'Not allowed',
            message: getStatusChangeBlockedMessage(),
            color: 'red',
          });
          draggedTaskIdRef.current = null;
          setDraggedTaskId(null);
          setDragOverTaskId(null);
          setDragOverColumnId(null);
          return;
        }
      }

      try {
        const colTitle = COLUMNS.find((c) => c.id === targetColumnId)?.title || targetColumnId;

        const sourceColTasks = tasks.filter((t) => t.status === sourceColumnId).sort(sortTasksByOrder);

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

        showNotification({
          title: isSameColumn ? 'Task Reordered' : 'Task Moved',
          message:
            isSameColumn && targetTaskId
              ? `"${taskToMove.title}" reordered in ${colTitle}`
              : `"${taskToMove.title}" moved to ${colTitle}`,
          color: 'green',
        });

        refresh();
      } catch (err) {
        showNotification({ title: 'Error', message: err.message, color: 'red' });
      } finally {
        draggedTaskIdRef.current = null;
        setDraggedTaskId(null);
        setDragOverTaskId(null);
        setDragOverColumnId(null);
      }
    },
    [tasks, draggedTaskId, refresh, projects, user]
  );

  if (activeTaskId) {
    return (
      <div className="h-full min-h-0 overflow-y-auto">
        <TaskDetailView taskId={activeTaskId} onBack={() => setActiveTaskId(null)} />
      </div>
    );
  }

  const filteredTasks = tasks.filter((t) => {
    if (filterProject && t.projectId !== filterProject) return false;
    if (filterAssignee && t.assigneeId !== filterAssignee && !(t.assigneeIds || []).includes(filterAssignee))
      return false;
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

  const handleOpenCreate = () => setCreateModalOpened(true);

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
      showNotification({
        title: 'Moved to Recycle Bin',
        message: `"${taskToDelete.title}" was moved to the Recycle Bin.`,
        color: 'blue',
      });
      setDeleteModalOpened(false);
      setTaskToDelete(null);
      refresh();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setDeleting(false);
    }
  };

  const canUpdateTaskStatusForUser = (task) => canUpdateTaskStatus(user, task);

  const handleStatusChange = async (task, newStatusId) => {
    if (!newStatusId || task.status === newStatusId) return;

    const project = projects.find((p) => p.id === task.projectId);
    if (
      !canChangeTaskStatus({
        user,
        task,
        project,
        fromStatus: task.status,
        toStatus: newStatusId,
      })
    ) {
      showNotification({
        title: 'Not allowed',
        message: getStatusChangeBlockedMessage(),
        color: 'red',
      });
      return;
    }

    try {
      setUpdatingStatusTaskId(task.id);
      const progressVal = newStatusId === 'done' ? 100 : task.progress;
      await api.updateTask(task.id, { status: newStatusId, progress: progressVal });
      const statusTitle = COLUMNS.find((col) => col.id === newStatusId)?.title || newStatusId;
      showNotification({
        title: 'Status updated',
        message: `"${task.title}" is now ${statusTitle}`,
        color: 'green',
      });
      refresh();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setUpdatingStatusTaskId(null);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          title="Tasks"
          description="Track progress, assign tasks, and drag cards to reorder or change status"
        >
          {canCreateContent(user) && (
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          )}
        </PageHeader>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="relative w-[240px]">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {!projectId && (
          <div className="flex items-center gap-1">
            <Select
              value={filterProject ?? undefined}
              onValueChange={setFilterProject}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by Project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterProject && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFilterProject(null)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          )}

          <div className="flex items-center gap-1">
            <Select
              value={filterAssignee ?? undefined}
              onValueChange={setFilterAssignee}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by Person" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterAssignee && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFilterAssignee(null)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="list" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <TabsList className="mb-2 shrink-0">
            <TabsTrigger value="list">
              <List className="h-4 w-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="kanban">
              <LayoutGrid className="h-4 w-4" />
              Board View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="mt-0 -mx-4 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
            <div className="flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden scroll-smooth px-4 pb-2">
              <div className="flex h-full min-h-0 w-max gap-4">
              {COLUMNS.map((col) => {
                const colTasks = filteredTasks.filter((t) => t.status === col.id).sort(sortTasksByOrder);
                const isColumnHovered = dragOverColumnId === col.id;

                return (
                  <div
                    key={col.id}
                    className={cn(
                      'flex h-full w-[300px] shrink-0 flex-col rounded-lg border p-3 transition-all',
                      isColumnHovered ? 'border-dashed border-primary bg-[#1a2234] outline outline-2 outline-primary' : 'bg-[#141517]'
                    )}
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
                    <div className="mb-2 flex shrink-0 items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={cn('border-transparent text-white', getColorClasses(col.color, 'badge'))}
                        >
                          {col.title}
                        </Badge>
                        <Badge variant="secondary">{colTasks.length}</Badge>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                      <div
                        className="flex min-h-[120px] flex-col gap-2"
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
                          <p className="py-8 text-center text-xs italic text-muted-foreground">Drop tasks here</p>
                        ) : (
                          colTasks.map((task) => {
                            const assignee = users.find((u) => u.id === task.assigneeId);
                            const isDraggingThis = draggedTaskId === task.id;
                            const isDragOverThis = dragOverTaskId === task.id;

                            return (
                              <Card
                                key={task.id}
                                draggable={canDragTask(user, task)}
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
                                className={cn(
                                  'cursor-pointer shadow-sm transition-all',
                                  canDragTask(user, task) && 'cursor-grab active:cursor-grabbing',
                                  isDraggingThis && 'opacity-40',
                                  isDragOverThis && 'border-2 border-primary bg-primary/10'
                                )}
                                onClick={() => {
                                  if (suppressClickRef.current) return;
                                  setActiveTaskId(task.id);
                                }}
                              >
                                <CardContent className="p-3">
                                  <div className="mb-1 flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                      {canDragTask(user, task) && (
                                        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                      )}
                                      <span className="text-xs font-bold text-muted-foreground">{task.ref}</span>
                                    </div>
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                      {(user?.role === 'admin' || task.createdBy === user?.id) && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-destructive hover:text-destructive"
                                          onClick={(e) => handleOpenDelete(e, task)}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>

                                  <p className="mb-2 line-clamp-2 text-sm font-semibold">{task.title}</p>

                                  <Progress
                                    value={task.progress}
                                    className="mb-2 h-1"
                                    indicatorClassName={getColorClasses(col.color, 'progress')}
                                  />

                                  <div className="flex items-center justify-between pt-1">
                                    {assignee ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Avatar className="h-6 w-6">
                                            <AvatarFallback
                                              className={cn('text-xs', getColorClasses(assignee.color || 'blue', 'avatar'))}
                                            >
                                              {assignee.name[0].toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent>Assigned to {assignee.name}</TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <div />
                                    )}
                                    {task.dueDate && (
                                      <span
                                        className={cn(
                                          'text-xs',
                                          task.dueDate < todayStr && task.status !== 'done'
                                            ? 'text-destructive'
                                            : 'text-muted-foreground'
                                        )}
                                      >
                                        {task.dueDate}
                                      </span>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-0 min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Due / Hours</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No tasks found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks.map((t) => {
                      const assignee = users.find((u) => u.id === t.assigneeId);
                      const statusCol = COLUMNS.find((c) => c.id === t.status);
                      const project = projects.find((p) => p.id === t.projectId);
                      const allowedStatuses = getAllowedTaskStatuses({ user, task: t, project });
                      const allowedStatusItems = allowedStatuses.map((col) => col.title);
                      const canEditStatus = canUpdateTaskStatusForUser(t) && allowedStatusItems.length > 1;
                      return (
                        <TableRow
                          key={t.id}
                          className="cursor-pointer"
                          onClick={() => setActiveTaskId(t.id)}
                        >
                          <TableCell>
                            <span className="text-sm font-semibold">{t.title}</span>
                          </TableCell>
                          <TableCell>{assignee ? assignee.name : 'Unassigned'}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {canEditStatus ? (
                              <Combobox
                                items={allowedStatusItems}
                                value={statusCol?.title}
                                disabled={updatingStatusTaskId === t.id}
                                onValueChange={(title) => {
                                  const nextStatus = COLUMNS.find((col) => col.title === title);
                                  if (nextStatus) handleStatusChange(t, nextStatus.id);
                                }}
                              >
                                <ComboboxInput
                                  placeholder="Select status"
                                  loading={updatingStatusTaskId === t.id}
                                  className={cn(
                                    'h-8 w-[160px] border-transparent text-white hover:opacity-90',
                                    getColorClasses(statusCol?.color || 'gray', 'badge')
                                  )}
                                />
                                <ComboboxContent>
                                  <ComboboxEmpty>No status found.</ComboboxEmpty>
                                  <ComboboxList>
                                    {(item) => {
                                      const col = COLUMNS.find((c) => c.title === item);
                                      return (
                                        <ComboboxItem key={item} value={item}>
                                          <span className="flex items-center gap-2">
                                            <span
                                              className={cn(
                                                'h-2 w-2 rounded-full',
                                                getColorClasses(col?.color || 'gray', 'progress')
                                              )}
                                            />
                                            {item}
                                          </span>
                                        </ComboboxItem>
                                      );
                                    }}
                                  </ComboboxList>
                                </ComboboxContent>
                              </Combobox>
                            ) : (
                              <Badge
                                className={cn(
                                  'border-transparent text-white',
                                  getColorClasses(statusCol?.color || 'gray', 'badge')
                                )}
                              >
                                {statusCol?.title || t.status.replace('_', ' ')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="w-[120px]">
                            <div className="flex items-center gap-2">
                              <Progress value={t.progress} className="h-1 flex-1" />
                              <span className="text-xs">{t.progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {t.dueDate ? (
                              <span
                                className={cn(
                                  'text-xs',
                                  t.dueDate < todayStr && t.status !== 'done'
                                    ? 'text-destructive'
                                    : 'text-muted-foreground'
                                )}
                              >
                                {t.dueDate}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {formatEstimateHours(t.estimateHours)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              {canEditTaskDetails(user, t) && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleOpenEdit(e, t.id)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {(user?.role === 'admin' || t.createdBy === user?.id) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={(e) => handleOpenDelete(e, t)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        <TaskModal opened={createModalOpened} onClose={() => setCreateModalOpened(false)} defaultProjectId={projectId} />

        <TaskModal
          taskId={editTaskId}
          opened={editModalOpened}
          onClose={() => {
            setEditModalOpened(false);
            setEditTaskId(null);
          }}
        />

        <Dialog open={deleteModalOpened} onOpenChange={setDeleteModalOpened}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete Task?
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>&quot;{taskToDelete?.title}&quot;</strong>? It will be moved
                to the Recycle Bin where you can restore it or delete it permanently.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteModalOpened(false)}>
                Cancel
              </Button>
              <Button variant="destructive" disabled={deleting} onClick={handleConfirmDelete}>
                {deleting && <Spinner />}
                Delete Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
