# Memory

Separated packages:

- `packages/memory` → `@cybervinci/memory`
- `packages/memory-roslyn` → `@cybervinci/memory-roslyn`

Patch/override layer:

- `patches/theia-overrides.patch` applies Memory-owned hooks against `Baseline/theia`.
- `overrides/theia/packages/ai-core/...` for skill discovery/variable hooks.
- `overrides/theia/packages/ai-ide/...` for `/remember`, workspace functions, context validation, and workspace preferences.

Moved out/removed:

- Duplicate `ai-chat-ui` overrides were removed from Memory. The chat input/style copies live in `AI-Providers`; the unchanged `chat-capabilities-panel.tsx` copy was deleted.

Purpose: project learning/memory, SQLite-backed repositories, code graph, vector-ish retrieval, context cart, event capture, skill suggestions, and optional Roslyn sidecar for C# semantic analysis.

Requires:

- `Library/packages/library`
- `Branding/packages/branding`

Apply package-only first. Apply `patches/theia-overrides.patch` only for AI core/AI IDE hooks that are not yet exposed as extension contribution points.
