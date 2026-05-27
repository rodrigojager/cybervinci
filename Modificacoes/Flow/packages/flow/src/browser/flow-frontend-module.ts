import { FrontendApplicationContribution, RemoteConnectionProvider, ServiceConnectionProvider, WidgetFactory, bindViewContribution } from '@theia/core/lib/browser';
import { ContainerModule } from '@theia/core/shared/inversify';
import { FLOW_SERVICE_PATH, FlowClient, FlowService } from '../common';
import { FlowClientImpl } from './flow-client';
import { FlowContribution } from './flow-contribution';
import { FlowWidget } from './flow-widget';
import '../../src/browser/style/index.css';

export default new ContainerModule(bind => {
    bind(FlowClientImpl).toSelf().inSingletonScope();
    bind(FlowClient).toService(FlowClientImpl);
    bind(FlowService).toDynamicValue(ctx => {
        const provider = ctx.container.get<ServiceConnectionProvider>(RemoteConnectionProvider);
        const client = ctx.container.get<FlowClient>(FlowClient);
        return provider.createProxy<FlowService>(FLOW_SERVICE_PATH, client);
    }).inSingletonScope();

    bindViewContribution(bind, FlowContribution);
    bind(FrontendApplicationContribution).toService(FlowContribution);

    bind(FlowWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: FlowWidget.ID,
        createWidget: () => ctx.container.get(FlowWidget)
    })).inSingletonScope();
});
