#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const packageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageRoot, '..', '..', '..', '..');
const workloadContributionModulePath = path.join(repoRoot, 'Workload', 'theia', 'packages', 'cybervinci-ai-chat-experience', 'lib', 'browser', 'cybervinci-declarative-chat-agent-contribution.js');
const localContributionModulePath = path.join(packageRoot, 'lib', 'browser', 'cybervinci-declarative-chat-agent-contribution.js');
const isOverlayPackage = packageRoot.split(path.sep).includes('Modificacoes');
const contributionModulePath = (isOverlayPackage
  ? [workloadContributionModulePath, localContributionModulePath]
  : [localContributionModulePath, workloadContributionModulePath]
).find(candidate => fs.existsSync(candidate));
const redactionModulePath = path.join(packageRoot, 'lib', 'common', 'cybervinci-secret-redaction.js');

function noOpDecorator() {
  return () => undefined;
}

function loadContributionModule(commonStubs) {
  assert.ok(contributionModulePath, 'Compiled cybervinci-declarative-chat-agent-contribution.js was not found. Run npm run compile first.');
  const source = fs.readFileSync(contributionModulePath, 'utf8');
  const module = { exports: {} };
  const stubs = new Map([
    ['@theia/ai-core', {}],
    ['@theia/ai-chat/lib/common', {
      ChatAgentLocation: {
        fromRaw: value => value
      }
    }],
    ['@theia/core', {
      URI: {
        fromFilePath: value => ({ toString: () => String(value) })
      }
    }],
    ['@theia/core/lib/browser', {
      open: async () => undefined
    }],
    ['@theia/core/lib/browser/clipboard-service', {}],
    ['@theia/core/lib/common/preferences', { PreferenceScope: { User: 1 } }],
    ['@theia/core/lib/common/quick-pick-service', {}],
    ['@theia/core/shared/inversify', {
      inject: noOpDecorator,
      injectable: noOpDecorator,
      optional: noOpDecorator
    }],
    ['../common', commonStubs],
    ['./cybervinci-declarative-chat-agent', {
      CyberVinciDeclarativePromptChatAgent: class CyberVinciDeclarativePromptChatAgent {},
      CyberVinciDelegatingChatAgent: class CyberVinciDelegatingChatAgent {}
    }],
    ['./cybervinci-ai-chat-experience-preferences', {
      CYBERVINCI_AI_CHAT_PLAYBOOK_PREF: 'cybervinci.aiChat.playbook'
    }],
    ['./cybervinci-playbook-runtime', {
      CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX: 'native-agent.',
      CyberVinciPlaybookRuntime: class CyberVinciPlaybookRuntime {}
    }],
    ['./cybervinci-tool-registry', {
      CyberVinciToolRegistry: class CyberVinciToolRegistry {}
    }]
  ]);
  const localRequire = request => stubs.has(request) ? stubs.get(request) : require(request);
  const wrapped = `(function (exports, require, module, __filename, __dirname) {\n${source}\n})`;
  const compiled = vm.runInThisContext(wrapped, { filename: contributionModulePath });
  compiled(module.exports, localRequire, module, contributionModulePath, path.dirname(contributionModulePath));
  return module.exports;
}

function assertSourceContains(file, snippets) {
  const source = fs.readFileSync(path.join(packageRoot, file), 'utf8');
  for (const snippet of snippets) {
    assert.ok(source.includes(snippet), `${file} is missing '${snippet}'`);
  }
}

