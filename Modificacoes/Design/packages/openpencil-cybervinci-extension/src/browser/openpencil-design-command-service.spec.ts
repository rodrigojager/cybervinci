import { expect } from 'chai';
import { OpenPencilDocumentService } from '../common/openpencil-document-service';
import {
    OpenPencilAiDesignProvider,
    OpenPencilAiDesignRequest,
    OpenPencilAiSkillContext,
    OpenPencilCyberVinciAiDesignProvider,
    OpenPencilDesignCommandServiceImpl
} from './openpencil-design-command-service';
import { OpenPencilDesignOperation, OpenPencilExportFormat, OpenPencilNode } from '../common/openpencil-types';

describe('OpenPencilDesignCommandService', () => {

    const service = new OpenPencilDesignCommandServiceImpl();

    it('persists structured command edits through serialize, deserialize, and export', () => {
        const documents = new OpenPencilDocumentService();
        const document = service.createDesign('Acceptance persistence flow');
        const edited = service.applyOperationsToDocument(document, [], [
            {
                operation: 'updateNode',
                nodeId: 'hero-title',
                changes: {
                    content: 'Persisted acceptance title',
                    fontSize: 44,
                    x: 148
                }
            },
            {
                operation: 'addNode',
                node: {
                    id: 'acceptance-cta-label',
                    type: 'text',
                    name: 'Acceptance CTA label',
                    x: 180,
                    y: 330,
                    width: 220,
                    height: 32,
                    content: 'Persisted CTA',
                    fontSize: 20,
                    fill: [{ type: 'solid', color: '#0f172a' }]
                }
            },
            {
                operation: 'setSelection',
                nodeIds: ['hero-title', 'acceptance-cta-label']
            }
        ]);

        const serialized = documents.serialize(edited.document);
        const reloaded = documents.deserialize(serialized);
        const summary = service.getDocumentSummary(reloaded);
        const reloadedTitle = summary.nodes.find(node => node.id === 'hero-title');
        const cta = documents.findNode(reloaded, 'acceptance-cta-label');
        const html = service.exportDocument(reloaded, [], 'html-css');
        const svg = service.exportDocument(reloaded, [], 'svg');
        const reactSelection = service.exportDocument(reloaded, ['acceptance-cta-label'], 'react-tailwind', true);

        expect(edited.changed).to.equal(true);
        expect(edited.selection).to.deep.equal(['hero-title', 'acceptance-cta-label']);
        expect(serialized).to.contain('"content": "Persisted acceptance title"');
        expect(summary.name).to.equal('Acceptance persistence flow');
        expect(reloadedTitle?.text).to.equal('Persisted acceptance title');
        expect(cta?.content).to.equal('Persisted CTA');
        expect(cta?.x).to.equal(180);
        expect(html).to.contain('Persisted acceptance title');
        expect(svg).to.contain('Persisted CTA');
        expect(reactSelection).to.contain('Persisted CTA');
        expect(reactSelection).not.to.contain('Persisted acceptance title');
    });

    it('exports front-first top-level nodes in back-to-front paint order for HTML and SVG', () => {
        const document = service.createDesign('Export paint order test');
        const page = document.pages![0];
        page.children = [
            createPaintOrderTextNode('paint-front-node', 'Front paint node'),
            createPaintOrderTextNode('paint-back-node', 'Back paint node')
        ];

        const html = service.exportDocument(document, [], 'html-css');
        const svg = service.exportDocument(document, [], 'svg');

        expect(html.indexOf('Back paint node')).to.be.lessThan(html.indexOf('Front paint node'));
        expect(svg.indexOf('Back paint node')).to.be.lessThan(svg.indexOf('Front paint node'));
        expect(page.children.map(node => node.id)).to.deep.equal(['paint-front-node', 'paint-back-node']);
    });

    it('exports front-first nested children in back-to-front paint order', () => {
        const document = service.createDesign('Nested export paint order test');
        const page = document.pages![0];
        page.children = [{
            id: 'paint-order-frame',
            type: 'frame',
            name: 'Paint order frame',
            x: 0,
            y: 0,
            width: 240,
            height: 160,
            children: [
                createPaintOrderTextNode('nested-front-node', 'Nested front node'),
                createPaintOrderTextNode('nested-back-node', 'Nested back node')
            ]
        }];

        const html = service.exportDocument(document, [], 'html-css');
        const svg = service.exportDocument(document, [], 'svg');

        expect(html.indexOf('Nested back node')).to.be.lessThan(html.indexOf('Nested front node'));
        expect(svg.indexOf('Nested back node')).to.be.lessThan(svg.indexOf('Nested front node'));
        expect(page.children[0].children?.map(node => node.id)).to.deep.equal(['nested-front-node', 'nested-back-node']);
    });

    it('updates nodes through structured commands', () => {
        const document = service.createDesign('Command test');
        const result = service.applyToDocument(document, [], {
            operation: 'updateNode',
            nodeId: 'hero-title',
            changes: {
                content: 'Updated by AI',
                fontSize: 48,
                width: 640
            }
        });

        const summary = service.getDocumentSummary(result.document);
        const updated = result.document.pages![0].children.find(node => node.id === 'hero-title');

        expect(result.changed).to.equal(true);
        expect(summary.nodes.find(node => node.id === 'hero-title')?.text).to.equal('Updated by AI');
        expect(updated?.width).to.equal(640);
    });

    it('generates in-process AI operations from prompt, document, selection, and pen-ai-skills context', async () => {
        const document = service.createDesign('AI generation test');
        const prompt = 'Create a content panel for enterprise analytics with blue CTA';
        const generated = await service.generateAiOperations({
            prompt,
            document,
            selection: []
        });
        const result = service.applyOperationsToDocument(document, [], generated.operations);
        const section = result.document.pages![0].children.find(node => node.id === result.selection[0]);

        expect(generated.source).to.equal('deterministic-fallback');
        expect(generated.context.adapter).to.equal('pen-ai-skills-in-process');
        expect(generated.context.phase).to.equal('generation');
        expect(generated.context.operationFormat).to.equal('OpenPencilDesignOperation[]');
        expect(generated.context.responseContract.guidance).to.contain('never browser DOM');
        expect(generated.context.operationExamples.map(operation => operation.operation)).to.deep.equal(['createNode', 'setSelection']);
        expect(generated.context.skills.map(skill => skill.name)).to.include.members(['jsonl-format', 'schema', 'layout', 'text-rules']);
        expect(generated.context.skills.every(skill => skill.sourcePath.includes('Skills/System/OpenPencil/pen-ai-skills'))).to.equal(true);
        const skillsByName = new Map(generated.context.skills.map(skill => [skill.name, skill]));
        expect(skillsByName.get('schema')?.content).to.contain('PenNode types (the ONLY format you output for designs)');
        expect(skillsByName.get('layout')?.content).to.contain('HORIZONTAL ROW WIDTH MATH');
        expect(skillsByName.get('text-rules')?.content).to.contain('TEXT RULES');
        expect(generated.context.skills.some(skill => skill.name === 'style-defaults' || skill.sourcePath.includes('/style-guides/'))).to.equal(true);
        expect(generated.operations.map(operation => operation.operation)).to.deep.equal(['createNode', 'setSelection']);
        expect(result.changed).to.equal(true);
        expect(section?.type).to.equal('frame');
        expect(section?.children?.some(node => node.type === 'text' && node.content === prompt)).to.equal(false);
        expect(section?.children?.some(node => node.type === 'text' && node.content === 'Analytics that teams can act on')).to.equal(true);
        expect(section?.children?.find(node => node.role === 'button')?.fill?.[0]?.color).to.equal('#2563eb');
    });

    it('uses the system style-defaults skill when no style guide tags match', async () => {
        const document = service.createDesign('AI style defaults test');
        const generated = await service.generateAiOperations({
            prompt: 'Create a simple content panel',
            document,
            selection: []
        });
        const styleDefaults = generated.context.skills.find(skill => skill.name === 'style-defaults');

        expect(generated.source).to.equal('deterministic-fallback');
        expect(styleDefaults?.sourcePath).to.equal('Skills/System/OpenPencil/pen-ai-skills/phases/generation/style-defaults.md');
        expect(styleDefaults?.content).to.contain('VISUAL STYLE POLICY');
        expect(generated.context.skills.some(skill => skill.sourcePath.includes('/style-guides/'))).to.equal(false);
        expect(generated.operations.map(operation => operation.operation)).to.deep.equal(['createNode', 'setSelection']);
    });

    it('selects a system style guide from inferred prompt tags', async () => {
        const document = service.createDesign('AI tagged style guide test');
        const generated = await service.generateAiOperations({
            prompt: 'Create a dark analytics panel with cyan metrics',
            document,
            selection: []
        });
        const styleGuide = generated.context.skills.find(skill => skill.name === 'dashboard-analytics-dark');

        expect(styleGuide?.sourcePath).to.equal('Skills/System/OpenPencil/pen-ai-skills/style-guides/dashboard-analytics-dark.md');
        expect(styleGuide?.content).to.contain('A data-driven dark interface optimized for analytics dashboards');
        expect(styleGuide?.tags).to.include.members(['dashboard', 'data-focused', 'dark-mode', 'cyan-accent']);
        expect(generated.context.skills.map(skill => skill.name)).not.to.include('style-defaults');
    });

    it('includes full landing skill content, selected style guide content, and contrast rules in CyberVinci prompts', async () => {
        class CapturingPromptProvider extends OpenPencilCyberVinciAiDesignProvider {
            lastPrompt = '';

            override async generateOperations(request: OpenPencilAiDesignRequest, context: OpenPencilAiSkillContext): Promise<{ operations: OpenPencilDesignOperation[] }> {
                this.lastPrompt = this.createPrompt(request, context);
                return {
                    operations: [
                        {
                            operation: 'createNode',
                            parentId: null,
                            node: {
                                id: 'ai-captured-landing',
                                type: 'frame',
                                name: 'Captured landing',
                                width: 420,
                                height: 220,
                                children: []
                            }
                        },
                        {
                            operation: 'setSelection',
                            nodeIds: ['ai-captured-landing']
                        }
                    ]
                };
            }
        }
        const provider = new CapturingPromptProvider();
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('AI prompt content test');
        const generated = await providerService.generateAiOperations({
            prompt: 'Create a landing page using the saas-modern-light style guide',
            document,
            selection: []
        });

        expect(generated.source).to.equal('provider');
        expect(provider.lastPrompt).to.contain('Readability and contrast are mandatory');
        expect(provider.lastPrompt).to.contain('never place dark text on dark backgrounds or light text on light backgrounds');
        expect(provider.lastPrompt).to.contain('LANDING PAGE DESIGN PATTERNS');
        expect(provider.lastPrompt).to.contain('## Headline Hierarchy');
        expect(provider.lastPrompt).to.contain('ANTI-SLOP RULES');
        expect(provider.lastPrompt).to.contain('A clean, refined SaaS product interface');
        expect(provider.lastPrompt).to.contain('Source: Skills/System/OpenPencil/pen-ai-skills/style-guides/saas-modern-light.md');
    });

    it('captures continuation prompt context and layout guidance for provider continuation requests', async () => {
        class CapturingPromptProvider extends OpenPencilCyberVinciAiDesignProvider {
            lastPrompt = '';

            override async generateOperations(request: OpenPencilAiDesignRequest, context: OpenPencilAiSkillContext): Promise<{ operations: OpenPencilDesignOperation[] }> {
                this.lastPrompt = this.createPrompt(request, context);
                return {
                    operations: [
                        {
                            operation: 'createNode',
                            parentId: null,
                            node: {
                                id: 'ai-continuation-section',
                                type: 'frame',
                                name: 'Continuation section',
                                x: 120,
                                y: 392,
                                width: 520,
                                height: 180,
                                children: []
                            }
                        },
                        {
                            operation: 'setSelection',
                            nodeIds: ['ai-continuation-section']
                        }
                    ]
                };
            }
        }

        const provider = new CapturingPromptProvider();
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('AI continuation prompt test');
        const generated = await providerService.generateAiOperations({
            prompt: 'Continue the current design by adding the missing sections below the existing content',
            document,
            selection: [],
            mode: 'continuation'
        });
        const heroCard = generated.context.documentContext.activePageLayout.topLevelNodes.find(node => node.id === 'hero-card');

        expect(generated.source).to.equal('provider');
        expect(provider.lastPrompt).to.contain('Continuation mode: preserve the current design, all existing nodes, and all existing node IDs.');
        expect(provider.lastPrompt).to.contain('Continuation mode: do not remove, replace, or recreate existing page content; only add missing sections, missing states, or supporting elements.');
        expect(provider.lastPrompt).to.contain('Continuation mode: place new top-level content below the current content bottom or inside visible empty space described by the active-page layout summary; avoid covering existing nodes.');
        expect(provider.lastPrompt).to.contain('Continuation mode: finish with setSelection for the newly-created root node IDs so the user can inspect the continuation.');
        expect(generated.context.documentContext.requestMode).to.equal('continuation');
        expect(generated.context.documentContext.activePageLayout.contentBottom).to.be.at.least(356);
        expect(heroCard?.childCount).to.equal(0);
        expect(heroCard?.x).to.equal(120);
        expect(heroCard?.y).to.equal(96);
        expect(heroCard?.width).to.equal(520);
        expect(heroCard?.height).to.equal(260);
    });

    it('preserves continuation-created root frame positions below existing content', async () => {
        const provider: OpenPencilAiDesignProvider = {
            generateOperations: () => ({
                operations: [
                    {
                        operation: 'createNode',
                        parentId: null,
                        node: {
                            id: 'ai-continuation-panel-a',
                            type: 'frame',
                            name: 'Continuation panel A',
                            x: 80,
                            y: 432,
                            width: 320,
                            height: 180,
                            children: []
                        }
                    },
                    {
                        operation: 'createNode',
                        parentId: null,
                        node: {
                            id: 'ai-continuation-panel-b',
                            type: 'frame',
                            name: 'Continuation panel B',
                            x: 440,
                            y: 624,
                            width: 320,
                            height: 180,
                            children: []
                        }
                    },
                    {
                        operation: 'setSelection',
                        nodeIds: ['ai-continuation-panel-a', 'ai-continuation-panel-b']
                    }
                ]
            })
        };
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('AI continuation positions test');
        const generated = await providerService.generateAiOperations({
            prompt: 'Continue the current design with two new sections below the existing content',
            document,
            selection: [],
            mode: 'continuation'
        });
        const result = providerService.applyOperationsToDocument(document, [], generated.operations, { mode: 'continuation' });
        const validation = providerService.validateDocument(result.document);
        const page = result.document.pages![0];
        const panels = page.children.filter(node => node.id.startsWith('ai-continuation-panel'));

        expect(generated.source).to.equal('provider');
        expect(generated.diagnostics?.join('\n') ?? '').to.not.contain('preview application reported a partial failure');
        expect(panels.map(node => node.x)).to.deep.equal([80, 440]);
        expect(panels.map(node => node.y)).to.deep.equal([432, 624]);
        expect(panels.every(node => Number(node.y) > 356)).to.equal(true);
        expect(page.children.map(node => node.id).slice(-2)).to.deep.equal(['ai-continuation-panel-a', 'ai-continuation-panel-b']);
        expect(validation.valid).to.equal(true);
    });

    it('rejects provider previews that partially fail after earlier changes', async () => {
        const provider: OpenPencilAiDesignProvider = {
            generateOperations: () => ({
                operations: [
                    {
                        operation: 'updateNode',
                        nodeId: 'hero-title',
                        changes: {
                            content: 'Updated before failure'
                        }
                    },
                    {
                        operation: 'createNode',
                        parentId: 'missing-parent',
                        node: {
                            id: 'ai-broken-section',
                            type: 'frame',
                            width: 360,
                            height: 180,
                            children: []
                        }
                    }
                ]
            })
        };
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('AI partial preview failure test');
        const generated = await providerService.generateAiOperations({
            prompt: 'Update the selected node and add a missing section',
            document,
            selection: ['hero-title']
        });

        expect(generated.source).to.equal('deterministic-fallback');
        expect(generated.diagnostics?.join('\n') ?? '').to.contain('preview application reported a partial failure');
        expect(generated.diagnostics?.join('\n') ?? '').to.contain("Parent node 'missing-parent' was not found");
    });

    it('rejects continuation providers that try to update existing nodes', async () => {
        const provider: OpenPencilAiDesignProvider = {
            generateOperations: () => ({
                operations: [
                    {
                        operation: 'updateNode',
                        nodeId: 'hero-card',
                        changes: {
                            content: 'Should not replace existing continuation content'
                        }
                    },
                    {
                        operation: 'setSelection',
                        nodeIds: ['hero-card']
                    }
                ]
            })
        };
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('AI continuation rejection test');
        const generated = await providerService.generateAiOperations({
            prompt: 'Continue the current design with another section',
            document,
            selection: [],
            mode: 'continuation'
        });

        expect(generated.source).to.equal('deterministic-fallback');
        expect(generated.operations).to.deep.equal([]);
        expect(generated.diagnostics?.join('\n')).to.contain('continuation mode must preserve existing nodes and layout');
    });

    it('uses the deterministic in-process AI adapter for selected node maintenance edits', async () => {
        const document = service.createDesign('AI maintenance test');
        const generated = await service.generateAiOperations({
            prompt: 'Atualize para uma promessa mais direta em verde',
            document,
            selection: ['hero-title']
        });
        const result = service.applyOperationsToDocument(document, ['hero-title'], generated.operations);
        const title = result.document.pages![0].children.find(node => node.id === 'hero-title');

        expect(generated.source).to.equal('deterministic-fallback');
        expect(generated.context.phase).to.equal('maintenance');
        expect(generated.context.skills.map(skill => skill.name)).to.include.members(['local-edit', 'style-consistency']);
        expect(generated.context.documentContext.selectedNodeIds).to.deep.equal(['hero-title']);
        expect(generated.operations.map(operation => operation.operation)).to.deep.equal(['updateNode', 'setSelection']);
        expect(title?.content).to.equal('Atualize para uma promessa mais direta em verde');
        expect(title?.fill?.[0]?.color).to.equal('#16a34a');
        expect(result.selection).to.deep.equal(['hero-title']);
    });

    it('creates requested shapes inside the selected container instead of generating a new section', async () => {
        const document = service.createDesign('AI contained shape test');
        const generated = await service.generateAiOperations({
            prompt: 'adicione um retangulo vermelho dentro do retangulo verde',
            document,
            selection: ['hero-card']
        });
        const result = service.applyOperationsToDocument(document, ['hero-card'], generated.operations);
        const card = result.document.pages![0].children.find(node => node.id === 'hero-card');
        const child = card?.children?.find(node => node.id === result.selection[0]);

        expect(generated.source).to.equal('deterministic-fallback');
        expect(generated.operations.map(operation => operation.operation)).to.deep.equal(['addNode', 'setSelection']);
        expect(child?.type).to.equal('rectangle');
        expect(child?.fill?.[0]?.color).to.equal('#dc2626');
        expect(result.selection[0]).to.contain('rectangle');
    });

    it('finds the requested colored container when no node is selected', async () => {
        const document = service.createDesign('AI colored container test');
        const card = document.pages![0].children.find(node => node.id === 'hero-card');
        if (card) {
            card.name = 'Retangulo verde';
            card.fill = [{ type: 'solid', color: '#166534' }];
        }
        const generated = await service.generateAiOperations({
            prompt: 'adicione um retangulo vermelho dentro do retangulo verde',
            document,
            selection: []
        });
        const result = service.applyOperationsToDocument(document, [], generated.operations);
        const updatedCard = result.document.pages![0].children.find(node => node.id === 'hero-card');
        const child = updatedCard?.children?.find(node => node.id === result.selection[0]);

        expect(generated.operations.map(operation => operation.operation)).to.deep.equal(['addNode', 'setSelection']);
        expect(child?.type).to.equal('rectangle');
        expect(child?.fill?.[0]?.color).to.equal('#dc2626');
    });

    it('lets an in-process AI provider replace the deterministic fallback without external processes', async () => {
        const provider: OpenPencilAiDesignProvider = {
            generateOperations: (_request, context) => [
                {
                    operation: 'updateNode',
                    nodeId: context.documentContext.selectedNodeIds[0],
                    changes: {
                        content: `Provider edited via ${context.skills[0].name}`
                    }
                },
                {
                    operation: 'setSelection',
                    nodeIds: context.documentContext.selectedNodeIds
                }
            ]
        };
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('AI provider test');
        const generated = await providerService.generateAiOperations({
            prompt: 'Use the configured provider',
            document,
            selection: ['hero-title']
        });
        const result = providerService.applyOperationsToDocument(document, ['hero-title'], generated.operations);

        expect(generated.source).to.equal('provider');
        expect(result.document.pages![0].children.find(node => node.id === 'hero-title')?.content).to.equal('Provider edited via local-edit');
        expect(result.selection).to.deep.equal(['hero-title']);
    });

    it('normalizes provider-generated layout trees before inserting them into the page', async () => {
        const provider: OpenPencilAiDesignProvider = {
            id: 'large-layout-provider',
            label: 'Large layout provider',
            priority: 10,
            generateOperations: request => ({
                operations: [
                    {
                        operation: 'createNode',
                        parentId: request.document.activePageId,
                        node: {
                            id: 'ai-enterprise-automation-hero',
                            type: 'frame',
                            name: 'Enterprise automation hero',
                            x: 80,
                            y: 80,
                            width: 1280,
                            height: 720,
                            layout: 'vertical',
                            padding: { top: 24, right: 24, bottom: 24, left: 24 } as never,
                            gap: 16,
                            fill: '#f8fafc' as never,
                            stroke: '#334155' as never,
                            borderRadius: 28,
                            children: [{
                                id: 'ai-generated-title',
                                type: 'text',
                                width: 520,
                                height: 64,
                                content: 'Automate enterprise operations'
                            }, {
                                id: 'ai-generated-panel',
                                type: 'frame',
                                width: 680,
                                height: 180,
                                layout: 'horizontal',
                                gap: 12,
                                children: [{
                                    id: 'ai-generated-card',
                                    type: 'rectangle',
                                    width: 120,
                                    height: 80
                                }]
                            }]
                        }
                    },
                    {
                        operation: 'setSelection',
                        nodeIds: ['ai-enterprise-automation-hero']
                    }
                ]
            })
        };
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('AI oversized layout test');
        const generated = await providerService.generateAiOperations({
            prompt: 'Create a landing hero for enterprise automation',
            document,
            selection: []
        });
        const result = providerService.applyOperationsToDocument(document, [], generated.operations);
        const page = result.document.pages![0];
        const hero = page.children.find(node => node.id === 'ai-enterprise-automation-hero');
        const title = hero?.children?.find(node => node.id === 'ai-generated-title');
        const panel = hero?.children?.find(node => node.id === 'ai-generated-panel');
        const card = panel?.children?.find(node => node.id === 'ai-generated-card');

        expect(generated.source).to.equal('provider');
        expect(generated.operations.slice(0, 3).map(operation => operation.operation)).to.deep.equal(['removeNode', 'removeNode', 'removeNode']);
        expect(generated.operations.find(operation => operation.operation === 'createNode')).to.deep.include({ parentId: null });
        expect(page.children.map(node => node.id)).to.deep.equal(['ai-enterprise-automation-hero']);
        expect(hero?.width).to.equal(820);
        expect(hero?.height).to.equal(461.25);
        expect(hero?.x).to.equal(51.25);
        expect(hero?.y).to.equal(51.25);
        expect(hero?.cornerRadius).to.equal(17.94);
        expect(hero?.fill).to.deep.equal([{ type: 'solid', color: '#f8fafc' }]);
        expect(hero?.stroke).to.deep.include({ color: '#334155', width: 0.64, thickness: 0.64 });
        expect(title?.fill).to.deep.equal([{ type: 'solid', color: '#1d1d1f' }]);
        expect(title?.x).to.equal(15.38);
        expect(title?.y).to.equal(15.38);
        expect(panel?.x).to.equal(15.38);
        expect(panel?.y).to.equal(41);
        expect(card?.x).to.equal(0);
        expect(card?.y).to.equal(0);
    });

    it('omits unsafe duplicate provider sibling indexes so AI adds preserve visual stacking order', async () => {
        const provider: OpenPencilAiDesignProvider = {
            id: 'duplicate-index-provider',
            label: 'Duplicate index provider',
            priority: 10,
            generateOperations: () => ({
                operations: [
                    {
                        operation: 'addNode',
                        parentId: 'hero-card',
                        index: 0,
                        node: {
                            id: 'ai-card-background-layer',
                            type: 'rectangle',
                            name: 'AI card background layer',
                            width: 280,
                            height: 160
                        }
                    },
                    {
                        operation: 'addNode',
                        parentId: 'hero-card',
                        index: 0,
                        node: {
                            id: 'ai-card-label-layer',
                            type: 'text',
                            name: 'AI card label layer',
                            content: 'Generated label',
                            width: 180,
                            height: 24
                        }
                    },
                    {
                        operation: 'addNode',
                        parentId: 'hero-card',
                        index: 0,
                        node: {
                            id: 'ai-card-button-layer',
                            type: 'rectangle',
                            role: 'button',
                            name: 'AI card button layer',
                            width: 160,
                            height: 44
                        }
                    },
                    {
                        operation: 'setSelection',
                        nodeIds: ['ai-card-button-layer']
                    }
                ]
            })
        };
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('AI duplicate index test');
        const generated = await providerService.generateAiOperations({
            prompt: 'Add generated card layers',
            document,
            selection: ['hero-card']
        });
        const result = providerService.applyOperationsToDocument(document, ['hero-card'], generated.operations);
        const card = result.document.pages![0].children.find(node => node.id === 'hero-card');
        const generatedOrder = card?.children
            ?.map(node => node.id)
            .filter(id => id.startsWith('ai-card-'));
        const addOperations = generated.operations.filter((operation): operation is Extract<OpenPencilDesignOperation, { operation: 'addNode' }> => operation.operation === 'addNode');

        expect(generated.source).to.equal('provider');
        expect(addOperations.map(operation => operation.index)).to.deep.equal([undefined, undefined, undefined]);
        expect(generatedOrder).to.deep.equal(['ai-card-button-layer', 'ai-card-label-layer', 'ai-card-background-layer']);
    });

    it('sorts unindexed flat provider siblings front-to-back within the same parent', async () => {
        const provider: OpenPencilAiDesignProvider = {
            id: 'flat-z-order-provider',
            label: 'Flat z order provider',
            priority: 10,
            generateOperations: () => ({
                operations: [
                    {
                        operation: 'addNode',
                        parentId: 'hero-card',
                        node: {
                            id: 'ai-flat-button-layer',
                            type: 'rectangle',
                            role: 'button',
                            name: 'AI flat foreground button',
                            width: 160,
                            height: 44
                        }
                    },
                    {
                        operation: 'addNode',
                        parentId: 'hero-card',
                        node: {
                            id: 'ai-flat-title-layer',
                            type: 'text',
                            name: 'AI flat title label',
                            content: 'Generated title',
                            width: 180,
                            height: 24
                        }
                    },
                    {
                        operation: 'addNode',
                        parentId: 'hero-card',
                        node: {
                            id: 'ai-flat-background-layer',
                            type: 'rectangle',
                            name: 'AI flat background layer',
                            width: 280,
                            height: 160
                        }
                    },
                    {
                        operation: 'setSelection',
                        nodeIds: ['ai-flat-button-layer']
                    }
                ]
            })
        };
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('AI flat z order test');
        const generated = await providerService.generateAiOperations({
            prompt: 'Add generated flat card layers',
            document,
            selection: ['hero-card']
        });
        const addOperations = generated.operations.filter((operation): operation is Extract<OpenPencilDesignOperation, { operation: 'addNode' }> => operation.operation === 'addNode');
        const result = providerService.applyOperationsToDocument(document, ['hero-card'], generated.operations);
        const card = result.document.pages![0].children.find(node => node.id === 'hero-card');
        const generatedOrder = card?.children
            ?.map(node => node.id)
            .filter(id => id.startsWith('ai-flat-'));

        expect(generated.source).to.equal('provider');
        expect(addOperations.map(operation => operation.node.id)).to.deep.equal([
            'ai-flat-button-layer',
            'ai-flat-title-layer',
            'ai-flat-background-layer'
        ]);
        expect(generatedOrder).to.deep.equal([
            'ai-flat-button-layer',
            'ai-flat-title-layer',
            'ai-flat-background-layer'
        ]);
    });

    it('inserts streamed provider siblings by z-order as each operation is applied', async () => {
        const provider: OpenPencilAiDesignProvider = {
            id: 'stream-z-order-provider',
            label: 'Stream z order provider',
            priority: 10,
            generateOperations: () => ({ operations: [] }),
            async *streamOperations() {
                yield {
                    type: 'operation',
                    operation: {
                        operation: 'addNode',
                        parentId: 'hero-card',
                        index: 0,
                        node: {
                            id: 'ai-stream-background-layer',
                            type: 'rectangle',
                            name: 'AI stream background layer',
                            width: 280,
                            height: 160
                        }
                    }
                };
                yield {
                    type: 'operation',
                    operation: {
                        operation: 'addNode',
                        parentId: 'hero-card',
                        index: 0,
                        node: {
                            id: 'ai-stream-title-layer',
                            type: 'text',
                            name: 'AI stream title label',
                            content: 'Streamed title',
                            width: 180,
                            height: 24
                        }
                    }
                };
                yield {
                    type: 'operation',
                    operation: {
                        operation: 'addNode',
                        parentId: 'hero-card',
                        index: 0,
                        node: {
                            id: 'ai-stream-button-layer',
                            type: 'rectangle',
                            role: 'button',
                            name: 'AI stream foreground button',
                            width: 160,
                            height: 44
                        }
                    }
                };
                yield { type: 'complete' };
            }
        };
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('AI streamed z order test');
        let currentDocument = document;
        let currentSelection = ['hero-card'];
        const generated = await providerService.streamAiOperations({
            prompt: 'Add streamed generated card layers',
            document: currentDocument,
            selection: currentSelection
        }, async streamed => {
            const result = providerService.applyOperationsToDocument(currentDocument, currentSelection, streamed.operations, { mode: 'maintenance' });
            currentDocument = result.document;
            currentSelection = result.selection;
            return {
                document: currentDocument,
                selection: currentSelection,
                applied: result.changed ? streamed.operations.length : 0
            };
        });
        const card = currentDocument.pages![0].children.find(node => node.id === 'hero-card');
        const generatedOrder = card?.children
            ?.map(node => node.id)
            .filter(id => id.startsWith('ai-stream-'));
        const addOperations = generated.operations.filter((operation): operation is Extract<OpenPencilDesignOperation, { operation: 'addNode' }> => operation.operation === 'addNode');

        expect(generated.source).to.equal('provider');
        expect(addOperations.map(operation => operation.node.id)).to.deep.equal([
            'ai-stream-background-layer',
            'ai-stream-title-layer',
            'ai-stream-button-layer'
        ]);
        expect(generatedOrder).to.deep.equal([
            'ai-stream-title-layer',
            'ai-stream-button-layer',
            'ai-stream-background-layer'
        ]);
    });

    it('expands streamed provider containers so later children remain visible', async () => {
        const provider: OpenPencilAiDesignProvider = {
            id: 'visible-bounds-stream-provider',
            label: 'Visible bounds stream provider',
            priority: 10,
            generateOperations: () => ({ operations: [] }),
            async *streamOperations(request) {
                yield {
                    type: 'operation',
                    operation: {
                        operation: 'createNode',
                        parentId: request.document.activePageId,
                        node: {
                            id: 'ai-visible-screen',
                            type: 'frame',
                            name: 'AI visible screen',
                            width: 320,
                            height: 180,
                            clipContent: true,
                            fill: [{ type: 'solid', color: '#ffffff' }]
                        }
                    }
                };
                yield {
                    type: 'operation',
                    operation: {
                        operation: 'addNode',
                        parentId: 'ai-visible-screen',
                        node: {
                            id: 'ai-visible-offscreen-card',
                            type: 'frame',
                            name: 'AI visible offscreen card',
                            x: 360,
                            y: 140,
                            width: 180,
                            height: 96,
                            fill: [{ type: 'solid', color: '#f8fafc' }]
                        }
                    }
                };
                yield { type: 'complete' };
            }
        };
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('AI streamed visible bounds test');
        let currentDocument = document;
        let currentSelection: string[] = [];

        await providerService.streamAiOperations({
            prompt: 'Create a streamed design where every element remains visible',
            document: currentDocument,
            selection: currentSelection
        }, async streamed => {
            const result = providerService.applyOperationsToDocument(currentDocument, currentSelection, streamed.operations, {
                mode: 'maintenance',
                normalizeVisibleBounds: true
            });
            currentDocument = result.document;
            currentSelection = result.selection;
            return {
                document: currentDocument,
                selection: currentSelection,
                applied: result.changed ? streamed.operations.length : 0
            };
        });

        const page = currentDocument.pages![0];
        const root = page.children.find(node => node.id === 'ai-visible-screen');

        expect(root).to.exist;
        expect(root?.clipContent).to.equal(false);
        expect(Number(root?.width)).to.be.greaterThan(539);
        expect(Number(root?.height)).to.be.greaterThan(235);
        expect(Number(page.width)).to.be.at.least(Number(root?.x ?? 0) + Number(root?.width ?? 0));
    });

    it('preserves provider parent-before-child order while sorting flat child siblings', async () => {
        const provider: OpenPencilAiDesignProvider = {
            id: 'flat-child-z-order-provider',
            label: 'Flat child z order provider',
            priority: 10,
            generateOperations: request => ({
                operations: [
                    {
                        operation: 'createNode',
                        parentId: request.document.activePageId,
                        node: {
                            id: 'ai-flat-parent-screen',
                            type: 'frame',
                            name: 'AI flat parent screen',
                            width: 640,
                            height: 420,
                            children: []
                        }
                    },
                    {
                        operation: 'addNode',
                        parentId: 'ai-flat-parent-screen',
                        node: {
                            id: 'ai-flat-parent-button',
                            type: 'rectangle',
                            role: 'button',
                            name: 'AI flat parent foreground button',
                            width: 160,
                            height: 44
                        }
                    },
                    {
                        operation: 'addNode',
                        parentId: 'ai-flat-parent-screen',
                        node: {
                            id: 'ai-flat-parent-background',
                            type: 'rectangle',
                            name: 'AI flat parent background',
                            width: 640,
                            height: 420
                        }
                    },
                    {
                        operation: 'setSelection',
                        nodeIds: ['ai-flat-parent-screen']
                    }
                ]
            })
        };
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('AI flat child z order test');
        const generated = await providerService.generateAiOperations({
            prompt: 'Create a selected container with flat child layers',
            document,
            selection: ['hero-card']
        });
        const result = providerService.applyOperationsToDocument(document, ['hero-card'], generated.operations);
        const screen = result.document.pages![0].children.find(node => node.id === 'ai-flat-parent-screen');

        expect(generated.source).to.equal('provider');
        expect(generated.operations.map(operation => operation.operation)).to.deep.equal(['createNode', 'addNode', 'addNode', 'setSelection']);
        expect(generated.operations
            .filter((operation): operation is Extract<OpenPencilDesignOperation, { operation: 'createNode' | 'addNode' }> => operation.operation === 'createNode' || operation.operation === 'addNode')
            .map(operation => operation.node.id)
        ).to.deep.equal(['ai-flat-parent-screen', 'ai-flat-parent-button', 'ai-flat-parent-background']);
        expect(screen?.children?.map(node => node.id)).to.deep.equal(['ai-flat-parent-button', 'ai-flat-parent-background']);
    });

    it('preserves clearly increasing provider sibling indexes', async () => {
        const provider: OpenPencilAiDesignProvider = {
            id: 'increasing-index-provider',
            label: 'Increasing index provider',
            priority: 10,
            generateOperations: () => ({
                operations: [
                    {
                        operation: 'addNode',
                        parentId: 'hero-card',
                        index: 0,
                        node: {
                            id: 'ai-valid-index-background',
                            type: 'rectangle',
                            name: 'AI valid index background',
                            width: 240,
                            height: 120
                        }
                    },
                    {
                        operation: 'addNode',
                        parentId: 'hero-card',
                        index: 1,
                        node: {
                            id: 'ai-valid-index-title',
                            type: 'text',
                            name: 'AI valid index title',
                            content: 'Indexed title',
                            width: 200,
                            height: 28
                        }
                    }
                ]
            })
        };
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('AI increasing index test');
        const generated = await providerService.generateAiOperations({
            prompt: 'Add indexed layers',
            document,
            selection: ['hero-card']
        });
        const addOperations = generated.operations.filter((operation): operation is Extract<OpenPencilDesignOperation, { operation: 'addNode' }> => operation.operation === 'addNode');

        expect(generated.source).to.equal('provider');
        expect(addOperations.map(operation => operation.index)).to.deep.equal([0, 1]);
    });

    it('sorts provider-generated non-auto-layout children front-to-back while preserving auto-layout order', async () => {
        const provider: OpenPencilAiDesignProvider = {
            id: 'z-order-provider',
            label: 'Z order provider',
            priority: 10,
            generateOperations: () => ({
                operations: [
                    {
                        operation: 'createNode',
                        parentId: null,
                        node: {
                            id: 'ai-z-order-screen',
                            type: 'frame',
                            name: 'AI z-order screen',
                            width: 760,
                            height: 520,
                            children: [
                                {
                                    id: 'ai-z-title',
                                    type: 'text',
                                    name: 'Foreground title',
                                    content: 'Welcome back',
                                    width: 260,
                                    height: 42
                                },
                                {
                                    id: 'ai-z-background',
                                    type: 'rectangle',
                                    name: 'Screen background',
                                    width: 760,
                                    height: 520
                                },
                                {
                                    id: 'ai-z-form-card',
                                    type: 'frame',
                                    name: 'Login form card',
                                    layout: 'vertical',
                                    width: 320,
                                    height: 180,
                                    children: [
                                        {
                                            id: 'ai-z-email-label',
                                            type: 'text',
                                            name: 'Email label',
                                            content: 'Email',
                                            width: 120,
                                            height: 24
                                        },
                                        {
                                            id: 'ai-z-email-field',
                                            type: 'rectangle',
                                            name: 'Email field',
                                            width: 260,
                                            height: 44
                                        }
                                    ]
                                },
                                {
                                    id: 'ai-z-primary-button',
                                    type: 'rectangle',
                                    role: 'button',
                                    name: 'Primary button',
                                    width: 180,
                                    height: 44
                                }
                            ]
                        }
                    },
                    {
                        operation: 'setSelection',
                        nodeIds: ['ai-z-order-screen']
                    }
                ]
            })
        };
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('AI z order test');
        const generated = await providerService.generateAiOperations({
            prompt: 'Create a login page with background card title and button',
            document,
            selection: []
        });
        const createOperation = generated.operations.find((operation): operation is Extract<OpenPencilDesignOperation, { operation: 'createNode' }> => operation.operation === 'createNode');
        const formCard = createOperation?.node.children?.find(node => node.id === 'ai-z-form-card');

        expect(generated.source).to.equal('provider');
        expect(createOperation?.node.children?.map(node => node.id)).to.deep.equal([
            'ai-z-title',
            'ai-z-primary-button',
            'ai-z-form-card',
            'ai-z-background'
        ]);
        expect(formCard?.children?.map(node => node.id)).to.deep.equal(['ai-z-email-label', 'ai-z-email-field']);
    });

    it('arranges multiple provider-generated root views side by side instead of overlapping them', async () => {
        const provider: OpenPencilAiDesignProvider = {
            id: 'multi-view-provider',
            label: 'Multi view provider',
            priority: 10,
            generateOperations: request => ({
                operations: [
                    {
                        operation: 'createNode',
                        parentId: request.document.activePageId,
                        node: {
                            id: 'ai-desktop-view',
                            type: 'frame',
                            name: 'Desktop login view',
                            x: 40,
                            y: 40,
                            width: 820,
                            height: 520,
                            children: []
                        }
                    },
                    {
                        operation: 'createNode',
                        parentId: request.document.activePageId,
                        node: {
                            id: 'ai-mobile-view',
                            type: 'frame',
                            name: 'Mobile login view',
                            x: 650,
                            y: 60,
                            width: 250,
                            height: 540,
                            children: []
                        }
                    },
                    {
                        operation: 'setSelection',
                        nodeIds: ['ai-desktop-view', 'ai-mobile-view']
                    }
                ]
            })
        };
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('AI multi-view layout test');
        const generated = await providerService.generateAiOperations({
            prompt: 'Crie uma tela de login desktop e mobile lado a lado',
            document,
            selection: []
        });
        const result = providerService.applyOperationsToDocument(document, [], generated.operations);
        const page = result.document.pages![0];
        const desktop = page.children.find(node => node.id === 'ai-desktop-view')!;
        const mobile = page.children.find(node => node.id === 'ai-mobile-view')!;

        expect(desktop.x! + Number(desktop.width)).to.be.lessThan(mobile.x!);
        expect(mobile.x! + Number(mobile.width)).to.be.at.most(page.width!);
        expect(Number(desktop.width)).to.be.lessThan(820);
        expect(Number(mobile.width)).to.be.lessThan(250);
        expect(result.selection).to.deep.equal(['ai-desktop-view', 'ai-mobile-view']);
    });

    it('falls back with diagnostics when a provider returns non-contract operations', async () => {
        const provider: OpenPencilAiDesignProvider = {
            id: 'invalid-provider',
            label: 'Invalid test provider',
            priority: 10,
            generateOperations: () => [
                {
                    operation: 'updateNode',
                    changes: {
                        content: 'Missing node id'
                    }
                } as unknown as OpenPencilDesignOperation
            ]
        };
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('AI provider fallback test');
        const generated = await providerService.generateAiOperations({
            prompt: 'Use a provider result that cannot be applied',
            document,
            selection: ['hero-title']
        });
        const result = providerService.applyOperationsToDocument(document, ['hero-title'], generated.operations);

        expect(generated.source).to.equal('deterministic-fallback');
        expect(generated.diagnostics?.join('\n')).to.contain('Invalid test provider returned operations');
        expect(result.document.pages![0].children.find(node => node.id === 'hero-title')?.content).to.equal('Use a provider result that cannot be applied');
    });

    it('falls back with diagnostics when provider operations cannot preview against the document', async () => {
        const provider: OpenPencilAiDesignProvider = {
            id: 'missing-node-provider',
            label: 'Missing node provider',
            priority: 10,
            generateOperations: () => ({
                operations: [
                    {
                        operation: 'updateNode',
                        nodeId: 'missing-node',
                        changes: {
                            content: 'This cannot apply'
                        }
                    }
                ],
                diagnostics: ['model returned a syntactically valid edit']
            })
        };
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('AI provider preview validation test');
        const generated = await providerService.generateAiOperations({
            prompt: 'Use a provider result that targets a missing node',
            document,
            selection: ['hero-title']
        });

        expect(generated.source).to.equal('deterministic-fallback');
        expect(generated.diagnostics?.join('\n')).to.contain('Missing node provider: model returned a syntactically valid edit');
        expect(generated.diagnostics?.join('\n')).to.contain('operations were rejected because they did not change the preview');
    });

    it('uses a prompt-specific local screen when page-level provider operations are rejected', async () => {
        const provider: OpenPencilAiDesignProvider = {
            id: 'bad-page-provider',
            label: 'Bad page provider',
            priority: 10,
            generateOperations: () => ({
                operations: [{
                    operation: 'createNode',
                    parentId: 'missing-parent',
                    node: {
                        id: 'bad-login-screen',
                        type: 'frame',
                        width: 900,
                        height: 620
                    }
                }]
            })
        };
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('AI page failure test');
        const generated = await providerService.generateAiOperations({
            prompt: 'crie uma tela de login inspirada no site da apple para mobile e desktop',
            document,
            selection: []
        });
        const result = providerService.applyOperationsToDocument(document, [], generated.operations);
        const screen = result.document.pages![0].children.find(node => node.id === result.selection[0]);

        expect(generated.source).to.equal('deterministic-fallback');
        expect(generated.diagnostics?.join('\n')).to.contain('OpenPencil AI page generation did not run a usable AI result');
        expect(generated.diagnostics?.join('\n')).to.contain('operations were invalid or failed preview validation');
        expect(generated.diagnostics?.join('\n')).to.contain("Parent node 'missing-parent' was not found");
        expect(screen?.name).to.equal('AI mobile banking login screen');
        expect(screen?.children?.some(node => node.name === 'Login form card')).to.equal(true);
    });

    it('uses CyberVinci language-model responses when they contain structured operations JSON', async () => {
        const provider = new OpenPencilCyberVinciAiDesignProvider();
        const mutableProvider = provider as unknown as {
            languageModelRegistry: unknown;
            languageModelService: unknown;
            lastPrompt?: string;
            lastRequest?: {
                response_format?: {
                    type: string;
                    json_schema?: {
                        schema?: {
                            properties?: {
                                operations?: {
                                    items?: {
                                        properties?: {
                                            operation?: {
                                                enum?: string[];
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };
            selectedPurposes?: string[];
        };
        mutableProvider.selectedPurposes = [];
        mutableProvider.languageModelRegistry = {
            selectLanguageModel: async (selector: { purpose: string }) => {
                mutableProvider.selectedPurposes?.push(selector.purpose);
                return selector.purpose === 'chat'
                    ? { id: 'mock-cybervinci-model', status: { status: 'ready' } }
                    : undefined;
            }
        };
        mutableProvider.languageModelService = {
            sendRequest: async (_model: unknown, request: {
                messages: Array<{ text: string }>;
                response_format?: {
                    type: string;
                    json_schema?: {
                        schema?: {
                            properties?: {
                                operations?: {
                                    items?: {
                                        properties?: {
                                            operation?: {
                                                enum?: string[];
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                };
            }) => {
                mutableProvider.lastRequest = request;
                mutableProvider.lastPrompt = request.messages.map(message => message.text).join('\n');
                return {
                    text: [
                        'Here is the edit:',
                        '```json',
                        '{"contract":"openpencil.design-operations.v1","operations":[{"operation":"updateNode","nodeId":"hero-title","changes":{"content":"Model generated title"}},{"operation":"setSelection","nodeIds":["hero-title"]}]}',
                        '```'
                    ].join('\n')
                };
            }
        };
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('CyberVinci provider test');
        const generated = await providerService.generateAiOperations({
            prompt: 'Update the selected headline',
            document,
            selection: ['hero-title']
        });
        const result = providerService.applyOperationsToDocument(document, ['hero-title'], generated.operations);

        expect(generated.source).to.equal('provider');
        expect(generated.providerLabel).to.equal('CyberVinci language model');
        expect(generated.diagnostics?.join('\n')).to.contain("No Theia AI model selected for purpose 'openpencil-design'");
        expect(mutableProvider.selectedPurposes).to.deep.equal(['openpencil-design', 'chat']);
        expect(mutableProvider.lastPrompt).to.contain('Do not return DOM selectors');
        expect(mutableProvider.lastPrompt).to.contain('prompt-to-design generation');
        expect(mutableProvider.lastRequest?.response_format?.type).to.equal('json_schema');
        expect(mutableProvider.lastRequest?.response_format?.json_schema?.schema?.properties?.operations?.items?.properties?.operation?.enum).to.include('updateNode');
        expect(result.document.pages![0].children.find(node => node.id === 'hero-title')?.content).to.equal('Model generated title');
        expect(result.selection).to.deep.equal(['hero-title']);
    });

    it('accepts Codex-style single operation JSON and ignores earlier non-operation JSON', async () => {
        const provider = new OpenPencilCyberVinciAiDesignProvider();
        const mutableProvider = provider as unknown as {
            languageModelRegistry: unknown;
            languageModelService: unknown;
            lastPrompt?: string;
        };
        mutableProvider.languageModelRegistry = {
            selectLanguageModel: async () => ({ id: 'codex-provider', status: { status: 'ready' } })
        };
        mutableProvider.languageModelService = {
            sendRequest: async (_model: unknown, request: { messages: Array<{ text: string }> }) => {
                mutableProvider.lastPrompt = request.messages.map(message => message.text).join('\n');
                return {
                    text: [
                        '{"status":"not-the-design-contract"}',
                        '```json',
                        '{"operation":"updateNode","nodeId":"hero-title","changes":{"content":"Single operation title"}}',
                        '```'
                    ].join('\n')
                };
            }
        };
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('CyberVinci Codex single op test');
        const generated = await providerService.generateAiOperations({
            prompt: 'Update the selected headline',
            document,
            selection: ['hero-title']
        });

        expect(generated.source).to.equal('provider');
        expect(mutableProvider.lastPrompt).to.contain('not a coding assistant');
        expect(generated.operations).to.deep.equal([
            { operation: 'updateNode', nodeId: 'hero-title', changes: { content: 'Single operation title' } }
        ]);
    });

    it('reports CyberVinci diagnostics and falls back when no Theia AI model is configured', async () => {
        const provider = new OpenPencilCyberVinciAiDesignProvider();
        const mutableProvider = provider as unknown as {
            languageModelRegistry: unknown;
            languageModelService: unknown;
        };
        mutableProvider.languageModelRegistry = {
            selectLanguageModel: async () => undefined
        };
        mutableProvider.languageModelService = {
            sendRequest: async () => {
                throw new Error('sendRequest should not be called without a model');
            }
        };
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('CyberVinci missing model test');
        const generated = await providerService.generateAiOperations({
            prompt: 'Update the selected headline',
            document,
            selection: ['hero-title']
        });

        expect(generated.source).to.equal('deterministic-fallback');
        expect(generated.diagnostics?.join('\n')).to.contain('No configured Theia AI language model is available');
    });

    it('creates a local page-level screen with diagnostics when no Theia AI model is configured', async () => {
        const provider = new OpenPencilCyberVinciAiDesignProvider();
        const mutableProvider = provider as unknown as {
            languageModelRegistry: unknown;
            languageModelService: unknown;
        };
        mutableProvider.languageModelRegistry = {
            selectLanguageModel: async () => undefined
        };
        mutableProvider.languageModelService = {
            sendRequest: async () => {
                throw new Error('sendRequest should not be called without a model');
            }
        };
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('CyberVinci page fallback test');
        const generated = await providerService.generateAiOperations({
            prompt: 'crie uma tela de login mobile',
            document,
            selection: []
        });
        const result = providerService.applyOperationsToDocument(document, [], generated.operations);
        const screen = result.document.pages![0].children.find(node => node.id === result.selection[0]);

        expect(generated.source).to.equal('deterministic-fallback');
        expect(generated.diagnostics?.join('\n')).to.contain('OpenPencil AI page generation did not run a usable AI result');
        expect(generated.diagnostics?.join('\n')).to.contain('No configured Theia AI language model is available');
        expect(generated.diagnostics?.join('\n')).to.contain("purpose 'openpencil-design' or 'chat'");
        expect(screen?.name).to.equal('AI mobile banking login screen');
    });

    it('creates a local page-level screen with configuration guidance when no AI provider is registered', async () => {
        const document = service.createDesign('OpenPencil missing provider page test');
        const generated = await service.generateAiOperations({
            prompt: 'Faça uma página web para desktop e para mobile de login de uma plataforma de jogos',
            document,
            selection: []
        });
        const result = service.applyOperationsToDocument(document, [], generated.operations);
        const screen = result.document.pages![0].children.find(node => node.id === result.selection[0]);

        expect(generated.source).to.equal('deterministic-fallback');
        expect(generated.diagnostics?.join('\n')).to.contain('requires a configured AI provider');
        expect(generated.diagnostics?.join('\n')).to.contain('no OpenPencil AI provider is registered');
        expect(generated.diagnostics?.join('\n')).to.contain("purpose 'openpencil-design' or 'chat'");
        expect(screen?.name).to.equal('AI mobile banking login screen');
    });

    it('builds a Figma-like mobile banking login design from the prompt locally', async () => {
        const document = service.createDesign('OpenPencil local prompt design test');
        const generated = await service.generateAiOperations({
            prompt: 'Create a mobile banking login screen with dark blue gradient, card, email field, password field, and primary button',
            document,
            selection: []
        });
        const result = service.applyOperationsToDocument(document, [], generated.operations);
        const screen = result.document.pages![0].children.find(node => node.id === result.selection[0]);
        const card = screen?.children?.find(node => node.name === 'Login form card');
        const labels = service.getDocumentSummary(result.document).nodes.map(node => `${node.name ?? ''} ${node.text ?? ''}`).join('\n');

        expect(generated.source).to.equal('deterministic-fallback');
        expect(screen?.name).to.equal('AI mobile banking login screen');
        expect(screen?.fill?.[0]?.type).to.equal('linear_gradient');
        expect(card?.role).to.equal('card');
        expect(labels).to.contain('CyberBank secure access');
        expect(labels).to.contain('Email address');
        expect(labels).to.contain('Sign in securely');
        expect(labels).not.to.contain('Automatize seus processos com IA');
    });

    it('accepts real provider output for page-level prompts without using the deterministic fallback', async () => {
        const provider: OpenPencilAiDesignProvider = {
            id: 'page-provider',
            label: 'Page provider',
            priority: 10,
            generateOperations: () => ({
                operations: [
                    {
                        operation: 'createNode',
                        parentId: null,
                        node: {
                            id: 'ai-login-page',
                            type: 'frame',
                            name: 'AI generated login page',
                            width: 760,
                            height: 520,
                            children: [
                                {
                                    id: 'ai-login-title',
                                    type: 'text',
                                    name: 'Login title',
                                    content: 'Entre no LudoJoy',
                                    width: 300,
                                    height: 42
                                }
                            ]
                        }
                    },
                    { operation: 'setSelection', nodeIds: ['ai-login-page'] }
                ]
            })
        };
        const providerService = new OpenPencilDesignCommandServiceImpl(provider);
        const document = providerService.createDesign('CyberVinci page provider test');
        const generated = await providerService.generateAiOperations({
            prompt: 'crie uma tela de login mobile',
            document,
            selection: []
        });

        expect(generated.source).to.equal('provider');
        expect(generated.providerLabel).to.equal('Page provider');
        expect(generated.operations.map(operation => operation.operation)).to.deep.equal(['removeNode', 'removeNode', 'removeNode', 'createNode', 'setSelection']);
    });

    it('exports documents to HTML', () => {
        const document = service.createDesign('Export test');
        const html = service.exportDocument(document, [], 'html-css');

        expect(html).to.contain('<!DOCTYPE html>');
        expect(html).to.contain('width:900px');
        expect(html).to.contain('min-height:620px');
        expect(html).to.contain('OpenPencil Design');
    });

    it('exports documents to standalone SVG', () => {
        const document = service.createDesign('SVG export test');
        const svg = service.exportDocument(document, [], 'svg');

        expect(svg).to.contain('<svg xmlns="http://www.w3.org/2000/svg"');
        expect(svg).to.contain('viewBox="0 0 900 620"');
        expect(svg).to.contain('<rect width="900" height="620" fill="#ffffff"');
        expect(svg).to.contain('OpenPencil Design');
    });

    it('exports richer visual nodes to HTML and React', () => {
        const document = service.createDesign('Rich export test');
        const enriched = service.applyOperationsToDocument(document, [], [
            {
                operation: 'addNode',
                node: {
                    id: 'brand-mark',
                    type: 'ellipse',
                    name: 'Brand mark',
                    x: 80,
                    y: 80,
                    width: 72,
                    height: 72,
                    fill: [{ type: 'solid', color: '#dcfce7' }],
                    stroke: { color: '#16a34a', width: 2 }
                }
            },
            {
                operation: 'addNode',
                node: {
                    id: 'trend-line',
                    type: 'line',
                    name: 'Trend line',
                    x: 80,
                    y: 180,
                    width: 240,
                    height: 48,
                    stroke: { color: '#334155', width: 3 }
                }
            },
            {
                operation: 'addNode',
                node: {
                    id: 'preview-image',
                    type: 'image',
                    name: 'Preview image',
                    x: 360,
                    y: 80,
                    width: 180,
                    height: 120,
                    src: 'https://example.com/image.png'
                }
            }
        ]);

        const html = service.exportDocument(enriched.document, [], 'html-css');
        const react = service.exportDocument(enriched.document, ['preview-image'], 'react-tailwind', true);

        expect(html).to.contain('<ellipse');
        expect(html).to.contain('<line');
        expect(html).to.contain('<img src="https://example.com/image.png"');
        expect(react).to.contain('<img');
        expect(react).to.contain('https://example.com/image.png');
        expect(react).to.contain('style={{');
        expect(react).not.to.contain('style={{{');
    });

    it('exports icon font nodes and fill opacity across web and SVG targets', () => {
        const document = service.createDesign('Icon export test');
        const enriched = service.applyOperationsToDocument(document, [], [
            {
                operation: 'addNode',
                node: {
                    id: 'status-icon',
                    type: 'icon_font',
                    name: 'Status icon',
                    x: 44,
                    y: 48,
                    width: 32,
                    height: 32,
                    content: 'check_circle',
                    fontFamily: 'Material Icons',
                    fontSize: 28,
                    fill: [{ type: 'solid', color: '#16a34a', opacity: 0.6 }]
                }
            },
            {
                operation: 'addNode',
                node: {
                    id: 'soft-card',
                    type: 'rectangle',
                    x: 96,
                    y: 48,
                    width: 120,
                    height: 64,
                    fill: [{ type: 'solid', color: '#2563eb', opacity: 0.25 }],
                    stroke: { color: '#1d4ed8', width: 2, opacity: 0.5 }
                }
            }
        ]);

        const html = service.exportDocument(enriched.document, [], 'html-css');
        const svg = service.exportDocument(enriched.document, [], 'svg');
        const reactNative = service.exportDocument(enriched.document, ['status-icon'], 'react-native', true);

        expect(html).to.contain('font-family:Material Icons');
        expect(html).to.contain('color:rgba(22, 163, 74, 0.6)');
        expect(html).to.contain('background-color:rgba(37, 99, 235, 0.25)');
        expect(svg).to.contain('fill-opacity="0.25"');
        expect(svg).to.contain('stroke-opacity="0.5"');
        expect(svg).to.contain('check_circle');
        expect(reactNative).to.contain('<Text');
        expect(reactNative).to.contain('check_circle');
    });

    it('exports documents to Vue and Svelte components', () => {
        const document = service.createDesign('Component export test');
        const vue = service.exportDocument(document, [], 'vue');
        const svelte = service.exportDocument(document, [], 'svelte');

        expect(vue).to.contain('<template>');
        expect(vue).to.contain('<script setup lang="ts">');
        expect(vue).to.contain('OpenPencil Design');
        expect(svelte).to.contain('<main style="position:relative;width:900px;min-height:620px;background:#ffffff;">');
        expect(svelte).to.contain('OpenPencil Design');
    });

    it('exports documents to native application targets', () => {
        const document = service.createDesign('Native export test');
        const enriched = service.applyToDocument(document, [], {
            operation: 'addNode',
            node: {
                id: 'native-image',
                type: 'image',
                name: 'Native image',
                x: 280,
                y: 96,
                width: 180,
                height: 120,
                src: 'https://example.com/native.png'
            }
        });

        const reactNative = service.exportDocument(enriched.document, [], 'react-native');
        const flutter = service.exportDocument(enriched.document, [], 'flutter');
        const swiftui = service.exportDocument(enriched.document, [], 'swiftui');
        const compose = service.exportDocument(enriched.document, [], 'jetpack-compose');

        expect(reactNative).to.contain("import { Image, Text, View } from 'react-native';");
        expect(reactNative).to.contain('OpenPencil Design');
        expect(reactNative).to.contain("uri: 'https://example.com/native.png'");
        expect(flutter).to.contain("import 'package:flutter/material.dart';");
        expect(flutter).to.contain('class OpenPencilDesign extends StatelessWidget');
        expect(flutter).to.contain("Image.network('https://example.com/native.png'");
        expect(swiftui).to.contain('import SwiftUI');
        expect(swiftui).to.contain('struct OpenPencilDesign: View');
        expect(swiftui).to.contain('AsyncImage(url: URL(string: "https://example.com/native.png"))');
        expect(compose).to.contain('fun OpenPencilDesign()');
        expect(compose).to.contain('coil.compose.AsyncImage');
        expect(compose).to.contain('model = "https://example.com/native.png"');
    });

    it('keeps every advertised export and codegen target wired to a non-empty product generator', () => {
        const document = service.createDesign('Target parity test');
        const formats: Array<{ format: OpenPencilExportFormat; markers: string[] }> = [
            { format: 'openpencil-json', markers: ['"version": "0.7.6"', '"pages"'] },
            { format: 'openpencil-summary-json', markers: ['"name": "Target parity test"', '"nodes"'] },
            { format: 'react-tailwind', markers: ['export function OpenPencilDesign()', 'OpenPencil Design'] },
            { format: 'html-css', markers: ['<!DOCTYPE html>', 'OpenPencil Design'] },
            { format: 'svg', markers: ['<svg xmlns="http://www.w3.org/2000/svg"', 'OpenPencil Design'] },
            { format: 'vue', markers: ['<template>', 'OpenPencil Design'] },
            { format: 'svelte', markers: ['<main style=', 'OpenPencil Design'] },
            { format: 'react-native', markers: ["import React from 'react';", 'OpenPencil Design'] },
            { format: 'flutter', markers: ["import 'package:flutter/material.dart';", 'OpenPencil Design'] },
            { format: 'swiftui', markers: ['import SwiftUI', 'OpenPencil Design'] },
            { format: 'jetpack-compose', markers: ['fun OpenPencilDesign()', 'OpenPencil Design'] }
        ];

        for (const { format, markers } of formats) {
            const output = service.exportDocument(document, [], format);

            expect(output.trim(), format).not.to.equal('');
            for (const marker of markers) {
                expect(output, format).to.contain(marker);
            }
        }
    });

    it('preserves selection-only codegen across web, component, and native targets', () => {
        const document = service.createDesign('Selection codegen parity test');
        const formats: OpenPencilExportFormat[] = [
            'react-tailwind',
            'html-css',
            'vue',
            'svelte',
            'react-native',
            'flutter',
            'swiftui',
            'jetpack-compose'
        ];

        for (const format of formats) {
            const output = service.exportDocument(document, ['hero-title'], format, true);

            expect(output, format).to.contain('OpenPencil Design');
            expect(output, format).not.to.contain('Hero copy');
        }
    });

    it('supports the core AI mutation contract for add, move, duplicate, remove, and selection', () => {
        const document = service.createDesign('AI mutation contract test');
        const result = service.applyOperationsToDocument(document, ['hero-title'], [
            {
                operation: 'addNode',
                node: {
                    id: 'agent-button',
                    type: 'rectangle',
                    name: 'Agent button',
                    x: 300,
                    y: 360,
                    width: 180,
                    height: 48,
                    fill: [{ type: 'solid', color: '#2563eb' }]
                }
            },
            {
                operation: 'moveNode',
                nodeId: 'agent-button',
                x: 320,
                y: 372
            },
            {
                operation: 'duplicateNode',
                nodeId: 'agent-button'
            },
            {
                operation: 'removeNode',
                nodeId: 'hero-copy'
            },
            {
                operation: 'setSelection',
                nodeIds: ['agent-button']
            }
        ]);
        const pageNodes = result.document.pages![0].children;
        const button = pageNodes.find(node => node.id === 'agent-button');
        const duplicate = pageNodes.find(node => node.name === 'Agent button copy');

        expect(result.changed).to.equal(true);
        expect(result.selection).to.deep.equal(['agent-button']);
        expect(button?.x).to.equal(320);
        expect(button?.y).to.equal(372);
        expect(duplicate?.id).not.to.equal(undefined);
        expect(duplicate?.x).to.equal(344);
        expect(duplicate?.y).to.equal(396);
        expect(pageNodes.some(node => node.id === 'hero-copy')).to.equal(false);
    });

    it('groups and ungroups sibling nodes while preserving visual positions', () => {
        const document = service.createDesign('Group test');
        const grouped = service.applyToDocument(document, ['hero-card', 'hero-title'], {
            operation: 'groupNodes',
            nodeIds: ['hero-card', 'hero-title']
        });
        const group = grouped.document.pages![0].children.find(node => node.type === 'group');

        expect(group?.x).to.equal(120);
        expect(group?.y).to.equal(96);
        expect(group?.children).to.have.length(2);
        expect(grouped.selection).to.deep.equal([group!.id]);
        expect(group!.children!.find(node => node.id === 'hero-title')?.x).to.equal(40);

        const ungrouped = service.applyToDocument(grouped.document, grouped.selection, {
            operation: 'ungroupNode',
            nodeId: group!.id
        });
        const title = ungrouped.document.pages![0].children.find(node => node.id === 'hero-title');

        expect(ungrouped.selection).to.include('hero-title');
        expect(title?.x).to.equal(160);
        expect(title?.y).to.equal(144);
    });

    it('applies boolean operations to compatible sibling shapes with safe path fallback', () => {
        const document = service.createDesign('Boolean command test');
        const setup = service.applyOperationsToDocument(document, [], [
            {
                operation: 'addNode',
                node: {
                    id: 'bool-a',
                    type: 'rectangle',
                    x: 10,
                    y: 20,
                    width: 100,
                    height: 80,
                    fill: [{ type: 'solid', color: '#2563eb' }]
                }
            },
            {
                operation: 'addNode',
                node: {
                    id: 'bool-b',
                    type: 'rectangle',
                    x: 60,
                    y: 40,
                    width: 100,
                    height: 80,
                    fill: [{ type: 'solid', color: '#16a34a' }]
                }
            }
        ]);

        const union = service.applyToDocument(setup.document, ['bool-a', 'bool-b'], {
            operation: 'booleanNodes',
            nodeIds: ['bool-a', 'bool-b'],
            booleanOperation: 'union'
        });
        const result = union.document.pages![0].children.find(node => node.id === union.selection[0]);
        const svg = service.exportDocument(union.document, union.selection, 'svg', true);

        expect(union.changed).to.equal(true);
        expect(result?.type).to.equal('path');
        expect(result?.role).to.equal('boolean-union');
        expect(result?.x).to.equal(10);
        expect(result?.y).to.equal(20);
        expect(result?.width).to.equal(150);
        expect(result?.height).to.equal(100);
        expect(svg).to.contain('<path');
        expect(svg).to.contain('fill="#2563eb"');
    });

    it('converts shapes to editable paths and updates anchors', () => {
        const document = service.createDesign('Path command test');
        const setup = service.applyToDocument(document, [], {
            operation: 'addNode',
            node: {
                id: 'path-rect',
                type: 'rectangle',
                x: 24,
                y: 32,
                width: 80,
                height: 40
            }
        });

        const converted = service.applyToDocument(setup.document, ['path-rect'], {
            operation: 'convertToPath',
            nodeIds: ['path-rect']
        });
        const updated = service.applyToDocument(converted.document, converted.selection, {
            operation: 'updatePathAnchors',
            nodeId: 'path-rect',
            closed: false,
            anchors: [
                { x: 0, y: 0, handleIn: null, handleOut: { x: 20, y: 0 } },
                { x: 80, y: 40, handleIn: { x: -20, y: 0 }, handleOut: null }
            ]
        });
        const path = updated.document.pages![0].children.find(node => node.id === 'path-rect');

        expect(converted.selection).to.deep.equal(['path-rect']);
        expect(path?.type).to.equal('path');
        expect(path?.closed).to.equal(false);
        expect(path?.anchors).to.have.length(2);
        expect(path?.d).to.equal('M 0 0 C 20 0 60 40 80 40');
    });

    it('applies structured resize and granular path handle operations', () => {
        const document = service.createDesign('Canvas parity command test');
        const setup = service.applyOperationsToDocument(document, [], [
            {
                operation: 'addNode',
                node: {
                    id: 'resize-target',
                    type: 'rectangle',
                    x: 50,
                    y: 60,
                    width: 120,
                    height: 80
                }
            },
            {
                operation: 'addNode',
                node: {
                    id: 'curve-target',
                    type: 'path',
                    x: 0,
                    y: 0,
                    anchors: [
                        { x: 0, y: 0, handleIn: null, handleOut: { x: 20, y: 0 } },
                        { x: 80, y: 40, handleIn: { x: -20, y: 0 }, handleOut: null }
                    ],
                    closed: false
                }
            }
        ]);
        const result = service.applyOperationsToDocument(setup.document, [], [
            {
                operation: 'resizeNode',
                nodeId: 'resize-target',
                x: 32,
                y: 44,
                width: 180,
                height: 96
            },
            {
                operation: 'updatePathAnchor',
                nodeId: 'curve-target',
                anchorIndex: 1,
                anchor: { x: 100, y: 50, handleIn: { x: -24, y: -4 }, handleOut: null },
                closed: false
            },
            {
                operation: 'updatePathHandle',
                nodeId: 'curve-target',
                anchorIndex: 0,
                handle: 'out',
                value: { x: 36, y: -12 },
                mirror: true,
                closed: false
            },
            {
                operation: 'insertPathAnchor',
                nodeId: 'curve-target',
                anchorIndex: 1,
                anchor: { x: 48, y: 16, handleIn: null, handleOut: null }
            },
            {
                operation: 'removePathAnchor',
                nodeId: 'curve-target',
                anchorIndex: 1
            }
        ]);
        const resized = result.document.pages![0].children.find(node => node.id === 'resize-target');
        const curve = result.document.pages![0].children.find(node => node.id === 'curve-target');

        expect(resized?.x).to.equal(32);
        expect(resized?.y).to.equal(44);
        expect(resized?.width).to.equal(180);
        expect(resized?.height).to.equal(96);
        expect(curve?.anchors?.[0].handleOut).to.deep.equal({ x: 36, y: -12 });
        expect(curve?.anchors?.[0].handleIn).to.deep.equal({ x: -36, y: 12 });
        expect(curve?.anchors?.[1]).to.deep.include({ x: 100, y: 50 });
        expect(curve?.d).to.equal('M 0 0 C 36 -12 76 46 100 50');
        expect(result.selection).to.deep.equal(['curve-target']);
    });

    it('exports selected nested nodes', () => {
        const document = service.createDesign('Nested export test');
        const grouped = service.applyToDocument(document, [], {
            operation: 'groupNodes',
            nodeIds: ['hero-card', 'hero-title']
        });
        const exported = service.exportDocument(grouped.document, ['hero-title'], 'react-tailwind', true);

        expect(exported).to.contain('OpenPencil Design');
        expect(exported).not.to.contain('Hero card');
    });

    it('applies structured operation batches as one document transition', () => {
        const document = service.createDesign('Batch command test');
        const result = service.applyOperationsToDocument(document, [], [
            {
                operation: 'addNode',
                node: {
                    id: 'batch-cta',
                    type: 'rectangle',
                    name: 'Batch CTA',
                    x: 200,
                    y: 320,
                    width: 180,
                    height: 48,
                    fill: [{ type: 'solid', color: '#2563eb' }]
                }
            },
            {
                operation: 'updateNode',
                nodeId: 'batch-cta',
                changes: {
                    cornerRadius: 12,
                    stroke: { color: '#1d4ed8', width: 2 }
                }
            },
            {
                operation: 'setSelection',
                nodeIds: ['batch-cta']
            }
        ]);
        const node = result.document.pages![0].children.find(item => item.id === 'batch-cta');

        expect(result.changed).to.equal(true);
        expect(result.selection).to.deep.equal(['batch-cta']);
        expect(node?.cornerRadius).to.equal(12);
        expect(node?.stroke?.width).to.equal(2);
    });

    it('sets, updates, removes, and resolves variables through structured commands', () => {
        const document = service.createDesign('Variable command test');
        const result = service.applyOperationsToDocument(document, ['hero-title'], [
            {
                operation: 'setVariable',
                name: 'brand',
                variable: { type: 'color', value: '#2563eb' }
            },
            {
                operation: 'setVariable',
                name: 'space',
                variable: { type: 'number', value: 18 }
            },
            {
                operation: 'updateVariable',
                name: 'space',
                changes: { value: 24 }
            },
            {
                operation: 'updateNode',
                nodeId: 'hero-card',
                changes: {
                    layout: 'vertical',
                    gap: '$space',
                    padding: '$space',
                    fill: [{ type: 'solid', color: '$brand' }],
                    effects: [{ type: 'shadow', offsetX: 0, offsetY: '$space', blur: '$space', spread: 0, color: '$brand' }]
                }
            }
        ]);
        const html = service.exportDocument(result.document, [], 'html-css');

        expect(result.document.variables?.space.value).to.equal(24);
        expect(result.selection).to.deep.equal(['hero-card']);
        expect(html).to.contain('background-color:#2563eb');
        expect(html).to.contain('gap:24px');
        expect(html).to.contain('padding:24px');
        expect(html).to.contain('box-shadow:0px 24px 24px 0px #2563eb');

        const removed = service.applyToDocument(result.document, result.selection, {
            operation: 'removeVariable',
            name: 'space'
        });

        expect(removed.changed).to.equal(true);
        expect(removed.document.variables?.space).to.equal(undefined);
        expect(removed.selection).to.deep.equal(['hero-card']);
    });

    it('applies AI-friendly create, replace, delete, theme, and layout operations', () => {
        const document = service.createDesign('AI operations test');
        const result = service.applyOperationsToDocument(document, [], [
            {
                operation: 'createNode',
                parentId: null,
                node: {
                    id: 'ai-stack',
                    type: 'frame',
                    x: 32,
                    y: 40,
                    width: 320,
                    height: 180,
                    children: [
                        { id: 'ai-title', type: 'text', width: 220, height: 32, content: 'Draft' },
                        { id: 'ai-copy', type: 'text', width: 240, height: 32, content: 'Body' }
                    ]
                }
            },
            {
                operation: 'autoLayoutNode',
                nodeId: 'ai-stack',
                direction: 'vertical',
                gap: 12,
                padding: 16
            },
            {
                operation: 'replaceNode',
                nodeId: 'ai-copy',
                node: {
                    type: 'text',
                    content: 'Ready',
                    width: 240,
                    height: 32
                }
            },
            {
                operation: 'setThemes',
                themes: { Mode: ['Light', 'Dark'] }
            },
            {
                operation: 'setNodeTheme',
                nodeId: 'ai-stack',
                theme: { Mode: 'Dark' }
            },
            {
                operation: 'deleteNode',
                nodeId: 'hero-copy'
            }
        ]);
        const stack = result.document.pages![0].children.find(node => node.id === 'ai-stack');
        const copy = stack?.children?.find(node => node.id === 'ai-copy');

        expect(result.changed).to.equal(true);
        expect(stack?.layout).to.equal('vertical');
        expect(stack?.gap).to.equal(12);
        expect(stack?.padding).to.equal(16);
        expect(stack?.theme).to.deep.equal({ Mode: 'Dark' });
        expect(stack?.children?.map(node => node.y)).to.deep.equal([16, 52]);
        expect(copy?.content).to.equal('Ready');
        expect(result.document.themes).to.deep.equal({ Mode: ['Light', 'Dark'] });
        expect(result.document.pages![0].children.some(node => node.id === 'hero-copy')).to.equal(false);
    });

    it('preserves parent/index insertion and upstream layout normalization for structured operations', () => {
        const document = service.createDesign('Parent index layout test');
        const result = service.applyOperationsToDocument(document, [], [
            {
                operation: 'createNode',
                parentId: null,
                node: {
                    id: 'indexed-frame',
                    type: 'frame',
                    width: 260,
                    height: 160,
                    children: [
                        { id: 'first-child', type: 'rectangle', width: 40, height: 20 },
                        { id: 'last-child', type: 'rectangle', width: 40, height: 20 }
                    ]
                }
            },
            {
                operation: 'createNode',
                parentId: 'indexed-frame',
                index: 1,
                node: { id: 'middle-child', type: 'text', content: 'Middle', width: 80, height: 20 }
            },
            {
                operation: 'setNodeLayout',
                nodeId: 'indexed-frame',
                normalizeChildren: true,
                layout: {
                    layout: 'horizontal',
                    gap: 10,
                    padding: [8, 16, 8, 16],
                    alignItems: 'center'
                }
            }
        ]);
        const frame = result.document.pages![0].children.find(node => node.id === 'indexed-frame');

        expect(result.changed).to.equal(true);
        expect(frame?.children?.map(node => node.id)).to.deep.equal(['first-child', 'middle-child', 'last-child']);
        expect(frame?.children?.map(node => node.x)).to.deep.equal([16, 66, 156]);
        expect(frame?.children?.map(node => node.y)).to.deep.equal([70, 68, 70]);
    });

    it('exports normalized OpenPencil JSON and validates document structure', () => {
        const document = service.createDesign('JSON export test');
        const exported = service.exportDocument(document, ['hero-title'], 'openpencil-json', true);
        const summary = service.exportDocument(document, ['hero-title'], 'openpencil-summary-json', true);
        const parsed = new OpenPencilDocumentService().deserialize(exported);
        const validation = service.validateDocument(parsed);

        expect(parsed.pages![0].children.map(node => node.id)).to.deep.equal(['hero-title']);
        expect(summary).to.contain('"nodes"');
        expect(validation.valid).to.equal(true);
    });

    it('resolves themed variables in SVG exports', () => {
        const document = service.createDesign('Themed variable export test');
        document.themes = { Mode: ['Light', 'Dark'] };
        document.variables = {
            surface: {
                type: 'color',
                value: [
                    { value: '#f8fafc', theme: { Mode: 'Light' } },
                    { value: '#020617', theme: { Mode: 'Dark' } }
                ]
            },
            strokeSize: { type: 'number', value: 3 }
        };
        document.pages![0].children[0].fill = [{ type: 'solid', color: '$surface' }];
        document.pages![0].children[0].theme = { Mode: 'Dark' };
        document.pages![0].children[0].stroke = { color: '$surface', thickness: '$strokeSize' };

        const svg = service.exportDocument(document, [], 'svg');

        expect(svg).to.contain('fill="#020617"');
        expect(svg).to.contain('stroke="#020617"');
        expect(svg).to.contain('stroke-width="3"');
    });

    it('imports SVG markup into an adaptable OpenPencil document', () => {
        const imported = service.importDocument(`
            <svg width="640" height="360" viewBox="0 0 640 360">
                <rect width="640" height="360" fill="#f8fafc" />
                <rect x="40" y="32" width="180" height="96" rx="12" fill="#2563eb" fill-opacity="0.35" stroke="#1d4ed8" stroke-width="2" />
                <text x="56" y="88" font-size="24" font-weight="700" fill="#0f172a">Imported title</text>
                <image href="https://example.com/imported.png" x="260" y="40" width="120" height="80" />
                <ellipse cx="480" cy="90" rx="42" ry="24" fill="#dcfce7" />
            </svg>
        `, 'Imported SVG');
        const page = imported.pages![0];
        const exported = service.exportDocument(imported, [], 'html-css');

        expect(imported.name).to.equal('Imported SVG');
        expect(page.width).to.equal(640);
        expect(page.height).to.equal(360);
        expect(page.background).to.equal('#f8fafc');
        expect(page.children.map(node => node.type)).to.deep.equal(['rectangle', 'text', 'image', 'ellipse']);
        expect(page.children[0].fill?.[0].opacity).to.equal(0.35);
        expect(page.children[0].stroke?.width).to.equal(2);
        expect(page.children[1].content).to.equal('Imported title');
        expect(exported).to.contain('https://example.com/imported.png');
    });

    it('imports embedded OpenPencil JSON from markup', () => {
        const imported = service.importDocument(`
            <html>
                <body>
                    <script type="application/openpencil+json">
                        {&quot;version&quot;:&quot;0.7.6&quot;,&quot;name&quot;:&quot;Embedded&quot;,&quot;children&quot;:[{&quot;id&quot;:&quot;embedded-title&quot;,&quot;type&quot;:&quot;text&quot;,&quot;text&quot;:&quot;Embedded JSON&quot;}]}
                    </script>
                </body>
            </html>
        `);

        expect(imported.name).to.equal('Embedded');
        expect(imported.pages![0].children[0].id).to.equal('embedded-title');
        expect(imported.pages![0].children[0].content).to.equal('Embedded JSON');
    });

    it('imports HTML export-like markup into editable nodes', () => {
        const imported = service.importDocument(`
            <!DOCTYPE html>
            <main style="position:relative;width:720px;min-height:420px;background:#ffffff;">
                <div style="position:absolute;left:24px;top:32px;width:160px;height:80px;background-color:#e0f2fe;border-radius:10px;border:2px solid #0284c7;"></div>
                <p style="position:absolute;left:48px;top:60px;width:220px;height:36px;color:#0f172a;font-size:22px;font-weight:700;text-align:center;">HTML title</p>
                <img src="https://example.com/html.png" alt="HTML image" style="position:absolute;left:320px;top:44px;width:140px;height:100px;">
            </main>
        `, 'Imported HTML');
        const page = imported.pages![0];
        const html = service.exportDocument(imported, [], 'html-css');

        expect(page.width).to.equal(720);
        expect(page.height).to.equal(420);
        expect(page.children.map(node => node.type)).to.deep.equal(['rectangle', 'text', 'image']);
        expect(page.children[0].cornerRadius).to.equal(10);
        expect(page.children[0].stroke?.color).to.equal('#0284c7');
        expect(page.children[1].content).to.equal('HTML title');
        expect(page.children[1].textAlign).to.equal('center');
        expect(page.children[2].src).to.equal('https://example.com/html.png');
        expect(html).to.contain('HTML title');
    });

    it('parses and applies batch design DSL commands', () => {
        const document = service.createDesign('DSL batch test');
        const dsl = `
            frame=I(root,{id:'dsl-frame',type:'frame',name:'DSL Frame',x:10,y:10,width:300,height:200})
            label=I(frame,{id:'dsl-label',type:'text',content:'Draft',x:12,y:16,width:120,height:32})
            U(label,{content:'Ready',fontSize:20,id:'ignored'})
            copy=C(label,root,{id:'dsl-copy',content:'Copied',x:420,y:20})
            M(copy,frame,0)
            R(label,{type:'rectangle',name:'Replacement',x:30,y:40,width:80,height:40,fill:[{type:'solid',color:'#000000'}]})
            D(hero-copy)
        `;

        const commands = service.parseBatchDesignDsl(dsl);
        const result = service.applyBatchDesignDsl(document, [], dsl);
        const pageNodes = result.document.pages![0].children;
        const frame = pageNodes.find(node => node.id === 'dsl-frame');
        const replacement = frame?.children?.find(node => node.id === 'dsl-label');
        const copy = frame?.children?.find(node => node.id === 'dsl-copy');

        expect(commands).to.have.length(7);
        expect(commands[0].binding).to.equal('frame');
        expect(result.changed).to.equal(true);
        expect(result.selection).to.deep.equal(['dsl-label']);
        expect(frame?.children?.map(node => node.id)).to.deep.equal(['dsl-copy', 'dsl-label']);
        expect(copy?.content).to.equal('Copied');
        expect(replacement?.type).to.equal('rectangle');
        expect(replacement?.name).to.equal('Replacement');
        expect(replacement?.fill?.[0]?.color).to.equal('#000000');
        expect(pageNodes.some(node => node.id === 'hero-copy')).to.equal(false);
    });

    it('returns controlled errors for invalid batch design DSL references', () => {
        const document = service.createDesign('DSL error test');
        const result = service.applyBatchDesignDsl(document, ['hero-title'], `
            created=I(root,{id:'should-not-commit',type:'rectangle'})
            U(missing-node,{content:'Nope'})
        `);

        expect(result.changed).to.equal(false);
        expect(result.document).to.equal(document);
        expect(result.selection).to.deep.equal(['hero-title']);
        expect(result.message).to.contain("Line 3: Node 'missing-node' was not found.");
        expect(document.pages![0].children.some(node => node.id === 'should-not-commit')).to.equal(false);
    });

    it('reorders layers through structured commands', () => {
        const document = service.createDesign('Layer order test');
        const front = service.applyToDocument(document, [], {
            operation: 'bringToFront',
            nodeId: 'hero-card'
        });

        expect(front.changed).to.equal(true);
        expect(front.document.pages![0].children.map(node => node.id)).to.deep.equal([
            'hero-card',
            'hero-title',
            'hero-copy'
        ]);
        expect(front.selection).to.deep.equal(['hero-card']);

        const back = service.applyToDocument(front.document, front.selection, {
            operation: 'sendToBack',
            nodeId: 'hero-card'
        });

        expect(back.document.pages![0].children.map(node => node.id)).to.deep.equal([
            'hero-title',
            'hero-copy',
            'hero-card'
        ]);

        const reordered = service.applyToDocument(back.document, back.selection, {
            operation: 'reorderNode',
            nodeId: 'hero-card',
            index: 1
        });

        expect(reordered.document.pages![0].children.map(node => node.id)).to.deep.equal([
            'hero-title',
            'hero-card',
            'hero-copy'
        ]);
    });

    it('nudges selected nodes through structured commands', () => {
        const document = service.createDesign('Nudge command test');
        const result = service.applyToDocument(document, ['hero-title', 'hero-copy'], {
            operation: 'nudgeNodes',
            nodeIds: ['hero-title', 'hero-copy'],
            dx: 12,
            dy: -8
        });
        const title = result.document.pages![0].children.find(node => node.id === 'hero-title');
        const copy = result.document.pages![0].children.find(node => node.id === 'hero-copy');

        expect(result.changed).to.equal(true);
        expect(result.selection).to.deep.equal(['hero-title', 'hero-copy']);
        expect(title?.x).to.equal(172);
        expect(title?.y).to.equal(136);
        expect(copy?.x).to.equal(174);
        expect(copy?.y).to.equal(218);
    });

    it('aligns and distributes nodes through structured commands', () => {
        const document = service.createDesign('Align command test');
        const setup = service.applyToDocument(document, [], {
            operation: 'addPage',
            page: {
                id: 'layout-page',
                name: 'Layout',
                children: [
                    { id: 'box-a', type: 'rectangle', x: 10, y: 0, width: 50, height: 50 },
                    { id: 'box-b', type: 'rectangle', x: 80, y: 100, width: 50, height: 50 },
                    { id: 'box-c', type: 'rectangle', x: 160, y: 300, width: 50, height: 50 }
                ]
            },
            makeActive: true
        });
        const aligned = service.applyToDocument(setup.document, [], {
            operation: 'alignNodes',
            nodeIds: ['box-a', 'box-b', 'box-c'],
            alignment: 'left'
        });

        expect(aligned.changed).to.equal(true);
        expect(aligned.document.pages![1].children.map(node => node.x)).to.deep.equal([10, 10, 10]);
        expect(aligned.selection).to.deep.equal(['box-a', 'box-b', 'box-c']);

        const distributed = service.applyToDocument(aligned.document, aligned.selection, {
            operation: 'distributeNodes',
            nodeIds: ['box-a', 'box-b', 'box-c'],
            direction: 'vertical'
        });
        const nodes = distributed.document.pages![1].children;

        expect(distributed.changed).to.equal(true);
        expect(nodes.map(node => node.y)).to.deep.equal([0, 150, 300]);
    });

    it('adds, switches, renames, and removes pages through structured commands', () => {
        const document = service.createDesign('Pages command test');
        const firstPageId = document.activePageId!;
        const added = service.applyToDocument(document, ['hero-title'], {
            operation: 'addPage',
            page: {
                id: 'details-page',
                name: 'Details'
            },
            makeActive: true
        });

        expect(added.changed).to.equal(true);
        expect(added.document.pages).to.have.length(2);
        expect(added.document.activePageId).to.equal('details-page');
        expect(added.selection).to.deep.equal([]);

        const renamed = service.applyToDocument(added.document, [], {
            operation: 'updatePage',
            pageId: 'details-page',
            changes: { name: 'Details Updated', width: 1200, height: 800, background: '#f1f5f9', gridSize: 12, showGrid: false, snapToGrid: true }
        });
        const summary = service.getDocumentSummary(renamed.document);

        expect(summary.activePageId).to.equal('details-page');
        const detailsSummary = summary.pages.find(page => page.id === 'details-page');
        expect(detailsSummary?.name).to.equal('Details Updated');
        expect(detailsSummary?.width).to.equal(1200);
        expect(detailsSummary?.height).to.equal(800);
        expect(detailsSummary?.background).to.equal('#f1f5f9');
        expect(detailsSummary?.gridSize).to.equal(12);
        expect(detailsSummary?.showGrid).to.equal(false);
        expect(detailsSummary?.snapToGrid).to.equal(true);

        const switched = service.applyToDocument(renamed.document, ['details-node'], {
            operation: 'setActivePage',
            pageId: firstPageId
        });

        expect(switched.document.activePageId).to.equal(firstPageId);
        expect(switched.selection).to.deep.equal([]);

        const removed = service.applyToDocument(switched.document, [], {
            operation: 'removePage',
            pageId: 'details-page'
        });

        expect(removed.document.pages).to.have.length(1);
        expect(removed.document.pages![0].id).to.equal(firstPageId);
    });

    it('does not remove the final page', () => {
        const document = service.createDesign('Last page test');
        const result = service.applyToDocument(document, [], {
            operation: 'removePage',
            pageId: document.activePageId!
        });

        expect(result.changed).to.equal(false);
        expect(result.message).to.contain('last OpenPencil page');
        expect(result.document.pages).to.have.length(1);
    });
});

function createPaintOrderTextNode(id: string, content: string): OpenPencilNode {
    return {
        id,
        type: 'text',
        name: content,
        x: 24,
        y: 24,
        width: 180,
        height: 32,
        content,
        fontSize: 18,
        fill: [{ type: 'solid', color: '#111827' }]
    };
}
