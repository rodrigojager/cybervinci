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

export const OUTPUT_CLEANER_ENABLED_PREF = 'cybervinci.aiOutputCleaner.enabled';
export const OUTPUT_CLEANER_MODE_PREF = 'cybervinci.aiOutputCleaner.mode';
export const OUTPUT_CLEANER_CODEX_ENABLED_PREF = 'cybervinci.aiOutputCleaner.codex.enabled';
export const OUTPUT_CLEANER_CODEX_WRAPPERS_ENABLED_PREF = 'cybervinci.aiOutputCleaner.codex.wrappers.enabled';
export const OUTPUT_CLEANER_CODEX_HOOKS_ENABLED_PREF = 'cybervinci.aiOutputCleaner.codex.hooks.enabled';
export const OUTPUT_CLEANER_THEIA_TOOLS_ENABLED_PREF = 'cybervinci.aiOutputCleaner.theiaTools.enabled';
export const OUTPUT_CLEANER_RAW_ARTIFACTS_ENABLED_PREF = 'cybervinci.aiOutputCleaner.rawArtifacts.enabled';
export const OUTPUT_CLEANER_STATUS_AWARE_ENABLED_PREF = 'cybervinci.aiOutputCleaner.statusAware.enabled';
export const OUTPUT_CLEANER_SHOW_NOTICE_PREF = 'cybervinci.aiOutputCleaner.showFilteringNotice';
export const OUTPUT_CLEANER_WRAPPER_COMMANDS_PREF = 'cybervinci.aiOutputCleaner.wrapperCommands';
export const OUTPUT_CLEANER_LITERAL_BYPASS_PATTERNS_PREF = 'cybervinci.aiOutputCleaner.literalBypassPatterns';
export const OUTPUT_CLEANER_STATUS_INTENT_PATTERNS_PREF = 'cybervinci.aiOutputCleaner.statusIntentPatterns';

