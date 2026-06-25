"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLOW_AI_AUTHORING_SYSTEM_PROMPT = exports.FLOW_AI_AUTHORING_OUTPUT_SCHEMA = exports.FLOW_AI_AUTHORING_UI_CONTROLS = exports.FLOW_DYNAMIC_AUTHORING_PURPOSE = exports.FLOW_DYNAMIC_AUTHORING_AGENT_ID = exports.FLOW_AI_AUTHORING_SPEC_VERSION = void 0;
exports.getFlowAiAuthoringSpec = getFlowAiAuthoringSpec;
var flow_model_profiles_1 = require("./flow-model-profiles");
var flow_patterns_1 = require("./flow-patterns");
exports.FLOW_AI_AUTHORING_SPEC_VERSION = 'flow.ai-authoring/v1';
exports.FLOW_DYNAMIC_AUTHORING_AGENT_ID = 'cybervinci-flow-dynamic-authoring';
exports.FLOW_DYNAMIC_AUTHORING_PURPOSE = 'dynamic_workflow_authoring';
function getFlowAiAuthoringSpec() {
    return {
        version: exports.FLOW_AI_AUTHORING_SPEC_VERSION,
        purpose: 'dynamic_workflow_authoring',
        internalFormats: ['json', 'yaml'],
        humanEditableFormats: ['markdown'],
        actions: ['run_saved_workflow', 'instantiate_pattern', 'create_workflow', 'ask_user'],
        stateTypes: ['input', 'context', 'agent', 'parallel', 'dynamic_parallel', 'tournament', 'join', 'condition', 'gate', 'loop', 'command', 'memory_write', 'report'],
        agentRoles: ['classifier', 'planner', 'executor', 'candidate_generator', 'critic', 'judge', 'verifier', 'synthesizer', 'repairer', 'researcher'],
        reasoningModes: ['off', 'auto', 'fast', 'balanced', 'deep', 'coding', 'research', 'lats'],
        reasoningEfforts: ['none', 'low', 'medium', 'high', 'xhigh'],
        reasoningPolicies: ['off', 'native', 'virtual', 'auto', 'native_plus_virtual_light'],
        serviceTiers: ['default', 'fast', 'flex'],
        modelProfiles: (0, flow_model_profiles_1.listFlowModelProfiles)(),
        patterns: (0, flow_patterns_1.listFlowWorkflowPatterns)(),
        uiControls: exports.FLOW_AI_AUTHORING_UI_CONTROLS,
        outputSchema: exports.FLOW_AI_AUTHORING_OUTPUT_SCHEMA,
        systemPrompt: exports.FLOW_AI_AUTHORING_SYSTEM_PROMPT
    };
}
exports.FLOW_AI_AUTHORING_UI_CONTROLS = [
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
        id: 'state.reasoning.variant',
        label: 'Reasoning variant',
        control: 'text',
        path: 'workflow.states.*.modelExecution.reasoningVariant',
        description: 'Optional provider-specific reasoning variant, such as a fast or quality variant when exposed by the selected model.'
    },
    {
        id: 'state.service.tier',
        label: 'Service tier',
        control: 'dropdown',
        path: 'workflow.states.*.modelExecution.serviceTier',
        options: ['default', 'fast', 'flex']
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
exports.FLOW_AI_AUTHORING_OUTPUT_SCHEMA = {
    type: 'object',
    required: ['version', 'action'],
    additionalProperties: false,
    properties: {
        version: { const: exports.FLOW_AI_AUTHORING_SPEC_VERSION },
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
exports.FLOW_AI_AUTHORING_SYSTEM_PROMPT = [
    'You are the internal CyberVinci Flow authoring harness.',
    'You may produce JSON or YAML as internal machine-readable configuration, but the user must never be asked to manually edit JSON or YAML.',
    'The only manually editable text surface for users is Markdown prompt content.',
    'When existing saved workflows fit the user request, choose action "run_saved_workflow".',
    'When a built-in workflow pattern fits, choose action "instantiate_pattern" and fill typed parameters.',
    'For pattern model selection, use pattern.agenticStages and emit roleOverrides keyed by stage id or role.',
    'When choosing provider/model for agentic states, prefer provider ids and models from the aiProviders catalog supplied in the task input.',
    'When no saved workflow or pattern fits, choose action "create_workflow" and emit a complete FlowWorkflow object.',
    'Every agentic state may specify provider, model, modelExecution.reasoningPolicy, nativeReasoning effort, reasoningVariant, virtualReasoning mode, and serviceTier.',
    'Use dynamic_parallel for data-dependent fan-out and tournament for candidate competition judged by an agentic step.',
    'Keep orchestration in Flow states and transitions; keep natural-language task instructions in Markdown prompt fields.',
    'Return only one object matching flow.ai-authoring/v1.'
].join('\n');
