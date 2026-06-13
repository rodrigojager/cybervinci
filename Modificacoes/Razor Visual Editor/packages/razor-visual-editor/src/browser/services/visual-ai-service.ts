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
                mode: 'json',
                schemaName: 'CyberVinciVisualAiResult',
                schema: VISUAL_AI_RESULT_SCHEMA,
                instructions: 'Return the complete processed HTML and optional complete GrapesJS CSS for preview application.'
            },
            effectPolicy: {
                previewOnly: true,
                workspaceWrites: 'forbidden',
                shellExecution: 'forbidden',
                requireUserConfirmation: true
            },
            execution: {
                providerId: request.providerId,
                model: normalizedModel(request.model),
                reasoningPolicy: request.reasoningPolicy ?? 'auto',
                reasoningEffort: request.reasoningEffort ?? 'medium',
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
    if (!isRecord(parsed) || typeof parsed.html !== 'string') {
        throw new Error(`Visual AI response must include an "html" string. Response: ${rawText.slice(0, 500)}`);
    }
    return {
        html: parsed.html,
        css: typeof parsed.css === 'string' ? parsed.css : undefined,
        summary: typeof parsed.summary === 'string' ? parsed.summary : 'Visual AI changes applied.',
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : []
    };
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
