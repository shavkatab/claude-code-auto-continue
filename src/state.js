// Shared state across VS Code windows, kept as tiny files so every window sees the same thing.
//   handled/<uuid>  this limit event was continued (or given up on) — never touch it again
//   choice/<uuid>   "yes" | "no": the user's answer to "continue after reset?"
//   asked/<uuid>    the question was already shown once
const fs = require('fs');
const path = require('path');
const { stateDir } = require('./paths');

const PRUNE_AFTER_MS = 14 * 24 * 3600 * 1000;

function file(kind, uuid) {
  return path.join(stateDir(), kind, uuid);
}

function read(kind, uuid) {
  try {
    return fs.readFileSync(file(kind, uuid), 'utf8').trim();
  } catch {
    return undefined;
  }
}

function write(kind, uuid, value) {
  fs.mkdirSync(path.join(stateDir(), kind), { recursive: true });
  fs.writeFileSync(file(kind, uuid), `${value}\n`);
}

// Atomic claim: only the first caller gets true, even across processes.
function claim(kind, uuid, note = '') {
  fs.mkdirSync(path.join(stateDir(), kind), { recursive: true });
  try {
    fs.writeFileSync(file(kind, uuid), `${new Date().toISOString()} ${note}\n`, { flag: 'wx' });
    return true;
  } catch {
    return false;
  }
}

function remove(kind, uuid) {
  try {
    fs.unlinkSync(file(kind, uuid));
  } catch {}
}

function prune(now = Date.now()) {
  for (const kind of ['handled', 'choice', 'asked']) {
    const dir = path.join(stateDir(), kind);
    let names;
    try {
      names = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      try {
        if (now - fs.statSync(path.join(dir, name)).mtimeMs > PRUNE_AFTER_MS) fs.unlinkSync(path.join(dir, name));
      } catch {}
    }
  }
}

module.exports = {
  isHandled: (uuid) => fs.existsSync(file('handled', uuid)),
  claimHandled: (uuid, note) => claim('handled', uuid, note),
  releaseHandled: (uuid) => remove('handled', uuid),
  getChoice: (uuid) => read('choice', uuid),
  setChoice: (uuid, value) => write('choice', uuid, value),
  claimAsked: (uuid) => claim('asked', uuid),
  prune,
};
