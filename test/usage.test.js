const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { tempClaudeDir } = require('./helpers');
const { parseUsage, readUsage } = require('../src/usage');

const NOW = Date.parse('2026-10-25T05:00:00Z');
const config = (utilization, fetchedAtMs = NOW - 60000) => ({ cachedUsageUtilization: { fetchedAtMs, utilization } });

test('reads the 5-hour and weekly windows', () => {
  const u = parseUsage(
    config({
      five_hour: { utilization: 100, resets_at: '2026-10-25T06:49:59.934062+00:00' },
      seven_day: { utilization: 36.4, resets_at: '2026-10-31T12:59:59+00:00' },
    }),
    NOW,
  );
  assert.deepEqual(u.fiveHour, { percent: 100, resetsAt: Date.parse('2026-10-25T06:49:59.934062+00:00') });
  assert.equal(u.sevenDay.percent, 36);
  assert.equal(u.fetchedAt, NOW - 60000);
});

test('a window whose reset already passed is unknown, not stale', () => {
  const u = parseUsage(config({ five_hour: { utilization: 100, resets_at: '2026-10-25T04:00:00Z' } }), NOW);
  assert.equal(u.fiveHour, null);
});

test('falls back to the limits list', () => {
  const u = parseUsage(
    config({
      limits: [
        { kind: 'session', percent: 42, resets_at: '2026-10-25T07:00:00Z' },
        { kind: 'weekly_all', percent: 7, resets_at: '2026-10-31T13:00:00Z' },
      ],
    }),
    NOW,
  );
  assert.equal(u.fiveHour.percent, 42);
  assert.equal(u.sevenDay.percent, 7);
});

test('no cached usage gives null', () => {
  assert.equal(parseUsage({}, NOW), null);
  assert.equal(parseUsage(null, NOW), null);
});

test('readUsage reads the global config next to CLAUDE_CONFIG_DIR', () => {
  const dir = tempClaudeDir();
  assert.equal(readUsage(NOW), null);
  fs.writeFileSync(
    path.join(dir, '.claude.json'),
    JSON.stringify(config({ five_hour: { utilization: 12, resets_at: '2026-10-25T07:00:00Z' } })),
  );
  assert.equal(readUsage(NOW).fiveHour.percent, 12);
});
