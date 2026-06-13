# Codex

Separated package:

- `packages/codex` → `@cybervinci/codex`

Purpose: dedicated CyberVinci Codex UI, sidebar/editor/webview host bridge, static webview resources, Git/worktree support, and Electron bridge.

Requires:

- `AI-Providers/packages/ai-providers`
- `Branding/packages/branding`

Apply by copying the package into `Baseline/theia/packages/`, adding `@cybervinci/codex`, `@cybervinci/ai-providers`, and `@cybervinci/branding` to the target app dependencies, then rebuilding.

Installer example:

```powershell
pwsh ../tools/install-feature.ps1 -Feature "Codex" -TargetTheia "../Baseline/theia" -WithDependencies
```
