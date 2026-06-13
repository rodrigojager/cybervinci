import { FlowValidationIssue, FlowValidationResult, FlowWorkflow } from './flow-types';

const VALID_STATE_TYPES = new Set([
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
]);

export function validateFlowWorkflow(workflow: FlowWorkflow): FlowValidationResult {
    const errors: FlowValidationIssue[] = [];
    const warnings: FlowValidationIssue[] = [];

    if (!workflow || typeof workflow !== 'object') {
        return {
            valid: false,
            errors: [{ code: 'workflow.invalid', message: 'Workflow must be an object.' }],
            warnings
        };
    }
    if (!workflow.id) {
        errors.push({ code: 'workflow.id.required', message: 'Workflow id is required.', path: 'id' });
    }
    if (!workflow.name) {
        errors.push({ code: 'workflow.name.required', message: 'Workflow name is required.', path: 'name' });
    }
    if (!workflow.states || Object.keys(workflow.states).length === 0) {
        errors.push({ code: 'workflow.states.required', message: 'Workflow must declare at least one state.', path: 'states' });
    }
    if (workflow.requires?.capabilities && !Array.isArray(workflow.requires.capabilities)) {
        errors.push({ code: 'workflow.requires.capabilities.invalid', message: 'Workflow required capabilities must be an array.', path: 'requires.capabilities' });
    }
    for (const [index, capability] of (workflow.requires?.capabilities || []).entries()) {
        if (typeof capability !== 'string' || capability.trim() === '') {
            errors.push({ code: 'workflow.requires.capability.invalid', message: `Required capability ${index} must be a non-empty string.`, path: `requires.capabilities.${index}` });
        }
    }

    const stateIds = new Set(Object.keys(workflow.states || {}));
    for (const [stateId, state] of Object.entries(workflow.states || {})) {
        validateState(stateId, state, `states.${stateId}`, errors, warnings);
        validateAgentReference(workflow, stateId, state, `states.${stateId}`, warnings);
        if (state.type === 'parallel' && (!state.branches || Object.keys(state.branches).length === 0)) {
            warnings.push({ code: 'state.parallel.branches.missing', message: `Parallel state "${stateId}" has no branches.`, path: `states.${stateId}.branches` });
        }
        for (const [branchId, branch] of Object.entries(state.branches || {})) {
            validateState(branchId, branch, `states.${stateId}.branches.${branchId}`, errors, warnings);
            validateAgentReference(workflow, branchId, branch, `states.${stateId}.branches.${branchId}`, warnings);
            stateIds.add(branchId);
        }
    }
    for (const [stateId, state] of Object.entries(workflow.states || {})) {
        validateStateReferences(stateId, state, `states.${stateId}`, stateIds, errors);
        for (const [branchId, branch] of Object.entries(state.branches || {})) {
            validateStateReferences(branchId, branch, `states.${stateId}.branches.${branchId}`, stateIds, errors);
        }
    }

    if (!Array.isArray(workflow.transitions)) {
        errors.push({ code: 'workflow.transitions.invalid', message: 'Workflow transitions must be an array.', path: 'transitions' });
    } else {
        workflow.transitions.forEach((transition, index) => {
            if (!transition.from || !stateIds.has(transition.from)) {
                errors.push({ code: 'transition.from.invalid', message: `Transition ${index} references unknown source "${transition.from}".`, path: `transitions.${index}.from` });
            }
            if (!transition.to || !stateIds.has(transition.to)) {
                errors.push({ code: 'transition.to.invalid', message: `Transition ${index} references unknown target "${transition.to}".`, path: `transitions.${index}.to` });
            }
            if (!transition.on) {
                errors.push({ code: 'transition.on.required', message: `Transition ${index} must declare an event trigger.`, path: `transitions.${index}.on` });
            }
            if (transition.from === transition.to && !transition.guard) {
                warnings.push({ code: 'transition.loop.guard.missing', message: `Loop transition ${index} should declare a bounded guard.`, path: `transitions.${index}.guard` });
            }
        });
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

function validateState(
    stateId: string,
    state: FlowWorkflow['states'][string],
    path: string,
    errors: FlowValidationIssue[],
    warnings: FlowValidationIssue[]
): void {
    if (!VALID_STATE_TYPES.has(state.type)) {
        errors.push({ code: 'state.type.invalid', message: `State "${stateId}" has invalid type "${state.type}".`, path: `${path}.type` });
    }
    if (state.type === 'agent' && !state.agent) {
        warnings.push({ code: 'state.agent.missing', message: `Agent state "${stateId}" does not declare an agent.`, path: `${path}.agent` });
    }
    if (state.provider !== undefined) {
        validateProviderSelection(stateId, state.provider, `${path}.provider`, errors);
    }
    if (state.modelExecution !== undefined) {
        validateModelExecutionProfile(stateId, state.modelExecution, `${path}.modelExecution`, errors);
    }
    if (state.systemPrompt !== undefined && typeof state.systemPrompt !== 'string') {
        errors.push({ code: 'state.system_prompt.invalid', message: `State "${stateId}" system prompt must be a string.`, path: `${path}.systemPrompt` });
    }
    if (state.taskPrompt !== undefined && typeof state.taskPrompt !== 'string') {
        errors.push({ code: 'state.task_prompt.invalid', message: `State "${stateId}" task prompt must be a string.`, path: `${path}.taskPrompt` });
    }
    if (state.deliverables !== undefined) {
        validateDeliverables(stateId, state.deliverables, `${path}.deliverables`, state.outputs !== undefined, state.outputs || [], errors);
    }
    if (state.type === 'gate' && (!state.gates || state.gates.length === 0)) {
        warnings.push({ code: 'state.gate.gates.missing', message: `Gate state "${stateId}" does not declare a human gate.`, path: `${path}.gates` });
    }
    if (state.type === 'join' && (!state.waitFor || state.waitFor.length === 0)) {
        warnings.push({ code: 'state.join.wait_for.missing', message: `Join state "${stateId}" does not declare branches to wait for.`, path: `${path}.waitFor` });
    }
    if (state.type === 'dynamic_parallel') {
        validateDynamicParallelState(stateId, state, path, errors, warnings);
    }
    if (state.type === 'tournament') {
        validateTournamentState(stateId, state, path, errors, warnings);
    }
}

function validateProviderSelection(
    stateId: string,
    provider: FlowWorkflow['states'][string]['provider'],
    path: string,
    errors: FlowValidationIssue[]
): void {
    if (!provider || typeof provider !== 'object' || Array.isArray(provider)) {
        errors.push({ code: 'state.provider.invalid', message: `State "${stateId}" provider must be an object.`, path });
        return;
    }
    if (typeof provider.providerId !== 'string' || provider.providerId.trim() === '') {
        errors.push({ code: 'state.provider.id.required', message: `State "${stateId}" provider id must be a non-empty string.`, path: `${path}.providerId` });
    }
    if (provider.modelId !== undefined && (typeof provider.modelId !== 'string' || provider.modelId.trim() === '')) {
        errors.push({ code: 'state.provider.model.invalid', message: `State "${stateId}" provider model must be a non-empty string when set.`, path: `${path}.modelId` });
    }
}

function validateModelExecutionProfile(
    stateId: string,
    modelExecution: FlowWorkflow['states'][string]['modelExecution'],
    path: string,
    errors: FlowValidationIssue[]
): void {
    if (!modelExecution || typeof modelExecution !== 'object' || Array.isArray(modelExecution)) {
        errors.push({ code: 'state.model_execution.invalid', message: `State "${stateId}" model execution must be an object.`, path });
        return;
    }
    validateOptionalNumber(stateId, modelExecution.temperature, `${path}.temperature`, 'temperature', errors);
    validateOptionalNumber(stateId, modelExecution.maxTokens, `${path}.maxTokens`, 'max tokens', errors);
    validateOptionalNumber(stateId, modelExecution.topP, `${path}.topP`, 'top-p', errors);
    if (modelExecution.reasoningPolicy !== undefined && !['off', 'native', 'virtual', 'auto', 'native_plus_virtual_light'].includes(modelExecution.reasoningPolicy)) {
        errors.push({ code: 'state.model_execution.reasoning_policy.invalid', message: `State "${stateId}" reasoning policy is invalid.`, path: `${path}.reasoningPolicy` });
    }
    if (modelExecution.nativeReasoning !== undefined && (!modelExecution.nativeReasoning || typeof modelExecution.nativeReasoning !== 'object' || Array.isArray(modelExecution.nativeReasoning))) {
        errors.push({ code: 'state.model_execution.native_reasoning.invalid', message: `State "${stateId}" native reasoning config must be an object.`, path: `${path}.nativeReasoning` });
    }
    if (modelExecution.nativeReasoning?.effort !== undefined && !['none', 'low', 'medium', 'high'].includes(modelExecution.nativeReasoning.effort)) {
        errors.push({ code: 'state.model_execution.native_reasoning.effort.invalid', message: `State "${stateId}" native reasoning effort is invalid.`, path: `${path}.nativeReasoning.effort` });
    }
    if (modelExecution.virtualReasoning !== undefined && (!modelExecution.virtualReasoning || typeof modelExecution.virtualReasoning !== 'object' || Array.isArray(modelExecution.virtualReasoning))) {
        errors.push({ code: 'state.model_execution.virtual_reasoning.invalid', message: `State "${stateId}" virtual reasoning config must be an object.`, path: `${path}.virtualReasoning` });
    }
    if (modelExecution.virtualReasoning?.mode !== undefined && !['off', 'auto', 'fast', 'balanced', 'deep', 'coding', 'research', 'lats'].includes(modelExecution.virtualReasoning.mode)) {
        errors.push({ code: 'state.model_execution.virtual_reasoning.mode.invalid', message: `State "${stateId}" virtual reasoning mode is invalid.`, path: `${path}.virtualReasoning.mode` });
    }
    validateOptionalNumber(stateId, modelExecution.nativeReasoning?.budgetTokens, `${path}.nativeReasoning.budgetTokens`, 'native reasoning token budget', errors);
    validateOptionalNumber(stateId, modelExecution.virtualReasoning?.maxCostMultiplier, `${path}.virtualReasoning.maxCostMultiplier`, 'virtual reasoning cost multiplier', errors);
}

function validateDynamicParallelState(
    stateId: string,
    state: FlowWorkflow['states'][string],
    path: string,
    errors: FlowValidationIssue[],
    warnings: FlowValidationIssue[]
): void {
    const config = state.dynamicParallel;
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        errors.push({ code: 'state.dynamic_parallel.config.required', message: `Dynamic parallel state "${stateId}" must declare dynamicParallel config.`, path: `${path}.dynamicParallel` });
        return;
    }
    if (typeof config.itemsFrom !== 'string' || config.itemsFrom.trim() === '') {
        errors.push({ code: 'state.dynamic_parallel.items_from.required', message: `Dynamic parallel state "${stateId}" must choose an item source.`, path: `${path}.dynamicParallel.itemsFrom` });
    }
    if (!config.worker || typeof config.worker !== 'object' || Array.isArray(config.worker)) {
        errors.push({ code: 'state.dynamic_parallel.worker.required', message: `Dynamic parallel state "${stateId}" must declare a worker state.`, path: `${path}.dynamicParallel.worker` });
    } else {
        validateState(`${stateId}.worker`, config.worker, `${path}.dynamicParallel.worker`, errors, warnings);
    }
    validateOptionalNumber(stateId, config.concurrency, `${path}.dynamicParallel.concurrency`, 'concurrency', errors);
    validateOptionalNumber(stateId, config.maxItems, `${path}.dynamicParallel.maxItems`, 'max items', errors);
    validateOptionalNumber(stateId, config.failureThreshold, `${path}.dynamicParallel.failureThreshold`, 'failure threshold', errors);
    if (config.failurePolicy !== undefined && !['fail_fast', 'best_effort', 'threshold'].includes(config.failurePolicy)) {
        errors.push({ code: 'state.dynamic_parallel.failure_policy.invalid', message: `Dynamic parallel state "${stateId}" failure policy is invalid.`, path: `${path}.dynamicParallel.failurePolicy` });
    }
    if (config.joinStrategy !== undefined && !['collect', 'best_effort', 'require_all'].includes(config.joinStrategy)) {
        errors.push({ code: 'state.dynamic_parallel.join_strategy.invalid', message: `Dynamic parallel state "${stateId}" join strategy is invalid.`, path: `${path}.dynamicParallel.joinStrategy` });
    }
}

function validateTournamentState(
    stateId: string,
    state: FlowWorkflow['states'][string],
    path: string,
    errors: FlowValidationIssue[],
    warnings: FlowValidationIssue[]
): void {
    const config = state.tournament;
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        errors.push({ code: 'state.tournament.config.required', message: `Tournament state "${stateId}" must declare tournament config.`, path: `${path}.tournament` });
        return;
    }
    if (typeof config.candidatesFrom !== 'string' || config.candidatesFrom.trim() === '') {
        errors.push({ code: 'state.tournament.candidates_from.required', message: `Tournament state "${stateId}" must choose a candidate source.`, path: `${path}.tournament.candidatesFrom` });
    }
    if (!config.judge || typeof config.judge !== 'object' || Array.isArray(config.judge)) {
        errors.push({ code: 'state.tournament.judge.required', message: `Tournament state "${stateId}" must declare a judge state.`, path: `${path}.tournament.judge` });
    } else {
        validateState(`${stateId}.judge`, config.judge, `${path}.tournament.judge`, errors, warnings);
    }
    if (config.strategy !== undefined && !['single_round', 'bracket', 'round_robin'].includes(config.strategy)) {
        errors.push({ code: 'state.tournament.strategy.invalid', message: `Tournament state "${stateId}" strategy is invalid.`, path: `${path}.tournament.strategy` });
    }
    if (config.tieBreaker !== undefined && !['judge_again', 'score_total', 'first_candidate'].includes(config.tieBreaker)) {
        errors.push({ code: 'state.tournament.tie_breaker.invalid', message: `Tournament state "${stateId}" tie breaker is invalid.`, path: `${path}.tournament.tieBreaker` });
    }
    validateOptionalNumber(stateId, config.winnerCount, `${path}.tournament.winnerCount`, 'winner count', errors);
    validateOptionalNumber(stateId, config.maxComparisons, `${path}.tournament.maxComparisons`, 'max comparisons', errors);
}

