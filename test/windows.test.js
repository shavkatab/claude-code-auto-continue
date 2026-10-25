const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { tempClaudeDir } = require('./helpers');
const windows = require('../src/windows');

const root = path.resolve('/work');

test('the deepest containing folder owns the session; unowned go to the oldest window', () => {
  const list = [
    { pid: 1, folders: [root], startedAt: 10 },
    { pid: 2, folders: [path.join(root, 'app')], startedAt: 5 },
    { pid: 3, folders: [path.resolve('/other')], startedAt: 1 },
  ];
  assert.equal(windows.ownerPid(path.join(root, 'app', 'src'), list), 2);
  assert.equal(windows.ownerPid(path.join(root, 'lib'), list), 1);
  assert.equal(windows.ownerPid(path.resolve('/elsewhere'), list), 3);
  assert.equal(windows.ownerPid('/x', []), undefined);
});

test('a folder does not contain its sibling with a common prefix', () => {
  assert.equal(windows.contains(path.join(root, 'app'), path.join(root, 'app2')), false);
});

test('stale heartbeats are ignored', () => {
  tempClaudeDir();
  windows.heartbeat(11, [root], 1, 1000);
  windows.heartbeat(12, [root], 2, 100000);
  assert.deepEqual(windows.listWindows(100000).map((w) => w.pid), [12]);
  windows.leave(12);
  assert.deepEqual(windows.listWindows(100000), []);
});
