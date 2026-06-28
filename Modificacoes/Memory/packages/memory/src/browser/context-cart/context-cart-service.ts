import { FileUri } from '@theia/core/lib/common/file-uri';
import { Emitter, Event, nls } from '@theia/core/lib/common';
import { inject, injectable, preDestroy } from '@theia/core/shared/inversify';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import {
    MemoryService,
    MemoryWorkspaceSettings,
    MemorySourceKind,
    RetrievalResult
} from '../../common';
import { MEMORY_APPROVED_CONTEXT_VARIABLE } from './context-cart-variable-contribution';

export type ContextCartItemStatus = 'pending' | 'accepted' | 'rejected';

export interface ContextCartItem extends RetrievalResult {
    status: ContextCartItemStatus;
}

export interface ContextCartFeedbackInput {
    reason?: string;
    correction?: string;
}

export interface MemoryContextCartState {
    prompt: string;
    sourceKinds: MemorySourceKind[];
    items: ContextCartItem[];
    estimatedTokens: number;
    omittedCount: number;
    busy: boolean;
    error?: string;
    lastBuiltPack?: string;
    lastApprovedPack?: ApprovedContextPack;
}

export interface ContextPackBuildOptions {
    requireAcceptedItems?: boolean;
}

export interface ApprovedContextPack {
    id: string;
    content: string;
    builtAt: string;
    prompt: string;
    approvedItemIds: string[];
    approvedItems: Array<Pick<ContextCartItem, 'id' | 'title' | 'sourceKind' | 'uri' | 'estimatedTokens' | 'score'>>;
    estimatedTokens: number;
}

export const MemoryContextCartService = Symbol('MemoryContextCartService');
export interface MemoryContextCartService {
    readonly onDidChange: Event<void>;
    readonly state: MemoryContextCartState;
    setPrompt(prompt: string): void;
    toggleSourceKind(sourceKind: MemorySourceKind): void;
    suggest(prompt?: string): Promise<void>;
    accept(id: string): void;
    reject(id: string, feedback?: ContextCartFeedbackInput): void;
    reset(id: string): void;
    acceptAll(): void;
    rejectAll(): void;
    clear(): void;
    buildContextPack(options?: ContextPackBuildOptions): ApprovedContextPack | undefined;
    createApprovedContextVariable(pack: ApprovedContextPack): { variable: typeof MEMORY_APPROVED_CONTEXT_VARIABLE; arg: string };
}

const DEFAULT_SOURCE_KINDS: MemorySourceKind[] = [
    'code',
    'code-graph',
    'project-memory',
    'repository-memory',
    'task-memory',
    'local-docs',
    'skill',
    'agent-event',
    'feedback-record'
];

interface MemoryFeedbackRecordRequest {
    workspacePath: string;
    kind: string;
    targetId?: string;
    targetTitle?: string;
    sourceKind?: MemorySourceKind;
    outcome: ContextCartItemStatus;
    reason?: string;
    correction?: string;
    payload?: string;
}

interface OptionalMemoryFeedbackApi {
    recordFeedback?: (request: MemoryFeedbackRecordRequest) => Promise<unknown>;
}

@injectable()
export class MemoryContextCartServiceImpl implements MemoryContextCartService {

    @inject(MemoryService)
    protected readonly memoryService: MemoryService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    protected readonly onDidChangeEmitter = new Emitter<void>();
    readonly onDidChange = this.onDidChangeEmitter.event;

    protected mutableState: MemoryContextCartState = {
        prompt: '',
        sourceKinds: [...DEFAULT_SOURCE_KINDS],
        items: [],
        estimatedTokens: 0,
        omittedCount: 0,
        busy: false
    };

    get state(): MemoryContextCartState {
        return this.mutableState;
    }

    @preDestroy()
    protected dispose(): void {
        this.onDidChangeEmitter.dispose();
    }

    setPrompt(prompt: string): void {
        this.setState({ prompt });
    }

    toggleSourceKind(sourceKind: MemorySourceKind): void {
        const sourceKinds = this.mutableState.sourceKinds.includes(sourceKind)
            ? this.mutableState.sourceKinds.filter(candidate => candidate !== sourceKind)
            : [...this.mutableState.sourceKinds, sourceKind];
        this.setState({ sourceKinds });
    }

