import { inject, injectable, optional } from '@theia/core/shared/inversify';
import {
    parseCyberVinciAiJson,
    CyberVinciAiRuntimeService,
    CyberVinciAiTaskResult
} from '@cybervinci/ai-runtime/lib/common';
import { CyberVinciAiRuntimeFrontendService } from '@cybervinci/ai-runtime/lib/browser';
import {
    OpenPencilAiDesignProvider,
    OpenPencilAiDesignProviderResult,
    OpenPencilAiDesignRequest,
    OpenPencilAiDesignStreamEvent,
    OpenPencilAiSkillContext
} from './openpencil-design-command-service';
import { OpenPencilDesignOperation } from '../common/openpencil-types';

interface OpenPencilAiRuntimeResponse {
    contract?: string;
    operations?: unknown[];
    diagnostics?: string[];
    summary?: string;
}

@injectable()
export class OpenPencilAiRuntimeDesignProvider implements OpenPencilAiDesignProvider {

    readonly id = 'openpencil.cybervinci-ai-runtime';
    readonly label = 'CyberVinci AI Runtime';
    readonly priority = 300;

    @inject(CyberVinciAiRuntimeService) @optional()
    protected readonly aiRuntime: CyberVinciAiRuntimeService | undefined;

    @inject(CyberVinciAiRuntimeFrontendService) @optional()
    protected readonly aiRuntimeFrontend: CyberVinciAiRuntimeFrontendService | undefined;

    async generateOperations(request: OpenPencilAiDesignRequest, context: OpenPencilAiSkillContext): Promise<OpenPencilAiDesignProviderResult> {
        const runtime = this.aiRuntimeFrontend ?? this.aiRuntime;
        if (!runtime) {
            return {
                diagnostics: ['CyberVinci AI Runtime is not available in this frontend container.']
            };
        }
        const result = await runtime.runTask<OpenPencilAiRuntimeTaskInput, OpenPencilAiRuntimeResponse>({
            surfaceId: 'openpencil-design',
            action: 'canvas.generateOperations',
            workspacePath: request.workspacePath,
            sessionId: this.sessionId(request, context),
            userPrompt: request.prompt,
            systemPrompt: this.createSystemPrompt(request),
            input: this.createInput(request, context),
            context: {
                mode: request.workspacePath ? 'memory-if-available' : 'none',
                queries: [
                    request.prompt,
                    `OpenPencil Canvas ${request.mode ?? context.phase}`,
                    context.documentContext.documentName
                ],
                maxItems: 8,
                tokenBudget: 8000,
                taskId: 'openpencil-design'
            },
            output: {
                mode: 'json',
                schemaName: 'openpencil_design_operations',
                schema: OPENPENCIL_AI_RUNTIME_RESPONSE_SCHEMA,
                instructions: [
                    'Return only one JSON object.',
                    'The JSON object must use contract "openpencil.design-operations.v1".',
                    'The operations array must contain OpenPencilDesignOperation objects only.',
                    'If the full design cannot be completed immediately, return the largest valid visible operation set you can with updatePage/createNode/setSelection operations instead of prose, diagnostics-only output, or an empty operations array.',
                    'A minimal skeleton is only a no-empty-output emergency fallback. It is not a complete answer for page, clone, reference, or detailed design requests.',
                    'For generation, updateNode/replaceNode/move/resize/setSelection may only target existing Document context IDs or IDs created earlier in the same operations array. If an ID is new, create it first with createNode/addNode.',
                    'Do not guess existing IDs. Use stable new IDs freely, but every new ID must be introduced by a createNode/addNode before any operation references it.',
                    'First infer the requested artifact type. Website/app copy or reference requests are page or screen surfaces even when the user omits the word "page". Non-website Figma references, posters, banners, social creatives, app screens, diagrams, and isolated components are bounded artboards/compositions, not default homepages.',
                    'For website/homepage/e-commerce requests, keep one vertical page frame about 1200px wide when appropriate for the prompt, wrap repeated modules into rows, and extend downward for the complete page.',
                    'For page clone/reference requests, a header, nav, or hero-only result is incomplete; infer the requested artifact category and include the meaningful body sections/modules implied by that category before finishing.',
                    'Do not satisfy page completeness by only increasing the root/page frame height or background area. Add visible sections, cards, text, controls, and visuals inside the page frame.',
                    'Use section padding/gap/layout for spacing; do not create spacer-only nodes named Spacer, Espaço, Space, Gap, or before/after blocks.',
                    'Product shelves, grids, repeated cards, and carousel-like modules must fit inside their parent width and wrap into rows instead of becoming one long horizontal strip.',
                    'For desktop commerce/product shelves only when the prompt asks for that kind of surface, use 3-4 product cards per row when cards contain large price/detail text, and keep every child element inside its card bounds.',
                    'Never include editor-shell placeholder copy in the design, including text such as "Edit this embedded .op design inside Theia."',
                    'Header/search/navigation rows must allocate explicit widths for logo, search, links, location, and account actions instead of giving multiple texts the full row width.',
                    'For every row frame, each child must have a distinct non-overlapping x position; do not leave multiple row children at x:0.',
                    'For cards with a visual/icon/image and text copy, keep the visual and copy in separate vertical or horizontal regions; never place image placeholders over text.',
                    this.createImageInstructions(request),
                    'Do not include markdown, prose, DOM patches, HTML, CSS, shell commands, or filesystem edits.'
                ].join(' ')
            },
            effectPolicy: {
                previewOnly: true,
                workspaceWrites: 'forbidden',
                shellExecution: 'forbidden',
                requireUserConfirmation: false
            },
            execution: {
                approvalPolicy: 'never',
                sandboxMode: 'read-only',
                webSearch: 'disabled',
                ...request.execution
            }
        });
        return this.toProviderResult(result, context);
    }

