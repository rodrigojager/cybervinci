# Arena

Arena adds a simple A/B/C prompt duel flow to a Theia-based IDE.

Use the command palette entry `Arena: New A/B Test` to open the panel. For each side, either select a Markdown agent/skill from the current workspace library or switch to `Text` and paste the prompt directly into the textarea. Then enter a task, choose an output type, and run the duel. Files and pasted prompts both use the same sandboxed runner contract.

The MVP intentionally keeps generated outputs temporary. Use the save actions to persist only the selected prompt or artifact under `.arena/` in the current workspace.

Current runner support:

- `mock`: functional development runner.
- `api-llm`: functional runner using the configured Theia AI language-model registry. It accepts an optional model id and reasoning effort.
- `codex-provider`: functional local runner using `codex exec` in a per-candidate sandbox. It sets temporary HOME/USERPROFILE/TEMP folders, disables project rules, runs with `workspace-write`, `never` approval, `--ephemeral`, and captures files from `output/`.
- `claude-code`, `gemini-cli`, `generic-cli`, `remote`: registered adapter placeholders with the same runner contract for future sandboxed execution.

Agent C generation and agent refinement use the configured Theia AI language model when available. If no ready model exists, Arena falls back to deterministic local prompt generation so the UI flow remains usable.

Temporary dispute sandboxes expire after 120 minutes while in review and are removed on finalize, cancel, failure, or expiry.

Running disputes can be cancelled from the UI. Local CLI runners receive a cancellation signal; the Codex Provider adapter kills the process tree before cleanup. On backend start, Arena also sweeps abandoned `arena-*` directories from the OS temp folder when they are older than the review TTL.

When a runner returns a diff, use `Save Winner Patch` to persist it under `.arena/patches/`. Winner artifacts are saved separately under `.arena/artifacts/`.
