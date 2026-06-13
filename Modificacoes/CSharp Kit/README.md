# CyberVinci C# Kit

Feature folder for a decoupled CyberVinci/Theia C# and .NET development experience. The goal is to bring the everyday Visual Studio style workflow into CyberVinci without bundling Microsoft VS Code extensions.

## Microsoft Extensions This Mirrors

The Visual Studio Code stack that approximates Visual Studio for C# is currently:

- `ms-dotnettools.csdevkit` - C# Dev Kit: solution explorer, project management, test discovery/execution, debug workflow and C# productivity UI.
- `ms-dotnettools.csharp` - C# for Visual Studio Code: base C# language services powered by LSP, Roslyn and Razor components.
- `ms-dotnettools.vscode-dotnet-runtime` - .NET Install Tool: runtime/SDK acquisition used by Microsoft extensions.
- `ms-dotnettools.vscodeintellicode-csharp` - IntelliCode for C# Dev Kit: optional AI-assisted member ranking and whole-line completion.

CyberVinci C# Kit maps those capabilities to CyberVinci-owned modules:

- `@cybervinci/csharp-kit`: solution/project explorer, `.slnf` solution-filter awareness, solution/project-reference management, solution/project restore/build/clean/rebuild/format/test/publish, `.pubxml` publish-profile workflow, ASP.NET user-secrets/dev-certificate workflow, EF Core migration/database commands, project and item templates, Monaco C# IntelliSense/snippets, symbol hover/outline/go-to-definition, Razor/cshtml directive inventory, commands, NuGet search/install/outdated/vulnerable/deprecated audit/update workflow with `global.json` SDK and `dotnet test` runner intent, `.editorconfig`/`.globalconfig` code-style/analyzer inventory, workspace `dotnet-tools.json` local tool inventory, `.runsettings` test configuration inventory, Central Package Management, `Directory.Build.props`/`Directory.Build.targets` and NuGet.config source/mapping awareness, Theia Test Explorer integration, CoreCLR debug adapter bridge, ASP.NET launch profile run/debug/watch, integrated launch URL opening, debug/task generation and Theia AI Core C# context variables/slash commands.
- `@cybervinci/memory-roslyn`: Roslyn semantic workspace analysis for Memory.
- `@cybervinci/razor-visual-editor`: visual `.html`/`.cshtml` editing and Razor token protection.
- `@cybervinci/codex-provider`: optional AI-assisted C# workflows fed by C# Kit AI/Memory context packs instead of Microsoft IntelliCode.

## What Is Implemented Now

