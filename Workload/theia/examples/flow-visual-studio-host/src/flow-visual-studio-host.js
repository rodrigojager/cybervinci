#!/usr/bin/env node

const { spawn } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const readline = require('node:readline');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const kernelRoot = path.join(repoRoot, 'flow-kernel');

const hostCapabilities = [
  'mode.demo:deterministic',
  'llm.agent.execute:mock-e2e',
  'context.pack:mock-e2e',
  'memory.write:mock-e2e',
  'filesystem.diff:conceptual-demo',
  'filesystem.edit:unavailable-demo',
  'command.execute:mock-e2e-approval-required',
  'artifact.open:visual-studio-editor',
  'human.approval:modal-dialog',
  'event.stream:polling-list-events'
];

function parseArgs(argv) {
  const options = {
    workflow: path.join(repoRoot, 'flow-kernel', 'examples', 'linear.json'),
    input: 'Run a portable flow workflow from a conceptual Visual Studio host.',
    store: path.join(repoRoot, '.flow-visual-studio-host-runs'),
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
  constructor(options) {
    const [command, ...args] = splitCommand(options.kernel);
    this.child = spawn(command, [...args, 'serve', '--stdio'], {
      cwd: options.kernelCwd,
      env: {
        ...process.env,
        GOCACHE: path.join(kernelRoot, '.gocache'),
        GOMODCACHE: path.join(kernelRoot, '.gomodcache'),
        GOTELEMETRY: 'off',
        GOTELEMETRYDIR: path.join(kernelRoot, '.gotelemetry')
      },
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
    const id = message.id || `vs-host-${this.nextId++}`;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for kernel response ${id}.`));
      }, 30000);
      this.pending.set(id, { resolve, reject, timeout });
      this.child.stdin.write(`${JSON.stringify({ ...message, id })}\n`, 'utf8');
    });
  }

  close() {
    this.rejectAll(new Error('Kernel client closed.'));
    this.child.kill();
  }

  onLine(line) {
    let response;
    try {
      response = JSON.parse(line);
    } catch {
      return;
    }
    const waiter = this.pending.get(response.id || response.requestId);
    if (!waiter) {
      return;
    }
    clearTimeout(waiter.timeout);
    this.pending.delete(response.id || response.requestId);
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

  console.log('Visual Studio host capabilities:');
  for (const capability of hostCapabilities) {
    console.log(`- ${capability}`);
  }

  const client = new KernelClient(options);
  const handledRequests = new Set();
  let seenEvents = 0;
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
    seenEvents = await printNewEvents(client, options, run.id, seenEvents);

    for (let step = 0; step < options.maxSteps && !isTerminal(run.status); step += 1) {
      const requests = Array.isArray(response.requests) ? response.requests : [];
      let handledAny = false;
      for (const request of requests) {
        const key = `${request.type}:${request.runId}:${request.workloadId || request.gateId || request.artifactId}`;
        if (handledRequests.has(key)) {
          continue;
        }
        handledRequests.add(key);
        response = await handleHostRequest(client, options, request);
        run = response.run || run;
        seenEvents = await printNewEvents(client, options, run.id, seenEvents);
        handledAny = true;
      }
      if (!handledAny) {
        response = await expect(client.request({ type: 'get_run', runId: run.id, storeDir: options.store }), 'get_run.ok');
        run = response.run;
        seenEvents = await printNewEvents(client, options, run.id, seenEvents);
      }
    }

    console.log(`run: ${run.id}`);
    console.log(`status: ${run.status}`);
    console.log(`store: ${options.store}`);
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
      return recordCommandEffect(client, options, request);
    case 'request_human_gate':
      return expect(client.request({
        type: 'gate_approved',
        runId: request.runId,
        gateId: request.gateId,
        storeDir: options.store,
        note: 'Approved by conceptual Visual Studio host adapter.'
      }), 'gate_approved.ok');
    case 'request_artifact_open':
      console.log(`artifact.open: ${request.path}`);
      return expect(client.request({ type: 'get_run', runId: request.runId, storeDir: options.store }), 'get_run.ok');
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
    'Handled by the conceptual Visual Studio host adapter.',
    `Agent: ${request.agent || 'report'}`,
    `Workload: ${request.workloadId}`,
    `Output contract: ${request.outputContract || 'none'}`
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

async function recordCommandEffect(client, options, request) {
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
    command: 'devenv /command Flow.DeterministicExample',
    effect: {
      id: `${request.workloadId}-visual-studio-command`,
      summary: 'Command execution was simulated and would require Visual Studio approval UI.',
      status: 'approved',
      approvalPolicy: 'visual-studio-explicit-approval'
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
    hash: `sha256:${createHash('sha256').update(content).digest('hex')}`,
    producer: 'flow-visual-studio-host-example'
  }), 'artifact_created.ok');
}

async function printNewEvents(client, options, runId, seenEvents) {
  const response = await expect(client.request({ type: 'list_events', runId, storeDir: options.store }), 'list_events.ok');
  const events = response.events || [];
  for (const event of events.slice(seenEvents)) {
    const subject = event.stateId || event.workloadId || event.gateId || '';
    console.log(`event ${event.seq}: ${event.type}${subject ? ` ${subject}` : ''}`);
  }
  return events.length;
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
  const parts = commandLine.match(/(?:[^\s"]+|"[^"]*")+/g);
  return (parts || []).map(part => part.replace(/^"|"$/g, ''));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
