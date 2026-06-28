// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable, inject } from '@theia/core/shared/inversify';
import { FlowPlaybookRunner, FlowPlaybookRunRequest, FlowPlaybookRunResult } from '@cybervinci/flow/lib/node/flow-playbook-runner';
import {
    CYBERVINCI_FRONTEND_BRIDGE_SMOKE_PLAYBOOK_ID,
    CyberVinciHostToolExecutionResult,
    CyberVinciPlaybookAskOption,
    CyberVinciPlaybookCondition,
    CyberVinciPlaybookDefinition,
    CyberVinciPlaybookState
} from '../common';
import { CyberVinciAgencyAgentService } from './cybervinci-agency-agent-service';

const MAX_FLOW_PLAYBOOK_STEPS = 64;

interface BackendPlaybookContext {
    requestId: string;
    playbookId: string;
    prompt: string;
    input: Record<string, unknown>;
    state: Record<string, unknown>;
    diagnostics: string[];
    events: BackendPlaybookEvent[];
}

interface BackendPlaybookEvent {
    timestamp: number;
    type: 'started' | 'state' | 'tool' | 'ai' | 'paused' | 'completed' | 'failed';
    stateId?: string;
    message?: string;
    durationMs?: number;
    data?: Record<string, unknown>;
}

interface BackendPlaybookStateResult {
    ok?: boolean;
    next?: string;
    prompt?: string;
    stop?: boolean;
    paused?: boolean;
    message?: string;
}

@injectable()
export class CyberVinciFlowPlaybookRunner implements FlowPlaybookRunner {

    @inject(CyberVinciAgencyAgentService)
    protected readonly service: CyberVinciAgencyAgentService;

    async available(): Promise<boolean> {
        return true;
    }

    async runPlaybook(request: FlowPlaybookRunRequest): Promise<FlowPlaybookRunResult> {
        if (request.playbookId === CYBERVINCI_FRONTEND_BRIDGE_SMOKE_PLAYBOOK_ID) {
            const delegated = await this.service.runPlaybookFromFlowOnClient(request);
            if (delegated) {
                return delegated;
            }
            const message = `Playbook '${request.playbookId}' requires the frontend Playbook runtime, but no frontend client is connected.`;
            return {
                ok: false,
                message,
                issues: [this.issue(message)],
                diagnostics: [message]
            };
        }
        const playbook = await this.service.getPlaybook(request.playbookId);
        if (!playbook) {
            return {
                ok: false,
                message: `Playbook '${request.playbookId}' was not found.`,
                issues: [this.issue(`Playbook '${request.playbookId}' was not found.`)]
            };
        }
        if (await this.shouldUseFrontendRuntime(playbook)) {
            const delegated = await this.service.runPlaybookFromFlowOnClient(request);
            if (delegated) {
                return delegated;
            }
            const message = `Playbook '${playbook.id}' requires the frontend Playbook runtime, but no frontend client is connected.`;
            return {
                ok: false,
                message,
                issues: [this.issue(message)],
                diagnostics: [message]
            };
        }
        const context: BackendPlaybookContext = {
            requestId: `flow-${request.runId}-${request.workloadId}`,
            playbookId: playbook.id,
            prompt: request.prompt,
            input: {
                ...request.input,
                prompt: request.prompt,
                rawPrompt: request.prompt,
                flow: {
                    ...(isRecord(request.input.flow) ? request.input.flow : {}),
                    workflowId: request.workflowId,
                    runId: request.runId,
                    stateId: request.stateId,
                    workloadId: request.workloadId
                }
            },
            state: {},
            diagnostics: [],
            events: []
        };
        context.events.push({
            timestamp: Date.now(),
            type: 'started',
            message: `Flow started CyberVinci Playbook '${playbook.id}'.`
        });
        const result = await this.runPlaybookFrom(playbook, context, playbook.entry);
        const ok = result.ok !== false && context.diagnostics.length === 0;
        context.events.push({
            timestamp: Date.now(),
            type: ok ? 'completed' : 'failed',
            message: result.message ?? `Playbook '${playbook.id}' ${ok ? 'completed' : 'failed'}.`
        });
        return {
            ok,
            stop: result.stop,
            message: result.message ?? `Playbook '${playbook.id}' completed from Flow.`,
            value: {
                playbookId: playbook.id,
                requestId: context.requestId,
                prompt: result.prompt ?? context.prompt,
                state: context.state,
                events: context.events
            },
            signals: {
                'cybervinci.playbook.id': playbook.id,
                'cybervinci.playbook.requestId': context.requestId
            },
            issues: context.diagnostics.map(message => this.issue(message)),
            diagnostics: context.diagnostics
        };
    }

