// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { CommandContribution, PreferenceContribution } from '@theia/core';
import { RemoteConnectionProvider, ServiceConnectionProvider, WidgetFactory } from '@theia/core/lib/browser';
import { ContainerModule } from '@theia/core/shared/inversify';
import { FrontendLanguageModelRegistry, LanguageModelRegistry } from '@theia/ai-core/lib/common';
import { FrontendLanguageModelRegistryImpl } from '@theia/ai-core/lib/browser/frontend-language-model-registry';
import { OUTPUT_CLEANER_SERVICE_PATH, AIOutputCleanerBackendService } from '../common/ai-output-cleaner-backend-service';
import { AIOutputCleanerPreferencesSchema } from '../common/ai-output-cleaner-preferences';
import { AIOutputCleanerCommandContribution } from './ai-output-cleaner-command-contribution';
import { AIOutputCleanerFrontendLanguageModelRegistry } from './ai-output-cleaner-frontend-language-model-registry';
import { AIOutputCleanerStatusWidget } from './ai-output-cleaner-status-widget';
import { TheiaToolCallInterceptor } from './theia-tool-call-interceptor';

export default new ContainerModule((bind, _unbind, _isBound, rebind) => {
    bind(PreferenceContribution).toConstantValue({ schema: AIOutputCleanerPreferencesSchema });
    bind(CommandContribution).to(AIOutputCleanerCommandContribution).inSingletonScope();
    bind(TheiaToolCallInterceptor).toSelf().inSingletonScope();
    bind(AIOutputCleanerFrontendLanguageModelRegistry).toSelf().inSingletonScope();
    bind(AIOutputCleanerStatusWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(context => ({
        id: AIOutputCleanerStatusWidget.ID,
        createWidget: () => context.container.get(AIOutputCleanerStatusWidget)
    })).inSingletonScope();

    rebind(FrontendLanguageModelRegistryImpl).toService(AIOutputCleanerFrontendLanguageModelRegistry);
    rebind(FrontendLanguageModelRegistry).toService(AIOutputCleanerFrontendLanguageModelRegistry);
    rebind(LanguageModelRegistry).toService(AIOutputCleanerFrontendLanguageModelRegistry);

    bind(AIOutputCleanerBackendService).toDynamicValue(context => {
        const connection = context.container.get<ServiceConnectionProvider>(RemoteConnectionProvider);
        return connection.createProxy(OUTPUT_CLEANER_SERVICE_PATH) as AIOutputCleanerBackendService;
    }).inSingletonScope();
});
