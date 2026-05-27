import { CommandContribution, MenuContribution } from '@theia/core/lib/common';
import { FrontendApplicationContribution, OpenHandler, WidgetFactory, NavigatableWidgetOptions } from '@theia/core/lib/browser';
import { ContainerModule } from '@theia/core/shared/inversify';
import { RemoteConnectionProvider, ServiceConnectionProvider } from '@theia/core/lib/browser/messaging';
import { BUILDER_SERVICE_PATH, BuilderService } from '../common';
import { BuilderContribution } from './builder-contribution';
import { BuilderWidget, BuilderWidgetOptions } from './builder-widget';
import '@mantine/core/styles.css';
import '../../src/browser/style/index.css';

export default new ContainerModule(bind => {
    bind(BuilderService).toDynamicValue(ctx => {
        const provider = ctx.container.get<ServiceConnectionProvider>(RemoteConnectionProvider);
        return provider.createProxy<BuilderService>(BUILDER_SERVICE_PATH);
    }).inSingletonScope();

    bind(BuilderWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: BuilderWidget.ID,
        createWidget: async (options: NavigatableWidgetOptions) => {
            const child = ctx.container.createChild();
            child.bind(BuilderWidgetOptions).toConstantValue({ uri: options.uri });
            return child.get(BuilderWidget);
        }
    })).inSingletonScope();

    bind(BuilderContribution).toSelf().inSingletonScope();
    bind(OpenHandler).toService(BuilderContribution);
    bind(FrontendApplicationContribution).toService(BuilderContribution);
    bind(CommandContribution).toService(BuilderContribution);
    bind(MenuContribution).toService(BuilderContribution);
});