    protected async shouldUseFrontendRuntime(playbook: CyberVinciPlaybookDefinition, visited = new Set<string>()): Promise<boolean> {
        if (visited.has(playbook.id)) {
            return false;
        }
        visited.add(playbook.id);
        const tools = new Map((await this.service.listTools()).map(tool => [tool.id, tool]));
        for (const state of playbook.states) {
            if (state.type === 'ask' || state.type === 'flow') {
                return true;
            }
            if (state.type === 'ai' && (!!state.outputSchema || state.outputMode === 'json' || Boolean(state.input) || Boolean(state.agent))) {
                return true;
            }
            if (state.type === 'tool' || state.type === 'guard') {
                const toolId = state.tool ?? state.guard;
                const tool = toolId ? tools.get(toolId) : undefined;
                if (!tool || tool.implementation === 'host' || tool.entry?.type === 'core' || tool.entry?.type === 'theia-tool') {
                    return true;
                }
            }
            const childPlaybookId = state.type === 'playbook' ? state.playbook ?? state.playbookId : undefined;
            if (childPlaybookId) {
                const child = await this.service.getPlaybook(childPlaybookId);
                if (!child || await this.shouldUseFrontendRuntime(child, visited)) {
                    return true;
                }
            }
        }
        return false;
    }

    protected async runPlaybookFrom(
        playbook: CyberVinciPlaybookDefinition,
        context: BackendPlaybookContext,
        entry: string | undefined
    ): Promise<BackendPlaybookStateResult> {
        const states = new Map(playbook.states.map(state => [state.id, state]));
        let stateId: string | undefined = entry;
        let lastResult: BackendPlaybookStateResult = {};
        for (let step = 0; stateId && step < MAX_FLOW_PLAYBOOK_STEPS; step++) {
            const state = states.get(stateId);
            if (!state) {
                return this.fail(context, stateId, `Playbook '${playbook.id}' references unknown state '${stateId}'.`);
            }
            const startedAt = Date.now();
            context.events.push({
                timestamp: startedAt,
                type: 'state',
                stateId: state.id,
                message: `Entering state '${state.id}' (${state.type}).`
            });
            const result = await this.executeState(playbook, state, context);
            context.events.push({
                timestamp: Date.now(),
                type: 'state',
                stateId: state.id,
                message: `State '${state.id}' (${state.type}) completed.`,
                durationMs: Date.now() - startedAt,
                data: {
                    ok: result.ok !== false,
                    stop: result.stop === true,
                    next: result.next
                }
            });
            lastResult = result;
            if (result.prompt !== undefined) {
                context.prompt = result.prompt;
            }
            if (result.ok === false) {
                stateId = state.onError;
                if (stateId) {
                    continue;
                }
                return result;
            }
            if (result.stop || result.paused) {
                return result;
            }
            stateId = this.resolveNextState(state, result, context);
        }
        if (stateId) {
            return this.fail(context, stateId, `Playbook '${playbook.id}' exceeded ${MAX_FLOW_PLAYBOOK_STEPS} steps.`);
        }
        return lastResult;
    }

    protected async executeState(
        playbook: CyberVinciPlaybookDefinition,
        state: CyberVinciPlaybookState,
        context: BackendPlaybookContext
    ): Promise<BackendPlaybookStateResult> {
        switch (state.type) {
            case 'start':
            case 'end':
                return {};
            case 'tool':
                return this.executeToolState(playbook, state, context, state.tool);
            case 'guard':
                return this.executeGuardState(playbook, state, context);
            case 'condition':
                return { next: this.resolveConditionState(state, context) };
            case 'response':
                return this.executeResponseState(state, context);
            case 'ai':
                return this.executeAiState(state, context);
            case 'ask':
                return this.executeAskState(state, context);
            case 'playbook':
                return this.executeNestedPlaybookState(state, context);
            case 'parallel':
                return this.executeParallelState(playbook, state, context);
            case 'flow':
                return {
                    ok: false,
                    stop: true,
                    message: `Flow state '${state.id}' cannot be executed inside the backend Flow Playbook runner to avoid recursive Flow execution.`
                };
            default:
                return { ok: false, stop: true, message: `Unknown playbook state type '${state.type}'.` };
        }
    }

