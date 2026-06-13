"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
exports.SimulatedFlowWorkloadExecutor = exports.ProviderBackedFlowWorkloadExecutor = exports.FlowWorkloadExecutor = void 0;
exports.runVirtualReasoningHarness = runVirtualReasoningHarness;
var child_process_1 = require("child_process");
var fs = require("fs/promises");
var os = require("os");
var path = require("path");
var file_uri_1 = require("@theia/core/lib/common/file-uri");
var common_1 = require("@theia/core/lib/common");
var ai_core_1 = require("@theia/ai-core");
var Ajv = require("@theia/core/shared/ajv");
var inversify_1 = require("@theia/core/shared/inversify");
var common_2 = require("../common");
var flow_path_policy_1 = require("./flow-path-policy");
var agent_markdown_store_1 = require("./agent-markdown-store");
var command_effect_host_adapter_1 = require("./command-effect-host-adapter");
var file_effect_host_adapter_1 = require("./file-effect-host-adapter");
var image_effect_host_adapter_1 = require("./image-effect-host-adapter");
var workloadOutputSchema = require("./schemas/workload-output.schema.json");
var contractsSchema = require("./schemas/contracts.schema.json");
var flow_agent_provider_registry_1 = require("./flow-agent-provider-registry");
exports.FlowWorkloadExecutor = Symbol('FlowWorkloadExecutor');
var flowSchemaAjvOptions = {
    allErrors: true,
    validateSchema: false
};
function normalizeFlowSchemaForAjv(schema) {
    var $schema = schema.$schema, normalizedSchema = __rest(schema, ["$schema"]);
    return normalizedSchema;
}
var workloadOutputSchemaValidator = new Ajv(flowSchemaAjvOptions).compile(normalizeFlowSchemaForAjv(workloadOutputSchema));
var contractsSchemaValidator = new Ajv(flowSchemaAjvOptions).compile(normalizeFlowSchemaForAjv(contractsSchema));
var workloadOutputContractErrorPrefix = 'Workload output contract validation failed:';
var ProviderBackedFlowWorkloadExecutor = function () {
    var _classDecorators = [(0, inversify_1.injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var ProviderBackedFlowWorkloadExecutor = _classThis = /** @class */ (function () {
        function ProviderBackedFlowWorkloadExecutor_1(agentMarkdownStore, commandEffectHostAdapter, imageEffectHostAdapter, fileEffectHostAdapter, languageModelRegistry, languageModelService, codexProviderService, memoryAdapter, agentProviderResolver) {
            if (agentMarkdownStore === void 0) { agentMarkdownStore = new agent_markdown_store_1.AgentMarkdownStore(); }
            if (commandEffectHostAdapter === void 0) { commandEffectHostAdapter = new command_effect_host_adapter_1.LocalCommandEffectHostAdapter(); }
            if (imageEffectHostAdapter === void 0) { imageEffectHostAdapter = new image_effect_host_adapter_1.LocalImageEffectHostAdapter(); }
            if (fileEffectHostAdapter === void 0) { fileEffectHostAdapter = new file_effect_host_adapter_1.LocalFileEffectHostAdapter(); }
            this.agentMarkdownStore = agentMarkdownStore;
            this.commandEffectHostAdapter = commandEffectHostAdapter;
            this.imageEffectHostAdapter = imageEffectHostAdapter;
            this.fileEffectHostAdapter = fileEffectHostAdapter;
            this.languageModelRegistry = languageModelRegistry;
            this.languageModelService = languageModelService;
            this.codexProviderService = codexProviderService;
            this.memoryAdapter = memoryAdapter;
            this.agentProviderResolver = agentProviderResolver;
        }
        ProviderBackedFlowWorkloadExecutor_1.prototype.execute = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (context.state.type) {
                        case 'agent':
                            return [2 /*return*/, this.executeAgentWorkload(context)];
                        case 'dynamic_parallel':
                            return [2 /*return*/, this.executeDynamicParallelWorkload(context)];
                        case 'tournament':
                            return [2 /*return*/, this.executeTournamentWorkload(context)];
                        case 'context':
                            return [2 /*return*/, this.executeContextWorkload(context)];
                        case 'command':
                            return [2 /*return*/, this.executeCommandWorkload(context)];
                        case 'memory_write':
                            return [2 /*return*/, this.executeMemoryWriteWorkload(context)];
                        case 'report':
                            return [2 /*return*/, this.executeReportWorkload(context)];
                        default:
                            return [2 /*return*/, this.executeDefaultWorkload(context)];
                    }
                    return [2 /*return*/];
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.executeDynamicParallelWorkload = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var config, items, concurrency, runWorker, results, failed, aggregate, aggregatePath, aggregateArtifactUri, _i, _a, issue;
                var _this = this;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            config = context.state.dynamicParallel;
                            if (!(config === null || config === void 0 ? void 0 : config.itemsFrom) || !config.worker) {
                                return [2 /*return*/, this.completeWorkloadWithArtifacts(context, [], {
                                        effectSummary: "Dynamic parallel workload \"".concat(context.workload.stateId, "\" is missing item source or worker configuration."),
                                        completionStatus: 'failed'
                                    })];
                            }
                            return [4 /*yield*/, this.resolvePrimitiveItems(context, config.itemsFrom, config.maxItems)];
                        case 1:
                            items = _c.sent();
                            if (items.length === 0) {
                                return [2 /*return*/, this.completeWorkloadWithArtifacts(context, [], {
                                        effectSummary: "Dynamic parallel workload \"".concat(context.workload.stateId, "\" could not resolve any item from \"").concat(config.itemsFrom, "\"."),
                                        completionStatus: 'failed'
                                    })];
                            }
                            concurrency = boundedInteger(config.concurrency, 1, Math.max(1, items.length), 3);
                            runWorker = function (item) { return __awaiter(_this, void 0, void 0, function () {
                                var itemArtifact, workerStateId, workerState;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0: return [4 /*yield*/, this.materializePrimitiveInputArtifact(context, "dynamic-parallel/".concat(context.workload.stateId, "/items/item-").concat(item.index, ".json"), JSON.stringify({ index: item.index, item: item.value }, undefined, 2))];
                                        case 1:
                                            itemArtifact = _b.sent();
                                            workerStateId = "".concat(context.workload.stateId, ".item_").concat(item.index);
                                            workerState = __assign(__assign({}, config.worker), { id: workerStateId, agent: config.worker.agent || context.state.agent, input: __assign(__assign({}, (config.worker.input || {})), { include: uniqueStrings(__spreadArray(__spreadArray(__spreadArray([], (((_a = config.worker.input) === null || _a === void 0 ? void 0 : _a.include) || []), true), context.workload.inputArtifacts, true), [
                                                        itemArtifact.summary || itemArtifact.uri
                                                    ], false)) }) });
                                            return [2 /*return*/, this.executePrimitiveStep(context, workerStateId, workerState, {
                                                    itemIndex: item.index,
                                                    item: item.value,
                                                    parentStateId: context.workload.stateId
                                                })];
                                    }
                                });
                            }); };
                            return [4 /*yield*/, mapWithConcurrency(items, concurrency, runWorker)];
                        case 2:
                            results = _c.sent();
                            failed = dynamicParallelFailed(results, config.failurePolicy, config.failureThreshold);
                            aggregate = {
                                type: 'dynamic_parallel',
                                stateId: context.workload.stateId,
                                itemCount: items.length,
                                successCount: results.filter(function (result) { return !result.failed; }).length,
                                failureCount: results.filter(function (result) { return result.failed; }).length,
                                failurePolicy: config.failurePolicy || 'best_effort',
                                joinStrategy: config.joinStrategy || 'collect',
                                results: results.map(function (result) { return primitiveResultSummary(result); })
                            };
                            aggregatePath = config.outputKey || ((_b = context.state.outputs) === null || _b === void 0 ? void 0 : _b[0]) || "dynamic-parallel/".concat(context.workload.stateId, "/results.json");
                            return [4 /*yield*/, this.writePrimitiveAggregateArtifact(context, aggregatePath, aggregate)];
                        case 3:
                            aggregateArtifactUri = _c.sent();
                            this.registerPrimitiveAggregateSignals(context, 'dynamic_parallel', aggregate.itemCount, aggregate.successCount, aggregate.failureCount);
                            for (_i = 0, _a = primitiveIssues(results); _i < _a.length; _i++) {
                                issue = _a[_i];
                                if (!context.workload.issues.includes(issue)) {
                                    context.workload.issues.push(issue);
                                }
                            }
                            context.workload.outputEnvelope = primitiveOutputEnvelope(context, failed ? 'failed' : 'completed', aggregatePath, aggregate);
                            return [2 /*return*/, this.completeWorkloadWithArtifacts(context, [aggregateArtifactUri], {
                                    effectSummary: failed
                                        ? "Dynamic parallel \"".concat(context.workload.stateId, "\" completed with ").concat(aggregate.failureCount, " failed item(s).")
                                        : "Dynamic parallel \"".concat(context.workload.stateId, "\" completed ").concat(aggregate.successCount, " item(s)."),
                                    completionStatus: failed ? 'failed' : 'completed'
                                })];
                    }
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.executeTournamentWorkload = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var config, candidates, candidateArtifact, judgeStateId, judgeState, judgeResult, aggregate, aggregatePath, aggregateArtifactUri, _i, _a, issue;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            config = context.state.tournament;
                            if (!(config === null || config === void 0 ? void 0 : config.candidatesFrom) || !config.judge) {
                                return [2 /*return*/, this.completeWorkloadWithArtifacts(context, [], {
                                        effectSummary: "Tournament workload \"".concat(context.workload.stateId, "\" is missing candidate source or judge configuration."),
                                        completionStatus: 'failed'
                                    })];
                            }
                            return [4 /*yield*/, this.resolvePrimitiveItems(context, config.candidatesFrom, config.maxComparisons)];
                        case 1:
                            candidates = _e.sent();
                            if (candidates.length === 0) {
                                return [2 /*return*/, this.completeWorkloadWithArtifacts(context, [], {
                                        effectSummary: "Tournament workload \"".concat(context.workload.stateId, "\" could not resolve any candidate from \"").concat(config.candidatesFrom, "\"."),
                                        completionStatus: 'failed'
                                    })];
                            }
                            return [4 /*yield*/, this.materializePrimitiveInputArtifact(context, "tournament/".concat(context.workload.stateId, "/candidates.json"), JSON.stringify({
                                    candidates: candidates.map(function (candidate) { return ({ index: candidate.index, value: candidate.value }); }),
                                    criteria: config.criteria || [],
                                    strategy: config.strategy || 'single_round',
                                    winnerCount: config.winnerCount || 1,
                                    tieBreaker: config.tieBreaker || 'judge_again'
                                }, undefined, 2))];
                        case 2:
                            candidateArtifact = _e.sent();
                            judgeStateId = "".concat(context.workload.stateId, ".judge");
                            judgeState = __assign(__assign({}, config.judge), { id: judgeStateId, agent: config.judge.agent || context.state.agent || 'judge', input: __assign(__assign({}, (config.judge.input || {})), { include: uniqueStrings(__spreadArray(__spreadArray(__spreadArray([], (((_b = config.judge.input) === null || _b === void 0 ? void 0 : _b.include) || []), true), context.workload.inputArtifacts, true), [
                                        candidateArtifact.summary || candidateArtifact.uri
                                    ], false)) }), taskPrompt: __spreadArray([
                                    config.judge.taskPrompt || 'Judge the candidates and select the winner(s).',
                                    '',
                                    "Strategy: ".concat(config.strategy || 'single_round', "."),
                                    "Winner count: ".concat(config.winnerCount || 1, "."),
                                    "Tie breaker: ".concat(config.tieBreaker || 'judge_again', ".")
                                ], (((_c = config.criteria) === null || _c === void 0 ? void 0 : _c.length) ? __spreadArray(['', 'Criteria:'], config.criteria.map(function (item) { return "- ".concat(item); }), true) : []), true).join('\n') });
                            return [4 /*yield*/, this.executePrimitiveStep(context, judgeStateId, judgeState, {
                                    candidateCount: candidates.length,
                                    parentStateId: context.workload.stateId,
                                    strategy: config.strategy || 'single_round'
                                })];
                        case 3:
                            judgeResult = _e.sent();
                            aggregate = {
                                type: 'tournament',
                                stateId: context.workload.stateId,
                                candidateCount: candidates.length,
                                strategy: config.strategy || 'single_round',
                                winnerCount: config.winnerCount || 1,
                                tieBreaker: config.tieBreaker || 'judge_again',
                                criteria: config.criteria || [],
                                judge: primitiveResultSummary(judgeResult)
                            };
                            aggregatePath = ((_d = context.state.outputs) === null || _d === void 0 ? void 0 : _d[0]) || "tournament/".concat(context.workload.stateId, "/result.json");
                            return [4 /*yield*/, this.writePrimitiveAggregateArtifact(context, aggregatePath, aggregate)];
                        case 4:
                            aggregateArtifactUri = _e.sent();
                            this.registerPrimitiveAggregateSignals(context, 'tournament', candidates.length, judgeResult.failed ? 0 : 1, judgeResult.failed ? 1 : 0);
                            for (_i = 0, _a = primitiveIssues([judgeResult]); _i < _a.length; _i++) {
                                issue = _a[_i];
                                if (!context.workload.issues.includes(issue)) {
                                    context.workload.issues.push(issue);
                                }
                            }
                            context.workload.outputEnvelope = primitiveOutputEnvelope(context, judgeResult.failed ? 'failed' : 'completed', aggregatePath, aggregate);
                            return [2 /*return*/, this.completeWorkloadWithArtifacts(context, [aggregateArtifactUri], {
                                    effectSummary: judgeResult.failed
                                        ? "Tournament \"".concat(context.workload.stateId, "\" judge failed.")
                                        : "Tournament \"".concat(context.workload.stateId, "\" selected winner(s) from ").concat(candidates.length, " candidate(s)."),
                                    completionStatus: judgeResult.failed ? 'failed' : 'completed'
                                })];
                    }
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.executeAgentWorkload = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var provider, error_1, policy, maxRetries, totalAttempts, attempt, error_2, message, error_3, message;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, this.resolveLlmProvider(context)];
                        case 1:
                            provider = _a.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            error_1 = _a.sent();
                            return [2 /*return*/, this.completeWorkloadWithArtifacts(context, [], {
                                    effectSummary: "Agent workload \"".concat(context.state.id || context.workload.stateId, "\" failed before execution: ").concat(errorToMessage(error_1)),
                                    completionStatus: 'failed'
                                })];
                        case 3:
                            policy = context.state.retry;
                            maxRetries = parseRetryMax(policy === null || policy === void 0 ? void 0 : policy.max);
                            totalAttempts = maxRetries + 1;
                            _a.label = 4;
                        case 4:
                            _a.trys.push([4, 11, , 12]);
                            attempt = 1;
                            _a.label = 5;
                        case 5:
                            if (!(attempt <= totalAttempts)) return [3 /*break*/, 10];
                            _a.label = 6;
                        case 6:
                            _a.trys.push([6, 8, , 9]);
                            return [4 /*yield*/, this.executeRealAgentWorkload(context, provider)];
                        case 7: return [2 /*return*/, _a.sent()];
                        case 8:
                            error_2 = _a.sent();
                            message = errorToMessage(error_2);
                            if (attempt <= maxRetries) {
                                pushEvent(context.run, {
                                    type: 'workload.retry',
                                    stateId: context.workload.stateId,
                                    workloadId: context.workload.id,
                                    message: "Agent workload \"".concat(context.state.id || context.workload.stateId, "\" failed on attempt ").concat(attempt, "; retrying (max ").concat(maxRetries, ", attempt ").concat(attempt + 1, "/").concat(totalAttempts, ")."),
                                    payload: {
                                        attempt: attempt,
                                        totalAttempts: totalAttempts,
                                        maxRetries: maxRetries,
                                        retryCounter: policy === null || policy === void 0 ? void 0 : policy.counter,
                                        error: message
                                    }
                                });
                                return [3 /*break*/, 9];
                            }
                            if (message.startsWith(workloadOutputContractErrorPrefix) || maxRetries > 0) {
                                pushEvent(context.run, {
                                    type: 'workload.failed',
                                    stateId: context.workload.stateId,
                                    workloadId: context.workload.id,
                                    message: "Agent workload \"".concat(context.state.id || context.workload.stateId, "\" failed after ").concat(attempt, " attempts."),
                                    payload: {
                                        attempt: attempt,
                                        totalAttempts: totalAttempts,
                                        maxRetries: maxRetries,
                                        retryCounter: policy === null || policy === void 0 ? void 0 : policy.counter,
                                        error: message
                                    }
                                });
                                return [2 /*return*/, this.completeWorkloadWithArtifacts(context, [], {
                                        effectSummary: "Agent workload \"".concat(context.state.id || context.workload.stateId, "\" failed after ").concat(attempt, " attempts: ").concat(message),
                                        completionStatus: 'failed'
                                    })];
                            }
                            return [2 /*return*/, this.completeWorkloadWithArtifacts(context, [], {
                                    effectSummary: "Agent workload \"".concat(context.state.id || context.workload.stateId, "\" failed: ").concat(message),
                                    completionStatus: 'failed'
                                })];
                        case 9:
                            attempt += 1;
                            return [3 /*break*/, 5];
                        case 10: return [2 /*return*/, this.completeWorkloadWithArtifacts(context, [], {
                                effectSummary: "Agent workload \"".concat(context.state.id || context.workload.stateId, "\" failed: retry limit reached (").concat(maxRetries, ")."),
                                completionStatus: 'failed'
                            })];
                        case 11:
                            error_3 = _a.sent();
                            message = errorToMessage(error_3);
                            if (maxRetries > 0 || message.startsWith(workloadOutputContractErrorPrefix)) {
                                pushEvent(context.run, {
                                    type: 'workload.failed',
                                    stateId: context.workload.stateId,
                                    workloadId: context.workload.id,
                                    message: "Agent workload \"".concat(context.state.id || context.workload.stateId, "\" failed."),
                                    payload: {
                                        attempt: totalAttempts,
                                        totalAttempts: totalAttempts,
                                        maxRetries: maxRetries,
                                        retryCounter: policy === null || policy === void 0 ? void 0 : policy.counter,
                                        error: message
                                    }
                                });
                                return [2 /*return*/, this.completeWorkloadWithArtifacts(context, [], {
                                        effectSummary: "Agent workload \"".concat(context.state.id || context.workload.stateId, "\" failed: ").concat(message),
                                        completionStatus: 'failed'
                                    })];
                            }
                            return [2 /*return*/, this.completeWorkloadWithArtifacts(context, [], {
                                    effectSummary: "Agent workload \"".concat(context.state.id || context.workload.stateId, "\" failed: ").concat(message),
                                    completionStatus: 'failed'
                                })];
                        case 12: return [2 /*return*/];
                    }
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.executeRealAgentWorkload = function (context, provider) {
            return __awaiter(this, void 0, void 0, function () {
                var workloadDir, inputArtifacts, agentPath, agentMarkdown, providerPayload, rawResult, resolvedResult, expectedOutputs, generation, generatedEnvelope, resultJsonArtifactUri, outputArtifactUris, blockingEffectFailures, completionStatus, completionSummary;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            workloadDir = workloadOutputDir(context.workspaceRootUri, context.run.id, context.workload.id);
                            return [4 /*yield*/, this.prepareWorkOrderEnvelope(context, workloadDir)];
                        case 1:
                            inputArtifacts = _a.sent();
                            agentPath = resolveAgentPath(context);
                            return [4 /*yield*/, this.loadAgentMarkdown(context, agentPath)];
                        case 2:
                            agentMarkdown = _a.sent();
                            return [4 /*yield*/, this.ensureWorkloadContextPack(context)];
                        case 3:
                            _a.sent();
                            providerPayload = this.buildProviderPayload(context, agentMarkdown.content, inputArtifacts);
                            return [4 /*yield*/, this.invokeLlmProvider(context, providerPayload, provider, workloadDir)];
                        case 4:
                            rawResult = _a.sent();
                            return [4 /*yield*/, resolveAgentResultPayload(rawResult, workloadDir)];
                        case 5:
                            resolvedResult = _a.sent();
                            expectedOutputs = expectedOutputPaths(context.state);
                            generation = parseAgentGenerationResult(resolvedResult, expectedOutputs, context, { allowFallback: false });
                            normalizeContractPackageGeneration(context, generation, expectedOutputs, inputArtifacts);
                            return [4 /*yield*/, normalizeQaGeneration(context, generation, inputArtifacts)];
                        case 6:
                            _a.sent();
                            generatedEnvelope = buildWorkloadOutputEnvelope(context, generation);
                            validateWorkloadOutputEnvelope(generatedEnvelope, context);
                            return [4 /*yield*/, writeValidatedWorkloadResultJson(workloadDir, generatedEnvelope, context)];
                        case 7:
                            resultJsonArtifactUri = _a.sent();
                            validateGeneratedArtifactCoverage(generation.artifacts, expectedOutputs, context);
                            return [4 /*yield*/, writeAgentOutputs(workloadDir, expectedOutputs, generation.artifacts)];
                        case 8:
                            outputArtifactUris = _a.sent();
                            return [4 /*yield*/, this.applyProviderGenerationToRun(context, generation)];
                        case 9:
                            blockingEffectFailures = _a.sent();
                            completionStatus = blockingEffectFailures.length > 0 ? 'failed' : generation.status;
                            completionSummary = blockingEffectFailures.length > 0
                                ? "".concat(generation.summary || "Agent workload \"".concat(context.state.id || context.workload.stateId, "\" completed with blocked effects."), " ").concat(blockingEffectFailures.join(' '))
                                : generation.summary || "Agent workload \"".concat(context.state.id || context.workload.stateId, "\" completed.");
                            return [2 /*return*/, this.completeWorkloadWithArtifacts(context, __spreadArray(__spreadArray([], outputArtifactUris, true), [resultJsonArtifactUri], false), {
                                    effectSummary: completionSummary,
                                    completionStatus: completionStatus
                                })];
                    }
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.buildProviderPayload = function (context, agentMarkdown, inputArtifacts) {
            var parsedAgentMarkdown = parseAgentMarkdownSections(agentMarkdown);
            var expectedOutputs = expectedOutputPaths(context.state);
            return {
                role: parsedAgentMarkdown.role,
                qualityCriteria: parsedAgentMarkdown.qualityCriteria,
                instructions: {
                    systemPrompt: toOptionalTrimmedString(context.state.systemPrompt),
                    taskPrompt: toOptionalTrimmedString(context.state.taskPrompt)
                },
                modelExecution: context.state.modelExecution,
                orchestrationPrimitive: {
                    type: context.state.type,
                    dynamicParallel: context.state.dynamicParallel,
                    tournament: context.state.tournament
                },
                context: {
                    prompt: (0, common_2.truncateFlowText)(context.run.prompt, common_2.FlowSizeLimits.promptBytes, 'prompt'),
                    workflow: { id: context.workflow.id, name: context.workflow.name },
                    stateId: context.workload.stateId,
                    workloadId: context.workload.id,
                    contextPack: renderContextPack(resolveContextPackForWorkload(context.run, context.workflow, context.workload), context.workflow, context.workload),
                    inputArtifacts: inputArtifacts.map(function (artifact) { return ({
                        path: artifact.path,
                        content: artifact.content
                    }); })
                },
                workOrder: renderWorkOrder(context.workflow, context.workload, context.state),
                expectedOutput: {
                    format: parsedAgentMarkdown.outputFormat || buildDefaultExpectedOutputFormat(expectedOutputs),
                    allowedPaths: expectedOutputs,
                    deliverables: normalizedDeliverables(context.state)
                }
            };
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.prepareWorkOrderEnvelope = function (context, workloadDir) {
            return __awaiter(this, void 0, void 0, function () {
                var inputDir;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            inputDir = path.join(workloadDir, 'input');
                            return [4 /*yield*/, fs.mkdir(path.join(inputDir, 'artifacts'), { recursive: true })];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, fs.writeFile(path.join(inputDir, 'prompt.md'), (0, common_2.truncateFlowText)(context.run.prompt, common_2.FlowSizeLimits.promptBytes, 'prompt'), 'utf8')];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, this.ensureWorkloadContextPack(context)];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, fs.writeFile(path.join(inputDir, 'context-pack.md'), renderContextPack(resolveContextPackForWorkload(context.run, context.workflow, context.workload), context.workflow, context.workload), 'utf8')];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, fs.writeFile(path.join(inputDir, 'work-order.md'), renderWorkOrder(context.workflow, context.workload, context.state), 'utf8')];
                        case 5:
                            _a.sent();
                            return [2 /*return*/, this.copyInputArtifacts(context, path.join(inputDir, 'artifacts'))];
                    }
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.ensureWorkloadContextPack = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var pack;
                var _a;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if ((_b = context.run.workloadContextPacks) === null || _b === void 0 ? void 0 : _b[context.workload.id]) {
                                return [2 /*return*/];
                            }
                            if (!this.memoryAdapter) {
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, this.memoryAdapter.buildContextPack(context.workspaceRootUri, context.workflow, context.workload)];
                        case 1:
                            pack = _c.sent();
                            context.run.workloadContextPacks = __assign(__assign({}, (context.run.workloadContextPacks || {})), (_a = {}, _a[context.workload.id] = pack, _a));
                            return [2 /*return*/];
                    }
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.copyInputArtifacts = function (context, artifactDir) {
            return __awaiter(this, void 0, void 0, function () {
                var copied, _i, _a, included, targetFile, sourceArtifact, content;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            copied = [];
                            _i = 0, _a = context.workload.inputArtifacts;
                            _b.label = 1;
                        case 1:
                            if (!(_i < _a.length)) return [3 /*break*/, 6];
                            included = _a[_i];
                            targetFile = path.join.apply(path, __spreadArray([artifactDir], safeArtifactPathParts(included), false));
                            sourceArtifact = findInputArtifactPath(context.run, included);
                            if (!sourceArtifact) {
                                throw new Error("Required input artifact \"".concat(included, "\" could not be resolved from run artifacts."));
                            }
                            return [4 /*yield*/, readTextFile(sourceArtifact)];
                        case 2:
                            content = _b.sent();
                            if (content === undefined) {
                                throw new Error("Required input artifact \"".concat(included, "\" could not be read from ").concat(sourceArtifact, "."));
                            }
                            return [4 /*yield*/, fs.mkdir(path.dirname(targetFile), { recursive: true })];
                        case 3:
                            _b.sent();
                            return [4 /*yield*/, fs.writeFile(targetFile, normalizeText(content), 'utf8')];
                        case 4:
                            _b.sent();
                            copied.push({ path: included, content: content });
                            _b.label = 5;
                        case 5:
                            _i++;
                            return [3 /*break*/, 1];
                        case 6: return [2 /*return*/, copied];
                    }
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.resolvePrimitiveItems = function (context, source, maxItems) {
            return __awaiter(this, void 0, void 0, function () {
                var limit, directArtifactPath, content, parsed, matchingArtifacts, values, _i, matchingArtifacts_1, artifact, filePath, content, _a, signal, parsed;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            limit = boundedInteger(maxItems, 1, 100, 25);
                            directArtifactPath = findInputArtifactPath(context.run, source);
                            if (!directArtifactPath) return [3 /*break*/, 2];
                            return [4 /*yield*/, readTextFile(directArtifactPath)];
                        case 1:
                            content = _b.sent();
                            parsed = primitiveItemsFromText(content || '', source);
                            if (parsed.length > 0) {
                                return [2 /*return*/, parsed.slice(0, limit).map(function (value, index) { return ({ index: index + 1, value: value, source: source }); })];
                            }
                            _b.label = 2;
                        case 2:
                            matchingArtifacts = findPrimitiveSourceArtifacts(context.run, source);
                            if (!(matchingArtifacts.length > 0)) return [3 /*break*/, 9];
                            values = [];
                            _i = 0, matchingArtifacts_1 = matchingArtifacts;
                            _b.label = 3;
                        case 3:
                            if (!(_i < matchingArtifacts_1.length)) return [3 /*break*/, 8];
                            artifact = matchingArtifacts_1[_i];
                            filePath = artifactPathFromUri(artifact.uri);
                            if (!filePath) return [3 /*break*/, 5];
                            return [4 /*yield*/, readTextFile(filePath)];
                        case 4:
                            _a = _b.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            _a = undefined;
                            _b.label = 6;
                        case 6:
                            content = _a;
                            values.push({
                                path: artifact.summary || artifact.uri,
                                content: content || ''
                            });
                            _b.label = 7;
                        case 7:
                            _i++;
                            return [3 /*break*/, 3];
                        case 8: return [2 /*return*/, values.slice(0, limit).map(function (value, index) { return ({ index: index + 1, value: value, source: source }); })];
                        case 9:
                            signal = context.run.signals.find(function (candidate) { return candidate.key === source; });
                            if (signal) {
                                parsed = primitiveItemsFromText(String(signal.value), source);
                                if (parsed.length > 0) {
                                    return [2 /*return*/, parsed.slice(0, limit).map(function (value, index) { return ({ index: index + 1, value: value, source: source }); })];
                                }
                                return [2 /*return*/, [{ index: 1, value: signal.value, source: source }]];
                            }
                            if (source === 'prompt' || source === 'input/request.md') {
                                return [2 /*return*/, [{ index: 1, value: context.run.prompt, source: source }]];
                            }
                            return [2 /*return*/, []];
                    }
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.materializePrimitiveInputArtifact = function (context, relativePath, content) {
            return __awaiter(this, void 0, void 0, function () {
                var workloadDir, artifactPath, artifactUri, artifact;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            workloadDir = workloadOutputDir(context.workspaceRootUri, context.run.id, context.workload.id);
                            artifactPath = path.join.apply(path, __spreadArray([workloadDir, 'primitive-inputs'], safeArtifactPathParts(relativePath), false));
                            return [4 /*yield*/, writeOutputFile(artifactPath, content)];
                        case 1:
                            artifactUri = _a.sent();
                            artifact = {
                                id: stableId('artifact', context.run.id, context.workload.id, relativePath),
                                runId: context.run.id,
                                stateId: context.workload.stateId,
                                uri: artifactUri,
                                kind: 'input',
                                summary: relativePath,
                                createdAt: timestamp()
                            };
                            upsertArtifact(context.run.artifacts, artifact);
                            pushEvent(context.run, {
                                type: 'artifact.created',
                                stateId: context.workload.stateId,
                                workloadId: context.workload.id,
                                message: "Primitive input \"".concat(relativePath, "\" created.")
                            });
                            return [2 /*return*/, artifact];
                    }
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.writePrimitiveAggregateArtifact = function (context, relativePath, payload) {
            return __awaiter(this, void 0, void 0, function () {
                var workloadDir, artifactPath;
                return __generator(this, function (_a) {
                    workloadDir = workloadOutputDir(context.workspaceRootUri, context.run.id, context.workload.id);
                    artifactPath = path.join.apply(path, __spreadArray([workloadDir, 'output', 'artifacts'], safeArtifactPathParts(relativePath), false));
                    return [2 /*return*/, writeOutputFile(artifactPath, JSON.stringify(payload, undefined, 2))];
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.executePrimitiveStep = function (parentContext, stateId, state, metadata) {
            return __awaiter(this, void 0, void 0, function () {
                var now, workload, stepContext, error_4, message, result;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            now = timestamp();
                            workload = {
                                id: stableId('primitive-workload', parentContext.workload.id, stateId),
                                runId: parentContext.run.id,
                                stateId: stateId,
                                branchId: parentContext.workload.stateId,
                                agent: state.agent,
                                status: 'running',
                                inputArtifacts: ((_a = state.input) === null || _a === void 0 ? void 0 : _a.include) || [],
                                outputArtifacts: [],
                                issues: [],
                                effectIds: [],
                                createdAt: now,
                                updatedAt: now
                            };
                            parentContext.run.workloads.push(workload);
                            parentContext.run.stateStatuses[stateId] = 'running';
                            pushEvent(parentContext.run, {
                                type: 'workload.created',
                                stateId: stateId,
                                workloadId: workload.id,
                                message: "Primitive workload \"".concat(workload.id, "\" created.")
                            });
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            stepContext = {
                                workflow: parentContext.workflow,
                                run: parentContext.run,
                                state: state,
                                workload: workload
                            };
                            if (parentContext.workspaceRootUri) {
                                stepContext.workspaceRootUri = parentContext.workspaceRootUri;
                            }
                            return [4 /*yield*/, this.execute(stepContext)];
                        case 2:
                            _b.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            error_4 = _b.sent();
                            message = errorToMessage(error_4);
                            workload.status = 'failed';
                            workload.updatedAt = timestamp();
                            workload.issues.push(message);
                            parentContext.run.stateStatuses[stateId] = 'failed';
                            pushEvent(parentContext.run, {
                                type: 'workload.failed',
                                stateId: stateId,
                                workloadId: workload.id,
                                message: message,
                                payload: { parentStateId: parentContext.workload.stateId, metadata: metadata }
                            });
                            return [3 /*break*/, 4];
                        case 4:
                            result = {
                                stateId: stateId,
                                workloadId: workload.id,
                                failed: workload.status === 'failed',
                                artifacts: parentContext.run.artifacts.filter(function (artifact) { return artifact.stateId === stateId; }),
                                effects: parentContext.run.effects.filter(function (effect) { return effect.stateId === stateId; }),
                                signals: parentContext.run.signals.filter(function (signal) { return signal.stateId === stateId; }),
                                issues: workload.issues
                            };
                            if (metadata) {
                                result.metadata = metadata;
                            }
                            return [2 /*return*/, result];
                    }
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.registerPrimitiveAggregateSignals = function (context, primitive, itemCount, successCount, failureCount) {
            var _a;
            var now = timestamp();
            var base = "".concat(context.workload.stateId, ".").concat(primitive);
            for (var _i = 0, _b = Object.entries((_a = {},
                _a["".concat(base, ".item_count")] = itemCount,
                _a["".concat(base, ".success_count")] = successCount,
                _a["".concat(base, ".failure_count")] = failureCount,
                _a)); _i < _b.length; _i++) {
                var _c = _b[_i], key = _c[0], value = _c[1];
                context.run.signals.push({
                    key: key,
                    value: value,
                    stateId: context.workload.stateId,
                    runId: context.run.id,
                    createdAt: now
                });
            }
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.loadAgentMarkdown = function (context, agentPath) {
            return __awaiter(this, void 0, void 0, function () {
                var found;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.agentMarkdownStore.readAgent(context.workspaceRootUri, agentPath, { createIfMissing: false })];
                        case 1:
                            found = _a.sent();
                            if (!found) {
                                throw new Error("Agent markdown \"".concat(agentPath, "\" was not found in workspace agent store."));
                            }
                            return [2 /*return*/, found];
                    }
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.applyProviderGenerationToRun = function (context, generation) {
            return __awaiter(this, void 0, void 0, function () {
                var workload, blockingEffectFailures, _i, _a, issue, issueSummary, _b, blockingEffectFailures_1, failure;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            workload = context.workload;
                            workload.outputEnvelope = buildWorkloadOutputEnvelope(context, generation);
                            this.registerGeneratedSignals(context, generation.signals);
                            this.registerGeneratedIssues(context, generation.issues);
                            return [4 /*yield*/, this.registerGeneratedEffects(context, generation.effects)];
                        case 1:
                            blockingEffectFailures = _c.sent();
                            this.synchronizeWorkloadEnvelopeEffects(context);
                            this.registerGeneratedMemoryCandidates(context, generation.memoryCandidates);
                            for (_i = 0, _a = generation.issues; _i < _a.length; _i++) {
                                issue = _a[_i];
                                issueSummary = issue.summary;
                                if (issueSummary && !workload.issues.includes(issueSummary)) {
                                    workload.issues.push(issueSummary);
                                }
                            }
                            for (_b = 0, blockingEffectFailures_1 = blockingEffectFailures; _b < blockingEffectFailures_1.length; _b++) {
                                failure = blockingEffectFailures_1[_b];
                                if (!workload.issues.includes(failure)) {
                                    workload.issues.push(failure);
                                }
                            }
                            return [2 /*return*/, blockingEffectFailures];
                    }
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.synchronizeWorkloadEnvelopeEffects = function (context) {
            var envelope = context.workload.outputEnvelope;
            if (!envelope) {
                return;
            }
            var workloadEffectIds = new Set(context.workload.effectIds);
            var effects = context.run.effects
                .filter(function (effect) { return effect.stateId === context.workload.stateId && workloadEffectIds.has(effect.id); })
                .map(function (effect) { return flowEffectToWorkloadResultEffect(effect); });
            if (effects.length > 0) {
                envelope.effects = effects;
            }
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.registerGeneratedSignals = function (context, signals) {
            for (var _i = 0, _a = Object.entries(signals); _i < _a.length; _i++) {
                var _b = _a[_i], key = _b[0], value = _b[1];
                if (!key || !isSignalPrimitive(value)) {
                    continue;
                }
                context.run.signals.push({
                    key: key,
                    value: value,
                    stateId: context.workload.stateId,
                    runId: context.run.id,
                    createdAt: timestamp()
                });
            }
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.registerGeneratedIssues = function (context, issues) {
            var run = context.run, workload = context.workload;
            var stateId = workload.stateId;
            var existingMessages = new Set(run.signals
                .filter(function (signal) { return signal.key === "".concat(stateId, ".issue") && typeof signal.value === 'string'; })
                .map(function (signal) { return signal.value; }));
            for (var _i = 0, issues_1 = issues; _i < issues_1.length; _i++) {
                var issue = issues_1[_i];
                if (!issue.summary) {
                    continue;
                }
                var message = issue.summary;
                if (existingMessages.has(message)) {
                    continue;
                }
                existingMessages.add(message);
                run.signals.push({
                    key: "".concat(stateId, ".issue"),
                    value: message,
                    stateId: stateId,
                    runId: run.id,
                    createdAt: timestamp()
                });
            }
            for (var _a = 0, issues_2 = issues; _a < issues_2.length; _a++) {
                var issue = issues_2[_a];
                if (!workload.issues.includes(issue.summary)) {
                    workload.issues.push(issue.summary);
                }
            }
            updateSecondRunSuggestion(context.run, issues, context.workload.stateId);
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.registerGeneratedEffects = function (context, effects) {
            return __awaiter(this, void 0, void 0, function () {
                var stateId, now, normalizedStatus, blockingFailures, _i, effects_1, effect, fileResult, _a, imageResult, _b, effectId, kind, summary, status_1, fileStatuses, _c, fileStatuses_1, transitionStatus;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            stateId = context.workload.stateId;
                            now = timestamp();
                            normalizedStatus = normalizeWorkloadCompletionStatus(context, effects);
                            blockingFailures = [];
                            _i = 0, effects_1 = effects;
                            _d.label = 1;
                        case 1:
                            if (!(_i < effects_1.length)) return [3 /*break*/, 9];
                            effect = effects_1[_i];
                            if (!isFileEffectType(effect.type)) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.applyGeneratedFileEffect(context, effect)];
                        case 2:
                            _a = _d.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _a = undefined;
                            _d.label = 4;
                        case 4:
                            fileResult = _a;
                            if (!isImageEffectType(effect.type)) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.imageEffectHostAdapter.apply(context.workspaceRootUri, context.run.id, context.workload.id, effect, imageEffectApproved(effect))];
                        case 5:
                            _b = _d.sent();
                            return [3 /*break*/, 7];
                        case 6:
                            _b = undefined;
                            _d.label = 7;
                        case 7:
                            imageResult = _b;
                            effectId = stableId('effect', context.run.id, context.workload.id, effect.type, effect.summary || '', effect.path || '', effect.command || '', effect.prompt || '');
                            kind = normalizeEffectKind(effect.type, effect.path, effect.command);
                            summary = effect.summary || "".concat(kind, " effect for ").concat(stateId, ".");
                            status_1 = fileResult ? fileEffectStatus(effect, fileResult) : (imageResult === null || imageResult === void 0 ? void 0 : imageResult.status) || normalizeEffectStatus(effect.status, normalizedStatus === 'failed');
                            context.run.effects.push({
                                id: effectId,
                                runId: context.run.id,
                                stateId: stateId,
                                kind: kind,
                                type: effect.type,
                                path: (imageResult === null || imageResult === void 0 ? void 0 : imageResult.uri) || (fileResult === null || fileResult === void 0 ? void 0 : fileResult.relativePath) || effect.path,
                                prompt: effect.prompt,
                                artifactPath: (imageResult === null || imageResult === void 0 ? void 0 : imageResult.artifactPath) || effect.artifactPath,
                                mimeType: (imageResult === null || imageResult === void 0 ? void 0 : imageResult.mimeType) || effect.mimeType,
                                provider: (imageResult === null || imageResult === void 0 ? void 0 : imageResult.provider) || effect.provider,
                                bytes: imageResult === null || imageResult === void 0 ? void 0 : imageResult.bytes,
                                command: effect.command,
                                cwd: effect.cwd,
                                env: stringifyEnv(effect.env),
                                allowedPaths: effect.allowedPaths,
                                deniedPaths: effect.deniedPaths,
                                timeoutMs: effect.timeoutMs,
                                exitCode: effect.exitCode,
                                stdout: (imageResult === null || imageResult === void 0 ? void 0 : imageResult.stdout) || effect.stdout,
                                stderr: (imageResult === null || imageResult === void 0 ? void 0 : imageResult.stderr) || (imageResult === null || imageResult === void 0 ? void 0 : imageResult.reason) || (!(fileResult === null || fileResult === void 0 ? void 0 : fileResult.applied) ? fileResult === null || fileResult === void 0 ? void 0 : fileResult.reason : undefined) || effect.stderr,
                                timedOut: effect.timedOut,
                                hashBefore: (fileResult === null || fileResult === void 0 ? void 0 : fileResult.hashBefore) || effect.hashBefore,
                                hashAfter: (fileResult === null || fileResult === void 0 ? void 0 : fileResult.hashAfter) || effect.hashAfter,
                                patch: (fileResult === null || fileResult === void 0 ? void 0 : fileResult.patch) || effect.patch,
                                approvalPolicy: (fileResult === null || fileResult === void 0 ? void 0 : fileResult.approvalPolicy) || (imageResult === null || imageResult === void 0 ? void 0 : imageResult.approvalPolicy) || effect.approvalPolicy,
                                status: status_1,
                                summary: summary
                            });
                            addUnique(context.workload.effectIds, effectId);
                            if (isFileEffectType(effect.type)) {
                                fileStatuses = fileEffectTransitionStatuses(effect, fileResult, status_1);
                                for (_c = 0, fileStatuses_1 = fileStatuses; _c < fileStatuses_1.length; _c++) {
                                    transitionStatus = fileStatuses_1[_c];
                                    registerFileEffectAudit(context.run, context.workload, {
                                        id: effectId,
                                        type: effect.type,
                                        path: (fileResult === null || fileResult === void 0 ? void 0 : fileResult.relativePath) || effect.path,
                                        status: transitionStatus,
                                        summary: summary,
                                        hashBefore: (fileResult === null || fileResult === void 0 ? void 0 : fileResult.hashBefore) || effect.hashBefore,
                                        hashAfter: (fileResult === null || fileResult === void 0 ? void 0 : fileResult.hashAfter) || effect.hashAfter,
                                        patch: (fileResult === null || fileResult === void 0 ? void 0 : fileResult.patch) || effect.patch,
                                        approvalPolicy: (fileResult === null || fileResult === void 0 ? void 0 : fileResult.approvalPolicy) || effect.approvalPolicy,
                                        reason: transitionStatus === status_1 ? fileResult === null || fileResult === void 0 ? void 0 : fileResult.reason : undefined
                                    });
                                }
                                if (fileStatuses.length === 0) {
                                    registerFileEffectAudit(context.run, context.workload, {
                                        id: effectId,
                                        type: effect.type,
                                        path: (fileResult === null || fileResult === void 0 ? void 0 : fileResult.relativePath) || effect.path,
                                        status: status_1,
                                        summary: summary,
                                        hashBefore: (fileResult === null || fileResult === void 0 ? void 0 : fileResult.hashBefore) || effect.hashBefore,
                                        hashAfter: (fileResult === null || fileResult === void 0 ? void 0 : fileResult.hashAfter) || effect.hashAfter,
                                        patch: (fileResult === null || fileResult === void 0 ? void 0 : fileResult.patch) || effect.patch,
                                        approvalPolicy: (fileResult === null || fileResult === void 0 ? void 0 : fileResult.approvalPolicy) || effect.approvalPolicy,
                                        reason: fileResult === null || fileResult === void 0 ? void 0 : fileResult.reason
                                    });
                                }
                                if (fileResult && !fileResult.applied) {
                                    blockingFailures.push("File effect \"".concat(summary, "\" was ").concat(status_1, ": ").concat(fileResult.reason || 'file adapter did not apply the effect', "."));
                                }
                            }
                            if (isCommandEffectType(effect.type, effect.command)) {
                                registerCommandEffectAudit(context.run, context.workload, context.run.effects[context.run.effects.length - 1]);
                            }
                            if (imageResult) {
                                registerImageEffectAudit(context.run, context.workload, context.run.effects[context.run.effects.length - 1], imageResult);
                                if (!imageResult.applied) {
                                    blockingFailures.push("Image effect \"".concat(summary, "\" was ").concat(imageResult.status, ": ").concat(imageResult.reason || 'image provider did not apply the effect', "."));
                                }
                            }
                            if (!isFileEffectType(effect.type) && !isCommandEffectType(effect.type, effect.command) && !imageResult) {
                                registerGenericEffectAudit(context.run, context.workload, context.run.effects[context.run.effects.length - 1]);
                            }
                            context.run.signals.push({
                                key: "".concat(stateId, ".effect"),
                                value: effect.type,
                                stateId: stateId,
                                runId: context.run.id,
                                createdAt: now
                            });
                            _d.label = 8;
                        case 8:
                            _i++;
                            return [3 /*break*/, 1];
                        case 9: return [2 /*return*/, blockingFailures];
                    }
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.applyGeneratedFileEffect = function (context, effect) {
            return __awaiter(this, void 0, void 0, function () {
                var prepared, error_5, message, failedType;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 4, , 5]);
                            if (!(normalizeWorkloadStatusRaw(effect.status) === 'rejected')) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.fileEffectHostAdapter.prepare(context.workspaceRootUri, {
                                    type: effect.type,
                                    path: effect.path || '',
                                    content: effect.content,
                                    hashBefore: effect.hashBefore,
                                    approvalPolicy: effect.approvalPolicy,
                                    allowedPaths: effect.allowedPaths,
                                    deniedPaths: effect.deniedPaths
                                })];
                        case 1:
                            prepared = _a.sent();
                            return [2 /*return*/, __assign(__assign({}, prepared), { reason: 'file effect rejected before apply', applied: false })];
                        case 2: return [4 /*yield*/, this.fileEffectHostAdapter.apply(context.workspaceRootUri, {
                                type: effect.type,
                                path: effect.path || '',
                                content: effect.content,
                                hashBefore: effect.hashBefore,
                                approvalPolicy: effect.approvalPolicy,
                                allowedPaths: effect.allowedPaths,
                                deniedPaths: effect.deniedPaths
                            }, fileEffectApproved(effect))];
                        case 3: return [2 /*return*/, _a.sent()];
                        case 4:
                            error_5 = _a.sent();
                            message = errorToMessage(error_5);
                            failedType = effect.type === 'file.created' || effect.type === 'file.edited' || effect.type === 'file.deleted' ? effect.type : 'file.edited';
                            return [2 /*return*/, {
                                    type: failedType,
                                    workspaceRoot: '',
                                    relativePath: effect.path || '',
                                    absolutePath: effect.path || '',
                                    existedBefore: false,
                                    contentBefore: '',
                                    contentAfter: '',
                                    hashBefore: effect.hashBefore || '',
                                    hashAfter: effect.hashAfter || '',
                                    patch: effect.patch || '',
                                    approvalPolicy: effect.approvalPolicy || 'blocked',
                                    requiresApproval: false,
                                    blocked: true,
                                    riskReasons: [message],
                                    reason: message,
                                    applied: false
                                }];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.registerGeneratedMemoryCandidates = function (context, candidates) {
            if (!candidates.length) {
                return;
            }
            context.run.memoryCandidates = context.run.memoryCandidates || [];
            var existing = new Set(context.run.memoryCandidates.map(function (candidate) { return candidate.id; }));
            for (var _i = 0, candidates_1 = candidates; _i < candidates_1.length; _i++) {
                var candidate = candidates_1[_i];
                var stateId = candidate.stateId || context.workload.stateId;
                var runId = context.run.id;
                var baseId = candidate.id || stableId('memory-candidate', runId, stateId, candidate.content);
                var prepared = __assign(__assign({}, candidate), { id: baseId, runId: runId, stateId: stateId, status: 'candidate' });
                if (!existing.has(prepared.id)) {
                    context.run.memoryCandidates.push(prepared);
                    existing.add(prepared.id);
                }
            }
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.resolveLlmProvider = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var resolver;
                return __generator(this, function (_a) {
                    resolver = this.agentProviderResolver || new flow_agent_provider_registry_1.FlowAgentProviderRegistry(this.languageModelRegistry, this.languageModelService, this.codexProviderService);
                    return [2 /*return*/, resolver.resolveProvider(context)];
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.invokeLlmProvider = function (context, providerPayload, provider, workloadDir) {
            return __awaiter(this, void 0, void 0, function () {
                var virtualReasoning;
                var _this = this;
                var _a;
                return __generator(this, function (_b) {
                    virtualReasoning = (_a = context.state.modelExecution) === null || _a === void 0 ? void 0 : _a.virtualReasoning;
                    if (!('mock' in provider) && (virtualReasoning === null || virtualReasoning === void 0 ? void 0 : virtualReasoning.enabled) && virtualReasoning.mode && virtualReasoning.mode !== 'off') {
                        return [2 /*return*/, runVirtualReasoningHarness({
                                mode: virtualReasoning.mode,
                                basePayload: providerPayload,
                                invoke: function (payload) { return _this.invokeLlmProviderDirect(context, payload, provider, workloadDir); },
                                onProgress: function (message) { return pushEvent(context.run, {
                                    type: 'virtual_reasoning.progress',
                                    stateId: context.workload.stateId,
                                    workloadId: context.workload.id,
                                    message: message
                                }); }
                            })];
                    }
                    return [2 /*return*/, this.invokeLlmProviderDirect(context, providerPayload, provider, workloadDir)];
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.invokeLlmProviderDirect = function (context, providerPayload, provider, workloadDir) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if ('mock' in provider) {
                        return [2 /*return*/, invokeE2eMockProvider(context, providerPayload)];
                    }
                    if ('command' in provider) {
                        return [2 /*return*/, invokeCommandProvider(provider.command, JSON.stringify(providerPayload, undefined, 2), workloadDir, parseProviderTimeoutMs())];
                    }
                    if ('codexProvider' in provider) {
                        return [2 /*return*/, invokeCodexProviderProvider(provider.codexProvider, context, providerPayload, workloadDir)];
                    }
                    return [2 /*return*/, invokeChatProvider(this.languageModelService, provider.model, context, provider.agentId, providerPayload)];
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.executeContextWorkload = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.completeWorkloadWithArtifacts(context, [], {
                            effectSummary: "Context workload \"".concat(context.state.id || context.workload.stateId, "\" cannot execute without an external context provider request."),
                            completionStatus: 'failed'
                        })];
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.executeCommandWorkload = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var command, result, effectId, effect;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            command = toTrimmedString(context.state.command);
                            if (!command) {
                                return [2 /*return*/, this.completeWorkloadWithArtifacts(context, [], {
                                        effectSummary: "Command workload \"".concat(context.state.id || context.workload.stateId, "\" has no command configured."),
                                        completionStatus: 'failed'
                                    })];
                            }
                            return [4 /*yield*/, this.commandEffectHostAdapter.apply(context.workspaceRootUri, {
                                    command: command,
                                    cwd: toTrimmedString(context.state.cwd),
                                    env: parseRecordEnv(context.state.env),
                                    allowedEnv: parseStringArray(context.state.allowedEnv),
                                    allowedCommands: parseStringArray(context.state.allowedCommands),
                                    timeoutMs: parseOptionalNumber(context.state.timeoutMs),
                                    approvalPolicy: toTrimmedString(context.state.approvalPolicy)
                                })];
                        case 1:
                            result = _a.sent();
                            effectId = stableId('effect', context.run.id, context.workload.id, 'command', command);
                            effect = {
                                id: effectId,
                                runId: context.run.id,
                                stateId: context.workload.stateId,
                                kind: 'command',
                                type: 'command.executed',
                                command: command,
                                cwd: result.relativeCwd,
                                env: result.env,
                                timeoutMs: result.timeoutMs,
                                exitCode: result.exitCode,
                                stdout: (0, common_2.truncateFlowText)(result.stdout || '', common_2.FlowSizeLimits.commandOutputBytes, 'command stdout'),
                                stderr: (0, common_2.truncateFlowText)(result.stderr || '', common_2.FlowSizeLimits.commandOutputBytes, 'command stderr'),
                                timedOut: result.timedOut,
                                approvalPolicy: result.approvalPolicy,
                                status: result.status,
                                summary: commandEffectSummary(context.workload.stateId, result.status, command)
                            };
                            context.run.effects.push(effect);
                            addUnique(context.workload.effectIds, effectId);
                            registerCommandEffectAudit(context.run, context.workload, effect);
                            return [2 /*return*/, this.completeWorkloadWithArtifacts(context, [], {
                                    effectSummary: effect.summary,
                                    completionStatus: result.status === 'failed' || result.status === 'blocked' ? 'failed' : 'completed'
                                })];
                    }
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.executeMemoryWriteWorkload = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var approvedCandidates, _i, approvedCandidates_1, candidate, failed, failedWrites, _a, approvedCandidates_2, candidate, approved, written;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            approvedCandidates = selectApprovedMemoryCandidates(context);
                            if (approvedCandidates.length === 0) {
                                return [2 /*return*/, this.completeWorkloadWithArtifacts(context, [], {
                                        effectSummary: "No approved memory candidates found for ".concat(context.state.id || context.workload.stateId, ".")
                                    })];
                            }
                            if (!this.memoryAdapter) {
                                for (_i = 0, approvedCandidates_1 = approvedCandidates; _i < approvedCandidates_1.length; _i++) {
                                    candidate = approvedCandidates_1[_i];
                                    failed = buildMemoryWrite(context, candidate, 'failed', 'Memory adapter is not available.');
                                    context.run.memoryWrites = upsertMemoryWrite(context.run.memoryWrites, failed);
                                    pushMemoryWriteEvent(context.run, candidate, failed, 'failed', context.workload.id);
                                }
                                return [2 /*return*/, this.completeWorkloadWithArtifacts(context, [], {
                                        effectSummary: "Memory adapter is not available for ".concat(context.state.id || context.workload.stateId, "."),
                                        completionStatus: 'failed'
                                    })];
                            }
                            failedWrites = 0;
                            _a = 0, approvedCandidates_2 = approvedCandidates;
                            _b.label = 1;
                        case 1:
                            if (!(_a < approvedCandidates_2.length)) return [3 /*break*/, 4];
                            candidate = approvedCandidates_2[_a];
                            approved = buildMemoryWrite(context, candidate, 'approved');
                            context.run.memoryWrites = upsertMemoryWrite(context.run.memoryWrites, approved);
                            pushMemoryWriteEvent(context.run, candidate, approved, 'approved', context.workload.id);
                            return [4 /*yield*/, this.memoryAdapter.writeApprovedMemory(approved, context.workspaceRootUri)];
                        case 2:
                            written = _b.sent();
                            context.run.memoryWrites = upsertMemoryWrite(context.run.memoryWrites, written);
                            if (written.status === 'written') {
                                candidate.status = 'written';
                            }
                            else {
                                failedWrites += 1;
                                candidate.status = 'approved';
                            }
                            pushMemoryWriteEvent(context.run, candidate, written, written.status, context.workload.id);
                            _b.label = 3;
                        case 3:
                            _a++;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/, this.completeWorkloadWithArtifacts(context, [], {
                                effectSummary: "Memory write workload persisted ".concat(approvedCandidates.length - failedWrites, " of ").concat(approvedCandidates.length, " approved candidates."),
                                completionStatus: failedWrites > 0 ? 'failed' : 'completed'
                            })];
                    }
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.executeReportWorkload = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var workloadDir, expectedOutputs, report, markdown, generatedArtifacts, artifactUris, generation;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            workloadDir = workloadOutputDir(context.workspaceRootUri, context.run.id, context.workload.id);
                            expectedOutputs = context.state.outputs && context.state.outputs.length > 0 ? context.state.outputs : ['final/report.md'];
                            report = buildStructuredRunReport(context);
                            markdown = renderStructuredRunReportMarkdown(report);
                            generatedArtifacts = expectedOutputs.map(function (output) { return ({
                                path: output,
                                content: normalizeArtifactPath(output).endsWith('.json')
                                    ? JSON.stringify(report, undefined, 2)
                                    : markdown
                            }); });
                            return [4 /*yield*/, writeAgentOutputs(workloadDir, expectedOutputs, generatedArtifacts)];
                        case 1:
                            artifactUris = _b.sent();
                            generation = {
                                artifacts: generatedArtifacts,
                                summary: "Structured run report generated for ".concat(context.run.id, "."),
                                report: markdown,
                                status: 'completed',
                                effects: [],
                                signals: (_a = {},
                                    _a["".concat(context.workload.stateId, ".status")] = 'completed',
                                    _a["".concat(context.workload.stateId, ".artifact_count")] = context.run.artifacts.length,
                                    _a["".concat(context.workload.stateId, ".effect_count")] = context.run.effects.length,
                                    _a["".concat(context.workload.stateId, ".issue_count")] = collectRunIssues(context.run).length,
                                    _a["".concat(context.workload.stateId, ".pending_count")] = Array.isArray(report.pending) ? report.pending.length : 0,
                                    _a),
                                issues: [],
                                memoryCandidates: []
                            };
                            context.workload.outputEnvelope = buildWorkloadOutputEnvelope(context, generation);
                            this.registerGeneratedSignals(context, generation.signals);
                            return [2 /*return*/, this.completeWorkloadWithArtifacts(context, artifactUris, {
                                    effectSummary: "Structured final report for run ".concat(context.run.id, ".")
                                })];
                    }
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.executeDefaultWorkload = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.completeWorkloadWithArtifacts(context, [], {
                            effectSummary: "Unsupported Flow workload type \"".concat(context.state.type, "\" for state \"").concat(context.state.id || context.workload.stateId, "\"."),
                            completionStatus: 'failed'
                        })];
                });
            });
        };
        ProviderBackedFlowWorkloadExecutor_1.prototype.completeWorkloadWithArtifacts = function (context, artifactUris, options) {
            var run = context.run, workload = context.workload;
            var now = timestamp();
            var effectId = (0, common_1.generateUuid)();
            var completedArtifactUri = artifactUris[0] || "flow://".concat(run.id, "/").concat(workload.stateId, "/report.md");
            var outputStatus = normalizeResultStatus(options.completionStatus);
            var workloadStatus = outputStatus === 'failed' ? 'failed' : 'done';
            workload.status = workloadStatus;
            workload.updatedAt = now;
            workload.reportUri = completedArtifactUri;
            run.stateStatuses[workload.stateId] = workloadStatus;
            workload.outputArtifacts = uniqueStrings(__spreadArray(__spreadArray([], workload.outputArtifacts, true), artifactUris, true));
            workload.effectIds = __spreadArray(__spreadArray([], workload.effectIds, true), [effectId], false);
            for (var _i = 0, artifactUris_1 = artifactUris; _i < artifactUris_1.length; _i++) {
                var artifactUri = artifactUris_1[_i];
                upsertArtifact(run.artifacts, {
                    id: stableId('artifact', run.id, workload.id, artifactUri),
                    runId: run.id,
                    stateId: workload.stateId,
                    uri: artifactUri,
                    kind: artifactKindFromPath(artifactUri),
                    summary: artifactUri,
                    createdAt: now
                });
            }
            run.effects.push({
                id: effectId,
                runId: run.id,
                stateId: workload.stateId,
                kind: 'notification',
                status: 'proposed',
                summary: options.effectSummary
            });
            run.signals.push({
                key: "".concat(workload.stateId, ".status"),
                value: outputStatus,
                stateId: workload.stateId,
                runId: run.id,
                createdAt: now
            });
            for (var _a = 0, artifactUris_2 = artifactUris; _a < artifactUris_2.length; _a++) {
                var artifactUri = artifactUris_2[_a];
                pushEvent(run, {
                    type: 'artifact.created',
                    stateId: workload.stateId,
                    workloadId: workload.id,
                    message: "Artifact created for \"".concat(workload.stateId, "\".")
                });
                pushEvent(run, {
                    type: 'signal.emitted',
                    stateId: workload.stateId,
                    workloadId: workload.id,
                    message: "Signal emitted for \"".concat(artifactUri, "\".")
                });
            }
            pushEvent(run, { type: 'effect.proposed', stateId: workload.stateId, workloadId: workload.id, message: "Effect proposed for \"".concat(workload.stateId, "\".") });
            if (workloadStatus === 'failed') {
                pushEvent(run, {
                    type: 'workload.failed',
                    stateId: workload.stateId,
                    workloadId: workload.id,
                    message: "Workload \"".concat(workload.id, "\" failed."),
                    payload: { status: outputStatus, summary: options.effectSummary }
                });
            }
            else {
                pushEvent(run, { type: 'workload.completed', stateId: workload.stateId, workloadId: workload.id, message: "Workload \"".concat(workload.id, "\" completed.") });
                pushEvent(run, { type: 'state.completed', stateId: workload.stateId, workloadId: workload.id, message: "State \"".concat(workload.stateId, "\" completed.") });
            }
            return {
                artifactUri: completedArtifactUri,
                effectId: effectId
            };
        };
        return ProviderBackedFlowWorkloadExecutor_1;
    }());
    __setFunctionName(_classThis, "ProviderBackedFlowWorkloadExecutor");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ProviderBackedFlowWorkloadExecutor = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ProviderBackedFlowWorkloadExecutor = _classThis;
}();
exports.ProviderBackedFlowWorkloadExecutor = ProviderBackedFlowWorkloadExecutor;
/**
 * @deprecated Use ProviderBackedFlowWorkloadExecutor. This alias is kept for
 * downstream extensions compiled against the historical name.
 */
var SimulatedFlowWorkloadExecutor = /** @class */ (function (_super) {
    __extends(SimulatedFlowWorkloadExecutor, _super);
    function SimulatedFlowWorkloadExecutor() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return SimulatedFlowWorkloadExecutor;
}(ProviderBackedFlowWorkloadExecutor));
exports.SimulatedFlowWorkloadExecutor = SimulatedFlowWorkloadExecutor;
function resolveAgentPath(context) {
    var _a;
    var stateAgent = context.state.agent || context.workload.agent;
    if (!stateAgent) {
        return 'agents/default.md';
    }
    return ((_a = context.workflow.agents) === null || _a === void 0 ? void 0 : _a[stateAgent]) || stateAgent;
}
function renderContextPack(contextPack, workflow, workload) {
    var files = (contextPack === null || contextPack === void 0 ? void 0 : contextPack.files.map(function (file) { return "- ".concat(file.uri, ": ").concat(file.reason); }).join('\n')) || '- none';
    return (0, common_2.truncateFlowText)(__spreadArray(__spreadArray(__spreadArray([
        "# Context Pack - ".concat(workload.stateId),
        '',
        (contextPack === null || contextPack === void 0 ? void 0 : contextPack.summary) || "Workflow \"".concat(workflow.name, "\" context is unavailable."),
        '',
        '## Files',
        files,
        '',
        '## Signals'
    ], ((contextPack === null || contextPack === void 0 ? void 0 : contextPack.signals) || []).map(function (signal) { return "- ".concat(signal.key, ": ").concat(String(signal.value)); }), true), [
        ''
    ], false), ((contextPack === null || contextPack === void 0 ? void 0 : contextPack.sections) || []).flatMap(function (section) { return __spreadArray([
        "## ".concat(section.title)
    ], section.items.map(function (item) { return "- ".concat(item.title, ": ").concat(item.content); }), true); }), true).join('\n'), common_2.FlowSizeLimits.contextPackBytes, 'context pack');
}
function resolveContextPackForWorkload(run, workflow, workload) {
    var _a;
    var workloadPack = (_a = run.workloadContextPacks) === null || _a === void 0 ? void 0 : _a[workload.id];
    if (workloadPack) {
        return workloadPack;
    }
    return scopeRunContextPackForWorkload(run.contextPack, workflow, workload);
}
function scopeRunContextPackForWorkload(contextPack, workflow, workload) {
    if (!contextPack) {
        return undefined;
    }
    var relevantPaths = collectWorkloadContextPaths(workflow, workload);
    var relevantAgents = collectWorkloadAgentIds(workflow, workload);
    var files = contextPack.files.filter(function (file) { return isRelevantContextPath(file.uri, relevantPaths); });
    return __assign(__assign({}, contextPack), { summary: "Scoped context for workload \"".concat(workload.id, "\" in state \"").concat(workload.stateId, "\"."), workflow: {
            id: workflow.id,
            name: workflow.name,
            stateCount: 1,
            transitionCount: 0,
            agentIds: relevantAgents
        }, files: files, signals: contextPack.signals.filter(function (signal) { return isRelevantContextSignal(signal.key, workload, relevantAgents); }), sections: (contextPack.sections || [])
            .map(function (section) { return (__assign(__assign({}, section), { items: section.items.filter(function (item) { return isRelevantContextItem(item, relevantPaths, relevantAgents); }) })); })
            .filter(function (section) { return section.items.length > 0; }) });
}
function collectWorkloadContextPaths(workflow, workload) {
    var _a, _b, _c, _d;
    var paths = new Set();
    var state = workflow.states[workload.stateId]
        || ((_b = (_a = Object.values(workflow.states).find(function (candidate) { var _a; return (_a = candidate.branches) === null || _a === void 0 ? void 0 : _a[workload.stateId]; })) === null || _a === void 0 ? void 0 : _a.branches) === null || _b === void 0 ? void 0 : _b[workload.stateId]);
    for (var _i = 0, _e = __spreadArray(__spreadArray(__spreadArray(__spreadArray([], (((_c = state === null || state === void 0 ? void 0 : state.input) === null || _c === void 0 ? void 0 : _c.include) || []), true), ((state === null || state === void 0 ? void 0 : state.outputs) || []), true), workload.inputArtifacts, true), workload.outputArtifacts, true); _i < _e.length; _i++) {
        var artifact = _e[_i];
        addNormalizedContextPath(paths, artifact);
    }
    for (var _f = 0, _g = collectWorkloadAgentIds(workflow, workload); _f < _g.length; _f++) {
        var agentId = _g[_f];
        addNormalizedContextPath(paths, (_d = workflow.agents) === null || _d === void 0 ? void 0 : _d[agentId]);
    }
    return paths;
}
function collectWorkloadAgentIds(workflow, workload) {
    var _a, _b;
    var ids = new Set();
    var state = workflow.states[workload.stateId]
        || ((_b = (_a = Object.values(workflow.states).find(function (candidate) { var _a; return (_a = candidate.branches) === null || _a === void 0 ? void 0 : _a[workload.stateId]; })) === null || _a === void 0 ? void 0 : _a.branches) === null || _b === void 0 ? void 0 : _b[workload.stateId]);
    if (workload.agent) {
        ids.add(workload.agent);
    }
    if (state === null || state === void 0 ? void 0 : state.agent) {
        ids.add(state.agent);
    }
    return __spreadArray([], ids, true).filter(function (id) { return Boolean(id); }).sort();
}
function addNormalizedContextPath(paths, value) {
    var normalized = normalizeContextPath(value);
    if (normalized) {
        paths.add(normalized);
    }
}
function isRelevantContextPath(value, relevantPaths) {
    var normalized = normalizeContextPath(value);
    if (!normalized) {
        return false;
    }
    for (var _i = 0, relevantPaths_1 = relevantPaths; _i < relevantPaths_1.length; _i++) {
        var candidate = relevantPaths_1[_i];
        if (normalized === candidate || normalized.endsWith("/".concat(candidate)) || candidate.endsWith("/".concat(normalized))) {
            return true;
        }
    }
    return false;
}
function normalizeContextPath(value) {
    return (value || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/').replace(/^\/+/, '').toLowerCase();
}
function isRelevantContextSignal(key, workload, relevantAgents) {
    var normalized = key.toLowerCase();
    return normalized.includes(workload.id.toLowerCase())
        || normalized.includes(workload.stateId.toLowerCase())
        || relevantAgents.some(function (agent) { return normalized.includes(agent.toLowerCase()); })
        || normalized.startsWith('memory.')
        || normalized.startsWith('flow_studio.');
}
function isRelevantContextItem(item, relevantPaths, relevantAgents) {
    if (isRelevantContextPath(item.uri, relevantPaths) || isRelevantContextPath(item.title, relevantPaths)) {
        return true;
    }
    var title = item.title.toLowerCase();
    return relevantAgents.some(function (agent) { return title.includes(agent.toLowerCase()); });
}
function renderWorkOrder(workflow, workload, state) {
    var _a;
    var systemPrompt = toOptionalTrimmedString(state.systemPrompt);
    var taskPrompt = toOptionalTrimmedString(state.taskPrompt);
    var deliverables = normalizedDeliverables(state);
    return __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([
        "# Work Order - ".concat(workload.stateId),
        '',
        "Workflow: ".concat(workflow.name || workflow.id),
        "Workload: ".concat(workload.id),
        "Agent: ".concat(workload.agent || ((_a = workflow.agents) === null || _a === void 0 ? void 0 : _a[workload.agent || '']) || 'system')
    ], (systemPrompt ? ['', '## System Prompt', systemPrompt] : []), true), (taskPrompt ? ['', '## Task Prompt', taskPrompt] : []), true), (deliverables.length ? __spreadArray(['', '## Deliverables'], deliverables.map(renderDeliverable), true) : []), true), [
        '',
        '## Inputs'
    ], false), (workload.inputArtifacts.length ? workload.inputArtifacts.map(function (input) { return "- ".concat(input); }) : ['- none']), true).join('\n');
}
function expectedOutputPaths(state) {
    var explicitOutputs = state.outputs && state.outputs.length > 0 ? state.outputs : [];
    var deliverableOutputs = normalizedDeliverables(state).map(function (deliverable) { return deliverable.path; });
    var outputs = __spreadArray([], explicitOutputs, true);
    for (var _i = 0, deliverableOutputs_1 = deliverableOutputs; _i < deliverableOutputs_1.length; _i++) {
        var deliverablePath = deliverableOutputs_1[_i];
        if (!outputs.includes(deliverablePath)) {
            outputs.push(deliverablePath);
        }
    }
    return outputs.length > 0 ? outputs : ['report.md'];
}
function normalizedDeliverables(state) {
    return (state.deliverables || [])
        .map(function (deliverable) { return ({
        path: normalizeArtifactPath(deliverable.path),
        description: toOptionalTrimmedString(deliverable.description),
        required: deliverable.required !== false,
        kind: toOptionalTrimmedString(deliverable.kind)
    }); })
        .filter(function (deliverable) { return deliverable.path; });
}
function renderDeliverable(deliverable) {
    var details = [
        deliverable.required ? 'required' : 'optional',
        deliverable.kind ? "kind: ".concat(deliverable.kind) : undefined,
        deliverable.description
    ].filter(Boolean).join('; ');
    return "- ".concat(deliverable.path).concat(details ? " (".concat(details, ")") : '');
}
function workloadOutputDir(workspaceRootUri, runId, workloadId) {
    var root = path.resolve(workspaceRootUri ? file_uri_1.FileUri.fsPath(workspaceRootUri) : os.homedir());
    return path.join((0, flow_path_policy_1.resolveFlowRunDirectory)(root, runId), 'workloads', (0, flow_path_policy_1.sanitizeFlowPathSegment)(workloadId, 'workload'));
}
function runVirtualReasoningHarness(request) {
    return __awaiter(this, void 0, void 0, function () {
        var mode;
        return __generator(this, function (_a) {
            mode = request.mode === 'auto' ? 'balanced' : request.mode;
            if (mode === 'off') {
                return [2 /*return*/, request.invoke(request.basePayload)];
            }
            if (mode === 'fast') {
                return [2 /*return*/, runFastVirtualReasoning(request)];
            }
            return [2 /*return*/, runBalancedVirtualReasoning(request)];
        });
    });
}
function runFastVirtualReasoning(request) {
    return __awaiter(this, void 0, void 0, function () {
        var draft, critique, _a;
        var _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    draft = '';
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 5, , 6]);
                    (_b = request.onProgress) === null || _b === void 0 ? void 0 : _b.call(request, 'Drafting response...');
                    return [4 /*yield*/, request.invoke(reasoningStagePayload(request.basePayload, 'draft', [
                            'Create a complete workload-output envelope draft.',
                            'Do not mention internal reasoning or the harness.'
                        ]))];
                case 2:
                    draft = _e.sent();
                    (_c = request.onProgress) === null || _c === void 0 ? void 0 : _c.call(request, 'Reviewing response...');
                    return [4 /*yield*/, request.invoke(reasoningStagePayload(request.basePayload, 'critique', [
                            'Critique the draft for technical errors, omissions, unsupported assumptions, unclear language, and risk.',
                            'Return concise JSON with approved, confidence, issues, and summary.'
                        ], { draft: draft }))];
                case 3:
                    critique = _e.sent();
                    (_d = request.onProgress) === null || _d === void 0 ? void 0 : _d.call(request, 'Revising response...');
                    return [4 /*yield*/, request.invoke(reasoningStagePayload(request.basePayload, 'revise', [
                            'Return the final workload-output envelope only.',
                            'Use the draft and critique to improve the answer.',
                            'Do not expose internal reasoning or mention this harness.'
                        ], { draft: draft, critique: critique }))];
                case 4: return [2 /*return*/, _e.sent()];
                case 5:
                    _a = _e.sent();
                    return [2 /*return*/, draft || request.invoke(request.basePayload)];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function runBalancedVirtualReasoning(request) {
    return __awaiter(this, void 0, void 0, function () {
        var draft, revised, classification, plan, critique, verification, _a;
        var _b, _c, _d, _e, _f, _g, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    draft = '';
                    revised = '';
                    _j.label = 1;
                case 1:
                    _j.trys.push([1, 8, , 9]);
                    (_b = request.onProgress) === null || _b === void 0 ? void 0 : _b.call(request, 'Analyzing request...');
                    return [4 /*yield*/, request.invoke(reasoningStagePayload(request.basePayload, 'classify', [
                            'Classify the task. Return concise JSON only with taskType, complexity, needsReasoning, needsTools, recommendedMode, and reason.',
                            'Do not solve the task.'
                        ]))];
                case 2:
                    classification = _j.sent();
                    (_c = request.onProgress) === null || _c === void 0 ? void 0 : _c.call(request, 'Planning response...');
                    return [4 /*yield*/, request.invoke(reasoningStagePayload(request.basePayload, 'plan', [
                            'Create a short plan for producing the workload-output envelope.',
                            'Return concise JSON only with goal, constraints, steps, and risks.',
                            'Do not answer the user yet.'
                        ], { classification: classification }))];
                case 3:
                    plan = _j.sent();
                    (_d = request.onProgress) === null || _d === void 0 ? void 0 : _d.call(request, 'Drafting response...');
                    return [4 /*yield*/, request.invoke(reasoningStagePayload(request.basePayload, 'draft', [
                            'Create a complete workload-output envelope draft using the plan.',
                            'Do not mention internal reasoning or the harness.'
                        ], { classification: classification, plan: plan }))];
                case 4:
                    draft = _j.sent();
                    (_e = request.onProgress) === null || _e === void 0 ? void 0 : _e.call(request, 'Reviewing response...');
                    return [4 /*yield*/, request.invoke(reasoningStagePayload(request.basePayload, 'critique', [
                            'Critique the draft for technical errors, omissions, unsupported assumptions, unclear language, and practical risk.',
                            'Return concise JSON only with approved, confidence, issues, and summary.'
                        ], { classification: classification, plan: plan, draft: draft }))];
                case 5:
                    critique = _j.sent();
                    (_f = request.onProgress) === null || _f === void 0 ? void 0 : _f.call(request, 'Revising response...');
                    return [4 /*yield*/, request.invoke(reasoningStagePayload(request.basePayload, 'revise', [
                            'Return the final workload-output envelope only.',
                            'Use the plan, draft, and critique to improve the answer.',
                            'Do not expose internal reasoning or mention this harness.'
                        ], { classification: classification, plan: plan, draft: draft, critique: critique }))];
                case 6:
                    revised = _j.sent();
                    (_g = request.onProgress) === null || _g === void 0 ? void 0 : _g.call(request, 'Verifying response...');
                    return [4 /*yield*/, request.invoke(reasoningStagePayload(request.basePayload, 'verify', [
                            'Verify whether the revised workload-output envelope satisfies the original request and Flow output contract.',
                            'Return concise JSON only with approved, confidence, requiredFixes, and optionalImprovements.'
                        ], { classification: classification, plan: plan, critique: critique, revised: revised }))];
                case 7:
                    verification = _j.sent();
                    (_h = request.onProgress) === null || _h === void 0 ? void 0 : _h.call(request, 'Finalizing response...');
                    return [2 /*return*/, revised || draft || verification];
                case 8:
                    _a = _j.sent();
                    return [2 /*return*/, revised || draft || request.invoke(request.basePayload)];
                case 9: return [2 /*return*/];
            }
        });
    });
}
function reasoningStagePayload(basePayload, stage, instructions, inputs) {
    if (inputs === void 0) { inputs = {}; }
    return __assign(__assign({}, basePayload), { virtualReasoning: {
            stage: stage,
            internal: true,
            instructions: instructions,
            inputs: redactReasoningInputs(inputs)
        } });
}
function redactReasoningInputs(inputs) {
    return Object.fromEntries(Object.entries(inputs).map(function (_a) {
        var key = _a[0], value = _a[1];
        return [
            key,
            typeof value === 'string' ? (0, common_2.truncateFlowText)(value, common_2.FlowSizeLimits.resultJsonBytes, "virtual reasoning ".concat(key)) : value
        ];
    }));
}
function invokeCodexProviderProvider(codexProvider, context, payload, cwd) {
    return __awaiter(this, void 0, void 0, function () {
        var prompt, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prompt = [
                        'You are an execution agent for the Flow workflow engine.',
                        'Execute only the workload described by the JSON payload.',
                        'Do not run shell commands, edit files directly, apply patches, or control workflow orchestration.',
                        'Return exactly JSON in the workload-output envelope shape requested by the payload.',
                        '',
                        JSON.stringify(payload, undefined, 2)
                    ].join('\n');
                    return [4 /*yield*/, codexProvider.sendAndCollect({
                            prompt: prompt,
                            input: [{
                                    type: 'text',
                                    text: prompt,
                                    text_elements: []
                                }],
                            sessionId: "flow-workload-".concat(context.run.id),
                            options: {
                                cwd: cwd,
                                approvalPolicy: 'never',
                                sandboxMode: 'read-only'
                            }
                        })];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.text];
            }
        });
    });
}
function invokeChatProvider(languageModelService, model, context, agentId, payload) {
    return __awaiter(this, void 0, void 0, function () {
        var request, response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!languageModelService) {
                        throw new Error('Language model service is not available in the current host container.');
                    }
                    request = {
                        messages: [
                            {
                                actor: 'system',
                                type: 'text',
                                text: [
                                    'You are an execution agent for the Flow workflow engine.',
                                    'You only execute the workload, you do not control workflow orchestration.',
                                    'Use only the provided contract fields and do not emit commands about transitions, gates, joins, loops, or scheduling.',
                                    'Return JSON in this shape:',
                                    '{',
                                    '  "result": {',
                                    '    "status": "completed|failed|done|running|waiting|review|pending|ready",',
                                    '    "summary": "short summary",',
                                    '    "artifacts": [ { "path": "string", "content": "string" } ],',
                                    '    "signals": { "key": "value" },',
                                    '    "issues": [ { "severity": "non_blocking", "type": "workload_issue", "summary": "text" } ]',
                                    '  },',
                                    '  "report": "human-readable report text",',
                                    '  "effects": [ { "type": "file.created|file.edited|file.deleted|command|memory_write|notification|other", "path": "file/path", "hashBefore": "sha256:...", "hashAfter": "sha256:...", "patch": "unified diff", "summary": "...", "status": "proposed", "approvalPolicy": "human_gate_required" } ],',
                                    '  "signals": { "key": "value" },',
                                    '  "issues": [ { ... } ],',
                                    '  "artifacts": [ { "path": "file.md", "content": "..." } ],',
                                    '  "memoryCandidates": [ { "content": "text", "reason": "...", "kind": "fact", "source": "artifact", "scope": "ide|workspace|project|workflow|run|agent" } ]',
                                    '}',
                                    'Top-level "signals" and "issues" may mirror nested result fields. If you include top-level artifacts, every generated artifact must include both path and content.',
                                    'Allowed artifact paths must be relative and map to expected workload outputs.',
                                    'Do not invent files or perform workflow control operations.'
                                ].join(' ')
                            },
                            {
                                actor: 'user',
                                type: 'text',
                                text: JSON.stringify(payload, undefined, 2)
                            }
                        ],
                        sessionId: "flow-workload-".concat(context.run.id),
                        requestId: (0, common_1.generateUuid)(),
                        agentId: agentId
                    };
                    return [4 /*yield*/, languageModelService.sendRequest(model, request)];
                case 1:
                    response = _a.sent();
                    return [4 /*yield*/, (0, ai_core_1.getTextOfResponse)(response)];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function invokeCommandProvider(commandLine, payload, cwd, timeoutMs) {
    return __awaiter(this, void 0, void 0, function () {
        var args, executable, childArgs;
        return __generator(this, function (_a) {
            args = parseCommandLine(commandLine);
            if (args.length === 0) {
                throw new Error('LLM provider command is empty.');
            }
            executable = args[0];
            childArgs = args.slice(1);
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var child = (0, child_process_1.spawn)(executable, childArgs, { cwd: cwd, windowsHide: true });
                    var stdout = '';
                    var stderr = '';
                    var settled = false;
                    var timeout = setTimeout(function () {
                        if (settled) {
                            return;
                        }
                        settled = true;
                        child.kill();
                        reject(new Error("LLM command provider timed out after ".concat(timeoutMs, "ms.")));
                    }, timeoutMs);
                    child.stdout.on('data', function (chunk) {
                        stdout = (0, common_2.truncateFlowText)(stdout + chunk, common_2.FlowSizeLimits.commandOutputBytes, 'LLM command stdout');
                    });
                    child.stderr.on('data', function (chunk) {
                        stderr = (0, common_2.truncateFlowText)(stderr + chunk, common_2.FlowSizeLimits.commandOutputBytes, 'LLM command stderr');
                    });
                    child.on('error', function (error) {
                        if (settled) {
                            return;
                        }
                        settled = true;
                        clearTimeout(timeout);
                        reject(error instanceof Error ? error : new Error(String(error)));
                    });
                    child.on('close', function (code) {
                        if (settled) {
                            return;
                        }
                        settled = true;
                        clearTimeout(timeout);
                        if (code !== 0) {
                            reject(new Error("LLM command provider exited with code ".concat(code || 0, ": ").concat(stderr || stdout).trim()));
                            return;
                        }
                        resolve(stdout);
                    });
                    child.stdin.write(payload);
                    child.stdin.end();
                })];
        });
    });
}
function invokeE2eMockProvider(context, payload) {
    var _a, _b, _c, _d;
    var stateId = context.workload.stateId;
    var filesystemEditEnabled = Boolean((_b = (_a = context.workflow.requires) === null || _a === void 0 ? void 0 : _a.capabilities) === null || _b === void 0 ? void 0 : _b.includes('filesystem.edit'));
    var imageGenerationEnabled = Boolean((_d = (_c = context.workflow.requires) === null || _c === void 0 ? void 0 : _c.capabilities) === null || _d === void 0 ? void 0 : _d.includes('image.generate'));
    switch (stateId) {
        case 'architecture':
            return e2eWorkloadOutput('completed', 'Mock architecture ready.', [
                { path: 'architecture/plan.md', content: '# Architecture\n\nUse contract-first parallel delivery.' }
            ]);
        case 'contract_design':
            return e2eWorkloadOutput('completed', 'Mock contract package ready.', [
                { path: 'contracts/shared.md', content: '# Shared Contract\n\nApproved scope covers backend, frontend, and design assets.' },
                { path: 'contracts/contracts.json', content: JSON.stringify(e2eValidContractPackage()) },
                { path: 'contracts/work-orders/backend.md', content: '# Backend Work Order\n\nExpose GET /feature.' },
                { path: 'contracts/work-orders/frontend.md', content: '# Frontend Work Order\n\nRender the feature panel from GET /feature.' },
                { path: 'contracts/work-orders/designer.md', content: '# Designer Work Order\n\nPrepare public/assets/feature-icon.png.' },
                { path: 'contracts/work-orders/qa.md', content: '# QA Work Order\n\nValidate all branch outputs against the contract.' },
                { path: 'schemas/api.json', content: JSON.stringify({ type: 'object', required: ['method', 'path'] }) },
                { path: 'schemas/assets.json', content: JSON.stringify({ type: 'object', required: ['path', 'format'] }) }
            ], { 'contract.status': 'ready' });
        case 'backend_work':
            return e2eWorkloadOutput('completed', 'Mock backend branch delivered.', [
                { path: 'delivery/backend.md', content: '# Backend\n\nGET /feature returns the contracted FeatureRequest payload.' },
                { path: 'issues/backend.json', content: '[]' }
            ], {}, undefined, filesystemEditEnabled ? [{
                    type: 'file.created',
                    path: 'src/flow-e2e-effect.txt',
                    content: 'Flow E2E file effect applied.\n',
                    patch: '--- a/src/flow-e2e-effect.txt\n+++ b/src/flow-e2e-effect.txt\n@@\n+Flow E2E file effect applied.\n',
                    summary: 'Create an auditable E2E file effect.',
                    status: 'proposed',
                    approvalPolicy: 'human_gate_required',
                    allowedPaths: ['src/**']
                }] : undefined);
        case 'frontend_work':
            return e2eWorkloadOutput('completed', 'Mock frontend branch delivered.', [
                { path: 'delivery/frontend.md', content: '# Frontend\n\nFeature panel consumes GET /feature and renders contract fields.' },
                { path: 'issues/frontend.json', content: '[]' }
            ]);
        case 'designer_work':
            return e2eWorkloadOutput('completed', 'Mock design branch delivered.', [
                { path: 'delivery/design-assets.md', content: '# Design Assets\n\npublic/assets/feature-icon.png is ready for the feature header.' },
                { path: 'issues/designer.json', content: '[]' }
            ], {}, undefined, imageGenerationEnabled ? [{
                    type: 'image.generate',
                    prompt: 'Generate a compact feature icon for the Flow E2E design branch.',
                    artifactPath: 'images/feature-icon.png',
                    summary: 'Generate an auditable E2E image effect.',
                    status: 'proposed',
                    approvalPolicy: 'human_gate_required',
                    provider: 'mock'
                }] : undefined);
        case 'qa':
            if (!context.run.signals.some(function (signal) { return signal.key === 'qa.status' && signal.value === 'failed'; })) {
                return e2eWorkloadOutput('failed', 'Mock QA failed before repair.', [
                    { path: 'qa/report.md', content: '# QA\n\nStatus: failed\nMissing integration evidence before repair.' }
                ], { 'qa.status': 'failed' }, [{
                        severity: 'blocking',
                        type: 'contract_validation',
                        summary: 'Missing integration evidence before repair.',
                        suggestedFollowup: 'Run the bounded repair loop and revalidate.'
                    }]);
            }
            return e2eWorkloadOutput('completed', 'Mock QA passed after repair.', [
                { path: 'qa/report.md', content: '# QA\n\nStatus: passed\nAll contract checks pass after repair.' }
            ], { 'qa.status': 'passed' });
        case 'repair_loop':
            return e2eWorkloadOutput('completed', 'Mock repair applied.', [
                { path: 'delivery/repair-notes.md', content: '# Repair\n\nAdded integration evidence for QA revalidation.' }
            ]);
        default:
            return e2eWorkloadOutput('completed', "Mock workload ".concat(stateId, " completed."), e2eAllowedArtifacts(payload));
    }
}
function e2eAllowedArtifacts(payload) {
    var expectedOutput = payload.expectedOutput;
    var allowedPaths = Array.isArray(expectedOutput === null || expectedOutput === void 0 ? void 0 : expectedOutput.allowedPaths) ? expectedOutput.allowedPaths : ['report.md'];
    return allowedPaths.map(function (outputPath) { return ({
        path: String(outputPath),
        content: "# ".concat(String(outputPath), "\n\nMock artifact generated by the E2E LLM provider.")
    }); });
}
function e2eWorkloadOutput(status, summary, artifacts, signals, issues, effects) {
    if (signals === void 0) { signals = {}; }
    var normalizedIssues = issues || (status === 'failed' ? [{ severity: 'blocking', type: 'contract_validation', summary: summary }] : []);
    return JSON.stringify({
        result: {
            status: status,
            summary: summary,
            artifacts: artifacts,
            signals: signals,
            issues: normalizedIssues
        },
        report: summary,
        artifacts: artifacts,
        effects: effects || [],
        signals: signals,
        issues: normalizedIssues
    });
}
function e2eValidContractPackage() {
    return {
        packageId: 'contracts-e2e',
        schemaVersion: 'flow.contracts/v1',
        sharedMd: {
            path: 'contracts/shared.md',
            deliveryObjective: 'Deliver a feature through parallel branches.',
            approvedScope: ['backend endpoint', 'frontend screen', 'design asset'],
            outOfScope: ['billing migration'],
            decisions: ['Use Contracted Parallel Delivery.'],
            canonicalNames: ['FeatureRequest'],
            knownRisks: [{
                    id: 'risk-parallel-drift',
                    severity: 'medium',
                    description: 'Parallel branches can drift.',
                    impact: 'QA may fail the first pass.',
                    mitigation: 'Run repair once and revalidate.'
                }],
            changeRules: {
                approvalPolicy: 'human_gate_for_scope_or_contract_schema',
                requiresHumanGateForContractMutation: true,
                outOfScopeAction: 'second_run_required',
                maxRevisionAttempts: 1
            }
        },
        api: [{ id: 'feature_read', method: 'GET', path: '/feature', statusCodes: [200] }],
        assets: [{ id: 'feature_icon', path: 'public/assets/feature-icon.png', format: 'png', description: 'Feature icon.', usage: 'header' }],
        workOrders: [
            { id: 'backend', agentRole: 'backend', path: 'contracts/work-orders/backend.md', scope: ['Implement API'], instructions: 'Build the API contract.', requiredInputs: ['contracts/shared.md'], acceptanceCriteria: ['Endpoint matches contract.'] },
            { id: 'frontend', agentRole: 'frontend', path: 'contracts/work-orders/frontend.md', scope: ['Implement UI'], instructions: 'Build the screen.', requiredInputs: ['contracts/shared.md'], acceptanceCriteria: ['Screen calls API.'] },
            { id: 'designer', agentRole: 'designer', path: 'contracts/work-orders/designer.md', scope: ['Prepare assets'], instructions: 'Create required assets.', requiredInputs: ['contracts/shared.md'], acceptanceCriteria: ['Assets match contract.'] },
            { id: 'qa', agentRole: 'qa', path: 'contracts/work-orders/qa.md', scope: ['Validate delivery'], instructions: 'Validate all branches.', requiredInputs: ['contracts/contracts.json'], acceptanceCriteria: ['All contract checks pass.'] }
        ],
        schemas: {
            api: [{ path: 'schemas/api.json', category: 'api', version: '1.0.0' }],
            assets: [{ path: 'schemas/assets.json', category: 'asset', version: '1.0.0' }]
        },
        approvedScope: ['backend endpoint', 'frontend screen', 'design asset'],
        outOfScope: ['billing migration'],
        risks: [{
                id: 'risk-parallel-drift',
                severity: 'medium',
                description: 'Parallel branches can drift.',
                impact: 'QA may fail the first pass.',
                mitigation: 'Run repair once and revalidate.'
            }],
        changeRules: {
            approvalPolicy: 'human_gate_for_scope_or_contract_schema',
            requiresHumanGateForContractMutation: true,
            outOfScopeAction: 'second_run_required',
            maxRevisionAttempts: 1
        }
    };
}
function parseAgentGenerationResult(raw, expectedOutputs, context, options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    if (options === void 0) { options = {}; }
    var trimmed = (raw || '').trim();
    if (!trimmed) {
        if (options.allowFallback !== false) {
            return fallbackGeneration(expectedOutputs, context, undefined);
        }
        throw new Error("".concat(workloadOutputContractErrorPrefix, " empty result payload for \"").concat(context.state.id || context.workload.stateId, "\"."));
    }
    var payload = parseAgentPayload(trimmed);
    if (!payload) {
        if (options.allowFallback !== false) {
            return fallbackGeneration(expectedOutputs, context, trimmed);
        }
        throw new Error("".concat(workloadOutputContractErrorPrefix, " invalid JSON in result payload for \"").concat(context.state.id || context.workload.stateId, "\"."));
    }
    validateRawProviderOutputShape(payload, context);
    var primary = hasObjectKey(payload, 'result') && isRecord(payload.result) ? payload.result : payload;
    var alias = payload.result && isRecord(payload.result) ? payload.result : {};
    var normalizedStatus = normalizeResultStatus((_b = (_a = primary.status) !== null && _a !== void 0 ? _a : alias.status) !== null && _b !== void 0 ? _b : 'completed');
    var summary = toTrimmedString(primary.summary) || toTrimmedString(alias.summary) || "Agent workload \"".concat(context.state.id || context.workload.stateId, "\" completed.");
    var report = toTrimmedString(primary.report) || toTrimmedString(payload.report) || summary;
    var artifacts = parseArtifactOutput((_e = (_d = (_c = primary.artifacts) !== null && _c !== void 0 ? _c : alias.artifacts) !== null && _d !== void 0 ? _d : payload.artifacts) !== null && _e !== void 0 ? _e : []);
    var effects = parseEffectOutput((_h = (_g = (_f = primary.effects) !== null && _f !== void 0 ? _f : alias.effects) !== null && _g !== void 0 ? _g : payload.effects) !== null && _h !== void 0 ? _h : []);
    var signals = parseSignalOutput((_l = (_k = (_j = primary.signals) !== null && _j !== void 0 ? _j : alias.signals) !== null && _k !== void 0 ? _k : payload.signals) !== null && _l !== void 0 ? _l : []);
    var issues = parseIssueOutput((_p = (_o = (_m = primary.issues) !== null && _m !== void 0 ? _m : alias.issues) !== null && _o !== void 0 ? _o : payload.issues) !== null && _p !== void 0 ? _p : []);
    var memoryCandidates = parseMemoryCandidates((_r = (_q = primary.memoryCandidates) !== null && _q !== void 0 ? _q : payload.memoryCandidates) !== null && _r !== void 0 ? _r : []);
    if (artifacts.length > 0) {
        return limitAgentGenerationResult({
            artifacts: artifacts,
            summary: summary,
            report: report,
            status: normalizedStatus,
            effects: effects,
            signals: signals,
            issues: issues,
            memoryCandidates: memoryCandidates
        });
    }
    if (options.allowFallback !== false) {
        var fallbackArtifact = parseSingleContentArtifact(payload, expectedOutputs);
        return limitAgentGenerationResult({
            artifacts: [fallbackArtifact],
            summary: summary,
            report: report,
            status: normalizedStatus,
            effects: effects,
            signals: signals,
            issues: issues,
            memoryCandidates: memoryCandidates
        });
    }
    throw new Error("".concat(workloadOutputContractErrorPrefix, " ").concat(context.state.id || context.workload.stateId, ": result.artifacts must include at least one generated artifact with path and content."));
}
function fallbackGeneration(expectedOutputs, context, rawContent) {
    var fallbackOutputs = expectedOutputs.length > 0 ? expectedOutputs : ['report.md'];
    var fallbackPath = fallbackOutputs[0];
    var report = toTrimmedString(rawContent) || '';
    return limitAgentGenerationResult({
        artifacts: [{ path: fallbackPath, content: report || defaultOutputPlaceholder(fallbackPath) }],
        summary: "Agent workload \"".concat(context.state.id || context.workload.stateId, "\" completed."),
        report: report,
        status: 'completed',
        effects: [],
        signals: {},
        issues: [],
        memoryCandidates: []
    });
}
function limitAgentGenerationResult(generation) {
    return __assign(__assign({}, generation), { artifacts: generation.artifacts.map(function (artifact) { return (__assign(__assign({}, artifact), { content: (0, common_2.truncateFlowText)(artifact.content || '', common_2.FlowSizeLimits.artifactBytes, "artifact ".concat(artifact.path)) })); }), report: (0, common_2.truncateFlowText)(generation.report || '', common_2.FlowSizeLimits.reportBytes, 'report'), effects: generation.effects.map(function (effect) { return (__assign(__assign({}, effect), { stdout: effect.stdout ? (0, common_2.truncateFlowText)(effect.stdout, common_2.FlowSizeLimits.commandOutputBytes, 'command stdout') : effect.stdout, stderr: effect.stderr ? (0, common_2.truncateFlowText)(effect.stderr, common_2.FlowSizeLimits.commandOutputBytes, 'command stderr') : effect.stderr })); }), memoryCandidates: generation.memoryCandidates.map(function (candidate) { return (__assign(__assign({}, candidate), { content: (0, common_2.truncateFlowText)(candidate.content || '', common_2.FlowSizeLimits.artifactBytes, 'memory candidate') })); }) });
}
function normalizeContractPackageGeneration(context, generation, expectedOutputs, inputArtifacts) {
    if (!requiresContractPackage(context, expectedOutputs)) {
        return;
    }
    var packageArtifact = findGeneratedArtifact(generation, 'contracts/contracts.json');
    var contractPackage = packageArtifact ? parseJsonObject(packageArtifact.content) : undefined;
    if (!contractPackage) {
        throw new Error("".concat(workloadOutputContractErrorPrefix, " contract_designer did not produce valid JSON at contracts/contracts.json."));
    }
    if (!contractsSchemaValidator(contractPackage)) {
        var errors = (contractsSchemaValidator.errors || [])
            .map(function (error) { return "".concat(error.dataPath || '/', " ").concat(error.message || 'is invalid').trim(); })
            .join('; ');
        throw new Error("".concat(workloadOutputContractErrorPrefix, " contracts/contracts.json failed flow contract schema validation: ").concat(errors));
    }
    var workOrders = normalizeContractWorkOrders(contractPackage.workOrders);
    var missingWorkOrders = requiredWorkOrderRoles(context, expectedOutputs)
        .filter(function (role) { return !workOrders.some(function (workOrder) { return toTrimmedString(workOrder.agentRole) === role; }); });
    if (missingWorkOrders.length > 0) {
        throw new Error("".concat(workloadOutputContractErrorPrefix, " contracts/contracts.json is missing workOrders for: ").concat(missingWorkOrders.join(', '), "."));
    }
    upsertGeneratedArtifact(generation, 'contracts/contracts.json', JSON.stringify(contractPackage, undefined, 2));
    upsertGeneratedArtifact(generation, 'contracts/shared.md', renderSharedContractMarkdown(contractPackage, inputArtifacts));
    for (var _i = 0, workOrders_1 = workOrders; _i < workOrders_1.length; _i++) {
        var workOrder = workOrders_1[_i];
        var workOrderPath = toTrimmedString(workOrder.path);
        if (workOrderPath && shouldMaterializeContractArtifact(context, expectedOutputs, workOrderPath)) {
            upsertGeneratedArtifact(generation, workOrderPath, renderContractWorkOrderMarkdown(contractPackage, workOrder));
        }
    }
    for (var _a = 0, _b = normalizeSchemaRefs(contractPackage.schemas); _a < _b.length; _a++) {
        var schemaRef = _b[_a];
        var schemaPath = toTrimmedString(schemaRef.path);
        if (schemaPath && shouldMaterializeContractArtifact(context, expectedOutputs, schemaPath)) {
            upsertGeneratedArtifact(generation, schemaPath, renderContractSchemaJson(contractPackage, schemaRef));
        }
    }
    generation.signals = __assign(__assign({}, generation.signals), { 'contract.status': generation.signals['contract.status'] || 'ready' });
    if (!generation.report) {
        generation.report = "Contract package ".concat(toTrimmedString(contractPackage.packageId) || context.run.id, " generated and validated.");
    }
}
function requiresContractPackage(context, expectedOutputs) {
    return (context.state.agent || context.workload.agent) === 'contract_designer'
        || expectedOutputs.some(function (output) { return normalizeArtifactPath(output) === 'contracts/contracts.json'; });
}
function normalizeQaGeneration(context, generation, inputArtifacts) {
    return __awaiter(this, void 0, void 0, function () {
        var contractArtifact, contractPackage, errors, corpus;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!isQaWorkload(context)) {
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, resolveArtifactContent(context, inputArtifacts, 'contracts/contracts.json')];
                case 1:
                    contractArtifact = _a.sent();
                    if (!contractArtifact) {
                        applyQaFindings(context, generation, [{
                                severity: 'blocking',
                                type: 'contract_missing',
                                summary: 'QA could not find contracts/contracts.json in workload inputs or run artifacts.',
                                producer: 'flow-qa-validator',
                                impact: 'Contract adherence cannot be validated.',
                                suggestedFollowup: 'Include contracts/contracts.json in the QA workload input or keep the contract artifact in the run.'
                            }], []);
                        return [2 /*return*/];
                    }
                    contractPackage = parseJsonObject(contractArtifact.content);
                    if (!contractPackage || !contractsSchemaValidator(contractPackage)) {
                        errors = contractPackage
                            ? (contractsSchemaValidator.errors || []).map(function (error) { return "".concat(error.dataPath || '/', " ").concat(error.message || 'is invalid').trim(); }).join('; ')
                            : 'contracts/contracts.json is not valid JSON';
                        applyQaFindings(context, generation, [{
                                severity: 'blocking',
                                type: 'contract_schema',
                                summary: "QA contract package validation failed: ".concat(errors, "."),
                                producer: 'flow-qa-validator',
                                impact: 'Contract adherence cannot be trusted.',
                                suggestedFollowup: 'Repair the contract package before QA.'
                            }], []);
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, buildQaEvidenceCorpus(context, inputArtifacts)];
                case 2:
                    corpus = _a.sent();
                    applyQaFindings(context, generation, validateQaContractAdherence(context, contractPackage, corpus), corpus.evidenceLines);
                    return [2 /*return*/];
            }
        });
    });
}
function isQaWorkload(context) {
    var stateId = (context.state.id || context.workload.stateId || '').toLowerCase();
    var agent = (context.state.agent || context.workload.agent || '').toLowerCase();
    return stateId === 'qa' || stateId.includes('qa') || agent === 'qa' || agent.includes('qa');
}
function buildQaEvidenceCorpus(context, inputArtifacts) {
    return __awaiter(this, void 0, void 0, function () {
        var chunks, evidenceLines, _i, inputArtifacts_1, artifact, _a, _b, artifact, filePath, content, fileEffectPaths, riskyEffectSummaries, _c, _d, effect, isFileEffect, sharedIssues;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    chunks = [];
                    evidenceLines = [];
                    for (_i = 0, inputArtifacts_1 = inputArtifacts; _i < inputArtifacts_1.length; _i++) {
                        artifact = inputArtifacts_1[_i];
                        if (isContractReferenceArtifact(artifact.path)) {
                            evidenceLines.push("Contract reference: ".concat(artifact.path));
                            continue;
                        }
                        chunks.push("".concat(artifact.path, "\n").concat(artifact.content));
                        evidenceLines.push("Input artifact: ".concat(artifact.path));
                    }
                    _a = 0, _b = context.run.artifacts;
                    _e.label = 1;
                case 1:
                    if (!(_a < _b.length)) return [3 /*break*/, 4];
                    artifact = _b[_a];
                    if (isContractReferenceArtifact(artifact.summary || artifact.uri)) {
                        evidenceLines.push("Contract reference: ".concat(artifact.summary || artifact.uri));
                        return [3 /*break*/, 3];
                    }
                    filePath = artifactPathFromUri(artifact.uri);
                    if (!filePath) {
                        return [3 /*break*/, 3];
                    }
                    return [4 /*yield*/, readTextFile(filePath)];
                case 2:
                    content = _e.sent();
                    if (content === undefined) {
                        return [3 /*break*/, 3];
                    }
                    chunks.push("".concat(artifact.summary || artifact.uri, "\n").concat(content));
                    evidenceLines.push("Run artifact: ".concat(artifact.summary || artifact.uri));
                    _e.label = 3;
                case 3:
                    _a++;
                    return [3 /*break*/, 1];
                case 4:
                    fileEffectPaths = new Set();
                    riskyEffectSummaries = [];
                    for (_c = 0, _d = context.run.effects; _c < _d.length; _c++) {
                        effect = _d[_c];
                        isFileEffect = effect.kind === 'file' || effect.kind === 'file_write' || isFileEffectType(effect.type || '');
                        if (effect.status === 'applied') {
                            chunks.push([
                                effect.type,
                                effect.kind,
                                effect.path,
                                effect.artifactPath,
                                effect.command,
                                effect.summary,
                                effect.patch,
                                effect.stdout,
                                effect.stderr
                            ].filter(Boolean).join('\n'));
                            evidenceLines.push("Applied effect: ".concat(effect.path || effect.command || effect.summary));
                        }
                        if (effect.status === 'applied' && effect.path && isFileEffect) {
                            fileEffectPaths.add(normalizeArtifactPath(effect.path));
                        }
                        if (effect.status === 'blocked' || effect.status === 'failed' || effect.status === 'rejected') {
                            riskyEffectSummaries.push("".concat(effect.status, ": ").concat(effect.summary));
                        }
                    }
                    sharedIssues = collectSharedIssues(context);
                    chunks.push(sharedIssues.join('\n'));
                    return [2 /*return*/, {
                            text: chunks.join('\n').toLowerCase(),
                            fileEffectPaths: fileEffectPaths,
                            riskyEffectSummaries: riskyEffectSummaries,
                            sharedIssues: sharedIssues,
                            evidenceLines: evidenceLines
                        }];
            }
        });
    });
}
function isContractReferenceArtifact(value) {
    var normalized = normalizeArtifactPath(value).toLowerCase();
    return normalized.endsWith('contracts/contracts.json')
        || normalized.endsWith('contracts/shared.md')
        || normalized.includes('/contracts/work-orders/')
        || normalized.startsWith('contracts/work-orders/')
        || normalized.endsWith('schemas/api.json')
        || normalized.endsWith('schemas/assets.json');
}
function validateQaContractAdherence(_context, contractPackage, corpus) {
    var findings = [];
    for (var _i = 0, _a = normalizeContractApiItems(contractPackage.api); _i < _a.length; _i++) {
        var api = _a[_i];
        var route = "".concat(api.method, " ").concat(api.path);
        if (!containsAll(corpus.text, [api.method.toLowerCase(), api.path.toLowerCase()])) {
            findings.push(qaIssue('route_contract_mismatch', "Missing route evidence for contract API ".concat(route, "."), 'Backend/frontend artifacts or file effects do not show the required API route.'));
        }
    }
    for (var _b = 0, _c = normalizeContractAssets(contractPackage.assets); _b < _c.length; _b++) {
        var asset = _c[_b];
        var normalizedPath = normalizeArtifactPath(asset.path);
        if (!corpus.text.includes(normalizedPath.toLowerCase()) && !corpus.fileEffectPaths.has(normalizedPath)) {
            findings.push(qaIssue('asset_contract_mismatch', "Missing asset evidence for contract asset ".concat(asset.path, "."), 'Artifacts and file effects do not show the required asset path.'));
        }
    }
    for (var _d = 0, _e = normalizeSharedCanonicalNames(contractPackage); _d < _e.length; _d++) {
        var name_1 = _e[_d];
        if (!corpus.text.includes(name_1.toLowerCase())) {
            findings.push(qaIssue('field_name_contract_mismatch', "Missing canonical field/name evidence for ".concat(name_1, "."), 'Delivery artifacts do not reference the canonical contract name.'));
        }
    }
    for (var _f = 0, _g = corpus.riskyEffectSummaries; _f < _g.length; _f++) {
        var risky = _g[_f];
        findings.push(qaIssue('file_effect_not_applied', "Unsafe or unapplied effect remains: ".concat(risky, "."), 'A delivery effect was blocked, failed, or rejected before QA.'));
    }
    for (var _h = 0, _j = corpus.sharedIssues; _h < _j.length; _h++) {
        var issue = _j[_h];
        findings.push(__assign(__assign({}, qaIssue('shared_issue_open', "Shared delivery issue remains open: ".concat(issue, "."), 'Earlier workload issues must be resolved or explicitly accepted before final QA passes.')), { severity: issue.toLowerCase().includes('minor') ? 'non_blocking' : 'blocking' }));
    }
    return findings;
}
function applyQaFindings(context, generation, findings, evidenceLines) {
    var blocking = findings.filter(function (issue) { return issue.severity !== 'non_blocking'; });
    generation.status = blocking.length > 0 ? 'failed' : 'completed';
    generation.signals = __assign(__assign({}, generation.signals), { 'qa.status': blocking.length > 0 ? 'failed' : 'passed', 'qa.blocking_issue_count': blocking.length, 'qa.issue_count': findings.length });
    generation.issues = mergeIssues(generation.issues, findings);
    var report = renderQaReport(context, findings, evidenceLines);
    generation.report = generation.report ? "".concat(generation.report, "\n\n").concat(report) : report;
    upsertGeneratedArtifact(generation, 'qa/report.md', generation.report);
}
function renderQaReport(context, findings, evidenceLines) {
    var blocking = findings.filter(function (issue) { return issue.severity !== 'non_blocking'; });
    return __spreadArray(__spreadArray(__spreadArray([
        '# QA Contract Report',
        '',
        "Status: ".concat(blocking.length > 0 ? 'failed' : 'passed'),
        "Workflow: ".concat(context.workflow.id),
        "Run: ".concat(context.run.id),
        '',
        '## Findings'
    ], (findings.length ? findings.map(function (issue) { return "- [".concat(issue.severity, "] ").concat(issue.type, ": ").concat(issue.summary); }) : ['- No contract adherence issues found.']), true), [
        '',
        '## Evidence'
    ], false), (evidenceLines.length ? evidenceLines.map(function (line) { return "- ".concat(line); }) : ['- Run state, artifacts, effects, and shared issues were inspected.']), true).join('\n');
}
function qaIssue(type, summary, impact) {
    return {
        severity: 'blocking',
        type: type,
        summary: summary,
        producer: 'flow-qa-validator',
        impact: impact,
        suggestedFollowup: 'Repair the delivery artifact/effect and rerun QA.'
    };
}
function mergeIssues(existing, incoming) {
    var seen = new Set(existing.map(function (issue) { return "".concat(issue.type, ":").concat(issue.summary); }));
    var merged = __spreadArray([], existing, true);
    for (var _i = 0, incoming_1 = incoming; _i < incoming_1.length; _i++) {
        var issue = incoming_1[_i];
        var key = "".concat(issue.type, ":").concat(issue.summary);
        if (!seen.has(key)) {
            merged.push(issue);
            seen.add(key);
        }
    }
    return merged;
}
function updateSecondRunSuggestion(run, issues, stateId) {
    var followupIssues = issues.filter(isSecondRunIssue);
    if (followupIssues.length === 0) {
        return;
    }
    var existing = run.secondRunSuggestion;
    var merged = mergeIssues((existing === null || existing === void 0 ? void 0 : existing.issues) || [], followupIssues);
    var issueLines = merged.map(function (issue) { return "- [".concat(issue.severity, "] ").concat(issue.type, ": ").concat(issue.summary); }).join('\n');
    var reason = "QA/agentes registraram ".concat(merged.length, " melhoria(s) fora de escopo ou problema(s) nao bloqueante(s).");
    run.secondRunSuggestion = {
        id: (existing === null || existing === void 0 ? void 0 : existing.id) || stableId('second-run', run.id),
        status: (existing === null || existing === void 0 ? void 0 : existing.status) || 'suggested',
        reason: reason,
        title: 'Segunda run sugerida',
        sourceRunId: run.id,
        sourceIssueCount: merged.length,
        issues: merged,
        prompt: [
            "Continue a partir da run ".concat(run.id, "."),
            reason,
            stateId ? "Estado de origem mais recente: ".concat(stateId, ".") : undefined,
            '',
            'Trate apenas os follow-ups abaixo, preservando o escopo entregue na run original:',
            issueLines
        ].filter(Boolean).join('\n'),
        createdAt: (existing === null || existing === void 0 ? void 0 : existing.createdAt) || timestamp()
    };
}
function isSecondRunIssue(issue) {
    var severity = (issue.severity || '').toLowerCase();
    var text = [issue.type, issue.summary, issue.suggestedFollowup].join(' ').toLowerCase();
    if (severity === 'non_blocking' || severity === 'warning' || severity === 'minor') {
        return true;
    }
    return text.includes('out-of-scope')
        || text.includes('out of scope')
        || text.includes('fora de escopo')
        || text.includes('followup')
        || text.includes('follow-up')
        || text.includes('melhoria')
        || text.includes('improvement')
        || text.includes('second run')
        || text.includes('segunda run');
}
function resolveArtifactContent(context, inputArtifacts, requestedPath) {
    return __awaiter(this, void 0, void 0, function () {
        var normalized, input, filePath, content, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    normalized = normalizeArtifactPath(requestedPath);
                    input = inputArtifacts.find(function (artifact) { return normalizeArtifactPath(artifact.path) === normalized; });
                    if (input) {
                        return [2 /*return*/, input];
                    }
                    filePath = findInputArtifactPath(context.run, requestedPath);
                    if (!filePath) return [3 /*break*/, 2];
                    return [4 /*yield*/, readTextFile(filePath)];
                case 1:
                    _a = _b.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _a = undefined;
                    _b.label = 3;
                case 3:
                    content = _a;
                    return [2 /*return*/, content === undefined ? undefined : { path: requestedPath, content: content }];
            }
        });
    });
}
function collectSharedIssues(context) {
    var _a;
    var issues = new Set();
    for (var _i = 0, _b = context.run.workloads; _i < _b.length; _i++) {
        var workload = _b[_i];
        if (workload.id === context.workload.id || workload.stateId === context.workload.stateId) {
            continue;
        }
        for (var _c = 0, _d = workload.issues || []; _c < _d.length; _c++) {
            var issue = _d[_c];
            if (issue) {
                issues.add(issue);
            }
        }
        for (var _e = 0, _f = ((_a = workload.outputEnvelope) === null || _a === void 0 ? void 0 : _a.issues) || []; _e < _f.length; _e++) {
            var issue = _f[_e];
            if (isBlockingIssue(issue)) {
                issues.add(issue.summary);
            }
        }
    }
    for (var _g = 0, _h = context.run.signals; _g < _h.length; _g++) {
        var signal = _h[_g];
        if (signal.stateId === context.workload.stateId) {
            continue;
        }
        if (signal.key.endsWith('.issue') && typeof signal.value === 'string' && signal.value.trim()) {
            issues.add(signal.value.trim());
        }
    }
    for (var _j = 0, _k = context.run.events; _j < _k.length; _j++) {
        var event_1 = _k[_j];
        if (event_1.type !== 'issue.recorded' || event_1.stateId === context.workload.stateId) {
            continue;
        }
        var payload = event_1.payload || {};
        var summary = toTrimmedString(payload.summary || payload.message || payload.reason || event_1.message);
        if (summary && isBlockingIssue(payload)) {
            issues.add(summary);
        }
    }
    return __spreadArray([], issues, true);
}
function isBlockingIssue(issue) {
    var severity = toTrimmedString(issue.severity).toLowerCase();
    if (issue.blocking === true) {
        return true;
    }
    return severity === 'blocking' || severity === 'critical' || severity === 'high';
}
function normalizeContractApiItems(value) {
    return Array.isArray(value) ? value
        .map(function (item) { return isRecord(item) ? { method: toTrimmedString(item.method), path: toTrimmedString(item.path) } : { method: '', path: '' }; })
        .filter(function (item) { return item.method && item.path; }) : [];
}
function normalizeContractAssets(value) {
    return Array.isArray(value) ? value
        .map(function (item) { return isRecord(item) ? { path: toTrimmedString(item.path) } : { path: '' }; })
        .filter(function (item) { return item.path; }) : [];
}
function normalizeSharedCanonicalNames(contractPackage) {
    var shared = isRecord(contractPackage.sharedMd) ? contractPackage.sharedMd : {};
    var value = shared.canonicalNames;
    return Array.isArray(value) ? value.map(toTrimmedString).filter(Boolean) : [];
}
function containsAll(text, values) {
    return values.every(function (value) { return text.includes(value); });
}
function findGeneratedArtifact(generation, artifactPath) {
    var normalized = normalizeArtifactPath(artifactPath);
    return generation.artifacts.find(function (artifact) { return normalizeArtifactPath(artifact.path) === normalized; });
}
function upsertGeneratedArtifact(generation, artifactPath, content) {
    var existing = findGeneratedArtifact(generation, artifactPath);
    if (existing) {
        existing.content = content;
        return;
    }
    generation.artifacts.push({ path: artifactPath, content: content });
}
function parseJsonObject(content) {
    try {
        var parsed = JSON.parse(content);
        return isRecord(parsed) ? parsed : undefined;
    }
    catch (_a) {
        return undefined;
    }
}
function normalizeContractWorkOrders(value) {
    if (Array.isArray(value)) {
        return value.filter(isRecord);
    }
    if (isRecord(value)) {
        return Object.values(value).filter(isRecord);
    }
    return [];
}
function requiredWorkOrderRoles(context, expectedOutputs) {
    var requiredRoles = ['backend', 'frontend', 'designer', 'qa'];
    if ((context.state.agent || context.workload.agent) === 'contract_designer') {
        return requiredRoles;
    }
    var normalizedOutputs = new Set(expectedOutputs.map(normalizeArtifactPath));
    return requiredRoles.filter(function (role) { return normalizedOutputs.has("contracts/work-orders/".concat(role, ".md")); });
}
function normalizeSchemaRefs(value) {
    if (!isRecord(value)) {
        return [];
    }
    return Object.values(value).flatMap(function (entry) { return Array.isArray(entry) ? entry.filter(isRecord) : isRecord(entry) ? [entry] : []; });
}
function shouldMaterializeContractArtifact(context, expectedOutputs, artifactPath) {
    if ((context.state.agent || context.workload.agent) === 'contract_designer') {
        return true;
    }
    var normalizedPath = normalizeArtifactPath(artifactPath);
    return expectedOutputs.some(function (output) { return normalizeArtifactPath(output) === normalizedPath; });
}
function renderSharedContractMarkdown(contractPackage, inputArtifacts) {
    var shared = isRecord(contractPackage.sharedMd) ? contractPackage.sharedMd : {};
    return __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([
        "# Shared Contract - ".concat(toTrimmedString(contractPackage.packageId) || 'flow-contract'),
        '',
        "Objective: ".concat(toTrimmedString(shared.deliveryObjective) || 'Deliver the approved workflow request.'),
        '',
        '## Approved Scope'
    ], markdownList(shared.approvedScope || contractPackage.approvedScope), true), [
        '',
        '## Out Of Scope'
    ], false), markdownList(shared.outOfScope || contractPackage.outOfScope), true), [
        '',
        '## Decisions'
    ], false), markdownList(shared.decisions), true), [
        '',
        '## Canonical Names'
    ], false), markdownList(shared.canonicalNames), true), [
        '',
        '## Inputs'
    ], false), (inputArtifacts.length ? inputArtifacts.map(function (input) { return "- ".concat(input.path); }) : ['- none']), true), [
        '',
        '## Change Rules',
        "Approval policy: ".concat(toTrimmedString(isRecord(contractPackage.changeRules) ? contractPackage.changeRules.approvalPolicy : undefined) || 'strict_human_gate')
    ], false).join('\n');
}
function renderContractWorkOrderMarkdown(contractPackage, workOrder) {
    var role = toTrimmedString(workOrder.agentRole) || 'other';
    return __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([
        "# Work Order - ".concat(toTrimmedString(workOrder.id) || toTrimmedString(workOrder.agentRole) || 'agent'),
        '',
        "Contract package: ".concat(toTrimmedString(contractPackage.packageId) || 'flow-contract'),
        "Role: ".concat(role),
        "Priority: ".concat(toTrimmedString(workOrder.priority) || '5'),
        '',
        '## Scope'
    ], markdownList(workOrder.scope), true), [
        '',
        '## Instructions',
        toTrimmedString(workOrder.instructions) || 'Follow the shared contract and report issues for out-of-scope changes.',
        '',
        '## Required Inputs'
    ], false), markdownList(workOrder.requiredInputs), true), [
        '',
        '## Acceptance Criteria'
    ], false), markdownList(workOrder.acceptanceCriteria), true), [
        '',
        '## Contract References'
    ], false), roleContractReferences(contractPackage, role), true), [
        '',
        '## Role Checklist'
    ], false), roleChecklist(role), true), [
        '',
        "Out-of-scope behavior: ".concat(toTrimmedString(workOrder.outOfScopeBehavior) || 'continue_with_issues')
    ], false).join('\n');
}
function roleContractReferences(contractPackage, role) {
    var lines = [];
    var apiContracts = normalizeRecordArray(contractPackage.api);
    var assets = normalizeRecordArray(contractPackage.assets);
    var schemas = normalizeSchemaRefs(contractPackage.schemas);
    if (role === 'backend' || role === 'frontend' || role === 'qa') {
        for (var _i = 0, apiContracts_1 = apiContracts; _i < apiContracts_1.length; _i++) {
            var item = apiContracts_1[_i];
            var method = toTrimmedString(item.method) || 'GET';
            var apiPath = toTrimmedString(item.path) || '/';
            var summary = toTrimmedString(item.summary);
            lines.push("- API ".concat(toTrimmedString(item.id) || apiPath, ": ").concat(method, " ").concat(apiPath).concat(summary ? " - ".concat(summary) : ''));
        }
    }
    if (role === 'designer' || role === 'frontend' || role === 'qa') {
        for (var _a = 0, assets_1 = assets; _a < assets_1.length; _a++) {
            var item = assets_1[_a];
            var assetPath = toTrimmedString(item.path);
            var format = toTrimmedString(item.format);
            var usage = toTrimmedString(item.usage);
            lines.push("- Asset ".concat(toTrimmedString(item.id) || assetPath, ": ").concat(assetPath).concat(format ? " (".concat(format, ")") : '').concat(usage ? " for ".concat(usage) : ''));
        }
    }
    if (role === 'qa') {
        for (var _b = 0, schemas_1 = schemas; _b < schemas_1.length; _b++) {
            var schema = schemas_1[_b];
            lines.push("- Schema ".concat(toTrimmedString(schema.category) || 'contract', ": ").concat(toTrimmedString(schema.path) || 'schemas/unknown.json', " v").concat(toTrimmedString(schema.version) || '1.0.0'));
        }
    }
    return lines.length ? lines : ['- contracts/shared.md', '- contracts/contracts.json'];
}
function roleChecklist(role) {
    switch (role) {
        case 'backend':
            return [
                '- Implement only the approved API/data contract surface.',
                '- Emit issues for missing schema details instead of changing the contract.',
                '- Produce backend delivery notes with touched files, tests, and contract deviations.'
            ];
        case 'frontend':
            return [
                '- Build UI behavior against the approved API names and response shapes.',
                '- Use only approved assets or record a blocking issue.',
                '- Produce frontend delivery notes with routes/components and integration assumptions.'
            ];
        case 'designer':
            return [
                '- Create or specify only the approved asset set.',
                '- Preserve required dimensions, formats, usage, and naming.',
                '- Produce design delivery notes with asset paths and any unresolved constraints.'
            ];
        case 'qa':
            return [
                '- Validate backend, frontend, and design outputs against contracts/contracts.json.',
                '- Validate API and asset claims against schemas/api.json and schemas/assets.json.',
                '- Emit qa.status=passed only when every acceptance criterion is satisfied; otherwise emit qa.status=failed with repair notes.'
            ];
        default:
            return ['- Follow contracts/shared.md and report out-of-scope work as issues.'];
    }
}
function normalizeRecordArray(value) {
    return Array.isArray(value) ? value.filter(isRecord) : [];
}
function renderContractSchemaJson(contractPackage, schemaRef) {
    var category = toTrimmedString(schemaRef.category);
    var title = category === 'asset' ? 'Flow Asset Contract' : 'Flow API Contract';
    return JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: title,
        $comment: "Generated from ".concat(toTrimmedString(contractPackage.packageId) || 'flow-contract', " ").concat(toTrimmedString(schemaRef.path)),
        type: 'object',
        additionalProperties: true
    }, undefined, 2);
}
function markdownList(value) {
    if (Array.isArray(value)) {
        var items = value.map(function (item) { return typeof item === 'string' ? item : JSON.stringify(item); }).filter(Boolean);
        return items.length ? items.map(function (item) { return "- ".concat(item); }) : ['- none'];
    }
    var single = toTrimmedString(value);
    return single ? ["- ".concat(single)] : ['- none'];
}
function parseAgentPayload(raw) {
    var trimmed = raw.trim();
    try {
        return JSON.parse(trimmed);
    }
    catch (_a) {
        var fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (!fenced) {
            return undefined;
        }
        try {
            return JSON.parse(fenced[1] || '');
        }
        catch (_b) {
            return undefined;
        }
    }
}
function resolveAgentResultPayload(rawResult, workloadDir) {
    return __awaiter(this, void 0, void 0, function () {
        var fallbackResultPath, resultJson;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (parseAgentPayload(rawResult)) {
                        return [2 /*return*/, rawResult];
                    }
                    fallbackResultPath = path.join(workloadDir, 'output', 'result.json');
                    return [4 /*yield*/, readTextFile(fallbackResultPath)];
                case 1:
                    resultJson = _a.sent();
                    if (resultJson && parseAgentPayload(resultJson)) {
                        return [2 /*return*/, resultJson];
                    }
                    return [2 /*return*/, rawResult];
            }
        });
    });
}
function validateWorkloadOutputEnvelope(output, context) {
    if (workloadOutputSchemaValidator(output)) {
        return;
    }
    var details = workloadOutputValidationErrors(workloadOutputSchemaValidator.errors);
    var stateId = context.state.id || context.workload.stateId;
    throw new Error("".concat(workloadOutputContractErrorPrefix, " ").concat(stateId, ": ").concat(details));
}
function writeValidatedWorkloadResultJson(workloadDir, output, context) {
    return __awaiter(this, void 0, void 0, function () {
        var resultPath, persisted, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    validateWorkloadOutputEnvelope(output, context);
                    resultPath = path.join(workloadDir, 'output', 'result.json');
                    return [4 /*yield*/, fs.mkdir(path.dirname(resultPath), { recursive: true })];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, fs.writeFile(resultPath, "".concat(JSON.stringify(output, undefined, 2), "\n"), 'utf8')];
                case 2:
                    _c.sent();
                    _b = (_a = JSON).parse;
                    return [4 /*yield*/, fs.readFile(resultPath, 'utf8')];
                case 3:
                    persisted = _b.apply(_a, [_c.sent()]);
                    validateWorkloadOutputEnvelope(persisted, context);
                    return [2 /*return*/, file_uri_1.FileUri.create(resultPath).toString()];
            }
        });
    });
}
function workloadOutputValidationErrors(errors) {
    if (!Array.isArray(errors) || errors.length === 0) {
        return 'output does not match workload output schema.';
    }
    return errors
        .map(function (error) {
        var path = error.instancePath || error.dataPath || '#';
        return "".concat(path, " ").concat(error.message || 'is invalid');
    })
        .join('; ');
}
function validateRawProviderOutputShape(payload, context) {
    validateRawEffectOutputShape(payload.effects, context, 'effects');
    validateRawArtifactOutputShape(payload.artifacts, context, 'artifacts');
    if (isRecord(payload.result)) {
        validateRawEffectOutputShape(payload.result.effects, context, 'result.effects');
        validateRawArtifactOutputShape(payload.result.artifacts, context, 'result.artifacts');
    }
}
function validateRawEffectOutputShape(value, context, pathLabel) {
    if (value === undefined) {
        return;
    }
    if (!Array.isArray(value)) {
        throwRawProviderShapeError(context, "".concat(pathLabel, " must be an array when provided."));
    }
    value.forEach(function (item, index) {
        var _a;
        if (!isRecord(item)) {
            throwRawProviderShapeError(context, "".concat(pathLabel, "[").concat(index, "] must be an object."));
        }
        var type = (_a = item.type) !== null && _a !== void 0 ? _a : item.kind;
        if (type !== undefined && typeof type !== 'string') {
            throwRawProviderShapeError(context, "".concat(pathLabel, "[").concat(index, "].type must be a string when provided."));
        }
        if (typeof type === 'string' && !type.trim()) {
            throwRawProviderShapeError(context, "".concat(pathLabel, "[").concat(index, "].type must be a non-empty string when provided."));
        }
    });
}
function validateRawArtifactOutputShape(value, context, pathLabel) {
    if (value === undefined) {
        return;
    }
    if (!Array.isArray(value) && !isRecord(value)) {
        throwRawProviderShapeError(context, "".concat(pathLabel, " must be an array or object map when provided."));
    }
    if (Array.isArray(value)) {
        value.forEach(function (item, index) {
            if (!isRecord(item)) {
                throwRawProviderShapeError(context, "".concat(pathLabel, "[").concat(index, "] must be an object."));
            }
            var artifactPath = toTrimmedString(item.path);
            if (!artifactPath) {
                throwRawProviderShapeError(context, "".concat(pathLabel, "[").concat(index, "].path must be a non-empty string."));
            }
            var content = toTrimmedString(item.content);
            if (!content) {
                throwRawProviderShapeError(context, "".concat(pathLabel, "[").concat(index, "].content must be a non-empty string."));
            }
        });
        return;
    }
    for (var _i = 0, _a = Object.entries(value); _i < _a.length; _i++) {
        var _b = _a[_i], artifactPath = _b[0], content = _b[1];
        if (!toTrimmedString(artifactPath)) {
            throwRawProviderShapeError(context, "".concat(pathLabel, " keys must be non-empty strings."));
        }
        if (!toTrimmedString(content)) {
            throwRawProviderShapeError(context, "".concat(pathLabel, "[").concat(artifactPath, "] must be a non-empty string."));
        }
    }
}
function throwRawProviderShapeError(context, detail) {
    var stateId = context.state.id || context.workload.stateId;
    throw new Error("".concat(workloadOutputContractErrorPrefix, " ").concat(stateId, ": ").concat(detail));
}
function parseArtifactOutput(value) {
    if (Array.isArray(value)) {
        return value
            .filter(function (item) { return item && typeof item === 'object'; })
            .map(function (item) {
            var candidate = item;
            var artifactPath = toTrimmedString(candidate.path);
            if (!artifactPath) {
                return undefined;
            }
            return { path: artifactPath, content: toTrimmedString(candidate.content) || '' };
        })
            .filter(function (entry) { return entry !== undefined; });
    }
    if (isRecord(value)) {
        return Object.entries(value)
            .filter(function (_a) {
            var artifactPath = _a[0];
            return !!artifactPath;
        })
            .map(function (_a) {
            var artifactPath = _a[0], content = _a[1];
            return ({ path: artifactPath, content: String(content !== null && content !== void 0 ? content : '') });
        });
    }
    return [];
}
function parseEffectOutput(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    var mapped = value
        .filter(function (item) { return isRecord(item); })
        .map(function (item) {
        var _a;
        var candidate = item;
        var type = toTrimmedString(candidate.type || candidate.kind) || 'notification';
        var summary = toTrimmedString(candidate.summary) || "".concat(type, " effect for workload artifact.");
        return {
            type: type,
            summary: summary,
            path: toOptionalTrimmedString(candidate.path),
            prompt: toOptionalTrimmedString(candidate.prompt),
            artifactPath: toOptionalTrimmedString(candidate.artifactPath),
            mimeType: toOptionalTrimmedString(candidate.mimeType),
            provider: toOptionalTrimmedString(candidate.provider),
            bytes: parseOptionalNumber(candidate.bytes),
            command: toOptionalTrimmedString(candidate.command),
            cwd: toOptionalTrimmedString(candidate.cwd),
            env: parseRecordEnv(candidate.env),
            allowedEnv: parseStringArray(candidate.allowedEnv),
            allowedCommands: parseStringArray(candidate.allowedCommands),
            allowedPaths: parseStringArray(candidate.allowedPaths),
            deniedPaths: parseStringArray(candidate.deniedPaths),
            timeoutMs: parseOptionalNumber(candidate.timeoutMs),
            exitCode: parseOptionalNumber(candidate.exitCode),
            stdout: toOptionalTrimmedString(candidate.stdout),
            stderr: toOptionalTrimmedString(candidate.stderr),
            timedOut: candidate.timedOut === true,
            content: (_a = toOptionalString(candidate.content)) !== null && _a !== void 0 ? _a : toOptionalString(candidate.contentAfter),
            hashBefore: toOptionalTrimmedString(candidate.hashBefore),
            hashAfter: toOptionalTrimmedString(candidate.hashAfter),
            patch: toOptionalTrimmedString(candidate.patch),
            approvalPolicy: toOptionalTrimmedString(candidate.approvalPolicy),
            status: toOptionalTrimmedString(candidate.status)
        };
    });
    return mapped.filter(function (candidate) { return candidate.summary; });
}
function parseSignalOutput(value) {
    var entries = {};
    if (isRecord(value)) {
        for (var _i = 0, _a = Object.entries(value); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], rawValue = _b[1];
            if (!key || !isSignalPrimitive(rawValue)) {
                continue;
            }
            entries[key] = rawValue;
        }
        return entries;
    }
    if (Array.isArray(value)) {
        for (var _c = 0, value_1 = value; _c < value_1.length; _c++) {
            var item = value_1[_c];
            if (!isRecord(item)) {
                continue;
            }
            var key = toTrimmedString(item.key);
            if (!key) {
                continue;
            }
            var valueCandidate = item.value;
            if (!isSignalPrimitive(valueCandidate)) {
                continue;
            }
            entries[key] = valueCandidate;
        }
    }
    return entries;
}
function parseIssueOutput(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    var issues = value
        .map(function (item) {
        if (typeof item === 'string') {
            var summary = item.trim();
            if (!summary) {
                return undefined;
            }
            return {
                severity: 'non_blocking',
                type: 'workload_issue',
                summary: summary
            };
        }
        if (isRecord(item)) {
            var record = item;
            var summary = toTrimmedString(record.summary);
            if (!summary) {
                return undefined;
            }
            return {
                severity: toTrimmedString(record.severity) || 'non_blocking',
                type: toTrimmedString(record.type) || 'workload_issue',
                summary: summary,
                producer: toTrimmedString(record.producer) || undefined,
                impact: toTrimmedString(record.impact) || undefined,
                suggestedFollowup: toTrimmedString(record.suggestedFollowup) || undefined
            };
        }
        return undefined;
    })
        .filter(function (issue) { return issue !== undefined && Boolean(issue.summary); });
    return issues;
}
function parseMemoryCandidates(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    var parsed = [];
    value.forEach(function (item, index) {
        if (typeof item === 'string') {
            parsed.push(buildMemoryCandidateFromText(item, undefined, undefined, index));
            return;
        }
        if (!isRecord(item)) {
            return;
        }
        var record = item;
        parsed.push(buildMemoryCandidateFromRecord(record, index));
    });
    return parsed.filter(function (item) { return item && item.content; });
}
function buildMemoryCandidateFromText(raw, stateId, runId, index) {
    return {
        id: stableId('memory-candidate', runId || 'run', stateId || 'state', "candidate-".concat(index)),
        runId: runId || 'run',
        stateId: stateId,
        source: 'artifact',
        kind: 'fact',
        content: raw.trim(),
        reason: 'LLM suggested memory content.',
        confidence: 0.6,
        status: 'candidate',
        createdAt: timestamp()
    };
}
function buildMemoryCandidateFromRecord(record, index) {
    var content = toTrimmedString(record.content) || toTrimmedString(record.summary) || '';
    var candidateId = toTrimmedString(record.id) || stableId('memory-candidate', toTrimmedString(record.runId) || 'run', toTrimmedString(record.stateId) || 'state', "".concat(index), content.slice(0, 32));
    return {
        id: candidateId,
        runId: toTrimmedString(record.runId) || 'run',
        stateId: toTrimmedString(record.stateId) || undefined,
        source: parseMemoryCandidateSource(record.source),
        kind: parseMemoryCandidateKind(record.kind),
        scope: parseMemoryCandidateScope(record.scope),
        content: content,
        reason: toTrimmedString(record.reason) || 'LLM suggested memory content.',
        confidence: normalizeConfidence(record.confidence),
        status: 'candidate',
        createdAt: timestamp()
    };
}
function parseMemoryCandidateSource(value) {
    var candidate = toTrimmedString(value);
    if (candidate === 'artifact' || candidate === 'effect' || candidate === 'signal' || candidate === 'workflow_state') {
        return candidate;
    }
    return 'workflow_state';
}
function parseMemoryCandidateKind(value) {
    var candidate = toTrimmedString(value);
    if (candidate === 'fact' || candidate === 'decision' || candidate === 'preference' || candidate === 'instruction' || candidate === 'summary') {
        return candidate;
    }
    return 'fact';
}
function parseMemoryCandidateScope(value) {
    var candidate = toTrimmedString(value);
    if (candidate === 'ide'
        || candidate === 'workspace'
        || candidate === 'project'
        || candidate === 'workflow'
        || candidate === 'run'
        || candidate === 'agent') {
        return candidate;
    }
    return undefined;
}
function parseSingleContentArtifact(payload, expectedOutputs) {
    var fallbackOutputs = expectedOutputs.length > 0 ? expectedOutputs : ['report.md'];
    var outputPath = fallbackOutputs[0];
    var content = toTrimmedString(payload.content)
        || toTrimmedString(payload.report)
        || toTrimmedString(payload.text)
        || defaultOutputPlaceholder(outputPath);
    return { path: outputPath, content: content };
}
function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function toTrimmedString(value) {
    if (typeof value === 'string') {
        return value.trim();
    }
    return '';
}
function toOptionalTrimmedString(value) {
    var trimmed = toTrimmedString(value);
    return trimmed || undefined;
}
function toOptionalString(value) {
    return typeof value === 'string' ? value : undefined;
}
function parseStringArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.map(function (item) { return toTrimmedString(item); }).filter(Boolean);
}
function parseOptionalNumber(value) {
    var parsed = typeof value === 'number' ? value : Number.parseInt(toTrimmedString(value), 10);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function parseRecordEnv(value) {
    if (!isRecord(value)) {
        return {};
    }
    var env = {};
    for (var _i = 0, _a = Object.entries(value); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], raw = _b[1];
        if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
            env[key] = raw;
        }
    }
    return env;
}
function stringifyEnv(value) {
    if (!value) {
        return undefined;
    }
    var env = {};
    for (var _i = 0, _a = Object.entries(value); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], raw = _b[1];
        env[key] = String(raw);
    }
    return env;
}
function commandEffectSummary(stateId, status, command) {
    return "Command effect ".concat(status, " for ").concat(stateId, ": ").concat(command);
}
function hasObjectKey(value, key) {
    return isRecord(value) && Object.prototype.hasOwnProperty.call(value, key);
}
function normalizeResultStatus(rawStatus) {
    var normalized = toTrimmedString(rawStatus).toLowerCase();
    if (!normalized || normalized === 'ok' || normalized === 'success') {
        return 'completed';
    }
    if (normalized === 'error' || normalized === 'fail' || normalized === 'abort') {
        return 'failed';
    }
    var allowed = ['pending', 'ready', 'running', 'completed', 'failed', 'waiting', 'review', 'done'];
    return allowed.includes(normalized) ? normalized : 'completed';
}
function isSignalPrimitive(value) {
    var typed = value;
    return typeof typed === 'string' || typeof typed === 'number' || typeof typed === 'boolean';
}
function normalizeWorkloadCompletionStatus(context, effects) {
    var workloadStatus = context.state.status || '';
    var signalStatus = context.run.stateStatuses[context.workload.stateId];
    if (workloadStatus === 'failed' || signalStatus === 'failed') {
        return 'failed';
    }
    if (effects.some(function (effect) { return effect.type === 'memory_write'; })) {
        return 'completed';
    }
    return 'completed';
}
function normalizeEffectStatus(raw, failed) {
    var normalized = normalizeWorkloadStatusRaw(raw).toLowerCase();
    if (normalized === 'approved' || normalized === 'applied' || normalized === 'rejected' || normalized === 'blocked' || normalized === 'failed') {
        return normalized;
    }
    if (failed) {
        return 'failed';
    }
    return 'proposed';
}
function fileEffectTransitionStatuses(effect, result, finalStatus) {
    var statuses = ['proposed'];
    var requestedStatus = normalizeWorkloadStatusRaw(effect.status);
    if (requestedStatus === 'rejected') {
        addStatus(statuses, 'rejected');
        return statuses;
    }
    if (result === null || result === void 0 ? void 0 : result.blocked) {
        addStatus(statuses, 'blocked');
        return statuses;
    }
    if ((result === null || result === void 0 ? void 0 : result.applied) || requestedStatus === 'approved' || requestedStatus === 'applied' || normalizeWorkloadStatusRaw(effect.approvalPolicy) === 'auto_apply') {
        addStatus(statuses, 'approved');
    }
    addStatus(statuses, finalStatus);
    return statuses;
}
function addStatus(statuses, status) {
    if (!statuses.includes(status)) {
        statuses.push(status);
    }
}
function fileEffectApproved(effect) {
    var status = normalizeWorkloadStatusRaw(effect.status);
    var policy = normalizeWorkloadStatusRaw(effect.approvalPolicy);
    return status === 'approved' || status === 'applied' || policy === 'auto_apply';
}
function imageEffectApproved(effect) {
    var status = normalizeWorkloadStatusRaw(effect.status);
    return status === 'approved' || status === 'applied';
}
function fileEffectStatus(effect, result) {
    if (normalizeWorkloadStatusRaw(effect.status) === 'rejected') {
        return 'rejected';
    }
    if (result.applied) {
        return 'applied';
    }
    if (result.blocked) {
        return 'blocked';
    }
    if (result.requiresApproval) {
        return 'proposed';
    }
    return 'failed';
}
function normalizeWorkloadStatusRaw(value) {
    return toTrimmedString(value).toLowerCase();
}
function parseConfidence(value) {
    var parsed = typeof value === 'number' ? value : Number.parseFloat(toTrimmedString(value));
    if (!Number.isFinite(parsed)) {
        return 0.5;
    }
    if (parsed < 0) {
        return 0;
    }
    if (parsed > 1) {
        return 1;
    }
    return parsed;
}
function buildStructuredRunReport(context) {
    var _a, _b;
    var workflow = context.workflow, run = context.run;
    var workloadEventSeqs = new Map();
    run.events.forEach(function (event, index) {
        if (!event.workloadId) {
            return;
        }
        var seqs = workloadEventSeqs.get(event.workloadId) || [];
        seqs.push(index + 1);
        workloadEventSeqs.set(event.workloadId, seqs);
    });
    var issues = collectRunIssues(run);
    var pending = collectRunPending(run);
    return {
        schemaVersion: 'flow.final-report/v1',
        generatedAt: timestamp(),
        run: {
            id: run.id,
            workflowId: run.workflowId,
            status: run.status,
            prompt: (0, common_2.truncateFlowText)(run.prompt, common_2.FlowSizeLimits.promptBytes, 'prompt'),
            createdAt: run.createdAt,
            updatedAt: run.updatedAt,
            executionMode: run.executionMode,
            executionModeMessage: run.executionModeMessage,
            externalKernelMetadata: run.externalKernelMetadata
        },
        workflow: {
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
            version: workflow.version,
            file: workflow.file,
            capabilities: __spreadArray([], new Set(((_a = workflow.requires) === null || _a === void 0 ? void 0 : _a.capabilities) || []), true).sort(),
            agents: workflow.agents || {},
            states: Object.entries(workflow.states).map(function (_a) {
                var id = _a[0], state = _a[1];
                return ({
                    id: id,
                    type: state.type,
                    agent: state.agent,
                    status: run.stateStatuses[id] || 'pending',
                    outputs: state.outputs || [],
                    input: state.input,
                    gates: state.gates || [],
                    waitFor: state.waitFor || []
                });
            }),
            transitions: workflow.transitions.map(function (transition) { return ({
                id: transition.id,
                from: transition.from,
                to: transition.to,
                on: transition.on,
                guard: transition.guard,
                priority: transition.priority,
                fired: run.events.some(function (event) {
                    var _a, _b;
                    return event.type === 'transition.fired' && (event.transitionId === transition.id
                        || ((_a = event.payload) === null || _a === void 0 ? void 0 : _a.transitionId) === transition.id
                        || (event.stateId === transition.from && ((_b = event.payload) === null || _b === void 0 ? void 0 : _b.to) === transition.to));
                })
            }); })
        },
        workloads: run.workloads.map(function (workload) { return ({
            id: workload.id,
            stateId: workload.stateId,
            branchId: workload.branchId,
            agent: workload.agent,
            attempt: workload.attempt,
            previousWorkloadId: workload.previousWorkloadId,
            status: workload.status,
            inputArtifacts: workload.inputArtifacts,
            outputArtifacts: workload.outputArtifacts,
            effectIds: workload.effectIds,
            issues: workload.issues,
            reportUri: workload.reportUri,
            eventSeqs: workloadEventSeqs.get(workload.id) || []
        }); }),
        gates: run.gates.map(function (gate) { return ({
            id: gate.id,
            title: gate.title,
            stateId: gate.stateId,
            status: gate.status || 'pending',
            prompt: gate.prompt
        }); }),
        artifacts: run.artifacts.map(function (artifact) { return ({
            id: artifact.id,
            stateId: artifact.stateId,
            kind: artifact.kind,
            uri: artifact.uri,
            summary: artifact.summary,
            createdAt: artifact.createdAt
        }); }),
        effects: run.effects.map(function (effect) { return withoutUndefined({
            id: effect.id,
            stateId: effect.stateId,
            kind: effect.kind,
            type: effect.type,
            path: effect.path,
            artifactPath: effect.artifactPath,
            command: effect.command,
            status: effect.status,
            approvalPolicy: effect.approvalPolicy,
            summary: effect.summary,
            hashBefore: effect.hashBefore,
            hashAfter: effect.hashAfter
        }); }),
        issues: issues,
        repairs: collectRunRepairs(run),
        memoryWrites: run.memoryWrites || [],
        memoryCandidates: run.memoryCandidates || [],
        capabilities: {
            required: __spreadArray([], new Set(((_b = workflow.requires) === null || _b === void 0 ? void 0 : _b.capabilities) || []), true).sort(),
            executionMode: run.executionMode,
            deterministicFallback: run.executionMode === 'kernel_simulated'
        },
        pending: pending,
        secondRunSuggestion: run.secondRunSuggestion,
        eventLog: run.events.map(function (event, index) { return ({
            seq: index + 1,
            id: event.id,
            type: event.type,
            timestamp: event.timestamp,
            stateId: event.stateId,
            transitionId: event.transitionId,
            workloadId: event.workloadId,
            gateId: event.gateId,
            message: event.message,
            payload: event.payload
        }); })
    };
}
function renderStructuredRunReportMarkdown(report) {
    var run = report.run;
    var workflow = report.workflow;
    var workloads = Array.isArray(report.workloads) ? report.workloads : [];
    var artifacts = Array.isArray(report.artifacts) ? report.artifacts : [];
    var effects = Array.isArray(report.effects) ? report.effects : [];
    var issues = Array.isArray(report.issues) ? report.issues : [];
    var gates = Array.isArray(report.gates) ? report.gates : [];
    var repairs = Array.isArray(report.repairs) ? report.repairs : [];
    var pending = Array.isArray(report.pending) ? report.pending : [];
    return [
        '# Flow Final Report',
        '',
        "- Run: `".concat(run.id || '', "`"),
        "- Workflow: `".concat(workflow.id || '', "`"),
        "- Status: `".concat(run.status || '', "`"),
        "- Generated at: ".concat(report.generatedAt || ''),
        '',
        '## Prompt',
        '',
        String(run.prompt || 'No prompt recorded.'),
        '',
        '## Metrics',
        '',
        "- Workloads: ".concat(workloads.length),
        "- Gates: ".concat(gates.length),
        "- Artifacts: ".concat(artifacts.length),
        "- Effects: ".concat(effects.length),
        "- Issues: ".concat(issues.length),
        "- Repairs: ".concat(repairs.length),
        "- Pending: ".concat(pending.length),
        '',
        '## Workloads',
        '',
        renderReportList(workloads, function (item) { return "- `".concat(item.id, "` ").concat(item.stateId || '', ": ").concat(item.status || ''); }),
        '',
        '## Gates',
        '',
        renderReportList(gates, function (item) { return "- `".concat(item.id, "` ").concat(item.stateId || '', ": ").concat(item.status || ''); }),
        '',
        '## Artifacts',
        '',
        renderReportList(artifacts, function (item) { return "- `".concat(item.kind, "` ").concat(item.summary || item.uri || item.id); }),
        '',
        '## Effects',
        '',
        renderReportList(effects, function (item) { return "- `".concat(item.kind || item.type, "` ").concat(item.status || '', ": ").concat(item.summary || item.path || item.id); }),
        '',
        '## Issues',
        '',
        renderReportList(issues, function (item) { return "- `".concat(item.severity || 'issue', "` ").concat(item.summary || item.message || item.id); }),
        '',
        '## Repairs',
        '',
        renderReportList(repairs, function (item) { return "- `".concat(item.stateId || item.key || item.id, "` attempts: ").concat(item.attempts || 0); }),
        '',
        '## Pending',
        '',
        renderReportList(pending, function (item) { return "- `".concat(item.kind || 'pending', "` ").concat(item.id || item.stateId || item.workloadId, ": ").concat(item.reason || item.status || ''); })
    ].join('\n');
}
function renderReportList(items, render) {
    return items.length ? items.map(render).join('\n') : '- None.';
}
function collectRunIssues(run) {
    var _a;
    var issues = [];
    for (var _i = 0, _b = run.workloads; _i < _b.length; _i++) {
        var workload = _b[_i];
        for (var _c = 0, _d = workload.issues; _c < _d.length; _c++) {
            var issue = _d[_c];
            issues.push({ stateId: workload.stateId, workloadId: workload.id, severity: 'unknown', type: 'workload_issue', summary: issue });
        }
        for (var _e = 0, _f = ((_a = workload.outputEnvelope) === null || _a === void 0 ? void 0 : _a.issues) || []; _e < _f.length; _e++) {
            var issue = _f[_e];
            issues.push(__assign(__assign({}, issue), { stateId: workload.stateId, workloadId: workload.id }));
        }
    }
    for (var _g = 0, _h = run.events; _g < _h.length; _g++) {
        var event_2 = _h[_g];
        if (event_2.type === 'issue.recorded') {
            issues.push(__assign(__assign({}, (event_2.payload || {})), { stateId: event_2.stateId, workloadId: event_2.workloadId, eventId: event_2.id, message: event_2.message }));
        }
    }
    return issues;
}
function collectRunRepairs(run) {
    var repairs = new Map();
    for (var _i = 0, _a = run.workloads; _i < _a.length; _i++) {
        var workload = _a[_i];
        if (!workload.previousWorkloadId && (workload.attempt || 0) <= 1) {
            continue;
        }
        var key = workload.stateId;
        var existing = repairs.get(key) || { stateId: key, attempts: 0, workloadIds: [] };
        existing.attempts = Math.max(Number(existing.attempts) || 0, workload.attempt || 1);
        existing.workloadIds.push(workload.id);
        repairs.set(key, existing);
    }
    return __spreadArray([], repairs.values(), true).sort(function (a, b) { return String(a.stateId).localeCompare(String(b.stateId)); });
}
function collectRunPending(run) {
    var pending = [];
    for (var _i = 0, _a = run.workloads; _i < _a.length; _i++) {
        var workload = _a[_i];
        if (workload.status !== 'done' && workload.status !== 'failed') {
            pending.push({ kind: 'workload', id: workload.id, stateId: workload.stateId, status: workload.status, reason: "workload ".concat(workload.status) });
        }
    }
    for (var _b = 0, _c = Object.entries(run.stateStatuses); _b < _c.length; _b++) {
        var _d = _c[_b], stateId = _d[0], status_2 = _d[1];
        if (status_2 !== 'done' && status_2 !== 'failed') {
            pending.push({ kind: 'state', id: stateId, stateId: stateId, status: status_2, reason: "state ".concat(status_2) });
        }
    }
    for (var _e = 0, _f = run.gates; _e < _f.length; _e++) {
        var gate = _f[_e];
        if (!gate.status || gate.status === 'pending' || gate.status === 'revision_requested') {
            pending.push({ kind: 'gate', id: gate.id, stateId: gate.stateId, status: gate.status || 'pending', reason: 'gate waiting for decision' });
        }
    }
    for (var _g = 0, _h = run.effects; _g < _h.length; _g++) {
        var effect = _h[_g];
        if (effect.status === 'proposed' || effect.status === 'blocked' || effect.status === 'failed') {
            pending.push({ kind: 'effect', id: effect.id, stateId: effect.stateId, status: effect.status, reason: effect.summary });
        }
    }
    for (var _j = 0, _k = run.memoryCandidates || []; _j < _k.length; _j++) {
        var candidate = _k[_j];
        if (candidate.status === 'candidate' || candidate.status === 'approved') {
            pending.push({ kind: 'memory_candidate', id: candidate.id, stateId: candidate.stateId, status: candidate.status, reason: candidate.reason });
        }
    }
    return pending;
}
function buildWorkloadOutputEnvelope(context, generation) {
    var outputs = context.state.outputs && context.state.outputs.length > 0 ? context.state.outputs : ['report.md'];
    var issueEntries = generation.issues.length ? generation.issues : [];
    var artifactMetadata = buildEnvelopeArtifacts(context, generation.artifacts, outputs);
    var signalMap = generation.signals;
    return {
        status: generation.status,
        result: {
            status: generation.status,
            summary: generation.summary,
            artifacts: artifactMetadata,
            signals: signalMap,
            issues: issueEntries
        },
        artifacts: artifactMetadata,
        effects: generation.effects.map(function (effect) { return withoutUndefined({
            type: effect.type,
            path: effect.path,
            content: effect.content,
            prompt: effect.prompt,
            artifactPath: effect.artifactPath,
            mimeType: effect.mimeType,
            provider: effect.provider,
            bytes: effect.bytes,
            command: effect.command,
            cwd: effect.cwd,
            env: effect.env,
            allowedEnv: effect.allowedEnv,
            allowedCommands: effect.allowedCommands,
            allowedPaths: effect.allowedPaths,
            deniedPaths: effect.deniedPaths,
            timeoutMs: effect.timeoutMs,
            exitCode: effect.exitCode,
            stdout: effect.stdout,
            stderr: effect.stderr,
            timedOut: effect.timedOut,
            summary: effect.summary,
            hashBefore: effect.hashBefore,
            patch: effect.patch,
            approvalPolicy: effect.approvalPolicy,
            hashAfter: effect.hashAfter,
            status: effect.status
        }); }),
        signals: signalMap,
        issues: issueEntries,
        report: generation.report,
        memoryCandidates: generation.memoryCandidates
    };
}
function withoutUndefined(value) {
    return Object.fromEntries(Object.entries(value).filter(function (_a) {
        var entry = _a[1];
        return entry !== undefined;
    }));
}
function flowEffectToWorkloadResultEffect(effect) {
    return withoutUndefined({
        type: effect.type || effect.kind,
        summary: effect.summary,
        path: effect.path,
        prompt: effect.prompt,
        artifactPath: effect.artifactPath,
        mimeType: effect.mimeType,
        provider: effect.provider,
        bytes: effect.bytes,
        command: effect.command,
        cwd: effect.cwd,
        env: effect.env,
        allowedPaths: effect.allowedPaths,
        deniedPaths: effect.deniedPaths,
        timeoutMs: effect.timeoutMs,
        exitCode: effect.exitCode,
        stdout: effect.stdout,
        stderr: effect.stderr,
        timedOut: effect.timedOut,
        hashBefore: effect.hashBefore,
        hashAfter: effect.hashAfter,
        patch: effect.patch,
        approvalPolicy: effect.approvalPolicy,
        status: effect.status
    });
}
function validateGeneratedArtifactCoverage(generatedArtifacts, expectedOutputs, context) {
    var generatedPaths = new Set(generatedArtifacts.map(function (artifact) { return normalizeArtifactPath(artifact.path); }));
    var missingOutputs = expectedOutputs
        .map(normalizeArtifactPath)
        .filter(function (output) { return !generatedPaths.has(output); });
    if (missingOutputs.length > 0) {
        throw new Error("".concat(workloadOutputContractErrorPrefix, " ").concat(context.state.id || context.workload.stateId, ": missing generated artifacts for expected outputs: ").concat(missingOutputs.join(', '), "."));
    }
}
function buildEnvelopeArtifacts(context, generatedArtifacts, expectedOutputs) {
    var byPath = new Map();
    var emitArtifact = function (artifactPath) {
        var normalized = normalizeArtifactPath(artifactPath);
        if (byPath.has(normalized)) {
            return;
        }
        byPath.set(normalized, {
            id: stableId('artifact', context.run.id, context.workload.id, artifactPath),
            path: artifactPath,
            type: artifactKindFromPath(artifactPath)
        });
    };
    for (var _i = 0, _a = expectedOutputs.length ? expectedOutputs : ['report.md']; _i < _a.length; _i++) {
        var output = _a[_i];
        emitArtifact(output);
    }
    for (var _b = 0, generatedArtifacts_1 = generatedArtifacts; _b < generatedArtifacts_1.length; _b++) {
        var generatedArtifact = generatedArtifacts_1[_b];
        emitArtifact(generatedArtifact.path);
    }
    return __spreadArray([], byPath.values(), true);
}
function normalizeEffectKind(type, path, command) {
    var normalized = (type || '').toLowerCase();
    if (isImageEffectType(normalized)) {
        return 'image';
    }
    if (normalized === 'command' || normalized === 'command.execute' || Boolean(command)) {
        return 'command';
    }
    if (normalized === 'memory_write' || normalized === 'memory-write') {
        return 'memory_write';
    }
    if (normalized === 'notification' || normalized === 'notify') {
        return 'notification';
    }
    if (path || normalized.includes('file') || normalized.includes('artifact') || normalized.includes('patch')) {
        return 'file_write';
    }
    return 'other';
}
function normalizeConfidence(value) {
    return parseConfidence(value);
}
function parseAgentMarkdownSections(agentMarkdown) {
    var _a, _b;
    var sections = splitMarkdownSections(agentMarkdown);
    var role = ((_a = sections.role) === null || _a === void 0 ? void 0 : _a.trim()) || fallbackAgentRole(agentMarkdown);
    var qualityCriteria = splitCriteriaLines(sections.qualityCriteria || '');
    var outputFormat = (_b = sections.outputFormat) === null || _b === void 0 ? void 0 : _b.trim();
    return {
        role: role,
        qualityCriteria: qualityCriteria,
        outputFormat: outputFormat || ''
    };
}
function splitMarkdownSections(markdown) {
    var collected = {
        role: [],
        qualityCriteria: [],
        outputFormat: []
    };
    var current;
    var lines = markdown.split(/\r?\n/);
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var line = lines_1[_i];
        var heading = line.match(/^\s{0,3}#{1,6}\s+(.*)\s*$/);
        if (heading) {
            var normalized = normalizeHeading(heading[1]);
            if (isRoleSection(normalized)) {
                current = 'role';
                continue;
            }
            if (isQualityCriteriaSection(normalized)) {
                current = 'qualityCriteria';
                continue;
            }
            if (isOutputFormatSection(normalized)) {
                current = 'outputFormat';
                continue;
            }
            current = undefined;
            continue;
        }
        if (!current) {
            continue;
        }
        collected[current].push(line);
    }
    return {
        role: collected.role.join('\n'),
        qualityCriteria: collected.qualityCriteria.join('\n'),
        outputFormat: collected.outputFormat.join('\n')
    };
}
function fallbackAgentRole(markdown) {
    var lines = markdown.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
    if (lines.length > 0) {
        return lines[0].replace(/^#{1,6}\s*/, '');
    }
    return 'Flow execution agent';
}
function splitCriteriaLines(text) {
    var lines = text.split(/\r?\n/);
    var bullets = lines
        .map(function (line) { return line.trim(); })
        .filter(function (line) { return line.length > 0 && !line.startsWith('#') && !isFence(line); })
        .filter(function (line) { return /^\d+[\.\)]/.test(line) || /^[-*]\s+/.test(line) || line.length > 0; });
    var trimmedBullets = bullets
        .map(function (line) { return line.replace(/^(\d+[\.\)]\s*|[-*]\s*)/, '').trim(); })
        .filter(Boolean);
    if (trimmedBullets.length > 0) {
        return trimmedBullets;
    }
    return text
        .split('\n')
        .map(function (line) { return line.trim(); })
        .filter(function (line) { return line.length > 0 && !line.startsWith('#') && !isFence(line); });
}
function isFence(line) {
    return line.startsWith('```') && line.endsWith('```');
}
function normalizeHeading(value) {
    return removeDiacritics(value).toLowerCase();
}
function removeDiacritics(value) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function isRoleSection(normalizedHeading) {
    return normalizedHeading === 'role' || normalizedHeading.includes('papel');
}
function isQualityCriteriaSection(normalizedHeading) {
    return normalizedHeading.includes('quality') && normalizedHeading.includes('criteria')
        || normalizedHeading.includes('quality criteria')
        || normalizedHeading.includes('criteria')
        || normalizedHeading.includes('criterios')
        || normalizedHeading.includes('qualidade');
}
function isOutputFormatSection(normalizedHeading) {
    return normalizedHeading.includes('output') && normalizedHeading.includes('format')
        || normalizedHeading.includes('formato') && (normalizedHeading.includes('saida') || normalizedHeading.includes('esperada'));
}
function buildDefaultExpectedOutputFormat(expectedOutputs) {
    if (expectedOutputs.some(function (output) { return normalizeArtifactPath(output) === 'contracts/contracts.json'; })) {
        return buildContractExpectedOutputFormat(expectedOutputs);
    }
    return [
        'Return exactly JSON in this shape:',
        'Put generated file contents in result.artifacts entries with both path and content.',
        'If you include top-level artifacts, every generated artifact entry must include both path and content.',
        'Only use effects for explicit side effects beyond the normal generated outputs.',
        'Do not represent normal expected outputs as file.created or file.edited effects.',
        '{',
        '  "result": {',
        '    "status": "completed|failed|ready|running|waiting|review|done|pending",',
        '    "summary": "short summary",',
        '    "artifacts": [ { "path": "string", "content": "string" } ],',
        '    "signals": { "key": "value" },',
        '    "issues": [ { "severity": "non_blocking", "type": "workload_issue", "summary": "text" } ]',
        '  },',
        '  "report": "human-readable report text",',
        '  "effects": [],',
        '  "signals": { "key": "value" },',
        '  "issues": [ { "severity": "non_blocking", "type": "workload_issue", "summary": "text" } ],',
        '  "artifacts": [ { "path": "string", "content": "string" } ],',
        '  "memoryCandidates": [ { "content": "string", "kind": "fact", "source": "artifact|effect|signal|workflow_state", "scope": "ide|workspace|project|workflow|run|agent" } ]',
        '}',
        "Allowed paths: ".concat(expectedOutputs.join(', '), ".")
    ].join('\n');
}
function buildContractExpectedOutputFormat(expectedOutputs) {
    return [
        'Return exactly JSON in the workload-output envelope shape, and include a complete Flow Contract Package.',
        'The artifacts array must include content for every allowed path that applies:',
        expectedOutputs.map(function (output) { return "- ".concat(output); }).join('\n'),
        '',
        'contracts/contracts.json content must validate against flow-kernel/schemas/contracts.schema.json with schemaVersion "flow.contracts/v1".',
        'contracts/shared.md must be the human-readable frozen shared contract.',
        'contracts/work-orders/*.md must be role-specific work orders derived from contracts.json workOrders.',
        'schemas/api.json and schemas/assets.json must contain JSON Schema documents used by QA to validate delivery outputs.',
        '',
        'Use this top-level shape:',
        '{',
        '  "result": { "status": "completed", "summary": "contract package ready", "artifacts": [ { "path": "contracts/contracts.json", "content": "{...}" } ], "signals": { "contract.status": "ready" }, "issues": [] },',
        '  "report": "short summary",',
        '  "artifacts": [ { "path": "contracts/shared.md", "content": "# Shared Contract..." }, { "path": "contracts/contracts.json", "content": "{...}" } ],',
        '  "signals": { "contract.status": "ready" },',
        '  "issues": []',
        '}'
    ].join('\n');
}
function writeAgentOutputs(workloadDir_1, expectedOutputs_1, generatedArtifacts_2) {
    return __awaiter(this, arguments, void 0, function (workloadDir, expectedOutputs, generatedArtifacts, fallbackContentByPath) {
        var outputDir, outputs, generatedByPath, _i, generatedArtifacts_3, artifact, key, produced, _a, outputs_1, output, key, content, artifactPath, _b, _c, _loop_1, _d, _e, _f, generatedPath, content;
        var _g, _h, _j;
        if (fallbackContentByPath === void 0) { fallbackContentByPath = {}; }
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0:
                    outputDir = path.join(workloadDir, 'output', 'artifacts');
                    outputs = expectedOutputs.length ? expectedOutputs : ['report.md'];
                    generatedByPath = new Map();
                    for (_i = 0, generatedArtifacts_3 = generatedArtifacts; _i < generatedArtifacts_3.length; _i++) {
                        artifact = generatedArtifacts_3[_i];
                        key = normalizeArtifactPath(artifact.path);
                        generatedByPath.set(key, artifact.content || '');
                        generatedByPath.set(normalizeArtifactPath("./".concat(artifact.path)), artifact.content || '');
                    }
                    produced = [];
                    _a = 0, outputs_1 = outputs;
                    _k.label = 1;
                case 1:
                    if (!(_a < outputs_1.length)) return [3 /*break*/, 4];
                    output = outputs_1[_a];
                    key = normalizeArtifactPath(output);
                    content = (_j = (_h = (_g = generatedByPath.get(key)) !== null && _g !== void 0 ? _g : generatedByPath.get(normalizeArtifactPath("./".concat(output)))) !== null && _h !== void 0 ? _h : fallbackContentByPath[key]) !== null && _j !== void 0 ? _j : defaultOutputPlaceholder(output);
                    artifactPath = path.join.apply(path, __spreadArray([outputDir], safeArtifactPathParts(output), false));
                    _c = (_b = produced).push;
                    return [4 /*yield*/, writeOutputFile(artifactPath, content)];
                case 2:
                    _c.apply(_b, [_k.sent()]);
                    _k.label = 3;
                case 3:
                    _a++;
                    return [3 /*break*/, 1];
                case 4:
                    _loop_1 = function (generatedPath, content) {
                        var artifactPath, _l, _m;
                        return __generator(this, function (_o) {
                            switch (_o.label) {
                                case 0:
                                    if (!!outputs.some(function (output) { return normalizeArtifactPath(output) === generatedPath; })) return [3 /*break*/, 2];
                                    artifactPath = path.join.apply(path, __spreadArray([outputDir], safeArtifactPathParts(denormalizeArtifactPath(generatedPath)), false));
                                    _m = (_l = produced).push;
                                    return [4 /*yield*/, writeOutputFile(artifactPath, content)];
                                case 1:
                                    _m.apply(_l, [_o.sent()]);
                                    _o.label = 2;
                                case 2: return [2 /*return*/];
                            }
                        });
                    };
                    _d = 0, _e = generatedByPath.entries();
                    _k.label = 5;
                case 5:
                    if (!(_d < _e.length)) return [3 /*break*/, 8];
                    _f = _e[_d], generatedPath = _f[0], content = _f[1];
                    return [5 /*yield**/, _loop_1(generatedPath, content)];
                case 6:
                    _k.sent();
                    _k.label = 7;
                case 7:
                    _d++;
                    return [3 /*break*/, 5];
                case 8: return [2 /*return*/, uniqueStrings(produced)];
            }
        });
    });
}
function writeOutputFile(filePath, content) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.mkdir(path.dirname(filePath), { recursive: true })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, fs.writeFile(filePath, normalizeText(content), 'utf8')];
                case 2:
                    _a.sent();
                    return [2 /*return*/, file_uri_1.FileUri.create(filePath).toString()];
            }
        });
    });
}
function defaultOutputPlaceholder(output) {
    return [
        "# ".concat(output),
        '',
        'No output was returned by the provider for this artifact.',
        "Path: ".concat(output)
    ].join('\n');
}
function parseProviderTimeoutMs() {
    var configured = process.env.FLOW_AGENT_TIMEOUT_MS || process.env.FLOW_AGENT_LLM_TIMEOUT_MS;
    var parsed = Number.parseInt(configured || '', 10);
    if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
    }
    return 120000;
}
function findInputArtifactPath(run, requestedPath) {
    var normalizedRequested = normalizeArtifactPath(requestedPath);
    for (var _i = 0, _a = run.artifacts; _i < _a.length; _i++) {
        var artifact = _a[_i];
        var artifactUri = artifactPathFromUri(artifact.uri);
        if (!artifactUri) {
            continue;
        }
        var normalizedUri = normalizeArtifactPath(artifactUri);
        if (normalizedUri === normalizeArtifactPath(artifact.summary || '') || normalizedUri.endsWith("/".concat(normalizedRequested))) {
            return artifactUri;
        }
    }
    return undefined;
}
function artifactPathFromUri(uri) {
    if (!uri) {
        return undefined;
    }
    if (uri.startsWith('file://')) {
        try {
            return file_uri_1.FileUri.fsPath(uri);
        }
        catch (_a) {
            return undefined;
        }
    }
    return path.isAbsolute(uri) ? uri : undefined;
}
function readTextFile(file) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fs.readFile(file, 'utf8')];
                case 1: return [2 /*return*/, _b.sent()];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, undefined];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function parseCommandLine(value) {
    var trimmed = value.trim();
    if (!trimmed) {
        return [];
    }
    if (trimmed.startsWith('[')) {
        try {
            var parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed.map(String).filter(Boolean);
            }
        }
        catch (_a) {
            // fall back to shell-like split
        }
    }
    return shellSplit(trimmed);
}
function shellSplit(value) {
    var tokens = [];
    var token = '';
    var quote;
    for (var i = 0; i < value.length; i++) {
        var char = value[i];
        if ((char === '"' || char === '\'') && quote === undefined) {
            quote = char;
            continue;
        }
        if (char === quote) {
            quote = undefined;
            continue;
        }
        if (char === '\\' && i + 1 < value.length && quote !== '\'') {
            token += value[i + 1];
            i++;
            continue;
        }
        if (/\s/.test(char) && quote === undefined) {
            if (token) {
                tokens.push(token);
                token = '';
            }
            continue;
        }
        token += char;
    }
    if (token) {
        tokens.push(token);
    }
    return tokens;
}
function upsertArtifact(artifacts, artifact) {
    var index = artifacts.findIndex(function (item) { return item.id === artifact.id; });
    if (index === -1) {
        artifacts.push(artifact);
        return;
    }
    artifacts[index] = artifact;
}
function registerFileEffectAudit(run, workload, effect) {
    var artifactId = stableId('artifact', run.id, workload.id, effect.id, effect.status);
    var artifactUri = "flow://".concat(run.id, "/").concat(workload.stateId, "/effects/").concat(effect.id, "-").concat(effect.status, ".diff");
    upsertArtifact(run.artifacts, {
        id: artifactId,
        runId: run.id,
        stateId: workload.stateId,
        uri: artifactUri,
        kind: 'patch',
        summary: "File effect ".concat(effect.status, ": ").concat(effect.path || effect.summary),
        createdAt: timestamp()
    });
    addUnique(workload.outputArtifacts, artifactUri);
    pushEvent(run, {
        type: fileEffectEventType(effect.status),
        stateId: workload.stateId,
        workloadId: workload.id,
        message: "File effect ".concat(effect.status, " for \"").concat(effect.path || workload.stateId, "\"."),
        payload: {
            effectId: effect.id,
            effectType: effect.type,
            path: effect.path,
            status: effect.status,
            artifactId: artifactId,
            artifactUri: artifactUri,
            hashBefore: effect.hashBefore,
            hashAfter: effect.hashAfter,
            patch: effect.patch,
            reason: effect.reason,
            approvalPolicy: effect.approvalPolicy
        }
    });
}
function registerCommandEffectAudit(run, workload, effect) {
    var artifactId = stableId('artifact', run.id, workload.id, effect.id, effect.status);
    var artifactUri = "flow://".concat(run.id, "/").concat(workload.stateId, "/effects/").concat(effect.id, "-").concat(effect.status, ".json");
    upsertArtifact(run.artifacts, {
        id: artifactId,
        runId: run.id,
        stateId: workload.stateId,
        uri: artifactUri,
        kind: 'log',
        summary: "Command effect ".concat(effect.status, ": ").concat(effect.command || effect.summary),
        createdAt: timestamp()
    });
    addUnique(workload.outputArtifacts, artifactUri);
    pushEvent(run, {
        type: commandEffectEventType(effect.status),
        stateId: workload.stateId,
        workloadId: workload.id,
        message: "Command effect ".concat(effect.status, " for \"").concat(workload.stateId, "\"."),
        payload: {
            effectId: effect.id,
            effectType: effect.type,
            command: effect.command,
            cwd: effect.cwd,
            timeoutMs: effect.timeoutMs,
            exitCode: effect.exitCode,
            timedOut: effect.timedOut,
            status: effect.status,
            artifactId: artifactId,
            artifactUri: artifactUri,
            approvalPolicy: effect.approvalPolicy,
            stdout: effect.stdout,
            stderr: effect.stderr
        }
    });
}
function registerImageEffectAudit(run, workload, effect, result) {
    var artifactId = stableId('artifact', run.id, workload.id, effect.id, result.artifactPath);
    var artifactUri = result.uri || "flow://".concat(run.id, "/").concat(workload.stateId, "/effects/").concat(effect.id, "-").concat(effect.status, ".json");
    upsertArtifact(run.artifacts, {
        id: artifactId,
        runId: run.id,
        stateId: workload.stateId,
        uri: artifactUri,
        kind: 'other',
        summary: result.applied ? "Image effect applied: ".concat(result.artifactPath) : "Image effect ".concat(result.status, ": ").concat(effect.summary),
        createdAt: timestamp()
    });
    addUnique(workload.outputArtifacts, artifactUri);
    pushEvent(run, {
        type: result.status === 'applied' ? 'effect.applied' : result.status === 'proposed' ? 'effect.proposed' : 'effect.failed',
        stateId: workload.stateId,
        workloadId: workload.id,
        message: "Image effect ".concat(result.status, " for \"").concat(workload.stateId, "\"."),
        payload: {
            effectId: effect.id,
            effectType: effect.type,
            status: result.status,
            provider: result.provider,
            artifactId: artifactId,
            artifactUri: artifactUri,
            artifactPath: result.artifactPath,
            mimeType: result.mimeType,
            bytes: result.bytes,
            reason: result.reason
        }
    });
}
function registerGenericEffectAudit(run, workload, effect) {
    pushEvent(run, {
        type: genericEffectEventType(effect.status),
        stateId: workload.stateId,
        workloadId: workload.id,
        message: "Effect ".concat(effect.status, " for \"").concat(workload.stateId, "\"."),
        payload: {
            effectId: effect.id,
            effectType: effect.type,
            kind: effect.kind,
            path: effect.path,
            command: effect.command,
            status: effect.status,
            summary: effect.summary,
            approvalPolicy: effect.approvalPolicy
        }
    });
}
function fileEffectEventType(status) {
    switch (status) {
        case 'approved':
            return 'effect.approved';
        case 'applied':
            return 'effect.applied';
        case 'rejected':
            return 'effect.rejected';
        case 'blocked':
            return 'effect.blocked';
        case 'failed':
            return 'effect.failed';
        case 'proposed':
        default:
            return 'effect.proposed';
    }
}
function genericEffectEventType(status) {
    switch (status) {
        case 'applied':
            return 'effect.applied';
        case 'approved':
            return 'effect.approved';
        case 'rejected':
            return 'effect.rejected';
        case 'blocked':
            return 'effect.blocked';
        case 'failed':
            return 'effect.failed';
        case 'proposed':
        default:
            return 'effect.proposed';
    }
}
function commandEffectEventType(status) {
    switch (status) {
        case 'applied':
            return 'effect.applied';
        case 'approved':
            return 'effect.approved';
        case 'rejected':
            return 'effect.rejected';
        case 'blocked':
        case 'failed':
            return 'effect.failed';
        case 'proposed':
        default:
            return 'effect.proposed';
    }
}
function isFileEffectType(type) {
    return type === 'file.created' || type === 'file.edited' || type === 'file.deleted';
}
function isCommandEffectType(type, command) {
    return type === 'command' || type === 'command.execute' || type === 'command.executed' || Boolean(command);
}
function isImageEffectType(type) {
    var normalized = type.toLowerCase();
    return normalized === 'image.generate' || normalized === 'image.generated' || normalized === 'image';
}
function artifactKindFromPath(value) {
    var normalized = value.replace(/\\/g, '/').toLowerCase();
    if (normalized.includes('work_order') || normalized.includes('work-order')) {
        return 'work_order';
    }
    if (normalized.includes('contract')) {
        return 'contract';
    }
    if (normalized.includes('report')) {
        return 'report';
    }
    if (normalized.endsWith('.md')) {
        return 'report';
    }
    if (normalized.endsWith('.patch') || normalized.endsWith('.diff')) {
        return 'patch';
    }
    if (normalized.endsWith('.log') || normalized.endsWith('.txt')) {
        return 'log';
    }
    return 'other';
}
function normalizeText(value) {
    return value.endsWith('\n') ? value : "".concat(value, "\n");
}
function normalizeArtifactPath(value) {
    return value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/').replace(/^\/+/, '');
}
function denormalizeArtifactPath(value) {
    return value.split('/').filter(Boolean).join(path.sep);
}
function safeArtifactPathParts(value) {
    return (0, flow_path_policy_1.splitFlowRelativePath)(value).map(function (segment) { return sanitizeFileName(segment); });
}
function sanitizeFileName(value) {
    return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}
