const test = require('node:test');
const assert = require('node:assert');
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

test('choice defaults to undefined and remembers yes/no', () => {
  tempClaudeDir();
  assert.equal(state.getChoice('e2'), undefined);
  state.setChoice('e2', 'yes');
  assert.equal(state.getChoice('e2'), 'yes');
  state.setChoice('e2', 'no');
  assert.equal(state.getChoice('e2'), 'no');
});

test('test sessions are remembered', () => {
  tempClaudeDir();
  assert.equal(state.isTestSession('s9'), false);
  state.markTestSession('s9');
  assert.equal(state.isTestSession('s9'), true);
});

test('asked is claimed once', () => {
  tempClaudeDir();
  assert.equal(state.claimAsked('e3'), true);
  assert.equal(state.claimAsked('e3'), false);
});
