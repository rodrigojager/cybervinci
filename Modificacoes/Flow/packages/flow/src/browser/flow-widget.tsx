import { OpenerService, ReactWidget, open } from '@theia/core/lib/browser';
import { nls } from '@theia/core/lib/common';
import URI from '@theia/core/lib/common/uri';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { artifactUriToOpenUri } from './flow-artifacts';
import {
    FlowCanvasEdge,
    FlowCanvasNode,
    FlowAgentMarkdownSummary,
    FlowArtifact,
    FlowEffect,
    FlowEvent,
    FlowHumanGate,
    FlowMemoryScope,
    FlowRun,
    FlowRunExecutionMode,
    FlowClient,
    FlowCapabilities,
    FlowService,
    FlowSnapshot,
    FlowStateType,
    FlowValidationIssue,
    FlowWorkload,
    FlowWorkloadResultIssue,
    FlowWorkflow,
    FlowWorkflowVersion,
    FlowWorkflowStructuralDiff,
    FlowWorkflowStructuralDiffItem,
    FlowWorkflowTemplate,
    FlowWorkflowTransition,
    MemoryCandidate,
    addFlowParallelBranch,
    addFlowWorkflowState,
    addFlowWorkflowTransition,
    flowWorkflowStateIds,
    flowWorkflowStateReferences,
    compactFlowState,
    compareFlowWorkflowStructure,
    deriveFlowCanvasModel,
    deriveFlowKanbanColumns,
    findFlowWorkflowState,
    formatWorkflowSource,
    filterFlowEvents,
    hasFlowEventLogFilter,
    FlowEventLogFilter,
    normalizeFlowEvents,
    removeFlowWorkflowState,
    parseWorkflowSource,
    redactFlowRunForDisplay,
    redactFlowSecretsText,
    redactFlowSecretsValue,
    replaceFlowWorkflowState,
    resolveFlowWorkflowCapabilities,
    validateFlowWorkflow,
    workflowSourceFormatLabel
} from '../common';

interface FlowWidgetState {
    snapshot?: FlowSnapshot;
    templates: FlowWorkflowTemplate[];
    agents: FlowAgentMarkdownSummary[];
    agentSearch: string;
    selectedTemplateId?: string;
    selectedKind: 'state' | 'transition';
    selectedId?: string;
    workflowUndoStack: FlowWorkflowHistoryEntry[];
    workflowRedoStack: FlowWorkflowHistoryEntry[];
    workflowSourceText?: string;
    workflowSourceError?: string;
    workflowSavePreview?: FlowWorkflowStructuralDiff;
    selectedArtifactId?: string;
    prompt: string;
    busy: boolean;
    error?: string;
    executionModeHint?: FlowRunExecutionMode;
    executionModeHintMessage?: string;
}

interface FlowWorkflowHistoryEntry {
    workflow: FlowWorkflow;
    selectedKind: 'state' | 'transition';
    selectedId?: string;
}

@injectable()
export class FlowWidget extends ReactWidget {

    static readonly ID = 'flow.widget';
    static readonly LABEL = 'Flow';

    @inject(FlowService)
    protected readonly flowService: FlowService;

    @inject(FlowClient)
    protected readonly flowClient: FlowClient;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    protected state: FlowWidgetState = {
        templates: [],
        agents: [],
        agentSearch: '',
        selectedKind: 'state',
        workflowUndoStack: [],
        workflowRedoStack: [],
        prompt: 'Build the next CyberVinci feature with explicit artifacts and a human review gate.',
        busy: false
    };

    protected activeRunStreamId?: string;
    protected readonly streamDisposers: Array<() => void> = [];

    @postConstruct()
    protected init(): void {
        this.id = FlowWidget.ID;
        this.title.label = FlowWidget.LABEL;
        this.title.caption = FlowWidget.LABEL;
        this.title.closable = true;
        this.addClass('flow-widget');
        this.registerRunStreamClient();
        this.refresh();
    }

    override dispose(): void {
        for (const dispose of this.streamDisposers.splice(0)) {
            dispose();
        }
        void this.unsubscribeActiveRunStream();
        super.dispose();
    }

    protected registerRunStreamClient(): void {
        const disposeUpdate = this.flowClient.onRunUpdate?.(update => {
            const snapshot = this.state.snapshot;
            if (!snapshot?.activeRun || snapshot.activeRun.id !== update.run.id) {
                return;
            }
            this.applyRunUpdate(update.run);
        });
        const disposeError = this.flowClient.onRunError?.(error => {
            if (this.state.snapshot?.activeRun?.id !== error.runId) {
                return;
            }
            this.state = { ...this.state, error: `Run stream failed: ${error.message}` };
            this.update();
        });
        if (disposeUpdate) {
            this.streamDisposers.push(disposeUpdate);
        }
        if (disposeError) {
            this.streamDisposers.push(disposeError);
        }
    }

    readonly refresh = async (): Promise<void> => {
        await this.withBusy(async () => {
            const workspaceRootUri = await this.workspaceRootUri();
            const [snapshot, templates, agents] = await Promise.all([
                this.flowService.getSnapshot({ workspaceRootUri }),
                this.flowService.listWorkflowTemplates(),
                this.flowService.listAgentMarkdownFiles({ workspaceRootUri })
            ]);
            this.state = {
                ...this.state,
                snapshot: normalizeFlowSnapshotEvents(snapshot),
                templates,
                agents,
                selectedTemplateId: this.state.selectedTemplateId || templates[0]?.id,
                selectedId: this.state.selectedId || (snapshot.activeWorkflow ? Object.keys(snapshot.activeWorkflow.states)[0] : undefined),
                workflowUndoStack: [],
                workflowRedoStack: [],
                workflowSourceText: undefined,
                workflowSourceError: undefined,
                workflowSavePreview: undefined,
                error: undefined
            };
        });
    };

