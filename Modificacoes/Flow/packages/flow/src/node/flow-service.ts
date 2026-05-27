import { inject, injectable, optional } from '@theia/core/shared/inversify';
import { LanguageModelRegistry } from '@theia/ai-core';
import { CodexProviderService } from '@cybervinci/codex-provider/lib/common/codex-provider-service';
import {
    FLOW_CAPABILITIES,
    FlowCreateWorkflowFromTemplateRequest,
    FlowCreateAgentMarkdownRequest,
    FlowAgentMarkdownFile,
    FlowAgentMarkdownRequest,
    FlowAgentMarkdownSummary,
    FlowDuplicateAgentMarkdownRequest,
    FlowExportRunRequest,
    FlowExportWorkflowRequest,
    FlowEffect,
    FlowEffectDecisionRequest,
    FlowRunExportResult,
    FlowWorkloadResultEffect,
    FlowWorkflowExportResult,
    FlowWorkflowVersion,
    FlowWorkflowVersionRequest,
    FlowArtifact,
    FlowGateDecisionRequest,
    FlowImportRunRequest,
    FlowImportWorkflowRequest,
    FlowMemoryWriteRequest,
    FlowRun,
    FlowKernelRunMetadata,
    FlowRunLifecycleRequest,
    FlowRunRequest,
    FlowRunStreamRequest,
    FlowSaveWorkflowRequest,
    FlowRenameAgentMarkdownRequest,
    FlowSecondRunApprovalRequest,
    FlowSecondRunDecisionRequest,
    FlowStartRunRequest,
    FlowClient,
    FlowCapabilities,
    FlowService,
    FlowSnapshot,
    FlowValidationResult,
    FlowWorkflow,
    FlowWorkflowFileRequest,
    FlowWorkflowRequest,
    FlowWorkflowTemplate,
    FlowWorkspaceRequest,
    MemoryCandidate,
    MemoryWrite,
    formatMissingCapabilities,
    listFlowWorkflowTemplates,
    redactFlowRunForDisplay,
    redactFlowSecretsText,
    resolveFlowWorkflowCapabilities,
    validateFlowWorkflow
} from '../common';
import { decideFlowApprovalPolicy, FlowApprovalAction, FlowApprovalPolicyDecision } from '../common/flow-approval-policy';
import { FlowKernelBridge } from './flow-kernel-bridge';
import { AgentMarkdownStore } from './agent-markdown-store';
import { FlowStore } from './flow-store';
import { MarkdownWorkloadStore } from './markdown-workload-store';
import { MemoryAdapter } from './memory-adapter';
import { FileEffectHostAdapter } from './file-effect-host-adapter';
import { ImageEffectHostAdapter } from './image-effect-host-adapter';

interface CodexProviderRuntimeReport {
    available: boolean;
    imageGeneration: boolean;
}

@injectable()
export class FlowServiceImpl implements FlowService {
    protected client?: FlowClient;
    protected readonly runStreams = new Map<string, () => void>();
    protected readonly openingRunStreams = new Set<string>();

    @inject(FlowStore)
    protected readonly store: FlowStore;

    @inject(MarkdownWorkloadStore)
    protected readonly workloadStore: MarkdownWorkloadStore;

    @inject(AgentMarkdownStore)
    protected readonly agentMarkdownStore: AgentMarkdownStore;

    @inject(FlowKernelBridge)
    protected readonly kernelBridge: FlowKernelBridge;

    @inject(MemoryAdapter)
    protected readonly memory: MemoryAdapter;

    @inject(FileEffectHostAdapter) @optional()
    protected readonly fileEffectHostAdapter?: FileEffectHostAdapter;

    @inject(ImageEffectHostAdapter) @optional()
    protected readonly imageEffectHostAdapter?: ImageEffectHostAdapter;

    @inject(LanguageModelRegistry) @optional()
    protected readonly languageModelRegistry?: LanguageModelRegistry;

    @inject(CodexProviderService) @optional()
    protected readonly codexProviderService?: CodexProviderService;

    setClient(client: FlowClient | undefined): void {
        this.client = client;
    }

    dispose(): void {
        for (const dispose of this.runStreams.values()) {
            dispose();
        }
        this.runStreams.clear();
        this.openingRunStreams.clear();
    }

    async getCapabilities(): Promise<FlowCapabilities> {
        return this.getRuntimeCapabilities();
    }

    async getSnapshot(request: FlowWorkspaceRequest): Promise<FlowSnapshot> {
        const workflows = await this.ensureWorkflows(request.workspaceRootUri);
        const runs = await this.store.listRuns(request.workspaceRootUri);
        const activeWorkflow = workflows[0];
        const capabilities = await this.getRuntimeCapabilities();
        const syncedActiveRun = runs[0] ? await this.refreshRunFromKernel(request.workspaceRootUri, runs[0]) : undefined;
        return {
            workflows,
            activeWorkflow,
            activeRun: syncedActiveRun,
            validation: activeWorkflow ? validateFlowWorkflow(activeWorkflow) : undefined,
            capabilities
        };
    }

    async listWorkflows(request: FlowWorkspaceRequest): Promise<FlowWorkflow[]> {
        return this.ensureWorkflows(request.workspaceRootUri);
    }

    async listWorkflowTemplates(): Promise<FlowWorkflowTemplate[]> {
        return listFlowWorkflowTemplates();
    }

    async listAgentMarkdownFiles(request: FlowWorkspaceRequest): Promise<FlowAgentMarkdownSummary[]> {
        return this.agentMarkdownStore.listAgents(request.workspaceRootUri);
    }

    async getAgentMarkdownFile(request: FlowAgentMarkdownRequest): Promise<FlowAgentMarkdownFile> {
        const file = await this.agentMarkdownStore.readAgent(request.workspaceRootUri, request.relativePath, {
            createIfMissing: request.createIfMissing,
            title: request.title
        });
        if (!file) {
            throw new Error(`Agent markdown "${request.relativePath}" was not found.`);
        }
        return file;
    }

    async createAgentMarkdownFile(request: FlowCreateAgentMarkdownRequest): Promise<FlowAgentMarkdownFile> {
        return this.agentMarkdownStore.createAgent(request.workspaceRootUri, request.relativePath, {
            title: request.title,
            content: request.content
        });
    }

    async duplicateAgentMarkdownFile(request: FlowDuplicateAgentMarkdownRequest): Promise<FlowAgentMarkdownFile> {
        return this.agentMarkdownStore.duplicateAgent(request.workspaceRootUri, request.sourceRelativePath, request.targetRelativePath, {
            title: request.title
        });
    }

    async renameAgentMarkdownFile(request: FlowRenameAgentMarkdownRequest): Promise<FlowAgentMarkdownFile> {
        return this.agentMarkdownStore.renameAgent(request.workspaceRootUri, request.sourceRelativePath, request.targetRelativePath);
    }

