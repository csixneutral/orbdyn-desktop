/*
 * src/api.js -- Centralized API client (Supabase).
 */

import { createClient } from '@supabase/supabase-js';
import {
  supabase,
  usernameToEmail,
  resolveAuthEmailForUsername,
  normalizeEmail,
  isValidEmail,
  FILES_BUCKET,
} from '@/lib/supabase';
import {
  mapProfile,
  mapProject,
  mapTask,
  mapComment,
  mapFile,
  mapEvent,
  mapNotification,
  mapActivity,
  mapTrash,
} from '@/lib/mappers.js';
import { normalizeRole } from '@/lib/roles';

const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done', 'blocked'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const PROFILE_COLORS = ['#3d7fe0', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function edgeFunctionUnavailable(fnError) {
  const message = fnError?.message || '';
  return /Function not found|404|Failed to send a request to the Edge Function|non-2xx|502|503|504|Failed to fetch|NetworkError|fetch failed/i.test(
    message
  );
}

function edgeFunctionResponseError(data, fallback = 'Request failed') {
  if (typeof data?.error === 'string' && data.error.trim()) return data.error;
  return fallback;
}

function throwOnError(error, fallback = 'Request failed') {
  if (error) throw new Error(error.message || fallback);
}

function safeName(name) {
  return (
    String(name || 'file')
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120) || 'file'
  );
}

function decodeFilename(name) {
  try {
    const bytes = Uint8Array.from(name, (c) => c.charCodeAt(0) & 0xff);
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return name;
  }
}

function pickColor() {
  return PROFILE_COLORS[Math.floor(Math.random() * PROFILE_COLORS.length)];
}

function normalizeRoleValue(role) {
  return normalizeRole(role);
}

function assertCanCreate(profile, message = 'You do not have permission to create this.') {
  if (profile.role !== 'admin' && profile.role !== 'manager') {
    throw new Error(message);
  }
}

function assertCanUpdateTask(profile, task, payload = {}) {
  if (profile.role === 'viewer') {
    throw new Error('Viewers cannot change tasks.');
  }

  if (profile.role !== 'member') return;

  if (!isTaskAssignee(task, profile.id)) {
    throw new Error('You can only update tasks assigned to you.');
  }

  const allowed = new Set(['status', 'progress', 'order']);
  const keys = Object.keys(payload).filter((key) => payload[key] !== undefined);
  if (keys.some((key) => !allowed.has(key))) {
    throw new Error('Members can only update task status and progress.');
  }
}

function applyTaskStatusSideEffects(task, beforeStatus) {
  if (task.status === 'done') {
    task.progress = 100;
    if (!task.completedAt) task.completedAt = new Date().toISOString();
  } else {
    task.completedAt = null;
    if (task.progress === 100) task.progress = 90;
    if (task.status === 'todo' && beforeStatus !== 'todo' && task.progress === 0) task.progress = 0;
    if (task.progress > 0 && task.status === 'todo') task.status = 'in_progress';
  }
}

function memberIdsOfProject(project) {
  if (!project) return [];
  return [...new Set([project.ownerId, ...(project.memberIds || [])])].filter(Boolean);
}

function canSeeProject(user, project) {
  if (!project) return false;
  if (user.role === 'admin') return true;
  if (project.visibility === 'everyone') return true;
  return memberIdsOfProject(project).includes(user.id);
}

function visibleProjects(user, projects) {
  return projects.filter((p) => canSeeProject(user, p));
}

function isTaskAssignee(task, userId) {
  if (!task || !userId) return false;
  if (task.assigneeId === userId) return true;
  return (task.assigneeIds || []).includes(userId);
}

function storageFolder(projectId) {
  return projectId || 'general';
}

function buildStoragePath(workspaceId, projectId, fileId, filename) {
  return `${workspaceId}/${storageFolder(projectId)}/${fileId}__${safeName(filename)}`;
}

function removedStoragePath(workspaceId, storagePath) {
  const base = storagePath.split('/').pop();
  return `${workspaceId}/_removed/${base}`;
}

async function getSessionProfile() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('You need to sign in first.');

  const { data: row, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !row) throw new Error('Profile not found.');
  if (row.active === false) throw new Error('This account has been switched off.');

  const workspaceId = row.active_workspace_id || row.workspace_id;
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('user_id', row.id)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  const role = member?.role || row.role;
  const scopedRow = { ...row, workspace_id: workspaceId, role };

  return { session, profile: mapProfile(scopedRow), row: scopedRow };
}

function assertNotViewer(profile, message = 'Viewers cannot perform this action.') {
  if (profile.role === 'viewer') throw new Error(message);
}

function assertAdmin(profile) {
  if (profile.role !== 'admin') throw new Error('Administrator access required.');
}

async function getWorkspaceOrgName(workspaceId) {
  const { data } = await supabase.from('workspaces').select('org_name').eq('id', workspaceId).single();
  return data?.org_name || 'Orbdyn Workspace';
}

async function getAllUserIds(workspaceId) {
  const { data: members, error: memberError } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId);
  throwOnError(memberError);

  const ids = (members || []).map((row) => row.user_id).filter(Boolean);
  if (!ids.length) return [];

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, active')
    .in('id', ids);
  throwOnError(profileError);

  return (profiles || []).filter((row) => row.active !== false).map((row) => row.id);
}

async function projectAudience(workspaceId, projectId, projectsById) {
  const project = projectId ? projectsById.get(projectId) : null;
  if (!project) return getAllUserIds(workspaceId);
  if (project.visibility === 'everyone') return getAllUserIds(workspaceId);
  return memberIdsOfProject(project);
}

function taskAudience(task, workspaceId, projectsById, allUserIds) {
  const ids = new Set(projectAudienceSync(task.projectId, projectsById, allUserIds));
  if (task.assigneeId) ids.add(task.assigneeId);
  (task.assigneeIds || []).forEach((a) => ids.add(a));
  if (task.createdBy) ids.add(task.createdBy);
  (task.watcherIds || []).forEach((w) => ids.add(w));
  return [...ids];
}

function projectAudienceSync(projectId, projectsById, allUserIds) {
  const project = projectId ? projectsById.get(projectId) : null;
  if (!project) return allUserIds;
  if (project.visibility === 'everyone') return allUserIds;
  return memberIdsOfProject(project);
}

async function notifyUsers(workspaceId, userIds, { kind, title, body, link, actorId }) {
  const unique = [...new Set(userIds)].filter((uid) => uid && uid !== actorId);
  if (!unique.length) return;

  const rows = unique.map((userId) => ({
    workspace_id: workspaceId,
    user_id: userId,
    kind: kind || 'task',
    title,
    body: body || '',
    link: link || null,
    actor_id: actorId || null,
    read: false,
  }));

  const { error } = await supabase.from('notifications').insert(rows);
  throwOnError(error);
}

async function logActivity(workspaceId, { actorId, action, subject, link }) {
  const { error } = await supabase.from('activity_log').insert({
    workspace_id: workspaceId,
    actor_id: actorId,
    action,
    subject,
    link: link || null,
  });
  throwOnError(error);
}

async function softDeleteToTrash({
  workspaceId,
  entityType,
  entityId,
  name,
  data,
  deletedBy,
  deletedByName,
}) {
  const { error } = await supabase.from('trash_items').insert({
    id: entityId,
    workspace_id: workspaceId,
    entity_type: entityType,
    name,
    data,
    deleted_by: deletedBy,
    deleted_by_name: deletedByName,
  });
  throwOnError(error);
}

async function fetchProjectsMap(workspaceId) {
  const { data, error } = await supabase.from('projects').select('*').eq('workspace_id', workspaceId);
  throwOnError(error);
  const mapped = (data || []).map(mapProject);
  return { rows: data || [], mapped, byId: new Map(mapped.map((p) => [p.id, p])) };
}

