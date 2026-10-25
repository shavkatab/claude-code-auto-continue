const os = require('os');
const path = require('path');

// Claude Code honours CLAUDE_CONFIG_DIR; everything else lives under ~/.claude.
function claudeDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

// The global config sits next to ~/.claude by default, inside CLAUDE_CONFIG_DIR when that is set.
function globalConfigFile() {
  return process.env.CLAUDE_CONFIG_DIR
    ? path.join(process.env.CLAUDE_CONFIG_DIR, '.claude.json')
    : path.join(os.homedir(), '.claude.json');
}

module.exports = {
  claudeDir,
  globalConfigFile,
  projectsDir: () => path.join(claudeDir(), 'projects'),
  sessionsDir: () => path.join(claudeDir(), 'sessions'),
  stateDir: () => path.join(claudeDir(), 'auto-continue'),
};