    async *streamOperations(request: OpenPencilAiDesignRequest, context: OpenPencilAiSkillContext): AsyncIterable<OpenPencilAiDesignStreamEvent> {
        if (!this.aiRuntimeFrontend) {
            yield { type: 'diagnostic', message: 'CyberVinci AI Runtime streaming service is not available in this frontend container.' };
            return;
        }
        const parser = new OpenPencilAiRuntimeOperationStreamParser(context.documentContext.activePageId);
        for await (const event of this.aiRuntimeFrontend.runTaskStream<OpenPencilAiRuntimeTaskInput, OpenPencilAiRuntimeResponse>({
            surfaceId: 'openpencil-design',
            action: 'canvas.streamOperations',
            workspacePath: request.workspacePath,
            sessionId: this.sessionId(request, context),
            userPrompt: request.prompt,
            systemPrompt: this.createStreamingSystemPrompt(request),
            input: this.createInput(request, context),
            context: {
                mode: request.workspacePath ? 'memory-if-available' : 'none',
                queries: [
                    request.prompt,
                    `OpenPencil Canvas ${request.mode ?? context.phase}`,
                    context.documentContext.documentName
                ],
                maxItems: 8,
                tokenBudget: 8000,
                taskId: 'openpencil-design-stream'
            },
            output: {
                mode: 'text',
                schemaName: 'openpencil_design_operation_events',
                instructions: [
                    'Stream newline-delimited JSON objects only. Do not wrap output in Markdown fences.',
                    'Every visible canvas change must be emitted immediately as one complete line: {"type":"operation","operation":{...}}.',
                    'The first emitted line must be a usable operation that creates or updates the root artboard/frame; do not emit diagnostics, plans, analysis, or reasoning before the first operation.',
                    'The nested operation object must be one OpenPencilDesignOperation.',
                    'Strict creation order: always emit the createNode/addNode for a parent/container before any node placed inside it, and never reference a node id (as parentId, or as an update/move/resize/select/reorder target) before the createNode/addNode that introduces it. Use stable IDs. Do not emit a child before its container to control stacking — sibling z-order is normalized automatically by the canvas, so valid top-down creation order always takes priority over visual layer order.',
                    'A streamed updateNode/replaceNode/move/resize/setSelection may only target an existing Document context ID or an ID already emitted by an earlier streamed createNode/addNode. If the element is new, emit createNode/addNode for that ID first.',
                    'Do not guess existing IDs while streaming. New generated IDs are fine only after a createNode/addNode introduced them.',
                    'First infer the requested artifact type. Website/app copy or reference requests are page or screen surfaces even when the user omits the word "page". Non-website Figma references, posters, banners, social creatives, app screens, diagrams, and isolated components must stay inside a bounded artboard/composition.',
                    'For website/homepage/e-commerce requests, keep one vertical page frame about 1200px wide when appropriate for the prompt and add sections downward. Repeated modules wrap into rows or new sections; never create an endless horizontal strip.',
                    'Use real section frames with padding/gap/layout for spacing; do not create spacer-only nodes named Spacer, Espaço, Space, Gap, or before/after blocks.',
                    'When the prompt asks for marketplace/e-commerce, product shelves should be bounded sections with wrapped rows of cards inside the page width, not lateral canvas strips.',
                    'For desktop marketplace/e-commerce shelves, stream cards as a 3-4 column grid when card details are large. Text, icons, images, and decorative shapes must stay inside their parent card or section.',
                    'For full page/reference copy requests, keep streaming section by section until the visible artifact includes the major regions implied by its inferred category, such as navigation or entry point, primary content, repeated modules/cards where relevant, support/detail blocks, and closing/footer content when appropriate. Do not hard-code a site-specific template.',
                    'Do not emit {"type":"complete"} after only a header, navigation row, or sparse hero. Continue streaming the missing body sections first.',
                    'Do not satisfy page completeness by only resizing the root/page frame or background area. Each continuation pass must add or enrich visible sections, cards, text, controls, or visuals.',
                    'Never stream editor-shell placeholder copy into the design, including text such as "Edit this embedded .op design inside Theia."',
                    'Header/search/navigation rows must allocate explicit widths for logo, search, links, location, and account actions instead of giving multiple texts the full row width.',
                    'For every row frame, each child must have a distinct non-overlapping x position; do not leave multiple row children at x:0.',
                    'For cards with a visual/icon/image and text copy, keep the visual and copy in separate vertical or horizontal regions; never place image placeholders over text.',
                    this.createImageInstructions(request),
                    'Do not restate operations that were already emitted.',
                    'When finished, emit {"type":"complete"}.',
                    'Do not include prose, DOM patches, HTML, CSS, shell commands, or filesystem edits.'
                ].join(' ')
            },
            effectPolicy: {
                previewOnly: true,
                workspaceWrites: 'forbidden',
                shellExecution: 'forbidden',
                requireUserConfirmation: false
            },
            execution: {
                approvalPolicy: 'never',
                sandboxMode: 'read-only',
                webSearch: 'disabled',
                ...request.execution
            }
        })) {
            if (event.type === 'text-delta') {
                for (const parsed of parser.push(event.text)) {
                    yield parsed;
                }
                continue;
            }
            if (event.type === 'error') {
                yield { type: 'diagnostic', message: event.message };
                continue;
            }
            if (event.type === 'complete') {
                for (const parsed of parser.finish(event.text)) {
                    yield parsed;
                }
                if (event.diagnostics.length) {
                    yield { type: 'complete', diagnostics: event.diagnostics };
                }
            }
        }
    }