    async createWorkflowFromTemplate(request: FlowCreateWorkflowFromTemplateRequest): Promise<FlowWorkflow> {
        return this.store.createWorkflowFromTemplate(request.workspaceRootUri, request.templateId, {
            workflowId: request.workflowId,
            name: request.name,
            description: request.description
        });
    }

    async getWorkflow(request: FlowWorkflowRequest): Promise<FlowWorkflow> {
        const workflow = await this.store.getWorkflow(request.workspaceRootUri, request.workflowId);
        if (!workflow) {
            throw new Error(`Workflow "${request.workflowId}" was not found.`);
        }
        return workflow;
    }

    async openWorkflowFile(request: FlowWorkflowFileRequest): Promise<FlowWorkflow> {
        const file = request.fileUri || request.filePath;
        if (file) {
            return this.store.openWorkflowFile(file);
        }
        if (request.workflowId) {
            return this.getWorkflow({ workspaceRootUri: request.workspaceRootUri, workflowId: request.workflowId });
        }
        throw new Error('A workflow file path, URI, or workflow id is required.');
    }

    async importWorkflow(request: FlowImportWorkflowRequest): Promise<FlowWorkflow> {
        const file = request.fileUri || request.filePath;
        if (!file) {
            throw new Error('A workflow export file, URI, or directory is required.');
        }
        const workflow = await this.store.importWorkflow(request.workspaceRootUri, file);
        const validation = validateFlowWorkflow(workflow);
        if (!validation.valid) {
            throw new Error(`Imported workflow "${workflow.id}" is invalid: ${validation.errors.map(error => error.message).join('; ')}`);
        }
        return workflow;
    }

    async exportWorkflow(request: FlowExportWorkflowRequest): Promise<FlowWorkflowExportResult> {
        const workflow = await this.getWorkflow(request);
        return this.store.exportWorkflow(request.workspaceRootUri, workflow, request.targetUri || request.targetPath);
    }

    async exportRun(request: FlowExportRunRequest): Promise<FlowRunExportResult> {
        const run = await this.getRun(request);
        const workflow = run.audit?.workflow || await this.getWorkflow({ ...request, workflowId: run.workflowId });
        return this.store.exportRun(request.workspaceRootUri, workflow, run, request.targetUri || request.targetPath);
    }

    async importRun(request: FlowImportRunRequest): Promise<FlowRun> {
        const file = request.fileUri || request.filePath;
        if (!file) {
            throw new Error('A run export directory, URI, or run.json path is required.');
        }
        const run = await this.store.importRun(request.workspaceRootUri, file);
        this.publishRunUpdate(request.workspaceRootUri, run, 'snapshot');
        return run;
    }

    async reloadWorkflow(request: FlowWorkflowRequest): Promise<FlowWorkflow> {
        return this.getWorkflow(request);
    }

    async saveWorkflow(request: FlowSaveWorkflowRequest): Promise<FlowValidationResult> {
        return this.saveWorkflowFile(request);
    }

    async saveWorkflowFile(request: FlowSaveWorkflowRequest): Promise<FlowValidationResult> {
        const validation = validateFlowWorkflow(request.workflow);
        if (validation.valid) {
            await this.store.saveWorkflow(request.workspaceRootUri, request.workflow, request.fileUri || request.filePath, {
                author: request.author,
                origin: request.origin,
                message: request.message
            });
        }
        return validation;
    }

    async listWorkflowVersions(request: FlowWorkflowRequest): Promise<FlowWorkflowVersion[]> {
        await this.getWorkflow(request);
        return this.store.listWorkflowVersions(request.workspaceRootUri, request.workflowId);
    }

    async restoreWorkflowVersion(request: FlowWorkflowVersionRequest): Promise<FlowWorkflow> {
        const workflow = await this.store.restoreWorkflowVersion(request.workspaceRootUri, request.workflowId, request.versionId, {
            author: request.author,
            message: request.message
        });
        const validation = validateFlowWorkflow(workflow);
        if (!validation.valid) {
            throw new Error(`Restored workflow "${workflow.id}" is invalid: ${validation.errors.map(error => error.message).join('; ')}`);
        }
        return workflow;
    }

    async validateWorkflow(workflow: FlowWorkflow): Promise<FlowValidationResult> {
        return validateFlowWorkflow(workflow);
    }

    async startRun(request: FlowStartRunRequest): Promise<FlowRun> {
        const workflow = await this.getWorkflow(request);
        await this.assertHostCapabilities(workflow);
        const contextPack = await this.memory.buildContextPack(request.workspaceRootUri, workflow);
        const run = await this.kernelBridge.startRun(workflow, request.prompt, contextPack.summary, request.workspaceRootUri);
        run.contextPack = contextPack;
        run.memoryCandidates = await this.memory.collectMemoryCandidates(run);
        const materializedRun = await this.workloadStore.materializeRun(request.workspaceRootUri, workflow, run);
        await this.store.saveRun(request.workspaceRootUri, materializedRun);
        this.publishRunUpdate(request.workspaceRootUri, materializedRun, 'started');
        this.ensureRunStream({ workspaceRootUri: request.workspaceRootUri, runId: materializedRun.id });
        return materializedRun;
    }

    async getRun(request: FlowRunRequest): Promise<FlowRun> {
        const run = await this.store.getRun(request.workspaceRootUri, request.runId);
        if (!run) {
            throw new Error(`Run "${request.runId}" was not found.`);
        }
        return this.refreshRunFromKernel(request.workspaceRootUri, run);
    }

    async tickRun(request: FlowRunRequest): Promise<FlowRun> {
        const run = await this.getRun(request);
        const workflow = await this.getWorkflow({ ...request, workflowId: run.workflowId });
        const updated = await this.kernelBridge.tickRun(workflow, run, request.workspaceRootUri);
        updated.memoryCandidates = mergeMemoryCandidates(updated.memoryCandidates, await this.memory.collectMemoryCandidates(updated));
        const materializedRun = await this.workloadStore.materializeRun(request.workspaceRootUri, workflow, updated);
        await this.store.saveRun(request.workspaceRootUri, materializedRun);
        this.publishRunUpdate(request.workspaceRootUri, materializedRun, 'tick');
        return materializedRun;
    }

    async pauseRun(request: FlowRunLifecycleRequest): Promise<FlowRun> {
        return this.updateRunLifecycle(request, (workflow, run) => this.kernelBridge.pauseRun(workflow, run, request.reason), false);
    }

    async resumeRun(request: FlowRunLifecycleRequest): Promise<FlowRun> {
        return this.updateRunLifecycle(request, (workflow, run) => this.kernelBridge.resumeRun(workflow, run, request.reason), true);
    }

