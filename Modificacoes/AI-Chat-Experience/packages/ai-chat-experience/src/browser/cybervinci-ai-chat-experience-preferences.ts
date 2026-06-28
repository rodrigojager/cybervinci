// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { PreferenceContribution, PreferenceSchema } from '@theia/core/lib/common/preferences';

export const CYBERVINCI_AI_CHAT_AGENT_PROFILE_PREF = 'cybervinci.aiChat.agentProfile';
export const CYBERVINCI_AI_CHAT_AGENT_PROFILE_FAVORITES_PREF = 'cybervinci.aiChat.agentProfile.favorites';
export const CYBERVINCI_AI_CHAT_MODE_PREF = 'cybervinci.aiChat.mode';
export const CYBERVINCI_AI_CHAT_PLAYBOOK_PREF = 'cybervinci.aiChat.playbook';
export const CYBERVINCI_AI_CHAT_FLOW_MODE_PREF = 'cybervinci.aiChat.flow.mode';
export const CYBERVINCI_AI_CHAT_SAVED_WORKFLOW_PREF = 'cybervinci.aiChat.flow.workflowId';
export const CYBERVINCI_AI_CHAT_WORKDIR_PREF = 'cybervinci.aiChat.workdir';
export const CYBERVINCI_AI_CHAT_VIRTUAL_REASONING_MODE_PREF = 'cybervinci.aiChat.virtualReasoning.mode';
export const CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_ENABLED_PREF = 'cybervinci.aiChat.virtualGoal.enabled';
export const CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_AUTO_CONTINUE_PREF = 'cybervinci.aiChat.virtualGoal.autoContinueOnIdle';
export const CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_AUTO_CONTINUE_ON_RESUME_PREF = 'cybervinci.aiChat.virtualGoal.autoContinueOnResume';
export const CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_DEFAULT_TOKEN_BUDGET_PREF = 'cybervinci.aiChat.virtualGoal.defaultTokenBudget';
export const CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_MAX_OBJECTIVE_LENGTH_PREF = 'cybervinci.aiChat.virtualGoal.maxObjectiveLength';
export const CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_MAX_ROUNDS_PREF = 'cybervinci.aiChat.virtualGoal.maxRounds';
export const CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_DISABLE_IN_PLAN_MODE_PREF = 'cybervinci.aiChat.virtualGoal.disableInPlanMode';
export const CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_MODEL_TOOLS_ENABLED_PREF = 'cybervinci.aiChat.virtualGoal.modelTools.enabled';
export const CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_FALLBACK_TEXT_TOOL_CALLING_ENABLED_PREF = 'cybervinci.aiChat.virtualGoal.fallbackTextToolCalling.enabled';
export const CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_PROGRESS_GUARD_ENABLED_PREF = 'cybervinci.aiChat.virtualGoal.progressGuard.enabled';
export const CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_PROGRESS_GUARD_MAX_REPEATED_RESPONSES_PREF = 'cybervinci.aiChat.virtualGoal.progressGuard.maxRepeatedResponses';
export const CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_PROGRESS_GUARD_MAX_NO_PROGRESS_TURNS_PREF = 'cybervinci.aiChat.virtualGoal.progressGuard.maxNoProgressTurns';
export const CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_PROGRESS_GUARD_MAX_REPEATED_FAILURES_PREF = 'cybervinci.aiChat.virtualGoal.progressGuard.maxRepeatedFailures';
export const CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_SCOPE_GUARD_MODE_PREF = 'cybervinci.aiChat.virtualGoal.scopeGuard.mode';
export const CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_SCOPE_GUARD_FORBIDDEN_PATHS_PREF = 'cybervinci.aiChat.virtualGoal.scopeGuard.forbiddenPaths';
export const CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_VERIFIER_MODE_PREF = 'cybervinci.aiChat.virtualGoal.verifier.mode';
export const CYBERVINCI_AI_CHAT_VISION_JUDGE_ENABLED_PREF = 'cybervinci.aiChat.visionJudge.enabled';
export const CYBERVINCI_AI_CHAT_VISION_JUDGE_PROVIDER_PREF = 'cybervinci.aiChat.visionJudge.provider';
export const CYBERVINCI_AI_CHAT_VISION_JUDGE_MODEL_PREF = 'cybervinci.aiChat.visionJudge.model';

