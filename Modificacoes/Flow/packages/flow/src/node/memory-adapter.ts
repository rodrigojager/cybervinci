import URI from '@theia/core/lib/common/uri';
import { inject, injectable, optional } from '@theia/core/shared/inversify';
import {
    ContextPack,
    MemoryItem,
    MemoryService,
    RetrievalResult
} from '@cybervinci/memory/lib/common';
import { FlowContextPack, FlowContextSection, FlowRun, FlowWorkflow, FlowWorkload, FlowSizeLimits, MemoryCandidate, MemoryWrite, flowByteLength, truncateFlowText } from '../common';

export interface MemoryAdapterReport {
    provider: 'local' | 'external' | 'missing';
    available: boolean;
    detail?: string;
    missingService?: string;
}

export const MemoryAdapter = Symbol('MemoryAdapter');

export interface MemoryAdapter {
    report(): Promise<MemoryAdapterReport>;
    buildContextPack(workspaceRootUri: string | undefined, workflow: FlowWorkflow, workload?: FlowWorkload): Promise<FlowContextPack>;
    collectMemoryCandidates(run: FlowRun): Promise<MemoryCandidate[]>;
    writeApprovedMemory(memoryWrite: MemoryWrite, workspaceRootUri?: string): Promise<MemoryWrite>;
}

@injectable()
export class LocalMemoryAdapter implements MemoryAdapter {

    @inject(MemoryService)
    @optional()
    protected readonly memoryService?: MemoryService;

    async report(): Promise<MemoryAdapterReport> {
        const configuredProvider = configuredMemoryProvider();
        if (mockMemoryEnabled()) {
            return {
                provider: 'external',
                available: true,
                detail: 'Memory is provided by the Flow E2E mock adapter.'
            };
        }
        if (configuredProvider === 'missing') {
            return {
                provider: 'missing',
                available: false,
                missingService: 'Memory provider is explicitly disabled for Flow.'
            };
        }
        if (this.memoryService) {
            const provider = configuredProvider || memoryProviderKind(this.memoryService);
            return {
                provider,
                available: true,
                detail: provider === 'external'
                    ? 'Memory is provided by an external host adapter.'
                    : 'Memory is provided by the local CyberVinci service.'
            };
        }
        return {
            provider: 'missing',
            available: false,
            missingService: 'Memory service is not bound in Flow yet.'
        };
    }

    async buildContextPack(workspaceRootUri: string | undefined, workflow: FlowWorkflow, workload?: FlowWorkload): Promise<FlowContextPack> {
        const report = await this.report();
        const agentIds = collectRelevantAgentIds(workflow, workload);
        const referencedFiles = collectReferencedFiles(workflow, workload);
        const fallbackEnabled = explicitMemoryFallbackEnabled();
        if (mockMemoryEnabled()) {
            return limitContextPack({
                workspaceRootUri,
                summary: `Mock Memory context pack for workflow "${workflow.name}".`,
                workflow: {
                    id: workflow.id,
                    name: workflow.name,
                    stateCount: Object.keys(workflow.states).length,
                    transitionCount: workflow.transitions.length,
                    agentIds
                },
                files: referencedFiles.map(uri => ({ uri, reason: 'Referenced by workflow and exposed through the E2E mock adapter.' })),
                symbols: ['MockMemory.MemoryWrite'],
                signals: [{ key: 'memory.mock', value: true }],
                sections: [{
                    id: 'mock_memory',
                    title: 'Mock Memory',
                    items: [{
                        title: 'E2E memory write provider',
                        content: 'Approved Flow memory candidates are accepted by the mock Memory adapter.',
                        source: 'flow.e2e-mock'
                    }]
                }]
            });
        }
        if (this.memoryService && workspaceRootUri) {
            try {
                const workspacePath = workspacePathFromUri(workspaceRootUri);
                const prompt = contextPrompt(workflow, workload);
                const retrievalResults = await this.memoryService.search({
                    workspacePath,
                    text: prompt,
                    limit: workload ? 5 : 8,
                    sourceKinds: ['code', 'code-graph', 'project-memory', 'repository-memory', 'skill', 'local-docs']
                }) as RetrievalResult[];
                const contextPack = await this.memoryService.buildContextPack({
                    workspacePath,
                    prompt,
                    retrievalResults,
                    tokenBudget: workload ? 2500 : 6000
                });
                const dashboard = await this.safeDashboard(workspacePath);
                return this.toFlowContextPack(workspaceRootUri, workflow, agentIds, referencedFiles, retrievalResults, contextPack, dashboard, workload);
            } catch (error) {
                if (!fallbackEnabled) {
                    throw new Error(`Memory context failed and local fallback is not explicitly enabled: ${errorMessage(error)}`);
                }
                return this.buildFallbackContextPack(workspaceRootUri, workflow, workload, agentIds, referencedFiles, `Memory context failed: ${errorMessage(error)}`);
            }
        }
        if (!fallbackEnabled) {
            throw new Error(report.missingService || 'Memory provider is not available and local fallback is not explicitly enabled.');
        }
        return this.buildFallbackContextPack(workspaceRootUri, workflow, workload, agentIds, referencedFiles, report.missingService);
    }

