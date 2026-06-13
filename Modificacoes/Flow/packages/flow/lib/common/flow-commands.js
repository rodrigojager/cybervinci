"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlowMenus = exports.FlowCommands = void 0;
var common_1 = require("@cybervinci/branding/lib/common");
var FlowCommands;
(function (FlowCommands) {
    FlowCommands.OPEN = {
        id: common_1.CyberVinciCommandIds.FLOW_OPEN,
        label: 'Flow: Open',
        iconClass: common_1.CYBERVINCI_MENU_ITEMS.FLOW.iconClass
    };
    FlowCommands.START_WORKFLOW = {
        id: 'cybervinci.flow.startWorkflow',
        label: 'Flow: Start Workflow',
        iconClass: common_1.CYBERVINCI_MENU_ITEMS.FLOW.iconClass
    };
    FlowCommands.RUN_DYNAMIC_WORKFLOW = {
        id: 'cybervinci.flow.runDynamicWorkflow',
        label: 'Flow: Run Dynamic Workflow',
        iconClass: common_1.CYBERVINCI_MENU_ITEMS.FLOW.iconClass
    };
    var Legacy;
    (function (Legacy) {
        Legacy.OPEN = { id: 'agency-studio.open' };
    })(Legacy = FlowCommands.Legacy || (FlowCommands.Legacy = {}));
})(FlowCommands || (exports.FlowCommands = FlowCommands = {}));
var FlowMenus;
(function (FlowMenus) {
    FlowMenus.CYBERVINCI = common_1.CyberVinciMenus.CYBERVINCI;
    FlowMenus.FLOW = common_1.CyberVinciMenus.FLOW;
})(FlowMenus || (exports.FlowMenus = FlowMenus = {}));
