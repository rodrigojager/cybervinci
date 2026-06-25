import { FlowPlaybookRunner, FlowPlaybookRunRequest, FlowPlaybookRunResult } from '@cybervinci/flow/lib/node/flow-playbook-runner';
import { CyberVinciHostToolExecutionResult, CyberVinciPlaybookAskOption, CyberVinciPlaybookCondition, CyberVinciPlaybookDefinition, CyberVinciPlaybookState } from '../common';
import { CyberVinciAgencyAgentService } from './cybervinci-agency-agent-service';
interface BackendPlaybookContext {
    requestId: string;
    playbookId: string;
    prompt: string;
    input: Record<string, unknown>;
    state: Record<string, unknown>;
    diagnostics: string[];
    events: BackendPlaybookEvent[];
}
interface BackendPlaybookEvent {
    timestamp: number;
    type: 'started' | 'state' | 'tool' | 'ai' | 'paused' | 'completed' | 'failed';
    stateId?: string;
    message?: string;
    durationMs?: number;
    data?: Record<string, unknown>;
}
interface BackendPlaybookStateResult {
    ok?: boolean;
    next?: string;
    prompt?: string;
    stop?: boolean;
    paused?: boolean;
    message?: string;
}
export declare class CyberVinciFlowPlaybookRunner implements FlowPlaybookRunner {
    protected readonly service: CyberVinciAgencyAgentService;
    available(): Promise<boolean>;
    runPlaybook(request: FlowPlaybookRunRequest): Promise<FlowPlaybookRunResult>;
    protected shouldUseFrontendRuntime(playbook: CyberVinciPlaybookDefinition, visited?: any): Promise<boolean>;
    protected runPlaybookFrom(playbook: CyberVinciPlaybookDefinition, context: BackendPlaybookContext, entry: string | undefined): Promise<BackendPlaybookStateResult>;
    protected executeState(playbook: CyberVinciPlaybookDefinition, state: CyberVinciPlaybookState, context: BackendPlaybookContext): Promise<BackendPlaybookStateResult>;
    protected executeToolState(playbook: CyberVinciPlaybookDefinition, state: CyberVinciPlaybookState, context: BackendPlaybookContext, explicitToolId: string | undefined): Promise<BackendPlaybookStateResult>;
    protected executeGuardState(playbook: CyberVinciPlaybookDefinition, state: CyberVinciPlaybookState, context: BackendPlaybookContext): Promise<BackendPlaybookStateResult>;
    protected executeAskState(state: CyberVinciPlaybookState, context: BackendPlaybookContext): BackendPlaybookStateResult;
    protected executeAiState(state: CyberVinciPlaybookState, context: BackendPlaybookContext): BackendPlaybookStateResult;
    protected executeNestedPlaybookState(state: CyberVinciPlaybookState, context: BackendPlaybookContext): Promise<BackendPlaybookStateResult>;
    protected executeParallelState(playbook: CyberVinciPlaybookDefinition, state: CyberVinciPlaybookState, context: BackendPlaybookContext): Promise<BackendPlaybookStateResult>;
    protected executeResponseState(state: CyberVinciPlaybookState, context: BackendPlaybookContext): BackendPlaybookStateResult;
    protected commandToolResult(result: {
        exitCode: number | null;
        stdout: string;
        stderr: string;
    }): CyberVinciHostToolExecutionResult;
    protected captureToolResult(state: CyberVinciPlaybookState, result: CyberVinciHostToolExecutionResult, context: BackendPlaybookContext): void;
    protected resolveNextState(state: CyberVinciPlaybookState, result: BackendPlaybookStateResult, context: BackendPlaybookContext): string | undefined;
    protected resolveConditionState(state: CyberVinciPlaybookState, context: BackendPlaybookContext): string | undefined;
    protected evaluateCondition(condition: CyberVinciPlaybookCondition | string | unknown, context: BackendPlaybookContext): boolean;
    protected resolveAskOptionSelection(state: CyberVinciPlaybookState, context: BackendPlaybookContext): CyberVinciPlaybookAskOption | undefined;
    protected matchAskOption(options: CyberVinciAskOptions, value: unknown): CyberVinciPlaybookAskOption | undefined;
    protected resolveRecord(record: Record<string, unknown>, context: BackendPlaybookContext): Record<string, unknown>;
    protected resolveValue(value: unknown, context: BackendPlaybookContext): unknown;
    protected renderTemplate(template: string, context: BackendPlaybookContext): string;
    protected lookupPath(pathExpression: string, context: BackendPlaybookContext): unknown;
    protected stableValue(value: unknown): string;
    protected fail(context: BackendPlaybookContext, stateId: string, message: string): BackendPlaybookStateResult;
    protected issue(summary: string): {
        severity: string;
        type: string;
        summary: string;
        producer: string;
    };
}
type CyberVinciAskOptions = NonNullable<CyberVinciPlaybookState['options']>;
export {};
