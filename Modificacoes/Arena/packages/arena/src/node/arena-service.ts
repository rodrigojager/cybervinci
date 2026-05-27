import { inject, injectable } from '@theia/core/shared/inversify';
import { generateUuid, nls } from '@theia/core/lib/common';
import {
    ArenaCandidateLabel,
    ArenaCandidateRun,
    ArenaDispute,
    ArenaDisputeStatus,
    ArenaAgentInput,
    ArenaGenerateAgentCRequest,
    ArenaGeneratedAgent,
    ArenaListAgentsRequest,
    ArenaRefineAgentRequest,
    ArenaRunDuelRequest,
    ArenaRunnerInfo,
    ArenaSaveAgentRequest,
    ArenaSaveArtifactRequest,
    ArenaSavePatchRequest,
    ArenaService
} from '../common';
import { CleanupService } from './cleanup-service';
import { PromptLibraryService } from './prompt-library-service';
import { PromptMergeService } from './prompt-merge-service';
import { ArenaRunnerRegistry } from './runner-registry';
import { WorkspaceSandboxService } from './workspace-sandbox-service';
import { LanguageModelArenaService } from './language-model-arena-service';
import { PromptRefinementService } from './prompt-refinement-service';
import { ArenaRunnerCancellationToken } from './runners/arena-runner';

const REVIEW_TTL_MS = 120 * 60 * 1000;

class ArenaCancellationSource implements ArenaRunnerCancellationToken {
    protected listeners: Array<() => void> = [];
    protected cancelled = false;

    get isCancellationRequested(): boolean {
        return this.cancelled;
    }

    onCancellationRequested(listener: () => void): void {
        if (this.cancelled) {
            listener();
            return;
        }
        this.listeners.push(listener);
    }

    cancel(): void {
        if (this.cancelled) {
            return;
        }
        this.cancelled = true;
        const listeners = [...this.listeners];
        this.listeners = [];
        listeners.forEach(listener => listener());
    }
}

@injectable()
export class ArenaServiceImpl implements ArenaService {

    @inject(PromptLibraryService)
    protected readonly promptLibrary: PromptLibraryService;

    @inject(PromptMergeService)
    protected readonly promptMerge: PromptMergeService;

    @inject(PromptRefinementService)
    protected readonly promptRefinement: PromptRefinementService;

    @inject(LanguageModelArenaService)
    protected readonly languageModelArena: LanguageModelArenaService;

    @inject(ArenaRunnerRegistry)
    protected readonly runnerRegistry: ArenaRunnerRegistry;

    @inject(WorkspaceSandboxService)
    protected readonly sandboxService: WorkspaceSandboxService;

    @inject(CleanupService)
    protected readonly cleanupService: CleanupService;

    protected readonly disputes = new Map<string, ArenaDispute>();
    protected readonly ttlTimers = new Map<string, NodeJS.Timeout>();
    protected readonly runningDisputes = new Map<string, { cancellation: ArenaCancellationSource; promise: Promise<void> }>();

    async listAgents(request: ArenaListAgentsRequest) {
        return this.promptLibrary.listAgents(request.workspaceRootUris);
    }

    async listRunners(): Promise<ArenaRunnerInfo[]> {
        return this.runnerRegistry.listRunners();
    }

    async getDispute(disputeId: string): Promise<ArenaDispute> {
        return this.requireDispute(disputeId);
    }

    async generateAgentC(request: ArenaGenerateAgentCRequest): Promise<ArenaGeneratedAgent> {
        const agentA = await this.resolveAgentInput(request.agentA, request.agentAUri, request.workspaceRootUris, nls.localize('theia/arena/agentA', 'Agent A'));
        const agentB = await this.resolveAgentInput(request.agentB, request.agentBUri, request.workspaceRootUris, nls.localize('theia/arena/agentB', 'Agent B'));
        try {
            return await this.languageModelArena.generateBlindAgentC(
                agentA.content,
                agentB.content,
                request.outputType,
                request.userTask,
                request.contextual,
                { model: request.model, reasoningEffort: request.reasoningEffort }
            );
        } catch {
            // Fall back to deterministic merging when no configured LLM is ready.
        }
        return this.promptMerge.generateBlindAgentC(agentA.content, agentB.content, request.outputType, request.userTask, request.contextual);
    }

