import {
    ProjectSignal,
    MemorySkillCandidate,
    SkillSuggestion,
    SkillSuggestionLifecycleDecision,
    SkillSuggestionLifecycleRequest,
    SkillSuggestionRequest,
    SkillSuggestionResult
} from './memory-types';
import { SecretScanner } from './secret-scanner';

const DEFAULT_SUGGESTION_THRESHOLD = 0.2;
const DEFAULT_TRACKING_THRESHOLD = 3;
const DEFAULT_TRACKING_WINDOW_DAYS = 7;
const DEFAULT_LIFECYCLE_SUGGESTION_THRESHOLD = 5;
const DEFAULT_SUGGESTION_WINDOW_DAYS = 30;
const DEFAULT_APPROVAL_THRESHOLD = 5;
const DEFAULT_REJECTION_THRESHOLD = 3;

export class SkillSuggestionEngine {

    protected readonly secretScanner = new SecretScanner();

    suggest(request: SkillSuggestionRequest): SkillSuggestionResult {
        const minimumConfidence = request.minimumConfidence ?? request.suggestionThreshold ?? DEFAULT_SUGGESTION_THRESHOLD;
        const taskTokens = this.tokens(request.task);
        const signalTokens = request.projectSignals.flatMap(signal => this.signalTokens(signal));
        const seen = new Set<string>();
        const suggestions: SkillSuggestion[] = [];

        for (const skill of request.availableSkills) {
            if (skill.discovery === 'manual') {
                continue;
            }
            if (seen.has(skill.id)) {
                continue;
            }
            seen.add(skill.id);
            const reasons: string[] = [];
            let score = 0;
            const skillTokens = new Set([
                ...this.tokens(skill.name),
                ...this.tokens(skill.description),
                ...(skill.tags ?? []).flatMap(tag => this.tokens(tag))
            ]);
            const taskMatches = taskTokens.filter(token => skillTokens.has(token));
            if (taskMatches.length) {
                score += Math.min(0.55, taskMatches.length * 0.11);
                reasons.push(`Task matches ${taskMatches.slice(0, 3).join(', ')}.`);
            }
            const signalMatches = signalTokens.filter(token => skillTokens.has(token.value));
            if (signalMatches.length) {
                score += Math.min(0.35, signalMatches.reduce((total, token) => total + token.weight, 0) * 0.08);
                reasons.push(`Project signals match ${signalMatches.slice(0, 3).map(token => token.value).join(', ')}.`);
            }
            if (score >= minimumConfidence) {
                suggestions.push({
                    skillId: skill.id,
                    confidence: Math.max(0, Math.min(1, Number(score.toFixed(2)))),
                    reasons
                });
            }
        }

        suggestions.sort((left, right) => right.confidence - left.confidence || left.skillId.localeCompare(right.skillId));
        return {
            suggestions: suggestions.slice(0, request.limit ?? suggestions.length)
        };
    }

    lifecycle(request: SkillSuggestionLifecycleRequest): SkillSuggestionLifecycleDecision {
        const trackingThreshold = request.trackingThreshold ?? DEFAULT_TRACKING_THRESHOLD;
        const trackingWindowDays = request.trackingWindowDays ?? DEFAULT_TRACKING_WINDOW_DAYS;
        const suggestionThreshold = request.suggestionThreshold ?? DEFAULT_LIFECYCLE_SUGGESTION_THRESHOLD;
        const suggestionWindowDays = request.suggestionWindowDays ?? DEFAULT_SUGGESTION_WINDOW_DAYS;
        const approvalThreshold = request.approvalThreshold ?? DEFAULT_APPROVAL_THRESHOLD;
        const rejectionThreshold = request.rejectionThreshold ?? DEFAULT_REJECTION_THRESHOLD;
        const candidate = request.candidate;
        const rejectionCount = candidate.rejectionCount ?? 0;
        const recentTriggerCount = this.recentTriggerHistory(candidate, trackingWindowDays).length;
        const recentSuggestionTriggerCount = this.recentTriggerHistory(candidate, suggestionWindowDays).length;

        if (candidate.status === 'blocked' || candidate.status === 'accepted') {
            return {
                status: candidate.status,
                reason: `Candidate is already ${candidate.status}.`,
                requiresApproval: false
            };
        }
        if (candidate.status === 'delete_pending') {
            return {
                status: 'delete_pending',
                reason: 'Candidate is pending deletion approval.',
                requiresApproval: true
            };
        }
        if (rejectionCount >= rejectionThreshold || candidate.triggerCount <= -rejectionThreshold) {
            return {
                status: 'blocked',
                reason: `Rejected signal reached threshold ${rejectionThreshold}; candidate silenced for this pattern.`,
                requiresApproval: false
            };
        }
        if (candidate.status === 'rejected') {
            return {
                status: 'rejected',
                reason: candidate.statusReason ?? 'Candidate was rejected by the user.',
                requiresApproval: false
            };
        }
        if (candidate.status === 'suggested') {
            return {
                status: 'suggested',
                reason: candidate.statusReason ?? 'Candidate is already suggested and awaiting user approval.',
                requiresApproval: true
            };
        }
        if (recentSuggestionTriggerCount >= approvalThreshold) {
            return {
                status: 'suggested',
                reason: `Observed ${recentSuggestionTriggerCount}/${approvalThreshold} occurrences in the last ${suggestionWindowDays} days and reached approval threshold.`,
                requiresApproval: true
            };
        }
        if (recentSuggestionTriggerCount >= suggestionThreshold) {
            return {
                status: 'suggested',
                reason: `Observed ${recentSuggestionTriggerCount}/${suggestionThreshold} occurrences in the last ${suggestionWindowDays} days and reached suggestion threshold.`,
                requiresApproval: true
            };
        }
        if (recentTriggerCount < trackingThreshold) {
            if (candidate.triggerCount >= suggestionThreshold) {
                return {
                    status: 'tracking',
                    reason: `Tracking ${recentSuggestionTriggerCount}/${suggestionThreshold} occurrences in the last ${suggestionWindowDays} days until suggestion threshold is reached.`,
                    requiresApproval: false
                };
            }
            return {
                status: 'tracking',
                reason: `Observed ${recentTriggerCount}/${trackingThreshold} occurrences in the last ${trackingWindowDays} days before starting tracking.`,
                requiresApproval: false
            };
        }
        return {
            status: 'tracking',
            reason: `Tracking ${recentSuggestionTriggerCount}/${suggestionThreshold} occurrences in the last ${suggestionWindowDays} days until suggestion threshold is reached.`,
            requiresApproval: false
        };
    }

