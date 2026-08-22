import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TypographyH3, TypographyMuted } from '@/components/ui/typography';
import { useAuth } from './context/AuthContext';
import { useData } from './context/DataContext';
import { WelcomeView } from './views/WelcomeView';
import { SetupView } from './views/SetupView';
import { LoginView } from './views/LoginView';
import { HomeLayout } from './components/HomeLayout';
import { ProjectWorkspaceLayout } from './components/ProjectWorkspaceLayout';
import { ProjectsView } from './views/ProjectsView';
import { ProjectOverviewView } from './views/ProjectOverviewView';
import { TasksView } from './views/TasksView';
import { DocumentsView } from './views/DocumentsView';
import { CalendarView } from './views/CalendarView';
import { PeopleView } from './views/PeopleView';
import { ActivityView } from './views/ActivityView';
import { SettingsView } from './views/SettingsView';
import { RecycleBinView } from './views/RecycleBinView';

function resolveProjectIdFromLink(link, tasks, projects) {
  if (!link?.id) return null;
  if (link.view === 'project') return link.id;
  if (link.view === 'task') {
    const task = tasks.find((t) => t.id === link.id);
    return task?.projectId || null;
  }
  if (link.view === 'files') return null;
  if (link.view === 'calendar') {
    return link.projectId || null;
  }
  return null;
}

function mapNotificationLink(link, tasks) {
  if (!link?.view) return null;
  switch (link.view) {
    case 'task':
      return { tab: 'tasks', taskId: link.id || null };
    case 'project':
      return { tab: 'overview', taskId: null };
    case 'files':
      return { tab: 'documents', taskId: null };
    case 'calendar':
      return { tab: 'calendar', taskId: null };
    case 'activity':
      return { tab: 'activity', taskId: null };
    default:
      return { tab: 'overview', taskId: null };
  }
}

export function App() {
  const { loading, setupNeeded, user, orgName, connectionError, migrationNeeded, isOnline, refreshBootstrap } = useAuth();
  const { tasks, projects } = useData();

  const [authScreen, setAuthScreen] = useState('welcome');
  const [homeView, setHomeView] = useState('projects');
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [projectView, setProjectView] = useState('overview');
  const [taskHighlightId, setTaskHighlightId] = useState(null);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  useEffect(() => {
    if (!user) {
      setAuthScreen('welcome');
      setActiveProjectId(null);
      setProjectView('overview');
      setHomeView('projects');
    }
  }, [user]);

  const handleHomeNavigate = (target) => {
    if (typeof target === 'string') {
      setHomeView(target);
      return;
    }

    const projectId = resolveProjectIdFromLink(target, tasks, projects);
    const mapped = mapNotificationLink(target, tasks);
    if (projectId) {
      setActiveProjectId(projectId);
      setProjectView(mapped?.tab || 'overview');
      setTaskHighlightId(mapped?.taskId || null);
    }
  };

  const handleProjectNavigate = (target) => {
    if (typeof target === 'string') {
      setProjectView(target);
      return;
    }

    const mapped = mapNotificationLink(target, tasks);
    if (mapped?.tab) {
      setProjectView(mapped.tab);
      setTaskHighlightId(mapped.taskId || null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <TypographyMuted className="mt-3">Connecting to Orbdyn...</TypographyMuted>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <TypographyH3 className="scroll-m-0">No internet connection</TypographyH3>
            <TypographyMuted>
              Orbdyn requires an active internet connection. Connect to the internet, then try again.
            </TypographyMuted>
            <Button onClick={refreshBootstrap}>Try again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (migrationNeeded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="flex flex-col gap-4 p-8">
            <TypographyH3 className="scroll-m-0">Database setup required</TypographyH3>
            <TypographyMuted>
              Supabase is connected, but the Orbdyn schema has not been applied yet.
            </TypographyMuted>
            <Button onClick={refreshBootstrap}>Check again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <TypographyH3 className="scroll-m-0">Cannot connect to Orbdyn</TypographyH3>
            <TypographyMuted>
              Check your internet connection and try again. If the problem continues, contact your workspace administrator.
            </TypographyMuted>
            <Button onClick={refreshBootstrap}>Try again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    if (authScreen === 'setup') {
      return (
        <SetupView
          onBack={() => setAuthScreen('welcome')}
          onSignIn={() => setAuthScreen('login')}
        />
      );
    }
    if (authScreen === 'login') {
      return (
        <LoginView
          onBack={() => setAuthScreen('welcome')}
          onGetStarted={() => setAuthScreen('setup')}
          setupNeeded={setupNeeded}
        />
      );
    }
    return (
      <WelcomeView
        setupNeeded={setupNeeded}
        orgName={orgName}
        onGetStarted={() => setAuthScreen('setup')}
        onSignIn={() => setAuthScreen('login')}
      />
    );
  }

  if (activeProjectId && activeProject) {
    const renderProjectView = () => {
      switch (projectView) {
        case 'overview':
          return <ProjectOverviewView projectId={activeProjectId} onNavigate={setProjectView} />;
        case 'tasks':
          return <TasksView projectId={activeProjectId} initialTaskId={taskHighlightId} />;
        case 'documents':
          return <DocumentsView projectId={activeProjectId} />;
        case 'calendar':
          return <CalendarView projectId={activeProjectId} />;
        case 'team':
          return <PeopleView projectId={activeProjectId} />;
        case 'activity':
          return <ActivityView projectId={activeProjectId} />;
        default:
          return <ProjectOverviewView projectId={activeProjectId} onNavigate={setProjectView} />;
      }
    };

    return (
      <ProjectWorkspaceLayout
        project={activeProject}
        currentView={projectView}
        onNavigate={handleProjectNavigate}
        onBackToProjects={() => {
          setActiveProjectId(null);
          setProjectView('overview');
          setTaskHighlightId(null);
          setHomeView('projects');
        }}
      >
        {renderProjectView()}
      </ProjectWorkspaceLayout>
    );
  }

  const renderHomeView = () => {
    switch (homeView) {
      case 'settings':
        return <SettingsView />;
      case 'people':
        return <PeopleView />;
      case 'trash':
        return <RecycleBinView />;
      case 'projects':
      default:
        return (
          <ProjectsView
            onOpenProject={(projectId) => {
              setActiveProjectId(projectId);
              setProjectView('overview');
              setTaskHighlightId(null);
            }}
          />
        );
    }
  };

  return (
    <HomeLayout currentView={homeView} onNavigate={handleHomeNavigate}>
      {renderHomeView()}
    </HomeLayout>
  );
}