    async suggest(prompt = this.mutableState.prompt): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            this.setState({
                error: nls.localize('theia/memory/contextCart/noWorkspace', 'Open a workspace before suggesting context.')
            });
            return;
        }
        const settings = await this.memoryService.getSettings(workspacePath);
        if (settings.enabled !== true || settings.optIn?.contextCart !== true) {
            this.setState({
                busy: false,
                items: [],
                estimatedTokens: 0,
                omittedCount: 0,
                error: nls.localize('theia/memory/contextCart/consentRequired', 'Enable Memory Context Cart for this workspace before suggesting context.')
            });
            return;
        }

        const text = prompt.trim();
        const previousStatus = new Map(this.mutableState.items.map(item => [item.id, item.status]));
        const sourceKinds = this.consentAllowedSourceKinds(this.mutableState.sourceKinds, settings);
        this.setState({ prompt, busy: true, error: undefined });
        try {
            const suggestionResult = await this.memoryService.suggestContext({
                workspacePath,
                prompt: text,
                limit: 14,
                sourceKinds
            });
            const suggestions = new Map(suggestionResult.suggestions.map(suggestion => [suggestion.id, suggestion]));
            const results = await this.memoryService.search({
                workspacePath,
                text,
                limit: 14,
                sourceKinds
            });
            const items = results.map(result => {
                const suggestion = suggestions.get(result.id);
                return {
                    ...result,
                    score: suggestion?.score ?? result.score,
                    evidence: suggestion?.reason ?? result.evidence,
                    estimatedTokens: suggestion?.estimatedTokens ?? result.estimatedTokens ?? this.estimateTokens(result.snippet),
                    rankingSignals: suggestion?.rankingSignals ?? result.rankingSignals,
                    status: previousStatus.get(result.id) ?? 'pending'
                };
            });
            const nextItemIds = new Set(items.map(item => item.id));
            const ignoredItems = this.mutableState.items.filter(item => item.status === 'pending' && !nextItemIds.has(item.id));
            this.setState({
                busy: false,
                items,
                estimatedTokens: items.reduce((total, item) => total + (item.estimatedTokens ?? 0), 0),
                omittedCount: suggestionResult.omittedCount,
                lastBuiltPack: undefined,
                lastApprovedPack: undefined
            });
            await this.memoryService.recordEvent({
                workspacePath,
                eventType: 'context.suggested',
                payload: JSON.stringify({
                    prompt: text,
                    suggested: items.length,
                    estimatedTokens: this.mutableState.estimatedTokens,
                    omittedCount: suggestionResult.omittedCount,
                    sourceKinds
                })
            });
            ignoredItems.forEach(item => this.recordContextIgnored(item, workspacePath, 'suggestions-refreshed').catch(() => undefined));
        } catch (error) {
            this.setState({
                busy: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    accept(id: string): void {
        this.setItemStatus(id, 'accepted');
    }

    reject(id: string, feedback?: ContextCartFeedbackInput): void {
        this.setItemStatus(id, 'rejected', feedback);
    }

    reset(id: string): void {
        this.setItemStatus(id, 'pending');
    }

    acceptAll(): void {
        const changed = this.mutableState.items.filter(item => item.status !== 'rejected');
        this.setState({
            items: this.mutableState.items.map(item => item.status === 'rejected' ? item : { ...item, status: 'accepted' })
        });
        changed.forEach(item => this.recordContextDecision(item, 'accepted').catch(() => undefined));
    }

    rejectAll(): void {
        const changed = this.mutableState.items.filter(item => item.status !== 'accepted');
        this.setState({
            items: this.mutableState.items.map(item => item.status === 'accepted' ? item : { ...item, status: 'rejected' })
        });
        changed.forEach(item => this.recordContextDecision(item, 'rejected').catch(() => undefined));
    }

    clear(): void {
        const ignoredItems = this.mutableState.items.filter(item => item.status === 'pending');
        ignoredItems.forEach(item => this.recordContextIgnored(item, undefined, 'cart-cleared').catch(() => undefined));
        this.setState({
            prompt: '',
            items: [],
            estimatedTokens: 0,
            omittedCount: 0,
            error: undefined,
            lastBuiltPack: undefined,
            lastApprovedPack: undefined
        });
    }

    buildContextPack(options: ContextPackBuildOptions = {}): ApprovedContextPack | undefined {
        const accepted = this.mutableState.items.filter(item => item.status === 'accepted');
        if (options.requireAcceptedItems !== false && accepted.length === 0) {
            return undefined;
        }
        const builtAt = new Date().toISOString();
        const approvedItemIds = accepted.map(item => item.id);
        const packId = this.contextPackId(builtAt, approvedItemIds);
        const lines = [
            '# CyberVinci Approved Context Pack',
            '',
            'Only the context below was explicitly approved by the user for the next chat request.',
            `Pack ID: ${packId}`,
            `Built at: ${builtAt}`,
            `Approved items: ${approvedItemIds.length}`,
            ''
        ];
        const prompt = this.mutableState.prompt.trim();
        if (prompt) {
            lines.push('## User Prompt', prompt, '');
        }
        lines.push('## Approved Context');
        if (accepted.length === 0) {
            lines.push('No indexed context items were approved.');
        }
        for (const item of accepted) {
            lines.push(
                '',
                `### ${item.title}`,
                `Source: ${this.sourceLabel(item.sourceKind)}`,
                `Evidence: ${item.evidence ?? 'Memory retrieval'}`,
                `Status: ${item.status}`,
                `Estimated tokens: ${item.estimatedTokens ?? this.estimateTokens(item.snippet)}`,
                `Score: ${item.score.toFixed(2)}`
            );
            if (item.uri) {
                lines.push(`URI: ${item.uri}`);
            }
            lines.push('', item.snippet.trim());
        }
        const content = `${lines.join('\n').trim()}\n`;
        const pack: ApprovedContextPack = {
            id: packId,
            content,
            builtAt,
            prompt,
            approvedItemIds,
            approvedItems: accepted.map(item => ({
                id: item.id,
                title: item.title,
                sourceKind: item.sourceKind,
                uri: item.uri,
                estimatedTokens: item.estimatedTokens ?? this.estimateTokens(item.snippet),
                score: item.score
            })),
            estimatedTokens: accepted.reduce((total, item) => total + (item.estimatedTokens ?? this.estimateTokens(item.snippet)), 0)
        };
        this.setState({ lastBuiltPack: content, lastApprovedPack: pack });
        return pack;
    }

    createApprovedContextVariable(pack: ApprovedContextPack): { variable: typeof MEMORY_APPROVED_CONTEXT_VARIABLE; arg: string } {
        if (pack.approvedItemIds.length === 0) {
            throw new Error('Cannot insert a Memory context pack without approved Context Cart items.');
        }
        return {
            variable: MEMORY_APPROVED_CONTEXT_VARIABLE,
            arg: pack.content
        };
    }

    protected contextPackId(builtAt: string, approvedItemIds: string[]): string {
        const value = `${builtAt}:${approvedItemIds.join('|')}:${this.mutableState.prompt.trim()}`;
        let hash = 0;
        for (let i = 0; i < value.length; i++) {
            hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
        }
        return `pi-context-${Math.abs(hash).toString(36)}-${approvedItemIds.length}`;
    }

    protected setItemStatus(id: string, status: ContextCartItemStatus, feedback?: ContextCartFeedbackInput): void {
        const item = this.mutableState.items.find(candidate => candidate.id === id);
        this.setState({
            items: this.mutableState.items.map(item => item.id === id ? { ...item, status } : item)
        });
        if (item) {
            this.recordContextDecision(item, status, feedback).catch(() => undefined);
        }
    }

    protected setState(partial: Partial<MemoryContextCartState>): void {
        this.mutableState = { ...this.mutableState, ...partial };
        this.onDidChangeEmitter.fire(undefined);
    }

    protected consentAllowedSourceKinds(
        sourceKinds: MemorySourceKind[],
        settings: MemoryWorkspaceSettings
    ): MemorySourceKind[] {
        return sourceKinds.filter(sourceKind => {
            switch (sourceKind) {
                case 'code':
                    return true;
                case 'code-graph':
                    return settings.optIn?.codeGraph === true;
                case 'local-docs':
                case 'external-docs':
                    return settings.optIn?.documentGraph === true || settings.optIn?.externalDocCollections === true;
                case 'project-memory':
                case 'repository-memory':
                case 'task-memory':
                    return settings.optIn?.projectMemory === true || settings.optIn?.preferences === true || settings.optIn?.transcriptSearch === true;
                case 'skill':
                    return settings.optIn?.skills === true;
                case 'agent-event':
                    return settings.optIn?.events === true;
                case 'feedback-record':
                    return settings.optIn?.contextCart === true;
                default:
                    return false;
            }
        });
    }

    protected sourceLabel(sourceKind: MemorySourceKind): string {
        switch (sourceKind) {
            case 'code':
                return 'Code metadata';
            case 'code-graph':
                return 'Code graph';
            case 'local-docs':
                return 'Local versioned docs';
            case 'project-memory':
                return 'Project memory';
            case 'repository-memory':
                return 'Repository memory';
            case 'task-memory':
                return 'Task memory';
            case 'skill':
                return 'Skill candidate';
            case 'agent-event':
                return 'Agent event';
            case 'feedback-record':
                return 'Feedback record';
            default:
                return sourceKind;
        }
    }

    protected async getWorkspacePath(): Promise<string | undefined> {
        const roots = await this.workspaceService.roots;
        return roots[0] ? FileUri.fsPath(roots[0].resource.toString()) : undefined;
    }

    protected async recordContextIgnored(item: ContextCartItem, workspacePath?: string, reason?: string): Promise<void> {
        const resolvedWorkspacePath = workspacePath ?? await this.getWorkspacePath();
        if (!resolvedWorkspacePath) {
            return;
        }
        await this.memoryService.recordEvent({
            workspacePath: resolvedWorkspacePath,
            eventType: 'context.ignored',
            relativePath: item.sourceKind === 'code' && item.uri ? this.relativePath(resolvedWorkspacePath, item.uri) : undefined,
            payload: JSON.stringify({
                id: item.id,
                title: item.title,
                sourceKind: item.sourceKind,
                status: 'ignored',
                reason,
                estimatedTokens: item.estimatedTokens ?? this.estimateTokens(item.snippet),
                evidence: item.evidence
            })
        });
    }

    protected async recordContextDecision(item: ContextCartItem, status: ContextCartItemStatus, feedback?: ContextCartFeedbackInput): Promise<void> {
        if (status === 'pending') {
            return;
        }
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const normalizedFeedback = this.normalizeFeedback(feedback);
        await this.memoryService.recordEvent({
            workspacePath,
            eventType: status === 'accepted' ? 'context.accepted' : 'context.rejected',
            relativePath: item.sourceKind === 'code' && item.uri ? this.relativePath(workspacePath, item.uri) : undefined,
            payload: JSON.stringify({
                id: item.id,
                title: item.title,
                sourceKind: item.sourceKind,
                status,
                estimatedTokens: item.estimatedTokens ?? this.estimateTokens(item.snippet),
                evidence: item.evidence,
                reason: normalizedFeedback.reason,
                correction: normalizedFeedback.correction
            })
        });
        if (status === 'rejected') {
            await this.recordExplicitFeedback(workspacePath, item, status, normalizedFeedback);
        }
        if (status === 'accepted' && item.sourceKind === 'code' && item.uri) {
            await this.memoryService.recordEvent({
                workspacePath,
                eventType: 'file.read',
                relativePath: this.relativePath(workspacePath, item.uri),
                payload: JSON.stringify({ source: 'context-cart', itemId: item.id })
            });
        }
    }

    protected async recordExplicitFeedback(workspacePath: string, item: ContextCartItem, status: ContextCartItemStatus, feedback: ContextCartFeedbackInput): Promise<void> {
        const feedbackApi = this.memoryService as unknown as OptionalMemoryFeedbackApi;
        if (!feedbackApi.recordFeedback) {
            return;
        }
        await feedbackApi.recordFeedback({
            workspacePath,
            kind: 'context',
            targetId: item.id,
            targetTitle: item.title,
            sourceKind: item.sourceKind,
            outcome: status,
            reason: feedback.reason,
            correction: feedback.correction,
            payload: JSON.stringify({
                prompt: this.mutableState.prompt,
                evidence: item.evidence,
                estimatedTokens: item.estimatedTokens ?? this.estimateTokens(item.snippet),
                score: item.score,
                uri: item.uri
            })
        });
    }

    protected normalizeFeedback(feedback?: ContextCartFeedbackInput): ContextCartFeedbackInput {
        return {
            reason: feedback?.reason?.trim() || undefined,
            correction: feedback?.correction?.trim() || undefined
        };
    }

    protected estimateTokens(value: string): number {
        return Math.max(1, Math.ceil(value.length / 4));
    }

    protected relativePath(workspacePath: string, uri: string): string {
        const absolutePath = uri.startsWith('file:') ? FileUri.fsPath(uri) : uri;
        const normalizedWorkspace = workspacePath.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
        const normalizedPath = absolutePath.replace(/\\/g, '/');
        return normalizedPath.toLowerCase().startsWith(`${normalizedWorkspace}/`)
            ? normalizedPath.slice(normalizedWorkspace.length + 1)
            : normalizedPath;
    }
}
