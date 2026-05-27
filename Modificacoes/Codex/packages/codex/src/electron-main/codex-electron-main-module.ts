// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ContainerModule, injectable } from '@theia/core/shared/inversify';
import {
    BrowserWindow,
    globalShortcut,
    ipcMain,
    session
} from '@theia/electron/shared/electron';
import { ElectronMainApplication, ElectronMainApplicationContribution } from '@theia/core/lib/electron-main/electron-main-application';
import { ElectronSecurityToken } from '@theia/core/lib/electron-common/electron-token';
import { CODEX_WEBVIEW_STATIC_PATH } from '../common/codex-host-protocol';
import {
    CODEX_ELECTRON_DICTATION_HOLD,
    CODEX_ELECTRON_DICTATION_TOGGLE,
    CODEX_ELECTRON_DISMISS_HOTKEY_WINDOW,
    CODEX_ELECTRON_GET_BUILD_FLAVOR,
    CODEX_ELECTRON_GET_SHARED_OBJECT,
    CODEX_ELECTRON_SET_SHARED_OBJECT,
    CODEX_ELECTRON_TOGGLE_HOTKEY_WINDOW
} from '../common/codex-electron-ipc';

const DEFAULT_HOTKEY_ACCELERATOR = 'CommandOrControl+Shift+Space';
const DEFAULT_DICTATION_HOLD_ACCELERATOR = 'CommandOrControl+Shift+D';
const DEFAULT_DICTATION_TOGGLE_ACCELERATOR = 'CommandOrControl+Shift+T';

@injectable()
export class CodexElectronBridgeService {

    protected readonly sharedObjects = new Map<string, unknown>();

    getSharedObjectSnapshotValue(key: string): unknown {
        return this.sharedObjects.get(key);
    }

    setSharedObjectSnapshotValue(key: string, value: unknown): void {
        if (value === undefined) {
            this.sharedObjects.delete(key);
            return;
        }
        this.sharedObjects.set(key, value);
    }
}

@injectable()
export class CodexHotkeyWindowService implements ElectronMainApplicationContribution {

    protected readonly electronBridge = new CodexElectronBridgeService();

    protected app: ElectronMainApplication | undefined;
    protected hotkeyWindow: BrowserWindow | undefined;
    protected dictationHoldActive = false;

    async onStart(app: ElectronMainApplication): Promise<void> {
        this.app = app;
        this.registerIpcHandlers();
        this.registerGlobalShortcuts();
    }

    onStop(): void {
        globalShortcut.unregisterAll();
        if (this.hotkeyWindow && !this.hotkeyWindow.isDestroyed()) {
            this.hotkeyWindow.close();
        }
        this.hotkeyWindow = undefined;
    }

    protected registerIpcHandlers(): void {
        ipcMain.on(CODEX_ELECTRON_GET_SHARED_OBJECT, (event, key: string) => {
            event.returnValue = this.electronBridge.getSharedObjectSnapshotValue(key);
        });
        ipcMain.on(CODEX_ELECTRON_GET_BUILD_FLAVOR, event => {
            event.returnValue = 'theia-electron';
        });
        ipcMain.handle(CODEX_ELECTRON_SET_SHARED_OBJECT, (_event, key: string, value: unknown) => {
            this.electronBridge.setSharedObjectSnapshotValue(key, value);
        });
        ipcMain.handle(CODEX_ELECTRON_DISMISS_HOTKEY_WINDOW, async () => {
            this.hideHotkeyWindow();
        });
        ipcMain.handle(CODEX_ELECTRON_TOGGLE_HOTKEY_WINDOW, async () => {
            await this.toggleHotkeyWindow();
        });
        ipcMain.handle(CODEX_ELECTRON_DICTATION_HOLD, async (_event, active: boolean) => {
            this.dictationHoldActive = active === true;
            console.info(`[Codex] global dictation hold: ${this.dictationHoldActive}`);
        });
        ipcMain.handle(CODEX_ELECTRON_DICTATION_TOGGLE, async () => {
            this.dictationHoldActive = !this.dictationHoldActive;
            console.info(`[Codex] global dictation toggle: ${this.dictationHoldActive}`);
        });
    }

