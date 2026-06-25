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

export const CODEX_CLI_EXECUTABLE_PATH_PREF = 'ai-features.aiProviders.executablePath';
export const CODEX_CLI_RUNTIME_PREF = 'ai-features.aiProviders.runtime';
export const CODEX_CLI_MODEL_PROVIDER_PREF = 'ai-features.aiProviders.modelProvider';
export const CODEX_CLI_PROFILE_PREF = 'ai-features.aiProviders.profile';
export const CODEX_CLI_MODEL_PREF = 'ai-features.aiProviders.model';
export const CODEX_CLI_OPENROUTER_API_KEY_PREF = 'ai-features.aiProviders.openRouterApiKey';
export const CODEX_CLI_OPENCODE_API_KEY_PREF = 'ai-features.aiProviders.openCodeApiKey';
export const CODEX_CLI_OPENCODE_EXECUTABLE_PATH_PREF = 'ai-features.aiProviders.openCodeExecutablePath';
export const CODEX_CLI_OPENCODE_AGENT_PREF = 'ai-features.aiProviders.openCodeAgent';
export const CODEX_CLI_OPENCODE_VARIANT_PREF = 'ai-features.aiProviders.openCodeVariant';
export const CODEX_CLI_GEMINI_EXECUTABLE_PATH_PREF = 'ai-features.aiProviders.geminiExecutablePath';
export const CODEX_CLI_CLAUDE_EXECUTABLE_PATH_PREF = 'ai-features.aiProviders.claudeExecutablePath';
export const CODEX_CLI_CLAUDE_AGENT_PREF = 'ai-features.aiProviders.claudeAgent';
export const CODEX_CLI_CURSOR_EXECUTABLE_PATH_PREF = 'ai-features.aiProviders.cursorExecutablePath';
export const CODEX_CLI_CURSOR_MODE_PREF = 'ai-features.aiProviders.cursorMode';
export const CODEX_CLI_APPROVAL_POLICY_PREF = 'ai-features.aiProviders.approvalPolicy';
export const CODEX_CLI_SANDBOX_MODE_PREF = 'ai-features.aiProviders.sandboxMode';
export const CODEX_CLI_REASONING_EFFORT_PREF = 'ai-features.aiProviders.reasoningEffort';
export const CODEX_CLI_REASONING_VARIANT_PREF = 'ai-features.aiProviders.reasoningVariant';
export const CODEX_CLI_REASONING_VARIANT_OPTIONS_PREF = 'ai-features.aiProviders.reasoningVariantOptions';
export const CODEX_CLI_VERBOSITY_PREF = 'ai-features.aiProviders.verbosity';
export const CODEX_CLI_SERVICE_TIER_PREF = 'ai-features.aiProviders.serviceTier';
export const CODEX_CLI_WEB_SEARCH_PREF = 'ai-features.aiProviders.webSearch';
export const CODEX_CLI_WEB_SEARCH_CONTEXT_SIZE_PREF = 'ai-features.aiProviders.webSearchContextSize';

