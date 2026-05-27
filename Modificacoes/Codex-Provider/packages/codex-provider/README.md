# Theia Codex Provider

This package adds Codex Provider as a Theia AI provider backed by the Codex Provider
app-server.

It is intentionally separate from `@theia/ai-codex`: the existing Codex SDK
agent continues to work unchanged, while this package reuses local Codex Provider
authentication, profiles, app-server streaming, and approval requests.

The package exposes two integration surfaces:

- `codex-provider` as a Theia `LanguageModel`, so existing Theia agents can select
  Codex Provider as their model provider. This adapter runs read-only and denies
  interactive approvals by default, so it cannot hang waiting for approval UI
  that a generic language-model call cannot render.
- `CodexProviderRuntimeProvider`, a lower-level app-server runtime provider for
  future product agents that want to run Codex turns directly and own their UX
  for approvals, file changes, command output, and user input.

## Usage

Install the Codex Provider and log in:

```bash
npm install -g @openai/codex
codex login
```

Select the `codex-provider` language model for the Theia AI agents you want to run
through Codex Provider. Direct agentic integrations should inject
`CodexProviderRuntimeProvider` instead of registering Codex Provider itself as a chat
agent.
