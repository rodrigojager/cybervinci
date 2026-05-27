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

function readText(relativePath: string): string {
    return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
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
        const product = readText('packages/branding/src/common/cybervinci-product.ts');
        const browserApp = readText('examples/browser/package.json');

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

    it('reuses Codex Provider runtime instead of the disabled VS Code plugin host', () => {
        const hostService = readPackageText('src/node/codex-host-backend-service-impl.ts');
        const packageJson = readPackageText('package.json');

        expect(hostService).to.contain('CodexProviderService');
        expect(packageJson).to.contain('@cybervinci/codex-provider');
        expect(packageJson).not.to.contain('"OpenAI.chatgpt"');
        expect(packageJson).to.contain('copy:webview');
    });
});
