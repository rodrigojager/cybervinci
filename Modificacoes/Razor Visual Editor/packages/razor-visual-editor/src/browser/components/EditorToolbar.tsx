import * as React from '@theia/core/shared/react';
import { RazorVisualEditorMode, RazorVisualViewport } from '../types/editor-document';
import { PreviewModeSelector } from './PreviewModeSelector';
import { SparklesIcon } from './VisualAiPanel';

export interface EditorToolbarProps {
    dirty: boolean;
    mode: RazorVisualEditorMode;
    viewport: RazorVisualViewport;
    isRazor: boolean;
    tokenCount: number;
    assetWarningCount: number;
    aiOpen: boolean;
    onSave(): void;
    onSaveAs(): void;
    onOpenCodeEditor(): void;
    onReload(): void;
    onShowDiff(): void;
    onShowTokens(): void;
    onToggleAi(): void;
    onModeChange(mode: RazorVisualEditorMode): void;
    onViewportChange(viewport: RazorVisualViewport): void;
}

export function EditorToolbar(props: EditorToolbarProps): React.ReactElement {
    return <div className='cv-razor-toolbar'>
        <div className='cv-razor-toolbar-primary'>
            <button type='button' title='Save visual changes' onClick={props.onSave}>
                <i className='fa fa-floppy-o' /> Save{props.dirty ? ' *' : ''}
            </button>
            <button type='button' title='Save visual changes as' onClick={props.onSaveAs}>
                <i className='fa fa-files-o' /> Save As
            </button>
            <button type='button' title='Show visual diff' onClick={props.onShowDiff}>
                <i className='fa fa-exchange' /> Diff
            </button>
            <button
                type='button'
                title={props.mode === 'source' ? 'Hide source code' : 'Show source code'}
                onClick={() => props.onModeChange(props.mode === 'source' ? 'editor' : 'source')}
            >
                <i className='fa fa-code' /> Code
            </button>
            <button type='button' title='Open this file in the code editor' onClick={props.onOpenCodeEditor}>
                <i className='fa fa-file-code-o' /> Open HTML
            </button>
            <button
                type='button'
                className={`cv-ai-toolbar-button ${props.aiOpen ? 'active' : ''}`}
                title={props.aiOpen ? 'Hide Visual AI' : 'Open Visual AI'}
                onClick={props.onToggleAi}
            >
                <SparklesIcon /> AI
            </button>
            <button type='button' title='Reload from disk' onClick={props.onReload}>
                <i className='fa fa-refresh' /> Reload
            </button>
        </div>
        <PreviewModeSelector
            mode={props.mode}
            viewport={props.viewport}
            onModeChange={props.onModeChange}
            onViewportChange={props.onViewportChange}
        />
        <div className='cv-razor-toolbar-secondary'>
            <button type='button' title='Show Razor tokens' onClick={props.onShowTokens} disabled={!props.isRazor}>
                <i className='fa fa-code' /> Tokens {props.tokenCount}
            </button>
            <span className={props.assetWarningCount > 0 ? 'cv-razor-warning-pill' : 'cv-razor-ok-pill'}>
                Assets {props.assetWarningCount}
            </span>
        </div>
    </div>;
}
