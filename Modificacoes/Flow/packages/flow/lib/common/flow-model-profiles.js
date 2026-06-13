"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listFlowModelProfiles = listFlowModelProfiles;
exports.getFlowModelProfile = getFlowModelProfile;
var BUILT_IN_MODEL_PROFILES = [
    {
        id: 'inherit',
        name: 'Use chat selection',
        description: 'Use the currently selected Theia chat model with direct execution.',
        provider: { providerId: 'theia-language-model' },
        execution: {
            profileId: 'inherit',
            reasoningPolicy: 'off',
            temperature: 0.2,
            virtualReasoning: { enabled: false, mode: 'off' }
        },
        tags: ['default']
    },
    {
        id: 'cheap',
        name: 'Cheap',
        description: 'Use a low-cost direct call for classification or simple generation.',
        provider: { providerId: 'theia-language-model' },
        execution: {
            profileId: 'cheap',
            reasoningPolicy: 'off',
            temperature: 0.1,
            maxTokens: 2048,
            virtualReasoning: { enabled: false, mode: 'off' }
        },
        tags: ['cost']
    },
    {
        id: 'fast',
        name: 'Fast',
        description: 'Use a quick response profile with light virtual review.',
        provider: { providerId: 'theia-language-model' },
        execution: {
            profileId: 'fast',
            reasoningPolicy: 'virtual',
            temperature: 0.2,
            maxTokens: 4096,
            virtualReasoning: { enabled: true, mode: 'fast', maxCostMultiplier: 3 }
        },
        tags: ['speed']
    },
    {
        id: 'balanced',
        name: 'Balanced',
        description: 'Use planning, critique, revision, and verification when useful.',
        provider: { providerId: 'theia-language-model' },
        execution: {
            profileId: 'balanced',
            reasoningPolicy: 'auto',
            temperature: 0.2,
            maxTokens: 8192,
            virtualReasoning: { enabled: true, mode: 'balanced', maxCostMultiplier: 6 }
        },
        tags: ['general']
    },
    {
        id: 'smart',
        name: 'Smart',
        description: 'Prefer stronger reasoning for architecture, synthesis, and hard reviews.',
        provider: { providerId: 'theia-language-model' },
        execution: {
            profileId: 'smart',
            reasoningPolicy: 'auto',
            temperature: 0.15,
            maxTokens: 12000,
            nativeReasoning: { enabled: true, effort: 'medium' },
            virtualReasoning: { enabled: true, mode: 'balanced', maxCostMultiplier: 6 }
        },
        tags: ['quality']
    },
    {
        id: 'critical_judge',
        name: 'Critical Judge',
        description: 'Use strict low-temperature judgment for evaluators and verifiers.',
        provider: { providerId: 'theia-language-model' },
        execution: {
            profileId: 'critical_judge',
            reasoningPolicy: 'auto',
            temperature: 0,
            maxTokens: 8192,
            nativeReasoning: { enabled: true, effort: 'high' },
            virtualReasoning: { enabled: true, mode: 'balanced', maxCostMultiplier: 6 }
        },
        tags: ['judge', 'verification']
    },
    {
        id: 'code_reviewer',
        name: 'Code Reviewer',
        description: 'Use a careful profile for code critique, repair, and verification.',
        provider: { providerId: 'theia-language-model' },
        execution: {
            profileId: 'code_reviewer',
            reasoningPolicy: 'auto',
            temperature: 0.1,
            maxTokens: 12000,
            nativeReasoning: { enabled: true, effort: 'medium' },
            virtualReasoning: { enabled: true, mode: 'coding', maxCostMultiplier: 6 }
        },
        tags: ['code']
    },
    {
        id: 'json_extractor',
        name: 'JSON Extractor',
        description: 'Use deterministic JSON-oriented responses for classifiers and routers.',
        provider: { providerId: 'theia-language-model', options: { jsonMode: true } },
        execution: {
            profileId: 'json_extractor',
            reasoningPolicy: 'off',
            temperature: 0,
            maxTokens: 2048,
            virtualReasoning: { enabled: false, mode: 'off' }
        },
        tags: ['json']
    }
];
function listFlowModelProfiles() {
    return clone(BUILT_IN_MODEL_PROFILES);
}
function getFlowModelProfile(id) {
    if (!id) {
        return undefined;
    }
    var profile = BUILT_IN_MODEL_PROFILES.find(function (candidate) { return candidate.id === id; });
    return profile ? clone(profile) : undefined;
}
function clone(value) {
    return JSON.parse(JSON.stringify(value));
}
