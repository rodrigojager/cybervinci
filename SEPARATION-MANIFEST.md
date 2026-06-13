# CyberVinci feature separation manifest

This workspace now has each remembered CyberVinci customization separated from `theia/` into feature folders. `Baseline/` was not edited.

## Layout convention

- `packages/`: Theia extension packages copied from the modified `theia/packages` tree.
- `vendor/`: vendored third-party source needed by that feature.
- `Modificacoes/Skills/System/`: Markdown skills used by CyberVinci or bundled extensions as internal system behavior. The installer copies these into the target Theia root as `Skills/System/*`.
- `Modificacoes/Skills/Auto/`: imported user utility skills that may be discovered automatically by topic or intent.
- `Modificacoes/Skills/Manual/`: imported user utility skills that must be listed/searched only through an explicit manual selection flow and loaded only when the user names or chooses one.
- root `Agents/`: reserved for imported agent/personality Markdown files.
- `examples/`: feature-specific example/host applications.
- `overrides/theia/`: source snapshots for changes that still patch existing Theia packages.
- `patches/`: normalized `git apply` patches generated from `Baseline/theia` to the matching `overrides/theia` snapshot. These are the preferred reinstall artifact for patched upstream files.

Generated artifacts were intentionally not copied: `lib/`, `coverage/`, `.nyc_output/`, `node_modules/`, `obj/`, `bin`, caches, logs, and `tsconfig.tsbuildinfo`.

Also intentionally excluded as non-source/runtime artifacts: local logs/screenshots, temporary smoke-test folders, `src-gen`, Playwright/Allure run outputs, native build outputs under `dev-packages/ffmpeg/build`, and downloaded VSIX binaries.

## Feature mapping

| Folder | Main content | Notes |
| --- | --- | --- |
| `Distribution/` | CyberVinci distribution patch layer | Private overlay for app composition, build/runtime glue, and release-level customizations. Install first when recreating the full CyberVinci app. |
| `AI Output Cleaner/` | `@cybervinci/ai-output-cleaner` | Deterministic prompt/tool-output filtering/interception. |
| `Arena/` | `@cybervinci/arena` | Prompt/markdown/skill comparison and merge arena. Requires Branding/product shell. |
| `Branding/` | `@cybervinci/branding` + branding overlays | Shared CyberVinci branding boundary: name, icons, welcome, splash, menus, and core branding patches. |
| `Codex/` | `@cybervinci/codex` | Codex UI/webview integration. Requires Codex-Provider and Branding. |
| `Codex-Provider/` | `@cybervinci/codex-provider` + AI chat/AI IDE overlays | Codex Provider as Theia AI provider/chat runtime. |
| `Design/` | `@cybervinci/openpencil-extension` + `vendor/openpencil` | OpenPencil integration. Requires Branding/product shell. |
| `Builder/` | `@cybervinci/builder-*` packages | Mantine/Puck/RJSF visual builder stack. Requires Branding/product shell. |
| `CSharp Kit/` | `@cybervinci/csharp-kit` | Decoupled C#/.NET project, debug, test, NuGet, Razor-aware workflow and provider-neutral AI context layer. Requires Branding, Memory/Roslyn and Razor Visual Editor. |
| `Flow/` | `@cybervinci/flow` + flow examples/tests | N8N-like workflow canvas. Requires Branding, Memory, and Codex-Provider. |
| `Library/` | `@cybervinci/library` | Context7-like local/versioned docs indexing. Requires Branding/product shell. |
| `Memory/` | `@cybervinci/memory`, `@cybervinci/memory-roslyn` + memory overlays | SQLite/vector-ish memory, graph, context cart, skill suggestions. Requires Library and Branding. |
| `Razor Visual Editor/` | `@cybervinci/razor-visual-editor` | GrapesJS visual editor for `.html`, `.htm` and `.cshtml`, with conservative Razor token protection and safe save pipeline. |

## Applying over a fresh Theia baseline

1. Prefer the installer:
   ```powershell
   pwsh ./tools/install-feature.ps1 -Feature "<Feature Name>" -TargetTheia "Baseline/theia" -WithDependencies
   ```
2. Or manually copy desired `packages/*` folders into `<baseline-theia>/packages/`.
3. If the feature has `vendor/*`, copy it to the same relative location in `<baseline-theia>/vendor/`.
4. If the feature declares system skills, copy its `Modificacoes/Skills/System/*` subtree to `<baseline-theia>/Skills/System/*`. User utility skills stay under `Modificacoes/Skills/Auto` or `Modificacoes/Skills/Manual` unless a product feature explicitly installs a compatible catalog/indexer.
5. Apply the feature's `patches/*.patch` from the target Theia root, for example:
   ```powershell
   git apply --check ../../Branding/patches/theia-overrides.patch
   git apply ../../Branding/patches/theia-overrides.patch
   ```
6. Add/verify the packages in the target app `examples/browser/package.json` or `examples/electron/package.json` dependencies.
7. Run Theia reference regeneration/build from the baseline root:
   - `npm install`
   - `npm run compile`
   - `npm run build:browser` or `npm run build:electron`
8. Use `overrides/theia/*` only as source/reference if a patch needs to be regenerated.

## Upgrade boundary

The main upgrade-safe path is package installation only. Anything under `overrides/theia/` is intentionally separated so it can be reviewed, minimized, or replaced by extension contribution points before a Theia upgrade.
