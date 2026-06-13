import URI from '@theia/core/lib/common/uri';
import { Disposable } from '@theia/core/lib/common/disposable';
import { ContributionProvider } from '@theia/core/lib/common';
import { generateUuid } from '@theia/core/lib/common/uuid';
import { inject, injectable, named, optional, unmanaged } from '@theia/core/shared/inversify';
import { getTextOfResponse, LanguageModel, LanguageModelRegistry, LanguageModelService, UserRequest } from '@theia/ai-core';
import type { CyberVinciAiExecutionSelection } from '@cybervinci/ai-runtime/lib/common';
import {
    OpenPencilBooleanOperation,
    OpenPencilCommandResult,
    OpenPencilDesignOperation,
    OpenPencilDocument,
    OpenPencilDocumentSummary,
    OpenPencilExportFormat,
    OpenPencilNode,
    OpenPencilNodeChanges,
    OpenPencilNodeLayoutChanges,
    OpenPencilNodeType,
    OpenPencilPage,
    OpenPencilPathAnchor,
    OpenPencilPathHandle,
    OpenPencilPathHandleSide,
    OpenPencilValidationResult
} from '../common/openpencil-types';
import { OpenPencilDocumentService } from '../common/openpencil-document-service';
import { openPencilRuntimeTreeMutations, openPencilRuntimeVectorOperations } from '../common/openpencil-runtime-adapter';
import {
    OPENPENCIL_EMBEDDED_AI_SKILLS,
    OPENPENCIL_EMBEDDED_STYLE_GUIDES,
    type OpenPencilEmbeddedAiSkillDefinition,
    type OpenPencilEmbeddedStyleGuideDefinition,
    type OpenPencilEmbeddedStyleGuidePlatform
} from './openpencil-ai-skill-registry';

export const OpenPencilDesignCommandService = Symbol('OpenPencilDesignCommandService');
export const OpenPencilAiDesignProvider = Symbol('OpenPencilAiDesignProvider');

const CYBERVINCI_CANVAS_AI_DEBUG_STORAGE_KEY = 'cybervinci.canvasAiDebug';

declare global {
    interface Window {
        cyberVinciCanvasAiDebug?: boolean;
    }
}

function isCanvasAiFrontendDebugEnabled(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    try {
        return window.cyberVinciCanvasAiDebug === true || window.localStorage.getItem(CYBERVINCI_CANVAS_AI_DEBUG_STORAGE_KEY) === 'true';
    } catch {
        return window.cyberVinciCanvasAiDebug === true;
    }
}

function canvasAiFrontendDebug(marker: string, details: Record<string, unknown>): void {
    if (!isCanvasAiFrontendDebugEnabled()) {
        return;
    }
    console.info(`[CanvasAI][frontend] ${marker}`, details);
}

const OPENPENCIL_STRUCTURED_NODE_TYPE_ALIASES: Record<string, OpenPencilNodeType> = {
    artboard: 'frame',
    component: 'frame',
    container: 'frame',
    frame: 'frame',
    group: 'group',
    rect: 'rectangle',
    rectangle: 'rectangle',
    shape: 'rectangle',
    box: 'rectangle',
    ellipse: 'ellipse',
    oval: 'ellipse',
    circle: 'ellipse',
    line: 'line',
    polygon: 'polygon',
    poly: 'polygon',
    path: 'path',
    vector: 'path',
    text: 'text',
    textbox: 'text',
    text_box: 'text',
    label: 'text',
    image: 'image',
    img: 'image',
    bitmap: 'image',
    icon: 'icon_font',
    iconfont: 'icon_font',
    icon_font: 'icon_font',
    ref: 'ref',
    reference: 'ref',
    instance: 'ref',
    boolean_operation: 'group',
    canvas: 'frame',
    component_set: 'frame',
    document: 'frame',
    rounded_rectangle: 'rectangle',
    regular_polygon: 'polygon',
    star: 'polygon'
};

const OPENPENCIL_CSS_COLOR_KEYWORDS: Record<string, string> = {
    black: '#000000',
    white: '#ffffff',
    red: '#ef4444',
    green: '#22c55e',
    blue: '#3b82f6',
    yellow: '#eab308',
    orange: '#f97316',
    purple: '#8b5cf6',
    pink: '#ec4899',
    gray: '#6b7280',
    grey: '#6b7280',
    slate: '#64748b',
    neutral: '#737373',
    zinc: '#71717a',
    stone: '#78716c',
    indigo: '#6366f1',
    violet: '#8b5cf6',
    cyan: '#06b6d4',
    teal: '#14b8a6',
    emerald: '#10b981',
    lime: '#84cc16',
    amber: '#f59e0b',
    rose: '#f43f5e',
    brown: '#92400e',
    navy: '#1e3a8a',
    transparent: 'transparent'
};

export class OpenPencilBatchDesignDslError extends Error {
    constructor(message: string, readonly line?: number) {
        super(line ? `Line ${line}: ${message}` : message);
        this.name = 'OpenPencilBatchDesignDslError';
    }
}

export type OpenPencilBatchDesignDslCommand =
    | { command: 'I'; line: number; binding?: string; parentRef: string | null; node: Partial<OpenPencilNode> }
    | { command: 'U'; line: number; binding?: string; nodeRef: string; changes: OpenPencilNodeChanges }
    | { command: 'D'; line: number; binding?: string; nodeRef: string }
    | { command: 'C'; line: number; binding?: string; sourceRef: string; parentRef: string | null; overrides: Partial<OpenPencilNode> }
    | { command: 'M'; line: number; binding?: string; nodeRef: string; parentRef: string | null; index?: number }
    | { command: 'R'; line: number; binding?: string; nodeRef: string; newData: Partial<OpenPencilNode> };

export interface OpenPencilDesignSession {
    readonly uri: URI;
    getDocument(): OpenPencilDocument | undefined;
    getSelection(): string[];
    applyOperation(operation: OpenPencilDesignOperation): Promise<OpenPencilCommandResult>;
}

export interface OpenPencilAiDesignRequest {
    readonly prompt: string;
    readonly document: OpenPencilDocument;
    readonly selection: string[];
    readonly uri?: string;
    readonly mode?: 'generation' | 'maintenance' | 'continuation';
    readonly workspacePath?: string;
    readonly execution?: CyberVinciAiExecutionSelection;
}

export interface OpenPencilAiLayoutNodeSummary {
    readonly id: string;
    readonly type: OpenPencilNodeType;
    readonly name?: string;
    readonly role?: string;
    readonly contentExcerpt?: string;
    readonly x?: number;
    readonly y?: number;
    readonly width?: OpenPencilNode['width'];
    readonly height?: OpenPencilNode['height'];
    readonly childCount: number;
}

export interface OpenPencilAiActivePageLayoutSummary {
    readonly id: string;
    readonly name?: string;
    readonly bounds: {
        readonly x: 0;
        readonly y: 0;
        readonly width?: number;
        readonly height?: number;
    };
    readonly contentBottom: number;
    readonly topLevelNodeCount: number;
    readonly topLevelNodes: OpenPencilAiLayoutNodeSummary[];
}

export interface OpenPencilAiSkillDescriptor {
    readonly name: string;
    readonly phase: 'generation' | 'maintenance';
    readonly category: 'base' | 'domain' | 'knowledge';
    readonly sourcePath: string;
    readonly guidance: string;
    readonly content: string;
    readonly tags?: readonly string[];
    readonly platform?: OpenPencilEmbeddedStyleGuidePlatform;
}

export interface OpenPencilAiSkillContext {
    readonly adapter: 'pen-ai-skills-in-process';
    readonly phase: 'generation' | 'maintenance';
    readonly operationFormat: 'OpenPencilDesignOperation[]';
    readonly operationExamples: readonly OpenPencilDesignOperation[];
    readonly responseContract: {
        readonly format: 'json';
        readonly rootProperty: 'operations';
        readonly guidance: string;
    };
    readonly documentContext: {
        readonly documentName: string;
        readonly requestMode: 'generation' | 'maintenance' | 'continuation';
        readonly activePageId?: string;
        readonly activePageName?: string;
        readonly nodeCount: number;
        readonly selectedNodeIds: string[];
        readonly selectedNodes: Array<Pick<OpenPencilNode, 'id' | 'type' | 'name' | 'content'>>;
        readonly activePageLayout: OpenPencilAiActivePageLayoutSummary;
    };
    readonly skills: OpenPencilAiSkillDescriptor[];
}

export interface OpenPencilAiDesignResult {
    readonly operations: OpenPencilDesignOperation[];
    readonly context: OpenPencilAiSkillContext;
    readonly source: 'provider' | 'deterministic-fallback';
    readonly providerId?: string;
    readonly providerLabel?: string;
    readonly diagnostics?: string[];
}

export interface OpenPencilAiDesignProviderResult {
    readonly operations?: OpenPencilDesignOperation[];
    readonly diagnostics?: string[];
}

export type OpenPencilAiDesignProviderResponse = OpenPencilDesignOperation[] | OpenPencilAiDesignProviderResult | undefined;

export type OpenPencilAiDesignStreamEvent =
    | { readonly type: 'operation'; readonly operation: OpenPencilDesignOperation }
    | { readonly type: 'diagnostic'; readonly message: string }
    | { readonly type: 'complete'; readonly operations?: OpenPencilDesignOperation[]; readonly diagnostics?: string[] };

export interface OpenPencilAiDesignStreamApplyResult {
    readonly document: OpenPencilDocument;
    readonly selection: string[];
    readonly applied: number;
}

export type OpenPencilAiDesignStreamApply = (result: OpenPencilAiDesignResult) => Promise<OpenPencilAiDesignStreamApplyResult | undefined>;

export interface OpenPencilAiDesignProvider {
    readonly id?: string;
    readonly label?: string;
    readonly priority?: number;
    generateOperations(request: OpenPencilAiDesignRequest, context: OpenPencilAiSkillContext): Promise<OpenPencilAiDesignProviderResponse> | OpenPencilAiDesignProviderResponse;
    streamOperations?(request: OpenPencilAiDesignRequest, context: OpenPencilAiSkillContext): AsyncIterable<OpenPencilAiDesignStreamEvent>;
}

@injectable()
export class OpenPencilCyberVinciAiDesignProvider implements OpenPencilAiDesignProvider {

    readonly id = 'openpencil.cybervinci-language-model';
    readonly label = 'CyberVinci language model';
    readonly priority = 100;
    protected readonly modelResponseTimeoutMs = 90000;

    @inject(LanguageModelRegistry) @optional()
    protected readonly languageModelRegistry: LanguageModelRegistry | undefined;

    @inject(LanguageModelService) @optional()
    protected readonly languageModelService: LanguageModelService | undefined;

    async generateOperations(request: OpenPencilAiDesignRequest, context: OpenPencilAiSkillContext): Promise<OpenPencilAiDesignProviderResult> {
        const diagnostics: string[] = [];
        if (!this.languageModelRegistry || !this.languageModelService) {
            return {
                diagnostics: ['Theia AI language model services are not available in this frontend container.']
            };
        }
        const models = await this.selectCyberVinciModels(diagnostics);
        if (!models.length) {
            return { diagnostics };
        }
        for (const model of models) {
            if (model.status?.status === 'unavailable') {
                diagnostics.push(`Selected Theia AI model '${model.id}' is unavailable${model.status.message ? `: ${model.status.message}` : '.'}`);
                continue;
            }
            try {
                const userRequest = this.createUserRequest(request, context);
                const modelText = await this.withTimeout((async () => {
                    const response = await this.languageModelService!.sendRequest(model, userRequest);
                    return getTextOfResponse(response);
                })(), this.modelResponseTimeoutMs, `Model '${model.id}' did not finish within ${Math.round(this.modelResponseTimeoutMs / 1000)} seconds.`);
                const parsed = this.parseOperationsFromModelText(modelText);
                diagnostics.push(...(parsed.diagnostics ?? []).map(diagnostic => `Model '${model.id}': ${diagnostic}`));
                if (parsed.operations?.length) {
                    return {
                        operations: parsed.operations,
                        diagnostics
                    };
                }
            } catch (error) {
                diagnostics.push(`Model '${model.id}' failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        return { diagnostics };
    }

    protected withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const timeout = window.setTimeout(() => reject(new Error(message)), timeoutMs);
            promise.then(
                value => {
                    window.clearTimeout(timeout);
                    resolve(value);
                },
                error => {
                    window.clearTimeout(timeout);
                    reject(error);
                }
            );
        });
    }

    protected createUserRequest(request: OpenPencilAiDesignRequest, context: OpenPencilAiSkillContext): UserRequest {
        const requestId = generateUuid();
        return {
            messages: [
                {
                    actor: 'system',
                    type: 'text',
                    text: this.createSystemPrompt()
                },
                {
                    actor: 'user',
                    type: 'text',
                    text: this.createPrompt(request, context)
                }
            ],
            response_format: {
                type: 'json_schema',
                json_schema: {
                    name: 'openpencil_ai_operations',
                    description: 'Structured OpenPencil design edit operations',
                    strict: false,
                    schema: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            contract: {
                                type: 'string',
                                enum: ['openpencil.design-operations.v1']
                            },
                            operations: {
                                type: 'array',
                                minItems: 1,
                                items: {
                                    type: 'object',
                                    additionalProperties: true,
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
                                    },
                                    required: ['operation']
                                }
                            }
                        },
                        required: ['operations']
                    }
                }
            },
            sessionId: `openpencil-ai-${requestId}`,
            requestId,
            agentId: 'OpenPencil',
            reasoning: { level: 'low' },
            settings: { temperature: 0 }
        };
    }

    protected async selectCyberVinciModels(diagnostics: string[]): Promise<LanguageModel[]> {
        const models: LanguageModel[] = [];
        const addModel = (model: LanguageModel | undefined, reason: string) => {
            if (!model || models.some(candidate => candidate.id === model.id)) {
                return;
            }
            diagnostics.push(`${reason} '${model.id}'.`);
            models.push(model);
        };
        const designModel = await this.languageModelRegistry?.selectLanguageModel({ agent: 'OpenPencil', purpose: 'openpencil-design' });
        if (designModel) {
            addModel(designModel, 'Selected Theia AI model for purpose openpencil-design');
        } else {
            diagnostics.push("No Theia AI model selected for purpose 'openpencil-design'; trying purpose 'chat'.");
        }
        const chatModel = await this.languageModelRegistry?.selectLanguageModel({ agent: 'OpenPencil', purpose: 'chat' });
        if (chatModel) {
            addModel(chatModel, 'Selected Theia AI model for purpose chat');
        } else {
            diagnostics.push("No Theia AI model selected for purpose 'chat'.");
        }
        const registeredModels = await this.languageModelRegistry?.getLanguageModels?.() ?? [];
        const codexProviderFallback = registeredModels.find(model => model.status.status === 'ready' && (model.id === 'codex-provider' || model.family === 'codex-provider'));
        if (!models.length && codexProviderFallback) {
            addModel(codexProviderFallback, 'Added ready CyberVinci AI provider fallback for OpenPencil after no configured purpose-specific model was selected');
        }
        let alternateModelCount = 0;
        for (const model of registeredModels
            .filter(model => model.status.status === 'ready' && model.family !== 'codex-provider')
            .slice(0, 3)) {
            addModel(model, 'Added ready alternate Theia AI model');
            alternateModelCount++;
        }
        if (!alternateModelCount && models.some(model => model.family === 'codex-provider')) {
            diagnostics.push('No ready alternate Theia AI model is registered for OpenPencil to try after the CyberVinci AI provider fallback.');
        }
        if (!models.length) {
            diagnostics.push("No configured Theia AI language model is available for OpenPencil or chat.");
        }
        return models;
    }

    protected createSystemPrompt(): string {
        return [
            'You are an OpenPencil JSON operation generator, not a coding assistant.',
            'Do not inspect files, use tools, ask follow-up questions, edit the filesystem, or return explanations.',
            'Your complete final answer must be exactly one JSON object with shape {"contract":"openpencil.design-operations.v1","operations":[...]}.',
            'The operations array must be non-empty and contain only OpenPencilDesignOperation objects.'
        ].join(' ');
    }

    protected createPrompt(request: OpenPencilAiDesignRequest, context: OpenPencilAiSkillContext): string {
        return [
            'Create or edit an OpenPencil .op design inside CyberVinci/Theia.',
            'Return only one JSON object shaped as {"contract":"openpencil.design-operations.v1","operations":[...]} using OpenPencilDesignOperation objects.',
            'Do not return DOM selectors, HTML patches, JavaScript snippets, CLI commands, MCP calls, or prose.',
            'Preserve existing node IDs unless the requested edit creates new nodes.',
            'Use lowercase OpenPencil node types: frame, group, rectangle, ellipse, line, polygon, path, text, image, icon_font, ref.',
            'Use renderable colors as hex, rgb/rgba, hsl/hsla, transparent, or common color keywords. Prefer hex colors.',
            'For page-level generation, create visible nodes. Do not return only updatePage/background changes.',
            'For selected-node maintenance, prefer updateNode/replaceNode plus setSelection for the selected IDs.',
            'For prompt-to-design generation, prefer createNode/addNode plus setSelection for the created root node.',
            ...(request.mode === 'continuation' ? [
                'Continuation mode: preserve the current design, all existing nodes, and all existing node IDs.',
                'Continuation mode: do not remove, replace, or recreate existing page content; only add missing sections, missing states, or supporting elements.',
                'Continuation mode: place new top-level content below the current content bottom or inside visible empty space described by the active-page layout summary; avoid covering existing nodes.',
                'Continuation mode: finish with setSelection for the newly-created root node IDs so the user can inspect the continuation.'
            ] : []),
            'When a request asks for multiple independent views, such as desktop and mobile, create separate top-level frames and place them side by side inside the page with a clear gap; scale them uniformly if needed, never overlap or clip them.',
            'For editable page designs, top-level view frames should usually use layout:"none" or omit layout and rely on numeric x/y/width/height. Use layout:"vertical" or layout:"horizontal" only for internal stacks where children should remain auto-positioned.',
            'Use role:"overlay" for a child that must be manually positioned inside a layout frame. Otherwise x/y on children of layout frames will be treated as auto-layout input and may be recalculated.',
            'Do not set clipContent:true on top-level views or general containers unless the user explicitly asks for masking/cropping. The canvas is unbounded; do not create invisible frames as canvas limits.',
            'Use OpenPencil property names exactly: text nodes use content, shapes use fill:[{type:"solid",color:"#..."}], stroke uses {color,width,thickness}, rounded corners use cornerRadius, and sizes/positions use numeric x,y,width,height.',
            'Do not emit CSS property names such as backgroundColor, borderRadius, position, display, left, top, color, or font-weight; map them to OpenPencil node properties instead.',
            'Readability and contrast are mandatory: text must contrast with the nearest background; never place dark text on dark backgrounds or light text on light backgrounds. If a background is dark, use light text; if a background is light, use dark text.',
            'If the prompt asks for a known product/site style, capture its visible structure and interaction patterns without copying trademarks or exact assets.',
            `User request: ${request.prompt}`,
            `Target URI: ${request.uri ?? 'active OpenPencil editor'}`,
            `Phase: ${context.phase}`,
            `Document context: ${JSON.stringify(context.documentContext)}`,
            `Relevant design guidance: ${this.formatCompactAiSkillPrompt(context.skills)}`,
            `Valid operation examples: ${JSON.stringify(context.operationExamples)}`
        ].join('\n');
    }

    protected formatCompactAiSkillPrompt(skills: OpenPencilAiSkillDescriptor[]): string {
        if (!skills.length) {
            return 'No additional OpenPencil AI skills resolved.';
        }
        return skills.map(skill => `${skill.name}: ${skill.guidance}`).join(' | ');
    }

    protected formatAiSkillPrompt(skills: OpenPencilAiSkillDescriptor[]): string {
        if (!skills.length) {
            return 'No additional OpenPencil AI skills resolved.';
        }
        return skills.map(skill => {
            const lines = [
                `### ${skill.name}`,
                `Source: ${skill.sourcePath}`,
                `Category: ${skill.category}`,
                `Guidance: ${skill.guidance}`
            ];
            if (skill.tags?.length) {
                lines.push(`Tags: ${skill.tags.join(', ')}`);
            }
            if (skill.platform) {
                lines.push(`Platform: ${skill.platform}`);
            }
            lines.push('Content:', skill.content.trim());
            return lines.join('\n');
        }).join('\n\n');
    }

    protected parseOperationsFromModelText(text: string): OpenPencilAiDesignProviderResult {
        const diagnostics: string[] = [];
        const trimmed = text.trim();
        const candidates = this.extractJsonCandidates(trimmed);
        if (!candidates.length) {
            return {
                diagnostics: [`Theia AI model response did not contain a JSON object or array. Response excerpt: ${this.formatModelResponseExcerpt(trimmed)}`]
            };
        }
        const candidateDiagnostics: string[] = [];
        for (const candidate of candidates) {
            const parsed = this.parseOperationsJsonCandidate(candidate);
            if (parsed.operations?.length) {
                return {
                    operations: parsed.operations,
                    diagnostics: [...diagnostics, ...(parsed.diagnostics ?? [])]
                };
            }
            candidateDiagnostics.push(...(parsed.diagnostics ?? []));
        }
        return {
            diagnostics: [
                candidateDiagnostics[0] ?? 'Theia AI model JSON did not include a non-empty operations array.',
                `Response excerpt: ${this.formatModelResponseExcerpt(trimmed)}`
            ]
        };
    }

    protected parseOperationsJsonCandidate(candidate: string): OpenPencilAiDesignProviderResult {
        const diagnostics: string[] = [];
        try {
            const parsed = JSON.parse(candidate) as unknown;
            const modelError = this.extractModelError(parsed);
            if (modelError) {
                return {
                    diagnostics: [`Theia AI model returned an error before producing operations: ${modelError}`]
                };
            }
            const operations = this.extractOperationsFromParsedJson(parsed);
            if (!operations?.length) {
                return {
                    diagnostics: ['Theia AI model JSON did not include a non-empty operations array.']
                };
            }
            if (!operations.every(operation => this.isRecord(operation) && typeof operation.operation === 'string')) {
                return {
                    diagnostics: ['Theia AI model JSON operations must be objects with an operation string.']
                };
            }
            if (this.isRecord(parsed) && typeof parsed.contract === 'string' && parsed.contract !== 'openpencil.design-operations.v1') {
                diagnostics.push(`Theia AI model returned unknown contract '${parsed.contract}'; accepting operations after local validation.`);
            }
            return {
                operations: operations as OpenPencilDesignOperation[],
                diagnostics
            };
        } catch (error) {
            return {
                diagnostics: [`Theia AI model JSON could not be parsed: ${error instanceof Error ? error.message : String(error)}`]
            };
        }
    }

    protected extractModelError(parsed: unknown): string | undefined {
        if (!this.isRecord(parsed)) {
            return undefined;
        }
        const error = parsed.error;
        if (typeof error === 'string') {
            return error;
        }
        if (this.isRecord(error)) {
            const message = typeof error.message === 'string' ? error.message : undefined;
            const code = typeof error.codexErrorInfo === 'string'
                ? error.codexErrorInfo
                : typeof error.code === 'string'
                    ? error.code
                    : undefined;
            if (message && code) {
                return `${message} (${code})`;
            }
            return message ?? code;
        }
        return undefined;
    }

    protected extractOperationsFromParsedJson(parsed: unknown, depth = 0): unknown[] | undefined {
        if (depth > 3) {
            return undefined;
        }
        if (Array.isArray(parsed)) {
            return parsed;
        }
        if (!this.isRecord(parsed)) {
            return undefined;
        }
        if (Array.isArray(parsed.operations)) {
            return parsed.operations;
        }
        if (typeof parsed.operation === 'string') {
            return [parsed];
        }
        for (const key of ['result', 'response', 'data', 'payload', 'json', 'content', 'message']) {
            const value = parsed[key];
            const nested = typeof value === 'string'
                ? this.extractJsonCandidates(value)
                    .map(candidate => this.parseOperationsJsonCandidate(candidate).operations)
                    .find(operations => operations?.length)
                : this.extractOperationsFromParsedJson(value, depth + 1);
            if (nested?.length) {
                return nested;
            }
        }
        return undefined;
    }

    protected extractJsonCandidate(text: string): string | undefined {
        return this.extractJsonCandidates(text)[0];
    }

    protected extractJsonCandidates(text: string): string[] {
        const candidates: string[] = [];
        const addCandidate = (candidate: string) => {
            const trimmed = candidate.trim();
            if (trimmed && !candidates.includes(trimmed)) {
                candidates.push(trimmed);
            }
        };
        const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
        let fencedMatch: RegExpExecArray | null;
        while ((fencedMatch = fenced.exec(text)) !== null) {
            if (fencedMatch[1]) {
                addCandidate(fencedMatch[1]);
            }
        }
        for (let index = 0; index < text.length; index++) {
            if (text[index] !== '{' && text[index] !== '[') {
                continue;
            }
            const balanced = this.extractBalancedJsonCandidate(text, index);
            if (balanced) {
                addCandidate(balanced.candidate);
                index = Math.max(index, balanced.end);
            }
        }
        return candidates;
    }

    protected extractBalancedJsonCandidate(text: string, start: number): { candidate: string; end: number } | undefined {
        const open = text[start];
        if (open !== '{' && open !== '[') {
            return undefined;
        }
        const stack: string[] = [];
        let inString = false;
        let escaped = false;
        for (let index = start; index < text.length; index++) {
            const char = text[index];
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = inString;
                continue;
            }
            if (char === '"') {
                inString = !inString;
                continue;
            }
            if (inString) {
                continue;
            }
            if (char === '{') {
                stack.push('}');
            } else if (char === '[') {
                stack.push(']');
            } else if (char === stack[stack.length - 1]) {
                stack.pop();
                if (!stack.length) {
                    return { candidate: text.slice(start, index + 1), end: index };
                }
            }
        }
        return { candidate: text.slice(start), end: text.length - 1 };
    }

    protected formatModelResponseExcerpt(text: string): string {
        const collapsed = text.replace(/\s+/g, ' ').trim();
        if (!collapsed) {
            return '<empty>';
        }
        return collapsed.length > 360 ? `${collapsed.slice(0, 360)}...` : collapsed;
    }

    protected isRecord(value: unknown): value is Record<string, unknown> {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }
}

export interface OpenPencilDesignCommandService {
    registerSession(session: OpenPencilDesignSession): Disposable;
    getSession(uri: URI): OpenPencilDesignSession | undefined;
    createDesign(name?: string): OpenPencilDocument;
    applyToDocument(document: OpenPencilDocument, selection: string[], operation: OpenPencilDesignOperation): OpenPencilCommandResult;
    applyOperationsToDocument(document: OpenPencilDocument, selection: string[], operations: OpenPencilDesignOperation[], options?: { mode?: OpenPencilAiDesignRequest['mode'] }): OpenPencilCommandResult;
    parseBatchDesignDsl(dsl: string): OpenPencilBatchDesignDslCommand[];
    applyBatchDesignDsl(document: OpenPencilDocument, selection: string[], dsl: string): OpenPencilCommandResult;
    getDocumentSummary(document: OpenPencilDocument): OpenPencilDocumentSummary;
    validateDocument(document: OpenPencilDocument): OpenPencilValidationResult;
    generateAiOperations(request: OpenPencilAiDesignRequest): Promise<OpenPencilAiDesignResult>;
    streamAiOperations(request: OpenPencilAiDesignRequest, apply: OpenPencilAiDesignStreamApply): Promise<OpenPencilAiDesignResult>;
    exportDocument(document: OpenPencilDocument, selection: string[], format: OpenPencilExportFormat, selectionOnly?: boolean): string;
    importDocument(source: string, name?: string): OpenPencilDocument;
}

@injectable()
export class OpenPencilDesignCommandServiceImpl implements OpenPencilDesignCommandService {

    protected readonly documents = new OpenPencilDocumentService();
    protected readonly sessions = new Map<string, OpenPencilDesignSession>();

    @inject(ContributionProvider) @named(OpenPencilAiDesignProvider) @optional()
    protected readonly aiProviderContributions: ContributionProvider<OpenPencilAiDesignProvider> | undefined;

    constructor(@unmanaged() protected readonly aiProvider?: OpenPencilAiDesignProvider) { }

    registerSession(session: OpenPencilDesignSession): Disposable {
        const key = session.uri.toString();
        this.sessions.set(key, session);
        return Disposable.create(() => {
            if (this.sessions.get(key) === session) {
                this.sessions.delete(key);
            }
        });
    }

    getSession(uri: URI): OpenPencilDesignSession | undefined {
        return this.sessions.get(uri.toString());
    }

