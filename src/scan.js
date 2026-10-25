// Finds Claude Code sessions that stopped on a usage limit and haven't continued yet.
const fs = require('fs');
const path = require('path');
const { projectsDir } = require('./paths');

const TAIL_BYTES = 1024 * 1024;
const FALLBACK_RESET_MS = 5 * 3600 * 1000;
const WEEK_MS = 7 * 24 * 3600 * 1000;
// Interactive surfaces only: sdk-* entrypoints are scripts and bots, not people waiting.
const ENTRYPOINTS = new Set(['claude-vscode', 'cli', 'claude-desktop']);

const cache = new Map(); // file -> { mtimeMs, size, pending }

function readTail(file, size) {
  const start = Math.max(0, size - TAIL_BYTES);
  const buf = Buffer.alloc(size - start);
  const fd = fs.openSync(file, 'r');
  try {
    fs.readSync(fd, buf, 0, buf.length, start);
  } finally {
    fs.closeSync(fd);
  }
  let text = buf.toString('utf8');
  if (start > 0) text = text.slice(text.indexOf('\n') + 1);
  return text;
}

// Returns the last rate-limit error of the main thread if no real assistant reply came after it.
function pendingFromTranscript(text) {
  let limit = null;
  for (const line of text.split('\n')) {
    if (!line.includes('"type":"assistant"')) continue;
    let d;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    if (d.type !== 'assistant' || d.isSidechain) continue;
    if (d.error === 'rate_limit') limit = d;
    else if (limit && d.message?.model !== '<synthetic>') limit = null;
  }
  if (!limit) return null;

  const resetsAtSec = limit.quotaLimits?.resetsAt ?? limit.apiErrorParams?.rate_limit_info?.resetsAt;
  const errorAt = Date.parse(limit.timestamp);
  const content = limit.message?.content;
  const text0 = Array.isArray(content) ? content.map((c) => c.text || '').join(' ') : String(content || '');
  return {
    uuid: limit.uuid,
    sessionId: limit.sessionId,
    cwd: limit.cwd,
    entrypoint: limit.entrypoint,
    limitType: limit.quotaLimits?.rateLimitType ?? limit.apiErrorParams?.rate_limit_info?.rateLimitType ?? null,
    text: text0,
    errorAt,
    resetAt: resetsAtSec ? resetsAtSec * 1000 : errorAt + FALLBACK_RESET_MS,
  };
}

// All waiting sessions, oldest reset first. `isDone(uuid)` filters events already handled.
function scan({ maxLateMs = 12 * 3600 * 1000, now = Date.now(), isDone = () => false } = {}) {
  const result = [];
  let dirs;
  try {
    dirs = fs.readdirSync(projectsDir(), { withFileTypes: true });
  } catch {
    return result;
  }
  const seen = new Set();
  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const dirPath = path.join(projectsDir(), dir.name);
    let files;
    try {
      files = fs.readdirSync(dirPath);
    } catch {
      continue;
    }
    for (const name of files) {
      if (!name.endsWith('.jsonl')) continue;
      const file = path.join(dirPath, name);
      let st;
      try {
        st = fs.statSync(file);
      } catch {
        continue;
      }
      // A weekly limit can be up to 7 days away, plus how late we still accept it.
      if (now - st.mtimeMs > WEEK_MS + maxLateMs) continue;
      seen.add(file);
      let entry = cache.get(file);
      if (!entry || entry.mtimeMs !== st.mtimeMs || entry.size !== st.size) {
        let pending = null;
        try {
          const text = readTail(file, st.size);
          if (text.includes('"error":"rate_limit"')) pending = pendingFromTranscript(text);
        } catch {}
        entry = { mtimeMs: st.mtimeMs, size: st.size, pending };
        cache.set(file, entry);
      }
      const p = entry.pending;
      if (!p || !ENTRYPOINTS.has(p.entrypoint) || isDone(p.uuid)) continue;
      if (now - p.resetAt > maxLateMs) continue;
      result.push({ ...p, file });
    }
  }
  for (const file of cache.keys()) if (!seen.has(file)) cache.delete(file);
  return result.sort((a, b) => a.resetAt - b.resetAt);
}

// Path of a session's transcript, wherever its project folder is.
function findTranscript(sessionId) {
  let dirs;
  try {
    dirs = fs.readdirSync(projectsDir());
  } catch {
    return undefined;
  }
  for (const dir of dirs) {
    const file = path.join(projectsDir(), dir, `${sessionId}.jsonl`);
    if (fs.existsSync(file)) return file;
  }
  return undefined;
}

module.exports = { scan, pendingFromTranscript, findTranscript, ENTRYPOINTS };
