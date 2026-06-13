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
exports.MarkdownWorkloadStore = void 0;
var fs = require("fs/promises");
var os = require("os");
var path = require("path");
var file_uri_1 = require("@theia/core/lib/common/file-uri");
var inversify_1 = require("@theia/core/shared/inversify");
var common_1 = require("../common");
var flow_path_policy_1 = require("./flow-path-policy");
var MarkdownWorkloadStore = function () {
    var _classDecorators = [(0, inversify_1.injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var MarkdownWorkloadStore = _classThis = /** @class */ (function () {
        function MarkdownWorkloadStore_1() {
        }
        MarkdownWorkloadStore_1.prototype.materializeRun = function (workspaceRootUri, workflow, run) {
            return __awaiter(this, void 0, void 0, function () {
                var root, artifacts, effects, workloads, _i, workloads_1, workload, state, workloadDir, outputEnvelope;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            root = runRoot(workspaceRootUri, run.id);
                            return [4 /*yield*/, fs.mkdir(root, { recursive: true })];
                        case 1:
                            _a.sent();
                            artifacts = new Map(run.artifacts.map(function (artifact) { return [artifact.id, artifact]; }));
                            effects = new Map(run.effects.map(function (effect) { return [effect.id, effect]; }));
                            workloads = __spreadArray([], run.workloads, true);
                            _i = 0, workloads_1 = workloads;
                            _a.label = 2;
                        case 2:
                            if (!(_i < workloads_1.length)) return [3 /*break*/, 7];
                            workload = workloads_1[_i];
                            state = findState(workflow, workload.stateId);
                            workloadDir = path.join(root, 'workloads', sanitizeFileName(workload.id));
                            return [4 /*yield*/, this.writeInputEnvelope(workloadDir, workflow, run, workload)];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, this.writeOutputEnvelope(workloadDir, workflow, run, workload, state)];
                        case 4:
                            outputEnvelope = _a.sent();
                            this.registerOutputArtifacts(workloadDir, run, workload, outputEnvelope, artifacts);
                            return [4 /*yield*/, this.writeAuditLinks(workloadDir, workflow, run, workload, outputEnvelope, artifacts)];
                        case 5:
                            _a.sent();
                            this.registerEnvelopeEffect(workload, run, effects);
                            _a.label = 6;
                        case 6:
                            _i++;
                            return [3 /*break*/, 2];
                        case 7: return [4 /*yield*/, this.writeAggregatedIssues(root, run.id, workloads)];
                        case 8:
                            _a.sent();
                            return [2 /*return*/, __assign(__assign({}, run), { workloads: workloads, artifacts: __spreadArray([], artifacts.values(), true), effects: __spreadArray([], effects.values(), true) })];
                    }
                });
            });
        };
        MarkdownWorkloadStore_1.prototype.writeInputEnvelope = function (workloadDir, workflow, run, workload) {
            return __awaiter(this, void 0, void 0, function () {
                var inputDir, _i, _a, included, targetFile, sourceFile, content;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            inputDir = path.join(workloadDir, 'input');
                            return [4 /*yield*/, fs.mkdir(path.join(inputDir, 'artifacts'), { recursive: true })];
                        case 1:
                            _b.sent();
                            return [4 /*yield*/, fs.writeFile(path.join(inputDir, 'prompt.md'), (0, common_1.truncateFlowText)((0, common_1.redactFlowSecretsText)(run.prompt) || '', common_1.FlowSizeLimits.promptBytes, 'prompt'), 'utf8')];
                        case 2:
                            _b.sent();
                            return [4 /*yield*/, fs.writeFile(path.join(inputDir, 'context-pack.md'), renderContextPack(resolveContextPackForWorkload(run, workload), workflow, workload), 'utf8')];
                        case 3:
                            _b.sent();
                            return [4 /*yield*/, fs.writeFile(path.join(inputDir, 'work-order.md'), renderWorkOrder(workflow, workload), 'utf8')];
                        case 4:
                            _b.sent();
                            _i = 0, _a = workload.inputArtifacts;
                            _b.label = 5;
                        case 5:
                            if (!(_i < _a.length)) return [3 /*break*/, 10];
                            included = _a[_i];
                            targetFile = path.join.apply(path, __spreadArray([inputDir, 'artifacts'], splitArtifactPath(included), false));
                            sourceFile = findInputArtifactPath(run, included);
                            if (!sourceFile) {
                                return [3 /*break*/, 9];
                            }
                            return [4 /*yield*/, readTextFile(sourceFile)];
                        case 6:
                            content = _b.sent();
                            if (content === undefined) {
                                return [3 /*break*/, 9];
                            }
                            return [4 /*yield*/, fs.mkdir(path.dirname(targetFile), { recursive: true })];
                        case 7:
                            _b.sent();
                            return [4 /*yield*/, fs.writeFile(targetFile, content, 'utf8')];
                        case 8:
                            _b.sent();
                            _b.label = 9;
                        case 9:
                            _i++;
                            return [3 /*break*/, 5];
                        case 10: return [2 /*return*/];
                    }
                });
            });
        };
        MarkdownWorkloadStore_1.prototype.writeOutputEnvelope = function (workloadDir, workflow, run, workload, state) {
            return __awaiter(this, void 0, void 0, function () {
                var outputDir, artifactsDir, expectedOutputs, stateEffects, stateSignals, stateMemoryCandidates, outputEnvelope, _i, _a, output, artifactFile;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            outputDir = path.join(workloadDir, 'output');
                            artifactsDir = path.join(outputDir, 'artifacts');
                            return [4 /*yield*/, fs.mkdir(artifactsDir, { recursive: true })];
                        case 1:
                            _b.sent();
                            expectedOutputs = (state === null || state === void 0 ? void 0 : state.outputs) || [];
                            stateEffects = run.effects.filter(function (effect) { return effect.stateId === workload.stateId; });
                            stateSignals = run.signals.filter(function (signal) { return signal.stateId === workload.stateId; });
                            stateMemoryCandidates = (run.memoryCandidates || []).filter(function (candidate) { return candidate.stateId === workload.stateId; });
                            outputEnvelope = resolveWorkloadOutputEnvelope(workload, expectedOutputs, stateEffects, stateSignals, stateMemoryCandidates);
                            _i = 0, _a = outputEnvelope.artifacts;
                            _b.label = 2;
                        case 2:
                            if (!(_i < _a.length)) return [3 /*break*/, 6];
                            output = _a[_i];
                            artifactFile = path.join.apply(path, __spreadArray([artifactsDir], splitArtifactPath(output.path), false));
                            return [4 /*yield*/, fs.mkdir(path.dirname(artifactFile), { recursive: true })];
                        case 3:
                            _b.sent();
                            return [4 /*yield*/, writeFileIfMissing(artifactFile, renderArtifact(workflow, run, workload, output.path))];
                        case 4:
                            _b.sent();
                            _b.label = 5;
                        case 5:
                            _i++;
                            return [3 /*break*/, 2];
                        case 6: return [4 /*yield*/, fs.writeFile(path.join(outputDir, 'report.md'), (0, common_1.truncateFlowText)(renderReport(workflow, run, workload, outputEnvelope), common_1.FlowSizeLimits.reportBytes, 'report'), 'utf8')];
                        case 7:
                            _b.sent();
                            return [4 /*yield*/, fs.writeFile(path.join(outputDir, 'result.json'), (0, common_1.limitFlowJsonString)((0, common_1.redactFlowSecretsValue)(outputEnvelope), common_1.FlowSizeLimits.resultJsonBytes, 'result.json'), 'utf8')];
                        case 8:
                            _b.sent();
                            return [4 /*yield*/, fs.writeFile(path.join(outputDir, 'effects.json'), "".concat(JSON.stringify((0, common_1.redactFlowSecretsValue)(outputEnvelope.effects), undefined, 2), "\n"), 'utf8')];
                        case 9:
                            _b.sent();
                            return [4 /*yield*/, fs.writeFile(path.join(outputDir, 'signals.json'), "".concat(JSON.stringify((0, common_1.redactFlowSecretsValue)(outputEnvelope.signals), undefined, 2), "\n"), 'utf8')];
                        case 10:
                            _b.sent();
                            return [4 /*yield*/, fs.writeFile(path.join(outputDir, 'issues.jsonl'), outputEnvelope.issues.map(function (issue) { return JSON.stringify((0, common_1.redactFlowSecretsValue)(issue)); }).join('\n'), 'utf8')];
                        case 11:
                            _b.sent();
                            return [4 /*yield*/, fs.writeFile(path.join(outputDir, 'memory-candidates.jsonl'), (outputEnvelope.memoryCandidates || []).map(function (candidate) { return JSON.stringify((0, common_1.redactFlowSecretsValue)(candidate)); }).join('\n'), 'utf8')];
                        case 12:
                            _b.sent();
                            return [2 /*return*/, outputEnvelope];
                    }
                });
            });
        };
        MarkdownWorkloadStore_1.prototype.writeAuditLinks = function (workloadDir, workflow, run, workload, outputEnvelope, artifacts) {
            return __awaiter(this, void 0, void 0, function () {
                var auditFile, links, artifactId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            auditFile = path.join(workloadDir, 'output', 'audit-links.json');
                            links = buildAuditLinks(workloadDir, workflow, run, workload, outputEnvelope);
                            return [4 /*yield*/, fs.writeFile(auditFile, (0, common_1.limitFlowJsonString)((0, common_1.redactFlowSecretsValue)(links), common_1.FlowSizeLimits.resultJsonBytes, 'audit-links.json'), 'utf8')];
                        case 1:
                            _a.sent();
                            artifactId = stableId('artifact', run.id, workload.id, 'audit-links.json');
                            artifacts.set(artifactId, {
                                id: artifactId,
                                runId: run.id,
                                stateId: workload.stateId,
                                uri: file_uri_1.FileUri.create(auditFile).toString(),
                                kind: 'other',
                                summary: "Audit links for ".concat(workload.stateId, "."),
                                createdAt: run.updatedAt
                            });
                            addUnique(workload.outputArtifacts, file_uri_1.FileUri.create(auditFile).toString());
                            return [2 /*return*/];
                    }
                });
            });
        };
        MarkdownWorkloadStore_1.prototype.registerOutputArtifacts = function (workloadDir, run, workload, outputEnvelope, artifacts) {
            var now = run.updatedAt;
            var reportFile = path.join(workloadDir, 'output', 'report.md');
            var reportId = stableId('artifact', run.id, workload.id, 'report.md');
            artifacts.set(reportId, {
                id: reportId,
                runId: run.id,
                stateId: workload.stateId,
                uri: file_uri_1.FileUri.create(reportFile).toString(),
                kind: 'report',
                summary: "Markdown report for ".concat(workload.stateId, "."),
                createdAt: now
            });
            workload.reportUri = file_uri_1.FileUri.create(reportFile).toString();
            addUnique(workload.outputArtifacts, workload.reportUri);
            for (var _i = 0, _a = outputEnvelope.artifacts; _i < _a.length; _i++) {
                var output = _a[_i];
                var outputFile = path.join.apply(path, __spreadArray([workloadDir, 'output', 'artifacts'], splitArtifactPath(output.path), false));
                var artifactId = output.id || stableId('artifact', run.id, workload.id, output.path);
                artifacts.set(artifactId, {
                    id: artifactId,
                    runId: run.id,
                    stateId: workload.stateId,
                    uri: file_uri_1.FileUri.create(outputFile).toString(),
                    kind: artifactKindFromPath(output.path),
                    summary: output.path,
                    createdAt: now
                });
                addUnique(workload.outputArtifacts, file_uri_1.FileUri.create(outputFile).toString());
            }
        };
        MarkdownWorkloadStore_1.prototype.registerEnvelopeEffect = function (workload, run, effects) {
            var effectId = stableId('effect', run.id, workload.id, 'workload-envelope');
            effects.set(effectId, {
                id: effectId,
                runId: run.id,
                stateId: workload.stateId,
                kind: 'file_write',
                status: 'applied',
                summary: "Materialized Markdown workload envelope for ".concat(workload.stateId, ".")
            });
            addUnique(workload.effectIds, effectId);
        };
        MarkdownWorkloadStore_1.prototype.writeAggregatedIssues = function (root, runId, workloads) {
            return __awaiter(this, void 0, void 0, function () {
                var aggregate, issuesDir;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, aggregateIssues(root, runId, workloads)];
                        case 1:
                            aggregate = _a.sent();
                            issuesDir = path.join(root, 'issues');
                            return [4 /*yield*/, fs.mkdir(issuesDir, { recursive: true })];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, fs.writeFile(path.join(issuesDir, 'issues.jsonl'), renderJsonLines(aggregate.all), 'utf8')];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, fs.writeFile(path.join(issuesDir, 'blocking.jsonl'), renderJsonLines(aggregate.blocking), 'utf8')];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, fs.writeFile(path.join(issuesDir, 'non_blocking.jsonl'), renderJsonLines(aggregate.nonBlocking), 'utf8')];
                        case 5:
                            _a.sent();
                            return [4 /*yield*/, fs.writeFile(path.join(issuesDir, 'followup.jsonl'), renderJsonLines(aggregate.followup), 'utf8')];
                        case 6:
                            _a.sent();
                            return [4 /*yield*/, fs.writeFile(path.join(issuesDir, 'summary.json'), "".concat(JSON.stringify({
                                    runId: runId,
                                    counts: {
                                        all: aggregate.all.length,
                                        blocking: aggregate.blocking.length,
                                        non_blocking: aggregate.nonBlocking.length,
                                        followup: aggregate.followup.length
                                    },
                                    blocking: aggregate.blocking,
                                    non_blocking: aggregate.nonBlocking,
                                    followup: aggregate.followup
                                }, undefined, 2), "\n"), 'utf8')];
                        case 7:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        return MarkdownWorkloadStore_1;
    }());
    __setFunctionName(_classThis, "MarkdownWorkloadStore");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MarkdownWorkloadStore = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MarkdownWorkloadStore = _classThis;
}();
exports.MarkdownWorkloadStore = MarkdownWorkloadStore;
function resolveWorkloadOutputEnvelope(workload, expectedOutputs, stateEffects, stateSignals, memoryCandidates) {
    var _a, _b, _c, _d, _e, _f, _g;
    var fallbackOutputs = expectedOutputs.length > 0 ? expectedOutputs : ['report.md'];
    var fallbackArtifacts = fallbackOutputs.map(function (output) { return ({
        id: stableId('artifact', workload.runId, workload.id, output),
        path: output,
        type: flowArtifactKind(output)
    }); });
    var fallbackSignals = Object.fromEntries(stateSignals.map(function (signal) { return [signal.key, signal.value]; }));
    var fallbackIssues = workload.issues.map(function (issue) { return ({
        severity: 'non_blocking',
        type: 'workload_issue',
        summary: issue
    }); });
    var fallbackEffects = stateEffects.map(function (effect) { return ({
        type: effect.type || effect.kind,
        summary: effect.summary,
        path: effect.path,
        command: effect.command,
        cwd: effect.cwd,
        env: effect.env,
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
    }); });
    var fallbackResult = {
        status: normalizeWorkloadStatus(workload.status),
        summary: "Workload ".concat(workload.id, " for state ").concat(workload.stateId, " is ").concat(workload.status, "."),
        artifacts: fallbackArtifacts,
        signals: fallbackSignals,
        issues: fallbackIssues
    };
    if (!workload.outputEnvelope) {
        return {
            status: normalizeWorkloadStatus(workload.status),
            result: fallbackResult,
            artifacts: fallbackArtifacts,
            effects: fallbackEffects,
            signals: fallbackSignals,
            issues: fallbackIssues,
            report: '',
            memoryCandidates: memoryCandidates
        };
    }
    var envelope = workload.outputEnvelope;
    var status = normalizeWorkloadStatus(envelope.status || workload.status);
    var artifacts = normalizeOutputArtifacts(workload.runId, workload.id, envelope.artifacts, fallbackArtifacts);
    var resultArtifacts = normalizeOutputArtifacts(workload.runId, workload.id, (_a = envelope.result) === null || _a === void 0 ? void 0 : _a.artifacts, artifacts);
    var signals = Object.keys(envelope.signals || {}).length ? envelope.signals : fallbackSignals;
    var resultSignals = envelope.result && Object.keys(envelope.result.signals || {}).length
        ? envelope.result.signals
        : signals;
    var issues = ((_b = envelope.issues) === null || _b === void 0 ? void 0 : _b.length) ? normalizeOutputIssues(envelope.issues) : fallbackIssues;
    var resultIssues = ((_d = (_c = envelope.result) === null || _c === void 0 ? void 0 : _c.issues) === null || _d === void 0 ? void 0 : _d.length) ? normalizeOutputIssues(envelope.result.issues) : issues;
    var effects = ((_e = envelope.effects) === null || _e === void 0 ? void 0 : _e.length) ? normalizeOutputEffects(envelope.effects) : fallbackEffects;
    return {
        status: status,
        result: {
            status: normalizeWorkloadStatus(((_f = envelope.result) === null || _f === void 0 ? void 0 : _f.status) || status),
            summary: toTrimmedString((_g = envelope.result) === null || _g === void 0 ? void 0 : _g.summary) || fallbackResult.summary,
            artifacts: resultArtifacts,
            signals: resultSignals,
            issues: resultIssues
        },
        artifacts: artifacts,
        effects: effects,
        signals: signals,
        issues: issues,
        report: toTrimmedString(envelope.report) || fallbackResult.summary,
        memoryCandidates: normalizeMemoryCandidates(envelope.memoryCandidates, memoryCandidates)
    };
}
function normalizeOutputArtifacts(runId, workloadId, source, fallback) {
    var _a;
    var entries = source && source.length ? source : fallback;
    var byPath = new Map();
    for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
        var entry = entries_1[_i];
        var pathValue = toTrimmedString(entry === null || entry === void 0 ? void 0 : entry.path) || ((_a = fallback[0]) === null || _a === void 0 ? void 0 : _a.path);
        if (!pathValue) {
            continue;
        }
        var normalizedPath = normalizeArtifactPath(pathValue);
        if (byPath.has(normalizedPath)) {
            continue;
        }
        byPath.set(normalizedPath, {
            id: toTrimmedString(entry === null || entry === void 0 ? void 0 : entry.id) || stableId('artifact', runId, workloadId, pathValue),
            path: pathValue,
            type: toTrimmedString(entry === null || entry === void 0 ? void 0 : entry.type) || flowArtifactKind(pathValue),
            hash: toTrimmedString(entry === null || entry === void 0 ? void 0 : entry.hash) || undefined
        });
    }
    return __spreadArray([], byPath.values(), true);
}
function normalizeOutputEffects(effects) {
    return effects.filter(isRecord).map(function (effect) { return ({
        type: toTrimmedString(effect.type) || 'other',
        summary: toTrimmedString(effect.summary) || toTrimmedString(effect.type) || 'workload effect',
        path: toTrimmedString(effect.path),
        content: toOptionalString(effect.content),
        command: toTrimmedString(effect.command),
        cwd: toTrimmedString(effect.cwd),
        env: normalizeEffectEnv(effect.env),
        allowedEnv: normalizeStringArray(effect.allowedEnv),
        allowedCommands: normalizeStringArray(effect.allowedCommands),
        timeoutMs: normalizeOptionalNumber(effect.timeoutMs),
        exitCode: normalizeOptionalNumber(effect.exitCode),
        stdout: (0, common_1.truncateFlowText)(toTrimmedString(effect.stdout), common_1.FlowSizeLimits.commandOutputBytes, 'command stdout'),
        stderr: (0, common_1.truncateFlowText)(toTrimmedString(effect.stderr), common_1.FlowSizeLimits.commandOutputBytes, 'command stderr'),
        timedOut: effect.timedOut === true,
        hashBefore: toTrimmedString(effect.hashBefore),
        hashAfter: toTrimmedString(effect.hashAfter),
        patch: toTrimmedString(effect.patch),
        approvalPolicy: toTrimmedString(effect.approvalPolicy),
        status: toTrimmedString(effect.status)
    }); });
}
function normalizeOutputIssues(issues) {
    var normalized = issues
        .filter(isRecord)
        .map(function (issue) { return ({
        severity: toTrimmedString(issue.severity) || 'non_blocking',
        type: toTrimmedString(issue.type) || 'workload_issue',
        summary: toTrimmedString(issue.summary),
        producer: toTrimmedString(issue.producer) || undefined,
        impact: toTrimmedString(issue.impact) || undefined,
        suggestedFollowup: toTrimmedString(issue.suggestedFollowup) || undefined
    }); })
        .filter(function (item) { return item.summary.length > 0; });
    return normalized;
}
function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function normalizeMemoryCandidates(source, fallback) {
    var candidates = source && source.length ? source : fallback;
    var byId = new Map();
    for (var _i = 0, candidates_1 = candidates; _i < candidates_1.length; _i++) {
        var candidate = candidates_1[_i];
        if (!candidate || !candidate.content) {
            continue;
        }
        var id = candidate.id || workloadCandidateId(candidate);
        byId.set(id, __assign(__assign({}, candidate), { id: id }));
    }
    return __spreadArray([], byId.values(), true);
}
function aggregateIssues(root, runId, workloads) {
    return __awaiter(this, void 0, void 0, function () {
        var byKey, _i, workloads_2, workload, issuesFile, issues, _a, issues_1, issue, normalized, key, existing, all;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    byKey = new Map();
                    _i = 0, workloads_2 = workloads;
                    _b.label = 1;
                case 1:
                    if (!(_i < workloads_2.length)) return [3 /*break*/, 4];
                    workload = workloads_2[_i];
                    issuesFile = path.join(root, 'workloads', sanitizeFileName(workload.id), 'output', 'issues.jsonl');
                    return [4 /*yield*/, readIssueJsonLines(issuesFile)];
                case 2:
                    issues = _b.sent();
                    for (_a = 0, issues_1 = issues; _a < issues_1.length; _a++) {
                        issue = issues_1[_a];
                        normalized = normalizeAggregatedIssue(runId, workload, issue);
                        if (!normalized) {
                            continue;
                        }
                        key = issueDedupeKey(normalized);
                        existing = byKey.get(key);
                        if (!existing || severityRank(normalized.severity) > severityRank(existing.severity)) {
                            byKey.set(key, normalized);
                        }
                    }
                    _b.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    all = __spreadArray([], byKey.values(), true).sort(compareAggregatedIssues);
                    return [2 /*return*/, {
                            all: all,
                            blocking: all.filter(function (issue) { return issue.severity === 'blocking'; }),
                            nonBlocking: all.filter(function (issue) { return issue.severity === 'non_blocking'; }),
                            followup: all.filter(function (issue) { return issue.severity === 'followup'; })
                        }];
            }
        });
    });
}
function readIssueJsonLines(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var content;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.readFile(filePath, 'utf8').catch(function () { return ''; })];
                case 1:
                    content = _a.sent();
                    return [2 /*return*/, content.split(/\r?\n/)
                            .map(function (line) { return line.trim(); })
                            .filter(Boolean)
                            .flatMap(function (line) {
                            try {
                                return [JSON.parse(line)];
                            }
                            catch (_a) {
                                return [];
                            }
                        })];
            }
        });
    });
}
function normalizeAggregatedIssue(runId, workload, value) {
    if (!isRecord(value)) {
        return undefined;
    }
    var summary = toTrimmedString(value.summary) || toTrimmedString(value.message);
    if (!summary) {
        return undefined;
    }
    var sourceSeverity = toTrimmedString(value.severity);
    return {
        runId: runId,
        workloadId: workload.id,
        stateId: workload.stateId,
        severity: normalizeIssueSeverity(sourceSeverity, value),
        sourceSeverity: sourceSeverity || undefined,
        type: toTrimmedString(value.type) || 'workload_issue',
        summary: summary,
        producer: toTrimmedString(value.producer) || undefined,
        impact: toTrimmedString(value.impact) || undefined,
        suggestedFollowup: toTrimmedString(value.suggestedFollowup) || undefined
    };
}
function normalizeIssueSeverity(value, issue) {
    var normalized = value.toLowerCase().replace(/[\s-]+/g, '_');
    if (['blocking', 'blocker', 'critical', 'fatal', 'high', 'error', 'failed', 'failure'].includes(normalized)) {
        return 'blocking';
    }
    if (['followup', 'follow_up', 'deferred', 'todo', 'later'].includes(normalized)
        || Boolean(toTrimmedString(issue.suggestedFollowup))
        || toTrimmedString(issue.type).toLowerCase().includes('followup')) {
        return 'followup';
    }
    return 'non_blocking';
}
function issueDedupeKey(issue) {
    return [
        issue.severity,
        issue.type.toLowerCase(),
        issue.summary.toLowerCase().replace(/\s+/g, ' '),
        (issue.impact || '').toLowerCase().replace(/\s+/g, ' ')
    ].join('|');
}
function severityRank(severity) {
    return severity === 'blocking' ? 3 : severity === 'followup' ? 2 : 1;
}
function compareAggregatedIssues(left, right) {
    return severityRank(right.severity) - severityRank(left.severity)
        || left.stateId.localeCompare(right.stateId)
        || left.workloadId.localeCompare(right.workloadId)
        || left.summary.localeCompare(right.summary);
}
function renderJsonLines(values) {
    return values.map(function (value) { return JSON.stringify(value); }).join('\n') + (values.length ? '\n' : '');
}
function workloadIdFromCandidate(candidate) {
    return candidate.runId || 'run';
}
function workloadCandidateId(candidate) {
    return stableId('memory-candidate', workloadIdFromCandidate(candidate), candidate.stateId || 'state', candidate.kind);
}
function normalizeWorkloadStatus(value) {
    var normalized = toTrimmedString(value).toLowerCase();
    if (!normalized || normalized === 'ok' || normalized === 'success') {
        return 'completed';
    }
    if (normalized === 'done') {
        return 'completed';
    }
    return ['pending', 'ready', 'running', 'completed', 'failed', 'waiting', 'review', 'done'].includes(normalized)
        ? normalized
        : 'completed';
}
function renderContextPack(contextPack, workflow, workload) {
    var redactedContextPack = (0, common_1.redactFlowSecretsValue)(contextPack);
    var files = (redactedContextPack === null || redactedContextPack === void 0 ? void 0 : redactedContextPack.files.map(function (file) { return "- ".concat(file.uri, ": ").concat(file.reason); }).join('\n')) || '- none';
    return (0, common_1.truncateFlowText)((0, common_1.redactFlowSecretsText)(__spreadArray(__spreadArray(__spreadArray([
        "# Context Pack - ".concat(workload.stateId),
        '',
        (redactedContextPack === null || redactedContextPack === void 0 ? void 0 : redactedContextPack.summary) || "Workflow \"".concat(workflow.name, "\" context is unavailable."),
        '',
        '## Files',
        files,
        '',
        '## Signals'
    ], ((redactedContextPack === null || redactedContextPack === void 0 ? void 0 : redactedContextPack.signals) || []).map(function (signal) { return "- ".concat(signal.key, ": ").concat(String(signal.value)); }), true), [
        ''
    ], false), ((redactedContextPack === null || redactedContextPack === void 0 ? void 0 : redactedContextPack.sections) || []).flatMap(function (section) { return __spreadArray([
        "## ".concat(section.title)
    ], section.items.map(function (item) { return "- ".concat(item.title, ": ").concat(item.content); }), true); }), true).join('\n')) || '', common_1.FlowSizeLimits.contextPackBytes, 'context pack');
}
function resolveContextPackForWorkload(run, workload) {
    var _a;
    return ((_a = run.workloadContextPacks) === null || _a === void 0 ? void 0 : _a[workload.id]) || run.contextPack;
}
function renderWorkOrder(workflow, workload) {
    var _a;
    var agentPath = workload.agent ? ((_a = workflow.agents) === null || _a === void 0 ? void 0 : _a[workload.agent]) || workload.agent : 'system';
    return __spreadArray([
        "# Work Order - ".concat(workload.stateId),
        '',
        "Workflow: ".concat(workflow.name),
        "Workload: ".concat(workload.id),
        "Agent: ".concat(agentPath),
        '',
        '## Inputs'
    ], (workload.inputArtifacts.length ? workload.inputArtifacts.map(function (input) { return "- ".concat(input); }) : ['- none']), true).join('\n');
}
function renderReport(workflow, run, workload, envelope) {
    var outputs = envelope.artifacts.map(function (artifact) { return artifact.path; });
    var effects = envelope.effects;
    var signalEntries = Object.entries(envelope.signals || {});
    var auditLinks = buildAuditLinks('', workflow, run, workload, envelope).links;
    return (0, common_1.redactFlowSecretsText)(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([
        "# Report - ".concat(workload.stateId),
        '',
        "Workflow: ".concat(workflow.name),
        "Run: ".concat(run.id),
        "Status: ".concat(envelope.status),
        '',
        '## Outputs'
    ], (outputs.length ? outputs.map(function (output) { return "- ".concat(output); }) : ['- report.md']), true), [
        '',
        '## Summary',
        envelope.result.summary,
        '',
        '## Effects'
    ], false), (effects.length ? effects.map(function (effect) { return "- ".concat(effect.type, ": ").concat(effect.summary); }).filter(function (line) { return line.length > 2; }) : ['- none']), true), [
        '',
        '## Signals'
    ], false), (signalEntries.length ? signalEntries.map(function (_a) {
        var key = _a[0], value = _a[1];
        return "- ".concat(key, ": ").concat(String(value));
    }) : ['- none']), true), [
        '',
        '## Issues'
    ], false), (envelope.issues.length ? envelope.issues.map(function (issue) { return "- ".concat(issue.summary); }).filter(function (line) { return line.length > 2; }) : ['- none']), true), [
        '',
        '## Memory candidates'
    ], false), (envelope.memoryCandidates && envelope.memoryCandidates.length
        ? envelope.memoryCandidates.map(function (candidate) { return "- ".concat(candidate.source, " / ").concat(candidate.kind, ": ").concat(candidate.content); })
        : ['- none']), true), [
        '',
        '## Audit links'
    ], false), auditLinks.map(function (link) { return "- ".concat(link.kind, ": ").concat(link.path); }), true).join('\n')) || '';
}
function buildAuditLinks(workloadDir, workflow, run, workload, envelope) {
    var _a;
    var outputArtifactIds = new Map(envelope.artifacts.map(function (artifact) { return [normalizeArtifactPath(artifact.path), artifact.id]; }));
    var fileUri = function (relativePath) { return workloadDir
        ? file_uri_1.FileUri.create(path.join.apply(path, __spreadArray([workloadDir], relativePath.split('/'), false))).toString()
        : relativePath; };
    var inputLinks = [
        {
            id: stableId('link', run.id, workload.id, 'prompt'),
            kind: 'prompt',
            path: 'input/prompt.md',
            uri: fileUri('input/prompt.md'),
            source: 'run.prompt'
        },
        {
            id: stableId('link', run.id, workload.id, 'context-pack'),
            kind: 'context_pack',
            path: 'input/context-pack.md',
            uri: fileUri('input/context-pack.md'),
            source: ((_a = run.workloadContextPacks) === null || _a === void 0 ? void 0 : _a[workload.id]) ? 'run.workloadContextPacks' : 'run.contextPack'
        },
        {
            id: stableId('link', run.id, workload.id, 'work-order'),
            kind: 'work_order',
            path: 'input/work-order.md',
            uri: fileUri('input/work-order.md'),
            source: 'workflow.state'
        }
    ];
    var outputLinks = __spreadArray([
        {
            id: stableId('link', run.id, workload.id, 'result'),
            kind: 'result',
            path: 'output/result.json',
            uri: fileUri('output/result.json'),
            artifactId: stableId('artifact', run.id, workload.id, 'result.json')
        },
        {
            id: stableId('link', run.id, workload.id, 'report'),
            kind: 'report',
            path: 'output/report.md',
            uri: fileUri('output/report.md'),
            artifactId: stableId('artifact', run.id, workload.id, 'report.md')
        },
        {
            id: stableId('link', run.id, workload.id, 'effects'),
            kind: 'effects',
            path: 'output/effects.json',
            uri: fileUri('output/effects.json'),
            effectIds: run.effects.filter(function (effect) { return effect.stateId === workload.stateId; }).map(function (effect) { return effect.id; })
        },
        {
            id: stableId('link', run.id, workload.id, 'issues'),
            kind: 'issues',
            path: 'output/issues.jsonl',
            uri: fileUri('output/issues.jsonl'),
            issueCount: envelope.issues.length
        },
        {
            id: stableId('link', run.id, workload.id, 'memory-candidates'),
            kind: 'memory_candidates',
            path: 'output/memory-candidates.jsonl',
            uri: fileUri('output/memory-candidates.jsonl'),
            memoryCandidateIds: (envelope.memoryCandidates || []).map(function (candidate) { return candidate.id; })
        }
    ], envelope.artifacts.map(function (artifact) {
        var normalizedPath = normalizeArtifactPath(artifact.path);
        return {
            id: stableId('link', run.id, workload.id, normalizedPath),
            kind: 'artifact',
            path: "output/artifacts/".concat(normalizedPath),
            uri: fileUri("output/artifacts/".concat(normalizedPath)),
            artifactId: outputArtifactIds.get(normalizedPath) || stableId('artifact', run.id, workload.id, normalizedPath),
            source: artifact.path
        };
    }), true);
    return {
        schemaVersion: 'flow.workload.audit-links/v1',
        runId: run.id,
        workflowId: workflow.id,
        stateId: workload.stateId,
        workloadId: workload.id,
        links: __spreadArray(__spreadArray([], inputLinks, true), outputLinks, true)
    };
}
function renderArtifact(workflow, run, workload, output) {
    return [
        "# ".concat(output),
        '',
        "Generated placeholder artifact for workflow \"".concat(workflow.name, "\"."),
        "Run: ".concat(run.id),
        "Workload: ".concat(workload.id),
        '',
        'This file is part of the normalized Flow workload output envelope.'
    ].join('\n');
}
function runRoot(workspaceRootUri, runId) {
    var root = workspaceRootUri ? file_uri_1.FileUri.fsPath(workspaceRootUri) : os.homedir();
    return path.join(root, '.theia', 'flow', 'runs', sanitizeFileName(runId));
}
function findState(workflow, stateId) {
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
function splitArtifactPath(value) {
    return (0, flow_path_policy_1.splitFlowRelativePath)(value).map(sanitizeFileName);
}
function findInputArtifactPath(run, requestedPath) {
    var normalizedRequested = normalizeArtifactPath(requestedPath);
    for (var _i = 0, _a = run.artifacts; _i < _a.length; _i++) {
        var artifact = _a[_i];
        var artifactPath = artifactPathFromUri(artifact.uri);
        if (!artifactPath) {
            continue;
        }
        var normalizedArtifactPath = normalizeArtifactPath(artifactPath);
        var normalizedSummary = normalizeArtifactPath(artifact.summary || '');
        if (normalizedSummary === normalizedRequested || normalizedArtifactPath.endsWith("/".concat(normalizedRequested))) {
            return artifactPath;
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
function flowArtifactKind(output) {
    if (output.includes('contract')) {
        return 'contract';
    }
    if (output.includes('work-order')) {
        return 'work_order';
    }
    if (output.endsWith('.patch') || output.endsWith('.diff')) {
        return 'patch';
    }
    if (output.endsWith('.md')) {
        return 'report';
    }
    if (output.endsWith('.log') || output.endsWith('.txt')) {
        return 'log';
    }
    return 'other';
}
function artifactKindFromPath(output) {
    return flowArtifactKind(output);
}
function normalizeArtifactPath(value) {
    return value
        .replace(/\\/g, '/')
        .replace(/^\.\//, '')
        .replace(/\/+/g, '/')
        .replace(/^\/+/, '');
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
function stableId(prefix) {
    var parts = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        parts[_i - 1] = arguments[_i];
    }
    return "".concat(prefix, "-").concat(parts.join('-').replace(/[^a-zA-Z0-9._-]/g, '_'));
}
function sanitizeFileName(value) {
    return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}
function addUnique(target, value) {
    if (!target.includes(value)) {
        target.push(value);
    }
}
function toTrimmedString(value) {
    if (typeof value === 'string') {
        return value.trim();
    }
    return '';
}
function toOptionalString(value) {
    return typeof value === 'string' ? value : undefined;
}
function normalizeStringArray(value) {
    if (!Array.isArray(value)) {
        return undefined;
    }
    var normalized = value.map(function (item) { return toTrimmedString(item); }).filter(Boolean);
    return normalized.length ? normalized : undefined;
}
function normalizeOptionalNumber(value) {
    var parsed = typeof value === 'number' ? value : Number.parseInt(toTrimmedString(value), 10);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function normalizeEffectEnv(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return undefined;
    }
    var env = {};
    for (var _i = 0, _a = Object.entries(value); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], raw = _b[1];
        if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
            env[key] = raw;
        }
    }
    return Object.keys(env).length ? env : undefined;
}
function writeFileIfMissing(filePath, content) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 4]);
                    return [4 /*yield*/, fs.access(filePath)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
                case 2:
                    _a = _b.sent();
                    return [4 /*yield*/, fs.writeFile(filePath, content, 'utf8')];
                case 3:
                    _b.sent();
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
