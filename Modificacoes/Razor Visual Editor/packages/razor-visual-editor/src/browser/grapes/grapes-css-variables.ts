import type { Editor } from 'grapesjs';
import { CssVariableDefinition } from '../types/css-variable';

export function applyCssVariableOverride(editor: Editor, variable: CssVariableDefinition, value: string): void {
    editor.Css.setRule(selectorFor(variable), { [variable.name]: value }, { addStyles: true });
}

export function applyCssVariableOverrides(editor: Editor, variables: CssVariableDefinition[], values: Record<string, string>): void {
    const bySelector = new Map<string, Record<string, string>>();
    for (const variable of variables) {
        const value = values[variable.name] ?? variable.value;
        if (value.trim() === '' || value === variable.value) {
            continue;
        }
        const selector = selectorFor(variable);
        bySelector.set(selector, {
            ...(bySelector.get(selector) ?? {}),
            [variable.name]: value
        });
    }
    for (const [selector, styles] of bySelector) {
        editor.Css.setRule(selector, styles, { addStyles: true });
    }
}

export function initialCssVariableValues(variables: CssVariableDefinition[]): Record<string, string> {
    return Object.fromEntries(variables.map(variable => [variable.name, variable.value]));
}

function selectorFor(variable: CssVariableDefinition): string {
    return variable.selector.trim() || ':root';
}
