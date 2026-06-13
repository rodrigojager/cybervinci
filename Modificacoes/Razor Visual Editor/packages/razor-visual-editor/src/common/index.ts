export const RAZOR_VISUAL_EDITOR_EXTENSION_ID = 'cybervinci.razorVisualEditor';
export const RAZOR_VISUAL_EDITOR_SUPPORTED_EXTENSIONS = ['.html', '.htm', '.cshtml'] as const;

export function isRazorVisualEditorFileName(path: string): boolean {
    const lower = path.toLowerCase();
    return RAZOR_VISUAL_EDITOR_SUPPORTED_EXTENSIONS.some(extension => lower.endsWith(extension));
}

export function isRazorFileName(path: string): boolean {
    return path.toLowerCase().endsWith('.cshtml') || path.toLowerCase().endsWith('.razor');
}

export namespace RazorVisualEditorCommands {
    export const OPEN = {
        id: 'cybervinci.razorVisualEditor.open',
        label: 'CyberVinci: Open Visual HTML/Razor Editor'
    };

    export const OPEN_CURRENT = {
        id: 'cybervinci.razorVisualEditor.openCurrent',
        label: 'CyberVinci: Open Current File Visually',
        iconClass: 'codicon codicon-open-preview cv-razor-visual-open-icon'
    };

    export const SAVE = {
        id: 'cybervinci.razorVisualEditor.save',
        label: 'CyberVinci: Save Visual Changes',
        iconClass: 'codicon codicon-save'
    };

    export const SAVE_AS = {
        id: 'cybervinci.razorVisualEditor.saveAs',
        label: 'CyberVinci: Save Visual Changes As',
        iconClass: 'codicon codicon-save-as'
    };

    export const SHOW_TOKENS = {
        id: 'cybervinci.razorVisualEditor.showTokens',
        label: 'CyberVinci: Show Razor Tokens'
    };

    export const SHOW_DIFF = {
        id: 'cybervinci.razorVisualEditor.showDiff',
        label: 'CyberVinci: Show Visual Diff',
        iconClass: 'codicon codicon-diff'
    };

    export const RELOAD = {
        id: 'cybervinci.razorVisualEditor.reload',
        label: 'CyberVinci: Reload From Disk',
        iconClass: 'codicon codicon-refresh'
    };
}
