import React from 'react';
import { Folder, Trash2, Users } from 'lucide-react';
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
import { SidebarUserMenu } from '@/components/sidebar/SidebarUserMenu';
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
        <SidebarUserMenu
          user={user}
          avatarColorClass={avatarColorClass}
          onOpenProfile={() => onNavigate('profile')}
          onLogout={logout}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