    protected buildFallbackContextPack(
        workspaceRootUri: string | undefined,
        workflow: FlowWorkflow,
        workload: FlowWorkload | undefined,
        agentIds: string[],
        referencedFiles: string[],
        missingService: string | undefined
    ): FlowContextPack {
        return limitContextPack({
            workspaceRootUri,
            summary: [
                `Workflow "${workflow.name}" (${workflow.id}) has ${Object.keys(workflow.states).length} states`,
                `${workflow.transitions.length} transitions`,
                agentIds.length > 0 ? `${agentIds.length} agents` : 'no declared agents',
                workload ? `focused on workload "${workload.id}" for state "${workload.stateId}"` : undefined
            ].filter(Boolean).join(', ') + '.',
            workflow: {
                id: workflow.id,
                name: workflow.name,
                stateCount: Object.keys(workflow.states).length,
                transitionCount: workflow.transitions.length,
                agentIds
            },
            files: referencedFiles.map(uri => ({ uri, reason: 'Referenced by workflow input, output, or agent declaration.' })),
            symbols: [],
            signals: [],
            sections: [],
            missingService
        });
    }

    protected async safeDashboard(workspacePath: string): Promise<MemoryDashboardLike | undefined> {
        if (!this.memoryService?.getDashboard) {
            return undefined;
        }
        try {
            return await this.memoryService.getDashboard(workspacePath) as unknown as MemoryDashboardLike;
        } catch {
            return undefined;
        }
    }

    async collectMemoryCandidates(run: FlowRun): Promise<MemoryCandidate[]> {
        const candidates = new Map<string, MemoryCandidate>();
        for (const effect of run.effects) {
            if (effect.kind === 'memory_write') {
                candidates.set(`effect:${effect.id}`, {
                    id: `memory-candidate-${effect.id}`,
                    runId: run.id,
                    stateId: effect.stateId,
                    source: 'effect',
                    kind: 'summary',
                    content: effect.summary,
                    reason: 'A workflow step proposed a memory_write effect.',
                    confidence: 0.8,
                    status: 'candidate',
                    createdAt: timestamp()
                });
            }
        }
        for (const signal of run.signals) {
            if (signal.key.includes('memory') && typeof signal.value === 'string') {
                candidates.set(`signal:${signal.key}:${signal.stateId || ''}`, {
                    id: stableId('memory-candidate', run.id, signal.key, signal.stateId || 'run'),
                    runId: run.id,
                    stateId: signal.stateId,
                    source: 'signal',
                    kind: 'fact',
                    content: signal.value,
                    reason: `Signal "${signal.key}" was marked as memory-related.`,
                    confidence: 0.7,
                    status: 'candidate',
                    createdAt: signal.createdAt
                });
            }
        }
        for (const artifact of run.artifacts) {
            const summary = artifact.summary || '';
            if (!summary || !artifactLooksMemoryRelated(artifact.uri, summary)) {
                continue;
            }
            candidates.set(`artifact:${artifact.id}`, {
                id: stableId('memory-candidate', run.id, artifact.id),
                runId: run.id,
                stateId: artifact.stateId,
                source: 'artifact',
                kind: 'summary',
                content: summary,
                reason: `Artifact "${artifact.uri}" was marked as memory-related.`,
                confidence: 0.65,
                status: 'candidate',
                createdAt: artifact.createdAt
            });
        }
        return [...candidates.values()];
    }

