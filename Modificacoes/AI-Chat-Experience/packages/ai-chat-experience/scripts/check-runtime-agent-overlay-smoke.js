#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const packageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageRoot, '..', '..', '..', '..');
const workloadContributionModulePath = path.join(repoRoot, 'Workload', 'theia', 'packages', 'cybervinci-ai-chat-experience', 'lib', 'browser', 'cybervinci-declarative-chat-agent-contribution.js');
const workloadRuntimeModulePath = path.join(repoRoot, 'Workload', 'theia', 'packages', 'cybervinci-ai-chat-experience', 'lib', 'browser', 'cybervinci-playbook-runtime.js');
const localContributionModulePath = path.join(packageRoot, 'lib', 'browser', 'cybervinci-declarative-chat-agent-contribution.js');
const localRuntimeModulePath = path.join(packageRoot, 'lib', 'browser', 'cybervinci-playbook-runtime.js');
const isOverlayPackage = packageRoot.split(path.sep).includes('Modificacoes');
const contributionModulePath = (isOverlayPackage
  ? [workloadContributionModulePath, localContributionModulePath]
  : [localContributionModulePath, workloadContributionModulePath]
).find(candidate => fs.existsSync(candidate));
const runtimeModulePath = (isOverlayPackage
  ? [workloadRuntimeModulePath, localRuntimeModulePath]
  : [localRuntimeModulePath, workloadRuntimeModulePath]
).find(candidate => fs.existsSync(candidate));
const commonStubs = require(path.join(packageRoot, 'lib', 'common', 'cybervinci-secret-redaction.js'));

const NATIVE_AGENT_PLAYBOOK_PREFIX = 'native-agent.';
const PRESERVED_NATIVE_KEYS = ['invoke', 'modes', 'prompts', 'variables', 'functions', 'languageModelRequirements'];
const REQUIRED_AGENT_TOOLS = ['core.agent.describe', 'core.agent.preflight', 'system.agent.nativeMcpRequirements'];

function noOpDecorator() {
  return () => undefined;
}

function loadCompiledModule(file, extraStubs = {}) {
  assert.ok(file, 'Compiled module was not found. Run npm run compile in Workload/theia/packages/cybervinci-ai-chat-experience first.');
  const source = fs.readFileSync(file, 'utf8');
  const module = { exports: {} };
  const stubs = new Map([
    ['@theia/ai-core', {}],
    ['@theia/ai-chat/lib/common', {
      ChatAgentLocation: {
        fromRaw: value => value
      }
    }],
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
    ['@cybervinci/ai-runtime/lib/browser/ai-runtime-frontend-service', {}],
    ['@theia/core', {
      URI: {
        fromFilePath: value => ({ toString: () => String(value) })
      }
    }],
    ['@theia/core/lib/browser', {
      open: async () => undefined
    }],
    ['@theia/core/lib/common/preferences', { PreferenceScope: { User: 1 } }],
    ['@theia/core/lib/common/quick-pick-service', {}],
    ['@theia/core/shared/inversify', {
      inject: noOpDecorator,
      injectable: noOpDecorator,
      optional: noOpDecorator,
      postConstruct: noOpDecorator
    }],
    ['../common', commonStubs],
    ['./cybervinci-declarative-chat-agent', {
      CyberVinciDeclarativePromptChatAgent: class CyberVinciDeclarativePromptChatAgent {},
      CyberVinciDelegatingChatAgent: class CyberVinciDelegatingChatAgent {
        constructor(definition) {
          this.id = definition.id;
          this.name = definition.name;
        }
      }
    }],
    ['./cybervinci-ai-chat-experience-preferences', {
      CYBERVINCI_AI_CHAT_PLAYBOOK_PREF: 'cybervinci.aiChat.playbook'
    }],
    ['./cybervinci-playbook-runtime', {
      CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX: NATIVE_AGENT_PLAYBOOK_PREFIX,
      CyberVinciPlaybookRuntime: class CyberVinciPlaybookRuntime {}
    }],
    ['./cybervinci-tool-registry', {
      CyberVinciToolRegistry: class CyberVinciToolRegistry {}
    }],
    ...Object.entries(extraStubs)
  ]);
  const localRequire = request => stubs.has(request) ? stubs.get(request) : require(request);
  const wrapped = `(function (exports, require, module, __filename, __dirname) {\n${source}\n})`;
  const compiled = vm.runInThisContext(wrapped, { filename: file });
  compiled(module.exports, localRequire, module, file, path.dirname(file));
  return module.exports;
}