    protected createSystemPrompt(request: OpenPencilAiDesignRequest): string {
        return [
            'You are CyberVinci Canvas AI for OpenPencil.',
            'Generate or edit the .op document by returning structured OpenPencilDesignOperation JSON only.',
            'You are provider-neutral: follow this contract regardless of the selected provider, model, runtime, or reasoning effort.',
            'Preserve existing node IDs unless creating new nodes.',
            'For incremental stages, produce operations for the current stage only; do not wait to design the entire page if the stage asks for one section, skeleton, content pass, or refinement pass.',
            'Never update, move, resize, replace, or select a node ID that does not already exist in the document context or that you have not created earlier in the same response.',
            'For new design elements, introduce stable IDs with createNode/addNode before referencing them from later operations.',
            'Infer whether the user wants a web page, app screen, component, poster, banner, social creative, wireframe, diagram, or reference board before choosing canvas structure. If the user asks to copy/recreate a website or app surface, treat it as that page/screen surface even when the word "page" is omitted.',
            request.mode === 'continuation'
                ? 'Continuation mode: keep existing content, preserve geometry, and add or refine only what the user requested.'
                : undefined,
            request.selection.length
                ? 'Selected-node edit mode: preserve selected node IDs unless replacement is explicitly required.'
                : undefined
        ].filter(Boolean).join(' ');
    }

    protected createStreamingSystemPrompt(request: OpenPencilAiDesignRequest): string {
        return [
            'You are CyberVinci Canvas AI for OpenPencil.',
            'Generate or edit the .op document by streaming structured OpenPencilDesignOperation events.',
            'You are provider-neutral: follow this contract regardless of the selected provider, model, runtime, or reasoning effort.',
            'Choose the root artboard/frame privately and emit that operation first; do not spend the first response on analysis.',
            'Think through the design privately, but expose progress by emitting one operation as soon as that canvas element is decided.',
            'Emit operations strictly top-down so the canvas grows without dangling references: create each container/section before the nodes placed inside it, then refine. Never emit a child, or any reference to a node, before the createNode that introduces that node.',
            'Never stream an update, move, resize, replace, or selection for a new ID before streaming the createNode/addNode that introduces that ID.',
            'Create parents before children; if a parent does not exist yet, emit the parent create operation first.',
            'For website/app copy requests, infer the corresponding page/screen surface even when the user omits the word "page". For non-website artifacts such as Figma references, posters, banners, social creatives, app screens, diagrams, and isolated components, stream one bounded artboard/composition and fill it; do not extend downward like a homepage unless requested.',
            'For website/homepage/e-commerce requests, preserve a fixed page width around 1200px and extend downward. Additional products or shelves go into new rows/sections below, not beyond the right edge.',
            'For full homepage copies, stream a long vertical page with many sections rather than only the above-the-fold portion.',
            'For page clone/reference requests, infer the requested page category and never stop after only header/navigation/hero content; keep emitting the missing body sections/modules until the composition is visibly complete.',
            'Do not satisfy page completeness by only resizing the root/page frame or background area; add visible child sections/modules inside it.',
            'Never include CyberVinci/Theia editor placeholder text as content in the .op document.',
            'Do not reorder by emitting children before their container; final sibling z-order (text/icons in front, backgrounds behind) is normalized automatically by the canvas, so always emit the container first and the nodes inside it afterward.',
            'Preserve existing node IDs unless creating or explicitly replacing nodes.',
            this.createImageInstructions(request),
            request.mode === 'continuation'
                ? 'Continuation mode: keep existing content, preserve geometry, and append or refine only what the user requested.'
                : undefined,
            request.selection.length
                ? 'Selected-node edit mode: preserve selected node IDs unless replacement is explicitly required.'
                : undefined
        ].filter(Boolean).join(' ');
    }

    protected createInput(request: OpenPencilAiDesignRequest, context: OpenPencilAiSkillContext): OpenPencilAiRuntimeTaskInput {
        return {
            contract: 'openpencil.ai-runtime-task.v1',
            request: {
                mode: request.mode ?? context.phase,
                uri: request.uri,
                selection: request.selection,
                imagePolicy: request.imagePolicy
            },
            documentContext: context.documentContext,
            responseContract: context.responseContract,
            operationExamples: context.operationExamples,
            designGuidance: context.skills.map(skill => ({
                name: skill.name,
                phase: skill.phase,
                category: skill.category,
                sourcePath: skill.sourcePath,
                guidance: skill.guidance,
                tags: skill.tags,
                platform: skill.platform,
                content: skill.content
            }))
        };
    }

