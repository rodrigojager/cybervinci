# Memory Roslyn

Optional CyberVinci Memory analyzer for .NET workspaces. Install this package when C# analysis should use the Roslyn compiler platform instead of only the structural analyzer shipped by `@cybervinci/memory`.

Roslyn is specific to the .NET compiler platform. This package currently contributes a C# analyzer and ships the reference sidecar source under `roslyn-sidecar/`.

Memory remains local-first and opt-in at the workspace level. Adding this package makes Roslyn analysis available to the backend, but it does not send source code to a remote service and it does not enable Memory consent gates by itself.

## Requirements

- `@cybervinci/memory` must be present in the application.
- `@cybervinci/memory-roslyn` must be present in the same Theia application when Roslyn-backed C# analysis is desired.
- A .NET SDK capable of building and running the sidecar is required for Roslyn semantic mode.
- The workspace should contain a `.sln`, `.slnx`, or `.csproj` for MSBuild workspace loading. Single loose `.cs` files can still be analyzed, but only in parse-only mode.
- Memory and C# semantic analysis consent must be enabled for the workspace before indexed results are used by the feature UI.

## Enable

Add the package to the Theia application:

```json
"@cybervinci/memory-roslyn": "1.71.0"
```

By default, the adapter auto-detects a built sidecar under `roslyn-sidecar/bin/**/CyberVinci.Memory.RoslynSidecar.dll` when a C# workspace is indexed. Build or publish the local sidecar once:

```bash
cd packages/memory-roslyn/roslyn-sidecar
dotnet restore
dotnet build -c Release
```

You can still override auto-detection with `CYBERVINCI_ROSLYN_ANALYZER_PATH=/path/to/CyberVinci.Memory.RoslynSidecar.dll`. When the path ends in `.dll`, the adapter launches `dotnet <dll>`.

Optional runtime settings:

- `CYBERVINCI_ROSLYN_ANALYZER_PATH`: explicit path to the sidecar executable or DLL.
- `CYBERVINCI_DOTNET_PATH`: custom `dotnet` executable used when launching a DLL.
- `CYBERVINCI_ROSLYN_ANALYZER_TIMEOUT_MS`: per-file sidecar timeout. The default is `5000`.

## Analysis Modes

The Memory UI reports the active C# analysis mode:

- `roslyn-semantic`: the sidecar loaded the workspace through MSBuild/Roslyn, created a compilation, and used `SemanticModel` data. This is the expected full C# mode.
- `roslyn-parse-only`: the sidecar ran, but no project or compilation context was available. Results use Roslyn syntax parsing with explicit diagnostics that semantic context was unavailable.
- `structural-fallback`: the optional sidecar was not available or failed, so the core structural C# analyzer handled the file.
- `unavailable`: no C# analysis result is available for the indexed workspace.

Semantic mode can persist graph relations for inheritance, interfaces, overrides, calls, dependency injection, endpoints, `DbContext`/entities, and tests when the workspace model exposes enough information. Parse-only and structural fallback modes are intentionally lower fidelity and must not be treated as semantically complete C# analysis.

## Fallback Behavior

Fallback is explicit and non-blocking:

- If this package is not installed, `@cybervinci/memory` continues to use its built-in structural analyzer.
- If no built sidecar is present, the analyzer records a warning with the local `dotnet build` command and uses structural fallback.
- If the sidecar times out, exits with an error, returns an error response, or emits invalid JSON, indexing continues with structural fallback.
- If the sidecar runs but cannot load a `.sln`, `.slnx`, or `.csproj`, it reports Roslyn parse-only mode instead of claiming semantic analysis.
- Fallback is local to the backend process. Restart the backend after fixing sidecar build or environment issues so availability can be detected again.

## Smoke Test

```bash
cd packages/memory-roslyn/roslyn-sidecar
cat ./test-fixtures/basic-request.json | dotnet ./bin/sidecar/CyberVinci.Memory.RoslynSidecar.dll
```

PowerShell:

```powershell
Get-Content .\test-fixtures\basic-request.json -Raw | dotnet .\bin\sidecar\CyberVinci.Memory.RoslynSidecar.dll
```

The response should include `schemaVersion: 1`, `analyzerId: "csharp-roslyn-sidecar"`, and a diagnostic code such as `roslyn-semantic-mode` or `roslyn-parse-only-mode`.

## Troubleshooting

### The UI shows structural fallback

Check that the package is installed in the application and that the sidecar exists:

```bash
cd packages/memory-roslyn/roslyn-sidecar
dotnet build -c Release
```

If the sidecar lives outside the package tree, set `CYBERVINCI_ROSLYN_ANALYZER_PATH` to the DLL or executable. If `dotnet` is not on `PATH`, set `CYBERVINCI_DOTNET_PATH`.

### The UI shows Roslyn parse-only mode

Parse-only mode means the sidecar ran, but it could not create a semantic workspace for the file. Open or index the repository root that contains the relevant `.sln`, `.slnx`, or `.csproj`, then verify that `dotnet restore` succeeds for that workspace.

### The sidecar times out

Large solutions can exceed the default per-file timeout. Increase `CYBERVINCI_ROSLYN_ANALYZER_TIMEOUT_MS` and restart the backend:

```bash
CYBERVINCI_ROSLYN_ANALYZER_TIMEOUT_MS=15000
```

### Semantic relations are missing

Confirm the active mode is `roslyn-semantic`. If it is, verify that the target file belongs to the loaded project and that the project restores successfully. Relations that depend on resolved symbols, such as overload calls, interface implementation, DI targets, and test targets, are only reliable when Roslyn can resolve the compilation.

### Smoke test works but the IDE still falls back

Restart the Theia backend after building or publishing the sidecar. Also check that the application includes `@cybervinci/memory-roslyn`; building the sidecar alone does not register the analyzer with dependency injection.
