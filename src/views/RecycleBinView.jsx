import React, { useState } from 'react';
import {
  Trash2,
  RefreshCw,
  AlertTriangle,
  Folder,
  ListChecks,
  FileText,
  User,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { showNotification } from '@/lib/notify.js';
import { getColorClasses } from '@/lib/colors';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/typography';
import { api } from '../api';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

export function RecycleBinView() {
  const { user } = useAuth();
  const { trash, refresh } = useData();

  const [activeTab, setActiveTab] = useState('all');
  const [confirmModalOpened, setConfirmModalOpened] = useState(false);
  const [targetItem, setTargetItem] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredTrash = (trash || []).filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'project') return item.type === 'project';
    if (activeTab === 'task') return item.type === 'task';
    if (activeTab === 'file') return item.type === 'file';
    if (activeTab === 'user') return item.type === 'user';
    return true;
  });

  const handleRestore = async (item) => {
    try {
      await api.restoreTrash(item.id);
      showNotification({
        title: 'Restored!',
        message: `"${item.name}" has been restored to your workspace.`,
        color: 'green',
      });
      refresh();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  const handlePromptDeletePermanent = (item) => {
    setTargetItem(item);
    setActionType('deletePermanent');
    setConfirmModalOpened(true);
  };

  const handlePromptEmptyAll = () => {
    setTargetItem(null);
    setActionType('emptyAll');
    setConfirmModalOpened(true);
  };

  const handleConfirmAction = async () => {
    try {
      setSubmitting(true);
      if (actionType === 'deletePermanent' && targetItem) {
        await api.deleteTrashPermanent(targetItem.id);
        showNotification({
          title: 'Permanently Deleted',
          message: `"${targetItem.name}" was permanently removed.`,
          color: 'blue',
        });
      } else if (actionType === 'emptyAll') {
        await api.emptyTrash();
        showNotification({
          title: 'Emptied',
          message: 'All items in the Recycle Bin were permanently deleted.',
          color: 'blue',
        });
      }
      setConfirmModalOpened(false);
      refresh();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'project':
        return <Folder className="h-4 w-4 text-[#3d7fe0]" />;
      case 'task':
        return <ListChecks className="h-4 w-4 text-emerald-500" />;
      case 'file':
        return <FileText className="h-4 w-4 text-violet-500" />;
      case 'user':
        return <User className="h-4 w-4 text-amber-500" />;
      default:
        return <Trash2 className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type) => {
    const colorMap = {
      project: 'blue',
      task: 'green',
      file: 'violet',
      user: 'amber',
    };
    const labels = {
      project: 'Project',
      task: 'Task',
      file: 'Document',
      user: 'Person',
    };
    const color = colorMap[type] || 'gray';
    return (
      <Badge className={cn('border-transparent text-white', getColorClasses(color, 'badge'))}>
        {labels[type] || type}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Recycle Bin"
        description="Deleted items are held here safely. Restore them or delete permanently."
      >
        {trash.length > 0 && user?.role !== 'viewer' && (
          <Button
            variant="destructive"
            className="bg-destructive/15 text-destructive hover:bg-destructive/25"
            onClick={handlePromptEmptyAll}
          >
            <Trash2 className="h-4 w-4" />
            Empty Recycle Bin
          </Button>
        )}
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({trash.length})</TabsTrigger>
          <TabsTrigger value="project">
            <Folder className="h-3.5 w-3.5" />
            Projects ({trash.filter((i) => i.type === 'project').length})
          </TabsTrigger>
          <TabsTrigger value="task">
            <ListChecks className="h-3.5 w-3.5" />
            Tasks ({trash.filter((i) => i.type === 'task').length})
          </TabsTrigger>
          <TabsTrigger value="file">
            <FileText className="h-3.5 w-3.5" />
            Documents ({trash.filter((i) => i.type === 'file').length})
          </TabsTrigger>
          <TabsTrigger value="user">
            <User className="h-3.5 w-3.5" />
            People ({trash.filter((i) => i.type === 'user').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Deleted By</TableHead>
                  <TableHead>Deleted Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrash.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      Recycle Bin is empty.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTrash.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(item.type)}
                          <span className="text-sm font-semibold">{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(item.type)}</TableCell>
                      <TableCell>
                        <span className="text-sm">{item.deletedByName || 'Unknown'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.deletedAt).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {user?.role !== 'viewer' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="bg-green-500/15 text-green-400 hover:bg-green-500/25"
                              onClick={() => handleRestore(item)}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Restore
                            </Button>
                          )}
                          {user?.role !== 'viewer' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handlePromptDeletePermanent(item)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={confirmModalOpened} onOpenChange={setConfirmModalOpened}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {actionType === 'emptyAll' ? 'Empty Recycle Bin?' : 'Delete Permanently?'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'emptyAll'
                ? 'Are you sure you want to permanently delete ALL items in the Recycle Bin? This action CANNOT be undone.'
                : `Are you sure you want to permanently delete "${targetItem?.name}"? This action CANNOT be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmModalOpened(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={submitting} onClick={handleConfirmAction}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
