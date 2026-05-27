import { ChatAgentLocation, ChatRequestModel, ChatService, ChatSession, ChatSuggestion, MutableChatModel } from '@theia/ai-chat';
import { getJsonOfResponse, LanguageModel, LanguageModelRegistry, LanguageModelService } from '@theia/ai-core';
import { ClipboardService } from '@theia/core/lib/browser/clipboard-service';
import { AbstractViewContribution, FrontendApplication, codicon } from '@theia/core/lib/browser';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { CommandRegistry, Disposable, DisposableCollection, MenuModelRegistry, MessageService, nls } from '@theia/core/lib/common';
import { inject, injectable, optional, postConstruct, preDestroy } from '@theia/core/shared/inversify';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { MemoryItem, MemoryService, MemoryWorkspaceSettings, PromptNormalizer } from '../../common';
import { MemoryCommands, MemoryMenus } from '../memory-commands';
import { ApprovedContextPack, MemoryContextCartService } from '../context-cart/context-cart-service';
import { MemoryContextCartWidget } from '../context-cart/context-cart-widget';

const MEMORY_CHAT_SUGGESTION_KEY = 'cybervinci-memory-context-cart';
const MEMORY_CHAT_DYNAMIC_KEY = 'cybervinci-memory-dynamic';
type LlmSuggestionAction = 'context' | 'skill' | 'memory' | 'graph';

interface InlineChatSuggestion {
    id: string;
    label: string;
    callback: () => unknown;
}

interface LlmChatLearningResult {
    suggestions?: Array<{
        label?: string;
        action?: LlmSuggestionAction;
        query?: string;
        reason?: string;
    }>;
    skillCandidate?: {
        title?: string;
        description?: string;
        trigger?: string;
        proposedSkillJson?: unknown;
        confidence?: number;
    };
    memoryCandidate?: {
        title?: string;
        content?: string;
        scope?: 'workspace' | 'global';
        confidence?: number;
    };
}

type MemoryCandidateInput = Partial<Pick<MemoryItem, 'id' | 'workspacePath' | 'scope' | 'repositoryUrl' | 'repositoryId' | 'sessionId' | 'taskId' | 'expiresAt' | 'retentionPolicy' | 'memoryType' | 'title' | 'content' | 'source' | 'evidence' | 'status' | 'supersededBy' | 'supersedes' | 'originMarkers'>> & {
    confidence?: number;
};

interface MemoryCandidateRpc {
    extractMemoryCandidates?(request: {
        workspacePath: string;
        prompt: string;
        source: 'ai-chat';
        sessionId: string;
        requestId: string;
        agentId?: string;
    }): Promise<unknown>;
    proposeMemoryCandidate?(request: MemoryCandidateInput & { workspacePath?: string }): Promise<MemoryItem | undefined>;
    addMemoryCandidate?(request: MemoryCandidateInput & { workspacePath?: string }): Promise<MemoryItem | undefined>;
    createMemoryCandidate?(request: MemoryCandidateInput & { workspacePath?: string }): Promise<MemoryItem | undefined>;
}

@injectable()
export class MemoryChatContribution extends AbstractViewContribution<MemoryContextCartWidget> {

    protected readonly toDispose = new DisposableCollection();
    protected readonly promptNormalizer = new PromptNormalizer();

    @inject(MemoryContextCartService)
    protected readonly contextCart: MemoryContextCartService;

    @inject(ChatService)
    protected readonly chatService: ChatService;

    @inject(ClipboardService)
    protected readonly clipboardService: ClipboardService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(MemoryService)
    protected readonly memoryService: MemoryService;

    @inject(CommandRegistry)
    protected readonly commandRegistry: CommandRegistry;

    @inject(LanguageModelRegistry) @optional()
    protected readonly languageModelRegistry: LanguageModelRegistry | undefined;

    @inject(LanguageModelService) @optional()
    protected readonly languageModelService: LanguageModelService | undefined;

    protected readonly sessionDisposables = new Map<string, DisposableCollection>();
    protected readonly processedRequestIds = new Set<string>();
    protected readonly promptCountsByWorkspace = new Map<string, number>();
    protected dynamicSuggestions: InlineChatSuggestion[] = [];

    constructor() {
        super({
            widgetId: MemoryContextCartWidget.ID,
            widgetName: MemoryContextCartWidget.LABEL,
            defaultWidgetOptions: {
                area: 'right',
                rank: 840
            },
            toggleCommandId: 'memory.context-cart.toggle'
        });
    }

