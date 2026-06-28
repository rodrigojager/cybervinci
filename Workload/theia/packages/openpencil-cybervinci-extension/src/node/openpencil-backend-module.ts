import { ContainerModule } from '@theia/core/shared/inversify';
import { ConnectionHandler, RpcConnectionHandler } from '@theia/core/lib/common';
import { OPENPENCIL_BACKEND_PATH, OpenPencilBackendService } from '../common/openpencil-protocol';
import { OpenPencilBackendServiceImpl } from './openpencil-backend-service';

export default new ContainerModule(bind => {
    bind(OpenPencilBackendServiceImpl).toSelf().inSingletonScope();
    bind(OpenPencilBackendService).toService(OpenPencilBackendServiceImpl);
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler(OPENPENCIL_BACKEND_PATH, () => ctx.container.get(OpenPencilBackendService))
    ).inSingletonScope();
});
