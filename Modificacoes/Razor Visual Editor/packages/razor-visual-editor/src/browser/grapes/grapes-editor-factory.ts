import grapesjsDefault, * as grapesjsModule from 'grapesjs';
import { Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import '../../../src/browser/styles/razor-visual-editor.css';
import { injectable } from '@theia/core/shared/inversify';
import { GrapesEditorInitOptions, createGrapesConfig } from './grapes-config';
import { registerGrapesBlocks } from './grapes-blocks';
import { registerRazorGrapesComponents } from './grapes-components';
import { registerGrapesTraits } from './grapes-traits';
import { registerCyberVinciGrapesStorage } from './grapes-storage';
import { configureGrapesStyleManager } from './grapes-style-manager';

type GrapesJsApi = typeof grapesjsDefault;

export interface GrapesEditorFactoryOptions extends GrapesEditorInitOptions {
    onDirty(): void;
}

@injectable()
export class GrapesEditorFactory {
    create(options: GrapesEditorFactoryOptions): Editor {
        const editor = this.getGrapesJs().init(createGrapesConfig(options));
        registerCyberVinciGrapesStorage(editor);
        registerRazorGrapesComponents(editor);
        registerGrapesTraits(editor);
        configureGrapesStyleManager(editor);
        registerGrapesBlocks(editor);
        editor.setComponents(options.html);
        editor.setStyle(options.css.join('\n'));
        editor.on('update', () => options.onDirty());
        return editor;
    }

    protected getGrapesJs(): GrapesJsApi {
        const moduleLike = grapesjsModule as unknown as {
            default?: GrapesJsApi;
            grapesjs?: GrapesJsApi;
            init?: GrapesJsApi['init'];
        };
        const candidates = [
            grapesjsDefault,
            moduleLike.default,
            moduleLike.grapesjs,
            moduleLike as GrapesJsApi
        ];
        const grapesjs = candidates.find((candidate): candidate is GrapesJsApi => Boolean(candidate && typeof candidate.init === 'function'));
        if (!grapesjs) {
            throw new Error('GrapesJS was loaded without an init function.');
        }
        return grapesjs;
    }
}