    @postConstruct()
    protected init(): void {
        this.toDispose.push(this.chatService.onSessionEvent(event => {
            if ('sessionId' in event && event.sessionId) {
                const session = this.chatService.getSession(event.sessionId);
                if (session) {
                    this.bindSession(session);
                }
            }
        }));
        for (const session of this.chatService.getSessions()) {
            this.bindSession(session);
        }
    }

    @preDestroy()
    protected dispose(): void {
        for (const disposable of this.sessionDisposables.values()) {
            disposable.dispose();
        }
        this.sessionDisposables.clear();
        this.toDispose.dispose();
    }

    async initializeLayout(_app: FrontendApplication): Promise<void> {
        for (const session of this.chatService.getSessions()) {
            this.bindSession(session);
        }
    }

    override registerCommands(registry: CommandRegistry): void {
        super.registerCommands(registry);
        registry.registerCommand(MemoryCommands.OPEN_CONTEXT_CART, {
            execute: () => this.openContextCart()
        });
        registry.registerCommand(MemoryCommands.SUGGEST_CHAT_CONTEXT, {
            execute: () => this.suggestFromChat()
        });
        registry.registerCommand(MemoryCommands.BUILD_APPROVED_CONTEXT, {
            execute: () => this.buildApprovedContext()
        });
        registry.registerCommand(MemoryCommands.COPY_APPROVED_CONTEXT, {
            execute: () => this.copyApprovedContext()
        });
        registry.registerCommand(MemoryCommands.INSERT_APPROVED_CONTEXT, {
            execute: () => this.insertApprovedContext()
        });
    }

    override registerMenus(menus: MenuModelRegistry): void {
        super.registerMenus(menus);
        menus.registerMenuAction(MemoryMenus.MEMORY, {
            commandId: MemoryCommands.OPEN_CONTEXT_CART.id,
            label: nls.localize('theia/memory/contextCart/open', 'Context Cart'),
            order: '7'
        });
        menus.registerMenuAction(MemoryMenus.MEMORY, {
            commandId: MemoryCommands.SUGGEST_CHAT_CONTEXT.id,
            label: nls.localize('theia/memory/contextCart/suggestFromChat', 'Suggest Context for Current Chat'),
            order: '8'
        });
        menus.registerMenuAction(MemoryMenus.MEMORY, {
            commandId: MemoryCommands.INSERT_APPROVED_CONTEXT.id,
            label: nls.localize('theia/memory/contextCart/insertApprovedContext', 'Insert Approved Context into Chat'),
            order: '9'
        });
    }

    protected async openContextCart(): Promise<MemoryContextCartWidget> {
        return this.openView({ activate: true });
    }

    protected async suggestFromChat(): Promise<void> {
        const latestPrompt = this.latestChatPrompt();
        if (latestPrompt) {
            this.contextCart.setPrompt(latestPrompt);
            await this.recordPromptSubmitted(latestPrompt);
        }
        await this.openContextCart();
        await this.contextCart.suggest(latestPrompt ?? this.contextCart.state.prompt);
        this.installChatSuggestion();
    }

    protected async suggestForPrompt(prompt: string): Promise<void> {
        this.contextCart.setPrompt(prompt);
        await this.openContextCart();
        await this.contextCart.suggest(prompt);
    }

    protected buildApprovedContext(): ApprovedContextPack | undefined {
        const pack = this.contextCart.buildContextPack();
        if (!pack) {
            this.messageService.warn(nls.localize(
                'theia/memory/contextCart/noApprovedItems',
                'Accept at least one context suggestion before building a context pack.'
            ));
            return undefined;
        }
        this.messageService.info(nls.localize(
            'theia/memory/contextCart/packBuilt',
            'Built approved context pack with {0} characters.',
            pack.content.length
        ));
        return pack;
    }

    protected async copyApprovedContext(): Promise<void> {
        const pack = this.buildApprovedContext();
        if (!pack) {
            return;
        }
        await this.clipboardService.writeText(pack.content);
        this.messageService.info(nls.localize('theia/memory/contextCart/copied', 'Copied approved context pack.'));
    }

