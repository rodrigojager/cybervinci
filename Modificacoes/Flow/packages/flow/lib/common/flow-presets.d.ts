import { FlowPipelinePreset, FlowPipelinePresetAgentNodeConfiguration, FlowValidationResult, FlowWorkflow } from './flow-types';
export declare const FLOW_PIPELINE_PRESET_VERSION = "flow.pipeline-preset/v1";
export declare const SISYPHUS_ULTRAWORK_COORDINATOR_PRESET_ID = "sisyphus_ultrawork_coordinator";
export interface InstantiateFlowPipelinePresetOptions {
    id: string;
    name: string;
    description?: string;
    agentNodeOverrides?: Record<string, FlowPipelinePresetAgentNodeConfiguration>;
}
export declare function listBuiltInFlowPipelinePresets(): FlowPipelinePreset[];
export declare function getBuiltInFlowPipelinePreset(id: string): FlowPipelinePreset | undefined;
export declare function instantiateFlowPipelinePreset(preset: FlowPipelinePreset, options: InstantiateFlowPipelinePresetOptions): FlowWorkflow;
export declare function validateFlowPipelinePreset(preset: FlowPipelinePreset): FlowValidationResult;
