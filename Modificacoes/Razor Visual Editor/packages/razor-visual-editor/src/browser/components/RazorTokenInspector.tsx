import * as React from '@theia/core/shared/react';
import { RazorToken } from '../types/razor-token';

export interface RazorTokenInspectorProps {
    tokens: RazorToken[];
    selectedTokenId?: string;
    onSelectToken(tokenId: string): void;
}

export function RazorTokenInspector(props: RazorTokenInspectorProps): React.ReactElement {
    const selected = props.tokens.find(token => token.id === props.selectedTokenId);
    return <section className='cv-razor-side-section'>
        <h3>Razor Tokens</h3>
        {props.tokens.length === 0
            ? <p className='cv-razor-muted'>No Razor tokens.</p>
            : <div className='cv-razor-token-list'>
                {props.tokens.map(token => <button
                    key={token.id}
                    type='button'
                    className={token.id === props.selectedTokenId ? 'selected' : ''}
                    onClick={() => props.onSelectToken(token.id)}
                    title={token.originalText}
                >
                    <strong>{token.id}</strong>
                    <span>{token.kind}</span>
                    <code>{compact(token.originalText)}</code>
                </button>)}
            </div>}
        {selected && <article className='cv-razor-token-detail'>
            <h4>{selected.id}</h4>
            <dl>
                <dt>Kind</dt>
                <dd>{selected.kind}</dd>
                <dt>Mode</dt>
                <dd>{selected.editableMode}</dd>
                <dt>Position</dt>
                <dd>{selected.startIndex}-{selected.endIndex}</dd>
                <dt>Checksum</dt>
                <dd><code>{selected.checksum}</code></dd>
            </dl>
            <pre>{selected.originalText}</pre>
        </article>}
    </section>;
}

function compact(value: string): string {
    const text = value.replace(/\s+/g, ' ').trim();
    return text.length > 56 ? `${text.slice(0, 53)}...` : text;
}
