// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { CODEX_ACQUIRE_VSCODE_API_SHIM } from './codex-acquire-vscode-api-shim-content';

const STARTUP_LOADER_STYLE = `
:root {
  --startup-background: transparent;
  --startup-logo-base: #adadad;
  --startup-logo-shimmer-soft: rgb(255 255 255 / 0.02);
  --startup-logo-shimmer-peak: rgb(255 255 255 / 0.46);
  --startup-logo-shimmer-tail: rgb(255 255 255 / 0.06);
}
html, body { margin: 0; width: 100%; height: 100%; background: var(--startup-background); }
body { outline: none; }
#root { width: 100%; height: 100%; }
.startup-loader { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; background: var(--startup-background); }
.startup-loader__logo { position: relative; width: 56px; height: 56px; opacity: 0; animation: startup-codex-logo-fade-in 180ms ease-out 60ms forwards; }
.startup-loader__base, .startup-loader__overlay { position: absolute; inset: 0; width: 100%; height: 100%; }
.startup-loader__base { color: var(--startup-logo-base); }
.startup-loader__overlay {
  background-image: linear-gradient(112deg, transparent 22%, var(--startup-logo-shimmer-soft) 38%, var(--startup-logo-shimmer-peak) 49%, var(--startup-logo-shimmer-tail) 56%, transparent 74%);
  background-position: 140% 0; background-repeat: no-repeat; background-size: 220% 100%;
  animation: startup-codex-logo-shimmer 2200ms cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
@keyframes startup-codex-logo-fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
@keyframes startup-codex-logo-shimmer { 0% { background-position: 140% 0; } 100% { background-position: -120% 0; } }
`;

