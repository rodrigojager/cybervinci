// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

// @ts-check

describe('CyberVinci Codex Provider integration', function () {
    this.timeout(10_000);
    const { assert } = chai;
    const { container } = window.theia;
    const { WidgetManager } = require('@theia/core/lib/browser');
    const { CommandRegistry } = require('@theia/core/lib/common/command');
    const { FrontendApplicationConfigProvider } = require('@theia/core/lib/browser/frontend-application-config-provider');
    const { LanguageModelRegistry, PromptService } = require('@theia/ai-core/lib/common');
    const { CodexProviderConfigurationWidget } = require('@cybervinci/codex-provider/lib/browser/codex-provider-configuration-widget');

    it('uses the CyberVinci product name', () => {
        assert.equal(FrontendApplicationConfigProvider.get().applicationName, 'CyberVinci');
    });

    it('registers the Codex Provider language model provider and configuration widget', async () => {
        const registry = container.get(LanguageModelRegistry);
        const models = await registry.getLanguageModels();
        assert.isDefined(models.find(model => model.id === 'codex-provider'), 'Codex Provider model should be registered.');

        const widgetManager = container.get(WidgetManager);
        const widget = await widgetManager.getOrCreateWidget(CodexProviderConfigurationWidget.ID);
        assert.equal(widget.title.label, 'Codex Provider');
    });

    it('registers Codex Provider recovery and thread controls', () => {
        const commands = container.get(CommandRegistry);
        assert.isDefined(commands.getCommand('chat:codex-provider-restart'), 'Restart command should be registered.');

        const promptService = container.get(PromptService);
        for (const commandName of ['restart', 'compact', 'newthread', 'thread', 'continue', 'retry']) {
            assert.isDefined(
                promptService.getPromptFragmentByCommandName(commandName),
                `/${commandName} slash command should be registered.`
            );
        }
    });
});
