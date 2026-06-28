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
const playbookCatalogPath = path.join(packageRoot, 'config', 'system', 'playbooks', 'canvas-design-qa.playbook.yml');
const PLAYBOOK_ID = 'canvas-design-qa';

function loadRuntimeModule() {
  assert.ok(runtimeModulePath, 'Compiled cybervinci-playbook-runtime.js was not found. Run npm run compile first.');
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

function loadPlaybook() {
  assert.ok(fs.existsSync(playbookCatalogPath), `Canvas Design QA playbook catalog is missing: ${playbookCatalogPath}`);
  const catalog = yaml.load(fs.readFileSync(playbookCatalogPath, 'utf8'));
  const playbook = catalog.playbooks.find(item => item.id === PLAYBOOK_ID);
  assert.ok(playbook, `Catalog must include ${PLAYBOOK_ID}.`);
  return playbook;
}

function createCanvasDocument() {
  return {
    id: 'doc-saara-smoke',
    name: 'Saara marketplace smoke',
    activePageId: 'page-1',
    pages: [
      {
        id: 'page-1',
        name: 'Page 1',
        width: 900,
        height: 900,
        children: [
          { id: 'header', name: 'Saara header', type: 'frame', x: 0, y: 0, width: 900, height: 96, children: [] },
          { id: 'search', name: 'Search input', type: 'frame', x: 160, y: 18, width: 520, height: 44, children: [] },
          { id: 'hero', name: 'Hero offers', type: 'frame', x: 24, y: 124, width: 852, height: 280, children: [] },
          { id: 'card-1', name: 'Product card', type: 'frame', x: 24, y: 430, width: 260, height: 180, children: [] }
        ]
      }
    ]
  };
}

function createToolRegistry({ suggestedOperations }) {
  const calls = [];
  let applied = false;
  const document = createCanvasDocument();
  return {
    calls,
    async executeTool(toolId, context) {
      calls.push({ toolId, stateId: context.stateId });
      switch (toolId) {
        case 'system.canvas.getReferenceFromKnownSite':
          return {
            ok: true,
            value: {
              site: 'Amazon-style marketplace homepage',
              modules: ['header', 'search input', 'hero/deal region', 'product/category cards', 'multi-column footer'],
              notes: ['Search must remain an input/button row.', 'Complete pages need a footer.']
            },
            message: 'Matched Amazon-style marketplace homepage.'
          };
        case 'system.canvas.captureCurrentDocument':
          return {
            ok: true,
            value: {
              uri: 'file:///workspace/design.op',
              document,
              selection: [],
              summary: {
                name: document.name,
                activePageId: 'page-1',
                nodeCount: document.pages[0].children.length
              }
            }
          };
        case 'system.canvas.captureScreenshot':
          return {
            ok: true,
            value: {
              kind: 'svg-snapshot',
              uri: 'file:///workspace/design.op',
              bounds: { x: 0, y: 0, width: 900, height: 900 },
              svg: '<svg><rect id="header"/><rect id="search"/><rect id="hero"/></svg>'
            }
          };
        case 'system.canvas.collectLayoutDiagnostics':
          return {
            ok: true,
            value: {
              uri: 'file:///workspace/design.op',
              diagnostics: applied ? [] : [
                { category: 'footer', severity: 'warning', message: 'No footer-like section was detected.' }
              ],
              summary: { nodeCount: document.pages[0].children.length }
            },
            message: applied ? 'No Canvas layout diagnostics found.' : '1 Canvas diagnostic found.'
          };
        case 'system.vision.judge':
          if (context.stateId === 'verify' || applied) {
            return {
              ok: true,
              value: {
                passed: true,
                score: 0.91,
                summary: 'Canvas QA passed after repair.',
                needsRepair: false,
                issues: [],
                suggestedOperations: []
              },
              message: 'Canvas QA passed after repair.'
            };
          }
          return {
            ok: false,
            value: {
              passed: false,
              score: 0.54,
              summary: 'Canvas is missing footer and support modules.',
              needsRepair: true,
              issues: [{ severity: 'warning', message: 'Footer missing.' }],
              suggestedOperations
            },
            message: 'Canvas is missing footer and support modules.'
          };
        case 'system.canvas.applyOperations':
          applied = true;
          document.pages[0].children.push({
            id: 'footer',
            name: 'Saara footer',
            type: 'frame',
            x: 0,
            y: 760,
            width: 900,
            height: 120,
            children: []
          });
          return {
            ok: true,
            value: {
              applied: Array.isArray(context.input.operations) ? context.input.operations.length : 1,
              requested: Array.isArray(context.input.operations) ? context.input.operations.length : 1,
              results: [{ changed: true, nodeId: 'footer' }]
            },
            message: 'Applied Canvas operations.'
          };
        default:
          throw new Error(`Unexpected tool '${toolId}'.`);
      }
    }
  };
}

async function runScenario(runtime, { suggestedOperations, prompt }) {
  const toolRegistry = createToolRegistry({ suggestedOperations });
  const aiCalls = [];
  runtime.toolRegistry = toolRegistry;
  runtime.aiRuntime = {
    runTask: async request => {
      aiCalls.push(request);
      assert.match(String(request.action), /\.repair-plan$/);
      return {
        structured: {
          summary: 'Add missing footer and support strip.',
          operations: [
            { operation: 'addNode', parentId: 'page-1', node: { id: 'footer', type: 'frame', x: 0, y: 760, width: 900, height: 120 } }
          ]
        },
        text: '{"summary":"Add missing footer and support strip.","operations":[]}',
        provider: { id: 'canvas-qa-smoke', label: 'Canvas QA Smoke' },
        execution: { model: 'canvas-qa-smoke', runtime: 'smoke', modelProvider: 'smoke' },
        diagnostics: [],
        notifications: []
      };
    }
  };
  const result = await runtime.runPlaybookById(PLAYBOOK_ID, prompt, { agentId: 'canvas-qa-smoke' });
  return { result, aiCalls, toolCalls: toolRegistry.calls, run: runtime.getRecentRuns()[0] };
}

async function main() {
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => undefined
  };
  const { CyberVinciPlaybookRuntime } = loadRuntimeModule();
  const playbook = loadPlaybook();
  const runtime = new CyberVinciPlaybookRuntime();
  runtime.service = {
    getPlaybook: async id => id === PLAYBOOK_ID ? playbook : undefined
  };
  runtime.preferenceService = { get: () => undefined };
  runtime.messageService = {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined
  };
  runtime.logger = runtime.messageService;

  const suggested = await runScenario(runtime, {
    prompt: 'Clone Amazon as Saara and repair missing footer using suggested operations.',
    suggestedOperations: [
      { operation: 'addNode', parentId: 'page-1', node: { id: 'footer', type: 'frame', x: 0, y: 760, width: 900, height: 120 } }
    ]
  });
  assert.equal(suggested.result.ok, true);
  assert.equal(suggested.result.value.state.knownReference.site, 'Amazon-style marketplace homepage');
  assert.equal(suggested.result.value.state.visionJudge.passed, false);
  assert.equal(suggested.result.value.state.applyResult.applied, 1);
  assert.equal(suggested.result.value.state.verification.passed, true);
  assert.equal(suggested.aiCalls.length, 0, 'suggested operations path should not call repair planner AI');
  assert.equal(suggested.toolCalls.some(call => call.stateId === 'apply-suggested-operations'), true);
  assert.equal(suggested.run.status, 'completed');

  const planned = await runScenario(runtime, {
    prompt: 'Clone Amazon as Saara and repair missing footer using AI repair plan.',
    suggestedOperations: []
  });
  assert.equal(planned.result.ok, true);
  assert.equal(planned.result.value.state.repairPlan.summary, 'Add missing footer and support strip.');
  assert.equal(planned.result.value.state.applyResult.applied, 1);
  assert.equal(planned.result.value.state.verification.passed, true);
  assert.equal(planned.aiCalls.length, 1);
  assert.equal(planned.toolCalls.some(call => call.stateId === 'apply-operations'), true);
  assert.equal(planned.run.status, 'completed');

  console.log(JSON.stringify({
    ok: true,
    playbookId: PLAYBOOK_ID,
    checked: [
      'real canvas-design-qa playbook loads from config/system/playbooks',
      'known-site reference matches Amazon/Saara prompt',
      'Canvas document capture, snapshot, diagnostics, Vision Judge, apply, and verify states execute',
      'suggestedOperations route applies Canvas operations without repair planner AI',
      'empty suggestedOperations route calls repair planner AI and applies its operations',
      'both Canvas QA runs complete with verification passed'
    ],
    suggestedToolStates: suggested.toolCalls.map(call => call.stateId),
    plannedToolStates: planned.toolCalls.map(call => call.stateId),
    plannedAiCalls: planned.aiCalls.map(call => call.action)
  }, null, 2));
}

main().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
