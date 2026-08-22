import React, { useState } from 'react';
import {
  Paper,
  Text,
  Title,
  Group,
  Badge,
  Button,
  Stack,
  ActionIcon,
  Tooltip,
  SimpleGrid,
  Box,
} from '@mantine/core';
import {
  IconPlus,
  IconChevronLeft,
  IconChevronRight,
  IconCalendar,
  IconClock,
  IconMapPin,
  IconChecklist,
} from '@tabler/icons-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { notifications } from '@mantine/notifications';
import { EventModal } from '../components/EventModal';

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export function CalendarView() {
  const { user } = useAuth();
  const { events, tasks, projects } = useData();

  // Current view date state (defaults to today or target month)
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDateForNew, setSelectedDateForNew] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0 - 11

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Helper navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleOpenCreate = (dateStr) => {
    setSelectedEvent(dateStr ? { date: dateStr } : null);
    setSelectedDateForNew(dateStr || null);
    setModalOpened(true);
  };

  const handleOpenEdit = (e, item) => {
    e.stopPropagation();
    if (item.type === 'event') {
      setSelectedEvent(item);
      setModalOpened(true);
    }
  };

  // Build grid days for the month (ISO Monday start)
  const getCalendarDays = () => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday-based day index (0 = Mon, 6 = Sun)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const dateObj = new Date(year, month - 1, d);
      days.push({
        date: dateObj,
        dateStr: formatDateString(dateObj),
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      const dateObj = new Date(year, month, d);
      days.push({
        date: dateObj,
        dateStr: formatDateString(dateObj),
        dayNum: d,
        isCurrentMonth: true,
      });
    }

    // Next month padding days to complete grid (up to 35 or 42 cells)
    const totalCells = days.length > 35 ? 42 : 35;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const dateObj = new Date(year, month + 1, d);
      days.push({
        date: dateObj,
        dateStr: formatDateString(dateObj),
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    return days;
  };

  function formatDateString(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const todayStr = formatDateString(new Date());

  // Combine events and task due dates
  const allItems = [
    ...events.map((e) => ({ ...e, type: 'event' })),
    ...tasks
      .filter((t) => t.dueDate)
      .map((t) => ({
        id: 'task_' + t.id,
        title: t.title,
        date: t.dueDate,
        kind: 'deadline',
        type: 'task',
        originalTask: t,
      })),
  ];

  const calendarDays = getCalendarDays();

  return (
    <Stack gap="lg">
      {/* Header Bar */}
      <Group justify="space-between" align="center">
        <Group gap="md" align="center">
          <ActionIcon variant="default" size="lg" radius="md" onClick={handlePrevMonth}>
            <IconChevronLeft size={18} />
          </ActionIcon>

          <Title order={3} style={{ minWidth: 160, textAlign: 'center' }}>
            {monthNames[month]} {year}
          </Title>

          <ActionIcon variant="default" size="lg" radius="md" onClick={handleNextMonth}>
            <IconChevronRight size={18} />
          </ActionIcon>

          <Button variant="default" size="sm" radius="md" onClick={handleToday}>
            Today
          </Button>
        </Group>

        {user?.role !== 'viewer' && (
          <Button leftSection={<IconPlus size={16} />} color="blue" radius="md" onClick={() => handleOpenCreate()}>
            New Event
          </Button>
        )}
      </Group>

      {/* Main Google Calendar Grid */}
      <Paper withBorder radius="md" p={0} style={{ backgroundColor: '#101113', overflow: 'hidden' }}>
        {/* Day Header Row */}
        <SimpleGrid cols={7} spacing={0} style={{ borderBottom: '1px solid #2C2E33', backgroundColor: '#1A1B1E' }}>
          {WEEKDAYS.map((day) => (
            <Box key={day} py="xs" style={{ textAlign: 'center', borderRight: '1px solid #2C2E33' }}>
              <Text size="xs" fw={700} c="dimmed">
                {day}
              </Text>
            </Box>
          ))}
        </SimpleGrid>

        {/* 7-Column Date Cells */}
        <SimpleGrid cols={7} spacing={0}>
          {calendarDays.map((dayItem, idx) => {
            const isToday = dayItem.dateStr === todayStr;
            const isPast = dayItem.dateStr < todayStr;
            const dayItems = allItems.filter((item) => item.date === dayItem.dateStr);

            return (
              <Box
                key={idx}
                p="xs"
                style={{
                  minHeight: 115,
                  borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid #2C2E33',
                  borderBottom: idx < calendarDays.length - 7 ? '1px solid #2C2E33' : 'none',
                  backgroundColor: !dayItem.isCurrentMonth ? '#0d0e10' : (isPast ? 'rgba(0, 0, 0, 0.25)' : 'transparent'),
                  opacity: !dayItem.isCurrentMonth ? 0.35 : (isPast ? 0.6 : 1),
                  cursor: isPast ? 'not-allowed' : (user?.role !== 'viewer' ? 'pointer' : 'default'),
                  transition: 'background-color 0.15s ease',
                }}
                onClick={() => {
                  if (isPast) {
                    notifications.show({ title: 'Past Date', message: 'New events cannot be scheduled on past dates.', color: 'orange' });
                  } else if (user?.role !== 'viewer') {
                    handleOpenCreate(dayItem.dateStr);
                  }
                }}
              >
                {/* Date Number Badge */}
                <Group justify="space-between" align="center" mb={6}>
                  <Box
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      backgroundColor: isToday ? '#3d7fe0' : 'transparent',
                      color: isToday ? '#ffffff' : dayItem.isCurrentMonth ? '#c1c2c5' : '#5c5f66',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: isToday ? 700 : 500,
                      fontSize: 13,
                    }}
                  >
                    {dayItem.dayNum}
                  </Box>

                  {dayItems.length > 0 && (
                    <Text size="10px" c="dimmed" fw={600}>
                      {dayItems.length} {dayItems.length === 1 ? 'item' : 'items'}
                    </Text>
                  )}
                </Group>

                {/* Day Items List */}
                <Stack gap={4}>
                  {dayItems.slice(0, 3).map((item) => {
                    const isTask = item.type === 'task';
                    const project = item.projectId ? projects.find((p) => p.id === item.projectId) : null;

                    return (
                      <Tooltip
                        key={item.id}
                        label={
                          <Stack gap={2} p={2}>
                            <Text size="xs" fw={700}>{item.title}</Text>
                            {item.startTime && <Text size="10px">{item.startTime} - {item.endTime || ''}</Text>}
                            {item.location && <Text size="10px">📍 {item.location}</Text>}
                            {project && <Text size="10px">📁 {project.name}</Text>}
                          </Stack>
                        }
                        withArrow
                      >
                        <Box
                          p={4}
                          style={{
                            borderRadius: 4,
                            backgroundColor: isTask ? 'rgba(239, 68, 68, 0.18)' : (project?.colour ? `${project.colour}33` : 'rgba(61, 127, 224, 0.25)'),
                            borderLeft: `3px solid ${isTask ? '#ef4444' : (project?.colour || '#3d7fe0')}`,
                            cursor: 'pointer',
                          }}
                          onClick={(e) => handleOpenEdit(e, item)}
                        >
                          <Group gap={4} wrap="nowrap" style={{ overflow: 'hidden' }}>
                            {isTask ? (
                              <IconChecklist size={12} color="#ef4444" style={{ flexShrink: 0 }} />
                            ) : (
                              <IconClock size={12} color="#3d7fe0" style={{ flexShrink: 0 }} />
                            )}
                            <Text size="xs" truncate fw={600} style={{ fontSize: 11 }}>
                              {item.startTime ? `${item.startTime} ` : ''}{item.title}
                            </Text>
                          </Group>
                        </Box>
                      </Tooltip>
                    );
                  })}

                  {dayItems.length > 3 && (
                    <Text size="10px" c="dimmed" fw={700} ta="center">
                      +{dayItems.length - 3} more
                    </Text>
                  )}
                </Stack>
              </Box>
            );
          })}
        </SimpleGrid>
      </Paper>

      {/* Event Modal */}
      <EventModal
        eventItem={selectedEvent}
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setSelectedEvent(null);
        }}
      />
    </Stack>
  );
}
