import React, { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Calendar, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { DatePicker } from '@/components/ui/date-picker';
import { showNotification } from '@/lib/notify';
import { api } from '../api';
import { useData } from '../context/DataContext';

export function EventModal({ eventItem, opened, onClose, defaultProjectId }) {
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
      setProjectId(defaultProjectId || null);
      setAttendeeIds([]);
      setKind('meeting');
    }
  }, [eventItem, opened, defaultProjectId]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const handleSave = async () => {
    if (!title.trim() || !date) {
      showNotification({ title: 'Validation', message: 'Title and Date are required', color: 'red' });
      return;
    }
    if (!eventItem?.id && date < todayStr) {
      showNotification({
        title: 'Invalid Date',
        message: 'New events cannot be scheduled on past dates.',
        color: 'red',
      });
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
        showNotification({ title: 'Updated', message: 'Event details updated', color: 'green' });
      } else {
        await api.createEvent(payload);
        showNotification({ title: 'Scheduled', message: 'New event added to calendar', color: 'green' });
      }
      refresh();
      onClose();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!eventItem?.id) return;
    try {
      await api.deleteEvent(eventItem.id);
      showNotification({ title: 'Deleted', message: 'Event removed from calendar', color: 'blue' });
      refresh();
      onClose();
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  return (
    <Dialog open={opened} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-[620px] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{eventItem?.id ? 'Edit Event' : 'Schedule Event'}</DialogTitle>
              <DialogDescription>Add meetings, reminders, or project milestones</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Event Title</Label>
            <Input
              placeholder="e.g. Sprint Planning, Client Sync..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Associated Project</Label>
              <Select
                value={projectId || '__none__'}
                onValueChange={(val) => setProjectId(val === '__none__' ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <DatePicker
                value={date}
                onChange={setDate}
                minDate={eventItem?.id ? undefined : todayStr}
                placeholder="Pick start date"
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                minDate={date || todayStr}
                placeholder="Pick end date"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="all-day"
              checked={allDay}
              onCheckedChange={(checked) => setAllDay(!!checked)}
            />
            <Label htmlFor="all-day" className="cursor-pointer font-normal">
              All Day Event
            </Label>
          </div>

          {!allDay && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Location / Meeting Link</Label>
            <Input
              placeholder="e.g. Conference Room A, or https://meet..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Invite Attendees</Label>
            <MultiSelect
              options={users.map((u) => ({ value: u.id, label: u.name }))}
              value={attendeeIds}
              onChange={setAttendeeIds}
              placeholder="Select who is invited"
            />
          </div>

          <div className="space-y-2">
            <Label>Notes / Agenda</Label>
            <Textarea
              placeholder="Add agenda or details..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {eventItem?.id ? (
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
                Delete Event
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={submitting}>
                {submitting && <Spinner />}
                {eventItem?.id ? 'Save Changes' : 'Schedule Event'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