    async writeApprovedMemory(memoryWrite: MemoryWrite, workspaceRootUri?: string): Promise<MemoryWrite> {
        const invalidApproval = validateExplicitMemoryApproval(memoryWrite);
        if (invalidApproval) {
            return {
                ...memoryWrite,
                status: 'failed',
                error: invalidApproval
            };
        }
        if (mockMemoryEnabled()) {
            return {
                ...memoryWrite,
                status: 'written'
            };
        }
        const report = await this.report();
        if (!report.available) {
            return {
                ...memoryWrite,
                status: 'failed',
                error: report.missingService
            };
        }
        if (!this.memoryService) {
            return {
                ...memoryWrite,
                status: 'failed',
                error: 'Memory service is not available.'
            };
        }
        if (!workspaceRootUri) {
            return {
                ...memoryWrite,
                status: 'failed',
                error: 'Workspace root is required to write Memory memory.'
            };
        }
        const workspacePath = workspacePathFromUri(workspaceRootUri);
        try {
            const scopeTarget = resolveMemoryScope(memoryWrite, workspacePath);
            await this.memoryService.addMemory({
                ...scopeTarget,
                memoryType: 'manual_note',
                title: memoryTitle(memoryWrite.content),
                content: memoryWrite.content,
                importance: 'medium',
                source: 'flow',
                evidence: `Flow memory write ${memoryWrite.id} from run ${memoryWrite.runId}.`
            });
        } catch (error) {
            return {
                ...memoryWrite,
                status: 'failed',
                error: errorMessage(error)
            };
        }
        return {
            ...memoryWrite,
            status: 'written'
        };
    }

    protected toFlowContextPack(
        workspaceRootUri: string,
        workflow: FlowWorkflow,
        agentIds: string[],
        referencedFiles: string[],
        retrievalResults: RetrievalResult[],
        contextPack: ContextPack,
        dashboard?: MemoryDashboardLike,
        workload?: FlowWorkload
    ): FlowContextPack {
        const focusedDashboard = workload ? focusDashboardForWorkload(dashboard, referencedFiles, retrievalResults) : dashboard;
        const sections = buildRealContextSections(contextPack, retrievalResults, focusedDashboard, Boolean(workload));
        return limitContextPack({
            workspaceRootUri,
            summary: sections.length > 0
                ? `Memory context pack with ${sections.length} sections, ${contextPack.sections.length} retrieval sections, and ${contextPack.estimatedTokens} estimated tokens.`
                : `Memory returned an empty context pack for workflow "${workflow.name}".`,
            workflow: {
                id: workflow.id,
                name: workflow.name,
                stateCount: Object.keys(workflow.states).length,
                transitionCount: workflow.transitions.length,
                agentIds
            },
            files: mergeContextFiles(
                referencedFiles.map(uri => ({ uri, reason: 'Referenced by workflow input, output, or agent declaration.' })),
                retrievalResults
                    .filter(result => !!result.uri)
                    .map(result => ({ uri: result.uri!, reason: `Memory ${result.sourceKind}: ${result.title}` })),
                (focusedDashboard?.files || [])
                    .slice(0, workload ? 6 : 12)
                    .map(file => ({ uri: contextFilePath(file), reason: contextFileReason(file) }))
            ),
            symbols: mergeStrings(
                contextPack.citations.map(citation => citation.title),
                (focusedDashboard?.symbols || []).slice(0, workload ? 8 : 24).map(symbol => symbol.fullName || symbol.name)
            ),
            signals: [
                ...contextPack.sections.map(section => ({
                    key: `memory.context.${section.id}`,
                    value: section.title
                })),
                ...buildContextSignals(focusedDashboard, retrievalResults)
            ],
            sections
        });
    }
}

function limitContextPack(pack: FlowContextPack): FlowContextPack {
    const limited: FlowContextPack = {
        ...pack,
        summary: truncateFlowText(pack.summary || '', FlowSizeLimits.contextPackBytes, 'context pack summary'),
        files: pack.files.map(file => ({
            ...file,
            reason: truncateFlowText(file.reason || '', 2048, 'context file reason')
        })),
        symbols: pack.symbols.map(symbol => truncateFlowText(symbol, 2048, 'context symbol')),
        sections: pack.sections?.map(section => ({
            ...section,
            items: section.items.map(item => ({
                ...item,
                content: truncateFlowText(item.content || '', 16 * 1024, 'context section item')
            }))
        }))
    };
    if (flowByteLength(JSON.stringify(limited)) <= FlowSizeLimits.contextPackBytes) {
        return limited;
    }
    return {
        ...limited,
        files: limited.files.slice(0, 20),
        symbols: limited.symbols.slice(0, 40),
        signals: limited.signals.slice(0, 40),
        sections: [{
            id: 'truncated',
            title: 'Truncated Context',
            items: [{
                title: 'Context pack limit',
                content: `Flow truncated this context pack to ${FlowSizeLimits.contextPackBytes} bytes.`,
                source: 'flow.size-limit'
            }]
        }]
    };
}

