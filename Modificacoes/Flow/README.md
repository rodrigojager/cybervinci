# Flow

Separated package/examples:

- `packages/flow` → `@cybervinci/flow`
- `examples/flow-visual-studio-host`
- `examples/flow-vscode-host`
- `examples/playwright/scripts/start-flow-e2e.js`
- `examples/playwright/src/tests/flow.test.ts`

Purpose: block/workflow editor similar to N8N, with workflow states, runs, human gates, artifacts, and canvas UI.

Requires:

- `Branding/packages/branding`
- `Codex-Provider/packages/codex-provider`
- `Memory/packages/memory`

Apply by copying the package into `Baseline/theia/packages/`, adding `@cybervinci/flow` and its required CyberVinci packages to the app dependencies, then rebuilding.

Installer example:

```powershell
pwsh ../tools/install-feature.ps1 -Feature "Flow" -TargetTheia "../Baseline/theia" -WithDependencies
```
