#!/usr/bin/env node

const assert = require('assert');
const Module = require('module');
const { JSDOM } = require('jsdom');

require.extensions['.css'] = module => {
  module.exports = {};
};

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/'
});
global.window = dom.window;
global.document = dom.window.document;
global.document.queryCommandSupported = global.document.queryCommandSupported || (() => false);
global.navigator = dom.window.navigator;
global.Element = dom.window.Element;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
global.DOMParser = dom.window.DOMParser;
global.Event = dom.window.Event;
global.DragEvent = dom.window.DragEvent || class DragEvent extends dom.window.Event {};

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === './cybervinci-ai-chat-workdir-service') {
    return { CyberVinciAiChatWorkdirService: class CyberVinciAiChatWorkdirService {} };
  }
  if (request === '@theia/workspace/lib/browser') {
    return { WorkspaceService: class WorkspaceService {} };
  }
  if (request === '@theia/ai-chat-ui/lib/browser/chat-input-widget') {
    class AIChatInputWidget {
      set pinnedAgent(value) {
        this._pinnedAgent = value;
      }
    }
    return {
      AIChatInputWidget,
      AIChatInputOptionsContribution: Symbol('AIChatInputOptionsContribution')
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const {
  CyberVinciChatGoalService
} = require('../lib/browser/cybervinci-ai-chat-goal-service');
const {
  CyberVinciCreateGoalToolProvider,
  CyberVinciGetGoalToolProvider,
  CyberVinciUpdateGoalToolProvider
} = require('../lib/browser/cybervinci-ai-chat-goal-tools');
const {
  CyberVinciAIChatInputWidget
} = require('../lib/browser/cybervinci-ai-chat-input-widget');
const {
  CyberVinciAgencyAgentService
} = require('../lib/node/cybervinci-agency-agent-service');
const URI = require('@theia/core/lib/common/uri').default;

class MemoryStorageService {
  constructor() {
    this.values = new Map();
  }

  async setData(key, data) {
    if (data === undefined) {
      this.values.delete(key);
    } else {
      this.values.set(key, JSON.parse(JSON.stringify(data)));
    }
  }

  async getData(key, defaultValue) {
    return this.values.has(key)
      ? JSON.parse(JSON.stringify(this.values.get(key)))
      : defaultValue;
  }
}

class MemoryGoalStore {
  constructor(storage = new MemoryStorageService()) {
    this.storage = storage;
  }

  key(threadId) {
    return `cybervinci.aiChat.goal.${threadId}`;
  }

  async getThreadGoal(threadId) {
    return this.storage.getData(this.key(threadId));
  }

  async setThreadGoal(threadId, goal) {
    await this.storage.setData(this.key(threadId), goal);
  }

  async clearThreadGoal(threadId) {
    await this.storage.setData(this.key(threadId), undefined);
  }
}

class MemoryFileService {
  constructor() {
    this.files = new Map();
    this.folders = new Set();
  }

  async createFolder(uri) {
    this.folders.add(uri.toString());
    return {};
  }

  async exists(uri) {
    return this.files.has(uri.toString());
  }

  async read(uri) {
    return { value: this.files.get(uri.toString()) || '' };
  }

  async write(uri, value) {
    this.files.set(uri.toString(), value);
    return {};
  }
}

class MemoryPreferenceService {
  constructor() {
    this.values = new Map();
  }

  get(name, defaultValue) {
    return this.values.has(name) ? this.values.get(name) : defaultValue;
  }

  set(name, value) {
    if (value === undefined) {
      this.values.delete(name);
    } else {
      this.values.set(name, value);
    }
  }
}

function makeToolProvider(ProviderClass, service, preferenceService) {
  const provider = new ProviderClass();
  provider.goalService = service;
  provider.preferenceService = preferenceService;
  return provider.getTool();
}

function isToolError(result) {
  return Array.isArray(result?.content) && result.content.some(item => item?.type === 'error');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function makeCompletedRequest(id, text, tokenUsage) {
  return {
    id,
    response: {
      isComplete: true,
      isCanceled: false,
      isError: false,
      tokenUsage,
      response: {
        asString: () => text
      }
    }
  };
}

function makeErrorRequest(id, message) {
  return {
    id,
    response: {
      isComplete: true,
      isCanceled: false,
      isError: true,
      errorObject: new Error(message),
      response: {
        asString: () => message
      }
    }
  };
}

function makeCanceledRequest(id) {
  return {
    id,
    response: {
      isComplete: true,
      isCanceled: true,
      isError: false,
      response: {
        asString: () => ''
      }
    }
  };
}

async function main() {
  const service = new CyberVinciChatGoalService();
  service.goalStore = new MemoryGoalStore();
  const preferenceService = new MemoryPreferenceService();
  service.preferenceService = preferenceService;
  const memoryFileService = new MemoryFileService();
  service.fileService = memoryFileService;
  service.workdirService = {
    getEffectiveWorkdirUri: () => new URI('file:///tmp/cybervinci-smoke')
  };

  const chatModel = { id: 'thread/smoke' };
  const goal = await service.setVirtualGoal(chatModel, 'Ship the virtual goal runtime', {
    maxRounds: 3,
    tokenBudget: 100
  });

  assert.equal(goal.threadId, chatModel.id);
  assert.ok(goal.goalId, 'goalId should be generated');
  assert.equal(goal.status, 'active');
  assert.equal(goal.tokenBudget, 100);
  assert.equal(goal.rounds, 0);
  assert.equal(memoryFileService.files.size, 1, 'goal creation should write a run-log file');

  const reloadService = new CyberVinciChatGoalService();
  reloadService.goalStore = service.goalStore;
  reloadService.preferenceService = preferenceService;
  await reloadService.ensureLoaded(chatModel);
  assert.equal(reloadService.getGoal(chatModel).goalId, goal.goalId, 'GoalStore should persist one goal per chat thread');

  await assert.rejects(
    () => service.setVirtualGoal(chatModel, 'x'.repeat(4001)),
    /4000/
  );

  const accounted = await service.accountGoalUsage(chatModel, {
    inputTokens: 80,
    cacheReadInputTokens: 30,
    outputTokens: 20
  }, 'response');
  assert.equal(accounted.tokensUsed, 70);
  assert.equal(accounted.status, 'active');

  await service.accountGoalUsage(chatModel, undefined, 'x'.repeat(200));
  assert.equal(service.getGoal(chatModel).status, 'budget_limited');
  assert.equal(service.getGoal(chatModel).usageEstimated, true);

  await service.setTokenBudget(chatModel, 500);
  assert.equal(service.getGoal(chatModel).status, 'active');
  assert.equal(service.getGoal(chatModel).tokenBudget, 500);

  await service.incrementRound(chatModel);
  assert.equal(service.getGoal(chatModel).rounds, 1);

  await service.updateStatus(chatModel, 'complete');
  assert.equal(service.toVirtualGoalSettings(chatModel).enabled, false);
  assert.equal(service.toVirtualGoalSettings(chatModel).goalId, goal.goalId);
  assert.equal(service.getGoal(chatModel).status, 'complete');

  await service.clearGoal(chatModel);
  assert.equal(service.getGoal(chatModel), undefined);

  const defaultBudgetChatModel = { id: 'thread/default-budget-smoke' };
  await service.setVirtualGoal(defaultBudgetChatModel, 'Default budget goal');
  assert.equal(service.getGoal(defaultBudgetChatModel).tokenBudget, 40000);
  await service.clearGoal(defaultBudgetChatModel);

  const eventChatModel = { id: 'thread/event-smoke' };
  const emittedGoalEvents = [];
  const eventDisposable = service.onDidChangeGoal(event => {
    if (event.chatModelId === eventChatModel.id) {
      emittedGoalEvents.push(event);
    }
  });
  const eventGoal = await service.setVirtualGoal(eventChatModel, 'Emit thread goal events', { tokenBudget: 25 });
  await service.updateStatus(eventChatModel, 'paused');
  await service.clearGoal(eventChatModel);
  eventDisposable.dispose();
  const mutationGoalEvents = emittedGoalEvents.filter(event => event.event.goal || event.event.previousGoal);
  assert.equal(mutationGoalEvents[0].event.type, 'thread/goal/updated');
  assert.equal(mutationGoalEvents[0].event.goal.goalId, eventGoal.goalId);
  assert.match(mutationGoalEvents[0].event.eventId, /^evt_/);
  assert.equal(mutationGoalEvents[1].event.type, 'thread/goal/updated');
  assert.equal(mutationGoalEvents[1].event.goal.status, 'paused');
  assert.equal(mutationGoalEvents[2].event.type, 'thread/goal/cleared');
  assert.equal(mutationGoalEvents[2].event.previousGoal.goalId, eventGoal.goalId);

  const objectiveUpdateChatModel = { id: 'thread/objective-update-smoke' };
  const originalObjectiveGoal = await service.setVirtualGoal(objectiveUpdateChatModel, 'Original objective', { tokenBudget: 222 });
  await service.accountGoalUsage(objectiveUpdateChatModel, { inputTokens: 8, outputTokens: 4 }, 'response');
  await service.incrementRound(objectiveUpdateChatModel);
  const sameObjectiveGoal = await service.setVirtualGoal(objectiveUpdateChatModel, 'Original objective', { preserveProgress: true });
  assert.equal(sameObjectiveGoal.goalId, originalObjectiveGoal.goalId, 'same objective should preserve the goal id');
  assert.equal(sameObjectiveGoal.tokensUsed, 12, 'same objective should preserve token accounting');
  assert.equal(sameObjectiveGoal.rounds, 1, 'same objective should preserve continuation rounds');
  assert.equal(service.takePendingObjectiveUpdatedSteering(objectiveUpdateChatModel), undefined, 'same objective should not emit objective-updated steering');
  const updatedObjectiveGoal = await service.setVirtualGoal(objectiveUpdateChatModel, 'Updated objective', { preserveProgress: true });
  assert.notEqual(updatedObjectiveGoal.goalId, originalObjectiveGoal.goalId, 'changed objective should create a new goal id for expectedGoalId safety');
  assert.equal(updatedObjectiveGoal.tokensUsed, 0, 'changed objective should reset token accounting');
  assert.equal(updatedObjectiveGoal.rounds, 0, 'changed objective should reset continuation rounds');
  assert.equal(updatedObjectiveGoal.tokenBudget, 222, 'changed objective should preserve the configured token budget');
  const objectiveSteering = service.takePendingObjectiveUpdatedSteering(objectiveUpdateChatModel);
  assert.equal(objectiveSteering.type, 'objective_updated');
  assert.equal(objectiveSteering.previousGoalId, originalObjectiveGoal.goalId);
  assert.equal(objectiveSteering.goalId, updatedObjectiveGoal.goalId);
  assert.equal(objectiveSteering.previousObjective, 'Original objective');
  assert.equal(objectiveSteering.objective, 'Updated objective');
  assert.equal(service.takePendingObjectiveUpdatedSteering(objectiveUpdateChatModel), undefined, 'objective-updated steering should be consumed once');

  const createGoalTool = makeToolProvider(CyberVinciCreateGoalToolProvider, service, preferenceService);
  const getGoalTool = makeToolProvider(CyberVinciGetGoalToolProvider, service, preferenceService);
  const updateGoalTool = makeToolProvider(CyberVinciUpdateGoalToolProvider, service, preferenceService);
  const toolChatModel = { id: 'thread/tool-smoke' };
  const toolContext = {
    request: {
      session: toolChatModel,
      request: {
        text: 'Please create a goal to track this task.'
      }
    },
    response: {}
  };

  const deniedCreate = await createGoalTool.handler(JSON.stringify({
    objective: 'Unrequested model-created goal'
  }), {
    request: {
      session: { id: 'thread/tool-denied-smoke' },
      request: {
        text: 'Answer this question without creating any goal.'
      }
    },
    response: {}
  });
  assert.equal(isToolError(deniedCreate), true, 'create_goal should reject model-created goals without explicit user request');

  const createdByTool = await createGoalTool.handler(JSON.stringify({
    objective: 'Tool-created goal',
    tokenBudget: 42
  }), toolContext);
  assert.equal(createdByTool.goal.objective, 'Tool-created goal');
  assert.equal(createdByTool.goal.tokenBudget, 42);

  const duplicateCreate = await createGoalTool.handler(JSON.stringify({
    objective: 'Second active goal'
  }), toolContext);
  assert.equal(isToolError(duplicateCreate), true, 'create_goal should reject a second non-terminal goal');

  const currentFromTool = await getGoalTool.handler('{}', toolContext);
  assert.equal(currentFromTool.goal.goalId, createdByTool.goal.goalId);

  const invalidUpdate = await updateGoalTool.handler(JSON.stringify({ status: 'paused' }), toolContext);
  assert.equal(isToolError(invalidUpdate), true, 'update_goal must reject model-controlled pause');

  const staleUpdate = await updateGoalTool.handler(JSON.stringify({
    status: 'complete',
    expectedGoalId: 'stale-goal-id'
  }), toolContext);
  assert.equal(isToolError(staleUpdate), true, 'update_goal must reject stale expectedGoalId');

  const missingExpectedUpdate = await updateGoalTool.handler(JSON.stringify({
    status: 'blocked'
  }), toolContext);
  assert.equal(isToolError(missingExpectedUpdate), true, 'update_goal must require expectedGoalId for active goals');

  const completedByTool = await updateGoalTool.handler(JSON.stringify({
    status: 'complete',
    expectedGoalId: createdByTool.goal.goalId
  }), toolContext);
  assert.equal(completedByTool.goal.status, 'complete');

  const fallbackChatModel = { id: 'thread/fallback-smoke' };
  await service.recordAssistantResponse({ id: 'thread/fallback-denied-smoke' }, '<!-- cybervinci:goal action="set" objective="Denied fallback goal" -->');
  assert.equal(service.getGoal({ id: 'thread/fallback-denied-smoke' }), undefined, 'fallback create_goal should require explicit user request intent');
  service.recordUserGoalCreationIntent(fallbackChatModel, 'Crie um goal para acompanhar este trabalho.');
  await service.recordAssistantResponse(fallbackChatModel, '<!-- cybervinci:goal action="set" objective="Fallback goal" -->');
  assert.equal(service.getGoal(fallbackChatModel).objective, 'Fallback goal');
  await service.recordAssistantResponse(fallbackChatModel, '<!-- cybervinci:goal action="pause" -->');
  assert.equal(service.getGoal(fallbackChatModel).status, 'active', 'model fallback must not pause goals');
  await service.recordAssistantResponse(fallbackChatModel, '<!-- cybervinci:goal status="blocked" -->');
  assert.equal(service.getGoal(fallbackChatModel).status, 'active', 'model fallback must reject updates without expectedGoalId');
  await service.recordAssistantResponse(fallbackChatModel, `<!-- cybervinci:goal status="blocked" expectedGoalId="${service.getGoal(fallbackChatModel).goalId}" -->`);
  assert.equal(service.getGoal(fallbackChatModel).status, 'blocked');

  const fallbackJsonChatModel = { id: 'thread/fallback-json-smoke' };
  service.recordUserGoalCreationIntent(fallbackJsonChatModel, 'Create a goal for this JSON fallback task.');
  await service.recordAssistantResponse(fallbackJsonChatModel, '```json\n{"tool":"create_goal","arguments":{"objective":"JSON fallback goal","tokenBudget":77}}\n```');
  assert.equal(service.getGoal(fallbackJsonChatModel).objective, 'JSON fallback goal');
  assert.equal(service.getGoal(fallbackJsonChatModel).tokenBudget, 77);
  await service.recordAssistantResponse(fallbackJsonChatModel, '```json\n{"tool":"update_goal","arguments":{"status":"paused"}}\n```');
  assert.equal(service.getGoal(fallbackJsonChatModel).status, 'active', 'text fallback update_goal must reject paused');
  await service.recordAssistantResponse(fallbackJsonChatModel, `\`\`\`json\n{"tool":"update_goal","arguments":{"status":"complete","expectedGoalId":"${service.getGoal(fallbackJsonChatModel).goalId}"}}\n\`\`\``);
  assert.equal(service.getGoal(fallbackJsonChatModel).status, 'complete');

  const repairedFallbackJsonChatModel = { id: 'thread/fallback-json-repair-smoke' };
  service.recordUserGoalCreationIntent(repairedFallbackJsonChatModel, 'Create a goal for this repaired JSON fallback task.');
  await service.recordAssistantResponse(
    repairedFallbackJsonChatModel,
    "```json\n{ tool: 'create_goal', arguments: { objective: 'Repaired JSON fallback goal', tokenBudget: 88, }, }\n```"
  );
  assert.equal(service.getGoal(repairedFallbackJsonChatModel).objective, 'Repaired JSON fallback goal');
  assert.equal(service.getGoal(repairedFallbackJsonChatModel).tokenBudget, 88);

  const staleCommentChatModel = { id: 'thread/stale-comment-smoke' };
  const commentGoal = await service.setVirtualGoal(staleCommentChatModel, 'Comment expectedGoalId smoke');
  await service.recordAssistantResponse(staleCommentChatModel, '<!-- cybervinci:goal status="complete" expectedGoalId="stale-goal-id" -->');
  assert.equal(service.getGoal(staleCommentChatModel).status, 'active', 'hidden comment stale expectedGoalId must not complete goals');
  await service.recordAssistantResponse(staleCommentChatModel, `<!-- cybervinci:goal status="complete" expectedGoalId="${commentGoal.goalId}" -->`);
  assert.equal(service.getGoal(staleCommentChatModel).status, 'complete');

  preferenceService.set('cybervinci.aiChat.virtualGoal.verifier.mode', 'warn');
  const verifierWarnChatModel = { id: 'thread/verifier-warn-smoke' };
  const verifierWarnGoal = await service.setVirtualGoal(verifierWarnChatModel, 'Warn on weak completion evidence');
  await service.recordAssistantResponse(verifierWarnChatModel, '<!-- cybervinci:goal status="complete" -->');
  assert.equal(service.getGoal(verifierWarnChatModel).status, 'active', 'warn verifier should still require expectedGoalId');
  await service.recordAssistantResponse(verifierWarnChatModel, `<!-- cybervinci:goal status="complete" expectedGoalId="${verifierWarnGoal.goalId}" -->`);
  assert.equal(service.getGoal(verifierWarnChatModel).status, 'complete', 'warn verifier should allow weak completion');

  preferenceService.set('cybervinci.aiChat.virtualGoal.verifier.mode', 'enforce');
  const verifierEnforceChatModel = { id: 'thread/verifier-enforce-smoke' };
  const enforceGoal = await service.setVirtualGoal(verifierEnforceChatModel, 'Reject weak completion evidence');
  await service.recordAssistantResponse(verifierEnforceChatModel, `Done. <!-- cybervinci:goal status="complete" expectedGoalId="${enforceGoal.goalId}" -->`);
  assert.equal(service.getGoal(verifierEnforceChatModel).status, 'active', 'enforce verifier should reject weak completion');
  await service.recordAssistantResponse(
    verifierEnforceChatModel,
    `Tests passed with npm run test:virtual-goal for src/browser/cybervinci-ai-chat-goal-service.ts. <!-- cybervinci:goal status="complete" expectedGoalId="${enforceGoal.goalId}" -->`
  );
  assert.equal(service.getGoal(verifierEnforceChatModel).status, 'complete', 'enforce verifier should accept completion with evidence');

  const logContent = Array.from(memoryFileService.files.values()).join('\n');
  assert.match(logContent, /"event":"goal_created"/);
  assert.match(logContent, /"event":"goal_completed"/);
  assert.match(logContent, /"event":"goal_blocked"/);
  assert.match(logContent, /"event":"stale_model_goal_update_rejected"/);
  assert.match(logContent, /"event":"missing_expected_goal_id_rejected"/);
  assert.match(logContent, /"event":"verifier_warned_completion"/);
  assert.match(logContent, /"event":"verifier_rejected_completion"/);

  const verifierToolChatModel = { id: 'thread/verifier-tool-smoke' };
  const verifierToolGoal = await service.setVirtualGoal(verifierToolChatModel, 'Reject weak native update_goal completion');
  const verifierToolContext = {
    request: {
      session: verifierToolChatModel
    },
    response: {}
  };
  const rejectedToolComplete = await updateGoalTool.handler(JSON.stringify({
    status: 'complete',
    expectedGoalId: verifierToolGoal.goalId
  }), verifierToolContext);
  assert.equal(isToolError(rejectedToolComplete), true, 'enforce verifier should reject update_goal complete without evidence');
  assert.equal(service.getGoal(verifierToolChatModel).status, 'active');
  const acceptedToolComplete = await updateGoalTool.handler(JSON.stringify({
    status: 'complete',
    expectedGoalId: verifierToolGoal.goalId,
    evidence: 'Compile passed and tests passed for src/browser/cybervinci-ai-chat-goal-tools.ts.'
  }), verifierToolContext);
  assert.equal(acceptedToolComplete.goal.status, 'complete');
  preferenceService.set('cybervinci.aiChat.virtualGoal.verifier.mode', undefined);

  const loopChatModel = {
    id: 'thread/loop-smoke',
    getRequests: () => loopRequests
  };
  let loopRequests = [
    makeCompletedRequest('loop-request-1', 'Partial progress without completion marker.', { inputTokens: 10, outputTokens: 5 })
  ];
  await service.setVirtualGoal(loopChatModel, 'Finish loop smoke', { maxRounds: 4 });
  const sentRequests = [];
  const widgetMessages = [];
  const widget = Object.create(CyberVinciAIChatInputWidget.prototype);
  widget._chatModel = loopChatModel;
  widget.cyberVinciHandledGoalResponses = new Set();
  widget.cyberVinciGoalThreadResumeContinuations = new Set();
  widget.cyberVinciGoalBudgetLimitWrapUps = new Set();
  widget.cyberVinciGoalContinuationInFlight = false;
  widget.cyberVinciGoalService = service;
  widget.preferenceService = preferenceService;
  widget.chatService = {
    getSessions: () => widget._chatModel ? [{ id: `session-${widget._chatModel.id}`, model: widget._chatModel }] : [],
    sendRequest: async (_sessionId, request) => {
      sentRequests.push(request);
      return { responseCompleted: Promise.resolve({}) };
    }
  };
  widget.messageService = {
    warn: message => widgetMessages.push({ severity: 'warn', message }),
    info: message => widgetMessages.push({ severity: 'info', message })
  };
  widget.cyberVinciPlaybookRuntime = {
    prepareChatTurn: async prompt => ({ handled: false, prompt })
  };
  widget.getCyberVinciFlowChatMode = () => 'chat';
  widget.getCyberVinciVirtualGoalMaxRounds = () => 4;
  widget.getCyberVinciPlaybookId = () => 'direct-chat';
  widget.getCyberVinciChatRequestModeId = () => 'open-coder-system-agent-mode';
  widget.getCyberVinciCapabilityOverridesForRequest = () => undefined;
  widget.resolveChatAgentForPlaybook = async () => undefined;
  widget.applyVirtualReasoningPreferenceToSession = () => undefined;
  widget.applyVirtualGoalPreferenceToSession = () => undefined;
  widget.clearCyberVinciPlaybookMentionSelectionIfCurrent = async () => undefined;
  widget.addPromptToHistory = () => undefined;
  widget.parseCyberVinciFlowChatCommand = () => undefined;
  widget.runCyberVinciFlowRoute = async () => false;
  widget.runLegacyFlowCommand = async () => undefined;
  widget.update = () => undefined;
  widget.hasCyberVinciPendingUserInput = () => false;
  widget.isCyberVinciGoalContinuationSuppressedByChatMode = () => false;
  widget.isCyberVinciVirtualGoalAutoContinueEnabled = () => true;
  widget.isCyberVinciVirtualGoalAutoContinueOnResumeEnabled = () => true;
  widget.userCapabilityOverrides = new Map();
  widget.genericCapabilitySelections = {};

  const directUserTurnChatModel = { id: 'thread/direct-user-turn-started-smoke', getRequests: () => [] };
  await service.setVirtualGoal(directUserTurnChatModel, 'Log normal user turns', { maxRounds: 4 });
  widget._chatModel = directUserTurnChatModel;
  const queriedUserTurns = [];
  widget.onQuery = async (text, modeId) => {
    queriedUserTurns.push({ text, modeId });
  };
  await widget._onQuery('Normal user turn progress');
  assert.equal(queriedUserTurns.length, 1, 'normal user turn should still reach the provider');
  let turnStartedLogContent = Array.from(memoryFileService.files.values()).join('\n');
  assert.match(turnStartedLogContent, /"event":"turn_started"/);
  assert.match(turnStartedLogContent, /"source":"user_turn"/);
  assert.match(turnStartedLogContent, /"playbookId":"direct-chat"/);

  const selectedAgentTurnChatModel = { id: 'thread/selected-agent-user-turn-started-smoke', getRequests: () => [] };
  await service.setVirtualGoal(selectedAgentTurnChatModel, 'Log selected agent user turns', { maxRounds: 4 });
  widget._chatModel = selectedAgentTurnChatModel;
  widget.getCyberVinciPlaybookId = () => 'agent-playbook-smoke';
  widget.resolveChatAgentForPlaybook = async () => ({ id: 'agent-smoke' });
  const queriedAgentTurns = [];
  widget.onQuery = async (text, modeId) => {
    queriedAgentTurns.push({ text, modeId });
  };
  await widget._onQuery('Selected agent user turn progress');
  assert.equal(queriedAgentTurns.length, 1, 'selected-agent user turn should still reach the provider');
  turnStartedLogContent = Array.from(memoryFileService.files.values()).join('\n');
  assert.match(turnStartedLogContent, /"source":"user_turn_selected_agent"/);
  assert.match(turnStartedLogContent, /"playbookId":"agent-playbook-smoke"/);
  assert.match(turnStartedLogContent, /"agentId":"agent-smoke"/);
  widget.getCyberVinciPlaybookId = () => 'direct-chat';
  widget.resolveChatAgentForPlaybook = async () => undefined;
  widget._chatModel = loopChatModel;

  const objectivePromptChatModel = { id: 'thread/objective-steering-prompt-smoke' };
  const oldPromptGoal = await service.setVirtualGoal(objectivePromptChatModel, 'Old prompt goal');
  const newPromptGoal = await service.setVirtualGoal(objectivePromptChatModel, 'New prompt goal', { preserveProgress: true });
  const steeredPrompt = widget.withCyberVinciGoalObjectiveUpdatedSteering('User prompt body', objectivePromptChatModel);
  assert.match(steeredPrompt, /objective was updated/i);
  assert.match(steeredPrompt, new RegExp(`Previous Goal ID: ${escapeRegExp(oldPromptGoal.goalId)}`));
  assert.match(steeredPrompt, new RegExp(`Current Goal ID: ${escapeRegExp(newPromptGoal.goalId)}`));
  assert.match(steeredPrompt, /Previous Objective: Old prompt goal/);
  assert.match(steeredPrompt, /Current Objective: New prompt goal/);
  assert.match(steeredPrompt, /User prompt body$/);
  assert.equal(widget.withCyberVinciGoalObjectiveUpdatedSteering('Plain prompt', objectivePromptChatModel), 'Plain prompt');

  assert.deepEqual(widget.parseCyberVinciGoalCommand('/goal'), { action: 'status' }, '/goal without arguments should show status');
  const noGoalStatusChatModel = { id: 'thread/slash-goal-status-empty-smoke' };
  widget._chatModel = noGoalStatusChatModel;
  const slashNoGoalResult = await widget.runCyberVinciGoalCommand({ action: 'status' }, 'chat');
  assert.equal(slashNoGoalResult.prompt, undefined);
  assert.equal(service.getGoal(noGoalStatusChatModel), undefined, '/goal without arguments should not create a goal');
  assert.equal(widgetMessages.some(item => item.severity === 'info' && /No Virtual Goal exists/.test(item.message)), true);
  widget._chatModel = loopChatModel;
  const slashExistingGoalResult = await widget.runCyberVinciGoalCommand({ action: 'status' }, 'chat');
  assert.equal(slashExistingGoalResult.prompt, undefined);
  assert.equal(service.getGoal(loopChatModel).objective, 'Finish loop smoke');
  assert.equal(widgetMessages.some(item => item.severity === 'info' && /Virtual Goal active: Finish loop smoke/.test(item.message)), true);

  await widget.handleCyberVinciGoalResponseComplete(loopChatModel);
  assert.equal(sentRequests.length, 1, 'active goal should send one automatic continuation');
  assert.equal(sentRequests[0].displayText, 'Continue');
  assert.match(sentRequests[0].text, /Continue working toward the active CyberVinci Virtual Goal\./);
  assert.match(sentRequests[0].text, /Goal ID:/);
  assert.match(sentRequests[0].text, /Objective: Finish loop smoke/);
  assert.match(sentRequests[0].text, /expectedGoalId/);
  assert.equal(service.getGoal(loopChatModel).rounds, 1);

  const loopGoalId = service.getGoal(loopChatModel).goalId;
  loopRequests = [
    makeCompletedRequest('loop-request-2', `Done. <!-- cybervinci:goal status="complete" expectedGoalId="${loopGoalId}" -->`, { inputTokens: 5, outputTokens: 5 })
  ];
  await widget.handleCyberVinciGoalResponseComplete(loopChatModel);
  assert.equal(service.getGoal(loopChatModel).status, 'complete');
  assert.equal(sentRequests.length, 1, 'complete goal should not send another continuation');

  const fakeProviderChatModel = {
    id: 'thread/fake-provider-e2e-smoke',
    getRequests: () => fakeProviderRequests
  };
  const fakeProviderRequests = [
    makeCompletedRequest('fake-provider-user-request-1', 'Partial implementation done, but validation is still pending.', { inputTokens: 7, outputTokens: 7 })
  ];
  await service.setVirtualGoal(fakeProviderChatModel, 'Finish fake provider E2E smoke', { maxRounds: 4 });
  widget._chatModel = fakeProviderChatModel;
  widget.cyberVinciHandledGoalResponses = new Set();
  widget.hasCyberVinciPendingUserInput = () => false;
  const previousWidgetChatService = widget.chatService;
  let fakeProviderContinuationCount = 0;
  widget.chatService = {
    getSessions: () => [{ id: 'session-fake-provider-e2e', model: fakeProviderChatModel }],
    sendRequest: async (_sessionId, request) => {
      fakeProviderContinuationCount += 1;
      sentRequests.push(request);
      const activeGoalId = service.getGoal(fakeProviderChatModel).goalId;
      fakeProviderRequests.push(makeCompletedRequest(
        `fake-provider-continuation-${fakeProviderContinuationCount}`,
        [
          'Validation finished through a provider without native tool calling.',
          '```json',
          JSON.stringify({
            tool: 'update_goal',
            arguments: {
              status: 'complete',
              expectedGoalId: activeGoalId,
              evidence: 'Tests passed with npm run test:virtual-goal for fake provider E2E smoke.'
            }
          }),
          '```'
        ].join('\n'),
        { inputTokens: 4, outputTokens: 4 }
      ));
      return { responseCompleted: Promise.resolve({}) };
    }
  };
  const fakeProviderStartSends = sentRequests.length;
  await widget.handleCyberVinciGoalResponseComplete(fakeProviderChatModel);
  assert.equal(fakeProviderContinuationCount, 1, 'fake provider should receive one automatic continuation');
  assert.equal(service.getGoal(fakeProviderChatModel).rounds, 1);
  assert.equal(service.getGoal(fakeProviderChatModel).status, 'active');
  await widget.handleCyberVinciGoalResponseComplete(fakeProviderChatModel);
  assert.equal(service.getGoal(fakeProviderChatModel).status, 'complete', 'fake provider JSON fallback should complete the goal');
  assert.equal(sentRequests.length, fakeProviderStartSends + 1, 'completed fake provider goal should not trigger a third turn');
  widget.chatService = previousWidgetChatService;

  const planModeChatModel = {
    id: 'thread/plan-mode-smoke',
    getRequests: () => planModeRequests
  };
  const planModeRequests = [
    makeCompletedRequest('plan-mode-request-1', 'Partial progress in plan mode.', { inputTokens: 3, outputTokens: 3 })
  ];
  await service.setVirtualGoal(planModeChatModel, 'Do not continue automatically in Plan mode', { maxRounds: 4 });
  widget._chatModel = planModeChatModel;
  widget.cyberVinciHandledGoalResponses = new Set();
  widget.hasCyberVinciPendingUserInput = () => false;
  widget.isCyberVinciGoalContinuationSuppressedByChatMode = () => true;
  const planModeStartSends = sentRequests.length;
  await widget.handleCyberVinciGoalResponseComplete(planModeChatModel);
  assert.equal(service.getGoal(planModeChatModel).rounds, 0);
  assert.equal(sentRequests.length, planModeStartSends, 'Plan chat mode should suppress automatic continuation');
  widget.isCyberVinciGoalContinuationSuppressedByChatMode = () => false;

  const autoContinueOffChatModel = {
    id: 'thread/auto-continue-off-smoke',
    getRequests: () => autoContinueOffRequests
  };
  const autoContinueOffRequests = [
    makeCompletedRequest('auto-continue-off-request-1', 'Partial progress with auto continue disabled.', { inputTokens: 3, outputTokens: 3 })
  ];
  await service.setVirtualGoal(autoContinueOffChatModel, 'Do not continue when disabled', { maxRounds: 4 });
  widget._chatModel = autoContinueOffChatModel;
  widget.cyberVinciHandledGoalResponses = new Set();
  widget.isCyberVinciVirtualGoalAutoContinueEnabled = () => false;
  const autoContinueOffStartSends = sentRequests.length;
  await widget.handleCyberVinciGoalResponseComplete(autoContinueOffChatModel);
  assert.equal(service.getGoal(autoContinueOffChatModel).rounds, 0);
  assert.equal(sentRequests.length, autoContinueOffStartSends, 'disabled auto continue should suppress automatic continuation');
  widget.isCyberVinciVirtualGoalAutoContinueEnabled = () => true;

  const modelToolsOffChatModel = {
    id: 'thread/model-tools-off-smoke',
    getRequests: () => modelToolsOffRequests
  };
  const modelToolsOffRequests = [
    makeCompletedRequest('model-tools-off-request-1', 'Partial progress while model tools are disabled.', { inputTokens: 3, outputTokens: 3 })
  ];
  await service.setVirtualGoal(modelToolsOffChatModel, 'Do not auto-continue without model tools', { maxRounds: 4 });
  preferenceService.set('cybervinci.aiChat.virtualGoal.modelTools.enabled', false);
  assert.equal(service.toVirtualGoalSettings(modelToolsOffChatModel).allowModelControl, false, 'disabled model tools should be reflected in virtual goal settings');
  await service.recordAssistantResponse(
    modelToolsOffChatModel,
    `Done. <!-- cybervinci:goal status="complete" expectedGoalId="${service.getGoal(modelToolsOffChatModel).goalId}" -->`
  );
  assert.equal(service.getGoal(modelToolsOffChatModel).status, 'active', 'fallback model control should be ignored when model tools are disabled');
  widget._chatModel = modelToolsOffChatModel;
  widget.cyberVinciHandledGoalResponses = new Set();
  const modelToolsOffStartSends = sentRequests.length;
  await widget.handleCyberVinciGoalResponseComplete(modelToolsOffChatModel);
  assert.equal(service.getGoal(modelToolsOffChatModel).rounds, 0);
  assert.equal(sentRequests.length, modelToolsOffStartSends, 'unavailable model tools should suppress automatic continuation');
  preferenceService.set('cybervinci.aiChat.virtualGoal.modelTools.enabled', undefined);

  const featureOffChatModel = {
    id: 'thread/virtual-goal-feature-off-smoke',
    getRequests: () => featureOffRequests
  };
  const featureOffRequests = [
    makeCompletedRequest(
      'virtual-goal-feature-off-request-1',
      `Done. <!-- cybervinci:goal status="complete" expectedGoalId="ignored-while-disabled" -->`,
      { inputTokens: 8, outputTokens: 8 }
    )
  ];
  await service.setVirtualGoal(featureOffChatModel, 'Do not run when Virtual Goal is disabled', { maxRounds: 4 });
  preferenceService.set('cybervinci.aiChat.virtualGoal.enabled', false);
  assert.equal(service.toVirtualGoalSettings(featureOffChatModel), undefined, 'disabled virtual goal feature should not expose settings to providers');
  widget._chatModel = featureOffChatModel;
  widget.cyberVinciHandledGoalResponses = new Set();
  const featureOffStartSends = sentRequests.length;
  await widget.handleCyberVinciGoalResponseComplete(featureOffChatModel);
  assert.equal(service.getGoal(featureOffChatModel).status, 'active', 'disabled virtual goal feature should ignore model status updates');
  assert.equal(service.getGoal(featureOffChatModel).tokensUsed, 0, 'disabled virtual goal feature should skip accounting');
  assert.equal(service.getGoal(featureOffChatModel).rounds, 0);
  assert.equal(sentRequests.length, featureOffStartSends, 'disabled virtual goal feature should suppress automatic continuation');
  preferenceService.set('cybervinci.aiChat.virtualGoal.enabled', undefined);

  const resumeChatModel = {
    id: 'thread/resume-smoke',
    getRequests: () => []
  };
  await service.setVirtualGoal(resumeChatModel, 'Continue immediately after resume', { maxRounds: 4 });
  await service.updateStatus(resumeChatModel, 'paused');
  const resumedGoal = await service.updateStatus(resumeChatModel, 'active');
  widget._chatModel = resumeChatModel;
  widget.cyberVinciHandledGoalResponses = new Set();
  widget.hasCyberVinciPendingUserInput = () => false;
  const resumeStartSends = sentRequests.length;
  await widget.handleCyberVinciGoalAutoContinueAfterResume(resumeChatModel.id, resumedGoal, 'paused');
  assert.equal(sentRequests.length, resumeStartSends + 1, 'resumed active goal should auto-continue once');
  assert.equal(service.getGoal(resumeChatModel).rounds, 1);

  const resumeDisabledChatModel = {
    id: 'thread/resume-disabled-smoke',
    getRequests: () => []
  };
  await service.setVirtualGoal(resumeDisabledChatModel, 'Do not continue after resume when disabled', { maxRounds: 4 });
  await service.updateStatus(resumeDisabledChatModel, 'paused');
  const disabledResumedGoal = await service.updateStatus(resumeDisabledChatModel, 'active');
  widget._chatModel = resumeDisabledChatModel;
  widget.isCyberVinciVirtualGoalAutoContinueOnResumeEnabled = () => false;
  const resumeDisabledStartSends = sentRequests.length;
  await widget.handleCyberVinciGoalAutoContinueAfterResume(resumeDisabledChatModel.id, disabledResumedGoal, 'paused');
  assert.equal(sentRequests.length, resumeDisabledStartSends, 'disabled resume auto-continue should not send continuation');
  assert.equal(service.getGoal(resumeDisabledChatModel).rounds, 0);
  widget.isCyberVinciVirtualGoalAutoContinueOnResumeEnabled = () => true;

  const threadResumeChatModel = {
    id: 'thread/thread-resume-smoke',
    getRequests: () => threadResumeRequests
  };
  const threadResumeRequests = [
    makeCompletedRequest('thread-resume-request-1', 'Previous turn stopped before completing the goal.', { inputTokens: 2, outputTokens: 2 })
  ];
  await service.setVirtualGoal(threadResumeChatModel, 'Continue when the chat thread is reopened', { maxRounds: 4 });
  widget._chatModel = threadResumeChatModel;
  widget.cyberVinciHandledGoalResponses = new Set();
  const threadResumeStartSends = sentRequests.length;
  await widget.handleCyberVinciGoalAutoContinueAfterThreadResume(threadResumeChatModel);
  assert.equal(sentRequests.length, threadResumeStartSends + 1, 'active goal should auto-continue after thread resume');
  assert.equal(service.getGoal(threadResumeChatModel).rounds, 1);
  await widget.handleCyberVinciGoalAutoContinueAfterThreadResume(threadResumeChatModel);
  assert.equal(sentRequests.length, threadResumeStartSends + 1, 'thread resume should not duplicate continuation for the same goal');

  const exhaustedBudgetChatModel = {
    id: 'thread/exhausted-budget-smoke',
    getRequests: () => exhaustedBudgetRequests
  };
  const exhaustedBudgetRequests = [
    makeCompletedRequest('exhausted-budget-request-1', 'Partial progress with exhausted budget.', { inputTokens: 0, outputTokens: 0 })
  ];
  await service.setVirtualGoal(exhaustedBudgetChatModel, 'Do not continue past budget', { maxRounds: 4, tokenBudget: 10 });
  await service.accountGoalUsage(exhaustedBudgetChatModel, { inputTokens: 10, outputTokens: 0 }, 'used budget');
  await service.updateStatus(exhaustedBudgetChatModel, 'active');
  widget._chatModel = exhaustedBudgetChatModel;
  widget.cyberVinciHandledGoalResponses = new Set();
  const exhaustedBudgetStartSends = sentRequests.length;
  await widget.handleCyberVinciGoalResponseComplete(exhaustedBudgetChatModel);
  assert.equal(service.getGoal(exhaustedBudgetChatModel).status, 'budget_limited');
  assert.equal(sentRequests.length, exhaustedBudgetStartSends + 1, 'exhausted token budget should send one read-only wrap-up');
  assert.equal(sentRequests.at(-1).displayText, 'Wrap up');
  assert.equal(sentRequests.at(-1).modeId, 'ai-providers-read-only');
  assert.match(sentRequests.at(-1).text, /reached its automatic continuation budget/);
  await widget.handleCyberVinciGoalBudgetLimitWrapUp(exhaustedBudgetChatModel, service.getGoal(exhaustedBudgetChatModel));
  assert.equal(sentRequests.length, exhaustedBudgetStartSends + 1, 'budget wrap-up should not duplicate for the same goal');

  const pendingInputChatModel = {
    id: 'thread/pending-input-smoke',
    getRequests: () => pendingInputRequests
  };
  const pendingInputRequests = [
    makeCompletedRequest('pending-input-request-1', 'Partial progress.', { inputTokens: 3, outputTokens: 3 })
  ];
  await service.setVirtualGoal(pendingInputChatModel, 'Do not interrupt user typing', { maxRounds: 4 });
  widget._chatModel = pendingInputChatModel;
  widget.cyberVinciHandledGoalResponses = new Set();
  widget.hasCyberVinciPendingUserInput = () => true;
  const pendingInputStartSends = sentRequests.length;
  await widget.handleCyberVinciGoalResponseComplete(pendingInputChatModel);
  assert.equal(service.getGoal(pendingInputChatModel).rounds, 0);
  assert.equal(sentRequests.length, pendingInputStartSends, 'pending user input should suppress automatic continuation');

  const scopeGuardChatModel = {
    id: 'thread/scope-guard-smoke',
    getRequests: () => scopeGuardRequests
  };
  const scopeGuardRequests = [
    makeCompletedRequest('scope-guard-request-1', 'I changed src/main.ts and package-lock.json while chasing the goal.', { inputTokens: 3, outputTokens: 3 })
  ];
  preferenceService.set('cybervinci.aiChat.virtualGoal.scopeGuard.mode', 'enforce');
  preferenceService.set('cybervinci.aiChat.virtualGoal.scopeGuard.forbiddenPaths', ['package-lock.json']);
  await service.setVirtualGoal(scopeGuardChatModel, 'Do not drift into forbidden paths', { maxRounds: 4 });
  widget._chatModel = scopeGuardChatModel;
  widget.cyberVinciHandledGoalResponses = new Set();
  widget.hasCyberVinciPendingUserInput = () => false;
  const scopeGuardStartSends = sentRequests.length;
  await widget.handleCyberVinciGoalResponseComplete(scopeGuardChatModel);
  assert.equal(service.getGoal(scopeGuardChatModel).status, 'blocked');
  assert.equal(sentRequests.length, scopeGuardStartSends, 'scope guard enforce should block before another continuation');
  preferenceService.set('cybervinci.aiChat.virtualGoal.scopeGuard.mode', undefined);
  preferenceService.set('cybervinci.aiChat.virtualGoal.scopeGuard.forbiddenPaths', undefined);

  const canceledChatModel = {
    id: 'thread/canceled-smoke',
    getRequests: () => canceledRequests
  };
  const canceledRequests = [
    makeCanceledRequest('canceled-request-1')
  ];
  await service.setVirtualGoal(canceledChatModel, 'Keep canceled turns from changing status', { maxRounds: 4 });
  widget._chatModel = canceledChatModel;
  widget.cyberVinciHandledGoalResponses = new Set();
  widget.hasCyberVinciPendingUserInput = () => false;
  const canceledStartSends = sentRequests.length;
  await widget.handleCyberVinciGoalResponseComplete(canceledChatModel);
  assert.equal(service.getGoal(canceledChatModel).status, 'active');
  assert.equal(sentRequests.length, canceledStartSends, 'canceled turn should not trigger continuation');

  const repeatedResponseChatModel = {
    id: 'thread/repeated-response-smoke',
    getRequests: () => repeatedResponseRequests
  };
  const repeatedResponseText = 'Still trying the same approach, but the result is unchanged and there is no new evidence yet.';
  let repeatedResponseRequests = [
    makeCompletedRequest('repeated-response-request-1', repeatedResponseText, { inputTokens: 3, outputTokens: 3 })
  ];
  await service.setVirtualGoal(repeatedResponseChatModel, 'Stop repeated response loops', { maxRounds: 10 });
  widget._chatModel = repeatedResponseChatModel;
  widget.cyberVinciHandledGoalResponses = new Set();
  widget.hasCyberVinciPendingUserInput = () => false;
  const repeatedResponseStartSends = sentRequests.length;
  await widget.handleCyberVinciGoalResponseComplete(repeatedResponseChatModel);
  assert.equal(service.getGoal(repeatedResponseChatModel).status, 'active');
  repeatedResponseRequests = [
    makeCompletedRequest('repeated-response-request-2', repeatedResponseText, { inputTokens: 3, outputTokens: 3 })
  ];
  await widget.handleCyberVinciGoalResponseComplete(repeatedResponseChatModel);
  assert.equal(service.getGoal(repeatedResponseChatModel).status, 'active');
  repeatedResponseRequests = [
    makeCompletedRequest('repeated-response-request-3', repeatedResponseText, { inputTokens: 3, outputTokens: 3 })
  ];
  await widget.handleCyberVinciGoalResponseComplete(repeatedResponseChatModel);
  assert.equal(service.getGoal(repeatedResponseChatModel).status, 'blocked');
  assert.equal(
    sentRequests.length,
    repeatedResponseStartSends + 2,
    'progress guard should block the third repeated response before another continuation'
  );

  const repeatedFailureChatModel = {
    id: 'thread/repeated-failure-smoke',
    getRequests: () => repeatedFailureRequests
  };
  let repeatedFailureRequests = [
    makeCompletedRequest(
      'repeated-failure-request-1',
      'Attempt 1: npm run test failed with exit code 1. Error: expected true got false.',
      { inputTokens: 3, outputTokens: 3 }
    )
  ];
  await service.setVirtualGoal(repeatedFailureChatModel, 'Stop repeated command failure loops', { maxRounds: 10 });
  widget._chatModel = repeatedFailureChatModel;
  widget.cyberVinciHandledGoalResponses = new Set();
  widget.hasCyberVinciPendingUserInput = () => false;
  const repeatedFailureStartSends = sentRequests.length;
  await widget.handleCyberVinciGoalResponseComplete(repeatedFailureChatModel);
  assert.equal(service.getGoal(repeatedFailureChatModel).status, 'active');
  repeatedFailureRequests = [
    makeCompletedRequest(
      'repeated-failure-request-2',
      'Attempt 2: npm run test failed with exit code 1. Error: expected true got false.',
      { inputTokens: 3, outputTokens: 3 }
    )
  ];
  await widget.handleCyberVinciGoalResponseComplete(repeatedFailureChatModel);
  assert.equal(service.getGoal(repeatedFailureChatModel).status, 'active');
  repeatedFailureRequests = [
    makeCompletedRequest(
      'repeated-failure-request-3',
      'Attempt 3: npm run test failed with exit code 1. Error: expected true got false.',
      { inputTokens: 3, outputTokens: 3 }
    )
  ];
  await widget.handleCyberVinciGoalResponseComplete(repeatedFailureChatModel);
  assert.equal(service.getGoal(repeatedFailureChatModel).status, 'blocked');
  assert.equal(
    sentRequests.length,
    repeatedFailureStartSends + 2,
    'progress guard should block the third repeated command failure before another continuation'
  );

  const usageLimitChatModel = {
    id: 'thread/usage-limit-smoke',
    getRequests: () => usageLimitRequests
  };
  const usageLimitRequests = [
    makeErrorRequest('usage-limit-request-1', '429 rate limit: usage limit reached')
  ];
  await service.setVirtualGoal(usageLimitChatModel, 'Stop on usage limit', { maxRounds: 4 });
  widget._chatModel = usageLimitChatModel;
  widget.cyberVinciHandledGoalResponses = new Set();
  widget.hasCyberVinciPendingUserInput = () => false;
  const usageLimitStartSends = sentRequests.length;
  await widget.handleCyberVinciGoalResponseComplete(usageLimitChatModel);
  assert.equal(service.getGoal(usageLimitChatModel).status, 'usage_limited');
  assert.equal(sentRequests.length, usageLimitStartSends, 'usage-limited goal should not continue');

  const genericErrorChatModel = {
    id: 'thread/generic-error-smoke',
    getRequests: () => genericErrorRequests
  };
  const genericErrorRequests = [
    makeErrorRequest('generic-error-request-1', 'Tool execution failed unexpectedly')
  ];
  await service.setVirtualGoal(genericErrorChatModel, 'Block on generic error', { maxRounds: 4 });
  widget._chatModel = genericErrorChatModel;
  widget.cyberVinciHandledGoalResponses = new Set();
  const genericErrorStartSends = sentRequests.length;
  await widget.handleCyberVinciGoalResponseComplete(genericErrorChatModel);
  assert.equal(service.getGoal(genericErrorChatModel).status, 'blocked');
  assert.equal(sentRequests.length, genericErrorStartSends, 'generic error should not continue');

  const lifecycleLogContent = Array.from(memoryFileService.files.values()).join('\n');
  assert.match(lifecycleLogContent, /"event":"turn_started"/);
  assert.match(lifecycleLogContent, /"event":"turn_stopped"/);
  assert.match(lifecycleLogContent, /"event":"turn_canceled"/);
  assert.match(lifecycleLogContent, /"event":"turn_error"/);
  assert.match(lifecycleLogContent, /"event":"continuation_suppressed"/);
  assert.match(lifecycleLogContent, /"reason":"resume_auto_continue_disabled"/);
  assert.match(lifecycleLogContent, /"reason":"model_tools_unavailable"/);
  assert.match(lifecycleLogContent, /"event":"progress_guard_warning"/);
  assert.match(lifecycleLogContent, /"event":"progress_guard_blocked"/);
  assert.match(lifecycleLogContent, /"reason":"repeated_failure"/);
  assert.match(lifecycleLogContent, /"event":"scope_guard_blocked"/);

  preferenceService.set('cybervinci.aiChat.virtualGoal.modelTools.enabled', false);
  const disabledGetGoalTool = makeToolProvider(CyberVinciGetGoalToolProvider, service, preferenceService);
  assert.equal(isToolError(await disabledGetGoalTool.handler('{}', toolContext)), true, 'disabled model tools should reject get_goal');
  preferenceService.set('cybervinci.aiChat.virtualGoal.modelTools.enabled', undefined);

  preferenceService.set('cybervinci.aiChat.virtualGoal.enabled', false);
  await assert.rejects(
    () => service.setVirtualGoal({ id: 'thread/disabled-smoke' }, 'Disabled goal'),
    /disabled/
  );
  preferenceService.set('cybervinci.aiChat.virtualGoal.enabled', undefined);

  const disconnectedRpcService = new CyberVinciAgencyAgentService();
  const disconnectedRpcGet = await disconnectedRpcService.getThreadGoal({ threadId: 'thread/rpc-smoke' });
  assert.equal(disconnectedRpcGet.ok, false, 'RPC goal bridge should report missing frontend client');
  assert.match(disconnectedRpcGet.message, /No frontend client/);

  const rpcService = new CyberVinciAgencyAgentService();
  let rpcGoal;
  rpcService.setClient({
    runPlaybookFromFlow: async () => ({ ok: true }),
    setThreadGoal: async params => {
      rpcGoal = {
        kind: 'virtual',
        threadId: params.threadId || 'thread/rpc-smoke',
        goalId: 'goal-rpc-smoke',
        objective: params.objective,
        status: params.status || 'active',
        tokenBudget: params.tokenBudget,
        tokensUsed: 0,
        createdAt: 1,
        updatedAt: 1,
        timeUsedSeconds: 0,
        rounds: 0,
        maxRounds: params.maxRounds
      };
      return {
        ok: true,
        goal: rpcGoal,
        event: {
          type: 'thread/goal/updated',
          threadId: rpcGoal.threadId,
          eventId: 'evt-rpc-set',
          goal: rpcGoal
        }
      };
    },
    getThreadGoal: async () => ({ ok: true, goal: rpcGoal }),
    getThreadGoalStatus: async () => ({ ok: true, goal: rpcGoal }),
    setThreadGoalBudget: async params => {
      rpcGoal = { ...rpcGoal, tokenBudget: params.tokenBudget };
      return { ok: true, goal: rpcGoal };
    },
    pauseThreadGoal: async () => {
      rpcGoal = { ...rpcGoal, status: 'paused' };
      return { ok: true, goal: rpcGoal };
    },
    resumeThreadGoal: async () => {
      rpcGoal = { ...rpcGoal, status: 'active' };
      return { ok: true, goal: rpcGoal };
    },
    clearThreadGoal: async () => {
      const previousGoal = rpcGoal;
      rpcGoal = undefined;
      return {
        ok: true,
        previousGoal,
        event: {
          type: 'thread/goal/cleared',
          threadId: previousGoal.threadId,
          eventId: 'evt-rpc-clear',
          previousGoal
        }
      };
    }
  });
  const rpcSet = await rpcService.setThreadGoal({
    threadId: 'thread/rpc-smoke',
    objective: 'Expose Virtual Goal RPC bridge',
    tokenBudget: 123,
    maxRounds: 5
  });
  assert.equal(rpcSet.ok, true);
  assert.equal(rpcSet.goal.objective, 'Expose Virtual Goal RPC bridge');
  assert.equal(rpcSet.event.type, 'thread/goal/updated');
  const rpcAliasGet = await rpcService['thread/goal/get']({ threadId: 'thread/rpc-smoke' });
  assert.equal(rpcAliasGet.goal.goalId, 'goal-rpc-smoke', 'thread/goal/get alias should delegate to frontend client');
  const rpcAliasBudget = await rpcService['thread/goal/budget']({ threadId: 'thread/rpc-smoke', tokenBudget: 456 });
  assert.equal(rpcAliasBudget.goal.tokenBudget, 456, 'thread/goal/budget alias should update via frontend client');
  const rpcAliasPause = await rpcService['thread/goal/pause']({ threadId: 'thread/rpc-smoke' });
  assert.equal(rpcAliasPause.goal.status, 'paused');
  const rpcAliasResume = await rpcService['thread/goal/resume']({ threadId: 'thread/rpc-smoke' });
  assert.equal(rpcAliasResume.goal.status, 'active');
  const rpcAliasStatus = await rpcService['thread/goal/status']({ threadId: 'thread/rpc-smoke' });
  assert.equal(rpcAliasStatus.goal.status, 'active');
  const rpcAliasClear = await rpcService['thread/goal/clear']({ threadId: 'thread/rpc-smoke' });
  assert.equal(rpcAliasClear.previousGoal.goalId, 'goal-rpc-smoke');
  assert.equal(rpcAliasClear.event.type, 'thread/goal/cleared');
  assert.equal(rpcGoal, undefined);

  console.log('Virtual Goal smoke passed');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
