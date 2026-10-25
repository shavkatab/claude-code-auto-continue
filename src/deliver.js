// Sends a prompt into a running Claude Code session through its messaging socket
// (a Unix socket, or a named pipe on Windows) and confirms it reached the transcript.
const fs = require('fs');
const net = require('net');

const CONNECT_TIMEOUT_MS = 5000;

function sendToSocket(socketPath, text, { token } = {}) {
  return new Promise((resolve, reject) => {
    const lines = [];
    if (token) lines.push(JSON.stringify({ type: 'auth', token }));
    lines.push(JSON.stringify({ type: 'user', message: { role: 'user', content: text } }));

    const sock = net.connect({ path: socketPath });
    const timer = setTimeout(() => {
      sock.destroy();
      reject(new Error(`no answer from ${socketPath}`));
    }, CONNECT_TIMEOUT_MS);
    sock.on('connect', () => sock.end(lines.join('\n') + '\n'));
    sock.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    sock.on('close', (hadError) => {
      clearTimeout(timer);
      if (!hadError) resolve();
    });
  });
}

function fileSize(file) {
  try {
    return fs.statSync(file).size;
  } catch {
    return 0;
  }
}

// True once a user entry containing `text` is appended to the transcript after `fromSize`.
async function waitForTranscript(file, fromSize, text, timeoutMs = 30000) {
  const needle = JSON.stringify(text).slice(1, -1);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1000));
    const size = fileSize(file);
    if (size <= fromSize) continue;
    try {
      const buf = Buffer.alloc(size - fromSize);
      const fd = fs.openSync(file, 'r');
      fs.readSync(fd, buf, 0, buf.length, fromSize);
      fs.closeSync(fd);
      for (const line of buf.toString('utf8').split('\n')) {
        if ((line.includes('"type":"user"') || line.includes('"operation":"enqueue"')) && line.includes(needle)) {
          return true;
        }
      }
    } catch {}
  }
  return false;
}

module.exports = { sendToSocket, waitForTranscript, fileSize };
