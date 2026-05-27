# Memory Roslyn Sidecar

This is an optional reference sidecar for the C# Memory analyzer. The TypeScript extension does not build, restore, or execute this project unless the user explicitly configures it.

## Build

```bash
dotnet restore
dotnet build --no-restore
dotnet publish -c Release -o ./bin/sidecar
```

The project depends on `Microsoft.CodeAnalysis.CSharp`. Restore/build is intentionally manual so Theia runtime and `tsc` do not require .NET.

Build output is ignored by Git under `bin/` and `obj/`. The published DLL is:

```text
./bin/sidecar/CyberVinci.Memory.RoslynSidecar.dll
```

Set `CYBERVINCI_ROSLYN_ANALYZER_PATH` to either the published executable or the DLL. When the path ends in `.dll`, the TypeScript adapter launches `dotnet <dll>` and honors `CYBERVINCI_DOTNET_PATH` if a custom `dotnet` executable is required.

## Smoke test

The `test-fixtures/basic-request.json` fixture exercises a namespace, interface, class, constructor injection, method calls, and a test method. After publishing, run:

```bash
cat ./test-fixtures/basic-request.json | dotnet ./bin/sidecar/CyberVinci.Memory.RoslynSidecar.dll
```

PowerShell:

```powershell
Get-Content .\test-fixtures\basic-request.json -Raw | dotnet .\bin\sidecar\CyberVinci.Memory.RoslynSidecar.dll
```

The response should include `schemaVersion: 1`, `analyzerId: "csharp-roslyn-sidecar"`, non-empty `symbols`, and non-empty `relations` with `relationType: "contains"`.

## Runtime contract

The sidecar reads one JSON request from stdin and writes one JSON response to stdout.

Request:

```json
{
  "schemaVersion": 1,
  "requestId": "file-id:content-hash",
  "languageId": "csharp",
  "workspacePath": "/absolute/workspace",
  "file": {
    "id": "file_...",
    "relativePath": "src/Program.cs",
    "fileName": "Program.cs",
    "extension": ".cs",
    "languageId": "csharp",
    "sizeBytes": 1234,
    "contentHash": "hash",
    "isIgnored": false,
    "isGenerated": false,
    "isBinary": false,
    "isSensitive": false
  },
  "content": "using System; class Program {}"
}
```

Success response:

```json
{
  "schemaVersion": 1,
  "requestId": "file-id:content-hash",
  "result": {
    "fileId": "file_...",
    "languageId": "csharp",
    "analyzerId": "csharp-roslyn-sidecar",
    "symbols": [],
    "relations": [],
    "imports": [],
    "callHints": [],
    "dependencyHints": []
  }
}
```

Error response:

```json
{
  "schemaVersion": 1,
  "requestId": "file-id:content-hash",
  "error": {
    "code": "analysis_failed",
    "message": "Human-readable failure",
    "detail": "Optional diagnostic detail"
  }
}
```

The TypeScript adapter treats any non-zero exit, timeout, invalid JSON, unsupported `schemaVersion`, or `error` response as sidecar unavailable and falls back to `CSharpStructuralAnalyzer`.

This fallback is per backend process: once the optional sidecar is marked unavailable, subsequent C# files in that process use the structural analyzer. The TypeScript package still compiles and runs without .NET installed unless the environment variable is set and the sidecar is invoked at runtime.
