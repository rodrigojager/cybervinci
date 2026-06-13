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
exports.formatWorkflowSource = formatWorkflowSource;
exports.parseWorkflowSource = parseWorkflowSource;
exports.stripWorkflowFileMetadata = stripWorkflowFileMetadata;
exports.workflowSourceFormatLabel = workflowSourceFormatLabel;
exports.compareFlowWorkflowStructure = compareFlowWorkflowStructure;
var yaml = require("js-yaml");
function formatWorkflowSource(workflow) {
    var _a;
    var serializable = stripWorkflowFileMetadata(workflow);
    if (((_a = workflow.file) === null || _a === void 0 ? void 0 : _a.format) === 'yaml') {
        return yaml.dump(serializable, { lineWidth: 120, noRefs: true, sortKeys: false });
    }
    return "".concat(JSON.stringify(serializable, undefined, 2), "\n");
}
function parseWorkflowSource(source, currentWorkflow) {
    var _a;
    var parsed = ((_a = currentWorkflow.file) === null || _a === void 0 ? void 0 : _a.format) === 'yaml'
        ? yaml.load(source)
        : JSON.parse(source);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error("Workflow ".concat(workflowSourceFormatLabel(currentWorkflow), " source must contain a mapping object."));
    }
    return __assign(__assign({}, parsed), { file: currentWorkflow.file });
}
function stripWorkflowFileMetadata(workflow) {
    var serializable = __assign({}, workflow);
    delete serializable.file;
    return serializable;
}
function workflowSourceFormatLabel(workflow) {
    var _a;
    return ((_a = workflow.file) === null || _a === void 0 ? void 0 : _a.format) === 'yaml' ? 'YAML' : 'JSON';
}
function compareFlowWorkflowStructure(fileWorkflow, canvasWorkflow) {
    var items = [];
    compareScalar(items, 'metadata', 'id', fileWorkflow.id, canvasWorkflow.id);
    compareScalar(items, 'metadata', 'name', fileWorkflow.name, canvasWorkflow.name);
    compareScalar(items, 'metadata', 'description', fileWorkflow.description, canvasWorkflow.description);
    compareRecord(items, 'agent', fileWorkflow.agents || {}, canvasWorkflow.agents || {});
    compareRecord(items, 'capability', capabilitiesRecord(fileWorkflow), capabilitiesRecord(canvasWorkflow));
    compareRecord(items, 'template', workflowTemplateRecord(fileWorkflow), workflowTemplateRecord(canvasWorkflow));
    compareRecord(items, 'state', workflowStateRecord(fileWorkflow), workflowStateRecord(canvasWorkflow));
    compareRecord(items, 'transition', workflowTransitionRecord(fileWorkflow), workflowTransitionRecord(canvasWorkflow));
    compareRecord(items, 'guard', workflowGuardRecord(fileWorkflow), workflowGuardRecord(canvasWorkflow));
    return {
        fromWorkflowId: fileWorkflow.id,
        toWorkflowId: canvasWorkflow.id,
        items: items
    };
}
function compareScalar(items, kind, id, before, after) {
    if (stableStringify(before) !== stableStringify(after)) {
        items.push({
            kind: kind,
            change: 'changed',
            id: id,
            summary: "".concat(formatDiffValue(before), " -> ").concat(formatDiffValue(after))
        });
    }
}
function compareRecord(items, kind, before, after) {
    var ids = Array.from(new Set(__spreadArray(__spreadArray([], Object.keys(before), true), Object.keys(after), true))).sort();
    for (var _i = 0, ids_1 = ids; _i < ids_1.length; _i++) {
        var id = ids_1[_i];
        if (!(id in before)) {
            items.push({ kind: kind, change: 'added', id: id, summary: summarizeDiffObject(after[id]) });
        }
        else if (!(id in after)) {
            items.push({ kind: kind, change: 'removed', id: id, summary: summarizeDiffObject(before[id]) });
        }
        else if (stableStringify(before[id]) !== stableStringify(after[id])) {
            items.push({ kind: kind, change: 'changed', id: id, summary: describeStructuralChange(before[id], after[id]) });
        }
    }
}
function workflowStateRecord(workflow) {
    var states = {};
    for (var _i = 0, _a = Object.entries(workflow.states || {}); _i < _a.length; _i++) {
        var _b = _a[_i], stateId = _b[0], state = _b[1];
        states[stateId] = state;
        for (var _c = 0, _d = Object.entries(state.branches || {}); _c < _d.length; _c++) {
            var _e = _d[_c], branchId = _e[0], branch = _e[1];
            states[branchId] = __assign(__assign({}, branch), { parent: stateId });
        }
    }
    return states;
}
function workflowTransitionRecord(workflow) {
    var transitions = {};
    for (var _i = 0, _a = workflow.transitions || []; _i < _a.length; _i++) {
        var transition = _a[_i];
        transitions[transitionKey(transition)] = transition;
    }
    return transitions;
}
function capabilitiesRecord(workflow) {
    var _a;
    return Object.fromEntries((((_a = workflow.requires) === null || _a === void 0 ? void 0 : _a.capabilities) || []).map(function (capability) { return [capability, true]; }));
}
function workflowTemplateRecord(workflow) {
    var _a, _b, _c, _d;
    var source = workflow;
    var record = {};
    for (var _i = 0, _e = Object.entries({
        template: source.template,
        templateId: source.templateId,
        templateVersion: source.templateVersion,
        templateRef: source.templateRef,
        metadataTemplate: (_a = source.metadata) === null || _a === void 0 ? void 0 : _a.template,
        metadataTemplateId: (_b = source.metadata) === null || _b === void 0 ? void 0 : _b.templateId,
        metadataTemplateVersion: (_c = source.metadata) === null || _c === void 0 ? void 0 : _c.templateVersion,
        metadataTemplateRef: (_d = source.metadata) === null || _d === void 0 ? void 0 : _d.templateRef
    }); _i < _e.length; _i++) {
        var _f = _e[_i], key = _f[0], value = _f[1];
        if (value !== undefined) {
            record[key] = value;
        }
    }
    return record;
}
function workflowGuardRecord(workflow) {
    var guards = {};
    for (var _i = 0, _a = workflow.transitions || []; _i < _a.length; _i++) {
        var transition = _a[_i];
        var key = transitionKey(transition);
        if (transition.guard !== undefined) {
            guards[key] = transition.guard;
        }
    }
    return guards;
}
function describeStructuralChange(before, after) {
    if (isPlainObject(before) && isPlainObject(after)) {
        var changedKeys = Array.from(new Set(__spreadArray(__spreadArray([], Object.keys(before), true), Object.keys(after), true)))
            .filter(function (key) { return stableStringify(before[key]) !== stableStringify(after[key]); })
            .sort();
        return changedKeys.length ? "Changed ".concat(changedKeys.join(', ')) : 'Changed structure';
    }
    return "".concat(formatDiffValue(before), " -> ").concat(formatDiffValue(after));
}
function summarizeDiffObject(value) {
    if (isPlainObject(value)) {
        var type = typeof value.type === 'string' ? "".concat(value.type) : undefined;
        var edge = typeof value.from === 'string' && typeof value.to === 'string' ? "".concat(value.from, " -> ").concat(value.to) : undefined;
        return [type, edge].filter(Boolean).join(' / ') || Object.keys(value).sort().join(', ');
    }
    return formatDiffValue(value);
}
function formatDiffValue(value) {
    if (value === undefined) {
        return '(empty)';
    }
    if (typeof value === 'string') {
        return value || '(empty)';
    }
    return stableStringify(value);
}
function stableStringify(value) {
    return JSON.stringify(sortStable(value));
}
function sortStable(value) {
    if (Array.isArray(value)) {
        return value.map(sortStable);
    }
    if (isPlainObject(value)) {
        return Object.fromEntries(Object.keys(value).sort().map(function (key) { return [key, sortStable(value[key])]; }));
    }
    return value;
}
function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function transitionKey(transition) {
    return transition.id || "".concat(transition.from, "-").concat(transition.to);
}
