// *****************************************************************************
// Copyright (C) 2026 EclipseSource and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect, test, type Locator } from '@playwright/test';
import * as fs from 'fs-extra';
import * as path from 'path';
import { TheiaApp } from '../theia-app';
import { TheiaAppLoader } from '../theia-app-loader';
import { TheiaWorkspace } from '../theia-workspace';
import { OSUtil } from '../util';

const DESIGN_FILE = 'canvas-acceptance.op';
const UPDATED_TITLE = 'Persisted acceptance title';
const CTA_ID = 'acceptance-cta-label';
const CTA_LABEL = 'Acceptance CTA label';
const CTA_TEXT = 'Persisted CTA';
const ACCEPTANCE_PAGE_ID = 'acceptance-details-page';
const ACCEPTANCE_PAGE_NAME = 'Acceptance Details';
const ACCEPTANCE_PAGE_TEXT_ID = 'acceptance-details-title';
const ACCEPTANCE_PAGE_TEXT = 'Acceptance second page';
const GESTURE_BOX_ID = 'gesture-box';
const GESTURE_PEER_ID = 'gesture-peer';
const GESTURE_LAYER_ID = 'gesture-layer';
const GESTURE_PATH_ID = 'gesture-path';

const STRUCTURED_ACCEPTANCE_COMMAND = [
    {
        operation: 'updateNode',
        nodeId: 'hero-title',
        changes: {
            content: UPDATED_TITLE,
            fontSize: 44,
            x: 148
        }
    },
    {
        operation: 'addNode',
        node: {
            id: CTA_ID,
            type: 'text',
            name: CTA_LABEL,
            x: 180,
            y: 330,
            width: 220,
            height: 32,
            content: CTA_TEXT,
            fontSize: 20,
            fill: [{ type: 'solid', color: '#0f172a' }]
        }
    },
    {
        operation: 'setSelection',
        nodeIds: ['hero-title', CTA_ID]
    }
];

const PAGE_SWITCH_COMMAND = [
    {
        operation: 'addPage',
        page: {
            id: ACCEPTANCE_PAGE_ID,
            name: ACCEPTANCE_PAGE_NAME,
            width: 720,
            height: 420,
            background: '#f8fafc',
            children: [
                {
                    id: ACCEPTANCE_PAGE_TEXT_ID,
                    type: 'text',
                    name: 'Acceptance details title',
                    x: 80,
                    y: 96,
                    width: 360,
                    height: 48,
                    content: ACCEPTANCE_PAGE_TEXT,
                    fontSize: 28,
                    fill: [{ type: 'solid', color: '#111827' }]
                }
            ]
        },
        makeActive: true
    },
    {
        operation: 'setActivePage',
        pageId: ACCEPTANCE_PAGE_ID
    }
];

const GESTURE_SETUP_COMMAND = [
    {
        operation: 'addNode',
        node: {
            id: GESTURE_BOX_ID,
            type: 'rectangle',
            name: 'Gesture box',
            x: 260,
            y: 360,
            width: 90,
            height: 60,
            fill: [{ type: 'solid', color: '#fde68a' }],
            stroke: { color: '#92400e', width: 1 }
        }
    },
    {
        operation: 'addNode',
        node: {
            id: GESTURE_PEER_ID,
            type: 'rectangle',
            name: 'Gesture peer',
            x: 380,
            y: 360,
            width: 84,
            height: 60,
            fill: [{ type: 'solid', color: '#bfdbfe' }],
            stroke: { color: '#1d4ed8', width: 1 }
        }
    },
    {
        operation: 'addNode',
        node: {
            id: GESTURE_LAYER_ID,
            type: 'rectangle',
            name: 'Gesture layer',
            x: 530,
            y: 380,
            width: 82,
            height: 70,
            fill: [{ type: 'solid', color: '#bbf7d0' }],
            stroke: { color: '#15803d', width: 1 }
        }
    },
    {
        operation: 'addNode',
        node: {
            id: GESTURE_PATH_ID,
            type: 'path',
            name: 'Gesture Bezier path',
            x: 170,
            y: 430,
            width: 150,
            height: 100,
            d: 'M 0 80 C 45 10 105 10 150 80',
            anchors: [
                { x: 0, y: 80, handleIn: null, handleOut: { x: 45, y: -70 } },
                { x: 150, y: 80, handleIn: { x: -45, y: -70 }, handleOut: null }
            ],
            fill: [{ type: 'solid', color: 'none' }],
            stroke: { color: '#7c3aed', width: 3 }
        }
    },
    {
        operation: 'setSelection',
        nodeIds: []
    }
];