    protected async executeToolState(
        playbook: CyberVinciPlaybookDefinition,
        state: CyberVinciPlaybookState,
        context: BackendPlaybookContext,
        explicitToolId: string | undefined
    ): Promise<BackendPlaybookStateResult> {
        const toolId = explicitToolId?.trim();
        if (!toolId) {
            return { ok: false, stop: true, message: `State '${state.id}' does not define a tool.` };
        }
        const tool = (await this.service.listTools()).find(candidate => candidate.id === toolId);
        if (tool?.implementation === 'host' || tool?.entry?.type === 'core' || tool?.entry?.type === 'theia-tool') {
            return {
                ok: false,
                stop: true,
                message: `Tool '${toolId}' requires the frontend Playbook runtime or Theia tool bridge and cannot run in backend Flow context.`
            };
        }
        const input = this.resolveRecord({
            prompt: context.prompt,
            ...(state.args ?? {})
        }, context);
        const startedAt = Date.now();
        const execution = await this.service.executeDeclarativeTool(toolId, JSON.stringify(input));
        const result = this.commandToolResult(execution);
        context.events.push({
            timestamp: Date.now(),
            type: 'tool',
            stateId: state.id,
            message: `Tool '${toolId}' completed with ok=${result.ok}.`,
            durationMs: Date.now() - startedAt,
            data: {
                toolId,
                exitCode: execution.exitCode
            }
        });
        this.captureToolResult(state, result, context);
        return {
            ok: result.ok,
            stop: result.stop,
            message: result.message
        };
    }

    protected async executeGuardState(
        playbook: CyberVinciPlaybookDefinition,
        state: CyberVinciPlaybookState,
        context: BackendPlaybookContext
    ): Promise<BackendPlaybookStateResult> {
        const result = await this.executeToolState(playbook, state, context, state.guard ?? state.tool);
        return {
            ...result,
            stop: result.stop || (!result.ok && !state.onFail),
            next: result.ok ? state.onPass : state.onFail
        };
    }

    protected executeAskState(state: CyberVinciPlaybookState, context: BackendPlaybookContext): BackendPlaybookStateResult {
        const options = state.options ?? [];
        const selected = this.resolveAskOptionSelection(state, context);
        if (selected) {
            const saveKey = state.saveAs ?? state.id;
            context.state[saveKey] = selected.id;
            context.state[`${saveKey}Meta`] = {
                optionId: selected.id,
                label: selected.label,
                next: selected.next,
                selectedAt: Date.now()
            };
            return { ok: true, next: selected.next };
        }
        context.state[state.saveAs ?? state.id] = {
            status: 'paused',
            reason: `Ask state '${state.id}' needs an explicit optionId in Flow playbookInput.`,
            options: options.map(option => ({ id: option.id, label: option.label, next: option.next }))
        };
        return {
            ok: false,
            stop: true,
            paused: true,
            message: `Ask state '${state.id}' needs an explicit optionId in Flow playbookInput.`
        };
    }

    protected executeAiState(state: CyberVinciPlaybookState, context: BackendPlaybookContext): BackendPlaybookStateResult {
        const nextPrompt = state.prompt || state.template
            ? this.renderTemplate(state.prompt ?? state.template ?? '', context)
            : context.prompt;
        const wantsStructuredOutput = !!state.outputSchema || state.outputMode === 'json';
        if (wantsStructuredOutput || state.input || state.agent) {
            return {
                ok: false,
                stop: true,
                message: `AI state '${state.id}' requires CyberVinci AI Runtime frontend execution and cannot run in backend Flow context.`
            };
        }
        if (state.saveAs) {
            context.state[state.saveAs] = nextPrompt;
        }
        return { ok: true, prompt: nextPrompt };
    }

    protected async executeNestedPlaybookState(
        state: CyberVinciPlaybookState,
        context: BackendPlaybookContext
    ): Promise<BackendPlaybookStateResult> {
        const playbookId = state.playbook ?? state.playbookId;
        if (!playbookId) {
            return { ok: false, stop: true, message: `Nested playbook state '${state.id}' does not define playbook/playbookId.` };
        }
        const child = await this.service.getPlaybook(playbookId);
        if (!child) {
            return { ok: false, stop: true, message: `Nested playbook '${playbookId}' was not found.` };
        }
        const previousPlaybookId = context.playbookId;
        context.playbookId = child.id;
        try {
            const result = await this.runPlaybookFrom(child, context, child.entry);
            if (state.saveAs) {
                context.state[state.saveAs] = {
                    ok: result.ok !== false,
                    message: result.message,
                    prompt: result.prompt
                };
            }
            return result;
        } finally {
            context.playbookId = previousPlaybookId;
        }
    }

