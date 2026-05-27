// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { inject, injectable } from '@theia/core/shared/inversify';
import { FrontendLanguageModelRegistryImpl } from '@theia/ai-core/lib/browser/frontend-language-model-registry';
import { createToolCallError, ToolCallResult, ToolInvocationContext } from '@theia/ai-core/lib/common';
import { TheiaToolCallInterceptor } from './theia-tool-call-interceptor';

@injectable()
export class AIOutputCleanerFrontendLanguageModelRegistry extends FrontendLanguageModelRegistryImpl {

    @inject(TheiaToolCallInterceptor)
    protected readonly toolCallInterceptor: TheiaToolCallInterceptor;

    override async toolCall(id: string, toolId: string, argString: string, toolCallId?: string): Promise<ToolCallResult> {
        if (!this.requests.has(id)) {
            return createToolCallError(`No request found for ID '${id}'. The request may have been cancelled or completed.`);
        }
        const request = this.requests.get(id)!;
        const tool = request.tools?.find(candidate => candidate.id === toolId);
        if (!tool) {
            return createToolCallError(`Tool '${toolId}' not found in the available tools for this request.`, 'tool-not-available');
        }

        try {
            const rawResult = await tool.handler(argString, ToolInvocationContext.create(toolCallId));
            return await this.toolCallInterceptor.intercept(request, tool, argString, rawResult);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return createToolCallError(`Error executing tool '${toolId}': ${errorMessage}`);
        }
    }
}