const THEIA_THEME_STYLE = `
:root {
  color-scheme: dark;
  --vscode-foreground: #f4f4f5;
  --vscode-descriptionForeground: #b8b8c0;
  --vscode-disabledForeground: #92929c;
  --vscode-errorForeground: #f14c4c;
  --vscode-focusBorder: #4daafc;
  --vscode-icon-foreground: var(--vscode-descriptionForeground);
  --vscode-editor-background: #202020;
  --vscode-editor-foreground: var(--vscode-foreground);
  --vscode-sideBar-background: #202020;
  --vscode-sideBar-foreground: var(--vscode-foreground);
  --vscode-dropdown-background: #202020;
  --vscode-dropdown-foreground: var(--vscode-foreground);
  --vscode-dropdown-border: rgb(255 255 255 / 0.18);
  --vscode-button-background: var(--vscode-focusBorder);
  --vscode-button-foreground: #ffffff;
  --vscode-button-hoverBackground: var(--vscode-focusBorder);
  --vscode-button-secondaryBackground: #2a2a2a;
  --vscode-button-secondaryForeground: var(--vscode-foreground);
  --vscode-button-secondaryHoverBackground: rgb(255 255 255 / 0.08);
  --vscode-button-border: rgb(255 255 255 / 0.18);
  --vscode-input-background: #2a2a2a;
  --vscode-input-foreground: var(--vscode-foreground);
  --vscode-input-border: rgb(255 255 255 / 0.18);
  --vscode-input-placeholderForeground: var(--vscode-disabledForeground);
  --vscode-textLink-foreground: var(--vscode-focusBorder);
  --vscode-textLink-activeForeground: var(--vscode-focusBorder);
  --vscode-textPreformat-foreground: var(--vscode-foreground);
  --vscode-textPreformat-background: #2a2a2a;
  --vscode-textCodeBlock-background: #2a2a2a;
  --vscode-badge-background: var(--vscode-focusBorder);
  --vscode-badge-foreground: #ffffff;
  --vscode-list-hoverBackground: rgb(255 255 255 / 0.08);
  --vscode-list-activeSelectionBackground: rgb(77 170 252 / 0.28);
  --vscode-list-activeSelectionForeground: var(--vscode-foreground);
  --vscode-list-focusBackground: var(--vscode-list-hoverBackground);
  --vscode-list-focusForeground: var(--vscode-foreground);
  --vscode-list-highlightForeground: var(--vscode-focusBorder);
  --vscode-scrollbarSlider-background: rgb(255 255 255 / 0.22);
  --vscode-scrollbarSlider-hoverBackground: rgb(255 255 255 / 0.32);
  --vscode-scrollbarSlider-activeBackground: rgb(77 170 252 / 0.62);
  --vscode-panel-background: #202020;
  --vscode-panel-border: rgb(255 255 255 / 0.18);
  --vscode-editorWidget-background: #2a2a2a;
  --vscode-editorWidget-foreground: var(--vscode-foreground);
  --vscode-editorWidget-border: rgb(255 255 255 / 0.18);
  --vscode-editorHoverWidget-background: var(--vscode-editorWidget-background);
  --vscode-editorHoverWidget-foreground: var(--vscode-editorWidget-foreground);
  --vscode-editorHoverWidget-border: var(--vscode-editorWidget-border);
  --vscode-toolbar-hoverBackground: var(--vscode-list-hoverBackground);
  --vscode-inputValidation-infoBackground: rgb(59 130 246 / 0.16);
  --vscode-inputValidation-infoBorder: rgb(59 130 246 / 0.45);
  --vscode-inputValidation-warningBackground: rgb(234 179 8 / 0.16);
  --vscode-inputValidation-warningBorder: rgb(234 179 8 / 0.45);
  --vscode-inputValidation-errorBackground: rgb(239 68 68 / 0.16);
  --vscode-inputValidation-errorBorder: rgb(239 68 68 / 0.45);
  --vscode-progressBar-background: var(--vscode-focusBorder);
  --vscode-activityBarBadge-background: var(--vscode-focusBorder);
  --vscode-activityBarBadge-foreground: #ffffff;
  --token-foreground: var(--vscode-foreground);
  --token-text-primary: var(--vscode-foreground);
  --token-text-secondary: var(--vscode-descriptionForeground);
  --token-text-tertiary: var(--vscode-disabledForeground);
  --token-text-quaternary: var(--vscode-disabledForeground);
  --token-description-foreground: var(--vscode-descriptionForeground);
  --token-side-bar-background: var(--vscode-sideBar-background);
  --token-dropdown-background: var(--vscode-dropdown-background);
  --token-main-surface-primary: var(--vscode-editor-background);
  --token-main-surface-secondary: var(--vscode-panel-background);
  --token-main-surface-tertiary: var(--vscode-editorWidget-background);
  --token-border: var(--vscode-panel-border);
  --token-border-default: var(--vscode-panel-border);
  --token-border-light: color-mix(in srgb, var(--vscode-foreground) 10%, transparent);
  --token-border-medium: color-mix(in srgb, var(--vscode-foreground) 18%, transparent);
  --token-button-secondary-hover-background: var(--vscode-button-secondaryHoverBackground);
  --token-input-validation-info-background: var(--vscode-inputValidation-infoBackground);
  --token-input-validation-warning-background: var(--vscode-inputValidation-warningBackground);
  --token-input-validation-warning-border: var(--vscode-inputValidation-warningBorder);
  --token-input-validation-error-background: var(--vscode-inputValidation-errorBackground);
  --token-input-validation-error-border: var(--vscode-inputValidation-errorBorder);
  --color-text-foreground: var(--vscode-foreground);
  --color-text-foreground-secondary: var(--vscode-descriptionForeground);
  --color-text-foreground-tertiary: var(--vscode-disabledForeground);
  --color-text-error: var(--vscode-errorForeground);
  --color-text-accent: var(--vscode-textLink-foreground);
  --color-icon-primary: var(--vscode-icon-foreground);
  --color-border-focus: var(--vscode-focusBorder);
  --color-border: var(--vscode-panel-border);
  --color-border-light: color-mix(in srgb, var(--vscode-foreground) 8%, transparent);
  --color-border-heavy: color-mix(in srgb, var(--vscode-foreground) 14%, transparent);
  --color-background-surface: var(--vscode-editor-background);
  --color-background-surface-under: var(--vscode-sideBar-background);
  --color-background-editor-opaque: var(--vscode-editor-background);
  --color-background-elevated-primary: var(--vscode-editorWidget-background);
  --color-background-elevated-primary-opaque: var(--vscode-editorWidget-background);
  --color-background-elevated-secondary: var(--vscode-panel-background);
  --color-background-status-error: var(--vscode-inputValidation-errorBackground);
  --color-background-status-warning: var(--vscode-inputValidation-warningBackground);
  --color-background-status-success: color-mix(in srgb, var(--vscode-focusBorder) 16%, transparent);
  --color-accent-red: var(--vscode-errorForeground);
  --color-accent-yellow: #cca700;
  --color-accent-green: #89d185;
  --color-accent-blue: var(--vscode-focusBorder);
  --color-accent-purple: var(--vscode-textLink-foreground);
  --codex-titlebar-tint: transparent;
}
html,
body {
  background: var(--token-side-bar-background);
  color: var(--token-foreground);
}
`;

