import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Send,
  Trash2,
  Folder,
  User,
  Calendar,
  Clock,
  ListChecks,
  FileText,
  Plus,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { showNotification } from '@/lib/notify';
import { api } from '../api';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

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

function SegmentedControl({ value, onChange, options, activeClassName }) {
  return (
    <div className="flex rounded-md border bg-muted/40 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 rounded-sm px-2 py-1.5 text-xs font-medium transition-colors',
            value === opt.value
              ? cn('bg-background text-foreground shadow-sm', activeClassName)
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function TaskModal({ taskId, opened, onClose, defaultProjectId }) {
  const { user } = useAuth();
  const { projects, users, refresh } = useData();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(null);
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('normal');
  const [progress, setProgress] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [estimateHours, setEstimateHours] = useState(0);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (taskId) {
      loadTaskDetails();
    } else {
      resetForm();
    }
  }, [taskId, opened, defaultProjectId]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setProjectId(defaultProjectId || projects[0]?.id || null);
    setAssigneeIds(user?.id ? [user.id] : []);
    setStatus('todo');
    setPriority('normal');
    setProgress(0);
    setDueDate('');
    setEstimateHours(0);
    setComments([]);
  };

  const loadTaskDetails = async () => {
    try {
      const { tasks } = await api.getTasks();
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        setTitle(task.title || '');
        setDescription(task.description || '');
        setProjectId(task.projectId || null);
        setAssigneeIds(
          task.assigneeIds?.length ? task.assigneeIds : task.assigneeId ? [task.assigneeId] : []
        );
        setStatus(task.status || 'todo');
        setPriority(task.priority || 'normal');
        setProgress(task.progress || 0);
        setDueDate(task.dueDate || '');
        setEstimateHours(task.estimateHours || 0);

        const { comments: cList } = await api.getComments({ taskId });
        setComments(cList || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showNotification({ title: 'Error', message: 'Task title is required', color: 'red' });
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        title,
        description,
        projectId,
        assigneeIds,
        assigneeId: assigneeIds[0] || null,
        status,
        priority,
        progress,
        dueDate,
        estimateHours,
      };

      if (taskId) {
        await api.updateTask(taskId, payload);
        showNotification({ title: 'Success', message: 'Work item updated', color: 'green' });
      } else {
        await api.createTask(payload);
        showNotification({ title: 'Success', message: 'Work item created', color: 'green' });
      }
      refresh();
      onClose();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.deleteTask(taskId);
      showNotification({ title: 'Deleted', message: 'Work item removed', color: 'blue' });
      refresh();
      onClose();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !taskId) return;
    try {
      const res = await api.createComment({ taskId, body: newComment });
      setComments((prev) => [...prev, res.comment]);
      setNewComment('');
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  const assigneeOptions = (() => {
    const selProj = projects.find((p) => p.id === projectId);
    if (selProj && selProj.visibility === 'members') {
      const allowedIds = new Set([selProj.ownerId, ...(selProj.memberIds || [])]);
      return users
        .filter((u) => u.active !== false && allowedIds.has(u.id))
        .map((u) => ({ value: u.id, label: u.name }));
    }
    return users.filter((u) => u.active !== false).map((u) => ({ value: u.id, label: u.name }));
  })();

  return (
    <Dialog open={opened} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-[620px] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{taskId ? 'Edit Task' : 'New Task'}</DialogTitle>
              <DialogDescription>
                {taskId
                  ? 'Update details, track progress & discuss'
                  : 'Create a new task and award to team members'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="bg-muted/20">
            <CardContent className="space-y-3 pt-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  Title
                </Label>
                <Input
                  placeholder="What needs to be done?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Add requirements, details, or notes..."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/20">
            <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold">
                  <Folder className="h-3.5 w-3.5 text-blue-500" />
                  Project
                </Label>
                <Select
                  value={projectId || '__none__'}
                  onValueChange={(val) => {
                    const nextId = val === '__none__' ? null : val;
                    setProjectId(nextId);
                    const selProj = projects.find((p) => p.id === nextId);
                    if (selProj && selProj.visibility === 'members') {
                      const allowedIds = new Set([selProj.ownerId, ...(selProj.memberIds || [])]);
                      setAssigneeIds((prev) => prev.filter((id) => allowedIds.has(id)));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold">
                  <User className="h-3.5 w-3.5 text-emerald-500" />
                  Awarded To / Assignees
                </Label>
                <MultiSelect
                  options={assigneeOptions}
                  value={assigneeIds}
                  onChange={setAssigneeIds}
                  placeholder="Select assignees"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/20">
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Status</Label>
                <SegmentedControl
                  value={status}
                  onChange={(val) => {
                    setStatus(val);
                    if (val === 'done') setProgress(100);
                  }}
                  options={[
                    { label: 'To Do', value: 'todo' },
                    { label: 'In Progress', value: 'in_progress' },
                    { label: 'In Review', value: 'review' },
                    { label: 'Done', value: 'done' },
                    { label: 'Blocked', value: 'blocked' },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Priority</Label>
                <SegmentedControl
                  value={priority}
                  onChange={setPriority}
                  activeClassName={
                    priority === 'urgent'
                      ? 'text-red-500'
                      : priority === 'high'
                        ? 'text-orange-500'
                        : undefined
                  }
                  options={[
                    { label: 'Low', value: 'low' },
                    { label: 'Normal', value: 'normal' },
                    { label: 'High', value: 'high' },
                    { label: 'Urgent', value: 'urgent' },
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/20">
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-semibold">Completion Progress</span>
                </div>
                <Badge variant={progress === 100 ? 'default' : 'secondary'}>{progress}%</Badge>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold">
                    <Calendar className="h-3.5 w-3.5 text-violet-500" />
                    Due Date
                  </Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold">
                    <Clock className="h-3.5 w-3.5 text-pink-500" />
                    Estimated Hours
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={estimateHours}
                    onChange={(e) => setEstimateHours(Number(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {taskId && (
            <Card className="bg-muted/20">
              <CardContent className="space-y-3 pt-4">
                <Separator />
                <p className="text-center text-xs font-medium text-muted-foreground">Activity & Discussion</p>
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2 pr-3">
                    {comments.length === 0 ? (
                      <p className="py-2 text-center text-xs italic text-muted-foreground">
                        No comments yet on this task.
                      </p>
                    ) : (
                      comments.map((c) => {
                        const author = users.find((u) => u.id === c.authorId);
                        return (
                          <div key={c.id} className="rounded-md border bg-muted/30 p-2">
                            <div className="mb-1 flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback
                                  className="text-[10px] text-white"
                                  style={{ backgroundColor: getAvatarBg(author?.color) }}
                                >
                                  {author?.name ? author.name[0].toUpperCase() : '?'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-semibold">{author?.name || 'Unknown'}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(c.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-sm">{c.body}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <Input
                    placeholder="Type a message or update..."
                    className="flex-1"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <Button type="submit" size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between pt-2">
            {taskId ? (
              <Button variant="destructive" size="sm" className="bg-destructive/15 text-destructive hover:bg-destructive/25" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={submitting} size="sm">
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : taskId ? (
                  <ListChecks className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {taskId ? 'Save Changes' : 'Create Task'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
