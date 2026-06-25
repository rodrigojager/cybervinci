#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const yaml = require('js-yaml');

const packageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageRoot, '..', '..', '..', '..');
const workloadServiceModulePath = path.join(repoRoot, 'Workload', 'theia', 'packages', 'cybervinci-ai-chat-experience', 'lib', 'node', 'cybervinci-agency-agent-service.js');
const localServiceModulePath = path.join(packageRoot, 'lib', 'node', 'cybervinci-agency-agent-service.js');
const isOverlayPackage = packageRoot.split(path.sep).includes('Modificacoes');
const serviceModulePath = (isOverlayPackage
  ? [workloadServiceModulePath, localServiceModulePath]
  : [localServiceModulePath, workloadServiceModulePath]
).find(candidate => fs.existsSync(candidate));

function readCatalogYaml(filePath) {
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

async function main() {
  assert.ok(serviceModulePath, 'Compiled cybervinci-agency-agent-service.js was not found. Run npm run compile in Workload/theia/packages/cybervinci-ai-chat-experience first.');
  const sourceCatalogRoot = path.join(packageRoot, 'config');
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cybervinci-ai-chat-catalog-'));
  const tempCatalogRoot = path.join(tempRoot, 'config');
  const tempAgentRoot = path.join(tempRoot, 'agency-agents');
  fs.cpSync(sourceCatalogRoot, tempCatalogRoot, { recursive: true });
  fs.mkdirSync(path.join(tempAgentRoot, 'engineering'), { recursive: true });
  fs.writeFileSync(path.join(tempAgentRoot, 'engineering', 'frontend-engineer.md'), [
    '---',
    'name: Frontend Engineer',
    'description: UI agent profile for smoke tests',
    '---',
    '# Frontend Engineer',
    '',
    'Builds and reviews user interfaces.'
  ].join('\n'), 'utf8');

  const previousCatalogDir = process.env.CYBERVINCI_AI_CHAT_CATALOG_DIR;
  const previousAgencyAgentsDir = process.env.CYBERVINCI_AGENCY_AGENTS_DIR;
  process.env.CYBERVINCI_AI_CHAT_CATALOG_DIR = tempCatalogRoot;
  process.env.CYBERVINCI_AGENCY_AGENTS_DIR = tempAgentRoot;
  try {
    const { CyberVinciAgencyAgentService } = require(serviceModulePath);
    const service = new CyberVinciAgencyAgentService();

    const profiles = await service.listAgents();
    const frontendProfile = profiles.find(agent => agent.id === 'engineering/frontend-engineer');
    assert.ok(frontendProfile, 'temporary markdown Agent profile must be listed.');
    assert.equal(frontendProfile.name, 'Frontend Engineer');
    assert.equal(frontendProfile.description, 'UI agent profile for smoke tests');
    assert.equal(frontendProfile.relativePath, 'engineering/frontend-engineer.md');

    const profilePath = await service.getAgentProfilePath(frontendProfile.id);
    assert.equal(profilePath.ok, true);
    assert.equal(profilePath.id, frontendProfile.id);
    assert.ok(profilePath.path.endsWith(path.join('engineering', 'frontend-engineer.md')));

    const duplicateProfile = await service.duplicateAgentProfileToUser(frontendProfile.id);
    assert.equal(duplicateProfile.ok, true);
    assert.equal(duplicateProfile.id, '_user/engineering/frontend-engineer');
    assert.ok(duplicateProfile.path.endsWith(path.join('_user', 'engineering', 'frontend-engineer.md')));
    assert.equal(fs.readFileSync(duplicateProfile.path, 'utf8').includes('Frontend Engineer'), true);
    const duplicateRead = await service.readAgent(duplicateProfile.id);
    assert.ok(duplicateRead, 'duplicated markdown Agent profile must be readable by id.');
    assert.equal(duplicateRead.relativePath, '_user/engineering/frontend-engineer.md');
    assert.equal(duplicateRead.content.includes('Builds and reviews user interfaces.'), true);

    const beforeMarketplace = await service.listMarketplaceItems();
    const nativeCopyBefore = beforeMarketplace.find(item => item.id === 'agent.cybervinci-native-copy');
    assert.ok(nativeCopyBefore, 'agent.cybervinci-native-copy marketplace item must exist.');
    assert.equal(nativeCopyBefore.installed, false);

    const installAgent = await service.installMarketplaceItem('agent.cybervinci-native-copy');
    assert.equal(installAgent.ok, true);
    assert.equal(installAgent.id, 'user.opencoder');
    assert.ok(installAgent.path.endsWith(path.join('user', 'agents', 'user-opencoder.yml')));
    assert.ok(installAgent.diagnostics.some(item => item.id === 'marketplace.install.audit'));
    assert.equal(installAgent.paths.length, 2);
    assert.ok(installAgent.paths.some(candidate => candidate.endsWith(path.join('user', 'agents', 'user-opencoder.yml'))));
    assert.ok(installAgent.paths.some(candidate => candidate.endsWith(path.join('user', 'playbooks', 'user-native-agent-opencoder.yml'))));
    assert.ok(fs.existsSync(installAgent.path));
    const installedAgentFile = readCatalogYaml(installAgent.path);
    assert.equal(installedAgentFile.agents[0].id, 'user.opencoder');
    assert.equal(installedAgentFile.agents[0].kind, 'delegate');
    assert.equal(installedAgentFile.agents[0].source, 'user');
    assert.equal(installedAgentFile.agents[0].sourceAgentId, 'OpenCoder');
    assert.equal(installedAgentFile.agents[0].preserveNative.invoke, false);
    assert.equal(installedAgentFile.agents[0].defaultPlaybook, 'user.native-agent.opencoder');
    assert.equal(installedAgentFile.agents[0].playbooks[0], 'user.native-agent.opencoder');
    assert.equal(installedAgentFile.agents[0].playbooks.includes('native-agent-delegate'), false);
    assert.deepEqual(installedAgentFile.agents[0].capabilityProfile.mcpPromptRefs, []);
    const installedAgentPlaybookPath = path.join(tempCatalogRoot, 'user', 'playbooks', 'user-native-agent-opencoder.yml');
    assert.ok(fs.existsSync(installedAgentPlaybookPath));
    const installedAgentPlaybookFile = readCatalogYaml(installedAgentPlaybookPath);
    assert.equal(installedAgentPlaybookFile.playbooks[0].id, 'user.native-agent.opencoder');
    assert.equal(installedAgentPlaybookFile.playbooks[0].source, 'user');
    assert.equal(installedAgentPlaybookFile.playbooks[0].states.some(state => state.id === 'invoke-native-agent' || state.tool === 'core.agent.invoke'), false);

    const installTool = await service.installMarketplaceItem('tool.playbook-flow-compiler');
    assert.equal(installTool.ok, true);
    assert.equal(installTool.id, 'user.core.playbook.compiletoflowdraft');
    assert.ok(installTool.path.endsWith(path.join('user', 'tools', 'user-core-playbook-compiletoflowdraft.yml')));
    const installedToolFile = readCatalogYaml(installTool.path);
    assert.equal(installedToolFile.tools[0].id, 'user.core.playbook.compiletoflowdraft');
    assert.equal(installedToolFile.tools[0].source, 'user');
    assert.equal(installedToolFile.tools[0].protected, false);
    assert.equal(installedToolFile.tools[0].exposeToModel, false);

    const installPlaybook = await service.installMarketplaceItem('playbook.ai-chat-flow-route');
    assert.equal(installPlaybook.ok, true);
    assert.equal(installPlaybook.id, 'user.ai-chat-flow-route');
    assert.ok(installPlaybook.path.endsWith(path.join('user', 'playbooks', 'user-ai-chat-flow-route.yml')));
    const installedPlaybookFile = readCatalogYaml(installPlaybook.path);
    assert.equal(installedPlaybookFile.playbooks[0].id, 'user.ai-chat-flow-route');
    assert.equal(installedPlaybookFile.playbooks[0].source, 'user');
    assert.equal(installedPlaybookFile.playbooks[0].enabled, true);

    const afterMarketplace = await service.listMarketplaceItems();
    assert.equal(afterMarketplace.find(item => item.id === 'agent.cybervinci-native-copy')?.installed, true);
    assert.equal(afterMarketplace.find(item => item.id === 'tool.playbook-flow-compiler')?.installed, true);
    assert.equal(afterMarketplace.find(item => item.id === 'playbook.ai-chat-flow-route')?.installed, true);

    const duplicateInstall = await service.installMarketplaceItem('agent.cybervinci-native-copy');
    assert.equal(duplicateInstall.ok, true);
    assert.equal(duplicateInstall.id, 'user.opencoder-2');
    assert.ok(duplicateInstall.path.endsWith(path.join('user', 'agents', 'user-opencoder-2.yml')));

    const duplicateGithubAgent = await service.duplicateCatalogItemToUser('agent', 'GitHub');
    assert.equal(duplicateGithubAgent.ok, true);
    assert.equal(duplicateGithubAgent.id, 'user.github');
    assert.ok(duplicateGithubAgent.path.endsWith(path.join('user', 'agents', 'user-github.yml')));
    assert.ok(duplicateGithubAgent.paths.some(candidate => candidate.endsWith(path.join('user', 'playbooks', 'user-native-agent-github.yml'))));
    const duplicatedGithubAgentFile = readCatalogYaml(duplicateGithubAgent.path);
    assert.equal(duplicatedGithubAgentFile.agents[0].sourceAgentId, 'GitHub');
    assert.deepEqual(duplicatedGithubAgentFile.agents[0].capabilityProfile.mcpPromptRefs, ['mcp_github_tools']);
    const deleteDuplicatedGithubPlaybook = await service.deleteUserCatalogItem('playbook', 'user.native-agent.github');
    assert.equal(deleteDuplicatedGithubPlaybook.ok, true);
    assert.equal(fs.existsSync(path.join(tempCatalogRoot, 'user', 'playbooks', 'user-native-agent-github.yml')), false);
    const deleteDuplicatedGithubAgent = await service.deleteUserCatalogItem('agent', duplicateGithubAgent.id);
    assert.equal(deleteDuplicatedGithubAgent.ok, true);
    assert.equal(fs.existsSync(duplicateGithubAgent.path), false);

    const runtimeAgentCopy = await service.createUserAgentCopy({
      version: 'cybervinci.agent/v1',
      id: 'Codex',
      name: 'Codex',
      kind: 'native',
      source: 'runtime',
      sourceAgentId: 'Codex',
      defaultPlaybook: 'native-agent.Codex',
      playbooks: ['native-agent.Codex'],
      capabilityProfile: {
        functions: ['codex.runtime.tool'],
        mcpPromptRefs: []
      },
      preserveNative: {
        invoke: false,
        modes: true,
        prompts: true,
        variables: true,
        functions: true,
        languageModelRequirements: true
      }
    });
    assert.equal(runtimeAgentCopy.ok, true);
    assert.equal(runtimeAgentCopy.id, 'user.codex');
    assert.ok(runtimeAgentCopy.path.endsWith(path.join('user', 'agents', 'user-codex.yml')));
    assert.equal(runtimeAgentCopy.paths.length, 2);
    assert.ok(runtimeAgentCopy.paths.some(candidate => candidate.endsWith(path.join('user', 'agents', 'user-codex.yml'))));
    assert.ok(runtimeAgentCopy.paths.some(candidate => candidate.endsWith(path.join('user', 'playbooks', 'user-native-agent-codex.yml'))));
    const runtimeAgentFile = readCatalogYaml(runtimeAgentCopy.path);
    assert.equal(runtimeAgentFile.agents[0].id, 'user.codex');
    assert.equal(runtimeAgentFile.agents[0].kind, 'delegate');
    assert.equal(runtimeAgentFile.agents[0].source, 'user');
    assert.equal(runtimeAgentFile.agents[0].sourceAgentId, 'Codex');
    assert.equal(runtimeAgentFile.agents[0].preserveNative.invoke, false);
    assert.equal(runtimeAgentFile.agents[0].defaultPlaybook, 'user.native-agent.codex');
    assert.equal(runtimeAgentFile.agents[0].playbooks[0], 'user.native-agent.codex');
    assert.deepEqual(runtimeAgentFile.agents[0].capabilityProfile.functions, ['codex.runtime.tool']);
    assert.deepEqual(runtimeAgentFile.agents[0].capabilityProfile.mcpPromptRefs, []);
    const runtimeAgentPlaybookPath = path.join(tempCatalogRoot, 'user', 'playbooks', 'user-native-agent-codex.yml');
    assert.ok(fs.existsSync(runtimeAgentPlaybookPath));
    const runtimeAgentPlaybookFile = readCatalogYaml(runtimeAgentPlaybookPath);
    assert.equal(runtimeAgentPlaybookFile.playbooks[0].id, 'user.native-agent.codex');
    assert.equal(runtimeAgentPlaybookFile.playbooks[0].source, 'user');
    assert.equal(runtimeAgentPlaybookFile.playbooks[0].states.some(state => state.id === 'invoke-native-agent' || state.tool === 'core.agent.invoke'), false);

    const duplicateToolToUser = await service.duplicateCatalogItemToUser('tool', 'core.agent.describe');
    assert.equal(duplicateToolToUser.ok, true);
    assert.equal(duplicateToolToUser.id, 'user.core.agent.describe');
    assert.ok(duplicateToolToUser.path.endsWith(path.join('user', 'tools', 'user-core-agent-describe.yml')));
    const duplicatedToolFile = readCatalogYaml(duplicateToolToUser.path);
    assert.equal(duplicatedToolFile.tools[0].id, 'user.core.agent.describe');
    assert.equal(duplicatedToolFile.tools[0].source, 'user');
    assert.equal(duplicatedToolFile.tools[0].protected, false);
    assert.equal(duplicatedToolFile.tools[0].implementation, 'host');
    const deleteDuplicatedTool = await service.deleteUserCatalogItem('tool', duplicateToolToUser.id);
    assert.equal(deleteDuplicatedTool.ok, true);
    assert.equal(fs.existsSync(duplicateToolToUser.path), false);

    const duplicatePlaybookToUser = await service.duplicateCatalogItemToUser('playbook', 'direct-chat');
    assert.equal(duplicatePlaybookToUser.ok, true);
    assert.equal(duplicatePlaybookToUser.id, 'user.direct-chat');
    assert.ok(duplicatePlaybookToUser.path.endsWith(path.join('user', 'playbooks', 'user-direct-chat.yml')));
    const duplicatedPlaybookFile = readCatalogYaml(duplicatePlaybookToUser.path);
    assert.equal(duplicatedPlaybookFile.playbooks[0].id, 'user.direct-chat');
    assert.equal(duplicatedPlaybookFile.playbooks[0].source, 'user');
    const deleteDuplicatedPlaybook = await service.deleteUserCatalogItem('playbook', duplicatePlaybookToUser.id);
    assert.equal(deleteDuplicatedPlaybook.ok, true);
    assert.equal(fs.existsSync(duplicatePlaybookToUser.path), false);

    const commandPolicyToolPath = path.join(tempCatalogRoot, 'user', 'tools', 'command-policy-smoke.yml');
    fs.mkdirSync(path.dirname(commandPolicyToolPath), { recursive: true });
    fs.writeFileSync(commandPolicyToolPath, yaml.dump({
      tools: [
        {
          version: 'cybervinci.tool/v1',
          id: 'user.command.policy.allowed',
          name: 'Command Policy Allowed',
          source: 'user',
          implementation: 'command',
          command: 'node',
          args: ['-e', "process.stdout.write('policy-ok')"],
          cwd: tempRoot,
          policy: {
            allowedCommands: ['node'],
            allowedPaths: [tempRoot],
            deniedPaths: [path.join(tempRoot, 'blocked')]
          }
        },
        {
          version: 'cybervinci.tool/v1',
          id: 'user.command.policy.denied',
          name: 'Command Policy Denied',
          source: 'user',
          implementation: 'command',
          command: 'node',
          args: ['-e', "process.stdout.write('should-not-run')"],
          cwd: tempRoot,
          policy: {
            allowedCommands: ['node'],
            deniedPaths: [tempRoot]
          }
        },
        {
          version: 'cybervinci.tool/v1',
          id: 'user.command.policy.outside-allowed',
          name: 'Command Policy Outside Allowed',
          source: 'user',
          implementation: 'command',
          command: 'node',
          args: ['-e', "process.stdout.write('should-not-run')"],
          cwd: tempRoot,
          policy: {
            allowedCommands: ['node'],
            allowedPaths: [path.join(tempRoot, 'different-root')]
          }
        }
      ]
    }), 'utf8');
    const commandPolicyAllowed = await service.executeDeclarativeTool('user.command.policy.allowed', '{}');
    assert.equal(commandPolicyAllowed.exitCode, 0);
    assert.equal(commandPolicyAllowed.stdout, 'policy-ok');
    await assert.rejects(
      () => service.executeDeclarativeTool('user.command.policy.denied', '{}'),
      /policy\.deniedPaths/
    );
    await assert.rejects(
      () => service.executeDeclarativeTool('user.command.policy.outside-allowed', '{}'),
      /policy\.allowedPaths/
    );

    const createToolOverride = await service.createSystemOverride('tool', 'core.agent.describe');
    assert.equal(createToolOverride.ok, true);
    assert.equal(createToolOverride.id, 'core.agent.describe');
    assert.ok(createToolOverride.path.endsWith(path.join('system-overrides', 'tools', 'core-agent-describe.yml')));
    const overrideToolFile = readCatalogYaml(createToolOverride.path);
    assert.equal(overrideToolFile.tools[0].id, 'core.agent.describe');
    assert.equal(overrideToolFile.tools[0].source, 'system-override');
    assert.equal(overrideToolFile.tools[0].protected, true);
    assert.ok(fs.existsSync(createToolOverride.path));

    const restoreToolOverride = await service.restoreSystemOverride('tool', 'core.agent.describe');
    assert.equal(restoreToolOverride.ok, true);
    assert.equal(fs.existsSync(createToolOverride.path), false);

    const assignSystemAgentPlaybook = await service.assignAgentDefaultPlaybook('OpenCoder', 'canvas-design-qa');
    assert.equal(assignSystemAgentPlaybook.ok, true);
    assert.ok(assignSystemAgentPlaybook.path.endsWith(path.join('system-overrides', 'agents', 'opencoder.yml')));
    const systemAgentOverrideFile = readCatalogYaml(assignSystemAgentPlaybook.path);
    assert.equal(systemAgentOverrideFile.agents[0].id, 'OpenCoder');
    assert.equal(systemAgentOverrideFile.agents[0].source, 'system-override');
    assert.equal(systemAgentOverrideFile.agents[0].defaultPlaybook, 'canvas-design-qa');
    assert.equal(systemAgentOverrideFile.agents[0].playbooks[0], 'canvas-design-qa');

    const assignUserAgentPlaybook = await service.assignAgentDefaultPlaybook('user.opencoder', 'ai-chat-flow-route');
    assert.equal(assignUserAgentPlaybook.ok, true);
    assert.equal(assignUserAgentPlaybook.path, installAgent.path);
    const userAgentFile = readCatalogYaml(assignUserAgentPlaybook.path);
    assert.equal(userAgentFile.agents[0].id, 'user.opencoder');
    assert.equal(userAgentFile.agents[0].source, 'user');
    assert.equal(userAgentFile.agents[0].defaultPlaybook, 'ai-chat-flow-route');
    assert.equal(userAgentFile.agents[0].playbooks[0], 'ai-chat-flow-route');

    const nonCatalogMarketplacePath = path.join(tempCatalogRoot, 'marketplace', 'non-catalog.yml');
    fs.writeFileSync(nonCatalogMarketplacePath, yaml.dump({
      marketplace: [
        {
          id: 'flow.saved-triage-smoke',
          name: 'Saved Triage Flow Smoke',
          collection: 'flows',
          installTarget: {
            kind: 'flow',
            id: 'saved-triage-flow',
            action: 'duplicate-to-user'
          }
        },
        {
          id: 'skill.issue-diagnosis-smoke',
          name: 'Issue Diagnosis Skill Smoke',
          collection: 'skills',
          installTarget: {
            kind: 'skill',
            id: 'issue-diagnosis',
            action: 'duplicate-to-user'
          }
        },
        {
          id: 'canvas.qa-pack-smoke',
          name: 'Canvas QA Pack Smoke',
          collection: 'canvas-qa-packs',
          installTarget: {
            kind: 'canvas-qa-pack',
            id: 'qa-pack-smoke',
            action: 'duplicate-to-user'
          }
        }
      ]
    }), 'utf8');
    const nonCatalogBefore = await service.listMarketplaceItems();
    assert.equal(nonCatalogBefore.find(item => item.id === 'flow.saved-triage-smoke')?.installed, false);

    const installFlow = await service.installMarketplaceItem('flow.saved-triage-smoke');
    assert.equal(installFlow.ok, true);
    assert.equal(installFlow.id, 'flow.saved-triage-smoke');
    assert.ok(installFlow.path.endsWith(path.join('user', 'flows', 'flow-saved-triage-smoke.yml')));
    const installedFlowFile = readCatalogYaml(installFlow.path);
    assert.equal(installedFlowFile.marketplaceInstalls[0].id, 'flow.saved-triage-smoke');
    assert.equal(installedFlowFile.marketplaceInstalls[0].installTarget.kind, 'flow');
    assert.equal(installedFlowFile.marketplaceInstalls[0].installTarget.id, 'saved-triage-flow');

    const installSkill = await service.installMarketplaceItem('skill.issue-diagnosis-smoke');
    assert.equal(installSkill.ok, true);
    assert.ok(installSkill.path.endsWith(path.join('user', 'skills', 'skill-issue-diagnosis-smoke.yml')));

    const installCanvasQaPack = await service.installMarketplaceItem('canvas.qa-pack-smoke');
    assert.equal(installCanvasQaPack.ok, true);
    assert.ok(installCanvasQaPack.path.endsWith(path.join('user', 'canvas-qa-packs', 'canvas-qa-pack-smoke.yml')));

    const nonCatalogAfter = await service.listMarketplaceItems();
    assert.equal(nonCatalogAfter.find(item => item.id === 'flow.saved-triage-smoke')?.installed, true);
    assert.equal(nonCatalogAfter.find(item => item.id === 'skill.issue-diagnosis-smoke')?.installed, true);
    assert.equal(nonCatalogAfter.find(item => item.id === 'canvas.qa-pack-smoke')?.installed, true);

    const marketplaceAuditPath = path.join(tempCatalogRoot, 'user', 'audit', 'marketplace-installs.yml');
    assert.ok(fs.existsSync(marketplaceAuditPath), 'marketplace install audit log must be written.');
    const marketplaceAuditFile = readCatalogYaml(marketplaceAuditPath);
    assert.equal(marketplaceAuditFile.version, 'cybervinci.marketplace-install-audit/v1');
    assert.ok(Array.isArray(marketplaceAuditFile.marketplaceInstallAudit));
    assert.ok(marketplaceAuditFile.marketplaceInstallAudit.length >= 7);
    const auditByItem = new Map(marketplaceAuditFile.marketplaceInstallAudit.map(record => [record.marketplaceItemId, record]));
    for (const itemId of [
      'agent.cybervinci-native-copy',
      'tool.playbook-flow-compiler',
      'playbook.ai-chat-flow-route',
      'flow.saved-triage-smoke',
      'skill.issue-diagnosis-smoke',
      'canvas.qa-pack-smoke'
    ]) {
      const auditRecord = auditByItem.get(itemId);
      assert.ok(auditRecord, `marketplace audit must include ${itemId}`);
      assert.match(auditRecord.marketplaceItemSha256, /^[a-f0-9]{64}$/);
      assert.match(auditRecord.outputFileSha256, /^[a-f0-9]{64}$/);
      assert.equal(auditRecord.marketplaceItemSignature, `sha256:${auditRecord.marketplaceItemSha256}`);
      assert.equal(auditRecord.outputFileSignature, `sha256:${auditRecord.outputFileSha256}`);
      assert.ok(auditRecord.outputPath);
      assert.ok(auditRecord.installedAt);
      assert.ok(auditRecord.installTarget?.kind);
    }
    const agentAuditRecords = marketplaceAuditFile.marketplaceInstallAudit.filter(record => record.marketplaceItemId === 'agent.cybervinci-native-copy');
    assert.ok(agentAuditRecords.length >= 2, 'duplicate marketplace installs must append audit records.');
    assert.ok(agentAuditRecords.some(record => record.outputPath.endsWith('user/agents/user-opencoder.yml')));
    assert.ok(agentAuditRecords.some(record => record.outputPath.endsWith('user/agents/user-opencoder-2.yml')));

    const badUserCatalogPath = path.join(tempCatalogRoot, 'user', 'catalog-protection-smoke.yml');
    fs.writeFileSync(badUserCatalogPath, yaml.dump({
      agents: [
        {
          version: 'cybervinci.agent/v1',
          id: 'OpenCoder',
          name: 'Bad User OpenCoder Override',
          kind: 'native',
          source: 'user',
          sourceAgentId: 'OpenCoder'
        }
      ],
      playbooks: [
        {
          version: 'cybervinci.playbook/v1',
          id: 'direct-chat',
          name: 'Bad User Direct Chat Override',
          source: 'user',
          entry: 'done',
          states: [{ id: 'done', type: 'end' }]
        }
      ]
    }), 'utf8');
    const missingOverridePath = path.join(tempCatalogRoot, 'system-overrides', 'catalog-protection-smoke.yml');
    fs.writeFileSync(missingOverridePath, yaml.dump({
      agents: [
        {
          version: 'cybervinci.agent/v1',
          id: 'MissingSystemAgent',
          name: 'Missing System Agent',
          kind: 'native',
          source: 'system-override',
          sourceAgentId: 'MissingSystemAgent'
        }
      ],
      playbooks: [
        {
          version: 'cybervinci.playbook/v1',
          id: 'missing-system-playbook',
          name: 'Missing System Playbook',
          source: 'system-override',
          entry: 'done',
          states: [{ id: 'done', type: 'end' }]
        }
      ],
      tools: [
        {
          version: 'cybervinci.tool/v1',
          id: 'system.missingTool',
          name: 'Missing System Tool',
          kind: 'tool',
          source: 'system-override',
          implementation: 'host'
        }
      ]
    }), 'utf8');
    const protectedManifest = await service.getDeclarativeChatAgentManifest();
    assert.notEqual(protectedManifest.agents.find(agent => agent.id === 'OpenCoder')?.name, 'Bad User OpenCoder Override');
    assert.equal(protectedManifest.agents.some(agent => agent.id === 'MissingSystemAgent'), false);
    assert.notEqual(protectedManifest.playbooks.find(playbook => playbook.id === 'direct-chat')?.name, 'Bad User Direct Chat Override');
    assert.equal(protectedManifest.playbooks.some(playbook => playbook.id === 'missing-system-playbook'), false);
    assert.equal(protectedManifest.tools.some(tool => tool.id === 'system.missingTool'), false);
    assert.ok(protectedManifest.diagnostics.some(diagnostic => diagnostic.message === "User agent 'OpenCoder' must use the user.* namespace."));
    assert.ok(protectedManifest.diagnostics.some(diagnostic => diagnostic.message === "User playbook 'direct-chat' must use the user.* namespace."));
    assert.ok(protectedManifest.diagnostics.some(diagnostic => diagnostic.message === "System override 'MissingSystemAgent' ignored because there is no bundled agent with that id."));
    assert.ok(protectedManifest.diagnostics.some(diagnostic => diagnostic.message === "System override 'missing-system-playbook' ignored because there is no bundled playbook with that id."));
    assert.ok(protectedManifest.diagnostics.some(diagnostic => diagnostic.message === "System override 'system.missingTool' ignored because there is no bundled tool with that id."));

    const brokenReferencePath = path.join(tempCatalogRoot, 'user', 'broken-reference-smoke.yml');
    fs.writeFileSync(brokenReferencePath, yaml.dump({
      agents: [
        {
          version: 'cybervinci.agent/v1',
          id: 'user.broken.references',
          name: 'Broken Reference Agent',
          kind: 'delegate',
          source: 'user',
          sourceAgentId: 'OpenCoder',
          defaultPlaybook: 'user.missing.default-playbook',
          playbooks: ['user.missing.playbook'],
          tools: ['user.missing.agent-tool'],
          capabilityProfile: {
            tools: [{ id: 'user.missing.capability-tool' }],
            guards: [{ id: 'user.missing.capability-guard' }]
          }
        }
      ],
      tools: [
        {
          version: 'cybervinci.tool/v1',
          id: 'user.broken.composite',
          name: 'Broken Composite Tool',
          kind: 'tool',
          source: 'user',
          implementation: 'composite',
          steps: [{ id: 'missing-step', tool: 'user.missing.step-tool' }]
        }
      ],
      playbooks: [
        {
          version: 'cybervinci.playbook/v1',
          id: 'user.broken.playbook',
          name: 'Broken Reference Playbook',
          source: 'user',
          entry: 'missing-tool',
          tools: ['user.missing.playbook-tool'],
          guards: ['user.missing.playbook-guard'],
          uses: {
            tools: ['user.missing.uses-tool'],
            guards: ['user.missing.uses-guard']
          },
          states: [
            { id: 'missing-tool', type: 'tool', tool: 'user.missing.state-tool', transitions: [{ to: 'missing-guard' }] },
            { id: 'missing-guard', type: 'guard', guard: 'user.missing.state-guard', onFail: 'missing-child' },
            { id: 'missing-child', type: 'playbook', playbook: 'user.missing.child-playbook', transitions: [{ to: 'done' }] },
            { id: 'done', type: 'end' }
          ]
        }
      ]
    }), 'utf8');
    const brokenReferenceManifest = await service.getDeclarativeChatAgentManifest();
    assert.ok(brokenReferenceManifest.agents.some(agent => agent.id === 'user.broken.references'));
    assert.ok(brokenReferenceManifest.tools.some(tool => tool.id === 'user.broken.composite'));
    assert.ok(brokenReferenceManifest.playbooks.some(playbook => playbook.id === 'user.broken.playbook'));
    for (const message of [
      "Agent 'user.broken.references' defaultPlaybook 'user.missing.default-playbook' does not exist.",
      "Agent 'user.broken.references' references missing playbook 'user.missing.playbook'.",
      "Agent 'user.broken.references' references missing tool 'user.missing.agent-tool'.",
      "Agent 'user.broken.references' capabilityProfile references missing tool 'user.missing.capability-tool'.",
      "Agent 'user.broken.references' capabilityProfile references missing tool 'user.missing.capability-guard'.",
      "Composite tool 'user.broken.composite' references missing step tool 'user.missing.step-tool'.",
      "Playbook 'user.broken.playbook' references missing tool 'user.missing.playbook-tool'.",
      "Playbook 'user.broken.playbook' references missing tool 'user.missing.playbook-guard'.",
      "Playbook 'user.broken.playbook' references missing tool 'user.missing.uses-tool'.",
      "Playbook 'user.broken.playbook' references missing tool 'user.missing.uses-guard'.",
      "Playbook 'user.broken.playbook' state 'missing-tool' references missing tool 'user.missing.state-tool'.",
      "Playbook 'user.broken.playbook' state 'missing-guard' references missing tool 'user.missing.state-guard'.",
      "Playbook 'user.broken.playbook' state 'missing-child' references missing playbook 'user.missing.child-playbook'."
    ]) {
      assert.ok(brokenReferenceManifest.diagnostics.some(diagnostic => diagnostic.message === message), `Expected diagnostic: ${message}`);
    }

    console.log(JSON.stringify({
      ok: true,
      checked: [
        'marketplace installs editable user agent copies',
        'marketplace installs editable user tool copies',
        'marketplace installs editable user playbook copies',
        'marketplace installed state updates from user catalog',
        'marketplace duplicate installs get unique user ids',
        'marketplace installs append SHA-256 audit records',
        'manager converts runtime-only native agents to editable delegate user files',
        'manager materializes editable Playbooks for copied native agents',
        'runtime native agent copies get editable user Playbooks instead of memory-only generated defaults',
        'native and runtime agent copies preserve declared capability profiles',
        'manager duplicates bundled items to editable user catalog files',
        'manager deletes editable user catalog copies for agents, tools, and playbooks',
        'command tools enforce policy allowedPaths and deniedPaths',
        'manager creates editable system override files',
        'manager restores bundled definitions by deleting system override files',
        'manager assigns playbooks to bundled agents through system overrides',
        'manager assigns playbooks to editable user agent files',
        'marketplace installs editable non-catalog flow metadata',
        'marketplace installs editable non-catalog skill metadata',
        'marketplace installs editable non-catalog Canvas QA pack metadata',
        'catalog ignores user agent and playbook shadowing outside user namespace',
        'catalog ignores system overrides that do not target bundled ids',
        'catalog reports broken agent, tool, and playbook references without removing editable items',
        'agent selector service resolves Agent markdown profile paths',
        'agent selector service duplicates Agent markdown profiles into editable _user files'
      ]
    }, null, 2));
  } finally {
    if (previousCatalogDir === undefined) {
      delete process.env.CYBERVINCI_AI_CHAT_CATALOG_DIR;
    } else {
      process.env.CYBERVINCI_AI_CHAT_CATALOG_DIR = previousCatalogDir;
    }
    if (previousAgencyAgentsDir === undefined) {
      delete process.env.CYBERVINCI_AGENCY_AGENTS_DIR;
    } else {
      process.env.CYBERVINCI_AGENCY_AGENTS_DIR = previousAgencyAgentsDir;
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
