import { ConnectionHandler, RpcConnectionHandler } from '@theia/core/lib/common';
import { ContainerModule } from '@theia/core/shared/inversify';
import { FLOW_SERVICE_PATH, LEGACY_FLOW_SERVICE_PATH, FlowClient, FlowService } from '../common';
import { FlowKernelBridge, HybridFlowKernelBridge, SimulatedFlowKernelBridge } from './flow-kernel-bridge';
import { AgentMarkdownStore } from './agent-markdown-store';
import { FlowServiceImpl } from './flow-service';
import { FlowStore } from './flow-store';
import { FlowWorkloadExecutor, ProviderBackedFlowWorkloadExecutor } from './flow-workload-executor';
import { CommandEffectHostAdapter, LocalCommandEffectHostAdapter } from './command-effect-host-adapter';
import { FileEffectHostAdapter, LocalFileEffectHostAdapter } from './file-effect-host-adapter';
import { ImageEffectHostAdapter, LocalImageEffectHostAdapter } from './image-effect-host-adapter';
import { MarkdownWorkloadStore } from './markdown-workload-store';
import { LocalMemoryAdapter, MemoryAdapter } from './memory-adapter';
import { FlowAgentProviderRegistry, FlowAgentProviderResolver } from './flow-agent-provider-registry';

export default new ContainerModule(bind => {
    bind(FlowStore).toSelf().inSingletonScope();
    bind(AgentMarkdownStore).toSelf().inSingletonScope();
    bind(MarkdownWorkloadStore).toSelf().inSingletonScope();
    bind(SimulatedFlowKernelBridge).toSelf().inSingletonScope();
    bind(HybridFlowKernelBridge).toSelf().inSingletonScope();
    bind(FlowAgentProviderRegistry).toSelf().inSingletonScope();
    bind(FlowAgentProviderResolver).toService(FlowAgentProviderRegistry);
    bind(ProviderBackedFlowWorkloadExecutor).toSelf().inSingletonScope();
    bind(FlowWorkloadExecutor).toService(ProviderBackedFlowWorkloadExecutor);
    bind(LocalCommandEffectHostAdapter).toSelf().inSingletonScope();
    bind(CommandEffectHostAdapter).toService(LocalCommandEffectHostAdapter);
    bind(LocalFileEffectHostAdapter).toSelf().inSingletonScope();
    bind(FileEffectHostAdapter).toService(LocalFileEffectHostAdapter);
    bind(LocalImageEffectHostAdapter).toSelf().inSingletonScope();
    bind(ImageEffectHostAdapter).toService(LocalImageEffectHostAdapter);
    bind(FlowKernelBridge).toService(HybridFlowKernelBridge);
    bind(LocalMemoryAdapter).toSelf().inSingletonScope();
    bind(MemoryAdapter).toService(LocalMemoryAdapter);
    bind(FlowServiceImpl).toSelf().inSingletonScope();
    bind(FlowService).toService(FlowServiceImpl);
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler<FlowClient>(FLOW_SERVICE_PATH, client => {
            const server = ctx.container.get<FlowService>(FlowService);
            server.setClient(client);
            return server;
        })
    ).inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler<FlowClient>(LEGACY_FLOW_SERVICE_PATH, client => {
            const server = ctx.container.get<FlowService>(FlowService);
            server.setClient(client);
            return server;
        })
    ).inSingletonScope();
});
