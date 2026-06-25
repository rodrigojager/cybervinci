#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const packageRoot = path.resolve(__dirname, '..');
const catalogRoot = path.resolve(packageRoot, 'config');
const toolRegistrySource = path.join(packageRoot, 'src', 'browser', 'cybervinci-tool-registry.ts');
const playbookRuntimeSource = path.join(packageRoot, 'src', 'browser', 'cybervinci-playbook-runtime.ts');
const declarativeAgentContributionSource = path.join(packageRoot, 'src', 'browser', 'cybervinci-declarative-chat-agent-contribution.ts');
const agencyAgentServiceSource = path.join(packageRoot, 'src', 'node', 'cybervinci-agency-agent-service.ts');
const agentCatalogProtocolSource = path.join(packageRoot, 'src', 'common', 'cybervinci-agent-catalog-protocol.ts');
const chatInputWidgetSource = path.join(packageRoot, 'src', 'browser', 'cybervinci-ai-chat-input-widget.tsx');
const chatInputOptionsSource = path.join(packageRoot, 'src', 'browser', 'cybervinci-chat-input-options-contribution.tsx');
const chatAiExecutionControlsSource = path.join(packageRoot, 'src', 'browser', 'cybervinci-chat-ai-execution-controls.tsx');
const nativeAgentFixturePath = path.join(packageRoot, 'scripts', 'fixtures', 'native-theia-chat-agents.json');

const requiredTools = [
  'core.agent.invoke',
  'core.agent.describe',
  'core.agent.preflight',
  'system.agent.nativeMcpRequirements',
  'system.agent.nativeReadiness',
  'core.chat.respond',
  'core.chat.stop',
  'core.playbook.list',
  'core.playbook.run',
  'core.playbook.resume',
  'core.playbook.compileToFlowDraft',
  'core.playbook.createFlowFromPlaybook',
  'core.provider.status',
  'core.theiaTool.list',
  'core.theiaTool.invoke',
  'core.memory.searchContext',
  'core.memory.proposeCandidate',
  'core.memory.requestWriteApproval',
  'core.memory.writeApproved',
  'system.memory.searchContext',
  'system.memory.requestWriteApproval',
  'core.flow.startRun',
  'core.flow.runDynamicWorkflow',
  'core.flow.runAiAuthoredDynamicWorkflow',
  'core.flow.getAiAuthoringSpec',
  'core.flow.runAiAuthoringDraft',
  'core.flow.createWorkflowFromAiAuthoringDraft',
  'system.canvas.collectLayoutDiagnostics',
  'system.vision.judge'
];

const requiredPlaybooks = [
  'native-agent-delegate',
  'direct-chat',
  'ai-chat-flow-route',
  'canvas-design-qa',
  'multi-agent-delivery-review'
];

const knownPlaybookStateTypes = new Set([
  'start',
  'guard',
  'tool',
  'ai',
  'ask',
  'condition',
  'flow',
  'playbook',
  'parallel',
  'response',
  'end'
]);

const requiredMarketplaceCollections = [
  'agents',
  'skills',
  'tools',
  'playbooks',
  'flows',
  'canvas-qa-packs'
];

const expectedNativeMcpPromptRefs = {
  GitHub: ['mcp_github_tools'],
  AppTester: ['mcp_chrome-devtools_tools', 'mcp_playwright_tools', 'mcp_playwright-visual_tools'],
  'pr-reviewer': ['mcp_github_tools']
};

const knownNativeMcpPromptRefs = new Set([
  'mcp_github_tools',
  'mcp_chrome-devtools_tools',
  'mcp_playwright_tools',
  'mcp_playwright-visual_tools'
]);

const autonomousPreferredNativeAgents = {
  AppTester: {
    aiState: 'answer-app-tester',
    responseState: 'app-tester-response'
  },
  Architect: {
    aiState: 'answer-architect',
    responseState: 'architect-response'
  },
  Coder: {
    aiState: 'answer-coder',
    responseState: 'coder-response'
  },
  'code-reviewer': {
    aiState: 'answer-code-reviewer',
    responseState: 'code-reviewer-response'
  },
  Command: {
    aiState: 'answer-command',
    responseState: 'command-response'
  },
  CreateSkill: {
    aiState: 'answer-create-skill',
    responseState: 'create-skill-response'
  },
  explore: {
    aiState: 'answer-explore',
    responseState: 'explore-response'
  },
  GitHub: {
    aiState: 'answer-github',
    responseState: 'github-response'
  },
  OpenCoder: {
    aiState: 'answer-open-coder',
    responseState: 'open-coder-response'
  },
  Orchestrator: {
    aiState: 'answer-orchestrator',
    responseState: 'orchestrator-response'
  },
  'pr-reviewer': {
    aiState: 'answer-pr-reviewer',
    responseState: 'pr-reviewer-response'
  },
  ProjectInfo: {
    aiState: 'answer-project-info',
    responseState: 'project-info-response'
  },
  Universal: {
    aiState: 'answer-universal',
    responseState: 'universal-response'
  }
};

const schemaRoot = path.join(catalogRoot, 'system', 'schemas');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function readCatalogFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  return /\.ya?ml$/i.test(file) ? yaml.load(content) : JSON.parse(content);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function collectCatalog() {
  const catalog = {
    agents: [],
    tools: [],
    playbooks: [],
    marketplace: []
  };
  for (const file of walk(catalogRoot).filter(item => /\.(json|ya?ml)$/i.test(item))) {
    const document = readCatalogFile(file);
    if (!document || typeof document !== 'object' || Array.isArray(document)) {
      continue;
    }
    for (const agent of asArray(document.agents)) {
      catalog.agents.push({ ...agent, sourceFile: file });
    }
    for (const tool of asArray(document.tools)) {
      catalog.tools.push({ ...tool, sourceFile: file });
    }
    for (const playbook of asArray(document.playbooks)) {
      catalog.playbooks.push({ ...playbook, sourceFile: file });
    }
    for (const item of asArray(document.marketplace).concat(asArray(document.items))) {
      catalog.marketplace.push({ ...item, sourceFile: file });
    }
  }
  return catalog;
}

function fail(message, details) {
  console.error(message);
  if (details) {
    console.error(JSON.stringify(details, null, 2));
  }
  process.exitCode = 1;
}

function assertUnique(items, kind) {
  const byId = new Map();
  for (const item of items) {
    if (!item.id) {
      fail(`${kind} without id`, item);
      continue;
    }
    const current = byId.get(item.id) || [];
    current.push(item.sourceFile);
    byId.set(item.id, current);
  }
  for (const [id, files] of byId) {
    if (files.length > 1) {
      fail(`Duplicate ${kind} id '${id}'`, files);
    }
  }
}

