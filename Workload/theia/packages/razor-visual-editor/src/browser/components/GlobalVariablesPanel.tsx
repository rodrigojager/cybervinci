import * as React from '@theia/core/shared/react';
import { CssVariableDefinition, CssVariableKind } from '../types/css-variable';

export interface GlobalVariablesPanelProps {
    variables: CssVariableDefinition[];
    values: Record<string, string>;
    onChange(name: string, value: string): void;
    onReset(name: string): void;
}

const GROUPS: Array<{ kind: CssVariableKind; label: string }> = [
    { kind: 'color', label: 'Colors' },
    { kind: 'radius', label: 'Roundness' },
    { kind: 'other', label: 'Other' }
];

export function GlobalVariablesPanel(props: GlobalVariablesPanelProps): React.ReactElement {
    return <section className='cv-razor-side-section cv-global-vars-panel'>
        <header>
            <h3>Global Variables</h3>
            <span>{props.variables.length}</span>
        </header>
        {props.variables.length === 0
            ? <p className='cv-razor-muted'>No CSS variables found.</p>
            : GROUPS.map(group => {
                const variables = props.variables.filter(variable => variable.kind === group.kind);
                if (variables.length === 0) {
                    return undefined;
                }
                return <section className='cv-global-vars-group' key={group.kind}>
                    <h4>{group.label}</h4>
                    {variables.map(variable => <CssVariableControl
                        key={variable.name}
                        variable={variable}
                        value={props.values[variable.name] ?? variable.value}
                        onChange={props.onChange}
                        onReset={props.onReset}
                    />)}
                </section>;
            })}
    </section>;
}

interface CssVariableControlProps {
    variable: CssVariableDefinition;
    value: string;
    onChange(name: string, value: string): void;
    onReset(name: string): void;
}

function CssVariableControl(props: CssVariableControlProps): React.ReactElement {
    const numericRadius = parseCssLength(props.value);
    const hasColorPicker = props.variable.kind === 'color' && isHexColor(props.value);
    const hasRadiusSlider = props.variable.kind === 'radius' && Boolean(numericRadius);
    const compact = !hasColorPicker && !hasRadiusSlider;
    return <label className={`cv-global-var cv-global-var-${props.variable.kind} ${compact ? 'cv-global-var-compact' : ''}`}>
        <span title={`${props.variable.selector} · ${props.variable.source}`}>{props.variable.name}</span>
        {hasColorPicker && <input
            type='color'
            value={normalizeHexColor(props.value)}
            onChange={event => props.onChange(props.variable.name, event.currentTarget.value)}
        />}
        {hasRadiusSlider && numericRadius && <input
            type='range'
            min={0}
            max={48}
            value={numericRadius.value}
            onChange={event => props.onChange(props.variable.name, `${event.currentTarget.value}${numericRadius.unit}`)}
        />}
        <input
            value={props.value}
            onChange={event => props.onChange(props.variable.name, event.currentTarget.value)}
        />
        <button type='button' title='Reset variable' onClick={() => props.onReset(props.variable.name)}>
            <i className='fa fa-undo' />
        </button>
    </label>;
}

function isHexColor(value: string): boolean {
    return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function normalizeHexColor(value: string): string {
    const trimmed = value.trim();
    if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
        return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
    }
    return trimmed;
}

function parseCssLength(value: string): { value: number; unit: string } | undefined {
    const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(px|rem|em|%)$/);
    if (!match) {
        return undefined;
    }
    return { value: Number(match[1]), unit: match[2] };
}
