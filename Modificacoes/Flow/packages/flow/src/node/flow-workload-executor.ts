import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { generateUuid } from '@theia/core/lib/common';
import { getTextOfResponse, LanguageModel, LanguageModelRegistry, LanguageModelService, UserRequest } from '@theia/ai-core';
import { CodexProviderService } from '@cybervinci/ai-providers/lib/common/ai-providers-service';
import { ReasoningStage, VirtualReasoningEngine, VirtualReasoningMode } from '@cybervinci/ai-providers/lib/common/virtual-reasoning';
import * as Ajv from '@theia/core/shared/ajv';
import { inject, injectable, optional } from '@theia/core/shared/inversify';
import {
    FlowArtifact,
    FlowContextPack,
    FlowContextSectionItem,
    FlowEffect,
    FlowEvent,
    FlowRun,
    FlowWorkloadOutputArtifact,
    FlowWorkloadOutputEnvelope,
    FlowWorkloadResultEffect,
    MemoryWrite,
    MemoryCandidate,
    FlowWorkflow,
    FlowWorkflowState,
    FlowWorkload,
    FlowReasoningMode,
    FlowSizeLimits,
    limitFlowJsonValue,
    truncateFlowText
} from '../common';
import { resolveFlowRunDirectory, sanitizeFlowPathSegment, splitFlowRelativePath } from './flow-path-policy';
import { AgentMarkdownStore } from './agent-markdown-store';
import { CommandEffectHostAdapter, LocalCommandEffectHostAdapter } from './command-effect-host-adapter';
import { AppliedFileEffect, FileEffectHostAdapter, LocalFileEffectHostAdapter } from './file-effect-host-adapter';
import { AppliedImageEffect, ImageEffectHostAdapter, LocalImageEffectHostAdapter } from './image-effect-host-adapter';
import workloadOutputSchema = require('./schemas/workload-output.schema.json');
import contractsSchema = require('./schemas/contracts.schema.json');
import { MemoryAdapter } from './memory-adapter';
import { FlowAgentProviderRegistry, FlowAgentProviderResolver, FlowLlmProviderConfig } from './flow-agent-provider-registry';

export interface FlowWorkloadExecutionContext {
    workflow: FlowWorkflow;
    run: FlowRun;
    state: FlowWorkflowState;
    workload: FlowWorkload;
    workspaceRootUri?: string;
}

export interface FlowWorkloadExecutionResult {
    artifactUri?: string;
    effectId?: string;
}

export const FlowWorkloadExecutor = Symbol('FlowWorkloadExecutor');

export interface FlowWorkloadExecutor {
    execute(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
    executeAgentWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
    executeContextWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
    executeCommandWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
    executeMemoryWriteWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
    executeReportWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult>;
}

type SignalValue = string | number | boolean;

interface ParsedAgentIssue {
    severity: string;
    type: string;
    summary: string;
    producer?: string;
    impact?: string;
    suggestedFollowup?: string;
}

interface ParsedAgentEffect {
    type: string;
    summary: string;
    path?: string;
    prompt?: string;
    artifactPath?: string;
    mimeType?: string;
    provider?: string;
    bytes?: number;
    command?: string;
    cwd?: string;
    env?: Record<string, string | number | boolean>;
    allowedEnv?: string[];
    allowedCommands?: string[];
    allowedPaths?: string[];
    deniedPaths?: string[];
    timeoutMs?: number;
    exitCode?: number | null;
    stdout?: string;
    stderr?: string;
    timedOut?: boolean;
    content?: string;
    hashBefore?: string;
    hashAfter?: string;
    patch?: string;
    approvalPolicy?: string;
    status?: string;
}

const flowSchemaAjvOptions: Ajv.Options = {
    allErrors: true,
    validateSchema: false
};

function normalizeFlowSchemaForAjv(schema: Record<string, unknown>): Record<string, unknown> {
    const { $schema, ...normalizedSchema } = schema;
    return normalizedSchema;
}

const workloadOutputSchemaValidator = new Ajv(flowSchemaAjvOptions).compile(
    normalizeFlowSchemaForAjv(workloadOutputSchema as Record<string, unknown>)
);
const contractsSchemaValidator = new Ajv(flowSchemaAjvOptions).compile(
    normalizeFlowSchemaForAjv(contractsSchema as Record<string, unknown>)
);

const workloadOutputContractErrorPrefix = 'Workload output contract validation failed:';

interface AgentGenerationResult {
    artifacts: Array<{ path: string; content: string }>;
    summary: string;
    report: string;
    status: string;
    effects: ParsedAgentEffect[];
    signals: Record<string, SignalValue>;
    issues: ParsedAgentIssue[];
    memoryCandidates: MemoryCandidate[];
}

interface ParsedAgentMarkdownSections {
    role: string;
    qualityCriteria: string[];
    outputFormat: string;
}

interface InputArtifact {
    path: string;
    content: string;
}

interface FlowPrimitiveItem {
    index: number;
    value: unknown;
    source?: string;
}

interface FlowPrimitiveStepResult {
    stateId: string;
    workloadId: string;
    failed: boolean;
    artifacts: FlowArtifact[];
    effects: FlowEffect[];
    signals: FlowRun['signals'];
    issues: string[];
    metadata?: Record<string, unknown>;
}

@injectable()
export class ProviderBackedFlowWorkloadExecutor implements FlowWorkloadExecutor {

    constructor(
        @inject(AgentMarkdownStore) protected readonly agentMarkdownStore: AgentMarkdownStore = new AgentMarkdownStore(),
        @inject(CommandEffectHostAdapter) @optional() protected readonly commandEffectHostAdapter: CommandEffectHostAdapter = new LocalCommandEffectHostAdapter(),
        @inject(ImageEffectHostAdapter) @optional() protected readonly imageEffectHostAdapter: ImageEffectHostAdapter = new LocalImageEffectHostAdapter(),
        @inject(FileEffectHostAdapter) @optional() protected readonly fileEffectHostAdapter: FileEffectHostAdapter = new LocalFileEffectHostAdapter(),
        @inject(LanguageModelRegistry) @optional() protected readonly languageModelRegistry?: LanguageModelRegistry,
        @inject(LanguageModelService) @optional() protected readonly languageModelService?: LanguageModelService,
        @inject(CodexProviderService) @optional() protected readonly codexProviderService?: CodexProviderService,
        @inject(MemoryAdapter) @optional() protected readonly memoryAdapter?: MemoryAdapter,
        @inject(FlowAgentProviderResolver) @optional() protected readonly agentProviderResolver?: FlowAgentProviderResolver
    ) {
    }

    async execute(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult> {
        switch (context.state.type) {
            case 'agent':
                return this.executeAgentWorkload(context);
            case 'dynamic_parallel':
                return this.executeDynamicParallelWorkload(context);
            case 'tournament':
                return this.executeTournamentWorkload(context);
            case 'context':
                return this.executeContextWorkload(context);
            case 'command':
                return this.executeCommandWorkload(context);
            case 'memory_write':
                return this.executeMemoryWriteWorkload(context);
            case 'report':
                return this.executeReportWorkload(context);
            default:
                return this.executeDefaultWorkload(context);
        }
    }

    async executeDynamicParallelWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult> {
        const config = context.state.dynamicParallel;
        if (!config?.itemsFrom || !config.worker) {
            return this.completeWorkloadWithArtifacts(context, [], {
                effectSummary: `Dynamic parallel workload "${context.workload.stateId}" is missing item source or worker configuration.`,
                completionStatus: 'failed'
            });
        }
        const items = await this.resolvePrimitiveItems(context, config.itemsFrom, config.maxItems);
        if (items.length === 0) {
            return this.completeWorkloadWithArtifacts(context, [], {
                effectSummary: `Dynamic parallel workload "${context.workload.stateId}" could not resolve any item from "${config.itemsFrom}".`,
                completionStatus: 'failed'
            });
        }
        const concurrency = boundedInteger(config.concurrency, 1, Math.max(1, items.length), 3);
        const runWorker = async (item: FlowPrimitiveItem): Promise<FlowPrimitiveStepResult> => {
            const itemArtifact = await this.materializePrimitiveInputArtifact(
                context,
                `dynamic-parallel/${context.workload.stateId}/items/item-${item.index}.json`,
                JSON.stringify({ index: item.index, item: item.value }, undefined, 2)
            );
            const workerStateId = `${context.workload.stateId}.item_${item.index}`;
            const workerState: FlowWorkflowState = {
                ...config.worker,
                id: workerStateId,
                agent: config.worker.agent || context.state.agent,
                input: {
                    ...(config.worker.input || {}),
                    include: uniqueStrings([
                        ...(config.worker.input?.include || []),
                        ...context.workload.inputArtifacts,
                        itemArtifact.summary || itemArtifact.uri
                    ])
                }
            };
            return this.executePrimitiveStep(context, workerStateId, workerState, {
                itemIndex: item.index,
                item: item.value,
                parentStateId: context.workload.stateId
            });
        };
        const results = await mapWithConcurrency(items, concurrency, runWorker);
        const failed = dynamicParallelFailed(results, config.failurePolicy, config.failureThreshold);
        const aggregate = {
            type: 'dynamic_parallel',
            stateId: context.workload.stateId,
            itemCount: items.length,
            successCount: results.filter(result => !result.failed).length,
            failureCount: results.filter(result => result.failed).length,
            failurePolicy: config.failurePolicy || 'best_effort',
            joinStrategy: config.joinStrategy || 'collect',
            results: results.map(result => primitiveResultSummary(result))
        };
        const aggregatePath = config.outputKey || context.state.outputs?.[0] || `dynamic-parallel/${context.workload.stateId}/results.json`;
        const aggregateArtifactUri = await this.writePrimitiveAggregateArtifact(context, aggregatePath, aggregate);
        this.registerPrimitiveAggregateSignals(context, 'dynamic_parallel', aggregate.itemCount, aggregate.successCount, aggregate.failureCount);
        for (const issue of primitiveIssues(results)) {
            if (!context.workload.issues.includes(issue)) {
                context.workload.issues.push(issue);
            }
        }
        context.workload.outputEnvelope = primitiveOutputEnvelope(context, failed ? 'failed' : 'completed', aggregatePath, aggregate);
        return this.completeWorkloadWithArtifacts(context, [aggregateArtifactUri], {
            effectSummary: failed
                ? `Dynamic parallel "${context.workload.stateId}" completed with ${aggregate.failureCount} failed item(s).`
                : `Dynamic parallel "${context.workload.stateId}" completed ${aggregate.successCount} item(s).`,
            completionStatus: failed ? 'failed' : 'completed'
        });
    }

    async executeTournamentWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult> {
        const config = context.state.tournament;
        if (!config?.candidatesFrom || !config.judge) {
            return this.completeWorkloadWithArtifacts(context, [], {
                effectSummary: `Tournament workload "${context.workload.stateId}" is missing candidate source or judge configuration.`,
                completionStatus: 'failed'
            });
        }
        const candidates = await this.resolvePrimitiveItems(context, config.candidatesFrom, config.maxComparisons);
        if (candidates.length === 0) {
            return this.completeWorkloadWithArtifacts(context, [], {
                effectSummary: `Tournament workload "${context.workload.stateId}" could not resolve any candidate from "${config.candidatesFrom}".`,
                completionStatus: 'failed'
            });
        }
        const candidateArtifact = await this.materializePrimitiveInputArtifact(
            context,
            `tournament/${context.workload.stateId}/candidates.json`,
            JSON.stringify({
                candidates: candidates.map(candidate => ({ index: candidate.index, value: candidate.value })),
                criteria: config.criteria || [],
                strategy: config.strategy || 'single_round',
                winnerCount: config.winnerCount || 1,
                tieBreaker: config.tieBreaker || 'judge_again'
            }, undefined, 2)
        );
        const judgeStateId = `${context.workload.stateId}.judge`;
        const judgeState: FlowWorkflowState = {
            ...config.judge,
            id: judgeStateId,
            agent: config.judge.agent || context.state.agent || 'judge',
            input: {
                ...(config.judge.input || {}),
                include: uniqueStrings([
                    ...(config.judge.input?.include || []),
                    ...context.workload.inputArtifacts,
                    candidateArtifact.summary || candidateArtifact.uri
                ])
            },
            taskPrompt: [
                config.judge.taskPrompt || 'Judge the candidates and select the winner(s).',
                '',
                `Strategy: ${config.strategy || 'single_round'}.`,
                `Winner count: ${config.winnerCount || 1}.`,
                `Tie breaker: ${config.tieBreaker || 'judge_again'}.`,
                ...(config.criteria?.length ? ['', 'Criteria:', ...config.criteria.map(item => `- ${item}`)] : [])
            ].join('\n')
        };
        const judgeResult = await this.executePrimitiveStep(context, judgeStateId, judgeState, {
            candidateCount: candidates.length,
            parentStateId: context.workload.stateId,
            strategy: config.strategy || 'single_round'
        });
        const aggregate = {
            type: 'tournament',
            stateId: context.workload.stateId,
            candidateCount: candidates.length,
            strategy: config.strategy || 'single_round',
            winnerCount: config.winnerCount || 1,
            tieBreaker: config.tieBreaker || 'judge_again',
            criteria: config.criteria || [],
            judge: primitiveResultSummary(judgeResult)
        };
        const aggregatePath = context.state.outputs?.[0] || `tournament/${context.workload.stateId}/result.json`;
        const aggregateArtifactUri = await this.writePrimitiveAggregateArtifact(context, aggregatePath, aggregate);
        this.registerPrimitiveAggregateSignals(context, 'tournament', candidates.length, judgeResult.failed ? 0 : 1, judgeResult.failed ? 1 : 0);
        for (const issue of primitiveIssues([judgeResult])) {
            if (!context.workload.issues.includes(issue)) {
                context.workload.issues.push(issue);
            }
        }
        context.workload.outputEnvelope = primitiveOutputEnvelope(context, judgeResult.failed ? 'failed' : 'completed', aggregatePath, aggregate);
        return this.completeWorkloadWithArtifacts(context, [aggregateArtifactUri], {
            effectSummary: judgeResult.failed
                ? `Tournament "${context.workload.stateId}" judge failed.`
                : `Tournament "${context.workload.stateId}" selected winner(s) from ${candidates.length} candidate(s).`,
            completionStatus: judgeResult.failed ? 'failed' : 'completed'
        });
    }

    async executeAgentWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult> {
        let provider: FlowLlmProviderConfig;
        try {
            provider = await this.resolveLlmProvider(context);
        } catch (error) {
            return this.completeWorkloadWithArtifacts(context, [], {
                effectSummary: `Agent workload "${context.state.id || context.workload.stateId}" failed before execution: ${errorToMessage(error)}`,
                completionStatus: 'failed'
            });
        }
        const policy = context.state.retry;
        const maxRetries = parseRetryMax(policy?.max);
        const totalAttempts = maxRetries + 1;
        try {
            for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
                try {
                    return await this.executeRealAgentWorkload(context, provider);
                } catch (error) {
                    const message = errorToMessage(error);
                    if (attempt <= maxRetries) {
                        pushEvent(context.run, {
                            type: 'workload.retry',
                            stateId: context.workload.stateId,
                            workloadId: context.workload.id,
                            message: `Agent workload "${context.state.id || context.workload.stateId}" failed on attempt ${attempt}; retrying (max ${maxRetries}, attempt ${attempt + 1}/${totalAttempts}).`,
                            payload: {
                                attempt,
                                totalAttempts,
                                maxRetries,
                                retryCounter: policy?.counter,
                                error: message
                            }
                        });
                        continue;
                    }
                    if (message.startsWith(workloadOutputContractErrorPrefix) || maxRetries > 0) {
                        pushEvent(context.run, {
                            type: 'workload.failed',
                            stateId: context.workload.stateId,
                            workloadId: context.workload.id,
                            message: `Agent workload "${context.state.id || context.workload.stateId}" failed after ${attempt} attempts.`,
                            payload: {
                                attempt,
                                totalAttempts,
                                maxRetries,
                                retryCounter: policy?.counter,
                                error: message
                            }
                        });
                        return this.completeWorkloadWithArtifacts(context, [], {
                            effectSummary: `Agent workload "${context.state.id || context.workload.stateId}" failed after ${attempt} attempts: ${message}`,
                            completionStatus: 'failed'
                        });
                    }
                    return this.completeWorkloadWithArtifacts(context, [], {
                        effectSummary: `Agent workload "${context.state.id || context.workload.stateId}" failed: ${message}`,
                        completionStatus: 'failed'
                    });
                }
            }
            return this.completeWorkloadWithArtifacts(context, [], {
                effectSummary: `Agent workload "${context.state.id || context.workload.stateId}" failed: retry limit reached (${maxRetries}).`,
                completionStatus: 'failed'
            });
        } catch (error) {
            const message = errorToMessage(error);
            if (maxRetries > 0 || message.startsWith(workloadOutputContractErrorPrefix)) {
                pushEvent(context.run, {
                    type: 'workload.failed',
                    stateId: context.workload.stateId,
                    workloadId: context.workload.id,
                    message: `Agent workload "${context.state.id || context.workload.stateId}" failed.`,
                    payload: {
                        attempt: totalAttempts,
                        totalAttempts,
                        maxRetries,
                        retryCounter: policy?.counter,
                        error: message
                    }
                });
                return this.completeWorkloadWithArtifacts(context, [], {
                    effectSummary: `Agent workload "${context.state.id || context.workload.stateId}" failed: ${message}`,
                    completionStatus: 'failed'
                });
            }
            return this.completeWorkloadWithArtifacts(context, [], {
                effectSummary: `Agent workload "${context.state.id || context.workload.stateId}" failed: ${message}`,
                completionStatus: 'failed'
            });
        }
    }

    protected async executeRealAgentWorkload(
        context: FlowWorkloadExecutionContext,
        provider: FlowLlmProviderConfig
    ): Promise<FlowWorkloadExecutionResult> {
        const workloadDir = workloadOutputDir(context.workspaceRootUri, context.run.id, context.workload.id);
        const inputArtifacts = await this.prepareWorkOrderEnvelope(context, workloadDir);
        const agentPath = resolveAgentPath(context);
        const agentMarkdown = await this.loadAgentMarkdown(context, agentPath);
        await this.ensureWorkloadContextPack(context);
        const providerPayload = this.buildProviderPayload(context, agentMarkdown.content, inputArtifacts);
        const rawResult = await this.invokeLlmProvider(context, providerPayload, provider, workloadDir);
        const resolvedResult = await resolveAgentResultPayload(rawResult, workloadDir);
        const expectedOutputs = expectedOutputPaths(context.state);
        const generation = parseAgentGenerationResult(resolvedResult, expectedOutputs, context, { allowFallback: false });
        normalizeContractPackageGeneration(context, generation, expectedOutputs, inputArtifacts);
        await normalizeQaGeneration(context, generation, inputArtifacts);
        const generatedEnvelope = buildWorkloadOutputEnvelope(context, generation);
        validateWorkloadOutputEnvelope(generatedEnvelope, context);
        const resultJsonArtifactUri = await writeValidatedWorkloadResultJson(workloadDir, generatedEnvelope, context);
        validateGeneratedArtifactCoverage(generation.artifacts, expectedOutputs, context);
        const outputArtifactUris = await writeAgentOutputs(workloadDir, expectedOutputs, generation.artifacts);
        const blockingEffectFailures = await this.applyProviderGenerationToRun(context, generation);
        const completionStatus = blockingEffectFailures.length > 0 ? 'failed' : generation.status;
        const completionSummary = blockingEffectFailures.length > 0
            ? `${generation.summary || `Agent workload "${context.state.id || context.workload.stateId}" completed with blocked effects.`} ${blockingEffectFailures.join(' ')}`
            : generation.summary || `Agent workload "${context.state.id || context.workload.stateId}" completed.`;
        return this.completeWorkloadWithArtifacts(context, [...outputArtifactUris, resultJsonArtifactUri], {
            effectSummary: completionSummary,
            completionStatus
        });
    }

