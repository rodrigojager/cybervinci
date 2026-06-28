import * as yaml from 'js-yaml';
import { FlowWorkflow, FlowWorkflowTransition } from './flow-types';

export interface FlowWorkflowStructuralDiff {
    fromWorkflowId: string;
    toWorkflowId: string;
    items: FlowWorkflowStructuralDiffItem[];
}

export interface FlowWorkflowStructuralDiffItem {
    kind: 'state' | 'transition' | 'metadata' | 'agent' | 'guard' | 'capability' | 'template';
    change: 'added' | 'removed' | 'changed';
    id: string;
    summary: string;
}

export function formatWorkflowSource(workflow: FlowWorkflow): string {
    const serializable = stripWorkflowFileMetadata(workflow);
    if (workflow.file?.format === 'yaml') {
        return yaml.dump(serializable, { lineWidth: 120, noRefs: true, sortKeys: false });
    }
    return `${JSON.stringify(serializable, undefined, 2)}\n`;
}

export function parseWorkflowSource(source: string, currentWorkflow: FlowWorkflow): FlowWorkflow {
    const parsed = currentWorkflow.file?.format === 'yaml'
        ? yaml.load(source)
        : JSON.parse(source);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`Workflow ${workflowSourceFormatLabel(currentWorkflow)} source must contain a mapping object.`);
    }
    return {
        ...(parsed as FlowWorkflow),
        file: currentWorkflow.file
    };
}

export function stripWorkflowFileMetadata(workflow: FlowWorkflow): Omit<FlowWorkflow, 'file'> {
    const serializable: Partial<FlowWorkflow> = { ...workflow };
    delete serializable.file;
    return serializable as Omit<FlowWorkflow, 'file'>;
}

export function workflowSourceFormatLabel(workflow: FlowWorkflow): 'YAML' | 'JSON' {
    return workflow.file?.format === 'yaml' ? 'YAML' : 'JSON';
}

export function compareFlowWorkflowStructure(fileWorkflow: FlowWorkflow, canvasWorkflow: FlowWorkflow): FlowWorkflowStructuralDiff {
    const items: FlowWorkflowStructuralDiffItem[] = [];
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
        items
    };
}

function compareScalar(items: FlowWorkflowStructuralDiffItem[], kind: FlowWorkflowStructuralDiffItem['kind'], id: string, before: unknown, after: unknown): void {
    if (stableStringify(before) !== stableStringify(after)) {
        items.push({
            kind,
            change: 'changed',
            id,
            summary: `${formatDiffValue(before)} -> ${formatDiffValue(after)}`
        });
    }
}

function compareRecord(items: FlowWorkflowStructuralDiffItem[], kind: FlowWorkflowStructuralDiffItem['kind'], before: Record<string, unknown>, after: Record<string, unknown>): void {
    const ids = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
    for (const id of ids) {
        if (!(id in before)) {
            items.push({ kind, change: 'added', id, summary: summarizeDiffObject(after[id]) });
        } else if (!(id in after)) {
            items.push({ kind, change: 'removed', id, summary: summarizeDiffObject(before[id]) });
        } else if (stableStringify(before[id]) !== stableStringify(after[id])) {
            items.push({ kind, change: 'changed', id, summary: describeStructuralChange(before[id], after[id]) });
        }
    }
}

function workflowStateRecord(workflow: FlowWorkflow): Record<string, unknown> {
    const states: Record<string, unknown> = {};
    for (const [stateId, state] of Object.entries(workflow.states || {})) {
        states[stateId] = state;
        for (const [branchId, branch] of Object.entries(state.branches || {})) {
            states[branchId] = { ...branch, parent: stateId };
        }
    }
    return states;
}

function workflowTransitionRecord(workflow: FlowWorkflow): Record<string, unknown> {
    const transitions: Record<string, unknown> = {};
    for (const transition of workflow.transitions || []) {
        transitions[transitionKey(transition)] = transition;
    }
    return transitions;
}

function capabilitiesRecord(workflow: FlowWorkflow): Record<string, unknown> {
    return Object.fromEntries((workflow.requires?.capabilities || []).map(capability => [capability, true]));
}

function workflowTemplateRecord(workflow: FlowWorkflow): Record<string, unknown> {
    const source = workflow as FlowWorkflow & {
        template?: unknown;
        templateId?: unknown;
        templateVersion?: unknown;
        templateRef?: unknown;
        metadata?: {
            template?: unknown;
            templateId?: unknown;
            templateVersion?: unknown;
            templateRef?: unknown;
        };
    };
    const record: Record<string, unknown> = {};
    for (const [key, value] of Object.entries({
        template: source.template,
        templateId: source.templateId,
        templateVersion: source.templateVersion,
        templateRef: source.templateRef,
        metadataTemplate: source.metadata?.template,
        metadataTemplateId: source.metadata?.templateId,
        metadataTemplateVersion: source.metadata?.templateVersion,
        metadataTemplateRef: source.metadata?.templateRef
    })) {
        if (value !== undefined) {
            record[key] = value;
        }
    }
    return record;
}

function workflowGuardRecord(workflow: FlowWorkflow): Record<string, unknown> {
    const guards: Record<string, unknown> = {};
    for (const transition of workflow.transitions || []) {
        const key = transitionKey(transition);
        if (transition.guard !== undefined) {
            guards[key] = transition.guard;
        }
    }
    return guards;
}

function describeStructuralChange(before: unknown, after: unknown): string {
    if (isPlainObject(before) && isPlainObject(after)) {
        const changedKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
            .filter(key => stableStringify(before[key]) !== stableStringify(after[key]))
            .sort();
        return changedKeys.length ? `Changed ${changedKeys.join(', ')}` : 'Changed structure';
    }
    return `${formatDiffValue(before)} -> ${formatDiffValue(after)}`;
}

function summarizeDiffObject(value: unknown): string {
    if (isPlainObject(value)) {
        const type = typeof value.type === 'string' ? `${value.type}` : undefined;
        const edge = typeof value.from === 'string' && typeof value.to === 'string' ? `${value.from} -> ${value.to}` : undefined;
        return [type, edge].filter(Boolean).join(' / ') || Object.keys(value).sort().join(', ');
    }
    return formatDiffValue(value);
}

function formatDiffValue(value: unknown): string {
    if (value === undefined) {
        return '(empty)';
    }
    if (typeof value === 'string') {
        return value || '(empty)';
    }
    return stableStringify(value);
}

function stableStringify(value: unknown): string {
    return JSON.stringify(sortStable(value));
}

function sortStable(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(sortStable);
    }
    if (isPlainObject(value)) {
        return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortStable(value[key])]));
    }
    return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function transitionKey(transition: FlowWorkflowTransition): string {
    return transition.id || `${transition.from}-${transition.to}`;
}
