import { FlowPatternCompileRequest, FlowWorkflowPattern } from './flow-patterns';
import { FlowAgenticRole, FlowModelProfile, FlowReasoningEffort, FlowReasoningMode, FlowReasoningPolicy, FlowStateType, FlowWorkflow, FlowWorkflowFileFormat } from './flow-types';
export declare const FLOW_AI_AUTHORING_SPEC_VERSION = "flow.ai-authoring/v1";
export type FlowAiAuthoringAction = 'run_saved_workflow' | 'instantiate_pattern' | 'create_workflow' | 'ask_user';
export type FlowUiControlType = 'dropdown' | 'toggle' | 'number' | 'text' | 'markdown' | 'model_picker' | 'provider_picker' | 'reasoning_picker' | 'state_canvas';
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
export declare function getFlowAiAuthoringSpec(): FlowAiAuthoringSpec;
export declare const FLOW_AI_AUTHORING_UI_CONTROLS: FlowUiControlSpec[];
export declare const FLOW_AI_AUTHORING_OUTPUT_SCHEMA: Record<string, unknown>;
export declare const FLOW_AI_AUTHORING_SYSTEM_PROMPT: string;
