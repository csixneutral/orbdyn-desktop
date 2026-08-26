import React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ProjectSidebar } from './ProjectSidebar';
import { NotificationsPopover } from './NotificationsPopover';
import { cn } from '@/lib/utils';
import { useData } from '../context/DataContext';
import { api } from '../api';

export function ProjectWorkspaceLayout({
  project,
  projects,
  currentView,
  onNavigate,
  onBackToProjects,
  onSelectProject,
  onOpenPeople,
  onOpenProfile,
  onCreateProject,
  children,
}) {
  const { notificationList, unreadNotifications, refresh } = useData();
  const { theme, setTheme } = useTheme();

  const handleMarkAllRead = async () => {
    try {
      await api.markNotificationsRead([]);
      refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.read) {
        await api.markNotificationsRead([notification.id]);
      }
      if (notification.link) {
        onNavigate(notification.link);
      }
      refresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <SidebarProvider className="h-svh max-h-svh overflow-hidden">
      <ProjectSidebar
        project={project}
        projects={projects}
        currentView={currentView}
        onNavigate={onNavigate}
        onSelectProject={onSelectProject}
        onBackToProjects={onBackToProjects}
        onOpenPeople={onOpenPeople}
        onOpenProfile={onOpenProfile}
        onCreateProject={onCreateProject}
      />
      <SidebarInset className="h-full min-h-0 overflow-hidden">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? (
                <Sun className="h-[18px] w-[18px] text-amber-500" />
              ) : (
                <Moon className="h-[18px] w-[18px] text-blue-500" />
              )}
            </Button>
            <NotificationsPopover
              notificationList={notificationList}
              unreadNotifications={unreadNotifications}
              onMarkAllRead={handleMarkAllRead}
              onNotificationClick={handleNotificationClick}
            />
          </div>
        </header>
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            className={cn(
              'min-h-0 flex-1 p-4',
              currentView === 'tasks' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'
            )}
          >
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
