// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable } from '@theia/core/shared/inversify';
import type { CodexElectronBridgeApi } from '../common/codex-electron-api';
import { CodexElectronBridgeService as CodexElectronBridgeServiceInterface } from '../common/codex-electron-bridge-service';

@injectable()
export class CodexElectronBridgeServiceImpl implements CodexElectronBridgeServiceInterface {

    protected get api(): CodexElectronBridgeApi | undefined {
        return window.codexElectronBridge;
    }

    async dismissHotkeyWindow(): Promise<void> {
        await this.api?.dismissHotkeyWindow();
    }

    async toggleHotkeyWindow(): Promise<void> {
        await this.api?.toggleHotkeyWindow();
    }

    getBuildFlavor(): string {
        return this.api?.getBuildFlavor() ?? 'theia-electron';
    }

    getSharedObjectSnapshotValue(key: string): unknown {
        return this.api?.getSharedObjectSnapshotValue(key);
    }
}