    async cancelRun(request: FlowRunLifecycleRequest): Promise<FlowRun> {
        assertApprovalAllowed('cancel_run', true);
        return this.updateRunLifecycle(request, (workflow, run) => this.kernelBridge.cancelRun(workflow, run, request.reason), false);
    }

    async finalizeRun(request: FlowRunLifecycleRequest): Promise<FlowRun> {
        const run = await this.getRun(request);
        const finalized = await this.attachFinalReport(request.workspaceRootUri, run, request.reason);
        await this.store.saveRun(request.workspaceRootUri, finalized);
        this.publishRunUpdate(request.workspaceRootUri, finalized, 'lifecycle');
        await this.unsubscribeRunEvents(request);
        return finalized;
    }

    async approveGate(request: FlowGateDecisionRequest): Promise<FlowRun> {
        const run = await this.getRun(request);
        const workflow = await this.getWorkflow({ ...request, workflowId: run.workflowId });
        const updated = await this.kernelBridge.approveGate(workflow, run, request);
        updated.memoryCandidates = mergeMemoryCandidates(updated.memoryCandidates, await this.memory.collectMemoryCandidates(updated));
        const materializedRun = await this.workloadStore.materializeRun(request.workspaceRootUri, workflow, updated);
        await this.store.saveRun(request.workspaceRootUri, materializedRun);
        this.publishRunUpdate(request.workspaceRootUri, materializedRun, 'approval');
        this.ensureRunStream({ workspaceRootUri: request.workspaceRootUri, runId: materializedRun.id });
        return materializedRun;
    }

    async decideEffect(request: FlowEffectDecisionRequest): Promise<FlowRun> {
        const run = await this.getRun(request);
        const effect = run.effects.find(item => item.id === request.effectId);
        if (!effect) {
            throw new Error(`Effect "${request.effectId}" was not found in run "${run.id}".`);
        }
        if (effect.status !== 'proposed' && effect.status !== 'approved') {
            throw new Error(`Effect "${request.effectId}" is already ${effect.status}.`);
        }
        if (request.decision === 'rejected') {
            effect.status = 'rejected';
            this.recordEffectDecision(run, effect, 'rejected', request.note, request.approvedBy);
            await this.store.saveRun(request.workspaceRootUri, run);
            this.publishRunUpdate(request.workspaceRootUri, run, 'approval');
            return run;
        }
        const source = findSourceEffect(run, effect);
        if (!source) {
            throw new Error(`Original workload effect payload for "${request.effectId}" was not found.`);
        }
        if (request.decision === 'approved') {
            effect.status = 'approved';
            this.recordEffectDecision(run, effect, 'approved', request.note, request.approvedBy);
        }
        if (request.decision === 'applied') {
            let reason: string | undefined;
            if (isFileEffect(effect)) {
                if (!this.fileEffectHostAdapter) {
                    throw new Error('File effect host adapter is not available.');
                }
                const applied = await this.fileEffectHostAdapter.apply(request.workspaceRootUri, {
                    type: source.type,
                    path: source.path || effect.path || '',
                    content: sourceContent(source),
                    hashBefore: source.hashBefore || effect.hashBefore,
                    approvalPolicy: source.approvalPolicy || effect.approvalPolicy,
                    allowedPaths: source.allowedPaths || effect.allowedPaths,
                    deniedPaths: source.deniedPaths || effect.deniedPaths
                }, true);
                effect.path = applied.relativePath || effect.path;
                effect.hashBefore = applied.hashBefore || effect.hashBefore;
                effect.hashAfter = applied.hashAfter || effect.hashAfter;
                effect.patch = applied.patch || effect.patch;
                effect.approvalPolicy = applied.approvalPolicy || effect.approvalPolicy;
                effect.status = applied.applied ? 'applied' : applied.blocked ? 'blocked' : 'failed';
                effect.stderr = applied.applied ? effect.stderr : applied.reason;
                reason = applied.reason;
            } else if (isImageEffect(effect)) {
                if (!this.imageEffectHostAdapter) {
                    throw new Error('Image effect host adapter is not available.');
                }
                const workload = run.workloads.find(item => item.effectIds.includes(effect.id));
                const applied = await this.imageEffectHostAdapter.apply(request.workspaceRootUri, run.id, workload?.id || effect.stateId, {
                    type: source.type,
                    prompt: source.prompt || effect.prompt,
                    path: source.path || effect.path,
                    artifactPath: source.artifactPath || effect.artifactPath,
                    mimeType: source.mimeType || effect.mimeType,
                    provider: source.provider || effect.provider,
                    summary: source.summary || effect.summary,
                    approvalPolicy: source.approvalPolicy || effect.approvalPolicy
                }, true);
                effect.path = applied.uri || effect.path;
                effect.artifactPath = applied.artifactPath || effect.artifactPath;
                effect.mimeType = applied.mimeType || effect.mimeType;
                effect.provider = applied.provider || effect.provider;
                effect.bytes = applied.bytes || effect.bytes;
                effect.approvalPolicy = applied.approvalPolicy || effect.approvalPolicy;
                effect.stdout = applied.stdout || effect.stdout;
                effect.stderr = applied.applied ? effect.stderr : applied.reason || applied.stderr;
                effect.status = applied.applied ? 'applied' : applied.status === 'blocked' ? 'blocked' : 'failed';
                reason = applied.reason;
            } else {
                throw new Error(`Effect "${request.effectId}" cannot be applied by the effect decision API.`);
            }
            this.recordEffectDecision(run, effect, effect.status, request.note || reason, request.approvedBy);
        }
        run.updatedAt = timestamp();
        await this.store.saveRun(request.workspaceRootUri, run);
        this.publishRunUpdate(request.workspaceRootUri, run, 'approval');
        return run;
    }

