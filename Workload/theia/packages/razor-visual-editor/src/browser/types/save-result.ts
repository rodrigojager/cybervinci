export type VisualSaveDecision = 'save' | 'cancel' | 'saveWithoutAskingAgain';

export interface SaveResult {
    saved: boolean;
    savedUri?: string;
    backupUri?: string;
    warnings: string[];
    updatedAssetUris?: string[];
    disableFutureDiffPrompt?: boolean;
}
