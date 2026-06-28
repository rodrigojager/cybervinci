import { codicon } from '@theia/core/lib/browser';
import * as React from '@theia/core/shared/react';

export type ComponentLibraryTab = 'components' | 'blocks' | 'insert';

export interface ComponentLibraryPanelProps {
    readonly activeTab: ComponentLibraryTab;
    readonly onTabChange: (tab: ComponentLibraryTab) => void;
    readonly children: React.ReactNode;
    readonly layers: React.ReactNode;
}

const LIBRARY_TABS: Array<{ id: ComponentLibraryTab; label: string; icon: string }> = [
    { id: 'components', label: 'Components', icon: 'symbol-misc' },
    { id: 'blocks', label: 'Blocks', icon: 'layout' },
    { id: 'insert', label: 'Insert', icon: 'add' }
];

export function ComponentLibraryPanel(props: ComponentLibraryPanelProps): React.ReactElement {
    return <aside className='builder-left-panel' aria-label='Component library'>
        <div className='builder-panel-title'>
            <span className={codicon('library')} aria-hidden='true' />
            <div>
                <h2>Library</h2>
                <span>Registry driven components</span>
            </div>
        </div>
        <section className='builder-left-section builder-left-section--library' aria-label='Component library and insert tools'>
            <div className='builder-side-tabs' role='tablist' aria-label='Library sections'>
                {LIBRARY_TABS.map(tab => {
                    const active = props.activeTab === tab.id;
                    return <button
                        key={tab.id}
                        type='button'
                        role='tab'
                        aria-selected={active}
                        className={active ? 'active' : undefined}
                        title={tab.label}
                        onClick={() => props.onTabChange(tab.id)}
                    >
                        <span className={codicon(tab.icon)} aria-hidden='true' />
                        <span>{tab.label}</span>
                    </button>;
                })}
            </div>
            <div className='builder-left-panel-body'>
                {props.children}
            </div>
        </section>
        <section className='builder-left-section builder-left-section--layers' aria-label='Page layers'>
            <div className='builder-panel-title builder-panel-title--subsection'>
                <span className={codicon('list-tree')} aria-hidden='true' />
                <div>
                    <h2>DOM Tree</h2>
                    <span>Layers and insertion target</span>
                </div>
            </div>
            <div className='builder-left-panel-body'>
                {props.layers}
            </div>
        </section>
    </aside>;
}
