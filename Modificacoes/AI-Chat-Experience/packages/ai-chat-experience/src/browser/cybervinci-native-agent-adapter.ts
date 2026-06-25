// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ChatAgent, MutableChatRequestModel } from '@theia/ai-chat/lib/common';
import { CyberVinciAgentDefinition } from '../common';

export interface CyberVinciAgentInvokeContext {
    request: MutableChatRequestModel;
    sourceAgentId: string;
}

export interface CyberVinciAgentRuntimeAdapter {
    readonly id: string;
    canHandle(agent: CyberVinciAgentDefinition): boolean;
    invoke(context: CyberVinciAgentInvokeContext): Promise<void>;
}

export class CyberVinciNativeTheiaAgentAdapter implements CyberVinciAgentRuntimeAdapter {

    readonly id = 'native-theia';

    constructor(protected readonly getSourceAgent: (sourceAgentId: string) => ChatAgent | undefined) {}

    canHandle(agent: CyberVinciAgentDefinition): boolean {
        return agent.kind === 'native' || agent.kind === 'delegate';
    }

    async invoke(context: CyberVinciAgentInvokeContext): Promise<void> {
        const source = this.getSourceAgent(context.sourceAgentId);
        if (!source) {
            throw new Error(`Source chat agent '${context.sourceAgentId}' is not available.`);
        }
        await source.invoke(context.request);
    }
}

