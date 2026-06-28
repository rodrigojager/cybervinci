import * as React from '@theia/core/shared/react';
import { RazorVisualEditorMode, RazorVisualViewport } from '../types/editor-document';

export interface PreviewModeSelectorProps {
    mode: RazorVisualEditorMode;
    viewport: RazorVisualViewport;
    onModeChange(mode: RazorVisualEditorMode): void;
    onViewportChange(viewport: RazorVisualViewport): void;
}

const MODES: RazorVisualEditorMode[] = ['editor', 'preview', 'preview-scripts', 'source'];
const VIEWPORTS: RazorVisualViewport[] = ['desktop', 'tablet', 'mobile', 'custom'];

export function PreviewModeSelector(props: PreviewModeSelectorProps): React.ReactElement {
    const selectedMode = MODES.includes(props.mode) ? props.mode : 'editor';
    return <div className='cv-razor-mode-selectors'>
        <select value={selectedMode} onChange={event => props.onModeChange(event.currentTarget.value as RazorVisualEditorMode)} title='Preview mode'>
            {MODES.map(mode => <option key={mode} value={mode}>{modeLabel(mode)}</option>)}
        </select>
        <div className='cv-viewport-switcher' role='group' aria-label='Viewport'>
            {VIEWPORTS.map(viewport => <button
                key={viewport}
                type='button'
                className={props.viewport === viewport ? 'active' : undefined}
                title={viewportLabel(viewport)}
                aria-label={viewportLabel(viewport)}
                aria-pressed={props.viewport === viewport}
                onClick={() => props.onViewportChange(viewport)}
            >
                <i className={`fa ${viewportIcon(viewport)}`} />
            </button>)}
        </div>
    </div>;
}

function modeLabel(mode: RazorVisualEditorMode): string {
    switch (mode) {
        case 'preview-scripts': return 'Preview with scripts';
        default: return mode[0].toUpperCase() + mode.slice(1);
    }
}

function viewportLabel(viewport: RazorVisualViewport): string {
    return viewport[0].toUpperCase() + viewport.slice(1);
}

function viewportIcon(viewport: RazorVisualViewport): string {
    switch (viewport) {
        case 'tablet': return 'fa-tablet';
        case 'mobile': return 'fa-mobile';
        case 'custom': return 'fa-arrows-alt';
        case 'desktop':
        default: return 'fa-desktop';
    }
}
