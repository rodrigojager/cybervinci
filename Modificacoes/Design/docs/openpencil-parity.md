# OpenPencil Parity Contracts

This note tracks the test-backed parity surface for embedding OpenPencil in CyberVinci/Theia.

## Covered By Tests

- `.op` documents are JSON, use the `.op` extension, normalize upstream aliases, preserve metadata, pages, variables, themes, and round-trip through serialize/deserialize.
- The editor widget contract reads `.op` through Theia `FileService`, exposes `Saveable`, tracks dirty state against the last serialized save, writes with `writeFile`, and keeps revert/undo hooks.
- Browser acceptance coverage creates `canvas-acceptance.op` from `CyberVinci > Canvas > Canvas: New Design`, applies structured commands, exports UI-generated files, switches pages, saves, closes, reopens from Explorer, and validates the layer panel, canvas/runtime surface, exported content, and saved JSON document.
- The editor chrome follows the original OpenPencil app anatomy: 40px top bar, left layers/pages rail, centered canvas, floating vertical tool rail, floating boolean/selection popovers, right properties panel, and bottom status cluster. Contract tests require the dimensions and z-index shape to stay in place while colors resolve through `--theia-*` and `--openpencil-*` tokens.
- Structured operations cover add, update, remove, move, nudge, align, distribute, duplicate, reorder, group, ungroup, page operations, variables, themes, layout, replace/delete aliases, and selection.
- AI-facing command-palette and sidecar-file flows stay behind `OpenPencilDesignCommandService` or the widget session API instead of direct DOM/state mutation.
- `OpenPencil: Generate with AI` routes through an in-process `OpenPencilAiDesignProvider` extension point and the CyberVinci language-model provider when available, with a deterministic local fallback when no provider returns valid OpenPencil operations.
- Figma import is exposed through `OpenPencil: Import Figma JSON` and `openpencil.document.import` with `auto`, `figma-json`, `figma-rest-json`, `figma-copied-json`, `figma-clipboard-html`, `figma-fig-base64`, `openpencil-json`, `svg`, and `html` formats. Base64 `.fig` payloads are passed to the direct `pen-figma` parser with an exact `ArrayBuffer`, with structural fallback for copied/exported JSON and clipboard HTML.
- Export/codegen targets are contract-tested for `react-tailwind`, `html-css`, `svg`, `vue`, `svelte`, `react-native`, `flutter`, `swiftui`, `jetpack-compose`, `openpencil-json`, and `openpencil-summary-json`.
- Backend bridge contracts require `pen-codegen` to be treated as a vendored upstream package when present, selected as the direct adapter for product code generation, and exposed through `openpencil.codegen.targets.list`, `openpencil.codegen.adapter.status`, and `openpencil.codegen.generate`.
- The runtime adapter preserves active page ordering, selection events, viewport events, visual styling, text metadata, effects, fills, strokes, themes, and variables for the vendored `pen-react` runtime.
- The fallback visual shell remains present around `OpenPencilReactRuntimeHost`, including toolbar, pages, layers, canvas, grid, marquee, selection handles, richer properties, status, and runtime status details.
- Vector editing includes boolean shape operations (`booleanNodes`), shape-to-path conversion (`convertToPath`), and anchor updates (`updatePathAnchors`) through the structured command service and editor shell.
- Backend bridge tests require in-process MCP-compatible and CLI-compatible discovery, precise upstream codegen detection, direct-vs-fallback adapter status, allowlisted import/validate/export/codegen payload operations, and rejection of unsupported operations without starting external processes.

## Browser Acceptance

The Playwright acceptance spec is `examples/playwright/src/tests/openpencil-acceptance.test.ts`. It uses the normal `examples/browser` CyberVinci app, opens `CyberVinci > Canvas > Canvas: New Design`, applies `Canvas: Apply Structured Command`, saves through `File > Save`, closes the editor, reopens `canvas-acceptance.op` from Explorer, and checks:

- the OpenPencil visual editor shell is visible;
- original OpenPencil chrome is present with the expected top bar, floating vertical toolbar, layers/pages rail, properties panel, status cluster, visible file/shape popovers, and light/dark theme contrast checks for labels, icons, menus, and hover surfaces;
- the layers UI contains `acceptance-cta-label`;
- the runtime or fallback canvas is visible and non-empty; the test samples `<canvas>` pixels when the runtime exposes a readable 2D canvas, and otherwise validates the rendered SVG fallback bounds/content because WebGL/CanvasKit pixels are not consistently readable from Playwright;
- the editor exposes quick document HTML export, selection React code export, document SVG export controls, and the complete target/scope picker;
- the generated HTML, React, SVG, and Jetpack Compose files contain the edited acceptance text from the UI export path;
- Page switching uses the structured command path (`addPage` plus `setActivePage`) because drag/pointer canvas gestures remain more timing-sensitive in the Theia shell; the browser test still exercises a representative stable canvas-affecting operation by adding/selecting rendered nodes through the product command UI;
- the saved `.op` JSON contains the updated `hero-title`, the added CTA layer, active page metadata, a second acceptance page, and expected layer counts.

