// Live Claude Code processes, from the registry each interactive session writes to
// ~/.claude/sessions/<pid>.json: { pid, sessionId, cwd, entrypoint, peerProtocol, messagingSocketPath, startedAt }.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { sessionsDir } = require('./paths');

const SUPPORTED_PROTOCOL = 1;
const KEY_FILE = /^(\d+)\.([0-9a-f]{64})\.key$/;

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

function listLive() {
  let names;
  try {
    names = fs.readdirSync(sessionsDir());
  } catch {
    return [];
  }
  const live = [];
  for (const name of names) {
    if (!/^\d+\.json$/.test(name)) continue;
    let d;
    try {
      d = JSON.parse(fs.readFileSync(path.join(sessionsDir(), name), 'utf8'));
    } catch {
      continue;
    }
    if (!d.sessionId || !d.pid || !isAlive(d.pid)) continue;
    live.push(d);
  }
  return live;
}

// The newest live process attached to this conversation, if any can take messages.
function findLive(sessionId) {
  const matches = listLive()
    .filter((s) => s.sessionId === sessionId && s.messagingSocketPath)
    .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
  return matches[0];
}

function protocolSupported(entry) {
  return entry.peerProtocol === undefined || entry.peerProtocol === SUPPORTED_PROTOCOL;
}

// Mirrors Claude Code's key naming: sha256 of the canonical socket address.
// A Windows pipe name is case-insensitive, so it is lower-cased; a Unix path is used as is.
function canonicalAddress(socketPath) {
  const pipe = /^[\\/]{2}[.?][\\/]pipe[\\/]([^\\/]+)$/i.exec(socketPath);
  if (pipe) return `\\\\.\\pipe\\${pipe[1].toLowerCase()}`;
  return socketPath;
}

// The session's peer token. Only Windows sessions demand it; elsewhere the socket
// directory's permissions (owner-only) are the protection, so we never read it there.
function readPeerToken(entry, platform = process.platform) {
  if (platform !== 'win32') return undefined;
  let names;
  try {
    names = fs.readdirSync(sessionsDir());
  } catch {
    return undefined;
  }
  const hash = crypto.createHash('sha256').update(canonicalAddress(entry.messagingSocketPath)).digest('hex');
  const own = names.filter((n) => {
    const m = KEY_FILE.exec(n);
    return m && Number(m[1]) === entry.pid;
  });
  const name = own.find((n) => KEY_FILE.exec(n)[2] === hash) ?? (own.length === 1 ? own[0] : undefined);
  if (!name) return undefined;
  try {
    const token = JSON.parse(fs.readFileSync(path.join(sessionsDir(), name), 'utf8')).peerToken;
    return /^[0-9a-f]{32}$/.test(token) ? token : undefined;
  } catch {
    return undefined;
  }
}

module.exports = { listLive, findLive, isAlive, protocolSupported, canonicalAddress, readPeerToken };
