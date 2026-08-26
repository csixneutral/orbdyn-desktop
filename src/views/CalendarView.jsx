import React, { useState } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListChecks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { showNotification } from '@/lib/notify.js';
import { getTintStyle, isHexColor } from '@/lib/colors';
import { cn } from '@/lib/utils';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { EventModal } from '../components/EventModal';
import { canCreateContent } from '@/lib/roles';

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export function CalendarView({ projectId }) {
  const { user } = useAuth();
  const { events, tasks, projects } = useData();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleOpenCreate = (dateStr) => {
    setSelectedEvent(dateStr ? { date: dateStr } : null);
    setModalOpened(true);
  };

  const handleOpenEdit = (e, item) => {
    e.stopPropagation();
    if (item.type === 'event') {
      setSelectedEvent(item);
      setModalOpened(true);
    }
  };

  const getCalendarDays = () => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days = [];
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

    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      const dateObj = new Date(year, month, d);
      days.push({
        date: dateObj,
        dateStr: formatDateString(dateObj),
        dayNum: d,
        isCurrentMonth: true,
      });
    }

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

  const allItems = [
    ...events
      .filter((e) => !projectId || e.projectId === projectId)
      .map((e) => ({ ...e, type: 'event' })),
    ...tasks
      .filter((t) => t.dueDate && (!projectId || t.projectId === projectId))
      .map((t) => ({
        id: 'task_' + t.id,
        title: t.title,
        date: t.dueDate,
        kind: 'deadline',
        type: 'task',
        originalTask: t,
        projectId: t.projectId,
      })),
  ];

  const calendarDays = getCalendarDays();

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-[18px] w-[18px]" />
            </Button>

            <h3 className="min-w-[160px] text-center text-xl font-semibold">
              {monthNames[month]} {year}
            </h3>

            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-[18px] w-[18px]" />
            </Button>

            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
          </div>

          {canCreateContent(user) && (
            <Button onClick={() => handleOpenCreate()}>
              <Plus className="h-4 w-4" />
              New Event
            </Button>
          )}
        </div>

        <Card className="overflow-hidden bg-[#101113]">
          <div className="grid grid-cols-7 border-b border-[#2C2E33] bg-[#1A1B1E]">
            {WEEKDAYS.map((day) => (
              <div key={day} className="border-r border-[#2C2E33] py-2 text-center last:border-r-0">
                <span className="text-xs font-bold text-muted-foreground">{day}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((dayItem, idx) => {
              const isToday = dayItem.dateStr === todayStr;
              const isPast = dayItem.dateStr < todayStr;
              const dayItems = allItems.filter((item) => item.date === dayItem.dateStr);

              return (
                <div
                  key={idx}
                  className={cn(
                    'min-h-[115px] p-2 transition-colors',
                    (idx + 1) % 7 !== 0 && 'border-r border-[#2C2E33]',
                    idx < calendarDays.length - 7 && 'border-b border-[#2C2E33]',
                    !dayItem.isCurrentMonth && 'bg-[#0d0e10] opacity-35',
                    dayItem.isCurrentMonth && isPast && 'bg-black/25 opacity-60',
                    isPast ? 'cursor-not-allowed' : canCreateContent(user) ? 'cursor-pointer hover:bg-muted/20' : 'cursor-default'
                  )}
                  onClick={() => {
                    if (isPast) {
                      showNotification({
                        title: 'Past Date',
                        message: 'New events cannot be scheduled on past dates.',
                        color: 'blue',
                      });
                    } else if (canCreateContent(user)) {
                      handleOpenCreate(dayItem.dateStr);
                    }
                  }}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <div
                      className={cn(
                        'flex h-[26px] w-[26px] items-center justify-center rounded-full text-[13px]',
                        isToday && 'bg-[#3d7fe0] font-bold text-white',
                        !isToday && dayItem.isCurrentMonth && 'font-medium text-[#c1c2c5]',
                        !isToday && !dayItem.isCurrentMonth && 'text-[#5c5f66]'
                      )}
                    >
                      {dayItem.dayNum}
                    </div>
                    {dayItems.length > 0 && (
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {dayItems.length} {dayItems.length === 1 ? 'item' : 'items'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    {dayItems.slice(0, 3).map((item) => {
                      const isTask = item.type === 'task';
                      const project = item.projectId
                        ? projects.find((p) => p.id === item.projectId)
                        : null;
                      const tintStyle = isTask
                        ? { backgroundColor: 'rgba(239, 68, 68, 0.18)', borderLeftColor: '#ef4444' }
                        : isHexColor(project?.colour)
                          ? getTintStyle(project.colour)
                          : {
                              backgroundColor: 'rgba(61, 127, 224, 0.25)',
                              borderLeftColor: '#3d7fe0',
                            };

                      return (
                        <Tooltip key={item.id}>
                          <TooltipTrigger asChild>
                            <div
                              className="cursor-pointer overflow-hidden rounded border-l-[3px] p-1"
                              style={tintStyle}
                              onClick={(e) => handleOpenEdit(e, item)}
                            >
                              <div className="flex items-center gap-1 overflow-hidden whitespace-nowrap">
                                {isTask ? (
                                  <ListChecks className="h-3 w-3 shrink-0 text-red-500" />
                                ) : (
                                  <Clock className="h-3 w-3 shrink-0 text-[#3d7fe0]" />
                                )}
                                <span className="truncate text-[11px] font-semibold">
                                  {item.startTime ? `${item.startTime} ` : ''}
                                  {item.title}
                                </span>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[220px]">
                            <p className="text-xs font-bold">{item.title}</p>
                            {item.startTime && (
                              <p className="text-[10px]">
                                {item.startTime} - {item.endTime || ''}
                              </p>
                            )}
                            {item.location && <p className="text-[10px]">📍 {item.location}</p>}
                            {project && <p className="text-[10px]">📁 {project.name}</p>}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}

                    {dayItems.length > 3 && (
                      <p className="text-center text-[10px] font-bold text-muted-foreground">
                        +{dayItems.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <EventModal
          eventItem={selectedEvent}
          opened={modalOpened}
          defaultProjectId={projectId}
          onClose={() => {
            setModalOpened(false);
            setSelectedEvent(null);
          }}
        />
      </div>
    </TooltipProvider>
  );
}
