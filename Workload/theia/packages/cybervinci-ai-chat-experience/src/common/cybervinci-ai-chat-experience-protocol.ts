// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

export * from './cybervinci-agent-definition';
export * from './cybervinci-tool-definition';
export * from './cybervinci-playbook-definition';
export * from './cybervinci-agent-catalog-protocol';

import type { CyberVinciAiChatExperienceService as CyberVinciAiChatExperienceServiceProtocol } from './cybervinci-agent-catalog-protocol';

export const CYBERVINCI_AI_CHAT_EXPERIENCE_SERVICE_PATH = '/services/cybervinci-ai-chat-experience';

export type CyberVinciAiChatExperienceService = CyberVinciAiChatExperienceServiceProtocol;
export const CyberVinciAiChatExperienceService = Symbol('CyberVinciAiChatExperienceService');