    protected override render(): React.ReactNode {
        const snapshot = this.state.snapshot;
        const run = snapshot?.activeRun;
        const workflow = run?.audit?.workflow || snapshot?.activeWorkflow;
        const validation = run?.audit?.workflow ? validateFlowWorkflow(run.audit.workflow) : snapshot?.validation;
        const canvas = workflow ? deriveFlowCanvasModel(workflow, run) : undefined;
        const workflowSourceText = this.state.workflowSourceText ?? (workflow ? formatWorkflowSource(workflow) : '');
        const capabilities = snapshot?.capabilities;
        const executionMode = resolveExecutionMode(run?.executionMode, this.state.executionModeHint, snapshot?.capabilities.kernelBridge);
        const executionModeMessage = run?.executionModeMessage || this.state.executionModeHintMessage;
        const lifecycleControls = snapshot?.capabilities.runLifecycleControls === true;
        const manualTickFallback = !capabilities?.runEventStream || executionMode !== 'kernel_external';
        const runTerminal = run ? isTerminalRunStatus(run.status) : false;
        const runReadOnly = isReadOnlyRun(run);
        const canPauseRun = lifecycleControls && Boolean(run) && !runReadOnly && !runTerminal && run?.status !== 'paused';
        const canResumeRun = lifecycleControls && !runReadOnly && run?.status === 'paused';
        const canCancelRun = lifecycleControls && Boolean(run) && !runReadOnly && !runTerminal;
        const canFinalizeRun = lifecycleControls && Boolean(run) && !runReadOnly && runTerminal;
        const selectedWorkflowState = workflow && this.state.selectedKind === 'state' && this.state.selectedId ? findFlowWorkflowState(workflow, this.state.selectedId) : undefined;
        const selectedState = selectedWorkflowState?.state;
        const selectedTransition = workflow && this.state.selectedKind === 'transition' && this.state.selectedId
            ? workflow.transitions.find(transition => (transition.id || `${transition.from}-${transition.to}`) === this.state.selectedId)
            : undefined;
        const canUndoWorkflow = workflow?.file?.editable !== false && this.state.workflowUndoStack.length > 0;
        const canRedoWorkflow = workflow?.file?.editable !== false && this.state.workflowRedoStack.length > 0;

        return <div className='flow'>
            <header className='flow__header'>
                <div>
                    <h2>{workflow?.name || 'Flow'}</h2>
                    <span>{workflow?.id || 'No workflow loaded'}</span>
                    {workflow?.file && <span title={workflow.file.path}>{workflow.file.path}</span>}
                    {capabilities && <CapabilityStatus
                        capabilities={capabilities}
                        workflow={workflow}
                        executionMode={executionMode}
                        executionModeMessage={executionModeMessage}
                    />}
                    <div>
                        <select
                            value={this.state.selectedTemplateId || ''}
                            onChange={event => this.setSelectedTemplate(event.currentTarget.value)}
                            disabled={this.state.busy || this.state.templates.length === 0}
                            title='Workflow template'
                            aria-label='Workflow template'
                        >
                            {this.state.templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
                        </select>
                        <button title='Create workflow from template' onClick={this.createWorkflowFromTemplate} disabled={this.state.busy || !this.state.selectedTemplateId}>
                            <i className='codicon codicon-add' /> Create
                        </button>
                    </div>
                </div>
                <div className='flow__actions'>
                    <button title={capabilities?.runEventStream ? 'Refresh snapshot manually (fallback)' : 'Refresh snapshot'} onClick={this.refresh} disabled={this.state.busy}>
                        <i className='codicon codicon-refresh' />
                    </button>
                    <button title='Reload workflow file' onClick={this.reloadWorkflowFile} disabled={this.state.busy || !workflow || workflow.file?.editable === false}>
                        <i className='codicon codicon-discard' />
                    </button>
                    <button title='Undo local workflow edit' onClick={this.undoWorkflowEdit} disabled={this.state.busy || !canUndoWorkflow}>
                        <i className='codicon codicon-arrow-left' />
                    </button>
                    <button title='Redo local workflow edit' onClick={this.redoWorkflowEdit} disabled={this.state.busy || !canRedoWorkflow}>
                        <i className='codicon codicon-redo' />
                    </button>
                    <button title='Save workflow file' onClick={this.saveWorkflowFile} disabled={this.state.busy || !workflow || workflow.file?.editable === false}>
                        <i className='codicon codicon-save' />
                    </button>
                    <button title='Import workflow export' onClick={this.importWorkflow} disabled={this.state.busy}>
                        <i className='codicon codicon-cloud-upload' />
                    </button>
                    <button title='Export complete workflow package' onClick={this.exportWorkflow} disabled={this.state.busy || !workflow}>
                        <i className='codicon codicon-cloud-download' />
                    </button>
                    <button title='Show workflow version history' onClick={this.showWorkflowHistory} disabled={this.state.busy || !workflow}>
                        <i className='codicon codicon-history' />
                    </button>
                    <button title='Restore workflow version' onClick={this.restoreWorkflowVersion} disabled={this.state.busy || !workflow || workflow.file?.editable === false}>
                        <i className='codicon codicon-versions' />
                    </button>
                    <button title='Import run export as read-only audit' onClick={this.importRun} disabled={this.state.busy}>
                        <i className='codicon codicon-archive' />
                    </button>
                    <button title='Export complete run audit package' onClick={this.exportRun} disabled={this.state.busy || !run}>
                        <i className='codicon codicon-export' />
                    </button>
                    <button title='Start run' onClick={this.startRun} disabled={this.state.busy || !workflow || workflow.file?.editable === false}>
                        <i className='codicon codicon-debug-start' />
                    </button>
                    <button title={manualTickFallback ? 'Tick run manually (fallback)' : 'Tick disabled while kernel event stream is active'} onClick={this.tickRun} disabled={this.state.busy || !run || runReadOnly || !manualTickFallback}>
                        <i className='codicon codicon-debug-step-over' />
                    </button>
                    <button title='Pause run' onClick={this.pauseRun} disabled={this.state.busy || !canPauseRun}>
                        <i className='codicon codicon-debug-pause' />
                    </button>
                    <button title='Resume run' onClick={this.resumeRun} disabled={this.state.busy || !canResumeRun}>
                        <i className='codicon codicon-debug-continue' />
                    </button>
                    <button title='Cancel run' onClick={this.cancelRun} disabled={this.state.busy || !canCancelRun}>
                        <i className='codicon codicon-debug-stop' />
                    </button>
                    <button title='Finalize run with report' onClick={this.finalizeRun} disabled={this.state.busy || !canFinalizeRun}>
                        <i className='codicon codicon-file-text' />
                    </button>
                </div>
            </header>

            <section className='flow__prompt'>
                <input
                    value={this.state.prompt}
                    onChange={event => this.setPrompt(event.currentTarget.value)}
                    placeholder='Run prompt'
                    aria-label='Run prompt'
                />
            </section>

            {this.state.error && <div className='flow__error'>{this.state.error}</div>}
            {workflow?.file?.unsupportedReason && <div className='flow__validation'><span>{workflow.file.unsupportedReason}</span></div>}
            {validation && !validation.valid && <ValidationIssues issues={validation.errors} />}
            {this.state.workflowSavePreview && <WorkflowSavePreview
                diff={this.state.workflowSavePreview}
                onConfirm={this.confirmSaveWorkflowFile}
                onCancel={this.cancelSaveWorkflowPreview}
                busy={this.state.busy}
            />}

            <AgentLibrary
                agents={this.state.agents}
                search={this.state.agentSearch}
                busy={this.state.busy}
                onSearch={this.setAgentSearch}
                onOpen={relativePath => this.openAgentMarkdown(relativePath)}
                onCreate={this.createAgentMarkdown}
                onDuplicate={this.duplicateAgentMarkdown}
                onRename={this.renameAgentMarkdown}
            />

            <main className='flow__main'>
                <section className='flow__canvas-pane'>
                    {workflow && canvas && <WorkflowCanvas
                        workflow={workflow}
                        nodes={canvas.nodes}
                        edges={canvas.edges}
                        width={canvas.width}
                        height={canvas.height}
                        selectedId={this.state.selectedId}
                        onSelectState={id => this.select('state', id)}
                        onSelectTransition={id => this.select('transition', id)}
                        onAddState={this.addWorkflowState}
                        onAddTransition={this.addWorkflowTransition}
                        onMoveState={this.moveWorkflowState}
                        onDeleteState={this.deleteWorkflowState}
                        onDeleteTransition={this.deleteWorkflowTransition}
                        onUndo={this.undoWorkflowEdit}
                        onRedo={this.redoWorkflowEdit}
                        canUndo={canUndoWorkflow}
                        canRedo={canRedoWorkflow}
                        validation={validation}
                        editable={workflow.file?.editable !== false}
                    />}
                    {workflow && <WorkflowSourceEditor
                        workflow={workflow}
                        value={workflowSourceText}
                        validation={validation}
                        parseError={this.state.workflowSourceError}
                        editable={workflow.file?.editable !== false}
                        selectedKind={this.state.selectedKind}
                        selectedId={this.state.selectedId}
                        onChange={this.updateWorkflowSourceDraft}
                        onApply={this.applyWorkflowSourceDraft}
                        onSelectIssue={this.selectValidationIssue}
                    />}
                </section>
                <aside className='flow__inspector'>
                    <Inspector
                        workflow={workflow}
                        run={run}
                        selectedStateId={this.state.selectedKind === 'state' ? this.state.selectedId : undefined}
                        selectedState={selectedState}
                        selectedTransition={selectedTransition}
                        gates={run?.gates || []}
                        validation={validation}
                        onUpdateState={this.updateWorkflowState}
                        onOpenAgent={this.openAgentMarkdown}
                        onAddBranch={this.addParallelBranch}
                        onDeleteState={this.deleteWorkflowState}
                        onUpdateTransition={this.updateWorkflowTransition}
                        onDeleteTransition={this.deleteWorkflowTransition}
                        onSaveWorkflow={this.saveWorkflowFile}
                        onApproveGate={this.approveGate}
                        onOpenArtifact={this.openArtifact}
                        readOnlyRun={runReadOnly}
                    />
                </aside>
            </main>

            <section className='flow__ops'>
                <Kanban run={run} onOpenArtifact={this.openArtifact} />
                <RunObservability
                    run={run}
                    selectedArtifactId={this.state.selectedArtifactId}
                    onSelectArtifact={this.selectArtifact}
                    onOpenArtifact={this.openArtifact}
                    onDecideMemoryCandidate={this.decideMemoryCandidate}
                    onDecideEffect={this.decideEffect}
                    onApproveSecondRunSuggestion={this.approveSecondRunSuggestion}
                    onDismissSecondRunSuggestion={this.dismissSecondRunSuggestion}
                    busy={this.state.busy}
                    readOnly={runReadOnly}
                />
                <EventLog events={run?.events || []} />
            </section>
        </div>;
    }

    protected setPrompt(prompt: string): void {
        this.state = { ...this.state, prompt };
        this.update();
    }

    protected setSelectedTemplate(selectedTemplateId: string): void {
        this.state = { ...this.state, selectedTemplateId };
        this.update();
    }

    protected readonly setAgentSearch = (agentSearch: string): void => {
        this.state = { ...this.state, agentSearch };
        this.update();
    };

    protected readonly createAgentMarkdown = async (): Promise<void> => {
        const relativePath = window.prompt('New agent Markdown path', 'agents/new-agent.md')?.trim();
        if (!relativePath) {
            return;
        }
        const title = window.prompt('Agent title', pathTitle(relativePath))?.trim() || pathTitle(relativePath);
        await this.withBusy(async () => {
            const workspaceRootUri = await this.workspaceRootUri();
            const agent = await this.flowService.createAgentMarkdownFile({ workspaceRootUri, relativePath, title });
            const agents = await this.flowService.listAgentMarkdownFiles({ workspaceRootUri });
            this.state = { ...this.state, agents, agentSearch: relativePath, error: undefined };
            await open(this.openerService, new URI(agent.uri));
        });
    };

    protected readonly duplicateAgentMarkdown = async (sourceRelativePath: string): Promise<void> => {
        const targetRelativePath = window.prompt('Duplicate agent Markdown path', copyPath(sourceRelativePath))?.trim();
        if (!targetRelativePath) {
            return;
        }
        await this.withBusy(async () => {
            const workspaceRootUri = await this.workspaceRootUri();
            const agent = await this.flowService.duplicateAgentMarkdownFile({
                workspaceRootUri,
                sourceRelativePath,
                targetRelativePath,
                title: pathTitle(targetRelativePath)
            });
            const agents = await this.flowService.listAgentMarkdownFiles({ workspaceRootUri });
            this.state = { ...this.state, agents, agentSearch: targetRelativePath, error: undefined };
            await open(this.openerService, new URI(agent.uri));
        });
    };

    protected readonly renameAgentMarkdown = async (sourceRelativePath: string): Promise<void> => {
        const targetRelativePath = window.prompt('Rename agent Markdown path', sourceRelativePath)?.trim();
        if (!targetRelativePath || targetRelativePath === sourceRelativePath) {
            return;
        }
        await this.withBusy(async () => {
            const workspaceRootUri = await this.workspaceRootUri();
            const agent = await this.flowService.renameAgentMarkdownFile({ workspaceRootUri, sourceRelativePath, targetRelativePath });
            const agents = await this.flowService.listAgentMarkdownFiles({ workspaceRootUri });
            this.state = { ...this.state, agents, agentSearch: targetRelativePath, error: undefined };
            await open(this.openerService, new URI(agent.uri));
        });
    };

    protected select(selectedKind: 'state' | 'transition', selectedId: string): void {
        this.state = { ...this.state, selectedKind, selectedId };
        this.update();
    }

    protected readonly updateWorkflowSourceDraft = async (workflowSourceText: string): Promise<void> => {
        const snapshot = this.state.snapshot;
        const currentWorkflow = snapshot?.activeWorkflow;
        if (!snapshot || !currentWorkflow) {
            return;
        }
        try {
            const workflow = parseWorkflowSource(workflowSourceText, currentWorkflow);
            const validation = validateFlowWorkflow(workflow);
            this.state = {
                ...this.state,
                workflowSourceText,
                workflowSourceError: undefined,
                snapshot: { ...snapshot, validation },
                error: undefined
            };
        } catch (error) {
            this.state = {
                ...this.state,
                workflowSourceText,
                workflowSourceError: error instanceof Error ? error.message : String(error),
                error: undefined
            };
        }
        this.update();
    };

    protected readonly applyWorkflowSourceDraft = async (): Promise<void> => {
        const snapshot = this.state.snapshot;
        const currentWorkflow = snapshot?.activeWorkflow;
        const workflowSourceText = this.state.workflowSourceText;
        if (!snapshot || !currentWorkflow || !workflowSourceText) {
            return;
        }
        let activeWorkflow: FlowWorkflow;
        try {
            activeWorkflow = parseWorkflowSource(workflowSourceText, currentWorkflow);
        } catch (error) {
            this.state = {
                ...this.state,
                workflowSourceError: error instanceof Error ? error.message : String(error)
            };
            this.update();
            return;
        }
        const validation = validateFlowWorkflow(activeWorkflow);
        if (!validation.valid) {
            this.state = {
                ...this.state,
                snapshot: { ...snapshot, validation },
                workflowSourceError: undefined,
                error: `Workflow source was not applied because it has ${validation.errors.length} validation error${validation.errors.length === 1 ? '' : 's'}.`
            };
            this.update();
            return;
        }
        await this.setActiveWorkflow(activeWorkflow, this.state.selectedKind, this.state.selectedId, true);
        this.state = {
            ...this.state,
            workflowSourceText: formatWorkflowSource(activeWorkflow),
            workflowSourceError: undefined
        };
        this.update();
    };

    protected readonly selectValidationIssue = (issue: FlowValidationIssue): void => {
        const workflow = this.state.snapshot?.activeWorkflow;
        if (!workflow) {
            return;
        }
        const target = validationIssueTarget(workflow, issue);
        if (target) {
            this.select(target.kind, target.id);
        }
    };

    protected readonly addWorkflowState = async (stateType: FlowStateType): Promise<string | undefined> => {
        const snapshot = this.state.snapshot;
        const workflow = snapshot?.activeWorkflow;
        if (!snapshot || !workflow) {
            return undefined;
        }
        const { workflow: activeWorkflow, stateId } = addFlowWorkflowState(workflow, stateType);
        await this.replaceActiveWorkflow(activeWorkflow, 'state', stateId);
        return stateId;
    };

    protected readonly updateWorkflowState = async (stateId: string, statePatch: Partial<FlowWorkflow['states'][string]>): Promise<void> => {
        const snapshot = this.state.snapshot;
        const workflow = snapshot?.activeWorkflow;
        const existingState = workflow ? findFlowWorkflowState(workflow, stateId) : undefined;
        if (!snapshot || !workflow || !existingState) {
            return;
        }
        const updatedState = compactFlowState({ ...existingState.state, ...statePatch });
        await this.replaceActiveWorkflow(replaceFlowWorkflowState(workflow, stateId, updatedState), 'state', stateId);
    };

    protected readonly moveWorkflowState = async (stateId: string, position: { x: number; y: number }): Promise<void> => {
        const snapshot = this.state.snapshot;
        const workflow = snapshot?.activeWorkflow;
        const existingState = workflow ? findFlowWorkflowState(workflow, stateId) : undefined;
        if (!snapshot || !workflow || !existingState) {
            return;
        }
        const updatedState = compactFlowState({
            ...existingState.state,
            layout: {
                ...(existingState.state.layout || {}),
                x: Math.round(Math.max(0, position.x)),
                y: Math.round(Math.max(0, position.y))
            }
        });
        await this.replaceActiveWorkflow(replaceFlowWorkflowState(workflow, stateId, updatedState), 'state', stateId);
    };

    protected readonly addParallelBranch = async (parallelStateId: string, branchType: FlowStateType): Promise<string | undefined> => {
        const snapshot = this.state.snapshot;
        const workflow = snapshot?.activeWorkflow;
        const parallelState = workflow ? findFlowWorkflowState(workflow, parallelStateId) : undefined;
        if (!snapshot || !workflow || !parallelState || parallelState.state.type !== 'parallel') {
            return undefined;
        }
        const { workflow: activeWorkflow, branchId } = addFlowParallelBranch(workflow, parallelStateId, branchType);
        if (!branchId) {
            return undefined;
        }
        await this.replaceActiveWorkflow(activeWorkflow, 'state', branchId);
        return branchId;
    };

    protected readonly deleteWorkflowState = async (stateId: string): Promise<void> => {
        const snapshot = this.state.snapshot;
        const workflow = snapshot?.activeWorkflow;
        const existingState = workflow ? findFlowWorkflowState(workflow, stateId) : undefined;
        if (!snapshot || !workflow || !existingState) {
            return;
        }
        const references = flowWorkflowStateReferences(workflow, stateId);
        if (references.length > 0) {
            this.state = {
                ...this.state,
                error: `Cannot delete state "${stateId}" because it is still referenced by ${references.join(', ')}. Remove those references first.`
            };
            this.update();
            return;
        }
        const activeWorkflow = removeFlowWorkflowState(workflow, stateId);
        const nextStateId = flowWorkflowStateIds(activeWorkflow)[0];
        await this.replaceActiveWorkflow(activeWorkflow, nextStateId ? 'state' : 'transition', nextStateId);
    };

    protected readonly addWorkflowTransition = async (from: string, to: string): Promise<string | undefined> => {
        const snapshot = this.state.snapshot;
        const workflow = snapshot?.activeWorkflow;
        if (!snapshot || !workflow) {
            return undefined;
        }
        const { workflow: activeWorkflow, transition } = addFlowWorkflowTransition(workflow, from, to);
        if (!transition) {
            return undefined;
        }
        await this.replaceActiveWorkflow(activeWorkflow, 'transition', transition.id);
        return transition.id;
    };

    protected readonly updateWorkflowTransition = async (transitionId: string, transitionPatch: Partial<FlowWorkflowTransition>): Promise<void> => {
        const snapshot = this.state.snapshot;
        const workflow = snapshot?.activeWorkflow;
        const transitionIndex = workflow?.transitions.findIndex(transition => transitionKey(transition) === transitionId) ?? -1;
        if (!snapshot || !workflow || transitionIndex < 0) {
            return;
        }
        const updatedTransition = compactTransition({
            ...workflow.transitions[transitionIndex],
            ...transitionPatch
        });
        const transitions = workflow.transitions.slice();
        transitions[transitionIndex] = updatedTransition;
        const activeWorkflow: FlowWorkflow = {
            ...workflow,
            transitions
        };
        await this.replaceActiveWorkflow(activeWorkflow, 'transition', transitionKey(updatedTransition));
    };

    protected readonly deleteWorkflowTransition = async (transitionId: string): Promise<void> => {
        const snapshot = this.state.snapshot;
        const workflow = snapshot?.activeWorkflow;
        if (!snapshot || !workflow) {
            return;
        }
        const transitions = (workflow.transitions || []).filter(transition => transitionKey(transition) !== transitionId);
        if (transitions.length === (workflow.transitions || []).length) {
            return;
        }
        const activeWorkflow: FlowWorkflow = {
            ...workflow,
            transitions
        };
        await this.replaceActiveWorkflow(activeWorkflow, 'state', flowWorkflowStateIds(activeWorkflow)[0]);
    };

    protected async replaceActiveWorkflow(activeWorkflow: FlowWorkflow, selectedKind: 'state' | 'transition', selectedId?: string): Promise<void> {
        await this.setActiveWorkflow(activeWorkflow, selectedKind, selectedId, true);
    }

    protected async setActiveWorkflow(activeWorkflow: FlowWorkflow, selectedKind: 'state' | 'transition', selectedId: string | undefined, pushHistory: boolean): Promise<void> {
        const snapshot = this.state.snapshot;
        if (!snapshot) {
            return;
        }
        const previousWorkflow = snapshot.activeWorkflow;
        const workflowUndoStack = pushHistory && previousWorkflow
            ? pushWorkflowHistory(this.state.workflowUndoStack, {
                workflow: previousWorkflow,
                selectedKind: this.state.selectedKind,
                selectedId: this.state.selectedId
            })
            : this.state.workflowUndoStack;
        const optimisticValidation = validateFlowWorkflow(activeWorkflow);
        this.state = {
            ...this.state,
            selectedKind,
            selectedId,
            workflowUndoStack,
            workflowRedoStack: pushHistory ? [] : this.state.workflowRedoStack,
            snapshot: {
                ...snapshot,
                workflows: snapshot.workflows.map(candidate => candidate.id === activeWorkflow.id ? activeWorkflow : candidate),
                activeWorkflow,
                validation: optimisticValidation
            },
            workflowSourceText: formatWorkflowSource(activeWorkflow),
            workflowSourceError: undefined,
            workflowSavePreview: undefined,
            error: undefined
        };
        this.update();

        try {
            const validation = await this.flowService.validateWorkflow(activeWorkflow);
            const latestSnapshot = this.state.snapshot;
            if (latestSnapshot?.activeWorkflow?.id === activeWorkflow.id) {
                this.state = {
                    ...this.state,
                    snapshot: { ...latestSnapshot, validation },
                    error: undefined
                };
                this.update();
            }
        } catch (error) {
            this.state = { ...this.state, error: error instanceof Error ? error.message : String(error) };
            this.update();
        }
    }

    protected readonly undoWorkflowEdit = async (): Promise<void> => {
        const snapshot = this.state.snapshot;
        const currentWorkflow = snapshot?.activeWorkflow;
        const previous = this.state.workflowUndoStack[this.state.workflowUndoStack.length - 1];
        if (!snapshot || !currentWorkflow || !previous || currentWorkflow.file?.editable === false) {
            return;
        }
        this.state = {
            ...this.state,
            workflowUndoStack: this.state.workflowUndoStack.slice(0, -1),
            workflowRedoStack: pushWorkflowHistory(this.state.workflowRedoStack, {
                workflow: currentWorkflow,
                selectedKind: this.state.selectedKind,
                selectedId: this.state.selectedId
            })
        };
        await this.setActiveWorkflow(previous.workflow, previous.selectedKind, previous.selectedId, false);
    };

    protected readonly redoWorkflowEdit = async (): Promise<void> => {
        const snapshot = this.state.snapshot;
        const currentWorkflow = snapshot?.activeWorkflow;
        const next = this.state.workflowRedoStack[this.state.workflowRedoStack.length - 1];
        if (!snapshot || !currentWorkflow || !next || currentWorkflow.file?.editable === false) {
            return;
        }
        this.state = {
            ...this.state,
            workflowUndoStack: pushWorkflowHistory(this.state.workflowUndoStack, {
                workflow: currentWorkflow,
                selectedKind: this.state.selectedKind,
                selectedId: this.state.selectedId
            }),
            workflowRedoStack: this.state.workflowRedoStack.slice(0, -1)
        };
        await this.setActiveWorkflow(next.workflow, next.selectedKind, next.selectedId, false);
    };

    protected readonly startRun = async (): Promise<void> => {
        await this.withBusy(async () => {
            const snapshot = this.state.snapshot;
            const workflow = this.state.snapshot?.activeWorkflow;
            if (!workflow || !snapshot) {
                return;
            }
            const activeRun = await this.flowService.startRun({
                workspaceRootUri: await this.workspaceRootUri(),
                workflowId: workflow.id,
                prompt: this.state.prompt
            });
            this.state = {
                ...this.state,
                snapshot: { ...snapshot, activeRun },
                executionModeHint: activeRun.executionMode,
                executionModeHintMessage: activeRun.executionModeMessage,
                selectedKind: 'state',
                selectedId: activeRun.currentStateIds[0] || this.state.selectedId,
                error: undefined
            };
            await this.subscribeActiveRunStream(activeRun.id);
        }, error => classifyExecutionModeFromError(error));
    };

    protected readonly createWorkflowFromTemplate = async (): Promise<void> => {
        await this.withBusy(async () => {
            const templateId = this.state.selectedTemplateId;
            if (!templateId) {
                return;
            }
            const workspaceRootUri = await this.workspaceRootUri();
            const activeWorkflow = await this.flowService.createWorkflowFromTemplate({
                workspaceRootUri,
                templateId
            });
            const workflows = await this.flowService.listWorkflows({ workspaceRootUri });
            const validation = await this.flowService.validateWorkflow(activeWorkflow);
            const previousSnapshot = this.state.snapshot;
            const capabilities = previousSnapshot?.capabilities || await this.flowService.getCapabilities();
            this.state = {
                ...this.state,
                snapshot: {
                    workflows,
                    activeWorkflow,
                    activeRun: previousSnapshot?.activeRun,
                    capabilities,
                    validation
                },
                selectedKind: 'state',
                selectedId: Object.keys(activeWorkflow.states)[0],
                workflowUndoStack: [],
                workflowRedoStack: [],
                workflowSourceText: undefined,
                workflowSourceError: undefined,
                workflowSavePreview: undefined,
                error: undefined
            };
        });
    };

    protected readonly reloadWorkflowFile = async (): Promise<void> => {
        await this.withBusy(async () => {
            const snapshot = this.state.snapshot;
            const workflow = snapshot?.activeWorkflow;
            if (!workflow || !snapshot) {
                return;
            }
            const activeWorkflow = await this.flowService.reloadWorkflow({
                workspaceRootUri: await this.workspaceRootUri(),
                workflowId: workflow.id
            });
            this.state = {
                ...this.state,
                snapshot: {
                    ...snapshot,
                    workflows: snapshot.workflows.map(candidate => candidate.id === activeWorkflow.id ? activeWorkflow : candidate),
                    activeWorkflow,
                    validation: await this.flowService.validateWorkflow(activeWorkflow)
                },
                selectedId: this.state.selectedId || Object.keys(activeWorkflow.states)[0],
                workflowUndoStack: [],
                workflowRedoStack: [],
                workflowSourceText: undefined,
                workflowSourceError: undefined,
                workflowSavePreview: undefined,
                error: undefined
            };
            await this.subscribeActiveRunStream(snapshot.activeRun?.id);
        });
    };

    protected readonly openAgentMarkdown = async (agentIdOrPath: string): Promise<void> => {
        const workflow = this.state.snapshot?.activeWorkflow;
        if (!workflow || !agentIdOrPath) {
            return;
        }
        const relativePath = workflow.agents?.[agentIdOrPath] || agentIdOrPath;
        await this.withBusy(async () => {
            const agent = await this.flowService.getAgentMarkdownFile({
                workspaceRootUri: await this.workspaceRootUri(),
                relativePath,
                title: agentIdOrPath,
                createIfMissing: true
            });
            await open(this.openerService, new URI(agent.uri));
        });
    };

    protected readonly openArtifact = async (artifactUri: string): Promise<void> => {
        if (!artifactUri) {
            return;
        }
        await this.withBusy(async () => {
            const workspaceRootUri = await this.workspaceRootUri();
            const uri = artifactUriToOpenUri(artifactUri, workspaceRootUri);
            await open(this.openerService, uri);
        });
    };

    protected readonly selectArtifact = (artifactId: string): void => {
        this.state = { ...this.state, selectedArtifactId: artifactId };
        this.update();
    };

    protected applyRunUpdate(run: FlowRun): void {
        const snapshot = this.state.snapshot;
        if (!snapshot) {
            return;
        }
        const activeRun = normalizeFlowRunEvents(run);
        this.state = {
            ...this.state,
            snapshot: { ...snapshot, activeRun },
            selectedKind: activeRun.currentStateIds[0] ? 'state' : this.state.selectedKind,
            selectedId: activeRun.currentStateIds[0] || this.state.selectedId,
            selectedArtifactId: resolveSelectedArtifactId(activeRun, this.state.selectedArtifactId),
            error: undefined
        };
        this.update();
    }

    protected readonly saveWorkflowFile = async (): Promise<void> => {
        await this.withBusy(async () => {
            const snapshot = this.state.snapshot;
            const workflow = snapshot?.activeWorkflow;
            if (!workflow || !snapshot) {
                return;
            }
            const localValidation = validateFlowWorkflow(workflow);
            if (!localValidation.valid) {
                this.state = {
                    ...this.state,
                    snapshot: { ...snapshot, validation: localValidation },
                    error: `Workflow was not saved because it has ${localValidation.errors.length} validation error${localValidation.errors.length === 1 ? '' : 's'}.`
                };
                return;
            }
            const workspaceRootUri = await this.workspaceRootUri();
            const fileWorkflow = await this.flowService.reloadWorkflow({ workspaceRootUri, workflowId: workflow.id });
            const diff = compareFlowWorkflowStructure(fileWorkflow, workflow);
            if (diff.items.length > 0) {
                this.state = {
                    ...this.state,
                    snapshot: { ...snapshot, validation: localValidation },
                    workflowSavePreview: diff,
                    error: undefined
                };
                return;
            }
            await this.writeWorkflowFile(workflow, snapshot, localValidation);
        });
    };

    protected readonly confirmSaveWorkflowFile = async (): Promise<void> => {
        await this.withBusy(async () => {
            const snapshot = this.state.snapshot;
            const workflow = snapshot?.activeWorkflow;
            if (!workflow || !snapshot) {
                return;
            }
            const localValidation = validateFlowWorkflow(workflow);
            if (!localValidation.valid) {
                this.state = {
                    ...this.state,
                    snapshot: { ...snapshot, validation: localValidation },
                    workflowSavePreview: undefined,
                    error: `Workflow was not saved because it has ${localValidation.errors.length} validation error${localValidation.errors.length === 1 ? '' : 's'}.`
                };
                return;
            }
            await this.writeWorkflowFile(workflow, snapshot, localValidation);
        });
    };

    protected readonly cancelSaveWorkflowPreview = (): void => {
        this.state = { ...this.state, workflowSavePreview: undefined };
        this.update();
    };

    protected readonly importWorkflow = async (): Promise<void> => {
        const source = window.prompt('Workflow export path, run.json path, or workflow file URI');
        if (!source?.trim()) {
            return;
        }
        await this.withBusy(async () => {
            const workspaceRootUri = await this.workspaceRootUri();
            const workflow = await this.flowService.importWorkflow({
                workspaceRootUri,
                filePath: source.trim()
            });
            const snapshot = await this.flowService.getSnapshot({ workspaceRootUri });
            this.state = {
                ...this.state,
                snapshot: {
                    ...snapshot,
                    activeWorkflow: workflow,
                    validation: validateFlowWorkflow(workflow)
                },
                workflowUndoStack: [],
                workflowRedoStack: [],
                workflowSourceText: formatWorkflowSource(workflow),
                workflowSourceError: undefined,
                workflowSavePreview: undefined,
                selectedKind: 'state',
                selectedId: Object.keys(workflow.states || {})[0],
                error: undefined
            };
        });
    };

    protected readonly importRun = async (): Promise<void> => {
        const source = window.prompt('Run export directory or run.json path');
        if (!source?.trim()) {
            return;
        }
        await this.withBusy(async () => {
            const workspaceRootUri = await this.workspaceRootUri();
            const activeRun = await this.flowService.importRun({
                workspaceRootUri,
                filePath: source.trim()
            });
            const snapshot = await this.flowService.getSnapshot({ workspaceRootUri });
            this.state = {
                ...this.state,
                snapshot: {
                    ...snapshot,
                    activeRun: normalizeFlowRunEvents(activeRun)
                },
                selectedKind: activeRun.currentStateIds[0] ? 'state' : this.state.selectedKind,
                selectedId: activeRun.currentStateIds[0] || this.state.selectedId,
                error: undefined
            };
            await this.unsubscribeActiveRunStream();
        });
    };

    protected readonly exportWorkflow = async (): Promise<void> => {
        const workflow = this.state.snapshot?.activeWorkflow;
        if (!workflow) {
            return;
        }
        const target = window.prompt('Workflow export directory (leave empty for default package location)', '');
        if (target === null) {
            return;
        }
        await this.withBusy(async () => {
            const workspaceRootUri = await this.workspaceRootUri();
            const exported = await this.flowService.exportWorkflow({
                workspaceRootUri,
                workflowId: workflow.id,
                targetPath: target?.trim() || undefined
            });
            const missing = [
                exported.missingAgents.length ? `${exported.missingAgents.length} missing agent(s)` : undefined,
                exported.missingContracts.length ? `${exported.missingContracts.length} missing contract/schema file(s)` : undefined
            ].filter(Boolean).join('; ');
            this.state = {
                ...this.state,
                error: missing ? `Workflow exported to ${exported.path}; ${missing}.` : undefined
            };
            await open(this.openerService, new URI(exported.uri));
        });
    };

    protected readonly exportRun = async (): Promise<void> => {
        const run = this.state.snapshot?.activeRun;
        if (!run) {
            return;
        }
        const target = window.prompt('Run export directory (leave empty for default package location)', '');
        if (target === null) {
            return;
        }
        await this.withBusy(async () => {
            const workspaceRootUri = await this.workspaceRootUri();
            const exported = await this.flowService.exportRun({
                workspaceRootUri,
                runId: run.id,
                targetPath: target?.trim() || undefined
            });
            this.state = {
                ...this.state,
                error: exported.missingArtifacts.length
                    ? `Run exported to ${exported.path}; ${exported.missingArtifacts.length} artifact file(s) could not be copied.`
                    : undefined
            };
            await open(this.openerService, new URI(exported.uri));
        });
    };

    protected readonly showWorkflowHistory = async (): Promise<void> => {
        const workflow = this.state.snapshot?.activeWorkflow;
        if (!workflow) {
            return;
        }
        await this.withBusy(async () => {
            const versions = await this.flowService.listWorkflowVersions({
                workspaceRootUri: await this.workspaceRootUri(),
                workflowId: workflow.id
            });
            window.alert(renderWorkflowVersions(versions));
        });
    };

    protected readonly restoreWorkflowVersion = async (): Promise<void> => {
        const snapshot = this.state.snapshot;
        const workflow = snapshot?.activeWorkflow;
        if (!workflow || !snapshot) {
            return;
        }
        const versionId = window.prompt('Workflow version id to restore');
        if (!versionId?.trim()) {
            return;
        }
        await this.withBusy(async () => {
            const workspaceRootUri = await this.workspaceRootUri();
            const activeWorkflow = await this.flowService.restoreWorkflowVersion({
                workspaceRootUri,
                workflowId: workflow.id,
                versionId: versionId.trim(),
                message: 'Restored from Flow UI'
            });
            const workflows = await this.flowService.listWorkflows({ workspaceRootUri });
            this.state = {
                ...this.state,
                snapshot: {
                    ...snapshot,
                    workflows,
                    activeWorkflow,
                    validation: await this.flowService.validateWorkflow(activeWorkflow)
                },
                selectedKind: 'state',
                selectedId: Object.keys(activeWorkflow.states || {})[0],
                workflowUndoStack: [],
                workflowRedoStack: [],
                workflowSourceText: formatWorkflowSource(activeWorkflow),
                workflowSourceError: undefined,
                workflowSavePreview: undefined,
                error: undefined
            };
        });
    };

    protected async writeWorkflowFile(workflow: FlowWorkflow, snapshot: FlowSnapshot, fallbackValidation: FlowSnapshot['validation']): Promise<void> {
        const workspaceRootUri = await this.workspaceRootUri();
        const validation = await this.flowService.saveWorkflowFile({
            workspaceRootUri,
            workflow,
            filePath: workflow.file?.path,
            origin: 'save',
            message: 'Saved from Flow UI'
        });
        const activeWorkflow = validation.valid
            ? await this.flowService.reloadWorkflow({ workspaceRootUri, workflowId: workflow.id })
            : workflow;
        this.state = {
            ...this.state,
            snapshot: {
                ...snapshot,
                workflows: snapshot.workflows.map(candidate => candidate.id === activeWorkflow.id ? activeWorkflow : candidate),
                activeWorkflow,
                validation: validation || fallbackValidation
            },
            workflowUndoStack: [],
            workflowRedoStack: [],
            workflowSourceText: formatWorkflowSource(activeWorkflow),
            workflowSourceError: undefined,
            workflowSavePreview: undefined,
            error: undefined
        };
    }

    protected readonly tickRun = async (): Promise<void> => {
        await this.withBusy(async () => {
            const snapshot = this.state.snapshot;
            const activeRun = this.state.snapshot?.activeRun;
            if (!activeRun || !snapshot) {
                return;
            }
            const updatedRun = await this.flowService.tickRun({
                workspaceRootUri: await this.workspaceRootUri(),
                runId: activeRun.id
            });
            this.applyRunUpdate(updatedRun);
            await this.subscribeActiveRunStream(updatedRun.id);
        });
    };

    protected readonly pauseRun = async (): Promise<void> => {
        await this.runLifecycleAction('pauseRun', 'Paused from Flow UI.');
    };

    protected readonly resumeRun = async (): Promise<void> => {
        await this.runLifecycleAction('resumeRun', 'Resumed from Flow UI.');
    };

    protected readonly cancelRun = async (): Promise<void> => {
        await this.runLifecycleAction('cancelRun', 'Cancelled from Flow UI.');
    };

    protected readonly finalizeRun = async (): Promise<void> => {
        await this.runLifecycleAction('finalizeRun', 'Finalized from Flow UI.');
    };

    protected async runLifecycleAction(action: 'pauseRun' | 'resumeRun' | 'cancelRun' | 'finalizeRun', reason: string): Promise<void> {
        await this.withBusy(async () => {
            const snapshot = this.state.snapshot;
            const activeRun = this.state.snapshot?.activeRun;
            if (!activeRun || !snapshot) {
                return;
            }
            const updatedRun = await this.flowService[action]({
                workspaceRootUri: await this.workspaceRootUri(),
                runId: activeRun.id,
                reason
            });
            this.applyRunUpdate(updatedRun);
            if (action === 'resumeRun') {
                await this.subscribeActiveRunStream(updatedRun.id);
            } else {
                await this.unsubscribeActiveRunStream();
            }
        });
    }

    protected readonly approveGate = async (gateId: string, decision: 'approved' | 'rejected' | 'revision_requested'): Promise<void> => {
        await this.withBusy(async () => {
            const snapshot = this.state.snapshot;
            const activeRun = this.state.snapshot?.activeRun;
            if (!activeRun || !snapshot) {
                return;
            }
            const updatedRun = await this.flowService.approveGate({
                workspaceRootUri: await this.workspaceRootUri(),
                runId: activeRun.id,
                gateId,
                decision
            });
            this.applyRunUpdate(updatedRun);
            await this.subscribeActiveRunStream(updatedRun.id);
        });
    };

    protected readonly decideMemoryCandidate = async (
        candidateId: string,
        decision: 'approved' | 'rejected',
        content: string,
        scope?: FlowMemoryScope,
        target?: string
    ): Promise<void> => {
        await this.withBusy(async () => {
            const snapshot = this.state.snapshot;
            const activeRun = this.state.snapshot?.activeRun;
            if (!activeRun || !snapshot) {
                return;
            }
            const updatedRun = await this.flowService.approveMemoryCandidate({
                workspaceRootUri: await this.workspaceRootUri(),
                runId: activeRun.id,
                candidateId,
                decision,
                content,
                scope,
                target
            });
            this.applyRunUpdate(updatedRun);
        });
    };

    protected readonly decideEffect = async (effectId: string, decision: 'approved' | 'rejected' | 'applied', note?: string): Promise<void> => {
        await this.withBusy(async () => {
            const snapshot = this.state.snapshot;
            const activeRun = this.state.snapshot?.activeRun;
            if (!activeRun || !snapshot) {
                return;
            }
            const updatedRun = await this.flowService.decideEffect({
                workspaceRootUri: await this.workspaceRootUri(),
                runId: activeRun.id,
                effectId,
                decision,
                note,
                approvedBy: 'Flow UI'
            });
            this.applyRunUpdate(updatedRun);
        });
    };

    protected readonly approveSecondRunSuggestion = async (suggestionId: string): Promise<void> => {
        await this.withBusy(async () => {
            const snapshot = this.state.snapshot;
            const activeRun = snapshot?.activeRun;
            if (!activeRun || !snapshot) {
                return;
            }
            const newRun = await this.flowService.approveSecondRunSuggestion({
                workspaceRootUri: await this.workspaceRootUri(),
                runId: activeRun.id,
                suggestionId,
                approvedBy: 'Flow UI'
            });
            const workflows = await this.flowService.listWorkflows({ workspaceRootUri: await this.workspaceRootUri() });
            const activeWorkflow = await this.flowService.getWorkflow({
                workspaceRootUri: await this.workspaceRootUri(),
                workflowId: newRun.workflowId
            });
            this.state = {
                ...this.state,
                snapshot: {
                    ...snapshot,
                    workflows,
                    activeWorkflow,
                    activeRun: normalizeFlowRunEvents(newRun),
                    validation: await this.flowService.validateWorkflow(activeWorkflow)
                },
                selectedKind: 'state',
                selectedId: newRun.currentStateIds[0] || Object.keys(activeWorkflow.states)[0],
                error: undefined
            };
            await this.subscribeActiveRunStream(newRun.id);
        });
    };

    protected readonly dismissSecondRunSuggestion = async (suggestionId: string): Promise<void> => {
        await this.withBusy(async () => {
            const snapshot = this.state.snapshot;
            const activeRun = snapshot?.activeRun;
            if (!activeRun || !snapshot) {
                return;
            }
            const updatedRun = await this.flowService.decideSecondRunSuggestion({
                workspaceRootUri: await this.workspaceRootUri(),
                runId: activeRun.id,
                suggestionId,
                decision: 'dismissed',
                approvedBy: 'Flow UI'
            });
            this.state = {
                ...this.state,
                snapshot: { ...snapshot, activeRun: normalizeFlowRunEvents(updatedRun) },
                error: undefined
            };
        });
    };

    protected async withBusy(
        task: () => Promise<void>,
        onError?: (error: unknown) => { executionModeHint?: FlowRunExecutionMode; executionModeHintMessage?: string } | undefined
    ): Promise<void> {
        this.state = {
            ...this.state,
            busy: true,
            error: undefined,
            executionModeHint: undefined,
            executionModeHintMessage: undefined
        };
        this.update();
        try {
            await task();
        } catch (error) {
            const hint = onError?.(error);
            this.state = {
                ...this.state,
                error: error instanceof Error ? error.message : String(error),
                executionModeHint: hint?.executionModeHint,
                executionModeHintMessage: hint?.executionModeHintMessage
            };
        } finally {
            this.state = { ...this.state, busy: false };
            this.update();
        }
    }

    protected async workspaceRootUri(): Promise<string | undefined> {
        const roots = await this.workspaceService.roots;
        return roots[0]?.resource.toString();
    }

    protected async subscribeActiveRunStream(runId: string | undefined): Promise<void> {
        if (!runId || this.activeRunStreamId === runId) {
            return;
        }
        await this.unsubscribeActiveRunStream();
        this.activeRunStreamId = runId;
        const workspaceRootUri = await this.workspaceRootUri();
        const activeRun = await this.flowService.subscribeRunEvents({ workspaceRootUri, runId, intervalMs: 1500 });
        const snapshot = this.state.snapshot;
        if (snapshot?.activeRun?.id === activeRun.id) {
            this.applyRunUpdate(activeRun);
        }
    }

    protected async unsubscribeActiveRunStream(): Promise<void> {
        const runId = this.activeRunStreamId;
        if (!runId) {
            return;
        }
        this.activeRunStreamId = undefined;
        await this.flowService.unsubscribeRunEvents({
            workspaceRootUri: await this.workspaceRootUri(),
            runId
        });
    }
}

function AgentLibrary(props: {
    agents: FlowAgentMarkdownSummary[];
    search: string;
    busy: boolean;
    onSearch: (value: string) => void;
    onOpen: (relativePath: string) => Promise<void>;
    onCreate: () => Promise<void>;
    onDuplicate: (relativePath: string) => Promise<void>;
    onRename: (relativePath: string) => Promise<void>;
}): React.ReactElement {
    const query = props.search.trim().toLowerCase();
    const agents = query
        ? props.agents.filter(agent => agent.relativePath.toLowerCase().includes(query))
        : props.agents;
    return <section className='flow__agent-library' aria-label='Agent Markdown library'>
        <div className='flow__agent-library-header'>
            <div>
                <h3>Agentes Markdown</h3>
                <span>{agents.length} de {props.agents.length}</span>
            </div>
            <button title='Create agent Markdown' onClick={props.onCreate} disabled={props.busy}>
                <i className='codicon codicon-add' /> Novo
            </button>
        </div>
        <div className='flow__agent-library-search'>
            <i className='codicon codicon-search' />
            <input
                value={props.search}
                onChange={event => props.onSearch(event.currentTarget.value)}
                placeholder='Buscar por caminho'
                aria-label='Buscar agentes Markdown'
            />
        </div>
        <div className='flow__agent-library-list'>
            {agents.length === 0 && <p>Nenhum agente Markdown encontrado.</p>}
            {agents.map(agent => <article key={agent.relativePath} className='flow__agent-library-item'>
                <button className='flow__agent-library-open' title='Open agent Markdown' onClick={() => props.onOpen(agent.relativePath)} disabled={props.busy}>
                    <i className='codicon codicon-file-code' />
                    <span>{agent.relativePath}</span>
                </button>
                <time dateTime={agent.updatedAt}>{formatTimestamp(agent.updatedAt)}</time>
                <div>
                    <button title='Duplicate agent Markdown' onClick={() => props.onDuplicate(agent.relativePath)} disabled={props.busy}>
                        <i className='codicon codicon-copy' />
                    </button>
                    <button title='Rename agent Markdown' onClick={() => props.onRename(agent.relativePath)} disabled={props.busy}>
                        <i className='codicon codicon-edit' />
                    </button>
                </div>
            </article>)}
        </div>
    </section>;
}

function WorkflowCanvas(props: {
    workflow: FlowWorkflow;
    nodes: FlowCanvasNode[];
    edges: FlowCanvasEdge[];
    width: number;
    height: number;
    selectedId?: string;
    onSelectState: (id: string) => void;
    onSelectTransition: (id: string) => void;
    onAddState: (stateType: FlowStateType) => Promise<string | undefined>;
    onAddTransition: (from: string, to: string) => Promise<string | undefined>;
    onMoveState: (stateId: string, position: { x: number; y: number }) => Promise<void>;
    onDeleteState: (stateId: string) => Promise<void>;
    onDeleteTransition: (transitionId: string) => Promise<void>;
    onUndo: () => Promise<void>;
    onRedo: () => Promise<void>;
    canUndo: boolean;
    canRedo: boolean;
    validation?: FlowSnapshot['validation'];
    editable: boolean;
}): React.ReactElement {
    const [viewport, setViewport] = React.useState({ x: 16, y: 16, zoom: 1 });
    const [viewportSize, setViewportSize] = React.useState({ width: 0, height: 0 });
    const [drag, setDrag] = React.useState<
        | { kind: 'pan'; pointerId: number; startX: number; startY: number; originX: number; originY: number }
        | { kind: 'node'; pointerId: number; nodeId: string; startX: number; startY: number; originX: number; originY: number }
    >();
    const [layoutOverrides, setLayoutOverrides] = React.useState<Record<string, { x: number; y: number }>>({});
    const [connectionSource, setConnectionSource] = React.useState<string>();
    const canvasRef = React.useRef<HTMLDivElement>(null);
    const positionedNodes = props.nodes.map(node => ({ ...node, ...(layoutOverrides[node.id] || {}) }));
    const nodeById = new Map(positionedNodes.map(node => [node.id, node]));
    const edges = props.edges.map(edge => {
        const from = nodeById.get(edge.from);
        const to = nodeById.get(edge.to);
        return {
            ...edge,
            points: from && to ? [
                { x: from.x + from.width, y: from.y + from.height / 2 },
                { x: to.x, y: to.y + to.height / 2 }
            ] : edge.points
        };
    });
    const width = Math.max(props.width, ...positionedNodes.map(node => node.x + node.width + 32));
    const height = Math.max(props.height, ...positionedNodes.map(node => node.y + node.height + 32));
    const zoomPercent = Math.round(viewport.zoom * 100);
    const canvasIssues = props.validation ? [...props.validation.errors, ...props.validation.warnings] : [];

    React.useEffect(() => {
        const element = canvasRef.current;
        if (!element) {
            return;
        }
        const updateSize = (): void => setViewportSize({ width: element.clientWidth, height: element.clientHeight });
        updateSize();
        const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(updateSize);
        resizeObserver?.observe(element);
        window.addEventListener('resize', updateSize);
        return () => {
            resizeObserver?.disconnect();
            window.removeEventListener('resize', updateSize);
        };
    }, []);

    const fitView = React.useCallback((): void => {
        const availableWidth = Math.max(1, viewportSize.width - 48);
        const availableHeight = Math.max(1, viewportSize.height - 48);
        const nextZoom = clamp(Math.min(availableWidth / width, availableHeight / height), 0.5, 1.8);
        setViewport({
            x: Math.round((viewportSize.width - width * nextZoom) / 2),
            y: Math.round((viewportSize.height - height * nextZoom) / 2),
            zoom: nextZoom
        });
    }, [height, viewportSize.height, viewportSize.width, width]);

    const updateZoom = (delta: number): void => {
        setViewport(current => {
            const zoom = clamp(current.zoom + delta, 0.5, 1.8);
            const centerX = viewportSize.width / 2;
            const centerY = viewportSize.height / 2;
            const worldX = (centerX - current.x) / current.zoom;
            const worldY = (centerY - current.y) / current.zoom;
            return {
                x: centerX - worldX * zoom,
                y: centerY - worldY * zoom,
                zoom
            };
        });
    };
    const resetView = (): void => {
        setViewport({ x: 16, y: 16, zoom: 1 });
        setLayoutOverrides({});
    };
    const onPaletteDragStart = (event: React.DragEvent<HTMLButtonElement>, stateType: FlowStateType): void => {
        if (!props.editable) {
            event.preventDefault();
            return;
        }
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('application/x-flow-state-type', stateType);
        event.dataTransfer.setData('text/plain', stateType);
    };
    const onDropNewState = async (event: React.DragEvent<HTMLDivElement>): Promise<void> => {
        const stateType = event.dataTransfer.getData('application/x-flow-state-type') as FlowStateType;
        if (!props.editable || !stateType || !AGENCY_CANVAS_STATE_TYPES.includes(stateType)) {
            return;
        }
        event.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        const worldX = rect ? (event.clientX - rect.left - viewport.x) / viewport.zoom : 0;
        const worldY = rect ? (event.clientY - rect.top - viewport.y) / viewport.zoom : 0;
        const stateId = await props.onAddState(stateType);
        if (stateId) {
            setLayoutOverrides(current => ({
                ...current,
                [stateId]: {
                    x: Math.max(0, worldX - 90),
                    y: Math.max(0, worldY - 36)
                }
            }));
        }
    };

    const onDragOverNewState = (event: React.DragEvent<HTMLDivElement>): void => {
        if (event.dataTransfer.types.includes('application/x-flow-state-type')) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
        }
    };
    const onWheel = (event: React.WheelEvent<HTMLDivElement>): void => {
        if (!event.ctrlKey && !event.metaKey) {
            setViewport(current => ({ ...current, x: current.x - event.deltaX, y: current.y - event.deltaY }));
            return;
        }
        event.preventDefault();
        updateZoom(event.deltaY > 0 ? -0.1 : 0.1);
    };
    const selectRelativeNode = (offset: number): void => {
        if (positionedNodes.length === 0) {
            return;
        }
        const selectedIndex = positionedNodes.findIndex(node => node.id === props.selectedId);
        const nextIndex = selectedIndex < 0 ? 0 : (selectedIndex + offset + positionedNodes.length) % positionedNodes.length;
        props.onSelectState(positionedNodes[nextIndex].id);
    };
    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        const panStep = event.shiftKey ? 80 : 32;
        if (event.key === 'ArrowRight' && event.altKey) {
            event.preventDefault();
            selectRelativeNode(1);
        } else if (event.key === 'ArrowLeft' && event.altKey) {
            event.preventDefault();
            selectRelativeNode(-1);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            setViewport(current => ({ ...current, x: current.x - panStep }));
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            setViewport(current => ({ ...current, x: current.x + panStep }));
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            setViewport(current => ({ ...current, y: current.y - panStep }));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setViewport(current => ({ ...current, y: current.y + panStep }));
        } else if (event.key === '+' || event.key === '=') {
            event.preventDefault();
            updateZoom(0.1);
        } else if (event.key === '-') {
            event.preventDefault();
            updateZoom(-0.1);
        } else if (event.key === '0') {
            event.preventDefault();
            resetView();
        } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
            event.preventDefault();
            if (props.editable) {
                props.onUndo();
            }
        } else if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) {
            event.preventDefault();
            if (props.editable) {
                props.onRedo();
            }
        } else if (event.key.toLowerCase() === 'f') {
            event.preventDefault();
            fitView();
        } else if ((event.key === 'Delete' || event.key === 'Backspace') && props.selectedId) {
            event.preventDefault();
            if (!props.editable) {
                return;
            }
            if (props.nodes.some(node => node.id === props.selectedId)) {
                props.onDeleteState(props.selectedId);
            } else if (props.edges.some(edge => edge.id === props.selectedId)) {
                props.onDeleteTransition(props.selectedId);
            }
        }
    };
    const startPan = (event: React.PointerEvent<HTMLDivElement>): void => {
        if (event.button !== 0 || (event.target as HTMLElement).closest('.flow__flow-node')) {
            return;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag({ kind: 'pan', pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: viewport.x, originY: viewport.y });
    };
    const startNodeDrag = (event: React.PointerEvent<HTMLDivElement>, node: FlowCanvasNode): void => {
        if (!props.editable) {
            props.onSelectState(node.id);
            return;
        }
        if (event.button !== 0 || (event.target as HTMLElement).closest('.flow__flow-node-connector')) {
            return;
        }
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        props.onSelectState(node.id);
        setDrag({ kind: 'node', pointerId: event.pointerId, nodeId: node.id, startX: event.clientX, startY: event.clientY, originX: node.x, originY: node.y });
    };
    const connectNode = async (event: React.MouseEvent<HTMLButtonElement>, nodeId: string): Promise<void> => {
        event.preventDefault();
        event.stopPropagation();
        if (!props.editable) {
            props.onSelectState(nodeId);
            return;
        }
        if (!connectionSource) {
            setConnectionSource(nodeId);
            props.onSelectState(nodeId);
            return;
        }
        if (connectionSource === nodeId) {
            setConnectionSource(undefined);
            props.onSelectState(nodeId);
            return;
        }
        const transitionId = await props.onAddTransition(connectionSource, nodeId);
        setConnectionSource(undefined);
        if (transitionId) {
            props.onSelectTransition(transitionId);
        }
    };
    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
        if (!drag || drag.pointerId !== event.pointerId) {
            return;
        }
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (drag.kind === 'pan') {
            setViewport(current => ({ ...current, x: drag.originX + dx, y: drag.originY + dy }));
            return;
        }
        setLayoutOverrides(current => ({
            ...current,
            [drag.nodeId]: {
                x: Math.max(0, drag.originX + dx / viewport.zoom),
                y: Math.max(0, drag.originY + dy / viewport.zoom)
            }
        }));
    };
    const finishPointerDrag = async (event: React.PointerEvent<HTMLDivElement>): Promise<void> => {
        if (!drag || drag.pointerId !== event.pointerId) {
            return;
        }
        const completedDrag = drag;
        setDrag(undefined);
        if (completedDrag.kind !== 'node' || !props.editable) {
            return;
        }
        const positionedNode = positionedNodes.find(node => node.id === completedDrag.nodeId);
        if (positionedNode) {
            await props.onMoveState(completedDrag.nodeId, { x: positionedNode.x, y: positionedNode.y });
        }
    };

    return <div
        className='flow__flow'
        role='application'
        aria-label={`${props.workflow.name} workflow canvas`}
        tabIndex={0}
        onKeyDown={onKeyDown}
    >
        <div className='flow__flow-toolbar' aria-label='Canvas controls'>
            <button title='Zoom out' onClick={() => updateZoom(-0.1)}><i className='codicon codicon-zoom-out' /></button>
            <span>{zoomPercent}%</span>
            <button title='Zoom in' onClick={() => updateZoom(0.1)}><i className='codicon codicon-zoom-in' /></button>
            <button title='Fit view' onClick={fitView}><i className='codicon codicon-screen-full' /></button>
            <button title='Reset canvas view' onClick={resetView}><i className='codicon codicon-discard' /></button>
            <button title='Undo local workflow edit' disabled={!props.canUndo} onClick={props.onUndo}><i className='codicon codicon-arrow-left' /></button>
            <button title='Redo local workflow edit' disabled={!props.canRedo} onClick={props.onRedo}><i className='codicon codicon-redo' /></button>
            <button
                title='Delete selected state or transition'
                disabled={!props.selectedId || !props.editable}
                onClick={() => {
                    if (!props.selectedId) {
                        return;
                    }
                    if (props.nodes.some(node => node.id === props.selectedId)) {
                        props.onDeleteState(props.selectedId);
                    } else {
                        props.onDeleteTransition(props.selectedId);
                    }
                }}
            >
                <i className='codicon codicon-trash' />
            </button>
        </div>
        <div className='flow__flow-palette' aria-label='New workflow states'>
            {AGENCY_CANVAS_STATE_TYPES.map(stateType => <button
                key={stateType}
                draggable={props.editable}
                disabled={!props.editable}
                title={`Drag to add ${stateType} state`}
                onDragStart={event => onPaletteDragStart(event, stateType)}
                onClick={() => props.editable ? props.onAddState(stateType) : undefined}
            >
                <i className={`codicon ${stateTypeIcon(stateType)}`} />
                <span>{stateTypeLabel(stateType)}</span>
            </button>)}
        </div>
        <div
            className='flow__flow-viewport'
            ref={canvasRef}
            onPointerDown={startPan}
            onPointerMove={onPointerMove}
            onPointerUp={finishPointerDrag}
            onPointerCancel={finishPointerDrag}
            onWheel={onWheel}
            onDragOver={onDragOverNewState}
            onDrop={onDropNewState}
            aria-label='Workflow viewport. Drag empty space to pan, use Control plus mouse wheel to zoom, Alt plus left or right arrow to move selection.'
        >
            <div
                className='flow__flow-world'
                style={{ width, height, transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}
            >
                <svg className='flow__flow-edges' width={width} height={height}>
                    <defs>
                        <marker id='flow-flow-arrow' markerWidth='10' markerHeight='8' refX='9' refY='4' orient='auto'>
                            <path d='M 0 0 L 10 4 L 0 8 z' />
                        </marker>
                    </defs>
                    {edges.map(edge => {
                        const issueSeverity = validationIssueSeverity(canvasIssues.filter(issue => validationIssueTarget(props.workflow, issue)?.id === edge.id));
                        return <g
                        key={edge.id}
                        className={`flow__flow-edge ${props.selectedId === edge.id ? 'flow__flow-edge--selected' : ''} ${issueSeverity ? `flow__flow-edge--${issueSeverity}` : ''}`}
                        onClick={() => props.onSelectTransition(edge.id)}
                        onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                props.onSelectTransition(edge.id);
                            }
                        }}
                        role='button'
                        tabIndex={0}
                        aria-label={`Transition ${edge.from} to ${edge.to} on ${edge.event}`}
                    >
                        <line x1={edge.points[0]?.x || 0} y1={edge.points[0]?.y || 0} x2={edge.points[1]?.x || 0} y2={edge.points[1]?.y || 0} markerEnd='url(#flow-flow-arrow)' />
                        <text x={edgeMidpoint(edge, 'x')} y={edgeMidpoint(edge, 'y') - 8}>{edge.event}</text>
                        {issueSeverity && <text className='flow__flow-issue-marker' x={edgeMidpoint(edge, 'x')} y={edgeMidpoint(edge, 'y') + 24}>!</text>}
                        {edge.guardSummary && <text className='flow__flow-edge-guard' x={edgeMidpoint(edge, 'x')} y={edgeMidpoint(edge, 'y') + 10}>{edge.guardSummary}</text>}
                    </g>;
                    })}
                </svg>
                {positionedNodes.map(node => {
                    const issueSeverity = validationIssueSeverity(canvasIssues.filter(issue => validationIssueTarget(props.workflow, issue)?.id === node.id));
                    return <div
                    key={node.id}
                    className={`flow__flow-node flow__flow-node--${node.status} ${props.selectedId === node.id ? 'flow__flow-node--selected' : ''} ${connectionSource === node.id ? 'flow__flow-node--connecting' : ''} ${issueSeverity ? `flow__flow-node--${issueSeverity}` : ''}`}
                    style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
                    onPointerDown={event => startNodeDrag(event, node)}
                    onClick={() => props.onSelectState(node.id)}
                    onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            props.onSelectState(node.id);
                        }
                    }}
                    title={`${node.id}: ${node.type}`}
                    role='button'
                    tabIndex={0}
                    aria-selected={props.selectedId === node.id}
                >
                    <strong>{node.label}</strong>
                    <span>{node.type}{node.agent ? ` / ${node.agent}` : ''}</span>
                    <small>{node.status}</small>
                    {issueSeverity && <span className='flow__flow-node-issue' title={`${issueSeverity} validation issue`}>!</span>}
                    <button
                        className='flow__flow-node-connector'
                        title={connectionSource ? `Connect ${connectionSource} to ${node.id}` : `Start transition from ${node.id}`}
                        aria-label={connectionSource ? `Connect ${connectionSource} to ${node.id}` : `Start transition from ${node.id}`}
                        disabled={!props.editable}
                        onClick={event => connectNode(event, node.id)}
                    >
                        <i className={`codicon ${connectionSource ? 'codicon-debug-step-into' : 'codicon-arrow-right'}`} />
                    </button>
                </div>;
                })}
            </div>
        </div>
        <CanvasMinimap nodes={positionedNodes} width={width} height={height} viewport={viewport} viewportSize={viewportSize} />
    </div>;
}