Run only this browser acceptance from the repository root after building the browser app dependencies:

```bash
npm --workspace @theia/playwright run ui-tests -- --grep "OpenPencil browser acceptance"
```

The full Playwright suite remains available through:

```bash
npm run test:playwright
```

## Operational UI Path

Start CyberVinci from the repository root:

```bash
npm run build:browser
npm run start:browser
```

Open the browser app, normally `http://localhost:3000`, with a writable workspace. From the first Welcome screen you can leave the Welcome tab open; the OpenPencil entry point is the main menu:

- `CyberVinci > Canvas > Canvas: New Design` creates a new `.op` file in the active workspace and opens it visually.
- The command palette exposes the same commands, plus `Canvas: Generate with AI`, `Canvas: Import Figma JSON`, `Canvas: Apply Structured Command`, AI edit JSON commands, bridge status, and target/tool listing commands.
- `OpenPencil: Generate with AI` uses a provider hook (`OpenPencilAiDesignProvider`) inside the Theia process. When no CyberVinci AI provider is registered, the deterministic fallback still writes editable `.op` operations so the product flow remains testable without a remote service.
- `OpenPencil: Import Figma JSON` accepts copied/exported Figma JSON, Figma clipboard HTML, embedded data, and base64 `.fig` payloads and routes them through the in-process importer. When the vendored `pen-figma` adapter can load, it is preferred; otherwise the local `figma-structural-json` fallback converts frame/text/shape hierarchy into `.op` pages and layers. A live Figma plugin runtime remains separate because the inspected upstream snapshot does not include a ready plugin manifest.
- Export/codegen is visible from both the `CyberVinci > Canvas` menu and the editor toolbar. The toolbar keeps quick actions for document HTML, selected-node React, and document SVG, and also exposes a complete in-editor export picker for all supported targets: HTML/CSS, React/Tailwind, Vue, Svelte, React Native, Flutter, SwiftUI, Jetpack Compose, SVG, OpenPencil JSON, and OpenPencil summary JSON.
- Bridge diagnostics and automation use in-process operations: `openpencil.backend.status.get`, `openpencil.mcp.tools.list`, `openpencil.cli.commands.list`, `openpencil.codegen.targets.list`, `openpencil.codegen.adapter.status`, `openpencil.codegen.generate`, and `openpencil.codegen.generate.all`. These are MCP-compatible and CLI-compatible metadata/operation paths, not an external `pen-mcp` server or spawned `op` process. When `pen-codegen-direct` cannot generate a target, the bridge reports `adapter-unavailable` or an explicit local fallback instead of starting an external process.
- Explorer context menu for `.op` files exposes `OpenPencil > Open Visual Editor` and `OpenPencil > Open as JSON`.

For a manual save/reopen check, create a design from `CyberVinci > Canvas > Canvas: New Design`, run `Canvas: Apply Structured Command` with operations that update `hero-title` and add a text layer, save with `File > Save` or Ctrl/Cmd+S, close the editor tab, reopen the `.op` file from Explorer, and confirm the layers, canvas, and JSON content persisted.

## Manual Zero-To-Product Checklist

Use this checklist on a clean browser build before browser integration sign-off. Desktop/Electron validation is intentionally out of scope for this round.

- [ ] Install from a clean checkout with `npm ci`.
- [ ] Build browser with `npm run build:browser`.
- [ ] Start browser with `npm run start:browser`, open a writable workspace, and confirm CyberVinci loads without console startup errors.
- [ ] Run `CyberVinci > Canvas > OpenPencil: New Design`; confirm a new `.op` file is created in the workspace and opens in the visual editor by default.
- [ ] Add or edit at least one text layer, one rectangle/frame layer, and one nested layer; confirm the layer list, canvas selection, and property panel update together.
- [ ] Run `OpenPencil: Apply Structured Command` from the command palette with a command that updates an existing text layer and adds a new CTA text layer; confirm both changes are visible.
- [ ] Save through `File > Save` and Ctrl/Cmd+S; confirm the dirty indicator clears.
- [ ] Close the `.op` editor tab, reopen the same `.op` from Explorer, and confirm the visual editor, layer list, selected page, and edited text persisted.
- [ ] Use `OpenPencil > Open as JSON` from Explorer and confirm the serialized `.op` contains the edited text, added layer id, page metadata, variables/themes if used, and no duplicate ids.
- [ ] Export document to HTML/CSS and confirm the generated file contains the edited text and layout styles.
- [ ] Export selected nodes to React/Tailwind and confirm only the selected scope is generated.
- [ ] Export document to SVG and confirm text and visual nodes render in the SVG.
- [ ] Exercise backend/codegen bridge targets for `vue`, `svelte`, `react-native`, `flutter`, `swiftui`, and `jetpack-compose` through `openpencil.codegen.generate` and the product target picker.
- [ ] Reload browser, reopen the workspace, and confirm `.op` still opens visually by default.

