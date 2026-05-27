import { AbstractViewContribution, CommonMenus, FrontendApplication } from '@theia/core/lib/browser';
import { CommandRegistry, MenuModelRegistry, nls } from '@theia/core/lib/common';
import { CYBERVINCI_MENU_ITEMS } from '@cybervinci/branding/lib/common';
import { injectable } from '@theia/core/shared/inversify';
import { FlowCommands, FlowMenus } from '../common';
import { FlowWidget } from './flow-widget';

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
        menus.registerMenuAction(CommonMenus.VIEW_VIEWS, {
            commandId: FlowCommands.OPEN.id,
            label: nls.localize('theia/flow/view/open', 'Flow')
        });
    }

    get defaultIconClass(): string {
        return CYBERVINCI_MENU_ITEMS.FLOW.iconClass;
    }
}
