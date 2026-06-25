#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const packageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageRoot, '..', '..', '..', '..');
const workloadRuntimeModulePath = path.join(repoRoot, 'Workload', 'theia', 'packages', 'cybervinci-ai-chat-experience', 'lib', 'browser', 'cybervinci-playbook-runtime.js');
const localRuntimeModulePath = path.join(packageRoot, 'lib', 'browser', 'cybervinci-playbook-runtime.js');
const isOverlayPackage = packageRoot.split(path.sep).includes('Modificacoes');
const runtimeModulePath = (isOverlayPackage
  ? [workloadRuntimeModulePath, localRuntimeModulePath]
  : [localRuntimeModulePath, workloadRuntimeModulePath]
).find(candidate => fs.existsSync(candidate));
const commonStubs = require(path.join(packageRoot, 'lib', 'common', 'cybervinci-secret-redaction.js'));

function loadRuntimeModule() {
  assert.ok(runtimeModulePath, 'Compiled cybervinci-playbook-runtime.js was not found. Run npm run compile in Workload/theia/packages/cybervinci-ai-chat-experience first.');
  const source = fs.readFileSync(runtimeModulePath, 'utf8');
  const module = { exports: {} };
  const noOpDecorator = () => () => undefined;
  const stubs = new Map([
    ['@theia/core', {}],
    ['@cybervinci/ai-runtime/lib/browser/ai-runtime-frontend-service', {}],
    ['@cybervinci/ai-providers/lib/common', {}],
    ['@cybervinci/ai-providers/lib/common/ai-providers-preferences', {
      CODEX_CLI_CLAUDE_AGENT_PREF: 'ai-features.aiProviders.claude.agent',
      CODEX_CLI_CLAUDE_EXECUTABLE_PATH_PREF: 'ai-features.aiProviders.claude.executablePath',
      CODEX_CLI_CURSOR_EXECUTABLE_PATH_PREF: 'ai-features.aiProviders.cursor.executablePath',
      CODEX_CLI_CURSOR_MODE_PREF: 'ai-features.aiProviders.cursor.mode',
      CODEX_CLI_EXECUTABLE_PATH_PREF: 'ai-features.aiProviders.executablePath',
      CODEX_CLI_GEMINI_EXECUTABLE_PATH_PREF: 'ai-features.aiProviders.gemini.executablePath',
      CODEX_CLI_MODEL_PREF: 'ai-features.aiProviders.model',
      CODEX_CLI_MODEL_PROVIDER_PREF: 'ai-features.aiProviders.modelProvider',
      CODEX_CLI_OPENCODE_AGENT_PREF: 'ai-features.aiProviders.opencode.agent',
      CODEX_CLI_OPENCODE_API_KEY_PREF: 'ai-features.aiProviders.openCodeApiKey',
      CODEX_CLI_OPENCODE_EXECUTABLE_PATH_PREF: 'ai-features.aiProviders.openCodeExecutablePath',
      CODEX_CLI_OPENCODE_VARIANT_PREF: 'ai-features.aiProviders.openCodeVariant',
      CODEX_CLI_OPENROUTER_API_KEY_PREF: 'ai-features.aiProviders.openRouterApiKey',
      CODEX_CLI_PROFILE_PREF: 'ai-features.aiProviders.profile',
      CODEX_CLI_REASONING_EFFORT_PREF: 'ai-features.aiProviders.reasoningEffort',
      CODEX_CLI_REASONING_VARIANT_OPTIONS_PREF: 'ai-features.aiProviders.reasoningVariantOptions',
      CODEX_CLI_REASONING_VARIANT_PREF: 'ai-features.aiProviders.reasoningVariant',
      CODEX_CLI_RUNTIME_PREF: 'ai-features.aiProviders.runtime',
      CODEX_CLI_SERVICE_TIER_PREF: 'ai-features.aiProviders.serviceTier'
    }],
    ['@theia/ai-chat/lib/common', {}],
    ['@theia/ai-chat/lib/common/chat-model', {
      ErrorChatResponseContentImpl: class ErrorChatResponseContentImpl {
        constructor(error) { this.error = error; }
      },
      MarkdownChatResponseContentImpl: class MarkdownChatResponseContentImpl {
        constructor(content) { this.content = content; }
      },
      QuestionResponseContentImpl: class QuestionResponseContentImpl {
        constructor(question, options, request, handler, questionOptions) {
          this.question = question;
          this.options = options;
          this.request = request;
          this.handler = handler;
          this.questionOptions = questionOptions;
        }
      }
    }],
    ['@theia/core/lib/common/preferences', {}],
    ['@theia/core/lib/common/quick-pick-service', {}],
    ['@theia/core/shared/inversify', {
      inject: noOpDecorator,
      injectable: noOpDecorator,
      optional: noOpDecorator,
      postConstruct: noOpDecorator
    }],
    ['./cybervinci-ai-chat-experience-preferences', {
      CYBERVINCI_AI_CHAT_AGENT_PROFILE_PREF: 'cybervinci.aiChat.agentProfile'
    }],
    ['../common', commonStubs],
    ['./cybervinci-tool-registry', {
      CyberVinciToolRegistry: class CyberVinciToolRegistry {}
    }]
  ]);
  const localRequire = request => stubs.has(request) ? stubs.get(request) : require(request);
  const wrapped = `(function (exports, require, module, __filename, __dirname) {\n${source}\n})`;
  const compiled = vm.runInThisContext(wrapped, { filename: runtimeModulePath });
  compiled(module.exports, localRequire, module, runtimeModulePath, path.dirname(runtimeModulePath));
  return module.exports;
}

