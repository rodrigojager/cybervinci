# CyberVinci AI Providers

This package adds the CyberVinci AI Providers extension to Theia AI chat.

The package is intentionally separate from Theia core and from `@theia/ai-codex`.
It can be carried forward across Theia upgrades as a CyberVinci extension instead
of a direct Theia patch.

It exposes:

- a Theia `LanguageModel` shown as `CyberVinci AI Provider`;
- direct API adapters for OpenRouter, OpenCode Go, and OpenCode Zen;
- CLI adapters for Codex CLI, OpenCode CLI, Gemini CLI, Claude Code CLI, and
  Cursor CLI;
- `CodexProviderRuntimeProvider`, the historical runtime provider interface used
  by existing CyberVinci packages.

The package name is `@cybervinci/ai-providers`, the Theia extension lives in
`packages/ai-providers`, and the language-model id is `cybervinci-ai-provider`.
Legacy `codex-provider` prompt/provider aliases remain only as compatibility
shims for existing saved prompts or Flow configs.

## Usage

Open **CyberVinci AI Providers: Configure**, choose a provider, then choose a
model from the searchable provider/model picker.

Direct providers use API keys configured in CyberVinci or environment variables:

- OpenRouter: `OPENROUTER_API_KEY`
- OpenCode Go and OpenCode Zen: `OPENCODE_API_KEY`

CLI providers are detected from PATH or their configured executable path.
