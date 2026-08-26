import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Spinner } from '@/components/ui/spinner';
import { getColorClasses } from '@/lib/colors';
import { cn } from '@/lib/utils';
import { showNotification } from '@/lib/notify';
import { api } from '../api';
import { useData } from '../context/DataContext';

export function ProjectTeamStack({ project, users = [], canEdit = false, size = 'md' }) {
  const { refresh } = useData();
  const [open, setOpen] = useState(false);
  const [savingId, setSavingId] = useState(null);

  if (!project) return null;

  const avatarSize = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
  const plusSize = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
  const plusIcon = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  const ownerId = project.ownerId;
  const memberIds = project.memberIds || [];
  const teamIds = [...new Set([ownerId, ...memberIds].filter(Boolean))];
  const teamMembers = users.filter((u) => teamIds.includes(u.id));
  const sortedTeam = [
    ...teamMembers.filter((u) => u.id === ownerId),
    ...teamMembers.filter((u) => u.id !== ownerId),
  ];

  const isOnTeam = (userId) => userId === ownerId || memberIds.includes(userId);

  const toggleMember = async (userId) => {
    if (!canEdit || userId === ownerId || savingId) return;

    const nextMemberIds = memberIds.includes(userId)
      ? memberIds.filter((id) => id !== userId)
      : [...memberIds, userId];

    try {
      setSavingId(userId);
      await api.updateProject(project.id, { memberIds: nextMemberIds });
      await refresh();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex items-center">
      <div className="flex items-center -space-x-2">
        {sortedTeam.map((member) => (
          <Tooltip key={member.id}>
            <TooltipTrigger asChild>
              <Avatar className={cn(avatarSize, 'border-2 border-background')}>
                <AvatarFallback className={cn('text-xs', getColorClasses(member.color || 'blue', 'avatar'))}>
                  {member.name ? member.name[0].toUpperCase() : '?'}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              {member.name}
              {member.id === ownerId ? ' (owner)' : ''}
            </TooltipContent>
          </Tooltip>
        ))}

        {canEdit ? (
          <Popover open={open} onOpenChange={setOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Add team member"
                    className={cn(
                      plusSize,
                      'relative z-10 flex shrink-0 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/45 bg-background text-muted-foreground transition-colors hover:border-primary hover:bg-muted/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    )}
                  >
                    <Plus className={plusIcon} />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Add team member</TooltipContent>
            </Tooltip>
            <PopoverContent className="w-72 p-2" align="start">
              <p className="mb-2 px-2 text-xs font-semibold text-muted-foreground">Project team</p>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {users.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">No people in this workspace yet.</p>
                ) : (
                  users.map((person) => {
                    const onTeam = isOnTeam(person.id);
                    const isOwner = person.id === ownerId;
                    const busy = savingId === person.id;

                    return (
                      <label
                        key={person.id}
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-accent',
                          isOwner && 'cursor-default opacity-80'
                        )}
                      >
                        <Checkbox
                          checked={onTeam}
                          disabled={isOwner || !!savingId}
                          onCheckedChange={() => toggleMember(person.id)}
                        />
                        <Avatar className="h-6 w-6">
                          <AvatarFallback
                            className={cn('text-[10px]', getColorClasses(person.color || 'blue', 'avatar'))}
                          >
                            {person.name ? person.name[0].toUpperCase() : '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1 truncate text-sm">{person.name}</span>
                        {busy ? <Spinner className="size-4" /> : null}
                        {isOwner ? (
                          <span className="text-[10px] uppercase text-muted-foreground">Owner</span>
                        ) : null}
                      </label>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
    </div>
  );
}
