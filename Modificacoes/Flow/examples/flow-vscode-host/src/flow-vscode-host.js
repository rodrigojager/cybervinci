#!/usr/bin/env node

const { spawn } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const readline = require('node:readline');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const kernelRoot = path.join(repoRoot, 'flow-kernel');
let optionsForKernel = {
  cwd: kernelRoot,
  env: process.env
};

function parseArgs(argv) {
  const options = {
    workflow: path.join(repoRoot, 'flow-kernel', 'examples', 'linear.json'),
    input: 'Implement a portable Flow host adapter outside CyberVinci.',
    store: path.join(repoRoot, '.flow-vscode-host-runs'),
    kernel: 'go run ./cmd/flow-kernel',
    kernelCwd: kernelRoot,
    maxSteps: 30
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--workflow' && next) {
      options.workflow = path.resolve(process.cwd(), next);
      i += 1;
    } else if (arg === '--input' && next) {
      options.input = next;
      i += 1;
    } else if (arg === '--store' && next) {
      options.store = path.resolve(process.cwd(), next);
      i += 1;
    } else if (arg === '--kernel' && next) {
      options.kernel = next;
      options.kernelCwd = repoRoot;
      i += 1;
    } else if (arg === '--max-steps' && next) {
      options.maxSteps = Number.parseInt(next, 10);
      i += 1;
    }
  }
  return options;
}

