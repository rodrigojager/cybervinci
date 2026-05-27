// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { PreferenceSchema } from '@theia/core/lib/common/preferences';

export const CODEX_EXTENSION_PREFERENCE_SCOPE = 'codexExtension';

export const CodexExtensionPreferences = {
    COMMENT_CODE_LENS_ENABLED: 'chatgpt.commentCodeLensEnabled',
    CLI_EXECUTABLE: 'chatgpt.cliExecutable',
    OPEN_ON_STARTUP: 'chatgpt.openOnStartup',
    FOLLOW_UP_QUEUE_MODE: 'chatgpt.followUpQueueMode',
    COMPOSER_ENTER_BEHAVIOR: 'chatgpt.composerEnterBehavior',
    REVIEW_DELIVERY: 'chatgpt.reviewDelivery',
    LOCALE_OVERRIDE: 'chatgpt.localeOverride',
    RUN_IN_WSL: 'chatgpt.runCodexInWindowsSubsystemForLinux',
    USE_OFFICIAL_WEBVIEW: 'cybervinci.codex.useOfficialWebview'
} as const;

export const CodexExtensionPreferencesSchema: PreferenceSchema = {
    properties: {
        [CodexExtensionPreferences.COMMENT_CODE_LENS_ENABLED]: {
            type: 'boolean',
            default: true,
            description: 'Show "Implement with Codex" CodeLens on TODO comments.'
        },
        [CodexExtensionPreferences.CLI_EXECUTABLE]: {
            type: 'string',
            description: 'Path to the Codex Provider executable.'
        },
        [CodexExtensionPreferences.OPEN_ON_STARTUP]: {
            type: 'boolean',
            default: false,
            description: 'Open Codex sidebar on startup.'
        },
        [CodexExtensionPreferences.FOLLOW_UP_QUEUE_MODE]: {
            type: 'string',
            enum: ['queue', 'steer'],
            default: 'queue'
        },
        [CodexExtensionPreferences.COMPOSER_ENTER_BEHAVIOR]: {
            type: 'string',
            enum: ['send', 'newline'],
            default: 'send'
        },
        [CodexExtensionPreferences.REVIEW_DELIVERY]: {
            type: 'string',
            enum: ['inline', 'detached'],
            default: 'inline'
        },
        [CodexExtensionPreferences.LOCALE_OVERRIDE]: {
            type: 'string',
            description: 'Override locale for Codex UI.'
        },
        [CodexExtensionPreferences.RUN_IN_WSL]: {
            type: 'boolean',
            default: false,
            description: 'Run Codex Provider inside WSL on Windows.'
        },
        [CodexExtensionPreferences.USE_OFFICIAL_WEBVIEW]: {
            type: 'boolean',
            default: true,
            description: 'Use official Codex webview instead of native React sidebar.'
        }
    }
};

export const CHATGPT_CONFIGURATION_KEYS = [
    CodexExtensionPreferences.COMMENT_CODE_LENS_ENABLED,
    CodexExtensionPreferences.CLI_EXECUTABLE,
    CodexExtensionPreferences.OPEN_ON_STARTUP,
    CodexExtensionPreferences.FOLLOW_UP_QUEUE_MODE,
    CodexExtensionPreferences.COMPOSER_ENTER_BEHAVIOR,
    CodexExtensionPreferences.REVIEW_DELIVERY,
    CodexExtensionPreferences.LOCALE_OVERRIDE,
    CodexExtensionPreferences.RUN_IN_WSL
] as const;
