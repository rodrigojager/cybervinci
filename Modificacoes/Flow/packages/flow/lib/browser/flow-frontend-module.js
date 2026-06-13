"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var browser_1 = require("@theia/core/lib/browser");
var inversify_1 = require("@theia/core/shared/inversify");
var common_1 = require("../common");
var flow_client_1 = require("./flow-client");
var flow_contribution_1 = require("./flow-contribution");
var flow_widget_1 = require("./flow-widget");
require("../../src/browser/style/index.css");
exports.default = new inversify_1.ContainerModule(function (bind) {
    bind(flow_client_1.FlowClientImpl).toSelf().inSingletonScope();
    bind(common_1.FlowClient).toService(flow_client_1.FlowClientImpl);
    bind(common_1.FlowService).toDynamicValue(function (ctx) {
        var provider = ctx.container.get(browser_1.RemoteConnectionProvider);
        var client = ctx.container.get(common_1.FlowClient);
        return provider.createProxy(common_1.FLOW_SERVICE_PATH, client);
    }).inSingletonScope();
    (0, browser_1.bindViewContribution)(bind, flow_contribution_1.FlowContribution);
    bind(browser_1.FrontendApplicationContribution).toService(flow_contribution_1.FlowContribution);
    bind(flow_widget_1.FlowWidget).toSelf();
    bind(browser_1.WidgetFactory).toDynamicValue(function (ctx) { return ({
        id: flow_widget_1.FlowWidget.ID,
        createWidget: function () { return ctx.container.get(flow_widget_1.FlowWidget); }
    }); }).inSingletonScope();
});
