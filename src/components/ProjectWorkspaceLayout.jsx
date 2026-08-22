import React from 'react';
import { useTheme } from 'next-themes';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getBadgeStyle, getColorClasses } from '@/lib/colors';
import { ProjectSidebar } from './ProjectSidebar';
import { NotificationsPopover } from './NotificationsPopover';
import { useData } from '../context/DataContext';
import { api } from '../api';

export function ProjectWorkspaceLayout({
  project,
  currentView,
  onNavigate,
  onBackToProjects,
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
    <SidebarProvider>
      <ProjectSidebar project={project} currentView={currentView} onNavigate={onNavigate} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 hidden h-4 sm:block" />
          <Button variant="ghost" size="sm" className="hidden shrink-0 gap-1 px-2 sm:flex" onClick={onBackToProjects}>
            <ArrowLeft className="h-4 w-4" />
            Projects
          </Button>
          <Badge
            className={cn(
              'max-w-[180px] truncate border-transparent text-white sm:max-w-none',
              getColorClasses(project?.colour || 'blue', 'badge')
            )}
            style={getBadgeStyle(project?.colour)}
          >
            {project?.name || 'Project'}
          </Badge>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</TooltipContent>
            </Tooltip>
            <NotificationsPopover
              notificationList={notificationList}
              unreadNotifications={unreadNotifications}
              onMarkAllRead={handleMarkAllRead}
              onNotificationClick={handleNotificationClick}
            />
          </div>
        </header>
        <div className="flex flex-1 flex-col p-4">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
