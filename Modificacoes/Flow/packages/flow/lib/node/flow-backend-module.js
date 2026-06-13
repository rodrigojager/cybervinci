"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = require("@theia/core/lib/common");
var inversify_1 = require("@theia/core/shared/inversify");
var common_2 = require("../common");
var flow_kernel_bridge_1 = require("./flow-kernel-bridge");
var agent_markdown_store_1 = require("./agent-markdown-store");
var flow_service_1 = require("./flow-service");
var flow_store_1 = require("./flow-store");
var flow_workload_executor_1 = require("./flow-workload-executor");
var command_effect_host_adapter_1 = require("./command-effect-host-adapter");
var file_effect_host_adapter_1 = require("./file-effect-host-adapter");
var image_effect_host_adapter_1 = require("./image-effect-host-adapter");
var markdown_workload_store_1 = require("./markdown-workload-store");
var memory_adapter_1 = require("./memory-adapter");
var flow_agent_provider_registry_1 = require("./flow-agent-provider-registry");
exports.default = new inversify_1.ContainerModule(function (bind) {
    bind(flow_store_1.FlowStore).toSelf().inSingletonScope();
    bind(agent_markdown_store_1.AgentMarkdownStore).toSelf().inSingletonScope();
    bind(markdown_workload_store_1.MarkdownWorkloadStore).toSelf().inSingletonScope();
    bind(flow_kernel_bridge_1.SimulatedFlowKernelBridge).toSelf().inSingletonScope();
    bind(flow_kernel_bridge_1.HybridFlowKernelBridge).toSelf().inSingletonScope();
    bind(flow_agent_provider_registry_1.FlowAgentProviderRegistry).toSelf().inSingletonScope();
    bind(flow_agent_provider_registry_1.FlowAgentProviderResolver).toService(flow_agent_provider_registry_1.FlowAgentProviderRegistry);
    bind(flow_workload_executor_1.ProviderBackedFlowWorkloadExecutor).toSelf().inSingletonScope();
    bind(flow_workload_executor_1.FlowWorkloadExecutor).toService(flow_workload_executor_1.ProviderBackedFlowWorkloadExecutor);
    bind(command_effect_host_adapter_1.LocalCommandEffectHostAdapter).toSelf().inSingletonScope();
    bind(command_effect_host_adapter_1.CommandEffectHostAdapter).toService(command_effect_host_adapter_1.LocalCommandEffectHostAdapter);
    bind(file_effect_host_adapter_1.LocalFileEffectHostAdapter).toSelf().inSingletonScope();
    bind(file_effect_host_adapter_1.FileEffectHostAdapter).toService(file_effect_host_adapter_1.LocalFileEffectHostAdapter);
    bind(image_effect_host_adapter_1.LocalImageEffectHostAdapter).toSelf().inSingletonScope();
    bind(image_effect_host_adapter_1.ImageEffectHostAdapter).toService(image_effect_host_adapter_1.LocalImageEffectHostAdapter);
    bind(flow_kernel_bridge_1.FlowKernelBridge).toService(flow_kernel_bridge_1.HybridFlowKernelBridge);
    bind(memory_adapter_1.LocalMemoryAdapter).toSelf().inSingletonScope();
    bind(memory_adapter_1.MemoryAdapter).toService(memory_adapter_1.LocalMemoryAdapter);
    bind(flow_service_1.FlowServiceImpl).toSelf().inSingletonScope();
    bind(common_2.FlowService).toService(flow_service_1.FlowServiceImpl);
    bind(common_1.ConnectionHandler).toDynamicValue(function (ctx) {
        return new common_1.RpcConnectionHandler(common_2.FLOW_SERVICE_PATH, function (client) {
            var server = ctx.container.get(common_2.FlowService);
            server.setClient(client);
            return server;
        });
    }).inSingletonScope();
    bind(common_1.ConnectionHandler).toDynamicValue(function (ctx) {
        return new common_1.RpcConnectionHandler(common_2.LEGACY_FLOW_SERVICE_PATH, function (client) {
            var server = ctx.container.get(common_2.FlowService);
            server.setClient(client);
            return server;
        });
    }).inSingletonScope();
});
