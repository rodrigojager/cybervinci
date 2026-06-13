import { listFlowModelProfiles } from './flow-model-profiles';
import { FlowPatternCompileRequest, FlowWorkflowPattern, listFlowWorkflowPatterns } from './flow-patterns';
import {
    FlowAgenticRole,
    FlowModelProfile,
    FlowReasoningEffort,
    FlowReasoningMode,
    FlowReasoningPolicy,
    FlowStateType,
    FlowWorkflow,
    FlowWorkflowFileFormat
} from './flow-types';

export const FLOW_AI_AUTHORING_SPEC_VERSION = 'flow.ai-authoring/v1';

export type FlowAiAuthoringAction =
    | 'run_saved_workflow'
    | 'instantiate_pattern'
    | 'create_workflow'
    | 'ask_user';

export type FlowUiControlType =
    | 'dropdown'
    | 'toggle'
    | 'number'
    | 'text'
    | 'markdown'
    | 'model_picker'
    | 'provider_picker'
    | 'reasoning_picker'
    | 'state_canvas';

export interface FlowUiControlSpec {
    id: string;
    label: string;
    control: FlowUiControlType;
    path: string;
    description?: string;
    options?: string[];
}

export interface FlowAiAuthoringSpec {
    version: typeof FLOW_AI_AUTHORING_SPEC_VERSION;
    purpose: 'dynamic_workflow_authoring';
    internalFormats: Exclude<FlowWorkflowFileFormat, 'unknown'>[];
    humanEditableFormats: ['markdown'];
    actions: FlowAiAuthoringAction[];
    stateTypes: FlowStateType[];
    agentRoles: FlowAgenticRole[];
    reasoningModes: FlowReasoningMode[];
    reasoningEfforts: FlowReasoningEffort[];
    reasoningPolicies: FlowReasoningPolicy[];
    modelProfiles: FlowModelProfile[];
    patterns: FlowWorkflowPattern[];
    uiControls: FlowUiControlSpec[];
    outputSchema: Record<string, unknown>;
    systemPrompt: string;
}

export interface FlowAiAuthoringDraft {
    version: typeof FLOW_AI_AUTHORING_SPEC_VERSION | string;
    action: FlowAiAuthoringAction;
    confidence?: number;
    reason?: string;
    promptMarkdown?: string;
    savedWorkflowId?: string;
    pattern?: FlowPatternCompileRequest;
    workflow?: FlowWorkflow;
    questionMarkdown?: string;
}

export function getFlowAiAuthoringSpec(): FlowAiAuthoringSpec {
    return {
        version: FLOW_AI_AUTHORING_SPEC_VERSION,
        purpose: 'dynamic_workflow_authoring',
        internalFormats: ['json', 'yaml'],
        humanEditableFormats: ['markdown'],
        actions: ['run_saved_workflow', 'instantiate_pattern', 'create_workflow', 'ask_user'],
        stateTypes: ['input', 'context', 'agent', 'parallel', 'dynamic_parallel', 'tournament', 'join', 'condition', 'gate', 'command', 'memory_write', 'report'],
        agentRoles: ['classifier', 'planner', 'executor', 'candidate_generator', 'critic', 'judge', 'verifier', 'synthesizer', 'repairer', 'researcher'],
        reasoningModes: ['off', 'auto', 'fast', 'balanced', 'deep', 'coding', 'research', 'lats'],
        reasoningEfforts: ['none', 'low', 'medium', 'high'],
        reasoningPolicies: ['off', 'native', 'virtual', 'auto', 'native_plus_virtual_light'],
        modelProfiles: listFlowModelProfiles(),
        patterns: listFlowWorkflowPatterns(),
        uiControls: FLOW_AI_AUTHORING_UI_CONTROLS,
        outputSchema: FLOW_AI_AUTHORING_OUTPUT_SCHEMA,
        systemPrompt: FLOW_AI_AUTHORING_SYSTEM_PROMPT
    };
}

