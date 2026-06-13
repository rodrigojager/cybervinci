# Flow

`@cybervinci/flow` is a removable CyberVinci/Theia extension for designing,
validating, executing, and auditing agent workflows. The workflow file is the
source of truth for structure, transitions, guards, joins, loops, gates, and
version history. The UI edits that file through typed services; it does not own
or infer orchestration logic.

Flow executes real delivery pipelines with explicit provider configuration. The Go
`flow-kernel` owns validation, scheduling, event logs, guards, joins, loops,
and human gates. The CyberVinci host owns environment capabilities such as LLM
agents, filesystem access, command execution, image generation, Project
Intelligence, artifact opening, and user approvals.

## Fail-Fast Provider Policy

Flow has **no implicit production fallback**. Provider modes behave as follows:

- `default` / `auto` / `external`: Require an available external kernel. These modes fail fast when the kernel is unreachable or misconfigured.
- `simulated`: Explicit dev/test-only mode. Never use for production workflows.
- `e2e-mock`: Explicit test-only mode for E2E validation. Does not prove production readiness.

When a required capability is missing, Flow reports an actionable error instead of silently degrading. Workflows must declare their required capabilities and the host validates them before execution.

## Per-Node Agent Configuration

Each agent state in a workflow can define explicit provider and model settings:

```yaml
states:
  - id: architect
    type: agent
    agent:
      provider:
        providerId: theia-language-model  # or: command, custom-command, codex
        modelId: <model-id>              # optional, provider-dependent
        options:                         # optional provider-specific options
          temperature: 0.7
          maxTokens: 4096
      systemPrompt: |
        You are a software architect...
      taskPrompt: |
        Review the requirements and create a contract...
      deliverables:
        - path: docs/contract.md
          description: Architecture contract
```

Supported fields per node:
- `provider.providerId`: Identifies the provider backend
- `provider.modelId`: Model identifier (optional, provider-dependent)
- `provider.options`: Provider-specific configuration options
- `systemPrompt`: System-level instructions for the agent
- `taskPrompt`: Task-specific prompt template
- `deliverables`: Expected output artifacts with paths and descriptions

## Supported Provider Paths

Flow supports the following executable provider paths:

1. **Theia Language Model** (`theia-language-model`): Uses Theia's built-in language model service. Default provider when available.

2. **Command Provider** (`command`): Executes a configured command that receives workload input on stdin and returns structured JSON on stdout. Configure with `FLOW_AGENT_LLM_COMMAND`.

3. **Custom Command Provider** (`custom-command`): Similar to command provider but with custom routing and policy controls.

4. **CyberVinci AI Providers** (`ai-providers`, legacy alias `codex`): Available where the CyberVinci AI provider extension exists.

5. **E2E Mock** (`e2e-mock`): Deterministic mock provider for tests only. Never use for production.

### Unsupported Providers

Providers like **OpenRouter** or **opencode** are **not natively supported**. They can only be used as command-backed custom providers when an environment command is explicitly configured:

```sh
FLOW_AGENT_PROVIDER=custom-command
FLOW_AGENT_CUSTOM_COMMAND="node ./scripts/openrouter-provider.js"
```

Flow does not claim native integration with these providers. Users must implement the command wrapper themselves.

## Pipeline Presets

Pipeline presets are stored under `.theia/flow/presets` in the workspace root. Presets define reusable workflow templates with pre-configured providers, models, and agent states.

Built-in presets include:

- **`sisyphus_ultrawork_coordinator`**: Coordinates ultrawork delivery pipelines with parallel implementation branches, QA validation, and bounded repair loops.

To use a preset, reference it in your workflow or select it from the Flow UI preset picker. Custom presets can be added by placing YAML or JSON files in the presets directory.

## Architecture

- `src/common` owns the public protocol, workflow/run/workload/event types,
  command ids, capabilities, validation helpers, canvas derivation, kanban
  derivation, effect contracts, import/export contracts, and version metadata.
- `src/node` owns service implementations, workflow and run stores, kernel
  process/daemon connectivity, the host workload executor boundary, Project
  Intelligence integration, effect policy enforcement, and audit persistence.
- `src/browser` owns Theia bindings and React views for the canvas, inspector,
  kanban, events, artifacts, effects, issues, gates, memory candidates,
  workflow versions, import/export, and agent editing.
- `flow-kernel` owns the portable orchestration runtime. It validates workflow
  files and workload outputs, schedules runnable work, evaluates guards, handles
  joins and loops, records events, enforces gate state, and exposes the
  host-kernel protocol.

The extension registers one frontend module and one backend module through
`theiaExtensions`. It does not patch Theia core, examples, root workspace files,
or the CyberVinci product shell. Removing the package removes the command, view,
RPC service, CSS, local stores, and Flow service bindings without
breaking the rest of the product.