    createDesign(name?: string): OpenPencilDocument {
        return this.documents.createDesign(name);
    }

    applyToDocument(document: OpenPencilDocument, selection: string[], operation: OpenPencilDesignOperation): OpenPencilCommandResult {
        const next = this.documents.cloneDocument(document);
        const page = this.documents.getActivePage(next);
        let nextSelection = [...selection];
        let changed = true;
        let message: string | undefined;

        switch (operation.operation) {
            case 'createNode':
            case 'addNode': {
                const node = this.prepareStructuredNode(next, operation.node);
                const parentId = this.normalizePageParentId(operation.parentId, page);
                if (!parentId) {
                    this.fitRootNodeToPage(node, page);
                }
                const inserted = openPencilRuntimeTreeMutations.insertNode(page.children, parentId, node, operation.index);
                if (inserted.failure === 'missing-parent') {
                    return this.unchanged(document, selection, `Parent node '${operation.parentId}' was not found.`);
                }
                page.children = inserted.children;
                nextSelection = [node.id];
                break;
            }
            case 'updateNode': {
                const node = openPencilRuntimeTreeMutations.findNode(page.children, operation.nodeId);
                if (!node) {
                    return this.unchanged(document, selection, `Node '${operation.nodeId}' was not found.`);
                }
                page.children = openPencilRuntimeTreeMutations.updateNode(page.children, operation.nodeId, operation.changes).children;
                nextSelection = [node.id];
                break;
            }
            case 'deleteNode':
            case 'removeNode': {
                const removed = openPencilRuntimeTreeMutations.removeNode(page.children, operation.nodeId);
                changed = removed.changed;
                page.children = removed.children;
                nextSelection = nextSelection.filter(id => id !== operation.nodeId);
                if (!changed) {
                    message = `Node '${operation.nodeId}' was not found.`;
                }
                break;
            }
            case 'replaceNode': {
                const location = this.findLocation(page.children, operation.nodeId);
                if (!location) {
                    return this.unchanged(document, selection, `Node '${operation.nodeId}' was not found.`);
                }
                const replacement = this.prepareStructuredNode(next, {
                    ...location.node,
                    ...operation.node,
                    id: typeof operation.node.id === 'string' && operation.node.id ? operation.node.id : location.node.id,
                    type: typeof operation.node.type === 'string' ? operation.node.type : location.node.type
                }, location.node.id);
                page.children = openPencilRuntimeTreeMutations.replaceNode(page.children, operation.nodeId, replacement).children;
                nextSelection = [replacement.id];
                break;
            }
            case 'moveNode': {
                const node = this.documents.findNode(next, operation.nodeId);
                if (!node) {
                    return this.unchanged(document, selection, `Node '${operation.nodeId}' was not found.`);
                }
                node.x = operation.x;
                node.y = operation.y;
                nextSelection = [node.id];
                break;
            }
            case 'resizeNode': {
                const node = this.documents.findNode(next, operation.nodeId);
                if (!node) {
                    return this.unchanged(document, selection, `Node '${operation.nodeId}' was not found.`);
                }
                if (typeof operation.x === 'number') {
                    node.x = operation.x;
                }
                if (typeof operation.y === 'number') {
                    node.y = operation.y;
                }
                node.width = Math.max(1, Math.round(operation.width));
                node.height = Math.max(1, Math.round(operation.height));
                nextSelection = [node.id];
                break;
            }
            case 'moveToParent': {
                const parentId = this.normalizePageParentId(operation.parentId, page);
                const moved = this.moveToParent(page.children, operation.nodeId, parentId, operation.index);
                if (moved === 'not-found') {
                    return this.unchanged(document, selection, `Node '${operation.nodeId}' was not found.`);
                }
                if (moved === 'missing-parent') {
                    return this.unchanged(document, selection, `Parent node '${operation.parentId}' was not found.`);
                }
                if (moved === 'invalid-parent') {
                    return this.unchanged(document, selection, `Cannot move node '${operation.nodeId}' into itself or one of its descendants.`);
                }
                changed = moved === 'changed';
                nextSelection = [operation.nodeId];
                break;
            }
            case 'nudgeNodes': {
                const nudged = this.nudgeNodes(page.children, operation.nodeIds, operation.dx, operation.dy);
                if (!nudged.changed && nudged.message) {
                    return this.unchanged(document, selection, nudged.message);
                }
                changed = nudged.changed;
                nextSelection = [...nudged.nodeIds];
                break;
            }
            case 'alignNodes': {
                const aligned = this.alignNodes(page.children, operation.nodeIds, operation.alignment);
                if (!aligned.changed && aligned.message) {
                    return this.unchanged(document, selection, aligned.message);
                }
                changed = aligned.changed;
                nextSelection = [...operation.nodeIds];
                break;
            }
            case 'distributeNodes': {
                const distributed = this.distributeNodes(page.children, operation.nodeIds, operation.direction);
                if (!distributed.changed && distributed.message) {
                    return this.unchanged(document, selection, distributed.message);
                }
                changed = distributed.changed;
                nextSelection = [...operation.nodeIds];
                break;
            }
            case 'duplicateNode': {
                const location = this.findLocation(page.children, operation.nodeId);
                if (!location) {
                    return this.unchanged(document, selection, `Node '${operation.nodeId}' was not found.`);
                }
                const clone = this.cloneNode(location.node);
                clone.x = (location.node.x ?? 0) + 24;
                clone.y = (location.node.y ?? 0) + 24;
                location.siblings.splice(location.index + 1, 0, clone);
                nextSelection = [clone.id];
                break;
            }
            case 'reorderNode': {
                const reordered = this.reorderNode(page.children, operation.nodeId, operation.index);
                if (reordered === 'not-found') {
                    return this.unchanged(document, selection, `Node '${operation.nodeId}' was not found.`);
                }
                changed = reordered === 'changed';
                nextSelection = [operation.nodeId];
                break;
            }
            case 'bringForward': {
                const moved = this.moveLayer(page.children, operation.nodeId, -1);
                if (moved === 'not-found') {
                    return this.unchanged(document, selection, `Node '${operation.nodeId}' was not found.`);
                }
                changed = moved === 'changed';
                nextSelection = [operation.nodeId];
                break;
            }
            case 'sendBackward': {
                const moved = this.moveLayer(page.children, operation.nodeId, 1);
                if (moved === 'not-found') {
                    return this.unchanged(document, selection, `Node '${operation.nodeId}' was not found.`);
                }
                changed = moved === 'changed';
                nextSelection = [operation.nodeId];
                break;
            }
            case 'bringToFront': {
                const moved = this.moveLayerToEdge(page.children, operation.nodeId, 'front');
                if (moved === 'not-found') {
                    return this.unchanged(document, selection, `Node '${operation.nodeId}' was not found.`);
                }
                changed = moved === 'changed';
                nextSelection = [operation.nodeId];
                break;
            }
            case 'sendToBack': {
                const moved = this.moveLayerToEdge(page.children, operation.nodeId, 'back');
                if (moved === 'not-found') {
                    return this.unchanged(document, selection, `Node '${operation.nodeId}' was not found.`);
                }
                changed = moved === 'changed';
                nextSelection = [operation.nodeId];
                break;
            }
            case 'groupNodes': {
                const grouped = this.groupNodes(page.children, operation.nodeIds);
                if (!grouped) {
                    return this.unchanged(document, selection, 'Select at least two sibling nodes to group.');
                }
                nextSelection = [grouped.id];
                break;
            }
            case 'ungroupNode': {
                const ungrouped = this.ungroupNode(page.children, operation.nodeId);
                if (!ungrouped.length) {
                    return this.unchanged(document, selection, `Group '${operation.nodeId}' was not found or has no children.`);
                }
                nextSelection = ungrouped;
                break;
            }
            case 'booleanNodes': {
                const combined = this.booleanNodes(page.children, operation.nodeIds, operation.booleanOperation);
                if (!combined.changed) {
                    return this.unchanged(document, selection, combined.message ?? 'Select at least two compatible sibling shapes for boolean operation.');
                }
                nextSelection = combined.nodeId ? [combined.nodeId] : [];
                break;
            }
            case 'convertToPath': {
                const converted = this.convertNodesToPath(page.children, operation.nodeIds);
                if (!converted.changed) {
                    return this.unchanged(document, selection, converted.message ?? 'Select at least one shape that can be converted to a path.');
                }
                nextSelection = converted.nodeIds;
                break;
            }
            case 'updatePathAnchors': {
                const updated = this.updatePathAnchors(page.children, operation.nodeId, operation.anchors, operation.closed);
                if (!updated) {
                    return this.unchanged(document, selection, `Path '${operation.nodeId}' was not found.`);
                }
                nextSelection = [operation.nodeId];
                break;
            }
            case 'updatePathAnchor': {
                const updated = this.updatePathAnchor(page.children, operation.nodeId, operation.anchorIndex, operation.anchor, operation.closed);
                if (!updated) {
                    return this.unchanged(document, selection, `Path anchor '${operation.nodeId}:${operation.anchorIndex}' was not found.`);
                }
                nextSelection = [operation.nodeId];
                break;
            }
            case 'updatePathHandle': {
                const updated = this.updatePathHandle(page.children, operation.nodeId, operation.anchorIndex, operation.handle, operation.value, operation.mirror, operation.closed);
                if (!updated) {
                    return this.unchanged(document, selection, `Path handle '${operation.nodeId}:${operation.anchorIndex}:${operation.handle}' was not found.`);
                }
                nextSelection = [operation.nodeId];
                break;
            }
            case 'insertPathAnchor': {
                const updated = this.insertPathAnchor(page.children, operation.nodeId, operation.anchorIndex, operation.anchor);
                if (!updated) {
                    return this.unchanged(document, selection, `Path '${operation.nodeId}' was not found or anchor index ${operation.anchorIndex} is invalid.`);
                }
                nextSelection = [operation.nodeId];
                break;
            }
            case 'removePathAnchor': {
                const updated = this.removePathAnchor(page.children, operation.nodeId, operation.anchorIndex);
                if (!updated) {
                    return this.unchanged(document, selection, `Path '${operation.nodeId}' was not found or anchor index ${operation.anchorIndex} is invalid.`);
                }
                nextSelection = [operation.nodeId];
                break;
            }
            case 'addPage': {
                const pageChildren = this.prepareStructuredPageChildren(next, operation.page?.children);
                const pageBackground = typeof operation.page?.background === 'string'
                    ? this.normalizeColorValue(operation.page.background)
                    : undefined;
                const newPage = {
                    ...this.documents.createPage(operation.page?.name),
                    ...operation.page,
                    ...(pageBackground ? { background: pageBackground } : {}),
                    id: operation.page?.id || this.documents.generateId('page'),
                    name: operation.page?.name || `Page ${(next.pages?.length ?? 0) + 1}`,
                    children: pageChildren
                };
                next.pages = next.pages ?? [];
                next.pages.splice(operation.index ?? next.pages.length, 0, newPage);
                if (operation.makeActive !== false) {
                    next.activePageId = newPage.id;
                    nextSelection = [];
                }
                break;
            }
            case 'updatePage': {
                const targetPage = this.documents.findPage(next, operation.pageId);
                if (!targetPage) {
                    return this.unchanged(document, selection, `Page '${operation.pageId}' was not found.`);
                }
                const changes = { ...operation.changes };
                if (Array.isArray(changes.children)) {
                    changes.children = this.prepareStructuredPageChildren(next, changes.children, targetPage);
                }
                if (typeof changes.background === 'string') {
                    const background = this.normalizeColorValue(changes.background);
                    if (background) {
                        changes.background = background;
                    } else {
                        delete changes.background;
                    }
                }
                Object.assign(targetPage, changes);
                break;
            }
            case 'removePage': {
                const pages = next.pages ?? [];
                if (pages.length <= 1) {
                    return this.unchanged(document, selection, 'Cannot remove the last OpenPencil page.');
                }
                const index = pages.findIndex(candidate => candidate.id === operation.pageId);
                if (index < 0) {
                    return this.unchanged(document, selection, `Page '${operation.pageId}' was not found.`);
                }
                pages.splice(index, 1);
                if (next.activePageId === operation.pageId) {
                    next.activePageId = pages[Math.max(0, index - 1)]?.id ?? pages[0].id;
                    nextSelection = [];
                }
                break;
            }
            case 'setActivePage': {
                if (!this.documents.findPage(next, operation.pageId)) {
                    return this.unchanged(document, selection, `Page '${operation.pageId}' was not found.`);
                }
                next.activePageId = operation.pageId;
                nextSelection = [];
                break;
            }
            case 'setVariable':
                next.variables = {
                    ...(next.variables ?? {}),
                    [operation.name]: operation.variable
                };
                nextSelection = [...selection];
                break;
            case 'updateVariable': {
                const variable = next.variables?.[operation.name];
                if (!variable) {
                    return this.unchanged(document, selection, `Variable '${operation.name}' was not found.`);
                }
                next.variables = {
                    ...(next.variables ?? {}),
                    [operation.name]: {
                        ...variable,
                        ...operation.changes
                    }
                };
                nextSelection = [...selection];
                break;
            }
            case 'removeVariable':
                if (!next.variables?.[operation.name]) {
                    return this.unchanged(document, selection, `Variable '${operation.name}' was not found.`);
                }
                delete next.variables[operation.name];
                if (!Object.keys(next.variables).length) {
                    delete next.variables;
                }
                nextSelection = [...selection];
                break;
            case 'setThemes':
                next.themes = this.sanitizeThemes(operation.themes);
                if (!Object.keys(next.themes).length) {
                    delete next.themes;
                }
                nextSelection = [...selection];
                break;
            case 'updateThemeAxis': {
                const values = this.sanitizeThemeValues(operation.values);
                if (!operation.axis.trim() || !values.length) {
                    return this.unchanged(document, selection, 'Theme axis and values must be non-empty.');
                }
                next.themes = {
                    ...(next.themes ?? {}),
                    [operation.axis]: values
                };
                nextSelection = [...selection];
                break;
            }
            case 'removeThemeAxis':
                if (!next.themes?.[operation.axis]) {
                    return this.unchanged(document, selection, `Theme axis '${operation.axis}' was not found.`);
                }
                delete next.themes[operation.axis];
                this.clearThemeAxisFromNodes(page.children, operation.axis);
                if (!Object.keys(next.themes).length) {
                    delete next.themes;
                }
                nextSelection = [...selection];
                break;
            case 'setNodeTheme': {
                const node = this.documents.findNode(next, operation.nodeId);
                if (!node) {
                    return this.unchanged(document, selection, `Node '${operation.nodeId}' was not found.`);
                }
                node.theme = { ...(node.theme ?? {}), ...operation.theme };
                nextSelection = [node.id];
                break;
            }
            case 'clearNodeTheme': {
                const node = this.documents.findNode(next, operation.nodeId);
                if (!node) {
                    return this.unchanged(document, selection, `Node '${operation.nodeId}' was not found.`);
                }
                if (operation.axes?.length) {
                    for (const axis of operation.axes) {
                        delete node.theme?.[axis];
                    }
                    if (node.theme && !Object.keys(node.theme).length) {
                        delete node.theme;
                    }
                } else {
                    delete node.theme;
                }
                nextSelection = [node.id];
                break;
            }
            case 'setNodeLayout': {
                const node = this.documents.findNode(next, operation.nodeId);
                if (!node) {
                    return this.unchanged(document, selection, `Node '${operation.nodeId}' was not found.`);
                }
                this.applyLayoutChanges(node, operation.layout, operation.normalizeChildren);
                nextSelection = [node.id];
                break;
            }
            case 'autoLayoutNode': {
                const node = this.documents.findNode(next, operation.nodeId);
                if (!node) {
                    return this.unchanged(document, selection, `Node '${operation.nodeId}' was not found.`);
                }
                this.applyLayoutChanges(node, {
                    layout: operation.direction ?? 'vertical',
                    ...(operation.gap !== undefined ? { gap: operation.gap } : {}),
                    ...(operation.padding !== undefined ? { padding: operation.padding } : {}),
                    ...(operation.justifyContent !== undefined ? { justifyContent: operation.justifyContent } : {}),
                    ...(operation.alignItems !== undefined ? { alignItems: operation.alignItems } : {})
                }, operation.normalizeChildren !== false);
                nextSelection = [node.id];
                break;
            }
            case 'setSelection':
                changed = false;
                nextSelection = [...operation.nodeIds];
                break;
        }

        return {
            document: next,
            selection: nextSelection,
            changed,
            message
        };
    }

    applyOperationsToDocument(document: OpenPencilDocument, selection: string[], operations: OpenPencilDesignOperation[], options?: { mode?: OpenPencilAiDesignRequest['mode'] }): OpenPencilCommandResult {
        const initialPage = this.documents.getActivePage(document);
        const createdRootViewIds = this.collectCreatedRootViewIds(operations, initialPage);
        let currentDocument = document;
        let currentSelection = [...selection];
        let changed = false;
        const messages: string[] = [];

        for (const operation of operations) {
            const result = this.applyToDocument(currentDocument, currentSelection, operation);
            currentDocument = result.document;
            currentSelection = result.selection;
            changed = changed || result.changed;
            if (result.message) {
                messages.push(result.message);
            }
        }
        if (options?.mode !== 'continuation' && this.arrangeCreatedRootViews(currentDocument, createdRootViewIds)) {
            changed = true;
        }

        return {
            document: currentDocument,
            selection: currentSelection,
            changed,
            message: messages.length ? messages.join('\n') : undefined
        };
    }

    parseBatchDesignDsl(dsl: string): OpenPencilBatchDesignDslCommand[] {
        const commands: OpenPencilBatchDesignDslCommand[] = [];
        const lines = dsl.split(/\r?\n/);
        for (let index = 0; index < lines.length; index++) {
            const line = this.stripDslComment(lines[index]).trim();
            if (!line) {
                continue;
            }
            const lineNumber = index + 1;
            const assignment = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(line);
            const binding = assignment?.[1];
            const expression = assignment?.[2]?.trim() ?? line;
            const call = /^([IUCMDR])\s*\((.*)\)$/.exec(expression);
            if (!call) {
                throw new OpenPencilBatchDesignDslError(`Expected a DSL command like I(...), U(...), D(...), C(...), M(...), or R(...).`, lineNumber);
            }
            const command = call[1] as OpenPencilBatchDesignDslCommand['command'];
            const args = this.splitDslArguments(call[2], lineNumber);
            const base = { line: lineNumber, ...(binding ? { binding } : {}) };
            switch (command) {
                case 'I':
                    this.expectDslArgCount(command, args, 2, 2, lineNumber);
                    commands.push({ ...base, command, parentRef: this.parseDslParentReference(args[0], lineNumber), node: this.parseDslObject(args[1], lineNumber) as Partial<OpenPencilNode> });
                    break;
                case 'U':
                    this.expectDslArgCount(command, args, 2, 2, lineNumber);
                    commands.push({ ...base, command, nodeRef: this.parseDslNodeReference(args[0], lineNumber), changes: this.sanitizeDslChanges(this.parseDslObject(args[1], lineNumber)) });
                    break;
                case 'D':
                    this.expectDslArgCount(command, args, 1, 1, lineNumber);
                    commands.push({ ...base, command, nodeRef: this.parseDslNodeReference(args[0], lineNumber) });
                    break;
                case 'C':
                    this.expectDslArgCount(command, args, 3, 3, lineNumber);
                    commands.push({ ...base, command, sourceRef: this.parseDslNodeReference(args[0], lineNumber), parentRef: this.parseDslParentReference(args[1], lineNumber), overrides: this.parseDslObject(args[2], lineNumber) as Partial<OpenPencilNode> });
                    break;
                case 'M':
                    this.expectDslArgCount(command, args, 2, 3, lineNumber);
                    commands.push({ ...base, command, nodeRef: this.parseDslNodeReference(args[0], lineNumber), parentRef: this.parseDslParentReference(args[1], lineNumber), ...(args[2] !== undefined ? { index: this.parseDslIndex(args[2], lineNumber) } : {}) });
                    break;
                case 'R':
                    this.expectDslArgCount(command, args, 2, 2, lineNumber);
                    commands.push({ ...base, command, nodeRef: this.parseDslNodeReference(args[0], lineNumber), newData: this.parseDslObject(args[1], lineNumber) as Partial<OpenPencilNode> });
                    break;
            }
        }
        return commands;
    }

    applyBatchDesignDsl(document: OpenPencilDocument, selection: string[], dsl: string): OpenPencilCommandResult {
        let commands: OpenPencilBatchDesignDslCommand[];
        try {
            commands = this.parseBatchDesignDsl(dsl);
        } catch (error) {
            return this.unchanged(document, selection, error instanceof Error ? error.message : 'Invalid OpenPencil batch DSL.');
        }

        const next = this.documents.cloneDocument(document);
        const page = this.documents.getActivePage(next);
        const bindings = new Map<string, string>();
        let nextSelection = [...selection];
        let changed = false;

        try {
            for (const command of commands) {
                switch (command.command) {
                    case 'I': {
                        const node = this.prepareDslNode(command.node, command.line);
                        const parentId = this.resolveDslParentReference(command.parentRef, bindings);
                        const inserted = openPencilRuntimeTreeMutations.insertNode(page.children, parentId, node);
                        if (inserted.failure === 'missing-parent') {
                            throw new OpenPencilBatchDesignDslError(`Parent node '${parentId}' was not found.`, command.line);
                        }
                        page.children = inserted.children;
                        if (command.binding) {
                            bindings.set(command.binding, node.id);
                        }
                        nextSelection = [node.id];
                        changed = true;
                        break;
                    }
                    case 'U': {
                        const nodeId = this.resolveDslNodeReference(command.nodeRef, bindings);
                        const node = openPencilRuntimeTreeMutations.findNode(page.children, nodeId);
                        if (!node) {
                            throw new OpenPencilBatchDesignDslError(`Node '${nodeId}' was not found.`, command.line);
                        }
                        page.children = openPencilRuntimeTreeMutations.updateNode(page.children, nodeId, command.changes).children;
                        if (command.binding) {
                            bindings.set(command.binding, node.id);
                        }
                        nextSelection = [node.id];
                        changed = true;
                        break;
                    }
                    case 'D': {
                        const nodeId = this.resolveDslNodeReference(command.nodeRef, bindings);
                        const removed = openPencilRuntimeTreeMutations.removeNode(page.children, nodeId);
                        if (removed.failure === 'not-found') {
                            throw new OpenPencilBatchDesignDslError(`Node '${nodeId}' was not found.`, command.line);
                        }
                        page.children = removed.children;
                        nextSelection = nextSelection.filter(id => id !== nodeId);
                        changed = true;
                        break;
                    }
                    case 'C': {
                        const sourceId = this.resolveDslNodeReference(command.sourceRef, bindings);
                        const source = this.findLocation(page.children, sourceId);
                        if (!source) {
                            throw new OpenPencilBatchDesignDslError(`Node '${sourceId}' was not found.`, command.line);
                        }
                        const clone = this.cloneNode(source.node);
                        Object.assign(clone, command.overrides);
                        if (!clone.id) {
                            clone.id = this.documents.generateId(clone.type);
                        }
                        const parentId = this.resolveDslParentReference(command.parentRef, bindings);
                        const inserted = openPencilRuntimeTreeMutations.insertNode(page.children, parentId, clone);
                        if (inserted.failure === 'missing-parent') {
                            throw new OpenPencilBatchDesignDslError(`Parent node '${parentId}' was not found.`, command.line);
                        }
                        page.children = inserted.children;
                        if (command.binding) {
                            bindings.set(command.binding, clone.id);
                        }
                        nextSelection = [clone.id];
                        changed = true;
                        break;
                    }
                    case 'M': {
                        const nodeId = this.resolveDslNodeReference(command.nodeRef, bindings);
                        const location = this.findLocation(page.children, nodeId);
                        if (!location) {
                            throw new OpenPencilBatchDesignDslError(`Node '${nodeId}' was not found.`, command.line);
                        }
                        const parentId = this.resolveDslParentReference(command.parentRef, bindings);
                        if (parentId && (parentId === nodeId || this.containsNode(location.node.children, parentId))) {
                            throw new OpenPencilBatchDesignDslError(`Cannot move node '${nodeId}' into itself or one of its descendants.`, command.line);
                        }
                        const moved = openPencilRuntimeTreeMutations.moveNode(page.children, nodeId, parentId, command.index);
                        if (moved.failure === 'missing-parent') {
                            throw new OpenPencilBatchDesignDslError(`Parent node '${parentId}' was not found.`, command.line);
                        }
                        if (moved.failure === 'invalid-parent') {
                            throw new OpenPencilBatchDesignDslError(`Cannot move node '${nodeId}' into itself or one of its descendants.`, command.line);
                        }
                        page.children = moved.children;
                        if (command.binding) {
                            bindings.set(command.binding, nodeId);
                        }
                        nextSelection = [nodeId];
                        changed = true;
                        break;
                    }
                    case 'R': {
                        const nodeId = this.resolveDslNodeReference(command.nodeRef, bindings);
                        const location = this.findLocation(page.children, nodeId);
                        if (!location) {
                            throw new OpenPencilBatchDesignDslError(`Node '${nodeId}' was not found.`, command.line);
                        }
                        const replacement: OpenPencilNode = {
                            ...command.newData,
                            id: typeof command.newData.id === 'string' && command.newData.id ? command.newData.id : location.node.id,
                            type: typeof command.newData.type === 'string' ? command.newData.type : location.node.type
                        } as OpenPencilNode;
                        page.children = openPencilRuntimeTreeMutations.replaceNode(page.children, nodeId, replacement).children;
                        if (command.binding) {
                            bindings.set(command.binding, replacement.id);
                        }
                        nextSelection = [replacement.id];
                        changed = true;
                        break;
                    }
                }
            }
        } catch (error) {
            return this.unchanged(document, selection, error instanceof Error ? error.message : 'Invalid OpenPencil batch DSL.');
        }

        return {
            document: next,
            selection: nextSelection,
            changed,
            message: undefined
        };
    }

    getDocumentSummary(document: OpenPencilDocument): OpenPencilDocumentSummary {
        const normalized = this.documents.cloneDocument(document);
        const nodes = this.documents.flattenNodes(normalized).map(node => ({
            id: node.id,
            type: node.type,
            name: node.name,
            text: typeof node.content === 'string' ? node.content : undefined
        }));
        return {
            name: normalized.name ?? 'OpenPencil Design',
            version: normalized.version,
            activePageId: this.documents.getActivePage(normalized).id,
            pages: normalized.pages?.map(page => ({
                id: page.id,
                name: page.name,
                width: page.width,
                height: page.height,
                background: page.background,
                gridSize: page.gridSize,
                showGrid: page.showGrid,
                snapToGrid: page.snapToGrid,
                nodes: page.children.length
            })) ?? [],
            nodes,
            variables: Object.keys(normalized.variables ?? {}),
            themes: normalized.themes
        };
    }

    validateDocument(document: OpenPencilDocument): OpenPencilValidationResult {
        return this.documents.validateDocument(document);
    }