    protected async insertApprovedContext(): Promise<void> {
        const pack = this.buildApprovedContext();
        if (!pack) {
            return;
        }
        const session = this.chatService.getActiveSession()
            ?? this.chatService.createSession(ChatAgentLocation.Panel, { focus: true });
        session.model.context.addVariables(this.contextCart.createApprovedContextVariable(pack));
        this.chatService.setActiveSession(session.id, { focus: true });
        await this.recordApprovedContextInserted(pack, session.id);
        this.installChatSuggestion();
        this.messageService.info(nls.localize(
            'theia/memory/contextCart/inserted',
            'Inserted approved context into the active AI Chat session.'
        ));
    }

    protected latestChatPrompt(): string | undefined {
        const latestRequest = this.chatService.getActiveSession()?.model.getRequests().at(-1);
        return latestRequest?.request.text;
    }

    protected installChatSuggestion(): void {
        const session = this.chatService.getActiveSession();
        const model = session?.model as MutableChatModel | undefined;
        if (!model || typeof model.setSuggestions !== 'function') {
            return;
        }
        const suggestions = model.suggestions.filter(suggestion => !this.isMemorySuggestion(suggestion));
        suggestions.push({
            kind: 'callback',
            content: `[${nls.localize('theia/memory/contextCart/chatSuggestion', 'CyberVinci: build approved context')}](_callback "${MEMORY_CHAT_SUGGESTION_KEY}")`,
            callback: () => this.suggestFromChat()
        });
        suggestions.push({
            kind: 'callback',
            content: `[${nls.localize('theia/memory/contextCart/skillSuggestion', 'CyberVinci: reuse skills/context')}](_callback "${MEMORY_CHAT_SUGGESTION_KEY}:skills")`,
            callback: () => this.openContextCart()
        });
        for (const suggestion of this.dynamicSuggestions.slice(0, 4)) {
            suggestions.push({
                kind: 'callback',
                content: `[${suggestion.label}](_callback "${MEMORY_CHAT_DYNAMIC_KEY}:${suggestion.id}")`,
                callback: suggestion.callback
            });
        }
        model.setSuggestions(suggestions);
    }

    protected bindSession(session: ChatSession): void {
        if (this.sessionDisposables.has(session.id)) {
            return;
        }
        const disposable = new DisposableCollection();
        disposable.push(session.model.onDidChange(event => {
            if (event.kind === 'addRequest') {
                this.processChatRequest(session, event.request).catch(error => console.warn('[memory] chat learning failed', error));
            }
        }));
        disposable.push(Disposable.create(() => this.sessionDisposables.delete(session.id)));
        this.sessionDisposables.set(session.id, disposable);
        this.toDispose.push(disposable);
    }

    protected async processChatRequest(session: ChatSession, request: ChatRequestModel): Promise<void> {
        if (this.processedRequestIds.has(request.id)) {
            return;
        }
        this.processedRequestIds.add(request.id);
        const prompt = (request.request.displayText ?? request.request.text ?? '').trim();
        if (!prompt) {
            return;
        }
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const settings = await this.memoryService.getSettings(workspacePath);
        if (!this.canCaptureChatLearning(settings)) {
            return;
        }

        this.contextCart.setPrompt(prompt);
        await this.memoryService.recordEvent({
            workspacePath,
            eventType: 'prompt.submitted',
            payload: await this.promptSubmittedPayload(prompt, workspacePath, {
                source: 'ai-chat',
                sessionId: session.id,
                requestId: request.id,
                agentId: request.agentId,
                includeRedactedPromptSnippet: settings.optIn?.promptSnippets === true
            })
        });

        await this.maybeIndexWorkspace(workspacePath, prompt, settings);
        const deterministic = await this.deterministicSuggestions(workspacePath, prompt, settings);
        this.dynamicSuggestions = settings.chatInlineSuggestionsEnabled === false ? [] : deterministic;
        const extractedMemoryCandidates = await this.extractDeterministicMemoryCandidates(workspacePath, prompt, session, request);
        if (extractedMemoryCandidates.length && settings.chatInlineSuggestionsEnabled !== false) {
            this.dynamicSuggestions = [{
                id: `memory-candidates-${extractedMemoryCandidates[0].id}`,
                label: nls.localize(
                    'theia/memory/chat/reviewExtractedMemories',
                    'CyberVinci: review {0} memory candidate(s)',
                    extractedMemoryCandidates.length
                ),
                callback: () => this.commandRegistry.executeCommand(MemoryCommands.OPEN_PROJECT_MEMORY_GRAPH.id)
            }, ...this.dynamicSuggestions].slice(0, 6);
        }

        const frequency = Math.max(0, Math.floor(settings.chatLearningLlmFrequency ?? 0));
        const count = (this.promptCountsByWorkspace.get(workspacePath) ?? 0) + 1;
        this.promptCountsByWorkspace.set(workspacePath, count);
        const periodicLlmTrigger = frequency > 0 && count % frequency === 0;
        const deterministicLlmTrigger = this.shouldRunDeterministicLlm(prompt, deterministic);
        if (settings.chatLearningLlmEnabled === true && (periodicLlmTrigger || deterministicLlmTrigger)) {
            const llmSuggestions = await this.analyzeWithLlm(workspacePath, prompt, request, settings);
            if (llmSuggestions.length && settings.chatInlineSuggestionsEnabled !== false) {
                this.dynamicSuggestions = [...llmSuggestions, ...this.dynamicSuggestions]
                    .filter((suggestion, index, all) => all.findIndex(candidate => candidate.label === suggestion.label) === index)
                    .slice(0, 6);
            }
        }
    }