function main() {
  assert.ok(fs.existsSync(redactionModulePath), 'Compiled cybervinci-secret-redaction.js was not found. Run npm run compile first.');
  const {
    CYBERVINCI_REDACTED_SECRET,
    isCyberVinciSensitiveKey,
    redactCyberVinciSecrets
  } = require(redactionModulePath);

  const rawOpenAiKey = 'REDACTED_OPENAI_KEY';
  const rawBearer = 'Bearer abcdefghijklmnopqrstuvwxyz123456';
  const rawGitHubToken = 'GITHUB_TOKEN_EXAMPLE';
  const payload = {
    apiKey: rawOpenAiKey,
    tokenCount: 4096,
    usage: {
      promptTokens: 12,
      authorization: rawBearer
    },
    checkpoint: {
      input: {
        prompt: `build with api_key=${rawOpenAiKey}`,
        env: {
          GITHUB_TOKEN: rawGitHubToken
        }
      },
      diagnostics: [
        `failed request Authorization: ${rawBearer}`,
        'ordinary diagnostic'
      ]
    },
    events: [
      {
        type: 'tool',
        data: {
          password: 'plain-text-password',
          message: `token=${rawGitHubToken}`
        }
      }
    ]
  };

  const redacted = redactCyberVinciSecrets(payload);
  const serialized = JSON.stringify(redacted, null, 2);
  assert.equal(redacted.apiKey, CYBERVINCI_REDACTED_SECRET);
  assert.equal(redacted.tokenCount, 4096, 'token counters must not be redacted as credentials');
  assert.equal(redacted.usage.promptTokens, 12, 'provider usage counters must remain visible');
  assert.equal(redacted.usage.authorization, CYBERVINCI_REDACTED_SECRET);
  assert.equal(redacted.events[0].data.password, CYBERVINCI_REDACTED_SECRET);
  assert.equal(isCyberVinciSensitiveKey('apiKey'), true);
  assert.equal(isCyberVinciSensitiveKey('promptTokens'), false);
  for (const raw of [rawOpenAiKey, rawBearer, rawGitHubToken, 'plain-text-password']) {
    assert.equal(serialized.includes(raw), false, `redacted payload still contains '${raw}'`);
  }
  assert.ok(serialized.includes(CYBERVINCI_REDACTED_SECRET), 'redacted payload should preserve explicit redaction markers');

  const { CyberVinciDeclarativeChatAgentContribution } = loadContributionModule({
    CYBERVINCI_REDACTED_SECRET,
    isCyberVinciSensitiveKey,
    redactCyberVinciSecrets
  });
  const contribution = new CyberVinciDeclarativeChatAgentContribution();
  const syntheticRun = {
    requestId: 'secret-redaction-run',
    playbookId: 'secret-redaction-playbook',
    agentId: 'secret-agent',
    sourceAgentId: 'source-secret-agent',
    startedAt: Date.now() - 25,
    completedAt: Date.now(),
    durationMs: 25,
    status: 'completed',
    diagnostics: [
      `diagnostic leaked ${rawOpenAiKey}`,
      `diagnostic auth ${rawBearer}`
    ],
    checkpoint: {
      playbookId: 'secret-redaction-playbook',
      input: {
        prompt: `Use ${rawOpenAiKey}`,
        apiKey: rawOpenAiKey,
        tokenCount: 10
      },
      state: {
        toolResult: {
          authorization: rawBearer,
          nested: {
            GITHUB_TOKEN: rawGitHubToken
          }
        }
      },
      diagnostics: [`checkpoint ${rawGitHubToken}`],
      updatedAt: Date.now(),
      canResume: false,
      reason: 'completed'
    },
    failureArtifacts: {
      version: 'cybervinci.playbookFailureArtifacts/v1',
      summary: `failure summary ${rawOpenAiKey}`,
      failedAt: Date.now(),
      diagnostics: [`failure diagnostic ${rawGitHubToken}`],
      compensation: {
        canResume: false,
        retryable: true,
        suggestedAction: `retry without ${rawBearer}`
      },
      secondRunSuggestion: {
        prompt: `second run ${rawGitHubToken}`,
        playbookId: 'secret-redaction-playbook',
        input: {
          apiKey: rawOpenAiKey
        }
      }
    },
    events: [
      {
        timestamp: Date.now(),
        type: 'tool',
        stateId: 'call-tool',
        message: `tool saw ${rawOpenAiKey}`,
        data: {
          password: 'plain-text-password',
          message: `Authorization: ${rawBearer}`
        }
      }
    ]
  };
  const playbook = {
    id: 'secret-redaction-playbook',
    name: 'Secret Redaction Playbook',
    description: 'Synthetic playbook',
    category: 'Security',
    source: 'system',
    sourcePath: 'config/system/playbooks/secret.yml',
    entry: 'start',
    states: [{ id: 'start' }]
  };
  const agent = {
    id: 'secret-agent',
    name: 'Secret Agent',
    source: 'system',
    sourcePath: 'config/system/agents/secret.yml',
    sourceAgentId: 'source-secret-agent',
    defaultPlaybook: 'secret-redaction-playbook'
  };
  const migrationStatus = {
    strategy: `Authorization: ${rawBearer}`,
    autonomousPlaybook: true
  };
  const exported = [
    contribution.toPlaybookRunExport(syntheticRun, playbook, agent, migrationStatus),
    contribution.toPlaybookRunMarkdown(syntheticRun, playbook, agent, migrationStatus),
    contribution.toPlaybookRunArtifactsExport(syntheticRun),
    contribution.toPlaybookRunArtifactsMarkdown(syntheticRun),
    contribution.toPlaybookRunTimelineExport(syntheticRun),
    contribution.toPlaybookRunTimelineMarkdown(syntheticRun),
    contribution.toPlaybookRunDiagnosticsExport(syntheticRun),
    contribution.toPlaybookRunDiagnosticsMarkdown(syntheticRun),
    contribution.toPlaybookRunComparison(syntheticRun, {
      ...syntheticRun,
      requestId: 'secret-redaction-run-next',
      diagnostics: [`right side ${rawGitHubToken}`]
    }),
    contribution.toPlaybookRunComparisonMarkdown(contribution.toPlaybookRunComparison(syntheticRun, {
      ...syntheticRun,
      requestId: 'secret-redaction-run-next',
      diagnostics: [`right side ${rawGitHubToken}`]
    })),
    contribution.compactJson(syntheticRun)
  ].map(value => typeof value === 'string' ? value : JSON.stringify(value, null, 2)).join('\n');

  for (const raw of [rawOpenAiKey, rawBearer, rawGitHubToken, 'plain-text-password']) {
    assert.equal(exported.includes(raw), false, `Run export payload still contains '${raw}'`);
  }
  assert.ok(exported.includes(CYBERVINCI_REDACTED_SECRET), 'run exports should include redaction markers');
  assert.ok(exported.includes('"tokenCount": 10') || exported.includes('"tokenCount":10'), 'non-secret token counters should remain visible in run exports');

  assertSourceContains('src/browser/cybervinci-playbook-runtime.ts', [
    'redactCyberVinciSecrets',
    'localStorage.setItem(CYBERVINCI_PLAYBOOK_RUN_HISTORY_STORAGE_KEY, JSON.stringify(redactCyberVinciSecrets',
    'input: redactCyberVinciSecrets({ ...context.input })',
    'state: redactCyberVinciSecrets({ ...context.state })',
    'events: redactCyberVinciSecrets(context.events)'
  ]);
  assertSourceContains('src/browser/cybervinci-declarative-chat-agent-contribution.ts', [
    'redactCyberVinciSecrets',
    'toPlaybookRunArtifactsExport',
    'toPlaybookRunExport',
    'toPlaybookRunComparison',
    'const serialized = JSON.stringify(redactCyberVinciSecrets(value));'
  ]);

  console.log(JSON.stringify({
    ok: true,
    checked: [
      'sensitive key values are redacted recursively',
      'inline Authorization/Bearer/api_key/token strings are redacted',
      'token usage counters remain visible',
      'playbook runtime persists redacted checkpoints/history',
      'Run Viewer/Inspector JSON, Markdown, artifact, comparison, and compact exports redact synthetic secrets'
    ]
  }, null, 2));
}

main();
