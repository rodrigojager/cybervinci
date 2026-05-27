// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry, nls } from '@theia/core/lib/common';
import { inject, injectable } from '@theia/core/shared/inversify';
import {
    CYBERVINCI_MENU_ITEMS,
    CyberVinciCommandIds,
    CYBERVINCI_PRODUCT_NAME,
    CyberVinciMenus
} from '../common/branding';

@injectable()
export class BrandingContribution implements CommandContribution, MenuContribution {

    protected static readonly OPEN_CHAT_MENU_COMMAND = 'cybervinci.open-chat';

    @inject(CommandRegistry)
    protected readonly commands: CommandRegistry;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand({
            id: BrandingContribution.OPEN_CHAT_MENU_COMMAND,
            label: nls.localize('theia/cybervinci/aiChat/open', 'Open CyberVinci Chat'),
            iconClass: CYBERVINCI_MENU_ITEMS.AI_CHAT.iconClass
        }, {
            execute: () => this.commands.executeCommand(CyberVinciCommandIds.OPEN_CHAT)
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerSubmenu(CyberVinciMenus.CYBERVINCI, CYBERVINCI_PRODUCT_NAME, {
            sortString: '0'
        });
        menus.registerSubmenu(CyberVinciMenus.AI_CHAT, nls.localize('theia/cybervinci/aiChat/menu', CYBERVINCI_MENU_ITEMS.AI_CHAT.label), {
            sortString: '1',
            icon: CYBERVINCI_MENU_ITEMS.AI_CHAT.iconClass
        });
        menus.registerMenuAction(CyberVinciMenus.AI_CHAT, {
            commandId: BrandingContribution.OPEN_CHAT_MENU_COMMAND,
            label: nls.localize('theia/cybervinci/aiChat/open', 'Open CyberVinci Chat'),
            order: '0'
        });
    }
}
