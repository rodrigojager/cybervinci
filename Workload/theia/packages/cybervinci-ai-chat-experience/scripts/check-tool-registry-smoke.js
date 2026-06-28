#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const packageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageRoot, '..', '..', '..', '..');
const workloadRegistryModulePath = path.join(repoRoot, 'Workload', 'theia', 'packages', 'cybervinci-ai-chat-experience', 'lib', 'browser', 'cybervinci-tool-registry.js');
const localRegistryModulePath = path.join(packageRoot, 'lib', 'browser', 'cybervinci-tool-registry.js');
const isOverlayPackage = packageRoot.split(path.sep).includes('Modificacoes');
const registryModulePath = (isOverlayPackage
  ? [workloadRegistryModulePath, localRegistryModulePath]
  : [localRegistryModulePath, workloadRegistryModulePath]
).find(candidate => fs.existsSync(candidate));

function loadToolRegistryModule() {
  assert.ok(registryModulePath, 'Compiled cybervinci-tool-registry.js was not found. Run npm run compile in Workload/theia/packages/cybervinci-ai-chat-experience first.');
  const source = fs.readFileSync(registryModulePath, 'utf8');
  const module = { exports: {} };
  const noOpDecorator = () => () => undefined;
  const stubs = new Map([
    ['@cybervinci/flow/lib/common', {
      FLOW_AI_AUTHORING_SPEC_VERSION: 'flow.ai-authoring/v1',
      redactFlowSecretsValue: value => value
    }],
    ['@cybervinci/memory/lib/common', {}],
    ['@cybervinci/ai-runtime/lib/common', {}],
    ['@cybervinci/ai-runtime/lib/browser/ai-runtime-frontend-service', {}],
    ['@cybervinci/ai-providers/lib/common', {}],
    ['@theia/ai-chat/lib/common', {}],
    ['@theia/ai-chat/lib/common/chat-model', {
      MarkdownChatResponseContentImpl: class MarkdownChatResponseContentImpl {
        constructor(content) { this.content = content; }
      }
    }],
    ['@theia/ai-core', {
      ToolInvocationContext: {
        create: toolCallId => ({ toolCallId })
      }
    }],
    ['@theia/ai-mcp/lib/common/mcp-server-manager', {}],
    ['@theia/ai-mcp/lib/common/mcp-preferences', { MCP_SERVERS_PREF: 'ai.mcp.servers' }],
    ['@cybervinci/openpencil-extension/lib/browser/openpencil-design-command-service', {}],
    ['@cybervinci/openpencil-extension/lib/common/openpencil-types', {}],
    ['@theia/core/lib/browser', {}],
    ['@theia/core', {}],
    ['@theia/core/lib/common/quick-pick-service', {}],
    ['@theia/core/lib/common', { PreferenceScope: { User: 0 } }],
    ['@theia/core/lib/common/file-uri', { FileUri: { fsPath: value => String(value) } }],
    ['@theia/core/lib/common/preferences', {}],
    ['@theia/core/lib/common/uri', {
      default: class URI {
        constructor(value) { this.value = value; }
        toString() { return String(this.value); }
      }
    }],
    ['@theia/workspace/lib/browser', {}],
    ['@theia/core/shared/inversify', {
      inject: noOpDecorator,
      injectable: noOpDecorator,
      optional: noOpDecorator
    }],
    ['../common', {}],
    ['./cybervinci-ai-chat-experience-preferences', {
      CYBERVINCI_AI_CHAT_VISION_JUDGE_ENABLED_PREF: 'cybervinci.aiChat.visionJudge.enabled',
      CYBERVINCI_AI_CHAT_VISION_JUDGE_MODEL_PREF: 'cybervinci.aiChat.visionJudge.model',
      CYBERVINCI_AI_CHAT_VISION_JUDGE_PROVIDER_PREF: 'cybervinci.aiChat.visionJudge.provider'
    }]
  ]);
  const localRequire = request => stubs.has(request) ? stubs.get(request) : require(request);
  const wrapped = `(function (exports, require, module, __filename, __dirname) {\n${source}\n})`;
  const compiled = vm.runInThisContext(wrapped, { filename: registryModulePath });
  compiled(module.exports, localRequire, module, registryModulePath, path.dirname(registryModulePath));
  return module.exports;
}

