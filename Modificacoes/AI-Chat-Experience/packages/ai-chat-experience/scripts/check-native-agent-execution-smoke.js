#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const yaml = require('js-yaml');

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

const nativeAgentsPath = path.join(packageRoot, 'config', 'system', 'agents', 'native-theia-chat-agents.yml');
const nativePlaybooksPath = path.join(packageRoot, 'config', 'system', 'playbooks', 'native-theia-agent-playbooks.yml');
const nativeDelegatePlaybookPath = path.join(packageRoot, 'config', 'system', 'playbooks', 'native-agent-delegate.playbook.yml');

const EXPECTED_AUTONOMOUS_NATIVE_TOOL_SEQUENCE = [
  'core.agent.describe',
  'core.agent.preflight',
  'system.agent.nativeMcpRequirements'
];

const AUTONOMOUS_NATIVE_AGENTS = {
  AppTester: {
    aiState: 'answer-app-tester',
    responsePrefix: 'AppTester autonomous summary'
  },
  Architect: {
    aiState: 'answer-architect',
    responsePrefix: 'Architect autonomous summary'
  },
  Coder: {
    aiState: 'answer-coder',
    responsePrefix: 'Coder autonomous summary'
  },
  'code-reviewer': {
    aiState: 'answer-code-reviewer',
    responsePrefix: 'Code Reviewer autonomous summary'
  },
  Command: {
    aiState: 'answer-command',
    responsePrefix: 'Command autonomous summary'
  },
  CreateSkill: {
    aiState: 'answer-create-skill',
    responsePrefix: 'CreateSkill autonomous summary'
  },
  explore: {
    aiState: 'answer-explore',
    responsePrefix: 'Explore autonomous summary'
  },
  GitHub: {
    aiState: 'answer-github',
    responsePrefix: 'GitHub autonomous summary'
  },
  OpenCoder: {
    aiState: 'answer-open-coder',
    responsePrefix: 'OpenCoder autonomous summary'
  },
  Orchestrator: {
    aiState: 'answer-orchestrator',
    responsePrefix: 'Orchestrator autonomous summary'
  },
  'pr-reviewer': {
    aiState: 'answer-pr-reviewer',
    responsePrefix: 'PR Reviewer autonomous summary'
  },
  ProjectInfo: {
    aiState: 'answer-project-info',
    responsePrefix: 'ProjectInfo autonomous summary'
  },
  Universal: {
    aiState: 'answer-universal',
    responsePrefix: 'Universal autonomous summary'
  }
};

const REPRESENTATIVE_PROMPTS = {
  OpenCoder: 'Implement a small workspace-safe change and describe the validation steps.',
  Coder: 'Inspect the current file context and propose a focused code edit.',
  Architect: 'Create a concise implementation plan for a new AI Chat feature.',
  GitHub: 'Summarize what would be needed to review a GitHub pull request.',
  AppTester: 'Plan a browser-based smoke test for the current UI.',
  'code-reviewer': 'Review the current change for regressions and missing tests.',
  'pr-reviewer': 'Prepare a pull-request review checklist for this workspace.',
  explore: 'Explore the repository structure and identify the relevant package.',
  ProjectInfo: 'Explain the current project purpose and main package boundaries.',
  CreateSkill: 'Draft the outline for a reusable Codex skill.',
  Orchestrator: 'Route this request to the right specialist agents.',
  Universal: 'Answer a general CyberVinci workspace question.',
  Command: 'Suggest the safest command sequence to validate the current package.'
};

function noOpDecorator() {
  return () => undefined;
}

function readCatalogYaml(file) {
  assert.ok(fs.existsSync(file), `Required catalog file was not found: ${file}`);
  return yaml.load(fs.readFileSync(file, 'utf8'));
}

