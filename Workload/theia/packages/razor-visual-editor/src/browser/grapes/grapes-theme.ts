import type { Editor } from 'grapesjs';
import { DEFAULT_RAZOR_VISUAL_THEME_TOKENS, RazorVisualThemeTokens } from '../types/theme-token';

export function applyThemeTokens(editor: Editor, tokens: RazorVisualThemeTokens = DEFAULT_RAZOR_VISUAL_THEME_TOKENS): void {
    editor.Css.setRule(':root', {
        '--cv-theme-primary': tokens.primary,
        '--cv-theme-secondary': tokens.secondary,
        '--cv-theme-tertiary': tokens.tertiary,
        '--cv-theme-surface': tokens.surface,
        '--cv-theme-text': tokens.text,
        '--cv-theme-radius': `${tokens.radius}px`
    });
    editor.Css.setRule('body', {
        color: 'var(--cv-theme-text)',
        'background-color': 'var(--cv-theme-surface)'
    });
    editor.Css.setRule('.btn-primary, .cv-button.primary, button.primary', {
        color: '#ffffff',
        'background-color': 'var(--cv-theme-primary)',
        'border-color': 'var(--cv-theme-primary)',
        'border-radius': 'var(--cv-theme-radius)'
    });
    editor.Css.setRule('.btn-secondary, .cv-button.secondary, button.secondary', {
        color: '#ffffff',
        'background-color': 'var(--cv-theme-secondary)',
        'border-color': 'var(--cv-theme-secondary)',
        'border-radius': 'var(--cv-theme-radius)'
    });
    editor.Css.setRule('.badge, .alert, .card, .panel, .cv-card', {
        'border-radius': 'var(--cv-theme-radius)'
    });
    editor.Css.setRule('a', {
        color: 'var(--cv-theme-primary)'
    });
}