async function main() {
  const localStorageData = new Map();
  globalThis.localStorage = {
    getItem: key => localStorageData.has(key) ? localStorageData.get(key) : null,
    setItem: (key, value) => {
      localStorageData.set(key, String(value));
    },
    removeItem: key => {
      localStorageData.delete(key);
    }
  };
  const { CyberVinciPlaybookRuntime } = loadRuntimeModule();
  const askPlaybook = {
    version: 'cybervinci.playbook/v1',
    id: 'test.ask-resume-runtime',
    name: 'Ask Resume Runtime Smoke',
    entry: 'ask-user',
    states: [
      {
        id: 'ask-user',
        type: 'ask',
        label: 'Runtime question',
        text: 'Continue through the runtime smoke test?',
        saveAs: 'decision',
        options: [
          { id: 'yes', label: 'Continue', next: 'run-tool' },
          { id: 'no', label: 'Stop', next: 'stop-response' }
        ]
      },
      {
        id: 'run-tool',
        type: 'tool',
        tool: 'test.echo',
        saveAs: 'toolResult',
        transitions: [{ to: 'route-result' }]
      },
      {
        id: 'route-result',
        type: 'condition',
        cases: [
          {
            if: { equals: ['${state.toolResult.status}', 'ok'] },
            next: 'done'
          }
        ],
        default: 'failed'
      },
      {
        id: 'done',
        type: 'response',
        text: 'Runtime smoke finished with ${state.toolResult.status}.'
      },
      {
        id: 'failed',
        type: 'response',
        text: 'Runtime smoke failed.'
      },
      {
        id: 'stop-response',
        type: 'response',
        text: 'Runtime smoke stopped.'
      }
    ]
  };
  const aiPlaybook = {
    version: 'cybervinci.playbook/v1',
    id: 'test.structured-ai-runtime',
    name: 'Structured AI Runtime Smoke',
    entry: 'plan',
    states: [
      {
        id: 'plan',
        type: 'ai',
        agent: 'runtime-smoke-planner',
        prompt: 'Plan from ${input.prompt}',
        outputMode: 'json',
        outputSchema: {
          type: 'object',
          required: ['approved', 'next'],
          properties: {
            approved: { type: 'boolean' },
            next: { type: 'string' }
          }
        },
        saveAs: 'plan',
        transitions: [{ to: 'route' }]
      },
      {
        id: 'route',
        type: 'condition',
        cases: [
          {
            if: { equals: ['${state.plan.approved}', true] },
            next: 'done'
          }
        ],
        default: 'failed'
      },
      {
        id: 'done',
        type: 'response',
        text: 'Structured AI approved ${state.plan.next}.'
      },
      {
        id: 'failed',
        type: 'response',
        text: 'Structured AI failed.'
      }
    ]
  };
  const childPlaybook = {
    version: 'cybervinci.playbook/v1',
    id: 'test.child-runtime',
    name: 'Child Runtime Smoke',
    entry: 'child-tool',
    states: [
      {
        id: 'child-tool',
        type: 'tool',
        tool: 'test.echo',
        args: { marker: 'child-ok' },
        saveAs: 'childTool',
        transitions: [{ to: 'child-end' }]
      },
      {
        id: 'child-end',
        type: 'end'
      }
    ]
  };
  const nestedParallelPlaybook = {
    version: 'cybervinci.playbook/v1',
    id: 'test.nested-parallel-runtime',
    name: 'Nested Parallel Runtime Smoke',
    entry: 'child',
    states: [
      {
        id: 'child',
        type: 'playbook',
        playbook: childPlaybook.id,
        saveAs: 'childResult',
        transitions: [{ to: 'parallel-work' }]
      },
      {
        id: 'parallel-work',
        type: 'parallel',
        branches: ['branch-a', 'branch-b'],
        saveAs: 'parallelResults',
        transitions: [{ to: 'done' }]
      },
      {
        id: 'branch-a',
        type: 'tool',
        tool: 'test.echo',
        args: { marker: 'branch-a-ok' },
        saveAs: 'branchA',
        transitions: [{ to: 'branch-a-end' }]
      },
      {
        id: 'branch-a-end',
        type: 'end'
      },
      {
        id: 'branch-b',
        type: 'tool',
        tool: 'test.echo',
        args: { marker: 'branch-b-ok' },
        saveAs: 'branchB',
        transitions: [{ to: 'branch-b-end' }]
      },
      {
        id: 'branch-b-end',
        type: 'end'
      },
      {
        id: 'done',
        type: 'response',
        text: 'Nested and parallel runtime smoke finished.'
      }
    ]
  };
  const flowRoutingPlaybook = {
    version: 'cybervinci.playbook/v1',
    id: 'test.flow-routing-runtime',
    name: 'Flow Routing Runtime Smoke',
    entry: 'route-flow',
    states: [
      {
        id: 'route-flow',
        type: 'condition',
        cases: [
          {
            if: { equals: ['${input.flowMode}', 'saved'] },
            next: 'run-saved-flow'
          },
          {
            if: { equals: ['${input.flowMode}', 'dynamic'] },
            next: 'run-dynamic-workflow'
          },
          {
            if: { equals: ['${input.flowMode}', 'authoring'] },
            next: 'run-ai-authored-flow'
          }
        ],
        default: 'run-dynamic-workflow'
      },
      {
        id: 'run-saved-flow',
        type: 'flow',
        mode: 'saved',
        workflowId: '${input.workflowId}',
        prompt: 'Saved flow prompt: ${input.prompt}',
        saveAs: 'flowResult'
      },
      {
        id: 'run-dynamic-workflow',
        type: 'flow',
        mode: 'dynamic',
        preferSaved: true,
        prompt: 'Dynamic flow prompt: ${input.prompt}',
        saveAs: 'flowResult'
      },
      {
        id: 'run-ai-authored-flow',
        type: 'flow',
        mode: 'authoring',
        preferSaved: false,
        prompt: 'Authoring flow prompt: ${input.prompt}',
        authoringDraft: '${input.authoringDraft}',
        saveAs: 'flowResult'
      }
    ]
  };
  const guardRoutingPlaybook = {
    version: 'cybervinci.playbook/v1',
    id: 'test.guard-routing-runtime',
    name: 'Guard Routing Runtime Smoke',
    entry: 'pass-guard',
    states: [
      {
        id: 'pass-guard',
        type: 'guard',
        guard: 'test.guardPass',
        saveAs: 'passGuard',
        onPass: 'fail-guard',
        onFail: 'unexpected-failure'
      },
      {
        id: 'fail-guard',
        type: 'guard',
        guard: 'test.guardFail',
        saveAs: 'failGuard',
        onPass: 'unexpected-pass',
        onFail: 'recovered'
      },
      {
        id: 'recovered',
        type: 'response',
        text: 'Guard routing recovered from ${state.failGuard}.'
      },
      {
        id: 'unexpected-pass',
        type: 'response',
        text: 'Guard unexpectedly passed.'
      },
      {
        id: 'unexpected-failure',
        type: 'response',
        text: 'Guard unexpectedly failed.'
      }
    ]
  };
  const retryAndOnErrorPlaybook = {
    version: 'cybervinci.playbook/v1',
    id: 'test.retry-on-error-runtime',
    name: 'Retry And OnError Runtime Smoke',
    entry: 'flaky-tool',
    states: [
      {
        id: 'flaky-tool',
        type: 'tool',
        tool: 'test.flaky',
        retry: { max: 1 },
        saveAs: 'flakyResult',
        transitions: [{ to: 'planned-failure' }]
      },
      {
        id: 'planned-failure',
        type: 'tool',
        tool: 'test.alwaysFail',
        onError: 'recover',
        saveAs: 'failedResult'
      },
      {
        id: 'recover',
        type: 'response',
        text: 'Recovered after ${state.failedResult}.'
      }
    ]
  };
  const failingPlaybook = {
    version: 'cybervinci.playbook/v1',
    id: 'test.failure-artifacts-runtime',
    name: 'Failure Artifacts Runtime Smoke',
    entry: 'planned-failure',
    states: [
      {
        id: 'planned-failure',
        type: 'tool',
        tool: 'test.alwaysFail',
        args: {
          apiKey: 'REDACTED_OPENAI_KEY'
        },
        saveAs: 'failedResult'
      }
    ]
  };
  const loopPlaybook = {
    version: 'cybervinci.playbook/v1',
    id: 'test.loop-runtime',
    name: 'Loop Runtime Smoke',
    entry: 'increment',
    states: [
      {
        id: 'increment',
        type: 'tool',
        tool: 'test.increment',
        saveAs: 'loopCounter',
        transitions: [{ to: 'should-loop' }]
      },
      {
        id: 'should-loop',
        type: 'condition',
        cases: [
          {
            if: { equals: ['${state.loopCounter.count}', 3] },
            next: 'done'
          }
        ],
        default: 'increment'
      },
      {
        id: 'done',
        type: 'response',
        text: 'Loop finished at ${state.loopCounter.count}.'
      }
    ]
  };
  const playbooks = new Map([
    [askPlaybook.id, askPlaybook],
    [aiPlaybook.id, aiPlaybook],
    [childPlaybook.id, childPlaybook],
    [nestedParallelPlaybook.id, nestedParallelPlaybook],
    [flowRoutingPlaybook.id, flowRoutingPlaybook],
    [guardRoutingPlaybook.id, guardRoutingPlaybook],
    [retryAndOnErrorPlaybook.id, retryAndOnErrorPlaybook],
    [failingPlaybook.id, failingPlaybook],
    [loopPlaybook.id, loopPlaybook]
  ]);
  const flowCalls = [];
  const toolAttempts = new Map();

  function createRuntime() {
    const runtime = new CyberVinciPlaybookRuntime();
    runtime.service = {
      getPlaybook: async id => playbooks.get(id)
    };
    runtime.toolRegistry = {
      setPlaybookRunner: () => undefined,
      setPlaybookResumer: () => undefined,
      executeTool: async (toolId, context) => {
        if (toolId.startsWith('core.flow.')) {
          flowCalls.push({ toolId, input: { ...context.input }, playbookId: context.playbookId, stateId: context.stateId });
          return {
            ok: true,
            stop: true,
            value: {
              id: `${toolId}:${flowCalls.length}`,
              toolId,
              input: context.input
            },
            message: `flow ${toolId} ok`
          };
        }
        if (toolId === 'test.flaky') {
          const count = (toolAttempts.get(toolId) ?? 0) + 1;
          toolAttempts.set(toolId, count);
          if (count === 1) {
            return { ok: false, message: 'flaky failed once' };
          }
          return {
            ok: true,
            value: { status: 'recovered', attempts: count },
            message: 'flaky recovered'
          };
        }
        if (toolId === 'test.alwaysFail') {
          return { ok: false, message: 'planned runtime failure' };
        }
        if (toolId === 'test.increment') {
          const previous = typeof context.state.loopCounter?.count === 'number' ? context.state.loopCounter.count : 0;
          return {
            ok: true,
            value: { count: previous + 1 },
            message: `loop count ${previous + 1}`
          };
        }
        if (toolId === 'test.guardPass') {
          return {
            ok: true,
            value: 'guard-pass-ok',
            message: 'guard passed'
          };
        }
        if (toolId === 'test.guardFail') {
          return {
            ok: false,
            message: 'planned guard failure'
          };
        }
        assert.equal(toolId, 'test.echo');
        if (context.playbookId === askPlaybook.id) {
          assert.equal(context.state.decision, 'yes');
        }
        return {
          ok: true,
          value: {
            status: 'ok',
            marker: context.input.marker ?? 'echo-ok',
            prompt: context.input.prompt
          },
          message: 'echo ok'
        };
      }
    };
    runtime.preferenceService = {
      get: () => undefined
    };
    runtime.messageService = {
      info: () => undefined
    };
    runtime.logger = {
      info: () => undefined,
      warn: () => undefined
    };
    runtime.quickPickService = undefined;
    runtime.aiRuntime = {
      runTask: async request => {
        assert.equal(request.surfaceId, 'ai-chat-playbook');
        assert.equal(request.action, 'playbook.test.structured-ai-runtime.plan');
        assert.equal(request.output.mode, 'json');
        assert.equal(request.output.schemaName, 'test.structured-ai-runtime.plan');
        assert.equal(request.effectPolicy.workspaceWrites, 'forbidden');
        return {
          provider: { id: 'test-provider', label: 'Test Provider' },
          execution: { model: 'test-model', runtime: 'test-runtime', modelProvider: 'test-model-provider' },
          structured: {
            approved: true,
            next: 'done'
          },
          text: '{"approved":true,"next":"done"}',
          diagnostics: [],
          notifications: [],
          usage: { inputTokens: 1, outputTokens: 1 },
          context: { estimatedTokens: 2, used: true }
        };
      }
    };
    runtime.init();
    return runtime;
  }

  let runtime = createRuntime();

  const firstRun = await runtime.runPlaybookById(askPlaybook.id, 'hello runtime');
  assert.equal(firstRun.ok, true);
  assert.equal(firstRun.stop, true);
  assert.match(firstRun.message || '', /paused at ask state 'ask-user'/);
  assert.equal(firstRun.value.state.decision.status, 'paused');
  assert.equal(firstRun.value.state.decision.options.length, 2);

  const requestId = firstRun.value.requestId;
  const pausedRun = runtime.getRecentRuns().find(run => run.requestId === requestId);
  assert.ok(pausedRun);
  assert.equal(pausedRun.status, 'paused');
  assert.equal(pausedRun.events.some(event => event.type === 'paused'), true);
  assert.equal(pausedRun.checkpoint.canResume, true);
  assert.equal(pausedRun.checkpoint.nextStateId, 'ask-user');

  const reloadedRuntime = createRuntime();
  const reloadedPausedRun = reloadedRuntime.getRecentRuns().find(run => run.requestId === requestId);
  assert.ok(reloadedPausedRun);
  assert.equal(reloadedPausedRun.status, 'paused');
  assert.equal(reloadedPausedRun.checkpoint.canResume, true);
  assert.equal(reloadedPausedRun.checkpoint.nextStateId, 'ask-user');

  const resumedRun = await reloadedRuntime.resumeRunWithInput(requestId, { optionId: 'yes' });
  runtime = reloadedRuntime;
  assert.equal(resumedRun.ok, true);
  assert.equal(resumedRun.stop, true);
  assert.match(resumedRun.message || '', /Runtime smoke finished with ok/);
  assert.equal(resumedRun.value.state.decision, 'yes');
  assert.equal(resumedRun.value.state.decisionMeta.optionId, 'yes');
  assert.equal(resumedRun.value.state.toolResult.status, 'ok');
  assert.equal(resumedRun.value.events.some(event => event.type === 'resumed'), true);

  const completedRun = runtime.getRecentRuns().find(run => run.requestId === requestId);
  assert.ok(completedRun);
  assert.equal(completedRun.status, 'completed');
  assert.equal(completedRun.checkpoint.canResume, false);

  const aiRun = await runtime.runPlaybookById(aiPlaybook.id, 'hello structured ai');
  assert.equal(aiRun.ok, true);
  assert.equal(aiRun.stop, true);
  assert.match(aiRun.message || '', /Structured AI approved done/);
  assert.deepEqual(aiRun.value.state.plan, { approved: true, next: 'done' });
  assert.equal(aiRun.value.events.some(event => event.type === 'ai' && event.stateId === 'plan'), true);

  const nestedParallelRun = await runtime.runPlaybookById(nestedParallelPlaybook.id, 'hello nested parallel');
  assert.equal(nestedParallelRun.ok, true);
  assert.equal(nestedParallelRun.stop, true);
  assert.match(nestedParallelRun.message || '', /Nested and parallel runtime smoke finished/);
  assert.equal(nestedParallelRun.value.state.childTool.marker, 'child-ok');
  assert.equal(nestedParallelRun.value.state.childResult.ok, true);
  assert.equal(nestedParallelRun.value.state.parallelResults.length, 2);
  assert.equal(nestedParallelRun.value.state['parallel.parallel-work.branch-a'].branchA.marker, 'branch-a-ok');
  assert.equal(nestedParallelRun.value.state['parallel.parallel-work.branch-b'].branchB.marker, 'branch-b-ok');

  const savedFlowRun = await runtime.runPlaybookById(flowRoutingPlaybook.id, 'saved request', {
    flowMode: 'saved',
    workflowId: 'flow.saved.demo'
  });
  assert.equal(savedFlowRun.ok, true);
  assert.equal(savedFlowRun.stop, true);
  assert.equal(savedFlowRun.value.state.flowResult.toolId, 'core.flow.startRun');
  assert.equal(savedFlowRun.value.state.flowResult.input.workflowId, 'flow.saved.demo');
  assert.equal(savedFlowRun.value.state.flowResult.input.prompt, 'Saved flow prompt: saved request');

  const dynamicFlowRun = await runtime.runPlaybookById(flowRoutingPlaybook.id, 'dynamic request', {
    flowMode: 'dynamic',
    execution: {
      providerId: 'direct-http:opencode',
      runtime: 'direct-http',
      modelProvider: 'opencode',
      model: 'opencode/gpt-5.5',
      reasoningEffort: 'high',
      reasoningVariant: 'fast',
      serviceTier: 'flex'
    }
  });
  assert.equal(dynamicFlowRun.ok, true);
  assert.equal(dynamicFlowRun.stop, true);
  assert.equal(dynamicFlowRun.value.state.flowResult.toolId, 'core.flow.runDynamicWorkflow');
  assert.equal(dynamicFlowRun.value.state.flowResult.input.preferSaved, true);
  assert.equal(dynamicFlowRun.value.state.flowResult.input.prompt, 'Dynamic flow prompt: dynamic request');
  assert.equal(dynamicFlowRun.value.state.flowResult.input.execution.providerId, 'direct-http:opencode');
  assert.equal(dynamicFlowRun.value.state.flowResult.input.execution.model, 'opencode/gpt-5.5');
  assert.equal(dynamicFlowRun.value.state.flowResult.input.execution.reasoningEffort, 'high');
  assert.equal(dynamicFlowRun.value.state.flowResult.input.execution.reasoningVariant, 'fast');
  assert.equal(dynamicFlowRun.value.state.flowResult.input.execution.serviceTier, 'flex');

  const authoringDraft = {
    version: 'flow.ai-authoring/v1',
    action: 'create_workflow',
    reason: 'runtime smoke'
  };
  const authoringFlowRun = await runtime.runPlaybookById(flowRoutingPlaybook.id, 'authoring request', {
    flowMode: 'authoring',
    authoringDraft
  });
  assert.equal(authoringFlowRun.ok, true);
  assert.equal(authoringFlowRun.stop, true);
  assert.equal(authoringFlowRun.value.state.flowResult.toolId, 'core.flow.runAiAuthoringDraft');
  assert.equal(authoringFlowRun.value.state.flowResult.input.preferSaved, false);
  assert.deepEqual(authoringFlowRun.value.state.flowResult.input.authoringDraft, authoringDraft);
  assert.equal(authoringFlowRun.value.state.flowResult.input.prompt, 'Authoring flow prompt: authoring request');
  assert.deepEqual(flowCalls.map(call => call.toolId), [
    'core.flow.startRun',
    'core.flow.runDynamicWorkflow',
    'core.flow.runAiAuthoringDraft'
  ]);

  const guardRoutingRun = await runtime.runPlaybookById(guardRoutingPlaybook.id, 'guard request');
  assert.equal(guardRoutingRun.ok, true);
  assert.equal(guardRoutingRun.stop, true);
  assert.match(guardRoutingRun.message || '', /Guard routing recovered from planned guard failure/);
  assert.equal(guardRoutingRun.value.state.passGuard, 'guard-pass-ok');
  assert.equal(guardRoutingRun.value.state.failGuard, 'planned guard failure');
  assert.equal(guardRoutingRun.value.events.some(event => event.type === 'tool' && event.stateId === 'pass-guard'), true);
  assert.equal(guardRoutingRun.value.events.some(event => event.type === 'tool' && event.stateId === 'fail-guard'), true);

  const retryAndOnErrorRun = await runtime.runPlaybookById(retryAndOnErrorPlaybook.id, 'retry and onError request');
  assert.equal(retryAndOnErrorRun.ok, true);
  assert.equal(retryAndOnErrorRun.stop, true);
  assert.match(retryAndOnErrorRun.message || '', /Recovered after planned runtime failure/);
  assert.equal(retryAndOnErrorRun.value.state.flakyResult.status, 'recovered');
  assert.equal(retryAndOnErrorRun.value.state.flakyResult.attempts, 2);
  assert.equal(retryAndOnErrorRun.value.state.failedResult, 'planned runtime failure');
  assert.equal(retryAndOnErrorRun.value.events.some(event => event.type === 'retry' && event.stateId === 'flaky-tool'), true);
  assert.equal(retryAndOnErrorRun.value.events.some(event => event.stateId === 'recover' && /Entering state/.test(event.message)), true);

  const failedRunResult = await runtime.runPlaybookById(failingPlaybook.id, 'failure artifact request REDACTED_OPENAI_KEY');
  assert.equal(failedRunResult.ok, false);
  const failedRun = runtime.getRecentRuns().find(run => run.requestId === failedRunResult.value.requestId);
  assert.ok(failedRun);
  assert.equal(failedRun.status, 'failed');
  assert.equal(failedRun.failureArtifacts.version, 'cybervinci.playbookFailureArtifacts/v1');
  assert.match(failedRun.failureArtifacts.summary, /planned runtime failure/);
  assert.equal(failedRun.failureArtifacts.compensation.retryable, false);
  assert.equal(failedRun.failureArtifacts.secondRunSuggestion.playbookId, failingPlaybook.id);
  assert.equal(JSON.stringify(failedRun.failureArtifacts).includes('REDACTED_OPENAI_KEY'), false);
  assert.equal(JSON.stringify(failedRun).includes('REDACTED_OPENAI_KEY'), false);

  const loopRun = await runtime.runPlaybookById(loopPlaybook.id, 'loop request');
  assert.equal(loopRun.ok, true);
  assert.equal(loopRun.stop, true);
  assert.match(loopRun.message || '', /Loop finished at 3/);
  assert.equal(loopRun.value.state.loopCounter.count, 3);
  assert.equal(loopRun.value.events.filter(event => event.type === 'state' && event.stateId === 'increment' && /Entering state/.test(event.message)).length, 3);

  console.log(JSON.stringify({
    ok: true,
    playbookId: askPlaybook.id,
    requestId,
    checked: [
      'ask pauses without explicit option',
      'resume accepts optionId',
      'paused ask runs reload from localStorage in a fresh runtime instance',
      'tool state executes after ask',
      'condition routes from saved tool result',
      'response state completes run',
      'ai state requests structured json output',
      'ai state saves structured output',
      'condition routes from structured ai output',
      'nested playbook state executes child playbook',
      'parallel state runs independent branches',
      'parallel branch state is captured under deterministic keys',
      'flow state routes saved workflow mode to core.flow.startRun',
      'flow state routes dynamic workflow mode to core.flow.runDynamicWorkflow',
      'flow state preserves chat provider/model/reasoning/service tier execution selection',
      'flow state routes authoring mode to core.flow.runAiAuthoringDraft',
      'guard state routes ok=true through onPass',
      'guard state routes ok=false through onFail without stopping when recovery exists',
      'retry repeats failed tool states before continuing',
      'onError routes ok=false tool states to recovery states',
      'failed runs record redacted failure, compensation, and second-run suggestion artifacts',
      'looping transitions execute deterministically until condition exit'
    ]
  }, null, 2));
}

main().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
