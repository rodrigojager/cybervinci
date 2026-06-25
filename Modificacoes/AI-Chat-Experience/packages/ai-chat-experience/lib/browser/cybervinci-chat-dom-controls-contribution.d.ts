import { CyberVinciAiRuntimeService } from '@cybervinci/ai-runtime/lib/common';
import { FlowService } from '@cybervinci/flow/lib/common';
import { FrontendApplicationContribution, HoverService } from '@theia/core/lib/browser';
import { CommandService } from '@theia/core';
import { PreferenceService } from '@theia/core/lib/common/preferences';
import { DisposableCollection } from '@theia/core/lib/common/disposable';
import { Root } from '@theia/core/shared/react-dom/client';
import { CyberVinciAiChatExperienceService } from '../common';
import { CyberVinciFlowChatMode } from './cybervinci-chat-ai-execution-controls';
export declare class CyberVinciChatDomControlsContribution implements FrontendApplicationContribution {
    protected readonly experienceService: CyberVinciAiChatExperienceService;
    protected readonly preferenceService: PreferenceService;
    protected readonly commandService: CommandService;
    protected readonly hoverService: HoverService;
    protected readonly flowService: FlowService | undefined;
    protected readonly aiRuntimeService: CyberVinciAiRuntimeService | undefined;
    protected readonly toDispose: DisposableCollection;
    protected observer: MutationObserver | undefined;
    protected renderScheduled: boolean;
    protected readonly roots: WeakMap<HTMLElement, Root>;
    protected readonly lastFlowModes: WeakMap<HTMLElement, CyberVinciFlowChatMode>;
    onStart(): void;
    onStop(): void;
    protected renderControls(): void;
    protected scheduleRenderControls(): void;
    protected readFlowMode(): CyberVinciFlowChatMode;
}
//# sourceMappingURL=cybervinci-chat-dom-controls-contribution.d.ts.map