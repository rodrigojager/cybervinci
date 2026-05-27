// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ContainerModule } from '@theia/core/shared/inversify';
import { CommandContribution, MenuContribution } from '@theia/core/lib/common';
import { BrandingContribution } from './branding-contribution';

import '../../src/browser/style/branding.css';
import '../../src/browser/style/cybervinci-ai-chat-codex.css';

export default new ContainerModule(bind => {
    bind(BrandingContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(BrandingContribution);
    bind(MenuContribution).toService(BrandingContribution);
});