    async runDuel(request: ArenaRunDuelRequest): Promise<ArenaDispute> {
        const disputeId = generateUuid();
        const createdAt = new Date().toISOString();
        const agentA = await this.resolveAgentInput(request.agentA, request.agentAUri, request.workspaceRootUris, nls.localize('theia/arena/agentA', 'Agent A'));
        const agentB = await this.resolveAgentInput(request.agentB, request.agentBUri, request.workspaceRootUris, nls.localize('theia/arena/agentB', 'Agent B'));
        const generatedC = request.autoGenerateC
            ? request.generatedAgentCContent
                ? { name: 'agent-c', contentMarkdown: request.generatedAgentCContent, mode: 'generic' as const }
                : await this.generateAgentC({
                    workspaceRootUris: request.workspaceRootUris,
                    agentA: request.agentA,
                    agentB: request.agentB,
                    agentAUri: request.agentAUri,
                    agentBUri: request.agentBUri,
                    outputType: request.outputType,
                    model: request.model,
                    reasoningEffort: request.reasoningEffort,
                    userTask: request.autoGenerateCContextual ? request.userTask : undefined,
                    contextual: request.autoGenerateCContextual
                })
            : undefined;
        const labels: ArenaCandidateLabel[] = generatedC ? ['A', 'B', 'C'] : ['A', 'B'];
        const sandbox = await this.sandboxService.createSandbox(disputeId, labels);
        const dispute: ArenaDispute = {
            id: disputeId,
            title: request.userTask.slice(0, 80) || nls.localize('theia/arena/defaultDuelTitle', 'Arena Duel'),
            userTask: request.userTask,
            outputType: request.outputType,
            runnerId: request.runnerId,
            model: request.model,
            reasoningEffort: request.reasoningEffort,
            status: 'Running',
            autoGenerateC: Boolean(generatedC),
            createdAt,
            candidates: labels.map(label => this.createCandidateRun(
                disputeId,
                label,
                label === 'A' ? agentA.name : label === 'B' ? agentB.name : generatedC?.name ?? nls.localize('theia/arena/agentC', 'Agent C'),
                label === 'A' ? agentA.content : label === 'B' ? agentB.content : generatedC?.contentMarkdown ?? ''
            )),
            generatedAgentC: generatedC,
            sandboxRoot: sandbox.root
        };
        this.disputes.set(disputeId, dispute);
        const cancellation = new ArenaCancellationSource();
        const promise = this.executeDuel(dispute, sandbox, labels, {
            A: agentA.content,
            B: agentB.content,
            C: generatedC?.contentMarkdown ?? ''
        }, request, cancellation);
        this.runningDisputes.set(disputeId, { cancellation, promise });
        promise.finally(() => this.runningDisputes.delete(disputeId));
        return dispute;
    }

    protected async executeDuel(
        dispute: ArenaDispute,
        sandbox: Awaited<ReturnType<WorkspaceSandboxService['createSandbox']>>,
        labels: ArenaCandidateLabel[],
        agentByLabel: Record<ArenaCandidateLabel, string>,
        request: ArenaRunDuelRequest,
        cancellation: ArenaCancellationSource
    ): Promise<void> {
        try {
            const runner = this.runnerRegistry.getRunner(request.runnerId);
            await Promise.all(labels.map(async label => {
                if (cancellation.isCancellationRequested) {
                    throw new Error(nls.localize('theia/arena/disputeCancelled', 'Arena dispute cancelled.'));
                }
                const candidateRoot = sandbox.candidates[label];
                if (!candidateRoot) {
                    throw new Error(nls.localize('theia/arena/missingCandidateSandbox', 'Missing sandbox for candidate {0}', label));
                }
                await this.sandboxService.writeCandidateSnapshot(candidateRoot, agentByLabel[label], request.userTask, request.outputType);
                const result = await runner.run({
                    disputeId: dispute.id,
                    candidateLabel: label,
                    agentMarkdown: agentByLabel[label],
                    userTask: request.userTask,
                    outputType: request.outputType,
                    workspaceRoot: candidateRoot,
                    model: request.model,
                    reasoningEffort: request.reasoningEffort
                }, cancellation);
                await this.sandboxService.persistArtifactFiles(candidateRoot, result.artifact.files);
                this.updateCandidate(dispute, label, result.status, result.artifact, result.logs, result.gitDiff, result.error, result.latencyMs);
            }));
            if (cancellation.isCancellationRequested) {
                await this.markDisputeCancelled(dispute);
                return;
            }
            dispute.status = 'Reviewing';
            dispute.expiresAt = new Date(Date.now() + REVIEW_TTL_MS).toISOString();
            this.scheduleExpiry(dispute.id);
        } catch (error) {
            if (cancellation.isCancellationRequested) {
                await this.markDisputeCancelled(dispute);
                return;
            }
            dispute.status = 'Failed';
            dispute.notes = error instanceof Error ? error.message : String(error);
            dispute.completedAt = new Date().toISOString();
            await this.cleanupService.cleanup(dispute.sandboxRoot);
            dispute.sandboxRoot = undefined;
        }
    }

