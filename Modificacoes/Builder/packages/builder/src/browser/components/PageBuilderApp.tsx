import * as React from '@theia/core/shared/react';
import { BuilderToolbar, type BuilderToolbarProps, type PageBuilderViewMode } from './BuilderToolbar';
import { CanvasEditor, type CanvasEditorProps } from './CanvasEditor';
import { ComponentLibraryPanel, type ComponentLibraryPanelProps } from './ComponentLibraryPanel';
import { JsonPreviewPanel, type JsonPreviewPanelProps } from './JsonPreviewPanel';
import { PreviewPanel, type PreviewPanelProps } from './PreviewPanel';
import { PropertiesPanel, type PropertiesPanelProps } from './PropertiesPanel';

export interface PageBuilderAppProps {
    readonly toolbar: BuilderToolbarProps;
    readonly library: ComponentLibraryPanelProps;
    readonly canvas: CanvasEditorProps;
    readonly preview: PreviewPanelProps;
    readonly json: JsonPreviewPanelProps;
    readonly properties: PropertiesPanelProps;
}

export function PageBuilderApp(props: PageBuilderAppProps): React.ReactElement {
    const [jsonPanelHeight, setJsonPanelHeight] = React.useState(280);
    const startJsonPanelResize = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        const startY = event.clientY;
        const startHeight = jsonPanelHeight;
        const handlePointerMove = (moveEvent: PointerEvent) => {
            const maxHeight = Math.max(220, Math.floor(window.innerHeight * 0.62));
            const nextHeight = startHeight - (moveEvent.clientY - startY);
            setJsonPanelHeight(Math.min(maxHeight, Math.max(180, nextHeight)));
        };
        const stopResize = () => {
            window.removeEventListener('pointermove', handlePointerMove);
        };
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', stopResize, { once: true });
    }, [jsonPanelHeight]);
    const style = {
        '--builder-json-panel-height': `${jsonPanelHeight}px`
    } as React.CSSProperties;

    return <div className='builder-shell builder-page-builder-shell' style={style}>
        <BuilderToolbar {...props.toolbar} />
        <main className={`builder-workbench builder-workbench--${props.toolbar.viewMode}`} aria-label='CyberVinci Page Builder workspace'>
            <ComponentLibraryPanel {...props.library} />
            {renderWorkspaceCenter(props.toolbar.viewMode, props, startJsonPanelResize)}
            <PropertiesPanel {...props.properties} />
        </main>
    </div>;
}

function renderWorkspaceCenter(
    viewMode: PageBuilderViewMode,
    props: PageBuilderAppProps,
    onJsonResize: (event: React.PointerEvent<HTMLDivElement>) => void
): React.ReactElement {
    if (viewMode === 'preview') {
        return <PreviewPanel {...props.preview} />;
    }
    if (viewMode === 'json') {
        return <section className='builder-workbench-stack builder-workbench-stack--with-json' aria-label='Visual editor and canonical JSON'>
            <CanvasEditor {...props.canvas} />
            <div
                className='builder-json-resizer'
                role='separator'
                aria-orientation='horizontal'
                aria-label='Resize JSON panel'
                onPointerDown={onJsonResize}
            />
            <JsonPreviewPanel {...props.json} />
        </section>;
    }
    return <section className='builder-workbench-stack' aria-label='Visual editor'>
        <CanvasEditor {...props.canvas} />
    </section>;
}
