import { CommandContribution, MenuContribution } from '@theia/core/lib/common';
import { FrontendApplicationContribution, NavigatableWidgetOptions, OpenHandler, WidgetFactory } from '@theia/core/lib/browser';
import { TabBarToolbarContribution } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { ContainerModule } from '@theia/core/shared/inversify';
import { RazorProtector } from './razor/razor-protector';
import { RazorVisualAssetResolver } from './assets/asset-resolver';
import { RazorMvcBundleConfigParser } from './assets/bundle-config-parser';
import { RazorVisualCssLoader } from './assets/css-loader';
import { RazorVisualPathResolver } from './assets/path-resolver';
import { RazorVisualScriptLoader } from './assets/script-loader';
import { GrapesEditorFactory } from './grapes/grapes-editor-factory';
import { RazorVisualEditorContribution } from './razor-visual-editor-contribution';
import { RazorVisualEditorWidget, RazorVisualEditorWidgetOptions } from './razor-visual-editor-widget';
import { RazorVisualBackupService } from './services/backup-service';
import { RazorVisualDiffService } from './services/diff-service';
import { RazorVisualFileOpenService } from './services/file-open-service';
import { RazorVisualFileSaveService } from './services/file-save-service';
import { RazorVisualTextEditorSyncService } from './services/text-editor-sync-service';
import { RazorVisualAiService } from './services/visual-ai-service';
import { RazorVisualWorkspaceService } from './services/workspace-service';
import 'font-awesome/css/font-awesome.min.css';
import '../../src/browser/styles/razor-visual-editor.css';

export default new ContainerModule(bind => {
    bind(RazorProtector).toSelf().inSingletonScope();
    bind(RazorVisualAssetResolver).toSelf().inSingletonScope();
    bind(RazorMvcBundleConfigParser).toSelf().inSingletonScope();
    bind(RazorVisualCssLoader).toSelf().inSingletonScope();
    bind(RazorVisualScriptLoader).toSelf().inSingletonScope();
    bind(RazorVisualPathResolver).toSelf().inSingletonScope();
    bind(RazorVisualBackupService).toSelf().inSingletonScope();
    bind(RazorVisualDiffService).toSelf().inSingletonScope();
    bind(RazorVisualFileOpenService).toSelf().inSingletonScope();
    bind(RazorVisualFileSaveService).toSelf().inSingletonScope();
    bind(RazorVisualTextEditorSyncService).toSelf().inSingletonScope();
    bind(RazorVisualAiService).toSelf().inSingletonScope();
    bind(RazorVisualWorkspaceService).toSelf().inSingletonScope();
    bind(GrapesEditorFactory).toSelf().inSingletonScope();

    bind(RazorVisualEditorWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: RazorVisualEditorWidget.ID,
        createWidget: async (options: NavigatableWidgetOptions) => {
            const child = ctx.container.createChild();
            child.bind(RazorVisualEditorWidgetOptions).toConstantValue({ uri: options.uri });
            return child.get(RazorVisualEditorWidget);
        }
    })).inSingletonScope();

    bind(RazorVisualEditorContribution).toSelf().inSingletonScope();
    bind(OpenHandler).toService(RazorVisualEditorContribution);
    bind(FrontendApplicationContribution).toService(RazorVisualEditorContribution);
    bind(CommandContribution).toService(RazorVisualEditorContribution);
    bind(MenuContribution).toService(RazorVisualEditorContribution);
    bind(TabBarToolbarContribution).toService(RazorVisualEditorContribution);
});
