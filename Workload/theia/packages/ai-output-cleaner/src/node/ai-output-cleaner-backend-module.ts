// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { bindContributionProvider, ConnectionHandler, RpcConnectionHandler } from '@theia/core';
import { ConnectionContainerModule } from '@theia/core/lib/node/messaging/connection-container-module';
import { ContainerModule } from '@theia/core/shared/inversify';
import { OUTPUT_CLEANER_SERVICE_PATH, LEGACY_OUTPUT_CLEANER_SERVICE_PATH, AIOutputCleanerBackendService } from '../common/ai-output-cleaner-backend-service';
import { AIOutputCleanerArtifactStore } from './ai-output-cleaner-artifact-store';
import { AIOutputCleanerBackendServiceImpl } from './ai-output-cleaner-backend-service';
import { AIOutputCleanerStatusStore } from './ai-output-cleaner-status-store';
import { AIOutputCleanerStatusTracker } from './ai-output-cleaner-status-tracker';
import { CODEX_CLI_SPAWN_ENVIRONMENT_CONTRIBUTION, AIOutputCleanerCodexEnvAdapter } from './ai-output-cleaner-codex-env-adapter';
import { OUTPUT_CLEANER_CLI_ENVIRONMENT_ADAPTER, AIOutputCleanerCliAdapterRegistry } from './ai-output-cleaner-cli-adapter-registry';
import { AIOutputCleanerCommandWrapperManager } from './ai-output-cleaner-command-wrapper-manager';
import { AIOutputCleanerCodexEnvService } from './ai-output-cleaner-codex-env-service';
import { AIOutputCleanerCodexHooksStatusService } from './ai-output-cleaner-codex-hooks-status-service';

const aiOutputCleanerConnectionModule = ConnectionContainerModule.create(({ bind }) => {
    bind(AIOutputCleanerArtifactStore).toSelf().inSingletonScope();
    bind(AIOutputCleanerStatusStore).toSelf().inSingletonScope();
    bind(AIOutputCleanerStatusTracker).toSelf().inSingletonScope();
    bind(AIOutputCleanerCodexHooksStatusService).toSelf().inSingletonScope();
    bind(AIOutputCleanerBackendServiceImpl).toSelf().inSingletonScope();
    bind(AIOutputCleanerBackendService).toService(AIOutputCleanerBackendServiceImpl);

    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler(OUTPUT_CLEANER_SERVICE_PATH, () => ctx.container.get<AIOutputCleanerBackendService>(AIOutputCleanerBackendService))
    ).inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler(LEGACY_OUTPUT_CLEANER_SERVICE_PATH, () => ctx.container.get<AIOutputCleanerBackendService>(AIOutputCleanerBackendService))
    ).inSingletonScope();
});

export default new ContainerModule(bind => {
    bindContributionProvider(bind, OUTPUT_CLEANER_CLI_ENVIRONMENT_ADAPTER);
    bind(AIOutputCleanerArtifactStore).toSelf().inSingletonScope();
    bind(AIOutputCleanerStatusStore).toSelf().inSingletonScope();
    bind(AIOutputCleanerCommandWrapperManager).toSelf().inSingletonScope();
    bind(AIOutputCleanerCliAdapterRegistry).toSelf().inSingletonScope();
    bind(AIOutputCleanerCodexEnvService).toSelf().inSingletonScope();
    bind(AIOutputCleanerCodexHooksStatusService).toSelf().inSingletonScope();
    bind(AIOutputCleanerCodexEnvAdapter).toSelf().inSingletonScope();
    bind(OUTPUT_CLEANER_CLI_ENVIRONMENT_ADAPTER).toService(AIOutputCleanerCodexEnvAdapter);
    bind(CODEX_CLI_SPAWN_ENVIRONMENT_CONTRIBUTION).toService(AIOutputCleanerCodexEnvAdapter);
    bind(ConnectionContainerModule).toConstantValue(aiOutputCleanerConnectionModule);
});
