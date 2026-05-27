# @cybervinci/codex

Native Codex integration for CyberVinci with **100% functional parity target** against the official VS Code extension (`OpenAI.chatgpt` v26.5513.21555).

## Architecture

- **UI:** Official Codex webview assets copied from `plugins.disabled/OpenAI.chatgpt/extension/webview` at build time.
- **Host bridge:** TypeScript IPC router (`CodexWebviewHostService`) replicating `extension.js` message handling.
- **Runtime:** `@cybervinci/codex-provider` for app-server, auth, approvals, and thread follower RPCs.
- **Electron:** `electron-main` module for hotkey window, dictation, and `electronBridge` shared objects.

## Build

```bash
npm run copy:webview   # copies official assets
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

See [docs/codex-parity-matrix.md](../../docs/codex-parity-matrix.md) for feature-by-feature status.

## Reference

Official extension (read-only): `plugins.disabled/OpenAI.chatgpt/extension/`
