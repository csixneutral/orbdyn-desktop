import React, { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';
import {
  Upload,
  Download,
  Trash2,
  Eye,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { PageHeader } from '@/components/ui/typography';
import { canCreateContent } from '@/lib/roles';
import { showNotification } from '@/lib/notify';
import { downloadFile, loadFilePreviewUrl } from '@/lib/files';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export function DocumentsView({ projectId }) {
  const { user } = useAuth();
  const { files, projects, users, refresh } = useData();

  const [filterProject, setFilterProject] = useState(projectId || null);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProject, setUploadProject] = useState(projectId || null);
  const [uploadModalOpened, setUploadModalOpened] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (projectId) {
      setFilterProject(projectId);
      setUploadProject(projectId);
    }
  }, [projectId]);

  const handleOpenDelete = (f) => {
    setFileToDelete(f);
    setDeleteModalOpened(true);
  };

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
    if (!fileToDelete) return;
    try {
      setDeleting(true);
      await api.deleteFile(fileToDelete.id);
      showNotification({
        title: 'Moved to Recycle Bin',
        message: `"${fileToDelete.name}" was moved to the Recycle Bin.`,
        color: 'blue',
      });
      setDeleteModalOpened(false);
      setFileToDelete(null);
      refresh();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setDeleting(false);
    }
  };

  const isProjectScoped = Boolean(projectId);
  const tableColumnCount = isProjectScoped ? 4 : 6;

  const filteredFiles = files.filter((f) => {
    if (filterProject && f.projectId !== filterProject) return false;
    return true;
  });

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) {
      showNotification({ title: 'Error', message: 'Select at least one file', color: 'red' });
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      if (uploadProject) formData.append('projectId', uploadProject);
      for (const file of selectedFiles) {
        formData.append('files', file);
      }

      await api.uploadFiles(formData);
      showNotification({
        title: 'Success',
        message: 'Files uploaded to Orbdyn folder',
        color: 'green',
      });
      setSelectedFiles([]);
      setUploadModalOpened(false);
      refresh();
    } catch (err) {
      showNotification({ title: 'Upload Failed', message: err.message, color: 'red' });
    } finally {
      setUploading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description={projectId ? 'Files shared in this project' : 'Shared files across your projects'}
      >
        {canCreateContent(user) && (
          <Button onClick={() => setUploadModalOpened(true)}>
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        )}
      </PageHeader>

      {!projectId && (
      <div>
        <Select
          value={filterProject || '__all__'}
          onValueChange={(val) => setFilterProject(val === '__all__' ? null : val)}
        >
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Filter by Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document Name</TableHead>
              {!isProjectScoped && <TableHead>Project</TableHead>}
              {!isProjectScoped && <TableHead>Size</TableHead>}
              <TableHead>Uploaded By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={tableColumnCount} className="py-12 text-center text-muted-foreground">
                  No documents uploaded yet.
                </TableCell>
              </TableRow>
            ) : (
              filteredFiles.map((f) => {
                const project = projects.find((p) => p.id === f.projectId);
                const uploader = users.find((u) => u.id === f.uploadedBy);
                const isMedia = f.mime && (f.mime.startsWith('image/') || f.mime === 'application/pdf');

                return (
                  <TableRow key={f.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">{f.name}</span>
                      </div>
                    </TableCell>
                    {!isProjectScoped && (
                      <TableCell>
                        {project ? (
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{ borderColor: project.colour, color: project.colour }}
                          >
                            {project.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">General</span>
                        )}
                      </TableCell>
                    )}
                    {!isProjectScoped && (
                      <TableCell>
                        <span className="text-xs">{formatBytes(f.size)}</span>
                      </TableCell>
                    )}
                    <TableCell>
                      <span className="text-xs">{uploader ? uploader.name : 'Unknown'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs">{new Date(f.createdAt).toLocaleDateString()}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {isMedia && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary"
                            onClick={() => setPreviewFile(f)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-500 hover:text-emerald-500"
                          onClick={() => {
                            downloadFile(f.id).catch((err) => {
                              showNotification({ title: 'Error', message: err.message, color: 'red' });
                            });
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {(user?.role === 'admin' || f.uploadedBy === user?.id) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleOpenDelete(f)}
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

      <Dialog open={uploadModalOpened} onOpenChange={setUploadModalOpened}>
        <DialogContent className="max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            {!isProjectScoped && (
            <div className="space-y-2">
              <Label>Associated Project (Optional)</Label>
              <Select
                value={uploadProject || '__none__'}
                onValueChange={(val) => setUploadProject(val === '__none__' ? null : val)}
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
            )}

            <div className="space-y-2">
              <Label>Choose files</Label>
              <input
                type="file"
                multiple
                required
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-sm file:text-primary-foreground"
                onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
              />
              {selectedFiles.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <Button type="submit" disabled={uploading} className="w-full">
              {uploading && <Spinner />}
              Share Document
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewFile} onOpenChange={(v) => !v && setPreviewFile(null)}>
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

      <AlertDialog open={deleteModalOpened} onOpenChange={setDeleteModalOpened}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Document?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&quot;{fileToDelete?.name}&quot;</strong>? It
              will be moved to the Recycle Bin where you can restore it or delete it permanently.
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
              Delete Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
