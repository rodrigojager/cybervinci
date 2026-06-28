import { ConnectionHandler, RpcConnectionHandler } from '@theia/core/lib/common';
import { ContainerModule } from '@theia/core/shared/inversify';
import { DebugAdapterContribution } from '@theia/debug/lib/common/debug-model';
import { CSHARP_KIT_SERVICE_PATH, CSharpKitService } from '../common';
import { CSharpClrDebugAdapterContribution, CSharpCoreClrDebugAdapterContribution } from './csharp-coreclr-debug-adapter-contribution';
import { CSharpKitServiceImpl } from './csharp-kit-service';

export default new ContainerModule(bind => {
    bind(CSharpKitServiceImpl).toSelf().inSingletonScope();
    bind(CSharpKitService).toService(CSharpKitServiceImpl);
    bind(CSharpCoreClrDebugAdapterContribution).toSelf().inSingletonScope();
    bind(DebugAdapterContribution).toService(CSharpCoreClrDebugAdapterContribution);
    bind(CSharpClrDebugAdapterContribution).toSelf().inSingletonScope();
    bind(DebugAdapterContribution).toService(CSharpClrDebugAdapterContribution);
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler(CSHARP_KIT_SERVICE_PATH, () =>
            ctx.container.get<CSharpKitService>(CSharpKitService)
        )
    ).inSingletonScope();
});
