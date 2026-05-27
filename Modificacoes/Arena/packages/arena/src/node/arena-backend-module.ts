import { bindContributionProvider, ConnectionHandler, RpcConnectionHandler } from '@theia/core/lib/common';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { ContainerModule } from '@theia/core/shared/inversify';
import { ARENA_SERVICE_PATH, LEGACY_ARENA_SERVICE_PATH, ArenaService } from '../common';
import { CleanupService } from './cleanup-service';
import { ArenaServiceImpl } from './arena-service';
import { PromptLibraryService } from './prompt-library-service';
import { PromptMergeService } from './prompt-merge-service';
import { PromptRefinementService } from './prompt-refinement-service';
import { ArenaRunnerRegistry } from './runner-registry';
import { ClaudeCodeArenaRunner, GeminiCliArenaRunner, GenericCliArenaRunner, RemoteArenaRunner } from './runners/stub-runners';
import { ApiLlmArenaRunner } from './runners/api-llm-runner';
import { CodexProviderArenaRunner } from './runners/codex-provider-runner';
import { MockArenaRunner } from './runners/mock-runner';
import { IArenaRunner } from './runners/arena-runner';
import { WorkspaceSandboxService } from './workspace-sandbox-service';
import { LanguageModelArenaService } from './language-model-arena-service';

export default new ContainerModule(bind => {
    bind(PromptLibraryService).toSelf().inSingletonScope();
    bind(PromptMergeService).toSelf().inSingletonScope();
    bind(PromptRefinementService).toSelf().inSingletonScope();
    bind(LanguageModelArenaService).toSelf().inSingletonScope();
    bind(WorkspaceSandboxService).toSelf().inSingletonScope();
    bind(CleanupService).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(CleanupService);
    bind(ArenaRunnerRegistry).toSelf().inSingletonScope();
    bindContributionProvider(bind, IArenaRunner);

    bind(MockArenaRunner).toSelf().inSingletonScope();
    bind(IArenaRunner).toService(MockArenaRunner);
    bind(ApiLlmArenaRunner).toSelf().inSingletonScope();
    bind(IArenaRunner).toService(ApiLlmArenaRunner);
    bind(CodexProviderArenaRunner).toSelf().inSingletonScope();
    bind(IArenaRunner).toService(CodexProviderArenaRunner);
    bind(ClaudeCodeArenaRunner).toSelf().inSingletonScope();
    bind(IArenaRunner).toService(ClaudeCodeArenaRunner);
    bind(GeminiCliArenaRunner).toSelf().inSingletonScope();
    bind(IArenaRunner).toService(GeminiCliArenaRunner);
    bind(GenericCliArenaRunner).toSelf().inSingletonScope();
    bind(IArenaRunner).toService(GenericCliArenaRunner);
    bind(RemoteArenaRunner).toSelf().inSingletonScope();
    bind(IArenaRunner).toService(RemoteArenaRunner);

    bind(ArenaServiceImpl).toSelf().inSingletonScope();
    bind(ArenaService).toService(ArenaServiceImpl);
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler(ARENA_SERVICE_PATH, () => ctx.container.get<ArenaService>(ArenaService))
    ).inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler(LEGACY_ARENA_SERVICE_PATH, () => ctx.container.get<ArenaService>(ArenaService))
    ).inSingletonScope();
});
