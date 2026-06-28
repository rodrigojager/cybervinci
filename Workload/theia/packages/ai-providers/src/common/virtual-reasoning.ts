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
export type ResolvedReasoningMode = 'off' | 'fast' | 'balanced';
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

export class JsonRepairService {

    parse<T>(text: string, fallback: T): { success: boolean; value: T; source: 'direct' | 'extracted' | 'fallback'; error?: string } {
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

    extractJsonText(text: string): string | undefined {
        const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
        if (fenced) {
            return fenced;
        }
        return this.extractBalanced(text, '{', '}') ?? this.extractBalanced(text, '[', ']');
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
            const finalAnswer = profileId === 'off'
                ? await this.runOff(request, state, log)
                : profileId === 'fast'
                ? await this.runFast(request, state, log)
                : await this.runBalanced(request, state, log);
            return this.completeResult(true, finalAnswer, state, log);
        } catch {
            state.status = 'fallback';
            const finalAnswer = state.revisions[state.revisions.length - 1] || state.draft || '';
            return this.completeResult(Boolean(finalAnswer), finalAnswer, state, log);
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
            return 'balanced';
        }
        const normalized = basePrompt.toLowerCase();
        const wordCount = normalized.split(/\s+/).filter(Boolean).length;
        if (/^\s*(hi|hello|hey|thanks|thank you|ok|okay|oi|ola|olá|obrigado|valeu)[.!?\s]*$/i.test(basePrompt)) {
            return 'off';
        }
        if (/\b(code|coding|debug|bug|erro|error|exception|stack trace|typescript|javascript|go|python|refactor|architecture|arquitetura|planej|plan|research|pesquis|investig|audit|security|seguran|workflow|flow)\b/.test(normalized)) {
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
        this.progress(request, 'classify', 'Analyzing request...');
        const classificationText = await this.invokeOptional(request, state, log, 'classify', [
            '[system] Virtual Reasoning internal step: classify.',
            'Classify the task and respond only in valid JSON.',
            '{"taskType":"simple_chat|explanation|coding|debugging|planning|research|math|writing|unknown","complexity":"low|medium|high","needsReasoning":true,"needsTools":false,"recommendedMode":"off|fast|balanced|deep|coding|research","reason":"short"}',
            'Do not solve the task.',
            request.basePrompt
        ].join('\n\n'));
        state.classification = this.jsonRepair.parse<TaskClassification>(classificationText, DEFAULT_CLASSIFICATION).value;
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
