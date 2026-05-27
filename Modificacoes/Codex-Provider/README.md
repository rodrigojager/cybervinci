# Codex-Provider

Separated package:

- `packages/codex-provider` → `@cybervinci/codex-provider`

Patch/override layer:

- `patches/theia-overrides.patch` applies Codex-provider-owned AI chat/agent/provider changes against `Baseline/theia`.
- `overrides/theia/packages/ai-chat*` and `overrides/theia/packages/ai-ide*` contain source snapshots for those patches.
- These overlays include CyberVinci-specific AI configuration, chat welcome, command agents, tool rendering, and provider UX changes.

Moved out:

- `packages/ai-ide/src/browser/frontend-module.ts` moved to `Distribution/` because it aggregates central DI bindings across multiple features.

Purpose: expose Codex Provider/app-server as a provider/runtime for Theia AI chat.

Tests/resources:

- `examples/playwright/src/tests/cybervinci-codex-acceptance.test.ts`
- `overrides/theia/examples/api-tests/src/cybervinci-codex-provider.spec.js`

Apply the package first. Apply `patches/theia-overrides.patch` only if the provider behavior or UI is missing after a package-only install.