    protected buildProviderPayload(
        context: FlowWorkloadExecutionContext,
        agentMarkdown: string,
        inputArtifacts: InputArtifact[]
    ): Record<string, unknown> {
        const parsedAgentMarkdown = parseAgentMarkdownSections(agentMarkdown);
        const expectedOutputs = expectedOutputPaths(context.state);
        return {
            role: parsedAgentMarkdown.role,
            qualityCriteria: parsedAgentMarkdown.qualityCriteria,
            instructions: {
                systemPrompt: toOptionalTrimmedString(context.state.systemPrompt),
                taskPrompt: toOptionalTrimmedString(context.state.taskPrompt)
            },
            modelExecution: context.state.modelExecution,
            orchestrationPrimitive: {
                type: context.state.type,
                dynamicParallel: context.state.dynamicParallel,
                tournament: context.state.tournament
            },
            context: {
                prompt: truncateFlowText(context.run.prompt, FlowSizeLimits.promptBytes, 'prompt'),
                workflow: { id: context.workflow.id, name: context.workflow.name },
                stateId: context.workload.stateId,
                workloadId: context.workload.id,
                contextPack: renderContextPack(resolveContextPackForWorkload(context.run, context.workflow, context.workload), context.workflow, context.workload),
                inputArtifacts: inputArtifacts.map(artifact => ({
                    path: artifact.path,
                    content: artifact.content
                }))
            },
            workOrder: renderWorkOrder(context.workflow, context.workload, context.state),
            expectedOutput: {
                format: parsedAgentMarkdown.outputFormat || buildDefaultExpectedOutputFormat(expectedOutputs),
                allowedPaths: expectedOutputs,
                deliverables: normalizedDeliverables(context.state)
            }
        };
    }

    protected async prepareWorkOrderEnvelope(
        context: FlowWorkloadExecutionContext,
        workloadDir: string
    ): Promise<InputArtifact[]> {
        const inputDir = path.join(workloadDir, 'input');
        await fs.mkdir(path.join(inputDir, 'artifacts'), { recursive: true });
        await fs.writeFile(path.join(inputDir, 'prompt.md'), truncateFlowText(context.run.prompt, FlowSizeLimits.promptBytes, 'prompt'), 'utf8');
        await this.ensureWorkloadContextPack(context);
        await fs.writeFile(path.join(inputDir, 'context-pack.md'), renderContextPack(resolveContextPackForWorkload(context.run, context.workflow, context.workload), context.workflow, context.workload), 'utf8');
        await fs.writeFile(path.join(inputDir, 'work-order.md'), renderWorkOrder(context.workflow, context.workload, context.state), 'utf8');
        return this.copyInputArtifacts(context, path.join(inputDir, 'artifacts'));
    }

    protected async ensureWorkloadContextPack(context: FlowWorkloadExecutionContext): Promise<void> {
        if (context.run.workloadContextPacks?.[context.workload.id]) {
            return;
        }
        if (!this.memoryAdapter) {
            return;
        }
        const pack = await this.memoryAdapter.buildContextPack(context.workspaceRootUri, context.workflow, context.workload);
        context.run.workloadContextPacks = {
            ...(context.run.workloadContextPacks || {}),
            [context.workload.id]: pack
        };
    }

    protected async copyInputArtifacts(context: FlowWorkloadExecutionContext, artifactDir: string): Promise<InputArtifact[]> {
        const copied: InputArtifact[] = [];
        for (const included of context.workload.inputArtifacts) {
            const targetFile = path.join(artifactDir, ...safeArtifactPathParts(included));
            const sourceArtifact = findInputArtifactPath(context.run, included);
            if (!sourceArtifact) {
                throw new Error(`Required input artifact "${included}" could not be resolved from run artifacts.`);
            }
            const content = await readTextFile(sourceArtifact);
            if (content === undefined) {
                throw new Error(`Required input artifact "${included}" could not be read from ${sourceArtifact}.`);
            }
            await fs.mkdir(path.dirname(targetFile), { recursive: true });
            await fs.writeFile(targetFile, normalizeText(content), 'utf8');
            copied.push({ path: included, content });
        }
        return copied;
    }

    protected async resolvePrimitiveItems(context: FlowWorkloadExecutionContext, source: string, maxItems?: number): Promise<FlowPrimitiveItem[]> {
        const limit = boundedInteger(maxItems, 1, 100, 25);
        const directArtifactPath = findInputArtifactPath(context.run, source);
        if (directArtifactPath) {
            const content = await readTextFile(directArtifactPath);
            const parsed = primitiveItemsFromText(content || '', source);
            if (parsed.length > 0) {
                return parsed.slice(0, limit).map((value, index) => ({ index: index + 1, value, source }));
            }
        }
        const matchingArtifacts = findPrimitiveSourceArtifacts(context.run, source);
        if (matchingArtifacts.length > 0) {
            const values: unknown[] = [];
            for (const artifact of matchingArtifacts) {
                const filePath = artifactPathFromUri(artifact.uri);
                const content = filePath ? await readTextFile(filePath) : undefined;
                values.push({
                    path: artifact.summary || artifact.uri,
                    content: content || ''
                });
            }
            return values.slice(0, limit).map((value, index) => ({ index: index + 1, value, source }));
        }
        const signal = context.run.signals.find(candidate => candidate.key === source);
        if (signal) {
            const parsed = primitiveItemsFromText(String(signal.value), source);
            if (parsed.length > 0) {
                return parsed.slice(0, limit).map((value, index) => ({ index: index + 1, value, source }));
            }
            return [{ index: 1, value: signal.value, source }];
        }
        if (source === 'prompt' || source === 'input/request.md') {
            return [{ index: 1, value: context.run.prompt, source }];
        }
        return [];
    }

    protected async materializePrimitiveInputArtifact(
        context: FlowWorkloadExecutionContext,
        relativePath: string,
        content: string
    ): Promise<FlowArtifact> {
        const workloadDir = workloadOutputDir(context.workspaceRootUri, context.run.id, context.workload.id);
        const artifactPath = path.join(workloadDir, 'primitive-inputs', ...safeArtifactPathParts(relativePath));
        const artifactUri = await writeOutputFile(artifactPath, content);
        const artifact: FlowArtifact = {
            id: stableId('artifact', context.run.id, context.workload.id, relativePath),
            runId: context.run.id,
            stateId: context.workload.stateId,
            uri: artifactUri,
            kind: 'input',
            summary: relativePath,
            createdAt: timestamp()
        };
        upsertArtifact(context.run.artifacts, artifact);
        pushEvent(context.run, {
            type: 'artifact.created',
            stateId: context.workload.stateId,
            workloadId: context.workload.id,
            message: `Primitive input "${relativePath}" created.`
        });
        return artifact;
    }

    protected async writePrimitiveAggregateArtifact(
        context: FlowWorkloadExecutionContext,
        relativePath: string,
        payload: Record<string, unknown>
    ): Promise<string> {
        const workloadDir = workloadOutputDir(context.workspaceRootUri, context.run.id, context.workload.id);
        const artifactPath = path.join(workloadDir, 'output', 'artifacts', ...safeArtifactPathParts(relativePath));
        return writeOutputFile(artifactPath, JSON.stringify(payload, undefined, 2));
    }

    protected async executePrimitiveStep(
        parentContext: FlowWorkloadExecutionContext,
        stateId: string,
        state: FlowWorkflowState,
        metadata?: Record<string, unknown>
    ): Promise<FlowPrimitiveStepResult> {
        const now = timestamp();
        const workload: FlowWorkload = {
            id: stableId('primitive-workload', parentContext.workload.id, stateId),
            runId: parentContext.run.id,
            stateId,
            branchId: parentContext.workload.stateId,
            agent: state.agent,
            status: 'running',
            inputArtifacts: state.input?.include || [],
            outputArtifacts: [],
            issues: [],
            effectIds: [],
            createdAt: now,
            updatedAt: now
        };
        parentContext.run.workloads.push(workload);
        parentContext.run.stateStatuses[stateId] = 'running';
        pushEvent(parentContext.run, {
            type: 'workload.created',
            stateId,
            workloadId: workload.id,
            message: `Primitive workload "${workload.id}" created.`
        });
        try {
            const stepContext: FlowWorkloadExecutionContext = {
                workflow: parentContext.workflow,
                run: parentContext.run,
                state,
                workload
            };
            if (parentContext.workspaceRootUri) {
                stepContext.workspaceRootUri = parentContext.workspaceRootUri;
            }
            await this.execute(stepContext);
        } catch (error) {
            const message = errorToMessage(error);
            workload.status = 'failed';
            workload.updatedAt = timestamp();
            workload.issues.push(message);
            parentContext.run.stateStatuses[stateId] = 'failed';
            pushEvent(parentContext.run, {
                type: 'workload.failed',
                stateId,
                workloadId: workload.id,
                message,
                payload: { parentStateId: parentContext.workload.stateId, metadata }
            });
        }
        const result: FlowPrimitiveStepResult = {
            stateId,
            workloadId: workload.id,
            failed: workload.status === 'failed',
            artifacts: parentContext.run.artifacts.filter(artifact => artifact.stateId === stateId),
            effects: parentContext.run.effects.filter(effect => effect.stateId === stateId),
            signals: parentContext.run.signals.filter(signal => signal.stateId === stateId),
            issues: workload.issues
        };
        if (metadata) {
            result.metadata = metadata;
        }
        return result;
    }

    protected registerPrimitiveAggregateSignals(
        context: FlowWorkloadExecutionContext,
        primitive: 'dynamic_parallel' | 'tournament',
        itemCount: number,
        successCount: number,
        failureCount: number
    ): void {
        const now = timestamp();
        const base = `${context.workload.stateId}.${primitive}`;
        for (const [key, value] of Object.entries({
            [`${base}.item_count`]: itemCount,
            [`${base}.success_count`]: successCount,
            [`${base}.failure_count`]: failureCount
        })) {
            context.run.signals.push({
                key,
                value,
                stateId: context.workload.stateId,
                runId: context.run.id,
                createdAt: now
            });
        }
    }

    protected async loadAgentMarkdown(context: FlowWorkloadExecutionContext, agentPath: string) {
        const found = await this.agentMarkdownStore.readAgent(context.workspaceRootUri, agentPath, { createIfMissing: false });
        if (!found) {
            throw new Error(`Agent markdown "${agentPath}" was not found in workspace agent store.`);
        }
        return found;
    }

    protected async applyProviderGenerationToRun(context: FlowWorkloadExecutionContext, generation: AgentGenerationResult): Promise<string[]> {
        const { workload } = context;
        workload.outputEnvelope = buildWorkloadOutputEnvelope(context, generation);

        this.registerGeneratedSignals(context, generation.signals);
        this.registerGeneratedIssues(context, generation.issues);
        const blockingEffectFailures = await this.registerGeneratedEffects(context, generation.effects);
        this.synchronizeWorkloadEnvelopeEffects(context);
        this.registerGeneratedMemoryCandidates(context, generation.memoryCandidates);
        for (const issue of generation.issues) {
            const issueSummary = issue.summary;
            if (issueSummary && !workload.issues.includes(issueSummary)) {
                workload.issues.push(issueSummary);
            }
        }
        for (const failure of blockingEffectFailures) {
            if (!workload.issues.includes(failure)) {
                workload.issues.push(failure);
            }
        }
        return blockingEffectFailures;
    }

    protected synchronizeWorkloadEnvelopeEffects(context: FlowWorkloadExecutionContext): void {
        const envelope = context.workload.outputEnvelope;
        if (!envelope) {
            return;
        }
        const workloadEffectIds = new Set(context.workload.effectIds);
        const effects = context.run.effects
            .filter(effect => effect.stateId === context.workload.stateId && workloadEffectIds.has(effect.id))
            .map(effect => flowEffectToWorkloadResultEffect(effect));
        if (effects.length > 0) {
            envelope.effects = effects;
        }
    }

    protected registerGeneratedSignals(context: FlowWorkloadExecutionContext, signals: Record<string, SignalValue>): void {
        for (const [key, value] of Object.entries(signals)) {
            if (!key || !isSignalPrimitive(value)) {
                continue;
            }
            context.run.signals.push({
                key,
                value,
                stateId: context.workload.stateId,
                runId: context.run.id,
                createdAt: timestamp()
            });
        }
    }

    protected registerGeneratedIssues(context: FlowWorkloadExecutionContext, issues: ParsedAgentIssue[]): void {
        const { run, workload } = context;
        const stateId = workload.stateId;
        const existingMessages = new Set(run.signals
            .filter(signal => signal.key === `${stateId}.issue` && typeof signal.value === 'string')
            .map(signal => signal.value as string)
        );
        for (const issue of issues) {
            if (!issue.summary) {
                continue;
            }
            const message = issue.summary;
            if (existingMessages.has(message)) {
                continue;
            }
            existingMessages.add(message);
            run.signals.push({
                key: `${stateId}.issue`,
                value: message,
                stateId,
                runId: run.id,
                createdAt: timestamp()
            });
        }
        for (const issue of issues) {
            if (!workload.issues.includes(issue.summary)) {
                workload.issues.push(issue.summary);
            }
        }
        updateSecondRunSuggestion(context.run, issues, context.workload.stateId);
    }

    protected async registerGeneratedEffects(context: FlowWorkloadExecutionContext, effects: ParsedAgentEffect[]): Promise<string[]> {
        const stateId = context.workload.stateId;
        const now = timestamp();
        const normalizedStatus = normalizeWorkloadCompletionStatus(context, effects);
        const blockingFailures: string[] = [];

        for (const effect of effects) {
            const fileResult = isFileEffectType(effect.type)
                ? await this.applyGeneratedFileEffect(context, effect)
                : undefined;
            const imageResult = isImageEffectType(effect.type)
                ? await this.imageEffectHostAdapter.apply(context.workspaceRootUri, context.run.id, context.workload.id, effect, imageEffectApproved(effect))
                : undefined;
            const effectId = stableId('effect', context.run.id, context.workload.id, effect.type, effect.summary || '', effect.path || '', effect.command || '', effect.prompt || '');
            const kind = normalizeEffectKind(effect.type, effect.path, effect.command);
            const summary = effect.summary || `${kind} effect for ${stateId}.`;
            const status = fileResult ? fileEffectStatus(effect, fileResult) : imageResult?.status || normalizeEffectStatus(effect.status, normalizedStatus === 'failed');
            context.run.effects.push({
                id: effectId,
                runId: context.run.id,
                stateId,
                kind,
                type: effect.type,
                path: imageResult?.uri || fileResult?.relativePath || effect.path,
                prompt: effect.prompt,
                artifactPath: imageResult?.artifactPath || effect.artifactPath,
                mimeType: imageResult?.mimeType || effect.mimeType,
                provider: imageResult?.provider || effect.provider,
                bytes: imageResult?.bytes,
                command: effect.command,
                cwd: effect.cwd,
                env: stringifyEnv(effect.env),
                allowedPaths: effect.allowedPaths,
                deniedPaths: effect.deniedPaths,
                timeoutMs: effect.timeoutMs,
                exitCode: effect.exitCode,
                stdout: imageResult?.stdout || effect.stdout,
                stderr: imageResult?.stderr || imageResult?.reason || (!fileResult?.applied ? fileResult?.reason : undefined) || effect.stderr,
                timedOut: effect.timedOut,
                hashBefore: fileResult?.hashBefore || effect.hashBefore,
                hashAfter: fileResult?.hashAfter || effect.hashAfter,
                patch: fileResult?.patch || effect.patch,
                approvalPolicy: fileResult?.approvalPolicy || imageResult?.approvalPolicy || effect.approvalPolicy,
                status,
                summary
            });
            addUnique(context.workload.effectIds, effectId);
            if (isFileEffectType(effect.type)) {
                const fileStatuses = fileEffectTransitionStatuses(effect, fileResult, status);
                for (const transitionStatus of fileStatuses) {
                    registerFileEffectAudit(context.run, context.workload, {
                        id: effectId,
                        type: effect.type,
                        path: fileResult?.relativePath || effect.path,
                        status: transitionStatus,
                        summary,
                        hashBefore: fileResult?.hashBefore || effect.hashBefore,
                        hashAfter: fileResult?.hashAfter || effect.hashAfter,
                        patch: fileResult?.patch || effect.patch,
                        approvalPolicy: fileResult?.approvalPolicy || effect.approvalPolicy,
                        reason: transitionStatus === status ? fileResult?.reason : undefined
                    });
                }
                if (fileStatuses.length === 0) {
                    registerFileEffectAudit(context.run, context.workload, {
                        id: effectId,
                        type: effect.type,
                        path: fileResult?.relativePath || effect.path,
                        status,
                        summary,
                        hashBefore: fileResult?.hashBefore || effect.hashBefore,
                        hashAfter: fileResult?.hashAfter || effect.hashAfter,
                        patch: fileResult?.patch || effect.patch,
                        approvalPolicy: fileResult?.approvalPolicy || effect.approvalPolicy,
                        reason: fileResult?.reason
                    });
                }
                if (fileResult && !fileResult.applied) {
                    blockingFailures.push(`File effect "${summary}" was ${status}: ${fileResult.reason || 'file adapter did not apply the effect'}.`);
                }
            }
            if (isCommandEffectType(effect.type, effect.command)) {
                registerCommandEffectAudit(context.run, context.workload, context.run.effects[context.run.effects.length - 1]);
            }
            if (imageResult) {
                registerImageEffectAudit(context.run, context.workload, context.run.effects[context.run.effects.length - 1], imageResult);
                if (!imageResult.applied) {
                    blockingFailures.push(`Image effect "${summary}" was ${imageResult.status}: ${imageResult.reason || 'image provider did not apply the effect'}.`);
                }
            }
            if (!isFileEffectType(effect.type) && !isCommandEffectType(effect.type, effect.command) && !imageResult) {
                registerGenericEffectAudit(context.run, context.workload, context.run.effects[context.run.effects.length - 1]);
            }
            context.run.signals.push({
                key: `${stateId}.effect`,
                value: effect.type,
                stateId,
                runId: context.run.id,
                createdAt: now
            });
        }
        return blockingFailures;
    }

    protected async applyGeneratedFileEffect(context: FlowWorkloadExecutionContext, effect: ParsedAgentEffect): Promise<AppliedFileEffect> {
        try {
            if (normalizeWorkloadStatusRaw(effect.status) === 'rejected') {
                const prepared = await this.fileEffectHostAdapter.prepare(context.workspaceRootUri, {
                    type: effect.type,
                    path: effect.path || '',
                    content: effect.content,
                    hashBefore: effect.hashBefore,
                    approvalPolicy: effect.approvalPolicy,
                    allowedPaths: effect.allowedPaths,
                    deniedPaths: effect.deniedPaths
                });
                return {
                    ...prepared,
                    reason: 'file effect rejected before apply',
                    applied: false
                };
            }
            return await this.fileEffectHostAdapter.apply(context.workspaceRootUri, {
                type: effect.type,
                path: effect.path || '',
                content: effect.content,
                hashBefore: effect.hashBefore,
                approvalPolicy: effect.approvalPolicy,
                allowedPaths: effect.allowedPaths,
                deniedPaths: effect.deniedPaths
            }, fileEffectApproved(effect));
        } catch (error) {
            const message = errorToMessage(error);
            const failedType = effect.type === 'file.created' || effect.type === 'file.edited' || effect.type === 'file.deleted' ? effect.type : 'file.edited';
            return {
                type: failedType,
                workspaceRoot: '',
                relativePath: effect.path || '',
                absolutePath: effect.path || '',
                existedBefore: false,
                contentBefore: '',
                contentAfter: '',
                hashBefore: effect.hashBefore || '',
                hashAfter: effect.hashAfter || '',
                patch: effect.patch || '',
                approvalPolicy: effect.approvalPolicy || 'blocked',
                requiresApproval: false,
                blocked: true,
                riskReasons: [message],
                reason: message,
                applied: false
            };
        }
    }

    protected registerGeneratedMemoryCandidates(context: FlowWorkloadExecutionContext, candidates: MemoryCandidate[]): void {
        if (!candidates.length) {
            return;
        }
        context.run.memoryCandidates = context.run.memoryCandidates || [];
        const existing = new Set(context.run.memoryCandidates.map(candidate => candidate.id));
        for (const candidate of candidates) {
            const stateId = candidate.stateId || context.workload.stateId;
            const runId = context.run.id;
            const baseId = candidate.id || stableId('memory-candidate', runId, stateId, candidate.content);
            const prepared: MemoryCandidate = {
                ...candidate,
                id: baseId,
                runId,
                stateId,
                status: 'candidate'
            };
            if (!existing.has(prepared.id)) {
                context.run.memoryCandidates.push(prepared);
                existing.add(prepared.id);
            }
        }
    }

    protected async resolveLlmProvider(context: FlowWorkloadExecutionContext): Promise<FlowLlmProviderConfig> {
        const resolver = this.agentProviderResolver || new FlowAgentProviderRegistry(
            this.languageModelRegistry,
            this.languageModelService,
            this.codexProviderService
        );
        return resolver.resolveProvider(context);
    }

    protected async invokeLlmProvider(
        context: FlowWorkloadExecutionContext,
        providerPayload: Record<string, unknown>,
        provider: FlowLlmProviderConfig,
        workloadDir: string
    ): Promise<string> {
        const virtualReasoning = context.state.modelExecution?.virtualReasoning;
        if (!('mock' in provider) && virtualReasoning?.enabled && virtualReasoning.mode && virtualReasoning.mode !== 'off') {
            return runVirtualReasoningHarness({
                mode: virtualReasoning.mode,
                basePayload: providerPayload,
                invoke: payload => this.invokeLlmProviderDirect(context, payload, provider, workloadDir),
                onProgress: message => pushEvent(context.run, {
                    type: 'virtual_reasoning.progress',
                    stateId: context.workload.stateId,
                    workloadId: context.workload.id,
                    message
                })
            });
        }
        return this.invokeLlmProviderDirect(context, providerPayload, provider, workloadDir);
    }

