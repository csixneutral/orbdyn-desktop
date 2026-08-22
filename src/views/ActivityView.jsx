import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PageHeader, TypographyMuted } from '@/components/ui/typography';
import { useData } from '../context/DataContext';

const AVATAR_COLORS = {
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
  orange: '#f59e0b',
  purple: '#8b5cf6',
  pink: '#ec4899',
  gray: '#6b7280',
  yellow: '#eab308',
};

function getAvatarBg(color) {
  if (!color) return AVATAR_COLORS.blue;
  if (color.startsWith('#')) return color;
  return AVATAR_COLORS[color] || AVATAR_COLORS.blue;
}

function activityMatchesProject(act, projectId, tasks) {
  if (!projectId || !act.link) return !projectId;
  if (act.link.view === 'project' && act.link.id === projectId) return true;
  if (act.link.view === 'task') {
    const task = tasks.find((t) => t.id === act.link.id);
    return task?.projectId === projectId;
  }
  if (act.link.view === 'files') {
    return false;
  }
  return false;
}

export function ActivityView({ projectId }) {
  const { activity, users, tasks } = useData();
  const filteredActivity = projectId
    ? activity.filter((act) => activityMatchesProject(act, projectId, tasks))
    : activity;

  return (
    <div className="space-y-6">
      <PageHeader
        title={projectId ? 'Project Activity' : 'Workspace Activity Feed'}
        description={
          projectId
            ? 'Updates for tasks, files, and changes in this project'
            : 'Audit trail of task updates, file sharing, and project changes'
        }
      />

      <Card>
        <CardContent className="p-6">
          {filteredActivity.length === 0 ? (
            <TypographyMuted>No activity recorded yet.</TypographyMuted>
          ) : (
            <div className="relative space-y-0">
              {filteredActivity.map((act, index) => {
                const actor = users.find((u) => u.id === act.actorId);
                const isLast = index === filteredActivity.length - 1;
                return (
                  <div key={act.id} className="relative flex gap-4 pb-8 last:pb-0">
                    {!isLast && (
                      <div className="absolute left-4 top-8 h-[calc(100%-1rem)] w-0.5 bg-border" />
                    )}
                    <Avatar className="relative z-10 h-8 w-8 shrink-0">
                      <AvatarFallback
                        className="text-xs text-white"
                        style={{ backgroundColor: getAvatarBg(actor?.color) }}
                      >
                        {actor?.name ? actor.name[0].toUpperCase() : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                        <span className="text-sm font-bold">{actor?.name || 'Someone'}</span>
                        <span className="text-sm text-muted-foreground">{act.action}</span>
                        <span className="text-sm font-semibold">{act.subject}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(act.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
