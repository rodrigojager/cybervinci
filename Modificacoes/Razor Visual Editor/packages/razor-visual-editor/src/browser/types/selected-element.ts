import { MatchedCssRule } from './css-variable';

export interface SelectedElementSnapshot {
    id: string;
    label: string;
    tagName: string;
    type: string;
    attributes: Record<string, string>;
    classes: string[];
    styles: Record<string, string>;
    matchedRules: MatchedCssRule[];
    text: string;
    textEditable: boolean;
    locked: boolean;
    razorTokenId?: string;
    razorKind?: string;
}