function referencedStates(state) {
  return [
    state.next,
    state.onPass,
    state.onFail,
    state.onError,
    state.default,
    ...asArray(state.transitions).map(transition => transition.to),
    ...asArray(state.options).map(option => option.next),
    ...asArray(state.cases).map(item => item.next),
    ...asArray(state.branches)
  ].filter(value => typeof value === 'string' && value.trim());
}

function validatePlaybook(playbook, toolIds) {
  if (!Array.isArray(playbook.states) || !playbook.states.length) {
    fail(`Playbook '${playbook.id}' has no states`, playbook.sourceFile);
    return;
  }
  const states = new Map(playbook.states.map(state => [state.id, state]));
  if (!states.has(playbook.entry)) {
    fail(`Playbook '${playbook.id}' entry '${playbook.entry}' is missing`, playbook.sourceFile);
  }
  for (const state of playbook.states) {
    if (!state.id || !state.type) {
      fail(`Playbook '${playbook.id}' has malformed state`, state);
      continue;
    }
    if (!knownPlaybookStateTypes.has(state.type)) {
      fail(`Playbook '${playbook.id}' state '${state.id}' uses unknown state type '${state.type}'`, playbook.sourceFile);
    }
    for (const target of referencedStates(state)) {
      if (!states.has(target)) {
        fail(`Playbook '${playbook.id}' state '${state.id}' references missing state '${target}'`, playbook.sourceFile);
      }
    }
    const tool = state.tool || state.guard;
    if ((state.type === 'tool' || state.type === 'guard') && tool && !toolIds.has(tool)) {
      fail(`Playbook '${playbook.id}' state '${state.id}' references missing tool '${tool}'`, playbook.sourceFile);
    }
  }
}

function validateFlowRoute(playbooks) {
  const playbook = playbooks.find(item => item.id === 'ai-chat-flow-route');
  if (!playbook) {
    return;
  }
  const states = stateById(playbook);
  const requiredStates = ['decide-route', 'run-saved-flow', 'run-dynamic-workflow', 'run-ai-authored-workflow', 'done'];
  for (const id of requiredStates) {
    if (!states.has(id)) {
      fail(`AI Chat Flow Route is missing state '${id}'`, playbook.sourceFile);
    }
  }
  const decideRoute = states.get('decide-route');
  if (decideRoute?.type !== 'condition') {
    fail('AI Chat Flow Route must start with a condition state that branches by input.flowMode', playbook.sourceFile);
  }
  const saved = states.get('run-saved-flow');
  const dynamic = states.get('run-dynamic-workflow');
  const authoring = states.get('run-ai-authored-workflow');
  if (saved?.type !== 'flow' || saved.mode !== 'saved' || !saved.workflowId) {
    fail('AI Chat Flow Route saved state must be a flow state with mode=saved and workflowId', playbook.sourceFile);
  }
  if (dynamic?.type !== 'flow' || dynamic.mode !== 'dynamic' || dynamic.preferSaved !== true) {
    fail('AI Chat Flow Route dynamic state must be a flow state with mode=dynamic and preferSaved=true', playbook.sourceFile);
  }
  if (authoring?.type !== 'flow' || authoring.mode !== 'authoring' || !authoring.authoringDraft) {
    fail('AI Chat Flow Route authoring state must be a flow state with mode=authoring and authoringDraft', playbook.sourceFile);
  }
}

function validateMultiAgentDeliveryReview(playbooks) {
  const playbook = playbooks.find(item => item.id === 'multi-agent-delivery-review');
  if (!playbook) {
    return;
  }
  const states = stateById(playbook);
  const requiredStates = [
    'plan-work',
    'run-agent-branches',
    'execute-work',
    'critique-work',
    'verify-work',
    'route-review',
    'repair-work',
    'repair-response',
    'synthesize-final',
    'final-response'
  ];
  for (const id of requiredStates) {
    if (!states.has(id)) {
      fail(`Multi-Agent Delivery Review is missing state '${id}'`, playbook.sourceFile);
    }
  }
  if (playbook.entry !== 'plan-work') {
    fail('Multi-Agent Delivery Review must start with the planner state', playbook.sourceFile);
  }
  const planner = states.get('plan-work');
  if (planner?.type !== 'ai' || planner.agent !== 'planner' || planner.outputMode !== 'json' || planner.saveAs !== 'plan') {
    fail('Multi-Agent Delivery Review planner must be a structured planner AI state saved as plan', playbook.sourceFile);
  }
  const parallel = states.get('run-agent-branches');
  const expectedBranches = ['execute-work', 'critique-work', 'verify-work'];
  if (
    parallel?.type !== 'parallel'
    || parallel.saveAs !== 'agentBranches'
    || expectedBranches.some((branch, index) => asArray(parallel.branches)[index] !== branch)
  ) {
    fail('Multi-Agent Delivery Review must run executor, critic, and verifier as a parallel branch state saved as agentBranches', playbook.sourceFile);
  }
  for (const [id, agent, saveAs] of [
    ['execute-work', 'executor', 'executorResult'],
    ['critique-work', 'critic', 'criticReview'],
    ['verify-work', 'verifier', 'verification'],
    ['repair-work', 'repairer', 'repairPlan']
  ]) {
    const state = states.get(id);
    if (state?.type !== 'ai' || state.agent !== agent || state.outputMode !== 'json' || state.saveAs !== saveAs) {
      fail(`Multi-Agent Delivery Review state '${id}' must be a structured ${agent} AI state saved as '${saveAs}'`, playbook.sourceFile);
    }
  }
  const routeReview = states.get('route-review');
  if (routeReview?.type !== 'condition' || routeReview.default !== 'synthesize-final') {
    fail('Multi-Agent Delivery Review must route reviewed work through a condition with synthesize-final as the default path', playbook.sourceFile);
  }
  const repairTargets = asArray(routeReview?.cases).map(item => item.next);
  if (repairTargets.length < 3 || repairTargets.some(next => next !== 'repair-work')) {
    fail('Multi-Agent Delivery Review route-review must send executor, critic, or verifier failures to repair-work', playbook.sourceFile);
  }
  if (states.get('synthesize-final')?.type !== 'ai' || states.get('final-response')?.type !== 'response' || states.get('repair-response')?.type !== 'response') {
    fail('Multi-Agent Delivery Review must provide final and repair response states', playbook.sourceFile);
  }
}

