"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFlowWorkflowState = createFlowWorkflowState;
exports.addFlowWorkflowState = addFlowWorkflowState;
exports.addFlowWorkflowTransition = addFlowWorkflowTransition;
exports.addFlowParallelBranch = addFlowParallelBranch;
exports.removeFlowWorkflowState = removeFlowWorkflowState;
exports.findFlowWorkflowState = findFlowWorkflowState;
exports.replaceFlowWorkflowState = replaceFlowWorkflowState;
exports.flowWorkflowStateReferences = flowWorkflowStateReferences;
exports.flowWorkflowStateIds = flowWorkflowStateIds;
exports.nextFlowWorkflowStateId = nextFlowWorkflowStateId;
exports.nextFlowWorkflowTransitionId = nextFlowWorkflowTransitionId;
exports.compactFlowState = compactFlowState;
function createFlowWorkflowState(stateType, stateId) {
    var base = { id: stateId, type: stateType };
    if (stateType === 'input') {
        return __assign(__assign({}, base), { outputs: ["".concat(stateId, "/input.md")] });
    }
    if (stateType === 'context') {
        return __assign(__assign({}, base), { outputs: ["".concat(stateId, "/context.md")] });
    }
    if (stateType === 'agent') {
        return __assign(__assign({}, base), { agent: 'agent', outputs: ["".concat(stateId, "/result.md")] });
    }
    if (stateType === 'parallel') {
        return __assign(__assign({}, base), { branches: {} });
    }
    if (stateType === 'dynamic_parallel') {
        return __assign(__assign({}, base), { dynamicParallel: {
                itemsFrom: 'states.discovery.outputs.items',
                itemVariable: 'item',
                worker: {
                    type: 'agent',
                    agent: 'worker',
                    agentRole: 'executor',
                    outputs: ["".concat(stateId, "/items/{{item.id}}.md")]
                },
                concurrency: 4,
                maxItems: 50,
                failurePolicy: 'best_effort',
                joinStrategy: 'collect',
                outputKey: "".concat(stateId, ".results")
            }, outputs: ["".concat(stateId, "/results.json")] });
    }
    if (stateType === 'tournament') {
        return __assign(__assign({}, base), { tournament: {
                candidatesFrom: 'states.generate.outputs.candidates',
                judge: {
                    type: 'agent',
                    agent: 'judge',
                    agentRole: 'judge',
                    outputs: ["".concat(stateId, "/judgment.json")]
                },
                strategy: 'single_round',
                criteria: ['correctness', 'simplicity', 'maintainability'],
                winnerCount: 1,
                tieBreaker: 'judge_again'
            }, outputs: ["".concat(stateId, "/ranking.json")] });
    }
    if (stateType === 'join') {
        return __assign(__assign({}, base), { waitFor: [], outputs: ["".concat(stateId, "/join-summary.md")] });
    }
    if (stateType === 'condition') {
        return __assign(__assign({}, base), { input: { signals: ["".concat(stateId, ".status")] } });
    }
    if (stateType === 'gate') {
        return __assign(__assign({}, base), { gates: [{ id: "".concat(stateId, "_approval"), title: 'Approve next step', stateId: stateId }] });
    }
    if (stateType === 'command') {
        return __assign(__assign({}, base), { effects: [{ kind: 'command', summary: 'Run an approved command.' }], outputs: ["".concat(stateId, "/command-result.md")] });
    }
    if (stateType === 'memory_write') {
        return __assign(__assign({}, base), { effects: [{ kind: 'memory_write', summary: 'Persist approved memory candidates only.' }] });
    }
    if (stateType === 'report') {
        return __assign(__assign({}, base), { input: { include: [] }, outputs: ["".concat(stateId, "/report.md")] });
    }
    return base;
}
function addFlowWorkflowState(workflow, stateType) {
    var _a;
    var stateId = nextFlowWorkflowStateId(workflow, stateType);
    return {
        stateId: stateId,
        workflow: __assign(__assign({}, workflow), { states: __assign(__assign({}, workflow.states), (_a = {}, _a[stateId] = createFlowWorkflowState(stateType, stateId), _a)) })
    };
}
function addFlowWorkflowTransition(workflow, from, to) {
    var stateIds = new Set(flowWorkflowStateIds(workflow));
    if (!stateIds.has(from) || !stateIds.has(to)) {
        return { workflow: workflow };
    }
    var transition = {
        id: nextFlowWorkflowTransitionId(workflow, from, to),
        from: from,
        to: to,
        on: 'workload.completed'
    };
    return {
        transition: transition,
        workflow: __assign(__assign({}, workflow), { transitions: __spreadArray(__spreadArray([], (workflow.transitions || []), true), [transition], false) })
    };
}
function addFlowParallelBranch(workflow, parallelStateId, branchType) {
    var _a;
    var parallelState = findFlowWorkflowState(workflow, parallelStateId);
    if (!parallelState || parallelState.state.type !== 'parallel') {
        return { workflow: workflow };
    }
    var branchId = nextFlowWorkflowStateId(workflow, branchType);
    var updatedParallelState = compactFlowState(__assign(__assign({}, parallelState.state), { branches: __assign(__assign({}, (parallelState.state.branches || {})), (_a = {}, _a[branchId] = createFlowWorkflowState(branchType, branchId), _a)) }));
    return {
        branchId: branchId,
        workflow: replaceFlowWorkflowState(workflow, parallelStateId, updatedParallelState)
    };
}
function removeFlowWorkflowState(workflow, stateId) {
    var _a;
    if (workflow.states[stateId]) {
        var states_1 = __assign({}, workflow.states);
        delete states_1[stateId];
        return __assign(__assign({}, workflow), { states: states_1 });
    }
    var states = __assign({}, workflow.states);
    for (var _i = 0, _b = Object.entries(states); _i < _b.length; _i++) {
        var _c = _b[_i], parentId = _c[0], parentState = _c[1];
        if ((_a = parentState.branches) === null || _a === void 0 ? void 0 : _a[stateId]) {
            var branches = __assign({}, parentState.branches);
            delete branches[stateId];
            states[parentId] = compactFlowState(__assign(__assign({}, parentState), { branches: Object.keys(branches).length ? branches : undefined }));
            break;
        }
    }
    return __assign(__assign({}, workflow), { states: states });
}
function findFlowWorkflowState(workflow, stateId) {
    var _a;
    var state = workflow.states[stateId];
    if (state) {
        return { state: state };
    }
    for (var _i = 0, _b = Object.entries(workflow.states || {}); _i < _b.length; _i++) {
        var _c = _b[_i], parentId = _c[0], parentState = _c[1];
        var branch = (_a = parentState.branches) === null || _a === void 0 ? void 0 : _a[stateId];
        if (branch) {
            return { state: branch, parentId: parentId };
        }
    }
    return undefined;
}
function replaceFlowWorkflowState(workflow, stateId, state) {
    var _a, _b;
    var _c;
    if (workflow.states[stateId]) {
        return __assign(__assign({}, workflow), { states: __assign(__assign({}, workflow.states), (_a = {}, _a[stateId] = state, _a)) });
    }
    var states = __assign({}, workflow.states);
    for (var _i = 0, _d = Object.entries(states); _i < _d.length; _i++) {
        var _e = _d[_i], parentId = _e[0], parentState = _e[1];
        if ((_c = parentState.branches) === null || _c === void 0 ? void 0 : _c[stateId]) {
            states[parentId] = __assign(__assign({}, parentState), { branches: __assign(__assign({}, parentState.branches), (_b = {}, _b[stateId] = state, _b)) });
            break;
        }
    }
    return __assign(__assign({}, workflow), { states: states });
}
function flowWorkflowStateReferences(workflow, stateId) {
    var references = [];
    (workflow.transitions || []).forEach(function (transition, index) {
        if (transition.from === stateId || transition.to === stateId) {
            references.push("transition ".concat(transition.id || index));
        }
    });
    for (var _i = 0, _a = Object.entries(workflow.states || {}); _i < _a.length; _i++) {
        var _b = _a[_i], candidateId = _b[0], state = _b[1];
        collectWaitForReferences(candidateId, state, stateId, references);
        for (var _c = 0, _d = Object.entries(state.branches || {}); _c < _d.length; _c++) {
            var _e = _d[_c], branchId = _e[0], branch = _e[1];
            collectWaitForReferences(branchId, branch, stateId, references);
        }
    }
    return references;
}
function flowWorkflowStateIds(workflow) {
    var ids = [];
    for (var _i = 0, _a = Object.entries(workflow.states || {}); _i < _a.length; _i++) {
        var _b = _a[_i], stateId = _b[0], state = _b[1];
        ids.push(stateId);
        ids.push.apply(ids, Object.keys(state.branches || {}));
    }
    return ids;
}
function nextFlowWorkflowStateId(workflow, stateType) {
    var base = stateType.replace(/[^a-z0-9_]+/gi, '_').toLowerCase();
    var existing = new Set(flowWorkflowStateIds(workflow));
    if (!existing.has(base)) {
        return base;
    }
    var index = 2;
    while (existing.has("".concat(base, "_").concat(index))) {
        index++;
    }
    return "".concat(base, "_").concat(index);
}
function nextFlowWorkflowTransitionId(workflow, from, to) {
    var base = "".concat(from, "_to_").concat(to).replace(/[^a-z0-9_]+/gi, '_').toLowerCase();
    var existing = new Set((workflow.transitions || []).map(function (transition) { return transition.id; }).filter(Boolean));
    if (!existing.has(base)) {
        return base;
    }
    var index = 2;
    while (existing.has("".concat(base, "_").concat(index))) {
        index++;
    }
    return "".concat(base, "_").concat(index);
}
function compactFlowState(state) {
    return compactFlowObject(state);
}
function collectWaitForReferences(candidateId, state, stateId, references) {
    if ((state.waitFor || []).includes(stateId)) {
        references.push("state ".concat(candidateId, ".waitFor"));
    }
}
function compactFlowObject(value) {
    var compacted = {};
    for (var _i = 0, _a = Object.entries(value); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], entry = _b[1];
        if (entry === undefined || entry === '') {
            continue;
        }
        if (Array.isArray(entry) && entry.length === 0) {
            continue;
        }
        if (isPlainObject(entry)) {
            var nested = compactFlowObject(entry);
            if (Object.keys(nested).length === 0) {
                continue;
            }
            compacted[key] = nested;
            continue;
        }
        compacted[key] = entry;
    }
    return compacted;
}
function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
