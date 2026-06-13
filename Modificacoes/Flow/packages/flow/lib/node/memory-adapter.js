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
exports.LocalMemoryAdapter = exports.MemoryAdapter = void 0;
var uri_1 = require("@theia/core/lib/common/uri");
var inversify_1 = require("@theia/core/shared/inversify");
var common_1 = require("@cybervinci/memory/lib/common");
var common_2 = require("../common");
exports.MemoryAdapter = Symbol('MemoryAdapter');
var LocalMemoryAdapter = function () {
    var _classDecorators = [(0, inversify_1.injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _memoryService_decorators;
    var _memoryService_initializers = [];
    var _memoryService_extraInitializers = [];
    var LocalMemoryAdapter = _classThis = /** @class */ (function () {
        function LocalMemoryAdapter_1() {
            this.memoryService = __runInitializers(this, _memoryService_initializers, void 0);
            __runInitializers(this, _memoryService_extraInitializers);
        }
        LocalMemoryAdapter_1.prototype.report = function () {
            return __awaiter(this, void 0, void 0, function () {
                var configuredProvider, provider;
                return __generator(this, function (_a) {
                    configuredProvider = configuredMemoryProvider();
                    if (mockMemoryEnabled()) {
                        return [2 /*return*/, {
                                provider: 'external',
                                available: true,
                                detail: 'Memory is provided by the Flow E2E mock adapter.'
                            }];
                    }
                    if (configuredProvider === 'missing') {
                        return [2 /*return*/, {
                                provider: 'missing',
                                available: false,
                                missingService: 'Memory provider is explicitly disabled for Flow.'
                            }];
                    }
                    if (this.memoryService) {
                        provider = configuredProvider || memoryProviderKind(this.memoryService);
                        return [2 /*return*/, {
                                provider: provider,
                                available: true,
                                detail: provider === 'external'
                                    ? 'Memory is provided by an external host adapter.'
                                    : 'Memory is provided by the local CyberVinci service.'
                            }];
                    }
                    return [2 /*return*/, {
                            provider: 'missing',
                            available: false,
                            missingService: 'Memory service is not bound in Flow yet.'
                        }];
                });
            });
        };
        LocalMemoryAdapter_1.prototype.buildContextPack = function (workspaceRootUri, workflow, workload) {
            return __awaiter(this, void 0, void 0, function () {
                var report, agentIds, referencedFiles, fallbackEnabled, workspacePath, prompt_1, retrievalResults, contextPack, dashboard, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.report()];
                        case 1:
                            report = _a.sent();
                            agentIds = collectRelevantAgentIds(workflow, workload);
                            referencedFiles = collectReferencedFiles(workflow, workload);
                            fallbackEnabled = explicitMemoryFallbackEnabled();
                            if (mockMemoryEnabled()) {
                                return [2 /*return*/, limitContextPack({
                                        workspaceRootUri: workspaceRootUri,
                                        summary: "Mock Memory context pack for workflow \"".concat(workflow.name, "\"."),
                                        workflow: {
                                            id: workflow.id,
                                            name: workflow.name,
                                            stateCount: Object.keys(workflow.states).length,
                                            transitionCount: workflow.transitions.length,
                                            agentIds: agentIds
                                        },
                                        files: referencedFiles.map(function (uri) { return ({ uri: uri, reason: 'Referenced by workflow and exposed through the E2E mock adapter.' }); }),
                                        symbols: ['MockMemory.MemoryWrite'],
                                        signals: [{ key: 'memory.mock', value: true }],
                                        sections: [{
                                                id: 'mock_memory',
                                                title: 'Mock Memory',
                                                items: [{
                                                        title: 'E2E memory write provider',
                                                        content: 'Approved Flow memory candidates are accepted by the mock Memory adapter.',
                                                        source: 'flow.e2e-mock'
                                                    }]
                                            }]
                                    })];
                            }
                            if (!(this.memoryService && workspaceRootUri)) return [3 /*break*/, 7];
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 6, , 7]);
                            workspacePath = workspacePathFromUri(workspaceRootUri);
                            prompt_1 = contextPrompt(workflow, workload);
                            return [4 /*yield*/, this.memoryService.search({
                                    workspacePath: workspacePath,
                                    text: prompt_1,
                                    limit: workload ? 5 : 8,
                                    sourceKinds: ['code', 'code-graph', 'project-memory', 'repository-memory', 'skill', 'local-docs']
                                })];
                        case 3:
                            retrievalResults = _a.sent();
                            return [4 /*yield*/, this.memoryService.buildContextPack({
                                    workspacePath: workspacePath,
                                    prompt: prompt_1,
                                    retrievalResults: retrievalResults,
                                    tokenBudget: workload ? 2500 : 6000
                                })];
                        case 4:
                            contextPack = _a.sent();
                            return [4 /*yield*/, this.safeDashboard(workspacePath)];
                        case 5:
                            dashboard = _a.sent();
                            return [2 /*return*/, this.toFlowContextPack(workspaceRootUri, workflow, agentIds, referencedFiles, retrievalResults, contextPack, dashboard, workload)];
                        case 6:
                            error_1 = _a.sent();
                            if (!fallbackEnabled) {
                                throw new Error("Memory context failed and local fallback is not explicitly enabled: ".concat(errorMessage(error_1)));
                            }
                            return [2 /*return*/, this.buildFallbackContextPack(workspaceRootUri, workflow, workload, agentIds, referencedFiles, "Memory context failed: ".concat(errorMessage(error_1)))];
                        case 7:
                            if (!fallbackEnabled) {
                                throw new Error(report.missingService || 'Memory provider is not available and local fallback is not explicitly enabled.');
                            }
                            return [2 /*return*/, this.buildFallbackContextPack(workspaceRootUri, workflow, workload, agentIds, referencedFiles, report.missingService)];
                    }
                });
            });
        };
        LocalMemoryAdapter_1.prototype.buildFallbackContextPack = function (workspaceRootUri, workflow, workload, agentIds, referencedFiles, missingService) {
            return limitContextPack({
                workspaceRootUri: workspaceRootUri,
                summary: [
                    "Workflow \"".concat(workflow.name, "\" (").concat(workflow.id, ") has ").concat(Object.keys(workflow.states).length, " states"),
                    "".concat(workflow.transitions.length, " transitions"),
                    agentIds.length > 0 ? "".concat(agentIds.length, " agents") : 'no declared agents',
                    workload ? "focused on workload \"".concat(workload.id, "\" for state \"").concat(workload.stateId, "\"") : undefined
                ].filter(Boolean).join(', ') + '.',
                workflow: {
                    id: workflow.id,
                    name: workflow.name,
                    stateCount: Object.keys(workflow.states).length,
                    transitionCount: workflow.transitions.length,
                    agentIds: agentIds
                },
                files: referencedFiles.map(function (uri) { return ({ uri: uri, reason: 'Referenced by workflow input, output, or agent declaration.' }); }),
                symbols: [],
                signals: [],
                sections: [],
                missingService: missingService
            });
        };
        LocalMemoryAdapter_1.prototype.safeDashboard = function (workspacePath) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!((_b = this.memoryService) === null || _b === void 0 ? void 0 : _b.getDashboard)) {
                                return [2 /*return*/, undefined];
                            }
                            _c.label = 1;
                        case 1:
                            _c.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.memoryService.getDashboard(workspacePath)];
                        case 2: return [2 /*return*/, _c.sent()];
                        case 3:
                            _a = _c.sent();
                            return [2 /*return*/, undefined];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        LocalMemoryAdapter_1.prototype.collectMemoryCandidates = function (run) {
            return __awaiter(this, void 0, void 0, function () {
                var candidates, _i, _a, effect, _b, _c, signal, _d, _e, artifact, summary;
                return __generator(this, function (_f) {
                    candidates = new Map();
                    for (_i = 0, _a = run.effects; _i < _a.length; _i++) {
                        effect = _a[_i];
                        if (effect.kind === 'memory_write') {
                            candidates.set("effect:".concat(effect.id), {
                                id: "memory-candidate-".concat(effect.id),
                                runId: run.id,
                                stateId: effect.stateId,
                                source: 'effect',
                                kind: 'summary',
                                content: effect.summary,
                                reason: 'A workflow step proposed a memory_write effect.',
                                confidence: 0.8,
                                status: 'candidate',
                                createdAt: timestamp()
                            });
                        }
                    }
                    for (_b = 0, _c = run.signals; _b < _c.length; _b++) {
                        signal = _c[_b];
                        if (signal.key.includes('memory') && typeof signal.value === 'string') {
                            candidates.set("signal:".concat(signal.key, ":").concat(signal.stateId || ''), {
                                id: stableId('memory-candidate', run.id, signal.key, signal.stateId || 'run'),
                                runId: run.id,
                                stateId: signal.stateId,
                                source: 'signal',
                                kind: 'fact',
                                content: signal.value,
                                reason: "Signal \"".concat(signal.key, "\" was marked as memory-related."),
                                confidence: 0.7,
                                status: 'candidate',
                                createdAt: signal.createdAt
                            });
                        }
                    }
                    for (_d = 0, _e = run.artifacts; _d < _e.length; _d++) {
                        artifact = _e[_d];
                        summary = artifact.summary || '';
                        if (!summary || !artifactLooksMemoryRelated(artifact.uri, summary)) {
                            continue;
                        }
                        candidates.set("artifact:".concat(artifact.id), {
                            id: stableId('memory-candidate', run.id, artifact.id),
                            runId: run.id,
                            stateId: artifact.stateId,
                            source: 'artifact',
                            kind: 'summary',
                            content: summary,
                            reason: "Artifact \"".concat(artifact.uri, "\" was marked as memory-related."),
                            confidence: 0.65,
                            status: 'candidate',
                            createdAt: artifact.createdAt
                        });
                    }
                    return [2 /*return*/, __spreadArray([], candidates.values(), true)];
                });
            });
        };
        LocalMemoryAdapter_1.prototype.writeApprovedMemory = function (memoryWrite, workspaceRootUri) {
            return __awaiter(this, void 0, void 0, function () {
                var invalidApproval, report, workspacePath, scopeTarget, error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            invalidApproval = validateExplicitMemoryApproval(memoryWrite);
                            if (invalidApproval) {
                                return [2 /*return*/, __assign(__assign({}, memoryWrite), { status: 'failed', error: invalidApproval })];
                            }
                            if (mockMemoryEnabled()) {
                                return [2 /*return*/, __assign(__assign({}, memoryWrite), { status: 'written' })];
                            }
                            return [4 /*yield*/, this.report()];
                        case 1:
                            report = _a.sent();
                            if (!report.available) {
                                return [2 /*return*/, __assign(__assign({}, memoryWrite), { status: 'failed', error: report.missingService })];
                            }
                            if (!this.memoryService) {
                                return [2 /*return*/, __assign(__assign({}, memoryWrite), { status: 'failed', error: 'Memory service is not available.' })];
                            }
                            if (!workspaceRootUri) {
                                return [2 /*return*/, __assign(__assign({}, memoryWrite), { status: 'failed', error: 'Workspace root is required to write Memory memory.' })];
                            }
                            workspacePath = workspacePathFromUri(workspaceRootUri);
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            scopeTarget = resolveMemoryScope(memoryWrite, workspacePath);
                            return [4 /*yield*/, this.memoryService.addMemory(__assign(__assign({}, scopeTarget), { memoryType: 'manual_note', title: memoryTitle(memoryWrite.content), content: memoryWrite.content, importance: 'medium', source: 'flow', evidence: "Flow memory write ".concat(memoryWrite.id, " from run ").concat(memoryWrite.runId, ".") }))];
                        case 3:
                            _a.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            error_2 = _a.sent();
                            return [2 /*return*/, __assign(__assign({}, memoryWrite), { status: 'failed', error: errorMessage(error_2) })];
                        case 5: return [2 /*return*/, __assign(__assign({}, memoryWrite), { status: 'written' })];
                    }
                });
            });
        };
        LocalMemoryAdapter_1.prototype.toFlowContextPack = function (workspaceRootUri, workflow, agentIds, referencedFiles, retrievalResults, contextPack, dashboard, workload) {
            var focusedDashboard = workload ? focusDashboardForWorkload(dashboard, referencedFiles, retrievalResults) : dashboard;
            var sections = buildRealContextSections(contextPack, retrievalResults, focusedDashboard, Boolean(workload));
            return limitContextPack({
                workspaceRootUri: workspaceRootUri,
                summary: sections.length > 0
                    ? "Memory context pack with ".concat(sections.length, " sections, ").concat(contextPack.sections.length, " retrieval sections, and ").concat(contextPack.estimatedTokens, " estimated tokens.")
                    : "Memory returned an empty context pack for workflow \"".concat(workflow.name, "\"."),
                workflow: {
                    id: workflow.id,
                    name: workflow.name,
                    stateCount: Object.keys(workflow.states).length,
                    transitionCount: workflow.transitions.length,
                    agentIds: agentIds
                },
                files: mergeContextFiles(referencedFiles.map(function (uri) { return ({ uri: uri, reason: 'Referenced by workflow input, output, or agent declaration.' }); }), retrievalResults
                    .filter(function (result) { return !!result.uri; })
                    .map(function (result) { return ({ uri: result.uri, reason: "Memory ".concat(result.sourceKind, ": ").concat(result.title) }); }), ((focusedDashboard === null || focusedDashboard === void 0 ? void 0 : focusedDashboard.files) || [])
                    .slice(0, workload ? 6 : 12)
                    .map(function (file) { return ({ uri: contextFilePath(file), reason: contextFileReason(file) }); })),
                symbols: mergeStrings(contextPack.citations.map(function (citation) { return citation.title; }), ((focusedDashboard === null || focusedDashboard === void 0 ? void 0 : focusedDashboard.symbols) || []).slice(0, workload ? 8 : 24).map(function (symbol) { return symbol.fullName || symbol.name; })),
                signals: __spreadArray(__spreadArray([], contextPack.sections.map(function (section) { return ({
                    key: "memory.context.".concat(section.id),
                    value: section.title
                }); }), true), buildContextSignals(focusedDashboard, retrievalResults), true),
                sections: sections
            });
        };
        return LocalMemoryAdapter_1;
    }());
    __setFunctionName(_classThis, "LocalMemoryAdapter");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _memoryService_decorators = [(0, inversify_1.inject)(common_1.MemoryService), (0, inversify_1.optional)()];
        __esDecorate(null, null, _memoryService_decorators, { kind: "field", name: "memoryService", static: false, private: false, access: { has: function (obj) { return "memoryService" in obj; }, get: function (obj) { return obj.memoryService; }, set: function (obj, value) { obj.memoryService = value; } }, metadata: _metadata }, _memoryService_initializers, _memoryService_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LocalMemoryAdapter = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LocalMemoryAdapter = _classThis;
}();
exports.LocalMemoryAdapter = LocalMemoryAdapter;
function limitContextPack(pack) {
    var _a;
    var limited = __assign(__assign({}, pack), { summary: (0, common_2.truncateFlowText)(pack.summary || '', common_2.FlowSizeLimits.contextPackBytes, 'context pack summary'), files: pack.files.map(function (file) { return (__assign(__assign({}, file), { reason: (0, common_2.truncateFlowText)(file.reason || '', 2048, 'context file reason') })); }), symbols: pack.symbols.map(function (symbol) { return (0, common_2.truncateFlowText)(symbol, 2048, 'context symbol'); }), sections: (_a = pack.sections) === null || _a === void 0 ? void 0 : _a.map(function (section) { return (__assign(__assign({}, section), { items: section.items.map(function (item) { return (__assign(__assign({}, item), { content: (0, common_2.truncateFlowText)(item.content || '', 16 * 1024, 'context section item') })); }) })); }) });
    if ((0, common_2.flowByteLength)(JSON.stringify(limited)) <= common_2.FlowSizeLimits.contextPackBytes) {
        return limited;
    }
    return __assign(__assign({}, limited), { files: limited.files.slice(0, 20), symbols: limited.symbols.slice(0, 40), signals: limited.signals.slice(0, 40), sections: [{
                id: 'truncated',
                title: 'Truncated Context',
                items: [{
                        title: 'Context pack limit',
                        content: "Flow truncated this context pack to ".concat(common_2.FlowSizeLimits.contextPackBytes, " bytes."),
                        source: 'flow.size-limit'
                    }]
            }] });
}
function buildRealContextSections(contextPack, retrievalResults, dashboard, focused) {
    var _a, _b, _c, _d;
    if (focused === void 0) { focused = false; }
    var sections = [];
    var memoryLimit = focused ? 4 : 8;
    var fileLimit = focused ? 6 : 12;
    pushSection(sections, 'retrieval', 'Relevant Retrieval', __spreadArray(__spreadArray([], contextPack.sections.map(function (section) { return ({
        title: section.title,
        content: section.content,
        source: 'memory.context-pack'
    }); }), true), retrievalResults.slice(0, focused ? 5 : 8).map(function (result) { return ({
        title: result.title,
        content: result.snippet || result.evidence || '',
        uri: result.uri,
        source: result.sourceKind,
        score: result.score
    }); }), true));
    var memories = (dashboard === null || dashboard === void 0 ? void 0 : dashboard.memories) || [];
    pushSection(sections, 'user_preferences', 'User Preferences', __spreadArray(__spreadArray([], memories.filter(function (memory) { return isPreference(memory); }).slice(0, memoryLimit).map(memorySectionItem), true), (((_b = (_a = dashboard === null || dashboard === void 0 ? void 0 : dashboard.graphs) === null || _a === void 0 ? void 0 : _a.preferences) === null || _b === void 0 ? void 0 : _b.nodes) || []).slice(0, memoryLimit).map(function (node) { return ({
        title: node.label,
        content: node.detail || node.label,
        source: 'memory.preferences-graph'
    }); }), true));
    pushSection(sections, 'decisions', 'Previous Decisions', memories.filter(function (memory) { return isDecision(memory); }).slice(0, memoryLimit).map(memorySectionItem));
    pushSection(sections, 'workspace_patterns', 'Workspace Patterns and Conventions', __spreadArray(__spreadArray([], ((dashboard === null || dashboard === void 0 ? void 0 : dashboard.skills) || []).slice(0, memoryLimit).map(function (skill) { return ({
        title: skill.name,
        content: __spreadArray([skill.description], (skill.guidance || []), true).filter(Boolean).join('\n'),
        source: 'memory.skill'
    }); }), true), (((_d = (_c = dashboard === null || dashboard === void 0 ? void 0 : dashboard.graphs) === null || _c === void 0 ? void 0 : _c.projectMemories) === null || _d === void 0 ? void 0 : _d.nodes) || []).slice(0, memoryLimit).map(function (node) { return ({
        title: node.label,
        content: node.detail || node.label,
        source: 'memory.project-memory-graph'
    }); }), true));
    pushSection(sections, 'repository_stack', 'Repository Stack', repositoryStackItems(dashboard));
    pushSection(sections, 'relevant_files', 'Relevant Files', ((dashboard === null || dashboard === void 0 ? void 0 : dashboard.files) || []).slice(0, fileLimit).map(function (file) { return ({
        title: contextFilePath(file),
        content: __spreadArray([file.language || file.languageId, file.lineCount ? "".concat(file.lineCount, " lines") : undefined], (file.tags || []), true).filter(Boolean).join(', '),
        uri: contextFilePath(file),
        source: 'memory.workspace-index'
    }); }));
    pushSection(sections, 'global_memories', 'Global Memories', memories.filter(function (memory) { return memory.scope === 'global' && !isPreference(memory) && !isDecision(memory); }).slice(0, memoryLimit).map(memorySectionItem));
    return sections;
}
function pushSection(sections, id, title, items) {
    var usefulItems = items.filter(function (item) { return item.title || item.content; });
    if (usefulItems.length > 0) {
        sections.push({ id: id, title: title, items: usefulItems });
    }
}
function focusDashboardForWorkload(dashboard, referencedFiles, retrievalResults) {
    if (!dashboard) {
        return undefined;
    }
    var relevantPaths = new Set(__spreadArray(__spreadArray([], referencedFiles.map(normalizeContextPath), true), retrievalResults.map(function (result) { return result.uri; }).filter(function (uri) { return Boolean(uri); }).map(normalizeContextPath), true));
    var files = (dashboard.files || []).filter(function (file) { return isRelevantContextPath(contextFilePath(file), relevantPaths); });
    return __assign(__assign({}, dashboard), { files: files, symbols: (dashboard.symbols || []).slice(0, 8), codeChunks: (dashboard.codeChunks || []).filter(function (chunk) { return chunk.path && isRelevantContextPath(chunk.path, relevantPaths); }) });
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
function collectReferencedFiles(workflow, workload) {
    var _a, _b, _c, _d;
    var files = new Set();
    if (!workload) {
        for (var _i = 0, _e = Object.values(workflow.agents || {}); _i < _e.length; _i++) {
            var agentPath = _e[_i];
            files.add(agentPath);
        }
        for (var _f = 0, _g = Object.values(workflow.states); _f < _g.length; _f++) {
            var state_1 = _g[_f];
            for (var _h = 0, _j = ((_a = state_1.input) === null || _a === void 0 ? void 0 : _a.include) || []; _h < _j.length; _h++) {
                var input = _j[_h];
                files.add(input);
            }
            for (var _k = 0, _l = state_1.outputs || []; _k < _l.length; _k++) {
                var output = _l[_k];
                files.add(output);
            }
        }
        return __spreadArray([], files, true).sort();
    }
    if (workload.agent && ((_b = workflow.agents) === null || _b === void 0 ? void 0 : _b[workload.agent])) {
        files.add(workflow.agents[workload.agent]);
    }
    var state = findWorkflowState(workflow, workload.stateId);
    if ((state === null || state === void 0 ? void 0 : state.agent) && ((_c = workflow.agents) === null || _c === void 0 ? void 0 : _c[state.agent])) {
        files.add(workflow.agents[state.agent]);
    }
    if (state) {
        for (var _m = 0, _o = ((_d = state.input) === null || _d === void 0 ? void 0 : _d.include) || []; _m < _o.length; _m++) {
            var input = _o[_m];
            files.add(input);
        }
        for (var _p = 0, _q = state.outputs || []; _p < _q.length; _p++) {
            var output = _q[_p];
            files.add(output);
        }
    }
    for (var _r = 0, _s = (workload === null || workload === void 0 ? void 0 : workload.inputArtifacts) || []; _r < _s.length; _r++) {
        var artifact = _s[_r];
        files.add(artifact);
    }
    for (var _t = 0, _u = (workload === null || workload === void 0 ? void 0 : workload.outputArtifacts) || []; _t < _u.length; _t++) {
        var artifact = _u[_t];
        files.add(artifact);
    }
    return __spreadArray([], files, true).sort();
}
function collectRelevantAgentIds(workflow, workload) {
    if (!workload) {
        return Object.keys(workflow.agents || {});
    }
    var ids = new Set();
    if (workload.agent) {
        ids.add(workload.agent);
    }
    var state = findWorkflowState(workflow, workload.stateId);
    if (state === null || state === void 0 ? void 0 : state.agent) {
        ids.add(state.agent);
    }
    return __spreadArray([], ids, true).filter(function (id) { var _a; return Boolean(((_a = workflow.agents) === null || _a === void 0 ? void 0 : _a[id]) || id); }).sort();
}
function findWorkflowState(workflow, stateId) {
    var _a;
    if (workflow.states[stateId]) {
        return workflow.states[stateId];
    }
    for (var _i = 0, _b = Object.values(workflow.states); _i < _b.length; _i++) {
        var state = _b[_i];
        if ((_a = state.branches) === null || _a === void 0 ? void 0 : _a[stateId]) {
            return state.branches[stateId];
        }
    }
    return undefined;
}
function stableId(prefix) {
    var parts = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        parts[_i - 1] = arguments[_i];
    }
    return "".concat(prefix, "-").concat(parts.join('-').replace(/[^a-zA-Z0-9._-]/g, '_'));
}
function timestamp() {
    return new Date().toISOString();
}
function workspacePathFromUri(workspaceRootUri) {
    if (!workspaceRootUri.includes('://')) {
        return workspaceRootUri;
    }
    return new uri_1.default(workspaceRootUri).path.fsPath();
}
function contextPrompt(workflow, workload) {
    return __spreadArray([
        "Flow workflow ".concat(workflow.name, " (").concat(workflow.id, ")"),
        workload ? "workload ".concat(workload.id, " state ").concat(workload.stateId) : undefined
    ], collectReferencedFiles(workflow, workload), true).filter(Boolean).join('\n');
}
function mergeContextFiles() {
    var groups = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        groups[_i] = arguments[_i];
    }
    var byUri = new Map();
    for (var _a = 0, _b = groups.flat(); _a < _b.length; _a++) {
        var file = _b[_a];
        if (!byUri.has(file.uri)) {
            byUri.set(file.uri, file);
        }
    }
    return __spreadArray([], byUri.values(), true).sort(function (left, right) { return left.uri.localeCompare(right.uri); });
}
function mergeStrings() {
    var groups = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        groups[_i] = arguments[_i];
    }
    return __spreadArray([], new Set(groups.flat().filter(Boolean)), true).sort();
}
function buildContextSignals(dashboard, retrievalResults) {
    var _a, _b, _c, _d, _e;
    if (!dashboard) {
        return [];
    }
    var sourceKinds = __spreadArray([], new Set(retrievalResults.map(function (result) { return result.sourceKind; })), true).sort();
    return [
        { key: 'memory.context.files', value: ((_a = dashboard.files) === null || _a === void 0 ? void 0 : _a.length) || 0 },
        { key: 'memory.context.symbols', value: ((_b = dashboard.symbols) === null || _b === void 0 ? void 0 : _b.length) || 0 },
        { key: 'memory.context.memories', value: ((_c = dashboard.memories) === null || _c === void 0 ? void 0 : _c.length) || 0 },
        { key: 'memory.context.skills', value: ((_d = dashboard.skills) === null || _d === void 0 ? void 0 : _d.length) || 0 },
        { key: 'memory.context.retrieval_sources', value: sourceKinds.join(',') || 'none' },
        { key: 'memory.context.memory_enabled', value: ((_e = dashboard.settings) === null || _e === void 0 ? void 0 : _e.memoryEnabled) !== false }
    ];
}
function repositoryStackItems(dashboard) {
    var languageCounts = new Map();
    var toolTags = new Set();
    for (var _i = 0, _a = (dashboard === null || dashboard === void 0 ? void 0 : dashboard.files) || []; _i < _a.length; _i++) {
        var file = _a[_i];
        var language = file.language || file.languageId;
        if (language) {
            languageCounts.set(language, (languageCounts.get(language) || 0) + 1);
        }
        for (var _b = 0, _c = file.tags || []; _b < _c.length; _b++) {
            var tag = _c[_b];
            if (isToolingTag(tag)) {
                toolTags.add(tag);
            }
        }
    }
    var items = __spreadArray([], languageCounts.entries(), true).sort(function (left, right) { return right[1] - left[1]; })
        .slice(0, 8)
        .map(function (_a) {
        var language = _a[0], count = _a[1];
        return ({
            title: language,
            content: "".concat(count, " indexed files"),
            source: 'memory.workspace-index'
        });
    });
    if (toolTags.size > 0) {
        items.push({
            title: 'Detected tools',
            content: __spreadArray([], toolTags, true).sort().join(', '),
            source: 'memory.workspace-index'
        });
    }
    return items;
}
function contextFilePath(file) {
    return file.path || file.relativePath || 'workspace file';
}
function contextFileReason(file) {
    return __spreadArray(['Memory indexed file', file.language || file.languageId], (file.tags || []), true).filter(Boolean).join(': ');
}
function memorySectionItem(memory) {
    return {
        title: memory.title,
        content: memory.content || memory.evidence || memory.title,
        source: "memory.".concat(memory.scope || 'memory', "-").concat(memory.memoryType || 'memory')
    };
}
function isPreference(memory) {
    return includesAny(__spreadArray([memory.memoryType, memory.title, memory.content], (memory.tags || []), true), ['preference', 'preferencia', 'convention', 'style']);
}
function isDecision(memory) {
    return includesAny(__spreadArray([memory.memoryType, memory.title, memory.content], (memory.tags || []), true), ['decision', 'decisao', 'adr']);
}
function includesAny(values, needles) {
    return values.some(function (value) {
        var normalized = (value === null || value === void 0 ? void 0 : value.toLowerCase()) || '';
        return needles.some(function (needle) { return normalized.includes(needle); });
    });
}
function artifactLooksMemoryRelated(uri, summary) {
    return includesAny([uri, summary], ['memory', 'memoria', 'remember', 'remembered']);
}
function isToolingTag(tag) {
    return /^(npm|yarn|pnpm|go|typescript|javascript|react|theia|webpack|vite|mocha|jest|eslint|prettier|docker|python|rust|dotnet)$/i.test(tag);
}
function memoryTitle(content) {
    var _a;
    var firstLine = ((_a = content.split(/\r?\n/).find(function (line) { return line.trim(); })) === null || _a === void 0 ? void 0 : _a.trim()) || 'Flow memory';
    return firstLine.length > 80 ? "".concat(firstLine.slice(0, 77), "...") : firstLine;
}
function validateExplicitMemoryApproval(memoryWrite) {
    if (memoryWrite.status !== 'approved') {
        return 'Memory writes must be explicitly approved before they can be persisted.';
    }
    if (!memoryWrite.candidateId || !memoryWrite.candidateId.trim()) {
        return 'Memory writes must reference an approved memory candidate.';
    }
    if (!memoryWrite.approvedAt || !memoryWrite.approvedAt.trim()) {
        return 'Memory writes require an explicit approval timestamp.';
    }
    if (!memoryWrite.content || !memoryWrite.content.trim()) {
        return 'Memory writes require non-empty approved content.';
    }
    return undefined;
}
function resolveMemoryScope(memoryWrite, workspacePath) {
    var flowScope = memoryWrite.scope || normalizeLegacyFlowMemoryTarget(memoryWrite.target) || 'workspace';
    switch (flowScope) {
        case 'ide':
            return { scope: 'global' };
        case 'workspace':
            return { scope: 'workspace', workspacePath: workspacePath };
        case 'project':
            return { scope: 'repository', workspacePath: workspacePath, repositoryId: stableProjectRepositoryId(workspacePath) };
        case 'workflow':
            return {
                scope: 'task',
                workspacePath: workspacePath,
                taskId: scopedTaskId('workflow', memoryWrite.target || memoryWrite.runId),
                retentionPolicy: 'permanent'
            };
        case 'run':
            return {
                scope: 'task',
                workspacePath: workspacePath,
                taskId: scopedTaskId('run', memoryWrite.target || memoryWrite.runId),
                retentionPolicy: 'manual'
            };
        case 'agent':
            return {
                scope: 'task',
                workspacePath: workspacePath,
                taskId: scopedTaskId('agent', memoryWrite.target || memoryWrite.candidateId),
                retentionPolicy: 'permanent'
            };
    }
}
function normalizeLegacyFlowMemoryTarget(target) {
    var normalized = target === null || target === void 0 ? void 0 : target.trim().toLowerCase();
    if (normalized === 'ide'
        || normalized === 'workspace'
        || normalized === 'project'
        || normalized === 'workflow'
        || normalized === 'run'
        || normalized === 'agent') {
        return normalized;
    }
    return undefined;
}
function stableProjectRepositoryId(workspacePath) {
    return stableId('flow-project', normalizeContextPath(workspacePath) || 'workspace');
}
function scopedTaskId(scope, value) {
    return stableId("flow-".concat(scope), value || scope);
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function configuredMemoryProvider() {
    var _a;
    var configured = (_a = process.env.FLOW_MEMORY_PROVIDER) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase();
    if (!configured || configured === 'auto') {
        return undefined;
    }
    if (configured === 'local' || configured === 'external' || configured === 'missing') {
        return configured;
    }
    if (configured === 'none' || configured === 'off' || configured === 'disabled') {
        return 'missing';
    }
    return undefined;
}
function mockMemoryEnabled() {
    var _a;
    var configured = (_a = process.env.FLOW_MEMORY_PROVIDER) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase();
    return configured === 'mock' || configured === 'e2e-mock';
}
function explicitMemoryFallbackEnabled() {
    var _a, _b;
    var configuredProvider = (_a = process.env.FLOW_MEMORY_PROVIDER) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase();
    if (configuredProvider === 'fallback' || configuredProvider === 'local-fallback' || configuredProvider === 'deterministic-fallback') {
        return true;
    }
    var configuredFallback = (_b = process.env.FLOW_MEMORY_FALLBACK) === null || _b === void 0 ? void 0 : _b.trim().toLowerCase();
    return configuredFallback === '1' || configuredFallback === 'true' || configuredFallback === 'on' || configuredFallback === 'enabled';
}
function memoryProviderKind(service) {
    var metadata = service;
    var provider = normalizeProviderKind(metadata.memoryProvider)
        || normalizeProviderKind(metadata.providerKind)
        || normalizeProviderKind(metadata.provider);
    return provider || 'local';
}
function normalizeProviderKind(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    var normalized = value.trim().toLowerCase();
    return normalized === 'external' ? 'external' : normalized === 'local' ? 'local' : undefined;
}
