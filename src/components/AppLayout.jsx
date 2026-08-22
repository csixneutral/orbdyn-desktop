import React, { useState } from 'react';
import {
  AppShell,
  Text,
  Group,
  ActionIcon,
  Badge,
  Avatar,
  Stack,
  NavLink,
  ThemeIcon,
  Box,
  Tooltip,
  useMantineColorScheme,
  Popover,
  Indicator,
  ScrollArea,
  Divider,
  Button,
  Paper,
} from '@mantine/core';
import {
  IconDashboard,
  IconChecklist,
  IconFolder,
  IconFileText,
  IconCalendar,
  IconUsers,
  IconActivity,
  IconSettings,
  IconWorld,
  IconLogout,
  IconSun,
  IconMoon,
  IconBell,
  IconCheck,
  IconTrash,
} from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { api } from '../api';

export function AppLayout({ currentView, onNavigate, children }) {
  const { user, logout, orgName } = useAuth();
  const { shareStatus, notificationList, unreadNotifications, trash, refresh } = useData();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

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
    { id: 'dashboard', label: 'Dashboard', icon: IconDashboard },
    { id: 'tasks', label: 'Tasks', icon: IconChecklist },
    { id: 'projects', label: 'Projects', icon: IconFolder },
    { id: 'documents', label: 'Documents', icon: IconFileText },
    { id: 'calendar', label: 'Calendar', icon: IconCalendar },
    { id: 'people', label: 'People', icon: IconUsers },
    { id: 'activity', label: 'Activity Feed', icon: IconActivity },
    { id: 'trash', label: 'Recycle Bin', icon: IconTrash, badge: trash?.length ? String(trash.length) : null },
    { id: 'settings', label: 'Settings', icon: IconSettings },
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: 'sm' }}
      padding="md"
    >
      <AppShell.Header p="xs">
        <Group justify="space-between" align="center" h="100%">
          <Group gap="xs">
            <ThemeIcon size={32} radius="md" color="blue" variant="filled">
              <Text fw={800} size="md">O</Text>
            </ThemeIcon>
            <div>
              <Text fw={800} size="md" style={{ lineHeight: 1.1 }}>Orbdyn</Text>
              <Text size="10px" c="dimmed">{orgName}</Text>
            </div>
          </Group>

          <Group gap="xs">
            {shareStatus.url ? (
              <Badge color="green" variant="light" leftSection={<IconWorld size={12} />}>
                Online Shared
              </Badge>
            ) : (
              <Badge color="gray" variant="light">
                Local Network Only
              </Badge>
            )}

            <Tooltip label={colorScheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'} withArrow>
              <ActionIcon
                variant="default"
                size="lg"
                radius="md"
                onClick={() => toggleColorScheme()}
              >
                {colorScheme === 'dark' ? <IconSun size={18} color="#f59e0b" /> : <IconMoon size={18} color="#3b82f6" />}
              </ActionIcon>
            </Tooltip>

            <Popover
              width={340}
              position="bottom-end"
              withArrow
              shadow="md"
              opened={popoverOpened}
              onChange={setPopoverOpened}
            >
              <Popover.Target>
                <Tooltip label="Notifications" withArrow>
                  <Indicator
                    disabled={unreadNotifications === 0}
                    label={unreadNotifications}
                    size={16}
                    color="blue"
                    offset={4}
                  >
                    <ActionIcon
                      variant="default"
                      size="lg"
                      radius="md"
                      onClick={() => setPopoverOpened((o) => !o)}
                    >
                      <IconBell size={18} />
                    </ActionIcon>
                  </Indicator>
                </Tooltip>
              </Popover.Target>

              <Popover.Dropdown p="xs">
                <Group justify="space-between" mb="xs">
                  <Text fw={700} size="sm">Notifications</Text>
                  {unreadNotifications > 0 && (
                    <Button
                      variant="subtle"
                      compact="true"
                      size="xs"
                      color="blue"
                      leftSection={<IconCheck size={12} />}
                      onClick={handleMarkAllRead}
                    >
                      Mark all read
                    </Button>
                  )}
                </Group>
                <Divider mb="xs" />

                <ScrollArea.Autosize maxHeight={300}>
                  <Stack gap="xs">
                    {notificationList.length === 0 ? (
                      <Text size="xs" c="dimmed" ta="center" py="md">
                        No notifications yet.
                      </Text>
                    ) : (
                      notificationList.map((n) => (
                        <Paper
                          key={n.id}
                          p="xs"
                          radius="sm"
                          withBorder
                          style={{
                            cursor: n.link ? 'pointer' : 'default',
                            backgroundColor: n.read ? 'transparent' : 'rgba(61, 127, 224, 0.08)',
                          }}
                          onClick={() => handleNotificationClick(n)}
                        >
                          <Text size="xs" fw={700}>{n.title}</Text>
                          <Text size="xs" c="dimmed" lineClamp={2}>{n.body}</Text>
                          <Text size="10px" c="dimmed" mt={2}>
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </Paper>
                      ))
                    )}
                  </Stack>
                </ScrollArea.Autosize>
              </Popover.Dropdown>
            </Popover>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <AppShell.Section grow mt="xs">
          <Stack gap={4}>
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                label={item.label}
                leftSection={<item.icon size={18} />}
                rightSection={item.badge ? <Badge size="xs" color="gray" variant="filled">{item.badge}</Badge> : null}
                active={currentView === item.id}
                onClick={() => onNavigate(item.id)}
                style={{ borderRadius: 6 }}
              />
            ))}
          </Stack>
        </AppShell.Section>

        <AppShell.Section pt="xs" style={{ borderTop: '1px solid #2C2E33' }}>
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <Avatar radius="xl" color={user?.color || 'blue'} size="sm">
                {user?.name ? user.name[0].toUpperCase() : '?'}
              </Avatar>
              <div>
                <Text size="xs" fw={700}>{user?.name}</Text>
                <Text size="10px" c="dimmed" style={{ textTransform: 'capitalize' }}>{user?.role}</Text>
              </div>
            </Group>

            <Tooltip label="Sign Out">
              <ActionIcon color="gray" variant="subtle" onClick={logout}>
                <IconLogout size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box style={{ maxWidth: 1400, margin: '0 auto' }}>
          {children}
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