    protected canCaptureChatLearning(settings: MemoryWorkspaceSettings): boolean {
        return settings.enabled === true
            && settings.chatLearningEnabled === true
            && settings.optIn?.transcriptSearch === true;
    }

    protected async deterministicSuggestions(workspacePath: string, prompt: string, settings: MemoryWorkspaceSettings): Promise<InlineChatSuggestion[]> {
        const suggestions: InlineChatSuggestion[] = [];
        if (settings.optIn?.contextCart !== false && this.promptLooksContextual(prompt)) {
            suggestions.push({
                id: 'context',
                label: nls.localize('theia/memory/chat/contextChip', 'CyberVinci: suggest related context'),
                callback: () => this.suggestForPrompt(prompt)
            });
        }
        const dashboard = await this.memoryService.getDashboard(workspacePath);
        const candidate = dashboard.skillCandidates.find(item => item.status === 'suggested' || item.status === 'tracking');
        if (settings.skillSuggestionsEnabled && candidate && settings.optIn?.skills !== false) {
            suggestions.push({
                id: `skill-${candidate.id}`,
                label: nls.localize('theia/memory/chat/skillChip', 'CyberVinci: review skill "{0}"', candidate.title),
                callback: () => this.commandRegistry.executeCommand(MemoryCommands.OPEN_SKILLS_REVIEW.id)
            });
        }
        if (settings.graphEnabled && dashboard.graphs.code.nodes.length && this.promptLooksGraphRelated(prompt)) {
            suggestions.push({
                id: 'graph',
                label: nls.localize('theia/memory/chat/graphChip', 'CyberVinci: open related graph'),
                callback: () => this.commandRegistry.executeCommand(MemoryCommands.OPEN_CODE_GRAPH.id)
            });
        }
        return suggestions;
    }

    protected shouldRunDeterministicLlm(prompt: string, suggestions: InlineChatSuggestion[]): boolean {
        return this.promptLooksContextual(prompt) && suggestions.length > 0;
    }

