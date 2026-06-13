import { bindViewContribution, FrontendApplicationContribution, RemoteConnectionProvider, ServiceConnectionProvider, WidgetFactory } from '@theia/core/lib/browser';
import { JsonSchemaContribution } from '@theia/core/lib/browser/json-schema-store';
import { ContainerModule } from '@theia/core/shared/inversify';
import { AIVariableContribution } from '@theia/ai-core';
import { CallHierarchyService } from '@theia/callhierarchy/lib/browser/callhierarchy-service';
import { TestContribution } from '@theia/test/lib/browser/test-service';
import { TypeHierarchyService } from '@theia/typehierarchy/lib/browser/typehierarchy-service';
import { CSHARP_KIT_SERVICE_PATH, CSharpKitService } from '../common';
import { CSharpKitAIContribution } from './csharp-kit-ai-contribution';
import { CSharpKitCallHierarchyService } from './csharp-kit-call-hierarchy-service';
import { CSharpKitConfigSchemaContribution } from './csharp-kit-config-schema-contribution';
import { CSharpKitContribution } from './csharp-kit-contribution';
import { CSharpKitDiagnosticsContribution } from './csharp-kit-diagnostics-contribution';
import { CSharpKitIntelliSenseContribution } from './csharp-kit-intellisense-contribution';
import { CSharpKitTerminalService } from './csharp-kit-terminal-service';
import { CSharpKitTypeHierarchyService } from './csharp-kit-type-hierarchy-service';
import { CSharpKitWidget } from './csharp-kit-widget';
import { CSharpTestContribution } from './csharp-test-contribution';
import '../../src/browser/style/csharp-kit.css';

export default new ContainerModule(bind => {
    bind(CSharpKitService).toDynamicValue(ctx => {
        const connection = ctx.container.get<ServiceConnectionProvider>(RemoteConnectionProvider);
        return connection.createProxy<CSharpKitService>(CSHARP_KIT_SERVICE_PATH);
    }).inSingletonScope();

    bind(CSharpKitTerminalService).toSelf().inSingletonScope();
    bind(CSharpKitConfigSchemaContribution).toSelf().inSingletonScope();
    bind(JsonSchemaContribution).toService(CSharpKitConfigSchemaContribution);
    bind(CSharpKitAIContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(CSharpKitAIContribution);
    bind(AIVariableContribution).toService(CSharpKitAIContribution);
    bind(CSharpKitCallHierarchyService).toSelf().inSingletonScope();
    bind(CallHierarchyService).toService(CSharpKitCallHierarchyService);
    bind(CSharpKitTypeHierarchyService).toSelf().inSingletonScope();
    bind(TypeHierarchyService).toService(CSharpKitTypeHierarchyService);
    bind(FrontendApplicationContribution).toService(CSharpKitTypeHierarchyService);
    bind(CSharpKitDiagnosticsContribution).toSelf().inSingletonScope();
    bind(CSharpKitIntelliSenseContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(CSharpKitIntelliSenseContribution);
    bind(CSharpTestContribution).toDynamicValue(ctx => new CSharpTestContribution(ctx.container)).inSingletonScope();
    bind(TestContribution).toService(CSharpTestContribution);
    bindViewContribution(bind, CSharpKitContribution);
    bind(CSharpKitWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: CSharpKitWidget.ID,
        createWidget: () => ctx.container.get<CSharpKitWidget>(CSharpKitWidget)
    })).inSingletonScope();
});