function validateFlowRouteInputWiring() {
  if (!fs.existsSync(chatInputWidgetSource)) {
    fail(`AI Chat input widget source is missing: ${chatInputWidgetSource}`);
    return;
  }
  const source = fs.readFileSync(chatInputWidgetSource, 'utf8');
  if (!source.includes('CYBERVINCI_AI_CHAT_FLOW_ROUTE_PLAYBOOK_ID')) {
    fail('AI Chat input widget must reference CYBERVINCI_AI_CHAT_FLOW_ROUTE_PLAYBOOK_ID for Flow routing');
  }
  if (!source.includes('runCyberVinciFlowRoute') || !source.includes('.runPlaybookById(CYBERVINCI_AI_CHAT_FLOW_ROUTE_PLAYBOOK_ID')) {
    fail('AI Chat input widget must route Saved Flow/Dynamic Workflow through the Flow Route playbook before command fallback');
  }
  if (
    !source.includes('readChatAiExecutionFromPreferences')
    || !source.includes('withCyberVinciFlowExecutionSelection')
    || !source.includes('execution: readChatAiExecutionFromPreferences(this.preferenceService)')
    || !source.includes("modeOrCommandId === 'dynamic'")
    || !source.includes('modeOrCommandId === FLOW_RUN_DYNAMIC_WORKFLOW_COMMAND')
  ) {
    fail('AI Chat Dynamic Workflow routing must pass the current provider/model/reasoning/service tier selection through the shared execution helper');
  }
  const legacyFlowCommandIndex = source.indexOf('protected async runLegacyFlowCommand');
  const legacyDynamicCommandIndex = source.indexOf('FLOW_RUN_DYNAMIC_WORKFLOW_COMMAND', legacyFlowCommandIndex);
  const legacyDynamicHelperIndex = source.indexOf('this.withCyberVinciFlowExecutionSelection({', legacyDynamicCommandIndex);
  if (
    !source.includes('this.withCyberVinciFlowExecutionSelection(flowCommand.options, flowCommand.commandId)')
    || legacyFlowCommandIndex < 0
    || legacyDynamicCommandIndex < 0
    || legacyDynamicHelperIndex < 0
  ) {
    fail('AI Chat /flow-dynamic command parsing and legacy Dynamic Workflow fallback must preserve the current execution selection');
  }
  if (!source.includes('runLegacyFlowCommand')) {
    fail('AI Chat input widget must keep a legacy Flow command fallback for workflow selection and compatibility');
  }

  if (!fs.existsSync(chatInputOptionsSource) || !fs.existsSync(chatAiExecutionControlsSource)) {
    fail('AI Chat Flow routing UI source files are missing');
    return;
  }
  const optionsSource = fs.readFileSync(chatInputOptionsSource, 'utf8');
  const executionSource = fs.readFileSync(chatAiExecutionControlsSource, 'utf8');
  if (!optionsSource.includes("effectiveFlowMode !== 'saved'") || !optionsSource.includes('<CyberVinciChatAiExecutionControls')) {
    fail('AI Chat must show provider/model controls for Direct Chat and Dynamic Workflow, but hide them for Saved Flow');
  }
  if (!optionsSource.includes("effectiveFlowMode === 'saved'") || !optionsSource.includes('<SavedWorkflowSelector')) {
    fail('AI Chat Saved Flow route must expose a saved workflow selector instead of chat provider/model controls');
  }
  for (const expected of [
    "data-cybervinci-menu='saved-workflow'",
    "data-cybervinci-control='saved-workflow-search'",
    'flowWorkflowDetail',
    'flowWorkflowBadges',
    'capabilities=',
    'workflow.file?.path',
    'workflow.file?.editable',
    'ReactDOM.createPortal(menu, document.body)',
    'theia-ChatInput-SavedWorkflowOption'
  ]) {
    if (!optionsSource.includes(expected)) {
      fail(`AI Chat Saved Flow selector must show searchable workflow details/status: missing '${expected}'`);
    }
  }
  if (!optionsSource.includes("effectiveFlowMode === 'chat'") || !optionsSource.includes('<CyberVinciChatVirtualReasoningSelector')) {
    fail('AI Chat Virtual Reasoning controls must stay scoped to Direct Chat mode');
  }
  if (optionsSource.includes('<CyberVinciChatVisionJudgeControls')) {
    fail('AI Chat toolbar must not expose Canvas Vision Judge controls');
  }
  for (const expected of [
    'theia-ChatInput-AgencyAgentSearchInput',
    'filteredGroups',
    'Search Agents',
    'No matching Agents',
    'requestAnimationFrame(() => searchRef.current?.focus())',
    'CYBERVINCI_AI_CHAT_AGENT_PROFILE_FAVORITES_PREF',
    "data-cybervinci-agent-action='favorite'",
    "data-cybervinci-agent-action='edit'",
    "data-cybervinci-agent-action='duplicate'",
    'service.getAgentProfilePath(agent.id)',
    'service.duplicateAgentProfileToUser(agent.id)',
    'normalizeStringArrayPreference',
    'Favorites'
  ]) {
    if (!optionsSource.includes(expected)) {
      fail(`AI Chat Agent profile selector must keep searchable grouped Agent UI: missing '${expected}'`);
    }
  }
  for (const expected of [
    "data-cybervinci-menu='playbook'",
    'data-cybervinci-playbook-group',
    'data-cybervinci-playbook-warning',
    'playbookWarnings',
    'Search Playbooks',
    'No matching Playbooks',
    'No Playbook',
    'clear-playbook',
    'Clear Playbook selection',
    'playbook-manager',
    'playbook-runs',
    'cybervinci.aiChat.showPlaybookManager',
    'cybervinci.aiChat.showPlaybookRuns'
  ]) {
    if (!optionsSource.includes(expected)) {
      fail(`AI Chat Playbook selector must keep grouped Playbook UI with warnings and actions: missing '${expected}'`);
    }
  }
  if (!executionSource.includes("flowMode === 'saved'") || !executionSource.includes('Authoring provider') || !executionSource.includes('workflow-authoring')) {
    fail('AI Chat execution controls must treat Dynamic Workflow provider/model as workflow authoring controls and stay hidden in Saved Flow');
  }
  for (const expected of [
    'CODEX_CLI_RUNTIME_PREF',
    'CODEX_CLI_MODEL_PROVIDER_PREF',
    'CODEX_CLI_MODEL_PREF',
    'CODEX_CLI_REASONING_EFFORT_PREF',
    'CODEX_CLI_REASONING_VARIANT_PREF',
    'CODEX_CLI_SERVICE_TIER_PREF',
    'export function readChatAiExecutionFromPreferences'
  ]) {
    if (!executionSource.includes(expected)) {
      fail(`AI Chat execution controls must use shared provider runtime preference '${expected}'`);
    }
  }
}