    async chooseWinner(disputeId: string, winnerLabel: ArenaCandidateLabel): Promise<ArenaDispute> {
        const dispute = this.requireDispute(disputeId);
        if (!dispute.candidates.some(candidate => candidate.label === winnerLabel)) {
            throw new Error(nls.localize('theia/arena/candidateMissingInDispute', 'Candidate {0} does not exist in dispute {1}', winnerLabel, disputeId));
        }
        dispute.winnerLabel = winnerLabel;
        return dispute;
    }

    async cancelDispute(disputeId: string): Promise<ArenaDispute> {
        const dispute = this.requireDispute(disputeId);
        const running = this.runningDisputes.get(disputeId);
        if (running) {
            running.cancellation.cancel();
            await running.promise.catch(() => undefined);
            return this.requireDispute(disputeId);
        }
        await this.markDisputeCancelled(dispute);
        return dispute;
    }

    async refineAgent(request: ArenaRefineAgentRequest): Promise<ArenaGeneratedAgent> {
        const dispute = this.requireDispute(request.disputeId);
        const candidate = dispute.candidates.find(item => item.label === request.winnerLabel);
        if (!candidate?.artifact?.rawOutput) {
            throw new Error(nls.localize('theia/arena/noOutputToRefine', 'Selected candidate does not have output to refine from.'));
        }
        if (!candidate.agentMarkdown) {
            throw new Error(nls.localize('theia/arena/noAgentSnapshotToRefine', 'Selected candidate does not have an agent snapshot to refine.'));
        }
        try {
            return await this.languageModelArena.refineAgent(
                candidate.agentName,
                candidate.agentMarkdown,
                dispute.userTask,
                dispute.outputType,
                candidate.artifact.rawOutput,
                { model: request.model ?? dispute.model, reasoningEffort: request.reasoningEffort ?? dispute.reasoningEffort }
            );
        } catch {
            return this.promptRefinement.refineFromWinner(
                candidate.agentName,
                candidate.agentMarkdown,
                dispute.outputType,
                candidate.artifact.rawOutput
            );
        }
    }

    async saveGeneratedAgent(request: ArenaSaveAgentRequest): Promise<string> {
        return this.promptLibrary.saveAgent(request);
    }

    async saveWinnerArtifact(request: ArenaSaveArtifactRequest): Promise<string> {
        const dispute = this.requireDispute(request.disputeId);
        const winner = dispute.candidates.find(candidate => candidate.label === request.winnerLabel);
        if (!winner?.artifact?.files.length) {
            throw new Error(nls.localize('theia/arena/noArtifactFilesToSave', 'Selected winner does not have artifact files to save.'));
        }
        return this.promptLibrary.saveArtifact(request.workspaceRootUris, request.disputeId, request.winnerLabel, winner.artifact.files);
    }

    async saveWinnerPatch(request: ArenaSavePatchRequest): Promise<string> {
        const dispute = this.requireDispute(request.disputeId);
        const winner = dispute.candidates.find(candidate => candidate.label === request.winnerLabel);
        if (!winner?.gitDiff) {
            throw new Error(nls.localize('theia/arena/noPatchToSave', 'Selected winner does not have a patch/diff to save.'));
        }
        return this.promptLibrary.savePatch(request.workspaceRootUris, request.disputeId, request.winnerLabel, winner.gitDiff);
    }