## Kernel Bridge

`FlowKernelBridge` is the typed boundary between the Theia host and the Go
kernel. The bridge supports both process-based CLI use and long-lived daemon
connections. In the final runtime the preferred path is the daemon protocol
using HTTP/WebSocket or stdio, with the CLI path retained for validation,
portable scripting, and compatibility.

The bridge is responsible for:

- handshake and capability negotiation;
- workflow validation and schema diagnostics;
- run creation, listing, status lookup, ticking, approval, and cancellation;
- event streaming to the browser;
- workload dispatch requests from the kernel to the host;
- workload output submission back to the kernel;
- import/export of workflows and runs;
- version metadata and audit event persistence.

If a real kernel is not configured, Flow reports the missing capability and fails fast. Deterministic providers are available only in explicit test modes (`e2e-mock`, `simulated`), never as implicit production fallback. Test modes preserve protocol shape so browser code and tests exercise the same contracts used by the real runtime.

## Runtime Configuration

Flow advertises capabilities from the runtime it can actually execute.
Workflows declare their requirements in `requires.capabilities`; the host
resolves those requirements before starting a run and reports missing
capabilities with the affected states and enablement action.

Core capability names used by templates and validation include:

- `llm.agent.execute` for real Markdown-agent execution through a configured
  LLM provider;
- `llm.agent.execute.mock` or `llm.agent.execute.e2e_mock` for explicit
  demo/test agent execution;
- `filesystem.edit` for safe file effects using prepare, diff, approval,
  apply, and audit;
- `image.generate` for image effects backed by a configured image provider and
  artifact audit trail;
- `command.execute` for command effects guarded by allowlist, policy, timeout,
  cwd/env controls, and output redaction;
- `memory.context` for scoped context packs from Project
  Intelligence;
- `memory.write.explicit` and `memory.write.provider` for reviewed memory
  writes;
- `kernel.bridge.external` for runs connected to an external Go kernel.

Real agent execution is enabled by a host LLM provider. Configure either the
Theia language-model service path or a command provider:

```sh
FLOW_AGENT_PROVIDER=auto
FLOW_AGENT_MODEL_ID=<model-id>

# or
FLOW_AGENT_PROVIDER=command
FLOW_AGENT_LLM_COMMAND="node ./scripts/flow-agent-provider.js"
FLOW_AGENT_TIMEOUT_MS=120000
```

`FLOW_AGENT_LLM_COMMAND` receives the workload prompt/context on
standard input and must return the structured workload result expected by the
kernel. `llm.agent.execute` is advertised only when a real provider is
configured and available.

Demo and E2E execution must be explicit:

```sh
FLOW_AGENT_PROVIDER=e2e-mock
FLOW_MEMORY_PROVIDER=mock
```

In this mode the host may satisfy `llm.agent.execute.mock` or
`llm.agent.execute.e2e_mock`, but it must not be treated as proof of
`llm.agent.execute` for production workflows. The UI surfaces demo/mock mode,
simulated kernel mode, and missing capabilities separately.

The external kernel bridge is selected with:

```sh
FLOW_KERNEL_MODE=external
FLOW_KERNEL_HTTP=http://127.0.0.1:<port>

# or a CLI binary for process-based validation/use
FLOW_KERNEL_CLI=./flow-kernel
FLOW_KERNEL_TIMEOUT_MS=30000
```

Without a confirmed external kernel, the host reports simulated bridge mode and fails fast for production workflows. Simulated mode is useful for local development and tests, but does not satisfy real provider/effect capabilities.

## Manual Real-Codex Smoke

Use this only for local/manual validation of the Sisyphus hello-world pipeline. Do **not** wire it into CI.
Compile Flow first, then run the spec directly from `lib`.

```powershell
$env:FLOW_REAL_CODEX_SMOKE = '1'
$env:FLOW_KERNEL_MODE = 'external'
$env:FLOW_AGENT_PROVIDER = 'ai-providers'
Remove-Item Env:FLOW_AGENT_MODEL_ID, Env:FLOW_AGENT_LLM_MODEL_ID, Env:FLOW_AGENT_COMMAND, Env:FLOW_AGENT_LLM_COMMAND -ErrorAction SilentlyContinue
npm test -- --grep=@real-codex-smoke
```

If your Codex CLI is not on `PATH`, set `CODEX_CLI_PATH` before running the smoke.

## Effects and Memory Policy

File effects are available only when the safe file-effect adapter is active and
not disabled:

```sh
FLOW_FILE_EFFECTS=enabled
```

