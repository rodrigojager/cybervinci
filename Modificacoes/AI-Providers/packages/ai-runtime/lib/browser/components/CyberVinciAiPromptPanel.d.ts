import * as React from '@theia/core/shared/react';
import { CyberVinciAiEffectPolicy, CyberVinciAiExecutionSelection, CyberVinciAiOutputContract, CyberVinciAiProviderDescriptor, CyberVinciAiRuntimeService, CyberVinciAiTaskRequest, CyberVinciAiTaskResult } from '../../common';
export interface CyberVinciAiPromptPanelBuildInput {
    prompt: string;
    execution: CyberVinciAiExecutionSelection;
}
export interface CyberVinciAiPromptPanelProps<TStructured = unknown> {
    service: CyberVinciAiRuntimeService;
    title: string;
    surfaceId: string;
    action: string;
    workspacePath?: string;
    defaultPrompt?: string;
    placeholder?: string;
    systemPrompt?: string;
    input?: unknown;
    output?: CyberVinciAiOutputContract;
    effectPolicy?: CyberVinciAiEffectPolicy;
    buildRequest?: (input: CyberVinciAiPromptPanelBuildInput) => CyberVinciAiTaskRequest;
    onConfigureProvider?: (provider: CyberVinciAiProviderDescriptor) => void | Promise<void>;
    onResult: (result: CyberVinciAiTaskResult<TStructured>) => void | Promise<void>;
    onClose?: () => void;
}
export declare const CyberVinciAiPromptPanel: <TStructured>({ service, title, surfaceId, action, workspacePath, defaultPrompt, placeholder, systemPrompt, input, output, effectPolicy, buildRequest, onConfigureProvider, onResult, onClose }: CyberVinciAiPromptPanelProps<TStructured>) => React.ReactElement;
//# sourceMappingURL=CyberVinciAiPromptPanel.d.ts.map