    protected async analyzeWithLlm(
        workspacePath: string,
        prompt: string,
        request: ChatRequestModel,
        settings: MemoryWorkspaceSettings
    ): Promise<InlineChatSuggestion[]> {
        if (!this.languageModelRegistry || !this.languageModelService) {
            return [];
        }
        const model = await this.resolveLearningModel(request, settings);
        if (!model) {
            return [];
        }
        const response = await this.languageModelService.sendRequest(model, {
            sessionId: request.session.id,
            requestId: request.id,
            subRequestId: `${request.id}:memory-learning`,
            agentId: request.agentId,
            messages: [{
                actor: 'system',
                type: 'text',
                text: [
                    'You analyze CyberVinci AI Chat usage to suggest local context chips, reusable skill candidates, and possible IDE or project memories.',
                    'Return strict JSON only. Do not include private source content. Do not propose executing actions.',
                    'Schema: {"suggestions":[{"label":"short chip","action":"context|skill|memory|graph","query":"optional","reason":"optional"}],"skillCandidate":{"title":"...","description":"...","trigger":"...","proposedSkillJson":{},"confidence":0.0},"memoryCandidate":{"title":"...","content":"...","scope":"workspace|global","confidence":0.0}}.'
                ].join('\n')
            }, {
                actor: 'user',
                type: 'text',
                text: `Workspace: ${workspacePath}\nPrompt:\n${prompt}`
            }],
            response_format: { type: 'json_object' },
            clientSettings: { keepThinking: false, keepToolCalls: false }
        });
        const parsed = getLearningResult(await getJsonOfResponse(response));
        const suggestions: InlineChatSuggestion[] = [];
        for (const item of parsed.suggestions ?? []) {
            const label = item.label?.trim();
            if (!label) {
                continue;
            }
            suggestions.push({
                id: `llm-${suggestions.length}`,
                label,
                callback: () => this.handleLlmSuggestion(item.action, item.query ?? prompt)
            });
        }
        if (parsed.skillCandidate?.title && parsed.skillCandidate.description && (parsed.skillCandidate.confidence ?? 0) >= 0.6) {
            const candidate = await this.memoryService.proposeSkillCandidate({
                workspacePath,
                signature: this.promptSignature(parsed.skillCandidate.trigger ?? prompt),
                title: parsed.skillCandidate.title,
                description: parsed.skillCandidate.description,
                proposedSkillJson: parsed.skillCandidate.proposedSkillJson ? JSON.stringify(parsed.skillCandidate.proposedSkillJson, undefined, 2) : undefined,
                evidence: `LLM chat learning from prompt: ${prompt.slice(0, 180)}`,
                source: model.id
            });
            suggestions.push({
                id: `llm-skill-${candidate.id}`,
                label: nls.localize('theia/memory/chat/reviewLlmSkill', 'CyberVinci: review new skill "{0}"', candidate.title),
                callback: () => this.commandRegistry.executeCommand(MemoryCommands.OPEN_SKILLS_REVIEW.id)
            });
        }
        if (parsed.memoryCandidate?.title && parsed.memoryCandidate.content && (parsed.memoryCandidate.confidence ?? 0) >= 0.75) {
            const candidate = await this.createMemoryCandidate(workspacePath, {
                scope: parsed.memoryCandidate.scope === 'global' ? 'global' : 'workspace',
                memoryType: 'manual_note',
                title: parsed.memoryCandidate.title,
                content: parsed.memoryCandidate.content,
                source: 'chat-learning',
                evidence: `LLM chat learning from prompt: ${prompt.slice(0, 180)}`,
                confidence: parsed.memoryCandidate.confidence
            });
            suggestions.push({
                id: `llm-memory-${candidate.id}`,
                label: nls.localize('theia/memory/chat/reviewLlmMemory', 'CyberVinci: review memory candidate "{0}"', candidate.title),
                callback: () => this.commandRegistry.executeCommand(MemoryCommands.OPEN_PROJECT_MEMORY_GRAPH.id)
            });
        }
        return suggestions;
    }

    protected async extractDeterministicMemoryCandidates(
        workspacePath: string,
        prompt: string,
        session: ChatSession,
        request: ChatRequestModel
    ): Promise<MemoryItem[]> {
        const service = this.memoryCandidateService();
        if (typeof service.extractMemoryCandidates !== 'function') {
            return [];
        }
        try {
            const extracted = await service.extractMemoryCandidates({
                workspacePath,
                prompt,
                source: 'ai-chat',
                sessionId: session.id,
                requestId: request.id,
                agentId: request.agentId
            });
            return this.persistExtractedMemoryCandidates(workspacePath, prompt, extracted);
        } catch (error) {
            console.warn('[memory] memory candidate extraction failed', error);
            return [];
        }
    }

    protected async persistExtractedMemoryCandidates(workspacePath: string, prompt: string, extracted: unknown): Promise<MemoryItem[]> {
        const candidates: MemoryItem[] = [];
        for (const record of this.memoryCandidateRecords(extracted)) {
            if (this.isMemoryCandidateRecord(record)) {
                candidates.push(record as unknown as MemoryItem);
                continue;
            }
            const input = this.memoryCandidateInput(record);
            if (!input.title?.trim() || !input.content?.trim() || (input.confidence ?? 0.6) < 0.6) {
                continue;
            }
            candidates.push(await this.createMemoryCandidate(workspacePath, {
                ...input,
                source: input.source ?? 'deterministic-chat-extraction',
                evidence: input.evidence ?? prompt.slice(0, 240)
            }));
        }
        return candidates;
    }

