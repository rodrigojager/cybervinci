# Distribution patch ledger

These patches are the private CyberVinci distribution overlay. They are intentionally separate from feature packages so that a new upstream Theia version can be updated first and CyberVinci customizations can be reapplied and reviewed in order.

Apply from the target Theia root in filename order, or use `tools/install-feature.ps1`.

## 001-root-and-app-composition.patch

**Purpose:** product-level repository/app composition.

Includes root metadata and app/example configuration that make the checkout build as CyberVinci instead of vanilla Theia.

Typical files:

- root `package.json` / `package-lock.json`;
- repo docs/configs used by the distribution;
- `examples/browser`, `examples/electron`, `examples/browser-only` app composition;
- Playwright/app test configuration.

**Upgrade risk:** medium. App manifests and lockfiles often conflict after dependency updates.

**If it conflicts:** prefer the new upstream dependency versions, then re-add CyberVinci package dependencies, app name, default preferences, splash config, and plugin exclusions.

## 002-build-and-dev-tooling.patch

**Purpose:** build/dev tooling needed by the CyberVinci distribution.

Typical files:

- `dev-packages/application-manager`;
- `dev-packages/cli`;
- `dev-packages/bundle-plugin`;
- localization/translation tooling;
- rebuild/generator helpers.

**Upgrade risk:** medium/high. Theia build internals can change during version upgrades.

**If it conflicts:** first keep upstream build behavior, then re-apply only the CyberVinci-specific generator/rebuild behavior that is still needed.

## 003-core-bootstrap-and-runtime.patch

**Purpose:** core bootstrap, first-paint branding, Electron splash/window behavior, and core runtime adjustments.

Typical files:

- `packages/core/src/browser/preload/*`;
- `packages/core/src/browser/style/index.css`;
- `packages/core/src/electron-main/electron-main-application.ts`;
- `packages/core/src/common/message-rpc/*`;
- `packages/core/src/node/messaging/*`;
- backend shutdown/logging/runtime fixes.

**Upgrade risk:** high. This touches upstream core internals.

**If it conflicts:** preserve upstream core changes first; then re-add only the CyberVinci behavior that affects startup branding, splash icons, and runtime stability.

## 004-platform-package-fixes.patch

**Purpose:** cross-package platform adjustments needed by the CyberVinci distribution.

Typical files:

- `packages/plugin-ext*`;
- `packages/plugin-dev`;
- `packages/filesystem`;
- `packages/workspace`;
- `packages/debug`;
- `packages/scanoss`.

**Upgrade risk:** medium/high depending on upstream refactors.

**If it conflicts:** check whether upstream already fixed the same behavior. Drop CyberVinci hunks that are redundant.

## 005-ai-ide-agent-aggregation.patch

**Purpose:** central AI IDE dependency injection aggregation for CyberVinci agents and integrations.

Typical file:

- `packages/ai-ide/src/browser/frontend-module.ts`

**Upgrade risk:** high. AI IDE bindings may change frequently.

**If it conflicts:** keep upstream module structure and re-add CyberVinci agent/service bindings needed by Codex-Provider, Memory, and product AI flows.

## Maintenance rule

When upgrading Theia:

1. Update `Baseline/theia` to the new upstream version.
2. Run `git apply --check` for every patch in order.
3. If a patch fails, inspect only that numbered area.
4. Resolve against the new upstream file.
5. Regenerate the patch from `Distribution/overrides/theia` only after the target behavior is confirmed.

Generated/runtime artifacts remain excluded: `node_modules`, `lib`, `coverage`, `.nyc_output`, `src-gen`, Playwright/Allure outputs, logs, temporary smoke-test folders, native build outputs, and downloaded VSIX binaries.
