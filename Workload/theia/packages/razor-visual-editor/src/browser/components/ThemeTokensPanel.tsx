import * as React from '@theia/core/shared/react';
import { DEFAULT_RAZOR_VISUAL_THEME_TOKENS, RazorVisualThemeTokens } from '../types/theme-token';

export interface ThemeTokensPanelProps {
    tokens: RazorVisualThemeTokens;
    onChange(tokens: RazorVisualThemeTokens): void;
}

const COLOR_FIELDS: Array<{ key: keyof Pick<RazorVisualThemeTokens, 'primary' | 'secondary' | 'tertiary' | 'surface' | 'text'>; label: string }> = [
    { key: 'primary', label: 'Primary' },
    { key: 'secondary', label: 'Secondary' },
    { key: 'tertiary', label: 'Tertiary' },
    { key: 'surface', label: 'Surface' },
    { key: 'text', label: 'Text' }
];

export function ThemeTokensPanel(props: ThemeTokensPanelProps): React.ReactElement {
    const update = React.useCallback(<K extends keyof RazorVisualThemeTokens>(key: K, value: RazorVisualThemeTokens[K]) => {
        props.onChange({ ...props.tokens, [key]: value });
    }, [props]);

    return <section className='cv-razor-side-section cv-theme-panel'>
        <header>
            <h3>Theme</h3>
            <button type='button' title='Reset theme tokens' onClick={() => props.onChange(DEFAULT_RAZOR_VISUAL_THEME_TOKENS)}>
                <i className='fa fa-undo' />
            </button>
        </header>
        <div className='cv-theme-grid'>
            {COLOR_FIELDS.map(field => <label key={field.key}>
                <span>{field.label}</span>
                <input
                    type='color'
                    value={props.tokens[field.key]}
                    onChange={event => update(field.key, event.currentTarget.value)}
                />
                <input
                    value={props.tokens[field.key]}
                    onChange={event => update(field.key, event.currentTarget.value)}
                />
            </label>)}
            <label className='cv-theme-range'>
                <span>Roundness</span>
                <input
                    type='range'
                    min={0}
                    max={28}
                    value={props.tokens.radius}
                    onChange={event => update('radius', Number(event.currentTarget.value))}
                />
                <output>{props.tokens.radius}px</output>
            </label>
        </div>
    </section>;
}
