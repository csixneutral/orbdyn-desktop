/*
 * auth.js -- who is allowed in, and who they are.
 *
 * PLAIN ENGLISH: Passwords are never stored as-is. We store a scrambled
 * fingerprint of the password ("hash"). Even someone who opens the data file
 * cannot read anyone's password from it.
 */

const crypto = require('crypto');
const store = require('./store');

// ---------------------------------------------------------------------------
// Password hashing (scrypt, built into Node -- no extra library needed)
// ---------------------------------------------------------------------------

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const attempt = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(attempt, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Login tokens (kept in a cookie, signed so they cannot be forged)
// ---------------------------------------------------------------------------

function sign(value) {
  const mac = crypto
    .createHmac('sha256', store.db.settings.secret)
    .update(value)
    .digest('hex');
  return `${value}.${mac}`;
}

function unsign(signed) {
  if (typeof signed !== 'string' || !signed.includes('.')) return null;
  const idx = signed.lastIndexOf('.');
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = crypto
    .createHmac('sha256', store.db.settings.secret)
    .update(value)
    .digest('hex');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return value;
}

function makeToken(userId) {
  // token = userId | issued-at ; valid for 30 days
  return sign(`${userId}|${Date.now()}`);
}

function readToken(signed) {
  const value = unsign(signed);
  if (!value) return null;
  const [userId, issued] = value.split('|');
  if (!userId || !issued) return null;
  const age = Date.now() - Number(issued);
  if (!Number.isFinite(age) || age > 30 * 24 * 60 * 60 * 1000) return null;
  return userId;
}

// ---------------------------------------------------------------------------
// Express middleware
// ---------------------------------------------------------------------------

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email || '',
    role: u.role,
    color: u.color,
    active: u.active !== false,
    createdAt: u.createdAt,
  };
}

function attachUser(req, _res, next) {
  const token = req.cookies && req.cookies.orbdyn_session;
  const userId = token ? readToken(token) : null;
  const user = userId ? store.db.users.find((u) => u.id === userId) : null;
  req.user = user && user.active !== false ? user : null;
  next();
}

function requireLogin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only an administrator can do this.' });
  }
  next();
}

const COLORS = [
  '#e0533d', '#e08a3d', '#c9a227', '#4f9d4f', '#3d9e93',
  '#3d7fe0', '#6b5fd6', '#a94fbf', '#c04f86', '#7a7f88',
];

function pickColor() {
  const used = store.db.users.map((u) => u.color);
  return COLORS.find((c) => !used.includes(c)) || COLORS[used.length % COLORS.length];
}

module.exports = {
  hashPassword, verifyPassword, makeToken, readToken,
  attachUser, requireLogin, requireAdmin, publicUser, pickColor,
};
