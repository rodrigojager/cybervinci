# Branding

Separated package:

- `packages/branding` → `@cybervinci/branding`

Patch/override layer:

- `patches/theia-overrides.patch` applies Branding-owned changes against `Baseline/theia`.
- `overrides/theia/...` is the source snapshot used to regenerate that patch.

Moved out:

- Cross-cutting app/build/preload/Electron glue was moved to `Distribution/`.
- Example app dependency manifests were moved to `Distribution/` because they aggregate multiple features.

Remaining Branding patches cover product identity, icon assets, CyberVinci core strings/about/preferences, and the getting-started welcome screen.

Tests/resources:

- `examples/playwright/src/tests/branding.test.ts`

This folder is the shared branding dependency used by most other CyberVinci features.

Upgrade note: keep `packages/branding` as the stable extension boundary. Treat everything under `patches/` and `overrides/theia/` as migration debt to replace with Theia contribution APIs where possible.