async function getFileRow(id) {
  const { data, error } = await supabase.from('files').select('*').eq('id', id).single();
  if (error || !data) throw new Error('No such document.');
  return data;
}

async function assertCanAccessFile(profile, fileRow, projectsById) {
  if (!fileRow.project_id) return;
  const project = projectsById?.get(fileRow.project_id);
  if (project && !canSeeProject(profile, project)) {
    throw new Error('You do not have access to this document.');
  }
}

function projectToDb(snapshot, workspaceId) {
  return {
    id: snapshot.id,
    workspace_id: workspaceId,
    name: snapshot.name,
    description: snapshot.description || '',
    client: snapshot.client || '',
    colour: snapshot.colour || '#3d7fe0',
    owner_id: snapshot.ownerId || null,
    member_ids: snapshot.memberIds || [],
    visibility: snapshot.visibility === 'members' ? 'members' : 'everyone',
    status: snapshot.status || 'active',
    due_date: snapshot.dueDate || null,
    created_at: snapshot.createdAt || new Date().toISOString(),
  };
}

function taskToDb(snapshot, workspaceId) {
  const assigneeIds = snapshot.assigneeIds || (snapshot.assigneeId ? [snapshot.assigneeId] : []);
  return {
    id: snapshot.id,
    workspace_id: workspaceId,
    ref: snapshot.ref,
    title: snapshot.title,
    description: snapshot.description || '',
    project_id: snapshot.projectId || null,
    assignee_ids: assigneeIds,
    created_by: snapshot.createdBy || null,
    status: snapshot.status || 'todo',
    priority: snapshot.priority || 'normal',
    progress: snapshot.progress ?? 0,
    due_date: snapshot.dueDate || null,
    start_date: snapshot.startDate || null,
    estimate_hours: snapshot.estimateHours || 0,
    tags: snapshot.tags || [],
    watcher_ids: snapshot.watcherIds || [],
    sort_order: snapshot.order ?? 0,
    position: snapshot.position ?? 0,
    created_at: snapshot.createdAt || new Date().toISOString(),
    updated_at: snapshot.updatedAt || new Date().toISOString(),
    completed_at: snapshot.completedAt || null,
  };
}

function fileToDb(snapshot, workspaceId) {
  return {
    id: snapshot.id,
    workspace_id: workspaceId,
    name: snapshot.name,
    storage_path: snapshot.storagePath || snapshot.storedAs,
    size: snapshot.size || 0,
    mime: snapshot.mime || 'application/octet-stream',
    project_id: snapshot.projectId || null,
    task_id: snapshot.taskId || null,
    note: snapshot.note || '',
    uploaded_by: snapshot.uploadedBy || null,
    downloads: snapshot.downloads || 0,
    created_at: snapshot.createdAt || new Date().toISOString(),
  };
}

function profileToDb(snapshot, workspaceId) {
  return {
    id: snapshot.id,
    workspace_id: workspaceId,
    name: snapshot.name,
    username: snapshot.username,
    email: snapshot.email || '',
    role: snapshot.role || 'manager',
    color: snapshot.color || pickColor(),
    active: snapshot.active !== false,
    last_seen: snapshot.lastSeen || null,
    created_at: snapshot.createdAt || new Date().toISOString(),
  };
}

async function moveStorageFile(fromPath, toPath) {
  const { error } = await supabase.storage.from(FILES_BUCKET).move(fromPath, toPath);
  if (error) throw new Error('The document file could not be moved in storage.');
}

async function removeStorageFile(path) {
  if (!path) return;
  await supabase.storage.from(FILES_BUCKET).remove([path]);
}

async function resolveAvatarUrl(storagePath) {
  if (!storagePath) return null;
  const { data, error } = await supabase.storage.from(FILES_BUCKET).createSignedUrl(storagePath, 86400);
  if (error) return null;
  return data.signedUrl;
}

async function authEmailFromProfile(row) {
  if (row?.username) {
    const { data, error } = await supabase.rpc('login_email_for_username', {
      p_username: String(row.username).trim().toLowerCase(),
    });
    if (!error && data) return data;
  }
  if (row?.email && isValidEmail(row.email)) return normalizeEmail(row.email);
  return usernameToEmail(row?.username);
}

async function resolveLoginEmail(identifier) {
  const raw = String(identifier || '').trim();
  if (!raw) throw new Error('Enter username or email.');

  if (raw.includes('@')) {
    if (!isValidEmail(raw)) throw new Error('Enter a valid email address.');
    return normalizeEmail(raw);
  }

  const uname = raw.toLowerCase();
  const { data, error } = await supabase.rpc('login_email_for_username', { p_username: uname });
  if (!error && data) return data;

  return usernameToEmail(uname);
}

function formatAuthError(error, fallback = 'Request failed') {
  const message = error?.message || error?.error || String(error || fallback);
  if (/rate limit|after \d+ seconds|too many requests/i.test(message)) {
    return new Error('Too many attempts. Please wait about a minute, then try again.');
  }
  if (/email rate limit/i.test(message)) {
    return new Error(
      'Supabase email rate limit reached. Wait a few minutes, then try again. In Supabase Dashboard → Auth → Providers → Email, turn off "Confirm email".'
    );
  }
  if (/already (registered|exists)|user already/i.test(message)) {
    return new Error('An account with this email already exists. Try Sign in instead.');
  }
  if (/email not confirmed|confirm your email/i.test(message)) {
    return new Error('This account is not activated yet. Try Sign in again, or ask your administrator to confirm your email in Supabase Auth.');
  }
  return new Error(message || fallback);
}

function isEmailNotConfirmedError(error) {
  return /email not confirmed|confirm your email/i.test(error?.message || '');
}

function setupConfirmFailureMessage(result, contactEmail) {
  const rpcMessage = result?.error?.message || '';

  if (/function.*does not exist|could not find the function/i.test(rpcMessage)) {
    return 'Server setup is incomplete. Run migrations 017–019 in the Supabase SQL Editor, then try again.';
  }
  if (/already set up|profile already exists|account already/i.test(rpcMessage)) {
    return 'This account already exists. Use Sign in instead of registering again.';
  }
  if (/auth user not found/i.test(rpcMessage)) {
    return 'Account could not be found. Try again with a new email address.';
  }

  return `Could not finish account setup${rpcMessage ? `: ${rpcMessage}` : ''}. In Supabase → Auth → Users, confirm or delete ${contactEmail}, then try again.`;
}

async function tryConfirmSetupUser({ userId, email }) {
  let lastError = null;

  if (userId) {
    const { error } = await supabase.rpc('setup_confirm_auth_user', { p_user_id: userId });
    if (!error) return { ok: true };
    lastError = error;
  }

  if (email) {
    const { error } = await supabase.rpc('setup_confirm_auth_user_by_email', { p_email: email });
    if (!error) return { ok: true };
    lastError = error;
  }

  return { ok: false, error: lastError };
}

async function signInForSetup(contactEmail, password, fallback = 'Account was created but sign-in failed. Try Sign in.') {
  const credentials = {
    email: contactEmail,
    password: String(password),
  };

  let { error } = await supabase.auth.signInWithPassword(credentials);
  if (!error) return;

  if (isEmailNotConfirmedError(error)) {
    const confirmResult = await tryConfirmSetupUser({ email: contactEmail });
    if (!confirmResult.ok) {
      throw new Error(setupConfirmFailureMessage(confirmResult, contactEmail));
    }

    ({ error } = await supabase.auth.signInWithPassword(credentials));
    if (!error) return;
  }

  throw formatAuthError(error, fallback);
}

