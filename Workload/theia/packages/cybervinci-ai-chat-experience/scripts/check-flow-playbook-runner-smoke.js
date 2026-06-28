#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { FileUri } = require('@theia/core/lib/common/file-uri');
const { Container } = require('@theia/core/shared/inversify');
const backendModule = require('../lib/node/cybervinci-ai-chat-experience-backend-module').default;
const { FlowPlaybookRunner } = require('@cybervinci/flow/lib/node/flow-playbook-runner');
const { ProviderBackedFlowWorkloadExecutor } = require('@cybervinci/flow/lib/node/flow-workload-executor');
const { CyberVinciFlowPlaybookRunner } = require('../lib/node/cybervinci-flow-playbook-runner');

async function main() {
  const container = new Container({ defaultScope: 'Singleton' });
  container.load(backendModule);
  assert.equal(container.isBound(FlowPlaybookRunner), true, 'AI Chat backend module must bind FlowPlaybookRunner');

  const playbooks = new Map([
    ['flow-runner-smoke', {
      version: 'cybervinci.playbook/v1',
      id: 'flow-runner-smoke',
      name: 'Flow Runner Smoke',
      entry: 'start',
      states: [
        { id: 'start', type: 'start', next: 'echo' },
        {
          id: 'echo',
          type: 'tool',
          tool: 'test.echo',
          args: { marker: '${input.marker}' },
          saveAs: 'echo',
          transitions: [{ to: 'route' }]
        },
        {
          id: 'route',
          type: 'condition',
          cases: [{ if: { equals: ['${state.echo.marker}', 'ok'] }, next: 'done' }],
          default: 'failed'
        },
        { id: 'done', type: 'response', text: 'Flow runner completed ${state.echo.marker}.' },
        { id: 'failed', type: 'response', text: 'Flow runner failed.' }
      ]
    }],
    ['flow-runner-interactive', {
      version: 'cybervinci.playbook/v1',
      id: 'flow-runner-interactive',
      name: 'Flow Runner Interactive',
      entry: 'ask',
      states: [
        {
          id: 'ask',
          type: 'ask',
          text: 'Continue?',
          options: [{ id: 'yes', label: 'Yes', next: 'done' }]
        },
        { id: 'done', type: 'response', text: 'Done.' }
      ]
    }]
  ]);
  let frontendDelegations = 0;
  const runner = new CyberVinciFlowPlaybookRunner();
  runner.service = {
    getPlaybook: async id => playbooks.get(id),
    listTools: async () => [{
      id: 'test.echo',
      name: 'Echo',
      implementation: 'command',
      entry: { type: 'command', command: 'node' }
    }],
    executeDeclarativeTool: async (_toolId, argsJson) => {
      const args = JSON.parse(argsJson);
      return {
        exitCode: 0,
        stdout: JSON.stringify({ marker: args.marker, status: 'ok' }),
        stderr: ''
      };
    },
    runPlaybookFromFlowOnClient: async request => {
      frontendDelegations += 1;
      return {
        ok: true,
        message: `frontend:${request.playbookId}`,
        value: { delegated: true, prompt: request.prompt },
        signals: { 'cybervinci.playbook.frontend': true },
        diagnostics: []
      };
    }
  };

  const result = await runner.runPlaybook({
    workspaceRootUri: 'file:///tmp/workspace',
    workflowId: 'workflow-1',
    runId: 'run-1',
    stateId: 'state-1',
    workloadId: 'workload-1',
    playbookId: 'flow-runner-smoke',
    prompt: 'run smoke',
    input: { marker: 'ok' }
  });

  assert.equal(result.ok, true);
  assert.equal(result.message, 'Flow runner completed ok.');
  assert.equal(result.signals['cybervinci.playbook.id'], 'flow-runner-smoke');
  assert.equal(result.value.state.echo.marker, 'ok');
  assert.ok(result.value.events.some(event => event.type === 'tool' && event.stateId === 'echo'));

  const delegated = await runner.runPlaybook({
    workspaceRootUri: 'file:///tmp/workspace',
    workflowId: 'workflow-1',
    runId: 'run-1',
    stateId: 'state-2',
    workloadId: 'workload-frontend',
    playbookId: 'flow-runner-interactive',
    prompt: 'needs frontend',
    input: {}
  });
  assert.equal(delegated.ok, true);
  assert.equal(delegated.message, 'frontend:flow-runner-interactive');
  assert.equal(delegated.signals['cybervinci.playbook.frontend'], true);
  assert.equal(frontendDelegations, 1);

  const missing = await runner.runPlaybook({
    workflowId: 'workflow-1',
    runId: 'run-1',
    stateId: 'state-1',
    workloadId: 'workload-2',
    playbookId: 'missing',
    prompt: '',
    input: {}
  });
  assert.equal(missing.ok, false);
  assert.match(missing.message, /not found/);

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cybervinci-flow-playbook-runner-'));
  try {
    const workspaceRootUri = FileUri.create(tempDir).toString();
    const executor = new ProviderBackedFlowWorkloadExecutor(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      runner
    );
    const workflow = {
      version: 'flow.workflow/v1',
      id: 'flow-playbook-smoke',
      name: 'Flow Playbook Smoke',
      requires: { capabilities: ['playbook.run'] },
      states: {
        run_playbook: {
          id: 'run_playbook',
          type: 'playbook',
          playbookId: 'flow-runner-smoke',
          prompt: 'run from Flow executor',
          playbookInput: { marker: 'ok' },
          outputs: ['playbook/result.json']
        }
      },
      transitions: []
    };
    const run = {
      id: 'run-flow-1',
      workflowId: workflow.id,
      prompt: 'flow prompt',
      status: 'running',
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      currentStateIds: ['run_playbook'],
      stateStatuses: { run_playbook: 'running' },
      workloads: [],
      events: [],
      artifacts: [],
      effects: [],
      signals: [],
      gates: [],
      tick: 1
    };
    const workload = {
      id: 'workload-flow-1',
      runId: run.id,
      stateId: 'run_playbook',
      status: 'running',
      inputArtifacts: [],
      outputArtifacts: [],
      issues: [],
      effectIds: [],
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString()
    };
    run.workloads.push(workload);

    await executor.execute({
      workflow,
      run,
      state: workflow.states.run_playbook,
      workload,
      workspaceRootUri
    });

    assert.equal(workload.status, 'done');
    assert.equal(run.stateStatuses.run_playbook, 'done');
    assert.ok(workload.outputArtifacts.some(uri => uri.endsWith('/playbook/result.json')));
    assert.ok(run.signals.some(signal => signal.key === 'cybervinci.playbook.id' && signal.value === 'flow-runner-smoke'));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  console.log('Flow Playbook runner smoke passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
