import { MessageService } from '@theia/core';
import { codicon, Message, ReactWidget } from '@theia/core/lib/browser';
import { MarkdownRenderer } from '@theia/core/lib/browser/markdown-rendering/markdown-renderer';
import { nls } from '@theia/core/lib/common';
import { MarkdownStringImpl } from '@theia/core/lib/common/markdown-rendering/markdown-string';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import {
    ArenaAgentSummary,
    ArenaCandidateLabel,
    ArenaCandidateRun,
    ArenaDispute,
    ArenaDisputeStatus,
    ArenaGeneratedAgent,
    ArenaOutputType,
    ArenaRunStatus,
    ArenaRunnerInfo,
    ArenaService
} from '../common';

interface ArenaWidgetState {
    agents: ArenaAgentSummary[];
    runners: ArenaRunnerInfo[];
    agentASource: 'library' | 'text';
    agentBSource: 'library' | 'text';
    agentAUri: string;
    agentBUri: string;
    agentAName: string;
    agentBName: string;
    agentAText: string;
    agentBText: string;
    userTask: string;
    outputType: ArenaOutputType;
    runnerId: string;
    model: string;
    reasoningEffort: string;
    autoGenerateC: boolean;
    autoGenerateCContextual: boolean;
    generatedC?: ArenaGeneratedAgent;
    dispute?: ArenaDispute;
    activeTabs: Record<string, string>;
    busy: boolean;
}

const OUTPUT_TYPES: ArenaOutputType[] = ['markdown', 'webpage', 'code', 'json', 'document', 'generic'];
const RESULT_TABS = ['preview', 'raw', 'files', 'diff', 'logs'] as const;
type ArenaResultTab = typeof RESULT_TABS[number];

@injectable()
export class ArenaWidget extends ReactWidget {

    static readonly ID = 'arena-widget';
    static readonly LABEL = nls.localize('theia/arena/widgetLabel', 'Arena');

    @inject(ArenaService)
    protected readonly arenaService: ArenaService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(MarkdownRenderer)
    protected readonly markdownRenderer: MarkdownRenderer;

    protected state: ArenaWidgetState = {
        agents: [],
        runners: [],
        agentASource: 'library',
        agentBSource: 'library',
        agentAUri: '',
        agentBUri: '',
        agentAName: nls.localize('theia/arena/defaultAgentAName', 'Agent A'),
        agentBName: nls.localize('theia/arena/defaultAgentBName', 'Agent B'),
        agentAText: '',
        agentBText: '',
        userTask: '',
        outputType: 'markdown',
        runnerId: 'mock',
        model: '',
        reasoningEffort: '',
        autoGenerateC: false,
        autoGenerateCContextual: false,
        activeTabs: {},
        busy: false
    };

    protected pollHandle: number | undefined;

    @postConstruct()
    protected init(): void {
        this.id = ArenaWidget.ID;
        this.title.label = ArenaWidget.LABEL;
        this.title.caption = ArenaWidget.LABEL;
        this.title.iconClass = codicon('beaker');
        this.title.closable = true;
        this.update();
        this.refreshData();
    }

