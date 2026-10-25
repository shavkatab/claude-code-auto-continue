const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { tempClaudeDir, line, limitEntry, reply, userMsg } = require('./helpers');
const { pendingFromTranscript, scan, titleFromTranscript } = require('../src/scan');

const RESET = 1792911000 * 1000;
const jsonl = (...entries) => entries.map(line).join('\n');

test('limit with nothing after it is pending', () => {
  const p = pendingFromTranscript(jsonl(limitEntry()));
  assert.equal(p.uuid, 'u-limit');
  assert.equal(p.resetAt, RESET);
  assert.equal(p.limitType, 'five_hour');
});

test('a queued user message after the limit keeps it pending', () => {
  assert.ok(pendingFromTranscript(jsonl(limitEntry(), userMsg('hi'))));
});

test('a real reply after the limit clears it', () => {
  assert.equal(pendingFromTranscript(jsonl(limitEntry(), userMsg('go'), reply())), null);
});

test('a subagent reply does not clear it', () => {
  assert.ok(pendingFromTranscript(jsonl(limitEntry(), reply({ isSidechain: true }))));
});

test('a later limit replaces the earlier one', () => {
  const p = pendingFromTranscript(jsonl(limitEntry(), reply(), limitEntry({ uuid: 'u2' })));
  assert.equal(p.uuid, 'u2');
});

test('weekly limit is recognised', () => {
  const p = pendingFromTranscript(jsonl(limitEntry({ quotaLimits: { resetsAt: 1793000000, rateLimitType: 'seven_day' } })));
  assert.equal(p.limitType, 'seven_day');
  assert.equal(p.resetAt, 1793000000 * 1000);
});

test('without resetsAt the reset is guessed 5 hours after the error', () => {
  const p = pendingFromTranscript(jsonl(limitEntry({ quotaLimits: undefined })));
  assert.equal(p.resetAt, Date.parse('2026-10-25T08:00:00.000Z'));
});

test('scan filters by entrypoint, lateness and handled events', () => {
  const dir = tempClaudeDir();
  const proj = path.join(dir, 'projects', '-work-app');
  fs.mkdirSync(proj, { recursive: true });
  fs.writeFileSync(path.join(proj, 'a.jsonl'), jsonl(limitEntry({ uuid: 'vscode', sessionId: 'a' })));
  fs.writeFileSync(path.join(proj, 'b.jsonl'), jsonl(limitEntry({ uuid: 'cli', sessionId: 'b', entrypoint: 'cli' })));
  fs.writeFileSync(path.join(proj, 'c.jsonl'), jsonl(limitEntry({ uuid: 'bot', sessionId: 'c', entrypoint: 'sdk-cli' })));
  fs.writeFileSync(path.join(proj, 'd.jsonl'), jsonl(limitEntry({ uuid: 'done', sessionId: 'd' })));

  const now = RESET + 60 * 1000;
  const ids = scan({ now, isDone: (u) => u === 'done' }).map((p) => p.uuid).sort();
  assert.deepEqual(ids, ['cli', 'vscode']);

  assert.deepEqual(scan({ now: RESET + 13 * 3600 * 1000 }), [], 'older than maxLateHours is ignored');
});

test('the session title prefers the user rename over the generated one', () => {
  assert.equal(titleFromTranscript(jsonl({ type: 'ai-title', aiTitle: 'Generated' })), 'Generated');
  assert.equal(
    titleFromTranscript(jsonl({ type: 'ai-title', aiTitle: 'Generated' }, { type: 'custom-title', customTitle: 'Mine' })),
    'Mine',
  );
  assert.equal(titleFromTranscript(jsonl(limitEntry())), undefined);
});