function WorkflowSourceEditor(props: {
    workflow: FlowWorkflow;
    value: string;
    validation?: FlowSnapshot['validation'];
    parseError?: string;
    editable: boolean;
    selectedKind: 'state' | 'transition';
    selectedId?: string;
    onChange: (value: string) => Promise<void>;
    onApply: () => Promise<void>;
    onSelectIssue: (issue: FlowValidationIssue) => void;
}): React.ReactElement {
    const issues = props.validation ? [...props.validation.errors, ...props.validation.warnings] : [];
    const selectedPath = props.selectedId ? workflowSourcePathForSelection(props.workflow, props.selectedKind, props.selectedId) : undefined;
    const sourceFormat = workflowSourceFormatLabel(props.workflow);
    return <section className='flow__workflow-json' aria-label={`Workflow ${sourceFormat} editor`}>
        <div className='flow__workflow-json-header'>
            <h3>Workflow {sourceFormat}</h3>
            <span>{props.validation?.valid ? 'valid' : `${props.validation?.errors.length || 0} errors / ${props.validation?.warnings.length || 0} warnings`}</span>
            <button onClick={props.onApply} disabled={!props.editable || Boolean(props.parseError) || Boolean(props.validation && !props.validation.valid)} title={`Apply ${sourceFormat} to workflow`}>
                <i className='codicon codicon-check' /> Apply
            </button>
        </div>
        {selectedPath && <div className='flow__workflow-json-selection'>
            <span>Selection</span>
            <code>{selectedPath}</code>
        </div>}
        {props.parseError && <div className='flow__inline-validation flow__inline-validation--error'>
            <span>{props.parseError}</span>
        </div>}
        {issues.length > 0 && <div className='flow__workflow-json-issues'>
            {issues.map((issue, index) => {
                const target = validationIssueTarget(props.workflow, issue);
                return <button
                    key={`${issue.code}-${issue.path || index}`}
                    className={`flow__workflow-json-issue flow__workflow-json-issue--${props.validation?.errors.includes(issue) ? 'error' : 'warning'}`}
                    onClick={() => props.onSelectIssue(issue)}
                    disabled={!target}
                    title={target ? `Select ${target.kind} ${target.id}` : issue.path || issue.code}
                >
                    <code>{issue.path || issue.code}</code>
                    <span>{issue.message}</span>
                </button>;
            })}
        </div>}
        <textarea
            spellCheck={false}
            value={props.value}
            disabled={!props.editable}
            onChange={event => props.onChange(event.currentTarget.value)}
            aria-label={`Workflow ${sourceFormat} source`}
        />
    </section>;
}