    async approveMemoryCandidate(request: FlowMemoryWriteRequest): Promise<FlowRun> {
        const run = await this.getRun(request);
        const candidate = (run.memoryCandidates || []).find(item => item.id === request.candidateId);
        if (!candidate) {
            throw new Error(`Memory candidate "${request.candidateId}" was not found in run "${run.id}".`);
        }
        if (candidate.status === 'rejected' || candidate.status === 'written') {
            throw new Error(`Memory candidate "${request.candidateId}" is already ${candidate.status}.`);
        }
        if (request.content !== undefined) {
            const revisedContent = request.content.trim();
            if (!revisedContent) {
                throw new Error(`Memory candidate "${request.candidateId}" cannot be written with empty content.`);
            }
            candidate.content = revisedContent;
        }
        if (request.decision === 'rejected') {
            candidate.status = 'rejected';
            run.events.push({
                id: stableId('event', run.id, candidate.id, 'rejected'),
                runId: run.id,
                workflowId: run.workflowId,
                type: 'memory_write.rejected',
                timestamp: timestamp(),
                stateId: candidate.stateId,
                message: `Memory candidate "${candidate.id}" rejected.`,
                payload: { candidateId: candidate.id, scope: request.scope || candidate.scope, target: request.target }
            });
            run.updatedAt = timestamp();
            await this.store.saveRun(request.workspaceRootUri, run);
            this.publishRunUpdate(request.workspaceRootUri, run, 'memory');
            return run;
        }
        const approval = assertApprovalAllowed('memory_write', true);
        const approvedAt = timestamp();
        candidate.status = 'approved';
        const approved: MemoryWrite = {
            id: stableId('memory-write', run.id, candidate.id),
            runId: run.id,
            candidateId: candidate.id,
            status: 'approved',
            content: candidate.content,
            approvedAt,
            approvedBy: request.approvedBy,
            scope: request.scope || candidate.scope,
            target: request.target
        };
        run.events.push(memoryWriteEvent(run, candidate, approved, 'approved', approvedAt, approval.policy));
        const written = await this.memory.writeApprovedMemory(approved, request.workspaceRootUri);
        candidate.status = written.status === 'written' ? 'written' : 'approved';
        run.memoryWrites = upsertMemoryWrite(run.memoryWrites, written);
        if (written.status === 'written' || written.status === 'failed') {
            run.events.push(memoryWriteEvent(run, candidate, written, written.status, timestamp(), approval.policy));
        }
        run.updatedAt = timestamp();
        await this.store.saveRun(request.workspaceRootUri, run);
        this.publishRunUpdate(request.workspaceRootUri, run, 'memory');
        return run;
    }

    async approveSecondRunSuggestion(request: FlowSecondRunApprovalRequest): Promise<FlowRun> {
        const sourceRun = await this.getRun(request);
        const suggestion = sourceRun.secondRunSuggestion;
        if (!suggestion || suggestion.id !== request.suggestionId) {
            throw new Error(`Second run suggestion "${request.suggestionId}" was not found in run "${sourceRun.id}".`);
        }
        if (suggestion.status !== 'suggested') {
            throw new Error(`Second run suggestion "${request.suggestionId}" is already ${suggestion.status}.`);
        }
        const approval = assertApprovalAllowed('second_run', true);
        const sourceWorkflow = await this.getWorkflow({ ...request, workflowId: sourceRun.workflowId });
        const now = timestamp();
        const secondWorkflow: FlowWorkflow = {
            ...cloneJson(sourceWorkflow),
            id: stableId('workflow', sourceWorkflow.id, 'second-run', sourceRun.id, now),
            name: `${sourceWorkflow.name} - segunda run`,
            description: [
                sourceWorkflow.description,
                `Second run approved from ${sourceRun.id} at ${now}.`
            ].filter(Boolean).join('\n\n'),
            file: undefined
        };
        await this.store.saveWorkflow(request.workspaceRootUri, secondWorkflow);
        const savedWorkflow = await this.getWorkflow({ workspaceRootUri: request.workspaceRootUri, workflowId: secondWorkflow.id });
        const contextPack = await this.memory.buildContextPack(request.workspaceRootUri, savedWorkflow);
        const prompt = renderSecondRunPrompt(sourceRun, suggestion);
        const newRun = await this.kernelBridge.startRun(savedWorkflow, prompt, contextPack.summary, request.workspaceRootUri);
        newRun.contextPack = appendSecondRunContext(contextPack, sourceRun, suggestion);
        newRun.memoryCandidates = await this.memory.collectMemoryCandidates(newRun);
        newRun.events.push({
            id: stableId('event', newRun.id, 'second-run-approved', sourceRun.id),
            runId: newRun.id,
            workflowId: newRun.workflowId,
            type: 'second_run.approved',
            timestamp: now,
            message: `Second run approved from source run "${sourceRun.id}".`,
            payload: {
                sourceRunId: sourceRun.id,
                sourceWorkflowId: sourceRun.workflowId,
                suggestionId: suggestion.id,
                sourceIssueCount: suggestion.issues.length,
                approvedBy: request.approvedBy,
                approvalPolicy: approval.policy
            }
        });
        const materializedRun = await this.workloadStore.materializeRun(request.workspaceRootUri, savedWorkflow, newRun);
        await this.store.saveRun(request.workspaceRootUri, materializedRun);

        sourceRun.secondRunSuggestion = {
            ...suggestion,
            status: 'accepted',
            approvedRunId: materializedRun.id,
            approvedWorkflowId: savedWorkflow.id,
            approvedAt: now
        };
        sourceRun.events.push({
            id: stableId('event', sourceRun.id, 'second-run-approved', materializedRun.id),
            runId: sourceRun.id,
            workflowId: sourceRun.workflowId,
            type: 'second_run.approved',
            timestamp: now,
            message: `Second run "${materializedRun.id}" approved from suggestion "${suggestion.id}".`,
            payload: {
                suggestionId: suggestion.id,
                approvedRunId: materializedRun.id,
                approvedWorkflowId: savedWorkflow.id,
                approvedBy: request.approvedBy,
                approvalPolicy: approval.policy
            }
        });
        sourceRun.updatedAt = now;
        await this.store.saveRun(request.workspaceRootUri, sourceRun);
        this.publishRunUpdate(request.workspaceRootUri, sourceRun, 'approval');
        this.publishRunUpdate(request.workspaceRootUri, materializedRun, 'started');
        this.ensureRunStream({ workspaceRootUri: request.workspaceRootUri, runId: materializedRun.id });
        return materializedRun;
    }

    async decideSecondRunSuggestion(request: FlowSecondRunDecisionRequest): Promise<FlowRun> {
        if (request.decision === 'approved') {
            return this.approveSecondRunSuggestion(request);
        }
        const sourceRun = await this.getRun(request);
        const suggestion = sourceRun.secondRunSuggestion;
        if (!suggestion || suggestion.id !== request.suggestionId) {
            throw new Error(`Second run suggestion "${request.suggestionId}" was not found in run "${sourceRun.id}".`);
        }
        if (suggestion.status !== 'suggested') {
            throw new Error(`Second run suggestion "${request.suggestionId}" is already ${suggestion.status}.`);
        }
        const now = timestamp();
        sourceRun.secondRunSuggestion = {
            ...suggestion,
            status: 'dismissed',
            approvedAt: now
        };
        sourceRun.events.push({
            id: stableId('event', sourceRun.id, 'second-run-dismissed', suggestion.id),
            runId: sourceRun.id,
            workflowId: sourceRun.workflowId,
            type: 'second_run.dismissed',
            timestamp: now,
            message: `Second run suggestion "${suggestion.id}" dismissed.`,
            payload: {
                suggestionId: suggestion.id,
                status: 'dismissed',
                approvedBy: request.approvedBy,
                note: request.note
            }
        });
        sourceRun.updatedAt = now;
        await this.store.saveRun(request.workspaceRootUri, sourceRun);
        this.publishRunUpdate(request.workspaceRootUri, sourceRun, 'approval');
        return sourceRun;
    }

