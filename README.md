# Claude Code Auto-Continue

**Claude Code stopped on a usage limit? Pick the sessions you want, walk away — they continue the moment the limit resets.**

> You've hit your session limit · resets 11:50am

Claude Code stops there and waits. The limit comes back in a few hours (or days, for the weekly one), but the agent
sits idle until somebody types `continue`. This VS Code extension does that for you — only in the sessions you choose.

*Unofficial — not affiliated with or endorsed by Anthropic.*

[Русская версия ниже ↓](#по-русски)

## What it does

- Watches every Claude Code session on your machine — the **VS Code panel**, the **terminal** (`claude`) and **Claude Desktop**.
- When one hits the 5-hour or weekly limit, it asks: *“Send ‘continue’ after the reset?”* — **Continue / No**.
  Nothing is sent to a session you didn't choose.
- The status bar counts down: `⌚ Claude: "continue" in 2h 55m`. Click it to change your choice, send now, or test delivery.
- A minute after the reset it sends the prompt to the session and checks that it arrived.
- Works with the **screen locked** and VS Code in the background — nothing is typed; see *How it works*.
- macOS and Linux; Windows support is written and unit-tested but not yet confirmed on a real machine —
  please run *Test Delivery* and [open an issue](https://github.com/shavkatab/claude-code-auto-continue/issues) with the result.
- No dependencies, nothing leaves your computer.

## Install

1. Download `claude-code-auto-continue-<version>.vsix` from [Releases](https://github.com/shavkatab/claude-code-auto-continue/releases).
2. VS Code (or Cursor, VSCodium) → Extensions → `…` → **Install from VSIX…**, or:
   ```bash
   code --install-extension claude-code-auto-continue-0.2.1.vsix
   ```
3. Run **Claude Auto-Continue: Test Delivery** (Cmd/Ctrl+Shift+P) once. It starts a throwaway `claude` session in
   a terminal, sends it a test prompt and tells you whether delivery works. It uses one short request.

## Usage

| | |
|---|---|
| Status bar → **Choose sessions to continue** | Tick the sessions that should get the prompt after the reset |
| **Send now** | Send the prompt to one session right away |
| **Test delivery** | Check that everything works on this machine |
| Settings → `claudeAutoContinue.*` | See below |

| Setting | Default | |
|---|---|---|
| `message` | `continue` (`продолжай` in Russian VS Code) | The prompt to send |
| `defaultChoice` | `ask` | `ask` — ask per session · `always` — continue all · `never` — only manual |
| `delaySeconds` | `60` | Wait after the reset time |
| `keepAwake` | `true` | Keep the computer from sleeping while a chosen session waits |
| `maxLateHours` | `12` | Ignore limits that reset longer ago than this |

## How it works

1. **Finding stopped sessions.** When Claude Code hits a limit it writes an error with the exact reset time
   (`quotaLimits.resetsAt`) to the session transcript in `~/.claude/projects/`. The extension reads those files
   (read-only) every 15 seconds.
2. **Delivering the prompt.** Every running Claude Code session listens on a local messaging socket
   (`~/.claude/sessions/<pid>.json` → `messagingSocketPath`) — the same channel Claude Code sessions use to message
   each other. The extension writes one line there:
   `{"type":"user","message":{"role":"user","content":"continue"}}`.
   On Windows Claude Code requires the session's peer token first; the extension reads it from the session's own
   key file in `~/.claude/sessions/`. On macOS/Linux the socket directory is private to your user, so no token is read.
3. **If the session is closed:** a VS Code panel session is reopened, a terminal session is resumed with
   `claude --resume <id>` in a VS Code terminal, a Claude Desktop session gets a notification (it can't be opened from outside).
4. **Exactly once.** Choices and "already continued" marks live in `~/.claude/auto-continue/`, shared by all
   VS Code windows. Each session is handled by one window: the one whose folder contains it.

### Limitations

- VS Code must be running and the computer awake (the extension keeps it from sleeping while it waits).
- **bypassPermissions sessions:** Claude Code holds messages from outside for your review when a session skips
  permission prompts. Approve it in the session, or set `"crossSessionInbound": "accept"` in Claude Code settings.
- The messaging socket is an internal Claude Code mechanism and may change. The extension checks the protocol
  version and tells you when it doesn't match.
- The agent sees the prompt as *“Another Claude session sent a message: continue”* — that is how Claude Code
  labels messages that arrive through the socket.
- *Test delivery* leaves one short test conversation in the project's Claude Code history.

## Development

```bash
npm test                 # node:test, no dependencies
node src/cli.js status   # which sessions are waiting, without VS Code
npm run package          # build the .vsix
```

See [SPEC.md](SPEC.md) for the design and decisions (in Russian).

---

## По-русски

**Claude Code упёрся в лимит? Отметьте нужные сессии и уходите — они продолжат сами, как только лимит сбросится.**

- Следит за всеми сессиями Claude Code: панель VS Code, терминал (`claude`), Claude Desktop.
- Когда сессия упирается в 5-часовой или недельный лимит, спрашивает: «Отправить „продолжай“ после сброса?» —
  **Продолжить / Нет**. В сессии, которые вы не выбрали, ничего не отправляется.
- В строке состояния обратный отсчёт; по клику — выбрать сессии, отправить сейчас, проверить доставку.
- Через минуту после сброса отправляет сообщение в сессию и проверяет, что оно дошло.
- Работает при заблокированном экране: ничего не печатается, сообщение уходит через внутренний канал сессии.

**Установка:** скачайте `.vsix` из [Releases](https://github.com/shavkatab/claude-code-auto-continue/releases) →
VS Code (или Cursor, VSCodium) → Расширения → `…` → **Install from VSIX…**. Затем один раз выполните
**Claude Auto-Continue: Test Delivery** — она запустит тестовую сессию и проверит доставку.

Если VS Code на русском, по умолчанию отправляется `продолжай`, иначе — `continue`. Текст меняется в настройке
`claudeAutoContinue.message`.

Неофициальное расширение, не связано с Anthropic.

## License

[MIT](LICENSE)
