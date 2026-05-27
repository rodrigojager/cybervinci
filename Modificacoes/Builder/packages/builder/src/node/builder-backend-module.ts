import { ConnectionHandler, RpcConnectionHandler } from '@theia/core/lib/common';
import { ContainerModule } from '@theia/core/shared/inversify';
import { BUILDER_SERVICE_PATH, BuilderService } from '../common';
import { BuilderServiceImpl } from './builder-service';

export default new ContainerModule(bind => {
    bind(BuilderServiceImpl).toSelf().inSingletonScope();
    bind(BuilderService).toService(BuilderServiceImpl);
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler(BUILDER_SERVICE_PATH, () =>
            ctx.container.get<BuilderService>(BuilderService)
        )
    ).inSingletonScope();
});