    async finishDispute(disputeId: string, status: Extract<ArenaDisputeStatus, 'Completed' | 'Cancelled'>): Promise<ArenaDispute> {
        const dispute = this.requireDispute(disputeId);
        const running = this.runningDisputes.get(disputeId);
        if (running) {
            running.cancellation.cancel();
            await running.promise.catch(() => undefined);
        }
        this.clearExpiry(disputeId);
        await this.cleanupService.cleanup(dispute.sandboxRoot);
        dispute.sandboxRoot = undefined;
        dispute.status = status;
        dispute.completedAt = new Date().toISOString();
        return dispute;
    }

    protected async markDisputeCancelled(dispute: ArenaDispute): Promise<void> {
        this.clearExpiry(dispute.id);
        await this.cleanupService.cleanup(dispute.sandboxRoot);
        dispute.sandboxRoot = undefined;
        dispute.status = 'Cancelled';
        dispute.completedAt = new Date().toISOString();
        for (const candidate of dispute.candidates) {
            if (candidate.status === 'running') {
                candidate.status = 'failed';
                candidate.error = nls.localize('theia/arena/disputeCancelled', 'Arena dispute cancelled.');
                candidate.completedAt = new Date().toISOString();
            }
        }
    }

    protected createCandidateRun(disputeId: string, label: ArenaCandidateLabel, agentName: string, agentMarkdown: string): ArenaCandidateRun {
        return {
            id: generateUuid(),
            disputeId,
            label,
            agentName,
            agentMarkdown,
            status: 'running',
            logs: [],
            startedAt: new Date().toISOString()
        };
    }

    protected async resolveAgentInput(
        input: ArenaAgentInput | undefined,
        legacyUri: string | undefined,
        workspaceRootUris: string[],
        fallbackName: string
    ): Promise<{ name: string; content: string }> {
        if (input?.source === 'text') {
            const content = input.contentMarkdown?.trim();
            if (!content) {
                throw new Error(nls.localize('theia/arena/agentTextEmpty', '{0} text is empty.', fallbackName));
            }
            return {
                name: input.name?.trim() || fallbackName,
                content
            };
        }
        const uri = input?.uri || legacyUri;
        if (!uri) {
            throw new Error(nls.localize('theia/arena/agentSelectionRequired', '{0} must be selected from the library or provided as text.', fallbackName));
        }
        return this.promptLibrary.readAgent(uri, workspaceRootUris);
    }

    protected updateCandidate(
        dispute: ArenaDispute,
        label: ArenaCandidateLabel,
        status: ArenaCandidateRun['status'],
        artifact: ArenaCandidateRun['artifact'],
        logs: string[],
        gitDiff: string | undefined,
        error: string | undefined,
        latencyMs: number
    ): void {
        const candidate = dispute.candidates.find(item => item.label === label);
        if (!candidate) {
            return;
        }
        candidate.status = status;
        candidate.artifact = artifact;
        candidate.logs = logs;
        candidate.gitDiff = gitDiff;
        candidate.error = error;
        candidate.latencyMs = latencyMs;
        candidate.completedAt = new Date().toISOString();
    }

    protected scheduleExpiry(disputeId: string): void {
        this.clearExpiry(disputeId);
        this.ttlTimers.set(disputeId, setTimeout(async () => {
            const dispute = this.disputes.get(disputeId);
            if (dispute?.status === 'Reviewing') {
                await this.cleanupService.cleanup(dispute.sandboxRoot);
                dispute.sandboxRoot = undefined;
                dispute.status = 'Expired';
                dispute.completedAt = new Date().toISOString();
            }
        }, REVIEW_TTL_MS));
    }

    protected clearExpiry(disputeId: string): void {
        const timer = this.ttlTimers.get(disputeId);
        if (timer) {
            clearTimeout(timer);
            this.ttlTimers.delete(disputeId);
        }
    }

    protected requireDispute(disputeId: string): ArenaDispute {
        const dispute = this.disputes.get(disputeId);
        if (!dispute) {
            throw new Error(nls.localize('theia/arena/unknownDispute', 'Unknown Arena dispute: {0}', disputeId));
        }
        return dispute;
    }
}
