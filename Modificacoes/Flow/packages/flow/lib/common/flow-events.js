"use strict";
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
exports.normalizeFlowEvents = normalizeFlowEvents;
exports.filterFlowEvents = filterFlowEvents;
exports.hasFlowEventLogFilter = hasFlowEventLogFilter;
function normalizeFlowEvents(events) {
    var selected = new Map();
    for (var _i = 0, events_1 = events; _i < events_1.length; _i++) {
        var event_1 = events_1[_i];
        var key = eventDeduplicationKey(event_1);
        var existing = selected.get(key);
        if (!existing || compareFlowEvents(existing, event_1) <= 0) {
            selected.set(key, event_1);
        }
    }
    return Array.from(selected.values()).sort(compareFlowEvents);
}
function filterFlowEvents(events, filter) {
    return events.filter(function (event) { return matchesEventFilter(event, filter); });
}
function hasFlowEventLogFilter(filter) {
    return Boolean(filter.stateId || filter.workloadId || filter.eventType || filter.gateId || filter.artifact || filter.effect || filter.severity);
}
function matchesEventFilter(event, filter) {
    return matchesField(event.stateId, filter.stateId)
        && matchesField(event.workloadId, filter.workloadId)
        && matchesField(event.type, filter.eventType)
        && matchesField(event.gateId, filter.gateId)
        && matchesToken(eventTokens(event, ['artifactId', 'artifact', 'path', 'artifactPath', 'targetPath']), filter.artifact)
        && matchesToken(eventTokens(event, ['effectId', 'effect', 'type', 'path', 'command']), filter.effect)
        && matchesToken(eventTokens(event, ['severity']), filter.severity);
}
function matchesField(value, filterValue) {
    return !filterValue || value === filterValue;
}
function matchesToken(tokens, filterValue) {
    if (!filterValue) {
        return true;
    }
    return tokens.includes(filterValue);
}
function eventTokens(event, keys) {
    var tokens = new Set();
    var payload = event.payload || {};
    for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
        var key = keys_1[_i];
        collectToken(tokens, payload[key]);
    }
    if (keys.includes('severity') && isSeverityEventType(event.type)) {
        collectToken(tokens, payload.severity);
    }
    if (keys.includes('type')) {
        collectToken(tokens, payload.effectType);
    }
    return __spreadArray([], tokens, true);
}
function collectToken(tokens, value) {
    if (typeof value === 'string' && value.trim()) {
        tokens.add(value);
        return;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        tokens.add(String(value));
        return;
    }
    if (Array.isArray(value)) {
        for (var _i = 0, value_1 = value; _i < value_1.length; _i++) {
            var item = value_1[_i];
            collectToken(tokens, item);
        }
        return;
    }
    if (value && typeof value === 'object') {
        var record = value;
        for (var _a = 0, _b = ['id', 'artifactId', 'effectId', 'path', 'artifactPath', 'type', 'severity']; _a < _b.length; _a++) {
            var key = _b[_a];
            collectToken(tokens, record[key]);
        }
    }
}
function isSeverityEventType(type) {
    return type === 'issue.recorded' || type === 'workload.failed' || type === 'run.failed' || type === 'workflow.validation_failed';
}
function eventDeduplicationKey(event) {
    var seq = eventSequence(event);
    if (seq !== undefined) {
        return "seq:".concat(seq);
    }
    if (event.id) {
        return "id:".concat(event.id);
    }
    return "fallback:".concat(event.timestamp, ":").concat(event.type, ":").concat(event.message);
}
function compareFlowEvents(left, right) {
    var leftSeq = eventSequence(left);
    var rightSeq = eventSequence(right);
    if (leftSeq !== undefined && rightSeq !== undefined && leftSeq !== rightSeq) {
        return leftSeq - rightSeq;
    }
    var timeComparison = eventTime(left.timestamp) - eventTime(right.timestamp);
    if (timeComparison !== 0) {
        return timeComparison;
    }
    return left.id.localeCompare(right.id);
}
function eventSequence(event) {
    var _a;
    var payloadSeq = (_a = event.payload) === null || _a === void 0 ? void 0 : _a.seq;
    if (typeof payloadSeq === 'number' && Number.isInteger(payloadSeq)) {
        return payloadSeq;
    }
    if (typeof payloadSeq === 'string') {
        var seq = Number.parseInt(payloadSeq, 10);
        if (Number.isInteger(seq) && String(seq) === payloadSeq) {
            return seq;
        }
    }
    var idSeq = Number.parseInt(event.id, 10);
    if (Number.isInteger(idSeq) && String(idSeq) === event.id) {
        return idSeq;
    }
    return undefined;
}
function eventTime(timestamp) {
    var value = Date.parse(timestamp);
    return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}
