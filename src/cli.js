#!/usr/bin/env node
// Debug helper, works without VS Code:
//   node src/cli.js status             sessions stopped on a limit, and whether their process is live
//   node src/cli.js send <id> [text]   deliver a prompt to a live session now
const { scan, findTranscript } = require('./scan');
const sessions = require('./sessions');
const state = require('./state');
const { sendToSocket, waitForTranscript, fileSize } = require('./deliver');

async function main([cmd, id, ...rest]) {
  if (cmd === 'status') {
    const waiting = scan({ maxLateMs: 7 * 24 * 3600 * 1000, isDone: state.isHandled });
    if (!waiting.length) return console.log('No session is stopped on a usage limit.');
    for (const p of waiting) {
      const live = sessions.findLive(p.sessionId);
      console.log(
        [
          new Date(p.resetAt).toLocaleString(),
          p.limitType || '-',
          p.entrypoint,
          live ? `live pid ${live.pid}` : 'not running',
          `choice=${state.getSessionChoice(p.sessionId) || '-'}`,
          p.sessionId,
          p.cwd,
        ].join('  '),
      );
    }
    return;
  }
  if (cmd === 'send' && id) {
    const text = rest.join(' ') || 'continue';
    const live = sessions.findLive(id);
    if (!live) throw new Error(`session ${id} has no live process`);
    const file = findTranscript(id);
    const before = file ? fileSize(file) : 0;
    await sendToSocket(live.messagingSocketPath, text, { token: sessions.readPeerToken(live) });
    const ok = file ? await waitForTranscript(file, before, text) : false;
    console.log(ok ? 'delivered ✓' : 'sent, but not seen in the transcript within 30 s');
    return;
  }
  console.log('usage: cli.js status | cli.js send <sessionId> [text]');
}

main(process.argv.slice(2)).catch((e) => {
  console.error(e.message);
  process.exit(1);
});