function createRuntimeAgent(id, overrides = {}) {
  const agent = {
    id,
    name: overrides.name ?? id,
    description: overrides.description ?? `${id} runtime agent`,
    iconClass: overrides.iconClass ?? 'codicon codicon-hubot',
    tags: overrides.tags ?? ['Runtime'],
    locations: overrides.locations ?? ['panel'],
    variables: overrides.variables ?? [`${id.toLowerCase()}Variable`],
    functions: overrides.functions ?? [`${id.toLowerCase()}Tool`],
    modes: overrides.modes ?? [{ id: 'chat', name: 'Chat', isDefault: true }],
    languageModelRequirements: overrides.languageModelRequirements ?? [{
      purpose: 'chat',
      identifier: `${id.toLowerCase()}-model`,
      name: `${id} Model`,
      vendor: 'runtime',
      family: 'runtime',
      version: '1',
      tokens: 4096
    }],
    invoke: async request => {
      agent.invokeCalls.push(request);
    },
    invokeCalls: []
  };
  return agent;
}

function assertNativeRuntimeDefinition(definition, sourceAgentId = definition.id) {
  assert.equal(definition.kind, 'native');
  assert.equal(definition.sourceAgentId, sourceAgentId);
  assert.equal(definition.defaultPlaybook, `${NATIVE_AGENT_PLAYBOOK_PREFIX}${sourceAgentId}`);
  assert.deepEqual(definition.playbooks, [`${NATIVE_AGENT_PLAYBOOK_PREFIX}${sourceAgentId}`]);
  for (const key of PRESERVED_NATIVE_KEYS) {
    const expected = key === 'invoke' ? false : true;
    assert.equal(definition.preserveNative?.[key], expected, `${definition.id} must preserve ${key}`);
  }
  for (const toolId of REQUIRED_AGENT_TOOLS) {
    assert.ok(definition.tools?.includes(toolId), `${definition.id} must expose ${toolId}`);
  }
}

