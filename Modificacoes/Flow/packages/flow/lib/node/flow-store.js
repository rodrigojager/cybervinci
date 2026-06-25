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
exports.FlowStore = void 0;
var fs = require("fs/promises");
var os = require("os");
var path = require("path");
var file_uri_1 = require("@theia/core/lib/common/file-uri");
var inversify_1 = require("@theia/core/shared/inversify");
var yaml = require("js-yaml");
var common_1 = require("../common");
var flow_kernel_bridge_1 = require("./flow-kernel-bridge");
var WORKFLOW_EXTENSIONS = ['.json', '.yaml', '.yml'];
var MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown']);
var JSON_FORMAT = 'json';
var YAML_FORMAT = 'yaml';
var UNKNOWN_FORMAT = 'unknown';
var FlowStore = function () {
    var _classDecorators = [(0, inversify_1.injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var FlowStore = _classThis = /** @class */ (function () {
        function FlowStore_1() {
        }
        FlowStore_1.prototype.listWorkflows = function (workspaceRootUri) {
            return __awaiter(this, void 0, void 0, function () {
                var dir, entries, workflows, _i, entries_1, entry, _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.ensureDir(workspaceRootUri, 'workflows')];
                        case 1:
                            dir = _c.sent();
                            return [4 /*yield*/, fs.readdir(dir, { withFileTypes: true })];
                        case 2:
                            entries = _c.sent();
                            workflows = [];
                            _i = 0, entries_1 = entries;
                            _c.label = 3;
                        case 3:
                            if (!(_i < entries_1.length)) return [3 /*break*/, 6];
                            entry = entries_1[_i];
                            if (!(entry.isFile() && isWorkflowFile(entry.name))) return [3 /*break*/, 5];
                            _b = (_a = workflows).push;
                            return [4 /*yield*/, this.readWorkflowFile(path.join(dir, entry.name))];
                        case 4:
                            _b.apply(_a, [_c.sent()]);
                            _c.label = 5;
                        case 5:
                            _i++;
                            return [3 /*break*/, 3];
                        case 6: return [2 /*return*/, workflows.sort(function (left, right) { return left.name.localeCompare(right.name); })];
                    }
                });
            });
        };
        FlowStore_1.prototype.getWorkflow = function (workspaceRootUri, workflowId) {
            return __awaiter(this, void 0, void 0, function () {
                var file, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.findWorkflowFile(workspaceRootUri, workflowId)];
                        case 1:
                            file = _b.sent();
                            if (!file) {
                                return [2 /*return*/, undefined];
                            }
                            _b.label = 2;
                        case 2:
                            _b.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.readWorkflowFile(file)];
                        case 3: return [2 /*return*/, _b.sent()];
                        case 4:
                            _a = _b.sent();
                            return [2 /*return*/, undefined];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        FlowStore_1.prototype.openWorkflowFile = function (filePathOrUri) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.readWorkflowFile(this.fsPath(filePathOrUri))];
                });
            });
        };
        FlowStore_1.prototype.importWorkflow = function (workspaceRootUri, filePathOrUri) {
            return __awaiter(this, void 0, void 0, function () {
                var source, workflow, validation, format, file, saved;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            source = this.fsPath(filePathOrUri);
                            return [4 /*yield*/, this.readImportWorkflow(source)];
                        case 1:
                            workflow = _a.sent();
                            validation = (0, common_1.validateFlowWorkflow)(workflow);
                            if (!validation.valid) {
                                throw new Error("Imported workflow \"".concat(workflow.id || source, "\" is invalid: ").concat(validation.errors.map(function (error) { return error.message; }).join('; ')));
                            }
                            return [4 /*yield*/, this.importWorkflowFormat(source)];
                        case 2:
                            format = _a.sent();
                            return [4 /*yield*/, this.workflowFile(workspaceRootUri, workflow.id, format)];
                        case 3:
                            file = _a.sent();
                            return [4 /*yield*/, this.saveWorkflow(workspaceRootUri, __assign(__assign({}, workflow), { file: undefined }), file, { origin: 'import', message: "Imported from ".concat(source) })];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, this.getWorkflow(workspaceRootUri, workflow.id)];
                        case 5:
                            saved = _a.sent();
                            if (!saved) {
                                throw new Error("Imported workflow \"".concat(workflow.id, "\" could not be reloaded."));
                            }
                            return [2 /*return*/, saved];
                    }
                });
            });
        };
        FlowStore_1.prototype.exportWorkflow = function (workspaceRootUri, workflow, targetPathOrUri) {
            return __awaiter(this, void 0, void 0, function () {
                var exportedAt, exportDir, _a, _b, _c, files, addFile, copyFile, workflowFormat, workflowPackagePath, agentsRoot, missingAgents, _i, _d, agentPath, source, _e, contractRoots, missingContracts, _f, _g, contractPath, source, metadata, manifest;
                var _this = this;
                var _h;
                return __generator(this, function (_j) {
                    switch (_j.label) {
                        case 0:
                            exportedAt = new Date().toISOString();
                            if (!targetPathOrUri) return [3 /*break*/, 1];
                            _a = normalizeWindowsDriveLetter(path.resolve(this.fsPath(targetPathOrUri)));
                            return [3 /*break*/, 3];
                        case 1:
                            _c = (_b = path).join;
                            return [4 /*yield*/, this.ensureDir(workspaceRootUri, 'exports')];
                        case 2:
                            _a = _c.apply(_b, [_j.sent(), "".concat(sanitizeFileName(workflow.id), "-").concat(timestampFilePart(exportedAt))]);
                            _j.label = 3;
                        case 3:
                            exportDir = _a;
                            return [4 /*yield*/, fs.rm(exportDir, { recursive: true, force: true })];
                        case 4:
                            _j.sent();
                            return [4 /*yield*/, fs.mkdir(exportDir, { recursive: true })];
                        case 5:
                            _j.sent();
                            files = [];
                            addFile = function (relativePath, content) { return __awaiter(_this, void 0, void 0, function () {
                                var target;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            target = safePackagePath(exportDir, relativePath);
                                            return [4 /*yield*/, fs.mkdir(path.dirname(target), { recursive: true })];
                                        case 1:
                                            _a.sent();
                                            return [4 /*yield*/, fs.writeFile(target, content)];
                                        case 2:
                                            _a.sent();
                                            files.push(relativePath.split(path.sep).join('/'));
                                            return [2 /*return*/];
                                    }
                                });
                            }); };
                            copyFile = function (source, relativePath) { return __awaiter(_this, void 0, void 0, function () {
                                var target;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            target = safePackagePath(exportDir, relativePath);
                                            return [4 /*yield*/, fs.mkdir(path.dirname(target), { recursive: true })];
                                        case 1:
                                            _a.sent();
                                            return [4 /*yield*/, fs.copyFile(source, target)];
                                        case 2:
                                            _a.sent();
                                            files.push(relativePath.split(path.sep).join('/'));
                                            return [2 /*return*/];
                                    }
                                });
                            }); };
                            workflowFormat = ((_h = workflow.file) === null || _h === void 0 ? void 0 : _h.format) === YAML_FORMAT ? YAML_FORMAT : JSON_FORMAT;
                            workflowPackagePath = "workflow/".concat(sanitizeFileName(workflow.id)).concat(workflowExtension(workflowFormat));
                            if (!(workflowFormat === YAML_FORMAT)) return [3 /*break*/, 7];
                            return [4 /*yield*/, addFile(workflowPackagePath, yaml.dump(stripFileMetadata(workflow), { lineWidth: 120, noRefs: true, sortKeys: false }))];
                        case 6:
                            _j.sent();
                            return [3 /*break*/, 9];
                        case 7: return [4 /*yield*/, addFile(workflowPackagePath, "".concat(JSON.stringify(stripFileMetadata(workflow), undefined, 2), "\n"))];
                        case 8:
                            _j.sent();
                            _j.label = 9;
                        case 9:
                            agentsRoot = path.join(storageRoot(workspaceRootUri), 'agents');
                            missingAgents = [];
                            _i = 0, _d = referencedAgentPaths(workflow);
                            _j.label = 10;
                        case 10:
                            if (!(_i < _d.length)) return [3 /*break*/, 16];
                            agentPath = _d[_i];
                            source = safeExistingSource(agentsRoot, agentPath);
                            _e = source;
                            if (!_e) return [3 /*break*/, 12];
                            return [4 /*yield*/, fileExists(source)];
                        case 11:
                            _e = (_j.sent());
                            _j.label = 12;
                        case 12:
                            if (!_e) return [3 /*break*/, 14];
                            return [4 /*yield*/, copyFile(source, "agents/".concat(agentPath))];
                        case 13:
                            _j.sent();
                            return [3 /*break*/, 15];
                        case 14:
                            missingAgents.push(agentPath);
                            _j.label = 15;
                        case 15:
                            _i++;
                            return [3 /*break*/, 10];
                        case 16:
                            contractRoots = [
                                path.join(storageRoot(workspaceRootUri), 'contracts'),
                                workspaceRootUri ? file_uri_1.FileUri.fsPath(workspaceRootUri) : undefined
                            ].filter(function (value) { return Boolean(value); });
                            missingContracts = [];
                            _f = 0, _g = referencedContractPaths(workflow);
                            _j.label = 17;
                        case 17:
                            if (!(_f < _g.length)) return [3 /*break*/, 22];
                            contractPath = _g[_f];
                            return [4 /*yield*/, firstExistingSource(contractRoots, contractPath)];
                        case 18:
                            source = _j.sent();
                            if (!source) return [3 /*break*/, 20];
                            return [4 /*yield*/, copyFile(source, contractPath)];
                        case 19:
                            _j.sent();
                            return [3 /*break*/, 21];
                        case 20:
                            missingContracts.push(contractPath);
                            _j.label = 21;
                        case 21:
                            _f++;
                            return [3 /*break*/, 17];
                        case 22:
                            metadata = {
                                schemaVersion: 'flow.workflow-export/v1',
                                exportedAt: exportedAt,
                                workflowId: workflow.id,
                                workflowName: workflow.name,
                                sourceWorkflowFile: workflow.file,
                                counts: {
                                    agents: referencedAgentPaths(workflow).length,
                                    contracts: referencedContractPaths(workflow).length,
                                    missingAgents: missingAgents.length,
                                    missingContracts: missingContracts.length
                                }
                            };
                            return [4 /*yield*/, addFile('metadata.json', "".concat(JSON.stringify(metadata, undefined, 2), "\n"))];
                        case 23:
                            _j.sent();
                            manifest = {
                                schemaVersion: 'flow.workflow-export-manifest/v1',
                                packageType: 'flow.workflow',
                                workflowId: workflow.id,
                                workflowFile: workflowPackagePath,
                                exportedAt: exportedAt,
                                files: __spreadArray(__spreadArray([], files, true), ['manifest.json'], false).sort(),
                                agents: referencedAgentPaths(workflow),
                                contracts: referencedContractPaths(workflow),
                                missingAgents: missingAgents,
                                missingContracts: missingContracts
                            };
                            return [4 /*yield*/, addFile('manifest.json', "".concat(JSON.stringify(manifest, undefined, 2), "\n"))];
                        case 24:
                            _j.sent();
                            return [2 /*return*/, {
                                    path: exportDir,
                                    uri: file_uri_1.FileUri.create(exportDir).toString(),
                                    workflowId: workflow.id,
                                    manifestPath: path.join(exportDir, 'manifest.json'),
                                    files: __spreadArray([], files, true).sort(),
                                    missingAgents: missingAgents,
                                    missingContracts: missingContracts
                                }];
                    }
                });
            });
        };
        FlowStore_1.prototype.exportRun = function (workspaceRootUri, workflow, run, targetPathOrUri) {
            return __awaiter(this, void 0, void 0, function () {
                var exportedAt, exportDir, _a, _b, _c, files, missingArtifacts, addFile, copyFile, safeRun, runForExport, issues, capabilities, agents, contracts, memoryWrites, finalReport, _i, _d, artifact, source, packagePath, _e, manifest;
                var _this = this;
                var _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            exportedAt = new Date().toISOString();
                            if (!targetPathOrUri) return [3 /*break*/, 1];
                            _a = normalizeWindowsDriveLetter(path.resolve(this.fsPath(targetPathOrUri)));
                            return [3 /*break*/, 3];
                        case 1:
                            _c = (_b = path).join;
                            return [4 /*yield*/, this.ensureDir(workspaceRootUri, 'exports')];
                        case 2:
                            _a = _c.apply(_b, [_g.sent(), "".concat(sanitizeFileName(run.id), "-").concat(timestampFilePart(exportedAt))]);
                            _g.label = 3;
                        case 3:
                            exportDir = _a;
                            return [4 /*yield*/, fs.rm(exportDir, { recursive: true, force: true })];
                        case 4:
                            _g.sent();
                            return [4 /*yield*/, fs.mkdir(exportDir, { recursive: true })];
                        case 5:
                            _g.sent();
                            files = [];
                            missingArtifacts = [];
                            addFile = function (relativePath, content) { return __awaiter(_this, void 0, void 0, function () {
                                var target;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            target = safePackagePath(exportDir, relativePath);
                                            return [4 /*yield*/, fs.mkdir(path.dirname(target), { recursive: true })];
                                        case 1:
                                            _a.sent();
                                            return [4 /*yield*/, fs.writeFile(target, content)];
                                        case 2:
                                            _a.sent();
                                            files.push(relativePath.split(path.sep).join('/'));
                                            return [2 /*return*/];
                                    }
                                });
                            }); };
                            copyFile = function (source, relativePath) { return __awaiter(_this, void 0, void 0, function () {
                                var target;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            target = safePackagePath(exportDir, relativePath);
                                            return [4 /*yield*/, fs.mkdir(path.dirname(target), { recursive: true })];
                                        case 1:
                                            _a.sent();
                                            return [4 /*yield*/, fs.copyFile(source, target)];
                                        case 2:
                                            _a.sent();
                                            files.push(relativePath.split(path.sep).join('/'));
                                            return [2 /*return*/];
                                    }
                                });
                            }); };
                            safeRun = (0, common_1.redactFlowRunForDisplay)(run);
                            runForExport = kernelCompatibleRunExport(workflow, safeRun);
                            return [4 /*yield*/, addFile('run.json', "".concat(JSON.stringify(runForExport, undefined, 2), "\n"))];
                        case 6:
                            _g.sent();
                            return [4 /*yield*/, addFile('events.jsonl', safeRun.events.map(function (event) { return JSON.stringify(event); }).join('\n') + (safeRun.events.length ? '\n' : ''))];
                        case 7:
                            _g.sent();
                            return [4 /*yield*/, addFile('artifacts.json', "".concat(JSON.stringify(safeRun.artifacts, undefined, 2), "\n"))];
                        case 8:
                            _g.sent();
                            return [4 /*yield*/, addFile('effects.json', "".concat(JSON.stringify(safeRun.effects, undefined, 2), "\n"))];
                        case 9:
                            _g.sent();
                            issues = collectRunIssues(safeRun);
                            return [4 /*yield*/, addFile('issues.json', "".concat(JSON.stringify(issues, undefined, 2), "\n"))];
                        case 10:
                            _g.sent();
                            capabilities = ((_f = workflow.requires) === null || _f === void 0 ? void 0 : _f.capabilities) || [];
                            agents = collectRunAgents(workflow, safeRun);
                            contracts = referencedContractPaths(workflow);
                            memoryWrites = collectRunMemoryWrites(safeRun);
                            finalReport = buildRunExportReport(safeRun, issues, exportedAt, capabilities, agents, contracts, memoryWrites);
                            return [4 /*yield*/, addFile('capabilities.json', "".concat(JSON.stringify(capabilities, undefined, 2), "\n"))];
                        case 11:
                            _g.sent();
                            return [4 /*yield*/, addFile('agents.json', "".concat(JSON.stringify(agents, undefined, 2), "\n"))];
                        case 12:
                            _g.sent();
                            return [4 /*yield*/, addFile('contracts.json', "".concat(JSON.stringify(contracts, undefined, 2), "\n"))];
                        case 13:
                            _g.sent();
                            return [4 /*yield*/, addFile('memory-writes.json', "".concat(JSON.stringify(memoryWrites, undefined, 2), "\n"))];
                        case 14:
                            _g.sent();
                            return [4 /*yield*/, addFile('final-report.json', "".concat(JSON.stringify(finalReport, undefined, 2), "\n"))];
                        case 15:
                            _g.sent();
                            return [4 /*yield*/, addFile('final-report.md', renderRunExportReport(finalReport))];
                        case 16:
                            _g.sent();
                            _i = 0, _d = safeRun.artifacts;
                            _g.label = 17;
                        case 17:
                            if (!(_i < _d.length)) return [3 /*break*/, 23];
                            artifact = _d[_i];
                            source = this.resolveArtifactSource(workspaceRootUri, run.id, artifact);
                            packagePath = "artifacts/".concat(sanitizeFileName(artifact.stateId || 'state'), "/").concat(safeArtifactPackageName(artifact));
                            _e = source;
                            if (!_e) return [3 /*break*/, 19];
                            return [4 /*yield*/, fileExists(source)];
                        case 18:
                            _e = (_g.sent());
                            _g.label = 19;
                        case 19:
                            if (!_e) return [3 /*break*/, 21];
                            return [4 /*yield*/, copyFile(source, packagePath)];
                        case 20:
                            _g.sent();
                            return [3 /*break*/, 22];
                        case 21:
                            missingArtifacts.push(artifact.uri);
                            _g.label = 22;
                        case 22:
                            _i++;
                            return [3 /*break*/, 17];
                        case 23:
                            manifest = {
                                schemaVersion: 'flow.run-export-manifest/v1',
                                packageType: 'flow.run',
                                runId: run.id,
                                workflowId: run.workflowId,
                                exportedAt: exportedAt,
                                eventCount: run.events.length,
                                artifactCount: run.artifacts.length,
                                capabilityCount: capabilities.length,
                                agentCount: agents.length,
                                contractCount: contracts.length,
                                effectCount: run.effects.length,
                                issueCount: issues.length,
                                memoryWriteCount: memoryWrites.length,
                                finalReport: {
                                    json: 'final-report.json',
                                    markdown: 'final-report.md'
                                },
                                components: {
                                    capabilities: 'capabilities.json',
                                    agents: 'agents.json',
                                    contracts: 'contracts.json',
                                    artifacts: 'artifacts.json',
                                    effects: 'effects.json',
                                    issues: 'issues.json',
                                    memoryWrites: 'memory-writes.json'
                                },
                                files: __spreadArray(__spreadArray([], files, true), ['manifest.json'], false).sort(),
                                missingArtifacts: missingArtifacts
                            };
                            return [4 /*yield*/, addFile('manifest.json', "".concat(JSON.stringify(manifest, undefined, 2), "\n"))];
                        case 24:
                            _g.sent();
                            return [2 /*return*/, {
                                    path: exportDir,
                                    uri: file_uri_1.FileUri.create(exportDir).toString(),
                                    runId: run.id,
                                    manifestPath: path.join(exportDir, 'manifest.json'),
                                    files: __spreadArray([], files, true).sort(),
                                    missingArtifacts: missingArtifacts
                                }];
                    }
                });
            });
        };
        FlowStore_1.prototype.importRun = function (workspaceRootUri, filePathOrUri) {
            return __awaiter(this, void 0, void 0, function () {
                var source, packageSource, runFile, eventsFile, manifestFile, _a, kernelRun, events, manifest, workflow, importedAt, packageDir, _b, _c, run, saved;
                var _this = this;
                var _d, _e, _f, _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0:
                            source = this.fsPath(filePathOrUri);
                            return [4 /*yield*/, this.runExportDir(source)];
                        case 1:
                            packageSource = _h.sent();
                            runFile = path.join(packageSource, 'run.json');
                            eventsFile = path.join(packageSource, 'events.jsonl');
                            manifestFile = path.join(packageSource, 'manifest.json');
                            return [4 /*yield*/, Promise.all([
                                    this.readJson(runFile),
                                    this.readJsonLines(eventsFile),
                                    fileExists(manifestFile).then(function (exists) { return exists ? _this.readJson(manifestFile) : undefined; })
                                ])];
                        case 2:
                            _a = _h.sent(), kernelRun = _a[0], events = _a[1], manifest = _a[2];
                            workflow = __assign(__assign({}, kernelRun.workflow), { id: ((_d = kernelRun.workflow) === null || _d === void 0 ? void 0 : _d.id) || kernelRun.workflowId, name: ((_e = kernelRun.workflow) === null || _e === void 0 ? void 0 : _e.name) || kernelRun.workflowId, states: ((_f = kernelRun.workflow) === null || _f === void 0 ? void 0 : _f.states) || {}, transitions: ((_g = kernelRun.workflow) === null || _g === void 0 ? void 0 : _g.transitions) || [] });
                            importedAt = new Date().toISOString();
                            _c = (_b = path).join;
                            return [4 /*yield*/, this.ensureDir(workspaceRootUri, 'runs')];
                        case 3:
                            packageDir = _c.apply(_b, [_h.sent(), sanitizeFileName(kernelRun.id), 'import']);
                            if (!(path.resolve(packageSource) !== path.resolve(packageDir))) return [3 /*break*/, 6];
                            return [4 /*yield*/, fs.rm(packageDir, { recursive: true, force: true })];
                        case 4:
                            _h.sent();
                            return [4 /*yield*/, copyDirectory(packageSource, packageDir)];
                        case 5:
                            _h.sent();
                            _h.label = 6;
                        case 6:
                            run = (0, flow_kernel_bridge_1.mapKernelRunToFlowRun)(workflow, kernelRun.input || '', kernelRun, events, {
                                kernelRunId: kernelRun.id,
                                storeDir: packageDir
                            });
                            run = __assign(__assign({}, run), { executionMode: 'kernel_external', executionModeMessage: 'Imported audit package. This run is read-only.', audit: {
                                    readOnly: true,
                                    importedAt: importedAt,
                                    sourcePath: packageSource,
                                    packagePath: packageDir,
                                    workflow: __assign(__assign({}, workflow), { file: {
                                            path: path.join(packageDir, 'run.json'),
                                            uri: file_uri_1.FileUri.create(path.join(packageDir, 'run.json')).toString(),
                                            format: JSON_FORMAT,
                                            updatedAt: importedAt,
                                            editable: false,
                                            unsupportedReason: 'Workflow embedded in an imported run audit package is read-only.'
                                        } }),
                                    manifest: manifest
                                }, artifacts: run.artifacts.map(function (artifact) { return (__assign(__assign({}, artifact), { uri: _this.importedArtifactUri(packageDir, artifact.uri) })); }), workloads: run.workloads.map(function (workload) { return (__assign(__assign({}, workload), { outputArtifacts: workload.outputArtifacts.map(function (artifact) { return _this.importedArtifactUri(packageDir, artifact); }) })); }) });
                            return [4 /*yield*/, this.saveRun(workspaceRootUri, run)];
                        case 7:
                            _h.sent();
                            return [4 /*yield*/, this.getRun(workspaceRootUri, run.id)];
                        case 8:
                            saved = _h.sent();
                            if (!saved) {
                                throw new Error("Imported run \"".concat(run.id, "\" could not be reloaded."));
                            }
                            return [2 /*return*/, saved];
                    }
                });
            });
        };
        FlowStore_1.prototype.saveWorkflow = function (workspaceRootUri_1, workflow_1, filePathOrUri_1) {
            return __awaiter(this, arguments, void 0, function (workspaceRootUri, workflow, filePathOrUri, version) {
                var file, _a, _b, format, before, saved;
                var _c;
                if (version === void 0) { version = {}; }
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            if (!filePathOrUri) return [3 /*break*/, 1];
                            _a = this.fsPath(filePathOrUri);
                            return [3 /*break*/, 4];
                        case 1:
                            _b = ((_c = workflow.file) === null || _c === void 0 ? void 0 : _c.path);
                            if (_b) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.workflowFile(workspaceRootUri, workflow.id)];
                        case 2:
                            _b = (_d.sent());
                            _d.label = 3;
                        case 3:
                            _a = _b;
                            _d.label = 4;
                        case 4:
                            file = _a;
                            format = workflowFileFormat(file);
                            return [4 /*yield*/, this.readWorkflowFile(file).catch(function () { return undefined; })];
                        case 5:
                            before = _d.sent();
                            if (!(format === JSON_FORMAT)) return [3 /*break*/, 7];
                            return [4 /*yield*/, this.writeJson(file, stripFileMetadata(workflow))];
                        case 6:
                            _d.sent();
                            return [3 /*break*/, 10];
                        case 7:
                            if (!(format === YAML_FORMAT)) return [3 /*break*/, 9];
                            return [4 /*yield*/, this.writeYaml(file, stripFileMetadata(workflow))];
                        case 8:
                            _d.sent();
                            return [3 /*break*/, 10];
                        case 9: throw new Error("Unsupported workflow file format for \"".concat(file, "\". Use .json, .yaml, or .yml."));
                        case 10: return [4 /*yield*/, this.readWorkflowFile(file)];
                        case 11:
                            saved = _d.sent();
                            return [4 /*yield*/, this.recordWorkflowVersion(workspaceRootUri, saved, before, {
                                    author: version.author,
                                    origin: version.origin || (before ? 'save' : 'create'),
                                    message: version.message
                                })];
                        case 12:
                            _d.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        FlowStore_1.prototype.listWorkflowVersions = function (workspaceRootUri, workflowId) {
            return __awaiter(this, void 0, void 0, function () {
                var dir, entries, versions, _i, entries_2, entry, _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.workflowHistoryDir(workspaceRootUri, workflowId)];
                        case 1:
                            dir = _c.sent();
                            return [4 /*yield*/, fs.readdir(dir, { withFileTypes: true }).catch(function () { return []; })];
                        case 2:
                            entries = _c.sent();
                            versions = [];
                            _i = 0, entries_2 = entries;
                            _c.label = 3;
                        case 3:
                            if (!(_i < entries_2.length)) return [3 /*break*/, 6];
                            entry = entries_2[_i];
                            if (!(entry.isFile() && entry.name.endsWith('.json'))) return [3 /*break*/, 5];
                            _b = (_a = versions).push;
                            return [4 /*yield*/, this.readJson(path.join(dir, entry.name))];
                        case 4:
                            _b.apply(_a, [_c.sent()]);
                            _c.label = 5;
                        case 5:
                            _i++;
                            return [3 /*break*/, 3];
                        case 6: return [2 /*return*/, versions.sort(function (left, right) { return right.createdAt.localeCompare(left.createdAt); })];
                    }
                });
            });
        };
        FlowStore_1.prototype.restoreWorkflowVersion = function (workspaceRootUri_1, workflowId_1, versionId_1) {
            return __awaiter(this, arguments, void 0, function (workspaceRootUri, workflowId, versionId, options) {
                var versions, version, file, _a, restored;
                var _b;
                if (options === void 0) { options = {}; }
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.listWorkflowVersions(workspaceRootUri, workflowId)];
                        case 1:
                            versions = _c.sent();
                            version = versions.find(function (candidate) { return candidate.id === versionId; });
                            if (!version) {
                                throw new Error("Workflow version \"".concat(versionId, "\" was not found for \"").concat(workflowId, "\"."));
                            }
                            return [4 /*yield*/, this.findWorkflowFile(workspaceRootUri, workflowId)];
                        case 2:
                            _a = (_c.sent());
                            if (_a) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.workflowFile(workspaceRootUri, workflowId, ((_b = version.workflow.file) === null || _b === void 0 ? void 0 : _b.format) || JSON_FORMAT)];
                        case 3:
                            _a = (_c.sent());
                            _c.label = 4;
                        case 4:
                            file = _a;
                            return [4 /*yield*/, this.saveWorkflow(workspaceRootUri, __assign(__assign({}, version.workflow), { file: undefined }), file, {
                                    author: options.author,
                                    origin: 'restore',
                                    message: options.message || "Restored version ".concat(versionId)
                                })];
                        case 5:
                            _c.sent();
                            return [4 /*yield*/, this.getWorkflow(workspaceRootUri, workflowId)];
                        case 6:
                            restored = _c.sent();
                            if (!restored) {
                                throw new Error("Restored workflow \"".concat(workflowId, "\" could not be reloaded."));
                            }
                            return [2 /*return*/, restored];
                    }
                });
            });
        };
        FlowStore_1.prototype.listWorkspacePipelinePresets = function (workspaceRootUri) {
            return __awaiter(this, void 0, void 0, function () {
                var dir, entries, presets, _i, entries_3, entry, _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.ensureDir(workspaceRootUri, 'presets')];
                        case 1:
                            dir = _c.sent();
                            return [4 /*yield*/, fs.readdir(dir, { withFileTypes: true }).catch(function () { return []; })];
                        case 2:
                            entries = _c.sent();
                            presets = [];
                            _i = 0, entries_3 = entries;
                            _c.label = 3;
                        case 3:
                            if (!(_i < entries_3.length)) return [3 /*break*/, 6];
                            entry = entries_3[_i];
                            if (!(entry.isFile() && entry.name.endsWith('.json'))) return [3 /*break*/, 5];
                            _b = (_a = presets).push;
                            return [4 /*yield*/, this.readJson(path.join(dir, entry.name))];
                        case 4:
                            _b.apply(_a, [_c.sent()]);
                            _c.label = 5;
                        case 5:
                            _i++;
                            return [3 /*break*/, 3];
                        case 6: return [2 /*return*/, presets
                                .map(function (preset) { return (__assign(__assign({}, preset), { source: 'workspace' })); })
                                .sort(function (left, right) { return left.name.localeCompare(right.name); })];
                    }
                });
            });
        };
        FlowStore_1.prototype.getWorkspacePipelinePreset = function (workspaceRootUri, presetId) {
            return __awaiter(this, void 0, void 0, function () {
                var file, _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.pipelinePresetFile(workspaceRootUri, presetId)];
                        case 1:
                            file = _c.sent();
                            _c.label = 2;
                        case 2:
                            _c.trys.push([2, 4, , 5]);
                            _a = [{}];
                            return [4 /*yield*/, this.readJson(file)];
                        case 3: return [2 /*return*/, __assign.apply(void 0, [__assign.apply(void 0, _a.concat([_c.sent()])), { source: 'workspace' }])];
                        case 4:
                            _b = _c.sent();
                            return [2 /*return*/, undefined];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        FlowStore_1.prototype.savePipelinePreset = function (workspaceRootUri_1, preset_1) {
            return __awaiter(this, arguments, void 0, function (workspaceRootUri, preset, options) {
                var normalized, validation, file, _a, _b;
                if (options === void 0) { options = {}; }
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            normalized = normalizeWorkspacePreset(preset);
                            validation = (0, common_1.validateFlowPipelinePreset)(normalized);
                            if (!validation.valid) {
                                throw new Error("Pipeline preset \"".concat(preset.id || 'unnamed', "\" is invalid: ").concat(validation.errors.map(function (error) { return error.message; }).join('; ')));
                            }
                            return [4 /*yield*/, this.pipelinePresetFile(workspaceRootUri, normalized.id)];
                        case 1:
                            file = _c.sent();
                            _a = !options.overwrite;
                            if (!_a) return [3 /*break*/, 3];
                            return [4 /*yield*/, fileExists(file)];
                        case 2:
                            _a = (_c.sent());
                            _c.label = 3;
                        case 3:
                            if (_a) {
                                throw new Error("Pipeline preset \"".concat(normalized.id, "\" already exists."));
                            }
                            return [4 /*yield*/, this.writeJson(file, normalized)];
                        case 4:
                            _c.sent();
                            _b = [{}];
                            return [4 /*yield*/, this.readJson(file)];
                        case 5: return [2 /*return*/, __assign.apply(void 0, [__assign.apply(void 0, _b.concat([_c.sent()])), { source: 'workspace' }])];
                    }
                });
            });
        };
        FlowStore_1.prototype.listWorkspaceModelProfiles = function (workspaceRootUri) {
            return __awaiter(this, void 0, void 0, function () {
                var dir, entries, profiles, _i, entries_4, entry, _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.ensureDir(workspaceRootUri, 'model-profiles')];
                        case 1:
                            dir = _d.sent();
                            return [4 /*yield*/, fs.readdir(dir, { withFileTypes: true }).catch(function () { return []; })];
                        case 2:
                            entries = _d.sent();
                            profiles = [];
                            _i = 0, entries_4 = entries;
                            _d.label = 3;
                        case 3:
                            if (!(_i < entries_4.length)) return [3 /*break*/, 6];
                            entry = entries_4[_i];
                            if (!(entry.isFile() && entry.name.endsWith('.json'))) return [3 /*break*/, 5];
                            _b = (_a = profiles).push;
                            _c = common_1.normalizeFlowModelProfile;
                            return [4 /*yield*/, this.readJson(path.join(dir, entry.name))];
                        case 4:
                            _b.apply(_a, [_c.apply(void 0, [_d.sent()])]);
                            _d.label = 5;
                        case 5:
                            _i++;
                            return [3 /*break*/, 3];
                        case 6: return [2 /*return*/, profiles.sort(function (left, right) { return left.name.localeCompare(right.name); })];
                    }
                });
            });
        };
        FlowStore_1.prototype.saveModelProfile = function (workspaceRootUri, profile) {
            return __awaiter(this, void 0, void 0, function () {
                var normalized, file, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            normalized = (0, common_1.normalizeFlowModelProfile)(profile);
                            return [4 /*yield*/, this.modelProfileFile(workspaceRootUri, normalized.id)];
                        case 1:
                            file = _b.sent();
                            return [4 /*yield*/, this.writeJson(file, normalized)];
                        case 2:
                            _b.sent();
                            _a = common_1.normalizeFlowModelProfile;
                            return [4 /*yield*/, this.readJson(file)];
                        case 3: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        FlowStore_1.prototype.createWorkflowFromPreset = function (workspaceRootUri_1, preset_1) {
            return __awaiter(this, arguments, void 0, function (workspaceRootUri, preset, options) {
                var validation, identity, workflow, saved;
                if (options === void 0) { options = {}; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            validation = (0, common_1.validateFlowPipelinePreset)(preset);
                            if (!validation.valid) {
                                throw new Error("Pipeline preset \"".concat(preset.id || 'unnamed', "\" is invalid: ").concat(validation.errors.map(function (error) { return error.message; }).join('; ')));
                            }
                            return [4 /*yield*/, this.nextWorkflowIdentity(workspaceRootUri, options.workflowId || preset.workflow.id || preset.id, options.name || preset.workflow.name || preset.name)];
                        case 1:
                            identity = _a.sent();
                            workflow = (0, common_1.instantiateFlowPipelinePreset)(preset, {
                                id: identity.id,
                                name: identity.name,
                                description: options.description,
                                agentNodeOverrides: options.agentNodeOverrides
                            });
                            return [4 /*yield*/, this.saveWorkflow(workspaceRootUri, workflow, undefined, { origin: 'create', message: "Created from pipeline preset ".concat(preset.id) })];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, this.getWorkflow(workspaceRootUri, workflow.id)];
                        case 3:
                            saved = _a.sent();
                            if (!saved) {
                                throw new Error("Created workflow \"".concat(workflow.id, "\" could not be reloaded."));
                            }
                            return [2 /*return*/, saved];
                    }
                });
            });
        };
        FlowStore_1.prototype.createWorkflowFromTemplate = function (workspaceRootUri_1, templateId_1) {
            return __awaiter(this, arguments, void 0, function (workspaceRootUri, templateId, options) {
                var template, identity, workflow, saved;
                if (options === void 0) { options = {}; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            template = (0, common_1.listFlowWorkflowTemplates)().find(function (candidate) { return candidate.id === templateId; });
                            if (!template) {
                                throw new Error("Unknown flow workflow template \"".concat(templateId, "\"."));
                            }
                            return [4 /*yield*/, this.nextWorkflowIdentity(workspaceRootUri, options.workflowId || template.id, options.name || template.name)];
                        case 1:
                            identity = _a.sent();
                            workflow = (0, common_1.instantiateFlowWorkflowTemplate)(templateId, {
                                id: identity.id,
                                name: identity.name,
                                description: options.description
                            });
                            return [4 /*yield*/, this.saveWorkflow(workspaceRootUri, workflow, undefined, { origin: 'create', message: "Created from template ".concat(templateId) })];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, this.getWorkflow(workspaceRootUri, workflow.id)];
                        case 3:
                            saved = _a.sent();
                            if (!saved) {
                                throw new Error("Created workflow \"".concat(workflow.id, "\" could not be reloaded."));
                            }
                            return [2 /*return*/, saved];
                    }
                });
            });
        };
        FlowStore_1.prototype.createWorkflowFromPattern = function (workspaceRootUri, workflow, patternId) {
            return __awaiter(this, void 0, void 0, function () {
                var identity, generatedWorkflow, validation, saved;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.nextWorkflowIdentity(workspaceRootUri, workflow.id, workflow.name)];
                        case 1:
                            identity = _a.sent();
                            generatedWorkflow = __assign(__assign({}, workflow), { id: identity.id, name: identity.name });
                            validation = (0, common_1.validateFlowWorkflow)(generatedWorkflow);
                            if (!validation.valid) {
                                throw new Error("Generated workflow pattern \"".concat(patternId, "\" is invalid: ").concat(validation.errors.map(function (error) { return error.message; }).join('; ')));
                            }
                            return [4 /*yield*/, this.saveWorkflow(workspaceRootUri, generatedWorkflow, undefined, { origin: 'create', message: "Created from workflow pattern ".concat(patternId) })];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, this.getWorkflow(workspaceRootUri, generatedWorkflow.id)];
                        case 3:
                            saved = _a.sent();
                            if (!saved) {
                                throw new Error("Created workflow \"".concat(generatedWorkflow.id, "\" could not be reloaded."));
                            }
                            return [2 /*return*/, saved];
                    }
                });
            });
        };
        FlowStore_1.prototype.createWorkflowFromGeneratedWorkflow = function (workspaceRootUri, workflow, source) {
            return __awaiter(this, void 0, void 0, function () {
                var identity, generatedWorkflow, validation, saved;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.nextWorkflowIdentity(workspaceRootUri, workflow.id, workflow.name)];
                        case 1:
                            identity = _a.sent();
                            generatedWorkflow = __assign(__assign({}, workflow), { id: identity.id, name: identity.name });
                            validation = (0, common_1.validateFlowWorkflow)(generatedWorkflow);
                            if (!validation.valid) {
                                throw new Error("AI-authored workflow \"".concat(source, "\" is invalid: ").concat(validation.errors.map(function (error) { return error.message; }).join('; ')));
                            }
                            return [4 /*yield*/, this.saveWorkflow(workspaceRootUri, generatedWorkflow, undefined, { origin: 'ai-authoring', message: "Created from AI authoring draft ".concat(source) })];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, this.getWorkflow(workspaceRootUri, generatedWorkflow.id)];
                        case 3:
                            saved = _a.sent();
                            if (!saved) {
                                throw new Error("Created AI-authored workflow \"".concat(generatedWorkflow.id, "\" could not be reloaded."));
                            }
                            return [2 /*return*/, saved];
                    }
                });
            });
        };
        FlowStore_1.prototype.listRuns = function (workspaceRootUri) {
            return __awaiter(this, void 0, void 0, function () {
                var dir, entries, runs, _i, entries_5, entry, _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.ensureDir(workspaceRootUri, 'runs')];
                        case 1:
                            dir = _c.sent();
                            return [4 /*yield*/, fs.readdir(dir, { withFileTypes: true })];
                        case 2:
                            entries = _c.sent();
                            runs = [];
                            _i = 0, entries_5 = entries;
                            _c.label = 3;
                        case 3:
                            if (!(_i < entries_5.length)) return [3 /*break*/, 6];
                            entry = entries_5[_i];
                            if (!(entry.isFile() && entry.name.endsWith('.json'))) return [3 /*break*/, 5];
                            _b = (_a = runs).push;
                            return [4 /*yield*/, this.readRunFile(path.join(dir, entry.name))];
                        case 4:
                            _b.apply(_a, [_c.sent()]);
                            _c.label = 5;
                        case 5:
                            _i++;
                            return [3 /*break*/, 3];
                        case 6: return [2 /*return*/, runs.sort(function (left, right) { return right.updatedAt.localeCompare(left.updatedAt); })];
                    }
                });
            });
        };
        FlowStore_1.prototype.getRun = function (workspaceRootUri, runId) {
            return __awaiter(this, void 0, void 0, function () {
                var file, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.runFile(workspaceRootUri, runId)];
                        case 1:
                            file = _b.sent();
                            _b.label = 2;
                        case 2:
                            _b.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.readRunFile(file)];
                        case 3: return [2 /*return*/, _b.sent()];
                        case 4:
                            _a = _b.sent();
                            return [2 /*return*/, undefined];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        FlowStore_1.prototype.saveRun = function (workspaceRootUri, run) {
            return __awaiter(this, void 0, void 0, function () {
                var file;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.runFile(workspaceRootUri, run.id)];
                        case 1:
                            file = _a.sent();
                            return [4 /*yield*/, this.writeJson(file, stripFileMetadata((0, common_1.redactFlowRunForDisplay)(run)))];
                        case 2:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        FlowStore_1.prototype.cleanupRuns = function (workspaceRootUri_1, runIds_1) {
            return __awaiter(this, arguments, void 0, function (workspaceRootUri, runIds, options) {
                var removedRuns, removedPaths, failed, runsDir, _i, runIds_2, runId, safeRunId, runFile, run, _a, error_1, artifactDir, error_2, worktreePath, worktreesRoot, error_3;
                var _b;
                if (options === void 0) { options = {}; }
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            removedRuns = [];
                            removedPaths = [];
                            failed = [];
                            return [4 /*yield*/, this.ensureDir(workspaceRootUri, 'runs')];
                        case 1:
                            runsDir = _c.sent();
                            _i = 0, runIds_2 = runIds;
                            _c.label = 2;
                        case 2:
                            if (!(_i < runIds_2.length)) return [3 /*break*/, 20];
                            runId = runIds_2[_i];
                            safeRunId = sanitizeFileName(runId);
                            runFile = path.join(runsDir, "".concat(safeRunId, ".json"));
                            run = void 0;
                            _c.label = 3;
                        case 3:
                            _c.trys.push([3, 5, , 6]);
                            return [4 /*yield*/, this.readRunFile(runFile)];
                        case 4:
                            run = _c.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            _a = _c.sent();
                            run = undefined;
                            return [3 /*break*/, 6];
                        case 6:
                            _c.trys.push([6, 8, , 9]);
                            return [4 /*yield*/, fs.rm(runFile, { force: true })];
                        case 7:
                            _c.sent();
                            removedRuns.push(runId);
                            removedPaths.push(runFile);
                            return [3 /*break*/, 9];
                        case 8:
                            error_1 = _c.sent();
                            failed.push({ id: runId, path: runFile, message: error_1 instanceof Error ? error_1.message : String(error_1) });
                            return [3 /*break*/, 9];
                        case 9:
                            if (!(options.includeArtifacts !== false)) return [3 /*break*/, 13];
                            artifactDir = path.join(runsDir, safeRunId);
                            _c.label = 10;
                        case 10:
                            _c.trys.push([10, 12, , 13]);
                            return [4 /*yield*/, fs.rm(artifactDir, { recursive: true, force: true })];
                        case 11:
                            _c.sent();
                            removedPaths.push(artifactDir);
                            return [3 /*break*/, 13];
                        case 12:
                            error_2 = _c.sent();
                            failed.push({ id: runId, path: artifactDir, message: error_2 instanceof Error ? error_2.message : String(error_2) });
                            return [3 /*break*/, 13];
                        case 13:
                            if (!(options.includeWorktrees && ((_b = run === null || run === void 0 ? void 0 : run.workspace) === null || _b === void 0 ? void 0 : _b.rootUri))) return [3 /*break*/, 19];
                            worktreePath = file_uri_1.FileUri.fsPath(run.workspace.rootUri);
                            worktreesRoot = path.join(storageRoot(workspaceRootUri), 'worktrees');
                            if (!isSubPath(worktreesRoot, worktreePath)) return [3 /*break*/, 18];
                            _c.label = 14;
                        case 14:
                            _c.trys.push([14, 16, , 17]);
                            return [4 /*yield*/, fs.rm(worktreePath, { recursive: true, force: true })];
                        case 15:
                            _c.sent();
                            removedPaths.push(worktreePath);
                            return [3 /*break*/, 17];
                        case 16:
                            error_3 = _c.sent();
                            failed.push({ id: runId, path: worktreePath, message: error_3 instanceof Error ? error_3.message : String(error_3) });
                            return [3 /*break*/, 17];
                        case 17: return [3 /*break*/, 19];
                        case 18:
                            failed.push({ id: runId, path: worktreePath, message: 'Refusing to remove a workspace that is not inside the Flow worktrees directory.' });
                            _c.label = 19;
                        case 19:
                            _i++;
                            return [3 /*break*/, 2];
                        case 20: return [2 /*return*/, { removedRuns: removedRuns, removedPaths: removedPaths, failed: failed }];
                    }
                });
            });
        };
        FlowStore_1.prototype.writeRunReport = function (workspaceRootUri, runId, relativePath, content) {
            return __awaiter(this, void 0, void 0, function () {
                var dir, _a, _b, file;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _b = (_a = path).join;
                            return [4 /*yield*/, this.ensureDir(workspaceRootUri, 'runs')];
                        case 1:
                            dir = _b.apply(_a, [_c.sent(), sanitizeFileName(runId), 'final']);
                            return [4 /*yield*/, fs.mkdir(dir, { recursive: true })];
                        case 2:
                            _c.sent();
                            file = path.join(dir, sanitizeFileName(relativePath || 'report.md'));
                            return [4 /*yield*/, fs.writeFile(file, (0, common_1.redactFlowSecretsText)(content) || '', 'utf8')];
                        case 3:
                            _c.sent();
                            return [2 /*return*/, file_uri_1.FileUri.create(file).toString()];
                    }
                });
            });
        };
        FlowStore_1.prototype.workflowFileMetadata = function (workspaceRootUri, workflowId) {
            return __awaiter(this, void 0, void 0, function () {
                var file, _a, format;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.findWorkflowFile(workspaceRootUri, workflowId)];
                        case 1:
                            _a = (_b.sent());
                            if (_a) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.workflowFile(workspaceRootUri, workflowId)];
                        case 2:
                            _a = (_b.sent());
                            _b.label = 3;
                        case 3:
                            file = _a;
                            format = workflowFileFormat(file);
                            return [2 /*return*/, this.fileMetadata(file, format, format === JSON_FORMAT || format === YAML_FORMAT)];
                    }
                });
            });
        };
        FlowStore_1.prototype.runFileMetadata = function (workspaceRootUri, runId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = this.fileMetadata;
                            return [4 /*yield*/, this.runFile(workspaceRootUri, runId)];
                        case 1: return [2 /*return*/, _a.apply(this, [_b.sent(), JSON_FORMAT, true])];
                    }
                });
            });
        };
        FlowStore_1.prototype.workflowFile = function (workspaceRootUri_1, workflowId_1) {
            return __awaiter(this, arguments, void 0, function (workspaceRootUri, workflowId, format) {
                var dir;
                if (format === void 0) { format = JSON_FORMAT; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.ensureDir(workspaceRootUri, 'workflows')];
                        case 1:
                            dir = _a.sent();
                            return [2 /*return*/, path.join(dir, "".concat(sanitizeFileName(workflowId)).concat(workflowExtension(format)))];
                    }
                });
            });
        };
        FlowStore_1.prototype.pipelinePresetFile = function (workspaceRootUri, presetId) {
            return __awaiter(this, void 0, void 0, function () {
                var dir;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.ensureDir(workspaceRootUri, 'presets')];
                        case 1:
                            dir = _a.sent();
                            return [2 /*return*/, path.join(dir, "".concat(sanitizeFileName(sanitizeWorkflowId(presetId)), ".json"))];
                    }
                });
            });
        };
        FlowStore_1.prototype.modelProfileFile = function (workspaceRootUri, profileId) {
            return __awaiter(this, void 0, void 0, function () {
                var dir;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.ensureDir(workspaceRootUri, 'model-profiles')];
                        case 1:
                            dir = _a.sent();
                            return [2 /*return*/, path.join(dir, "".concat(sanitizeFileName(profileId), ".json"))];
                    }
                });
            });
        };
        FlowStore_1.prototype.nextWorkflowIdentity = function (workspaceRootUri, requestedId, requestedName) {
            return __awaiter(this, void 0, void 0, function () {
                var baseId, workflows, existingIds, index, id, file, candidateExists;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            baseId = sanitizeWorkflowId(requestedId);
                            return [4 /*yield*/, this.listWorkflows(workspaceRootUri)];
                        case 1:
                            workflows = _a.sent();
                            existingIds = new Set(workflows.map(function (workflow) { return workflow.id; }));
                            index = 1;
                            _a.label = 2;
                        case 2:
                            id = index === 1 ? baseId : "".concat(baseId, "_").concat(index);
                            return [4 /*yield*/, this.workflowFile(workspaceRootUri, id)];
                        case 3:
                            file = _a.sent();
                            return [4 /*yield*/, fileExists(file)];
                        case 4:
                            candidateExists = _a.sent();
                            if (!existingIds.has(id) && !candidateExists) {
                                return [2 /*return*/, {
                                        id: id,
                                        name: index === 1 ? requestedName : "".concat(requestedName, " ").concat(index)
                                    }];
                            }
                            _a.label = 5;
                        case 5:
                            index++;
                            return [3 /*break*/, 2];
                        case 6: return [2 /*return*/];
                    }
                });
            });
        };
        FlowStore_1.prototype.runFile = function (workspaceRootUri, runId) {
            return __awaiter(this, void 0, void 0, function () {
                var dir;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.ensureDir(workspaceRootUri, 'runs')];
                        case 1:
                            dir = _a.sent();
                            return [2 /*return*/, path.join(dir, "".concat(sanitizeFileName(runId), ".json"))];
                    }
                });
            });
        };
        FlowStore_1.prototype.findWorkflowFile = function (workspaceRootUri, workflowId) {
            return __awaiter(this, void 0, void 0, function () {
                var dir, _i, WORKFLOW_EXTENSIONS_1, extension, candidate, _a, workflows;
                var _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.ensureDir(workspaceRootUri, 'workflows')];
                        case 1:
                            dir = _d.sent();
                            _i = 0, WORKFLOW_EXTENSIONS_1 = WORKFLOW_EXTENSIONS;
                            _d.label = 2;
                        case 2:
                            if (!(_i < WORKFLOW_EXTENSIONS_1.length)) return [3 /*break*/, 7];
                            extension = WORKFLOW_EXTENSIONS_1[_i];
                            candidate = path.join(dir, "".concat(sanitizeFileName(workflowId)).concat(extension));
                            _d.label = 3;
                        case 3:
                            _d.trys.push([3, 5, , 6]);
                            return [4 /*yield*/, fs.access(candidate)];
                        case 4:
                            _d.sent();
                            return [2 /*return*/, candidate];
                        case 5:
                            _a = _d.sent();
                            return [3 /*break*/, 6];
                        case 6:
                            _i++;
                            return [3 /*break*/, 2];
                        case 7: return [4 /*yield*/, this.listWorkflows(workspaceRootUri)];
                        case 8:
                            workflows = _d.sent();
                            return [2 /*return*/, (_c = (_b = workflows.find(function (workflow) { return workflow.id === workflowId; })) === null || _b === void 0 ? void 0 : _b.file) === null || _c === void 0 ? void 0 : _c.path];
                    }
                });
            });
        };
        FlowStore_1.prototype.ensureDir = function (workspaceRootUri, child) {
            return __awaiter(this, void 0, void 0, function () {
                var root, dir;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            root = storageRoot(workspaceRootUri);
                            dir = path.join(root, child);
                            return [4 /*yield*/, fs.mkdir(dir, { recursive: true })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, dir];
                    }
                });
            });
        };
        FlowStore_1.prototype.readJson = function (file) {
            return __awaiter(this, void 0, void 0, function () {
                var content;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, fs.readFile(file, 'utf8')];
                        case 1:
                            content = _a.sent();
                            return [2 /*return*/, JSON.parse(content)];
                    }
                });
            });
        };
        FlowStore_1.prototype.readJsonLines = function (file) {
            return __awaiter(this, void 0, void 0, function () {
                var content;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, fs.readFile(file, 'utf8')];
                        case 1:
                            content = _a.sent();
                            return [2 /*return*/, content.split(/\r?\n/)
                                    .map(function (line) { return line.trim(); })
                                    .filter(Boolean)
                                    .map(function (line) { return JSON.parse(line); })];
                    }
                });
            });
        };
        FlowStore_1.prototype.readWorkflowFile = function (file) {
            return __awaiter(this, void 0, void 0, function () {
                var format, _a, _b, content, workflow, _c;
                var _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            format = workflowFileFormat(file);
                            if (!(format === JSON_FORMAT)) return [3 /*break*/, 3];
                            _a = [{}];
                            return [4 /*yield*/, this.readJson(file)];
                        case 1:
                            _b = [__assign.apply(void 0, _a.concat([_f.sent()]))];
                            _d = {};
                            return [4 /*yield*/, this.fileMetadata(file, format, true)];
                        case 2: return [2 /*return*/, __assign.apply(void 0, _b.concat([(_d.file = _f.sent(), _d)]))];
                        case 3:
                            if (!(format === YAML_FORMAT)) return [3 /*break*/, 6];
                            return [4 /*yield*/, fs.readFile(file, 'utf8')];
                        case 4:
                            content = _f.sent();
                            workflow = yaml.load(content);
                            if (!workflow || typeof workflow !== 'object') {
                                throw new Error("YAML workflow \"".concat(file, "\" must contain a mapping object."));
                            }
                            _c = [__assign({}, workflow)];
                            _e = { version: workflow.version || 'flow.workflow/v1', id: workflow.id || path.basename(file, path.extname(file)), name: workflow.name || path.basename(file), states: workflow.states || {}, transitions: workflow.transitions || [] };
                            return [4 /*yield*/, this.fileMetadata(file, format, true)];
                        case 5: return [2 /*return*/, __assign.apply(void 0, _c.concat([(_e.file = _f.sent(), _e)]))];
                        case 6: throw new Error("Unsupported workflow file format for \"".concat(file, "\". Use .json, .yaml, or .yml."));
                    }
                });
            });
        };
        FlowStore_1.prototype.readRunFile = function (file) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, _b;
                var _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _a = [{}];
                            return [4 /*yield*/, this.readJson(file)];
                        case 1:
                            _b = [__assign.apply(void 0, _a.concat([_d.sent()]))];
                            _c = {};
                            return [4 /*yield*/, this.fileMetadata(file, JSON_FORMAT, true)];
                        case 2: return [2 /*return*/, __assign.apply(void 0, _b.concat([(_c.file = _d.sent(), _c)]))];
                    }
                });
            });
        };
        FlowStore_1.prototype.writeJson = function (file, value) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, fs.mkdir(path.dirname(file), { recursive: true })];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, fs.writeFile(file, "".concat(JSON.stringify(value, undefined, 2), "\n"), 'utf8')];
                        case 2:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        FlowStore_1.prototype.writeYaml = function (file, value) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, fs.mkdir(path.dirname(file), { recursive: true })];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, fs.writeFile(file, yaml.dump(value, { lineWidth: 120, noRefs: true, sortKeys: false }), 'utf8')];
                        case 2:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        FlowStore_1.prototype.recordWorkflowVersion = function (workspaceRootUri, workflow, before, options) {
            return __awaiter(this, void 0, void 0, function () {
                var createdAt, idBase, diff, version, dir, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            createdAt = new Date().toISOString();
                            idBase = "".concat(timestampFilePart(createdAt), "-").concat(sanitizeFileName(options.origin || 'save'));
                            diff = before ? (0, common_1.compareFlowWorkflowStructure)(before, workflow).items : [{
                                    kind: 'source',
                                    change: 'added',
                                    id: workflow.id,
                                    summary: 'Workflow created'
                                }];
                            version = {
                                id: idBase,
                                workflowId: workflow.id,
                                createdAt: createdAt,
                                author: options.author || process.env.USERNAME || process.env.USER || 'Flow',
                                origin: options.origin || 'save',
                                message: options.message,
                                workflow: stripFileMetadata(workflow),
                                file: workflow.file,
                                diff: diff
                            };
                            return [4 /*yield*/, this.workflowHistoryDir(workspaceRootUri, workflow.id)];
                        case 1:
                            dir = _b.sent();
                            _a = version;
                            return [4 /*yield*/, this.nextWorkflowVersionId(dir, idBase)];
                        case 2:
                            _a.id = _b.sent();
                            return [4 /*yield*/, this.writeJson(path.join(dir, "".concat(version.id, ".json")), version)];
                        case 3:
                            _b.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        FlowStore_1.prototype.nextWorkflowVersionId = function (dir, idBase) {
            return __awaiter(this, void 0, void 0, function () {
                var index, id;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            index = 0;
                            _a.label = 1;
                        case 1:
                            id = index === 0 ? idBase : "".concat(idBase, "-").concat(index + 1);
                            return [4 /*yield*/, fileExists(path.join(dir, "".concat(id, ".json")))];
                        case 2:
                            if (!(_a.sent())) {
                                return [2 /*return*/, id];
                            }
                            _a.label = 3;
                        case 3:
                            index++;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        FlowStore_1.prototype.workflowHistoryDir = function (workspaceRootUri, workflowId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _b = (_a = path).join;
                            return [4 /*yield*/, this.ensureDir(workspaceRootUri, 'workflow-history')];
                        case 1: return [2 /*return*/, _b.apply(_a, [_c.sent(), sanitizeFileName(workflowId)])];
                    }
                });
            });
        };
        FlowStore_1.prototype.fileMetadata = function (file, format, editable, unsupportedReason) {
            return __awaiter(this, void 0, void 0, function () {
                var stat;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, fs.stat(file).catch(function () { return undefined; })];
                        case 1:
                            stat = _a.sent();
                            return [2 /*return*/, {
                                    path: file,
                                    uri: file_uri_1.FileUri.create(file).toString(),
                                    format: format,
                                    updatedAt: ((stat === null || stat === void 0 ? void 0 : stat.mtime) || new Date()).toISOString(),
                                    editable: editable,
                                    unsupportedReason: unsupportedReason
                                }];
                    }
                });
            });
        };
        FlowStore_1.prototype.fsPath = function (filePathOrUri) {
            if (filePathOrUri.startsWith('file:')) {
                return file_uri_1.FileUri.fsPath(filePathOrUri);
            }
            return filePathOrUri;
        };
        FlowStore_1.prototype.readImportWorkflow = function (source) {
            return __awaiter(this, void 0, void 0, function () {
                var stat;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, fs.stat(source)];
                        case 1:
                            stat = _a.sent();
                            if (stat.isDirectory()) {
                                return [2 /*return*/, this.readWorkflowFromRunExport(path.join(source, 'run.json'))];
                            }
                            if (path.basename(source).toLowerCase() === 'run.json') {
                                return [2 /*return*/, this.readWorkflowFromRunExport(source)];
                            }
                            if (isWorkflowFile(path.basename(source))) {
                                return [2 /*return*/, this.openWorkflowFile(source)];
                            }
                            throw new Error("Unsupported workflow import source \"".concat(source, "\". Use a workflow .json/.yaml/.yml file, a CLI export directory, or run.json."));
                    }
                });
            });
        };
        FlowStore_1.prototype.readWorkflowFromRunExport = function (runFile) {
            return __awaiter(this, void 0, void 0, function () {
                var run;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.readJson(runFile)];
                        case 1:
                            run = _a.sent();
                            if (!run.workflow) {
                                throw new Error("Run export \"".concat(runFile, "\" does not contain an embedded workflow."));
                            }
                            return [2 /*return*/, __assign(__assign({}, run.workflow), { id: run.workflow.id || run.workflowId || path.basename(path.dirname(runFile)), name: run.workflow.name || run.workflow.id || run.workflowId || path.basename(path.dirname(runFile)), states: run.workflow.states || {}, transitions: run.workflow.transitions || [], file: undefined })];
                    }
                });
            });
        };
        FlowStore_1.prototype.importWorkflowFormat = function (source) {
            return __awaiter(this, void 0, void 0, function () {
                var stat, format;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, fs.stat(source)];
                        case 1:
                            stat = _a.sent();
                            if (stat.isDirectory() || path.basename(source).toLowerCase() === 'run.json') {
                                return [2 /*return*/, JSON_FORMAT];
                            }
                            format = workflowFileFormat(source);
                            return [2 /*return*/, format === YAML_FORMAT ? YAML_FORMAT : JSON_FORMAT];
                    }
                });
            });
        };
        FlowStore_1.prototype.runExportDir = function (source) {
            return __awaiter(this, void 0, void 0, function () {
                var stat, dir, missing, _i, _a, file;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, fs.stat(source)];
                        case 1:
                            stat = _b.sent();
                            dir = stat.isDirectory() ? source : path.dirname(source);
                            missing = [];
                            _i = 0, _a = ['run.json', 'events.jsonl'];
                            _b.label = 2;
                        case 2:
                            if (!(_i < _a.length)) return [3 /*break*/, 5];
                            file = _a[_i];
                            return [4 /*yield*/, fileExists(path.join(dir, file))];
                        case 3:
                            if (!(_b.sent())) {
                                missing.push(file);
                            }
                            _b.label = 4;
                        case 4:
                            _i++;
                            return [3 /*break*/, 2];
                        case 5:
                            if (missing.length > 0) {
                                throw new Error("Run import source \"".concat(source, "\" is missing ").concat(missing.join(', '), "."));
                            }
                            return [2 /*return*/, dir];
                    }
                });
            });
        };
        FlowStore_1.prototype.importedArtifactUri = function (packageDir, artifactPath) {
            if (/^[a-z][a-z0-9+.-]*:/i.test(artifactPath)) {
                return artifactPath;
            }
            var normalized = path.normalize(artifactPath).replace(/^(\.\.[\\/])+/, '');
            return file_uri_1.FileUri.create(path.join(packageDir, normalized)).toString();
        };
        FlowStore_1.prototype.resolveArtifactSource = function (workspaceRootUri, runId, artifact) {
            if (artifact.uri.startsWith('file:')) {
                return file_uri_1.FileUri.fsPath(artifact.uri);
            }
            if (artifact.uri.startsWith('flow:')) {
                var parsed = new URL(artifact.uri);
                var artifactRunId = parsed.hostname || runId;
                var parts = parsed.pathname.split('/').filter(Boolean);
                if (parts.length >= 2) {
                    var stateId = parts[0], artifactPath = parts.slice(1);
                    return path.join.apply(path, __spreadArray([storageRoot(workspaceRootUri), 'runs', sanitizeFileName(artifactRunId), sanitizeFileName(stateId), 'output', 'artifacts'], artifactPath.map(sanitizeFileName), false));
                }
            }
            if (!/^[a-z][a-z0-9+.-]*:/i.test(artifact.uri)) {
                var workspaceRoot = workspaceRootUri ? file_uri_1.FileUri.fsPath(workspaceRootUri) : process.cwd();
                return safeExistingSource(storageRoot(workspaceRootUri), artifact.uri) || safeExistingSource(workspaceRoot, artifact.uri);
            }
            return undefined;
        };
        return FlowStore_1;
    }());
    __setFunctionName(_classThis, "FlowStore");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        FlowStore = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return FlowStore = _classThis;
}();
exports.FlowStore = FlowStore;
function storageRoot(workspaceRootUri) {
    if (workspaceRootUri) {
        return path.join(file_uri_1.FileUri.fsPath(workspaceRootUri), '.theia', 'flow');
    }
    return path.join(os.homedir(), '.theia', 'flow');
}
function sanitizeFileName(value) {
    return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}