const THEIA_THEME_SCRIPT = `(function () {
    'use strict';

    var currentVariant;

    function normalizeVariant(value) {
        return value === 'light' || value === 'dark' ? value : undefined;
    }

    function applyVariant(variant) {
        var normalized = normalizeVariant(variant);
        if (!normalized) {
            return;
        }
        currentVariant = normalized;
        applyVariantToNode(document.documentElement, normalized);
        if (document.body) {
            applyVariantToNode(document.body, normalized);
        }
    }

    function applyVariantToNode(node, variant) {
        node.style.colorScheme = variant;
        node.dataset.codexHostThemeVariant = variant;
        node.classList.toggle('light', variant === 'light');
        node.classList.toggle('dark', variant === 'dark');
        node.classList.toggle('electron-light', variant === 'light');
        node.classList.toggle('electron-dark', variant === 'dark');
    }

    function isCssVariableName(value) {
        return typeof value === 'string' && /^--[A-Za-z0-9_.-]+$/.test(value);
    }

    function applyColors(colors) {
        if (!colors || typeof colors !== 'object') {
            return;
        }
        var rootStyle = document.documentElement.style;
        Object.keys(colors).forEach(function (name) {
            var value = colors[name];
            if (isCssVariableName(name) && typeof value === 'string' && value.trim().length > 0) {
                rootStyle.setProperty(name, value.trim());
            }
        });
    }

    function applyTheme(payload) {
        var theme = payload && typeof payload.theme === 'object' ? payload.theme : payload;
        if (!theme || typeof theme !== 'object') {
            return;
        }
        applyColors(theme.colors);
        applyVariant(theme.variant);
        if (typeof theme.id === 'string' && theme.id.length > 0) {
            document.documentElement.dataset.codexHostThemeId = theme.id;
        }
    }

    function handleMessage(data) {
        if (data && typeof data === 'object' && data.type === 'theme-updated') {
            applyTheme(data.theme || data);
        }
    }

    window.__applyCodexHostTheme = applyTheme;
    window.addEventListener('message', function (event) {
        handleMessage(event.data);
    });
    window.addEventListener('codex-host-message', function (event) {
        handleMessage(event.detail);
    });
    document.addEventListener('DOMContentLoaded', function () {
        applyVariant(currentVariant);
    });
})();`;

const HOST_NAVIGATION_CONTROL_STYLE = `
.codex-host-route-control {
  position: fixed;
  top: 8px;
  right: 8px;
  z-index: 2147483647;
  display: none;
  height: 28px;
  max-width: calc(100vw - 16px);
  align-items: center;
  gap: 6px;
  padding: 0 9px;
  border: 1px solid var(--vscode-button-border, rgb(255 255 255 / 0.18));
  border-radius: 6px;
  background: var(--vscode-button-secondaryBackground, rgb(255 255 255 / 0.06));
  color: var(--vscode-button-secondaryForeground, var(--vscode-foreground, #f4f4f5));
  font: 500 12px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  letter-spacing: 0;
  box-shadow: 0 2px 10px rgb(0 0 0 / 0.18);
  cursor: pointer;
}
.codex-host-route-control[data-visible="true"] {
  display: inline-flex;
}
.codex-host-route-control:hover {
  background: var(--token-button-secondary-hover-background, rgb(255 255 255 / 0.1));
}
.codex-host-route-control:focus-visible {
  outline: 1px solid var(--vscode-focusBorder, #4daafc);
  outline-offset: 2px;
}
.codex-host-route-control__icon {
  font-size: 14px;
  line-height: 1;
}
`;

