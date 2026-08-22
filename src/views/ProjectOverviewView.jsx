import React from 'react';
import { CalendarDays, FileText, ListChecks, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getBadgeStyle, getColorClasses, getProgressStyle } from '@/lib/colors';
import { cn } from '@/lib/utils';
import { PageHeader, TypographyMuted } from '@/components/ui/typography';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

export function ProjectOverviewView({ projectId, onNavigate }) {
  const { user } = useAuth();
  const { projects, tasks, files, users } = useData();

  const project = projects.find((p) => p.id === projectId);
  if (!project) {
    return <TypographyMuted>Project not found.</TypographyMuted>;
  }

  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  const projectFiles = files.filter((f) => f.projectId === projectId);
  const doneCount = projectTasks.filter((t) => t.status === 'done').length;
  const progressPercent = projectTasks.length ? Math.round((doneCount / projectTasks.length) * 100) : 0;
  const owner = users.find((u) => u.id === project.ownerId);
  const memberIds = [...new Set([project.ownerId, ...(project.memberIds || [])].filter(Boolean))];
  const teamMembers = users.filter((u) => memberIds.includes(u.id));
  const recentTasks = [...projectTasks]
    .sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''))
    .slice(0, 5);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={project.name}
          description={project.description || 'Project overview and quick actions'}
        >
          {user?.role !== 'viewer' && (
            <Button size="sm" className="gap-1" onClick={() => onNavigate('tasks')}>
              <Plus className="h-4 w-4" />
              New task
            </Button>
          )}
        </PageHeader>

        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap gap-3">
              <Badge
                className={cn('border-transparent text-white', getColorClasses(project.colour || 'blue', 'badge'))}
                style={getBadgeStyle(project.colour)}
              >
                {project.client || 'Internal project'}
              </Badge>
              {project.dueDate && (
                <Badge variant="outline" className="gap-1">
                  <CalendarDays className="h-3 w-3" />
                  Due {project.dueDate}
                </Badge>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-muted/30 shadow-none">
                <CardContent className="flex items-center gap-3 p-4">
                  <ListChecks className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tasks</p>
                    <p className="text-lg font-bold">{projectTasks.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30 shadow-none">
                <CardContent className="flex items-center gap-3 p-4">
                  <FileText className="h-5 w-5 text-violet-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Documents</p>
                    <p className="text-lg font-bold">{projectFiles.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30 shadow-none">
                <CardContent className="flex items-center gap-3 p-4">
                  <Users className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Team</p>
                    <p className="text-lg font-bold">{teamMembers.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30 shadow-none">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Completion</p>
                  <p className="text-lg font-bold">{progressPercent}%</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">
                {doneCount} of {projectTasks.length} tasks complete
              </p>
              <Progress
                value={progressPercent}
                className="h-2.5"
                indicatorClassName={getColorClasses(project.colour || 'blue', 'progress')}
                indicatorStyle={getProgressStyle(project.colour)}
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Project owner</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className={cn('text-xs', getColorClasses(owner?.color || 'blue', 'avatar'))}>
                    {owner?.name ? owner.name[0].toUpperCase() : '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{owner?.name || 'Unassigned'}</span>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Team</p>
              <div className="flex -space-x-1">
                {teamMembers.map((m) => (
                  <Tooltip key={m.id}>
                    <TooltipTrigger asChild>
                      <Avatar className="h-7 w-7 border-2 border-background">
                        <AvatarFallback className={cn('text-xs', getColorClasses(m.color || 'blue', 'avatar'))}>
                          {m.name ? m.name[0].toUpperCase() : '?'}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>{m.name}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold uppercase text-muted-foreground">Recent tasks</p>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('tasks')}>
                View all
              </Button>
            </div>
            {recentTasks.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">No tasks yet. Create your first task to get started.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs capitalize text-muted-foreground">{task.status.replace('_', ' ')}</p>
                    </div>
                    <Badge variant="outline">{task.priority}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
