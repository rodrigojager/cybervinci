import { CyberVinciAiRuntimeService } from '@cybervinci/ai-runtime/lib/common';
import { FlowService } from '@cybervinci/flow/lib/common';
import { AIChatInputOptionsContribution } from '@theia/ai-chat-ui/lib/browser/chat-input-widget';
import { HoverService } from '@theia/core/lib/browser';
import { CommandService } from '@theia/core';
import { PreferenceService } from '@theia/core/lib/common/preferences';
import * as React from '@theia/core/shared/react';
import { CyberVinciAiChatExperienceService } from '../common';
import { CyberVinciFlowChatMode } from './cybervinci-chat-ai-execution-controls';
export declare class CyberVinciChatInputOptionsContribution implements AIChatInputOptionsContribution {
    protected readonly experienceService: CyberVinciAiChatExperienceService;
    protected readonly preferenceService: PreferenceService;
    protected readonly commandService: CommandService;
    protected readonly flowService: FlowService | undefined;
    protected readonly aiRuntimeService: CyberVinciAiRuntimeService | undefined;
    render(context: AIChatInputOptionsContribution.Context): React.ReactNode;
    protected getFlowMode(): CyberVinciFlowChatMode;
}
export declare const CyberVinciChatExperienceControls: React.FunctionComponent<{
    service: CyberVinciAiChatExperienceService;
    aiRuntimeService?: CyberVinciAiRuntimeService;
    flowService?: FlowService;
    preferenceService: PreferenceService;
    commandService: CommandService;
    flowMode: CyberVinciFlowChatMode;
    disabled?: boolean;
    hoverService: HoverService;
}>;
//# sourceMappingURL=cybervinci-chat-input-options-contribution.d.ts.map