interface MemoryDashboardLike {
    files?: MemoryDashboardFileLike[];
    symbols?: Array<{ name: string; fullName?: string; languageId?: string }>;
    codeChunks?: Array<{ path?: string; symbolName?: string; summary?: string; content?: string }>;
    memories?: Array<{ title: string; content?: string; scope?: string; memoryType?: string; importance?: string; source?: string; evidence?: string; tags?: string[] }>;
    skills?: Array<{ name: string; description?: string; guidance?: string[]; tags?: string[] }>;
    settings?: { optIn?: Record<string, boolean | undefined>; enabled?: boolean; memoryEnabled?: boolean; graphEnabled?: boolean };
    graphs?: {
        preferences?: { nodes?: Array<{ label: string; detail?: string }> };
        projectMemories?: { nodes?: Array<{ label: string; detail?: string }> };
        code?: { nodes?: Array<{ label: string; detail?: string; relativePath?: string }> };
    };
}

type MemoryDashboardFileLike = { path?: string; relativePath?: string; language?: string; languageId?: string; tags?: string[]; lineCount?: number };
type MemoryDashboardMemoryLike = NonNullable<MemoryDashboardLike['memories']>[number];

function buildRealContextSections(
    contextPack: ContextPack,
    retrievalResults: RetrievalResult[],
    dashboard?: MemoryDashboardLike,
    focused = false
): FlowContextSection[] {
    const sections: FlowContextSection[] = [];
    const memoryLimit = focused ? 4 : 8;
    const fileLimit = focused ? 6 : 12;
    pushSection(sections, 'retrieval', 'Relevant Retrieval', [
        ...contextPack.sections.map(section => ({
            title: section.title,
            content: section.content,
            source: 'memory.context-pack'
        })),
        ...retrievalResults.slice(0, focused ? 5 : 8).map(result => ({
            title: result.title,
            content: result.snippet || result.evidence || '',
            uri: result.uri,
            source: result.sourceKind,
            score: result.score
        }))
    ]);
    const memories = dashboard?.memories || [];
    pushSection(sections, 'user_preferences', 'User Preferences', [
        ...memories.filter(memory => isPreference(memory)).slice(0, memoryLimit).map(memorySectionItem),
        ...(dashboard?.graphs?.preferences?.nodes || []).slice(0, memoryLimit).map(node => ({
            title: node.label,
            content: node.detail || node.label,
            source: 'memory.preferences-graph'
        }))
    ]);
    pushSection(sections, 'decisions', 'Previous Decisions', memories.filter(memory => isDecision(memory)).slice(0, memoryLimit).map(memorySectionItem));
    pushSection(sections, 'workspace_patterns', 'Workspace Patterns and Conventions', [
        ...(dashboard?.skills || []).slice(0, memoryLimit).map(skill => ({
            title: skill.name,
            content: [skill.description, ...(skill.guidance || [])].filter(Boolean).join('\n'),
            source: 'memory.skill'
        })),
        ...(dashboard?.graphs?.projectMemories?.nodes || []).slice(0, memoryLimit).map(node => ({
            title: node.label,
            content: node.detail || node.label,
            source: 'memory.project-memory-graph'
        }))
    ]);
    pushSection(sections, 'repository_stack', 'Repository Stack', repositoryStackItems(dashboard));
    pushSection(sections, 'relevant_files', 'Relevant Files', (dashboard?.files || []).slice(0, fileLimit).map(file => ({
        title: contextFilePath(file),
        content: [file.language || file.languageId, file.lineCount ? `${file.lineCount} lines` : undefined, ...(file.tags || [])].filter(Boolean).join(', '),
        uri: contextFilePath(file),
        source: 'memory.workspace-index'
    })));
    pushSection(sections, 'global_memories', 'Global Memories', memories.filter(memory => memory.scope === 'global' && !isPreference(memory) && !isDecision(memory)).slice(0, memoryLimit).map(memorySectionItem));
    return sections;
}

