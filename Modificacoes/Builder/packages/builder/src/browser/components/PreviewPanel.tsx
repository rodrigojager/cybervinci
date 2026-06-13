import { codicon } from '@theia/core/lib/browser';
import * as React from '@theia/core/shared/react';

export type BuilderPreviewViewport = 'desktop' | 'tablet' | 'mobile';

export interface PreviewPanelProps {
    readonly viewport: BuilderPreviewViewport;
    readonly onViewportChange: (viewport: BuilderPreviewViewport) => void;
    readonly children: React.ReactNode;
}

const VIEWPORTS: Array<{ id: BuilderPreviewViewport; label: string; icon: string }> = [
    { id: 'desktop', label: 'Desktop', icon: 'device-desktop' },
    { id: 'tablet', label: 'Tablet', icon: 'device-mobile' },
    { id: 'mobile', label: 'Mobile', icon: 'device-mobile' }
];

export function PreviewPanel(props: PreviewPanelProps): React.ReactElement {
    return <section className='builder-preview-panel' aria-label='Page preview'>
        <div className='builder-preview-toolbar'>
            <div>
                <span className={codicon('preview')} aria-hidden='true' />
                <strong>Preview</strong>
            </div>
            <div className='builder-viewport-switch' role='tablist' aria-label='Preview viewport'>
                {VIEWPORTS.map(viewport => {
                    const active = props.viewport === viewport.id;
                    return <button
                        key={viewport.id}
                        type='button'
                        role='tab'
                        aria-selected={active}
                        className={active ? 'active' : undefined}
                        title={viewport.label}
                        onClick={() => props.onViewportChange(viewport.id)}
                    >
                        <span className={codicon(viewport.icon)} aria-hidden='true' />
                        <span>{viewport.label}</span>
                    </button>;
                })}
            </div>
        </div>
        <div className='builder-preview-stage'>
            <div className={`builder-preview-frame builder-preview-frame--${props.viewport}`}>
                {props.children}
            </div>
        </div>
    </section>;
}