    protected createImageInstructions(request: OpenPencilAiDesignRequest): string {
        const maxAssets = request.imagePolicy?.maxAssets ?? 12;
        switch (request.imagePolicy?.mode ?? 'off') {
            case 'search':
                return `Image mode: search real images. Use image nodes for product, hero, banner, category, avatar, and recommendation visuals when useful. Prefer direct https src values only when the selected provider can confidently identify accessible real image URLs; otherwise include imageSearchQuery. Keep no more than ${maxAssets} image assets and keep every image inside its parent bounds.`;
            case 'generate':
                return `Image mode: generate images. Use image nodes with precise imagePrompt values for product, hero, banner, category, avatar, and recommendation visuals. Do not invent src values; set src only if the selected provider actually produced an accessible generated image URL. Keep no more than ${maxAssets} image assets and reserve exact bounds before adding text below them.`;
            case 'auto':
                return `Image mode: auto. Use imageSearchQuery for recognizable real products/categories and imagePrompt for synthetic or missing visuals. Include src only for accessible URLs the selected provider can actually supply. Keep no more than ${maxAssets} image assets and never place image placeholders over text.`;
            case 'off':
            default:
                return 'Image mode: off. Use image placeholders, icon_font nodes, or simple shapes only; do not invent src image URLs.';
        }
    }

    protected toProviderResult(result: CyberVinciAiTaskResult<OpenPencilAiRuntimeResponse>, context: OpenPencilAiSkillContext): OpenPencilAiDesignProviderResult {
        const structured = result.structured;
        const normalizer = new OpenPencilAiRuntimeOperationNormalizer();
        const operations = normalizer.normalizeOperations(structured?.operations, context.documentContext.activePageId)
            ?? normalizer.normalizeOperations(this.parseTextOperations(result.text), context.documentContext.activePageId);
        const diagnostics = [
            ...result.diagnostics,
            ...(structured?.diagnostics ?? [])
        ];
        if (structured?.summary) {
            diagnostics.push(`AI Runtime summary: ${structured.summary}`);
        }
        if (structured?.contract && structured.contract !== 'openpencil.design-operations.v1') {
            diagnostics.push(`AI Runtime returned unknown contract '${structured.contract}'; accepting operations after local validation.`);
        }
        return {
            operations,
            diagnostics
        };
    }

    protected parseTextOperations(text: string): unknown {
        if (!text.trim()) {
            return undefined;
        }
        try {
            return parseCyberVinciAiJson(text);
        } catch {
            return undefined;
        }
    }

    protected sessionId(request: OpenPencilAiDesignRequest, context: OpenPencilAiSkillContext): string {
        const uri = request.uri ?? context.documentContext.documentName;
        return `openpencil:${uri}:${request.mode ?? context.phase}`;
    }

    protected asRecord(value: unknown): Record<string, unknown> | undefined {
        return value && typeof value === 'object' && !Array.isArray(value)
            ? value as Record<string, unknown>
            : undefined;
    }
}

class OpenPencilAiRuntimeOperationNormalizer {

    protected readonly operationAliases: Record<string, OpenPencilDesignOperation['operation']> = {
        add: 'createNode',
        addnode: 'addNode',
        append: 'createNode',
        appendnode: 'createNode',
        autolayout: 'autoLayoutNode',
        autolayoutnode: 'autoLayoutNode',
        bringforward: 'bringForward',
        bringtofront: 'bringToFront',
        clearnodetheme: 'clearNodeTheme',
        convertpath: 'convertToPath',
        converttopath: 'convertToPath',
        create: 'createNode',
        createnode: 'createNode',
        delete: 'removeNode',
        deletenode: 'deleteNode',
        duplicate: 'duplicateNode',
        duplicatenode: 'duplicateNode',
        edit: 'updateNode',
        group: 'groupNodes',
        groupnodes: 'groupNodes',
        insert: 'createNode',
        insertnode: 'createNode',
        move: 'moveNode',
        movenode: 'moveNode',
        movetoparent: 'moveToParent',
        nudge: 'nudgeNodes',
        nudgenodes: 'nudgeNodes',
        remove: 'removeNode',
        removenode: 'removeNode',
        reorder: 'reorderNode',
        reordernode: 'reorderNode',
        replace: 'replaceNode',
        replacenode: 'replaceNode',
        resize: 'resizeNode',
        resizenode: 'resizeNode',
        select: 'setSelection',
        selection: 'setSelection',
        sendbackward: 'sendBackward',
        sendtoback: 'sendToBack',
        setactivelayer: 'setSelection',
        setactivepage: 'setActivePage',
        setnodelayout: 'setNodeLayout',
        setnodetheme: 'setNodeTheme',
        setselection: 'setSelection',
        setthemes: 'setThemes',
        setvariable: 'setVariable',
        update: 'updateNode',
        updatecanvas: 'updatePage',
        updatenode: 'updateNode',
        updatepage: 'updatePage',
        updatethemeaxis: 'updateThemeAxis',
        updatevariable: 'updateVariable'
    };

    protected readonly operationKeys = [
        'operation',
        'op',
        'action',
        'command',
        'type'
    ];

    protected readonly nestedOperationKeys = [
        'operation',
        'payload',
        'data',
        'event',
        'item',
        'step',
        'command'
    ];

    normalizeOperations(value: unknown, activePageId?: string): OpenPencilDesignOperation[] | undefined {
        const operations = this.collectOperations(value, activePageId);
        return operations.length ? operations : undefined;
    }

