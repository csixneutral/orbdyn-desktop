/*
 * store.js  --  Orbdyn's "database".
 *
 * PLAIN ENGLISH: This file is where all the information lives. Instead of
 * needing a big database program installed, Orbdyn keeps everything in ONE
 * text file called `orbdyn-data.json` inside your Orbdyn folder, and keeps
 * your shared documents in a `files` sub-folder next to it.
 *
 * Nothing is ever sent to a cloud service. If you copy that folder to a USB
 * stick, you have copied your entire Orbdyn workspace.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ---------------------------------------------------------------------------
// Where things are stored on this computer
// ---------------------------------------------------------------------------

// You can override the location with the ORBDYN_HOME environment variable.
// Otherwise it is a folder called "Orbdyn" inside your Documents folder.
function defaultHome() {
  if (process.env.ORBDYN_HOME) return process.env.ORBDYN_HOME;
  const docs = path.join(os.homedir(), 'Documents');
  const base = fs.existsSync(docs) ? docs : os.homedir();
  return path.join(base, 'Orbdyn');
}

const HOME = defaultHome();
const FILES_DIR = path.join(HOME, 'files');
const DB_FILE = path.join(HOME, 'orbdyn-data.json');
const BACKUP_DIR = path.join(HOME, 'backups');

fs.mkdirSync(FILES_DIR, { recursive: true });
fs.mkdirSync(BACKUP_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// The shape of a brand new, empty workspace
// ---------------------------------------------------------------------------

function emptyDb() {
  return {
    version: 1,
    settings: {
      orgName: 'Orbdyn Workspace',
      createdAt: new Date().toISOString(),
      secret: require('crypto').randomBytes(32).toString('hex'),
    },
    users: [],
    projects: [],
    tasks: [],
    comments: [],
    files: [],
    events: [],
    notifications: [],
    activity: [],
    trash: [],
  };
}

// ---------------------------------------------------------------------------
// Load / save
// ---------------------------------------------------------------------------

let db;

function load() {
  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (err) {
      // The file got damaged. Keep a copy of the damaged one and start fresh
      // rather than losing the ability to launch.
      const broken = path.join(BACKUP_DIR, `damaged-${Date.now()}.json`);
      try { fs.copyFileSync(DB_FILE, broken); } catch (_) {}
      console.error('[orbdyn] data file was unreadable; a copy was kept at', broken);
      db = emptyDb();
    }
  } else {
    db = emptyDb();
  }
  // Make sure every collection exists even if the file came from an older version.
  const blank = emptyDb();
  for (const key of Object.keys(blank)) {
    if (db[key] === undefined) db[key] = blank[key];
  }
  if (!db.settings.secret) db.settings.secret = blank.settings.secret;
  save();
  return db;
}

let saveTimer = null;
let dirty = false;

// Writing is done "atomically": we write to a temporary file first and then
// rename it. That way a power cut can never leave you with half a data file.
function writeNow() {
  dirty = false;
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function save() {
  dirty = true;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (dirty) {
      try { writeNow(); } catch (err) { console.error('[orbdyn] save failed', err); }
    }
  }, 120);
}

function flush() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (dirty) writeNow();
}

// A dated backup copy, kept for 30 days. Cheap insurance.
function backup() {
  try {
    flush();
    if (!fs.existsSync(DB_FILE)) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const target = path.join(BACKUP_DIR, `orbdyn-data-${stamp}.json`);
    if (!fs.existsSync(target)) fs.copyFileSync(DB_FILE, target);
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const name of fs.readdirSync(BACKUP_DIR)) {
      const p = path.join(BACKUP_DIR, name);
      if (fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p);
    }
  } catch (err) {
    console.error('[orbdyn] backup failed', err);
  }
}

// ---------------------------------------------------------------------------
// Small helpers used all over the app
// ---------------------------------------------------------------------------

function id() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

function now() {
  return new Date().toISOString();
}

load();

module.exports = {
  get db() { return db; },
  save, flush, backup, id, now, load,
  HOME, FILES_DIR, DB_FILE, BACKUP_DIR,
};
