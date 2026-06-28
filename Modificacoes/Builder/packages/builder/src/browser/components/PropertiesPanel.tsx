import { codicon } from '@theia/core/lib/browser';
import * as React from '@theia/core/shared/react';

export type BuilderPropertiesTab = 'props' | 'style' | 'data' | 'advanced';

export interface PropertiesPanelProps {
    readonly activeTab: BuilderPropertiesTab;
    readonly selectedLabel?: string;
    readonly selectedType?: string;
    readonly onTabChange: (tab: BuilderPropertiesTab) => void;
    readonly children: React.ReactNode;
}

const PROPERTY_TABS: Array<{ id: BuilderPropertiesTab; label: string; icon: string }> = [
    { id: 'props', label: 'Props', icon: 'settings-gear' },
    { id: 'style', label: 'Style', icon: 'symbol-color' },
    { id: 'data', label: 'Data', icon: 'database' },
    { id: 'advanced', label: 'Advanced', icon: 'json' }
];

export function PropertiesPanel(props: PropertiesPanelProps): React.ReactElement {
    return <aside className='builder-right-panel' aria-label='Selected component properties'>
        <div className='builder-panel-title'>
            <span className={codicon('inspect')} aria-hidden='true' />
            <div>
                <h2>Inspector</h2>
                <span>{props.selectedLabel ?? 'No selection'}</span>
            </div>
            {props.selectedType && <code>{props.selectedType}</code>}
        </div>
        <div className='builder-property-tabs' role='tablist' aria-label='Property sections'>
            {PROPERTY_TABS.map(tab => {
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
        <div className='builder-right-panel-body'>
            {props.children}
        </div>
    </aside>;
}