    updateCandidateForPrompt(candidate: MemorySkillCandidate | undefined, request: {
        workspacePath: string;
        signature: string;
        prompt?: string;
        eventType: 'prompt.submitted' | 'skill.rejected' | 'skill.accepted';
        trackingThreshold?: number;
        trackingWindowDays?: number;
        suggestionThreshold?: number;
        suggestionWindowDays?: number;
        approvalThreshold?: number;
        rejectionThreshold?: number;
        now?: string;
    }): MemorySkillCandidate {
        const now = request.now ?? new Date().toISOString();
        const title = this.titleFromSignature(request.signature);
        const activationCriteria = this.activationCriteria(
            request.trackingThreshold,
            request.trackingWindowDays,
            request.suggestionThreshold,
            request.suggestionWindowDays,
            request.rejectionThreshold
        );
        const next: MemorySkillCandidate = candidate ? {
            ...candidate,
            triggers: candidate.triggers ? [...candidate.triggers] : undefined,
            redactedExamples: candidate.redactedExamples ? [...candidate.redactedExamples] : undefined,
            rejectionReasons: candidate.rejectionReasons ? [...candidate.rejectionReasons] : undefined,
            triggerHistory: candidate.triggerHistory ? [...candidate.triggerHistory] : undefined
        } : {
            id: this.id('skill'),
            workspacePath: request.workspacePath,
            signature: request.signature,
            title,
            description: `Candidate skill for repeated prompts matching ${request.signature}.`,
            generationSources: ['event'],
            redactedExamples: [],
            triggers: this.triggersForSignature(request.signature),
            activationCriteria,
            triggerCount: 0,
            rejectionCount: 0,
            rejectionReasons: [],
            status: 'tracking',
            proposedSkillJson: this.proposedSkillJson({
                signature: request.signature,
                title,
                triggers: this.triggersForSignature(request.signature),
                activationCriteria,
                redactedExamples: []
            }),
            createdAt: now,
            updatedAt: now
        };
        if (next.status === 'blocked' || next.status === 'accepted') {
            return next;
        }
        if (request.eventType === 'prompt.submitted') {
            next.triggerCount += 1;
            next.lastTriggeredAt = now;
            next.redactedExamples = this.redactedExamples(next.redactedExamples, request.prompt);
            const historyWindowDays = Math.max(
                request.trackingWindowDays ?? DEFAULT_TRACKING_WINDOW_DAYS,
                request.suggestionWindowDays ?? DEFAULT_SUGGESTION_WINDOW_DAYS
            );
            next.triggerHistory = this.recentTriggerHistory({
                ...next,
                triggerHistory: [...(next.triggerHistory ?? []), now]
            }, historyWindowDays);
        } else if (request.eventType === 'skill.rejected') {
            next.rejectionCount = (next.rejectionCount ?? 0) + 1;
            if (request.prompt) {
                next.rejectionReasons = [...(next.rejectionReasons ?? []), request.prompt].slice(-10);
            }
        }
        next.triggers = next.triggers?.length ? next.triggers : this.triggersForSignature(request.signature);
        next.activationCriteria = next.activationCriteria ?? activationCriteria;
        const decision = this.lifecycle({
            candidate: next,
            trackingThreshold: request.trackingThreshold,
            trackingWindowDays: request.trackingWindowDays,
            suggestionThreshold: request.suggestionThreshold,
            suggestionWindowDays: request.suggestionWindowDays,
            approvalThreshold: request.approvalThreshold,
            rejectionThreshold: request.rejectionThreshold
        });
        if (!next.trackingStartedAt && decision.status === 'tracking'
            && this.recentTriggerHistory(next, request.trackingWindowDays ?? DEFAULT_TRACKING_WINDOW_DAYS).length >= (request.trackingThreshold ?? DEFAULT_TRACKING_THRESHOLD)) {
            next.trackingStartedAt = now;
        }
        next.status = request.eventType === 'skill.accepted' ? 'accepted' : decision.status;
        next.statusReason = decision.reason;
        next.updatedAt = now;
        next.proposedSkillJson = this.proposedSkillJson({
            signature: request.signature,
            title,
            triggers: next.triggers,
            activationCriteria: next.activationCriteria,
            redactedExamples: next.redactedExamples ?? []
        });
        return next;
    }

