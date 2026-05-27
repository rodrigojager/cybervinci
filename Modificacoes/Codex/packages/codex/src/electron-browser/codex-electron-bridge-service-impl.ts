// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable } from '@theia/core/shared/inversify';
import { ipcRenderer } from '@theia/electron/shared/electron';
import {
    CODEX_ELECTRON_DISMISS_HOTKEY_WINDOW,
    CODEX_ELECTRON_GET_BUILD_FLAVOR,
    CODEX_ELECTRON_GET_SHARED_OBJECT,
    CODEX_ELECTRON_TOGGLE_HOTKEY_WINDOW
} from '../common/codex-electron-ipc';
import { CodexElectronBridgeService as CodexElectronBridgeServiceInterface } from '../common/codex-electron-bridge-service';

@injectable()
export class CodexElectronBridgeServiceImpl implements CodexElectronBridgeServiceInterface {

    async dismissHotkeyWindow(): Promise<void> {
        await ipcRenderer.invoke(CODEX_ELECTRON_DISMISS_HOTKEY_WINDOW);
    }

    async toggleHotkeyWindow(): Promise<void> {
        await ipcRenderer.invoke(CODEX_ELECTRON_TOGGLE_HOTKEY_WINDOW);
    }

    getBuildFlavor(): string {
        return ipcRenderer.sendSync(CODEX_ELECTRON_GET_BUILD_FLAVOR) as string;
    }

    getSharedObjectSnapshotValue(key: string): unknown {
        return ipcRenderer.sendSync(CODEX_ELECTRON_GET_SHARED_OBJECT, key);
    }
}