function pushSection(sections: FlowContextSection[], id: string, title: string, items: FlowContextSection['items']): void {
    const usefulItems = items.filter(item => item.title || item.content);
    if (usefulItems.length > 0) {
        sections.push({ id, title, items: usefulItems });
    }
}

function focusDashboardForWorkload(
    dashboard: MemoryDashboardLike | undefined,
    referencedFiles: string[],
    retrievalResults: RetrievalResult[]
): MemoryDashboardLike | undefined {
    if (!dashboard) {
        return undefined;
    }
    const relevantPaths = new Set([
        ...referencedFiles.map(normalizeContextPath),
        ...retrievalResults.map(result => result.uri).filter((uri): uri is string => Boolean(uri)).map(normalizeContextPath)
    ]);
    const files = (dashboard.files || []).filter(file => isRelevantContextPath(contextFilePath(file), relevantPaths));
    return {
        ...dashboard,
        files,
        symbols: (dashboard.symbols || []).slice(0, 8),
        codeChunks: (dashboard.codeChunks || []).filter(chunk => chunk.path && isRelevantContextPath(chunk.path, relevantPaths))
    };
}

function isRelevantContextPath(value: string, relevantPaths: Set<string>): boolean {
    const normalized = normalizeContextPath(value);
    if (!normalized) {
        return false;
    }
    for (const candidate of relevantPaths) {
        if (normalized === candidate || normalized.endsWith(`/${candidate}`) || candidate.endsWith(`/${normalized}`)) {
            return true;
        }
    }
    return false;
}