function validateAskResumeRuntime() {
  if (!fs.existsSync(playbookRuntimeSource) || !fs.existsSync(declarativeAgentContributionSource)) {
    fail('CyberVinci Playbook runtime/contribution source files are missing');
    return;
  }
  const runtimeSource = fs.readFileSync(playbookRuntimeSource, 'utf8');
  const contributionSource = fs.readFileSync(declarativeAgentContributionSource, 'utf8');
  if (!runtimeSource.includes('QuestionResponseContentImpl') || !runtimeSource.includes('request.response.waitForInput()')) {
    fail('Playbook ask states must render as native AI Chat questions and wait for user input in chat turns');
  }
  if (!runtimeSource.includes('resumeAskStateFromChat') || !runtimeSource.includes('resumeRunWithInput')) {
    fail('Playbook ask states must resume through the playbook runtime with explicit user input');
  }
  if (!runtimeSource.includes('context.state.resumeInput') || !runtimeSource.includes('matchAskOption')) {
    fail('Playbook ask states must resolve selected options from resume/tool input instead of transient UI state only');
  }
  if (runtimeSource.includes('const fallback = options[0]') || runtimeSource.includes('return { ok: true, next: fallback.next }')) {
    fail('Playbook ask states must not silently choose the first option when no UI is available');
  }
  if (!runtimeSource.includes("addData('cybervinci.playbook.askStateId'") || !runtimeSource.includes("addData('cybervinci.playbook.askOptions'")) {
    fail('Playbook ask states must attach ask metadata to the chat request for resumable UI/tool integrations');
  }
  if (!contributionSource.includes('resolveCheckpointAskState') || !contributionSource.includes('resumeRunWithInput(run.requestId, input)')) {
    fail('Playbook run resume command must prompt for ask-state optionId before resuming');
  }
}

function validateManagerSurfaces() {
  if (!fs.existsSync(declarativeAgentContributionSource) || !fs.existsSync(agentCatalogProtocolSource) || !fs.existsSync(agencyAgentServiceSource)) {
    fail('CyberVinci catalog manager/protocol source files are missing');
    return;
  }
  const contributionSource = fs.readFileSync(declarativeAgentContributionSource, 'utf8');
  const protocolSource = fs.readFileSync(agentCatalogProtocolSource, 'utf8');
  const serviceSource = fs.readFileSync(agencyAgentServiceSource, 'utf8');
  if (!protocolSource.includes('assignAgentDefaultPlaybook')) {
    fail('Agent catalog protocol must expose assignAgentDefaultPlaybook for manager playbook assignment');
  }
  if (!protocolSource.includes('createUserAgentCopy')) {
    fail('Agent catalog protocol must expose createUserAgentCopy for runtime @ agent conversion');
  }
  if (!protocolSource.includes('deleteUserCatalogItem')) {
    fail('Agent catalog protocol must expose deleteUserCatalogItem for manager cleanup/delete');
  }
  for (const expected of [
    'assign-playbook',
    'Set Default Playbook',
    'service.assignAgentDefaultPlaybook',
    'delete-user',
    'Delete User Copy',
    'service.deleteUserCatalogItem',
    "item.source === 'runtime'",
    'service.createUserAgentCopy',
    'assign-playbook-to-agent',
    'Assign To Agent',
    'show-playbook-states',
    'Show States',
    'showPlaybookStates',
    'Run Simulation',
    'Custom Prompt + JSON Input',
    'runPlaybookSimulation',
    'collectPlaybookSimulationInput',
    'defaultPlaybookSimulationPrompt',
    'assignPlaybookToAgent',
    'set-chat-playbook',
    'Use In Chat Toolbar',
    'setChatToolbarPlaybook',
    'CYBERVINCI_AI_CHAT_PLAYBOOK_PREF',
    'show-tool-definition',
    'Show Definition',
    'showToolDefinition',
    'Test Tool',
    'JSON Input',
    'collectToolTestInput',
    'compactJson',
    'openCatalogPaths',
    'test-agent',
    'Test Agent Preflight',
    'Run Agent Simulation',
    'runAgentSimulation',
    'defaultAgentSimulationPrompt',
    'show-agent-capabilities',
    'Show Capabilities',
    'showAgentCapabilities',
    'showPlaybookRunInspector',
    'runRunInspectorObservabilitySmoke',
    'startPlaybookPersistenceReloadSmoke',
    'finishPlaybookPersistenceReloadSmoke',
    'runCatalogManagerEditingSmoke',
    'runCanvasDesignQaRealEditorSmoke',
    'CYBERVINCI_PLAYBOOK_RUN_HISTORY_STORAGE_KEY',
    'resolveRunMigrationStatus',
    'Migration Status',
    'Open Playbook Source',
    'Open Agent Source',
    'Artifacts',
    'Timeline',
    'Diagnostics',
    'Failure Recovery',
    'Copy Artifacts JSON',
    'Copy Artifacts Markdown',
    'Copy Timeline JSON',
    'Copy Timeline Markdown',
    'Copy Diagnostics JSON',
    'Copy Diagnostics Markdown',
    'Copy Run JSON',
    'Copy Run Markdown',
    'Filter By Status',
    'Filter By Playbook',
    'Compare Runs',
    'Copy Runs Summary JSON',
    'Copy Runs Summary Markdown',
    'Copy Comparison JSON',
    'Copy Comparison Markdown',
    'copyPlaybookRunJson',
    'copyPlaybookRunMarkdown',
    'copyPlaybookRunListJson',
    'copyPlaybookRunListMarkdown',
    'showPlaybookRunArtifacts',
    'showPlaybookRunTimeline',
    'showPlaybookRunDiagnostics',
    'playbookRunArtifacts',
    'playbookRunTimeline',
    'playbookRunDiagnostics',
    'toPlaybookRunArtifactsExport',
    'toPlaybookRunArtifactsMarkdown',
    'toPlaybookRunTimelineExport',
    'toPlaybookRunTimelineMarkdown',
    'toPlaybookRunDiagnosticsExport',
    'toPlaybookRunDiagnosticsMarkdown',
    'showPlaybookRunComparisonPicker',
    'toPlaybookRunComparison',
    'toPlaybookRunExport',
    'toPlaybookRunMarkdown',
    'toPlaybookRunListExport',
    'toPlaybookRunListMarkdown',
    'showStructuredRunDetails',
    'migrationStatusDescription',
    "'core.agent.describe'",
    "'core.agent.preflight'"
  ]) {
    if (!contributionSource.includes(expected)) {
      fail(`Agent Manager surface is missing '${expected}'`);
    }
  }
  for (const expected of [
    'materializeEditableNativeAgentPlaybook',
    'user.native-agent.',
    'Editable Playbook:',
    'paths?: string[]',
    'getAgentProfilePath',
    'duplicateAgentProfileToUser',
    'uniqueMarkdownOutputPath',
    'CYBERVINCI_AGENCY_AGENTS_DIR',
    'validateCommandToolPathPolicy',
    'pathContainsOrEquals',
    'policy.allowedPaths',
    'policy.deniedPaths'
  ]) {
    if (!serviceSource.includes(expected) && !protocolSource.includes(expected)) {
      fail(`Agent catalog service is missing '${expected}'`);
    }
  }
}

