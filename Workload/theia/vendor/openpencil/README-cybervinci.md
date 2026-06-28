# OpenPencil vendored snapshot for CyberVinci

This directory contains a controlled vendored snapshot of the upstream
OpenPencil project for internal CyberVinci adaptation work.

Upstream source:

- Repository: https://github.com/ZSeven-W/openpencil
- Local source used for this snapshot:
  `C:\Users\<USER>\AppData\Local\Temp\zseven-openpencil-reference`
- Upstream commit: `e8ed1985b94ba954c22441a68539ef3cd3be8e6f`
- Snapshot date: 2026-05-17

Included content:

- Root `LICENSE`, `package.json`, and `README.md`
- `packages/pen-types`
- `packages/pen-core`
- `packages/pen-engine`
- `packages/pen-renderer`
- `packages/pen-react`
- `packages/pen-mcp`
- `packages/pen-sdk`
- `packages/pen-figma`
- `packages/pen-ai-skills`
- `packages/pen-acp`
- Lightweight `apps/cli` content: `README.md`, `package.json`,
  `tsconfig.json`, and `src`

Excluded content:

- Upstream `.git`
- Dependency folders such as `node_modules`
- Generated output such as `out` and `dist`
- Screenshots and other heavy artifacts
- Full upstream `apps/web`
- Full upstream `apps/desktop`

The vendored source is not wired into the CyberVinci build yet and should not
be treated as a directly buildable workspace package until an integration pass
adds explicit CyberVinci build, dependency, and adaptation boundaries.

React compatibility:

- `packages/pen-react` has been adapted for CyberVinci/Theia React 18.3.1
  compatibility while retaining React 19 compatibility.
- Its `react` and `react-dom` peer dependency ranges are
  `^18.3.1 || ^19.0.0`.
- The package includes a static `check:react18` script that fails if React
  19-only APIs (`use`, `useActionState`, `useOptimistic`) are introduced under
  `packages/pen-react/src`.

Licensing:

OpenPencil is provided under the MIT license. The root `LICENSE` and package
`LICENSE` files that exist upstream are preserved in this snapshot. At this
upstream commit, `packages/pen-acp` does not include its own package-level
`LICENSE` file, so it is covered by the root MIT license notice. Keep those
notices intact when adapting or moving code from this vendor tree.