export const CodexProviderPreferencesSchema: PreferenceSchema = {
    properties: {
        [CODEX_CLI_RUNTIME_PREF]: {
            type: 'string',
            enum: ['codex-app-server', 'direct-http', 'opencode-cli', 'gemini-cli', 'claude-code-cli', 'cursor-cli'],
            enumDescriptions: [
                nls.localize('theia/ai/ai-providers/runtime/codexAppServer', 'Codex CLI app-server'),
                nls.localize('theia/ai/ai-providers/runtime/directHttp', 'Direct service API provider adapter'),
                nls.localize('theia/ai/ai-providers/runtime/openCodeCli', 'OpenCode CLI provider adapter'),
                nls.localize('theia/ai/ai-providers/runtime/geminiCli', 'Gemini CLI provider adapter'),
                nls.localize('theia/ai/ai-providers/runtime/claudeCodeCli', 'Claude Code CLI provider adapter'),
                nls.localize('theia/ai/ai-providers/runtime/cursorCli', 'Cursor CLI provider adapter')
            ],
            default: 'codex-app-server',
            markdownDescription: nls.localize('theia/ai/ai-providers/runtime/description',
                'Runtime adapter used by the CyberVinci AI provider extension.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_MODEL_PROVIDER_PREF]: {
            type: 'string',
            enum: ['codex', 'openrouter', 'opencode-go', 'opencode', 'gemini', 'claude-code', 'cursor'],
            enumDescriptions: [
                nls.localize('theia/ai/ai-providers/modelProvider/codex', 'Codex CLI'),
                nls.localize('theia/ai/ai-providers/modelProvider/openrouter', 'OpenRouter direct API'),
                nls.localize('theia/ai/ai-providers/modelProvider/opencodeGo', 'OpenCode Go direct API'),
                nls.localize('theia/ai/ai-providers/modelProvider/opencodeZen', 'OpenCode Zen direct API'),
                nls.localize('theia/ai/ai-providers/modelProvider/gemini', 'Gemini CLI'),
                nls.localize('theia/ai/ai-providers/modelProvider/claudeCode', 'Claude Code CLI'),
                nls.localize('theia/ai/ai-providers/modelProvider/cursor', 'Cursor CLI')
            ],
            default: 'codex',
            markdownDescription: nls.localize('theia/ai/ai-providers/modelProvider/description',
                'Provider catalog selected for model discovery and visual provider switching.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_EXECUTABLE_PATH_PREF]: {
            type: 'string',
            markdownDescription: nls.localize('theia/ai/ai-providers/executablePath/description',
                'Path to the Codex CLI executable. If empty, CyberVinci runs `codex` from PATH.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_PROFILE_PREF]: {
            type: 'string',
            markdownDescription: nls.localize('theia/ai/ai-providers/profile/description',
                'Optional Codex CLI configuration profile passed with `--profile`.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_MODEL_PREF]: {
            type: 'string',
            markdownDescription: nls.localize('theia/ai/ai-providers/model/description',
                'Optional model override. Codex uses a model id such as `gpt-5-codex`; direct service providers use `provider/model`, such as `openrouter/openai/gpt-5`; CLI adapters use their native model names.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_OPENROUTER_API_KEY_PREF]: {
            type: 'string',
            markdownDescription: nls.localize('theia/ai/ai-providers/openRouterApiKey/description',
                'Optional OpenRouter API key. If empty, CyberVinci reads `OPENROUTER_API_KEY` from the environment.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_OPENCODE_API_KEY_PREF]: {
            type: 'string',
            markdownDescription: nls.localize('theia/ai/ai-providers/openCodeApiKey/description',
                'Optional OpenCode Zen/OpenCode Go API key. If empty, CyberVinci reads `OPENCODE_API_KEY` from the environment.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_OPENCODE_EXECUTABLE_PATH_PREF]: {
            type: 'string',
            markdownDescription: nls.localize('theia/ai/ai-providers/openCodeExecutablePath/description',
                'Path to the OpenCode executable. If empty, CyberVinci runs `opencode` from PATH.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_OPENCODE_AGENT_PREF]: {
            type: 'string',
            markdownDescription: nls.localize('theia/ai/ai-providers/openCodeAgent/description',
                'Optional OpenCode primary agent passed with `--agent` when the OpenCode runtime is selected.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_OPENCODE_VARIANT_PREF]: {
            type: 'string',
            markdownDescription: nls.localize('theia/ai/ai-providers/openCodeVariant/description',
                'Optional OpenCode model variant passed with `--variant`, for example `high`, `max`, or `minimal`.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_GEMINI_EXECUTABLE_PATH_PREF]: {
            type: 'string',
            markdownDescription: nls.localize('theia/ai/ai-providers/geminiExecutablePath/description',
                'Path to the Gemini CLI executable. If empty, CyberVinci runs `gemini` from PATH.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_CLAUDE_EXECUTABLE_PATH_PREF]: {
            type: 'string',
            markdownDescription: nls.localize('theia/ai/ai-providers/claudeExecutablePath/description',
                'Path to the Claude Code CLI executable. If empty, CyberVinci runs `claude` from PATH.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_CLAUDE_AGENT_PREF]: {
            type: 'string',
            markdownDescription: nls.localize('theia/ai/ai-providers/claudeAgent/description',
                'Optional Claude Code agent passed with `--agent` when the Claude Code runtime is selected.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_CURSOR_EXECUTABLE_PATH_PREF]: {
            type: 'string',
            markdownDescription: nls.localize('theia/ai/ai-providers/cursorExecutablePath/description',
                'Path to the Cursor Agent CLI executable. If empty, CyberVinci runs `cursor-agent` from PATH.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_CURSOR_MODE_PREF]: {
            type: 'string',
            enum: ['', 'plan', 'ask'],
            enumDescriptions: [
                nls.localizeByDefault('Default'),
                nls.localize('theia/ai/ai-providers/cursorMode/plan', 'Plan mode'),
                nls.localize('theia/ai/ai-providers/cursorMode/ask', 'Ask mode')
            ],
            markdownDescription: nls.localize('theia/ai/ai-providers/cursorMode/description',
                'Optional Cursor Agent CLI mode passed with `--mode`. Empty uses Cursor Agent default mode.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_APPROVAL_POLICY_PREF]: {
            type: 'string',
            enum: ['untrusted', 'on-failure', 'on-request', 'never'],
            enumDescriptions: [
                nls.localize('theia/ai/ai-providers/approvalPolicy/untrusted', 'Ask for approval in untrusted contexts.'),
                nls.localize('theia/ai/ai-providers/approvalPolicy/onFailure', 'Ask for approval when a command fails and needs escalation.'),
                nls.localize('theia/ai/ai-providers/approvalPolicy/onRequest', 'Ask for approval when the active provider requests it.'),
                nls.localize('theia/ai/ai-providers/approvalPolicy/never', 'Never request approval.')
            ],
            default: 'on-request',
            markdownDescription: nls.localize('theia/ai/ai-providers/approvalPolicy/description',
                'CyberVinci AI Providers approval policy for command and file-change requests.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_SANDBOX_MODE_PREF]: {
            type: 'string',
            enum: ['read-only', 'workspace-write', 'danger-full-access'],
            enumDescriptions: [
                nls.localize('theia/ai/ai-providers/sandboxMode/readOnly', 'Run without writing files.'),
                nls.localize('theia/ai/ai-providers/sandboxMode/workspaceWrite', 'Allow writes inside the workspace.'),
                nls.localize('theia/ai/ai-providers/sandboxMode/dangerFullAccess', 'Allow unrestricted local filesystem access.')
            ],
            default: 'read-only',
            markdownDescription: nls.localize('theia/ai/ai-providers/sandboxMode/description',
                'Default CyberVinci AI Providers sandbox mode. The chat mode can override this per request.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_REASONING_EFFORT_PREF]: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'xhigh'],
            enumDescriptions: [
                nls.localizeByDefault('Low'),
                nls.localizeByDefault('Medium'),
                nls.localizeByDefault('High'),
                nls.localize('theia/ai/ai-providers/reasoningEffort/xhigh', 'Extra high')
            ],
            markdownDescription: nls.localize('theia/ai/ai-providers/reasoningEffort/description',
                'Optional Codex reasoning effort override.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_REASONING_VARIANT_PREF]: {
            type: 'string',
            markdownDescription: nls.localize('theia/ai/ai-providers/reasoningVariant/description',
                'Optional provider-specific model variant, such as a thinking-budget, speed, or quality variant.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_REASONING_VARIANT_OPTIONS_PREF]: {
            type: 'object',
            markdownDescription: nls.localize('theia/ai/ai-providers/reasoningVariantOptions/description',
                'Provider-specific options derived from the selected model variant.'),
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
            markdownDescription: nls.localize('theia/ai/ai-providers/verbosity/description',
                'Optional Codex response verbosity override.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_SERVICE_TIER_PREF]: {
            type: 'string',
            enum: ['fast', 'flex'],
            enumDescriptions: [
                nls.localize('theia/ai/ai-providers/serviceTier/fast', 'Prefer the fast service tier.'),
                nls.localize('theia/ai/ai-providers/serviceTier/flex', 'Prefer the flex service tier.')
            ],
            markdownDescription: nls.localize('theia/ai/ai-providers/serviceTier/description',
                'Optional Codex service tier override.'),
            title: AI_CORE_PREFERENCES_TITLE
        },
        [CODEX_CLI_WEB_SEARCH_PREF]: {
            type: 'string',
            enum: ['disabled', 'cached', 'live'],
            enumDescriptions: [
                nls.localizeByDefault('Disabled'),
                nls.localize('theia/ai/ai-providers/webSearch/cached', 'Use cached web-search context when available.'),
                nls.localize('theia/ai/ai-providers/webSearch/live', 'Allow live web search.')
            ],
            default: 'disabled',
            markdownDescription: nls.localize('theia/ai/ai-providers/webSearch/description',
                'Controls the native Codex web search tool for CyberVinci AI Providers threads.'),
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
            markdownDescription: nls.localize('theia/ai/ai-providers/webSearchContextSize/description',
                'Context size used by the native Codex web search tool when web search is enabled.'),
            title: AI_CORE_PREFERENCES_TITLE
        }
    }
};
