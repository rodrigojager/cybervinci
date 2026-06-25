// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ChatService } from '@theia/ai-chat';
import { AbstractViewContribution, CommonMenus, FrontendApplication, QuickInputService } from '@theia/core/lib/browser';
import { Command, CommandRegistry, MenuModelRegistry, MessageService, nls } from '@theia/core';
import { inject, injectable } from '@theia/core/shared/inversify';
import { CyberVinciChatGoalDialog } from './cybervinci-ai-chat-goal-dialog';
import { CyberVinciChatGoalService, CyberVinciChatGoalState } from './cybervinci-ai-chat-goal-service';
import { CyberVinciChatGoalWidget } from './cybervinci-ai-chat-goal-widget';

const GOAL_CATEGORY = 'CyberVinci Goal';
const GOAL_CATEGORY_KEY = nls.getDefaultKey(GOAL_CATEGORY);

export namespace CyberVinciGoalCommands {
    export const OPEN_VIEW = Command.toLocalizedCommand({
        id: 'cybervinci.goal.openView',
        category: GOAL_CATEGORY,
        label: 'Open Goal',
        iconClass: CyberVinciChatGoalWidget.ICON_CLASS
    }, 'theia/cybervinci/ai-chat/goal/commands/openView', GOAL_CATEGORY_KEY);

    export const VIEW = Command.toLocalizedCommand({
        id: 'cybervinci.goal.view',
        category: GOAL_CATEGORY,
        label: 'View Goal',
        iconClass: CyberVinciChatGoalWidget.ICON_CLASS
    }, 'theia/cybervinci/ai-chat/goal/commands/view', GOAL_CATEGORY_KEY);

    export const SET = Command.toLocalizedCommand({
        id: 'cybervinci.goal.set',
        category: GOAL_CATEGORY,
        label: 'Set Goal',
        iconClass: 'codicon codicon-edit'
    }, 'theia/cybervinci/ai-chat/goal/commands/set', GOAL_CATEGORY_KEY);

    export const PAUSE = Command.toLocalizedCommand({
        id: 'cybervinci.goal.pause',
        category: GOAL_CATEGORY,
        label: 'Pause Goal',
        iconClass: 'codicon codicon-debug-pause'
    }, 'theia/cybervinci/ai-chat/goal/commands/pause', GOAL_CATEGORY_KEY);

    export const RESUME = Command.toLocalizedCommand({
        id: 'cybervinci.goal.resume',
        category: GOAL_CATEGORY,
        label: 'Resume Goal',
        iconClass: 'codicon codicon-debug-start'
    }, 'theia/cybervinci/ai-chat/goal/commands/resume', GOAL_CATEGORY_KEY);

    export const CLEAR = Command.toLocalizedCommand({
        id: 'cybervinci.goal.clear',
        category: GOAL_CATEGORY,
        label: 'Clear Goal',
        iconClass: 'codicon codicon-close'
    }, 'theia/cybervinci/ai-chat/goal/commands/clear', GOAL_CATEGORY_KEY);

    export const STATUS = Command.toLocalizedCommand({
        id: 'cybervinci.goal.status',
        category: GOAL_CATEGORY,
        label: 'Goal Status',
        iconClass: CyberVinciChatGoalWidget.ICON_CLASS
    }, 'theia/cybervinci/ai-chat/goal/commands/status', GOAL_CATEGORY_KEY);

    export const BUDGET = Command.toLocalizedCommand({
        id: 'cybervinci.goal.budget',
        category: GOAL_CATEGORY,
        label: 'Set Goal Budget',
        iconClass: 'codicon codicon-dashboard'
    }, 'theia/cybervinci/ai-chat/goal/commands/budget', GOAL_CATEGORY_KEY);
}

@injectable()
export class CyberVinciChatGoalContribution extends AbstractViewContribution<CyberVinciChatGoalWidget> {

    @inject(ChatService)
    protected readonly chatService: ChatService;

    @inject(CyberVinciChatGoalService)
    protected readonly goalService: CyberVinciChatGoalService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(QuickInputService)
    protected readonly quickInputService: QuickInputService;

    constructor() {
        super({
            widgetId: CyberVinciChatGoalWidget.ID,
            widgetName: CyberVinciChatGoalWidget.LABEL,
            defaultWidgetOptions: {
                area: 'right',
                rank: 160
            },
            toggleCommandId: CyberVinciGoalCommands.OPEN_VIEW.id
        });
    }

    async initializeLayout(_app: FrontendApplication): Promise<void> {
        return undefined;
    }

    override registerCommands(commands: CommandRegistry): void {
        super.registerCommands(commands);
        commands.registerCommand(CyberVinciGoalCommands.VIEW, {
            execute: () => this.openGoalView()
        });
        commands.registerCommand(CyberVinciGoalCommands.SET, {
            execute: () => this.setGoal()
        });
        commands.registerCommand(CyberVinciGoalCommands.PAUSE, {
            execute: () => this.updateGoalStatus('paused'),
            isEnabled: () => this.hasGoalWithStatus('active')
        });
        commands.registerCommand(CyberVinciGoalCommands.RESUME, {
            execute: () => this.updateGoalStatus('active'),
            isEnabled: () => this.hasGoalWithStatus('paused', 'blocked', 'budget_limited', 'usage_limited')
        });
        commands.registerCommand(CyberVinciGoalCommands.CLEAR, {
            execute: () => this.clearGoal(),
            isEnabled: () => !!this.getCurrentGoal()
        });
        commands.registerCommand(CyberVinciGoalCommands.STATUS, {
            execute: () => this.showStatus()
        });
        commands.registerCommand(CyberVinciGoalCommands.BUDGET, {
            execute: () => this.setBudget(),
            isEnabled: () => !!this.getCurrentGoal()
        });
    }

