#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const packageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageRoot, '..', '..', '..', '..');
const workloadInputModulePath = path.join(repoRoot, 'Workload', 'theia', 'packages', 'cybervinci-ai-chat-experience', 'lib', 'browser', 'cybervinci-ai-chat-input-widget.js');
const localInputModulePath = path.join(packageRoot, 'lib', 'browser', 'cybervinci-ai-chat-input-widget.js');
const isOverlayPackage = packageRoot.split(path.sep).includes('Modificacoes');
const inputModulePath = (isOverlayPackage
  ? [workloadInputModulePath, localInputModulePath]
  : [localInputModulePath, workloadInputModulePath]
).find(candidate => fs.existsSync(candidate));

const PREFS = {
  agentProfile: 'cybervinci.aiChat.agentProfile',
  mode: 'cybervinci.aiChat.mode',
  playbook: 'cybervinci.aiChat.playbook',
  flowMode: 'cybervinci.aiChat.flow.mode',
  savedWorkflow: 'cybervinci.aiChat.flow.workflowId',
  virtualReasoning: 'cybervinci.aiChat.virtualReasoning.mode',
  runtime: 'ai-features.aiProviders.runtime',
  modelProvider: 'ai-features.aiProviders.modelProvider',
  model: 'ai-features.aiProviders.model',
  reasoningEffort: 'ai-features.aiProviders.reasoningEffort',
  reasoningVariant: 'ai-features.aiProviders.reasoningVariant',
  serviceTier: 'ai-features.aiProviders.serviceTier'
};

function noOpDecorator() {
  return () => undefined;
}

function loadInputModule() {
  assert.ok(inputModulePath, 'Compiled cybervinci-ai-chat-input-widget.js was not found. Run npm run compile first.');
  const source = fs.readFileSync(inputModulePath, 'utf8');
  const module = { exports: {} };
  const stubs = new Map([
    ['@theia/ai-chat-ui/lib/browser/chat-input-widget', {
      AIChatInputWidget: class AIChatInputWidget {}
    }],
    ['@theia/core', {
      ContributionProvider: Symbol('ContributionProvider')
    }],
    ['@theia/core/shared/inversify', {
      inject: noOpDecorator,
      injectable: noOpDecorator,
      named: noOpDecorator,
      optional: noOpDecorator
    }],
    ['../common', {
      CyberVinciAiChatExperienceService: Symbol('CyberVinciAiChatExperienceService')
    }],
    ['./cybervinci-ai-chat-experience-preferences', {
      CYBERVINCI_AI_CHAT_AGENT_PROFILE_PREF: PREFS.agentProfile,
      CYBERVINCI_AI_CHAT_MODE_PREF: PREFS.mode,
      CYBERVINCI_AI_CHAT_PLAYBOOK_PREF: PREFS.playbook,
      CYBERVINCI_AI_CHAT_FLOW_MODE_PREF: PREFS.flowMode,
      CYBERVINCI_AI_CHAT_SAVED_WORKFLOW_PREF: PREFS.savedWorkflow,
      CYBERVINCI_AI_CHAT_VIRTUAL_REASONING_MODE_PREF: PREFS.virtualReasoning
    }],
    ['./cybervinci-chat-ai-execution-controls', {
      cyberVinciChatModeToRequestModeId: mode => mode === 'chat' ? undefined : mode,
      normalizeCyberVinciFlowChatMode: value => ['saved', 'dynamic'].includes(value) ? value : 'chat',
      normalizeVirtualReasoningMode: value => ['auto', 'fast', 'balanced', 'deep', 'coding', 'research', 'lats'].includes(value) ? value : 'off',
      readChatAiExecutionFromPreferences: preferenceService => {
        const runtime = preferenceService.get(PREFS.runtime, 'codex-app-server');
        const modelProvider = preferenceService.get(PREFS.modelProvider, 'codex');
        return {
          providerId: runtime && modelProvider ? `${runtime}:${modelProvider}` : undefined,
          runtime,
          modelProvider,
          model: preferenceService.get(PREFS.model, undefined),
          reasoningEffort: preferenceService.get(PREFS.reasoningEffort, undefined),
          reasoningVariant: preferenceService.get(PREFS.reasoningVariant, undefined) ?? 'default',
          serviceTier: preferenceService.get(PREFS.serviceTier, undefined),
          reasoningPolicy: 'auto'
        };
      }
    }],
    ['./cybervinci-playbook-runtime', {
      CYBERVINCI_AI_CHAT_FLOW_ROUTE_PLAYBOOK_ID: 'ai-chat-flow-route',
      CYBERVINCI_DIRECT_CHAT_PLAYBOOK_ID: 'direct-chat',
      CyberVinciPlaybookRuntime: class CyberVinciPlaybookRuntime {}
    }]
  ]);
  const localRequire = request => stubs.has(request) ? stubs.get(request) : require(request);
  const wrapped = `(function (exports, require, module, __filename, __dirname) {\n${source}\n})`;
  const compiled = vm.runInThisContext(wrapped, { filename: inputModulePath });
  compiled(module.exports, localRequire, module, inputModulePath, path.dirname(inputModulePath));
  return module.exports;
}

