import { CyberVinciAiExecutionSelection, CyberVinciAiRuntimeService, CyberVinciAiVirtualReasoningMode } from '@cybervinci/ai-runtime/lib/common';
import { HoverService } from '@theia/core/lib/browser';
import { CommandService } from '@theia/core';
import { PreferenceService } from '@theia/core/lib/common/preferences';
import * as React from '@theia/core/shared/react';
export type CyberVinciChatMode = 'chat' | 'edit' | 'plan' | 'readonly' | 'workspace' | 'fullaccess' | 'agent-next';
export type CyberVinciFlowChatMode = 'chat' | 'saved' | 'dynamic';
export declare const CyberVinciChatModeSelector: React.FunctionComponent<{
    preferenceService: PreferenceService;
    disabled?: boolean;
    hoverService: HoverService;
}>;
export declare const CyberVinciChatWorkflowRoutingSelector: React.FunctionComponent<{
    preferenceService: PreferenceService;
    currentMode: CyberVinciFlowChatMode;
    disabled?: boolean;
    hoverService: HoverService;
    onModeChange?: (mode: CyberVinciFlowChatMode) => void;
}>;
export declare const CyberVinciChatVirtualReasoningSelector: React.FunctionComponent<{
    preferenceService: PreferenceService;
    disabled?: boolean;
    hoverService: HoverService;
}>;
export declare const CyberVinciChatAiExecutionControls: React.FunctionComponent<{
    aiRuntimeService?: CyberVinciAiRuntimeService;
    preferenceService: PreferenceService;
    commandService: CommandService;
    flowMode: CyberVinciFlowChatMode;
    disabled?: boolean;
    hoverService: HoverService;
}>;
export declare function readChatAiExecutionFromPreferences(preferenceService: PreferenceService): CyberVinciAiExecutionSelection;
export declare function normalizeCyberVinciFlowChatMode(value: unknown): CyberVinciFlowChatMode;
export declare function normalizeCyberVinciChatMode(value: unknown): CyberVinciChatMode;
export declare function cyberVinciChatModeToRequestModeId(value: unknown): string | undefined;
export declare function normalizeVirtualReasoningMode(value: unknown): CyberVinciAiVirtualReasoningMode;
export declare function hoverHandler(hoverService: HoverService, content: string, position?: 'top' | 'bottom' | 'left' | 'right'): (event: React.MouseEvent) => void;
export declare function positionCyberVinciChatMenu(rect: DOMRect, menuWidth: number, preferredMaxHeight: number): React.CSSProperties;
//# sourceMappingURL=cybervinci-chat-ai-execution-controls.d.ts.map