export const FLOW_AI_AUTHORING_UI_CONTROLS: FlowUiControlSpec[] = [
    {
        id: 'workflow.name',
        label: 'Workflow name',
        control: 'text',
        path: 'workflow.name',
        description: 'Short display name shown in the Flow UI.'
    },
    {
        id: 'state.canvas',
        label: 'State canvas',
        control: 'state_canvas',
        path: 'workflow.states',
        description: 'Visual canvas for adding, moving, connecting, and configuring states.'
    },
    {
        id: 'state.prompt',
        label: 'Prompt',
        control: 'markdown',
        path: 'workflow.states.*.taskPrompt',
        description: 'Only prompt text is intended for manual Markdown editing.'
    },
    {
        id: 'state.provider',
        label: 'Provider',
        control: 'provider_picker',
        path: 'workflow.states.*.provider.providerId',
        description: 'Provider picker for each agentic stage.'
    },
    {
        id: 'state.model',
        label: 'Model',
        control: 'model_picker',
        path: 'workflow.states.*.provider.modelId',
        description: 'Model picker scoped by provider for each agentic stage.'
    },
    {
        id: 'state.reasoning.policy',
        label: 'Reasoning policy',
        control: 'dropdown',
        path: 'workflow.states.*.modelExecution.reasoningPolicy',
        options: ['off', 'native', 'virtual', 'auto', 'native_plus_virtual_light']
    },
    {
        id: 'state.native.reasoning.effort',
        label: 'Native reasoning effort',
        control: 'reasoning_picker',
        path: 'workflow.states.*.modelExecution.nativeReasoning.effort',
        options: ['none', 'low', 'medium', 'high']
    },
    {
        id: 'state.virtual.reasoning.mode',
        label: 'Virtual reasoning mode',
        control: 'reasoning_picker',
        path: 'workflow.states.*.modelExecution.virtualReasoning.mode',
        options: ['off', 'auto', 'fast', 'balanced', 'deep', 'coding', 'research', 'lats']
    },
    {
        id: 'state.timeout',
        label: 'Timeout',
        control: 'number',
        path: 'workflow.states.*.timeoutMs'
    },
    {
        id: 'pattern.parameters',
        label: 'Pattern parameters',
        control: 'dropdown',
        path: 'pattern.parameters',
        description: 'Pattern parameters are rendered from their typed metadata, never as raw JSON.'
    },
    {
        id: 'pattern.roleOverrides',
        label: 'Agentic stage model settings',
        control: 'model_picker',
        path: 'pattern.roleOverrides',
        description: 'Per-stage provider, model, model profile, native reasoning, and virtual reasoning settings are rendered from pattern.agenticStages.'
    }
];

export const FLOW_AI_AUTHORING_OUTPUT_SCHEMA: Record<string, unknown> = {
    type: 'object',
    required: ['version', 'action'],
    additionalProperties: false,
    properties: {
        version: { const: FLOW_AI_AUTHORING_SPEC_VERSION },
        action: {
            enum: ['run_saved_workflow', 'instantiate_pattern', 'create_workflow', 'ask_user']
        },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        reason: { type: 'string' },
        promptMarkdown: { type: 'string' },
        savedWorkflowId: { type: 'string' },
        pattern: {
            type: 'object',
            description: 'FlowPatternCompileRequest. Use when action is instantiate_pattern.'
        },
        workflow: {
            type: 'object',
            description: 'FlowWorkflow. Use when action is create_workflow.'
        },
        questionMarkdown: {
            type: 'string',
            description: 'Short Markdown question for the user when action is ask_user.'
        }
    }
};

export const FLOW_AI_AUTHORING_SYSTEM_PROMPT = [
    'You are the internal CyberVinci Flow authoring harness.',
    'You may produce JSON or YAML as internal machine-readable configuration, but the user must never be asked to manually edit JSON or YAML.',
    'The only manually editable text surface for users is Markdown prompt content.',
    'When existing saved workflows fit the user request, choose action "run_saved_workflow".',
    'When a built-in workflow pattern fits, choose action "instantiate_pattern" and fill typed parameters.',
    'For pattern model selection, use pattern.agenticStages and emit roleOverrides keyed by stage id or role.',
    'When no saved workflow or pattern fits, choose action "create_workflow" and emit a complete FlowWorkflow object.',
    'Every agentic state may specify provider, model, modelExecution.reasoningPolicy, nativeReasoning effort, and virtualReasoning mode.',
    'Use dynamic_parallel for data-dependent fan-out and tournament for candidate competition judged by an agentic step.',
    'Keep orchestration in Flow states and transitions; keep natural-language task instructions in Markdown prompt fields.',
    'Return only one object matching flow.ai-authoring/v1.'
].join('\n');