test.describe('OpenPencil browser acceptance', () => {

    let app: TheiaApp;
    let workspace: TheiaWorkspace;

    test.setTimeout(300_000);

    test.beforeAll(async ({ playwright, browser }) => {
        workspace = new TheiaWorkspace();
        app = await TheiaAppLoader.load({ playwright, browser }, workspace);
        await app.page.setViewportSize({ width: 1600, height: 1100 });
    });

    test.afterAll(async () => {
        await app.page.close();
        workspace.remove();
    });

    test('opens a design from CyberVinci, applies structured commands, saves, and reopens', async () => {
        await forceOpenPencilLocalFallback(app);
        await openCanvasDesignFromCyberVinciMenu(app);
        const shellMode = await expectOpenPencilEditor(app);
        await expectOpenPencilOriginalChrome(app, shellMode);
        if (shellMode === 'fallback') {
            await expectOpenPencilPropertyControls(app);
            await expectOpenPencilPanelResize(app);
            await expectOpenPencilPopovers(app);
        }
        await expectOpenPencilThemeContrast(app, shellMode);

        await expectAiCommandPaletteEntryVisible(app);
        await expectFigmaImportCommandPaletteEntryVisible(app);
        await applyStructuredCommand(app);
        await expectLayerVisible(app, CTA_ID, CTA_LABEL);
        await expectCanvasVisible(app);
        await selectLayersForExport(app, [
            { id: 'hero-title', label: 'Hero title' },
            { id: CTA_ID, label: CTA_LABEL }
        ]);
        await expectExportCodegenUiVisible(app);
        await exportGeneratedFilesFromUi(app, workspace);

        const firstPageId = readSavedDesign(workspace).activePageId;
        if (!firstPageId) {
            throw new Error('The demo design did not have an active first page id before page switching.');
        }
        await applyStructuredCommand(app, PAGE_SWITCH_COMMAND);
        await expectActivePageVisible(app, ACCEPTANCE_PAGE_NAME);
        await expectLayerVisible(app, ACCEPTANCE_PAGE_TEXT_ID, 'Acceptance details title');
        await applyStructuredCommand(app, [
            {
                operation: 'setActivePage',
                pageId: firstPageId
            },
            {
                operation: 'setSelection',
                nodeIds: ['hero-title', CTA_ID]
            }
        ]);
        await expectActivePageVisible(app, 'Page 1');
        await expectLayerVisible(app, CTA_ID, CTA_LABEL);

        await saveActiveEditor(app);
        await expectSavedDocument(workspace);

        await closeActiveEditor(app);
        await reopenDesignFromExplorer(app);

        await expectOpenPencilEditor(app);
        await expectLayerVisible(app, CTA_ID, CTA_LABEL);
        await expectCanvasVisible(app);
        await selectLayersForExport(app, [
            { id: 'hero-title', label: 'Hero title' },
            { id: CTA_ID, label: CTA_LABEL }
        ]);
        await expectExportCodegenUiVisible(app);
        await expectSavedDocument(workspace);

        if (shellMode === 'fallback') {
            await exerciseOpenPencilGestures(app);
            await expectCanvasVisible(app);
            await saveActiveEditor(app);
            await expectGestureDocument(workspace);
        }
    });
});

async function forceOpenPencilLocalFallback(app: TheiaApp): Promise<void> {
    await app.page.evaluate(() => {
        window.localStorage.setItem('openpencil.forceLocalFallback', 'true');
        (window as typeof window & { openPencilForceLocalFallback?: boolean }).openPencilForceLocalFallback = true;
    });
    await app.page.reload();
    await app.waitForShellAndInitialized();
}

async function openCanvasDesignFromCyberVinciMenu(app: TheiaApp): Promise<void> {
    await app.page.keyboard.press('Escape');
    await app.quickCommandPalette.open();
    await app.quickCommandPalette.trigger('Canvas: New Design');
    const input = app.page.locator('.quick-input-widget .monaco-inputbox .input');
    await expect(input).toBeVisible();
    await input.pressSequentially(DESIGN_FILE.replace('.op', ''), { delay: 20 });
    await input.press('Enter');
}

