# Flow Visual Studio Host Adapter Example

This is a runnable conceptual adapter for a future Visual Studio host. It proves the host boundary without importing CyberVinci, Theia, or VS Code APIs.

The example:

- starts `flow-kernel serve --stdio`;
- sends `handshake`, `status`, `validate_workflow`, `start_run`, `get_run`, and `list_events`;
- advertises Visual Studio-shaped demo capabilities for deterministic workload execution, context packs, memory review, command approval, artifact opening, human approval, and event streaming;
- handles kernel host requests such as `execute_workload`, `request_context_pack`, `request_memory_write`, `request_command_execution`, `request_human_gate`, and `request_artifact_open`;
- records workload lifecycle, artifacts, effects, signals, and gate decisions back into the kernel;
- prints an event stream by polling the kernel event log.

The implementation is deterministic and announces that mode explicitly. It does not call a real LLM, run commands, persist memory, or edit solution files, so it must not be treated as advertising real production capabilities. A real Visual Studio extension should replace only the capability handlers with Visual Studio services such as editor/diff windows, solution/project APIs, tool windows, command execution policy, credential storage, and approval dialogs. Scheduling, guards, joins, loops, gates, and event logging stay in the Go kernel.

## Run

From the repository root:

```sh
npm --prefix examples/flow-visual-studio-host run demo
```

Smoke run with explicit arguments:

```sh
npm --prefix examples/flow-visual-studio-host run smoke
```

Useful options:

```text
--workflow <path>      Workflow JSON/YAML path.
--input <text>         User request passed to start_run.
--store <path>         Run store directory.
--kernel <command>     Kernel command. Defaults to: go run ./cmd/flow-kernel from flow-kernel/.
--max-steps <number>   Safety limit for host request polling.
```

## Visual Studio Mapping

- `VisualStudioKernelClient`: owned by a package/service, starts the local kernel process and writes protocol diagnostics to an Output window.
- `VisualStudioCapabilities`: maps protocol capabilities to IDE services and reports unavailable features before a run.
- `VisualStudioWorkloadExecutor`: calls the configured LLM/agent provider, validates output, writes artifacts, and records effects through the kernel.
- `VisualStudioApprovalProvider`: handles human gates, risky file effects, and command execution through explicit dialogs and diff views.
- `VisualStudioEventStream`: subscribes to a future HTTP/WebSocket daemon or polls `list_events` as this example does.

This boundary keeps the workflow file as the source of truth and prevents a Visual Studio extension from reimplementing orchestration logic.
