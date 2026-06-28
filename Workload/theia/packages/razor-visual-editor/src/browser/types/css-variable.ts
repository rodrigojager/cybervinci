export type CssVariableKind = 'color' | 'radius' | 'other';

export interface CssVariableDefinition {
    name: string;
    value: string;
    kind: CssVariableKind;
    source: string;
    sourceUri?: string;
    selector: string;
}

export interface CssVariableSaveChange {
    name: string;
    value: string;
    originalValue: string;
    source: string;
    sourceUri?: string;
    selector: string;
}

export interface MatchedCssRule {
    selector: string;
    specificity: string;
    source: string;
    mediaText?: string;
    inline: boolean;
    declarations: MatchedCssDeclaration[];
}

export interface MatchedCssDeclaration {
    property: string;
    value: string;
    priority: string;
    active: boolean;
    overridden: boolean;
}