function WorkflowSavePreview(props: {
    diff: FlowWorkflowStructuralDiff;
    busy: boolean;
    onConfirm: () => Promise<void>;
    onCancel: () => void;
}): React.ReactElement {
    const grouped = groupWorkflowStructuralDiff(props.diff.items);
    return <section className='flow__save-preview' aria-label='Workflow structural save preview'>
        <div className='flow__save-preview-header'>
            <div>
                <h3>Structural changes before save</h3>
                <span>{props.diff.fromWorkflowId} file -&gt; {props.diff.toWorkflowId} canvas</span>
            </div>
            <div className='flow__save-preview-actions'>
                <button onClick={props.onCancel} disabled={props.busy}>
                    <i className='codicon codicon-close' /> Cancel
                </button>
                <button onClick={props.onConfirm} disabled={props.busy}>
                    <i className='codicon codicon-save' /> Save changes
                </button>
            </div>
        </div>
        {grouped.map(group => <section key={group.kind} className='flow__save-preview-group'>
            <h4>{group.kind}</h4>
            {group.items.map(item => <article key={`${item.kind}-${item.change}-${item.id}-${item.summary}`} className={`flow__save-preview-item flow__save-preview-item--${item.change}`}>
                <strong>{item.change}</strong>
                <code>{item.id}</code>
                <span>{item.summary}</span>
            </article>)}
        </section>)}
    </section>;
}

