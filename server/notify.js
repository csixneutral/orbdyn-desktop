/*
 * notify.js -- the bell.
 *
 * PLAIN ENGLISH: When something happens (a file arrives, someone comments,
 * a task is assigned to you), we (1) save a notification so you can see it
 * later, and (2) push it live to anyone who has Orbdyn open right now.
 *
 * The live push uses "server-sent events" -- a long-lived connection the
 * browser keeps open. No extra software needed.
 */

const store = require('./store');

// Everyone currently connected: { userId, res }
const clients = new Set();

function subscribe(userId, res) {
  const client = { userId, res };
  clients.add(client);
  res.write(`event: hello\ndata: {"ok":true}\n\n`);
  return () => clients.delete(client);
}

function push(userId, payload) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const c of clients) {
    if (c.userId === userId) {
      try { c.res.write(data); } catch (_) { clients.delete(c); }
    }
  }
}

function broadcast(payload, exceptUserId) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const c of clients) {
    if (exceptUserId && c.userId === exceptUserId) continue;
    try { c.res.write(data); } catch (_) { clients.delete(c); }
  }
}

/**
 * Create notifications for a list of people.
 *  kind:  'file' | 'comment' | 'task' | 'event' | 'mention'
 *  title: short bold line
 *  body:  the detail line
 *  link:  where clicking it should take you, e.g. { view:'task', id:'abc' }
 */
function notifyUsers(userIds, { kind, title, body, link, actorId }) {
  const unique = [...new Set(userIds)].filter((uid) => uid && uid !== actorId);
  const created = [];
  for (const uid of unique) {
    const n = {
      id: store.id(),
      userId: uid,
      kind,
      title,
      body: body || '',
      link: link || null,
      actorId: actorId || null,
      read: false,
      createdAt: store.now(),
    };
    store.db.notifications.push(n);
    created.push(n);
    push(uid, { type: 'notification', notification: n });
  }
  // Keep the newest 2000 notifications so the data file stays small.
  if (store.db.notifications.length > 2000) {
    store.db.notifications = store.db.notifications.slice(-2000);
  }
  store.save();
  return created;
}

function logActivity({ actorId, action, subject, link }) {
  const entry = {
    id: store.id(),
    actorId,
    action,
    subject,
    link: link || null,
    createdAt: store.now(),
  };
  store.db.activity.push(entry);
  if (store.db.activity.length > 3000) {
    store.db.activity = store.db.activity.slice(-3000);
  }
  store.save();
  broadcast({ type: 'activity', entry });
  return entry;
}

module.exports = { subscribe, push, broadcast, notifyUsers, logActivity, clients };