    protected async executeParallelState(
        playbook: CyberVinciPlaybookDefinition,
        state: CyberVinciPlaybookState,
        context: BackendPlaybookContext
    ): Promise<BackendPlaybookStateResult> {
        const branches = state.branches ?? [];
        if (!branches.length) {
            return { ok: false, stop: true, message: `Parallel state '${state.id}' does not define branches.` };
        }
        const results = await Promise.all(branches.map(async branch => {
            const branchContext: BackendPlaybookContext = {
                ...context,
                state: { ...context.state },
                diagnostics: [],
                events: context.events
            };
            const result = await this.runPlaybookFrom(playbook, branchContext, branch);
            return {
                branch,
                ok: result.ok !== false,
                message: result.message,
                diagnostics: branchContext.diagnostics,
                state: branchContext.state
            };
        }));
        const failed = results.find(result => !result.ok);
        if (state.saveAs) {
            context.state[state.saveAs] = results;
        }
        for (const result of results) {
            context.state[`parallel.${state.id}.${result.branch}`] = result.state;
            context.diagnostics.push(...result.diagnostics);
        }
        return {
            ok: !failed,
            message: failed
                ? `Parallel branch '${failed.branch}' failed: ${failed.message ?? 'unknown error'}`
                : `Parallel state '${state.id}' completed ${results.length} branch(es).`
        };
    }

    protected executeResponseState(state: CyberVinciPlaybookState, context: BackendPlaybookContext): BackendPlaybookStateResult {
        return {
            ok: true,
            stop: true,
            message: this.renderTemplate(state.template ?? state.prompt ?? state.text ?? '', context)
        };
    }

    protected commandToolResult(result: { exitCode: number | null; stdout: string; stderr: string }): CyberVinciHostToolExecutionResult {
        const parsed = parseJsonValue(result.stdout.trim());
        return {
            ok: result.exitCode === 0,
            value: parsed ?? {
                stdout: result.stdout,
                stderr: result.stderr,
                exitCode: result.exitCode
            },
            message: result.stderr || result.stdout || `Command exited with ${result.exitCode}.`,
            diagnostics: result.exitCode === 0 || !result.stderr ? [] : [result.stderr],
            stop: result.exitCode !== 0
        };
    }

    protected captureToolResult(
        state: CyberVinciPlaybookState,
        result: CyberVinciHostToolExecutionResult,
        context: BackendPlaybookContext
    ): void {
        if (state.saveAs) {
            context.state[state.saveAs] = result.value ?? result.message ?? result.ok;
        }
        if (result.diagnostics?.length) {
            context.diagnostics.push(...result.diagnostics);
        }
    }

    protected resolveNextState(
        state: CyberVinciPlaybookState,
        result: BackendPlaybookStateResult,
        context: BackendPlaybookContext
    ): string | undefined {
        if (result.next) {
            return result.next;
        }
        for (const transition of state.transitions ?? []) {
            if (transition.when === undefined || this.evaluateCondition(transition.when, context)) {
                return transition.to;
            }
        }
        return state.next;
    }

    protected resolveConditionState(state: CyberVinciPlaybookState, context: BackendPlaybookContext): string | undefined {
        for (const conditionCase of state.cases ?? []) {
            if (this.evaluateCondition(conditionCase.if, context)) {
                return conditionCase.next;
            }
        }
        return state.default ?? state.next;
    }