    async generateAiOperations(request: OpenPencilAiDesignRequest): Promise<OpenPencilAiDesignResult> {
        const context = this.createAiSkillContext(request);
        const diagnostics: string[] = [];
        const providers = this.resolveAiProviders();
        let providerReturnedOperations = false;
        for (const [providerIndex, provider] of providers.entries()) {
            const providerName = provider.label ?? provider.id ?? 'AI provider';
            const providerDetails = {
                providerId: provider.id,
                providerLabel: provider.label,
                providerIndex,
                providersCount: providers.length,
                priority: provider.priority ?? 0
            };
            canvasAiFrontendDebug('provider-start', {
                ...providerDetails,
                selectionCount: request.selection.length
            });
            try {
                const providerResponse = await provider.generateOperations(request, context);
                const responseDiagnostics = this.providerDiagnostics(providerResponse, providerName);
                diagnostics.push(...responseDiagnostics);
                const providerOperations = this.providerOperations(providerResponse);
                canvasAiFrontendDebug('provider-result', {
                    ...providerDetails,
                    operationsCount: providerOperations?.length ?? 0,
                    diagnosticsCount: responseDiagnostics.length,
                    totalDiagnosticsCount: diagnostics.length
                });
                providerReturnedOperations ||= !!providerOperations?.length;
                if (providerOperations?.length && providerOperations.every(operation => this.isDesignOperationLike(operation))) {
                    const normalizedOperations = this.normalizeProviderAiOperations(providerOperations, request);
                    const previewDiagnostic = this.validateAiOperationsPreview(normalizedOperations, request, providerName);
                    if (previewDiagnostic) {
                        diagnostics.push(previewDiagnostic);
                        canvasAiFrontendDebug('provider-rejected', {
                            ...providerDetails,
                            reason: 'preview-validation',
                            operationsCount: normalizedOperations.length,
                            diagnosticsCount: diagnostics.length
                        });
                        continue;
                    }
                    canvasAiFrontendDebug('provider-accepted', {
                        ...providerDetails,
                        operationsCount: normalizedOperations.length,
                        diagnosticsCount: diagnostics.length
                    });
                    return {
                        operations: normalizedOperations,
                        context,
                        source: 'provider',
                        providerId: provider.id,
                        providerLabel: provider.label ?? provider.id,
                        diagnostics
                    };
                }
                if (providerOperations?.length) {
                    diagnostics.push(`${providerName} returned operations that do not match the OpenPencil structured operation contract.`);
                    canvasAiFrontendDebug('provider-rejected', {
                        ...providerDetails,
                        reason: 'invalid-operations',
                        operationsCount: providerOperations.length,
                        diagnosticsCount: diagnostics.length
                    });
                } else {
                    diagnostics.push(`${providerName} returned no OpenPencil operations.`);
                    canvasAiFrontendDebug('no-operations', {
                        ...providerDetails,
                        diagnosticsCount: diagnostics.length
                    });
                }
            } catch (error) {
                diagnostics.push(`${providerName} failed: ${error instanceof Error ? error.message : String(error)}`);
                canvasAiFrontendDebug('error', {
                    ...providerDetails,
                    diagnosticsCount: diagnostics.length,
                    errorName: error instanceof Error ? error.name : typeof error,
                    messageLength: error instanceof Error ? error.message.length : String(error).length
                });
            }
        }
        const failureMessage = this.createPageLevelAiFailureMessage(providers, diagnostics, providerReturnedOperations);
        diagnostics.push(failureMessage);
        if (!providers.length) {
            diagnostics.push(
                'Canvas AI requires a configured AI provider to generate designs.',
                'Install and configure CyberVinci AI Providers/AI Runtime, or configure a Theia AI language model for agent \'OpenPencil\' and purpose \'openpencil-design\'.',
                'Once configured, reopen the Canvas editor and try again.',
                'No design was generated.'
            );
        } else {
            diagnostics.push(
                `${providers.length} AI provider${providers.length === 1 ? ' was' : 's were'} registered but none returned usable OpenPencil operations.`,
                providerReturnedOperations
                    ? 'A provider responded but its operations failed validation. Check the diagnostics above for details.'
                    : 'Verify your selected AI runtime, model configuration, API keys, CLI login state, and network connectivity.',
                'No design was generated — Canvas AI will not apply fallback content without AI confirmation.'
            );
        }
        canvasAiFrontendDebug('no-operations', {
            providersCount: providers.length,
            providerReturnedOperations,
            diagnosticsCount: diagnostics.length
        });
        return {
            operations: [],
            context,
            source: 'deterministic-fallback',
            diagnostics
        };
    }

    async streamAiOperations(request: OpenPencilAiDesignRequest, apply: OpenPencilAiDesignStreamApply): Promise<OpenPencilAiDesignResult> {
        const context = this.createAiSkillContext(request);
        const diagnostics: string[] = [];
        const providers = this.resolveAiProviders();
        let providerReturnedOperations = false;

        for (const [providerIndex, provider] of providers.entries()) {
            if (!provider.streamOperations) {
                continue;
            }
            const providerName = provider.label ?? provider.id ?? 'AI provider';
            const providerDetails = {
                providerId: provider.id,
                providerLabel: provider.label,
                providerIndex,
                providersCount: providers.length,
                priority: provider.priority ?? 0
            };
            let currentRequest: OpenPencilAiDesignRequest = request;
            const acceptedOperations: OpenPencilDesignOperation[] = [];
            let completedOperations: OpenPencilDesignOperation[] | undefined;

            const acceptOperations = async (operations: OpenPencilDesignOperation[]): Promise<void> => {
                if (!operations.length) {
                    return;
                }
                providerReturnedOperations = true;
                if (!operations.every(operation => this.isDesignOperationLike(operation))) {
                    diagnostics.push(`${providerName} streamed operations that do not match the OpenPencil structured operation contract.`);
                    return;
                }
                const normalizedOperations = this.normalizeProviderAiOperations(operations, currentRequest);
                const previewDiagnostic = this.validateAiOperationsPreview(normalizedOperations, currentRequest, providerName);
                if (previewDiagnostic) {
                    diagnostics.push(previewDiagnostic);
                    canvasAiFrontendDebug('provider-stream-rejected', {
                        ...providerDetails,
                        reason: 'preview-validation',
                        operationsCount: normalizedOperations.length,
                        diagnosticsCount: diagnostics.length
                    });
                    return;
                }
                const applyResult = await apply({
                    operations: normalizedOperations,
                    context,
                    source: 'provider',
                    providerId: provider.id,
                    providerLabel: provider.label ?? provider.id,
                    diagnostics
                });
                if (!applyResult?.applied) {
                    diagnostics.push(`${providerName} streamed operations were valid but were not applied by the Canvas editor.`);
                    return;
                }
                acceptedOperations.push(...normalizedOperations);
                currentRequest = {
                    ...currentRequest,
                    document: applyResult.document,
                    selection: applyResult.selection,
                    mode: 'maintenance'
                };
            };

            canvasAiFrontendDebug('provider-stream-start', {
                ...providerDetails,
                selectionCount: request.selection.length
            });

            try {
                for await (const event of provider.streamOperations(currentRequest, context)) {
                    if (event.type === 'diagnostic') {
                        diagnostics.push(`${providerName}: ${event.message}`);
                        continue;
                    }
                    if (event.type === 'operation') {
                        await acceptOperations([event.operation]);
                        continue;
                    }
                    if (event.type === 'complete') {
                        diagnostics.push(...(event.diagnostics ?? []).map(diagnostic => `${providerName}: ${diagnostic}`));
                        if (event.operations?.length) {
                            completedOperations = event.operations;
                        }
                    }
                }
                if (!acceptedOperations.length && completedOperations?.length) {
                    for (const operation of completedOperations) {
                        await acceptOperations([operation]);
                    }
                }
                if (acceptedOperations.length) {
                    canvasAiFrontendDebug('provider-stream-accepted', {
                        ...providerDetails,
                        operationsCount: acceptedOperations.length,
                        diagnosticsCount: diagnostics.length
                    });
                    return {
                        operations: acceptedOperations,
                        context,
                        source: 'provider',
                        providerId: provider.id,
                        providerLabel: provider.label ?? provider.id,
                        diagnostics
                    };
                }
                diagnostics.push(`${providerName} streaming completed without usable OpenPencil operations.`);
            } catch (error) {
                diagnostics.push(`${providerName} streaming failed: ${error instanceof Error ? error.message : String(error)}`);
                canvasAiFrontendDebug('provider-stream-error', {
                    ...providerDetails,
                    diagnosticsCount: diagnostics.length,
                    errorName: error instanceof Error ? error.name : typeof error,
                    messageLength: error instanceof Error ? error.message.length : String(error).length
                });
                if (acceptedOperations.length) {
                    return {
                        operations: acceptedOperations,
                        context,
                        source: 'provider',
                        providerId: provider.id,
                        providerLabel: provider.label ?? provider.id,
                        diagnostics
                    };
                }
            }
        }

        const failureMessage = this.createPageLevelAiFailureMessage(providers, diagnostics, providerReturnedOperations);
        diagnostics.push(failureMessage);
        return {
            operations: [],
            context,
            source: 'deterministic-fallback',
            diagnostics
        };
    }

