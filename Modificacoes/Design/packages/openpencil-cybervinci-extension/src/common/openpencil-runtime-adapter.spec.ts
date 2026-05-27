import { expect } from 'chai';
import {
    fromOpenPencilRuntimeSelectionChange,
    fromOpenPencilRuntimeDocument,
    fromOpenPencilRuntimeSelectionState,
    openPencilRuntimeTreeMutations,
    openPencilRuntimeVectorOperations,
    preserveOpenPencilRuntimeManualLayoutPositions,
    toOpenPencilRuntimeDocument,
    toOpenPencilRuntimeInteractionEvent,
    toOpenPencilRuntimeSelectionState
} from './openpencil-runtime-adapter';
import { OpenPencilDocument, OpenPencilNode } from './openpencil-types';

describe('OpenPencil runtime adapter', () => {

    const document: OpenPencilDocument = {
        version: '0.7.6',
        name: 'Adapter test',
        activePageId: 'page-a',
        themes: { Mode: ['Light', 'Dark'] },
        variables: {
            primary: {
                type: 'color',
                value: '#2563eb'
            }
        },
        children: [],
        pages: [{
            id: 'page-a',
            name: 'Page A',
            width: 1440,
            height: 900,
            background: '#f8fafc',
            gridSize: 8,
            showGrid: false,
            snapToGrid: true,
            children: [{
                id: 'frame-1',
                type: 'frame',
                name: 'Frame',
                reusable: true,
                slot: ['content'],
                layout: 'vertical',
                gap: 12,
                stroke: { color: '#111827', width: 2 },
                fill: [{ type: 'solid', color: '$primary' }],
                children: [{
                    id: 'text-1',
                    type: 'text',
                    text: 'Legacy text',
                    x: 16,
                    y: 20
                }, {
                    id: 'image-1',
                    type: 'image',
                    src: 'asset.png',
                    objectFit: 'contain',
                    exposure: 12,
                    contrast: -4,
                    imagePrompt: 'hero product photo'
                }, {
                    id: 'poly-1',
                    type: 'polygon',
                    points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
                    innerRadius: 0.35,
                    startAngle: 45,
                    sweepAngle: 270
                }]
            }]
        }, {
            id: 'page-b',
            name: 'Page B',
            children: [{
                id: 'path-1',
                type: 'path'
            }]
        }]
    };

    it('converts local documents to PenDocument-compatible runtime shape', () => {
        const runtime = toOpenPencilRuntimeDocument(document);
        const frame = runtime.pages![0].children[0];
        const text = frame.children![0];
        const image = frame.children![1];
        const polygon = frame.children![2];
        const path = runtime.pages![1].children[0];

        expect(runtime.activePageId).to.equal('page-a');
        expect(runtime.pages![0]).to.deep.equal({
            id: 'page-a',
            name: 'Page A',
            width: 1440,
            height: 900,
            background: '#f8fafc',
            gridSize: 8,
            showGrid: false,
            snapToGrid: true,
            children: runtime.pages![0].children
        });
        expect(runtime.themes).to.deep.equal(document.themes);
        expect(runtime.variables).to.deep.equal(document.variables);
        expect(frame.stroke).to.deep.equal({
            thickness: 2,
            fill: [{ type: 'solid', color: '#111827' }]
        });
        expect(frame.reusable).to.equal(true);
        expect(frame.slot).to.deep.equal(['content']);
        expect(text.content).to.equal('Legacy text');
        expect(image.objectFit).to.equal('fit');
        expect(image.exposure).to.equal(12);
        expect(image.contrast).to.equal(-4);
        expect(image.imagePrompt).to.equal('hero product photo');
        expect(polygon.polygonCount).to.equal(4);
        expect(polygon.innerRadius).to.equal(0.35);
        expect(polygon.startAngle).to.equal(45);
        expect(polygon.sweepAngle).to.equal(270);
        expect(path.d).to.equal('');
    });

    it('materializes implicit layout before handing documents to pen-react', () => {
        const local: OpenPencilDocument = {
            version: '0.7.6',
            activePageId: 'page-ai',
            children: [],
            pages: [{
                id: 'page-ai',
                name: 'AI Page',
                width: 900,
                height: 620,
                children: [{
                    id: 'ai-hero',
                    type: 'frame',
                    width: 520,
                    height: 360,
                    layout: 'vertical',
                    padding: { top: 24, right: 24, bottom: 24, left: 24 } as never,
                    gap: 16,
                    borderRadius: 24,
                    fill: [{ type: 'solid', color: '#f8fafc' }],
                    children: [{
                        id: 'ai-title',
                        type: 'text',
                        width: 320,
                        height: 48,
                        content: 'Generated title'
                    }, {
                        id: 'ai-row',
                        type: 'frame',
                        width: 420,
                        height: 96,
                        layout: 'horizontal',
                        gap: 12,
                        children: [{
                            id: 'ai-pill',
                            type: 'rectangle',
                            width: 80,
                            height: 40
                        }, {
                            id: 'ai-button',
                            type: 'frame',
                            width: 120,
                            height: 40,
                            fill: [{ type: 'solid', color: '#0071e3' }],
                            children: [{
                                id: 'ai-button-label',
                                type: 'text',
                                width: 80,
                                height: 20,
                                content: 'Continue'
                            }]
                        }]
                    }]
                }]
            }]
        };

        const runtime = toOpenPencilRuntimeDocument(local);
        const hero = runtime.pages![0].children[0];
        const title = hero.children![0];
        const row = hero.children![1];
        const pill = row.children![0];
        const button = row.children![1];
        const buttonLabel = button.children![0];

        expect(hero.x).to.equal(0);
        expect(hero.y).to.equal(0);
        expect(hero.cornerRadius).to.equal(24);
        expect(title.x).to.equal(24);
        expect(title.y).to.equal(24);
        expect(title.fill).to.deep.equal([{ type: 'solid', color: '#1d1d1f' }]);
        expect(row.x).to.equal(24);
        expect(row.y).to.equal(64);
        expect(pill.x).to.equal(0);
        expect(pill.y).to.equal(0);
        expect(button.x).to.equal(92);
        expect(buttonLabel.fill).to.deep.equal([{ type: 'solid', color: '#ffffff' }]);
    });

    it('keeps root page nodes outside the page bounds when converting to pen-react', () => {
        const local: OpenPencilDocument = {
            version: '0.7.6',
            activePageId: 'infinite-page',
            children: [],
            pages: [{
                id: 'infinite-page',
                name: 'Infinite canvas',
                width: 400,
                height: 300,
                children: [{
                    id: 'free-rect',
                    type: 'rectangle',
                    x: 520,
                    y: -64,
                    width: 120,
                    height: 90
                }]
            }]
        };

        const runtime = toOpenPencilRuntimeDocument(local);
        const rect = runtime.pages![0].children[0];

        expect(rect.x).to.equal(520);
        expect(rect.y).to.equal(-64);
        expect(rect.width).to.equal(120);
        expect(rect.height).to.equal(90);
    });

    it('preserves manual x/y edits on children of layout frames by making them overlays', () => {
        const local: OpenPencilDocument = {
            version: '0.7.6',
            activePageId: 'layout-page',
            children: [],
            pages: [{
                id: 'layout-page',
                name: 'Layout page',
                width: 900,
                height: 620,
                children: [{
                    id: 'layout-frame',
                    type: 'frame',
                    width: 360,
                    height: 220,
                    layout: 'vertical',
                    padding: [20, 20, 20, 20],
                    gap: 12,
                    children: [{
                        id: 'manual-title',
                        type: 'text',
                        width: 160,
                        height: 32,
                        content: 'Title'
                    }, {
                        id: 'body',
                        type: 'text',
                        width: 220,
                        height: 44,
                        content: 'Body'
                    }]
                }]
            }]
        };
        const previousRuntime = toOpenPencilRuntimeDocument(local);
        const nextRuntime = JSON.parse(JSON.stringify(previousRuntime));
        const movedTitle = nextRuntime.pages![0].children[0].children![0];
        movedTitle.x = 180;
        movedTitle.y = 84;

        const preservedRuntime = preserveOpenPencilRuntimeManualLayoutPositions(nextRuntime, previousRuntime);
        const preservedTitle = preservedRuntime.pages![0].children[0].children![0];
        const syncedLocal = fromOpenPencilRuntimeDocument(nextRuntime, 'layout-page', local);
        const roundTrippedRuntime = toOpenPencilRuntimeDocument(syncedLocal);
        const roundTrippedTitle = roundTrippedRuntime.pages![0].children[0].children![0];

        expect(preservedTitle.role).to.equal('overlay');
        expect(syncedLocal.pages![0].children[0].children![0].role).to.equal('overlay');
        expect(roundTrippedTitle.x).to.equal(180);
        expect(roundTrippedTitle.y).to.equal(84);
    });

    it('preserves richer pen-react node and fill fields used by renderer and properties', () => {
        const local: OpenPencilDocument = {
            version: '0.7.6',
            children: [{
                id: 'icon-path',
                type: 'path',
                name: 'Icon path',
                iconId: 'lucide:home',
                anchors: [{ x: 0, y: 0, handleIn: null, handleOut: null }],
                closed: true,
                d: 'M0 0h10v10z',
                fill: [{
                    type: 'image',
                    url: 'texture.png',
                    mode: 'crop',
                    originalSize: { width: 640, height: 480 },
                    exposure: 20,
                    shadows: -10
                }]
            }, {
                id: 'rich-text',
                type: 'text',
                content: [{
                    text: 'Styled',
                    fontWeight: 700,
                    fill: '#111827'
                }] as unknown as string
            }, {
                id: 'instance',
                type: 'ref',
                ref: 'icon-path',
                descendants: {
                    'icon-path': {
                        fill: [{ type: 'solid', color: '#ff0000' }]
                    }
                }
            }],
            pages: []
        };

        const runtime = toOpenPencilRuntimeDocument(local);
        const pathNode = runtime.children[0];
        const textNode = runtime.children[1];
        const refNode = runtime.children[2];
        const localAgain = fromOpenPencilRuntimeDocument(runtime);

        expect(pathNode.iconId).to.equal('lucide:home');
        expect(pathNode.anchors).to.deep.equal([{ x: 0, y: 0, handleIn: null, handleOut: null }]);
        expect(pathNode.closed).to.equal(true);
        expect(pathNode.fill![0]).to.deep.include({
            type: 'image',
            url: 'texture.png',
            mode: 'crop',
            exposure: 20,
            shadows: -10
        });
        expect(refNode.descendants).to.deep.equal({
            'icon-path': {
                fill: [{ type: 'solid', color: '#ff0000' }]
            }
        });
        expect(textNode.content).to.deep.equal([{
            text: 'Styled',
            fontWeight: 700,
            fill: '#111827'
        }]);
        expect(localAgain.children[0].iconId).to.equal('lucide:home');
        expect(localAgain.children[1].content).to.deep.equal(textNode.content);
        expect(localAgain.children[2].descendants).to.deep.equal(refNode.descendants);
    });

    it('adapts upstream path anchors and boolean vector operations', () => {
        const path = openPencilRuntimeVectorOperations.nodeToPath({
            id: 'rect',
            type: 'rectangle',
            x: 10,
            y: 12,
            width: 80,
            height: 40,
            fill: [{ type: 'solid', color: '#2563eb' }]
        });
        const excluded = openPencilRuntimeVectorOperations.booleanNodes([
            { id: 'a', type: 'rectangle', x: 0, y: 0, width: 100, height: 80, fill: [{ type: 'solid', color: '#111827' }] },
            { id: 'b', type: 'rectangle', x: 20, y: 20, width: 40, height: 30 }
        ], 'exclude', () => 'boolean-result');
        const anchors = openPencilRuntimeVectorOperations.pathDataToAnchors('M 0 0 C 20 0 60 40 80 40');

        expect(path?.type).to.equal('path');
        expect(path?.d).to.contain('M 0 0');
        expect(excluded?.id).to.equal('boolean-result');
        expect(excluded?.type).to.equal('path');
        expect(excluded?.fillRule).to.equal('evenodd');
        expect(anchors?.anchors).to.have.length(2);
        expect(openPencilRuntimeVectorOperations.anchorsToPathData(anchors!.anchors, false)).to.equal('M 0 0 C 20 0 60 40 80 40');
    });

    it('supports granular Bezier anchor and handle edits without changing the path schema', () => {
        const anchors = [
            { x: 0, y: 0, handleIn: null, handleOut: { x: 20, y: 0 } },
            { x: 80, y: 40, handleIn: { x: -20, y: 0 }, handleOut: null }
        ];
        const moved = openPencilRuntimeVectorOperations.updatePathAnchor(anchors, 1, {
            x: 96,
            y: 48,
            handleIn: { x: -24, y: -4 },
            handleOut: null
        });
        const handled = openPencilRuntimeVectorOperations.updatePathHandle(moved!, 0, 'out', { x: 32, y: -12 }, true);
        const inserted = openPencilRuntimeVectorOperations.insertPathAnchor(handled!, 1, {
            x: 42,
            y: 18,
            handleIn: null,
            handleOut: null
        });
        const removed = openPencilRuntimeVectorOperations.removePathAnchor(inserted!, 1);

        expect(moved?.[1].x).to.equal(96);
        expect(handled?.[0].handleOut).to.deep.equal({ x: 32, y: -12 });
        expect(handled?.[0].handleIn).to.deep.equal({ x: -32, y: 12 });
        expect(inserted).to.have.length(3);
        expect(removed).to.deep.equal(handled);
    });

    it('round-trips runtime documents back to local documents with an active page', () => {
        const runtime = toOpenPencilRuntimeDocument(document);
        const local = fromOpenPencilRuntimeDocument(runtime, 'page-b');

        expect(local.activePageId).to.equal('page-b');
        expect(local.children).to.deep.equal([]);
        expect(local.pages![0].width).to.equal(1440);
        expect(local.pages![0].background).to.equal('#f8fafc');
        expect(local.pages![0].children[0].stroke?.color).to.equal('#111827');
        expect(local.pages![0].children[0].stroke?.width).to.equal(2);
        expect(local.pages![0].children[0].children![1].objectFit).to.equal('fit');
    });

    it('matches upstream-supported active-page CRUD tree semantics', () => {
        const runtime = toOpenPencilRuntimeDocument(document);
        let children = JSON.parse(JSON.stringify(runtime.pages![0].children)) as OpenPencilNode[];
        const inserted = {
            id: 'inserted',
            type: 'rectangle' as const,
            name: 'Inserted',
            x: 4,
            y: 8,
            width: 40,
            height: 24
        };

        children = openPencilRuntimeTreeMutations.insertNode(children, 'frame-1', inserted, 1).children;
        children = openPencilRuntimeTreeMutations.updateNode(children, 'inserted', { x: 12, y: 16 }).children;
        children = openPencilRuntimeTreeMutations.moveNode(children, 'inserted', null, 0).children;
        children = openPencilRuntimeTreeMutations.removeNode(children, 'image-1').children;

        const frame = children.find(node => node.id === 'frame-1');
        const rootInserted = children[0];

        expect(rootInserted).to.include({ id: 'inserted', x: 12, y: 16 });
        expect(frame?.children?.map(node => node.id)).to.deep.equal(['text-1', 'poly-1']);
        expect(openPencilRuntimeTreeMutations.findNode(children, 'image-1')).to.equal(undefined);
    });

    it('keeps local replace semantics explicit for the adapter contract', () => {
        const runtime = toOpenPencilRuntimeDocument(document);
        const replacement = {
            id: 'text-1',
            type: 'text' as const,
            content: 'Replaced',
            width: 120,
            height: 32
        };

        const result = openPencilRuntimeTreeMutations.replaceNode(runtime.pages![0].children as unknown as OpenPencilNode[], 'text-1', replacement);
        const frame = result.children.find(node => node.id === 'frame-1');

        expect(result.changed).to.equal(true);
        expect(frame?.children?.map(node => node.id)).to.deep.equal(['text-1', 'image-1', 'poly-1']);
        expect(frame?.children?.[0]).to.deep.equal(replacement);
    });

    it('orders the active page first for the pen-react engine while retaining activePageId', () => {
        const runtime = toOpenPencilRuntimeDocument(document, 'page-b');

        expect(runtime.activePageId).to.equal('page-b');
        expect(runtime.pages?.map(page => page.id)).to.deep.equal(['page-b', 'page-a']);
        expect(runtime.children[0].id).to.equal('path-1');
    });

    it('restores previous local page order when applying pen-react document changes', () => {
        const runtime = toOpenPencilRuntimeDocument(document, 'page-b');
        runtime.pages![0].children[0].name = 'Edited path';

        const local = fromOpenPencilRuntimeDocument(runtime, 'page-b', document);

        expect(local.activePageId).to.equal('page-b');
        expect(local.pages?.map(page => page.id)).to.deep.equal(['page-a', 'page-b']);
        expect(local.pages![1].children[0].name).to.equal('Edited path');
    });

    it('uses the first runtime page when requested active page is missing', () => {
        const runtime = toOpenPencilRuntimeDocument(document);
        const local = fromOpenPencilRuntimeDocument(runtime, 'missing');

        expect(local.activePageId).to.equal('page-a');
    });

    it('converts local selected ids to Pen SelectionState-compatible shape', () => {
        const selection = toOpenPencilRuntimeSelectionState(['text-1', 'missing', 'text-1', 'image-1'], {
            activeId: 'image-1',
            hoveredId: 'frame-1',
            enteredFrameId: 'frame-1',
            enteredFrameStack: ['frame-1'],
            document
        });

        expect(selection).to.deep.equal({
            selectedIds: ['text-1', 'image-1'],
            activeId: 'image-1',
            hoveredId: 'frame-1',
            enteredFrameId: 'frame-1',
            enteredFrameStack: ['frame-1']
        });
    });

    it('converts runtime SelectionState back to local selected ids', () => {
        const runtime = toOpenPencilRuntimeDocument(document);
        const selectedIds = fromOpenPencilRuntimeSelectionState({
            selectedIds: ['image-1', 'missing', 'image-1', 'path-1'],
            activeId: 'image-1',
            hoveredId: null,
            enteredFrameId: null,
            enteredFrameStack: []
        }, runtime);

        expect(selectedIds).to.deep.equal(['image-1', 'path-1']);
    });

    it('normalizes runtime multi-node selection change payloads', () => {
        const runtime = toOpenPencilRuntimeDocument(document);

        expect(fromOpenPencilRuntimeSelectionChange(['text-1', 'missing', 'path-1', 'text-1'], runtime)).to.deep.equal(['text-1', 'path-1']);
        expect(fromOpenPencilRuntimeSelectionChange({ ids: ['image-1', 'path-1'] }, runtime)).to.deep.equal(['image-1', 'path-1']);
        expect(fromOpenPencilRuntimeSelectionChange({ selection: ['frame-1', 'missing'] }, runtime)).to.deep.equal(['frame-1']);
        expect(fromOpenPencilRuntimeSelectionChange({ selectedIds: ['text-1', 'missing'] }, runtime)).to.deep.equal(['text-1']);
    });

    it('normalizes runtime canvas interaction events', () => {
        expect(toOpenPencilRuntimeInteractionEvent('selection', ['text-1', 'image-1'])).to.deep.equal({
            type: 'selection',
            selectedIds: ['text-1', 'image-1']
        });
        expect(toOpenPencilRuntimeInteractionEvent('selection', { selectedIds: ['frame-1'] })).to.deep.equal({
            type: 'selection',
            selectedIds: ['frame-1']
        });
        expect(toOpenPencilRuntimeInteractionEvent('hover', 'frame-1')).to.deep.equal({
            type: 'hover',
            hoveredId: 'frame-1'
        });
        expect(toOpenPencilRuntimeInteractionEvent('viewport', { zoom: 1.5, panX: 10, panY: 20 })).to.deep.equal({
            type: 'viewport',
            viewport: { zoom: 1.5, panX: 10, panY: 20 }
        });
    });

    it('preserves visual styling and metadata needed by the pen-react runtime', () => {
        const styledDocument: OpenPencilDocument = {
            version: '0.7.6',
            name: 'Styled adapter test',
            activePageId: 'styled-page',
            children: [],
            pages: [{
                id: 'styled-page',
                name: 'Styled',
                children: [{
                    id: 'styled-card',
                    type: 'frame',
                    name: 'Styled card',
                    role: 'card',
                    explain: 'Runtime adapter parity node',
                    x: 32,
                    y: 48,
                    width: 320,
                    height: 180,
                    rotation: 4,
                    opacity: 0.72,
                    visible: false,
                    locked: true,
                    flipX: true,
                    theme: { Mode: 'Dark' },
                    layout: 'horizontal',
                    gap: 16,
                    padding: [12, 16, 12, 16],
                    justifyContent: 'space_between',
                    alignItems: 'center',
                    clipContent: true,
                    cornerRadius: [4, 8, 12, 16],
                    fill: [{
                        type: 'linear_gradient',
                        angle: 90,
                        opacity: 0.85,
                        stops: [
                            { offset: 0, color: '#111827' },
                            { offset: 100, color: '#2563eb' }
                        ]
                    }],
                    stroke: {
                        color: '#38bdf8',
                        thickness: [1, 2, 3, 4],
                        align: 'inside',
                        dashPattern: [4, 2]
                    },
                    effects: [
                        { type: 'shadow', offsetX: 0, offsetY: 12, blur: 24, spread: 0, color: '#000000' },
                        { type: 'blur', radius: 6 }
                    ],
                    children: [{
                        id: 'styled-label',
                        type: 'text',
                        content: 'Runtime text',
                        fontFamily: 'Inter',
                        fontSize: 18,
                        fontWeight: 700,
                        fontStyle: 'italic',
                        letterSpacing: 0.4,
                        lineHeight: 1.4,
                        textAlign: 'center',
                        underline: true,
                        strikethrough: true
                    }]
                }]
            }]
        };

        const runtime = toOpenPencilRuntimeDocument(styledDocument);
        const runtimeCard = runtime.pages![0].children[0];
        const runtimeLabel = runtimeCard.children![0];
        const local = fromOpenPencilRuntimeDocument(runtime, 'styled-page');
        const localCard = local.pages![0].children[0];

        expect(runtimeCard.role).to.equal('card');
        expect(runtimeCard.explain).to.equal('Runtime adapter parity node');
        expect(runtimeCard.rotation).to.equal(4);
        expect(runtimeCard.opacity).to.equal(0.72);
        expect(runtimeCard.visible).to.equal(false);
        expect(runtimeCard.locked).to.equal(true);
        expect(runtimeCard.flipX).to.equal(true);
        expect(runtimeCard.layout).to.equal('horizontal');
        expect(runtimeCard.padding).to.deep.equal([12, 16, 12, 16]);
        expect(runtimeCard.fill?.[0]).to.deep.include({ type: 'linear_gradient', angle: 90, opacity: 0.85 });
        expect(runtimeCard.fill?.[0]).to.have.property('stops').that.deep.equals([
            { offset: 0, color: '#111827' },
            { offset: 1, color: '#2563eb' }
        ]);
        expect(runtimeCard.stroke?.thickness).to.deep.equal([1, 2, 3, 4]);
        expect(runtimeCard.stroke?.fill?.[0]).to.deep.equal({ type: 'solid', color: '#38bdf8' });
        expect(runtimeCard.effects).to.deep.equal(styledDocument.pages![0].children[0].effects);
        expect(runtimeLabel.fontStyle).to.equal('italic');
        expect(runtimeLabel.underline).to.equal(true);
        expect(localCard.fill?.[0].type).to.equal('linear_gradient');
        expect(localCard.stroke?.width).to.equal(1);
        expect(localCard.effects).to.deep.equal(styledDocument.pages![0].children[0].effects);
        expect(localCard.children![0].content).to.equal('Runtime text');
    });
});