## R2 Validation Snapshot - 2026-05-17

Environment used for this snapshot:

- Worktree: OpenPencil R2 documentation and contract pass in `C:\Users\Rodrigo\Desktop\theia-op-complete-r2-docs-20260517`
- Node: `v26.1.0`
- npm: `11.12.0`

Validated R2 evidence from the owning implementation worktrees and focused contract specs:

- Browser application build: passed.
- `npm --workspace @theia/playwright run compile`: passed in the OpenPencil browser acceptance worktree.
- Package-level OpenPencil tests remain the focused validation for the extension contract.
- Browser acceptance now covers UI-generated HTML, React, SVG, and Jetpack Compose file contents, page switching through structured commands, and a minimal non-empty canvas/runtime assertion.
- Electron-specific OpenPencil UI acceptance, Electron packaging, an external MCP server, and standalone CLI execution are intentionally out of scope for this R2 parity claim.

## Original Chrome Fidelity Snapshot - 2026-05-18

- Branch: `refatoracao-desacoplamento`.
- Upstream reference: `ZSeven-W/openpencil` `main` cloned for visual comparison of `editor-layout`, `top-bar`, `toolbar`, `boolean-toolbar`, `layer-panel`, `page-tabs`, `property-panel`, and `status-bar`.
- Contract coverage requires the original editor anatomy, tokenized Theia/CyberVinci color mapping, visible popovers/menus above canvas panels, and no direct color literals in the main OpenPencil host theme.
- Playwright acceptance adds checks for original toolbar/layers/properties/status dimensions, file and shape popovers, and contrast in `Light (Theia)` and `Dark (Theia)`.

## Codegen Adapter Split

- Direct product code generation is owned by vendored `pen-codegen` when `vendor/openpencil/packages/pen-codegen` is available. The backend bridge status should report `selectedAdapter: "pen-codegen-direct"` and `directPenCodegen.available: true` in that state.
- `openpencil.codegen.targets.list` should map React, HTML, Vue, Svelte, React Native, Flutter, SwiftUI, and Jetpack Compose targets to the direct `pen-codegen` adapter.
- `openpencil.codegen.generate` should return the direct adapter name, target format, validation metadata, selected node scope, and generated content for each product target.
- Fallback remains explicit and narrow: `.op` JSON serialization, summary JSON serialization, SVG export, and emergency generation when the direct adapter is unavailable (`adapter-unavailable`).
- MCP/CLI codegen pipeline files remain useful integration references, but they store pipeline state in a running OpenPencil App sync endpoint and are not the embedded direct generator path.

## Boundaries And Limitations

- The vendored `pen-react` toolbar, layer panel, property panel, boolean toolbar, page tabs, and status bar are mounted when available; the surrounding Theia fallback shell remains as compatibility UI when the runtime is unavailable.
- Active-tree CRUD mutations are routed through a `pen-core` tree adapter that mirrors the upstream `DesignEngine` tree helpers. `replaceNode`, batch DSL, and AI result shaping remain explicit Theia command-service behavior because the upstream engine does not expose matching direct operations.
- Browser acceptance covers the full Theia save/reopen path, generated export file contents for representative web/component/SVG/native targets, page switching, and a minimal non-empty canvas/runtime assertion for one deterministic demo design. Drag/resize pointer gestures remain intentionally outside this browser acceptance because they are more timing-sensitive than the structured operation path and are already covered at lower levels.
- The toolbar target picker is implemented for the broader backend bridge targets (`vue`, `svelte`, `react-native`, `flutter`, `swiftui`, `jetpack-compose`) plus SVG/JSON serializer targets.
- Figma import uses in-process adapters only. `figma-json`, `figma-rest-json`, `figma-copied-json`, and common copied/exported JSON payloads are supported structurally; opaque `.fig` binaries still require a decoded/base64 bridge that the vendored adapter can understand. CyberVinci does not run the original Figma plugin runtime.
- Path editing currently supports anchor JSON editing, closed-path toggling, rendered anchor handles, and direct anchor drag/update through the structured service. Advanced bezier handle UX remains a narrower follow-up, not a blocker for the in-process parity surface.
- External `pen-mcp`, a standalone `op` CLI process, and Electron runtime validation are excluded from this R2 parity matrix.