- Workspace scan for `.sln`, `.slnx`, `.slnf`, `.csproj`, `.cshtml` and `.razor`, with `.slnx` XML project path decoding, `.slnf` filtered solution project resolution and missing solution project entries shown in the panel.
- Workspace `global.json` discovery for SDK version, roll-forward, prerelease, local SDK path and `dotnet test` runner intent, including exact installed-SDK comparison against `dotnet --info` and Microsoft.Testing.Platform SDK compatibility warnings.
- Workspace `.editorconfig` and `.globalconfig` discovery for C# code-style, dotnet style and Roslyn analyzer severity settings, shown as a code-style/analyzer capability.
- Workspace `dotnet-tools.json` discovery for local .NET tools such as `dotnet-ef`, shown in the panel and emitted as a `dotnet tool restore` task, plus a generated `C# Kit: install csharp-ls local tool` task when the workspace has no local C# language-server tool.
- Workspace `.runsettings` discovery for VSTest/MSTest run configuration, data collectors and test run parameters, shown in the panel and emitted as `dotnet test --settings` tasks.
- Visual Studio `.pubxml` publish-profile discovery under `Properties/PublishProfiles`, shown in Solution Explorer and emitted as `dotnet publish /p:PublishProfile=...` commands/tasks.
- Inherited `Directory.Build.props` and `Directory.Build.targets` discovery per project, with simple MSBuild properties surfaced in Solution Explorer and capability status.
- Razor/cshtml parsing for `@page`, `@model`, `@inherits`, `@inject`, `@using`, `@namespace`, `@layout`, tag-helper directives, route templates, component tags and inherited `_ViewImports.cshtml`/`_Imports.razor` context.
- SDK/runtime detection through `dotnet --info`.
- Roslyn sidecar readiness detection for `@cybervinci/memory-roslyn`, including env var, workspace-local `.cybervinci/csharp-kit.json`, built DLL detection and local build command guidance.
- Workspace-local `.cybervinci/csharp-kit.json` health reporting, including absent/valid/invalid state, parse errors and which Roslyn, CoreCLR and language-server adapter commands are configured.
- JSON schema registration for `.cybervinci/csharp-kit.json`, giving editor validation/default snippets for workspace-local Roslyn, CoreCLR and C#/Razor language-server adapter settings.
- `C# Kit: Open Adapter Config` command and panel action that create the non-overwriting `.cybervinci/csharp-kit.json` template without requiring a project, then open it in the editor with the registered schema.
- Decoupled language-server adapter discovery and LSP initialize probing for `csharp-ls`, OmniSharp, Roslyn/Razor runtime from an installed VS Code C# extension and Razor LSP commands through env vars, workspace-local `.cybervinci/csharp-kit.json` configuration, workspace `dotnet-tools.json` manifests for `csharp-ls`/`rzls`/`razor-ls`, or PATH, including per-language probe timeout settings.
- On-demand Roslyn semantic inventory in the C# Kit panel through `@cybervinci/memory-roslyn`, including semantic/parse-only/fallback mode, symbols, relations, endpoints, tests, dependency-injection hints, call hints and `DbContext` signals.
- C# language registration for Monaco plus workspace completions/snippets, workspace symbol search, trigger-aware method signature help, LSP-published/pulled Problems diagnostics, hover, document links, document colors/color presentations, CodeLens, semantic tokens, linked editing ranges, inlay hints, document highlights, selection ranges, folding ranges, outline, go-to-declaration, go-to-definition, go-to-implementation, go-to-type-definition, Call Hierarchy, Type Hierarchy, LSP-backed prepare-rename/rename, diagnostic-aware edit/command-backed code actions and LSP-backed document/range/on-type formatting for `.cs`, `.razor` and `.cshtml`, including C# method/property return types, test-method symbols, ASP.NET endpoint symbols and Razor directive/component outline symbols.
- AI/Memory context packs for selected C# solutions, solution filters, projects and files, exposed from the C# Kit panel, command palette/context menu and Theia AI variable, combining solution membership, project metadata, important symbols, semantic hints and deterministic suggestions into a prompt surface for Codex or other decoupled assistants.
- Theia AI Core integration through `#csharp_context` plus `/csharp-context`, `/csharp-tests` and `/csharp-review` prompt commands, resolving the selected C# solution/project/source file or explicit completion-safe targets such as `#csharp_context:ApiOnly.slnf`, `#csharp_context:Orders.Api` and `#csharp_context:src/Orders.Api/Controllers/OrdersController.cs` without a direct Codex Provider dependency.
- `dotnet build` diagnostics parser that publishes MSBuild errors/warnings to Theia Problems and editor markers.
- Theia debug adapter contribution for `coreclr`/`clr` backed by `netcoredbg`, `vsdbg` or another DAP-compatible adapter with `--interpreter=vscode` when configured through env vars with optional args, workspace-local `.cybervinci/csharp-kit.json`, workspace `dotnet-tools.json` command discovery, PATH or an already installed VS Code C# extension runtime.
- `dotnet new` workflow for console, ASP.NET Core Web API, MVC, Razor Pages, worker, class library, xUnit, NUnit and MSTest projects, with optional `.sln` or `.slnx` creation/add depending on the installed .NET SDK.
- Project item templates for class, interface, record, enum, ASP.NET Core API controller, Razor Page with code-behind, xUnit, NUnit and MSTest test classes.
- Solution Explorer management commands for creating `.sln`/`.slnx` files, adding/removing projects from a solution and adding/removing project references.
- Project and solution terminal commands for `dotnet restore`, `dotnet build`, `dotnet clean`, MSBuild rebuild, `dotnet format`, project `dotnet publish`, `.pubxml` publish profiles and `dotnet test` against `.csproj`, `.sln` and `.slnx`, including `.runsettings` variants, plus MSBuild restore/build/clean/rebuild tasks for `.slnf` filters, with solution picker support.
- ASP.NET Core local-development commands for initializing, listing, setting and removing user secrets plus trusting HTTPS development certificates.
- EF Core terminal commands for listing migrations, adding migrations and updating databases through `dotnet ef` when `Microsoft.EntityFrameworkCore` package references are detected, with local `dotnet-ef` tool-manifest awareness.
- `.csproj` parsing for SDK, target frameworks, output type, nullable/implicit usings, NuGet references, nearest `Directory.Packages.props` central package versions, nearest `Directory.Build.props`/`Directory.Build.targets` properties, project references and test-project detection.
- `NuGet.config` parsing for package sources, disabled sources, `<clear />` source resets and package source mapping patterns shown in workspace inspection.
- `launchSettings.json` parsing for ASP.NET Core and executable profiles, including multiple `applicationUrl` entries, `launchUrl`, browser flags, command-line args, working directory, executable path, SSL port, hot reload/native debugging metadata, inspect URI and environment variables.
- C# Kit panel with Solution Explorer-style solution/project tree, C#/Razor/config file inventory, Razor directive/import-context summaries, solution/project-reference actions, project selection, capability status, Microsoft extension mapping, recommendations, tests and NuGet packages.
- Solution Explorer displays project `UserSecretsId` values when configured.
- Theia Test Explorer controller for C# test projects, with project/class/test grouping, xUnit/NUnit/MSTest metadata inferred from `.csproj`, including `MSTest.Sdk` and `Microsoft.Testing.Platform` projects, run profiles backed by `dotnet test`, VSTest/Microsoft.Testing.Platform argument shaping from `global.json`, structured TRX result parsing for per-test outcomes/durations, aggregated theory/test-case results, and debug profiles that launch CoreCLR sessions for selected tests then collect the generated TRX result.
- Integrated terminal commands for restore, build, clean, rebuild, format, publish, publish profiles, ASP.NET user secrets/dev certificates, EF Core migrations/database updates, run, watch and test, including `dotnet run --launch-profile` and `dotnet watch run --launch-profile`.
- Integrated browser command for opening ASP.NET `launchSettings.json` URLs, including multiple `applicationUrl` values and `launchUrl` path composition.
- `dotnet test --list-tests` discovery for xUnit, NUnit and MSTest projects, including modern `MSTest.Sdk` test applications, target-framework, namespace, class, method and parameter metadata. Per-test execution uses normalized `FullyQualifiedName` filters with TRX parsing when VSTest or Microsoft.Testing.Platform emits result files; generated tasks include `.runsettings` variants for data collectors and run parameters and switch to `--project`/`--solution` plus `--report-trx` style arguments when `global.json` selects Microsoft.Testing.Platform.
- NuGet search through nuget.org plus list/outdated/vulnerable/deprecated audit/add/update/remove through the `dotnet` CLI, with `Directory.Packages.props` version resolution, advisory/deprecation summaries and `NuGet.config` source/mapping inventory shown in the panel.
- Generation/merge of `.vscode/launch.json` and `.vscode/tasks.json`, plus a non-overwriting schema-backed `.cybervinci/csharp-kit.json` adapter/sidecar configuration template, including `coreclr`, project and solution restore/build/clean/rebuild/format/test tasks, `.runsettings` test tasks, dotnet local tool restore tasks, project publish/profile tasks, ASP.NET user-secrets/dev-cert tasks, EF Core tasks with prompt inputs for migration names, run/watch tasks, per-profile ASP.NET Core and executable debug configurations, launchSettings profile metadata, integrated launch URL opening and `serverReadyAction`.
- Debug command that generates workspace files and attempts to start the generated launch profile when a `coreclr` debug adapter is available.