    protected resolveAiProviders(): OpenPencilAiDesignProvider[] {
        const providers = [
            ...(this.aiProviderContributions?.getContributions() ?? []),
            ...(this.aiProvider ? [this.aiProvider] : [])
        ];
        return providers
            .filter((provider, index) => providers.indexOf(provider) === index)
            .sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0));
    }

    protected createPageLevelAiFailureMessage(providers: OpenPencilAiDesignProvider[], diagnostics: string[], providerReturnedOperations: boolean): string {
        if (!providers.length) {
            return [
                'OpenPencil AI page generation requires a configured AI provider, but no OpenPencil AI provider is registered.',
                'Configure CyberVinci AI Runtime/AI Providers, or configure a Theia AI language model for OpenPencil, then try again.'
            ].join(' ');
        }
        const reason = providerReturnedOperations
            ? 'A configured provider responded, but its operations were invalid or failed preview validation.'
            : diagnostics.some(diagnostic => /usageLimitExceeded|usage limit/i.test(diagnostic))
                ? 'The selected AI model hit a usage limit before it produced OpenPencil operations.'
                : 'No configured provider returned usable OpenPencil operations.';
        const guidance = diagnostics.some(diagnostic => /usageLimitExceeded|usage limit/i.test(diagnostic))
            ? 'Switch OpenPencil/chat to another ready Theia AI model, or retry after the usage limit reset.'
            : 'Configure or select a CyberVinci AI Runtime provider/model, or a Theia AI language model for OpenPencil, then try again.';
        const details = diagnostics.length ? ` Diagnostics: ${diagnostics.join(' ')}` : '';
        return [
            'OpenPencil AI page generation did not run a usable AI result.',
            reason,
            guidance,
            details
        ].join(' ').trim();
    }

    protected providerOperations(response: OpenPencilAiDesignProviderResponse): OpenPencilDesignOperation[] | undefined {
        if (Array.isArray(response)) {
            return response;
        }
        return response?.operations;
    }

    protected providerDiagnostics(response: OpenPencilAiDesignProviderResponse, providerName: string): string[] {
        if (!response || Array.isArray(response) || !response.diagnostics?.length) {
            return [];
        }
        return response.diagnostics.map(diagnostic => `${providerName}: ${diagnostic}`);
    }

    protected normalizeProviderAiOperations(operations: OpenPencilDesignOperation[], request: OpenPencilAiDesignRequest): OpenPencilDesignOperation[] {
        const page = this.documents.getActivePage(request.document);
        const normalizedOperations = this.normalizeProviderAiFlatSiblingZOrder(this.normalizeProviderAiCreateIndexes(operations
            .map(operation => this.normalizeOperationParentReferences(operation, page))
            .map(operation => this.normalizeProviderAiOperationZOrder(operation))));
        if (request.mode === 'continuation' || request.selection.length || !this.isPageLevelAiPrompt(request.prompt)) {
            return normalizedOperations;
        }
        if (!page.children.length || !normalizedOperations.some(operation => this.isTopLevelPageLikeCreateOperation(operation, page))) {
            return normalizedOperations;
        }
        const createdIds = new Set(normalizedOperations
            .filter((operation): operation is Extract<OpenPencilDesignOperation, { operation: 'createNode' | 'addNode' }> =>
                (operation.operation === 'createNode' || operation.operation === 'addNode') && typeof operation.node.id === 'string')
            .map(operation => operation.node.id));
        const removals: OpenPencilDesignOperation[] = page.children
            .filter(node => !createdIds.has(node.id))
            .map(node => ({ operation: 'removeNode', nodeId: node.id }));
        return removals.length ? [...removals, ...normalizedOperations] : normalizedOperations;
    }

    protected normalizeProviderAiOperationZOrder(operation: OpenPencilDesignOperation): OpenPencilDesignOperation {
        if (operation.operation === 'createNode') {
            const node = this.normalizeProviderAiNodeZOrder(operation.node);
            return node === operation.node ? operation : { ...operation, node };
        }
        if (operation.operation === 'addNode') {
            const node = this.normalizeProviderAiNodeZOrder(operation.node);
            return node === operation.node ? operation : { ...operation, node };
        }
        if (operation.operation === 'replaceNode') {
            const node = this.normalizeProviderAiNodeZOrder(operation.node);
            return node === operation.node ? operation : { ...operation, node };
        }
        if (operation.operation === 'updatePage' && Array.isArray(operation.changes.children)) {
            return {
                ...operation,
                changes: {
                    ...operation.changes,
                    children: this.sortProviderAiNodeChildren(operation.changes.children.map(child => this.normalizeProviderAiNodeZOrder(child)))
                }
            };
        }
        return operation;
    }

    protected normalizeProviderAiCreateIndexes(operations: OpenPencilDesignOperation[]): OpenPencilDesignOperation[] {
        const createsByParent = new Map<string, Array<Extract<OpenPencilDesignOperation, { operation: 'createNode' | 'addNode' }>>>();
        for (const operation of operations) {
            if (operation.operation !== 'createNode' && operation.operation !== 'addNode') {
                continue;
            }
            const parentKey = this.providerAiParentKey(operation.parentId);
            const siblings = createsByParent.get(parentKey) ?? [];
            siblings.push(operation);
            createsByParent.set(parentKey, siblings);
        }
        const unsafeParents = new Set<string>();
        for (const [parentKey, siblings] of createsByParent) {
            let previousIndex: number | undefined;
            for (const sibling of siblings) {
                const index = this.providerAiExplicitSiblingIndex(sibling);
                if (index === undefined) {
                    continue;
                }
                if (previousIndex !== undefined && index <= previousIndex) {
                    unsafeParents.add(parentKey);
                    break;
                }
                previousIndex = index;
            }
        }
        return operations.map(operation => {
            if (operation.operation !== 'createNode' && operation.operation !== 'addNode') {
                return operation;
            }
            const parentKey = this.providerAiParentKey(operation.parentId);
            const index = this.providerAiExplicitSiblingIndex(operation);
            if (unsafeParents.has(parentKey) || (this.hasProviderAiIndex(operation) && index === undefined)) {
                return this.omitProviderAiCreateIndex(operation);
            }
            return operation;
        });
    }

    protected normalizeProviderAiFlatSiblingZOrder(operations: OpenPencilDesignOperation[]): OpenPencilDesignOperation[] {
        const normalized = [...operations];
        let segmentStart = 0;
        while (segmentStart < normalized.length) {
            while (segmentStart < normalized.length && !this.isProviderAiCreateOperation(normalized[segmentStart])) {
                segmentStart++;
            }
            let segmentEnd = segmentStart;
            while (segmentEnd < normalized.length && this.isProviderAiCreateOperation(normalized[segmentEnd])) {
                segmentEnd++;
            }
            if (segmentEnd - segmentStart > 1) {
                this.normalizeProviderAiCreateSegmentZOrder(normalized, segmentStart, segmentEnd);
            }
            segmentStart = segmentEnd + 1;
        }
        return normalized;
    }

    protected normalizeProviderAiCreateSegmentZOrder(operations: OpenPencilDesignOperation[], start: number, end: number): void {
        const slotsByParent = new Map<string, Array<{ operation: Extract<OpenPencilDesignOperation, { operation: 'createNode' | 'addNode' }>; slot: number; order: number }>>();
        for (let slot = start; slot < end; slot++) {
            const operation = operations[slot];
            if (!this.isProviderAiCreateOperation(operation) || this.hasProviderAiIndex(operation)) {
                continue;
            }
            const parentKey = this.providerAiParentKey(operation.parentId);
            const siblings = slotsByParent.get(parentKey) ?? [];
            siblings.push({ operation, slot, order: siblings.length });
            slotsByParent.set(parentKey, siblings);
        }
        for (const siblings of slotsByParent.values()) {
            if (siblings.length < 2) {
                continue;
            }
            const orderedSlots = [...siblings].sort((left, right) => left.slot - right.slot);
            const isContiguous = orderedSlots.every((sibling, index) => index === 0 || sibling.slot === orderedSlots[index - 1].slot + 1);
            if (!isContiguous) {
                continue;
            }
            const sorted = [...siblings].sort((left, right) =>
                this.providerAiNodeZRank(right.operation.node) - this.providerAiNodeZRank(left.operation.node) || left.order - right.order
            );
            siblings.forEach((sibling, index) => {
                operations[sibling.slot] = sorted[index].operation;
            });
        }
    }

    protected normalizeProviderAiNodeZOrder<T extends Partial<OpenPencilNode>>(node: T): T {
        if (!Array.isArray(node.children) || !node.children.length) {
            return node;
        }
        const normalizedChildren = node.children.map(child => this.normalizeProviderAiNodeZOrder(child));
        const children = this.isProviderAiAutoLayoutNode(node)
            ? normalizedChildren
            : this.sortProviderAiNodeChildren(normalizedChildren);
        const unchanged = node.children.length === children.length
            && node.children.every((child, index) => child === children[index]);
        return unchanged ? node : { ...node, children } as T;
    }

    protected sortProviderAiNodeChildren<T extends OpenPencilNode>(children: T[]): T[] {
        return children
            .map((child, index) => ({ child, index, rank: this.providerAiNodeZRank(child) }))
            .sort((left, right) => right.rank - left.rank || left.index - right.index)
            .map(entry => entry.child);
    }

    protected providerAiNodeZRank(node: Partial<OpenPencilNode>): number {
        const type = typeof node.type === 'string' ? node.type.toLowerCase() : '';
        const descriptor = [node.type, node.name, node.id, node.role]
            .filter((part): part is string => typeof part === 'string')
            .join(' ')
            .toLowerCase();
        if (/\b(text|copy|headline|heading|title|subtitle|label|caption|icon|button|badge|avatar|header|nav|navigation|foreground|control|cta|tab|menu|overlay)\b/.test(descriptor)) {
                    return 80;
                }
        if (/\b(image|photo|picture|illustration|shape|card|input|field|form|panel|modal|dialog|chart|graph|media|thumbnail)\b/.test(descriptor)) {
            return 50;
        }
        if (/\b(page|background|backdrop|bg|frame|screen|container|surface|base|glow|decorative|decoration|ornament|overlay)\b/.test(descriptor)) {
            return 20;
        }
        if (type === 'text') {
            return 80;
        }
        if (type === 'image' || type === 'rectangle' || type === 'ellipse' || type === 'path' || type === 'line' || type === 'polygon' || type === 'star') {
            return 50;
        }
        if (type === 'frame' || type === 'group' || type === 'component' || type === 'instance') {
            return 20;
        }
        return 50;
    }

    protected isProviderAiAutoLayoutNode(node: Partial<OpenPencilNode>): boolean {
        const record = node as Record<string, unknown>;
        if (this.isProviderAiAutoLayoutValue(record.layout)) {
            return true;
        }
        return this.isProviderAiAutoLayoutValue(record.layoutMode)
            || this.isProviderAiAutoLayoutValue(record.layoutDirection)
            || this.isProviderAiAutoLayoutValue(record.direction)
            || this.isProviderAiAutoLayoutValue(record.mode)
            || record.autoLayout === true;
    }

    protected isProviderAiAutoLayoutValue(value: unknown): boolean {
        if (typeof value === 'string') {
            return /^(vertical|horizontal|row|column|flex|auto-layout|autolayout)$/i.test(value.trim());
        }
        if (!this.isRecord(value)) {
            return false;
        }
        return this.isProviderAiAutoLayoutValue(value.direction)
            || this.isProviderAiAutoLayoutValue(value.mode)
            || this.isProviderAiAutoLayoutValue(value.type);
    }

    protected providerAiParentKey(parentId: string | null | undefined): string {
        return parentId ? `node:${parentId}` : 'page-root';
    }

    protected isProviderAiCreateOperation(operation: OpenPencilDesignOperation): operation is Extract<OpenPencilDesignOperation, { operation: 'createNode' | 'addNode' }> {
        return operation.operation === 'createNode' || operation.operation === 'addNode';
    }

    protected providerAiExplicitSiblingIndex(operation: Extract<OpenPencilDesignOperation, { operation: 'createNode' | 'addNode' }>): number | undefined {
        const value = (operation as { index?: unknown }).index;
        if (typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= 0) {
            return value;
        }
        return undefined;
    }

    protected hasProviderAiIndex(operation: Extract<OpenPencilDesignOperation, { operation: 'createNode' | 'addNode' }>): boolean {
        return Object.prototype.hasOwnProperty.call(operation, 'index');
    }

    protected omitProviderAiCreateIndex<T extends Extract<OpenPencilDesignOperation, { operation: 'createNode' | 'addNode' }>>(operation: T): T {
        const { index: _index, ...withoutIndex } = operation;
        return withoutIndex as T;
    }

    protected normalizeOperationParentReferences(operation: OpenPencilDesignOperation, page: OpenPencilPage): OpenPencilDesignOperation {
        if (operation.operation === 'createNode' || operation.operation === 'addNode') {
            const parentId = this.normalizePageParentId(operation.parentId, page);
            return parentId === operation.parentId ? operation : { ...operation, parentId };
        }
        if (operation.operation === 'moveToParent') {
            const parentId = this.normalizePageParentId(operation.parentId, page);
            return parentId === operation.parentId ? operation : { ...operation, parentId };
        }
        return operation;
    }

    protected isPageLevelAiPrompt(prompt: string): boolean {
        return /\b(landing|page|screen|dashboard|site|app|hero|interface|tela|pagina|página)\b/i.test(prompt);
    }

    protected isTopLevelPageLikeCreateOperation(operation: OpenPencilDesignOperation, page: OpenPencilPage): boolean {
        if ((operation.operation !== 'createNode' && operation.operation !== 'addNode') || this.normalizePageParentId(operation.parentId, page)) {
            return false;
        }
        const pageWidth = this.numberValue(page.width, 900);
        const pageHeight = this.numberValue(page.height, 620);
        const width = this.numberValue(operation.node.width, 0);
        const height = this.numberValue(operation.node.height, 0);
        return width >= pageWidth * 0.55 || height >= pageHeight * 0.55 || operation.node.type === 'frame';
    }

    protected validateAiOperationsPreview(operations: OpenPencilDesignOperation[], request: OpenPencilAiDesignRequest, providerName: string): string | undefined {
        const continuationDiagnostic = this.validateContinuationAiOperations(operations, request, providerName);
        if (continuationDiagnostic) {
            return continuationDiagnostic;
        }
        const preview = this.applyOperationsToDocument(this.documents.cloneDocument(request.document), request.selection, operations, { mode: request.mode });
        if (this.previewReportedPartialFailure(preview.message)) {
            return `${providerName} operations were rejected because preview application reported a partial failure${preview.message ? `: ${preview.message}` : '.'}`;
        }
        if (!preview.changed) {
            return `${providerName} operations were rejected because they did not change the preview${preview.message ? `: ${preview.message}` : '.'}`;
        }
        const validation = this.validateDocument(preview.document);
        if (!validation.valid) {
            const details = validation.issues.slice(0, 3).map(issue => `${issue.path}: ${issue.message}`).join('; ');
            return `${providerName} operations were rejected because preview validation failed${details ? `: ${details}` : '.'}`;
        }
        if (this.isPageLevelAiPrompt(request.prompt) && !this.hasVisibleAiPageContent(preview.document)) {
            return `${providerName} operations were rejected because the active page preview contains no visible renderable nodes.`;
        }
        return undefined;
    }

    protected validateContinuationAiOperations(operations: OpenPencilDesignOperation[], request: OpenPencilAiDesignRequest, providerName: string): string | undefined {
        if (request.mode !== 'continuation') {
            return undefined;
        }
        const existingNodeIds = new Set(this.documents.flattenNodes(request.document).map(node => node.id));
        for (const operation of operations) {
            if (this.isContinuationDestructiveOperation(operation, existingNodeIds)) {
                return `${providerName} operations were rejected because continuation mode must preserve existing nodes and layout; received '${operation.operation}'.`;
            }
        }
        return undefined;
    }

    protected previewReportedPartialFailure(message: string | undefined): boolean {
        return !!message && /\b(missing-parent|not found)\b/i.test(message);
    }

    protected isContinuationDestructiveOperation(operation: OpenPencilDesignOperation, existingNodeIds: Set<string>): boolean {
        switch (operation.operation) {
            case 'addNode':
            case 'createNode':
            case 'setSelection':
                return false;
            case 'updatePage':
                return Array.isArray(operation.changes.children);
            case 'updateNode':
            case 'replaceNode':
            case 'removeNode':
            case 'deleteNode':
            case 'moveNode':
            case 'resizeNode':
            case 'moveToParent':
            case 'duplicateNode':
            case 'reorderNode':
            case 'bringForward':
            case 'sendBackward':
            case 'bringToFront':
            case 'sendToBack':
            case 'ungroupNode':
            case 'updatePathAnchor':
            case 'updatePathHandle':
            case 'insertPathAnchor':
            case 'removePathAnchor':
            case 'setNodeTheme':
            case 'clearNodeTheme':
            case 'setNodeLayout':
            case 'autoLayoutNode':
            case 'updatePathAnchors':
                return existingNodeIds.has(operation.nodeId);
            case 'nudgeNodes':
            case 'alignNodes':
            case 'distributeNodes':
            case 'groupNodes':
            case 'booleanNodes':
            case 'convertToPath':
                return operation.nodeIds.some(nodeId => existingNodeIds.has(nodeId));
            case 'addPage':
            case 'setActivePage':
            case 'setVariable':
            case 'updateVariable':
            case 'removeVariable':
            case 'setThemes':
            case 'updateThemeAxis':
            case 'removeThemeAxis':
                return false;
            case 'removePage':
                return true;
        }
    }

    protected createAiSkillContext(request: OpenPencilAiDesignRequest): OpenPencilAiSkillContext {
        const activePage = this.documents.getActivePage(request.document);
        const selectedNodes = request.selection
            .map(id => this.documents.findNode(request.document, id))
            .filter((node): node is OpenPencilNode => !!node);
        const phase = selectedNodes.length ? 'maintenance' : 'generation';
        const requestMode = request.mode ?? phase;
        return {
            adapter: 'pen-ai-skills-in-process',
            phase,
            operationFormat: 'OpenPencilDesignOperation[]',
            operationExamples: this.createAiOperationExamples(phase, request),
            responseContract: {
                format: 'json',
                rootProperty: 'operations',
                guidance: 'Return {"contract":"openpencil.design-operations.v1","operations":[...]} only; each item must be an OpenPencilDesignOperation and must mutate .op document data, never browser DOM.'
            },
            documentContext: {
                documentName: request.document.name ?? 'OpenPencil Design',
                requestMode,
                activePageId: activePage.id,
                activePageName: activePage.name,
                nodeCount: this.documents.flattenNodes(request.document).length,
                selectedNodeIds: [...request.selection],
                selectedNodes: selectedNodes.map(node => ({
                    id: node.id,
                    type: node.type,
                    name: node.name,
                    content: node.content
                })),
                activePageLayout: this.createActivePageLayoutSummary(activePage)
            },
            skills: this.resolveAiSkillDescriptors(phase, request.prompt)
        };
    }

    protected createActivePageLayoutSummary(page: OpenPencilPage): OpenPencilAiActivePageLayoutSummary {
        const maxTopLevelNodes = 24;
        const topLevelNodes = page.children.slice(0, maxTopLevelNodes).map(node => this.createLayoutNodeSummary(node));
        return {
            id: page.id,
            name: page.name,
            bounds: {
                x: 0,
                y: 0,
                width: page.width,
                height: page.height
            },
            contentBottom: page.children.reduce((bottom, node) => Math.max(bottom, this.nodeBottom(node)), 0),
            topLevelNodeCount: page.children.length,
            topLevelNodes
        };
    }

    protected createLayoutNodeSummary(node: OpenPencilNode): OpenPencilAiLayoutNodeSummary {
        return {
            id: node.id,
            type: node.type,
            name: node.name,
            role: node.role,
            contentExcerpt: this.createContentExcerpt(node.content),
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
            childCount: node.children?.length ?? 0
        };
    }

    protected createContentExcerpt(content: OpenPencilNode['content']): string | undefined {
        if (content === undefined) {
            return undefined;
        }
        const text = typeof content === 'string'
            ? content
            : content.map(segment => segment.text).join(' ');
        const compact = text.replace(/\s+/g, ' ').trim();
        return compact.length > 80 ? `${compact.slice(0, 77)}...` : compact;
    }

    protected nodeBottom(node: OpenPencilNode): number {
        const y = typeof node.y === 'number' ? node.y : 0;
        const height = typeof node.height === 'number' ? node.height : 0;
        return y + height;
    }

    protected createAiOperationExamples(phase: 'generation' | 'maintenance', request: OpenPencilAiDesignRequest): OpenPencilDesignOperation[] {
        if (phase === 'maintenance' && request.selection.length) {
            return [
                {
                    operation: 'updateNode',
                    nodeId: request.selection[0],
                    changes: {
                        content: 'Automatize seus processos com IA',
                        fontSize: 48
                    }
                },
                {
                    operation: 'setSelection',
                    nodeIds: [request.selection[0]]
                }
            ];
        }
        return [
            {
                operation: 'createNode',
                parentId: null,
                node: {
                    id: 'ai-example-section',
                    type: 'frame',
                    name: 'AI generated hero section',
                    role: 'section',
                    x: 96,
                    y: 96,
                    width: 720,
                    height: 240,
                    layout: 'vertical',
                    gap: 16,
                    padding: 24,
                    children: [
                        {
                            id: 'ai-example-title',
                            type: 'text',
                            name: 'AI headline',
                            content: 'Automatize seus processos com IA',
                            width: 560,
                            height: 56,
                            fontSize: 40,
                            fontWeight: 700
                        }
                    ]
                }
            },
            {
                operation: 'setSelection',
                nodeIds: ['ai-example-section']
            }
        ];
    }

    protected resolveAiSkillDescriptors(phase: 'generation' | 'maintenance', prompt: string): OpenPencilAiSkillDescriptor[] {
        const skills = phase === 'maintenance'
            ? this.resolveNamedAiSkills(phase, ['local-edit', 'style-consistency'])
            : this.resolveNamedAiSkills(phase, ['jsonl-format', 'schema', 'layout', 'text-rules']);

        if (phase === 'maintenance') {
            const incrementalAdd = this.resolveTriggeredAiSkill(phase, 'incremental-add', prompt);
            return this.uniqueAiSkillDescriptors(incrementalAdd ? [...skills, incrementalAdd] : skills);
        }

        const styleGuide = this.resolveAiStyleGuide(prompt);
        const fallbackStyleDefaults = styleGuide ? undefined : this.resolveNamedAiSkill(phase, 'style-defaults');
        const antiSlop = this.resolveTriggeredAiSkill(phase, 'anti-slop', prompt);
        return this.uniqueAiSkillDescriptors([
            ...skills,
            ...(styleGuide ? [styleGuide] : []),
            ...(fallbackStyleDefaults ? [fallbackStyleDefaults] : []),
            ...(antiSlop ? [antiSlop] : []),
            ...this.resolveAiDomainSkills(prompt, phase)
        ]);
    }

    protected resolveAiDomainSkills(prompt: string, phase: 'generation' | 'maintenance'): OpenPencilAiSkillDescriptor[] {
        if (phase !== 'generation') {
            return [];
        }
        return ['landing-page', 'dashboard', 'form-ui', 'mobile-app']
            .map(name => this.resolveTriggeredAiSkill(phase, name, prompt))
            .filter((skill): skill is OpenPencilAiSkillDescriptor => !!skill);
    }

    protected resolveNamedAiSkills(phase: 'generation' | 'maintenance', names: string[]): OpenPencilAiSkillDescriptor[] {
        return names
            .map(name => this.resolveNamedAiSkill(phase, name))
            .filter((skill): skill is OpenPencilAiSkillDescriptor => !!skill);
    }

    protected resolveNamedAiSkill(phase: 'generation' | 'maintenance', name: string): OpenPencilAiSkillDescriptor | undefined {
        const definition = OPENPENCIL_EMBEDDED_AI_SKILLS.find(skill => skill.name === name && skill.phase.includes(phase));
        return definition ? this.createAiSkillDescriptor(definition, phase) : undefined;
    }

    protected resolveTriggeredAiSkill(phase: 'generation' | 'maintenance', name: string, prompt: string): OpenPencilAiSkillDescriptor | undefined {
        const definition = OPENPENCIL_EMBEDDED_AI_SKILLS.find(skill => skill.name === name && skill.phase.includes(phase));
        if (!definition || !this.matchesAiSkillTrigger(definition, prompt)) {
            return undefined;
        }
        return this.createAiSkillDescriptor(definition, phase);
    }

    protected createAiSkillDescriptor(definition: OpenPencilEmbeddedAiSkillDefinition, phase: 'generation' | 'maintenance'): OpenPencilAiSkillDescriptor {
        return {
            name: definition.name,
            phase,
            category: definition.category,
            sourcePath: definition.sourcePath,
            guidance: definition.guidance,
            content: this.materializeAiSkillContent(definition.content)
        };
    }

    protected matchesAiSkillTrigger(definition: OpenPencilEmbeddedAiSkillDefinition, prompt: string): boolean {
        if (!definition.trigger) {
            return true;
        }
        if (definition.trigger.keywords?.length) {
            return definition.trigger.keywords.some(keyword => this.matchesAiKeyword(prompt, keyword));
        }
        return false;
    }

    protected materializeAiSkillContent(content: string): string {
        return content.replace(/\{\{recentHistory\}\}/g, 'No recent history.');
    }

    protected resolveAiStyleGuide(prompt: string): OpenPencilAiSkillDescriptor | undefined {
        const explicit = this.resolveExplicitAiStyleGuide(prompt);
        if (explicit) {
            return this.createAiStyleGuideDescriptor(explicit);
        }
        const { tags, platform } = this.inferAiStyleGuideRequest(prompt);
        if (!tags.length) {
            return undefined;
        }
        const candidates = platform
            ? OPENPENCIL_EMBEDDED_STYLE_GUIDES.filter(guide => guide.platform === platform)
            : OPENPENCIL_EMBEDDED_STYLE_GUIDES;
        const promptTokens = this.normalizedAiPromptTokens(prompt);
        const scored = candidates
            .map(guide => ({
                guide,
                score: this.scoreAiStyleGuide(guide, tags, promptTokens)
            }))
            .filter(candidate => candidate.score > 0)
            .sort((left, right) => right.score - left.score || left.guide.name.localeCompare(right.guide.name));
        return scored[0] ? this.createAiStyleGuideDescriptor(scored[0].guide) : undefined;
    }

    protected resolveExplicitAiStyleGuide(prompt: string): OpenPencilEmbeddedStyleGuideDefinition | undefined {
        const normalized = this.normalizedAiText(prompt);
        return OPENPENCIL_EMBEDDED_STYLE_GUIDES.find(guide => {
            const guideName = this.normalizedAiText(guide.name);
            return normalized.includes(guideName) || normalized.includes(guideName.replace(/-/g, ' '));
        });
    }

    protected createAiStyleGuideDescriptor(guide: OpenPencilEmbeddedStyleGuideDefinition): OpenPencilAiSkillDescriptor {
        return {
            name: guide.name,
            phase: 'generation',
            category: 'knowledge',
            sourcePath: guide.sourcePath,
            guidance: `Apply the ${guide.name} style guide selected from vendored OpenPencil style-guides.`,
            content: guide.content,
            tags: guide.tags,
            platform: guide.platform
        };
    }

    protected inferAiStyleGuideRequest(prompt: string): { tags: string[]; platform?: OpenPencilEmbeddedStyleGuidePlatform } {
        const tags = new Set<string>();
        const addTags = (...items: string[]) => items.forEach(item => tags.add(item));
        const matchesAny = (keywords: string[]) => keywords.some(keyword => this.matchesAiKeyword(prompt, keyword));

        if (matchesAny(['mobile', 'phone', 'ios', 'android'])) {
            addTags('mobile');
        }
        if (matchesAny(['dark', 'black', 'midnight', 'noir', 'terminal', 'cyber', 'neon'])) {
            addTags('dark-mode');
        }
        if (matchesAny(['light', 'white', 'clean', 'bright'])) {
            addTags('light-mode');
        }
        if (matchesAny(['landing', 'marketing', 'homepage', 'website', 'hero'])) {
            addTags('landing-page');
        }
        if (matchesAny(['dashboard', 'analytics', 'metric', 'metrics', 'admin', 'data', 'chart', 'kpi'])) {
            addTags('dashboard', 'data-focused');
        }
        if (matchesAny(['enterprise', 'corporate', 'professional', 'b2b'])) {
            addTags('enterprise', 'corporate', 'professional');
        }
        if (matchesAny(['saas', 'product', 'startup'])) {
            addTags('clean', 'modern', 'professional');
        }
        if (matchesAny(['ai', 'developer', 'code', 'api', 'technical'])) {
            addTags('tech');
        }
        if (matchesAny(['blue'])) {
            addTags('blue-accent');
        }
        if (matchesAny(['cyan'])) {
            addTags('cyan-accent');
        }
        if (matchesAny(['purple', 'violet'])) {
            addTags('purple');
        }
        if (matchesAny(['gold', 'luxury', 'premium'])) {
            addTags('gold-accent', 'luxury', 'premium');
        }
        if (matchesAny(['minimal', 'minimalist'])) {
            addTags('minimal');
        }
        if (matchesAny(['rounded', 'soft', 'friendly'])) {
            addTags('rounded', 'friendly');
        }
        if (matchesAny(['editorial', 'magazine', 'serif'])) {
            addTags('editorial', 'serif');
        }
        if (matchesAny(['finance', 'fintech', 'banking'])) {
            addTags('fintech', 'data-focused', 'professional');
        }
        if (matchesAny(['health', 'healthcare', 'wellness', 'medical'])) {
            addTags('wellness', 'calm', 'professional');
        }
        if (matchesAny(['commerce', 'ecommerce', 'shop', 'store', 'retail'])) {
            addTags('modern', 'friendly', 'landing-page');
        }

        if (tags.size && !tags.has('dark-mode') && !tags.has('light-mode')) {
            tags.add('light-mode');
        }

        return {
            tags: [...tags],
            platform: tags.has('mobile') ? 'mobile' : undefined
        };
    }

    protected scoreAiStyleGuide(guide: OpenPencilEmbeddedStyleGuideDefinition, requestTags: string[], promptTokens: Set<string>): number {
        const guideTags = new Set(guide.tags);
        const tagScore = requestTags.reduce((score, tag) => score + (guideTags.has(tag) ? 1 : 0), 0);
        const nameScore = guide.name
            .split('-')
            .reduce((score, token) => score + (promptTokens.has(token) ? 0.25 : 0), 0);
        return tagScore + nameScore;
    }

    protected uniqueAiSkillDescriptors(skills: OpenPencilAiSkillDescriptor[]): OpenPencilAiSkillDescriptor[] {
        const seen = new Set<string>();
        return skills.filter(skill => {
            const key = `${skill.phase}:${skill.sourcePath}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    protected matchesAiKeyword(text: string, keyword: string): boolean {
        const lowerKeyword = keyword.toLowerCase().trim();
        if (!lowerKeyword) {
            return false;
        }
        const lowerText = text.toLowerCase();
        if (!/^[\x00-\x7f]+$/.test(lowerKeyword)) {
            return lowerText.includes(lowerKeyword);
        }
        const escaped = lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`\\b${escaped}\\b`, 'i').test(lowerText);
    }

    protected normalizedAiPromptTokens(prompt: string): Set<string> {
        return new Set(this.normalizedAiText(prompt).split(/\s+/).filter(Boolean));
    }

    protected normalizedAiText(text: string): string {
        return text.toLowerCase().replace(/[^a-z0-9-]+/g, ' ').trim();
    }

    protected generateDeterministicAiOperations(request: OpenPencilAiDesignRequest, context: OpenPencilAiSkillContext): OpenPencilDesignOperation[] {
        const containedShapeOperations = this.generateDeterministicContainedShapeOperations(request);
        if (containedShapeOperations) {
            return containedShapeOperations;
        }
        if (context.phase === 'maintenance' && request.selection.length) {
            return this.generateDeterministicMaintenanceOperations(request);
        }
        return this.generateDeterministicGenerationOperations(request);
    }

    protected generateDeterministicContainedShapeOperations(request: OpenPencilAiDesignRequest): OpenPencilDesignOperation[] | undefined {
        if (!this.isContainedShapePrompt(request.prompt)) {
            return undefined;
        }
        const target = this.resolveContainedShapeTarget(request);
        if (!target) {
            return undefined;
        }
        const width = Math.max(36, Math.round(this.numberValue(target.width, 160) * 0.34));
        const height = Math.max(28, Math.round(this.numberValue(target.height, 100) * 0.34));
        const inset = Math.max(12, Math.min(32, Math.round(Math.min(this.numberValue(target.width, 160), this.numberValue(target.height, 100)) * 0.12)));
        const nodeId = this.uniqueAiId(request.document, `${this.stableAiIdBase(request.prompt)}-rectangle`);
        return [
            {
                operation: 'addNode',
                parentId: target.id,
                node: {
                    id: nodeId,
                    type: 'rectangle',
                    name: 'AI generated rectangle',
                    x: inset,
                    y: inset,
                    width,
                    height,
                    cornerRadius: 8,
                    fill: [{ type: 'solid', color: this.resolveCreatedShapeColor(request.prompt) ?? '#dc2626' }],
                    stroke: { color: '#991b1b', width: 1 },
                    explain: `Generated inside '${target.name ?? target.id}' from prompt: ${request.prompt}`
                }
            },
            { operation: 'setSelection', nodeIds: [nodeId] }
        ];
    }

    protected isContainedShapePrompt(prompt: string): boolean {
        const lower = prompt.toLowerCase();
        return /(inside|within|dentro|interno|inserir|insira|crie|criar|create|add|adicione|adicionar|coloque|por|ponha)/i.test(lower)
            && /(rectangle|rect|retangulo|retângulo|box|caixa)/i.test(lower)
            && /(inside|within|dentro|em|no|na)/i.test(lower);
    }

    protected resolveContainedShapeTarget(request: OpenPencilAiDesignRequest): OpenPencilNode | undefined {
        const selectedTarget = request.selection
            .map(id => this.documents.findNode(request.document, id))
            .find((node): node is OpenPencilNode => !!node && this.canContainAiShape(node));
        if (selectedTarget) {
            return selectedTarget;
        }
        const targetColor = this.resolveContainerColorHint(request.prompt);
        const candidates = this.documents.flattenNodes(request.document).filter(node => this.canContainAiShape(node));
        if (targetColor) {
            return candidates.find(node => this.nodeMatchesColorHint(node, targetColor));
        }
        return candidates.find(node => node.type === 'frame' || node.type === 'rectangle' || node.type === 'group');
    }

    protected canContainAiShape(node: OpenPencilNode): boolean {
        return node.type === 'frame' || node.type === 'group' || node.type === 'rectangle';
    }

    protected normalizePageParentId(parentId: string | null | undefined, page: OpenPencilPage): string | null {
        if (!parentId || parentId === page.id || parentId === 'page' || parentId === 'root' || parentId === 'document') {
            return null;
        }
        return parentId;
    }

    protected collectCreatedRootViewIds(operations: OpenPencilDesignOperation[], page: OpenPencilPage): string[] {
        return operations
            .filter((operation): operation is Extract<OpenPencilDesignOperation, { operation: 'createNode' | 'addNode' }> =>
                (operation.operation === 'createNode' || operation.operation === 'addNode')
                    && !this.normalizePageParentId(operation.parentId, page)
                    && typeof operation.node.id === 'string'
                    && this.isStandaloneRootViewNode(operation.node, page))
            .map(operation => operation.node.id!);
    }

    protected arrangeCreatedRootViews(document: OpenPencilDocument, rootIds: string[]): boolean {
        if (rootIds.length < 2) {
            return false;
        }
        const page = this.documents.getActivePage(document);
        const idSet = new Set(rootIds);
        const roots = page.children.filter(node => idSet.has(node.id) && this.isStandaloneRootViewNode(node, page));
        if (roots.length < 2 || !this.shouldArrangeRootViews(roots, page)) {
            return false;
        }
        this.arrangeRootViewsInPage(roots, page);
        return true;
    }

    protected shouldArrangeRootViews(nodes: OpenPencilNode[], page: OpenPencilPage): boolean {
        const pageWidth = Math.max(120, this.numberValue(page.width, 900));
        const pageHeight = Math.max(120, this.numberValue(page.height, 620));
        const minGap = Math.max(12, Math.floor(pageWidth * 0.015));
        if (nodes.some(node => {
            const x = this.numberValue(node.x, 0);
            const y = this.numberValue(node.y, 0);
            const width = this.numberValue(node.width, 0);
            const height = this.numberValue(node.height, 0);
            return x < 0 || y < 0 || x + width > pageWidth || y + height > pageHeight;
        })) {
            return true;
        }
        for (let index = 0; index < nodes.length; index++) {
            for (let other = index + 1; other < nodes.length; other++) {
                if (this.nodesOverlap(nodes[index], nodes[other], minGap)) {
                    return true;
                }
            }
        }
        return false;
    }

    protected arrangeRootViewsInPage(nodes: OpenPencilNode[], page: OpenPencilPage): void {
        const pageWidth = Math.max(120, this.numberValue(page.width, 900));
        const pageHeight = Math.max(120, this.numberValue(page.height, 620));
        const margin = Math.min(40, Math.floor(Math.min(pageWidth, pageHeight) / 8));
        const gap = Math.max(16, Math.min(32, Math.floor(pageWidth * 0.03)));
        const availableWidth = Math.max(80, pageWidth - margin * 2 - gap * (nodes.length - 1));
        const availableHeight = Math.max(80, pageHeight - margin * 2);
        const totalWidth = nodes.reduce((sum, node) => sum + this.numberValue(node.width, this.isTextLikeNode(node) ? 160 : 120), 0);
        const maxHeight = Math.max(...nodes.map(node => this.numberValue(node.height, this.isTextLikeNode(node) ? 40 : 120)));
        const scale = Math.min(1, availableWidth / Math.max(totalWidth, 1), availableHeight / Math.max(maxHeight, 1));

        if (scale < 1) {
            nodes.forEach(node => this.scaleStructuredNode(node, scale));
        }

        const arrangedHeight = Math.max(...nodes.map(node => this.numberValue(node.height, this.isTextLikeNode(node) ? 40 : 120)));
        let cursor = margin;
        const top = this.roundScaledValue(Math.max(margin, (pageHeight - arrangedHeight) / 2));
        for (const node of nodes) {
            const width = this.numberValue(node.width, this.isTextLikeNode(node) ? 160 : 120);
            node.x = this.roundScaledValue(cursor);
            node.y = top;
            cursor += width + gap;
        }
    }

    protected isStandaloneRootViewNode(node: Partial<OpenPencilNode>, page: OpenPencilPage): boolean {
        if (node.type !== 'frame') {
            return false;
        }
        const pageWidth = Math.max(120, this.numberValue(page.width, 900));
        const pageHeight = Math.max(120, this.numberValue(page.height, 620));
        const width = this.numberValue(node.width, 0);
        const height = this.numberValue(node.height, 0);
        const label = `${node.id ?? ''} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        const hasViewHint = /\b(desktop|mobile|tablet|view|screen|page|viewport|tela|vis[aã]o|pagina|página)\b/.test(label);
        return hasViewHint || (width >= pageWidth * 0.2 && height >= pageHeight * 0.35);
    }

    protected nodesOverlap(first: OpenPencilNode, second: OpenPencilNode, minGap = 0): boolean {
        const firstX = this.numberValue(first.x, 0);
        const firstY = this.numberValue(first.y, 0);
        const firstWidth = this.numberValue(first.width, 0);
        const firstHeight = this.numberValue(first.height, 0);
        const secondX = this.numberValue(second.x, 0);
        const secondY = this.numberValue(second.y, 0);
        const secondWidth = this.numberValue(second.width, 0);
        const secondHeight = this.numberValue(second.height, 0);
        return firstX < secondX + secondWidth + minGap
            && firstX + firstWidth + minGap > secondX
            && firstY < secondY + secondHeight + minGap
            && firstY + firstHeight + minGap > secondY;
    }

    protected nodeMatchesColorHint(node: OpenPencilNode, targetColor: string): boolean {
        const label = `${node.name ?? ''} ${node.id ?? ''}`.toLowerCase();
        if (targetColor === '#16a34a' && (label.includes('green') || label.includes('verde'))) {
            return true;
        }
        if (targetColor === '#dc2626' && (label.includes('red') || label.includes('vermelho'))) {
            return true;
        }
        return node.fill?.some(fill => this.colorApproximatelyMatches(fill.color, targetColor)) ?? false;
    }

    protected colorApproximatelyMatches(actual: string | undefined, expected: string): boolean {
        const actualRgb = this.hexToRgb(actual);
        const expectedRgb = this.hexToRgb(expected);
        if (!actualRgb || !expectedRgb) {
            return actual?.toLowerCase() === expected.toLowerCase();
        }
        const [actualRed, actualGreen, actualBlue] = actualRgb;
        const [expectedRed, expectedGreen, expectedBlue] = expectedRgb;
        const distance = Math.abs(actualRed - expectedRed) + Math.abs(actualGreen - expectedGreen) + Math.abs(actualBlue - expectedBlue);
        const sameDominantChannel = expectedGreen > expectedRed && expectedGreen > expectedBlue
            ? actualGreen >= actualRed && actualGreen >= actualBlue
            : expectedRed > expectedGreen && expectedRed > expectedBlue
                ? actualRed >= actualGreen && actualRed >= actualBlue
                : expectedBlue > expectedRed && expectedBlue > expectedGreen
                    ? actualBlue >= actualRed && actualBlue >= actualGreen
                    : false;
        return distance <= 96 || sameDominantChannel;
    }

    protected hexToRgb(value: string | undefined): [number, number, number] | undefined {
        if (!value) {
            return undefined;
        }
        const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
        if (!match) {
            return undefined;
        }
        const hex = match[1].length === 3
            ? match[1].split('').map(character => `${character}${character}`).join('')
            : match[1];
        return [
            parseInt(hex.slice(0, 2), 16),
            parseInt(hex.slice(2, 4), 16),
            parseInt(hex.slice(4, 6), 16)
        ];
    }

    protected generateDeterministicMaintenanceOperations(request: OpenPencilAiDesignRequest): OpenPencilDesignOperation[] {
        const selectedNodes = request.selection
            .map(id => this.documents.findNode(request.document, id))
            .filter((node): node is OpenPencilNode => !!node);
        const accent = this.resolvePromptAccentColor(request.prompt);
        const operations = selectedNodes.map((node): OpenPencilDesignOperation => {
            const text = this.promptHeadline(request.prompt);
            if (this.isTextLikeNode(node)) {
                return {
                    operation: 'updateNode',
                    nodeId: node.id,
                    changes: {
                        content: text,
                        ...(accent ? { fill: [{ type: 'solid', color: accent }] } : {})
                    }
                };
            }
            return {
                operation: 'updateNode',
                nodeId: node.id,
                changes: {
                    name: node.name ? `${node.name} AI edit` : 'AI edited node',
                    explain: `In-process AI instruction: ${request.prompt}`,
                    ...(accent ? { fill: [{ type: 'solid', color: accent }] } : {})
                }
            };
        });
        return [
            ...operations,
            { operation: 'setSelection', nodeIds: selectedNodes.map(node => node.id) }
        ];
    }

    protected generateDeterministicGenerationOperations(request: OpenPencilAiDesignRequest): OpenPencilDesignOperation[] {
        const page = this.documents.getActivePage(request.document);
        const screen = this.generatePromptScreenNode(request, page);
        if (screen) {
            return [
                {
                    operation: 'createNode',
                    parentId: null,
                    node: screen
                },
                { operation: 'setSelection', nodeIds: [screen.id] }
            ];
        }
        const baseId = this.stableAiIdBase(request.prompt);
        const sectionId = this.uniqueAiId(request.document, `${baseId}-section`);
        const titleId = this.uniqueAiId(request.document, `${baseId}-title`);
        const bodyId = this.uniqueAiId(request.document, `${baseId}-body`);
        const buttonId = this.uniqueAiId(request.document, `${baseId}-button`);
        const buttonTextId = this.uniqueAiId(request.document, `${baseId}-button-text`);
        const accent = this.resolvePromptAccentColor(request.prompt) ?? '#2563eb';
        const y = this.nextAiSectionY(page.children);
        return [
            {
                operation: 'createNode',
                parentId: null,
                node: {
                    id: sectionId,
                    type: 'frame',
                    name: 'AI generated section',
                    role: 'section',
                    x: 96,
                    y,
                    width: Math.min(720, Math.max(520, this.numberValue(page.width, 900) - 192)),
                    height: 240,
                    layout: 'vertical',
                    gap: 14,
                    padding: [28, 32, 28, 32],
                    cornerRadius: 18,
                    fill: [{ type: 'solid', color: '#f8fafc' }],
                    stroke: { color: '#cbd5e1', width: 1 },
                    effects: [{ type: 'shadow', offsetX: 0, offsetY: 14, blur: 28, spread: 0, color: 'rgba(15, 23, 42, 0.10)' }],
                    explain: `Generated in-process from prompt: ${request.prompt}`,
                    children: [
                        {
                            id: titleId,
                            type: 'text',
                            name: 'AI headline',
                            role: 'heading',
                            width: 'fill_container',
                            content: this.promptGeneratedHeadline(request.prompt),
                            fontSize: 34,
                            fontWeight: 700,
                            lineHeight: 1.05,
                            textGrowth: 'fixed-width',
                            fill: [{ type: 'solid', color: '#0f172a' }]
                        },
                        {
                            id: bodyId,
                            type: 'text',
                            name: 'AI supporting copy',
                            role: 'body-text',
                            width: 'fill_container',
                            content: this.promptGeneratedBodyCopy(request.prompt),
                            fontSize: 16,
                            fontWeight: 400,
                            lineHeight: 1.5,
                            textGrowth: 'fixed-width',
                            fill: [{ type: 'solid', color: '#475569' }]
                        },
                        {
                            id: buttonId,
                            type: 'frame',
                            name: 'AI CTA button',
                            role: 'button',
                            width: 180,
                            height: 46,
                            layout: 'horizontal',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: [12, 22],
                            cornerRadius: 12,
                            fill: [{ type: 'solid', color: accent }],
                            children: [
                                {
                                    id: buttonTextId,
                                    type: 'text',
                                    name: 'AI CTA label',
                                    role: 'label',
                                    content: this.promptCtaLabel(request.prompt),
                                    fontSize: 15,
                                    fontWeight: 700,
                                    fill: [{ type: 'solid', color: '#ffffff' }]
                                }
                            ]
                        }
                    ]
                }
            },
            { operation: 'setSelection', nodeIds: [sectionId] }
        ];
    }

    protected generatePromptScreenNode(request: OpenPencilAiDesignRequest, page: OpenPencilPage): OpenPencilNode | undefined {
        const prompt = request.prompt.toLowerCase();
        if (/\b(login|signin|sign in|entrar|acesso|auth|bank|banking|banco|finance|finan[cç]as)\b/i.test(prompt)) {
            return this.createLoginScreenNode(request, page);
        }
        if (/\b(dashboard|relat[oó]rio)\b/i.test(prompt) || (/\b(analytics|metric|metrics|dados|kpi)\b/i.test(prompt) && /\b(screen|page|tela|p[aá]gina|view|app)\b/i.test(prompt))) {
            return this.createDashboardScreenNode(request, page);
        }
        if (/\b(mobile|celular|phone|app|ios|android|screen|tela)\b/i.test(prompt)) {
            return this.createAppScreenNode(request, page);
        }
        return undefined;
    }

    protected createLoginScreenNode(request: OpenPencilAiDesignRequest, page: OpenPencilPage): OpenPencilNode {
        const baseId = this.stableAiIdBase(request.prompt);
        const frameId = this.uniqueAiId(request.document, `${baseId}-mobile-login-screen`);
        const pageWidth = this.numberValue(page.width, 900);
        const pageHeight = this.numberValue(page.height, 620);
        const width = /\b(desktop|web|website|site)\b/i.test(request.prompt) ? 720 : 390;
        const height = /\b(desktop|web|website|site)\b/i.test(request.prompt) ? 520 : 844;
        const x = Math.max(40, Math.round((pageWidth - width) / 2));
        const y = Math.max(40, Math.round((pageHeight - Math.min(height, pageHeight - 80)) / 2));
        const fieldWidth = Math.min(width - 64, 320);
        const fieldX = Math.round((width - fieldWidth) / 2);
        const cardId = this.uniqueAiId(request.document, `${baseId}-login-card`);
        const title = /\b(bank|banking|banco|finance|finan[cç]as)\b/i.test(request.prompt) ? 'CyberBank secure access' : 'Sign in and keep moving';
        const subtitle = /\b(bank|banking|banco|finance|finan[cç]as)\b/i.test(request.prompt)
            ? 'Manage accounts, cards, and transfers in a protected workspace.'
            : 'A focused access flow with clear recovery and account creation paths.';
        return {
            id: frameId,
            type: 'frame',
            name: 'AI mobile banking login screen',
            role: 'screen',
            x,
            y,
            width,
            height,
            clipContent: true,
            cornerRadius: width <= 420 ? 36 : 28,
            fill: [{
                type: 'linear_gradient',
                angle: 135,
                stops: [
                    { offset: 0, color: '#06142f' },
                    { offset: 48, color: '#0f2f7f' },
                    { offset: 100, color: '#38bdf8' }
                ]
            }],
            effects: [{ type: 'shadow', offsetX: 0, offsetY: 24, blur: 50, spread: 0, color: 'rgba(15, 23, 42, 0.25)' }],
            explain: `Generated locally from Canvas AI prompt: ${request.prompt}`,
            children: [
                this.createDecorativeCircleNode(request, `${baseId}-glow-top`, width - 130, -54, 220, '#60a5fa', 0.22),
                this.createDecorativeCircleNode(request, `${baseId}-glow-bottom`, -76, height - 130, 190, '#22d3ee', 0.18),
                this.createTextNode(request, `${baseId}-brand`, 'CyberVinci Bank', 32, 48, width - 64, 24, 16, 800, '#dbeafe', 'AI brand label'),
                this.createTextNode(request, `${baseId}-title`, title, 32, 104, width - 64, 96, 34, 800, '#ffffff', 'AI login headline'),
                this.createTextNode(request, `${baseId}-subtitle`, subtitle, 32, 204, width - 64, 58, 15, 500, '#bfdbfe', 'AI login helper copy'),
                {
                    id: cardId,
                    type: 'frame',
                    name: 'Login form card',
                    role: 'card',
                    x: fieldX - 16,
                    y: Math.max(288, Math.round(height * 0.42)),
                    width: fieldWidth + 32,
                    height: 306,
                    layout: 'vertical',
                    gap: 14,
                    padding: [22, 20, 22, 20],
                    cornerRadius: 28,
                    fill: [{ type: 'solid', color: '#ffffff', opacity: 0.96 }],
                    effects: [{ type: 'shadow', offsetX: 0, offsetY: 18, blur: 34, spread: 0, color: 'rgba(2, 6, 23, 0.22)' }],
                    children: [
                        this.createTextNode(request, `${baseId}-card-title`, 'Welcome back', 0, 0, fieldWidth, 26, 20, 800, '#0f172a', 'AI card title'),
                        this.createFieldNode(request, `${baseId}-email-field`, 'Email address', fieldWidth),
                        this.createFieldNode(request, `${baseId}-password-field`, 'Password', fieldWidth, true),
                        this.createPrimaryButtonNode(request, `${baseId}-primary-button`, 'Sign in securely', fieldWidth),
                        this.createTextNode(request, `${baseId}-forgot`, 'Forgot password?', 0, 0, fieldWidth, 22, 13, 700, '#2563eb', 'AI recovery link')
                    ]
                }
            ]
        };
    }

    protected createDashboardScreenNode(request: OpenPencilAiDesignRequest, page: OpenPencilPage): OpenPencilNode {
        const baseId = this.stableAiIdBase(request.prompt);
        const frameId = this.uniqueAiId(request.document, `${baseId}-analytics-dashboard`);
        const width = Math.min(960, Math.max(720, this.numberValue(page.width, 900) - 120));
        const height = 560;
        return {
            id: frameId,
            type: 'frame',
            name: 'AI analytics dashboard screen',
            role: 'screen',
            x: 60,
            y: this.nextAiSectionY(page.children),
            width,
            height,
            cornerRadius: 28,
            fill: [{ type: 'solid', color: '#0f172a' }],
            padding: [32, 36, 32, 36],
            layout: 'vertical',
            gap: 22,
            children: [
                this.createTextNode(request, `${baseId}-dashboard-title`, 'Operational analytics cockpit', 0, 0, width - 72, 44, 34, 800, '#f8fafc', 'AI dashboard title'),
                this.createTextNode(request, `${baseId}-dashboard-subtitle`, 'KPIs, anomalies, and team actions stay visible in one command center.', 0, 0, width - 72, 30, 16, 500, '#94a3b8', 'AI dashboard subtitle'),
                this.createMetricCardNode(request, `${baseId}-metric-one`, 'Conversion', '42.8%', '#22d3ee'),
                this.createMetricCardNode(request, `${baseId}-metric-two`, 'Latency', '184ms', '#a78bfa'),
                this.createMetricCardNode(request, `${baseId}-metric-three`, 'Revenue', '+18%', '#34d399')
            ]
        };
    }

    protected createAppScreenNode(request: OpenPencilAiDesignRequest, page: OpenPencilPage): OpenPencilNode {
        const baseId = this.stableAiIdBase(request.prompt);
        const frameId = this.uniqueAiId(request.document, `${baseId}-mobile-app-screen`);
        return {
            id: frameId,
            type: 'frame',
            name: 'AI mobile app screen',
            role: 'screen',
            x: Math.max(40, Math.round((this.numberValue(page.width, 900) - 390) / 2)),
            y: this.nextAiSectionY(page.children),
            width: 390,
            height: 760,
            cornerRadius: 36,
            fill: [{ type: 'solid', color: '#f8fafc' }],
            padding: [32, 28, 32, 28],
            layout: 'vertical',
            gap: 18,
            children: [
                this.createTextNode(request, `${baseId}-app-title`, this.promptGeneratedHeadline(request.prompt), 0, 0, 334, 86, 32, 800, '#0f172a', 'AI app headline'),
                this.createTextNode(request, `${baseId}-app-copy`, this.promptGeneratedBodyCopy(request.prompt), 0, 0, 334, 54, 16, 500, '#475569', 'AI app supporting copy'),
                this.createPrimaryButtonNode(request, `${baseId}-app-button`, this.promptCtaLabel(request.prompt), 240)
            ]
        };
    }

    protected createTextNode(request: OpenPencilAiDesignRequest, idBase: string, content: string, x: number, y: number, width: number, height: number, fontSize: number, fontWeight: number, color: string, name: string): OpenPencilNode {
        return {
            id: this.uniqueAiId(request.document, idBase),
            type: 'text',
            name,
            x,
            y,
            width,
            height,
            content,
            fontSize,
            fontWeight,
            lineHeight: 1.2,
            textGrowth: 'fixed-width',
            fill: [{ type: 'solid', color }]
        };
    }

    protected createFieldNode(request: OpenPencilAiDesignRequest, idBase: string, label: string, width: number, secure = false): OpenPencilNode {
        return {
            id: this.uniqueAiId(request.document, idBase),
            type: 'frame',
            name: `${label} input`,
            role: 'input',
            width,
            height: 56,
            cornerRadius: 16,
            fill: [{ type: 'solid', color: '#f8fafc' }],
            stroke: { color: '#dbeafe', width: 1 },
            padding: [10, 16, 10, 16],
            layout: 'vertical',
            justifyContent: 'center',
            children: [this.createTextNode(request, `${idBase}-label`, secure ? '••••••••' : label, 0, 0, width - 32, 22, 14, 600, secure ? '#64748b' : '#334155', `${label} placeholder`)]
        };
    }

    protected createPrimaryButtonNode(request: OpenPencilAiDesignRequest, idBase: string, label: string, width: number): OpenPencilNode {
        return {
            id: this.uniqueAiId(request.document, idBase),
            type: 'frame',
            name: 'Primary action button',
            role: 'button',
            width,
            height: 54,
            layout: 'horizontal',
            justifyContent: 'center',
            alignItems: 'center',
            cornerRadius: 18,
            fill: [{ type: 'solid', color: '#2563eb' }],
            effects: [{ type: 'shadow', offsetX: 0, offsetY: 10, blur: 20, spread: 0, color: 'rgba(37, 99, 235, 0.28)' }],
            children: [this.createTextNode(request, `${idBase}-label`, label, 0, 0, width - 32, 22, 15, 800, '#ffffff', 'Primary action label')]
        };
    }

    protected createMetricCardNode(request: OpenPencilAiDesignRequest, idBase: string, label: string, value: string, accent: string): OpenPencilNode {
        return {
            id: this.uniqueAiId(request.document, idBase),
            type: 'frame',
            name: `${label} metric card`,
            role: 'card',
            width: 240,
            height: 120,
            cornerRadius: 22,
            fill: [{ type: 'solid', color: '#1e293b' }],
            padding: [18, 20, 18, 20],
            layout: 'vertical',
            gap: 8,
            children: [
                this.createTextNode(request, `${idBase}-label`, label, 0, 0, 200, 22, 14, 700, '#94a3b8', `${label} label`),
                this.createTextNode(request, `${idBase}-value`, value, 0, 0, 200, 44, 34, 800, accent, `${label} value`)
            ]
        };
    }

    protected createDecorativeCircleNode(request: OpenPencilAiDesignRequest, idBase: string, x: number, y: number, size: number, color: string, opacity: number): OpenPencilNode {
        return {
            id: this.uniqueAiId(request.document, idBase),
            type: 'ellipse',
            name: 'AI ambient glow',
            x,
            y,
            width: size,
            height: size,
            opacity,
            fill: [{ type: 'solid', color }],
            effects: [{ type: 'blur', radius: 28 }]
        };
    }

    protected nextAiSectionY(nodes: OpenPencilNode[]): number {
        const allNodes = this.flattenNodeList(nodes);
        const bottom = allNodes.reduce((current, node) => Math.max(current, this.numberValue(node.y, 0) + this.numberValue(node.height, 0)), 0);
        return Math.max(80, bottom + 48);
    }

    protected flattenNodeList(nodes: OpenPencilNode[]): OpenPencilNode[] {
        return nodes.flatMap(node => [node, ...this.flattenNodeList(node.children ?? [])]);
    }

    protected promptHeadline(prompt: string): string {
        const cleaned = this.cleanPromptText(prompt);
        return this.truncateAtWord(cleaned || 'AI generated OpenPencil section', 72);
    }

    protected promptBodyCopy(prompt: string): string {
        const cleaned = this.cleanPromptText(prompt);
        if (cleaned.length > 96) {
            return this.truncateAtWord(cleaned, 150);
        }
        return `Structured from document context and selection: ${cleaned || 'new design direction'}.`;
    }

    protected promptGeneratedHeadline(prompt: string): string {
        const lower = prompt.toLowerCase();
        if (/\b(analytics|metric|metrics|dashboard|data|dados|kpi)\b/i.test(lower)) {
            return 'Analytics that teams can act on';
        }
        if (/\b(game|games|jogo|jogos|play|arcade)\b/i.test(lower)) {
            return 'Play smarter in one tap';
        }
        if (/\b(login|signin|sign in|entrar|acesso|auth)\b/i.test(lower)) {
            return 'Sign in and keep moving';
        }
        if (/\b(landing|marketing|homepage|website|site|page|pagina|página)\b/i.test(lower)) {
            return 'A clearer product story';
        }
        return 'A polished design direction';
    }

    protected promptGeneratedBodyCopy(prompt: string): string {
        const lower = prompt.toLowerCase();
        if (/\b(analytics|metric|metrics|dashboard|data|dados|kpi)\b/i.test(lower)) {
            return 'Metrics, alerts, and decisions stay aligned.';
        }
        if (/\b(game|games|jogo|jogos|play|arcade)\b/i.test(lower)) {
            return 'Rewards, quests, and ranking feel close at hand.';
        }
        if (/\b(login|signin|sign in|entrar|acesso|auth)\b/i.test(lower)) {
            return 'A focused access flow with clear recovery paths.';
        }
        if (/\b(mobile|celular|phone|android|ios|app)\b/i.test(lower)) {
            return 'Responsive screens keep the main action visible.';
        }
        return 'Structured from intent, not copied from the prompt.';
    }

    protected promptCtaLabel(prompt: string): string {
        const lower = prompt.toLowerCase();
        if (lower.includes('learn') || lower.includes('saiba')) {
            return 'Learn more';
        }
        if (lower.includes('start') || lower.includes('comece')) {
            return 'Get started';
        }
        if (lower.includes('contact') || lower.includes('contato')) {
            return 'Contact us';
        }
        return 'Explore';
    }

    protected cleanPromptText(prompt: string): string {
        return prompt.replace(/\s+/g, ' ').trim();
    }

    protected truncateAtWord(value: string, maxLength: number): string {
        if (value.length <= maxLength) {
            return value;
        }
        const truncated = value.slice(0, maxLength - 1);
        const lastSpace = truncated.lastIndexOf(' ');
        return `${truncated.slice(0, lastSpace > 32 ? lastSpace : truncated.length).trim()}...`;
    }

    protected resolvePromptAccentColor(prompt: string): string | undefined {
        const explicit = /#[0-9a-f]{3}(?:[0-9a-f]{3})?\b/i.exec(prompt)?.[0];
        if (explicit) {
            return explicit;
        }
        return this.resolveKnownColorFromText(prompt);
    }

    protected resolveCreatedShapeColor(prompt: string): string | undefined {
        const source = prompt.split(/\b(?:inside|within|dentro|no|na)\b/i)[0] || prompt;
        return this.resolveKnownColorFromText(source) ?? this.resolvePromptAccentColor(prompt);
    }

    protected resolveContainerColorHint(prompt: string): string | undefined {
        const parts = prompt.split(/\b(?:inside|within|dentro|no|na)\b/i);
        const source = parts.length > 1 ? parts.slice(1).join(' ') : '';
        return source ? this.resolveKnownColorFromText(source) : undefined;
    }

    protected resolveKnownColorFromText(text: string): string | undefined {
        const lower = text.toLowerCase();
        const colors: Array<[string[], string]> = [
            [['red', 'vermelho', 'danger'], '#dc2626'],
            [['green', 'verde', 'success'], '#16a34a'],
            [['blue', 'azul'], '#2563eb'],
            [['teal', 'cyan'], '#0891b2'],
            [['yellow', 'amarelo', 'warning'], '#ca8a04'],
            [['dark', 'escuro'], '#0f172a']
        ];
        return colors
            .flatMap(([keywords, color]) => keywords.map(keyword => ({ color, index: lower.indexOf(keyword) })).filter(match => match.index >= 0))
            .sort((left, right) => left.index - right.index)[0]?.color;
    }

    protected stableAiIdBase(prompt: string): string {
        let hash = 0;
        for (const character of prompt) {
            hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
        }
        return `ai-${Math.abs(hash).toString(36) || '0'}`;
    }

    protected uniqueAiId(document: OpenPencilDocument, base: string): string {
        const used = new Set(this.documents.flattenNodes(document).map(node => node.id));
        let candidate = base;
        let index = 2;
        while (used.has(candidate)) {
            candidate = `${base}-${index++}`;
        }
        used.add(candidate);
        return candidate;
    }

    protected isDesignOperationLike(value: unknown): value is OpenPencilDesignOperation {
        if (!this.isRecord(value) || typeof value.operation !== 'string') {
            return false;
        }
        switch (value.operation) {
            case 'addNode':
            case 'createNode':
                return this.isRecord(value.node) && (value.node.type === undefined || typeof value.node.type === 'string');
            case 'updateNode':
                return typeof value.nodeId === 'string' && this.isRecord(value.changes);
            case 'removeNode':
            case 'deleteNode':
            case 'duplicateNode':
            case 'ungroupNode':
            case 'bringForward':
            case 'sendBackward':
            case 'bringToFront':
            case 'sendToBack':
                return typeof value.nodeId === 'string';
            case 'reorderNode':
                return typeof value.nodeId === 'string' && typeof value.index === 'number';
            case 'replaceNode':
                return typeof value.nodeId === 'string' && this.isRecord(value.node);
            case 'moveNode':
                return typeof value.nodeId === 'string' && typeof value.x === 'number' && typeof value.y === 'number';
            case 'resizeNode':
                return typeof value.nodeId === 'string'
                    && (value.x === undefined || typeof value.x === 'number')
                    && (value.y === undefined || typeof value.y === 'number')
                    && typeof value.width === 'number'
                    && typeof value.height === 'number';
            case 'moveToParent':
                return typeof value.nodeId === 'string'
                    && (value.parentId === undefined || value.parentId === null || typeof value.parentId === 'string')
                    && (value.index === undefined || typeof value.index === 'number');
            case 'nudgeNodes':
                return Array.isArray(value.nodeIds)
                    && value.nodeIds.every(id => typeof id === 'string')
                    && typeof value.dx === 'number'
                    && typeof value.dy === 'number';
            case 'alignNodes':
                return Array.isArray(value.nodeIds)
                    && value.nodeIds.every(id => typeof id === 'string')
                    && (value.alignment === 'left'
                        || value.alignment === 'center'
                        || value.alignment === 'right'
                        || value.alignment === 'top'
                        || value.alignment === 'middle'
                        || value.alignment === 'bottom');
            case 'distributeNodes':
                return Array.isArray(value.nodeIds)
                    && value.nodeIds.every(id => typeof id === 'string')
                    && (value.direction === 'horizontal' || value.direction === 'vertical');
            case 'groupNodes':
                return Array.isArray(value.nodeIds) && value.nodeIds.every(id => typeof id === 'string');
            case 'booleanNodes':
                return Array.isArray(value.nodeIds)
                    && value.nodeIds.every(id => typeof id === 'string')
                    && (value.booleanOperation === 'union'
                        || value.booleanOperation === 'subtract'
                        || value.booleanOperation === 'intersect'
                        || value.booleanOperation === 'exclude');
            case 'convertToPath':
                return Array.isArray(value.nodeIds) && value.nodeIds.every(id => typeof id === 'string');
            case 'updatePathAnchors':
                return typeof value.nodeId === 'string'
                    && Array.isArray(value.anchors)
                    && value.anchors.every(anchor => this.isPathAnchorLike(anchor))
                    && (value.closed === undefined || typeof value.closed === 'boolean');
            case 'updatePathAnchor':
                return typeof value.nodeId === 'string'
                    && typeof value.anchorIndex === 'number'
                    && this.isPathAnchorLike(value.anchor)
                    && (value.closed === undefined || typeof value.closed === 'boolean');
            case 'updatePathHandle':
                return typeof value.nodeId === 'string'
                    && typeof value.anchorIndex === 'number'
                    && (value.handle === 'in' || value.handle === 'out')
                    && (value.value === null || this.isPathHandleLike(value.value))
                    && (value.mirror === undefined || typeof value.mirror === 'boolean')
                    && (value.closed === undefined || typeof value.closed === 'boolean');
            case 'insertPathAnchor':
                return typeof value.nodeId === 'string'
                    && typeof value.anchorIndex === 'number'
                    && this.isPathAnchorLike(value.anchor);
            case 'removePathAnchor':
                return typeof value.nodeId === 'string' && typeof value.anchorIndex === 'number';
            case 'addPage':
                return value.page === undefined || this.isRecord(value.page);
            case 'updatePage':
                return typeof value.pageId === 'string' && this.isRecord(value.changes);
            case 'removePage':
            case 'setActivePage':
                return typeof value.pageId === 'string';
            case 'setVariable':
                return typeof value.name === 'string' && this.isRecord(value.variable) && 'value' in value.variable;
            case 'updateVariable':
                return typeof value.name === 'string' && this.isRecord(value.changes);
            case 'removeVariable':
                return typeof value.name === 'string';
            case 'setThemes':
                return this.isStringArrayRecord(value.themes);
            case 'updateThemeAxis':
                return typeof value.axis === 'string'
                    && Array.isArray(value.values)
                    && value.values.every(item => typeof item === 'string');
            case 'removeThemeAxis':
                return typeof value.axis === 'string';
            case 'setNodeTheme':
                return typeof value.nodeId === 'string' && this.isStringRecord(value.theme);
            case 'clearNodeTheme':
                return typeof value.nodeId === 'string'
                    && (value.axes === undefined || (Array.isArray(value.axes) && value.axes.every(item => typeof item === 'string')));
            case 'setNodeLayout':
                return typeof value.nodeId === 'string' && this.isRecord(value.layout);
            case 'autoLayoutNode':
                return typeof value.nodeId === 'string'
                    && (value.direction === undefined || value.direction === 'vertical' || value.direction === 'horizontal');
            case 'setSelection':
                return Array.isArray(value.nodeIds) && value.nodeIds.every(id => typeof id === 'string');
            default:
                return false;
        }
    }

    protected isStringRecord(value: unknown): value is Record<string, string> {
        return this.isRecord(value) && Object.values(value).every(item => typeof item === 'string');
    }

    protected isStringArrayRecord(value: unknown): value is Record<string, string[]> {
        return this.isRecord(value)
            && Object.values(value).every(item => Array.isArray(item) && item.every(entry => typeof entry === 'string'));
    }

    protected isPathAnchorLike(value: unknown): value is OpenPencilPathAnchor {
        if (!this.isRecord(value) || typeof value.x !== 'number' || typeof value.y !== 'number') {
            return false;
        }
        return (value.handleIn === undefined || value.handleIn === null || this.isPathHandleLike(value.handleIn))
            && (value.handleOut === undefined || value.handleOut === null || this.isPathHandleLike(value.handleOut));
    }

    protected isPathHandleLike(value: unknown): value is OpenPencilPathHandle {
        return this.isRecord(value) && typeof value.x === 'number' && typeof value.y === 'number';
    }

    importDocument(source: string, name = 'Imported OpenPencil Design'): OpenPencilDocument {
        const trimmed = source.trim();
        if (!trimmed) {
            return this.createDesign(name);
        }
        const embeddedJson = this.extractEmbeddedOpenPencilJson(trimmed);
        if (embeddedJson) {
            return this.documents.deserialize(embeddedJson);
        }
        if (trimmed.startsWith('{')) {
            return this.documents.deserialize(trimmed);
        }
        if (trimmed.startsWith('[')) {
            const nodes = JSON.parse(trimmed) as unknown;
            if (!Array.isArray(nodes)) {
                throw new Error('OpenPencil node-array import must be a JSON array.');
            }
            return this.documents.normalize({
                ...this.createDesign(name),
                name,
                children: nodes as OpenPencilNode[],
                pages: [{
                    ...this.documents.createPage('Page 1'),
                    children: nodes as OpenPencilNode[]
                }]
            });
        }
        if (/^<svg[\s>]/i.test(trimmed) || (/^<\?xml\b/i.test(trimmed) && /<svg[\s>]/i.test(trimmed))) {
            return this.importSvgDocument(trimmed, name);
        }
        return this.importHtmlDocument(trimmed, name);
    }

    exportDocument(document: OpenPencilDocument, selection: string[], format: OpenPencilExportFormat, selectionOnly = false): string {
        const page = this.documents.getActivePage(document);
        if (format === 'openpencil-json') {
            return this.documents.serialize(this.createExportDocument(document, page.children, selection, selectionOnly));
        }
        if (format === 'openpencil-summary-json') {
            return `${JSON.stringify(this.getDocumentSummary(this.createExportDocument(document, page.children, selection, selectionOnly)), undefined, 2)}\n`;
        }
        const activeTheme = this.documents.getDefaultTheme(document.themes);
        const nodes = selectionOnly && selection.length
            ? this.collectSelectedNodes(page.children, selection)
            : page.children;
        const resolvedNodes = nodes.map(node => this.documents.resolveNodeVariables(node, document.variables, activeTheme));
        const resolvedPage = {
            ...page,
            background: this.documents.resolveColorReference(page.background, document.variables, activeTheme) ?? page.background
        };
        if (format === 'react-tailwind') {
            return this.exportReact(resolvedNodes, resolvedPage);
        }
        if (format === 'svg') {
            return this.exportSvg(resolvedNodes, resolvedPage);
        }
        if (format === 'vue') {
            return this.exportVue(resolvedNodes, resolvedPage);
        }
        if (format === 'svelte') {
            return this.exportSvelte(resolvedNodes, resolvedPage);
        }
        if (format === 'react-native') {
            return this.exportReactNative(resolvedNodes, resolvedPage);
        }
        if (format === 'flutter') {
            return this.exportFlutter(resolvedNodes, resolvedPage);
        }
        if (format === 'swiftui') {
            return this.exportSwiftUI(resolvedNodes, resolvedPage);
        }
        if (format === 'jetpack-compose') {
            return this.exportJetpackCompose(resolvedNodes, resolvedPage);
        }
        return this.exportHtml(resolvedNodes, resolvedPage);
    }

    protected createExportDocument(document: OpenPencilDocument, nodes: OpenPencilNode[], selection: string[], selectionOnly: boolean): OpenPencilDocument {
        const cloned = this.documents.cloneDocument(document);
        if (!selectionOnly || !selection.length) {
            return cloned;
        }
        const activePage = this.documents.getActivePage(cloned);
        activePage.children = this.collectSelectedNodes(nodes, selection);
        cloned.children = activePage.children;
        return cloned;
    }

    protected extractEmbeddedOpenPencilJson(source: string): string | undefined {
        const match = source.match(/<script\b[^>]*type=["']application\/openpencil\+json["'][^>]*>([\s\S]*?)<\/script>/i);
        return match ? this.decodeHtml(match[1].trim()) : undefined;
    }

    protected stripDslComment(line: string): string {
        let quote: '"' | "'" | undefined;
        let escaped = false;
        for (let index = 0; index < line.length; index++) {
            const character = line[index];
            if (escaped) {
                escaped = false;
                continue;
            }
            if (quote) {
                if (character === '\\') {
                    escaped = true;
                } else if (character === quote) {
                    quote = undefined;
                }
                continue;
            }
            if (character === '"' || character === "'") {
                quote = character;
                continue;
            }
            if (character === '#') {
                return line.slice(0, index);
            }
            if (character === '/' && line[index + 1] === '/') {
                return line.slice(0, index);
            }
        }
        return line;
    }

    protected splitDslArguments(source: string, line: number): string[] {
        const args: string[] = [];
        let depth = 0;
        let quote: '"' | "'" | undefined;
        let escaped = false;
        let start = 0;
        for (let index = 0; index < source.length; index++) {
            const character = source[index];
            if (escaped) {
                escaped = false;
                continue;
            }
            if (quote) {
                if (character === '\\') {
                    escaped = true;
                } else if (character === quote) {
                    quote = undefined;
                }
                continue;
            }
            if (character === '"' || character === "'") {
                quote = character;
                continue;
            }
            if (character === '{' || character === '[' || character === '(') {
                depth++;
                continue;
            }
            if (character === '}' || character === ']' || character === ')') {
                depth--;
                if (depth < 0) {
                    throw new OpenPencilBatchDesignDslError('Unexpected closing delimiter.', line);
                }
                continue;
            }
            if (character === ',' && depth === 0) {
                args.push(source.slice(start, index).trim());
                start = index + 1;
            }
        }
        if (quote) {
            throw new OpenPencilBatchDesignDslError('Unterminated string literal.', line);
        }
        if (depth !== 0) {
            throw new OpenPencilBatchDesignDslError('Unbalanced object or array literal.', line);
        }
        const tail = source.slice(start).trim();
        if (tail || source.trim()) {
            args.push(tail);
        }
        return args;
    }

    protected expectDslArgCount(command: string, args: string[], min: number, max: number, line: number): void {
        if (args.length < min || args.length > max || args.some(arg => !arg)) {
            const expected = min === max ? `${min}` : `${min}-${max}`;
            throw new OpenPencilBatchDesignDslError(`${command} expects ${expected} argument(s).`, line);
        }
    }

    protected parseDslParentReference(value: string, line: number): string | null {
        const reference = this.parseDslReference(value, line);
        if (reference === null || reference === 'root' || reference === 'page') {
            return null;
        }
        return reference;
    }

    protected parseDslNodeReference(value: string, line: number): string {
        const reference = this.parseDslReference(value, line);
        if (reference === null) {
            throw new OpenPencilBatchDesignDslError('Expected a node id or binding name.', line);
        }
        return reference;
    }

    protected parseDslReference(value: string, line: number): string | null {
        const trimmed = value.trim();
        if (trimmed === 'null' || trimmed === 'undefined' || trimmed === '') {
            return null;
        }
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            const parsed = this.parseDslLiteral(trimmed, line);
            if (typeof parsed !== 'string') {
                throw new OpenPencilBatchDesignDslError('Expected a string reference.', line);
            }
            return parsed;
        }
        if (!/^[A-Za-z0-9_.:-]+$/.test(trimmed)) {
            throw new OpenPencilBatchDesignDslError(`Invalid reference '${trimmed}'.`, line);
        }
        return trimmed;
    }

    protected parseDslIndex(value: string, line: number): number {
        const parsed = Number(value.trim());
        if (!Number.isInteger(parsed) || parsed < 0) {
            throw new OpenPencilBatchDesignDslError('Expected a non-negative integer index.', line);
        }
        return parsed;
    }

    protected parseDslObject(value: string, line: number): Record<string, unknown> {
        const parsed = this.parseDslLiteral(value, line);
        if (!this.isRecord(parsed)) {
            throw new OpenPencilBatchDesignDslError('Expected an object literal.', line);
        }
        return parsed;
    }

    protected parseDslLiteral(value: string, line: number): unknown {
        const trimmed = value.trim();
        try {
            return JSON.parse(trimmed);
        } catch {
            try {
                return JSON.parse(this.normalizeDslObjectLiteral(trimmed));
            } catch (error) {
                const reason = error instanceof Error ? error.message : 'Invalid literal.';
                throw new OpenPencilBatchDesignDslError(`Invalid object literal: ${reason}`, line);
            }
        }
    }

    protected normalizeDslObjectLiteral(value: string): string {
        let normalized = value.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_match, content: string) => JSON.stringify(content.replace(/\\'/g, "'")));
        normalized = normalized.replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$-]*)\s*:/g, '$1"$2":');
        normalized = normalized.replace(/,\s*([}\]])/g, '$1');
        return normalized;
    }

    protected sanitizeDslChanges(value: Record<string, unknown>): OpenPencilNodeChanges {
        const changes = { ...value };
        delete changes.id;
        delete changes.type;
        return changes as OpenPencilNodeChanges;
    }

    protected prepareDslNode(value: Partial<OpenPencilNode>, line: number): OpenPencilNode {
        const type = typeof value.type === 'string' ? value.type : 'rectangle';
        const id = typeof value.id === 'string' && value.id ? value.id : this.documents.generateId(type);
        return {
            ...value,
            id,
            type
        } as OpenPencilNode;
    }

    protected resolveDslNodeReference(reference: string, bindings: Map<string, string>): string {
        return bindings.get(reference) ?? reference;
    }

    protected resolveDslParentReference(reference: string | null, bindings: Map<string, string>): string | null {
        return reference === null ? null : bindings.get(reference) ?? reference;
    }

    protected resolveDslParentChildren(nodes: OpenPencilNode[], reference: string | null, bindings: Map<string, string>, line: number): OpenPencilNode[] {
        const parentId = this.resolveDslParentReference(reference, bindings);
        if (!parentId) {
            return nodes;
        }
        const parent = this.findLocation(nodes, parentId)?.node;
        if (!parent) {
            throw new OpenPencilBatchDesignDslError(`Parent node '${parentId}' was not found.`, line);
        }
        parent.children = parent.children ?? [];
        return parent.children;
    }

    protected unchanged(document: OpenPencilDocument, selection: string[], message: string): OpenPencilCommandResult {
        return {
            document,
            selection,
            changed: false,
            message
        };
    }

    protected prepareStructuredNode(document: OpenPencilDocument, value: Partial<OpenPencilNode>, preserveId?: string): OpenPencilNode {
        const type = this.normalizeStructuredNodeType(value.type);
        const node = {
            ...value,
            id: typeof value.id === 'string' && value.id ? value.id : preserveId ?? this.documents.generateId(type),
            type,
            ...(Array.isArray(value.children) ? { children: value.children.map(child => this.prepareStructuredNode(document, child)) } : {})
        } as OpenPencilNode;
        this.materializeStructuredNode(node);
        this.ensureUniqueNodeIds(document, node, preserveId ? new Set([preserveId]) : undefined);
        return node;
    }

    protected prepareStructuredPageChildren(document: OpenPencilDocument, children: OpenPencilNode[] | undefined, targetPage?: OpenPencilPage): OpenPencilNode[] {
        if (!Array.isArray(children) || !children.length) {
            return [];
        }
        const originalChildren = targetPage?.children;
        if (targetPage) {
            targetPage.children = [];
        }
        try {
            const prepared: OpenPencilNode[] = [];
            for (const child of children) {
                const node = this.prepareStructuredNode(document, child);
                prepared.push(node);
                if (targetPage) {
                    targetPage.children = prepared;
                }
            }
            return prepared;
        } finally {
            if (targetPage) {
                targetPage.children = originalChildren ?? [];
            }
        }
    }

    protected normalizeStructuredNodeType(value: unknown): OpenPencilNodeType {
        if (typeof value !== 'string') {
            return 'rectangle';
        }
        const key = value.trim().replace(/[-\s]/g, '_').toLowerCase();
        return OPENPENCIL_STRUCTURED_NODE_TYPE_ALIASES[key] ?? 'rectangle';
    }

    protected materializeStructuredNode(node: OpenPencilNode, inheritedTextFill = '#1d1d1f'): void {
        node.x = this.numberValue(node.x, 0);
        node.y = this.numberValue(node.y, 0);
        this.sanitizeStructuredPaint(node);
        node.padding = this.normalizeStructuredPaddingValue(node.padding);
        const record = node as Record<string, unknown>;
        if (node.cornerRadius === undefined && typeof record.borderRadius === 'number') {
            node.cornerRadius = record.borderRadius;
        }
        if (node.type !== 'text' && node.fill === undefined) {
            const backgroundColor = typeof record.backgroundColor === 'string'
                ? this.normalizeColorValue(record.backgroundColor)
                : typeof record.background === 'string'
                    ? this.normalizeColorValue(record.background)
                    : undefined;
            if (backgroundColor) {
                node.fill = [{ type: 'solid', color: backgroundColor }];
            }
        }
        if (node.type === 'text' && !node.fill?.length) {
            node.fill = [{ type: 'solid', color: inheritedTextFill }];
        }
        if (!node.children?.length) {
            return;
        }
        const childTextFill = this.readableStructuredTextFill(node, inheritedTextFill);
        node.children.forEach(child => this.materializeStructuredNode(child, childTextFill));
        if (node.layout === 'vertical' || node.layout === 'horizontal') {
            node.children = openPencilRuntimeTreeMutations.computeLayoutChildren(node);
        }
    }

    protected normalizeStructuredPaddingValue(value: OpenPencilNode['padding']): OpenPencilNode['padding'] {
        if (this.isRecord(value)) {
            return [
                this.numberValue(value.top as number | string | undefined, 0),
                this.numberValue(value.right as number | string | undefined, 0),
                this.numberValue(value.bottom as number | string | undefined, 0),
                this.numberValue(value.left as number | string | undefined, 0)
            ];
        }
        return value;
    }

    protected readableStructuredTextFill(node: OpenPencilNode, fallback: string): string {
        const background = node.fill?.find(fill => fill.type === 'solid' && typeof fill.color === 'string')?.color;
        if (!background || background === 'transparent') {
            return fallback;
        }
        const rgb = this.hexToRgb(background);
        if (!rgb) {
            return fallback;
        }
        const [red, green, blue] = rgb.map(channel => {
            const normalized = channel / 255;
            return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
        });
        const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
        return luminance < 0.42 ? '#ffffff' : '#1d1d1f';
    }

    protected fitRootNodeToPage(node: OpenPencilNode, page: OpenPencilPage): void {
        const pageWidth = Math.max(120, this.numberValue(page.width, 900));
        const pageHeight = Math.max(120, this.numberValue(page.height, 620));
        const margin = Math.min(40, Math.floor(Math.min(pageWidth, pageHeight) / 8));
        const maxWidth = Math.max(80, pageWidth - margin * 2);
        const maxHeight = Math.max(80, pageHeight - margin * 2);
        const fallbackWidth = this.isTextLikeNode(node) ? 160 : 120;
        const fallbackHeight = this.isTextLikeNode(node) ? 40 : 120;
        const originalWidth = this.numberValue(node.width, fallbackWidth);
        const originalHeight = this.numberValue(node.height, fallbackHeight);
        const scale = Math.min(1, maxWidth / Math.max(originalWidth, 1), maxHeight / Math.max(originalHeight, 1));
        if (scale < 1) {
            this.scaleStructuredNode(node, scale);
        }
        const width = this.numberValue(node.width, fallbackWidth);
        const height = this.numberValue(node.height, fallbackHeight);
        node.x = Math.max(0, Math.min(this.numberValue(node.x, margin), pageWidth - width));
        node.y = Math.max(0, Math.min(this.numberValue(node.y, margin), pageHeight - height));
    }

    protected scaleStructuredNode(node: OpenPencilNode, scale: number): void {
        node.x = this.roundScaledValue(this.numberValue(node.x, 0) * scale);
        node.y = this.roundScaledValue(this.numberValue(node.y, 0) * scale);
        node.width = this.scaleNumberish(node.width, scale) as OpenPencilNode['width'];
        node.height = this.scaleNumberish(node.height, scale) as OpenPencilNode['height'];
        node.gap = this.scaleNumberish(node.gap, scale) as OpenPencilNode['gap'];
        node.padding = Array.isArray(node.padding)
            ? node.padding.map(value => this.roundScaledValue(this.numberValue(value, 0) * scale)) as OpenPencilNode['padding']
            : this.scaleNumberish(node.padding, scale) as OpenPencilNode['padding'];
        if (Array.isArray(node.cornerRadius)) {
            node.cornerRadius = node.cornerRadius.map(value => this.roundScaledValue(value * scale)) as OpenPencilNode['cornerRadius'];
        } else if (typeof node.cornerRadius === 'number') {
            node.cornerRadius = this.roundScaledValue(node.cornerRadius * scale);
        }
        if (typeof node.fontSize === 'number') {
            node.fontSize = this.roundScaledValue(node.fontSize * scale);
        }
        if (typeof node.lineHeight === 'number') {
            node.lineHeight = this.roundScaledValue(node.lineHeight * scale);
        }
        if (typeof node.letterSpacing === 'number') {
            node.letterSpacing = this.roundScaledValue(node.letterSpacing * scale);
        }
        if (typeof node.x2 === 'number') {
            node.x2 = this.roundScaledValue(node.x2 * scale);
        }
        if (typeof node.y2 === 'number') {
            node.y2 = this.roundScaledValue(node.y2 * scale);
        }
        if (node.points) {
            node.points = node.points.map(point => ({
                x: this.roundScaledValue(point.x * scale),
                y: this.roundScaledValue(point.y * scale)
            }));
        }
        if (node.anchors) {
            node.anchors = node.anchors.map(anchor => ({
                ...anchor,
                x: this.roundScaledValue(anchor.x * scale),
                y: this.roundScaledValue(anchor.y * scale)
            }));
        }
        if (node.stroke) {
            const stroke = { ...node.stroke } as Record<string, unknown>;
            stroke.width = this.scaleNumberish(stroke.width, scale);
            stroke.thickness = this.scaleNumberish(stroke.thickness, scale);
            node.stroke = stroke as OpenPencilNode['stroke'];
        }
        node.children?.forEach(child => this.scaleStructuredNode(child, scale));
    }

    protected sanitizeStructuredPaint(node: OpenPencilNode): void {
        const record = node as Record<string, unknown>;
        const fill = record.fill;
        if (typeof fill === 'string') {
            const color = this.normalizeColorValue(fill);
            if (color) {
                node.fill = [{ type: 'solid', color }];
            } else {
                delete record.fill;
            }
        } else if (Array.isArray(fill)) {
            node.fill = fill
                .map(item => this.sanitizeStructuredFill(item))
                .filter((item): item is NonNullable<OpenPencilNode['fill']>[number] => !!item);
            if (!node.fill.length) {
                delete record.fill;
            }
        } else if (fill !== undefined) {
            delete record.fill;
        }
        const stroke = record.stroke;
        if (typeof stroke === 'string') {
            const color = this.normalizeColorValue(stroke);
            if (color) {
                node.stroke = { color, width: 1, thickness: 1 };
            } else {
                delete record.stroke;
            }
        } else if (this.isRecord(stroke)) {
            const color = typeof stroke.color === 'string' ? this.normalizeColorValue(stroke.color) : undefined;
            const width = stroke.width !== undefined ? this.numberValue(stroke.width as number | string | undefined, 1) : undefined;
            const thickness = Array.isArray(stroke.thickness) && stroke.thickness.length === 4 && stroke.thickness.every(value => typeof value === 'number')
                ? stroke.thickness as [number, number, number, number]
                : stroke.thickness !== undefined
                    ? this.numberValue(stroke.thickness as number | string | undefined, width ?? 1)
                    : width;
            const fill = Array.isArray(stroke.fill)
                ? stroke.fill.map(item => this.sanitizeStructuredFill(item)).filter((item): item is NonNullable<OpenPencilNode['fill']>[number] => !!item)
                : undefined;
            const normalizedStroke: NonNullable<OpenPencilNode['stroke']> = {
                ...(color ? { color } : {}),
                ...(width !== undefined ? { width } : {}),
                ...(thickness !== undefined ? { thickness } : {}),
                ...(typeof stroke.opacity === 'number' ? { opacity: stroke.opacity } : {}),
                ...(stroke.align === 'inside' || stroke.align === 'center' || stroke.align === 'outside' ? { align: stroke.align } : {}),
                ...(stroke.join === 'miter' || stroke.join === 'bevel' || stroke.join === 'round' ? { join: stroke.join } : {}),
                ...(stroke.cap === 'none' || stroke.cap === 'round' || stroke.cap === 'square' ? { cap: stroke.cap } : {}),
                ...(Array.isArray(stroke.dashPattern) ? { dashPattern: stroke.dashPattern } : {}),
                ...(typeof stroke.dashOffset === 'number' ? { dashOffset: stroke.dashOffset } : {}),
                ...(fill?.length ? { fill } : {})
            };
            if (!normalizedStroke.color && !normalizedStroke.fill?.length) {
                delete record.stroke;
            } else {
                node.stroke = normalizedStroke;
            }
        } else if (stroke !== undefined) {
            delete record.stroke;
        }
    }

    protected sanitizeStructuredFill(value: unknown): NonNullable<OpenPencilNode['fill']>[number] | undefined {
        if (typeof value === 'string') {
            const color = this.normalizeColorValue(value);
            return color ? { type: 'solid', color } : undefined;
        }
        if (!this.isRecord(value)) {
            return undefined;
        }
        const color = typeof value.color === 'string' ? this.normalizeColorValue(value.color) : undefined;
        if (value.type === 'solid' || value.type === 'color' || color) {
            return {
                ...value,
                type: 'solid',
                color: color ?? '#000000'
            } as NonNullable<OpenPencilNode['fill']>[number];
        }
        if (value.type === 'gradient' || value.type === 'linear_gradient' || value.type === 'radial_gradient' || value.type === 'image') {
            return value as NonNullable<OpenPencilNode['fill']>[number];
        }
        return undefined;
    }

    protected isColorValue(value: string): boolean {
        return !!this.normalizeColorValue(value);
    }

    protected normalizeColorValue(value: string): string | undefined {
        const trimmed = value.trim();
        if (!trimmed || trimmed.toLowerCase() === 'none') {
            return undefined;
        }
        if (trimmed === 'transparent'
            || /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)
            || /^rgba?\(/i.test(trimmed)
            || /^hsla?\(/i.test(trimmed)) {
            return trimmed;
        }
        return OPENPENCIL_CSS_COLOR_KEYWORDS[trimmed.toLowerCase().replace(/\s+/g, '')];
    }

    protected hasVisibleAiPageContent(document: OpenPencilDocument): boolean {
        const page = this.documents.getActivePage(document);
        return page.children.some(node => this.isVisibleRenderableAiNode(node));
    }

    protected isVisibleRenderableAiNode(node: OpenPencilNode): boolean {
        if (node.visible === false || node.enabled === false || node.opacity === 0) {
            return false;
        }
        if (node.children?.some(child => this.isVisibleRenderableAiNode(child))) {
            return true;
        }
        if (node.type === 'text') {
            return this.nodeTextContent(node).trim().length > 0;
        }
        if (node.type === 'path') {
            return typeof node.d === 'string' && node.d.trim().length > 0;
        }
        if (node.type === 'line') {
            return typeof node.x2 === 'number' || typeof node.y2 === 'number';
        }
        const width = this.numberValue(node.width, 0);
        const height = this.numberValue(node.height, 0);
        return width > 0 && height > 0 && (
            !!node.fill?.length
            || !!node.stroke
            || !!node.effects?.length
            || node.type === 'image'
            || node.type === 'icon_font'
            || node.type === 'ellipse'
            || node.type === 'polygon'
            || node.type === 'rectangle'
            || node.type === 'frame'
        );
    }

    protected scaleNumberish(value: unknown, scale: number): unknown {
        const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseFloat(value) : NaN;
        return Number.isFinite(parsed) ? this.roundScaledValue(parsed * scale) : value;
    }

    protected roundScaledValue(value: number): number {
        return Math.round(value * 100) / 100;
    }

    protected ensureUniqueNodeIds(document: OpenPencilDocument, node: OpenPencilNode, allowedExistingIds = new Set<string>()): void {
        const used = new Set(this.documents.flattenNodes(document).map(item => item.id).filter(id => !allowedExistingIds.has(id)));
        const visit = (item: OpenPencilNode) => {
            if (!item.id || used.has(item.id)) {
                item.id = this.documents.generateId(item.type);
            }
            used.add(item.id);
            item.children?.forEach(visit);
        };
        visit(node);
    }

    protected resolveStructuredParentChildren(document: OpenPencilDocument, root: OpenPencilNode[], parentId: string | null | undefined): OpenPencilNode[] | undefined {
        if (!parentId) {
            return root;
        }
        const parent = this.documents.findNode(document, parentId);
        if (!parent) {
            return undefined;
        }
        parent.children = parent.children ?? [];
        return parent.children;
    }

    protected removeNode(nodes: OpenPencilNode[], nodeId: string): boolean {
        const index = nodes.findIndex(node => node.id === nodeId);
        if (index >= 0) {
            nodes.splice(index, 1);
            return true;
        }
        for (const node of nodes) {
            if (node.children && this.removeNode(node.children, nodeId)) {
                return true;
            }
        }
        return false;
    }

    protected findLocation(nodes: OpenPencilNode[], nodeId: string, parent?: OpenPencilNode): { node: OpenPencilNode; parent?: OpenPencilNode; siblings: OpenPencilNode[]; index: number } | undefined {
        const index = nodes.findIndex(node => node.id === nodeId);
        if (index >= 0) {
            return { node: nodes[index], parent, siblings: nodes, index };
        }
        for (const node of nodes) {
            if (node.children) {
                const child = this.findLocation(node.children, nodeId, node);
                if (child) {
                    return child;
                }
            }
        }
        return undefined;
    }

    protected containsNode(nodes: OpenPencilNode[] | undefined, nodeId: string): boolean {
        if (!nodes) {
            return false;
        }
        for (const node of nodes) {
            if (node.id === nodeId || this.containsNode(node.children, nodeId)) {
                return true;
            }
        }
        return false;
    }

    protected reorderNode(nodes: OpenPencilNode[], nodeId: string, targetIndex: number): 'changed' | 'unchanged' | 'not-found' {
        const location = this.findLocation(nodes, nodeId);
        if (!location) {
            return 'not-found';
        }
        const boundedIndex = Math.max(0, Math.min(location.siblings.length - 1, targetIndex));
        if (boundedIndex === location.index) {
            return 'unchanged';
        }
        const [node] = location.siblings.splice(location.index, 1);
        location.siblings.splice(boundedIndex, 0, node);
        return 'changed';
    }

    protected moveLayer(nodes: OpenPencilNode[], nodeId: string, delta: number): 'changed' | 'unchanged' | 'not-found' {
        const location = this.findLocation(nodes, nodeId);
        if (!location) {
            return 'not-found';
        }
        return this.reorderNode(nodes, nodeId, location.index + delta);
    }

    protected moveLayerToEdge(nodes: OpenPencilNode[], nodeId: string, edge: 'front' | 'back'): 'changed' | 'unchanged' | 'not-found' {
        const location = this.findLocation(nodes, nodeId);
        if (!location) {
            return 'not-found';
        }
        return this.reorderNode(nodes, nodeId, edge === 'front' ? 0 : location.siblings.length - 1);
    }

    protected moveToParent(nodes: OpenPencilNode[], nodeId: string, parentId: string | null | undefined, targetIndex: number | undefined): 'changed' | 'unchanged' | 'not-found' | 'missing-parent' | 'invalid-parent' {
        const result = openPencilRuntimeTreeMutations.moveNode(nodes, nodeId, parentId ?? null, targetIndex);
        if (result.failure) {
            return result.failure;
        }
        nodes.splice(0, nodes.length, ...result.children);
        return result.changed ? 'changed' : 'unchanged';
    }

    protected sanitizeThemes(themes: Record<string, string[]>): Record<string, string[]> {
        const result: Record<string, string[]> = {};
        for (const [axis, values] of Object.entries(themes)) {
            const normalized = this.sanitizeThemeValues(values);
            if (axis.trim() && normalized.length) {
                result[axis] = normalized;
            }
        }
        return result;
    }

    protected sanitizeThemeValues(values: string[]): string[] {
        return Array.from(new Set(values.filter(value => typeof value === 'string' && value.trim().length > 0)));
    }

    protected clearThemeAxisFromNodes(nodes: OpenPencilNode[], axis: string): void {
        for (const node of nodes) {
            if (node.theme) {
                delete node.theme[axis];
                if (!Object.keys(node.theme).length) {
                    delete node.theme;
                }
            }
            if (node.children) {
                this.clearThemeAxisFromNodes(node.children, axis);
            }
        }
    }

    protected applyLayoutChanges(node: OpenPencilNode, layout: OpenPencilNodeLayoutChanges, normalizeChildren = false): void {
        Object.assign(node, layout);
        if (normalizeChildren && (node.layout === 'vertical' || node.layout === 'horizontal') && node.children) {
            node.children = openPencilRuntimeTreeMutations.computeLayoutChildren(node);
        }
    }

    protected alignNodes(nodes: OpenPencilNode[], nodeIds: string[], alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): { changed: boolean; message?: string } {
        const targets = this.targetLocations(nodes, nodeIds);
        if (targets.length < 2) {
            return { changed: false, message: 'Select at least two nodes to align.' };
        }
        const bounds = this.getBounds(targets.map(target => target.node));
        const targetCenterX = bounds.x + bounds.width / 2;
        const targetCenterY = bounds.y + bounds.height / 2;
        let changed = false;
        for (const { node } of targets) {
            const width = this.nodeWidth(node);
            const height = this.nodeHeight(node);
            const nextX = alignment === 'left'
                ? bounds.x
                : alignment === 'center'
                    ? targetCenterX - width / 2
                    : alignment === 'right'
                        ? bounds.x + bounds.width - width
                        : node.x;
            const nextY = alignment === 'top'
                ? bounds.y
                : alignment === 'middle'
                    ? targetCenterY - height / 2
                    : alignment === 'bottom'
                        ? bounds.y + bounds.height - height
                        : node.y;
            if (typeof nextX === 'number' && node.x !== Math.round(nextX)) {
                node.x = Math.round(nextX);
                changed = true;
            }
            if (typeof nextY === 'number' && node.y !== Math.round(nextY)) {
                node.y = Math.round(nextY);
                changed = true;
            }
        }
        return { changed };
    }

    protected distributeNodes(nodes: OpenPencilNode[], nodeIds: string[], direction: 'horizontal' | 'vertical'): { changed: boolean; message?: string } {
        const targets = this.targetLocations(nodes, nodeIds);
        if (targets.length < 3) {
            return { changed: false, message: 'Select at least three nodes to distribute.' };
        }
        const sorted = targets.slice().sort((left, right) => {
            const leftPosition = direction === 'horizontal' ? left.node.x ?? 0 : left.node.y ?? 0;
            const rightPosition = direction === 'horizontal' ? right.node.x ?? 0 : right.node.y ?? 0;
            return leftPosition - rightPosition;
        });
        const first = sorted[0].node;
        const last = sorted[sorted.length - 1].node;
        const start = direction === 'horizontal' ? first.x ?? 0 : first.y ?? 0;
        const end = direction === 'horizontal'
            ? (last.x ?? 0) + this.nodeWidth(last)
            : (last.y ?? 0) + this.nodeHeight(last);
        const totalSize = sorted.reduce((sum, target) => sum + (direction === 'horizontal' ? this.nodeWidth(target.node) : this.nodeHeight(target.node)), 0);
        const gap = (end - start - totalSize) / (sorted.length - 1);
        let cursor = start;
        let changed = false;
        for (const { node } of sorted) {
            const next = Math.round(cursor);
            if (direction === 'horizontal') {
                if (node.x !== next) {
                    node.x = next;
                    changed = true;
                }
                cursor += this.nodeWidth(node) + gap;
            } else {
                if (node.y !== next) {
                    node.y = next;
                    changed = true;
                }
                cursor += this.nodeHeight(node) + gap;
            }
        }
        return { changed };
    }

    protected nudgeNodes(nodes: OpenPencilNode[], nodeIds: string[], dx: number, dy: number): { changed: boolean; nodeIds: string[]; message?: string } {
        const targets = this.targetLocations(nodes, nodeIds);
        if (!targets.length) {
            return { changed: false, nodeIds: [], message: 'Select at least one node to nudge.' };
        }
        let changed = false;
        for (const { node } of targets) {
            const nextX = Math.round((node.x ?? 0) + dx);
            const nextY = Math.round((node.y ?? 0) + dy);
            if (node.x !== nextX) {
                node.x = nextX;
                changed = true;
            }
            if (node.y !== nextY) {
                node.y = nextY;
                changed = true;
            }
        }
        return { changed, nodeIds: targets.map(target => target.node.id) };
    }

    protected targetLocations(nodes: OpenPencilNode[], nodeIds: string[]): Array<{ node: OpenPencilNode; parent?: OpenPencilNode; siblings: OpenPencilNode[]; index: number }> {
        return Array.from(new Set(nodeIds))
            .map(nodeId => this.findLocation(nodes, nodeId))
            .filter((location): location is { node: OpenPencilNode; parent?: OpenPencilNode; siblings: OpenPencilNode[]; index: number } => !!location);
    }

    protected groupNodes(nodes: OpenPencilNode[], nodeIds: string[]): OpenPencilNode | undefined {
        const uniqueIds = Array.from(new Set(nodeIds));
        if (uniqueIds.length < 2) {
            return undefined;
        }
        const locations = uniqueIds.map(id => this.findLocation(nodes, id));
        if (locations.some(location => !location)) {
            return undefined;
        }
        const typedLocations = locations as Array<{ node: OpenPencilNode; parent?: OpenPencilNode; siblings: OpenPencilNode[]; index: number }>;
        const [first] = typedLocations;
        if (typedLocations.some(location => location.siblings !== first.siblings)) {
            return undefined;
        }
        const selectedNodes = typedLocations
            .slice()
            .sort((left, right) => left.index - right.index)
            .map(location => location.node);
        const bounds = this.getBounds(selectedNodes);
        const group: OpenPencilNode = {
            id: this.documents.generateId('group'),
            type: 'group',
            name: 'Group',
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            children: selectedNodes.map(node => ({
                ...this.clonePlainNode(node),
                x: (node.x ?? 0) - bounds.x,
                y: (node.y ?? 0) - bounds.y
            }))
        };
        const insertionIndex = Math.min(...typedLocations.map(location => location.index));
        for (const location of typedLocations.slice().sort((left, right) => right.index - left.index)) {
            location.siblings.splice(location.index, 1);
        }
        first.siblings.splice(insertionIndex, 0, group);
        return group;
    }

    protected ungroupNode(nodes: OpenPencilNode[], nodeId: string): string[] {
        const location = this.findLocation(nodes, nodeId);
        if (!location || location.node.type !== 'group' || !location.node.children?.length) {
            return [];
        }
        const groupX = location.node.x ?? 0;
        const groupY = location.node.y ?? 0;
        const children = location.node.children.map(child => ({
            ...child,
            x: (child.x ?? 0) + groupX,
            y: (child.y ?? 0) + groupY
        }));
        location.siblings.splice(location.index, 1, ...children);
        return children.map(child => child.id);
    }

    protected booleanNodes(nodes: OpenPencilNode[], nodeIds: string[], operation: OpenPencilBooleanOperation): { changed: boolean; nodeId?: string; message?: string } {
        const uniqueIds = Array.from(new Set(nodeIds));
        if (uniqueIds.length < 2) {
            return { changed: false, message: 'Select at least two compatible shapes for boolean operation.' };
        }
        const locations = this.targetLocations(nodes, uniqueIds);
        if (locations.length !== uniqueIds.length) {
            return { changed: false, message: 'One or more selected nodes were not found.' };
        }
        const [first] = locations;
        if (locations.some(location => location.siblings !== first.siblings)) {
            return { changed: false, message: 'Boolean operations require sibling nodes with the same parent.' };
        }
        const selected = locations.slice().sort((left, right) => left.index - right.index).map(location => location.node);
        if (!openPencilRuntimeVectorOperations.canBooleanNodes(selected)) {
            return { changed: false, message: 'Selection contains nodes that cannot participate in boolean operations.' };
        }
        const result = openPencilRuntimeVectorOperations.booleanNodes(selected, operation, () => this.documents.generateId('path'));
        if (!result) {
            return { changed: false, message: `Could not calculate ${operation} for the selected nodes.` };
        }
        const insertionIndex = Math.min(...locations.map(location => location.index));
        for (const location of locations.slice().sort((left, right) => right.index - left.index)) {
            location.siblings.splice(location.index, 1);
        }
        first.siblings.splice(insertionIndex, 0, result);
        return { changed: true, nodeId: result.id };
    }

    protected convertNodesToPath(nodes: OpenPencilNode[], nodeIds: string[]): { changed: boolean; nodeIds: string[]; message?: string } {
        const locations = this.targetLocations(nodes, nodeIds);
        if (!locations.length) {
            return { changed: false, nodeIds: [], message: 'Select at least one shape that can be converted to a path.' };
        }
        const convertedIds: string[] = [];
        for (const location of locations) {
            const converted = openPencilRuntimeVectorOperations.nodeToPath(location.node);
            if (converted) {
                location.siblings.splice(location.index, 1, converted);
                convertedIds.push(converted.id);
            }
        }
        return convertedIds.length
            ? { changed: true, nodeIds: convertedIds }
            : { changed: false, nodeIds: [], message: 'No selected nodes could be converted to path data.' };
    }

    protected updatePathAnchors(nodes: OpenPencilNode[], nodeId: string, anchors: OpenPencilPathAnchor[], closed: boolean | undefined): boolean {
        const location = this.findLocation(nodes, nodeId);
        if (!location || location.node.type !== 'path') {
            return false;
        }
        const normalized = openPencilRuntimeVectorOperations.normalizePathNodeAnchors({
            ...location.node,
            anchors: anchors.map(anchor => ({
                x: Number(anchor.x) || 0,
                y: Number(anchor.y) || 0,
                handleIn: anchor.handleIn ? { x: Number(anchor.handleIn.x) || 0, y: Number(anchor.handleIn.y) || 0 } : null,
                handleOut: anchor.handleOut ? { x: Number(anchor.handleOut.x) || 0, y: Number(anchor.handleOut.y) || 0 } : null
            })),
            closed: closed ?? location.node.closed ?? false
        });
        if (!normalized) {
            return false;
        }
        location.siblings.splice(location.index, 1, normalized);
        return true;
    }

    protected updatePathAnchor(nodes: OpenPencilNode[], nodeId: string, anchorIndex: number, anchor: OpenPencilPathAnchor, closed: boolean | undefined): boolean {
        const location = this.findLocation(nodes, nodeId);
        if (!location || location.node.type !== 'path') {
            return false;
        }
        const anchors = openPencilRuntimeVectorOperations.updatePathAnchor(location.node.anchors ?? [], anchorIndex, anchor);
        return anchors ? this.updatePathAnchors(nodes, nodeId, anchors, closed) : false;
    }

    protected updatePathHandle(nodes: OpenPencilNode[], nodeId: string, anchorIndex: number, handle: OpenPencilPathHandleSide, value: OpenPencilPathHandle | null, mirror: boolean | undefined, closed: boolean | undefined): boolean {
        const location = this.findLocation(nodes, nodeId);
        if (!location || location.node.type !== 'path') {
            return false;
        }
        const anchors = openPencilRuntimeVectorOperations.updatePathHandle(location.node.anchors ?? [], anchorIndex, handle, value, mirror);
        return anchors ? this.updatePathAnchors(nodes, nodeId, anchors, closed) : false;
    }

    protected insertPathAnchor(nodes: OpenPencilNode[], nodeId: string, anchorIndex: number, anchor: OpenPencilPathAnchor): boolean {
        const location = this.findLocation(nodes, nodeId);
        if (!location || location.node.type !== 'path') {
            return false;
        }
        const anchors = openPencilRuntimeVectorOperations.insertPathAnchor(location.node.anchors ?? [], anchorIndex, anchor);
        return anchors ? this.updatePathAnchors(nodes, nodeId, anchors, location.node.closed) : false;
    }

    protected removePathAnchor(nodes: OpenPencilNode[], nodeId: string, anchorIndex: number): boolean {
        const location = this.findLocation(nodes, nodeId);
        if (!location || location.node.type !== 'path') {
            return false;
        }
        const anchors = openPencilRuntimeVectorOperations.removePathAnchor(location.node.anchors ?? [], anchorIndex);
        return anchors ? this.updatePathAnchors(nodes, nodeId, anchors, location.node.closed) : false;
    }

    protected getBounds(nodes: OpenPencilNode[]): { x: number; y: number; width: number; height: number } {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const node of nodes) {
            const x = node.x ?? 0;
            const y = node.y ?? 0;
            const width = typeof node.width === 'number' ? node.width : 0;
            const height = typeof node.height === 'number' ? node.height : 0;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
        }
        return {
            x: Number.isFinite(minX) ? minX : 0,
            y: Number.isFinite(minY) ? minY : 0,
            width: Number.isFinite(maxX - minX) ? maxX - minX : 0,
            height: Number.isFinite(maxY - minY) ? maxY - minY : 0
        };
    }

    protected nodeWidth(node: OpenPencilNode): number {
        return typeof node.width === 'number' ? node.width : 0;
    }

    protected nodeHeight(node: OpenPencilNode): number {
        return typeof node.height === 'number' ? node.height : 0;
    }

    protected collectSelectedNodes(nodes: OpenPencilNode[], selection: string[]): OpenPencilNode[] {
        const selected = new Set(selection);
        const result: OpenPencilNode[] = [];
        const visit = (items: OpenPencilNode[]) => {
            for (const item of items) {
                if (selected.has(item.id)) {
                    result.push(JSON.parse(JSON.stringify(item)) as OpenPencilNode);
                }
                if (item.children) {
                    visit(item.children);
                }
            }
        };
        visit(nodes);
        return result;
    }

    protected importSvgDocument(source: string, name: string): OpenPencilDocument {
        const document = this.createDesign(name);
        const page = this.documents.getActivePage(document);
        const svgAttributes = this.parseMarkupAttributes(source.match(/<svg\b([^>]*)>/i)?.[1] ?? '');
        const viewBox = this.parseSvgViewBox(svgAttributes.viewBox);
        page.width = this.numberValue(svgAttributes.width, viewBox?.width ?? page.width ?? 900);
        page.height = this.numberValue(svgAttributes.height, viewBox?.height ?? page.height ?? 620);
        page.background = this.firstSvgBackground(source) ?? page.background;
        page.children = [];
        const tags = source.match(/<(rect|text|image|img|ellipse|circle|line|polygon|path)\b[^>]*(?:\/>|>[\s\S]*?<\/\1>)/gi) ?? [];
        let index = 1;
        for (const tag of tags) {
            const node = this.importSvgNode(tag, index++);
            if (node) {
                page.children.push(node);
            }
        }
        return document;
    }

    protected importHtmlDocument(source: string, name: string): OpenPencilDocument {
        const document = this.createDesign(name);
        const page = this.documents.getActivePage(document);
        page.children = [];
        const main = source.match(/<main\b([^>]*)>/i);
        if (main) {
            const style = this.parseCssDeclarations(this.parseMarkupAttributes(main[1]).style);
            page.width = this.numberValue(this.stripCssUnit(style.width), page.width ?? 900);
            page.height = this.numberValue(this.stripCssUnit(style.height ?? style['min-height']), page.height ?? 620);
            page.background = style.background ?? style['background-color'] ?? page.background;
        }
        const tags = source.match(/<img\b[^>]*\/?>|<(div|p|span)\b[^>]*(?:\/>|>[\s\S]*?<\/\1>)/gi) ?? [];
        let index = 1;
        for (const tag of tags) {
            const node = this.importHtmlNode(tag, index++);
            if (node) {
                page.children.push(node);
            }
        }
        return document;
    }

    protected importSvgNode(tag: string, index: number): OpenPencilNode | undefined {
        const match = tag.match(/^<([a-z0-9]+)\b([^>]*)>/i);
        if (!match) {
            return undefined;
        }
        const tagName = match[1].toLowerCase();
        const attributes = this.mergeStyleAttributes(this.parseMarkupAttributes(match[2]));
        if (tagName === 'rect' && attributes.x === undefined && attributes.y === undefined && attributes.width && attributes.height) {
            return undefined;
        }
        const base = {
            id: this.documents.generateId(`imported-${tagName}-${index}`),
            name: `Imported ${tagName} ${index}`,
            x: this.numberValue(attributes.x, tagName === 'ellipse' || tagName === 'circle' ? this.numberValue(attributes.cx, 0) - this.numberValue(attributes.rx ?? attributes.r, 0) : 0),
            y: this.numberValue(attributes.y, tagName === 'ellipse' || tagName === 'circle' ? this.numberValue(attributes.cy, 0) - this.numberValue(attributes.ry ?? attributes.r, 0) : 0),
            width: this.numberValue(attributes.width, tagName === 'ellipse' || tagName === 'circle' ? this.numberValue(attributes.rx ?? attributes.r, 60) * 2 : 120),
            height: this.numberValue(attributes.height, tagName === 'ellipse' || tagName === 'circle' ? this.numberValue(attributes.ry ?? attributes.r, 60) * 2 : 40)
        };
        if (tagName === 'text') {
            return {
                ...base,
                type: 'text',
                content: this.decodeHtml(tag.replace(/^<text\b[^>]*>/i, '').replace(/<\/text>$/i, '').trim()),
                fontSize: this.numberValue(attributes['font-size'], 16),
                fontWeight: this.numberValue(attributes['font-weight'], 400),
                fill: [{ type: 'solid', color: attributes.fill ?? '#111827', opacity: this.optionalNumber(attributes['fill-opacity']) }]
            };
        }
        if (tagName === 'image' || tagName === 'img') {
            return { ...base, type: 'image', src: attributes.href ?? attributes['xlink:href'] ?? attributes.src };
        }
        if (tagName === 'ellipse' || tagName === 'circle') {
            return this.importShapeNode('ellipse', base, attributes);
        }
        if (tagName === 'line') {
            return {
                ...this.importShapeNode('line', {
                    ...base,
                    x: this.numberValue(attributes.x1, 0),
                    y: this.numberValue(attributes.y1, 0),
                    width: this.numberValue(attributes.x2, 0) - this.numberValue(attributes.x1, 0),
                    height: this.numberValue(attributes.y2, 0) - this.numberValue(attributes.y1, 0)
                }, attributes),
                stroke: this.importStroke(attributes, '#94a3b8')
            };
        }
        if (tagName === 'polygon') {
            const points = this.parseSvgPoints(attributes.points);
            const bounds = points.length ? this.pointBounds(points) : { x: 0, y: 0, width: 120, height: 120 };
            return {
                ...this.importShapeNode('polygon', { ...base, ...bounds }, attributes),
                points: points.map(point => ({ x: point.x - bounds.x, y: point.y - bounds.y }))
            };
        }
        if (tagName === 'path') {
            return { ...this.importShapeNode('path', base, attributes), d: attributes.d };
        }
        return this.importShapeNode('rectangle', base, attributes);
    }

    protected importHtmlNode(tag: string, index: number): OpenPencilNode | undefined {
        const match = tag.match(/^<([a-z0-9]+)\b([^>]*)>/i);
        if (!match) {
            return undefined;
        }
        const tagName = match[1].toLowerCase();
        const attributes = this.parseMarkupAttributes(match[2]);
        const style = this.parseCssDeclarations(attributes.style);
        const base = {
            id: this.documents.generateId(`imported-${tagName}-${index}`),
            name: `Imported ${tagName} ${index}`,
            x: this.numberValue(this.stripCssUnit(style.left), 0),
            y: this.numberValue(this.stripCssUnit(style.top), 0),
            width: this.numberValue(this.stripCssUnit(style.width), tagName === 'img' ? 120 : 160),
            height: this.numberValue(this.stripCssUnit(style.height), tagName === 'img' ? 120 : 40)
        };
        if (tagName === 'img') {
            return { ...base, type: 'image', src: attributes.src, name: attributes.alt || base.name };
        }
        const content = this.decodeHtml(tag.replace(/^<[a-z0-9]+\b[^>]*>/i, '').replace(/<\/[a-z0-9]+>$/i, '').replace(/<[^>]+>/g, '').trim());
        if (tagName === 'p' || tagName === 'span' || content) {
            return {
                ...base,
                type: 'text',
                content,
                fontSize: this.numberValue(this.stripCssUnit(style['font-size']), 16),
                fontWeight: this.numberValue(style['font-weight'], 400),
                textAlign: this.importTextAlign(style['text-align']),
                fill: [{ type: 'solid', color: style.color ?? '#111827' }]
            };
        }
        return {
            ...base,
            type: 'rectangle',
            cornerRadius: this.numberValue(this.stripCssUnit(style['border-radius']), 0),
            fill: [{ type: 'solid', color: style['background-color'] ?? style.background ?? 'transparent' }],
            stroke: this.importCssBorder(style.border)
        };
    }

    protected importShapeNode(type: OpenPencilNode['type'], base: Pick<OpenPencilNode, 'id' | 'name' | 'x' | 'y' | 'width' | 'height'>, attributes: Record<string, string>): OpenPencilNode {
        return {
            ...base,
            type,
            cornerRadius: this.numberValue(attributes.rx, 0),
            fill: attributes.fill && attributes.fill !== 'none'
                ? [{ type: 'solid', color: attributes.fill, opacity: this.optionalNumber(attributes['fill-opacity']) }]
                : undefined,
            stroke: this.importStroke(attributes)
        };
    }

    protected importStroke(attributes: Record<string, string>, fallback?: string): OpenPencilNode['stroke'] | undefined {
        const color = attributes.stroke ?? fallback;
        if (!color || color === 'none') {
            return undefined;
        }
        return {
            color,
            width: this.numberValue(attributes['stroke-width'], 1),
            opacity: this.optionalNumber(attributes['stroke-opacity'])
        };
    }

    protected importCssBorder(value: string | undefined): OpenPencilNode['stroke'] | undefined {
        if (!value) {
            return undefined;
        }
        const width = value.match(/(\d+(?:\.\d+)?)px/)?.[1];
        const color = value.match(/(#[0-9a-f]{3,8}|rgba?\([^)]+\)|[a-z]+)$/i)?.[1];
        return color ? { color, width: this.numberValue(width, 1) } : undefined;
    }

    protected parseMarkupAttributes(source: string): Record<string, string> {
        const attributes: Record<string, string> = {};
        const matcher = /([:@A-Za-z0-9_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
        let match: RegExpExecArray | null;
        while ((match = matcher.exec(source))) {
            attributes[match[1]] = this.decodeHtml(match[3] ?? match[4] ?? match[5] ?? '');
        }
        return attributes;
    }

    protected parseCssDeclarations(source: string | undefined): Record<string, string> {
        const declarations: Record<string, string> = {};
        for (const declaration of (source ?? '').split(';')) {
            const separator = declaration.indexOf(':');
            if (separator === -1) {
                continue;
            }
            const key = declaration.slice(0, separator).trim().toLowerCase();
            const value = declaration.slice(separator + 1).trim();
            if (key && value) {
                declarations[key] = value;
            }
        }
        return declarations;
    }

    protected mergeStyleAttributes(attributes: Record<string, string>): Record<string, string> {
        return {
            ...this.parseCssDeclarations(attributes.style),
            ...attributes
        };
    }

    protected firstSvgBackground(source: string): string | undefined {
        const rect = source.match(/<rect\b([^>]*)>/i);
        if (!rect) {
            return undefined;
        }
        const attributes = this.mergeStyleAttributes(this.parseMarkupAttributes(rect[1]));
        return attributes.x === undefined && attributes.y === undefined ? attributes.fill : undefined;
    }

    protected parseSvgViewBox(value: string | undefined): { x: number; y: number; width: number; height: number } | undefined {
        const numbers = (value ?? '').trim().split(/[\s,]+/).map(item => Number(item));
        if (numbers.length !== 4 || numbers.some(item => !Number.isFinite(item))) {
            return undefined;
        }
        return { x: numbers[0], y: numbers[1], width: numbers[2], height: numbers[3] };
    }

    protected parseSvgPoints(value: string | undefined): Array<{ x: number; y: number }> {
        const numbers = (value ?? '').trim().split(/[\s,]+/).map(item => Number(item)).filter(item => Number.isFinite(item));
        const points: Array<{ x: number; y: number }> = [];
        for (let index = 0; index + 1 < numbers.length; index += 2) {
            points.push({ x: numbers[index], y: numbers[index + 1] });
        }
        return points;
    }

    protected pointBounds(points: Array<{ x: number; y: number }>): { x: number; y: number; width: number; height: number } {
        const xs = points.map(point => point.x);
        const ys = points.map(point => point.y);
        const x = Math.min(...xs);
        const y = Math.min(...ys);
        return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
    }

    protected stripCssUnit(value: string | undefined): string | undefined {
        return value?.trim().replace(/px$/i, '');
    }

    protected importTextAlign(value: string | undefined): OpenPencilNode['textAlign'] | undefined {
        return value === 'center' || value === 'right' || value === 'justify' || value === 'left' ? value : undefined;
    }

    protected optionalNumber(value: string | undefined): number | undefined {
        const parsed = value === undefined ? NaN : Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }

    protected cloneNode(node: OpenPencilNode): OpenPencilNode {
        const clone = openPencilRuntimeTreeMutations.cloneNode(node, () => this.documents.generateId('node'));
        const assignIds = (item: OpenPencilNode) => {
            item.name = item.name ? `${item.name} copy` : undefined;
            item.children?.forEach(assignIds);
        };
        assignIds(clone);
        return clone;
    }

    protected clonePlainNode(node: OpenPencilNode): OpenPencilNode {
        return JSON.parse(JSON.stringify(node)) as OpenPencilNode;
    }

    protected nodesInPaintOrder(nodes: OpenPencilNode[] | undefined): OpenPencilNode[] {
        return [...(nodes ?? [])].reverse();
    }

    protected exportReact(nodes: OpenPencilNode[], page: { width?: number; height?: number; background?: string }): string {
        const body = this.nodesInPaintOrder(nodes).map(node => this.reactNode(node, 3)).join('\n');
        const width = page.width ?? 900;
        const height = page.height ?? 620;
        const background = page.background ?? '#ffffff';
        return `export function OpenPencilDesign() {\n  return (\n    <div className="relative" style={{ width: '${width}px', minHeight: '${height}px', background: '${background}' }}>\n${body}\n    </div>\n  );\n}\n`;
    }

    protected reactNode(node: OpenPencilNode, indent: number): string {
        const pad = '  '.repeat(indent);
        const className = `absolute ${this.isTextLikeNode(node) ? 'text-slate-900' : ''}`.trim();
        const style = this.inlineStyle(node);
        if (node.visible === false) {
            return '';
        }
        if (this.isTextLikeNode(node)) {
            return `${pad}<div className="${className}" style={${style}}>${this.escapeJsx(this.nodeTextContent(node))}</div>`;
        }
        if (node.type === 'image') {
            return `${pad}<img className="${className}" style={${style}} src="${this.escapeAttribute(node.src ?? '')}" alt="${this.escapeAttribute(node.name ?? '')}" />`;
        }
        if (node.type === 'ellipse' || node.type === 'line' || node.type === 'polygon' || node.type === 'path') {
            return this.reactSvgNode(node, pad, className, style);
        }
        const children = this.nodesInPaintOrder(node.children).map(child => this.reactNode(child, indent + 1)).join('\n');
        if (children) {
            return `${pad}<div className="${className}" style={${style}}>\n${children}\n${pad}</div>`;
        }
        return `${pad}<div className="${className}" style={${style}} />`;
    }

    protected exportHtml(nodes: OpenPencilNode[], page: { width?: number; height?: number; background?: string }): string {
        const body = this.nodesInPaintOrder(nodes).map(node => this.htmlNode(node, 2)).join('\n');
        const width = page.width ?? 900;
        const height = page.height ?? 620;
        const background = page.background ?? '#ffffff';
        return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>OpenPencil Export</title>\n</head>\n<body>\n  <main style="position:relative;width:${width}px;min-height:${height}px;background:${this.escapeAttribute(background)};">\n${body}\n  </main>\n</body>\n</html>\n`;
    }

    protected exportSvg(nodes: OpenPencilNode[], page: { width?: number; height?: number; background?: string }): string {
        const width = page.width ?? 900;
        const height = page.height ?? 620;
        const background = page.background ?? '#ffffff';
        const body = this.nodesInPaintOrder(nodes).map(node => this.svgNode(node, 1)).filter(Boolean).join('\n');
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="OpenPencil export">\n  <rect width="${width}" height="${height}" fill="${this.escapeAttribute(background)}" />\n${body}\n</svg>\n`;
    }

    protected exportVue(nodes: OpenPencilNode[], page: { width?: number; height?: number; background?: string }): string {
        const body = this.nodesInPaintOrder(nodes).map(node => this.htmlNode(node, 2)).join('\n');
        const width = page.width ?? 900;
        const height = page.height ?? 620;
        const background = page.background ?? '#ffffff';
        return `<template>\n  <main style="position:relative;width:${width}px;min-height:${height}px;background:${this.escapeAttribute(background)};">\n${body}\n  </main>\n</template>\n\n<script setup lang="ts">\n</script>\n`;
    }

    protected exportSvelte(nodes: OpenPencilNode[], page: { width?: number; height?: number; background?: string }): string {
        const body = this.nodesInPaintOrder(nodes).map(node => this.htmlNode(node, 1)).join('\n');
        const width = page.width ?? 900;
        const height = page.height ?? 620;
        const background = page.background ?? '#ffffff';
        return `<main style="position:relative;width:${width}px;min-height:${height}px;background:${this.escapeAttribute(background)};">\n${body}\n</main>\n`;
    }

    protected exportReactNative(nodes: OpenPencilNode[], page: { width?: number; height?: number; background?: string }): string {
        const body = this.nodesInPaintOrder(nodes).map(node => this.reactNativeNode(node, 3)).filter(Boolean).join('\n');
        const width = page.width ?? 900;
        const height = page.height ?? 620;
        const background = page.background ?? '#ffffff';
        return `import React from 'react';\nimport { Image, Text, View } from 'react-native';\n\nexport function OpenPencilDesign() {\n  return (\n    <View style={{ position: 'relative', width: ${width}, minHeight: ${height}, backgroundColor: '${this.escapeJsString(background)}' }}>\n${body}\n    </View>\n  );\n}\n`;
    }

    protected reactNativeNode(node: OpenPencilNode, indent: number): string {
        if (node.visible === false) {
            return '';
        }
        const pad = '  '.repeat(indent);
        const style = this.reactNativeStyle(node);
        if (this.isTextLikeNode(node)) {
            return `${pad}<Text style={${style}}>${this.escapeJsx(this.nodeTextContent(node))}</Text>`;
        }
        if (node.type === 'image') {
            return `${pad}<Image source={{ uri: '${this.escapeJsString(node.src ?? '')}' }} accessibilityLabel="${this.escapeAttribute(node.name ?? '')}" style={${style}} />`;
        }
        const children = this.nodesInPaintOrder(node.children).map(child => this.reactNativeNode(child, indent + 1)).filter(Boolean).join('\n');
        return children
            ? `${pad}<View style={${style}}>\n${children}\n${pad}</View>`
            : `${pad}<View style={${style}} />`;
    }

    protected exportFlutter(nodes: OpenPencilNode[], page: { width?: number; height?: number; background?: string }): string {
        const width = page.width ?? 900;
        const height = page.height ?? 620;
        const background = page.background ?? '#ffffff';
        const body = this.nodesInPaintOrder(nodes).map(node => this.flutterNode(node, 5)).filter(Boolean).join(',\n');
        return `import 'package:flutter/material.dart';\n\nclass OpenPencilDesign extends StatelessWidget {\n  const OpenPencilDesign({super.key});\n\n  @override\n  Widget build(BuildContext context) {\n    return SizedBox(\n      width: ${width},\n      height: ${height},\n      child: ColoredBox(\n        color: ${this.dartColor(background, '#ffffff')},\n        child: Stack(\n          children: [\n${body}\n          ],\n        ),\n      ),\n    );\n  }\n}\n`;
    }

    protected flutterNode(node: OpenPencilNode, indent: number): string {
        if (node.visible === false) {
            return '';
        }
        const pad = '  '.repeat(indent);
        const childPad = '  '.repeat(indent + 1);
        const left = this.numberValue(node.x, 0);
        const top = this.numberValue(node.y, 0);
        const width = this.numberValue(node.width, this.isTextLikeNode(node) ? 160 : 120);
        const height = this.numberValue(node.height, this.isTextLikeNode(node) ? 40 : 120);
        if (this.isTextLikeNode(node)) {
            return `${pad}Positioned(\n${childPad}left: ${left},\n${childPad}top: ${top},\n${childPad}width: ${width},\n${childPad}height: ${height},\n${childPad}child: Text(\n${childPad}  '${this.escapeDartString(this.nodeTextContent(node))}',\n${childPad}  style: TextStyle(color: ${this.dartColor(node.fill?.[0]?.color, '#111827')}, fontSize: ${node.fontSize ?? 16}, fontWeight: ${this.dartFontWeight(node.fontWeight)}),\n${childPad}  textAlign: ${this.dartTextAlign(node.textAlign)},\n${childPad}),\n${pad})`;
        }
        if (node.type === 'image') {
            return `${pad}Positioned(\n${childPad}left: ${left},\n${childPad}top: ${top},\n${childPad}width: ${width},\n${childPad}height: ${height},\n${childPad}child: Image.network('${this.escapeDartString(node.src ?? '')}', fit: BoxFit.cover),\n${pad})`;
        }
        const children = this.nodesInPaintOrder(node.children).map(child => this.flutterNode(child, indent + 3)).filter(Boolean).join(',\n');
        const content = children
            ? `Stack(\n${childPad}  children: [\n${children}\n${childPad}  ],\n${childPad})`
            : 'SizedBox.expand()';
        const decoration = this.flutterDecoration(node);
        return `${pad}Positioned(\n${childPad}left: ${left},\n${childPad}top: ${top},\n${childPad}width: ${width},\n${childPad}height: ${height},\n${childPad}child: Container(\n${childPad}  decoration: ${decoration},\n${childPad}  child: ${content},\n${childPad}),\n${pad})`;
    }

    protected exportSwiftUI(nodes: OpenPencilNode[], page: { width?: number; height?: number; background?: string }): string {
        const width = page.width ?? 900;
        const height = page.height ?? 620;
        const background = page.background ?? '#ffffff';
        const body = this.nodesInPaintOrder(nodes).map(node => this.swiftUINode(node, 3)).filter(Boolean).join('\n');
        return `import SwiftUI\n\nstruct OpenPencilDesign: View {\n    var body: some View {\n        ZStack(alignment: .topLeading) {\n            ${this.swiftColor(background, '#ffffff')}\n${body}\n        }\n        .frame(width: ${width}, height: ${height})\n        .clipped()\n    }\n}\n`;
    }

    protected swiftUINode(node: OpenPencilNode, indent: number): string {
        if (node.visible === false) {
            return '';
        }
        const pad = '    '.repeat(indent);
        const width = this.numberValue(node.width, this.isTextLikeNode(node) ? 160 : 120);
        const height = this.numberValue(node.height, this.isTextLikeNode(node) ? 40 : 120);
        const x = this.numberValue(node.x, 0) + width / 2;
        const y = this.numberValue(node.y, 0) + height / 2;
        const modifiers = this.swiftUIModifiers(node, width, height, x, y, indent);
        if (this.isTextLikeNode(node)) {
            return `${pad}Text("${this.escapeDoubleQuotedString(this.nodeTextContent(node))}")\n${pad}    .font(.system(size: ${node.fontSize ?? 16}))\n${pad}    .fontWeight(${this.swiftUIFontWeight(node.fontWeight)})\n${pad}    .foregroundColor(${this.swiftColor(node.fill?.[0]?.color, '#111827')})${modifiers}`;
        }
        if (node.type === 'image') {
            return `${pad}AsyncImage(url: URL(string: "${this.escapeDoubleQuotedString(node.src ?? '')}")) { image in\n${pad}    image.resizable().scaledToFill()\n${pad}} placeholder: {\n${pad}    Color.clear\n${pad}}${modifiers}\n${pad}    .clipped()`;
        }
        if (node.children?.length) {
            const children = this.nodesInPaintOrder(node.children).map(child => this.swiftUINode(child, indent + 1)).filter(Boolean).join('\n');
            return `${pad}ZStack(alignment: .topLeading) {\n${children}\n${pad}}${modifiers}`;
        }
        const radius = this.cornerRadiusValue(node);
        return `${pad}RoundedRectangle(cornerRadius: ${radius})\n${pad}    .fill(${this.swiftColor(node.fill?.[0]?.color, 'transparent')})${this.swiftUIStroke(node)}${modifiers}`;
    }

    protected exportJetpackCompose(nodes: OpenPencilNode[], page: { width?: number; height?: number; background?: string }): string {
        const width = page.width ?? 900;
        const height = page.height ?? 620;
        const background = page.background ?? '#ffffff';
        const body = this.nodesInPaintOrder(nodes).map(node => this.composeNode(node, 2)).filter(Boolean).join('\n');
        return `import androidx.compose.foundation.background\nimport androidx.compose.foundation.border\nimport androidx.compose.foundation.layout.Box\nimport androidx.compose.foundation.layout.offset\nimport androidx.compose.foundation.layout.size\nimport androidx.compose.foundation.shape.RoundedCornerShape\nimport androidx.compose.material3.Text\nimport androidx.compose.runtime.Composable\nimport androidx.compose.ui.Modifier\nimport androidx.compose.ui.draw.clip\nimport androidx.compose.ui.graphics.Color\nimport androidx.compose.ui.text.font.FontWeight\nimport androidx.compose.ui.unit.dp\nimport androidx.compose.ui.unit.sp\nimport coil.compose.AsyncImage\n\n@Composable\nfun OpenPencilDesign() {\n    Box(\n        modifier = Modifier\n            .size(${width}.dp, ${height}.dp)\n            .background(${this.composeColor(background, '#ffffff')})\n    ) {\n${body}\n    }\n}\n`;
    }

    protected composeNode(node: OpenPencilNode, indent: number): string {
        if (node.visible === false) {
            return '';
        }
        const pad = '    '.repeat(indent);
        const width = this.numberValue(node.width, this.isTextLikeNode(node) ? 160 : 120);
        const height = this.numberValue(node.height, this.isTextLikeNode(node) ? 40 : 120);
        const modifier = this.composeModifier(node, width, height);
        if (this.isTextLikeNode(node)) {
            return `${pad}Text(\n${pad}    text = "${this.escapeDoubleQuotedString(this.nodeTextContent(node))}",\n${pad}    modifier = ${modifier},\n${pad}    color = ${this.composeColor(node.fill?.[0]?.color, '#111827')},\n${pad}    fontSize = ${node.fontSize ?? 16}.sp,\n${pad}    fontWeight = ${this.composeFontWeight(node.fontWeight)}\n${pad})`;
        }
        if (node.type === 'image') {
            return `${pad}AsyncImage(\n${pad}    model = "${this.escapeDoubleQuotedString(node.src ?? '')}",\n${pad}    contentDescription = "${this.escapeDoubleQuotedString(node.name ?? '')}",\n${pad}    modifier = ${modifier}\n${pad})`;
        }
        const children = this.nodesInPaintOrder(node.children).map(child => this.composeNode(child, indent + 1)).filter(Boolean).join('\n');
        return children
            ? `${pad}Box(modifier = ${modifier}) {\n${children}\n${pad}}`
            : `${pad}Box(modifier = ${modifier})`;
    }

    protected htmlNode(node: OpenPencilNode, indent: number): string {
        const pad = '  '.repeat(indent);
        if (node.visible === false) {
            return '';
        }
        const style = this.cssStyle(node);
        if (node.type === 'image') {
            return `${pad}<img src="${this.escapeAttribute(node.src ?? '')}" alt="${this.escapeAttribute(node.name ?? '')}" style="${style}">`;
        }
        if (node.type === 'ellipse' || node.type === 'line' || node.type === 'polygon' || node.type === 'path') {
            return this.htmlSvgNode(node, pad, style);
        }
        const tag = this.isTextLikeNode(node) ? 'p' : 'div';
        const content = this.isTextLikeNode(node) ? this.escapeHtml(this.nodeTextContent(node)) : '';
        const children = this.nodesInPaintOrder(node.children).map(child => this.htmlNode(child, indent + 1)).join('\n');
        return children
            ? `${pad}<${tag} style="${style}">\n${children}\n${pad}</${tag}>`
            : `${pad}<${tag} style="${style}">${content}</${tag}>`;
    }

    protected svgNode(node: OpenPencilNode, indent: number, offsetX = 0, offsetY = 0): string {
        if (node.visible === false) {
            return '';
        }
        const pad = '  '.repeat(indent);
        const x = offsetX + this.numberValue(node.x, 0);
        const y = offsetY + this.numberValue(node.y, 0);
        const width = this.numberValue(node.width, this.isTextLikeNode(node) ? 160 : 120);
        const height = this.numberValue(node.height, this.isTextLikeNode(node) ? 40 : 120);
        const fill = node.fill?.[0]?.color ?? (this.isTextLikeNode(node) ? '#111827' : 'transparent');
        const stroke = node.stroke?.color;
        const strokeWidth = this.numberValue(node.stroke?.width, 1);
        const opacity = typeof node.opacity === 'number' || typeof node.opacity === 'string' ? ` opacity="${node.opacity}"` : '';
        const fillOpacity = typeof node.fill?.[0]?.opacity === 'number' ? ` fill-opacity="${node.fill[0].opacity}"` : '';
        const strokeOpacity = typeof node.stroke?.opacity === 'number' ? ` stroke-opacity="${node.stroke.opacity}"` : '';
        const rotation = typeof node.rotation === 'number' && node.rotation !== 0
            ? ` transform="rotate(${node.rotation} ${x + width / 2} ${y + height / 2})"`
            : '';
        const strokeAttributes = stroke ? ` stroke="${this.escapeAttribute(stroke)}" stroke-width="${strokeWidth}"${strokeOpacity}` : '';
        const children = this.nodesInPaintOrder(node.children).map(child => this.svgNode(child, indent + 1, x, y)).filter(Boolean).join('\n');
        if (this.isTextLikeNode(node)) {
            return `${pad}<text x="${x}" y="${y + (node.fontSize ?? 16)}" fill="${this.escapeAttribute(fill)}"${fillOpacity} font-size="${node.fontSize ?? 16}" font-weight="${node.fontWeight ?? 400}"${opacity}${rotation}>${this.escapeHtml(this.nodeTextContent(node))}</text>`;
        }
        if (node.type === 'image') {
            return node.src
                ? `${pad}<image href="${this.escapeAttribute(node.src)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"${opacity}${rotation} />`
                : `${pad}<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#f8fafc"${strokeAttributes}${opacity}${rotation} />`;
        }
        if (node.type === 'ellipse') {
            return `${pad}<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${Math.abs(width) / 2}" ry="${Math.abs(height) / 2}" fill="${this.escapeAttribute(fill)}"${fillOpacity}${strokeAttributes}${opacity}${rotation} />`;
        }
        if (node.type === 'line') {
            return `${pad}<line x1="${x}" y1="${y}" x2="${x + width}" y2="${y + height}" stroke="${this.escapeAttribute(stroke ?? '#94a3b8')}" stroke-width="${strokeWidth}" stroke-linecap="round"${opacity}${rotation} />`;
        }
        if (node.type === 'polygon') {
            const points = (node.points?.length ? node.points : [
                { x: width / 2, y: 0 },
                { x: width, y: height },
                { x: 0, y: height }
            ]).map(point => `${x + point.x},${y + point.y}`).join(' ');
            return `${pad}<polygon points="${this.escapeAttribute(points)}" fill="${this.escapeAttribute(fill)}"${fillOpacity}${strokeAttributes}${opacity}${rotation} />`;
        }
        if (node.type === 'path') {
            const d = node.d || `M ${x} ${y + height} C ${x + width * 0.25} ${y} ${x + width * 0.75} ${y} ${x + width} ${y + height}`;
            const fillRule = node.fillRule === 'evenodd' ? ' fill-rule="evenodd"' : '';
            return `${pad}<path d="${this.escapeAttribute(d)}" fill="${this.escapeAttribute(fill)}"${fillOpacity}${fillRule} stroke="${this.escapeAttribute(stroke ?? '#94a3b8')}" stroke-width="${strokeWidth}"${opacity}${rotation} />`;
        }
        const rect = node.type === 'group'
            ? ''
            : `${pad}<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${typeof node.cornerRadius === 'number' ? node.cornerRadius : 0}" fill="${this.escapeAttribute(fill)}"${fillOpacity}${strokeAttributes}${opacity}${rotation} />`;
        return children ? [rect, children].filter(Boolean).join('\n') : rect;
    }

    protected inlineStyle(node: OpenPencilNode): string {
        const entries = this.styleEntries(node).map(([key, value]) => `${key}: '${value}'`);
        return `{ ${entries.join(', ')} }`;
    }

    protected cssStyle(node: OpenPencilNode): string {
        return this.styleEntries(node).map(([key, value]) => `${this.hyphenate(key)}:${value}`).join(';');
    }

    protected styleEntries(node: OpenPencilNode): Array<[string, string]> {
        const entries: Array<[string, string]> = [
            ['position', 'absolute'],
            ['left', `${node.x ?? 0}px`],
            ['top', `${node.y ?? 0}px`]
        ];
        const width = this.cssSize(node.width);
        const height = this.cssSize(node.height);
        if (width) {
            entries.push(['width', width]);
        }
        if (height) {
            entries.push(['height', height]);
        }
        if (typeof node.opacity === 'number' || typeof node.opacity === 'string') {
            entries.push(['opacity', `${node.opacity}`]);
        }
        const transforms: string[] = [];
        if (node.flipX) {
            transforms.push('scaleX(-1)');
        }
        if (node.flipY) {
            transforms.push('scaleY(-1)');
        }
        if (typeof node.rotation === 'number' && node.rotation !== 0) {
            transforms.push(`rotate(${node.rotation}deg)`);
        }
        if (transforms.length) {
            entries.push(['transform', transforms.join(' ')]);
            entries.push(['transformOrigin', 'center']);
        }
        if (node.layout === 'vertical' || node.layout === 'horizontal') {
            entries.push(['display', 'flex']);
            entries.push(['flexDirection', node.layout === 'vertical' ? 'column' : 'row']);
            if (node.gap !== undefined) {
                entries.push(['gap', this.cssSpacing(node.gap)]);
            }
            if (node.padding !== undefined) {
                entries.push(['padding', this.cssPadding(node.padding)]);
            }
            if (node.justifyContent) {
                entries.push(['justifyContent', this.cssJustifyContent(node.justifyContent)]);
            }
            if (node.alignItems) {
                entries.push(['alignItems', this.cssAlignItems(node.alignItems)]);
            }
        }
        if (node.clipContent) {
            entries.push(['overflow', 'hidden']);
        }
        const shadow = this.cssBoxShadow(node.effects);
        if (shadow) {
            entries.push(['boxShadow', shadow]);
        }
        const filter = this.cssFilter(node.effects);
        if (filter) {
            entries.push(['filter', filter]);
        }
        const fill = this.cssFillColor(node);
        if (this.isTextLikeNode(node)) {
            entries.push(['color', fill ?? '#111827']);
            entries.push(['fontSize', `${node.fontSize ?? 16}px`]);
            entries.push(['fontWeight', `${node.fontWeight ?? 400}`]);
            if (node.fontFamily) {
                entries.push(['fontFamily', node.fontFamily]);
            }
            if (node.fontStyle) {
                entries.push(['fontStyle', node.fontStyle]);
            }
            if (typeof node.letterSpacing === 'number') {
                entries.push(['letterSpacing', `${node.letterSpacing}px`]);
            }
            if (typeof node.lineHeight === 'number') {
                entries.push(['lineHeight', `${node.lineHeight}`]);
            }
            if (node.textAlign) {
                entries.push(['textAlign', node.textAlign]);
            }
            const textDecoration = [
                node.underline ? 'underline' : undefined,
                node.strikethrough ? 'line-through' : undefined
            ].filter(Boolean).join(' ');
            if (textDecoration) {
                entries.push(['textDecoration', textDecoration]);
            }
            entries.push(['margin', '0']);
        } else if (node.type === 'image') {
            entries.push(['objectFit', this.cssObjectFit(node.objectFit)]);
        } else if (node.type === 'ellipse' || node.type === 'line' || node.type === 'polygon' || node.type === 'path') {
            if (!node.clipContent) {
                entries.push(['overflow', 'visible']);
            }
        } else {
            entries.push(['backgroundColor', fill ?? 'transparent']);
            if (typeof node.cornerRadius === 'number') {
                entries.push(['borderRadius', `${node.cornerRadius}px`]);
            }
            if (node.stroke) {
                entries.push(['border', `${this.numberValue(node.stroke.width, 1)}px solid ${this.cssStrokeColor(node)}`]);
            }
        }
        return entries;
    }

    protected isTextLikeNode(node: OpenPencilNode): boolean {
        return node.type === 'text' || node.type === 'icon_font';
    }

    protected nodeTextContent(node: OpenPencilNode): string {
        if (typeof node.content === 'string') {
            return node.content;
        }
        if (Array.isArray(node.content)) {
            return node.content.map(segment => segment.text).join('');
        }
        return '';
    }

    protected cssFillColor(node: OpenPencilNode): string | undefined {
        return this.cssColorWithOpacity(node.fill?.[0]?.color, node.fill?.[0]?.opacity);
    }

    protected cssStrokeColor(node: OpenPencilNode): string {
        return this.cssColorWithOpacity(node.stroke?.color, node.stroke?.opacity) ?? '#000000';
    }

    protected cssColorWithOpacity(color: string | undefined, opacity: number | undefined): string | undefined {
        if (!color || opacity === undefined || opacity >= 1 || color === 'transparent') {
            return color;
        }
        const raw = color.trim();
        const hex = raw.startsWith('#') ? raw.slice(1) : raw;
        const expanded = hex.length === 3 ? hex.split('').map(character => `${character}${character}`).join('') : hex;
        if (!/^[0-9a-f]{6}$/i.test(expanded)) {
            return color;
        }
        const red = parseInt(expanded.slice(0, 2), 16);
        const green = parseInt(expanded.slice(2, 4), 16);
        const blue = parseInt(expanded.slice(4, 6), 16);
        return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, opacity))})`;
    }

    protected cssSize(value: OpenPencilNode['width']): string | undefined {
        if (typeof value === 'number') {
            return `${value}px`;
        }
        if (typeof value !== 'string') {
            return undefined;
        }
        if (value === 'fit_content') {
            return 'fit-content';
        }
        if (value === 'fill_container') {
            return '100%';
        }
        return this.isNumericString(value) ? `${value}px` : value;
    }

    protected cssSpacing(value: number | string): string {
        return typeof value === 'number' ? `${value}px` : this.isNumericString(value) ? `${value}px` : value;
    }

    protected cssPadding(value: OpenPencilNode['padding']): string {
        if (Array.isArray(value)) {
            return value.map(item => `${item}px`).join(' ');
        }
        return value === undefined ? '0' : this.cssSpacing(value);
    }

    protected cssJustifyContent(value: NonNullable<OpenPencilNode['justifyContent']>): string {
        if (value === 'space_between') {
            return 'space-between';
        }
        if (value === 'space_around') {
            return 'space-around';
        }
        return value === 'start' ? 'flex-start' : value === 'end' ? 'flex-end' : value;
    }

    protected cssAlignItems(value: NonNullable<OpenPencilNode['alignItems']>): string {
        return value === 'start' ? 'flex-start' : value === 'end' ? 'flex-end' : value;
    }

    protected cssObjectFit(value: OpenPencilNode['objectFit']): string {
        if (value === 'fit') {
            return 'contain';
        }
        if (value === 'fill') {
            return 'cover';
        }
        return value ?? 'cover';
    }

    protected cssBoxShadow(effects: OpenPencilNode['effects']): string | undefined {
        const shadows = effects
            ?.map(effect => effect.type === 'shadow'
                ? `${effect.inner ? 'inset ' : ''}${this.numberValue(effect.offsetX, 0)}px ${this.numberValue(effect.offsetY, 0)}px ${this.numberValue(effect.blur, 0)}px ${this.numberValue(effect.spread, 0)}px ${effect.color}`
                : undefined)
            .filter((effect): effect is string => !!effect);
        return shadows?.length ? shadows.join(', ') : undefined;
    }

    protected cssFilter(effects: OpenPencilNode['effects']): string | undefined {
        const blur = effects?.find(effect => effect.type === 'blur' || effect.type === 'background_blur');
        const radius = blur && 'radius' in blur && (typeof blur.radius === 'number' || typeof blur.radius === 'string') ? blur.radius : undefined;
        return radius !== undefined ? `blur(${this.numberValue(radius, 0)}px)` : undefined;
    }

    protected isNumericString(value: string): boolean {
        return /^-?\d+(?:\.\d+)?$/.test(value.trim());
    }

    protected reactSvgNode(node: OpenPencilNode, pad: string, className: string, style: string): string {
        const width = this.numberValue(node.width, 160);
        const height = this.numberValue(node.height, 120);
        const fill = node.fill?.[0]?.color ?? 'transparent';
        const stroke = node.stroke?.color ?? '#94a3b8';
        const strokeWidth = this.numberValue(node.stroke?.width, 1);
        const shape = this.svgShape(node, width, height, fill, stroke, strokeWidth, true);
        return `${pad}<svg className="${className}" style={${style}} viewBox="0 0 ${Math.max(1, Math.abs(width))} ${Math.max(1, Math.abs(height))}">\n${pad}  ${shape}\n${pad}</svg>`;
    }

    protected htmlSvgNode(node: OpenPencilNode, pad: string, style: string): string {
        const width = this.numberValue(node.width, 160);
        const height = this.numberValue(node.height, 120);
        const fill = node.fill?.[0]?.color ?? 'transparent';
        const stroke = node.stroke?.color ?? '#94a3b8';
        const strokeWidth = this.numberValue(node.stroke?.width, 1);
        const shape = this.svgShape(node, width, height, fill, stroke, strokeWidth, false);
        return `${pad}<svg style="${style}" viewBox="0 0 ${Math.max(1, Math.abs(width))} ${Math.max(1, Math.abs(height))}">\n${pad}  ${shape}\n${pad}</svg>`;
    }

    protected svgShape(node: OpenPencilNode, width: number, height: number, fill: string, stroke: string, strokeWidth: number, jsx: boolean): string {
        const strokeWidthAttribute = jsx ? 'strokeWidth' : 'stroke-width';
        const strokeLinecapAttribute = jsx ? 'strokeLinecap' : 'stroke-linecap';
        const close = ' />';
        if (node.type === 'ellipse') {
            return `<ellipse cx="${width / 2}" cy="${height / 2}" rx="${Math.abs(width) / 2}" ry="${Math.abs(height) / 2}" fill="${this.escapeAttribute(fill)}" stroke="${this.escapeAttribute(stroke)}" ${strokeWidthAttribute}="${strokeWidth}"${close}`;
        }
        if (node.type === 'line') {
            return `<line x1="0" y1="0" x2="${width}" y2="${height}" stroke="${this.escapeAttribute(stroke)}" ${strokeWidthAttribute}="${strokeWidth}" ${strokeLinecapAttribute}="round"${close}`;
        }
        if (node.type === 'polygon') {
            const points = (node.points?.length ? node.points : [
                { x: width / 2, y: 0 },
                { x: width, y: height },
                { x: 0, y: height }
            ]).map(point => `${point.x},${point.y}`).join(' ');
            return `<polygon points="${this.escapeAttribute(points)}" fill="${this.escapeAttribute(fill)}" stroke="${this.escapeAttribute(stroke)}" ${strokeWidthAttribute}="${strokeWidth}"${close}`;
        }
        const d = node.d || `M 0 ${height} C ${width * 0.25} 0 ${width * 0.75} 0 ${width} ${height}`;
        const fillRuleAttribute = jsx ? 'fillRule' : 'fill-rule';
        const fillRule = node.fillRule === 'evenodd' ? ` ${fillRuleAttribute}="evenodd"` : '';
        return `<path d="${this.escapeAttribute(d)}" fill="${this.escapeAttribute(fill)}"${fillRule} stroke="${this.escapeAttribute(stroke)}" ${strokeWidthAttribute}="${strokeWidth}"${close}`;
    }

    protected reactNativeStyle(node: OpenPencilNode): string {
        const width = this.numberValue(node.width, this.isTextLikeNode(node) ? 160 : 120);
        const height = this.numberValue(node.height, this.isTextLikeNode(node) ? 40 : 120);
        const entries = [
            `position: 'absolute'`,
            `left: ${this.numberValue(node.x, 0)}`,
            `top: ${this.numberValue(node.y, 0)}`,
            `width: ${width}`,
            `height: ${height}`
        ];
        if (typeof node.opacity === 'number' || typeof node.opacity === 'string') {
            entries.push(`opacity: ${this.numberValue(node.opacity, 1)}`);
        }
        if (typeof node.rotation === 'number' && node.rotation !== 0) {
            entries.push(`transform: [{ rotate: '${node.rotation}deg' }]`);
        }
        if (this.isTextLikeNode(node)) {
            entries.push(`color: '${this.escapeJsString(node.fill?.[0]?.color ?? '#111827')}'`);
            entries.push(`fontSize: ${node.fontSize ?? 16}`);
            entries.push(`fontWeight: '${this.escapeJsString(`${node.fontWeight ?? 400}`)}'`);
            if (node.textAlign) {
                entries.push(`textAlign: '${node.textAlign}'`);
            }
        } else if (node.type === 'image') {
            entries.push(`resizeMode: 'cover'`);
        } else {
            const fill = node.fill?.[0]?.color ?? (node.type === 'line' ? node.stroke?.color : undefined) ?? 'transparent';
            entries.push(`backgroundColor: '${this.escapeJsString(fill)}'`);
            const radius = node.type === 'ellipse' ? Math.max(width, height) / 2 : this.cornerRadiusValue(node);
            if (radius) {
                entries.push(`borderRadius: ${radius}`);
            }
            if (node.stroke) {
                entries.push(`borderWidth: ${this.numberValue(node.stroke.width, 1)}`);
                entries.push(`borderColor: '${this.escapeJsString(node.stroke.color ?? '#000000')}'`);
            }
        }
        return `{{ ${entries.join(', ')} }}`;
    }

    protected flutterDecoration(node: OpenPencilNode): string {
        const fill = node.fill?.[0]?.color ?? (node.type === 'line' ? node.stroke?.color : undefined) ?? 'transparent';
        const entries = [`color: ${this.dartColor(fill, 'transparent')}`];
        const radius = node.type === 'ellipse'
            ? Math.max(this.numberValue(node.width, 120), this.numberValue(node.height, 120)) / 2
            : this.cornerRadiusValue(node);
        if (radius) {
            entries.push(`borderRadius: BorderRadius.circular(${radius})`);
        }
        if (node.stroke) {
            entries.push(`border: Border.all(color: ${this.dartColor(node.stroke.color, '#94a3b8')}, width: ${this.numberValue(node.stroke.width, 1)})`);
        }
        return `BoxDecoration(${entries.join(', ')})`;
    }

    protected dartColor(value: string | undefined, fallback: string): string {
        return `Color(0x${this.hexArgb(value, fallback)})`;
    }

    protected dartFontWeight(value: number | string | undefined): string {
        const parsed = this.fontWeightNumber(value);
        return `FontWeight.w${parsed}`;
    }

    protected dartTextAlign(value: string | undefined): string {
        if (value === 'center' || value === 'right' || value === 'justify') {
            return `TextAlign.${value}`;
        }
        return 'TextAlign.left';
    }

    protected swiftUIModifiers(node: OpenPencilNode, width: number, height: number, x: number, y: number, indent: number): string {
        const pad = '    '.repeat(indent);
        const lines = [
            `${pad}    .frame(width: ${width}, height: ${height})`,
            `${pad}    .position(x: ${x}, y: ${y})`
        ];
        if (typeof node.opacity === 'number' || typeof node.opacity === 'string') {
            lines.push(`${pad}    .opacity(${this.numberValue(node.opacity, 1)})`);
        }
        if (typeof node.rotation === 'number' && node.rotation !== 0) {
            lines.push(`${pad}    .rotationEffect(.degrees(${node.rotation}))`);
        }
        return `\n${lines.join('\n')}`;
    }

    protected swiftUIFontWeight(value: number | string | undefined): string {
        const parsed = this.fontWeightNumber(value);
        if (parsed >= 800) {
            return '.heavy';
        }
        if (parsed >= 700) {
            return '.bold';
        }
        if (parsed >= 600) {
            return '.semibold';
        }
        if (parsed <= 300) {
            return '.light';
        }
        return '.regular';
    }

    protected swiftUIStroke(node: OpenPencilNode): string {
        if (!node.stroke) {
            return '';
        }
        const radius = this.cornerRadiusValue(node);
        return `\n${'    '.repeat(3)}    .overlay(RoundedRectangle(cornerRadius: ${radius}).stroke(${this.swiftColor(node.stroke.color, '#94a3b8')}, lineWidth: ${this.numberValue(node.stroke.width, 1)}))`;
    }

    protected swiftColor(value: string | undefined, fallback: string): string {
        const argb = this.hexArgb(value, fallback);
        const alpha = parseInt(argb.slice(0, 2), 16) / 255;
        const red = parseInt(argb.slice(2, 4), 16) / 255;
        const green = parseInt(argb.slice(4, 6), 16) / 255;
        const blue = parseInt(argb.slice(6, 8), 16) / 255;
        return `Color(red: ${red.toFixed(3)}, green: ${green.toFixed(3)}, blue: ${blue.toFixed(3)}, opacity: ${alpha.toFixed(3)})`;
    }

    protected composeModifier(node: OpenPencilNode, width: number, height: number): string {
        const radius = node.type === 'ellipse' ? Math.max(width, height) / 2 : this.cornerRadiusValue(node);
        const lines = [
            'Modifier',
            `            .offset(x = ${this.numberValue(node.x, 0)}.dp, y = ${this.numberValue(node.y, 0)}.dp)`,
            `            .size(${width}.dp, ${height}.dp)`
        ];
        if (!this.isTextLikeNode(node) && node.type !== 'image') {
            const fill = node.fill?.[0]?.color ?? (node.type === 'line' ? node.stroke?.color : undefined) ?? 'transparent';
            if (radius) {
                lines.push(`            .clip(RoundedCornerShape(${radius}.dp))`);
            }
            lines.push(`            .background(${this.composeColor(fill, 'transparent')})`);
            if (node.stroke) {
                lines.push(`            .border(${this.numberValue(node.stroke.width, 1)}.dp, ${this.composeColor(node.stroke.color, '#94a3b8')}${radius ? `, RoundedCornerShape(${radius}.dp)` : ''})`);
            }
        }
        return lines.join('\n');
    }

    protected composeColor(value: string | undefined, fallback: string): string {
        return `Color(0x${this.hexArgb(value, fallback)})`;
    }

    protected composeFontWeight(value: number | string | undefined): string {
        return `FontWeight.W${this.fontWeightNumber(value)}`;
    }

    protected fontWeightNumber(value: number | string | undefined): number {
        const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 400;
        if (!Number.isFinite(parsed)) {
            return 400;
        }
        return Math.max(100, Math.min(900, Math.round(parsed / 100) * 100));
    }

    protected cornerRadiusValue(node: OpenPencilNode): number {
        if (node.type === 'ellipse') {
            return Math.max(this.numberValue(node.width, 120), this.numberValue(node.height, 120)) / 2;
        }
        if (typeof node.cornerRadius === 'number') {
            return node.cornerRadius;
        }
        return Array.isArray(node.cornerRadius) ? node.cornerRadius[0] ?? 0 : 0;
    }

    protected hexArgb(value: string | undefined, fallback: string): string {
        const source = (value || fallback).trim().toLowerCase();
        if (source === 'transparent') {
            return '00000000';
        }
        const raw = source.startsWith('#') ? source.slice(1) : source;
        const hex = raw.length === 3
            ? raw.split('').map(character => `${character}${character}`).join('')
            : raw;
        if (/^[0-9a-f]{6}$/.test(hex)) {
            return `ff${hex}`;
        }
        if (/^[0-9a-f]{8}$/.test(hex)) {
            return hex;
        }
        return fallback === 'transparent' ? '00000000' : this.hexArgb(fallback, '#000000');
    }

    protected numberValue(value: number | string | undefined, fallback: number): number {
        const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseFloat(value) : NaN;
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    protected hyphenate(value: string): string {
        return value.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    }

    protected isRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    protected escapeHtml(value: string): string {
        return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    protected decodeHtml(value: string): string {
        return value
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
    }

    protected escapeAttribute(value: string): string {
        return this.escapeHtml(value).replace(/"/g, '&quot;');
    }

    protected escapeJsx(value: string): string {
        return this.escapeHtml(value).replace(/{/g, '&#123;').replace(/}/g, '&#125;');
    }

    protected escapeJsString(value: string): string {
        return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '\\r').replace(/\n/g, '\\n');
    }

    protected escapeDartString(value: string): string {
        return this.escapeJsString(value).replace(/\$/g, '\\$');
    }

    protected escapeDoubleQuotedString(value: string): string {
        return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n');
    }
}
