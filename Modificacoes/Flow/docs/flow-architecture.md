# CyberVinci Flow Architecture

CyberVinci Flow is a removable Theia extension for visual agency workflows,
runs, human gates, artifacts, workload boards, and audit packages.

## Agency Kernel

Flow keeps the portable Agency Kernel outside Theia UI concerns. The Theia
extension talks to the kernel through explicit CLI, stdio, HTTP, or WebSocket
transport boundaries, so workflow execution can move independently from IDE UI
upgrades.

## Memory adapter

Flow reads context packs and writes memory candidates through a narrow Memory
adapter. Workflow state must not import Memory internals directly; Memory can be
present, absent, or replaced by an external provider without changing workflow
schemas.

## Removable Extension Criteria

Flow remains removable when:

- host apps can drop `@cybervinci/flow` without breaking unrelated product
  extensions;
- kernel startup, transport, and host capability failures fail explicitly
  instead of silently falling back to deterministic execution;
- run artifacts, workflow files, and Memory writes remain scoped to Flow-owned
  storage and adapter APIs.

## Regression Gates

- `flow-contracts`: validates extension isolation, host bridge protocol,
  kernel/CLI boundary, Memory adapter, run/workflow storage, and removable-host
  behavior.
