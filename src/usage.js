// Plan usage as Claude Code last saw it. Claude Code caches the server's answer in its global
// config (cachedUsageUtilization); we only read that file — no credentials, no network.
const fs = require('fs');
const { globalConfigFile } = require('./paths');

let cache = { mtimeMs: -1, value: null };

// { percent, resetsAt } for one window, or null. A window whose reset already passed is
// reported as null: the cached percent no longer means anything until Claude Code refreshes.
function windowOf(raw, now) {
  if (!raw || typeof raw.utilization !== 'number' || !Number.isFinite(raw.utilization)) return null;
  const resetsAt = raw.resets_at ? Date.parse(raw.resets_at) : NaN;
  if (Number.isFinite(resetsAt) && resetsAt <= now) return null;
  return { percent: Math.round(raw.utilization), resetsAt: Number.isFinite(resetsAt) ? resetsAt : null };
}

// Newer answers also carry a `limits` list keyed by kind; use it when the named windows are missing.
function fromLimits(limits, kind) {
  const row = Array.isArray(limits) ? limits.find((l) => l && l.kind === kind) : undefined;
  return row ? { utilization: row.percent, resets_at: row.resets_at } : undefined;
}

function parseUsage(config, now = Date.now()) {
  const cached = config?.cachedUsageUtilization;
  const u = cached?.utilization;
  if (!u) return null;
  const fiveHour = windowOf(u.five_hour ?? fromLimits(u.limits, 'session'), now);
  const sevenDay = windowOf(u.seven_day ?? fromLimits(u.limits, 'weekly_all'), now);
  if (!fiveHour && !sevenDay && typeof cached.fetchedAtMs !== 'number') return null;
  return { fiveHour, sevenDay, fetchedAt: typeof cached.fetchedAtMs === 'number' ? cached.fetchedAtMs : null };
}

function readUsage(now = Date.now()) {
  const file = globalConfigFile();
  let st;
  try {
    st = fs.statSync(file);
  } catch {
    return null;
  }
  if (st.mtimeMs !== cache.mtimeMs) {
    let config = null;
    try {
      config = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {}
    cache = { mtimeMs: st.mtimeMs, value: config?.cachedUsageUtilization ? { cachedUsageUtilization: config.cachedUsageUtilization } : null };
  }
  return parseUsage(cache.value, now);
}

module.exports = { readUsage, parseUsage };