async function applyStructuredCommand(app: TheiaApp, command: unknown = STRUCTURED_ACCEPTANCE_COMMAND): Promise<void> {
    await app.quickCommandPalette.type('Canvas: Apply Structured Command');
    await app.quickCommandPalette.trigger('Canvas: Apply Structured Command');

    const input = app.page.locator('.quick-input-widget .monaco-inputbox .input');
    await expect(input).toBeVisible();
    await expect(input).toHaveValue(/^\{/);
    await input.fill(JSON.stringify(command));
    await input.press('Enter');
    await expect(app.page.locator('.quick-input-widget')).toBeHidden();
}

async function expectAiCommandPaletteEntryVisible(app: TheiaApp): Promise<void> {
    await app.quickCommandPalette.type('Canvas: Generate with AI');
    const items = await app.quickCommandPalette.visibleItems();
    const labels = await Promise.all(items.map(item => item.innerText()));
    expect(labels).toContain('Canvas: Generate with AI');
    await app.quickCommandPalette.hide();
}

async function expectFigmaImportCommandPaletteEntryVisible(app: TheiaApp): Promise<void> {
    await app.quickCommandPalette.type('Canvas: Import Figma JSON');
    const items = await app.quickCommandPalette.visibleItems();
    const labels = await Promise.all(items.map(item => item.innerText()));
    expect(labels).toContain('Canvas: Import Figma JSON');
    await app.quickCommandPalette.hide();
}

async function saveActiveEditor(app: TheiaApp): Promise<void> {
    await expect(app.page.locator('.theia-app-main .lm-TabBar-tab.lm-mod-current.theia-mod-dirty')).toBeVisible({ timeout: 10_000 });
    const fileMenu = await app.menuBar.openMenu('File');
    const saveItem = await fileMenu.menuItemByName('Save');
    if (!saveItem || !await saveItem.isEnabled()) {
        throw new Error('File > Save was not enabled for the dirty OpenPencil editor.');
    }
    await saveItem.click();
    await expect(app.page.locator('.theia-app-main .lm-TabBar-tab.lm-mod-current.theia-mod-dirty')).toHaveCount(0, { timeout: 10_000 });
}

async function closeActiveEditor(app: TheiaApp): Promise<void> {
    await app.page.locator('.theia-app-main .lm-TabBar-tab.lm-mod-current .lm-TabBar-tabCloseIcon').click();
    await expect(app.page.locator('.openpencil-editor-widget')).toHaveCount(0, { timeout: 10_000 });
}

async function reopenDesignFromExplorer(app: TheiaApp): Promise<void> {
    const explorerTab = app.page.locator('#shell-tab-explorer-view-container').first();
    if (await explorerTab.count()) {
        await explorerTab.click();
    }
    const explorerFile = app.page.locator(`#explorer-view-container--files .theia-FileStatNode:has-text("${DESIGN_FILE}")`).first();
    if (await explorerFile.isVisible().catch(() => false)) {
        await explorerFile.dblclick();
        return;
    }

    await app.page.keyboard.press(OSUtil.isMacOS ? 'Meta+P' : 'Control+P');
    const input = app.page.locator('.quick-input-widget .monaco-inputbox .input');
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.pressSequentially(DESIGN_FILE);
    const match = app.page.locator('.quick-input-widget .monaco-list-row').filter({ hasText: DESIGN_FILE }).first();
    await expect(match).toBeVisible({ timeout: 10_000 });
    await match.click();
    await expect(app.page.locator('.quick-input-widget')).toBeHidden({ timeout: 10_000 });
}

async function expectOpenPencilEditor(app: TheiaApp): Promise<'fallback' | 'runtime'> {
    const editor = app.page.locator('.openpencil-editor-widget');
    await expect(editor).toBeVisible({ timeout: 20_000 });
    await expect(editor.getByText('Layers', { exact: true }).first()).toBeVisible({ timeout: 20_000 });
    const fallbackVisible = await editor.locator('.openpencil-shell[data-testid="openpencil-local-shell"], .openpencil-topbar').first().isVisible().catch(() => false);
    const shellMode = fallbackVisible ? 'fallback' : 'runtime';
    if (shellMode === 'fallback') {
        await expect(editor.locator('.openpencil-shell[data-testid="openpencil-local-shell"], .openpencil-topbar').first()).toBeVisible({ timeout: 20_000 });
    } else {
        await expect(editor.locator('.openpencil-sdk-shell').first()).toBeVisible({ timeout: 20_000 });
    }
    return shellMode;
}

async function expectOpenPencilOriginalChrome(app: TheiaApp, shellMode: 'fallback' | 'runtime'): Promise<void> {
    const editor = app.page.locator('.openpencil-editor-widget');
    await expect(editor.locator('.openpencil-topbar, .openpencil-sdk-topbar').first()).toBeVisible({ timeout: 20_000 });
    await expect(editor.locator('.openpencil-toolbar, .openpencil-sdk-toolbar').first()).toBeVisible({ timeout: 20_000 });
    await expect(editor.locator('.openpencil-layers, .openpencil-sdk-workspace > .bg-card.border-r').first()).toBeVisible({ timeout: 20_000 });
    await expect(editor.locator('.openpencil-status, .openpencil-sdk-status-cluster').first()).toBeVisible({ timeout: 20_000 });
    if (shellMode === 'fallback') {
        await expect(editor.locator('.openpencil-properties, .openpencil-sdk-workspace > .w-64.border-l').first()).toBeVisible({ timeout: 20_000 });
    }

    const metrics = await editor.evaluate(root => {
        const bounds = (selector: string) => {
            const element = root.querySelector(selector);
            const rect = element?.getBoundingClientRect();
            return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : undefined;
        };
        return {
            topbar: bounds('.openpencil-topbar, .openpencil-sdk-topbar'),
            toolbar: bounds('.openpencil-toolbar, .openpencil-sdk-toolbar'),
            layers: bounds('.openpencil-layers, .openpencil-sdk-workspace > .bg-card.border-r'),
            properties: bounds('.openpencil-properties, .openpencil-sdk-workspace > .w-64.border-l'),
            status: bounds('.openpencil-status, .openpencil-sdk-status-cluster')
        };
    });

    expect(metrics.topbar?.height).toBeGreaterThanOrEqual(36);
    expect(metrics.topbar?.height).toBeLessThanOrEqual(44);
    expect(metrics.toolbar?.width).toBeLessThanOrEqual(48);
    expect(metrics.toolbar?.height).toBeGreaterThan(metrics.toolbar?.width ?? 0);
    expect(metrics.layers?.width).toBeGreaterThanOrEqual(180);
    expect(metrics.layers?.width).toBeLessThanOrEqual(260);
    if (shellMode === 'fallback') {
        expect(metrics.properties?.width).toBeGreaterThanOrEqual(236);
        expect(metrics.properties?.width).toBeLessThanOrEqual(280);
    }
    expect(metrics.status?.y).toBeGreaterThan((metrics.topbar?.y ?? 0) + (metrics.topbar?.height ?? 0));
}

async function expectOpenPencilPropertyControls(app: TheiaApp): Promise<void> {
    const editor = app.page.locator('.openpencil-editor-widget');
    await expect(editor.locator('.openpencil-property-grid')).toBeVisible({ timeout: 20_000 });
    expectPropertyControlMetrics(await readPropertyControlMetrics(editor), 'page properties');

    await editor.locator('.openpencil-layer[data-layer-id="hero-title"] .openpencil-layer-select').first().click();
    await expect(editor.locator('.openpencil-status-details')).toContainText('1 selected', { timeout: 10_000 });
    expectPropertyControlMetrics(await readPropertyControlMetrics(editor), 'node properties');
}

async function readPropertyControlMetrics(editor: Locator): Promise<PropertyControlMetrics> {
    return editor.evaluate(root => {
        const controls = Array.from(root.querySelectorAll('.openpencil-property-grid input, .openpencil-property-grid select, .openpencil-property-grid textarea'));
        const box = (element: Element) => {
            const rect = element.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        };
        return {
            textLike: controls
                .filter(element => !(element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'color')))
                .map(box),
            checkboxes: controls
                .filter((element): element is HTMLInputElement => element instanceof HTMLInputElement && element.type === 'checkbox')
                .map(box),
            colors: controls
                .filter((element): element is HTMLInputElement => element instanceof HTMLInputElement && element.type === 'color')
                .map(box)
        };
    });
}