    override registerMenus(menus: MenuModelRegistry): void {
        super.registerMenus(menus);
        menus.registerMenuAction(CommonMenus.VIEW_VIEWS, {
            commandId: CyberVinciGoalCommands.OPEN_VIEW.id,
            label: CyberVinciChatGoalWidget.LABEL
        });
    }

    get defaultIconClass(): string {
        return CyberVinciChatGoalWidget.ICON_CLASS;
    }

    protected async openGoalView(): Promise<CyberVinciChatGoalWidget> {
        const widget = await this.openView({ activate: true });
        await widget.refresh();
        return widget;
    }

    protected async setGoal(): Promise<void> {
        const session = this.chatService.getActiveSession();
        if (!session) {
            this.messageService.warn(nls.localize('theia/cybervinci/ai-chat/goal/noActiveChat', 'No active chat session.'));
            return;
        }
        await this.goalService.ensureLoaded(session.model);
        const current = this.goalService.getGoal(session.model);
        const value = await new CyberVinciChatGoalDialog({
            title: current
                ? nls.localize('theia/cybervinci/ai-chat/goal/editDialogTitle', 'Edit Virtual Goal')
                : nls.localize('theia/cybervinci/ai-chat/goal/setDialogTitle', 'Set Virtual Goal'),
            initialValue: current?.objective,
            acceptLabel: nls.localizeByDefault('Save')
        }).open();
        if (!value) {
            return;
        }
        await this.goalService.setVirtualGoal(session.model, value, { preserveProgress: !!current, maxRounds: current?.maxRounds });
        await this.openGoalView();
    }

    protected async updateGoalStatus(status: 'active' | 'paused'): Promise<void> {
        const session = this.chatService.getActiveSession();
        if (!session) {
            this.messageService.warn(nls.localize('theia/cybervinci/ai-chat/goal/noActiveChat', 'No active chat session.'));
            return;
        }
        const goal = await this.getCurrentGoalLoaded();
        if (!goal) {
            this.messageService.warn(nls.localize('theia/cybervinci/ai-chat/goal/noGoal', 'No virtual goal'));
            return;
        }
        await this.goalService.updateStatus(session.model, status);
        await this.refreshWidgetIfOpen();
    }

    protected async clearGoal(): Promise<void> {
        const session = this.chatService.getActiveSession();
        if (!session) {
            this.messageService.warn(nls.localize('theia/cybervinci/ai-chat/goal/noActiveChat', 'No active chat session.'));
            return;
        }
        await this.goalService.clearGoal(session.model);
        await this.refreshWidgetIfOpen();
    }

    protected async showStatus(): Promise<void> {
        const goal = await this.getCurrentGoalLoaded();
        if (!goal) {
            this.messageService.info(nls.localize('theia/cybervinci/ai-chat/goal/noGoalLong', 'No Virtual Goal exists for the active chat.'));
            return;
        }
        const budget = goal.tokenBudget ? `${goal.tokensUsed}/${goal.tokenBudget} tokens` : `${goal.tokensUsed} tokens`;
        this.messageService.info(`Virtual Goal ${goal.status}: ${goal.objective} (${goal.rounds} rounds, ${budget}).`);
        await this.openGoalView();
    }

    protected async setBudget(): Promise<void> {
        const session = this.chatService.getActiveSession();
        if (!session) {
            this.messageService.warn(nls.localize('theia/cybervinci/ai-chat/goal/noActiveChat', 'No active chat session.'));
            return;
        }
        const goal = await this.getCurrentGoalLoaded();
        if (!goal) {
            this.messageService.warn(nls.localize('theia/cybervinci/ai-chat/goal/noGoal', 'No virtual goal'));
            return;
        }
        const value = await this.quickInputService.input({
            placeHolder: nls.localize('theia/cybervinci/ai-chat/goal/budgetPlaceholder', 'Token budget. Leave empty for unlimited.'),
            value: goal.tokenBudget ? String(goal.tokenBudget) : ''
        });
        if (value === undefined) {
            return;
        }
        const trimmed = value.trim();
        const budget = trimmed ? Number(trimmed) : undefined;
        if (budget !== undefined && (!Number.isFinite(budget) || budget <= 0)) {
            this.messageService.warn(nls.localize('theia/cybervinci/ai-chat/goal/invalidBudget', 'Goal budget must be a positive number.'));
            return;
        }
        await this.goalService.setTokenBudget(session.model, budget);
        await this.refreshWidgetIfOpen();
    }

    protected hasGoalWithStatus(...statuses: CyberVinciChatGoalState['status'][]): boolean {
        const goal = this.getCurrentGoal();
        return !!goal && statuses.includes(goal.status);
    }

    protected getCurrentGoal(): CyberVinciChatGoalState | undefined {
        return this.goalService.getGoal(this.chatService.getActiveSession()?.model);
    }

    protected async getCurrentGoalLoaded(): Promise<CyberVinciChatGoalState | undefined> {
        const session = this.chatService.getActiveSession();
        await this.goalService.ensureLoaded(session?.model);
        return this.goalService.getGoal(session?.model);
    }

    protected async refreshWidgetIfOpen(): Promise<void> {
        await this.tryGetWidget()?.refresh();
    }
}
