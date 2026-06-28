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
            description: 'Enable CodeLens above TODO comments to implement with Codex.'
        },
        [CodexExtensionPreferences.CLI_EXECUTABLE]: {
            type: ['string', 'null'],
            default: null,
            description: 'DEVELOPMENT ONLY: Path to the Codex CLI executable. You do NOT need to set this unless you are actively developing the Codex CLI. If set this manually, parts of the extension may not work as expected.'
        },
        [CodexExtensionPreferences.OPEN_ON_STARTUP]: {
            type: 'boolean',
            default: false,
            description: 'Focus the Codex sidebar when the extension finishes starting up.'
        },
        [CodexExtensionPreferences.FOLLOW_UP_QUEUE_MODE]: {
            type: 'string',
            enum: ['queue', 'steer', 'interrupt'],
            default: 'queue',
            description: 'Control whether follow-up messages are queued or steer the current run. Press Cmd/Ctrl+Shift+Enter to do the opposite for a single in-progress follow-up.'
        },
        [CodexExtensionPreferences.COMPOSER_ENTER_BEHAVIOR]: {
            type: 'string',
            enum: ['enter', 'cmdIfMultiline'],
            default: 'enter',
            description: 'Enter behavior for the Codex composer.'
        },
        [CodexExtensionPreferences.REVIEW_DELIVERY]: {
            type: 'string',
            enum: ['inline', 'detached'],
            default: 'inline',
            description: 'Start /review inline in the current thread when possible or launch a separate review thread'
        },
        [CodexExtensionPreferences.LOCALE_OVERRIDE]: {
            type: ['string', 'null'],
            default: null,
            description: 'Preferred language for the Codex UI. Leave empty to auto detect.'
        },
        [CodexExtensionPreferences.RUN_IN_WSL]: {
            type: 'boolean',
            default: false,
            description: 'Windows only: when Windows Subsystem for Linux (WSL) is installed, automatically run Codex inside WSL. Recommended for improved sandbox security and better performance - Agent mode on Windows currently requires WSL. Changing this setting reloads Theia to take effect.'
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