    async subscribeRunEvents(request: FlowRunStreamRequest): Promise<FlowRun> {
        const run = await this.getRun(request);
        this.publishRunUpdate(request.workspaceRootUri, run, 'snapshot');
        this.ensureRunStream(request);
        return run;
    }

    async unsubscribeRunEvents(request: FlowRunRequest): Promise<void> {
        const key = streamKey(request.workspaceRootUri, request.runId);
        const dispose = this.runStreams.get(key);
        if (dispose) {
            dispose();
            this.runStreams.delete(key);
        }
        this.openingRunStreams.delete(key);
    }

    protected async updateRunLifecycle(
        request: FlowRunLifecycleRequest,
        update: (workflow: FlowWorkflow, run: FlowRun) => Promise<FlowRun>,
        streamAfterUpdate: boolean
    ): Promise<FlowRun> {
        const run = await this.getRun(request);
        const workflow = await this.getWorkflow({ ...request, workflowId: run.workflowId });
        const updated = await update(workflow, run);
        updated.memoryCandidates = mergeMemoryCandidates(updated.memoryCandidates, await this.memory.collectMemoryCandidates(updated));
        const materializedRun = await this.workloadStore.materializeRun(request.workspaceRootUri, workflow, updated);
        await this.store.saveRun(request.workspaceRootUri, materializedRun);
        this.publishRunUpdate(request.workspaceRootUri, materializedRun, 'lifecycle');
        if (streamAfterUpdate && !isTerminalRun(materializedRun)) {
            this.ensureRunStream({ workspaceRootUri: request.workspaceRootUri, runId: materializedRun.id });
        } else {
            await this.unsubscribeRunEvents(request);
        }
        return materializedRun;
    }

    protected async attachFinalReport(workspaceRootUri: string | undefined, run: FlowRun, note?: string): Promise<FlowRun> {
        const now = timestamp();
        const content = renderFinalReport(run, note);
        const reportUri = await this.store.writeRunReport(workspaceRootUri, run.id, 'report.md', content);
        const report: FlowArtifact = {
            id: stableId('artifact', run.id, 'final-report'),
            runId: run.id,
            stateId: 'final_report',
            uri: reportUri,
            kind: 'report',
            summary: `Final report for run ${run.id}.`,
            createdAt: now
        };
        if (!run.artifacts.some(artifact => artifact.id === report.id || artifact.uri === report.uri)) {
            run.artifacts = [...run.artifacts, report];
        }
        run.events.push({
            id: stableId('event', run.id, 'final-report', now),
            runId: run.id,
            workflowId: run.workflowId,
            type: run.status === 'completed' ? 'run.completed' : run.status === 'cancelled' ? 'run.cancelled' : 'run.failed',
            timestamp: now,
            stateId: 'final_report',
            message: note || `Run finalized with ${run.artifacts.length} artifacts, ${run.effects.length} effects, and ${run.events.length} events.`,
            payload: {
                reportUri: report.uri,
                artifactCount: run.artifacts.length,
                effectCount: run.effects.length,
                issueCount: run.workloads.reduce((count, workload) => count + workload.issues.length, 0)
            }
        });
        run.updatedAt = now;
        return run;
    }

    protected async ensureWorkflows(workspaceRootUri?: string): Promise<FlowWorkflow[]> {
        const workflows = await this.store.listWorkflows(workspaceRootUri);
        if (workflows.length > 0) {
            return workflows;
        }
        const sample = createSampleWorkflow();
        await this.store.saveWorkflow(workspaceRootUri, sample);
        return [await this.getWorkflow({ workspaceRootUri, workflowId: sample.id })];
    }

    protected async getRuntimeCapabilities(): Promise<FlowCapabilities> {
        const runtimeKernelBridge = await this.resolveKernelBridgeMode();
        const runEventStream = runtimeKernelBridge === 'external' && await this.resolveRunEventStreamCapability();
        const memoryReport = await this.resolveMemoryReport();
        const codexProvider = await this.resolveCodexProviderRuntimeReport();
        const llmProvider = await this.resolveLlmAgentProvider(codexProvider);
        const filesystemEdit = this.resolveFilesystemEditCapability();
        const imageProviderConfigured = this.hasConfiguredImageProvider() || codexProvider.imageGeneration;
        const commandPolicyConfigured = this.hasConfiguredCommandPolicy();
        return {
            ...FLOW_CAPABILITIES,
            runEventStream,
            llmAgentExecution: llmProvider.llmAgentExecution,
            llmAgentProvider: llmProvider.llmAgentProvider,
            filesystemEdit: filesystemEdit.available ? 'available' : 'blocked',
            filesystemEditPolicy: filesystemEdit.available ? 'configured' : 'missing',
            imageGeneration: imageProviderConfigured ? 'available' : 'unavailable',
            imageProvider: imageProviderConfigured ? 'configured' : 'missing',
            commandExecution: commandPolicyConfigured,
            commandExecutionPolicy: commandPolicyConfigured ? 'configured' : 'blocked',
            memoryAdapter: memoryReport.available,
            memoryProvider: memoryReport.provider,
            demoMode: llmProvider.demoMode,
            kernelBridge: runtimeKernelBridge,
            deterministicFallback: runtimeKernelBridge !== 'external',
            deterministicFallbackReason: runtimeKernelBridge === 'external'
                ? undefined
                : FLOW_CAPABILITIES.deterministicFallbackReason
        };
    }

    protected async resolveRunEventStreamCapability(): Promise<boolean> {
        try {
            return await this.kernelBridge.supportsRunEventStream?.() === true;
        } catch {
            return false;
        }
    }

    protected async resolveLlmAgentProvider(codexProvider: CodexProviderRuntimeReport = { available: false, imageGeneration: false }): Promise<Pick<FlowCapabilities, 'llmAgentExecution' | 'llmAgentProvider' | 'demoMode'>> {
        const provider = (process.env.FLOW_AGENT_PROVIDER || 'auto').trim().toLowerCase();
        if (provider === 'e2e-mock' || provider === 'mock-llm' || provider === 'mock-llm-provider') {
            return { llmAgentExecution: 'mock', llmAgentProvider: 'mock', demoMode: 'e2e' };
        }
        if (provider === 'none' || provider === 'simulate' || provider === 'mock' || provider === 'off') {
            return { llmAgentExecution: 'unavailable', llmAgentProvider: 'missing', demoMode: provider === 'mock' ? 'demo' : 'off' };
        }
        if (this.hasConfiguredAgentCommandProvider()) {
            return { llmAgentExecution: 'available', llmAgentProvider: 'configured', demoMode: 'off' };
        }
        if (provider === 'command' || provider === 'provider' || provider === 'cli') {
            return { llmAgentExecution: 'unavailable', llmAgentProvider: 'missing', demoMode: 'off' };
        }
        if ((provider === 'auto' || provider === 'codex' || provider === 'codex-provider' || provider === 'codex_cli') && codexProvider.available) {
            return { llmAgentExecution: 'available', llmAgentProvider: 'configured', demoMode: 'off' };
        }
        if (await this.hasConfiguredTheiaLanguageModel(provider)) {
            return { llmAgentExecution: 'available', llmAgentProvider: 'configured', demoMode: 'off' };
        }
        return { llmAgentExecution: 'unavailable', llmAgentProvider: 'missing', demoMode: 'off' };
    }

