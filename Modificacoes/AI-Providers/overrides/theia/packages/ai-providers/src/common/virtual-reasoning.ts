// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

export type VirtualReasoningMode = 'off' | 'auto' | 'fast' | 'balanced' | 'deep' | 'coding' | 'research' | 'lats';
export type ResolvedReasoningMode = 'off' | 'fast' | 'balanced' | 'deep' | 'coding' | 'research' | 'lats';
export type ReasoningStage = 'classify' | 'plan' | 'draft' | 'critique' | 'revise' | 'verify';

export interface VirtualReasoningOptions {
    enabled?: boolean;
    mode?: VirtualReasoningMode;
    showProgress?: boolean;
    showReasoningSummary?: boolean;
    allowToolUse?: boolean;
    maxCostMultiplier?: number;
}

export interface TaskClassification {
    taskType: 'simple_chat' | 'explanation' | 'coding' | 'debugging' | 'planning' | 'research' | 'math' | 'writing' | 'unknown';
    complexity: 'low' | 'medium' | 'high';
    needsReasoning: boolean;
    needsTools: boolean;
    recommendedMode: VirtualReasoningMode;
    reason: string;
}

export interface ReasoningProfile {
    id: ResolvedReasoningMode;
    maxIterations: number;
    candidateCount: number;
    useClassifier: boolean;
    usePlanner: boolean;
    useCritic: boolean;
    useRevision: boolean;
    useVerifier: boolean;
    useSelfConsistency: boolean;
    useTreeSearch: boolean;
    useTools: boolean;
    exposeProgress: boolean;
    exposeReasoningSummary: boolean;
    maxInternalCalls: number;
    maxCostMultiplier: number;
}

export interface ReasoningState {
    runId: string;
    userRequest: string;
    baseModelId?: string;
    profileId: ResolvedReasoningMode;
    status: 'running' | 'completed' | 'fallback';
    classification?: TaskClassification;
    plan?: string;
    draft?: string;
    critiques: string[];
    revisions: string[];
    verifications: string[];
    finalAnswer?: string;
    internalCalls: number;
    startedAt: string;
    finishedAt?: string;
}

export interface ReasoningRunLog {
    runId: string;
    modelId?: string;
    profile: ResolvedReasoningMode;
    stages: Array<{ stage: ReasoningStage; success: boolean; message?: string }>;
    internalCalls: number;
    startedAt: string;
    finishedAt?: string;
    summary?: string;
}

export interface ReasoningResult {
    success: boolean;
    finalAnswer: string;
    profileUsed: ResolvedReasoningMode;
    baseModelId?: string;
    internalCallCount: number;
    summary?: string;
    state: ReasoningState;
    log: ReasoningRunLog;
}

export interface VirtualReasoningEngineRequest {
    basePrompt: string;
    baseModelId?: string;
    mode?: VirtualReasoningMode;
    responseContract?: string;
    onProgress?: (stage: ReasoningStage, message: string) => void;
    invokeStage: (stage: ReasoningStage, prompt: string) => Promise<string>;
}

export type JsonRepairSource = 'direct' | 'extracted' | 'model' | 'fallback';

export interface JsonRepairParseResult<T> {
    success: boolean;
    value: T;
    source: JsonRepairSource;
    error?: string;
}

export class JsonRepairService {

    parse<T>(text: string, fallback: T): JsonRepairParseResult<T> {
        const direct = this.tryParse<T>(text);
        if (direct.success) {
            return { success: true, value: direct.value, source: 'direct' };
        }
        const extractedText = this.extractJsonText(text);
        if (extractedText) {
            const extracted = this.tryParse<T>(extractedText);
            if (extracted.success) {
                return { success: true, value: extracted.value, source: 'extracted' };
            }
        }
        return { success: false, value: fallback, source: 'fallback', error: direct.error };
    }

    async parseWithModel<T>(
        text: string,
        fallback: T,
        repair: (prompt: string) => Promise<string>,
        schemaHint?: string
    ): Promise<JsonRepairParseResult<T>> {
        const local = this.parse<T>(text, fallback);
        if (local.success) {
            return local;
        }
        try {
            const repairedText = await repair(this.renderRepairPrompt(text, schemaHint, local.error));
            const repaired = this.parse<T>(repairedText, fallback);
            if (repaired.success) {
                return { success: true, value: repaired.value, source: 'model' };
            }
            return { success: false, value: fallback, source: 'fallback', error: repaired.error || local.error };
        } catch (error) {
            return { success: false, value: fallback, source: 'fallback', error: error instanceof Error ? error.message : String(error) };
        }
    }