    protected async invokeLlmProviderDirect(
        context: FlowWorkloadExecutionContext,
        providerPayload: Record<string, unknown>,
        provider: FlowLlmProviderConfig,
        workloadDir: string
    ): Promise<string> {
        if ('mock' in provider) {
            return invokeE2eMockProvider(context, providerPayload);
        }
        if ('command' in provider) {
            return invokeCommandProvider(
                provider.command,
                JSON.stringify(providerPayload, undefined, 2),
                workloadDir,
                parseProviderTimeoutMs()
            );
        }
        if ('codexProvider' in provider) {
            return invokeCodexProviderProvider(provider.codexProvider, context, providerPayload, workloadDir, provider.modelId);
        }
        return invokeChatProvider(
            this.languageModelService,
            provider.model,
            context,
            provider.agentId,
            providerPayload
        );
    }

    async executeContextWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult> {
        return this.completeWorkloadWithArtifacts(context, [], {
            effectSummary: `Context workload "${context.state.id || context.workload.stateId}" cannot execute without an external context provider request.`,
            completionStatus: 'failed'
        });
    }

    async executeCommandWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult> {
        const command = toTrimmedString(context.state.command);
        if (!command) {
            return this.completeWorkloadWithArtifacts(context, [], {
                effectSummary: `Command workload "${context.state.id || context.workload.stateId}" has no command configured.`,
                completionStatus: 'failed'
            });
        }
        const result = await this.commandEffectHostAdapter.apply(context.workspaceRootUri, {
            command,
            cwd: toTrimmedString(context.state.cwd),
            env: parseRecordEnv(context.state.env),
            allowedEnv: parseStringArray(context.state.allowedEnv),
            allowedCommands: parseStringArray(context.state.allowedCommands),
            timeoutMs: parseOptionalNumber(context.state.timeoutMs),
            approvalPolicy: toTrimmedString(context.state.approvalPolicy)
        });
        const effectId = stableId('effect', context.run.id, context.workload.id, 'command', command);
        const effect: FlowEffect = {
            id: effectId,
            runId: context.run.id,
            stateId: context.workload.stateId,
            kind: 'command',
            type: 'command.executed',
            command,
            cwd: result.relativeCwd,
            env: result.env,
            timeoutMs: result.timeoutMs,
            exitCode: result.exitCode,
            stdout: truncateFlowText(result.stdout || '', FlowSizeLimits.commandOutputBytes, 'command stdout'),
            stderr: truncateFlowText(result.stderr || '', FlowSizeLimits.commandOutputBytes, 'command stderr'),
            timedOut: result.timedOut,
            approvalPolicy: result.approvalPolicy,
            status: result.status,
            summary: commandEffectSummary(context.workload.stateId, result.status, command)
        };
        context.run.effects.push(effect);
        addUnique(context.workload.effectIds, effectId);
        registerCommandEffectAudit(context.run, context.workload, effect);
        return this.completeWorkloadWithArtifacts(context, [], {
            effectSummary: effect.summary,
            completionStatus: result.status === 'failed' || result.status === 'blocked' ? 'failed' : 'completed'
        });
    }

    async executeMemoryWriteWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult> {
        const approvedCandidates = selectApprovedMemoryCandidates(context);
        if (approvedCandidates.length === 0) {
            return this.completeWorkloadWithArtifacts(context, [], {
                effectSummary: `No approved memory candidates found for ${context.state.id || context.workload.stateId}.`
            });
        }
        if (!this.memoryAdapter) {
            for (const candidate of approvedCandidates) {
                const failed = buildMemoryWrite(context, candidate, 'failed', 'Memory adapter is not available.');
                context.run.memoryWrites = upsertMemoryWrite(context.run.memoryWrites, failed);
                pushMemoryWriteEvent(context.run, candidate, failed, 'failed', context.workload.id);
            }
            return this.completeWorkloadWithArtifacts(context, [], {
                effectSummary: `Memory adapter is not available for ${context.state.id || context.workload.stateId}.`,
                completionStatus: 'failed'
            });
        }

        let failedWrites = 0;
        for (const candidate of approvedCandidates) {
            const approved = buildMemoryWrite(context, candidate, 'approved');
            context.run.memoryWrites = upsertMemoryWrite(context.run.memoryWrites, approved);
            pushMemoryWriteEvent(context.run, candidate, approved, 'approved', context.workload.id);
            const written = await this.memoryAdapter.writeApprovedMemory(approved, context.workspaceRootUri);
            context.run.memoryWrites = upsertMemoryWrite(context.run.memoryWrites, written);
            if (written.status === 'written') {
                candidate.status = 'written';
            } else {
                failedWrites += 1;
                candidate.status = 'approved';
            }
            pushMemoryWriteEvent(context.run, candidate, written, written.status, context.workload.id);
        }

        return this.completeWorkloadWithArtifacts(context, [], {
            effectSummary: `Memory write workload persisted ${approvedCandidates.length - failedWrites} of ${approvedCandidates.length} approved candidates.`,
            completionStatus: failedWrites > 0 ? 'failed' : 'completed'
        });
    }

    async executeReportWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult> {
        const workloadDir = workloadOutputDir(context.workspaceRootUri, context.run.id, context.workload.id);
        const expectedOutputs = context.state.outputs && context.state.outputs.length > 0 ? context.state.outputs : ['final/report.md'];
        const report = buildStructuredRunReport(context);
        const markdown = renderStructuredRunReportMarkdown(report);
        const generatedArtifacts = expectedOutputs.map(output => ({
            path: output,
            content: normalizeArtifactPath(output).endsWith('.json')
                ? JSON.stringify(report, undefined, 2)
                : markdown
        }));
        const artifactUris = await writeAgentOutputs(workloadDir, expectedOutputs, generatedArtifacts);
        const generation: AgentGenerationResult = {
            artifacts: generatedArtifacts,
            summary: `Structured run report generated for ${context.run.id}.`,
            report: markdown,
            status: 'completed',
            effects: [],
            signals: {
                [`${context.workload.stateId}.status`]: 'completed',
                [`${context.workload.stateId}.artifact_count`]: context.run.artifacts.length,
                [`${context.workload.stateId}.effect_count`]: context.run.effects.length,
                [`${context.workload.stateId}.issue_count`]: collectRunIssues(context.run).length,
                [`${context.workload.stateId}.pending_count`]: Array.isArray(report.pending) ? report.pending.length : 0
            },
            issues: [],
            memoryCandidates: []
        };
        context.workload.outputEnvelope = buildWorkloadOutputEnvelope(context, generation);
        this.registerGeneratedSignals(context, generation.signals);
        return this.completeWorkloadWithArtifacts(context, artifactUris, {
            effectSummary: `Structured final report for run ${context.run.id}.`
        });
    }

    async executeDefaultWorkload(context: FlowWorkloadExecutionContext): Promise<FlowWorkloadExecutionResult> {
        return this.completeWorkloadWithArtifacts(context, [], {
            effectSummary: `Unsupported Flow workload type "${context.state.type}" for state "${context.state.id || context.workload.stateId}".`,
            completionStatus: 'failed'
        });
    }

    protected completeWorkloadWithArtifacts(
        context: FlowWorkloadExecutionContext,
        artifactUris: string[],
        options: {
            effectSummary: string;
            completionStatus?: string;
        }
    ): FlowWorkloadExecutionResult {
        const { run, workload } = context;
        const now = timestamp();
        const effectId = generateUuid();
        const completedArtifactUri = artifactUris[0] || `flow://${run.id}/${workload.stateId}/report.md`;
        const outputStatus = normalizeResultStatus(options.completionStatus);
        const workloadStatus = outputStatus === 'failed' ? 'failed' : 'done';

        workload.status = workloadStatus;
        workload.updatedAt = now;
        workload.reportUri = completedArtifactUri;
        run.stateStatuses[workload.stateId] = workloadStatus;
        workload.outputArtifacts = uniqueStrings([...workload.outputArtifacts, ...artifactUris]);
        workload.effectIds = [...workload.effectIds, effectId];

        for (const artifactUri of artifactUris) {
            upsertArtifact(run.artifacts, {
                id: stableId('artifact', run.id, workload.id, artifactUri),
                runId: run.id,
                stateId: workload.stateId,
                uri: artifactUri,
                kind: artifactKindFromPath(artifactUri),
                summary: artifactUri,
                createdAt: now
            });
        }

        run.effects.push({
            id: effectId,
            runId: run.id,
            stateId: workload.stateId,
            kind: 'notification',
            status: 'proposed',
            summary: options.effectSummary
        });
        run.signals.push({
            key: `${workload.stateId}.status`,
            value: outputStatus,
            stateId: workload.stateId,
            runId: run.id,
            createdAt: now
        });

        for (const artifactUri of artifactUris) {
            pushEvent(run, {
                type: 'artifact.created',
                stateId: workload.stateId,
                workloadId: workload.id,
                message: `Artifact created for "${workload.stateId}".`
            });
            pushEvent(run, {
                type: 'signal.emitted',
                stateId: workload.stateId,
                workloadId: workload.id,
                message: `Signal emitted for "${artifactUri}".`
            });
        }
        pushEvent(run, { type: 'effect.proposed', stateId: workload.stateId, workloadId: workload.id, message: `Effect proposed for "${workload.stateId}".` });
        if (workloadStatus === 'failed') {
            pushEvent(run, {
                type: 'workload.failed',
                stateId: workload.stateId,
                workloadId: workload.id,
                message: `Workload "${workload.id}" failed.`,
                payload: { status: outputStatus, summary: options.effectSummary }
            });
        } else {
            pushEvent(run, { type: 'workload.completed', stateId: workload.stateId, workloadId: workload.id, message: `Workload "${workload.id}" completed.` });
            pushEvent(run, { type: 'state.completed', stateId: workload.stateId, workloadId: workload.id, message: `State "${workload.stateId}" completed.` });
        }
        return {
            artifactUri: completedArtifactUri,
            effectId
        };
    }
}

/**
 * @deprecated Use ProviderBackedFlowWorkloadExecutor. This alias is kept for
 * downstream extensions compiled against the historical name.
 */
export class SimulatedFlowWorkloadExecutor extends ProviderBackedFlowWorkloadExecutor {
}

function resolveAgentPath(context: FlowWorkloadExecutionContext): string {
    const stateAgent = context.state.agent || context.workload.agent;
    if (!stateAgent) {
        return 'agents/default.md';
    }
    return context.workflow.agents?.[stateAgent] || stateAgent;
}

function renderContextPack(contextPack: FlowContextPack | undefined, workflow: FlowWorkflow, workload: FlowWorkload): string {
    const files = contextPack?.files.map(file => `- ${file.uri}: ${file.reason}`).join('\n') || '- none';
    return truncateFlowText([
        `# Context Pack - ${workload.stateId}`,
        '',
        contextPack?.summary || `Workflow "${workflow.name}" context is unavailable.`,
        '',
        '## Files',
        files,
        '',
        '## Signals',
        ...(contextPack?.signals || []).map(signal => `- ${signal.key}: ${String(signal.value)}`),
        '',
        ...(contextPack?.sections || []).flatMap(section => [
            `## ${section.title}`,
            ...section.items.map(item => `- ${item.title}: ${item.content}`)
        ])
    ].join('\n'), FlowSizeLimits.contextPackBytes, 'context pack');
}

function resolveContextPackForWorkload(run: FlowRun, workflow: FlowWorkflow, workload: FlowWorkload): FlowContextPack | undefined {
    const workloadPack = run.workloadContextPacks?.[workload.id];
    if (workloadPack) {
        return workloadPack;
    }
    return scopeRunContextPackForWorkload(run.contextPack, workflow, workload);
}

function scopeRunContextPackForWorkload(
    contextPack: FlowContextPack | undefined,
    workflow: FlowWorkflow,
    workload: FlowWorkload
): FlowContextPack | undefined {
    if (!contextPack) {
        return undefined;
    }
    const relevantPaths = collectWorkloadContextPaths(workflow, workload);
    const relevantAgents = collectWorkloadAgentIds(workflow, workload);
    const files = contextPack.files.filter(file => isRelevantContextPath(file.uri, relevantPaths));
    return {
        ...contextPack,
        summary: `Scoped context for workload "${workload.id}" in state "${workload.stateId}".`,
        workflow: {
            id: workflow.id,
            name: workflow.name,
            stateCount: 1,
            transitionCount: 0,
            agentIds: relevantAgents
        },
        files,
        signals: contextPack.signals.filter(signal => isRelevantContextSignal(signal.key, workload, relevantAgents)),
        sections: (contextPack.sections || [])
            .map(section => ({
                ...section,
                items: section.items.filter(item => isRelevantContextItem(item, relevantPaths, relevantAgents))
            }))
            .filter(section => section.items.length > 0)
    };
}

function collectWorkloadContextPaths(workflow: FlowWorkflow, workload: FlowWorkload): Set<string> {
    const paths = new Set<string>();
    const state = workflow.states[workload.stateId]
        || Object.values(workflow.states).find(candidate => candidate.branches?.[workload.stateId])?.branches?.[workload.stateId];
    for (const artifact of [
        ...(state?.input?.include || []),
        ...(state?.outputs || []),
        ...workload.inputArtifacts,
        ...workload.outputArtifacts
    ]) {
        addNormalizedContextPath(paths, artifact);
    }
    for (const agentId of collectWorkloadAgentIds(workflow, workload)) {
        addNormalizedContextPath(paths, workflow.agents?.[agentId]);
    }
    return paths;
}

function collectWorkloadAgentIds(workflow: FlowWorkflow, workload: FlowWorkload): string[] {
    const ids = new Set<string>();
    const state = workflow.states[workload.stateId]
        || Object.values(workflow.states).find(candidate => candidate.branches?.[workload.stateId])?.branches?.[workload.stateId];
    if (workload.agent) {
        ids.add(workload.agent);
    }
    if (state?.agent) {
        ids.add(state.agent);
    }
    return [...ids].filter(id => Boolean(id)).sort();
}

function addNormalizedContextPath(paths: Set<string>, value: string | undefined): void {
    const normalized = normalizeContextPath(value);
    if (normalized) {
        paths.add(normalized);
    }
}

function isRelevantContextPath(value: string | undefined, relevantPaths: Set<string>): boolean {
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

function isRelevantContextSignal(key: string, workload: FlowWorkload, relevantAgents: string[]): boolean {
    const normalized = key.toLowerCase();
    return normalized.includes(workload.id.toLowerCase())
        || normalized.includes(workload.stateId.toLowerCase())
        || relevantAgents.some(agent => normalized.includes(agent.toLowerCase()))
        || normalized.startsWith('memory.')
        || normalized.startsWith('flow_studio.');
}

function isRelevantContextItem(
    item: FlowContextSectionItem,
    relevantPaths: Set<string>,
    relevantAgents: string[]
): boolean {
    if (isRelevantContextPath(item.uri, relevantPaths) || isRelevantContextPath(item.title, relevantPaths)) {
        return true;
    }
    const title = item.title.toLowerCase();
    return relevantAgents.some(agent => title.includes(agent.toLowerCase()));
}

function renderWorkOrder(workflow: FlowWorkflow, workload: FlowWorkload, state: FlowWorkflowState): string {
    const systemPrompt = toOptionalTrimmedString(state.systemPrompt);
    const taskPrompt = toOptionalTrimmedString(state.taskPrompt);
    const deliverables = normalizedDeliverables(state);
    return [
        `# Work Order - ${workload.stateId}`,
        '',
        `Workflow: ${workflow.name || workflow.id}`,
        `Workload: ${workload.id}`,
        `Agent: ${workload.agent || workflow.agents?.[workload.agent || ''] || 'system'}`,
        ...(systemPrompt ? ['', '## System Prompt', systemPrompt] : []),
        ...(taskPrompt ? ['', '## Task Prompt', taskPrompt] : []),
        ...(deliverables.length ? ['', '## Deliverables', ...deliverables.map(renderDeliverable)] : []),
        '',
        '## Inputs',
        ...(workload.inputArtifacts.length ? workload.inputArtifacts.map(input => `- ${input}`) : ['- none'])
    ].join('\n');
}

function expectedOutputPaths(state: FlowWorkflowState): string[] {
    const explicitOutputs = state.outputs && state.outputs.length > 0 ? state.outputs : [];
    const deliverableOutputs = normalizedDeliverables(state).map(deliverable => deliverable.path);
    const outputs = [...explicitOutputs];
    for (const deliverablePath of deliverableOutputs) {
        if (!outputs.includes(deliverablePath)) {
            outputs.push(deliverablePath);
        }
    }
    return outputs.length > 0 ? outputs : ['report.md'];
}

function normalizedDeliverables(state: FlowWorkflowState): Array<{ path: string; description?: string; required: boolean; kind?: string }> {
    return (state.deliverables || [])
        .map(deliverable => ({
            path: normalizeArtifactPath(deliverable.path),
            description: toOptionalTrimmedString(deliverable.description),
            required: deliverable.required !== false,
            kind: toOptionalTrimmedString(deliverable.kind)
        }))
        .filter(deliverable => deliverable.path);
}

function renderDeliverable(deliverable: { path: string; description?: string; required: boolean; kind?: string }): string {
    const details = [
        deliverable.required ? 'required' : 'optional',
        deliverable.kind ? `kind: ${deliverable.kind}` : undefined,
        deliverable.description
    ].filter(Boolean).join('; ');
    return `- ${deliverable.path}${details ? ` (${details})` : ''}`;
}

function workloadOutputDir(workspaceRootUri: string | undefined, runId: string, workloadId: string): string {
    const root = path.resolve(workspaceRootUri ? FileUri.fsPath(workspaceRootUri) : os.homedir());
    return path.join(resolveFlowRunDirectory(root, runId), 'workloads', sanitizeFlowPathSegment(workloadId, 'workload'));
}

export interface VirtualReasoningHarnessRequest {
    mode: FlowReasoningMode;
    basePayload: Record<string, unknown>;
    invoke: (payload: Record<string, unknown>) => Promise<string>;
    onProgress?: (message: string) => void;
}

export async function runVirtualReasoningHarness(request: VirtualReasoningHarnessRequest): Promise<string> {
    const engine = new VirtualReasoningEngine();
    const basePrompt = JSON.stringify(request.basePayload, undefined, 2);
    const mode = request.mode as VirtualReasoningMode;
    if (engine.resolveMode(basePrompt, mode) === 'off') {
        return request.invoke(request.basePayload);
    }
    const result = await engine.execute({
        mode,
        basePrompt,
        responseContract: 'workload-output envelope JSON. Return only a valid workload-output envelope and no prose outside it.',
        onProgress: (_stage, message) => request.onProgress?.(message),
        invokeStage: (stage, prompt) => request.invoke(reasoningStagePayload(request.basePayload, stage, prompt))
    });
    return result.finalAnswer.trim() || request.invoke(request.basePayload);
}

function reasoningStagePayload(
    basePayload: Record<string, unknown>,
    stage: ReasoningStage,
    prompt: string
): Record<string, unknown> {
    return {
        ...basePayload,
        virtualReasoning: {
            stage,
            internal: true,
            instructions: [
                truncateFlowText(prompt, FlowSizeLimits.resultJsonBytes, `virtual reasoning ${stage}`)
            ]
        }
    };
}

async function invokeCodexProviderProvider(
    codexProvider: CodexProviderService,
    context: FlowWorkloadExecutionContext,
    payload: Record<string, unknown>,
    cwd: string,
    modelId?: string
): Promise<string> {
    const prompt = [
        'You are an execution agent for the Flow workflow engine.',
        'Execute only the workload described by the JSON payload.',
        'Do not run shell commands, edit files directly, apply patches, or control workflow orchestration.',
        'Return exactly JSON in the workload-output envelope shape requested by the payload.',
        '',
        JSON.stringify(payload, undefined, 2)
    ].join('\n');
    const result = await codexProvider.sendAndCollect({
        prompt,
        input: [{
            type: 'text',
            text: prompt,
            text_elements: []
        }],
        sessionId: `flow-workload-${context.run.id}`,
        options: {
            cwd,
            model: modelId,
            approvalPolicy: 'never',
            sandboxMode: 'read-only'
        }
    });
    return result.text;
}

async function invokeChatProvider(
    languageModelService: LanguageModelService | undefined,
    model: LanguageModel,
    context: FlowWorkloadExecutionContext,
    agentId: string,
    payload: Record<string, unknown>
): Promise<string> {
    if (!languageModelService) {
        throw new Error('Language model service is not available in the current host container.');
    }
    const request: UserRequest = {
        messages: [
            {
                actor: 'system',
                type: 'text',
                text: [
                'You are an execution agent for the Flow workflow engine.',
                'You only execute the workload, you do not control workflow orchestration.',
                'Use only the provided contract fields and do not emit commands about transitions, gates, joins, loops, or scheduling.',
                'Return JSON in this shape:',
                '{',
                '  "result": {',
                '    "status": "completed|failed|done|running|waiting|review|pending|ready",',
                '    "summary": "short summary",',
                '    "artifacts": [ { "path": "string", "content": "string" } ],',
                '    "signals": { "key": "value" },',
                '    "issues": [ { "severity": "non_blocking", "type": "workload_issue", "summary": "text" } ]',
                '  },',
                '  "report": "human-readable report text",',
                '  "effects": [ { "type": "file.created|file.edited|file.deleted|command|memory_write|notification|other", "path": "file/path", "hashBefore": "sha256:...", "hashAfter": "sha256:...", "patch": "unified diff", "summary": "...", "status": "proposed", "approvalPolicy": "human_gate_required" } ],',
                '  "signals": { "key": "value" },',
                '  "issues": [ { ... } ],',
                '  "artifacts": [ { "path": "file.md", "content": "..." } ],',
                '  "memoryCandidates": [ { "content": "text", "reason": "...", "kind": "fact", "source": "artifact", "scope": "ide|workspace|project|workflow|run|agent" } ]',
                '}',
                'Top-level "signals" and "issues" may mirror nested result fields. If you include top-level artifacts, every generated artifact must include both path and content.',
                'Allowed artifact paths must be relative and map to expected workload outputs.',
                'Do not invent files or perform workflow control operations.'
                ].join(' ')
            },
            {
                actor: 'user',
                type: 'text',
                text: JSON.stringify(payload, undefined, 2)
            }
        ],
        sessionId: `flow-workload-${context.run.id}`,
        requestId: generateUuid(),
        agentId
    };
    const response = await languageModelService.sendRequest(model, request);
    return await getTextOfResponse(response);
}

async function invokeCommandProvider(commandLine: string, payload: string, cwd: string, timeoutMs: number): Promise<string> {
    const args = parseCommandLine(commandLine);
    if (args.length === 0) {
        throw new Error('LLM provider command is empty.');
    }
    const executable = args[0];
    const childArgs = args.slice(1);
    return new Promise<string>((resolve, reject) => {
        const child = spawn(executable, childArgs, { cwd, windowsHide: true });
        let stdout = '';
        let stderr = '';
        let settled = false;
        const timeout = setTimeout(() => {
            if (settled) {
                return;
            }
            settled = true;
            child.kill();
            reject(new Error(`LLM command provider timed out after ${timeoutMs}ms.`));
        }, timeoutMs);

        child.stdout.on('data', chunk => {
            stdout = truncateFlowText(stdout + chunk, FlowSizeLimits.commandOutputBytes, 'LLM command stdout');
        });
        child.stderr.on('data', chunk => {
            stderr = truncateFlowText(stderr + chunk, FlowSizeLimits.commandOutputBytes, 'LLM command stderr');
        });
        child.on('error', error => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timeout);
            reject(error instanceof Error ? error : new Error(String(error)));
        });
        child.on('close', code => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timeout);
            if (code !== 0) {
                reject(new Error(`LLM command provider exited with code ${code || 0}: ${stderr || stdout}`.trim()));
                return;
            }
            resolve(stdout);
        });
        child.stdin.write(payload);
        child.stdin.end();
    });
}

