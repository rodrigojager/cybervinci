import {
    FlowPipelinePreset,
    FlowPipelinePresetAgentNodeConfiguration,
    FlowValidationIssue,
    FlowValidationResult,
    FlowWorkflow,
    FlowWorkflowState
} from './flow-types';
import { validateFlowWorkflow } from './flow-validation';

export const FLOW_PIPELINE_PRESET_VERSION = 'flow.pipeline-preset/v1';
export const SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID = 'sisyphus_ultrawork_coordinator';

export interface InstantiateFlowPipelinePresetOptions {
    id: string;
    name: string;
    description?: string;
    agentNodeOverrides?: Record<string, FlowPipelinePresetAgentNodeConfiguration>;
}

const SISYPHUS_COORDINATOR_SYSTEM_PROMPT = [
    'You are the Sisyphus coordinator for a Flow ultrawork pipeline.',
    'Turn the user request into a bounded plan, identify risks, and define acceptance criteria before work begins.',
    'Do not execute implementation work in this step; create a reviewable plan and work order for the ultraworker.'
].join('\n');

const SISYPHUS_COORDINATOR_TASK_PROMPT = [
    'Read the incoming task and produce:',
    '- plan/plan.md with scope, constraints, and ordered execution steps.',
    '- plan/acceptance-criteria.md with measurable completion criteria.',
    '- plan/work-order.md with the exact task for the ultraworker.'
].join('\n');

const SISYPHUS_ULTRAWORKER_SYSTEM_PROMPT = [
    'You are the Sisyphus ultraworker.',
    'Execute only the approved plan, keep changes scoped, preserve existing behavior unless instructed, and record evidence.',
    'Do not invent provider fallbacks or bypass Flow runtime validation.'
].join('\n');

const SISYPHUS_ULTRAWORKER_TASK_PROMPT = [
    'Use the approved plan and original request to implement the work.',
    'Produce work/summary.md, work/changes.md, and work/evidence.md describing changed files and verification evidence.'
].join('\n');

const SISYPHUS_REVIEWER_SYSTEM_PROMPT = [
    'You are the Sisyphus reviewer.',
    'Validate the ultrawork result against the approved plan, task constraints, deliverables, and verification evidence.',
    'Report concrete failures and required fixes; do not approve incomplete work.'
].join('\n');

const SISYPHUS_REVIEWER_TASK_PROMPT = [
    'Review the plan, original request, and ultraworker outputs.',
    'Produce review/review.md with pass/fail status, findings, and required follow-up actions.',
    'Emit review/status.json with { "status": "passed" | "failed" }.'
].join('\n');

const SISYPHUS_COORDINATOR_AGENT_MARKDOWN = [
    '# Sisyphus Coordinator',
    '',
    '## Role',
    '',
    'Create a concise, validating plan for a Sisyphus-style ultrawork pipeline.',
    '',
    '## Instructions',
    '',
    '- Keep scope bounded to the user request.',
    '- Surface constraints and risks before execution.',
    '- Produce plan, acceptance criteria, and ultraworker work order artifacts.',
    '- Leave provider availability decisions to Flow runtime validation.'
].join('\n');

const SISYPHUS_ULTRAWORKER_AGENT_MARKDOWN = [
    '# Sisyphus Ultraworker',
    '',
    '## Role',
    '',
    'Execute the approved plan directly and gather verification evidence.',
    '',
    '## Instructions',
    '',
    '- Follow the approved work order exactly.',
    '- Preserve behavior outside the requested scope.',
    '- Produce changed-file notes, evidence, and a concise summary.',
    '- Do not add deterministic or simulated fallbacks.'
].join('\n');

const SISYPHUS_REVIEWER_AGENT_MARKDOWN = [
    '# Sisyphus Reviewer',
    '',
    '## Role',
    '',
    'Validate the ultrawork output against the approved plan and deliverables.',
    '',
    '## Instructions',
    '',
    '- Check scope, constraints, changed files, and verification evidence.',
    '- Fail fast on missing deliverables or unverified claims.',
    '- Produce a clear pass/fail review with follow-up actions.'
].join('\n');

