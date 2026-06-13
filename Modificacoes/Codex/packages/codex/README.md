# @cybervinci/codex

Native Codex integration for CyberVinci with **100% functional parity target** against the official VS Code extension (`OpenAI.chatgpt` v26.5513.21555).

## Architecture

- **UI:** Official Codex webview assets copied at build time from `CODEX_VSCODE_EXTENSION_WEBVIEW`, the latest installed `~/.vscode/extensions/openai.chatgpt-*/webview`, Cursor fallback, or the legacy `plugins.disabled/OpenAI.chatgpt` path.
- **Host bridge:** TypeScript IPC router (`CodexWebviewHostService`) replicating `extension.js` message handling.
- **Runtime:** `@cybervinci/codex-provider` for app-server, auth, approvals, and thread follower RPCs.
- **Electron:** `electron-main` module for hotkey window, dictation, and `electronBridge` shared objects.

## Build

```bash
npm run copy:webview   # syncs official assets
npm run compile
npm run build:browser
```

## Commands

Official `chatgpt.*` IDs are registered (with `cybervinci.codex.*` aliases):

| Command | Action |
|---------|--------|
| `chatgpt.openSidebar` | Focus Codex sidebar webview |
| `chatgpt.newChat` | New thread |
| `chatgpt.newCodexPanel` | Open detached editor tab (`openai-codex:`) |
| `chatgpt.addToThread` | Add editor selection to composer |
| `chatgpt.implementTodo` | CodeLens TODO implementation |

## Reference

Official extension reference: `OpenAI.chatgpt` v26.5513.21555.
