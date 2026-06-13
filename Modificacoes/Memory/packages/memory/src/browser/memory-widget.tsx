import { CommandService, MessageService } from '@theia/core';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { ConfirmDialog, OpenerService, codicon, Message, ReactWidget, open } from '@theia/core/lib/browser';
import { nls } from '@theia/core/lib/common';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import {
    MemoryBenchmarkReport,
    MemoryAnalysisCitation,
    MemoryDashboard,
    MemoryEvent,
    MemoryFile,
    MemoryGraph,
    MemoryGraphEdge,
    MemoryGraphNode,
    MemoryItem,
    MemoryRetentionPolicy,
    MemorySpace,
    MemoryRelation,
    MemoryPullRequestRecommendedContext,
    MemoryService,
    MemoryServiceHelper,
    MemorySkillCandidate,
    MemorySkillSuggestionSource,
    MemorySourceKind,
    MemorySymbol,
    MemoryUpdateMemoryRequest,
    MemoryWorkspaceSettings
} from '../common';

export type MemoryTab =
    | 'overview'
    | 'code-graph'
    | 'documents-graph'
    | 'knowledge-graph'
    | 'benchmarks'
    | 'memory-health'
    | 'memory-candidates'
    | 'project-memories'
    | 'repository-memories'
    | 'session-memories'
    | 'task-memories'
    | 'preferences'
    | 'skills'
    | 'events'
    | 'feedback'
    | 'settings'
    | 'impact';

type GraphBooleanFilter =
    | 'endpoints'
    | 'services'
    | 'repositories'
    | 'tests'
    | 'memories'
    | 'docs'
    | 'hubs'
    | 'bridges'
    | 'calls'
    | 'types'
    | 'dependencyInjection'
    | 'dataModel'
    | 'riskOnly';

interface MemoryGraphFilters {
    endpoints: boolean;
    services: boolean;
    repositories: boolean;
    tests: boolean;
    memories: boolean;
    docs: boolean;
    hubs: boolean;
    bridges: boolean;
    calls: boolean;
    types: boolean;
    dependencyInjection: boolean;
    dataModel: boolean;
    riskOnly: boolean;
    depth: number;
}

interface MemoryWidgetState {
    activeTab: MemoryTab;
    dashboard?: MemoryDashboard;
    knowledgeGraph?: MemoryGraph;
    knowledgeError?: string;
    busy: boolean;
    graphFilters: MemoryGraphFilters;
    selectedNodeId?: string;
    skillStatusFilter: 'pending' | 'all' | MemorySkillCandidate['status'];
    eventTypeFilter: 'all' | MemoryEvent['eventType'];
    eventPathFilter: string;
    feedbackSearchQuery: string;
    feedbackRecords?: MemoryFeedbackRecord[];
    feedbackBusy: boolean;
    feedbackError?: string;
    benchmarkReport?: MemoryBenchmarkReport;
    benchmarkBusy: boolean;
    benchmarkError?: string;
    vectorSearchStatus?: MemoryVectorSearchStatus;
    vectorSearchBusy: boolean;
    vectorSearchMessage?: string;
}

interface ResolvedNodeTarget {
    relativePath: string;
    line?: number;
}

interface GraphView {
    nodes: MemoryGraphNode[];
    edges: MemoryGraphEdge[];
}

interface NodeRelationFact {
    id: string;
    relationType: MemoryRelation['relationType'];
    confidenceScore: number;
}

interface MemoryFeedbackRecord {
    id?: string;
    workspacePath?: string;
    kind?: string;
    targetId?: string;
    targetTitle?: string;
    sourceKind?: MemorySourceKind;
    outcome?: string;
    reason?: string;
    correction?: string;
    payload?: string;
    createdAt?: string;
    updatedAt?: string;
    resolvedAt?: string;
}

interface MemoryFeedbackSearchRequest {
    workspacePath: string;
    query?: string;
    limit?: number;
}

interface MemoryFeedbackSearchResult {
    records?: MemoryFeedbackRecord[];
    feedback?: MemoryFeedbackRecord[];
    items?: MemoryFeedbackRecord[];
}

interface OptionalMemoryFeedbackApi {
    searchFeedback?: (request: MemoryFeedbackSearchRequest) => Promise<MemoryFeedbackRecord[] | MemoryFeedbackSearchResult>;
    listFeedback?: (request: MemoryFeedbackSearchRequest) => Promise<MemoryFeedbackRecord[] | MemoryFeedbackSearchResult>;
    resolveFeedback?: (request: { workspacePath: string; id: string }) => Promise<MemoryFeedbackRecord | undefined>;
}

type MemoryKnowledgeExportFormat = 'json' | 'markdown' | 'dot';

interface MemoryKnowledgeGraphRequest {
    workspacePath: string;
    limit?: number;
}

interface MemoryKnowledgeExportRequest extends MemoryKnowledgeGraphRequest {
    format: MemoryKnowledgeExportFormat;
}

interface MemoryKnowledgeGraphResponse {
    title?: string;
    graph?: MemoryGraph;
    nodes?: MemoryGraphNode[];
    edges?: MemoryGraphEdge[];
}

interface MemoryKnowledgeExportResponse {
    content?: string;
    text?: string;
    data?: string;
    fileName?: string;
    mimeType?: string;
}

interface OptionalMemoryKnowledgeApi {
    getKnowledgeGraph?: (request: MemoryKnowledgeGraphRequest) => Promise<MemoryGraph | MemoryKnowledgeGraphResponse>;
    exportKnowledgeGraph?: (request: MemoryKnowledgeExportRequest) => Promise<string | MemoryKnowledgeExportResponse>;
}

interface MemoryVectorSearchStatus {
    enabled?: boolean;
    available?: boolean;
    status?: string;
    modelLabel?: string;
    modelId?: string;
    localOnly?: boolean;
    indexedItems?: number;
    totalItems?: number;
    updatedAt?: string;
    message?: string;
}

type MemoryCapabilityStatus = 'disabled' | 'enabled' | 'requires-consent' | 'fallback' | 'unavailable';

interface MemoryCapabilityStatusItem {
    label: string;
    status: MemoryCapabilityStatus;
    detail?: string;
}

interface MemoryVectorSearchBackfillRequest {
    workspacePath: string;
    force?: boolean;
}

interface MemoryVectorSearchBackfillResult extends MemoryVectorSearchStatus {
    started?: boolean;
    queued?: boolean;
}

interface OptionalMemoryVectorApi {
    getVectorStatus?: (workspacePath: string) => Promise<MemoryVectorSearchStatus>;
    updateVectorSettings?: (request: { workspacePath: string; enabled?: boolean; consent?: boolean }) => Promise<MemoryVectorSearchStatus>;
    backfillMemoryVectors?: (workspacePath: string) => Promise<MemoryVectorSearchBackfillResult | void>;
    getVectorSearchStatus?: (request: MemoryVectorSearchBackfillRequest | string) => Promise<MemoryVectorSearchStatus>;
    getVectorIndexStatus?: (request: MemoryVectorSearchBackfillRequest | string) => Promise<MemoryVectorSearchStatus>;
    backfillVectorSearch?: (request: MemoryVectorSearchBackfillRequest) => Promise<MemoryVectorSearchBackfillResult | void>;
    rebuildVectorSearch?: (request: MemoryVectorSearchBackfillRequest) => Promise<MemoryVectorSearchBackfillResult | void>;
    rebuildVectorIndex?: (request: MemoryVectorSearchBackfillRequest) => Promise<MemoryVectorSearchBackfillResult | void>;
}

type MemoryImportance = 'low' | 'medium' | 'high' | 'critical';
type MemoryPanelScope = 'global' | 'workspace' | 'repository' | 'session' | 'task';

interface MemoryLifecycleSignals {
    importance?: MemoryImportance | string;
    weight?: number;
    accessCount?: number;
    lastAccessedAt?: string;
    lastAccessAt?: string;
    accessedAt?: string;
}

type LifecycleMemoryItem = MemoryItem & MemoryLifecycleSignals;

type LifecycleMemoryPatch = MemoryUpdateMemoryRequest['patch'] & Partial<MemoryLifecycleSignals>;

const DEFAULT_GRAPH_FILTERS: MemoryGraphFilters = {
    endpoints: true,
    services: true,
    repositories: true,
    tests: true,
    memories: true,
    docs: true,
    hubs: true,
    bridges: true,
    calls: true,
    types: true,
    dependencyInjection: true,
    dataModel: true,
    riskOnly: false,
    depth: 3
};

const TABS: Array<{ id: MemoryTab; label: string; icon: string }> = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'impact', label: 'Impact', icon: 'git-compare' },
    { id: 'code-graph', label: 'Code', icon: 'type-hierarchy' },
    { id: 'documents-graph', label: 'Docs', icon: 'references' },
    { id: 'knowledge-graph', label: 'Knowledge', icon: 'symbol-namespace' },
    { id: 'benchmarks', label: 'Benchmarks', icon: 'beaker' },
    { id: 'memory-health', label: 'Memory Health', icon: 'pulse' },
    { id: 'memory-candidates', label: 'Candidates', icon: 'preview' },
    { id: 'project-memories', label: 'Project Memories', icon: 'database' },
    { id: 'repository-memories', label: 'Repository Memories', icon: 'repo' },
    { id: 'session-memories', label: 'Session Memory', icon: 'clock' },
    { id: 'task-memories', label: 'Task Memory', icon: 'checklist' },
    { id: 'preferences', label: 'IDE Memories', icon: 'settings-gear' },
    { id: 'skills', label: 'Skills', icon: 'sparkle' },
    { id: 'events', label: 'Events', icon: 'history' },
    { id: 'feedback', label: 'Feedback', icon: 'comment-discussion' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
];

@injectable()
export class MemoryWidget extends ReactWidget {

    static readonly ID = 'memory-widget';
    static readonly LABEL = nls.localize('theia/memory/widgetLabel', 'Memory');
    protected static readonly ADD_CONTEXT_VARIABLE_COMMAND = 'add-context-variable';

    @inject(MemoryService)
    protected readonly memoryService: MemoryService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    @inject(CommandService)
    protected readonly commandService: CommandService;

    protected state: MemoryWidgetState = {
        activeTab: 'overview',
        busy: false,
        graphFilters: DEFAULT_GRAPH_FILTERS,
        skillStatusFilter: 'pending',
        eventTypeFilter: 'all',
        eventPathFilter: '',
        feedbackSearchQuery: '',
        feedbackBusy: false,
        benchmarkBusy: false,
        vectorSearchBusy: false
    };

    @postConstruct()
    protected init(): void {
        this.id = MemoryWidget.ID;
        this.title.label = MemoryWidget.LABEL;
        this.title.caption = MemoryWidget.LABEL;
        this.title.iconClass = codicon('graph');
        this.title.closable = true;
        this.update();
        this.refresh();
    }

