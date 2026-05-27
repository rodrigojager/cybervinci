# AI Output Cleaner

Separated package:

- `packages/ai-output-cleaner` → `@cybervinci/ai-output-cleaner`

Purpose: deterministic filtering/interception of AI/tool/CLI output before it reaches prompts or API requests, reducing noisy token usage.

Apply over Baseline by copying the package into `Baseline/theia/packages/`, adding `@cybervinci/ai-output-cleaner` to the target app dependencies, then rebuilding Theia.

No direct Theia core override was copied for this feature.

Installer example:

```powershell
pwsh ../tools/install-feature.ps1 -Feature "AI Output Cleaner" -TargetTheia "../Baseline/theia" -WithDependencies
```
