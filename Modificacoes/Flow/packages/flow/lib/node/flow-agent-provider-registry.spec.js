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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var flow_agent_provider_registry_1 = require("./flow-agent-provider-registry");
describe('FlowAgentProviderRegistry', function () {
    var envKeys = [
        'FLOW_AGENT_PROVIDER',
        'FLOW_AGENT_LLM_COMMAND',
        'FLOW_AGENT_COMMAND',
        'FLOW_AGENT_MODEL_ID',
        'FLOW_AGENT_LLM_MODEL_ID',
        (0, flow_agent_provider_registry_1.customProviderCommandEnvName)('open-router')
    ];
    var envSnapshot;
    beforeEach(function () {
        envSnapshot = snapshotEnv(envKeys);
        restoreEnv(Object.fromEntries(envKeys.map(function (key) { return [key, undefined]; })), envKeys);
    });
    afterEach(function () {
        restoreEnv(envSnapshot, envKeys);
    });
    it('resolves explicit command provider from state provider fields', function () { return __awaiter(void 0, void 0, void 0, function () {
        var registry, provider;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    process.env.FLOW_AGENT_LLM_COMMAND = 'node ./flow-agent-provider.js';
                    registry = new flow_agent_provider_registry_1.FlowAgentProviderRegistry();
                    return [4 /*yield*/, registry.resolveProvider(createResolutionContext({
                            provider: {
                                providerId: 'command',
                                modelId: 'ignored-by-command',
                                options: { temperature: 0.2 }
                            }
                        }))];
                case 1:
                    provider = _a.sent();
                    (0, chai_1.expect)('command' in provider && provider.command).to.equal('node ./flow-agent-provider.js');
                    (0, chai_1.expect)(provider.providerId).to.equal('command');
                    return [2 /*return*/];
            }
        });
    }); });
    it('resolves custom command-backed providers through sanitized env vars', function () { return __awaiter(void 0, void 0, void 0, function () {
        var registry, provider;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    process.env[(0, flow_agent_provider_registry_1.customProviderCommandEnvName)('open-router')] = 'node ./open-router-provider.js';
                    registry = new flow_agent_provider_registry_1.FlowAgentProviderRegistry();
                    return [4 /*yield*/, registry.resolveProvider(createResolutionContext({
                            provider: {
                                providerId: 'open-router'
                            }
                        }))];
                case 1:
                    provider = _a.sent();
                    (0, chai_1.expect)('command' in provider && provider.command).to.equal('node ./open-router-provider.js');
                    (0, chai_1.expect)(provider.providerId).to.equal('open-router');
                    return [2 /*return*/];
            }
        });
    }); });
    it('fails unsupported providers with state id, provider id, and configuration hint', function () { return __awaiter(void 0, void 0, void 0, function () {
        var registry;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    registry = new flow_agent_provider_registry_1.FlowAgentProviderRegistry();
                    return [4 /*yield*/, expectRejectedWith(registry.resolveProvider(createResolutionContext({ provider: { providerId: 'openrouter' } })), ['state "agent"', '"openrouter"', 'FLOW_AGENT_PROVIDER_OPENROUTER_COMMAND'])];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('fails missing providers instead of selecting deterministic fallback', function () { return __awaiter(void 0, void 0, void 0, function () {
        var registry;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    registry = new flow_agent_provider_registry_1.FlowAgentProviderRegistry();
                    return [4 /*yield*/, expectRejectedWith(registry.resolveProvider(createResolutionContext()), ['provider is missing', 'state "agent"', 'Deterministic production fallback is disabled'])];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('does not auto-select Codex when FLOW_AGENT_PROVIDER is unset or auto', function () { return __awaiter(void 0, void 0, void 0, function () {
        var registry;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    registry = new flow_agent_provider_registry_1.FlowAgentProviderRegistry(undefined, undefined, codexProviderService(true));
                    return [4 /*yield*/, expectRejectedWith(registry.resolveProvider(createResolutionContext()), ['provider is missing', 'Deterministic production fallback is disabled'])];
                case 1:
                    _a.sent();
                    process.env.FLOW_AGENT_PROVIDER = 'auto';
                    return [4 /*yield*/, expectRejectedWith(registry.resolveProvider(createResolutionContext()), ['provider is missing', 'Deterministic production fallback is disabled'])];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('resolves explicit FLOW_AGENT_PROVIDER=codex-provider when Codex is available', function () { return __awaiter(void 0, void 0, void 0, function () {
        var registry, provider;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    process.env.FLOW_AGENT_PROVIDER = 'codex-provider';
                    registry = new flow_agent_provider_registry_1.FlowAgentProviderRegistry(undefined, undefined, codexProviderService(true));
                    return [4 /*yield*/, registry.resolveProvider(createResolutionContext())];
                case 1:
                    provider = _a.sent();
                    (0, chai_1.expect)('codexProvider' in provider).to.equal(true);
                    (0, chai_1.expect)(provider.providerId).to.equal('codex-provider');
                    return [2 /*return*/];
            }
        });
    }); });
    it('allows e2e mock only when explicitly configured through FLOW_AGENT_PROVIDER', function () { return __awaiter(void 0, void 0, void 0, function () {
        var registry, provider;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    registry = new flow_agent_provider_registry_1.FlowAgentProviderRegistry();
                    return [4 /*yield*/, expectRejectedWith(registry.resolveProvider(createResolutionContext({ provider: { providerId: 'e2e-mock' } })), ['Set FLOW_AGENT_PROVIDER=e2e-mock'])];
                case 1:
                    _a.sent();
                    process.env.FLOW_AGENT_PROVIDER = 'e2e-mock';
                    return [4 /*yield*/, registry.resolveProvider(createResolutionContext({ provider: { providerId: 'e2e-mock' } }))];
                case 2:
                    provider = _a.sent();
                    (0, chai_1.expect)('mock' in provider && provider.mock).to.equal('e2e');
                    return [2 /*return*/];
            }
        });
    }); });
    it('fails clearly when a requested Theia modelId is unavailable', function () { return __awaiter(void 0, void 0, void 0, function () {
        var registry;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    registry = new flow_agent_provider_registry_1.FlowAgentProviderRegistry(unavailableLanguageModelRegistry(), {});
                    return [4 /*yield*/, expectRejectedWith(registry.resolveProvider(createResolutionContext({
                            provider: {
                                providerId: 'theia-language-model',
                                modelId: 'missing-model'
                            }
                        })), ['state "agent"', '"theia-language-model"', 'modelId "missing-model"'])];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('inherits the selected IDE chat language model when no node provider is configured', function () { return __awaiter(void 0, void 0, void 0, function () {
        var registry, provider;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    registry = new flow_agent_provider_registry_1.FlowAgentProviderRegistry(selectedLanguageModelRegistry('OpenCoder', 'chat', readyLanguageModel('gpt-5.5')), {});
                    return [4 /*yield*/, registry.resolveProvider(createResolutionContext())];
                case 1:
                    provider = _a.sent();
                    (0, chai_1.expect)(provider.providerId).to.equal('theia');
                    (0, chai_1.expect)('model' in provider && provider.model.id).to.equal('gpt-5.5');
                    (0, chai_1.expect)('agentId' in provider && provider.agentId).to.equal('OpenCoder');
                    (0, chai_1.expect)('purpose' in provider && provider.purpose).to.equal('chat');
                    return [2 /*return*/];
            }
        });
    }); });
    it('inherits the selected OpenPencil design language model when chat is not configured', function () { return __awaiter(void 0, void 0, void 0, function () {
        var registry, provider;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    registry = new flow_agent_provider_registry_1.FlowAgentProviderRegistry(selectedLanguageModelRegistry('OpenPencil', 'openpencil-design', readyLanguageModel('design-model')), {});
                    return [4 /*yield*/, registry.resolveProvider(createResolutionContext())];
                case 1:
                    provider = _a.sent();
                    (0, chai_1.expect)(provider.providerId).to.equal('theia');
                    (0, chai_1.expect)('model' in provider && provider.model.id).to.equal('design-model');
                    (0, chai_1.expect)('agentId' in provider && provider.agentId).to.equal('OpenPencil');
                    (0, chai_1.expect)('purpose' in provider && provider.purpose).to.equal('openpencil-design');
                    return [2 /*return*/];
            }
        });
    }); });
    it('does not inherit arbitrary ready models that were not selected for chat or design', function () { return __awaiter(void 0, void 0, void 0, function () {
        var registry;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    registry = new flow_agent_provider_registry_1.FlowAgentProviderRegistry(readyButUnselectedLanguageModelRegistry(), {});
                    return [4 /*yield*/, expectRejectedWith(registry.resolveProvider(createResolutionContext()), ['provider is missing', 'Deterministic production fallback is disabled'])];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
function createResolutionContext(statePatch) {
    if (statePatch === void 0) { statePatch = {}; }
    var state = __assign({ id: 'agent', type: 'agent', agent: 'reviewer', outputs: ['report.md'] }, statePatch);
    return {
        state: state,
        workload: {
            id: 'workload-1',
            runId: 'run-1',
            stateId: state.id || 'agent',
            status: 'running',
            agent: state.agent,
            inputArtifacts: [],
            outputArtifacts: [],
            issues: [],
            effectIds: [],
            createdAt: '2026-05-19T00:00:00.000Z',
            updatedAt: '2026-05-19T00:00:00.000Z'
        }
    };
}
function unavailableLanguageModelRegistry() {
    var _this = this;
    return {
        getLanguageModel: function (_modelId) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, undefined];
        }); }); },
        selectLanguageModel: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, undefined];
        }); }); },
        getLanguageModels: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, []];
        }); }); }
    };
}
function selectedLanguageModelRegistry(agentId, purpose, model) {
    var _this = this;
    return {
        getLanguageModel: function (_modelId) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, undefined];
        }); }); },
        selectLanguageModel: function (selection) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, selection.agent === agentId && selection.purpose === purpose ? model : undefined];
        }); }); },
        getLanguageModels: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, []];
        }); }); }
    };
}
function readyButUnselectedLanguageModelRegistry() {
    var _this = this;
    return {
        getLanguageModel: function (_modelId) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, undefined];
        }); }); },
        selectLanguageModel: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, undefined];
        }); }); },
        getLanguageModels: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, [readyLanguageModel('unselected-ready-model')]];
        }); }); }
    };
}
function readyLanguageModel(id) {
    return {
        id: id,
        name: id,
        status: { status: 'ready' }
    };
}
function codexProviderService(available) {
    var _this = this;
    return {
        getStatus: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, ({
                        available: available,
                        authenticated: available,
                        capabilities: { imageGeneration: available }
                    })];
            });
        }); }
    };
}
function expectRejectedWith(action, snippets) {
    return __awaiter(this, void 0, void 0, function () {
        var error_1, message, _i, snippets_1, snippet;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, action];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    message = error_1 instanceof Error ? error_1.message : String(error_1);
                    for (_i = 0, snippets_1 = snippets; _i < snippets_1.length; _i++) {
                        snippet = snippets_1[_i];
                        (0, chai_1.expect)(message).to.contain(snippet);
                    }
                    return [2 /*return*/];
                case 3: throw new Error('Expected promise to be rejected.');
            }
        });
    });
}
function snapshotEnv(keys) {
    return Object.fromEntries(keys.map(function (key) { return [key, process.env[key]]; }));
}
function restoreEnv(snapshot, keys) {
    for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
        var key = keys_1[_i];
        var value = snapshot[key];
        if (value === undefined) {
            delete process.env[key];
        }
        else {
            process.env[key] = value;
        }
    }
}
