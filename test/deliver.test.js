const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const net = require('net');
const path = require('path');
const crypto = require('crypto');
const { sendToSocket, waitForTranscript } = require('../src/deliver');

function socketPath() {
  const id = crypto.randomBytes(4).toString('hex');
  return process.platform === 'win32' ? `\\\\.\\pipe\\cc-auto-continue-test-${id}` : path.join(os.tmpdir(), `cca-${id}.sock`);
}

// A stand-in for a Claude Code inbox: collects the JSON lines it receives.
function fakeInbox() {
  const lines = [];
  const server = net.createServer((sock) => {
    let buf = '';
    sock.setEncoding('utf8');
    sock.on('data', (d) => (buf += d));
    sock.on('end', () => {
      for (const l of buf.split('\n')) if (l.trim()) lines.push(JSON.parse(l));
      sock.end();
    });
  });
  const p = socketPath();
  return new Promise((resolve) => server.listen(p, () => resolve({ server, path: p, lines })));
}

test('sends a user message line', async () => {
  const inbox = await fakeInbox();
  await sendToSocket(inbox.path, 'продолжай');
  await new Promise((r) => setTimeout(r, 50));
  inbox.server.close();
  assert.deepEqual(inbox.lines, [{ type: 'user', message: { role: 'user', content: 'продолжай' } }]);
});

test('sends the auth line first when a token is given', async () => {
  const inbox = await fakeInbox();
  await sendToSocket(inbox.path, 'continue', { token: 'ab'.repeat(16) });
  await new Promise((r) => setTimeout(r, 50));
  inbox.server.close();
  assert.equal(inbox.lines[0].type, 'auth');
  assert.equal(inbox.lines[0].token, 'ab'.repeat(16));
  assert.equal(inbox.lines[1].message.content, 'continue');
});

test('fails when nobody listens', async () => {
  await assert.rejects(sendToSocket(socketPath(), 'x'));
});

test('waitForTranscript sees the message appended after the given offset', async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cca-')), 't.jsonl');
  fs.writeFileSync(file, JSON.stringify({ type: 'user', message: { content: 'продолжай' } }) + '\n');
  const from = fs.statSync(file).size;
  setTimeout(() => fs.appendFileSync(file, JSON.stringify({ type: 'user', message: { content: 'продолжай' } }) + '\n'), 300);
  assert.equal(await waitForTranscript(file, from, 'продолжай', 5000), true);
  assert.equal(await waitForTranscript(file, fs.statSync(file).size, 'продолжай', 1500), false);
});
