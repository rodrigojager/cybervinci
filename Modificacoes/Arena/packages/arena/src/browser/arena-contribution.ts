import { AbstractViewContribution, CommonMenus, FrontendApplication } from '@theia/core/lib/browser';
import { Command, CommandRegistry, MenuModelRegistry, nls } from '@theia/core/lib/common';
import { CYBERVINCI_MENU_ITEMS, CyberVinciMenus } from '@cybervinci/branding/lib/common';
import { injectable } from '@theia/core/shared/inversify';
import { ArenaWidget } from './arena-widget';

export namespace ArenaCommands {
    export const NEW_DUEL: Command = {
        id: 'arena.newDuel',
        label: nls.localize('theia/arena/newDuel', 'Arena: New A/B Test'),
        iconClass: CYBERVINCI_MENU_ITEMS.ARENA.iconClass
    };
    export namespace Legacy {
        export const NEW_DUEL: Command = { id: 'promptArena.newDuel' };
    }
}

@injectable()
export class ArenaContribution extends AbstractViewContribution<ArenaWidget> {

    constructor() {
        super({
            widgetId: ArenaWidget.ID,
            widgetName: ArenaWidget.LABEL,
            defaultWidgetOptions: {
                area: 'main',
                rank: 400
            },
            toggleCommandId: 'arena.toggle'
        });
    }

    async initializeLayout(_app: FrontendApplication): Promise<void> {
        return undefined;
    }

    override registerCommands(commands: CommandRegistry): void {
        super.registerCommands(commands);
        commands.registerCommand(ArenaCommands.NEW_DUEL, {
            execute: () => this.openView({ activate: true })
        });
        commands.registerCommand(ArenaCommands.Legacy.NEW_DUEL, {
            execute: () => commands.executeCommand(ArenaCommands.NEW_DUEL.id)
        });
    }

    override registerMenus(menus: MenuModelRegistry): void {
        super.registerMenus(menus);
        menus.registerSubmenu(CyberVinciMenus.ARENA, nls.localize('theia/arena/cyberVinci/menu', CYBERVINCI_MENU_ITEMS.ARENA.label), {
            sortString: '5',
            icon: CYBERVINCI_MENU_ITEMS.ARENA.iconClass
        });
        menus.registerMenuAction(CyberVinciMenus.ARENA, {
            commandId: ArenaCommands.NEW_DUEL.id,
            label: nls.localize('theia/arena/cyberVinci/newDuel', 'New A/B Test'),
            order: '0'
        });
        menus.registerMenuAction(CommonMenus.VIEW_VIEWS, {
            commandId: ArenaCommands.NEW_DUEL.id,
            label: nls.localize('theia/arena/menuNewDuel', 'Arena')
        });
    }
}
