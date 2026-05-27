// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { Command, nls } from '@theia/core';

export const OUTPUT_CLEANER_ENABLE_COMMAND = Command.toLocalizedCommand({
    id: 'cybervinci.aiOutputCleaner.enable',
    category: nls.localize('theia/cybervinci/aiOutputCleaner/category', 'AI'),
    label: nls.localize('theia/cybervinci/aiOutputCleaner/enable', 'CyberVinci: Enable AI Output Cleaner')
}, 'theia/cybervinci/aiOutputCleaner/enableCommand', 'theia/ai-chat/category');

export const OUTPUT_CLEANER_DISABLE_COMMAND = Command.toLocalizedCommand({
    id: 'cybervinci.aiOutputCleaner.disable',
    category: nls.localize('theia/cybervinci/aiOutputCleaner/category', 'AI'),
    label: nls.localize('theia/cybervinci/aiOutputCleaner/disable', 'CyberVinci: Disable AI Output Cleaner')
}, 'theia/cybervinci/aiOutputCleaner/disableCommand', 'theia/ai-chat/category');

export const OUTPUT_CLEANER_EMERGENCY_DISABLE_COMMAND = Command.toLocalizedCommand({
    id: 'cybervinci.aiOutputCleaner.emergencyDisable',
    category: nls.localize('theia/cybervinci/aiOutputCleaner/category', 'AI'),
    label: nls.localize('theia/cybervinci/aiOutputCleaner/emergencyDisable',
        'CyberVinci: Emergency Disable AI Output Cleaner')
}, 'theia/cybervinci/aiOutputCleaner/emergencyDisableCommand', 'theia/ai-chat/category');

export const OUTPUT_CLEANER_SHOW_STATUS_COMMAND = Command.toLocalizedCommand({
    id: 'cybervinci.aiOutputCleaner.showStatus',
    category: nls.localize('theia/cybervinci/aiOutputCleaner/category', 'AI'),
    label: nls.localize('theia/cybervinci/aiOutputCleaner/status', 'CyberVinci: Show AI Output Cleaner Status')
}, 'theia/cybervinci/aiOutputCleaner/statusCommand', 'theia/ai-chat/category');

export const OUTPUT_CLEANER_OPEN_ARTIFACTS_COMMAND = Command.toLocalizedCommand({
    id: 'cybervinci.aiOutputCleaner.openArtifacts',
    category: nls.localize('theia/cybervinci/aiOutputCleaner/category', 'AI'),
    label: nls.localize('theia/cybervinci/aiOutputCleaner/openArtifacts', 'CyberVinci: Open AI Output Cleaner Artifacts')
}, 'theia/cybervinci/aiOutputCleaner/openArtifactsCommand', 'theia/ai-chat/category');

export const OUTPUT_CLEANER_RECREATE_WRAPPERS_COMMAND = Command.toLocalizedCommand({
    id: 'cybervinci.aiOutputCleaner.recreateWrappers',
    category: nls.localize('theia/cybervinci/aiOutputCleaner/category', 'AI'),
    label: nls.localize('theia/cybervinci/aiOutputCleaner/recreateWrappers', 'CyberVinci: Recreate AI Output Cleaner Wrappers')
}, 'theia/cybervinci/aiOutputCleaner/recreateWrappersCommand', 'theia/ai-chat/category');

export const OUTPUT_CLEANER_INSTALL_CODEX_HOOKS_COMMAND = Command.toLocalizedCommand({
    id: 'cybervinci.aiOutputCleaner.installCodexHooks',
    category: nls.localize('theia/cybervinci/aiOutputCleaner/category', 'AI'),
    label: nls.localize(
        'theia/cybervinci/aiOutputCleaner/installCodexHooks',
        'CyberVinci: Install AI Output Cleaner Codex Hooks'
    )
}, 'theia/cybervinci/aiOutputCleaner/installCodexHooksCommand', 'theia/ai-chat/category');

export const OUTPUT_CLEANER_REMOVE_CODEX_HOOKS_COMMAND = Command.toLocalizedCommand({
    id: 'cybervinci.aiOutputCleaner.removeCodexHooks',
    category: nls.localize('theia/cybervinci/aiOutputCleaner/category', 'AI'),
    label: nls.localize(
        'theia/cybervinci/aiOutputCleaner/removeCodexHooks',
        'CyberVinci: Remove AI Output Cleaner Codex Hooks'
    )
}, 'theia/cybervinci/aiOutputCleaner/removeCodexHooksCommand', 'theia/ai-chat/category');

export const OUTPUT_CLEANER_TOGGLE_SESSION_BYPASS_COMMAND = Command.toLocalizedCommand({
    id: 'cybervinci.aiOutputCleaner.toggleSessionBypass',
    category: nls.localize('theia/cybervinci/aiOutputCleaner/category', 'AI'),
    label: nls.localize(
        'theia/cybervinci/aiOutputCleaner/toggleSessionBypass',
        'CyberVinci: Temporarily Bypass AI Output Cleaner for This Chat'
    )
}, 'theia/cybervinci/aiOutputCleaner/toggleSessionBypassCommand', 'theia/ai-chat/category');

export const OUTPUT_CLEANER_SEND_RAW_OUTPUT_COMMAND = Command.toLocalizedCommand({
    id: 'cybervinci.aiOutputCleaner.sendRawOutput',
    category: nls.localize('theia/cybervinci/aiOutputCleaner/category', 'AI'),
    label: nls.localize(
        'theia/cybervinci/aiOutputCleaner/sendRawOutput',
        'CyberVinci: Send Raw Output to Agent'
    )
}, 'theia/cybervinci/aiOutputCleaner/sendRawOutputCommand', 'theia/ai-chat/category');
