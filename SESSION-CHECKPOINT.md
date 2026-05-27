# CyberVinci separation checkpoint

Use this file after restarting opencode to continue from the current point.

## Restart instruction

The restart is intentional to refresh opencode config/provider/model assignments for agents such as `fixer`, `explorer`, and `librarian`.

After restart, start fresh specialist sessions instead of resuming old ones if the goal is to use the newly configured providers.

Recommended first prompt in the new session:

```text
Read SESSION-CHECKPOINT.md and continue from this state. Do not reuse old explorer/fixer/librarian/oracle sessions unless I explicitly ask; start fresh subagents so the updated provider config is used.
```

## User goal

Separate and reorganize CyberVinci customizations on top of Theia into modular, reinstallable, upgrade-friendly feature folders, with internal names aligned to the folder/domain language, while preserving functionality, appearance, behavior, and compatibility aliases where useful.

## Constraints and decisions

- Do not edit `C:\Users\Rodrigo\Desktop\CyberVinci\Baseline` except for safe read/check commands.
- `Baseline/theia` is the clean baseline target used for patch validation and installer dry-runs.
- `theia` is the messy/original modified reference tree.
- `Design/vendor/openpencil` is third-party and intentionally excluded from internal renaming.
- Prefer private CyberVinci distribution overlay: clean upstream Theia + CyberVinci modules/patches reapplied locally.
- Do not attempt upstream PRs for this work.
- Preserve behavior, UI, commands, service paths, and user-data compatibility where reasonable.
- Legacy aliases are acceptable and intentional when they reduce breakage risk.
- Exclude generated/runtime artifacts from feature extraction: `node_modules`, `lib`, `coverage`, `.nyc_output`, `src-gen`, `allure-results`, `test-results`, logs, screenshots, smoke-test folders, native outputs, downloaded VSIX binaries.

## Current status

Status: complete enough to pause/restart.

Final checks already passed:

- `git -C "Baseline/theia" apply --check` succeeded for all regenerated patches.
- Installer dry-runs passed for:
  - `Codex`
  - `Flow`
  - legacy alias `Agency Studio`
- `git -C "Baseline/theia" status --short` returned no output.
- Final rename audit via `explorer` passed: no compile/install-breaking stale names found; remaining old names are intentional compatibility aliases.

Important caveat:

