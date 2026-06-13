import { SelectedElementSnapshot } from './selected-element';

export type VisualAiProviderStatus = 'ready' | 'needs-auth' | 'unavailable' | 'not-configured';

export interface VisualAiProviderDescriptor {
    id: string;
    label: string;
    description: string;
    status: VisualAiProviderStatus;
    statusMessage?: string;
    models: string[];
    defaultModel?: string;
    acceptsCustomModel: boolean;
}

export interface VisualAiProtectedToken {
    id: string;
    kind: string;
}

export interface VisualAiRunRequest {
    providerId: string;
    model?: string;
    instruction: string;
    fileUri: string;
    html: string;
    css: string;
    isRazor: boolean;
    selectedElement?: SelectedElementSnapshot;
    protectedTokens: VisualAiProtectedToken[];
    assetWarnings: string[];
}

export interface VisualAiRunResult {
    html: string;
    css?: string;
    summary: string;
    warnings: string[];
    rawText?: string;
}