function createPreferenceService(values) {
  return {
    get: (key, defaultValue) => Object.prototype.hasOwnProperty.call(values, key) ? values[key] : defaultValue
  };
}

function createWidget(values, runtimeOverrides = {}) {
  const { CyberVinciAIChatInputWidget } = loadInputModule();
  const widget = new CyberVinciAIChatInputWidget();
  const history = [];
  const commands = [];
  const playbookPrepareCalls = [];
  const playbookRunCalls = [];
  const warnings = [];
  const chatModel = {
    id: 'chat-session-1',
    settings: {},
    setSettings(settings) {
      this.settings = settings;
    }
  };
  widget.configuration = { enablePromptHistory: true };
  widget.historyService = { addToHistory: prompt => history.push(prompt) };
  widget.navigationState = { stopNavigation: () => undefined };
  widget.commandService = { executeCommand: async (commandId, options) => commands.push({ commandId, options }) };
  widget.messageService = { warn: message => warnings.push(message) };
  widget.preferenceService = createPreferenceService(values);
  widget.chatService = { getSessions: () => [{ model: chatModel }] };
  widget._chatModel = { id: chatModel.id };
  widget.cyberVinciExperienceService = {
    readAgent: async () => {
      throw new Error('Agent markdown profiles must be injected by the runtime, not by the visible chat input.');
    }
  };
  widget.cyberVinciPlaybookRuntime = {
    prepareChatTurn: async (prompt, playbookId) => {
      playbookPrepareCalls.push({ prompt, playbookId });
      if (runtimeOverrides.prepareChatTurn) {
        return runtimeOverrides.prepareChatTurn(prompt, playbookId);
      }
      return { handled: false, prompt: `[prepared:${playbookId}] ${prompt}` };
    },
    runPlaybookById: async (playbookId, prompt, input) => {
      playbookRunCalls.push({ playbookId, prompt, input });
      if (runtimeOverrides.runPlaybookById) {
        return runtimeOverrides.runPlaybookById(playbookId, prompt, input);
      }
      return { ok: true, stop: true, value: { playbookId, prompt, input } };
    }
  };
  return { widget, history, commands, playbookPrepareCalls, playbookRunCalls, warnings, chatModel };
}

async function runPrompt(widget, prompt) {
  const queries = [];
  widget.onQuery = async (effectivePrompt, mode, capabilityOverrides, genericCapabilitySelections) => {
    queries.push({ effectivePrompt, mode, capabilityOverrides, genericCapabilitySelections });
  };
  await widget._onQuery(prompt);
  return queries;
}

