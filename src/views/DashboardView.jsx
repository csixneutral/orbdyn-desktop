import React from 'react';
import {
  Folder,
  ListChecks,
  CircleCheck,
  AlertTriangle,
  FileText,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getBadgeStyle, getColorClasses, getProgressStyle } from '@/lib/colors';
import { cn } from '@/lib/utils';
import { PageHeader, TypographyMuted } from '@/components/ui/typography';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

export function DashboardView({ onNavigate }) {
  const { user } = useAuth();
  const { dashboardData } = useData();

  if (!dashboardData) {
    return <TypographyMuted>Loading dashboard metrics...</TypographyMuted>;
  }

  const { totals, perProject, perPerson } = dashboardData;

  const statCards = [
    { title: 'Active Projects', value: totals.projects, icon: Folder, color: 'blue' },
    { title: 'Total Tasks', value: totals.tasks, icon: ListChecks, color: 'cyan' },
    { title: 'Completed Tasks', value: totals.done, icon: CircleCheck, color: 'green' },
    { title: 'Overdue Tasks', value: totals.overdue, icon: AlertTriangle, color: totals.overdue > 0 ? 'red' : 'gray' },
    { title: 'Shared Documents', value: totals.documents, icon: FileText, color: 'violet' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user?.name || 'User'}!`}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate('tasks')}>
            View All Tasks
          </Button>
          {user?.role !== 'viewer' && (
            <Button size="sm" onClick={() => onNavigate('projects')}>
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
        {statCards.map((st) => {
          const Icon = st.icon;
          const iconClass = getColorClasses(st.color, 'icon');
          const lightClass = getColorClasses(st.color, 'light');
          return (
            <Card key={st.title}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase text-muted-foreground">{st.title}</p>
                  <div className={cn('flex h-8 w-8 items-center justify-center rounded-md', lightClass)}>
                    <Icon className={cn('h-[18px] w-[18px]', iconClass)} />
                  </div>
                </div>
                <p className="mt-1 text-2xl font-bold">{st.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <Card className="md:col-span-7">
          <CardContent className="p-4">
            <h4 className="mb-4 text-base font-semibold">Projects Overview</h4>
            <div className="flex flex-col gap-4">
              {perProject.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects added yet.</p>
              ) : (
                perProject.map((p) => (
                  <Card key={p.id} className="shadow-none">
                    <CardContent className="p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={cn('border-transparent text-white', getColorClasses(p.colour || 'blue', 'badge'))}
                            style={getBadgeStyle(p.colour)}
                          >
                            {p.name}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {p.done} / {p.total} done
                          </span>
                        </div>
                        <span className="text-xs font-bold">{p.progress}%</span>
                      </div>
                      <Progress
                        value={p.progress}
                        indicatorClassName={getColorClasses(p.colour || 'blue', 'progress')}
                        indicatorStyle={getProgressStyle(p.colour)}
                      />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-5">
          <CardContent className="p-4">
            <h4 className="mb-4 text-base font-semibold">Work Load by Team Member</h4>
            <div className="flex flex-col gap-2">
              {perPerson.length === 0 ? (
                <p className="text-sm text-muted-foreground">No team members registered.</p>
              ) : (
                [...perPerson]
                  .sort((a, b) => (a.id === user?.id ? -1 : b.id === user?.id ? 1 : 0))
                  .map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between border-b border-border/50 p-2 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className={cn('text-xs', getColorClasses(u.color || 'blue', 'avatar'))}>
                            {u.name ? u.name[0].toUpperCase() : '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-semibold">
                          {u.name}
                          {u.id === user?.id ? ' (me)' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="bg-blue-500/15 text-blue-400">
                          {u.open} open
                        </Badge>
                        <Badge variant="secondary" className="bg-green-500/15 text-green-400">
                          {u.done} done
                        </Badge>
                        {u.overdue > 0 && (
                          <Badge variant="destructive">{u.overdue} late</Badge>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
