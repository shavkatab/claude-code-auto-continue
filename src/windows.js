// Decides which VS Code window speaks for a waiting session, so a question or a notice
// shows up once, not in every open window. Each window heartbeats windows/<pid>.json with
// its folders; a session belongs to the window with the deepest folder containing its cwd,
// and sessions no window contains (terminal elsewhere, Claude Desktop) go to the oldest window.
const fs = require('fs');
const path = require('path');
const { stateDir } = require('./paths');

const STALE_MS = 60 * 1000;

function dir() {
  return path.join(stateDir(), 'windows');
}

function heartbeat(pid, folders, startedAt, now = Date.now()) {
  fs.mkdirSync(dir(), { recursive: true });
  fs.writeFileSync(path.join(dir(), `${pid}.json`), JSON.stringify({ pid, folders, startedAt, seenAt: now }));
}

function leave(pid) {
  try {
    fs.unlinkSync(path.join(dir(), `${pid}.json`));
  } catch {}
}

function listWindows(now = Date.now()) {
  let names;
  try {
    names = fs.readdirSync(dir());
  } catch {
    return [];
  }
  const result = [];
  for (const name of names) {
    try {
      const w = JSON.parse(fs.readFileSync(path.join(dir(), name), 'utf8'));
      if (now - w.seenAt <= STALE_MS) result.push(w);
    } catch {}
  }
  return result;
}

function contains(folder, cwd) {
  if (!folder || !cwd) return false;
  const a = path.resolve(folder).toLowerCase();
  const b = path.resolve(cwd).toLowerCase();
  return b === a || b.startsWith(a + path.sep);
}

function ownerPid(cwd, windows) {
  let best;
  for (const w of windows) {
    for (const f of w.folders || []) {
      if (contains(f, cwd) && (!best || f.length > best.len)) best = { pid: w.pid, len: f.length };
    }
  }
  if (best) return best.pid;
  const oldest = [...windows].sort((a, b) => a.startedAt - b.startedAt || a.pid - b.pid)[0];
  return oldest?.pid;
}

module.exports = { heartbeat, leave, listWindows, ownerPid, contains };