function invokeE2eMockProvider(context: FlowWorkloadExecutionContext, payload: Record<string, unknown>): string {
    const stateId = context.workload.stateId;
    const filesystemEditEnabled = Boolean(context.workflow.requires?.capabilities?.includes('filesystem.edit'));
    const imageGenerationEnabled = Boolean(context.workflow.requires?.capabilities?.includes('image.generate'));
    switch (stateId) {
        case 'architecture':
            return e2eWorkloadOutput('completed', 'Mock architecture ready.', [
                { path: 'architecture/plan.md', content: '# Architecture\n\nUse contract-first parallel delivery.' }
            ]);
        case 'contract_design':
            return e2eWorkloadOutput('completed', 'Mock contract package ready.', [
                { path: 'contracts/shared.md', content: '# Shared Contract\n\nApproved scope covers backend, frontend, and design assets.' },
                { path: 'contracts/contracts.json', content: JSON.stringify(e2eValidContractPackage()) },
                { path: 'contracts/work-orders/backend.md', content: '# Backend Work Order\n\nExpose GET /feature.' },
                { path: 'contracts/work-orders/frontend.md', content: '# Frontend Work Order\n\nRender the feature panel from GET /feature.' },
                { path: 'contracts/work-orders/designer.md', content: '# Designer Work Order\n\nPrepare public/assets/feature-icon.png.' },
                { path: 'contracts/work-orders/qa.md', content: '# QA Work Order\n\nValidate all branch outputs against the contract.' },
                { path: 'schemas/api.json', content: JSON.stringify({ type: 'object', required: ['method', 'path'] }) },
                { path: 'schemas/assets.json', content: JSON.stringify({ type: 'object', required: ['path', 'format'] }) }
            ], { 'contract.status': 'ready' });
        case 'backend_work':
            return e2eWorkloadOutput('completed', 'Mock backend branch delivered.', [
                { path: 'delivery/backend.md', content: '# Backend\n\nGET /feature returns the contracted FeatureRequest payload.' },
                { path: 'issues/backend.json', content: '[]' }
            ], {}, undefined, filesystemEditEnabled ? [{
                type: 'file.created',
                path: 'src/flow-e2e-effect.txt',
                content: 'Flow E2E file effect applied.\n',
                patch: '--- a/src/flow-e2e-effect.txt\n+++ b/src/flow-e2e-effect.txt\n@@\n+Flow E2E file effect applied.\n',
                summary: 'Create an auditable E2E file effect.',
                status: 'proposed',
                approvalPolicy: 'human_gate_required',
                allowedPaths: ['src/**']
            }] : undefined);
        case 'frontend_work':
            return e2eWorkloadOutput('completed', 'Mock frontend branch delivered.', [
                { path: 'delivery/frontend.md', content: '# Frontend\n\nFeature panel consumes GET /feature and renders contract fields.' },
                { path: 'issues/frontend.json', content: '[]' }
            ]);
        case 'designer_work':
            return e2eWorkloadOutput('completed', 'Mock design branch delivered.', [
                { path: 'delivery/design-assets.md', content: '# Design Assets\n\npublic/assets/feature-icon.png is ready for the feature header.' },
                { path: 'issues/designer.json', content: '[]' }
            ], {}, undefined, imageGenerationEnabled ? [{
                type: 'image.generate',
                prompt: 'Generate a compact feature icon for the Flow E2E design branch.',
                artifactPath: 'images/feature-icon.png',
                summary: 'Generate an auditable E2E image effect.',
                status: 'proposed',
                approvalPolicy: 'human_gate_required',
                provider: 'mock'
            }] : undefined);
        case 'qa':
            if (!context.run.signals.some(signal => signal.key === 'qa.status' && signal.value === 'failed')) {
                return e2eWorkloadOutput('failed', 'Mock QA failed before repair.', [
                    { path: 'qa/report.md', content: '# QA\n\nStatus: failed\nMissing integration evidence before repair.' }
                ], { 'qa.status': 'failed' }, [{
                    severity: 'blocking',
                    type: 'contract_validation',
                    summary: 'Missing integration evidence before repair.',
                    suggestedFollowup: 'Run the bounded repair loop and revalidate.'
                }]);
            }
            return e2eWorkloadOutput('completed', 'Mock QA passed after repair.', [
                { path: 'qa/report.md', content: '# QA\n\nStatus: passed\nAll contract checks pass after repair.' }
            ], { 'qa.status': 'passed' });
        case 'repair_loop':
            return e2eWorkloadOutput('completed', 'Mock repair applied.', [
                { path: 'delivery/repair-notes.md', content: '# Repair\n\nAdded integration evidence for QA revalidation.' }
            ]);
        default:
            return e2eWorkloadOutput('completed', `Mock workload ${stateId} completed.`, e2eAllowedArtifacts(payload));
    }
}

function e2eAllowedArtifacts(payload: Record<string, unknown>): Array<{ path: string; content: string }> {
    const expectedOutput = payload.expectedOutput as { allowedPaths?: unknown } | undefined;
    const allowedPaths = Array.isArray(expectedOutput?.allowedPaths) ? expectedOutput.allowedPaths : ['report.md'];
    return allowedPaths.map(outputPath => ({
        path: String(outputPath),
        content: `# ${String(outputPath)}\n\nMock artifact generated by the E2E LLM provider.`
    }));
}

function e2eWorkloadOutput(
    status: 'completed' | 'failed',
    summary: string,
    artifacts: Array<{ path: string; content: string }>,
    signals: Record<string, string | number | boolean> = {},
    issues?: ParsedAgentIssue[],
    effects?: ParsedAgentEffect[]
): string {
    const normalizedIssues = issues || (status === 'failed' ? [{ severity: 'blocking', type: 'contract_validation', summary }] : []);
    return JSON.stringify({
        result: {
            status,
            summary,
            artifacts,
            signals,
            issues: normalizedIssues
        },
        report: summary,
        artifacts,
        effects: effects || [],
        signals,
        issues: normalizedIssues
    });
}

function e2eValidContractPackage(): Record<string, unknown> {
    return {
        packageId: 'contracts-e2e',
        schemaVersion: 'flow.contracts/v1',
        sharedMd: {
            path: 'contracts/shared.md',
            deliveryObjective: 'Deliver a feature through parallel branches.',
            approvedScope: ['backend endpoint', 'frontend screen', 'design asset'],
            outOfScope: ['billing migration'],
            decisions: ['Use Contracted Parallel Delivery.'],
            canonicalNames: ['FeatureRequest'],
            knownRisks: [{
                id: 'risk-parallel-drift',
                severity: 'medium',
                description: 'Parallel branches can drift.',
                impact: 'QA may fail the first pass.',
                mitigation: 'Run repair once and revalidate.'
            }],
            changeRules: {
                approvalPolicy: 'human_gate_for_scope_or_contract_schema',
                requiresHumanGateForContractMutation: true,
                outOfScopeAction: 'second_run_required',
                maxRevisionAttempts: 1
            }
        },
        api: [{ id: 'feature_read', method: 'GET', path: '/feature', statusCodes: [200] }],
        assets: [{ id: 'feature_icon', path: 'public/assets/feature-icon.png', format: 'png', description: 'Feature icon.', usage: 'header' }],
        workOrders: [
            { id: 'backend', agentRole: 'backend', path: 'contracts/work-orders/backend.md', scope: ['Implement API'], instructions: 'Build the API contract.', requiredInputs: ['contracts/shared.md'], acceptanceCriteria: ['Endpoint matches contract.'] },
            { id: 'frontend', agentRole: 'frontend', path: 'contracts/work-orders/frontend.md', scope: ['Implement UI'], instructions: 'Build the screen.', requiredInputs: ['contracts/shared.md'], acceptanceCriteria: ['Screen calls API.'] },
            { id: 'designer', agentRole: 'designer', path: 'contracts/work-orders/designer.md', scope: ['Prepare assets'], instructions: 'Create required assets.', requiredInputs: ['contracts/shared.md'], acceptanceCriteria: ['Assets match contract.'] },
            { id: 'qa', agentRole: 'qa', path: 'contracts/work-orders/qa.md', scope: ['Validate delivery'], instructions: 'Validate all branches.', requiredInputs: ['contracts/contracts.json'], acceptanceCriteria: ['All contract checks pass.'] }
        ],
        schemas: {
            api: [{ path: 'schemas/api.json', category: 'api', version: '1.0.0' }],
            assets: [{ path: 'schemas/assets.json', category: 'asset', version: '1.0.0' }]
        },
        approvedScope: ['backend endpoint', 'frontend screen', 'design asset'],
        outOfScope: ['billing migration'],
        risks: [{
            id: 'risk-parallel-drift',
            severity: 'medium',
            description: 'Parallel branches can drift.',
            impact: 'QA may fail the first pass.',
            mitigation: 'Run repair once and revalidate.'
        }],
        changeRules: {
            approvalPolicy: 'human_gate_for_scope_or_contract_schema',
            requiresHumanGateForContractMutation: true,
            outOfScopeAction: 'second_run_required',
            maxRevisionAttempts: 1
        }
    };
}

function parseAgentGenerationResult(
    raw: string,
    expectedOutputs: string[],
    context: FlowWorkloadExecutionContext,
    options: { allowFallback?: boolean } = {}
): AgentGenerationResult {
    const trimmed = (raw || '').trim();
    if (!trimmed) {
        if (options.allowFallback !== false) {
            return fallbackGeneration(expectedOutputs, context, undefined);
        }
        throw new Error(`${workloadOutputContractErrorPrefix} empty result payload for "${context.state.id || context.workload.stateId}".`);
    }
    const payload = parseAgentPayload(trimmed);
    if (!payload) {
        if (options.allowFallback !== false) {
            return fallbackGeneration(expectedOutputs, context, trimmed);
        }
        throw new Error(`${workloadOutputContractErrorPrefix} invalid JSON in result payload for "${context.state.id || context.workload.stateId}".`);
    }
    validateRawProviderOutputShape(payload, context);
    const primary = hasObjectKey(payload, 'result') && isRecord(payload.result) ? payload.result : payload;
    const alias = payload.result && isRecord(payload.result) ? payload.result : {};
    const normalizedStatus = normalizeResultStatus(primary.status ?? alias.status ?? 'completed');
    const summary = toTrimmedString(primary.summary) || toTrimmedString(alias.summary) || `Agent workload "${context.state.id || context.workload.stateId}" completed.`;
    const report = toTrimmedString(primary.report) || toTrimmedString(payload.report) || summary;
    const artifacts = parseArtifactOutput(primary.artifacts ?? alias.artifacts ?? payload.artifacts ?? []);
    const effects = parseEffectOutput(primary.effects ?? alias.effects ?? payload.effects ?? []);
    const signals = parseSignalOutput(primary.signals ?? alias.signals ?? payload.signals ?? []);
    const issues = parseIssueOutput(primary.issues ?? alias.issues ?? payload.issues ?? []);
    const memoryCandidates = parseMemoryCandidates(primary.memoryCandidates ?? payload.memoryCandidates ?? []);

    if (artifacts.length > 0) {
        return limitAgentGenerationResult({
            artifacts,
            summary,
            report,
            status: normalizedStatus,
            effects,
            signals,
            issues,
            memoryCandidates
        });
    }

    if (options.allowFallback !== false) {
        const fallbackArtifact = parseSingleContentArtifact(payload, expectedOutputs);
        return limitAgentGenerationResult({
            artifacts: [fallbackArtifact],
            summary,
            report,
            status: normalizedStatus,
            effects,
            signals,
            issues,
            memoryCandidates
        });
    }

    throw new Error(`${workloadOutputContractErrorPrefix} ${context.state.id || context.workload.stateId}: result.artifacts must include at least one generated artifact with path and content.`);
}

function fallbackGeneration(expectedOutputs: string[], context: FlowWorkloadExecutionContext, rawContent?: string): AgentGenerationResult {
    const fallbackOutputs = expectedOutputs.length > 0 ? expectedOutputs : ['report.md'];
    const fallbackPath = fallbackOutputs[0];
    const report = toTrimmedString(rawContent) || '';
    return limitAgentGenerationResult({
        artifacts: [{ path: fallbackPath, content: report || defaultOutputPlaceholder(fallbackPath) }],
        summary: `Agent workload "${context.state.id || context.workload.stateId}" completed.`,
        report,
        status: 'completed',
        effects: [],
        signals: {},
        issues: [],
        memoryCandidates: []
    });
}

function limitAgentGenerationResult(generation: AgentGenerationResult): AgentGenerationResult {
    return {
        ...generation,
        artifacts: generation.artifacts.map(artifact => ({
            ...artifact,
            content: truncateFlowText(artifact.content || '', FlowSizeLimits.artifactBytes, `artifact ${artifact.path}`)
        })),
        report: truncateFlowText(generation.report || '', FlowSizeLimits.reportBytes, 'report'),
        effects: generation.effects.map(effect => ({
            ...effect,
            stdout: effect.stdout ? truncateFlowText(effect.stdout, FlowSizeLimits.commandOutputBytes, 'command stdout') : effect.stdout,
            stderr: effect.stderr ? truncateFlowText(effect.stderr, FlowSizeLimits.commandOutputBytes, 'command stderr') : effect.stderr
        })),
        memoryCandidates: generation.memoryCandidates.map(candidate => ({
            ...candidate,
            content: truncateFlowText(candidate.content || '', FlowSizeLimits.artifactBytes, 'memory candidate')
        }))
    };
}

function normalizeContractPackageGeneration(
    context: FlowWorkloadExecutionContext,
    generation: AgentGenerationResult,
    expectedOutputs: string[],
    inputArtifacts: InputArtifact[]
): void {
    if (!requiresContractPackage(context, expectedOutputs)) {
        return;
    }
    const packageArtifact = findGeneratedArtifact(generation, 'contracts/contracts.json');
    const contractPackage = packageArtifact ? parseJsonObject(packageArtifact.content) : undefined;
    if (!contractPackage) {
        throw new Error(`${workloadOutputContractErrorPrefix} contract_designer did not produce valid JSON at contracts/contracts.json.`);
    }
    if (!contractsSchemaValidator(contractPackage)) {
        const errors = (contractsSchemaValidator.errors || [])
            .map(error => `${error.dataPath || '/'} ${error.message || 'is invalid'}`.trim())
            .join('; ');
        throw new Error(`${workloadOutputContractErrorPrefix} contracts/contracts.json failed flow contract schema validation: ${errors}`);
    }

    const workOrders = normalizeContractWorkOrders(contractPackage.workOrders);
    const missingWorkOrders = requiredWorkOrderRoles(context, expectedOutputs)
        .filter(role => !workOrders.some(workOrder => toTrimmedString(workOrder.agentRole) === role));
    if (missingWorkOrders.length > 0) {
        throw new Error(`${workloadOutputContractErrorPrefix} contracts/contracts.json is missing workOrders for: ${missingWorkOrders.join(', ')}.`);
    }
    upsertGeneratedArtifact(generation, 'contracts/contracts.json', JSON.stringify(contractPackage, undefined, 2));
    upsertGeneratedArtifact(generation, 'contracts/shared.md', renderSharedContractMarkdown(contractPackage, inputArtifacts));

    for (const workOrder of workOrders) {
        const workOrderPath = toTrimmedString(workOrder.path);
        if (workOrderPath && shouldMaterializeContractArtifact(context, expectedOutputs, workOrderPath)) {
            upsertGeneratedArtifact(generation, workOrderPath, renderContractWorkOrderMarkdown(contractPackage, workOrder));
        }
    }
    for (const schemaRef of normalizeSchemaRefs(contractPackage.schemas)) {
        const schemaPath = toTrimmedString(schemaRef.path);
        if (schemaPath && shouldMaterializeContractArtifact(context, expectedOutputs, schemaPath)) {
            upsertGeneratedArtifact(generation, schemaPath, renderContractSchemaJson(contractPackage, schemaRef));
        }
    }
    generation.signals = {
        ...generation.signals,
        'contract.status': generation.signals['contract.status'] || 'ready'
    };
    if (!generation.report) {
        generation.report = `Contract package ${toTrimmedString(contractPackage.packageId) || context.run.id} generated and validated.`;
    }
}

function requiresContractPackage(context: FlowWorkloadExecutionContext, expectedOutputs: string[]): boolean {
    return (context.state.agent || context.workload.agent) === 'contract_designer'
        || expectedOutputs.some(output => normalizeArtifactPath(output) === 'contracts/contracts.json');
}

