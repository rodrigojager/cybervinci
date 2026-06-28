import { codicon } from '@theia/core/lib/browser';
import * as React from '@theia/core/shared/react';

export interface CanvasEditorProps {
    readonly selectedLabel?: string;
    readonly selectedType?: string;
    readonly selectedPath?: string;
    readonly children: React.ReactNode;
    readonly actions?: React.ReactNode;
    readonly onDragOver?: (event: React.DragEvent<HTMLElement>) => void;
    readonly onDrop?: (event: React.DragEvent<HTMLElement>) => void;
}

export function CanvasEditor(props: CanvasEditorProps): React.ReactElement {
    return <section
        className='builder-canvas-panel builder-drop-target'
        aria-label='Visual page canvas'
        onDragOver={props.onDragOver}
        onDrop={props.onDrop}
    >
        <div className='builder-canvas-header'>
            <div className='builder-breadcrumb'>
                <span className={codicon('layers')} aria-hidden='true' />
                <strong>{props.selectedLabel ?? 'Page'}</strong>
                {props.selectedType && <code>{props.selectedType}</code>}
                {props.selectedPath && <span title={props.selectedPath}>{props.selectedPath}</span>}
            </div>
            {props.actions && <div className='builder-canvas-actions'>{props.actions}</div>}
        </div>
        <div className='builder-canvas-stage'>
            <div className='builder-canvas-surface'>
                {props.children}
            </div>
        </div>
    </section>;
}
