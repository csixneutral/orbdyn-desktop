export function mapProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email || '',
    role: row.role,
    color: row.color,
    active: row.active,
    createdAt: row.created_at,
    lastSeen: row.last_seen,
  };
}

export function mapProject(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    client: row.client || '',
    colour: row.colour || '#3d7fe0',
    ownerId: row.owner_id,
    memberIds: row.member_ids || [],
    visibility: row.visibility || 'everyone',
    status: row.status || 'active',
    dueDate: row.due_date,
    createdAt: row.created_at,
  };
}

export function mapTask(row) {
  if (!row) return null;
  const assigneeIds = row.assignee_ids || [];
  return {
    id: row.id,
    ref: row.ref,
    title: row.title,
    description: row.description || '',
    projectId: row.project_id,
    assigneeId: assigneeIds[0] || null,
    assigneeIds,
    createdBy: row.created_by,
    status: row.status,
    priority: row.priority,
    progress: row.progress ?? 0,
    dueDate: row.due_date,
    startDate: row.start_date,
    estimateHours: Number(row.estimate_hours || 0),
    tags: row.tags || [],
    watcherIds: row.watcher_ids || [],
    order: Number(row.sort_order || 0),
    position: Number(row.position || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

export function mapComment(row) {
  if (!row) return null;
  return {
    id: row.id,
    taskId: row.task_id,
    projectId: row.project_id,
    fileId: row.file_id,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export function mapFile(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    storedAs: row.storage_path,
    storagePath: row.storage_path,
    size: row.size,
    mime: row.mime,
    projectId: row.project_id,
    taskId: row.task_id,
    note: row.note || '',
    uploadedBy: row.uploaded_by,
    downloads: row.downloads || 0,
    createdAt: row.created_at,
  };
}

export function mapEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    endDate: row.end_date,
    startTime: row.start_time,
    endTime: row.end_time,
    allDay: row.all_day,
    location: row.location || '',
    notes: row.notes || '',
    kind: row.kind || 'meeting',
    projectId: row.project_id,
    attendeeIds: row.attendee_ids || [],
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function mapNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    link: row.link,
    actorId: row.actor_id,
    read: row.read,
    createdAt: row.created_at,
  };
}

export function mapActivity(row) {
  if (!row) return null;
  return {
    id: row.id,
    actorId: row.actor_id,
    action: row.action,
    subject: row.subject,
    link: row.link,
    createdAt: row.created_at,
  };
}

export function mapTrash(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.entity_type,
    name: row.name,
    data: row.data,
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
    deletedByName: row.deleted_by_name,
  };
}