function stateById(playbook) {
  return new Map(asArray(playbook.states).map(state => [state.id, state]));
}

function validateNativeAgents(catalog, playbookIds) {
  const nativeAgents = catalog.agents.filter(agent => agent.kind === 'native');
  validateNativeAgentFixture(nativeAgents);
  const playbooksById = new Map(catalog.playbooks.map(playbook => [playbook.id, playbook]));
  for (const agent of nativeAgents) {
    if (!agent.sourceAgentId) {
      fail(`Native agent '${agent.id}' is missing sourceAgentId`, agent.sourceFile);
    }
    const preserve = agent.preserveNative || {};
    if (preserve.invoke !== false) {
      fail(`Native agent '${agent.id}' must disable native invoke delegation`, agent.sourceFile);
    }
    for (const key of ['modes', 'prompts', 'variables', 'functions', 'languageModelRequirements']) {
      if (preserve[key] !== true) {
        fail(`Native agent '${agent.id}' does not preserve native ${key}`, agent.sourceFile);
      }
    }
    const expectedPlaybook = `native-agent.${agent.sourceAgentId || agent.id}`;
    if (agent.defaultPlaybook !== expectedPlaybook) {
      fail(`Native agent '${agent.id}' must declare defaultPlaybook '${expectedPlaybook}' instead of '${agent.defaultPlaybook || '<missing>'}'`, agent.sourceFile);
    }
    for (const requiredPlaybook of [expectedPlaybook]) {
      if (!asArray(agent.playbooks).includes(requiredPlaybook)) {
        fail(`Native agent '${agent.id}' playbooks must include '${requiredPlaybook}'`, agent.sourceFile);
      }
    }
    for (const forbiddenPlaybook of ['native-agent-delegate', 'direct-chat']) {
      if (asArray(agent.playbooks).includes(forbiddenPlaybook)) {
        fail(`Native agent '${agent.id}' playbooks must not include native fallback '${forbiddenPlaybook}'`, agent.sourceFile);
      }
    }
    if (!playbookIds.has(expectedPlaybook)) {
      fail(`Native agent '${agent.id}' is missing per-agent playbook '${expectedPlaybook}'`, agent.sourceFile);
    }
    for (const requiredTool of ['core.agent.describe', 'core.agent.preflight', 'system.agent.nativeMcpRequirements']) {
      if (!asArray(agent.tools).includes(requiredTool)) {
        fail(`Native agent '${agent.id}' does not expose required runtime tool '${requiredTool}'`, agent.sourceFile);
      }
    }
    if (asArray(agent.tools).includes('core.agent.invoke')) {
      fail(`Native agent '${agent.id}' must not expose core.agent.invoke as a standard runtime tool`, agent.sourceFile);
    }
    if (!agent.capabilityProfile || !Array.isArray(agent.capabilityProfile.mcpPromptRefs)) {
      fail(`Native agent '${agent.id}' must declare capabilityProfile.mcpPromptRefs, even when no MCP bridge is known`, agent.sourceFile);
    }
    const actualMcpPromptRefs = asArray(agent.capabilityProfile?.mcpPromptRefs);
    for (const promptRef of actualMcpPromptRefs) {
      if (!knownNativeMcpPromptRefs.has(promptRef)) {
        fail(`Native agent '${agent.id}' declares unknown MCP prompt ref '${promptRef}'`, agent.sourceFile);
      }
    }
    const expectedMcpPromptRefs = expectedNativeMcpPromptRefs[agent.id] || [];
    if (
      actualMcpPromptRefs.length !== expectedMcpPromptRefs.length
      || expectedMcpPromptRefs.some((ref, index) => actualMcpPromptRefs[index] !== ref)
    ) {
      fail(`Native agent '${agent.id}' capabilityProfile.mcpPromptRefs must match the audited @ contract`, {
        expected: expectedMcpPromptRefs,
        actual: actualMcpPromptRefs,
        sourceFile: agent.sourceFile
      });
    }
    const playbook = playbooksById.get(expectedPlaybook);
    if (/\bNative Agent$/i.test(String(playbook?.name ?? ''))) {
      fail(`Native agent '${agent.id}' playbook '${expectedPlaybook}' must not expose the redundant 'Native Agent' name suffix`, playbook?.sourceFile || agent.sourceFile);
    }
    const playbookDescription = String(playbook?.description ?? '');
    for (const forbiddenDescriptionFragment of [
      'Per-agent playbook',
      'records agent metadata',
      'runtime preflight',
      'declarative AI state',
      'native delegation'
    ]) {
      if (playbookDescription.includes(forbiddenDescriptionFragment)) {
        fail(`Native agent '${agent.id}' playbook '${expectedPlaybook}' description must explain user-facing agent behavior, not architecture.`, playbook?.sourceFile || agent.sourceFile);
      }
    }
    const states = stateById(playbook || {});
    for (const requiredState of [
      'describe-agent',
      'preflight',
      'check-native-requirements',
      'decide-native-mcp',
      'ask-native-mcp-configure',
      'ask-native-mcp-start',
      'configure-native-mcp',
      'ensure-native-mcp'
    ]) {
      if (!states.has(requiredState)) {
        fail(`Native agent '${agent.id}' playbook '${expectedPlaybook}' is missing state '${requiredState}'`, playbook?.sourceFile || agent.sourceFile);
      }
    }
    if (states.get('describe-agent')?.tool !== 'core.agent.describe') {
      fail(`Native agent '${agent.id}' playbook '${expectedPlaybook}' must describe the agent before AI response`, playbook?.sourceFile || agent.sourceFile);
    }
    if (states.get('preflight')?.tool !== 'core.agent.preflight') {
      fail(`Native agent '${agent.id}' playbook '${expectedPlaybook}' must run agent preflight before AI response`, playbook?.sourceFile || agent.sourceFile);
    }
    if (states.get('check-native-requirements')?.tool !== 'system.agent.nativeMcpRequirements') {
      fail(`Native agent '${agent.id}' playbook '${expectedPlaybook}' must report native MCP requirements before AI response`, playbook?.sourceFile || agent.sourceFile);
    }
    if (states.get('decide-native-mcp')?.type !== 'condition') {
      fail(`Native agent '${agent.id}' playbook '${expectedPlaybook}' must branch on native MCP requirements before AI response`, playbook?.sourceFile || agent.sourceFile);
    }
    if (states.get('configure-native-mcp')?.tool !== 'system.agent.nativeMcpRequirements'
        || states.get('configure-native-mcp')?.args?.mode !== 'configure') {
      fail(`Native agent '${agent.id}' playbook '${expectedPlaybook}' must support declarative MCP configuration`, playbook?.sourceFile || agent.sourceFile);
    }
    if (states.get('ensure-native-mcp')?.tool !== 'system.agent.nativeMcpRequirements'
        || states.get('ensure-native-mcp')?.args?.mode !== 'ensure') {
      fail(`Native agent '${agent.id}' playbook '${expectedPlaybook}' must support declarative MCP startup`, playbook?.sourceFile || agent.sourceFile);
    }
    const autonomous = autonomousPreferredNativeAgents[agent.id];
    if (autonomous) {
      if (agent.migrationStatus?.strategy !== 'playbook-autonomous') {
        fail(`${agent.id} must declare autonomous migration status without native fallback.`, agent.sourceFile);
      }
      if (agent.migrationStatus?.autonomousPlaybook !== true || agent.migrationStatus?.nativeDelegateFallback !== false || agent.migrationStatus?.nativeDelegate !== false) {
        fail(`${agent.id} migration status must mark the autonomous playbook and disabled native fallback explicitly.`, agent.sourceFile);
      }
      if (agent.migrationStatus?.selectedPlaybook !== expectedPlaybook || agent.migrationStatus?.sourceAgentId !== agent.sourceAgentId) {
        fail(`${agent.id} migration status must point to the native agent playbook and source agent.`, agent.sourceFile);
      }
      if (states.get('decide-native-mcp')?.default !== autonomous.aiState) {
        fail(`${agent.id} must route the default MCP-ready path to the autonomous AI state.`, playbook?.sourceFile || agent.sourceFile);
      }
      if (states.get(autonomous.aiState)?.type !== 'ai' || states.get(autonomous.aiState)?.onError) {
        fail(`${agent.id} must answer through an AI state without native fallback on error.`, playbook?.sourceFile || agent.sourceFile);
      }
      if (states.get(autonomous.responseState)?.type !== 'response') {
        fail(`${agent.id} autonomous path must finish through a response state.`, playbook?.sourceFile || agent.sourceFile);
      }
    }
  }
}

