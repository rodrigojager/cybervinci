import { FlowStateType, FlowWorkflow, FlowWorkflowState, FlowWorkflowTransition } from './flow-types';

export function createFlowWorkflowState(stateType: FlowStateType, stateId: string): FlowWorkflowState {
    const base: FlowWorkflowState = { id: stateId, type: stateType };
    if (stateType === 'input') {
        return { ...base, outputs: [`${stateId}/input.md`] };
    }
    if (stateType === 'context') {
        return { ...base, outputs: [`${stateId}/context.md`] };
    }
    if (stateType === 'agent') {
        return { ...base, agent: 'agent', outputs: [`${stateId}/result.md`] };
    }
    if (stateType === 'parallel') {
        return { ...base, branches: {} };
    }
    if (stateType === 'join') {
        return { ...base, waitFor: [], outputs: [`${stateId}/join-summary.md`] };
    }
    if (stateType === 'condition') {
        return { ...base, input: { signals: [`${stateId}.status`] } };
    }
    if (stateType === 'gate') {
        return {
            ...base,
            gates: [{ id: `${stateId}_approval`, title: 'Approve next step', stateId }]
        };
    }
    if (stateType === 'command') {
        return {
            ...base,
            effects: [{ kind: 'command', summary: 'Run an approved command.' }],
            outputs: [`${stateId}/command-result.md`]
        };
    }
    if (stateType === 'memory_write') {
        return {
            ...base,
            effects: [{ kind: 'memory_write', summary: 'Persist approved memory candidates only.' }]
        };
    }
    if (stateType === 'report') {
        return { ...base, input: { include: [] }, outputs: [`${stateId}/report.md`] };
    }
    return base;
}

export function addFlowWorkflowState(workflow: FlowWorkflow, stateType: FlowStateType): { workflow: FlowWorkflow; stateId: string } {
    const stateId = nextFlowWorkflowStateId(workflow, stateType);
    return {
        stateId,
        workflow: {
            ...workflow,
            states: {
                ...workflow.states,
                [stateId]: createFlowWorkflowState(stateType, stateId)
            }
        }
    };
}

export function addFlowWorkflowTransition(workflow: FlowWorkflow, from: string, to: string): { workflow: FlowWorkflow; transition?: FlowWorkflowTransition } {
    const stateIds = new Set(flowWorkflowStateIds(workflow));
    if (!stateIds.has(from) || !stateIds.has(to)) {
        return { workflow };
    }
    const transition: FlowWorkflowTransition = {
        id: nextFlowWorkflowTransitionId(workflow, from, to),
        from,
        to,
        on: 'workload.completed'
    };
    return {
        transition,
        workflow: {
            ...workflow,
            transitions: [...(workflow.transitions || []), transition]
        }
    };
}

export function addFlowParallelBranch(workflow: FlowWorkflow, parallelStateId: string, branchType: FlowStateType): { workflow: FlowWorkflow; branchId?: string } {
    const parallelState = findFlowWorkflowState(workflow, parallelStateId);
    if (!parallelState || parallelState.state.type !== 'parallel') {
        return { workflow };
    }
    const branchId = nextFlowWorkflowStateId(workflow, branchType);
    const updatedParallelState = compactFlowState({
        ...parallelState.state,
        branches: {
            ...(parallelState.state.branches || {}),
            [branchId]: createFlowWorkflowState(branchType, branchId)
        }
    });
    return {
        branchId,
        workflow: replaceFlowWorkflowState(workflow, parallelStateId, updatedParallelState)
    };
}

export function removeFlowWorkflowState(workflow: FlowWorkflow, stateId: string): FlowWorkflow {
    if (workflow.states[stateId]) {
        const states = { ...workflow.states };
        delete states[stateId];
        return { ...workflow, states };
    }
    const states = { ...workflow.states };
    for (const [parentId, parentState] of Object.entries(states)) {
        if (parentState.branches?.[stateId]) {
            const branches = { ...parentState.branches };
            delete branches[stateId];
            states[parentId] = compactFlowState({
                ...parentState,
                branches: Object.keys(branches).length ? branches : undefined
            });
            break;
        }
    }
    return { ...workflow, states };
}