    protected evaluateCondition(condition: CyberVinciPlaybookCondition | string | unknown, context: BackendPlaybookContext): boolean {
        if (typeof condition === 'string') {
            return Boolean(this.resolveValue(condition, context));
        }
        if (!condition || typeof condition !== 'object' || Array.isArray(condition)) {
            return Boolean(condition);
        }
        const typed = condition as CyberVinciPlaybookCondition;
        if (typed.exists !== undefined) {
            const value = this.resolveValue(typed.exists, context);
            return value !== undefined && value !== null && value !== '';
        }
        if (typed.lengthGreaterThan) {
            const value = this.resolveValue(typed.lengthGreaterThan[0], context);
            const threshold = Number(this.resolveValue(typed.lengthGreaterThan[1], context));
            const length = Array.isArray(value) || typeof value === 'string' ? value.length : 0;
            return length > threshold;
        }
        if (typed.equals) {
            return this.stableValue(this.resolveValue(typed.equals[0], context)) === this.stableValue(this.resolveValue(typed.equals[1], context));
        }
        if (typed.not !== undefined) {
            return !this.evaluateCondition(typed.not, context);
        }
        if (typed.and) {
            return typed.and.every(item => this.evaluateCondition(item, context));
        }
        if (typed.or) {
            return typed.or.some(item => this.evaluateCondition(item, context));
        }
        return true;
    }

    protected resolveAskOptionSelection(state: CyberVinciPlaybookState, context: BackendPlaybookContext): CyberVinciPlaybookAskOption | undefined {
        const options = state.options ?? [];
        const saveKey = state.saveAs ?? state.id;
        const candidateKeys = ['optionId', 'askOptionId', 'askOption', 'selectedOption', 'choice', 'decision', saveKey, state.id];
        const candidateSources = [context.input, context.state].filter((source): source is Record<string, unknown> => isRecord(source));
        for (const source of candidateSources) {
            for (const key of candidateKeys) {
                const option = this.matchAskOption(options, source[key]);
                if (option) {
                    return option;
                }
            }
        }
        return undefined;
    }

    protected matchAskOption(options: CyberVinciAskOptions, value: unknown): CyberVinciPlaybookAskOption | undefined {
        if (value === undefined || value === null) {
            return undefined;
        }
        if (isRecord(value)) {
            return this.matchAskOption(options, value.optionId ?? value.id ?? value.value ?? value.choice ?? value.decision ?? value.selectedOption);
        }
        const raw = String(value).trim();
        if (!raw) {
            return undefined;
        }
        const numeric = Number(raw);
        if (Number.isInteger(numeric) && numeric >= 1 && numeric <= options.length) {
            return options[numeric - 1];
        }
        const normalized = raw.toLocaleLowerCase();
        return options.find(option => option.id.toLocaleLowerCase() === normalized || option.label.toLocaleLowerCase() === normalized);
    }

    protected resolveRecord(record: Record<string, unknown>, context: BackendPlaybookContext): Record<string, unknown> {
        return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, this.resolveValue(value, context)]));
    }

    protected resolveValue(value: unknown, context: BackendPlaybookContext): unknown {
        if (typeof value !== 'string') {
            return value;
        }
        const exact = value.match(/^\$\{([^}]+)\}$/);
        if (exact) {
            return this.lookupPath(exact[1].trim(), context);
        }
        return this.renderTemplate(value, context);
    }

    protected renderTemplate(template: string, context: BackendPlaybookContext): string {
        return template.replace(/\$\{([^}]+)\}/g, (_match, pathExpression: string) => {
            const value = this.lookupPath(pathExpression.trim(), context);
            return value === undefined || value === null ? '' : String(value);
        });
    }

    protected lookupPath(pathExpression: string, context: BackendPlaybookContext): unknown {
        if (pathExpression === 'prompt') {
            return context.prompt;
        }
        const root = pathExpression.split('.')[0];
        const source: unknown = root === 'input'
            ? context.input
            : root === 'state'
                ? context.state
                : undefined;
        if (source === undefined) {
            return undefined;
        }
        const parts = pathExpression.split('.').slice(1);
        return parts.reduce<unknown>((current, key) => {
            if (!current || typeof current !== 'object') {
                return undefined;
            }
            return (current as Record<string, unknown>)[key];
        }, source);
    }

    protected stableValue(value: unknown): string {
        return typeof value === 'string' ? value : JSON.stringify(value);
    }

    protected fail(context: BackendPlaybookContext, stateId: string, message: string): BackendPlaybookStateResult {
        context.diagnostics.push(message);
        context.events.push({
            timestamp: Date.now(),
            type: 'failed',
            stateId,
            message
        });
        return { ok: false, stop: true, message };
    }

    protected issue(summary: string) {
        return {
            severity: 'blocking',
            type: 'playbook',
            summary,
            producer: 'cybervinci-flow-playbook-runner'
        };
    }
}

type CyberVinciAskOptions = NonNullable<CyberVinciPlaybookState['options']>;

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseJsonValue(text: string): unknown {
    if (!text) {
        return undefined;
    }
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
}
