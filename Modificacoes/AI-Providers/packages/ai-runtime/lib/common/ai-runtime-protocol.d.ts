import { JsonRpcServer } from '@theia/core';
import { CyberVinciAiExecutionSelection, CyberVinciAiProviderDescriptor, CyberVinciAiProviderListRequest, CyberVinciAiTaskRequest, CyberVinciAiTaskResult } from './ai-runtime-types';
export declare const CYBERVINCI_AI_RUNTIME_SERVICE_PATH = "/services/cybervinci-ai-runtime";
export declare const CyberVinciAiRuntimeClient: unique symbol;
export interface CyberVinciAiRuntimeClient {
}
export declare const CyberVinciAiRuntimeService: unique symbol;
export interface CyberVinciAiRuntimeService extends JsonRpcServer<CyberVinciAiRuntimeClient> {
    listProviders(request?: CyberVinciAiProviderListRequest): Promise<CyberVinciAiProviderDescriptor[]>;
    getDefaultExecution(request?: CyberVinciAiProviderListRequest): Promise<CyberVinciAiExecutionSelection>;
    runTask<TInput = unknown, TStructured = unknown>(request: CyberVinciAiTaskRequest<TInput>): Promise<CyberVinciAiTaskResult<TStructured>>;
}
//# sourceMappingURL=ai-runtime-protocol.d.ts.map