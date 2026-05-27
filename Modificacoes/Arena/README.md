# Arena

Separated package:

- `packages/arena` → `@cybervinci/arena`

Purpose: compare prompt/markdown/skill variants with the same runner/model, evaluate outputs, and generate/refine a merged third candidate.

Requires:

- `Branding/packages/branding` because the package imports the CyberVinci menu/product shell contract.

Apply by copying the package into `Baseline/theia/packages/`, adding `@cybervinci/arena` and `@cybervinci/branding` to the app dependencies, then rebuilding.

Installer example:

```powershell
pwsh ../tools/install-feature.ps1 -Feature "Arena" -TargetTheia "../Baseline/theia" -WithDependencies
```