    protected async resolveCodexProviderRuntimeReport(): Promise<CodexProviderRuntimeReport> {
        if (!this.codexProviderService) {
            return { available: false, imageGeneration: false };
        }
        try {
            const status = await this.codexProviderService.getStatus({ cwd: process.cwd() });
            const available = status.available && status.authenticated !== false;
            return {
                available,
                imageGeneration: available && status.capabilities?.imageGeneration === true
            };
        } catch {
            return { available: false, imageGeneration: false };
        }
    }

    protected hasConfiguredAgentCommandProvider(): boolean {
        return Boolean((process.env.FLOW_AGENT_LLM_COMMAND || process.env.FLOW_AGENT_COMMAND || '').trim());
    }

    protected async hasConfiguredTheiaLanguageModel(provider: string): Promise<boolean> {
        if (!this.languageModelRegistry || provider === 'command' || provider === 'provider' || provider === 'cli') {
            return false;
        }
        try {
            if (process.env.FLOW_AGENT_MODEL_ID || process.env.FLOW_AGENT_LLM_MODEL_ID) {
                const modelId = (process.env.FLOW_AGENT_MODEL_ID || process.env.FLOW_AGENT_LLM_MODEL_ID || '').trim();
                return Boolean(modelId && await this.languageModelRegistry.getLanguageModel(modelId));
            }
            const models = await this.languageModelRegistry.getLanguageModels();
            return models.length > 0;
        } catch {
            return false;
        }
    }

    protected resolveFilesystemEditCapability(): { available: boolean } {
        return { available: Boolean(this.fileEffectHostAdapter) && !this.isDisabledEnv('FLOW_FILE_EFFECTS') };
    }

    protected hasConfiguredImageProvider(): boolean {
        if (Boolean((process.env.FLOW_IMAGE_PROVIDER_COMMAND || '').trim())) {
            return true;
        }
        return Object.keys(process.env).some(key => /^FLOW_IMAGE_PROVIDER_[A-Z0-9_]+_COMMAND$/.test(key)
            && Boolean(process.env[key]?.trim()));
    }

    protected hasConfiguredCommandPolicy(): boolean {
        return parseConfiguredCommandAllowlist().length > 0;
    }

    protected isDisabledEnv(name: string): boolean {
        const value = process.env[name]?.trim().toLowerCase();
        return value === '0' || value === 'false' || value === 'off' || value === 'disabled';
    }

    protected async resolveKernelBridgeMode(): Promise<'external' | 'simulated'> {
        try {
            return await this.kernelBridge.getBridgeMode();
        } catch {
            return 'simulated';
        }
    }

    protected async resolveMemoryReport(): Promise<Awaited<ReturnType<MemoryAdapter['report']>>> {
        try {
            return await this.memory.report();
        } catch {
            return {
                provider: 'missing',
                available: false,
                missingService: 'Memory adapter report failed.'
            };
        }
    }

    protected async refreshRunFromKernel(workspaceRootUri: string | undefined, run: FlowRun): Promise<FlowRun> {
        if (run.audit?.readOnly) {
            return run;
        }
        if (!this.isKernelBackedRun(run)) {
            return run;
        }
        try {
            const workflow = await this.getWorkflow({ workspaceRootUri, workflowId: run.workflowId });
            const refreshed = await this.kernelBridge.refreshRun(workflow, run);
            if (!refreshed.file && run.file) {
                refreshed.file = run.file;
            }
            await this.store.saveRun(workspaceRootUri, refreshed);
            return refreshed;
        } catch {
            const metadata = this.legacyKernelMetadata(run);
            if (metadata && !run.externalKernelMetadata) {
                run.externalKernelMetadata = metadata;
                await this.store.saveRun(workspaceRootUri, run);
            }
            return run;
        }
    }

    protected legacyKernelMetadata(run: FlowRun): FlowKernelRunMetadata | undefined {
        for (const event of run.events) {
            const kernel = event.payload?.kernel as FlowKernelRunMetadata | undefined;
            if (kernel?.kernelRunId && kernel.storeDir) {
                return {
                    kernelRunId: kernel.kernelRunId,
                    storeDir: kernel.storeDir,
                    workflowFile: kernel.workflowFile,
                    projectSummary: kernel.projectSummary
                };
            }
        }
        return undefined;
    }

    protected isKernelBackedRun(run: FlowRun): boolean {
        if (run.executionMode === 'kernel_external') {
            return true;
        }
        if (run.externalKernelMetadata?.kernelRunId && run.externalKernelMetadata.storeDir) {
            return true;
        }
        const metadata = this.legacyKernelMetadata(run);
        if (!metadata) {
            return false;
        }
        run.externalKernelMetadata = metadata;
        return true;
    }

    protected ensureRunStream(request: FlowRunStreamRequest): void {
        const key = streamKey(request.workspaceRootUri, request.runId);
        if (this.runStreams.has(key) || this.openingRunStreams.has(key)) {
            return;
        }
        this.openingRunStreams.add(key);
        this.openRunStream(request).catch(error => {
            this.client?.onRunStreamError({
                workspaceRootUri: request.workspaceRootUri,
                runId: request.runId,
                message: error instanceof Error ? error.message : String(error)
            });
        }).finally(() => {
            this.openingRunStreams.delete(key);
        });
    }

    protected async openRunStream(request: FlowRunStreamRequest): Promise<void> {
        const key = streamKey(request.workspaceRootUri, request.runId);
        const run = await this.getRun(request);
        if (isTerminalRun(run)) {
            this.publishRunUpdate(request.workspaceRootUri, run, 'snapshot');
            return;
        }
        const workflow = await this.getWorkflow({ ...request, workflowId: run.workflowId });
        const dispose = await this.kernelBridge.subscribeRunEvents?.(workflow, run, request.workspaceRootUri, async updated => {
            try {
                updated.memoryCandidates = mergeMemoryCandidates(updated.memoryCandidates, await this.memory.collectMemoryCandidates(updated));
                const materializedRun = await this.workloadStore.materializeRun(request.workspaceRootUri, workflow, updated);
                await this.store.saveRun(request.workspaceRootUri, materializedRun);
                this.publishRunUpdate(request.workspaceRootUri, materializedRun, 'stream');
                if (isTerminalRun(materializedRun)) {
                    await this.unsubscribeRunEvents(request);
                }
            } catch (error) {
                this.client?.onRunStreamError({
                    workspaceRootUri: request.workspaceRootUri,
                    runId: request.runId,
                    message: error instanceof Error ? error.message : String(error)
                });
            }
        }, error => {
            this.client?.onRunStreamError({
                workspaceRootUri: request.workspaceRootUri,
                runId: request.runId,
                message: error.message
            });
        });
        if (!dispose) {
            this.publishRunUpdate(request.workspaceRootUri, run, 'snapshot');
            return;
        }
        this.runStreams.set(key, dispose);
        this.publishRunUpdate(request.workspaceRootUri, run, 'snapshot');
    }

