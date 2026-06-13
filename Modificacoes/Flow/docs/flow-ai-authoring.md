# Flow AI Authoring

CyberVinci Flow supports machine-authored workflows through the shared
`flow.ai-authoring/v1` spec exposed by `getFlowAiAuthoringSpec`.

The important boundary is:

- JSON and YAML are internal machine-readable workflow formats.
- Users should configure workflows through UI controls.
- The only manually editable human text surface is Markdown prompt content.
- Dynamic workflow agents should first try a matching saved workflow, then a built-in pattern, and only then emit a complete new `FlowWorkflow`.

The runtime spec lives in:

- `packages/flow/src/common/flow-authoring-spec.ts`

Consumers should use the exported `systemPrompt`, `outputSchema`, typed pattern metadata, model profiles, and UI control mapping instead of hard-coding their own workflow schema.

## Codex host bridge

The CyberVinci Codex host bridge exposes Flow through RPC methods so a Codex-hosted agent can start saved and dynamic workflows without requiring manual JSON/YAML edits:

- `flow-list-workflows`
- `flow-list-workflow-patterns`
- `flow-ai-authoring-spec`
- `flow-plan-dynamic-workflow`
- `flow-start-workflow`
- `flow-run-dynamic-workflow`
- `flow-create-workflow-from-ai-authoring-draft`

Agents should list saved workflows first, use `flow-start-workflow` when a saved workflow clearly matches, and use `flow-run-dynamic-workflow` when Flow should choose between saved workflows, patterns, or generated workflows.
