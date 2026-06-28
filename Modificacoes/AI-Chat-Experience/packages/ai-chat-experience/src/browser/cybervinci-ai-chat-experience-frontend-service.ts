// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { RemoteConnectionProvider, ServiceConnectionProvider } from '@theia/core/lib/browser';
import { interfaces } from '@theia/core/shared/inversify';
import {
    CYBERVINCI_AI_CHAT_EXPERIENCE_SERVICE_PATH,
    CyberVinciAiChatExperienceClient,
    CyberVinciAiChatExperienceService
} from '../common';

export function createCyberVinciAiChatExperienceService(
    container: interfaces.Container,
    client?: CyberVinciAiChatExperienceClient
): CyberVinciAiChatExperienceService {
    const provider = container.get<ServiceConnectionProvider>(RemoteConnectionProvider);
    return provider.createProxy<CyberVinciAiChatExperienceService>(CYBERVINCI_AI_CHAT_EXPERIENCE_SERVICE_PATH, client);
}
