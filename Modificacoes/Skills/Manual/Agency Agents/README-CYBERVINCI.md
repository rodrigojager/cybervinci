# CyberVinci Import Notes

Primary source: `msitarzewski/agency-agents`

Imported into `Modificacoes/Skills/Manual/Agency Agents` as a manual-only user-facing utility prompt catalog. These are not CyberVinci system skills and are not extension internals.

Discovery rule: this folder must not be auto-loaded, auto-recommended, or injected into default AI context. A runtime may list or search these files only in an explicit manual selection flow, and a file should enter model context only after the user names or chooses it.

The category folders from the upstream collection were preserved. Repository tooling folders such as `.git`, `.github`, `scripts`, and `examples` were intentionally not imported.

Additional CyberVinci review content lives under `under-review/` and is kept in English because it does not exist in the upstream source.
