import React, { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { TypographyMuted, TypographySmall } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

export function NotificationsPopover({ notificationList, unreadNotifications, onMarkAllRead, onNotificationClick }) {
  const [open, setOpen] = useState(false);

  const handleClick = async (notification) => {
    await onNotificationClick?.(notification);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-8 w-8">
          <Bell className="h-[18px] w-[18px]" />
          {unreadNotifications > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unreadNotifications}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-3">
        <div className="mb-2 flex items-center justify-between">
          <TypographySmall className="font-semibold">Notifications</TypographySmall>
          {unreadNotifications > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onMarkAllRead}>
              <Check className="h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <Separator className="mb-2" />
        <ScrollArea className="max-h-[300px]">
          <div className="flex flex-col gap-2 pr-3">
            {notificationList.length === 0 ? (
              <TypographyMuted className="py-4 text-center text-xs">No notifications yet.</TypographyMuted>
            ) : (
              notificationList.map((n) => (
                <Card
                  key={n.id}
                  className={cn(
                    'cursor-default p-2 shadow-none',
                    n.link && 'cursor-pointer hover:bg-accent/50',
                    !n.read && 'border-primary/20 bg-primary/5'
                  )}
                  onClick={() => handleClick(n)}
                >
                  <TypographySmall className="font-semibold">{n.title}</TypographySmall>
                  <TypographyMuted className="line-clamp-2 text-xs">{n.body}</TypographyMuted>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