    protected registerGlobalShortcuts(): void {
        const hotkey = process.env.CODEX_HOTKEY_WINDOW_ACCELERATOR ?? DEFAULT_HOTKEY_ACCELERATOR;
        const dictationHold = process.env.CODEX_DICTATION_HOLD_ACCELERATOR ?? DEFAULT_DICTATION_HOLD_ACCELERATOR;
        const dictationToggle = process.env.CODEX_DICTATION_TOGGLE_ACCELERATOR ?? DEFAULT_DICTATION_TOGGLE_ACCELERATOR;
        this.registerShortcut(hotkey, () => {
            void this.toggleHotkeyWindow();
        });
        this.registerShortcut(dictationHold, () => {
            this.dictationHoldActive = true;
        });
        this.registerShortcut(dictationToggle, () => {
            this.dictationHoldActive = !this.dictationHoldActive;
        });
    }

    protected registerShortcut(accelerator: string, handler: () => void): void {
        try {
            const registered = globalShortcut.register(accelerator, handler);
            if (!registered) {
                console.warn(`[Codex] Failed to register global shortcut: ${accelerator}`);
            }
        } catch (error) {
            console.warn(`[Codex] Global shortcut registration error (${accelerator})`, error);
        }
    }

    protected async toggleHotkeyWindow(): Promise<void> {
        if (this.hotkeyWindow && !this.hotkeyWindow.isDestroyed()) {
            if (this.hotkeyWindow.isVisible()) {
                this.hideHotkeyWindow();
            } else {
                this.hotkeyWindow.show();
                this.hotkeyWindow.focus();
            }
            return;
        }
        await this.createHotkeyWindow();
    }

    protected hideHotkeyWindow(): void {
        if (this.hotkeyWindow && !this.hotkeyWindow.isDestroyed()) {
            this.hotkeyWindow.hide();
        }
    }

    protected async createHotkeyWindow(): Promise<void> {
        const app = this.app;
        if (!app) {
            return;
        }
        const port = await app.backendPort;
        const url = `http://localhost:${port}${CODEX_WEBVIEW_STATIC_PATH}/shell?webviewId=hotkey-window&initialRoute=${encodeURIComponent('/hotkey-window')}`;
        await this.setElectronSecurityTokenCookie(`http://localhost:${port}`);
        this.hotkeyWindow = new BrowserWindow({
            width: 720,
            height: 520,
            show: true,
            frame: false,
            alwaysOnTop: true,
            skipTaskbar: true,
            resizable: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });
        this.hotkeyWindow.on('blur', () => {
            this.hideHotkeyWindow();
        });
        await this.hotkeyWindow.loadURL(url);
    }

    protected async setElectronSecurityTokenCookie(url: string): Promise<void> {
        const token = (global as Record<string, unknown>)[ElectronSecurityToken];
        if (!token) {
            console.warn('[Codex] Electron security token is not available for the hotkey window.');
            return;
        }
        await session.defaultSession.cookies.set({
            url,
            name: ElectronSecurityToken,
            value: JSON.stringify(token),
            httpOnly: true,
            sameSite: 'no_restriction'
        });
    }
}

@injectable()
export class CodexGlobalDictationService implements ElectronMainApplicationContribution {

    onStart(): void {
        // Dictation hotkeys are registered by CodexHotkeyWindowService.
    }
}

export default new ContainerModule(bind => {
    bind(CodexElectronBridgeService).toSelf().inSingletonScope();
    bind(CodexHotkeyWindowService).toSelf().inSingletonScope();
    bind(CodexGlobalDictationService).toSelf().inSingletonScope();
    bind(ElectronMainApplicationContribution).toService(CodexHotkeyWindowService);
    bind(ElectronMainApplicationContribution).toService(CodexGlobalDictationService);
});
