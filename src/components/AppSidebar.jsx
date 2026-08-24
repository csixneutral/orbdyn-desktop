import React from 'react';
import {
  ChevronsUpDown,
  Folder,
  LogOut,
  Settings,
  Trash2,
  Users,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { ContextSwitcher } from '@/components/sidebar/ContextSwitcher';
import { cn } from '@/lib/utils';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const AVATAR_COLORS = {
  blue: 'bg-blue-600 text-white',
  green: 'bg-green-600 text-white',
  red: 'bg-red-600 text-white',
  yellow: 'bg-yellow-600 text-white',
  violet: 'bg-violet-600 text-white',
  cyan: 'bg-cyan-600 text-white',
  gray: 'bg-muted text-foreground',
};

const NAV_ITEMS = [
  { id: 'projects', label: 'Projects', icon: Folder },
  { id: 'people', label: 'People', icon: Users },
  { id: 'trash', label: 'Recycle Bin', icon: Trash2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function AppSidebar({ currentView, onNavigate, onSwitchWorkspace, onCreateOrganization, onWorkspaceChanged, ...props }) {
  const { user, logout, orgName, workspaces, activeWorkspaceId, switchWorkspace, createOrganization } = useAuth();
  const { trash } = useData();
  const avatarColorClass = AVATAR_COLORS[user?.color] || AVATAR_COLORS.blue;

  const handleSwitch = async (workspaceId) => {
    const fn = onSwitchWorkspace || switchWorkspace;
    await fn(workspaceId);
    onWorkspaceChanged?.();
  };

  const handleCreateOrg = async (payload) => {
    const fn = onCreateOrganization || createOrganization;
    await fn(payload);
    onWorkspaceChanged?.();
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <ContextSwitcher
          orgName={orgName}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onAllProjects={() => onNavigate('projects')}
          onOpenPeople={() => onNavigate('people')}
          onOpenSettings={() => onNavigate('settings')}
          onSwitchWorkspace={handleSwitch}
          onCreateOrganization={handleCreateOrg}
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const badge = item.id === 'trash' && trash?.length ? String(trash.length) : null;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={currentView === item.id}
                      onClick={() => onNavigate(item.id)}
                      tooltip={item.label}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {badge ? <SidebarMenuBadge>{badge}</SidebarMenuBadge> : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className={cn('rounded-lg text-xs font-semibold', avatarColorClass)}>
                      {user?.name ? user.name[0].toUpperCase() : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user?.name}</span>
                    <span className="truncate text-xs capitalize text-muted-foreground">{user?.role}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg" side="bottom" align="end" sideOffset={4}>
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className={cn('rounded-lg text-xs font-semibold', avatarColorClass)}>
                        {user?.name ? user.name[0].toUpperCase() : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user?.name}</span>
                      <span className="truncate text-xs text-muted-foreground">@{user?.username}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