function expectPropertyControlMetrics(metrics: PropertyControlMetrics, label: string): void {
    expect(metrics.textLike.length, `${label} text-like controls`).toBeGreaterThan(0);
    expect(metrics.textLike.every(control => control.height <= 80), `${label} text inputs should stay compact`).toBe(true);
    expect(metrics.checkboxes.every(control => control.width <= 24 && control.height <= 24), `${label} checkboxes should not stretch`).toBe(true);
    expect(metrics.colors.every(control => control.width <= 64 && control.height <= 34), `${label} color inputs should stay swatches`).toBe(true);
}

async function expectOpenPencilPanelResize(app: TheiaApp): Promise<void> {
    const editor = app.page.locator('.openpencil-editor-widget');
    const layers = editor.locator('.openpencil-layers').first();
    const handle = editor.locator('.openpencil-panel-resize-handle-right').first();
    await expect(handle).toBeVisible({ timeout: 20_000 });
    const initial = await layers.boundingBox();
    if (!initial) {
        throw new Error('Expected OpenPencil layers panel to have a visible bounding box.');
    }
    const center = await locatorCenter(handle);
    await app.page.mouse.move(center.x, center.y);
    await app.page.mouse.down();
    await app.page.mouse.move(center.x + 34, center.y, { steps: 5 });
    await app.page.mouse.up();
    await expect.poll(async () => (await layers.boundingBox())?.width ?? 0, { timeout: 10_000 })
        .toBeGreaterThan(initial.width + 20);
}

async function expectOpenPencilPopovers(app: TheiaApp): Promise<void> {
    const editor = app.page.locator('.openpencil-editor-widget');
    const shapeTrigger = editor.locator('.openpencil-tool-dropdown summary[title="Shape tools"]').first();
    await expect(shapeTrigger).toBeVisible({ timeout: 20_000 });
    await shapeTrigger.click();
    await expect(editor.locator('.openpencil-shape-menu')).toBeVisible({ timeout: 10_000 });
    await expect(editor.locator('.openpencil-shape-menu').getByText('Rectangle')).toBeVisible();
    await shapeTrigger.click();

    const fileTrigger = editor.locator('.openpencil-file-menu-trigger').first();
    await expect(fileTrigger).toBeVisible({ timeout: 20_000 });
    await fileTrigger.click();
    await expect(editor.locator('.openpencil-file-menu')).toBeVisible({ timeout: 10_000 });
    await expect(editor.locator('.openpencil-file-menu').getByText('Import Figma')).toBeVisible();
    await fileTrigger.click();
}

async function expectOpenPencilThemeContrast(app: TheiaApp, shellMode: 'fallback' | 'runtime'): Promise<void> {
    for (const theme of ['Light (Theia)', 'Dark (Theia)']) {
        await selectColorTheme(app, theme);
        const result = await app.page.locator('.openpencil-editor-widget').evaluate((root, rootMode: 'fallback' | 'runtime') => {
            const selectors = [
                '.openpencil-topbar, .openpencil-sdk-topbar',
                '.openpencil-toolbar, .openpencil-sdk-toolbar',
                '.openpencil-layers-header',
                '.openpencil-layer-select',
                '.openpencil-status-details, .openpencil-sdk-status-detail'
            ];
            if (rootMode === 'fallback') {
                selectors.push('.openpencil-properties-header');
            }
            const contrast = (fg: number[], bg: number[]) => {
                const luminance = (rgb: number[]) => {
                    const linear = rgb.slice(0, 3).map(channel => {
                        const value = channel / 255;
                        return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
                    });
                    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
                };
                const first = luminance(fg);
                const second = luminance(bg);
                return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
            };
            const parseRgb = (value: string): number[] | undefined => {
                const match = value.match(/rgba?\(([^)]+)\)/);
                if (!match) {
                    return undefined;
                }
                const channels = match[1].split(',').map(part => Number(part.trim().split(' ')[0]));
                return channels.length >= 3 && channels.every(channel => Number.isFinite(channel)) ? channels : undefined;
            };
            const backgroundFor = (element: Element): number[] | undefined => {
                let current: Element | null = element;
                while (current) {
                    const color = getComputedStyle(current).backgroundColor;
                    const rgb = parseRgb(color);
                    if (rgb && (rgb[3] === undefined || rgb[3] > 0)) {
                        return rgb;
                    }
                    current = current.parentElement;
                }
                return parseRgb(getComputedStyle(document.body).backgroundColor);
            };
            const samples = selectors.map(selector => {
                const element = root.querySelector(selector);
                if (!element) {
                    return { selector, ratio: 0, missing: true };
                }
                const style = getComputedStyle(element);
                const fg = parseRgb(style.color);
                const bg = backgroundFor(element);
                return { selector, ratio: fg && bg ? contrast(fg, bg) : 0 };
            });
            const presentSamples = samples.filter(sample => !sample.missing && sample.ratio > 0);
            return {
                samples: presentSamples,
                minRatio: Math.min(...presentSamples.map(sample => sample.ratio))
            };
        }, shellMode);
        expect(result.minRatio, `${theme} contrast samples: ${JSON.stringify(result.samples)}`).toBeGreaterThanOrEqual(3);
    }
}

