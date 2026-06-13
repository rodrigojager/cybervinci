import { FlowCapabilities, FlowWorkflow } from './flow-types';
export interface FlowCapabilityResolution {
    required: string[];
    provided: string[];
    missing: string[];
}
export interface MissingCapabilityMessageOptions {
    workflow?: FlowWorkflow;
    host?: string;
    executionMode?: string;
}
export declare function resolveFlowWorkflowCapabilities(workflow: FlowWorkflow, capabilities: FlowCapabilities): FlowCapabilityResolution;
export declare function isCapabilityAvailable(capability: string, capabilities: FlowCapabilities): boolean;
export declare function formatMissingCapabilities(missing: string[], options?: MissingCapabilityMessageOptions): string;
export declare function enablementActionForCapability(capability: string): string;
export declare function affectedWorkflowStatesForCapability(workflow: FlowWorkflow, capability: string): string[];
