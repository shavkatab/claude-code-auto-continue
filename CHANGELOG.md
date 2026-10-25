# Changelog

## 0.4.0

- A choice now belongs to the session: chosen once, it is continued after every limit reset until you untick it.
  Choices made per limit in 0.3.0 are carried over.
- The chooser lists running sessions too, with their titles, so you can pick them before they hit a limit.
- Usage reads `5h/20% - wk/30%`; after a reset without newer numbers it shows `~0%` instead of `—`.

## 0.3.0

- Status bar shows how much of the 5-hour and weekly plan limits is used (from Claude Code's own cache in
  `~/.claude.json`; no credentials, no network). Setting `claudeAutoContinue.showUsage`.

## 0.2.1

- Icon; the release workflow builds the .vsix and attaches it to the GitHub release.
- Test Delivery sessions are no longer offered for continuing when they hit the limit themselves.

## 0.2.0

- Delivers the prompt through the session's own messaging socket instead of typing it: no Accessibility
  permission, works with the screen locked and VS Code in the background.
- Covers Claude Code in the VS Code panel, the terminal and Claude Desktop; 5-hour and weekly limits.
- Nothing is sent unless you choose the session (notification or the status bar list).
- Closed sessions are reopened (VS Code panel) or resumed (`claude --resume` in a terminal).
- **Test Delivery** command.
- Windows support; English and Russian UI.

## 0.1.0

- First version: macOS only, VS Code panel only, pasted the prompt with simulated keystrokes.
