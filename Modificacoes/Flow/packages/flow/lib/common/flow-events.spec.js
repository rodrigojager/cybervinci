"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var flow_events_1 = require("./flow-events");
describe('Flow event normalization', function () {
    it('deduplicates by seq and orders by seq before rendering', function () {
        var events = (0, flow_events_1.normalizeFlowEvents)([
            event({ id: '3', timestamp: '2026-05-20T10:03:00.000Z', type: 'workload.completed', message: 'old duplicate' }),
            event({ id: '1', timestamp: '2026-05-20T10:01:00.000Z', type: 'run.started', message: 'started' }),
            event({ id: '2', timestamp: '2026-05-20T10:02:00.000Z', type: 'workload.started', message: 'started workload' }),
            event({ id: '3', timestamp: '2026-05-20T10:04:00.000Z', type: 'workload.completed', message: 'new duplicate' })
        ]);
        (0, chai_1.expect)(events.map(function (item) { return item.id; })).to.deep.equal(['1', '2', '3']);
        (0, chai_1.expect)(events[2].message).to.equal('new duplicate');
    });
    it('falls back to timestamp and event id for non-kernel events', function () {
        var events = (0, flow_events_1.normalizeFlowEvents)([
            event({ id: 'local-b', timestamp: '2026-05-20T10:02:00.000Z', type: 'gate.created', message: 'second' }),
            event({ id: 'local-a', timestamp: '2026-05-20T10:01:00.000Z', type: 'run.started', message: 'first' }),
            event({ id: 'local-b', timestamp: '2026-05-20T10:03:00.000Z', type: 'gate.created', message: 'second updated' })
        ]);
        (0, chai_1.expect)(events.map(function (item) { return item.id; })).to.deep.equal(['local-a', 'local-b']);
        (0, chai_1.expect)(events[1].message).to.equal('second updated');
    });
    it('uses payload seq when event id is not numeric', function () {
        var events = (0, flow_events_1.normalizeFlowEvents)([
            event({ id: 'stream-later', timestamp: '2026-05-20T10:02:00.000Z', payload: { seq: 2 } }),
            event({ id: 'stream-earlier', timestamp: '2026-05-20T10:01:00.000Z', payload: { seq: 1 } })
        ]);
        (0, chai_1.expect)(events.map(function (item) { return item.id; })).to.deep.equal(['stream-earlier', 'stream-later']);
    });
    it('filters by state, workload, event type, gate, artifact, effect, and severity', function () {
        var events = [
            event({ id: 'state', stateId: 'qa', type: 'state.entered' }),
            event({ id: 'workload', workloadId: 'qa-work', type: 'workload.completed' }),
            event({ id: 'gate', gateId: 'review', type: 'gate.approved' }),
            event({ id: 'artifact', type: 'artifact.created', payload: { path: 'reports/final.md' } }),
            event({ id: 'effect', type: 'effect.applied', payload: { effectId: 'effect-1', type: 'file.edited' } }),
            event({ id: 'issue', type: 'run.failed', payload: { severity: 'high' } })
        ];
        (0, chai_1.expect)((0, flow_events_1.filterFlowEvents)(events, { stateId: 'qa' }).map(function (item) { return item.id; })).to.deep.equal(['state']);
        (0, chai_1.expect)((0, flow_events_1.filterFlowEvents)(events, { workloadId: 'qa-work' }).map(function (item) { return item.id; })).to.deep.equal(['workload']);
        (0, chai_1.expect)((0, flow_events_1.filterFlowEvents)(events, { eventType: 'gate.approved' }).map(function (item) { return item.id; })).to.deep.equal(['gate']);
        (0, chai_1.expect)((0, flow_events_1.filterFlowEvents)(events, { gateId: 'review' }).map(function (item) { return item.id; })).to.deep.equal(['gate']);
        (0, chai_1.expect)((0, flow_events_1.filterFlowEvents)(events, { artifact: 'reports/final.md' }).map(function (item) { return item.id; })).to.deep.equal(['artifact']);
        (0, chai_1.expect)((0, flow_events_1.filterFlowEvents)(events, { effect: 'effect-1' }).map(function (item) { return item.id; })).to.deep.equal(['effect']);
        (0, chai_1.expect)((0, flow_events_1.filterFlowEvents)(events, { severity: 'high' }).map(function (item) { return item.id; })).to.deep.equal(['issue']);
    });
    it('keeps memory write audit events visible and filterable by type', function () {
        var events = (0, flow_events_1.normalizeFlowEvents)([
            event({ id: 'memory-approved', timestamp: '2026-05-20T10:01:00.000Z', type: 'memory_write.approved', payload: { memoryWriteId: 'memory-write-1', candidateId: 'candidate-1' } }),
            event({ id: 'memory-written', timestamp: '2026-05-20T10:02:00.000Z', type: 'memory_write.written', payload: { memoryWriteId: 'memory-write-1', candidateId: 'candidate-1' } }),
            event({ id: 'memory-failed', timestamp: '2026-05-20T10:03:00.000Z', type: 'memory_write.failed', payload: { memoryWriteId: 'memory-write-2', candidateId: 'candidate-2' } })
        ]);
        (0, chai_1.expect)(events.map(function (item) { return item.type; })).to.deep.equal(['memory_write.approved', 'memory_write.written', 'memory_write.failed']);
        (0, chai_1.expect)((0, flow_events_1.filterFlowEvents)(events, { eventType: 'memory_write.approved' }).map(function (item) { return item.id; })).to.deep.equal(['memory-approved']);
        (0, chai_1.expect)((0, flow_events_1.filterFlowEvents)(events, { eventType: 'memory_write.written' }).map(function (item) { return item.id; })).to.deep.equal(['memory-written']);
        (0, chai_1.expect)((0, flow_events_1.filterFlowEvents)(events, { eventType: 'memory_write.failed' }).map(function (item) { return item.id; })).to.deep.equal(['memory-failed']);
    });
});
function event(partial) {
    return {
        id: partial.id || 'event',
        type: partial.type || 'run.started',
        timestamp: partial.timestamp || '2026-05-20T10:00:00.000Z',
        stateId: partial.stateId,
        workloadId: partial.workloadId,
        gateId: partial.gateId,
        message: partial.message || 'event',
        payload: partial.payload
    };
}
