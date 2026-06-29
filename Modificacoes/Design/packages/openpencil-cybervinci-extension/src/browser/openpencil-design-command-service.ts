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

type OpenPencilAiSkeletonProfile = 'web-page' | 'app-screen' | 'component' | 'poster' | 'banner' | 'social' | 'wireframe' | 'diagram' | 'reference-board';

interface OpenPencilAiSkeletonProfileSettings {
    name: string;
    role: string;
    width: number;
    height: number;
    cornerRadius: number;
    fill: string;
    stroke: string;
    accent: string;
    foreground: string;
    muted: string;
}

interface OpenPencilVisibleBounds {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

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

export interface OpenPencilApplyOperationsOptions {
    mode?: OpenPencilAiDesignRequest['mode'];
    normalizeVisibleBounds?: boolean;
    preservePageWidth?: boolean;
    targetPageWidth?: number;
    requireVisibleContent?: boolean;
    removeAiPlaceholderSkeletons?: boolean;
}

export type OpenPencilAiImageMode = 'off' | 'search' | 'generate' | 'auto';

export interface OpenPencilAiImagePolicy {
    readonly mode: OpenPencilAiImageMode;
    readonly maxAssets?: number;
    readonly cacheImagesLocally?: boolean;
}

export interface OpenPencilAiDesignRequest {
    readonly prompt: string;
    readonly document: OpenPencilDocument;
    readonly selection: string[];
    readonly uri?: string;
    readonly mode?: 'generation' | 'maintenance' | 'continuation';
    readonly workspacePath?: string;
    readonly execution?: CyberVinciAiExecutionSelection;
    readonly imagePolicy?: OpenPencilAiImagePolicy;
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

export interface OpenPencilStabilizedOperationsResult {
    readonly operations: OpenPencilDesignOperation[];
    readonly diagnostics: string[];
    readonly skipped: number;
    readonly reordered: boolean;
    readonly skippedOperations: OpenPencilDesignOperation[];
}

interface OpenPencilProviderStreamTimeouts {
    readonly firstOperationMs: number;
    readonly idleMs: number;
    readonly totalMs: number;
}

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
            'The operations array must be non-empty and contain only OpenPencilDesignOperation objects.',
            'If time or model limits prevent a full design in one response, return the largest valid visible operation set you can, prioritizing a root frame with meaningful populated regions over a bare shell.',
            'A minimal skeleton is only a no-empty-output emergency fallback, not a complete answer for page, clone, reference, or detailed design requests.'
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
            'For generation, updateNode/replaceNode/move/resize/setSelection may only reference IDs that already exist in Document context or IDs created earlier in the same operations array. If you need a new ID, create it first with createNode/addNode and then update it only if needed.',
            'Do not guess existing IDs. New generated IDs are allowed, but every generated ID must be introduced by a createNode/addNode operation before any operation targets it.',
            'If uncertain about details, still return a valid visible first pass with meaningful content for the requested artifact; never return only reasoning, notes, diagnostics, or a bare placeholder shell.',
            'First infer the artifact type. Website/homepage rules apply only to web page, marketplace, landing page, e-commerce, or known-site page requests.',
            'For Figma-style references, posters, banners, social creatives, app screens, wireframes, diagrams, and isolated components, create a bounded artboard/composition and fill that frame instead of adding homepage scaffolding.',
            ...(request.mode === 'continuation' ? [
                'Continuation mode: preserve the current design, all existing nodes, and all existing node IDs.',
                'Continuation mode: do not remove, replace, or recreate existing page content; only add missing sections, missing states, or supporting elements.',
                'Continuation mode: for vertical web pages place new top-level content below the current content bottom; for bounded artifacts refine inside visible empty space in the active artboard. Avoid covering existing nodes.',
                'Continuation mode: if the current page is only a header, navigation row, hero, or sparse shell, emit at least one substantial visible body section/module before complete. Do not emit only root resize/updatePage/setSelection operations.',
                'Continuation mode: finish with setSelection for the newly-created root node IDs so the user can inspect the continuation.'
            ] : []),
            'When a request asks for multiple independent views, such as desktop and mobile, create separate top-level frames and place them side by side inside the page with a clear gap; scale them uniformly if needed, never overlap or clip them.',
            'For editable page designs, top-level view frames should usually use layout:"none" or omit layout and rely on numeric x/y/width/height. Use layout:"vertical" or layout:"horizontal" only for internal stacks where children should remain auto-positioned.',
            'For a website, homepage, marketplace, e-commerce, or known-site copy, create one vertical page frame about 1200px wide and as tall as needed. Preserve that width and stack all major sections downward.',
            'For full page or page-reference generation, a header/navigation/hero-only result is incomplete. Before finalizing, include multiple substantial body sections/modules implied by the requested artifact category, with repeated cards/items where relevant and closing/support content when appropriate.',
            'Do not satisfy page completeness by only increasing the root/page frame height or background area. Add visible sections, cards, text, controls, and visuals inside the page frame.',
            'When the requested web page includes product rows, offer strips, category shelves, or carousels, keep cards inside the 1200px page width. If more items are needed, create another row or another section below; never extend the page horizontally.',
            'For nested nodes, x and y are relative to the parent. Do not use global canvas coordinates for children inside a frame; convert them into the parent coordinate space so children stay inside their parent.',
            'For page-like artifacts, major sibling sections should share a bounded content width and stack downward. Do not place separate page sections side by side unless the user explicitly asks for multiple views.',
            'For homepage-style output, use real section frames with padding/gap/layout to create spacing. Do not create spacer-only nodes named Spacer, Espaço, Space, Gap, or "before/after" blocks.',
            'For explicitly requested marketplace/e-commerce/product shelves, create shelf sections that wrap cards inside the page width. A shelf should not be a single horizontal layout that extends beyond the page.',
            'For explicitly requested desktop marketplace/e-commerce shelves, prefer 3-4 visible product cards per row when card details are large. Keep every text box, icon, image, and shape inside its card or section bounds.',
            'Never include editor-shell placeholder copy in the design, including text such as "Edit this embedded .op design inside Theia."',
            'When a page row contains header, search, or navigation content, allocate explicit widths for logo, search, links, location, and account actions. Do not give multiple header texts the full row width.',
            'For every row frame, each child must have a distinct non-overlapping x position. Never leave multiple row children at x:0 unless they are intentionally stacked in different y rows.',
            'For cards with a visual/icon/image and text copy, place the visual and copy in separate vertical or horizontal regions; never put an image placeholder over the text block.',
            'If the user asks to copy or recreate a full page, include the complete structure implied by that page category: top navigation or entry point, primary content, repeated modules when relevant, supporting/detail regions, and footer-like closing content when present. Do not hard-code any site-specific template; infer the structure from the request and current/reference context.',
            'For marketplace/e-commerce pages only when requested, use a centered vertical feed with search/navigation, promo or hero area, category shortcuts, wrapped product shelves, promotional/support modules, recommendations, and closing/help blocks as appropriate.',
            this.formatAiImagePolicyPrompt(request.imagePolicy),
            'Use role:"overlay" for a child that must be manually positioned inside a layout frame. Otherwise x/y on children of layout frames will be treated as auto-layout input and may be recalculated.',
            'Do not set clipContent:true on top-level views or general containers unless the user explicitly asks for masking/cropping. The canvas is unbounded; do not create invisible frames as canvas limits.',
            'Every frame, group, card, section, and top-level view must have bounds large enough to contain every visible child. Before adding a child with x/y/width/height, make sure parent width/height already contains the child.',
            'During incremental generation, never rely on hidden overflow or a later final pass to reveal content. If a later child needs more space, resize or update the parent in the same step so the whole design remains visible while streaming.',
            'Use OpenPencil property names exactly: text nodes use content, shapes use fill:[{type:"solid",color:"#..."}], stroke uses {color,width,thickness}, rounded corners use cornerRadius, and sizes/positions use numeric x,y,width,height.',
            'Do not emit CSS property names such as backgroundColor, borderRadius, position, display, left, top, color, or font-weight; map them to OpenPencil node properties instead.',
            'Readability and contrast are mandatory: text must contrast with the nearest background; never place dark text on dark backgrounds or light text on light backgrounds. If a background is dark, use light text; if a background is light, use dark text.',
            'If the prompt asks for a known site, app, product, or design-reference style, capture its visible structure and interaction patterns without copying trademarks or exact assets.',
            `User request: ${request.prompt}`,
            `Target URI: ${request.uri ?? 'active OpenPencil editor'}`,
            `Phase: ${context.phase}`,
            `Document context: ${JSON.stringify(context.documentContext)}`,
            `Relevant design guidance: ${this.formatCompactAiSkillPrompt(context.skills)}`,
            `Valid operation examples: ${JSON.stringify(context.operationExamples)}`
        ].join('\n');
    }

    protected formatAiImagePolicyPrompt(policy: OpenPencilAiImagePolicy | undefined): string {
        const maxAssets = policy?.maxAssets ?? 12;
        switch (policy?.mode ?? 'off') {
            case 'search':
                return `Image mode: search real images. Create image nodes for product, banner, hero, avatar, and category visuals when useful. Use a real https src only when the provider can confidently identify a direct image URL; otherwise include imageSearchQuery. Keep at most ${maxAssets} image assets and keep every image inside its parent card, banner, or section.`;
            case 'generate':
                return `Image mode: generate images. Create image nodes with precise imagePrompt values for product, banner, hero, avatar, and category visuals. Do not invent image URLs; include src only if the selected provider actually returns an accessible generated image URL. Keep at most ${maxAssets} image assets and reserve exact bounds for every image.`;
            case 'auto':
                return `Image mode: auto. Prefer real searched images for recognizable products or categories; use generated-image prompts for abstract or missing visuals. Add imageSearchQuery and/or imagePrompt to image nodes, include src only for real accessible URLs, and keep at most ${maxAssets} image assets.`;
            case 'off':
            default:
                return 'Image mode: off. Use well-sized image placeholders or icon/shape visuals only; do not invent image URLs.';
        }
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
    applyOperationsToDocument(document: OpenPencilDocument, selection: string[], operations: OpenPencilDesignOperation[], options?: OpenPencilApplyOperationsOptions): OpenPencilCommandResult;
    stabilizeAiOperationsForDocument(document: OpenPencilDocument, selection: string[], operations: OpenPencilDesignOperation[], options?: OpenPencilApplyOperationsOptions): OpenPencilStabilizedOperationsResult;
    parseBatchDesignDsl(dsl: string): OpenPencilBatchDesignDslCommand[];
    applyBatchDesignDsl(document: OpenPencilDocument, selection: string[], dsl: string): OpenPencilCommandResult;
    getDocumentSummary(document: OpenPencilDocument): OpenPencilDocumentSummary;
    validateDocument(document: OpenPencilDocument): OpenPencilValidationResult;
    validateAiLayoutQuality(document: OpenPencilDocument, options?: OpenPencilApplyOperationsOptions): OpenPencilValidationResult;
    generateAiOperations(request: OpenPencilAiDesignRequest): Promise<OpenPencilAiDesignResult>;
    streamAiOperations(request: OpenPencilAiDesignRequest, apply: OpenPencilAiDesignStreamApply): Promise<OpenPencilAiDesignResult>;
    exportDocument(document: OpenPencilDocument, selection: string[], format: OpenPencilExportFormat, selectionOnly?: boolean): string;
    importDocument(source: string, name?: string): OpenPencilDocument;
}

@injectable()
export class OpenPencilDesignCommandServiceImpl implements OpenPencilDesignCommandService {

    protected readonly documents = new OpenPencilDocumentService();
    protected readonly sessions = new Map<string, OpenPencilDesignSession>();
    protected readonly providerGenerateTimeoutMs: number = 300000;
    protected readonly providerStreamFirstOperationTimeoutMs: number = 60000;
    protected readonly providerStreamIdleTimeoutMs: number = 120000;
    protected readonly providerStreamTotalTimeoutMs: number = 600000;
    protected readonly providerRouterGenerateTimeoutMs: number = 90000;
    protected readonly providerRouterStreamFirstOperationTimeoutMs: number = 90000;
    protected readonly providerRouterStreamIdleTimeoutMs: number = 45000;
    protected readonly providerRouterStreamTotalTimeoutMs: number = 360000;
    protected readonly providerSlowRouterGenerateTimeoutMs: number = 240000;
    protected readonly providerSlowRouterStreamFirstOperationTimeoutMs: number = 150000;
    protected readonly providerSlowRouterStreamIdleTimeoutMs: number = 75000;
    protected readonly providerSlowRouterStreamTotalTimeoutMs: number = 420000;

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

    applyOperationsToDocument(document: OpenPencilDocument, selection: string[], operations: OpenPencilDesignOperation[], options?: OpenPencilApplyOperationsOptions): OpenPencilCommandResult {
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
        if (options?.normalizeVisibleBounds && this.normalizeDocumentVisibleBounds(currentDocument, options)) {
            changed = true;
        }
        if (options?.mode !== 'continuation' && !options?.preservePageWidth && this.arrangeCreatedRootViews(currentDocument, createdRootViewIds)) {
            changed = true;
        }

        return {
            document: currentDocument,
            selection: currentSelection,
            changed,
            message: messages.length ? messages.join('\n') : undefined
        };
    }

    stabilizeAiOperationsForDocument(document: OpenPencilDocument, selection: string[], operations: OpenPencilDesignOperation[], options?: OpenPencilApplyOperationsOptions): OpenPencilStabilizedOperationsResult {
        type PendingOperation = {
            readonly operation: OpenPencilDesignOperation;
            readonly originalIndex: number;
            readonly message?: string;
        };
        const accepted: PendingOperation[] = [];
        let pending: PendingOperation[] = operations.map((operation, originalIndex) => ({ operation, originalIndex }));
        let currentDocument = this.documents.cloneDocument(document);
        let currentSelection = [...selection];
        const diagnostics: string[] = [];
        let skipped = 0;
        let skippedOperations: OpenPencilDesignOperation[] = [];

        while (pending.length) {
            const nextPending: PendingOperation[] = [];
            let progressed = false;

            for (const candidate of pending) {
                const result = this.applyOperationsToDocument(currentDocument, currentSelection, [candidate.operation], options);
                if (!result.message) {
                    accepted.push(candidate);
                    currentDocument = result.document;
                    currentSelection = result.selection;
                    progressed = true;
                    continue;
                }
                if (this.isRecoverableAiOperationMessage(result.message)) {
                    nextPending.push({
                        ...candidate,
                        message: result.message
                    });
                    continue;
                }
                accepted.push(candidate);
                diagnostics.push(`Kept operation ${candidate.originalIndex + 1}/${operations.length} with non-recoverable validation message: ${result.message}`);
            }

            if (!nextPending.length) {
                pending = [];
                break;
            }
            if (!progressed) {
                skipped = nextPending.length;
                skippedOperations = nextPending.map(candidate => candidate.operation);
                for (const candidate of nextPending) {
                    diagnostics.push(`Skipped operation ${candidate.originalIndex + 1}/${operations.length}: ${candidate.message ?? 'operation target was not available'}`);
                }
                pending = [];
                break;
            }
            pending = nextPending;
        }

        return {
            operations: accepted.map(candidate => candidate.operation),
            diagnostics,
            skipped,
            reordered: accepted.some((candidate, index) => candidate.originalIndex !== index),
            skippedOperations
        };
    }