async function finishSetupSession(contactEmail, password, setupData, orgName) {
  await signInForSetup(contactEmail, password, 'Account was created but sign-in failed. Try Sign in.');

  return {
    user: setupData?.user || null,
    orgName: setupData?.orgName || orgName || 'Orbdyn Workspace',
  };
}

async function registerSetupUser({ name, username, password, contactEmail }) {
  const { data: emailExists, error: existsError } = await supabase.rpc('setup_auth_email_exists', {
    p_email: contactEmail,
  });

  if (!existsError && emailExists) {
    await signInForSetup(
      contactEmail,
      password,
      'An account with this email already exists. Sign in with your password.'
    );
    return;
  }

  const { data, error: signUpError } = await supabase.auth.signUp({
    email: contactEmail,
    password: String(password),
    options: {
      data: { name: String(name).trim(), username },
    },
  });

  if (signUpError) {
    if (/already|registered|exists/i.test(signUpError.message || '')) {
      await signInForSetup(
        contactEmail,
        password,
        'An account with this email already exists. Use Sign in with your password.'
      );
      return;
    }
    throw formatAuthError(signUpError, 'Setup failed');
  }

  if (!data?.session) {
    const credentials = {
      email: contactEmail,
      password: String(password),
    };

    const { error: immediateSignInError } = await supabase.auth.signInWithPassword(credentials);
    if (!immediateSignInError) return;

    const newUserId = data?.user?.id;
    if (!newUserId) {
      throw new Error('Account was created but sign-in could not start. Try Sign in.');
    }

    if (isEmailNotConfirmedError(immediateSignInError)) {
      const confirmResult = await tryConfirmSetupUser({ userId: newUserId, email: contactEmail });
      if (!confirmResult.ok) {
        throw new Error(setupConfirmFailureMessage(confirmResult, contactEmail));
      }
      await signInForSetup(contactEmail, password, 'Account was created but sign-in failed. Try Sign in.');
      return;
    }

    throw formatAuthError(immediateSignInError, 'Account was created but sign-in failed. Try Sign in.');
  }
}

async function legacyClientSetup({ name, username, password, orgName, contactEmail }) {
  const uname = String(username).trim().toLowerCase();
  const pwd = String(password);

  const { error: initialSignInError } = await supabase.auth.signInWithPassword({
    email: contactEmail,
    password: pwd,
  });

  if (initialSignInError) {
    const message = initialSignInError.message || '';

    if (/rate limit|after \d+ seconds|too many requests|email rate limit/i.test(message)) {
      throw formatAuthError(initialSignInError, 'Setup failed');
    }

    if (isEmailNotConfirmedError(initialSignInError)) {
      await signInForSetup(contactEmail, pwd, 'Setup failed');
    } else if (/invalid login credentials/i.test(message)) {
      await registerSetupUser({
        name,
        username: uname,
        password: pwd,
        contactEmail,
      });
    } else {
      throw formatAuthError(initialSignInError, 'Setup failed');
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Could not start a session. Try Sign in instead.');

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (existingProfile) {
    throw new Error('Your account is already set up. Sign in and use Create organization to add another team.');
  }

  const { data: setupData, error: setupError } = await supabase.rpc('setup_workspace', {
    p_org_name: orgName ? String(orgName).trim() : 'Orbdyn Workspace',
    p_name: String(name).trim(),
    p_username: uname,
    p_email: contactEmail,
  });

  if (setupError) {
    if (/already exists|Profile already/i.test(setupError.message || '')) {
      throw new Error('Your account already exists. Try Sign in instead.');
    }
    throw formatAuthError(setupError, 'Workspace setup failed');
  }

  return {
    user: setupData?.user || null,
    orgName: setupData?.orgName || orgName || 'Orbdyn Workspace',
  };
}

async function legacyCreateUser({ name, username, password, role, email }) {
  const uname = String(username).trim().toLowerCase();
  const pwd = String(password);

  if (!name?.trim() || !uname || !pwd) {
    throw new Error('Name, username and password are required.');
  }
  if (pwd.length < 6) throw new Error('Password must be at least 6 characters.');

  const authEmail = resolveAuthEmailForUsername(uname, email);
  const tempClient = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
    email: authEmail,
    password: pwd,
    options: {
      data: { name: String(name).trim(), username: uname },
    },
  });

  if (signUpError) {
    if (/already|registered|exists/i.test(signUpError.message || '')) {
      throw new Error('Username or email is already in use.');
    }
    throw formatAuthError(signUpError, 'Could not create user.');
  }

  const newUserId = signUpData?.user?.id;
  if (!newUserId) throw new Error('Account was created but user id was missing.');

  const { error: confirmError } = await supabase.rpc('admin_confirm_auth_user', {
    p_user_id: newUserId,
  });
  if (confirmError) {
    throw formatAuthError(confirmError, 'Account was created but could not be activated for sign-in.');
  }

  const { data, error } = await supabase.rpc('admin_attach_workspace_user', {
    p_user_id: newUserId,
    p_name: String(name).trim(),
    p_username: uname,
    p_email: email ? String(email).trim() : '',
    p_role: role || 'manager',
  });

  if (error) {
    throw formatAuthError(error, 'Could not add person to workspace.');
  }

  return { user: data?.user || null };
}

