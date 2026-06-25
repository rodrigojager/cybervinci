"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listFlowModelProfiles = listFlowModelProfiles;
exports.getFlowModelProfile = getFlowModelProfile;
exports.mergeFlowModelProfiles = mergeFlowModelProfiles;
exports.normalizeFlowModelProfile = normalizeFlowModelProfile;
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
            serviceTier: 'flex',
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
            serviceTier: 'fast',
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
function listFlowModelProfiles(overrides) {
    if (overrides === void 0) { overrides = []; }
    return mergeFlowModelProfiles(BUILT_IN_MODEL_PROFILES, overrides);
}
function getFlowModelProfile(id) {
    if (!id) {
        return undefined;
    }
    var profile = BUILT_IN_MODEL_PROFILES.find(function (candidate) { return candidate.id === id; });
    return profile ? clone(profile) : undefined;
}
function mergeFlowModelProfiles(base, overrides) {
    if (overrides === void 0) { overrides = []; }
    var merged = new Map();
    for (var _i = 0, base_1 = base; _i < base_1.length; _i++) {
        var profile = base_1[_i];
        merged.set(profile.id, clone(profile));
    }
    for (var _a = 0, overrides_1 = overrides; _a < overrides_1.length; _a++) {
        var profile = overrides_1[_a];
        var normalized = normalizeFlowModelProfile(profile);
        merged.set(normalized.id, normalized);
    }
    return __spreadArray([], merged.values(), true).sort(function (left, right) {
        var leftIndex = base.findIndex(function (profile) { return profile.id === left.id; });
        var rightIndex = base.findIndex(function (profile) { return profile.id === right.id; });
        if (leftIndex >= 0 && rightIndex >= 0) {
            return leftIndex - rightIndex;
        }
        if (leftIndex >= 0) {
            return -1;
        }
        if (rightIndex >= 0) {
            return 1;
        }
        return left.name.localeCompare(right.name);
    });
}
function normalizeFlowModelProfile(profile) {
    var _a, _b, _c;
    var id = profile.id.trim();
    if (!id) {
        throw new Error('Model profile id is required.');
    }
    return {
        id: id,
        name: ((_a = profile.name) === null || _a === void 0 ? void 0 : _a.trim()) || id,
        description: ((_b = profile.description) === null || _b === void 0 ? void 0 : _b.trim()) || '',
        provider: profile.provider,
        execution: __assign(__assign({}, (profile.execution || {})), { profileId: id }),
        tags: (_c = profile.tags) === null || _c === void 0 ? void 0 : _c.map(function (tag) { return tag.trim(); }).filter(Boolean)
    };
}
function clone(value) {
    return JSON.parse(JSON.stringify(value));
}