    protected publishRunUpdate(workspaceRootUri: string | undefined, run: FlowRun, reason: Parameters<FlowClient['onRunUpdated']>[0]['reason']): void {
        this.client?.onRunUpdated({ workspaceRootUri, run: redactFlowRunForDisplay(run), reason });
    }

    protected recordEffectDecision(run: FlowRun, effect: FlowEffect, status: FlowEffect['status'], note?: string, approvedBy?: string): void {
        const workload = run.workloads.find(item => item.effectIds.includes(effect.id));
        const now = timestamp();
        const artifactId = stableId('artifact', run.id, workload?.id || effect.stateId, effect.id, status);
        const artifactUri = effect.kind === 'image' && status === 'applied' && effect.path
            ? effect.path
            : `flow://${run.id}/${effect.stateId}/effects/${effect.id}-${status}.${effect.kind === 'file' || effect.kind === 'file_write' ? 'diff' : 'json'}`;
        run.artifacts = upsertRunArtifact(run.artifacts, {
            id: artifactId,
            runId: run.id,
            stateId: effect.stateId,
            uri: artifactUri,
            kind: effect.kind === 'file' || effect.kind === 'file_write' ? 'patch' : 'other',
            summary: `${effect.kind === 'image' ? 'Image effect' : 'Effect'} ${status}: ${effect.artifactPath || effect.path || effect.summary}`,
            createdAt: now
        });
        if (workload) {
            workload.outputArtifacts = addUniqueCopy(workload.outputArtifacts, artifactUri);
        }
        run.events.push({
            id: stableId('event', run.id, effect.id, status, String(run.events.length)),
            runId: run.id,
            workflowId: run.workflowId,
            type: `effect.${status}`,
            timestamp: now,
            stateId: effect.stateId,
            workloadId: workload?.id,
            message: `Effect ${status} for "${effect.path || effect.stateId}".`,
            payload: {
                effectId: effect.id,
                effectType: effect.type,
                status,
                path: effect.path,
                artifactId,
                artifactUri,
                artifactPath: effect.artifactPath,
                mimeType: effect.mimeType,
                bytes: effect.bytes,
                provider: effect.provider,
                hashBefore: effect.hashBefore,
                hashAfter: effect.hashAfter,
                patch: effect.patch,
                approvalPolicy: effect.approvalPolicy,
                approvedBy,
                note
            }
        });
        run.updatedAt = now;
    }

    protected async assertHostCapabilities(workflow: FlowWorkflow): Promise<void> {
        const capabilities = await this.getRuntimeCapabilities();
        const resolution = resolveFlowWorkflowCapabilities(workflow, capabilities);
        if (resolution.missing.length > 0) {
            throw new Error(formatMissingCapabilities(resolution.missing, {
                workflow,
                host: `CyberVinci (${capabilities.kernelBridge} kernel bridge)`,
                executionMode: [
                    `kernel_${capabilities.kernelBridge}`,
                    `demo=${capabilities.demoMode}`,
                    `deterministicFallback=${capabilities.deterministicFallback ? 'on' : 'off'}`
                ].join('; ')
            }));
        }
    }
}

function mergeMemoryCandidates(existing: MemoryCandidate[] = [], collected: MemoryCandidate[] = []): MemoryCandidate[] {
    const byId = new Map(existing.map(candidate => [candidate.id, candidate]));
    for (const candidate of collected) {
        if (!byId.has(candidate.id)) {
            byId.set(candidate.id, candidate);
        }
    }
    return [...byId.values()];
}

function isFileEffect(effect: FlowEffect): boolean {
    return effect.kind === 'file' || effect.kind === 'file_write' || effect.type === 'file.created' || effect.type === 'file.edited' || effect.type === 'file.deleted';
}

function isImageEffect(effect: FlowEffect): boolean {
    return effect.kind === 'image' || effect.type === 'image.generate' || effect.type === 'image.generated' || effect.type === 'image';
}

function findSourceEffect(run: FlowRun, effect: FlowEffect): FlowWorkloadResultEffect | undefined {
    const workload = run.workloads.find(item => item.effectIds.includes(effect.id));
    if (!workload?.outputEnvelope?.effects) {
        return undefined;
    }
    return workload.outputEnvelope.effects.find(candidate => {
        const candidatePath = candidate.path || '';
        return candidate.type === effect.type
            && candidatePath === (effect.path || candidatePath)
            && (candidate.summary || '') === (effect.summary || candidate.summary || '');
    }) || workload.outputEnvelope.effects.find(candidate => candidate.type === effect.type && (candidate.path || '') === (effect.path || ''));
}

function sourceContent(effect: FlowWorkloadResultEffect): string | undefined {
    return effect.content;
}

function parseConfiguredCommandAllowlist(): string[] {
    const raw = (process.env.FLOW_COMMAND_ALLOWLIST || process.env.FLOW_ALLOWED_COMMANDS || '').trim();
    if (!raw) {
        return [];
    }
    if (raw.startsWith('[')) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.map(String).map(item => item.trim()).filter(Boolean);
            }
        } catch {
            return [];
        }
    }
    return raw.split(/[,;\n]/).map(item => item.trim()).filter(Boolean);
}

function upsertRunArtifact(artifacts: FlowArtifact[], artifact: FlowArtifact): FlowArtifact[] {
    const index = artifacts.findIndex(item => item.id === artifact.id);
    if (index === -1) {
        return [...artifacts, artifact];
    }
    const next = [...artifacts];
    next[index] = artifact;
    return next;
}

function addUniqueCopy(values: string[], value: string): string[] {
    return values.includes(value) ? values : [...values, value];
}

function upsertMemoryWrite(existing: MemoryWrite[] = [], write: MemoryWrite): MemoryWrite[] {
    const byId = new Map(existing.map(item => [item.id, item]));
    byId.set(write.id, write);
    return [...byId.values()];
}

