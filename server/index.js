/*
 * index.js -- starts Orbdyn.
 *
 * PLAIN ENGLISH: This turns your computer into a small private office server.
 * It listens on a port (a numbered door) and serves the Orbdyn screens to
 * anyone who is allowed in -- you on this machine, colleagues on your office
 * network, and (if you switch on "Share online") colleagues anywhere.
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const os = require('os');

const store = require('./store');
const auth = require('./auth');
const api = require('./api');
const notify = require('./notify');
const tunnel = require('./tunnel');

const PORT = Number(process.env.ORBDYN_PORT) || 4380;

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(auth.attachUser);

// --- Sharing controls (administrators only) --------------------------------
app.get('/api/share', auth.requireLogin, (req, res) => {
  res.json({ ...tunnel.status(), lan: lanAddresses(), port: PORT });
});
app.post('/api/share/start', auth.requireAdmin, async (req, res) => {
  res.json(await tunnel.start(PORT));
});
app.post('/api/share/stop', auth.requireAdmin, (req, res) => {
  res.json(tunnel.stop());
});

app.use('/api', api);

// --- The screens -----------------------------------------------------------
app.use(express.static(path.join(__dirname, '..', 'public'), {
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// --- Friendly error handler ------------------------------------------------
app.use((err, req, res, _next) => {
  console.error('[orbdyn]', err);
  if (res.headersSent) return;
  const msg = err && err.code === 'LIMIT_FILE_SIZE'
    ? 'That file is larger than the 2 GB limit.'
    : (err && err.message) || 'Something went wrong.';
  res.status(500).json({ error: msg });
});

function lanAddresses() {
  const out = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    }
  }
  return out;
}

function start() {
  return new Promise((resolve) => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('  Orbdyn is running.');
      console.log('  On this computer:  http://localhost:' + PORT);
      for (const ip of lanAddresses()) {
        console.log('  On your network:   http://' + ip + ':' + PORT);
      }
      console.log('  Your files:        ' + store.HOME);
      console.log('');
      resolve(server);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n  Port ${PORT} is already being used. Orbdyn may already be running.`);
        console.error('  To use a different door number, set ORBDYN_PORT=4381 and start again.\n');
      } else {
        console.error(err);
      }
      process.exit(1);
    });
  });
}

// Daily backup + save on exit
setInterval(() => store.backup(), 6 * 60 * 60 * 1000);
store.backup();
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { try { tunnel.stop(); store.flush(); } catch (_) {} process.exit(0); });
}

module.exports = { app, start, PORT, lanAddresses };

if (require.main === module) start();
