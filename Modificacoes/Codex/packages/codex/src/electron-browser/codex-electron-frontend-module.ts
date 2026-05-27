// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ContainerModule } from '@theia/core/shared/inversify';
import { CodexElectronBridgeService } from '../common/codex-electron-bridge-service';
import { CodexElectronBridgeServiceImpl } from './codex-electron-bridge-service-impl';

export default new ContainerModule(bind => {
    bind(CodexElectronBridgeServiceImpl).toSelf().inSingletonScope();
    bind(CodexElectronBridgeService).toService(CodexElectronBridgeServiceImpl);
});
