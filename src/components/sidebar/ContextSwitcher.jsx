import React, { useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Building2, Check, ChevronsUpDown, FolderKanban, Plus, Settings, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { AppLogo } from '@/components/AppLogo';
import { cn } from '@/lib/utils';
import { getBadgeStyle, getColorClasses } from '@/lib/colors';
import { showNotification } from '@/lib/notify';

function ProjectIcon({ project, className }) {
  return (
    <div
      className={cn(
        'flex aspect-square size-6 shrink-0 items-center justify-center rounded-sm text-xs font-semibold text-white',
        getColorClasses(project?.colour || 'blue', 'badge'),
        className
      )}
      style={getBadgeStyle(project?.colour)}
    >
      {project?.name ? project.name[0].toUpperCase() : 'P'}
    </div>
  );
}

export function ContextSwitcher({
  orgName,
  workspaces = [],
  activeWorkspaceId,
  project = null,
  projects = [],
  onSelectProject,
  onAllProjects,
  onOpenPeople,
  onOpenSettings,
  onCreateProject,
  onSwitchWorkspace,
  onCreateOrganization,
}) {
  const inProject = !!project;
  const subtitle = inProject ? project.name : orgName || 'Workspace';
  const sortedProjects = [...projects].sort((a, b) => a.name.localeCompare(b.name));
  const sortedWorkspaces = [...workspaces].sort((a, b) => a.orgName.localeCompare(b.orgName));

  const [createOpen, setCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);

  const handleSwitch = async (workspaceId) => {
    if (!onSwitchWorkspace || workspaceId === activeWorkspaceId) return;
    try {
      setSwitchingId(workspaceId);
      await onSwitchWorkspace(workspaceId);
    } catch (err) {
      showNotification({ title: 'Switch failed', message: err.message, color: 'red' });
    } finally {
      setSwitchingId(null);
    }
  };

  const handleCreateOrganization = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim()) {
      showNotification({ title: 'Error', message: 'Enter an organization name', color: 'red' });
      return;
    }
    try {
      setCreating(true);
      await onCreateOrganization?.({ orgName: newOrgName.trim() });
      setCreateOpen(false);
      setNewOrgName('');
      showNotification({
        title: 'Organization created',
        message: 'You can now manage projects in your new workspace.',
        color: 'green',
      });
    } catch (err) {
      showNotification({ title: 'Could not create organization', message: err.message, color: 'red' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                tooltip="Orbdyn"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <AppLogo size="sm" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Orbdyn</span>
                  <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              align="start"
              side="bottom"
              sideOffset={4}
            >
              {inProject ? (
                <>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Projects</DropdownMenuLabel>
                  {sortedProjects.length === 0 ? (
                    <DropdownMenuItem disabled className="text-muted-foreground">
                      No projects yet
                    </DropdownMenuItem>
                  ) : (
                    sortedProjects.map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        className="gap-2 p-2"
                        onSelect={() => onSelectProject?.(item.id)}
                      >
                        <ProjectIcon project={item} />
                        <span className="flex-1 truncate">{item.name}</span>
                        {item.id === project.id ? <Check className="ml-auto size-4" /> : null}
                      </DropdownMenuItem>
                    ))
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={onAllProjects}>
                    <FolderKanban />
                    All projects
                  </DropdownMenuItem>
                  {onCreateProject ? (
                    <DropdownMenuItem onSelect={onCreateProject}>
                      <Plus />
                      New project
                    </DropdownMenuItem>
                  ) : null}
                </>
              ) : (
                <>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Organizations</DropdownMenuLabel>
                  {sortedWorkspaces.length === 0 ? (
                    <DropdownMenuItem disabled className="gap-2 p-2 text-muted-foreground">
                      <Building2 className="size-4" />
                      {orgName || 'Current workspace'}
                    </DropdownMenuItem>
                  ) : (
                    sortedWorkspaces.map((ws) => (
                      <DropdownMenuItem
                        key={ws.id}
                        className="gap-2 p-2"
                        disabled={switchingId === ws.id}
                        onSelect={() => handleSwitch(ws.id)}
                      >
                        <Building2 className="size-4 shrink-0" />
                        <span className="flex-1 truncate">{ws.orgName}</span>
                        {ws.id === activeWorkspaceId || ws.active ? (
                          <Check className="ml-auto size-4" />
                        ) : switchingId === ws.id ? (
                          <Spinner className="ml-auto size-4" />
                        ) : null}
                      </DropdownMenuItem>
                    ))
                  )}
                  {onCreateOrganization ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
                        <Plus />
                        Create organization
                      </DropdownMenuItem>
                    </>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={onAllProjects}>
                    <FolderKanban />
                    All projects
                  </DropdownMenuItem>
                  {onOpenPeople ? (
                    <DropdownMenuItem onSelect={onOpenPeople}>
                      <Users />
                      People
                    </DropdownMenuItem>
                  ) : null}
                  {onOpenSettings ? (
                    <DropdownMenuItem onSelect={onOpenSettings}>
                      <Settings />
                      Settings
                    </DropdownMenuItem>
                  ) : null}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create organization</DialogTitle>
            <DialogDescription>
              Add another team or company workspace. You can switch between organizations anytime from this menu.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateOrganization}>
            <div className="grid gap-2 py-2">
              <Label htmlFor="new-org-name">Organization name</Label>
              <Input
                id="new-org-name"
                placeholder="e.g. Acme Studio"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating && <Spinner />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
