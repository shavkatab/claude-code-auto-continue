// UI strings. Russian when VS Code runs in Russian, English otherwise.
const strings = {
  en: {
    defaultMessage: 'continue',
    testMessage: 'This is a Claude Code Auto-Continue delivery test. Reply with one word: ok',
    statusOff: '$(debug-pause) Auto-Continue off',
    statusIdle: '$(check) Auto-Continue',
    statusArmed: '$(watch) Claude: "{0}" in {1}',
    statusArmedMore: '$(watch) Claude: "{0}" in {1} ({2}/{3})',
    statusUndecided: '$(question) Claude: {0} waiting for your choice',
    tooltipIdle: 'No Claude Code session is stopped on a usage limit.',
    tooltipOff: 'Claude Code Auto-Continue is turned off.',
    tooltipHeader: '**Stopped on a usage limit:**',
    tooltipRow: '- {0} `{1}` ({2}) — resets {3}',
    tooltipClick: 'Click to choose which sessions to continue.',
    yesMark: '✅',
    noMark: '⏸',
    askMark: '❔',
    ask: 'Claude Code: "{0}" ({1}) hit the usage limit, resets {2}. Send "{3}" after the reset?',
    yes: 'Continue',
    no: 'No',
    menuChoose: '$(checklist) Choose sessions to continue…',
    menuNow: '$(play) Send now…',
    menuTest: '$(beaker) Test delivery',
    menuOn: '$(debug-start) Turn on',
    menuOff: '$(debug-pause) Turn off',
    menuLog: '$(output) Show log',
    menuSettings: '$(gear) Settings',
    pickTitle: 'Checked sessions get "{0}" after the reset',
    pickNow: 'Which session should get "{0}" right now?',
    noneWaiting: 'Claude Code Auto-Continue: no session is waiting for a limit reset.',
    resets: 'resets {0}',
    in: 'in {0}',
    now: 'now',
    sent: '$(check) Claude: "{0}" continued',
    failed: 'Claude Code Auto-Continue could not continue "{0}": {1}',
    retry: 'Retry',
    openSession: 'Open session',
    errProtocol: 'unsupported Claude Code messaging protocol ({0}); update the extension',
    errNotInTranscript:
      'the message did not reach the session within 30 s. If the session runs with bypassPermissions, Claude Code holds messages from outside for review — approve it there, or set "crossSessionInbound": "accept" in Claude Code settings',
    errDesktopClosed: 'the Claude Desktop session is closed; open it and type the message yourself',
    errReopenTimeout: 'the session did not start within {0} s',
    errNoFolder: 'open a folder first: the test session runs in it',
    testStarting: 'Starting a test Claude Code session in the terminal…',
    testNoSession: 'Test failed: the test session did not start within 60 s. Is `claude` installed and on PATH?',
    testOk: '✓ Delivery works: the test message reached the Claude Code session. The test terminal closes in 20 s.',
    testFail: 'Test failed: {0}',
    terminalName: 'Claude Auto-Continue test',
    usageText: '$(dashboard) 5h {0} · week {1}',
    usageTooltipFive: '**5-hour limit:** {0} — resets {1}',
    usageTooltipWeek: '**Weekly limit:** {0} — resets {1}',
    usageTooltipUnknown: 'not known yet (the window has reset)',
    usageTooltipFetched: 'As Claude Code last saw it: {0} ({1} ago).',
    usageTooltipStale: 'Claude Code refreshes these numbers when it talks to the server; they may be behind.',
    usageNoData: 'no data',
    resumeTerminal: 'Claude: {0}',
  },
  ru: {
    defaultMessage: 'продолжай',
    testMessage: 'Это проверка Claude Code Auto-Continue. Ответь одним словом: ок',
    statusOff: '$(debug-pause) Auto-Continue выкл',
    statusIdle: '$(check) Auto-Continue',
    statusArmed: '$(watch) Claude: «{0}» через {1}',
    statusArmedMore: '$(watch) Claude: «{0}» через {1} ({2} из {3})',
    statusUndecided: '$(question) Claude: {0} ждут вашего выбора',
    tooltipIdle: 'Ни одна сессия Claude Code не стоит на лимите.',
    tooltipOff: 'Claude Code Auto-Continue выключен.',
    tooltipHeader: '**Остановились на лимите:**',
    tooltipRow: '- {0} `{1}` ({2}) — сброс {3}',
    tooltipClick: 'Нажмите, чтобы выбрать, какие сессии продолжить.',
    yesMark: '✅',
    noMark: '⏸',
    askMark: '❔',
    ask: 'Claude Code: «{0}» ({1}) упёрлась в лимит, сброс {2}. Отправить «{3}» после сброса?',
    yes: 'Продолжить',
    no: 'Нет',
    menuChoose: '$(checklist) Выбрать сессии для продолжения…',
    menuNow: '$(play) Отправить сейчас…',
    menuTest: '$(beaker) Проверить доставку',
    menuOn: '$(debug-start) Включить',
    menuOff: '$(debug-pause) Выключить',
    menuLog: '$(output) Показать лог',
    menuSettings: '$(gear) Настройки',
    pickTitle: 'Отмеченные сессии получат «{0}» после сброса',
    pickNow: 'В какую сессию отправить «{0}» прямо сейчас?',
    noneWaiting: 'Claude Code Auto-Continue: нет сессий, ждущих сброса лимита.',
    resets: 'сброс {0}',
    in: 'через {0}',
    now: 'сейчас',
    sent: '$(check) Claude: «{0}» продолжена',
    failed: 'Claude Code Auto-Continue не смог продолжить «{0}»: {1}',
    retry: 'Повторить',
    openSession: 'Открыть сессию',
    errProtocol: 'неподдерживаемый протокол сообщений Claude Code ({0}); обновите расширение',
    errNotInTranscript:
      'сообщение не дошло до сессии за 30 с. Если сессия работает в режиме bypassPermissions, Claude Code придерживает сообщения извне на проверку — одобрите его в сессии или поставьте "crossSessionInbound": "accept" в настройках Claude Code',
    errDesktopClosed: 'сессия Claude Desktop закрыта; откройте её и напишите сообщение сами',
    errReopenTimeout: 'сессия не запустилась за {0} с',
    errNoFolder: 'сначала откройте папку: тестовая сессия запускается в ней',
    testStarting: 'Запускаю тестовую сессию Claude Code в терминале…',
    testNoSession: 'Проверка не прошла: тестовая сессия не запустилась за 60 с. Установлен ли `claude` и есть ли он в PATH?',
    testOk: '✓ Доставка работает: тестовое сообщение дошло до сессии Claude Code. Тестовый терминал закроется через 20 с.',
    testFail: 'Проверка не прошла: {0}',
    terminalName: 'Проверка Auto-Continue',
    usageText: '$(dashboard) 5ч {0} · нед {1}',
    usageTooltipFive: '**5-часовой лимит:** {0} — сброс {1}',
    usageTooltipWeek: '**Недельный лимит:** {0} — сброс {1}',
    usageTooltipUnknown: 'пока неизвестно (окно уже сбросилось)',
    usageTooltipFetched: 'Данные Claude Code от {0} ({1} назад).',
    usageTooltipStale: 'Claude Code обновляет эти цифры, когда обращается к серверу; они могут отставать.',
    usageNoData: 'нет данных',
    resumeTerminal: 'Claude: {0}',
  },
};

let lang = 'en';

function setLanguage(vscodeLanguage) {
  lang = String(vscodeLanguage || '').toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

function t(key, ...args) {
  const s = strings[lang][key] ?? strings.en[key] ?? key;
  return s.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ''));
}

function formatLeft(ms) {
  if (ms <= 0) return t('now');
  const m = Math.ceil(ms / 60000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  const [dd, hh, min] = lang === 'ru' ? ['д', 'ч', 'м'] : ['d', 'h', 'm'];
  if (d) return `${d}${dd} ${h}${hh}`;
  return h ? `${h}${hh} ${String(mm).padStart(2, '0')}${min}` : `${mm}${min}`;
}

function formatWhen(ts, now = Date.now()) {
  const date = new Date(ts);
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const sameDay = new Date(now).toDateString() === date.toDateString();
  return sameDay ? time : `${date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} ${time}`;
}

module.exports = { t, setLanguage, formatLeft, formatWhen, strings };
