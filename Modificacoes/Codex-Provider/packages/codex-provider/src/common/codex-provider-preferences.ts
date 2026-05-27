// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { AI_CORE_PREFERENCES_TITLE } from '@theia/ai-core/lib/common/ai-core-preferences';
import { nls, PreferenceSchema } from '@theia/core';

export const CODEX_CLI_EXECUTABLE_PATH_PREF = 'ai-features.codexProvider.executablePath';
export const CODEX_CLI_PROFILE_PREF = 'ai-features.codexProvider.profile';
export const CODEX_CLI_MODEL_PREF = 'ai-features.codexProvider.model';
export const CODEX_CLI_APPROVAL_POLICY_PREF = 'ai-features.codexProvider.approvalPolicy';
export const CODEX_CLI_SANDBOX_MODE_PREF = 'ai-features.codexProvider.sandboxMode';
export const CODEX_CLI_REASONING_EFFORT_PREF = 'ai-features.codexProvider.reasoningEffort';
export const CODEX_CLI_VERBOSITY_PREF = 'ai-features.codexProvider.verbosity';
export const CODEX_CLI_SERVICE_TIER_PREF = 'ai-features.codexProvider.serviceTier';
export const CODEX_CLI_WEB_SEARCH_PREF = 'ai-features.codexProvider.webSearch';
export const CODEX_CLI_WEB_SEARCH_CONTEXT_SIZE_PREF = 'ai-features.codexProvider.webSearchContextSize';

export const CodexProviderPreferencesSchema: PreferenceSchema = {
    properties: {
        [CODEX_CLI_EXECUTABLE_PATH_PREF]: {
            type: 'string',
            markdownDescription: nls.localize('theia/ai/codex-provider/executablePath/description',
                'Path to the Codex Provider executable. If empty, CyberVinci runs `codex` from PATH.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_PROFILE_PREF]: {
            type: 'string',
            markdownDescription: nls.localize('theia/ai/codex-provider/profile/description',
                'Optional Codex Provider configuration profile passed with `--profile`.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_MODEL_PREF]: {
            type: 'string',
            markdownDescription: nls.localize('theia/ai/codex-provider/model/description',
                'Optional model override for Codex Provider turns. Empty uses the Codex Provider config.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_APPROVAL_POLICY_PREF]: {
            type: 'string',
            enum: ['untrusted', 'on-failure', 'on-request', 'never'],
            enumDescriptions: [
                nls.localize('theia/ai/codex-provider/approvalPolicy/untrusted', 'Ask for approval in untrusted contexts.'),
                nls.localize('theia/ai/codex-provider/approvalPolicy/onFailure', 'Ask for approval when a command fails and needs escalation.'),
                nls.localize('theia/ai/codex-provider/approvalPolicy/onRequest', 'Ask for approval when Codex Provider requests it.'),
                nls.localize('theia/ai/codex-provider/approvalPolicy/never', 'Never request approval.')
            ],
            default: 'on-request',
            markdownDescription: nls.localize('theia/ai/codex-provider/approvalPolicy/description',
                'Codex Provider approval policy for command and file-change requests.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_SANDBOX_MODE_PREF]: {
            type: 'string',
            enum: ['read-only', 'workspace-write', 'danger-full-access'],
            enumDescriptions: [
                nls.localize('theia/ai/codex-provider/sandboxMode/readOnly', 'Run without writing files.'),
                nls.localize('theia/ai/codex-provider/sandboxMode/workspaceWrite', 'Allow writes inside the workspace.'),
                nls.localize('theia/ai/codex-provider/sandboxMode/dangerFullAccess', 'Allow unrestricted local filesystem access.')
            ],
            default: 'read-only',
            markdownDescription: nls.localize('theia/ai/codex-provider/sandboxMode/description',
                'Default Codex Provider sandbox mode. The chat mode can override this per request.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_REASONING_EFFORT_PREF]: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'xhigh'],
            enumDescriptions: [
                nls.localizeByDefault('Low'),
                nls.localizeByDefault('Medium'),
                nls.localizeByDefault('High'),
                nls.localize('theia/ai/codex-provider/reasoningEffort/xhigh', 'Extra high')
            ],
            markdownDescription: nls.localize('theia/ai/codex-provider/reasoningEffort/description',
                'Optional Codex reasoning effort override.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_VERBOSITY_PREF]: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            enumDescriptions: [
                nls.localizeByDefault('Low'),
                nls.localizeByDefault('Medium'),
                nls.localizeByDefault('High')
            ],
            markdownDescription: nls.localize('theia/ai/codex-provider/verbosity/description',
                'Optional Codex response verbosity override.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_SERVICE_TIER_PREF]: {
            type: 'string',
            enum: ['fast', 'flex'],
            enumDescriptions: [
                nls.localize('theia/ai/codex-provider/serviceTier/fast', 'Prefer the fast service tier.'),
                nls.localize('theia/ai/codex-provider/serviceTier/flex', 'Prefer the flex service tier.')
            ],
            markdownDescription: nls.localize('theia/ai/codex-provider/serviceTier/description',
                'Optional Codex service tier override.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_WEB_SEARCH_PREF]: {
            type: 'string',
            enum: ['disabled', 'cached', 'live'],
            enumDescriptions: [
                nls.localizeByDefault('Disabled'),
                nls.localize('theia/ai/codex-provider/webSearch/cached', 'Use cached web-search context when available.'),
                nls.localize('theia/ai/codex-provider/webSearch/live', 'Allow live web search.')
            ],
            default: 'disabled',
            markdownDescription: nls.localize('theia/ai/codex-provider/webSearch/description',
                'Controls the native Codex web search tool for Codex Provider threads.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_WEB_SEARCH_CONTEXT_SIZE_PREF]: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            enumDescriptions: [
                nls.localizeByDefault('Low'),
                nls.localizeByDefault('Medium'),
                nls.localizeByDefault('High')
            ],
            default: 'medium',
            markdownDescription: nls.localize('theia/ai/codex-provider/webSearchContextSize/description',
                'Context size used by the native Codex web search tool when web search is enabled.'),
            title: AI_CORE_PREFERENCES_TITLE
        }
    }
};
