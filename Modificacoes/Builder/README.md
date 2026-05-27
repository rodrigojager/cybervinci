# Builder

Separated packages:

- `packages/builder`
- `packages/builder-ai`
- `packages/builder-editor-puck`
- `packages/builder-export-html`
- `packages/builder-export-react`
- `packages/builder-property-panel-rjsf`
- `packages/builder-registry`
- `packages/builder-renderer-mantine`
- `packages/builder-schema`

Purpose: WYSIWYG UI builder using Mantine, Puck, RJSF/json-schema forms, registries, renderers, and HTML/React export.

Requires:

- `Branding/packages/branding`

Apply by copying all `builder-*` packages into `Baseline/theia/packages/`, adding `@cybervinci/builder` to app dependencies, then rebuilding.

Installer example:

```powershell
pwsh ../tools/install-feature.ps1 -Feature "Builder" -TargetTheia "../Baseline/theia" -WithDependencies
```
