// *****************************************************************************
// Copyright (C) 2026 TypeFox GmbH.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { PreferenceContribution } from '@theia/core';
import { GenericCapabilitiesContribution } from '@theia/ai-core';
import { bindToolProvider } from '@theia/ai-core/lib/common/tool-invocation-registry';
import { bindViewContribution, RemoteConnectionProvider, ServiceConnectionProvider, WidgetFactory } from '@theia/core/lib/browser';
import { ContainerModule } from '@theia/core/shared/inversify';
import { LibraryPreferenceSchema } from '../common/library-preferences';
import { LibraryService, LibraryServicePath } from '../common/library-service';
import {
    DocsCheckUpdatesToolProvider,
    LibraryGenericCapabilitiesContribution,
    DocsInstallToolProvider,
    DocsListInstalledToolProvider,
    DocsSearchToolProvider,
    DocsWorkspaceContextToolProvider
} from './library-ai-tools';
import { LibraryContribution } from './library-contribution';
import { LibraryWidget } from './library-widget';
import '../../src/browser/style/library.css';

export default new ContainerModule(bind => {
    bind(PreferenceContribution).toConstantValue({ schema: LibraryPreferenceSchema });

    bind(LibraryService).toDynamicValue(ctx => {
        const connection = ctx.container.get<ServiceConnectionProvider>(RemoteConnectionProvider);
        return connection.createProxy<LibraryService>(LibraryServicePath);
    }).inSingletonScope();

    bindViewContribution(bind, LibraryContribution);
    bindToolProvider(DocsSearchToolProvider, bind);
    bindToolProvider(DocsWorkspaceContextToolProvider, bind);
    bindToolProvider(DocsListInstalledToolProvider, bind);
    bindToolProvider(DocsInstallToolProvider, bind);
    bindToolProvider(DocsCheckUpdatesToolProvider, bind);
    bind(LibraryGenericCapabilitiesContribution).toSelf().inSingletonScope();
    bind(GenericCapabilitiesContribution).toService(LibraryGenericCapabilitiesContribution);

    bind(LibraryWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: LibraryWidget.ID,
        createWidget: () => ctx.container.get<LibraryWidget>(LibraryWidget)
    })).inSingletonScope();
});
