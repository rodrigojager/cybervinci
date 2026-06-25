// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    CyberVinciCatalogDiagnostic,
    CyberVinciDeclarativeChatAgent,
    CyberVinciPlaybookDefinition,
    CyberVinciPlaybookState,
    CyberVinciToolDefinition
} from '../common';

const AGENT_KINDS = new Set(['native', 'delegate', 'prompt', 'markdown', 'flow', 'external', 'profile']);
const TOOL_KINDS = new Set(['tool', 'guard', 'action', 'query', 'effect', 'ai', 'flow', 'ui']);
const TOOL_SOURCES = new Set(['core', 'system', 'system-override', 'user']);
const TOOL_IMPLEMENTATIONS = new Set(['host', 'command', 'theia-tool', 'composite']);
const PLAYBOOK_STATE_TYPES = new Set(['start', 'guard', 'tool', 'ai', 'ask', 'condition', 'flow', 'playbook', 'parallel', 'response', 'end']);
const PLAYBOOK_FLOW_MODES = new Set(['saved', 'dynamic', 'authoring']);
const PLAYBOOK_ROUTES = new Set(['direct', 'saved-flow', 'dynamic-workflow']);

export interface CyberVinciCatalogValidationResult<T> {
    value?: T;
    diagnostics: CyberVinciCatalogDiagnostic[];
}

export class CyberVinciCatalogValidator {

    validateAgent(candidate: unknown, source: string): CyberVinciCatalogValidationResult<CyberVinciDeclarativeChatAgent> {
        const diagnostics: CyberVinciCatalogDiagnostic[] = [];
        if (!this.isRecord(candidate)) {
            return this.invalid('Agent definition must be an object.', source);
        }
        const id = this.string(candidate.id);
        const name = this.string(candidate.name);
        const kind = this.string(candidate.kind);
        if (!id) {
            diagnostics.push(this.error('Agent id is required.', source));
        }
        if (!name) {
            diagnostics.push(this.error(`Agent '${id || '<unknown>'}' name is required.`, source, id));
        }
        if (!kind || !AGENT_KINDS.has(kind)) {
            diagnostics.push(this.error(`Agent '${id || '<unknown>'}' kind must be one of ${[...AGENT_KINDS].join(', ')}.`, source, id));
        }
        this.validateStringArray(candidate.tags, 'tags', 'Agent', id, source, diagnostics);
        this.validateStringArray(candidate.playbooks, 'playbooks', 'Agent', id, source, diagnostics);
        this.validateStringArray(candidate.tools, 'tools', 'Agent', id, source, diagnostics);
        if (diagnostics.some(item => item.severity === 'error')) {
            return { diagnostics };
        }
        return { value: candidate as unknown as CyberVinciDeclarativeChatAgent, diagnostics };
    }

    validateTool(candidate: unknown, source: string): CyberVinciCatalogValidationResult<CyberVinciToolDefinition> {
        const diagnostics: CyberVinciCatalogDiagnostic[] = [];
        if (!this.isRecord(candidate)) {
            return this.invalid('Tool definition must be an object.', source);
        }
        const id = this.string(candidate.id);
        const name = this.string(candidate.name);
        const kind = this.string(candidate.kind);
        const implementation = this.string(candidate.implementation);
        const sourceKind = this.string(candidate.source);
        if (!id) {
            diagnostics.push(this.error('Tool id is required.', source));
        }
        if (!name) {
            diagnostics.push(this.error(`Tool '${id || '<unknown>'}' name is required.`, source, id));
        }
        if (kind && !TOOL_KINDS.has(kind)) {
            diagnostics.push(this.error(`Tool '${id || '<unknown>'}' kind '${kind}' is not supported.`, source, id));
        }
        if (sourceKind && !TOOL_SOURCES.has(sourceKind)) {
            diagnostics.push(this.error(`Tool '${id || '<unknown>'}' source '${sourceKind}' is not supported.`, source, id));
        }
        if (implementation && !TOOL_IMPLEMENTATIONS.has(implementation)) {
            diagnostics.push(this.error(`Tool '${id || '<unknown>'}' implementation '${implementation}' is not supported.`, source, id));
        }
        if (candidate.steps !== undefined && !Array.isArray(candidate.steps)) {
            diagnostics.push(this.error(`Tool '${id || '<unknown>'}' steps must be an array.`, source, id));
        }
        for (const [index, step] of (Array.isArray(candidate.steps) ? candidate.steps : []).entries()) {
            if (!this.isRecord(step) || !this.string(step.tool)) {
                diagnostics.push(this.error(`Tool '${id || '<unknown>'}' composite step ${index} must define a tool id.`, source, id));
            }
        }
        if (candidate.policy && this.isRecord(candidate.policy) && candidate.policy.allowShell === true && sourceKind === 'user') {
            diagnostics.push(this.warn(`User tool '${id}' requests shell execution; it will still require host policy approval before execution.`, source, id));
        }
        if (diagnostics.some(item => item.severity === 'error')) {
            return { diagnostics };
        }
        return { value: candidate as unknown as CyberVinciToolDefinition, diagnostics };
    }