    protected async createMemoryCandidate(workspacePath: string, candidate: MemoryCandidateInput): Promise<MemoryItem> {
        const request: MemoryCandidateInput & { workspacePath?: string } = {
            workspacePath: candidate.scope === 'global' ? undefined : workspacePath,
            scope: candidate.scope === 'global' ? 'global' : 'workspace',
            memoryType: candidate.memoryType ?? 'manual_note',
            title: candidate.title?.trim() || 'Chat learning memory',
            content: candidate.content?.trim() || '',
            source: candidate.source ?? 'chat-learning',
            evidence: candidate.evidence,
            repositoryUrl: candidate.repositoryUrl,
            repositoryId: candidate.repositoryId,
            sessionId: candidate.sessionId,
            taskId: candidate.taskId,
            expiresAt: candidate.expiresAt,
            retentionPolicy: candidate.retentionPolicy,
            supersededBy: candidate.supersededBy,
            supersedes: candidate.supersedes,
            originMarkers: candidate.originMarkers,
            status: 'candidate'
        };
        const service = this.memoryCandidateService();
        const optionalMethod = service.proposeMemoryCandidate ?? service.addMemoryCandidate ?? service.createMemoryCandidate;
        if (optionalMethod) {
            try {
                const proposed = await optionalMethod.call(service, request);
                if (proposed) {
                    return this.ensureMemoryCandidateStatus(workspacePath, proposed);
                }
            } catch (error) {
                console.warn('[memory] optional memory candidate RPC failed, falling back to addMemory/updateMemory', error);
            }
        }
        const created = await this.memoryService.addMemory({
            workspacePath: request.workspacePath,
            scope: request.scope ?? 'workspace',
            memoryType: request.memoryType ?? 'manual_note',
            title: request.title ?? 'Chat learning memory',
            content: request.content ?? '',
            source: request.source,
            evidence: request.evidence
        });
        return this.ensureMemoryCandidateStatus(workspacePath, created);
    }

    protected async ensureMemoryCandidateStatus(workspacePath: string, memory: MemoryItem): Promise<MemoryItem> {
        if (memory.status === 'candidate') {
            return memory;
        }
        return await this.memoryService.updateMemory({
            workspacePath,
            id: memory.id,
            patch: { status: 'candidate' }
        }) ?? memory;
    }

    protected memoryCandidateRecords(value: unknown): Array<Record<string, unknown>> {
        const rawCandidates = Array.isArray(value)
            ? value
            : this.candidateArrayFromObject(value);
        return rawCandidates
            .filter((candidate): candidate is Record<string, unknown> => !!candidate && typeof candidate === 'object');
    }

    protected memoryCandidateInput(candidate: Record<string, unknown>): MemoryCandidateInput {
        return {
            id: typeof candidate.id === 'string' ? candidate.id : undefined,
            workspacePath: typeof candidate.workspacePath === 'string' ? candidate.workspacePath : undefined,
            scope: candidate.scope === 'global' ? 'global' : 'workspace',
            memoryType: this.memoryType(candidate.memoryType),
            title: typeof candidate.title === 'string' ? candidate.title : undefined,
            content: typeof candidate.content === 'string' ? candidate.content : undefined,
            source: typeof candidate.source === 'string' ? candidate.source : undefined,
            evidence: typeof candidate.evidence === 'string' ? candidate.evidence : undefined,
            repositoryUrl: typeof candidate.repositoryUrl === 'string' ? candidate.repositoryUrl : undefined,
            repositoryId: typeof candidate.repositoryId === 'string' ? candidate.repositoryId : undefined,
            sessionId: typeof candidate.sessionId === 'string' ? candidate.sessionId : undefined,
            taskId: typeof candidate.taskId === 'string' ? candidate.taskId : undefined,
            expiresAt: typeof candidate.expiresAt === 'string' ? candidate.expiresAt : undefined,
            retentionPolicy: this.memoryRetentionPolicy(candidate.retentionPolicy),
            supersededBy: typeof candidate.supersededBy === 'string' ? candidate.supersededBy : undefined,
            supersedes: this.stringArray(candidate.supersedes),
            originMarkers: this.stringArray(candidate.originMarkers),
            status: candidate.status === 'candidate' ? 'candidate' : undefined,
            confidence: typeof candidate.confidence === 'number' ? candidate.confidence : undefined
        };
    }

    protected candidateArrayFromObject(value: unknown): unknown[] {
        if (!value || typeof value !== 'object') {
            return [];
        }
        const record = value as Record<string, unknown>;
        for (const key of ['memoryCandidates', 'candidates', 'memories']) {
            const candidate = record[key];
            if (Array.isArray(candidate)) {
                return candidate;
            }
        }
        return [value];
    }

