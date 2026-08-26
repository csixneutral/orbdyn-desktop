export const TASK_STATUS_COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'gray' },
  { id: 'in_progress', title: 'In Progress', color: 'blue' },
  { id: 'review', title: 'In Review', color: 'yellow' },
  { id: 'done', title: 'Done', color: 'green' },
  { id: 'blocked', title: 'Blocked', color: 'red' },
];

const STATUS_ORDER = {
  todo: 0,
  in_progress: 1,
  blocked: 1,
  review: 2,
  done: 3,
};

export function getStatusOrder(status) {
  return STATUS_ORDER[status] ?? 0;
}

export function isBackwardStatusChange(fromStatus, toStatus) {
  if (!fromStatus || !toStatus || fromStatus === toStatus) return false;
  return getStatusOrder(toStatus) < getStatusOrder(fromStatus);
}

export function isProjectOwner(user, project) {
  return Boolean(user?.id && project?.ownerId && project.ownerId === user.id);
}

export function canBypassStatusWorkflow(user, project) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return isProjectOwner(user, project);
}

export function getTaskAssigneeIds(task) {
  if (task?.assigneeIds?.length) return task.assigneeIds;
  if (task?.assigneeId) return [task.assigneeId];
  return [];
}

export function isTaskAssignee(task, userId) {
  return getTaskAssigneeIds(task).includes(userId);
}

export function canUpdateTaskStatus(user, task) {
  if (!user || user.role === 'viewer') return false;
  if (user.role === 'admin') return true;
  if (user.role === 'manager' || user.role === 'member') {
    return isTaskAssignee(task, user.id);
  }
  return false;
}

export function canChangeTaskStatus({ user, task, project, fromStatus, toStatus }) {
  if (!fromStatus || !toStatus || fromStatus === toStatus) return true;
  if (!canUpdateTaskStatus(user, task)) return false;
  if (canBypassStatusWorkflow(user, project)) return true;
  return !isBackwardStatusChange(fromStatus, toStatus);
}

export function getAllowedTaskStatuses({ user, task, project, currentStatus }) {
  const fromStatus = currentStatus ?? task?.status;
  return TASK_STATUS_COLUMNS.filter((col) =>
    canChangeTaskStatus({ user, task, project, fromStatus, toStatus: col.id })
  );
}

export function getStatusChangeBlockedMessage() {
  return 'Only an admin or project owner can move a task back to an earlier status.';
}
