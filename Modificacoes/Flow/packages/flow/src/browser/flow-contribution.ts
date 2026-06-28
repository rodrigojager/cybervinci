import { AbstractViewContribution, CommonMenus, FrontendApplication } from '@theia/core/lib/browser';
import { CommandRegistry, MenuModelRegistry, nls } from '@theia/core/lib/common';
import { CYBERVINCI_MENU_ITEMS } from '@cybervinci/branding/lib/common';
import { injectable } from '@theia/core/shared/inversify';
import { FlowCommands, FlowMenus } from '../common';
import { FlowExternalRunOptions, FlowWidget } from './flow-widget';

@injectable()
export class FlowContribution extends AbstractViewContribution<FlowWidget> {

    constructor() {
        super({
            widgetId: FlowWidget.ID,
            widgetName: FlowWidget.LABEL,
            defaultWidgetOptions: {
                area: 'main',
                rank: 420
            },
            toggleCommandId: 'flow.toggle'
        });
    }

    async initializeLayout(_app: FrontendApplication): Promise<void> {
        return undefined;
    }

    override registerCommands(commands: CommandRegistry): void {
        super.registerCommands(commands);
        commands.registerCommand(FlowCommands.OPEN, {
            execute: () => this.openView({ activate: true })
        });
        commands.registerCommand(FlowCommands.START_WORKFLOW, {
            execute: async (options?: unknown) => {
                const widget = await this.openView({ activate: true });
                await widget.runWorkflowFromExternalPrompt(normalizeFlowCommandOptions(options));
            }
        });
        commands.registerCommand(FlowCommands.RUN_DYNAMIC_WORKFLOW, {
            execute: async (options?: unknown) => {
                const widget = await this.openView({ activate: true });
                await widget.runDynamicWorkflowFromExternalPrompt(normalizeFlowCommandOptions(options));
            }
        });
        commands.registerCommand(FlowCommands.Legacy.OPEN, {
            execute: () => commands.executeCommand(FlowCommands.OPEN.id)
        });
    }

    override registerMenus(menus: MenuModelRegistry): void {
        super.registerMenus(menus);
        menus.registerSubmenu(FlowMenus.FLOW, nls.localize('theia/flow/cyberVinci/menu', CYBERVINCI_MENU_ITEMS.FLOW.label), {
            sortString: '6',
            icon: CYBERVINCI_MENU_ITEMS.FLOW.iconClass
        });
        menus.registerMenuAction(FlowMenus.FLOW, {
            commandId: FlowCommands.OPEN.id,
            label: nls.localize('theia/flow/cyberVinci/open', 'Open Flow'),
            order: '0'
        });
        menus.registerMenuAction(FlowMenus.FLOW, {
            commandId: FlowCommands.START_WORKFLOW.id,
            label: nls.localize('theia/flow/cyberVinci/startWorkflow', 'Start selected workflow'),
            order: '1'
        });
        menus.registerMenuAction(FlowMenus.FLOW, {
            commandId: FlowCommands.RUN_DYNAMIC_WORKFLOW.id,
            label: nls.localize('theia/flow/cyberVinci/runDynamicWorkflow', 'Run dynamic workflow'),
            order: '2'
        });
        menus.registerMenuAction(CommonMenus.VIEW_VIEWS, {
            commandId: FlowCommands.OPEN.id,
            label: nls.localize('theia/flow/view/open', 'Flow')
        });
    }

    get defaultIconClass(): string {
        return CYBERVINCI_MENU_ITEMS.FLOW.iconClass;
    }
}

function normalizeFlowCommandOptions(options: unknown): FlowExternalRunOptions {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
        return {};
    }
    const record = options as Record<string, unknown>;
    const normalized: FlowExternalRunOptions = {};
    const prompt = stringOption(record.prompt);
    const message = stringOption(record.message);
    const input = stringOption(record.input);
    const workflowId = stringOption(record.workflowId);
    const workspaceRootUri = stringOption(record.workspaceRootUri);
    if (prompt) {
        normalized.prompt = prompt;
    }
    if (message) {
        normalized.message = message;
    }
    if (input) {
        normalized.input = input;
    }
    if (workflowId) {
        normalized.workflowId = workflowId;
    }
    if (workspaceRootUri) {
        normalized.workspaceRootUri = workspaceRootUri;
    }
    if (typeof record.preferSaved === 'boolean') {
        normalized.preferSaved = record.preferSaved;
    }
    if (isRecord(record.parameters)) {
        normalized.parameters = record.parameters;
    }
    if (isRecord(record.roleOverrides)) {
        normalized.roleOverrides = record.roleOverrides as FlowExternalRunOptions['roleOverrides'];
    }
    if (isRecord(record.authoringDraft)) {
        normalized.authoringDraft = record.authoringDraft as unknown as FlowExternalRunOptions['authoringDraft'];
    } else if (isRecord(record.draft)) {
        normalized.draft = record.draft as unknown as FlowExternalRunOptions['draft'];
    }
    return normalized;
}

function stringOption(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