    protected isMemoryCandidateRecord(value: Record<string, unknown>): boolean {
        return typeof value.id === 'string'
            && value.status === 'candidate'
            && typeof value.title === 'string'
            && typeof value.content === 'string';
    }

    protected memoryRetentionPolicy(value: unknown): MemoryItem['retentionPolicy'] | undefined {
        return value === 'session' || value === 'task' || value === 'ttl' || value === 'manual' || value === 'permanent' ? value : undefined;
    }

    protected stringArray(value: unknown): string[] | undefined {
        if (!Array.isArray(value)) {
            return undefined;
        }
        const items = value.filter((item): item is string => typeof item === 'string' && !!item.trim()).map(item => item.trim());
        return items.length ? [...new Set(items)] : undefined;
    }

    protected memoryType(value: unknown): MemoryItem['memoryType'] {
        const allowed: MemoryItem['memoryType'][] = [
            'user_preference',
            'project_decision',
            'project_convention',
            'file_location',
            'architecture_note',
            'bug_history',
            'command_note',
            'testing_note',
            'security_note',
            'generated_skill_note',
            'manual_note'
        ];
        return allowed.find(candidate => candidate === value) ?? 'manual_note';
    }

    protected memoryCandidateService(): MemoryCandidateRpc {
        return this.memoryService as unknown as MemoryCandidateRpc;
    }

    protected async resolveLearningModel(request: ChatRequestModel, settings: MemoryWorkspaceSettings): Promise<LanguageModel | undefined> {
        if (!this.languageModelRegistry) {
            return undefined;
        }
        if (settings.chatLearningModelId?.trim()) {
            return this.languageModelRegistry.getLanguageModel(settings.chatLearningModelId.trim());
        }
        if (!request.agentId) {
            return undefined;
        }
        return this.languageModelRegistry.selectLanguageModel({ agent: request.agentId, purpose: 'chat' });
    }

    protected handleLlmSuggestion(action: LlmSuggestionAction | undefined, query: string): unknown {
        switch (action) {
            case 'skill':
                return this.commandRegistry.executeCommand(MemoryCommands.OPEN_SKILLS_REVIEW.id);
            case 'memory':
                return this.commandRegistry.executeCommand(MemoryCommands.OPEN_PROJECT_MEMORY_GRAPH.id);
            case 'graph':
                return this.commandRegistry.executeCommand(MemoryCommands.OPEN_CODE_GRAPH.id);
            case 'context':
            default:
                return this.suggestForPrompt(query);
        }
    }

    protected async maybeIndexWorkspace(workspacePath: string, prompt: string, settings: MemoryWorkspaceSettings): Promise<void> {
        if (!settings.chatAutoIndexEnabled || !this.promptLooksContextual(prompt)) {
            return;
        }
        const snapshot = await this.memoryService.getWorkspaceSnapshot({ workspaceRoot: workspacePath });
        const stale = snapshot ? Date.now() - Date.parse(snapshot.scannedAt) > 5 * 60 * 1000 : true;
        if (stale) {
            await this.memoryService.indexWorkspace({ workspacePath });
        }
    }

    protected promptLooksContextual(prompt: string): boolean {
        return /\b(repo|repository|arquivo|file|classe|class|fun[cç][aã]o|function|contexto|context|teste|test|bug|erro|error|implemente|refator|mudar|change|graph|grafo)\b/i.test(prompt);
    }

    protected promptLooksGraphRelated(prompt: string): boolean {
        return /\b(grafo|graph|callers?|callees?|impacto|impact|depend[eê]ncia|dependency|tests?|testes?)\b/i.test(prompt);
    }

    protected promptSignature(prompt: string): string {
        return this.promptNormalizer.normalize({ prompt }).signature;
    }

    protected async getWorkspacePath(): Promise<string | undefined> {
        const roots = await this.workspaceService.roots;
        return roots[0] ? FileUri.fsPath(roots[0].resource.toString()) : undefined;
    }

    protected suggestionText(suggestion: ChatSuggestion): string {
        if (typeof suggestion === 'string') {
            return suggestion;
        }
        if ('value' in suggestion) {
            return suggestion.value;
        }
        const content = typeof suggestion.content === 'string' ? suggestion.content : suggestion.content.value;
        return content.includes(MEMORY_CHAT_SUGGESTION_KEY) ? MEMORY_CHAT_SUGGESTION_KEY : content;
    }

