import * as React from '@theia/core/shared/react';
import { AssetResolutionResult } from '../types/asset-reference';

export interface AssetWarningsPanelProps {
    assetResolution: AssetResolutionResult;
}

export function AssetWarningsPanel(props: AssetWarningsPanelProps): React.ReactElement {
    return <section className='cv-razor-side-section'>
        <h3>Assets</h3>
        <div className='cv-razor-asset-list'>
            {props.assetResolution.assets.length === 0 && <p className='cv-razor-muted'>No CSS or script references detected.</p>}
            {props.assetResolution.assets.map((asset, index) => <article key={`${asset.requestedPath}-${index}`} className={asset.warning ? 'warning' : 'resolved'}>
                <strong>{asset.kind}</strong>
                <code>{asset.requestedPath}</code>
                <span>{asset.resolvedUri?.path.toString() ?? asset.warning ?? 'resolved'}</span>
            </article>)}
        </div>
    </section>;
}
