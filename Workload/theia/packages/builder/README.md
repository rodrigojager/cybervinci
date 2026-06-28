# @cybervinci/builder

Theia extension that exposes the CyberVinci Page Builder.

## Commands

- `CyberVinci: Open Page Builder`
- `CyberVinci: New Page`
- `CyberVinci: Open Page JSON`
- `CyberVinci: Save Page`
- `CyberVinci: Preview Page`
- `CyberVinci: Export React Component`
- `CyberVinci: Export UI to HTML`
- `CyberVinci: Generate UI with AI`

## File Format

New documents are saved as `.cvpage.json`. Legacy `.builder.json` and `.cvui.json` documents still open and save.

The saved file contains the versioned Builder Schema and remains independent from the visual editor engine. The UI consumes the schema through:

- component registry
- Puck adapter
- Mantine renderer
- RJSF property panel
- React/HTML exporters

## UI Structure

The widget is split into:

- `components/`: toolbar, component library, canvas, preview, JSON and inspector panels.
- `puck/`: Puck config and data mapping adapters.
- `registry/`: extension-level registry access points.
- `services/`: file/export/validation helpers.
- `style/`: base and page-builder CSS.

## Build

From the target Theia workspace after installing the feature:

```powershell
npm run compile -- --scope @cybervinci/builder
```
