import { codicon } from '@theia/core/lib/browser';
import * as React from '@theia/core/shared/react';

export type PageBuilderViewMode = 'editor' | 'preview' | 'json';

export interface BuilderToolbarProps {
    readonly fileName: string;
    readonly dirty: boolean;
    readonly viewMode: PageBuilderViewMode;
    readonly canSave: boolean;
    readonly canExport: boolean;
    readonly onNew: () => void;
    readonly onOpen: () => void;
    readonly onSave: () => void;
    readonly onExportReact: () => void;
    readonly onExportHtml: () => void;
    readonly onViewModeChange: (mode: PageBuilderViewMode) => void;
}

interface ToolbarCommand {
    readonly id: string;
    readonly label: string;
    readonly icon: string;
    readonly title: string;
    readonly disabled?: boolean;
    readonly run: () => void;
}

export function BuilderToolbar(props: BuilderToolbarProps): React.ReactElement {
    const commands: ToolbarCommand[] = [
        {
            id: 'new',
            label: 'New',
            icon: 'new-file',
            title: 'Create a new CyberVinci page',
            run: props.onNew
        },
        {
            id: 'open',
            label: 'Open',
            icon: 'folder-opened',
            title: 'Open a .cvpage.json page',
            run: props.onOpen
        },
        {
            id: 'save',
            label: props.dirty ? 'Save*' : 'Save',
            icon: 'save',
            title: 'Save page JSON',
            disabled: !props.canSave,
            run: props.onSave
        },
        {
            id: 'export-react',
            label: 'React',
            icon: 'export',
            title: 'Export React TSX',
            disabled: !props.canExport,
            run: props.onExportReact
        },
        {
            id: 'export-html',
            label: 'HTML',
            icon: 'browser',
            title: 'Export static HTML',
            disabled: !props.canExport,
            run: props.onExportHtml
        }
    ];

    return <header className='builder-topbar'>
        <div className='builder-brand'>
            <span className={codicon('layout')} aria-hidden='true' />
            <div>
                <strong>CyberVinci Page Builder</strong>
                <span title={props.fileName}>{props.fileName}</span>
            </div>
        </div>
        <div className='builder-command-bar' aria-label='Page builder commands'>
            {commands.map(command => <button
                key={command.id}
                type='button'
                title={command.title}
                disabled={command.disabled}
                onClick={command.run}
            >
                <span className={codicon(command.icon)} aria-hidden='true' />
                <span>{command.label}</span>
            </button>)}
        </div>
        <div className='builder-view-switch' role='tablist' aria-label='Builder view mode'>
            {renderModeButton('editor', 'Editor', 'edit', props)}
            {renderModeButton('preview', 'Preview', 'preview', props)}
            {renderModeButton('json', 'JSON', 'json', props)}
        </div>
    </header>;
}

function renderModeButton(mode: PageBuilderViewMode, label: string, icon: string, props: BuilderToolbarProps): React.ReactElement {
    const active = props.viewMode === mode;
    return <button
        key={mode}
        type='button'
        role='tab'
        aria-selected={active}
        className={active ? 'active' : undefined}
        title={label}
        onClick={() => props.onViewModeChange(mode)}
    >
        <span className={codicon(icon)} aria-hidden='true' />
        <span>{label}</span>
    </button>;
}
