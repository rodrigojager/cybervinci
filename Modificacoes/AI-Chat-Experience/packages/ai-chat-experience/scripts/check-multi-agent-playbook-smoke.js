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
const playbookCatalogPath = path.join(packageRoot, 'config', 'system', 'playbooks', 'multi-agent-delivery-review.playbook.yml');
const PLAYBOOK_ID = 'multi-agent-delivery-review';

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
  assert.ok(fs.existsSync(playbookCatalogPath), `Multi-agent playbook catalog is missing: ${playbookCatalogPath}`);
  const catalog = yaml.load(fs.readFileSync(playbookCatalogPath, 'utf8'));
  const playbook = catalog.playbooks.find(item => item.id === PLAYBOOK_ID);
  assert.ok(playbook, `Catalog must include ${PLAYBOOK_ID}.`);
  return playbook;
}

function structuredResponse(action, prompt) {
  const repairScenario = /repair/i.test(prompt);
  if (action.endsWith('.plan-work')) {
    return {
      objective: repairScenario ? 'Repair scenario objective' : 'Approved scenario objective',
      executorBrief: 'Produce the delivery outline.',
      criticBrief: 'Find missing acceptance criteria.',
      verifierBrief: 'Verify evidence and residual risks.',
      repairCriteria: ['no missing evidence', 'no high severity findings']
    };
  }
  if (action.endsWith('.execute-work')) {
    return {
      summary: repairScenario ? 'Execution found a gap.' : 'Execution delivered the requested outcome.',
      deliverables: ['implementation outline', 'validation checklist'],
      validation: ['catalog smoke', 'runtime smoke'],
      needsRepair: repairScenario
    };
  }
  if (action.endsWith('.critique-work')) {
    return {
      approved: !repairScenario,
      findings: repairScenario ? ['Missing runtime evidence'] : [],
      severity: repairScenario ? 'high' : 'none'
    };
  }
  if (action.endsWith('.verify-work')) {
    return {
      verified: !repairScenario,
      evidence: repairScenario ? [] : ['planner/executor/critic/verifier completed'],
      missingEvidence: repairScenario ? ['repair validation'] : []
    };
  }
  if (action.endsWith('.repair-work')) {
    return {
      summary: 'Repair plan created.',
      repairs: ['add missing validation evidence', 'rerun verifier'],
      nextValidation: ['runtime smoke after repair'],
      residualRisks: ['requires a second pass if validation fails']
    };
  }
  return undefined;
}

async function runScenario(runtime, prompt) {
  const aiCalls = [];
  runtime.aiRuntime = {
    runTask: async request => {
      aiCalls.push(request);
      const structured = structuredResponse(String(request.action), prompt);
      if (structured) {
        return {
          structured,
          text: JSON.stringify(structured),
          provider: { id: 'multi-agent-smoke', label: 'Multi-Agent Smoke' },
          execution: { model: 'multi-agent-smoke', runtime: 'smoke', modelProvider: 'smoke' },
          diagnostics: [],
          notifications: []
        };
      }
      assert.match(String(request.action), /\.synthesize-final$/);
      return {
        text: 'Final multi-agent delivery summary.',
        provider: { id: 'multi-agent-smoke', label: 'Multi-Agent Smoke' },
        execution: { model: 'multi-agent-smoke', runtime: 'smoke', modelProvider: 'smoke' },
        diagnostics: [],
        notifications: []
      };
    }
  };
  const result = await runtime.runPlaybookById(PLAYBOOK_ID, prompt, { agentId: 'multi-agent-smoke' });
  return { result, aiCalls, run: runtime.getRecentRuns()[0] };
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

  const approved = await runScenario(runtime, 'approved multi-agent delivery');
  assert.equal(approved.result.ok, true);
  assert.equal(approved.result.value.playbookId, PLAYBOOK_ID);
  assert.equal(approved.result.value.state.plan.objective, 'Approved scenario objective');
  assert.equal(approved.result.value.state.agentBranches.length, 3);
  assert.equal(approved.result.value.state.agentBranches[1].state.criticReview.approved, true);
  assert.equal(approved.result.value.state.agentBranches[2].state.verification.verified, true);
  assert.equal(approved.result.value.state.finalAnswer, 'Final multi-agent delivery summary.');
  assert.equal(approved.result.value.state.repairPlan, undefined);
  assert.equal(approved.run.status, 'completed');
  assert.equal(approved.aiCalls.some(call => String(call.action).endsWith('.synthesize-final')), true);

  const repair = await runScenario(runtime, 'repair multi-agent delivery');
  assert.equal(repair.result.ok, true);
  assert.equal(repair.result.value.state.plan.objective, 'Repair scenario objective');
  assert.equal(repair.result.value.state.agentBranches.length, 3);
  assert.equal(repair.result.value.state.agentBranches[0].state.executorResult.needsRepair, true);
  assert.equal(repair.result.value.state.agentBranches[1].state.criticReview.approved, false);
  assert.equal(repair.result.value.state.agentBranches[2].state.verification.verified, false);
  assert.equal(repair.result.value.state.repairPlan.summary, 'Repair plan created.');
  assert.equal(repair.result.value.state.finalAnswer, undefined);
  assert.equal(repair.run.status, 'completed');
  assert.equal(repair.aiCalls.some(call => String(call.action).endsWith('.repair-work')), true);

  console.log(JSON.stringify({
    ok: true,
    playbookId: PLAYBOOK_ID,
    checked: [
      'real catalog playbook loads from config/system/playbooks',
      'planner produces structured execution, critic, verifier, and repair criteria',
      'executor, critic, and verifier run as parallel branches',
      'approved scenario routes to final synthesis without repair',
      'repair scenario routes to repairer from executor, critic, and verifier failures',
      'run history records completed runs for both scenarios'
    ],
    approvedAiCalls: approved.aiCalls.map(call => call.action),
    repairAiCalls: repair.aiCalls.map(call => call.action)
  }, null, 2));
}

main().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