function validateCompositeTools(catalog) {
  const toolsById = new Map(catalog.tools.map(tool => [tool.id, tool]));
  const nativeReadiness = toolsById.get('system.agent.nativeReadiness');
  if (!nativeReadiness) {
    fail('Missing composite system guard system.agent.nativeReadiness');
    return;
  }
  if (nativeReadiness.implementation !== 'composite' || nativeReadiness.kind !== 'guard') {
    fail('system.agent.nativeReadiness must be a composite guard', nativeReadiness.sourceFile);
  }
  const steps = asArray(nativeReadiness.steps);
  const expectedSteps = [
    ['describe-agent', 'core.agent.describe', 'agentProfile'],
    ['preflight', 'core.agent.preflight', 'agentPreflight'],
    ['native-mcp-requirements', 'system.agent.nativeMcpRequirements', 'nativeMcpRequirements']
  ];
  if (steps.length !== expectedSteps.length) {
    fail('system.agent.nativeReadiness must keep the expected native readiness step count', nativeReadiness.sourceFile);
  }
  for (const [index, [id, tool, saveAs]] of expectedSteps.entries()) {
    const step = steps[index];
    if (step?.id !== id || step?.tool !== tool || step?.saveAs !== saveAs) {
      fail(`system.agent.nativeReadiness step ${index + 1} must be '${id}' -> '${tool}' saved as '${saveAs}'`, {
        expected: { id, tool, saveAs },
        actual: step,
        sourceFile: nativeReadiness.sourceFile
      });
    }
  }
}

function validateNativeAgentFixture(nativeAgents) {
  if (!fs.existsSync(nativeAgentFixturePath)) {
    fail(`Native Theia agent fixture is missing: ${nativeAgentFixturePath}`);
    return;
  }
  const fixture = JSON.parse(fs.readFileSync(nativeAgentFixturePath, 'utf8'));
  const expected = asArray(fixture.agents);
  const actualIds = nativeAgents.map(agent => agent.id);
  const expectedIds = expected.map(agent => agent.id);
  if (actualIds.length !== expectedIds.length || actualIds.some((id, index) => id !== expectedIds[index])) {
    fail('Native Theia agent catalog must match the versioned @ menu fixture order and ids', {
      expected: expectedIds,
      actual: actualIds
    });
  }
  const seenSourceAgents = new Set();
  for (const expectedAgent of expected) {
    const actual = nativeAgents.find(agent => agent.id === expectedAgent.id);
    if (!actual) {
      fail(`Native Theia agent fixture entry '${expectedAgent.id}' is missing from catalog`);
      continue;
    }
    for (const property of ['sourceAgentId', 'name', 'iconClass']) {
      if (actual[property] !== expectedAgent[property]) {
        fail(`Native Theia agent '${actual.id}' ${property} must match fixture`, {
          expected: expectedAgent[property],
          actual: actual[property]
        });
      }
    }
    if (seenSourceAgents.has(actual.sourceAgentId)) {
      fail(`Native Theia sourceAgentId '${actual.sourceAgentId}' is duplicated in the @ menu fixture mapping`);
    }
    seenSourceAgents.add(actual.sourceAgentId);
  }
}

