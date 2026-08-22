import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Pencil,
  Plus,
  Paperclip,
  Send,
  FileText,
  Download,
  Eye,
  Trash2,
  Link,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
import { copyFileDownloadLink, downloadFile, loadFilePreviewUrl } from '@/lib/files';
import { getBadgeStyle, getColorClasses, getProgressStyle } from '@/lib/colors';
import { cn } from '@/lib/utils';
import { api } from '../api';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ProjectModal } from '../components/ProjectModal';
import { TaskModal } from '../components/TaskModal';
import { TaskDetailView } from './TaskDetailView';

export function ProjectDetailView({ projectId, onBack }) {
  const { user } = useAuth();
  const { users, refresh } = useData();

  const [project, setProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [projectFiles, setProjectFiles] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  const [editProjectOpened, setEditProjectOpened] = useState(false);
  const [createTaskOpened, setCreateTaskOpened] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);

  const [uploadModalOpened, setUploadModalOpened] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const [deleteProjectModalOpened, setDeleteProjectModalOpened] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  const loadDetails = async () => {
    if (!projectId) return;
    try {
      const { projects } = await api.getProjects();
      const p = projects.find((item) => item.id === projectId);
      if (p) setProject(p);
      const { tasks } = await api.getTasks({ projectId });
      setProjectTasks(tasks || []);
      const { files } = await api.getFiles({ projectId });
      setProjectFiles(files || []);
      const { comments: cList } = await api.getComments({ projectId });
      setComments((cList || []).filter((c) => !c.taskId));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [projectId]);

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

  const handleConfirmDeleteProject = async () => {
    try {
      setDeletingProject(true);
      await api.deleteProject(project.id);
      showNotification({
        title: 'Moved to Recycle Bin',
        message: `"${project.name}" was moved to the Recycle Bin.`,
        color: 'blue',
      });
      onBack();
      refresh();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setDeletingProject(false);
    }
  };

  if (activeTaskId) {
    return (
      <TaskDetailView
        taskId={activeTaskId}
        onBack={() => {
          setActiveTaskId(null);
          loadDetails();
        }}
      />
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" className="w-fit" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          All projects
        </Button>
        <p className="text-sm text-muted-foreground">Loading project details...</p>
      </div>
    );
  }

  const owner = users.find((u) => u.id === project.ownerId);
  const teamMembers = users.filter(
    (u) => (project.memberIds || []).includes(u.id) || u.id === project.ownerId
  );
  const doneCount = projectTasks.filter((t) => t.status === 'done').length;
  const progressPercent = projectTasks.length
    ? Math.round(
        projectTasks.reduce((a, t) => a + (t.status === 'done' ? 100 : t.progress), 0) / projectTasks.length
      )
    : 0;

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await api.createComment({ projectId: project.id, body: newComment });
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
      formData.append('projectId', project.id);
      for (const f of selectedFiles) {
        formData.append('files', f);
      }
      await api.uploadFiles(formData);
      showNotification({ title: 'Success', message: 'Document shared in project', color: 'green' });
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
    if (!window.confirm('Delete this document from project?')) return;
    try {
      await api.deleteFile(fId);
      showNotification({ title: 'Removed', message: 'Document moved to _removed folder', color: 'blue' });
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

  const statusColor = (status) => {
    if (status === 'done') return 'green';
    if (status === 'in_progress') return 'blue';
    return 'gray';
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            All projects
          </Button>

          <div className="flex items-center gap-2">
            {(user?.role === 'admin' || project.ownerId === user?.id) && (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditProjectOpened(true)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="bg-destructive/15 text-destructive hover:bg-destructive/25"
                  onClick={() => setDeleteProjectModalOpened(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </>
            )}
            {user?.role !== 'viewer' && (
              <Button size="sm" onClick={() => setCreateTaskOpened(true)}>
                <Plus className="h-4 w-4" />
                New Task
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="space-y-4 p-6">
            <Badge
              className={cn('text-base border-transparent text-white', getColorClasses(project.colour || 'blue', 'badge'))}
              style={getBadgeStyle(project.colour)}
            >
              {project.name}
            </Badge>

            {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}

            <div className="flex flex-wrap gap-8">
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Owner</p>
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className={cn('text-xs', getColorClasses(owner?.color || 'blue', 'avatar'))}>
                      {owner?.name ? owner.name[0].toUpperCase() : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold">{owner?.name || 'Unknown'}</span>
                </div>
              </div>

              {project.client && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Client</p>
                  <span className="text-sm font-semibold">{project.client}</span>
                </div>
              )}

              {project.dueDate && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Due</p>
                  <span className="text-sm font-semibold">{project.dueDate}</span>
                </div>
              )}

              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Team</p>
                <div className="flex -space-x-1">
                  {teamMembers.map((m) => (
                    <Tooltip key={m.id}>
                      <TooltipTrigger asChild>
                        <Avatar className="h-6 w-6 border-2 border-background">
                          <AvatarFallback className={cn('text-xs', getColorClasses(m.color || 'blue', 'avatar'))}>
                            {m.name ? m.name[0].toUpperCase() : '?'}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>{m.name}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">
                {progressPercent}% complete • {doneCount} of {projectTasks.length} tasks done •{' '}
                {projectFiles.length} documents
              </p>
              <Progress
                value={progressPercent}
                className="h-2.5"
                indicatorClassName={getColorClasses(project.colour || 'blue', 'progress')}
                indicatorStyle={getProgressStyle(project.colour)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="mb-4 text-sm font-bold uppercase text-muted-foreground">Tasks</p>
            {projectTasks.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">No tasks created for this project yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {projectTasks.map((t) => {
                  const assignee = users.find((u) => u.id === t.assigneeId);
                  return (
                    <Card
                      key={t.id}
                      className="cursor-pointer bg-muted/30 shadow-none transition-colors hover:bg-muted/50"
                      onClick={() => setActiveTaskId(t.id)}
                    >
                      <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-bold text-muted-foreground">{t.ref}</span>
                          <span className="text-sm font-semibold">{t.title}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          {assignee && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className={cn('text-xs', getColorClasses(assignee.color || 'blue', 'avatar'))}>
                                    {assignee.name[0].toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>{assignee.name}</TooltipContent>
                            </Tooltip>
                          )}
                          <Badge className={cn('border-transparent text-white', getColorClasses(statusColor(t.status), 'badge'))}>
                            {t.status.replace('_', ' ')}
                          </Badge>
                          <Progress value={t.progress} className="h-1 w-20" />
                          <span className="text-xs text-muted-foreground">{t.dueDate || '-'}</span>
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
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold uppercase text-muted-foreground">Documents</p>
              {user?.role !== 'viewer' && (
                <Button variant="outline" size="sm" onClick={() => setUploadModalOpened(true)}>
                  <Paperclip className="h-4 w-4" />
                  Share a document here
                </Button>
              )}
            </div>

            {projectFiles.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">No documents shared in this project yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {projectFiles.map((f) => {
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
                              {(f.size / 1024).toFixed(1)} KB • shared by {uploader?.name || 'Someone'}{' '}
                              {new Date(f.createdAt).toLocaleDateString()}
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
            <p className="mb-4 text-sm font-bold uppercase text-muted-foreground">Project Discussion</p>

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
          </CardContent>
        </Card>

        <ProjectModal
          project={project}
          opened={editProjectOpened}
          onClose={() => {
            setEditProjectOpened(false);
            loadDetails();
          }}
        />

        <TaskModal
          opened={createTaskOpened}
          onClose={() => {
            setCreateTaskOpened(false);
            loadDetails();
          }}
        />

        <Dialog open={uploadModalOpened} onOpenChange={setUploadModalOpened}>
          <DialogContent className="sm:max-w-[620px]">
            <DialogHeader>
              <DialogTitle>Share Document in Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUploadSubmit}>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="project-files">Choose files</Label>
                  <Input
                    id="project-files"
                    type="file"
                    multiple
                    required
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                  />
                </div>
                <Button type="submit" disabled={uploading}>
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Share Document
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
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={deleteProjectModalOpened} onOpenChange={setDeleteProjectModalOpened}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete Project?
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>&quot;{project?.name}&quot;</strong>? It will be moved to
                the Recycle Bin where you can restore it or delete it permanently.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteProjectModalOpened(false)}>
                Cancel
              </Button>
              <Button variant="destructive" disabled={deletingProject} onClick={handleConfirmDeleteProject}>
                {deletingProject && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