async function selectColorTheme(app: TheiaApp, label: string): Promise<void> {
    await app.quickCommandPalette.type('Color Theme', true);
    const input = app.page.locator('.quick-input-widget .monaco-inputbox .input');
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill(label);
    await app.page.keyboard.press('Enter');
    await expect.poll(() => app.page.evaluate(() => document.body.className), { timeout: 10_000 })
        .toContain(label.startsWith('Light') ? 'theia-light' : 'theia-dark');
}

async function exerciseOpenPencilGestures(app: TheiaApp): Promise<void> {
    const editor = app.page.locator('.openpencil-editor-widget');
    await expect(editor.locator('[data-testid="openpencil-local-shell"]')).toBeVisible({ timeout: 20_000 });

    await applyStructuredCommand(app, GESTURE_SETUP_COMMAND);
    await expectLayerVisible(app, GESTURE_BOX_ID, 'Gesture box');
    await expectLayerVisible(app, GESTURE_PEER_ID, 'Gesture peer');
    await expectLayerVisible(app, GESTURE_LAYER_ID, 'Gesture layer');
    await expectLayerVisible(app, GESTURE_PATH_ID, 'Gesture Bezier path');

    await dragCanvasNode(app, { x: 305, y: 390 }, { x: 345, y: 410 });
    await expect(editor.locator('.openpencil-status-details')).toContainText('X 300 Y 380');

    await dragSvgLocator(app, editor.locator(`.openpencil-resize-handle[data-node-id="${GESTURE_BOX_ID}"][data-resize-handle="se"]`), 30, 20);
    await expect(editor.locator('.openpencil-status-details')).toContainText('W 120 H 80');

    await selectLayer(app, GESTURE_BOX_ID);
    await selectLayer(app, GESTURE_PEER_ID, ['Control']);
    await expect(editor.locator('.openpencil-status-details')).toContainText('2 selected');
    await editor.locator('button[title="Group selection"]').click();
    const group = editor.locator('.openpencil-layer.selected[data-layer-type="group"]').first();
    await expect(group).toBeVisible({ timeout: 10_000 });
    const groupId = await group.getAttribute('data-layer-id');
    if (!groupId) {
        throw new Error('Grouped selection did not expose a group layer id.');
    }
    await editor.locator('button[title="Ungroup selection"]').click();
    await expect(editor.locator(`.openpencil-layer[data-layer-id="${groupId}"]`)).toHaveCount(0);
    await expectLayerVisible(app, GESTURE_BOX_ID, 'Gesture box');
    await expectLayerVisible(app, GESTURE_PEER_ID, 'Gesture peer');

    await selectLayer(app, GESTURE_LAYER_ID);
    await editor.locator('button[title="Bring to front"]').click();
    await expect.poll(async () => lastTopLevelLayerId(app), { timeout: 10_000 }).toBe(GESTURE_LAYER_ID);

    const visibilityButton = editor.locator(`button[data-layer-action="visibility"][data-layer-id="${GESTURE_LAYER_ID}"]`);
    await visibilityButton.click();
    await expect(editor.locator(`.openpencil-layer[data-layer-id="${GESTURE_LAYER_ID}"]`)).toHaveAttribute('data-layer-visible', 'false');
    await expect(editor.locator(`[data-node-id="${GESTURE_LAYER_ID}"]`)).toHaveCount(0);
    await visibilityButton.click();
    await expect(editor.locator(`.openpencil-layer[data-layer-id="${GESTURE_LAYER_ID}"]`)).toHaveAttribute('data-layer-visible', 'true');
    await expect(editor.locator(`[data-node-id="${GESTURE_LAYER_ID}"]`).first()).toBeVisible();

    const lockButton = editor.locator(`button[data-layer-action="lock"][data-layer-id="${GESTURE_LAYER_ID}"]`);
    await lockButton.click();
    await expect(editor.locator(`.openpencil-layer[data-layer-id="${GESTURE_LAYER_ID}"]`)).toHaveAttribute('data-layer-locked', 'true');
    await dragCanvasNode(app, { x: 571, y: 415 }, { x: 620, y: 455 });
    await expect(editor.locator('.openpencil-status-details')).toContainText('X 530 Y 380');

    await selectLayer(app, GESTURE_PATH_ID);
    await dragSvgLocator(app, editor.locator(`.openpencil-path-handle[data-node-id="${GESTURE_PATH_ID}"][data-anchor-index="0"][data-path-handle="out"]`), 20, -18);
    await expect(editor.locator(`.openpencil-path-handle[data-node-id="${GESTURE_PATH_ID}"][data-anchor-index="0"][data-path-handle="out"]`)).toBeVisible();

    await exercisePanAndZoom(app);
}

