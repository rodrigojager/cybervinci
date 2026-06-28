# CyberVinci Themes

Separated theme extension for CyberVinci.

It contributes `@cybervinci/themes`, a Theia frontend extension with 18 dark
color themes based on `Modificacoes/exemplo-temas.html`:

- Blue V1, V2, V3
- Copper V1, V2, V3
- Emerald V1, V2, V3
- Purple V1, V2, V3
- Arctic V1, V2, V3
- Terminal V1, V2, V3

The themes are registered through Theia/Monaco theme services, so they appear in
`workbench.colorTheme`. The package also imports a scoped CSS layer that only
applies while a CyberVinci theme is active, mapping the lab colors to the same
workbench areas where possible: title/menu bar, activity bar, side bar, editor,
tabs, panel, status bar, dialogs, quick input, lists, buttons, inputs, and
scrollbars.

## Apply

Copy `packages/themes` into `Baseline/theia/packages/`, add
`@cybervinci/themes` to the target app dependencies, then rebuild Theia.

`app-dependencies.json` documents the dependency entries for the browser and
Electron examples.
