import { CodexProviderFrontendService } from '@cybervinci/codex-provider/lib/browser/codex-provider-frontend-service';
import type { CodexProviderNotificationMessage } from '@cybervinci/codex-provider/lib/common/codex-provider-service';
import { injectable, inject, optional } from '@theia/core/shared/inversify';
import { VisualAiProviderDescriptor, VisualAiRunRequest, VisualAiRunResult } from '../types/visual-ai';

@injectable()
export class RazorVisualAiService {
    @inject(CodexProviderFrontendService) @optional()
    protected readonly codexProvider: CodexProviderFrontendService | undefined;

    async listProviders(): Promise<VisualAiProviderDescriptor[]> {
        const codex = await this.codexProviderDescriptor();
        return [
            codex,
            {
                id: 'custom-json-provider',
                label: 'Custom JSON provider',
                description: 'Provider-agnostic contract for OpenAI, Anthropic, Ollama, Gemini, local models, or another CLI.',
                status: 'not-configured',
                statusMessage: 'Register a Visual AI provider adapter to enable this option.',
                models: ['auto'],
                defaultModel: 'auto',
                acceptsCustomModel: true
            }
        ];
    }

    async run(request: VisualAiRunRequest): Promise<VisualAiRunResult> {
        if (request.providerId === 'codex-provider') {
            return this.runCodexProvider(request);
        }
        throw new Error('This Visual AI provider is not configured yet. The request contract is provider-agnostic, but this adapter has not been registered.');
    }

    protected async codexProviderDescriptor(): Promise<VisualAiProviderDescriptor> {
        if (!this.codexProvider) {
            return {
                id: 'codex-provider',
                label: 'Codex CLI (ChatGPT)',
                description: 'Uses the CyberVinci Codex Provider and the local Codex CLI authentication.',
                status: 'unavailable',
                statusMessage: '@cybervinci/codex-provider is not bound in this application.',
                models: ['auto'],
                defaultModel: 'auto',
                acceptsCustomModel: true
            };
        }
        try {
            const status = await this.codexProvider.getStatus();
            const models = Array.from(new Set(['auto', ...(status.models ?? []), status.model].filter(Boolean) as string[]));
            return {
                id: 'codex-provider',
                label: 'Codex CLI (ChatGPT)',
                description: 'Uses the CyberVinci Codex Provider and the local Codex CLI authentication.',
                status: status.available === false ? 'unavailable' : status.authenticated === false ? 'needs-auth' : 'ready',
                statusMessage: status.message || authStatusMessage(status.authenticated, status.accountLabel),
                models,
                defaultModel: status.model || 'auto',
                acceptsCustomModel: true
            };
        } catch (error) {
            return {
                id: 'codex-provider',
                label: 'Codex CLI (ChatGPT)',
                description: 'Uses the CyberVinci Codex Provider and the local Codex CLI authentication.',
                status: 'unavailable',
                statusMessage: error instanceof Error ? error.message : String(error),
                models: ['auto'],
                defaultModel: 'auto',
                acceptsCustomModel: true
            };
        }
    }

    protected async runCodexProvider(request: VisualAiRunRequest): Promise<VisualAiRunResult> {
        if (!this.codexProvider) {
            throw new Error('Codex Provider is not available in this CyberVinci build.');
        }
        const status = await this.codexProvider.getStatus();
        if (status.available === false) {
            throw new Error(`Codex CLI is unavailable: ${status.message ?? status.executablePath ?? 'unknown executable'}`);
        }
        if (status.authenticated === false) {
            throw new Error('Codex CLI is not authenticated. Run the Codex Provider login command before using Visual AI.');
        }
        const prompt = buildVisualAiPrompt(request);
        const model = normalizedModel(request.model);
        const stream = await this.codexProvider.send({
            prompt,
            input: [{ type: 'text', text: prompt, text_elements: [] }],
            sessionId: `cybervinci-visual-ai:${request.fileUri}`,
            options: {
                approvalPolicy: 'never',
                sandboxMode: 'read-only',
                model,
                collaborationMode: 'default',
                verbosity: 'low'
            }
        });
        let text = '';
        for await (const token of stream) {
            if (token.type === 'notification') {
                text += notificationToText(token, Boolean(text));
            }
        }
        const result = parseVisualAiResult(text);
        validateVisualAiResult(result, request);
        return { ...result, rawText: text };
    }
}

function authStatusMessage(authenticated: boolean | undefined, accountLabel: string | undefined): string {
    if (authenticated && accountLabel) {
        return `Authenticated as ${accountLabel}`;
    }
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

function buildVisualAiPrompt(request: VisualAiRunRequest): string {
    const payload = {
        instruction: request.instruction,
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
    return [
        'You are CyberVinci Visual AI for a GrapesJS HTML/Razor visual editor.',
        'Modify only the visual canvas HTML and optional GrapesJS CSS requested by the user.',
        'Do not execute Razor. Do not run shell commands. Do not edit files. Do not save anything.',
        'Razor placeholders are locked. Preserve every element with data-cv-razor-token exactly once, including all data-cv-* attributes.',
        'Return exactly one JSON object and no Markdown fences.',
        'Schema:',
        '{ "html": "full processed HTML", "css": "optional full GrapesJS CSS", "summary": "short summary", "warnings": ["optional warning"] }',
        '',
        JSON.stringify(payload, undefined, 2)
    ].join('\n');
}

function notificationToText(message: CodexProviderNotificationMessage, receivedAgentDelta: boolean): string {
    const { method, params } = message;
    if (method === 'item/agentMessage/delta') {
        return readString(params, 'delta');
    }
    if (method === 'item/completed' && !receivedAgentDelta) {
        const item = readObject(params, 'item');
        const type = readString(item, 'type');
        if (type === 'agent_message' || type === 'agentMessage') {
            return readString(item, 'text') || readString(item, 'message');
        }
    }
    if (method === 'task_complete' && !receivedAgentDelta) {
        return readString(params, 'last_agent_message');
    }
    if (method === 'turn/failed' || method === 'error') {
        return readString(params, 'message') || readString(params, 'error') || readString(params, 'reason');
    }
    return '';
}

function parseVisualAiResult(text: string): VisualAiRunResult {
    const trimmed = text.trim();
    const jsonText = trimmed.startsWith('{') ? trimmed : extractJsonObject(trimmed);
    let parsed: unknown;
    try {
        parsed = JSON.parse(jsonText);
    } catch (error) {
        throw new Error(`Visual AI did not return valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!isRecord(parsed) || typeof parsed.html !== 'string') {
        throw new Error('Visual AI response must include an "html" string.');
    }
    return {
        html: parsed.html,
        css: typeof parsed.css === 'string' ? parsed.css : undefined,
        summary: typeof parsed.summary === 'string' ? parsed.summary : 'Visual AI changes applied.',
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : []
    };
}

function extractJsonObject(value: string): string {
    const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
    if (fenced?.startsWith('{')) {
        return fenced;
    }
    const start = value.indexOf('{');
    const end = value.lastIndexOf('}');
    if (start < 0 || end <= start) {
        throw new Error(`Visual AI response did not contain a JSON object. Response: ${value.slice(0, 500)}`);
    }
    return value.slice(start, end + 1);
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

function readObject(value: unknown, key: string): Record<string, unknown> | undefined {
    const entry = isRecord(value) ? value[key] : undefined;
    return isRecord(entry) ? entry : undefined;
}

function readString(value: unknown, key: string): string {
    const entry = isRecord(value) ? value[key] : undefined;
    return typeof entry === 'string' ? entry : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
