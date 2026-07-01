# CyberVinci Windows installer

This folder contains the first release packaging layer for CyberVinci Desktop.

## Recommended separated installers

CyberVinci features are Theia extensions. Theia loads them from the application
bundle generated during `npm run build:electron`, so the public release should
not install every extension and merely disable the unchecked ones.

The recommended Windows setup is therefore a variant builder: it builds four
separate payloads and four separate installers:

- `core`: CyberVinci Desktop core.
- `csharp`: core plus C# Kit.
- `codex`: core plus Codex extension.
- `full`: core plus C# Kit and Codex extension.

Each generated installer contains only its own payload. Unselected components
are not installed and are not embedded in that installer.

```powershell
pwsh ./tools/build-cybervinci-matrix-installer.ps1
```

The generated installers are written to `dist/cvi/windows`.
Publish those `.exe` files as assets in a GitHub Release.

To make the installed CyberVinci "Verificar atualizações" button open the
latest release page, set either the repository or an explicit release URL before
building:

```powershell
$env:CYBERVINCI_RELEASE_REPOSITORY = "owner/repo"
pwsh ./tools/build-cybervinci-matrix-installer.ps1
```

or:

```powershell
$env:CYBERVINCI_RELEASES_URL = "https://github.com/owner/repo/releases/latest"
pwsh ./tools/build-cybervinci-matrix-installer.ps1
```

The build writes that update metadata to the install profile and to the portable
launchers. If neither value is set, the button stays visible but shows a
configuration warning.

Use `tools/build-cybervinci-installer.ps1` only when you intentionally want to
build one fixed payload variant.

## Core desktop payload

The core payload includes:

- CyberVinci desktop shell and themes.
- AI Chat with provider/model controls, model variants, virtual tools, virtual
  reasoning, virtual goal, playbooks and agency agents.
- Canvas/OpenPencil.
- Flow and Flow integration in AI Chat.
- Visual HTML/cshtml editor.
- Markdown preview with Mermaid support.

Arena, AI Output Cleaner, Builder, Memory and Library stay in local source for
now and are intentionally excluded from the public installer payload.

## Optional build components

- `csharp-dotnet`: `@cybervinci/csharp-kit`.
- `codex-extension`: `@cybervinci/codex` sidebar/webview extension.

The AI provider/runtime layer remains in the core payload so the chat can still
use provider modes independently of the dedicated Codex sidebar.

## Portable payload installer

After building with `-PackagePortable`, run this from the payload root:

```powershell
pwsh ./install-cybervinci.ps1
```

That wizard copies the payload to the selected install directory, writes the
release profile, and creates shortcuts.

## Single-variant Inno Setup installer

Compile one fixed payload variant:

```powershell
pwsh ./tools/build-cybervinci-installer.ps1 -NoWizard -WithCSharp -WithCodex -PackagePortable -CompileInno -SkipNpmInstall -SkipBuild
```

When `ISCC.exe` is not on `PATH`, pass:

```powershell
-InnoSetupCompiler "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
```

The generated installer copies the already-built payload and creates shortcuts.
