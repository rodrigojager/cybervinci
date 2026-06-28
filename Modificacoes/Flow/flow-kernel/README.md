# CyberVinci Flow Kernel

Minimal local Flow Kernel daemon used by `@cybervinci/flow` when no `FLOW_KERNEL_HTTP` or `FLOW_KERNEL_CLI` is configured.

The Theia bridge auto-detects this source tree and starts it with:

```sh
go run ./flow-kernel/cmd/flow-kernel serve --stdio
```

The daemon speaks newline-delimited JSON over stdio. It supports health/handshake, workflow validation, run start/tick/refresh, human gate callbacks, workload host callbacks, event listing, and pause/resume/cancel lifecycle messages. Agent, command, context, and memory-write work is intentionally delegated back to the Theia host through host requests; the kernel only owns workflow state, transitions, gates, artifacts, signals, and events.