    protected isRecoverableAiOperationMessage(message: string): boolean {
        return /^(?:Parent node|Node|Path|Page|Variable|Theme axis) '[^']+' was not found\.$/.test(message.trim());
    }

    /**
     * True when the failure is the selected provider's CLI/runtime backend failing to start or
     * stay available (e.g. Codex app-server exiting, sqlite/disk I/O errors, locked state DB,
     * connection refused) rather than a design/generation problem. Retrying the same backend
     * (streaming recovery, batch self-correction) only repeats the same failure, so callers
     * should fail fast with an actionable message instead of grinding through retries.
     */
    protected isProviderBackendUnavailableError(message: string | undefined): boolean {
        if (!message) {
            return false;
        }
        return /app-server exited|failed to initialize|state runtime|disk i\/o error|database is locked|database disk image is malformed|sqlite|econnrefused|connection refused|spawn .*enoent|exited with code\s*\d|is not available|not authenticated|unauthorized|rate limit|quota/i.test(message);
    }

    protected providerBackendUnavailableMessage(providerName: string, errorMessage: string): string {
        return `${providerName} backend did not start (this is a provider/runtime problem, not a design error): ${errorMessage} | Close other sessions using the same provider, ensure it is authenticated and has free disk space, clear its local state if it stays locked, then retry.`;
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

    validateAiLayoutQuality(document: OpenPencilDocument, options: OpenPencilApplyOperationsOptions = {}): OpenPencilValidationResult {
        const issues: OpenPencilValidationResult['issues'] = [];
        const page = this.documents.getActivePage(document);
        if (options.requireVisibleContent !== false && !this.hasVisibleAiPageContent(document)) {
            issues.push({
                severity: 'error',
                path: `pages.${page.id}`,
                message: 'AI result contains no visible renderable canvas content.'
            });
        }

        const pageWidth = options.preservePageWidth
            ? this.numberValue(page.width, options.targetPageWidth ?? 1200)
            : this.numericDimensionValue(page.width);
        const pageHeight = this.numericDimensionValue(page.height);
        this.collectAiLayoutQualityIssues(page.children ?? [], {
            path: `pages.${page.id}.children`,
            width: pageWidth,
            height: pageHeight,
            pageRoot: true,
            verticalPageFlow: options.preservePageWidth === true
        }, issues);

        return {
            valid: !issues.some(issue => issue.severity === 'error'),
            issues
        };
    }

    async generateAiOperations(request: OpenPencilAiDesignRequest): Promise<OpenPencilAiDesignResult> {
        const context = this.createAiSkillContext(request);
        const diagnostics: string[] = [];
        const providers = this.resolveAiProviders(request);
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
                const generateTimeoutMs = this.resolveProviderGenerateTimeoutMs(request);
                const providerResponse = await this.withProviderGenerateTimeout(
                    Promise.resolve(provider.generateOperations(request, context)),
                    generateTimeoutMs,
                    this.formatProviderGenerateTimeoutMessage(providerName, generateTimeoutMs)
                );
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
                    const stabilized = this.stabilizeProviderAiOperationsForRequest(normalizedOperations, request, providerName);
                    diagnostics.push(...stabilized.diagnostics);
                    const previewDiagnostic = stabilized.diagnostic ?? this.validateAiOperationsPreview(stabilized.operations, request, providerName);
                    if (previewDiagnostic) {
                        diagnostics.push(previewDiagnostic);
                        canvasAiFrontendDebug('provider-rejected', {
                            ...providerDetails,
                            reason: 'preview-validation',
                            operationsCount: stabilized.operations.length,
                            diagnosticsCount: diagnostics.length
                        });
                        const selfCorrected = await this.tryProviderAiSelfCorrection(provider, providerName, request, previewDiagnostic, normalizedOperations, diagnostics);
                        if (selfCorrected) {
                            canvasAiFrontendDebug('provider-self-correction-accepted', {
                                ...providerDetails,
                                operationsCount: selfCorrected.operations.length,
                                diagnosticsCount: diagnostics.length
                            });
                            return selfCorrected;
                        }
                        continue;
                    }
                    canvasAiFrontendDebug('provider-accepted', {
                        ...providerDetails,
                        operationsCount: stabilized.operations.length,
                        diagnosticsCount: diagnostics.length
                    });
                    return {
                        operations: stabilized.operations,
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
                        diagnosticsCount: diagnostics.length,
                        operationSample: this.summarizeAiRejectedOperation(providerOperations[0])
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
                    messageLength: error instanceof Error ? error.message.length : String(error).length,
                    message: error instanceof Error ? error.message : String(error)
                });
            }
        }
        const failureMessage = this.createPageLevelAiFailureMessage(providers, diagnostics, providerReturnedOperations);
        diagnostics.push(failureMessage);
        const fallbackOperations = this.createValidatedDeterministicSkeletonFallbackOperations(request, context, diagnostics);
        if (fallbackOperations.length) {
            canvasAiFrontendDebug('deterministic-skeleton-fallback', {
                providersCount: providers.length,
                providerReturnedOperations,
                operationsCount: fallbackOperations.length,
                diagnosticsCount: diagnostics.length
            });
            return {
                operations: fallbackOperations,
                context,
                source: 'deterministic-fallback',
                diagnostics
            };
        }
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

    protected stabilizeProviderAiOperationsForRequest(
        operations: OpenPencilDesignOperation[],
        request: OpenPencilAiDesignRequest,
        providerName: string
    ): { operations: OpenPencilDesignOperation[]; diagnostics: string[]; diagnostic?: string; skippedOperations?: OpenPencilDesignOperation[] } {
        const continuationSafe = this.sanitizeContinuationAiOperationsForRequest(operations, request, providerName);
        const stabilized = this.stabilizeAiOperationsForDocument(this.documents.cloneDocument(request.document), request.selection, continuationSafe.operations, {
            mode: request.mode,
            normalizeVisibleBounds: true,
            preservePageWidth: this.shouldPreservePageWidthForAiPrompt(request.prompt),
            targetPageWidth: this.aiPromptTargetPageWidth(request.prompt)
        });
        const diagnostics = [
            ...continuationSafe.diagnostics,
            ...stabilized.diagnostics.map(diagnostic => `${providerName} operation stabilization: ${diagnostic}`)
        ];
        if (stabilized.skipped > 0) {
            return {
                operations: stabilized.operations,
                diagnostics,
                diagnostic: `${providerName} operations were rejected because ${stabilized.skipped} operation${stabilized.skipped === 1 ? '' : 's'} still referenced unavailable nodes or parents after local ID repair. ${diagnostics.slice(0, 2).join(' ')}`,
                skippedOperations: stabilized.skippedOperations
            };
        }
        if (stabilized.reordered) {
            diagnostics.push(`${providerName} operation stabilization reordered dependent operations so created IDs exist before later updates.`);
        }
        return {
            operations: stabilized.operations,
            diagnostics
        };
    }

    protected sanitizeContinuationAiOperationsForRequest(
        operations: OpenPencilDesignOperation[],
        request: OpenPencilAiDesignRequest,
        providerName: string
    ): { operations: OpenPencilDesignOperation[]; diagnostics: string[] } {
        if (request.mode !== 'continuation' || !operations.length) {
            return { operations, diagnostics: [] };
        }
        const existingNodes = new Map(this.documents.flattenNodes(request.document).map(node => [node.id, node] as const));
        const createdNodeIds = new Set<string>();
        const sanitized: OpenPencilDesignOperation[] = [];
        const diagnostics: string[] = [];

        for (const [index, operation] of operations.entries()) {
            if (this.isProviderAiCreateOperation(operation)) {
                if (typeof operation.node.id === 'string' && operation.node.id) {
                    createdNodeIds.add(operation.node.id);
                }
                sanitized.push(operation);
                continue;
            }
            if (operation.operation === 'setSelection') {
                sanitized.push(operation);
                continue;
            }
            if (operation.operation === 'updateNode') {
                if (createdNodeIds.has(operation.nodeId) || !existingNodes.has(operation.nodeId)) {
                    sanitized.push(operation);
                    continue;
                }
                const safeChanges = this.safeContinuationExistingNodeUpdateChanges(operation, existingNodes.get(operation.nodeId));
                if (safeChanges) {
                    sanitized.push({
                        ...operation,
                        changes: safeChanges
                    });
                    const originalKeys = Object.keys(operation.changes as Record<string, unknown>);
                    const safeKeys = Object.keys(safeChanges as Record<string, unknown>);
                    if (safeKeys.length < originalKeys.length) {
                        diagnostics.push(`${providerName} continuation stabilization kept safe expansion keys for updateNode '${operation.nodeId}' and ignored unsafe keys: ${originalKeys.filter(key => !safeKeys.includes(key)).join(', ') || 'none'}.`);
                    }
                } else {
                    diagnostics.push(`${providerName} continuation stabilization skipped unsafe updateNode '${operation.nodeId}' at operation ${index + 1}/${operations.length}.`);
                }
                continue;
            }
            if (this.isContinuationDestructiveOperation(operation, existingNodes, createdNodeIds)) {
                diagnostics.push(`${providerName} continuation stabilization skipped destructive '${operation.operation}' at operation ${index + 1}/${operations.length}.`);
                continue;
            }
            sanitized.push(operation);
        }

        return { operations: sanitized, diagnostics };
    }

    protected safeContinuationExistingNodeUpdateChanges(
        operation: Extract<OpenPencilDesignOperation, { operation: 'updateNode' }>,
        existing: OpenPencilNode | undefined
    ): OpenPencilNodeChanges | undefined {
        if (!existing) {
            return undefined;
        }
        const changes = operation.changes as Record<string, unknown>;
        const safeChanges: Record<string, unknown> = {};
        if ('height' in changes) {
            const nextHeight = this.numberValue(changes.height as number | string | undefined, NaN);
            const currentHeight = this.numericDimensionValue(existing.height);
            if (Number.isFinite(nextHeight) && currentHeight !== undefined && nextHeight >= currentHeight) {
                safeChanges.height = changes.height;
            }
        }
        if ('width' in changes) {
            const nextWidth = this.numberValue(changes.width as number | string | undefined, NaN);
            const currentWidth = this.numericDimensionValue(existing.width);
            if (Number.isFinite(nextWidth) && currentWidth !== undefined && nextWidth >= currentWidth) {
                safeChanges.width = changes.width;
            }
        }
        if ('clipContent' in changes && changes.clipContent === false) {
            safeChanges.clipContent = false;
        }
        return Object.keys(safeChanges).length ? safeChanges as OpenPencilNodeChanges : undefined;
    }

    protected async tryProviderAiSelfCorrection(
        provider: OpenPencilAiDesignProvider,
        providerName: string,
        request: OpenPencilAiDesignRequest,
        validationDiagnostic: string,
        rejectedOperations: OpenPencilDesignOperation[],
        diagnostics: string[]
    ): Promise<OpenPencilAiDesignResult | undefined> {
        if (!this.shouldRetryProviderAiSelfCorrection(request, validationDiagnostic)) {
            return undefined;
        }
        const retryRequest = this.createProviderAiSelfCorrectionRequest(request, validationDiagnostic, rejectedOperations);
        const retryContext = this.createAiSkillContext(retryRequest);
        diagnostics.push(`${providerName}: retrying once with Canvas ID repair diagnostics and the current document ID inventory.`);
        try {
            const generateTimeoutMs = this.resolveProviderGenerateTimeoutMs(retryRequest);
            const providerResponse = await this.withProviderGenerateTimeout(
                Promise.resolve(provider.generateOperations(retryRequest, retryContext)),
                generateTimeoutMs,
                this.formatProviderGenerateTimeoutMessage(`${providerName} self-correction`, generateTimeoutMs)
            );
            diagnostics.push(...this.providerDiagnostics(providerResponse, `${providerName} self-correction`));
            const providerOperations = this.providerOperations(providerResponse);
            if (!providerOperations?.length) {
                diagnostics.push(`${providerName} self-correction returned no OpenPencil operations.`);
                return undefined;
            }
            if (!providerOperations.every(operation => this.isDesignOperationLike(operation))) {
                diagnostics.push(`${providerName} self-correction returned operations that do not match the OpenPencil structured operation contract.`);
                canvasAiFrontendDebug('provider-self-correction-rejected', {
                    providerId: provider.id,
                    providerLabel: provider.label,
                    reason: 'invalid-operations',
                    operationsCount: providerOperations.length,
                    operationSample: this.summarizeAiRejectedOperation(providerOperations[0])
                });
                return undefined;
            }
            const normalizedOperations = this.normalizeProviderAiOperations(providerOperations, retryRequest);
            const stabilized = this.stabilizeProviderAiOperationsForRequest(normalizedOperations, retryRequest, `${providerName} self-correction`);
            diagnostics.push(...stabilized.diagnostics);
            const previewDiagnostic = stabilized.diagnostic ?? this.validateAiOperationsPreview(stabilized.operations, retryRequest, `${providerName} self-correction`);
            if (previewDiagnostic) {
                diagnostics.push(previewDiagnostic);
                canvasAiFrontendDebug('provider-self-correction-rejected', {
                    providerId: provider.id,
                    providerLabel: provider.label,
                    reason: 'preview-validation',
                    operationsCount: stabilized.operations.length,
                    diagnosticsCount: diagnostics.length
                });
                return undefined;
            }
            return {
                operations: stabilized.operations,
                context: retryContext,
                source: 'provider',
                providerId: provider.id,
                providerLabel: provider.label ?? provider.id,
                diagnostics
            };
        } catch (error) {
            diagnostics.push(`${providerName} self-correction failed: ${error instanceof Error ? error.message : String(error)}`);
            return undefined;
        }
    }

    protected shouldRetryProviderAiSelfCorrection(request: OpenPencilAiDesignRequest, diagnostic: string): boolean {
        if (request.selection.length || !this.isPageLevelAiPrompt(request.prompt) || /Canvas self-correction retry/i.test(request.prompt)) {
            return false;
        }
        return /\b(not found|missing-parent|unavailable nodes|did not change|preview validation|layout quality)\b/i.test(diagnostic);
    }

    protected createProviderAiSelfCorrectionRequest(
        request: OpenPencilAiDesignRequest,
        validationDiagnostic: string,
        rejectedOperations: OpenPencilDesignOperation[]
    ): OpenPencilAiDesignRequest {
        const existingIds = this.documents.flattenNodes(request.document).map(node => node.id).slice(0, 160);
        const createdIds = [...this.collectProviderAiCreatedNodeIds(rejectedOperations)].slice(0, 160);
        const missingIds = this.extractMissingNodeIdsFromDiagnostic(validationDiagnostic).slice(0, 40);
        const retryPrompt = [
            request.prompt,
            '',
            'Canvas self-correction retry:',
            `The previous OpenPencil operations failed preview validation: ${validationDiagnostic}`,
            existingIds.length ? `Existing node IDs in the current document: ${existingIds.join(', ')}` : 'The current document has no existing canvas node IDs.',
            createdIds.length ? `IDs created by your previous operations: ${createdIds.join(', ')}` : 'Your previous operations did not create reusable IDs before referencing them.',
            missingIds.length ? `IDs that were referenced before they existed: ${missingIds.join(', ')}` : undefined,
            'Return a corrected complete operations array for the same user request.',
            'For every new generated ID, emit createNode/addNode before any updateNode, replaceNode, moveNode, resizeNode, moveToParent, reorder, or setSelection references that ID.',
            'If you used new IDs, create those exact IDs first with proper type, bounds, parentId, and children/positioning. Do not target guessed IDs as if they already existed.',
            'Keep the intended visual quality, layout, z-order, and artifact type. Do not replace the design with a generic fallback.'
        ].filter((line): line is string => !!line).join('\n');
        return {
            ...request,
            prompt: retryPrompt
        };
    }

    protected async tryProviderAiStreamingRecovery(
        provider: OpenPencilAiDesignProvider,
        providerName: string,
        request: OpenPencilAiDesignRequest,
        diagnostics: string[],
        reason: string | undefined,
        rejectedOperations: OpenPencilDesignOperation[] = []
    ): Promise<OpenPencilAiDesignResult | undefined> {
        if (/Canvas streaming recovery retry/i.test(request.prompt)) {
            return undefined;
        }
        if (this.isProviderBackendUnavailableError(reason)) {
            diagnostics.push(`${providerName}: skipping batch recovery because the provider backend is unavailable; retrying it would repeat the same failure.`);
            return undefined;
        }
        const recoveryRequest = this.createProviderAiStreamingRecoveryRequest(request, reason, rejectedOperations);
        const recoveryContext = this.createAiSkillContext(recoveryRequest);
        diagnostics.push(`${providerName}: retrying once with batch structured-output recovery because streaming did not produce usable OpenPencil operations.`);
        try {
            const generateTimeoutMs = this.resolveProviderGenerateTimeoutMs(recoveryRequest);
            const providerResponse = await this.withProviderGenerateTimeout(
                Promise.resolve(provider.generateOperations(recoveryRequest, recoveryContext)),
                generateTimeoutMs,
                this.formatProviderGenerateTimeoutMessage(`${providerName} streaming recovery`, generateTimeoutMs)
            );
            diagnostics.push(...this.providerDiagnostics(providerResponse, `${providerName} streaming recovery`));
            const providerOperations = this.providerOperations(providerResponse);
            if (!providerOperations?.length) {
                diagnostics.push(`${providerName} streaming recovery returned no OpenPencil operations.`);
                return undefined;
            }
            if (!providerOperations.every(operation => this.isDesignOperationLike(operation))) {
                diagnostics.push(`${providerName} streaming recovery returned operations that do not match the OpenPencil structured operation contract.`);
                canvasAiFrontendDebug('provider-streaming-recovery-rejected', {
                    providerId: provider.id,
                    providerLabel: provider.label,
                    reason: 'invalid-operations',
                    operationsCount: providerOperations.length,
                    operationSample: this.summarizeAiRejectedOperation(providerOperations[0])
                });
                return undefined;
            }
            const normalizedOperations = this.normalizeProviderAiOperations(providerOperations, recoveryRequest);
            const stabilized = this.stabilizeProviderAiOperationsForRequest(normalizedOperations, recoveryRequest, `${providerName} streaming recovery`);
            diagnostics.push(...stabilized.diagnostics);
            const previewDiagnostic = stabilized.diagnostic ?? this.validateAiOperationsPreview(stabilized.operations, recoveryRequest, `${providerName} streaming recovery`);
            if (previewDiagnostic) {
                diagnostics.push(previewDiagnostic);
                canvasAiFrontendDebug('provider-streaming-recovery-rejected', {
                    providerId: provider.id,
                    providerLabel: provider.label,
                    reason: 'preview-validation',
                    operationsCount: stabilized.operations.length,
                    diagnosticsCount: diagnostics.length,
                    diagnostic: previewDiagnostic.slice(0, 500)
                });
                return undefined;
            }
            return {
                operations: stabilized.operations,
                context: recoveryContext,
                source: 'provider',
                providerId: provider.id,
                providerLabel: provider.label ?? provider.id,
                diagnostics
            };
        } catch (error) {
            diagnostics.push(`${providerName} streaming recovery failed: ${error instanceof Error ? error.message : String(error)}`);
            return undefined;
        }
    }

    protected createProviderAiStreamingRecoveryRequest(
        request: OpenPencilAiDesignRequest,
        reason: string | undefined,
        rejectedOperations: OpenPencilDesignOperation[]
    ): OpenPencilAiDesignRequest {
        const existingIds = this.documents.flattenNodes(request.document).map(node => node.id).slice(0, 180);
        const createdIds = [...this.collectProviderAiCreatedNodeIds(rejectedOperations)].slice(0, 180);
        const retryPrompt = [
            request.prompt,
            '',
            'Canvas streaming recovery retry:',
            reason ? `The previous streaming attempt could not be applied: ${reason}` : 'The previous streaming attempt ended without usable newline-delimited OpenPencil operations.',
            existingIds.length ? `Existing node IDs in the current document: ${existingIds.join(', ')}` : 'The current document has no existing canvas node IDs.',
            createdIds.length ? `IDs created or attempted by the previous streaming operations: ${createdIds.join(', ')}` : 'The previous streaming attempt did not create reusable IDs before completion.',
            'Return exactly one JSON object with contract "openpencil.design-operations.v1" and a non-empty operations array.',
            'Do not return prose, explanations, Markdown, HTML, CSS, plans, diagnostics-only output, or local fallback placeholder content.',
            'Do not reduce quality or replace the request with a generic fallback. Continue the same requested artifact.',
            'Every new ID must be introduced by createNode/addNode before it is referenced by updateNode, replaceNode, moveNode, resizeNode, moveToParent, reorder, or setSelection.',
            'Do not target guessed IDs as if they already existed. Use existing IDs only from the inventory above, or create new IDs before referencing them.',
            'Create parents before children. Nested x/y coordinates are parent-relative, not global page coordinates.',
            'For page-like artifacts, use one bounded vertical page frame and stack major sections downward inside that shared width. Only grids, rows, cards, and controls inside a section may be horizontal.',
            'For bounded non-page artifacts, keep all elements inside the artboard/composition bounds instead of appending homepage sections.',
            'Keep z-order readable: foreground text/icons/controls before cards/media and cards/media before backgrounds/containers in OpenPencil front-to-back child order.',
            'The corrected operations must pass preview validation with visible content, no missing IDs, no off-page children, and no overlapping text.'
        ].join('\n');
        return {
            ...request,
            prompt: retryPrompt
        };
    }

    protected extractMissingNodeIdsFromDiagnostic(diagnostic: string): string[] {
        const ids: string[] = [];
        const pattern = /(?:Node|Parent node|Page|Path|Variable|Theme axis) '([^']+)' was not found/g;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(diagnostic))) {
            ids.push(match[1]);
        }
        return [...new Set(ids)];
    }

    protected resolveProviderGenerateTimeoutMs(request: OpenPencilAiDesignRequest): number {
        if (this.isIncrementalAiStageRequest(request)) {
            return this.isSlowRouterExecution(request) ? 150000 : this.isRouterExecution(request) ? 60000 : this.providerGenerateTimeoutMs;
        }
        if (this.isSlowRouterExecution(request)) {
            return this.providerSlowRouterGenerateTimeoutMs;
        }
        if (this.isRouterExecution(request)) {
            return this.providerRouterGenerateTimeoutMs;
        }
        return this.providerGenerateTimeoutMs;
    }

    protected resolveProviderStreamTimeouts(request: OpenPencilAiDesignRequest): OpenPencilProviderStreamTimeouts {
        if (this.isIncrementalAiStageRequest(request)) {
            if (this.isSlowRouterExecution(request)) {
                return {
                    firstOperationMs: 150000,
                    idleMs: 60000,
                    totalMs: 300000
                };
            }
            if (this.isRouterExecution(request)) {
                return {
                    firstOperationMs: 35000,
                    idleMs: 25000,
                    totalMs: 80000
                };
            }
        }
        if (this.isSlowRouterExecution(request)) {
            return {
                firstOperationMs: this.providerSlowRouterStreamFirstOperationTimeoutMs,
                idleMs: this.providerSlowRouterStreamIdleTimeoutMs,
                totalMs: this.providerSlowRouterStreamTotalTimeoutMs
            };
        }
        if (this.isRouterExecution(request)) {
            return {
                firstOperationMs: this.providerRouterStreamFirstOperationTimeoutMs,
                idleMs: this.providerRouterStreamIdleTimeoutMs,
                totalMs: this.providerRouterStreamTotalTimeoutMs
            };
        }
        return {
            firstOperationMs: this.providerStreamFirstOperationTimeoutMs,
            idleMs: this.providerStreamIdleTimeoutMs,
            totalMs: this.providerStreamTotalTimeoutMs
        };
    }

    protected isIncrementalAiStageRequest(request: OpenPencilAiDesignRequest): boolean {
        return /\bIncremental stage\s+\d+\/\d+\b/i.test(request.prompt);
    }

    protected isSlowRouterExecution(request: OpenPencilAiDesignRequest): boolean {
        const execution = request.execution;
        const provider = this.executionProviderKey(request);
        const model = (execution?.model ?? '').toLowerCase();
        return provider === 'opencode'
            || provider === 'opencode-go'
            || model.includes('deepseek')
            || model.includes(':free')
            || model.includes('-free')
            || model.includes('free/')
            || model.includes('big-pickle')
            || model.includes('minimax')
            || model.includes('qwen')
            || model.includes('nemotron')
            || model.includes('north-');
    }

    protected isRouterExecution(request: OpenPencilAiDesignRequest): boolean {
        const execution = request.execution;
        const provider = this.executionProviderKey(request);
        return execution?.runtime === 'direct-http'
            || (execution?.providerId ?? '').toLowerCase().startsWith('direct-http:')
            || provider === 'openrouter'
            || provider === 'opencode'
            || provider === 'opencode-go';
    }

    protected executionProviderKey(request: OpenPencilAiDesignRequest): string {
        const execution = request.execution;
        const providerId = (execution?.providerId ?? '').toLowerCase();
        const separator = providerId.indexOf(':');
        return (execution?.modelProvider ?? (separator >= 0 ? providerId.slice(separator + 1) : providerId)).toLowerCase();
    }

    protected formatProviderGenerateTimeoutMessage(providerName: string, timeoutMs: number): string {
        return `${providerName} did not return usable OpenPencil operations within ${Math.round(timeoutMs / 1000)} seconds. ` +
            'The provider may have produced text or reasoning, but Canvas needs structured OpenPencil operations before it can apply changes.';
    }

    protected formatProviderStreamFirstOperationTimeoutMessage(providerName: string, timeoutMs: number): string {
        return `${providerName} streaming did not produce a usable OpenPencil operation within ${Math.round(timeoutMs / 1000)} seconds. ` +
            'The provider may have produced text or reasoning, but Canvas needs a complete structured operation before it can update the design.';
    }

    protected formatProviderStreamIdleTimeoutMessage(providerName: string, timeoutMs: number): string {
        return `${providerName} streaming stopped producing usable OpenPencil operations for ${Math.round(timeoutMs / 1000)} seconds.`;
    }

    protected formatProviderStreamTotalTimeoutMessage(providerName: string, timeoutMs: number): string {
        return `${providerName} streaming did not finish within ${Math.round(timeoutMs / 1000)} seconds.`;
    }

    protected withProviderGenerateTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const timeout = globalThis.setTimeout(() => reject(new Error(message)), timeoutMs);
            promise.then(
                value => {
                    globalThis.clearTimeout(timeout);
                    resolve(value);
                },
                error => {
                    globalThis.clearTimeout(timeout);
                    reject(error);
                }
            );
        });
    }

    async streamAiOperations(request: OpenPencilAiDesignRequest, apply: OpenPencilAiDesignStreamApply): Promise<OpenPencilAiDesignResult> {
        const context = this.createAiSkillContext(request);
        const diagnostics: string[] = [];
        const providers = this.resolveAiProviders(request);
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
            let pendingStreamOperations: OpenPencilDesignOperation[] = [];
            let lastDeferredPreviewDiagnostic: string | undefined;
            let providerOperationSeenAt: number | undefined;
            let completedOperations: OpenPencilDesignOperation[] | undefined;

            const acceptOperations = async (operations: OpenPencilDesignOperation[], force = false, allowTemporaryLayoutQualityIssues = true): Promise<void> => {
                if (operations.length) {
                    providerReturnedOperations = true;
                    providerOperationSeenAt = Date.now();
                    if (!operations.every(operation => this.isDesignOperationLike(operation))) {
                        diagnostics.push(`${providerName} streamed operations that do not match the OpenPencil structured operation contract.`);
                        canvasAiFrontendDebug('provider-stream-rejected', {
                            ...providerDetails,
                            reason: 'invalid-operations',
                            operationsCount: operations.length,
                            diagnosticsCount: diagnostics.length,
                            operationSample: this.summarizeAiRejectedOperation(operations[0])
                        });
                        return;
                    }
                    pendingStreamOperations.push(...operations);
                }
                if (!pendingStreamOperations.length) {
                    return;
                }
                const normalizedOperations = this.normalizeProviderAiStreamingOperations(pendingStreamOperations, currentRequest);
                const stabilized = this.stabilizeProviderAiOperationsForRequest(normalizedOperations, currentRequest, providerName);
                diagnostics.push(...stabilized.diagnostics);
                // Streaming resilience: a model can stream a child or reference before the createNode
                // that introduces its parent/target (forward reference). Instead of deferring the whole
                // pending batch until the stream stalls, apply the operations that already resolve and
                // keep only the unresolved ones pending so they apply once their dependency streams in.
                if (!force && stabilized.diagnostic && stabilized.operations.length && stabilized.skippedOperations?.length) {
                    const subsetDiagnostic = this.validateAiOperationsPreview(stabilized.operations, currentRequest, providerName, {
                        allowTemporaryLayoutQualityIssues
                    });
                    if (!subsetDiagnostic) {
                        const partialApply = await apply({
                            operations: stabilized.operations,
                            context,
                            source: 'provider',
                            providerId: provider.id,
                            providerLabel: provider.label ?? provider.id,
                            diagnostics
                        });
                        if (partialApply?.applied) {
                            acceptedOperations.push(...stabilized.operations);
                            pendingStreamOperations = stabilized.skippedOperations;
                            lastDeferredPreviewDiagnostic = undefined;
                            currentRequest = {
                                ...currentRequest,
                                document: partialApply.document,
                                selection: partialApply.selection,
                                mode: currentRequest.mode === 'continuation' ? 'continuation' : 'maintenance'
                            };
                            canvasAiFrontendDebug('provider-stream-partial-apply', {
                                ...providerDetails,
                                appliedCount: stabilized.operations.length,
                                retainedPendingCount: pendingStreamOperations.length,
                                diagnosticsCount: diagnostics.length
                            });
                            return;
                        }
                    }
                }
                const previewDiagnostic = stabilized.diagnostic ?? this.validateAiOperationsPreview(stabilized.operations, currentRequest, providerName, {
                    allowTemporaryLayoutQualityIssues
                });
                if (previewDiagnostic) {
                    if (force || previewDiagnostic !== lastDeferredPreviewDiagnostic) {
                        diagnostics.push(previewDiagnostic);
                    }
                    lastDeferredPreviewDiagnostic = previewDiagnostic;
                    canvasAiFrontendDebug('provider-stream-deferred', {
                        ...providerDetails,
                        reason: 'preview-validation',
                        operationsCount: stabilized.operations.length,
                        pendingOperationsCount: pendingStreamOperations.length,
                        diagnosticsCount: diagnostics.length,
                        diagnostic: previewDiagnostic.slice(0, 500)
                    });
                    return;
                }
                const applyResult = await apply({
                    operations: stabilized.operations,
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
                acceptedOperations.push(...stabilized.operations);
                pendingStreamOperations = [];
                lastDeferredPreviewDiagnostic = undefined;
                currentRequest = {
                    ...currentRequest,
                    document: applyResult.document,
                    selection: applyResult.selection,
                    mode: currentRequest.mode === 'continuation' ? 'continuation' : 'maintenance'
                };
            };

            canvasAiFrontendDebug('provider-stream-start', {
                ...providerDetails,
                selectionCount: request.selection.length,
                timeouts: this.resolveProviderStreamTimeouts(request)
            });

            try {
                const streamTimeouts = this.resolveProviderStreamTimeouts(request);
                const streamStartedAt = Date.now();
                const firstOperationDeadline = streamStartedAt + streamTimeouts.firstOperationMs;
                let lastAcceptedOperationAt = streamStartedAt;
                const streamIterator = provider.streamOperations(currentRequest, context)[Symbol.asyncIterator]();
                try {
                    while (true) {
                        const now = Date.now();
                        const elapsed = now - streamStartedAt;
                        const remainingTotal = streamTimeouts.totalMs - elapsed;
                        if (remainingTotal <= 0) {
                            throw new Error(this.formatProviderStreamTotalTimeoutMessage(providerName, streamTimeouts.totalMs));
                        }
                        const operationProgressSeenAt = acceptedOperations.length
                            ? lastAcceptedOperationAt
                            : providerOperationSeenAt;
                        const remainingOperationTime = operationProgressSeenAt !== undefined
                            ? streamTimeouts.idleMs - (now - operationProgressSeenAt)
                            : firstOperationDeadline - now;
                        if (remainingOperationTime <= 0) {
                            throw new Error(operationProgressSeenAt !== undefined
                                ? this.formatProviderStreamIdleTimeoutMessage(providerName, streamTimeouts.idleMs)
                                : this.formatProviderStreamFirstOperationTimeoutMessage(providerName, streamTimeouts.firstOperationMs));
                        }
                        const nextTimeout = Math.min(
                            remainingTotal,
                            remainingOperationTime
                        );
                        const next = await this.withProviderStreamTimeout(
                            Promise.resolve(streamIterator.next()),
                            nextTimeout,
                            operationProgressSeenAt !== undefined
                                ? this.formatProviderStreamIdleTimeoutMessage(providerName, nextTimeout)
                                : this.formatProviderStreamFirstOperationTimeoutMessage(providerName, nextTimeout)
                        );
                        if (next.done) {
                            break;
                        }
                        const event = next.value;
                        if (event.type === 'diagnostic') {
                            diagnostics.push(`${providerName}: ${event.message}`);
                            continue;
                        }
                        if (event.type === 'operation') {
                            const acceptedBefore = acceptedOperations.length;
                            await acceptOperations([event.operation]);
                            if (acceptedOperations.length > acceptedBefore) {
                                lastAcceptedOperationAt = Date.now();
                            }
                            continue;
                        }
                        if (event.type === 'complete') {
                            diagnostics.push(...(event.diagnostics ?? []).map(diagnostic => `${providerName}: ${diagnostic}`));
                            if (event.operations?.length) {
                                providerOperationSeenAt = Date.now();
                                completedOperations = event.operations;
                            }
                        }
                    }
                } catch (error) {
                    this.closeProviderStreamIterator(streamIterator);
                    throw error;
                }
                if (!acceptedOperations.length && completedOperations?.length) {
                    await acceptOperations(completedOperations, true, false);
                }
                if (pendingStreamOperations.length) {
                    await acceptOperations([], true, false);
                    if (!acceptedOperations.length && lastDeferredPreviewDiagnostic) {
                        const selfCorrected = await this.tryProviderAiSelfCorrection(provider, providerName, currentRequest, lastDeferredPreviewDiagnostic, pendingStreamOperations, diagnostics);
                        if (selfCorrected?.operations.length) {
                            pendingStreamOperations = [];
                            lastDeferredPreviewDiagnostic = undefined;
                            await acceptOperations(selfCorrected.operations, true, false);
                        }
                    }
                }
                if (!acceptedOperations.length) {
                    const reason = lastDeferredPreviewDiagnostic
                        ?? (completedOperations?.length
                            ? 'The stream returned operations only at completion, but the complete batch was not usable.'
                            : 'The stream ended without a usable operation event.');
                    const recovered = await this.tryProviderAiStreamingRecovery(
                        provider,
                        providerName,
                        currentRequest,
                        diagnostics,
                        reason,
                        pendingStreamOperations.length ? pendingStreamOperations : completedOperations ?? []
                    );
                    if (recovered?.operations.length) {
                        pendingStreamOperations = [];
                        lastDeferredPreviewDiagnostic = undefined;
                        await acceptOperations(recovered.operations, true, false);
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
                const errorMessage = error instanceof Error ? error.message : String(error);
                diagnostics.push(`${providerName} streaming failed: ${errorMessage}`);
                canvasAiFrontendDebug('provider-stream-error', {
                    ...providerDetails,
                    diagnosticsCount: diagnostics.length,
                    errorName: error instanceof Error ? error.name : typeof error,
                    messageLength: errorMessage.length,
                    message: errorMessage.slice(0, 400)
                });
                if (!acceptedOperations.length && this.isProviderBackendUnavailableError(errorMessage)) {
                    diagnostics.push(this.providerBackendUnavailableMessage(providerName, errorMessage));
                    canvasAiFrontendDebug('provider-backend-unavailable', { ...providerDetails, stage: 'stream' });
                } else if (!acceptedOperations.length) {
                    const recovered = await this.tryProviderAiStreamingRecovery(provider, providerName, currentRequest, diagnostics, errorMessage, pendingStreamOperations);
                    if (recovered?.operations.length) {
                        pendingStreamOperations = [];
                        lastDeferredPreviewDiagnostic = undefined;
                        await acceptOperations(recovered.operations, true, false);
                    }
                }
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
        const fallbackOperations = this.createValidatedDeterministicSkeletonFallbackOperations(request, context, diagnostics);
        if (fallbackOperations.length) {
            const fallbackResult: OpenPencilAiDesignResult = {
                operations: fallbackOperations,
                context,
                source: 'deterministic-fallback',
                diagnostics
            };
            const appliedFallback = await apply(fallbackResult);
            if (appliedFallback?.applied) {
                canvasAiFrontendDebug('deterministic-skeleton-stream-fallback', {
                    providersCount: providers.length,
                    providerReturnedOperations,
                    operationsCount: fallbackOperations.length,
                    diagnosticsCount: diagnostics.length,
                    applied: appliedFallback.applied
                });
                return fallbackResult;
            }
            diagnostics.push('Canvas AI generated a local skeleton fallback, but the Canvas editor did not apply it.');
        }
        return {
            operations: [],
            context,
            source: 'deterministic-fallback',
            diagnostics
        };
    }

    protected withProviderStreamTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const timeout = globalThis.setTimeout(() => reject(new Error(message)), timeoutMs);
            promise.then(
                value => {
                    globalThis.clearTimeout(timeout);
                    resolve(value);
                },
                error => {
                    globalThis.clearTimeout(timeout);
                    reject(error);
                }
            );
        });
    }

    protected closeProviderStreamIterator(iterator: AsyncIterator<OpenPencilAiDesignStreamEvent>): void {
        try {
            const close = iterator.return?.();
            if (close) {
                void Promise.resolve(close).catch(() => undefined);
            }
        } catch {
            // The timeout or provider error is the actionable diagnostic; cleanup failure is non-fatal.
        }
    }

    protected resolveAiProviders(request?: OpenPencilAiDesignRequest): OpenPencilAiDesignProvider[] {
        const providers = [
            ...(this.aiProviderContributions?.getContributions() ?? []),
            ...(this.aiProvider ? [this.aiProvider] : [])
        ];
        const sorted = providers
            .filter((provider, index) => providers.indexOf(provider) === index)
            .sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0));
        if (request?.execution?.providerId || request?.execution?.runtime || request?.execution?.modelProvider || request?.execution?.model) {
            const runtimeProvider = sorted.find(provider => provider.id === 'openpencil.cybervinci-ai-runtime');
            return runtimeProvider ? [runtimeProvider] : sorted;
        }
        return sorted;
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

    protected createValidatedDeterministicSkeletonFallbackOperations(
        request: OpenPencilAiDesignRequest,
        context: OpenPencilAiSkillContext,
        diagnostics: string[]
    ): OpenPencilDesignOperation[] {
        if (!this.shouldUseDeterministicSkeletonFallback(request, context)) {
            return [];
        }
        const operations = this.generateDeterministicSkeletonFallbackOperations(request);
        if (!operations.length) {
            return [];
        }
        const previewDiagnostic = this.validateAiOperationsPreview(operations, request, 'Local Canvas AI skeleton fallback');
        if (previewDiagnostic) {
            diagnostics.push(previewDiagnostic);
            return [];
        }
        diagnostics.push('Canvas AI provider did not return usable skeleton operations; generated a local visible skeleton so the canvas can continue instead of staying blank.');
        return operations;
    }

    protected shouldUseDeterministicSkeletonFallback(_request: OpenPencilAiDesignRequest, _context: OpenPencilAiSkillContext): boolean {
        return false;
    }

    protected generateDeterministicSkeletonFallbackOperations(request: OpenPencilAiDesignRequest): OpenPencilDesignOperation[] {
        const page = this.documents.getActivePage(request.document);
        const root = this.resolveAiSkeletonProfile(request.prompt) === 'web-page'
            ? this.createGenericSkeletonPageNode(request)
            : this.createBoundedCompositionSkeletonNode(request);
        const pageHeight = Math.max(
            this.numberValue(page.height, 620),
            this.numberValue(root.y, 0) + this.numberValue(root.height, 720) + 40
        );
        const pageWidth = Math.max(this.numberValue(page.width, 900), this.numberValue(root.width, 1200));
        return [
            {
                operation: 'updatePage',
                pageId: page.id,
                changes: {
                    width: pageWidth,
                    height: pageHeight,
                    background: '#eeeeee'
                }
            },
            {
                operation: 'createNode',
                parentId: null,
                node: root
            },
            { operation: 'setSelection', nodeIds: [root.id] }
        ];
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

    protected summarizeAiRejectedOperation(value: unknown): Record<string, unknown> {
        if (Array.isArray(value)) {
            return {
                kind: 'array',
                length: value.length,
                first: value.length ? this.summarizeAiRejectedOperation(value[0]) : undefined
            };
        }
        if (!this.isRecord(value)) {
            return { kind: typeof value };
        }
        const nestedOperation = this.isRecord(value.operation) ? value.operation : undefined;
        const node = this.isRecord(value.node) ? value.node : undefined;
        const changes = this.isRecord(value.changes) ? value.changes : undefined;
        const payload = this.isRecord(value.payload) ? value.payload : this.isRecord(value.data) ? value.data : undefined;
        return {
            kind: 'object',
            keys: Object.keys(value).slice(0, 16),
            operationType: typeof value.operation,
            operationValue: typeof value.operation === 'string' ? value.operation : undefined,
            typeValue: typeof value.type === 'string' ? value.type : undefined,
            opValue: typeof value.op === 'string' ? value.op : undefined,
            actionValue: typeof value.action === 'string' ? value.action : undefined,
            nodeKeys: node ? Object.keys(node).slice(0, 16) : undefined,
            changesKeys: changes ? Object.keys(changes).slice(0, 16) : undefined,
            payloadKeys: payload ? Object.keys(payload).slice(0, 16) : undefined,
            nestedOperationKeys: nestedOperation ? Object.keys(nestedOperation).slice(0, 16) : undefined,
            nestedOperationValue: nestedOperation && typeof nestedOperation.operation === 'string' ? nestedOperation.operation : undefined
        };
    }

    protected normalizeProviderAiOperations(operations: OpenPencilDesignOperation[], request: OpenPencilAiDesignRequest): OpenPencilDesignOperation[] {
        const page = this.documents.getActivePage(request.document);
        return this.repairProviderAiMissingReferences(this.normalizeProviderAiFlatSiblingZOrder(this.normalizeProviderAiCreateIndexes(operations
            .map(operation => this.normalizeOperationParentReferences(operation, page))
            .map(operation => this.normalizeProviderAiOperationZOrder(operation)))), request, page);
    }

    protected repairProviderAiMissingReferences(operations: OpenPencilDesignOperation[], request: OpenPencilAiDesignRequest, page: OpenPencilPage): OpenPencilDesignOperation[] {
        if (!this.shouldRepairProviderAiMissingReferences(request) || !operations.length) {
            return operations;
        }
        const existingIds = new Set(this.documents.flattenNodes(request.document).map(node => node.id));
        const plannedCreateIds = this.collectProviderAiCreatedNodeIds(operations);
        const missingCreateIds = new Set<string>();
        for (const operation of operations) {
            if ((operation.operation === 'updateNode' || operation.operation === 'replaceNode')
                && !existingIds.has(operation.nodeId)
                && !plannedCreateIds.has(operation.nodeId)) {
                missingCreateIds.add(operation.nodeId);
            }
            if ((operation.operation === 'createNode' || operation.operation === 'addNode') && typeof operation.parentId === 'string') {
                const parentId = this.normalizePageParentId(operation.parentId, page);
                if (parentId && !existingIds.has(parentId) && !plannedCreateIds.has(parentId)) {
                    missingCreateIds.add(parentId);
                }
            }
        }
        if (!missingCreateIds.size) {
            return operations;
        }

        const knownIds = new Set([...existingIds, ...plannedCreateIds, ...missingCreateIds]);
        const emittedRepairIds = new Set<string>();
        const repaired: OpenPencilDesignOperation[] = [];
        let repairedCount = 0;

        const ensureMissingParent = (parentId: string | null | undefined, sourceId: string): void => {
            if (!parentId || existingIds.has(parentId) || plannedCreateIds.has(parentId) || emittedRepairIds.has(parentId)) {
                return;
            }
            const parentCreate = this.createProviderAiMissingParentCreate(parentId, sourceId, page, knownIds, missingCreateIds, repaired.length);
            repaired.push(parentCreate);
            emittedRepairIds.add(parentId);
            knownIds.add(parentId);
            repairedCount++;
        };

        for (const operation of operations) {
            if (operation.operation === 'updateNode'
                && !existingIds.has(operation.nodeId)
                && !plannedCreateIds.has(operation.nodeId)
                && !emittedRepairIds.has(operation.nodeId)) {
                const create = this.createProviderAiCreateForMissingUpdate(operation, page, knownIds, missingCreateIds, repaired.length);
                if (create) {
                    ensureMissingParent(create.parentId, operation.nodeId);
                    repaired.push(create);
                    emittedRepairIds.add(operation.nodeId);
                    knownIds.add(operation.nodeId);
                    this.collectProviderAiNodeIds(create.node, knownIds);
                    repairedCount++;
                    continue;
                }
            }
            if (operation.operation === 'replaceNode'
                && !existingIds.has(operation.nodeId)
                && !plannedCreateIds.has(operation.nodeId)
                && !emittedRepairIds.has(operation.nodeId)) {
                const create = this.createProviderAiCreateForMissingReplace(operation, page, knownIds, missingCreateIds, repaired.length);
                ensureMissingParent(create.parentId, operation.nodeId);
                repaired.push(create);
                emittedRepairIds.add(operation.nodeId);
                knownIds.add(operation.nodeId);
                this.collectProviderAiNodeIds(create.node, knownIds);
                repairedCount++;
                continue;
            }
            if (operation.operation === 'createNode' || operation.operation === 'addNode') {
                const parentId = this.normalizePageParentId(operation.parentId, page);
                ensureMissingParent(parentId, typeof operation.node.id === 'string' ? operation.node.id : 'generated-node');
                repaired.push(parentId === operation.parentId ? operation : { ...operation, parentId });
                this.collectProviderAiNodeIds(operation.node, knownIds);
                continue;
            }
            if (operation.operation === 'setSelection') {
                const nodeIds = operation.nodeIds.filter(id => knownIds.has(id) || emittedRepairIds.has(id));
                if (nodeIds.length) {
                    repaired.push({ ...operation, nodeIds: [...new Set(nodeIds)] });
                    continue;
                }
                const fallbackSelection = this.lastProviderAiCreatedNodeId(repaired);
                if (fallbackSelection) {
                    repaired.push({ operation: 'setSelection', nodeIds: [fallbackSelection] });
                    repairedCount++;
                    continue;
                }
            }
            repaired.push(operation);
        }

        if (repairedCount) {
            canvasAiFrontendDebug('provider-reference-repaired', {
                missingIds: [...missingCreateIds],
                repairedCount,
                operationsBefore: operations.length,
                operationsAfter: repaired.length
            });
        }
        return repaired;
    }

    protected shouldRepairProviderAiMissingReferences(request: OpenPencilAiDesignRequest): boolean {
        return !request.selection.length && this.isPageLevelAiPrompt(request.prompt);
    }

    protected collectProviderAiCreatedNodeIds(operations: OpenPencilDesignOperation[]): Set<string> {
        const ids = new Set<string>();
        for (const operation of operations) {
            if (operation.operation === 'createNode' || operation.operation === 'addNode') {
                this.collectProviderAiNodeIds(operation.node, ids);
            }
        }
        return ids;
    }

    protected collectProviderAiNodeIds(node: Partial<OpenPencilNode>, ids: Set<string>): void {
        if (typeof node.id === 'string' && node.id) {
            ids.add(node.id);
        }
        if (!Array.isArray(node.children)) {
            return;
        }
        for (const child of node.children) {
            if (this.isRecord(child)) {
                this.collectProviderAiNodeIds(child as Partial<OpenPencilNode>, ids);
            }
        }
    }

    protected createProviderAiCreateForMissingUpdate(
        operation: Extract<OpenPencilDesignOperation, { operation: 'updateNode' }>,
        page: OpenPencilPage,
        knownIds: Set<string>,
        missingCreateIds: Set<string>,
        sequence: number
    ): Extract<OpenPencilDesignOperation, { operation: 'createNode' }> | undefined {
        if (!this.shouldCreateProviderAiNodeFromChanges(operation.nodeId, operation.changes)) {
            return undefined;
        }
        const parentId = this.providerAiMissingNodeParentId(operation.nodeId, knownIds, missingCreateIds);
        return {
            operation: 'createNode',
            parentId,
            node: this.createProviderAiNodeFromMissingReference(operation.nodeId, operation.changes, page, parentId, sequence)
        };
    }

    protected createProviderAiCreateForMissingReplace(
        operation: Extract<OpenPencilDesignOperation, { operation: 'replaceNode' }>,
        page: OpenPencilPage,
        knownIds: Set<string>,
        missingCreateIds: Set<string>,
        sequence: number
    ): Extract<OpenPencilDesignOperation, { operation: 'createNode' }> {
        const parentId = this.providerAiMissingNodeParentId(operation.nodeId, knownIds, missingCreateIds);
        return {
            operation: 'createNode',
            parentId,
            node: this.createProviderAiNodeFromMissingReference(operation.nodeId, operation.node, page, parentId, sequence)
        };
    }

    protected createProviderAiMissingParentCreate(
        parentId: string,
        sourceId: string,
        page: OpenPencilPage,
        knownIds: Set<string>,
        missingCreateIds: Set<string>,
        sequence: number
    ): Extract<OpenPencilDesignOperation, { operation: 'createNode' }> {
        const grandParentId = this.providerAiMissingNodeParentId(parentId, knownIds, missingCreateIds);
        return {
            operation: 'createNode',
            parentId: grandParentId,
            node: this.createProviderAiNodeFromMissingReference(parentId, {
                type: 'frame',
                name: this.providerAiReadableName(parentId),
                role: 'section',
                explain: `Created by Canvas AI reference repair before inserting ${sourceId}.`
            }, page, grandParentId, sequence)
        };
    }

    protected shouldCreateProviderAiNodeFromChanges(nodeId: string, changes: OpenPencilNodeChanges): boolean {
        const record = changes as Record<string, unknown>;
        return this.providerAiIsContainerLikeMissingId(nodeId)
            || this.providerAiIsTextLikeMissingId(nodeId)
            || /(?:image|img|photo|visual|thumb|banner|media|logo|icon|button|cta|input|search|nav|menu|price|badge|chip)/i.test(nodeId)
            || typeof record.content === 'string'
            || Array.isArray(record.content)
            || typeof record.width === 'number'
            || typeof record.height === 'number'
            || Array.isArray(record.children)
            || Array.isArray(record.fill)
            || typeof record.background === 'string'
            || typeof record.backgroundColor === 'string';
    }

    protected createProviderAiNodeFromMissingReference(
        nodeId: string,
        source: Partial<OpenPencilNode> | OpenPencilNodeChanges,
        page: OpenPencilPage,
        parentId: string | null | undefined,
        sequence: number
    ): Partial<OpenPencilNode> & { type?: OpenPencilNodeType } {
        const record = source as Record<string, unknown>;
        const type = this.providerAiInferMissingNodeType(nodeId, record);
        const defaults = this.providerAiMissingNodeDefaults(nodeId, type, page, parentId, sequence);
        const node = {
            ...source,
            id: nodeId,
            type,
            name: typeof record.name === 'string' && record.name.trim() ? record.name : this.providerAiReadableName(nodeId),
            x: record.x === undefined ? defaults.x : source.x,
            y: record.y === undefined ? defaults.y : source.y,
            width: record.width === undefined ? defaults.width : source.width,
            height: record.height === undefined ? defaults.height : source.height,
            ...(record.role === undefined && defaults.role ? { role: defaults.role } : {}),
            ...(record.fill === undefined && defaults.fill ? { fill: defaults.fill } : {}),
            ...(record.cornerRadius === undefined && defaults.cornerRadius !== undefined ? { cornerRadius: defaults.cornerRadius } : {}),
            ...(record.fontSize === undefined && defaults.fontSize !== undefined ? { fontSize: defaults.fontSize } : {}),
            ...(record.fontWeight === undefined && defaults.fontWeight !== undefined ? { fontWeight: defaults.fontWeight } : {}),
            ...(record.content === undefined && defaults.content !== undefined ? { content: defaults.content } : {})
        } as Partial<OpenPencilNode> & { type?: OpenPencilNodeType };
        if (type !== 'text' && node.content !== undefined && !Array.isArray(node.children)) {
            delete (node as Record<string, unknown>).content;
        }
        return node;
    }

    protected providerAiInferMissingNodeType(nodeId: string, record: Record<string, unknown>): OpenPencilNodeType {
        if (typeof record.type === 'string') {
            return this.normalizeStructuredNodeType(record.type);
        }
        if (this.providerAiIsContainerLikeMissingId(nodeId) && !this.providerAiIsTextLikeMissingId(nodeId)) {
            return 'frame';
        }
        if (this.providerAiIsTextLikeMissingId(nodeId) || typeof record.content === 'string' || Array.isArray(record.content)) {
            return 'text';
        }
        if (/(?:image|img|photo|visual|thumb|media|banner)/i.test(nodeId) || typeof record.src === 'string' || typeof record.imagePrompt === 'string') {
            return 'image';
        }
        if (/(?:icon|logo)/i.test(nodeId) || typeof record.iconId === 'string') {
            return 'icon_font';
        }
        if (/(?:circle|dot|avatar|bubble)/i.test(nodeId)) {
            return 'ellipse';
        }
        if (/(?:line|divider|rule)/i.test(nodeId)) {
            return 'line';
        }
        return 'rectangle';
    }

    protected providerAiMissingNodeParentId(nodeId: string, knownIds: Set<string>, missingCreateIds: Set<string>): string | null {
        if (this.providerAiIsContainerLikeMissingId(nodeId)) {
            for (const candidate of this.providerAiCandidateParentIds(nodeId, true)) {
                if (candidate !== nodeId && (knownIds.has(candidate) || missingCreateIds.has(candidate))) {
                    return candidate;
                }
            }
            return null;
        }
        for (const candidate of this.providerAiCandidateParentIds(nodeId, false)) {
            if (candidate !== nodeId && (knownIds.has(candidate) || missingCreateIds.has(candidate))) {
                return candidate;
            }
        }
        return null;
    }

    protected providerAiCandidateParentIds(nodeId: string, containerOnly: boolean): string[] {
        const lower = nodeId.toLowerCase();
        const base = lower
            .replace(/-(?:title|heading|headline|subtitle|copy|body|text|label|description|desc|price|tag|badge|button|btn|cta|input|field|placeholder|image|img|visual|media|icon|logo|link|nav|menu)(?:-\d+)?$/i, '')
            .replace(/-(?:card|panel|tile|item)(?:-\d+)?$/i, '');
        const candidates = [
            `${base}-card`,
            `${base}-panel`,
            `${base}-tile`,
            `${base}-item`,
            `${base}-content`,
            `${base}-section`,
            `${base}-container`,
            `${base}-frame`,
            `${base}-root`,
            `${base}-page`,
            'main-content',
            'page-content',
            'page-root',
            'root',
            'artboard'
        ];
        if (containerOnly) {
            candidates.unshift(`${base}-root`, `${base}-page`);
        }
        return [...new Set(candidates.filter(candidate => candidate && candidate !== lower))];
    }

    protected providerAiIsContainerLikeMissingId(nodeId: string): boolean {
        return /(?:root|page|frame|container|section|hero|header|footer|nav|grid|row|column|col|card|panel|tile|item|shelf|list|content|wrapper|artboard|canvas)/i.test(nodeId);
    }

    protected providerAiIsTextLikeMissingId(nodeId: string): boolean {
        return /(?:title|heading|headline|subtitle|copy|body|text|label|description|desc|price|caption|kicker|eyebrow|link|placeholder)/i.test(nodeId);
    }

    protected providerAiMissingNodeDefaults(
        nodeId: string,
        type: OpenPencilNodeType,
        page: OpenPencilPage,
        parentId: string | null | undefined,
        sequence: number
    ): Partial<OpenPencilNode> {
        const inParent = !!parentId;
        const pageWidth = Math.max(320, this.numberValue(page.width, 1200));
        const topLevelX = Math.min(96, Math.max(32, Math.round(pageWidth * 0.06)));
        const topLevelY = 80 + sequence * 32;
        if (type === 'text') {
            const title = /(?:title|heading|headline)/i.test(nodeId);
            const copy = /(?:copy|body|description|desc|subtitle)/i.test(nodeId);
            const price = /price/i.test(nodeId);
            return {
                role: title ? 'heading' : 'text',
                x: inParent ? 32 : topLevelX,
                y: inParent ? title ? 40 : copy ? 104 : price ? 168 : 72 : topLevelY,
                width: title ? 640 : 520,
                height: title ? 56 : 36,
                fontSize: title ? 36 : price ? 24 : 16,
                fontWeight: title || price ? 700 : 400,
                content: title ? this.providerAiReadableName(nodeId) : 'Texto'
            };
        }
        if (type === 'image') {
            return {
                role: 'media',
                x: inParent ? 32 : topLevelX,
                y: inParent ? 32 : topLevelY,
                width: inParent ? 320 : Math.min(520, pageWidth - topLevelX * 2),
                height: inParent ? 180 : 260,
                fill: [{ type: 'solid', color: '#eef2f7' }],
                cornerRadius: 12
            };
        }
        if (type === 'icon_font' || type === 'ellipse') {
            return {
                role: 'icon',
                x: inParent ? 32 : topLevelX,
                y: inParent ? 32 : topLevelY,
                width: 40,
                height: 40,
                fill: [{ type: 'solid', color: '#eaf2ff' }]
            };
        }
        if (type === 'line') {
            return {
                x: inParent ? 32 : topLevelX,
                y: inParent ? 96 : topLevelY,
                width: inParent ? 480 : Math.min(960, pageWidth - topLevelX * 2),
                height: 1
            };
        }
        const hero = /hero/i.test(nodeId);
        const header = /header|nav/i.test(nodeId);
        const card = /card|panel|tile|item/i.test(nodeId);
        return {
            role: hero ? 'section' : card ? 'card' : header ? 'navigation' : 'section',
            x: inParent ? 24 : topLevelX,
            y: inParent ? 24 : topLevelY,
            width: header ? Math.min(1120, pageWidth - topLevelX * 2) : hero ? Math.min(1040, pageWidth - topLevelX * 2) : card ? 320 : Math.min(920, pageWidth - topLevelX * 2),
            height: header ? 88 : hero ? 320 : card ? 220 : 180,
            fill: [{ type: 'solid', color: '#ffffff' }],
            cornerRadius: header ? 0 : 16
        };
    }

    protected providerAiReadableName(nodeId: string): string {
        return nodeId
            .replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, character => character.toUpperCase());
    }

    protected lastProviderAiCreatedNodeId(operations: OpenPencilDesignOperation[]): string | undefined {
        for (let index = operations.length - 1; index >= 0; index--) {
            const operation = operations[index];
            if ((operation.operation === 'createNode' || operation.operation === 'addNode') && typeof operation.node.id === 'string') {
                return operation.node.id;
            }
        }
        return undefined;
    }

    protected normalizeProviderAiStreamingOperations(operations: OpenPencilDesignOperation[], request: OpenPencilAiDesignRequest): OpenPencilDesignOperation[] {
        return this.normalizeProviderAiOperations(operations, request)
            .map(operation => this.normalizeProviderAiStreamingInsertionIndex(operation, request));
    }

    protected normalizeProviderAiStreamingInsertionIndex(operation: OpenPencilDesignOperation, request: OpenPencilAiDesignRequest): OpenPencilDesignOperation {
        if (!this.isProviderAiCreateOperation(operation)) {
            return operation;
        }
        const page = this.documents.getActivePage(request.document);
        const parentId = this.normalizePageParentId(operation.parentId, page);
        const parent = parentId ? this.documents.findNode(request.document, parentId) : undefined;
        if (parentId && !parent) {
            return operation;
        }
        if (parent && this.isProviderAiAutoLayoutNode(parent)) {
            return operation;
        }
        const siblings = parent ? parent.children ?? [] : page.children;
        if (!siblings.length) {
            return this.hasProviderAiIndex(operation) ? this.omitProviderAiCreateIndex(operation) : operation;
        }
        const index = this.providerAiStreamingZOrderInsertionIndex(operation.node, siblings);
        const withoutIndex = this.omitProviderAiCreateIndex(operation);
        return index === undefined ? withoutIndex : { ...withoutIndex, index };
    }

    protected providerAiStreamingZOrderInsertionIndex(node: Partial<OpenPencilNode>, siblings: OpenPencilNode[]): number | undefined {
        const rank = this.providerAiNodeZRank(node);
        const insertBefore = siblings.findIndex(sibling => this.providerAiNodeZRank(sibling) < rank);
        return insertBefore >= 0 ? insertBefore : undefined;
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
        if (/\b(text|copy|headline|heading|title|subtitle|label|caption|icon|button|badge|avatar|header|nav|navigation|foreground|control|cta|tab|menu)\b/.test(descriptor)) {
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
        const lower = prompt.toLowerCase();
        return this.isWebPageAiPrompt(lower)
            || /\b(screen|dashboard|app|hero|interface|tela|poster|cartaz|flyer|banner|social|thumbnail|capa|cover|component|componente|card|modal|widget|wireframe|diagrama|diagram|figma|mockup|refer[eê]ncia visual|design de refer[eê]ncia)\b/i.test(lower);
    }

    protected shouldPreservePageWidthForAiPrompt(prompt: string): boolean {
        const lower = prompt.toLowerCase();
        if (/\b(side[- ]by[- ]side|lado a lado|desktop e mobile|mobile e desktop|multiple views|múltiplas telas|multiplas telas)\b/i.test(lower)) {
            return false;
        }
        return this.isWebPageAiPrompt(lower);
    }

    protected isWebPageAiPrompt(lowerPrompt: string): boolean {
        const explicitNonPageArtifact = /\b(figma|moodboard|mood board|style frame|poster|cartaz|flyer|banner|social|thumbnail|capa|cover|component|componente|card|modal|widget|wireframe|diagrama|diagram|fluxograma|app screen|tela de app|mobile screen|design de refer[eê]ncia)\b/i.test(lowerPrompt);
        const explicitPage = /\b(homepage|home page|home\b|p[aá]gina inicial|landing|landing page|site|website|webpage|web page|e-?commerce|loja virtual|marketplace|feed de produtos|p[aá]gina web|full page|p[aá]gina completa)\b/i.test(lowerPrompt);
        const cloneIntent = /\b(copy|copia|cópia|copie|copiar|clone|clonar|recrie|recreate|mimic|imite|igual|parecido|similar|refer[eê]ncia|reference)\b/i.test(lowerPrompt);
        const pageSurfaceIntent = /\b(homepage|home page|home\b|p[aá]gina|site|website|web|loja|marketplace|e-?commerce|feed|landing)\b/i.test(lowerPrompt);
        return explicitPage || (cloneIntent && (pageSurfaceIntent || this.isKnownWebSurfaceReference(lowerPrompt)) && !explicitNonPageArtifact);
    }

    protected isKnownWebSurfaceReference(lowerPrompt: string): boolean {
        if (/\b(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|com\.br|io|app|dev|ai|net|org)\b)/i.test(lowerPrompt)) {
            return true;
        }
        const cloneIntent = /\b(copy|copia|c[oó]pia|copie|copiar|clone|clonar|recrie|recreate|mimic|imite|igual|parecido|similar|refer[eê]ncia|reference)\b/i.test(lowerPrompt);
        const surfaceHint = /\b(p[aá]gina\s+inicial|homepage|home\s+page|site|website|web|app|aplicativo|loja|store|marketplace|e-?commerce|landing|screen|tela)\b/i.test(lowerPrompt);
        const namedSurface = /\b(?:p[aá]gina\s+inicial|homepage|home\s+page|site|website|app|aplicativo|loja|store)\s+(?:do|da|de|of|for)\s+[a-z0-9à-öø-ÿ]/i.test(lowerPrompt);
        return namedSurface || (cloneIntent && surfaceHint);
    }

    protected aiPromptTargetPageWidth(prompt: string): number | undefined {
        return this.shouldPreservePageWidthForAiPrompt(prompt) ? 1200 : undefined;
    }

    protected validateAiOperationsPreview(
        operations: OpenPencilDesignOperation[],
        request: OpenPencilAiDesignRequest,
        providerName: string,
        options: { allowTemporaryLayoutQualityIssues?: boolean } = {}
    ): string | undefined {
        const continuationDiagnostic = this.validateContinuationAiOperations(operations, request, providerName);
        if (continuationDiagnostic) {
            return continuationDiagnostic;
        }
        const preview = this.applyOperationsToDocument(this.documents.cloneDocument(request.document), request.selection, operations, {
            mode: request.mode,
            normalizeVisibleBounds: true,
            preservePageWidth: this.shouldPreservePageWidthForAiPrompt(request.prompt),
            targetPageWidth: this.aiPromptTargetPageWidth(request.prompt)
        });
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
        const layoutQuality = this.validateAiLayoutQuality(preview.document, {
            mode: request.mode,
            preservePageWidth: this.shouldPreservePageWidthForAiPrompt(request.prompt),
            targetPageWidth: this.aiPromptTargetPageWidth(request.prompt),
            requireVisibleContent: this.isPageLevelAiPrompt(request.prompt)
        });
        if (!layoutQuality.valid) {
            if (options.allowTemporaryLayoutQualityIssues && this.hasVisibleAiPageContent(preview.document)) {
                return undefined;
            }
            const details = layoutQuality.issues.slice(0, 3).map(issue => `${issue.path}: ${issue.message}`).join('; ');
            return `${providerName} operations were rejected because preview layout quality failed${details ? `: ${details}` : '.'}`;
        }
        return undefined;
    }

    protected validateContinuationAiOperations(operations: OpenPencilDesignOperation[], request: OpenPencilAiDesignRequest, providerName: string): string | undefined {
        if (request.mode !== 'continuation') {
            return undefined;
        }
        const existingNodes = new Map(this.documents.flattenNodes(request.document).map(node => [node.id, node] as const));
        const createdNodeIds = new Set<string>();
        for (const operation of operations) {
            if (this.isProviderAiCreateOperation(operation)) {
                if (typeof operation.node.id === 'string' && operation.node.id) {
                    createdNodeIds.add(operation.node.id);
                }
            }
            if (this.isContinuationDestructiveOperation(operation, existingNodes, createdNodeIds)) {
                return `${providerName} operations were rejected because continuation mode must preserve existing nodes and layout; received '${operation.operation}'.`;
            }
        }
        return undefined;
    }

    protected previewReportedPartialFailure(message: string | undefined): boolean {
        return !!message && /\b(missing-parent|not found)\b/i.test(message);
    }

    protected isContinuationDestructiveOperation(operation: OpenPencilDesignOperation, existingNodes: Map<string, OpenPencilNode>, createdNodeIds: Set<string>): boolean {
        switch (operation.operation) {
            case 'addNode':
            case 'createNode':
            case 'setSelection':
                return false;
            case 'updatePage':
                return Array.isArray(operation.changes.children);
            case 'updateNode':
                if (createdNodeIds.has(operation.nodeId)) {
                    return false;
                }
                return existingNodes.has(operation.nodeId)
                    && !this.isSafeContinuationExistingNodeUpdate(operation, existingNodes.get(operation.nodeId));
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
                return existingNodes.has(operation.nodeId);
            case 'nudgeNodes':
            case 'alignNodes':
            case 'distributeNodes':
            case 'groupNodes':
            case 'booleanNodes':
            case 'convertToPath':
                return operation.nodeIds.some(nodeId => existingNodes.has(nodeId));
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

    protected isSafeContinuationExistingNodeUpdate(
        operation: Extract<OpenPencilDesignOperation, { operation: 'updateNode' }>,
        existing: OpenPencilNode | undefined
    ): boolean {
        if (!existing) {
            return false;
        }
        const changes = operation.changes as Record<string, unknown>;
        const keys = Object.keys(changes);
        if (!keys.length) {
            return false;
        }
        const allowedKeys = new Set(['height', 'width', 'clipContent']);
        if (keys.some(key => !allowedKeys.has(key))) {
            return false;
        }
        if ('clipContent' in changes && changes.clipContent !== false) {
            return false;
        }
        if ('height' in changes) {
            const nextHeight = this.numberValue(changes.height as number | string | undefined, NaN);
            const currentHeight = this.numericDimensionValue(existing.height);
            if (!Number.isFinite(nextHeight) || currentHeight === undefined || nextHeight < currentHeight) {
                return false;
            }
        }
        if ('width' in changes) {
            const nextWidth = this.numberValue(changes.width as number | string | undefined, NaN);
            const currentWidth = this.numericDimensionValue(existing.width);
            if (!Number.isFinite(nextWidth) || currentWidth === undefined || nextWidth < currentWidth) {
                return false;
            }
        }
        return true;
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

    protected promptBrandNameFromPrompt(prompt: string): string | undefined {
        const patterns = [
            /\b(?:com\s+o\s+nome|com\s+a\s+marca|nome|marca|chamado|chamada|called|named|with\s+the\s+name)\s+["']?([A-Za-z0-9À-ÖØ-öø-ÿ&+.' -]{2,48})/i,
            /\b(?:p[aá]gina\s+inicial|homepage|home\s+page|site|website)\s+(?:do|da|de|of|for)\s+["']?([A-Za-z0-9À-ÖØ-öø-ÿ&+.' -]{2,48})/i,
            /\b(?:copy|clone|c[oó]pia|recria[cç][aã]o|refer[eê]ncia)\s+(?:do|da|de|of|for)?\s*["']?([A-Za-z0-9À-ÖØ-öø-ÿ&+.' -]{2,48})/i
        ];
        for (const pattern of patterns) {
            const cleaned = this.cleanPromptBrandName(pattern.exec(prompt)?.[1]);
            if (cleaned) {
                return cleaned;
            }
        }
        return undefined;
    }

    protected cleanPromptBrandName(value: string | undefined): string | undefined {
        if (!value) {
            return undefined;
        }
        const cleaned = value
            .replace(/[.,;:!?].*$/, '')
            .replace(/\s+(?:com|with|como|as|que|that|para|for|e|and)\b.*$/i, '')
            .replace(/^["'“”]+|["'“”]+$/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        if (!cleaned || cleaned.length < 2 || /^(um|uma|a|the|pagina|página|site|homepage|marketplace|loja)$/i.test(cleaned)) {
            return undefined;
        }
        return cleaned.slice(0, 48).trim();
    }

    protected createGenericSkeletonPageNode(request: OpenPencilAiDesignRequest): OpenPencilNode {
        const baseId = this.stableAiIdBase(request.prompt);
        const brand = this.promptBrandNameFromPrompt(request.prompt) ?? 'Project';
        return {
            id: this.uniqueAiId(request.document, `${baseId}-page-skeleton`),
            type: 'frame',
            name: 'AI page skeleton',
            role: 'page',
            x: 0,
            y: 0,
            width: 1200,
            height: 820,
            layout: 'none',
            fill: [{ type: 'solid', color: '#f1f5f9' }],
            children: [
                this.createSkeletonFrameNode(request, `${baseId}-generic-nav`, 'Page navigation skeleton', 'navigation', 0, 0, 1200, 96, '#ffffff', 0),
                this.createTextNode(request, `${baseId}-generic-logo`, brand, 82, 32, 220, 28, 20, 800, '#0f172a', 'Skeleton brand'),
                this.createSkeletonFrameNode(request, `${baseId}-generic-hero`, 'Hero section skeleton', 'hero', 82, 138, 1036, 240, '#ffffff', 18, [
                    this.createTextNode(request, `${baseId}-generic-hero-title`, this.promptGeneratedHeadline(request.prompt), 40, 42, 540, 52, 34, 800, '#0f172a', 'Skeleton hero title'),
                    this.createTextNode(request, `${baseId}-generic-hero-copy`, this.promptGeneratedBodyCopy(request.prompt), 40, 112, 500, 48, 16, 500, '#475569', 'Skeleton hero copy'),
                    this.createSkeletonFrameNode(request, `${baseId}-generic-hero-visual`, 'Hero visual placeholder', 'image', 690, 36, 280, 168, '#e2e8f0', 16)
                ]),
                this.createSkeletonFrameNode(request, `${baseId}-generic-card-one`, 'Feature card one', 'card', 82, 420, 326, 150, '#ffffff', 14),
                this.createSkeletonFrameNode(request, `${baseId}-generic-card-two`, 'Feature card two', 'card', 437, 420, 326, 150, '#ffffff', 14),
                this.createSkeletonFrameNode(request, `${baseId}-generic-card-three`, 'Feature card three', 'card', 792, 420, 326, 150, '#ffffff', 14),
                this.createSkeletonFrameNode(request, `${baseId}-generic-footer`, 'Closing section skeleton', 'section', 82, 626, 1036, 130, '#ffffff', 16)
            ]
        };
    }

    protected resolveAiSkeletonProfile(prompt: string): OpenPencilAiSkeletonProfile {
        const lower = prompt.toLowerCase();
        if (this.isWebPageAiPrompt(lower)) {
            return 'web-page';
        }
        if (/\b(wireframe|low[- ]?fi|lo[- ]?fi|baixa fidelidade|estrutura|esqueleto|graybox|greybox)\b/i.test(lower)) {
            return 'wireframe';
        }
        if (/\b(diagrama|diagram|flowchart|fluxograma|jornada|journey map|sitemap|mapa mental|mind map|arquitetura|organograma)\b/i.test(lower)) {
            return 'diagram';
        }
        if (/\b(poster|cartaz|flyer|panfleto|one[- ]?pager|key visual|visual principal|an[uú]ncio impresso|print ad)\b/i.test(lower)) {
            return 'poster';
        }
        if (/\b(banner|outdoor|billboard|leaderboard|display ad|hero graphic|header graphic|capa horizontal)\b/i.test(lower)) {
            return 'banner';
        }
        if (/\b(instagram|story|stories|post social|social media|rede social|thumbnail|youtube thumb|linkedin post|facebook post|tiktok|feed post)\b/i.test(lower)) {
            return 'social';
        }
        if (/\b(figma|moodboard|mood board|style frame|reference board|board|mockup|refer[eê]ncia visual|design de refer[eê]ncia)\b/i.test(lower)) {
            return 'reference-board';
        }
        if (/\b(screen|tela|dashboard|app|mobile|desktop|form|formul[aá]rio|editor|ide|crm|admin|sistema|interface)\b/i.test(lower)) {
            return 'app-screen';
        }
        return 'component';
    }

    protected createBoundedCompositionSkeletonNode(request: OpenPencilAiDesignRequest): OpenPencilNode {
        const profile = this.resolveAiSkeletonProfile(request.prompt);
        const baseId = this.stableAiIdBase(request.prompt);
        const settings = this.aiSkeletonProfileSettings(profile);
        return {
            id: this.uniqueAiId(request.document, `${baseId}-${profile}-skeleton`),
            type: 'frame',
            name: settings.name,
            role: settings.role,
            x: 0,
            y: 0,
            width: settings.width,
            height: settings.height,
            cornerRadius: settings.cornerRadius,
            layout: 'none',
            clipContent: false,
            fill: [{ type: 'solid', color: settings.fill }],
            stroke: { color: settings.stroke, width: 1 },
            effects: [{ type: 'shadow', offsetX: 0, offsetY: 18, blur: 40, spread: 0, color: 'rgba(15, 23, 42, 0.14)' }],
            children: this.createBoundedCompositionSkeletonChildren(request, profile, baseId, settings)
        };
    }

    protected aiSkeletonProfileSettings(profile: OpenPencilAiSkeletonProfile): OpenPencilAiSkeletonProfileSettings {
        switch (profile) {
            case 'app-screen':
                return { name: 'AI app screen skeleton', role: 'screen', width: 390, height: 844, cornerRadius: 36, fill: '#0f172a', stroke: '#1e293b', accent: '#38bdf8', foreground: '#ffffff', muted: '#cbd5e1' };
            case 'poster':
                return { name: 'AI poster skeleton', role: 'poster', width: 720, height: 960, cornerRadius: 18, fill: '#111827', stroke: '#334155', accent: '#facc15', foreground: '#ffffff', muted: '#d1d5db' };
            case 'banner':
                return { name: 'AI banner skeleton', role: 'banner', width: 1200, height: 420, cornerRadius: 20, fill: '#0f172a', stroke: '#334155', accent: '#60a5fa', foreground: '#ffffff', muted: '#cbd5e1' };
            case 'social':
                return { name: 'AI social creative skeleton', role: 'social-creative', width: 1080, height: 1080, cornerRadius: 32, fill: '#f8fafc', stroke: '#dbeafe', accent: '#ec4899', foreground: '#111827', muted: '#475569' };
            case 'wireframe':
                return { name: 'AI wireframe skeleton', role: 'wireframe', width: 960, height: 640, cornerRadius: 12, fill: '#f8fafc', stroke: '#cbd5e1', accent: '#94a3b8', foreground: '#111827', muted: '#64748b' };
            case 'diagram':
                return { name: 'AI diagram skeleton', role: 'diagram', width: 1000, height: 680, cornerRadius: 18, fill: '#f8fafc', stroke: '#cbd5e1', accent: '#2563eb', foreground: '#111827', muted: '#475569' };
            case 'reference-board':
                return { name: 'AI reference board skeleton', role: 'reference-board', width: 1120, height: 720, cornerRadius: 18, fill: '#f1f5f9', stroke: '#cbd5e1', accent: '#7c3aed', foreground: '#111827', muted: '#475569' };
            case 'component':
            default:
                return { name: 'AI component skeleton', role: 'component', width: 680, height: 420, cornerRadius: 18, fill: '#ffffff', stroke: '#cbd5e1', accent: '#2563eb', foreground: '#111827', muted: '#475569' };
        }
    }

    protected createBoundedCompositionSkeletonChildren(
        request: OpenPencilAiDesignRequest,
        profile: OpenPencilAiSkeletonProfile,
        baseId: string,
        settings: OpenPencilAiSkeletonProfileSettings
    ): OpenPencilNode[] {
        const headline = this.promptGeneratedHeadline(request.prompt);
        const body = this.promptGeneratedBodyCopy(request.prompt);
        switch (profile) {
            case 'app-screen':
                return [
                    this.createTextNode(request, `${baseId}-app-brand`, 'CyberVinci', 28, 42, 180, 24, 16, 800, settings.muted, 'App brand label'),
                    this.createTextNode(request, `${baseId}-app-title`, headline, 28, 96, 334, 96, 32, 800, settings.foreground, 'App screen title'),
                    this.createTextNode(request, `${baseId}-app-copy`, body, 28, 204, 334, 54, 15, 500, settings.muted, 'App screen copy'),
                    this.createSkeletonFrameNode(request, `${baseId}-app-panel`, 'Primary app panel', 'card', 28, 300, 334, 250, '#ffffff', 24, [
                        this.createSkeletonFrameNode(request, `${baseId}-app-field-one`, 'Input row one', 'input', 24, 28, 286, 54, '#f1f5f9', 14),
                        this.createSkeletonFrameNode(request, `${baseId}-app-field-two`, 'Input row two', 'input', 24, 100, 286, 54, '#f1f5f9', 14),
                        this.createSkeletonFrameNode(request, `${baseId}-app-button`, 'Primary action', 'button', 24, 178, 286, 52, settings.accent, 16)
                    ]),
                    this.createSkeletonFrameNode(request, `${baseId}-app-list`, 'Secondary content list', 'section', 28, 584, 334, 128, '#1e293b', 20),
                    this.createSkeletonFrameNode(request, `${baseId}-app-nav`, 'Bottom navigation', 'navigation', 44, 760, 302, 54, '#111827', 20)
                ];
            case 'poster':
                return [
                    this.createTextNode(request, `${baseId}-poster-label`, 'VISUAL CONCEPT', 52, 54, 260, 26, 15, 800, settings.accent, 'Poster label'),
                    this.createTextNode(request, `${baseId}-poster-title`, headline, 52, 116, 600, 130, 54, 800, settings.foreground, 'Poster title'),
                    this.createTextNode(request, `${baseId}-poster-copy`, body, 52, 266, 560, 58, 18, 500, settings.muted, 'Poster copy'),
                    this.createSkeletonFrameNode(request, `${baseId}-poster-visual`, 'Poster hero visual', 'image', 52, 360, 616, 380, '#273449', 28),
                    this.createSkeletonFrameNode(request, `${baseId}-poster-footer`, 'Poster footer band', 'section', 52, 802, 616, 72, settings.accent, 16)
                ];
            case 'banner':
                return [
                    this.createTextNode(request, `${baseId}-banner-title`, headline, 64, 70, 560, 92, 42, 800, settings.foreground, 'Banner title'),
                    this.createTextNode(request, `${baseId}-banner-copy`, body, 64, 176, 520, 56, 17, 500, settings.muted, 'Banner copy'),
                    this.createSkeletonFrameNode(request, `${baseId}-banner-button`, 'Banner CTA', 'button', 64, 270, 180, 54, settings.accent, 14),
                    this.createSkeletonFrameNode(request, `${baseId}-banner-visual`, 'Banner visual', 'image', 700, 54, 420, 300, '#1e293b', 28)
                ];
            case 'social':
                return [
                    this.createSkeletonFrameNode(request, `${baseId}-social-visual`, 'Social visual area', 'image', 96, 96, 888, 520, '#e2e8f0', 34),
                    this.createTextNode(request, `${baseId}-social-title`, headline, 96, 680, 780, 116, 54, 800, settings.foreground, 'Social title'),
                    this.createTextNode(request, `${baseId}-social-copy`, body, 96, 814, 760, 62, 24, 500, settings.muted, 'Social copy'),
                    this.createSkeletonFrameNode(request, `${baseId}-social-badge`, 'Social accent badge', 'badge', 96, 918, 260, 64, settings.accent, 32)
                ];
            case 'wireframe':
                return [
                    this.createSkeletonFrameNode(request, `${baseId}-wire-nav`, 'Wireframe navigation', 'navigation', 40, 36, 880, 62, '#e2e8f0', 10),
                    this.createSkeletonFrameNode(request, `${baseId}-wire-hero`, 'Wireframe hero', 'hero', 40, 126, 880, 180, '#ffffff', 12),
                    this.createSkeletonFrameNode(request, `${baseId}-wire-card-one`, 'Wireframe card one', 'card', 40, 340, 270, 190, '#ffffff', 12),
                    this.createSkeletonFrameNode(request, `${baseId}-wire-card-two`, 'Wireframe card two', 'card', 345, 340, 270, 190, '#ffffff', 12),
                    this.createSkeletonFrameNode(request, `${baseId}-wire-card-three`, 'Wireframe card three', 'card', 650, 340, 270, 190, '#ffffff', 12)
                ];
            case 'diagram':
                return [
                    this.createTextNode(request, `${baseId}-diagram-title`, headline, 56, 42, 760, 46, 30, 800, settings.foreground, 'Diagram title'),
                    this.createSkeletonFrameNode(request, `${baseId}-diagram-node-one`, 'Diagram node one', 'node', 70, 160, 220, 110, '#dbeafe', 18),
                    this.createSkeletonFrameNode(request, `${baseId}-diagram-line-one`, 'Diagram connector one', 'connector', 300, 208, 180, 14, settings.accent, 7),
                    this.createSkeletonFrameNode(request, `${baseId}-diagram-node-two`, 'Diagram node two', 'node', 490, 160, 220, 110, '#e0f2fe', 18),
                    this.createSkeletonFrameNode(request, `${baseId}-diagram-line-two`, 'Diagram connector two', 'connector', 595, 286, 14, 105, settings.accent, 7),
                    this.createSkeletonFrameNode(request, `${baseId}-diagram-node-three`, 'Diagram node three', 'node', 390, 410, 220, 110, '#dcfce7', 18),
                    this.createSkeletonFrameNode(request, `${baseId}-diagram-node-four`, 'Diagram node four', 'node', 720, 410, 220, 110, '#fef3c7', 18)
                ];
            case 'reference-board':
                return [
                    this.createTextNode(request, `${baseId}-board-title`, headline, 56, 38, 720, 46, 30, 800, settings.foreground, 'Reference board title'),
                    this.createSkeletonFrameNode(request, `${baseId}-board-tile-one`, 'Reference tile one', 'image', 56, 120, 310, 420, '#ffffff', 18),
                    this.createSkeletonFrameNode(request, `${baseId}-board-tile-two`, 'Reference tile two', 'image', 405, 120, 310, 420, '#ffffff', 18),
                    this.createSkeletonFrameNode(request, `${baseId}-board-tile-three`, 'Reference tile three', 'image', 754, 120, 310, 420, '#ffffff', 18),
                    this.createSkeletonFrameNode(request, `${baseId}-board-notes`, 'Reference notes', 'section', 56, 580, 1008, 82, '#ffffff', 16)
                ];
            case 'component':
            default:
                return [
                    this.createTextNode(request, `${baseId}-component-title`, headline, 40, 36, 480, 42, 30, 800, settings.foreground, 'Component title'),
                    this.createTextNode(request, `${baseId}-component-copy`, body, 40, 90, 500, 44, 16, 500, settings.muted, 'Component copy'),
                    this.createSkeletonFrameNode(request, `${baseId}-component-preview`, 'Component preview panel', 'component', 40, 166, 600, 150, '#f8fafc', 16),
                    this.createSkeletonFrameNode(request, `${baseId}-component-control-one`, 'Component action one', 'button', 40, 344, 160, 44, settings.accent, 12),
                    this.createSkeletonFrameNode(request, `${baseId}-component-control-two`, 'Component action two', 'button', 218, 344, 140, 44, '#e2e8f0', 12)
                ];
        }
    }

    protected createSkeletonFrameNode(
        request: OpenPencilAiDesignRequest,
        idBase: string,
        name: string,
        role: string,
        x: number,
        y: number,
        width: number,
        height: number,
        color: string,
        cornerRadius: number,
        children: OpenPencilNode[] = []
    ): OpenPencilNode {
        return {
            id: this.uniqueAiId(request.document, idBase),
            type: 'frame',
            name,
            role,
            x,
            y,
            width,
            height,
            cornerRadius,
            layout: 'none',
            fill: [{ type: 'solid', color }],
            stroke: role === 'image' ? { color: '#94a3b8', width: 1 } : undefined,
            effects: role === 'card' || role === 'product-card'
                ? [{ type: 'shadow', offsetX: 0, offsetY: 2, blur: 8, spread: 0, color: 'rgba(15, 23, 42, 0.08)' }]
                : undefined,
            children
        };
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

    protected normalizeDocumentVisibleBounds(document: OpenPencilDocument, options: OpenPencilApplyOperationsOptions = {}): boolean {
        const page = this.documents.getActivePage(document);
        let changed = false;
        const preservedPageWidth = options.preservePageWidth
            ? this.preservedPageWidth(page, options.targetPageWidth)
            : undefined;
        if (preservedPageWidth !== undefined && page.width !== preservedPageWidth) {
            page.width = preservedPageWidth;
            changed = true;
        }

        for (let pass = 0; pass < 12; pass++) {
            let passChanged = false;
            passChanged = this.removeInternalCanvasPlaceholderNodes(page.children) || passChanged;
            for (const node of page.children) {
                passChanged = this.normalizeNodeVisibleBounds(node, options.preservePageWidth === true, preservedPageWidth) || passChanged;
            }
            passChanged = this.normalizePageVisibleBounds(page, preservedPageWidth) || passChanged;
            changed = passChanged || changed;
            if (!passChanged) {
                break;
            }
        }
        if (options.removeAiPlaceholderSkeletons) {
            changed = this.removeFinalAiPlaceholderSkeletonNodes(page.children) || changed;
        }
        for (let pass = 0; pass < 6; pass++) {
            let repairChanged = false;
            for (const node of page.children) {
                repairChanged = this.repairRemainingAiLayoutQualityIssues(node, preservedPageWidth) || repairChanged;
            }
            repairChanged = this.normalizePageVisibleBounds(page, preservedPageWidth) || repairChanged;
            changed = repairChanged || changed;
            if (!repairChanged) {
                break;
            }
        }
        return changed;
    }

    protected removeFinalAiPlaceholderSkeletonNodes(children: OpenPencilNode[], depth = 0): boolean {
        let changed = false;
        for (let index = children.length - 1; index >= 0; index--) {
            const child = children[index];
            if (child.children?.length) {
                changed = this.removeFinalAiPlaceholderSkeletonNodes(child.children, depth + 1) || changed;
            }
            if (this.isFinalAiPlaceholderSkeletonNode(child, depth + 1)) {
                children.splice(index, 1);
                changed = true;
            }
        }
        return changed;
    }

    protected isFinalAiPlaceholderSkeletonNode(node: OpenPencilNode, depth: number): boolean {
        if (depth <= 0 || node.visible === false || node.enabled === false || node.enabled === 'false') {
            return false;
        }
        if (this.isTextLikeNode(node)) {
            const content = this.nodeTextContent(node).trim().replace(/\s+/g, ' ').toLowerCase();
            return content === 'openpencil design'
                || content === 'edit this embedded .op design inside theia.'
                || /\b(generated skeleton|skeleton brand|placeholder text|texto curto para completar a narrativa visual)\b/i.test(content);
        }
        if (node.children?.length) {
            return false;
        }
        if (node.type !== 'frame' && node.type !== 'group' && node.type !== 'rectangle') {
            return false;
        }
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        return /\bgeneric-(?:nav|navigation|card|footer|section|block|panel|hero)\b/.test(label)
            || /\b(page navigation skeleton|closing section skeleton|feature card (?:one|two|three)|blank (?:card|frame|section|panel)|empty (?:card|frame|section|panel))\b/.test(label)
            || (/\b(skeleton|placeholder)\b/.test(label) && /\b(generic|navigation|footer|section|card|blank|empty)\b/.test(label));
    }

    protected repairRemainingAiLayoutQualityIssues(node: OpenPencilNode, maxWidth?: number): boolean {
        let changed = false;
        const nodeWidth = this.numericDimensionValue(node.width) ?? maxWidth;
        for (const child of node.children ?? []) {
            changed = this.repairRemainingAiLayoutQualityIssues(child, nodeWidth) || changed;
        }
        if (nodeWidth === undefined || nodeWidth < 120) {
            return changed;
        }
        const nodeHeight = this.numericDimensionValue(node.height);
        const candidates = this.visibleChildren(node.children ?? [])
            .filter(child => this.shouldIncludeFinalAiLayoutRepairChild(child));
        if (candidates.length < 2 || !this.childrenNeedFinalAiLayoutRepair(candidates, nodeWidth, nodeHeight)) {
            return this.expandNodeToVisibleChildren(node) || changed;
        }

        if (this.shouldRepairFinalAiLayoutAsHorizontalRow(node, candidates, nodeWidth)) {
            changed = this.normalizeOverflowingHorizontalRowWithinWidth(node, nodeWidth) || changed;
        } else {
            changed = this.stackRemainingChildrenVerticallyWithinWidth(node, nodeWidth, candidates) || changed;
        }
        changed = this.expandNodeToVisibleChildren(node) || changed;
        return changed;
    }

    protected shouldIncludeFinalAiLayoutRepairChild(node: OpenPencilNode): boolean {
        if (this.isAiLayoutIgnoredOverlay(node)) {
            return false;
        }
        return this.isAiLayoutForegroundNode(node)
            || this.isTextLikeNode(node)
            || this.isAiLayoutMediaOrControlNode(node)
            || this.isCardLikeHomepageChild(node)
            || this.isFeatureCardLikeChild(node);
    }

    protected childrenNeedFinalAiLayoutRepair(children: OpenPencilNode[], width: number, height?: number): boolean {
        const tolerance = 2;
        if (children.some(child => {
            const x = this.numberValue(child.x, 0);
            const y = this.numberValue(child.y, 0);
            const childWidth = this.visibleNodeWidth(child);
            const childHeight = this.visibleNodeHeight(child);
            return x < -tolerance
                || x + childWidth > width + tolerance
                || y < -tolerance
                || (height !== undefined && y + childHeight > height + tolerance);
        })) {
            return true;
        }
        return this.childrenHaveReportableAiLayoutOverlap(children);
    }

    protected shouldRepairFinalAiLayoutAsHorizontalRow(node: OpenPencilNode, children: OpenPencilNode[], width: number): boolean {
        if (this.shouldProtectCardInternalLayout(node, width)) {
            return false;
        }
        return this.isNavigationLikeNode(node)
            || this.isRowLikeManualContainer(node)
            || this.shouldArrangeOverlappingCardChildrenAsRow(node, children, width);
    }

    protected expandNodeToVisibleChildren(node: OpenPencilNode): boolean {
        const bounds = this.createNodeChildrenVisibleBounds(node);
        if (!bounds) {
            return false;
        }
        let changed = false;
        const width = this.numericDimensionValue(node.width);
        const height = this.numericDimensionValue(node.height);
        if (node.clipContent && (bounds.left < 0 || bounds.top < 0 || (width !== undefined && bounds.right > width) || (height !== undefined && bounds.bottom > height))) {
            node.clipContent = false;
            changed = true;
        }
        if (width !== undefined && bounds.right > width) {
            node.width = this.ceilVisibleBound(bounds.right);
            changed = true;
        }
        if (height !== undefined && bounds.bottom > height) {
            node.height = this.ceilVisibleBound(bounds.bottom);
            changed = true;
        }
        return changed;
    }

    protected normalizeNodeVisibleBounds(node: OpenPencilNode, preservePageWidth = false, maxWidth?: number): boolean {
        let changed = false;
        for (const child of node.children ?? []) {
            changed = this.normalizeNodeVisibleBounds(child, preservePageWidth, this.numericDimensionValue(node.width) ?? maxWidth) || changed;
        }
        let bounds = this.createNodeChildrenVisibleBounds(node);
        if (!bounds) {
            return changed;
        }

        let width = this.numericDimensionValue(node.width);
        const height = this.numericDimensionValue(node.height);
        if (preservePageWidth && width !== undefined && maxWidth !== undefined && this.shouldClampOversizedPageContainer(node, width, maxWidth)) {
            node.width = maxWidth;
            width = maxWidth;
            changed = true;
        }
        if (preservePageWidth && width !== undefined && maxWidth !== undefined && this.shouldExpandPageLikeContainerToWidth(node, width, maxWidth)) {
            node.width = maxWidth;
            width = maxWidth;
            changed = true;
        }
        if (preservePageWidth && width !== undefined && maxWidth !== undefined && this.shouldAlignExpandedPageLikeContainer(node, width, maxWidth)) {
            node.x = 0;
            changed = true;
        }
        if (preservePageWidth && width !== undefined && this.shouldStackHomepageFlowChildren(node, width)) {
            if (node.layout !== 'none') {
                node.layout = 'none';
                changed = true;
            }
            changed = this.stackManualChildrenVerticallyWithinWidth(node.children ?? [], width) || changed;
            bounds = this.createNodeChildrenVisibleBounds(node);
            if (!bounds) {
                return changed;
            }
        }
        if (preservePageWidth && width !== undefined && this.shouldGridHomepageShelfChildren(node, bounds, width)) {
            changed = this.gridHomepageShelfChildrenWithinWidth(node, width) || changed;
            bounds = this.createNodeChildrenVisibleBounds(node);
            if (!bounds) {
                return changed;
            }
        }
        if (preservePageWidth && width !== undefined && this.shouldGridFeatureCardChildren(node, width)) {
            changed = this.gridFeatureCardChildrenWithinWidth(node, width) || changed;
            bounds = this.createNodeChildrenVisibleBounds(node);
            if (!bounds) {
                return changed;
            }
        }
        if (preservePageWidth && width !== undefined && this.shouldStackOverlappingCardChildren(node, width)) {
            changed = this.stackOverlappingCardChildrenWithinBounds(node, width) || changed;
            bounds = this.createNodeChildrenVisibleBounds(node);
            if (!bounds) {
                return changed;
            }
        }
        if (preservePageWidth && width !== undefined && this.shouldStackColumnLikeManualChildren(node, width)) {
            changed = this.stackOverlappingCardChildrenWithinBounds(node, width) || changed;
            bounds = this.createNodeChildrenVisibleBounds(node);
            if (!bounds) {
                return changed;
            }
        }
        if (preservePageWidth && width !== undefined && this.shouldRepairOverlappingManualChildren(node, width)) {
            changed = this.repairOverlappingManualChildrenWithinBounds(node, width) || changed;
            bounds = this.createNodeChildrenVisibleBounds(node);
            if (!bounds) {
                return changed;
            }
        }
        if (preservePageWidth && width !== undefined && this.shouldNormalizeManualRowChildren(node, bounds, width)) {
            changed = this.normalizeOverflowingHorizontalRowWithinWidth(node, width) || changed;
            bounds = this.createNodeChildrenVisibleBounds(node);
            if (!bounds) {
                return changed;
            }
        }
        if (preservePageWidth && width !== undefined && this.shouldNormalizeOverflowingHorizontalRow(node, bounds, width)) {
            changed = this.normalizeOverflowingHorizontalRowWithinWidth(node, width) || changed;
            bounds = this.createNodeChildrenVisibleBounds(node);
            if (!bounds) {
                return changed;
            }
        }
        if (preservePageWidth && width !== undefined && this.shouldWrapOverflowingHorizontalLayoutChildren(node, bounds, width)) {
            changed = this.wrapHorizontalLayoutChildrenWithinWidth(node, width) || changed;
            bounds = this.createNodeChildrenVisibleBounds(node);
            if (!bounds) {
                return changed;
            }
        }
        if (preservePageWidth && width !== undefined && this.shouldReflowOverflowingChildren(node, bounds, width)) {
            changed = this.reflowManualChildrenWithinWidth(node.children ?? [], width) || changed;
            bounds = this.createNodeChildrenVisibleBounds(node);
            if (!bounds) {
                return changed;
            }
        }
        if (width !== undefined && this.shouldStrictRepairRemainingSiblingLayout(node, bounds, width)) {
            changed = this.strictRepairRemainingSiblingLayoutWithinWidth(node, width) || changed;
            bounds = this.createNodeChildrenVisibleBounds(node);
            if (!bounds) {
                return changed;
            }
        }
        if (preservePageWidth && width !== undefined && this.shouldClampChildrenWithinBounds(node, bounds, width, height)) {
            changed = this.clampChildrenWithinBounds(node, width, height) || changed;
            bounds = this.createNodeChildrenVisibleBounds(node);
            if (!bounds) {
                return changed;
            }
        }

        const overflowsX = width !== undefined && (bounds.left < 0 || bounds.right > width);
        const overflowsY = height !== undefined && (bounds.top < 0 || bounds.bottom > height);
        const shouldMaterializeWidth = width === undefined && !!node.clipContent && bounds.right > 0;
        const shouldMaterializeHeight = height === undefined && !!node.clipContent && bounds.bottom > 0;

        if ((overflowsX || overflowsY || bounds.left < 0 || bounds.top < 0) && node.clipContent) {
            node.clipContent = false;
            changed = true;
        }
        if (!preservePageWidth && ((width !== undefined && bounds.right > width) || shouldMaterializeWidth)) {
            node.width = this.ceilVisibleBound(bounds.right);
            changed = true;
        }
        if ((height !== undefined && bounds.bottom > height) || shouldMaterializeHeight) {
            node.height = this.ceilVisibleBound(bounds.bottom);
            changed = true;
        }
        return changed;
    }

    protected normalizePageVisibleBounds(page: OpenPencilPage, preservedPageWidth?: number): boolean {
        let changed = false;
        if (preservedPageWidth !== undefined) {
            changed = this.stackManualChildrenVerticallyWithinWidth(page.children, preservedPageWidth) || changed;
            changed = this.reflowManualChildrenWithinWidth(page.children, preservedPageWidth) || changed;
        }
        let bounds = this.createManualChildrenVisibleBounds(page.children);
        if (!bounds) {
            return changed;
        }
        let normalizedBounds = bounds;
        const dx = bounds.left < 0 ? Math.ceil(-bounds.left) : 0;
        const dy = bounds.top < 0 ? Math.ceil(-bounds.top) : 0;
        if (dx || dy) {
            for (const node of page.children) {
                node.x = this.numberValue(node.x, 0) + dx;
                node.y = this.numberValue(node.y, 0) + dy;
            }
            normalizedBounds = {
                left: bounds.left + dx,
                top: bounds.top + dy,
                right: bounds.right + dx,
                bottom: bounds.bottom + dy
            };
            changed = true;
        }

        const pageWidth = Math.max(120, preservedPageWidth ?? this.numberValue(page.width, 900));
        const pageHeight = Math.max(120, this.numberValue(page.height, 620));
        const margin = Math.min(40, Math.floor(Math.min(pageWidth, pageHeight) / 8));
        if (preservedPageWidth !== undefined && normalizedBounds.right > pageWidth) {
            const reflowed = this.reflowManualChildrenWithinWidth(page.children, pageWidth);
            if (reflowed) {
                bounds = this.createManualChildrenVisibleBounds(page.children);
                normalizedBounds = bounds ?? normalizedBounds;
                changed = true;
            }
        }
        if (preservedPageWidth === undefined && normalizedBounds.right > pageWidth) {
            page.width = this.ceilVisibleBound(normalizedBounds.right + margin);
            changed = true;
        } else if (preservedPageWidth !== undefined && page.width !== preservedPageWidth) {
            page.width = preservedPageWidth;
            changed = true;
        }
        if (normalizedBounds.bottom > pageHeight) {
            page.height = this.ceilVisibleBound(normalizedBounds.bottom + margin);
            changed = true;
        }
        return changed;
    }

    protected preservedPageWidth(page: OpenPencilPage, targetPageWidth: number | undefined): number {
        const current = Math.max(120, this.numberValue(page.width, 900));
        const target = Math.max(900, Math.min(1440, Math.round(targetPageWidth ?? 1200)));
        if (current > 1600) {
            return target;
        }
        return Math.max(current, target);
    }

    protected shouldReflowOverflowingChildren(node: OpenPencilNode, bounds: OpenPencilVisibleBounds, width: number): boolean {
        if ((node.layout === 'horizontal' || node.layout === 'vertical') || bounds.right <= width || width < 560) {
            return false;
        }
        if (this.shouldProtectCardInternalLayout(node, width)) {
            return false;
        }
        const children = this.visibleChildren(node.children ?? []);
        if (children.length < 3) {
            return false;
        }
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        return children.length >= 6
            || /\b(page|homepage|home|screen|view|section|content|products?|offers?|cards?|grid|list|catalog|categoria|categorias|ofertas?|produtos?)\b/.test(label);
    }

    protected shouldClampOversizedPageContainer(node: OpenPencilNode, width: number, maxWidth: number): boolean {
        if (width <= maxWidth || maxWidth < 560 || node.type !== 'frame') {
            return false;
        }
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        return width > maxWidth * 1.15
            && /\b(page|homepage|home|screen|view|website|site|marketplace|e-?commerce|catalog|landing|pagina|página|tela)\b/.test(label);
    }

    protected shouldExpandPageLikeContainerToWidth(node: OpenPencilNode, width: number, maxWidth: number): boolean {
        if (width >= maxWidth * 0.92 || maxWidth < 560 || node.type !== 'frame') {
            return false;
        }
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        if (width >= 1120 && /\b(page|homepage|home|screen|view|website|site|main|root|pagina|página|tela)\b/.test(label)) {
            return false;
        }
        const children = this.visibleFlowChildren(node.children ?? [], maxWidth);
        if (!children.length) {
            return false;
        }
        const pageLike = /\b(page|homepage|home|screen|view|website|site|marketplace|e-?commerce|catalog|landing|content|main|pagina|página|tela)\b/.test(label);
        const structuralSection = node.role === 'section'
            || node.role === 'main'
            || node.role === 'navigation'
            || node.role === 'header'
            || node.role === 'footer';
        const sectionLikeChildren = children.filter(child => this.isHomepageSectionLikeNode(child, maxWidth)).length;
        return pageLike || structuralSection || sectionLikeChildren >= Math.min(2, children.length);
    }

    protected shouldAlignExpandedPageLikeContainer(node: OpenPencilNode, width: number, maxWidth: number): boolean {
        if (node.type !== 'frame' || width < maxWidth * 0.96) {
            return false;
        }
        const x = this.numberValue(node.x, 0);
        if (x <= 0 || x + width <= maxWidth + 2) {
            return false;
        }
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        return /\b(page|homepage|home|screen|view|website|site|main|root|pagina|página|tela)\b/.test(label);
    }

    protected shouldWrapOverflowingHorizontalLayoutChildren(node: OpenPencilNode, bounds: OpenPencilVisibleBounds, width: number): boolean {
        if (node.layout !== 'horizontal' || bounds.right <= width || width < 360) {
            return false;
        }
        if (this.shouldProtectCardInternalLayout(node, width)) {
            return false;
        }
        const children = this.visibleFlowChildren(node.children ?? [], width);
        if (children.length < 3) {
            return false;
        }
        if (this.isNavigationLikeNode(node) && children.length < 8) {
            return false;
        }
        const cardLikeChildren = children.filter(child => this.isCardLikeHomepageChild(child)).length;
        return this.isShelfLikeNode(node) || cardLikeChildren >= Math.min(2, children.length);
    }

    protected shouldGridHomepageShelfChildren(node: OpenPencilNode, bounds: OpenPencilVisibleBounds, width: number): boolean {
        if (width < 720 || this.isNavigationLikeNode(node)) {
            return false;
        }
        const children = this.visibleFlowChildren(node.children ?? [], width);
        const cardChildren = children.filter(child => this.isCardLikeHomepageChild(child));
        if (cardChildren.length < 3 || !this.isShelfLikeNode(node)) {
            return false;
        }
        const grid = this.homepageShelfGridMetrics(node, width);
        if (grid.columns < 2) {
            return false;
        }
        const oversizedCards = cardChildren.some(child => this.visibleNodeWidth(child) > grid.cardWidth * 1.12);
        const collapsedCards = cardChildren.some(child => child.width === 'fill_container' || this.visibleNodeWidth(child) < Math.min(96, grid.cardWidth * 0.35));
        const similarX = cardChildren.every(child => Math.abs(this.numberValue(child.x, 0) - this.numberValue(cardChildren[0].x, 0)) <= 24);
        const spreadY = Math.max(...cardChildren.map(child => this.numberValue(child.y, 0)))
            - Math.min(...cardChildren.map(child => this.numberValue(child.y, 0)));
        return bounds.right > width || oversizedCards || collapsedCards || (similarX && spreadY > 24) || node.layout === 'horizontal';
    }

    protected homepageShelfGridMetrics(node: OpenPencilNode, maxWidth: number): { columns: number; cardWidth: number; gap: number; left: number; top: number; rightLimit: number; availableWidth: number } {
        const padding = this.normalizedPadding(node.padding);
        const gap = Math.max(8, Math.min(24, this.numberValue(node.gap, 12)));
        const left = Math.max(0, padding.left);
        const top = Math.max(0, padding.top);
        const rightLimit = Math.max(left + 1, maxWidth - Math.max(0, padding.right));
        const availableWidth = Math.max(1, rightLimit - left);
        const columns = Math.max(1, Math.min(4, Math.floor((availableWidth + gap) / (280 + gap))));
        const cardWidth = Math.max(120, Math.floor((availableWidth - gap * (columns - 1)) / columns));
        return { columns, cardWidth, gap, left, top, rightLimit, availableWidth };
    }

    protected shouldGridFeatureCardChildren(node: OpenPencilNode, width: number): boolean {
        if (width < 720 || node.layout === 'horizontal' || node.layout === 'vertical') {
            return false;
        }
        const children = this.visibleFlowChildren(node.children ?? [], width);
        const featureChildren = children.filter(child => this.isFeatureCardLikeChild(child));
        if (featureChildren.length < 2) {
            return false;
        }
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        const hasBrokenFeatureWidth = featureChildren.some(child => {
            const childWidth = this.visibleNodeWidth(child);
            return childWidth < width * 0.22 || child.width === 'fill_container' || childWidth > width * 0.75;
        });
        return hasBrokenFeatureWidth || /\b(benefits?|beneficios?|benefícios?|features?|vantagens?|canais|ajuda|pagamento|envio|prote[cç][aã]o)\b/.test(label);
    }

    protected isFeatureCardLikeChild(node: OpenPencilNode): boolean {
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        if (this.isTextLikeNode(node) || node.type === 'image' || node.type === 'icon_font') {
            return false;
        }
        return node.role === 'feature-card'
            || node.role === 'card' && /\b(feature-card|benefit|beneficio|benefício|beneficios|benefícios|pagamento|parcelamento|envio|prote[cç][aã]o|compra protegida)\b/.test(label);
    }

    protected isNavigationLikeNode(node: OpenPencilNode): boolean {
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        return /\b(header|navbar|nav|menu|search|busca|barra|cabecalho|cabeçalho|topbar)\b/.test(label);
    }

    protected isShelfLikeNode(node: OpenPencilNode): boolean {
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        return /\b(grid|grade|row|linha|shelf|shelves|cards?|product|products|produto|produtos|offer|offers|oferta|ofertas|carousel|carrossel|catalog|catalogo|catálogo|recommend|recomend|vitrine|prateleira)\b/.test(label);
    }

    protected isCardLikeHomepageChild(node: OpenPencilNode): boolean {
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        return node.role === 'card'
            || node.role === 'product'
            || /\b(card|product|products|produto|produtos|offer|offers|oferta|ofertas|item|sku|tile|banner)\b/.test(label);
    }

    protected shouldProtectCardInternalLayout(node: OpenPencilNode, width: number): boolean {
        if (!this.isCardLikeHomepageChild(node) && !this.isFeatureCardLikeChild(node)) {
            return false;
        }
        if (this.isRepairableStructuralContainer(node, width)) {
            return false;
        }
        return true;
    }

    protected isRepairableStructuralContainer(node: OpenPencilNode, width: number): boolean {
        if (width < 360 || (node.type !== 'frame' && node.type !== 'group')) {
            return false;
        }
        const children = this.visibleChildren(node.children ?? []);
        if (children.length < 2) {
            return false;
        }
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        const structuralRole = node.role === 'section'
            || node.role === 'main'
            || node.role === 'header'
            || node.role === 'footer'
            || node.role === 'navigation'
            || node.role === 'row'
            || node.role === 'grid'
            || node.role === 'column';
        const broadStructuralLabel = /\b(page|homepage|home|screen|view|website|site|app|artboard|canvas|composition|landing|content|main|root|document|section|region|container|wrapper|wrap|shell|header|footer|rodap[eé]|navbar|nav|navigation|navega[cç][aã]o|row|linha|grid|grade|shelf|prateleira|list|catalog|catalogo|catálogo|category|categoria|categorias|benefits?|beneficios?|benefícios?|services?|servi[cç]os|payment|payments|pagamento|pagamentos)\b/.test(label);
        const wideHeroOrPromo = width >= 720
            && /\b(hero|banner|promo|campaign|campanha|deal|deals|destaque|feature|features|spotlight)\b/.test(label);
        const cardChildren = children.filter(child => this.isCardLikeHomepageChild(child) || this.isFeatureCardLikeChild(child)).length;
        const sectionChildren = children.filter(child => this.isHomepageSectionLikeNode(child, width)).length;
        const hasBrokenWideChildren = this.childrenOverflowParentWidth(children, width) || this.childrenHaveSignificantManualOverlap(children);
        return structuralRole
            || broadStructuralLabel
            || wideHeroOrPromo
            || (width >= 560 && children.length >= 3 && (cardChildren >= 2 || sectionChildren >= 2) && hasBrokenWideChildren);
    }

    protected isMediaLikeHomepageChild(node: OpenPencilNode): boolean {
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        return node.type === 'image'
            || /\b(image|imagem|foto|photo|picture|media|visual|thumbnail|thumb|mockup|notebook|fone|headphone|cadeira|laptop|produto)\b/.test(label);
    }

    protected shouldStackHomepageFlowChildren(node: OpenPencilNode, width: number): boolean {
        if (width < 560) {
            return false;
        }
        const children = this.visibleFlowChildren(node.children ?? [], width);
        if (children.length < 2) {
            return false;
        }
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        if (/\b(grid|grade|row|linha|shelf|shelves|cards?|products?|produtos?|offers?|ofertas?|carousel|carrossel)\b/.test(label)) {
            return false;
        }
        const pageLike = this.isPageLikeFlowContainer(node, children, width);
        const sectionLikeChildren = children.filter(child => this.isHomepageSectionLikeNode(child, width)).length;
        const sideBySideMajorSections = this.childrenContainSideBySideMajorFlowSections(node, children, width);
        if (node.layout === 'horizontal') {
            return pageLike || sectionLikeChildren >= Math.min(2, children.length) || sideBySideMajorSections;
        }
        if (node.layout === 'vertical') {
            return (pageLike || sectionLikeChildren >= Math.min(2, children.length) || sideBySideMajorSections)
                && (sideBySideMajorSections || this.childrenHaveSignificantManualOverlap(children) || this.childrenOverflowParentWidth(children, width));
        }
        return pageLike || sectionLikeChildren >= Math.min(2, children.length) || sideBySideMajorSections;
    }

    protected childrenContainSideBySideMajorFlowSections(parent: OpenPencilNode, children: OpenPencilNode[], width: number): boolean {
        return this.findSideBySideMajorFlowSectionPair({
            label: this.aiLayoutNodeLabel(parent),
            pageRoot: false,
            verticalPageFlow: true,
            width
        }, children) !== undefined;
    }

    protected isPageLikeFlowContainer(node: OpenPencilNode, children: OpenPencilNode[], width: number): boolean {
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        const pageLikeLabel = /\b(page|homepage|home|screen|view|website|site|app|artboard|canvas|composition|composi[cç][aã]o|landing|content|main|root|document|pagina|página|tela)\b/.test(label);
        const sectionLikeChildren = children.filter(child => this.isHomepageSectionLikeNode(child, width)).length;
        const wideChildren = children.filter(child => this.visibleNodeWidth(child) >= width * 0.35).length;
        return pageLikeLabel || sectionLikeChildren >= 2 || (children.length >= 3 && wideChildren >= 2);
    }

    protected childrenOverflowParentWidth(children: OpenPencilNode[], width: number): boolean {
        return children.some(child => {
            const x = this.numberValue(child.x, 0);
            return x < 0 || x + this.visibleNodeWidth(child) > width;
        });
    }

    protected isHomepageSectionLikeNode(node: OpenPencilNode, pageWidth: number): boolean {
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        const width = this.visibleNodeWidth(node);
        const height = this.visibleNodeHeight(node);
        return node.type === 'frame'
            && height >= 40
            && (width >= pageWidth * 0.35 || /\b(header|nav|hero|section|content|footer|rodap[eé]|banner|promo|category|categoria|shelf|ofertas?|produtos?|benefits?|canais|ajuda|venda|app)\b/.test(label));
    }

    protected visibleFlowChildren(children: OpenPencilNode[], maxWidth: number): OpenPencilNode[] {
        return this.visibleChildren(children).filter(child => child.role !== 'overlay' || this.shouldTreatOverlayAsRepairableFlowChild(child, maxWidth));
    }

    protected shouldTreatOverlayAsRepairableFlowChild(node: OpenPencilNode, maxWidth: number): boolean {
        return this.isHomepageSectionLikeNode(node, maxWidth)
            || this.isCardLikeHomepageChild(node)
            || this.isFeatureCardLikeChild(node)
            || this.isTextLikeNode(node)
            || this.isAiLayoutMediaOrControlNode(node);
    }

    protected stackManualChildrenVerticallyWithinWidth(children: OpenPencilNode[], maxWidth: number): boolean {
        const visible = this.visibleFlowChildren(children, maxWidth)
            .filter(child => this.shouldIncludeStackedFlowChild(child, maxWidth));
        if (visible.length < 2 || maxWidth < 120) {
            return false;
        }

        const sorted = visible.slice().sort((left, right) => {
            const topDelta = this.numberValue(left.y, 0) - this.numberValue(right.y, 0);
            return Math.abs(topDelta) > 16 ? topDelta : this.numberValue(left.x, 0) - this.numberValue(right.x, 0);
        });
        const minTop = Math.max(0, Math.min(...sorted.map(node => this.numberValue(node.y, 0))));
        const gap = Math.max(16, Math.min(36, Math.round(maxWidth * 0.02)));
        let cursorY = minTop;
        let changed = false;

        for (const node of sorted) {
            let width = this.visibleNodeWidth(node);
            if (this.shouldMaterializeStackedFlowChildWidth(node, width, maxWidth)) {
                node.width = maxWidth;
                width = maxWidth;
                changed = true;
            }
            if (node.type === 'frame' && width > maxWidth) {
                node.width = maxWidth;
                width = maxWidth;
                changed = true;
            }
            const targetX = width >= maxWidth * 0.92
                ? 0
                : Math.max(0, Math.min(Math.round((maxWidth - width) / 2), maxWidth - width));
            if (this.numberValue(node.x, 0) !== targetX) {
                node.x = targetX;
                changed = true;
            }
            if (this.numberValue(node.y, 0) !== cursorY) {
                node.y = this.roundScaledValue(cursorY);
                changed = true;
            }
            cursorY += this.visibleNodeHeight(node) + gap;
        }

        return changed;
    }

    protected shouldIncludeStackedFlowChild(node: OpenPencilNode, maxWidth: number): boolean {
        const height = this.visibleNodeHeight(node);
        if (height <= 0 && !this.visibleChildren(node.children ?? []).length) {
            return false;
        }
        const width = this.visibleNodeWidth(node);
        if (width > 0) {
            return true;
        }
        return this.shouldMaterializeStackedFlowChildWidth(node, width, maxWidth);
    }

    protected shouldMaterializeStackedFlowChildWidth(node: OpenPencilNode, width: number, maxWidth: number): boolean {
        if (node.type !== 'frame' || maxWidth < 120 || width > 0) {
            return false;
        }
        return node.width === 'fill_container'
            || this.numericDimensionValue(node.width) === undefined
            || this.isHomepageSectionLikeNode(node, maxWidth)
            || this.visibleChildren(node.children ?? []).length > 0;
    }

    protected gridHomepageShelfChildrenWithinWidth(node: OpenPencilNode, maxWidth: number): boolean {
        const allChildren = this.visibleFlowChildren(node.children ?? [], maxWidth);
        const cardChildren = allChildren.filter(child => this.isCardLikeHomepageChild(child));
        if (cardChildren.length < 3) {
            return false;
        }
        const grid = this.homepageShelfGridMetrics(node, maxWidth);
        if (grid.columns < 2) {
            return false;
        }
        const nonCardBounds = this.createManualChildrenVisibleBounds(
            allChildren.filter(child => !this.isCardLikeHomepageChild(child))
        );
        const startY = nonCardBounds
            ? Math.max(grid.top, this.ceilVisibleBound(nonCardBounds.bottom + grid.gap))
            : grid.top;
        const rowHeight = Math.max(...cardChildren.map(child =>
            Math.max(this.visibleNodeHeight(child), this.minimumVisibleChildrenHeight(child) ?? 0)
        ));
        let changed = false;
        let bottom = startY;

        if (node.layout !== 'none') {
            node.layout = 'none';
            changed = true;
        }

        for (const [index, child] of cardChildren.entries()) {
            const column = index % grid.columns;
            const row = Math.floor(index / grid.columns);
            const targetX = grid.left + column * (grid.cardWidth + grid.gap);
            const targetY = startY + row * (rowHeight + grid.gap);
            if (child.type === 'frame' && this.numericDimensionValue(child.width) !== grid.cardWidth) {
                child.width = grid.cardWidth;
                changed = true;
            }
            if (this.numberValue(child.x, 0) !== targetX) {
                child.x = this.roundScaledValue(targetX);
                changed = true;
            }
            if (this.numberValue(child.y, 0) !== targetY) {
                child.y = this.roundScaledValue(targetY);
                changed = true;
            }
            const childMaxHeight = Math.max(this.numericDimensionValue(child.height) ?? rowHeight, this.minimumVisibleChildrenHeight(child) ?? 0);
            changed = this.clampChildrenWithinBounds(child, grid.cardWidth, childMaxHeight) || changed;
            bottom = Math.max(bottom, targetY + this.visibleNodeHeight(child));
        }

        const requiredHeight = this.ceilVisibleBound(bottom + Math.max(0, this.normalizedPadding(node.padding).bottom));
        if (this.numericDimensionValue(node.height) !== requiredHeight) {
            node.height = requiredHeight;
            changed = true;
        }
        return changed;
    }

    protected gridFeatureCardChildrenWithinWidth(node: OpenPencilNode, maxWidth: number): boolean {
        const children = this.visibleFlowChildren(node.children ?? [], maxWidth);
        const featureChildren = children.filter(child => this.isFeatureCardLikeChild(child));
        if (featureChildren.length < 2 || maxWidth < 360) {
            return false;
        }
        const gap = Math.max(14, Math.min(24, this.numberValue(node.gap, 16)));
        const columns = Math.max(1, Math.min(3, featureChildren.length, Math.floor((maxWidth + gap) / (260 + gap))));
        const cardWidth = Math.max(180, Math.floor((maxWidth - gap * (columns - 1)) / columns));
        const targetHeights = featureChildren.map(child =>
            Math.max(
                132,
                Math.min(this.visibleNodeHeight(child), 230),
                this.minimumVisibleChildrenHeight(child) ?? 0
            )
        );
        const rowHeights = targetHeights.reduce<number[]>((rows, height, index) => {
            const row = Math.floor(index / columns);
            rows[row] = Math.max(rows[row] ?? 0, height);
            return rows;
        }, []);
        const rowTop = (row: number): number => rowHeights.slice(0, row).reduce((sum, height) => sum + height + gap, 0);
        let changed = false;
        let bottom = 0;

        for (const [index, child] of featureChildren.entries()) {
            const column = index % columns;
            const row = Math.floor(index / columns);
            const targetX = column * (cardWidth + gap);
            const targetY = rowTop(row);
            const targetHeight = targetHeights[index];
            if (this.numberValue(child.x, 0) !== targetX) {
                child.x = this.roundScaledValue(targetX);
                changed = true;
            }
            if (this.numberValue(child.y, 0) !== targetY) {
                child.y = this.roundScaledValue(targetY);
                changed = true;
            }
            if (this.numericDimensionValue(child.width) !== cardWidth) {
                child.width = cardWidth;
                changed = true;
            }
            if (this.numericDimensionValue(child.height) !== targetHeight) {
                child.height = targetHeight;
                changed = true;
            }
            changed = this.clampChildrenWithinBounds(child, cardWidth, targetHeight) || changed;
            bottom = Math.max(bottom, targetY + targetHeight);
        }

        if (this.numericDimensionValue(node.height) !== bottom) {
            node.height = this.ceilVisibleBound(bottom);
            changed = true;
        }
        return changed;
    }

    protected wrapHorizontalLayoutChildrenWithinWidth(node: OpenPencilNode, maxWidth: number): boolean {
        const children = this.visibleFlowChildren(node.children ?? [], maxWidth);
        if (children.length < 2 || maxWidth < 120) {
            return false;
        }
        const padding = this.normalizedPadding(node.padding);
        const gap = Math.max(8, Math.min(24, this.numberValue(node.gap, 12)));
        const left = Math.max(0, padding.left);
        const top = Math.max(0, padding.top);
        const rightLimit = Math.max(left + 1, maxWidth - Math.max(0, padding.right));
        const availableWidth = Math.max(1, rightLimit - left);
        let cursorX = left;
        let cursorY = top;
        let lineHeight = 0;
        let bottom = top;
        let changed = false;

        if (node.layout !== 'none') {
            node.layout = 'none';
            changed = true;
        }

        for (const child of children) {
            let childWidth = this.visibleNodeWidth(child);
            const childHeight = this.visibleNodeHeight(child);
            if (child.type === 'frame' && childWidth > availableWidth) {
                child.width = availableWidth;
                childWidth = availableWidth;
                changed = true;
            }
            if (cursorX > left && cursorX + childWidth > rightLimit) {
                cursorX = left;
                cursorY += lineHeight + gap;
                lineHeight = 0;
            }
            if (this.numberValue(child.x, 0) !== cursorX) {
                child.x = this.roundScaledValue(cursorX);
                changed = true;
            }
            if (this.numberValue(child.y, 0) !== cursorY) {
                child.y = this.roundScaledValue(cursorY);
                changed = true;
            }
            cursorX += childWidth + gap;
            lineHeight = Math.max(lineHeight, childHeight);
            bottom = Math.max(bottom, cursorY + childHeight);
        }

        const requiredHeight = this.ceilVisibleBound(bottom + Math.max(0, padding.bottom));
        if (this.numericDimensionValue(node.height) !== requiredHeight) {
            node.height = requiredHeight;
            changed = true;
        }
        return changed;
    }

    protected shouldNormalizeOverflowingHorizontalRow(node: OpenPencilNode, bounds: OpenPencilVisibleBounds, width: number): boolean {
        if (node.layout !== 'horizontal' || width < 220) {
            return false;
        }
        if (this.shouldProtectCardInternalLayout(node, width)) {
            return false;
        }
        const children = this.visibleFlowChildren(node.children ?? [], width);
        if (children.length < 2) {
            return false;
        }
        const cardChildren = children.filter(child => this.isCardLikeHomepageChild(child));
        if (cardChildren.length >= 3 && this.isShelfLikeNode(node)) {
            return false;
        }
        const overflowsLayout = bounds.left < 0 || bounds.right > width;
        const overflowsManual = children.some(child => {
            const x = this.numberValue(child.x, 0);
            const childWidth = this.visibleNodeWidth(child);
            return x < 0 || x + childWidth > width;
        });
        const hasOversizedChild = children.some(child => this.canResizeNodeForVisibleClamp(child) && this.visibleNodeWidth(child) > width * 0.82);
        return overflowsLayout || overflowsManual || hasOversizedChild || this.childrenHaveSignificantManualOverlap(children);
    }

    protected shouldNormalizeManualRowChildren(node: OpenPencilNode, bounds: OpenPencilVisibleBounds, width: number): boolean {
        if (node.layout !== 'none' || width < 220) {
            return false;
        }
        if (this.shouldProtectCardInternalLayout(node, width)) {
            return false;
        }
        const children = this.visibleFlowChildren(node.children ?? [], width);
        if (children.length < 2) {
            return false;
        }
        const cardChildren = children.filter(child => this.isCardLikeHomepageChild(child));
        if (cardChildren.length >= 3 && this.isShelfLikeNode(node)) {
            return false;
        }
        if (!this.isRowLikeManualContainer(node)) {
            return false;
        }
        const repeatedOrigin = children.filter(child => this.numberValue(child.x, 0) === 0 && this.numberValue(child.y, 0) === 0).length >= 2;
        const hasFluidOrMissingWidth = children.some(child => child.width === 'fill_container' || this.numericDimensionValue(child.width) === undefined);
        const overflowsManual = bounds.left < 0 || bounds.right > width || children.some(child => {
            const x = this.numberValue(child.x, 0);
            return x < 0 || x + this.visibleNodeWidth(child) > width;
        });
        return repeatedOrigin || hasFluidOrMissingWidth || overflowsManual || this.childrenHaveSignificantManualOverlap(children);
    }

    protected isRowLikeManualContainer(node: OpenPencilNode): boolean {
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        return /\b(row|linha|header|cabecalho|cabeçalho|navbar|nav|menu|title|titulo|título|links?|a[cç][oõ]es|actions|categorias|categories|navigation|navega[cç][aã]o|busca|search|toolbar|topbar)\b/.test(label);
    }

    protected shouldStackOverlappingCardChildren(node: OpenPencilNode, width: number): boolean {
        if (width < 120 || !this.shouldProtectCardInternalLayout(node, width) || node.layout === 'vertical') {
            return false;
        }
        const children = this.visibleFlowChildren(node.children ?? [], width);
        if (children.length < 2 || children.length > 5) {
            return false;
        }
        if (!this.childrenHaveSignificantManualOverlap(children)) {
            return false;
        }
        const hasVisualChild = children.some(child => this.isVisualOrIconLikeCardChild(child));
        const hasTextChild = children.some(child => this.isTextOrCopyLikeCardChild(child));
        return hasVisualChild && hasTextChild;
    }

    protected shouldStackColumnLikeManualChildren(node: OpenPencilNode, width: number): boolean {
        if (node.layout !== 'none' || width < 120) {
            return false;
        }
        const children = this.visibleFlowChildren(node.children ?? [], width)
            .filter(child => this.visibleNodeWidth(child) > 0 && this.visibleNodeHeight(child) > 0 && !this.isAiLayoutIgnoredOverlay(child));
        if (children.length < 2 || !this.childrenHaveReportableAiLayoutOverlap(children)) {
            return false;
        }
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        if (this.isNavigationLikeNode(node)
            || /\b(row|linha|header|cabecalho|cabeçalho|navbar|nav|menu|title|titulo|título|links?|a[cç][oõ]es|actions|categorias|categories|navigation|navega[cç][aã]o|busca|search)\b/.test(label)) {
            return false;
        }
        const columnLike = node.role === 'column'
            || /\b(column|coluna|copy|content|conte[uú]do|details?|detalhes?|info|text|texto|body|corpo|description|descri[cç][aã]o|footer|rodap[eé]|support|suporte)\b/.test(label);
        const directTextChildren = children.filter(child => this.isTextLikeNode(child)).length;
        return columnLike || directTextChildren >= Math.max(2, children.length - 1);
    }

    protected shouldRepairOverlappingManualChildren(node: OpenPencilNode, width: number): boolean {
        if (width < 120) {
            return false;
        }
        const children = this.visibleFlowChildren(node.children ?? [], width)
            .filter(child => this.visibleNodeWidth(child) > 0 && this.visibleNodeHeight(child) > 0 && !this.isAiLayoutIgnoredOverlay(child));
        if (children.length < 2 || !this.childrenHaveReportableAiLayoutOverlap(children)) {
            return false;
        }
        if (this.isNavigationLikeNode(node) || this.isCardLikeHomepageChild(node) || this.isFeatureCardLikeChild(node)) {
            return true;
        }
        if (width <= 560 || children.length <= 6) {
            return true;
        }
        return this.isPageLikeFlowContainer(node, children, width)
            || this.isHomepageSectionLikeNode(node, width)
            || this.isShelfLikeNode(node)
            || children.filter(child => this.isCardLikeHomepageChild(child)).length >= 2;
    }

    protected shouldStrictRepairRemainingSiblingLayout(node: OpenPencilNode, bounds: OpenPencilVisibleBounds, width: number): boolean {
        if (width < 120) {
            return false;
        }
        const children = this.visibleFlowChildren(node.children ?? [], width)
            .filter(child => this.visibleNodeWidth(child) > 0 && this.visibleNodeHeight(child) > 0 && !this.isAiLayoutIgnoredOverlay(child));
        if (children.length < 2) {
            return false;
        }
        return bounds.left < 0
            || bounds.right > width
            || this.childrenOverflowParentWidth(children, width)
            || this.childrenHaveReportableAiLayoutOverlap(children);
    }

    protected strictRepairRemainingSiblingLayoutWithinWidth(node: OpenPencilNode, maxWidth: number): boolean {
        const children = this.visibleFlowChildren(node.children ?? [], maxWidth)
            .filter(child => this.visibleNodeWidth(child) > 0 && this.visibleNodeHeight(child) > 0 && !this.isAiLayoutIgnoredOverlay(child));
        if (children.length < 2 || maxWidth < 120) {
            return false;
        }
        if (this.isNavigationLikeNode(node) || this.isRowLikeManualContainer(node) || this.shouldArrangeOverlappingCardChildrenAsRow(node, children, maxWidth)) {
            return this.normalizeOverflowingHorizontalRowWithinWidth(node, maxWidth);
        }
        if (this.shouldProtectCardInternalLayout(node, maxWidth) || this.shouldStackColumnLikeManualChildren(node, maxWidth) || children.length > 8) {
            return this.stackRemainingChildrenVerticallyWithinWidth(node, maxWidth, children);
        }
        return this.reflowManualChildrenWithinWidth(node.children ?? [], maxWidth);
    }

    protected stackRemainingChildrenVerticallyWithinWidth(node: OpenPencilNode, maxWidth: number, children: OpenPencilNode[]): boolean {
        const padding = this.normalizedPadding(node.padding);
        const left = Math.max(0, Math.min(24, padding.left || 16));
        const right = Math.max(0, Math.min(24, padding.right || 16));
        const top = Math.max(0, Math.min(24, padding.top || 16));
        const bottomPadding = Math.max(12, Math.min(24, padding.bottom || 16));
        const gap = Math.max(8, Math.min(18, this.numberValue(node.gap, 12)));
        const availableWidth = Math.max(1, maxWidth - left - right);
        const sorted = children.slice().sort((leftNode, rightNode) => {
            const priorityDelta = this.cardChildStackPriority(leftNode) - this.cardChildStackPriority(rightNode);
            if (this.shouldProtectCardInternalLayout(node, maxWidth) && priorityDelta) {
                return priorityDelta;
            }
            const topDelta = this.numberValue(leftNode.y, 0) - this.numberValue(rightNode.y, 0);
            return Math.abs(topDelta) > 8 ? topDelta : this.numberValue(leftNode.x, 0) - this.numberValue(rightNode.x, 0);
        });
        let cursorY = top;
        let changed = false;
        if (node.layout !== 'none') {
            node.layout = 'none';
            changed = true;
        }
        for (const child of sorted) {
            let childWidth = this.visibleNodeWidth(child);
            if (this.canResizeNodeForVisibleClamp(child) && (childWidth > availableWidth || this.shouldExpandTextNodeForFlow(child, childWidth, availableWidth))) {
                child.width = availableWidth;
                childWidth = availableWidth;
                changed = true;
            }
            if (this.normalizeTextNodeHeightForWidth(child, childWidth)) {
                changed = true;
            }
            const targetX = childWidth >= availableWidth * 0.92
                ? left
                : Math.max(left, Math.min(left + Math.round((availableWidth - childWidth) / 2), maxWidth - childWidth - right));
            if (this.numberValue(child.x, 0) !== targetX) {
                child.x = this.roundScaledValue(targetX);
                changed = true;
            }
            if (this.numberValue(child.y, 0) !== cursorY) {
                child.y = this.roundScaledValue(cursorY);
                changed = true;
            }
            changed = this.clampChildrenWithinBounds(child, childWidth, this.numericDimensionValue(child.height)) || changed;
            cursorY += this.visibleNodeHeight(child) + gap;
        }
        const requiredHeight = this.ceilVisibleBound(cursorY - gap + bottomPadding);
        const currentHeight = this.numericDimensionValue(node.height);
        if (currentHeight !== undefined && currentHeight < requiredHeight) {
            node.height = requiredHeight;
            changed = true;
        }
        return changed;
    }

    protected childrenHaveReportableAiLayoutOverlap(children: OpenPencilNode[]): boolean {
        for (let index = 0; index < children.length; index++) {
            for (let other = index + 1; other < children.length; other++) {
                if (this.shouldReportAiLayoutOverlap(children[index], children[other])) {
                    return true;
                }
            }
        }
        return false;
    }

    protected repairOverlappingManualChildrenWithinBounds(node: OpenPencilNode, maxWidth: number): boolean {
        const children = this.visibleFlowChildren(node.children ?? [], maxWidth)
            .filter(child => this.visibleNodeWidth(child) > 0 && this.visibleNodeHeight(child) > 0);
        if (children.length < 2 || maxWidth < 120) {
            return false;
        }
        let changed = false;
        if (node.layout !== 'none') {
            node.layout = 'none';
            changed = true;
        }

        const cardChildren = children.filter(child => this.isCardLikeHomepageChild(child));
        if (cardChildren.length >= 3 && this.isShelfLikeNode(node) && !this.hasLooseShelfItemParts(node, children, cardChildren)) {
            changed = this.gridHomepageShelfChildrenWithinWidth(node, maxWidth) || changed;
        } else if (this.isNavigationLikeNode(node)) {
            changed = this.normalizeOverflowingHorizontalRowWithinWidth(node, maxWidth) || changed;
        } else if (this.shouldArrangeOverlappingCardChildrenAsRow(node, children, maxWidth)) {
            changed = this.normalizeOverflowingHorizontalRowWithinWidth(node, maxWidth) || changed;
        } else if (this.shouldStackReportableOverlapChildren(node, children, maxWidth)) {
            changed = this.stackOverlappingCardChildrenWithinBounds(node, maxWidth) || changed;
        } else {
            changed = this.reflowManualChildrenWithinWidth(node.children ?? [], maxWidth) || changed;
        }

        const bounds = this.createNodeChildrenVisibleBounds(node);
        if (bounds) {
            changed = this.clampChildrenWithinBounds(node, maxWidth, this.numericDimensionValue(node.height)) || changed;
            const updatedBounds = this.createNodeChildrenVisibleBounds(node) ?? bounds;
            const nodeHeight = this.numericDimensionValue(node.height);
            if (nodeHeight !== undefined && updatedBounds.bottom > nodeHeight) {
                node.height = this.ceilVisibleBound(updatedBounds.bottom);
                changed = true;
            }
        }
        return changed;
    }

    protected hasLooseShelfItemParts(node: OpenPencilNode, children: OpenPencilNode[], cardChildren: OpenPencilNode[]): boolean {
        if (!this.isShelfLikeNode(node) || cardChildren.length < 2) {
            return false;
        }
        const looseContent = children.filter(child => {
            if (this.isAiLayoutIgnoredOverlay(child) || cardChildren.includes(child)) {
                return false;
            }
            const label = `${child.id} ${child.name ?? ''} ${child.role ?? ''}`.toLowerCase();
            return this.isTextLikeNode(child)
                || this.isMediaLikeHomepageChild(child)
                || /\b(price|pre[cç]o|meta|name|nome|title|titulo|título|image|imagem|icon|icone|ícone|item|product|produto|offer|oferta)\b/.test(label);
        });
        return looseContent.length > cardChildren.length + 2;
    }

    protected shouldArrangeOverlappingCardChildrenAsRow(node: OpenPencilNode, children: OpenPencilNode[], maxWidth: number): boolean {
        if (maxWidth < 560 || children.length < 2 || children.length > 8) {
            return false;
        }
        const cardChildren = children.filter(child => this.isCardLikeHomepageChild(child) || this.isFeatureCardLikeChild(child));
        if (cardChildren.length < 2 || cardChildren.length < children.length - 1) {
            return false;
        }
        const widestChild = Math.max(...cardChildren.map(child => this.visibleNodeWidth(child)));
        if (widestChild > maxWidth * 0.82) {
            return false;
        }
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        return cardChildren.length >= 3
            || /\b(row|linha|grid|grade|cards?|columns?|colunas?|duo|pair|pares?|banner|promo|benefits?|beneficios?|benefícios?|services?|servi[cç]os|support|suporte|links?|categories|categorias|offers?|ofertas?|products?|produtos?)\b/.test(label);
    }

    protected shouldStackReportableOverlapChildren(node: OpenPencilNode, children: OpenPencilNode[], width: number): boolean {
        if (this.shouldProtectCardInternalLayout(node, width) || width < 560 || children.length <= 6) {
            return true;
        }
        const textLikeChildren = children.filter(child => this.isTextOrCopyLikeCardChild(child)).length;
        return textLikeChildren >= Math.max(2, children.length - 1);
    }

    protected stackOverlappingCardChildrenWithinBounds(node: OpenPencilNode, maxWidth: number): boolean {
        const children = this.visibleFlowChildren(node.children ?? [], maxWidth)
            .filter(child => !this.isAiLayoutIgnoredOverlay(child));
        if (children.length < 2 || maxWidth < 120) {
            return false;
        }
        const padding = this.normalizedPadding(node.padding);
        const left = Math.max(14, padding.left || 16);
        const top = Math.max(14, padding.top || 16);
        const bottomPadding = Math.max(14, padding.bottom || 16);
        const gap = Math.max(10, Math.min(18, this.numberValue(node.gap, 12)));
        const availableWidth = Math.max(1, maxWidth - left - Math.max(14, padding.right || 16));
        const sorted = children.slice().sort((leftNode, rightNode) => {
            const priorityDelta = this.cardChildStackPriority(leftNode) - this.cardChildStackPriority(rightNode);
            if (priorityDelta) {
                return priorityDelta;
            }
            const topDelta = this.numberValue(leftNode.y, 0) - this.numberValue(rightNode.y, 0);
            return Math.abs(topDelta) > 8 ? topDelta : this.numberValue(leftNode.x, 0) - this.numberValue(rightNode.x, 0);
        });
        let cursorY = top;
        let changed = false;

        if (node.layout !== 'none') {
            node.layout = 'none';
            changed = true;
        }

        for (const child of sorted) {
            let childWidth = this.visibleNodeWidth(child);
            if (this.canResizeNodeForVisibleClamp(child) && (childWidth > availableWidth || this.shouldExpandTextNodeForFlow(child, childWidth, availableWidth))) {
                child.width = availableWidth;
                childWidth = availableWidth;
                changed = true;
            }
            if (this.normalizeTextNodeHeightForWidth(child, childWidth)) {
                changed = true;
            }
            if (this.numberValue(child.x, 0) !== left) {
                child.x = this.roundScaledValue(left);
                changed = true;
            }
            if (this.numberValue(child.y, 0) !== cursorY) {
                child.y = this.roundScaledValue(cursorY);
                changed = true;
            }
            changed = this.clampChildrenWithinBounds(child, childWidth, this.numericDimensionValue(child.height)) || changed;
            cursorY += this.visibleNodeHeight(child) + gap;
        }

        const requiredHeight = this.ceilVisibleBound(cursorY - gap + bottomPadding);
        const currentHeight = this.numericDimensionValue(node.height);
        if (currentHeight !== undefined && currentHeight < requiredHeight) {
            node.height = requiredHeight;
            changed = true;
        }
        return changed;
    }

    protected cardChildStackPriority(node: OpenPencilNode): number {
        if (this.isVisualOrIconLikeCardChild(node)) {
            return 0;
        }
        if (this.isTextOrCopyLikeCardChild(node)) {
            return 1;
        }
        return 2;
    }

    protected isVisualOrIconLikeCardChild(node: OpenPencilNode): boolean {
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        return node.type === 'image'
            || node.type === 'icon_font'
            || this.isMediaLikeHomepageChild(node)
            || /\b(icon|icone|ícone|visual|image|imagem|foto|photo|placeholder)\b/.test(label);
    }

    protected isTextOrCopyLikeCardChild(node: OpenPencilNode): boolean {
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        return this.isTextLikeNode(node)
            || /\b(text|texto|copy|content|conte[uú]do|descri[cç][aã]o|description|label|titulo|título|title|column|coluna)\b/.test(label)
            || (node.children ?? []).some(child => this.isTextLikeNode(child));
    }

    protected normalizeOverflowingHorizontalRowWithinWidth(node: OpenPencilNode, maxWidth: number): boolean {
        const children = this.visibleFlowChildren(node.children ?? [], maxWidth);
        if (children.length < 2 || maxWidth < 120) {
            return false;
        }
        const padding = this.normalizedPadding(node.padding);
        const gap = Math.max(8, Math.min(24, this.numberValue(node.gap, 12)));
        const left = Math.max(0, padding.left);
        const top = Math.max(0, padding.top);
        const availableWidth = Math.max(1, maxWidth - Math.max(0, padding.left) - Math.max(0, padding.right));
        const rightLimit = left + availableWidth;
        const hasMediaChild = children.some(child => this.isMediaLikeHomepageChild(child));
        const widths = new Map<OpenPencilNode, number>();
        const minWidths = new Map<OpenPencilNode, number>();
        let changed = false;

        for (const child of children) {
            const minWidth = Math.min(availableWidth, this.minimumHorizontalRowChildWidth(child, availableWidth));
            const currentWidth = this.visibleNodeWidth(child);
            const preferredWidth = this.preferredHorizontalRowChildWidth(child, availableWidth, children.length, hasMediaChild);
            const targetWidth = Math.max(minWidth, Math.min(availableWidth, currentWidth > 0 ? Math.min(currentWidth, preferredWidth) : preferredWidth));
            widths.set(child, this.roundScaledValue(targetWidth));
            minWidths.set(child, this.roundScaledValue(minWidth));
        }
        this.shrinkHorizontalRowWidthsToFit(children, widths, minWidths, availableWidth, gap);

        if (node.layout !== 'none') {
            node.layout = 'none';
            changed = true;
        }

        let cursorX = left;
        let cursorY = top;
        let lineHeight = 0;
        let bottom = top;

        for (const child of children) {
            let childWidth = Math.min(availableWidth, widths.get(child) ?? this.visibleNodeWidth(child));
            if (cursorX > left && cursorX + childWidth > rightLimit) {
                cursorX = left;
                cursorY += lineHeight + gap;
                lineHeight = 0;
            }
            if (this.canResizeNodeForVisibleClamp(child) && this.numericDimensionValue(child.width) !== childWidth) {
                child.width = childWidth;
                changed = true;
            }
            if (this.numberValue(child.x, 0) !== cursorX) {
                child.x = this.roundScaledValue(cursorX);
                changed = true;
            }
            if (this.numberValue(child.y, 0) !== cursorY) {
                child.y = this.roundScaledValue(cursorY);
                changed = true;
            }
            if (this.normalizeTextNodeHeightForWidth(child, childWidth)) {
                changed = true;
            }
            changed = this.clampChildrenWithinBounds(child, childWidth, this.numericDimensionValue(child.height)) || changed;
            const childHeight = this.visibleNodeHeight(child);
            lineHeight = Math.max(lineHeight, childHeight);
            bottom = Math.max(bottom, cursorY + childHeight);
            cursorX += childWidth + gap;
        }

        const requiredHeight = this.ceilVisibleBound(bottom + Math.max(0, padding.bottom));
        const currentHeight = this.numericDimensionValue(node.height);
        const targetHeight = currentHeight === undefined ? requiredHeight : Math.max(currentHeight, requiredHeight);
        if (currentHeight !== targetHeight) {
            node.height = targetHeight;
            changed = true;
        }
        return changed;
    }

    protected shrinkHorizontalRowWidthsToFit(children: OpenPencilNode[], widths: Map<OpenPencilNode, number>, minWidths: Map<OpenPencilNode, number>, availableWidth: number, gap: number): void {
        const totalWidth = () => children.reduce((sum, child) => sum + (widths.get(child) ?? 0), 0) + gap * Math.max(0, children.length - 1);
        let total = totalWidth();
        let guard = 0;
        while (total > availableWidth && guard++ < 32) {
            const shrinkable = children
                .map(child => ({
                    child,
                    capacity: (widths.get(child) ?? 0) - (minWidths.get(child) ?? 0)
                }))
                .filter(entry => entry.capacity > 0)
                .sort((leftEntry, rightEntry) => rightEntry.capacity - leftEntry.capacity);
            if (!shrinkable.length) {
                break;
            }
            let excess = total - availableWidth;
            for (const entry of shrinkable) {
                const current = widths.get(entry.child) ?? 0;
                const minWidth = minWidths.get(entry.child) ?? 0;
                const reduction = Math.min(entry.capacity, Math.max(1, Math.ceil(excess / shrinkable.length)));
                widths.set(entry.child, this.roundScaledValue(Math.max(minWidth, current - reduction)));
                excess -= reduction;
                if (excess <= 0) {
                    break;
                }
            }
            const nextTotal = totalWidth();
            if (nextTotal >= total) {
                break;
            }
            total = nextTotal;
        }
    }

    protected preferredHorizontalRowChildWidth(node: OpenPencilNode, availableWidth: number, siblingCount: number, hasMediaSibling: boolean): number {
        const currentWidth = this.visibleNodeWidth(node);
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        if (this.isTextLikeNode(node)) {
            const estimate = this.estimatedSingleLineTextWidth(node);
            const cap = /\b(logo|brand|marca)\b/.test(label)
                ? availableWidth * 0.28
                : availableWidth * (siblingCount > 2 ? 0.36 : 0.56);
            return Math.max(this.minimumHorizontalRowChildWidth(node, availableWidth), Math.min(currentWidth || estimate, estimate, cap));
        }
        if (/\b(search|busca|pesquisa)\b/.test(label)) {
            return Math.max(this.minimumHorizontalRowChildWidth(node, availableWidth), Math.min(currentWidth || availableWidth * 0.55, availableWidth * (siblingCount > 2 ? 0.55 : 0.66)));
        }
        if (this.isMediaLikeHomepageChild(node)) {
            return Math.max(this.minimumHorizontalRowChildWidth(node, availableWidth), Math.min(currentWidth || availableWidth * 0.32, availableWidth * 0.34));
        }
        if (hasMediaSibling && (node.type === 'frame' || node.type === 'group')) {
            return Math.max(this.minimumHorizontalRowChildWidth(node, availableWidth), Math.min(currentWidth || availableWidth * 0.58, availableWidth * 0.62));
        }
        if (/\b(action|actions|button|cta|account|login|links?|nav|menu|location|localiza[cç][aã]o)\b/.test(label)) {
            return Math.max(this.minimumHorizontalRowChildWidth(node, availableWidth), Math.min(currentWidth || availableWidth * 0.32, availableWidth * 0.36));
        }
        if (/\b(footer|rodap[eé]|comprar|ajuda|help|institucional|company|column|coluna)\b/.test(label)) {
            return Math.max(this.minimumHorizontalRowChildWidth(node, availableWidth), Math.min(currentWidth || availableWidth * 0.22, availableWidth * 0.28));
        }
        return Math.max(this.minimumHorizontalRowChildWidth(node, availableWidth), Math.min(currentWidth || availableWidth, availableWidth));
    }

    protected minimumHorizontalRowChildWidth(node: OpenPencilNode, availableWidth: number): number {
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        if (this.isTextLikeNode(node)) {
            return Math.max(48, Math.min(availableWidth, Math.min(this.estimatedSingleLineTextWidth(node), /\b(logo|brand|marca)\b/.test(label) ? 180 : 260)));
        }
        if (/\b(search|busca|pesquisa)\b/.test(label)) {
            return Math.max(180, Math.min(availableWidth, 280));
        }
        if (this.isMediaLikeHomepageChild(node)) {
            return Math.max(96, Math.min(availableWidth, 220));
        }
        if (/\b(button|cta|action|login|cart|location|localiza[cç][aã]o)\b/.test(label)) {
            return Math.max(88, Math.min(availableWidth, 180));
        }
        if (/\b(footer|rodap[eé]|comprar|ajuda|help|institucional|company|column|coluna)\b/.test(label)) {
            return Math.max(120, Math.min(availableWidth, 220));
        }
        return Math.max(120, Math.min(availableWidth, 260));
    }

    protected estimatedSingleLineTextWidth(node: OpenPencilNode): number {
        const content = typeof node.content === 'string' ? node.content.trim() : '';
        const fontSize = Math.max(8, this.numberValue(node.fontSize as number | string | undefined, 14));
        return Math.max(48, Math.ceil(content.length * fontSize * 0.56 + 18));
    }

    protected childrenHaveSignificantManualOverlap(children: OpenPencilNode[]): boolean {
        for (let index = 0; index < children.length; index++) {
            for (let other = index + 1; other < children.length; other++) {
                if (this.nodesOverlapSignificantly(children[index], children[other], 0.25)) {
                    return true;
                }
            }
        }
        return false;
    }

    protected shouldClampChildrenWithinBounds(node: OpenPencilNode, bounds: OpenPencilVisibleBounds, width: number, height?: number): boolean {
        if (width < 1) {
            return false;
        }
        return bounds.left < 0 || bounds.right > width || bounds.top < 0 || (height !== undefined && bounds.bottom > height);
    }

    protected clampChildrenWithinBounds(node: OpenPencilNode, maxWidth: number, maxHeight?: number): boolean {
        if (maxWidth < 1) {
            return false;
        }
        let changed = false;
        if (node.layout === 'vertical' && this.isCardLikeHomepageChild(node)) {
            for (const child of this.visibleChildren(node.children ?? [])) {
                if (child.role === 'overlay' && this.isMediaLikeHomepageChild(child)) {
                    delete child.role;
                    if (this.numberValue(child.x, 0) !== 0) {
                        child.x = 0;
                    }
                    if (this.numberValue(child.y, 0) < 0) {
                        child.y = 0;
                    }
                    changed = true;
                }
            }
        }

        const padding = this.normalizedPadding(node.padding);
        const flowMaxWidth = node.layout === 'horizontal' || node.layout === 'vertical'
            ? Math.max(1, maxWidth - Math.max(0, padding.left) - Math.max(0, padding.right))
            : maxWidth;
        const visible = this.visibleChildren(node.children ?? []);
        const flowChildren = node.layout === 'horizontal' || node.layout === 'vertical'
            ? visible.filter(child => child.role !== 'overlay')
            : visible;
        const manualChildren = node.layout === 'horizontal' || node.layout === 'vertical'
            ? visible.filter(child => child.role === 'overlay')
            : visible;

        for (const child of flowChildren) {
            changed = this.normalizeFlowChildWidth(child, flowMaxWidth) || changed;
            const childWidth = this.visibleNodeWidth(child);
            changed = this.clampChildrenWithinBounds(child, childWidth, this.numericDimensionValue(child.height)) || changed;
        }

        for (const child of manualChildren) {
            changed = this.clampManualChildWithinBounds(child, maxWidth, maxHeight) || changed;
        }
        return changed;
    }

    protected normalizeFlowChildWidth(child: OpenPencilNode, maxWidth: number): boolean {
        if (maxWidth < 1) {
            return false;
        }
        let changed = false;
        let childWidth = this.visibleNodeWidth(child);
        if (this.canResizeNodeForVisibleClamp(child) && (childWidth > maxWidth || this.shouldExpandTextNodeForFlow(child, childWidth, maxWidth))) {
            child.width = maxWidth;
            childWidth = maxWidth;
            changed = true;
        }
        if (this.normalizeTextNodeHeightForWidth(child, childWidth)) {
            changed = true;
        }
        return changed;
    }

    protected clampManualChildWithinBounds(child: OpenPencilNode, maxWidth: number, maxHeight?: number): boolean {
        let changed = false;
        let childWidth = this.visibleNodeWidth(child);
        let childHeight = this.visibleNodeHeight(child);
        if (childWidth > maxWidth && this.canResizeNodeForVisibleClamp(child)) {
            child.width = maxWidth;
            childWidth = maxWidth;
            changed = true;
        }
        if (maxHeight !== undefined && childHeight > maxHeight && this.canResizeNodeForVisibleClamp(child)) {
            const minimumContentHeight = this.minimumVisibleChildrenHeight(child);
            const targetHeight = minimumContentHeight === undefined
                ? maxHeight
                : Math.max(maxHeight, minimumContentHeight);
            if (childHeight > targetHeight) {
                child.height = targetHeight;
                childHeight = targetHeight;
                changed = true;
            }
        }
        let targetX = this.numberValue(child.x, 0);
        let targetY = this.numberValue(child.y, 0);
        if (targetX < 0) {
            targetX = 0;
        }
        if (targetX + childWidth > maxWidth) {
            targetX = Math.max(0, maxWidth - childWidth);
        }
        if (maxHeight !== undefined) {
            if (targetY < 0) {
                targetY = 0;
            }
            if (targetY + childHeight > maxHeight) {
                targetY = Math.max(0, maxHeight - childHeight);
            }
        } else if (targetY < 0) {
            targetY = 0;
        }
        if (this.numberValue(child.x, 0) !== targetX) {
            child.x = this.roundScaledValue(targetX);
            changed = true;
        }
        if (this.numberValue(child.y, 0) !== targetY) {
            child.y = this.roundScaledValue(targetY);
            changed = true;
        }
        changed = this.clampChildrenWithinBounds(child, childWidth, this.numericDimensionValue(child.height)) || changed;
        return changed;
    }

    protected shouldExpandTextNodeForFlow(node: OpenPencilNode, currentWidth: number, maxWidth: number): boolean {
        return this.isTextLikeNode(node)
            && typeof node.content === 'string'
            && node.content.length > 12
            && currentWidth > 0
            && currentWidth < maxWidth * 0.55;
    }

    protected normalizeTextNodeHeightForWidth(node: OpenPencilNode, width: number): boolean {
        if (!this.isTextLikeNode(node) || typeof node.content !== 'string' || width < 40) {
            return false;
        }
        const fontSize = Math.max(8, this.numberValue(node.fontSize as number | string | undefined, 14));
        const lineHeight = this.resolvedTextLineHeightPx(node, fontSize);
        const estimatedLines = Math.max(1, Math.ceil((node.content.length * fontSize * 0.52) / Math.max(1, width)));
        const estimatedHeight = this.ceilVisibleBound(estimatedLines * lineHeight);
        const currentHeight = this.visibleNodeHeight(node);
        if (currentHeight > estimatedHeight * 1.8 || currentHeight < estimatedHeight * 0.65) {
            node.height = estimatedHeight;
            return true;
        }
        return false;
    }

    protected resolvedTextLineHeightPx(node: OpenPencilNode, fontSize: number): number {
        const raw = this.numberValue(node.lineHeight as number | string | undefined, fontSize * 1.25);
        if (raw > 0 && raw <= 4) {
            return Math.max(fontSize, raw * fontSize);
        }
        return Math.max(fontSize, raw);
    }

    protected canResizeNodeForVisibleClamp(node: OpenPencilNode): boolean {
        return node.type === 'frame'
            || node.type === 'group'
            || node.type === 'rectangle'
            || node.type === 'text'
            || node.type === 'image'
            || node.type === 'icon_font';
    }

    protected reflowManualChildrenWithinWidth(children: OpenPencilNode[], maxWidth: number): boolean {
        const visible = this.visibleFlowChildren(children, maxWidth)
            .filter(child => this.visibleNodeWidth(child) > 0 && this.visibleNodeHeight(child) > 0);
        if (visible.length < 2 || maxWidth < 120) {
            return false;
        }

        const rows = this.groupManualChildrenIntoRows(visible);
        let changed = false;
        let yOffset = 0;
        const gap = Math.max(12, Math.min(24, Math.round(maxWidth * 0.015)));

        for (const row of rows) {
            const sorted = row.slice().sort((left, right) => this.numberValue(left.x, 0) - this.numberValue(right.x, 0));
            const originalTop = Math.min(...sorted.map(node => this.numberValue(node.y, 0)));
            const originalBottom = Math.max(...sorted.map(node => this.numberValue(node.y, 0) + this.visibleNodeHeight(node)));
            const startX = Math.max(0, Math.min(...sorted.map(node => this.numberValue(node.x, 0))));
            const availableRight = Math.max(startX + 1, maxWidth);
            let cursorX = startX;
            let cursorY = originalTop + yOffset;
            let lineHeight = 0;
            let rowBottom = cursorY;

            for (const node of sorted) {
                const width = Math.min(this.visibleNodeWidth(node), Math.max(1, availableRight - startX));
                const height = this.visibleNodeHeight(node);
                if (cursorX > startX && cursorX + width > availableRight) {
                    cursorX = startX;
                    cursorY += lineHeight + gap;
                    lineHeight = 0;
                }
                if (this.numberValue(node.x, 0) !== cursorX) {
                    node.x = this.roundScaledValue(cursorX);
                    changed = true;
                }
                if (this.numberValue(node.y, 0) !== cursorY) {
                    node.y = this.roundScaledValue(cursorY);
                    changed = true;
                }
                cursorX += width + gap;
                lineHeight = Math.max(lineHeight, height);
                rowBottom = Math.max(rowBottom, cursorY + height);
            }

            const originalShiftedBottom = originalBottom + yOffset;
            if (rowBottom > originalShiftedBottom) {
                yOffset += rowBottom - originalShiftedBottom + gap;
            }
        }

        return changed;
    }

    protected groupManualChildrenIntoRows(children: OpenPencilNode[]): OpenPencilNode[][] {
        const sorted = children.slice().sort((left, right) => {
            const topDelta = this.numberValue(left.y, 0) - this.numberValue(right.y, 0);
            return Math.abs(topDelta) > 16 ? topDelta : this.numberValue(left.x, 0) - this.numberValue(right.x, 0);
        });
        const rows: OpenPencilNode[][] = [];
        for (const child of sorted) {
            const top = this.numberValue(child.y, 0);
            const row = rows.find(candidate => {
                const rowTop = Math.min(...candidate.map(node => this.numberValue(node.y, 0)));
                return Math.abs(top - rowTop) <= 24;
            });
            if (row) {
                row.push(child);
            } else {
                rows.push([child]);
            }
        }
        return rows;
    }

    protected createNodeChildrenVisibleBounds(node: OpenPencilNode): OpenPencilVisibleBounds | undefined {
        const children = this.visibleChildren(node.children ?? []);
        if (!children.length) {
            return undefined;
        }
        if (node.layout === 'horizontal' || node.layout === 'vertical') {
            const overlayChildren = children.filter(child => child.role === 'overlay');
            const flowChildren = children.filter(child => child.role !== 'overlay');
            return this.unionVisibleBounds(
                this.createLayoutChildrenVisibleBounds(node, flowChildren),
                this.createManualChildrenVisibleBounds(overlayChildren)
            );
        }
        return this.createManualChildrenVisibleBounds(children);
    }

    protected createLayoutChildrenVisibleBounds(node: OpenPencilNode, children: OpenPencilNode[]): OpenPencilVisibleBounds | undefined {
        if (!children.length) {
            return undefined;
        }
        const padding = this.normalizedPadding(node.padding);
        const gap = Math.max(0, this.numberValue(node.gap, 0));
        let bounds: OpenPencilVisibleBounds | undefined;
        if (node.layout === 'horizontal') {
            let cursor = padding.left;
            for (const child of children) {
                const width = this.visibleNodeWidth(child);
                const height = this.visibleNodeHeight(child);
                bounds = this.unionVisibleBounds(bounds, {
                    left: cursor,
                    top: padding.top,
                    right: cursor + width,
                    bottom: padding.top + height
                });
                cursor += width + gap;
            }
            if (bounds) {
                bounds = {
                    left: Math.min(bounds.left, 0),
                    top: Math.min(bounds.top, 0),
                    right: bounds.right + padding.right,
                    bottom: bounds.bottom + padding.bottom
                };
            }
            return bounds;
        }

        let cursor = padding.top;
        for (const child of children) {
            const width = this.visibleNodeWidth(child);
            const height = this.visibleNodeHeight(child);
            bounds = this.unionVisibleBounds(bounds, {
                left: padding.left,
                top: cursor,
                right: padding.left + width,
                bottom: cursor + height
            });
            cursor += height + gap;
        }
        if (bounds) {
            bounds = {
                left: Math.min(bounds.left, 0),
                top: Math.min(bounds.top, 0),
                right: bounds.right + padding.right,
                bottom: bounds.bottom + padding.bottom
            };
        }
        return bounds;
    }

    protected createManualChildrenVisibleBounds(children: OpenPencilNode[]): OpenPencilVisibleBounds | undefined {
        let bounds: OpenPencilVisibleBounds | undefined;
        for (const child of this.visibleChildren(children)) {
            const x = this.numberValue(child.x, 0);
            const y = this.numberValue(child.y, 0);
            bounds = this.unionVisibleBounds(bounds, {
                left: x,
                top: y,
                right: x + this.visibleNodeWidth(child),
                bottom: y + this.visibleNodeHeight(child)
            });
        }
        return bounds;
    }

    protected unionVisibleBounds(first: OpenPencilVisibleBounds | undefined, second: OpenPencilVisibleBounds | undefined): OpenPencilVisibleBounds | undefined {
        if (!first) {
            return second;
        }
        if (!second) {
            return first;
        }
        return {
            left: Math.min(first.left, second.left),
            top: Math.min(first.top, second.top),
            right: Math.max(first.right, second.right),
            bottom: Math.max(first.bottom, second.bottom)
        };
    }

    protected visibleChildren(children: OpenPencilNode[]): OpenPencilNode[] {
        return children.filter(child => child.visible !== false && child.enabled !== false && child.enabled !== 'false');
    }

    protected removeInternalCanvasPlaceholderNodes(children: OpenPencilNode[]): boolean {
        let changed = false;
        for (let index = children.length - 1; index >= 0; index--) {
            const child = children[index];
            if (this.isInternalCanvasPlaceholderNode(child)) {
                children.splice(index, 1);
                changed = true;
                continue;
            }
            if (child.children?.length) {
                changed = this.removeInternalCanvasPlaceholderNodes(child.children) || changed;
            }
        }
        return changed;
    }

    protected isInternalCanvasPlaceholderNode(node: OpenPencilNode): boolean {
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.trim().toLowerCase();
        if (!this.isTextLikeNode(node)) {
            return !node.children?.length
                && (node.id === 'hero-card' || label === 'hero-card hero card')
                && (node.type === 'rectangle' || node.type === 'frame')
                && !node.role;
        }
        if (typeof node.content !== 'string') {
            return false;
        }
        const content = node.content.trim().replace(/\s+/g, ' ').toLowerCase();
        return content === 'edit this embedded .op design inside theia.'
            || (content === 'openpencil design' && /\b(hero-title|placeholder|openpencil)\b/.test(label));
    }

    protected visibleNodeWidth(node: OpenPencilNode): number {
        const width = this.numericDimensionValue(node.width);
        if (width !== undefined) {
            return Math.max(0, width);
        }
        return node.width === 'fill_container' ? 0 : this.isTextLikeNode(node) ? 160 : 120;
    }

    protected visibleNodeHeight(node: OpenPencilNode): number {
        const height = this.numericDimensionValue(node.height);
        if (height !== undefined) {
            return Math.max(0, height);
        }
        return this.isTextLikeNode(node) ? 40 : 120;
    }

    protected minimumVisibleChildrenHeight(node: OpenPencilNode): number | undefined {
        const bounds = this.createNodeChildrenVisibleBounds(node);
        if (!bounds) {
            return undefined;
        }
        return this.ceilVisibleBound(Math.max(0, bounds.bottom));
    }

    protected normalizedPadding(padding: OpenPencilNode['padding']): { top: number; right: number; bottom: number; left: number } {
        if (Array.isArray(padding)) {
            if (padding.length >= 4) {
                return {
                    top: this.numberValue(padding[0], 0),
                    right: this.numberValue(padding[1], 0),
                    bottom: this.numberValue(padding[2], 0),
                    left: this.numberValue(padding[3], 0)
                };
            }
            if (padding.length >= 2) {
                const vertical = this.numberValue(padding[0], 0);
                const horizontal = this.numberValue(padding[1], 0);
                return { top: vertical, right: horizontal, bottom: vertical, left: horizontal };
            }
            const value = this.numberValue(padding[0], 0);
            return { top: value, right: value, bottom: value, left: value };
        }
        const value = this.numberValue(padding, 0);
        return { top: value, right: value, bottom: value, left: value };
    }

    protected numericDimensionValue(value: OpenPencilNode['width'] | OpenPencilNode['height']): number | undefined {
        const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseFloat(value) : NaN;
        return Number.isFinite(parsed) ? parsed : undefined;
    }

    protected ceilVisibleBound(value: number): number {
        return Math.max(1, Math.ceil(value));
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

    protected nodesOverlapSignificantly(first: OpenPencilNode, second: OpenPencilNode, minRatio: number): boolean {
        const firstX = this.numberValue(first.x, 0);
        const firstY = this.numberValue(first.y, 0);
        const firstWidth = this.visibleNodeWidth(first);
        const firstHeight = this.visibleNodeHeight(first);
        const secondX = this.numberValue(second.x, 0);
        const secondY = this.numberValue(second.y, 0);
        const secondWidth = this.visibleNodeWidth(second);
        const secondHeight = this.visibleNodeHeight(second);
        const overlapWidth = Math.max(0, Math.min(firstX + firstWidth, secondX + secondWidth) - Math.max(firstX, secondX));
        const overlapHeight = Math.max(0, Math.min(firstY + firstHeight, secondY + secondHeight) - Math.max(firstY, secondY));
        const overlapArea = overlapWidth * overlapHeight;
        const smallerArea = Math.min(firstWidth * firstHeight, secondWidth * secondHeight);
        return smallerArea > 0 && overlapArea / smallerArea >= minRatio;
    }

    protected collectAiLayoutQualityIssues(
        children: OpenPencilNode[],
        parent: { path: string; width?: number; height?: number; pageRoot?: boolean; verticalPageFlow?: boolean; layout?: OpenPencilNode['layout']; label?: string },
        issues: OpenPencilValidationResult['issues']
    ): void {
        if (issues.length >= 24) {
            return;
        }
        const visible = this.visibleChildren(children).filter(child => !this.isAiLayoutIgnoredOverlay(child));
        const parentUsesAutoLayout = parent.layout === 'horizontal' || parent.layout === 'vertical';
        const validateAsManual = !parentUsesAutoLayout || this.shouldValidateAutoLayoutParentAsManual(parent, visible);
        const tolerance = 2;
        for (const child of visible) {
            const childPath = `${parent.path}.${child.id}`;
            const x = this.numberValue(child.x, 0);
            const y = this.numberValue(child.y, 0);
            const width = this.visibleNodeWidth(child);
            const height = this.visibleNodeHeight(child);
            if (this.isTextLikeNode(child) && this.hasCorruptedAiTextContent(this.nodeTextContent(child))) {
                issues.push({
                    severity: 'error',
                    path: childPath,
                    message: `Text node '${child.name ?? child.id}' contains unreadable glyphs or placeholder characters.`
                });
            }
            if (validateAsManual && !this.isAiLayoutAllowedOutOfBounds(child)) {
                if (parent.width !== undefined && (x < -tolerance || x + width > parent.width + tolerance)) {
                    issues.push({
                        severity: 'error',
                        path: childPath,
                        message: `Visible node '${child.name ?? child.id}' escapes its parent width.`
                    });
                }
                if (parent.height !== undefined && (y < -tolerance || y + height > parent.height + tolerance)) {
                    issues.push({
                        severity: 'error',
                        path: childPath,
                        message: `Visible node '${child.name ?? child.id}' escapes its parent height.`
                    });
                }
            }
            if (issues.length >= 24) {
                return;
            }
            this.collectAiLayoutQualityIssues(child.children ?? [], {
                path: `${childPath}.children`,
                width: this.numericDimensionValue(child.width),
                height: this.numericDimensionValue(child.height),
                layout: child.layout,
                label: this.aiLayoutNodeLabel(child),
                verticalPageFlow: parent.verticalPageFlow
            }, issues);
        }

        if (!validateAsManual) {
            return;
        }
        const sideBySideMajorSections = this.findSideBySideMajorFlowSectionPair(parent, visible);
        if (sideBySideMajorSections) {
            const [left, right] = sideBySideMajorSections;
            issues.push({
                severity: 'error',
                path: `${parent.path}.${left.id}`,
                message: `Major page sections '${left.name ?? left.id}' and '${right.name ?? right.id}' are side-by-side in a vertical page flow.`
            });
            if (issues.length >= 24) {
                return;
            }
        }
        const foreground = visible.filter(child => this.isAiLayoutForegroundNode(child));
        for (let leftIndex = 0; leftIndex < foreground.length; leftIndex++) {
            for (let rightIndex = leftIndex + 1; rightIndex < foreground.length; rightIndex++) {
                const left = foreground[leftIndex];
                const right = foreground[rightIndex];
                if (!this.shouldReportAiLayoutOverlap(left, right)) {
                    continue;
                }
                issues.push({
                    severity: 'error',
                    path: `${parent.path}.${left.id}`,
                    message: `Visible nodes '${left.name ?? left.id}' and '${right.name ?? right.id}' overlap in the same parent.`
                });
                if (issues.length >= 24) {
                    return;
                }
            }
        }
    }

    protected hasCorruptedAiTextContent(text: string): boolean {
        const compact = text.replace(/\s+/g, '');
        if (compact.length < 4) {
            return false;
        }
        if (/[\uFFFD\u25A1\u25A3-\u25A9\u25AD-\u25AF]/.test(compact)) {
            return true;
        }
        const privateUse = compact.match(/[\uE000-\uF8FF]/g)?.length ?? 0;
        if (privateUse >= 2 && privateUse / compact.length >= 0.35) {
            return true;
        }
        if (/^(?:\?|\||_|\uFFFD|\u25A1|\u25AF){4,}$/.test(compact)) {
            return true;
        }
        const questionMarks = compact.match(/\?/g)?.length ?? 0;
        return compact.length >= 6 && questionMarks / compact.length >= 0.6;
    }

    protected shouldValidateAutoLayoutParentAsManual(
        parent: { path: string; width?: number; height?: number; pageRoot?: boolean; verticalPageFlow?: boolean; layout?: OpenPencilNode['layout']; label?: string },
        visible: OpenPencilNode[]
    ): boolean {
        if (visible.length < 2 || parent.width === undefined || parent.width < 560) {
            return false;
        }
        const label = `${parent.label ?? ''} ${parent.path}`.toLowerCase();
        const pageLike = /\b(page|homepage|home|screen|view|website|site|app|artboard|canvas|composition|composi[cç][aã]o|landing|content|main|root|document|pagina|página|tela)\b/.test(label);
        const sectionLikeChildren = visible.filter(child => this.isHomepageSectionLikeNode(child, parent.width ?? 1200)).length;
        const horizontalSpread = this.childrenOverflowParentWidth(visible, parent.width);
        const significantOverlap = this.childrenHaveSignificantManualOverlap(visible);
        if (parent.layout === 'horizontal') {
            return pageLike || sectionLikeChildren >= 2 || horizontalSpread || significantOverlap;
        }
        return (pageLike || sectionLikeChildren >= 2) && (horizontalSpread || significantOverlap);
    }

    protected findSideBySideMajorFlowSectionPair(
        parent: { width?: number; pageRoot?: boolean; verticalPageFlow?: boolean; label?: string },
        visible: OpenPencilNode[]
    ): [OpenPencilNode, OpenPencilNode] | undefined {
        const width = parent.width;
        if (!parent.verticalPageFlow || width === undefined || width < 560 || visible.length < 2) {
            return undefined;
        }
        const label = `${parent.label ?? ''}`.toLowerCase();
        if (this.isHorizontalFlowContainerLabel(label)) {
            return undefined;
        }
        const major = visible.filter(child => this.isMajorVerticalFlowSection(child, width));
        if (major.length < 2) {
            return undefined;
        }
        const pageLike = !!parent.pageRoot || /\b(page|homepage|home|screen|view|website|site|app|artboard|canvas|composition|composi[cç][aã]o|landing|content|main|root|document|pagina|página|tela)\b/.test(label);
        const broadMajorSet = major.length >= 3 && major.filter(child => this.visibleNodeWidth(child) >= width * 0.32).length >= 2;
        if (!pageLike && !broadMajorSet) {
            return undefined;
        }
        for (let leftIndex = 0; leftIndex < major.length; leftIndex++) {
            for (let rightIndex = leftIndex + 1; rightIndex < major.length; rightIndex++) {
                const left = major[leftIndex];
                const right = major[rightIndex];
                if (this.areMajorFlowSectionsSideBySide(left, right, width)) {
                    return [left, right];
                }
            }
        }
        return undefined;
    }

    protected isHorizontalFlowContainerLabel(label: string): boolean {
        return /\b(header|cabecalho|cabeçalho|navbar|nav|menu|topbar|toolbar|search|busca|tabs?|tabbar|footer|rodap[eé]|hero|banner|promo|campaign|campanha|spotlight|card|tile|button|input|form|row|linha|grid|grade|shelf|shelves|prateleira|cards?|products?|produtos?|offers?|ofertas?|carousel|carrossel|categories|categorias)\b/.test(label);
    }

    protected isMajorVerticalFlowSection(node: OpenPencilNode, parentWidth: number): boolean {
        if (node.visible === false || node.enabled === false || node.enabled === 'false') {
            return false;
        }
        if (this.isTextLikeNode(node) || this.isAiLayoutMediaOrControlNode(node)) {
            return false;
        }
        const label = this.aiLayoutNodeLabel(node);
        if (/\b(card|tile|button|input|field|form|product-card|offer-card|produto-card|oferta-card|item|sku)\b/.test(label)) {
            return false;
        }
        const width = this.visibleNodeWidth(node);
        const height = this.visibleNodeHeight(node);
        const childCount = this.visibleChildren(node.children ?? []).length;
        const structuralRole = node.role === 'section'
            || node.role === 'main'
            || node.role === 'article'
            || node.role === 'region'
            || node.role === 'header'
            || node.role === 'footer'
            || node.role === 'navigation';
        return (node.type === 'frame' || node.type === 'group' || node.type === 'rectangle')
            && height >= 64
            && (structuralRole || width >= parentWidth * 0.32 || childCount >= 3);
    }

    protected areMajorFlowSectionsSideBySide(first: OpenPencilNode, second: OpenPencilNode, parentWidth: number): boolean {
        const firstX = this.numberValue(first.x, 0);
        const firstY = this.numberValue(first.y, 0);
        const firstWidth = this.visibleNodeWidth(first);
        const firstHeight = this.visibleNodeHeight(first);
        const secondX = this.numberValue(second.x, 0);
        const secondY = this.numberValue(second.y, 0);
        const secondWidth = this.visibleNodeWidth(second);
        const secondHeight = this.visibleNodeHeight(second);
        const verticalOverlap = Math.max(0, Math.min(firstY + firstHeight, secondY + secondHeight) - Math.max(firstY, secondY));
        const verticalOverlapRatio = verticalOverlap / Math.max(1, Math.min(firstHeight, secondHeight));
        if (verticalOverlapRatio < 0.35) {
            return false;
        }
        const firstLeftOfSecond = firstX + firstWidth <= secondX + 12;
        const secondLeftOfFirst = secondX + secondWidth <= firstX + 12;
        if (!firstLeftOfSecond && !secondLeftOfFirst) {
            return false;
        }
        const combinedWidth = Math.max(firstX + firstWidth, secondX + secondWidth) - Math.min(firstX, secondX);
        const bothSubstantial = firstWidth >= parentWidth * 0.24 && secondWidth >= parentWidth * 0.24;
        return bothSubstantial || combinedWidth >= parentWidth * 0.72;
    }

    protected shouldReportAiLayoutOverlap(first: OpenPencilNode, second: OpenPencilNode): boolean {
        if (this.isAiLayoutIntentionalSurfaceUnderlay(first, second) || this.isAiLayoutIntentionalSurfaceUnderlay(second, first)) {
            return false;
        }
        const firstText = this.isTextLikeNode(first);
        const secondText = this.isTextLikeNode(second);
        if (firstText && secondText) {
            return this.nodesOverlapSignificantly(first, second, 0.08);
        }
        if ((firstText && this.isAiLayoutMediaOrControlNode(second)) || (secondText && this.isAiLayoutMediaOrControlNode(first))) {
            return this.nodesOverlapSignificantly(first, second, 0.12);
        }
        return this.nodesOverlapSignificantly(first, second, 0.28);
    }

    protected isAiLayoutIgnoredOverlay(node: OpenPencilNode): boolean {
        const label = this.aiLayoutNodeLabel(node);
        return node.role === 'background'
            || node.role === 'decoration'
            || /\b(background|backdrop|decorative|decoration|ornament|shadow|glow|fundo|sombra|underlay)\b/.test(label)
            || /\bbg\b|(?:panel|shape|container|section|base)-bg\b/.test(label);
    }

    protected isAiLayoutAllowedOutOfBounds(node: OpenPencilNode): boolean {
        const label = this.aiLayoutNodeLabel(node);
        return this.isAiLayoutIgnoredOverlay(node)
            || /\b(confetti|spark|particle|badge-floating|floating-badge)\b/.test(label);
    }

    protected isAiLayoutForegroundNode(node: OpenPencilNode): boolean {
        if (this.isAiLayoutIgnoredOverlay(node)) {
            return false;
        }
        if (this.isTextLikeNode(node) || this.isAiLayoutMediaOrControlNode(node)) {
            return true;
        }
        const label = this.aiLayoutNodeLabel(node);
        return /\b(card|product|produto|offer|oferta|tile|item|button|botao|botão|input|search|busca|nav|menu|logo|category|categoria|footer|rodape|rodapé|service|benefit|beneficio|benefício|guide|guia|column|coluna)\b/.test(label);
    }

    protected isAiLayoutMediaOrControlNode(node: OpenPencilNode): boolean {
        if (node.type === 'image' || node.type === 'icon_font') {
            return true;
        }
        const label = this.aiLayoutNodeLabel(node);
        return /\b(image|imagem|photo|foto|media|visual|thumbnail|thumb|picture|icon|icone|ícone|button|botao|botão|input|field|search|busca|logo|placeholder|mockup|banner-visual|product-visual)\b/.test(label);
    }

    protected isAiLayoutIntentionalSurfaceUnderlay(surface: OpenPencilNode, foreground: OpenPencilNode): boolean {
        if (this.isTextLikeNode(surface) || this.isAiLayoutMediaOrControlNode(surface)) {
            return false;
        }
        if (surface.type !== 'rectangle' && surface.type !== 'frame' && surface.type !== 'group') {
            return false;
        }
        if (surface.children?.some(child => this.isVisibleRenderableAiNode(child))) {
            return false;
        }
        const surfaceWidth = this.visibleNodeWidth(surface);
        const surfaceHeight = this.visibleNodeHeight(surface);
        const foregroundWidth = this.visibleNodeWidth(foreground);
        const foregroundHeight = this.visibleNodeHeight(foreground);
        const surfaceArea = surfaceWidth * surfaceHeight;
        const foregroundArea = foregroundWidth * foregroundHeight;
        if (surfaceArea < foregroundArea * 1.35) {
            return false;
        }
        const surfaceX = this.numberValue(surface.x, 0);
        const surfaceY = this.numberValue(surface.y, 0);
        const foregroundX = this.numberValue(foreground.x, 0);
        const foregroundY = this.numberValue(foreground.y, 0);
        const containsForeground = foregroundX >= surfaceX - 2
            && foregroundY >= surfaceY - 2
            && foregroundX + foregroundWidth <= surfaceX + surfaceWidth + 2
            && foregroundY + foregroundHeight <= surfaceY + surfaceHeight + 2;
        if (!containsForeground) {
            return false;
        }
        const label = this.aiLayoutNodeLabel(surface);
        return !!surface.fill?.length
            || !!surface.stroke
            || /\b(surface|base|container|panel|card|section|banner|hero|background|fundo|box|shell|wrap|wrapper)\b/.test(label);
    }

    protected aiLayoutNodeLabel(node: OpenPencilNode): string {
        return `${node.id ?? ''} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
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
            layout: 'none',
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
        const preserveLongPageHeight = this.isLongPageRootNode(node, pageWidth, pageHeight);
        const maxRootWidth = preserveLongPageHeight ? pageWidth : maxWidth;
        const scale = preserveLongPageHeight
            ? Math.min(1, maxRootWidth / Math.max(originalWidth, 1))
            : Math.min(1, maxRootWidth / Math.max(originalWidth, 1), maxHeight / Math.max(originalHeight, 1));
        if (scale < 1) {
            this.scaleStructuredNode(node, scale);
        }
        const width = this.numberValue(node.width, fallbackWidth);
        const height = this.numberValue(node.height, fallbackHeight);
        node.x = Math.max(0, Math.min(this.numberValue(node.x, margin), pageWidth - width));
        node.y = Math.max(0, Math.min(this.numberValue(node.y, margin), pageHeight - height));
    }

    protected isLongPageRootNode(node: OpenPencilNode, pageWidth: number, pageHeight: number): boolean {
        if (node.type !== 'frame') {
            return false;
        }
        const width = this.numberValue(node.width, 0);
        const height = this.numberValue(node.height, 0);
        if (width < pageWidth * 0.45 || height < pageHeight * 1.05) {
            return false;
        }
        const label = `${node.id} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
        return /\b(page|homepage|home|website|site|marketplace|e-?commerce|catalog|landing|content|main|pagina|página)\b/.test(label);
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
        return page.children.some(node => this.isVisibleRenderableAiNode(node, 1));
    }

    protected isVisibleRenderableAiNode(node: OpenPencilNode, depth = 0): boolean {
        if (node.visible === false || node.enabled === false || node.opacity === 0) {
            return false;
        }
        if (this.isInternalCanvasPlaceholderRenderableNode(node)) {
            return false;
        }
        if (this.isFinalAiPlaceholderSkeletonNode(node, depth)) {
            return false;
        }
        if (node.children?.some(child => this.isVisibleRenderableAiNode(child, depth + 1))) {
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

    protected isInternalCanvasPlaceholderRenderableNode(node: OpenPencilNode): boolean {
        if (node.id === 'hero-card'
            && node.type === 'rectangle'
            && node.name === 'Hero card'
            && this.numberValue(node.width, 0) === 520
            && this.numberValue(node.height, 0) === 260) {
            return true;
        }
        if (node.type !== 'text') {
            return false;
        }
        const normalized = this.nodeTextContent(node).trim().replace(/\s+/g, ' ').toLowerCase();
        return (node.id === 'hero-title' && normalized === 'openpencil design')
            || (node.id === 'hero-copy' && normalized === 'edit this embedded .op design inside theia.');
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