    protected override onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        const textarea = this.node.querySelector('textarea');
        if (textarea instanceof HTMLTextAreaElement) {
            textarea.focus();
        }
    }

    override dispose(): void {
        this.stopPolling();
        super.dispose();
    }

    protected async refreshData(): Promise<void> {
        try {
            const workspaceRootUris = await this.getWorkspaceRootUris();
            const [agents, runners] = await Promise.all([
                this.arenaService.listAgents({ workspaceRootUris }),
                this.arenaService.listRunners()
            ]);
            this.setState({
                agents,
                runners,
                agentAUri: this.state.agentAUri || agents[0]?.uri || '',
                agentBUri: this.state.agentBUri || agents[1]?.uri || agents[0]?.uri || '',
                runnerId: runners.find(runner => runner.available)?.id || runners[0]?.id || 'mock'
            });
        } catch (error) {
            this.messageService.error(this.errorMessage(error));
        }
    }

    protected setState(partial: Partial<ArenaWidgetState>): void {
        this.state = { ...this.state, ...partial };
        this.update();
    }

    protected render(): React.ReactNode {
        return <div className='arena'>
            <div className='arena-header'>
                <h2>{ArenaWidget.LABEL}</h2>
                <button className='theia-button secondary' title={nls.localize('theia/arena/refreshAgents', 'Refresh agents')} onClick={() => this.refreshData()}>
                    <i className={codicon('refresh')} />
                </button>
            </div>
            {this.renderSetup()}
            {this.state.generatedC && !this.state.dispute && this.renderGeneratedCPreview()}
            {this.state.dispute && this.renderDispute(this.state.dispute)}
        </div>;
    }

    protected renderSetup(): React.ReactNode {
        const selectedRunner = this.state.runners.find(runner => runner.id === this.state.runnerId);
        const issues = this.getSetupIssues();
        return <section className='arena-setup'>
            <label>
                <span>{nls.localize('theia/arena/taskLabel', 'Task')}</span>
                <textarea
                    className='theia-input'
                    value={this.state.userTask}
                    rows={5}
                    onChange={event => this.setState({ userTask: event.currentTarget.value })}
                />
            </label>
            <div className='arena-agents-grid'>
                {this.renderAgentInput(nls.localize('theia/arena/agentA', 'Agent A'), 'agentASource', 'agentAUri', 'agentAName', 'agentAText')}
                {this.renderAgentInput(nls.localize('theia/arena/agentB', 'Agent B'), 'agentBSource', 'agentBUri', 'agentBName', 'agentBText')}
            </div>
            <div className='arena-grid arena-settings-grid'>
                <label>
                    <span>{nls.localize('theia/arena/outputType', 'Output Type')}</span>
                    <select className='theia-select' value={this.state.outputType} onChange={event => this.setState({ outputType: event.currentTarget.value as ArenaOutputType })}>
                        {OUTPUT_TYPES.map(type => <option key={type} value={type}>{this.outputTypeLabel(type)}</option>)}
                    </select>
                </label>
                <label>
                    <span>{nls.localize('theia/arena/runner', 'Runner')}</span>
                    <select className='theia-select' value={this.state.runnerId} onChange={event => this.setState({ runnerId: event.currentTarget.value })}>
                        {this.state.runners.map(runner => <option key={runner.id} value={runner.id} disabled={!runner.available}>{runner.name}{runner.available ? '' : nls.localize('theia/arena/stubRunnerSuffix', ' (stub)')}</option>)}
                    </select>
                </label>
                <label>
                    <span>{nls.localize('theia/arena/model', 'Model')}</span>
                    <input className='theia-input' value={this.state.model} disabled={!selectedRunner?.capabilities.supportsModelSelection} onChange={event => this.setState({ model: event.currentTarget.value })} />
                </label>
                <label>
                    <span>{nls.localize('theia/arena/reasoningEffort', 'Reasoning Effort')}</span>
                    <input className='theia-input' value={this.state.reasoningEffort} disabled={!selectedRunner?.capabilities.supportsReasoningEffort} onChange={event => this.setState({ reasoningEffort: event.currentTarget.value })} />
                </label>
            </div>
            <label className='arena-checkbox'>
                <input type='checkbox' checked={this.state.autoGenerateC} onChange={event => this.setState({ autoGenerateC: event.currentTarget.checked })} />
                <span>{nls.localize('theia/arena/generateAgentCBlindly', 'Generate Agent C blindly')}</span>
            </label>
            <label className='arena-checkbox'>
                <input
                    type='checkbox'
                    checked={this.state.autoGenerateCContextual}
                    disabled={!this.state.autoGenerateC}
                    onChange={event => this.setState({ autoGenerateCContextual: event.currentTarget.checked })}
                />
                <span>{nls.localize('theia/arena/useCurrentTaskForC', 'Use current task when generating C')}</span>
            </label>
            {issues.length ? <div className='arena-validation'>
                <i className={codicon('warning')} />
                <span>{issues.join(' ')}</span>
            </div> : undefined}
            <div className='arena-actions'>
                <button className='theia-button secondary' disabled={this.state.busy || !this.canGenerateC()} onClick={() => this.generateC()}>
                    <i className={codicon('sparkle')} />
                    {nls.localize('theia/arena/generateC', 'Generate C')}
                </button>
                <button className='theia-button main' disabled={this.state.busy || this.state.dispute?.status === 'Running' || !this.canRun()} onClick={() => this.runDuel()}>
                    <i className={codicon('play')} />
                    {nls.localize('theia/arena/runDuel', 'Run Duel')}
                </button>
            </div>
        </section>;
    }

    protected renderAgentInput(
        label: string,
        sourceKey: 'agentASource' | 'agentBSource',
        uriKey: 'agentAUri' | 'agentBUri',
        nameKey: 'agentAName' | 'agentBName',
        textKey: 'agentAText' | 'agentBText'
    ): React.ReactNode {
        const source = this.state[sourceKey];
        const selectedAgent = this.state.agents.find(agent => agent.uri === this.state[uriKey]);
        const textLength = this.state[textKey].trim().length;
        return <div className='arena-agent-input'>
            <div className='arena-agent-title'>
                <div>
                    <strong>{label}</strong>
                    <span>{source === 'library'
                        ? selectedAgent?.name || nls.localize('theia/arena/noAgentSelected', 'No agent selected')
                        : nls.localize('theia/arena/characterCount', '{0} characters', textLength)}
                    </span>
                </div>
                <div className='arena-segmented'>
                    <button
                        className={source === 'library' ? 'active' : ''}
                        onClick={() => this.setState({ [sourceKey]: 'library' } as Partial<ArenaWidgetState>)}>
                        {nls.localize('theia/arena/librarySource', 'Library')}
                    </button>
                    <button
                        className={source === 'text' ? 'active' : ''}
                        onClick={() => this.setState({ [sourceKey]: 'text' } as Partial<ArenaWidgetState>)}>
                        {nls.localize('theia/arena/textSource', 'Text')}
                    </button>
                </div>
            </div>
            {source === 'library' ? <label>
                <span>{nls.localize('theia/arena/agentOrSkill', 'Agent / Skill')}</span>
                <select className='theia-select' value={this.state[uriKey]} onChange={event => this.setState({ [uriKey]: event.currentTarget.value } as Partial<ArenaWidgetState>)}>
                    {this.state.agents.map(agent => <option key={agent.uri} value={agent.uri}>{agent.relativePath}</option>)}
                </select>
                {selectedAgent ? <span className='arena-source-meta'>
                    {this.agentSourceLabel(selectedAgent.source)} - {this.formatBytes(selectedAgent.sizeBytes)} - {selectedAgent.relativePath}
                </span> : <span className='arena-source-meta'>{nls.localize('theia/arena/noMarkdownAgentsFound', 'No Markdown agents found in this workspace.')}</span>}
            </label> : <div className='arena-agent-text'>
                <label>
                    <span>{nls.localize('theia/arena/name', 'Name')}</span>
                    <input
                        className='theia-input'
                        value={this.state[nameKey]}
                        onChange={event => this.setState({ [nameKey]: event.currentTarget.value } as Partial<ArenaWidgetState>)}
                    />
                </label>
                <label>
                    <span>{nls.localize('theia/arena/promptOrSkillMarkdown', 'Prompt / Skill Markdown')}</span>
                    <textarea
                        className='theia-input arena-agent-textarea'
                        value={this.state[textKey]}
                        rows={8}
                        onChange={event => this.setState({ [textKey]: event.currentTarget.value } as Partial<ArenaWidgetState>)}
                    />
                </label>
            </div>}
        </div>;
    }

    protected renderGeneratedCPreview(): React.ReactNode {
        return <section className='arena-generated-c'>
            <div className='arena-section-title'>
                <h3>{nls.localize('theia/arena/generatedAgentC', 'Generated Agent C')}</h3>
                <button className='theia-button secondary' onClick={() => this.saveGeneratedC()}>
                    <i className={codicon('save')} />
                    {nls.localize('theia/arena/saveCAsAgent', 'Save C as Agent')}
                </button>
            </div>
            {this.state.generatedC?.contentMarkdown ? this.renderMarkdown(this.state.generatedC.contentMarkdown) : undefined}
        </section>;
    }

    protected renderDispute(dispute: ArenaDispute): React.ReactNode {
        return <section className='arena-results'>
            <div className='arena-section-title'>
                <h3>{nls.localize('theia/arena/results', 'Results')}</h3>
                <span className={`arena-status ${dispute.status.toLowerCase()}`}>{this.disputeStatusLabel(dispute.status)}</span>
            </div>
            <div className='arena-compare-toolbar'>
                <span>{nls.localize('theia/arena/viewAll', 'View all')}</span>
                {RESULT_TABS.map(tab => <button key={tab} className='theia-button secondary' onClick={() => this.setAllResultTabs(tab)}>{this.resultTabLabel(tab)}</button>)}
            </div>
            <div className='arena-columns'>
                {dispute.candidates.map(candidate => this.renderCandidate(dispute, candidate))}
            </div>
            <div className='arena-footer'>
                <button className='theia-button secondary' disabled={!this.state.generatedC && !dispute.generatedAgentC} onClick={() => this.saveGeneratedC()}>
                    <i className={codicon('save')} />
                    {nls.localize('theia/arena/saveCAsAgent', 'Save C as Agent')}
                </button>
                <button className='theia-button secondary' disabled={!dispute.winnerLabel} onClick={() => this.saveWinnerArtifact()}>
                    <i className={codicon('archive')} />
                    {nls.localize('theia/arena/saveWinnerArtifact', 'Save Winner Artifact')}
                </button>
                <button className='theia-button secondary' disabled={!this.canSaveWinnerPatch(dispute)} onClick={() => this.saveWinnerPatch()}>
                    <i className={codicon('git-compare')} />
                    {nls.localize('theia/arena/saveWinnerPatch', 'Save Winner Patch')}
                </button>
                <button className='theia-button secondary' disabled={!dispute.winnerLabel} onClick={() => this.refineSelectedAgent()}>
                    <i className={codicon('wand')} />
                    {nls.localize('theia/arena/refineAgent', 'Refine Agent')}
                </button>
                <button className='theia-button main' disabled={dispute.status === 'Running'} onClick={() => this.finishDispute('Completed')}>
                    <i className={codicon('check')} />
                    {nls.localize('theia/arena/finalizeCleanup', 'Finalize / Cleanup')}
                </button>
                <button className='theia-button secondary' onClick={() => this.finishDispute('Cancelled')}>
                    <i className={codicon('close')} />
                    {nls.localize('theia/arena/cancelCleanup', 'Cancel / Cleanup')}
                </button>
            </div>
        </section>;
    }

    protected renderCandidate(dispute: ArenaDispute, candidate: ArenaCandidateRun): React.ReactNode {
        const activeTab = this.state.activeTabs[candidate.label] || 'preview';
        return <article className={`arena-candidate ${dispute.winnerLabel === candidate.label ? 'winner' : ''}`} key={candidate.label}>
            <div className='arena-candidate-header'>
                <div>
                    <h4>{candidate.label}: {candidate.agentName}</h4>
                    <span>{candidate.latencyMs !== undefined ? this.formatLatency(candidate.latencyMs) : this.runStatusLabel(candidate.status)}</span>
                </div>
                <div className='arena-candidate-badges'>
                    {dispute.winnerLabel === candidate.label ? <span className='arena-badge winner'>{nls.localize('theia/arena/winner', 'Winner')}</span> : undefined}
                    {candidate.artifact?.parsedSuccessfully === false ? <span className='arena-badge warning'>{nls.localize('theia/arena/parseIssue', 'Parse issue')}</span> : undefined}
                    <span className={`arena-run-status ${candidate.status}`}>{this.runStatusLabel(candidate.status)}</span>
                </div>
            </div>
            <div className='arena-tabs'>
                {RESULT_TABS.map(tab => <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => this.setTab(candidate.label, tab)}>{this.resultTabLabel(tab)}</button>)}
            </div>
            <div className='arena-tab-content'>
                {this.renderCandidateTab(activeTab, candidate)}
            </div>
            <button className='theia-button secondary arena-choose' disabled={candidate.status === 'pending' || candidate.status === 'running'} onClick={() => this.chooseWinner(candidate.label)}>
                <i className={codicon('star-full')} />
                {nls.localize('theia/arena/chooseThis', 'Choose this')}
            </button>
        </article>;
    }

    protected renderCandidateTab(tab: string, candidate: ArenaCandidateRun): React.ReactNode {
        const artifact = candidate.artifact;
        if (tab === 'logs') {
            return <pre>{candidate.logs.join('\n') || nls.localize('theia/arena/noLogs', 'No logs.')}</pre>;
        }
        if (tab === 'diff') {
            return <pre>{candidate.gitDiff || nls.localize('theia/arena/noDiffAvailable', 'No diff available for this runner.')}</pre>;
        }
        if (tab === 'files') {
            return <div>{artifact?.files.length ? artifact.files.map(file => <details key={file.path} open>
                <summary>{file.path} ({file.contentType})</summary>
                <pre>{file.content}</pre>
            </details>) : nls.localize('theia/arena/noFiles', 'No files.')}</div>;
        }
        if (tab === 'raw') {
            return <pre>{artifact?.rawOutput || candidate.error || nls.localize('theia/arena/noOutput', 'No output.')}</pre>;
        }
        if (artifact?.artifactType === 'json' && artifact.rawOutput) {
            try {
                return <pre>{JSON.stringify(JSON.parse(artifact.rawOutput), undefined, 2)}</pre>;
            } catch {
                return <pre>{artifact.rawOutput}</pre>;
            }
        }
        if (artifact?.artifactType === 'webpage') {
            const html = artifact.files.find(file => file.path.endsWith('index.html'))?.content || artifact.rawOutput;
            return <iframe className='arena-webpage-preview' sandbox='allow-scripts' srcDoc={html} />;
        }
        if (artifact?.artifactType === 'markdown' || artifact?.artifactType === 'document') {
            return this.renderMarkdown(artifact.rawOutput);
        }
        return <pre>{artifact?.rawOutput || candidate.error || nls.localize('theia/arena/noPreview', 'No preview.')}</pre>;
    }

    protected setTab(label: ArenaCandidateLabel, tab: string): void {
        this.setState({ activeTabs: { ...this.state.activeTabs, [label]: tab } });
    }

    protected setAllResultTabs(tab: ArenaResultTab): void {
        const dispute = this.state.dispute;
        if (!dispute) {
            return;
        }
        this.setState({
            activeTabs: {
                ...this.state.activeTabs,
                ...Object.fromEntries(dispute.candidates.map(candidate => [candidate.label, tab]))
            }
        });
    }

    protected async generateC(): Promise<void> {
        this.setState({ busy: true });
        try {
            const generatedC = await this.arenaService.generateAgentC({
                workspaceRootUris: await this.getWorkspaceRootUris(),
                agentA: this.getAgentInput('A'),
                agentB: this.getAgentInput('B'),
                outputType: this.state.outputType,
                model: this.state.model || undefined,
                reasoningEffort: this.state.reasoningEffort || undefined,
                userTask: this.state.autoGenerateCContextual ? this.state.userTask : undefined,
                contextual: this.state.autoGenerateCContextual
            });
            this.setState({ generatedC, autoGenerateC: true });
        } catch (error) {
            this.messageService.error(this.errorMessage(error));
        } finally {
            this.setState({ busy: false });
        }
    }

    protected async runDuel(): Promise<void> {
        this.setState({ busy: true });
        try {
            const dispute = await this.arenaService.runDuel({
                workspaceRootUris: await this.getWorkspaceRootUris(),
                agentA: this.getAgentInput('A'),
                agentB: this.getAgentInput('B'),
                userTask: this.state.userTask,
                outputType: this.state.outputType,
                runnerId: this.state.runnerId,
                model: this.state.model || undefined,
                reasoningEffort: this.state.reasoningEffort || undefined,
                autoGenerateC: this.state.autoGenerateC,
                autoGenerateCContextual: this.state.autoGenerateCContextual,
                generatedAgentCContent: this.state.generatedC?.contentMarkdown
            });
            this.setState({ dispute });
            if (dispute.status === 'Running') {
                this.schedulePoll(dispute.id);
            }
        } catch (error) {
            this.messageService.error(this.errorMessage(error));
        } finally {
            this.setState({ busy: false });
        }
    }

    protected async chooseWinner(label: ArenaCandidateLabel): Promise<void> {
        if (!this.state.dispute) {
            return;
        }
        const dispute = await this.arenaService.chooseWinner(this.state.dispute.id, label);
        this.setState({ dispute });
    }

    protected async saveGeneratedC(): Promise<void> {
        const agentC = this.state.generatedC || this.state.dispute?.generatedAgentC;
        const contentMarkdown = agentC?.contentMarkdown;
        if (!contentMarkdown) {
            return;
        }
        const uri = await this.arenaService.saveGeneratedAgent({
            workspaceRootUris: await this.getWorkspaceRootUris(),
            name: agentC?.name || 'agent-c',
            contentMarkdown
        });
        this.messageService.info(nls.localize('theia/arena/agentCSaved', 'Agent C saved: {0}', uri));
        await this.refreshData();
    }

    protected async saveWinnerArtifact(): Promise<void> {
        const dispute = this.state.dispute;
        if (!dispute?.winnerLabel) {
            return;
        }
        const uri = await this.arenaService.saveWinnerArtifact({
            workspaceRootUris: await this.getWorkspaceRootUris(),
            disputeId: dispute.id,
            winnerLabel: dispute.winnerLabel
        });
        this.messageService.info(nls.localize('theia/arena/winnerArtifactSaved', 'Winner artifact saved: {0}', uri));
    }

    protected async saveWinnerPatch(): Promise<void> {
        const dispute = this.state.dispute;
        if (!dispute?.winnerLabel) {
            return;
        }
        const uri = await this.arenaService.saveWinnerPatch({
            workspaceRootUris: await this.getWorkspaceRootUris(),
            disputeId: dispute.id,
            winnerLabel: dispute.winnerLabel
        });
        this.messageService.info(nls.localize('theia/arena/winnerPatchSaved', 'Winner patch saved: {0}', uri));
    }

    protected async refineSelectedAgent(): Promise<void> {
        const dispute = this.state.dispute;
        if (!dispute?.winnerLabel) {
            return;
        }
        const candidate = dispute.candidates.find(item => item.label === dispute.winnerLabel);
        if (!candidate?.artifact?.rawOutput) {
            return;
        }
        const refined = await this.arenaService.refineAgent({
            disputeId: dispute.id,
            winnerLabel: dispute.winnerLabel,
            model: this.state.model || undefined,
            reasoningEffort: this.state.reasoningEffort || undefined
        });
        const uri = await this.arenaService.saveGeneratedAgent({
            workspaceRootUris: await this.getWorkspaceRootUris(),
            name: refined.name,
            contentMarkdown: refined.contentMarkdown,
            notes: nls.localize('theia/arena/refinementNotes', 'Arena refinement from winner {0} in dispute {1}', candidate.label, dispute.id)
        });
        this.messageService.info(nls.localize('theia/arena/refinedAgentSaved', 'Refined agent saved: {0}', uri));
        await this.refreshData();
    }

    protected async finishDispute(status: 'Completed' | 'Cancelled'): Promise<void> {
        if (!this.state.dispute) {
            return;
        }
        this.stopPolling();
        const dispute = status === 'Cancelled'
            ? await this.arenaService.cancelDispute(this.state.dispute.id)
            : await this.arenaService.finishDispute(this.state.dispute.id, status);
        this.setState({ dispute });
    }

    protected canGenerateC(): boolean {
        return this.hasAgentInput('A') && this.hasAgentInput('B') && !this.isSameLibraryAgent();
    }

    protected canRun(): boolean {
        return Boolean(this.canGenerateC() && this.state.userTask.trim() && this.state.runnerId);
    }

    protected getSetupIssues(): string[] {
        const issues: string[] = [];
        if (!this.hasAgentInput('A')) {
            issues.push(nls.localize('theia/arena/agentAMissing', 'Agent A is missing.'));
        }
        if (!this.hasAgentInput('B')) {
            issues.push(nls.localize('theia/arena/agentBMissing', 'Agent B is missing.'));
        }
        if (this.isSameLibraryAgent()) {
            issues.push(nls.localize('theia/arena/sameLibraryAgent', 'A and B point to the same library item.'));
        }
        if (!this.state.userTask.trim()) {
            issues.push(nls.localize('theia/arena/taskRequiredBeforeRunning', 'Task is required before running.'));
        }
        return issues;
    }

    protected outputTypeLabel(type: ArenaOutputType): string {
        switch (type) {
            case 'markdown':
                return nls.localize('theia/arena/outputType/markdown', 'Markdown');
            case 'webpage':
                return nls.localize('theia/arena/outputType/webpage', 'Webpage');
            case 'code':
                return nls.localize('theia/arena/outputType/code', 'Code');
            case 'json':
                return nls.localize('theia/arena/outputType/json', 'JSON');
            case 'document':
                return nls.localize('theia/arena/outputType/document', 'Document');
            case 'generic':
                return nls.localize('theia/arena/outputType/generic', 'Generic');
        }
    }

    protected resultTabLabel(tab: ArenaResultTab): string {
        switch (tab) {
            case 'preview':
                return nls.localize('theia/arena/resultTab/preview', 'Preview');
            case 'raw':
                return nls.localize('theia/arena/resultTab/raw', 'Raw');
            case 'files':
                return nls.localize('theia/arena/resultTab/files', 'Files');
            case 'diff':
                return nls.localize('theia/arena/resultTab/diff', 'Diff');
            case 'logs':
                return nls.localize('theia/arena/resultTab/logs', 'Logs');
        }
    }

    protected disputeStatusLabel(status: ArenaDisputeStatus): string {
        switch (status) {
            case 'Draft':
                return nls.localize('theia/arena/disputeStatus/draft', 'Draft');
            case 'Running':
                return nls.localize('theia/arena/disputeStatus/running', 'Running');
            case 'Reviewing':
                return nls.localize('theia/arena/disputeStatus/reviewing', 'Reviewing');
            case 'Completed':
                return nls.localize('theia/arena/disputeStatus/completed', 'Completed');
            case 'Cancelled':
                return nls.localize('theia/arena/disputeStatus/cancelled', 'Cancelled');
            case 'Failed':
                return nls.localize('theia/arena/disputeStatus/failed', 'Failed');
            case 'Expired':
                return nls.localize('theia/arena/disputeStatus/expired', 'Expired');
        }
    }

    protected runStatusLabel(status: ArenaRunStatus): string {
        switch (status) {
            case 'pending':
                return nls.localize('theia/arena/runStatus/pending', 'Pending');
            case 'running':
                return nls.localize('theia/arena/runStatus/running', 'Running');
            case 'succeeded':
                return nls.localize('theia/arena/runStatus/succeeded', 'Succeeded');
            case 'failed':
                return nls.localize('theia/arena/runStatus/failed', 'Failed');
        }
    }

    protected agentSourceLabel(source: ArenaAgentSummary['source']): string {
        switch (source) {
            case 'workspace':
                return nls.localize('theia/arena/agentSource/workspace', 'Workspace');
            case 'arena':
                return nls.localize('theia/arena/agentSource/arena', 'Arena');
        }
    }

    protected async getWorkspaceRootUris(): Promise<string[]> {
        const roots = await this.workspaceService.roots;
        return roots.map(root => root.resource.toString());
    }

    protected errorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }

    protected getAgentInput(label: 'A' | 'B') {
        if (label === 'A') {
            return this.state.agentASource === 'text'
                ? { source: 'text' as const, name: this.state.agentAName, contentMarkdown: this.state.agentAText }
                : { source: 'library' as const, uri: this.state.agentAUri };
        }
        return this.state.agentBSource === 'text'
            ? { source: 'text' as const, name: this.state.agentBName, contentMarkdown: this.state.agentBText }
            : { source: 'library' as const, uri: this.state.agentBUri };
    }

    protected hasAgentInput(label: 'A' | 'B'): boolean {
        if (label === 'A') {
            return this.state.agentASource === 'text'
                ? Boolean(this.state.agentAText.trim())
                : Boolean(this.state.agentAUri);
        }
        return this.state.agentBSource === 'text'
            ? Boolean(this.state.agentBText.trim())
            : Boolean(this.state.agentBUri);
    }

    protected isSameLibraryAgent(): boolean {
        return this.state.agentASource === 'library' &&
            this.state.agentBSource === 'library' &&
            this.state.agentAUri === this.state.agentBUri;
    }

    protected canSaveWinnerPatch(dispute: ArenaDispute): boolean {
        const winner = dispute.winnerLabel ? dispute.candidates.find(candidate => candidate.label === dispute.winnerLabel) : undefined;
        return Boolean(winner?.gitDiff?.trim());
    }

    protected formatLatency(latencyMs: number): string {
        if (latencyMs < 1000) {
            return `${Math.round(latencyMs)} ms`;
        }
        return `${(latencyMs / 1000).toFixed(1)} s`;
    }

    protected formatBytes(bytes: number): string {
        if (bytes < 1024) {
            return `${bytes} B`;
        }
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    protected schedulePoll(disputeId: string): void {
        this.stopPolling();
        this.pollHandle = window.setTimeout(() => this.pollDispute(disputeId), 1500);
    }

    protected stopPolling(): void {
        if (this.pollHandle !== undefined) {
            window.clearTimeout(this.pollHandle);
            this.pollHandle = undefined;
        }
    }

    protected async pollDispute(disputeId: string): Promise<void> {
        try {
            const dispute = await this.arenaService.getDispute(disputeId);
            this.setState({ dispute });
            if (dispute.status === 'Running') {
                this.schedulePoll(disputeId);
            } else {
                this.stopPolling();
            }
        } catch (error) {
            this.stopPolling();
            this.messageService.error(this.errorMessage(error));
        }
    }

    protected renderMarkdown(content: string): React.ReactNode {
        return <ArenaMarkdownPreview markdownRenderer={this.markdownRenderer} content={content} />;
    }
}

function ArenaMarkdownPreview(props: { markdownRenderer: MarkdownRenderer; content: string }): React.ReactElement {
    const container = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        const host = container.current;
        if (!host) {
            return undefined;
        }
        host.innerHTML = '';
        const rendered = props.markdownRenderer.render(new MarkdownStringImpl(props.content));
        host.appendChild(rendered.element);
        return () => rendered.dispose();
    }, [props.markdownRenderer, props.content]);
    return <div className='arena-markdown-preview' ref={container} />;
}
