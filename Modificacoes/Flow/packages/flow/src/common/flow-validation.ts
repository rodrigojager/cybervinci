import { FlowValidationIssue, FlowValidationResult, FlowWorkflow } from './flow-types';

const VALID_STATE_TYPES = new Set([
    'input',
    'context',
    'agent',
    'parallel',
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
    if (state.type === 'gate' && (!state.gates || state.gates.length === 0)) {
        warnings.push({ code: 'state.gate.gates.missing', message: `Gate state "${stateId}" does not declare a human gate.`, path: `${path}.gates` });
    }
    if (state.type === 'join' && (!state.waitFor || state.waitFor.length === 0)) {
        warnings.push({ code: 'state.join.wait_for.missing', message: `Join state "${stateId}" does not declare branches to wait for.`, path: `${path}.waitFor` });
    }
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
