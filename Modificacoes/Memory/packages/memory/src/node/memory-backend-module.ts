import { ConnectionHandler, RpcConnectionHandler } from '@theia/core/lib/common';
import { ContainerModule } from '@theia/core/shared/inversify';
import { MCPBackendContribution } from '@theia/ai-mcp-server/lib/node/mcp-theia-server';
import {
    EventCaptureBus,
    EventCaptureRepository,
    InMemoryEventCaptureRepository,
    MEMORY_SERVICE_PATH,
    LEGACY_MEMORY_SERVICE_PATH,
    MemoryService
} from '../common';
import { MemoryMcpContribution } from './memory-mcp-contribution';
import { CSharpStructuralAnalyzer } from './analysis/csharp-structural-analyzer';
import { CppStructuralAnalyzer } from './analysis/cpp-structural-analyzer';
import { GoStructuralAnalyzer } from './analysis/go-structural-analyzer';
import { JavaStructuralAnalyzer } from './analysis/java-structural-analyzer';
import { PythonStructuralAnalyzer } from './analysis/python-structural-analyzer';
import { RustStructuralAnalyzer } from './analysis/rust-structural-analyzer';
import { TreeSitterStructuralAnalyzer } from './analysis/tree-sitter-structural-analyzer';
import { TypeScriptJavaScriptStructuralAnalyzer } from './analysis/typescript-javascript-structural-analyzer';
import { MemoryLanguageAnalyzerContribution } from './memory-language-analyzer';
import {
    MemoryJsonStoreRepository,
    MemorySqliteStoreRepository,
    MemoryStoreRepository
} from './memory-repositories';
import { MemoryServiceImpl } from './memory-service';

export default new ContainerModule(bind => {
    bind(InMemoryEventCaptureRepository).toSelf().inSingletonScope();
    bind(EventCaptureRepository).toService(InMemoryEventCaptureRepository);
    bind(EventCaptureBus).toDynamicValue(ctx => new EventCaptureBus(ctx.container.get(EventCaptureRepository))).inSingletonScope();

    bind(MemoryJsonStoreRepository).toSelf().inSingletonScope();
    bind(MemorySqliteStoreRepository).toSelf().inSingletonScope();
    bind(MemoryStoreRepository).toService(MemorySqliteStoreRepository);
    bind(CSharpStructuralAnalyzer).toSelf().inSingletonScope();
    bind(CppStructuralAnalyzer).toSelf().inSingletonScope();
    bind(GoStructuralAnalyzer).toSelf().inSingletonScope();
    bind(JavaStructuralAnalyzer).toSelf().inSingletonScope();
    bind(PythonStructuralAnalyzer).toSelf().inSingletonScope();
    bind(RustStructuralAnalyzer).toSelf().inSingletonScope();
    bind(TreeSitterStructuralAnalyzer).toSelf().inSingletonScope();
    bind(TypeScriptJavaScriptStructuralAnalyzer).toSelf().inSingletonScope();
    bind(MemoryLanguageAnalyzerContribution).toService(CSharpStructuralAnalyzer);
    bind(MemoryLanguageAnalyzerContribution).toService(CppStructuralAnalyzer);
    bind(MemoryLanguageAnalyzerContribution).toService(GoStructuralAnalyzer);
    bind(MemoryLanguageAnalyzerContribution).toService(JavaStructuralAnalyzer);
    bind(MemoryLanguageAnalyzerContribution).toService(PythonStructuralAnalyzer);
    bind(MemoryLanguageAnalyzerContribution).toService(RustStructuralAnalyzer);
    bind(MemoryLanguageAnalyzerContribution).toService(TreeSitterStructuralAnalyzer);
    bind(MemoryLanguageAnalyzerContribution).toService(TypeScriptJavaScriptStructuralAnalyzer);
    bind(MemoryServiceImpl).toSelf().inSingletonScope();
    bind(MemoryService).toService(MemoryServiceImpl);
    bind(MemoryMcpContribution).toSelf().inSingletonScope();
    bind(MCPBackendContribution).toService(MemoryMcpContribution);
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler(MEMORY_SERVICE_PATH, () => ctx.container.get<MemoryService>(MemoryService))
    ).inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler(LEGACY_MEMORY_SERVICE_PATH, () => ctx.container.get<MemoryService>(MemoryService))
    ).inSingletonScope();
});