The adapter enforces workspace path policy, prepares diffs, checks stale hashes,
records approval/audit state, and blocks or escalates destructive writes, writes
outside the workspace allowlist, and writes to internal sensitive directories.
Agent-generated file effects must flow through the same host adapter path used
by manual review; registering an audit event alone is not enough to advertise
`filesystem.edit`.

Image effects require a provider command:

```sh
FLOW_IMAGE_PROVIDER_COMMAND="node ./scripts/flow-image-provider.js"

# Optional provider-specific command when a workflow names a provider.
FLOW_IMAGE_PROVIDER_OPENAI_COMMAND="node ./scripts/openai-image-provider.js"
```

The provider receives the effect request, writes or returns the generated image
payload, and the host records the resulting image as an artifact with prompt and
provider metadata. If no image provider is configured, image effects are blocked
and `image.generate` is missing.

Command effects are blocked by default. Enable them only with an allowlist and
policy:

```sh
FLOW_COMMAND_ALLOWLIST="npm,node,go"
FLOW_COMMAND_POLICY=configured
```

Command execution uses the effect request cwd/env, timeout, stdout/stderr
capture, and redaction policy. Workflows requiring `command.execute` should
still expect approval when policy marks the command, cwd, environment, or output
as sensitive.

Memory remains behind the host adapter:

```sh
FLOW_MEMORY_PROVIDER=local-fallback
FLOW_MEMORY_FALLBACK=true
```

Memory candidates are staged as run artifacts and UI review items. They become
permanent memory only through an explicit memory-review/write path, optionally
backed by `memory.write.provider`. A `memory_write` workload or UI approval must
preserve the originating run, workload, scope, target, edited content, decision,
and audit event.

## Real Agents

Agents remain Markdown files. They describe role, operating guidance, expected
inputs, expected outputs, and constraints, but they do not control transitions,
guards, joins, or orchestration rules. Those rules stay in the workflow file and
kernel.

The host workload executor loads the selected Markdown agent, builds a context
pack, calls the configured LLM provider, validates the response against the
workload output schema, and submits structured output to the kernel. Contracted
Parallel Delivery uses this path for architect, backend, frontend, designer, QA,
and repair agents. Parallel branches run as independent workloads and converge
through kernel-controlled joins.

Provider configuration is capability based. When an LLM provider is missing,
the service returns an actionable capability error. Deterministic mock providers
are available only in explicit test modes.

## Contracted Parallel Delivery

The Contracted Parallel Delivery template is the acceptance path for a real
Flow delivery run. A production CPD workflow should require the real
capabilities it needs, for example:

```yaml
requires:
  capabilities:
    - kernel.bridge.external
    - llm.agent.execute
    - memory.context
    - human.approval
    - filesystem.edit
    - filesystem.artifacts
    - memory.write.explicit
```

Add `image.generate`, `command.execute`, or `memory.write.provider` only when
the host has those provider/policy paths configured and the workflow genuinely
needs them. In demo/E2E mode, use the explicit mock capability names instead of
pretending the host has real providers.

The intended CPD run flow is:

1. create or load the workflow file and validate its declared capabilities;
2. build a scoped Memory context pack;
3. execute the architect Markdown agent to create the contract package, work
   orders, schemas, and acceptance rules;
4. pause at a human gate when configured;
5. execute backend, frontend, and designer branches in parallel without
   branch-to-branch communication;
6. apply, block, or hold requested file/image/command effects through policy;
7. join only through the Go kernel;
8. run QA against the contract, artifacts, effects, files, routes, assets, and
   open issues;
9. run the bounded repair loop when QA fails, preserving history;
10. pass QA, stage any memory candidates, suggest a second run for out-of-scope
    improvements, and generate the final auditable report.

The UI should show the same run through canvas state, kanban, event log,
artifacts, effects, issues, gates, memory candidates, and final report. The UI
does not decide CPD transitions.

## Effects

Workload outputs may request effects. Effects are not applied directly by
agents or by the browser. The host effect executor validates each request,
checks policy, prepares a diff or execution plan, records the decision path, and
applies the effect only when the configured policy permits it.

Supported final effect classes:

- file effects: create, update, delete, rename, and patch workspace files with
  diff preview, policy checks, approval gates when required, and artifact
  records for applied changes;
- image effects: generate or transform image assets through the configured
  image provider, with prompt metadata and generated files recorded as
  artifacts;
- command effects: execute approved commands with working directory, timeout,
  environment, output capture, and policy controls;
- memory effects: stage memory candidates and write them only after explicit
  approval through Memory;
- signal and issue effects: emit structured follow-up data without mutating the
  workspace.

Every applied effect is reflected in the event log and linked artifacts so a
run can be audited after completion.

## Memory

`MemoryAdapter` keeps Memory behind a host adapter
instead of making it a kernel dependency. The adapter provides context packs for
agents and receives approved memory writes.

