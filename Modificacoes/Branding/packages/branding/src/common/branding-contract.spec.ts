// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import {
    CYBERVINCI_MENU_ITEMS,
    CYBERVINCI_COMMERCIAL_BOUNDARIES,
    CYBERVINCI_CORE_PATCH_BOUNDARIES,
    CYBERVINCI_PRODUCT_FEATURES,
    CYBERVINCI_PRODUCT_NAME,
    CYBERVINCI_REGRESSION_GATES,
    CyberVinciCommandIds,
    CyberVinciMenus
} from './branding';

const repoRoot = path.resolve(__dirname, '../../../..');

function readJson<T>(relativePath: string): T {
    return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')) as T;
}

function readText(relativePath: string): string {
    return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function pathExists(relativePath: string): boolean {
    return fs.existsSync(path.join(repoRoot, relativePath));
}

function collectPackageJsonFiles(relativePath: string): string[] {
    const absolutePath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
        return [];
    }
    const stats = fs.statSync(absolutePath);
    if (stats.isFile()) {
        return path.basename(relativePath) === 'package.json' ? [relativePath] : [];
    }
    const files: string[] = [];
    for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
        if (entry.isDirectory() && ['lib', 'node_modules', 'dist', '.cache', 'src-gen'].includes(entry.name)) {
            continue;
        }
        const entryRelativePath = path.join(relativePath, entry.name).replace(/\\/g, '/');
        if (entry.isDirectory()) {
            files.push(...collectPackageJsonFiles(entryRelativePath));
        } else if (entry.name === 'package.json') {
            files.push(entryRelativePath);
        }
    }
    return files;
}

function collectTextFiles(relativePath: string): string[] {
    const absolutePath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
        return [];
    }
    const stats = fs.statSync(absolutePath);
    if (stats.isFile()) {
        return [relativePath];
    }
    const files: string[] = [];
    for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
        const entryRelativePath = path.join(relativePath, entry.name).replace(/\\/g, '/');
        if (entry.isDirectory()) {
            if (['lib', 'node_modules', 'dist', '.cache', 'src-gen'].includes(entry.name)) {
                continue;
            }
            files.push(...collectTextFiles(entryRelativePath));
        } else if (/\.(ts|tsx|js|json|md|css|html)$/.test(entry.name)) {
            files.push(entryRelativePath);
        }
    }
    return files;
}