export const cyberVinciAiChatExperiencePreferenceSchema: PreferenceSchema = {
    properties: {
        [CYBERVINCI_AI_CHAT_AGENT_PROFILE_PREF]: {
            type: 'string',
            default: '',
            markdownDescription: 'Selected CyberVinci Agent profile for AI Chat requests.'
        },
        [CYBERVINCI_AI_CHAT_AGENT_PROFILE_FAVORITES_PREF]: {
            type: 'array',
            items: {
                type: 'string'
            },
            default: [],
            markdownDescription: 'Favorite CyberVinci Agent profile ids pinned in the AI Chat Agent selector.'
        },
        [CYBERVINCI_AI_CHAT_MODE_PREF]: {
            type: 'string',
            enum: ['chat', 'edit', 'plan', 'readonly', 'workspace', 'fullaccess', 'agent-next'],
            default: 'chat',
            markdownDescription: 'Selected CyberVinci AI Chat interaction mode.'
        },
        [CYBERVINCI_AI_CHAT_PLAYBOOK_PREF]: {
            type: 'string',
            default: 'direct-chat',
            markdownDescription: 'Selected CyberVinci Playbook used to prepare direct AI Chat turns.'
        },
        [CYBERVINCI_AI_CHAT_FLOW_MODE_PREF]: {
            type: 'string',
            enum: ['chat', 'saved', 'dynamic'],
            default: 'chat',
            markdownDescription: 'Routes AI Chat prompts through normal chat, a saved CyberVinci Flow, or a dynamic workflow.'
        },
        [CYBERVINCI_AI_CHAT_SAVED_WORKFLOW_PREF]: {
            type: 'string',
            default: '',
            markdownDescription: 'Selected CyberVinci Flow workflow id used when AI Chat workflow routing is set to Saved Flow.'
        },
        [CYBERVINCI_AI_CHAT_WORKDIR_PREF]: {
            type: 'string',
            default: '',
            markdownDescription: 'Default working directory used by CyberVinci AI Chat providers. When empty, the active workspace root is used.'
        },
        [CYBERVINCI_AI_CHAT_VIRTUAL_REASONING_MODE_PREF]: {
            type: 'string',
            enum: ['off', 'auto', 'fast', 'balanced', 'deep', 'coding', 'research', 'lats'],
            default: 'off',
            markdownDescription: 'Virtual Reasoning mode applied to CyberVinci AI Chat turns.'
        },
        [CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_ENABLED_PREF]: {
            type: 'boolean',
            default: true,
            markdownDescription: 'Enable CyberVinci Virtual Goal state, commands, model tools, and automatic continuations.'
        },
        [CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_AUTO_CONTINUE_PREF]: {
            type: 'boolean',
            default: true,
            markdownDescription: 'Automatically continue an active CyberVinci Virtual Goal when the chat turn becomes idle.'
        },
        [CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_AUTO_CONTINUE_ON_RESUME_PREF]: {
            type: 'boolean',
            default: true,
            markdownDescription: 'Automatically continue a CyberVinci Virtual Goal when the user resumes it from paused, blocked, usage-limited, or budget-limited status.'
        },
        [CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_DEFAULT_TOKEN_BUDGET_PREF]: {
            type: 'number',
            default: 40000,
            minimum: 0,
            markdownDescription: 'Default token budget for new CyberVinci Virtual Goals. Set 0 for unlimited.'
        },
        [CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_MAX_OBJECTIVE_LENGTH_PREF]: {
            type: 'number',
            default: 4000,
            minimum: 1,
            maximum: 20000,
            markdownDescription: 'Maximum length for a CyberVinci Virtual Goal objective.'
        },
        [CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_MAX_ROUNDS_PREF]: {
            type: 'number',
            default: 12,
            minimum: 1,
            maximum: 50,
            markdownDescription: 'Maximum automatic continuation rounds for a CyberVinci Virtual Goal.'
        },
        [CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_DISABLE_IN_PLAN_MODE_PREF]: {
            type: 'boolean',
            default: true,
            markdownDescription: 'Suppress CyberVinci Virtual Goal automatic continuations while AI Chat mode is Plan.'
        },
        [CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_MODEL_TOOLS_ENABLED_PREF]: {
            type: 'boolean',
            default: true,
            markdownDescription: 'Expose CyberVinci Virtual Goal model tools get_goal, create_goal, and update_goal.'
        },
        [CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_FALLBACK_TEXT_TOOL_CALLING_ENABLED_PREF]: {
            type: 'boolean',
            default: true,
            markdownDescription: 'Allow text-only model fallback calls for CyberVinci Virtual Goal updates when native tool calling is unavailable.'
        },
        [CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_PROGRESS_GUARD_ENABLED_PREF]: {
            type: 'boolean',
            default: true,
            markdownDescription: 'Detect repeated no-progress Virtual Goal continuations and stop obvious automatic loops.'
        },
        [CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_PROGRESS_GUARD_MAX_REPEATED_RESPONSES_PREF]: {
            type: 'number',
            default: 3,
            minimum: 2,
            maximum: 20,
            markdownDescription: 'Repeated normalized assistant responses before CyberVinci Virtual Goal is blocked.'
        },
        [CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_PROGRESS_GUARD_MAX_NO_PROGRESS_TURNS_PREF]: {
            type: 'number',
            default: 3,
            minimum: 1,
            maximum: 20,
            markdownDescription: 'Explicit no-progress turns before CyberVinci Virtual Goal is blocked.'
        },
        [CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_PROGRESS_GUARD_MAX_REPEATED_FAILURES_PREF]: {
            type: 'number',
            default: 3,
            minimum: 2,
            maximum: 20,
            markdownDescription: 'Repeated command or test failure signatures before CyberVinci Virtual Goal is blocked.'
        },
        [CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_SCOPE_GUARD_MODE_PREF]: {
            type: 'string',
            enum: ['off', 'warn', 'enforce'],
            default: 'off',
            markdownDescription: 'Scope guard mode for CyberVinci Virtual Goal forbidden path drift.'
        },
        [CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_SCOPE_GUARD_FORBIDDEN_PATHS_PREF]: {
            type: 'array',
            items: {
                type: 'string'
            },
            default: ['.env', '.env.*', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'],
            markdownDescription: 'Path fragments or wildcard patterns that Virtual Goal should warn/block when model output claims to modify them.'
        },
        [CYBERVINCI_AI_CHAT_VIRTUAL_GOAL_VERIFIER_MODE_PREF]: {
            type: 'string',
            enum: ['off', 'warn', 'enforce'],
            default: 'off',
            markdownDescription: 'Deterministic verifier for model-completed CyberVinci Virtual Goals. Warn records weak evidence; enforce rejects weak completion.'
        },
        [CYBERVINCI_AI_CHAT_VISION_JUDGE_ENABLED_PREF]: {
            type: 'boolean',
            default: false,
            markdownDescription: 'Enable an independent provider/model selection for the CyberVinci Vision Judge.'
        },
        [CYBERVINCI_AI_CHAT_VISION_JUDGE_PROVIDER_PREF]: {
            type: 'string',
            default: '',
            markdownDescription: 'Provider used only by the CyberVinci Vision Judge when the independent visual model is enabled.'
        },
        [CYBERVINCI_AI_CHAT_VISION_JUDGE_MODEL_PREF]: {
            type: 'string',
            default: '',
            markdownDescription: 'Model used only by the CyberVinci Vision Judge when the independent visual model is enabled.'
        }
    }
};

export const CyberVinciAiChatExperiencePreferenceContribution = Symbol('CyberVinciAiChatExperiencePreferenceContribution');
export const cyberVinciAiChatExperiencePreferenceContribution: PreferenceContribution = {
    schema: cyberVinciAiChatExperiencePreferenceSchema
};
