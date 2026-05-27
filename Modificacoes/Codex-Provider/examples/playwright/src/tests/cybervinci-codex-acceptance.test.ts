// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect, test } from '@playwright/test';
import { TheiaAppLoader } from '../theia-app-loader';

test.describe('CyberVinci Codex acceptance', () => {

    let app: import('../theia-app').TheiaApp;

    test.beforeAll(async ({ playwright, browser }) => {
        app = await TheiaAppLoader.load({ playwright, browser });
    });

    test.afterAll(async () => {
        await app.page.close();
    });

    test('opens Codex sidebar webview shell', async () => {
        await app.quickCommandPalette.open();
        await app.quickCommandPalette.trigger('Codex: Open Codex Sidebar');
        const codexPanel = app.page.locator('.codex-webview-widget');
        await expect(codexPanel).toBeVisible({ timeout: 30_000 });

        const iframe = codexPanel.locator('iframe.codex-webview-iframe');
        await expect(iframe).toBeVisible();
    });

    test('registers chatgpt.newCodexPanel custom editor command', async () => {
        await app.quickCommandPalette.open();
        await app.quickCommandPalette.trigger('Codex: New Codex Panel');
        const editor = app.page.locator('.codex-conversation-editor-widget');
        await expect(editor).toBeVisible({ timeout: 30_000 });
    });
});