    extractJsonText(text: string): string | undefined {
        const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
        if (fenced) {
            return fenced;
        }
        return this.extractBalanced(text, '{', '}') ?? this.extractBalanced(text, '[', ']');
    }

    protected renderRepairPrompt(text: string, schemaHint: string | undefined, error: string | undefined): string {
        return [
            '[system] JSON repair step.',
            'Rewrite the following model output as valid JSON only.',
            'Do not add Markdown fences, commentary, explanations, or extra text.',
            schemaHint ? `Expected shape:\n${schemaHint}` : undefined,
            error ? `Parser error:\n${error}` : undefined,
            `Model output:\n${text}`
        ].filter((line): line is string => Boolean(line)).join('\n\n');
    }

    protected tryParse<T>(text: string): { success: true; value: T } | { success: false; error: string } {
        try {
            return { success: true, value: JSON.parse(text) as T };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    }

    protected extractBalanced(text: string, open: string, close: string): string | undefined {
        const start = text.indexOf(open);
        if (start < 0) {
            return undefined;
        }
        let depth = 0;
        let inString = false;
        let escaped = false;
        for (let index = start; index < text.length; index++) {
            const char = text[index];
            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (char === '\\') {
                    escaped = true;
                } else if (char === '"') {
                    inString = false;
                }
                continue;
            }
            if (char === '"') {
                inString = true;
            } else if (char === open) {
                depth++;
            } else if (char === close) {
                depth--;
                if (depth === 0) {
                    return text.slice(start, index + 1);
                }
            }
        }
        return undefined;
    }
}

export const REASONING_PROFILES: Record<ResolvedReasoningMode, ReasoningProfile> = {
    off: {
        id: 'off',
        maxIterations: 0,
        candidateCount: 1,
        useClassifier: false,
        usePlanner: false,
        useCritic: false,
        useRevision: false,
        useVerifier: false,
        useSelfConsistency: false,
        useTreeSearch: false,
        useTools: false,
        exposeProgress: false,
        exposeReasoningSummary: false,
        maxInternalCalls: 1,
        maxCostMultiplier: 1
    },
    fast: {
        id: 'fast',
        maxIterations: 1,
        candidateCount: 1,
        useClassifier: false,
        usePlanner: false,
        useCritic: true,
        useRevision: true,
        useVerifier: false,
        useSelfConsistency: false,
        useTreeSearch: false,
        useTools: false,
        exposeProgress: false,
        exposeReasoningSummary: false,
        maxInternalCalls: 3,
        maxCostMultiplier: 3
    },
    balanced: {
        id: 'balanced',
        maxIterations: 2,
        candidateCount: 1,
        useClassifier: true,
        usePlanner: true,
        useCritic: true,
        useRevision: true,
        useVerifier: true,
        useSelfConsistency: false,
        useTreeSearch: false,
        useTools: false,
        exposeProgress: false,
        exposeReasoningSummary: false,
        maxInternalCalls: 6,
        maxCostMultiplier: 6
    },
    deep: {
        id: 'deep',
        maxIterations: 2,
        candidateCount: 3,
        useClassifier: true,
        usePlanner: true,
        useCritic: true,
        useRevision: true,
        useVerifier: true,
        useSelfConsistency: true,
        useTreeSearch: false,
        useTools: false,
        exposeProgress: false,
        exposeReasoningSummary: false,
        maxInternalCalls: 9,
        maxCostMultiplier: 9
    },
    coding: {
        id: 'coding',
        maxIterations: 2,
        candidateCount: 1,
        useClassifier: true,
        usePlanner: true,
        useCritic: true,
        useRevision: true,
        useVerifier: true,
        useSelfConsistency: false,
        useTreeSearch: false,
        useTools: false,
        exposeProgress: false,
        exposeReasoningSummary: false,
        maxInternalCalls: 7,
        maxCostMultiplier: 7
    },
    research: {
        id: 'research',
        maxIterations: 2,
        candidateCount: 1,
        useClassifier: true,
        usePlanner: true,
        useCritic: true,
        useRevision: true,
        useVerifier: true,
        useSelfConsistency: false,
        useTreeSearch: false,
        useTools: false,
        exposeProgress: false,
        exposeReasoningSummary: false,
        maxInternalCalls: 6,
        maxCostMultiplier: 6
    },
    lats: {
        id: 'lats',
        maxIterations: 2,
        candidateCount: 2,
        useClassifier: true,
        usePlanner: true,
        useCritic: true,
        useRevision: true,
        useVerifier: true,
        useSelfConsistency: false,
        useTreeSearch: true,
        useTools: false,
        exposeProgress: false,
        exposeReasoningSummary: false,
        maxInternalCalls: 9,
        maxCostMultiplier: 9
    }
};

