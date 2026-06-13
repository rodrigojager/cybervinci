// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import * as chai from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import { CODEX_HOST_RPC_METHODS } from '../codex-host-protocol';
import { CHATGPT_COMMAND_IDS } from '../codex-commands';

const expect = chai.expect;

const repoRoot = path.resolve(__dirname, '../../../../..');
const packageRoot = path.resolve(__dirname, '../../..');

function readFirstExistingText(relativePaths: string[]): string {
    for (const relativePath of relativePaths) {
        const absolutePath = path.join(repoRoot, relativePath);
        if (fs.existsSync(absolutePath)) {
            return fs.readFileSync(absolutePath, 'utf8');
        }
    }
    throw new Error(`None of these files exist: ${relativePaths.join(', ')}`);
}

function readPackageText(relativePath: string): string {
    return fs.readFileSync(path.join(packageRoot, relativePath), 'utf8');
}

describe('codex UX contract', () => {
    it('registers official webview widget, backend bridge, and CyberVinci menu surface', () => {
        const frontendModule = readPackageText('src/browser/codex-frontend-module.ts');
        const contribution = readPackageText('src/browser/codex-sidebar-contribution.ts');
        const commands = readPackageText('src/common/codex-commands.ts');
        const backendModule = readPackageText('src/node/codex-backend-module.ts');
        const product = readFirstExistingText([
            'packages/branding/src/common/branding.ts',
            'packages/branding/src/common/cybervinci-product.ts',
            '../Branding/packages/branding/src/common/branding.ts',
            '../Branding/packages/branding/src/common/cybervinci-product.ts'
        ]);
        const browserApp = readFirstExistingText([
            'examples/browser/package.json',
            '../../Workload/theia/examples/browser/package.json'
        ]);

        expect(frontendModule).to.contain('bindViewContribution(bind, CodexSidebarContribution)');
        expect(frontendModule).to.contain('CodexWebviewWidget.ID');
        expect(frontendModule).to.contain('CodexWebviewHostService');
        expect(frontendModule).to.contain('CodexFrontendRpcService');
        expect(contribution).to.contain("area: 'right'");
        expect(contribution).to.contain('CyberVinciMenus.CODEX');
        expect(commands).to.contain("id: 'chatgpt.openSidebar'");
        expect(commands).to.contain("id: 'chatgpt.newChat'");
        expect(commands).to.contain("id: 'chatgpt.newCodexPanel'");
        expect(backendModule).to.contain('CodexWebviewStaticContribution');
        expect(backendModule).to.contain('CodexHostBackendServiceImpl');
        expect(product).to.contain("id: 'codex-sidebar'");
        expect(product).to.contain('@cybervinci/codex');
        expect(browserApp).to.contain('@cybervinci/codex');
    });

    it('covers RPC registry parity with protocol catalog', () => {
        const registry = readPackageText('src/common/codex-host-rpc-registry.ts');
        const protocol = readPackageText('src/common/codex-host-protocol.ts');
        expect(registry).to.contain('CODEX_HOST_RPC_METHODS');
        for (const method of CODEX_HOST_RPC_METHODS) {
            expect(protocol).to.contain(`'${method}'`);
        }
    });

    it('registers all chatgpt.* command ids', () => {
        const commandsSource = readPackageText('src/common/codex-commands.ts');
        for (const commandId of CHATGPT_COMMAND_IDS) {
            expect(commandsSource).to.contain(`'${commandId}'`);
        }
    });

    it('reuses CyberVinci AI Providers runtime instead of the disabled VS Code plugin host', () => {
        const hostService = readPackageText('src/node/codex-host-backend-service-impl.ts');
        const packageJson = readPackageText('package.json');

        expect(hostService).to.contain('CodexProviderService');
        expect(packageJson).to.contain('@cybervinci/ai-providers');
        expect(packageJson).not.to.contain('"OpenAI.chatgpt"');
        expect(packageJson).to.contain('copy:webview');
    });

    it('exposes CyberVinci Flow RPCs to the Codex host bridge', () => {
        const hostService = readPackageText('src/node/codex-host-backend-service-impl.ts');
        const protocol = readPackageText('src/common/codex-host-protocol.ts');
        const packageJson = readPackageText('package.json');

        expect(packageJson).to.contain('@cybervinci/flow');
        expect(hostService).to.contain('FlowService');
        expect(hostService).to.contain('@inject(FlowService) @optional()');
        for (const method of [
            'flow-list-workflows',
            'flow-list-workflow-patterns',
            'flow-ai-authoring-spec',
            'flow-create-workflow-from-ai-authoring-draft',
            'flow-plan-dynamic-workflow',
            'flow-start-workflow',
            'flow-run-dynamic-workflow'
        ]) {
            expect(protocol).to.contain(`'${method}'`);
            expect(hostService).to.contain(`case '${method}'`);
        }
        expect(hostService).to.contain('flow.startRun');
        expect(hostService).to.contain('flow.runDynamicWorkflow');
    });

    it('opens settings routes in a dedicated editor surface', () => {
        const shell = readPackageText('src/common/codex-webview-shell.ts');
        const host = readPackageText('src/browser/host/codex-webview-host-service.ts');
        const conversationEditor = readPackageText('src/browser/codex-conversation-editor-contribution.ts');
        const shim = readPackageText('src/common/codex-acquire-vscode-api-shim-content.ts');

        expect(shell).to.contain('codex-host-back-to-chat');
        expect(shell).to.contain("var SETTINGS_ROUTE = '/settings'");
        expect(shell).to.contain('supportsBackToChatControl');
        expect(shell).to.contain("viewKind === 'editor'");
        expect(shell).to.contain('window.acquireVsCodeApi().postMessage(message)');
        expect(shell).to.contain('codex-view-kind');
        expect(shell).to.contain('injectHostNavigationControl');
        expect(shim).to.contain('vscode-capn-rpc-message');
        expect(shim).to.contain('capnRpcServices');
        expect(shim).to.contain('relayHostMessageForOfficialRouter');
        expect(shim).to.contain('__codexShimRelayed');
        expect(host).to.contain('openSettingsRoute');
        expect(host).to.contain('isSurfaceOnSettingsRoute');
        expect(host).to.contain('setSurfaceRoute');
        expect(host).to.contain('message.section');
        expect(host).to.contain("'show-settings'");
        expect(host).to.contain("'navigate-to-route'");
        expect(conversationEditor).to.contain('openSettingsTab');

        const backend = readPackageText('src/node/codex-host-backend-service-impl.ts');
        expect(backend).to.contain("case 'get-settings'");
        expect(backend).to.contain("case 'get-setting'");
        expect(backend).to.contain("case 'set-setting'");
        expect(backend).to.contain("case 'get-copilot-api-proxy-info'");
        expect(backend).to.contain("case 'has-custom-cli-executable'");
        expect(backend).to.contain("case 'fast-mode-rollout-metrics'");
        expect(backend).to.contain('buildSettingsValues');
        expect(backend).to.contain('hasCustomCliExecutable');
    });

    it('implements current VS Code git and GitHub bridge methods instead of stubbing them', () => {
        const protocol = readPackageText('src/common/codex-host-protocol.ts');
        const frontendRpc = readPackageText('src/browser/codex-frontend-rpc-service.ts');
        const backend = readPackageText('src/node/codex-host-backend-service-impl.ts');
        const gitBridge = readPackageText('src/node/codex-git-bridge-service.ts');
        const worktrees = readPackageText('src/node/codex-git-worktree-service.ts');

        for (const method of [
            'git-checkout-branch',
            'apply-patch',
            'prepare-worktree-snapshot',
            'upload-worktree-snapshot',
            'gh-cli-status',
            'gh-current-user',
            'gh-pr-board',
            'gh-pr-status',
            'gh-pr-diff'
        ]) {
            expect(protocol).to.contain(`'${method}'`);
            expect(backend).to.contain(`case '${method}'`);
        }
        expect(frontendRpc).to.contain("case 'active-workspace-roots'");
        expect(frontendRpc).to.contain("case 'workspace-root-options'");
        expect(gitBridge).to.contain('async applyPatch');
        expect(gitBridge).to.contain('async ghPrBoard');
        expect(worktrees).to.contain('async prepareWorktreeSnapshot');
        expect(worktrees).to.contain('async uploadWorktreeSnapshot');
    });
});