describe('CyberVinci product shell contract', () => {
    it('owns the stable top-level product identity and menu path', () => {
        expect(CYBERVINCI_PRODUCT_NAME).to.equal('CyberVinci');
        expect(CyberVinciMenus.CYBERVINCI.join('/')).to.equal('menubar/0_cybervinci');
        expect(CyberVinciMenus.AI_CHAT.join('/')).to.equal('menubar/0_cybervinci/1_ai_chat');
        expect(CyberVinciMenus.OPENPENCIL.join('/')).to.equal('menubar/0_cybervinci/2_openpencil');
        expect(CyberVinciMenus.DOCUMENTATION.join('/')).to.equal('menubar/0_cybervinci/3_documentation');
        expect(CyberVinciMenus.MEMORY.join('/')).to.equal('menubar/0_cybervinci/4_memory');
        expect(CyberVinciMenus.ARENA.join('/')).to.equal('menubar/0_cybervinci/5_arena');
        expect(CyberVinciMenus.FLOW.join('/')).to.equal('menubar/0_cybervinci/6_flow');
    });

    it('owns shared CyberVinci command ids used by branded entry points', () => {
        expect(CyberVinciCommandIds.OPEN_CHAT).to.equal('ai-chat-ui.new-chat');
        expect(CyberVinciCommandIds.ARENA_NEW_DUEL).to.equal('arena.newDuel');
        expect(CyberVinciCommandIds.DOCUMENTATION_MANAGER).to.equal('library.open-manager');
        expect(CyberVinciCommandIds.FLOW_OPEN).to.equal('flow.open');
        expect(readText('packages/branding/src/browser/branding-contribution.ts')).to.contain('CyberVinciMenus.AI_CHAT');
        expect(readText('packages/branding/src/browser/branding-contribution.ts')).to.contain('CyberVinciCommandIds.OPEN_CHAT');
    });

    it('owns CyberVinci menu display names and VS Code-style icon ids', () => {
        expect(CYBERVINCI_MENU_ITEMS.AI_CHAT).to.deep.equal({ label: 'AI Chat', icon: 'message-circle', iconClass: 'cybervinci-product-icon cybervinci-product-icon-message-circle' });
        expect(CYBERVINCI_MENU_ITEMS.CODEX).to.deep.equal({ label: 'Codex', icon: 'codex', iconClass: 'cybervinci-product-icon cybervinci-product-icon-codex' });
        expect(CYBERVINCI_MENU_ITEMS.OPENPENCIL).to.deep.equal({ label: 'Canvas', icon: 'paintbrush', iconClass: 'cybervinci-product-icon cybervinci-product-icon-paintbrush' });
        expect(CYBERVINCI_MENU_ITEMS.DOCUMENTATION).to.deep.equal({ label: 'Library', icon: 'book-open', iconClass: 'cybervinci-product-icon cybervinci-product-icon-book-open' });
        expect(CYBERVINCI_MENU_ITEMS.MEMORY).to.deep.equal({ label: 'Memory', icon: 'brain', iconClass: 'cybervinci-product-icon cybervinci-product-icon-brain' });
        expect(CYBERVINCI_MENU_ITEMS.ARENA).to.deep.equal({ label: 'Arena', icon: 'swords', iconClass: 'cybervinci-product-icon cybervinci-product-icon-swords' });
        expect(CYBERVINCI_MENU_ITEMS.FLOW).to.deep.equal({ label: 'Flow', icon: 'workflow', iconClass: 'cybervinci-product-icon cybervinci-product-icon-workflow' });
        expect(CYBERVINCI_MENU_ITEMS.BUILDER).to.deep.equal({ label: 'Builder', icon: 'brick-wall', iconClass: 'cybervinci-product-icon cybervinci-product-icon-brick-wall' });
    });

    it('keeps every CyberVinci product feature as an explicit extension or host customization', () => {
        const ids = CYBERVINCI_PRODUCT_FEATURES.map(feature => feature.id);
        expect(ids).to.include.members([
            'branding',
            'memory',
            'memory-roslyn',
            'documentation-manager',
            'arena',
            'flow',
            'openpencil',
            'builder',
            'ai-ide-product-chat',
            'codex-provider-provider',
            'codex-sidebar',
            'welcome-branding'
        ]);

        for (const feature of CYBERVINCI_PRODUCT_FEATURES) {
            expect(pathExists(feature.packagePath), feature.packagePath).to.equal(true);
            const packageJsonPath = `${feature.packagePath}/package.json`;
            expect(pathExists(packageJsonPath), packageJsonPath).to.equal(true);
            const packageJson = readJson<{ name: string; theiaExtensions?: unknown[] }>(packageJsonPath);
            expect(packageJson.name).to.equal(feature.packageName);
            if (feature.category !== 'host-customization') {
                expect(packageJson.theiaExtensions, `${feature.packageName} must remain a Theia extension package`).to.be.an('array').that.is.not.empty;
            }
        }
    });

    it('keeps the Builder Builder optional even when the development host apps install it for validation', () => {
        const browserPackage = readJson<{ dependencies: Record<string, string> }>('examples/browser/package.json');
        const electronPackage = readJson<{ dependencies: Record<string, string> }>('examples/electron/package.json');
        const builderPackage = readJson<{ name: string; theiaExtensions?: Array<{ frontend?: string; backend?: string }> }>(
            'packages/builder/package.json'
        );
        const builderFeature = CYBERVINCI_PRODUCT_FEATURES.find(feature => feature.id === 'builder');

        expect(builderFeature).to.not.equal(undefined);
        expect(builderFeature?.category).to.equal('optional-extension');
        expect(builderFeature?.requiredInBrowserApp).to.equal(false);
        expect(builderFeature?.requiredInElectronApp).to.equal(false);
        expect(browserPackage.dependencies).to.have.property('@cybervinci/builder', '1.71.0');
        expect(electronPackage.dependencies).to.have.property('@cybervinci/builder', '1.71.0');
        expect(builderPackage.name).to.equal('@cybervinci/builder');
        expect(builderPackage.theiaExtensions).to.deep.equal([{
            frontend: 'lib/browser/builder-frontend-module',
            backend: 'lib/node/builder-backend-module'
        }]);
    });

    it('keeps future paid, Pro, and marketplace UI Builder logic behind commercial boundaries', () => {
        const freeCore = CYBERVINCI_COMMERCIAL_BOUNDARIES.find(boundary => boundary.id === 'cybervinci-free-core');
        const privateBuilder = CYBERVINCI_COMMERCIAL_BOUNDARIES.find(boundary => boundary.id === 'cybervinci-ui-builder-private');
        const marketplaceBuilder = CYBERVINCI_COMMERCIAL_BOUNDARIES.find(boundary => boundary.id === 'cybervinci-ui-builder-marketplace');

        expect(freeCore?.edition).to.equal('free-core');
        expect(freeCore?.packageNames).to.not.include('@cybervinci/builder');
        expect(freeCore?.coreRestrictions.join('\n')).to.contain('Must not depend on Builder Builder packages');
        expect(freeCore?.coreRestrictions.join('\n')).to.contain('optional install hints');

        expect(privateBuilder?.edition).to.equal('private-extension');
        expect(privateBuilder?.packageNames).to.include.members([
            '@cybervinci/builder',
            '@cybervinci/builder-editor-puck',
            '@cybervinci/builder-property-panel-rjsf',
            '@cybervinci/builder-ai',
            '@cybervinci/builder-export-html',
            '@cybervinci/builder-export-react'
        ]);
        expect(privateBuilder?.owns.join('\n')).to.contain('premium templates');
        expect(privateBuilder?.coreRestrictions.join('\n')).to.contain('commercial runtime checks');
        expect(privateBuilder?.installModel).to.equal('private-distribution');

        expect(marketplaceBuilder?.edition).to.equal('marketplace-extension');
        expect(marketplaceBuilder?.installModel).to.equal('marketplace-install');
        expect(marketplaceBuilder?.coreRestrictions.join('\n')).to.contain('not require CyberVinci core to import UI Builder source packages');
    });

    it('keeps paid UI Builder dependencies out of the free CyberVinci core boundary', () => {
        const inspectedPackageRoots = [
            'packages/core',
            'packages/branding',
            'packages/openpencil-cybervinci-extension',
            'examples/browser',
            'examples/electron',
            'examples/browser-only'
        ];
        const allowedPackageJsonFiles = new Set([
            'packages/branding/package.json',
            'examples/browser/package.json',
            'examples/electron/package.json'
        ]);
        const forbiddenDependencies = new Set([
            '@cybervinci/builder',
            '@cybervinci/builder-editor-puck',
            '@cybervinci/builder-property-panel-rjsf',
            '@cybervinci/builder-ai',
            '@cybervinci/builder-export-html',
            '@cybervinci/builder-export-react',
            '@measured/puck',
            'puck',
            '@rjsf/core',
            '@rjsf/validator-ajv8'
        ]);
        const forbiddenDependencyMatches = inspectedPackageRoots.flatMap(root => collectPackageJsonFiles(root))
            .filter(file => !allowedPackageJsonFiles.has(file))
            .flatMap(file => {
                const packageJson = readJson<{
                    dependencies?: Record<string, string>;
                    devDependencies?: Record<string, string>;
                    peerDependencies?: Record<string, string>;
                    optionalDependencies?: Record<string, string>;
                }>(file);
                const dependencyNames = [
                    ...Object.keys(packageJson.dependencies ?? {}),
                    ...Object.keys(packageJson.devDependencies ?? {}),
                    ...Object.keys(packageJson.peerDependencies ?? {}),
                    ...Object.keys(packageJson.optionalDependencies ?? {})
                ];
                return dependencyNames
                    .filter(dependencyName => forbiddenDependencies.has(dependencyName))
                    .map(dependencyName => `${file}: ${dependencyName}`);
            });

        const inspectedSourceRoots = [
            'packages/core/src',
            'packages/branding/src',
            'packages/openpencil-cybervinci-extension/src',
            'examples/browser',
            'examples/electron',
            'examples/browser-only'
        ];
        const allowedSourceFiles = new Set([
            'packages/branding/src/common/cybervinci-product.ts',
            'packages/branding/src/common/cybervinci-product-contract.spec.ts',
            'examples/browser/package.json',
            'examples/browser/tsconfig.json',
            'examples/electron/package.json',
            'examples/electron/tsconfig.json'
        ]);
        const forbiddenSourceMatches = inspectedSourceRoots.flatMap(root => collectTextFiles(root))
            .filter(file => !allowedSourceFiles.has(file))
            .flatMap(file => {
                const text = readText(file);
                return [
                    ...text.matchAll(
                        /@cybervinci\/builder-(builder-extension|editor-puck|property-panel-rjsf|ai|export-html|export-react)|@measured\/puck|@rjsf|premium (template|component)|Premium(Template|Component)/g
                    )
                ].map(match => `${file}: ${match[0]}`);
            });

        expect(forbiddenDependencyMatches, forbiddenDependencyMatches.join('\n')).to.deep.equal([]);
        expect(forbiddenSourceMatches, forbiddenSourceMatches.join('\n')).to.deep.equal([]);
        expect(CYBERVINCI_PRODUCT_FEATURES.find(feature => feature.id === 'builder')?.notes.join('\n'))
            .to.contain('Puck, RJSF, builder AI, export packages, premium templates, and premium components must stay behind this optional extension boundary.');
    });

    it('keeps .builder.json handling out of the free core unless it is only an extension-install hint', () => {
        const inspectedRoots = [
            'packages/core/src',
            'packages/branding/src',
            'examples/browser',
            'examples/electron'
        ];
        const allowedFiles = new Set([
            'packages/branding/src/common/cybervinci-product.ts',
            'packages/branding/src/common/cybervinci-product-contract.spec.ts',
            'examples/browser/package.json',
            'examples/browser/tsconfig.json',
            'examples/electron/package.json',
            'examples/electron/tsconfig.json'
        ]);
        const forbiddenMatches = inspectedRoots.flatMap(root => collectTextFiles(root))
            .filter(file => !allowedFiles.has(file))
            .flatMap(file => {
                const text = readText(file);
                return [
                    ...text.matchAll(/\.builder\.json|builder|@cybervinci\/builder|Builder Schema|CyberVinci UI Builder/gi)
                ].map(match => `${file}: ${match[0]}`);
            });

        expect(forbiddenMatches, forbiddenMatches.join('\n')).to.deep.equal([]);
        expect(CYBERVINCI_PRODUCT_FEATURES.find(feature => feature.id === 'builder')?.notes.join('\n'))
            .to.contain('Any .builder.json recognition outside this extension must be optional, read-only, or limited to an install-the-extension message.');
    });

    it('documents the Flow isolation contract', () => {
        const architecture = readText('docs/flow-architecture.md');
        const flow = CYBERVINCI_PRODUCT_FEATURES.find(feature => feature.id === 'flow');

        expect(flow).to.not.equal(undefined);
        expect(flow?.packageName).to.equal('@cybervinci/flow');
        expect(flow?.packagePath).to.equal('packages/flow');
        expect(flow?.ownerBoundary).to.equal('cybervinci-owned');
        expect(flow?.updateRisk).to.equal('medium');
        expect(flow?.requiredInBrowserApp).to.equal(true);
        expect(flow?.requiredInElectronApp).to.equal(true);
        expect(architecture).to.contain('Agency Kernel');
        expect(architecture).to.contain('Memory adapter');
        expect(architecture).to.contain('Removable Extension Criteria');
    });

    it('keeps browser and electron host apps depending on required CyberVinci product extensions', () => {
        const browserPackage = readJson<{ dependencies: Record<string, string> }>('examples/browser/package.json');
        const electronPackage = readJson<{ dependencies: Record<string, string> }>('examples/electron/package.json');

        for (const feature of CYBERVINCI_PRODUCT_FEATURES) {
            if (feature.requiredInBrowserApp) {
                expect(browserPackage.dependencies, `browser app missing ${feature.packageName}`).to.have.property(feature.packageName);
            }
            if (feature.requiredInElectronApp) {
                expect(electronPackage.dependencies, `electron app missing ${feature.packageName}`).to.have.property(feature.packageName);
            }
        }
    });

    it('keeps AI Output Cleaner as a host-level CyberVinci extension with documented operator surface', () => {
        const browserPackage = readJson<{ dependencies: Record<string, string> }>('examples/browser/package.json');
        const electronPackage = readJson<{ dependencies: Record<string, string> }>('examples/electron/package.json');
        const cleanerPackage = readJson<{ name: string; theiaExtensions?: Array<{ frontend?: string; backend?: string }> }>(
            'packages/ai-output-cleaner/package.json'
        );
        const cleanerReadme = readText('packages/ai-output-cleaner/README.md');
        const cleanerFrontendModule = readText('packages/ai-output-cleaner/src/browser/ai-output-cleaner-frontend-module.ts');
        const cleanerCommands = readText('packages/ai-output-cleaner/src/common/ai-output-cleaner-commands.ts');
        const cleanerBackendService = readText('packages/ai-output-cleaner/src/common/ai-output-cleaner-backend-service.ts');

        expect(browserPackage.dependencies).to.have.property('@cybervinci/ai-output-cleaner');
        expect(electronPackage.dependencies).to.have.property('@cybervinci/ai-output-cleaner');
        expect(cleanerPackage.name).to.equal('@cybervinci/ai-output-cleaner');
        expect(cleanerPackage.theiaExtensions).to.deep.equal([{
            frontend: 'lib/browser/ai-output-cleaner-frontend-module',
            backend: 'lib/node/ai-output-cleaner-backend-module'
        }]);
        expect(cleanerFrontendModule).to.contain('bind(CommandContribution).to(AIOutputCleanerCommandContribution).inSingletonScope()');
        expect(cleanerFrontendModule).to.contain('bind(TheiaToolCallInterceptor).toSelf().inSingletonScope()');
        expect(cleanerCommands).to.contain("id: 'cybervinci.aiOutputCleaner.enable'");
        expect(cleanerCommands).to.contain("id: 'cybervinci.aiOutputCleaner.emergencyDisable'");
        expect(cleanerCommands).to.contain("id: 'cybervinci.aiOutputCleaner.showStatus'");
        expect(cleanerCommands).to.contain("id: 'cybervinci.aiOutputCleaner.openArtifacts'");
        expect(cleanerCommands).to.contain("id: 'cybervinci.aiOutputCleaner.recreateWrappers'");
        expect(cleanerCommands).to.contain("id: 'cybervinci.aiOutputCleaner.installCodexHooks'");
        expect(cleanerCommands).to.contain("id: 'cybervinci.aiOutputCleaner.removeCodexHooks'");
        expect(cleanerCommands).to.contain("id: 'cybervinci.aiOutputCleaner.toggleSessionBypass'");
        expect(cleanerCommands).to.contain("id: 'cybervinci.aiOutputCleaner.sendRawOutput'");
        expect(cleanerBackendService).to.contain('getStatus(query?: AIOutputCleanerArtifactQuery): Promise<AIOutputCleanerStatusSnapshot>;');
        expect(cleanerBackendService).to.contain('setSessionBypass(sessionId: string, bypassFiltering: boolean): Promise<AIOutputCleanerSessionOverride>;');
        expect(cleanerReadme).to.contain('fases 4-8');
        expect(cleanerReadme).to.contain('Fase 9');
        expect(cleanerReadme).to.contain('status observável');
        expect(cleanerReadme).to.contain('cybervinci.aiOutputCleaner.sendRawOutput');
    });

    it('documents every known Theia/core patch boundary that can affect upgrades', () => {
        const strategy = readText('docs/cybervinci-update-strategy.md');
        expect(CYBERVINCI_CORE_PATCH_BOUNDARIES).to.have.length.greaterThan(0);
        for (const patch of CYBERVINCI_CORE_PATCH_BOUNDARIES) {
            expect(strategy, `strategy doc missing ${patch.id}`).to.contain(patch.id);
            for (const file of patch.files) {
                expect(pathExists(file), `${patch.id} references missing file ${file}`).to.equal(true);
            }
        }
    });

    it('maps upgrade regression gates to concrete runnable commands and product coverage', () => {
        const strategy = readText('docs/cybervinci-update-strategy.md');
        const flowArchitecture = readText('docs/flow-architecture.md');
        const documentedGates = `${strategy}\n${flowArchitecture}`;
        for (const gate of CYBERVINCI_REGRESSION_GATES) {
            expect(gate.command, gate.id).to.match(/^npm /);
            expect(gate.coverage, gate.id).to.not.be.empty;
            expect(documentedGates, `documentation missing gate ${gate.id}`).to.contain(gate.id);
        }
    });

    it('keeps AI chat customizations behind contribution points where the product relies on chat UX', () => {
        const chatView = readText('packages/ai-chat-ui/src/browser/chat-view-widget.tsx');
        const chatTree = readText('packages/ai-chat-ui/src/browser/chat-tree-view/chat-view-tree-widget.tsx');
        expect(chatView).to.contain('ContributionProvider<ChatWelcomeMessageProvider>');
        expect(chatTree).to.contain('ContributionProvider<ChatWelcomeMessageProvider>');
        expect(readText('packages/ai-ide/src/browser/frontend-module.ts')).to.contain('bind(ChatWelcomeMessageProvider).to(IdeChatWelcomeMessageProvider)');
        expect(readText('packages/memory/src/browser/memory-frontend-module.ts')).to.contain('MemoryChatContribution');
    });
});
