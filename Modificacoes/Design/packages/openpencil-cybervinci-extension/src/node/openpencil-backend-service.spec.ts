import { expect } from 'chai';
import { OpenPencilBackendAiGenerationRequest, OpenPencilBridgeCapability, OpenPencilBridgeJsonObject, OpenPencilUpstreamPackage } from '../common/openpencil-protocol';
import { OpenPencilDocument } from '../common/openpencil-types';
import { OpenPencilBackendServiceImpl } from './openpencil-backend-service';

describe('OpenPencilBackendServiceImpl', () => {

    const vendoredPackageNames = [
        'pen-types',
        'pen-core',
        'pen-engine',
        'pen-renderer',
        'pen-react',
        'pen-codegen',
        'pen-mcp',
        'pen-sdk',
        'pen-figma',
        'pen-ai-skills',
        'pen-acp'
    ];

    class NonVendoredOpenPencilBackendService extends OpenPencilBackendServiceImpl {
        protected override isVendoredPackageAvailable(): boolean {
            return false;
        }
    }

    class VendoredOpenPencilBackendService extends OpenPencilBackendServiceImpl {
        protected override isVendoredPackageAvailable(entry: OpenPencilUpstreamPackage): boolean {
            return vendoredPackageNames.includes(entry.name);
        }
    }

    class DirectPenCodegenBackendService extends OpenPencilBackendServiceImpl {
        protected override isVendoredPackageAvailable(entry: OpenPencilUpstreamPackage): boolean {
            return entry.name === 'pen-codegen' || vendoredPackageNames.includes(entry.name);
        }

        protected override resolvePenCodegenPackagePath(): string | undefined {
            return 'C:\\workspace\\vendor\\openpencil\\packages\\pen-codegen';
        }

        protected override async loadPenCodegenModule(): Promise<Record<string, unknown> | undefined> {
            const nodeIds = (document: OpenPencilDocument) => document.children.map(node => node.id).join(',');
            return {
                generateReactFromDocument: (document: OpenPencilDocument) => `direct-react:${nodeIds(document)}`,
                generateHTMLFromDocument: (document: OpenPencilDocument) => ({
                    html: `<main>${nodeIds(document)}</main>`,
                    css: '.generated { color: red; }'
                }),
                generateVueFromDocument: (document: OpenPencilDocument) => ({ code: `direct-vue:${nodeIds(document)}` }),
                generateSvelteFromDocument: (document: OpenPencilDocument) => ({ content: `direct-svelte:${nodeIds(document)}` }),
                generateReactNativeFromDocument: (document: OpenPencilDocument) => `direct-react-native:${nodeIds(document)}`,
                generateFlutterFromDocument: (document: OpenPencilDocument) => `direct-flutter:${nodeIds(document)}`,
                generateSwiftUIFromDocument: (document: OpenPencilDocument) => `direct-swiftui:${nodeIds(document)}`,
                generateComposeFromDocument: (document: OpenPencilDocument) => `direct-compose:${document.children.length}`
            };
        }
    }

    class ThrowingPenCodegenBackendService extends DirectPenCodegenBackendService {
        protected override async loadPenCodegenModule(): Promise<Record<string, unknown> | undefined> {
            return {
                generateReactFromDocument: () => {
                    throw new Error('upstream generator failed');
                }
            };
        }
    }

    class TestableOpenPencilBackendService extends OpenPencilBackendServiceImpl {
        public getCodexExecutable(): string {
            return this.resolveCodexExecutable();
        }

        public getCodexSpawnInfo(executable: string, args: string[]): { command: string; args: string[]; shell: boolean } {
            return this.buildCodexSpawnInfo(executable, args);
        }

        public getCodexPrompt(request: OpenPencilBackendAiGenerationRequest): string {
            return this.createCodexOpenPencilPrompt(request);
        }
    }

    class DirectPenFigmaBackendService extends OpenPencilBackendServiceImpl {
        protected override isVendoredPackageAvailable(entry: OpenPencilUpstreamPackage): boolean {
            return entry.name === 'pen-figma' || vendoredPackageNames.includes(entry.name);
        }

        protected override resolvePenFigmaPackagePath(): string | undefined {
            return 'C:\\workspace\\vendor\\openpencil\\packages\\pen-figma';
        }

        protected override async loadPenFigmaModule(): Promise<Record<string, unknown> | undefined> {
            return {
                figmaAllPagesToPenDocument: (_decoded: OpenPencilBridgeJsonObject, fileName: string) => ({
                    document: {
                        version: '1',
                        name: fileName,
                        children: [],
                        pages: [{
                            id: 'figma-page-0',
                            name: 'Imported',
                            children: [{
                                id: 'figma-title',
                                type: 'TEXT',
                                characters: 'Converted by pen-figma',
                                absoluteBoundingBox: { x: 24, y: 32, width: 260, height: 40 }
                            }]
                        }]
                    },
                    warnings: ['direct warning']
                }),
                figmaNodeChangesToPenNodes: () => ({
                    nodes: [{
                        id: 'copied-direct',
                        type: 'frame',
                        x: 8,
                        y: 12,
                        width: 180,
                        height: 96,
                        layout: 'horizontal',
                        children: [{
                            id: 'copied-direct-title',
                            type: 'text',
                            x: 16,
                            y: 20,
                            width: 120,
                            height: 24,
                            content: 'Direct copied selection'
                        }]
                    }],
                    warnings: ['direct nodes warning']
                }),
                isFigmaClipboardHtml: (html: string) => html.includes('figma-clipboard'),
                extractFigmaClipboardData: () => ({ buffer: new ArrayBuffer(8) }),
                figmaClipboardToNodes: () => ({
                    nodes: [{
                        id: 'clipboard-direct',
                        type: 'text',
                        x: 10,
                        y: 14,
                        width: 160,
                        height: 28,
                        content: 'Direct clipboard'
                    }],
                    warnings: ['direct clipboard warning']
                }),
                parseFigFile: (buffer: ArrayBuffer) => {
                    if (buffer.byteLength !== 8) {
                        throw new Error(`Expected exact .fig payload length, got ${buffer.byteLength}`);
                    }
                    return {
                        nodeChanges: [{
                            guid: { sessionID: 3, localID: 1 },
                            type: 'DOCUMENT',
                            name: 'Decoded .fig'
                        }],
                        blobs: []
                    };
                }
            };
        }
    }

    const service = new NonVendoredOpenPencilBackendService();

    const createBridgeFixtureDocument = (): OpenPencilBridgeJsonObject => ({
        version: '0.7.6',
        name: 'Bridge Fixture',
        activePageId: 'page-1',
        children: [],
        pages: [{
            id: 'page-1',
            name: 'Page 1',
            width: 320,
            height: 240,
            children: [{
                id: 'title',
                type: 'text',
                x: 16,
                y: 24,
                width: 220,
                height: 32,
                content: 'Backend bridge codegen'
            }, {
                id: 'subtitle',
                type: 'text',
                x: 16,
                y: 64,
                width: 220,
                height: 28,
                content: 'Secondary node'
            }]
        }]
    });

    const createNestedCodegenFixtureDocument = (): OpenPencilBridgeJsonObject => ({
        version: '0.7.6',
        name: 'Nested Codegen Fixture',
        activePageId: 'page-1',
        children: [],
        pages: [{
            id: 'page-1',
            name: 'Page 1',
            width: 640,
            height: 480,
            children: [{
                id: 'card',
                type: 'frame',
                x: 24,
                y: 24,
                width: 360,
                height: 180,
                layout: 'vertical',
                gap: 12,
                padding: [16, 20, 16, 20],
                fill: [{ type: 'solid', color: '#ffffff' }],
                stroke: { color: '#2563eb', width: 2 },
                children: [{
                    id: 'nested-title',
                    type: 'text',
                    x: 44,
                    y: 48,
                    width: 240,
                    height: 32,
                    content: 'Nested title'
                }, {
                    id: 'nested-image',
                    type: 'image',
                    x: 44,
                    y: 92,
                    width: 96,
                    height: 64,
                    src: 'figma:image:asset-1',
                    objectFit: 'contain'
                }]
            }, {
                id: 'cta',
                type: 'rectangle',
                x: 420,
                y: 40,
                width: 140,
                height: 48,
                fill: [{ type: 'solid', color: '#16a34a' }]
            }]
        }]
    });

    const createContinuationPromptFixtureDocument = (): OpenPencilDocument => ({
        version: '0.7.6',
        name: 'Continuation Prompt Fixture',
        activePageId: 'page-1',
        children: [],
        pages: [{
            id: 'page-1',
            name: 'Page 1',
            width: 960,
            height: 720,
            children: [{
                id: 'hero-card',
                type: 'frame',
                name: 'Hero card',
                role: 'region',
                x: 48,
                y: 32,
                width: 480,
                height: 220,
                layout: 'vertical',
                gap: 12,
                children: [{
                    id: 'hero-title',
                    type: 'text',
                    name: 'Hero title',
                    x: 72,
                    y: 60,
                    width: 220,
                    height: 28,
                    content: 'Existing hero title'
                }]
            }, {
                id: 'feature-note',
                type: 'text',
                name: 'Feature note',
                role: 'note',
                x: 48,
                y: 288,
                width: 360,
                height: 32,
                content: 'Existing note below the hero'
            }]
        }]
    });

    it('reports the embedded bridge without starting external processes', async () => {
        const info = await service.getIntegrationInfo();
        const status = await service.getStatus();

        expect(info.fileExtension).to.equal('.op');
        expect(info.embedded).to.equal(true);
        expect(info.reactIsolation).to.equal('pen-react');
        expect(info.bridgeStatus).to.equal('available');
        expect(status.reactIsolation).to.equal('pen-react');
        expect(status.externalProcessesStarted).to.equal(false);
        expect(status.mcp.enabled).to.equal(true);
        expect(status.cli.enabled).to.equal(true);
        expect(status.mcp.transport).to.equal('in-process');
        expect(status.cli.transport).to.equal('in-process');
        expect(status.operations.every(entry => entry.requiresExternalProcess === false)).to.equal(true);
    });

    it('builds Windows-safe codex spawn info without launching codex', async () => {
        const testService = new TestableOpenPencilBackendService();
        const originalPlatform = process.platform;
        Object.defineProperty(process, 'platform', { value: 'win32' });
        try {
            expect(testService.getCodexExecutable()).to.equal('codex.cmd');
            expect(testService.getCodexSpawnInfo('codex', ['exec', '--output-last-message', 'C:\\temp\\out file.json'])).to.deep.equal({
                command: 'cmd.exe',
                args: ['/d', '/c', 'codex', 'exec', '--output-last-message', 'C:\\temp\\out file.json'],
                shell: false
            });
            expect(testService.getCodexSpawnInfo('codex.cmd', ['exec', 'plain'])).to.deep.equal({
                command: 'cmd.exe',
                args: ['/d', '/c', 'codex.cmd', 'exec', 'plain'],
                shell: false
            });
            expect(testService.getCodexSpawnInfo('C:\\tools\\codex.ps1', ['--version'])).to.deep.equal({
                command: 'powershell.exe',
                args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'C:\\tools\\codex.ps1', '--version'],
                shell: false
            });
            expect(testService.getCodexSpawnInfo('C:\\tools\\codex.exe', ['--version'])).to.deep.equal({
                command: 'C:\\tools\\codex.exe',
                args: ['--version'],
                shell: false
            });
        } finally {
            Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
    });

    it('includes continuation mode guidance and a bounded fallback active page layout in the Codex prompt', () => {
        const prompt = new TestableOpenPencilBackendService().getCodexPrompt({
            prompt: 'Continue the current design with another section',
            document: createContinuationPromptFixtureDocument(),
            selection: [],
            mode: 'continuation'
        });

        expect(prompt).to.contain('Use only createNode operations.');
        expect(prompt).to.contain('Request mode: continuation');
        expect(prompt).to.contain('Continuation mode: preserve existing nodes and node IDs, add only new content, and do not recreate page content.');
        expect(prompt).to.contain('Continuation mode: place any new top-level content below contentBottom or in visible empty space from the active-page layout summary, and avoid covering existing top-level nodes.');
        expect(prompt).to.contain('"contentBottom":320');
        expect(prompt).to.contain('"topLevelNodeCount":2');
        expect(prompt).to.contain('"id":"hero-card"');
        expect(prompt).to.contain('"type":"frame"');
        expect(prompt).to.contain('"role":"region"');
        expect(prompt).to.contain('"contentExcerpt":"Existing note below the hero"');
        expect(prompt).to.contain('"x":48');
        expect(prompt).to.contain('"y":288');
        expect(prompt).to.contain('"childCount":1');
    });

    it('advertises upstream packages needed by future MCP and CLI integrations', async () => {
        const status = await service.getStatus();
        const packageNames = status.upstreamPackages.map(entry => entry.name);

        expect(packageNames).to.include.members([
            'pen-types',
            'pen-core',
            'pen-engine',
            'pen-renderer',
            'pen-react',
            'pen-mcp',
            'pen-sdk',
            'pen-figma',
            'pen-ai-skills',
            'pen-acp'
        ]);
        expect(status.upstreamPackages.find(entry => entry.name === 'pen-react')?.readiness).to.equal('planned');
        expect(status.upstreamPackages.find(entry => entry.name === 'pen-react')?.notes?.join(' ')).to.contain('React 18 compatibility');
        expect(status.upstreamPackages.find(entry => entry.name === 'pen-react')?.notes?.join(' ')).to.contain('runtime adapter');
        expect(status.upstreamPackages.find(entry => entry.name === 'pen-mcp')?.packageName).to.equal('@zseven-w/pen-mcp');
        expect(status.upstreamPackages.find(entry => entry.name === 'pen-codegen')?.vendorPath).to.equal('vendor/openpencil/packages/pen-codegen');
        expect(status.upstreamPackages.find(entry => entry.name === 'pen-codegen')?.notes?.join(' ')).to.contain('Direct pen-codegen source was not detected');
    });

    it('reports vendored package source availability from metadata without requiring a physical vendor folder', async () => {
        const status = await new VendoredOpenPencilBackendService().getStatus();

        for (const packageName of vendoredPackageNames) {
            const entry = status.upstreamPackages.find(candidate => candidate.name === packageName);
            expect(entry?.vendored).to.equal(true);
            expect(entry?.vendorPath).to.equal(`vendor/openpencil/packages/${packageName}`);
            expect(entry?.readiness).to.equal('available');
        }

        const penReact = status.upstreamPackages.find(entry => entry.name === 'pen-react');
        const vendoredSnapshot = status.capabilities.find(entry => entry.id === 'openpencil.vendored-source-snapshot');
        const penReactCompatibility = status.capabilities.find(entry => entry.id === 'openpencil.pen-react18-compatibility');
        const penReactAdapter = status.capabilities.find(entry => entry.id === 'openpencil.pen-react-adapter');

        expect(penReact?.readiness).to.equal('available');
        expect(penReact?.notes?.join(' ')).to.contain('React 18-compatible source is embedded');
        expect(penReact?.notes?.join(' ')).to.contain('primary Theia OpenPencil shell');
        expect(vendoredSnapshot?.readiness).to.equal('available');
        expect(vendoredSnapshot?.notes?.join(' ')).to.contain('pen-acp');
        expect(penReactCompatibility?.readiness).to.equal('available');
        expect(penReactCompatibility?.notes?.join(' ')).to.contain('no longer blocks');
        expect(penReactAdapter?.readiness).to.equal('available');
        expect(penReactAdapter?.notes?.join(' ')).to.contain('wired into the widget');
        expect(penReactAdapter?.notes?.join(' ')).to.contain('DesignProvider');
        expect(penReactAdapter?.notes?.join(' ')).to.contain('CanvasKit');
    });

    it('separates available local capabilities from planned OpenPencil package adapters', async () => {
        const capabilities = await service.getCapabilities();
        const capabilityIds = capabilities.map(entry => entry.id);

        expect(capabilityIds).to.include('openpencil.document-json');
        expect(capabilityIds).to.include('openpencil.vendored-source-snapshot');
        expect(capabilityIds).to.include('openpencil.mcp-internal-bridge');
        expect(capabilityIds).to.include('openpencil.pen-react18-compatibility');
        expect(capabilityIds).to.include('openpencil.pen-react-adapter');
        expect(capabilityIds).not.to.include('openpencil.pen-react-isolation');
        expect(capabilities.find(entry => entry.id === 'openpencil.document-json')?.readiness).to.equal('available');
        expect(capabilities.find(entry => entry.id === 'openpencil.vendored-source-snapshot')?.readiness).to.equal('planned');
        expect(capabilities.find(entry => entry.id === 'openpencil.mcp-internal-bridge')?.readiness).to.equal('available');
        expect(capabilities.find(entry => entry.id === 'openpencil.cli-internal-bridge')?.readiness).to.equal('available');
        expect(capabilities.find(entry => entry.id === 'openpencil.pen-codegen-adapter')?.readiness).to.equal('blocked');
        expect(capabilities.find(entry => entry.id === 'openpencil.pen-codegen-adapter')?.notes?.join(' ')).to.contain('Falls back to Theia local code generators');
        expect(capabilities.find(entry => entry.id === 'openpencil.pen-react18-compatibility')?.readiness).to.equal('available');
        expect(capabilities.find(entry => entry.id === 'openpencil.pen-react-adapter')?.readiness).to.equal('available');
        expect(capabilities.find(entry => entry.id === 'openpencil.pen-react-adapter')?.notes?.join(' ')).to.contain('local SVG canvas remains as a fallback');
    });

    it('lists allowlisted bridge operations for MCP, CLI, backend, and codegen integration', async () => {
        const operations = await service.listBridgeOperations();
        const operationIds = operations.map(entry => entry.id);

        expect(operationIds).to.include.members([
            'openpencil.backend.capabilities.list',
            'openpencil.backend.status.get',
            'openpencil.mcp.tools.list',
            'openpencil.cli.commands.list',
            'openpencil.codegen.targets.list',
            'openpencil.codegen.adapter.status',
            'openpencil.codegen.generate',
            'openpencil.codegen.generate.all',
            'openpencil.ai.operations.list',
            'openpencil.import.formats.list',
            'openpencil.document.validation.rules.list',
            'openpencil.document.import',
            'openpencil.document.validate',
            'openpencil.document.export'
        ]);
        expect(operations.find(entry => entry.id === 'openpencil.mcp.tools.list')?.kind).to.equal('mcp');
        expect(operations.find(entry => entry.id === 'openpencil.cli.commands.list')?.kind).to.equal('cli');
        expect(operations.find(entry => entry.id === 'openpencil.codegen.targets.list')?.kind).to.equal('codegen');
        expect(operations.find(entry => entry.id === 'openpencil.codegen.generate')?.kind).to.equal('codegen');
        expect(operations.find(entry => entry.id === 'openpencil.codegen.generate.all')?.kind).to.equal('codegen');
        expect(operations.find(entry => entry.id === 'openpencil.document.export')?.kind).to.equal('backend');
        expect(operations.every(entry => entry.readiness === 'available')).to.equal(true);
        expect(operations.every(entry => entry.requiresExternalProcess === false)).to.equal(true);
    });

    it('executes supported bridge operations without starting external processes', async () => {
        const capabilityResult = await service.executeBridgeOperation({ operationId: 'openpencil.backend.capabilities.list' });
        const mcpResult = await service.executeBridgeOperation({ operationId: 'openpencil.mcp.tools.list' });
        const cliResult = await service.executeBridgeOperation({ operationId: 'openpencil.cli.commands.list' });
        const codegenResult = await service.executeBridgeOperation({ operationId: 'openpencil.codegen.targets.list' });
        const codegenStatusResult = await service.executeBridgeOperation({ operationId: 'openpencil.codegen.adapter.status' });
        const aiOperationsResult = await service.executeBridgeOperation({ operationId: 'openpencil.ai.operations.list' });
        const importFormatsResult = await service.executeBridgeOperation({ operationId: 'openpencil.import.formats.list' });
        const validationRulesResult = await service.executeBridgeOperation({ operationId: 'openpencil.document.validation.rules.list' });

        expect(capabilityResult.ok).to.equal(true);
        expect(capabilityResult.externalProcessStarted).to.equal(false);
        expect((capabilityResult.output as OpenPencilBridgeCapability[]).map(entry => entry.id)).to.include('openpencil.cli-internal-bridge');
        expect(mcpResult.ok).to.equal(true);
        expect(mcpResult.externalProcessStarted).to.equal(false);
        expect((mcpResult.output as OpenPencilBridgeJsonObject[]).map(entry => entry.name)).to.include('openpencil.backend.status.get');
        expect(cliResult.ok).to.equal(true);
        expect((cliResult.output as OpenPencilBridgeJsonObject[]).map(entry => entry.command)).to.include('op:cli.commands.list');
        expect(codegenResult.ok).to.equal(true);
        expect((codegenResult.output as OpenPencilBridgeJsonObject[]).map(entry => entry.id)).to.include.members(['openpencil-json', 'react-tailwind']);
        expect((mcpResult.output as OpenPencilBridgeJsonObject[]).map(entry => entry.name)).to.include('openpencil.codegen.generate.all');
        expect((cliResult.output as OpenPencilBridgeJsonObject[]).map(entry => entry.operationId)).to.include('openpencil.codegen.generate.all');
        expect(codegenStatusResult.ok).to.equal(true);
        expect((codegenStatusResult.output as OpenPencilBridgeJsonObject).selectedAdapter).to.equal('local-fallback');
        expect(((codegenStatusResult.output as OpenPencilBridgeJsonObject).directPenCodegen as OpenPencilBridgeJsonObject).available).to.equal(false);
        expect(((codegenStatusResult.output as OpenPencilBridgeJsonObject).mcpPipeline as OpenPencilBridgeJsonObject).requiresRunningOpenPencilApp).to.equal(true);
        expect(aiOperationsResult.ok).to.equal(true);
        expect((aiOperationsResult.output as OpenPencilBridgeJsonObject[]).map(entry => entry.operation)).to.include.members(['createNode', 'setThemes', 'autoLayoutNode']);
        expect(importFormatsResult.ok).to.equal(true);
        expect((importFormatsResult.output as OpenPencilBridgeJsonObject[]).map(entry => entry.id)).to.include.members(['openpencil-json', 'figma-json', 'figma-clipboard-html', 'figma-fig-base64', 'svg', 'html']);
        expect(validationRulesResult.ok).to.equal(true);
        expect((validationRulesResult.output as OpenPencilBridgeJsonObject[]).map(entry => entry.id)).to.include('node-ids-present-and-unique');
    });

    it('reports the direct pen-codegen adapter when the vendored package is present', async () => {
        const directService = new DirectPenCodegenBackendService();
        const status = await directService.getStatus();
        const adapterStatusResult = await directService.executeBridgeOperation({ operationId: 'openpencil.codegen.adapter.status' });
        const targetsResult = await directService.executeBridgeOperation({ operationId: 'openpencil.codegen.targets.list' });

        const penCodegen = status.upstreamPackages.find(entry => entry.name === 'pen-codegen');
        const penCodegenCapability = status.capabilities.find(entry => entry.id === 'openpencil.pen-codegen-adapter');
        const adapterStatus = adapterStatusResult.output as OpenPencilBridgeJsonObject;
        const targets = targetsResult.output as OpenPencilBridgeJsonObject[];

        expect(penCodegen?.vendored).to.equal(true);
        expect(penCodegen?.readiness).to.equal('available');
        expect(penCodegen?.notes?.join(' ')).to.contain('pen-codegen-direct');
        expect(penCodegenCapability?.readiness).to.equal('available');
        expect(penCodegenCapability?.notes?.join(' ')).to.contain('generate*FromDocument');
        expect(adapterStatus.selectedAdapter).to.equal('pen-codegen-direct');
        expect((adapterStatus.directPenCodegen as OpenPencilBridgeJsonObject).available).to.equal(true);
        expect(targets.find(entry => entry.id === 'react-tailwind')?.adapter).to.equal('pen-codegen-direct');
        expect(targets.find(entry => entry.id === 'react-tailwind')?.fallbackAdapter).to.equal('local-fallback');
        expect(targets.find(entry => entry.id === 'vue')?.upstreamFunction).to.equal('generateVueFromDocument');
        expect(targets.find(entry => entry.id === 'jetpack-compose')?.upstreamFramework).to.equal('compose');
    });

    it('generates through direct pen-codegen functions and maps CyberVinci formats', async () => {
        const directService = new DirectPenCodegenBackendService();
        const document = createBridgeFixtureDocument();

        const react = await directService.executeBridgeOperation({
            operationId: 'openpencil.codegen.generate',
            params: { document, format: 'react-tailwind', selection: ['title'], selectionOnly: true }
        });
        const html = await directService.executeBridgeOperation({
            operationId: 'openpencil.codegen.generate',
            params: { document, format: 'html-css', selection: ['title'], selectionOnly: true }
        });
        const compose = await directService.executeBridgeOperation({
            operationId: 'openpencil.codegen.generate',
            params: { document, format: 'jetpack-compose' }
        });

        const reactOutput = react.output as OpenPencilBridgeJsonObject;
        const htmlOutput = html.output as OpenPencilBridgeJsonObject;
        const composeOutput = compose.output as OpenPencilBridgeJsonObject;

        expect(react.ok).to.equal(true);
        expect(reactOutput.adapter).to.equal('pen-codegen-direct');
        expect(reactOutput.upstreamFramework).to.equal('react');
        expect(reactOutput.upstreamFunction).to.equal('generateReactFromDocument');
        expect(reactOutput.content).to.equal('direct-react:title');
        expect(html.ok).to.equal(true);
        expect(htmlOutput.adapter).to.equal('pen-codegen-direct');
        expect(htmlOutput.upstreamFramework).to.equal('html');
        expect(htmlOutput.upstreamFunction).to.equal('generateHTMLFromDocument');
        expect(htmlOutput.content as string).to.contain('<main>title</main>');
        expect(htmlOutput.content as string).to.contain('<style>');
        expect(htmlOutput.html).to.equal('<main>title</main>');
        expect(htmlOutput.css).to.equal('.generated { color: red; }');
        expect(compose.ok).to.equal(true);
        expect(composeOutput.adapter).to.equal('pen-codegen-direct');
        expect(composeOutput.upstreamFramework).to.equal('compose');
        expect(composeOutput.content).to.equal('direct-compose:2');
    });

    it('uses direct pen-codegen for Vue, Svelte, and native targets with page and selection adaptation', async () => {
        const directService = new DirectPenCodegenBackendService();
        const document = createNestedCodegenFixtureDocument();
        const formats = ['vue', 'svelte', 'react-native', 'flutter', 'swiftui'] as const;

        for (const format of formats) {
            const generated = await directService.executeBridgeOperation({
                operationId: 'openpencil.codegen.generate',
                params: { document, format, selection: ['card', 'nested-title'], selectionOnly: true }
            });
            const output = generated.output as OpenPencilBridgeJsonObject;

            expect(generated.ok).to.equal(true);
            expect(output.adapter).to.equal('pen-codegen-direct');
            expect(output.content).to.equal(`direct-${format}:card`);
            expect(output.selectionOnly).to.equal(true);
        }
    });

    it('generates every codegen target through one allowlisted in-process operation', async () => {
        const directService = new DirectPenCodegenBackendService();
        const document = createBridgeFixtureDocument();

        const generated = await directService.executeBridgeOperation({
            operationId: 'openpencil.codegen.generate.all',
            params: { document, selection: ['title'], selectionOnly: true }
        });
        const output = generated.output as OpenPencilBridgeJsonObject;
        const targets = output.targets as OpenPencilBridgeJsonObject[];
        const outputs = output.outputs as OpenPencilBridgeJsonObject[];

        expect(generated.ok).to.equal(true);
        expect(generated.externalProcessStarted).to.equal(false);
        expect(output.externalProcessesStarted).to.equal(false);
        expect((output.adapterStatus as OpenPencilBridgeJsonObject).selectedAdapter).to.equal('pen-codegen-direct');
        expect(targets.map(entry => entry.id)).to.include.members(['react-tailwind', 'html-css', 'svg', 'jetpack-compose']);
        expect(targets.map(entry => entry.id)).not.to.include('openpencil-json');
        expect(outputs.map(entry => entry.format)).to.include.members(['react-tailwind', 'html-css', 'svg', 'vue', 'svelte', 'react-native', 'flutter', 'swiftui', 'jetpack-compose']);
        expect(outputs.every(entry => entry.mode === 'codegen-generate-all')).to.equal(true);
        expect(outputs.every(entry => Array.isArray(entry.selection) && (entry.selection as string[]).includes('title'))).to.equal(true);
        expect(outputs.every(entry => entry.selectionOnly === true)).to.equal(true);
        expect(outputs.every(entry => entry.externalProcessStarted === undefined)).to.equal(true);
        expect(outputs.find(entry => entry.format === 'react-tailwind')?.adapter).to.equal('pen-codegen-direct');
        expect(outputs.find(entry => entry.format === 'vue')?.content).to.equal('direct-vue:title');
        expect(outputs.find(entry => entry.format === 'svelte')?.content).to.equal('direct-svelte:title');
        expect(outputs.find(entry => entry.format === 'react-native')?.content).to.equal('direct-react-native:title');
        expect(outputs.find(entry => entry.format === 'flutter')?.content).to.equal('direct-flutter:title');
        expect(outputs.find(entry => entry.format === 'swiftui')?.content).to.equal('direct-swiftui:title');
        expect(outputs.find(entry => entry.format === 'svg')?.adapter).to.equal('local-svg-fallback');
    });

    it('falls back locally when a direct pen-codegen generator fails and reports the used adapter', async () => {
        const throwingService = new ThrowingPenCodegenBackendService();
        const document = createBridgeFixtureDocument();

        const generated = await throwingService.executeBridgeOperation({
            operationId: 'openpencil.codegen.generate',
            params: { document, format: 'react-tailwind' }
        });
        const output = generated.output as OpenPencilBridgeJsonObject;

        expect(generated.ok).to.equal(true);
        expect(output.adapter).to.equal('local-fallback');
        expect(output.fallbackReason as string).to.contain('Direct @zseven-w/pen-codegen');
        expect((output.upstreamCodegen as OpenPencilBridgeJsonObject).selectedAdapter).to.equal('pen-codegen-direct');
        expect(output.content as string).to.contain('Backend bridge codegen');
    });

    it('imports decoded Figma JSON through the direct pen-figma adapter when available', async () => {
        const figmaService = new DirectPenFigmaBackendService();
        const imported = await figmaService.executeBridgeOperation({
            operationId: 'openpencil.document.import',
            params: {
                name: 'Direct Figma',
                format: 'figma-json',
                source: JSON.stringify({
                    nodeChanges: [{
                        guid: { sessionID: 1, localID: 1 },
                        type: 'DOCUMENT',
                        name: 'Document'
                    }],
                    blobs: []
                })
            }
        });
        const output = imported.output as OpenPencilBridgeJsonObject;
        const document = output.document as OpenPencilBridgeJsonObject;
        const validation = output.validation as OpenPencilBridgeJsonObject;
        const pages = document.pages as OpenPencilBridgeJsonObject[];
        const firstPage = pages[0];
        const children = firstPage.children as OpenPencilBridgeJsonObject[];

        expect(imported.ok).to.equal(true);
        expect(imported.externalProcessStarted).to.equal(false);
        expect(output.adapter).to.equal('pen-figma-direct');
        expect((output.warnings as string[])[0]).to.equal('direct warning');
        expect(validation.valid).to.equal(true);
        expect(document.name).to.equal('Direct Figma');
        expect(children[0].type).to.equal('text');
        expect(children[0].content).to.equal('Converted by pen-figma');
        expect(children[0].x).to.equal(24);
    });

    it('imports copied Figma node arrays and clipboard HTML through direct pen-figma helpers', async () => {
        const figmaService = new DirectPenFigmaBackendService();
        const copied = await figmaService.executeBridgeOperation({
            operationId: 'openpencil.document.import',
            params: {
                name: 'Copied Direct',
                format: 'figma-copied-json',
                source: JSON.stringify([{
                    guid: { sessionID: 2, localID: 1 },
                    type: 'FRAME',
                    name: 'Copied Frame'
                }])
            }
        });
        const clipboard = await figmaService.executeBridgeOperation({
            operationId: 'openpencil.document.import',
            params: {
                name: 'Clipboard Direct',
                format: 'figma-clipboard-html',
                source: '<div data-kind="figma-clipboard"></div>'
            }
        });

        const copiedOutput = copied.output as OpenPencilBridgeJsonObject;
        const copiedDocument = copiedOutput.document as OpenPencilBridgeJsonObject;
        const copiedPage = (copiedDocument.pages as OpenPencilBridgeJsonObject[])[0];
        const copiedFrame = (copiedPage.children as OpenPencilBridgeJsonObject[])[0];
        const clipboardOutput = clipboard.output as OpenPencilBridgeJsonObject;
        const clipboardDocument = clipboardOutput.document as OpenPencilBridgeJsonObject;
        const clipboardPage = (clipboardDocument.pages as OpenPencilBridgeJsonObject[])[0];
        const clipboardText = (clipboardPage.children as OpenPencilBridgeJsonObject[])[0];

        expect(copied.ok).to.equal(true);
        expect(copied.externalProcessStarted).to.equal(false);
        expect(copiedOutput.adapter).to.equal('pen-figma-direct');
        expect((copiedOutput.warnings as string[])[0]).to.equal('direct nodes warning');
        expect(copiedFrame.id).to.equal('copied-direct');
        expect(copiedFrame.layout).to.equal('horizontal');
        expect(((copiedFrame.children as OpenPencilBridgeJsonObject[])[0]).content).to.equal('Direct copied selection');
        expect(clipboard.ok).to.equal(true);
        expect(clipboard.externalProcessStarted).to.equal(false);
        expect(clipboardOutput.adapter).to.equal('pen-figma-direct');
        expect((clipboardOutput.warnings as string[])[0]).to.equal('direct clipboard warning');
        expect(clipboardText.content).to.equal('Direct clipboard');
    });

    it('imports base64 .fig payloads through the direct pen-figma parser with an exact ArrayBuffer', async () => {
        const figmaService = new DirectPenFigmaBackendService();
        const imported = await figmaService.executeBridgeOperation({
            operationId: 'openpencil.document.import',
            params: {
                name: 'Direct Fig',
                format: 'figma-fig-base64',
                source: Buffer.from('fig-data').toString('base64')
            }
        });
        const output = imported.output as OpenPencilBridgeJsonObject;
        const document = output.document as OpenPencilBridgeJsonObject;
        const firstPage = (document.pages as OpenPencilBridgeJsonObject[])[0];
        const children = firstPage.children as OpenPencilBridgeJsonObject[];

        expect(imported.ok).to.equal(true);
        expect(imported.externalProcessStarted).to.equal(false);
        expect(output.adapter).to.equal('pen-figma-direct');
        expect(children[0].content).to.equal('Converted by pen-figma');
    });

    it('falls back to structural Figma JSON import without starting external processes', async () => {
        const source = JSON.stringify({
            name: 'Figma REST fixture',
            document: {
                id: '0:0',
                type: 'DOCUMENT',
                children: [{
                    id: '0:1',
                    type: 'CANVAS',
                    name: 'Landing',
                    children: [{
                        id: '1:2',
                        type: 'TEXT',
                        name: 'Hero title',
                        characters: 'Figma title',
                        absoluteBoundingBox: { x: 80, y: 96, width: 320, height: 48 },
                        fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.2, b: 0.3, a: 1 } }]
                    }]
                }]
            }
        });

        const imported = await service.executeBridgeOperation({
            operationId: 'openpencil.document.import',
            params: { source, format: 'figma-json' }
        });
        const output = imported.output as OpenPencilBridgeJsonObject;
        const document = output.document as OpenPencilBridgeJsonObject;
        const validation = output.validation as OpenPencilBridgeJsonObject;
        const pages = document.pages as OpenPencilBridgeJsonObject[];
        const firstPage = pages[0];
        const children = firstPage.children as OpenPencilBridgeJsonObject[];
        const fill = children[0].fill as OpenPencilBridgeJsonObject[];

        expect(imported.ok).to.equal(true);
        expect(imported.externalProcessStarted).to.equal(false);
        expect(output.adapter).to.equal('figma-structural-json');
        expect(output.fallbackReason as string).to.contain('Direct @zseven-w/pen-figma');
        expect(validation.valid).to.equal(true);
        expect(document.name).to.equal('Figma REST fixture');
        expect(firstPage.name).to.equal('Landing');
        expect(children[0].id).to.equal('1:2');
        expect(children[0].type).to.equal('text');
        expect(children[0].content).to.equal('Figma title');
        expect(children[0].x).to.equal(80);
        expect(fill[0].color).to.equal('#1a334d');
    });

    it('preserves Figma REST layout, constraints, paint, image, effect, and text metadata through import and export', async () => {
        const source = JSON.stringify({
            name: 'Figma parity fixture',
            document: {
                id: '0:0',
                type: 'DOCUMENT',
                children: [{
                    id: '0:1',
                    type: 'CANVAS',
                    name: 'Web',
                    children: [{
                        id: '1:1',
                        type: 'FRAME',
                        name: 'Auto layout card',
                        absoluteBoundingBox: { x: 40, y: 64, width: 360, height: 160 },
                        layoutMode: 'HORIZONTAL',
                        itemSpacing: 12,
                        paddingTop: 8,
                        paddingRight: 16,
                        paddingBottom: 8,
                        paddingLeft: 16,
                        primaryAxisAlignItems: 'SPACE_BETWEEN',
                        counterAxisAlignItems: 'CENTER',
                        clipsContent: true,
                        constraints: { horizontal: 'SCALE', vertical: 'TOP' },
                        fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.75 } }],
                        strokes: [{ type: 'SOLID', color: { r: 0, g: 0.2, b: 0.8, a: 1 } }],
                        strokeWeight: 2,
                        strokeAlign: 'INSIDE',
                        dashPattern: [4, 2],
                        effects: [{ type: 'DROP_SHADOW', offset: { x: 0, y: 8 }, radius: 16, spread: 0, color: { r: 0, g: 0, b: 0, a: 0.2 } }],
                        children: [{
                            id: '1:2',
                            type: 'RECTANGLE',
                            name: 'Remote image',
                            absoluteBoundingBox: { x: 56, y: 80, width: 96, height: 96 },
                            fills: [{ type: 'IMAGE', imageRef: 'abc123', scaleMode: 'FIT' }]
                        }, {
                            id: '1:3',
                            type: 'TEXT',
                            name: 'Title',
                            characters: 'Parity text',
                            absoluteBoundingBox: { x: 168, y: 96, width: 180, height: 40 },
                            style: {
                                fontFamily: 'Inter',
                                fontSize: 18,
                                fontWeight: 700,
                                textAlignHorizontal: 'CENTER',
                                textAlignVertical: 'CENTER',
                                letterSpacing: 0.25,
                                lineHeightPx: 24
                            },
                            fills: [{ type: 'SOLID', color: { r: 0.05, g: 0.07, b: 0.1, a: 1 } }]
                        }]
                    }]
                }]
            }
        });

        const imported = await service.executeBridgeOperation({
            operationId: 'openpencil.document.import',
            params: { source, format: 'figma-rest-json' }
        });
        const output = imported.output as OpenPencilBridgeJsonObject;
        const document = output.document as OpenPencilBridgeJsonObject;
        const pages = document.pages as OpenPencilBridgeJsonObject[];
        const frame = (pages[0].children as OpenPencilBridgeJsonObject[])[0];
        const children = frame.children as OpenPencilBridgeJsonObject[];
        const image = children[0];
        const text = children[1];

        expect(imported.ok).to.equal(true);
        expect(imported.externalProcessStarted).to.equal(false);
        expect(output.adapter).to.equal('figma-structural-json');
        expect((output.validation as OpenPencilBridgeJsonObject).valid).to.equal(true);
        expect(frame.layout).to.equal('horizontal');
        expect(frame.gap).to.equal(12);
        expect(frame.padding).to.deep.equal([8, 16, 8, 16]);
        expect(frame.justifyContent).to.equal('space_between');
        expect(frame.alignItems).to.equal('center');
        expect(frame.clipContent).to.equal(true);
        expect((frame.constraints as OpenPencilBridgeJsonObject).horizontal).to.equal('SCALE');
        expect(((frame.stroke as OpenPencilBridgeJsonObject).dashPattern as number[])).to.deep.equal([4, 2]);
        expect((frame.effects as OpenPencilBridgeJsonObject[])[0].type).to.equal('shadow');
        expect(((frame.figma as OpenPencilBridgeJsonObject).layoutMode)).to.equal('HORIZONTAL');
        expect(image.type).to.equal('image');
        expect(image.src).to.equal('figma:image:abc123');
        expect(image.objectFit).to.equal('contain');
        expect(text.content).to.equal('Parity text');
        expect(text.fontFamily).to.equal('Inter');
        expect(text.fontSize).to.equal(18);
        expect(text.textAlign).to.equal('center');

        const exported = await service.executeBridgeOperation({
            operationId: 'openpencil.document.export',
            params: { document, format: 'openpencil-json' }
        });
        expect(exported.ok).to.equal(true);
        expect((exported.output as OpenPencilBridgeJsonObject).adapter).to.equal('local-serializer');
        expect((exported.output as OpenPencilBridgeJsonObject).content as string).to.contain('figma:image:abc123');
        expect((exported.output as OpenPencilBridgeJsonObject).content as string).to.contain('Parity text');
    });

    it('imports copied Figma node JSON from clipboard HTML data attributes with a structural fallback message', async () => {
        const copiedNodes = [{
            id: '2:1',
            type: 'TEXT',
            name: 'Copied label',
            characters: 'Copied from Figma',
            absoluteBoundingBox: { x: 12, y: 20, width: 180, height: 28 },
            constraints: { horizontal: 'MIN', vertical: 'MIN' }
        }];
        const source = `<meta data-buffer="${Buffer.from(JSON.stringify(copiedNodes), 'utf8').toString('base64')}">`;

        const imported = await service.executeBridgeOperation({
            operationId: 'openpencil.document.import',
            params: { source, format: 'figma-clipboard-html', name: 'Copied HTML' }
        });
        const output = imported.output as OpenPencilBridgeJsonObject;
        const document = output.document as OpenPencilBridgeJsonObject;
        const page = (document.pages as OpenPencilBridgeJsonObject[])[0];
        const label = (page.children as OpenPencilBridgeJsonObject[])[0];

        expect(imported.ok).to.equal(true);
        expect(imported.externalProcessStarted).to.equal(false);
        expect(output.adapter).to.equal('figma-structural-json');
        expect(output.fallbackReason as string).to.contain('structural Figma JSON fallback');
        expect(document.name).to.equal('Copied HTML');
        expect(label.id).to.equal('2:1');
        expect(label.type).to.equal('text');
        expect(label.content).to.equal('Copied from Figma');
        expect((label.constraints as OpenPencilBridgeJsonObject).horizontal).to.equal('MIN');
    });

    it('returns a specific fallback message for unsupported base64 .fig import without a direct parser', async () => {
        const imported = await service.executeBridgeOperation({
            operationId: 'openpencil.document.import',
            params: { source: 'not-a-real-fig-file', format: 'figma-fig-base64' }
        });

        expect(imported.ok).to.equal(false);
        expect(imported.externalProcessStarted).to.equal(false);
        expect(imported.error?.message).to.contain('structural fallback can only read decoded Figma JSON');
    });

    it('executes import, validate, export, and codegen bridge operations with local fallback adapters', async () => {
        const source = JSON.stringify({
            version: '0.7.6',
            name: 'Bridge Fixture',
            activePageId: 'page-1',
            children: [],
            pages: [{
                id: 'page-1',
                name: 'Page 1',
                width: 320,
                height: 240,
                children: [{
                    id: 'title',
                    type: 'text',
                    x: 16,
                    y: 24,
                    width: 220,
                    height: 32,
                    content: 'Backend bridge codegen'
                }]
            }]
        });

        const imported = await service.executeBridgeOperation({
            operationId: 'openpencil.document.import',
            params: { source, name: 'Imported Bridge Fixture' }
        });
        expect(imported.ok).to.equal(true);
        expect(imported.externalProcessStarted).to.equal(false);

        const importedOutput = imported.output as OpenPencilBridgeJsonObject;
        const document = importedOutput.document as OpenPencilBridgeJsonObject;
        expect((importedOutput.validation as OpenPencilBridgeJsonObject).valid).to.equal(true);
        expect(document.name).to.equal('Bridge Fixture');

        const validation = await service.executeBridgeOperation({
            operationId: 'openpencil.document.validate',
            params: { document }
        });
        expect(validation.ok).to.equal(true);
        expect(((validation.output as OpenPencilBridgeJsonObject).validation as OpenPencilBridgeJsonObject).valid).to.equal(true);

        const htmlExport = await service.executeBridgeOperation({
            operationId: 'openpencil.document.export',
            params: { document, format: 'html-css' }
        });
        expect(htmlExport.ok).to.equal(true);
        expect((htmlExport.output as OpenPencilBridgeJsonObject).adapter).to.equal('local-fallback');
        expect((htmlExport.output as OpenPencilBridgeJsonObject).content as string).to.contain('Backend bridge codegen');

        const generated = await service.executeBridgeOperation({
            operationId: 'openpencil.codegen.generate',
            params: { document, format: 'react-tailwind', selection: ['title'], selectionOnly: true }
        });
        expect(generated.ok).to.equal(true);
        expect((generated.output as OpenPencilBridgeJsonObject).mode).to.equal('codegen-generate');
        expect((generated.output as OpenPencilBridgeJsonObject).adapter).to.equal('local-fallback');
        expect((generated.output as OpenPencilBridgeJsonObject).content as string).to.contain('Backend bridge codegen');
    });

    it('rejects unsupported bridge operations and unexpected parameters', async () => {
        const unsupported = await service.executeBridgeOperation({ operationId: 'rm -rf .' });
        const invalidParams = await service.executeBridgeOperation({
            operationId: 'openpencil.cli.commands.list',
            params: { command: 'status' }
        });
        const invalidExport = await service.executeBridgeOperation({
            operationId: 'openpencil.document.export',
            params: { document: {}, format: 'exe' }
        });

        expect(unsupported.ok).to.equal(false);
        expect(unsupported.externalProcessStarted).to.equal(false);
        expect(unsupported.error?.code).to.equal('unsupportedOperation');
        expect(invalidParams.ok).to.equal(false);
        expect(invalidParams.externalProcessStarted).to.equal(false);
        expect(invalidParams.error?.code).to.equal('invalidParams');
        expect(invalidExport.ok).to.equal(false);
        expect(invalidExport.externalProcessStarted).to.equal(false);
        expect(invalidExport.error?.code).to.equal('invalidParams');
    });
});