## Boundaries

This kit does not vendor the Microsoft C# Dev Kit, the Microsoft C# VS Code extension, OmniSharp, or IntelliCode. It creates CyberVinci-owned extension code and now includes a local Monaco language layer for workspace completions, workspace symbol search, trigger-aware method signature help, LSP-published/pulled Problems diagnostics, symbol hover, document links, document colors/color presentations, CodeLens, semantic tokens, linked editing ranges, inlay hints, document highlights, selection ranges, folding ranges, outline, go-to-declaration, go-to-definition, go-to-implementation, go-to-type-definition, Call Hierarchy, Type Hierarchy, LSP-backed prepare-rename/rename, diagnostic-aware edit/command-backed code actions, LSP-backed formatting, Razor directive inventory, common C# snippets, MSBuild diagnostics, AI/Memory context packs, Theia AI Core prompt variables/commands and on-demand Roslyn semantic inventory. CoreCLR launch and selected-test debugging are bridged through `netcoredbg` when installed, with temporary TRX capture after debug sessions. Full C# LSP/Razor LSP remains a pluggable adapter boundary with command discovery, protocol initialize probing, client responses for configuration/workspace-folder/dynamic-registration requests and on-demand `workspace/symbol`, `workspaceSymbol/resolve`, `workspace/executeCommand` with server-requested `workspace/applyEdit`, `workspace/diagnostic`, `textDocument/completion`, `completionItem/resolve`, trigger-aware `textDocument/signatureHelp`, `textDocument/publishDiagnostics`, `textDocument/diagnostic`, `textDocument/documentSymbol`, `textDocument/documentLink`, `documentLink/resolve`, `textDocument/documentColor`, `textDocument/colorPresentation`, `textDocument/codeLens`, `codeLens/resolve`, `textDocument/semanticTokens/full`, `textDocument/semanticTokens/range`, `textDocument/linkedEditingRange`, `textDocument/foldingRange`, `textDocument/selectionRange`, `textDocument/inlayHint`, `inlayHint/resolve`, `textDocument/documentHighlight`, `textDocument/hover`, `textDocument/declaration`, `textDocument/definition`, `textDocument/implementation`, `textDocument/typeDefinition`, `textDocument/references`, `textDocument/prepareCallHierarchy`, `callHierarchy/incomingCalls`, `callHierarchy/outgoingCalls`, `textDocument/prepareTypeHierarchy`, `typeHierarchy/supertypes`, `typeHierarchy/subtypes`, `textDocument/prepareRename`, `textDocument/rename`, `textDocument/formatting`, `textDocument/rangeFormatting`, `textDocument/onTypeFormatting`, `textDocument/codeAction` and `codeAction/resolve` bridging for decoupled servers such as `csharp-ls`, OmniSharp and `rzls`.

