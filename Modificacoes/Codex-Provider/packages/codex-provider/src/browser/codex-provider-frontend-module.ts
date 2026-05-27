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
import { CodexProviderPreferencesSchema } from '../common/codex-provider-preferences';
import { CODEX_CLI_SERVICE_PATH, CodexProviderClient, CodexProviderService } from '../common/codex-provider-service';
import { CodexProviderConfigurationWidget } from './codex-provider-configuration-widget';
import { CodexProviderCommandContribution } from './codex-provider-command-contribution';
import { CodexProviderLanguageModel } from './codex-provider-language-model';
import { CodexProviderSlashCommandsContribution } from './codex-provider-slash-commands-contribution';
import { CodexProviderClientImpl, CodexProviderFrontendService } from './codex-provider-frontend-service';
import { CodexProviderRuntimeProvider } from './codex-provider-runtime-provider';
import { CodexProviderToolRenderer } from './renderers/codex-provider-tool-renderer';
import '../../src/browser/style/codex-provider-tool-renderers.css';
import '../../src/browser/style/codex-provider-configuration.css';

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