    validatePlaybook(candidate: unknown, source: string): CyberVinciCatalogValidationResult<CyberVinciPlaybookDefinition> {
        const diagnostics: CyberVinciCatalogDiagnostic[] = [];
        if (!this.isRecord(candidate)) {
            return this.invalid('Playbook definition must be an object.', source);
        }
        const id = this.string(candidate.id);
        const name = this.string(candidate.name);
        const entry = this.string(candidate.entry);
        const states = Array.isArray(candidate.states) ? candidate.states : [];
        if (!id) {
            diagnostics.push(this.error('Playbook id is required.', source));
        }
        if (!name) {
            diagnostics.push(this.error(`Playbook '${id || '<unknown>'}' name is required.`, source, id));
        }
        if (!entry) {
            diagnostics.push(this.error(`Playbook '${id || '<unknown>'}' entry is required.`, source, id));
        }
        if (!Array.isArray(candidate.states)) {
            diagnostics.push(this.error(`Playbook '${id || '<unknown>'}' states must be an array.`, source, id));
        }
        const stateIds = new Set<string>();
        for (const [index, state] of states.entries()) {
            const validated = this.validatePlaybookState(state, index, id ?? '', source);
            diagnostics.push(...validated.diagnostics);
            if (validated.value?.id) {
                if (stateIds.has(validated.value.id)) {
                    diagnostics.push(this.error(`Playbook '${id}' has duplicate state id '${validated.value.id}'.`, source, id));
                }
                stateIds.add(validated.value.id);
            }
        }
        if (entry && states.length && !stateIds.has(entry)) {
            diagnostics.push(this.error(`Playbook '${id}' entry state '${entry}' does not exist.`, source, id));
        }
        for (const state of states.filter(candidateState => this.isRecord(candidateState)) as unknown as CyberVinciPlaybookState[]) {
            for (const referenced of this.referencedStates(state)) {
                if (referenced && !stateIds.has(referenced)) {
                    diagnostics.push(this.error(`Playbook '${id}' state '${state.id}' references unknown state '${referenced}'.`, source, id));
                }
            }
        }
        if (diagnostics.some(item => item.severity === 'error')) {
            return { diagnostics };
        }
        return { value: candidate as unknown as CyberVinciPlaybookDefinition, diagnostics };
    }

    protected validatePlaybookState(candidate: unknown, index: number, playbookId: string, source: string): CyberVinciCatalogValidationResult<CyberVinciPlaybookState> {
        const diagnostics: CyberVinciCatalogDiagnostic[] = [];
        if (!this.isRecord(candidate)) {
            return this.invalid(`Playbook '${playbookId || '<unknown>'}' state ${index} must be an object.`, source, playbookId);
        }
        const id = this.string(candidate.id);
        const type = this.string(candidate.type);
        if (!id) {
            diagnostics.push(this.error(`Playbook '${playbookId || '<unknown>'}' state ${index} id is required.`, source, playbookId));
        }
        if (!type || !PLAYBOOK_STATE_TYPES.has(type)) {
            diagnostics.push(this.error(`Playbook '${playbookId || '<unknown>'}' state '${id || index}' has unsupported type '${type || '<missing>'}'.`, source, playbookId));
        }
        if (type === 'tool' && !this.string(candidate.tool)) {
            diagnostics.push(this.error(`Tool state '${id || index}' must define tool.`, source, playbookId));
        }
        if (type === 'guard' && !this.string(candidate.guard) && !this.string(candidate.tool)) {
            diagnostics.push(this.error(`Guard state '${id || index}' must define guard or tool.`, source, playbookId));
        }
        if (type === 'playbook' && !this.string(candidate.playbook) && !this.string(candidate.playbookId)) {
            diagnostics.push(this.error(`Nested playbook state '${id || index}' must define playbook or playbookId.`, source, playbookId));
        }
        if (type === 'ai') {
            this.validateAiState(candidate, id || String(index), playbookId, source, diagnostics);
        }
        if (type === 'ask') {
            this.validateAskState(candidate, id || String(index), playbookId, source, diagnostics);
        }
        if (type === 'condition') {
            this.validateConditionState(candidate, id || String(index), playbookId, source, diagnostics);
        }
        if (type === 'flow') {
            this.validateFlowState(candidate, id || String(index), playbookId, source, diagnostics);
        }
        if (type === 'parallel') {
            this.validateParallelState(candidate, id || String(index), playbookId, source, diagnostics);
        }
        this.validateTransitions(candidate.transitions, id || String(index), playbookId, source, diagnostics);
        if (candidate.options !== undefined && type !== 'ask') {
            this.validateAskOptions(candidate.options, id || String(index), playbookId, source, diagnostics);
        }
        if (candidate.cases !== undefined && type !== 'condition') {
            this.validateConditionCases(candidate.cases, id || String(index), playbookId, source, diagnostics);
        }
        return diagnostics.some(item => item.severity === 'error')
            ? { diagnostics }
            : { value: candidate as unknown as CyberVinciPlaybookState, diagnostics };
    }

