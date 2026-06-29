# Installing separated CyberVinci modules onto a Theia baseline

The goal is that each feature folder can be reapplied to `Baseline/theia` in an organized way.

## Recommended command

From `C:\Users\<USER>\Desktop\CyberVinci`:

```powershell
pwsh ./tools/install-feature.ps1 -Feature "Codex" -TargetTheia "Baseline/theia" -WithDependencies
```

## Desktop release installers

For the current CyberVinci Desktop release, use the variant builder:

```powershell
pwsh ./tools/build-cybervinci-matrix-installer.ps1
```

It builds separate `core`, `csharp`, `codex` and `full` payloads, then creates
one independent Inno Setup installer per variant:

- `CyberVinci-Setup-<version>-core.exe`
- `CyberVinci-Setup-<version>-csharp.exe`
- `CyberVinci-Setup-<version>-codex.exe`
- `CyberVinci-Setup-<version>-full.exe`

Each installer contains only its own payload. Unselected optional components are
not installed and are not embedded in that installer. The `full` variant is the
factory/all-extensions build and includes C# Kit, Codex, Memory, Library, Arena,
AI Output Cleaner and Builder in addition to the required desktop core.

The generated `.exe` files are written to `dist/cvi/windows`.

For public distribution, upload those generated `.exe` files to a GitHub
Release. To make the installed CyberVinci update button point to that channel,
set one of these before building:

```powershell
$env:CYBERVINCI_RELEASE_REPOSITORY = "owner/repo"
```

or:

```powershell
$env:CYBERVINCI_RELEASES_URL = "https://github.com/owner/repo/releases/latest"
```

To build one fixed payload variant instead, use:

```powershell
pwsh ./tools/build-cybervinci-installer.ps1
```

The single-variant wizard starts from `Workload/theia`, stages a release tree under
`dist/cybervinci-installer`, and lets you choose optional build components:

- `C# and .NET tooling`: adds `@cybervinci/csharp-kit`.
- `Codex extension`: adds the dedicated `@cybervinci/codex` sidebar/webview extension.

The required desktop core includes CyberVinci themes, AI Chat, provider/model
controls, virtual reasoning, virtual goal, playbooks, agency agents, Canvas,
Flow, Flow-in-chat integration, visual HTML/cshtml editing and Markdown Mermaid
preview.

When both C# and Codex are selected, the single-variant build becomes the `full`
all-extensions build and also bundles Memory, Library, Arena, AI Output Cleaner
and Builder.

Use non-interactive mode for a local release build:

```powershell
pwsh ./tools/build-cybervinci-installer.ps1 -NoWizard -WithCSharp -WithCodex -PackagePortable
```

The portable payload can then be installed with:

```powershell
pwsh ./dist/cybervinci-installer/payload/CyberVinci/install-cybervinci.ps1
```

Use `-DryRun` first to preview copies and patches:

```powershell
pwsh ./tools/install-feature.ps1 -Feature "Codex" -TargetTheia "Baseline/theia" -WithDependencies -DryRun
```

## What the installer does

For a selected feature it:

1. Copies `packages/*` into `<target>/packages/`.
2. Copies `vendor/*` into `<target>/vendor/`.
3. Copies `examples/*` into `<target>/examples/`.
4. Applies `patches/*.patch` from the Theia root.

Feature-specific Playwright tests are stored under each feature's `examples/playwright/...` subtree and are copied back to the normal Theia `examples/playwright` location by the installer.

Generated folders are skipped during copy: `node_modules`, `lib`, `coverage`, `.nyc_output`, `obj`, `bin`, caches, logs, and TypeScript build info.

## Dependency model

`-WithDependencies` installs prerequisites first:

- `Distribution` is the private CyberVinci patch layer applied before feature packages.
- `Branding` depends on `Distribution`.
- `Themes` depends on `Distribution`.
- `AI-Chat-Experience` depends on `Distribution`, `Branding`, `AI-Providers`, `Design` and `Flow`.
- `CSharp Kit` depends on `Distribution`, `Branding`, `Razor Visual Editor` and contributes provider-neutral Theia AI Core C# context variables/commands.
- `Codex` depends on `Distribution`, `Branding`, `AI-Providers`.
- `Flow` depends on `Distribution`, `Branding`, `AI-Providers`.
- `Markdown-Mermaid` depends on `Distribution`.
- `Memory` depends on `Distribution`, `Branding`, `Library`.
- `Razor Visual Editor` depends on `Distribution`.

## After installing

From the target Theia root:

```powershell
npm install
npm run compile
npm run build:browser
```

For Electron:

```powershell
npm run build:electron
```
