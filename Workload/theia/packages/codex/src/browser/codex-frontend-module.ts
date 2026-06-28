// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { PreferenceContribution } from '@theia/core/lib/common';
import {
    FrontendApplicationContribution,
    OpenHandler,
    WidgetFactory,
    bindViewContribution
} from '@theia/core/lib/browser';
import { ContainerModule, interfaces } from '@theia/core/shared/inversify';
import { CodexSidebarContribution } from './codex-sidebar-contribution';
import { CodexWebviewWidget } from './webview/codex-webview-widget';
import { CodexWebviewHostService } from './host/codex-webview-host-service';
import { CodexFrontendRpcService } from './codex-frontend-rpc-service';
import { CodexConversationEditorContribution } from './codex-conversation-editor-contribution';
import { CodexConversationEditorWidget } from './codex-conversation-editor-widget';
import { CodexCodeLensContribution, CodexCodeLensProvider } from './codex-codelens-provider';
import { CodexExtensionPreferencesSchema } from '../common/codex-preferences';
import '../../src/browser/style/codex-webview.css';

export function bindCodexFrontend(bind: interfaces.Bind): void {
    bind(CodexWebviewHostService).toSelf().inSingletonScope();
    bind(CodexFrontendRpcService).toSelf().inSingletonScope();

    bind(CodexWebviewWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: CodexWebviewWidget.ID,
        createWidget: () => ctx.container.get(CodexWebviewWidget)
    })).inSingletonScope();

    bind(CodexConversationEditorWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: CodexConversationEditorWidget.ID,
        createWidget: () => ctx.container.get(CodexConversationEditorWidget)
    })).inSingletonScope();

    bind(CodexConversationEditorContribution).toSelf().inSingletonScope();
    bind(OpenHandler).toService(CodexConversationEditorContribution);

    bind(CodexCodeLensProvider).toSelf().inSingletonScope();
    bind(CodexCodeLensContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(CodexCodeLensContribution);

    bindViewContribution(bind, CodexSidebarContribution);
    bind(FrontendApplicationContribution).toService(CodexSidebarContribution);

    bind(PreferenceContribution).toConstantValue({ schema: CodexExtensionPreferencesSchema });
}

export default new ContainerModule(bind => {
    bindCodexFrontend(bind);
});
