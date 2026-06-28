// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { contextBridge, ipcRenderer } from '@theia/core/electron-shared/electron';
import type { CodexElectronBridgeApi } from '../common/codex-electron-api';
import {
    CODEX_ELECTRON_DISMISS_HOTKEY_WINDOW,
    CODEX_ELECTRON_GET_BUILD_FLAVOR,
    CODEX_ELECTRON_GET_SHARED_OBJECT,
    CODEX_ELECTRON_TOGGLE_HOTKEY_WINDOW
} from '../common/codex-electron-ipc';

const api: CodexElectronBridgeApi = {
    dismissHotkeyWindow: () => ipcRenderer.invoke(CODEX_ELECTRON_DISMISS_HOTKEY_WINDOW),
    toggleHotkeyWindow: () => ipcRenderer.invoke(CODEX_ELECTRON_TOGGLE_HOTKEY_WINDOW),
    getBuildFlavor: () => ipcRenderer.sendSync(CODEX_ELECTRON_GET_BUILD_FLAVOR) as string,
    getSharedObjectSnapshotValue: key => ipcRenderer.sendSync(CODEX_ELECTRON_GET_SHARED_OBJECT, key)
};

export function preload(): void {
    console.log('exposing codex electron bridge api');
    contextBridge.exposeInMainWorld('codexElectronBridge', api);
}
