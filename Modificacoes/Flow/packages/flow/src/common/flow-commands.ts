import { Command } from '@theia/core/lib/common';
import { CYBERVINCI_MENU_ITEMS, CyberVinciCommandIds, CyberVinciMenus } from '@cybervinci/branding/lib/common';

export namespace FlowCommands {
    export const OPEN: Command = {
        id: CyberVinciCommandIds.FLOW_OPEN,
        label: 'Flow: Open',
        iconClass: CYBERVINCI_MENU_ITEMS.FLOW.iconClass
    };
    export namespace Legacy {
        export const OPEN: Command = { id: 'agency-studio.open' };
    }
}

export namespace FlowMenus {
    export const CYBERVINCI = CyberVinciMenus.CYBERVINCI;
    export const FLOW = CyberVinciMenus.FLOW;
}
