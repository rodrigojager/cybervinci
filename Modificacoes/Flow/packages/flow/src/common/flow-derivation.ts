import {
    FlowCanvasEdge,
    FlowCanvasModel,
    FlowCanvasNode,
    FlowFlowDraft,
    FlowKanbanColumn,
    FlowRun,
    FlowStateRuntimeStatus,
    FlowWorkflow,
    FlowWorkflowState,
    FlowWorkload,
    FlowWorkloadStatus
} from './flow-types';

const NODE_WIDTH = 236;
const NODE_HEIGHT = 96;
const X_STEP = 380;
const Y_STEP = 158;

const KANBAN_ORDER: Array<{ id: FlowWorkloadStatus; label: string }> = [
    { id: 'pending', label: 'Pending' },
    { id: 'ready', label: 'Ready' },
    { id: 'running', label: 'Running' },
    { id: 'waiting', label: 'Waiting' },
    { id: 'review', label: 'Review' },
    { id: 'done', label: 'Done' },
    { id: 'failed', label: 'Failed' }
];

export function deriveFlowCanvasModel(workflow: FlowWorkflow, run?: FlowRun): FlowCanvasModel {
    const states = flattenWorkflowStates(workflow);
    const incoming = new Map<string, number>();
    const outgoing = new Map<string, string[]>();

    for (const transition of workflow.transitions || []) {
        incoming.set(transition.to, (incoming.get(transition.to) || 0) + 1);
        const next = outgoing.get(transition.from) || [];
        next.push(transition.to);
        outgoing.set(transition.from, next);
    }
    for (const [stateId, state] of Object.entries(workflow.states || {})) {
        const branchIds = Object.keys(state.branches || {});
        if (branchIds.length === 0) {
            continue;
        }
        const next = outgoing.get(stateId) || [];
        for (const branchId of branchIds) {
            incoming.set(branchId, (incoming.get(branchId) || 0) + 1);
            if (!next.includes(branchId)) {
                next.push(branchId);
            }
        }
        outgoing.set(stateId, next);
    }

    const orderedIds = orderStateIds(states.map(state => state.id), incoming, outgoing);
    const depths = computeDepths(orderedIds, outgoing);
    const laneCounts = new Map<number, number>();

    const nodes: FlowCanvasNode[] = orderedIds.map(stateId => {
        const state = states.find(candidate => candidate.id === stateId);
        const depth = depths.get(stateId) || 0;
        const lane = laneCounts.get(depth) || 0;
        laneCounts.set(depth, lane + 1);
        return {
            id: stateId,
            label: stateId.replace(/_/g, ' '),
            type: state ? state.value.type : 'condition',
            agent: state?.value.agent,
            status: run?.stateStatuses[stateId] || 'pending',
            x: state?.value.layout?.x ?? 24 + depth * X_STEP,
            y: state?.value.layout?.y ?? 24 + lane * Y_STEP,
            width: NODE_WIDTH,
            height: NODE_HEIGHT
        };
    });

    const nodeById = new Map(nodes.map(node => [node.id, node]));
    const edges: FlowCanvasEdge[] = (workflow.transitions || []).map((transition, index) => {
        const from = nodeById.get(transition.from);
        const to = nodeById.get(transition.to);
        return {
            id: transition.id || `${transition.from}-${transition.to}-${index}`,
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

    const width = Math.max(640, ...nodes.map(node => node.x + node.width + 32));
    const height = Math.max(361, ...nodes.map(node => node.y + node.height + 32));
    return { nodes, edges, width, height };
}

export function deriveFlowFlowDraft(workflow: FlowWorkflow, run?: FlowRun): FlowFlowDraft {
    const canvas = deriveFlowCanvasModel(workflow, run);
    return {
        nodes: canvas.nodes.map(node => ({
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
        })),
        edges: canvas.edges.map(edge => ({
            id: edge.id,
            source: edge.from,
            target: edge.to,
            label: edge.guardSummary ? `${edge.event} / ${edge.guardSummary}` : edge.event,
            data: {
                event: edge.event,
                guardSummary: edge.guardSummary,
                priority: edge.priority
            }
        })),
        viewport: {
            width: canvas.width,
            height: canvas.height
        }
    };
}

export function deriveFlowKanbanColumns(workloads: FlowWorkload[]): FlowKanbanColumn[] {
    return KANBAN_ORDER.map(column => ({
        ...column,
        workloads: workloads.filter(workload => workload.status === column.id)
    }));
}

export function summarizeGuard(guard: unknown): string | undefined {
    if (!guard) {
        return undefined;
    }
    if (typeof guard !== 'object') {
        return String(guard);
    }
    const keys = Object.keys(guard as Record<string, unknown>);
    if (keys.length === 0) {
        return undefined;
    }
    if (keys.length === 1) {
        return keys[0];
    }
    return keys.join(' + ');
}

function flattenWorkflowStates(workflow: FlowWorkflow): Array<{ id: string; value: FlowWorkflowState }> {
    const states: Array<{ id: string; value: FlowWorkflowState }> = [];
    for (const [id, state] of Object.entries(workflow.states || {})) {
        states.push({ id, value: state });
        for (const [branchId, branch] of Object.entries(state.branches || {})) {
            states.push({ id: branchId, value: branch });
        }
    }
    return states;
}

function orderStateIds(stateIds: string[], incoming: Map<string, number>, outgoing: Map<string, string[]>): string[] {
    const queue = stateIds.filter(id => !incoming.has(id)).sort();
    const ordered: string[] = [];
    const seen = new Set<string>();

    while (queue.length > 0) {
        const id = queue.shift();
        if (!id || seen.has(id)) {
            continue;
        }
        seen.add(id);
        ordered.push(id);
        for (const target of outgoing.get(id) || []) {
            if (!seen.has(target) && !queue.includes(target)) {
                queue.push(target);
            }
        }
    }

    for (const id of stateIds) {
        if (!seen.has(id)) {
            ordered.push(id);
        }
    }
    return ordered;
}

function computeDepths(orderedIds: string[], outgoing: Map<string, string[]>): Map<string, number> {
    const depths = new Map<string, number>();
    for (const id of orderedIds) {
        const depth = depths.get(id) || 0;
        for (const target of outgoing.get(id) || []) {
            depths.set(target, Math.max(depths.get(target) || 0, depth + 1));
        }
    }
    return depths;
}

export function nextRuntimeStatus(status: FlowStateRuntimeStatus): FlowStateRuntimeStatus {
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
