import { FrontendApplicationContribution, RemoteConnectionProvider, ServiceConnectionProvider, WidgetFactory, bindViewContribution } from '@theia/core/lib/browser';
import { ContainerModule } from '@theia/core/shared/inversify';
import { ARENA_SERVICE_PATH, ArenaService } from '../common';
import { ArenaContribution } from './arena-contribution';
import { ArenaWidget } from './arena-widget';
import '../../src/browser/style/index.css';

export default new ContainerModule(bind => {
    bind(ArenaService).toDynamicValue(ctx => {
        const provider = ctx.container.get<ServiceConnectionProvider>(RemoteConnectionProvider);
        return provider.createProxy<ArenaService>(ARENA_SERVICE_PATH);
    }).inSingletonScope();

    bindViewContribution(bind, ArenaContribution);
    bind(FrontendApplicationContribution).toService(ArenaContribution);

    bind(ArenaWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: ArenaWidget.ID,
        createWidget: () => ctx.container.get(ArenaWidget)
    })).inSingletonScope();
});