    protected override onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        this.node.focus();
    }

    async refresh(tab?: MemoryTab): Promise<void> {
        this.setState({
            activeTab: tab ?? this.state.activeTab,
            busy: true
        });
        try {
            const workspacePath = await this.getWorkspacePath();
            if (!workspacePath) {
                this.setState({ dashboard: undefined, busy: false });
                return;
            }
            const activeTab = tab ?? this.state.activeTab;
            const dashboard = await this.memoryService.getDashboard(workspacePath);
            const knowledge = await this.loadKnowledgeGraph(workspacePath, dashboard);
            const vectorSearchStatus = activeTab === 'settings'
                ? await this.loadVectorSearchStatus(workspacePath)
                : this.state.vectorSearchStatus;
            this.setState({
                dashboard,
                knowledgeGraph: knowledge.graph,
                knowledgeError: knowledge.error,
                vectorSearchStatus,
                vectorSearchMessage: vectorSearchStatus?.message,
                busy: false
            });
            if (activeTab === 'feedback') {
                await this.refreshFeedback();
            }
        } catch (error) {
            this.setState({ busy: false });
            this.messageService.error(error instanceof Error ? error.message : String(error));
        }
    }

    protected setState(partial: Partial<MemoryWidgetState>): void {
        this.state = { ...this.state, ...partial };
        this.update();
    }

    protected render(): React.ReactNode {
        const dashboard = this.state.dashboard;
        return <div className='memory'>
            <div className='memory-header'>
                <div>
                    <h2>{MemoryWidget.LABEL}</h2>
                    <span>{dashboard?.settings.workspacePath ?? nls.localize('theia/memory/noWorkspaceShort', 'No workspace')}</span>
                </div>
                <div className='memory-header-actions'>
                    <button className='theia-button secondary' title='Refresh' disabled={this.state.busy} onClick={() => this.refresh()}>
                        <i className={codicon('refresh')} />
                    </button>
                    <button
                        className='theia-button main'
                        disabled={this.state.busy || !dashboard || !this.canIndexWorkspace(dashboard.settings)}
                        title={!dashboard || this.canIndexWorkspace(dashboard.settings) ? undefined : nls.localize('theia/memory/indexRequiresConsent', 'Enable Memory in Settings before indexing this workspace.')}
                        onClick={() => this.indexWorkspace()}>
                        <i className={codicon('sync')} />
                        {nls.localize('theia/memory/index', 'Index')}
                    </button>
                </div>
            </div>
            <div className='memory-tabs'>
                {TABS.map(tab => <button
                    key={tab.id}
                    className={this.state.activeTab === tab.id ? 'active' : ''}
                    title={tab.label}
                    onClick={() => this.switchTab(tab.id)}>
                    <i className={codicon(tab.icon)} />
                    <span>{tab.label}</span>
                </button>)}
            </div>
            {dashboard && this.state.activeTab !== 'settings' && this.renderInitialConsentBanner(dashboard.settings)}
            {!dashboard ? this.renderEmpty() : this.renderActiveTab(dashboard)}
        </div>;
    }

    protected renderEmpty(): React.ReactNode {
        return <div className='memory-empty'>
            <i className={codicon('workspace-unknown')} />
            <span>{nls.localize('theia/memory/openWorkspace', 'Open a workspace to use Memory.')}</span>
        </div>;
    }

    protected renderActiveTab(dashboard: MemoryDashboard): React.ReactNode {
        switch (this.state.activeTab) {
            case 'impact':
                return this.renderImpact(dashboard);
            case 'code-graph':
                return this.renderGraph(dashboard.graphs.code, dashboard);
            case 'documents-graph':
                return this.renderGraph(dashboard.graphs.documents, dashboard);
            case 'knowledge-graph':
                return this.renderKnowledgeGraph(dashboard);
            case 'benchmarks':
                return this.renderBenchmarks(dashboard);
            case 'memory-health':
                return this.renderMemoryHealth(dashboard);
            case 'memory-candidates':
                return this.renderMemoryCandidates(dashboard);
            case 'project-memories':
                return this.renderMemories(dashboard, 'workspace');
            case 'repository-memories':
                return this.renderMemories(dashboard, 'repository');
            case 'session-memories':
                return this.renderMemories(dashboard, 'session');
            case 'task-memories':
                return this.renderMemories(dashboard, 'task');
            case 'preferences':
                return <div>
                    {this.renderGraph(dashboard.graphs.preferences, dashboard)}
                    {this.renderMemories(dashboard, 'global')}
                </div>;
            case 'skills':
                return this.renderSkills(dashboard);
            case 'events':
                return this.renderEvents(dashboard);
            case 'feedback':
                return this.renderFeedback(dashboard);
            case 'settings':
                return this.renderSettings(dashboard);
            case 'overview':
            default:
                return this.renderOverview(dashboard);
        }
    }

    protected renderOverview(dashboard: MemoryDashboard): React.ReactNode {
        const riskFiles = dashboard.files.filter(file => file.isSensitive || file.isGenerated || file.isIgnored).length;
        const memoryCandidates = dashboard.memories.filter(memory => memory.status === 'candidate').length;
        return <div className='memory-overview'>
            <div className='memory-metrics'>
                {this.renderMetric('Files', dashboard.files.length, 'files')}
                {this.renderMetric('Symbols', dashboard.symbols.length, 'symbol-method')}
                {this.renderMetric('Relations', dashboard.relations.length, 'git-compare')}
                {this.renderMetric('Memories', dashboard.memories.length, 'database')}
                {this.renderMetric('Candidates', memoryCandidates, 'preview')}
                {this.renderMetric('Skills', dashboard.skillCandidates.length, 'sparkle')}
                {this.renderMetric('Risk Flags', riskFiles, 'warning')}
            </div>
            {this.renderPortablePackage(dashboard)}
            {this.renderCSharpAnalysisStatus(dashboard)}
            <section>
                <h3>{nls.localize('theia/memory/suggestedContributorQuestions', 'Suggested Contributor Questions')}</h3>
                <div className='memory-results'>
                    {dashboard.suggestedQuestions.length ? dashboard.suggestedQuestions.map(question => <article key={question.id}>
                        <div>
                            <strong>{question.question}</strong>
                            <span>{question.source} - {question.scope} - priority {question.priority}</span>
                        </div>
                        <p>{question.reason}</p>
                        <footer>{question.evidence}{question.uri ? ` - ${question.uri}` : ''}</footer>
                    </article>) : <p>{nls.localize('theia/memory/noSuggestedContributorQuestions', 'No suggested questions yet.')}</p>}
                </div>
            </section>
            <section>
                <h3>{nls.localize('theia/memory/retrievalSources', 'Retrieval Sources')}</h3>
                <div className='memory-results'>
                    {dashboard.retrievalResults.length ? dashboard.retrievalResults.map(result => <article key={result.id}>
                        <div>
                            <strong>{result.title}</strong>
                            <span>{this.sourceLabel(result.sourceKind)} - {result.evidence}</span>
                        </div>
                        <p>{result.snippet}</p>
                    </article>) : <p>{nls.localize('theia/memory/noRetrieval', 'No indexed retrieval results yet.')}</p>}
                </div>
            </section>
            <section>
                <h3>{nls.localize('theia/memory/ignoredFiles', 'Ignored Files')}</h3>
                <div className='memory-results'>
                    {dashboard.files.filter(file => file.isIgnored || file.ignoreReason).slice(0, 20).map(file => <article key={file.id}>
                        <div>
                            <strong>{file.relativePath}</strong>
                            <span>{this.fileRiskLabel(file)}</span>
                        </div>
                        <p>{file.ignoreReason?.detail ?? nls.localize('theia/memory/noIgnoreReason', 'No ignore reason recorded.')}</p>
                    </article>)}
                    {!dashboard.files.some(file => file.isIgnored || file.ignoreReason) && <p>{nls.localize('theia/memory/noIgnoredFiles', 'No ignored files recorded for this workspace.')}</p>}
                </div>
            </section>
            <section>
                <h3>{nls.localize('theia/memory/recentEvents', 'Recent Events')}</h3>
                <div className='memory-events'>
                    {dashboard.events.length ? dashboard.events.map(event => <div key={event.id}>
                        <span>{event.eventType}{event.relativePath ? ` - ${event.relativePath}` : ''}</span>
                        <small>{new Date(event.createdAt).toLocaleString()}</small>
                    </div>) : <p>{nls.localize('theia/memory/noEvents', 'Events will appear after indexing and context actions.')}</p>}
                </div>
            </section>
        </div>;
    }

    protected renderCSharpAnalysisStatus(dashboard: MemoryDashboard): React.ReactNode {
        const status = dashboard.csharpAnalysisStatus ?? {
            mode: 'unavailable' as const,
            label: 'C#: unavailable',
            detail: 'C# analysis status is not available from this Memory backend.',
            fileCount: dashboard.files.filter(file => file.languageId === 'csharp' || file.relativePath.toLowerCase().endsWith('.cs')).length,
            symbolCount: 0
        };
        return <section>
            <h3>{nls.localize('theia/memory/csharpAnalysisStatus', 'C# Analysis')}</h3>
            <div className='memory-results'>
                <article className={`memory-csharp-status memory-csharp-status--${status.mode}`}>
                    <div>
                        <strong>{status.label}</strong>
                        <span>{status.fileCount} files - {status.symbolCount} symbols{status.analyzerId ? ` - ${status.analyzerId}` : ''}</span>
                    </div>
                    <p>{status.detail}</p>
                    {status.updatedAt && <footer>{nls.localize('theia/memory/csharpAnalysisUpdated', 'Updated {0}', new Date(status.updatedAt).toLocaleString())}</footer>}
                </article>
            </div>
        </section>;
    }

    protected renderMetric(label: string, value: number, icon: string): React.ReactNode {
        return <div className='memory-metric'>
            <i className={codicon(icon)} />
            <div>
                <strong>{value}</strong>
                <span>{label}</span>
            </div>
        </div>;
    }

    protected renderBenchmarks(dashboard: MemoryDashboard): React.ReactNode {
        const report = this.state.benchmarkReport ?? dashboard.benchmarkReport;
        const history = [
            ...(this.state.benchmarkReport ? [this.state.benchmarkReport] : []),
            ...(dashboard.benchmarkReports ?? [])
        ].filter((item, index, items) => items.findIndex(candidate => candidate.generatedAt === item.generatedAt) === index).slice(0, 10);
        return <div className='memory-benchmarks'>
            <section>
                <div className='memory-section-title'>
                    <h3>{nls.localize('theia/memory/benchmarks', 'Benchmarks')}</h3>
                    <span>{report ? new Date(report.generatedAt).toLocaleString() : nls.localize('theia/memory/noBenchmarkReport', 'No report yet')}</span>
                </div>
                <div className='memory-actions'>
                    <button className='theia-button main' disabled={this.state.benchmarkBusy} onClick={() => this.runBenchmarks()}>
                        <i className={codicon('beaker')} />
                        {this.state.benchmarkBusy ? nls.localizeByDefault('Loading...') : nls.localize('theia/memory/runBenchmarks', 'Run benchmarks')}
                    </button>
                    {this.state.benchmarkError && <small className='memory-error'>{this.state.benchmarkError}</small>}
                </div>
                {report ? <>
                    <div className='memory-metrics'>
                        {this.renderMetric('Dataset', report.datasetSize, 'list-selection')}
                        {this.renderMetric('Recall', Math.round(report.recall * 100), 'target')}
                        {this.renderMetric('Multi-session', Math.round(report.multiSessionRecall * 100), 'history')}
                        {this.renderMetric('Token Cut', report.tokenReductionPercent, 'symbol-number')}
                        {this.renderMetric('Avg ms', report.averageLatencyMs, 'watch')}
                        {this.renderMetric('P95 ms', report.p95LatencyMs, 'graph-line')}
                    </div>
                    <div className='memory-list'>
                        <article>
                            <div>
                                <strong>{nls.localize('theia/memory/benchmarkSummary', 'Summary')}</strong>
                                <span>{report.security.status}</span>
                            </div>
                            <p>{report.summary}</p>
                        </article>
                        <article>
                            <div>
                                <strong>{nls.localize('theia/memory/benchmarkSecurity', 'Security')}</strong>
                                <span>{report.security.sensitiveResults} results</span>
                            </div>
                            <p>{report.security.sensitiveFiles} sensitive files tracked - {report.security.secretLikeSnippets} secret-like snippets returned</p>
                        </article>
                    </div>
                </> : <p>{nls.localize('theia/memory/benchmarkEmpty', 'Run local benchmarks to collect recall, token, latency, and security metrics.')}</p>}
            </section>
            {report && <section>
                <div className='memory-section-title'>
                    <h3>{nls.localize('theia/memory/benchmarkCases', 'Dataset Cases')}</h3>
                    <span>{report.cases.filter(item => item.hit).length}/{report.cases.length} hits</span>
                </div>
                <div className='memory-results'>
                    {report.cases.map(item => <article key={item.id}>
                        <div>
                            <strong>{item.prompt}</strong>
                            <span>{item.hit ? 'hit' : 'miss'} - {item.latencyMs}ms</span>
                        </div>
                        <p>{item.expectedSourceKind} {'->'} {item.topResultTitle ?? item.topResultId ?? nls.localize('theia/memory/noResult', 'No result')}</p>
                    </article>)}
                </div>
            </section>}
            {history.length > 0 && <section>
                <div className='memory-section-title'>
                    <h3>{nls.localize('theia/memory/benchmarkHistory', 'Local History')}</h3>
                    <span>{history.length} reports</span>
                </div>
                <div className='memory-results compact'>
                    {history.map(item => <article key={item.generatedAt}>
                        <div>
                            <strong>{new Date(item.generatedAt).toLocaleString()}</strong>
                            <span>{item.security.status} - {item.cases.filter(testCase => testCase.hit).length}/{item.cases.length} hits</span>
                        </div>
                        <p>{Math.round(item.recall * 100)}% recall - {item.averageLatencyMs}ms avg - {item.tokenReductionPercent}% token cut</p>
                    </article>)}
                </div>
            </section>}
        </div>;
    }

    protected renderImpact(dashboard: MemoryDashboard): React.ReactNode {
        const graph = this.buildImpactGraph(dashboard);
        const changedFiles = this.changedFiles(dashboard);
        const impactedTests = graph.nodes.filter(node => this.nodeCategories(node).has('tests')).length;
        const impactedMemories = graph.nodes.filter(node => node.kind === 'memory').length;
        const compact = this.impactCompactContext(dashboard, graph);
        return <div className='memory-impact'>
            <section>
                <div className='memory-section-title'>
                    <h3>{nls.localize('theia/memory/changeImpact', 'Change Impact')}</h3>
                    <span>{changedFiles.length} changed files - {graph.edges.length} graph diff edges</span>
                </div>
                <div className='memory-metrics compact'>
                    {this.renderMetric('Changed', changedFiles.length, 'diff-modified')}
                    {this.renderMetric('Affected Nodes', graph.nodes.length, 'references')}
                    {this.renderMetric('Tests', impactedTests, 'beaker')}
                    {this.renderMetric('Memories', impactedMemories, 'database')}
                </div>
                <div className='memory-diff-grid'>
                    <div>
                        <h4>{nls.localize('theia/memory/changedFiles', 'Changed Files')}</h4>
                        <div className='memory-list'>
                            {changedFiles.length ? changedFiles.map(file => <article key={file.id}>
                                <div>
                                    <strong>{file.relativePath}</strong>
                                    <span>{this.fileRiskLabel(file)}</span>
                                </div>
                                <p>{file.languageId ?? 'text'} - {file.sizeBytes} bytes</p>
                            </article>) : <p>{nls.localize('theia/memory/noChangedFiles', 'No edited-file events are indexed yet. The graph below shows high-confidence local impact candidates.')}</p>}
                        </div>
                    </div>
                    <div>
                        <h4>{nls.localize('theia/memory/impactSummary', 'Impact Summary')}</h4>
                        <div className='memory-list'>
                            {this.impactSummaries(dashboard, graph).map(summary => <article key={summary.title}>
                                <div>
                                    <strong>{summary.title}</strong>
                                    <span>{summary.count}</span>
                                </div>
                                <p>{summary.detail}</p>
                            </article>)}
                        </div>
                    </div>
                </div>
            </section>
            <section>
                <div className='memory-section-title'>
                    <h3>{nls.localize('theia/memory/prConflictContext', 'PR and Conflict Context')}</h3>
                    <span>{compact.recommendedContext.length} context items - {compact.citations.length} citations</span>
                </div>
                <p className='memory-muted'>{compact.summary}</p>
                <div className='memory-diff-grid'>
                    <div>
                        <h4>{nls.localize('theia/memory/compactContext', 'Compact Context')}</h4>
                        <div className='memory-list'>
                            {compact.recommendedContext.map(context => <article key={context.id}>
                                <div>
                                    <strong>{context.title}</strong>
                                    <span>{this.sourceLabel(context.sourceKind)} - {context.score.toFixed(2)}</span>
                                </div>
                                <p>{context.reason}</p>
                            </article>)}
                        </div>
                    </div>
                    <div>
                        <h4>{nls.localize('theia/memory/citations', 'Citations')}</h4>
                        <div className='memory-citation-list'>
                            {compact.citations.map(citation => <article key={`${citation.kind}:${citation.id}`}>
                                <div>
                                    <strong>{citation.title}</strong>
                                    <span>{citation.kind}{citation.scope ? ` - ${citation.scope}` : ''}</span>
                                </div>
                                <p>{citation.uri ?? citation.evidence ?? citation.reason}</p>
                            </article>)}
                        </div>
                    </div>
                </div>
            </section>
            {this.renderGraph(graph, dashboard, true)}
        </div>;
    }

    protected renderGraph(graph: MemoryGraph, dashboard: MemoryDashboard, impactMode = false): React.ReactNode {
        const filtered = this.filterGraph(graph, dashboard, impactMode);
        const layout = this.layoutGraph(filtered.nodes);
        const selected = filtered.nodes.find(node => node.id === this.state.selectedNodeId);
        return <section className='memory-graph-section'>
            <div className='memory-section-title'>
                <h3>{graph.title}</h3>
                <span>{filtered.nodes.length}/{graph.nodes.length} nodes - {filtered.edges.length}/{graph.edges.length} relations</span>
            </div>
            {this.renderGraphFilters()}
            <div className='memory-graph'>
                <svg viewBox='0 0 900 460' role='img'>
                    {filtered.edges.map(edge => {
                        const source = layout.get(edge.sourceId);
                        const target = layout.get(edge.targetId);
                        if (!source || !target) {
                            return undefined;
                        }
                        return <line
                            key={edge.id}
                            x1={source.x}
                            y1={source.y}
                            x2={target.x}
                            y2={target.y}
                            className={`relation-${edge.relationType}`}
                            data-confidence={this.confidenceBucket(edge.confidenceScore)}>
                            <title>{edge.relationType} - {this.formatConfidence(edge.confidenceScore)} confidence</title>
                        </line>;
                    })}
                    {filtered.edges.slice(0, 40).map(edge => {
                        const source = layout.get(edge.sourceId);
                        const target = layout.get(edge.targetId);
                        if (!source || !target) {
                            return undefined;
                        }
                        return <text
                            key={`${edge.id}-confidence`}
                            x={(source.x + target.x) / 2}
                            y={(source.y + target.y) / 2 - 4}
                            className={`memory-edge-confidence ${this.confidenceBucket(edge.confidenceScore)}`}>
                            {this.formatConfidence(edge.confidenceScore)}
                        </text>;
                    })}
                    {filtered.nodes.map(node => {
                        const point = layout.get(node.id);
                        if (!point) {
                            return undefined;
                        }
                        const classes = [
                            `kind-${node.kind}`,
                            node.changeStatus ? `change-${node.changeStatus}` : '',
                            this.isRiskNode(node, dashboard) ? 'risk' : ''
                        ].filter(Boolean).join(' ');
                        return <g key={node.id} transform={`translate(${point.x} ${point.y})`} onClick={() => this.setState({ selectedNodeId: node.id })}>
                            <circle r={this.nodeRadius(node)} className={classes} />
                            <text y={4}>{this.shortLabel(node.label)}</text>
                            <title>{node.label}{node.detail ? ` - ${node.detail}` : ''}</title>
                        </g>;
                    })}
                </svg>
            </div>
            {selected && this.renderSelectedNode(selected, dashboard, graph)}
            <div className='memory-node-list'>
                {filtered.nodes.slice(0, 120).map(node => this.renderNodeListItem(node, dashboard))}
            </div>
        </section>;
    }

    protected renderKnowledgeGraph(dashboard: MemoryDashboard): React.ReactNode {
        const graph = this.resolveKnowledgeGraph(dashboard);
        const concepts = graph.nodes
            .filter(node => node.id !== 'knowledge-root')
            .slice(0, 80);
        const nodeById = new Map(graph.nodes.map(node => [node.id, node]));
        const links = graph.edges
            .map(edge => ({
                edge,
                source: nodeById.get(edge.sourceId),
                target: nodeById.get(edge.targetId)
            }))
            .filter((link): link is { edge: MemoryGraphEdge; source: MemoryGraphNode; target: MemoryGraphNode } =>
                !!link.source && !!link.target
            )
            .slice(0, 80);
        return <div className='memory-knowledge'>
            <section>
                <div className='memory-section-title'>
                    <h3>{nls.localize('theia/memory/knowledgeGraph', 'Knowledge Graph')}</h3>
                    <span>{concepts.length} concepts - {links.length} links</span>
                </div>
                <div className='memory-actions memory-export-actions'>
                    <button className='theia-button secondary' onClick={() => this.exportKnowledgeGraph(graph, dashboard, 'json')}>
                        <i className={codicon('json')} />
                        JSON
                    </button>
                    <button className='theia-button secondary' onClick={() => this.exportKnowledgeGraph(graph, dashboard, 'markdown')}>
                        <i className={codicon('markdown')} />
                        Markdown
                    </button>
                    <button className='theia-button secondary' onClick={() => this.exportKnowledgeGraph(graph, dashboard, 'dot')}>
                        <i className={codicon('symbol-namespace')} />
                        DOT
                    </button>
                </div>
                {this.state.knowledgeError && <p className='memory-feedback-error'>{this.state.knowledgeError}</p>}
            </section>
            {this.renderGraph(graph, dashboard)}
            <section>
                <div className='memory-knowledge-grid'>
                    <div>
                        <h4>{nls.localize('theia/memory/knowledgeConcepts', 'Concepts')}</h4>
                        <div className='memory-list'>
                            {concepts.length ? concepts.map(node => <article key={node.id}>
                                <div>
                                    <strong>{node.label}</strong>
                                    <span>{node.detail ?? node.kind}</span>
                                </div>
                                {node.staleStatus && <p>{nls.localize('theia/memory/knowledgeStaleStatus', 'Status: {0}', node.staleStatus.replace('_', ' '))}</p>}
                            </article>) : <p>{nls.localize('theia/memory/noKnowledgeConcepts', 'No knowledge concepts are indexed yet.')}</p>}
                        </div>
                    </div>
                    <div>
                        <h4>{nls.localize('theia/memory/knowledgeLinks', 'Links')}</h4>
                        <div className='memory-list'>
                            {links.length ? links.map(link => <article key={link.edge.id}>
                                <div>
                                    <strong>{link.source.label}</strong>
                                    <span>{link.edge.relationType}</span>
                                </div>
                                <p>{link.target.label} - {Math.round(link.edge.confidenceScore * 100)}%</p>
                            </article>) : <p>{nls.localize('theia/memory/noKnowledgeLinks', 'No knowledge links are indexed yet.')}</p>}
                        </div>
                    </div>
                </div>
            </section>
        </div>;
    }

    protected renderGraphFilters(): React.ReactNode {
        const filters: Array<{ key: GraphBooleanFilter; label: string; icon: string }> = [
            { key: 'endpoints', label: 'Endpoints', icon: 'plug' },
            { key: 'services', label: 'Services', icon: 'server-process' },
            { key: 'repositories', label: 'Repositories', icon: 'repo' },
            { key: 'tests', label: 'Tests', icon: 'beaker' },
            { key: 'memories', label: 'Memories', icon: 'database' },
            { key: 'docs', label: 'Docs', icon: 'book' },
            { key: 'hubs', label: 'Hubs', icon: 'hubot' },
            { key: 'bridges', label: 'Bridges', icon: 'symbol-interface' },
            { key: 'calls', label: 'Calls', icon: 'symbol-method' },
            { key: 'types', label: 'Types', icon: 'type-hierarchy' },
            { key: 'dependencyInjection', label: 'DI', icon: 'symbol-interface' },
            { key: 'dataModel', label: 'Data', icon: 'database' },
            { key: 'riskOnly', label: 'Risk', icon: 'warning' }
        ];
        return <div className='memory-filterbar'>
            {filters.map(filter => <button
                key={filter.key}
                className={this.state.graphFilters[filter.key] ? 'active' : ''}
                title={filter.label}
                onClick={() => this.updateGraphFilter(filter.key, !this.state.graphFilters[filter.key])}>
                <i className={codicon(filter.icon)} />
                <span>{filter.label}</span>
            </button>)}
            <label className='memory-depth' title='Graph depth'>
                <i className={codicon('git-branch')} />
                <span>Depth</span>
                <input type='range' min={1} max={5} value={this.state.graphFilters.depth} onChange={event => this.updateGraphDepth(Number(event.currentTarget.value))} />
                <strong>{this.state.graphFilters.depth}</strong>
            </label>
        </div>;
    }

    protected formatConfidence(score: number | undefined): string {
        const normalized = typeof score === 'number' && Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : 0;
        return `${Math.round(normalized * 100)}%`;
    }

    protected confidenceBucket(score: number | undefined): 'high' | 'medium' | 'low' {
        const normalized = typeof score === 'number' && Number.isFinite(score) ? score : 0;
        if (normalized >= 0.8) {
            return 'high';
        }
        if (normalized >= 0.55) {
            return 'medium';
        }
        return 'low';
    }

    protected renderNodeListItem(node: MemoryGraphNode, dashboard: MemoryDashboard): React.ReactNode {
        const target = this.resolveNodeTarget(node, dashboard);
        return <div key={node.id} className={node.id === this.state.selectedNodeId ? 'selected' : ''}>
            <i className={codicon(this.nodeIcon(node))} />
            <span title={node.detail ?? node.label}>{node.label}</span>
            <small>{node.detail ?? node.source}</small>
            <div className='memory-row-actions'>
                <button title='Inspect node' onClick={() => this.setState({ selectedNodeId: node.id })}>
                    <i className={codicon('eye')} />
                </button>
                <button title='Open file' disabled={!target} onClick={() => target && this.openNode(node, dashboard)}>
                    <i className={codicon('go-to-file')} />
                </button>
                <button title='Add to Context Cart' disabled={!target} onClick={() => target && this.addNodeToContext(node, dashboard)}>
                    <i className={codicon('add')} />
                </button>
            </div>
        </div>;
    }

    protected renderSelectedNode(node: MemoryGraphNode, dashboard: MemoryDashboard, graph?: MemoryGraph): React.ReactNode {
        const relations = this.nodeRelations(node, dashboard, graph).slice(0, 8);
        const memories = this.relatedMemories(node, dashboard).slice(0, 5);
        return <aside className='memory-node-details'>
            <div>
                <strong>{node.label}</strong>
                <span>{node.kind}{node.changeStatus ? ` - ${node.changeStatus}` : ''}</span>
            </div>
            {node.detail && <p>{node.detail}</p>}
            <div className='memory-actions'>
                <button className='theia-button secondary' onClick={() => this.openNode(node, dashboard)} disabled={!this.resolveNodeTarget(node, dashboard)}>
                    <i className={codicon('go-to-file')} />
                    {nls.localize('theia/memory/openFile', 'Open')}
                </button>
                <button className='theia-button secondary' onClick={() => this.addNodeToContext(node, dashboard)} disabled={!this.resolveNodeTarget(node, dashboard)}>
                    <i className={codicon('add')} />
                    {nls.localize('theia/memory/addContext', 'Context')}
                </button>
            </div>
            <div className='memory-node-facts'>
                <strong>{nls.localize('theia/memory/relations', 'Relations')}</strong>
                {relations.length ? relations.map(relation => <span key={relation.id}>{relation.relationType} - {this.formatConfidence(relation.confidenceScore)}</span>) : <span>No direct relations indexed.</span>}
                <strong>{nls.localize('theia/memory/memories', 'Memories')}</strong>
                {memories.length ? memories.map(memory => <span key={memory.id}>{memory.title}</span>) : <span>No related memories indexed.</span>}
            </div>
        </aside>;
    }

    protected renderMemoryCandidates(dashboard: MemoryDashboard): React.ReactNode {
        const candidates = dashboard.memories
            .filter(memory => memory.status === 'candidate')
            .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
        return <section className='memory-candidates'>
            <div className='memory-section-title'>
                <h3>{nls.localize('theia/memory/memoryCandidates', 'Memory Candidates')}</h3>
                <span>{candidates.length} awaiting review</span>
            </div>
            <div className='memory-list'>
                {candidates.length ? candidates.map(memory => <article key={memory.id} className='memory-candidate'>
                    <div>
                        <input
                            className='memory-inline-input'
                            defaultValue={memory.title}
                            aria-label='Memory candidate title'
                            onBlur={event => this.updateMemory(memory, { title: event.currentTarget.value })}
                        />
                        <span>{this.memoryScopeLabel(memory.scope)} - {memory.memoryType} - {memory.staleStatus}</span>
                    </div>
                    <textarea
                        className='memory-inline-textarea'
                        defaultValue={memory.content}
                        rows={4}
                        aria-label='Memory candidate content'
                        onBlur={event => this.updateMemory(memory, { content: event.currentTarget.value })}
                    />
                    <footer className='memory-evidence'>
                        <span>{memory.evidence ?? memory.source ?? 'memory candidate'}</span>
                        <span>updated {new Date(memory.updatedAt).toLocaleString()}</span>
                    </footer>
                    {this.renderMemorySignals(memory)}
                    <div className='memory-actions'>
                        <button className='theia-button main' onClick={() => this.updateMemory(memory, { status: 'active', staleStatus: 'fresh' })}>
                            <i className={codicon('check')} />
                            {nls.localize('theia/memory/approve', 'Approve')}
                        </button>
                        <button className='theia-button secondary danger' onClick={() => this.updateMemory(memory, { status: 'rejected' })}>
                            <i className={codicon('close')} />
                            {nls.localize('theia/memory/reject', 'Reject')}
                        </button>
                        <button className='theia-button secondary' onClick={() => this.updateMemory(memory, { status: 'archived' })}>
                            <i className={codicon('archive')} />
                            {nls.localize('theia/memory/archive', 'Archive')}
                        </button>
                    </div>
                </article>) : <p>{nls.localize('theia/memory/noMemoryCandidates', 'No memory candidates are waiting for review.')}</p>}
            </div>
        </section>;
    }

    protected renderMemories(dashboard: MemoryDashboard, scope: MemoryPanelScope): React.ReactNode {
        const scopes = [scope];
        const memories = dashboard.memories.filter(memory => scopes.includes(memory.scope) && memory.status !== 'candidate');
        const spaces = (dashboard.memorySpaces ?? []).filter(space => scopes.includes(space.scope));
        const groupedSpaces = this.memorySpacesWithMemories(spaces, memories);
        return <section>
            <div className='memory-section-title'>
                <h3>{this.memoryPanelTitle(scope)}</h3>
                <div className='memory-actions'>
                    <span>{memories.length} records</span>
                    {memories.length >= 2 && <button className='theia-button secondary' onClick={() => this.consolidateMemories(scope, memories)}>
                        <i className={codicon('combine')} />
                        {nls.localize('theia/memory/consolidateMemories', 'Consolidate')}
                    </button>}
                    {this.canAddMemoryInScope(scope) && <button className='theia-button secondary' onClick={() => this.addMemory(scope)}>
                        <i className={codicon('add')} />
                        {nls.localize('theia/memory/addMemory', 'Add')}
                    </button>}
                </div>
            </div>
            {groupedSpaces.length ? <div className='memory-spaces'>
                {groupedSpaces.map(group => <div key={group.space.id} className='memory-space'>
                    <div>
                        <i className={codicon(this.memoryScopeIcon(group.space.scope))} />
                        <strong>{this.memoryScopeLabel(group.space.scope)}</strong>
                        <span>{group.memories.length}</span>
                    </div>
                    <small>{this.memorySpaceLocator(group.space)}</small>
                </div>)}
            </div> : undefined}
            <div className='memory-list'>
                {memories.length ? memories.map(memory => <article key={memory.id}>
                    <div>
                        <input
                            className='memory-inline-input'
                            defaultValue={memory.title}
                            aria-label='Memory title'
                            onBlur={event => this.updateMemory(memory, { title: event.currentTarget.value })}
                        />
                        <span>{this.memoryScopeLabel(memory.scope)} - {memory.status} - {memory.memoryType} - {memory.staleStatus}</span>
                    </div>
                    <textarea
                        className='memory-inline-textarea'
                        defaultValue={memory.content}
                        rows={3}
                        aria-label='Memory content'
                        onBlur={event => this.updateMemory(memory, { content: event.currentTarget.value })}
                    />
                    <footer className='memory-evidence'>
                        <span>{this.memorySpaceSummary(memory, spaces)}</span>
                        <span>{memory.evidence ?? memory.source ?? 'manual/project memory'}</span>
                        <span>accepted {memory.acceptedCount} - rejected {memory.rejectedCount} - updated {new Date(memory.updatedAt).toLocaleString()}</span>
                    </footer>
                    {this.renderMemorySignals(memory)}
                    <div className='memory-actions'>
                        <button className='theia-button secondary' disabled={memory.status === 'active'} onClick={() => this.updateMemory(memory, { status: 'active' })}>
                            <i className={codicon('check')} />
                            Active
                        </button>
                        <button className='theia-button secondary' disabled={memory.status === 'archived'} onClick={() => this.updateMemory(memory, { status: 'archived' })}>
                            <i className={codicon('archive')} />
                            Archive
                        </button>
                        <button className='theia-button secondary danger' disabled={memory.status === 'rejected'} onClick={() => this.updateMemory(memory, { status: 'rejected' })}>
                            <i className={codicon('close')} />
                            Reject
                        </button>
                    </div>
                    <div className='memory-actions memory-actions'>
                        <button className='theia-button secondary' disabled={memory.staleStatus === 'fresh'} onClick={() => this.updateMemory(memory, { staleStatus: 'fresh' })}>
                            <i className={codicon('verified-filled')} />
                            Fresh
                        </button>
                        <button className='theia-button secondary' disabled={memory.staleStatus === 'possibly_stale'} onClick={() => this.updateMemory(memory, { staleStatus: 'possibly_stale' })}>
                            <i className={codicon('warning')} />
                            Review
                        </button>
                        <button className='theia-button secondary danger' disabled={memory.staleStatus === 'stale'} onClick={() => this.updateMemory(memory, { staleStatus: 'stale' })}>
                            <i className={codicon('circle-slash')} />
                            Stale
                        </button>
                        {this.renderImportanceActions(memory)}
                    </div>
                    <div className='memory-actions memory-actions'>
                        {(memory.scope === 'workspace' || memory.scope === 'repository') && <button className='theia-button secondary' onClick={() => this.promoteMemory(memory)}>
                            <i className={codicon('arrow-up')} />
                            {nls.localize('theia/memory/promoteToIdeMemory', 'Promote to IDE')}
                        </button>}
                        {memory.scope === 'global' && <button className='theia-button secondary' onClick={() => this.demoteMemory(memory)}>
                            <i className={codicon('arrow-down')} />
                            {nls.localize('theia/memory/demoteToProjectMemory', 'Demote to Project')}
                        </button>}
                    </div>
                </article>) : <p>{this.memoryPanelEmptyText(scope)}</p>}
            </div>
        </section>;
    }

    protected renderInitialConsentBanner(settings: MemoryWorkspaceSettings): React.ReactNode {
        if (settings.enabled === true) {
            return undefined;
        }
        return <section className='memory-initial-consent' aria-label={nls.localize('theia/memory/initialConsentLabel', 'Memory consent')}>
            <div>
                <strong>{nls.localize('theia/memory/initialConsentTitle', 'Memory is off for this workspace')}</strong>
                <small>{nls.localize(
                    'theia/memory/initialConsentDetail',
                    'CyberVinci will not index files, learn from chat, capture events, suggest skills, use Context Cart, or read sensitive local documents until you explicitly opt in.'
                )}</small>
            </div>
            <div className='memory-consent-grid'>
                <span className='requires-consent'><i className={codicon('lock')} />{nls.localize('theia/memory/initialConsentCodeGraph', 'Code graph requires consent')}</span>
                <span className='requires-consent'><i className={codicon('lock')} />{nls.localize('theia/memory/initialConsentMemory', 'Memory learning requires consent')}</span>
                <span className='requires-consent'><i className={codicon('lock')} />{nls.localize('theia/memory/initialConsentChat', 'Chat learning requires consent')}</span>
                <span className='requires-consent'><i className={codicon('lock')} />{nls.localize('theia/memory/initialConsentDocs', 'Sensitive documents require consent')}</span>
            </div>
            <div className='memory-actions'>
                <button className='theia-button main' disabled={this.state.busy} onClick={() => this.enableWorkspaceConsentShell(settings)}>
                    <i className={codicon('shield')} />
                    {nls.localize('theia/memory/enableWorkspaceConsent', 'Enable workspace only')}
                </button>
                <button className='theia-button secondary' onClick={() => this.switchTab('settings')}>
                    <i className={codicon('settings-gear')} />
                    {nls.localize('theia/memory/configureConsent', 'Configure consent')}
                </button>
            </div>
        </section>;
    }

    protected memoryPanelTitle(scope: MemoryPanelScope): string {
        switch (scope) {
            case 'global': return 'IDE Memories';
            case 'workspace': return 'Project Memories';
            case 'repository': return 'Repository Memories';
            case 'session': return 'Session Memory';
            case 'task': return 'Task Memory';
        }
    }

    protected memoryPanelEmptyText(scope: MemoryPanelScope): string {
        switch (scope) {
            case 'global': return nls.localize('theia/memory/noIdeMemories', 'No IDE memories indexed yet.');
            case 'workspace': return nls.localize('theia/memory/noProjectMemories', 'No project memories indexed yet.');
            case 'repository': return nls.localize('theia/memory/noRepositoryMemories', 'No repository memories indexed yet.');
            case 'session': return nls.localize('theia/memory/noSessionMemories', 'No session memory is retained for this workspace.');
            case 'task': return nls.localize('theia/memory/noTaskMemories', 'No task memory is retained for this workspace.');
        }
    }

    protected canAddMemoryInScope(scope: MemoryPanelScope): scope is 'global' | 'workspace' {
        return scope === 'global' || scope === 'workspace';
    }

    protected memorySpacesWithMemories(spaces: MemorySpace[], memories: MemoryItem[]): Array<{ space: MemorySpace; memories: MemoryItem[] }> {
        const groups = spaces.map(space => ({
            space,
            memories: memories.filter(memory => this.memoryBelongsToSpace(memory, space))
        }));
        for (const memory of memories) {
            if (!groups.some(group => group.memories.includes(memory))) {
                groups.push({
                    space: this.syntheticMemorySpace(memory),
                    memories: [memory]
                });
            }
        }
        return groups.sort((left, right) => this.memoryScopeOrder(left.space.scope) - this.memoryScopeOrder(right.space.scope));
    }

    protected memoryBelongsToSpace(memory: MemoryItem, space: MemorySpace): boolean {
        return memory.scope === space.scope
            && (space.scope !== 'workspace' || memory.workspacePath === space.workspacePath)
            && (space.scope !== 'repository' || (!!memory.repositoryId && memory.repositoryId === space.repositoryId) || (!!memory.repositoryUrl && memory.repositoryUrl === space.repositoryUrl))
            && (space.scope !== 'session' || memory.sessionId === space.sessionId)
            && (space.scope !== 'task' || memory.taskId === space.taskId);
    }

    protected syntheticMemorySpace(memory: MemoryItem): MemorySpace {
        return {
            id: `memory:${memory.id}`,
            scope: memory.scope,
            workspacePath: memory.workspacePath,
            repositoryUrl: memory.repositoryUrl,
            repositoryId: memory.repositoryId,
            sessionId: memory.sessionId,
            taskId: memory.taskId,
            retentionPolicy: memory.retentionPolicy,
            createdAt: memory.createdAt,
            updatedAt: memory.updatedAt
        };
    }

    protected memoryScopeOrder(scope: MemorySpace['scope']): number {
        return ['global', 'workspace', 'repository', 'session', 'task'].indexOf(scope);
    }

    protected memoryScopeLabel(scope: MemorySpace['scope']): string {
        switch (scope) {
            case 'global': return 'IDE';
            case 'workspace': return 'Project';
            case 'repository': return 'Repository';
            case 'session': return 'Session';
            case 'task': return 'Task';
            default: return scope;
        }
    }

    protected memoryScopeIcon(scope: MemorySpace['scope']): string {
        switch (scope) {
            case 'global': return 'settings-gear';
            case 'workspace': return 'root-folder';
            case 'repository': return 'repo';
            case 'session': return 'clock';
            case 'task': return 'checklist';
            default: return 'database';
        }
    }

    protected memorySpaceLocator(space: MemorySpace): string {
        return space.repositoryId ?? space.repositoryUrl ?? space.sessionId ?? space.taskId ?? space.workspacePath ?? 'IDE-wide';
    }

    protected memorySpaceSummary(memory: MemoryItem, spaces: MemorySpace[]): string {
        const space = spaces.find(candidate => this.memoryBelongsToSpace(memory, candidate)) ?? this.syntheticMemorySpace(memory);
        const retention = space.retentionPolicy ? ` - ${space.retentionPolicy}` : '';
        return `${this.memoryScopeLabel(space.scope)} space: ${this.memorySpaceLocator(space)}${retention}`;
    }

    protected renderMemoryHealth(dashboard: MemoryDashboard): React.ReactNode {
        const memories = dashboard.memories.map(memory => this.lifecycleMemory(memory));
        const stale = memories.filter(memory => memory.staleStatus === 'stale');
        const review = memories.filter(memory => memory.staleStatus === 'possibly_stale' || memory.staleStatus === 'unknown');
        const weighted = memories.filter(memory => typeof memory.weight === 'number');
        const averageWeight = weighted.length
            ? Math.round(weighted.reduce((total, memory) => total + (memory.weight ?? 0), 0) / weighted.length * 100) / 100
            : undefined;
        const important = memories.filter(memory => this.isImportantMemory(memory)).length;
        const needsReview = [...stale, ...review]
            .sort((left, right) => this.memoryHealthRank(right) - this.memoryHealthRank(left))
            .slice(0, 12);
        const pruningProposals = new MemoryServiceHelper().proposePruning(memories).slice(0, 12);
        const health = dashboard.memoryHealth ?? new MemoryServiceHelper().healthReport(memories);
        const missingAccess = health.neverAccessed ?? memories.filter(memory => memory.accessCount === 0).length;
        const healthIssues = health.issues ?? [];
        const memoriesById = new Map(memories.map(memory => [memory.id, memory]));
        return <div className='memory-health'>
            <section>
                <div className='memory-section-title'>
                    <h3>{nls.localize('theia/memory/memoryHealth', 'Memory Health')}</h3>
                    <span>{memories.length} memories - {stale.length + review.length + healthIssues.length} need review</span>
                </div>
                <div className='memory-metrics compact'>
                    {this.renderMetric('Fresh', memories.filter(memory => memory.staleStatus === 'fresh').length, 'verified-filled')}
                    {this.renderMetric('Needs Review', stale.length + review.length, 'warning')}
                    {this.renderMetric('Health Issues', healthIssues.length, 'pulse')}
                    {this.renderMetric('Important', important, 'star-full')}
                    {this.renderMetric('Avg Weight', averageWeight ?? 0, 'graph-line')}
                    {this.renderMetric('Low Weight', health.lowWeight ?? 0, 'graph-line')}
                    {this.renderMetric('Never Used', missingAccess, 'eye-closed')}
                    {this.renderMetric('IDE Scope', health.byScope?.global ?? memories.filter(memory => memory.scope === 'global').length, 'settings-gear')}
                </div>
                <div className='memory-diff-grid'>
                    <div>
                        <h4>{nls.localize('theia/memory/memoryPruningProposals', 'Pruning Proposals')}</h4>
                        <div className='memory-list'>
                            {pruningProposals.length ? pruningProposals.map(proposal => <article key={proposal.id}>
                                <div>
                                    <strong>{proposal.title}</strong>
                                    <span>{this.memoryScopeLabel(proposal.scope)} - {proposal.action}</span>
                                </div>
                                <p>{proposal.evidence}</p>
                                <div className='memory-signal-row'>
                                    <span className='memory-signal'>{proposal.reasons.join(', ')}</span>
                                    <span className='memory-signal'>review required</span>
                                    {proposal.duplicateOf && <span className='memory-signal'>duplicate of {proposal.duplicateOf}</span>}
                                </div>
                                <div className='memory-actions memory-actions'>
                                    <button className='theia-button secondary' disabled={proposal.action !== 'archive' || !memoriesById.has(proposal.id)} onClick={() => this.updateMemory(memoriesById.get(proposal.id)!, { status: 'archived' })}>
                                        <i className={codicon('archive')} />
                                        Archive
                                    </button>
                                    <button className='theia-button secondary danger' disabled={proposal.action !== 'remove'} onClick={() => this.forgetMemory(proposal.id)}>
                                        <i className={codicon('trash')} />
                                        Remove
                                    </button>
                                </div>
                            </article>) : <p>{nls.localize('theia/memory/noMemoryPruningProposals', 'No memory pruning proposals are waiting for review.')}</p>}
                        </div>
                    </div>
                    <div>
                        <h4>{nls.localize('theia/memory/memoryReviewQueue', 'Review Queue')}</h4>
                        <div className='memory-list'>
                            {needsReview.length ? needsReview.map(memory => this.renderMemoryHealthItem(memory)) : <p>{nls.localize('theia/memory/noMemoryReviewQueue', 'No stale or unknown memories are waiting for review.')}</p>}
                        </div>
                    </div>
                    <div>
                        <h4>{nls.localize('theia/memory/memoryHealthIssues', 'Health Issues')}</h4>
                        <div className='memory-list'>
                            {healthIssues.length ? healthIssues.slice(0, 12).map(issue => <article key={`${issue.kind}:${issue.memoryId}:${issue.relatedMemoryId ?? ''}`}>
                                <div>
                                    <strong>{issue.title}</strong>
                                    <span>{this.memoryScopeLabel(issue.scope)} - {issue.kind.replace(/_/g, ' ')}</span>
                                </div>
                                <p>{issue.evidence}</p>
                                <div className='memory-signal-row'>
                                    <span className='memory-signal'>memory {issue.memoryId}</span>
                                    {issue.relatedMemoryId && <span className='memory-signal'>related {issue.relatedMemoryId}</span>}
                                    <span className='memory-signal'>review required</span>
                                </div>
                            </article>) : <p>{nls.localize('theia/memory/noMemoryHealthIssues', 'No duplicate, contradictory, sensitive, source-less, misplaced global, or old candidate memories detected.')}</p>}
                        </div>
                    </div>
                    <div>
                        <h4>{nls.localize('theia/memory/memoryLifecycleMix', 'Lifecycle Mix')}</h4>
                        <div className='memory-breakdown'>
                            {this.renderMemoryBreakdown('Fresh', memories.filter(memory => memory.staleStatus === 'fresh').length, memories.length)}
                            {this.renderMemoryBreakdown('Possibly stale', memories.filter(memory => memory.staleStatus === 'possibly_stale').length, memories.length)}
                            {this.renderMemoryBreakdown('Stale', stale.length, memories.length)}
                            {this.renderMemoryBreakdown('Unknown', memories.filter(memory => memory.staleStatus === 'unknown').length, memories.length)}
                            {this.renderMemoryBreakdown('Weighted', weighted.length, memories.length)}
                            {this.renderMemoryBreakdown('Access reported', memories.length - missingAccess, memories.length)}
                            {this.renderMemoryBreakdown('Duplicates', health.duplicate ?? 0, memories.length)}
                            {this.renderMemoryBreakdown('Contradictions', health.contradictions ?? 0, memories.length)}
                            {this.renderMemoryBreakdown('Sensitive', health.sensitive ?? 0, memories.length)}
                            {this.renderMemoryBreakdown('No source', health.missingSource ?? 0, memories.length)}
                            {this.renderMemoryBreakdown('Global misplaced', health.globalWithWorkspace ?? 0, memories.length)}
                            {this.renderMemoryBreakdown('Old candidates', health.oldCandidates ?? 0, memories.length)}
                        </div>
                    </div>
                    <div>
                        <h4>{nls.localize('theia/memory/memoryScopeTotals', 'Scope Totals')}</h4>
                        <div className='memory-breakdown'>
                            {this.renderMemoryBreakdown('IDE/global', health.byScope?.global ?? 0, memories.length)}
                            {this.renderMemoryBreakdown('Workspace', health.byScope?.workspace ?? 0, memories.length)}
                            {this.renderMemoryBreakdown('Repository', health.byScope?.repository ?? 0, memories.length)}
                            {this.renderMemoryBreakdown('Session', health.byScope?.session ?? 0, memories.length)}
                            {this.renderMemoryBreakdown('Task', health.byScope?.task ?? 0, memories.length)}
                        </div>
                    </div>
                    <div>
                        <h4>{nls.localize('theia/memory/recentMemoryConsolidations', 'Recent Consolidations')}</h4>
                        <div className='memory-list'>
                            {health.recentConsolidations?.length ? health.recentConsolidations.map(consolidation => <article key={consolidation.id}>
                                <div>
                                    <strong>{consolidation.title ?? consolidation.memoryId ?? consolidation.id}</strong>
                                    <span>{consolidation.scope ? this.memoryScopeLabel(consolidation.scope) : 'Scope not reported'} - {new Date(consolidation.createdAt).toLocaleString()}</span>
                                </div>
                                <div className='memory-signal-row'>
                                    {consolidation.memoryId && <span className='memory-signal'>memory {consolidation.memoryId}</span>}
                                    <span className='memory-signal'>supersedes {consolidation.supersedes?.length ?? 0}</span>
                                </div>
                            </article>) : <p>{nls.localize('theia/memory/noRecentMemoryConsolidations', 'No memory consolidations recorded recently.')}</p>}
                        </div>
                    </div>
                </div>
            </section>
        </div>;
    }

    protected renderMemoryHealthItem(memory: LifecycleMemoryItem): React.ReactNode {
        return <article key={memory.id}>
            <div>
                <strong>{memory.title}</strong>
                <span>{this.memoryScopeLabel(memory.scope)} - {memory.memoryType}</span>
            </div>
            <p>{memory.content}</p>
            {this.renderMemorySignals(memory)}
            <div className='memory-actions memory-actions'>
                <button className='theia-button secondary' disabled={memory.staleStatus === 'fresh'} onClick={() => this.updateMemory(memory, { staleStatus: 'fresh' })}>
                    <i className={codicon('verified-filled')} />
                    Fresh
                </button>
                <button className='theia-button secondary' disabled={memory.staleStatus === 'possibly_stale'} onClick={() => this.updateMemory(memory, { staleStatus: 'possibly_stale' })}>
                    <i className={codicon('warning')} />
                    Review
                </button>
                <button className='theia-button secondary danger' disabled={memory.staleStatus === 'stale'} onClick={() => this.updateMemory(memory, { staleStatus: 'stale' })}>
                    <i className={codicon('circle-slash')} />
                    Stale
                </button>
                {this.renderImportanceActions(memory)}
            </div>
        </article>;
    }

    protected renderMemoryBreakdown(label: string, count: number, total: number): React.ReactNode {
        const percentage = total ? Math.round((count / total) * 100) : 0;
        return <div key={label}>
            <span>{label}</span>
            <strong>{count}</strong>
            <div>
                <span style={{ width: `${percentage}%` }} />
            </div>
        </div>;
    }

    protected renderMemorySignals(memory: MemoryItem): React.ReactNode {
        const lifecycle = this.lifecycleMemory(memory);
        return <div className='memory-signals'>
            <span className={`stale-${memory.staleStatus}`}>Stale: {memory.staleStatus.replace('_', ' ')}</span>
            <span>Importance: {lifecycle.importance ?? 'not reported'}</span>
            <span>Weight: {typeof lifecycle.weight === 'number' ? lifecycle.weight : 'not reported'}</span>
            <span>Access: {this.memoryAccessLabel(lifecycle)}</span>
        </div>;
    }

    protected renderImportanceActions(memory: MemoryItem): React.ReactNode {
        const lifecycle = this.lifecycleMemory(memory);
        if (lifecycle.importance === undefined) {
            return undefined;
        }
        const levels: MemoryImportance[] = ['low', 'medium', 'high', 'critical'];
        return levels.map(level => <button
            key={level}
            className='theia-button secondary'
            disabled={lifecycle.importance === level}
            onClick={() => this.updateMemoryLifecycle(memory, { importance: level })}>
            <i className={codicon(level === 'critical' ? 'flame' : 'star-full')} />
            {level}
        </button>);
    }

    protected lifecycleMemory(memory: MemoryItem): LifecycleMemoryItem {
        return memory as LifecycleMemoryItem;
    }

    protected memoryAccessLabel(memory: LifecycleMemoryItem): string {
        const lastAccessedAt = memory.lastAccessedAt ?? memory.lastAccessAt ?? memory.accessedAt;
        if (typeof memory.accessCount === 'number' && lastAccessedAt) {
            return `${memory.accessCount} - ${new Date(lastAccessedAt).toLocaleString()}`;
        }
        if (typeof memory.accessCount === 'number') {
            return String(memory.accessCount);
        }
        if (lastAccessedAt) {
            return new Date(lastAccessedAt).toLocaleString();
        }
        return 'not reported';
    }

    protected isImportantMemory(memory: LifecycleMemoryItem): boolean {
        return memory.importance === 'high' || memory.importance === 'critical' || (typeof memory.weight === 'number' && memory.weight >= 0.75);
    }

    protected memoryHealthRank(memory: LifecycleMemoryItem): number {
        const staleRank = memory.staleStatus === 'stale' ? 4 : memory.staleStatus === 'possibly_stale' ? 3 : memory.staleStatus === 'unknown' ? 2 : 1;
        const importanceRank = this.isImportantMemory(memory) ? 2 : 0;
        return staleRank + importanceRank + (memory.status === 'active' ? 1 : 0);
    }

    protected renderSkills(dashboard: MemoryDashboard): React.ReactNode {
        const candidates = dashboard.skillCandidates;
        const counts = this.skillCounts(candidates);
        const visible = candidates.filter(candidate => this.skillVisible(candidate));
        const filters: Array<MemoryWidgetState['skillStatusFilter']> = ['pending', 'all', 'tracking', 'suggested', 'delete_pending', 'accepted', 'rejected', 'blocked'];
        return <section>
            <div className='memory-section-title'>
                <h3>{nls.localize('theia/memory/skillsAwaiting', 'Skills Awaiting Approval or Deletion')}</h3>
                <span>{counts.pending} pending - {counts.deletePending} delete pending</span>
            </div>
            <div className='memory-filterbar'>
                {filters.map(filter => <button
                    key={filter}
                    className={this.state.skillStatusFilter === filter ? 'active' : ''}
                    onClick={() => this.setState({ skillStatusFilter: filter })}>
                    <span>{filter.replace('_', ' ')}</span>
                </button>)}
            </div>
            <div className='memory-list'>
                {visible.length ? visible.map(candidate => <article key={candidate.id} className={`memory-skill status-${candidate.status}`}>
                    <div>
                        <strong>{candidate.title}</strong>
                        <span>{candidate.status} - {candidate.triggerCount} triggers - {candidate.rejectionCount ?? 0} rejects</span>
                    </div>
                    <div className='memory-source-chips'>
                        {this.skillSuggestionSources(candidate, dashboard.events).map(source => <span key={`${candidate.id}-${source}`} title={this.skillSuggestionSourceTitle(source)}>
                            {this.skillSuggestionSourceLabel(source)}
                        </span>)}
                    </div>
                    <p>{candidate.description}</p>
                    <small>{candidate.signature} - events {this.eventsForSignature(dashboard.events, candidate.signature)}</small>
                    {candidate.statusReason && <p>{candidate.statusReason}</p>}
                    {candidate.rejectionReasons?.length ? <details>
                        <summary>{nls.localize('theia/memory/rejectionReasons', 'Rejection reasons')}</summary>
                        <ul>
                            {candidate.rejectionReasons.map((item, index) => <li key={`${candidate.id}-rejection-${index}`}>{item}</li>)}
                        </ul>
                    </details> : undefined}
                    {candidate.proposedSkillJson && <details>
                        <summary>{nls.localize('theia/memory/proposedSkill', 'Proposed skill JSON')}</summary>
                        <pre>{candidate.proposedSkillJson}</pre>
                    </details>}
                    <div className='memory-actions'>
                        <button className='theia-button main' disabled={candidate.status === 'accepted'} onClick={() => this.updateSkill(candidate, 'accepted')}>
                            <i className={codicon('check')} />
                            {candidate.status === 'delete_pending' ? 'Keep' : nls.localize('theia/memory/approve', 'Approve')}
                        </button>
                        <button
                            className='theia-button secondary'
                            disabled={candidate.status === 'rejected' || candidate.status === 'blocked'}
                            onClick={() => this.updateSkill(candidate, 'rejected', 'Rejected or ignored by the user.')}>
                            <i className={codicon('close')} />
                            {nls.localize('theia/memory/rejectOrIgnore', 'Reject / Ignore')}
                        </button>
                        <button className='theia-button secondary' onClick={() => this.updateSkill(candidate, 'blocked')}>
                            <i className={codicon('circle-slash')} />
                            {candidate.status === 'delete_pending' ? 'Approve deletion' : nls.localize('theia/memory/block', 'Block')}
                        </button>
                        {candidate.status !== 'delete_pending' && <button className='theia-button secondary danger' onClick={() => this.updateSkill(candidate, 'delete_pending')}>
                            <i className={codicon('trash')} />
                            {nls.localize('theia/memory/markDelete', 'Delete')}
                        </button>}
                        <button className='theia-button secondary danger' disabled={candidate.status === 'blocked'} onClick={() => this.updateSkill(candidate, 'blocked', 'Never suggest again.')}>
                            <i className={codicon('eye-closed')} />
                            Never
                        </button>
                        {candidate.status === 'blocked' && <button className='theia-button secondary' onClick={() => this.updateSkill(candidate, 'tracking', 'Block undone by the user.')}>
                            <i className={codicon('debug-restart')} />
                            Undo block
                        </button>}
                        <button className='theia-button secondary' disabled={candidate.status === 'blocked'} onClick={() => this.addSkillToContext(candidate, dashboard)}>
                            <i className={codicon('comment-add')} />
                            Reuse
                        </button>
                    </div>
                </article>) : <p>{nls.localize('theia/memory/noSkills', 'No skill candidates match the selected filter.')}</p>}
            </div>
        </section>;
    }

    protected renderEvents(dashboard: MemoryDashboard): React.ReactNode {
        const eventTypes = Array.from(new Set(dashboard.events.map(event => event.eventType))).sort();
        const pathFilter = this.state.eventPathFilter.toLowerCase();
        const events = dashboard.events
            .filter(event => this.state.eventTypeFilter === 'all' || event.eventType === this.state.eventTypeFilter)
            .filter(event => !pathFilter || (event.relativePath ?? event.promptSignature ?? event.payload ?? '').toLowerCase().includes(pathFilter));
        return <section>
            <div className='memory-section-title'>
                <h3>{nls.localize('theia/memory/events', 'Events and Audit')}</h3>
                <div className='memory-actions'>
                    <button className='theia-button secondary' onClick={() => this.exportEvents(dashboard)}>
                        <i className={codicon('export')} />
                        Export
                    </button>
                    <button className='theia-button secondary danger' disabled={!dashboard.events.length} onClick={() => this.clearEvents()}>
                        <i className={codicon('clear-all')} />
                        Clear
                    </button>
                </div>
            </div>
            <div className='memory-filterbar'>
                <select value={this.state.eventTypeFilter} onChange={event => this.setState({ eventTypeFilter: event.currentTarget.value as MemoryWidgetState['eventTypeFilter'] })}>
                    <option value='all'>all events</option>
                    {eventTypes.map(eventType => <option key={eventType} value={eventType}>{eventType}</option>)}
                </select>
                <input
                    value={this.state.eventPathFilter}
                    placeholder='path, signature, payload'
                    onChange={event => this.setState({ eventPathFilter: event.currentTarget.value })}
                />
                <span>{events.length}/{dashboard.events.length}</span>
            </div>
            <div className='memory-events audit'>
                {events.length ? events.map(event => <div key={event.id}>
                    <i className={codicon(this.eventIcon(event.eventType))} />
                    <span>{event.eventType}</span>
                    <small>{event.relativePath ?? event.promptSignature ?? ''}</small>
                    <small>{new Date(event.createdAt).toLocaleString()}</small>
                    {event.payload && <pre>{event.payload}</pre>}
                </div>) : <p>{nls.localize('theia/memory/noEventsMatch', 'No events match the selected filters.')}</p>}
            </div>
        </section>;
    }

    protected renderFeedback(dashboard: MemoryDashboard): React.ReactNode {
        const query = this.state.feedbackSearchQuery.trim().toLowerCase();
        const apiAvailable = this.feedbackApiAvailable();
        const fallbackRecords = this.feedbackRecordsFromEvents(dashboard);
        const records = this.state.feedbackRecords ?? fallbackRecords;
        const visible = records.filter(record => this.feedbackMatches(record, query));
        return <section>
            <div className='memory-section-title'>
                <h3>{nls.localize('theia/memory/feedback', 'Feedback')}</h3>
                <span>{visible.length}/{records.length} records</span>
            </div>
            <div className='memory-filterbar'>
                <input
                    value={this.state.feedbackSearchQuery}
                    placeholder='target, reason, correction'
                    onChange={event => this.setState({ feedbackSearchQuery: event.currentTarget.value })}
                    onKeyDown={event => {
                        if (event.key === 'Enter') {
                            this.refreshFeedback().catch(error => this.messageService.error(error instanceof Error ? error.message : String(error)));
                        }
                    }}
                />
                <button className='theia-button secondary' disabled={this.state.feedbackBusy} onClick={() => this.refreshFeedback()}>
                    <i className={codicon('search')} />
                    {this.state.feedbackBusy ? nls.localizeByDefault('Loading...') : nls.localize('theia/memory/search', 'Search')}
                </button>
                {!apiAvailable && <span>{nls.localize('theia/memory/feedbackEventFallback', 'showing audit-event fallback')}</span>}
            </div>
            {this.state.feedbackError && <p className='memory-feedback-error'>{this.state.feedbackError}</p>}
            <div className='memory-feedback-list'>
                {visible.length ? visible.map((record, index) => <article key={record.id ?? `${record.targetId ?? 'feedback'}-${index}`}>
                    <div>
                        <strong>{record.targetTitle ?? record.targetId ?? nls.localize('theia/memory/feedbackRecord', 'Feedback record')}</strong>
                        <span>{record.outcome ?? 'feedback'} - {record.sourceKind ?? record.kind ?? 'memory'}</span>
                    </div>
                    {record.reason && <p>{record.reason}</p>}
                    {record.correction && <pre>{record.correction}</pre>}
                    <footer className='memory-evidence'>
                        <span>{record.targetId ?? record.kind ?? 'context'}</span>
                        <span>{this.feedbackTimestamp(record)}</span>
                        {record.resolvedAt && <span>{nls.localize('theia/memory/feedbackResolvedAt', 'resolved {0}', new Date(record.resolvedAt).toLocaleString())}</span>}
                    </footer>
                    {!record.resolvedAt && record.id && this.feedbackApi().resolveFeedback && <div className='memory-actions'>
                        <button className='theia-button secondary' onClick={() => this.resolveFeedback(record)}>
                            <i className={codicon('check')} />
                            {nls.localize('theia/memory/resolveFeedback', 'Resolve')}
                        </button>
                    </div>}
                </article>) : <p>{nls.localize('theia/memory/noFeedbackMatch', 'No feedback records match the selected query.')}</p>}
            </div>
        </section>;
    }

    protected renderSettings(dashboard: MemoryDashboard): React.ReactNode {
        const settings = dashboard.settings;
        return <section className='memory-settings'>
            <div className='memory-section-title'>
                <h3>{nls.localize('theia/memory/settings', 'Settings')}</h3>
                <div className='memory-actions'>
                    <button className='theia-button secondary' onClick={() => this.exportSettings(dashboard)}>
                        <i className={codicon('export')} />
                        {nls.localize('theia/memory/export', 'Export')}
                    </button>
                    <label className='theia-button secondary memory-import'>
                        <i className={codicon('import')} />
                        {nls.localize('theia/memory/import', 'Import')}
                        <input type='file' accept='application/json,.json' onChange={event => this.importSettings(event)} />
                    </label>
                </div>
            </div>
            {this.renderConsentStatus(settings)}
            {this.renderToggle(settings, 'enabled', 'Enable Memory detection', 'Detects the workspace and available local capabilities. It does not index files, learn from prompts, or insert context by itself.')}
            {this.renderToggle(settings, 'graphEnabled', 'Enable local code indexing', 'Indexes local files into file, symbol, chunk, and relation data after code graph consent is granted.')}
            {this.renderToggle(settings, 'memoryEnabled', 'Enable approved memory storage', 'Stores only explicit or review-approved IDE/project memories locally. Prompt learning remains controlled separately.')}
            {this.renderToggle(settings, 'skillSuggestionsEnabled', 'Enable skill suggestion learning', 'Learns repeated minimized prompt patterns to propose reusable skills. It does not store raw prompts unless prompt snippets are separately enabled.')}
            {this.renderChatToggle(settings, 'chatLearningEnabled', 'Enable minimized AI Chat learning', 'Records minimized prompt hashes, intent, language, target, action, and metadata for skill/event learning without requiring transcript search.')}
            {this.renderChatToggle(settings, 'chatInlineSuggestionsEnabled', 'Enable AI Chat suggestion chips', 'Detects relevant context, skill, memory, and graph suggestions in AI Chat. Chips do not insert context until the user approves it.')}
            {this.renderChatToggle(settings, 'chatAutoIndexEnabled', 'Auto-index for repository questions', 'Refreshes the local index incrementally when a chat prompt appears to need files, code, tests, or repository context.')}
            {this.renderChatToggle(settings, 'chatLearningLlmEnabled', 'Enable LLM-assisted learning', 'Allows deterministic learning triggers and optional frequency rules to request suggestions from the active LLM. Context insertion still requires user approval.')}
            <label className='memory-settings-card'>
                <span>
                    <strong>{nls.localize('theia/memory/chatLearningFrequency', 'LLM learning frequency')}</strong>
                    <small>{nls.localize('theia/memory/chatLearningFrequencyDetail', '0 disables only the periodic schedule. Deterministic triggers may still use LLM when LLM chat learning is enabled.')}</small>
                </span>
                <input
                    type='number'
                    min={0}
                    max={100}
                    value={settings.chatLearningLlmFrequency ?? 0}
                    onChange={event => this.updateSettings({ chatLearningLlmFrequency: Math.max(0, Number(event.currentTarget.value) || 0) })}
                />
            </label>
            <label className='memory-settings-card'>
                <span>
                    <strong>{nls.localize('theia/memory/chatLearningModel', 'LLM learning model')}</strong>
                    <small>{nls.localize('theia/memory/chatLearningModelDetail', 'Optional model id. Empty uses the active AI Chat agent default model.')}</small>
                </span>
                <input
                    type='text'
                    value={settings.chatLearningModelId ?? ''}
                    placeholder='provider/model'
                    onChange={event => this.updateSettings({ chatLearningModelId: event.currentTarget.value.trim() || undefined })}
                />
            </label>
            {this.renderOptionalToggle(settings, 'editorHoverEnabled', 'Enable editor hover context', 'Shows indexed Memory relations and memories on C# symbols after hover/editor consent is granted.')}
            <div className='memory-settings-card'>
                <div>
                    <strong>{nls.localize('theia/memory/optIn', 'Capability consent')}</strong>
                    <small>{nls.localize('theia/memory/optInDetail', 'Choose separately what Memory may detect, index, learn from, retrieve, or use for approved context insertion.')}</small>
                </div>
                <div className='memory-option-grid'>
                    {this.renderOptInToggle(settings, 'codeGraph', 'Index code graph')}
                    {this.renderOptInToggle(settings, 'documentGraph', 'Index local docs')}
                    {this.renderOptInToggle(settings, 'projectMemory', 'Retrieve memories')}
                    {this.renderOptInToggle(settings, 'skills', 'Learn skills')}
                    {this.renderOptInToggle(settings, 'editorHover', 'Show editor hover')}
                    {this.renderOptInToggle(settings, 'events', 'Capture minimized events')}
                    {this.renderOptInToggle(settings, 'transcriptSearch', 'Transcript search')}
                    {this.renderOptInToggle(settings, 'promptSnippets', 'Store redacted prompt snippets')}
                    {this.renderOptInToggle(settings, 'pdfDocuments', 'Index PDF documents')}
                    {this.renderOptInToggle(settings, 'officeDocuments', 'Index Office documents')}
                    {this.renderOptInToggle(settings, 'images', 'Index image metadata')}
                    {this.renderOptInToggle(settings, 'diagrams', 'Index diagrams')}
                    {this.renderOptInToggle(settings, 'audioVideo', 'Index audio/video transcripts')}
                    {this.renderOptInToggle(settings, 'remoteImageSemantics', 'Use remote image semantics')}
                    {this.renderOptInToggle(settings, 'remoteMediaTranscription', 'Use remote media transcription')}
                </div>
            </div>
            {this.renderVectorSearchSettings(settings)}
            <label className='memory-settings-card memory-toggle'>
                <input type='checkbox' checked={settings.exportOptions?.includeGlobalMemories === true} onChange={event => this.updateSettings({ exportOptions: { ...settings.exportOptions, includeGlobalMemories: event.currentTarget.checked } })} />
                <span>
                    <strong>{nls.localize('theia/memory/exportGlobalMemories', 'Include IDE/global memories in workspace exports')}</strong>
                    <small>{nls.localize('theia/memory/exportGlobalMemoriesDetail', 'Off by default. Enable only when cross-workspace IDE memory should be written into exported Memory bundles.')}</small>
                </span>
            </label>
            <div className='memory-settings-card'>
                <div>
                    <strong>{nls.localize('theia/memory/retentionPolicies', 'Retention policies')}</strong>
                    <small>{nls.localize('theia/memory/retentionPoliciesDetail', 'Defaults used when session/task/transcript records do not provide an explicit policy.')}</small>
                </div>
                <div className='memory-option-grid'>
                    {this.renderRetentionSelect(settings, 'sessionMemory', 'Session memory')}
                    {this.renderRetentionSelect(settings, 'taskMemory', 'Task memory')}
                    {this.renderRetentionSelect(settings, 'transcripts', 'Transcripts')}
                    <label>
                        <span>{nls.localize('theia/memory/transcriptTtlDays', 'Transcript TTL days')}</span>
                        <input
                            type='number'
                            min={1}
                            max={365}
                            value={settings.retentionPolicies?.transcriptTtlDays ?? 30}
                            onChange={event => this.updateSettings({ retentionPolicies: { ...settings.retentionPolicies, transcriptTtlDays: Math.max(1, Number(event.currentTarget.value) || 30) } })}
                        />
                    </label>
                </div>
            </div>
            <label className='memory-settings-card'>
                <span>
                    <strong>{nls.localize('theia/memory/icmBinaryPath', 'ICM binary path')}</strong>
                    <small>{nls.localize('theia/memory/icmBinaryPathDetail', 'Optional bridge setting. Memory import/export works without launching ICM.')}</small>
                </span>
                <input
                    type='text'
                    value={settings.icmBridge?.binaryPath ?? ''}
                    placeholder='icm'
                    onChange={event => this.updateSettings({
                        icmBridge: {
                            ...settings.icmBridge,
                            binaryPath: event.currentTarget.value.trim() || undefined,
                            updatedAt: new Date().toISOString()
                        }
                    })}
                />
            </label>
            <div className='memory-settings-card'>
                <div>
                    <strong>{nls.localize('theia/memory/ignoreRules', 'Ignore rules')}</strong>
                    <small>{nls.localize('theia/memory/ignoreRulesDetail', 'Controls repository ignore files in addition to denylist, allowlist, size, binary, generated, and secret checks.')}</small>
                </div>
                <div className='memory-option-grid'>
                    <label>
                        <input type='checkbox' checked={settings.ignoreRules?.useGitignore !== false} onChange={event => this.updateSettings({ ignoreRules: { ...settings.ignoreRules, useGitignore: event.currentTarget.checked } })} />
                        <span>{nls.localize('theia/memory/useGitignore', 'Use .gitignore')}</span>
                    </label>
                    <label>
                        <input type='checkbox' checked={settings.ignoreRules?.useCyberVinciIgnore !== false} onChange={event => this.updateSettings({ ignoreRules: { ...settings.ignoreRules, useCyberVinciIgnore: event.currentTarget.checked } })} />
                        <span>{nls.localize('theia/memory/useCyberVinciIgnore', 'Use .cvignore/.cybervinciignore')}</span>
                    </label>
                </div>
            </div>
            <label className='memory-settings-card'>
                <span>
                    <strong>{nls.localize('theia/memory/denylist', 'Denylist')}</strong>
                    <small>{nls.localize('theia/memory/denylistDetail', 'One glob, folder, or path fragment per line. Allowlist entries can re-include these paths unless .cvignore or .cybervinciignore excludes them.')}</small>
                </span>
                <textarea defaultValue={(settings.denylist ?? []).join('\n')} rows={6} onBlur={event => this.updateDenylist(event.currentTarget.value)} />
            </label>
            <label className='memory-settings-card memory-toggle'>
                <input type='checkbox' checked={settings.restrictIndexingToAllowlist === true} onChange={event => this.updateSettings({ restrictIndexingToAllowlist: event.currentTarget.checked })} />
                <span>
                    <strong>{nls.localize('theia/memory/restrictIndexingToAllowlist', 'Index allowlist only')}</strong>
                    <small>{nls.localize('theia/memory/restrictIndexingToAllowlistDetail', 'When enabled, Memory indexes only paths matched by the allowlist. CyberVinci ignore files still exclude matches.')}</small>
                </span>
            </label>
            <label className='memory-settings-card'>
                <span>
                    <strong>{nls.localize('theia/memory/allowlist', 'Allowlist')}</strong>
                    <small>{nls.localize('theia/memory/allowlistDetail', 'One glob, folder, or path fragment per line. CyberVinci ignore files still take precedence.')}</small>
                </span>
                <textarea defaultValue={(settings.allowlist ?? []).join('\n')} rows={4} onBlur={event => this.updateAllowlist(event.currentTarget.value)} />
            </label>
            {this.renderPortablePackage(dashboard)}
            <button className='theia-button secondary' disabled={this.state.busy} onClick={() => this.installPortableMemory()}>
                <i className={codicon('package')} />
                {nls.localize('theia/memory/installPortableMemory', 'Install portable intelligence in project')}
            </button>
            <button className='theia-button secondary danger' disabled={this.state.busy} onClick={() => this.forgetWorkspaceLearningData()}>
                <i className={codicon('trash')} />
                {nls.localize('theia/memory/forgetWorkspaceLearning', 'Forget Prompt Learning')}
            </button>
            <button className='theia-button secondary danger' onClick={() => this.clearWorkspaceData()}>
                <i className={codicon('trash')} />
                {nls.localize('theia/memory/clearData', 'Clear Workspace Data')}
            </button>
        </section>;
    }

    protected renderPortablePackage(dashboard: MemoryDashboard): React.ReactNode {
        const portable = dashboard.portablePackage;
        if (!portable?.detected) {
            return undefined;
        }
        const counts = Object.entries(portable.counts).filter(([, value]) => value > 0).slice(0, 8);
        const policies = Object.entries(portable.policies).slice(0, 8);
        return <section className='memory-portable-package'>
            <div className='memory-section-title'>
                <h3>{nls.localize('theia/memory/portablePackageDetected', 'Portable Intelligence Package')}</h3>
                <span>{portable.version ? `v${portable.version}` : nls.localize('theia/memory/unknownVersion', 'Unknown version')}</span>
            </div>
            <div className='memory-portable-grid'>
                <div>
                    <strong>{nls.localize('theia/memory/portableOrigin', 'Origin')}</strong>
                    <span>{portable.producer ?? 'cybervinci-memory'} / {portable.source ?? 'workspace-export'}</span>
                    <small>{portable.workspacePath ?? dashboard.settings.workspacePath}</small>
                </div>
                <div>
                    <strong>{nls.localize('theia/memory/portableDate', 'Date')}</strong>
                    <span>{portable.exportedAt ? new Date(portable.exportedAt).toLocaleString() : nls.localize('theia/memory/notReported', 'Not reported')}</span>
                    <small>{portable.installedAt ? nls.localize('theia/memory/portableInstalledAt', 'Installed: {0}', new Date(portable.installedAt).toLocaleString()) : portable.installPath}</small>
                </div>
                <div>
                    <strong>{nls.localize('theia/memory/portableAuthorMachine', 'Author / machine')}</strong>
                    <span>{portable.author ?? nls.localize('theia/memory/unknownAuthor', 'Unknown author')}</span>
                    <small>{portable.machine ?? nls.localize('theia/memory/unknownMachine', 'Unknown machine')}</small>
                </div>
                <div>
                    <strong>{nls.localize('theia/memory/portableArtifacts', 'Artifacts')}</strong>
                    <span>{portable.artifactPaths.length}</span>
                    <small>{portable.artifactPaths.slice(0, 4).join(', ')}</small>
                </div>
            </div>
            <p>{portable.summary}</p>
            <div className='memory-portable-chips'>
                {policies.map(([key, value]) => <span key={key}>{key}: {String(value)}</span>)}
                {counts.map(([key, value]) => <span key={key}>{key}: {value}</span>)}
            </div>
            {portable.warnings.length > 0 && <div className='memory-evidence'>
                {portable.warnings.map(warning => <span key={warning}>{warning}</span>)}
            </div>}
            <div className='memory-portable-actions'>
                <button className='theia-button secondary' disabled={this.state.busy} onClick={() => this.managePortableMemory('ignore')}>
                    <i className={codicon('eye-closed')} />
                    {nls.localize('theia/memory/ignorePortablePackage', 'Ignore')}
                </button>
                <button className='theia-button secondary' disabled={this.state.busy} onClick={() => this.managePortableMemory('regenerate')}>
                    <i className={codicon('sync')} />
                    {nls.localize('theia/memory/regeneratePortablePackage', 'Regenerate')}
                </button>
                <button className='theia-button secondary danger' disabled={this.state.busy} onClick={() => this.managePortableMemory('remove-local-reference')}>
                    <i className={codicon('close')} />
                    {nls.localize('theia/memory/removePortableReference', 'Remove local reference')}
                </button>
            </div>
        </section>;
    }

    protected renderConsentStatus(settings: MemoryWorkspaceSettings): React.ReactNode {
        const enabled = settings.enabled === true;
        const items = this.capabilityStatusItems(settings);
        return <div className={enabled ? 'memory-consent-status enabled' : 'memory-consent-status'}>
            <div>
                <strong>{enabled
                    ? nls.localize('theia/memory/consentEnabledTitle', 'Consent recorded for this workspace')
                    : nls.localize('theia/memory/consentInitialTitle', 'Consent required before indexing, learning, or inserting context')}</strong>
                <small>{enabled
                    ? nls.localize('theia/memory/consentEnabledDetail', 'Detection, indexing, learning, retrieval, and context insertion are controlled separately by the capabilities below.')
                    : nls.localize('theia/memory/consentInitialDetail', 'Memory starts disabled. Turn on detection first, then explicitly allow each sensitive capability before CyberVinci indexes files, learns from chat, or inserts approved context.')}</small>
            </div>
            <div className='memory-consent-grid'>
                {items.map(item => <span key={item.label} className={item.status} title={item.detail}>
                    <i className={codicon(this.capabilityStatusIcon(item.status))} />
                    {item.label}: {this.capabilityStatusLabel(item.status)}
                </span>)}
            </div>
        </div>;
    }

    protected capabilityStatusItems(settings: MemoryWorkspaceSettings): MemoryCapabilityStatusItem[] {
        const workspaceEnabled = settings.enabled === true;
        const requiresWorkspaceConsent = (status: MemoryCapabilityStatus): MemoryCapabilityStatus => workspaceEnabled ? status : 'requires-consent';
        const sensitiveDocsEnabled = [
            settings.optIn?.pdfDocuments,
            settings.optIn?.officeDocuments,
            settings.optIn?.images,
            settings.optIn?.diagrams,
            settings.optIn?.audioVideo,
            settings.optIn?.externalDocCollections
        ].some(Boolean);
        return [
            {
                label: nls.localize('theia/memory/consentProject', 'Memory'),
                status: workspaceEnabled ? 'enabled' : 'disabled'
            },
            {
                label: nls.localize('theia/memory/consentCodeGraph', 'Code graph/indexing'),
                status: requiresWorkspaceConsent(this.capabilityStatus(settings.graphEnabled === true, settings.optIn?.codeGraph === true))
            },
            {
                label: nls.localize('theia/memory/consentCsharpAnalysis', 'C# semantic analysis'),
                status: requiresWorkspaceConsent(this.csharpAnalysisCapabilityStatus(settings)),
                detail: nls.localize('theia/memory/consentCsharpAnalysisDetail', 'Reports Roslyn semantic mode, structural fallback, or unavailable when no C# files are indexed.')
            },
            {
                label: nls.localize('theia/memory/consentMemory', 'Memory learning'),
                status: requiresWorkspaceConsent(this.capabilityStatus(settings.memoryEnabled === true, settings.optIn?.projectMemory === true))
            },
            {
                label: nls.localize('theia/memory/consentChatLearning', 'Chat learning'),
                status: requiresWorkspaceConsent(settings.chatLearningEnabled === true ? 'enabled' : 'disabled')
            },
            {
                label: nls.localize('theia/memory/consentPromptSnippets', 'Redacted prompt snippets'),
                status: requiresWorkspaceConsent(settings.optIn?.promptSnippets === true ? 'enabled' : 'requires-consent')
            },
            {
                label: nls.localize('theia/memory/consentSkillSuggestions', 'Skill suggestions'),
                status: requiresWorkspaceConsent(this.capabilityStatus(settings.skillSuggestionsEnabled === true, settings.optIn?.skills === true))
            },
            {
                label: nls.localize('theia/memory/consentContextCart', 'Context Cart'),
                status: requiresWorkspaceConsent(settings.optIn?.contextCart === true ? 'enabled' : 'requires-consent')
            },
            {
                label: nls.localize('theia/memory/consentEditorHover', 'Hover/editor'),
                status: requiresWorkspaceConsent(this.capabilityStatus(settings.editorHoverEnabled === true, settings.optIn?.editorHover === true))
            },
            {
                label: nls.localize('theia/memory/consentEvents', 'Event capture'),
                status: requiresWorkspaceConsent(settings.optIn?.events === true ? 'enabled' : 'requires-consent')
            },
            {
                label: nls.localize('theia/memory/consentSensitiveDocs', 'Sensitive local documents'),
                status: requiresWorkspaceConsent(sensitiveDocsEnabled ? 'enabled' : 'requires-consent')
            },
            {
                label: nls.localize('theia/memory/consentVectorSearch', 'Vector retrieval'),
                status: requiresWorkspaceConsent(this.vectorSearchCapabilityStatus(settings))
            }
        ];
    }

    protected capabilityStatus(capabilityEnabled: boolean, consentGranted: boolean): MemoryCapabilityStatus {
        if (capabilityEnabled && consentGranted) {
            return 'enabled';
        }
        if (capabilityEnabled && !consentGranted) {
            return 'requires-consent';
        }
        return 'disabled';
    }

    protected csharpAnalysisCapabilityStatus(settings: MemoryWorkspaceSettings): MemoryCapabilityStatus {
        if (settings.graphEnabled !== true) {
            return 'disabled';
        }
        if (settings.optIn?.codeGraph !== true) {
            return 'requires-consent';
        }
        const dashboard = this.state.dashboard;
        const csharpFileIds = new Set((dashboard?.files ?? []).filter(file => file.languageId === 'csharp').map(file => file.id));
        if (!csharpFileIds.size) {
            return 'unavailable';
        }
        const csharpSymbols = (dashboard?.symbols ?? []).filter(symbol => csharpFileIds.has(symbol.fileId));
        const csharpRelations = (dashboard?.relations ?? []).filter(relation => {
            const source = csharpSymbols.find(symbol => symbol.id === relation.sourceId);
            const target = csharpSymbols.find(symbol => symbol.id === relation.targetId);
            return !!source || !!target;
        });
        if (csharpSymbols.some(symbol => symbol.metadata?.analysisMode === 'msbuild-workspace')
            || csharpRelations.some(relation => relation.metadata?.analysisMode === 'msbuild-workspace')) {
            return 'enabled';
        }
        if (csharpSymbols.length || csharpRelations.length) {
            return 'fallback';
        }
        return 'unavailable';
    }

    protected vectorSearchCapabilityStatus(settings: MemoryWorkspaceSettings): MemoryCapabilityStatus {
        if (settings.optIn?.vectorSearch !== true) {
            return 'requires-consent';
        }
        const status = this.state.vectorSearchStatus;
        if (!status || status.available === false || status.status === 'unavailable') {
            return 'fallback';
        }
        return status.enabled === false ? 'disabled' : 'enabled';
    }

    protected capabilityStatusLabel(status: MemoryCapabilityStatus): string {
        switch (status) {
            case 'disabled':
                return nls.localize('theia/memory/statusDisabled', 'disabled');
            case 'enabled':
                return nls.localize('theia/memory/statusEnabled', 'enabled');
            case 'requires-consent':
                return nls.localize('theia/memory/statusRequiresConsent', 'requires consent');
            case 'fallback':
                return nls.localize('theia/memory/statusFallback', 'fallback');
            case 'unavailable':
                return nls.localize('theia/memory/statusUnavailable', 'unavailable');
        }
    }

    protected capabilityStatusIcon(status: MemoryCapabilityStatus): string {
        switch (status) {
            case 'enabled':
                return 'check';
            case 'requires-consent':
                return 'lock';
            case 'fallback':
                return 'warning';
            case 'unavailable':
                return 'circle-slash';
            case 'disabled':
            default:
                return 'debug-stop';
        }
    }

    protected renderToggle(settings: MemoryWorkspaceSettings, key: keyof Pick<MemoryWorkspaceSettings, 'enabled' | 'graphEnabled' | 'memoryEnabled' | 'skillSuggestionsEnabled'>, label: string, detail: string): React.ReactNode {
        return <label className='memory-toggle'>
            <input type='checkbox' checked={settings[key]} onChange={event => this.updateSettings({ [key]: event.currentTarget.checked })} />
            <span>
                <strong>{label}</strong>
                <small>{detail}</small>
            </span>
        </label>;
    }

    protected renderOptionalToggle(settings: MemoryWorkspaceSettings, key: 'editorHoverEnabled', label: string, detail: string): React.ReactNode {
        return <label className='memory-toggle'>
            <input type='checkbox' checked={settings[key] ?? true} onChange={event => this.updateSettings({ [key]: event.currentTarget.checked })} />
            <span>
                <strong>{label}</strong>
                <small>{detail}</small>
            </span>
        </label>;
    }

    protected renderChatToggle(
        settings: MemoryWorkspaceSettings,
        key: 'chatLearningEnabled' | 'chatInlineSuggestionsEnabled' | 'chatAutoIndexEnabled' | 'chatLearningLlmEnabled',
        label: string,
        detail: string
    ): React.ReactNode {
        return <label className='memory-toggle'>
            <input type='checkbox' checked={settings[key] ?? true} onChange={event => this.updateSettings({ [key]: event.currentTarget.checked })} />
            <span>
                <strong>{label}</strong>
                <small>{detail}</small>
            </span>
        </label>;
    }

    protected renderOptInToggle(settings: MemoryWorkspaceSettings, key: Exclude<keyof NonNullable<MemoryWorkspaceSettings['optIn']>, 'remoteImageSemanticsConsentAt' | 'remoteMediaTranscriptionConsentAt'>, label: string): React.ReactNode {
        const defaultChecked = ['vectorSearch', 'transcriptSearch', 'promptSnippets', 'pdfDocuments', 'officeDocuments', 'images', 'diagrams', 'audioVideo', 'remoteImageSemantics', 'remoteMediaTranscription'].includes(key) ? false : true;
        const checked = settings.optIn?.[key] ?? defaultChecked;
        return <label>
            <input type='checkbox' checked={checked} onChange={event => {
                const enabled = event.currentTarget.checked;
                this.updateWorkspaceConsent(settings, key, enabled);
            }} />
            <span>{label}</span>
        </label>;
    }

    protected renderVectorSearchSettings(settings: MemoryWorkspaceSettings): React.ReactNode {
        const enabled = settings.optIn?.vectorSearch ?? false;
        const status = this.state.vectorSearchStatus;
        const backfillAvailable = this.vectorBackfillAvailable();
        return <div className='memory-settings-card memory-vector-settings'>
            <div className='memory-vector-header'>
                <label className='memory-vector-toggle'>
                    <input
                        type='checkbox'
                        checked={enabled}
                        onChange={event => this.updateVectorSearchOptIn(settings, event.currentTarget.checked)}
                    />
                    <span>
                        <strong>{nls.localize('theia/memory/vectorSearch', 'Enable vector search')}</strong>
                        <small>{nls.localize('theia/memory/vectorSearchDetail', 'Optional semantic retrieval. No model is downloaded silently; BM25 remains the fallback path.')}</small>
                    </span>
                </label>
                <span className={enabled ? 'memory-vector-badge enabled' : 'memory-vector-badge'}>
                    {enabled ? nls.localize('theia/memory/vectorOptedIn', 'Opted in') : nls.localize('theia/memory/vectorOff', 'Off by default')}
                </span>
            </div>
            <div className='memory-vector-status'>
                <div>
                    <strong>{nls.localize('theia/memory/vectorModel', 'Local-only model')}</strong>
                    <small>{this.vectorSearchModelLabel(status)}</small>
                </div>
                <div>
                    <strong>{nls.localize('theia/memory/vectorIndex', 'Vector index')}</strong>
                    <small>{this.vectorSearchIndexLabel(status)}</small>
                </div>
                <div>
                    <strong>{nls.localize('theia/memory/vectorFallback', 'Fallback')}</strong>
                    <small>{nls.localize('theia/memory/vectorFallbackDetail', 'BM25 / local FTS active')}</small>
                </div>
            </div>
            <div className='memory-actions'>
                <button className='theia-button secondary' disabled={this.state.vectorSearchBusy} onClick={() => this.refreshVectorSearchStatus()}>
                    <i className={codicon('refresh')} />
                    {nls.localize('theia/memory/vectorRefresh', 'Refresh status')}
                </button>
                <button className='theia-button secondary' disabled={!enabled || !backfillAvailable || this.state.vectorSearchBusy} onClick={() => this.backfillVectorSearch()}>
                    <i className={codicon('database')} />
                    {this.state.vectorSearchBusy ? nls.localizeByDefault('Loading...') : nls.localize('theia/memory/vectorBackfill', 'Backfill')}
                </button>
            </div>
            <small>{this.state.vectorSearchMessage ?? this.vectorSearchStatusLabel(status, backfillAvailable)}</small>
        </div>;
    }

    protected renderRetentionSelect(
        settings: MemoryWorkspaceSettings,
        key: keyof NonNullable<MemoryWorkspaceSettings['retentionPolicies']>,
        label: string
    ): React.ReactNode {
        if (key === 'transcriptTtlDays') {
            return undefined;
        }
        const value = settings.retentionPolicies?.[key] ?? (key === 'sessionMemory' ? 'session' : key === 'taskMemory' ? 'task' : 'manual');
        return <label>
            <span>{label}</span>
            <select value={String(value)} onChange={event => this.updateSettings({ retentionPolicies: { ...settings.retentionPolicies, [key]: event.currentTarget.value as MemoryRetentionPolicy } })}>
                <option value='session'>session</option>
                <option value='task'>task</option>
                <option value='ttl'>ttl</option>
                <option value='manual'>manual</option>
                <option value='permanent'>permanent</option>
            </select>
        </label>;
    }

    protected updateGraphFilter(key: GraphBooleanFilter, value: boolean): void {
        this.setState({ graphFilters: { ...this.state.graphFilters, [key]: value } });
    }

    protected updateGraphDepth(depth: number): void {
        this.setState({ graphFilters: { ...this.state.graphFilters, depth } });
    }

    protected filterGraph(graph: MemoryGraph, dashboard: MemoryDashboard, impactMode: boolean): GraphView {
        const depthLimit = Math.max(30, this.state.graphFilters.depth * (impactMode ? 50 : 70));
        const filteredNodes = graph.nodes
            .filter(node => this.shouldShowNode(node, dashboard))
            .slice(0, depthLimit);
        const ids = new Set(filteredNodes.map(node => node.id));
        const filteredEdges = graph.edges.filter(edge => ids.has(edge.sourceId) && ids.has(edge.targetId) && this.shouldShowRelation(edge));
        return { nodes: filteredNodes, edges: filteredEdges };
    }

    protected shouldShowNode(node: MemoryGraphNode, dashboard: MemoryDashboard): boolean {
        if (this.state.graphFilters.riskOnly && !this.isRiskNode(node, dashboard)) {
            return false;
        }
        const categories = this.nodeCategories(node);
        if (!categories.size) {
            return true;
        }
        return Array.from(categories).some(category => this.state.graphFilters[category]);
    }

    protected shouldShowRelation(edge: MemoryGraphEdge): boolean {
        const categories = this.relationCategories(edge);
        if (!categories.size) {
            return true;
        }
        return Array.from(categories).some(category => this.state.graphFilters[category]);
    }

    protected nodeCategories(node: MemoryGraphNode): Set<Exclude<GraphBooleanFilter, 'riskOnly'>> {
        const text = `${node.label} ${node.detail ?? ''} ${(node.semanticTags ?? []).join(' ')}`.toLowerCase();
        const categories = new Set<Exclude<GraphBooleanFilter, 'riskOnly'>>();
        if (node.kind === 'memory') {
            categories.add('memories');
        }
        if (node.kind === 'doc') {
            categories.add('docs');
        }
        if (/\b(endpoint|controller|route|http|get|post|put|delete)\b/.test(text)) {
            categories.add('endpoints');
        }
        if (/\b(service|handler|processor|manager)\b/.test(text)) {
            categories.add('services');
        }
        if (/\b(repository|repo|dao|store)\b/.test(text)) {
            categories.add('repositories');
        }
        if (/\b(test|tests|spec|fixture|fact|theory)\b/.test(text)) {
            categories.add('tests');
        }
        if (/\b(hub|broker|bus|queue|topic)\b/.test(text)) {
            categories.add('hubs');
        }
        if (/\b(bridge|adapter|gateway|integration|connector)\b/.test(text)) {
            categories.add('bridges');
        }
        return categories;
    }

    protected relationCategories(edge: MemoryGraphEdge): Set<Exclude<GraphBooleanFilter, 'riskOnly'>> {
        const categories = new Set<Exclude<GraphBooleanFilter, 'riskOnly'>>();
        switch (edge.relationType) {
            case 'calls':
                categories.add('calls');
                break;
            case 'inherits':
            case 'implements':
            case 'overrides':
                categories.add('types');
                break;
            case 'injects':
            case 'uses_dependency':
                categories.add('dependencyInjection');
                categories.add('services');
                break;
            case 'maps_to_endpoint':
            case 'handles':
            case 'exposes':
                categories.add('endpoints');
                break;
            case 'uses_db_context':
            case 'uses_entity':
            case 'reads_from':
            case 'writes_to':
                categories.add('dataModel');
                break;
            case 'tests':
            case 'tested_by':
            case 'covers':
            case 'misses_coverage':
            case 'flakes_with':
                categories.add('tests');
                break;
            case 'related_to_memory':
                categories.add('memories');
                break;
            case 'related_to_doc':
            case 'documents':
                categories.add('docs');
                break;
            default:
                break;
        }
        return categories;
    }

    protected isRiskNode(node: MemoryGraphNode, dashboard: MemoryDashboard): boolean {
        if ((node.riskScore ?? 0) >= 0.5 || node.changeStatus === 'modified' || node.changeStatus === 'deleted') {
            return true;
        }
        const target = this.resolveNodeTarget(node, dashboard);
        const file = target ? dashboard.files.find(candidate => candidate.relativePath === target.relativePath) : undefined;
        return !!file && (file.isSensitive || file.isGenerated || file.isIgnored);
    }

    protected layoutGraph(nodes: MemoryGraphNode[]): Map<string, { x: number; y: number }> {
        const layout = new Map<string, { x: number; y: number }>();
        const count = Math.max(nodes.length, 1);
        const centerX = 450;
        const centerY = 230;
        nodes.forEach((node, index) => {
            if (index === 0) {
                layout.set(node.id, { x: centerX, y: centerY });
                return;
            }
            const angle = (Math.PI * 2 * index) / count;
            const radius = 95 + (index % 4) * 42;
            layout.set(node.id, {
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius
            });
        });
        return layout;
    }

    protected nodeRadius(node: MemoryGraphNode): number {
        if (node.changeStatus === 'modified') {
            return 31;
        }
        return node.kind === 'file' ? 28 : node.kind === 'symbol' ? 23 : 25;
    }

    protected nodeIcon(node: MemoryGraphNode): string {
        switch (node.kind) {
            case 'file':
                return 'file-code';
            case 'symbol':
                return 'symbol-method';
            case 'doc':
                return 'book';
            case 'skill':
                return 'sparkle';
            case 'memory':
                return 'database';
            default:
                return 'circle-filled';
        }
    }

    protected shortLabel(label: string): string {
        return label.length > 18 ? `${label.slice(0, 16)}..` : label;
    }

    protected sourceLabel(sourceKind: string): string {
        switch (sourceKind) {
            case 'local-docs':
                return 'Local versioned docs';
            case 'code-graph':
                return 'Code graph';
            case 'project-memory':
                return 'Project memory';
            case 'repository-memory':
                return 'Repository memory';
            case 'feedback-record':
                return 'Feedback record';
            default:
                return sourceKind;
        }
    }

    protected skillSuggestionSources(candidate: MemorySkillCandidate, events: MemoryEvent[]): MemorySkillSuggestionSource[] {
        const sources = new Set<MemorySkillSuggestionSource>(candidate.generationSources ?? []);
        const relatedEvents = events.filter(event => event.promptSignature === candidate.signature || event.payload?.includes(candidate.id));
        for (const event of relatedEvents) {
            this.addSkillSuggestionSourcesFromText(sources, `${event.eventType} ${event.payload ?? ''}`);
        }
        this.addSkillSuggestionSourcesFromText(sources, `${candidate.description} ${candidate.statusReason ?? ''} ${candidate.proposedSkillJson ?? ''}`);
        return sources.size ? [...sources] : ['event'];
    }

    protected addSkillSuggestionSourcesFromText(sources: Set<MemorySkillSuggestionSource>, value: string): void {
        const text = value.toLowerCase();
        if (/\b(code[-_ ]?graph|symbol|relation|blast radius|impact)\b/.test(text)) {
            sources.add('code-graph');
        }
        if (/\b(memory|memoria|memória|project-memory|repository-memory|task-memory)\b/.test(text)) {
            sources.add('memory');
        }
        if (/\b(doc|docs|documentation|local-docs|external-docs)\b/.test(text)) {
            sources.add('docs');
        }
        if (/\b(event|prompt|chat-learning|audit|terminal|build|test)\b/.test(text)) {
            sources.add('event');
        }
        if (/\b(skill|skills)\b/.test(text)) {
            sources.add('skill');
        }
    }

    protected skillSuggestionSourceLabel(source: MemorySkillSuggestionSource): string {
        switch (source) {
            case 'code-graph':
                return 'Code graph';
            case 'memory':
                return 'Memory';
            case 'docs':
                return 'Docs';
            case 'skill':
                return 'Skill';
            case 'event':
            default:
                return 'Event';
        }
    }

    protected skillSuggestionSourceTitle(source: MemorySkillSuggestionSource): string {
        return nls.localize(
            `theia/memory/skillSuggestionSource/${source}`,
            'Generated from {0}.',
            this.skillSuggestionSourceLabel(source).toLowerCase()
        );
    }

    protected buildImpactGraph(dashboard: MemoryDashboard): MemoryGraph {
        const changedFiles = this.changedFiles(dashboard);
        const changedIds = new Set(changedFiles.map(file => file.id));
        const relationIds = new Set<string>();
        const nodeIds = new Set<string>(changedIds);
        for (let depth = 0; depth < this.state.graphFilters.depth; depth++) {
            for (const relation of dashboard.relations) {
                if (nodeIds.has(relation.sourceId) || nodeIds.has(relation.targetId)) {
                    relationIds.add(relation.id);
                    nodeIds.add(relation.sourceId);
                    nodeIds.add(relation.targetId);
                }
            }
        }
        if (!nodeIds.size) {
            for (const relation of dashboard.relations.filter(relation => relation.relationType === 'tests' || relation.relationType === 'tested_by').slice(0, 80)) {
                relationIds.add(relation.id);
                nodeIds.add(relation.sourceId);
                nodeIds.add(relation.targetId);
            }
            for (const file of dashboard.files.filter(candidate => candidate.isSensitive || candidate.isGenerated).slice(0, 20)) {
                nodeIds.add(file.id);
            }
        }
        const memoryNodes = dashboard.memories
            .filter(memory => memory.status === 'active')
            .filter(memory => changedFiles.some(file => `${memory.title} ${memory.content}`.toLowerCase().includes(file.fileName.toLowerCase())))
            .slice(0, 20)
            .map(memory => ({
                id: memory.id,
                kind: 'memory' as const,
                label: memory.title,
                detail: memory.memoryType,
                source: 'project-memory' as const,
                staleStatus: memory.staleStatus,
                changeStatus: 'impacted' as const
            }));
        return {
            title: 'Graph Diff and Impact',
            nodes: [
                ...dashboard.files.filter(file => nodeIds.has(file.id)).map(file => this.fileNode(file, changedIds.has(file.id) ? 'modified' : 'impacted')),
                ...dashboard.symbols.filter(symbol => nodeIds.has(symbol.id)).map(symbol => this.symbolNode(symbol, dashboard, changedIds.has(symbol.fileId) ? 'modified' : 'impacted')),
                ...memoryNodes
            ],
            edges: dashboard.relations
                .filter(relation => relationIds.has(relation.id))
                .map(relation => ({
                    id: relation.id,
                    sourceId: relation.sourceId,
                    targetId: relation.targetId,
                    relationType: relation.relationType,
                    confidenceScore: relation.confidenceScore
                }))
        };
    }

    protected impactCompactContext(dashboard: MemoryDashboard, graph: MemoryGraph): {
        summary: string;
        recommendedContext: MemoryPullRequestRecommendedContext[];
        citations: MemoryAnalysisCitation[];
    } {
        const changedFiles = this.changedFiles(dashboard);
        const changedIds = new Set(changedFiles.map(file => file.id));
        const symbolFileIds = new Set(dashboard.symbols.filter(symbol => graph.nodes.some(node => node.id === symbol.id)).map(symbol => symbol.fileId));
        const contextFiles = dashboard.files
            .filter(file => changedIds.has(file.id) || symbolFileIds.has(file.id) || graph.nodes.some(node => node.id === file.id))
            .filter(file => !file.isSensitive)
            .slice(0, 8);
        const memories = dashboard.memories
            .filter(memory => graph.nodes.some(node => node.id === memory.id))
            .slice(0, 8);
        const relations = dashboard.relations
            .filter(relation => graph.edges.some(edge => edge.id === relation.id))
            .slice(0, 12);
        const recommendedContext: MemoryPullRequestRecommendedContext[] = [
            ...contextFiles.map(file => ({
                id: `file:${file.relativePath}`,
                sourceKind: 'code' as const,
                title: file.relativePath,
                uri: file.relativePath,
                score: file.isGenerated ? 0.55 : 0.7,
                evidence: this.fileRiskLabel(file),
                reason: changedIds.has(file.id) ? 'Changed file in current indexed impact view.' : 'Impacted file connected by graph relations.'
            })),
            ...memories.map(memory => ({
                id: memory.id,
                sourceKind: memory.scope === 'repository' ? 'repository-memory' as const : 'project-memory' as const,
                title: memory.title,
                score: Math.min(1, memory.weight),
                evidence: memory.evidence ?? memory.memoryType,
                reason: `Impacted ${memory.scope} memory; stale=${memory.staleStatus}; importance=${memory.importance}.`
            }))
        ].sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
        const citations: MemoryAnalysisCitation[] = [
            ...contextFiles.map(file => ({
                id: file.id,
                kind: 'file' as const,
                title: file.relativePath,
                uri: file.relativePath,
                sourceKind: 'code' as const,
                reason: 'File included in compact impact context.'
            })),
            ...dashboard.symbols
                .filter(symbol => symbolFileIds.has(symbol.fileId))
                .slice(0, 12)
                .map(symbol => ({
                    id: symbol.id,
                    kind: 'symbol' as const,
                    title: symbol.fullName ?? symbol.name,
                    uri: dashboard.files.find(file => file.id === symbol.fileId)?.relativePath,
                    sourceKind: 'code-graph' as const,
                    reason: 'Symbol appears in the impact graph.'
                })),
            ...memories.map(memory => ({
                id: memory.id,
                kind: 'memory' as const,
                title: memory.title,
                scope: memory.scope,
                sourceKind: memory.scope === 'repository' ? 'repository-memory' as const : 'project-memory' as const,
                evidence: memory.evidence,
                reason: 'Memory appears in the impact graph.'
            })),
            ...relations.map(relation => ({
                id: relation.id,
                kind: 'relation' as const,
                title: `${relation.sourceId} ${relation.relationType} ${relation.targetId}`,
                sourceKind: 'code-graph' as const,
                evidence: relation.evidence,
                reason: 'Relation appears in the impact graph.'
            }))
        ];
        return {
            summary: `${changedFiles.length} changed file(s), ${graph.nodes.length} affected node(s), ${relations.length} cited relation(s).`,
            recommendedContext,
            citations: [...new Map(citations.map(citation => [`${citation.kind}:${citation.id}`, citation])).values()]
        };
    }

    protected changedFiles(dashboard: MemoryDashboard): MemoryFile[] {
        const editedPaths = new Set(dashboard.events
            .filter(event => event.eventType === 'file.edited' && event.relativePath)
            .map(event => event.relativePath!));
        return dashboard.files.filter(file => editedPaths.has(file.relativePath));
    }

    protected fileNode(file: MemoryFile, changeStatus: MemoryGraphNode['changeStatus']): MemoryGraphNode {
        return {
            id: file.id,
            kind: 'file',
            label: file.fileName,
            detail: file.relativePath,
            source: 'code',
            relativePath: file.relativePath,
            riskScore: file.isSensitive ? 0.95 : file.isGenerated ? 0.65 : 0.25,
            changeStatus
        };
    }

    protected symbolNode(symbol: MemorySymbol, dashboard: MemoryDashboard, changeStatus: MemoryGraphNode['changeStatus']): MemoryGraphNode {
        const file = dashboard.files.find(candidate => candidate.id === symbol.fileId);
        return {
            id: symbol.id,
            kind: 'symbol',
            label: symbol.name,
            detail: symbol.signature ?? symbol.fullName ?? symbol.symbolKind,
            source: 'code-graph',
            relativePath: file?.relativePath,
            line: symbol.startLine,
            semanticTags: [symbol.symbolKind],
            riskScore: symbol.symbolKind === 'test_method' ? 0.2 : undefined,
            changeStatus
        };
    }

    protected impactSummaries(dashboard: MemoryDashboard, graph: MemoryGraph): Array<{ title: string; count: number; detail: string }> {
        const relationCount = (type: MemoryRelation['relationType']) => graph.edges.filter(edge => edge.relationType === type).length;
        return [
            { title: 'Direct relations', count: graph.edges.length, detail: 'Relations traversed from changed files within the selected depth.' },
            { title: 'Test coverage hints', count: relationCount('tests') + relationCount('tested_by'), detail: 'Tests or tested-by links found in the affected subgraph.' },
            { title: 'Memory links', count: graph.nodes.filter(node => node.kind === 'memory').length, detail: 'Active project memories matching changed file names.' },
            { title: 'Risk candidates', count: graph.nodes.filter(node => this.isRiskNode(node, dashboard)).length, detail: 'Sensitive, generated, ignored, or directly changed nodes.' }
        ];
    }

    protected fileRiskLabel(file: MemoryFile): string {
        if (file.ignoreReason) {
            return file.ignoreReason.kind;
        }
        if (file.isSensitive) {
            return 'sensitive';
        }
        if (file.isGenerated) {
            return 'generated';
        }
        if (file.isIgnored) {
            return 'ignored';
        }
        return 'modified';
    }

    protected nodeRelations(node: MemoryGraphNode, dashboard: MemoryDashboard, graph?: MemoryGraph): NodeRelationFact[] {
        const facts: NodeRelationFact[] = dashboard.relations
            .filter(relation => relation.sourceId === node.id || relation.targetId === node.id)
            .map(relation => ({
                id: relation.id,
                relationType: relation.relationType,
                confidenceScore: relation.confidenceScore
            }));
        for (const edge of graph?.edges ?? []) {
            if ((edge.sourceId === node.id || edge.targetId === node.id) && !facts.some(fact => fact.id === edge.id)) {
                facts.push({
                    id: edge.id,
                    relationType: edge.relationType,
                    confidenceScore: edge.confidenceScore
                });
            }
        }
        return facts;
    }

    protected relatedMemories(node: MemoryGraphNode, dashboard: MemoryDashboard): MemoryDashboard['memories'] {
        const terms = [node.label, node.detail ?? '', this.resolveNodeTarget(node, dashboard)?.relativePath ?? '']
            .flatMap(value => value.split(/[^A-Za-z0-9_]+/))
            .filter(value => value.length > 3)
            .map(value => value.toLowerCase());
        return dashboard.memories.filter(memory => {
            const haystack = `${memory.title} ${memory.content} ${memory.memoryType}`.toLowerCase();
            return terms.some(term => haystack.includes(term));
        });
    }

    protected resolveNodeTarget(node: MemoryGraphNode, dashboard: MemoryDashboard): ResolvedNodeTarget | undefined {
        if (node.relativePath) {
            return { relativePath: node.relativePath, line: node.line };
        }
        if (node.kind === 'file') {
            const file = dashboard.files.find(candidate => candidate.id === node.id)
                ?? dashboard.files.find(candidate => candidate.relativePath === node.detail)
                ?? dashboard.files.find(candidate => candidate.fileName === node.label);
            return file ? { relativePath: file.relativePath } : undefined;
        }
        if (node.kind === 'symbol') {
            const symbol = dashboard.symbols.find(candidate => candidate.id === node.id)
                ?? dashboard.symbols.find(candidate => candidate.name === node.label && (!node.detail || candidate.symbolKind === node.detail));
            const file = symbol ? dashboard.files.find(candidate => candidate.id === symbol.fileId) : undefined;
            return file ? { relativePath: file.relativePath, line: symbol?.startLine } : undefined;
        }
        return undefined;
    }

    protected async openNode(node: MemoryGraphNode, dashboard: MemoryDashboard): Promise<void> {
        const target = this.resolveNodeTarget(node, dashboard);
        if (!target) {
            return;
        }
        const uri = FileUri.create(this.absolutePath(dashboard.settings.workspacePath, target.relativePath));
        await open(this.openerService, uri, target.line ? { selection: { start: { line: target.line - 1, character: 0 } } } : undefined);
    }

    protected async addNodeToContext(node: MemoryGraphNode, dashboard: MemoryDashboard): Promise<void> {
        const target = this.resolveNodeTarget(node, dashboard);
        if (!target) {
            return;
        }
        try {
            await this.commandService.executeCommand(MemoryWidget.ADD_CONTEXT_VARIABLE_COMMAND, 'file', target.relativePath);
        } catch {
            // The local event keeps this usable in builds where the chat Context Cart is not installed.
        }
        window.dispatchEvent(new CustomEvent('memory:add-context', {
            detail: {
                kind: 'file',
                relativePath: target.relativePath,
                source: 'memory'
            }
        }));
        this.messageService.info(nls.localize('theia/memory/contextAdded', 'Added {0} to the Context Cart.', target.relativePath));
    }

    protected skillCounts(candidates: MemorySkillCandidate[]): { pending: number; deletePending: number } {
        return {
            pending: candidates.filter(candidate => candidate.status === 'suggested' || candidate.status === 'tracking' || candidate.status === 'delete_pending').length,
            deletePending: candidates.filter(candidate => candidate.status === 'delete_pending').length
        };
    }

    protected skillVisible(candidate: MemorySkillCandidate): boolean {
        if (this.state.skillStatusFilter === 'all') {
            return true;
        }
        if (this.state.skillStatusFilter === 'pending') {
            return candidate.status === 'suggested' || candidate.status === 'tracking' || candidate.status === 'delete_pending';
        }
        return candidate.status === this.state.skillStatusFilter;
    }

    protected switchTab(tab: MemoryTab): void {
        this.setState({ activeTab: tab, selectedNodeId: undefined });
        if (tab === 'feedback') {
            this.refreshFeedback().catch(error => this.messageService.error(error instanceof Error ? error.message : String(error)));
        }
        if (tab === 'settings') {
            this.refreshVectorSearchStatus().catch(error => this.messageService.error(error instanceof Error ? error.message : String(error)));
        }
    }

    protected async runBenchmarks(): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        this.setState({ benchmarkBusy: true, benchmarkError: undefined });
        try {
            const benchmarkReport = await this.memoryService.runBenchmarks({
                workspacePath,
                limit: 12
            });
            this.setState({ benchmarkReport, benchmarkBusy: false });
            await this.refresh('benchmarks');
        } catch (error) {
            this.setState({
                benchmarkBusy: false,
                benchmarkError: error instanceof Error ? error.message : String(error)
            });
        }
    }

    protected async refreshFeedback(): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const feedbackApi = this.feedbackApi();
        if (!feedbackApi.searchFeedback && !feedbackApi.listFeedback) {
            this.setState({ feedbackRecords: undefined, feedbackError: undefined });
            return;
        }
        this.setState({ feedbackBusy: true, feedbackError: undefined });
        try {
            const request = {
                workspacePath,
                query: this.state.feedbackSearchQuery.trim() || undefined,
                limit: 100
            };
            const response = feedbackApi.searchFeedback
                ? await feedbackApi.searchFeedback(request)
                : await feedbackApi.listFeedback!(request);
            this.setState({
                feedbackBusy: false,
                feedbackRecords: this.normalizeFeedbackRecords(response)
            });
        } catch (error) {
            this.setState({
                feedbackBusy: false,
                feedbackError: error instanceof Error ? error.message : String(error)
            });
        }
    }

    protected feedbackApi(): OptionalMemoryFeedbackApi {
        return this.memoryService as unknown as OptionalMemoryFeedbackApi;
    }

    protected feedbackApiAvailable(): boolean {
        const feedbackApi = this.feedbackApi();
        return typeof feedbackApi.searchFeedback === 'function' || typeof feedbackApi.listFeedback === 'function';
    }

    protected knowledgeApi(): OptionalMemoryKnowledgeApi {
        return this.memoryService as unknown as OptionalMemoryKnowledgeApi;
    }

    protected vectorApi(): OptionalMemoryVectorApi {
        return this.memoryService as unknown as OptionalMemoryVectorApi;
    }

    protected async refreshVectorSearchStatus(): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        this.setState({ vectorSearchBusy: true, vectorSearchMessage: undefined });
        const status = await this.loadVectorSearchStatus(workspacePath);
        this.setState({
            vectorSearchBusy: false,
            vectorSearchStatus: status,
            vectorSearchMessage: status?.message
        });
    }

    protected async loadVectorSearchStatus(workspacePath: string): Promise<MemoryVectorSearchStatus> {
        const api = this.vectorApi();
        const statusMethod = api.getVectorSearchStatus ?? api.getVectorIndexStatus;
        if (api.getVectorStatus) {
            try {
                return this.normalizeVectorSearchStatus(await api.getVectorStatus(workspacePath));
            } catch (error) {
                return {
                    available: false,
                    enabled: false,
                    status: 'unavailable',
                    localOnly: true,
                    message: nls.localize(
                        'theia/memory/vectorStatusFailed',
                        'Vector status unavailable; BM25 fallback remains active. {0}',
                        error instanceof Error ? error.message : String(error)
                    )
                };
            }
        }
        if (!statusMethod) {
            return {
                available: false,
                enabled: false,
                status: 'bm25-fallback',
                localOnly: true,
                message: nls.localize('theia/memory/vectorNoApi', 'Vector backend API is not installed. BM25 and local FTS retrieval remain active.')
            };
        }
        try {
            return this.normalizeVectorSearchStatus(await statusMethod({ workspacePath }));
        } catch (firstError) {
            try {
                return this.normalizeVectorSearchStatus(await statusMethod(workspacePath));
            } catch (secondError) {
                return {
                    available: false,
                    enabled: false,
                    status: 'unavailable',
                    localOnly: true,
                    message: nls.localize(
                        'theia/memory/vectorStatusFailed',
                        'Vector status unavailable; BM25 fallback remains active. {0}',
                        secondError instanceof Error ? secondError.message : firstError instanceof Error ? firstError.message : String(secondError)
                    )
                };
            }
        }
    }

    protected async backfillVectorSearch(): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const api = this.vectorApi();
        const backfill = this.vectorBackfillMethod();
        if (!api.backfillMemoryVectors && !backfill) {
            this.setState({
                vectorSearchMessage: nls.localize('theia/memory/vectorBackfillUnavailable', 'Manual vector backfill is not available in this build. BM25 fallback remains active.')
            });
            return;
        }
        this.setState({ vectorSearchBusy: true, vectorSearchMessage: undefined });
        try {
            const response = api.backfillMemoryVectors
                ? await api.backfillMemoryVectors(workspacePath)
                : await backfill?.({ workspacePath, force: true });
            const status = response ? this.normalizeVectorSearchStatus(response) : await this.loadVectorSearchStatus(workspacePath);
            this.setState({
                vectorSearchBusy: false,
                vectorSearchStatus: status,
                vectorSearchMessage: status.message ?? nls.localize('theia/memory/vectorBackfillStarted', 'Vector backfill requested for the local index.')
            });
        } catch (error) {
            this.setState({
                vectorSearchBusy: false,
                vectorSearchMessage: nls.localize(
                    'theia/memory/vectorBackfillFailed',
                    'Vector backfill failed; BM25 fallback remains active. {0}',
                    error instanceof Error ? error.message : String(error)
                )
            });
        }
    }

    protected vectorBackfillAvailable(): boolean {
        return !!this.vectorApi().backfillMemoryVectors || !!this.vectorBackfillMethod();
    }

    protected vectorBackfillMethod(): OptionalMemoryVectorApi['backfillVectorSearch'] {
        const api = this.vectorApi();
        return api.backfillVectorSearch ?? api.rebuildVectorSearch ?? api.rebuildVectorIndex;
    }

    protected normalizeVectorSearchStatus(response: unknown): MemoryVectorSearchStatus {
        const value = this.objectValue(response) ?? {};
        const lastError = this.stringValue(value.lastError);
        return {
            enabled: this.booleanValue(value.enabled),
            available: this.booleanValue(value.available) ?? true,
            status: this.stringValue(value.status) ?? this.stringValue(value.state) ?? this.stringValue(value.backfillStatus),
            modelLabel: this.stringValue(value.modelLabel) ?? this.stringValue(value.model) ?? this.stringValue(value.modelName),
            modelId: this.stringValue(value.modelId) ?? this.stringValue(value.localModelId),
            localOnly: this.booleanValue(value.localOnly) ?? true,
            indexedItems: this.numberValue(value.indexedItems) ?? this.numberValue(value.embeddedItems) ?? this.numberValue(value.totalVectors),
            totalItems: this.numberValue(value.totalItems) ?? this.numberValue(value.itemCount) ?? this.numberValue(value.totalMemories),
            updatedAt: this.stringValue(value.updatedAt) ?? this.stringValue(value.indexedAt) ?? this.stringValue(value.backfilledAt),
            message: this.stringValue(value.message) ?? lastError
        };
    }

    protected async updateVectorSearchOptIn(settings: MemoryWorkspaceSettings, enabled: boolean): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        this.setState({ vectorSearchBusy: true, vectorSearchMessage: undefined });
        try {
            await this.updateSettings({ optIn: { ...settings.optIn, vectorSearch: enabled } });
            const api = this.vectorApi();
            const status = api.updateVectorSettings
                ? this.normalizeVectorSearchStatus(await api.updateVectorSettings({ workspacePath, enabled, consent: enabled }))
                : await this.loadVectorSearchStatus(workspacePath);
            this.setState({
                vectorSearchBusy: false,
                vectorSearchStatus: status,
                vectorSearchMessage: enabled
                    ? nls.localize('theia/memory/vectorConsentRecorded', 'Vector search enabled for local backends only. No model download or remote call was started.')
                    : nls.localize('theia/memory/vectorDisabled', 'Vector search disabled. BM25 and local FTS retrieval remain active.')
            });
            await this.refresh();
        } catch (error) {
            this.setState({
                vectorSearchBusy: false,
                vectorSearchMessage: nls.localize(
                    'theia/memory/vectorUpdateFailed',
                    'Vector setting was not updated; BM25 fallback remains active. {0}',
                    error instanceof Error ? error.message : String(error)
                )
            });
        }
    }

    protected vectorSearchModelLabel(status?: MemoryVectorSearchStatus): string {
        const model = status?.modelLabel ?? status?.modelId ?? nls.localize('theia/memory/vectorModelUnset', 'No local model reported');
        const locality = status?.localOnly === false
            ? nls.localize('theia/memory/vectorLocalOnlyUnknown', 'local-only not confirmed')
            : nls.localize('theia/memory/vectorLocalOnly', 'local-only');
        return `${model} - ${locality}`;
    }

    protected vectorSearchIndexLabel(status?: MemoryVectorSearchStatus): string {
        const state = status?.status ?? (status?.available === false ? 'bm25-fallback' : 'unknown');
        const count = typeof status?.indexedItems === 'number'
            ? `${status.indexedItems}${typeof status.totalItems === 'number' ? `/${status.totalItems}` : ''}`
            : nls.localize('theia/memory/vectorNoCount', 'no count reported');
        const updated = status?.updatedAt ? ` - ${new Date(status.updatedAt).toLocaleString()}` : '';
        return `${state} - ${count}${updated}`;
    }

    protected vectorSearchStatusLabel(status: MemoryVectorSearchStatus | undefined, backfillAvailable: boolean): string {
        if (status?.message) {
            return status.message;
        }
        if (!backfillAvailable) {
            return nls.localize('theia/memory/vectorFallbackOnly', 'Manual vector backfill API is not available; BM25 and local FTS retrieval remain active.');
        }
        return nls.localize('theia/memory/vectorReadyForBackfill', 'Vector search is opt-in. Use backfill only after a local vector backend and model are configured.');
    }

    protected async loadKnowledgeGraph(workspacePath: string, dashboard: MemoryDashboard): Promise<{ graph?: MemoryGraph; error?: string }> {
        const api = this.knowledgeApi();
        if (typeof api.getKnowledgeGraph !== 'function') {
            return {};
        }
        try {
            return {
                graph: this.normalizeKnowledgeGraph(await api.getKnowledgeGraph({ workspacePath, limit: 200 }))
            };
        } catch (error) {
            return {
                error: nls.localize(
                    'theia/memory/knowledgeGraphApiFallback',
                    'Knowledge backend unavailable; showing locally inferred memory concepts instead. {0}',
                    error instanceof Error ? error.message : String(error)
                ),
                graph: this.resolveKnowledgeDashboardGraph(dashboard)
            };
        }
    }

    protected normalizeKnowledgeGraph(response: MemoryGraph | MemoryKnowledgeGraphResponse): MemoryGraph | undefined {
        if (this.isMemoryGraph(response)) {
            return response;
        }
        if (response.graph && this.isMemoryGraph(response.graph)) {
            return response.graph;
        }
        if (Array.isArray(response.nodes) && Array.isArray(response.edges)) {
            return {
                title: response.title ?? 'Knowledge Graph',
                nodes: response.nodes,
                edges: response.edges
            };
        }
        return undefined;
    }

    protected isMemoryGraph(value: unknown): value is MemoryGraph {
        const graph = value as Partial<MemoryGraph>;
        return !!graph && typeof graph.title === 'string' && Array.isArray(graph.nodes) && Array.isArray(graph.edges);
    }

    protected resolveKnowledgeGraph(dashboard: MemoryDashboard): MemoryGraph {
        return this.state.knowledgeGraph
            ?? this.resolveKnowledgeDashboardGraph(dashboard)
            ?? this.buildKnowledgeFallbackGraph(dashboard);
    }

    protected resolveKnowledgeDashboardGraph(dashboard: MemoryDashboard): MemoryGraph | undefined {
        const graphs = dashboard.graphs as MemoryDashboard['graphs'] & { knowledge?: MemoryGraph };
        return graphs.knowledge;
    }

    protected buildKnowledgeFallbackGraph(dashboard: MemoryDashboard): MemoryGraph {
        const rootId = 'knowledge-root';
        const memories = dashboard.memories
            .filter(memory => memory.status !== 'rejected' && memory.status !== 'blocked')
            .slice(0, 80);
        const nodes: MemoryGraphNode[] = [
            {
                id: rootId,
                kind: 'memory',
                label: 'Knowledge Graph',
                detail: 'Inferred from Memory memories',
                source: 'project-memory',
                semanticTags: ['knowledge', 'concept']
            },
            ...memories.map(memory => ({
                id: memory.id,
                kind: 'memory' as const,
                label: memory.title,
                detail: memory.memoryType,
                source: 'project-memory' as const,
                staleStatus: memory.staleStatus,
                semanticTags: ['knowledge', 'concept', memory.memoryType]
            }))
        ];
        const edges: MemoryGraphEdge[] = memories.map(memory => ({
            id: `knowledge-root:${memory.id}`,
            sourceId: rootId,
            targetId: memory.id,
            relationType: 'related_to_memory',
            confidenceScore: memory.status === 'active' ? 0.85 : 0.55
        }));
        const related = new Set<string>();
        for (let index = 0; index < memories.length; index++) {
            for (let otherIndex = index + 1; otherIndex < memories.length; otherIndex++) {
                const left = memories[index];
                const right = memories[otherIndex];
                if (edges.length >= 140) {
                    break;
                }
                if (left.memoryType === right.memoryType || this.memoryTerms(left).some(term => this.memoryTerms(right).includes(term))) {
                    const id = `knowledge-link:${left.id}:${right.id}`;
                    if (!related.has(id)) {
                        related.add(id);
                        edges.push({
                            id,
                            sourceId: left.id,
                            targetId: right.id,
                            relationType: 'related_to_memory',
                            confidenceScore: left.memoryType === right.memoryType ? 0.72 : 0.6
                        });
                    }
                }
            }
        }
        return { title: 'Knowledge Graph', nodes, edges };
    }

    protected memoryTerms(memory: MemoryItem): string[] {
        return `${memory.title} ${memory.content}`
            .toLowerCase()
            .split(/[^a-z0-9_]+/)
            .filter(term => term.length > 4)
            .slice(0, 24);
    }

    protected normalizeFeedbackRecords(response: MemoryFeedbackRecord[] | MemoryFeedbackSearchResult): MemoryFeedbackRecord[] {
        if (Array.isArray(response)) {
            return response;
        }
        return response.records ?? response.feedback ?? response.items ?? [];
    }

    protected feedbackRecordsFromEvents(dashboard: MemoryDashboard): MemoryFeedbackRecord[] {
        return dashboard.events
            .filter(event => event.eventType === 'context.rejected' || event.eventType === 'context.accepted')
            .map(event => {
                const payload = this.parseJsonObject(event.payload);
                const feedback = this.objectValue(payload?.feedback) ?? this.objectValue(payload?.explicitFeedback) ?? payload;
                return {
                    id: event.id,
                    workspacePath: event.workspacePath,
                    kind: 'context',
                    targetId: this.stringValue(feedback?.id) ?? this.stringValue(feedback?.targetId) ?? event.relativePath,
                    targetTitle: this.stringValue(feedback?.title) ?? this.stringValue(feedback?.targetTitle) ?? event.relativePath,
                    sourceKind: this.stringValue(feedback?.sourceKind) as MemorySourceKind | undefined,
                    outcome: this.stringValue(feedback?.status) ?? event.eventType.replace('context.', ''),
                    reason: this.stringValue(feedback?.reason),
                    correction: this.stringValue(feedback?.correction),
                    payload: event.payload,
                    createdAt: event.createdAt
                };
            });
    }

    protected feedbackMatches(record: MemoryFeedbackRecord, query: string): boolean {
        if (!query) {
            return true;
        }
        return [
            record.targetId,
            record.targetTitle,
            record.sourceKind,
            record.outcome,
            record.reason,
            record.correction,
            record.payload
        ].filter((value): value is string => typeof value === 'string')
            .join('\n')
            .toLowerCase()
            .includes(query);
    }

    protected feedbackTimestamp(record: MemoryFeedbackRecord): string {
        const timestamp = record.updatedAt ?? record.createdAt;
        return timestamp ? new Date(timestamp).toLocaleString() : nls.localize('theia/memory/feedbackNoTimestamp', 'no timestamp');
    }

    protected parseJsonObject(value?: string): Record<string, unknown> | undefined {
        if (!value) {
            return undefined;
        }
        try {
            const parsed = JSON.parse(value) as unknown;
            return this.objectValue(parsed);
        } catch {
            return undefined;
        }
    }

    protected objectValue(value: unknown): Record<string, unknown> | undefined {
        return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
    }

    protected stringValue(value: unknown): string | undefined {
        return typeof value === 'string' ? value : undefined;
    }

    protected booleanValue(value: unknown): boolean | undefined {
        return typeof value === 'boolean' ? value : undefined;
    }

    protected numberValue(value: unknown): number | undefined {
        return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
    }

    protected async indexWorkspace(): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const settings = this.state.dashboard?.settings ?? await this.memoryService.getSettings(workspacePath);
        if (!this.canIndexWorkspace(settings)) {
            this.messageService.warn(nls.localize('theia/memory/indexBlockedByConsent', 'Memory is disabled for this workspace. Enable it in Settings before indexing.'));
            await this.refresh('settings');
            return;
        }
        this.setState({ busy: true });
        await this.memoryService.indexWorkspace({ workspacePath });
        await this.refresh();
    }

    protected canIndexWorkspace(settings: MemoryWorkspaceSettings): boolean {
        return settings.enabled === true;
    }

    protected async updateWorkspaceConsent(
        settings: MemoryWorkspaceSettings,
        key: Exclude<keyof NonNullable<MemoryWorkspaceSettings['optIn']>, 'remoteImageSemanticsConsentAt' | 'remoteMediaTranscriptionConsentAt'>,
        enabled: boolean
    ): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        if (key === 'remoteImageSemantics' || key === 'remoteMediaTranscription') {
            await this.updateSettings({
                optIn: {
                    ...settings.optIn,
                    [key]: enabled,
                    ...(key === 'remoteImageSemantics' ? { remoteImageSemanticsConsentAt: enabled ? new Date().toISOString() : undefined } : {}),
                    ...(key === 'remoteMediaTranscription' ? { remoteMediaTranscriptionConsentAt: enabled ? new Date().toISOString() : undefined } : {})
                }
            });
            return;
        }
        await this.memoryService.updateWorkspaceConsent({ workspacePath, capabilities: { [key]: enabled } });
        await this.refresh('settings');
    }

    protected async updateSettings(partial: Partial<MemoryWorkspaceSettings>): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        await this.memoryService.updateSettings({ workspacePath, ...partial });
        await this.refresh('settings');
    }

    protected async enableWorkspaceConsentShell(settings: MemoryWorkspaceSettings): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        await this.memoryService.updateSettings({
            workspacePath,
            enabled: true,
            graphEnabled: false,
            memoryEnabled: false,
            skillSuggestionsEnabled: false,
            chatLearningEnabled: false,
            editorHoverEnabled: false,
            optIn: {
                ...settings.optIn,
                codeGraph: false,
                documentGraph: false,
                projectMemory: false,
                skills: false,
                contextCart: false,
                editorHover: false,
                transcriptSearch: false,
                events: false,
                promptSnippets: false,
                pdfDocuments: false,
                officeDocuments: false,
                images: false,
                diagrams: false,
                audioVideo: false,
                externalDocCollections: false
            }
        });
        await this.refresh();
    }

    protected async updateDenylist(value: string): Promise<void> {
        const denylist = value.split(/\r?\n/).map(entry => entry.trim()).filter(Boolean);
        await this.updateSettings({ denylist });
    }

    protected async updateAllowlist(value: string): Promise<void> {
        const allowlist = value.split(/\r?\n/).map(entry => entry.trim()).filter(Boolean);
        await this.updateSettings({ allowlist });
    }

    protected async addMemory(scope: 'workspace' | 'global'): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        await this.memoryService.addMemory({
            workspacePath: scope === 'global' ? undefined : workspacePath,
            scope,
            memoryType: scope === 'global' ? 'user_preference' : 'manual_note',
            title: scope === 'global' ? 'New IDE memory' : 'New project memory',
            content: 'Edit this local memory record.',
            source: 'manual',
            evidence: 'Created from Memory Memory Manager.'
        });
        await this.refresh(scope === 'global' ? 'preferences' : 'project-memories');
    }

    protected async updateMemory(memory: MemoryItem, patch: MemoryUpdateMemoryRequest['patch']): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        await this.memoryService.updateMemory({ workspacePath, id: memory.id, patch });
        await this.refresh(this.state.activeTab);
    }

    protected async updateMemoryLifecycle(memory: MemoryItem, patch: LifecycleMemoryPatch): Promise<void> {
        await this.updateMemory(memory, patch as MemoryUpdateMemoryRequest['patch']);
    }

    protected async promoteMemory(memory: MemoryItem): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const confirmed = await new ConfirmDialog({
            title: nls.localize('theia/memory/promoteMemoryTitle', 'Promote to IDE Memory'),
            msg: nls.localize('theia/memory/promoteMemoryMessage', 'Promote this project or repository memory to global IDE memory? It will no longer be tied to this workspace.')
        }).open();
        if (!confirmed) {
            return;
        }
        await this.memoryService.promoteMemoryToIde({
            workspacePath,
            id: memory.id,
            reason: 'Promoted from Memory UI.'
        });
        await this.refresh('preferences');
    }

    protected async demoteMemory(memory: MemoryItem): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const confirmed = await new ConfirmDialog({
            title: nls.localize('theia/memory/demoteMemoryTitle', 'Demote to Project Memory'),
            msg: nls.localize('theia/memory/demoteMemoryMessage', 'Demote this IDE memory to the current project workspace?')
        }).open();
        if (!confirmed) {
            return;
        }
        await this.memoryService.demoteMemoryToWorkspace({
            workspacePath,
            id: memory.id,
            reason: 'Demoted from Memory UI.'
        });
        await this.refresh('project-memories');
    }

    protected async consolidateMemories(scope: MemoryPanelScope, memories: MemoryItem[]): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const topic = window.prompt(nls.localize('theia/memory/consolidateTopicPrompt', 'Topic to consolidate'), this.defaultConsolidationTopic(memories));
        if (!topic?.trim()) {
            return;
        }
        const result = await this.memoryService.proposeMemoryConsolidation({
            workspacePath,
            topic: topic.trim(),
            memoryIds: memories.map(memory => memory.id),
            maxMemories: Math.max(2, memories.length)
        });
        const skipped = result.skippedSensitiveMemoryIds.length
            ? ` ${nls.localize('theia/memory/consolidationSkippedSensitive', '{0} sensitive memories were skipped.', result.skippedSensitiveMemoryIds.length)}`
            : '';
        this.messageService.info(result.candidate
            ? nls.localize('theia/memory/consolidationCandidateCreated', 'Created a consolidation candidate for review.{0}', skipped)
            : nls.localize('theia/memory/consolidationNoCandidate', 'No consolidation candidate was created. At least two non-sensitive related memories are required.{0}', skipped));
        await this.refresh(result.candidate ? 'memory-candidates' : this.memoryTabForScope(scope));
    }

    protected defaultConsolidationTopic(memories: MemoryItem[]): string {
        const terms = memories.flatMap(memory => this.memoryTerms(memory));
        return terms[0] ?? '';
    }

    protected memoryTabForScope(scope: MemoryPanelScope): MemoryTab {
        switch (scope) {
            case 'global': return 'preferences';
            case 'workspace': return 'project-memories';
            case 'repository': return 'repository-memories';
            case 'session': return 'session-memories';
            case 'task': return 'task-memories';
        }
    }

    protected async resolveFeedback(record: MemoryFeedbackRecord): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        const id = record.id;
        if (!workspacePath || !id || !this.feedbackApi().resolveFeedback) {
            return;
        }
        await this.feedbackApi().resolveFeedback!({ workspacePath, id });
        await this.refreshFeedback();
        await this.refresh('feedback');
    }

    protected async forgetMemory(id: string): Promise<void> {
        const confirmed = await new ConfirmDialog({
            title: nls.localize('theia/memory/removeMemoryTitle', 'Remove Memory'),
            msg: nls.localize('theia/memory/removeMemoryMessage', 'Remove this memory, its local vector, and derived knowledge links?')
        }).open();
        if (!confirmed) {
            return;
        }
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        await this.memoryService.forgetMemory({ workspacePath, id });
        await this.refresh(this.state.activeTab);
    }

    protected async updateSkill(candidate: MemorySkillCandidate, status: MemorySkillCandidate['status'], reason?: string): Promise<void> {
        let decisionReason = reason;
        if (status === 'rejected') {
            decisionReason = nls.localize('theia/memory/rejectSkillDefaultReason', 'Rejected or ignored by the user.');
        }
        if (candidate.status === 'delete_pending' && status === 'blocked') {
            const confirmed = await new ConfirmDialog({
                title: nls.localize('theia/memory/approveDeletionTitle', 'Approve Skill Deletion'),
                msg: nls.localize('theia/memory/approveDeletionMessage', 'Mark this skill candidate as blocked so it no longer appears as an active suggestion?')
            }).open();
            if (!confirmed) {
                return;
            }
        }
        const workspacePath = await this.getWorkspacePath();
        if (workspacePath) {
            await this.memoryService.decideSkillCandidate({ workspacePath, id: candidate.id, status, reason: decisionReason });
        } else {
            await this.memoryService.updateSkillCandidateStatus(candidate.id, status);
        }
        await this.refresh('skills');
    }

    protected async addSkillToContext(candidate: MemorySkillCandidate, dashboard: MemoryDashboard): Promise<void> {
        window.dispatchEvent(new CustomEvent('memory:add-context', {
            detail: {
                kind: 'skill',
                id: candidate.id,
                title: candidate.title,
                source: 'memory-skills'
            }
        }));
        await this.memoryService.recordEvent({
            workspacePath: dashboard.settings.workspacePath,
            eventType: 'context.accepted',
            promptSignature: candidate.signature,
            payload: JSON.stringify({
                id: candidate.id,
                title: candidate.title,
                sourceKind: 'skill',
                status: 'accepted',
                evidence: candidate.statusReason ?? 'skill candidate reused'
            })
        });
        this.messageService.info(nls.localize('theia/memory/skillContextAdded', 'Added {0} as reusable skill context.', candidate.title));
        await this.refresh('skills');
    }

    protected eventsForSignature(events: MemoryEvent[], signature: string): number {
        return events.filter(event => event.promptSignature === signature).length;
    }

    protected eventIcon(eventType: MemoryEvent['eventType']): string {
        if (eventType.startsWith('file.')) {
            return 'file-code';
        }
        if (eventType.startsWith('context.')) {
            return 'checklist';
        }
        if (eventType.startsWith('skill.')) {
            return 'sparkle';
        }
        if (eventType.startsWith('prompt.')) {
            return 'comment';
        }
        return 'history';
    }

    protected exportEvents(dashboard: MemoryDashboard): void {
        this.downloadJson('memory-events.json', {
            version: 1,
            exportedAt: new Date().toISOString(),
            workspacePath: dashboard.settings.workspacePath,
            events: dashboard.events
        });
    }

    protected async installPortableMemory(): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const confirmed = await new ConfirmDialog({
            title: nls.localize('theia/memory/installPortableTitle', 'Install Portable Memory'),
            msg: nls.localize(
                'theia/memory/installPortableMessage',
                'Create .cybervinci/memory in this workspace with redacted portable Memory artifacts? This writes files into the project only after this confirmation.'
            )
        }).open();
        if (!confirmed) {
            return;
        }
        this.setState({ busy: true });
        try {
            const result = await this.memoryService.installPortableMemory({
                workspacePath,
                confirmed: true
            });
            this.messageService.info(nls.localize(
                'theia/memory/installPortableComplete',
                'Installed portable Memory package with {0} files.',
                result.files.length
            ));
            await this.refresh('settings');
        } catch (error) {
            this.setState({ busy: false });
            this.messageService.error(error instanceof Error ? error.message : String(error));
        }
    }

    protected async managePortableMemory(action: 'ignore' | 'remove-local-reference' | 'regenerate'): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const messages = {
            ignore: {
                title: nls.localize('theia/memory/ignorePortableTitle', 'Ignore Portable Memory'),
                msg: nls.localize('theia/memory/ignorePortableMessage', 'Ignore the detected portable package for this workspace? This does not delete IDE memories or imported review candidates.'),
                complete: nls.localize('theia/memory/ignorePortableComplete', 'Portable Memory package ignored.')
            },
            'remove-local-reference': {
                title: nls.localize('theia/memory/removePortableTitle', 'Remove Portable Reference'),
                msg: nls.localize('theia/memory/removePortableMessage', 'Remove only .cybervinci/memory from this workspace? IDE memories remain stored in Memory.'),
                complete: nls.localize('theia/memory/removePortableComplete', 'Removed the local portable Memory reference.')
            },
            regenerate: {
                title: nls.localize('theia/memory/regeneratePortableTitle', 'Regenerate Portable Memory'),
                msg: nls.localize('theia/memory/regeneratePortableMessage', 'Regenerate .cybervinci/memory from current redacted Memory metadata? This keeps IDE memories in the IDE store.'),
                complete: nls.localize('theia/memory/regeneratePortableComplete', 'Regenerated portable Memory package.')
            }
        }[action];
        const confirmed = await new ConfirmDialog({
            title: messages.title,
            msg: messages.msg
        }).open();
        if (!confirmed) {
            return;
        }
        this.setState({ busy: true });
        try {
            await this.memoryService.managePortableMemory({
                workspacePath,
                action,
                confirmed: true
            });
            this.messageService.info(messages.complete);
            await this.refresh('settings');
        } catch (error) {
            this.setState({ busy: false });
            this.messageService.error(error instanceof Error ? error.message : String(error));
        }
    }

    protected async clearEvents(): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const confirmed = await new ConfirmDialog({
            title: nls.localize('theia/memory/clearEventsTitle', 'Clear Memory Events'),
            msg: nls.localize('theia/memory/clearEventsMessage', 'Clear audit events for this workspace while keeping indexed data, memories, and skills?')
        }).open();
        if (!confirmed) {
            return;
        }
        await this.memoryService.clearEvents(workspacePath);
        await this.refresh('events');
    }

    protected async forgetWorkspaceLearningData(): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const confirmed = await new ConfirmDialog({
            title: nls.localize('theia/memory/forgetWorkspaceLearningTitle', 'Forget Workspace Prompt Learning'),
            msg: nls.localize('theia/memory/forgetWorkspaceLearningMessage', 'Delete prompt learning events and memories derived from prompts for this workspace? Indexed code, graph data, manually approved memories, skills, and other audit events are kept.')
        }).open();
        if (!confirmed) {
            return;
        }
        const result = await this.memoryService.forgetWorkspaceLearningData({ workspacePath });
        this.messageService.info(nls.localize(
            'theia/memory/forgotWorkspaceLearning',
            'Deleted {0} prompt events and {1} derived memories for this workspace.',
            result.promptEventsDeleted,
            result.derivedMemoriesDeleted
        ));
        await this.refresh('events');
    }

    protected async clearWorkspaceData(): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const confirmed = await new ConfirmDialog({
            title: nls.localize('theia/memory/clearDataTitle', 'Clear Memory Data'),
            msg: nls.localize('theia/memory/clearDataMessage', 'Clear indexed files, graph data, memories, skill candidates, and events for this workspace?')
        }).open();
        if (!confirmed) {
            return;
        }
        await this.memoryService.clearWorkspaceData(workspacePath);
        await this.refresh('settings');
    }

    protected exportSettings(dashboard: MemoryDashboard): void {
        const payload = {
            version: 1,
            exportedAt: new Date().toISOString(),
            settings: dashboard.settings,
            allowlist: dashboard.settings.allowlist ?? [],
            denylist: dashboard.settings.denylist ?? [],
            ignoreRules: dashboard.settings.ignoreRules ?? {},
            exportOptions: dashboard.settings.exportOptions ?? {},
            retentionPolicies: dashboard.settings.retentionPolicies ?? {},
            restrictIndexingToAllowlist: dashboard.settings.restrictIndexingToAllowlist === true,
            optIn: dashboard.settings.optIn ?? {},
            counts: {
                files: dashboard.files.length,
                symbols: dashboard.symbols.length,
                memories: dashboard.memories.length,
                skillCandidates: dashboard.skillCandidates.length
            }
        };
        this.downloadJson('memory-settings.json', payload);
    }

    protected async exportKnowledgeGraph(graph: MemoryGraph, dashboard: MemoryDashboard, format: MemoryKnowledgeExportFormat): Promise<void> {
        const api = this.knowledgeApi();
        if (typeof api.exportKnowledgeGraph === 'function') {
            try {
                const response = await api.exportKnowledgeGraph({
                    workspacePath: dashboard.settings.workspacePath,
                    format,
                    limit: 500
                });
                const text = typeof response === 'string' ? response : response.content ?? response.text ?? response.data;
                if (text) {
                    this.downloadText(
                        typeof response === 'string' ? this.knowledgeExportFileName(format) : response.fileName ?? this.knowledgeExportFileName(format),
                        text,
                        typeof response === 'string' ? this.knowledgeExportMimeType(format) : response.mimeType ?? this.knowledgeExportMimeType(format)
                    );
                    return;
                }
            } catch {
                // Local export keeps the buttons useful while the knowledge backend contract is optional.
            }
        }
        if (format === 'json') {
            this.downloadJson(this.knowledgeExportFileName(format), {
                version: 1,
                exportedAt: new Date().toISOString(),
                workspacePath: dashboard.settings.workspacePath,
                graph
            });
            return;
        }
        this.downloadText(
            this.knowledgeExportFileName(format),
            format === 'markdown' ? this.knowledgeGraphToMarkdown(graph) : this.knowledgeGraphToDot(graph),
            this.knowledgeExportMimeType(format)
        );
    }

    protected knowledgeExportFileName(format: MemoryKnowledgeExportFormat): string {
        switch (format) {
            case 'markdown':
                return 'memory-knowledge.md';
            case 'dot':
                return 'memory-knowledge.dot';
            case 'json':
            default:
                return 'memory-knowledge.json';
        }
    }

    protected knowledgeExportMimeType(format: MemoryKnowledgeExportFormat): string {
        switch (format) {
            case 'markdown':
                return 'text/markdown';
            case 'dot':
                return 'text/vnd.graphviz';
            case 'json':
            default:
                return 'application/json';
        }
    }

    protected knowledgeGraphToMarkdown(graph: MemoryGraph): string {
        const nodeById = new Map(graph.nodes.map(node => [node.id, node]));
        const lines = [
            `# ${graph.title}`,
            '',
            `Exported: ${new Date().toISOString()}`,
            '',
            '## Concepts',
            ...graph.nodes.map(node => `- **${node.label}** (${node.kind}${node.detail ? `, ${node.detail}` : ''})`),
            '',
            '## Links',
            ...graph.edges.map(edge => {
                const source = nodeById.get(edge.sourceId)?.label ?? edge.sourceId;
                const target = nodeById.get(edge.targetId)?.label ?? edge.targetId;
                return `- ${source} --${edge.relationType} (${Math.round(edge.confidenceScore * 100)}%)--> ${target}`;
            })
        ];
        return `${lines.join('\n')}\n`;
    }

    protected knowledgeGraphToDot(graph: MemoryGraph): string {
        const lines = [
            'digraph "Memory Knowledge" {',
            '  rankdir=LR;'
        ];
        for (const node of graph.nodes) {
            lines.push(`  "${this.dotEscape(node.id)}" [label="${this.dotEscape(node.label)}"];`);
        }
        for (const edge of graph.edges) {
            lines.push(`  "${this.dotEscape(edge.sourceId)}" -> "${this.dotEscape(edge.targetId)}" [label="${this.dotEscape(edge.relationType)}"];`);
        }
        lines.push('}');
        return `${lines.join('\n')}\n`;
    }

    protected dotEscape(value: string): string {
        return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }

    protected downloadJson(fileName: string, payload: unknown): void {
        this.downloadText(fileName, JSON.stringify(payload, undefined, 2), 'application/json');
    }

    protected downloadText(fileName: string, text: string, mimeType: string): void {
        const blob = new Blob([text], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
    }

    protected async importSettings(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (!file) {
            return;
        }
        const text = await file.text();
        const payload = JSON.parse(text) as {
            settings?: Partial<MemoryWorkspaceSettings>;
            allowlist?: string[];
            denylist?: string[];
            restrictIndexingToAllowlist?: boolean;
            optIn?: MemoryWorkspaceSettings['optIn'];
            ignoreRules?: MemoryWorkspaceSettings['ignoreRules'];
            exportOptions?: MemoryWorkspaceSettings['exportOptions'];
            retentionPolicies?: MemoryWorkspaceSettings['retentionPolicies'];
        };
        await this.updateSettings({
            enabled: payload.settings?.enabled,
            graphEnabled: payload.settings?.graphEnabled,
            memoryEnabled: payload.settings?.memoryEnabled,
            skillSuggestionsEnabled: payload.settings?.skillSuggestionsEnabled,
            chatLearningEnabled: payload.settings?.chatLearningEnabled,
            chatInlineSuggestionsEnabled: payload.settings?.chatInlineSuggestionsEnabled,
            chatAutoIndexEnabled: payload.settings?.chatAutoIndexEnabled,
            chatLearningLlmEnabled: payload.settings?.chatLearningLlmEnabled,
            chatLearningLlmFrequency: payload.settings?.chatLearningLlmFrequency,
            chatLearningModelId: payload.settings?.chatLearningModelId,
            editorHoverEnabled: payload.settings?.editorHoverEnabled,
            restrictIndexingToAllowlist: payload.settings?.restrictIndexingToAllowlist ?? payload.restrictIndexingToAllowlist,
            allowlist: payload.settings?.allowlist ?? payload.allowlist,
            denylist: payload.settings?.denylist ?? payload.denylist,
            ignoreRules: payload.settings?.ignoreRules ?? payload.ignoreRules,
            exportOptions: payload.settings?.exportOptions ?? payload.exportOptions,
            retentionPolicies: payload.settings?.retentionPolicies ?? payload.retentionPolicies,
            optIn: payload.settings?.optIn ?? payload.optIn
        });
    }

    protected async getWorkspacePath(): Promise<string | undefined> {
        const roots = await this.workspaceService.roots;
        return roots[0] ? FileUri.fsPath(roots[0].resource.toString()) : undefined;
    }

    protected absolutePath(workspacePath: string, relativePath: string): string {
        return `${workspacePath.replace(/[\\/]+$/, '')}/${relativePath.replace(/^[/\\]+/, '')}`;
    }
}