const HOST_NAVIGATION_CONTROL_SCRIPT = `(function () {
    'use strict';

    var SETTINGS_ROUTE = '/settings';

    function normalizePath(value) {
        if (typeof value !== 'string' || !value) {
            return '/';
        }
        return value.charAt(0) === '/' ? value : '/' + value;
    }

    function isSettingsRoute(path) {
        return path === SETTINGS_ROUTE || path.indexOf(SETTINGS_ROUTE + '/') === 0;
    }

    function setVisible(visible) {
        var button = document.getElementById('codex-host-back-to-chat');
        if (!button) {
            return;
        }
        button.dataset.visible = visible ? 'true' : 'false';
        button.setAttribute('aria-hidden', visible ? 'false' : 'true');
        button.tabIndex = visible ? 0 : -1;
    }

    function postToHost(message) {
        if (typeof window.acquireVsCodeApi !== 'function') {
            return false;
        }
        try {
            window.acquireVsCodeApi().postMessage(message);
            return true;
        } catch (_error) {
            return false;
        }
    }

    function navigateToChat() {
        var message = { type: 'navigate-to-route', path: '/' };
        if (!postToHost(message)) {
            window.postMessage(message, '*');
        }
        setVisible(false);
    }

    function handleHostMessage(data) {
        if (!data || typeof data !== 'object' || data.channel === 'codex-webview-ipc') {
            return;
        }
        if (data.type === 'navigate-to-route') {
            setVisible(isSettingsRoute(normalizePath(data.path)));
        }
    }

    function readInitialRoute() {
        var meta = document.querySelector('meta[name="initial-route"]');
        return meta && meta.getAttribute('content') || '/';
    }

    function readViewKind() {
        var meta = document.querySelector('meta[name="codex-view-kind"]');
        return meta && meta.getAttribute('content') || 'sidebar';
    }

    function supportsBackToChatControl() {
        var viewKind = readViewKind();
        return viewKind === 'sidebar' || viewKind === 'editor';
    }

    function install() {
        var button = document.getElementById('codex-host-back-to-chat');
        if (!button) {
            return;
        }
        if (!supportsBackToChatControl()) {
            return;
        }
        button.addEventListener('click', navigateToChat);
        window.addEventListener('message', function (event) {
            handleHostMessage(event.data);
        });
        setVisible(isSettingsRoute(normalizePath(readInitialRoute())));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', install);
    } else {
        install();
    }
})();`;

const HOST_NAVIGATION_CONTROL_HTML = `<button id="codex-host-back-to-chat" class="codex-host-route-control" type="button" aria-label="Back to chat" aria-hidden="true" tabindex="-1"><span class="codex-host-route-control__icon" aria-hidden="true">&larr;</span><span>Chat</span></button>`;

const DEFAULT_EXTENSION_VERSION = '26.5527.31454';
const DEFAULT_BUILD_FLAVOR = 'prod';

export interface CodexWebviewShellOptions {
    webviewId: string;
    initialRoute?: string;
    viewKind?: 'sidebar' | 'editor' | 'hotkey';
    assetBase: string;
    officialIndexHtml?: string;
    sessionId?: string;
    extensionVersion?: string;
    buildFlavor?: string;
}

interface NormalizedCodexWebviewShellOptions extends CodexWebviewShellOptions {
    sessionId: string;
    extensionVersion: string;
    buildFlavor: string;
    viewKind: 'sidebar' | 'editor' | 'hotkey';
}

export function readCodexAcquireVsCodeApiShim(): string {
    return CODEX_ACQUIRE_VSCODE_API_SHIM;
}

export function buildCodexWebviewShellHtml(options: CodexWebviewShellOptions): string {
    const normalized = normalizeShellOptions(options);
    if (normalized.officialIndexHtml?.trim()) {
        return transformOfficialWebviewIndexHtml(normalized.officialIndexHtml, normalized);
    }
    return buildFallbackCodexWebviewShellHtml(normalized);
}

function normalizeShellOptions(options: CodexWebviewShellOptions): NormalizedCodexWebviewShellOptions {
    return {
        ...options,
        buildFlavor: options.buildFlavor ?? DEFAULT_BUILD_FLAVOR,
        extensionVersion: options.extensionVersion ?? DEFAULT_EXTENSION_VERSION,
        sessionId: options.sessionId ?? `theia-${options.webviewId}`,
        viewKind: options.viewKind ?? 'sidebar'
    };
}

function transformOfficialWebviewIndexHtml(html: string, options: NormalizedCodexWebviewShellOptions): string {
    let transformed = html
        .replace(/<!--\s*PROD_BASE_TAG_HERE\s*-->/gi, '')
        .replace(/<!--\s*PROD_CSP_TAG_HERE\s*-->/gi, '')
        .replace(/<base\b[^>]*>/gi, '');

    transformed = removeRuntimeMetaTags(transformed);
    transformed = rewriteRelativeAssetUrls(transformed, options.assetBase);
    transformed = appendWebviewIdToEntrypoint(transformed, options.webviewId);
    transformed = injectRuntimeMetaTags(transformed, buildRuntimeMetaTags(options));
    transformed = injectRuntimeThemeStyle(transformed);
    transformed = injectRuntimeThemeScript(transformed);
    transformed = injectShimScript(transformed, readCodexAcquireVsCodeApiShim());
    transformed = injectHostNavigationControl(transformed);
    return transformed;
}

