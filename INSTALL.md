# Installing separated CyberVinci modules onto a Theia baseline

The goal is that each feature folder can be reapplied to `Baseline/theia` in an organized way.

## Recommended command

From `C:\Users\Rodrigo\Desktop\CyberVinci`:

```powershell
pwsh ./tools/install-feature.ps1 -Feature "Codex" -TargetTheia "Baseline/theia" -WithDependencies
```

Use `-DryRun` first to preview copies and patches:

```powershell
pwsh ./tools/install-feature.ps1 -Feature "Codex" -TargetTheia "Baseline/theia" -WithDependencies -DryRun
```

## What the installer does

For a selected feature it:

1. Copies `packages/*` into `<target>/packages/`.
2. Copies `vendor/*` into `<target>/vendor/`.
3. Copies `examples/*` into `<target>/examples/`.
4. Applies `patches/*.patch` from the Theia root.

Feature-specific Playwright tests are stored under each feature's `examples/playwright/...` subtree and are copied back to the normal Theia `examples/playwright` location by the installer.

Generated folders are skipped during copy: `node_modules`, `lib`, `coverage`, `.nyc_output`, `obj`, `bin`, caches, logs, and TypeScript build info.

## Dependency model

`-WithDependencies` installs prerequisites first:

- `Distribution` is the private CyberVinci patch layer applied before feature packages.
- `Branding` depends on `Distribution`.
- `Codex` depends on `Distribution`, `Branding`, `Codex-Provider`.
- `Flow` depends on `Distribution`, `Branding`, `Codex-Provider`, `Library`, `Memory`.
- `Memory` depends on `Distribution`, `Branding`, `Library`.

## After installing

From the target Theia root:

```powershell
npm install
npm run compile
npm run build:browser
```

For Electron:

```powershell
npm run build:electron
```