    protected collectOperations(value: unknown, activePageId: string | undefined, depth = 0): OpenPencilDesignOperation[] {
        if (depth > 5) {
            return [];
        }
        if (Array.isArray(value)) {
            return value.flatMap(item => this.collectOperations(item, activePageId, depth + 1));
        }
        const operation = this.toOperation(value, activePageId, depth);
        if (operation) {
            return [operation];
        }
        const record = this.asRecord(value);
        if (!record) {
            return [];
        }
        for (const key of ['operations', 'commands', 'events', 'items', 'steps']) {
            if (Array.isArray(record[key])) {
                const operations = this.collectOperations(record[key], activePageId, depth + 1);
                if (operations.length) {
                    return operations;
                }
            }
        }
        return [];
    }

    protected toOperation(value: unknown, activePageId: string | undefined, depth: number): OpenPencilDesignOperation | undefined {
        const record = this.asRecord(value);
        if (!record) {
            return undefined;
        }
        const eventOperation = this.asRecord(record.operation);
        if (record.type === 'operation' && eventOperation) {
            return this.toOperation(eventOperation, activePageId, depth + 1);
        }
        const operation = this.resolveOperationName(record);
        if (!operation) {
            const nested = this.extractNestedOperation(record, activePageId, depth);
            if (nested) {
                return nested;
            }
            return this.nodeFromRecord(record)
                ? this.createNodeOperation('createNode', record, activePageId)
                : undefined;
        }
        switch (operation) {
            case 'addNode':
            case 'createNode':
                return this.createNodeOperation(operation, record, activePageId);
            case 'updateNode':
                return this.updateNodeOperation(record);
            case 'replaceNode':
                return this.replaceNodeOperation(record);
            case 'updatePage':
                return this.updatePageOperation(record, activePageId);
            case 'setSelection':
                return this.setSelectionOperation(record);
            case 'removeNode':
            case 'deleteNode':
            case 'duplicateNode':
            case 'ungroupNode':
            case 'bringForward':
            case 'sendBackward':
            case 'bringToFront':
            case 'sendToBack':
                return this.singleNodeIdOperation(operation, record);
            case 'moveNode':
                return this.moveNodeOperation(record);
            case 'resizeNode':
                return this.resizeNodeOperation(record);
            case 'moveToParent':
                return this.moveToParentOperation(record);
            case 'reorderNode':
                return this.reorderNodeOperation(record);
            case 'setNodeLayout':
                return this.setNodeLayoutOperation(record);
            case 'autoLayoutNode':
                return this.autoLayoutNodeOperation(record);
            default:
                return record as unknown as OpenPencilDesignOperation;
        }
    }

    protected extractNestedOperation(record: Record<string, unknown>, activePageId: string | undefined, depth: number): OpenPencilDesignOperation | undefined {
        for (const key of this.nestedOperationKeys) {
            const nested = this.asRecord(record[key]);
            if (!nested) {
                continue;
            }
            const nestedOperation = this.toOperation(nested, activePageId, depth + 1);
            if (nestedOperation) {
                return nestedOperation;
            }
        }
        return undefined;
    }

    protected resolveOperationName(record: Record<string, unknown>): OpenPencilDesignOperation['operation'] | undefined {
        for (const key of this.operationKeys) {
            const value = record[key];
            if (typeof value !== 'string' || (key === 'type' && value === 'operation')) {
                continue;
            }
            const normalized = value.replace(/[^a-z0-9]/gi, '').toLowerCase();
            const operation = this.operationAliases[normalized];
            if (operation) {
                return operation;
            }
        }
        return undefined;
    }

    protected createNodeOperation(operation: 'addNode' | 'createNode', record: Record<string, unknown>, activePageId?: string): OpenPencilDesignOperation | undefined {
        const node = this.nodeFromRecord(record);
        if (!node) {
            return undefined;
        }
        const parentKeys = ['parentId', 'parent', 'containerId', 'frameId', 'pageId'];
        const explicitParent = this.stringField(record, parentKeys);
        // Preserve an explicit null parent (model marking a top-level/page-root node);
        // only default to the active page when no parent was provided at all.
        const explicitNullParent = explicitParent === undefined
            && parentKeys.some(key => key in record && record[key] === null);
        const parentId = explicitParent ?? (explicitNullParent ? null : (activePageId ?? null));
        const result: Record<string, unknown> = {
            operation,
            parentId,
            node
        };
        const index = this.numberField(record, ['index', 'zIndex', 'order']);
        if (index !== undefined) {
            result.index = index;
        }
        return result as unknown as OpenPencilDesignOperation;
    }

    protected updateNodeOperation(record: Record<string, unknown>): OpenPencilDesignOperation | undefined {
        const nodeId = this.nodeIdFromRecord(record);
        const changes = this.changesFromRecord(record);
        if (!nodeId || !changes) {
            return undefined;
        }
        return {
            operation: 'updateNode',
            nodeId,
            changes
        } as OpenPencilDesignOperation;
    }

    protected replaceNodeOperation(record: Record<string, unknown>): OpenPencilDesignOperation | undefined {
        const nodeId = this.nodeIdFromRecord(record);
        const node = this.nodeFromRecord(record);
        if (!nodeId || !node) {
            return undefined;
        }
        return {
            operation: 'replaceNode',
            nodeId,
            node
        } as OpenPencilDesignOperation;
    }

    protected updatePageOperation(record: Record<string, unknown>, activePageId?: string): OpenPencilDesignOperation | undefined {
        const pageId = this.stringField(record, ['pageId', 'id', 'targetId', 'target']) ?? activePageId;
        const changes = this.changesFromRecord(record);
        if (!pageId || !changes) {
            return undefined;
        }
        return {
            operation: 'updatePage',
            pageId,
            changes
        } as OpenPencilDesignOperation;
    }