function sanitizeWorkflowId(value) {
    return sanitizeFileName(value.trim().toLowerCase().replace(/\s+/g, '_')) || 'workflow';
}
function fileExists(file) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fs.access(file)];
                case 1:
                    _b.sent();
                    return [2 /*return*/, true];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function isSubPath(parentPath, childPath) {
    var parent = path.resolve(parentPath);
    var child = path.resolve(childPath);
    var relative = path.relative(parent, child);
    return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}
function isWorkflowFile(fileName) {
    return WORKFLOW_EXTENSIONS.includes(path.extname(fileName).toLowerCase());
}
function isMarkdownPath(value) {
    return MARKDOWN_EXTENSIONS.has(path.extname(value).toLowerCase());
}
function workflowFileFormat(file) {
    var extension = path.extname(file).toLowerCase();
    if (extension === '.json') {
        return JSON_FORMAT;
    }
    if (extension === '.yaml' || extension === '.yml') {
        return YAML_FORMAT;
    }
    return UNKNOWN_FORMAT;
}
function copyDirectory(source, target) {
    return __awaiter(this, void 0, void 0, function () {
        var entries, _i, entries_6, entry, sourcePath, targetPath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.mkdir(target, { recursive: true })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, fs.readdir(source, { withFileTypes: true })];
                case 2:
                    entries = _a.sent();
                    _i = 0, entries_6 = entries;
                    _a.label = 3;
                case 3:
                    if (!(_i < entries_6.length)) return [3 /*break*/, 8];
                    entry = entries_6[_i];
                    sourcePath = path.join(source, entry.name);
                    targetPath = path.join(target, entry.name);
                    if (!entry.isDirectory()) return [3 /*break*/, 5];
                    return [4 /*yield*/, copyDirectory(sourcePath, targetPath)];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 5:
                    if (!entry.isFile()) return [3 /*break*/, 7];
                    return [4 /*yield*/, fs.copyFile(sourcePath, targetPath)];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 3];
                case 8: return [2 /*return*/];
            }
        });
    });
}
function workflowExtension(format) {
    return format === YAML_FORMAT ? '.yaml' : '.json';
}
function stripFileMetadata(value) {
    var serializable = __assign({}, value);
    delete serializable.file;
    return serializable;
}
function normalizeWorkspacePreset(preset) {
    return __assign(__assign({}, preset), { version: preset.version || common_1.FLOW_PIPELINE_PRESET_VERSION, source: 'workspace', workflow: stripFileMetadata(preset.workflow), agentMarkdown: normalizeAgentMarkdown(preset.agentMarkdown) });
}
function normalizeAgentMarkdown(agentMarkdown) {
    if (!agentMarkdown) {
        return undefined;
    }
    return agentMarkdown.map(function (agent) { return ({
        relativePath: agent.relativePath.split(path.sep).join('/'),
        content: agent.content.endsWith('\n') ? agent.content : "".concat(agent.content, "\n")
    }); });
}
function referencedAgentPaths(workflow) {
    var paths = Object.values(workflow.agents || {}).filter(function (value) { return typeof value === 'string' && isMarkdownPath(value); });
    var visitState = function (state) {
        if (state.agent && isMarkdownPath(state.agent)) {
            paths.push(state.agent);
        }
        for (var _i = 0, _a = Object.values(state.branches || {}); _i < _a.length; _i++) {
            var branch = _a[_i];
            visitState(branch);
        }
    };
    for (var _i = 0, _a = Object.values(workflow.states || {}); _i < _a.length; _i++) {
        var state = _a[_i];
        visitState(state);
    }
    return uniqueSorted(paths);
}
function referencedContractPaths(workflow) {
    var paths = [];
    var visitState = function (state) {
        var _a;
        for (var _i = 0, _b = __spreadArray(__spreadArray([], (state.outputs || []), true), (((_a = state.input) === null || _a === void 0 ? void 0 : _a.include) || []), true); _i < _b.length; _i++) {
            var value = _b[_i];
            if (isExportedContractPath(value)) {
                paths.push(value);
            }
        }
        for (var _c = 0, _d = Object.values(state.branches || {}); _c < _d.length; _c++) {
            var branch = _d[_c];
            visitState(branch);
        }
    };
    for (var _i = 0, _a = Object.values(workflow.states || {}); _i < _a.length; _i++) {
        var state = _a[_i];
        visitState(state);
    }
    for (var _b = 0, _c = workflow.transitions || []; _b < _c.length; _b++) {
        var transition = _c[_b];
        collectContractPathsFromValue(transition.guard, paths);
    }
    return uniqueSorted(paths);
}
function collectContractPathsFromValue(value, paths) {
    if (typeof value === 'string') {
        if (isExportedContractPath(value)) {
            paths.push(value);
        }
        return;
    }
    if (Array.isArray(value)) {
        for (var _i = 0, value_1 = value; _i < value_1.length; _i++) {
            var item = value_1[_i];
            collectContractPathsFromValue(item, paths);
        }
        return;
    }
    if (value && typeof value === 'object') {
        for (var _a = 0, _b = Object.values(value); _a < _b.length; _a++) {
            var item = _b[_a];
            collectContractPathsFromValue(item, paths);
        }
    }
}
function isExportedContractPath(value) {
    var normalized = value.replace(/\\/g, '/');
    return normalized.startsWith('contracts/') || normalized.startsWith('schemas/');
}
function uniqueSorted(values) {
    return __spreadArray([], new Set(values.map(function (value) { return value.replace(/\\/g, '/'); })), true).sort();
}
function collectRunIssues(run) {
    var _a;
    var issues = [];
    for (var _i = 0, _b = run.workloads; _i < _b.length; _i++) {
        var workload = _b[_i];
        for (var _c = 0, _d = workload.issues; _c < _d.length; _c++) {
            var issue = _d[_c];
            issues.push({
                runId: run.id,
                workloadId: workload.id,
                stateId: workload.stateId,
                summary: issue
            });
        }
        for (var _e = 0, _f = ((_a = workload.outputEnvelope) === null || _a === void 0 ? void 0 : _a.issues) || []; _e < _f.length; _e++) {
            var issue = _f[_e];
            issues.push(__assign(__assign({}, issue), { runId: run.id, workloadId: workload.id, stateId: workload.stateId }));
        }
    }
    for (var _g = 0, _h = run.events; _g < _h.length; _g++) {
        var event_1 = _h[_g];
        if (event_1.type === 'issue.recorded') {
            issues.push(__assign(__assign({ runId: run.id, eventId: event_1.id, stateId: event_1.stateId, workloadId: event_1.workloadId }, (event_1.payload || {})), { summary: event_1.message }));
        }
    }
    return issues;
}
function collectRunAgents(workflow, run) {
    var agents = new Map();
    var ensure = function (id) {
        var _a;
        var agentId = id || '(unassigned)';
        var existing = agents.get(agentId);
        if (existing) {
            return existing;
        }
        var created = {
            id: agentId,
            path: (_a = workflow.agents) === null || _a === void 0 ? void 0 : _a[agentId],
            states: [],
            workloads: []
        };
        agents.set(agentId, created);
        return created;
    };
    for (var _i = 0, _a = Object.keys(workflow.agents || {}); _i < _a.length; _i++) {
        var id = _a[_i];
        ensure(id);
    }
    for (var _b = 0, _c = run.workloads; _b < _c.length; _b++) {
        var workload = _c[_b];
        var agent = ensure(workload.agent);
        pushUnique(agent.states, workload.stateId);
        pushUnique(agent.workloads, workload.id);
    }
    return __spreadArray([], agents.values(), true).map(function (agent) { return (__assign(__assign({}, agent), { states: __spreadArray([], agent.states, true).sort(), workloads: __spreadArray([], agent.workloads, true).sort() })); }).sort(function (left, right) { return left.id.localeCompare(right.id); });
}
function collectRunMemoryWrites(run) {
    var writes = __spreadArray([], (run.memoryWrites || []).map(function (write) { return (__assign(__assign({}, write), { source: 'run.memoryWrites' })); }), true);
    for (var _i = 0, _a = run.effects; _i < _a.length; _i++) {
        var effect = _a[_i];
        if (effect.kind === 'memory_write' || effect.type === 'memory.write') {
            writes.push(__assign(__assign({}, effect), { source: 'effects' }));
        }
    }
    for (var _b = 0, _c = run.events; _b < _c.length; _b++) {
        var event_2 = _c[_b];
        if (event_2.type.startsWith('memory_write.')) {
            writes.push(__assign(__assign({}, (event_2.payload || {})), { id: event_2.id, runId: event_2.runId, stateId: event_2.stateId, workloadId: event_2.workloadId, timestamp: event_2.timestamp, source: 'events' }));
        }
    }
    return writes;
}
function buildRunExportReport(run, issues, exportedAt, capabilities, agents, contracts, memoryWrites) {
    return {
        schemaVersion: 'flow.run-final-report/v1',
        runId: run.id,
        workflowId: run.workflowId,
        status: run.status,
        prompt: run.prompt,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        exportedAt: exportedAt,
        capabilities: capabilities,
        agents: agents,
        contracts: contracts,
        artifacts: run.artifacts,
        effects: run.effects,
        issues: issues,
        memoryWrites: memoryWrites,
        secondRunSuggestion: run.secondRunSuggestion
    };
}
function kernelCompatibleRunExport(workflow, run) {
    return {
        id: run.id,
        workflowId: run.workflowId,
        workflow: stripFileMetadata(workflow),
        input: run.prompt,
        status: run.status === 'waiting_gate' ? 'waiting' : run.status,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        activeStates: Object.fromEntries(run.currentStateIds.map(function (stateId) { return [stateId, true]; })),
        completedStates: Object.fromEntries(Object.entries(run.stateStatuses).filter(function (_a) {
            var status = _a[1];
            return status === 'done';
        }).map(function (_a) {
            var stateId = _a[0];
            return [stateId, true];
        })),
        workloads: Object.fromEntries(run.workloads.map(function (workload) { return [workload.id, {
                id: workload.id,
                runId: workload.runId,
                stateId: workload.stateId,
                agent: workload.agent,
                status: workload.status === 'done' ? 'completed' : workload.status === 'running' ? 'started' : workload.status,
                attempt: workload.attempt,
                previousWorkloadId: workload.previousWorkloadId,
                input: { include: workload.inputArtifacts },
                outputs: workload.outputArtifacts,
                createdAt: workload.createdAt,
                completedAt: workload.status === 'done' ? workload.updatedAt : undefined
            }]; })),
        artifacts: Object.fromEntries(run.artifacts.map(function (artifact) { return [artifact.id, {
                id: artifact.id,
                type: artifact.kind,
                path: artifact.uri,
                stateId: artifact.stateId,
                createdAt: artifact.createdAt
            }]; })),
        effects: run.effects.map(function (effect) { return ({
            id: effect.id,
            type: effect.type || effect.kind,
            path: effect.path || effect.artifactPath,
            command: effect.command,
            hashBefore: effect.hashBefore,
            hashAfter: effect.hashAfter,
            patch: effect.patch,
            summary: effect.summary,
            status: effect.status,
            approvalPolicy: effect.approvalPolicy,
            stateId: effect.stateId
        }); }),
        signals: Object.fromEntries(run.signals.map(function (signal) { return [signal.key, signal.value]; })),
        flow: stripFileMetadata(run)
    };
}
function renderRunExportReport(report) {
    var artifacts = report.artifacts;
    var effects = report.effects;
    var issues = report.issues;
    var capabilities = report.capabilities;
    var agents = report.agents;
    var contracts = report.contracts;
    var memoryWrites = report.memoryWrites;
    return __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([
        '# Flow Run Export',
        '',
        "Run: ".concat(report.runId),
        "Workflow: ".concat(report.workflowId),
        "Status: ".concat(report.status),
        "Created: ".concat(report.createdAt),
        "Updated: ".concat(report.updatedAt),
        "Exported: ".concat(report.exportedAt),
        '',
        '## Contents',
        '',
        "- Capabilities: ".concat(capabilities.length),
        "- Agents: ".concat(agents.length),
        "- Contracts: ".concat(contracts.length),
        "- Artifacts: ".concat(artifacts.length),
        "- Effects: ".concat(effects.length),
        "- Issues: ".concat(issues.length),
        "- Memory writes: ".concat(memoryWrites.length),
        '',
        '## Capabilities',
        ''
    ], (capabilities.length ? capabilities.map(function (capability) { return "- ".concat(capability); }) : ['- None']), true), [
        '',
        '## Agents',
        ''
    ], false), (agents.length ? agents.map(function (agent) { return "- ".concat(String(agent.id)).concat(agent.path ? ": ".concat(String(agent.path)) : ''); }) : ['- None']), true), [
        '',
        '## Contracts',
        ''
    ], false), (contracts.length ? contracts.map(function (contract) { return "- ".concat(contract); }) : ['- None']), true), [
        '',
        '## Artifacts',
        ''
    ], false), (artifacts.length ? artifacts.map(function (artifact) { return "- ".concat(artifact.kind, ": ").concat(artifact.summary || artifact.uri); }) : ['- None']), true), [
        '',
        '## Effects',
        ''
    ], false), (effects.length ? effects.map(function (effect) { return "- ".concat(effect.kind, "/").concat(effect.status, ": ").concat(effect.summary); }) : ['- None']), true), [
        '',
        '## Memory Writes',
        ''
    ], false), (memoryWrites.length ? memoryWrites.map(function (write) { return "- ".concat(String(write.id || write.key || write.source || 'memory.write')); }) : ['- None']), true), [
        '',
        '## Issues',
        ''
    ], false), (issues.length ? issues.map(function (issue) { return "- ".concat(String(issue.severity || 'issue'), ": ").concat(String(issue.summary || issue.type || 'Recorded issue')); }) : ['- None']), true).join('\n');
}
function pushUnique(values, value) {
    if (value && !values.includes(value)) {
        values.push(value);
    }
}
function safeArtifactPackageName(artifact) {
    var uriPath = artifact.uri.startsWith('file:')
        ? file_uri_1.FileUri.fsPath(artifact.uri)
        : artifact.uri.replace(/^flow:\/\/[^/]+\//, '');
    var base = path.basename(uriPath) || "".concat(artifact.id, ".artifact");
    return "".concat(sanitizeFileName(artifact.id), "-").concat(sanitizeFileName(base));
}
function safeExistingSource(root, relativePath) {
    if (!relativePath || path.isAbsolute(relativePath) || relativePath.split(/[\\/]+/).some(function (segment) { return segment === '..'; })) {
        return undefined;
    }
    var file = path.resolve(root, relativePath);
    var relative = path.relative(path.resolve(root), file);
    if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
        return undefined;
    }
    return file;
}
function firstExistingSource(roots, relativePath) {
    return __awaiter(this, void 0, void 0, function () {
        var _i, roots_1, root, source, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _i = 0, roots_1 = roots;
                    _b.label = 1;
                case 1:
                    if (!(_i < roots_1.length)) return [3 /*break*/, 5];
                    root = roots_1[_i];
                    source = safeExistingSource(root, relativePath);
                    _a = source;
                    if (!_a) return [3 /*break*/, 3];
                    return [4 /*yield*/, fileExists(source)];
                case 2:
                    _a = (_b.sent());
                    _b.label = 3;
                case 3:
                    if (_a) {
                        return [2 /*return*/, source];
                    }
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5: return [2 /*return*/, undefined];
            }
        });
    });
}
function safePackagePath(root, relativePath) {
    var file = safeExistingSource(root, relativePath);
    if (!file) {
        throw new Error("Export package path escapes the workflow export: ".concat(relativePath));
    }
    return file;
}
function timestampFilePart(value) {
    return value.replace(/[:.]/g, '-');
}
function normalizeWindowsDriveLetter(value) {
    return value.replace(/^[a-z]:/, function (drive) { return drive.toUpperCase(); });
}
