// Shared state across VS Code windows, kept as tiny files so every window sees the same thing.
//   handled/<uuid>         this limit event was continued (or given up on) — never touch it again
//   sessions/<sessionId>   the user's standing choice for a session: {"choice":"yes"|"no","cwd","entrypoint"}
//   asked/<sessionId>      the "continue this session?" question was already shown once
//   test/<sessionId>       a throwaway session started by Test Delivery — never offered for continuing
const fs = require('fs');
const path = require('path');
const { stateDir } = require('./paths');

const PRUNE_AFTER_MS = 14 * 24 * 3600 * 1000;
// A standing choice lives until the user changes it; only sessions untouched this long are forgotten.
const PRUNE_CHOICES_AFTER_MS = 90 * 24 * 3600 * 1000;

function file(kind, id) {
  return path.join(stateDir(), kind, id);
}

function write(kind, id, value) {
  fs.mkdirSync(path.join(stateDir(), kind), { recursive: true });
  fs.writeFileSync(file(kind, id), `${value}\n`);
}

// Atomic claim: only the first caller gets true, even across processes.
function claim(kind, id, note = '') {
  fs.mkdirSync(path.join(stateDir(), kind), { recursive: true });
  try {
    fs.writeFileSync(file(kind, id), `${new Date().toISOString()} ${note}\n`, { flag: 'wx' });
    return true;
  } catch {
    return false;
  }
}

function remove(kind, id) {
  try {
    fs.unlinkSync(file(kind, id));
  } catch {}
}

function readSession(sessionId) {
  try {
    return JSON.parse(fs.readFileSync(file('sessions', sessionId), 'utf8'));
  } catch {
    return undefined;
  }
}

function setSessionChoice(sessionId, choice, { cwd, entrypoint } = {}) {
  const prev = readSession(sessionId) || {};
  write('sessions', sessionId, JSON.stringify({ choice, cwd: cwd ?? prev.cwd, entrypoint: entrypoint ?? prev.entrypoint }));
}

function listSessionChoices() {
  let names;
  try {
    names = fs.readdirSync(path.join(stateDir(), 'sessions'));
  } catch {
    return [];
  }
  return names.map((sessionId) => ({ sessionId, ...readSession(sessionId) })).filter((s) => s.choice);
}

// 0.3.0 and earlier stored a choice per limit event (choice/<uuid>). Carry every "yes" over to its
// session, found through the handled/<uuid> note "<time> <sessionId> <cwd>".
function migrateEventChoices() {
  const dir = path.join(stateDir(), 'choice');
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return;
  }
  for (const uuid of names) {
    try {
      if (fs.readFileSync(path.join(dir, uuid), 'utf8').trim() === 'yes') {
        const [, sessionId, ...cwd] = fs.readFileSync(file('handled', uuid), 'utf8').trim().split(' ');
        if (sessionId && !readSession(sessionId)) setSessionChoice(sessionId, 'yes', { cwd: cwd.join(' ') || undefined });
      }
    } catch {}
    remove('choice', uuid);
  }
  try {
    fs.rmdirSync(dir);
  } catch {}
}

function prune(now = Date.now()) {
  for (const [kind, maxAge] of [
    ['handled', PRUNE_AFTER_MS],
    ['asked', PRUNE_AFTER_MS],
    ['test', PRUNE_AFTER_MS],
    ['sessions', PRUNE_CHOICES_AFTER_MS],
  ]) {
    const dir = path.join(stateDir(), kind);
    let names;
    try {
      names = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      try {
        if (now - fs.statSync(path.join(dir, name)).mtimeMs > maxAge) fs.unlinkSync(path.join(dir, name));
      } catch {}
    }
  }
}

module.exports = {
  isHandled: (uuid) => fs.existsSync(file('handled', uuid)),
  claimHandled: (uuid, note) => claim('handled', uuid, note),
  releaseHandled: (uuid) => remove('handled', uuid),
  getSessionChoice: (sessionId) => readSession(sessionId)?.choice,
  setSessionChoice,
  listSessionChoices,
  claimAsked: (sessionId) => claim('asked', sessionId),
  markTestSession: (sessionId) => write('test', sessionId, new Date().toISOString()),
  isTestSession: (sessionId) => fs.existsSync(file('test', sessionId)),
  migrateEventChoices,
  prune,
};