    protected setSelectionOperation(record: Record<string, unknown>): OpenPencilDesignOperation | undefined {
        const nodeIds = this.stringArrayField(record, ['nodeIds', 'ids', 'selection', 'selectedNodeIds']);
        if (!nodeIds.length) {
            const nodeId = this.nodeIdFromRecord(record);
            if (!nodeId) {
                return undefined;
            }
            return { operation: 'setSelection', nodeIds: [nodeId] };
        }
        return { operation: 'setSelection', nodeIds };
    }

    protected singleNodeIdOperation(operation: OpenPencilDesignOperation['operation'], record: Record<string, unknown>): OpenPencilDesignOperation | undefined {
        const nodeId = this.nodeIdFromRecord(record);
        return nodeId ? { operation, nodeId } as OpenPencilDesignOperation : undefined;
    }

    protected moveNodeOperation(record: Record<string, unknown>): OpenPencilDesignOperation | undefined {
        const nodeId = this.nodeIdFromRecord(record);
        const x = this.numberField(record, ['x', 'left']);
        const y = this.numberField(record, ['y', 'top']);
        if (!nodeId || x === undefined || y === undefined) {
            return undefined;
        }
        return { operation: 'moveNode', nodeId, x, y };
    }

    protected resizeNodeOperation(record: Record<string, unknown>): OpenPencilDesignOperation | undefined {
        const nodeId = this.nodeIdFromRecord(record);
        const width = this.numberField(record, ['width', 'w']);
        const height = this.numberField(record, ['height', 'h']);
        if (!nodeId || width === undefined || height === undefined) {
            return undefined;
        }
        const result: Record<string, unknown> = { operation: 'resizeNode', nodeId, width, height };
        const x = this.numberField(record, ['x', 'left']);
        const y = this.numberField(record, ['y', 'top']);
        if (x !== undefined) {
            result.x = x;
        }
        if (y !== undefined) {
            result.y = y;
        }
        return result as unknown as OpenPencilDesignOperation;
    }

    protected moveToParentOperation(record: Record<string, unknown>): OpenPencilDesignOperation | undefined {
        const nodeId = this.nodeIdFromRecord(record);
        if (!nodeId) {
            return undefined;
        }
        const result: Record<string, unknown> = {
            operation: 'moveToParent',
            nodeId,
            parentId: this.stringField(record, ['parentId', 'parent', 'containerId']) ?? null
        };
        const index = this.numberField(record, ['index', 'zIndex', 'order']);
        if (index !== undefined) {
            result.index = index;
        }
        return result as unknown as OpenPencilDesignOperation;
    }

    protected reorderNodeOperation(record: Record<string, unknown>): OpenPencilDesignOperation | undefined {
        const nodeId = this.nodeIdFromRecord(record);
        const index = this.numberField(record, ['index', 'zIndex', 'order']);
        if (!nodeId || index === undefined) {
            return undefined;
        }
        return { operation: 'reorderNode', nodeId, index };
    }

    protected setNodeLayoutOperation(record: Record<string, unknown>): OpenPencilDesignOperation | undefined {
        const nodeId = this.nodeIdFromRecord(record);
        const layout = this.recordField(record, ['layout', 'changes', 'data', 'payload']);
        if (!nodeId || !layout) {
            return undefined;
        }
        return {
            operation: 'setNodeLayout',
            nodeId,
            layout
        } as OpenPencilDesignOperation;
    }

    protected autoLayoutNodeOperation(record: Record<string, unknown>): OpenPencilDesignOperation | undefined {
        const nodeId = this.nodeIdFromRecord(record);
        if (!nodeId) {
            return undefined;
        }
        const result: Record<string, unknown> = { operation: 'autoLayoutNode', nodeId };
        for (const key of ['direction', 'gap', 'padding', 'justifyContent', 'alignItems', 'normalizeChildren']) {
            if (record[key] !== undefined) {
                result[key] = record[key];
            }
        }
        return result as unknown as OpenPencilDesignOperation;
    }

