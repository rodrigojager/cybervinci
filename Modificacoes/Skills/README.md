# Skills

Catalog for Markdown-based skills shipped as part of `Modificacoes`.

## Layout

- `System/`: skills shipped with CyberVinci itself or with bundled extensions. These describe internal system, extension, build, prompt, generation, or runtime behavior.
- `Auto/`: user-facing utility skills that may be auto-discovered by topic, intent, or semantic matching.
- `Manual/`: user-facing utility skills that must not be auto-discovered. These can be listed in an explicit picker/search UI, but the selected file should enter model context only after the user names or chooses it.

Keep system, auto-discovered utility skills, and manual-only utility skills physically separated. A system skill can influence how CyberVinci extensions work; a utility skill should represent an imported behavior or task capability.

Large catalogs such as `Manual/Agency Agents` belong in `Manual/` so they do not pollute default AI context. A runtime or indexer must not expose `Manual/` entries through automatic recommendation/autoload behavior.

`skill-discovery.policy.json` is the machine-readable policy for importers and indexers:

- `System/**`: `discovery: system`, allowed in automatic product/extension context.
- `Auto/**`: `discovery: auto`, allowed in automatic user-facing skill suggestions.
- `Manual/**`: `discovery: manual`, blocked from automatic context and available only through explicit picker/search/name selection.

If an imported `SKILL.md` format supports frontmatter, set `discovery: manual` for anything copied into `Manual/`. CyberVinci also treats paths containing a `Manual/` segment as manual-only even when frontmatter is missing this field.

Personality or "soul" prompts belong in the root `Agents/` folder, not in `Modificacoes/Skills/`.