async function normalizeQaGeneration(
    context: FlowWorkloadExecutionContext,
    generation: AgentGenerationResult,
    inputArtifacts: InputArtifact[]
): Promise<void> {
    if (!isQaWorkload(context)) {
        return;
    }
    const contractArtifact = await resolveArtifactContent(context, inputArtifacts, 'contracts/contracts.json');
    if (!contractArtifact) {
        applyQaFindings(context, generation, [{
            severity: 'blocking',
            type: 'contract_missing',
            summary: 'QA could not find contracts/contracts.json in workload inputs or run artifacts.',
            producer: 'flow-qa-validator',
            impact: 'Contract adherence cannot be validated.',
            suggestedFollowup: 'Include contracts/contracts.json in the QA workload input or keep the contract artifact in the run.'
        }], []);
        return;
    }
    const contractPackage = parseJsonObject(contractArtifact.content);
    if (!contractPackage || !contractsSchemaValidator(contractPackage)) {
        const errors = contractPackage
            ? (contractsSchemaValidator.errors || []).map(error => `${error.dataPath || '/'} ${error.message || 'is invalid'}`.trim()).join('; ')
            : 'contracts/contracts.json is not valid JSON';
        applyQaFindings(context, generation, [{
            severity: 'blocking',
            type: 'contract_schema',
            summary: `QA contract package validation failed: ${errors}.`,
            producer: 'flow-qa-validator',
            impact: 'Contract adherence cannot be trusted.',
            suggestedFollowup: 'Repair the contract package before QA.'
        }], []);
        return;
    }
    const corpus = await buildQaEvidenceCorpus(context, inputArtifacts);
    applyQaFindings(context, generation, validateQaContractAdherence(context, contractPackage, corpus), corpus.evidenceLines);
}

function isQaWorkload(context: FlowWorkloadExecutionContext): boolean {
    const stateId = (context.state.id || context.workload.stateId || '').toLowerCase();
    const agent = (context.state.agent || context.workload.agent || '').toLowerCase();
    return stateId === 'qa' || stateId.includes('qa') || agent === 'qa' || agent.includes('qa');
}

interface QaEvidenceCorpus {
    text: string;
    fileEffectPaths: Set<string>;
    riskyEffectSummaries: string[];
    sharedIssues: string[];
    evidenceLines: string[];
}

async function buildQaEvidenceCorpus(context: FlowWorkloadExecutionContext, inputArtifacts: InputArtifact[]): Promise<QaEvidenceCorpus> {
    const chunks: string[] = [];
    const evidenceLines: string[] = [];
    for (const artifact of inputArtifacts) {
        if (isContractReferenceArtifact(artifact.path)) {
            evidenceLines.push(`Contract reference: ${artifact.path}`);
            continue;
        }
        chunks.push(`${artifact.path}\n${artifact.content}`);
        evidenceLines.push(`Input artifact: ${artifact.path}`);
    }
    for (const artifact of context.run.artifacts) {
        if (isContractReferenceArtifact(artifact.summary || artifact.uri)) {
            evidenceLines.push(`Contract reference: ${artifact.summary || artifact.uri}`);
            continue;
        }
        const filePath = artifactPathFromUri(artifact.uri);
        if (!filePath) {
            continue;
        }
        const content = await readTextFile(filePath);
        if (content === undefined) {
            continue;
        }
        chunks.push(`${artifact.summary || artifact.uri}\n${content}`);
        evidenceLines.push(`Run artifact: ${artifact.summary || artifact.uri}`);
    }
    const fileEffectPaths = new Set<string>();
    const riskyEffectSummaries: string[] = [];
    for (const effect of context.run.effects) {
        const isFileEffect = effect.kind === 'file' || effect.kind === 'file_write' || isFileEffectType(effect.type || '');
        if (effect.status === 'applied') {
            chunks.push([
                effect.type,
                effect.kind,
                effect.path,
                effect.artifactPath,
                effect.command,
                effect.summary,
                effect.patch,
                effect.stdout,
                effect.stderr
            ].filter(Boolean).join('\n'));
            evidenceLines.push(`Applied effect: ${effect.path || effect.command || effect.summary}`);
        }
        if (effect.status === 'applied' && effect.path && isFileEffect) {
            fileEffectPaths.add(normalizeArtifactPath(effect.path));
        }
        if (effect.status === 'blocked' || effect.status === 'failed' || effect.status === 'rejected') {
            riskyEffectSummaries.push(`${effect.status}: ${effect.summary}`);
        }
    }
    const sharedIssues = collectSharedIssues(context);
    chunks.push(sharedIssues.join('\n'));
    return {
        text: chunks.join('\n').toLowerCase(),
        fileEffectPaths,
        riskyEffectSummaries,
        sharedIssues,
        evidenceLines
    };
}

function isContractReferenceArtifact(value: string): boolean {
    const normalized = normalizeArtifactPath(value).toLowerCase();
    return normalized.endsWith('contracts/contracts.json')
        || normalized.endsWith('contracts/shared.md')
        || normalized.includes('/contracts/work-orders/')
        || normalized.startsWith('contracts/work-orders/')
        || normalized.endsWith('schemas/api.json')
        || normalized.endsWith('schemas/assets.json');
}

function validateQaContractAdherence(_context: FlowWorkloadExecutionContext, contractPackage: Record<string, unknown>, corpus: QaEvidenceCorpus): ParsedAgentIssue[] {
    const findings: ParsedAgentIssue[] = [];
    for (const api of normalizeContractApiItems(contractPackage.api)) {
        const route = `${api.method} ${api.path}`;
        if (!containsAll(corpus.text, [api.method.toLowerCase(), api.path.toLowerCase()])) {
            findings.push(qaIssue('route_contract_mismatch', `Missing route evidence for contract API ${route}.`, 'Backend/frontend artifacts or file effects do not show the required API route.'));
        }
    }
    for (const asset of normalizeContractAssets(contractPackage.assets)) {
        const normalizedPath = normalizeArtifactPath(asset.path);
        if (!corpus.text.includes(normalizedPath.toLowerCase()) && !corpus.fileEffectPaths.has(normalizedPath)) {
            findings.push(qaIssue('asset_contract_mismatch', `Missing asset evidence for contract asset ${asset.path}.`, 'Artifacts and file effects do not show the required asset path.'));
        }
    }
    for (const name of normalizeSharedCanonicalNames(contractPackage)) {
        if (!corpus.text.includes(name.toLowerCase())) {
            findings.push(qaIssue('field_name_contract_mismatch', `Missing canonical field/name evidence for ${name}.`, 'Delivery artifacts do not reference the canonical contract name.'));
        }
    }
    for (const risky of corpus.riskyEffectSummaries) {
        findings.push(qaIssue('file_effect_not_applied', `Unsafe or unapplied effect remains: ${risky}.`, 'A delivery effect was blocked, failed, or rejected before QA.'));
    }
    for (const issue of corpus.sharedIssues) {
        findings.push({
            ...qaIssue('shared_issue_open', `Shared delivery issue remains open: ${issue}.`, 'Earlier workload issues must be resolved or explicitly accepted before final QA passes.'),
            severity: issue.toLowerCase().includes('minor') ? 'non_blocking' : 'blocking'
        });
    }
    return findings;
}

function applyQaFindings(context: FlowWorkloadExecutionContext, generation: AgentGenerationResult, findings: ParsedAgentIssue[], evidenceLines: string[]): void {
    const blocking = findings.filter(issue => issue.severity !== 'non_blocking');
    generation.status = blocking.length > 0 ? 'failed' : 'completed';
    generation.signals = {
        ...generation.signals,
        'qa.status': blocking.length > 0 ? 'failed' : 'passed',
        'qa.blocking_issue_count': blocking.length,
        'qa.issue_count': findings.length
    };
    generation.issues = mergeIssues(generation.issues, findings);
    const report = renderQaReport(context, findings, evidenceLines);
    generation.report = generation.report ? `${generation.report}\n\n${report}` : report;
    upsertGeneratedArtifact(generation, 'qa/report.md', generation.report);
}

function renderQaReport(context: FlowWorkloadExecutionContext, findings: ParsedAgentIssue[], evidenceLines: string[]): string {
    const blocking = findings.filter(issue => issue.severity !== 'non_blocking');
    return [
        '# QA Contract Report',
        '',
        `Status: ${blocking.length > 0 ? 'failed' : 'passed'}`,
        `Workflow: ${context.workflow.id}`,
        `Run: ${context.run.id}`,
        '',
        '## Findings',
        ...(findings.length ? findings.map(issue => `- [${issue.severity}] ${issue.type}: ${issue.summary}`) : ['- No contract adherence issues found.']),
        '',
        '## Evidence',
        ...(evidenceLines.length ? evidenceLines.map(line => `- ${line}`) : ['- Run state, artifacts, effects, and shared issues were inspected.'])
    ].join('\n');
}

function qaIssue(type: string, summary: string, impact: string): ParsedAgentIssue {
    return {
        severity: 'blocking',
        type,
        summary,
        producer: 'flow-qa-validator',
        impact,
        suggestedFollowup: 'Repair the delivery artifact/effect and rerun QA.'
    };
}

function mergeIssues(existing: ParsedAgentIssue[], incoming: ParsedAgentIssue[]): ParsedAgentIssue[] {
    const seen = new Set(existing.map(issue => `${issue.type}:${issue.summary}`));
    const merged = [...existing];
    for (const issue of incoming) {
        const key = `${issue.type}:${issue.summary}`;
        if (!seen.has(key)) {
            merged.push(issue);
            seen.add(key);
        }
    }
    return merged;
}

function updateSecondRunSuggestion(run: FlowRun, issues: ParsedAgentIssue[], stateId?: string): void {
    const followupIssues = issues.filter(isSecondRunIssue);
    if (followupIssues.length === 0) {
        return;
    }
    const existing = run.secondRunSuggestion;
    const merged = mergeIssues(existing?.issues || [], followupIssues);
    const issueLines = merged.map(issue => `- [${issue.severity}] ${issue.type}: ${issue.summary}`).join('\n');
    const reason = `QA/agentes registraram ${merged.length} melhoria(s) fora de escopo ou problema(s) nao bloqueante(s).`;
    run.secondRunSuggestion = {
        id: existing?.id || stableId('second-run', run.id),
        status: existing?.status || 'suggested',
        reason,
        title: 'Segunda run sugerida',
        sourceRunId: run.id,
        sourceIssueCount: merged.length,
        issues: merged,
        prompt: [
            `Continue a partir da run ${run.id}.`,
            reason,
            stateId ? `Estado de origem mais recente: ${stateId}.` : undefined,
            '',
            'Trate apenas os follow-ups abaixo, preservando o escopo entregue na run original:',
            issueLines
        ].filter(Boolean).join('\n'),
        createdAt: existing?.createdAt || timestamp()
    };
}

function isSecondRunIssue(issue: Pick<ParsedAgentIssue, 'severity' | 'type' | 'summary' | 'suggestedFollowup'>): boolean {
    const severity = (issue.severity || '').toLowerCase();
    const text = [issue.type, issue.summary, issue.suggestedFollowup].join(' ').toLowerCase();
    if (severity === 'non_blocking' || severity === 'warning' || severity === 'minor') {
        return true;
    }
    return text.includes('out-of-scope')
        || text.includes('out of scope')
        || text.includes('fora de escopo')
        || text.includes('followup')
        || text.includes('follow-up')
        || text.includes('melhoria')
        || text.includes('improvement')
        || text.includes('second run')
        || text.includes('segunda run');
}

async function resolveArtifactContent(context: FlowWorkloadExecutionContext, inputArtifacts: InputArtifact[], requestedPath: string): Promise<InputArtifact | undefined> {
    const normalized = normalizeArtifactPath(requestedPath);
    const input = inputArtifacts.find(artifact => normalizeArtifactPath(artifact.path) === normalized);
    if (input) {
        return input;
    }
    const filePath = findInputArtifactPath(context.run, requestedPath);
    const content = filePath ? await readTextFile(filePath) : undefined;
    return content === undefined ? undefined : { path: requestedPath, content };
}

function collectSharedIssues(context: FlowWorkloadExecutionContext): string[] {
    const issues = new Set<string>();
    for (const workload of context.run.workloads) {
        if (workload.id === context.workload.id || workload.stateId === context.workload.stateId) {
            continue;
        }
        for (const issue of workload.issues || []) {
            if (issue) {
                issues.add(issue);
            }
        }
        for (const issue of workload.outputEnvelope?.issues || []) {
            if (isBlockingIssue(issue)) {
                issues.add(issue.summary);
            }
        }
    }
    for (const signal of context.run.signals) {
        if (signal.stateId === context.workload.stateId) {
            continue;
        }
        if (signal.key.endsWith('.issue') && typeof signal.value === 'string' && signal.value.trim()) {
            issues.add(signal.value.trim());
        }
    }
    for (const event of context.run.events) {
        if (event.type !== 'issue.recorded' || event.stateId === context.workload.stateId) {
            continue;
        }
        const payload = event.payload || {};
        const summary = toTrimmedString(payload.summary || payload.message || payload.reason || event.message);
        if (summary && isBlockingIssue(payload)) {
            issues.add(summary);
        }
    }
    return [...issues];
}

function isBlockingIssue(issue: Pick<ParsedAgentIssue, 'severity' | 'summary'> | Record<string, unknown>): boolean {
    const severity = toTrimmedString((issue as Record<string, unknown>).severity).toLowerCase();
    if ((issue as Record<string, unknown>).blocking === true) {
        return true;
    }
    return severity === 'blocking' || severity === 'critical' || severity === 'high';
}

function normalizeContractApiItems(value: unknown): Array<{ method: string; path: string }> {
    return Array.isArray(value) ? value
        .map(item => isRecord(item) ? { method: toTrimmedString(item.method), path: toTrimmedString(item.path) } : { method: '', path: '' })
        .filter(item => item.method && item.path) : [];
}

function normalizeContractAssets(value: unknown): Array<{ path: string }> {
    return Array.isArray(value) ? value
        .map(item => isRecord(item) ? { path: toTrimmedString(item.path) } : { path: '' })
        .filter(item => item.path) : [];
}

function normalizeSharedCanonicalNames(contractPackage: Record<string, unknown>): string[] {
    const shared = isRecord(contractPackage.sharedMd) ? contractPackage.sharedMd : {};
    const value = shared.canonicalNames;
    return Array.isArray(value) ? value.map(toTrimmedString).filter(Boolean) : [];
}

function containsAll(text: string, values: string[]): boolean {
    return values.every(value => text.includes(value));
}

function findGeneratedArtifact(generation: AgentGenerationResult, artifactPath: string): { path: string; content: string } | undefined {
    const normalized = normalizeArtifactPath(artifactPath);
    return generation.artifacts.find(artifact => normalizeArtifactPath(artifact.path) === normalized);
}

function upsertGeneratedArtifact(generation: AgentGenerationResult, artifactPath: string, content: string): void {
    const existing = findGeneratedArtifact(generation, artifactPath);
    if (existing) {
        existing.content = content;
        return;
    }
    generation.artifacts.push({ path: artifactPath, content });
}

function parseJsonObject(content: string): Record<string, unknown> | undefined {
    try {
        const parsed = JSON.parse(content);
        return isRecord(parsed) ? parsed : undefined;
    } catch {
        return undefined;
    }
}

function normalizeContractWorkOrders(value: unknown): Record<string, unknown>[] {
    if (Array.isArray(value)) {
        return value.filter(isRecord);
    }
    if (isRecord(value)) {
        return Object.values(value).filter(isRecord);
    }
    return [];
}

function requiredWorkOrderRoles(context: FlowWorkloadExecutionContext, expectedOutputs: string[]): string[] {
    const requiredRoles = ['backend', 'frontend', 'designer', 'qa'];
    if ((context.state.agent || context.workload.agent) === 'contract_designer') {
        return requiredRoles;
    }
    const normalizedOutputs = new Set(expectedOutputs.map(normalizeArtifactPath));
    return requiredRoles.filter(role => normalizedOutputs.has(`contracts/work-orders/${role}.md`));
}

function normalizeSchemaRefs(value: unknown): Record<string, unknown>[] {
    if (!isRecord(value)) {
        return [];
    }
    return Object.values(value).flatMap(entry => Array.isArray(entry) ? entry.filter(isRecord) : isRecord(entry) ? [entry] : []);
}

function shouldMaterializeContractArtifact(context: FlowWorkloadExecutionContext, expectedOutputs: string[], artifactPath: string): boolean {
    if ((context.state.agent || context.workload.agent) === 'contract_designer') {
        return true;
    }
    const normalizedPath = normalizeArtifactPath(artifactPath);
    return expectedOutputs.some(output => normalizeArtifactPath(output) === normalizedPath);
}

function renderSharedContractMarkdown(contractPackage: Record<string, unknown>, inputArtifacts: InputArtifact[]): string {
    const shared = isRecord(contractPackage.sharedMd) ? contractPackage.sharedMd : {};
    return [
        `# Shared Contract - ${toTrimmedString(contractPackage.packageId) || 'flow-contract'}`,
        '',
        `Objective: ${toTrimmedString(shared.deliveryObjective) || 'Deliver the approved workflow request.'}`,
        '',
        '## Approved Scope',
        ...markdownList(shared.approvedScope || contractPackage.approvedScope),
        '',
        '## Out Of Scope',
        ...markdownList(shared.outOfScope || contractPackage.outOfScope),
        '',
        '## Decisions',
        ...markdownList(shared.decisions),
        '',
        '## Canonical Names',
        ...markdownList(shared.canonicalNames),
        '',
        '## Inputs',
        ...(inputArtifacts.length ? inputArtifacts.map(input => `- ${input.path}`) : ['- none']),
        '',
        '## Change Rules',
        `Approval policy: ${toTrimmedString(isRecord(contractPackage.changeRules) ? contractPackage.changeRules.approvalPolicy : undefined) || 'strict_human_gate'}`
    ].join('\n');
}

function renderContractWorkOrderMarkdown(contractPackage: Record<string, unknown>, workOrder: Record<string, unknown>): string {
    const role = toTrimmedString(workOrder.agentRole) || 'other';
    return [
        `# Work Order - ${toTrimmedString(workOrder.id) || toTrimmedString(workOrder.agentRole) || 'agent'}`,
        '',
        `Contract package: ${toTrimmedString(contractPackage.packageId) || 'flow-contract'}`,
        `Role: ${role}`,
        `Priority: ${toTrimmedString(workOrder.priority) || '5'}`,
        '',
        '## Scope',
        ...markdownList(workOrder.scope),
        '',
        '## Instructions',
        toTrimmedString(workOrder.instructions) || 'Follow the shared contract and report issues for out-of-scope changes.',
        '',
        '## Required Inputs',
        ...markdownList(workOrder.requiredInputs),
        '',
        '## Acceptance Criteria',
        ...markdownList(workOrder.acceptanceCriteria),
        '',
        '## Contract References',
        ...roleContractReferences(contractPackage, role),
        '',
        '## Role Checklist',
        ...roleChecklist(role),
        '',
        `Out-of-scope behavior: ${toTrimmedString(workOrder.outOfScopeBehavior) || 'continue_with_issues'}`
    ].join('\n');
}

function roleContractReferences(contractPackage: Record<string, unknown>, role: string): string[] {
    const lines: string[] = [];
    const apiContracts = normalizeRecordArray(contractPackage.api);
    const assets = normalizeRecordArray(contractPackage.assets);
    const schemas = normalizeSchemaRefs(contractPackage.schemas);
    if (role === 'backend' || role === 'frontend' || role === 'qa') {
        for (const item of apiContracts) {
            const method = toTrimmedString(item.method) || 'GET';
            const apiPath = toTrimmedString(item.path) || '/';
            const summary = toTrimmedString(item.summary);
            lines.push(`- API ${toTrimmedString(item.id) || apiPath}: ${method} ${apiPath}${summary ? ` - ${summary}` : ''}`);
        }
    }
    if (role === 'designer' || role === 'frontend' || role === 'qa') {
        for (const item of assets) {
            const assetPath = toTrimmedString(item.path);
            const format = toTrimmedString(item.format);
            const usage = toTrimmedString(item.usage);
            lines.push(`- Asset ${toTrimmedString(item.id) || assetPath}: ${assetPath}${format ? ` (${format})` : ''}${usage ? ` for ${usage}` : ''}`);
        }
    }
    if (role === 'qa') {
        for (const schema of schemas) {
            lines.push(`- Schema ${toTrimmedString(schema.category) || 'contract'}: ${toTrimmedString(schema.path) || 'schemas/unknown.json'} v${toTrimmedString(schema.version) || '1.0.0'}`);
        }
    }
    return lines.length ? lines : ['- contracts/shared.md', '- contracts/contracts.json'];
}

function roleChecklist(role: string): string[] {
    switch (role) {
        case 'backend':
            return [
                '- Implement only the approved API/data contract surface.',
                '- Emit issues for missing schema details instead of changing the contract.',
                '- Produce backend delivery notes with touched files, tests, and contract deviations.'
            ];
        case 'frontend':
            return [
                '- Build UI behavior against the approved API names and response shapes.',
                '- Use only approved assets or record a blocking issue.',
                '- Produce frontend delivery notes with routes/components and integration assumptions.'
            ];
        case 'designer':
            return [
                '- Create or specify only the approved asset set.',
                '- Preserve required dimensions, formats, usage, and naming.',
                '- Produce design delivery notes with asset paths and any unresolved constraints.'
            ];
        case 'qa':
            return [
                '- Validate backend, frontend, and design outputs against contracts/contracts.json.',
                '- Validate API and asset claims against schemas/api.json and schemas/assets.json.',
                '- Emit qa.status=passed only when every acceptance criterion is satisfied; otherwise emit qa.status=failed with repair notes.'
            ];
        default:
            return ['- Follow contracts/shared.md and report out-of-scope work as issues.'];
    }
}

