# Changelog

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
