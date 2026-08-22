import React, { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  Select,
  MultiSelect,
  Button,
  Group,
  Stack,
  Text,
  Checkbox,
  ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCalendar, IconPlus, IconTrash, IconClock, IconMapPin } from '@tabler/icons-react';
import { api } from '../api';
import { useData } from '../context/DataContext';

export function EventModal({ eventItem, opened, onClose }) {
  const { projects, users, refresh } = useData();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [projectId, setProjectId] = useState(null);
  const [attendeeIds, setAttendeeIds] = useState([]);
  const [kind, setKind] = useState('meeting');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (eventItem) {
      setTitle(eventItem.title || '');
      setDate(eventItem.date || new Date().toISOString().slice(0, 10));
      setEndDate(eventItem.endDate || '');
      setStartTime(eventItem.startTime || '09:00');
      setEndTime(eventItem.endTime || '10:00');
      setAllDay(!!eventItem.allDay);
      setLocation(eventItem.location || '');
      setNotes(eventItem.notes || '');
      setProjectId(eventItem.projectId || null);
      setAttendeeIds(eventItem.attendeeIds || []);
      setKind(eventItem.kind || 'meeting');
    } else {
      setTitle('');
      setDate(new Date().toISOString().slice(0, 10));
      setEndDate('');
      setStartTime('09:00');
      setEndTime('10:00');
      setAllDay(false);
      setLocation('');
      setNotes('');
      setProjectId(null);
      setAttendeeIds([]);
      setKind('meeting');
    }
  }, [eventItem, opened]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const handleSave = async () => {
    if (!title.trim() || !date) {
      notifications.show({ title: 'Validation', message: 'Title and Date are required', color: 'red' });
      return;
    }
    if (!eventItem?.id && date < todayStr) {
      notifications.show({ title: 'Invalid Date', message: 'New events cannot be scheduled on past dates.', color: 'red' });
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        title: title.trim(),
        date,
        endDate: endDate || date,
        startTime: allDay ? null : startTime,
        endTime: allDay ? null : endTime,
        allDay,
        location: location.trim(),
        notes: notes.trim(),
        kind,
        projectId,
        attendeeIds,
      };

      if (eventItem?.id) {
        await api.updateEvent(eventItem.id, payload);
        notifications.show({ title: 'Updated', message: 'Event details updated', color: 'green' });
      } else {
        await api.createEvent(payload);
        notifications.show({ title: 'Scheduled', message: 'New event added to calendar', color: 'green' });
      }
      refresh();
      onClose();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!eventItem?.id) return;
    try {
      await api.deleteEvent(eventItem.id);
      notifications.show({ title: 'Deleted', message: 'Event removed from calendar', color: 'blue' });
      refresh();
      onClose();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  return (
    <Modal
      centered
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <ThemeIcon size={36} radius="md" color="blue" variant="light">
            <IconCalendar size={22} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="lg">{eventItem?.id ? 'Edit Event' : 'Schedule Event'}</Text>
            <Text size="xs" c="dimmed">Add meetings, reminders, or project milestones</Text>
          </div>
        </Group>
      }
      size={620}
      radius="lg"
    >
      <Stack gap="md" mt="xs">
        <TextInput
          label="Event Title"
          placeholder="e.g. Sprint Planning, Client Sync..."
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          required
        />

        <Group grow gap="md">
          <Select
            label="Type"
            data={[
              { value: 'meeting', label: 'Meeting' },
              { value: 'milestone', label: 'Milestone' },
              { value: 'deadline', label: 'Deadline' },
              { value: 'reminder', label: 'Reminder' },
            ]}
            value={kind}
            onChange={setKind}
          />
          <Select
            label="Associated Project"
            placeholder="None"
            data={projects.map((p) => ({ value: p.id, label: p.name }))}
            value={projectId}
            onChange={setProjectId}
            clearable
          />
        </Group>

        <Group grow gap="md">
          <TextInput
            label="Start Date"
            type="date"
            min={eventItem?.id ? undefined : todayStr}
            value={date}
            onChange={(e) => setDate(e.currentTarget.value)}
            required
          />
          <TextInput
            label="End Date"
            type="date"
            min={date || todayStr}
            value={endDate}
            onChange={(e) => setEndDate(e.currentTarget.value)}
          />
        </Group>

        <Checkbox
          label="All Day Event"
          checked={allDay}
          onChange={(e) => setAllDay(e.currentTarget.checked)}
        />

        {!allDay && (
          <Group grow gap="md">
            <TextInput
              label="Start Time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.currentTarget.value)}
            />
            <TextInput
              label="End Time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.currentTarget.value)}
            />
          </Group>
        )}

        <TextInput
          label="Location / Meeting Link"
          placeholder="e.g. Conference Room A, or https://meet..."
          value={location}
          onChange={(e) => setLocation(e.currentTarget.value)}
        />

        <MultiSelect
          label="Invite Attendees"
          data={users.map((u) => ({ value: u.id, label: u.name }))}
          value={attendeeIds}
          onChange={setAttendeeIds}
          placeholder="Select who is invited"
          searchable
          clearable
        />

        <Textarea
          label="Notes / Agenda"
          placeholder="Add agenda or details..."
          minRows={2}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
        />

        <Group justify="space-between" mt="md">
          {eventItem?.id ? (
            <Button color="red" variant="subtle" leftSection={<IconTrash size={16} />} onClick={handleDelete}>
              Delete Event
            </Button>
          ) : <div />}

          <Group gap="xs">
            <Button variant="default" onClick={onClose}>Cancel</Button>
            <Button color="blue" onClick={handleSave} loading={submitting}>
              {eventItem?.id ? 'Save Changes' : 'Schedule Event'}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
