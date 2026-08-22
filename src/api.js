/*
 * src/api.js -- Centralized API client for Orbdyn endpoints.
 */

async function req(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  // Auth & Setup
  getBootstrap: () => req('/api/bootstrap'),
  setup: (payload) => req('/api/setup', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => req('/api/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => req('/api/logout', { method: 'POST' }),
  getMe: () => req('/api/me'),
  updatePassword: (payload) => req('/api/me/password', { method: 'POST', body: JSON.stringify(payload) }),

  // Users
  getUsers: () => req('/api/users'),
  createUser: (payload) => req('/api/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (id, payload) => req(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteUser: (id) => req(`/api/users/${id}`, { method: 'DELETE' }),

  // Projects
  getProjects: () => req('/api/projects'),
  createProject: (payload) => req('/api/projects', { method: 'POST', body: JSON.stringify(payload) }),
  updateProject: (id, payload) => req(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteProject: (id) => req(`/api/projects/${id}`, { method: 'DELETE' }),

  // Tasks
  getTasks: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req(`/api/tasks${q ? '?' + q : ''}`);
  },
  createTask: (payload) => req('/api/tasks', { method: 'POST', body: JSON.stringify(payload) }),
  updateTask: (id, payload) => req(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  reorderTasks: (tasks) => req('/api/tasks/reorder', { method: 'POST', body: JSON.stringify({ tasks }) }),
  deleteTask: (id) => req(`/api/tasks/${id}`, { method: 'DELETE' }),

  // Comments
  getComments: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req(`/api/comments${q ? '?' + q : ''}`);
  },
  createComment: (payload) => req('/api/comments', { method: 'POST', body: JSON.stringify(payload) }),

  // Files / Documents
  getFiles: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req(`/api/files${q ? '?' + q : ''}`);
  },
  uploadFiles: async (formData) => {
    const res = await fetch('/api/files', { method: 'POST', body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'File upload failed');
    return data;
  },
  deleteFile: (id) => req(`/api/files/${id}`, { method: 'DELETE' }),

  // Calendar Events
  getEvents: () => req('/api/events'),
  createEvent: (payload) => req('/api/events', { method: 'POST', body: JSON.stringify(payload) }),
  updateEvent: (id, payload) => req(`/api/events/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteEvent: (id) => req(`/api/events/${id}`, { method: 'DELETE' }),

  // Recycle Bin (Trash)
  getTrash: () => req('/api/trash'),
  restoreTrash: (id) => req(`/api/trash/${id}/restore`, { method: 'POST' }),
  deleteTrashPermanent: (id) => req(`/api/trash/${id}/permanent`, { method: 'DELETE' }),
  emptyTrash: () => req('/api/trash/empty', { method: 'DELETE' }),

  // Notifications & Dashboard
  getNotifications: () => req('/api/notifications'),
  markNotificationsRead: (ids) => req('/api/notifications/read', { method: 'POST', body: JSON.stringify({ ids }) }),
  getActivity: () => req('/api/activity'),
  getDashboard: () => req('/api/dashboard'),

  // Share controls
  getShareStatus: () => req('/api/share'),
  startShare: () => req('/api/share/start', { method: 'POST' }),
  stopShare: () => req('/api/share/stop', { method: 'POST' }),
};