function validateOptionalNumber(
    stateId: string,
    value: unknown,
    path: string,
    label: string,
    errors: FlowValidationIssue[]
): void {
    if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value))) {
        errors.push({ code: 'state.number.invalid', message: `State "${stateId}" ${label} must be a finite number.`, path });
    }
}

function validateDeliverables(
    stateId: string,
    deliverables: FlowWorkflow['states'][string]['deliverables'],
    path: string,
    hasOutputs: boolean,
    outputs: string[],
    errors: FlowValidationIssue[]
): void {
    if (!Array.isArray(deliverables)) {
        errors.push({ code: 'state.deliverables.invalid', message: `State "${stateId}" deliverables must be an array.`, path });
        return;
    }

    const seenPaths = new Set<string>();
    const outputPaths = new Set(outputs.filter((output): output is string => typeof output === 'string'));

    deliverables.forEach((deliverable, index) => {
        const deliverablePath = `${path}.${index}`;
        if (!deliverable || typeof deliverable !== 'object' || Array.isArray(deliverable)) {
            errors.push({ code: 'state.deliverable.invalid', message: `State "${stateId}" deliverable ${index} must be an object.`, path: deliverablePath });
            return;
        }
        if (typeof deliverable.path !== 'string' || deliverable.path.trim() === '') {
            errors.push({ code: 'state.deliverable.path.invalid', message: `State "${stateId}" deliverable ${index} path must be a non-empty relative path.`, path: `${deliverablePath}.path` });
            return;
        }

        const normalizedPath = deliverable.path.trim();
        if (isAbsoluteDeliverablePath(normalizedPath) || hasParentSegment(normalizedPath)) {
            errors.push({ code: 'state.deliverable.path.invalid', message: `State "${stateId}" deliverable ${index} path must be a non-empty relative path.`, path: `${deliverablePath}.path` });
        }
        if (seenPaths.has(normalizedPath)) {
            errors.push({ code: 'state.deliverable.path.duplicate', message: `State "${stateId}" deliverable path "${normalizedPath}" must be unique.`, path: `${deliverablePath}.path` });
        }
        seenPaths.add(normalizedPath);
        if (hasOutputs && !outputPaths.has(normalizedPath)) {
            errors.push({ code: 'state.deliverable.output.missing', message: `State "${stateId}" deliverable path "${normalizedPath}" must be declared in outputs.`, path: `${deliverablePath}.path` });
        }
    });
}

