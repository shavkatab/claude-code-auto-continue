const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { tempClaudeDir } = require('./helpers');
const sessions = require('../src/sessions');

function register(dir, entry) {
  const d = path.join(dir, 'sessions');
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, `${entry.pid}.json`), JSON.stringify(entry));
  return d;
}

test('findLive returns the newest live process of a session and skips dead ones', () => {
  const dir = tempClaudeDir();
  register(dir, { pid: process.pid, sessionId: 's1', messagingSocketPath: '/tmp/a.sock', startedAt: 2 });
  register(dir, { pid: 999999, sessionId: 's1', messagingSocketPath: '/tmp/dead.sock', startedAt: 3 });
  register(dir, { pid: process.ppid, sessionId: 's2', messagingSocketPath: '/tmp/b.sock', startedAt: 1 });
  assert.equal(sessions.findLive('s1').messagingSocketPath, '/tmp/a.sock');
  assert.equal(sessions.findLive('nope'), undefined);
});

test('protocol 1 and unknown are supported, others are not', () => {
  assert.ok(sessions.protocolSupported({ peerProtocol: 1 }));
  assert.ok(sessions.protocolSupported({}));
  assert.ok(!sessions.protocolSupported({ peerProtocol: 2 }));
});

test('pipe names are canonicalised to lower case', () => {
  assert.equal(sessions.canonicalAddress('\\\\.\\pipe\\Claude-ABC'), '\\\\.\\pipe\\claude-abc');
  assert.equal(sessions.canonicalAddress('/tmp/cc-socks/1.sock'), '/tmp/cc-socks/1.sock');
});

test('peer token is read only on Windows, from the key matching pid and address', () => {
  const dir = tempClaudeDir();
  const entry = { pid: 4242, sessionId: 's', messagingSocketPath: '\\\\.\\pipe\\Claude-4242' };
  const d = register(dir, entry);
  const hash = crypto.createHash('sha256').update('\\\\.\\pipe\\claude-4242').digest('hex');
  const token = 'ab'.repeat(16);
  fs.writeFileSync(path.join(d, `4242.${hash}.key`), JSON.stringify({ peerToken: token }));
  fs.writeFileSync(path.join(d, `4242.${'0'.repeat(64)}.key`), JSON.stringify({ peerToken: 'cd'.repeat(16) }));

  assert.equal(sessions.readPeerToken(entry, 'win32'), token);
  assert.equal(sessions.readPeerToken(entry, 'darwin'), undefined);
});
