import { ContainerModule } from '@theia/core/shared/inversify';
import { bindRootContributionProvider, CommandContribution, MenuContribution } from '@theia/core/lib/common';
import { FrontendApplicationContribution, KeybindingContribution, LabelProviderContribution, OpenHandler, WidgetFactory, NavigatableWidgetOptions } from '@theia/core/lib/browser';
import { OpenPencilAiReviewService, OpenPencilAiReviewWidget, OpenPencilAiReviewWidgetOptions } from './openpencil-ai-review-widget';
import { OpenPencilAiRuntimeDesignProvider } from './openpencil-ai-runtime-design-provider';
import { OpenPencilBackendCodexAiDesignProvider } from './openpencil-backend-codex-ai-design-provider';
import { OpenPencilAiDesignProvider, OpenPencilCyberVinciAiDesignProvider, OpenPencilDesignCommandService, OpenPencilDesignCommandServiceImpl } from './openpencil-design-command-service';
import { OpenPencilEditorContribution, OpenPencilLabelProviderContribution } from './openpencil-editor-contribution';
import { OpenPencilEditorWidget, OpenPencilEditorWidgetOptions } from './openpencil-editor-widget';

import '../../src/browser/style/openpencil-editor.css';

export default new ContainerModule(bind => {
    bindRootContributionProvider(bind, OpenPencilAiDesignProvider);
    bind(OpenPencilAiRuntimeDesignProvider).toSelf().inSingletonScope();
    bind(OpenPencilAiDesignProvider).toService(OpenPencilAiRuntimeDesignProvider);
    bind(OpenPencilBackendCodexAiDesignProvider).toSelf().inSingletonScope();
    bind(OpenPencilAiDesignProvider).toService(OpenPencilBackendCodexAiDesignProvider);
    bind(OpenPencilCyberVinciAiDesignProvider).toSelf().inSingletonScope();
    bind(OpenPencilAiDesignProvider).toService(OpenPencilCyberVinciAiDesignProvider);
    bind(OpenPencilDesignCommandService).to(OpenPencilDesignCommandServiceImpl).inSingletonScope();
    bind(OpenPencilAiReviewService).toSelf().inSingletonScope();

    bind(OpenPencilEditorWidget).toSelf();
    bind<WidgetFactory>(WidgetFactory).toDynamicValue(ctx => ({
        id: OpenPencilEditorWidget.ID,
        createWidget: async (options: NavigatableWidgetOptions) => {
            const child = ctx.container.createChild();
            child.bind(OpenPencilEditorWidgetOptions).toConstantValue({ uri: options.uri });
            return child.get(OpenPencilEditorWidget);
        }
    })).inSingletonScope();
    bind(OpenPencilAiReviewWidget).toSelf();
    bind<WidgetFactory>(WidgetFactory).toDynamicValue(ctx => ({
        id: OpenPencilAiReviewWidget.ID,
        createWidget: async (options: OpenPencilAiReviewWidgetOptions) => {
            const child = ctx.container.createChild();
            child.bind(OpenPencilAiReviewWidgetOptions).toConstantValue(options);
            return child.get(OpenPencilAiReviewWidget);
        }
    })).inSingletonScope();

    bind(OpenPencilEditorContribution).toSelf().inSingletonScope();
    bind(OpenHandler).toService(OpenPencilEditorContribution);
    bind(FrontendApplicationContribution).toService(OpenPencilEditorContribution);
    bind(CommandContribution).toService(OpenPencilEditorContribution);
    bind(MenuContribution).toService(OpenPencilEditorContribution);
    bind(KeybindingContribution).toService(OpenPencilEditorContribution);
    bind(OpenPencilLabelProviderContribution).toSelf().inSingletonScope();
    bind(LabelProviderContribution).toService(OpenPencilLabelProviderContribution);
});
