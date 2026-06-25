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
exports.deriveFlowCanvasModel = deriveFlowCanvasModel;
exports.deriveFlowFlowDraft = deriveFlowFlowDraft;
exports.deriveFlowKanbanColumns = deriveFlowKanbanColumns;
exports.summarizeGuard = summarizeGuard;
exports.nextRuntimeStatus = nextRuntimeStatus;
var NODE_WIDTH = 236;
var NODE_HEIGHT = 96;
var X_STEP = 380;
var Y_STEP = 158;
var KANBAN_ORDER = [
    { id: 'pending', label: 'Pending' },
    { id: 'ready', label: 'Ready' },
    { id: 'running', label: 'Running' },
    { id: 'waiting', label: 'Waiting' },
    { id: 'review', label: 'Review' },
    { id: 'done', label: 'Done' },
    { id: 'failed', label: 'Failed' }
];
function deriveFlowCanvasModel(workflow, run) {
    var states = flattenWorkflowStates(workflow);
    var stateRoutes = deriveStateRoutes(workflow);
    var transitionRouteKeys = new Set((workflow.transitions || []).map(function (transition) { return routeKey(transition.from, transition.to); }));
    var incoming = new Map();
    var outgoing = new Map();
    for (var _i = 0, _a = workflow.transitions || []; _i < _a.length; _i++) {
        var transition = _a[_i];
        incoming.set(transition.to, (incoming.get(transition.to) || 0) + 1);
        var next = outgoing.get(transition.from) || [];
        next.push(transition.to);
        outgoing.set(transition.from, next);
    }
    for (var _b = 0, stateRoutes_1 = stateRoutes; _b < stateRoutes_1.length; _b++) {
        var route = stateRoutes_1[_b];
        if (transitionRouteKeys.has(routeKey(route.from, route.to))) {
            continue;
        }
        incoming.set(route.to, (incoming.get(route.to) || 0) + 1);
        var next = outgoing.get(route.from) || [];
        if (!next.includes(route.to)) {
            next.push(route.to);
        }
        outgoing.set(route.from, next);
    }
    for (var _c = 0, _d = Object.entries(workflow.states || {}); _c < _d.length; _c++) {
        var _e = _d[_c], stateId = _e[0], state = _e[1];
        var branchIds = Object.keys(state.branches || {});
        if (branchIds.length === 0) {
            continue;
        }
        var next = outgoing.get(stateId) || [];
        for (var _f = 0, branchIds_1 = branchIds; _f < branchIds_1.length; _f++) {
            var branchId = branchIds_1[_f];
            incoming.set(branchId, (incoming.get(branchId) || 0) + 1);
            if (!next.includes(branchId)) {
                next.push(branchId);
            }
        }
        outgoing.set(stateId, next);
    }
    var orderedIds = orderStateIds(states.map(function (state) { return state.id; }), incoming, outgoing);
    var depths = computeDepths(orderedIds, outgoing);
    var laneCounts = new Map();
    var nodes = orderedIds.map(function (stateId) {
        var _a, _b, _c, _d;
        var state = states.find(function (candidate) { return candidate.id === stateId; });
        var depth = depths.get(stateId) || 0;
        var lane = laneCounts.get(depth) || 0;
        laneCounts.set(depth, lane + 1);
        return {
            id: stateId,
            label: stateId.replace(/_/g, ' '),
            type: state ? state.value.type : 'condition',
            agent: state === null || state === void 0 ? void 0 : state.value.agent,
            status: (run === null || run === void 0 ? void 0 : run.stateStatuses[stateId]) || 'pending',
            x: (_b = (_a = state === null || state === void 0 ? void 0 : state.value.layout) === null || _a === void 0 ? void 0 : _a.x) !== null && _b !== void 0 ? _b : 24 + depth * X_STEP,
            y: (_d = (_c = state === null || state === void 0 ? void 0 : state.value.layout) === null || _c === void 0 ? void 0 : _c.y) !== null && _d !== void 0 ? _d : 24 + lane * Y_STEP,
            width: NODE_WIDTH,
            height: NODE_HEIGHT
        };
    });
    var nodeById = new Map(nodes.map(function (node) { return [node.id, node]; }));
    var edges = (workflow.transitions || []).map(function (transition, index) {
        var from = nodeById.get(transition.from);
        var to = nodeById.get(transition.to);
        return {
            id: transition.id || "".concat(transition.from, "-").concat(transition.to, "-").concat(index),
            from: transition.from,
            to: transition.to,
            event: transition.on,
            guardSummary: summarizeGuard(transition.guard),
            priority: transition.priority,
            points: from && to ? [
                { x: from.x + from.width, y: from.y + from.height / 2 },
                { x: to.x, y: to.y + to.height / 2 }
            ] : []
        };
    });
    for (var _g = 0, _h = stateRoutes.entries(); _g < _h.length; _g++) {
        var _j = _h[_g], index = _j[0], route = _j[1];
        if (transitionRouteKeys.has(routeKey(route.from, route.to))) {
            continue;
        }
        var from = nodeById.get(route.from);
        var to = nodeById.get(route.to);
        edges.push({
            id: route.id || "".concat(route.from, "-").concat(route.to, "-").concat(route.event, "-").concat(index),
            from: route.from,
            to: route.to,
            event: route.event,
            guardSummary: route.summary,
            points: from && to ? [
                { x: from.x + from.width, y: from.y + from.height / 2 },
                { x: to.x, y: to.y + to.height / 2 }
            ] : []
        });
    }
    var width = Math.max.apply(Math, __spreadArray([640], nodes.map(function (node) { return node.x + node.width + 32; }), false));
    var height = Math.max.apply(Math, __spreadArray([361], nodes.map(function (node) { return node.y + node.height + 32; }), false));
    return { nodes: nodes, edges: edges, width: width, height: height };
}
function routeKey(from, to) {
    return "".concat(from, "\0").concat(to);
}
function deriveStateRoutes(workflow) {
    var knownStates = new Set(flattenWorkflowStates(workflow).map(function (state) { return state.id; }));
    var routes = [];
    var visit = function (stateId, state) {
        var _a, _b;
        for (var _i = 0, _c = Object.entries(state.outcomes || {}); _i < _c.length; _i++) {
            var _d = _c[_i], outcomeId = _d[0], route = _d[1];
            var target = typeof route === 'string' ? route : route === null || route === void 0 ? void 0 : route.to;
            if (target && knownStates.has(target)) {
                routes.push({
                    id: "".concat(stateId, "_outcome_").concat(outcomeId, "_to_").concat(target),
                    from: stateId,
                    to: target,
                    event: "outcome.".concat(outcomeId),
                    summary: typeof route === 'string' ? undefined : route.action || route.label
                });
            }
        }
        if (((_a = state.loop) === null || _a === void 0 ? void 0 : _a.body) && knownStates.has(state.loop.body)) {
            routes.push({
                id: "".concat(stateId, "_loop_body_").concat(state.loop.body),
                from: stateId,
                to: state.loop.body,
                event: 'loop.body',
                summary: state.loop.counter
            });
        }
        if (((_b = state.loop) === null || _b === void 0 ? void 0 : _b.repair) && knownStates.has(state.loop.repair)) {
            routes.push({
                id: "".concat(stateId, "_loop_repair_").concat(state.loop.repair),
                from: stateId,
                to: state.loop.repair,
                event: 'loop.repair',
                summary: state.loop.counter
            });
        }
    };
    for (var _i = 0, _a = Object.entries(workflow.states || {}); _i < _a.length; _i++) {
        var _b = _a[_i], stateId = _b[0], state = _b[1];
        visit(stateId, state);
        for (var _c = 0, _d = Object.entries(state.branches || {}); _c < _d.length; _c++) {
            var _e = _d[_c], branchId = _e[0], branch = _e[1];
            visit(branchId, branch);
        }
    }
    return routes;
}
function deriveFlowFlowDraft(workflow, run) {
    var canvas = deriveFlowCanvasModel(workflow, run);
    return {
        nodes: canvas.nodes.map(function (node) { return ({
            id: node.id,
            type: 'flowState',
            position: { x: node.x, y: node.y },
            data: {
                stateId: node.id,
                label: node.label,
                stateType: node.type,
                agent: node.agent,
                status: node.status
            }
        }); }),
        edges: canvas.edges.map(function (edge) { return ({
            id: edge.id,
            source: edge.from,
            target: edge.to,
            label: edge.guardSummary ? "".concat(edge.event, " / ").concat(edge.guardSummary) : edge.event,
            data: {
                event: edge.event,
                guardSummary: edge.guardSummary,
                priority: edge.priority
            }
        }); }),
        viewport: {
            width: canvas.width,
            height: canvas.height
        }
    };
}
function deriveFlowKanbanColumns(workloads) {
    return KANBAN_ORDER.map(function (column) { return (__assign(__assign({}, column), { workloads: workloads.filter(function (workload) { return workload.status === column.id; }) })); });
}
function summarizeGuard(guard) {
    if (!guard) {
        return undefined;
    }
    if (typeof guard !== 'object') {
        return String(guard);
    }
    var keys = Object.keys(guard);
    if (keys.length === 0) {
        return undefined;
    }
    if (keys.length === 1) {
        return keys[0];
    }
    return keys.join(' + ');
}
function flattenWorkflowStates(workflow) {
    var states = [];
    for (var _i = 0, _a = Object.entries(workflow.states || {}); _i < _a.length; _i++) {
        var _b = _a[_i], id = _b[0], state = _b[1];
        states.push({ id: id, value: state });
        for (var _c = 0, _d = Object.entries(state.branches || {}); _c < _d.length; _c++) {
            var _e = _d[_c], branchId = _e[0], branch = _e[1];
            states.push({ id: branchId, value: branch });
        }
    }
    return states;
}
function orderStateIds(stateIds, incoming, outgoing) {
    var queue = stateIds.filter(function (id) { return !incoming.has(id); }).sort();
    var ordered = [];
    var seen = new Set();
    while (queue.length > 0) {
        var id = queue.shift();
        if (!id || seen.has(id)) {
            continue;
        }
        seen.add(id);
        ordered.push(id);
        for (var _i = 0, _a = outgoing.get(id) || []; _i < _a.length; _i++) {
            var target = _a[_i];
            if (!seen.has(target) && !queue.includes(target)) {
                queue.push(target);
            }
        }
    }
    for (var _b = 0, stateIds_1 = stateIds; _b < stateIds_1.length; _b++) {
        var id = stateIds_1[_b];
        if (!seen.has(id)) {
            ordered.push(id);
        }
    }
    return ordered;
}
function computeDepths(orderedIds, outgoing) {
    var depths = new Map();
    for (var _i = 0, orderedIds_1 = orderedIds; _i < orderedIds_1.length; _i++) {
        var id = orderedIds_1[_i];
        var depth = depths.get(id) || 0;
        for (var _a = 0, _b = outgoing.get(id) || []; _a < _b.length; _a++) {
            var target = _b[_a];
            depths.set(target, Math.max(depths.get(target) || 0, depth + 1));
        }
    }
    return depths;
}
function nextRuntimeStatus(status) {
    if (status === 'pending') {
        return 'ready';
    }
    if (status === 'ready') {
        return 'running';
    }
    if (status === 'running') {
        return 'done';
    }
    return status;
}
