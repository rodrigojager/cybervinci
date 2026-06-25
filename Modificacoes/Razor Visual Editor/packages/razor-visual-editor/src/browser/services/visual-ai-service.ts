import { CyberVinciAiRuntimeService } from '@cybervinci/ai-runtime/lib/common';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { injectable, inject, optional } from '@theia/core/shared/inversify';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { VisualAiProviderDescriptor, VisualAiRunRequest, VisualAiRunResult } from '../types/visual-ai';

@injectable()
export class RazorVisualAiService {
    @inject(CyberVinciAiRuntimeService) @optional()
    protected readonly aiRuntime: CyberVinciAiRuntimeService | undefined;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    getRuntimeService(): CyberVinciAiRuntimeService | undefined {
        return this.aiRuntime;
    }

    async getWorkspaceRootPath(): Promise<string | undefined> {
        return this.getWorkspaceRoot();
    }

    async listProviders(): Promise<VisualAiProviderDescriptor[]> {
        if (!this.aiRuntime) {
            return [{
                id: 'cybervinci-ai-runtime',
                label: 'CyberVinci AI Runtime',
                description: 'Provider-neutral AI task runtime.',
                status: 'unavailable',
                statusMessage: '@cybervinci/ai-runtime is not bound in this application.',
                models: ['auto'],
                defaultModel: 'auto',
                acceptsCustomModel: true
            }];
        }
        const providers = await this.aiRuntime.listProviders({ includeUnavailable: true });
        return providers.map(provider => ({
            id: provider.id,
            label: provider.label,
            description: provider.message ?? 'Runs through the provider-neutral CyberVinci AI Runtime.',
            status: provider.available === false ? 'unavailable' : provider.authenticated === false ? 'needs-auth' : 'ready',
            statusMessage: provider.message || authStatusMessage(provider.authenticated),
            models: Array.from(new Set(['auto', ...(provider.models ?? []), provider.defaultModel].filter(Boolean) as string[])),
            defaultModel: provider.defaultModel ?? provider.models?.[0] ?? 'auto',
            acceptsCustomModel: true
        }));
    }

    async run(request: VisualAiRunRequest): Promise<VisualAiRunResult> {
        if (!this.aiRuntime) {
            throw new Error('CyberVinci AI Runtime is not available in this CyberVinci build.');
        }
        const workspacePath = await this.getWorkspaceRoot();
        const result = await this.aiRuntime.runTask<VisualAiPromptPayload, VisualAiRunResult>({
            surfaceId: 'razor-visual-editor',
            action: 'visual.editPreview',
            workspacePath,
            userPrompt: request.instruction,
            systemPrompt: VISUAL_AI_SYSTEM_PROMPT,
            input: buildVisualAiPromptPayload(request),
            sessionId: `cybervinci-visual-ai:${request.fileUri}`,
            context: {
                mode: 'memory-if-available',
                maxItems: 6,
                tokenBudget: 1200
            },
            output: {
                mode: 'text',
                schemaName: 'CyberVinciVisualAiResult',
                schema: VISUAL_AI_RESULT_SCHEMA,
                instructions: 'Return exactly one JSON object matching the schema. Do not use Markdown fences, comments, explanations, or trailing text.'
            },
            effectPolicy: {
                previewOnly: true,
                workspaceWrites: 'forbidden',
                shellExecution: 'forbidden',
                requireUserConfirmation: true
            },
            execution: {
                ...request.execution,
                model: normalizedModel(request.execution.model),
                reasoningPolicy: request.execution.reasoningPolicy ?? 'auto',
                reasoningEffort: request.execution.reasoningEffort ?? 'medium',
                approvalPolicy: 'never',
                sandboxMode: 'read-only',
                collaborationMode: 'default',
                verbosity: 'low'
            }
        });
        const parsed = coerceVisualAiResult(result.structured, result.text);
        validateVisualAiResult(parsed, request);
        return { ...parsed, rawText: result.text };
    }

    protected async getWorkspaceRoot(): Promise<string | undefined> {
        const roots = await this.workspaceService.roots;
        const root = roots[0];
        return root ? FileUri.fsPath(root.resource.toString()) : undefined;
    }
}

