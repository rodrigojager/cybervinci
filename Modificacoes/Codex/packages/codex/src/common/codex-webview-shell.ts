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

export function readCodexAcquireVsCodeApiShim(): string {
    return CODEX_ACQUIRE_VSCODE_API_SHIM;
}

export function buildCodexWebviewShellHtml(options: { webviewId: string; initialRoute?: string; assetBase: string }): string {
    const initialRouteMeta = options.initialRoute
        ? `<meta name="initial-route" content="${escapeHtmlAttribute(options.initialRoute)}">`
        : '';
    const shim = readCodexAcquireVsCodeApiShim();
    const query = `?webviewId=${encodeURIComponent(options.webviewId)}`;
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Codex</title>
${initialRouteMeta}
<style>${STARTUP_LOADER_STYLE}</style>
<script>${shim}<\/script>
<link rel="modulepreload" crossorigin href="${options.assetBase}/assets/preload-helper-Bo9GmnuQ.js">
<link rel="modulepreload" crossorigin href="${options.assetBase}/assets/chunk-CFjPhJqf.js">
<link rel="modulepreload" crossorigin href="${options.assetBase}/assets/src-DpdPyvGM.js">
<script type="module" crossorigin src="${options.assetBase}/assets/index-DPtc3qk2.js${query}"><\/script>
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
</body>
</html>`;
}

function escapeHtmlAttribute(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