const BUILT_IN_PRESETS: FlowPipelinePreset[] = [
    {
        id: SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID,
        name: 'Sisyphus Ultrawork Coordinator',
        description: 'A validating coordinator -> plan gate -> ultraworker -> reviewer pipeline that inherits the configured Flow agent provider unless overridden.',
        version: FLOW_PIPELINE_PRESET_VERSION,
        source: 'built-in',
        tags: ['sisyphus', 'ultrawork', 'coordinator'],
        agentMarkdown: [
            { relativePath: 'sisyphus/coordinator.md', content: SISYPHUS_COORDINATOR_AGENT_MARKDOWN },
            { relativePath: 'sisyphus/ultraworker.md', content: SISYPHUS_ULTRAWORKER_AGENT_MARKDOWN },
            { relativePath: 'sisyphus/reviewer.md', content: SISYPHUS_REVIEWER_AGENT_MARKDOWN }
        ],
        workflow: {
            version: 'flow.workflow/v1',
            id: SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID,
            name: 'Sisyphus Ultrawork Coordinator',
            description: 'input -> sisyphus_coordinator -> plan gate -> sisyphus_ultraworker -> sisyphus_reviewer -> final report',
            agents: {
                sisyphus_coordinator: 'sisyphus/coordinator.md',
                sisyphus_ultraworker: 'sisyphus/ultraworker.md',
                sisyphus_reviewer: 'sisyphus/reviewer.md'
            },
            requires: {
                capabilities: ['llm.agent.execute', 'human.approval', 'filesystem.artifacts']
            },
            states: {
                input: {
                    type: 'input',
                    outputs: ['input/request.md'],
                    outcomes: { success: 'sisyphus_coordinator' }
                },
                sisyphus_coordinator: {
                    type: 'agent',
                    agent: 'sisyphus_coordinator',
                    systemPrompt: SISYPHUS_COORDINATOR_SYSTEM_PROMPT,
                    taskPrompt: SISYPHUS_COORDINATOR_TASK_PROMPT,
                    input: { include: ['input/request.md'] },
                    outputs: ['plan/plan.md', 'plan/acceptance-criteria.md', 'plan/work-order.md'],
                    deliverables: [
                        { path: 'plan/plan.md', description: 'Approved implementation plan', required: true, kind: 'markdown' },
                        { path: 'plan/acceptance-criteria.md', description: 'Measurable validation criteria', required: true, kind: 'markdown' },
                        { path: 'plan/work-order.md', description: 'Scoped work order for the ultraworker', required: true, kind: 'markdown' }
                    ],
                    outcomes: { success: 'plan_gate' }
                },
                plan_gate: {
                    type: 'gate',
                    input: { include: ['plan/plan.md', 'plan/acceptance-criteria.md', 'plan/work-order.md'] },
                    gates: [{
                        id: 'sisyphus_plan_approval',
                        title: 'Approve Sisyphus plan',
                        prompt: 'Review the coordinator plan and approve before ultrawork execution starts.',
                        decisions: [
                            { id: 'approved', label: 'Approve ultrawork', outcome: 'approved', to: 'sisyphus_ultraworker' },
                            { id: 'revision_requested', label: 'Send back to coordinator', outcome: 'revision_requested', to: 'sisyphus_coordinator' },
                            { id: 'rejected', label: 'Reject run', outcome: 'rejected', action: 'fail' }
                        ]
                    }],
                    outcomes: {
                        approved: 'sisyphus_ultraworker',
                        revision_requested: 'sisyphus_coordinator',
                        rejected: { action: 'fail' }
                    }
                },
                sisyphus_ultraworker: {
                    type: 'agent',
                    agent: 'sisyphus_ultraworker',
                    systemPrompt: SISYPHUS_ULTRAWORKER_SYSTEM_PROMPT,
                    taskPrompt: SISYPHUS_ULTRAWORKER_TASK_PROMPT,
                    input: { include: ['input/request.md', 'plan/plan.md', 'plan/acceptance-criteria.md', 'plan/work-order.md'] },
                    outputs: ['work/summary.md', 'work/changes.md', 'work/evidence.md'],
                    deliverables: [
                        { path: 'work/summary.md', description: 'Implementation summary', required: true, kind: 'markdown' },
                        { path: 'work/changes.md', description: 'Changed files and rationale', required: true, kind: 'markdown' },
                        { path: 'work/evidence.md', description: 'Verification evidence and commands run', required: true, kind: 'markdown' }
                    ],
                    outcomes: { success: 'sisyphus_reviewer' }
                },
                sisyphus_reviewer: {
                    type: 'agent',
                    agent: 'sisyphus_reviewer',
                    systemPrompt: SISYPHUS_REVIEWER_SYSTEM_PROMPT,
                    taskPrompt: SISYPHUS_REVIEWER_TASK_PROMPT,
                    input: { include: ['input/request.md', 'plan/plan.md', 'plan/acceptance-criteria.md', 'work/summary.md', 'work/changes.md', 'work/evidence.md'] },
                    outputs: ['review/review.md', 'review/status.json'],
                    deliverables: [
                        { path: 'review/review.md', description: 'Pass/fail review with findings', required: true, kind: 'markdown' },
                        { path: 'review/status.json', description: 'Machine-readable review status', required: true, kind: 'json' }
                    ],
                    outcomes: { success: 'final_report' }
                },
                final_report: {
                    type: 'report',
                    input: { include: ['plan/plan.md', 'work/summary.md', 'work/evidence.md', 'review/review.md', 'review/status.json'] },
                    outputs: ['final/report.md']
                }
            },
            transitions: [
                { id: 'input_to_sisyphus_coordinator', from: 'input', to: 'sisyphus_coordinator', on: 'run.started' },
                { id: 'sisyphus_coordinator_to_plan_gate', from: 'sisyphus_coordinator', to: 'plan_gate', on: 'workload.completed', guard: { 'artifact.exists': 'plan/plan.md' } },
                { id: 'plan_gate_to_sisyphus_ultraworker', from: 'plan_gate', to: 'sisyphus_ultraworker', on: 'gate.approved', guard: { 'gate.status': { id: 'sisyphus_plan_approval', value: 'approved' } } },
                { id: 'sisyphus_ultraworker_to_sisyphus_reviewer', from: 'sisyphus_ultraworker', to: 'sisyphus_reviewer', on: 'workload.completed', guard: { 'artifact.exists': 'work/summary.md' } },
                { id: 'sisyphus_reviewer_to_final_report', from: 'sisyphus_reviewer', to: 'final_report', on: 'workload.completed', guard: { 'artifact.exists': 'review/review.md' } }
            ]
        }
    }
];