    protected referencedStates(state: CyberVinciPlaybookState): string[] {
        return [
            state.next,
            state.onPass,
            state.onFail,
            state.onError,
            state.default,
            ...(Array.isArray(state.transitions) ? state.transitions.map(transition => transition.to) : []),
            ...(Array.isArray(state.options) ? state.options.map(option => option.next) : []),
            ...(Array.isArray(state.cases) ? state.cases.map(conditionCase => conditionCase.next) : []),
            ...(Array.isArray(state.branches) ? state.branches : [])
        ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
    }

    protected validateAiState(candidate: Record<string, unknown>, stateId: string, playbookId: string, source: string, diagnostics: CyberVinciCatalogDiagnostic[]): void {
        if (!this.string(candidate.agent)) {
            diagnostics.push(this.error(`AI state '${stateId}' must define agent.`, source, playbookId));
        }
        if (!this.string(candidate.prompt) && !this.string(candidate.template)) {
            diagnostics.push(this.error(`AI state '${stateId}' must define prompt or template.`, source, playbookId));
        }
        const outputMode = this.string(candidate.outputMode);
        if (outputMode && outputMode !== 'text' && outputMode !== 'json') {
            diagnostics.push(this.error(`AI state '${stateId}' outputMode must be text or json.`, source, playbookId));
        }
        if (outputMode === 'json' && !this.isRecord(candidate.outputSchema)) {
            diagnostics.push(this.error(`AI state '${stateId}' with outputMode json must define outputSchema.`, source, playbookId));
        }
    }

    protected validateAskState(candidate: Record<string, unknown>, stateId: string, playbookId: string, source: string, diagnostics: CyberVinciCatalogDiagnostic[]): void {
        if (!this.string(candidate.text) && !this.string(candidate.prompt) && !this.string(candidate.template)) {
            diagnostics.push(this.error(`Ask state '${stateId}' must define text, prompt, or template.`, source, playbookId));
        }
        this.validateAskOptions(candidate.options, stateId, playbookId, source, diagnostics, true);
    }

    protected validateConditionState(candidate: Record<string, unknown>, stateId: string, playbookId: string, source: string, diagnostics: CyberVinciCatalogDiagnostic[]): void {
        this.validateConditionCases(candidate.cases, stateId, playbookId, source, diagnostics, true);
        if (candidate.default !== undefined && !this.string(candidate.default)) {
            diagnostics.push(this.error(`Condition state '${stateId}' default must be a state id string.`, source, playbookId));
        }
    }

    protected validateFlowState(candidate: Record<string, unknown>, stateId: string, playbookId: string, source: string, diagnostics: CyberVinciCatalogDiagnostic[]): void {
        const mode = this.string(candidate.mode);
        const route = this.string(candidate.route);
        if (!mode && !route) {
            diagnostics.push(this.error(`Flow state '${stateId}' must define mode or route.`, source, playbookId));
        }
        if (mode && !PLAYBOOK_FLOW_MODES.has(mode)) {
            diagnostics.push(this.error(`Flow state '${stateId}' mode must be one of ${[...PLAYBOOK_FLOW_MODES].join(', ')}.`, source, playbookId));
        }
        if (route && !PLAYBOOK_ROUTES.has(route)) {
            diagnostics.push(this.error(`Flow state '${stateId}' route must be one of ${[...PLAYBOOK_ROUTES].join(', ')}.`, source, playbookId));
        }
        if (mode === 'saved' && !this.string(candidate.workflowId) && !this.string(candidate.flowId)) {
            diagnostics.push(this.error(`Saved Flow state '${stateId}' must define workflowId or flowId.`, source, playbookId));
        }
        if (mode === 'authoring' && candidate.authoringDraft === undefined) {
            diagnostics.push(this.error(`Authoring Flow state '${stateId}' must define authoringDraft.`, source, playbookId));
        }
    }

    protected validateParallelState(candidate: Record<string, unknown>, stateId: string, playbookId: string, source: string, diagnostics: CyberVinciCatalogDiagnostic[]): void {
        if (!Array.isArray(candidate.branches) || !candidate.branches.length || candidate.branches.some(branch => !this.string(branch))) {
            diagnostics.push(this.error(`Parallel state '${stateId}' must define non-empty string branches.`, source, playbookId));
        }
    }

    protected validateTransitions(value: unknown, stateId: string, playbookId: string, source: string, diagnostics: CyberVinciCatalogDiagnostic[]): void {
        if (value === undefined) {
            return;
        }
        if (!Array.isArray(value)) {
            diagnostics.push(this.error(`State '${stateId}' transitions must be an array.`, source, playbookId));
            return;
        }
        for (const [index, transition] of value.entries()) {
            if (!this.isRecord(transition) || !this.string(transition.to)) {
                diagnostics.push(this.error(`State '${stateId}' transition ${index} must define to.`, source, playbookId));
            }
        }
    }

    protected validateAskOptions(value: unknown, stateId: string, playbookId: string, source: string, diagnostics: CyberVinciCatalogDiagnostic[], required = false): void {
        if (value === undefined) {
            if (required) {
                diagnostics.push(this.error(`Ask state '${stateId}' must define options.`, source, playbookId));
            }
            return;
        }
        if (!Array.isArray(value) || (required && !value.length)) {
            diagnostics.push(this.error(`Ask state '${stateId}' options must be a non-empty array.`, source, playbookId));
            return;
        }
        for (const [index, option] of value.entries()) {
            if (!this.isRecord(option) || !this.string(option.id) || !this.string(option.label)) {
                diagnostics.push(this.error(`Ask state '${stateId}' option ${index} must define id and label.`, source, playbookId));
                continue;
            }
            if (option.next !== undefined && !this.string(option.next)) {
                diagnostics.push(this.error(`Ask state '${stateId}' option '${option.id}' next must be a state id string.`, source, playbookId));
            }
        }
    }

    protected validateConditionCases(value: unknown, stateId: string, playbookId: string, source: string, diagnostics: CyberVinciCatalogDiagnostic[], required = false): void {
        if (value === undefined) {
            if (required) {
                diagnostics.push(this.error(`Condition state '${stateId}' must define cases.`, source, playbookId));
            }
            return;
        }
        if (!Array.isArray(value) || (required && !value.length)) {
            diagnostics.push(this.error(`Condition state '${stateId}' cases must be a non-empty array.`, source, playbookId));
            return;
        }
        for (const [index, conditionCase] of value.entries()) {
            if (!this.isRecord(conditionCase) || conditionCase.if === undefined || !this.string(conditionCase.next)) {
                diagnostics.push(this.error(`Condition state '${stateId}' case ${index} must define if and next.`, source, playbookId));
            }
        }
    }

    protected validateStringArray(value: unknown, field: string, label: string, id: string | undefined, source: string, diagnostics: CyberVinciCatalogDiagnostic[]): void {
        if (value === undefined) {
            return;
        }
        if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
            diagnostics.push(this.error(`${label} '${id || '<unknown>'}' field '${field}' must be a string array.`, source, id));
        }
    }

    protected isRecord(candidate: unknown): candidate is Record<string, unknown> {
        return typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate);
    }

    protected string(value: unknown): string | undefined {
        return typeof value === 'string' && value.trim() ? value.trim() : undefined;
    }

    protected invalid<T>(message: string, source: string, id?: string): CyberVinciCatalogValidationResult<T> {
        return { diagnostics: [this.error(message, source, id)] };
    }

    protected error(message: string, source: string, id?: string): CyberVinciCatalogDiagnostic {
        return { severity: 'error', source, id, message };
    }

    protected warn(message: string, source: string, id?: string): CyberVinciCatalogDiagnostic {
        return { severity: 'warning', source, id, message };
    }
}
