# AI-Providers

Separated package:

- `packages/ai-providers` -> `@cybervinci/ai-providers`

Patch/override layer:

- `patches/theia-overrides.patch` applies CyberVinci AI Providers-owned AI chat/agent/provider changes against `Baseline/theia`.
- `overrides/theia/packages/ai-chat*` and `overrides/theia/packages/ai-ide*` contain source snapshots for those patches.
- These overlays include CyberVinci-specific AI configuration, chat welcome, command agents, tool rendering, and provider UX changes.

Moved out:

- `packages/ai-ide/src/browser/frontend-module.ts` moved to `Distribution/` because it aggregates central DI bindings across multiple features.

Purpose: expose CyberVinci AI Providers as a provider/runtime for Theia AI chat, including direct OpenRouter/OpenCode providers and CLI runtimes such as Codex CLI.

Tests/resources:

- `examples/playwright/src/tests/cybervinci-codex-acceptance.test.ts`
- `overrides/theia/examples/api-tests/src/cybervinci-ai-providers.spec.js`

Apply the package first. Apply `patches/theia-overrides.patch` only if the provider behavior or UI is missing after a package-only install.