async function exercisePanAndZoom(app: TheiaApp): Promise<void> {
    const editor = app.page.locator('.openpencil-editor-widget');
    const wrap = editor.locator('[data-testid="openpencil-canvas-wrap"]');
    const zoomLabel = editor.locator('.openpencil-zoom-label');
    await expect(zoomLabel).toHaveText('100%');

    const wrapCenter = await locatorCenter(wrap);
    await app.page.mouse.move(wrapCenter.x, wrapCenter.y);
    await app.page.keyboard.down('Control');
    await app.page.mouse.wheel(0, -240);
    await app.page.keyboard.up('Control');
    if (await zoomLabel.textContent() === '100%') {
        await editor.locator('button[title="Zoom in"]').click();
    }
    await expect(zoomLabel).not.toHaveText('100%');

    for (let index = 0; index < 8; index++) {
        const hasOverflow = await wrap.evaluate(element => element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight);
        if (hasOverflow) {
            break;
        }
        await editor.locator('button[title="Zoom in"]').click();
    }
    await expect.poll(() => wrap.evaluate(element => element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight), { timeout: 10_000 }).toBe(true);

    const before = await wrap.evaluate(element => {
        element.scrollLeft = 20;
        element.scrollTop = 20;
        return { left: element.scrollLeft, top: element.scrollTop };
    });
    const panStart = await locatorCenter(wrap);
    await app.page.mouse.move(panStart.x, panStart.y);
    await app.page.mouse.down({ button: 'middle' });
    await app.page.mouse.move(panStart.x - 80, panStart.y - 60, { steps: 6 });
    await app.page.mouse.up({ button: 'middle' });
    await expect.poll(() => wrap.evaluate(element => ({ left: element.scrollLeft, top: element.scrollTop })), { timeout: 10_000 })
        .not.toEqual(before);
}

async function selectLayer(app: TheiaApp, layerId: string, modifiers: Array<'Alt' | 'Control' | 'Meta' | 'Shift'> = []): Promise<void> {
    const editor = app.page.locator('.openpencil-editor-widget');
    await editor.locator(`.openpencil-layer[data-layer-id="${layerId}"] .openpencil-layer-select`).first().click({ modifiers });
}

async function lastTopLevelLayerId(app: TheiaApp): Promise<string | null> {
    return app.page.locator('.openpencil-editor-widget .openpencil-layers > .openpencil-layer')
        .last()
        .getAttribute('data-layer-id');
}

async function dragCanvasNode(app: TheiaApp, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
    const start = await canvasClientPoint(app, from);
    const end = await canvasClientPoint(app, to);
    await app.page.mouse.move(start.x, start.y);
    await app.page.mouse.down();
    await app.page.mouse.move(end.x, end.y, { steps: 8 });
    await app.page.mouse.up();
}

async function dragSvgLocator(app: TheiaApp, locator: Locator, deltaX: number, deltaY: number): Promise<void> {
    await expect(locator).toBeVisible({ timeout: 10_000 });
    const center = await locatorCenter(locator);
    await app.page.mouse.move(center.x, center.y);
    await app.page.mouse.down();
    await app.page.mouse.move(center.x + deltaX, center.y + deltaY, { steps: 6 });
    await app.page.mouse.up();
}

async function canvasClientPoint(app: TheiaApp, point: { x: number; y: number }): Promise<{ x: number; y: number }> {
    const canvas = app.page.locator('.openpencil-editor-widget [data-testid="openpencil-local-canvas"]');
    return canvas.evaluate((element, canvasPoint) => {
        const svg = element as SVGSVGElement;
        const rect = svg.getBoundingClientRect();
        const viewBox = svg.viewBox.baseVal;
        return {
            x: rect.left + ((canvasPoint.x - viewBox.x) / viewBox.width) * rect.width,
            y: rect.top + ((canvasPoint.y - viewBox.y) / viewBox.height) * rect.height
        };
    }, point);
}

async function locatorCenter(locator: Locator): Promise<{ x: number; y: number }> {
    const box = await locator.boundingBox();
    if (!box) {
        throw new Error('Expected locator to have a visible bounding box.');
    }
    return {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2
    };
}

async function expectLayerVisible(app: TheiaApp, layerId: string, layerLabel: string): Promise<void> {
    const editor = app.page.locator('.openpencil-editor-widget');
    const legacy = editor.locator(`[data-layer-id="${layerId}"], .openpencil-layer-select[title="${layerLabel}"]`).first();
    if (await legacy.count()) {
        await expect(legacy).toBeVisible({ timeout: 20_000 });
        return;
    }
    await expect(layerRuntimeLabel(editor, layerLabel)).toBeVisible({ timeout: 20_000 });
}

