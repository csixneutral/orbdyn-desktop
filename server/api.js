/*
 * api.js -- everything the app can do.
 *
 * PLAIN ENGLISH: The screen you see (in public/) never touches the data file
 * directly. It asks this file politely, e.g. "give me all tasks", "create this
 * project". Each of those requests is one of the routes below. This is the
 * single place where permissions are checked.
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const store = require('./store');
const auth = require('./auth');
const notify = require('./notify');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done', 'blocked'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

function sortTasksByOrder(a, b) {
  if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
  if (a.order !== undefined) return -1;
  if (b.order !== undefined) return 1;
  return (a.createdAt || '').localeCompare(b.createdAt || '');
}

function applyTaskStatusSideEffects(task, beforeStatus) {
  if (task.status === 'done') {
    task.progress = 100;
    if (!task.completedAt) task.completedAt = store.now();
  } else {
    task.completedAt = null;
    if (task.progress === 100) task.progress = 90;
    if (task.status === 'todo' && beforeStatus !== 'todo' && task.progress === 0) task.progress = 0;
    if (task.progress > 0 && task.status === 'todo') task.status = 'in_progress';
  }
}

function find(collection, id) {
  return store.db[collection].find((x) => x.id === id);
}

function memberIdsOfProject(project) {
  if (!project) return [];
  return [...new Set([project.ownerId, ...(project.memberIds || [])])].filter(Boolean);
}

// Who should be told about something happening inside a project?
function projectAudience(projectId) {
  const project = find('projects', projectId);
  if (!project) return store.db.users.map((u) => u.id);
  if (project.visibility === 'everyone') return store.db.users.map((u) => u.id);
  return memberIdsOfProject(project);
}

function canSeeProject(user, project) {
  if (!project) return false;
  if (user.role === 'admin') return true;
  if (project.visibility === 'everyone') return true;
  return memberIdsOfProject(project).includes(user.id);
}

function isTaskAssignee(task, userId) {
  if (!task || !userId) return false;
  if (task.assigneeId === userId) return true;
  return (task.assigneeIds || []).includes(userId);
}

function restoreArchivedFile(fileData) {
  if (!fileData?.storedAs) return;
  const archivePath = path.join(store.FILES_DIR, '_removed', path.basename(fileData.storedAs));
  const restorePath = path.join(store.FILES_DIR, fileData.storedAs);
  if (!fs.existsSync(archivePath)) return;
  fs.mkdirSync(path.dirname(restorePath), { recursive: true });
  fs.renameSync(archivePath, restorePath);
}

function visibleProjects(user) {
  return store.db.projects.filter((p) => canSeeProject(user, p));
}

function safeName(name) {
  return String(name || 'file')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'file';
}

function bad(res, msg, code = 400) {
  return res.status(code).json({ error: msg });
}

// ---------------------------------------------------------------------------
// First run + sign in
// ---------------------------------------------------------------------------

router.get('/bootstrap', (req, res) => {
  res.json({
    setupNeeded: store.db.users.length === 0,
    orgName: store.db.settings.orgName,
    dataFolder: store.HOME,
    me: auth.publicUser(req.user),
  });
});

router.post('/setup', (req, res) => {
  if (store.db.users.length > 0) return bad(res, 'Orbdyn is already set up.');
  const { name, username, password, orgName, email } = req.body || {};
  if (!name || !username || !password) return bad(res, 'Name, username and password are required.');
  if (String(password).length < 6) return bad(res, 'Password must be at least 6 characters.');

  const user = {
    id: store.id(),
    name: String(name).trim(),
    username: String(username).trim().toLowerCase(),
    email: (email || '').trim(),
    role: 'admin',
    color: auth.pickColor(),
    password: auth.hashPassword(String(password)),
    active: true,
    createdAt: store.now(),
  };
  store.db.users.push(user);
  if (orgName) store.db.settings.orgName = String(orgName).trim();
  store.save();

  res.cookie('orbdyn_session', auth.makeToken(user.id), {
    httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 3600 * 1000,
  });
  notify.logActivity({ actorId: user.id, action: 'created the workspace', subject: store.db.settings.orgName });
  res.json({ user: auth.publicUser(user), orgName: store.db.settings.orgName });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = store.db.users.find(
    (u) => u.username === String(username || '').trim().toLowerCase()
  );
  if (!user || !auth.verifyPassword(String(password || ''), user.password)) {
    return bad(res, 'Wrong username or password.', 401);
  }
  if (user.active === false) return bad(res, 'This account has been switched off.', 403);
  res.cookie('orbdyn_session', auth.makeToken(user.id), {
    httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 3600 * 1000,
  });
  user.lastSeen = store.now();
  store.save();
  res.json({ user: auth.publicUser(user) });
});

router.post('/logout', (req, res) => {
  res.clearCookie('orbdyn_session');
  res.json({ ok: true });
});

router.get('/me', auth.requireLogin, (req, res) => {
  res.json({ user: auth.publicUser(req.user), orgName: store.db.settings.orgName });
});

router.post('/me/password', auth.requireLogin, (req, res) => {
  const { current, next } = req.body || {};
  if (!auth.verifyPassword(String(current || ''), req.user.password)) {
    return bad(res, 'Your current password is not correct.');
  }
  if (String(next || '').length < 6) return bad(res, 'New password must be at least 6 characters.');
  req.user.password = auth.hashPassword(String(next));
  store.save();
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

router.get('/users', auth.requireLogin, (req, res) => {
  res.json({ users: store.db.users.map(auth.publicUser) });
});

router.post('/users', auth.requireAdmin, (req, res) => {
  const { name, username, password, role, email } = req.body || {};
  if (!name || !username || !password) return bad(res, 'Name, username and password are required.');
  const uname = String(username).trim().toLowerCase();
  if (store.db.users.some((u) => u.username === uname)) return bad(res, 'That username is already taken.');
  if (String(password).length < 6) return bad(res, 'Password must be at least 6 characters.');
  const user = {
    id: store.id(),
    name: String(name).trim(),
    username: uname,
    email: (email || '').trim(),
    role: role === 'admin' ? 'admin' : role === 'viewer' ? 'viewer' : 'member',
    color: auth.pickColor(),
    password: auth.hashPassword(String(password)),
    active: true,
    createdAt: store.now(),
  };
  store.db.users.push(user);
  store.save();
  notify.logActivity({ actorId: req.user.id, action: 'added a person', subject: user.name });
  notify.broadcast({ type: 'users-changed' });
  res.json({ user: auth.publicUser(user) });
});

router.patch('/users/:id', auth.requireAdmin, (req, res) => {
  const user = find('users', req.params.id);
  if (!user) return bad(res, 'No such person.', 404);
  const { name, role, email, active, password } = req.body || {};
  if (name !== undefined) user.name = String(name).trim();
  if (email !== undefined) user.email = String(email).trim();
  if (role !== undefined) user.role = role === 'admin' ? 'admin' : role === 'viewer' ? 'viewer' : 'member';
  if (active !== undefined) {
    const admins = store.db.users.filter((u) => u.role === 'admin' && u.active !== false);
    if (!active && user.role === 'admin' && admins.length <= 1) {
      return bad(res, 'You cannot switch off the only administrator.');
    }
    user.active = !!active;
  }
  if (password) {
    if (String(password).length < 6) return bad(res, 'Password must be at least 6 characters.');
    user.password = auth.hashPassword(String(password));
  }
  store.save();
  notify.broadcast({ type: 'users-changed' });
  res.json({ user: auth.publicUser(user) });
});

router.delete('/users/:id', auth.requireAdmin, (req, res) => {
  const userItem = find('users', req.params.id);
  if (!userItem) return bad(res, 'No such person.', 404);
  if (userItem.id === req.user.id) return bad(res, 'You cannot delete your own account.');
  const admins = store.db.users.filter((u) => u.role === 'admin' && u.active !== false);
  if (userItem.role === 'admin' && admins.length <= 1) {
    return bad(res, 'You cannot delete the only administrator.');
  }

  store.db.users = store.db.users.filter((u) => u.id !== userItem.id);
  store.db.trash = store.db.trash || [];
  store.db.trash.push({
    id: userItem.id,
    type: 'user',
    name: userItem.name,
    data: userItem,
    deletedAt: store.now(),
    deletedBy: req.user.id,
    deletedByName: req.user.name,
  });
  store.save();
  notify.logActivity({ actorId: req.user.id, action: 'moved person to trash', subject: userItem.name });
  notify.broadcast({ type: 'users-changed' });
  notify.broadcast({ type: 'trash-changed' });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

router.get('/projects', auth.requireLogin, (req, res) => {
  res.json({ projects: visibleProjects(req.user) });
});

router.post('/projects', auth.requireLogin, (req, res) => {
  if (req.user.role === 'viewer') return bad(res, 'Viewers cannot create projects.', 403);
  const { name, description, client, colour, memberIds, visibility, dueDate } = req.body || {};
  if (!name) return bad(res, 'A project needs a name.');
  const project = {
    id: store.id(),
    name: String(name).trim(),
    description: (description || '').trim(),
    client: (client || '').trim(),
    colour: colour || '#3d7fe0',
    ownerId: req.user.id,
    memberIds: Array.isArray(memberIds) ? memberIds.filter(Boolean) : [],
    visibility: visibility === 'members' ? 'members' : 'everyone',
    status: 'active',
    dueDate: dueDate || null,
    createdAt: store.now(),
  };
  store.db.projects.push(project);
  store.save();
  fs.mkdirSync(path.join(store.FILES_DIR, project.id), { recursive: true });

  notify.logActivity({ actorId: req.user.id, action: 'created project', subject: project.name, link: { view: 'project', id: project.id } });
  notify.notifyUsers(projectAudience(project.id), {
    kind: 'task', actorId: req.user.id,
    title: `New project: ${project.name}`,
    body: `${req.user.name} created a project you are part of.`,
    link: { view: 'project', id: project.id },
  });
  notify.broadcast({ type: 'projects-changed' });
  res.json({ project });
});

router.patch('/projects/:id', auth.requireLogin, (req, res) => {
  const project = find('projects', req.params.id);
  if (!project) return bad(res, 'No such project.', 404);
  if (req.user.role !== 'admin' && project.ownerId !== req.user.id) {
    return bad(res, 'Only the project owner or an administrator can change this project.', 403);
  }
  for (const key of ['name', 'description', 'client', 'colour', 'status', 'dueDate', 'visibility']) {
    if (req.body[key] !== undefined) project[key] = req.body[key];
  }
  if (Array.isArray(req.body.memberIds)) project.memberIds = req.body.memberIds.filter(Boolean);
  store.save();
  notify.broadcast({ type: 'projects-changed' });
  res.json({ project });
});

router.delete('/projects/:id', auth.requireLogin, (req, res) => {
  const project = find('projects', req.params.id);
  if (!project) return bad(res, 'No such project.', 404);
  if (req.user.role !== 'admin' && project.ownerId !== req.user.id) {
    return bad(res, 'Only the project owner or an administrator can delete this project.', 403);
  }
  store.db.projects = store.db.projects.filter((p) => p.id !== project.id);
  store.db.trash = store.db.trash || [];
  store.db.trash.push({
    id: project.id,
    type: 'project',
    name: project.name,
    data: project,
    deletedAt: store.now(),
    deletedBy: req.user.id,
    deletedByName: req.user.name,
  });
  store.save();
  notify.logActivity({ actorId: req.user.id, action: 'moved project to trash', subject: project.name });
  notify.broadcast({ type: 'projects-changed' });
  notify.broadcast({ type: 'trash-changed' });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Tasks -- the heart of "how much work has progressed, who it was awarded to"
// ---------------------------------------------------------------------------

function taskAudience(task) {
  const ids = new Set(projectAudience(task.projectId));
  if (task.assigneeId) ids.add(task.assigneeId);
  (task.assigneeIds || []).forEach((a) => ids.add(a));
  if (task.createdBy) ids.add(task.createdBy);
  (task.watcherIds || []).forEach((w) => ids.add(w));
  return [...ids];
}

router.get('/tasks', auth.requireLogin, (req, res) => {
  const allowed = new Set(visibleProjects(req.user).map((p) => p.id));
  let tasks = store.db.tasks.filter((t) => !t.projectId || allowed.has(t.projectId));
  const { projectId, assigneeId, status } = req.query;
  if (projectId) tasks = tasks.filter((t) => t.projectId === projectId);
  if (assigneeId) tasks = tasks.filter((t) => t.assigneeId === assigneeId);
  if (status) tasks = tasks.filter((t) => t.status === status);
  res.json({ tasks });
});

router.post('/tasks', auth.requireLogin, (req, res) => {
  if (req.user.role === 'viewer') return bad(res, 'Viewers cannot create tasks.', 403);
  const { title, description, projectId, assigneeId, assigneeIds: rawAssigneeIds, status, priority, dueDate, startDate, progress, estimateHours, tags } = req.body || {};
  if (!title) return bad(res, 'A task needs a title.');
  const project = projectId ? find('projects', projectId) : null;
  if (projectId && !project) return bad(res, 'No such project.');

  const assigneeIds = Array.isArray(rawAssigneeIds)
    ? rawAssigneeIds.filter(Boolean)
    : (assigneeId ? [assigneeId] : []);

  const task = {
    id: store.id(),
    ref: 'ORB-' + (store.db.tasks.length + 1),
    title: String(title).trim(),
    description: (description || '').trim(),
    projectId: projectId || null,
    assigneeId: assigneeIds[0] || null,
    assigneeIds,
    createdBy: req.user.id,
    status: TASK_STATUSES.includes(status) ? status : 'todo',
    priority: PRIORITIES.includes(priority) ? priority : 'normal',
    progress: Math.max(0, Math.min(100, Number(progress) || 0)),
    dueDate: dueDate || null,
    startDate: startDate || null,
    estimateHours: Number(estimateHours) || 0,
    tags: Array.isArray(tags) ? tags : [],
    watcherIds: [],
    createdAt: store.now(),
    updatedAt: store.now(),
    completedAt: null,
  };
  if (task.status === 'done') { task.progress = 100; task.completedAt = store.now(); }
  store.db.tasks.push(task);
  store.save();

  notify.logActivity({
    actorId: req.user.id, action: 'created task', subject: task.title,
    link: { view: 'task', id: task.id },
  });
  if (task.assigneeIds.length > 0) {
    notify.notifyUsers(task.assigneeIds, {
      kind: 'task', actorId: req.user.id,
      title: 'Work awarded to you',
      body: `${req.user.name} assigned "${task.title}" to you.`,
      link: { view: 'task', id: task.id },
    });
  }
  notify.broadcast({ type: 'tasks-changed' });
  res.json({ task });
});

router.patch('/tasks/:id', auth.requireLogin, (req, res) => {
  const task = find('tasks', req.params.id);
  if (!task) return bad(res, 'No such task.', 404);
  if (req.user.role === 'viewer') return bad(res, 'Viewers cannot change tasks.', 403);

  const before = { status: task.status, assigneeId: task.assigneeId, assigneeIds: task.assigneeIds || [], progress: task.progress };

  for (const key of ['title', 'description', 'projectId', 'dueDate', 'startDate', 'estimateHours', 'order', 'position']) {
    if (req.body[key] !== undefined) task[key] = req.body[key];
  }
  if (req.body.status !== undefined && TASK_STATUSES.includes(req.body.status)) task.status = req.body.status;
  if (req.body.priority !== undefined && PRIORITIES.includes(req.body.priority)) task.priority = req.body.priority;
  
  if (req.body.assigneeIds !== undefined) {
    task.assigneeIds = Array.isArray(req.body.assigneeIds) ? req.body.assigneeIds.filter(Boolean) : [];
    task.assigneeId = task.assigneeIds[0] || null;
  } else if (req.body.assigneeId !== undefined) {
    task.assigneeId = req.body.assigneeId || null;
    task.assigneeIds = task.assigneeId ? [task.assigneeId] : [];
  }
  
  if (req.body.progress !== undefined) task.progress = Math.max(0, Math.min(100, Number(req.body.progress) || 0));
  if (Array.isArray(req.body.tags)) task.tags = req.body.tags;

  // Keep status and progress sensible with each other.
  applyTaskStatusSideEffects(task, before.status);
  task.updatedAt = store.now();
  store.save();

  const newAssignees = (task.assigneeIds || []).filter((id) => !(before.assigneeIds || []).includes(id));
  if (newAssignees.length > 0) {
    notify.notifyUsers(newAssignees, {
      kind: 'task', actorId: req.user.id,
      title: 'Work awarded to you',
      body: `${req.user.name} assigned "${task.title}" to you.`,
      link: { view: 'task', id: task.id },
    });
  }
  if (before.status !== task.status) {
    notify.notifyUsers(taskAudience(task), {
      kind: 'task', actorId: req.user.id,
      title: `"${task.title}" is now ${task.status.replace('_', ' ')}`,
      body: `Updated by ${req.user.name}.`,
      link: { view: 'task', id: task.id },
    });
    notify.logActivity({
      actorId: req.user.id, action: `moved to ${task.status.replace('_', ' ')}`,
      subject: task.title, link: { view: 'task', id: task.id },
    });
  } else if (before.progress !== task.progress) {
    notify.logActivity({
      actorId: req.user.id, action: `set progress ${task.progress}% on`,
      subject: task.title, link: { view: 'task', id: task.id },
    });
  }
  notify.broadcast({ type: 'tasks-changed' });
  res.json({ task });
});

router.post('/tasks/reorder', auth.requireLogin, (req, res) => {
  if (req.user.role === 'viewer') return bad(res, 'Viewers cannot reorder tasks.', 403);
  const items = req.body.tasks;
  if (!Array.isArray(items)) return bad(res, 'tasks array required.', 400);

  items.forEach((item) => {
    const task = find('tasks', item.id);
    if (task) {
      const beforeStatus = task.status;
      if (item.status && TASK_STATUSES.includes(item.status)) task.status = item.status;
      if (item.order !== undefined) task.order = Number(item.order) || 0;
      if (beforeStatus !== task.status) applyTaskStatusSideEffects(task, beforeStatus);
      task.updatedAt = store.now();
    }
  });

  store.save();
  notify.broadcast({ type: 'tasks-changed' });
  res.json({ ok: true });
});

router.delete('/tasks/:id', auth.requireLogin, (req, res) => {
  const task = find('tasks', req.params.id);
  if (!task) return bad(res, 'No such task.', 404);
  if (req.user.role !== 'admin' && task.createdBy !== req.user.id) {
    return bad(res, 'Only the person who created this item, or an administrator, can delete it.', 403);
  }
  store.db.tasks = store.db.tasks.filter((t) => t.id !== task.id);
  store.db.trash = store.db.trash || [];
  store.db.trash.push({
    id: task.id,
    type: 'task',
    name: task.title,
    data: task,
    deletedAt: store.now(),
    deletedBy: req.user.id,
    deletedByName: req.user.name,
  });
  store.save();
  notify.logActivity({ actorId: req.user.id, action: 'moved task to trash', subject: task.title });
  notify.broadcast({ type: 'tasks-changed' });
  notify.broadcast({ type: 'trash-changed' });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Messages (comments) -- these are what trigger the "you got a message" popup
// ---------------------------------------------------------------------------

router.get('/comments', auth.requireLogin, (req, res) => {
  const { taskId, projectId, fileId } = req.query;
  let list = store.db.comments;
  if (taskId) list = list.filter((c) => c.taskId === taskId);
  else if (projectId) list = list.filter((c) => c.projectId === projectId && !c.taskId && !c.fileId);
  else if (fileId) list = list.filter((c) => c.fileId === fileId);
  else list = list.slice(-100);
  res.json({ comments: list });
});

router.post('/comments', auth.requireLogin, (req, res) => {
  const { taskId, projectId, fileId, body } = req.body || {};
  if (!body || !String(body).trim()) return bad(res, 'Write something first.');
  const comment = {
    id: store.id(),
    taskId: taskId || null,
    projectId: projectId || null,
    fileId: fileId || null,
    authorId: req.user.id,
    body: String(body).trim().slice(0, 5000),
    createdAt: store.now(),
  };
  store.db.comments.push(comment);
  store.save();

  let audience = [];
  let where = 'the workspace';
  let link = { view: 'activity' };
  if (taskId) {
    const task = find('tasks', taskId);
    if (task) {
      audience = taskAudience(task);
      where = task.title;
      link = { view: 'task', id: task.id };
      task.watcherIds = task.watcherIds || [];
      if (!task.watcherIds.includes(req.user.id)) { task.watcherIds.push(req.user.id); store.save(); }
    }
  } else if (fileId) {
    const file = find('files', fileId);
    if (file) {
      audience = projectAudience(file.projectId);
      audience.push(file.uploadedBy);
      where = file.name;
      link = { view: 'files', id: file.id };
    }
  } else if (projectId) {
    audience = projectAudience(projectId);
    const p = find('projects', projectId);
    where = p ? p.name : where;
    link = { view: 'project', id: projectId };
  } else {
    audience = store.db.users.map((u) => u.id);
  }

  notify.notifyUsers(audience, {
    kind: 'comment', actorId: req.user.id,
    title: `Message from ${req.user.name}`,
    body: `${comment.body.slice(0, 140)}  —  on ${where}`,
    link,
  });
  notify.broadcast({ type: 'comments-changed', comment });
  res.json({ comment });
});

// ---------------------------------------------------------------------------
// Documents -- stored in a real folder on THIS computer, never in the cloud
// ---------------------------------------------------------------------------

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const dir = path.join(store.FILES_DIR, req.body.projectId || 'general');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(req, file, cb) {
      // Keep the human name, but prefix an id so two files with the same name
      // can happily live side by side.
      const original = Buffer.from(file.originalname, 'latin1').toString('utf8');
      cb(null, `${store.id()}__${safeName(original)}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB per file
});

router.get('/files', auth.requireLogin, (req, res) => {
  const allowed = new Set(visibleProjects(req.user).map((p) => p.id));
  let list = store.db.files.filter((f) => !f.projectId || allowed.has(f.projectId));
  if (req.query.projectId) list = list.filter((f) => f.projectId === req.query.projectId);
  if (req.query.taskId) list = list.filter((f) => f.taskId === req.query.taskId);
  res.json({ files: list });
});

router.post('/files', auth.requireLogin, upload.array('files', 20), (req, res) => {
  if (req.user.role === 'viewer') return bad(res, 'Viewers cannot upload documents.', 403);
  const uploaded = (req.files || []).map((f) => {
    const original = Buffer.from(f.originalname, 'latin1').toString('utf8');
    const record = {
      id: store.id(),
      name: safeName(original),
      storedAs: path.relative(store.FILES_DIR, f.path),
      size: f.size,
      mime: f.mimetype,
      projectId: req.body.projectId || null,
      taskId: req.body.taskId || null,
      note: (req.body.note || '').trim(),
      uploadedBy: req.user.id,
      createdAt: store.now(),
      downloads: 0,
    };
    store.db.files.push(record);
    return record;
  });
  store.save();

  if (uploaded.length) {
    const first = uploaded[0];
    const audience = first.projectId ? projectAudience(first.projectId) : store.db.users.map((u) => u.id);
    notify.notifyUsers(audience, {
      kind: 'file', actorId: req.user.id,
      title: uploaded.length === 1 ? `New document: ${first.name}` : `${uploaded.length} new documents`,
      body: `Shared by ${req.user.name}.`,
      link: { view: 'files', id: first.id },
    });
    notify.logActivity({
      actorId: req.user.id, action: 'shared', subject: uploaded.map((u) => u.name).join(', '),
      link: { view: 'files', id: first.id },
    });
    notify.broadcast({ type: 'files-changed' });
  }
  res.json({ files: uploaded });
});

router.get('/files/:id/download', auth.requireLogin, (req, res) => {
  const file = find('files', req.params.id);
  if (!file) return bad(res, 'No such document.', 404);
  const project = file.projectId ? find('projects', file.projectId) : null;
  if (project && !canSeeProject(req.user, project)) return bad(res, 'You do not have access to this document.', 403);
  const full = path.join(store.FILES_DIR, file.storedAs);
  if (!full.startsWith(store.FILES_DIR) || !fs.existsSync(full)) {
    return bad(res, 'The document is no longer on this computer.', 404);
  }
  file.downloads = (file.downloads || 0) + 1;
  store.save();
  res.download(full, file.name);
});

// Preview in the browser (images / PDFs) instead of downloading.
router.get('/files/:id/view', auth.requireLogin, (req, res) => {
  const file = find('files', req.params.id);
  if (!file) return bad(res, 'No such document.', 404);
  const full = path.join(store.FILES_DIR, file.storedAs);
  if (!full.startsWith(store.FILES_DIR) || !fs.existsSync(full)) return bad(res, 'Missing file.', 404);
  res.type(file.mime || 'application/octet-stream');
  fs.createReadStream(full).pipe(res);
});

router.delete('/files/:id', auth.requireLogin, (req, res) => {
  const file = find('files', req.params.id);
  if (!file) return bad(res, 'No such document.', 404);
  if (req.user.role !== 'admin' && file.uploadedBy !== req.user.id) {
    return bad(res, 'Only the person who shared it, or an administrator, can remove it.', 403);
  }
  // We remove it from the list but move the real file into an "archive" folder
  // rather than destroying it.
  try {
    const from = path.join(store.FILES_DIR, file.storedAs);
    const to = path.join(store.FILES_DIR, '_removed', path.basename(file.storedAs));
    fs.mkdirSync(path.dirname(to), { recursive: true });
    if (fs.existsSync(from)) fs.renameSync(from, to);
  } catch (err) { console.error('[orbdyn] archive failed', err); }
  store.db.files = store.db.files.filter((f) => f.id !== file.id);
  store.db.trash = store.db.trash || [];
  store.db.trash.push({
    id: file.id,
    type: 'file',
    name: file.name,
    data: file,
    deletedAt: store.now(),
    deletedBy: req.user.id,
    deletedByName: req.user.name,
  });
  store.save();
  notify.logActivity({ actorId: req.user.id, action: 'moved document to trash', subject: file.name });
  notify.broadcast({ type: 'files-changed' });
  notify.broadcast({ type: 'trash-changed' });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

router.get('/events', auth.requireLogin, (req, res) => {
  res.json({ events: store.db.events });
});

router.post('/events', auth.requireLogin, (req, res) => {
  const { title, date, endDate, startTime, endTime, allDay, location, notes, projectId, attendeeIds, kind } = req.body || {};
  if (!title || !date) return bad(res, 'An event needs a title and a date.');
  const event = {
    id: store.id(),
    title: String(title).trim(),
    date,
    endDate: endDate || date,
    startTime: startTime || null,
    endTime: endTime || null,
    allDay: !!allDay,
    location: (location || '').trim(),
    notes: (notes || '').trim(),
    kind: kind || 'meeting',
    projectId: projectId || null,
    attendeeIds: Array.isArray(attendeeIds) ? attendeeIds : [],
    createdBy: req.user.id,
    createdAt: store.now(),
  };
  store.db.events.push(event);
  store.save();
  notify.notifyUsers(event.attendeeIds, {
    kind: 'event', actorId: req.user.id,
    title: `Invitation: ${event.title}`,
    body: `${event.date}${event.startTime ? ' at ' + event.startTime : ''} — added by ${req.user.name}.`,
    link: { view: 'calendar', id: event.id },
  });
  notify.broadcast({ type: 'events-changed' });
  res.json({ event });
});

router.patch('/events/:id', auth.requireLogin, (req, res) => {
  const event = find('events', req.params.id);
  if (!event) return bad(res, 'No such event.', 404);
  if (req.user.role !== 'admin' && event.createdBy !== req.user.id) {
    return bad(res, 'Only the person who created this event, or an administrator, can change it.', 403);
  }
  for (const key of ['title', 'date', 'endDate', 'startTime', 'endTime', 'allDay', 'location', 'notes', 'projectId', 'kind']) {
    if (req.body[key] !== undefined) event[key] = req.body[key];
  }
  if (Array.isArray(req.body.attendeeIds)) event.attendeeIds = req.body.attendeeIds;
  store.save();
  notify.broadcast({ type: 'events-changed' });
  res.json({ event });
});

router.delete('/events/:id', auth.requireLogin, (req, res) => {
  const event = find('events', req.params.id);
  if (!event) return bad(res, 'No such event.', 404);
  if (req.user.role !== 'admin' && event.createdBy !== req.user.id) {
    return bad(res, 'Only the person who created this event, or an administrator, can delete it.', 403);
  }
  store.db.events = store.db.events.filter((e) => e.id !== event.id);
  store.save();
  notify.broadcast({ type: 'events-changed' });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Notifications + activity
// ---------------------------------------------------------------------------

router.get('/notifications', auth.requireLogin, (req, res) => {
  const mine = store.db.notifications.filter((n) => n.userId === req.user.id).slice(-200).reverse();
  res.json({ notifications: mine, unread: mine.filter((n) => !n.read).length });
});

router.post('/notifications/read', auth.requireLogin, (req, res) => {
  const ids = Array.isArray(req.body.ids) ? new Set(req.body.ids) : null;
  for (const n of store.db.notifications) {
    if (n.userId === req.user.id && (!ids || ids.has(n.id))) n.read = true;
  }
  store.save();
  res.json({ ok: true });
});

router.get('/activity', auth.requireLogin, (req, res) => {
  res.json({ activity: store.db.activity.slice(-150).reverse() });
});

// ---------------------------------------------------------------------------
// Dashboard numbers
// ---------------------------------------------------------------------------

router.get('/dashboard', auth.requireLogin, (req, res) => {
  const projects = visibleProjects(req.user);
  const allowed = new Set(projects.map((p) => p.id));
  const tasks = store.db.tasks.filter((t) => !t.projectId || allowed.has(t.projectId));
  const today = new Date().toISOString().slice(0, 10);

  const byStatus = {};
  for (const s of TASK_STATUSES) byStatus[s] = tasks.filter((t) => t.status === s).length;

  const perProject = projects.map((p) => {
    const list = tasks.filter((t) => t.projectId === p.id);
    const done = list.filter((t) => t.status === 'done').length;
    const avg = list.length ? Math.round(list.reduce((a, t) => a + (t.status === 'done' ? 100 : t.progress), 0) / list.length) : 0;
    return { id: p.id, name: p.name, colour: p.colour, total: list.length, done, progress: avg, dueDate: p.dueDate, status: p.status };
  });

  const perPerson = store.db.users.filter((u) => u.active !== false).map((u) => {
    const list = tasks.filter((t) => isTaskAssignee(t, u.id));
    return {
      id: u.id, name: u.name, color: u.color,
      open: list.filter((t) => t.status !== 'done').length,
      done: list.filter((t) => t.status === 'done').length,
      overdue: list.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < today).length,
    };
  });

  res.json({
    totals: {
      projects: projects.length,
      tasks: tasks.length,
      done: byStatus.done,
      overdue: tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < today).length,
      dueToday: tasks.filter((t) => t.status !== 'done' && t.dueDate === today).length,
      mine: tasks.filter((t) => isTaskAssignee(t, req.user.id) && t.status !== 'done').length,
      documents: store.db.files.filter((f) => !f.projectId || allowed.has(f.projectId)).length,
    },
    byStatus, perProject, perPerson,
    dataFolder: store.HOME,
  });
});

// ---------------------------------------------------------------------------
// Recycle Bin (Trash)
// ---------------------------------------------------------------------------

router.get('/trash', auth.requireLogin, (req, res) => {
  res.json({ trash: store.db.trash || [] });
});

router.post('/trash/:id/restore', auth.requireLogin, (req, res) => {
  if (req.user.role === 'viewer') return bad(res, 'Viewers cannot restore items from the Recycle Bin.', 403);
  store.db.trash = store.db.trash || [];
  const itemIndex = store.db.trash.findIndex((t) => t.id === req.params.id);
  if (itemIndex === -1) return bad(res, 'Item not found in Recycle Bin.', 404);

  const trashed = store.db.trash[itemIndex];
  const { type, data } = trashed;

  if (type === 'project') {
    if (!store.db.projects.some((p) => p.id === data.id)) store.db.projects.push(data);
    notify.broadcast({ type: 'projects-changed' });
  } else if (type === 'task') {
    if (!store.db.tasks.some((t) => t.id === data.id)) store.db.tasks.push(data);
    notify.broadcast({ type: 'tasks-changed' });
  } else if (type === 'file') {
    if (!store.db.files.some((f) => f.id === data.id)) {
      try {
        restoreArchivedFile(data);
      } catch (err) {
        console.error('[orbdyn] file restore failed', err);
        return bad(res, 'The document file could not be restored from the archive.', 500);
      }
      store.db.files.push(data);
    }
    notify.broadcast({ type: 'files-changed' });
  } else if (type === 'user') {
    if (!store.db.users.some((u) => u.id === data.id)) store.db.users.push(data);
    notify.broadcast({ type: 'users-changed' });
  }

  store.db.trash.splice(itemIndex, 1);
  store.save();
  notify.logActivity({ actorId: req.user.id, action: 'restored from trash', subject: trashed.name });
  notify.broadcast({ type: 'trash-changed' });
  res.json({ ok: true });
});

router.delete('/trash/:id/permanent', auth.requireLogin, (req, res) => {
  if (req.user.role === 'viewer') return bad(res, 'Viewers cannot permanently delete items.', 403);
  store.db.trash = store.db.trash || [];
  const itemIndex = store.db.trash.findIndex((t) => t.id === req.params.id);
  if (itemIndex === -1) return bad(res, 'Item not found in Recycle Bin.', 404);

  const trashed = store.db.trash[itemIndex];
  if (trashed.type === 'file' && trashed.data && trashed.data.storedAs) {
    try {
      const fullPath = path.join(store.FILES_DIR, trashed.data.storedAs);
      const archivePath = path.join(store.FILES_DIR, '_removed', path.basename(trashed.data.storedAs));
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
    } catch (_) {}
  }

  store.db.trash.splice(itemIndex, 1);
  store.save();
  notify.logActivity({ actorId: req.user.id, action: 'permanently deleted', subject: trashed.name });
  notify.broadcast({ type: 'trash-changed' });
  res.json({ ok: true });
});

router.delete('/trash/empty', auth.requireLogin, (req, res) => {
  if (req.user.role === 'viewer') return bad(res, 'Viewers cannot empty the Recycle Bin.', 403);
  store.db.trash = [];
  store.save();
  notify.logActivity({ actorId: req.user.id, action: 'emptied recycle bin', subject: 'all items' });
  notify.broadcast({ type: 'trash-changed' });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Live connection for instant notifications
// ---------------------------------------------------------------------------

router.get('/stream', auth.requireLogin, (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders && res.flushHeaders();
  const off = notify.subscribe(req.user.id, res);
  const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch (_) {} }, 25000);
  req.on('close', () => { clearInterval(ping); off(); });
});

module.exports = router;