const VISUAL_AI_SYSTEM_PROMPT = [
    'You are CyberVinci Visual AI for a GrapesJS HTML/Razor visual editor.',
    'Modify only the visual canvas HTML and optional GrapesJS CSS requested by the user.',
    'If input.selectedElement is present, treat it as the default target and closest context for the edit unless the user explicitly asks for a broader page change.',
    'If input.selectedElement is absent, do not assume a clicked element target.',
    'Do not execute Razor. Do not run shell commands. Do not edit files. Do not save anything.',
    'Razor placeholders are locked. Preserve every element with data-cv-razor-token exactly once, including all data-cv-* attributes.'
].join('\n');

const VISUAL_AI_RESULT_SCHEMA: Record<string, unknown> = {
    type: 'object',
    required: ['html'],
    additionalProperties: false,
    properties: {
        html: { type: 'string' },
        css: { type: 'string' },
        summary: { type: 'string' },
        warnings: { type: 'array', items: { type: 'string' } }
    }
};

interface VisualAiPromptPayload {
    fileUri: string;
    isRazor: boolean;
    selectedElement?: {
        tagName: string;
        label: string;
        attributes: Record<string, string>;
        classes: string[];
        text: string;
    };
    protectedTokens: VisualAiRunRequest['protectedTokens'];
    assetWarnings: string[];
    html: string;
    css: string;
}

function authStatusMessage(authenticated: boolean | undefined): string {
    if (authenticated) {
        return 'Authenticated';
    }
    if (authenticated === false) {
        return 'Not authenticated';
    }
    return 'Status available';
}

function normalizedModel(model: string | undefined): string | undefined {
    const trimmed = model?.trim();
    return trimmed && trimmed !== 'auto' ? trimmed : undefined;
}

function buildVisualAiPromptPayload(request: VisualAiRunRequest): VisualAiPromptPayload {
    return {
        fileUri: request.fileUri,
        isRazor: request.isRazor,
        selectedElement: request.selectedElement ? {
            tagName: request.selectedElement.tagName,
            label: request.selectedElement.label,
            attributes: request.selectedElement.attributes,
            classes: request.selectedElement.classes,
            text: request.selectedElement.text
        } : undefined,
        protectedTokens: request.protectedTokens,
        assetWarnings: request.assetWarnings,
        html: request.html,
        css: request.css
    };
}

function coerceVisualAiResult(parsed: unknown, rawText: string): VisualAiRunResult {
    const candidate = isRecord(parsed) ? parsed : parseVisualAiResult(rawText);
    if (!isRecord(candidate) || typeof candidate.html !== 'string') {
        throw new Error(`Visual AI response must include an "html" string. Response: ${rawText.slice(0, 500)}`);
    }
    return {
        html: candidate.html,
        css: typeof candidate.css === 'string' ? candidate.css : undefined,
        summary: typeof candidate.summary === 'string' ? candidate.summary : 'Visual AI changes applied.',
        warnings: Array.isArray(candidate.warnings) ? candidate.warnings.map(String) : []
    };
}

function parseVisualAiResult(rawText: string): unknown {
    const text = stripMarkdownFence(rawText.trim());
    const attempts = [
        text,
        extractFirstJsonObject(text)
    ].filter((candidate): candidate is string => !!candidate);
    const errors: string[] = [];
    for (const attempt of attempts) {
        try {
            return JSON.parse(attempt);
        } catch (error) {
            errors.push(error instanceof Error ? error.message : String(error));
        }
    }
    throw new Error(`Visual AI returned invalid JSON. ${errors[0] ?? 'No JSON object found.'}`);
}

function stripMarkdownFence(text: string): string {
    const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return fenceMatch ? fenceMatch[1].trim() : text;
}

function extractFirstJsonObject(text: string): string | undefined {
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
                return text.slice(start, index + 1);
            }
        }
    }
    return undefined;
}

function validateVisualAiResult(result: VisualAiRunResult, request: VisualAiRunRequest): void {
    if (!result.html.trim()) {
        throw new Error('Visual AI returned empty HTML.');
    }
    for (const token of request.protectedTokens) {
        const count = countTokenOccurrences(result.html, token.id);
        if (count !== 1) {
            throw new Error(`Visual AI response is unsafe: Razor token ${token.id} appears ${count} times.`);
        }
    }
}

function countTokenOccurrences(html: string, tokenId: string): number {
    const escaped = escapeRegExp(tokenId);
    const pattern = new RegExp(`data-cv-razor-token\\s*=\\s*["']${escaped}["']`, 'g');
    return html.match(pattern)?.length ?? 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