The runtime uses Memory for:

- retrieval-backed context packs scoped to workflow, workload, workspace, and
  relevant project data;
- artifact, route, file, and symbol context for implementation and QA agents;
- memory candidate collection, review, approval, rejection, and writeback;
- reporting which provider capability is active or missing.

Memory candidates never become permanent memory automatically. They are shown in
the UI, tied to the originating run and workload, and written only through the
explicit approved memory path.

## UI

The browser UI is an operational console for real runs:

- editable React Flow canvas with drag and drop, zoom, pan, minimap, node
  creation, node connection, and workflow-file persistence;
- workflow inspector for states, transitions, guards, joins, loops, gates,
  workload contracts, schema diagnostics, and version metadata;
- kanban derived from live workload state;
- realtime event stream from the kernel bridge;
- artifact viewers and editor opening through Theia;
- effects panel with diff, policy, approval state, command output, and image
  results;
- issues, signals, and final report views;
- gate approval controls;
- memory candidate approval and rejection flow;
- Markdown agent editor backed by the agent store;
- import/export and version history views for workflows and runs.

The canvas remains a projection and editor for the workflow file. Runtime state
comes from the kernel and event stream, not from local UI-only state.

## Import, Export, and Versioning

Workflows can be imported from JSON or YAML files, exported with stable
formatting, and versioned as auditable revisions. Runs can be exported with
workflow snapshot, event log, workload outputs, applied effects, artifacts,
issues, memory decisions, provider capabilities, and final report data.

Version records identify the source workflow file, format, timestamp, authoring
host when available, validation status, and parent revision. Import preserves
compatibility with existing workflows and surfaces schema diagnostics instead of
silently rewriting invalid data.

## Local Data

When a workspace root is provided, workflows and runs are stored under:

`.theia/flow`

Without a workspace root, the default location is:

`~/.theia/flow`

Workflows and runs returned by the service include file metadata (`path`, `uri`,
`format`, `updatedAt`, and whether the file is editable). JSON workflow files
are saved with stable, pretty formatting. `.yaml` and `.yml` workflow files are
parsed and serialized as editable workflow sources so canvas edits and file
reloads use the same workflow file as source of truth.

## Testing and Validation

Prerequisites:

- Node.js `>=22`, matching the root `package.json` engine.
- Root workspace dependencies installed with `npm install`.
- The browser example can be built and started from `examples/browser`.
- Chromium is installed for Playwright with
  `npm --workspace @theia/playwright run playwright:install`.
- Port `3000` is available, or an existing compatible Theia browser app is
  already running there.

Focused package validation:

```sh
npm --workspace @cybervinci/flow run compile
npm --workspace @cybervinci/flow run test
```

Kernel validation:

```sh
cd flow-kernel
go test ./...
go run ./cmd/flow validate examples/contracted-parallel-delivery.json
cd ..
```

Flow browser E2E validation:

```sh
npm --workspace @theia/playwright run ui-tests -- --grep "Flow"
```

The Playwright config starts the browser app with deterministic Flow
providers:

```sh
FLOW_MEMORY_PROVIDER=mock
FLOW_AGENT_PROVIDER=e2e-mock
```

The E2E spec covers opening Flow, creating workflows from templates,
visible canvas rendering, real-protocol run progression through deterministic
providers, realtime event streaming, artifact viewers, effect review, Contracted
Parallel Delivery with mocked agent output, memory candidate approval, import,
export, version history, and workflow edit persistence. Screenshots are written
to the Playwright test output for the covered Flow views.

The CPD E2E path must keep the mock provider explicit while still exercising the
external kernel protocol, human gate, parallel branches, QA failure, repair, QA
pass, final report, file/image/command effect surfaces when configured, memory
candidate approval, and artifact viewers. A passing mock-mode E2E is not a
substitute for a production smoke run with `llm.agent.execute`,
`filesystem.edit`, `memory.context`, and any configured
`image.generate` or `command.execute` capability.

For end-user operation steps, see the
[Flow User Operation Guide](../../docs/flow-user-guide.md).

To run the full browser acceptance suite instead of the focused Flow
subset:

```sh
npm run test:playwright
```

Kernel validation is covered by Go tests in `flow-kernel`, including workflow
validation, schema validation, scheduling, joins, loops, gates, event logs,
daemon protocol handlers, and import/export compatibility.

## Acceptance Target

A complete Flow run can execute Contracted Parallel Delivery with real
agents, parallel implementation branches, kernel-controlled join, QA validation,
bounded repair loop, safe effect application, approved memory writes, and an
auditable final report. During the run the user can inspect canvas, kanban,
events, artifacts, effects, issues, gates, and memory candidates without the UI
becoming the source of orchestration truth.
