const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { tempClaudeDir } = require('./helpers');
const state = require('../src/state');

test('handled can be claimed only once', () => {
  tempClaudeDir();
  assert.equal(state.claimHandled('e1'), true);
  assert.equal(state.claimHandled('e1'), false);
  assert.equal(state.isHandled('e1'), true);
  state.releaseHandled('e1');
  assert.equal(state.isHandled('e1'), false);
});

test('a session choice stands until changed and keeps where the session lives', () => {
  tempClaudeDir();
  assert.equal(state.getSessionChoice('s1'), undefined);
  state.setSessionChoice('s1', 'yes', { cwd: '/work/app', entrypoint: 'claude-vscode' });
  assert.equal(state.getSessionChoice('s1'), 'yes');
  state.setSessionChoice('s1', 'no');
  assert.equal(state.getSessionChoice('s1'), 'no');
  assert.deepEqual(state.listSessionChoices(), [
    { sessionId: 's1', choice: 'no', cwd: '/work/app', entrypoint: 'claude-vscode' },
  ]);
});

test('per-event "yes" from 0.3.0 becomes a standing session choice', () => {
  const dir = tempClaudeDir();
  const base = path.join(dir, 'auto-continue');
  fs.mkdirSync(path.join(base, 'choice'), { recursive: true });
  fs.mkdirSync(path.join(base, 'handled'), { recursive: true });
  fs.writeFileSync(path.join(base, 'choice', 'ev1'), 'yes\n');
  fs.writeFileSync(path.join(base, 'handled', 'ev1'), '2026-10-25T04:19:45.414Z s-old /work/my app\n');
  fs.writeFileSync(path.join(base, 'choice', 'ev2'), 'no\n');

  state.migrateEventChoices();
  assert.equal(state.getSessionChoice('s-old'), 'yes');
  assert.equal(state.listSessionChoices()[0].cwd, '/work/my app');
  assert.equal(fs.existsSync(path.join(base, 'choice')), false);
});

test('test sessions are remembered', () => {
  tempClaudeDir();
  assert.equal(state.isTestSession('s9'), false);
  state.markTestSession('s9');
  assert.equal(state.isTestSession('s9'), true);
});

test('asked is claimed once per session', () => {
  tempClaudeDir();
  assert.equal(state.claimAsked('s3'), true);
  assert.equal(state.claimAsked('s3'), false);
});