async function main() {
  const direct = createWidget({
    [PREFS.agentProfile]: 'engineering/frontend-engineer',
    [PREFS.playbook]: 'user.review-playbook',
    [PREFS.mode]: 'edit',
    [PREFS.virtualReasoning]: 'deep'
  });
  const directQueries = await runPrompt(direct.widget, 'Build the settings page');
  assert.equal(direct.playbookPrepareCalls.length, 1);
  assert.equal(direct.playbookPrepareCalls[0].playbookId, 'user.review-playbook');
  assert.equal(directQueries.length, 1);
  assert.equal(directQueries[0].mode, 'edit');
  assert.equal(directQueries[0].effectivePrompt, '[prepared:user.review-playbook] Build the settings page');
  assert.doesNotMatch(directQueries[0].effectivePrompt, /<agent_profile>|Frontend Engineer|Build and review production UI/);
  assert.deepEqual(direct.chatModel.settings.virtualReasoning, { enabled: true, mode: 'deep' });
  assert.deepEqual(direct.chatModel.settings.commonSettings.virtualReasoning, { enabled: true, mode: 'deep' });
  assert.deepEqual(direct.history, ['Build the settings page']);

  const handled = createWidget({
    [PREFS.playbook]: 'user.handled-playbook'
  }, {
    prepareChatTurn: async () => ({ handled: true, prompt: 'handled prompt' })
  });
  const handledQueries = await runPrompt(handled.widget, 'Handled by playbook');
  assert.equal(handled.playbookPrepareCalls[0].playbookId, 'user.handled-playbook');
  assert.equal(handledQueries.length, 0);
  assert.deepEqual(handled.history, ['Handled by playbook']);

  const dynamic = createWidget({
    [PREFS.flowMode]: 'dynamic',
    [PREFS.runtime]: 'direct-http',
    [PREFS.modelProvider]: 'opencode',
    [PREFS.model]: 'opencode/gpt-5.5',
    [PREFS.reasoningEffort]: 'high',
    [PREFS.reasoningVariant]: 'fast',
    [PREFS.serviceTier]: 'priority'
  });
  const dynamicQueries = await runPrompt(dynamic.widget, 'Create a migration flow');
  assert.equal(dynamicQueries.length, 0);
  assert.equal(dynamic.playbookRunCalls.length, 1);
  assert.equal(dynamic.playbookRunCalls[0].playbookId, 'ai-chat-flow-route');
  assert.equal(dynamic.playbookRunCalls[0].prompt, 'Create a migration flow');
  assert.equal(dynamic.playbookRunCalls[0].input.flowMode, 'dynamic');
  assert.equal(dynamic.playbookRunCalls[0].input.preferSaved, true);
  assert.deepEqual(dynamic.playbookRunCalls[0].input.execution, {
    providerId: 'direct-http:opencode',
    runtime: 'direct-http',
    modelProvider: 'opencode',
    model: 'opencode/gpt-5.5',
    reasoningEffort: 'high',
    reasoningVariant: 'fast',
    serviceTier: 'priority',
    reasoningPolicy: 'auto'
  });

  const saved = createWidget({
    [PREFS.flowMode]: 'saved',
    [PREFS.savedWorkflow]: 'flow.saved.triage',
    [PREFS.runtime]: 'direct-http',
    [PREFS.modelProvider]: 'opencode',
    [PREFS.model]: 'opencode/gpt-5.5'
  });
  await runPrompt(saved.widget, 'Run saved workflow');
  assert.equal(saved.playbookRunCalls.length, 1);
  assert.equal(saved.playbookRunCalls[0].input.flowMode, 'saved');
  assert.equal(saved.playbookRunCalls[0].input.workflowId, 'flow.saved.triage');
  assert.equal(Object.prototype.hasOwnProperty.call(saved.playbookRunCalls[0].input, 'execution'), false);

  const dynamicCommand = createWidget({
    [PREFS.runtime]: 'direct-http',
    [PREFS.modelProvider]: 'openrouter',
    [PREFS.model]: 'openrouter/openai/gpt-5.5',
    [PREFS.reasoningEffort]: 'xhigh'
  });
  await runPrompt(dynamicCommand.widget, '/flow-dynamic Investigate release failures');
  assert.equal(dynamicCommand.commands.length, 1);
  assert.equal(dynamicCommand.commands[0].commandId, 'cybervinci.flow.runDynamicWorkflow');
  assert.equal(dynamicCommand.commands[0].options.prompt, 'Investigate release failures');
  assert.equal(dynamicCommand.commands[0].options.execution.providerId, 'direct-http:openrouter');
  assert.equal(dynamicCommand.commands[0].options.execution.model, 'openrouter/openai/gpt-5.5');
  assert.equal(dynamicCommand.commands[0].options.execution.reasoningEffort, 'xhigh');

  console.log(JSON.stringify({
    ok: true,
    checked: [
      'direct chat preserves selected Playbook id before sending',
      'direct chat keeps selected Agent profile markdown out of the visible prompt',
      'direct chat applies selected chat mode',
      'direct chat applies selected Virtual Reasoning mode to session settings',
      'handled Playbook turns do not fall through to normal query',
      'Dynamic Workflow route passes provider/model/reasoning/variant/service tier execution selection',
      'Saved Flow route passes workflow id without redundant chat execution controls',
      '/flow-dynamic command preserves provider/model/reasoning execution selection'
    ]
  }, null, 2));
}

main().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
