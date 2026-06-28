// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ConnectionHandler, RpcConnectionHandler } from '@theia/core';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { ConnectionContainerModule } from '@theia/core/lib/node/messaging/connection-container-module';
import { ContainerModule } from '@theia/core/shared/inversify';
import {
    CODEX_HOST_SERVICE_PATH,
    CodexHostBackendClient,
    CodexHostBackendService
} from '../common/codex-host-backend-service';
import { CodexFetchProxyService } from './codex-fetch-proxy-service';
import { CodexGitBridgeService } from './codex-git-bridge-service';
import { CodexGitWorkerService } from './codex-git-worker-service';
import { CodexGitWorktreeService } from './codex-git-worktree-service';
import { CodexHostBackendServiceImpl } from './codex-host-backend-service-impl';
import { CodexRemoteHostService } from './codex-remote-host-service';
import { CodexSkillsService } from './codex-skills-service';
import {
    CodexFileBridgeService,
    CodexGlobalStateService,
    CodexSharedObjectService,
    CodexWslPathService
} from './codex-support-services';
import { CodexWebviewStaticContribution } from './codex-webview-static-contribution';

const codexHostConnectionModule = ConnectionContainerModule.create(({ bind }) => {
    bind(CodexGlobalStateService).toSelf().inSingletonScope();
    bind(CodexSharedObjectService).toSelf().inSingletonScope();
    bind(CodexFileBridgeService).toSelf().inSingletonScope();
    bind(CodexWslPathService).toSelf().inSingletonScope();
    bind(CodexRemoteHostService).toSelf().inSingletonScope();
    bind(CodexGitWorktreeService).toSelf().inSingletonScope();
    bind(CodexGitBridgeService).toSelf().inSingletonScope();
    bind(CodexGitWorkerService).toSelf().inSingletonScope();
    bind(CodexSkillsService).toSelf().inSingletonScope();
    bind(CodexFetchProxyService).toSelf().inSingletonScope();
    bind(CodexHostBackendServiceImpl).toSelf().inSingletonScope();
    bind(CodexHostBackendService).toService(CodexHostBackendServiceImpl);

    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler<CodexHostBackendClient>(CODEX_HOST_SERVICE_PATH, proxy => {
            const service = ctx.container.get<CodexHostBackendServiceImpl>(CodexHostBackendServiceImpl);
            service.setClient(proxy);
            return service;
        })
    ).inSingletonScope();
});

export default new ContainerModule(bind => {
    bind(CodexWebviewStaticContribution).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(CodexWebviewStaticContribution);
    bind(CodexGlobalStateService).toSelf().inSingletonScope();
    bind(CodexSharedObjectService).toSelf().inSingletonScope();
    bind(CodexFileBridgeService).toSelf().inSingletonScope();
    bind(CodexWslPathService).toSelf().inSingletonScope();
    bind(CodexRemoteHostService).toSelf().inSingletonScope();
    bind(CodexGitWorktreeService).toSelf().inSingletonScope();
    bind(CodexGitBridgeService).toSelf().inSingletonScope();
    bind(CodexGitWorkerService).toSelf().inSingletonScope();
    bind(CodexSkillsService).toSelf().inSingletonScope();
    bind(CodexFetchProxyService).toSelf().inSingletonScope();
    bind(CodexHostBackendServiceImpl).toSelf().inSingletonScope();
    bind(CodexHostBackendService).toService(CodexHostBackendServiceImpl);
    bind(ConnectionContainerModule).toConstantValue(codexHostConnectionModule);
});
