// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { CyberVinciAiRuntimeService } from '@cybervinci/ai-runtime/lib/common';
import { FlowService } from '@cybervinci/flow/lib/common';
import { FrontendApplicationContribution, HoverService } from '@theia/core/lib/browser';
import { CommandService } from '@theia/core';
import { PreferenceService } from '@theia/core/lib/common/preferences';
import { DisposableCollection } from '@theia/core/lib/common/disposable';
import { inject, injectable, optional } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { createRoot, Root } from '@theia/core/shared/react-dom/client';
import { CyberVinciAiChatExperienceService } from '../common';
import { CyberVinciChatExperienceControls } from './cybervinci-chat-input-options-contribution';
import { CYBERVINCI_AI_CHAT_FLOW_MODE_PREF } from './cybervinci-ai-chat-experience-preferences';
import { CyberVinciFlowChatMode, normalizeCyberVinciFlowChatMode } from './cybervinci-chat-ai-execution-controls';
import { CyberVinciChatGoalService } from './cybervinci-ai-chat-goal-service';

@injectable()
export class CyberVinciChatDomControlsContribution implements FrontendApplicationContribution {

    @inject(CyberVinciAiChatExperienceService)
    protected readonly experienceService: CyberVinciAiChatExperienceService;

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    @inject(CommandService)
    protected readonly commandService: CommandService;

    @inject(HoverService)
    protected readonly hoverService: HoverService;

    @inject(FlowService) @optional()
    protected readonly flowService: FlowService | undefined;

    @inject(CyberVinciAiRuntimeService) @optional()
    protected readonly aiRuntimeService: CyberVinciAiRuntimeService | undefined;

    @inject(CyberVinciChatGoalService)
    protected readonly goalService: CyberVinciChatGoalService;

    protected readonly toDispose = new DisposableCollection();
    protected observer: MutationObserver | undefined;
    protected renderScheduled = false;
    protected readonly roots = new WeakMap<HTMLElement, Root>();
    protected readonly lastFlowModes = new WeakMap<HTMLElement, CyberVinciFlowChatMode>();

    onStart(): void {
        // The React contribution hook is the authoritative integration path.
        // Keep this legacy fallback inert so a stale binding cannot duplicate the toolbar.
    }

    onStop(): void {
        this.toDispose.dispose();
    }

    protected renderControls(): void {
        const leftBars = Array.from(document.querySelectorAll<HTMLElement>('.chat-input-widget .theia-ChatInputOptions-left'));
        for (const leftBar of leftBars) {
            let mount = leftBar.querySelector<HTMLElement>(':scope > .cybervinci-chat-experience-controls');
            if (mount && !this.roots.has(mount)) {
                continue;
            }
            if (!mount) {
                mount = document.createElement('span');
                mount.className = 'cybervinci-chat-experience-controls';
                leftBar.insertBefore(mount, leftBar.firstChild);
            }
            const flowMode = this.readFlowMode();
            if (this.lastFlowModes.get(mount) === flowMode && mount.childElementCount > 0) {
                continue;
            }
            this.lastFlowModes.set(mount, flowMode);
            const root = this.roots.get(mount) ?? createRoot(mount);
            this.roots.set(mount, root);
            root.render(
                <CyberVinciChatExperienceControls
                    service={this.experienceService}
                    aiRuntimeService={this.aiRuntimeService}
                    flowService={this.flowService}
                    preferenceService={this.preferenceService}
                    commandService={this.commandService}
                    goalService={this.goalService}
                    flowMode={flowMode}
                    hoverService={this.hoverService}
                />
            );
        }
    }

    protected scheduleRenderControls(): void {
        if (this.renderScheduled) {
            return;
        }
        this.renderScheduled = true;
        window.requestAnimationFrame(() => {
            this.renderScheduled = false;
            this.renderControls();
        });
    }

    protected readFlowMode(): CyberVinciFlowChatMode {
        return normalizeCyberVinciFlowChatMode(this.preferenceService.get(CYBERVINCI_AI_CHAT_FLOW_MODE_PREF, 'chat'));
    }
}