async function main() {
  const { CyberVinciToolRegistry } = loadToolRegistryModule();
  const tools = [
    {
      id: 'test.composite',
      name: 'Composite Tool Smoke',
      kind: 'guard',
      implementation: 'composite',
      steps: [
        {
          id: 'first',
          tool: 'test.first',
          args: { promptEcho: '${input.prompt}' },
          saveAs: 'firstResult'
        },
        {
          id: 'second',
          tool: 'test.second',
          args: { markerEcho: '${state.firstResult.marker}' },
          saveAs: 'secondResult'
        }
      ]
    },
    {
      id: 'test.composite.soft-fail',
      name: 'Composite Tool Soft Fail Smoke',
      kind: 'guard',
      implementation: 'composite',
      steps: [
        { id: 'first', tool: 'test.first', saveAs: 'firstResult' },
        { id: 'planned-failure', tool: 'test.fail', saveAs: 'failureResult', stopOnFail: false },
        { id: 'second', tool: 'test.second', saveAs: 'secondResult' }
      ]
    },
    {
      id: 'test.composite.hard-fail',
      name: 'Composite Tool Hard Fail Smoke',
      kind: 'guard',
      implementation: 'composite',
      steps: [
        { id: 'planned-failure', tool: 'test.fail' },
        { id: 'unreached', tool: 'test.second' }
      ]
    },
    { id: 'test.first', name: 'First Host Stub', implementation: 'host' },
    { id: 'test.second', name: 'Second Host Stub', implementation: 'host' },
    { id: 'test.fail', name: 'Fail Host Stub', implementation: 'host' },
    { id: 'test.approval', name: 'Approval Host Stub', implementation: 'host', policy: { approval: 'always' } },
    { id: 'core.agent.describe', name: 'Describe Agent Runtime', implementation: 'host' },
    { id: 'core.agent.preflight', name: 'Agent Preflight', implementation: 'host' },
    { id: 'system.agent.nativeMcpRequirements', name: 'Native Agent MCP Requirements', implementation: 'host' },
    { id: 'core.playbook.list', name: 'List Playbooks', implementation: 'host' },
    { id: 'core.playbook.run', name: 'Run Playbook', implementation: 'host' },
    { id: 'core.playbook.resume', name: 'Resume Playbook Run', implementation: 'host' },
    { id: 'core.playbook.compileToFlowDraft', name: 'Compile Playbook To Flow Draft', implementation: 'host' },
    { id: 'core.playbook.createFlowFromPlaybook', name: 'Create Flow From Playbook', implementation: 'host' },
    { id: 'core.flow.listWorkflows', name: 'List Flow Workflows', implementation: 'host' },
    { id: 'core.flow.startRun', name: 'Start Saved Flow', implementation: 'host' },
    { id: 'core.flow.runDynamicWorkflow', name: 'Run Dynamic Workflow', implementation: 'host' },
    { id: 'core.flow.runAiAuthoringDraft', name: 'Run AI Authored Flow', implementation: 'host' },
    { id: 'core.flow.runAiAuthoredDynamicWorkflow', name: 'Run AI-Authored Dynamic Workflow', implementation: 'host' },
    { id: 'core.flow.createWorkflowFromAiAuthoringDraft', name: 'Create Flow From AI Authoring Draft', implementation: 'host' },
    { id: 'core.flow.getAiAuthoringSpec', name: 'Get Flow AI Authoring Spec', implementation: 'host' },
    { id: 'core.memory.searchContext', name: 'Search Memory Context', implementation: 'host' },
    { id: 'core.memory.proposeCandidate', name: 'Propose Memory Candidate', implementation: 'host' },
    { id: 'core.memory.requestWriteApproval', name: 'Request Memory Write Approval', implementation: 'host' },
    { id: 'core.memory.writeApproved', name: 'Write Approved Memory', implementation: 'host' },
    { id: 'system.canvas.captureCurrentDocument', name: 'Capture Canvas Document', implementation: 'host' },
    { id: 'system.canvas.captureScreenshot', name: 'Capture Canvas Screenshot', implementation: 'host' },
    { id: 'system.canvas.collectLayoutDiagnostics', name: 'Collect Canvas Layout Diagnostics', implementation: 'host' },
    { id: 'system.canvas.detectOverlaps', name: 'Detect Canvas Overlaps', implementation: 'host' },
    { id: 'system.canvas.detectTextOverflow', name: 'Detect Canvas Text Overflow', implementation: 'host' },
    { id: 'system.canvas.validateFooterPresence', name: 'Validate Canvas Footer Presence', implementation: 'host' },
    { id: 'system.canvas.validateCloneCompleteness', name: 'Validate Canvas Clone Completeness', implementation: 'host' },
    { id: 'system.canvas.resizeToFit', name: 'Resize Canvas Nodes To Fit', implementation: 'host' },
    { id: 'system.canvas.applyOperations', name: 'Apply Canvas Operations', implementation: 'host' },
    { id: 'system.canvas.getReferenceFromKnownSite', name: 'Get Known Site Reference', implementation: 'host' },
    { id: 'system.vision.judge', name: 'Vision Judge', implementation: 'host' }
  ];
  const flowCalls = [];
  const visionRunRequests = [];
  const memoryCalls = [];
  const playbookCalls = [];
  const preferenceValues = new Map();
  globalThis.btoa = globalThis.btoa || (value => Buffer.from(value, 'binary').toString('base64'));

  const registry = new CyberVinciToolRegistry();
  const smokePlaybook = {
    version: 'cybervinci.playbook/v1',
    id: 'smoke-playbook',
    name: 'Smoke Playbook',
    description: 'Playbook used by the host tool registry smoke test.',
    entry: 'start',
    states: [
      { id: 'start', type: 'start', transitions: [{ to: 'respond' }] },
      { id: 'respond', type: 'response', text: 'Smoke response.', transitions: [{ to: 'done' }] },
      { id: 'done', type: 'end' }
    ]
  };
  const nativeDelegatePlaybook = {
    version: 'cybervinci.playbook/v1',
    id: 'native-agent-delegate',
    name: 'Legacy Native Agent Delegate Placeholder',
    enabled: false,
    entry: 'disabled',
    states: [{ id: 'disabled', type: 'response', text: 'Legacy native delegate is disabled.' }]
  };
  const createAutonomousNativeAgentFixture = ({ id, name, iconClass, tags, description, coverage, mcpPromptRefs = [] }) => ({
    version: 'cybervinci.agent/v1',
    id,
    name,
    kind: 'native',
    sourceAgentId: id,
    defaultPlaybook: `native-agent.${id}`,
    playbooks: [`native-agent.${id}`],
    iconClass,
    tags,
    description,
    tools: ['core.agent.describe', 'core.agent.preflight', 'system.agent.nativeMcpRequirements'],
    capabilityProfile: { mcpPromptRefs },
    migrationStatus: {
      strategy: 'playbook-autonomous',
      autonomousPlaybook: true,
      nativeDelegate: false,
      nativeDelegateFallback: false,
      selectedPlaybook: `native-agent.${id}`,
      sourceAgentId: id,
      deterministicCoverage: [
        'agent.describe',
        'agent.preflight',
        'agent.nativeMcpRequirements',
        ...(mcpPromptRefs.length ? ['mcp.configureOrStartDecision'] : []),
        coverage
      ],
      migrationReady: {
        editableUserCopy: true,
        capabilityProfile: true,
        replacementStillUsesNativeDelegate: false,
        fallbackStillUsesNativeDelegate: false
      }
    },
    preserveNative: { invoke: false, modes: true, prompts: true, variables: true, functions: true, languageModelRequirements: true }
  });
  const nativeCatalogAgents = [
    createAutonomousNativeAgentFixture({
      id: 'OpenCoder',
      name: 'CyberVinci',
      iconClass: 'codicon codicon-hubot',
      tags: ['Chat', 'Coding', 'Workspace', 'Provider Runtime'],
      description: 'Provider-neutral coding agent with CyberVinci AI Providers runtime, file changes, sandbox controls, and validation workflows.',
      coverage: 'ai.autonomousResponse'
    }),
    createAutonomousNativeAgentFixture({
      id: 'Coder',
      name: 'Coder',
      iconClass: 'codicon codicon-code',
      tags: ['Chat', 'Coding', 'Workspace'],
      description: 'Software-development chat agent that can inspect workspace files and suggest file changes.',
      coverage: 'ai.autonomousResponse'
    }),
    createAutonomousNativeAgentFixture({
      id: 'Architect',
      name: 'Architect',
      iconClass: 'codicon codicon-map',
      tags: ['Chat', 'Planning', 'Workspace'],
      description: 'Planning and project-understanding agent for codebase questions and implementation plans.',
      coverage: 'ai.autonomousResponse'
    }),
    {
      version: 'cybervinci.agent/v1',
      id: 'GitHub',
      name: 'GitHub',
      kind: 'native',
      sourceAgentId: 'GitHub',
      defaultPlaybook: 'native-agent.GitHub',
      playbooks: ['native-agent.GitHub'],
      tools: ['core.agent.describe', 'core.agent.preflight', 'system.agent.nativeMcpRequirements'],
      capabilityProfile: { mcpPromptRefs: ['mcp_github_tools'] },
      migrationStatus: {
        strategy: 'playbook-autonomous',
        autonomousPlaybook: true,
        nativeDelegate: false,
        nativeDelegateFallback: false,
        selectedPlaybook: 'native-agent.GitHub',
        sourceAgentId: 'GitHub',
        deterministicCoverage: [
          'agent.describe',
          'agent.preflight',
          'agent.nativeMcpRequirements',
          'mcp.configureOrStartDecision',
          'ai.autonomousResponse'
        ],
        migrationReady: {
          editableUserCopy: true,
          capabilityProfile: true,
          replacementStillUsesNativeDelegate: false,
          fallbackStillUsesNativeDelegate: false
        }
      },
      preserveNative: { invoke: false, modes: true, prompts: true, variables: true, functions: true, languageModelRequirements: true }
    },
    {
      version: 'cybervinci.agent/v1',
      id: 'pr-reviewer',
      name: 'PR Reviewer',
      kind: 'native',
      sourceAgentId: 'pr-reviewer',
      defaultPlaybook: 'native-agent.pr-reviewer',
      playbooks: ['native-agent.pr-reviewer'],
      tools: ['core.agent.describe', 'core.agent.preflight', 'system.agent.nativeMcpRequirements'],
      capabilityProfile: { mcpPromptRefs: ['mcp_github_tools'] },
      migrationStatus: {
        strategy: 'playbook-autonomous',
        autonomousPlaybook: true,
        nativeDelegate: false,
        nativeDelegateFallback: false,
        selectedPlaybook: 'native-agent.pr-reviewer',
        sourceAgentId: 'pr-reviewer',
        deterministicCoverage: [
          'agent.describe',
          'agent.preflight',
          'agent.nativeMcpRequirements',
          'mcp.configureOrStartDecision',
          'ai.autonomousResponse'
        ],
        migrationReady: {
          editableUserCopy: true,
          capabilityProfile: true,
          replacementStillUsesNativeDelegate: false,
          fallbackStillUsesNativeDelegate: false
        }
      },
      preserveNative: { invoke: false, modes: true, prompts: true, variables: true, functions: true, languageModelRequirements: true }
    },
    {
      version: 'cybervinci.agent/v1',
      id: 'ProjectInfo',
      name: 'ProjectInfo',
      kind: 'native',
      sourceAgentId: 'ProjectInfo',
      defaultPlaybook: 'native-agent.ProjectInfo',
      playbooks: ['native-agent.ProjectInfo'],
      tools: ['core.agent.describe', 'core.agent.preflight', 'system.agent.nativeMcpRequirements'],
      capabilityProfile: { mcpPromptRefs: [] },
      migrationStatus: {
        strategy: 'playbook-autonomous',
        autonomousPlaybook: true,
        nativeDelegate: false,
        nativeDelegateFallback: false,
        selectedPlaybook: 'native-agent.ProjectInfo',
        sourceAgentId: 'ProjectInfo',
        deterministicCoverage: [
          'agent.describe',
          'agent.preflight',
          'agent.nativeMcpRequirements',
          'ai.autonomousResponse'
        ],
        migrationReady: {
          editableUserCopy: true,
          capabilityProfile: true,
          replacementStillUsesNativeDelegate: false,
          fallbackStillUsesNativeDelegate: false
        }
      },
      preserveNative: { invoke: false, modes: true, prompts: true, variables: true, functions: true, languageModelRequirements: true }
    },
    {
      version: 'cybervinci.agent/v1',
      id: 'Universal',
      name: 'Universal',
      kind: 'native',
      sourceAgentId: 'Universal',
      defaultPlaybook: 'native-agent.Universal',
      playbooks: ['native-agent.Universal'],
      tools: ['core.agent.describe', 'core.agent.preflight', 'system.agent.nativeMcpRequirements'],
      capabilityProfile: { mcpPromptRefs: [] },
      migrationStatus: {
        strategy: 'playbook-autonomous',
        autonomousPlaybook: true,
        nativeDelegate: false,
        nativeDelegateFallback: false,
        selectedPlaybook: 'native-agent.Universal',
        sourceAgentId: 'Universal',
        deterministicCoverage: [
          'agent.describe',
          'agent.preflight',
          'agent.nativeMcpRequirements',
          'ai.autonomousResponse'
        ],
        migrationReady: {
          editableUserCopy: true,
          capabilityProfile: true,
          replacementStillUsesNativeDelegate: false,
          fallbackStillUsesNativeDelegate: false
        }
      },
      preserveNative: { invoke: false, modes: true, prompts: true, variables: true, functions: true, languageModelRequirements: true }
    },
    {
      version: 'cybervinci.agent/v1',
      id: 'AppTester',
      name: 'AppTester',
      kind: 'native',
      sourceAgentId: 'AppTester',
      defaultPlaybook: 'native-agent.AppTester',
      playbooks: ['native-agent.AppTester'],
      tools: ['core.agent.describe', 'core.agent.preflight', 'system.agent.nativeMcpRequirements'],
      capabilityProfile: {
        mcpPromptRefs: ['mcp_chrome-devtools_tools', 'mcp_playwright_tools', 'mcp_playwright-visual_tools']
      },
      migrationStatus: {
        strategy: 'playbook-autonomous',
        autonomousPlaybook: true,
        nativeDelegate: false,
        nativeDelegateFallback: false,
        selectedPlaybook: 'native-agent.AppTester',
        sourceAgentId: 'AppTester',
        deterministicCoverage: [
          'agent.describe',
          'agent.preflight',
          'agent.nativeMcpRequirements',
          'mcp.configureOrStartDecision',
          'ai.autonomousResponse'
        ],
        migrationReady: {
          editableUserCopy: true,
          capabilityProfile: true,
          replacementStillUsesNativeDelegate: false,
          fallbackStillUsesNativeDelegate: false
        }
      },
      preserveNative: { invoke: false, modes: true, prompts: true, variables: true, functions: true, languageModelRequirements: true }
    },
    {
      version: 'cybervinci.agent/v1',
      id: 'code-reviewer',
      name: 'Code Reviewer',
      kind: 'native',
      sourceAgentId: 'code-reviewer',
      defaultPlaybook: 'native-agent.code-reviewer',
      playbooks: ['native-agent.code-reviewer'],
      tools: ['core.agent.describe', 'core.agent.preflight', 'system.agent.nativeMcpRequirements'],
      capabilityProfile: { mcpPromptRefs: [] },
      migrationStatus: {
        strategy: 'playbook-autonomous',
        autonomousPlaybook: true,
        nativeDelegate: false,
        nativeDelegateFallback: false,
        selectedPlaybook: 'native-agent.code-reviewer',
        sourceAgentId: 'code-reviewer',
        deterministicCoverage: [
          'agent.describe',
          'agent.preflight',
          'agent.nativeMcpRequirements',
          'ai.autonomousResponse'
        ],
        migrationReady: {
          editableUserCopy: true,
          capabilityProfile: true,
          replacementStillUsesNativeDelegate: false,
          fallbackStillUsesNativeDelegate: false
        }
      },
      preserveNative: { invoke: false, modes: true, prompts: true, variables: true, functions: true, languageModelRequirements: true }
    },
    {
      version: 'cybervinci.agent/v1',
      id: 'explore',
      name: 'Explore',
      kind: 'native',
      sourceAgentId: 'explore',
      defaultPlaybook: 'native-agent.explore',
      playbooks: ['native-agent.explore'],
      tools: ['core.agent.describe', 'core.agent.preflight', 'system.agent.nativeMcpRequirements'],
      capabilityProfile: { mcpPromptRefs: [] },
      migrationStatus: {
        strategy: 'playbook-autonomous',
        autonomousPlaybook: true,
        nativeDelegate: false,
        nativeDelegateFallback: false,
        selectedPlaybook: 'native-agent.explore',
        sourceAgentId: 'explore',
        deterministicCoverage: [
          'agent.describe',
          'agent.preflight',
          'agent.nativeMcpRequirements',
          'ai.autonomousResponse'
        ],
        migrationReady: {
          editableUserCopy: true,
          capabilityProfile: true,
          replacementStillUsesNativeDelegate: false,
          fallbackStillUsesNativeDelegate: false
        }
      },
      preserveNative: { invoke: false, modes: true, prompts: true, variables: true, functions: true, languageModelRequirements: true }
    },
    {
      ...createAutonomousNativeAgentFixture({
        id: 'CreateSkill',
        name: 'CreateSkill',
        iconClass: 'codicon codicon-tools',
        tags: ['Chat', 'Skills'],
        description: 'Skill creation agent for authoring reusable AI workflow instructions.',
        coverage: 'ai.autonomousResponse'
      })
    },
    {
      ...createAutonomousNativeAgentFixture({
        id: 'Orchestrator',
        name: 'Orchestrator',
        iconClass: 'codicon codicon-organization',
        tags: ['Chat', 'Delegation'],
        description: 'Routing agent that delegates to other chat agents.',
        coverage: 'ai.autonomousResponse'
      })
    },
    {
      version: 'cybervinci.agent/v1',
      id: 'Command',
      name: 'Command',
      kind: 'native',
      sourceAgentId: 'Command',
      defaultPlaybook: 'native-agent.Command',
      playbooks: ['native-agent.Command'],
      tools: ['core.agent.describe', 'core.agent.preflight', 'system.agent.nativeMcpRequirements'],
      capabilityProfile: { mcpPromptRefs: [] },
      migrationStatus: {
        strategy: 'playbook-autonomous',
        autonomousPlaybook: true,
        nativeDelegate: false,
        nativeDelegateFallback: false,
        selectedPlaybook: 'native-agent.Command',
        sourceAgentId: 'Command',
        deterministicCoverage: [
          'agent.describe',
          'agent.preflight',
          'agent.nativeMcpRequirements',
          'ai.autonomousResponse'
        ],
        migrationReady: {
          editableUserCopy: true,
          capabilityProfile: true,
          replacementStillUsesNativeDelegate: false,
          fallbackStillUsesNativeDelegate: false
        }
      },
      preserveNative: { invoke: false, modes: true, prompts: true, variables: true, functions: true, languageModelRequirements: true }
    }
  ];
  registry.service = {
    listTools: async () => tools,
    listPlaybooks: async () => [nativeDelegatePlaybook, smokePlaybook],
    getDeclarativeChatAgentManifest: async () => ({ agents: nativeCatalogAgents }),
    getPlaybook: async id => {
      if (id === nativeDelegatePlaybook.id) {
        return nativeDelegatePlaybook;
      }
      if (id === smokePlaybook.id) {
        return smokePlaybook;
      }
      return undefined;
    }
  };
  registry.setPlaybookRunner(async (playbookId, context) => {
    playbookCalls.push({ method: 'run', playbookId, context });
    return {
      ok: true,
      stop: true,
      value: { playbookId, prompt: context.input.prompt },
      message: `Ran ${playbookId}.`
    };
  });
  registry.setPlaybookResumer(async (requestId, context) => {
    playbookCalls.push({ method: 'resume', requestId, context });
    return {
      ok: true,
      stop: true,
      value: { requestId },
      message: `Resumed ${requestId}.`
    };
  });
  registry.quickPickService = undefined;
  registry.preferenceService = {
    get: (key, defaultValue) => preferenceValues.has(key) ? preferenceValues.get(key) : defaultValue,
    set: async (key, value) => {
      if (value === undefined) {
        preferenceValues.delete(key);
      } else {
        preferenceValues.set(key, value);
      }
    }
  };
  registry.chatAgentService = {
    getAllAgents: () => [{
      id: 'Codex',
      name: 'Codex',
      description: "OpenAI's coding assistant powered by Codex",
      iconClass: 'codicon codicon-terminal',
      tags: ['Coding', 'Runtime'],
      variables: ['workspaceRoot'],
      functions: ['codex.runtime.tool'],
      modes: [{ id: 'chat', name: 'Chat', isDefault: true }],
      languageModelRequirements: [{ purpose: 'chat', identifier: 'gpt-5.5', name: 'gpt-5.5' }]
    }]
  };
  registry.toolInvocationRegistry = {
    getAllFunctions: () => [{
      id: 'codex.runtime.tool',
      name: 'Codex Runtime Tool',
      providerName: 'runtime-smoke',
      description: 'Runtime smoke function exposed by the Codex native agent.'
    }],
    getFunction: id => id === 'codex.runtime.tool'
      ? { id, name: 'Codex Runtime Tool', providerName: 'runtime-smoke', description: 'Runtime smoke function exposed by the Codex native agent.', handler: async () => ({ content: [] }) }
      : undefined
  };
  registry.flowService = {
    listWorkflows: async input => {
      flowCalls.push({ method: 'listWorkflows', input });
      return [{
        id: 'flow.saved.demo',
        name: 'Saved Demo Flow',
        description: 'Existing saved workflow for smoke tests.',
        states: { start: { id: 'start' } },
        transitions: [],
        file: { editable: true }
      }];
    },
    startRun: async input => {
      flowCalls.push({ method: 'startRun', input });
      return { id: 'run-saved-flow', workflowId: input.workflowId, prompt: input.prompt };
    },
    runDynamicWorkflow: async input => {
      flowCalls.push({ method: 'runDynamicWorkflow', input });
      return {
        id: input.authoringDraft ? 'run-ai-authored-flow' : 'run-dynamic-flow',
        prompt: input.prompt,
        preferSaved: input.preferSaved,
        authoringDraft: input.authoringDraft
      };
    },
    createWorkflowFromAiAuthoringDraft: async input => {
      flowCalls.push({ method: 'createWorkflowFromAiAuthoringDraft', input });
      return { id: 'workflow-from-draft', draftAction: input.draft.action };
    },
    getAiAuthoringSpec: async () => {
      flowCalls.push({ method: 'getAiAuthoringSpec' });
      return {
        version: 'flow.ai-authoring/v1',
        systemPrompt: 'Author a Flow workflow from the user prompt.',
        outputSchema: {
          type: 'object',
          required: ['version', 'action'],
          properties: {
            version: { const: 'flow.ai-authoring/v1' },
            action: { type: 'string' }
          }
        }
      };
    },
    listWorkflowPatterns: async () => {
      flowCalls.push({ method: 'listWorkflowPatterns' });
      return [];
    },
    listModelProfiles: async () => {
      flowCalls.push({ method: 'listModelProfiles' });
      return [];
    },
    listPipelinePresets: async input => {
      flowCalls.push({ method: 'listPipelinePresets', input });
      return [];
    },
    getCapabilities: async () => {
      flowCalls.push({ method: 'getCapabilities' });
      return { aiAuthoring: true };
    }
  };
  registry.aiRuntime = {
    getDefaultExecution: async input => {
      flowCalls.push({ method: 'getDefaultExecution', input });
      return {
        providerId: 'openrouter',
        model: 'gpt-5.5',
        runtime: 'direct-api',
        modelProvider: 'openrouter'
      };
    },
    listProviders: async input => {
      flowCalls.push({ method: 'listProviders', input });
      return [{
        id: 'openrouter',
        label: 'OpenRouter',
        runtime: 'direct-api',
        modelProvider: 'openrouter',
        available: true,
        models: ['gpt-5.5'],
        modelMetadata: [{ id: 'gpt-5.5' }]
      }, {
        id: 'codex-app-server:codex',
        label: 'Codex CLI',
        runtime: 'codex-app-server',
        modelProvider: 'codex',
        available: true,
        models: ['gpt-5.5'],
        modelMetadata: [{ id: 'gpt-5.5' }]
      }];
    },
    runTask: async request => {
      flowCalls.push({ method: 'runTask', request });
      assert.equal(request.surfaceId, 'ai-chat');
      if (request.action === 'vision.judge') {
        visionRunRequests.push(request);
        assert.equal(request.output.mode, 'json');
        assert.equal(request.output.schemaName, 'CyberVinciVisionJudgeResult');
        assert.equal(request.effectPolicy.previewOnly, true);
        assert.ok(request.input.reference);
        assert.ok(request.input.visualSnapshot);
        assert.ok(request.inputItems.some(item => item.type === 'image' && item.url.startsWith('data:image/svg+xml;base64,')));
        return {
          provider: { id: 'openrouter', label: 'OpenRouter' },
          execution: { model: 'gpt-5.5' },
          structured: {
            passed: false,
            score: 0.4,
            needsRepair: true,
            summary: 'Vision Judge found visible layout issues.',
            issues: [{ severity: 'warning', message: 'Search input/button area is visually broken.' }],
            suggestedOperations: [{ operation: 'updateNode', nodeId: 'search-button-card', changes: { width: 120, height: 36 } }]
          },
          diagnostics: ['vision diagnostic']
        };
      }
      assert.equal(request.action, 'flow.authorWorkflow');
      assert.equal(request.output.mode, 'json');
      assert.equal(request.output.schemaName, 'FlowAiAuthoringDraft');
      return {
        provider: { id: 'openrouter', label: 'OpenRouter' },
        execution: { model: 'gpt-5.5' },
        structured: {
          version: 'flow.ai-authoring/v1',
          action: 'create_workflow',
          reason: 'Smoke-authored workflow'
        },
        diagnostics: []
      };
    }
  };
  registry.memoryService = {
    search: async input => {
      memoryCalls.push({ method: 'search', input });
      return [{
        id: 'memory-result-1',
        score: 0.91,
        item: {
          title: 'Memory smoke result',
          content: 'Relevant CyberVinci Memory context.'
        }
      }];
    },
    buildContextPack: async input => {
      memoryCalls.push({ method: 'buildContextPack', input });
      return {
        content: 'Packed Memory context.',
        tokenEstimate: 42,
        items: input.retrievalResults
      };
    },
    proposeMemoryCandidate: async input => {
      memoryCalls.push({ method: 'proposeMemoryCandidate', input });
      return {
        candidates: [{
          title: 'Candidate smoke',
          content: input.text,
          memoryType: 'instruction'
        }],
        created: 0
      };
    },
    addMemory: async input => {
      memoryCalls.push({ method: 'addMemory', input });
      return {
        id: 'memory-written-1',
        title: input.title,
        content: input.content,
        scope: input.scope,
        workspacePath: input.workspacePath
      };
    }
  };
  const canvasUri = { toString: () => 'file:///workspace/design.op' };
  const canvasDocument = {
    name: 'Saara Amazon clone smoke',
    activePageId: 'page-1',
    pages: [{
      id: 'page-1',
      name: 'Page 1',
      width: 900,
      height: 620,
      children: [
        {
          id: 'search-input',
          name: 'Search input',
          type: 'text',
          x: 24,
          y: 40,
          width: 320,
          height: 30,
          content: 'Buscar produtos'
        },
        {
          id: 'search-button-card',
          name: 'Search button oversized card',
          type: 'rect',
          x: 80,
          y: 44,
          width: 280,
          height: 82,
          content: 'Botao de busca gigante'
        },
        {
          id: 'long-copy',
          name: 'Long cramped copy',
          type: 'text',
          x: 24,
          y: 150,
          width: 120,
          height: 18,
          content: 'Texto muito longo que nao cabe nessa area pequena e deve gerar overflow visual'
        },
        {
          id: 'product-card',
          name: 'Produto card',
          type: 'rect',
          x: 850,
          y: 220,
          width: 130,
          height: 90,
          content: 'Produto em oferta'
        }
      ]
    }]
  };
  const appliedOperations = [];
  const canvasSession = {
    uri: canvasUri,
    getDocument: () => canvasDocument,
    getSelection: () => ['search-button-card'],
    applyOperation: async operation => {
      appliedOperations.push(operation);
      return { changed: true, operation };
    }
  };
  registry.openPencilDesignCommandService = {
    getSession: uri => uri.toString() === canvasUri.toString() ? canvasSession : undefined,
    validateDocument: () => ({ issues: [] }),
    validateAiLayoutQuality: () => ({ issues: [] }),
    stabilizeAiOperationsForDocument: (_document, _selection, operations) => ({
      operations,
      diagnostics: ['operations stabilized'],
      skipped: 0,
      reordered: false,
      skippedOperations: []
    })
  };
  registry.shell = {
    currentWidget: {
      getResourceUri: () => canvasUri,
      node: {
        querySelector: selector => selector === 'svg'
          ? {
            getBoundingClientRect: () => ({ x: 0, y: 0, width: 900, height: 620 }),
            outerHTML: '<svg width="900" height="620"><text>Saara Amazon clone smoke</text></svg>'
          }
          : undefined
      }
    }
  };
  const executeHostTool = registry.executeHostTool.bind(registry);
  registry.executeHostTool = async (toolId, context) => {
    if (toolId === 'test.first') {
      return {
        ok: true,
        value: {
          marker: 'first-ok',
          promptEcho: context.input.promptEcho
        },
        message: 'first ok'
      };
    }
    if (toolId === 'test.second') {
      return {
        ok: true,
        value: {
          marker: 'second-ok',
          markerEcho: context.input.markerEcho,
          sawFirst: context.state.firstResult?.marker === 'first-ok'
        },
        message: 'second ok'
      };
    }
    if (toolId === 'test.fail') {
      return {
        ok: false,
        message: 'planned failure'
      };
    }
    if (toolId === 'test.approval') {
      return {
        ok: true,
        value: {
          approvedExecution: true
        },
        message: 'approval ok'
      };
    }
    return executeHostTool(toolId, context);
  };

  const state = {};
  const result = await registry.executeTool('test.composite', {
    requestId: 'tool-smoke',
    input: { prompt: 'hello composite' },
    state
  });
  assert.equal(result.ok, true);
  assert.equal(state.firstResult.marker, 'first-ok');
  assert.equal(state.firstResult.promptEcho, 'hello composite');
  assert.equal(state.secondResult.marker, 'second-ok');
  assert.equal(state.secondResult.markerEcho, 'first-ok');
  assert.equal(result.value.results.length, 2);

  const softFailState = {};
  const softFail = await registry.executeTool('test.composite.soft-fail', {
    requestId: 'tool-soft-fail-smoke',
    input: {},
    state: softFailState
  });
  assert.equal(softFail.ok, true);
  assert.equal(softFailState.failureResult, 'planned failure');
  assert.equal(softFailState.secondResult.sawFirst, true);
  assert.equal(softFail.value.results.length, 3);

  const hardFailState = {};
  const hardFail = await registry.executeTool('test.composite.hard-fail', {
    requestId: 'tool-hard-fail-smoke',
    input: {},
    state: hardFailState
  });
  assert.equal(hardFail.ok, false);
  assert.match(hardFail.message || '', /planned failure/);
  assert.equal(hardFail.value.results.length, 1);
  assert.equal(hardFailState.secondResult, undefined);

  const approvalWithoutUi = await registry.executeTool('test.approval', {
    requestId: 'approval-no-ui-smoke',
    playbookId: 'approval-playbook',
    stateId: 'approval-state',
    input: {},
    state: {}
  });
  assert.equal(approvalWithoutUi.ok, false);
  assert.equal(approvalWithoutUi.value.approvalRequired, true);
  assert.equal(approvalWithoutUi.value.toolId, 'test.approval');
  assert.match(approvalWithoutUi.message, /approval UI is not available/);

  registry.quickPickService = {
    show: async items => items.find(item => item.approved === false)
  };
  const rejectedApproval = await registry.executeTool('test.approval', {
    requestId: 'approval-rejected-smoke',
    input: {},
    state: {}
  });
  assert.equal(rejectedApproval.ok, false);
  assert.match(rejectedApproval.message, /was not approved/);

  registry.quickPickService = {
    show: async items => items.find(item => item.approved === true)
  };
  const approvedTool = await registry.executeTool('test.approval', {
    requestId: 'approval-approved-smoke',
    input: {},
    state: {}
  });
  assert.equal(approvedTool.ok, true);
  assert.equal(approvedTool.value.approvedExecution, true);
  registry.quickPickService = undefined;

  const memorySearch = await registry.executeTool('core.memory.searchContext', {
    requestId: 'memory-search-smoke',
    input: {
      workspaceRootUri: 'file:///workspace',
      query: 'CyberVinci Memory context',
      limit: 2,
      tokenBudget: 512
    },
    state: {}
  });
  assert.equal(memorySearch.ok, true);
  assert.equal(memorySearch.value.retrievalResults.length, 1);
  assert.equal(memorySearch.value.contextPack.content, 'Packed Memory context.');
  assert.equal(memoryCalls.some(call => call.method === 'search'), true);
  assert.equal(memoryCalls.some(call => call.method === 'buildContextPack'), true);

  const memoryCandidate = await registry.executeTool('core.memory.proposeCandidate', {
    requestId: 'memory-candidate-smoke',
    playbookId: 'memory-playbook',
    stateId: 'candidate-state',
    input: {
      workspaceRootUri: 'file:///workspace',
      text: 'Remember this deterministic workflow fact.',
      maxCandidates: 1
    },
    state: {}
  });
  assert.equal(memoryCandidate.ok, true);
  assert.equal(memoryCandidate.value.candidates.length, 1);
  assert.equal(memoryCalls.some(call => call.method === 'proposeMemoryCandidate'), true);

  const memoryWriteWithoutApproval = await registry.executeTool('core.memory.writeApproved', {
    requestId: 'memory-write-without-approval-smoke',
    input: {
      workspaceRootUri: 'file:///workspace',
      content: 'Should not write.'
    },
    state: {}
  });
  assert.equal(memoryWriteWithoutApproval.ok, false);
  assert.match(memoryWriteWithoutApproval.message, /approved=true/);

  const memoryApprovalWithoutUi = await registry.executeTool('core.memory.requestWriteApproval', {
    requestId: 'memory-approval-no-ui-smoke',
    input: {
      content: 'Needs approval.'
    },
    state: {}
  });
  assert.equal(memoryApprovalWithoutUi.ok, false);
  assert.equal(memoryApprovalWithoutUi.value.approvalRequired, true);

  registry.quickPickService = {
    show: async items => items.find(item => item.decision === 'reject')
  };
  const rejectedMemoryWrite = await registry.executeTool('core.memory.requestWriteApproval', {
    requestId: 'memory-approval-reject-smoke',
    input: {
      content: 'Reject this memory.'
    },
    state: {}
  });
  assert.equal(rejectedMemoryWrite.ok, true);
  assert.equal(rejectedMemoryWrite.value.status, 'rejected');

  registry.quickPickService = {
    show: async items => items.find(item => item.decision === 'approve')
  };
  const approvedMemoryWrite = await registry.executeTool('core.memory.requestWriteApproval', {
    requestId: 'memory-approval-approve-smoke',
    playbookId: 'memory-playbook',
    stateId: 'memory-state',
    input: {
      workspaceRootUri: 'file:///workspace',
      title: 'Memory smoke write',
      content: 'Approved Memory write.',
      scope: 'workspace'
    },
    state: {}
  });
  assert.equal(approvedMemoryWrite.ok, true);
  assert.equal(approvedMemoryWrite.value.title, 'Memory smoke write');
  assert.equal(memoryCalls.some(call => call.method === 'addMemory'), true);
  registry.quickPickService = undefined;

  const runtimeAgentDescribe = await registry.executeTool('core.agent.describe', {
    requestId: 'runtime-agent-describe-smoke',
    playbookId: 'native-agent.Codex',
    input: { agentId: 'Codex' },
    state: {}
  });
  assert.equal(runtimeAgentDescribe.ok, true);
  assert.equal(runtimeAgentDescribe.value.agent.id, 'Codex');
  assert.equal(runtimeAgentDescribe.value.agent.source, 'runtime');
  assert.equal(runtimeAgentDescribe.value.agent.defaultPlaybook, 'native-agent.Codex');
  assert.equal(runtimeAgentDescribe.value.agent.capabilityProfile.tools.some(tool => tool.id === 'core.agent.invoke'), false);
  assert.equal(runtimeAgentDescribe.value.agent.capabilityProfile.functions.includes('codex.runtime.tool'), true);
  assert.equal(runtimeAgentDescribe.value.agent.migrationStatus.strategy, 'playbook-autonomous');
  assert.equal(runtimeAgentDescribe.value.agent.migrationStatus.nativeDelegate, false);
  assert.equal(runtimeAgentDescribe.value.agent.migrationStatus.nativeDelegateFallback, false);
  assert.equal(runtimeAgentDescribe.value.agent.migrationStatus.migrationReady.editableUserCopy, true);
  const codexRuntimeToolCapability = runtimeAgentDescribe.value.agent.capabilityProfile.tools.find(tool => tool.id === 'codex.runtime.tool');
  assert.ok(codexRuntimeToolCapability, 'runtime Theia function must also be exposed as an agent tool capability');
  assert.equal(codexRuntimeToolCapability.source, 'theia');
  assert.equal(codexRuntimeToolCapability.required, true);
  assert.match(codexRuntimeToolCapability.description, /Runtime smoke function/);

  const githubAgentDescribe = await registry.executeTool('core.agent.describe', {
    requestId: 'github-agent-describe-smoke',
    playbookId: 'native-agent.GitHub',
    input: { agentId: 'GitHub' },
    state: {}
  });
  assert.equal(githubAgentDescribe.ok, true);
  assert.equal(githubAgentDescribe.value.agent.migrationStatus.strategy, 'playbook-autonomous');
  assert.equal(githubAgentDescribe.value.agent.migrationStatus.autonomousPlaybook, true);
  assert.equal(githubAgentDescribe.value.agent.migrationStatus.nativeDelegate, false);
  assert.equal(githubAgentDescribe.value.agent.migrationStatus.nativeDelegateFallback, false);
  assert.equal(githubAgentDescribe.value.agent.migrationStatus.selectedPlaybook, 'native-agent.GitHub');
  assert.equal(githubAgentDescribe.value.agent.migrationStatus.deterministicCoverage.includes('mcp.configureOrStartDecision'), true);
  assert.equal(githubAgentDescribe.value.agent.migrationStatus.deterministicCoverage.includes('ai.autonomousResponse'), true);

  const prReviewerAgentDescribe = await registry.executeTool('core.agent.describe', {
    requestId: 'pr-reviewer-agent-describe-smoke',
    playbookId: 'native-agent.pr-reviewer',
    input: { agentId: 'pr-reviewer' },
    state: {}
  });
  assert.equal(prReviewerAgentDescribe.ok, true);
  assert.equal(prReviewerAgentDescribe.value.agent.migrationStatus.strategy, 'playbook-autonomous');
  assert.equal(prReviewerAgentDescribe.value.agent.migrationStatus.autonomousPlaybook, true);
  assert.equal(prReviewerAgentDescribe.value.agent.migrationStatus.nativeDelegateFallback, false);
  assert.equal(prReviewerAgentDescribe.value.agent.migrationStatus.selectedPlaybook, 'native-agent.pr-reviewer');
  assert.equal(prReviewerAgentDescribe.value.agent.migrationStatus.deterministicCoverage.includes('ai.autonomousResponse'), true);

  const projectInfoAgentDescribe = await registry.executeTool('core.agent.describe', {
    requestId: 'project-info-agent-describe-smoke',
    playbookId: 'native-agent.ProjectInfo',
    input: { agentId: 'ProjectInfo' },
    state: {}
  });
  assert.equal(projectInfoAgentDescribe.ok, true);
  assert.equal(projectInfoAgentDescribe.value.agent.migrationStatus.strategy, 'playbook-autonomous');
  assert.equal(projectInfoAgentDescribe.value.agent.migrationStatus.autonomousPlaybook, true);
  assert.equal(projectInfoAgentDescribe.value.agent.migrationStatus.nativeDelegateFallback, false);
  assert.equal(projectInfoAgentDescribe.value.agent.migrationStatus.selectedPlaybook, 'native-agent.ProjectInfo');

  const universalAgentDescribe = await registry.executeTool('core.agent.describe', {
    requestId: 'universal-agent-describe-smoke',
    playbookId: 'native-agent.Universal',
    input: { agentId: 'Universal' },
    state: {}
  });
  assert.equal(universalAgentDescribe.ok, true);
  assert.equal(universalAgentDescribe.value.agent.migrationStatus.strategy, 'playbook-autonomous');
  assert.equal(universalAgentDescribe.value.agent.migrationStatus.autonomousPlaybook, true);
  assert.equal(universalAgentDescribe.value.agent.migrationStatus.nativeDelegateFallback, false);
  assert.equal(universalAgentDescribe.value.agent.migrationStatus.selectedPlaybook, 'native-agent.Universal');

  const appTesterAgentDescribe = await registry.executeTool('core.agent.describe', {
    requestId: 'app-tester-agent-describe-smoke',
    playbookId: 'native-agent.AppTester',
    input: { agentId: 'AppTester' },
    state: {}
  });
  assert.equal(appTesterAgentDescribe.ok, true);
  assert.equal(appTesterAgentDescribe.value.agent.migrationStatus.strategy, 'playbook-autonomous');
  assert.equal(appTesterAgentDescribe.value.agent.migrationStatus.autonomousPlaybook, true);
  assert.equal(appTesterAgentDescribe.value.agent.migrationStatus.nativeDelegateFallback, false);
  assert.equal(appTesterAgentDescribe.value.agent.migrationStatus.selectedPlaybook, 'native-agent.AppTester');
  assert.equal(appTesterAgentDescribe.value.agent.migrationStatus.deterministicCoverage.includes('ai.autonomousResponse'), true);

  for (const [agentId, playbookId, coverage] of [
    ['OpenCoder', 'native-agent.OpenCoder', 'ai.autonomousResponse'],
    ['Coder', 'native-agent.Coder', 'ai.autonomousResponse'],
    ['Architect', 'native-agent.Architect', 'ai.autonomousResponse'],
    ['code-reviewer', 'native-agent.code-reviewer', 'ai.autonomousResponse'],
    ['explore', 'native-agent.explore', 'ai.autonomousResponse'],
    ['CreateSkill', 'native-agent.CreateSkill', 'ai.autonomousResponse'],
    ['Orchestrator', 'native-agent.Orchestrator', 'ai.autonomousResponse'],
    ['Command', 'native-agent.Command', 'ai.autonomousResponse']
  ]) {
    const autonomousAgentDescribe = await registry.executeTool('core.agent.describe', {
      requestId: `${agentId}-agent-describe-smoke`,
      playbookId,
      input: { agentId },
      state: {}
    });
    assert.equal(autonomousAgentDescribe.ok, true);
    assert.equal(autonomousAgentDescribe.value.agent.migrationStatus.strategy, 'playbook-autonomous');
    assert.equal(autonomousAgentDescribe.value.agent.migrationStatus.autonomousPlaybook, true);
    assert.equal(autonomousAgentDescribe.value.agent.migrationStatus.nativeDelegateFallback, false);
    assert.equal(autonomousAgentDescribe.value.agent.migrationStatus.selectedPlaybook, playbookId);
    assert.equal(autonomousAgentDescribe.value.agent.migrationStatus.sourceAgentId, agentId);
    assert.equal(autonomousAgentDescribe.value.agent.migrationStatus.deterministicCoverage.includes(coverage), true);
  }

  const runtimeTheiaToolInvoke = await registry.executeTool('codex.runtime.tool', {
    requestId: 'runtime-agent-theia-tool-invoke-smoke',
    playbookId: 'native-agent.Codex',
    input: { prompt: 'invoke registered runtime tool directly' },
    state: {}
  });
  assert.equal(runtimeTheiaToolInvoke.ok, true);

  const runtimeAgentPreflight = await registry.executeTool('core.agent.preflight', {
    requestId: 'runtime-agent-preflight-smoke',
    playbookId: 'native-agent.Codex',
    input: { agentId: 'Codex' },
    state: {}
  });
  assert.equal(runtimeAgentPreflight.ok, true);
  assert.equal(runtimeAgentPreflight.value.playbookResolution.generated, true);
  assert.equal(runtimeAgentPreflight.value.playbookResolution.fallbackPlaybookId, undefined);
  assert.equal(runtimeAgentPreflight.value.theiaFunctionBridge.registeredFunctions.includes('codex.runtime.tool'), true);
  assert.equal(runtimeAgentPreflight.value.provider.ready, true);

  const runtimeAgentPreflightWithChatExecution = await registry.executeTool('core.agent.preflight', {
    requestId: 'runtime-agent-preflight-chat-execution-smoke',
    playbookId: 'native-agent.Codex',
    input: {
      agentId: 'Codex',
      execution: {
        providerId: 'codex-app-server:codex',
        runtime: 'codex-app-server',
        modelProvider: 'codex',
        model: 'gpt-5.5'
      }
    },
    state: {}
  });
  assert.equal(runtimeAgentPreflightWithChatExecution.ok, true);
  assert.equal(runtimeAgentPreflightWithChatExecution.value.provider.ready, true);
  assert.equal(runtimeAgentPreflightWithChatExecution.value.provider.selected.providerId, 'codex-app-server:codex');
  assert.equal(runtimeAgentPreflightWithChatExecution.value.provider.selected.runtime, 'codex-app-server');
  assert.equal(runtimeAgentPreflightWithChatExecution.value.provider.selected.modelProvider, 'codex');
  assert.equal(runtimeAgentPreflightWithChatExecution.value.provider.selected.model, 'gpt-5.5');
  assert.equal(runtimeAgentPreflightWithChatExecution.value.provider.provider.id, 'codex-app-server:codex');
  assert.equal(runtimeAgentPreflightWithChatExecution.value.provider.requestedModel, 'gpt-5.5');

  const runtimeAgentMcp = await registry.executeTool('system.agent.nativeMcpRequirements', {
    requestId: 'runtime-agent-mcp-smoke',
    playbookId: 'native-agent.Codex',
    input: { agentId: 'Codex' },
    state: {}
  });
  assert.equal(runtimeAgentMcp.ok, true);
  assert.equal(runtimeAgentMcp.value.agentId, 'Codex');
  assert.equal(runtimeAgentMcp.value.groups.length, 0);

  const githubAgentMcp = await registry.executeTool('system.agent.nativeMcpRequirements', {
    requestId: 'github-agent-mcp-smoke',
    playbookId: 'native-agent.GitHub',
    input: { agentId: 'GitHub' },
    state: {}
  });
  assert.equal(githubAgentMcp.ok, true);
  assert.equal(githubAgentMcp.value.agentId, 'GitHub');
  assert.deepEqual(githubAgentMcp.value.groups.map(group => group.id), ['github']);
  assert.equal(githubAgentMcp.value.requiresConfiguration, true);
  assert.equal(githubAgentMcp.value.requiresUserConfiguration, true);

  const prReviewerMcp = await registry.executeTool('system.agent.nativeMcpRequirements', {
    requestId: 'pr-reviewer-agent-mcp-smoke',
    playbookId: 'native-agent.pr-reviewer',
    input: { agentId: 'pr-reviewer' },
    state: {}
  });
  assert.equal(prReviewerMcp.ok, true);
  assert.equal(prReviewerMcp.value.agentId, 'pr-reviewer');
  assert.deepEqual(prReviewerMcp.value.groups.map(group => group.id), ['github']);
  assert.equal(prReviewerMcp.value.groups[0].promptRefs.includes('mcp_github_tools'), true);

  const appTesterMcp = await registry.executeTool('system.agent.nativeMcpRequirements', {
    requestId: 'app-tester-agent-mcp-smoke',
    playbookId: 'native-agent.AppTester',
    input: { agentId: 'AppTester' },
    state: {}
  });
  assert.equal(appTesterMcp.ok, true);
  assert.equal(appTesterMcp.value.agentId, 'AppTester');
  assert.deepEqual(appTesterMcp.value.groups.map(group => group.id), ['chrome-devtools', 'playwright']);
  assert.deepEqual(appTesterMcp.value.requirements.map(requirement => requirement.name), ['chrome-devtools']);
  assert.equal(appTesterMcp.value.requiresStart, true);

  const workspaceRootUri = 'file:///workspace';
  const playbookList = await registry.executeTool('core.playbook.list', {
    requestId: 'playbook-list-smoke',
    input: {},
    state: {}
  });
  assert.equal(playbookList.ok, true);
  assert.equal(playbookList.value.playbooks.some(playbook => playbook.id === 'smoke-playbook'), true);

  const playbookRun = await registry.executeTool('core.playbook.run', {
    requestId: 'playbook-run-smoke',
    input: { playbookId: 'smoke-playbook', prompt: 'Run this playbook as workload' },
    state: {}
  });
  assert.equal(playbookRun.ok, true);
  assert.equal(playbookRun.stop, true);
  assert.equal(playbookRun.value.playbookId, 'smoke-playbook');
  assert.equal(playbookCalls.at(-1).method, 'run');

  const playbookResume = await registry.executeTool('core.playbook.resume', {
    requestId: 'playbook-resume-smoke',
    input: { runId: 'playbook-run-1' },
    state: {}
  });
  assert.equal(playbookResume.ok, true);
  assert.equal(playbookResume.stop, true);
  assert.equal(playbookResume.value.requestId, 'playbook-run-1');
  assert.equal(playbookCalls.at(-1).method, 'resume');

  const playbookDraft = await registry.executeTool('core.playbook.compileToFlowDraft', {
    requestId: 'playbook-compile-flow-smoke',
    input: { playbookId: 'smoke-playbook', prompt: 'Compile this playbook' },
    state: {}
  });
  assert.equal(playbookDraft.ok, true);
  assert.equal(playbookDraft.value.draft.version, 'flow.ai-authoring/v1');
  assert.equal(playbookDraft.value.workflow.id, 'playbook_smoke-playbook');
  assert.equal(playbookDraft.value.workflow.states.respond.type, 'report');

  const playbookFlow = await registry.executeTool('core.playbook.createFlowFromPlaybook', {
    requestId: 'playbook-create-flow-smoke',
    input: { workspaceRootUri, playbookId: 'smoke-playbook', prompt: 'Create a Flow from this playbook' },
    state: {}
  });
  assert.equal(playbookFlow.ok, true);
  assert.equal(playbookFlow.value.workflow.id, 'workflow-from-draft');
  assert.equal(playbookFlow.value.draft.action, 'create_workflow');

  const workflows = await registry.executeTool('core.flow.listWorkflows', {
    requestId: 'flow-list-smoke',
    input: { workspaceRootUri },
    state: {}
  });
  assert.equal(workflows.ok, true);
  assert.equal(workflows.value[0].id, 'flow.saved.demo');

  const savedFlow = await registry.executeTool('core.flow.startRun', {
    requestId: 'flow-saved-smoke',
    input: { workspaceRootUri, workflowId: 'flow.saved.demo', prompt: 'Run the saved flow' },
    state: {}
  });
  assert.equal(savedFlow.ok, true);
  assert.equal(savedFlow.stop, true);
  assert.equal(savedFlow.value.id, 'run-saved-flow');
  assert.equal(savedFlow.value.workflowId, 'flow.saved.demo');

  const dynamicFlow = await registry.executeTool('core.flow.runDynamicWorkflow', {
    requestId: 'flow-dynamic-smoke',
    input: { workspaceRootUri, prompt: 'Build a dynamic workflow', preferSaved: false, aiAuthoring: false },
    state: {}
  });
  assert.equal(dynamicFlow.ok, true);
  assert.equal(dynamicFlow.stop, true);
  assert.equal(dynamicFlow.value.id, 'run-dynamic-flow');
  assert.equal(dynamicFlow.value.preferSaved, false);

  const authoringDraft = {
    version: 'flow.ai-authoring/v1',
    action: 'create_workflow',
    reason: 'Use a provided draft.'
  };
  const authoringDraftRun = await registry.executeTool('core.flow.runAiAuthoringDraft', {
    requestId: 'flow-authoring-draft-smoke',
    input: { workspaceRootUri, prompt: 'Run provided authoring draft', preferSaved: true, authoringDraft },
    state: {}
  });
  assert.equal(authoringDraftRun.ok, true);
  assert.equal(authoringDraftRun.stop, true);
  assert.equal(authoringDraftRun.value.id, 'run-ai-authored-flow');
  assert.deepEqual(authoringDraftRun.value.authoringDraft, authoringDraft);

  const aiAuthoredRun = await registry.executeTool('core.flow.runAiAuthoredDynamicWorkflow', {
    requestId: 'flow-ai-authored-smoke',
    input: {
      workspaceRootUri,
      workspacePath: 'C:\\workspace',
      prompt: 'Ask AI to author and run a workflow',
      preferSaved: true
    },
    state: {}
  });
  assert.equal(aiAuthoredRun.ok, true);
  assert.equal(aiAuthoredRun.stop, true);
  assert.equal(aiAuthoredRun.value.run.id, 'run-ai-authored-flow');
  assert.equal(aiAuthoredRun.value.draft.action, 'create_workflow');

  const createWorkflow = await registry.executeTool('core.flow.createWorkflowFromAiAuthoringDraft', {
    requestId: 'flow-create-from-draft-smoke',
    input: { workspaceRootUri, authoringDraft },
    state: {}
  });
  assert.equal(createWorkflow.ok, true);
  assert.equal(createWorkflow.value.id, 'workflow-from-draft');

  const authoringSpec = await registry.executeTool('core.flow.getAiAuthoringSpec', {
    requestId: 'flow-spec-smoke',
    input: {},
    state: {}
  });
  assert.equal(authoringSpec.ok, true);
  assert.equal(authoringSpec.value.version, 'flow.ai-authoring/v1');
  assert.deepEqual(
    flowCalls
      .filter(call => ['startRun', 'runDynamicWorkflow', 'createWorkflowFromAiAuthoringDraft', 'runTask'].includes(call.method))
      .map(call => call.method),
    ['createWorkflowFromAiAuthoringDraft', 'startRun', 'runDynamicWorkflow', 'runDynamicWorkflow', 'runTask', 'runDynamicWorkflow', 'createWorkflowFromAiAuthoringDraft']
  );

  const knownReference = await registry.executeTool('system.canvas.getReferenceFromKnownSite', {
    requestId: 'canvas-reference-smoke',
    input: { prompt: 'clone da amazon com nome Saara' },
    state: {}
  });
  assert.equal(knownReference.ok, true);
  assert.equal(knownReference.value.site, 'Amazon-style marketplace homepage');
  assert.ok(knownReference.value.modules.includes('search input with submit button'));

  const documentCapture = await registry.executeTool('system.canvas.captureCurrentDocument', {
    requestId: 'canvas-document-smoke',
    input: { uri: canvasUri.toString() },
    state: {}
  });
  assert.equal(documentCapture.ok, true);
  assert.equal(documentCapture.value.summary.nodeCount, 4);
  assert.equal(documentCapture.value.selection[0], 'search-button-card');

  const visualSnapshot = await registry.executeTool('system.canvas.captureScreenshot', {
    requestId: 'canvas-snapshot-smoke',
    input: { uri: canvasUri.toString() },
    state: {}
  });
  assert.equal(visualSnapshot.ok, true);
  assert.equal(visualSnapshot.value.kind, 'svg-snapshot');
  assert.ok(visualSnapshot.value.svg.includes('Saara Amazon clone smoke'));

  const layoutDiagnostics = await registry.executeTool('system.canvas.collectLayoutDiagnostics', {
    requestId: 'canvas-diagnostics-smoke',
    input: { uri: canvasUri.toString() },
    state: {}
  });
  assert.equal(layoutDiagnostics.ok, false);
  const diagnosticCategories = new Set(layoutDiagnostics.value.diagnostics.map(diagnostic => diagnostic.category));
  assert.equal(diagnosticCategories.has('overlap'), true);
  assert.equal(diagnosticCategories.has('text-overflow'), true);
  assert.equal(diagnosticCategories.has('off-canvas'), true);
  assert.equal(diagnosticCategories.has('footer'), true);
  assert.equal(diagnosticCategories.has('clone-completeness'), true);

  const resizeSuggestions = await registry.executeTool('system.canvas.resizeToFit', {
    requestId: 'canvas-resize-smoke',
    input: { uri: canvasUri.toString(), apply: false },
    state: {}
  });
  assert.equal(resizeSuggestions.ok, true);
  assert.equal(resizeSuggestions.value.operations.some(operation => operation.nodeId === 'product-card' && operation.changes.width === 50), true);
  assert.equal(resizeSuggestions.value.operations.some(operation => operation.nodeId === 'long-copy' && operation.changes.height > 18), true);

  const visionCallsBeforeDeterministic = visionRunRequests.length;
  const deterministicVisionJudge = await registry.executeTool('system.vision.judge', {
    requestId: 'vision-judge-deterministic-smoke',
    input: {
      uri: canvasUri.toString(),
      prompt: 'clone da amazon com nome Saara',
      visionJudgeMode: 'deterministic'
    },
    state: {}
  });
  assert.equal(deterministicVisionJudge.ok, false);
  assert.equal(deterministicVisionJudge.value.deterministic, true);
  assert.equal(deterministicVisionJudge.value.needsRepair, true);
  assert.equal(deterministicVisionJudge.value.suggestedOperations.some(operation => operation.nodeId === 'search-button-card'), true);
  assert.equal(deterministicVisionJudge.value.suggestedOperations.some(operation => operation.nodeId === 'product-card'), true);
  assert.equal(deterministicVisionJudge.value.suggestedOperations.some(operation => operation.operation === 'addNode' && /footer/i.test(operation.node?.name || '')), true);
  assert.equal(visionRunRequests.length, visionCallsBeforeDeterministic, 'deterministic Vision Judge must not call an AI provider');

  const applyCanvasOperations = await registry.executeTool('system.canvas.applyOperations', {
    requestId: 'canvas-apply-smoke',
    input: {
      uri: canvasUri.toString(),
      operations: [{ operation: 'updateNode', nodeId: 'search-button-card', changes: { width: 120, height: 36 } }]
    },
    state: {}
  });
  assert.equal(applyCanvasOperations.ok, true);
  assert.equal(applyCanvasOperations.value.applied, 1);
  assert.equal(appliedOperations[0].nodeId, 'search-button-card');

  const visionJudge = await registry.executeTool('system.vision.judge', {
    requestId: 'vision-judge-smoke',
    input: {
      uri: canvasUri.toString(),
      workspacePath: 'C:\\workspace',
      prompt: 'clone da amazon com nome Saara',
      visionProviderId: 'explicit-vision-provider',
      visionModel: 'explicit-vision-model'
    },
    state: {}
  });
  assert.equal(visionJudge.ok, false);
  assert.equal(visionJudge.value.needsRepair, true);
  assert.equal(visionJudge.value.suggestedOperations[0].nodeId, 'search-button-card');
  assert.ok(visionJudge.diagnostics.includes('vision diagnostic'));
  assert.equal(visionRunRequests.at(-1).execution.providerId, 'explicit-vision-provider');
  assert.equal(visionRunRequests.at(-1).execution.model, 'explicit-vision-model');

  preferenceValues.delete('cybervinci.aiChat.visionJudge.enabled');
  preferenceValues.set('cybervinci.aiChat.visionJudge.provider', 'preferred-vision-provider');
  preferenceValues.set('cybervinci.aiChat.visionJudge.model', 'preferred-vision-model');
  const visionJudgeUsingChatModel = await registry.executeTool('system.vision.judge', {
    requestId: 'vision-judge-chat-model-smoke',
    input: {
      uri: canvasUri.toString(),
      workspacePath: 'C:\\workspace',
      prompt: 'clone da amazon com nome Saara',
      execution: {
        providerId: 'chat-provider',
        model: 'chat-model',
        runtime: 'direct-api',
        modelProvider: 'chat-model-provider'
      }
    },
    state: {}
  });
  assert.equal(visionJudgeUsingChatModel.ok, false);
  assert.equal(visionRunRequests.at(-1).execution.providerId, 'chat-provider');
  assert.equal(visionRunRequests.at(-1).execution.model, 'chat-model');

  preferenceValues.set('cybervinci.aiChat.visionJudge.enabled', true);
  const visionJudgeUsingIndependentModel = await registry.executeTool('system.vision.judge', {
    requestId: 'vision-judge-independent-model-smoke',
    input: {
      uri: canvasUri.toString(),
      workspacePath: 'C:\\workspace',
      prompt: 'clone da amazon com nome Saara',
      execution: {
        providerId: 'chat-provider',
        model: 'chat-model',
        runtime: 'direct-api',
        modelProvider: 'chat-model-provider'
      }
    },
    state: {}
  });
  assert.equal(visionJudgeUsingIndependentModel.ok, false);
  assert.equal(visionRunRequests.at(-1).execution.providerId, 'preferred-vision-provider');
  assert.equal(visionRunRequests.at(-1).execution.model, 'preferred-vision-model');
  assert.equal(visionRunRequests.at(-1).execution.runtime, 'direct-api');
  assert.equal(visionRunRequests.at(-1).execution.modelProvider, 'chat-model-provider');

  console.log(JSON.stringify({
    ok: true,
    checked: [
      'composite tool executes steps in order',
      'step args resolve from input and state',
      'step saveAs writes shared state',
      'stopOnFail false continues after a failed step',
      'default failed step stops composite execution',
      'tool policy approval blocks execution when approval UI is unavailable',
      'tool policy approval rejects execution when user rejects',
      'tool policy approval allows execution when user approves',
      'memory tool searches context and builds context packs',
      'memory tool proposes candidate records without writing',
      'memory writeApproved requires explicit approval',
      'memory approval blocks without UI, supports rejection, and writes only after approval',
      'runtime @ agent describe resolves agents without YAML from ChatAgentService',
      'agent describe reports autonomous migration status without native delegate tools',
      'agent describe reports autonomous migration status for all converted catalog-native agents',
      'runtime @ agent functions are surfaced as Theia-backed tool capabilities',
      'runtime @ agent Theia function tools can be invoked directly through the registry',
      'runtime @ agent preflight accepts generated autonomous native-agent playbooks',
      'runtime @ agent preflight validates declared Theia functions and provider readiness',
      'runtime @ agent preflight uses explicit chat execution provider/model before runtime defaults',
      'runtime @ agent MCP requirements tool handles runtime-only native agents',
      'catalog native agent MCP requirements resolve GitHub, PR Reviewer, and AppTester setup groups',
      'playbook tool lists playbooks through the service',
      'playbook tool runs playbooks as workloads through the registered runner',
      'playbook tool resumes paused playbook runs through the registered resumer',
      'playbook tool compiles playbooks to flow.ai-authoring/v1 drafts',
      'playbook tool creates Flow workflows from Playbooks',
      'flow tool lists saved workflows through Flow service',
      'flow tool starts saved workflow runs through Flow service',
      'flow tool starts dynamic workflow runs through Flow service',
      'flow tool runs provided AI authoring drafts through Flow service',
      'flow tool asks AI Runtime to author dynamic workflows before running Flow',
      'flow tool creates saved workflows from AI authoring drafts',
      'flow tool exposes flow.ai-authoring/v1 spec',
      'canvas tool resolves known-site references from prompt context',
      'canvas tool captures active document summary and selection',
      'canvas tool captures SVG visual snapshots',
      'canvas tool detects overlap, text overflow, off-canvas, missing footer, and clone-completeness issues',
      'canvas tool suggests resize-to-fit operations without applying them',
      'canvas tool applies stabilized Canvas operations through the design service',
      'vision judge deterministic mode suggests Canvas repair operations without calling a model',
      'vision judge builds visual AI input and returns repair guidance',
      'vision judge explicit provider/model input overrides defaults',
      'vision judge uses chat execution when independent model is disabled',
      'vision judge uses independent provider/model preferences when enabled'
    ]
  }, null, 2));
}

main().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
