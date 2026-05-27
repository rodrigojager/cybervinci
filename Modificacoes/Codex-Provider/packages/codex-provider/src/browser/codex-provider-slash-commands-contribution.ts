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
const COMMAND_FRAGMENT_PREFIX = 'codex-provider-slash-';

@injectable()
export class CodexProviderSlashCommandsContribution implements FrontendApplicationContribution {

    @inject(PromptService)
    protected readonly promptService: PromptService;

    onStart(): void {
        this.registerCommand('login', nls.localize('theia/codex-provider/slash/login', 'Start ChatGPT login for Codex Provider'));
        this.registerCommand('status', nls.localize('theia/codex-provider/slash/status', 'Show Codex Provider provider status'));
        this.registerCommand('restart', nls.localize('theia/codex-provider/slash/restart', 'Restart the Codex Provider app-server'));
        this.registerCommand('config', nls.localize('theia/codex-provider/slash/config', 'Configure Codex Provider provider defaults'));
        this.registerCommand('output', nls.localize('theia/codex-provider/slash/output', 'Show the Codex Provider output channel'));
        this.registerCommand('compact', nls.localize('theia/codex-provider/slash/compact', 'Compact the current Codex Provider thread context'));
        this.registerCommand('newthread', nls.localize('theia/codex-provider/slash/newthread', 'Start a new Codex Provider thread for this chat'));
        this.registerCommand('thread', nls.localize('theia/codex-provider/slash/thread', 'Assign a Codex Provider thread id to this chat'), '<thread-id>');
        this.registerCommand('continue', nls.localize('theia/codex-provider/slash/continue', 'Continue the previous Codex Provider task'));
        this.registerCommand('retry', nls.localize('theia/codex-provider/slash/retry', 'Retry the previous CyberVinci request'));
        this.registerCommand('readonly', nls.localize('theia/codex-provider/slash/readonly', 'Run the next Codex Provider turn read-only'));
        this.registerCommand('workspace', nls.localize('theia/codex-provider/slash/workspace', 'Run the next Codex Provider turn with workspace write access'));
        this.registerCommand('fullaccess', nls.localize('theia/codex-provider/slash/fullaccess', 'Run the next Codex Provider turn with full local access'));
        this.registerCommand('plan', nls.localize('theia/codex-provider/slash/plan', 'Run the next Codex Provider turn in plan mode'));
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
