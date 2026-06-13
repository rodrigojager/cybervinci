import { FlowRun } from './flow-types';
export declare function redactFlowSecretsText(value: string | undefined): string | undefined;
export declare function redactFlowSecretsValue<T>(value: T): T;
export declare function redactFlowRunForDisplay(run: FlowRun): FlowRun;
