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
    operations?: OpenPencilDesignOperation[];
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
        if (!this.aiRuntime) {
            return {
                diagnostics: ['CyberVinci AI Runtime is not available in this frontend container.']
            };
        }
        const result = await this.aiRuntime.runTask<OpenPencilAiRuntimeTaskInput, OpenPencilAiRuntimeResponse>({
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
                    'For website/homepage/e-commerce requests, keep one vertical page frame about 1200px wide, wrap product shelves into rows, and extend downward for the complete page.',
                    'Use section padding/gap/layout for spacing; do not create spacer-only nodes named Spacer, Espaço, Space, Gap, or before/after blocks.',
                    'Product shelves must fit inside the page width and wrap into rows instead of becoming one long horizontal strip.',
                    'For desktop marketplace shelves, use 3-4 product cards per row when cards contain large price/detail text, and keep every child element inside its card bounds.',
                    'Never include editor-shell placeholder copy in the design, including text such as "Edit this embedded .op design inside Theia."',
                    'Header/search/navigation rows must allocate explicit widths for logo, search, links, location, and account actions instead of giving multiple texts the full row width.',
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
        return this.toProviderResult(result);
    }

    async *streamOperations(request: OpenPencilAiDesignRequest, context: OpenPencilAiSkillContext): AsyncIterable<OpenPencilAiDesignStreamEvent> {
        if (!this.aiRuntimeFrontend) {
            yield { type: 'diagnostic', message: 'CyberVinci AI Runtime streaming service is not available in this frontend container.' };
            return;
        }
        const parser = new OpenPencilAiRuntimeOperationStreamParser();
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
                    'The nested operation object must be one OpenPencilDesignOperation.',
                    'Create parents before children, use stable IDs, and emit non-auto-layout sibling layers front-to-back: text, icons, controls, cards, then backgrounds.',
                    'For website/homepage/e-commerce requests, keep one vertical page frame about 1200px wide and add sections downward. Product shelves wrap into rows or new sections; never create an endless horizontal strip.',
                    'Use real section frames with padding/gap/layout for spacing; do not create spacer-only nodes named Spacer, Espaço, Space, Gap, or before/after blocks.',
                    'A marketplace product shelf should be a bounded section with wrapped rows of cards inside the page width, not a lateral canvas strip.',
                    'For desktop marketplace shelves, stream cards as a 3-4 column grid when card details are large. Text, icons, images, and decorative shapes must stay inside their parent card or section.',
                    'For full homepage copy requests, keep streaming section by section until the visible page includes navigation, hero/promos, categories, several product shelves, banners, recommendations, benefits, and closing/footer content.',
                    'For Mercado Livre-style marketplace pages, use a centered vertical feed: yellow header/search/navigation, large promo hero, category shortcuts, product shelves with 5-6 cards per row, promo banners between shelves, gray page background, and footer/help blocks.',
                    'Never stream editor-shell placeholder copy into the design, including text such as "Edit this embedded .op design inside Theia."',
                    'Header/search/navigation rows must allocate explicit widths for logo, search, links, location, and account actions instead of giving multiple texts the full row width.',
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
            'Think through the design privately, but expose progress by emitting one operation as soon as that canvas element is decided.',
            'Emit operations in the order the user should see the canvas grow: page/root frame, major sections, containers, text, controls, decorative elements, then refinements.',
            'For website/homepage/e-commerce requests, preserve a fixed page width around 1200px and extend downward. Additional products or shelves go into new rows/sections below, not beyond the right edge.',
            'For full homepage copies, stream a long vertical page with many sections rather than only the above-the-fold portion.',
            'For Mercado Livre-style marketplace pages, organize content as a centered vertical marketplace feed with a yellow header, promo hero, category shortcuts, repeated product shelves, banners, recommendations, and footer/help content.',
            'Never include CyberVinci/Theia editor placeholder text as content in the .op document.',
            'For non-auto-layout siblings, stream foreground layers before background layers so text and controls stay readable while the canvas updates.',
            'Preserve existing node IDs unless creating or explicitly replacing nodes.',
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
                selection: request.selection
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

    protected toProviderResult(result: CyberVinciAiTaskResult<OpenPencilAiRuntimeResponse>): OpenPencilAiDesignProviderResult {
        const structured = result.structured;
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
            operations: structured?.operations,
            diagnostics
        };
    }

    protected sessionId(request: OpenPencilAiDesignRequest, context: OpenPencilAiSkillContext): string {
        const uri = request.uri ?? context.documentContext.documentName;
        return `openpencil:${uri}:${request.mode ?? context.phase}`;
    }
}

interface OpenPencilAiRuntimeTaskInput {
    contract: 'openpencil.ai-runtime-task.v1';
    request: {
        mode: OpenPencilAiDesignRequest['mode'] | OpenPencilAiSkillContext['phase'];
        uri?: string;
        selection: string[];
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
            return [{
                type: 'complete',
                operations: value.filter(candidate => this.asRecord(candidate)) as OpenPencilDesignOperation[]
            }];
        }
        const object = this.asRecord(value);
        if (!object) {
            return [];
        }
        const events: OpenPencilAiDesignStreamEvent[] = [];
        const operation = this.asRecord(object.operation);
        if (object.type === 'operation' && operation) {
            events.push({ type: 'operation', operation: operation as unknown as OpenPencilDesignOperation });
            return events;
        }
        if (typeof object.operation === 'string') {
            events.push({ type: 'operation', operation: object as unknown as OpenPencilDesignOperation });
            return events;
        }
        const operations = Array.isArray(object.operations)
            ? object.operations.filter(candidate => this.asRecord(candidate)) as OpenPencilDesignOperation[]
            : undefined;
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
