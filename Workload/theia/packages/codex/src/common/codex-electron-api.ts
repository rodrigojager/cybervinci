// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

export interface CodexElectronBridgeApi {
    dismissHotkeyWindow(): Promise<void>;
    toggleHotkeyWindow(): Promise<void>;
    getBuildFlavor(): string;
    getSharedObjectSnapshotValue(key: string): unknown;
}

declare global {
    interface Window {
        codexElectronBridge?: CodexElectronBridgeApi;
    }
}