async function selectLayersForExport(app: TheiaApp, layers: Array<{ id: string; label: string }>): Promise<void> {
    const editor = app.page.locator('.openpencil-editor-widget');
    for (const [index, layerInfo] of layers.entries()) {
        const legacy = editor.locator(`.openpencil-layer[data-layer-id="${layerInfo.id}"] .openpencil-layer-select, .openpencil-layer-select[title="${layerInfo.label}"]`).first();
        const layer = await legacy.count() ? legacy : layerRuntimeLabel(editor, layerInfo.label);
        await layer.click(index === 0 ? {} : { modifiers: ['Control'] });
    }
    await expect(editor.locator('.openpencil-status-details, .openpencil-sdk-status-detail').first()).toContainText(`${layers.length} selected`, { timeout: 10_000 });
    await expect(editor.locator('button[title="Export selection to React"]')).toBeEnabled({ timeout: 10_000 });
}

function layerRuntimeLabel(editor: Locator, layerLabel: string): Locator {
    return editor
        .locator('.openpencil-layers, .openpencil-sdk-workspace > .bg-card.border-r')
        .first()
        .getByText(layerLabel, { exact: true })
        .first();
}

async function expectCanvasVisible(app: TheiaApp): Promise<void> {
    const editor = app.page.locator('.openpencil-editor-widget');
    const surface = editor.locator('.openpencil-runtime-canvas canvas, .openpencil-canvas').first();
    await expect(surface).toBeVisible({ timeout: 20_000 });
    await expectCanvasSurfaceNotBlank(surface);
}

async function expectCanvasSurfaceNotBlank(surface: Locator): Promise<void> {
    const result = await surface.evaluate(element => {
        if (element instanceof HTMLCanvasElement) {
            if (!element.width || !element.height) {
                return { kind: 'canvas', nonEmpty: false, reason: 'zero-size' };
            }
            const context = element.getContext('2d');
            if (!context) {
                return { kind: 'canvas', nonEmpty: true, reason: 'pixel-sampling-unavailable' };
            }
            const width = Math.min(element.width, 96);
            const height = Math.min(element.height, 96);
            const data = context.getImageData(0, 0, width, height).data;
            let paintedPixels = 0;
            for (let offset = 0; offset < data.length; offset += 4) {
                const red = data[offset];
                const green = data[offset + 1];
                const blue = data[offset + 2];
                const alpha = data[offset + 3];
                if (alpha > 0 && (red !== 255 || green !== 255 || blue !== 255)) {
                    paintedPixels++;
                }
            }
            return { kind: 'canvas', nonEmpty: paintedPixels > 0, paintedPixels };
        }
        if (element instanceof SVGSVGElement) {
            const graphics = element.querySelectorAll('rect,text,ellipse,line,path,image,polygon,g').length;
            const bounds = element.getBBox();
            return {
                kind: 'svg',
                nonEmpty: graphics > 1 && bounds.width > 0 && bounds.height > 0,
                graphics,
                width: bounds.width,
                height: bounds.height
            };
        }
        return { kind: element.tagName.toLowerCase(), nonEmpty: element.childElementCount > 0 };
    });

    expect(result.nonEmpty, JSON.stringify(result)).toBe(true);
}

async function expectExportCodegenUiVisible(app: TheiaApp): Promise<void> {
    const editor = app.page.locator('.openpencil-editor-widget');
    await expect(editor.locator('button[title="Export document to HTML"]')).toBeVisible({ timeout: 20_000 });
    await expect(editor.locator('button[title="Export selection to React"]')).toBeVisible({ timeout: 20_000 });
    await expect(editor.locator('button[title="Export selection to React"]')).toBeEnabled();
    await expect(editor.locator('button[title="Export document to SVG"]')).toBeVisible({ timeout: 20_000 });
    await expect(editor.locator('select[title="Export target"]')).toBeVisible({ timeout: 20_000 });
    await expect(editor.locator('select[title="Export target"]')).toContainText('Jetpack Compose');
    await expect(editor.locator('select[title="Export target"]')).toContainText('Canvas Summary JSON');
    await expect(editor.locator('select[title="Export scope"]')).toBeVisible({ timeout: 20_000 });
    await expect(editor.locator('select[title="Export scope"]')).toContainText('Selection only');
    await expect(editor.locator('.openpencil-export-adapter')).toContainText('pen-codegen-direct');
    await expect(editor.locator('button.openpencil-export-run')).toBeVisible({ timeout: 20_000 });
}

async function exportGeneratedFilesFromUi(app: TheiaApp, workspace: TheiaWorkspace): Promise<void> {
    const editor = app.page.locator('.openpencil-editor-widget');

    await editor.locator('button[title="Export document to HTML"]').first().click();
    await expectExportFile(workspace, file => file.endsWith('.html'), ['<!DOCTYPE html>', UPDATED_TITLE, CTA_TEXT]);

    await editor.locator('button[title="Export selection to React"]').first().click();
    await expectExportFile(workspace, file => file.endsWith('.selection.tsx'), ['export function OpenPencilDesign()', 'style={{', CTA_TEXT]);

    await editor.locator('button[title="Export document to SVG"]').first().click();
    await expectExportFile(workspace, file => file.endsWith('.svg'), ['<svg xmlns="http://www.w3.org/2000/svg"', UPDATED_TITLE, CTA_TEXT]);

    const targetSelect = editor.locator('select[title="Export target"]').first();
    await targetSelect.selectOption('jetpack-compose');
    await expect(targetSelect).toHaveValue('jetpack-compose');
    await expect(editor.locator('.openpencil-export-meta')).toContainText('.kt');
    await editor.locator('button.openpencil-export-run').first().click();
    await expectExportFile(workspace, file => file.endsWith('.kt'), ['fun OpenPencilDesign()', UPDATED_TITLE, CTA_TEXT]);
}

