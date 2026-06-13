// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { LanguageModelProvider } from '@theia/ai-core';
import { ChatResponsePartRenderer } from '@theia/ai-chat-ui/lib/browser/chat-response-part-renderer';
import { CommandContribution, PreferenceContribution } from '@theia/core';
import { FrontendApplicationContribution, RemoteConnectionProvider, ServiceConnectionProvider, WidgetFactory } from '@theia/core/lib/browser';
import { ContainerModule } from '@theia/core/shared/inversify';
import { CodexProviderPreferencesSchema } from '../common/ai-providers-preferences';
import { CODEX_CLI_SERVICE_PATH, CodexProviderClient, CodexProviderService } from '../common/ai-providers-service';
import { CodexProviderConfigurationWidget } from './ai-providers-configuration-widget';
import { CodexProviderCommandContribution } from './ai-providers-command-contribution';
import { CodexProviderLanguageModel } from './ai-providers-language-model';
import { CodexProviderSlashCommandsContribution } from './ai-providers-slash-commands-contribution';
import { CodexProviderClientImpl, CodexProviderFrontendService } from './ai-providers-frontend-service';
import { CodexProviderRuntimeProvider } from './ai-providers-runtime-provider';
import { CodexProviderToolRenderer } from './renderers/ai-providers-tool-renderer';
import '../../src/browser/style/ai-providers-tool-renderers.css';
import '../../src/browser/style/ai-providers-configuration.css';

export default new ContainerModule(bind => {
    bind(PreferenceContribution).toConstantValue({ schema: CodexProviderPreferencesSchema });
    bind(CommandContribution).to(CodexProviderCommandContribution).inSingletonScope();
    bind(FrontendApplicationContribution).to(CodexProviderSlashCommandsContribution).inSingletonScope();

    bind(CodexProviderFrontendService).toSelf().inSingletonScope();
    bind(CodexProviderRuntimeProvider).toService(CodexProviderFrontendService);
    bind(CodexProviderClientImpl).toSelf().inSingletonScope();
    bind(CodexProviderClient).toService(CodexProviderClientImpl);
    bind(CodexProviderService).toDynamicValue(ctx => {
        const connection = ctx.container.get<ServiceConnectionProvider>(RemoteConnectionProvider);
        const backendClient: CodexProviderClient = ctx.container.get(CodexProviderClient);
        return connection.createProxy(CODEX_CLI_SERVICE_PATH, backendClient);
    }).inSingletonScope();

    bind(CodexProviderLanguageModel).toSelf().inSingletonScope();
    bind(LanguageModelProvider).toDynamicValue(ctx => async () => [ctx.container.get(CodexProviderLanguageModel)]).inSingletonScope();
    bind(FrontendApplicationContribution).toService(CodexProviderLanguageModel);

    bind(CodexProviderToolRenderer).toSelf().inSingletonScope();
    bind(ChatResponsePartRenderer).toService(CodexProviderToolRenderer);

    bind(CodexProviderConfigurationWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: CodexProviderConfigurationWidget.ID,
        createWidget: () => ctx.container.get(CodexProviderConfigurationWidget)
    })).inSingletonScope();
});