export function findFlowWorkflowState(workflow: FlowWorkflow, stateId: string): { state: FlowWorkflowState; parentId?: string } | undefined {
    const state = workflow.states[stateId];
    if (state) {
        return { state };
    }
    for (const [parentId, parentState] of Object.entries(workflow.states || {})) {
        const branch = parentState.branches?.[stateId];
        if (branch) {
            return { state: branch, parentId };
        }
    }
    return undefined;
}

export function replaceFlowWorkflowState(workflow: FlowWorkflow, stateId: string, state: FlowWorkflowState): FlowWorkflow {
    if (workflow.states[stateId]) {
        return {
            ...workflow,
            states: {
                ...workflow.states,
                [stateId]: state
            }
        };
    }
    const states = { ...workflow.states };
    for (const [parentId, parentState] of Object.entries(states)) {
        if (parentState.branches?.[stateId]) {
            states[parentId] = {
                ...parentState,
                branches: {
                    ...parentState.branches,
                    [stateId]: state
                }
            };
            break;
        }
    }
    return { ...workflow, states };
}

export function flowWorkflowStateReferences(workflow: FlowWorkflow, stateId: string): string[] {
    const references: string[] = [];
    (workflow.transitions || []).forEach((transition, index) => {
        if (transition.from === stateId || transition.to === stateId) {
            references.push(`transition ${transition.id || index}`);
        }
    });
    for (const [candidateId, state] of Object.entries(workflow.states || {})) {
        collectWaitForReferences(candidateId, state, stateId, references);
        for (const [branchId, branch] of Object.entries(state.branches || {})) {
            collectWaitForReferences(branchId, branch, stateId, references);
        }
    }
    return references;
}

export function flowWorkflowStateIds(workflow: FlowWorkflow): string[] {
    const ids: string[] = [];
    for (const [stateId, state] of Object.entries(workflow.states || {})) {
        ids.push(stateId);
        ids.push(...Object.keys(state.branches || {}));
    }
    return ids;
}

export function nextFlowWorkflowStateId(workflow: FlowWorkflow, stateType: FlowStateType): string {
    const base = stateType.replace(/[^a-z0-9_]+/gi, '_').toLowerCase();
    const existing = new Set(flowWorkflowStateIds(workflow));
    if (!existing.has(base)) {
        return base;
    }
    let index = 2;
    while (existing.has(`${base}_${index}`)) {
        index++;
    }
    return `${base}_${index}`;
}

export function nextFlowWorkflowTransitionId(workflow: FlowWorkflow, from: string, to: string): string {
    const base = `${from}_to_${to}`.replace(/[^a-z0-9_]+/gi, '_').toLowerCase();
    const existing = new Set((workflow.transitions || []).map(transition => transition.id).filter(Boolean));
    if (!existing.has(base)) {
        return base;
    }
    let index = 2;
    while (existing.has(`${base}_${index}`)) {
        index++;
    }
    return `${base}_${index}`;
}

export function compactFlowState(state: FlowWorkflowState): FlowWorkflowState {
    return compactFlowObject(state) as FlowWorkflowState;
}

function collectWaitForReferences(candidateId: string, state: FlowWorkflowState, stateId: string, references: string[]): void {
    if ((state.waitFor || []).includes(stateId)) {
        references.push(`state ${candidateId}.waitFor`);
    }
}

function compactFlowObject<T extends Record<string, unknown>>(value: T): T {
    const compacted: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
        if (entry === undefined || entry === '') {
            continue;
        }
        if (Array.isArray(entry) && entry.length === 0) {
            continue;
        }
        if (isPlainObject(entry)) {
            const nested = compactFlowObject(entry as Record<string, unknown>);
            if (Object.keys(nested).length === 0) {
                continue;
            }
            compacted[key] = nested;
            continue;
        }
        compacted[key] = entry;
    }
    return compacted as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
