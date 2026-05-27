# Library

Separated package:

- `packages/library` → `@cybervinci/library`

Purpose: Context7-like local/versioned documentation context. It indexes package/library documentation so future AI requests can reuse local context instead of repeatedly querying external docs.

Requires:

- `Branding/packages/branding`

Apply by copying the package into `Baseline/theia/packages/`, adding `@cybervinci/library` and `@cybervinci/branding` to app dependencies, then rebuilding.

Installer example:

```powershell
pwsh ../tools/install-feature.ps1 -Feature "Library" -TargetTheia "../Baseline/theia" -WithDependencies
```