    protected recentTriggerHistory(
        candidate: Pick<MemorySkillCandidate, 'lastTriggeredAt' | 'triggerHistory'> & Partial<Pick<MemorySkillCandidate, 'triggerCount'>>,
        windowDays: number
    ): string[] {
        const history = [...(candidate.triggerHistory ?? [])];
        if (!history.length && candidate.lastTriggeredAt) {
            const legacyTriggerCount = 'triggerCount' in candidate && typeof candidate.triggerCount === 'number'
                ? Math.max(1, candidate.triggerCount)
                : 1;
            const lastTriggeredAt = candidate.lastTriggeredAt;
            history.push(...Array.from({ length: legacyTriggerCount }, () => lastTriggeredAt));
        }
        const parsed = history
            .map(value => ({ value, time: Date.parse(value) }))
            .filter(entry => Number.isFinite(entry.time))
            .sort((left, right) => left.time - right.time);
        const latest = parsed[parsed.length - 1]?.time;
        if (latest === undefined) {
            return [];
        }
        const windowMs = Math.max(1, windowDays) * 24 * 60 * 60 * 1000;
        return parsed
            .filter(entry => latest - entry.time <= windowMs)
            .map(entry => entry.value);
    }

    protected tokens(value: string): string[] {
        return value.toLowerCase().split(/[^a-z0-9+#.]+/).filter(token => token.length > 2);
    }

    protected signalTokens(signal: ProjectSignal): Array<{ value: string; weight: number }> {
        return this.tokens(signal.value).map(value => ({
            value,
            weight: signal.weight ?? 1
        }));
    }

    protected titleFromSignature(signature: string): string {
        return signature
            .split(/[:|/._-]+/)
            .filter(Boolean)
            .slice(0, 5)
            .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
            .join(' ') || 'Repeated Prompt Workflow';
    }

    protected proposedSkillJson(options: {
        signature: string;
        title: string;
        triggers?: readonly string[];
        activationCriteria?: string;
        redactedExamples?: readonly string[];
    }): string {
        const id = options.signature.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return JSON.stringify({
            id,
            name: options.title,
            triggerSignature: options.signature,
            triggers: options.triggers ?? this.triggersForSignature(options.signature),
            activationCriteria: options.activationCriteria ?? this.activationCriteria(),
            redactedExamples: options.redactedExamples ?? [],
            userApprovalRequired: true
        }, undefined, 2);
    }

    protected activationCriteria(
        trackingThreshold = DEFAULT_TRACKING_THRESHOLD,
        trackingWindowDays = DEFAULT_TRACKING_WINDOW_DAYS,
        suggestionThreshold = DEFAULT_LIFECYCLE_SUGGESTION_THRESHOLD,
        suggestionWindowDays = DEFAULT_SUGGESTION_WINDOW_DAYS,
        rejectionThreshold = DEFAULT_REJECTION_THRESHOLD
    ): string {
        return [
            `Start tracking after ${trackingThreshold} similar occurrences in ${trackingWindowDays} days.`,
            `Suggest after ${suggestionThreshold} similar occurrences in ${suggestionWindowDays} days.`,
            `Silence after ${rejectionThreshold} rejections for the same pattern.`
        ].join(' ');
    }

    protected triggersForSignature(signature: string): string[] {
        const [intent, language, targetKind, framework, action] = signature.split(':');
        return [
            `intent:${intent || 'general'}`,
            `language:${language || 'unknown'}`,
            `target:${targetKind || 'unknown'}`,
            `framework:${framework || 'none'}`,
            `action:${action || 'unknown'}`
        ];
    }

    protected redactedExamples(existing: readonly string[] | undefined, prompt: string | undefined): string[] {
        const sample = this.redactedExample(prompt);
        const values = [...(existing ?? [])];
        if (sample && !values.includes(sample)) {
            values.push(sample);
        }
        return values.slice(-3);
    }

    protected redactedExample(prompt: string | undefined): string | undefined {
        if (!prompt) {
            return undefined;
        }
        const redacted = this.secretScanner.scan({ content: prompt }).redactedContent
            .replace(/\s+/g, ' ')
            .trim();
        if (!redacted) {
            return undefined;
        }
        return redacted.length > 240 ? `${redacted.slice(0, 237)}...` : redacted;
    }

    protected id(prefix: string): string {
        return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    }
}