export const api = {
  // Auth & Setup
  getBootstrap: async () => {
    const { data: boot, error: bootError } = await supabase.rpc('public_bootstrap');
    if (bootError) {
      if (bootError.code === 'PGRST202' || /public_bootstrap/i.test(bootError.message || '')) {
        const err = new Error('Database migration has not been applied yet.');
        err.code = 'MIGRATION_REQUIRED';
        throw err;
      }
      throwOnError(bootError, 'Failed to load workspace status');
    }
    const setupNeeded = !!boot?.setupNeeded;
    let orgName = boot?.orgName || 'Orbdyn Workspace';

    let me = null;

    try {
      const { profile, row } = await getSessionProfile();
      me = profile;
      orgName = await getWorkspaceOrgName(row.workspace_id);
    } catch {
      // keep public org name when logged out
    }

    let workspaces = [];
    try {
      const { data: wsData, error: wsError } = await supabase.rpc('list_my_workspaces');
      if (!wsError && Array.isArray(wsData)) workspaces = wsData;
    } catch {
      // RPC may not exist before migration 006
    }

    return {
      setupNeeded,
      orgName,
      me,
      workspaces,
    };
  },

  listWorkspaces: async () => {
    const { data, error } = await supabase.rpc('list_my_workspaces');
    throwOnError(error, 'Could not load organizations.');
    return { workspaces: data || [] };
  },

  switchWorkspace: async (workspaceId) => {
    const { data, error } = await supabase.rpc('switch_active_workspace', {
      p_workspace_id: workspaceId,
    });
    throwOnError(error, 'Could not switch organization.');
    const { profile, row } = await getSessionProfile();
    return {
      workspaceId: data?.workspaceId || workspaceId,
      orgName: data?.orgName || (await getWorkspaceOrgName(workspaceId)),
      role: data?.role || profile.role,
      user: profile,
      row,
    };
  },

  createOrganization: async (payload) => {
    const { orgName } = payload || {};
    if (!orgName?.trim()) throw new Error('Organization name is required.');

    const { data, error } = await supabase.rpc('create_organization', {
      p_org_name: String(orgName).trim(),
    });
    throwOnError(error, 'Could not create organization.');

    const { profile } = await getSessionProfile();
    return {
      workspaceId: data.workspaceId,
      orgName: data.orgName,
      user: { ...profile, role: data.role || profile.role },
    };
  },

  setup: async (payload) => {
    const { name, username, password, orgName, email } = payload || {};
    if (!name || !username || !password) {
      throw new Error('Name, username and password are required.');
    }
    if (String(password).length < 6) throw new Error('Password must be at least 6 characters.');

    const uname = String(username).trim().toLowerCase();
    const contactEmail = email ? normalizeEmail(email) : '';
    if (!contactEmail || !isValidEmail(contactEmail)) {
      throw new Error('A valid email address is required.');
    }

    const body = {
      orgName: orgName ? String(orgName).trim() : 'Orbdyn Workspace',
      name: String(name).trim(),
      username: uname,
      password: String(password),
      email: contactEmail,
    };

    const { data: fnData, error: fnError } = await supabase.functions.invoke('setup-admin', { body });

    if (!fnError && fnData && !fnData.error) {
      return finishSetupSession(contactEmail, password, fnData, body.orgName);
    }

    if (fnData?.code === 'ALREADY_EXISTS' || fnData?.code === 'ALREADY_SETUP') {
      throw new Error(fnData.error || 'Account already exists. Try Sign in instead.');
    }

    if (edgeFunctionUnavailable(fnError)) {
      return legacyClientSetup({ ...body, contactEmail });
    }

    if (fnData?.error) throw formatAuthError({ message: fnData.error }, 'Setup failed');
    if (fnError) throw formatAuthError(fnError, 'Setup failed');

    return legacyClientSetup({ ...body, contactEmail });
  },

  login: async (payload) => {
    const { username, password } = payload || {};
    const authEmail = await resolveLoginEmail(username);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: String(password || ''),
    });

    if (error) throw formatAuthError(error, 'Wrong username, email, or password.');

    const { data: row, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !row) throw new Error('Profile not found.');
    if (row.active === false) {
      await supabase.auth.signOut();
      throw new Error('This account has been switched off.');
    }

    await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', row.id);

    return { user: mapProfile({ ...row, last_seen: new Date().toISOString() }) };
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    throwOnError(error);
    return { ok: true };
  },

  getMe: async () => {
    const { profile, row } = await getSessionProfile();
    const orgName = await getWorkspaceOrgName(row.workspace_id);
    return { user: profile, orgName };
  },

  updatePassword: async (payload) => {
    const { current, next } = payload || {};
    const { row } = await getSessionProfile();

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: await authEmailFromProfile(row),
      password: String(current || ''),
    });
    if (verifyError) throw new Error('Your current password is not correct.');
    if (String(next || '').length < 6) throw new Error('New password must be at least 6 characters.');

    const { error } = await supabase.auth.updateUser({ password: String(next) });
    throwOnError(error, 'Could not update password.');
    return { ok: true };
  },

  getAvatarUrl: async (storagePath) => resolveAvatarUrl(storagePath),

  updateProfile: async (payload = {}) => {
    const { name, avatarFile, removeAvatar } = payload;
    const { row } = await getSessionProfile();
    const updates = {};

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) throw new Error('Name is required.');
      updates.name = trimmed;
    }

    if (removeAvatar) {
      if (row.avatar_url) {
        try {
          await removeStorageFile(row.avatar_url);
        } catch {
          // Ignore missing storage objects when clearing avatar.
        }
      }
      updates.avatar_url = '';
    } else if (avatarFile) {
      if (!avatarFile.type?.startsWith('image/')) {
        throw new Error('Please choose an image file.');
      }
      if (avatarFile.size > 2 * 1024 * 1024) {
        throw new Error('Image must be 2 MB or smaller.');
      }
      const ext = (avatarFile.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
      const avatarPath = `${row.workspace_id}/avatars/${row.id}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(FILES_BUCKET).upload(avatarPath, avatarFile, {
        upsert: true,
        contentType: avatarFile.type || 'image/jpeg',
      });
      throwOnError(uploadError, 'Could not upload profile photo.');
      updates.avatar_url = avatarPath;
    }

    if (!Object.keys(updates).length) {
      const { profile } = await getSessionProfile();
      return { user: profile };
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', row.id);
    throwOnError(error, 'Could not update profile.');

    const { profile } = await getSessionProfile();
    return { user: profile };
  },

  // Users
  getUsers: async () => {
    await getSessionProfile();
    const { data, error } = await supabase.rpc('list_workspace_people');
    throwOnError(error);
    return { users: (data || []).map(mapProfile) };
  },

  createUser: async (payload) => {
    const { profile } = await getSessionProfile();
    assertAdmin(profile);

    const { name, username, password, role, email } = payload || {};
    const body = { name, username, password, role, email };

    const { data, error: fnError } = await supabase.functions.invoke('create-user', { body });

    if (!fnError && data?.user && !data?.error) {
      return { user: data.user };
    }

    if (edgeFunctionUnavailable(fnError)) {
      return legacyCreateUser(body);
    }

    if (data?.error) throw new Error(data.error);
    if (fnError) throw new Error(edgeFunctionResponseError(data, fnError.message || 'Could not create user.'));

    return legacyCreateUser(body);
  },

  updateUser: async (id, payload) => {
    const { profile } = await getSessionProfile();
    assertAdmin(profile);

    const { name, role, email, active, password } = payload || {};
    const { data, error } = await supabase.rpc('update_workspace_member', {
      p_user_id: id,
      p_name: name !== undefined ? String(name).trim() : null,
      p_email: email !== undefined ? String(email).trim() : null,
      p_role: role !== undefined ? normalizeRoleValue(role) : null,
      p_active: active !== undefined ? !!active : null,
    });
    throwOnError(error, 'Could not update person.');

    if (password) {
      throw new Error('Password changes for other users are not supported from the client.');
    }

    return { user: data?.user || null };
  },

  deleteUser: async (id) => {
    const { profile, row } = await getSessionProfile();
    assertAdmin(profile);

    if (id === profile.id) throw new Error('You cannot delete your own account.');

    const { data: members, error: listError } = await supabase.rpc('list_workspace_people');
    throwOnError(listError);
    const userItem = (members || []).find((u) => u.id === id);
    if (!userItem) throw new Error('No such person in this organization.');

    const snapshot = mapProfile(userItem);
    await softDeleteToTrash({
      workspaceId: row.workspace_id,
      entityType: 'user',
      entityId: userItem.id,
      name: userItem.name,
      data: snapshot,
      deletedBy: profile.id,
      deletedByName: profile.name,
    });

    const { error } = await supabase.rpc('remove_workspace_member', { p_user_id: id });
    throwOnError(error, 'Could not remove person from this organization.');

    return { ok: true };
  },

  // Projects
  getProjects: async () => {
    const { profile, row } = await getSessionProfile();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', row.workspace_id)
      .order('created_at', { ascending: true });
    throwOnError(error);
    const projects = visibleProjects(profile, (data || []).map(mapProject));
    return { projects };
  },

  createProject: async (payload) => {
    const { profile, row } = await getSessionProfile();
    assertCanCreate(profile, 'You do not have permission to create projects.');

    const { name, description, client, colour, memberIds, visibility, dueDate } = payload || {};
    if (!name) throw new Error('A project needs a name.');

    const insert = {
      workspace_id: row.workspace_id,
      name: String(name).trim(),
      description: (description || '').trim(),
      client: (client || '').trim(),
      colour: colour || '#3d7fe0',
      owner_id: profile.id,
      member_ids: Array.isArray(memberIds) ? memberIds.filter(Boolean) : [],
      visibility: visibility === 'members' ? 'members' : 'everyone',
      status: 'active',
      due_date: dueDate || null,
    };

    const { data, error } = await supabase.from('projects').insert(insert).select('*').single();
    throwOnError(error);
    const project = mapProject(data);

    await logActivity(row.workspace_id, {
      actorId: profile.id,
      action: 'created project',
      subject: project.name,
      link: { view: 'project', id: project.id },
    });

    const audience = await projectAudience(row.workspace_id, project.id, new Map([[project.id, project]]));
    await notifyUsers(row.workspace_id, audience, {
      kind: 'task',
      actorId: profile.id,
      title: `New project: ${project.name}`,
      body: `${profile.name} created a project you are part of.`,
      link: { view: 'project', id: project.id },
    });

    return { project };
  },

  updateProject: async (id, payload) => {
    const { profile, row } = await getSessionProfile();

    const { data: existing, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', row.workspace_id)
      .single();
    if (fetchError || !existing) throw new Error('No such project.');

    const project = mapProject(existing);
    if (profile.role !== 'admin' && project.ownerId !== profile.id) {
      throw new Error('Only the project owner or an administrator can change this project.');
    }

    const updates = {};
    const fieldMap = {
      name: 'name',
      description: 'description',
      client: 'client',
      colour: 'colour',
      status: 'status',
      dueDate: 'due_date',
      visibility: 'visibility',
    };
    for (const [key, col] of Object.entries(fieldMap)) {
      if (payload[key] !== undefined) updates[col] = payload[key];
    }
    if (Array.isArray(payload.memberIds)) updates.member_ids = payload.memberIds.filter(Boolean);

    const { data, error } = await supabase.from('projects').update(updates).eq('id', id).select('*').single();
    throwOnError(error);
    return { project: mapProject(data) };
  },

  deleteProject: async (id) => {
    const { profile, row } = await getSessionProfile();

    const { data: existing, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', row.workspace_id)
      .single();
    if (fetchError || !existing) throw new Error('No such project.');

    const project = mapProject(existing);
    if (profile.role !== 'admin' && project.ownerId !== profile.id) {
      throw new Error('Only the project owner or an administrator can delete this project.');
    }

    await softDeleteToTrash({
      workspaceId: row.workspace_id,
      entityType: 'project',
      entityId: project.id,
      name: project.name,
      data: project,
      deletedBy: profile.id,
      deletedByName: profile.name,
    });

    const { error } = await supabase.from('projects').delete().eq('id', id);
    throwOnError(error);

    await logActivity(row.workspace_id, {
      actorId: profile.id,
      action: 'moved project to trash',
      subject: project.name,
    });

    return { ok: true };
  },

  // Tasks
  getTasks: async (params = {}) => {
    const { profile, row } = await getSessionProfile();
    const { mapped: projects, byId } = await fetchProjectsMap(row.workspace_id);
    const allowed = new Set(visibleProjects(profile, projects).map((p) => p.id));

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', row.workspace_id)
      .order('sort_order', { ascending: true });
    throwOnError(error);

    let tasks = (data || []).map(mapTask).filter((t) => !t.projectId || allowed.has(t.projectId));

    const { projectId, assigneeId, status } = params;
    if (projectId) tasks = tasks.filter((t) => t.projectId === projectId);
    if (assigneeId) tasks = tasks.filter((t) => t.assigneeId === assigneeId);
    if (status) tasks = tasks.filter((t) => t.status === status);

    return { tasks };
  },

  createTask: async (payload) => {
    const { profile, row } = await getSessionProfile();
    assertCanCreate(profile, 'You do not have permission to create tasks.');

    const {
      title,
      description,
      projectId,
      assigneeId,
      assigneeIds: rawAssigneeIds,
      status,
      priority,
      dueDate,
      startDate,
      progress,
      estimateHours,
      tags,
    } = payload || {};

    if (!title) throw new Error('A task needs a title.');

    if (projectId) {
      const { data: project, error } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('workspace_id', row.workspace_id)
        .maybeSingle();
      if (error || !project) throw new Error('No such project.');
    }

    const assigneeIds = Array.isArray(rawAssigneeIds)
      ? rawAssigneeIds.filter(Boolean)
      : assigneeId
        ? [assigneeId]
        : [];

    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', row.workspace_id);

    const now = new Date().toISOString();
    const taskStatus = TASK_STATUSES.includes(status) ? status : 'todo';
    let taskProgress = Math.max(0, Math.min(100, Number(progress) || 0));
    let completedAt = null;
    if (taskStatus === 'done') {
      taskProgress = 100;
      completedAt = now;
    }

    const insert = {
      workspace_id: row.workspace_id,
      ref: `ORB-${(count || 0) + 1}`,
      title: String(title).trim(),
      description: (description || '').trim(),
      project_id: projectId || null,
      assignee_ids: assigneeIds,
      created_by: profile.id,
      status: taskStatus,
      priority: PRIORITIES.includes(priority) ? priority : 'normal',
      progress: taskProgress,
      due_date: dueDate || null,
      start_date: startDate || null,
      estimate_hours: Number(estimateHours) || 0,
      tags: Array.isArray(tags) ? tags : [],
      watcher_ids: [],
      sort_order: 0,
      position: 0,
      created_at: now,
      updated_at: now,
      completed_at: completedAt,
    };

    const { data, error } = await supabase.from('tasks').insert(insert).select('*').single();
    throwOnError(error);
    const task = mapTask(data);

    await logActivity(row.workspace_id, {
      actorId: profile.id,
      action: 'created task',
      subject: task.title,
      link: { view: 'task', id: task.id },
    });

    if (task.assigneeIds.length > 0) {
      await notifyUsers(row.workspace_id, task.assigneeIds, {
        kind: 'task',
        actorId: profile.id,
        title: 'Work awarded to you',
        body: `${profile.name} assigned "${task.title}" to you.`,
        link: { view: 'task', id: task.id },
      });
    }

    return { task };
  },

  updateTask: async (id, payload) => {
    const { profile, row } = await getSessionProfile();
    assertNotViewer(profile, 'Viewers cannot change tasks.');

    const { data: existing, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', row.workspace_id)
      .single();
    if (fetchError || !existing) throw new Error('No such task.');

    const before = mapTask(existing);
    assertCanUpdateTask(profile, before, payload);
    const updates = {};
    const now = new Date().toISOString();

    for (const key of ['title', 'description', 'projectId', 'dueDate', 'startDate', 'estimateHours', 'position']) {
      if (payload[key] !== undefined) {
        const map = {
          projectId: 'project_id',
          dueDate: 'due_date',
          startDate: 'start_date',
          estimateHours: 'estimate_hours',
        };
        updates[map[key] || key] = payload[key];
      }
    }

    if (payload.order !== undefined) updates.sort_order = Number(payload.order) || 0;
    if (payload.status !== undefined && TASK_STATUSES.includes(payload.status)) updates.status = payload.status;
    if (payload.priority !== undefined && PRIORITIES.includes(payload.priority)) updates.priority = payload.priority;

    if (payload.assigneeIds !== undefined) {
      updates.assignee_ids = Array.isArray(payload.assigneeIds) ? payload.assigneeIds.filter(Boolean) : [];
    } else if (payload.assigneeId !== undefined) {
      updates.assignee_ids = payload.assigneeId ? [payload.assigneeId] : [];
    }

    if (payload.progress !== undefined) {
      updates.progress = Math.max(0, Math.min(100, Number(payload.progress) || 0));
    }
    if (Array.isArray(payload.tags)) updates.tags = payload.tags;

    updates.updated_at = now;

    const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select('*').single();
    throwOnError(error);

    const task = mapTask(data);
    applyTaskStatusSideEffects(task, before.status);

    const sideEffectUpdates = {
      progress: task.progress,
      status: task.status,
      completed_at: task.completedAt,
      updated_at: now,
    };

    const { data: finalRow, error: sideError } = await supabase
      .from('tasks')
      .update(sideEffectUpdates)
      .eq('id', id)
      .select('*')
      .single();
    throwOnError(sideError);
    const finalTask = mapTask(finalRow);

    const newAssignees = (finalTask.assigneeIds || []).filter((uid) => !(before.assigneeIds || []).includes(uid));
    if (newAssignees.length > 0) {
      await notifyUsers(row.workspace_id, newAssignees, {
        kind: 'task',
        actorId: profile.id,
        title: 'Work awarded to you',
        body: `${profile.name} assigned "${finalTask.title}" to you.`,
        link: { view: 'task', id: finalTask.id },
      });
    }

    const { byId } = await fetchProjectsMap(row.workspace_id);
    const allUserIds = await getAllUserIds(row.workspace_id);

    if (before.status !== finalTask.status) {
      await notifyUsers(row.workspace_id, taskAudience(finalTask, row.workspace_id, byId, allUserIds), {
        kind: 'task',
        actorId: profile.id,
        title: `"${finalTask.title}" is now ${finalTask.status.replace('_', ' ')}`,
        body: `Updated by ${profile.name}.`,
        link: { view: 'task', id: finalTask.id },
      });
      await logActivity(row.workspace_id, {
        actorId: profile.id,
        action: `moved to ${finalTask.status.replace('_', ' ')}`,
        subject: finalTask.title,
        link: { view: 'task', id: finalTask.id },
      });
    } else if (before.progress !== finalTask.progress) {
      await logActivity(row.workspace_id, {
        actorId: profile.id,
        action: `set progress ${finalTask.progress}% on`,
        subject: finalTask.title,
        link: { view: 'task', id: finalTask.id },
      });
    }

    return { task: finalTask };
  },

  reorderTasks: async (tasks) => {
    const { profile, row } = await getSessionProfile();
    assertNotViewer(profile, 'Viewers cannot reorder tasks.');

    if (!Array.isArray(tasks)) throw new Error('tasks array required.');

    const now = new Date().toISOString();

    for (const item of tasks) {
      const { data: existing, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', item.id)
        .eq('workspace_id', row.workspace_id)
        .maybeSingle();
      if (error || !existing) continue;

      const beforeTask = mapTask(existing);
      if (
        profile.role === 'member' &&
        item.status &&
        item.status !== beforeTask.status &&
        !isTaskAssignee(beforeTask, profile.id)
      ) {
        throw new Error('You can only move tasks assigned to you.');
      }

      const beforeStatus = existing.status;
      const updates = { updated_at: now };
      if (item.status && TASK_STATUSES.includes(item.status)) updates.status = item.status;
      if (item.order !== undefined) updates.sort_order = Number(item.order) || 0;

      const { data: updated, error: updateError } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', item.id)
        .select('*')
        .single();
      if (updateError || !updated) continue;

      if (beforeStatus !== updated.status) {
        const task = mapTask(updated);
        applyTaskStatusSideEffects(task, beforeStatus);
        await supabase
          .from('tasks')
          .update({
            progress: task.progress,
            status: task.status,
            completed_at: task.completedAt,
            updated_at: now,
          })
          .eq('id', item.id);
      }
    }

    return { ok: true };
  },

  deleteTask: async (id) => {
    const { profile, row } = await getSessionProfile();

    const { data: existing, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', row.workspace_id)
      .single();
    if (fetchError || !existing) throw new Error('No such task.');

    const task = mapTask(existing);
    if (profile.role !== 'admin' && task.createdBy !== profile.id) {
      throw new Error('Only the person who created this item, or an administrator, can delete it.');
    }

    await softDeleteToTrash({
      workspaceId: row.workspace_id,
      entityType: 'task',
      entityId: task.id,
      name: task.title,
      data: task,
      deletedBy: profile.id,
      deletedByName: profile.name,
    });

    const { error } = await supabase.from('tasks').delete().eq('id', id);
    throwOnError(error);

    await logActivity(row.workspace_id, {
      actorId: profile.id,
      action: 'moved task to trash',
      subject: task.title,
    });

    return { ok: true };
  },

  // Comments
  getComments: async (params = {}) => {
    const { row } = await getSessionProfile();
    const { taskId, projectId, fileId } = params;

    let query = supabase.from('comments').select('*').eq('workspace_id', row.workspace_id);

    if (taskId) {
      query = query.eq('task_id', taskId).order('created_at', { ascending: true });
    } else if (projectId) {
      query = query.eq('project_id', projectId).is('task_id', null).is('file_id', null).order('created_at', { ascending: true });
    } else if (fileId) {
      query = query.eq('file_id', fileId).order('created_at', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false }).limit(100);
    }

    const { data, error } = await query;
    throwOnError(error);

    return { comments: (data || []).map(mapComment) };
  },

  createComment: async (payload) => {
    const { profile, row } = await getSessionProfile();
    if (profile.role === 'viewer') {
      throw new Error('Viewers cannot post messages.');
    }
    const { taskId, projectId, fileId, body } = payload || {};
    if (!body || !String(body).trim()) throw new Error('Write something first.');

    const insert = {
      workspace_id: row.workspace_id,
      task_id: taskId || null,
      project_id: projectId || null,
      file_id: fileId || null,
      author_id: profile.id,
      body: String(body).trim().slice(0, 5000),
    };

    const { data, error } = await supabase.from('comments').insert(insert).select('*').single();
    throwOnError(error);
    const comment = mapComment(data);

    let audience = [];
    let where = 'the workspace';
    let link = { view: 'activity' };
    const { byId } = await fetchProjectsMap(row.workspace_id);
    const allUserIds = await getAllUserIds(row.workspace_id);

    if (taskId) {
      const { data: taskRow } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
      if (taskRow) {
        const task = mapTask(taskRow);
        audience = taskAudience(task, row.workspace_id, byId, allUserIds);
        where = task.title;
        link = { view: 'task', id: task.id };

        const watcherIds = task.watcherIds || [];
        if (!watcherIds.includes(profile.id)) {
          await supabase
            .from('tasks')
            .update({ watcher_ids: [...watcherIds, profile.id] })
            .eq('id', taskId);
        }
      }
    } else if (fileId) {
      const { data: fileRow } = await supabase.from('files').select('*').eq('id', fileId).maybeSingle();
      if (fileRow) {
        const file = mapFile(fileRow);
        audience = [...(await projectAudience(row.workspace_id, file.projectId, byId)), file.uploadedBy].filter(Boolean);
        where = file.name;
        link = { view: 'files', id: file.id };
      }
    } else if (projectId) {
      audience = await projectAudience(row.workspace_id, projectId, byId);
      const project = byId.get(projectId);
      where = project ? project.name : where;
      link = { view: 'project', id: projectId };
    } else {
      audience = allUserIds;
    }

    await notifyUsers(row.workspace_id, audience, {
      kind: 'comment',
      actorId: profile.id,
      title: `Message from ${profile.name}`,
      body: `${comment.body.slice(0, 140)}  —  on ${where}`,
      link,
    });

    return { comment };
  },

  // Files / Documents
  getFiles: async (params = {}) => {
    const { profile, row } = await getSessionProfile();
    const { mapped: projects } = await fetchProjectsMap(row.workspace_id);
    const allowed = new Set(visibleProjects(profile, projects).map((p) => p.id));

    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('workspace_id', row.workspace_id)
      .order('created_at', { ascending: false });
    throwOnError(error);

    let files = (data || []).map(mapFile).filter((f) => !f.projectId || allowed.has(f.projectId));

    const { projectId, taskId } = params;
    if (projectId) files = files.filter((f) => f.projectId === projectId);
    if (taskId) files = files.filter((f) => f.taskId === taskId);

    return { files };
  },

  uploadFiles: async (formData) => {
    const { profile, row } = await getSessionProfile();
    assertCanCreate(profile, 'You do not have permission to upload documents.');

    const workspaceId = row.workspace_id;
    const projectId = formData.get('projectId') || null;
    const taskId = formData.get('taskId') || null;
    const note = (formData.get('note') || '').trim();
    const rawFiles = formData.getAll('files');

    if (!rawFiles.length) throw new Error('No files selected.');

    const uploaded = [];

    for (const file of rawFiles) {
      const original = decodeFilename(file.name);
      const fileId = crypto.randomUUID();
      const storagePath = buildStoragePath(workspaceId, projectId, fileId, original);

      const { error: uploadError } = await supabase.storage.from(FILES_BUCKET).upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
      throwOnError(uploadError, 'File upload failed');

      const insert = {
        id: fileId,
        workspace_id: workspaceId,
        name: safeName(original),
        storage_path: storagePath,
        size: file.size,
        mime: file.type || 'application/octet-stream',
        project_id: projectId,
        task_id: taskId,
        note,
        uploaded_by: profile.id,
        downloads: 0,
      };

      const { data, error } = await supabase.from('files').insert(insert).select('*').single();
      throwOnError(error);
      uploaded.push(mapFile(data));
    }

    if (uploaded.length) {
      const first = uploaded[0];
      const { byId } = await fetchProjectsMap(workspaceId);
      const audience = first.projectId
        ? await projectAudience(workspaceId, first.projectId, byId)
        : await getAllUserIds(workspaceId);

      await notifyUsers(workspaceId, audience, {
        kind: 'file',
        actorId: profile.id,
        title: uploaded.length === 1 ? `New document: ${first.name}` : `${uploaded.length} new documents`,
        body: `Shared by ${profile.name}.`,
        link: { view: 'files', id: first.id },
      });

      await logActivity(workspaceId, {
        actorId: profile.id,
        action: 'shared',
        subject: uploaded.map((u) => u.name).join(', '),
        link: { view: 'files', id: first.id },
      });
    }

    return { files: uploaded };
  },

  deleteFile: async (id) => {
    const { profile, row } = await getSessionProfile();

    const fileRow = await getFileRow(id);
    const snapshot = mapFile(fileRow);

    if (profile.role !== 'admin' && snapshot.uploadedBy !== profile.id) {
      throw new Error('Only the person who shared it, or an administrator, can remove it.');
    }

    try {
      const archivePath = removedStoragePath(row.workspace_id, fileRow.storage_path);
      await moveStorageFile(fileRow.storage_path, archivePath);
    } catch (err) {
      console.error('[orbdyn] archive failed', err);
    }

    await softDeleteToTrash({
      workspaceId: row.workspace_id,
      entityType: 'file',
      entityId: snapshot.id,
      name: snapshot.name,
      data: snapshot,
      deletedBy: profile.id,
      deletedByName: profile.name,
    });

    const { error } = await supabase.from('files').delete().eq('id', id);
    throwOnError(error);

    await logActivity(row.workspace_id, {
      actorId: profile.id,
      action: 'moved document to trash',
      subject: snapshot.name,
    });

    return { ok: true };
  },

  getFileDownloadUrl: async (id) => {
    const { profile, row } = await getSessionProfile();
    const fileRow = await getFileRow(id);
    const { byId } = await fetchProjectsMap(row.workspace_id);
    await assertCanAccessFile(profile, fileRow, byId);

    const { data, error } = await supabase.storage
      .from(FILES_BUCKET)
      .createSignedUrl(fileRow.storage_path, 3600, { download: fileRow.name });

    if (error || !data?.signedUrl) {
      throw new Error('The document is no longer available.');
    }

    await supabase
      .from('files')
      .update({ downloads: (fileRow.downloads || 0) + 1 })
      .eq('id', id);

    return data.signedUrl;
  },

  getFileViewUrl: async (id) => {
    const { profile, row } = await getSessionProfile();
    const fileRow = await getFileRow(id);
    const { byId } = await fetchProjectsMap(row.workspace_id);
    await assertCanAccessFile(profile, fileRow, byId);

    const { data, error } = await supabase.storage
      .from(FILES_BUCKET)
      .createSignedUrl(fileRow.storage_path, 3600);

    if (error || !data?.signedUrl) throw new Error('Missing file.');
    return data.signedUrl;
  },

  // Calendar Events
  getEvents: async () => {
    const { row } = await getSessionProfile();
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('workspace_id', row.workspace_id)
      .order('date', { ascending: true });
    throwOnError(error);
    return { events: (data || []).map(mapEvent) };
  },

  createEvent: async (payload) => {
    const { profile, row } = await getSessionProfile();
    assertCanCreate(profile, 'You do not have permission to create events.');
    const { title, date, endDate, startTime, endTime, allDay, location, notes, projectId, attendeeIds, kind } =
      payload || {};
    if (!title || !date) throw new Error('An event needs a title and a date.');

    const insert = {
      workspace_id: row.workspace_id,
      title: String(title).trim(),
      date,
      end_date: endDate || date,
      start_time: startTime || null,
      end_time: endTime || null,
      all_day: !!allDay,
      location: (location || '').trim(),
      notes: (notes || '').trim(),
      kind: kind || 'meeting',
      project_id: projectId || null,
      attendee_ids: Array.isArray(attendeeIds) ? attendeeIds : [],
      created_by: profile.id,
    };

    const { data, error } = await supabase.from('events').insert(insert).select('*').single();
    throwOnError(error);
    const event = mapEvent(data);

    await notifyUsers(row.workspace_id, event.attendeeIds, {
      kind: 'event',
      actorId: profile.id,
      title: `Invitation: ${event.title}`,
      body: `${event.date}${event.startTime ? ' at ' + event.startTime : ''} — added by ${profile.name}.`,
      link: { view: 'calendar', id: event.id },
    });

    return { event };
  },

  updateEvent: async (id, payload) => {
    const { profile, row } = await getSessionProfile();

    const { data: existing, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', row.workspace_id)
      .single();
    if (fetchError || !existing) throw new Error('No such event.');

    const event = mapEvent(existing);
    if (profile.role !== 'admin' && event.createdBy !== profile.id) {
      throw new Error('Only the person who created this event, or an administrator, can change it.');
    }

    const updates = {};
    for (const [key, col] of [
      ['title', 'title'],
      ['date', 'date'],
      ['endDate', 'end_date'],
      ['startTime', 'start_time'],
      ['endTime', 'end_time'],
      ['allDay', 'all_day'],
      ['location', 'location'],
      ['notes', 'notes'],
      ['projectId', 'project_id'],
      ['kind', 'kind'],
    ]) {
      if (payload[key] !== undefined) updates[col] = payload[key];
    }
    if (Array.isArray(payload.attendeeIds)) updates.attendee_ids = payload.attendeeIds;

    const { data, error } = await supabase.from('events').update(updates).eq('id', id).select('*').single();
    throwOnError(error);
    return { event: mapEvent(data) };
  },

  deleteEvent: async (id) => {
    const { profile, row } = await getSessionProfile();

    const { data: existing, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', row.workspace_id)
      .single();
    if (fetchError || !existing) throw new Error('No such event.');

    const event = mapEvent(existing);
    if (profile.role !== 'admin' && event.createdBy !== profile.id) {
      throw new Error('Only the person who created this event, or an administrator, can delete it.');
    }

    const { error } = await supabase.from('events').delete().eq('id', id);
    throwOnError(error);
    return { ok: true };
  },

  // Recycle Bin (Trash)
  getTrash: async () => {
    const { row } = await getSessionProfile();
    const { data, error } = await supabase
      .from('trash_items')
      .select('*')
      .eq('workspace_id', row.workspace_id)
      .order('deleted_at', { ascending: false });
    throwOnError(error);
    return { trash: (data || []).map(mapTrash) };
  },

  restoreTrash: async (id) => {
    const { profile, row } = await getSessionProfile();
    assertCanCreate(profile, 'You do not have permission to restore items from the Recycle Bin.');

    const { data: trashed, error: fetchError } = await supabase
      .from('trash_items')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', row.workspace_id)
      .single();
    if (fetchError || !trashed) throw new Error('Item not found in Recycle Bin.');

    const { entity_type: type, data: snapshot } = trashed;

    if (type === 'project') {
      const { data: exists } = await supabase.from('projects').select('id').eq('id', id).maybeSingle();
      if (!exists) {
        const { error } = await supabase.from('projects').insert(projectToDb(snapshot, row.workspace_id));
        throwOnError(error);
      }
    } else if (type === 'task') {
      const { data: exists } = await supabase.from('tasks').select('id').eq('id', id).maybeSingle();
      if (!exists) {
        const { error } = await supabase.from('tasks').insert(taskToDb(snapshot, row.workspace_id));
        throwOnError(error);
      }
    } else if (type === 'file') {
      const { data: exists } = await supabase.from('files').select('id').eq('id', id).maybeSingle();
      if (!exists) {
        const storagePath = snapshot.storagePath || snapshot.storedAs;
        const archivePath = removedStoragePath(row.workspace_id, storagePath);
        try {
          await moveStorageFile(archivePath, storagePath);
        } catch (err) {
          console.error('[orbdyn] file restore failed', err);
          throw new Error('The document file could not be restored from the archive.');
        }
        const { error } = await supabase.from('files').insert(fileToDb(snapshot, row.workspace_id));
        throwOnError(error);
      }
    } else if (type === 'user') {
      const { data: exists } = await supabase.from('profiles').select('id').eq('id', id).maybeSingle();
      if (!exists) {
        const { error } = await supabase.from('profiles').insert(profileToDb(snapshot, row.workspace_id));
        throwOnError(error);
      }
    }

    const { error: deleteError } = await supabase.from('trash_items').delete().eq('id', id);
    throwOnError(deleteError);

    await logActivity(row.workspace_id, {
      actorId: profile.id,
      action: 'restored from trash',
      subject: trashed.name,
    });

    return { ok: true };
  },

  deleteTrashPermanent: async (id) => {
    const { profile, row } = await getSessionProfile();
    assertCanCreate(profile, 'You do not have permission to permanently delete items.');

    const { data: trashed, error: fetchError } = await supabase
      .from('trash_items')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', row.workspace_id)
      .single();
    if (fetchError || !trashed) throw new Error('Item not found in Recycle Bin.');

    if (trashed.entity_type === 'file' && trashed.data) {
      const storagePath = trashed.data.storagePath || trashed.data.storedAs;
      if (storagePath) {
        await removeStorageFile(storagePath);
        await removeStorageFile(removedStoragePath(row.workspace_id, storagePath));
      }
    }

    const { error } = await supabase.from('trash_items').delete().eq('id', id);
    throwOnError(error);

    await logActivity(row.workspace_id, {
      actorId: profile.id,
      action: 'permanently deleted',
      subject: trashed.name,
    });

    return { ok: true };
  },

  emptyTrash: async () => {
    const { profile, row } = await getSessionProfile();
    assertCanCreate(profile, 'You do not have permission to empty the Recycle Bin.');

    const { data: items, error: fetchError } = await supabase
      .from('trash_items')
      .select('*')
      .eq('workspace_id', row.workspace_id);
    throwOnError(fetchError);

    for (const trashed of items || []) {
      if (trashed.entity_type === 'file' && trashed.data) {
        const storagePath = trashed.data.storagePath || trashed.data.storedAs;
        if (storagePath) {
          await removeStorageFile(storagePath);
          await removeStorageFile(removedStoragePath(row.workspace_id, storagePath));
        }
      }
    }

    const { error } = await supabase.from('trash_items').delete().eq('workspace_id', row.workspace_id);
    throwOnError(error);

    await logActivity(row.workspace_id, {
      actorId: profile.id,
      action: 'emptied recycle bin',
      subject: 'all items',
    });

    return { ok: true };
  },

  // Notifications & Dashboard
  getNotifications: async () => {
    const { profile } = await getSessionProfile();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(200);
    throwOnError(error);

    const notifications = (data || []).map(mapNotification);
    return {
      notifications,
      unread: notifications.filter((n) => !n.read).length,
    };
  },

  markNotificationsRead: async (ids) => {
    const { profile } = await getSessionProfile();
    const idSet = Array.isArray(ids) ? new Set(ids) : null;

    let query = supabase.from('notifications').update({ read: true }).eq('user_id', profile.id);
    if (idSet && idSet.size) {
      query = query.in('id', [...idSet]);
    }

    const { error } = await query;
    throwOnError(error);
    return { ok: true };
  },

  getActivity: async () => {
    const { row } = await getSessionProfile();
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .eq('workspace_id', row.workspace_id)
      .order('created_at', { ascending: false })
      .limit(150);
    throwOnError(error);
    return { activity: (data || []).map(mapActivity) };
  },

  getDashboard: async () => {
    const { profile, row } = await getSessionProfile();

    const [{ mapped: projects }, { data: taskRows }, { data: fileRows }, peopleRes] = await Promise.all([
      fetchProjectsMap(row.workspace_id),
      supabase.from('tasks').select('*').eq('workspace_id', row.workspace_id),
      supabase.from('files').select('*').eq('workspace_id', row.workspace_id),
      supabase.rpc('list_workspace_people'),
    ]);
    throwOnError(peopleRes.error);

    const visible = visibleProjects(profile, projects);
    const allowed = new Set(visible.map((p) => p.id));
    const tasks = (taskRows || []).map(mapTask).filter((t) => !t.projectId || allowed.has(t.projectId));
    const files = (fileRows || []).map(mapFile).filter((f) => !f.projectId || allowed.has(f.projectId));
    const users = (peopleRes.data || []).map(mapProfile).filter((u) => u && u.active !== false);
    const today = new Date().toISOString().slice(0, 10);

    const byStatus = {};
    for (const s of TASK_STATUSES) byStatus[s] = tasks.filter((t) => t.status === s).length;

    const perProject = visible.map((p) => {
      const list = tasks.filter((t) => t.projectId === p.id);
      const done = list.filter((t) => t.status === 'done').length;
      const avg = list.length
        ? Math.round(list.reduce((a, t) => a + (t.status === 'done' ? 100 : t.progress), 0) / list.length)
        : 0;
      return {
        id: p.id,
        name: p.name,
        colour: p.colour,
        total: list.length,
        done,
        progress: avg,
        dueDate: p.dueDate,
        status: p.status,
      };
    });

    const perPerson = users.map((u) => {
      const list = tasks.filter((t) => isTaskAssignee(t, u.id));
      return {
        id: u.id,
        name: u.name,
        color: u.color,
        open: list.filter((t) => t.status !== 'done').length,
        done: list.filter((t) => t.status === 'done').length,
        overdue: list.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < today).length,
      };
    });

    return {
      totals: {
        projects: visible.length,
        tasks: tasks.length,
        done: byStatus.done,
        overdue: tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < today).length,
        dueToday: tasks.filter((t) => t.status !== 'done' && t.dueDate === today).length,
        mine: tasks.filter((t) => isTaskAssignee(t, profile.id) && t.status !== 'done').length,
        documents: files.length,
      },
      byStatus,
      perProject,
      perPerson,
      dataFolder: null,
    };
  },

  // Share controls
  getShareStatus: async () => ({
    online: true,
    url: null,
    lan: [],
    port: null,
    cloud: true,
  }),

  startShare: async () => ({
    error: 'Online sharing is always available in cloud mode.',
  }),

  stopShare: async () => ({ ok: true }),
};
