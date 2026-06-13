// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import * as express from '@theia/core/shared/express';
import * as fs from '@theia/core/shared/fs-extra';
import * as nodePath from 'path';
import { injectable } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { Application, Request, Response } from '@theia/core/shared/express';
import { CODEX_OFFICIAL_EXTENSION_VERSION, CODEX_WEBVIEW_STATIC_PATH } from '../common/codex-host-protocol';
import { buildCodexWebviewShellHtml } from '../common/codex-webview-shell';

@injectable()
export class CodexWebviewStaticContribution implements BackendApplicationContribution {

    protected readonly webviewRoot: string;
    protected readonly sessionId: string;

    constructor() {
        this.webviewRoot = this.resolveWebviewRoot();
        this.sessionId = this.createSessionId();
    }

    protected resolveWebviewRoot(): string {
        try {
            const packageJsonPath = require.resolve('@cybervinci/codex/package.json');
            return nodePath.join(nodePath.dirname(packageJsonPath), 'resources/webview');
        } catch {
            return nodePath.resolve(__dirname, '../../resources/webview');
        }
    }

    configure(app: Application): void {
        app.get(`${CODEX_WEBVIEW_STATIC_PATH}/shell`, (request: Request, response: Response) => {
            const webviewId = typeof request.query.webviewId === 'string' ? request.query.webviewId : 'default';
            const initialRoute = typeof request.query.initialRoute === 'string' ? request.query.initialRoute : undefined;
            const viewKind = this.normalizeViewKind(request.query.viewKind);
            response.type('html').send(buildCodexWebviewShellHtml({
                webviewId,
                initialRoute,
                viewKind,
                assetBase: CODEX_WEBVIEW_STATIC_PATH,
                officialIndexHtml: this.readOfficialIndexHtml(),
                sessionId: this.sessionId,
                extensionVersion: CODEX_OFFICIAL_EXTENSION_VERSION,
                buildFlavor: 'prod'
            }));
        });

        if (fs.existsSync(this.webviewRoot)) {
            app.use(CODEX_WEBVIEW_STATIC_PATH, express.static(this.webviewRoot, { fallthrough: true }));
        } else {
            app.use(CODEX_WEBVIEW_STATIC_PATH, (_req, res) => {
                res.status(503).send('Codex webview assets missing. Run: node scripts/copy-codex-webview.js');
            });
        }
    }

    protected readOfficialIndexHtml(): string | undefined {
        const indexHtmlPath = nodePath.join(this.webviewRoot, 'index.html');
        if (!fs.existsSync(indexHtmlPath)) {
            return undefined;
        }
        return fs.readFileSync(indexHtmlPath, 'utf8');
    }

    protected createSessionId(): string {
        return `theia-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    }

    protected normalizeViewKind(value: unknown): 'sidebar' | 'editor' | 'hotkey' {
        return value === 'editor' || value === 'hotkey' ? value : 'sidebar';
    }
}
