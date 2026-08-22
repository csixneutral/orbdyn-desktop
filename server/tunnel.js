/*
 * tunnel.js -- "Share online".
 *
 * PLAIN ENGLISH: Your documents live on YOUR computer. But colleagues who are
 * not in your office still need to reach Orbdyn. Rather than uploading
 * anything to a cloud, we open a private doorway from the internet straight to
 * your running copy of Orbdyn, using a free tool from Cloudflare called
 * `cloudflared`.
 *
 * While the doorway is open, colleagues use a web address like
 *   https://something-random.trycloudflare.com
 * and they still have to sign in with an Orbdyn username and password.
 * When you close it, the address stops working immediately. Files are streamed
 * from your disk on demand -- they are never stored anywhere else.
 */

const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');

let child = null;
let publicUrl = null;
let lastError = null;
let listeners = [];

function onChange(fn) { listeners.push(fn); }
function emit() { listeners.forEach((fn) => { try { fn(status()); } catch (_) {} }); }

function binDir() {
  const dir = path.join(os.homedir(), '.orbdyn', 'bin');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function localBinary() {
  const name = process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';
  const local = path.join(binDir(), name);
  if (fs.existsSync(local)) return local;
  // Already installed system-wide?
  const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['cloudflared'], { encoding: 'utf8' });
  if (which.status === 0 && which.stdout.trim()) return which.stdout.trim().split(/\r?\n/)[0];
  return null;
}

function downloadUrl() {
  const p = process.platform;
  const a = process.arch;
  if (p === 'win32') {
    return a === 'arm64'
      ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-arm64.exe'
      : 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';
  }
  if (p === 'darwin') {
    return a === 'arm64'
      ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz'
      : 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz';
  }
  return a === 'arm64'
    ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64'
    : 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64';
}

function fetchTo(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const go = (u, depth = 0) => {
      if (depth > 6) return reject(new Error('Too many redirects.'));
      https.get(u, { headers: { 'User-Agent': 'orbdyn' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return go(res.headers.location, depth + 1);
        }
        if (res.statusCode !== 200) return reject(new Error('Download failed: ' + res.statusCode));
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(dest)));
      }).on('error', reject);
    };
    go(url);
  });
}

async function ensureBinary() {
  const existing = localBinary();
  if (existing) return existing;
  const url = downloadUrl();
  const isTgz = url.endsWith('.tgz');
  const name = process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';
  const target = path.join(binDir(), name);
  const tmp = target + (isTgz ? '.tgz' : '.part');
  await fetchTo(url, tmp);
  if (isTgz) {
    spawnSync('tar', ['-xzf', tmp, '-C', binDir()], { stdio: 'ignore' });
    fs.unlinkSync(tmp);
  } else {
    fs.renameSync(tmp, target);
  }
  if (process.platform !== 'win32') fs.chmodSync(target, 0o755);
  return target;
}

function status() {
  return {
    running: !!child,
    url: publicUrl,
    error: lastError,
    available: !!localBinary(),
  };
}

async function start(port) {
  if (child) return status();
  lastError = null;
  publicUrl = null;
  let bin;
  try {
    bin = await ensureBinary();
  } catch (err) {
    lastError = 'Could not download the sharing helper. Check your internet connection. (' + err.message + ')';
    emit();
    return status();
  }

  child = spawn(bin, ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${port}`], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let lastLine = '';
  const scan = (buf) => {
    const text = buf.toString();
    const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (m && !publicUrl) { publicUrl = m[0]; emit(); }
    const err = text.split(/\r?\n/).filter((l) => /ERR|error|failed/i.test(l)).pop();
    if (err) lastLine = err.trim().slice(0, 300);
  };
  child.stdout.on('data', scan);
  child.stderr.on('data', scan);
  child.on('exit', (code) => {
    child = null;
    if (!publicUrl) {
      lastError = 'Sharing could not start.' +
        (lastLine ? ' The helper said: ' + lastLine : ' (exit code ' + code + ')') +
        ' This usually means the internet connection or a company firewall is blocking it.';
    }
    publicUrl = null;
    emit();
  });
  child.on('error', (err) => { lastError = err.message; child = null; emit(); });

  // Wait up to 25 seconds for the address to appear.
  for (let i = 0; i < 50 && child && !publicUrl; i++) {
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!publicUrl && child) lastError = 'Took too long to get a web address. Try again.';
  emit();
  return status();
}

function stop() {
  if (child) {
    try { child.kill(); } catch (_) {}
    child = null;
  }
  publicUrl = null;
  emit();
  return status();
}

module.exports = { start, stop, status, onChange };
