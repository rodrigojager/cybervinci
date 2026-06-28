# Versioned Docs Registry & Local Context Manager

This package adds a local-first documentation registry MVP for AI-assisted Theia distributions.

It provides:

- a registry/package/lockfile data model;
- a backend service stored under `~/.cybervinci/library` or `%USERPROFILE%\.cybervinci\library`;
- workspace detection for `package.json`, `.csproj`, `composer.json`, `pyproject.toml`, `pom.xml`, Gradle, `go.mod`, and `Cargo.toml`;
- `.context-docs.lock.yaml` generation;
- JSON-index based local search with SQLite FTS5 when the runtime supports `node:sqlite`;
- a small generic workspace-section indexing API for local sources such as Memory code chunks;
- a Theia documentation manager view;
- commands for install, pin, lockfile validation, registry validation, update checks, store discovery, search, and contribution generation;
- AI Core tools and MCP tools for agents.

It never overwrites older installed documentation versions automatically.

## Registry Configuration

Set `THEIA_AI_DOCS_REGISTRY` to point at the registry. If unset, the extension uses a built-in seed registry so the IDE remains usable before a public registry exists.

Supported values:

- local folder: `THEIA_AI_DOCS_REGISTRY=C:\path\to\docs-registry`
- local JSON file: `THEIA_AI_DOCS_REGISTRY=C:\path\to\registry-index.json`
- HTTP URL: `THEIA_AI_DOCS_REGISTRY=https://example.com/docs-registry`

Folder registries use this structure:

```text
docs-registry/
  packages/
    nextjs/
      manifest.yaml
      versions/
        14.2.32.yaml
  skills/
    frontend-react.yaml
```

HTTP registries should expose either `index.json` or `packages.json`.

## Documentation Fetching

When a package is installed, the backend first tries `version.artifact.url`. It supports `json_index`, `sqlite`, and archive artifacts, validates `sha256` when provided, and stores the result locally.

If no artifact exists, it builds a local JSON index from the declared source:

- `git`: shallow clone, checkout tag/branch/commit, read docs paths;
- `local_folder`: index Markdown, MDX, RST, TXT, and HTML files;
- `llms_txt`: download `llms.txt`, extract referenced URLs, index fetched pages;
- `sitemap`: download sitemap XML, index listed URLs;
- `website` / `single_url`: download one page or document.
- `archive`: extract a zip/tar/tgz documentation artifact and index local Markdown/HTML/RST/TXT files.

Remote JavaScript is never executed. HTML extraction removes scripts/styles and indexes text only.

## Search Backend

The canonical local index is `index.json`, which keeps the feature portable.

When the runtime exposes Node's built-in `node:sqlite` module with FTS5 support, installation also creates `package.db` and searches use SQLite FTS5 automatically. If SQLite is unavailable or FTS5 fails, the service logs the fallback and continues using `index.json`.

`LibraryService` also exposes `indexWorkspaceSections` and `searchWorkspaceSections` for local, non-library sources. These sections are stored separately under `workspace-sections` in the same library store and use the same SQLite FTS5 plus JSON fallback pattern. Memory uses this API for code chunks, while installed package documentation continues to use `searchDocs`.

Installed documentation packages are global IDE assets under `~/.cybervinci/library/packages` and are reused by every workspace. Workspace-specific documentation pins are also stored in the IDE store under `workspace-pins`; CyberVinci does not create per-project documentation copies or new lockfiles inside the workspace for normal documentation search.

## Commands

- `Docs: Open Documentation Manager`
- `Docs: Detect Workspace Documentation`
- `Docs: Install Documentation Package`
- `Docs: Add Documentation Source`
- `Docs: Check Documentation Updates`
- `Docs: Rebuild Local Documentation Index`
- `Docs: Pin Documentation Version`
- `Docs: Generate Lockfile`
- `Docs: Update Lockfile`
- `Docs: Validate Lockfile`
- `Docs: Validate Documentation Registry`
- `Docs: Generate Registry Contribution`
- `Docs: Open Local Documentation Store`
- `Docs: Search Installed Documentation`

## Update Checks

`Docs: Check Documentation Updates` can be run manually and the backend also starts a background scheduler.

Scheduler variables:

- `THEIA_AI_DOCS_UPDATE_CHECK_ENABLED=false` disables background checks;
- `THEIA_AI_DOCS_UPDATE_CHECK_INTERVAL=manual|daily|weekly|monthly|<milliseconds>` controls the interval;
- default interval is `daily`.

Update checks detect:

- newer versions declared in the configured registry;
- changed Git refs with `git ls-remote` for branch/tag sources;
- changed HTTP `ETag` or `Last-Modified` headers for HTTP sources.

The Theia preferences `docs.updateCheck.enabled` and `docs.updateCheck.interval` remain exposed for UI/configuration alignment. The backend scheduler currently reads environment variables so it can run before the registry preference plumbing exists on the backend side.

## MCP Tools

The package contributes backend tools to Theia's MCP server when `@theia/ai-mcp-server` is present:

- `docs.search`
- `docs.get_package`
- `docs.list_installed`
- `docs.install`
- `docs.check_updates`
- `docs.list_available`

No separate docs server is started by this package. It uses Theia's existing MCP HTTP endpoint, so port selection remains the responsibility of the Theia application server.

## AI Core Tools

The package also contributes native AI Core functions selectable from generic chat capabilities:

- `docs.search`
- `docs.get_workspace_context`
- `docs.list_installed`
- `docs.install`
- `docs.check_updates`

These tools call the same `LibraryService`, so agents get local, pinned documentation context without depending on a specific model provider.

## Lockfile

Pinned documentation is written to `.context-docs.lock.yaml` in the workspace root. Agents should prefer these versions over latest documentation.

## Contribution Flow

`Docs: Generate Registry Contribution` writes YAML-ready registry files under `.docs-registry-contribution/`:

- `packages/<id>/manifest.yaml`
- `packages/<id>/versions/<version>.yaml`
- `packages/<id>/checksums.json`
- `crawlers/<id>-<source_type>.yaml`
- `packages/<id>/build-report.md`

If `THEIA_AI_DOCS_REGISTRY` points to a clean local Git clone, the service prepares a local branch and stages/commits the files when possible. If the registry clone has uncommitted changes, it leaves the generated contribution in the workspace and logs why branch preparation was skipped.
