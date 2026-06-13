import { OpenerService, ReactWidget, open } from '@theia/core/lib/browser';
import { FrontendLanguageModelRegistry, LanguageModel } from '@theia/ai-core';
import { nls } from '@theia/core/lib/common';
import URI from '@theia/core/lib/common/uri';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { artifactUriToOpenUri } from './flow-artifacts';
import {
    FlowCanvasEdge,
    FlowCanvasNode,
    FlowAiAuthoringDraft,
    FlowAgentMarkdownSummary,
    FlowArtifact,
    FlowEffect,
    FlowEvent,
    FlowHumanGate,
    FlowMemoryScope,
    FlowModelExecutionProfile,
    FlowModelProfile,
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
    FlowDeliverable,
    FlowPipelinePreset,
    FlowProviderSelection,
    FlowPatternParameter,
    FlowPatternRoleOverride,
    FlowWorkflowPattern,
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
    workflowPatterns: FlowWorkflowPattern[];
    modelProfiles: FlowModelProfile[];
    languageModels: FlowLanguageModelOption[];
    pipelinePresets: FlowPipelinePreset[];
    agents: FlowAgentMarkdownSummary[];
    agentSearch: string;
    selectedTemplateId?: string;
    selectedPatternId?: string;
    patternParameters: Record<string, string | number | boolean>;
    patternRoleOverrides: Record<string, FlowPatternRoleOverride>;
    selectedPipelinePresetId?: string;
    selectedKind: 'state' | 'transition';
    selectedId?: string;
    workflowUndoStack: FlowWorkflowHistoryEntry[];
    workflowRedoStack: FlowWorkflowHistoryEntry[];
    workflowSourceText?: string;
    workflowSourceError?: string;
    workflowSourceVisible: boolean;
    workflowSavePreview?: FlowWorkflowStructuralDiff;
    selectedArtifactId?: string;
    runHistory: FlowRun[];
    runHistoryVisible: boolean;
    openMenu?: FlowTopMenu;
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

type FlowTopMenu = 'workflow' | 'file' | 'agents' | 'history';

export interface FlowExternalRunOptions {
    prompt?: string;
    message?: string;
    input?: string;
    workflowId?: string;
    workspaceRootUri?: string;
    preferSaved?: boolean;
    parameters?: Record<string, unknown>;
    roleOverrides?: Record<string, FlowPatternRoleOverride>;
    authoringDraft?: FlowAiAuthoringDraft;
    draft?: FlowAiAuthoringDraft;
}

interface FlowLanguageModelOption {
    id: string;
    label: string;
    status: 'ready' | 'unavailable';
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

    @inject(FrontendLanguageModelRegistry)
    protected readonly languageModelRegistry: FrontendLanguageModelRegistry;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    protected state: FlowWidgetState = {
        templates: [],
        workflowPatterns: [],
        modelProfiles: [],
        languageModels: [],
        pipelinePresets: [],
        agents: [],
        agentSearch: '',
        patternParameters: {},
        patternRoleOverrides: {},
        selectedKind: 'state',
        workflowUndoStack: [],
        workflowRedoStack: [],
        workflowSourceVisible: false,
        runHistory: [],
        runHistoryVisible: false,
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
        this.toDispose.push(this.languageModelRegistry.onChange(event => {
            this.state = {
                ...this.state,
                languageModels: toFlowLanguageModelOptions(event.models)
            };
            this.update();
        }));
        document.addEventListener('pointerdown', this.handleTopMenuPointerDown);
        document.addEventListener('keydown', this.handleTopMenuKeyDown);
        this.refresh();
    }

    override dispose(): void {
        document.removeEventListener('pointerdown', this.handleTopMenuPointerDown);
        document.removeEventListener('keydown', this.handleTopMenuKeyDown);
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
            const [snapshot, templates, workflowPatterns, modelProfiles, pipelinePresets, agents, languageModels] = await Promise.all([
                this.flowService.getSnapshot({ workspaceRootUri }),
                this.flowService.listWorkflowTemplates(),
                this.flowService.listWorkflowPatterns(),
                this.flowService.listModelProfiles(),
                this.flowService.listPipelinePresets({ workspaceRootUri }),
                this.flowService.listAgentMarkdownFiles({ workspaceRootUri }),
                this.languageModelRegistry.getLanguageModels()
            ]);
            const selectedPatternId = this.state.selectedPatternId || workflowPatterns[0]?.id;
            const selectedPattern = workflowPatterns.find(pattern => pattern.id === selectedPatternId);
            this.state = {
                ...this.state,
                snapshot: normalizeFlowSnapshotEvents(snapshot),
                templates,
                workflowPatterns,
                modelProfiles,
                languageModels: toFlowLanguageModelOptions(languageModels),
                pipelinePresets,
                agents,
                selectedTemplateId: this.state.selectedTemplateId || templates[0]?.id,
                selectedPatternId,
                patternParameters: {
                    ...initialPatternParameterValues(selectedPattern),
                    ...this.state.patternParameters
                },
                patternRoleOverrides: this.state.patternRoleOverrides,
                selectedPipelinePresetId: this.state.selectedPipelinePresetId || pipelinePresets[0]?.id,
                selectedId: this.state.selectedId || (snapshot.activeWorkflow ? Object.keys(snapshot.activeWorkflow.states)[0] : undefined),
                workflowUndoStack: [],
                workflowRedoStack: [],
                workflowSourceText: undefined,
                workflowSourceError: undefined,
                workflowSourceVisible: false,
                workflowSavePreview: undefined,
                error: undefined
            };
        });
    };

    protected override render(): React.ReactNode {
        const snapshot = this.state.snapshot;
        const run = snapshot?.activeRun;
        const runWorkflow = run?.audit?.workflow;
        const activeWorkflow = snapshot?.activeWorkflow;
        const workflow = runWorkflow && (!activeWorkflow || run.workflowId === activeWorkflow.id) ? runWorkflow : activeWorkflow;
        const validation = runWorkflow && workflow?.id === runWorkflow.id ? validateFlowWorkflow(runWorkflow) : snapshot?.validation;
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
        const selectedPattern = this.state.workflowPatterns.find(pattern => pattern.id === this.state.selectedPatternId);
        const canUndoWorkflow = workflow?.file?.editable !== false && this.state.workflowUndoStack.length > 0;
        const canRedoWorkflow = workflow?.file?.editable !== false && this.state.workflowRedoStack.length > 0;

        const workflowStateCount = workflow ? Object.keys(workflow.states || {}).length : 0;
        const workflowTransitionCount = workflow?.transitions.length || 0;
        const validationSummary = validation
            ? validation.valid ? 'Validado' : `${validation.errors.length} erros / ${validation.warnings.length} avisos`
            : 'Sem validacao';

        return <div className='flow'>
            <header className='flow__header'>
                <div className='flow__title-block'>
                    <h2>{workflow?.name || 'Flow'}</h2>
                    <div className='flow__meta-line'>
                        <span>{workflow?.id || 'No workflow loaded'}</span>
                        <span>{workflowStateCount} blocos</span>
                        <span>{workflowTransitionCount} ligacoes</span>
                        <span>{validationSummary}</span>
                    </div>
                </div>
                <nav className='flow__top-menus' aria-label='Flow menus'>
                    <div className={`flow__menu ${this.state.openMenu === 'workflow' ? 'flow__menu--open' : ''}`}>
                        <button
                            type='button'
                            className='flow__menu-trigger'
                            aria-haspopup='menu'
                            aria-expanded={this.state.openMenu === 'workflow'}
                            onClick={() => this.toggleTopMenu('workflow')}
                        >
                            <i className='codicon codicon-type-hierarchy-sub' /> Workflow
                        </button>
                        {this.state.openMenu === 'workflow' && <div className='flow__menu-panel flow__menu-panel--workflow'>
                            <label className='flow__factory-field'>
                                <span>Workflow atual</span>
                                <select
                                    value={workflow?.id || ''}
                                    onChange={event => this.chooseWorkflow(event.currentTarget.value)}
                                    disabled={this.state.busy || !snapshot?.workflows.length}
                                    aria-label='Escolher workflow'
                                >
                                    {(snapshot?.workflows || []).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                            </label>
                            <div className='flow__menu-row'>
                                <label className='flow__factory-field'>
                                    <span>Template</span>
                                    <select
                                        value={this.state.selectedTemplateId || ''}
                                        onChange={event => this.setSelectedTemplate(event.currentTarget.value)}
                                        disabled={this.state.busy || this.state.templates.length === 0}
                                        title='Workflow template'
                                        aria-label='Workflow template'
                                    >
                                        {this.state.templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
                                    </select>
                                </label>
                                <button title='Create workflow from template' onClick={() => this.runMenuCommand(this.createWorkflowFromTemplate)} disabled={this.state.busy || !this.state.selectedTemplateId}>
                                    <i className='codicon codicon-add' /> Criar
                                </button>
                            </div>
                            <div className='flow__menu-row'>
                                <label className='flow__factory-field'>
                                    <span>Preset</span>
                                    <select
                                        value={this.state.selectedPipelinePresetId || ''}
                                        onChange={event => this.setSelectedPipelinePreset(event.currentTarget.value)}
                                        disabled={this.state.busy || this.state.pipelinePresets.length === 0}
                                        title='Pipeline preset'
                                        aria-label='Pipeline preset'
                                    >
                                        {this.state.pipelinePresets.map(preset => <option key={preset.id} value={preset.id}>{preset.name} ({preset.source || 'workspace'})</option>)}
                                    </select>
                                </label>
                                <button title='Create workflow from preset' onClick={() => this.runMenuCommand(this.createWorkflowFromPreset)} disabled={this.state.busy || !this.state.selectedPipelinePresetId}>
                                    <i className='codicon codicon-run' /> Usar
                                </button>
                            </div>
                            <button title='Save current workflow as pipeline preset' onClick={() => this.runMenuCommand(this.saveCurrentWorkflowAsPreset)} disabled={this.state.busy || !workflow}>
                                <i className='codicon codicon-save-as' /> Salvar como preset
                            </button>
                            <PatternFactory
                                patterns={this.state.workflowPatterns}
                                selectedPattern={selectedPattern}
                                selectedPatternId={this.state.selectedPatternId}
                                parameters={this.state.patternParameters}
                                roleOverrides={this.state.patternRoleOverrides}
                                modelProfiles={this.state.modelProfiles}
                                languageModels={this.state.languageModels}
                                busy={this.state.busy}
                                onSelect={this.setSelectedPattern}
                                onUpdateParameter={this.updatePatternParameter}
                                onUpdateRoleOverride={this.updatePatternRoleOverride}
                                onCreate={() => this.runMenuCommand(this.createWorkflowFromPattern)}
                                onRun={() => this.runMenuCommand(this.runWorkflowPattern)}
                            />
                        </div>}
                    </div>
                    <div className={`flow__menu flow__menu--file ${this.state.openMenu === 'file' ? 'flow__menu--open' : ''}`}>
                        <button
                            type='button'
                            className='flow__menu-trigger'
                            aria-haspopup='menu'
                            aria-expanded={this.state.openMenu === 'file'}
                            onClick={() => this.toggleTopMenu('file')}
                        >
                            <i className='codicon codicon-file-code' /> File
                        </button>
                        {this.state.openMenu === 'file' && <div className='flow__menu-panel flow__menu-panel--file'>
                            <div className='flow__menu-grid'>
                                <button title='Refresh snapshot' onClick={() => this.runMenuCommand(this.refresh)} disabled={this.state.busy}>
                                    <i className='codicon codicon-refresh' /> Atualizar
                                </button>
                                <button title='Reload workflow file' onClick={() => this.runMenuCommand(this.reloadWorkflowFile)} disabled={this.state.busy || !workflow || workflow.file?.editable === false}>
                                    <i className='codicon codicon-discard' /> Recarregar
                                </button>
                                <button title='Save workflow file' onClick={() => this.runMenuCommand(this.saveWorkflowFile)} disabled={this.state.busy || !workflow || workflow.file?.editable === false}>
                                    <i className='codicon codicon-save' /> Salvar
                                </button>
                                <button title='Import workflow export' onClick={() => this.runMenuCommand(this.importWorkflow)} disabled={this.state.busy}>
                                    <i className='codicon codicon-cloud-upload' /> Importar workflow
                                </button>
                                <button title='Export complete workflow package' onClick={() => this.runMenuCommand(this.exportWorkflow)} disabled={this.state.busy || !workflow}>
                                    <i className='codicon codicon-cloud-download' /> Exportar workflow
                                </button>
                                <button title='Show workflow version history' onClick={() => this.runMenuCommand(this.showWorkflowHistory)} disabled={this.state.busy || !workflow}>
                                    <i className='codicon codicon-history' /> Versoes
                                </button>
                                <button title='Restore workflow version' onClick={() => this.runMenuCommand(this.restoreWorkflowVersion)} disabled={this.state.busy || !workflow || workflow.file?.editable === false}>
                                    <i className='codicon codicon-versions' /> Restaurar versao
                                </button>
                                <button title='Import run export as read-only audit' onClick={() => this.runMenuCommand(this.importRun)} disabled={this.state.busy}>
                                    <i className='codicon codicon-archive' /> Importar run
                                </button>
                                <button title='Export complete run audit package' onClick={() => this.runMenuCommand(this.exportRun)} disabled={this.state.busy || !run}>
                                    <i className='codicon codicon-export' /> Exportar run
                                </button>
                                <button title='Ver fonte JSON/YAML interna do workflow' onClick={() => this.runMenuCommand(this.toggleWorkflowSourcePanel)} disabled={this.state.busy || !workflow}>
                                    <i className='codicon codicon-json' /> {this.state.workflowSourceVisible ? 'Ocultar fonte' : 'Ver fonte'}
                                </button>
                            </div>
                        </div>}
                    </div>
                    <div className={`flow__menu flow__menu--agents ${this.state.openMenu === 'agents' ? 'flow__menu--open' : ''}`}>
                        <button
                            type='button'
                            className='flow__menu-trigger'
                            aria-haspopup='menu'
                            aria-expanded={this.state.openMenu === 'agents'}
                            onClick={() => this.toggleTopMenu('agents')}
                        >
                            <i className='codicon codicon-hubot' /> Agents
                        </button>
                        {this.state.openMenu === 'agents' && <div className='flow__menu-panel flow__menu-panel--agents'>
                            <AgentLibrary
                                agents={this.state.agents}
                                search={this.state.agentSearch}
                                busy={this.state.busy}
                                onSearch={this.setAgentSearch}
                                onOpen={relativePath => this.runMenuCommand(() => this.openAgentMarkdown(relativePath))}
                                onCreate={() => this.runMenuCommand(this.createAgentMarkdown)}
                                onDuplicate={sourceRelativePath => this.runMenuCommand(() => this.duplicateAgentMarkdown(sourceRelativePath))}
                                onRename={sourceRelativePath => this.runMenuCommand(() => this.renameAgentMarkdown(sourceRelativePath))}
                            />
                        </div>}
                    </div>
                    <button
                        className={this.state.runHistoryVisible ? 'flow__history-button flow__history-button--open' : 'flow__history-button'}
                        title='Historico de runs'
                        onClick={this.toggleRunHistory}
                        disabled={this.state.busy}
                    >
                        <i className='codicon codicon-history' /> Historico
                    </button>
                </nav>
                <div className='flow__run-controls' aria-label='Run controls'>
                    <button title='Undo local workflow edit' onClick={this.undoWorkflowEdit} disabled={this.state.busy || !canUndoWorkflow}>
                        <i className='codicon codicon-arrow-left' />
                    </button>
                    <button title='Redo local workflow edit' onClick={this.redoWorkflowEdit} disabled={this.state.busy || !canRedoWorkflow}>
                        <i className='codicon codicon-redo' />
                    </button>
                    <button title='Start run' onClick={this.startRun} disabled={this.state.busy || !workflow || workflow.file?.editable === false}>
                        <i className='codicon codicon-debug-start' />
                    </button>
                    <button title='Run dynamic workflow from current prompt' onClick={this.runDynamicWorkflowFromPrompt} disabled={this.state.busy || !this.state.prompt.trim()}>
                        <i className='codicon codicon-symbol-event' />
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
                <label className='flow__prompt-field'>
                    <span>Prompt da run</span>
                    <textarea
                        rows={3}
                        value={this.state.prompt}
                        onChange={event => this.setPrompt(event.currentTarget.value)}
                        placeholder='Descreva objetivo, entradas, restricoes e entregaveis esperados.'
                        aria-label='Run prompt'
                    />
                </label>
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
            {this.state.workflowSourceVisible && workflow && <section className='flow__workflow-source-panel'>
                <WorkflowSourceEditor
                    workflow={workflow}
                    value={workflowSourceText}
                    validation={validation}
                    parseError={this.state.workflowSourceError}
                    selectedKind={this.state.selectedKind}
                    selectedId={this.state.selectedId}
                    onSelectIssue={this.selectValidationIssue}
                />
            </section>}

            {this.state.runHistoryVisible && <RunHistoryPanel
                runs={this.state.runHistory}
                activeRunId={run?.id}
                busy={this.state.busy}
                onOpen={this.openRunFromHistory}
                onClose={async () => this.closeTopMenus()}
            />}

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
                </section>
                <aside className='flow__inspector'>
                    <Inspector
                        workflow={workflow}
                        run={run}
                        selectedStateId={this.state.selectedKind === 'state' ? this.state.selectedId : undefined}
                        selectedState={selectedState}
                        selectedTransition={selectedTransition}
                        modelProfiles={this.state.modelProfiles}
                        languageModels={this.state.languageModels}
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

            {capabilities && <footer className='flow__statusbar'>
                <CapabilityStatus
                    capabilities={capabilities}
                    workflow={workflow}
                    executionMode={executionMode}
                    executionModeMessage={executionModeMessage}
                />
            </footer>}
        </div>;
    }

    protected setPrompt(prompt: string): void {
        this.state = { ...this.state, prompt };
        this.update();
    }

    protected readonly handleTopMenuPointerDown = (event: PointerEvent): void => {
        if (!this.state.openMenu && !this.state.runHistoryVisible) {
            return;
        }
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }
        if (target.closest('.flow__top-menus, .flow__run-history')) {
            return;
        }
        this.closeTopMenus();
    };

    protected readonly handleTopMenuKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape' && (this.state.openMenu || this.state.runHistoryVisible)) {
            this.closeTopMenus();
        }
    };

    protected readonly toggleTopMenu = (openMenu: FlowTopMenu): void => {
        const nextOpenMenu = this.state.openMenu === openMenu ? undefined : openMenu;
        this.state = {
            ...this.state,
            openMenu: nextOpenMenu,
            runHistoryVisible: false
        };
        this.update();
    };

    protected closeTopMenus(): void {
        if (!this.state.openMenu && !this.state.runHistoryVisible) {
            return;
        }
        this.state = {
            ...this.state,
            openMenu: undefined,
            runHistoryVisible: false
        };
        this.update();
    }

    protected async runMenuCommand(command: () => void | Promise<void>): Promise<void> {
        this.closeTopMenus();
        await command();
    }

    protected setSelectedTemplate(selectedTemplateId: string): void {
        this.state = { ...this.state, selectedTemplateId };
        this.update();
    }

    protected setSelectedPipelinePreset(selectedPipelinePresetId: string): void {
        this.state = { ...this.state, selectedPipelinePresetId };
        this.update();
    }

    protected readonly setSelectedPattern = (selectedPatternId: string): void => {
        const pattern = this.state.workflowPatterns.find(candidate => candidate.id === selectedPatternId);
        this.state = {
            ...this.state,
            selectedPatternId,
            patternParameters: initialPatternParameterValues(pattern),
            patternRoleOverrides: {}
        };
        this.update();
    };

    protected readonly updatePatternParameter = (parameterId: string, value: string | number | boolean): void => {
        this.state = {
            ...this.state,
            patternParameters: {
                ...this.state.patternParameters,
                [parameterId]: value
            }
        };
        this.update();
    };

    protected readonly updatePatternRoleOverride = (roleId: string, override: FlowPatternRoleOverride | undefined): void => {
        const next = { ...this.state.patternRoleOverrides };
        if (!override || isEmptyPatternRoleOverride(override)) {
            delete next[roleId];
        } else {
            next[roleId] = override;
        }
        this.state = {
            ...this.state,
            patternRoleOverrides: next
        };
        this.update();
    };

    protected readonly setAgentSearch = (agentSearch: string): void => {
        this.state = { ...this.state, agentSearch };
        this.update();
    };

    protected readonly toggleWorkflowSourcePanel = (): void => {
        this.state = { ...this.state, workflowSourceVisible: !this.state.workflowSourceVisible };
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

    async runWorkflowFromExternalPrompt(options: FlowExternalRunOptions = {}): Promise<void> {
        await this.withBusy(async () => {
            const workspaceRootUri = options.workspaceRootUri || await this.workspaceRootUri();
            const prompt = externalPromptText(options) || this.state.prompt;
            const workflow = options.workflowId
                ? await this.flowService.getWorkflow({ workspaceRootUri, workflowId: options.workflowId })
                : this.state.snapshot?.activeWorkflow;
            if (!workflow) {
                throw new Error('No Flow workflow is selected.');
            }
            const activeRun = await this.flowService.startRun({
                workspaceRootUri,
                workflowId: workflow.id,
                prompt
            });
            await this.applyExternalRunState(workspaceRootUri, workflow.id, activeRun, prompt);
        }, error => classifyExecutionModeFromError(error));
    }

    async runDynamicWorkflowFromExternalPrompt(options: FlowExternalRunOptions = {}): Promise<void> {
        await this.withBusy(async () => {
            const workspaceRootUri = options.workspaceRootUri || await this.workspaceRootUri();
            const prompt = externalPromptText(options) || this.state.prompt;
            const activeRun = await this.flowService.runDynamicWorkflow({
                workspaceRootUri,
                prompt,
                preferSaved: options.preferSaved !== false,
                parameters: options.parameters,
                roleOverrides: options.roleOverrides,
                authoringDraft: options.authoringDraft || options.draft
            });
            await this.applyExternalRunState(workspaceRootUri, activeRun.workflowId, activeRun, prompt);
        }, error => classifyExecutionModeFromError(error));
    }

    protected async applyExternalRunState(workspaceRootUri: string | undefined, workflowId: string, activeRun: FlowRun, prompt: string): Promise<void> {
        const activeWorkflow = await this.flowService.getWorkflow({ workspaceRootUri, workflowId });
        const workflows = await this.flowService.listWorkflows({ workspaceRootUri });
        const validation = await this.flowService.validateWorkflow(activeWorkflow);
        const previousSnapshot = this.state.snapshot;
        const capabilities = previousSnapshot?.capabilities || await this.flowService.getCapabilities();
        this.state = {
            ...this.state,
            prompt,
            snapshot: {
                workflows,
                activeWorkflow,
                activeRun,
                capabilities,
                validation
            },
            executionModeHint: activeRun.executionMode,
            executionModeHintMessage: activeRun.executionModeMessage,
            selectedKind: 'state',
            selectedId: activeRun.currentStateIds[0] || Object.keys(activeWorkflow.states)[0],
            workflowUndoStack: [],
            workflowRedoStack: [],
            workflowSourceText: undefined,
            workflowSourceError: undefined,
            workflowSavePreview: undefined,
            error: undefined
        };
        await this.subscribeActiveRunStream(activeRun.id);
    }

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

    protected readonly chooseWorkflow = async (workflowId: string): Promise<void> => {
        if (!workflowId) {
            return;
        }
        await this.withBusy(async () => {
            const workspaceRootUri = await this.workspaceRootUri();
            const activeWorkflow = await this.flowService.getWorkflow({ workspaceRootUri, workflowId });
            const workflows = await this.flowService.listWorkflows({ workspaceRootUri });
            const validation = await this.flowService.validateWorkflow(activeWorkflow);
            const previousSnapshot = this.state.snapshot;
            const capabilities = previousSnapshot?.capabilities || await this.flowService.getCapabilities();
            const activeRun = previousSnapshot?.activeRun?.workflowId === workflowId ? previousSnapshot.activeRun : undefined;
            this.state = {
                ...this.state,
                snapshot: {
                    workflows,
                    activeWorkflow,
                    activeRun,
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

    protected readonly createWorkflowFromPreset = async (): Promise<void> => {
        await this.withBusy(async () => {
            const presetId = this.state.selectedPipelinePresetId;
            if (!presetId) {
                return;
            }
            const workspaceRootUri = await this.workspaceRootUri();
            const activeWorkflow = await this.flowService.createWorkflowFromPreset({
                workspaceRootUri,
                presetId
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

    protected readonly createWorkflowFromPattern = async (): Promise<void> => {
        await this.withBusy(async () => {
            const patternId = this.state.selectedPatternId;
            if (!patternId) {
                return;
            }
            const workspaceRootUri = await this.workspaceRootUri();
            const activeWorkflow = await this.flowService.createWorkflowFromPattern({
                workspaceRootUri,
                patternId,
                parameters: this.state.patternParameters,
                roleOverrides: patternRoleOverridesOrUndefined(this.state.patternRoleOverrides)
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

    protected readonly runWorkflowPattern = async (): Promise<void> => {
        await this.withBusy(async () => {
            const patternId = this.state.selectedPatternId;
            if (!patternId) {
                return;
            }
            const workspaceRootUri = await this.workspaceRootUri();
            const activeRun = await this.flowService.runWorkflowPattern({
                workspaceRootUri,
                patternId,
                parameters: this.state.patternParameters,
                roleOverrides: patternRoleOverridesOrUndefined(this.state.patternRoleOverrides),
                prompt: this.state.prompt
            });
            const activeWorkflow = await this.flowService.getWorkflow({ workspaceRootUri, workflowId: activeRun.workflowId });
            const workflows = await this.flowService.listWorkflows({ workspaceRootUri });
            const validation = await this.flowService.validateWorkflow(activeWorkflow);
            const previousSnapshot = this.state.snapshot;
            const capabilities = previousSnapshot?.capabilities || await this.flowService.getCapabilities();
            this.state = {
                ...this.state,
                snapshot: {
                    workflows,
                    activeWorkflow,
                    activeRun,
                    capabilities,
                    validation
                },
                executionModeHint: activeRun.executionMode,
                executionModeHintMessage: activeRun.executionModeMessage,
                selectedKind: 'state',
                selectedId: activeRun.currentStateIds[0] || Object.keys(activeWorkflow.states)[0],
                workflowUndoStack: [],
                workflowRedoStack: [],
                workflowSourceText: undefined,
                workflowSourceError: undefined,
                workflowSavePreview: undefined,
                error: undefined
            };
            await this.subscribeActiveRunStream(activeRun.id);
        }, error => classifyExecutionModeFromError(error));
    };

    protected readonly runDynamicWorkflowFromPrompt = async (): Promise<void> => {
        await this.withBusy(async () => {
            const workspaceRootUri = await this.workspaceRootUri();
            const activeRun = await this.flowService.runDynamicWorkflow({
                workspaceRootUri,
                prompt: this.state.prompt,
                preferSaved: true
            });
            const activeWorkflow = await this.flowService.getWorkflow({ workspaceRootUri, workflowId: activeRun.workflowId });
            const workflows = await this.flowService.listWorkflows({ workspaceRootUri });
            const validation = await this.flowService.validateWorkflow(activeWorkflow);
            const previousSnapshot = this.state.snapshot;
            const capabilities = previousSnapshot?.capabilities || await this.flowService.getCapabilities();
            this.state = {
                ...this.state,
                snapshot: {
                    workflows,
                    activeWorkflow,
                    activeRun,
                    capabilities,
                    validation
                },
                executionModeHint: activeRun.executionMode,
                executionModeHintMessage: activeRun.executionModeMessage,
                selectedKind: 'state',
                selectedId: activeRun.currentStateIds[0] || Object.keys(activeWorkflow.states)[0],
                workflowUndoStack: [],
                workflowRedoStack: [],
                workflowSourceText: undefined,
                workflowSourceError: undefined,
                workflowSavePreview: undefined,
                error: undefined
            };
            await this.subscribeActiveRunStream(activeRun.id);
        }, error => classifyExecutionModeFromError(error));
    };

    protected readonly saveCurrentWorkflowAsPreset = async (): Promise<void> => {
        const workflow = this.state.snapshot?.activeWorkflow;
        if (!workflow) {
            return;
        }
        const defaultId = `${workflow.id}-preset`;
        const id = window.prompt('Pipeline preset id', defaultId)?.trim();
        if (!id) {
            return;
        }
        const name = window.prompt('Pipeline preset name', workflow.name)?.trim() || workflow.name;
        const description = window.prompt('Pipeline preset description', workflow.description || '')?.trim() || workflow.description || '';
        await this.withBusy(async () => {
            const workspaceRootUri = await this.workspaceRootUri();
            await this.flowService.savePipelinePreset({
                workspaceRootUri,
                id,
                name,
                description,
                workflow,
                overwrite: true
            });
            const pipelinePresets = await this.flowService.listPipelinePresets({ workspaceRootUri });
            this.state = {
                ...this.state,
                pipelinePresets,
                selectedPipelinePresetId: id,
                error: undefined
            };
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

    protected readonly toggleRunHistory = async (): Promise<void> => {
        if (this.state.runHistoryVisible) {
            this.state = {
                ...this.state,
                openMenu: undefined,
                runHistoryVisible: false
            };
            this.update();
            return;
        }
        if (this.state.openMenu) {
            this.state = {
                ...this.state,
                openMenu: undefined,
                runHistoryVisible: false
            };
            this.update();
        }
        await this.withBusy(async () => {
            const workspaceRootUri = await this.workspaceRootUri();
            const runHistory = await this.flowService.listRuns({ workspaceRootUri });
            this.state = {
                ...this.state,
                runHistory: runHistory.map(normalizeFlowRunEvents),
                openMenu: 'history',
                runHistoryVisible: true,
                error: undefined
            };
        });
    };

    protected readonly openRunFromHistory = async (runId: string): Promise<void> => {
        await this.withBusy(async () => {
            const workspaceRootUri = await this.workspaceRootUri();
            const activeRun = normalizeFlowRunEvents(await this.flowService.getRun({ workspaceRootUri, runId }));
            const snapshot = this.state.snapshot;
            if (!snapshot) {
                return;
            }
            this.state = {
                ...this.state,
                snapshot: { ...snapshot, activeRun },
                selectedKind: activeRun.currentStateIds[0] ? 'state' : this.state.selectedKind,
                selectedId: activeRun.currentStateIds[0] || this.state.selectedId,
                selectedArtifactId: resolveSelectedArtifactId(activeRun, this.state.selectedArtifactId),
                openMenu: undefined,
                runHistoryVisible: false,
                error: undefined
            };
        });
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

function PatternFactory(props: {
    patterns: FlowWorkflowPattern[];
    selectedPattern?: FlowWorkflowPattern;
    selectedPatternId?: string;
    parameters: Record<string, string | number | boolean>;
    roleOverrides: Record<string, FlowPatternRoleOverride>;
    modelProfiles: FlowModelProfile[];
    languageModels: FlowLanguageModelOption[];
    busy: boolean;
    onSelect: (patternId: string) => void;
    onUpdateParameter: (parameterId: string, value: string | number | boolean) => void;
    onUpdateRoleOverride: (roleId: string, override: FlowPatternRoleOverride | undefined) => void;
    onCreate: () => Promise<void>;
    onRun: () => Promise<void>;
}): React.ReactElement {
    const pattern = props.selectedPattern;
    return <section className='flow__pattern-factory' aria-label='Workflow pattern factory'>
        <div className='flow__section-heading'>
            <h4>Patterns</h4>
            <span>{props.patterns.length}</span>
        </div>
        <label className='flow__factory-field'>
            <span>Pattern</span>
            <select
                value={props.selectedPatternId || ''}
                onChange={event => props.onSelect(event.currentTarget.value)}
                disabled={props.busy || props.patterns.length === 0}
                aria-label='Workflow pattern'
            >
                {props.patterns.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
            </select>
        </label>
        {pattern?.description && <p className='flow__pattern-description'>{pattern.description}</p>}
        {pattern && <div className='flow__pattern-fields'>
            {pattern.parameters.map(parameter => <PatternParameterControl
                key={parameter.id}
                parameter={parameter}
                value={props.parameters[parameter.id] ?? parameter.defaultValue ?? ''}
                modelProfiles={props.modelProfiles}
                disabled={props.busy}
                onUpdate={value => props.onUpdateParameter(parameter.id, value)}
            />)}
        </div>}
        {pattern?.agenticStages && pattern.agenticStages.length > 0 && <PatternRoleOverridesEditor
            pattern={pattern}
            parameters={props.parameters}
            roleOverrides={props.roleOverrides}
            modelProfiles={props.modelProfiles}
            languageModels={props.languageModels}
            disabled={props.busy}
            onUpdateRoleOverride={props.onUpdateRoleOverride}
        />}
        <div className='flow__menu-row'>
            <button title='Create editable workflow from pattern' onClick={props.onCreate} disabled={props.busy || !pattern}>
                <i className='codicon codicon-add' /> Criar flow
            </button>
            <button title='Create and start workflow from the current prompt' onClick={props.onRun} disabled={props.busy || !pattern}>
                <i className='codicon codicon-run' /> Rodar agora
            </button>
        </div>
    </section>;
}

function PatternParameterControl(props: {
    parameter: FlowPatternParameter;
    value: string | number | boolean;
    modelProfiles: FlowModelProfile[];
    disabled: boolean;
    onUpdate: (value: string | number | boolean) => void;
}): React.ReactElement {
    const parameter = props.parameter;
    if (parameter.type === 'number') {
        return <label className='flow__factory-field'>
            <span>{parameter.label}</span>
            <input
                type='number'
                min={parameter.min}
                max={parameter.max}
                value={typeof props.value === 'number' ? props.value : Number(props.value || parameter.defaultValue || 0)}
                disabled={props.disabled}
                title={parameter.description}
                onChange={event => props.onUpdate(numberOrUndefined(event.currentTarget.value) ?? Number(parameter.defaultValue || 0))}
            />
        </label>;
    }
    if (parameter.type === 'boolean') {
        return <label className='flow__factory-toggle'>
            <input
                type='checkbox'
                checked={Boolean(props.value)}
                disabled={props.disabled}
                title={parameter.description}
                onChange={event => props.onUpdate(event.currentTarget.checked)}
            />
            <span>{parameter.label}</span>
        </label>;
    }
    if (parameter.type === 'model_profile') {
        const options = props.modelProfiles.length
            ? props.modelProfiles.map(profile => ({ value: profile.id, label: profile.name }))
            : (parameter.options || []).map(option => ({ value: String(option.value), label: option.label }));
        return <label className='flow__factory-field'>
            <span>{parameter.label}</span>
            <select
                value={String(props.value || parameter.defaultValue || '')}
                disabled={props.disabled}
                title={parameter.description}
                onChange={event => props.onUpdate(event.currentTarget.value)}
            >
                {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
        </label>;
    }
    if (parameter.type === 'select' || parameter.type === 'reasoning_mode') {
        return <label className='flow__factory-field'>
            <span>{parameter.label}</span>
            <select
                value={String(props.value || parameter.defaultValue || '')}
                disabled={props.disabled}
                title={parameter.description}
                onChange={event => props.onUpdate(event.currentTarget.value)}
            >
                {(parameter.options || []).map(option => <option key={String(option.value)} value={String(option.value)}>{option.label}</option>)}
            </select>
        </label>;
    }
    if (parameter.type === 'markdown') {
        return <label className='flow__factory-field flow__factory-field--wide'>
            <span>{parameter.label}</span>
            <textarea
                rows={3}
                value={String(props.value || parameter.defaultValue || '')}
                disabled={props.disabled}
                title={parameter.description}
                onChange={event => props.onUpdate(event.currentTarget.value)}
            />
        </label>;
    }
    return <label className='flow__factory-field'>
        <span>{parameter.label}</span>
        <input
            value={String(props.value || parameter.defaultValue || '')}
            disabled={props.disabled}
            title={parameter.description}
            onChange={event => props.onUpdate(event.currentTarget.value)}
        />
    </label>;
}

function PatternRoleOverridesEditor(props: {
    pattern: FlowWorkflowPattern;
    parameters: Record<string, string | number | boolean>;
    roleOverrides: Record<string, FlowPatternRoleOverride>;
    modelProfiles: FlowModelProfile[];
    languageModels: FlowLanguageModelOption[];
    disabled: boolean;
    onUpdateRoleOverride: (roleId: string, override: FlowPatternRoleOverride | undefined) => void;
}): React.ReactElement {
    const stages = props.pattern.agenticStages || [];
    return <section className='flow__pattern-stage-overrides' aria-label='Agentic stage model settings'>
        <div className='flow__section-heading'>
            <h4>Agentic stages</h4>
            <span>{stages.length}</span>
        </div>
        <div className='flow__pattern-stage-grid'>
            <div className='flow__pattern-stage-header'>Stage</div>
            <div className='flow__pattern-stage-header'>Profile</div>
            <div className='flow__pattern-stage-header'>Provider</div>
            <div className='flow__pattern-stage-header'>Model</div>
            <div className='flow__pattern-stage-header'>Policy</div>
            <div className='flow__pattern-stage-header'>Native</div>
            <div className='flow__pattern-stage-header'>Virtual</div>
            {stages.map(stage => <PatternRoleOverrideRow
                key={stage.id}
                stage={stage}
                defaultProfileId={patternStageDefaultProfileId(props.pattern, props.parameters, stage)}
                override={props.roleOverrides[stage.id]}
                modelProfiles={props.modelProfiles}
                languageModels={props.languageModels}
                disabled={props.disabled}
                onUpdate={override => props.onUpdateRoleOverride(stage.id, override)}
            />)}
        </div>
    </section>;
}

function PatternRoleOverrideRow(props: {
    stage: NonNullable<FlowWorkflowPattern['agenticStages']>[number];
    defaultProfileId: string;
    override?: FlowPatternRoleOverride;
    modelProfiles: FlowModelProfile[];
    languageModels: FlowLanguageModelOption[];
    disabled: boolean;
    onUpdate: (override: FlowPatternRoleOverride | undefined) => void;
}): React.ReactElement {
    const override = props.override || {};
    const execution = override.modelExecution || {};
    const profileOptions = props.modelProfiles.length ? props.modelProfiles : [];
    const currentProfileId = override.profileId || execution.profileId || '';
    const currentModelId = override.provider?.modelId || '';
    const modelOptions = uniqueStrings([
        '',
        ...props.languageModels.map(model => model.id),
        ...props.modelProfiles.map(profile => profile.provider?.modelId).filter((value): value is string => Boolean(value)),
        currentModelId
    ]);
    const updateOverride = (patch: Partial<FlowPatternRoleOverride>): void =>
        props.onUpdate(patternRoleOverrideOrUndefined({ ...override, ...patch }));
    const updateExecution = (patch: Partial<FlowModelExecutionProfile>): void =>
        updateOverride({ modelExecution: modelExecutionOrUndefined({ ...execution, ...patch }) });
    const updateNativeEffort = (effort: string): void => {
        if (effort === 'inherit') {
            const next = { ...(execution.nativeReasoning || {}) };
            delete next.effort;
            delete next.enabled;
            updateExecution({ nativeReasoning: Object.keys(next).length > 0 ? next : undefined });
            return;
        }
        updateExecution({
            nativeReasoning: {
                ...(execution.nativeReasoning || {}),
                enabled: effort !== 'none',
                effort: effort as NonNullable<FlowModelExecutionProfile['nativeReasoning']>['effort']
            }
        });
    };
    const updateVirtualMode = (mode: string): void => {
        if (mode === 'inherit') {
            const next = { ...(execution.virtualReasoning || {}) };
            delete next.mode;
            delete next.enabled;
            updateExecution({ virtualReasoning: Object.keys(next).length > 0 ? next : undefined });
            return;
        }
        updateExecution({
            virtualReasoning: {
                ...(execution.virtualReasoning || {}),
                enabled: mode !== 'off',
                mode: mode as NonNullable<FlowModelExecutionProfile['virtualReasoning']>['mode']
            }
        });
    };
    return <>
        <div className='flow__pattern-stage-name'>
            <strong>{props.stage.label}</strong>
            <span>{props.stage.repeated ? `${props.stage.role} / repeated` : props.stage.role}</span>
        </div>
        <select
            value={currentProfileId}
            disabled={props.disabled}
            title={`Default: ${props.defaultProfileId}`}
            onChange={event => updateOverride({ profileId: event.currentTarget.value || undefined })}
        >
            <option value=''>Default: {profileLabel(props.modelProfiles, props.defaultProfileId)}</option>
            {profileOptions.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
        </select>
        <select
            value={override.provider?.providerId || ''}
            disabled={props.disabled}
            onChange={event => updateOverride({
                provider: providerSelectionOrUndefined(event.currentTarget.value || undefined, override.provider?.modelId, override.provider?.options)
            })}
        >
            <option value=''>Default provider</option>
            <option value='theia-language-model'>Theia language model</option>
            <option value='codex-provider'>Codex provider</option>
            <option value='command'>Command provider</option>
            <option value='e2e-mock'>E2E mock</option>
        </select>
        <select
            value={currentModelId}
            disabled={props.disabled}
            onChange={event => updateOverride({
                provider: providerSelectionOrUndefined(override.provider?.providerId, event.currentTarget.value, override.provider?.options)
            })}
        >
            {modelOptions.map(modelId => <option key={modelId || 'default'} value={modelId}>{modelOptionLabel(props.languageModels, modelId, 'Default model')}</option>)}
        </select>
        <select
            value={execution.reasoningPolicy || 'inherit'}
            disabled={props.disabled}
            onChange={event => updateExecution({
                reasoningPolicy: event.currentTarget.value === 'inherit'
                    ? undefined
                    : event.currentTarget.value as FlowModelExecutionProfile['reasoningPolicy']
            })}
        >
            <option value='inherit'>Default</option>
            <option value='off'>Off</option>
            <option value='auto'>Auto</option>
            <option value='native'>Native</option>
            <option value='virtual'>Virtual</option>
            <option value='native_plus_virtual_light'>Native + light virtual</option>
        </select>
        <select
            value={execution.nativeReasoning?.effort || 'inherit'}
            disabled={props.disabled}
            onChange={event => updateNativeEffort(event.currentTarget.value)}
        >
            <option value='inherit'>Default</option>
            <option value='none'>None</option>
            <option value='low'>Low</option>
            <option value='medium'>Medium</option>
            <option value='high'>High</option>
        </select>
        <select
            value={execution.virtualReasoning?.mode || 'inherit'}
            disabled={props.disabled}
            onChange={event => updateVirtualMode(event.currentTarget.value)}
        >
            <option value='inherit'>Default</option>
            <option value='off'>Off</option>
            <option value='auto'>Auto</option>
            <option value='fast'>Fast</option>
            <option value='balanced'>Balanced</option>
            <option value='deep'>Deep</option>
            <option value='coding'>Coding</option>
            <option value='research'>Research</option>
            <option value='lats'>LATS</option>
        </select>
    </>;
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
    const [connectionTarget, setConnectionTarget] = React.useState<{ x: number; y: number }>();
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
                    x: Math.max(0, worldX - 118),
                    y: Math.max(0, worldY - 48)
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
        if (event.key === 'Escape' && connectionSource) {
            event.preventDefault();
            setConnectionSource(undefined);
            setConnectionTarget(undefined);
        } else if (event.key === 'ArrowRight' && event.altKey) {
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
        if (connectionSource) {
            setConnectionSource(undefined);
            setConnectionTarget(undefined);
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
        if (connectionSource) {
            event.stopPropagation();
            return;
        }
        if (event.button !== 0 || (event.target as HTMLElement).closest('.flow__flow-node-link-handle')) {
            return;
        }
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        props.onSelectState(node.id);
        setDrag({ kind: 'node', pointerId: event.pointerId, nodeId: node.id, startX: event.clientX, startY: event.clientY, originX: node.x, originY: node.y });
    };

    const pointFromPointer = (event: React.PointerEvent<HTMLDivElement>): { x: number; y: number } | undefined => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) {
            return undefined;
        }
        return {
            x: (event.clientX - rect.left - viewport.x) / viewport.zoom,
            y: (event.clientY - rect.top - viewport.y) / viewport.zoom
        };
    };

    const startConnectionFromNode = (nodeId: string): void => {
        setConnectionSource(nodeId);
        const node = nodeById.get(nodeId);
        setConnectionTarget(node ? { x: node.x + node.width, y: node.y + node.height / 2 } : undefined);
        props.onSelectState(nodeId);
    };

    const addConnectionToNode = async (nodeId: string): Promise<void> => {
        if (!connectionSource) {
            return;
        }
        if (connectionSource === nodeId) {
            setConnectionSource(undefined);
            setConnectionTarget(undefined);
            props.onSelectState(nodeId);
            return;
        }
        const transitionId = await props.onAddTransition(connectionSource, nodeId);
        setConnectionSource(undefined);
        setConnectionTarget(undefined);
        if (transitionId) {
            props.onSelectTransition(transitionId);
        }
    };

    const onOutputConnectorClick = async (event: React.MouseEvent<HTMLButtonElement>, nodeId: string): Promise<void> => {
        event.preventDefault();
        event.stopPropagation();
        if (!props.editable) {
            props.onSelectState(nodeId);
            return;
        }
        if (!connectionSource) {
            startConnectionFromNode(nodeId);
            return;
        }
        await addConnectionToNode(nodeId);
    };

    const onInputConnectorClick = async (event: React.MouseEvent<HTMLButtonElement>, nodeId: string): Promise<void> => {
        event.preventDefault();
        event.stopPropagation();
        if (!props.editable || !connectionSource) {
            props.onSelectState(nodeId);
            return;
        }
        await addConnectionToNode(nodeId);
    };

    const onNodeClick = async (event: React.MouseEvent<HTMLDivElement>, nodeId: string): Promise<void> => {
        event.stopPropagation();
        if (connectionSource && props.editable) {
            await addConnectionToNode(nodeId);
            return;
        }
        props.onSelectState(nodeId);
    };
    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
        if (connectionSource && !drag) {
            setConnectionTarget(pointFromPointer(event));
        }
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
    const connectionPreviewEdge = connectionSource && connectionTarget && nodeById.get(connectionSource)
        ? {
            id: 'flow-connection-preview',
            from: connectionSource,
            to: '',
            event: '',
            guardSummary: undefined,
            points: [
                {
                    x: nodeById.get(connectionSource)!.x + nodeById.get(connectionSource)!.width,
                    y: nodeById.get(connectionSource)!.y + nodeById.get(connectionSource)!.height / 2
                },
                connectionTarget
            ]
        }
        : undefined;

    return <div
        className='flow__flow'
        role='application'
        aria-label={`${props.workflow.name} workflow canvas`}
        tabIndex={0}
        onKeyDown={onKeyDown}
    >
        <header className='flow__flow-header'>
            <div>
                <h3>Canvas</h3>
                <span>{props.nodes.length} blocos / {props.edges.length} ligacoes</span>
            </div>
            <span>{props.selectedId ? `Selecionado: ${props.selectedId}` : 'Nada selecionado'}</span>
        </header>
        <div className='flow__flow-stage'>
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
            <span className='flow__flow-palette-title'>Blocos</span>
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
            className={`flow__flow-viewport ${connectionSource ? 'flow__flow-viewport--connecting' : ''}`}
            ref={canvasRef}
            onPointerDown={startPan}
            onPointerMove={onPointerMove}
            onPointerUp={finishPointerDrag}
            onPointerCancel={finishPointerDrag}
            onWheel={onWheel}
            onDragOver={onDragOverNewState}
            onDrop={onDropNewState}
            onPointerLeave={() => connectionSource ? setConnectionTarget(undefined) : undefined}
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
                        <path d={edgePath(edge)} markerEnd='url(#flow-flow-arrow)' />
                        <text x={edgeMidpoint(edge, 'x')} y={edgeMidpoint(edge, 'y')}>{edge.event}</text>
                        {edge.guardSummary && <text className='flow__flow-edge-guard' x={edgeMidpoint(edge, 'x')} y={edgeMidpoint(edge, 'y') + 16}>{edge.guardSummary}</text>}
                        {issueSeverity && <text className='flow__flow-issue-marker' x={edgeMidpoint(edge, 'x')} y={edgeMidpoint(edge, 'y') + 30}>!</text>}
                    </g>;
                    })}
                    {connectionPreviewEdge && <g className='flow__flow-edge flow__flow-edge--pending' aria-hidden='true'>
                        <path d={edgePath(connectionPreviewEdge)} markerEnd='url(#flow-flow-arrow)' />
                    </g>}
                </svg>
                {positionedNodes.map(node => {
                    const issueSeverity = validationIssueSeverity(canvasIssues.filter(issue => validationIssueTarget(props.workflow, issue)?.id === node.id));
                    const nodeIdentity = nodeIdentityLabel(node.agent);
                    const isConnectionTarget = Boolean(connectionSource && connectionSource !== node.id);
                    const connectionActionLabel = connectionSource
                        ? connectionSource === node.id
                            ? `Cancel transition from ${node.id}`
                            : `Create transition from ${connectionSource} to ${node.id}`
                        : undefined;
                    return <div
                    key={node.id}
                    className={`flow__flow-node flow__flow-node--type-${node.type} flow__flow-node--${node.status} ${props.selectedId === node.id ? 'flow__flow-node--selected' : ''} ${connectionSource === node.id ? 'flow__flow-node--connecting' : ''} ${isConnectionTarget ? 'flow__flow-node--connection-target' : ''} ${issueSeverity ? `flow__flow-node--${issueSeverity}` : ''}`}
                    style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
                    onPointerDown={event => startNodeDrag(event, node)}
                    onClick={event => void onNodeClick(event, node.id)}
                    onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            if (connectionSource && props.editable) {
                                void addConnectionToNode(node.id);
                            } else {
                                props.onSelectState(node.id);
                            }
                        }
                    }}
                    title={`${node.id}: ${node.type}`}
                    role='button'
                    tabIndex={0}
                    aria-selected={props.selectedId === node.id}
                >
                    <button
                        type='button'
                        className='flow__flow-node-link-handle flow__flow-node-handle flow__flow-node-handle--input'
                        title={connectionActionLabel || `Input connector for ${node.id}`}
                        aria-label={connectionActionLabel || `Input connector for ${node.id}`}
                        disabled={!props.editable}
                        onClick={event => onInputConnectorClick(event, node.id)}
                    />
                    <div className='flow__flow-node-icon' aria-hidden='true'>
                        <i className={`codicon ${stateTypeIcon(node.type)}`} />
                    </div>
                    <div className='flow__flow-node-body'>
                        <strong>{node.label}</strong>
                        {nodeIdentity && <span>{nodeIdentity}</span>}
                        <small>{node.status}</small>
                    </div>
                    {issueSeverity && <span className='flow__flow-node-issue' title={`${issueSeverity} validation issue`}>!</span>}
                    <button
                        type='button'
                        className='flow__flow-node-link-handle flow__flow-node-connector'
                        title={connectionActionLabel || `Start transition from ${node.id}`}
                        aria-label={connectionActionLabel || `Start transition from ${node.id}`}
                        disabled={!props.editable}
                        onClick={event => onOutputConnectorClick(event, node.id)}
                    >
                        <i className={`codicon ${connectionSource ? 'codicon-debug-step-into' : 'codicon-arrow-right'}`} />
                    </button>
                </div>;
                })}
            </div>
        </div>
        <CanvasMinimap nodes={positionedNodes} width={width} height={height} viewport={viewport} viewportSize={viewportSize} />
        </div>
    </div>;
}

function WorkflowSourceEditor(props: {
    workflow: FlowWorkflow;
    value: string;
    validation?: FlowSnapshot['validation'];
    parseError?: string;
    selectedKind: 'state' | 'transition';
    selectedId?: string;
    onSelectIssue: (issue: FlowValidationIssue) => void;
}): React.ReactElement {
    const issues = props.validation ? [...props.validation.errors, ...props.validation.warnings] : [];
    const selectedPath = props.selectedId ? workflowSourcePathForSelection(props.workflow, props.selectedKind, props.selectedId) : undefined;
    const sourceFormat = workflowSourceFormatLabel(props.workflow);
    return <section className='flow__workflow-json' aria-label={`Workflow ${sourceFormat} source preview`}>
        <div className='flow__workflow-json-header'>
            <h3>Workflow {sourceFormat} source</h3>
            <span>{props.validation?.valid ? 'valid' : `${props.validation?.errors.length || 0} errors / ${props.validation?.warnings.length || 0} warnings`}</span>
        </div>
        <p className='flow__workflow-json-note'>Internal JSON/YAML preview. Configure workflows with the canvas, pattern controls, model selectors, and Markdown agent prompts.</p>
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
            readOnly={true}
            placeholder='Workflow source'
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
    modelProfiles: FlowModelProfile[];
    languageModels: FlowLanguageModelOption[];
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
        {state.type === 'agent' && <KeyValue label='Provider / model' value={providerSummary(state.provider)} />}
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
            workflow={props.workflow}
            stateId={selectedStateId}
            state={state}
            editable={props.workflow.file?.editable !== false}
            issues={validationIssues}
            modelProfiles={props.modelProfiles}
            languageModels={props.languageModels}
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
    workflow: FlowWorkflow;
    stateId: string;
    state: FlowWorkflow['states'][string];
    editable: boolean;
    issues: FlowValidationIssue[];
    modelProfiles: FlowModelProfile[];
    languageModels: FlowLanguageModelOption[];
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
        <div className='flow__form-section'>
            <h5>Agente</h5>
            <label>
                <span>Agent</span>
                <div className='flow__agent-field'>
                    <input
                        value={props.state.agent || ''}
                        disabled={!props.editable}
                        placeholder='ex: frontend ou agents/frontend.md'
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
            {props.state.type === 'agent' && <>
            <ModelExecutionEditor
                state={props.state}
                modelProfiles={props.modelProfiles}
                languageModels={props.languageModels}
                editable={props.editable}
                onUpdate={patch => props.onUpdateState(props.stateId, patch)}
            />
            <label>
                <span>System prompt</span>
                <textarea
                    rows={4}
                    value={props.state.systemPrompt || ''}
                    disabled={!props.editable}
                    placeholder='Papel, limites e criterios do agente'
                    onChange={event => props.onUpdateState(props.stateId, { systemPrompt: emptyToUndefined(event.currentTarget.value) })}
                />
            </label>
            <label>
                <span>Task prompt</span>
                <textarea
                    rows={4}
                    value={props.state.taskPrompt || ''}
                    disabled={!props.editable}
                    placeholder='Tarefa especifica deste bloco'
                    onChange={event => props.onUpdateState(props.stateId, { taskPrompt: emptyToUndefined(event.currentTarget.value) })}
                />
            </label>
            <label>
                <span>Deliverables</span>
                <textarea
                    rows={4}
                    value={deliverablesToText(props.state.deliverables)}
                    disabled={!props.editable}
                    placeholder='path | description | kind | required'
                    onChange={event => props.onUpdateState(props.stateId, { deliverables: textToDeliverables(event.currentTarget.value) })}
                />
            </label>
            </>}
        </div>
        <div className='flow__form-section'>
            <h5>Entrada e saida</h5>
            <label>
                <span>Input includes</span>
                <textarea
                    rows={3}
                    value={listToText(props.state.input?.include)}
                    disabled={!props.editable}
                    placeholder='artifact:reports/spec.md'
                    onChange={event => updateInput({ include: textToList(event.currentTarget.value) })}
                />
            </label>
            <label>
                <span>Input signals</span>
                <textarea
                    rows={2}
                    value={listToText(props.state.input?.signals)}
                    disabled={!props.editable}
                    placeholder='design.approved'
                    onChange={event => updateInput({ signals: textToList(event.currentTarget.value) })}
                />
            </label>
            <label>
                <span>Outputs</span>
                <textarea
                    rows={3}
                    value={listToText(props.state.outputs)}
                    disabled={!props.editable}
                    placeholder={'report\npatch'}
                    onChange={event => props.onUpdateState(props.stateId, { outputs: textToList(event.currentTarget.value) })}
                />
            </label>
        </div>
        <div className='flow__form-section'>
            <h5>Execucao</h5>
            <div className='flow__editor-grid'>
                <label>
                    <span>Timeout ms</span>
                    <input
                        type='number'
                        min='0'
                        value={props.state.timeoutMs ?? ''}
                        disabled={!props.editable}
                        placeholder='600000'
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
                        placeholder='0'
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
                        placeholder='state_retry_count'
                        onChange={event => props.onUpdateState(props.stateId, {
                            retry: retryOrUndefined(props.state.retry?.max, emptyToUndefined(event.currentTarget.value))
                        })}
                    />
                </label>
            </div>
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
        {props.state.type === 'dynamic_parallel' && <DynamicParallelEditor
            workflow={props.workflow}
            state={props.state}
            editable={props.editable}
            onUpdate={patch => props.onUpdateState(props.stateId, patch)}
        />}
        {props.state.type === 'tournament' && <TournamentEditor
            workflow={props.workflow}
            state={props.state}
            editable={props.editable}
            onUpdate={patch => props.onUpdateState(props.stateId, patch)}
        />}
    </section>;
}

function DynamicParallelEditor(props: {
    workflow: FlowWorkflow;
    state: FlowWorkflow['states'][string];
    editable: boolean;
    onUpdate: (patch: Partial<FlowWorkflow['states'][string]>) => Promise<void>;
}): React.ReactElement {
    const config = props.state.dynamicParallel || { itemsFrom: '', worker: { type: 'agent' as const, agent: 'worker' } };
    const update = (patch: Partial<NonNullable<FlowWorkflow['states'][string]['dynamicParallel']>>): Promise<void> =>
        props.onUpdate({ dynamicParallel: compactObject({ ...config, ...patch }) });
    return <section className='flow__super-node-editor' aria-label='Dynamic parallel editor'>
        <div className='flow__section-heading'>
            <h4>Dynamic fan-out</h4>
            <span>{config.joinStrategy || 'collect'}</span>
        </div>
        <div className='flow__editor-grid flow__editor-grid--two'>
            <label>
                <span>Items source</span>
                <OutputSourceSelect
                    value={config.itemsFrom}
                    workflow={props.workflow}
                    disabled={!props.editable}
                    onChange={itemsFrom => update({ itemsFrom })}
                />
            </label>
            <label>
                <span>Item variable</span>
                <input
                    value={config.itemVariable || ''}
                    disabled={!props.editable}
                    placeholder='item'
                    onChange={event => update({ itemVariable: emptyToUndefined(event.currentTarget.value) })}
                />
            </label>
            <label>
                <span>Concurrency</span>
                <input
                    type='number'
                    min='1'
                    value={config.concurrency ?? ''}
                    disabled={!props.editable}
                    onChange={event => update({ concurrency: numberOrUndefined(event.currentTarget.value) })}
                />
            </label>
            <label>
                <span>Max items</span>
                <input
                    type='number'
                    min='1'
                    value={config.maxItems ?? ''}
                    disabled={!props.editable}
                    onChange={event => update({ maxItems: numberOrUndefined(event.currentTarget.value) })}
                />
            </label>
            <label>
                <span>Failure policy</span>
                <select
                    value={config.failurePolicy || 'best_effort'}
                    disabled={!props.editable}
                    onChange={event => update({ failurePolicy: event.currentTarget.value as NonNullable<typeof config.failurePolicy> })}
                >
                    <option value='fail_fast'>Fail fast</option>
                    <option value='best_effort'>Best effort</option>
                    <option value='threshold'>Threshold</option>
                </select>
            </label>
            <label>
                <span>Join strategy</span>
                <select
                    value={config.joinStrategy || 'collect'}
                    disabled={!props.editable}
                    onChange={event => update({ joinStrategy: event.currentTarget.value as NonNullable<typeof config.joinStrategy> })}
                >
                    <option value='collect'>Collect all</option>
                    <option value='best_effort'>Best effort</option>
                    <option value='require_all'>Require all</option>
                </select>
            </label>
        </div>
    </section>;
}

function TournamentEditor(props: {
    workflow: FlowWorkflow;
    state: FlowWorkflow['states'][string];
    editable: boolean;
    onUpdate: (patch: Partial<FlowWorkflow['states'][string]>) => Promise<void>;
}): React.ReactElement {
    const config = props.state.tournament || { candidatesFrom: '', judge: { type: 'agent' as const, agent: 'judge' } };
    const update = (patch: Partial<NonNullable<FlowWorkflow['states'][string]['tournament']>>): Promise<void> =>
        props.onUpdate({ tournament: compactObject({ ...config, ...patch }) });
    return <section className='flow__super-node-editor' aria-label='Tournament editor'>
        <div className='flow__section-heading'>
            <h4>Tournament</h4>
            <span>{config.strategy || 'single_round'}</span>
        </div>
        <div className='flow__editor-grid flow__editor-grid--two'>
            <label>
                <span>Candidates source</span>
                <OutputSourceSelect
                    value={config.candidatesFrom}
                    workflow={props.workflow}
                    disabled={!props.editable}
                    onChange={candidatesFrom => update({ candidatesFrom })}
                />
            </label>
            <label>
                <span>Strategy</span>
                <select
                    value={config.strategy || 'single_round'}
                    disabled={!props.editable}
                    onChange={event => update({ strategy: event.currentTarget.value as NonNullable<typeof config.strategy> })}
                >
                    <option value='single_round'>Single round</option>
                    <option value='bracket'>Bracket</option>
                    <option value='round_robin'>Round robin</option>
                </select>
            </label>
            <label>
                <span>Winner count</span>
                <input
                    type='number'
                    min='1'
                    value={config.winnerCount ?? ''}
                    disabled={!props.editable}
                    onChange={event => update({ winnerCount: numberOrUndefined(event.currentTarget.value) })}
                />
            </label>
            <label>
                <span>Tie breaker</span>
                <select
                    value={config.tieBreaker || 'judge_again'}
                    disabled={!props.editable}
                    onChange={event => update({ tieBreaker: event.currentTarget.value as NonNullable<typeof config.tieBreaker> })}
                >
                    <option value='judge_again'>Judge again</option>
                    <option value='score_total'>Score total</option>
                    <option value='first_candidate'>First candidate</option>
                </select>
            </label>
        </div>
        <label>
            <span>Criteria</span>
            <textarea
                rows={3}
                value={(config.criteria || []).join('\n')}
                disabled={!props.editable}
                onChange={event => update({ criteria: textToList(event.currentTarget.value) })}
            />
        </label>
    </section>;
}

function OutputSourceSelect(props: {
    workflow: FlowWorkflow;
    value?: string;
    disabled: boolean;
    onChange: (value: string) => void;
}): React.ReactElement {
    const options = uniqueStrings([props.value || '', ...workflowOutputSourceOptions(props.workflow)]).filter(Boolean);
    return <select
        value={props.value || ''}
        disabled={props.disabled}
        onChange={event => props.onChange(event.currentTarget.value)}
    >
        {options.length === 0 && <option value=''>No outputs available</option>}
        {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>;
}

function ModelExecutionEditor(props: {
    state: FlowWorkflow['states'][string];
    modelProfiles: FlowModelProfile[];
    languageModels: FlowLanguageModelOption[];
    editable: boolean;
    onUpdate: (patch: Partial<FlowWorkflow['states'][string]>) => Promise<void>;
}): React.ReactElement {
    const execution = props.state.modelExecution || {};
    const profileId = execution.profileId || 'inherit';
    const currentModelId = props.state.provider?.modelId || '';
    const modelOptions = uniqueStrings([
        '',
        ...props.languageModels.map(model => model.id),
        ...props.modelProfiles.map(profile => profile.provider?.modelId).filter((value): value is string => Boolean(value)),
        currentModelId
    ]);
    const updateExecution = (patch: Partial<FlowModelExecutionProfile>): Promise<void> =>
        props.onUpdate({ modelExecution: modelExecutionOrUndefined({ ...execution, ...patch }) });
    return <section className='flow__model-execution' aria-label='Model execution'>
        <div className='flow__section-heading'>
            <h4>Model execution</h4>
            <span>{profileId}</span>
        </div>
        <div className='flow__editor-grid flow__editor-grid--two'>
            <label>
                <span>Profile</span>
                <select
                    value={profileId}
                    disabled={!props.editable}
                    onChange={event => {
                        const profile = props.modelProfiles.find(candidate => candidate.id === event.currentTarget.value);
                        void props.onUpdate({
                            provider: profile?.provider,
                            modelExecution: profile ? { ...profile.execution, profileId: profile.id } : undefined
                        });
                    }}
                >
                    {props.modelProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                </select>
            </label>
            <label>
                <span>Provider</span>
                <select
                    value={props.state.provider?.providerId || 'inherit'}
                    disabled={!props.editable}
                    onChange={event => props.onUpdate({
                        provider: providerSelectionOrUndefined(event.currentTarget.value === 'inherit' ? undefined : event.currentTarget.value, props.state.provider?.modelId, props.state.provider?.options)
                    })}
                >
                    <option value='inherit'>Use profile/default</option>
                    <option value='theia-language-model'>Theia language model</option>
                    <option value='codex-provider'>Codex provider</option>
                    <option value='command'>Command provider</option>
                    <option value='e2e-mock'>E2E mock</option>
                </select>
            </label>
            <label>
                <span>Model</span>
                <select
                    value={currentModelId}
                    disabled={!props.editable}
                    onChange={event => props.onUpdate({
                        provider: providerSelectionOrUndefined(props.state.provider?.providerId, event.currentTarget.value, props.state.provider?.options)
                    })}
                >
                    {modelOptions.map(modelId => <option key={modelId || 'default'} value={modelId}>{modelOptionLabel(props.languageModels, modelId, 'Provider default / selected chat model')}</option>)}
                </select>
            </label>
            <label>
                <span>Reasoning policy</span>
                <select
                    value={execution.reasoningPolicy || 'off'}
                    disabled={!props.editable}
                    onChange={event => updateExecution({ reasoningPolicy: event.currentTarget.value as FlowModelExecutionProfile['reasoningPolicy'] })}
                >
                    <option value='off'>Off</option>
                    <option value='auto'>Auto</option>
                    <option value='native'>Native</option>
                    <option value='virtual'>Virtual</option>
                    <option value='native_plus_virtual_light'>Native + light virtual</option>
                </select>
            </label>
            <label>
                <span>Native effort</span>
                <select
                    value={execution.nativeReasoning?.effort || 'none'}
                    disabled={!props.editable}
                    onChange={event => updateExecution({
                        nativeReasoning: {
                            ...(execution.nativeReasoning || {}),
                            enabled: event.currentTarget.value !== 'none',
                            effort: event.currentTarget.value as NonNullable<FlowModelExecutionProfile['nativeReasoning']>['effort']
                        }
                    })}
                >
                    <option value='none'>None</option>
                    <option value='low'>Low</option>
                    <option value='medium'>Medium</option>
                    <option value='high'>High</option>
                </select>
            </label>
            <label>
                <span>Virtual reasoning</span>
                <select
                    value={execution.virtualReasoning?.mode || 'off'}
                    disabled={!props.editable}
                    onChange={event => updateExecution({
                        virtualReasoning: {
                            ...(execution.virtualReasoning || {}),
                            enabled: event.currentTarget.value !== 'off',
                            mode: event.currentTarget.value as NonNullable<FlowModelExecutionProfile['virtualReasoning']>['mode']
                        }
                    })}
                >
                    <option value='off'>Off</option>
                    <option value='auto'>Auto</option>
                    <option value='fast'>Fast</option>
                    <option value='balanced'>Balanced</option>
                    <option value='deep'>Deep</option>
                    <option value='coding'>Coding</option>
                    <option value='research'>Research</option>
                    <option value='lats'>LATS</option>
                </select>
            </label>
            <label>
                <span>Temperature</span>
                <input
                    type='range'
                    min='0'
                    max='1'
                    step='0.05'
                    value={execution.temperature ?? 0.2}
                    disabled={!props.editable}
                    onChange={event => updateExecution({ temperature: numberOrUndefined(event.currentTarget.value) })}
                />
            </label>
            <label>
                <span>Max output tokens</span>
                <input
                    type='number'
                    min='0'
                    value={execution.maxTokens ?? ''}
                    disabled={!props.editable}
                    placeholder='default'
                    onChange={event => updateExecution({ maxTokens: numberOrUndefined(event.currentTarget.value) })}
                />
            </label>
        </div>
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
        <div className='flow__form-section'>
            <h5>Roteamento</h5>
            <div className='flow__editor-grid flow__editor-grid--two'>
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
            </div>
            <div className='flow__editor-grid flow__editor-grid--two'>
                <label>
                    <span>On</span>
                    <input
                        value={props.transition.on}
                        disabled={!props.editable}
                        placeholder='workload.completed'
                        onChange={event => props.onUpdateTransition(props.transitionId, { on: event.currentTarget.value })}
                    />
                </label>
                <label>
                    <span>Priority</span>
                    <input
                        type='number'
                        value={props.transition.priority ?? ''}
                        disabled={!props.editable}
                        placeholder='0'
                        onChange={event => props.onUpdateTransition(props.transitionId, { priority: numberOrUndefined(event.currentTarget.value) })}
                    />
                </label>
            </div>
        </div>
        <div className='flow__form-section'>
            <h5>Condicao</h5>
            <label>
                <span>Guard JSON</span>
                <textarea
                    rows={5}
                    value={guardText}
                    disabled={!props.editable}
                    placeholder={'{\n  "status": "done"\n}'}
                    onChange={event => updateGuard(event.currentTarget.value)}
                />
            </label>
            {guardError && <div className='flow__inline-validation'><span>{guardError}</span></div>}
        </div>
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

function RunHistoryPanel(props: {
    runs: FlowRun[];
    activeRunId?: string;
    busy: boolean;
    onOpen: (runId: string) => Promise<void>;
    onClose: () => Promise<void>;
}): React.ReactElement {
    return <section className='flow__run-history' aria-label='Historico de runs'>
        <div className='flow__section-heading'>
            <h3>Historico de runs</h3>
            <button type='button' title='Fechar historico' onClick={props.onClose}>
                <i className='codicon codicon-close' />
            </button>
        </div>
        {props.runs.length === 0 && <p>Nenhuma run registrada.</p>}
        <div className='flow__run-history-list'>
            {props.runs.map(run => <button
                key={run.id}
                type='button'
                className={run.id === props.activeRunId ? 'flow__run-history-item flow__run-history-item--active' : 'flow__run-history-item'}
                disabled={props.busy}
                title={`Abrir run ${run.id}`}
                onClick={() => props.onOpen(run.id)}
            >
                <strong>{run.workflowId}</strong>
                <span>{run.status}</span>
                <small>{formatTimestamp(run.updatedAt || run.createdAt)}</small>
                <code>{run.id}</code>
            </button>)}
        </div>
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

function edgePath(edge: FlowCanvasEdge): string {
    const from = edge.points[0] || { x: 0, y: 0 };
    const to = edge.points[1] || from;
    const curve = Math.max(48, Math.abs(to.x - from.x) * 0.45);
    return `M ${from.x} ${from.y} C ${from.x + curve} ${from.y}, ${to.x - curve} ${to.y}, ${to.x} ${to.y}`;
}

const AGENCY_CANVAS_STATE_TYPES: FlowStateType[] = [
    'input',
    'context',
    'agent',
    'parallel',
    'dynamic_parallel',
    'tournament',
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

function initialPatternParameterValues(pattern: FlowWorkflowPattern | undefined): Record<string, string | number | boolean> {
    if (!pattern) {
        return {};
    }
    return Object.fromEntries(pattern.parameters
        .filter(parameter => parameter.defaultValue !== undefined)
        .map(parameter => [parameter.id, parameter.defaultValue as string | number | boolean]));
}

function patternStageDefaultProfileId(
    pattern: FlowWorkflowPattern,
    parameters: Record<string, string | number | boolean>,
    stage: NonNullable<FlowWorkflowPattern['agenticStages']>[number]
): string {
    const parameterId = stage.profileParameterId;
    if (parameterId) {
        const configured = parameters[parameterId];
        if (typeof configured === 'string' && configured.trim()) {
            return configured.trim();
        }
        const parameter = pattern.parameters.find(candidate => candidate.id === parameterId);
        if (typeof parameter?.defaultValue === 'string') {
            return parameter.defaultValue;
        }
    }
    return 'inherit';
}

function profileLabel(profiles: FlowModelProfile[], profileId: string): string {
    return profiles.find(profile => profile.id === profileId)?.name || profileId || 'inherit';
}

function toFlowLanguageModelOptions(models: readonly LanguageModel[]): FlowLanguageModelOption[] {
    return models
        .map(model => ({
            id: model.id,
            label: languageModelLabel(model),
            status: model.status.status
        }))
        .sort((left, right) => {
            if (left.status !== right.status) {
                return left.status === 'ready' ? -1 : 1;
            }
            return left.label.localeCompare(right.label);
        });
}

function languageModelLabel(model: LanguageModel): string {
    const label = model.name?.trim() || model.id;
    const vendor = model.vendor?.trim();
    const family = model.family?.trim();
    const details = uniqueStrings([vendor, family].filter((detail): detail is string => Boolean(detail)))
        .filter(detail => !label.toLowerCase().includes(detail.toLowerCase()));
    const status = model.status.status === 'ready' ? '' : ` (${model.status.message || 'unavailable'})`;
    return `${label}${details.length ? ` - ${details.join(' / ')}` : ''}${status}`;
}

function modelOptionLabel(models: FlowLanguageModelOption[], modelId: string, emptyLabel: string): string {
    if (!modelId) {
        return emptyLabel;
    }
    const model = models.find(candidate => candidate.id === modelId);
    return model ? model.label : modelId;
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

const AGENT_IDENTITY_LABELS: Record<string, string> = {
    architect: 'Arquitect',
    backend: 'Backend',
    frontend: 'Frontend',
    qa: 'QA',
    security: 'Security',
    reviewer: 'Reviewer'
};

function nodeIdentityLabel(agent: string | undefined): string | undefined {
    const normalized = agent?.trim();
    if (!normalized) {
        return undefined;
    }
    const mapped = AGENT_IDENTITY_LABELS[normalized.toLowerCase()];
    if (mapped) {
        return mapped;
    }
    return normalized
        .replace(/[_-]+/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word.length <= 3 && word === word.toUpperCase()
            ? word
            : `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
        .join(' ');
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
        case 'dynamic_parallel':
            return 'codicon-extensions';
        case 'tournament':
            return 'codicon-symbol-event';
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

function providerSummary(provider?: FlowProviderSelection): string {
    if (!provider?.providerId) {
        return 'default provider / default model';
    }
    return `${provider.providerId} / ${provider.modelId || 'default model'}`;
}

function providerSelectionOrUndefined(providerId: string | undefined, modelId: string | undefined, options?: Record<string, unknown>): FlowProviderSelection | undefined {
    const trimmedProviderId = providerId?.trim();
    const trimmedModelId = modelId?.trim();
    if (!trimmedProviderId && !trimmedModelId && !options) {
        return undefined;
    }
    return compactObject({
        providerId: trimmedProviderId || 'theia-language-model',
        modelId: trimmedModelId,
        options
    });
}

function externalPromptText(options: FlowExternalRunOptions): string | undefined {
    for (const value of [options.prompt, options.message, options.input]) {
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return undefined;
}

function modelExecutionOrUndefined(modelExecution: FlowModelExecutionProfile): FlowModelExecutionProfile | undefined {
    const compacted = compactObject(modelExecution as Record<string, unknown>) as FlowModelExecutionProfile;
    return Object.keys(compacted).length > 0 ? compacted : undefined;
}

function patternRoleOverrideOrUndefined(override: FlowPatternRoleOverride): FlowPatternRoleOverride | undefined {
    const compacted = compactObject(override as Record<string, unknown>) as FlowPatternRoleOverride;
    return isEmptyPatternRoleOverride(compacted) ? undefined : compacted;
}

function patternRoleOverridesOrUndefined(overrides: Record<string, FlowPatternRoleOverride>): Record<string, FlowPatternRoleOverride> | undefined {
    const compacted: Record<string, FlowPatternRoleOverride> = {};
    for (const [roleId, override] of Object.entries(overrides)) {
        const compactOverride = patternRoleOverrideOrUndefined(override);
        if (compactOverride) {
            compacted[roleId] = compactOverride;
        }
    }
    return Object.keys(compacted).length > 0 ? compacted : undefined;
}

function isEmptyPatternRoleOverride(override: FlowPatternRoleOverride): boolean {
    return !override.profileId && !override.provider && !override.modelExecution;
}

function uniqueStrings(values: string[]): string[] {
    return [...new Set(values)];
}

function workflowOutputSourceOptions(workflow: FlowWorkflow): string[] {
    const options: string[] = ['input/request.md'];
    const visit = (state: FlowWorkflow['states'][string]): void => {
        for (const output of state.outputs || []) {
            options.push(output);
        }
        for (const branch of Object.values(state.branches || {})) {
            visit(branch);
        }
    };
    for (const state of Object.values(workflow.states || {})) {
        visit(state);
    }
    return options;
}

export function textToDeliverables(value: string): FlowDeliverable[] | undefined {
    const deliverables = value
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
            const [path, description, kind, required] = line.split('|').map(part => part.trim());
            return compactObject({
                path,
                description,
                kind,
                required: requiredToBoolean(required)
            });
        })
        .filter(deliverable => Boolean(deliverable.path));
    return deliverables.length ? deliverables : undefined;
}

export function deliverablesToText(value?: FlowDeliverable[]): string {
    return (value || []).map(deliverable => [
        deliverable.path,
        deliverable.description,
        deliverable.kind,
        deliverable.required === undefined ? undefined : String(deliverable.required)
    ].filter(entry => entry !== undefined && entry !== '').join(' | ')).join('\n');
}

function requiredToBoolean(value: string | undefined): boolean | undefined {
    if (!value) {
        return undefined;
    }
    const normalized = value.trim().toLowerCase();
    if (['true', 'required', 'yes', 'y', '1'].includes(normalized)) {
        return true;
    }
    if (['false', 'optional', 'no', 'n', '0'].includes(normalized)) {
        return false;
    }
    return undefined;
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
            label: 'Host',
            value: demoModeLabel(capabilities.demoMode),
            tone: capabilities.demoMode === 'off' ? 'available' : 'mock',
            detail: capabilities.deterministicFallback && capabilities.deterministicFallbackReason ? capabilities.deterministicFallbackReason : undefined
        },
        {
            label: 'Modelo',
            value: providerAvailabilityLabel(capabilities.llmAgentProvider),
            tone: providerAvailabilityTone(capabilities.llmAgentProvider)
        },
        {
            label: 'Atualizacao',
            value: capabilities.runEventStream ? 'Tempo real' : 'Manual',
            tone: capabilities.runEventStream ? 'available' : 'mock',
            detail: capabilities.runEventStream
                ? 'Canvas, kanban e eventos acompanham as atualizacoes do kernel.'
                : 'Atualizar ou executar tick manualmente e o fallback sem eventos do kernel.'
        }
    ];

    return <section className='flow__runtime-status' aria-label='Flow runtime status'>
        <div className='flow__runtime-status-grid'>
            {modeRows.map(row => <StatusPill key={row.label} {...row} />)}
            {capabilityRows.map(row => <StatusPill key={row.label} {...row} />)}
        </div>
        {missingRequiredCapabilities.length > 0 && <div className='flow__runtime-status-warning'>
            <strong>Faltando:</strong> {missingRequiredCapabilities.join('; ')}
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
            label: 'Agentes',
            value: capabilityAvailabilityLabel(capabilities.llmAgentExecution),
            tone: capabilityAvailabilityTone(capabilities.llmAgentExecution)
        },
        {
            label: 'Arquivos',
            value: `${capabilityAvailabilityLabel(capabilities.filesystemEdit)} / ${policyAvailabilityLabel(capabilities.filesystemEditPolicy)}`,
            tone: capabilityAndPolicyTone(capabilities.filesystemEdit, capabilities.filesystemEditPolicy)
        },
        {
            label: 'Imagens',
            value: `${capabilityAvailabilityLabel(capabilities.imageGeneration)} / ${providerAvailabilityLabel(capabilities.imageProvider)}`,
            tone: capabilityAndProviderTone(capabilities.imageGeneration, capabilities.imageProvider)
        },
        {
            label: 'Comandos',
            value: `${capabilities.commandExecution ? 'OK' : 'Bloqueado'} / ${policyAvailabilityLabel(capabilities.commandExecutionPolicy)}`,
            tone: capabilities.commandExecution && capabilities.commandExecutionPolicy === 'configured' ? 'available' : 'blocked'
        },
        {
            label: 'Memoria',
            value: capabilities.memoryProvider,
            tone: capabilities.memoryProvider === 'missing' ? 'missing' : 'available'
        },
        {
            label: 'Eventos',
            value: capabilities.runEventStream ? 'Tempo real' : 'Manual',
            tone: capabilities.runEventStream ? 'available' : 'mock'
        }
    ];
}

function demoModeLabel(mode: FlowCapabilities['demoMode']): string {
    switch (mode) {
        case 'demo':
            return 'Demo';
        case 'e2e':
            return 'E2E';
        default:
            return 'Normal';
    }
}

function capabilityAvailabilityLabel(value: FlowCapabilities['llmAgentExecution']): string {
    switch (value) {
        case 'available':
            return 'OK';
        case 'mock':
            return 'Mock';
        case 'blocked':
            return 'Bloqueado';
        default:
            return 'Ausente';
    }
}

function providerAvailabilityLabel(value: FlowCapabilities['llmAgentProvider']): string {
    switch (value) {
        case 'configured':
            return 'Configurado';
        case 'mock':
            return 'Mock';
        default:
            return 'Ausente';
    }
}

function policyAvailabilityLabel(value: FlowCapabilities['filesystemEditPolicy']): string {
    switch (value) {
        case 'configured':
            return 'Permitido';
        case 'blocked':
            return 'Bloqueado';
        case 'missing':
            return 'Ausente';
        default:
            return value;
    }
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
