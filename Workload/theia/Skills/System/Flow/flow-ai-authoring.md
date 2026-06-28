# CyberVinci Flow AI Authoring

Use this system skill when an AI agent needs to choose, instantiate, or generate a CyberVinci Flow workflow from a user request.

## Contract

- Use the runtime contract `flow.ai-authoring/v1`.
- Fetch the live spec through `flow-ai-authoring-spec` when a host RPC is available.
- If the runtime spec is unavailable, use `Modificacoes/Flow/packages/flow/src/common/flow-authoring-spec.ts` as the authoritative source.
- Return a single machine-readable object matching the authoring draft shape.

## User Boundary

- JSON and YAML are internal formats for machines and AI agents.
- Do not ask the user to edit JSON or YAML manually.
- User-editable prompt text must be Markdown.
- All non-prompt configuration must be represented through UI controls such as dropdowns, toggles, numeric inputs, model pickers, provider pickers, reasoning pickers, and the visual Flow canvas.

## Codex Host RPC Surface

When running inside the CyberVinci Codex host bridge, use these RPC methods instead of asking the user to type workflow JSON or ids:

- `flow-list-workflows`: inspect saved workflows for the current workspace.
- `flow-list-workflow-patterns`: inspect the six built-in dynamic workflow patterns.
- `flow-ai-authoring-spec`: fetch the live `flow.ai-authoring/v1` contract.
- `flow-plan-dynamic-workflow`: preview whether Flow will use a saved workflow, a pattern, or a generated workflow.
- `flow-start-workflow`: run a chosen saved workflow with the user's prompt.
- `flow-run-dynamic-workflow`: let Flow choose saved workflow, pattern, generated workflow, or AI authoring draft.
- `flow-create-workflow-from-ai-authoring-draft`: materialize an AI-authored draft before running when the host workflow calls for review.

If `flow-list-workflows` can identify the saved workflow, do not ask the user to copy a `workflowId`. Ask a short Markdown question only when multiple saved workflows are plausible and choosing automatically would be risky.

## Decision Order

1. Prefer an existing saved workflow when it clearly matches the request.
2. Instantiate a built-in workflow pattern when the task shape matches one of the six dynamic workflow patterns.
3. Generate a new `FlowWorkflow` only when no saved workflow or pattern is specific enough.
4. Ask a short Markdown question only when required information is missing and a safe default would be misleading.

## Built-In Pattern Selection

- `classify_and_act`: classify the task and dispatch to the right executor.
- `adversarial_verification`: use executor, critic/adversary, reviser, and verifier stages.
- `generate_and_filter`: create multiple candidates and filter or rank them.
- `simple_tournament`: compare candidates with a judge and pick winners.
- `bounded_loop_until_done`: iterate repair/check steps under a strict iteration cap.
- `fanout_and_synthesize_fixed`: run fixed fan-out work and synthesize the result.

## Per-Stage Model Settings

For every agentic stage, configure provider/model/reasoning through structured fields, never through raw user-facing JSON:

- `provider.providerId`
- `provider.modelId`
- `modelExecution.profileId`
- `modelExecution.reasoningPolicy`
- `modelExecution.nativeReasoning.effort`
- `modelExecution.virtualReasoning.mode`

When instantiating a pattern, use `pattern.agenticStages` and emit `roleOverrides` keyed by stage id or role.

## Authoring Draft Actions

- `run_saved_workflow`: include `savedWorkflowId` and `promptMarkdown`.
- `instantiate_pattern`: include `pattern.patternId`, typed parameters, role overrides, and `promptMarkdown`.
- `create_workflow`: include a complete `FlowWorkflow` with states, transitions, optional agent mappings, and Markdown prompt fields.
- `ask_user`: include `questionMarkdown`; keep the question short and actionable.

## Workflow Generation Rules

- Keep orchestration in Flow states and transitions.
- Keep natural-language instructions in Markdown prompt fields such as `systemPrompt` and `taskPrompt`.
- Use `dynamic_parallel` for data-dependent fan-out.
- Use `tournament` for candidate competition judged by an agentic step.
- Add explicit `modelExecution` for important agentic states.
- Prefer `virtualReasoning.mode: balanced` for planner, verifier, critic, and judge stages unless the user chooses a lighter mode.
- Do not expose hidden reasoning, internal drafts, critiques, or verifier JSON as the user-facing answer.
