import * as React from '@theia/core/shared/react';

export interface EditorStructurePanelProps {
    onBlocksContainerChange(container: HTMLElement | undefined): void;
    onLayersContainerChange(container: HTMLElement | undefined): void;
}

export function EditorStructurePanel(props: EditorStructurePanelProps): React.ReactElement {
    const setBlocksContainer = React.useCallback((element: HTMLDivElement | null) => {
        props.onBlocksContainerChange(element ?? undefined);
    }, [props.onBlocksContainerChange]);
    const setLayersContainer = React.useCallback((element: HTMLDivElement | null) => {
        props.onLayersContainerChange(element ?? undefined);
    }, [props.onLayersContainerChange]);

    return <aside className='cv-razor-structure-panel'>
        <section className='cv-razor-side-section cv-grapes-native-panel cv-structure-blocks'>
            <header>
                <h3>Components</h3>
                <span>Blocks</span>
            </header>
            <div className='cv-grapes-blocks-host' ref={setBlocksContainer} />
        </section>
        <section className='cv-razor-side-section cv-grapes-native-panel cv-structure-layers'>
            <header>
                <h3>DOM Tree</h3>
                <span>Layers</span>
            </header>
            <div className='cv-grapes-layers-host' ref={setLayersContainer} />
        </section>
    </aside>;
}
