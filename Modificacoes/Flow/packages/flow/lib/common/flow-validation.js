"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFlowWorkflow = validateFlowWorkflow;
var VALID_STATE_TYPES = new Set([
    'input',
    'context',
    'agent',
    'playbook',
    'parallel',
    'dynamic_parallel',
    'tournament',
    'join',
    'condition',
    'gate',
    'loop',
    'command',
    'memory_write',
    'report'
]);
var VALID_OUTCOME_ACTIONS = new Set(['continue', 'complete', 'fail', 'pause', 'wait', 'cancel', 'stop']);
function validateFlowWorkflow(workflow) {
    var _a, _b;
    var errors = [];
    var warnings = [];
    if (!workflow || typeof workflow !== 'object') {
        return {
            valid: false,
            errors: [{ code: 'workflow.invalid', message: 'Workflow must be an object.' }],
            warnings: warnings
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
    if (((_a = workflow.requires) === null || _a === void 0 ? void 0 : _a.capabilities) && !Array.isArray(workflow.requires.capabilities)) {
        errors.push({ code: 'workflow.requires.capabilities.invalid', message: 'Workflow required capabilities must be an array.', path: 'requires.capabilities' });
    }
    for (var _i = 0, _c = (((_b = workflow.requires) === null || _b === void 0 ? void 0 : _b.capabilities) || []).entries(); _i < _c.length; _i++) {
        var _d = _c[_i], index = _d[0], capability = _d[1];
        if (typeof capability !== 'string' || capability.trim() === '') {
            errors.push({ code: 'workflow.requires.capability.invalid', message: "Required capability ".concat(index, " must be a non-empty string."), path: "requires.capabilities.".concat(index) });
        }
    }
    var stateIds = new Set(Object.keys(workflow.states || {}));
    for (var _e = 0, _f = Object.entries(workflow.states || {}); _e < _f.length; _e++) {
        var _g = _f[_e], stateId = _g[0], state = _g[1];
        validateState(stateId, state, "states.".concat(stateId), errors, warnings);
        validateAgentReference(workflow, stateId, state, "states.".concat(stateId), warnings);
        if (state.type === 'parallel' && (!state.branches || Object.keys(state.branches).length === 0)) {
            warnings.push({ code: 'state.parallel.branches.missing', message: "Parallel state \"".concat(stateId, "\" has no branches."), path: "states.".concat(stateId, ".branches") });
        }
        for (var _h = 0, _j = Object.entries(state.branches || {}); _h < _j.length; _h++) {
            var _k = _j[_h], branchId = _k[0], branch = _k[1];
            validateState(branchId, branch, "states.".concat(stateId, ".branches.").concat(branchId), errors, warnings);
            validateAgentReference(workflow, branchId, branch, "states.".concat(stateId, ".branches.").concat(branchId), warnings);
            stateIds.add(branchId);
        }
    }
    for (var _l = 0, _m = Object.entries(workflow.states || {}); _l < _m.length; _l++) {
        var _o = _m[_l], stateId = _o[0], state = _o[1];
        validateStateReferences(stateId, state, "states.".concat(stateId), stateIds, errors);
        for (var _p = 0, _q = Object.entries(state.branches || {}); _p < _q.length; _p++) {
            var _r = _q[_p], branchId = _r[0], branch = _r[1];
            validateStateReferences(branchId, branch, "states.".concat(stateId, ".branches.").concat(branchId), stateIds, errors);
        }
    }
    if (!Array.isArray(workflow.transitions)) {
        errors.push({ code: 'workflow.transitions.invalid', message: 'Workflow transitions must be an array.', path: 'transitions' });
    }
    else {
        workflow.transitions.forEach(function (transition, index) {
            if (!transition.from || !stateIds.has(transition.from)) {
                errors.push({ code: 'transition.from.invalid', message: "Transition ".concat(index, " references unknown source \"").concat(transition.from, "\"."), path: "transitions.".concat(index, ".from") });
            }
            if (!transition.to || !stateIds.has(transition.to)) {
                errors.push({ code: 'transition.to.invalid', message: "Transition ".concat(index, " references unknown target \"").concat(transition.to, "\"."), path: "transitions.".concat(index, ".to") });
            }
            if (!transition.on) {
                errors.push({ code: 'transition.on.required', message: "Transition ".concat(index, " must declare an event trigger."), path: "transitions.".concat(index, ".on") });
            }
            if (transition.from === transition.to && !transition.guard) {
                warnings.push({ code: 'transition.loop.guard.missing', message: "Loop transition ".concat(index, " should declare a bounded guard."), path: "transitions.".concat(index, ".guard") });
            }
        });
    }
    return {
        valid: errors.length === 0,
        errors: errors,
        warnings: warnings
    };
}
function validateState(stateId, state, path, errors, warnings) {
    if (!VALID_STATE_TYPES.has(state.type)) {
        errors.push({ code: 'state.type.invalid', message: "State \"".concat(stateId, "\" has invalid type \"").concat(state.type, "\"."), path: "".concat(path, ".type") });
    }
    if (state.type === 'agent' && !state.agent) {
        warnings.push({ code: 'state.agent.missing', message: "Agent state \"".concat(stateId, "\" does not declare an agent."), path: "".concat(path, ".agent") });
    }
    if (state.type === 'playbook') {
        validatePlaybookState(stateId, state, path, errors);
    }
    if (state.provider !== undefined) {
        validateProviderSelection(stateId, state.provider, "".concat(path, ".provider"), errors);
    }
    if (state.modelExecution !== undefined) {
        validateModelExecutionProfile(stateId, state.modelExecution, "".concat(path, ".modelExecution"), errors);
    }
    if (state.systemPrompt !== undefined && typeof state.systemPrompt !== 'string') {
        errors.push({ code: 'state.system_prompt.invalid', message: "State \"".concat(stateId, "\" system prompt must be a string."), path: "".concat(path, ".systemPrompt") });
    }
    if (state.taskPrompt !== undefined && typeof state.taskPrompt !== 'string') {
        errors.push({ code: 'state.task_prompt.invalid', message: "State \"".concat(stateId, "\" task prompt must be a string."), path: "".concat(path, ".taskPrompt") });
    }
    if (state.prompt !== undefined && typeof state.prompt !== 'string') {
        errors.push({ code: 'state.prompt.invalid', message: "State \"".concat(stateId, "\" prompt must be a string."), path: "".concat(path, ".prompt") });
    }
    if (state.deliverables !== undefined) {
        validateDeliverables(stateId, state.deliverables, "".concat(path, ".deliverables"), state.outputs !== undefined, state.outputs || [], errors);
    }
    if (state.type === 'gate' && (!state.gates || state.gates.length === 0)) {
        warnings.push({ code: 'state.gate.gates.missing', message: "Gate state \"".concat(stateId, "\" does not declare a human gate."), path: "".concat(path, ".gates") });
    }
    if (state.gates !== undefined) {
        validateHumanGates(stateId, state.gates, "".concat(path, ".gates"), errors);
    }
    if (state.outcomes !== undefined) {
        validateOutcomeMap(stateId, state.outcomes, "".concat(path, ".outcomes"), errors, warnings);
    }
    if (state.type === 'loop') {
        validateLoopState(stateId, state, path, errors, warnings);
    }
    if (state.type === 'join' && (!state.waitFor || state.waitFor.length === 0)) {
        warnings.push({ code: 'state.join.wait_for.missing', message: "Join state \"".concat(stateId, "\" does not declare branches to wait for."), path: "".concat(path, ".waitFor") });
    }
    if (state.type === 'dynamic_parallel') {
        validateDynamicParallelState(stateId, state, path, errors, warnings);
    }
    if (state.type === 'tournament') {
        validateTournamentState(stateId, state, path, errors, warnings);
    }
}
function validateHumanGates(stateId, gates, path, errors) {
    if (!Array.isArray(gates)) {
        errors.push({ code: 'state.gates.invalid', message: "State \"".concat(stateId, "\" gates must be an array."), path: path });
        return;
    }
    gates.forEach(function (gate, index) {
        var gatePath = "".concat(path, ".").concat(index);
        if (!gate || typeof gate !== 'object' || Array.isArray(gate)) {
            errors.push({ code: 'state.gate.invalid', message: "State \"".concat(stateId, "\" gate ").concat(index, " must be an object."), path: gatePath });
            return;
        }
        if (typeof gate.id !== 'string' || gate.id.trim() === '') {
            errors.push({ code: 'state.gate.id.required', message: "State \"".concat(stateId, "\" gate ").concat(index, " must declare a non-empty id."), path: "".concat(gatePath, ".id") });
        }
        if (typeof gate.title !== 'string' || gate.title.trim() === '') {
            errors.push({ code: 'state.gate.title.required', message: "State \"".concat(stateId, "\" gate ").concat(index, " must declare a non-empty title."), path: "".concat(gatePath, ".title") });
        }
        if (gate.decisions !== undefined) {
            if (!Array.isArray(gate.decisions)) {
                errors.push({ code: 'state.gate.decisions.invalid', message: "State \"".concat(stateId, "\" gate ").concat(index, " decisions must be an array."), path: "".concat(gatePath, ".decisions") });
                return;
            }
            gate.decisions.forEach(function (decision, decisionIndex) {
                var decisionPath = "".concat(gatePath, ".decisions.").concat(decisionIndex);
                if (!decision || typeof decision !== 'object' || Array.isArray(decision)) {
                    errors.push({ code: 'state.gate.decision.invalid', message: "State \"".concat(stateId, "\" gate decision ").concat(decisionIndex, " must be an object."), path: decisionPath });
                    return;
                }
                if (typeof decision.id !== 'string' || decision.id.trim() === '') {
                    errors.push({ code: 'state.gate.decision.id.required', message: "State \"".concat(stateId, "\" gate decision ").concat(decisionIndex, " must declare a non-empty id."), path: "".concat(decisionPath, ".id") });
                }
                if (typeof decision.label !== 'string' || decision.label.trim() === '') {
                    errors.push({ code: 'state.gate.decision.label.required', message: "State \"".concat(stateId, "\" gate decision ").concat(decisionIndex, " must declare a non-empty label."), path: "".concat(decisionPath, ".label") });
                }
                if (decision.action !== undefined && !VALID_OUTCOME_ACTIONS.has(decision.action)) {
                    errors.push({ code: 'state.gate.decision.action.invalid', message: "State \"".concat(stateId, "\" gate decision \"").concat(decision.id, "\" action is invalid."), path: "".concat(decisionPath, ".action") });
                }
                if (decision.to !== undefined && (typeof decision.to !== 'string' || decision.to.trim() === '')) {
                    errors.push({ code: 'state.gate.decision.to.invalid', message: "State \"".concat(stateId, "\" gate decision \"").concat(decision.id, "\" target must be a non-empty string when set."), path: "".concat(decisionPath, ".to") });
                }
            });
        }
    });
}
function validateOutcomeMap(stateId, outcomes, path, errors, warnings) {
    if (!outcomes || typeof outcomes !== 'object' || Array.isArray(outcomes)) {
        errors.push({ code: 'state.outcomes.invalid', message: "State \"".concat(stateId, "\" outcomes must be an object."), path: path });
        return;
    }
    for (var _i = 0, _a = Object.entries(outcomes); _i < _a.length; _i++) {
        var _b = _a[_i], outcomeId = _b[0], route = _b[1];
        var routePath = "".concat(path, ".").concat(outcomeId);
        if (!outcomeId.trim()) {
            errors.push({ code: 'state.outcome.id.required', message: "State \"".concat(stateId, "\" outcome id must be non-empty."), path: path });
        }
        if (typeof route === 'string') {
            if (!route.trim()) {
                errors.push({ code: 'state.outcome.route.invalid', message: "State \"".concat(stateId, "\" outcome \"").concat(outcomeId, "\" target must be non-empty."), path: routePath });
            }
            continue;
        }
        if (!route || typeof route !== 'object' || Array.isArray(route)) {
            errors.push({ code: 'state.outcome.route.invalid', message: "State \"".concat(stateId, "\" outcome \"").concat(outcomeId, "\" route must be a string or object."), path: routePath });
            continue;
        }
        if (route.to !== undefined && (typeof route.to !== 'string' || route.to.trim() === '')) {
            errors.push({ code: 'state.outcome.route.to.invalid', message: "State \"".concat(stateId, "\" outcome \"").concat(outcomeId, "\" target must be a non-empty string when set."), path: "".concat(routePath, ".to") });
        }
        if (route.action !== undefined && !VALID_OUTCOME_ACTIONS.has(route.action)) {
            errors.push({ code: 'state.outcome.route.action.invalid', message: "State \"".concat(stateId, "\" outcome \"").concat(outcomeId, "\" action is invalid."), path: "".concat(routePath, ".action") });
        }
        if (route.to === undefined && route.action === undefined) {
            warnings.push({ code: 'state.outcome.route.empty', message: "State \"".concat(stateId, "\" outcome \"").concat(outcomeId, "\" does not declare a target or action."), path: routePath });
        }
    }
}
function validateLoopState(stateId, state, path, errors, warnings) {
    var config = state.loop;
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        errors.push({ code: 'state.loop.config.required', message: "Loop state \"".concat(stateId, "\" must declare loop config."), path: "".concat(path, ".loop") });
        return;
    }
    if (typeof config.body !== 'string' || config.body.trim() === '') {
        errors.push({ code: 'state.loop.body.required', message: "Loop state \"".concat(stateId, "\" must declare a body state."), path: "".concat(path, ".loop.body") });
    }
    if (config.repair !== undefined && (typeof config.repair !== 'string' || config.repair.trim() === '')) {
        errors.push({ code: 'state.loop.repair.invalid', message: "Loop state \"".concat(stateId, "\" repair target must be a non-empty string when set."), path: "".concat(path, ".loop.repair") });
    }
    if (config.until !== undefined && (!config.until || typeof config.until !== 'object' || Array.isArray(config.until))) {
        errors.push({ code: 'state.loop.until.invalid', message: "Loop state \"".concat(stateId, "\" until guard must be an object when set."), path: "".concat(path, ".loop.until") });
    }
    if (config.maxIterations !== undefined && (typeof config.maxIterations !== 'number' || !Number.isFinite(config.maxIterations) || config.maxIterations < 1)) {
        errors.push({ code: 'state.loop.max_iterations.invalid', message: "Loop state \"".concat(stateId, "\" max iterations must be a positive number."), path: "".concat(path, ".loop.maxIterations") });
    }
    if (config.maxIterations === undefined) {
        warnings.push({ code: 'state.loop.max_iterations.missing', message: "Loop state \"".concat(stateId, "\" should declare maxIterations to keep the run bounded."), path: "".concat(path, ".loop.maxIterations") });
    }
    if (config.counter !== undefined && (typeof config.counter !== 'string' || config.counter.trim() === '')) {
        errors.push({ code: 'state.loop.counter.invalid', message: "Loop state \"".concat(stateId, "\" counter must be a non-empty string when set."), path: "".concat(path, ".loop.counter") });
    }
}
function validatePlaybookState(stateId, state, path, errors) {
    var playbookId = typeof state.playbookId === 'string' ? state.playbookId.trim() : '';
    var playbook = typeof state.playbook === 'string' ? state.playbook.trim() : '';
    if (!playbookId && !playbook) {
        errors.push({
            code: 'state.playbook.required',
            message: "Playbook state \"".concat(stateId, "\" must declare playbookId or playbook."),
            path: "".concat(path, ".playbookId")
        });
    }
    if (state.playbookInput !== undefined && (!state.playbookInput || typeof state.playbookInput !== 'object' || Array.isArray(state.playbookInput))) {
        errors.push({
            code: 'state.playbook_input.invalid',
            message: "Playbook state \"".concat(stateId, "\" playbookInput must be an object when set."),
            path: "".concat(path, ".playbookInput")
        });
    }
}
function validateProviderSelection(stateId, provider, path, errors) {
    if (!provider || typeof provider !== 'object' || Array.isArray(provider)) {
        errors.push({ code: 'state.provider.invalid', message: "State \"".concat(stateId, "\" provider must be an object."), path: path });
        return;
    }
    if (typeof provider.providerId !== 'string' || provider.providerId.trim() === '') {
        errors.push({ code: 'state.provider.id.required', message: "State \"".concat(stateId, "\" provider id must be a non-empty string."), path: "".concat(path, ".providerId") });
    }
    if (provider.modelId !== undefined && (typeof provider.modelId !== 'string' || provider.modelId.trim() === '')) {
        errors.push({ code: 'state.provider.model.invalid', message: "State \"".concat(stateId, "\" provider model must be a non-empty string when set."), path: "".concat(path, ".modelId") });
    }
}
function validateModelExecutionProfile(stateId, modelExecution, path, errors) {
    var _a, _b, _c, _d;
    if (!modelExecution || typeof modelExecution !== 'object' || Array.isArray(modelExecution)) {
        errors.push({ code: 'state.model_execution.invalid', message: "State \"".concat(stateId, "\" model execution must be an object."), path: path });
        return;
    }
    validateOptionalNumber(stateId, modelExecution.temperature, "".concat(path, ".temperature"), 'temperature', errors);
    validateOptionalNumber(stateId, modelExecution.maxTokens, "".concat(path, ".maxTokens"), 'max tokens', errors);
    validateOptionalNumber(stateId, modelExecution.topP, "".concat(path, ".topP"), 'top-p', errors);
    if (modelExecution.reasoningPolicy !== undefined && !['off', 'native', 'virtual', 'auto', 'native_plus_virtual_light'].includes(modelExecution.reasoningPolicy)) {
        errors.push({ code: 'state.model_execution.reasoning_policy.invalid', message: "State \"".concat(stateId, "\" reasoning policy is invalid."), path: "".concat(path, ".reasoningPolicy") });
    }
    if (modelExecution.nativeReasoning !== undefined && (!modelExecution.nativeReasoning || typeof modelExecution.nativeReasoning !== 'object' || Array.isArray(modelExecution.nativeReasoning))) {
        errors.push({ code: 'state.model_execution.native_reasoning.invalid', message: "State \"".concat(stateId, "\" native reasoning config must be an object."), path: "".concat(path, ".nativeReasoning") });
    }
    if (((_a = modelExecution.nativeReasoning) === null || _a === void 0 ? void 0 : _a.effort) !== undefined && !['none', 'low', 'medium', 'high', 'xhigh'].includes(modelExecution.nativeReasoning.effort)) {
        errors.push({ code: 'state.model_execution.native_reasoning.effort.invalid', message: "State \"".concat(stateId, "\" native reasoning effort is invalid."), path: "".concat(path, ".nativeReasoning.effort") });
    }
    if (modelExecution.reasoningVariant !== undefined && (typeof modelExecution.reasoningVariant !== 'string' || modelExecution.reasoningVariant.trim() === '')) {
        errors.push({ code: 'state.model_execution.reasoning_variant.invalid', message: "State \"".concat(stateId, "\" reasoning variant must be a non-empty string when set."), path: "".concat(path, ".reasoningVariant") });
    }
    if (modelExecution.reasoningVariantOptions !== undefined && (!modelExecution.reasoningVariantOptions || typeof modelExecution.reasoningVariantOptions !== 'object' || Array.isArray(modelExecution.reasoningVariantOptions))) {
        errors.push({ code: 'state.model_execution.reasoning_variant_options.invalid', message: "State \"".concat(stateId, "\" reasoning variant options must be an object when set."), path: "".concat(path, ".reasoningVariantOptions") });
    }
    if (modelExecution.serviceTier !== undefined && !['default', 'fast', 'flex'].includes(modelExecution.serviceTier)) {
        errors.push({ code: 'state.model_execution.service_tier.invalid', message: "State \"".concat(stateId, "\" service tier is invalid."), path: "".concat(path, ".serviceTier") });
    }
    if (modelExecution.virtualReasoning !== undefined && (!modelExecution.virtualReasoning || typeof modelExecution.virtualReasoning !== 'object' || Array.isArray(modelExecution.virtualReasoning))) {
        errors.push({ code: 'state.model_execution.virtual_reasoning.invalid', message: "State \"".concat(stateId, "\" virtual reasoning config must be an object."), path: "".concat(path, ".virtualReasoning") });
    }
    if (((_b = modelExecution.virtualReasoning) === null || _b === void 0 ? void 0 : _b.mode) !== undefined && !['off', 'auto', 'fast', 'balanced', 'deep', 'coding', 'research', 'lats'].includes(modelExecution.virtualReasoning.mode)) {
        errors.push({ code: 'state.model_execution.virtual_reasoning.mode.invalid', message: "State \"".concat(stateId, "\" virtual reasoning mode is invalid."), path: "".concat(path, ".virtualReasoning.mode") });
    }
    validateOptionalNumber(stateId, (_c = modelExecution.nativeReasoning) === null || _c === void 0 ? void 0 : _c.budgetTokens, "".concat(path, ".nativeReasoning.budgetTokens"), 'native reasoning token budget', errors);
    validateOptionalNumber(stateId, (_d = modelExecution.virtualReasoning) === null || _d === void 0 ? void 0 : _d.maxCostMultiplier, "".concat(path, ".virtualReasoning.maxCostMultiplier"), 'virtual reasoning cost multiplier', errors);
}
function validateDynamicParallelState(stateId, state, path, errors, warnings) {
    var config = state.dynamicParallel;
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        errors.push({ code: 'state.dynamic_parallel.config.required', message: "Dynamic parallel state \"".concat(stateId, "\" must declare dynamicParallel config."), path: "".concat(path, ".dynamicParallel") });
        return;
    }
    if (typeof config.itemsFrom !== 'string' || config.itemsFrom.trim() === '') {
        errors.push({ code: 'state.dynamic_parallel.items_from.required', message: "Dynamic parallel state \"".concat(stateId, "\" must choose an item source."), path: "".concat(path, ".dynamicParallel.itemsFrom") });
    }
    if (!config.worker || typeof config.worker !== 'object' || Array.isArray(config.worker)) {
        errors.push({ code: 'state.dynamic_parallel.worker.required', message: "Dynamic parallel state \"".concat(stateId, "\" must declare a worker state."), path: "".concat(path, ".dynamicParallel.worker") });
    }
    else {
        validateState("".concat(stateId, ".worker"), config.worker, "".concat(path, ".dynamicParallel.worker"), errors, warnings);
    }
    validateOptionalNumber(stateId, config.concurrency, "".concat(path, ".dynamicParallel.concurrency"), 'concurrency', errors);
    validateOptionalNumber(stateId, config.maxItems, "".concat(path, ".dynamicParallel.maxItems"), 'max items', errors);
    validateOptionalNumber(stateId, config.failureThreshold, "".concat(path, ".dynamicParallel.failureThreshold"), 'failure threshold', errors);
    if (config.failurePolicy !== undefined && !['fail_fast', 'best_effort', 'threshold'].includes(config.failurePolicy)) {
        errors.push({ code: 'state.dynamic_parallel.failure_policy.invalid', message: "Dynamic parallel state \"".concat(stateId, "\" failure policy is invalid."), path: "".concat(path, ".dynamicParallel.failurePolicy") });
    }
    if (config.joinStrategy !== undefined && !['collect', 'best_effort', 'require_all'].includes(config.joinStrategy)) {
        errors.push({ code: 'state.dynamic_parallel.join_strategy.invalid', message: "Dynamic parallel state \"".concat(stateId, "\" join strategy is invalid."), path: "".concat(path, ".dynamicParallel.joinStrategy") });
    }
}
function validateTournamentState(stateId, state, path, errors, warnings) {
    var config = state.tournament;
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        errors.push({ code: 'state.tournament.config.required', message: "Tournament state \"".concat(stateId, "\" must declare tournament config."), path: "".concat(path, ".tournament") });
        return;
    }
    if (typeof config.candidatesFrom !== 'string' || config.candidatesFrom.trim() === '') {
        errors.push({ code: 'state.tournament.candidates_from.required', message: "Tournament state \"".concat(stateId, "\" must choose a candidate source."), path: "".concat(path, ".tournament.candidatesFrom") });
    }
    if (!config.judge || typeof config.judge !== 'object' || Array.isArray(config.judge)) {
        errors.push({ code: 'state.tournament.judge.required', message: "Tournament state \"".concat(stateId, "\" must declare a judge state."), path: "".concat(path, ".tournament.judge") });
    }
    else {
        validateState("".concat(stateId, ".judge"), config.judge, "".concat(path, ".tournament.judge"), errors, warnings);
    }
    if (config.strategy !== undefined && !['single_round', 'bracket', 'round_robin'].includes(config.strategy)) {
        errors.push({ code: 'state.tournament.strategy.invalid', message: "Tournament state \"".concat(stateId, "\" strategy is invalid."), path: "".concat(path, ".tournament.strategy") });
    }
    if (config.tieBreaker !== undefined && !['judge_again', 'score_total', 'first_candidate'].includes(config.tieBreaker)) {
        errors.push({ code: 'state.tournament.tie_breaker.invalid', message: "Tournament state \"".concat(stateId, "\" tie breaker is invalid."), path: "".concat(path, ".tournament.tieBreaker") });
    }
    validateOptionalNumber(stateId, config.winnerCount, "".concat(path, ".tournament.winnerCount"), 'winner count', errors);
    validateOptionalNumber(stateId, config.maxComparisons, "".concat(path, ".tournament.maxComparisons"), 'max comparisons', errors);
}
function validateOptionalNumber(stateId, value, path, label, errors) {
    if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value))) {
        errors.push({ code: 'state.number.invalid', message: "State \"".concat(stateId, "\" ").concat(label, " must be a finite number."), path: path });
    }
}
function validateDeliverables(stateId, deliverables, path, hasOutputs, outputs, errors) {
    if (!Array.isArray(deliverables)) {
        errors.push({ code: 'state.deliverables.invalid', message: "State \"".concat(stateId, "\" deliverables must be an array."), path: path });
        return;
    }
    var seenPaths = new Set();
    var outputPaths = new Set(outputs.filter(function (output) { return typeof output === 'string'; }));
    deliverables.forEach(function (deliverable, index) {
        var deliverablePath = "".concat(path, ".").concat(index);
        if (!deliverable || typeof deliverable !== 'object' || Array.isArray(deliverable)) {
            errors.push({ code: 'state.deliverable.invalid', message: "State \"".concat(stateId, "\" deliverable ").concat(index, " must be an object."), path: deliverablePath });
            return;
        }
        if (typeof deliverable.path !== 'string' || deliverable.path.trim() === '') {
            errors.push({ code: 'state.deliverable.path.invalid', message: "State \"".concat(stateId, "\" deliverable ").concat(index, " path must be a non-empty relative path."), path: "".concat(deliverablePath, ".path") });
            return;
        }
        var normalizedPath = deliverable.path.trim();
        if (isAbsoluteDeliverablePath(normalizedPath) || hasParentSegment(normalizedPath)) {
            errors.push({ code: 'state.deliverable.path.invalid', message: "State \"".concat(stateId, "\" deliverable ").concat(index, " path must be a non-empty relative path."), path: "".concat(deliverablePath, ".path") });
        }
        if (seenPaths.has(normalizedPath)) {
            errors.push({ code: 'state.deliverable.path.duplicate', message: "State \"".concat(stateId, "\" deliverable path \"").concat(normalizedPath, "\" must be unique."), path: "".concat(deliverablePath, ".path") });
        }
        seenPaths.add(normalizedPath);
        if (hasOutputs && !outputPaths.has(normalizedPath)) {
            errors.push({ code: 'state.deliverable.output.missing', message: "State \"".concat(stateId, "\" deliverable path \"").concat(normalizedPath, "\" must be declared in outputs."), path: "".concat(deliverablePath, ".path") });
        }
    });
}
function isAbsoluteDeliverablePath(path) {
    return path.startsWith('/') || path.startsWith('\\') || /^[A-Za-z]:[\\/]/.test(path);
}
function hasParentSegment(path) {
    return path.split(/[\\/]+/).some(function (segment) { return segment === '..'; });
}
function validateAgentReference(workflow, stateId, state, path, warnings) {
    if (state.type !== 'agent' || !state.agent) {
        return;
    }
    if (workflow.agents && !workflow.agents[state.agent]) {
        warnings.push({
            code: 'state.agent.reference.missing',
            message: "Agent state \"".concat(stateId, "\" references missing workflow agent \"").concat(state.agent, "\"."),
            path: "".concat(path, ".agent")
        });
    }
}
function validateStateReferences(stateId, state, path, stateIds, errors) {
    var _a, _b;
    for (var _i = 0, _c = (state.waitFor || []).entries(); _i < _c.length; _i++) {
        var _d = _c[_i], index = _d[0], waitForStateId = _d[1];
        if (!waitForStateId || !stateIds.has(waitForStateId)) {
            errors.push({
                code: 'state.join.wait_for.invalid',
                message: "Join state \"".concat(stateId, "\" waits for unknown state \"").concat(waitForStateId, "\"."),
                path: "".concat(path, ".waitFor.").concat(index)
            });
        }
    }
    for (var _e = 0, _f = Object.entries(state.outcomes || {}); _e < _f.length; _e++) {
        var _g = _f[_e], outcomeId = _g[0], route = _g[1];
        var target = typeof route === 'string' ? route : route === null || route === void 0 ? void 0 : route.to;
        if (target && !stateIds.has(target)) {
            errors.push({
                code: 'state.outcome.target.invalid',
                message: "State \"".concat(stateId, "\" outcome \"").concat(outcomeId, "\" targets unknown state \"").concat(target, "\"."),
                path: "".concat(path, ".outcomes.").concat(outcomeId)
            });
        }
    }
    for (var _h = 0, _j = (state.gates || []).entries(); _h < _j.length; _h++) {
        var _k = _j[_h], gateIndex = _k[0], gate = _k[1];
        for (var _l = 0, _m = (gate.decisions || []).entries(); _l < _m.length; _l++) {
            var _o = _m[_l], decisionIndex = _o[0], decision = _o[1];
            if (decision.to && !stateIds.has(decision.to)) {
                errors.push({
                    code: 'state.gate.decision.target.invalid',
                    message: "State \"".concat(stateId, "\" gate decision \"").concat(decision.id, "\" targets unknown state \"").concat(decision.to, "\"."),
                    path: "".concat(path, ".gates.").concat(gateIndex, ".decisions.").concat(decisionIndex, ".to")
                });
            }
        }
    }
    if (((_a = state.loop) === null || _a === void 0 ? void 0 : _a.body) && !stateIds.has(state.loop.body)) {
        errors.push({
            code: 'state.loop.body.invalid',
            message: "Loop state \"".concat(stateId, "\" references unknown body state \"").concat(state.loop.body, "\"."),
            path: "".concat(path, ".loop.body")
        });
    }
    if (((_b = state.loop) === null || _b === void 0 ? void 0 : _b.repair) && !stateIds.has(state.loop.repair)) {
        errors.push({
            code: 'state.loop.repair.invalid',
            message: "Loop state \"".concat(stateId, "\" references unknown repair state \"").concat(state.loop.repair, "\"."),
            path: "".concat(path, ".loop.repair")
        });
    }
}