function uniqueStrings(values) {
    var byValue = new Set();
    var result = [];
    for (var _i = 0, values_1 = values; _i < values_1.length; _i++) {
        var value = values_1[_i];
        if (byValue.has(value)) {
            continue;
        }
        byValue.add(value);
        result.push(value);
    }
    return result;
}
function boundedInteger(value, min, max, fallback) {
    var parsed = typeof value === 'number' ? value : Number.parseInt(toTrimmedString(value), 10);
    if (!Number.isFinite(parsed)) {
        return Math.max(min, Math.min(max, fallback));
    }
    return Math.max(min, Math.min(max, Math.floor(parsed)));
}
function mapWithConcurrency(items, concurrency, run) {
    return __awaiter(this, void 0, void 0, function () {
        var results, cursor, worker;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    results = [];
                    cursor = 0;
                    worker = function () { return __awaiter(_this, void 0, void 0, function () {
                        var index, _a, _b;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    index = cursor;
                                    cursor += 1;
                                    if (index >= items.length) {
                                        return [2 /*return*/];
                                    }
                                    _a = results;
                                    _b = index;
                                    return [4 /*yield*/, run(items[index])];
                                case 1:
                                    _a[_b] = _c.sent();
                                    _c.label = 2;
                                case 2: return [3 /*break*/, 0];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); };
                    return [4 /*yield*/, Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, function () { return worker(); }))];
                case 1:
                    _a.sent();
                    return [2 /*return*/, results];
            }
        });
    });
}
function dynamicParallelFailed(results, failurePolicy, failureThreshold) {
    var failures = results.filter(function (result) { return result.failed; }).length;
    if (failures === 0) {
        return false;
    }
    var policy = toTrimmedString(failurePolicy) || 'best_effort';
    if (policy === 'fail_fast') {
        return true;
    }
    if (policy === 'threshold') {
        var threshold = typeof failureThreshold === 'number' ? failureThreshold : Number.parseFloat(toTrimmedString(failureThreshold));
        if (Number.isFinite(threshold)) {
            if (threshold > 0 && threshold < 1) {
                return failures / Math.max(1, results.length) > threshold;
            }
            return failures > Math.floor(threshold);
        }
    }
    return failures >= results.length;
}
function primitiveResultSummary(result) {
    return {
        stateId: result.stateId,
        workloadId: result.workloadId,
        status: result.failed ? 'failed' : 'completed',
        metadata: result.metadata,
        artifacts: result.artifacts.map(function (artifact) { return ({
            id: artifact.id,
            path: artifact.summary || artifact.uri,
            uri: artifact.uri,
            kind: artifact.kind
        }); }),
        effects: result.effects.map(function (effect) { return ({
            id: effect.id,
            type: effect.type || effect.kind,
            status: effect.status,
            summary: effect.summary
        }); }),
        signals: result.signals.map(function (signal) { return ({
            key: signal.key,
            value: signal.value
        }); }),
        issues: result.issues
    };
}
function primitiveIssues(results) {
    return uniqueStrings(results.flatMap(function (result) { return result.issues.map(function (issue) { return "".concat(result.stateId, ": ").concat(issue); }); }));
}
function primitiveOutputEnvelope(context, status, artifactPath, payload) {
    var _a, _b;
    var summary = "".concat(context.state.type, " ").concat(status, " for ").concat(context.workload.stateId, ".");
    var artifact = {
        id: stableId('artifact', context.run.id, context.workload.id, artifactPath),
        path: artifactPath,
        type: artifactKindFromPath(artifactPath)
    };
    var issues = context.workload.issues.map(function (summaryText) { return ({
        severity: status === 'failed' ? 'blocking' : 'non_blocking',
        type: 'primitive_issue',
        summary: summaryText
    }); });
    return {
        status: status,
        result: {
            status: status,
            summary: summary,
            artifacts: [artifact],
            signals: (_a = {},
                _a["".concat(context.workload.stateId, ".status")] = status,
                _a),
            issues: issues
        },
        artifacts: [artifact],
        effects: [],
        signals: (_b = {},
            _b["".concat(context.workload.stateId, ".status")] = status,
            _b),
        issues: issues,
        report: JSON.stringify(payload, undefined, 2)
    };
}
function primitiveItemsFromText(content, source) {
    var text = (content || '').trim();
    if (!text) {
        return [];
    }
    var parsed = parseJsonValue(text);
    if (Array.isArray(parsed)) {
        return parsed;
    }
    if (isRecord(parsed)) {
        for (var _i = 0, _a = ['items', 'candidates', 'tasks', 'files', 'results']; _i < _a.length; _i++) {
            var key = _a[_i];
            var value = parsed[key];
            if (Array.isArray(value)) {
                return value;
            }
        }
        return [parsed];
    }
    var lines = text
        .split(/\r?\n/)
        .map(function (line) { return line.trim().replace(/^[-*]\s+/, '').replace(/^\d+[.)]\s+/, ''); })
        .filter(function (line) { return line && !line.startsWith('#'); });
    if (lines.length > 1) {
        return lines;
    }
    return [{ source: source, content: text }];
}
function parseJsonValue(text) {
    try {
        return JSON.parse(text);
    }
    catch (_a) {
        var match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (match === null || match === void 0 ? void 0 : match[1]) {
            try {
                return JSON.parse(match[1].trim());
            }
            catch (_b) {
                return undefined;
            }
        }
        return undefined;
    }
}
function findPrimitiveSourceArtifacts(run, source) {
    var normalizedSource = normalizeArtifactPath(source).toLowerCase();
    if (!normalizedSource) {
        return [];
    }
    return run.artifacts.filter(function (artifact) {
        var summary = normalizeArtifactPath(artifact.summary || '').toLowerCase();
        var uri = normalizeArtifactPath(artifact.uri || '').toLowerCase();
        return summary === normalizedSource
            || summary.endsWith("/".concat(normalizedSource))
            || uri.endsWith("/".concat(normalizedSource))
            || summary.startsWith("".concat(normalizedSource.replace(/\/?$/, '/')))
            || uri.includes("/".concat(normalizedSource.replace(/\/?$/, '/')));
    });
}
function errorToMessage(error) {
    if (error instanceof Error) {
        return error.message || 'Agent execution failed.';
    }
    var fallback = String(error);
    return fallback || 'Agent execution failed.';
}
function parseRetryMax(max) {
    var parsed = Number.parseInt(String(max !== null && max !== void 0 ? max : ''), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 0;
    }
    return Math.floor(parsed);
}
function stableId(prefix) {
    var parts = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        parts[_i - 1] = arguments[_i];
    }
    return "".concat(prefix, "-").concat(parts.join('-').replace(/[^a-zA-Z0-9._-]/g, '_'));
}
function addUnique(values, value) {
    if (!values.includes(value)) {
        values.push(value);
    }
}
function selectApprovedMemoryCandidates(context) {
    var configuredIds = parseStringArray(context.state.candidateIds || context.state.memoryCandidateIds);
    var allowedIds = configuredIds.length > 0 ? new Set(configuredIds) : undefined;
    return (context.run.memoryCandidates || []).filter(function (candidate) {
        return candidate.status === 'approved'
            && (!allowedIds || allowedIds.has(candidate.id));
    });
}
function buildMemoryWrite(context, candidate, status, error) {
    var scope = normalizeMemoryScope(context.state.scope) || candidate.scope;
    var target = toTrimmedString(context.state.target)
        || toTrimmedString(context.state.memoryTarget)
        || defaultMemoryTarget(context, scope);
    return {
        id: stableId('memory-write', context.run.id, candidate.id),
        runId: context.run.id,
        candidateId: candidate.id,
        status: status,
        content: candidate.content,
        approvedAt: timestamp(),
        approvedBy: toTrimmedString(context.state.approvedBy) || 'flow-workload',
        scope: scope,
        target: target,
        error: error
    };
}
function defaultMemoryTarget(context, scope) {
    if (scope === 'workflow') {
        return context.workflow.id;
    }
    if (scope === 'run') {
        return context.run.id;
    }
    if (scope === 'agent') {
        return context.workload.agent || toTrimmedString(context.state.agent);
    }
    return undefined;
}
function normalizeMemoryScope(value) {
    var scope = toTrimmedString(value);
    if (scope === 'ide'
        || scope === 'workspace'
        || scope === 'project'
        || scope === 'workflow'
        || scope === 'run'
        || scope === 'agent') {
        return scope;
    }
    return undefined;
}
function upsertMemoryWrite(existing, write) {
    if (existing === void 0) { existing = []; }
    var byId = new Map(existing.map(function (item) { return [item.id, item]; }));
    byId.set(write.id, write);
    return __spreadArray([], byId.values(), true);
}
function pushMemoryWriteEvent(run, candidate, memoryWrite, status, workloadId) {
    var messages = {
        approved: "Memory candidate \"".concat(candidate.id, "\" approved for explicit write."),
        written: "Memory candidate \"".concat(candidate.id, "\" written to Memory memory."),
        failed: "Memory candidate \"".concat(candidate.id, "\" could not be written.")
    };
    pushEvent(run, {
        type: "memory_write.".concat(status),
        stateId: candidate.stateId,
        workloadId: workloadId,
        message: messages[status],
        payload: {
            candidateId: candidate.id,
            memoryWriteId: memoryWrite.id,
            scope: memoryWrite.scope,
            target: memoryWrite.target,
            status: status,
            error: memoryWrite.error,
            memoryWrite: memoryWrite
        }
    });
}
function pushEvent(run, event) {
    run.events.push(__assign(__assign({}, event), { payload: event.payload ? (0, common_2.limitFlowJsonValue)(event.payload, common_2.FlowSizeLimits.eventPayloadBytes, 'event payload') : undefined, id: (0, common_1.generateUuid)(), runId: run.id, timestamp: timestamp() }));
}
function timestamp() {
    return new Date().toISOString();
}
