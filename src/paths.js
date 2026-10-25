const os = require('os');
const path = require('path');

// Claude Code honours CLAUDE_CONFIG_DIR; everything else lives under ~/.claude.
function claudeDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

module.exports = {
  claudeDir,
  projectsDir: () => path.join(claudeDir(), 'projects'),
  sessionsDir: () => path.join(claudeDir(), 'sessions'),
  stateDir: () => path.join(claudeDir(), 'auto-continue'),
};
