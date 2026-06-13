# Manual Skills

Use this folder for user-facing utility skills that must be selected explicitly by the user.

Manual skills can appear in an explicit list, picker, or search result, but they must not be injected into model context through automatic topic detection, semantic recommendation, or default agent startup.

For `SKILL.md`-style imports, use `discovery: manual` in frontmatter. Runtime code must also treat any path below `Manual/` as manual-only, even if the imported file lacks that field.

Current folders:

- `Agency Agents/`: English utility prompt catalog imported primarily from `msitarzewski/agency-agents`.