function memoryWriteEvent(
    run: FlowRun,
    candidate: MemoryCandidate,
    memoryWrite: MemoryWrite,
    status: MemoryWrite['status'],
    eventTimestamp: string,
    approvalPolicy?: string
): FlowRun['events'][number] {
    const messages: Record<MemoryWrite['status'], string> = {
        approved: `Memory candidate "${candidate.id}" approved for explicit write.`,
        written: `Memory candidate "${candidate.id}" written to Memory memory.`,
        failed: `Memory candidate "${candidate.id}" could not be written.`
    };
    return {
        id: stableId('event', run.id, memoryWrite.id, status),
        runId: run.id,
        workflowId: run.workflowId,
        type: `memory_write.${status}`,
        timestamp: eventTimestamp,
        stateId: candidate.stateId,
        message: messages[status],
        payload: {
            candidateId: candidate.id,
            memoryWriteId: memoryWrite.id,
            scope: memoryWrite.scope,
            target: memoryWrite.target,
            status,
            error: memoryWrite.error,
            approvalPolicy,
            memoryWrite
        }
    };
}

function assertApprovalAllowed(action: FlowApprovalAction, approved: boolean): FlowApprovalPolicyDecision {
    const decision = decideFlowApprovalPolicy({ action, approved });
    if (decision.blocked || !decision.approved) {
        throw new Error(decision.message || `Approval required for ${action}.`);
    }
    return decision;
}

function streamKey(workspaceRootUri: string | undefined, runId: string): string {
    return `${workspaceRootUri || ''}::${runId}`;
}

function isTerminalRun(run: FlowRun): boolean {
    return run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled';
}

function renderFinalReport(run: FlowRun, note?: string): string {
    const redactedRun = redactFlowRunForDisplay(run);
    const issueCount = run.workloads.reduce((count, workload) => count + workload.issues.length, 0);
    return redactFlowSecretsText([
        `# Flow Final Report`,
        '',
        `Run: ${redactedRun.id}`,
        `Workflow: ${redactedRun.workflowId}`,
        `Status: ${redactedRun.status}`,
        `Updated: ${redactedRun.updatedAt}`,
        note ? `Note: ${note}` : undefined,
        '',
        '## Summary',
        '',
        `- Artifacts: ${run.artifacts.length}`,
        `- Effects: ${run.effects.length}`,
        `- Issues: ${issueCount}`,
        `- Events: ${run.events.length}`,
        '',
        '## Artifacts',
        '',
        ...(redactedRun.artifacts.length ? redactedRun.artifacts.map(artifact => `- ${artifact.kind}: ${artifact.summary || artifact.uri}`) : ['- None']),
        '',
        '## Effects',
        '',
        ...(redactedRun.effects.length ? redactedRun.effects.map(effect => `- ${effect.kind}/${effect.status}: ${effect.summary}`) : ['- None'])
    ].filter((line): line is string => line !== undefined).join('\n')) || '';
}

function renderSecondRunPrompt(sourceRun: FlowRun, suggestion: NonNullable<FlowRun['secondRunSuggestion']>): string {
    const issueLines = suggestion.issues.length
        ? suggestion.issues.map((issue, index) => [
            `${index + 1}. ${issue.severity} / ${issue.type}: ${issue.summary}`,
            issue.impact ? `   Impact: ${issue.impact}` : undefined,
            issue.suggestedFollowup ? `   Follow-up: ${issue.suggestedFollowup}` : undefined
        ].filter(Boolean).join('\n'))
        : ['No source issues were attached.'];
    return redactFlowSecretsText([
        suggestion.prompt,
        '',
        '## Source Run Context',
        '',
        `Source run: ${sourceRun.id}`,
        `Source workflow: ${sourceRun.workflowId}`,
        `Source status: ${sourceRun.status}`,
        `Source prompt: ${sourceRun.prompt}`,
        '',
        '## Relevant Issues',
        '',
        ...issueLines
    ].join('\n')) || '';
}

function appendSecondRunContext(
    contextPack: NonNullable<FlowRun['contextPack']>,
    sourceRun: FlowRun,
    suggestion: NonNullable<FlowRun['secondRunSuggestion']>
): NonNullable<FlowRun['contextPack']> {
    return {
        ...contextPack,
        sections: [
            ...(contextPack.sections || []),
            {
                id: 'second_run_source',
                title: 'Second Run Source',
                items: [
                    {
                        title: `Source run ${sourceRun.id}`,
                        content: redactFlowSecretsText(`Workflow ${sourceRun.workflowId}; status ${sourceRun.status}; prompt: ${sourceRun.prompt}`) || '',
                        source: 'flow.second-run'
                    },
                    ...suggestion.issues.map((issue, index) => ({
                        title: `${issue.severity} / ${issue.type}`,
                        content: [issue.summary, issue.impact, issue.suggestedFollowup].filter(Boolean).join('\n'),
                        source: `flow.second-run.issue.${index + 1}`
                    }))
                ]
            }
        ],
        signals: [
            ...contextPack.signals,
            { key: 'second_run.source_run_id', value: sourceRun.id },
            { key: 'second_run.source_issue_count', value: suggestion.issues.length }
        ]
    };
}

function cloneJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function stableId(prefix: string, ...parts: string[]): string {
    return `${prefix}-${parts.join('-').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

function timestamp(): string {
    return new Date().toISOString();
}

function createSampleWorkflow(): FlowWorkflow {
    return {
        version: 'flow.workflow/v1',
        id: 'flow_studio_sample',
        name: 'Flow Sample',
        description: 'A removable UI sample workflow with a human approval gate.',
        agents: {
            architect: 'agents/solution-architect.md',
            frontend: 'agents/frontend-specialist.md',
            qa: 'agents/qa-specialist.md'
        },
        states: {
            intake: {
                type: 'input',
                outputs: ['request.md']
            },
            architecture: {
                type: 'agent',
                agent: 'architect',
                input: { include: ['request.md'] },
                outputs: ['architecture/plan.md']
            },
            frontend_work: {
                type: 'agent',
                agent: 'frontend',
                input: { include: ['architecture/plan.md'] },
                outputs: ['ui/implementation-notes.md'],
                gates: [{
                    id: 'frontend_review_gate',
                    title: 'Review frontend plan',
                    prompt: 'Approve the simulated frontend workload before QA starts.'
                }]
            },
            qa: {
                type: 'agent',
                agent: 'qa',
                outputs: ['qa/report.md']
            },
            final_report: {
                type: 'report',
                outputs: ['final/report.md']
            }
        },
        transitions: [
            { from: 'intake', to: 'architecture', on: 'run.started' },
            { from: 'architecture', to: 'frontend_work', on: 'workload.completed', guard: { 'artifact.exists': 'architecture/plan.md' } },
            { from: 'frontend_work', to: 'qa', on: 'gate.approved' },
            { from: 'qa', to: 'final_report', on: 'workload.completed', guard: { 'signal.equals': { key: 'qa.status', value: 'passed' } } }
        ]
    };
}
