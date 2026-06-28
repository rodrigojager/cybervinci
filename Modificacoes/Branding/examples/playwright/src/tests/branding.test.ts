// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect, test } from '@playwright/test';
import { TheiaApp } from '../theia-app';
import { TheiaAppLoader } from '../theia-app-loader';

test.describe('CyberVinci product shell', () => {

    let app: TheiaApp;

    test.beforeAll(async ({ playwright, browser }) => {
        app = await TheiaAppLoader.load({ playwright, browser });
    });

    test.afterAll(async () => {
        await app.page.close();
    });

    test('exposes the unified CyberVinci menu and product feature entry points', async () => {
        const menuBarItems = await app.menuBar.visibleMenuBarItems();
        expect(menuBarItems).toContain('CyberVinci');

        let menu = await app.menuBar.openMenu('CyberVinci');
        const rootItems = await menu.visibleMenuItems();
        expect(rootItems).toContain('AI Chat');
        expect(rootItems).toContain('Canvas');
        expect(rootItems).toContain('Library');
        expect(rootItems).toContain('Memory');
        expect(rootItems).toContain('Arena');
        expect(rootItems).toContain('Flow');
        expect(rootItems).toContain('Builder');
        expect(rootItems).not.toContain('New Arena A/B Test');
        expect(rootItems).not.toContain('Open Documentation Manager');
        expect(rootItems).not.toContain('Product');
        await menu.close();

        await expectCyberVinciMenuPath(app, 'AI Chat', 'Open CyberVinci Chat');
        await expectCyberVinciMenuPath(app, 'Canvas', 'Canvas: New Design');
        await expectCyberVinciMenuPath(app, 'Library', 'Open Manager');
        await expectCyberVinciMenuPath(app, 'Memory', 'Code Graph');
        await expectCyberVinciMenuPath(app, 'Arena', 'New A/B Test');
        await expectCyberVinciMenuPath(app, 'Flow', 'Open Flow');
        await expectCyberVinciMenuPath(app, 'Builder', 'CyberVinci: New UI Page');
        await expectQuickCommand(app, 'Arena', 'Arena: New A/B Test');
        await expectQuickCommand(app, 'AI Output Cleaner', 'CyberVinci: Show AI Output Cleaner Status');
        await expectQuickCommand(app, 'AI Output Cleaner', 'CyberVinci: Enable AI Output Cleaner');
    });
});

async function expectCyberVinciMenuPath(app: TheiaApp, ...path: string[]): Promise<void> {
    const menu = await app.menuBar.openMenu('CyberVinci');
    expect(await menu.menuItemByNamePath(...path)).toBeDefined();
    await menu.close();
}

async function expectQuickCommand(app: TheiaApp, filter: string, commandName: string): Promise<void> {
    await app.quickCommandPalette.type(filter);
    const visibleCommands = await Promise.all((await app.quickCommandPalette.visibleItems()).map(async item => item.textContent()));
    expect(visibleCommands.some(item => item?.includes(commandName))).toBe(true);
    await app.quickCommandPalette.hide();
}