function normalizeRecordArray(value: unknown): Record<string, unknown>[] {
    return Array.isArray(value) ? value.filter(isRecord) : [];
}

function renderContractSchemaJson(contractPackage: Record<string, unknown>, schemaRef: Record<string, unknown>): string {
    const category = toTrimmedString(schemaRef.category);
    const title = category === 'asset' ? 'Flow Asset Contract' : 'Flow API Contract';
    return JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title,
        $comment: `Generated from ${toTrimmedString(contractPackage.packageId) || 'flow-contract'} ${toTrimmedString(schemaRef.path)}`,
        type: 'object',
        additionalProperties: true
    }, undefined, 2);
}

function markdownList(value: unknown): string[] {
    if (Array.isArray(value)) {
        const items = value.map(item => typeof item === 'string' ? item : JSON.stringify(item)).filter(Boolean);
        return items.length ? items.map(item => `- ${item}`) : ['- none'];
    }
    const single = toTrimmedString(value);
    return single ? [`- ${single}`] : ['- none'];
}

function parseAgentPayload(raw: string): Record<string, unknown> | undefined {
    const trimmed = raw.trim();
    try {
        return JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
        const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (!fenced) {
            return undefined;
        }
        try {
            return JSON.parse(fenced[1] || '') as Record<string, unknown>;
        } catch {
            return undefined;
        }
    }
}

async function resolveAgentResultPayload(rawResult: string, workloadDir: string): Promise<string> {
    if (parseAgentPayload(rawResult)) {
        return rawResult;
    }
    const fallbackResultPath = path.join(workloadDir, 'output', 'result.json');
    const resultJson = await readTextFile(fallbackResultPath);
    if (resultJson && parseAgentPayload(resultJson)) {
        return resultJson;
    }
    return rawResult;
}

function validateWorkloadOutputEnvelope(
    output: FlowWorkloadOutputEnvelope,
    context: FlowWorkloadExecutionContext
): void {
    if (workloadOutputSchemaValidator(output)) {
        return;
    }
    const details = workloadOutputValidationErrors(workloadOutputSchemaValidator.errors);
    const stateId = context.state.id || context.workload.stateId;
    throw new Error(`${workloadOutputContractErrorPrefix} ${stateId}: ${details}`);
}

async function writeValidatedWorkloadResultJson(
    workloadDir: string,
    output: FlowWorkloadOutputEnvelope,
    context: FlowWorkloadExecutionContext
): Promise<string> {
    validateWorkloadOutputEnvelope(output, context);
    const resultPath = path.join(workloadDir, 'output', 'result.json');
    await fs.mkdir(path.dirname(resultPath), { recursive: true });
    await fs.writeFile(resultPath, `${JSON.stringify(output, undefined, 2)}\n`, 'utf8');
    const persisted = JSON.parse(await fs.readFile(resultPath, 'utf8')) as FlowWorkloadOutputEnvelope;
    validateWorkloadOutputEnvelope(persisted, context);
    return FileUri.create(resultPath).toString();
}

function workloadOutputValidationErrors(errors: unknown): string {
    if (!Array.isArray(errors) || errors.length === 0) {
        return 'output does not match workload output schema.';
    }
    return errors
        .map((error: {
            instancePath?: string;
            dataPath?: string;
            message?: string;
        }) => {
            const path = error.instancePath || error.dataPath || '#';
            return `${path} ${error.message || 'is invalid'}`;
        })
        .join('; ');
}

function validateRawProviderOutputShape(payload: Record<string, unknown>, context: FlowWorkloadExecutionContext): void {
    validateRawEffectOutputShape(payload.effects, context, 'effects');
    validateRawArtifactOutputShape(payload.artifacts, context, 'artifacts');
    if (isRecord(payload.result)) {
        validateRawEffectOutputShape(payload.result.effects, context, 'result.effects');
        validateRawArtifactOutputShape(payload.result.artifacts, context, 'result.artifacts');
    }
}

function validateRawEffectOutputShape(value: unknown, context: FlowWorkloadExecutionContext, pathLabel: string): void {
    if (value === undefined) {
        return;
    }
    if (!Array.isArray(value)) {
        throwRawProviderShapeError(context, `${pathLabel} must be an array when provided.`);
    }
    value.forEach((item, index) => {
        if (!isRecord(item)) {
            throwRawProviderShapeError(context, `${pathLabel}[${index}] must be an object.`);
        }
        const type = item.type ?? item.kind;
        if (type !== undefined && typeof type !== 'string') {
            throwRawProviderShapeError(context, `${pathLabel}[${index}].type must be a string when provided.`);
        }
        if (typeof type === 'string' && !type.trim()) {
            throwRawProviderShapeError(context, `${pathLabel}[${index}].type must be a non-empty string when provided.`);
        }
    });
}

function validateRawArtifactOutputShape(value: unknown, context: FlowWorkloadExecutionContext, pathLabel: string): void {
    if (value === undefined) {
        return;
    }
    if (!Array.isArray(value) && !isRecord(value)) {
        throwRawProviderShapeError(context, `${pathLabel} must be an array or object map when provided.`);
    }
    if (Array.isArray(value)) {
        value.forEach((item, index) => {
            if (!isRecord(item)) {
                throwRawProviderShapeError(context, `${pathLabel}[${index}] must be an object.`);
            }
            const artifactPath = toTrimmedString(item.path);
            if (!artifactPath) {
                throwRawProviderShapeError(context, `${pathLabel}[${index}].path must be a non-empty string.`);
            }
            const content = toTrimmedString(item.content);
            if (!content) {
                throwRawProviderShapeError(context, `${pathLabel}[${index}].content must be a non-empty string.`);
            }
        });
        return;
    }
    for (const [artifactPath, content] of Object.entries(value)) {
        if (!toTrimmedString(artifactPath)) {
            throwRawProviderShapeError(context, `${pathLabel} keys must be non-empty strings.`);
        }
        if (!toTrimmedString(content)) {
            throwRawProviderShapeError(context, `${pathLabel}[${artifactPath}] must be a non-empty string.`);
        }
    }
}

function throwRawProviderShapeError(context: FlowWorkloadExecutionContext, detail: string): never {
    const stateId = context.state.id || context.workload.stateId;
    throw new Error(`${workloadOutputContractErrorPrefix} ${stateId}: ${detail}`);
}

function parseArtifactOutput(value: unknown): Array<{ path: string; content: string }> {
    if (Array.isArray(value)) {
        return value
            .filter(item => item && typeof item === 'object')
            .map(item => {
                const candidate = item as Record<string, unknown>;
                const artifactPath = toTrimmedString(candidate.path);
                if (!artifactPath) {
                    return undefined;
                }
                return { path: artifactPath, content: toTrimmedString(candidate.content) || '' };
            })
            .filter((entry): entry is { path: string; content: string } => entry !== undefined);
    }
    if (isRecord(value)) {
        return Object.entries(value)
            .filter(([artifactPath]) => !!artifactPath)
            .map(([artifactPath, content]) => ({ path: artifactPath, content: String(content ?? '') }));
    }
    return [];
}

function parseEffectOutput(value: unknown): ParsedAgentEffect[] {
    if (!Array.isArray(value)) {
        return [];
    }
    const mapped = value
        .filter(item => isRecord(item))
        .map((item): ParsedAgentEffect => {
            const candidate = item as Record<string, unknown>;
            const type = toTrimmedString(candidate.type || candidate.kind) || 'notification';
            const summary = toTrimmedString(candidate.summary) || `${type} effect for workload artifact.`;
            return {
                type,
                summary,
                path: toOptionalTrimmedString(candidate.path),
                prompt: toOptionalTrimmedString(candidate.prompt),
                artifactPath: toOptionalTrimmedString(candidate.artifactPath),
                mimeType: toOptionalTrimmedString(candidate.mimeType),
                provider: toOptionalTrimmedString(candidate.provider),
                bytes: parseOptionalNumber(candidate.bytes),
                command: toOptionalTrimmedString(candidate.command),
                cwd: toOptionalTrimmedString(candidate.cwd),
                env: parseRecordEnv(candidate.env),
                allowedEnv: parseStringArray(candidate.allowedEnv),
                allowedCommands: parseStringArray(candidate.allowedCommands),
                allowedPaths: parseStringArray(candidate.allowedPaths),
                deniedPaths: parseStringArray(candidate.deniedPaths),
                timeoutMs: parseOptionalNumber(candidate.timeoutMs),
                exitCode: parseOptionalNumber(candidate.exitCode),
                stdout: toOptionalTrimmedString(candidate.stdout),
                stderr: toOptionalTrimmedString(candidate.stderr),
                timedOut: candidate.timedOut === true,
                content: toOptionalString(candidate.content) ?? toOptionalString(candidate.contentAfter),
                hashBefore: toOptionalTrimmedString(candidate.hashBefore),
                hashAfter: toOptionalTrimmedString(candidate.hashAfter),
                patch: toOptionalTrimmedString(candidate.patch),
                approvalPolicy: toOptionalTrimmedString(candidate.approvalPolicy),
                status: toOptionalTrimmedString(candidate.status)
            };
        });
    return mapped.filter(candidate => candidate.summary);
}

function parseSignalOutput(value: unknown): Record<string, SignalValue> {
    const entries: Record<string, SignalValue> = {};
    if (isRecord(value)) {
        for (const [key, rawValue] of Object.entries(value)) {
            if (!key || !isSignalPrimitive(rawValue)) {
                continue;
            }
            entries[key] = rawValue;
        }
        return entries;
    }
    if (Array.isArray(value)) {
        for (const item of value) {
            if (!isRecord(item)) {
                continue;
            }
            const key = toTrimmedString(item.key);
            if (!key) {
                continue;
            }
            const valueCandidate = (item as Record<string, unknown>).value;
            if (!isSignalPrimitive(valueCandidate)) {
                continue;
            }
            entries[key] = valueCandidate;
        }
    }
    return entries;
}

function parseIssueOutput(value: unknown): ParsedAgentIssue[] {
    if (!Array.isArray(value)) {
        return [];
    }
    const issues: ParsedAgentIssue[] = value
        .map(item => {
            if (typeof item === 'string') {
                const summary = item.trim();
                if (!summary) {
                    return undefined;
                }
                return {
                    severity: 'non_blocking',
                    type: 'workload_issue',
                    summary
                };
            }
            if (isRecord(item)) {
                const record = item as Record<string, unknown>;
                const summary = toTrimmedString(record.summary);
                if (!summary) {
                    return undefined;
                }
                return {
                    severity: toTrimmedString(record.severity) || 'non_blocking',
                    type: toTrimmedString(record.type) || 'workload_issue',
                    summary,
                    producer: toTrimmedString(record.producer) || undefined,
                    impact: toTrimmedString(record.impact) || undefined,
                    suggestedFollowup: toTrimmedString(record.suggestedFollowup) || undefined
                };
            }
            return undefined;
        })
        .filter((issue): issue is ParsedAgentIssue => issue !== undefined && Boolean(issue.summary));
    return issues;
}

function parseMemoryCandidates(value: unknown): MemoryCandidate[] {
    if (!Array.isArray(value)) {
        return [];
    }
    const parsed: MemoryCandidate[] = [];
    value.forEach((item, index) => {
        if (typeof item === 'string') {
            parsed.push(buildMemoryCandidateFromText(item, undefined, undefined, index));
            return;
        }
        if (!isRecord(item)) {
            return;
        }
        const record = item as Record<string, unknown>;
        parsed.push(buildMemoryCandidateFromRecord(record, index));
    });
    return parsed.filter(item => item && item.content);
}

function buildMemoryCandidateFromText(
    raw: string,
    stateId: string | undefined,
    runId: string | undefined,
    index: number
): MemoryCandidate {
    return {
        id: stableId('memory-candidate', runId || 'run', stateId || 'state', `candidate-${index}`),
        runId: runId || 'run',
        stateId,
        source: 'artifact',
        kind: 'fact',
        content: raw.trim(),
        reason: 'LLM suggested memory content.',
        confidence: 0.6,
        status: 'candidate',
        createdAt: timestamp()
    };
}

function buildMemoryCandidateFromRecord(record: Record<string, unknown>, index: number): MemoryCandidate {
    const content = toTrimmedString(record.content) || toTrimmedString(record.summary) || '';
    const candidateId = toTrimmedString(record.id) || stableId('memory-candidate', toTrimmedString(record.runId) || 'run', toTrimmedString(record.stateId) || 'state', `${index}`, content.slice(0, 32));
    return {
        id: candidateId,
        runId: toTrimmedString(record.runId) || 'run',
        stateId: toTrimmedString(record.stateId) || undefined,
        source: parseMemoryCandidateSource(record.source),
        kind: parseMemoryCandidateKind(record.kind),
        scope: parseMemoryCandidateScope(record.scope),
        content,
        reason: toTrimmedString(record.reason) || 'LLM suggested memory content.',
        confidence: normalizeConfidence(record.confidence),
        status: 'candidate',
        createdAt: timestamp()
    };
}

function parseMemoryCandidateSource(value: unknown): 'workflow_state' | 'effect' | 'artifact' | 'signal' {
    const candidate = toTrimmedString(value);
    if (candidate === 'artifact' || candidate === 'effect' || candidate === 'signal' || candidate === 'workflow_state') {
        return candidate;
    }
    return 'workflow_state';
}

function parseMemoryCandidateKind(value: unknown): 'fact' | 'decision' | 'preference' | 'instruction' | 'summary' {
    const candidate = toTrimmedString(value);
    if (candidate === 'fact' || candidate === 'decision' || candidate === 'preference' || candidate === 'instruction' || candidate === 'summary') {
        return candidate;
    }
    return 'fact';
}

function parseMemoryCandidateScope(value: unknown): MemoryCandidate['scope'] | undefined {
    const candidate = toTrimmedString(value);
    if (
        candidate === 'ide'
        || candidate === 'workspace'
        || candidate === 'project'
        || candidate === 'workflow'
        || candidate === 'run'
        || candidate === 'agent'
    ) {
        return candidate;
    }
    return undefined;
}

function parseSingleContentArtifact(payload: Record<string, unknown>, expectedOutputs: string[]): { path: string; content: string } {
    const fallbackOutputs = expectedOutputs.length > 0 ? expectedOutputs : ['report.md'];
    const outputPath = fallbackOutputs[0];
    const content = toTrimmedString(payload.content)
        || toTrimmedString(payload.report)
        || toTrimmedString(payload.text)
        || defaultOutputPlaceholder(outputPath);
    return { path: outputPath, content };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toTrimmedString(value: unknown): string {
    if (typeof value === 'string') {
        return value.trim();
    }
    return '';
}

function toOptionalTrimmedString(value: unknown): string | undefined {
    const trimmed = toTrimmedString(value);
    return trimmed || undefined;
}

function toOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

function parseStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.map(item => toTrimmedString(item)).filter(Boolean);
}

function parseOptionalNumber(value: unknown): number | undefined {
    const parsed = typeof value === 'number' ? value : Number.parseInt(toTrimmedString(value), 10);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function parseRecordEnv(value: unknown): Record<string, string | number | boolean> {
    if (!isRecord(value)) {
        return {};
    }
    const env: Record<string, string | number | boolean> = {};
    for (const [key, raw] of Object.entries(value)) {
        if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
            env[key] = raw;
        }
    }
    return env;
}

function stringifyEnv(value: Record<string, string | number | boolean> | undefined): Record<string, string> | undefined {
    if (!value) {
        return undefined;
    }
    const env: Record<string, string> = {};
    for (const [key, raw] of Object.entries(value)) {
        env[key] = String(raw);
    }
    return env;
}

function commandEffectSummary(stateId: string, status: string, command: string): string {
    return `Command effect ${status} for ${stateId}: ${command}`;
}

