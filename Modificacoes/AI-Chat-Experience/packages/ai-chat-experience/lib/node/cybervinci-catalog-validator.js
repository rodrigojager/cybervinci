"use strict";
// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
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
exports.CyberVinciCatalogValidator = void 0;
var AGENT_KINDS = new Set(['native', 'delegate', 'prompt', 'markdown', 'flow', 'external', 'profile']);
var TOOL_KINDS = new Set(['tool', 'guard', 'action', 'query', 'effect', 'ai', 'flow', 'ui']);
var TOOL_SOURCES = new Set(['core', 'system', 'system-override', 'user']);
var TOOL_IMPLEMENTATIONS = new Set(['host', 'command', 'theia-tool', 'composite']);
var PLAYBOOK_STATE_TYPES = new Set(['start', 'guard', 'tool', 'ai', 'ask', 'condition', 'flow', 'playbook', 'parallel', 'response', 'end']);
var PLAYBOOK_FLOW_MODES = new Set(['saved', 'dynamic', 'authoring']);
var PLAYBOOK_ROUTES = new Set(['direct', 'saved-flow', 'dynamic-workflow']);
var CyberVinciCatalogValidator = /** @class */ (function () {
    function CyberVinciCatalogValidator() {
    }
    CyberVinciCatalogValidator.prototype.validateAgent = function (candidate, source) {
        var diagnostics = [];
        if (!this.isRecord(candidate)) {
            return this.invalid('Agent definition must be an object.', source);
        }
        var id = this.string(candidate.id);
        var name = this.string(candidate.name);
        var kind = this.string(candidate.kind);
        if (!id) {
            diagnostics.push(this.error('Agent id is required.', source));
        }
        if (!name) {
            diagnostics.push(this.error("Agent '".concat(id || '<unknown>', "' name is required."), source, id));
        }
        if (!kind || !AGENT_KINDS.has(kind)) {
            diagnostics.push(this.error("Agent '".concat(id || '<unknown>', "' kind must be one of ").concat(__spreadArray([], AGENT_KINDS, true).join(', '), "."), source, id));
        }
        this.validateStringArray(candidate.tags, 'tags', 'Agent', id, source, diagnostics);
        this.validateStringArray(candidate.playbooks, 'playbooks', 'Agent', id, source, diagnostics);
        this.validateStringArray(candidate.tools, 'tools', 'Agent', id, source, diagnostics);
        if (diagnostics.some(function (item) { return item.severity === 'error'; })) {
            return { diagnostics: diagnostics };
        }
        return { value: candidate, diagnostics: diagnostics };
    };
    CyberVinciCatalogValidator.prototype.validateTool = function (candidate, source) {
        var diagnostics = [];
        if (!this.isRecord(candidate)) {
            return this.invalid('Tool definition must be an object.', source);
        }
        var id = this.string(candidate.id);
        var name = this.string(candidate.name);
        var kind = this.string(candidate.kind);
        var implementation = this.string(candidate.implementation);
        var sourceKind = this.string(candidate.source);
        if (!id) {
            diagnostics.push(this.error('Tool id is required.', source));
        }
        if (!name) {
            diagnostics.push(this.error("Tool '".concat(id || '<unknown>', "' name is required."), source, id));
        }
        if (kind && !TOOL_KINDS.has(kind)) {
            diagnostics.push(this.error("Tool '".concat(id || '<unknown>', "' kind '").concat(kind, "' is not supported."), source, id));
        }
        if (sourceKind && !TOOL_SOURCES.has(sourceKind)) {
            diagnostics.push(this.error("Tool '".concat(id || '<unknown>', "' source '").concat(sourceKind, "' is not supported."), source, id));
        }
        if (implementation && !TOOL_IMPLEMENTATIONS.has(implementation)) {
            diagnostics.push(this.error("Tool '".concat(id || '<unknown>', "' implementation '").concat(implementation, "' is not supported."), source, id));
        }
        if (candidate.steps !== undefined && !Array.isArray(candidate.steps)) {
            diagnostics.push(this.error("Tool '".concat(id || '<unknown>', "' steps must be an array."), source, id));
        }
        for (var _i = 0, _a = (Array.isArray(candidate.steps) ? candidate.steps : []).entries(); _i < _a.length; _i++) {
            var _b = _a[_i], index = _b[0], step = _b[1];
            if (!this.isRecord(step) || !this.string(step.tool)) {
                diagnostics.push(this.error("Tool '".concat(id || '<unknown>', "' composite step ").concat(index, " must define a tool id."), source, id));
            }
        }
        if (candidate.policy && this.isRecord(candidate.policy) && candidate.policy.allowShell === true && sourceKind === 'user') {
            diagnostics.push(this.warn("User tool '".concat(id, "' requests shell execution; it will still require host policy approval before execution."), source, id));
        }
        if (diagnostics.some(function (item) { return item.severity === 'error'; })) {
            return { diagnostics: diagnostics };
        }
        return { value: candidate, diagnostics: diagnostics };
    };
    CyberVinciCatalogValidator.prototype.validatePlaybook = function (candidate, source) {
        var _this = this;
        var _a;
        var diagnostics = [];
        if (!this.isRecord(candidate)) {
            return this.invalid('Playbook definition must be an object.', source);
        }
        var id = this.string(candidate.id);
        var name = this.string(candidate.name);
        var entry = this.string(candidate.entry);
        var states = Array.isArray(candidate.states) ? candidate.states : [];
        if (!id) {
            diagnostics.push(this.error('Playbook id is required.', source));
        }
        if (!name) {
            diagnostics.push(this.error("Playbook '".concat(id || '<unknown>', "' name is required."), source, id));
        }
        if (!entry) {
            diagnostics.push(this.error("Playbook '".concat(id || '<unknown>', "' entry is required."), source, id));
        }
        if (!Array.isArray(candidate.states)) {
            diagnostics.push(this.error("Playbook '".concat(id || '<unknown>', "' states must be an array."), source, id));
        }
        var stateIds = new Set();
        for (var _i = 0, _b = states.entries(); _i < _b.length; _i++) {
            var _c = _b[_i], index = _c[0], state = _c[1];
            var validated = this.validatePlaybookState(state, index, id !== null && id !== void 0 ? id : '', source);
            diagnostics.push.apply(diagnostics, validated.diagnostics);
            if ((_a = validated.value) === null || _a === void 0 ? void 0 : _a.id) {
                if (stateIds.has(validated.value.id)) {
                    diagnostics.push(this.error("Playbook '".concat(id, "' has duplicate state id '").concat(validated.value.id, "'."), source, id));
                }
                stateIds.add(validated.value.id);
            }
        }
        if (entry && states.length && !stateIds.has(entry)) {
            diagnostics.push(this.error("Playbook '".concat(id, "' entry state '").concat(entry, "' does not exist."), source, id));
        }
        for (var _d = 0, _e = states.filter(function (candidateState) { return _this.isRecord(candidateState); }); _d < _e.length; _d++) {
            var state = _e[_d];
            for (var _f = 0, _g = this.referencedStates(state); _f < _g.length; _f++) {
                var referenced = _g[_f];
                if (referenced && !stateIds.has(referenced)) {
                    diagnostics.push(this.error("Playbook '".concat(id, "' state '").concat(state.id, "' references unknown state '").concat(referenced, "'."), source, id));
                }
            }
        }
        if (diagnostics.some(function (item) { return item.severity === 'error'; })) {
            return { diagnostics: diagnostics };
        }
        return { value: candidate, diagnostics: diagnostics };
    };
    CyberVinciCatalogValidator.prototype.validatePlaybookState = function (candidate, index, playbookId, source) {
        var diagnostics = [];
        if (!this.isRecord(candidate)) {
            return this.invalid("Playbook '".concat(playbookId || '<unknown>', "' state ").concat(index, " must be an object."), source, playbookId);
        }
        var id = this.string(candidate.id);
        var type = this.string(candidate.type);
        if (!id) {
            diagnostics.push(this.error("Playbook '".concat(playbookId || '<unknown>', "' state ").concat(index, " id is required."), source, playbookId));
        }
        if (!type || !PLAYBOOK_STATE_TYPES.has(type)) {
            diagnostics.push(this.error("Playbook '".concat(playbookId || '<unknown>', "' state '").concat(id || index, "' has unsupported type '").concat(type || '<missing>', "'."), source, playbookId));
        }
        if (type === 'tool' && !this.string(candidate.tool)) {
            diagnostics.push(this.error("Tool state '".concat(id || index, "' must define tool."), source, playbookId));
        }
        if (type === 'guard' && !this.string(candidate.guard) && !this.string(candidate.tool)) {
            diagnostics.push(this.error("Guard state '".concat(id || index, "' must define guard or tool."), source, playbookId));
        }
        if (type === 'playbook' && !this.string(candidate.playbook) && !this.string(candidate.playbookId)) {
            diagnostics.push(this.error("Nested playbook state '".concat(id || index, "' must define playbook or playbookId."), source, playbookId));
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
        return diagnostics.some(function (item) { return item.severity === 'error'; })
            ? { diagnostics: diagnostics }
            : { value: candidate, diagnostics: diagnostics };
    };
    CyberVinciCatalogValidator.prototype.referencedStates = function (state) {
        return __spreadArray(__spreadArray(__spreadArray(__spreadArray([
            state.next,
            state.onPass,
            state.onFail,
            state.onError,
            state.default
        ], (Array.isArray(state.transitions) ? state.transitions.map(function (transition) { return transition.to; }) : []), true), (Array.isArray(state.options) ? state.options.map(function (option) { return option.next; }) : []), true), (Array.isArray(state.cases) ? state.cases.map(function (conditionCase) { return conditionCase.next; }) : []), true), (Array.isArray(state.branches) ? state.branches : []), true).filter(function (value) { return typeof value === 'string' && value.trim().length > 0; });
    };
    CyberVinciCatalogValidator.prototype.validateAiState = function (candidate, stateId, playbookId, source, diagnostics) {
        if (!this.string(candidate.agent)) {
            diagnostics.push(this.error("AI state '".concat(stateId, "' must define agent."), source, playbookId));
        }
        if (!this.string(candidate.prompt) && !this.string(candidate.template)) {
            diagnostics.push(this.error("AI state '".concat(stateId, "' must define prompt or template."), source, playbookId));
        }
        var outputMode = this.string(candidate.outputMode);
        if (outputMode && outputMode !== 'text' && outputMode !== 'json') {
            diagnostics.push(this.error("AI state '".concat(stateId, "' outputMode must be text or json."), source, playbookId));
        }
        if (outputMode === 'json' && !this.isRecord(candidate.outputSchema)) {
            diagnostics.push(this.error("AI state '".concat(stateId, "' with outputMode json must define outputSchema."), source, playbookId));
        }
    };
    CyberVinciCatalogValidator.prototype.validateAskState = function (candidate, stateId, playbookId, source, diagnostics) {
        if (!this.string(candidate.text) && !this.string(candidate.prompt) && !this.string(candidate.template)) {
            diagnostics.push(this.error("Ask state '".concat(stateId, "' must define text, prompt, or template."), source, playbookId));
        }
        this.validateAskOptions(candidate.options, stateId, playbookId, source, diagnostics, true);
    };
    CyberVinciCatalogValidator.prototype.validateConditionState = function (candidate, stateId, playbookId, source, diagnostics) {
        this.validateConditionCases(candidate.cases, stateId, playbookId, source, diagnostics, true);
        if (candidate.default !== undefined && !this.string(candidate.default)) {
            diagnostics.push(this.error("Condition state '".concat(stateId, "' default must be a state id string."), source, playbookId));
        }
    };
    CyberVinciCatalogValidator.prototype.validateFlowState = function (candidate, stateId, playbookId, source, diagnostics) {
        var mode = this.string(candidate.mode);
        var route = this.string(candidate.route);
        if (!mode && !route) {
            diagnostics.push(this.error("Flow state '".concat(stateId, "' must define mode or route."), source, playbookId));
        }
        if (mode && !PLAYBOOK_FLOW_MODES.has(mode)) {
            diagnostics.push(this.error("Flow state '".concat(stateId, "' mode must be one of ").concat(__spreadArray([], PLAYBOOK_FLOW_MODES, true).join(', '), "."), source, playbookId));
        }
        if (route && !PLAYBOOK_ROUTES.has(route)) {
            diagnostics.push(this.error("Flow state '".concat(stateId, "' route must be one of ").concat(__spreadArray([], PLAYBOOK_ROUTES, true).join(', '), "."), source, playbookId));
        }
        if (mode === 'saved' && !this.string(candidate.workflowId) && !this.string(candidate.flowId)) {
            diagnostics.push(this.error("Saved Flow state '".concat(stateId, "' must define workflowId or flowId."), source, playbookId));
        }
        if (mode === 'authoring' && candidate.authoringDraft === undefined) {
            diagnostics.push(this.error("Authoring Flow state '".concat(stateId, "' must define authoringDraft."), source, playbookId));
        }
    };
    CyberVinciCatalogValidator.prototype.validateParallelState = function (candidate, stateId, playbookId, source, diagnostics) {
        var _this = this;
        if (!Array.isArray(candidate.branches) || !candidate.branches.length || candidate.branches.some(function (branch) { return !_this.string(branch); })) {
            diagnostics.push(this.error("Parallel state '".concat(stateId, "' must define non-empty string branches."), source, playbookId));
        }
    };
    CyberVinciCatalogValidator.prototype.validateTransitions = function (value, stateId, playbookId, source, diagnostics) {
        if (value === undefined) {
            return;
        }
        if (!Array.isArray(value)) {
            diagnostics.push(this.error("State '".concat(stateId, "' transitions must be an array."), source, playbookId));
            return;
        }
        for (var _i = 0, _a = value.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], index = _b[0], transition = _b[1];
            if (!this.isRecord(transition) || !this.string(transition.to)) {
                diagnostics.push(this.error("State '".concat(stateId, "' transition ").concat(index, " must define to."), source, playbookId));
            }
        }
    };
    CyberVinciCatalogValidator.prototype.validateAskOptions = function (value, stateId, playbookId, source, diagnostics, required) {
        if (required === void 0) { required = false; }
        if (value === undefined) {
            if (required) {
                diagnostics.push(this.error("Ask state '".concat(stateId, "' must define options."), source, playbookId));
            }
            return;
        }
        if (!Array.isArray(value) || (required && !value.length)) {
            diagnostics.push(this.error("Ask state '".concat(stateId, "' options must be a non-empty array."), source, playbookId));
            return;
        }
        for (var _i = 0, _a = value.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], index = _b[0], option = _b[1];
            if (!this.isRecord(option) || !this.string(option.id) || !this.string(option.label)) {
                diagnostics.push(this.error("Ask state '".concat(stateId, "' option ").concat(index, " must define id and label."), source, playbookId));
                continue;
            }
            if (option.next !== undefined && !this.string(option.next)) {
                diagnostics.push(this.error("Ask state '".concat(stateId, "' option '").concat(option.id, "' next must be a state id string."), source, playbookId));
            }
        }
    };
    CyberVinciCatalogValidator.prototype.validateConditionCases = function (value, stateId, playbookId, source, diagnostics, required) {
        if (required === void 0) { required = false; }
        if (value === undefined) {
            if (required) {
                diagnostics.push(this.error("Condition state '".concat(stateId, "' must define cases."), source, playbookId));
            }
            return;
        }
        if (!Array.isArray(value) || (required && !value.length)) {
            diagnostics.push(this.error("Condition state '".concat(stateId, "' cases must be a non-empty array."), source, playbookId));
            return;
        }
        for (var _i = 0, _a = value.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], index = _b[0], conditionCase = _b[1];
            if (!this.isRecord(conditionCase) || conditionCase.if === undefined || !this.string(conditionCase.next)) {
                diagnostics.push(this.error("Condition state '".concat(stateId, "' case ").concat(index, " must define if and next."), source, playbookId));
            }
        }
    };
    CyberVinciCatalogValidator.prototype.validateStringArray = function (value, field, label, id, source, diagnostics) {
        if (value === undefined) {
            return;
        }
        if (!Array.isArray(value) || value.some(function (item) { return typeof item !== 'string'; })) {
            diagnostics.push(this.error("".concat(label, " '").concat(id || '<unknown>', "' field '").concat(field, "' must be a string array."), source, id));
        }
    };
    CyberVinciCatalogValidator.prototype.isRecord = function (candidate) {
        return typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate);
    };
    CyberVinciCatalogValidator.prototype.string = function (value) {
        return typeof value === 'string' && value.trim() ? value.trim() : undefined;
    };
    CyberVinciCatalogValidator.prototype.invalid = function (message, source, id) {
        return { diagnostics: [this.error(message, source, id)] };
    };
    CyberVinciCatalogValidator.prototype.error = function (message, source, id) {
        return { severity: 'error', source: source, id: id, message: message };
    };
    CyberVinciCatalogValidator.prototype.warn = function (message, source, id) {
        return { severity: 'warning', source: source, id: id, message: message };
    };
    return CyberVinciCatalogValidator;
}());
exports.CyberVinciCatalogValidator = CyberVinciCatalogValidator;
