import { isTaskAssignee } from '@/lib/task-status';

export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrator (Full Access)' },
  { value: 'manager', label: 'Manager (Create & Edit Work)' },
  { value: 'member', label: 'Member (Tasks Only)' },
  { value: 'viewer', label: 'Viewer (Read-only)' },
];

export function normalizeRole(role) {
  if (role === 'admin') return 'admin';
  if (role === 'viewer') return 'viewer';
  if (role === 'manager') return 'manager';
  if (role === 'member') return 'member';
  if (role === 'processor') return 'member';
  return 'manager';
}

export function getRoleLabel(role) {
  return ROLE_OPTIONS.find((item) => item.value === normalizeRole(role))?.label || role;
}

export function getRoleShortLabel(role) {
  const labels = {
    admin: 'Admin',
    manager: 'Manager',
    member: 'Member',
    viewer: 'Viewer',
  };
  return labels[normalizeRole(role)] || role;
}

export function canCreateContent(user) {
  return user?.role === 'admin' || user?.role === 'manager';
}

export function canProcessTasks(user) {
  return user?.role === 'admin' || user?.role === 'manager' || user?.role === 'member';
}

export function isViewer(user) {
  return user?.role === 'viewer';
}

export function canDragTask(user, task) {
  if (!user || isViewer(user)) return false;
  if (user.role === 'admin' || user.role === 'manager') return true;
  if (user.role === 'member') return isTaskAssignee(task, user.id);
  return false;
}

export function canEditTaskDetails(user, task) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'manager') return true;
  if (user.role === 'member') return false;
  return false;
}

export function canChangeTaskAssignees(user) {
  return canCreateContent(user);
}

export function isTaskOnlyMember(user) {
  return user?.role === 'member';
}
