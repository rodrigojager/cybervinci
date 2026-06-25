"use strict";
// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.cyberVinciAiChatExperiencePreferenceContribution = exports.CyberVinciAiChatExperiencePreferenceContribution = exports.cyberVinciAiChatExperiencePreferenceSchema = exports.CYBERVINCI_AI_CHAT_VISION_JUDGE_MODEL_PREF = exports.CYBERVINCI_AI_CHAT_VISION_JUDGE_PROVIDER_PREF = exports.CYBERVINCI_AI_CHAT_VISION_JUDGE_ENABLED_PREF = exports.CYBERVINCI_AI_CHAT_VIRTUAL_REASONING_MODE_PREF = exports.CYBERVINCI_AI_CHAT_SAVED_WORKFLOW_PREF = exports.CYBERVINCI_AI_CHAT_FLOW_MODE_PREF = exports.CYBERVINCI_AI_CHAT_PLAYBOOK_PREF = exports.CYBERVINCI_AI_CHAT_MODE_PREF = exports.CYBERVINCI_AI_CHAT_AGENT_PROFILE_FAVORITES_PREF = exports.CYBERVINCI_AI_CHAT_AGENT_PROFILE_PREF = void 0;
exports.CYBERVINCI_AI_CHAT_AGENT_PROFILE_PREF = 'cybervinci.aiChat.agentProfile';
exports.CYBERVINCI_AI_CHAT_AGENT_PROFILE_FAVORITES_PREF = 'cybervinci.aiChat.agentProfile.favorites';
exports.CYBERVINCI_AI_CHAT_MODE_PREF = 'cybervinci.aiChat.mode';
exports.CYBERVINCI_AI_CHAT_PLAYBOOK_PREF = 'cybervinci.aiChat.playbook';
exports.CYBERVINCI_AI_CHAT_FLOW_MODE_PREF = 'cybervinci.aiChat.flow.mode';
exports.CYBERVINCI_AI_CHAT_SAVED_WORKFLOW_PREF = 'cybervinci.aiChat.flow.workflowId';
exports.CYBERVINCI_AI_CHAT_VIRTUAL_REASONING_MODE_PREF = 'cybervinci.aiChat.virtualReasoning.mode';
exports.CYBERVINCI_AI_CHAT_VISION_JUDGE_ENABLED_PREF = 'cybervinci.aiChat.visionJudge.enabled';
exports.CYBERVINCI_AI_CHAT_VISION_JUDGE_PROVIDER_PREF = 'cybervinci.aiChat.visionJudge.provider';
exports.CYBERVINCI_AI_CHAT_VISION_JUDGE_MODEL_PREF = 'cybervinci.aiChat.visionJudge.model';
exports.cyberVinciAiChatExperiencePreferenceSchema = {
    properties: (_a = {},
        _a[exports.CYBERVINCI_AI_CHAT_AGENT_PROFILE_PREF] = {
            type: 'string',
            default: '',
            markdownDescription: 'Selected CyberVinci Agent profile for AI Chat requests.'
        },
        _a[exports.CYBERVINCI_AI_CHAT_AGENT_PROFILE_FAVORITES_PREF] = {
            type: 'array',
            items: {
                type: 'string'
            },
            default: [],
            markdownDescription: 'Favorite CyberVinci Agent profile ids pinned in the AI Chat Agent selector.'
        },
        _a[exports.CYBERVINCI_AI_CHAT_MODE_PREF] = {
            type: 'string',
            enum: ['chat', 'edit', 'plan', 'readonly', 'workspace', 'fullaccess', 'agent-next'],
            default: 'chat',
            markdownDescription: 'Selected CyberVinci AI Chat interaction mode.'
        },
        _a[exports.CYBERVINCI_AI_CHAT_PLAYBOOK_PREF] = {
            type: 'string',
            default: 'direct-chat',
            markdownDescription: 'Selected CyberVinci Playbook used to prepare direct AI Chat turns.'
        },
        _a[exports.CYBERVINCI_AI_CHAT_FLOW_MODE_PREF] = {
            type: 'string',
            enum: ['chat', 'saved', 'dynamic'],
            default: 'chat',
            markdownDescription: 'Routes AI Chat prompts through normal chat, a saved CyberVinci Flow, or a dynamic workflow.'
        },
        _a[exports.CYBERVINCI_AI_CHAT_SAVED_WORKFLOW_PREF] = {
            type: 'string',
            default: '',
            markdownDescription: 'Selected CyberVinci Flow workflow id used when AI Chat workflow routing is set to Saved Flow.'
        },
        _a[exports.CYBERVINCI_AI_CHAT_VIRTUAL_REASONING_MODE_PREF] = {
            type: 'string',
            enum: ['off', 'auto', 'fast', 'balanced', 'deep', 'coding', 'research', 'lats'],
            default: 'off',
            markdownDescription: 'Virtual Reasoning mode applied to CyberVinci AI Chat turns.'
        },
        _a[exports.CYBERVINCI_AI_CHAT_VISION_JUDGE_ENABLED_PREF] = {
            type: 'boolean',
            default: false,
            markdownDescription: 'Enable an independent provider/model selection for the CyberVinci Vision Judge.'
        },
        _a[exports.CYBERVINCI_AI_CHAT_VISION_JUDGE_PROVIDER_PREF] = {
            type: 'string',
            default: '',
            markdownDescription: 'Provider used only by the CyberVinci Vision Judge when the independent visual model is enabled.'
        },
        _a[exports.CYBERVINCI_AI_CHAT_VISION_JUDGE_MODEL_PREF] = {
            type: 'string',
            default: '',
            markdownDescription: 'Model used only by the CyberVinci Vision Judge when the independent visual model is enabled.'
        },
        _a)
};
exports.CyberVinciAiChatExperiencePreferenceContribution = Symbol('CyberVinciAiChatExperiencePreferenceContribution');
exports.cyberVinciAiChatExperiencePreferenceContribution = {
    schema: exports.cyberVinciAiChatExperiencePreferenceSchema
};
