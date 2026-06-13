// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { PromptService } from '@theia/ai-core/lib/common/prompt-service';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { inject, injectable } from '@theia/core/shared/inversify';
import { nls } from '@theia/core';

const OPEN_CODER_AGENT_ID = 'OpenCoder';
const COMMAND_FRAGMENT_PREFIX = 'ai-providers-slash-';

@injectable()
export class CodexProviderSlashCommandsContribution implements FrontendApplicationContribution {

    @inject(PromptService)
    protected readonly promptService: PromptService;

    onStart(): void {
        this.registerCommand('login', nls.localize('theia/ai-providers/slash/login', 'Configure authentication for the active CyberVinci AI provider'));
        this.registerCommand('status', nls.localize('theia/ai-providers/slash/status', 'Show CyberVinci AI provider status'));
        this.registerCommand('restart', nls.localize('theia/ai-providers/slash/restart', 'Refresh the active CyberVinci AI provider runtime'));
        this.registerCommand('config', nls.localize('theia/ai-providers/slash/config', 'Configure CyberVinci AI provider defaults'));
        this.registerCommand('output', nls.localize('theia/ai-providers/slash/output', 'Show the CyberVinci AI Providers output channel'));
        this.registerCommand('compact', nls.localize('theia/ai-providers/slash/compact', 'Compact the current provider thread context'));
        this.registerCommand('newthread', nls.localize('theia/ai-providers/slash/newthread', 'Start a new provider thread for this chat'));
        this.registerCommand('thread', nls.localize('theia/ai-providers/slash/thread', 'Assign a provider thread id to this chat'), '<thread-id>');
        this.registerCommand('continue', nls.localize('theia/ai-providers/slash/continue', 'Continue the previous provider task'));
        this.registerCommand('retry', nls.localize('theia/ai-providers/slash/retry', 'Retry the previous CyberVinci request'));
        this.registerCommand('readonly', nls.localize('theia/ai-providers/slash/readonly', 'Run the next provider turn read-only'));
        this.registerCommand('workspace', nls.localize('theia/ai-providers/slash/workspace', 'Run the next provider turn with workspace write access'));
        this.registerCommand('fullaccess', nls.localize('theia/ai-providers/slash/fullaccess', 'Run the next provider turn with full local access'));
        this.registerCommand('plan', nls.localize('theia/ai-providers/slash/plan', 'Run the next provider turn in plan mode'));
        this.registerCommand('flow', nls.localize('theia/ai-providers/slash/flow', 'Start the selected CyberVinci Flow workflow with this prompt'), '<prompt> | <workflowId>: <prompt>');
        this.registerCommand('flow-dynamic', nls.localize('theia/ai-providers/slash/flowDynamic', 'Let CyberVinci Flow choose or create a workflow for this prompt'), '<prompt>');
    }

    protected registerCommand(name: string, description: string, argumentHint?: string): void {
        this.promptService.addBuiltInPromptFragment({
            id: `${COMMAND_FRAGMENT_PREFIX}${name}`,
            template: `/${name}`,
            isCommand: true,
            commandName: name,
            commandDescription: description,
            commandArgumentHint: argumentHint,
            commandAgents: [OPEN_CODER_AGENT_ID]
        });
    }
}
