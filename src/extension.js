const vscode = require('vscode');
const cp = require('child_process');
const path = require('path');
const { scan, findTranscript } = require('./scan');
const state = require('./state');
const sessions = require('./sessions');
const windows = require('./windows');
const { sendToSocket, waitForTranscript, fileSize } = require('./deliver');
const { t, setLanguage, formatLeft, formatWhen } = require('./i18n');

const TICK_MS = 15 * 1000;
const REOPEN_TIMEOUT_MS = 45 * 1000;
const TEST_START_TIMEOUT_MS = 60 * 1000;
const startedAt = Date.now();

let log;
let statusItem;
let mine = []; // waiting sessions this window speaks for
let busy = false;
let keepAwake = null;

function cfg() {
  const c = vscode.workspace.getConfiguration('claudeAutoContinue');
  return {
    enabled: c.get('enabled', true),
    message: c.get('message', '').trim() || t('defaultMessage'),
    delayMs: c.get('delaySeconds', 60) * 1000,
    defaultChoice: c.get('defaultChoice', 'ask'),
    keepAwake: c.get('keepAwake', true),
    maxLateMs: c.get('maxLateHours', 12) * 3600 * 1000,
  };
}

function info(msg) {
  log.appendLine(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function name(p) {
  return path.basename(p.cwd || '') || p.sessionId.slice(0, 8);
}

function source(p) {
  return { 'claude-vscode': 'VS Code', cli: 'terminal', 'claude-desktop': 'Desktop' }[p.entrypoint] || p.entrypoint;
}

// "yes" | "no" | undefined (not decided yet)
function choiceOf(p) {
  const saved = state.getChoice(p.uuid);
  if (saved) return saved;
  const d = cfg().defaultChoice;
  return d === 'always' ? 'yes' : d === 'never' ? 'no' : undefined;
}

function mark(p) {
  const c = choiceOf(p);
  return c === 'yes' ? t('yesMark') : c === 'no' ? t('noMark') : t('askMark');
}

function updateStatus() {
  const c = cfg();
  statusItem.backgroundColor = undefined;
  if (!c.enabled) {
    statusItem.text = t('statusOff');
    statusItem.tooltip = t('tooltipOff');
  } else if (!mine.length) {
    statusItem.text = t('statusIdle');
    statusItem.tooltip = t('tooltipIdle');
  } else {
    const armed = mine.filter((p) => choiceOf(p) === 'yes');
    const undecided = mine.filter((p) => choiceOf(p) === undefined);
    if (armed.length) {
      const left = formatLeft(armed[0].resetAt + c.delayMs - Date.now());
      statusItem.text =
        mine.length > 1
          ? t('statusArmedMore', c.message, left, armed.length, mine.length)
          : t('statusArmed', c.message, left);
    } else {
      statusItem.text = t('statusUndecided', undecided.length || mine.length);
      if (undecided.length) statusItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
    const md = new vscode.MarkdownString(`${t('tooltipHeader')}\n\n`);
    for (const p of mine) md.appendMarkdown(`${t('tooltipRow', mark(p), name(p), source(p), formatWhen(p.resetAt))}\n`);
    md.appendMarkdown(`\n${t('tooltipClick')}`);
    statusItem.tooltip = md;
  }
  statusItem.show();
}

// Keeps the computer from sleeping while a session is armed. The screen may still lock:
// delivery goes through the session's socket, not the keyboard.
function updateKeepAwake() {
  const want = cfg().enabled && cfg().keepAwake && mine.some((p) => choiceOf(p) === 'yes');
  if (want && !keepAwake) {
    if (process.platform === 'darwin') {
      keepAwake = cp.spawn('/usr/bin/caffeinate', ['-i', '-w', String(process.pid)], { stdio: 'ignore' });
    } else if (process.platform === 'win32') {
      const script =
        "$t=Add-Type -Name P -Namespace W -PassThru -MemberDefinition '[DllImport(\"kernel32.dll\")] public static extern uint SetThreadExecutionState(uint f);';" +
        'while($true){$t::SetThreadExecutionState(0x80000001)|Out-Null;Start-Sleep 30}';
      keepAwake = cp.spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', script], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } else {
      return;
    }
    keepAwake.on('exit', () => (keepAwake = null));
    keepAwake.on('error', () => (keepAwake = null));
    info('keep-awake on');
  } else if (!want && keepAwake) {
    keepAwake.kill();
    keepAwake = null;
    info('keep-awake off');
  }
}

function ask(p) {
  const c = cfg();
  info(`${name(p)}: hit the ${p.limitType || 'usage'} limit, resets ${formatWhen(p.resetAt)} — asking`);
  vscode.window
    .showInformationMessage(t('ask', name(p), source(p), formatWhen(p.resetAt), c.message), t('yes'), t('no'))
    .then((answer) => {
      if (answer === t('yes')) state.setChoice(p.uuid, 'yes');
      if (answer === t('no')) state.setChoice(p.uuid, 'no');
      if (answer) info(`${name(p)}: ${answer === t('yes') ? 'will continue' : 'will not continue'}`);
      tick();
    });
}

async function waitForLive(sessionId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const live = sessions.findLive(sessionId);
    if (live) return live;
    await sleep(1000);
  }
  return undefined;
}

// The session's process is gone: start it again where it lived, then use its new socket.
async function reopen(p) {
  if (p.entrypoint === 'claude-desktop') throw new Error(t('errDesktopClosed'));
  if (p.entrypoint === 'claude-vscode') {
    info(`${name(p)}: process is gone, reopening the panel`);
    await vscode.commands.executeCommand('claude-vscode.primaryEditor.open', p.sessionId);
  } else {
    info(`${name(p)}: process is gone, resuming in a terminal`);
    const term = vscode.window.createTerminal({ name: t('resumeTerminal', name(p)), cwd: p.cwd });
    term.sendText(`claude --resume ${p.sessionId}`);
    term.show(true);
  }
  const live = await waitForLive(p.sessionId, REOPEN_TIMEOUT_MS);
  if (!live) throw new Error(t('errReopenTimeout', REOPEN_TIMEOUT_MS / 1000));
  await sleep(2000); // let it finish loading the transcript before the prompt arrives
  return live;
}

async function deliver(live, transcript, text) {
  if (!sessions.protocolSupported(live)) throw new Error(t('errProtocol', live.peerProtocol));
  const before = fileSize(transcript);
  await sendToSocket(live.messagingSocketPath, text, { token: sessions.readPeerToken(live) });
  if (!(await waitForTranscript(transcript, before, text))) throw new Error(t('errNotInTranscript'));
}

async function continueSession(p, { manual = false } = {}) {
  const c = cfg();
  if (!state.claimHandled(p.uuid, `${p.sessionId} ${p.cwd}`)) return;
  info(`${name(p)}: sending "${c.message}" to ${source(p)} session ${p.sessionId}`);
  try {
    const live = sessions.findLive(p.sessionId) ?? (await reopen(p));
    await deliver(live, p.file, c.message);
    info(`${name(p)}: delivered ✓`);
    vscode.window.setStatusBarMessage(t('sent', name(p)), 15000);
  } catch (e) {
    // Stays handled: a failure is never retried on its own, only from the notification.
    info(`${name(p)}: failed — ${e.message}`);
    vscode.window.showWarningMessage(t('failed', name(p), e.message), t('retry'), t('openSession')).then((a) => {
      if (a === t('retry')) {
        state.releaseHandled(p.uuid);
        continueSession(p, { manual: true }).then(tick);
      }
      if (a === t('openSession') && p.entrypoint === 'claude-vscode') {
        vscode.commands.executeCommand('claude-vscode.primaryEditor.open', p.sessionId, c.message);
      }
    });
  }
  if (manual) tick();
}

async function tick() {
  if (busy) return;
  busy = true;
  try {
    const c = cfg();
    windows.heartbeat(process.pid, (vscode.workspace.workspaceFolders || []).map((f) => f.uri.fsPath), startedAt);
    if (!c.enabled) {
      mine = [];
    } else {
      const all = scan({ maxLateMs: c.maxLateMs, isDone: state.isHandled });
      const wins = windows.listWindows();
      mine = all.filter((p) => windows.ownerPid(p.cwd, wins) === process.pid && !state.isTestSession(p.sessionId));
      for (const p of mine) {
        if (choiceOf(p) === undefined && state.claimAsked(p.uuid)) ask(p);
      }
    }
    updateStatus();
    updateKeepAwake();
    for (const p of mine) {
      if (choiceOf(p) === 'yes' && Date.now() >= p.resetAt + c.delayMs) await continueSession(p);
    }
  } catch (e) {
    info(`error: ${e.stack || e}`);
  } finally {
    busy = false;
  }
}

async function chooseSessions() {
  if (!mine.length) return vscode.window.showInformationMessage(t('noneWaiting'));
  const c = cfg();
  const items = mine.map((p) => ({
    label: name(p),
    description: `${source(p)} · ${t('resets', formatWhen(p.resetAt))} · ${t('in', formatLeft(p.resetAt + c.delayMs - Date.now()))}`,
    detail: p.text,
    picked: choiceOf(p) === 'yes',
    p,
  }));
  const picked = await vscode.window.showQuickPick(items, { canPickMany: true, title: t('pickTitle', c.message) });
  if (!picked) return;
  const yes = new Set(picked.map((i) => i.p.uuid));
  for (const p of mine) state.setChoice(p.uuid, yes.has(p.uuid) ? 'yes' : 'no');
  info(`choice: ${mine.map((p) => `${name(p)}=${yes.has(p.uuid) ? 'yes' : 'no'}`).join(', ')}`);
  tick();
}

async function sendNow() {
  if (!mine.length) return vscode.window.showInformationMessage(t('noneWaiting'));
  const c = cfg();
  const item = await vscode.window.showQuickPick(
    mine.map((p) => ({ label: name(p), description: `${source(p)} · ${t('resets', formatWhen(p.resetAt))}`, p })),
    { title: t('pickNow', c.message) },
  );
  if (!item) return;
  state.setChoice(item.p.uuid, 'yes');
  await continueSession(item.p, { manual: true });
}

// Starts a throwaway interactive `claude` in a terminal and delivers a test prompt into it.
async function testDelivery() {
  const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!folder) return vscode.window.showWarningMessage(t('testFail', t('errNoFolder')));
  info(`test: starting claude in ${folder}`);
  vscode.window.setStatusBarMessage(t('testStarting'), 10000);
  const launchedAt = Date.now();
  const term = vscode.window.createTerminal({ name: t('terminalName'), cwd: folder });
  term.show(true);
  term.sendText('claude');

  let live;
  const deadline = Date.now() + TEST_START_TIMEOUT_MS;
  while (!live && Date.now() < deadline) {
    await sleep(1000);
    live = sessions
      .listLive()
      .find((s) => s.entrypoint === 'cli' && s.messagingSocketPath && (s.startedAt || 0) >= launchedAt - 2000 && windows.contains(folder, s.cwd));
  }
  if (!live) {
    info('test: no session registered');
    return vscode.window.showErrorMessage(t('testNoSession'));
  }
  // It may hit the usage limit itself; it must not then be offered for continuing.
  state.markTestSession(live.sessionId);
  await sleep(3000); // let the UI settle
  try {
    let file = findTranscript(live.sessionId);
    const before = file ? fileSize(file) : 0;
    await sendToSocket(live.messagingSocketPath, t('testMessage'), { token: sessions.readPeerToken(live) });
    // A brand-new session writes its transcript only once the first message arrives.
    const fileDeadline = Date.now() + 30000;
    while (!file && Date.now() < fileDeadline) {
      await sleep(1000);
      file = findTranscript(live.sessionId);
    }
    if (!file || !(await waitForTranscript(file, before, t('testMessage')))) throw new Error(t('errNotInTranscript'));
    info(`test: delivered to ${live.sessionId} ✓`);
    vscode.window.showInformationMessage(t('testOk'));
    setTimeout(() => term.dispose(), 20000);
  } catch (e) {
    info(`test: failed — ${e.message}`);
    vscode.window.showErrorMessage(t('testFail', e.message));
  }
}

async function toggle() {
  const c = vscode.workspace.getConfiguration('claudeAutoContinue');
  await c.update('enabled', !c.get('enabled', true), vscode.ConfigurationTarget.Global);
}

async function menu() {
  const c = cfg();
  const items = [
    { label: t('menuChoose'), run: chooseSessions },
    { label: t('menuNow'), run: sendNow },
    { label: t('menuTest'), run: testDelivery },
    { label: c.enabled ? t('menuOff') : t('menuOn'), run: toggle },
    { label: t('menuLog'), run: () => log.show() },
    { label: t('menuSettings'), run: () => vscode.commands.executeCommand('workbench.action.openSettings', 'claudeAutoContinue') },
  ];
  const pick = await vscode.window.showQuickPick(items, { title: 'Claude Code Auto-Continue' });
  if (pick) await pick.run();
}

function activate(context) {
  setLanguage(vscode.env.language);
  log = vscode.window.createOutputChannel('Claude Code Auto-Continue');
  statusItem = vscode.window.createStatusBarItem('claudeAutoContinue.status', vscode.StatusBarAlignment.Right, 1000);
  statusItem.name = 'Claude Code Auto-Continue';
  statusItem.command = 'claudeAutoContinue.menu';

  context.subscriptions.push(
    log,
    statusItem,
    vscode.commands.registerCommand('claudeAutoContinue.menu', menu),
    vscode.commands.registerCommand('claudeAutoContinue.chooseSessions', chooseSessions),
    vscode.commands.registerCommand('claudeAutoContinue.sendNow', sendNow),
    vscode.commands.registerCommand('claudeAutoContinue.testDelivery', testDelivery),
    vscode.commands.registerCommand('claudeAutoContinue.toggle', toggle),
    vscode.commands.registerCommand('claudeAutoContinue.showLog', () => log.show()),
    vscode.workspace.onDidChangeConfiguration((e) => e.affectsConfiguration('claudeAutoContinue') && tick()),
    vscode.workspace.onDidChangeWorkspaceFolders(() => tick()),
  );

  const timer = setInterval(tick, TICK_MS);
  context.subscriptions.push({
    dispose: () => {
      clearInterval(timer);
      keepAwake?.kill();
      windows.leave(process.pid);
    },
  });

  state.prune();
  info(`started (pid ${process.pid})`);
  tick();
}

function deactivate() {
  keepAwake?.kill();
  windows.leave(process.pid);
}

module.exports = { activate, deactivate };