The Roslyn semantic analyzer already exists in `Memory/packages/memory-roslyn`. This kit detects and reuses that sidecar as the local semantic foundation instead of duplicating it, reports whether semantic analysis is ready, misconfigured or waiting for a local `dotnet build`, and exposes the analyzed C# symbols/relations in the panel when the sidecar is ready.

## Install

```powershell
pwsh ./tools/install-feature.ps1 -Feature "CSharp Kit" -TargetTheia "Baseline/theia" -WithDependencies
```

Then run the normal Theia install/compile/build commands from the target Theia root.

Optional real C# LSP validation after compiling the package:

```powershell
npm --prefix packages/csharp-kit run test:csharp-ls-e2e
```

This opt-in check creates a temporary workspace, installs `csharp-ls` as a local dotnet tool, probes it through the C# Kit adapter, reports the advertised LSP capabilities and removes the temporary workspace unless `CSHARP_KIT_KEEP_E2E_TEMP=1` is set.

Optional real .NET workflow validation after compiling the package:

```powershell
npm --prefix packages/csharp-kit run test:dotnet-workflow-e2e
```

This opt-in check creates a temporary solution and console project through the C# Kit service, inspects the workspace, writes launch/tasks/config files, runs build diagnostics and removes the temporary workspace unless `CSHARP_KIT_KEEP_E2E_TEMP=1` is set.

