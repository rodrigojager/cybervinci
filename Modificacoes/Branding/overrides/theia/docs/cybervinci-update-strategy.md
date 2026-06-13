# CyberVinci Update Strategy

CyberVinci keeps product-specific behavior in extension packages wherever
possible. The remaining core or host patches are tracked here so Theia upgrades
can be reviewed deliberately.

## Patch Boundaries

- `core-brand-name-about-dialog`: product name and about dialog copy currently
  touch Theia core.
- `core-icon-preload-and-preferences`: selected CyberVinci icon preload and
  preferences must be preserved across reloads.
- `app-manager-splash-branding`: generated browser/electron shell and splash
  resources carry CyberVinci branding before extensions load.
- `ai-chat-product-ux`: AI chat welcome, provider wording, capability labels,
  and product-scoped CSS must stay behind contribution points or documented
  scoped overrides.
- `workspace-and-debug-product-copy`: small product-copy substitutions in
  workspace/debug packages must be reviewed during upstream updates.

## Regression Gates

- `branding-contract`: product inventory, patch matrix, host app dependencies,
  and upgrade gate manifest.
- `memory-contracts`: Memory graph, memory, context cart, chat suggestions, and
  library integration.
- `documentation-manager-contracts`: documentation registry, install/update,
  search, lockfile, and storage fallback behavior.
- `arena-contracts`: Arena duel service, runner registry, sandbox lifecycle,
  and fallback model behavior.
- `flow-contracts`: Flow extension isolation, host bridge protocol,
  kernel/CLI boundary, Memory adapter, run/workflow storage, and removable-host
  behavior.
- `openpencil-contracts`: OpenPencil document, runtime, AI, Figma import,
  codegen, toolbar, review panel, and browser contracts.
- `browser-smoke-product`: browser product shell, welcome, OpenPencil launch
  path, AI Output Cleaner command surface, save/reopen, and branded UI.
