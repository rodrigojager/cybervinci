# CyberVinci Razor Visual Editor

Feature folder for a decoupled Theia extension that opens `.html`, `.htm` and `.cshtml` files in a GrapesJS-based visual editor.

The extension is packaged as `@cybervinci/razor-visual-editor` and does not patch Theia editor internals. It contributes:

- an Open With handler for supported files;
- a visible editor-title toolbar button for supported source editors;
- commands for visual open/save/save as/diff/tokens/reload;
- a conservative Razor Protector that replaces Razor with locked HTML placeholders before visual editing and restores the original Razor on save.

Install with:

```powershell
pwsh ./tools/install-feature.ps1 -Feature "Razor Visual Editor" -TargetTheia "Baseline/theia" -WithDependencies
```

Then run `npm install`, `npm run compile`, and the normal CyberVinci browser/electron build from the target Theia root.