class KernelClient {
  constructor(commandLine) {
    const [command, ...args] = splitCommand(commandLine);
    this.child = spawn(command, [...args, 'serve', '--stdio'], {
      cwd: optionsForKernel.cwd,
      env: optionsForKernel.env,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    this.nextId = 1;
    this.pending = new Map();
    this.stderr = '';
    this.child.stderr.setEncoding('utf8');
    this.child.stderr.on('data', chunk => {
      this.stderr += String(chunk);
    });
    this.child.once('error', error => this.rejectAll(error));
    this.child.once('close', code => {
      this.rejectAll(new Error(`flow-kernel exited with code ${code}. ${this.stderr}`.trim()));
    });
    readline.createInterface({ input: this.child.stdout, crlfDelay: Infinity })
      .on('line', line => this.onLine(line));
  }

  request(message) {
    const id = message.id || `vscode-host-${this.nextId++}`;
    const payload = { ...message, id };
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for kernel response ${id}.`));
      }, 30000);
      this.pending.set(id, { resolve, reject, timeout });
      this.child.stdin.write(`${JSON.stringify(payload)}\n`, 'utf8');
    });
  }

  close() {
    this.rejectAll(new Error('Kernel client closed.'));
    this.child.kill();
  }

  onLine(line) {
    const raw = line.trim();
    if (!raw) {
      return;
    }
    let response;
    try {
      response = JSON.parse(raw);
    } catch {
      return;
    }
    const id = response.id || response.requestId;
    const waiter = this.pending.get(id);
    if (!waiter) {
      return;
    }
    clearTimeout(waiter.timeout);
    this.pending.delete(id);
    if (response.type === 'error' || response.error) {
      waiter.reject(new Error(response.error || `Kernel returned ${response.type}.`));
    } else {
      waiter.resolve(response);
    }
  }

  rejectAll(error) {
    for (const waiter of this.pending.values()) {
      clearTimeout(waiter.timeout);
      waiter.reject(error);
    }
    this.pending.clear();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await fs.mkdir(options.store, { recursive: true });
  optionsForKernel = {
    cwd: options.kernelCwd,
    env: {
      ...process.env,
      GOCACHE: path.join(kernelRoot, '.gocache'),
      GOMODCACHE: path.join(kernelRoot, '.gomodcache'),
      GOTELEMETRY: 'off',
      GOTELEMETRYDIR: path.join(kernelRoot, '.gotelemetry')
    }
  };

  const client = new KernelClient(options.kernel);
  const handled = new Set();
  try {
    await expect(client.request({ type: 'handshake' }), 'handshake.ok');
    await expect(client.request({ type: 'status' }), 'status.ok');
    await expect(client.request({ type: 'validate_workflow', workflowPath: options.workflow }), 'validate_workflow.ok');

    let response = await expect(client.request({
      type: 'start_run',
      workflowPath: options.workflow,
      input: options.input,
      storeDir: options.store
    }), 'start_run.ok');

    let run = response.run;
    for (let step = 0; step < options.maxSteps && !isTerminal(run.status); step += 1) {
      const requests = Array.isArray(response.requests) ? response.requests : [];
      let handledAny = false;
      for (const request of requests) {
        const key = `${request.type}:${request.runId}:${request.workloadId || request.gateId || request.artifactId}`;
        if (handled.has(key)) {
          continue;
        }
        handled.add(key);
        response = await handleHostRequest(client, options, request);
        run = response.run || run;
        handledAny = true;
      }
      if (!handledAny) {
        response = await expect(client.request({
          type: 'get_run',
          runId: run.id,
          storeDir: options.store
        }), 'get_run.ok');
        run = response.run;
      }
    }

    const events = await expect(client.request({
      type: 'list_events',
      runId: run.id,
      storeDir: options.store
    }), 'list_events.ok');
    printSummary(run, events.events || [], options.store);
    if (!isTerminal(run.status)) {
      process.exitCode = 1;
    }
  } finally {
    client.close();
  }
}

async function handleHostRequest(client, options, request) {
  switch (request.type) {
    case 'execute_workload':
      return executeWorkload(client, options, request);
    case 'request_context_pack':
      return completeSyntheticWorkload(client, options, request, 'context-pack.md', 'context.pack.ready');
    case 'request_memory_write':
      return completeSyntheticWorkload(client, options, request, 'memory-write.json', 'memory.write.ready');
    case 'request_command_execution':
      return recordCommandExecution(client, options, request);
    case 'request_human_gate':
      return expect(client.request({
        type: 'gate_approved',
        runId: request.runId,
        gateId: request.gateId,
        storeDir: options.store,
        note: 'Approved by deterministic VS Code host adapter example.'
      }), 'gate_approved.ok');
    case 'request_artifact_open':
      console.log(`artifact available: ${request.path}`);
      return expect(client.request({
        type: 'get_run',
        runId: request.runId,
        storeDir: options.store
      }), 'get_run.ok');
    default:
      throw new Error(`Unsupported host request type: ${request.type}`);
  }
}

async function executeWorkload(client, options, request) {
  await expect(client.request({
    type: 'workload_started',
    runId: request.runId,
    workloadId: request.workloadId,
    storeDir: options.store
  }), 'workload_started.ok');

  const artifactPath = request.agent ? 'report.md' : 'final.md';
  const content = [
    `# ${request.stateId}`,
    '',
    `Handled by the VS Code host adapter example.`,
    `Agent: ${request.agent || 'report'}`,
    `Workload: ${request.workloadId}`
  ].join('\n');
  await recordArtifact(client, options, request, artifactPath, content);
  await expect(client.request({
    type: 'signal_recorded',
    runId: request.runId,
    stateId: request.stateId,
    workloadId: request.workloadId,
    storeDir: options.store,
    key: 'work.status',
    value: 'done'
  }), 'signal_recorded.ok');
  return expect(client.request({
    type: 'workload_completed',
    runId: request.runId,
    workloadId: request.workloadId,
    storeDir: options.store
  }), 'workload_completed.ok');
}

async function completeSyntheticWorkload(client, options, request, artifactPath, signalKey) {
  await expect(client.request({
    type: 'workload_started',
    runId: request.runId,
    workloadId: request.workloadId,
    storeDir: options.store
  }), 'workload_started.ok');
  await recordArtifact(client, options, request, artifactPath, `Generated by ${request.type}.\n`);
  await expect(client.request({
    type: 'signal_recorded',
    runId: request.runId,
    stateId: request.stateId,
    workloadId: request.workloadId,
    storeDir: options.store,
    key: signalKey,
    value: true
  }), 'signal_recorded.ok');
  return expect(client.request({
    type: 'workload_completed',
    runId: request.runId,
    workloadId: request.workloadId,
    storeDir: options.store
  }), 'workload_completed.ok');
}

async function recordCommandExecution(client, options, request) {
  await expect(client.request({
    type: 'workload_started',
    runId: request.runId,
    workloadId: request.workloadId,
    storeDir: options.store
  }), 'workload_started.ok');
  await expect(client.request({
    type: 'effect_recorded',
    runId: request.runId,
    stateId: request.stateId,
    workloadId: request.workloadId,
    storeDir: options.store,
    effectType: 'command.executed',
    command: 'echo deterministic-host-command',
    effect: {
      id: `${request.workloadId}-command`,
      summary: 'Command execution was simulated by the host adapter example.',
      status: 'approved',
      approvalPolicy: 'deterministic-example'
    }
  }), 'effect_recorded.ok');
  return expect(client.request({
    type: 'workload_completed',
    runId: request.runId,
    workloadId: request.workloadId,
    storeDir: options.store
  }), 'workload_completed.ok');
}

async function recordArtifact(client, options, request, artifactPath, content) {
  const hash = `sha256:${createHash('sha256').update(content).digest('hex')}`;
  return expect(client.request({
    type: 'artifact_created',
    runId: request.runId,
    stateId: request.stateId,
    workloadId: request.workloadId,
    storeDir: options.store,
    artifactId: `${request.workloadId}-${artifactPath}`,
    artifactType: artifactPath.endsWith('.json') ? 'json' : 'file',
    path: artifactPath,
    content,
    hash,
    producer: 'flow-vscode-host-example'
  }), 'artifact_created.ok');
}

async function expect(promise, type) {
  const response = await promise;
  if (response.type !== type) {
    throw new Error(`Expected ${type}, got ${response.type}.`);
  }
  return response;
}

function isTerminal(status) {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

function splitCommand(commandLine) {
  return commandLine.match(/(?:[^\s"]+|"[^"]*")+/g).map(part => part.replace(/^"|"$/g, ''));
}

function printSummary(run, events, storeDir) {
  console.log(`run: ${run.id}`);
  console.log(`status: ${run.status}`);
  console.log(`store: ${storeDir}`);
  console.log(`events: ${events.length}`);
  for (const event of events.slice(-5)) {
    console.log(`${event.seq}: ${event.type} ${event.stateId || event.workloadId || ''}`.trim());
  }
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