function hostToolSwitchCases() {
  if (!fs.existsSync(toolRegistrySource)) {
    fail(`Tool registry source is missing: ${toolRegistrySource}`);
    return { cases: new Set(), hasStubFallback: false };
  }
  const source = fs.readFileSync(toolRegistrySource, 'utf8');
  const start = source.indexOf('protected async executeHostTool(');
  const end = source.indexOf('\n    protected async describeAgent', start);
  if (start < 0 || end < 0) {
    fail('Could not locate executeHostTool body in CyberVinciToolRegistry');
    return { cases: new Set(), hasStubFallback: false };
  }
  const body = source.slice(start, end);
  return {
    cases: new Set([...body.matchAll(/case '([^']+)':/g)].map(match => match[1])),
    hasStubFallback: /default:\s*\n\s*return this\.executeSystemStub\(toolId\);/.test(body)
  };
}

function validateHostToolImplementations(catalog) {
  const hostTools = catalog.tools.filter(tool => tool.implementation === 'host');
  const { cases, hasStubFallback } = hostToolSwitchCases();
  if (!hasStubFallback) {
    fail('executeHostTool must keep an explicit executeSystemStub fallback so unsupported host tools fail visibly');
  }
  for (const tool of hostTools) {
    if (!cases.has(tool.id)) {
      fail(`Host tool '${tool.id}' has no executeHostTool switch case and would fall back to executeSystemStub`, tool.sourceFile);
    }
  }

  const toolsById = new Map(catalog.tools.map(tool => [tool.id, tool]));
  const referencedToolIds = new Set();
  for (const agent of catalog.agents) {
    for (const toolId of asArray(agent.tools)) {
      referencedToolIds.add(toolId);
    }
  }
  for (const playbook of catalog.playbooks) {
    for (const state of asArray(playbook.states)) {
      const toolId = state.tool || state.guard;
      if (toolId) {
        referencedToolIds.add(toolId);
      }
    }
  }
  for (const toolId of [...referencedToolIds].sort()) {
    const tool = toolsById.get(toolId);
    if (tool?.implementation === 'host' && !cases.has(toolId)) {
      fail(`Referenced host tool '${toolId}' has no registry implementation`, tool.sourceFile);
    }
  }
  return {
    hostToolCount: hostTools.length,
    hostSwitchCaseCount: cases.size
  };
}

function validateCanvasDesignQa(playbooks) {
  const playbook = playbooks.find(item => item.id === 'canvas-design-qa');
  if (!playbook) {
    return;
  }
  const states = stateById(playbook);
  const requiredStates = [
    'known-reference',
    'capture-document',
    'capture-snapshot',
    'layout-diagnostics',
    'vision-judge',
    'repair-plan',
    'apply-operations',
    'verify',
    'ask-continue'
  ];
  for (const id of requiredStates) {
    if (!states.has(id)) {
      fail(`Canvas Design QA is missing state '${id}'`, playbook.sourceFile);
    }
  }
  const repairPlan = states.get('repair-plan');
  if (repairPlan?.type !== 'ai' || !repairPlan.agent || !repairPlan.outputSchema || repairPlan.outputMode !== 'json') {
    fail('Canvas Design QA repair-plan must be a structured AI state with agent and outputSchema', playbook.sourceFile);
  }
  const visionJudge = states.get('vision-judge');
  if (visionJudge?.guard !== 'system.vision.judge' || !visionJudge.saveAs) {
    fail('Canvas Design QA vision-judge must call system.vision.judge and save the result', playbook.sourceFile);
  }
  for (const id of ['capture-document', 'capture-snapshot', 'layout-diagnostics', 'vision-judge', 'apply-suggested-operations', 'apply-operations', 'verify']) {
    const args = states.get(id)?.args || {};
    if (args.uri !== '${input.uri}') {
      fail(`Canvas Design QA state '${id}' must pass input.uri to Canvas tools`, playbook.sourceFile);
    }
  }
  if (visionJudge.args?.visionJudgeMode !== '${input.visionJudgeMode}' || states.get('verify')?.args?.visionJudgeMode !== '${input.visionJudgeMode}') {
    fail('Canvas Design QA must pass input.visionJudgeMode to Vision Judge and verification for deterministic real-editor runs', playbook.sourceFile);
  }
  const done = states.get('done');
  if (done?.type !== 'response' || !String(done.prompt || done.template || '').includes('## Canvas Design QA')) {
    fail('Canvas Design QA final response must render a clear QA report', playbook.sourceFile);
  }
  const askContinue = states.get('ask-continue');
  if (askContinue?.type !== 'ask' || !asArray(askContinue.options).some(option => option.next === 'capture-document')) {
    fail('Canvas Design QA ask-continue must offer a repair loop back to capture-document', playbook.sourceFile);
  }
}

function validateForbiddenProductNames(catalog) {
  for (const item of [...catalog.agents, ...catalog.tools, ...catalog.playbooks, ...catalog.marketplace]) {
    const haystack = [
      item.name,
      item.description,
      item.category,
      ...(Array.isArray(item.tags) ? item.tags : [])
    ].filter(Boolean).join(' ');
    if (/\bAgency Agents\b/.test(haystack)) {
      fail(`Catalog item '${item.id}' uses forbidden UI name "Agency Agents"`, item.sourceFile);
    }
    if (/\bOpenPencil\b/.test(haystack)) {
      fail(`Catalog item '${item.id}' uses forbidden UI product name "OpenPencil"`, item.sourceFile);
    }
  }
  if (fs.existsSync(toolRegistrySource)) {
    const toolRegistry = fs.readFileSync(toolRegistrySource, 'utf8');
    if (toolRegistry.includes('OpenPencil design command service is not available.')) {
      fail('Canvas-facing runtime errors must not expose OpenPencil as a product name');
    }
    if (!toolRegistry.includes('Canvas design command service is not available.')) {
      fail('Canvas tool registry must report missing design service using Canvas product naming');
    }
    for (const expected of [
      'runDeterministicVisionJudge',
      'createCanvasDiagnosticRepairOperations',
      'createCanvasFooterOperation'
    ]) {
      if (!toolRegistry.includes(expected)) {
        fail(`Canvas tool registry is missing deterministic QA helper '${expected}'`);
      }
    }
  }
}

function validateMarketplace(catalog, idsByKind) {
  const collections = new Set(catalog.marketplace.map(item => item.collection));
  for (const collection of requiredMarketplaceCollections) {
    if (!collections.has(collection)) {
      fail(`Required marketplace collection missing: ${collection}`);
    }
  }
  for (const item of catalog.marketplace) {
    if (!item.id || !item.name || !item.collection) {
      fail('Marketplace item must define id, name, and collection', item);
      continue;
    }
    const target = item.installTarget;
    if (!target) {
      continue;
    }
    const ids = idsByKind[target.kind];
    if (ids && !ids.has(target.id)) {
      fail(`Marketplace item '${item.id}' points to missing ${target.kind} '${target.id}'`, item.sourceFile);
    }
  }
}

function validateMarketplaceInstallAutomation() {
  if (!fs.existsSync(agencyAgentServiceSource)) {
    fail('Agency agent service source is missing for marketplace automation validation');
    return;
  }
  const source = fs.readFileSync(agencyAgentServiceSource, 'utf8');
  for (const snippet of [
    'installNonCatalogMarketplaceItem',
    'installedNonCatalogMarketplaceItemIds',
    'marketplaceInstalls',
    "case 'skills'",
    "case 'flows'",
    "case 'canvas-qa-packs'"
  ]) {
    if (!source.includes(snippet)) {
      fail(`Marketplace install automation is missing '${snippet}'`);
    }
  }
  if (/not yet automated/.test(source)) {
    fail('Marketplace install automation must not leave non-catalog installs as "not yet automated"');
  }
}

function readSchema(name) {
  const file = path.join(schemaRoot, name);
  if (!fs.existsSync(file)) {
    fail(`Required schema missing: ${name}`);
    return {};
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function enumValuesAt(schema, pathParts) {
  let current = schema;
  for (const part of pathParts) {
    current = current?.[part];
  }
  return asArray(current?.enum);
}

function validateSchemas() {
  const playbookSchema = readSchema('cybervinci-playbook.schema.json');
  const toolSchema = readSchema('cybervinci-tool.schema.json');
  const agentSchema = readSchema('cybervinci-agent.schema.json');
  const stateTypeEnum = new Set(enumValuesAt(playbookSchema, ['properties', 'states', 'items', 'properties', 'type']));
  for (const type of knownPlaybookStateTypes) {
    if (!stateTypeEnum.has(type)) {
      fail(`Playbook schema is missing state type '${type}'`);
    }
  }
  const stateProperties = playbookSchema?.properties?.states?.items?.properties ?? {};
  for (const property of ['provider', 'flowId', 'mode', 'workflowId', 'preferSaved', 'authoringDraft', 'route', 'text', 'options', 'cases', 'default']) {
    if (!stateProperties[property]) {
      fail(`Playbook schema is missing V2 state property '${property}'`);
    }
  }
  const toolKinds = new Set(enumValuesAt(toolSchema, ['properties', 'kind']));
  for (const kind of ['tool', 'guard', 'action', 'query', 'effect', 'ai', 'flow', 'ui']) {
    if (!toolKinds.has(kind)) {
      fail(`Tool schema is missing kind '${kind}'`);
    }
  }
  const agentKinds = new Set(enumValuesAt(agentSchema, ['properties', 'kind']));
  for (const kind of ['native', 'delegate', 'prompt', 'markdown', 'flow', 'external', 'profile']) {
    if (!agentKinds.has(kind)) {
      fail(`Agent schema is missing kind '${kind}'`);
    }
  }
  const migrationStatus = agentSchema?.properties?.migrationStatus;
  const migrationStrategies = new Set(enumValuesAt(agentSchema, ['properties', 'migrationStatus', 'properties', 'strategy']));
  for (const strategy of ['playbook-overlay-native-delegate', 'playbook-autonomous-preferred-native-fallback', 'playbook-autonomous']) {
    if (!migrationStrategies.has(strategy)) {
      fail(`Agent schema migrationStatus.strategy is missing '${strategy}'`);
    }
  }
  if (!asArray(migrationStatus?.required).includes('strategy')) {
    fail('Agent schema migrationStatus must require strategy when migrationStatus is present');
  }
  for (const property of ['autonomousPlaybook', 'nativeDelegate', 'nativeDelegateFallback']) {
    if (migrationStatus?.properties?.[property]?.type !== 'boolean') {
      fail(`Agent schema migrationStatus.${property} must be boolean`);
    }
  }
  for (const property of ['nativeDelegateTool', 'selectedPlaybook', 'sourceAgentId']) {
    if (migrationStatus?.properties?.[property]?.type !== 'string') {
      fail(`Agent schema migrationStatus.${property} must be string`);
    }
  }
  if (migrationStatus?.properties?.deterministicCoverage?.items?.type !== 'string') {
    fail('Agent schema migrationStatus.deterministicCoverage must be an array of strings');
  }
  const migrationReady = migrationStatus?.properties?.migrationReady?.properties ?? {};
  for (const property of ['editableUserCopy', 'capabilityProfile', 'replacementStillUsesNativeDelegate', 'fallbackStillUsesNativeDelegate']) {
    if (migrationReady[property]?.type !== 'boolean') {
      fail(`Agent schema migrationStatus.migrationReady.${property} must be boolean`);
    }
  }
  const capabilityProfile = agentSchema?.properties?.capabilityProfile?.properties ?? {};
  for (const property of ['tools', 'guards']) {
    if (capabilityProfile[property]?.items?.$ref !== '#/$defs/toolCapability') {
      fail(`Agent schema capabilityProfile.${property} must use the toolCapability item schema`);
    }
  }
  if (capabilityProfile.agentSpecificVariables?.items?.$ref !== '#/$defs/variableCapability') {
    fail('Agent schema capabilityProfile.agentSpecificVariables must use the variableCapability item schema');
  }
  if (capabilityProfile.promptSets?.items?.$ref !== '#/$defs/promptCapability') {
    fail('Agent schema capabilityProfile.promptSets must use the promptCapability item schema');
  }
}

function main() {
  if (!fs.existsSync(catalogRoot)) {
    fail(`Catalog root does not exist: ${catalogRoot}`);
    return;
  }
  const catalog = collectCatalog();
  assertUnique(catalog.tools, 'tool');
  assertUnique(catalog.playbooks, 'playbook');
  assertUnique(catalog.agents, 'agent');

  const toolIds = new Set(catalog.tools.map(tool => tool.id));
  const playbookIds = new Set(catalog.playbooks.map(playbook => playbook.id));
  const agentIds = new Set(catalog.agents.map(agent => agent.id));
  for (const id of requiredTools) {
    if (!toolIds.has(id)) {
      fail(`Required tool missing: ${id}`);
    }
  }
  for (const id of requiredPlaybooks) {
    if (!playbookIds.has(id)) {
      fail(`Required playbook missing: ${id}`);
    }
  }
  for (const tool of catalog.tools) {
    if (tool.source === 'user' && !String(tool.id).startsWith('user.')) {
      fail(`User tool '${tool.id}' must use user.* namespace`, tool.sourceFile);
    }
  }
  validateNativeAgents(catalog, playbookIds);
  for (const playbook of catalog.playbooks) {
    validatePlaybook(playbook, toolIds);
  }
  const hostImplementationSummary = validateHostToolImplementations(catalog);
  validateCompositeTools(catalog);
  validateFlowRoute(catalog.playbooks);
  validateMultiAgentDeliveryReview(catalog.playbooks);
  validateFlowRouteInputWiring();
  validateAskResumeRuntime();
  validateManagerSurfaces();
  validateCanvasDesignQa(catalog.playbooks);
  validateMarketplace(catalog, {
    agent: agentIds,
    tool: toolIds,
    playbook: playbookIds
  });
  validateMarketplaceInstallAutomation();
  validateSchemas();
  validateForbiddenProductNames(catalog);
  if (process.exitCode) {
    return;
  }
  console.log(JSON.stringify({
    ok: true,
    tools: catalog.tools.length,
    hostTools: hostImplementationSummary.hostToolCount,
    hostSwitchCases: hostImplementationSummary.hostSwitchCaseCount,
    playbooks: catalog.playbooks.length,
    agents: catalog.agents.length,
    marketplace: catalog.marketplace.length,
    realPlaybooksChecked: requiredPlaybooks
  }, null, 2));
}

main();
