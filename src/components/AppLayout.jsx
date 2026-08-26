import React, { useState } from 'react';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  ListChecks,
  Folder,
  FileText,
  Calendar,
  Users,
  Activity,
  Settings,
  LogOut,
  Sun,
  Moon,
  Bell,
  Check,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { api } from '../api';

const AVATAR_COLORS = {
  blue: 'bg-blue-600 text-white',
  green: 'bg-green-600 text-white',
  red: 'bg-red-600 text-white',
  yellow: 'bg-yellow-600 text-white',
  violet: 'bg-violet-600 text-white',
  cyan: 'bg-cyan-600 text-white',
  gray: 'bg-muted text-foreground',
};

export function AppLayout({ currentView, onNavigate, children }) {
  const { user, logout, orgName } = useAuth();
  const { notificationList, unreadNotifications, trash, refresh } = useData();
  const { theme, setTheme } = useTheme();

  const [popoverOpened, setPopoverOpened] = useState(false);

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
      setPopoverOpened(false);
      refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: ListChecks },
    { id: 'projects', label: 'Projects', icon: Folder },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'people', label: 'People', icon: Users },
    { id: 'activity', label: 'Activity Feed', icon: Activity },
    { id: 'trash', label: 'Recycle Bin', icon: Trash2, badge: trash?.length ? String(trash.length) : null },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const avatarColorClass = AVATAR_COLORS[user?.color] || AVATAR_COLORS.blue;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-background">
        <header className="fixed inset-x-0 top-0 z-40 flex h-[60px] items-center border-b bg-background px-4">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-extrabold text-primary-foreground">
                O
              </div>
              <div>
                <p className="text-base font-extrabold leading-tight">Orbdyn</p>
                <p className="text-[10px] text-muted-foreground">{orgName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? (
                  <Sun className="h-[18px] w-[18px] text-amber-500" />
                ) : (
                  <Moon className="h-[18px] w-[18px] text-blue-500" />
                )}
              </Button>

              <Popover open={popoverOpened} onOpenChange={setPopoverOpened}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="relative">
                        <Bell className="h-[18px] w-[18px]" />
                        {unreadNotifications > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                            {unreadNotifications}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
                </Tooltip>

                <PopoverContent align="end" className="w-[340px] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-bold">Notifications</p>
                    {unreadNotifications > 0 && (
                      <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={handleMarkAllRead}>
                        <Check className="h-3 w-3" />
                        Mark all read
                      </Button>
                    )}
                  </div>
                  <Separator className="mb-2" />

                  <ScrollArea className="max-h-[300px]">
                    <div className="flex flex-col gap-2 pr-3">
                      {notificationList.length === 0 ? (
                        <p className="py-4 text-center text-xs text-muted-foreground">No notifications yet.</p>
                      ) : (
                        notificationList.map((n) => (
                          <Card
                            key={n.id}
                            className={cn(
                              'cursor-default p-2 shadow-none',
                              n.link && 'cursor-pointer hover:bg-accent/50',
                              !n.read && 'border-primary/20 bg-primary/5'
                            )}
                            onClick={() => handleNotificationClick(n)}
                          >
                            <p className="text-xs font-bold">{n.title}</p>
                            <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </header>

        <aside className="fixed bottom-0 left-0 top-[60px] z-30 flex w-[240px] flex-col border-r bg-card p-2">
          <ScrollArea className="flex-1">
            <nav className="mt-1 flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn('h-9 w-full justify-start gap-2 px-3', isActive && 'font-medium')}
                    onClick={() => onNavigate(item.id)}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="flex-1 text-left text-sm">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 text-[10px]">
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </nav>
          </ScrollArea>

          <Separator className="my-2" />

          <div className="flex items-center justify-between px-1 pb-1">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className={cn('text-xs font-semibold', avatarColorClass)}>
                  {user?.name ? user.name[0].toUpperCase() : '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs font-bold">{user?.name}</p>
                <p className="text-[10px] capitalize text-muted-foreground">{user?.role}</p>
              </div>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sign Out</TooltipContent>
            </Tooltip>
          </div>
        </aside>

        <main className="ml-[240px] mt-[60px] p-4">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </TooltipProvider>
  );
}