export const AIOutputCleanerPreferencesSchema: PreferenceSchema = {
    properties: {
        [OUTPUT_CLEANER_ENABLED_PREF]: {
            type: 'boolean',
            default: false,
            title: AI_CORE_PREFERENCES_TITLE,
            markdownDescription: nls.localize('theia/cybervinci/aiOutputCleaner/enabled',
                'Enable the AI Output Cleaner. When false, outputs are always unchanged.')
        },
        [OUTPUT_CLEANER_MODE_PREF]: {
            type: 'string',
            default: 'safe',
            enum: ['off', 'raw', 'safe', 'command-noise', 'status-aware', 'aggressive'],
            enumDescriptions: [
                nls.localize('theia/cybervinci/aiOutputCleaner/mode/off', 'Disable all filtering and do not alter any output.'),
                nls.localize('theia/cybervinci/aiOutputCleaner/mode/raw', 'Keep raw outputs and only collect raw artifacts.'),
                nls.localize('theia/cybervinci/aiOutputCleaner/mode/safe', 'Apply safe deterministic filtering and keep safe evidence.'),
                nls.localize('theia/cybervinci/aiOutputCleaner/mode/command-noise', 'Target command-noise patterns and keep command results.'),
                nls.localize('theia/cybervinci/aiOutputCleaner/mode/status-aware', 'Preserve active progress signals and status context.'),
                nls.localize('theia/cybervinci/aiOutputCleaner/mode/aggressive', 'Apply broader noise-reduction rules.')
            ],
            title: AI_CORE_PREFERENCES_TITLE
        },
        [OUTPUT_CLEANER_CODEX_ENABLED_PREF]: {
            type: 'boolean',
            default: true,
            title: AI_CORE_PREFERENCES_TITLE,
            markdownDescription: nls.localize('theia/cybervinci/aiOutputCleaner/codexEnabled',
                'Apply AI Output Cleaner rules to Codex CLI-related command outputs when enabled.')
        },
        [OUTPUT_CLEANER_CODEX_WRAPPERS_ENABLED_PREF]: {
            type: 'boolean',
            default: true,
            title: AI_CORE_PREFERENCES_TITLE,
            markdownDescription: nls.localize('theia/cybervinci/aiOutputCleaner/codexWrappersEnabled',
                'Enable wrapper execution paths in future phases.')
        },
        [OUTPUT_CLEANER_CODEX_HOOKS_ENABLED_PREF]: {
            type: 'boolean',
            default: false,
            title: AI_CORE_PREFERENCES_TITLE,
            markdownDescription: nls.localize('theia/cybervinci/aiOutputCleaner/codexHooksEnabled',
                'Enable optional Codex hook integration managed by the AI Output Cleaner.')
        },
        [OUTPUT_CLEANER_THEIA_TOOLS_ENABLED_PREF]: {
            type: 'boolean',
            default: true,
            title: AI_CORE_PREFERENCES_TITLE,
            markdownDescription: nls.localize('theia/cybervinci/aiOutputCleaner/theiaToolsEnabled',
                'Apply filtering to IDE tool outputs in future phases.')
        },
        [OUTPUT_CLEANER_RAW_ARTIFACTS_ENABLED_PREF]: {
            type: 'boolean',
            default: true,
            title: AI_CORE_PREFERENCES_TITLE,
            markdownDescription: nls.localize('theia/cybervinci/aiOutputCleaner/rawArtifactsEnabled',
                'Keep raw artifacts for all processed outputs.')
        },
        [OUTPUT_CLEANER_STATUS_AWARE_ENABLED_PREF]: {
            type: 'boolean',
            default: true,
            title: AI_CORE_PREFERENCES_TITLE,
            markdownDescription: nls.localize('theia/cybervinci/aiOutputCleaner/statusAwareEnabled',
                'Keep progress/status signals when outputs are potentially from running long tasks.')
        },
        [OUTPUT_CLEANER_SHOW_NOTICE_PREF]: {
            type: 'boolean',
            default: true,
            title: AI_CORE_PREFERENCES_TITLE,
            markdownDescription: nls.localize('theia/cybervinci/aiOutputCleaner/showNotice',
                'Show short notices when filtering changes are applied.')
        },
        [OUTPUT_CLEANER_WRAPPER_COMMANDS_PREF]: {
            type: 'array',
            default: [
                'git',
                'rg',
                'npm',
                'pnpm',
                'yarn',
                'node',
                'python',
                'pytest',
                'cargo',
                'docker'
            ],
            title: AI_CORE_PREFERENCES_TITLE,
            items: {
                type: 'string'
            },
            markdownDescription: nls.localize('theia/cybervinci/aiOutputCleaner/wrapperCommands',
                'Commands that will receive dedicated AI Output Cleaner noise filters in later phases.')
        },
        [OUTPUT_CLEANER_LITERAL_BYPASS_PATTERNS_PREF]: {
            type: 'array',
            default: [
                'mojibake',
                'encoding',
                'utf-8',
                'latin-1',
                'caracteres',
                'símbolos',
                'conteúdo literal',
                'texto quebrado',
                'acento',
                'corrompido',
                'escape sequence',
                'ansi'
            ],
            title: AI_CORE_PREFERENCES_TITLE,
            items: {
                type: 'string'
            },
            markdownDescription: nls.localize('theia/cybervinci/aiOutputCleaner/literalBypassPatterns',
                'User-prompt hints that force bypassing filtering.')
        },
        [OUTPUT_CLEANER_STATUS_INTENT_PATTERNS_PREF]: {
            type: 'array',
            default: [
                'ainda está rodando',
                'ainda está instalando',
                'já terminou',
                'acabou',
                'travou',
                'progresso',
                'continua executando',
                'está baixando',
                'processo ativo',
                'instalação acabou'
            ],
            title: AI_CORE_PREFERENCES_TITLE,
            items: {
                type: 'string'
            },
            markdownDescription: nls.localize('theia/cybervinci/aiOutputCleaner/statusIntentPatterns',
                'User-prompt hints that indicate status-aware handling.')
        }
    }
};