    protected nodeFromRecord(record: Record<string, unknown>): Record<string, unknown> | undefined {
        for (const key of ['node', 'element', 'shape', 'layer']) {
            const node = this.asRecord(record[key]);
            if (node) {
                return node;
            }
        }
        for (const key of ['data', 'payload', 'item']) {
            const payload = this.asRecord(record[key]);
            if (!payload) {
                continue;
            }
            const nestedNode = this.nodeFromRecord(payload);
            if (nestedNode) {
                return nestedNode;
            }
            if (this.isNodeLikeRecord(payload)) {
                return payload;
            }
        }
        if (!this.isNodeLikeRecord(record)) {
            return undefined;
        }
        const node: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(record)) {
            if (key === 'type') {
                // `type` doubles as an operation-routing key, but on a flat node record
                // (e.g. weak models emitting {operation:'createNode', type:'frame', ...})
                // it is the node type and must be preserved. Only skip it when the value
                // is itself an operation alias such as {type:'createNode'}.
                if (this.isOperationAliasValue(value)) {
                    continue;
                }
                node[key] = value;
                continue;
            }
            if (!this.isOperationEnvelopeKey(key)) {
                node[key] = value;
            }
        }
        return Object.keys(node).length ? node : undefined;
    }

    protected changesFromRecord(record: Record<string, unknown>): Record<string, unknown> | undefined {
        for (const key of ['changes', 'patch', 'properties', 'props']) {
            const changes = this.asRecord(record[key]);
            if (changes) {
                return changes;
            }
        }
        for (const key of ['data', 'payload']) {
            const payload = this.asRecord(record[key]);
            if (!payload) {
                continue;
            }
            const nested = this.changesFromRecord(payload);
            if (nested) {
                return nested;
            }
            if (this.isNodeLikeRecord(payload)) {
                return this.stripOperationEnvelope(payload);
            }
        }
        const node = this.asRecord(record.node);
        if (node) {
            return this.stripOperationEnvelope(node);
        }
        const changes = this.stripOperationEnvelope(record);
        return Object.keys(changes).length ? changes : undefined;
    }

    protected stripOperationEnvelope(record: Record<string, unknown>): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(record)) {
            if (!this.isOperationEnvelopeKey(key) && key !== 'id' && key !== 'nodeId' && key !== 'targetId' && key !== 'target') {
                result[key] = value;
            }
        }
        return result;
    }

    protected isOperationEnvelopeKey(key: string): boolean {
        return this.operationKeys.includes(key)
            || key === 'parent'
            || key === 'parentId'
            || key === 'containerId'
            || key === 'frameId'
            || key === 'pageId'
            || key === 'index'
            || key === 'zIndex'
            || key === 'order';
    }

    protected isOperationAliasValue(value: unknown): boolean {
        if (typeof value !== 'string') {
            return false;
        }
        const normalized = value.replace(/[^a-z0-9]/gi, '').toLowerCase();
        return !!this.operationAliases[normalized];
    }

    protected isNodeLikeRecord(record: Record<string, unknown>): boolean {
        const type = record.type;
        if (typeof type === 'string' && type !== 'operation' && type !== 'complete' && type !== 'diagnostic' && type !== 'warning') {
            return true;
        }
        return typeof record.id === 'string'
            && (typeof record.name === 'string'
                || typeof record.content === 'string'
                || typeof record.width === 'number'
                || typeof record.height === 'number');
    }

    protected nodeIdFromRecord(record: Record<string, unknown>): string | undefined {
        return this.stringField(record, ['nodeId', 'targetId', 'target', 'id', 'ref', 'nodeRef']);
    }

    protected stringField(record: Record<string, unknown>, keys: string[]): string | undefined {
        for (const key of keys) {
            const value = record[key];
            if (typeof value === 'string' && value.trim()) {
                return value;
            }
        }
        return undefined;
    }

    protected stringArrayField(record: Record<string, unknown>, keys: string[]): string[] {
        for (const key of keys) {
            const value = record[key];
            if (Array.isArray(value)) {
                return value.filter((item): item is string => typeof item === 'string' && !!item.trim());
            }
        }
        return [];
    }

    protected recordField(record: Record<string, unknown>, keys: string[]): Record<string, unknown> | undefined {
        for (const key of keys) {
            const value = this.asRecord(record[key]);
            if (value) {
                return value;
            }
        }
        return undefined;
    }

    protected numberField(record: Record<string, unknown>, keys: string[]): number | undefined {
        for (const key of keys) {
            const value = record[key];
            if (typeof value === 'number' && Number.isFinite(value)) {
                return value;
            }
            if (typeof value === 'string' && value.trim()) {
                const parsed = Number(value);
                if (Number.isFinite(parsed)) {
                    return parsed;
                }
            }
        }
        return undefined;
    }

    protected asRecord(value: unknown): Record<string, unknown> | undefined {
        return value && typeof value === 'object' && !Array.isArray(value)
            ? value as Record<string, unknown>
            : undefined;
    }
}

interface OpenPencilAiRuntimeTaskInput {
    contract: 'openpencil.ai-runtime-task.v1';
    request: {
        mode: OpenPencilAiDesignRequest['mode'] | OpenPencilAiSkillContext['phase'];
        uri?: string;
        selection: string[];
        imagePolicy?: OpenPencilAiDesignRequest['imagePolicy'];
    };
    documentContext: OpenPencilAiSkillContext['documentContext'];
    responseContract: OpenPencilAiSkillContext['responseContract'];
    operationExamples: OpenPencilAiSkillContext['operationExamples'];
    designGuidance: Array<Pick<OpenPencilAiSkillContext['skills'][number], 'name' | 'phase' | 'category' | 'sourcePath' | 'guidance' | 'tags' | 'platform' | 'content'>>;
}

const OPENPENCIL_AI_RUNTIME_RESPONSE_SCHEMA: Record<string, unknown> = {
    type: 'object',
    additionalProperties: false,
    required: ['contract', 'operations'],
    properties: {
        contract: {
            type: 'string',
            enum: ['openpencil.design-operations.v1']
        },
        summary: {
            type: 'string'
        },
        diagnostics: {
            type: 'array',
            items: { type: 'string' }
        },
        operations: {
            type: 'array',
            minItems: 1,
            items: {
                type: 'object',
                additionalProperties: true,
                required: ['operation'],
                properties: {
                    operation: {
                        type: 'string',
                        enum: [
                            'addNode',
                            'createNode',
                            'updateNode',
                            'removeNode',
                            'deleteNode',
                            'replaceNode',
                            'moveNode',
                            'resizeNode',
                            'moveToParent',
                            'nudgeNodes',
                            'alignNodes',
                            'distributeNodes',
                            'duplicateNode',
                            'reorderNode',
                            'bringForward',
                            'sendBackward',
                            'bringToFront',
                            'sendToBack',
                            'groupNodes',
                            'ungroupNode',
                            'booleanNodes',
                            'convertToPath',
                            'updatePathAnchors',
                            'updatePathAnchor',
                            'updatePathHandle',
                            'insertPathAnchor',
                            'removePathAnchor',
                            'addPage',
                            'updatePage',
                            'removePage',
                            'setActivePage',
                            'setVariable',
                            'updateVariable',
                            'removeVariable',
                            'setThemes',
                            'updateThemeAxis',
                            'removeThemeAxis',
                            'setNodeTheme',
                            'clearNodeTheme',
                            'setNodeLayout',
                            'autoLayoutNode',
                            'setSelection'
                        ]
                    }
                }
            }
        }
    }
};