function buildFallbackCodexWebviewShellHtml(options: NormalizedCodexWebviewShellOptions): string {
    const shim = readCodexAcquireVsCodeApiShim();
    const query = `?webviewId=${encodeURIComponent(options.webviewId)}`;
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
${buildRuntimeMetaTags(options)}
<title>Codex</title>
<style>${STARTUP_LOADER_STYLE}</style>
<style>${THEIA_THEME_STYLE}</style>
<script>${THEIA_THEME_SCRIPT}</script>
<style>${HOST_NAVIGATION_CONTROL_STYLE}</style>
<script>${shim}</script>
<link rel="modulepreload" crossorigin href="${options.assetBase}/assets/preload-helper-Bo9GmnuQ.js">
<link rel="modulepreload" crossorigin href="${options.assetBase}/assets/chunk-CFjPhJqf.js">
<link rel="modulepreload" crossorigin href="${options.assetBase}/assets/src-DpdPyvGM.js">
<script type="module" crossorigin src="${options.assetBase}/assets/index-DPtc3qk2.js${query}"></script>
</head>
<body tabindex="0" style="outline: none">
<div id="root">
<div class="startup-loader" aria-hidden="true">
<div class="startup-loader__logo">
<svg class="startup-loader__base" viewBox="0 0 500 500" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
<path d="M330.34 313.62h-67.84c-7.65 0-13.85-6.2-13.85-13.85s6.2-13.85 13.85-13.85h67.84c7.65 0 13.85 6.2 13.85 13.85s-6.2 13.85-13.85 13.85Z"/>
<path d="M169.65 313.38c-2.36 0-4.74-.6-6.93-1.87-6.62-3.83-8.88-12.31-5.05-18.93l23.78-41.08-23.91-43.21c-3.7-6.69-1.28-15.12 5.41-18.82 6.69-3.71 15.12-1.28 18.82 5.41l31.51 56.94-31.64 54.65c-2.57 4.43-7.22 6.91-12 6.91Z"/>
<path d="M144.61 144.5c1.42-41.82 35.79-75.27 77.95-75.25 27.89.02 52.35 14.68 66.11 36.71 10.93-5.82 23.41-9.12 36.65-9.11 43.05.02 77.94 34.94 77.91 78 0 13.24-3.32 25.72-9.16 36.64 22.02 13.79 36.66 38.26 36.64 66.15-.02 42.16-33.52 76.48-75.34 77.86-1.42 41.82-35.78 75.28-77.94 75.25-27.89-.02-52.35-14.68-66.11-36.72-10.93 5.82-23.4 9.13-36.65 9.12-43.05-.02-77.94-34.94-77.91-78 0-13.24 3.32-25.72 9.16-36.64-22.02-13.79-36.65-38.26-36.64-66.15.02-42.16 33.51-76.48 75.33-77.86ZM297.77 71.99c-19.24-19.26-45.83-31.17-75.2-31.19-49.23-.03-90.67 33.39-102.84 78.79-45.41 12.12-78.87 53.52-78.9 102.76-.02 29.37 11.87 55.97 31.1 75.23-2.35 8.79-3.62 18.03-3.63 27.56-.03 58.77 47.58 106.44 106.35 106.47 9.53 0 18.77-1.25 27.55-3.6 19.24 19.26 45.84 31.18 75.21 31.2 49.24.03 90.67-33.39 102.84-78.8 45.42-12.11 78.88-53.51 78.91-102.75.02-29.37-11.87-55.98-31.11-75.24 2.35-8.78 3.62-18.02 3.63-27.55.03-58.77-47.58-106.44-106.35-106.47-9.53 0-18.77 1.25-27.56 3.59Z"/>
</svg>
<div class="startup-loader__overlay"></div>
</div>
</div>
</div>
${HOST_NAVIGATION_CONTROL_HTML}
<script>${HOST_NAVIGATION_CONTROL_SCRIPT}</script>
</body>
</html>`;
}

function buildRuntimeMetaTags(options: NormalizedCodexWebviewShellOptions): string {
    const tags = [
        `<meta name="codex-version" content="${escapeHtmlAttribute(options.extensionVersion)}">`,
        `<meta name="codex-session-id" content="${escapeHtmlAttribute(options.sessionId)}">`,
        `<meta name="codex-build-flavor" content="${escapeHtmlAttribute(options.buildFlavor)}">`,
        `<meta name="codex-view-kind" content="${escapeHtmlAttribute(options.viewKind)}">`
    ];
    if (options.initialRoute) {
        tags.push(`<meta name="initial-route" content="${escapeHtmlAttribute(options.initialRoute)}">`);
    }
    return tags.join('\n');
}

function removeRuntimeMetaTags(html: string): string {
    return ['codex-version', 'codex-session-id', 'codex-build-flavor', 'codex-view-kind', 'initial-route'].reduce((current, name) =>
        current.replace(new RegExp(`\\s*<meta\\s+name=["']${name}["'][^>]*>`, 'gi'), ''), html);
}

function rewriteRelativeAssetUrls(html: string, assetBase: string): string {
    const base = assetBase.replace(/\/$/, '');
    return html.replace(/\b(src|href)=(["'])\.\/([^"']+)\2/g, (_match, attribute: string, quote: string, relativePath: string) =>
        `${attribute}=${quote}${base}/${relativePath}${quote}`);
}

function appendWebviewIdToEntrypoint(html: string, webviewId: string): string {
    return html.replace(/<script\b(?=[^>]*\btype=["']module["'])(?=[^>]*\bsrc=)([^>]*)><\/script>/i, script =>
        script.replace(/\bsrc=(["'])([^"']+)\1/i, (_match, quote: string, src: string) =>
            `src=${quote}${appendQueryParam(src, 'webviewId', webviewId)}${quote}`));
}

function appendQueryParam(src: string, key: string, value: string): string {
    if (new RegExp(`(?:[?&])${escapeRegExp(key)}=`).test(src)) {
        return src;
    }
    const hashIndex = src.indexOf('#');
    const hash = hashIndex >= 0 ? src.slice(hashIndex) : '';
    const withoutHash = hashIndex >= 0 ? src.slice(0, hashIndex) : src;
    const separator = withoutHash.includes('?') ? '&' : '?';
    return `${withoutHash}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}${hash}`;
}

function injectRuntimeMetaTags(html: string, metaTags: string): string {
    if (/<meta\s+name=["']viewport["'][^>]*>/i.test(html)) {
        return html.replace(/(<meta\s+name=["']viewport["'][^>]*>)/i, `$1\n${metaTags}`);
    }
    return html.replace(/<\/head>/i, `${metaTags}\n</head>`);
}

function injectShimScript(html: string, shim: string): string {
    const shimScript = `<script>${shim}</script>`;
    if (/<script\b(?=[^>]*\btype=["']module["'])/i.test(html)) {
        return html.replace(/(<script\b(?=[^>]*\btype=["']module["'])[^>]*>)/i, `${shimScript}\n$1`);
    }
    return html.replace(/<\/head>/i, `${shimScript}\n</head>`);
}

function injectRuntimeThemeStyle(html: string): string {
    return html.replace(/<\/head>/i, `<style>${THEIA_THEME_STYLE}</style>\n</head>`);
}

function injectRuntimeThemeScript(html: string): string {
    const script = `<script>${THEIA_THEME_SCRIPT}</script>`;
    if (/<script\b(?=[^>]*\btype=["']module["'])/i.test(html)) {
        return html.replace(/(<script\b(?=[^>]*\btype=["']module["'])[^>]*>)/i, `${script}\n$1`);
    }
    return html.replace(/<\/head>/i, `${script}\n</head>`);
}

function injectHostNavigationControl(html: string): string {
    const withStyle = html.replace(/<\/head>/i, `<style>${HOST_NAVIGATION_CONTROL_STYLE}</style>\n</head>`);
    const controls = `${HOST_NAVIGATION_CONTROL_HTML}\n<script>${HOST_NAVIGATION_CONTROL_SCRIPT}</script>`;
    if (/<\/body>/i.test(withStyle)) {
        return withStyle.replace(/<\/body>/i, `${controls}\n</body>`);
    }
    return `${withStyle}\n${controls}`;
}

function escapeHtmlAttribute(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
