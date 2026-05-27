# Flow VS Code Host Adapter Example

This example is a runnable, CyberVinci-free host adapter for the Flow Kernel host protocol. It models the backend part a VS Code extension would need:

- start `flow-kernel serve --stdio`;
- send `handshake`, `validate_workflow`, `start_run`, `get_run`, and `list_events`;
- handle kernel-generated host requests such as `execute_workload`, `request_context_pack`, `request_memory_write`, `request_command_execution`, `request_human_gate`, and `request_artifact_open`;
- send explicit callback messages (`workload_started`, `artifact_created`, `effect_recorded`, `signal_recorded`, `workload_completed`, and gate decisions) instead of letting the UI decide transitions.

The host is intentionally deterministic. It does not call a real LLM, persist memory, run real commands, or mutate the workspace, so it is a demo/mock adapter rather than an advertisement of production capabilities. That keeps the example portable while proving that VS Code, Visual Studio, CI, or another host can drive the same kernel protocol without importing CyberVinci or Theia packages.

## Run

From the repository root:

```sh
npm --prefix examples/flow-vscode-host run demo
```

Smoke run with explicit arguments:

```sh
npm --prefix examples/flow-vscode-host run smoke
```

Useful options:

```text
--workflow <path>      Workflow JSON/YAML path.
--input <text>         User request passed to start_run.
--store <path>         Run store directory.
--kernel <command>     Kernel command. Defaults to: go run ./cmd/flow-kernel from flow-kernel/.
--max-steps <number>   Safety limit for host request polling.
```

## VS Code Extension Mapping

A real VS Code extension can reuse the same boundaries:

- `KernelClient`: owned by an extension service, starts the kernel process with `vscode.window.createOutputChannel` logging.
- `HostCapabilities`: implemented with VS Code APIs for workspace edits, terminals/tasks, webviews, file openers, and secret-safe prompts.
- `WorkloadExecutor`: calls a configured LLM provider or VS Code language model API, validates output against `flow-kernel/schemas/workload-output.schema.json`, then records artifacts/effects/signals/issues through the kernel.
- `ApprovalProvider`: maps `request_human_gate`, risky file effects, and command execution to explicit user approval UI.

The extension should not evaluate workflow transitions, joins, guards, or loops. It should only satisfy host capability requests and report structured results back to the kernel.