export function listBuiltInFlowPipelinePresets(): FlowPipelinePreset[] {
    return clone(BUILT_IN_PRESETS);
}

export function getBuiltInFlowPipelinePreset(id: string): FlowPipelinePreset | undefined {
    const preset = BUILT_IN_PRESETS.find(candidate => candidate.id === id);
    return preset ? clone(preset) : undefined;
}

export function instantiateFlowPipelinePreset(preset: FlowPipelinePreset, options: InstantiateFlowPipelinePresetOptions): FlowWorkflow {
    const workflow = clone(preset.workflow);
    const instantiated: FlowWorkflow = {
        ...workflow,
        id: options.id,
        name: options.name,
        description: options.description || workflow.description
    };
    for (const [stateId, override] of Object.entries(options.agentNodeOverrides || {})) {
        const state = instantiated.states[stateId];
        if (state?.type === 'agent') {
            instantiated.states[stateId] = applyAgentNodeOverride(state, override);
        }
    }
    return instantiated;
}

export function validateFlowPipelinePreset(preset: FlowPipelinePreset): FlowValidationResult {
    const errors: FlowValidationIssue[] = [];
    const warnings: FlowValidationIssue[] = [];
    if (!preset || typeof preset !== 'object') {
        return {
            valid: false,
            errors: [{ code: 'preset.invalid', message: 'Pipeline preset must be an object.' }],
            warnings
        };
    }
    if (typeof preset.id !== 'string' || preset.id.trim() === '') {
        errors.push({ code: 'preset.id.required', message: 'Pipeline preset id is required.', path: 'id' });
    }
    if (typeof preset.name !== 'string' || preset.name.trim() === '') {
        errors.push({ code: 'preset.name.required', message: 'Pipeline preset name is required.', path: 'name' });
    }
    if (typeof preset.description !== 'string' || preset.description.trim() === '') {
        errors.push({ code: 'preset.description.required', message: 'Pipeline preset description is required.', path: 'description' });
    }
    if (preset.version !== FLOW_PIPELINE_PRESET_VERSION) {
        errors.push({ code: 'preset.version.invalid', message: `Pipeline preset version must be ${FLOW_PIPELINE_PRESET_VERSION}.`, path: 'version' });
    }
    if (!preset.workflow || typeof preset.workflow !== 'object') {
        errors.push({ code: 'preset.workflow.required', message: 'Pipeline preset workflow is required.', path: 'workflow' });
    } else {
        const workflowValidation = validateFlowWorkflow(preset.workflow);
        errors.push(...workflowValidation.errors.map(error => prefixIssue(error, 'workflow')));
        warnings.push(...workflowValidation.warnings.map(warning => prefixIssue(warning, 'workflow')));
    }
    validateAgentMarkdown(preset, errors);
    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

function validateAgentMarkdown(preset: FlowPipelinePreset, errors: FlowValidationIssue[]): void {
    for (const [index, agent] of (preset.agentMarkdown || []).entries()) {
        if (!agent.relativePath || agent.relativePath.split(/[\\/]+/).some(segment => segment === '..')) {
            errors.push({ code: 'preset.agent_markdown.path.invalid', message: `Agent markdown ${index} must use a safe relative path.`, path: `agentMarkdown.${index}.relativePath` });
        }
        if (!agent.relativePath.endsWith('.md') && !agent.relativePath.endsWith('.markdown')) {
            errors.push({ code: 'preset.agent_markdown.extension.invalid', message: `Agent markdown ${index} must be a Markdown file.`, path: `agentMarkdown.${index}.relativePath` });
        }
        if (typeof agent.content !== 'string' || agent.content.trim() === '') {
            errors.push({ code: 'preset.agent_markdown.content.required', message: `Agent markdown ${index} content is required.`, path: `agentMarkdown.${index}.content` });
        }
    }
}

function applyAgentNodeOverride(state: FlowWorkflowState, override: FlowPipelinePresetAgentNodeConfiguration): FlowWorkflowState {
    return {
        ...state,
        provider: override.provider ?? state.provider,
        modelExecution: override.modelExecution ?? state.modelExecution,
        systemPrompt: override.systemPrompt ?? state.systemPrompt,
        taskPrompt: override.taskPrompt ?? state.taskPrompt,
        outputs: override.outputs ?? state.outputs,
        deliverables: override.deliverables ?? state.deliverables
    };
}

function prefixIssue(issue: FlowValidationIssue, prefix: string): FlowValidationIssue {
    return {
        ...issue,
        path: issue.path ? `${prefix}.${issue.path}` : prefix
    };
}

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}