function loadRuntimeModule() {
  assert.ok(runtimeModulePath, 'Compiled cybervinci-playbook-runtime.js was not found. Run npm run compile in Workload/theia/packages/cybervinci-ai-chat-experience first.');
  const source = fs.readFileSync(runtimeModulePath, 'utf8');
  const module = { exports: {} };
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
      CYBERVINCI_AI_CHAT_AGENT_PROFILE_PREF: 'cybervinci.aiChat.agentProfile',
      CYBERVINCI_AI_CHAT_MODE_PREF: 'cybervinci.aiChat.mode'
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

function createChatRequest(text) {
  const data = new Map();
  const content = [];
  const request = {
    request: { text },
    data,
    content,
    completed: false,
    addData: (key, value) => {
      data.set(key, value);
    },
    response: {
      response: {
        addContent: item => {
          content.push(item);
        }
      },
      error: error => {
        throw error;
      },
      complete: () => {
        request.completed = true;
      },
      waitForInput: async () => undefined
    }
  };
  return request;
}

function buildPlaybookMap() {
  const playbooks = [
    ...readCatalogYaml(nativePlaybooksPath).playbooks,
    ...readCatalogYaml(nativeDelegatePlaybookPath).playbooks
  ];
  return new Map(playbooks.map(playbook => [playbook.id, playbook]));
}

function toolContextAgentId(context) {
  return context.state.agent?.id
    ?? context.state.toolInput?.agentId
    ?? context.input.agentId;
}

async function main() {
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => undefined
  };

  const nativeAgents = readCatalogYaml(nativeAgentsPath).agents;
  assert.equal(nativeAgents.length, 13, 'The native @ catalog fixture must keep exactly 13 audited agents.');
  assert.equal(Object.keys(AUTONOMOUS_NATIVE_AGENTS).length, nativeAgents.length, 'Every audited native @ agent must have an autonomous-preferred playbook smoke fixture.');
  for (const agent of nativeAgents) {
    assert.equal(agent.kind, 'native', `${agent.id} must be a native agent.`);
    assert.equal(agent.defaultPlaybook, `native-agent.${agent.sourceAgentId}`, `${agent.id} must point to its per-agent playbook.`);
  }

  const { CyberVinciPlaybookRuntime } = loadRuntimeModule();
  const playbooks = buildPlaybookMap();
  const runtime = new CyberVinciPlaybookRuntime();
  const toolCalls = [];
  const nativeInvocations = [];
  const aiCalls = [];

  runtime.service = {
    getPlaybook: async id => playbooks.get(id),
    readAgent: async id => id === 'engineering/frontend-engineer'
      ? {
        id,
        name: 'Frontend Engineer',
        category: 'engineering',
        relativePath: 'engineering/frontend-engineer.md',
        content: [
          '---',
          'name: Frontend Engineer',
          'description: Build and review production UI without leaking markdown frontmatter.',
          '---',
          '',
          '# Frontend Engineer',
          'Build and review production UI.'
        ].join('\n')
      }
      : undefined
  };
  runtime.toolRegistry = {
    executeTool: async (toolId, context) => {
      const agentId = toolContextAgentId(context);
      toolCalls.push({
        toolId,
        playbookId: context.playbookId,
        stateId: context.stateId,
        agentId,
        prompt: context.input.prompt
      });
      switch (toolId) {
        case 'core.agent.describe':
          return {
            ok: true,
            value: {
              id: agentId,
              name: context.state.agent?.name,
              migrationStatus: {
                strategy: 'playbook-overlay/native-delegate',
                nativeDelegation: true
              }
            }
          };
        case 'core.agent.preflight':
          return {
            ok: true,
            value: {
              agentId,
              ready: true,
              promptReceived: typeof context.input.prompt === 'string' && context.input.prompt.length > 0
            }
          };
        case 'system.agent.nativeMcpRequirements':
          return {
            ok: true,
            value: {
              agentName: context.state.agent?.name ?? agentId,
              recommendedAction: 'continue',
              selectedGroupLabel: 'No MCP setup required',
              requiredGroups: []
            }
          };
        default:
          throw new Error(`Unexpected tool '${toolId}' for ${agentId}.`);
      }
    }
  };
  runtime.aiRuntime = {
    runTask: async request => {
      aiCalls.push(request);
      const action = String(request.action || '');
      const autonomousLabel = Object.values(AUTONOMOUS_NATIVE_AGENTS).find(entry => action.includes(entry.aiState))?.responsePrefix.replace(' autonomous summary', '');
      const label = autonomousLabel ?? 'Unknown';
      return {
        text: `${label} autonomous summary for: ${request.userPrompt}`,
        provider: {
          id: 'smoke-ai-runtime',
          label: 'Smoke AI Runtime'
        },
        execution: {
          model: 'smoke-project-info',
          runtime: 'smoke',
          modelProvider: 'smoke'
        },
        diagnostics: [],
        notifications: []
      };
    }
  };
  const preferenceValues = {
    'cybervinci.aiChat.agentProfile': 'engineering/frontend-engineer',
    'cybervinci.aiChat.mode': 'fullaccess'
  };
  runtime.preferenceService = {
    get: (key, defaultValue) => Object.prototype.hasOwnProperty.call(preferenceValues, key) ? preferenceValues[key] : defaultValue
  };
  runtime.messageService = {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined
  };
  runtime.logger = {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined
  };

  const checkedAgents = [];
  for (const agent of nativeAgents) {
    const prompt = REPRESENTATIVE_PROMPTS[agent.id];
    assert.ok(prompt, `Missing representative prompt for native agent '${agent.id}'.`);
    const request = createChatRequest(prompt);
    const beforeCalls = toolCalls.length;
    const beforeNativeInvocations = nativeInvocations.length;
    const beforeAiCalls = aiCalls.length;

    await runtime.invokeAgentTurn(agent, request, async () => {
      nativeInvocations.push({
        agentId: agent.id,
        sourceAgentId: agent.sourceAgentId,
        prompt
      });
    });

    const agentCalls = toolCalls.slice(beforeCalls);
    assert.equal(request.data.get('cybervinci.playbook.id'), agent.defaultPlaybook);
    assert.ok(request.data.get('cybervinci.playbook.requestId'), `${agent.id} must attach a playbook request id to the chat request.`);

    const run = runtime.getRecentRuns()[0];
    assert.equal(run.playbookId, agent.defaultPlaybook);
    assert.equal(run.agentId, agent.id);
    assert.equal(run.sourceAgentId, agent.sourceAgentId);
    assert.equal(run.status, 'completed');
    assert.equal(run.diagnostics.length, 0);
    assert.equal(run.events.some(event => event.type === 'completed'), true, `${agent.id} must complete the playbook run.`);

    const autonomous = AUTONOMOUS_NATIVE_AGENTS[agent.id];
    assert.ok(autonomous, `${agent.id} must have an autonomous smoke fixture.`);
    if (autonomous) {
      assert.deepEqual(agentCalls.map(call => call.toolId), EXPECTED_AUTONOMOUS_NATIVE_TOOL_SEQUENCE, `${agent.id} must run deterministic metadata guards before the autonomous AI state.`);
      assert.deepEqual(agentCalls.map(call => call.stateId), [
        'describe-agent',
        'preflight',
        'check-native-requirements'
      ], `${agent.id} autonomous path must not invoke the native delegate.`);
      assert.equal(aiCalls.length, beforeAiCalls + 1, `${agent.id} must call the AI Runtime in the autonomous path.`);
      assert.equal(aiCalls.at(-1).execution.providerId, 'codex-app-server:codex', `${agent.id} must pass the selected chat execution provider into the autonomous AI state.`);
      assert.equal(aiCalls.at(-1).execution.modelProvider, 'codex', `${agent.id} must pass the selected chat model provider into the autonomous AI state.`);
      assert.equal(aiCalls.at(-1).execution.approvalPolicy, 'never', `${agent.id} must pass Full Access approval policy into the autonomous AI state.`);
      assert.equal(aiCalls.at(-1).execution.sandboxMode, 'danger-full-access', `${agent.id} must pass Full Access sandbox policy into the autonomous AI state.`);
      assert.equal(aiCalls.at(-1).effectPolicy.previewOnly, false, `${agent.id} must disable preview-only execution when Full Access is selected.`);
      assert.equal(aiCalls.at(-1).effectPolicy.workspaceWrites, 'allowed', `${agent.id} must allow workspace writes when Full Access is selected.`);
      assert.equal(aiCalls.at(-1).effectPolicy.shellExecution, 'allowed', `${agent.id} must allow shell execution when Full Access is selected.`);
      assert.match(aiCalls.at(-1).systemPrompt, /You are operating as the selected CyberVinci Agent profile: Frontend Engineer\./, `${agent.id} must make the selected markdown Agent profile authoritative role context.`);
      assert.match(aiCalls.at(-1).systemPrompt, /<agent_profile_instructions>[\s\S]*Frontend Engineer[\s\S]*Build and review production UI[\s\S]*<\/agent_profile_instructions>/, `${agent.id} must pass the selected markdown Agent profile through hidden system prompt context.`);
      assert.doesNotMatch(aiCalls.at(-1).systemPrompt, /^---$/m, `${agent.id} must strip markdown frontmatter separators from hidden Agent profile context.`);
      assert.doesNotMatch(aiCalls.at(-1).systemPrompt, /^description:/m, `${agent.id} must strip markdown frontmatter fields from hidden Agent profile context.`);
      assert.doesNotMatch(request.request.text, /Frontend Engineer|<agent_profile>|Build and review production UI/, `${agent.id} must not mutate the visible user request with Agent profile markdown.`);
      assert.equal(nativeInvocations.length, beforeNativeInvocations, `${agent.id} autonomous path must not invoke the native source agent.`);
      assert.equal(run.events.some(event => event.type === 'ai' && event.stateId === autonomous.aiState), true, `${agent.id} must record the autonomous AI state.`);
      assert.equal(run.events.some(event => event.type === 'native-agent'), false, `${agent.id} autonomous path must not record native delegation.`);
      assert.equal(request.content.some(item => String(item.content ?? '').includes(autonomous.responsePrefix)), true, `${agent.id} must emit the autonomous response content.`);
      assert.equal(request.completed, true, `${agent.id} autonomous path must complete the chat response after emitting content.`);
    }
    checkedAgents.push(agent.id);
  }

  runtime.aiRuntime = {
    runTask: async request => {
      aiCalls.push(request);
      throw new Error(`Simulated autonomous AI Runtime failure for ${request.action}.`);
    }
  };

  for (const [agentId, autonomous] of Object.entries(AUTONOMOUS_NATIVE_AGENTS)) {
    const failureAgent = nativeAgents.find(agent => agent.id === agentId);
    assert.ok(failureAgent, `${agentId} native agent must exist for autonomous failure smoke.`);
    const failureRequest = createChatRequest(REPRESENTATIVE_PROMPTS[agentId]);
    const failureBeforeCalls = toolCalls.length;
    const failureBeforeNativeInvocations = nativeInvocations.length;
    let failureError;
    try {
      await runtime.invokeAgentTurn(failureAgent, failureRequest, async () => {
        nativeInvocations.push({
          agentId: failureAgent.id,
          sourceAgentId: failureAgent.sourceAgentId,
          prompt: REPRESENTATIVE_PROMPTS[agentId]
        });
      });
    } catch (error) {
      failureError = error;
    }
    assert.ok(failureError, `${agentId} AI Runtime failure must surface an error instead of delegating.`);
    const failureCalls = toolCalls.slice(failureBeforeCalls);
    assert.deepEqual(failureCalls.map(call => call.toolId), EXPECTED_AUTONOMOUS_NATIVE_TOOL_SEQUENCE, `${agentId} AI Runtime failure must stay on the autonomous playbook path.`);
    assert.deepEqual(failureCalls.map(call => call.stateId), [
      'describe-agent',
      'preflight',
      'check-native-requirements'
    ], `${agentId} AI Runtime failure must not route to invoke-native-agent.`);
    assert.equal(nativeInvocations.length, failureBeforeNativeInvocations, `${agentId} AI Runtime failure must not invoke the native source agent.`);
    const failureRun = runtime.getRecentRuns()[0];
    assert.equal(failureRun.playbookId, failureAgent.defaultPlaybook);
    assert.equal(failureRun.status, 'failed');
    assert.equal(failureRun.events.some(event => event.type === 'failed' && event.stateId === autonomous.aiState), true, `${agentId} failure must record the failed AI state.`);
    assert.equal(failureRun.events.some(event => event.type === 'native-agent'), false, `${agentId} failure must not record native delegation.`);
    assert.equal(failureRequest.content.length, 1, `${agentId} failure must emit visible error content instead of delegating.`);
  }

  console.log(JSON.stringify({
    ok: true,
    checked: [
      'all 13 audited native @ agents execute their per-agent playbook',
      'all 13 audited native @ agents run describe -> preflight -> nativeMcpRequirements -> autonomous AI response',
      'Full Access chat mode reaches autonomous AI Runtime execution and effect policies',
      'selected markdown Agent profile is injected as authoritative role instructions without frontmatter',
      'all 13 audited native @ agents do not invoke the native delegate when AI Runtime fails',
      'each native agent attaches playbook metadata to the chat request',
      'each native agent records a completed run with expected event history'
    ],
    nativeAgents: checkedAgents,
    nativeInvocations: nativeInvocations.length,
    toolCalls: toolCalls.length,
    aiCalls: aiCalls.length
  }, null, 2));
}

main().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