- The outer git repo is rooted at `C:\`, and `CyberVinci/` appears untracked from that repo, so a normal project-scoped diff is not useful. The nested `Baseline/theia` repo is clean.

## Feature folder layout

Main separated folders:

- `Distribution/` — private CyberVinci distribution patch layer.
- `AI Output Cleaner/` — `@cybervinci/ai-output-cleaner`.
- `Arena/` — `@cybervinci/arena`.
- `Branding/` — `@cybervinci/branding`.
- `Builder/` — `@cybervinci/builder-*` packages.
- `Codex/` — `@cybervinci/codex`.
- `Codex-Provider/` — `@cybervinci/codex-provider`.
- `Design/` — `@cybervinci/openpencil-extension` + OpenPencil vendor integration.
- `Flow/` — `@cybervinci/flow`.
- `Library/` — `@cybervinci/library`.
- `Memory/` — `@cybervinci/memory`, `@cybervinci/memory-roslyn`.

`Common/` was renamed to `Distribution/`; installer keeps `Common -> Distribution` alias for compatibility.

## Renames already applied

- `Flow/packages/agency-studio` -> `Flow/packages/flow`
- `Builder/packages/cvui-*` -> `Builder/packages/builder-*`
- `Library/packages/ai-docs-context` -> `Library/packages/library`
- `Memory/packages/project-intelligence` -> `Memory/packages/memory`
- `Memory/packages/project-intelligence-roslyn` -> `Memory/packages/memory-roslyn`
- `Arena/packages/prompt-arena` -> `Arena/packages/arena`
- `AI Output Cleaner/packages/cybervinci-ai-output-cleaner` -> `AI Output Cleaner/packages/ai-output-cleaner`
- `Codex-Provider/packages/ai-codex-cli` -> `Codex-Provider/packages/codex-provider`
- `Branding/packages/cybervinci-product-shell` -> `Branding/packages/branding`
- `Codex/packages/cybervinci-codex-extension` -> `Codex/packages/codex`

Package names updated to `@cybervinci/*`, including:

- `@cybervinci/flow`
- `@cybervinci/builder`
- `@cybervinci/builder-*`
- `@cybervinci/library`
- `@cybervinci/memory`
- `@cybervinci/memory-roslyn`
- `@cybervinci/arena`
- `@cybervinci/ai-output-cleaner`
- `@cybervinci/codex-provider`
- `@cybervinci/branding`
- `@cybervinci/codex`

## Compatibility aliases intentionally retained

Remaining old names are intentional compatibility aliases, not cleanup leftovers:

- Builder:
  - `.builder.json` and legacy `.cvui.json` accepted.
  - Legacy commands `cvui-builder.*` retained.
- Arena:
  - Legacy command `promptArena.newDuel` retained.
  - Legacy service path `/services/prompt-arena` retained.
- Flow:
  - Legacy command `agency-studio.open` retained.
  - Legacy service path `/services/agency-studio` retained.
- Memory:
  - Legacy commands `project-intelligence.*` retained.
  - Legacy service path `/services/project-intelligence` retained.
  - `legacy_memories` table retained for user-data migration.
- AI Output Cleaner:
  - Legacy service path `/services/cybervinci-output-cleaner` retained.
  - Legacy disabled env var constant retained.
- Installer:
  - `Common -> Distribution` alias retained.
- Design:
  - `openpencil-cybervinci-extension` folder/package naming is non-critical and was intentionally not changed during this pass.

## Patches

`Distribution/patches/` was split into:

- `001-root-and-app-composition.patch`
- `002-build-and-dev-tooling.patch`
- `003-core-bootstrap-and-runtime.patch`
- `004-platform-package-fixes.patch`
- `005-ai-ide-agent-aggregation.patch`
- `README.md`

Regenerated/validated feature patches:

- `Branding/patches/theia-overrides.patch`
- `Codex-Provider/patches/theia-overrides.patch`
- `Memory/patches/theia-overrides.patch`

Validation command that passed:

```powershell
git -C "Baseline/theia" apply --check "../../Distribution/patches/001-root-and-app-composition.patch" "../../Distribution/patches/002-build-and-dev-tooling.patch" "../../Distribution/patches/003-core-bootstrap-and-runtime.patch" "../../Distribution/patches/004-platform-package-fixes.patch" "../../Distribution/patches/005-ai-ide-agent-aggregation.patch" "../../Branding/patches/theia-overrides.patch" "../../Codex-Provider/patches/theia-overrides.patch" "../../Memory/patches/theia-overrides.patch"
```

## Installer

Relevant file:

- `tools/install-feature.ps1`

Behavior:

- Installs `Distribution` first when using `-WithDependencies`.
- Copies `packages/*`, `vendor/*`, and `examples/*`.
- Applies `patches/*.patch` from target Theia root.
- Skips generated/runtime folders.
- Supports legacy feature aliases such as `Agency Studio` -> `Flow` and `Common` -> `Distribution`.

Dry-runs that passed:

```powershell
pwsh ./tools/install-feature.ps1 -Feature "Codex" -TargetTheia "Baseline/theia" -WithDependencies -DryRun
pwsh ./tools/install-feature.ps1 -Feature "Flow" -TargetTheia "Baseline/theia" -WithDependencies -DryRun
pwsh ./tools/install-feature.ps1 -Feature "Agency Studio" -TargetTheia "Baseline/theia" -WithDependencies -DryRun
```

## Documentation touched at the end

Small wording cleanup was made in:

- `SEPARATION-MANIFEST.md`
  - Branding description clarified.
  - Flow description changed from agency examples/tests to flow examples/tests.
- `Flow/README.md`
  - Purpose changed from “flow studio” to “block/workflow editor”.

## Important files

- `SEPARATION-MANIFEST.md` — feature map and upgrade boundary.
- `INSTALL.md` — installer usage and dependency model.
- `tools/install-feature.ps1` — modular installer and aliases.
- `Distribution/patches/*.patch` — distribution overlay patches.
- `Branding/patches/theia-overrides.patch`
- `Codex-Provider/patches/theia-overrides.patch`
- `Memory/patches/theia-overrides.patch`
- `Builder/packages/builder/src/common/index.ts` — builder file extensions and legacy commands.
- `Builder/packages/builder/src/browser/builder-contribution.ts` — builder command aliases.
- `Memory/packages/memory-roslyn/roslyn-sidecar/CyberVinci.Memory.RoslynSidecar.csproj` — renamed Roslyn sidecar project.
- `Branding/packages/branding/src/common/branding.ts` — branding contracts/menus.
- `Flow/packages/flow/src/common/flow-protocol.ts` — flow service path and legacy path.
- `Arena/packages/arena/src/common/arena-protocol.ts` — arena service path and legacy path.
- `Memory/packages/memory/src/common/memory-protocol.ts` — memory service path and legacy path.
- `AI Output Cleaner/packages/ai-output-cleaner/src/common/ai-output-cleaner-backend-service.ts` — output cleaner service path and legacy path.

## Old resumable sessions from before provider refresh

Do not reuse these after restart unless explicitly requested, because they may keep old agent/provider context:

- `explorer`: `exp-4` — final rename audit.
- `explorer`: `exp-3` — compare package layout.
- `oracle`: `ora-1` — review rename safety.

If a new audit/review is needed after restart, start fresh sessions so the updated provider assignments are used.

## Suggested next steps after restart

There are no critical blockers. If continuing work, reasonable options are:

1. Run a fresh post-restart audit with new `explorer` provider to confirm the same result.
2. Optionally run a fresh `oracle` review for YAGNI/maintainability of compatibility aliases.
3. Optionally align `Design/packages/openpencil-cybervinci-extension` naming, but only if the user wants this; it was intentionally left alone because OpenPencil is third-party.
4. If preparing to apply to a real baseline, run actual installer on a disposable copy of `Baseline/theia`, then `npm install`, `npm run compile`, and `npm run build:browser`.

## Do not forget

- After changing opencode config, restart opencode. Running sessions keep already-loaded config.
- To verify updated providers/models, use new subagent sessions after restart.