async function expectExportFile(workspace: TheiaWorkspace, predicate: (file: string) => boolean, markers: string[]): Promise<void> {
    await expect.poll(() => {
        const files = fs.readdirSync(workspace.path).filter(predicate);
        const content = files.map(file => fs.readFileSync(path.join(workspace.path, file), 'utf8')).join('\n');
        return markers.every(marker => content.includes(marker));
    }, { timeout: 10_000 }).toBe(true);
}

async function expectActivePageVisible(app: TheiaApp, pageName: string): Promise<void> {
    const editor = app.page.locator('.openpencil-editor-widget');
    await expect(editor.getByText(pageName, { exact: true }).first()).toBeVisible({ timeout: 20_000 });
}

async function expectSavedDocument(workspace: TheiaWorkspace): Promise<void> {
    await expect.poll(() => {
        const document = readSavedDesign(workspace);
        const title = findNode(document, 'hero-title');
        const cta = findNode(document, CTA_ID);
        const acceptancePage = document.pages?.find(page => page.id === ACCEPTANCE_PAGE_ID);
        const acceptanceTitle = findNode(document, ACCEPTANCE_PAGE_TEXT_ID);
        return {
            title: title?.content,
            titleX: title?.x,
            cta: cta?.content,
            ctaType: cta?.type,
            activePageId: document.activePageId,
            pageCount: document.pages?.length ?? 0,
            firstPageLayerCount: document.pages?.[0]?.children?.length ?? 0,
            acceptancePageName: acceptancePage?.name,
            acceptancePageLayerCount: acceptancePage?.children?.length ?? 0,
            acceptanceTitle: acceptanceTitle?.content
        };
    }, { timeout: 10_000 }).toEqual({
        title: UPDATED_TITLE,
        titleX: 148,
        cta: CTA_TEXT,
        ctaType: 'text',
        activePageId: expect.any(String),
        pageCount: 2,
        firstPageLayerCount: 4,
        acceptancePageName: ACCEPTANCE_PAGE_NAME,
        acceptancePageLayerCount: 1,
        acceptanceTitle: ACCEPTANCE_PAGE_TEXT
    });
}

async function expectGestureDocument(workspace: TheiaWorkspace): Promise<void> {
    await expect.poll(() => {
        const document = readSavedDesign(workspace);
        const box = findNode(document, GESTURE_BOX_ID);
        const layer = findNode(document, GESTURE_LAYER_ID);
        const pathNode = findNode(document, GESTURE_PATH_ID);
        const firstPageChildren = document.pages?.[0]?.children ?? [];
        return {
            boxX: box?.x,
            boxY: box?.y,
            boxWidth: box?.width,
            boxHeight: box?.height,
            layerX: layer?.x,
            layerY: layer?.y,
            layerVisible: layer?.visible ?? true,
            layerLocked: layer?.locked ?? false,
            frontLayerId: firstPageChildren[firstPageChildren.length - 1]?.id,
            pathHandleOut: pathNode?.anchors?.[0]?.handleOut
        };
    }, { timeout: 10_000 }).toEqual({
        boxX: 300,
        boxY: 380,
        boxWidth: 120,
        boxHeight: 80,
        layerX: 530,
        layerY: 380,
        layerVisible: true,
        layerLocked: true,
        frontLayerId: GESTURE_LAYER_ID,
        pathHandleOut: { x: 65, y: -88 }
    });
}

function readSavedDesign(workspace: TheiaWorkspace): OpenPencilAcceptanceDocument {
    const filePath = path.join(workspace.path, DESIGN_FILE);
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as OpenPencilAcceptanceDocument;
}

function findNode(document: OpenPencilAcceptanceDocument, nodeId: string): OpenPencilAcceptanceNode | undefined {
    const visit = (nodes: OpenPencilAcceptanceNode[] | undefined): OpenPencilAcceptanceNode | undefined => {
        for (const node of nodes ?? []) {
            if (node.id === nodeId) {
                return node;
            }
            const child = visit(node.children);
            if (child) {
                return child;
            }
        }
        return undefined;
    };
    for (const page of document.pages ?? []) {
        const node = visit(page.children);
        if (node) {
            return node;
        }
    }
    return undefined;
}

interface OpenPencilAcceptanceDocument {
    readonly activePageId?: string;
    readonly pages?: Array<{
        readonly id?: string;
        readonly name?: string;
        readonly children?: OpenPencilAcceptanceNode[];
    }>;
}

interface OpenPencilAcceptanceNode {
    readonly id: string;
    readonly type?: string;
    readonly content?: string;
    readonly x?: number;
    readonly y?: number;
    readonly width?: number;
    readonly height?: number;
    readonly visible?: boolean;
    readonly locked?: boolean;
    readonly anchors?: Array<{
        readonly handleOut?: { readonly x: number; readonly y: number } | null;
    }>;
    readonly children?: OpenPencilAcceptanceNode[];
}

interface PropertyControlMetrics {
    readonly textLike: Array<{ readonly width: number; readonly height: number }>;
    readonly checkboxes: Array<{ readonly width: number; readonly height: number }>;
    readonly colors: Array<{ readonly width: number; readonly height: number }>;
}
