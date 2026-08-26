import React, { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';
import {
  ArrowLeft,
  Pencil,
  Paperclip,
  Send,
  FileText,
  Download,
  Eye,
  Trash2,
  Link,
  AlertTriangle,
  ChevronsUpDown,
  CalendarDays,
  Flag,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { showNotification } from '@/lib/notify.js';
import { copyFileDownloadLink, downloadFile, loadFilePreviewUrl } from '@/lib/files';
import { getColorClasses, getProgressStyle } from '@/lib/colors';
import { cn } from '@/lib/utils';
import { api } from '../api';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { TaskModal } from '../components/TaskModal';
import {
  TASK_STATUS_COLUMNS,
  canChangeTaskStatus,
  getAllowedTaskStatuses,
  getStatusChangeBlockedMessage,
} from '@/lib/task-status';
import { canCreateContent, canChangeTaskAssignees, canProcessTasks, canBeAssignedToTask } from '@/lib/roles';

const TASK_STATUSES = TASK_STATUS_COLUMNS;

function TaskDetailSkeleton({ onBack }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back to Tasks
        </Button>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      <Card className="overflow-hidden">
        <Skeleton className="h-1 w-full rounded-none" />
        <CardContent className="p-0">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b px-6 py-5">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-5 w-14" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-8 w-2/3" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
            <Skeleton className="h-16 w-20 rounded-lg" />
          </div>

          <div className="space-y-2 border-b px-6 py-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>

          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-2 bg-card p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>

          <div className="space-y-2 px-6 py-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-2.5 w-full" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-36" />
          </div>
          <Skeleton className="h-4 w-72" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <Skeleton className="mb-4 h-4 w-24" />
          <Skeleton className="mb-6 h-4 w-32" />
          <Skeleton className="h-20 w-full" />
          <div className="mt-3 flex justify-end">
            <Skeleton className="h-9 w-20" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TaskDetailField({ icon: Icon, label, children, className }) {
  return (
    <div className={cn('space-y-2 bg-card p-4', className)}>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      {children}
    </div>
  );
}

function AssigneeMultiSelect({ options, value, onChange, users = [] }) {
  const [open, setOpen] = useState(false);

  const toggle = (id) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const selectedOptions = options.filter((o) => value.includes(o.value));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="h-9 w-full justify-between font-normal">
          <span className="flex min-w-0 items-center gap-2 truncate">
            {selectedOptions.length > 0 ? (
              <>
                <span className="flex -space-x-2">
                  {selectedOptions.slice(0, 3).map((opt) => {
                    const user = users.find((u) => u.id === opt.value);
                    return (
                      <Avatar key={opt.value} className="h-6 w-6 border-2 border-background">
                        <AvatarFallback
                          className={cn('text-[10px]', getColorClasses(user?.color || 'blue', 'avatar'))}
                        >
                          {opt.label[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    );
                  })}
                </span>
                <span className="truncate text-sm">
                  {selectedOptions.length === 1
                    ? selectedOptions[0].label
                    : `${selectedOptions.length} people`}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">Assign to...</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-2" align="start">
        <div className="max-h-[240px] space-y-1 overflow-y-auto">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent"
            >
              <Checkbox checked={value.includes(opt.value)} onCheckedChange={() => toggle(opt.value)} />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

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
  const [previewUrl, setPreviewUrl] = useState('');

  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDetails = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const { tasks } = await api.getTasks();
      const t = tasks.find((item) => item.id === taskId);
      setTask(t || null);
      const { files } = await api.getFiles({ taskId });
      setTaskFiles(files || []);
      const { comments: cList } = await api.getComments({ taskId });
      setComments(cList || []);
    } catch (err) {
      console.error(err);
      setTask(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [taskId]);

  useEffect(() => {
    if (!previewFile) {
      setPreviewUrl('');
      return undefined;
    }

    let cancelled = false;
    loadFilePreviewUrl(previewFile.id)
      .then((url) => {
        if (!cancelled) setPreviewUrl(url);
      })
      .catch((err) => {
        if (!cancelled) {
          showNotification({ title: 'Error', message: err.message, color: 'red' });
          setPreviewFile(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [previewFile]);

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      await api.deleteTask(task.id);
      showNotification({
        title: 'Moved to Recycle Bin',
        message: `"${task.title}" was moved to the Recycle Bin.`,
        color: 'blue',
      });
      onBack();
      refresh();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <TaskDetailSkeleton onBack={onBack} />;
  }

  if (!task) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" className="w-fit" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back to Tasks
        </Button>
        <p className="text-sm text-muted-foreground">Task not found.</p>
      </div>
    );
  }

  const project = projects.find((p) => p.id === task.projectId);
  const creator = users.find((u) => u.id === task.createdBy);
  const currentAssigneeIds = task.assigneeIds?.length
    ? task.assigneeIds
    : task.assigneeId
      ? [task.assigneeId]
      : [];

  const assigneeOptions = users
    .filter((u) => canBeAssignedToTask(u, user))
    .map((u) => ({ value: u.id, label: u.name }));

  const visibleAssigneeIds = currentAssigneeIds.filter((id) =>
    assigneeOptions.some((opt) => opt.value === id)
  );

  const handleStatusChange = async (newStatus) => {
    if (
      !canChangeTaskStatus({
        user,
        task,
        project,
        fromStatus: task.status,
        toStatus: newStatus,
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
      const progressVal = newStatus === 'done' ? 100 : task.progress;
      await api.updateTask(task.id, { status: newStatus, progress: progressVal });
      showNotification({
        title: 'Updated',
        message: `Status changed to ${newStatus.replace('_', ' ')}`,
        color: 'green',
      });
      loadDetails();
      refresh();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  const handleAssigneesChange = async (newAssigneeIds) => {
    const filteredAssigneeIds = newAssigneeIds.filter((id) =>
      assigneeOptions.some((opt) => opt.value === id)
    );

    try {
      await api.updateTask(task.id, {
        assigneeIds: filteredAssigneeIds,
        assigneeId: filteredAssigneeIds[0] || null,
      });
      showNotification({ title: 'Updated', message: 'Assignees updated', color: 'green' });
      loadDetails();
      refresh();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
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
      showNotification({ title: 'Error', message: err.message, color: 'red' });
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
      showNotification({ title: 'Success', message: 'Document attached to task', color: 'green' });
      setSelectedFiles([]);
      setUploadModalOpened(false);
      loadDetails();
      refresh();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fId) => {
    if (!window.confirm('Remove attached document?')) return;
    try {
      await api.deleteFile(fId);
      showNotification({ title: 'Removed', message: 'Document unlinked', color: 'blue' });
      loadDetails();
      refresh();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  const handleCopyLink = async (f) => {
    try {
      await copyFileDownloadLink(f.id);
      showNotification({ title: 'Copied!', message: 'Download link copied to clipboard', color: 'blue' });
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  const priorityColor =
    task.priority === 'urgent' ? 'red' : task.priority === 'high' ? 'orange' : 'blue';

  const allowedStatuses = getAllowedTaskStatuses({ user, task, project });
  const statusMeta = TASK_STATUSES.find((s) => s.id === task.status) || TASK_STATUSES[0];
  const todayStr = new Date().toISOString().slice(0, 10);
  const isOverdue = task.dueDate && task.dueDate < todayStr && task.status !== 'done';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back to Tasks
        </Button>

        {(user?.role === 'admin' || task.createdBy === user?.id) && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditModalOpened(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button variant="destructive" size="sm" className="bg-destructive/15 text-destructive hover:bg-destructive/25" onClick={() => setDeleteModalOpened(true)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className={cn('h-1 w-full', getColorClasses(statusMeta.color, 'progress'))} />

        <CardContent className="p-0">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b px-6 py-5">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono text-[11px] font-semibold tracking-wide">
                  {task.ref}
                </Badge>
                <Badge
                  className={cn('border-transparent text-white', getColorClasses(statusMeta.color, 'badge'))}
                >
                  {statusMeta.title}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('gap-1 border-transparent', getColorClasses(priorityColor, 'light'))}
                >
                  <Flag className="h-3 w-3" />
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </Badge>
              </div>

              <h2 className="text-2xl font-bold tracking-tight">{task.title}</h2>

              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Avatar className="h-6 w-6">
                  <AvatarFallback
                    className={cn('text-[10px]', getColorClasses(creator?.color || 'blue', 'avatar'))}
                  >
                    {creator?.name ? creator.name[0].toUpperCase() : '?'}
                  </AvatarFallback>
                </Avatar>
                <span>
                  Created {new Date(task.createdAt).toLocaleDateString()} by{' '}
                  <span className="font-medium text-foreground">{creator?.name || 'Unknown'}</span>
                </span>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-center">
              <p className="text-3xl font-bold tabular-nums leading-none">{task.progress}%</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Progress
              </p>
            </div>
          </div>

          {task.description && (
            <div className="border-b px-6 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Description
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {task.description}
              </p>
            </div>
          )}

          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            <TaskDetailField label="Status">
              <Select value={task.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className={cn('h-2 w-2 rounded-full', getColorClasses(status.color, 'progress'))}
                        />
                        {status.title}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TaskDetailField>

            <TaskDetailField icon={Users} label="Assigned to">
              {canChangeTaskAssignees(user) ? (
                <AssigneeMultiSelect
                  options={assigneeOptions}
                  value={visibleAssigneeIds}
                  onChange={handleAssigneesChange}
                  users={users}
                />
              ) : (
                <div className="flex h-9 items-center rounded-md border bg-background px-3 text-sm">
                  {visibleAssigneeIds.length
                    ? visibleAssigneeIds
                        .map((id) => users.find((u) => u.id === id)?.name)
                        .filter(Boolean)
                        .join(', ')
                    : 'Unassigned'}
                </div>
              )}
            </TaskDetailField>

            <TaskDetailField icon={CalendarDays} label="Due date">
              <div
                className={cn(
                  'flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium',
                  isOverdue ? 'border-destructive/40 text-destructive' : 'text-foreground'
                )}
              >
                {task.dueDate || 'No due date'}
              </div>
            </TaskDetailField>

            <TaskDetailField icon={Flag} label="Priority">
              <Badge
                className={cn(
                  'h-9 w-full justify-center border-transparent px-3 text-sm font-semibold text-white',
                  getColorClasses(priorityColor, 'badge')
                )}
              >
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </Badge>
            </TaskDetailField>
          </div>

          <div className="space-y-2 px-6 py-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Completion</span>
              <span className="tabular-nums">{task.progress}%</span>
            </div>
            <Progress
              value={task.progress}
              className="h-2.5"
              indicatorClassName={getColorClasses(statusMeta.color, 'progress')}
              indicatorStyle={getProgressStyle(statusMeta.color)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold uppercase text-muted-foreground">Attached Documents</p>
            {canCreateContent(user) && (
              <Button variant="outline" size="sm" onClick={() => setUploadModalOpened(true)}>
                <Paperclip className="h-4 w-4" />
                Attach a document
              </Button>
            )}
          </div>

          {taskFiles.length === 0 ? (
            <p className="text-sm italic text-muted-foreground">No attached documents on this task yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {taskFiles.map((f) => {
                const uploader = users.find((u) => u.id === f.uploadedBy);
                const isMedia = f.mime && (f.mime.startsWith('image/') || f.mime === 'application/pdf');
                return (
                  <Card key={f.id} className="bg-muted/30 shadow-none">
                    <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm font-semibold">{f.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(f.size / 1024).toFixed(1)} KB • shared by {uploader?.name || 'Someone'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        {isMedia && (
                          <Button variant="outline" size="sm" onClick={() => setPreviewFile(f)}>
                            <Eye className="h-3.5 w-3.5" />
                            Open
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            downloadFile(f.id).catch((err) => {
                              showNotification({ title: 'Error', message: err.message, color: 'red' });
                            });
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleCopyLink(f)}>
                          <Link className="h-3.5 w-3.5" />
                          Link
                        </Button>
                        {(user?.role === 'admin' || f.uploadedBy === user?.id) && (
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteFile(f.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <p className="mb-4 text-sm font-bold uppercase text-muted-foreground">Messages</p>

          <div className="mb-6 flex flex-col gap-2">
            {comments.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">No messages yet.</p>
            ) : (
              comments.map((c) => {
                const author = users.find((u) => u.id === c.authorId);
                return (
                  <Card key={c.id} className="bg-muted/40 shadow-none">
                    <CardContent className="p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className={cn('text-xs', getColorClasses(author?.color || 'blue', 'avatar'))}>
                            {author?.name ? author.name[0].toUpperCase() : '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-bold">{author?.name || 'Unknown'}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{c.body}</p>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {canProcessTasks(user) && (
            <form onSubmit={handleAddComment}>
            <div className="space-y-2">
              <Textarea
                placeholder="Write a message... everyone involved gets a notification."
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <div className="flex justify-end">
                <Button type="submit">
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
            </div>
          </form>
          )}
        </CardContent>
      </Card>

      <TaskModal
        taskId={task.id}
        opened={editModalOpened}
        onClose={() => {
          setEditModalOpened(false);
          loadDetails();
        }}
      />

      <Dialog open={uploadModalOpened} onOpenChange={setUploadModalOpened}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Attach Document to Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadSubmit}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="task-files">Choose files</Label>
                <Input
                  id="task-files"
                  type="file"
                  multiple
                  required
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                />
              </div>
              <Button type="submit" disabled={uploading}>
                {uploading && <Spinner />}
                Attach Document
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewFile?.name}</DialogTitle>
          </DialogHeader>
          {previewUrl ? (
            previewFile?.mime?.startsWith('image/') ? (
              <img
                src={previewUrl}
                alt={previewFile.name}
                className="max-h-[70vh] w-full object-contain"
              />
            ) : (
              <iframe
                src={previewUrl}
                title={previewFile?.name}
                className="h-[70vh] w-full border-0"
              />
            )
          ) : (
            <div className="flex h-[40vh] items-center justify-center">
              <Spinner className="size-8 text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteModalOpened} onOpenChange={setDeleteModalOpened}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Task?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>&quot;{task?.title}&quot;</strong>? It will be moved to the
              Recycle Bin where you can restore it or delete it permanently.
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
  );
}
