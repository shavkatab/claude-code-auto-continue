const fs = require('fs');
const os = require('os');
const path = require('path');

// Points CLAUDE_CONFIG_DIR at a fresh temp dir; every module reads it lazily.
function tempClaudeDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-auto-continue-'));
  process.env.CLAUDE_CONFIG_DIR = dir;
  return dir;
}

const line = (o) => JSON.stringify(o);

function limitEntry(over = {}) {
  return {
    type: 'assistant',
    uuid: 'u-limit',
    sessionId: 's1',
    cwd: '/work/app',
    entrypoint: 'claude-vscode',
    timestamp: '2026-10-25T03:00:00.000Z',
    error: 'rate_limit',
    isApiErrorMessage: true,
    quotaLimits: { resetsAt: 1792911000, rateLimitType: 'five_hour' },
    message: { model: '<synthetic>', content: [{ type: 'text', text: "You've hit your session limit" }] },
    ...over,
  };
}

const reply = (over = {}) => ({ type: 'assistant', message: { model: 'claude-opus-5-5', content: [] }, ...over });
const userMsg = (text) => ({ type: 'user', message: { role: 'user', content: text } });

module.exports = { tempClaudeDir, line, limitEntry, reply, userMsg };