function hasObjectKey(value: unknown, key: string): boolean {
    return isRecord(value) && Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeResultStatus(rawStatus: unknown): string {
    const normalized = toTrimmedString(rawStatus).toLowerCase();
    if (!normalized || normalized === 'ok' || normalized === 'success') {
        return 'completed';
    }
    if (normalized === 'error' || normalized === 'fail' || normalized === 'abort') {
        return 'failed';
    }
    const allowed = ['pending', 'ready', 'running', 'completed', 'failed', 'waiting', 'review', 'done'];
    return allowed.includes(normalized) ? normalized : 'completed';
}

function isSignalPrimitive(value: unknown): value is SignalValue {
    const typed = value as SignalValue;
    return typeof typed === 'string' || typeof typed === 'number' || typeof typed === 'boolean';
}

function normalizeWorkloadCompletionStatus(context: FlowWorkloadExecutionContext, effects: ParsedAgentEffect[]): string {
    const workloadStatus = context.state.status || '';
    const signalStatus = context.run.stateStatuses[context.workload.stateId];
    if (workloadStatus === 'failed' || signalStatus === 'failed') {
        return 'failed';
    }
    if (effects.some(effect => effect.type === 'memory_write')) {
        return 'completed';
    }
    return 'completed';
}

function normalizeEffectStatus(raw: string | undefined, failed: boolean): FlowEffect['status'] {
    const normalized = normalizeWorkloadStatusRaw(raw).toLowerCase();
    if (normalized === 'approved' || normalized === 'applied' || normalized === 'rejected' || normalized === 'blocked' || normalized === 'failed') {
        return normalized;
    }
    if (failed) {
        return 'failed';
    }
    return 'proposed';
}

function fileEffectTransitionStatuses(effect: ParsedAgentEffect, result: AppliedFileEffect | undefined, finalStatus: FlowEffect['status']): FlowEffect['status'][] {
    const statuses: FlowEffect['status'][] = ['proposed'];
    const requestedStatus = normalizeWorkloadStatusRaw(effect.status);
    if (requestedStatus === 'rejected') {
        addStatus(statuses, 'rejected');
        return statuses;
    }
    if (result?.blocked) {
        addStatus(statuses, 'blocked');
        return statuses;
    }
    if (result?.applied || requestedStatus === 'approved' || requestedStatus === 'applied' || normalizeWorkloadStatusRaw(effect.approvalPolicy) === 'auto_apply') {
        addStatus(statuses, 'approved');
    }
    addStatus(statuses, finalStatus);
    return statuses;
}

function addStatus(statuses: FlowEffect['status'][], status: FlowEffect['status']): void {
    if (!statuses.includes(status)) {
        statuses.push(status);
    }
}

function fileEffectApproved(effect: ParsedAgentEffect): boolean {
    const status = normalizeWorkloadStatusRaw(effect.status);
    const policy = normalizeWorkloadStatusRaw(effect.approvalPolicy);
    return status === 'approved' || status === 'applied' || policy === 'auto_apply';
}

function imageEffectApproved(effect: ParsedAgentEffect): boolean {
    const status = normalizeWorkloadStatusRaw(effect.status);
    return status === 'approved' || status === 'applied';
}

function fileEffectStatus(effect: ParsedAgentEffect, result: AppliedFileEffect): FlowEffect['status'] {
    if (normalizeWorkloadStatusRaw(effect.status) === 'rejected') {
        return 'rejected';
    }
    if (result.applied) {
        return 'applied';
    }
    if (result.blocked) {
        return 'blocked';
    }
    if (result.requiresApproval) {
        return 'proposed';
    }
    return 'failed';
}

function normalizeWorkloadStatusRaw(value: string | undefined): string {
    return toTrimmedString(value).toLowerCase();
}

function parseConfidence(value: unknown): number {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(toTrimmedString(value));
    if (!Number.isFinite(parsed)) {
        return 0.5;
    }
    if (parsed < 0) {
        return 0;
    }
    if (parsed > 1) {
        return 1;
    }
    return parsed;
}

function buildStructuredRunReport(context: FlowWorkloadExecutionContext): Record<string, unknown> {
    const { workflow, run } = context;
    const workloadEventSeqs = new Map<string, number[]>();
    run.events.forEach((event, index) => {
        if (!event.workloadId) {
            return;
        }
        const seqs = workloadEventSeqs.get(event.workloadId) || [];
        seqs.push(index + 1);
        workloadEventSeqs.set(event.workloadId, seqs);
    });
    const issues = collectRunIssues(run);
    const pending = collectRunPending(run);
    return {
        schemaVersion: 'flow.final-report/v1',
        generatedAt: timestamp(),
        run: {
            id: run.id,
            workflowId: run.workflowId,
            status: run.status,
            prompt: truncateFlowText(run.prompt, FlowSizeLimits.promptBytes, 'prompt'),
            createdAt: run.createdAt,
            updatedAt: run.updatedAt,
            executionMode: run.executionMode,
            executionModeMessage: run.executionModeMessage,
            externalKernelMetadata: run.externalKernelMetadata
        },
        workflow: {
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
            version: workflow.version,
            file: workflow.file,
            capabilities: [...new Set(workflow.requires?.capabilities || [])].sort(),
            agents: workflow.agents || {},
            states: Object.entries(workflow.states).map(([id, state]) => ({
                id,
                type: state.type,
                agent: state.agent,
                status: run.stateStatuses[id] || 'pending',
                outputs: state.outputs || [],
                input: state.input,
                gates: state.gates || [],
                waitFor: state.waitFor || []
            })),
            transitions: workflow.transitions.map(transition => ({
                id: transition.id,
                from: transition.from,
                to: transition.to,
                on: transition.on,
                guard: transition.guard,
                priority: transition.priority,
                fired: run.events.some(event => event.type === 'transition.fired' && (
                    event.transitionId === transition.id
                    || event.payload?.transitionId === transition.id
                    || (event.stateId === transition.from && event.payload?.to === transition.to)
                ))
            }))
        },
        workloads: run.workloads.map(workload => ({
            id: workload.id,
            stateId: workload.stateId,
            branchId: workload.branchId,
            agent: workload.agent,
            attempt: workload.attempt,
            previousWorkloadId: workload.previousWorkloadId,
            status: workload.status,
            inputArtifacts: workload.inputArtifacts,
            outputArtifacts: workload.outputArtifacts,
            effectIds: workload.effectIds,
            issues: workload.issues,
            reportUri: workload.reportUri,
            eventSeqs: workloadEventSeqs.get(workload.id) || []
        })),
        gates: run.gates.map(gate => ({
            id: gate.id,
            title: gate.title,
            stateId: gate.stateId,
            status: gate.status || 'pending',
            prompt: gate.prompt
        })),
        artifacts: run.artifacts.map(artifact => ({
            id: artifact.id,
            stateId: artifact.stateId,
            kind: artifact.kind,
            uri: artifact.uri,
            summary: artifact.summary,
            createdAt: artifact.createdAt
        })),
        effects: run.effects.map(effect => withoutUndefined({
            id: effect.id,
            stateId: effect.stateId,
            kind: effect.kind,
            type: effect.type,
            path: effect.path,
            artifactPath: effect.artifactPath,
            command: effect.command,
            status: effect.status,
            approvalPolicy: effect.approvalPolicy,
            summary: effect.summary,
            hashBefore: effect.hashBefore,
            hashAfter: effect.hashAfter
        })),
        issues,
        repairs: collectRunRepairs(run),
        memoryWrites: run.memoryWrites || [],
        memoryCandidates: run.memoryCandidates || [],
        capabilities: {
            required: [...new Set(workflow.requires?.capabilities || [])].sort(),
            executionMode: run.executionMode,
            deterministicFallback: run.executionMode === 'kernel_simulated'
        },
        pending,
        secondRunSuggestion: run.secondRunSuggestion,
        eventLog: run.events.map((event, index) => ({
            seq: index + 1,
            id: event.id,
            type: event.type,
            timestamp: event.timestamp,
            stateId: event.stateId,
            transitionId: event.transitionId,
            workloadId: event.workloadId,
            gateId: event.gateId,
            message: event.message,
            payload: event.payload
        }))
    };
}

function renderStructuredRunReportMarkdown(report: Record<string, unknown>): string {
    const run = report.run as Record<string, unknown>;
    const workflow = report.workflow as Record<string, unknown>;
    const workloads = Array.isArray(report.workloads) ? report.workloads as Array<Record<string, unknown>> : [];
    const artifacts = Array.isArray(report.artifacts) ? report.artifacts as Array<Record<string, unknown>> : [];
    const effects = Array.isArray(report.effects) ? report.effects as Array<Record<string, unknown>> : [];
    const issues = Array.isArray(report.issues) ? report.issues as Array<Record<string, unknown>> : [];
    const gates = Array.isArray(report.gates) ? report.gates as Array<Record<string, unknown>> : [];
    const repairs = Array.isArray(report.repairs) ? report.repairs as Array<Record<string, unknown>> : [];
    const pending = Array.isArray(report.pending) ? report.pending as Array<Record<string, unknown>> : [];
    return [
        '# Flow Final Report',
        '',
        `- Run: \`${run.id || ''}\``,
        `- Workflow: \`${workflow.id || ''}\``,
        `- Status: \`${run.status || ''}\``,
        `- Generated at: ${report.generatedAt || ''}`,
        '',
        '## Prompt',
        '',
        String(run.prompt || 'No prompt recorded.'),
        '',
        '## Metrics',
        '',
        `- Workloads: ${workloads.length}`,
        `- Gates: ${gates.length}`,
        `- Artifacts: ${artifacts.length}`,
        `- Effects: ${effects.length}`,
        `- Issues: ${issues.length}`,
        `- Repairs: ${repairs.length}`,
        `- Pending: ${pending.length}`,
        '',
        '## Workloads',
        '',
        renderReportList(workloads, item => `- \`${item.id}\` ${item.stateId || ''}: ${item.status || ''}`),
        '',
        '## Gates',
        '',
        renderReportList(gates, item => `- \`${item.id}\` ${item.stateId || ''}: ${item.status || ''}`),
        '',
        '## Artifacts',
        '',
        renderReportList(artifacts, item => `- \`${item.kind}\` ${item.summary || item.uri || item.id}`),
        '',
        '## Effects',
        '',
        renderReportList(effects, item => `- \`${item.kind || item.type}\` ${item.status || ''}: ${item.summary || item.path || item.id}`),
        '',
        '## Issues',
        '',
        renderReportList(issues, item => `- \`${item.severity || 'issue'}\` ${item.summary || item.message || item.id}`),
        '',
        '## Repairs',
        '',
        renderReportList(repairs, item => `- \`${item.stateId || item.key || item.id}\` attempts: ${item.attempts || 0}`),
        '',
        '## Pending',
        '',
        renderReportList(pending, item => `- \`${item.kind || 'pending'}\` ${item.id || item.stateId || item.workloadId}: ${item.reason || item.status || ''}`)
    ].join('\n');
}

function renderReportList(items: Array<Record<string, unknown>>, render: (item: Record<string, unknown>) => string): string {
    return items.length ? items.map(render).join('\n') : '- None.';
}

function collectRunIssues(run: FlowRun): Array<Record<string, unknown>> {
    const issues: Array<Record<string, unknown>> = [];
    for (const workload of run.workloads) {
        for (const issue of workload.issues) {
            issues.push({ stateId: workload.stateId, workloadId: workload.id, severity: 'unknown', type: 'workload_issue', summary: issue });
        }
        for (const issue of workload.outputEnvelope?.issues || []) {
            issues.push({ ...issue, stateId: workload.stateId, workloadId: workload.id });
        }
    }
    for (const event of run.events) {
        if (event.type === 'issue.recorded') {
            issues.push({ ...(event.payload || {}), stateId: event.stateId, workloadId: event.workloadId, eventId: event.id, message: event.message });
        }
    }
    return issues;
}

function collectRunRepairs(run: FlowRun): Array<Record<string, unknown>> {
    const repairs = new Map<string, Record<string, unknown>>();
    for (const workload of run.workloads) {
        if (!workload.previousWorkloadId && (workload.attempt || 0) <= 1) {
            continue;
        }
        const key = workload.stateId;
        const existing = repairs.get(key) || { stateId: key, attempts: 0, workloadIds: [] as string[] };
        existing.attempts = Math.max(Number(existing.attempts) || 0, workload.attempt || 1);
        (existing.workloadIds as string[]).push(workload.id);
        repairs.set(key, existing);
    }
    return [...repairs.values()].sort((a, b) => String(a.stateId).localeCompare(String(b.stateId)));
}

function collectRunPending(run: FlowRun): Array<Record<string, unknown>> {
    const pending: Array<Record<string, unknown>> = [];
    for (const workload of run.workloads) {
        if (workload.status !== 'done' && workload.status !== 'failed') {
            pending.push({ kind: 'workload', id: workload.id, stateId: workload.stateId, status: workload.status, reason: `workload ${workload.status}` });
        }
    }
    for (const [stateId, status] of Object.entries(run.stateStatuses)) {
        if (status !== 'done' && status !== 'failed') {
            pending.push({ kind: 'state', id: stateId, stateId, status, reason: `state ${status}` });
        }
    }
    for (const gate of run.gates) {
        if (!gate.status || gate.status === 'pending' || gate.status === 'revision_requested') {
            pending.push({ kind: 'gate', id: gate.id, stateId: gate.stateId, status: gate.status || 'pending', reason: 'gate waiting for decision' });
        }
    }
    for (const effect of run.effects) {
        if (effect.status === 'proposed' || effect.status === 'blocked' || effect.status === 'failed') {
            pending.push({ kind: 'effect', id: effect.id, stateId: effect.stateId, status: effect.status, reason: effect.summary });
        }
    }
    for (const candidate of run.memoryCandidates || []) {
        if (candidate.status === 'candidate' || candidate.status === 'approved') {
            pending.push({ kind: 'memory_candidate', id: candidate.id, stateId: candidate.stateId, status: candidate.status, reason: candidate.reason });
        }
    }
    return pending;
}

function buildWorkloadOutputEnvelope(
    context: FlowWorkloadExecutionContext,
    generation: AgentGenerationResult
): FlowWorkloadOutputEnvelope {
    const outputs = context.state.outputs && context.state.outputs.length > 0 ? context.state.outputs : ['report.md'];
    const issueEntries = generation.issues.length ? generation.issues : [];
    const artifactMetadata = buildEnvelopeArtifacts(context, generation.artifacts, outputs);
    const signalMap = generation.signals;
    return {
        status: generation.status,
        result: {
            status: generation.status,
            summary: generation.summary,
            artifacts: artifactMetadata,
            signals: signalMap,
            issues: issueEntries
        },
        artifacts: artifactMetadata,
        effects: generation.effects.map(effect => withoutUndefined({
            type: effect.type,
            path: effect.path,
            content: effect.content,
            prompt: effect.prompt,
            artifactPath: effect.artifactPath,
            mimeType: effect.mimeType,
            provider: effect.provider,
            bytes: effect.bytes,
            command: effect.command,
            cwd: effect.cwd,
            env: effect.env,
            allowedEnv: effect.allowedEnv,
            allowedCommands: effect.allowedCommands,
            allowedPaths: effect.allowedPaths,
            deniedPaths: effect.deniedPaths,
            timeoutMs: effect.timeoutMs,
            exitCode: effect.exitCode,
            stdout: effect.stdout,
            stderr: effect.stderr,
            timedOut: effect.timedOut,
            summary: effect.summary,
            hashBefore: effect.hashBefore,
            patch: effect.patch,
            approvalPolicy: effect.approvalPolicy,
            hashAfter: effect.hashAfter,
            status: effect.status
        })),
        signals: signalMap,
        issues: issueEntries,
        report: generation.report,
        memoryCandidates: generation.memoryCandidates
    };
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): T {
    return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function flowEffectToWorkloadResultEffect(effect: FlowEffect): FlowWorkloadResultEffect {
    return withoutUndefined({
        type: effect.type || effect.kind,
        summary: effect.summary,
        path: effect.path,
        prompt: effect.prompt,
        artifactPath: effect.artifactPath,
        mimeType: effect.mimeType,
        provider: effect.provider,
        bytes: effect.bytes,
        command: effect.command,
        cwd: effect.cwd,
        env: effect.env,
        allowedPaths: effect.allowedPaths,
        deniedPaths: effect.deniedPaths,
        timeoutMs: effect.timeoutMs,
        exitCode: effect.exitCode,
        stdout: effect.stdout,
        stderr: effect.stderr,
        timedOut: effect.timedOut,
        hashBefore: effect.hashBefore,
        hashAfter: effect.hashAfter,
        patch: effect.patch,
        approvalPolicy: effect.approvalPolicy,
        status: effect.status
    });
}

function validateGeneratedArtifactCoverage(
    generatedArtifacts: Array<{ path: string; content: string }>,
    expectedOutputs: string[],
    context: FlowWorkloadExecutionContext
): void {
    const generatedPaths = new Set(generatedArtifacts.map(artifact => normalizeArtifactPath(artifact.path)));
    const missingOutputs = expectedOutputs
        .map(normalizeArtifactPath)
        .filter(output => !generatedPaths.has(output));
    if (missingOutputs.length > 0) {
        throw new Error(`${workloadOutputContractErrorPrefix} ${context.state.id || context.workload.stateId}: missing generated artifacts for expected outputs: ${missingOutputs.join(', ')}.`);
    }
}

function buildEnvelopeArtifacts(
    context: FlowWorkloadExecutionContext,
    generatedArtifacts: Array<{ path: string; content: string }>,
    expectedOutputs: string[]
): FlowWorkloadOutputArtifact[] {
    const byPath = new Map<string, FlowWorkloadOutputArtifact>();
    const emitArtifact = (artifactPath: string): void => {
        const normalized = normalizeArtifactPath(artifactPath);
        if (byPath.has(normalized)) {
            return;
        }
        byPath.set(normalized, {
            id: stableId('artifact', context.run.id, context.workload.id, artifactPath),
            path: artifactPath,
            type: artifactKindFromPath(artifactPath)
        });
    };

    for (const output of expectedOutputs.length ? expectedOutputs : ['report.md']) {
        emitArtifact(output);
    }
    for (const generatedArtifact of generatedArtifacts) {
        emitArtifact(generatedArtifact.path);
    }
    return [...byPath.values()];
}

function normalizeEffectKind(type: string, path?: string, command?: string): FlowEffect['kind'] {
    const normalized = (type || '').toLowerCase();
    if (isImageEffectType(normalized)) {
        return 'image';
    }
    if (normalized === 'command' || normalized === 'command.execute' || Boolean(command)) {
        return 'command';
    }
    if (normalized === 'memory_write' || normalized === 'memory-write') {
        return 'memory_write';
    }
    if (normalized === 'notification' || normalized === 'notify') {
        return 'notification';
    }
    if (path || normalized.includes('file') || normalized.includes('artifact') || normalized.includes('patch')) {
        return 'file_write';
    }
    return 'other';
}

function normalizeConfidence(value: unknown): number {
    return parseConfidence(value);
}

function parseAgentMarkdownSections(agentMarkdown: string): ParsedAgentMarkdownSections {
    const sections = splitMarkdownSections(agentMarkdown);
    const role = sections.role?.trim() || fallbackAgentRole(agentMarkdown);
    const qualityCriteria = splitCriteriaLines(sections.qualityCriteria || '');
    const outputFormat = sections.outputFormat?.trim();
    return {
        role,
        qualityCriteria,
        outputFormat: outputFormat || ''
    };
}

function splitMarkdownSections(markdown: string): Record<'role' | 'qualityCriteria' | 'outputFormat', string> {
    const collected: Record<'role' | 'qualityCriteria' | 'outputFormat', string[]> = {
        role: [],
        qualityCriteria: [],
        outputFormat: []
    };
    let current: keyof typeof collected | undefined;
    const lines = markdown.split(/\r?\n/);
    for (const line of lines) {
        const heading = line.match(/^\s{0,3}#{1,6}\s+(.*)\s*$/);
        if (heading) {
            const normalized = normalizeHeading(heading[1]);
            if (isRoleSection(normalized)) {
                current = 'role';
                continue;
            }
            if (isQualityCriteriaSection(normalized)) {
                current = 'qualityCriteria';
                continue;
            }
            if (isOutputFormatSection(normalized)) {
                current = 'outputFormat';
                continue;
            }
            current = undefined;
            continue;
        }
        if (!current) {
            continue;
        }
        collected[current].push(line);
    }
    return {
        role: collected.role.join('\n'),
        qualityCriteria: collected.qualityCriteria.join('\n'),
        outputFormat: collected.outputFormat.join('\n')
    };
}

function fallbackAgentRole(markdown: string): string {
    const lines = markdown.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length > 0) {
        return lines[0].replace(/^#{1,6}\s*/, '');
    }
    return 'Flow execution agent';
}

function splitCriteriaLines(text: string): string[] {
    const lines = text.split(/\r?\n/);
    const bullets = lines
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#') && !isFence(line))
        .filter(line => /^\d+[\.\)]/.test(line) || /^[-*]\s+/.test(line) || line.length > 0);
    const trimmedBullets = bullets
        .map(line => line.replace(/^(\d+[\.\)]\s*|[-*]\s*)/, '').trim())
        .filter(Boolean);
    if (trimmedBullets.length > 0) {
        return trimmedBullets;
    }
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#') && !isFence(line));
}

function isFence(line: string): boolean {
    return line.startsWith('```') && line.endsWith('```');
}

function normalizeHeading(value: string): string {
    return removeDiacritics(value).toLowerCase();
}

function removeDiacritics(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isRoleSection(normalizedHeading: string): boolean {
    return normalizedHeading === 'role' || normalizedHeading.includes('papel');
}

function isQualityCriteriaSection(normalizedHeading: string): boolean {
    return normalizedHeading.includes('quality') && normalizedHeading.includes('criteria')
        || normalizedHeading.includes('quality criteria')
        || normalizedHeading.includes('criteria')
        || normalizedHeading.includes('criterios')
        || normalizedHeading.includes('qualidade');
}

function isOutputFormatSection(normalizedHeading: string): boolean {
    return normalizedHeading.includes('output') && normalizedHeading.includes('format')
        || normalizedHeading.includes('formato') && (normalizedHeading.includes('saida') || normalizedHeading.includes('esperada'));
}

function buildDefaultExpectedOutputFormat(expectedOutputs: string[]): string {
    if (expectedOutputs.some(output => normalizeArtifactPath(output) === 'contracts/contracts.json')) {
        return buildContractExpectedOutputFormat(expectedOutputs);
    }
    return [
        'Return exactly JSON in this shape:',
        'Put generated file contents in result.artifacts entries with both path and content.',
        'If you include top-level artifacts, every generated artifact entry must include both path and content.',
        'Only use effects for explicit side effects beyond the normal generated outputs.',
        'Do not represent normal expected outputs as file.created or file.edited effects.',
        '{',
        '  "result": {',
        '    "status": "completed|failed|ready|running|waiting|review|done|pending",',
        '    "summary": "short summary",',
        '    "artifacts": [ { "path": "string", "content": "string" } ],',
        '    "signals": { "key": "value" },',
        '    "issues": [ { "severity": "non_blocking", "type": "workload_issue", "summary": "text" } ]',
        '  },',
        '  "report": "human-readable report text",',
        '  "effects": [],',
        '  "signals": { "key": "value" },',
        '  "issues": [ { "severity": "non_blocking", "type": "workload_issue", "summary": "text" } ],',
        '  "artifacts": [ { "path": "string", "content": "string" } ],',
        '  "memoryCandidates": [ { "content": "string", "kind": "fact", "source": "artifact|effect|signal|workflow_state", "scope": "ide|workspace|project|workflow|run|agent" } ]',
        '}',
        `Allowed paths: ${expectedOutputs.join(', ')}.`
    ].join('\n');
}

function buildContractExpectedOutputFormat(expectedOutputs: string[]): string {
    return [
        'Return exactly JSON in the workload-output envelope shape, and include a complete Flow Contract Package.',
        'The artifacts array must include content for every allowed path that applies:',
        expectedOutputs.map(output => `- ${output}`).join('\n'),
        '',
        'contracts/contracts.json content must validate against flow-kernel/schemas/contracts.schema.json with schemaVersion "flow.contracts/v1".',
        'contracts/shared.md must be the human-readable frozen shared contract.',
        'contracts/work-orders/*.md must be role-specific work orders derived from contracts.json workOrders.',
        'schemas/api.json and schemas/assets.json must contain JSON Schema documents used by QA to validate delivery outputs.',
        '',
        'Use this top-level shape:',
        '{',
        '  "result": { "status": "completed", "summary": "contract package ready", "artifacts": [ { "path": "contracts/contracts.json", "content": "{...}" } ], "signals": { "contract.status": "ready" }, "issues": [] },',
        '  "report": "short summary",',
        '  "artifacts": [ { "path": "contracts/shared.md", "content": "# Shared Contract..." }, { "path": "contracts/contracts.json", "content": "{...}" } ],',
        '  "signals": { "contract.status": "ready" },',
        '  "issues": []',
        '}'
    ].join('\n');
}

async function writeAgentOutputs(
    workloadDir: string,
    expectedOutputs: string[],
    generatedArtifacts: Array<{ path: string; content: string }>,
    fallbackContentByPath: Record<string, string> = {}
): Promise<string[]> {
    const outputDir = path.join(workloadDir, 'output', 'artifacts');
    const outputs = expectedOutputs.length ? expectedOutputs : ['report.md'];
    const generatedByPath = new Map<string, string>();
    for (const artifact of generatedArtifacts) {
        const key = normalizeArtifactPath(artifact.path);
        generatedByPath.set(key, artifact.content || '');
        generatedByPath.set(normalizeArtifactPath(`./${artifact.path}`), artifact.content || '');
    }

    const produced: string[] = [];
    for (const output of outputs) {
        const key = normalizeArtifactPath(output);
        const content = generatedByPath.get(key)
            ?? generatedByPath.get(normalizeArtifactPath(`./${output}`))
            ?? fallbackContentByPath[key]
            ?? defaultOutputPlaceholder(output);
        const artifactPath = path.join(outputDir, ...safeArtifactPathParts(output));
        produced.push(await writeOutputFile(artifactPath, content));
    }

    for (const [generatedPath, content] of generatedByPath.entries()) {
        if (!outputs.some(output => normalizeArtifactPath(output) === generatedPath)) {
            const artifactPath = path.join(outputDir, ...safeArtifactPathParts(denormalizeArtifactPath(generatedPath)));
            produced.push(await writeOutputFile(artifactPath, content));
        }
    }

    return uniqueStrings(produced);
}

async function writeOutputFile(filePath: string, content: string): Promise<string> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, normalizeText(content), 'utf8');
    return FileUri.create(filePath).toString();
}