function Inspector(props: {
    workflow?: FlowWorkflow;
    run?: FlowRun;
    selectedStateId?: string;
    selectedState?: FlowWorkflow['states'][string];
    selectedTransition?: FlowWorkflowTransition;
    gates: FlowHumanGate[];
    validation?: FlowSnapshot['validation'];
    onUpdateState: (stateId: string, statePatch: Partial<FlowWorkflow['states'][string]>) => Promise<void>;
    onOpenAgent: (agentIdOrPath: string) => Promise<void>;
    onAddBranch: (parallelStateId: string, branchType: FlowStateType) => Promise<string | undefined>;
    onDeleteState: (stateId: string) => Promise<void>;
    onUpdateTransition: (transitionId: string, transitionPatch: Partial<FlowWorkflowTransition>) => Promise<void>;
    onDeleteTransition: (transitionId: string) => Promise<void>;
    onSaveWorkflow: () => Promise<void>;
    onApproveGate: (gateId: string, decision: 'approved' | 'rejected' | 'revision_requested') => Promise<void>;
    onOpenArtifact: (artifactUri: string) => Promise<void>;
    readOnlyRun: boolean;
}): React.ReactElement {
    if (!props.workflow) {
        return <Panel title='Inspector'><p>No workflow loaded.</p></Panel>;
    }
    if (props.selectedTransition) {
        const transition = props.selectedTransition;
        const evaluated = lastTransitionEvent(props.run?.events || [], transition, 'transition.evaluated');
        const fired = lastTransitionEvent(props.run?.events || [], transition, 'transition.fired');
        return <Panel title='Transition'>
            <KeyValue label='From' value={transition.from} />
            <KeyValue label='To' value={transition.to} />
            <KeyValue label='Event' value={transition.on} />
            <KeyValue label='Priority' value={transition.priority?.toString() || 'default'} />
            <JsonBlock title='Guard' value={transition.guard || {}} />
            <TransitionEditor
                transitionId={transitionKey(transition)}
                transition={transition}
                stateIds={flowWorkflowStateIds(props.workflow)}
                editable={props.workflow.file?.editable !== false}
                issues={(props.validation ? [...props.validation.errors, ...props.validation.warnings] : []).filter(issue =>
                    issue.path?.includes('transitions') && (issue.message.includes(transition.from) || issue.message.includes(transition.to))
                )}
                onUpdateTransition={props.onUpdateTransition}
                onDeleteTransition={props.onDeleteTransition}
                onSaveWorkflow={props.onSaveWorkflow}
            />
            <EventSummary title='Last evaluation' event={evaluated} />
            <EventSummary title='Last firing' event={fired} />
            {(evaluated?.payload || fired?.payload) && <JsonBlock title='Guard payload / reason' value={{
                evaluated: evaluated?.payload,
                fired: fired?.payload
            }} />}
        </Panel>;
    }
    const state = props.selectedState;
    if (!state || !props.selectedStateId) {
        return <Panel title='Inspector'><p>Select a state or transition.</p></Panel>;
    }
    const selectedStateId = props.selectedStateId;
    const stateGates = props.gates.filter(gate => gate.stateId === selectedStateId);
    const stateWorkloads = props.run?.workloads.filter(workload => workload.stateId === selectedStateId) || [];
    const artifacts = props.run?.artifacts.filter(artifact => artifact.stateId === selectedStateId) || [];
    const effects = props.run?.effects.filter(effect => effect.stateId === selectedStateId) || [];
    const signals = props.run?.signals.filter(signal => signal.stateId === selectedStateId) || [];
    const events = relevantStateEvents(props.run?.events || [], selectedStateId, stateWorkloads.map(workload => workload.id), stateGates.map(gate => gate.id));
    const validationIssues = props.validation ? [...props.validation.errors, ...props.validation.warnings]
        .filter(issue => issue.path?.includes(`states.${selectedStateId}`) || issue.message.includes(selectedStateId)) : [];
    return <Panel title='State'>
        <KeyValue label='Id' value={selectedStateId} />
        <KeyValue label='Type' value={state.type} />
        <KeyValue label='Agent' value={state.agent || 'none'} />
        {state.agent && <AgentMarkdownActions
            workflow={props.workflow}
            agentIdOrPath={state.agent}
            onOpenAgent={props.onOpenAgent}
        />}
        <KeyValue label='Inputs' value={(state.input?.include || []).join(', ') || 'none'} />
        <KeyValue label='Outputs' value={(state.outputs || []).join(', ') || 'none'} />
        <KeyValue label='Signals' value={(state.input?.signals || []).join(', ') || signals.map(signal => signal.key).join(', ') || 'none'} />
        <KeyValue label='Timeout' value={state.timeoutMs ? `${state.timeoutMs} ms` : 'none'} />
        <KeyValue label='Retry' value={state.retry ? `max ${state.retry.max}${state.retry.counter ? ` / ${state.retry.counter}` : ''}` : 'none'} />
        <KeyValue label='Workloads' value={stateWorkloads.length.toString()} />
        {state.waitFor && <KeyValue label='Wait for' value={state.waitFor.join(', ') || 'none'} />}
        {state.branches && <KeyValue label='Branches' value={Object.keys(state.branches).join(', ') || 'none'} />}
        <StateEditor
            stateId={selectedStateId}
            state={state}
            editable={props.workflow.file?.editable !== false}
            issues={validationIssues}
            onUpdateState={props.onUpdateState}
            onOpenAgent={props.onOpenAgent}
            onAddBranch={props.onAddBranch}
            onDeleteState={props.onDeleteState}
            onSaveWorkflow={props.onSaveWorkflow}
        />
        <RunList title='Artifacts' empty='No artifacts for this state.' items={artifacts.map(artifact => ({
            id: artifact.id,
            title: artifact.uri,
            meta: `${artifact.kind}${artifact.summary ? ` / ${artifact.summary}` : ''}`,
            onOpen: () => props.onOpenArtifact(artifact.uri)
        }))} />
        <RunList title='Effects' empty='No effects for this state.' items={effects.map(effect => ({
            id: effect.id,
            title: `${effect.kind} / ${effect.status}`,
            meta: effect.summary
        }))} />
        <RunList title='Signals' empty='No signals for this state.' items={signals.map(signal => ({
            id: signal.key,
            title: signal.key,
            meta: String(signal.value)
        }))} />
        <RunList title='Workload details' empty='No workloads for this state.' items={stateWorkloads.map(workload => ({
            id: workload.id,
            title: `${workload.id} / ${workload.status}`,
            meta: [
                workload.agent || 'system',
                workload.branchId ? `branch ${workload.branchId}` : undefined,
                workload.inputArtifacts.length ? `in ${workload.inputArtifacts.join(', ')}` : undefined,
                workload.outputArtifacts.length ? `out ${workload.outputArtifacts.join(', ')}` : undefined,
                workload.effectIds.length ? `effects ${workload.effectIds.join(', ')}` : undefined,
                workload.reportUri ? `report ${workload.reportUri}` : undefined,
                workload.issues.length ? `issues ${workload.issues.join(', ')}` : undefined
            ].filter(Boolean).join(' / ')
        }))} />
        {stateGates.map(gate => <div className='flow__gate' key={gate.id}>
            <strong>{gate.title}</strong>
            <span>{gate.status}</span>
            {gate.prompt && <small>{gate.prompt}</small>}
            {gate.status === 'pending' && !props.readOnlyRun && <div className='flow__gate-actions'>
                <button onClick={() => props.onApproveGate(gate.id, 'approved')}>Approve</button>
                <button onClick={() => props.onApproveGate(gate.id, 'revision_requested')}>Review</button>
                <button onClick={() => props.onApproveGate(gate.id, 'rejected')}>Reject</button>
            </div>}
        </div>)}
        <RunList title='Relevant events' empty='No events for this state.' items={events.map(event => ({
            id: event.id,
            title: `${event.type} / ${new Date(event.timestamp).toLocaleTimeString()}`,
            meta: event.message
        }))} />
    </Panel>;
}

function StateEditor(props: {
    stateId: string;
    state: FlowWorkflow['states'][string];
    editable: boolean;
    issues: FlowValidationIssue[];
    onUpdateState: (stateId: string, statePatch: Partial<FlowWorkflow['states'][string]>) => Promise<void>;
    onOpenAgent: (agentIdOrPath: string) => Promise<void>;
    onAddBranch: (parallelStateId: string, branchType: FlowStateType) => Promise<string | undefined>;
    onDeleteState: (stateId: string) => Promise<void>;
    onSaveWorkflow: () => Promise<void>;
}): React.ReactElement {
    const updateInput = (patch: Partial<NonNullable<FlowWorkflow['states'][string]['input']>>) =>
        props.onUpdateState(props.stateId, { input: compactObject({ ...(props.state.input || {}), ...patch }) });
    return <section className='flow__state-editor' aria-label='State editor'>
        <div className='flow__section-heading'>
            <h4>Workflow fields</h4>
            <button onClick={props.onSaveWorkflow} disabled={!props.editable} title='Save workflow file'>
                <i className='codicon codicon-save' /> Save
            </button>
            <button onClick={() => props.onDeleteState(props.stateId)} disabled={!props.editable} title='Delete state'>
                <i className='codicon codicon-trash' /> Delete
            </button>
        </div>
        {props.issues.length > 0 && <div className='flow__inline-validation'>
            {props.issues.map(issue => <span key={`${issue.code}-${issue.path || issue.message}`}>{issue.message}</span>)}
        </div>}
        <label>
            <span>Agent</span>
            <div className='flow__agent-field'>
                <input
                    value={props.state.agent || ''}
                    disabled={!props.editable}
                    onChange={event => props.onUpdateState(props.stateId, { agent: emptyToUndefined(event.currentTarget.value) })}
                />
                <button
                    disabled={!props.state.agent}
                    title='Open agent Markdown in Theia editor'
                    onClick={() => props.state.agent && props.onOpenAgent(props.state.agent)}
                >
                    <i className='codicon codicon-edit' />
                </button>
            </div>
        </label>
        <label>
            <span>Input includes</span>
            <textarea
                rows={3}
                value={listToText(props.state.input?.include)}
                disabled={!props.editable}
                onChange={event => updateInput({ include: textToList(event.currentTarget.value) })}
            />
        </label>
        <label>
            <span>Input signals</span>
            <textarea
                rows={2}
                value={listToText(props.state.input?.signals)}
                disabled={!props.editable}
                onChange={event => updateInput({ signals: textToList(event.currentTarget.value) })}
            />
        </label>
        <label>
            <span>Outputs</span>
            <textarea
                rows={3}
                value={listToText(props.state.outputs)}
                disabled={!props.editable}
                onChange={event => props.onUpdateState(props.stateId, { outputs: textToList(event.currentTarget.value) })}
            />
        </label>
        <div className='flow__editor-grid'>
            <label>
                <span>Timeout ms</span>
                <input
                    type='number'
                    min='0'
                    value={props.state.timeoutMs ?? ''}
                    disabled={!props.editable}
                    onChange={event => props.onUpdateState(props.stateId, { timeoutMs: numberOrUndefined(event.currentTarget.value) })}
                />
            </label>
            <label>
                <span>Retry max</span>
                <input
                    type='number'
                    min='0'
                    value={props.state.retry?.max ?? ''}
                    disabled={!props.editable}
                    onChange={event => props.onUpdateState(props.stateId, {
                        retry: retryOrUndefined(numberOrUndefined(event.currentTarget.value), props.state.retry?.counter)
                    })}
                />
            </label>
            <label>
                <span>Retry counter</span>
                <input
                    value={props.state.retry?.counter || ''}
                    disabled={!props.editable}
                    onChange={event => props.onUpdateState(props.stateId, {
                        retry: retryOrUndefined(props.state.retry?.max, emptyToUndefined(event.currentTarget.value))
                    })}
                />
            </label>
        </div>
        {props.state.type === 'parallel' && <section className='flow__branch-editor' aria-label='Parallel branches'>
            <div className='flow__section-heading'>
                <h4>Branches</h4>
                <span>{Object.keys(props.state.branches || {}).length}</span>
            </div>
            <div className='flow__branch-list'>
                {Object.entries(props.state.branches || {}).map(([branchId, branch]) => <span key={branchId}>
                    <i className={`codicon ${stateTypeIcon(branch.type)}`} /> {branchId} / {branch.type}
                </span>)}
                {Object.keys(props.state.branches || {}).length === 0 && <span>No branches.</span>}
            </div>
            <div className='flow__branch-actions'>
                {AGENCY_CANVAS_BRANCH_TYPES.map(stateType => <button
                    key={stateType}
                    disabled={!props.editable}
                    title={`Add ${stateType} branch`}
                    onClick={() => props.onAddBranch(props.stateId, stateType)}
                >
                    <i className={`codicon ${stateTypeIcon(stateType)}`} />
                    <span>{stateTypeLabel(stateType)}</span>
                </button>)}
            </div>
        </section>}
    </section>;
}

function AgentMarkdownActions(props: {
    workflow: FlowWorkflow;
    agentIdOrPath: string;
    onOpenAgent: (agentIdOrPath: string) => Promise<void>;
}): React.ReactElement {
    const relativePath = props.workflow.agents?.[props.agentIdOrPath] || props.agentIdOrPath;
    return <section className='flow__agent-markdown' aria-label='Agent Markdown'>
        <div className='flow__section-heading'>
            <h4>Agent Markdown</h4>
            <button onClick={() => props.onOpenAgent(props.agentIdOrPath)} title='Open agent Markdown in Theia editor'>
                <i className='codicon codicon-edit' /> Open
            </button>
        </div>
        <code>{relativePath}</code>
        <p>Agents describe role, instructions, inputs, and output format only. Workflow flow control remains in the workflow file and kernel.</p>
    </section>;
}

function TransitionEditor(props: {
    transitionId: string;
    transition: FlowWorkflowTransition;
    stateIds: string[];
    editable: boolean;
    issues: FlowValidationIssue[];
    onUpdateTransition: (transitionId: string, transitionPatch: Partial<FlowWorkflowTransition>) => Promise<void>;
    onDeleteTransition: (transitionId: string) => Promise<void>;
    onSaveWorkflow: () => Promise<void>;
}): React.ReactElement {
    const [guardText, setGuardText] = React.useState(formatGuard(props.transition.guard));
    const [guardError, setGuardError] = React.useState<string>();

    React.useEffect(() => {
        setGuardText(formatGuard(props.transition.guard));
        setGuardError(undefined);
    }, [props.transitionId, props.transition.guard]);

    const updateGuard = (value: string): void => {
        setGuardText(value);
        const trimmed = value.trim();
        if (!trimmed) {
            setGuardError(undefined);
            props.onUpdateTransition(props.transitionId, { guard: undefined });
            return;
        }
        try {
            const guard = JSON.parse(trimmed);
            if (!isPlainObject(guard)) {
                setGuardError('Guard must be a JSON object.');
                return;
            }
            setGuardError(undefined);
            props.onUpdateTransition(props.transitionId, { guard });
        } catch (error) {
            setGuardError(error instanceof Error ? error.message : String(error));
        }
    };

    return <section className='flow__transition-editor' aria-label='Transition editor'>
        <div className='flow__section-heading'>
            <h4>Transition fields</h4>
            <button onClick={props.onSaveWorkflow} disabled={!props.editable} title='Save workflow file'>
                <i className='codicon codicon-save' /> Save
            </button>
            <button onClick={() => props.onDeleteTransition(props.transitionId)} disabled={!props.editable} title='Delete transition'>
                <i className='codicon codicon-trash' /> Delete
            </button>
        </div>
        {props.issues.length > 0 && <div className='flow__inline-validation'>
            {props.issues.map(issue => <span key={`${issue.code}-${issue.path || issue.message}`}>{issue.message}</span>)}
        </div>}
        <label>
            <span>From</span>
            <select
                value={props.transition.from}
                disabled={!props.editable}
                onChange={event => props.onUpdateTransition(props.transitionId, { from: event.currentTarget.value })}
            >
                {props.stateIds.map(stateId => <option key={stateId} value={stateId}>{stateId}</option>)}
            </select>
        </label>
        <label>
            <span>To</span>
            <select
                value={props.transition.to}
                disabled={!props.editable}
                onChange={event => props.onUpdateTransition(props.transitionId, { to: event.currentTarget.value })}
            >
                {props.stateIds.map(stateId => <option key={stateId} value={stateId}>{stateId}</option>)}
            </select>
        </label>
        <label>
            <span>On</span>
            <input
                value={props.transition.on}
                disabled={!props.editable}
                onChange={event => props.onUpdateTransition(props.transitionId, { on: event.currentTarget.value })}
            />
        </label>
        <label>
            <span>Guard JSON</span>
            <textarea
                rows={5}
                value={guardText}
                disabled={!props.editable}
                onChange={event => updateGuard(event.currentTarget.value)}
            />
        </label>
        {guardError && <div className='flow__inline-validation'><span>{guardError}</span></div>}
        <label>
            <span>Priority</span>
            <input
                type='number'
                value={props.transition.priority ?? ''}
                disabled={!props.editable}
                onChange={event => props.onUpdateTransition(props.transitionId, { priority: numberOrUndefined(event.currentTarget.value) })}
            />
        </label>
    </section>;
}

function Kanban(props: { run?: FlowRun; onOpenArtifact: (artifactUri: string) => Promise<void> }): React.ReactElement {
    const columns = deriveFlowKanbanColumns(props.run?.workloads || []);
    return <section className='flow__kanban' aria-label='Workloads'>
        {columns.map(column => <div className='flow__kanban-column' key={column.id}>
            <h3>{column.label}</h3>
            {column.workloads.map(workload => <article className='flow__workload' key={workload.id}>
                <strong>{workload.stateId}</strong>
                <span>{workload.agent || 'system'}</span>
                <small>{workload.outputArtifacts.length} artifacts / {workload.effectIds.length} effects</small>
                {workload.outputArtifacts.length > 0 && <div className='flow__workload-artifacts'>
                    {workload.outputArtifacts.map(artifactUri => <button
                        key={artifactUri}
                        type='button'
                        title={`Open ${artifactUri}`}
                        onClick={() => props.onOpenArtifact(artifactUri)}
                    >
                        <i className='codicon codicon-file' />
                        <span>{artifactLabel(artifactUri)}</span>
                    </button>)}
                </div>}
            </article>)}
        </div>)}
    </section>;
}