async function main() {
  const contributionExports = loadCompiledModule(contributionModulePath);
  const runtimeExports = loadCompiledModule(runtimeModulePath, {
    ['./cybervinci-tool-registry']: {
      CyberVinciToolRegistry: class CyberVinciToolRegistry {}
    }
  });
  const { CyberVinciDeclarativeChatAgentContribution } = contributionExports;
  const { CyberVinciPlaybookRuntime } = runtimeExports;

  const catalogAgent = {
    version: 'cybervinci.agent/v1',
    kind: 'native',
    id: 'Coder',
    sourceAgentId: 'Coder',
    name: 'Coder',
    description: 'Catalog Coder',
    iconClass: 'codicon codicon-code',
    defaultPlaybook: 'native-agent.Coder',
    playbooks: ['native-agent.Coder'],
    tools: REQUIRED_AGENT_TOOLS,
    preserveNative: Object.fromEntries(PRESERVED_NATIVE_KEYS.map(key => [key, key === 'invoke' ? false : true]))
  };
  const runtimeAgents = [
    createRuntimeAgent('Coder', { name: 'Native Coder From Runtime' }),
    createRuntimeAgent('Codex', { name: 'Codex', description: "OpenAI's coding assistant powered by Codex" }),
    createRuntimeAgent('ClaudeCode', { name: 'ClaudeCode', description: "Anthropic's coding agent" }),
    createRuntimeAgent('AskAndContinueSample', { name: 'AskAndContinueSample' }),
    createRuntimeAgent('CustomContentSample', { name: 'CustomContentSample' })
  ];
  const contribution = new CyberVinciDeclarativeChatAgentContribution();
  contribution.chatAgentService = {
    getAllAgents: () => runtimeAgents
  };

  const merged = contribution.withRuntimeNativeAgents([catalogAgent]);
  assert.equal(merged.length, runtimeAgents.length);
  assert.equal(merged.filter(agent => agent.id === 'Coder').length, 1);
  assert.equal(merged.find(agent => agent.id === 'Coder').name, 'Coder');
  for (const runtimeOnlyId of ['Codex', 'ClaudeCode', 'AskAndContinueSample', 'CustomContentSample']) {
    const definition = merged.find(agent => agent.id === runtimeOnlyId);
    assert.ok(definition, `Runtime @ agent '${runtimeOnlyId}' must receive a declarative definition`);
    assert.equal(definition.source, 'runtime');
    assertNativeRuntimeDefinition(definition, runtimeOnlyId);
    assert.ok(definition.variables?.length, `${runtimeOnlyId} variables must be preserved`);
    assert.ok(definition.functions?.length, `${runtimeOnlyId} functions must be preserved`);
    assert.ok(definition.modes?.length, `${runtimeOnlyId} modes must be preserved`);
    assert.ok(definition.languageModelRequirements?.length, `${runtimeOnlyId} language model requirements must be preserved`);
  }

  const overlayAgent = runtimeAgents.find(agent => agent.id === 'Codex');
  const overlayDefinition = merged.find(agent => agent.id === 'Codex');
  const playbookInvocations = [];
  contribution.playbookRuntime = {
    invokeAgentTurn: async (definition, request, invokeNativeAgent) => {
      playbookInvocations.push({ definition, request });
      assert.equal(typeof invokeNativeAgent, 'function');
    }
  };
  contribution.applyNativeAgentOverlay(overlayDefinition);
  const request = { request: { text: 'hello from runtime overlay' } };
  await overlayAgent.invoke(request, { id: 'chat-agent-service' });
  assert.equal(playbookInvocations.length, 1);
  assert.equal(playbookInvocations[0].definition.id, 'Codex');
  assert.equal(overlayAgent.invokeCalls.length, 0);

  await overlayAgent.invoke(request, { id: 'chat-agent-service' });
  assert.equal(playbookInvocations.length, 2);
  assert.equal(overlayAgent.invokeCalls.length, 0);
  contribution.applyNativeAgentOverlay(overlayDefinition);
  await overlayAgent.invoke(request, { id: 'chat-agent-service' });
  assert.equal(playbookInvocations.length, 3);
  assert.equal(overlayAgent.invokeCalls.length, 0);

  const runtime = new CyberVinciPlaybookRuntime();
  runtime.service = {
    getPlaybook: async () => undefined
  };
  const generatedPlaybook = await runtime.resolvePlaybook('native-agent.Codex', overlayDefinition);
  assert.ok(generatedPlaybook);
  assert.equal(generatedPlaybook.id, 'native-agent.Codex');
  assert.equal(generatedPlaybook.name, 'Codex');
  assert.equal(generatedPlaybook.source, 'system');
  assert.ok(generatedPlaybook.tags.includes('Runtime'));
  assert.ok(generatedPlaybook.tags.includes('Autonomous'));
  assert.equal(generatedPlaybook.entry, 'describe-agent');
  assert.equal(generatedPlaybook.states.some(state => state.tool === 'core.agent.invoke'), false);

  console.log(JSON.stringify({
    ok: true,
    checked: [
      'runtime @ agents without YAML receive native declarative definitions',
      'catalog YAML native agents are not duplicated by runtime discovery',
      'runtime agent variables/functions/modes/model requirements are preserved',
      'runtime agent default playbook uses native-agent.<id>',
      'runtime agent playbooks only include native-agent.<id>',
      'native invoke overlay routes through CyberVinci Playbook runtime',
      'native invoke overlay does not call the original source agent',
      'reapplying the native overlay does not wrap the wrapper recursively',
      'missing per-agent runtime playbooks are generated as autonomous AI Runtime playbooks'
    ],
    runtimeAgents: merged.map(agent => agent.id)
  }, null, 2));
}

main().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