    protected isMemorySuggestion(suggestion: ChatSuggestion): boolean {
        const text = this.suggestionText(suggestion);
        return text === MEMORY_CHAT_SUGGESTION_KEY
            || text.includes(MEMORY_CHAT_SUGGESTION_KEY)
            || text.includes(MEMORY_CHAT_DYNAMIC_KEY);
    }

    protected async recordPromptSubmitted(prompt: string): Promise<void> {
        const roots = await this.workspaceService.roots;
        const root = roots[0];
        if (!root) {
            return;
        }
        const workspacePath = FileUri.fsPath(root.resource.toString());
        const settings = await this.memoryService.getSettings(workspacePath);
        await this.memoryService.recordEvent({
            workspacePath,
            eventType: 'prompt.submitted',
            payload: await this.promptSubmittedPayload(prompt, workspacePath, {
                source: 'ai-chat-suggestion',
                includeRedactedPromptSnippet: settings.optIn?.promptSnippets === true
            })
        });
    }

    protected async promptSubmittedPayload(
        prompt: string,
        workspacePath: string,
        options: {
            source: string;
            sessionId?: string;
            requestId?: string;
            agentId?: string;
            includeRedactedPromptSnippet?: boolean;
        }
    ): Promise<string> {
        const normalized = this.promptNormalizer.normalize({ prompt, workspaceRoot: workspacePath });
        return JSON.stringify({
            promptTextHash: await this.hashPromptText(prompt),
            promptSignature: normalized.signature,
            intent: normalized.intent,
            language: normalized.language,
            targetKind: normalized.targetKind,
            framework: normalized.framework,
            action: normalized.action,
            source: options.source,
            ...(options.includeRedactedPromptSnippet === true ? { redactedPromptSnippet: this.redactedPromptSnippet(prompt) } : {}),
            ...(options.sessionId ? { sessionId: options.sessionId } : {}),
            ...(options.requestId ? { requestId: options.requestId } : {}),
            metadata: {
                promptLength: prompt.length,
                redactionCount: normalized.redactionCount,
                ...(options.agentId ? { agentId: options.agentId } : {})
            }
        });
    }

    protected redactedPromptSnippet(prompt: string): string {
        return prompt
            .replace(/(?=[A-Za-z0-9_=-]{32,})(?=[A-Za-z0-9_=-]*[0-9=])[A-Za-z0-9_=-]{32,}/g, token => `${token.slice(0, 6)}********${token.slice(-4)}`)
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 240);
    }

    protected async hashPromptText(prompt: string): Promise<string> {
        const crypto = globalThis.crypto;
        if (crypto?.subtle) {
            const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(prompt));
            return `sha256:${Array.from(new Uint8Array(digest)).map(value => value.toString(16).padStart(2, '0')).join('')}`;
        }
        let hash = 2166136261;
        for (let index = 0; index < prompt.length; index++) {
            hash ^= prompt.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return `fnv1a:${(hash >>> 0).toString(16).padStart(8, '0')}`;
    }

    protected async recordApprovedContextInserted(pack: ApprovedContextPack, chatSessionId: string): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        await this.memoryService.recordEvent({
            workspacePath,
            eventType: 'context.inserted',
            payload: JSON.stringify({
                packId: pack.id,
                builtAt: pack.builtAt,
                chatSessionId,
                approvedItemIds: pack.approvedItemIds,
                approvedItems: pack.approvedItems.map(item => ({
                    id: item.id,
                    title: item.title,
                    sourceKind: item.sourceKind,
                    uri: item.uri,
                    estimatedTokens: item.estimatedTokens,
                    score: item.score
                })),
                estimatedTokens: pack.estimatedTokens,
                promptPresent: !!pack.prompt.trim()
            })
        });
    }

    get defaultIconClass(): string {
        return codicon('checklist');
    }
}

function getLearningResult(value: unknown): LlmChatLearningResult {
    if (!value || typeof value !== 'object') {
        return {};
    }
    const record = value as LlmChatLearningResult;
    return {
        suggestions: Array.isArray(record.suggestions) ? record.suggestions : undefined,
        skillCandidate: record.skillCandidate && typeof record.skillCandidate === 'object' ? record.skillCandidate : undefined,
        memoryCandidate: record.memoryCandidate && typeof record.memoryCandidate === 'object' ? record.memoryCandidate : undefined
    };
}