class OpenPencilAiRuntimeOperationStreamParser {

    protected buffer = '';
    protected receivedText = false;
    protected readonly normalizer = new OpenPencilAiRuntimeOperationNormalizer();

    constructor(protected readonly activePageId?: string) {}

    push(text: string): OpenPencilAiDesignStreamEvent[] {
        this.receivedText = this.receivedText || !!text;
        this.buffer += text;
        return this.drain();
    }

    finish(fallbackText?: string): OpenPencilAiDesignStreamEvent[] {
        if (!this.receivedText && fallbackText) {
            this.buffer += fallbackText;
        }
        const events = this.drain();
        const remaining = this.buffer.trim();
        if (!remaining) {
            return events;
        }
        for (const event of this.parseJsonValue(remaining)) {
            events.push(event);
        }
        this.buffer = '';
        return events;
    }

    protected drain(): OpenPencilAiDesignStreamEvent[] {
        const events: OpenPencilAiDesignStreamEvent[] = [];
        while (true) {
            const extracted = this.extractNextJsonObject(this.buffer);
            if (!extracted) {
                this.trimLeadingNonJson();
                break;
            }
            if (extracted.start > 0) {
                this.buffer = this.buffer.slice(extracted.start);
            }
            if (!extracted.complete) {
                break;
            }
            const candidate = this.buffer.slice(0, extracted.end + 1);
            this.buffer = this.buffer.slice(extracted.end + 1);
            for (const event of this.parseJsonValue(candidate)) {
                events.push(event);
            }
        }
        return events;
    }

    protected parseJsonValue(text: string): OpenPencilAiDesignStreamEvent[] {
        try {
            return this.toEvents(parseCyberVinciAiJson(text));
        } catch {
            return [];
        }
    }

    protected toEvents(value: unknown): OpenPencilAiDesignStreamEvent[] {
        if (Array.isArray(value)) {
            const operations = this.normalizer.normalizeOperations(value, this.activePageId);
            return [{
                type: 'complete',
                operations
            }];
        }
        const object = this.asRecord(value);
        if (!object) {
            return [];
        }
        const events: OpenPencilAiDesignStreamEvent[] = [];
        const normalizedOperation = this.normalizer.normalizeOperations(object, this.activePageId)?.[0];
        if (object.type !== 'complete' && normalizedOperation) {
            events.push({ type: 'operation', operation: normalizedOperation });
            return events;
        }
        const operation = this.asRecord(object.operation);
        const normalizedNestedOperation = operation ? this.normalizer.normalizeOperations(operation, this.activePageId)?.[0] : undefined;
        if (object.type === 'operation' && normalizedNestedOperation) {
            events.push({ type: 'operation', operation: normalizedNestedOperation });
            return events;
        }
        const operations = this.normalizer.normalizeOperations(object.operations, this.activePageId);
        if (object.type === 'complete' || operations?.length) {
            events.push({
                type: 'complete',
                operations,
                diagnostics: Array.isArray(object.diagnostics)
                    ? object.diagnostics.filter((diagnostic): diagnostic is string => typeof diagnostic === 'string')
                    : undefined
            });
            return events;
        }
        if ((object.type === 'diagnostic' || object.type === 'warning' || object.type === 'checkpoint') && typeof object.message === 'string') {
            events.push({ type: 'diagnostic', message: object.message });
        }
        return events;
    }

    protected extractNextJsonObject(text: string): { start: number; end: number; complete: boolean } | undefined {
        const start = text.indexOf('{');
        if (start < 0) {
            return undefined;
        }
        let depth = 0;
        let inString = false;
        let escaped = false;
        for (let index = start; index < text.length; index++) {
            const char = text[index];
            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (char === '\\') {
                    escaped = true;
                } else if (char === '"') {
                    inString = false;
                }
                continue;
            }
            if (char === '"') {
                inString = true;
            } else if (char === '{') {
                depth++;
            } else if (char === '}') {
                depth--;
                if (depth === 0) {
                    return { start, end: index, complete: true };
                }
            }
        }
        return { start, end: text.length - 1, complete: false };
    }

    protected trimLeadingNonJson(): void {
        const start = this.buffer.indexOf('{');
        if (start > 0) {
            this.buffer = this.buffer.slice(start);
        } else if (start < 0 && this.buffer.length > 4096) {
            this.buffer = '';
        }
    }

    protected asRecord(value: unknown): Record<string, unknown> | undefined {
        return value && typeof value === 'object' && !Array.isArray(value)
            ? value as Record<string, unknown>
            : undefined;
    }
}