function normalizeContextPath(value: string | undefined): string {
    return (value || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/').replace(/^\/+/, '').toLowerCase();
}

function collectReferencedFiles(workflow: FlowWorkflow, workload?: FlowWorkload): string[] {
    const files = new Set<string>();
    if (!workload) {
        for (const agentPath of Object.values(workflow.agents || {})) {
            files.add(agentPath);
        }
        for (const state of Object.values(workflow.states)) {
            for (const input of state.input?.include || []) {
                files.add(input);
            }
            for (const output of state.outputs || []) {
                files.add(output);
            }
        }
        return [...files].sort();
    }
    if (workload.agent && workflow.agents?.[workload.agent]) {
        files.add(workflow.agents[workload.agent]);
    }
    const state = findWorkflowState(workflow, workload.stateId);
    if (state?.agent && workflow.agents?.[state.agent]) {
        files.add(workflow.agents[state.agent]);
    }
    if (state) {
        for (const input of state.input?.include || []) {
            files.add(input);
        }
        for (const output of state.outputs || []) {
            files.add(output);
        }
    }
    for (const artifact of workload?.inputArtifacts || []) {
        files.add(artifact);
    }
    for (const artifact of workload?.outputArtifacts || []) {
        files.add(artifact);
    }
    return [...files].sort();
}

function collectRelevantAgentIds(workflow: FlowWorkflow, workload?: FlowWorkload): string[] {
    if (!workload) {
        return Object.keys(workflow.agents || {});
    }
    const ids = new Set<string>();
    if (workload.agent) {
        ids.add(workload.agent);
    }
    const state = findWorkflowState(workflow, workload.stateId);
    if (state?.agent) {
        ids.add(state.agent);
    }
    return [...ids].filter(id => Boolean(workflow.agents?.[id] || id)).sort();
}

function findWorkflowState(workflow: FlowWorkflow, stateId: string): FlowWorkflow['states'][string] | undefined {
    if (workflow.states[stateId]) {
        return workflow.states[stateId];
    }
    for (const state of Object.values(workflow.states)) {
        if (state.branches?.[stateId]) {
            return state.branches[stateId];
        }
    }
    return undefined;
}

function stableId(prefix: string, ...parts: string[]): string {
    return `${prefix}-${parts.join('-').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

function timestamp(): string {
    return new Date().toISOString();
}

function workspacePathFromUri(workspaceRootUri: string): string {
    if (!workspaceRootUri.includes('://')) {
        return workspaceRootUri;
    }
    return new URI(workspaceRootUri).path.fsPath();
}

function contextPrompt(workflow: FlowWorkflow, workload?: FlowWorkload): string {
    return [
        `Flow workflow ${workflow.name} (${workflow.id})`,
        workload ? `workload ${workload.id} state ${workload.stateId}` : undefined,
        ...collectReferencedFiles(workflow, workload)
    ].filter(Boolean).join('\n');
}

function mergeContextFiles(...groups: FlowContextPack['files'][]): FlowContextPack['files'] {
    const byUri = new Map<string, FlowContextPack['files'][number]>();
    for (const file of groups.flat()) {
        if (!byUri.has(file.uri)) {
            byUri.set(file.uri, file);
        }
    }
    return [...byUri.values()].sort((left, right) => left.uri.localeCompare(right.uri));
}

function mergeStrings(...groups: string[][]): string[] {
    return [...new Set(groups.flat().filter(Boolean))].sort();
}

function buildContextSignals(dashboard: MemoryDashboardLike | undefined, retrievalResults: RetrievalResult[]): FlowContextPack['signals'] {
    if (!dashboard) {
        return [];
    }
    const sourceKinds = [...new Set(retrievalResults.map(result => result.sourceKind))].sort();
    return [
        { key: 'memory.context.files', value: dashboard.files?.length || 0 },
        { key: 'memory.context.symbols', value: dashboard.symbols?.length || 0 },
        { key: 'memory.context.memories', value: dashboard.memories?.length || 0 },
        { key: 'memory.context.skills', value: dashboard.skills?.length || 0 },
        { key: 'memory.context.retrieval_sources', value: sourceKinds.join(',') || 'none' },
        { key: 'memory.context.memory_enabled', value: dashboard.settings?.memoryEnabled !== false }
    ];
}

function repositoryStackItems(dashboard: MemoryDashboardLike | undefined): FlowContextSection['items'] {
    const languageCounts = new Map<string, number>();
    const toolTags = new Set<string>();
    for (const file of dashboard?.files || []) {
        const language = file.language || file.languageId;
        if (language) {
            languageCounts.set(language, (languageCounts.get(language) || 0) + 1);
        }
        for (const tag of file.tags || []) {
            if (isToolingTag(tag)) {
                toolTags.add(tag);
            }
        }
    }
    const items: FlowContextSection['items'] = [...languageCounts.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 8)
        .map(([language, count]) => ({
            title: language,
            content: `${count} indexed files`,
            source: 'memory.workspace-index'
        }));
    if (toolTags.size > 0) {
        items.push({
            title: 'Detected tools',
            content: [...toolTags].sort().join(', '),
            source: 'memory.workspace-index'
        });
    }
    return items;
}

function contextFilePath(file: MemoryDashboardFileLike): string {
    return file.path || file.relativePath || 'workspace file';
}

function contextFileReason(file: MemoryDashboardFileLike): string {
    return ['Memory indexed file', file.language || file.languageId, ...(file.tags || [])].filter(Boolean).join(': ');
}

function memorySectionItem(memory: MemoryDashboardMemoryLike): FlowContextSection['items'][number] {
    return {
        title: memory.title,
        content: memory.content || memory.evidence || memory.title,
        source: `memory.${memory.scope || 'memory'}-${memory.memoryType || 'memory'}`
    };
}

function isPreference(memory: MemoryDashboardMemoryLike): boolean {
    return includesAny([memory.memoryType, memory.title, memory.content, ...(memory.tags || [])], ['preference', 'preferencia', 'convention', 'style']);
}

function isDecision(memory: MemoryDashboardMemoryLike): boolean {
    return includesAny([memory.memoryType, memory.title, memory.content, ...(memory.tags || [])], ['decision', 'decisao', 'adr']);
}

function includesAny(values: Array<string | undefined>, needles: string[]): boolean {
    return values.some(value => {
        const normalized = value?.toLowerCase() || '';
        return needles.some(needle => normalized.includes(needle));
    });
}

function artifactLooksMemoryRelated(uri: string, summary: string): boolean {
    return includesAny([uri, summary], ['memory', 'memoria', 'remember', 'remembered']);
}

function isToolingTag(tag: string): boolean {
    return /^(npm|yarn|pnpm|go|typescript|javascript|react|theia|webpack|vite|mocha|jest|eslint|prettier|docker|python|rust|dotnet)$/i.test(tag);
}

function memoryTitle(content: string): string {
    const firstLine = content.split(/\r?\n/).find(line => line.trim())?.trim() || 'Flow memory';
    return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
}

function validateExplicitMemoryApproval(memoryWrite: MemoryWrite): string | undefined {
    if (memoryWrite.status !== 'approved') {
        return 'Memory writes must be explicitly approved before they can be persisted.';
    }
    if (!memoryWrite.candidateId || !memoryWrite.candidateId.trim()) {
        return 'Memory writes must reference an approved memory candidate.';
    }
    if (!memoryWrite.approvedAt || !memoryWrite.approvedAt.trim()) {
        return 'Memory writes require an explicit approval timestamp.';
    }
    if (!memoryWrite.content || !memoryWrite.content.trim()) {
        return 'Memory writes require non-empty approved content.';
    }
    return undefined;
}

function resolveMemoryScope(
    memoryWrite: MemoryWrite,
    workspacePath: string
): Pick<MemoryItem, 'scope'> & Partial<Pick<MemoryItem, 'workspacePath' | 'repositoryId' | 'taskId' | 'retentionPolicy'>> {
    const flowScope = memoryWrite.scope || normalizeLegacyFlowMemoryTarget(memoryWrite.target) || 'workspace';
    switch (flowScope) {
        case 'ide':
            return { scope: 'global' };
        case 'workspace':
            return { scope: 'workspace', workspacePath };
        case 'project':
            return { scope: 'repository', workspacePath, repositoryId: stableProjectRepositoryId(workspacePath) };
        case 'workflow':
            return {
                scope: 'task',
                workspacePath,
                taskId: scopedTaskId('workflow', memoryWrite.target || memoryWrite.runId),
                retentionPolicy: 'permanent'
            };
        case 'run':
            return {
                scope: 'task',
                workspacePath,
                taskId: scopedTaskId('run', memoryWrite.target || memoryWrite.runId),
                retentionPolicy: 'manual'
            };
        case 'agent':
            return {
                scope: 'task',
                workspacePath,
                taskId: scopedTaskId('agent', memoryWrite.target || memoryWrite.candidateId),
                retentionPolicy: 'permanent'
            };
    }
}

function normalizeLegacyFlowMemoryTarget(target: string | undefined): MemoryWrite['scope'] | undefined {
    const normalized = target?.trim().toLowerCase();
    if (
        normalized === 'ide'
        || normalized === 'workspace'
        || normalized === 'project'
        || normalized === 'workflow'
        || normalized === 'run'
        || normalized === 'agent'
    ) {
        return normalized;
    }
    return undefined;
}

function stableProjectRepositoryId(workspacePath: string): string {
    return stableId('flow-project', normalizeContextPath(workspacePath) || 'workspace');
}

function scopedTaskId(scope: 'workflow' | 'run' | 'agent', value: string): string {
    return stableId(`flow-${scope}`, value || scope);
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function configuredMemoryProvider(): MemoryAdapterReport['provider'] | undefined {
    const configured = process.env.FLOW_MEMORY_PROVIDER?.trim().toLowerCase();
    if (!configured || configured === 'auto') {
        return undefined;
    }
    if (configured === 'local' || configured === 'external' || configured === 'missing') {
        return configured;
    }
    if (configured === 'none' || configured === 'off' || configured === 'disabled') {
        return 'missing';
    }
    return undefined;
}

function mockMemoryEnabled(): boolean {
    const configured = process.env.FLOW_MEMORY_PROVIDER?.trim().toLowerCase();
    return configured === 'mock' || configured === 'e2e-mock';
}

function explicitMemoryFallbackEnabled(): boolean {
    const configuredProvider = process.env.FLOW_MEMORY_PROVIDER?.trim().toLowerCase();
    if (configuredProvider === 'fallback' || configuredProvider === 'local-fallback' || configuredProvider === 'deterministic-fallback') {
        return true;
    }
    const configuredFallback = process.env.FLOW_MEMORY_FALLBACK?.trim().toLowerCase();
    return configuredFallback === '1' || configuredFallback === 'true' || configuredFallback === 'on' || configuredFallback === 'enabled';
}

function memoryProviderKind(service: MemoryService): Exclude<MemoryAdapterReport['provider'], 'missing'> {
    const metadata = service as MemoryService & {
        provider?: unknown;
        providerKind?: unknown;
        memoryProvider?: unknown;
    };
    const provider = normalizeProviderKind(metadata.memoryProvider)
        || normalizeProviderKind(metadata.providerKind)
        || normalizeProviderKind(metadata.provider);
    return provider || 'local';
}

function normalizeProviderKind(value: unknown): Exclude<MemoryAdapterReport['provider'], 'missing'> | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }
    const normalized = value.trim().toLowerCase();
    return normalized === 'external' ? 'external' : normalized === 'local' ? 'local' : undefined;
}