const DEFAULT_CLASSIFICATION: TaskClassification = {
    taskType: 'unknown',
    complexity: 'medium',
    needsReasoning: true,
    needsTools: false,
    recommendedMode: 'balanced',
    reason: 'fallback'
};

export class VirtualReasoningEngine {

    protected readonly jsonRepair = new JsonRepairService();

    async execute(request: VirtualReasoningEngineRequest): Promise<ReasoningResult> {
        const profileId = this.resolveMode(request.basePrompt, request.mode);
        const startedAt = new Date().toISOString();
        const state: ReasoningState = {
            runId: `virtual-reasoning-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            userRequest: request.basePrompt,
            baseModelId: request.baseModelId,
            profileId,
            status: 'running',
            critiques: [],
            revisions: [],
            verifications: [],
            internalCalls: 0,
            startedAt
        };
        const log: ReasoningRunLog = {
            runId: state.runId,
            modelId: request.baseModelId,
            profile: profileId,
            stages: [],
            internalCalls: 0,
            startedAt
        };
        try {
            const finalAnswer = await this.runProfile(request, state, log);
            return this.completeResult(true, finalAnswer, state, log);
        } catch {
            state.status = 'fallback';
            const finalAnswer = state.revisions[state.revisions.length - 1] || state.draft || '';
            return this.completeResult(Boolean(finalAnswer), finalAnswer, state, log);
        }
    }

    protected runProfile(request: VirtualReasoningEngineRequest, state: ReasoningState, log: ReasoningRunLog): Promise<string> {
        switch (state.profileId) {
            case 'off':
                return this.runOff(request, state, log);
            case 'fast':
                return this.runFast(request, state, log);
            case 'deep':
                return this.runDeep(request, state, log);
            case 'coding':
                return this.runCoding(request, state, log);
            case 'research':
                return this.runResearch(request, state, log);
            case 'lats':
                return this.runLats(request, state, log);
            case 'balanced':
            default:
                return this.runBalanced(request, state, log);
        }
    }

    resolveMode(basePrompt: string, mode: VirtualReasoningMode | undefined): ResolvedReasoningMode {
        if (mode === 'off') {
            return 'off';
        }
        if (mode === 'fast' || mode === 'balanced') {
            return mode;
        }
        if (mode === 'deep' || mode === 'coding' || mode === 'research' || mode === 'lats') {
            return mode;
        }
        const normalized = basePrompt.toLowerCase();
        const wordCount = normalized.split(/\s+/).filter(Boolean).length;
        if (/^\s*(hi|hello|hey|thanks|thank you|ok|okay|oi|ola|olá|obrigado|valeu)[.!?\s]*$/i.test(basePrompt)) {
            return 'off';
        }
        if (/\b(research|pesquis|investig|source|sources|citation|citations|referenc|bibliograf|literature|estado da arte)\b/.test(normalized)) {
            return 'research';
        }
        if (/\b(code|coding|debug|bug|erro|error|exception|stack trace|typescript|javascript|go|python|refactor|test|tests|lint|build|compile|api|sdk)\b/.test(normalized)) {
            return 'coding';
        }
        if (/\b(deep|profundo|complex|complexo|difícil|dificil|architecture|arquitetura|planej|plan|audit|security|seguran|workflow|flow)\b/.test(normalized) || wordCount > 160) {
            return 'deep';
        }
        if (/\b(analyze|analyse|analise|compare|tradeoff|risk|risco|design)\b/.test(normalized)) {
            return 'balanced';
        }
        if (wordCount <= 35 && /[?]|\b(what|who|when|where|qual|quem|quando|onde|explique em uma frase|resuma)\b/.test(normalized)) {
            return 'fast';
        }
        return wordCount > 90 ? 'balanced' : 'fast';
    }

    protected async runOff(request: VirtualReasoningEngineRequest, state: ReasoningState, log: ReasoningRunLog): Promise<string> {
        this.progress(request, 'draft', 'Calling model directly...');
        state.draft = await this.invoke(request, state, log, 'draft', request.basePrompt);
        return state.draft;
    }

    protected async runFast(request: VirtualReasoningEngineRequest, state: ReasoningState, log: ReasoningRunLog): Promise<string> {
        const responseContract = this.responseContract(request);
        this.progress(request, 'draft', 'Drafting response...');
        state.draft = await this.invoke(request, state, log, 'draft', [
            '[system] Virtual Reasoning internal step: draft.',
            `Create a complete ${responseContract}. Do not mention this harness.`,
            request.basePrompt
        ].join('\n\n'));
        this.progress(request, 'critique', 'Reviewing response...');
        const critique = await this.invokeOptional(request, state, log, 'critique', [
            '[system] Virtual Reasoning internal step: critique.',
            'Find technical errors, omissions, unclear parts, unsupported assumptions, and practical risks.',
            'Return concise JSON with approved, confidence, issues, and summary.',
            request.basePrompt,
            `Draft:\n${state.draft}`
        ].join('\n\n'));
        if (critique) {
            state.critiques.push(critique);
        }
        if (!critique.trim()) {
            return state.draft;
        }
        this.progress(request, 'revise', 'Revising response...');
        const revised = await this.invokeOptional(request, state, log, 'revise', [
            '[system] Virtual Reasoning internal step: revise.',
            `Return the final ${responseContract} using the draft and critique.`,
            'Do not reveal hidden reasoning, drafts, critique, verification JSON, or harness details.',
            request.basePrompt,
            `Draft:\n${state.draft}`,
            `Critique:\n${critique}`
        ].join('\n\n'));
        if (revised) {
            state.revisions.push(revised);
        }
        return revised || state.draft;
    }

    protected async runBalanced(request: VirtualReasoningEngineRequest, state: ReasoningState, log: ReasoningRunLog): Promise<string> {
        const responseContract = this.responseContract(request);
        const classificationText = await this.classify(request, state, log);
        this.progress(request, 'plan', 'Planning response...');
        state.plan = await this.invokeOptional(request, state, log, 'plan', [
            '[system] Virtual Reasoning internal step: plan.',
            `Create a short execution plan for producing the ${responseContract}. Do not answer the user directly.`,
            request.basePrompt,
            `Classification:\n${classificationText}`
        ].join('\n\n'));
        this.progress(request, 'draft', 'Drafting response...');
        state.draft = await this.invoke(request, state, log, 'draft', [
            '[system] Virtual Reasoning internal step: draft.',
            `Create a complete ${responseContract} from the plan. Do not mention this harness.`,
            request.basePrompt,
            `Plan:\n${state.plan || 'No structured plan available.'}`
        ].join('\n\n'));
        this.progress(request, 'critique', 'Reviewing response...');
        const critique = await this.invokeOptional(request, state, log, 'critique', [
            '[system] Virtual Reasoning internal step: critique.',
            'Find technical errors, omissions, unclear parts, unsupported assumptions, and practical risks.',
            'Return concise JSON only with approved, confidence, issues, and summary.',
            request.basePrompt,
            `Draft:\n${state.draft}`
        ].join('\n\n'));
        if (critique) {
            state.critiques.push(critique);
        }
        this.progress(request, 'revise', 'Revising response...');
        const revised = critique.trim()
            ? await this.invokeOptional(request, state, log, 'revise', [
                '[system] Virtual Reasoning internal step: revise.',
                `Return the final ${responseContract} using the plan, draft, and critique.`,
                'Do not reveal hidden reasoning, drafts, critique, verification JSON, or harness details.',
                request.basePrompt,
                `Plan:\n${state.plan || ''}`,
                `Draft:\n${state.draft}`,
                `Critique:\n${critique}`
            ].join('\n\n'))
            : state.draft;
        if (revised) {
            state.revisions.push(revised);
        }
        this.progress(request, 'verify', 'Verifying response...');
        const verification = await this.invokeOptional(request, state, log, 'verify', [
            '[system] Virtual Reasoning internal step: verify.',
            `Verify whether the ${responseContract} satisfies the user request, avoids contradictions, and names important risks.`,
            'Return concise JSON only with approved, confidence, requiredFixes, and optionalImprovements.',
            request.basePrompt,
            `Answer:\n${revised || state.draft}`
        ].join('\n\n'));
        if (verification) {
            state.verifications.push(verification);
        }
        return revised || state.draft || verification;
    }

    protected async runDeep(request: VirtualReasoningEngineRequest, state: ReasoningState, log: ReasoningRunLog): Promise<string> {
        const responseContract = this.responseContract(request);
        const classificationText = await this.classify(request, state, log);
        this.progress(request, 'plan', 'Planning deep response...');
        state.plan = await this.invokeOptional(request, state, log, 'plan', [
            '[system] Virtual Reasoning internal step: deep plan.',
            `Create a compact plan for exploring multiple independent candidate ${responseContract}s.`,
            'Name assumptions, constraints, evaluation criteria, and likely failure modes.',
            request.basePrompt,
            `Classification:\n${classificationText}`
        ].join('\n\n'));
        const candidates: string[] = [];
        const profile = REASONING_PROFILES[state.profileId];
        for (let index = 0; index < profile.candidateCount; index++) {
            this.progress(request, 'draft', `Drafting candidate ${index + 1}...`);
            const candidate = index === 0
                ? await this.invoke(request, state, log, 'draft', this.deepCandidatePrompt(request, state, responseContract, index))
                : await this.invokeOptional(request, state, log, 'draft', this.deepCandidatePrompt(request, state, responseContract, index));
            if (candidate) {
                candidates.push(candidate);
                state.revisions.push(candidate);
                if (!state.draft) {
                    state.draft = candidate;
                }
            }
        }
        this.progress(request, 'critique', 'Judging candidates...');
        const critique = await this.invokeOptional(request, state, log, 'critique', [
            '[system] Virtual Reasoning internal step: deep judge.',
            'Compare the candidates for correctness, completeness, clarity, risk, and fit to the user request.',
            'Return concise JSON only with winner, confidence, issues, and synthesisNotes.',
            request.basePrompt,
            `Plan:\n${state.plan || ''}`,
            this.renderCandidates(candidates)
        ].join('\n\n'));
        if (critique) {
            state.critiques.push(critique);
        }
        this.progress(request, 'revise', 'Synthesizing final response...');
        const revised = await this.invokeOptional(request, state, log, 'revise', [
            '[system] Virtual Reasoning internal step: deep synthesis.',
            `Synthesize the strongest candidate into one final ${responseContract}.`,
            'Resolve contradictions, preserve useful caveats, and do not mention hidden candidates or judging.',
            request.basePrompt,
            `Plan:\n${state.plan || ''}`,
            this.renderCandidates(candidates),
            `Judge:\n${critique}`
        ].join('\n\n'));
        if (revised) {
            state.revisions.push(revised);
        }
        this.progress(request, 'verify', 'Verifying response...');
        const verification = await this.invokeOptional(request, state, log, 'verify', [
            '[system] Virtual Reasoning internal step: deep verification.',
            `Verify whether the final ${responseContract} is accurate, complete, coherent, and honest about uncertainty.`,
            'Return concise JSON only with approved, confidence, requiredFixes, and optionalImprovements.',
            request.basePrompt,
            `Answer:\n${revised || state.draft || candidates[candidates.length - 1] || ''}`
        ].join('\n\n'));
        if (verification) {
            state.verifications.push(verification);
        }
        return revised || state.draft || candidates[candidates.length - 1] || verification;
    }

    protected async runCoding(request: VirtualReasoningEngineRequest, state: ReasoningState, log: ReasoningRunLog): Promise<string> {
        const responseContract = this.responseContract(request);
        const classificationText = await this.classify(request, state, log);
        this.progress(request, 'plan', 'Planning code response...');
        state.plan = await this.invokeOptional(request, state, log, 'plan', [
            '[system] Virtual Reasoning internal step: coding plan.',
            `Plan the ${responseContract} for a coding/debugging task.`,
            'Include affected components, compatibility constraints, test strategy, and risk checks. Do not answer the user directly.',
            request.basePrompt,
            `Classification:\n${classificationText}`
        ].join('\n\n'));
        this.progress(request, 'draft', 'Drafting code response...');
        state.draft = await this.invoke(request, state, log, 'draft', [
            '[system] Virtual Reasoning internal step: coding draft.',
            `Create a complete ${responseContract} for the coding task.`,
            'Be specific about files, APIs, commands, failure modes, and tests when relevant. Do not mention this harness.',
            request.basePrompt,
            `Plan:\n${state.plan || 'No structured plan available.'}`
        ].join('\n\n'));
        this.progress(request, 'critique', 'Reviewing code response...');
        const critique = await this.invokeOptional(request, state, log, 'critique', [
            '[system] Virtual Reasoning internal step: code review.',
            'Review the draft for compile errors, API misuse, missing tests, unsafe assumptions, migration risk, and unclear instructions.',
            'Return concise JSON only with approved, confidence, blockingIssues, nonBlockingIssues, and testGaps.',
            request.basePrompt,
            `Draft:\n${state.draft}`
        ].join('\n\n'));
        if (critique) {
            state.critiques.push(critique);
        }
        this.progress(request, 'revise', 'Applying code review...');
        const revised = critique.trim()
            ? await this.invokeOptional(request, state, log, 'revise', [
                '[system] Virtual Reasoning internal step: coding revise.',
                `Revise into the final ${responseContract} using the code review.`,
                'Do not reveal hidden reasoning, drafts, critique, verification JSON, or harness details.',
                request.basePrompt,
                `Plan:\n${state.plan || ''}`,
                `Draft:\n${state.draft}`,
                `Code review:\n${critique}`
            ].join('\n\n'))
            : state.draft;
        if (revised) {
            state.revisions.push(revised);
        }
        this.progress(request, 'verify', 'Verifying code response...');
        const verification = await this.invokeOptional(request, state, log, 'verify', [
            '[system] Virtual Reasoning internal step: coding verify.',
            `Verify whether the ${responseContract} satisfies the coding request and includes realistic validation guidance.`,
            'Return concise JSON only with approved, confidence, requiredFixes, and testCommands.',
            request.basePrompt,
            `Answer:\n${revised || state.draft}`
        ].join('\n\n'));
        if (verification) {
            state.verifications.push(verification);
        }
        this.progress(request, 'revise', 'Finalizing code response...');
        const finalRevision = verification.trim()
            ? await this.invokeOptional(request, state, log, 'revise', [
                '[system] Virtual Reasoning internal step: coding final repair.',
                `Return the final ${responseContract}, applying only required verification fixes.`,
                'Do not mention verification or this harness.',
                request.basePrompt,
                `Current answer:\n${revised || state.draft}`,
                `Verification:\n${verification}`
            ].join('\n\n'))
            : revised;
        if (finalRevision && finalRevision !== revised) {
            state.revisions.push(finalRevision);
        }
        return finalRevision || revised || state.draft || verification;
    }

    protected async runResearch(request: VirtualReasoningEngineRequest, state: ReasoningState, log: ReasoningRunLog): Promise<string> {
        const responseContract = this.responseContract(request);
        const classificationText = await this.classify(request, state, log);
        this.progress(request, 'plan', 'Planning research response...');
        state.plan = await this.invokeOptional(request, state, log, 'plan', [
            '[system] Virtual Reasoning internal step: research plan.',
            `Plan the ${responseContract} for a research-style task.`,
            'Separate known context, assumptions, unknowns, source needs, and verification limits. Do not invent citations.',
            request.basePrompt,
            `Classification:\n${classificationText}`
        ].join('\n\n'));
        this.progress(request, 'draft', 'Drafting research response...');
        state.draft = await this.invoke(request, state, log, 'draft', [
            '[system] Virtual Reasoning internal step: research draft.',
            `Create a complete ${responseContract} using only available context.`,
            'Do not fabricate sources, dates, quotes, or claims. State when external verification would be required.',
            request.basePrompt,
            `Plan:\n${state.plan || 'No structured plan available.'}`
        ].join('\n\n'));
        this.progress(request, 'critique', 'Checking research quality...');
        const critique = await this.invokeOptional(request, state, log, 'critique', [
            '[system] Virtual Reasoning internal step: research critique.',
            'Check for unsupported claims, missing caveats, overconfident wording, source needs, and user-request mismatch.',
            'Return concise JSON only with approved, confidence, unsupportedClaims, missingEvidence, and suggestedFixes.',
            request.basePrompt,
            `Draft:\n${state.draft}`
        ].join('\n\n'));
        if (critique) {
            state.critiques.push(critique);
        }
        this.progress(request, 'revise', 'Revising research response...');
        const revised = await this.invokeOptional(request, state, log, 'revise', [
            '[system] Virtual Reasoning internal step: research revise.',
            `Return the final ${responseContract} using the research critique.`,
            'Keep caveats visible when evidence is limited. Do not reveal hidden critique or harness details.',
            request.basePrompt,
            `Plan:\n${state.plan || ''}`,
            `Draft:\n${state.draft}`,
            `Critique:\n${critique}`
        ].join('\n\n'));
        if (revised) {
            state.revisions.push(revised);
        }
        this.progress(request, 'verify', 'Verifying research response...');
        const verification = await this.invokeOptional(request, state, log, 'verify', [
            '[system] Virtual Reasoning internal step: research verify.',
            `Verify whether the ${responseContract} is honest about evidence limits and avoids fabricated source detail.`,
            'Return concise JSON only with approved, confidence, requiredFixes, and evidenceLimits.',
            request.basePrompt,
            `Answer:\n${revised || state.draft}`
        ].join('\n\n'));
        if (verification) {
            state.verifications.push(verification);
        }
        return revised || state.draft || verification;
    }

    protected async runLats(request: VirtualReasoningEngineRequest, state: ReasoningState, log: ReasoningRunLog): Promise<string> {
        const responseContract = this.responseContract(request);
        const classificationText = await this.classify(request, state, log);
        this.progress(request, 'plan', 'Planning search tree...');
        state.plan = await this.invokeOptional(request, state, log, 'plan', [
            '[system] Virtual Reasoning internal step: LATS plan.',
            `Create a compact search plan for producing the ${responseContract}.`,
            'Define two promising branches, evaluation criteria, and stopping criteria. Do not answer the user directly.',
            request.basePrompt,
            `Classification:\n${classificationText}`
        ].join('\n\n'));
        this.progress(request, 'draft', 'Expanding branch A...');
        const branchA = await this.invoke(request, state, log, 'draft', [
            '[system] Virtual Reasoning internal step: LATS branch A.',
            `Create one candidate ${responseContract} following the first promising branch.`,
            request.basePrompt,
            `Search plan:\n${state.plan || ''}`
        ].join('\n\n'));
        state.draft = branchA;
        state.revisions.push(branchA);
        this.progress(request, 'draft', 'Expanding branch B...');
        const branchB = await this.invokeOptional(request, state, log, 'draft', [
            '[system] Virtual Reasoning internal step: LATS branch B.',
            `Create a substantially different candidate ${responseContract} following the second promising branch.`,
            request.basePrompt,
            `Search plan:\n${state.plan || ''}`,
            `Branch A:\n${branchA}`
        ].join('\n\n'));
        if (branchB) {
            state.revisions.push(branchB);
        }
        this.progress(request, 'critique', 'Scoring branches...');
        const firstJudge = await this.invokeOptional(request, state, log, 'critique', [
            '[system] Virtual Reasoning internal step: LATS judge.',
            'Score the branches and identify the best branch to expand. Return concise JSON only.',
            request.basePrompt,
            this.renderCandidates([branchA, branchB].filter(Boolean))
        ].join('\n\n'));
        if (firstJudge) {
            state.critiques.push(firstJudge);
        }
        this.progress(request, 'draft', 'Expanding best branch...');
        const expanded = await this.invokeOptional(request, state, log, 'draft', [
            '[system] Virtual Reasoning internal step: LATS expansion.',
            `Expand the best branch into a stronger candidate ${responseContract}.`,
            request.basePrompt,
            `Search plan:\n${state.plan || ''}`,
            this.renderCandidates([branchA, branchB].filter(Boolean)),
            `Judge:\n${firstJudge}`
        ].join('\n\n'));
        if (expanded) {
            state.revisions.push(expanded);
        }
        this.progress(request, 'critique', 'Reviewing expanded branch...');
        const finalJudge = await this.invokeOptional(request, state, log, 'critique', [
            '[system] Virtual Reasoning internal step: LATS final judge.',
            'Review the expanded branch for correctness, completeness, clarity, and risk. Return concise JSON only.',
            request.basePrompt,
            `Expanded branch:\n${expanded || branchA}`
        ].join('\n\n'));
        if (finalJudge) {
            state.critiques.push(finalJudge);
        }
        this.progress(request, 'revise', 'Synthesizing searched answer...');
        const revised = await this.invokeOptional(request, state, log, 'revise', [
            '[system] Virtual Reasoning internal step: LATS synthesis.',
            `Return one final ${responseContract} from the best searched branch.`,
            'Do not mention tree search, hidden candidates, judging, or this harness.',
            request.basePrompt,
            `Search plan:\n${state.plan || ''}`,
            this.renderCandidates([branchA, branchB, expanded].filter(Boolean)),
            `Final judge:\n${finalJudge}`
        ].join('\n\n'));
        if (revised) {
            state.revisions.push(revised);
        }
        this.progress(request, 'verify', 'Verifying searched answer...');
        const verification = await this.invokeOptional(request, state, log, 'verify', [
            '[system] Virtual Reasoning internal step: LATS verify.',
            `Verify whether the final ${responseContract} satisfies the request and avoids branch-specific contradictions.`,
            'Return concise JSON only with approved, confidence, requiredFixes, and optionalImprovements.',
            request.basePrompt,
            `Answer:\n${revised || expanded || branchA}`
        ].join('\n\n'));
        if (verification) {
            state.verifications.push(verification);
        }
        return revised || expanded || branchA || verification;
    }

    protected async classify(request: VirtualReasoningEngineRequest, state: ReasoningState, log: ReasoningRunLog): Promise<string> {
        this.progress(request, 'classify', 'Analyzing request...');
        const classificationText = await this.invokeOptional(request, state, log, 'classify', [
            '[system] Virtual Reasoning internal step: classify.',
            'Classify the task and respond only in valid JSON.',
            '{"taskType":"simple_chat|explanation|coding|debugging|planning|research|math|writing|unknown","complexity":"low|medium|high","needsReasoning":true,"needsTools":false,"recommendedMode":"off|fast|balanced|deep|coding|research|lats","reason":"short"}',
            'Do not solve the task.',
            request.basePrompt
        ].join('\n\n'));
        const classificationSchema = '{"taskType":"simple_chat | explanation | coding | debugging | planning | research | math | writing | unknown","complexity":"low | medium | high","needsReasoning":true,"needsTools":false,"recommendedMode":"off | fast | balanced | deep | coding | research | lats","reason":"short"}';
        state.classification = (await this.jsonRepair.parseWithModel<TaskClassification>(
            classificationText,
            DEFAULT_CLASSIFICATION,
            prompt => this.invokeOptional(request, state, log, 'classify', prompt),
            classificationSchema
        )).value;
        return classificationText;
    }

    protected deepCandidatePrompt(request: VirtualReasoningEngineRequest, state: ReasoningState, responseContract: string, index: number): string {
        const focus = [
            'prioritize direct correctness and minimal assumptions',
            'prioritize edge cases, risks, and alternative interpretations',
            'prioritize pragmatic implementation details and user-facing clarity'
        ][index] || 'provide an independent candidate';
        return [
            `[system] Virtual Reasoning internal step: deep candidate ${index + 1}.`,
            `Create an independent candidate ${responseContract}; ${focus}.`,
            'Do not mention other candidates or this harness.',
            request.basePrompt,
            `Plan:\n${state.plan || 'No structured plan available.'}`
        ].join('\n\n');
    }

    protected renderCandidates(candidates: string[]): string {
        return candidates.map((candidate, index) => `Candidate ${index + 1}:\n${candidate}`).join('\n\n');
    }

    protected responseContract(request: VirtualReasoningEngineRequest): string {
        return request.responseContract?.trim() || 'final user-facing answer';
    }

    protected progress(request: VirtualReasoningEngineRequest, stage: ReasoningStage, message: string): void {
        request.onProgress?.(stage, message);
    }

    protected async invoke(request: VirtualReasoningEngineRequest, state: ReasoningState, log: ReasoningRunLog, stage: ReasoningStage, prompt: string): Promise<string> {
        const profile = REASONING_PROFILES[state.profileId];
        if (state.internalCalls >= profile.maxInternalCalls) {
            log.stages.push({ stage, success: false, message: 'internal call budget exceeded' });
            throw new Error(`Virtual Reasoning profile "${profile.id}" exceeded its internal call budget.`);
        }
        state.internalCalls++;
        log.internalCalls++;
        const text = await request.invokeStage(stage, prompt);
        if (!text.trim()) {
            log.stages.push({ stage, success: false, message: 'empty response' });
            throw new Error(`Virtual Reasoning stage "${stage}" returned no text.`);
        }
        log.stages.push({ stage, success: true });
        return text.trim();
    }

    protected async invokeOptional(request: VirtualReasoningEngineRequest, state: ReasoningState, log: ReasoningRunLog, stage: ReasoningStage, prompt: string): Promise<string> {
        try {
            return await this.invoke(request, state, log, stage, prompt);
        } catch (error) {
            log.stages.push({ stage, success: false, message: error instanceof Error ? error.message : String(error) });
            return '';
        }
    }

    protected completeResult(success: boolean, finalAnswer: string, state: ReasoningState, log: ReasoningRunLog): ReasoningResult {
        const finishedAt = new Date().toISOString();
        state.status = success ? 'completed' : 'fallback';
        state.finishedAt = finishedAt;
        state.finalAnswer = finalAnswer;
        log.finishedAt = finishedAt;
        log.summary = success ? 'Virtual Reasoning completed.' : 'Virtual Reasoning fell back to the best available answer.';
        return {
            success,
            finalAnswer,
            profileUsed: state.profileId,
            baseModelId: state.baseModelId,
            internalCallCount: state.internalCalls,
            summary: log.summary,
            state,
            log
        };
    }
}