Optional runtime readiness audit for a real workspace after compiling the package:

```powershell
npm --prefix packages/csharp-kit run check:runtime-readiness -- --workspace "C:\path\to\workspace"
npm --prefix packages/csharp-kit run check:runtime-readiness:full -- --workspace "C:\path\to\workspace"
```

The first command prints the detected dotnet SDK, CoreCLR debug adapter, C#/Razor language-server adapters, Roslyn sidecar status, blockers and recommendations. The strict command exits non-zero until dotnet, CoreCLR debug, C# LSP and Razor LSP adapters are discoverable and both language servers pass an LSP initialize probe.

## Runtime Requirements

- A system `dotnet` SDK on PATH.
- A workspace containing `.sln`, `.slnx`, `.slnf` or `.csproj`.
- For EF Core migration/database commands, install the `dotnet-ef` tool globally or as a local tool in the workspace.
- For F5 debugging, install `netcoredbg`/`vsdbg` and put it on PATH, declare a workspace-local dotnet tool command named `netcoredbg`, set `CYBERVINCI_CORECLR_DEBUG_ADAPTER` plus optional `CYBERVINCI_CORECLR_DEBUG_ADAPTER_ARGS`, set `NETCOREDBG_PATH` plus optional `NETCOREDBG_ARGS`, configure `.cybervinci/csharp-kit.json` with `debugAdapters.coreclr.command` and optional `args`, or install the VS Code C# extension and let C# Kit discover its external `vsdbg` runtime.
- For deeper semantic memory, build `packages/memory-roslyn/roslyn-sidecar` and enable Memory indexing, or configure `.cybervinci/csharp-kit.json` with `roslyn.analyzerPath` and optional `timeoutMs`.
- For AI chat usage of `#csharp_context` or `/csharp-context`, install Codex Provider or another Theia AI provider; the C# Kit side only contributes provider-neutral AI Core context and target completions.
- For full LSP-style editing, install `csharp-ls` or OmniSharp on PATH, declare `csharp-ls` in a workspace `dotnet-tools.json` manifest and run `dotnet tool restore`, install the VS Code C# extension so C# Kit can discover its external Roslyn runtime, set `CYBERVINCI_CSHARP_LSP_COMMAND` plus optional `CYBERVINCI_CSHARP_LSP_ARGS` and `CYBERVINCI_CSHARP_LSP_PROBE_TIMEOUT_MS`, or configure `.cybervinci/csharp-kit.json` with `languageServers.csharp.command`, optional `args` and optional `probeTimeoutMs`.
- For full Razor LSP behavior, install `rzls`/a Razor language server on PATH, declare a workspace-local dotnet tool command named `rzls` or `razor-ls`, install the VS Code C# extension so C# Kit can discover its external Razor/Roslyn runtime, set `CYBERVINCI_RAZOR_LSP_COMMAND` plus optional `CYBERVINCI_RAZOR_LSP_ARGS` and `CYBERVINCI_RAZOR_LSP_PROBE_TIMEOUT_MS`, or configure `.cybervinci/csharp-kit.json` with `languageServers.razor.command`, optional `args` and optional `probeTimeoutMs`.

Example workspace-local adapter configuration:

```json
{
  "roslyn": {
    "analyzerPath": ".tools/CyberVinci.Memory.RoslynSidecar.dll",
    "timeoutMs": 30000
  },
  "debugAdapters": {
    "coreclr": {
      "command": ".tools/netcoredbg",
      "args": ["--interpreter=vscode"]
    }
  },
  "languageServers": {
    "csharp": {
      "label": "Workspace csharp-ls",
      "command": ".tools/csharp-ls",
      "args": [],
      "probeTimeoutMs": 7000
    },
    "razor": {
      "command": "rzls",
      "args": [],
      "probeTimeoutMs": 7000
    }
  }
}
```
