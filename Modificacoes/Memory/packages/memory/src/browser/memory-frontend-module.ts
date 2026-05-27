import { CommandContribution } from '@theia/core/lib/common';
import { FrontendApplicationContribution, RemoteConnectionProvider, ServiceConnectionProvider, WidgetFactory, bindViewContribution } from '@theia/core/lib/browser';
import { AIVariableContribution } from '@theia/ai-core';
import { ContainerModule } from '@theia/core/shared/inversify';
import {
    EventCaptureBus,
    EventCaptureRepository,
    InMemoryEventCaptureRepository,
    MEMORY_SERVICE_PATH,
    MemoryService
} from '../common';
import { MemoryChatContribution } from './chat/memory-chat-contribution';
import { MemoryApprovedContextVariableContribution } from './context-cart/context-cart-variable-contribution';
import { MemoryContextCartService, MemoryContextCartServiceImpl } from './context-cart/context-cart-service';
import { MemoryContextCartWidget } from './context-cart/context-cart-widget';
import { MemoryContribution } from './memory-contribution';
import { MemoryEditorContribution } from './memory-editor-contribution';
import { MemoryTaskTestContribution } from './memory-task-test-contribution';
import { MemoryTerminalContribution } from './memory-terminal-contribution';
import { MemoryWidget } from './memory-widget';
import '../../src/browser/style/index.css';

export default new ContainerModule(bind => {
    bind(InMemoryEventCaptureRepository).toSelf().inSingletonScope();
    bind(EventCaptureRepository).toService(InMemoryEventCaptureRepository);
    bind(EventCaptureBus).toDynamicValue(ctx => new EventCaptureBus(ctx.container.get(EventCaptureRepository))).inSingletonScope();

    bind(MemoryService).toDynamicValue(ctx => {
        const provider = ctx.container.get<ServiceConnectionProvider>(RemoteConnectionProvider);
        return provider.createProxy<MemoryService>(MEMORY_SERVICE_PATH);
    }).inSingletonScope();

    bindViewContribution(bind, MemoryContribution);
    bind(FrontendApplicationContribution).toService(MemoryContribution);
    bindViewContribution(bind, MemoryChatContribution);
    bind(FrontendApplicationContribution).toService(MemoryChatContribution);

    bind(MemoryEditorContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(MemoryEditorContribution);
    bind(CommandContribution).toService(MemoryEditorContribution);

    bind(MemoryTerminalContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(MemoryTerminalContribution);

    bind(MemoryTaskTestContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(MemoryTaskTestContribution);

    bind(MemoryContextCartServiceImpl).toSelf().inSingletonScope();
    bind(MemoryContextCartService).toService(MemoryContextCartServiceImpl);
    bind(MemoryApprovedContextVariableContribution).toSelf().inSingletonScope();
    bind(AIVariableContribution).toService(MemoryApprovedContextVariableContribution);

    bind(MemoryWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: MemoryWidget.ID,
        createWidget: () => ctx.container.get(MemoryWidget)
    })).inSingletonScope();

    bind(MemoryContextCartWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: MemoryContextCartWidget.ID,
        createWidget: () => ctx.container.get(MemoryContextCartWidget)
    })).inSingletonScope();
});
