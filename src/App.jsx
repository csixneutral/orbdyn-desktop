import React, { useState } from 'react';
import { Loader, Center, Stack, Text, Button, Paper, Title } from '@mantine/core';
import { useAuth } from './context/AuthContext';
import { SetupView } from './views/SetupView';
import { LoginView } from './views/LoginView';
import { AppLayout } from './components/AppLayout';
import { DashboardView } from './views/DashboardView';
import { TasksView } from './views/TasksView';
import { ProjectsView } from './views/ProjectsView';
import { DocumentsView } from './views/DocumentsView';
import { CalendarView } from './views/CalendarView';
import { PeopleView } from './views/PeopleView';
import { ActivityView } from './views/ActivityView';
import { SettingsView } from './views/SettingsView';
import { RecycleBinView } from './views/RecycleBinView';

function mapNotificationLink(link) {
  if (!link?.view) return null;
  switch (link.view) {
    case 'task':
      return { view: 'tasks', taskId: link.id || null };
    case 'project':
      return { view: 'projects', taskId: null };
    case 'files':
      return { view: 'documents', taskId: null };
    case 'calendar':
      return { view: 'calendar', taskId: null };
    case 'activity':
      return { view: 'activity', taskId: null };
    default:
      return { view: link.view, taskId: null };
  }
}

export function App() {
  const { loading, setupNeeded, user, connectionError, refreshBootstrap } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [taskHighlightId, setTaskHighlightId] = useState(null);

  const handleNavigate = (target) => {
    if (typeof target === 'string') {
      setCurrentView(target);
      return;
    }

    const mapped = mapNotificationLink(target);
    if (!mapped) return;

    setCurrentView(mapped.view);
    setTaskHighlightId(mapped.taskId);
  };

  if (loading) {
    return (
      <Center style={{ width: '100vw', height: '100vh', backgroundColor: '#101113' }}>
        <Stack align="center" spacing="xs">
          <Loader size="lg" color="blue" />
          <Text color="dimmed" size="sm">Connecting to local Orbdyn workspace...</Text>
        </Stack>
      </Center>
    );
  }

  if (connectionError) {
    return (
      <Center style={{ width: '100vw', height: '100vh', backgroundColor: '#101113' }}>
        <Paper withBorder shadow="md" p="xl" radius="md" style={{ maxWidth: 420 }}>
          <Stack align="center" spacing="md">
            <Title order={3} ta="center">Cannot reach Orbdyn</Title>
            <Text color="dimmed" size="sm" ta="center">
              The local Orbdyn server is not responding. Make sure Orbdyn is running on this computer, then try again.
            </Text>
            <Button onClick={refreshBootstrap}>Try again</Button>
          </Stack>
        </Paper>
      </Center>
    );
  }

  if (setupNeeded) {
    return <SetupView />;
  }

  if (!user) {
    return <LoginView />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView onNavigate={handleNavigate} />;
      case 'tasks':
        return <TasksView initialTaskId={taskHighlightId} />;
      case 'projects':
        return <ProjectsView />;
      case 'documents':
        return <DocumentsView />;
      case 'calendar':
        return <CalendarView />;
      case 'people':
        return <PeopleView />;
      case 'activity':
        return <ActivityView />;
      case 'trash':
        return <RecycleBinView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView onNavigate={handleNavigate} />;
    }
  };

  return (
    <AppLayout currentView={currentView} onNavigate={handleNavigate}>
      {renderView()}
    </AppLayout>
  );
}