function RunObservability(props: {
    run?: FlowRun;
    selectedArtifactId?: string;
    onSelectArtifact: (artifactId: string) => void;
    onOpenArtifact: (artifactUri: string) => Promise<void>;
    onDecideMemoryCandidate: (
        candidateId: string,
        decision: 'approved' | 'rejected',
        content: string,
        scope?: FlowMemoryScope,
        target?: string
    ) => Promise<void>;
    onDecideEffect: (effectId: string, decision: 'approved' | 'rejected' | 'applied', note?: string) => Promise<void>;
    onApproveSecondRunSuggestion: (suggestionId: string) => Promise<void>;
    onDismissSecondRunSuggestion: (suggestionId: string) => Promise<void>;
    busy: boolean;
    readOnly: boolean;
}): React.ReactElement {
    const run = props.run;
    const selectedArtifact = run?.artifacts.find(artifact => artifact.id === props.selectedArtifactId) || run?.artifacts[0];
    return <section className='flow__run-observability' aria-label='Run observability'>
        <h3>{nls.localize('theia/flow/observability', 'Run')}</h3>
        {!run && <p>No active run.</p>}
        {run && <>
            <KeyValue label='Status' value={run.status} />
            <KeyValue label='Modo de execucao' value={executionModeLabel(run.executionMode)} />
            {run.executionModeMessage && <RunList title='Detalhes do modo' empty='Sem detalhes.' items={[{
                id: 'run-execution-mode-message',
                title: run.executionModeMessage
            }]} />}
            <KeyValue label='Tick' value={run.tick.toString()} />
            <KeyValue label='Current' value={run.currentStateIds.join(', ') || 'none'} />
            {run.audit?.readOnly && <RunAuditSummary run={run} />}
            <FinalReportSummary run={run} />
            {run.secondRunSuggestion && <SecondRunSuggestion
                suggestion={run.secondRunSuggestion}
                busy={props.busy || props.readOnly}
                onApprove={props.onApproveSecondRunSuggestion}
                onDismiss={props.onDismissSecondRunSuggestion}
            />}
            <ArtifactBrowser
                run={run}
                selectedArtifact={selectedArtifact}
                onSelectArtifact={props.onSelectArtifact}
                onOpenArtifact={props.onOpenArtifact}
            />
            <EffectReview
                effects={run.effects}
                busy={props.busy || props.readOnly}
                onDecide={props.onDecideEffect}
            />
            <MemoryCandidateReview
                candidates={run.memoryCandidates || []}
                busy={props.busy || props.readOnly}
                onDecide={props.onDecideMemoryCandidate}
            />
            {run.memoryWrites && <RunList title='Memory writes' empty='No memory writes.' items={run.memoryWrites.map(write => ({
                id: write.id,
                title: `${write.status} / ${write.target || 'default'}`,
                meta: write.error ? `${write.content} / ${write.error}` : write.content
            }))} />}
            {run.contextPack && <div className='flow__context-pack'>
                <h4>Context pack</h4>
                <KeyValue label='Summary' value={run.contextPack.summary} />
                <KeyValue label='Workflow' value={`${run.contextPack.workflow.stateCount} states / ${run.contextPack.workflow.transitionCount} transitions`} />
                <KeyValue label='Agents' value={run.contextPack.workflow.agentIds.join(', ') || 'none'} />
                {run.contextPack.missingService && <KeyValue label='Provider' value={run.contextPack.missingService} />}
                <RunList title='Files' empty='No files.' items={run.contextPack.files.map(file => ({
                    id: file.uri,
                    title: file.uri,
                    meta: file.reason
                }))} />
                <RunList title='Signals' empty='No context signals.' items={run.contextPack.signals.map(signal => ({
                    id: signal.key,
                    title: signal.key,
                    meta: `${signal.value}${signal.stateId ? ` / ${signal.stateId}` : ''}`
                }))} />
            </div>}
        </>}
    </section>;
}

interface RunListItem {
    id: string;
    title: string;
    meta?: string;
    onOpen?: () => Promise<void> | void;
}

function FinalReportSummary(props: { run: FlowRun }): React.ReactElement {
    const summary = deriveFinalReportSummary(props.run);
    return <section className='flow__final-report-summary'>
        <div className='flow__section-heading'>
            <h4>Relatorio final</h4>
            <span>{summary.reportArtifactCount} report artifact{summary.reportArtifactCount === 1 ? '' : 's'}</span>
        </div>
        <p>{summary.summary}</p>
        <div className='flow__report-metrics' aria-label='Final report metrics'>
            <KeyValue label='Workloads' value={`${summary.completedWorkloads}/${props.run.workloads.length} done`} />
            <KeyValue label='Artifacts' value={props.run.artifacts.length.toString()} />
            <KeyValue label='Effects' value={props.run.effects.length.toString()} />
            <KeyValue label='Issues' value={`${summary.blockingIssues.length} blocking / ${summary.followupIssues.length} follow-up`} />
        </div>
        <RunList title='Issues bloqueantes' empty='Nenhuma issue bloqueante.' items={summary.blockingIssues.map((issue, index) => issueToRunListItem(issue, index))} />
        <RunList title='Follow-ups' empty='Nenhum follow-up registrado.' items={summary.followupIssues.map((issue, index) => issueToRunListItem(issue, index))} />
    </section>;
}

function RunAuditSummary(props: { run: FlowRun }): React.ReactElement {
    const manifest = props.run.audit?.manifest;
    const manifestItems = manifest ? Object.entries(manifest).map(([key, value]) => ({
        id: key,
        title: key,
        meta: typeof value === 'string' ? value : JSON.stringify(value)
    })) : [];
    return <div className='flow__audit-summary'>
        <h4>Audit import</h4>
        <KeyValue label='Mode' value='Read-only' />
        <KeyValue label='Imported' value={props.run.audit?.importedAt || ''} />
        <KeyValue label='Source' value={props.run.audit?.sourcePath || ''} />
        {props.run.audit?.packagePath && <KeyValue label='Package' value={props.run.audit.packagePath} />}
        <RunList title='Manifest' empty='No manifest.json was imported.' items={manifestItems} />
    </div>;
}

function EffectReview(props: {
    effects: FlowEffect[];
    busy: boolean;
    onDecide: (effectId: string, decision: 'approved' | 'rejected' | 'applied', note?: string) => Promise<void>;
}): React.ReactElement {
    const [notes, setNotes] = React.useState<Record<string, string>>({});
    const noteFor = (effectId: string): string => notes[effectId] || '';
    const setNote = (effectId: string, note: string): void => setNotes(current => ({ ...current, [effectId]: note }));
    return <section className='flow__effect-review' aria-label='Effect review'>
        <div className='flow__section-heading'>
            <h4>Effects</h4>
            <span>{props.effects.length} recorded</span>
        </div>
        {props.effects.length === 0 && <p>No effects yet.</p>}
        {props.effects.map(effect => {
            const terminal = ['applied', 'rejected', 'blocked', 'failed'].includes(effect.status);
            const note = noteFor(effect.id);
            const blockReason = effectBlockReason(effect);
            const canApply = (isFileEffectForReview(effect) || isImageEffectForReview(effect)) && !terminal && effect.status !== 'blocked';
            return <article key={effect.id} className={`flow__effect-card flow__effect-card--${effect.status}`}>
                <header>
                    <div>
                        <strong>{effect.kind} / {effect.status}</strong>
                        <span>{effect.summary}</span>
                    </div>
                    <code>{effect.id}</code>
                </header>
                <div className='flow__effect-metadata'>
                    <KeyValue label='Path' value={effect.path || effect.artifactPath || 'none'} />
                    <KeyValue label='State' value={effect.stateId} />
                    <KeyValue label='Policy' value={effect.approvalPolicy || 'unspecified'} />
                    {effect.provider && <KeyValue label='Provider' value={effect.provider} />}
                    {effect.mimeType && <KeyValue label='MIME' value={effect.mimeType} />}
                    {typeof effect.bytes === 'number' && <KeyValue label='Bytes' value={effect.bytes.toString()} />}
                    <KeyValue label='Hash before' value={effect.hashBefore || 'none'} />
                    <KeyValue label='Hash after' value={effect.hashAfter || 'none'} />
                    {effect.command && <KeyValue label='Command' value={effect.command} />}
                    {effect.cwd && <KeyValue label='CWD' value={effect.cwd} />}
                    {typeof effect.exitCode === 'number' && <KeyValue label='Exit' value={effect.exitCode.toString()} />}
                </div>
                {blockReason && <p className='flow__effect-blocked'>Blocked: {blockReason}</p>}
                {!isFileEffectForReview(effect) && !isImageEffectForReview(effect) && !terminal && <p className='flow__effect-blocked'>Apply is available for file and image effects; this effect can be rejected here and handled by its capability adapter.</p>}
                {effect.patch && <PatchViewer patch={effect.patch} />}
                {!effect.patch && effect.stdout && <LogViewer effect={effect} />}
                <textarea
                    rows={2}
                    value={note}
                    disabled={props.busy || terminal}
                    placeholder='Approval/rejection note'
                    onChange={event => setNote(effect.id, event.currentTarget.value)}
                />
                <div className='flow__effect-actions'>
                    <button type='button' disabled={props.busy || terminal} onClick={() => props.onDecide(effect.id, 'rejected', note)}>
                        Reject
                    </button>
                    <button type='button' disabled={props.busy || !canApply} onClick={() => props.onDecide(effect.id, 'applied', note)}>
                        Apply
                    </button>
                </div>
            </article>;
        })}
    </section>;
}

function normalizeFlowSnapshotEvents(snapshot: FlowSnapshot): FlowSnapshot {
    return snapshot.activeRun
        ? { ...snapshot, activeRun: normalizeFlowRunEvents(snapshot.activeRun) }
        : snapshot;
}

function normalizeFlowRunEvents(run: FlowRun): FlowRun {
    const redacted = redactFlowRunForDisplay(run);
    return { ...redacted, events: normalizeFlowEvents(redacted.events || []) };
}

function resolveSelectedArtifactId(run: FlowRun, selectedArtifactId: string | undefined): string | undefined {
    if (selectedArtifactId && run.artifacts.some(artifact => artifact.id === selectedArtifactId)) {
        return selectedArtifactId;
    }
    return run.artifacts[0]?.id;
}

function deriveFinalReportSummary(run: FlowRun): {
    summary: string;
    completedWorkloads: number;
    reportArtifactCount: number;
    blockingIssues: FlowWorkloadResultIssue[];
    followupIssues: FlowWorkloadResultIssue[];
} {
    const completedWorkloads = run.workloads.filter(workload => workload.status === 'done').length;
    const reportArtifactCount = run.artifacts.filter(artifact => artifact.kind === 'report').length;
    const workloadReports = run.workloads
        .map(workload => workload.outputEnvelope?.report || workload.outputEnvelope?.result?.summary)
        .filter((report): report is string => Boolean(report && report.trim()));
    const summary = firstParagraph(workloadReports[workloadReports.length - 1])
        || terminalEventSummary(run)
        || `${run.status} run with ${completedWorkloads} completed workload${completedWorkloads === 1 ? '' : 's'}.`;
    const issues = collectRunIssues(run);
    return {
        summary,
        completedWorkloads,
        reportArtifactCount,
        blockingIssues: issues.filter(isBlockingIssue),
        followupIssues: mergeIssueLists(issues.filter(isFollowupIssue), run.secondRunSuggestion?.issues || [])
    };
}

function collectRunIssues(run: FlowRun): FlowWorkloadResultIssue[] {
    const issues: FlowWorkloadResultIssue[] = [];
    for (const workload of run.workloads) {
        issues.push(...(workload.outputEnvelope?.issues || []));
        for (const issue of workload.issues) {
            issues.push({ severity: 'blocking', type: 'workload_issue', summary: issue });
        }
    }
    return mergeIssueLists(issues, []);
}

function issueToRunListItem(issue: FlowWorkloadResultIssue, index: number): RunListItem {
    return redactFlowSecretsValue({
        id: `${issue.severity}-${issue.type}-${issue.summary}-${index}`,
        title: `${issue.severity || 'issue'} / ${issue.type || 'general'}`,
        meta: issue.suggestedFollowup ? `${issue.summary} / ${issue.suggestedFollowup}` : issue.summary
    });
}

function isBlockingIssue(issue: FlowWorkloadResultIssue): boolean {
    const severity = (issue.severity || '').toLowerCase();
    return ['blocking', 'blocker', 'critical', 'fatal', 'high', 'error', 'failed', 'failure'].includes(severity);
}

function isFollowupIssue(issue: FlowWorkloadResultIssue): boolean {
    const severity = (issue.severity || '').toLowerCase();
    const text = [issue.type, issue.summary, issue.suggestedFollowup].join(' ').toLowerCase();
    return ['followup', 'follow_up', 'non_blocking', 'warning', 'minor', 'info'].includes(severity)
        || text.includes('followup')
        || text.includes('follow-up')
        || text.includes('out-of-scope')
        || text.includes('out of scope')
        || text.includes('fora de escopo')
        || text.includes('melhoria')
        || text.includes('improvement')
        || text.includes('second run')
        || text.includes('segunda run');
}

function mergeIssueLists(primary: FlowWorkloadResultIssue[], secondary: FlowWorkloadResultIssue[]): FlowWorkloadResultIssue[] {
    const seen = new Set<string>();
    const out: FlowWorkloadResultIssue[] = [];
    for (const issue of [...primary, ...secondary]) {
        const key = `${issue.severity}:${issue.type}:${issue.summary}:${issue.suggestedFollowup || ''}`;
        if (!seen.has(key)) {
            seen.add(key);
            out.push(issue);
        }
    }
    return out;
}

function terminalEventSummary(run: FlowRun): string | undefined {
    return run.events
        .slice()
        .reverse()
        .find(event => event.type === 'run.completed' || event.type === 'run.failed' || event.type === 'run.cancelled')
        ?.message;
}

function firstParagraph(value?: string): string | undefined {
    const paragraph = value?.split(/\n\s*\n/).map(part => part.trim()).find(Boolean);
    return paragraph && paragraph.length > 240 ? `${paragraph.slice(0, 237)}...` : paragraph;
}

function EventLog(props: { events: FlowEvent[] }): React.ReactElement {
    const [filter, setFilter] = React.useState<FlowEventLogFilter>({});
    const filteredEvents = filterFlowEvents(props.events, filter);
    const hasFilter = hasFlowEventLogFilter(filter);
    const setFilterValue = (key: keyof FlowEventLogFilter, value: string): void => {
        setFilter(current => ({ ...current, [key]: value || undefined }));
    };
    const options = {
        stateId: eventOptionValues(props.events, event => event.stateId),
        workloadId: eventOptionValues(props.events, event => event.workloadId),
        eventType: eventOptionValues(props.events, event => event.type),
        gateId: eventOptionValues(props.events, event => event.gateId),
        artifact: eventOptionValues(props.events, event => eventPayloadValues(event, ['artifactId', 'artifact', 'path', 'artifactPath', 'targetPath'])),
        effect: eventOptionValues(props.events, event => eventPayloadValues(event, ['effectId', 'effect', 'effectType', 'type'])),
        severity: eventOptionValues(props.events, event => eventPayloadValues(event, ['severity']))
    };
    return <section className='flow__events' aria-label='Run events'>
        <div className='flow__events-header'>
            <h3>{nls.localize('theia/flow/events', 'Events')}</h3>
            <span>{filteredEvents.length} / {props.events.length}</span>
        </div>
        <div className='flow__event-filters' aria-label='Event filters'>
            <EventFilterSelect label='State' value={filter.stateId} values={options.stateId} onChange={value => setFilterValue('stateId', value)} />
            <EventFilterSelect label='Workload' value={filter.workloadId} values={options.workloadId} onChange={value => setFilterValue('workloadId', value)} />
            <EventFilterSelect label='Type' value={filter.eventType} values={options.eventType} onChange={value => setFilterValue('eventType', value)} />
            <EventFilterSelect label='Gate' value={filter.gateId} values={options.gateId} onChange={value => setFilterValue('gateId', value)} />
            <EventFilterSelect label='Artifact' value={filter.artifact} values={options.artifact} onChange={value => setFilterValue('artifact', value)} />
            <EventFilterSelect label='Effect' value={filter.effect} values={options.effect} onChange={value => setFilterValue('effect', value)} />
            <EventFilterSelect label='Severity' value={filter.severity} values={options.severity} onChange={value => setFilterValue('severity', value)} />
            <button type='button' title='Clear event filters' disabled={!hasFilter} onClick={() => setFilter({})}>
                <i className='codicon codicon-clear-all' />
            </button>
        </div>
        <div>
            {filteredEvents.length === 0 && <p>No events match the current filters.</p>}
            {filteredEvents.slice().reverse().map(event => <article key={event.id}>
                <time>{new Date(event.timestamp).toLocaleTimeString()}</time>
                <strong>{event.type}</strong>
                <span>{redactFlowSecretsText(event.message)}</span>
            </article>)}
        </div>
    </section>;
}

function SecondRunSuggestion(props: {
    suggestion: NonNullable<FlowRun['secondRunSuggestion']>;
    busy: boolean;
    onApprove: (suggestionId: string) => Promise<void>;
    onDismiss: (suggestionId: string) => Promise<void>;
}): React.ReactElement {
    const suggestion = props.suggestion;
    const accepted = suggestion.status === 'accepted';
    const dismissed = suggestion.status === 'dismissed';
    return <section className='flow__second-run-suggestion'>
        <div className='flow__section-heading'>
            <h4>{suggestion.title}</h4>
            <div className='flow__second-run-actions'>
                <button
                    type='button'
                    title={dismissed ? 'Second run suggestion dismissed' : 'Dismiss suggested second run'}
                    disabled={props.busy || suggestion.status !== 'suggested'}
                    onClick={() => props.onDismiss(suggestion.id)}
                >
                    <i className='codicon codicon-close' />
                    {dismissed ? 'Dispensada' : 'Dispensar'}
                </button>
                <button
                    type='button'
                    title={accepted ? 'Second run already approved' : 'Approve suggested second run'}
                    disabled={props.busy || suggestion.status !== 'suggested'}
                    onClick={() => props.onApprove(suggestion.id)}
                >
                    <i className={accepted ? 'codicon codicon-check' : 'codicon codicon-run'} />
                    {accepted ? 'Aprovada' : 'Aprovar segunda run'}
                </button>
            </div>
        </div>
        <p>{suggestion.reason}</p>
        {accepted && <p>Nova run: {suggestion.approvedRunId || 'registrada'} / Workflow: {suggestion.approvedWorkflowId || 'registrado'}</p>}
        {dismissed && <p>Sugestao dispensada; nenhuma nova run sera criada para estes follow-ups.</p>}
        <RunList title='Follow-ups' empty='No follow-ups.' items={suggestion.issues.map((issue, index) => ({
            id: `${issue.type}-${index}`,
            title: `${issue.severity} / ${issue.type}`,
            meta: issue.suggestedFollowup ? `${issue.summary} / ${issue.suggestedFollowup}` : issue.summary
        }))} />
        <details>
            <summary>Prompt sugerido</summary>
            <pre>{redactFlowSecretsText(suggestion.prompt)}</pre>
        </details>
    </section>;
}

