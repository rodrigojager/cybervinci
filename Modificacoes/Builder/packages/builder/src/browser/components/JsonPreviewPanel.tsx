import { codicon } from '@theia/core/lib/browser';
import * as React from '@theia/core/shared/react';

export interface JsonPreviewPanelProps {
    readonly dirty: boolean;
    readonly hasUnappliedChanges: boolean;
    readonly children: React.ReactNode;
}

export function JsonPreviewPanel(props: JsonPreviewPanelProps): React.ReactElement {
    return <section className='builder-json-panel' aria-label='Canonical page JSON'>
        <div className='builder-json-panel-header'>
            <div>
                <span className={codicon('json')} aria-hidden='true' />
                <strong>Page JSON</strong>
            </div>
            <div className='builder-json-badges'>
                {props.dirty && <span>Unsaved</span>}
                {props.hasUnappliedChanges && <span>Draft</span>}
            </div>
        </div>
        <div className='builder-json-panel-body'>
            {props.children}
        </div>
    </section>;
}
