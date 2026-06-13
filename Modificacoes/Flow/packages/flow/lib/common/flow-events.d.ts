import { FlowEvent } from './flow-types';
export interface FlowEventLogFilter {
    stateId?: string;
    workloadId?: string;
    eventType?: string;
    gateId?: string;
    artifact?: string;
    effect?: string;
    severity?: string;
}
export declare function normalizeFlowEvents(events: FlowEvent[]): FlowEvent[];
export declare function filterFlowEvents(events: FlowEvent[], filter: FlowEventLogFilter): FlowEvent[];
export declare function hasFlowEventLogFilter(filter: FlowEventLogFilter): boolean;