function EventFilterSelect(props: { label: string; value?: string; values: string[]; onChange: (value: string) => void }): React.ReactElement {
    return <label>
        <span>{props.label}</span>
        <select value={props.value || ''} onChange={event => props.onChange(event.currentTarget.value)}>
            <option value=''>All</option>
            {props.values.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
    </label>;
}

function eventOptionValues(events: FlowEvent[], getter: (event: FlowEvent) => string | string[] | undefined): string[] {
    const values = new Set<string>();
    for (const event of events) {
        const value = getter(event);
        const entries = Array.isArray(value) ? value : [value];
        for (const entry of entries) {
            if (entry) {
                values.add(entry);
            }
        }
    }
    return [...values].sort((left, right) => left.localeCompare(right));
}

function eventPayloadValues(event: FlowEvent, keys: string[]): string[] {
    const payload = event.payload || {};
    const values = new Set<string>();
    for (const key of keys) {
        collectEventPayloadValue(values, payload[key]);
    }
    return [...values];
}

function collectEventPayloadValue(values: Set<string>, value: unknown): void {
    if (typeof value === 'string' && value.trim()) {
        values.add(value);
        return;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        values.add(String(value));
        return;
    }
    if (Array.isArray(value)) {
        for (const item of value) {
            collectEventPayloadValue(values, item);
        }
        return;
    }
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        for (const key of ['id', 'artifactId', 'effectId', 'path', 'artifactPath', 'type', 'severity']) {
            collectEventPayloadValue(values, record[key]);
        }
    }
}

const MEMORY_SCOPES: FlowMemoryScope[] = ['workspace', 'project', 'workflow', 'run', 'agent', 'ide'];

function MemoryCandidateReview(props: {
    candidates: MemoryCandidate[];
    busy: boolean;
    onDecide: (
        candidateId: string,
        decision: 'approved' | 'rejected',
        content: string,
        scope?: FlowMemoryScope,
        target?: string
    ) => Promise<void>;
}): React.ReactElement {
    const [drafts, setDrafts] = React.useState<Record<string, { content: string; scope?: FlowMemoryScope; target: string; reviewing: boolean }>>({});
    const draftFor = (candidate: MemoryCandidate): { content: string; scope?: FlowMemoryScope; target: string; reviewing: boolean } =>
        drafts[candidate.id] || { content: candidate.content, scope: candidate.scope, target: '', reviewing: false };
    const updateDraft = (candidate: MemoryCandidate, patch: Partial<{ content: string; scope?: FlowMemoryScope; target: string; reviewing: boolean }>): void => {
        setDrafts(current => ({
            ...current,
            [candidate.id]: { ...draftFor(candidate), ...patch }
        }));
    };

    return <section className='flow__memory-review'>
        <h4>Memory candidates</h4>
        {props.candidates.length === 0 && <p>No memory candidates.</p>}
        {props.candidates.map(candidate => {
            const draft = draftFor(candidate);
            const terminal = candidate.status === 'written' || candidate.status === 'rejected';
            const content = draft.content.trim();
            return <article className={`flow__memory-candidate flow__memory-candidate--${candidate.status}`} key={candidate.id}>
                <header>
                    <strong>{candidate.kind} / {candidate.status}</strong>
                    <span>{candidate.source}{candidate.stateId ? ` / ${candidate.stateId}` : ''} / confidence {candidate.confidence}</span>
                </header>
                <textarea
                    rows={draft.reviewing ? 5 : 3}
                    value={draft.content}
                    disabled={props.busy || terminal || !draft.reviewing}
                    onChange={event => updateDraft(candidate, { content: event.currentTarget.value })}
                    aria-label={`Memory candidate ${candidate.id} content`}
                />
                <p>{candidate.reason}</p>
                <div className='flow__memory-controls'>
                    <label>
                        <span>Scope</span>
                        <select
                            value={draft.scope || ''}
                            disabled={props.busy || terminal}
                            onChange={event => updateDraft(candidate, { scope: (event.currentTarget.value || undefined) as FlowMemoryScope | undefined })}
                        >
                            <option value=''>Default</option>
                            {MEMORY_SCOPES.map(scope => <option key={scope} value={scope}>{scope}</option>)}
                        </select>
                    </label>
                    <label>
                        <span>Target</span>
                        <input
                            value={draft.target}
                            disabled={props.busy || terminal}
                            onChange={event => updateDraft(candidate, { target: event.currentTarget.value })}
                            placeholder='Memory target'
                        />
                    </label>
                </div>
                <div className='flow__memory-actions'>
                    <button type='button' disabled={props.busy || terminal} onClick={() => updateDraft(candidate, { reviewing: !draft.reviewing })}>
                        {draft.reviewing ? 'Preview' : 'Review'}
                    </button>
                    <button type='button' disabled={props.busy || terminal} onClick={() => props.onDecide(candidate.id, 'rejected', content || candidate.content, draft.scope, draft.target || undefined)}>
                        Reject
                    </button>
                    <button type='button' disabled={props.busy || terminal || !content} onClick={() => props.onDecide(candidate.id, 'approved', content, draft.scope, draft.target || undefined)}>
                        Write
                    </button>
                </div>
            </article>;
        })}
    </section>;
}

function RunList(props: { title: string; empty: string; items: Array<{ id: string; title: string; meta?: string; onOpen?: () => Promise<void> | void }> }): React.ReactElement {
    return <section className='flow__run-list'>
        <h4>{props.title}</h4>
        {props.items.length === 0 && <p>{props.empty}</p>}
        {props.items.map(item => <article key={item.id}>
            {item.onOpen
                ? <button type='button' className='flow__link-button' title={`Open ${item.title}`} onClick={item.onOpen}>
                    <i className='codicon codicon-go-to-file' />
                    <strong>{redactFlowSecretsText(item.title)}</strong>
                </button>
                : <strong>{redactFlowSecretsText(item.title)}</strong>}
            {item.meta && <span>{redactFlowSecretsText(item.meta)}</span>}
        </article>)}
    </section>;
}

function ArtifactBrowser(props: {
    run: FlowRun;
    selectedArtifact?: FlowArtifact;
    onSelectArtifact: (artifactId: string) => void;
    onOpenArtifact: (artifactUri: string) => Promise<void>;
}): React.ReactElement {
    return <section className='flow__artifact-browser'>
        <h4>Artifacts</h4>
        {props.run.artifacts.length === 0 && <p>No artifacts yet.</p>}
        {props.run.artifacts.length > 0 && <div className='flow__artifact-selector'>
            {props.run.artifacts.map(artifact => <button
                key={artifact.id}
                type='button'
                className={artifact.id === props.selectedArtifact?.id ? 'flow__artifact-selector-item flow__artifact-selector-item--selected' : 'flow__artifact-selector-item'}
                title={`Preview ${artifact.uri}`}
                onClick={() => props.onSelectArtifact(artifact.id)}
            >
                <i className={`codicon ${artifactIcon(artifact)}`} />
                <span>{artifactLabel(artifact.uri)}</span>
                <small>{artifactViewerLabel(artifact)}</small>
            </button>)}
        </div>}
        {props.selectedArtifact && <ArtifactViewer
            run={props.run}
            artifact={props.selectedArtifact}
            onOpenArtifact={props.onOpenArtifact}
        />}
    </section>;
}

function ArtifactViewer(props: {
    run: FlowRun;
    artifact: FlowArtifact;
    onOpenArtifact: (artifactUri: string) => Promise<void>;
}): React.ReactElement {
    const workload = props.run.workloads.find(candidate => candidate.stateId === props.artifact.stateId);
    const envelope = workload?.outputEnvelope;
    const outputPath = artifactOutputPath(props.artifact.uri);
    const effect = props.run.effects.find(candidate => candidate.artifactPath === outputPath || candidate.path === outputPath || candidate.id === props.artifact.id);
    const viewer = artifactViewerKind(props.artifact);
    return <article className='flow__artifact-viewer'>
        <header>
            <div>
                <strong>{artifactLabel(props.artifact.uri)}</strong>
                <span>{props.artifact.uri}</span>
            </div>
            <button type='button' title={`Open ${props.artifact.uri}`} onClick={() => props.onOpenArtifact(props.artifact.uri)}>
                <i className='codicon codicon-go-to-file' />
            </button>
        </header>
        {viewer === 'markdown' && <MarkdownReportViewer report={envelope?.report || props.artifact.summary || ''} />}
        {viewer === 'json-result' && <JsonResultViewer value={envelope || effect || props.artifact} />}
        {viewer === 'jsonl-issues' && <JsonlIssuesViewer issues={envelope?.issues || []} />}
        {viewer === 'patch' && <PatchViewer patch={effect?.patch || props.artifact.summary || ''} />}
        {viewer === 'log' && <LogViewer effect={effect} summary={props.artifact.summary} />}
        {viewer === 'image' && <ImageArtifactViewer artifact={props.artifact} effect={effect} />}
        {viewer === 'contract' && <ContractViewer envelope={envelope} artifact={props.artifact} />}
    </article>;
}

function JsonBlock(props: { title: string; value: unknown }): React.ReactElement {
    return <section className='flow__json-block'>
        <h4>{props.title}</h4>
        <pre>{JSON.stringify(redactFlowSecretsValue(props.value), undefined, 2)}</pre>
    </section>;
}

function EventSummary(props: { title: string; event?: FlowEvent }): React.ReactElement {
    return <section className='flow__event-summary'>
        <h4>{props.title}</h4>
        {props.event ? <>
            <KeyValue label='Time' value={new Date(props.event.timestamp).toLocaleTimeString()} />
            <KeyValue label='Message' value={props.event.message} />
        </> : <p>Not observed.</p>}
    </section>;
}

function Panel(props: { title: string; children: React.ReactNode }): React.ReactElement {
    return <section className='flow__panel'>
        <h3>{props.title}</h3>
        {props.children}
    </section>;
}

function KeyValue(props: { label: string; value: string }): React.ReactElement {
    return <div className='flow__kv'>
        <span>{props.label}</span>
        <strong>{redactFlowSecretsText(props.value)}</strong>
    </div>;
}

function ValidationIssues(props: { issues: FlowValidationIssue[] }): React.ReactElement {
    return <div className='flow__validation'>
        {props.issues.map(issue => <span key={`${issue.code}-${issue.path || issue.message}`}>{issue.message}</span>)}
    </div>;
}

function CanvasMinimap(props: {
    nodes: FlowCanvasNode[];
    width: number;
    height: number;
    viewport: { x: number; y: number; zoom: number };
    viewportSize: { width: number; height: number };
}): React.ReactElement {
    const scale = Math.min(142 / props.width, 86 / props.height);
    const visibleWorld = {
        x: clamp(-props.viewport.x / props.viewport.zoom, 0, props.width),
        y: clamp(-props.viewport.y / props.viewport.zoom, 0, props.height),
        width: clamp(props.viewportSize.width / props.viewport.zoom, 0, props.width),
        height: clamp(props.viewportSize.height / props.viewport.zoom, 0, props.height)
    };
    return <div className='flow__flow-minimap' aria-hidden='true'>
        {props.nodes.map(node => <span
            key={node.id}
            className={`flow__flow-minimap-node flow__flow-minimap-node--${node.status}`}
            style={{
                left: node.x * scale,
                top: node.y * scale,
                width: Math.max(6, node.width * scale),
                height: Math.max(4, node.height * scale)
            }}
        />)}
        <span
            className='flow__flow-minimap-viewport'
            style={{
                left: visibleWorld.x * scale,
                top: visibleWorld.y * scale,
                width: Math.max(8, visibleWorld.width * scale),
                height: Math.max(6, visibleWorld.height * scale)
            }}
        />
    </div>;
}

function edgeMidpoint(edge: FlowCanvasEdge, axis: 'x' | 'y'): number {
    if (edge.points.length < 2) {
        return 0;
    }
    return (edge.points[0][axis] + edge.points[1][axis]) / 2;
}

const AGENCY_CANVAS_STATE_TYPES: FlowStateType[] = [
    'input',
    'context',
    'agent',
    'parallel',
    'join',
    'condition',
    'gate',
    'command',
    'memory_write',
    'report'
];

const AGENCY_CANVAS_BRANCH_TYPES: FlowStateType[] = [
    'agent',
    'condition',
    'command',
    'memory_write',
    'report'
];

const WORKFLOW_HISTORY_LIMIT = 50;

function pushWorkflowHistory(stack: FlowWorkflowHistoryEntry[], entry: FlowWorkflowHistoryEntry): FlowWorkflowHistoryEntry[] {
    return [...stack, entry].slice(-WORKFLOW_HISTORY_LIMIT);
}

function MarkdownReportViewer(props: { report: string }): React.ReactElement {
    const blocks = parseMarkdownBlocks(redactFlowSecretsText(props.report) || 'No report content available in the workload envelope.');
    return <div className='flow__artifact-markdown'>
        {blocks.map((block, index) => {
            if (block.kind === 'heading') {
                return <h5 key={index}>{block.text}</h5>;
            }
            if (block.kind === 'list') {
                return <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>;
            }
            if (block.kind === 'code') {
                return <pre key={index}>{block.text}</pre>;
            }
            return <p key={index}>{block.text}</p>;
        })}
    </div>;
}

function JsonResultViewer(props: { value: unknown }): React.ReactElement {
    return <div className='flow__artifact-json'>
        <pre>{JSON.stringify(redactFlowSecretsValue(props.value), undefined, 2)}</pre>
    </div>;
}

function JsonlIssuesViewer(props: { issues: Array<{ severity: string; type: string; summary: string; producer?: string; impact?: string }> }): React.ReactElement {
    const issues = redactFlowSecretsValue(props.issues);
    return <div className='flow__artifact-issues'>
        {issues.length === 0 && <p>No issues recorded.</p>}
        {issues.map((issue, index) => <article key={`${issue.type}-${index}`}>
            <strong>{issue.severity} / {issue.type}</strong>
            <span>{issue.summary}</span>
            {(issue.producer || issue.impact) && <small>{[issue.producer, issue.impact].filter(Boolean).join(' / ')}</small>}
        </article>)}
    </div>;
}

function PatchViewer(props: { patch: string }): React.ReactElement {
    const lines = (redactFlowSecretsText(props.patch) || 'No patch content available in the run data.').split(/\r?\n/);
    return <pre className='flow__artifact-patch'>
        {lines.map((line, index) => <span key={index} className={patchLineClass(line)}>{line || ' '}</span>)}
    </pre>;
}

function LogViewer(props: { effect?: FlowEffect; summary?: string }): React.ReactElement {
    const effect = redactFlowSecretsValue(props.effect);
    const stdout = effect?.stdout || '';
    const stderr = effect?.stderr || '';
    const text = [
        redactFlowSecretsText(props.summary),
        effect?.command ? `$ ${effect.command}` : undefined,
        stdout ? `stdout:\n${stdout}` : undefined,
        stderr ? `stderr:\n${stderr}` : undefined
    ].filter(Boolean).join('\n\n') || 'No log output available in the run data.';
    return <pre className='flow__artifact-log'>{redactFlowSecretsText(text)}</pre>;
}

function ImageArtifactViewer(props: { artifact: FlowArtifact; effect?: FlowEffect }): React.ReactElement {
    const canEmbed = /^(https?:|file:)/i.test(props.artifact.uri);
    const error = props.effect?.status === 'blocked' || props.effect?.status === 'failed'
        ? effectBlockReason(props.effect)
        : undefined;
    return <div className='flow__artifact-image'>
        {canEmbed ? <img src={props.artifact.uri} alt={artifactLabel(props.artifact.uri)} /> : <p>Image preview requires opening the materialized artifact.</p>}
        {error && <p className='flow__artifact-image-error'>Image effect error: {error}</p>}
        {props.effect && <div className='flow__artifact-image-meta'>
            <KeyValue label='Provider' value={props.effect.provider || 'missing'} />
            <KeyValue label='MIME' value={props.effect.mimeType || 'unknown'} />
            <KeyValue label='Bytes' value={typeof props.effect.bytes === 'number' ? props.effect.bytes.toString() : 'unknown'} />
        </div>}
        {props.artifact.summary && <span>{redactFlowSecretsText(props.artifact.summary)}</span>}
    </div>;
}

function ContractViewer(props: { envelope?: FlowWorkload['outputEnvelope']; artifact: FlowArtifact }): React.ReactElement {
    const contracts = props.envelope?.artifacts.filter(artifact => /contract|work-order/i.test(artifact.path)) || [];
    return <div className='flow__artifact-contract'>
        <KeyValue label='Artifact' value={props.artifact.uri} />
        <KeyValue label='Kind' value={props.artifact.kind} />
        {props.envelope?.result?.summary && <KeyValue label='Summary' value={props.envelope.result.summary} />}
        {contracts.length > 0 && <ul>
            {contracts.map(contract => <li key={contract.id}>{contract.path}{contract.type ? ` / ${contract.type}` : ''}</li>)}
        </ul>}
        {contracts.length === 0 && <p>No contract package metadata available in the workload envelope.</p>}
    </div>;
}

function validationIssueTarget(workflow: FlowWorkflow, issue: FlowValidationIssue): { kind: 'state' | 'transition'; id: string } | undefined {
    const branchMatch = issue.path?.match(/^states\.[^.]+\.branches\.([^.]+)/);
    if (branchMatch) {
        return { kind: 'state', id: branchMatch[1] };
    }
    const stateMatch = issue.path?.match(/^states\.([^.]+)/);
    if (stateMatch) {
        return { kind: 'state', id: stateMatch[1] };
    }
    const transitionMatch = issue.path?.match(/^transitions\.(\d+)/);
    if (transitionMatch) {
        const transition = workflow.transitions[Number(transitionMatch[1])];
        if (transition) {
            return { kind: 'transition', id: transitionKey(transition) };
        }
    }
    return undefined;
}