function isAbsoluteDeliverablePath(path: string): boolean {
    return path.startsWith('/') || path.startsWith('\\') || /^[A-Za-z]:[\\/]/.test(path);
}

function hasParentSegment(path: string): boolean {
    return path.split(/[\\/]+/).some(segment => segment === '..');
}

function validateAgentReference(
    workflow: FlowWorkflow,
    stateId: string,
    state: FlowWorkflow['states'][string],
    path: string,
    warnings: FlowValidationIssue[]
): void {
    if (state.type !== 'agent' || !state.agent) {
        return;
    }
    if (workflow.agents && !workflow.agents[state.agent]) {
        warnings.push({
            code: 'state.agent.reference.missing',
            message: `Agent state "${stateId}" references missing workflow agent "${state.agent}".`,
            path: `${path}.agent`
        });
    }
}

function validateStateReferences(
    stateId: string,
    state: FlowWorkflow['states'][string],
    path: string,
    stateIds: Set<string>,
    errors: FlowValidationIssue[]
): void {
    for (const [index, waitForStateId] of (state.waitFor || []).entries()) {
        if (!waitForStateId || !stateIds.has(waitForStateId)) {
            errors.push({
                code: 'state.join.wait_for.invalid',
                message: `Join state "${stateId}" waits for unknown state "${waitForStateId}".`,
                path: `${path}.waitFor.${index}`
            });
        }
    }
}
