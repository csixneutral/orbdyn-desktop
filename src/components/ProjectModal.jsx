import React, { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';
import {
  Folder,
  Trash2,
  Pencil,
  Plus,
  User,
  Calendar,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { MultiSelect } from '@/components/ui/multi-select';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import { showNotification } from '@/lib/notify';
import { api } from '../api';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const PRESET_COLORS = ['#3d7fe0', '#5b8def', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function SegmentedControl({ value, onChange, options }) {
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
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ProjectModal({ project, opened, onClose }) {
  const { user } = useAuth();
  const { users, refresh } = useData();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [client, setClient] = useState('');
  const [colour, setColour] = useState('#3d7fe0');
  const [visibility, setVisibility] = useState('everyone');
  const [memberIds, setMemberIds] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpened, setDeleteConfirmOpened] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const projectOwnerId = project?.ownerId || user?.id;
  const memberOptions = users
    .filter((u) => u.id !== projectOwnerId)
    .map((u) => ({ value: u.id, label: u.name }));

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setDescription(project.description || '');
      setClient(project.client || '');
      setColour(project.colour || '#3d7fe0');
      setVisibility(project.visibility || 'everyone');
      setMemberIds((project.memberIds || []).filter((id) => id !== project.ownerId));
      setDueDate(project.dueDate || '');
    } else {
      setName('');
      setDescription('');
      setClient('');
      setColour('#3d7fe0');
      setVisibility('everyone');
      setMemberIds([]);
      setDueDate('');
    }
  }, [project, opened]);

  const handleSave = async () => {
    if (!name.trim()) {
      showNotification({ title: 'Error', message: 'Project name is required', color: 'red' });
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        name,
        description,
        client,
        colour,
        visibility,
        memberIds: memberIds.filter((id) => id && id !== projectOwnerId),
        dueDate,
      };

      if (project?.id) {
        await api.updateProject(project.id, payload);
        showNotification({ title: 'Success', message: 'Project updated', color: 'green' });
      } else {
        await api.createProject(payload);
        showNotification({ title: 'Success', message: 'Project created', color: 'green' });
      }
      refresh();
      onClose();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!project?.id) return;
    try {
      setDeleting(true);
      await api.deleteProject(project.id);
      showNotification({
        title: 'Moved to Recycle Bin',
        message: `"${project.name}" was moved to the Recycle Bin.`,
        color: 'blue',
      });
      setDeleteConfirmOpened(false);
      onClose();
      refresh();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={opened} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-[620px] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
                <Folder className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>{project ? 'Edit Project' : 'New Project'}</DialogTitle>
                <DialogDescription>
                  {project
                    ? 'Modify details and member access'
                    : 'Organize tasks and shared documents'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="bg-muted/20">
              <CardContent className="space-y-3 pt-4">
                <div className="space-y-2">
                  <Label>Project Name</Label>
                  <Input
                    placeholder="e.g. Website Redesign"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="What is this project about?"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/20">
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Client Name</Label>
                  <Input
                    placeholder="e.g. Internal / Acme Corp"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    Project Color Accent
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full border transition-shadow',
                          colour.toLowerCase() === hex.toLowerCase()
                            ? 'border-white shadow-[0_0_8px_var(--tw-shadow-color)]'
                            : 'border-white/10'
                        )}
                        style={{ backgroundColor: hex, '--tw-shadow-color': hex }}
                        onClick={() => setColour(hex)}
                      >
                        {colour.toLowerCase() === hex.toLowerCase() && (
                          <Check className="h-4 w-4 text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {project ? (
              <Card className="bg-muted/20">
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                      Visibility Permissions
                    </Label>
                    <SegmentedControl
                      value={visibility}
                      onChange={setVisibility}
                      options={[
                        { label: 'Everyone in Workspace', value: 'everyone' },
                        { label: 'Team Members Only', value: 'members' },
                      ]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-violet-500" />
                      Target Due Date
                    </Label>
                    <DatePicker value={dueDate} onChange={setDueDate} placeholder="Pick target due date" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5 text-xs font-semibold">
                        <User className="h-3.5 w-3.5 text-emerald-500" />
                        Team Members
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        Project Owner is automatically included
                      </span>
                    </div>
                    <MultiSelect
                      options={memberOptions}
                      value={memberIds.filter((id) => id !== projectOwnerId)}
                      onChange={setMemberIds}
                      placeholder="Select additional team members"
                    />
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="flex items-center justify-between pt-2">
              {project?.id ? (
                <Button
                  variant="destructive"
                  size="sm"
                  className="bg-destructive/15 text-destructive hover:bg-destructive/25"
                  onClick={() => setDeleteConfirmOpened(true)}
                >
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
                    <Spinner />
                  ) : project ? (
                    <Pencil className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {project ? 'Save Changes' : 'Create Project'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpened} onOpenChange={setDeleteConfirmOpened}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Project?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&quot;{project?.name}&quot;</strong>? It will be
              moved to the Recycle Bin where you can restore it or delete it permanently.
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
    </>
  );
}