function validationIssueSeverity(issues: FlowValidationIssue[]): 'error' | 'warning' | undefined {
    if (issues.some(issue => issue.code.includes('invalid') || issue.code.includes('required'))) {
        return 'error';
    }
    return issues.length > 0 ? 'warning' : undefined;
}

function groupWorkflowStructuralDiff(items: FlowWorkflowStructuralDiffItem[]): Array<{ kind: FlowWorkflowStructuralDiffItem['kind']; items: FlowWorkflowStructuralDiffItem[] }> {
    const order: Array<FlowWorkflowStructuralDiffItem['kind']> = ['metadata', 'template', 'agent', 'capability', 'guard', 'state', 'transition'];
    return order
        .map(kind => ({ kind, items: items.filter(item => item.kind === kind) }))
        .filter(group => group.items.length > 0);
}

function workflowSourcePathForSelection(workflow: FlowWorkflow, selectedKind: 'state' | 'transition', selectedId: string): string | undefined {
    if (selectedKind === 'state') {
        const directState = workflow.states[selectedId];
        if (directState) {
            return `states.${selectedId}`;
        }
        for (const [stateId, state] of Object.entries(workflow.states)) {
            if (state.branches?.[selectedId]) {
                return `states.${stateId}.branches.${selectedId}`;
            }
        }
    }
    const transitionIndex = workflow.transitions.findIndex(transition => transitionKey(transition) === selectedId);
    return transitionIndex >= 0 ? `transitions.${transitionIndex}` : undefined;
}

function transitionKey(transition: FlowWorkflowTransition): string {
    return transition.id || `${transition.from}-${transition.to}`;
}

function stateTypeLabel(stateType: FlowStateType): string {
    return stateType.replace(/_/g, ' ');
}

function stateTypeIcon(stateType: FlowStateType): string {
    switch (stateType) {
        case 'input':
            return 'codicon-inbox';
        case 'context':
            return 'codicon-library';
        case 'agent':
            return 'codicon-hubot';
        case 'parallel':
            return 'codicon-git-branch';
        case 'join':
            return 'codicon-git-merge';
        case 'condition':
            return 'codicon-symbol-boolean';
        case 'gate':
            return 'codicon-pass';
        case 'command':
            return 'codicon-terminal';
        case 'memory_write':
            return 'codicon-database';
        case 'report':
            return 'codicon-file-text';
        default:
            return 'codicon-circle-large-outline';
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function textToList(value: string): string[] | undefined {
    const items = value.split(/\r?\n|,/).map(item => item.trim()).filter(Boolean);
    return items.length ? items : undefined;
}

function listToText(value?: string[]): string {
    return (value || []).join('\n');
}

function emptyToUndefined(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed || undefined;
}

function numberOrUndefined(value: string): number | undefined {
    if (value.trim() === '') {
        return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function retryOrUndefined(max?: number, counter?: string): FlowWorkflow['states'][string]['retry'] {
    if (max === undefined && !counter) {
        return undefined;
    }
    return { max: max ?? 0, counter };
}

function compactTransition(transition: FlowWorkflowTransition): FlowWorkflowTransition {
    return compactObject(transition as unknown as Record<string, unknown>) as unknown as FlowWorkflowTransition;
}

function formatGuard(guard: FlowWorkflowTransition['guard']): string {
    return guard ? JSON.stringify(guard, undefined, 2) : '';
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
    const compacted: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
        if (entry === undefined || entry === '') {
            continue;
        }
        if (Array.isArray(entry) && entry.length === 0) {
            continue;
        }
        if (isPlainObject(entry)) {
            const nested = compactObject(entry as Record<string, unknown>);
            if (Object.keys(nested).length === 0) {
                continue;
            }
            compacted[key] = nested;
            continue;
        }
        compacted[key] = entry;
    }
    return compacted as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isTerminalRunStatus(status: FlowRun['status']): boolean {
    return status === 'completed' || status === 'failed' || status === 'cancelled';
}

function isReadOnlyRun(run: FlowRun | undefined): boolean {
    return run?.audit?.readOnly === true;
}

function relevantStateEvents(events: FlowEvent[], stateId: string, workloadIds: string[], gateIds: string[]): FlowEvent[] {
    return events
        .filter(event => event.stateId === stateId || Boolean(event.workloadId && workloadIds.includes(event.workloadId)) || Boolean(event.gateId && gateIds.includes(event.gateId)))
        .slice()
        .reverse();
}

function lastTransitionEvent(events: FlowEvent[], transition: FlowWorkflowTransition, type: FlowEvent['type']): FlowEvent | undefined {
    return events.slice().reverse().find(event => event.type === type && matchesTransitionEvent(event, transition));
}

function matchesTransitionEvent(event: FlowEvent, transition: FlowWorkflowTransition): boolean {
    const transitionId = transition.id || `${transition.from}-${transition.to}`;
    if (event.transitionId === transitionId || event.transitionId === transition.id) {
        return true;
    }
    const payload = event.payload || {};
    return payload.from === transition.from && payload.to === transition.to || payload.transitionId === transitionId;
}

function artifactLabel(artifactUri: string): string {
    const path = artifactUri.replace(/^flow:\/\/[^/]+\//, '').replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
    return path.split(/[\\/]/).filter(Boolean).pop() || artifactUri;
}

function effectBlockReason(effect: FlowEffect): string | undefined {
    if (effect.status !== 'blocked' && effect.status !== 'failed') {
        return undefined;
    }
    const candidates = [
        effect.stderr,
        effect.stdout,
        effect.summary,
        effect.approvalPolicy ? `Approval policy: ${effect.approvalPolicy}` : undefined
    ];
    return candidates.find(value => Boolean(value && value.trim()))?.trim();
}

function isFileEffectForReview(effect: FlowEffect): boolean {
    return effect.kind === 'file' || effect.kind === 'file_write' || Boolean(effect.type && effect.type.startsWith('file.'));
}

function isImageEffectForReview(effect: FlowEffect): boolean {
    return effect.kind === 'image' || effect.type === 'image.generate' || effect.type === 'image.generated' || effect.type === 'image';
}

type ArtifactViewerKind = 'markdown' | 'json-result' | 'jsonl-issues' | 'patch' | 'log' | 'image' | 'contract';
type MarkdownBlock = { kind: 'heading' | 'paragraph' | 'code'; text: string } | { kind: 'list'; items: string[] };

function artifactViewerKind(artifact: FlowArtifact): ArtifactViewerKind {
    const path = artifactOutputPath(artifact.uri).toLowerCase();
    if (artifact.kind === 'contract' || artifact.kind === 'work_order' || path.includes('contract') || path.includes('work-order')) {
        return 'contract';
    }
    if (artifact.kind === 'patch' || /\.(patch|diff)$/i.test(path)) {
        return 'patch';
    }
    if (artifact.kind === 'log' || /\.(log|out|err)$/i.test(path)) {
        return 'log';
    }
    if (/\.jsonl$/i.test(path) || path.endsWith('issues.jsonl')) {
        return 'jsonl-issues';
    }
    if (/\.json$/i.test(path)) {
        return 'json-result';
    }
    if (/\.(png|jpe?g|gif|webp|svg)$/i.test(path)) {
        return 'image';
    }
    return 'markdown';
}

function artifactViewerLabel(artifact: FlowArtifact): string {
    switch (artifactViewerKind(artifact)) {
        case 'markdown':
            return 'Markdown report';
        case 'json-result':
            return 'JSON result';
        case 'jsonl-issues':
            return 'JSONL issues';
        case 'patch':
            return 'Diff/patch';
        case 'log':
            return 'Logs';
        case 'image':
            return 'Image';
        case 'contract':
            return 'Contract';
    }
}

function artifactIcon(artifact: FlowArtifact): string {
    switch (artifactViewerKind(artifact)) {
        case 'image':
            return 'codicon-file-media';
        case 'patch':
            return 'codicon-diff';
        case 'log':
            return 'codicon-terminal';
        case 'json-result':
        case 'jsonl-issues':
            return 'codicon-json';
        case 'contract':
            return 'codicon-law';
        case 'markdown':
            return 'codicon-markdown';
    }
}

function artifactOutputPath(artifactUri: string): string {
    return artifactUri.replace(/^flow:\/\/[^/]+\//, '').replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
}

function patchLineClass(line: string): string {
    if (line.startsWith('+') && !line.startsWith('+++')) {
        return 'flow__artifact-patch-added';
    }
    if (line.startsWith('-') && !line.startsWith('---')) {
        return 'flow__artifact-patch-removed';
    }
    if (line.startsWith('@@')) {
        return 'flow__artifact-patch-hunk';
    }
    return '';
}

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
    const blocks: MarkdownBlock[] = [];
    let list: string[] = [];
    let code: string[] | undefined;
    const flushList = () => {
        if (list.length > 0) {
            blocks.push({ kind: 'list', items: list });
            list = [];
        }
    };
    for (const line of markdown.split(/\r?\n/)) {
        if (line.trim().startsWith('```')) {
            if (code) {
                blocks.push({ kind: 'code', text: code.join('\n') });
                code = undefined;
            } else {
                flushList();
                code = [];
            }
            continue;
        }
        if (code) {
            code.push(line);
            continue;
        }
        const heading = line.match(/^#{1,5}\s+(.+)$/);
        if (heading) {
            flushList();
            blocks.push({ kind: 'heading', text: heading[1] });
            continue;
        }
        const item = line.match(/^\s*[-*]\s+(.+)$/);
        if (item) {
            list.push(item[1]);
            continue;
        }
        flushList();
        if (line.trim()) {
            blocks.push({ kind: 'paragraph', text: line.trim() });
        }
    }
    flushList();
    if (code) {
        blocks.push({ kind: 'code', text: code.join('\n') });
    }
    return blocks;
}

function pathTitle(relativePath: string): string {
    const fileName = relativePath.split(/[\\/]/).pop() || relativePath;
    return fileName.replace(/\.(markdown|md)$/i, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, match => match.toUpperCase());
}

function copyPath(relativePath: string): string {
    const extensionMatch = relativePath.match(/(\.markdown|\.md)$/i);
    const extension = extensionMatch?.[1] || '.md';
    return `${relativePath.slice(0, relativePath.length - extension.length)}-copy${extension}`;
}

function formatTimestamp(value: string): string {
    try {
        return new Date(value).toLocaleString();
    } catch {
        return value;
    }
}

function renderWorkflowVersions(versions: FlowWorkflowVersion[]): string {
    if (versions.length === 0) {
        return 'No workflow versions recorded yet.';
    }
    return versions.map(version => {
        const diff = version.diff.length
            ? version.diff.map(item => `  - ${item.kind}/${item.change} ${item.id}: ${item.summary}`).join('\n')
            : '  - No structural changes';
        return [
            `${version.id}`,
            `  Created: ${formatTimestamp(version.createdAt)}`,
            `  Author: ${version.author}`,
            `  Origin: ${version.origin}`,
            version.message ? `  Message: ${version.message}` : undefined,
            diff
        ].filter(Boolean).join('\n');
    }).join('\n\n');
}

function resolveExecutionMode(
    runMode: FlowRunExecutionMode | undefined,
    hintMode: FlowRunExecutionMode | undefined,
    kernelBridge: FlowSnapshot['capabilities']['kernelBridge'] | undefined
): FlowRunExecutionMode {
    return runMode || hintMode || (kernelBridge === 'external' ? 'kernel_external' : 'kernel_simulated');
}

function executionModeLabel(mode: FlowRunExecutionMode | undefined): string {
    switch (mode) {
        case 'kernel_external':
            return 'Kernel externo';
        case 'kernel_simulated':
            return 'Kernel simulado';
        case 'kernel_simulated_fallback_error':
            return 'Fallback por erro';
        case 'capability_missing':
            return 'Capability ausente';
        default:
            return 'Desconhecido';
    }
}

function executionModeClassName(mode: FlowRunExecutionMode): string {
    switch (mode) {
        case 'kernel_external':
            return 'external';
        case 'kernel_simulated':
            return 'simulated';
        case 'kernel_simulated_fallback_error':
            return 'fallback-error';
        case 'capability_missing':
            return 'capability-missing';
        default:
            return 'unknown';
    }
}

function CapabilityStatus(props: {
    capabilities: FlowCapabilities;
    workflow?: FlowWorkflow;
    executionMode: FlowRunExecutionMode;
    executionModeMessage?: string;
}): React.ReactElement {
    const { capabilities, workflow, executionMode, executionModeMessage } = props;
    const capabilityRows = capabilityStatusRows(capabilities);
    const missingRequiredCapabilities = workflow
        ? resolveFlowWorkflowCapabilities(workflow, capabilities).missing
        : [];
    const modeRows = [
        {
            label: 'Kernel',
            value: executionModeLabel(executionMode),
            tone: executionModeClassName(executionMode),
            detail: executionModeMessage
        },
        {
            label: 'Host mode',
            value: demoModeLabel(capabilities.demoMode),
            tone: capabilities.demoMode === 'off' ? 'available' : 'mock',
            detail: capabilities.deterministicFallback && capabilities.deterministicFallbackReason ? capabilities.deterministicFallbackReason : undefined
        },
        {
            label: 'LLM provider',
            value: providerAvailabilityLabel(capabilities.llmAgentProvider),
            tone: providerAvailabilityTone(capabilities.llmAgentProvider)
        },
        {
            label: 'Run updates',
            value: capabilities.runEventStream ? 'Event stream' : 'Manual fallback',
            tone: capabilities.runEventStream ? 'available' : 'mock',
            detail: capabilities.runEventStream
                ? 'Canvas, kanban and event log follow kernel event pushes.'
                : 'Manual refresh/tick is the explicit fallback when no kernel event stream is available.'
        }
    ];

    return <section className='flow__runtime-status' aria-label='Flow runtime status'>
        <div className='flow__runtime-status-grid'>
            {modeRows.map(row => <StatusPill key={row.label} {...row} />)}
        </div>
        <div className='flow__runtime-status-grid flow__runtime-status-grid--capabilities'>
            {capabilityRows.map(row => <StatusPill key={row.label} {...row} />)}
        </div>
        {missingRequiredCapabilities.length > 0 && <div className='flow__runtime-status-warning'>
            <strong>Capabilities exigidas ausentes:</strong> {missingRequiredCapabilities.join('; ')}
        </div>}
    </section>;
}

function StatusPill(props: { label: string; value: string; tone: string; detail?: string }): React.ReactElement {
    return <div className={`flow__status-pill flow__status-pill--${props.tone}`} title={props.detail || `${props.label}: ${props.value}`}>
        <span>{props.label}</span>
        <strong>{props.value}</strong>
    </div>;
}

function capabilityStatusRows(capabilities: FlowCapabilities): Array<{ label: string; value: string; tone: string }> {
    return [
        {
            label: 'llm.agent.execute',
            value: capabilityAvailabilityLabel(capabilities.llmAgentExecution),
            tone: capabilityAvailabilityTone(capabilities.llmAgentExecution)
        },
        {
            label: 'filesystem.edit',
            value: `${capabilityAvailabilityLabel(capabilities.filesystemEdit)} / policy ${policyAvailabilityLabel(capabilities.filesystemEditPolicy)}`,
            tone: capabilityAndPolicyTone(capabilities.filesystemEdit, capabilities.filesystemEditPolicy)
        },
        {
            label: 'image.generate',
            value: `${capabilityAvailabilityLabel(capabilities.imageGeneration)} / provider ${providerAvailabilityLabel(capabilities.imageProvider)}`,
            tone: capabilityAndProviderTone(capabilities.imageGeneration, capabilities.imageProvider)
        },
        {
            label: 'command.execute',
            value: `${capabilities.commandExecution ? 'available' : 'blocked'} / policy ${policyAvailabilityLabel(capabilities.commandExecutionPolicy)}`,
            tone: capabilities.commandExecution && capabilities.commandExecutionPolicy === 'configured' ? 'available' : 'blocked'
        },
        {
            label: 'Memory',
            value: capabilities.memoryProvider,
            tone: capabilities.memoryProvider === 'missing' ? 'missing' : 'available'
        },
        {
            label: 'run.event_stream',
            value: capabilities.runEventStream ? 'available' : 'fallback manual',
            tone: capabilities.runEventStream ? 'available' : 'mock'
        }
    ];
}

function demoModeLabel(mode: FlowCapabilities['demoMode']): string {
    switch (mode) {
        case 'demo':
            return 'Demo explicito';
        case 'e2e':
            return 'E2E mock explicito';
        default:
            return 'Normal';
    }
}

function capabilityAvailabilityLabel(value: FlowCapabilities['llmAgentExecution']): string {
    return value;
}

function providerAvailabilityLabel(value: FlowCapabilities['llmAgentProvider']): string {
    return value;
}

function policyAvailabilityLabel(value: FlowCapabilities['filesystemEditPolicy']): string {
    return value;
}

function capabilityAvailabilityTone(value: FlowCapabilities['llmAgentExecution']): string {
    if (value === 'available') {
        return 'available';
    }
    if (value === 'mock') {
        return 'mock';
    }
    return value === 'blocked' ? 'blocked' : 'missing';
}

function providerAvailabilityTone(value: FlowCapabilities['llmAgentProvider']): string {
    if (value === 'configured') {
        return 'available';
    }
    return value === 'mock' ? 'mock' : 'missing';
}

function capabilityAndProviderTone(
    capability: FlowCapabilities['imageGeneration'],
    provider: FlowCapabilities['imageProvider']
): string {
    if (capability === 'available' && provider === 'configured') {
        return 'available';
    }
    if (capability === 'mock' || provider === 'mock') {
        return 'mock';
    }
    return capability === 'blocked' ? 'blocked' : 'missing';
}

function capabilityAndPolicyTone(
    capability: FlowCapabilities['filesystemEdit'],
    policy: FlowCapabilities['filesystemEditPolicy']
): string {
    if (capability === 'available' && policy === 'configured') {
        return 'available';
    }
    if (capability === 'mock') {
        return 'mock';
    }
    if (capability === 'blocked' || policy === 'blocked') {
        return 'blocked';
    }
    return 'missing';
}

function classifyExecutionModeFromError(error: unknown): { executionModeHint?: FlowRunExecutionMode; executionModeHintMessage?: string } | undefined {
    const message = error instanceof Error ? error.message : String(error);
    if (!message) {
        return undefined;
    }
    if (message.includes('Missing Flow host capability')) {
        return {
            executionModeHint: 'capability_missing',
            executionModeHintMessage: 'Capability ausente para o workflow.'
        };
    }
    return undefined;
}
