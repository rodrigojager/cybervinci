# Distribution

CyberVinci distribution layer for applying private product customizations on top of a clean upstream Theia checkout.

This folder is intentionally **not** an upstream contribution area. It is the private overlay that turns vanilla Theia into the CyberVinci distribution before packaging a release.

## Content

- `overrides/theia/`: browsable source snapshots copied from the modified CyberVinci Theia tree.
- `patches/*.patch`: ordered, normalized `git apply` patches generated from `Baseline/theia` to the matching `overrides/theia` files.

Use patches for installation. Use overrides for review/regeneration.

## Why this exists

Some CyberVinci distribution behavior belongs above upstream Theia rather than inside a single feature extension:

- product/app composition and dependency manifests;
- generated frontend HTML/bootstrap branding;
- Electron splash/window behavior;
- central AI IDE agent aggregation;
- Theia runtime compatibility/stability fixes required by the current CyberVinci build.

Keeping this in `Distribution/` makes updates easier: upgrade `Baseline/theia`, run `git apply --check` for these patches, and only inspect conflicts that actually changed upstream.

## Install order

Install `Distribution` before feature folders that depend on branded startup, app manifests, or central AI agent wiring.

```powershell
pwsh ./tools/install-feature.ps1 -Feature "Distribution" -TargetTheia "Baseline/theia"
```

Or as a dependency of any feature:

```powershell
pwsh ./tools/install-feature.ps1 -Feature "Codex" -TargetTheia "Baseline/theia" -WithDependencies
```

## Validation

```powershell
git -C Baseline/theia apply --check ../../Distribution/patches/001-root-and-app-composition.patch
git -C Baseline/theia apply --check ../../Distribution/patches/002-build-and-dev-tooling.patch
git -C Baseline/theia apply --check ../../Distribution/patches/003-core-bootstrap-and-runtime.patch
git -C Baseline/theia apply --check ../../Distribution/patches/004-platform-package-fixes.patch
git -C Baseline/theia apply --check ../../Distribution/patches/005-ai-ide-agent-aggregation.patch
```