function defaultOutputPlaceholder(output: string): string {
    return [
        `# ${output}`,
        '',
        'No output was returned by the provider for this artifact.',
        `Path: ${output}`
    ].join('\n');
}

function parseProviderTimeoutMs(): number {
    const configured = process.env.FLOW_AGENT_TIMEOUT_MS || process.env.FLOW_AGENT_LLM_TIMEOUT_MS;
    const parsed = Number.parseInt(configured || '', 10);
    if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
    }
    return 120000;
}

function findInputArtifactPath(run: FlowRun, requestedPath: string): string | undefined {
    const normalizedRequested = normalizeArtifactPath(requestedPath);
    for (const artifact of run.artifacts) {
        const artifactUri = artifactPathFromUri(artifact.uri);
        if (!artifactUri) {
            continue;
        }
        const normalizedUri = normalizeArtifactPath(artifactUri);
        if (normalizedUri === normalizeArtifactPath(artifact.summary || '') || normalizedUri.endsWith(`/${normalizedRequested}`)) {
            return artifactUri;
        }
    }
    return undefined;
}

function artifactPathFromUri(uri: string): string | undefined {
    if (!uri) {
        return undefined;
    }
    if (uri.startsWith('file://')) {
        try {
            return FileUri.fsPath(uri);
        } catch {
            return undefined;
        }
    }
    return path.isAbsolute(uri) ? uri : undefined;
}

async function readTextFile(file: string): Promise<string | undefined> {
    try {
        return await fs.readFile(file, 'utf8');
    } catch {
        return undefined;
    }
}

function parseCommandLine(value: string): string[] {
    const trimmed = value.trim();
    if (!trimmed) {
        return [];
    }
    if (trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed.map(String).filter(Boolean);
            }
        } catch {
            // fall back to shell-like split
        }
    }
    return shellSplit(trimmed);
}

function shellSplit(value: string): string[] {
    const tokens: string[] = [];
    let token = '';
    let quote: string | undefined;
    for (let i = 0; i < value.length; i++) {
        const char = value[i];
        if ((char === '"' || char === '\'') && quote === undefined) {
            quote = char;
            continue;
        }
        if (char === quote) {
            quote = undefined;
            continue;
        }
        if (char === '\\' && i + 1 < value.length && quote !== '\'') {
            token += value[i + 1];
            i++;
            continue;
        }
        if (/\s/.test(char) && quote === undefined) {
            if (token) {
                tokens.push(token);
                token = '';
            }
            continue;
        }
        token += char;
    }
    if (token) {
        tokens.push(token);
    }
    return tokens;
}

function upsertArtifact(artifacts: FlowArtifact[], artifact: FlowArtifact): void {
    const index = artifacts.findIndex(item => item.id === artifact.id);
    if (index === -1) {
        artifacts.push(artifact);
        return;
    }
    artifacts[index] = artifact;
}

function registerFileEffectAudit(
    run: FlowRun,
    workload: FlowWorkload,
    effect: Pick<FlowEffect, 'id' | 'type' | 'path' | 'status' | 'summary' | 'hashBefore' | 'hashAfter' | 'patch' | 'approvalPolicy'> & { reason?: string }
): void {
    const artifactId = stableId('artifact', run.id, workload.id, effect.id, effect.status);
    const artifactUri = `flow://${run.id}/${workload.stateId}/effects/${effect.id}-${effect.status}.diff`;
    upsertArtifact(run.artifacts, {
        id: artifactId,
        runId: run.id,
        stateId: workload.stateId,
        uri: artifactUri,
        kind: 'patch',
        summary: `File effect ${effect.status}: ${effect.path || effect.summary}`,
        createdAt: timestamp()
    });
    addUnique(workload.outputArtifacts, artifactUri);
    pushEvent(run, {
        type: fileEffectEventType(effect.status),
        stateId: workload.stateId,
        workloadId: workload.id,
        message: `File effect ${effect.status} for "${effect.path || workload.stateId}".`,
        payload: {
            effectId: effect.id,
            effectType: effect.type,
            path: effect.path,
            status: effect.status,
            artifactId,
            artifactUri,
            hashBefore: effect.hashBefore,
            hashAfter: effect.hashAfter,
            patch: effect.patch,
            reason: effect.reason,
            approvalPolicy: effect.approvalPolicy
        }
    });
}

function registerCommandEffectAudit(run: FlowRun, workload: FlowWorkload, effect: FlowEffect): void {
    const artifactId = stableId('artifact', run.id, workload.id, effect.id, effect.status);
    const artifactUri = `flow://${run.id}/${workload.stateId}/effects/${effect.id}-${effect.status}.json`;
    upsertArtifact(run.artifacts, {
        id: artifactId,
        runId: run.id,
        stateId: workload.stateId,
        uri: artifactUri,
        kind: 'log',
        summary: `Command effect ${effect.status}: ${effect.command || effect.summary}`,
        createdAt: timestamp()
    });
    addUnique(workload.outputArtifacts, artifactUri);
    pushEvent(run, {
        type: commandEffectEventType(effect.status),
        stateId: workload.stateId,
        workloadId: workload.id,
        message: `Command effect ${effect.status} for "${workload.stateId}".`,
        payload: {
            effectId: effect.id,
            effectType: effect.type,
            command: effect.command,
            cwd: effect.cwd,
            timeoutMs: effect.timeoutMs,
            exitCode: effect.exitCode,
            timedOut: effect.timedOut,
            status: effect.status,
            artifactId,
            artifactUri,
            approvalPolicy: effect.approvalPolicy,
            stdout: effect.stdout,
            stderr: effect.stderr
        }
    });
}

function registerImageEffectAudit(run: FlowRun, workload: FlowWorkload, effect: FlowEffect, result: AppliedImageEffect): void {
    const artifactId = stableId('artifact', run.id, workload.id, effect.id, result.artifactPath);
    const artifactUri = result.uri || `flow://${run.id}/${workload.stateId}/effects/${effect.id}-${effect.status}.json`;
    upsertArtifact(run.artifacts, {
        id: artifactId,
        runId: run.id,
        stateId: workload.stateId,
        uri: artifactUri,
        kind: 'other',
        summary: result.applied ? `Image effect applied: ${result.artifactPath}` : `Image effect ${result.status}: ${effect.summary}`,
        createdAt: timestamp()
    });
    addUnique(workload.outputArtifacts, artifactUri);
    pushEvent(run, {
        type: result.status === 'applied' ? 'effect.applied' : result.status === 'proposed' ? 'effect.proposed' : 'effect.failed',
        stateId: workload.stateId,
        workloadId: workload.id,
        message: `Image effect ${result.status} for "${workload.stateId}".`,
        payload: {
            effectId: effect.id,
            effectType: effect.type,
            status: result.status,
            provider: result.provider,
            artifactId,
            artifactUri,
            artifactPath: result.artifactPath,
            mimeType: result.mimeType,
            bytes: result.bytes,
            reason: result.reason
        }
    });
}

function registerGenericEffectAudit(run: FlowRun, workload: FlowWorkload, effect: FlowEffect): void {
    pushEvent(run, {
        type: genericEffectEventType(effect.status),
        stateId: workload.stateId,
        workloadId: workload.id,
        message: `Effect ${effect.status} for "${workload.stateId}".`,
        payload: {
            effectId: effect.id,
            effectType: effect.type,
            kind: effect.kind,
            path: effect.path,
            command: effect.command,
            status: effect.status,
            summary: effect.summary,
            approvalPolicy: effect.approvalPolicy
        }
    });
}

function fileEffectEventType(status: FlowEffect['status']): FlowEvent['type'] {
    switch (status) {
        case 'approved':
            return 'effect.approved';
        case 'applied':
            return 'effect.applied';
        case 'rejected':
            return 'effect.rejected';
        case 'blocked':
            return 'effect.blocked';
        case 'failed':
            return 'effect.failed';
        case 'proposed':
        default:
            return 'effect.proposed';
    }
}

function genericEffectEventType(status: FlowEffect['status']): FlowEvent['type'] {
    switch (status) {
        case 'applied':
            return 'effect.applied';
        case 'approved':
            return 'effect.approved';
        case 'rejected':
            return 'effect.rejected';
        case 'blocked':
            return 'effect.blocked';
        case 'failed':
            return 'effect.failed';
        case 'proposed':
        default:
            return 'effect.proposed';
    }
}

function commandEffectEventType(status: FlowEffect['status']): FlowEvent['type'] {
    switch (status) {
        case 'applied':
            return 'effect.applied';
        case 'approved':
            return 'effect.approved';
        case 'rejected':
            return 'effect.rejected';
        case 'blocked':
        case 'failed':
            return 'effect.failed';
        case 'proposed':
        default:
            return 'effect.proposed';
    }
}

function isFileEffectType(type: string): boolean {
    return type === 'file.created' || type === 'file.edited' || type === 'file.deleted';
}

function isCommandEffectType(type: string, command?: string): boolean {
    return type === 'command' || type === 'command.execute' || type === 'command.executed' || Boolean(command);
}

function isImageEffectType(type: string): boolean {
    const normalized = type.toLowerCase();
    return normalized === 'image.generate' || normalized === 'image.generated' || normalized === 'image';
}

function artifactKindFromPath(value: string): FlowArtifact['kind'] {
    const normalized = value.replace(/\\/g, '/').toLowerCase();
    if (normalized.includes('work_order') || normalized.includes('work-order')) {
        return 'work_order';
    }
    if (normalized.includes('contract')) {
        return 'contract';
    }
    if (normalized.includes('report')) {
        return 'report';
    }
    if (normalized.endsWith('.md')) {
        return 'report';
    }
    if (normalized.endsWith('.patch') || normalized.endsWith('.diff')) {
        return 'patch';
    }
    if (normalized.endsWith('.log') || normalized.endsWith('.txt')) {
        return 'log';
    }
    return 'other';
}

function normalizeText(value: string): string {
    return value.endsWith('\n') ? value : `${value}\n`;
}

function normalizeArtifactPath(value: string): string {
    return value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/').replace(/^\/+/, '');
}

function denormalizeArtifactPath(value: string): string {
    return value.split('/').filter(Boolean).join(path.sep);
}

function safeArtifactPathParts(value: string): string[] {
    return splitFlowRelativePath(value).map(segment => sanitizeFileName(segment));
}

function sanitizeFileName(value: string): string {
    return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function uniqueStrings(values: string[]): string[] {
    const byValue = new Set<string>();
    const result: string[] = [];
    for (const value of values) {
        if (byValue.has(value)) {
            continue;
        }
        byValue.add(value);
        result.push(value);
    }
    return result;
}

function boundedInteger(value: unknown, min: number, max: number, fallback: number): number {
    const parsed = typeof value === 'number' ? value : Number.parseInt(toTrimmedString(value), 10);
    if (!Number.isFinite(parsed)) {
        return Math.max(min, Math.min(max, fallback));
    }
    return Math.max(min, Math.min(max, Math.floor(parsed)));
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, run: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = [];
    let cursor = 0;
    const worker = async (): Promise<void> => {
        for (;;) {
            const index = cursor;
            cursor += 1;
            if (index >= items.length) {
                return;
            }
            results[index] = await run(items[index] as T);
        }
    };
    await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, () => worker()));
    return results;
}

function dynamicParallelFailed(
    results: FlowPrimitiveStepResult[],
    failurePolicy: unknown,
    failureThreshold: unknown
): boolean {
    const failures = results.filter(result => result.failed).length;
    if (failures === 0) {
        return false;
    }
    const policy = toTrimmedString(failurePolicy) || 'best_effort';
    if (policy === 'fail_fast') {
        return true;
    }
    if (policy === 'threshold') {
        const threshold = typeof failureThreshold === 'number' ? failureThreshold : Number.parseFloat(toTrimmedString(failureThreshold));
        if (Number.isFinite(threshold)) {
            if (threshold > 0 && threshold < 1) {
                return failures / Math.max(1, results.length) > threshold;
            }
            return failures > Math.floor(threshold);
        }
    }
    return failures >= results.length;
}

function primitiveResultSummary(result: FlowPrimitiveStepResult): Record<string, unknown> {
    return {
        stateId: result.stateId,
        workloadId: result.workloadId,
        status: result.failed ? 'failed' : 'completed',
        metadata: result.metadata,
        artifacts: result.artifacts.map(artifact => ({
            id: artifact.id,
            path: artifact.summary || artifact.uri,
            uri: artifact.uri,
            kind: artifact.kind
        })),
        effects: result.effects.map(effect => ({
            id: effect.id,
            type: effect.type || effect.kind,
            status: effect.status,
            summary: effect.summary
        })),
        signals: result.signals.map(signal => ({
            key: signal.key,
            value: signal.value
        })),
        issues: result.issues
    };
}

function primitiveIssues(results: FlowPrimitiveStepResult[]): string[] {
    return uniqueStrings(results.flatMap(result => result.issues.map(issue => `${result.stateId}: ${issue}`)));
}

function primitiveOutputEnvelope(
    context: FlowWorkloadExecutionContext,
    status: string,
    artifactPath: string,
    payload: Record<string, unknown>
): FlowWorkloadOutputEnvelope {
    const summary = `${context.state.type} ${status} for ${context.workload.stateId}.`;
    const artifact = {
        id: stableId('artifact', context.run.id, context.workload.id, artifactPath),
        path: artifactPath,
        type: artifactKindFromPath(artifactPath)
    };
    const issues = context.workload.issues.map(summaryText => ({
        severity: status === 'failed' ? 'blocking' : 'non_blocking',
        type: 'primitive_issue',
        summary: summaryText
    }));
    return {
        status,
        result: {
            status,
            summary,
            artifacts: [artifact],
            signals: {
                [`${context.workload.stateId}.status`]: status
            },
            issues
        },
        artifacts: [artifact],
        effects: [],
        signals: {
            [`${context.workload.stateId}.status`]: status
        },
        issues,
        report: JSON.stringify(payload, undefined, 2)
    };
}

function primitiveItemsFromText(content: string, source: string): unknown[] {
    const text = (content || '').trim();
    if (!text) {
        return [];
    }
    const parsed = parseJsonValue(text);
    if (Array.isArray(parsed)) {
        return parsed;
    }
    if (isRecord(parsed)) {
        for (const key of ['items', 'candidates', 'tasks', 'files', 'results']) {
            const value = parsed[key];
            if (Array.isArray(value)) {
                return value;
            }
        }
        return [parsed];
    }
    const lines = text
        .split(/\r?\n/)
        .map(line => line.trim().replace(/^[-*]\s+/, '').replace(/^\d+[.)]\s+/, ''))
        .filter(line => line && !line.startsWith('#'));
    if (lines.length > 1) {
        return lines;
    }
    return [{ source, content: text }];
}

function parseJsonValue(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (match?.[1]) {
            try {
                return JSON.parse(match[1].trim());
            } catch {
                return undefined;
            }
        }
        return undefined;
    }
}

function findPrimitiveSourceArtifacts(run: FlowRun, source: string): FlowArtifact[] {
    const normalizedSource = normalizeArtifactPath(source).toLowerCase();
    if (!normalizedSource) {
        return [];
    }
    return run.artifacts.filter(artifact => {
        const summary = normalizeArtifactPath(artifact.summary || '').toLowerCase();
        const uri = normalizeArtifactPath(artifact.uri || '').toLowerCase();
        return summary === normalizedSource
            || summary.endsWith(`/${normalizedSource}`)
            || uri.endsWith(`/${normalizedSource}`)
            || summary.startsWith(`${normalizedSource.replace(/\/?$/, '/')}`)
            || uri.includes(`/${normalizedSource.replace(/\/?$/, '/')}`);
    });
}

function errorToMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message || 'Agent execution failed.';
    }
    const fallback = String(error);
    return fallback || 'Agent execution failed.';
}

function parseRetryMax(max?: number): number {
    const parsed = Number.parseInt(String(max ?? ''), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 0;
    }
    return Math.floor(parsed);
}

function stableId(prefix: string, ...parts: string[]): string {
    return `${prefix}-${parts.join('-').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

function addUnique(values: string[], value: string): void {
    if (!values.includes(value)) {
        values.push(value);
    }
}

function selectApprovedMemoryCandidates(context: FlowWorkloadExecutionContext): MemoryCandidate[] {
    const configuredIds = parseStringArray(context.state.candidateIds || context.state.memoryCandidateIds);
    const allowedIds = configuredIds.length > 0 ? new Set(configuredIds) : undefined;
    return (context.run.memoryCandidates || []).filter(candidate =>
        candidate.status === 'approved'
        && (!allowedIds || allowedIds.has(candidate.id))
    );
}

function buildMemoryWrite(
    context: FlowWorkloadExecutionContext,
    candidate: MemoryCandidate,
    status: MemoryWrite['status'],
    error?: string
): MemoryWrite {
    const scope = normalizeMemoryScope(context.state.scope) || candidate.scope;
    const target = toTrimmedString(context.state.target)
        || toTrimmedString(context.state.memoryTarget)
        || defaultMemoryTarget(context, scope);
    return {
        id: stableId('memory-write', context.run.id, candidate.id),
        runId: context.run.id,
        candidateId: candidate.id,
        status,
        content: candidate.content,
        approvedAt: timestamp(),
        approvedBy: toTrimmedString(context.state.approvedBy) || 'flow-workload',
        scope,
        target,
        error
    };
}

function defaultMemoryTarget(context: FlowWorkloadExecutionContext, scope: MemoryWrite['scope']): string | undefined {
    if (scope === 'workflow') {
        return context.workflow.id;
    }
    if (scope === 'run') {
        return context.run.id;
    }
    if (scope === 'agent') {
        return context.workload.agent || toTrimmedString(context.state.agent);
    }
    return undefined;
}

function normalizeMemoryScope(value: unknown): MemoryWrite['scope'] | undefined {
    const scope = toTrimmedString(value);
    if (
        scope === 'ide'
        || scope === 'workspace'
        || scope === 'project'
        || scope === 'workflow'
        || scope === 'run'
        || scope === 'agent'
    ) {
        return scope;
    }
    return undefined;
}

function upsertMemoryWrite(existing: MemoryWrite[] = [], write: MemoryWrite): MemoryWrite[] {
    const byId = new Map(existing.map(item => [item.id, item]));
    byId.set(write.id, write);
    return [...byId.values()];
}

function pushMemoryWriteEvent(
    run: FlowRun,
    candidate: MemoryCandidate,
    memoryWrite: MemoryWrite,
    status: MemoryWrite['status'],
    workloadId: string
): void {
    const messages: Record<MemoryWrite['status'], string> = {
        approved: `Memory candidate "${candidate.id}" approved for explicit write.`,
        written: `Memory candidate "${candidate.id}" written to Memory memory.`,
        failed: `Memory candidate "${candidate.id}" could not be written.`
    };
    pushEvent(run, {
        type: `memory_write.${status}`,
        stateId: candidate.stateId,
        workloadId,
        message: messages[status],
        payload: {
            candidateId: candidate.id,
            memoryWriteId: memoryWrite.id,
            scope: memoryWrite.scope,
            target: memoryWrite.target,
            status,
            error: memoryWrite.error,
            memoryWrite
        }
    });
}

function pushEvent(run: FlowRun, event: Omit<FlowEvent, 'id' | 'runId' | 'timestamp'>): void {
    run.events.push({
        ...event,
        payload: event.payload ? limitFlowJsonValue(event.payload, FlowSizeLimits.eventPayloadBytes, 'event payload') as Record<string, unknown> : undefined,
        id: generateUuid(),
        runId: run.id,
        timestamp: timestamp()
    });
}

function timestamp(): string {
    return new Date().toISOString();
}
