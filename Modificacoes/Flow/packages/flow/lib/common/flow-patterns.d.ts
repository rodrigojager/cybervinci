import { FlowModelExecutionProfile, FlowProviderSelection, FlowWorkflow } from './flow-types';
export type FlowPatternParameterType = 'string' | 'number' | 'boolean' | 'select' | 'model_profile' | 'reasoning_mode' | 'markdown';
export interface FlowPatternParameterOption {
    value: string | number | boolean;
    label: string;
    description?: string;
}
export interface FlowPatternParameter {
    id: string;
    label: string;
    type: FlowPatternParameterType;
    description?: string;
    defaultValue?: string | number | boolean;
    min?: number;
    max?: number;
    options?: FlowPatternParameterOption[];
}
export interface FlowWorkflowPattern {
    id: FlowWorkflowPatternId;
    name: string;
    description: string;
    category: 'routing' | 'verification' | 'generation' | 'competition' | 'loop' | 'parallel';
    parameters: FlowPatternParameter[];
    agenticStages?: FlowWorkflowPatternAgenticStage[];
    tags?: string[];
}
export interface FlowWorkflowPatternAgenticStage {
    id: string;
    label: string;
    role: string;
    profileParameterId?: string;
    description?: string;
    repeated?: boolean;
}
export type FlowWorkflowPatternId = 'classify_and_act' | 'adversarial_verification' | 'generate_and_filter' | 'simple_tournament' | 'bounded_loop_until_done' | 'fanout_and_synthesize_fixed';
export interface FlowPatternRoleOverride {
    profileId?: string;
    provider?: FlowProviderSelection;
    modelExecution?: FlowModelExecutionProfile;
}
export interface FlowPatternCompileRequest {
    patternId: FlowWorkflowPatternId | string;
    workflowId?: string;
    name?: string;
    description?: string;
    parameters?: Record<string, unknown>;
    roleProfiles?: Record<string, string>;
    roleOverrides?: Record<string, FlowPatternRoleOverride>;
}
export declare function listFlowWorkflowPatterns(): FlowWorkflowPattern[];
export declare function getFlowWorkflowPattern(id: FlowWorkflowPatternId | string): FlowWorkflowPattern | undefined;
export declare function compileFlowWorkflowPattern(request: FlowPatternCompileRequest): FlowWorkflow;
//# sourceMappingURL=flow-patterns.d.ts.map