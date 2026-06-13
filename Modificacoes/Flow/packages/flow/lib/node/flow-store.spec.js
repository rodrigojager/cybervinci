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
var fs = require("fs/promises");
var os = require("os");
var path = require("path");
var file_uri_1 = require("@theia/core/lib/common/file-uri");
var yaml = require("js-yaml");
var common_1 = require("../common");
var flow_store_1 = require("./flow-store");
describe('FlowStore', function () {
    var tempDir;
    var workspaceRootUri;
    var store;
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.mkdtemp(path.join(os.tmpdir(), 'flow-store-'))];
                case 1:
                    tempDir = _a.sent();
                    workspaceRootUri = file_uri_1.FileUri.create(tempDir).toString();
                    store = new flow_store_1.FlowStore();
                    return [2 /*return*/];
            }
        });
    }); });
    afterEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.rm(tempDir, { recursive: true, force: true })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('attaches workflow file metadata when listing JSON workflows', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, workflows;
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    workflow = sampleWorkflow('sample_json');
                    return [4 /*yield*/, writeWorkflowFile('sample_json.json', workflow)];
                case 1:
                    _f.sent();
                    return [4 /*yield*/, store.listWorkflows(workspaceRootUri)];
                case 2:
                    workflows = _f.sent();
                    (0, chai_1.expect)(workflows).to.have.length(1);
                    (0, chai_1.expect)((_a = workflows[0].file) === null || _a === void 0 ? void 0 : _a.format).to.equal('json');
                    (0, chai_1.expect)((_b = workflows[0].file) === null || _b === void 0 ? void 0 : _b.editable).to.equal(true);
                    (0, chai_1.expect)(normalizePath((_c = workflows[0].file) === null || _c === void 0 ? void 0 : _c.path)).to.equal(normalizePath(workflowPath('sample_json.json')));
                    (0, chai_1.expect)((_d = workflows[0].file) === null || _d === void 0 ? void 0 : _d.uri).to.equal(file_uri_1.FileUri.create(workflowPath('sample_json.json')).toString());
                    (0, chai_1.expect)((_e = workflows[0].file) === null || _e === void 0 ? void 0 : _e.updatedAt).to.be.a('string');
                    return [2 /*return*/];
            }
        });
    }); });
    it('saves pretty JSON without persisting file metadata', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, content;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    workflow = sampleWorkflow('pretty_json');
                    return [4 /*yield*/, store.saveWorkflow(workspaceRootUri, __assign(__assign({}, workflow), { file: {
                                path: workflowPath('pretty_json.json'),
                                uri: file_uri_1.FileUri.create(workflowPath('pretty_json.json')).toString(),
                                format: 'json',
                                updatedAt: '2026-05-19T00:00:00.000Z',
                                editable: true
                            } }))];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, fs.readFile(workflowPath('pretty_json.json'), 'utf8')];
                case 2:
                    content = _a.sent();
                    (0, chai_1.expect)(content).to.contain('\n  "version": "flow.workflow/v1",\n');
                    (0, chai_1.expect)(content.endsWith('\n')).to.equal(true);
                    (0, chai_1.expect)(JSON.parse(content)).not.to.have.property('file');
                    return [2 /*return*/];
            }
        });
    }); });
    it('discovers editable YAML workflows with full workflow metadata', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflows;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, writeWorkflowFile('sample_yaml.yaml', [
                        'version: flow.workflow/v1',
                        'id: sample_yaml',
                        'name: Sample YAML',
                        'states:',
                        '  intake:',
                        '    type: input',
                        '    layout:',
                        '      x: 80',
                        '      y: 120',
                        'transitions: []'
                    ].join('\n'))];
                case 1:
                    _d.sent();
                    return [4 /*yield*/, store.listWorkflows(workspaceRootUri)];
                case 2:
                    workflows = _d.sent();
                    (0, chai_1.expect)(workflows).to.have.length(1);
                    (0, chai_1.expect)(workflows[0].id).to.equal('sample_yaml');
                    (0, chai_1.expect)(workflows[0].name).to.equal('Sample YAML');
                    (0, chai_1.expect)(workflows[0].states.intake.layout).to.deep.equal({ x: 80, y: 120 });
                    (0, chai_1.expect)((_a = workflows[0].file) === null || _a === void 0 ? void 0 : _a.format).to.equal('yaml');
                    (0, chai_1.expect)((_b = workflows[0].file) === null || _b === void 0 ? void 0 : _b.editable).to.equal(true);
                    (0, chai_1.expect)((_c = workflows[0].file) === null || _c === void 0 ? void 0 : _c.unsupportedReason).to.equal(undefined);
                    return [2 /*return*/];
            }
        });
    }); });
    it('round-trips editable YAML workflows without persisting file metadata', function () { return __awaiter(void 0, void 0, void 0, function () {
        var yamlPath, workflow, content, savedRaw, reloaded;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    yamlPath = workflowPath('sample_yaml.yml');
                    return [4 /*yield*/, writeWorkflowFile('sample_yaml.yml', [
                            'version: flow.workflow/v1',
                            'id: sample_yaml',
                            'name: Sample YAML',
                            'states:',
                            '  intake:',
                            '    type: input',
                            'transitions: []'
                        ].join('\n'))];
                case 1:
                    _e.sent();
                    return [4 /*yield*/, store.openWorkflowFile(yamlPath)];
                case 2:
                    workflow = _e.sent();
                    (0, chai_1.expect)((_a = workflow.file) === null || _a === void 0 ? void 0 : _a.format).to.equal('yaml');
                    (0, chai_1.expect)((_b = workflow.file) === null || _b === void 0 ? void 0 : _b.editable).to.equal(true);
                    return [4 /*yield*/, store.saveWorkflow(workspaceRootUri, __assign(__assign({}, workflow), { name: 'Sample YAML Edited', states: __assign(__assign({}, workflow.states), { intake: __assign(__assign({}, workflow.states.intake), { layout: { x: 44, y: 55 } }), review: { type: 'gate', description: 'Approve generated YAML workflow changes.' } }), transitions: [{ id: 'intake_to_review', from: 'intake', to: 'review', on: 'workload.completed' }] }), yamlPath)];
                case 3:
                    _e.sent();
                    return [4 /*yield*/, fs.readFile(yamlPath, 'utf8')];
                case 4:
                    content = _e.sent();
                    savedRaw = yaml.load(content);
                    return [4 /*yield*/, store.openWorkflowFile(yamlPath)];
                case 5:
                    reloaded = _e.sent();
                    (0, chai_1.expect)(content).not.to.contain('file:');
                    (0, chai_1.expect)(savedRaw).not.to.have.property('file');
                    (0, chai_1.expect)(savedRaw.name).to.equal('Sample YAML Edited');
                    (0, chai_1.expect)((_c = reloaded.file) === null || _c === void 0 ? void 0 : _c.format).to.equal('yaml');
                    (0, chai_1.expect)((_d = reloaded.file) === null || _d === void 0 ? void 0 : _d.editable).to.equal(true);
                    (0, chai_1.expect)(reloaded.name).to.equal('Sample YAML Edited');
                    (0, chai_1.expect)(reloaded.states.intake.layout).to.deep.equal({ x: 44, y: 55 });
                    (0, chai_1.expect)(reloaded.states.review.type).to.equal('gate');
                    (0, chai_1.expect)(reloaded.transitions).to.deep.equal([{ id: 'intake_to_review', from: 'intake', to: 'review', on: 'workload.completed' }]);
                    return [2 /*return*/];
            }
        });
    }); });
    it('records local workflow versions with author, origin, date, diff, and restore support', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, versions, restored, restoredVersions;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    workflow = sampleWorkflow('versioned');
                    return [4 /*yield*/, store.saveWorkflow(workspaceRootUri, workflow, undefined, {
                            author: 'Architect',
                            origin: 'create',
                            message: 'Initial workflow'
                        })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, store.saveWorkflow(workspaceRootUri, __assign(__assign({}, workflow), { name: 'Versioned Edited', states: __assign(__assign({}, workflow.states), { review: { type: 'gate' } }), transitions: [{ id: 'intake_to_review', from: 'intake', to: 'review', on: 'run.started' }] }), undefined, {
                            author: 'Designer',
                            origin: 'save',
                            message: 'Add review gate'
                        })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, store.listWorkflowVersions(workspaceRootUri, workflow.id)];
                case 3:
                    versions = _a.sent();
                    (0, chai_1.expect)(versions).to.have.length(2);
                    (0, chai_1.expect)(versions[0].author).to.equal('Designer');
                    (0, chai_1.expect)(versions[0].origin).to.equal('save');
                    (0, chai_1.expect)(versions[0].message).to.equal('Add review gate');
                    (0, chai_1.expect)(versions[0].createdAt).to.be.a('string');
                    (0, chai_1.expect)(versions[0].diff.map(function (item) { return "".concat(item.kind, ":").concat(item.change, ":").concat(item.id); })).to.include.members([
                        'metadata:changed:name',
                        'state:added:review',
                        'transition:added:intake_to_review'
                    ]);
                    (0, chai_1.expect)(versions[1].origin).to.equal('create');
                    (0, chai_1.expect)(versions[1].diff[0]).to.deep.include({ kind: 'source', change: 'added', id: 'versioned' });
                    return [4 /*yield*/, store.restoreWorkflowVersion(workspaceRootUri, workflow.id, versions[1].id, {
                            author: 'QA',
                            message: 'Rollback to initial version'
                        })];
                case 4:
                    restored = _a.sent();
                    return [4 /*yield*/, store.listWorkflowVersions(workspaceRootUri, workflow.id)];
                case 5:
                    restoredVersions = _a.sent();
                    (0, chai_1.expect)(restored.name).to.equal('versioned');
                    (0, chai_1.expect)(restored.states).not.to.have.property('review');
                    (0, chai_1.expect)(restoredVersions[0].origin).to.equal('restore');
                    (0, chai_1.expect)(restoredVersions[0].author).to.equal('QA');
                    (0, chai_1.expect)(restoredVersions[0].message).to.equal('Rollback to initial version');
                    (0, chai_1.expect)(restoredVersions[0].diff.map(function (item) { return "".concat(item.kind, ":").concat(item.change, ":").concat(item.id); })).to.include.members([
                        'metadata:changed:name',
                        'state:removed:review',
                        'transition:removed:intake_to_review'
                    ]);
                    return [2 /*return*/];
            }
        });
    }); });
    it('creates JSON workflows from templates without mutating template sources', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, content, _a, _b;
        var _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, store.createWorkflowFromTemplate(workspaceRootUri, 'simple_specialist')];
                case 1:
                    workflow = _f.sent();
                    (0, chai_1.expect)(workflow.id).to.equal('simple_specialist');
                    (0, chai_1.expect)(workflow.name).to.equal('Simple Specialist');
                    (0, chai_1.expect)((_c = workflow.file) === null || _c === void 0 ? void 0 : _c.format).to.equal('json');
                    (0, chai_1.expect)((_d = workflow.file) === null || _d === void 0 ? void 0 : _d.editable).to.equal(true);
                    (0, chai_1.expect)(normalizePath((_e = workflow.file) === null || _e === void 0 ? void 0 : _e.path)).to.equal(normalizePath(workflowPath('simple_specialist.json')));
                    _b = (_a = JSON).parse;
                    return [4 /*yield*/, fs.readFile(workflowPath('simple_specialist.json'), 'utf8')];
                case 2:
                    content = _b.apply(_a, [_f.sent()]);
                    (0, chai_1.expect)(content).not.to.have.property('file');
                    (0, chai_1.expect)(content.states.input.outputs).to.deep.equal(['input/request.md']);
                    return [2 /*return*/];
            }
        });
    }); });
    it('allocates a new workflow id when creating the same template twice', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, store.createWorkflowFromTemplate(workspaceRootUri, 'simple_specialist')];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, store.createWorkflowFromTemplate(workspaceRootUri, 'simple_specialist')];
                case 2:
                    workflow = _b.sent();
                    (0, chai_1.expect)(workflow.id).to.equal('simple_specialist_2');
                    (0, chai_1.expect)(workflow.name).to.equal('Simple Specialist 2');
                    (0, chai_1.expect)(normalizePath((_a = workflow.file) === null || _a === void 0 ? void 0 : _a.path)).to.equal(normalizePath(workflowPath('simple_specialist_2.json')));
                    return [2 /*return*/];
            }
        });
    }); });
    it('saves and lists workspace pipeline presets under the preset store', function () { return __awaiter(void 0, void 0, void 0, function () {
        var saved, presets, persisted, _a, _b;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, store.savePipelinePreset(workspaceRootUri, samplePreset('reusable_pipeline'))];
                case 1:
                    saved = _d.sent();
                    return [4 /*yield*/, store.listWorkspacePipelinePresets(workspaceRootUri)];
                case 2:
                    presets = _d.sent();
                    _b = (_a = JSON).parse;
                    return [4 /*yield*/, fs.readFile(presetPath('reusable_pipeline.json'), 'utf8')];
                case 3:
                    persisted = _b.apply(_a, [_d.sent()]);
                    (0, chai_1.expect)(saved.source).to.equal('workspace');
                    (0, chai_1.expect)(presets.map(function (preset) { return preset.id; })).to.deep.equal(['reusable_pipeline']);
                    (0, chai_1.expect)(presets[0].source).to.equal('workspace');
                    (0, chai_1.expect)(persisted.workflow).not.to.have.property('file');
                    (0, chai_1.expect)((_c = persisted.agentMarkdown) === null || _c === void 0 ? void 0 : _c[0].content).to.equal('# Reusable Agent\n');
                    return [2 /*return*/];
            }
        });
    }); });
    it('creates workflows from presets while preserving provider, model, prompts, outputs, and deliverables', function () { return __awaiter(void 0, void 0, void 0, function () {
        var preset, workflow, worker;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    preset = samplePreset('configured_pipeline');
                    return [4 /*yield*/, store.createWorkflowFromPreset(workspaceRootUri, preset, { workflowId: 'from_preset' })];
                case 1:
                    workflow = _a.sent();
                    worker = workflow.states.worker;
                    (0, chai_1.expect)(workflow.id).to.equal('from_preset');
                    (0, chai_1.expect)(worker.provider).to.deep.equal({ providerId: 'command', modelId: 'custom-command-model' });
                    (0, chai_1.expect)(worker.systemPrompt).to.equal('System instructions');
                    (0, chai_1.expect)(worker.taskPrompt).to.equal('Task instructions');
                    (0, chai_1.expect)(worker.outputs).to.deep.equal(['work/result.md']);
                    (0, chai_1.expect)(worker.deliverables).to.deep.equal([{ path: 'work/result.md', description: 'Result', required: true, kind: 'markdown' }]);
                    worker.outputs = ['mutated.md'];
                    (0, chai_1.expect)(preset.workflow.states.worker.outputs).to.deep.equal(['work/result.md']);
                    return [2 /*return*/];
            }
        });
    }); });
    it('imports an exported YAML workflow while preserving id, agents, states, transitions, and format', function () { return __awaiter(void 0, void 0, void 0, function () {
        var source, workflow;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    source = path.join(tempDir, 'exported-workflow.yaml');
                    return [4 /*yield*/, fs.writeFile(source, [
                            'version: flow.workflow/v1',
                            'id: imported_yaml',
                            'name: Imported YAML',
                            'metadata:',
                            '  owner: studio',
                            'agents:',
                            '  reviewer: agents/reviewer.md',
                            'states:',
                            '  intake:',
                            '    type: input',
                            '  review:',
                            '    type: agent',
                            '    agent: reviewer',
                            'transitions:',
                            '  - id: intake_to_review',
                            '    from: intake',
                            '    to: review',
                            '    on: run.started'
                        ].join('\n'), 'utf8')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, store.importWorkflow(workspaceRootUri, source)];
                case 2:
                    workflow = _c.sent();
                    (0, chai_1.expect)(workflow.id).to.equal('imported_yaml');
                    (0, chai_1.expect)(workflow.name).to.equal('Imported YAML');
                    (0, chai_1.expect)(workflow.agents).to.deep.equal({ reviewer: 'agents/reviewer.md' });
                    (0, chai_1.expect)(workflow.states.review.agent).to.equal('reviewer');
                    (0, chai_1.expect)(workflow.transitions).to.deep.equal([{ id: 'intake_to_review', from: 'intake', to: 'review', on: 'run.started' }]);
                    (0, chai_1.expect)(workflow.metadata).to.deep.equal({ owner: 'studio' });
                    (0, chai_1.expect)((_a = workflow.file) === null || _a === void 0 ? void 0 : _a.format).to.equal('yaml');
                    (0, chai_1.expect)(normalizePath((_b = workflow.file) === null || _b === void 0 ? void 0 : _b.path)).to.equal(normalizePath(workflowPath('imported_yaml.yaml')));
                    return [2 /*return*/];
            }
        });
    }); });
    it('imports a CLI run export directory from embedded run workflow as JSON', function () { return __awaiter(void 0, void 0, void 0, function () {
        var exportDir, workflow;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    exportDir = path.join(tempDir, 'cli-export');
                    return [4 /*yield*/, fs.mkdir(exportDir, { recursive: true })];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, fs.writeFile(path.join(exportDir, 'manifest.json'), JSON.stringify({
                            runId: 'run-1',
                            workflowId: 'cli_exported',
                            files: ['run.json', 'events.jsonl', 'manifest.json']
                        }), 'utf8')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, fs.writeFile(path.join(exportDir, 'run.json'), "".concat(JSON.stringify({
                            id: 'run-1',
                            workflowId: 'cli_exported',
                            workflow: {
                                version: 'flow.workflow/v1',
                                id: 'cli_exported',
                                name: 'CLI Exported',
                                agents: {
                                    architect: 'agents/architect.md'
                                },
                                states: {
                                    intake: { type: 'input' },
                                    architecture: { type: 'agent', agent: 'architect' }
                                },
                                transitions: [
                                    { from: 'intake', to: 'architecture', on: 'run.started' }
                                ]
                            }
                        }, undefined, 2), "\n"), 'utf8')];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, store.importWorkflow(workspaceRootUri, exportDir)];
                case 4:
                    workflow = _c.sent();
                    (0, chai_1.expect)(workflow.id).to.equal('cli_exported');
                    (0, chai_1.expect)(workflow.name).to.equal('CLI Exported');
                    (0, chai_1.expect)(workflow.agents).to.deep.equal({ architect: 'agents/architect.md' });
                    (0, chai_1.expect)(workflow.states.architecture.agent).to.equal('architect');
                    (0, chai_1.expect)(workflow.transitions).to.deep.equal([{ from: 'intake', to: 'architecture', on: 'run.started' }]);
                    (0, chai_1.expect)((_a = workflow.file) === null || _a === void 0 ? void 0 : _a.format).to.equal('json');
                    (0, chai_1.expect)(normalizePath((_b = workflow.file) === null || _b === void 0 ? void 0 : _b.path)).to.equal(normalizePath(workflowPath('cli_exported.json')));
                    return [2 /*return*/];
            }
        });
    }); });
    it('imports a workflow from a CLI run.json file URI', function () { return __awaiter(void 0, void 0, void 0, function () {
        var exportDir, runFile, workflow, _a, _b, _c;
        var _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    exportDir = path.join(tempDir, 'cli-run-json-export');
                    runFile = path.join(exportDir, 'run.json');
                    return [4 /*yield*/, fs.mkdir(exportDir, { recursive: true })];
                case 1:
                    _e.sent();
                    return [4 /*yield*/, fs.writeFile(runFile, "".concat(JSON.stringify({
                            id: 'run-from-uri',
                            workflowId: 'workflow_from_run_uri',
                            workflow: {
                                version: 'flow.workflow/v1',
                                id: 'workflow_from_run_uri',
                                name: 'Workflow From Run URI',
                                states: {
                                    intake: { type: 'input' },
                                    done: { type: 'report' }
                                },
                                transitions: [
                                    { id: 'intake_to_done', from: 'intake', to: 'done', on: 'run.started' }
                                ]
                            }
                        }, undefined, 2), "\n"), 'utf8')];
                case 2:
                    _e.sent();
                    return [4 /*yield*/, store.importWorkflow(workspaceRootUri, file_uri_1.FileUri.create(runFile).toString())];
                case 3:
                    workflow = _e.sent();
                    (0, chai_1.expect)(workflow.id).to.equal('workflow_from_run_uri');
                    (0, chai_1.expect)(workflow.name).to.equal('Workflow From Run URI');
                    (0, chai_1.expect)(workflow.states.done.type).to.equal('report');
                    (0, chai_1.expect)(workflow.transitions).to.deep.equal([{ id: 'intake_to_done', from: 'intake', to: 'done', on: 'run.started' }]);
                    (0, chai_1.expect)((_d = workflow.file) === null || _d === void 0 ? void 0 : _d.format).to.equal('json');
                    _a = chai_1.expect;
                    _c = (_b = JSON).parse;
                    return [4 /*yield*/, fs.readFile(workflowPath('workflow_from_run_uri.json'), 'utf8')];
                case 4:
                    _a.apply(void 0, [_c.apply(_b, [_e.sent()])]).not.to.have.property('file');
                    return [2 /*return*/];
            }
        });
    }); });
    it('imports a CLI run export as a read-only audit run with events, manifest, and copied artifacts', function () { return __awaiter(void 0, void 0, void 0, function () {
        var exportDir, run, _a;
        var _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    exportDir = path.join(tempDir, 'run-export');
                    return [4 /*yield*/, fs.mkdir(path.join(exportDir, 'reports'), { recursive: true })];
                case 1:
                    _e.sent();
                    return [4 /*yield*/, fs.writeFile(path.join(exportDir, 'reports', 'summary.md'), '# Summary\n', 'utf8')];
                case 2:
                    _e.sent();
                    return [4 /*yield*/, fs.writeFile(path.join(exportDir, 'manifest.json'), JSON.stringify({
                            runId: 'run-1',
                            workflowId: 'audit_workflow',
                            eventCount: 2,
                            artifactCount: 1,
                            files: ['run.json', 'events.jsonl', 'manifest.json', 'reports/summary.md']
                        }), 'utf8')];
                case 3:
                    _e.sent();
                    return [4 /*yield*/, fs.writeFile(path.join(exportDir, 'events.jsonl'), [
                            JSON.stringify({ seq: 1, time: '2026-05-19T00:00:00Z', type: 'run.started', runId: 'run-1', message: 'started' }),
                            JSON.stringify({ seq: 2, time: '2026-05-19T00:00:01Z', type: 'artifact.created', runId: 'run-1', stateId: 'report', message: 'artifact', data: { path: 'reports/summary.md' } })
                        ].join('\n'), 'utf8')];
                case 4:
                    _e.sent();
                    return [4 /*yield*/, fs.writeFile(path.join(exportDir, 'run.json'), "".concat(JSON.stringify({
                            id: 'run-1',
                            workflowId: 'audit_workflow',
                            input: 'ship audit import',
                            status: 'completed',
                            createdAt: '2026-05-19T00:00:00Z',
                            updatedAt: '2026-05-19T00:00:01Z',
                            activeStates: {},
                            completedStates: { intake: true, report: true },
                            workflow: {
                                version: 'flow.workflow/v1',
                                id: 'audit_workflow',
                                name: 'Audit Workflow',
                                states: {
                                    intake: { type: 'input' },
                                    report: { type: 'report' }
                                },
                                transitions: [
                                    { from: 'intake', to: 'report', on: 'run.started' }
                                ]
                            },
                            workloads: {
                                wl_0001: {
                                    id: 'wl_0001',
                                    runId: 'run-1',
                                    stateId: 'report',
                                    type: 'report',
                                    status: 'completed',
                                    outputs: ['reports/summary.md'],
                                    createdAt: '2026-05-19T00:00:00Z',
                                    completedAt: '2026-05-19T00:00:01Z'
                                }
                            },
                            artifacts: {
                                summary: {
                                    id: 'summary',
                                    type: 'report',
                                    path: 'reports/summary.md',
                                    stateId: 'report',
                                    workloadId: 'wl_0001',
                                    createdAt: '2026-05-19T00:00:01Z'
                                }
                            }
                        }, undefined, 2), "\n"), 'utf8')];
                case 5:
                    _e.sent();
                    return [4 /*yield*/, store.importRun(workspaceRootUri, exportDir)];
                case 6:
                    run = _e.sent();
                    (0, chai_1.expect)(run.id).to.equal('run-1');
                    (0, chai_1.expect)(run.prompt).to.equal('ship audit import');
                    (0, chai_1.expect)((_b = run.audit) === null || _b === void 0 ? void 0 : _b.readOnly).to.equal(true);
                    (0, chai_1.expect)((_d = (_c = run.audit) === null || _c === void 0 ? void 0 : _c.manifest) === null || _d === void 0 ? void 0 : _d.runId).to.equal('run-1');
                    (0, chai_1.expect)(run.events.map(function (event) { return event.type; })).to.include.members(['run.started', 'artifact.created']);
                    (0, chai_1.expect)(run.artifacts[0].uri).to.contain('reports');
                    (0, chai_1.expect)(run.artifacts[0].uri).to.match(/^file:/);
                    (0, chai_1.expect)(run.workloads[0].outputArtifacts[0]).to.match(/^file:/);
                    _a = chai_1.expect;
                    return [4 /*yield*/, fileExists(path.join(tempDir, '.theia', 'flow', 'runs', 'run-1', 'import', 'reports', 'summary.md'))];
                case 7:
                    _a.apply(void 0, [_e.sent()]).to.equal(true);
                    return [2 /*return*/];
            }
        });
    }); });
    it('imports a run export when the source is run.json instead of the export directory', function () { return __awaiter(void 0, void 0, void 0, function () {
        var exportDir, run;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    exportDir = path.join(tempDir, 'run-json-import');
                    return [4 /*yield*/, fs.mkdir(exportDir, { recursive: true })];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, fs.writeFile(path.join(exportDir, 'events.jsonl'), "".concat(JSON.stringify({
                            seq: 1,
                            time: '2026-05-20T12:00:00Z',
                            type: 'run.started',
                            runId: 'run-json-import'
                        }), "\n"), 'utf8')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, fs.writeFile(path.join(exportDir, 'run.json'), "".concat(JSON.stringify({
                            id: 'run-json-import',
                            workflowId: 'workflow_for_run_json_import',
                            input: 'import from run file',
                            status: 'running',
                            createdAt: '2026-05-20T12:00:00Z',
                            updatedAt: '2026-05-20T12:00:00Z',
                            activeStates: { intake: true },
                            completedStates: {},
                            workflow: {
                                version: 'flow.workflow/v1',
                                id: 'workflow_for_run_json_import',
                                states: {
                                    intake: { type: 'input' }
                                },
                                transitions: []
                            },
                            workloads: {},
                            artifacts: {}
                        }, undefined, 2), "\n"), 'utf8')];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, store.importRun(workspaceRootUri, path.join(exportDir, 'run.json'))];
                case 4:
                    run = _c.sent();
                    (0, chai_1.expect)(run.id).to.equal('run-json-import');
                    (0, chai_1.expect)(run.prompt).to.equal('import from run file');
                    (0, chai_1.expect)((_a = run.audit) === null || _a === void 0 ? void 0 : _a.readOnly).to.equal(true);
                    (0, chai_1.expect)((_b = run.audit) === null || _b === void 0 ? void 0 : _b.sourcePath).to.equal(exportDir);
                    (0, chai_1.expect)(run.events.map(function (event) { return event.type; })).to.deep.equal(['run.started']);
                    return [2 /*return*/];
            }
        });
    }); });
    it('exports a complete workflow package with workflow file, referenced agents, contracts, metadata, and manifest', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, exported, _a, _b, _c, manifest, _d, _e, _f, _g, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    workflow = __assign(__assign({}, sampleWorkflow('full_export')), { name: 'Full Export', agents: {
                            architect: 'agents/architect.md',
                            qa: 'agents/qa.md'
                        }, states: {
                            intake: { type: 'input', outputs: ['input/request.md'] },
                            contract: {
                                type: 'agent',
                                agent: 'architect',
                                input: { include: ['input/request.md'] },
                                outputs: ['contracts/shared.md', 'contracts/contracts.json', 'schemas/api.json']
                            },
                            qa: {
                                type: 'agent',
                                agent: 'qa',
                                input: { include: ['contracts/contracts.json'] }
                            }
                        }, transitions: [
                            { from: 'intake', to: 'contract', on: 'run.started' },
                            { from: 'contract', to: 'qa', on: 'workload.completed' }
                        ] });
                    return [4 /*yield*/, store.saveWorkflow(workspaceRootUri, workflow)];
                case 1:
                    _j.sent();
                    return [4 /*yield*/, writeStorageFile('agents/agents/architect.md', '# Architect\n')];
                case 2:
                    _j.sent();
                    return [4 /*yield*/, writeStorageFile('agents/agents/qa.md', '# QA\n')];
                case 3:
                    _j.sent();
                    return [4 /*yield*/, writeWorkspaceFile('contracts/shared.md', '# Shared\n')];
                case 4:
                    _j.sent();
                    return [4 /*yield*/, writeWorkspaceFile('contracts/contracts.json', '{"packageId":"contracts-1"}\n')];
                case 5:
                    _j.sent();
                    return [4 /*yield*/, writeWorkspaceFile('schemas/api.json', '{"type":"object"}\n')];
                case 6:
                    _j.sent();
                    _b = (_a = store).exportWorkflow;
                    _c = [workspaceRootUri];
                    return [4 /*yield*/, store.openWorkflowFile(workflowPath('full_export.json'))];
                case 7: return [4 /*yield*/, _b.apply(_a, _c.concat([_j.sent()]))];
                case 8:
                    exported = _j.sent();
                    (0, chai_1.expect)(exported.workflowId).to.equal('full_export');
                    (0, chai_1.expect)(exported.missingAgents).to.deep.equal([]);
                    (0, chai_1.expect)(exported.missingContracts).to.deep.equal([]);
                    (0, chai_1.expect)(exported.files).to.include.members([
                        'workflow/full_export.json',
                        'agents/agents/architect.md',
                        'agents/agents/qa.md',
                        'contracts/shared.md',
                        'contracts/contracts.json',
                        'schemas/api.json',
                        'metadata.json',
                        'manifest.json'
                    ]);
                    _e = (_d = JSON).parse;
                    return [4 /*yield*/, fs.readFile(path.join(exported.path, 'manifest.json'), 'utf8')];
                case 9:
                    manifest = _e.apply(_d, [_j.sent()]);
                    (0, chai_1.expect)(manifest.schemaVersion).to.equal('flow.workflow-export-manifest/v1');
                    (0, chai_1.expect)(manifest.workflowFile).to.equal('workflow/full_export.json');
                    (0, chai_1.expect)(manifest.agents).to.deep.equal(['agents/architect.md', 'agents/qa.md']);
                    (0, chai_1.expect)(manifest.contracts).to.deep.equal(['contracts/contracts.json', 'contracts/shared.md', 'schemas/api.json']);
                    _f = chai_1.expect;
                    _h = (_g = JSON).parse;
                    return [4 /*yield*/, fs.readFile(path.join(exported.path, 'workflow', 'full_export.json'), 'utf8')];
                case 10:
                    _f.apply(void 0, [_h.apply(_g, [_j.sent()])]).not.to.have.property('file');
                    return [2 /*return*/];
            }
        });
    }); });
    it('exports a workflow package to an explicit target URI and replaces stale package files', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, targetDir, exported, _a, _b, _c, _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    workflow = sampleWorkflow('targeted_export');
                    targetDir = path.join(tempDir, 'targeted-workflow-export');
                    return [4 /*yield*/, fs.mkdir(targetDir, { recursive: true })];
                case 1:
                    _h.sent();
                    return [4 /*yield*/, fs.writeFile(path.join(targetDir, 'stale.txt'), 'stale\n', 'utf8')];
                case 2:
                    _h.sent();
                    return [4 /*yield*/, store.saveWorkflow(workspaceRootUri, workflow)];
                case 3:
                    _h.sent();
                    _b = (_a = store).exportWorkflow;
                    _c = [workspaceRootUri];
                    return [4 /*yield*/, store.openWorkflowFile(workflowPath('targeted_export.json'))];
                case 4: return [4 /*yield*/, _b.apply(_a, _c.concat([_h.sent(), file_uri_1.FileUri.create(targetDir).toString()]))];
                case 5:
                    exported = _h.sent();
                    (0, chai_1.expect)(exported.path).to.equal(targetDir);
                    _d = chai_1.expect;
                    return [4 /*yield*/, fileExists(path.join(targetDir, 'stale.txt'))];
                case 6:
                    _d.apply(void 0, [_h.sent()]).to.equal(false);
                    (0, chai_1.expect)(exported.files).to.include.members(['workflow/targeted_export.json', 'metadata.json', 'manifest.json']);
                    _e = chai_1.expect;
                    _g = (_f = JSON).parse;
                    return [4 /*yield*/, fs.readFile(path.join(targetDir, 'manifest.json'), 'utf8')];
                case 7:
                    _e.apply(void 0, [_g.apply(_f, [_h.sent()])]).to.deep.include({
                        schemaVersion: 'flow.workflow-export-manifest/v1',
                        packageType: 'flow.workflow',
                        workflowId: 'targeted_export'
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    it('exports a complete run audit package aligned with flow export files', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, artifactFile, run, exported, manifest, _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x;
        return __generator(this, function (_y) {
            switch (_y.label) {
                case 0:
                    workflow = __assign(__assign({}, sampleWorkflow('run_export_workflow')), { agents: {
                            writer: 'agents/writer.md'
                        }, requires: {
                            capabilities: ['llm.agent.execute', 'filesystem.edit']
                        }, states: {
                            intake: {
                                type: 'agent',
                                agent: 'writer',
                                input: { include: ['contracts/contracts.json'] },
                                outputs: ['final/report.md']
                            }
                        } });
                    return [4 /*yield*/, store.saveWorkflow(workspaceRootUri, workflow)];
                case 1:
                    _y.sent();
                    artifactFile = path.join(tempDir, '.theia', 'flow', 'runs', 'run-1', 'final', 'report.md');
                    return [4 /*yield*/, fs.mkdir(path.dirname(artifactFile), { recursive: true })];
                case 2:
                    _y.sent();
                    return [4 /*yield*/, fs.writeFile(artifactFile, '# Final\n', 'utf8')];
                case 3:
                    _y.sent();
                    run = {
                        id: 'run-1',
                        workflowId: workflow.id,
                        prompt: 'ship audit export',
                        status: 'completed',
                        createdAt: '2026-05-20T10:00:00.000Z',
                        updatedAt: '2026-05-20T10:05:00.000Z',
                        currentStateIds: [],
                        stateStatuses: { intake: 'done' },
                        workloads: [{
                                id: 'wl-1',
                                runId: 'run-1',
                                stateId: 'intake',
                                agent: 'writer',
                                status: 'done',
                                inputArtifacts: ['contracts/contracts.json'],
                                outputArtifacts: [file_uri_1.FileUri.create(artifactFile).toString()],
                                issues: ['QA follow-up'],
                                effectIds: ['effect-1'],
                                createdAt: '2026-05-20T10:00:00.000Z',
                                updatedAt: '2026-05-20T10:05:00.000Z'
                            }],
                        events: [{
                                id: 'event-1',
                                runId: 'run-1',
                                workflowId: workflow.id,
                                type: 'run.completed',
                                timestamp: '2026-05-20T10:05:00.000Z',
                                message: 'completed'
                            }],
                        artifacts: [{
                                id: 'artifact-1',
                                runId: 'run-1',
                                stateId: 'final',
                                uri: file_uri_1.FileUri.create(artifactFile).toString(),
                                kind: 'report',
                                summary: 'Final report',
                                createdAt: '2026-05-20T10:05:00.000Z'
                            }],
                        effects: [{
                                id: 'effect-1',
                                runId: 'run-1',
                                stateId: 'intake',
                                kind: 'file',
                                type: 'file.edited',
                                path: 'src/index.ts',
                                status: 'applied',
                                summary: 'Updated source'
                            }],
                        signals: [],
                        gates: [],
                        memoryWrites: [{
                                id: 'memory-1',
                                runId: 'run-1',
                                candidateId: 'candidate-1',
                                status: 'written',
                                content: 'Keep the final report path stable.',
                                approvedAt: '2026-05-20T10:05:00.000Z',
                                scope: 'project',
                                target: 'project.decision'
                            }],
                        tick: 2
                    };
                    return [4 /*yield*/, store.exportRun(workspaceRootUri, workflow, run)];
                case 4:
                    exported = _y.sent();
                    (0, chai_1.expect)(exported.runId).to.equal('run-1');
                    (0, chai_1.expect)(exported.missingArtifacts).to.deep.equal([]);
                    (0, chai_1.expect)(exported.files).to.include.members([
                        'run.json',
                        'events.jsonl',
                        'capabilities.json',
                        'agents.json',
                        'contracts.json',
                        'artifacts.json',
                        'effects.json',
                        'issues.json',
                        'memory-writes.json',
                        'final-report.json',
                        'final-report.md',
                        'manifest.json'
                    ]);
                    _b = (_a = JSON).parse;
                    return [4 /*yield*/, fs.readFile(path.join(exported.path, 'manifest.json'), 'utf8')];
                case 5:
                    manifest = _b.apply(_a, [_y.sent()]);
                    (0, chai_1.expect)(manifest.schemaVersion).to.equal('flow.run-export-manifest/v1');
                    (0, chai_1.expect)(manifest.eventCount).to.equal(1);
                    (0, chai_1.expect)(manifest.artifactCount).to.equal(1);
                    (0, chai_1.expect)(manifest.capabilityCount).to.equal(2);
                    (0, chai_1.expect)(manifest.agentCount).to.equal(1);
                    (0, chai_1.expect)(manifest.contractCount).to.equal(1);
                    (0, chai_1.expect)(manifest.effectCount).to.equal(1);
                    (0, chai_1.expect)(manifest.issueCount).to.equal(1);
                    (0, chai_1.expect)(manifest.memoryWriteCount).to.equal(1);
                    (0, chai_1.expect)(manifest.components).to.deep.include({
                        capabilities: 'capabilities.json',
                        agents: 'agents.json',
                        contracts: 'contracts.json',
                        effects: 'effects.json',
                        issues: 'issues.json',
                        memoryWrites: 'memory-writes.json'
                    });
                    (0, chai_1.expect)(manifest.finalReport).to.deep.equal({ json: 'final-report.json', markdown: 'final-report.md' });
                    _c = chai_1.expect;
                    return [4 /*yield*/, fileExists(path.join(exported.path, 'artifacts', 'final', 'artifact-1-report.md'))];
                case 6:
                    _c.apply(void 0, [_y.sent()]).to.equal(true);
                    _d = chai_1.expect;
                    return [4 /*yield*/, fs.readFile(path.join(exported.path, 'events.jsonl'), 'utf8')];
                case 7:
                    _d.apply(void 0, [_y.sent()]).to.contain('"run.completed"');
                    _e = chai_1.expect;
                    _g = (_f = JSON).parse;
                    return [4 /*yield*/, fs.readFile(path.join(exported.path, 'run.json'), 'utf8')];
                case 8:
                    _e.apply(void 0, [_g.apply(_f, [_y.sent()])]).to.have.property('workflow');
                    _h = chai_1.expect;
                    _k = (_j = JSON).parse;
                    return [4 /*yield*/, fs.readFile(path.join(exported.path, 'capabilities.json'), 'utf8')];
                case 9:
                    _h.apply(void 0, [_k.apply(_j, [_y.sent()])]).to.deep.equal(['llm.agent.execute', 'filesystem.edit']);
                    _l = chai_1.expect;
                    _o = (_m = JSON).parse;
                    return [4 /*yield*/, fs.readFile(path.join(exported.path, 'agents.json'), 'utf8')];
                case 10:
                    _l.apply(void 0, [_o.apply(_m, [_y.sent()])[0]]).to.deep.include({ id: 'writer', path: 'agents/writer.md' });
                    _p = chai_1.expect;
                    _r = (_q = JSON).parse;
                    return [4 /*yield*/, fs.readFile(path.join(exported.path, 'contracts.json'), 'utf8')];
                case 11:
                    _p.apply(void 0, [_r.apply(_q, [_y.sent()])]).to.deep.equal(['contracts/contracts.json']);
                    _s = chai_1.expect;
                    _u = (_t = JSON).parse;
                    return [4 /*yield*/, fs.readFile(path.join(exported.path, 'memory-writes.json'), 'utf8')];
                case 12:
                    _s.apply(void 0, [_u.apply(_t, [_y.sent()])[0]]).to.deep.include({ id: 'memory-1', candidateId: 'candidate-1' });
                    _v = chai_1.expect;
                    _x = (_w = JSON).parse;
                    return [4 /*yield*/, fs.readFile(path.join(exported.path, 'final-report.json'), 'utf8')];
                case 13:
                    _v.apply(void 0, [_x.apply(_w, [_y.sent()])]).to.deep.include({
                        schemaVersion: 'flow.run-final-report/v1',
                        runId: 'run-1',
                        workflowId: 'run_export_workflow'
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    it('exports a run audit package to an explicit target path and reports missing artifacts', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, targetDir, missingArtifactUri, run, exported, _a, manifest, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    workflow = sampleWorkflow('targeted_run_export_workflow');
                    targetDir = path.join(tempDir, 'targeted-run-export');
                    return [4 /*yield*/, fs.mkdir(targetDir, { recursive: true })];
                case 1:
                    _d.sent();
                    return [4 /*yield*/, fs.writeFile(path.join(targetDir, 'old.json'), '{}\n', 'utf8')];
                case 2:
                    _d.sent();
                    missingArtifactUri = file_uri_1.FileUri.create(path.join(tempDir, 'missing-report.md')).toString();
                    run = {
                        id: 'targeted-run-export',
                        workflowId: workflow.id,
                        prompt: 'export run to target',
                        status: 'completed',
                        createdAt: '2026-05-20T13:00:00.000Z',
                        updatedAt: '2026-05-20T13:01:00.000Z',
                        currentStateIds: [],
                        stateStatuses: { intake: 'done' },
                        workloads: [],
                        events: [],
                        artifacts: [{
                                id: 'missing-artifact',
                                runId: 'targeted-run-export',
                                stateId: 'intake',
                                uri: missingArtifactUri,
                                kind: 'report',
                                summary: 'Missing report',
                                createdAt: '2026-05-20T13:01:00.000Z'
                            }],
                        effects: [],
                        signals: [],
                        gates: [],
                        tick: 1
                    };
                    return [4 /*yield*/, store.exportRun(workspaceRootUri, workflow, run, targetDir)];
                case 3:
                    exported = _d.sent();
                    (0, chai_1.expect)(exported.path).to.equal(targetDir);
                    _a = chai_1.expect;
                    return [4 /*yield*/, fileExists(path.join(targetDir, 'old.json'))];
                case 4:
                    _a.apply(void 0, [_d.sent()]).to.equal(false);
                    (0, chai_1.expect)(exported.missingArtifacts).to.deep.equal([missingArtifactUri]);
                    (0, chai_1.expect)(exported.files).to.include.members(['run.json', 'events.jsonl', 'artifacts.json', 'manifest.json']);
                    _c = (_b = JSON).parse;
                    return [4 /*yield*/, fs.readFile(path.join(targetDir, 'manifest.json'), 'utf8')];
                case 5:
                    manifest = _c.apply(_b, [_d.sent()]);
                    (0, chai_1.expect)(manifest.missingArtifacts).to.deep.equal([missingArtifactUri]);
                    (0, chai_1.expect)(manifest.artifactCount).to.equal(1);
                    return [2 /*return*/];
            }
        });
    }); });
    it('restores an older YAML workflow version without converting the workflow file to JSON', function () { return __awaiter(void 0, void 0, void 0, function () {
        var yamlPath, versions, initialVersion, restored, _a, _b, _c, _d;
        var _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    yamlPath = workflowPath('restore_yaml.yaml');
                    return [4 /*yield*/, store.saveWorkflow(workspaceRootUri, sampleWorkflow('restore_yaml'), yamlPath, {
                            author: 'Architect',
                            origin: 'create',
                            message: 'Initial YAML'
                        })];
                case 1:
                    _g.sent();
                    return [4 /*yield*/, store.saveWorkflow(workspaceRootUri, __assign(__assign({}, sampleWorkflow('restore_yaml')), { name: 'Restore YAML Edited', states: {
                                intake: { type: 'input' },
                                qa: { type: 'agent', agent: 'qa' }
                            }, transitions: [{ id: 'intake_to_qa', from: 'intake', to: 'qa', on: 'run.started' }] }), yamlPath, {
                            origin: 'save',
                            message: 'Add QA'
                        })];
                case 2:
                    _g.sent();
                    return [4 /*yield*/, store.listWorkflowVersions(workspaceRootUri, 'restore_yaml')];
                case 3:
                    versions = _g.sent();
                    initialVersion = versions.find(function (version) { return version.origin === 'create'; });
                    (0, chai_1.expect)(initialVersion).to.not.equal(undefined);
                    return [4 /*yield*/, store.restoreWorkflowVersion(workspaceRootUri, 'restore_yaml', initialVersion.id)];
                case 4:
                    restored = _g.sent();
                    (0, chai_1.expect)((_e = restored.file) === null || _e === void 0 ? void 0 : _e.format).to.equal('yaml');
                    (0, chai_1.expect)(normalizePath((_f = restored.file) === null || _f === void 0 ? void 0 : _f.path)).to.equal(normalizePath(yamlPath));
                    (0, chai_1.expect)(restored.states).not.to.have.property('qa');
                    _a = chai_1.expect;
                    return [4 /*yield*/, fileExists(workflowPath('restore_yaml.json'))];
                case 5:
                    _a.apply(void 0, [_g.sent()]).to.equal(false);
                    _b = chai_1.expect;
                    _d = (_c = yaml).load;
                    return [4 /*yield*/, fs.readFile(yamlPath, 'utf8')];
                case 6:
                    _b.apply(void 0, [_d.apply(_c, [_g.sent()])]).to.deep.include({
                        version: 'flow.workflow/v1',
                        id: 'restore_yaml',
                        name: 'restore_yaml'
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    it('records version diffs for metadata, agent, capability, guard, state, and transition changes', function () { return __awaiter(void 0, void 0, void 0, function () {
        var workflow, latest, diff;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    workflow = __assign(__assign({}, sampleWorkflow('diff_versions')), { agents: {
                            architect: 'agents/architect.md'
                        }, requires: {
                            capabilities: ['filesystem.write']
                        }, transitions: [
                            { id: 'intake_to_architect', from: 'intake', to: 'architect', on: 'run.started' }
                        ], states: {
                            intake: { type: 'input' },
                            architect: { type: 'agent', agent: 'architect' }
                        } });
                    return [4 /*yield*/, store.saveWorkflow(workspaceRootUri, workflow, undefined, { origin: 'create' })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, store.saveWorkflow(workspaceRootUri, __assign(__assign({}, workflow), { name: 'Diff Versions Edited', agents: {
                                reviewer: 'agents/reviewer.md'
                            }, requires: {
                                capabilities: ['llm.agent.execute']
                            }, states: {
                                intake: { type: 'input' },
                                review: { type: 'gate' }
                            }, transitions: [
                                { id: 'intake_to_review', from: 'intake', to: 'review', on: 'run.started', guard: { approved: true } }
                            ] }), undefined, { origin: 'save' })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, store.listWorkflowVersions(workspaceRootUri, workflow.id)];
                case 3:
                    latest = (_a.sent()).find(function (version) { return version.origin === 'save'; });
                    (0, chai_1.expect)(latest).to.not.equal(undefined);
                    diff = latest.diff.map(function (item) { return "".concat(item.kind, ":").concat(item.change, ":").concat(item.id, ":").concat(item.summary); });
                    (0, chai_1.expect)(diff).to.include.members([
                        'metadata:changed:name:diff_versions -> Diff Versions Edited',
                        'agent:removed:architect:agents/architect.md',
                        'agent:added:reviewer:agents/reviewer.md',
                        'capability:removed:filesystem.write:true',
                        'capability:added:llm.agent.execute:true',
                        'state:removed:architect:agent',
                        'state:added:review:gate',
                        'transition:removed:intake_to_architect:intake -> architect',
                        'transition:added:intake_to_review:intake -> review',
                        'guard:added:intake_to_review:approved'
                    ]);
                    return [2 /*return*/];
            }
        });
    }); });
    it('attaches run file metadata and exposes run path metadata', function () { return __awaiter(void 0, void 0, void 0, function () {
        var run, metadata;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, store.saveRun(workspaceRootUri, {
                        id: 'run-1',
                        workflowId: 'workflow-1',
                        prompt: 'ship',
                        status: 'idle',
                        createdAt: '2026-05-19T00:00:00.000Z',
                        updatedAt: '2026-05-19T00:00:00.000Z',
                        currentStateIds: [],
                        stateStatuses: {},
                        workloads: [],
                        events: [],
                        artifacts: [],
                        effects: [],
                        signals: [],
                        gates: [],
                        externalKernelMetadata: {
                            kernelRunId: 'kernel-run-1',
                            storeDir: '/tmp/kernel-runs',
                            workflowFile: '/tmp/workflow.json'
                        },
                        tick: 0
                    })];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, store.getRun(workspaceRootUri, 'run-1')];
                case 2:
                    run = _b.sent();
                    return [4 /*yield*/, store.runFileMetadata(workspaceRootUri, 'run-1')];
                case 3:
                    metadata = _b.sent();
                    (0, chai_1.expect)((_a = run === null || run === void 0 ? void 0 : run.file) === null || _a === void 0 ? void 0 : _a.path).to.equal(metadata.path);
                    (0, chai_1.expect)(normalizePath(metadata.path)).to.equal(normalizePath(path.join(tempDir, '.theia', 'flow', 'runs', 'run-1.json')));
                    (0, chai_1.expect)(metadata.format).to.equal('json');
                    (0, chai_1.expect)(run === null || run === void 0 ? void 0 : run.externalKernelMetadata).to.deep.equal({
                        kernelRunId: 'kernel-run-1',
                        storeDir: '/tmp/kernel-runs',
                        workflowFile: '/tmp/workflow.json'
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    function writeWorkflowFile(fileName, content) {
        return __awaiter(this, void 0, void 0, function () {
            var workflowsDir;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        workflowsDir = path.join(tempDir, '.theia', 'flow', 'workflows');
                        return [4 /*yield*/, fs.mkdir(workflowsDir, { recursive: true })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, fs.writeFile(path.join(workflowsDir, fileName), typeof content === 'string' ? content : "".concat(JSON.stringify(content, undefined, 2), "\n"), 'utf8')];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    function workflowPath(fileName) {
        return path.join(tempDir, '.theia', 'flow', 'workflows', fileName);
    }
    function presetPath(fileName) {
        return path.join(tempDir, '.theia', 'flow', 'presets', fileName);
    }
    function writeStorageFile(relativePath, content) {
        return __awaiter(this, void 0, void 0, function () {
            var file;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        file = path.join(tempDir, '.theia', 'flow', relativePath);
                        return [4 /*yield*/, fs.mkdir(path.dirname(file), { recursive: true })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, fs.writeFile(file, content, 'utf8')];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    function writeWorkspaceFile(relativePath, content) {
        return __awaiter(this, void 0, void 0, function () {
            var file;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        file = path.join(tempDir, relativePath);
                        return [4 /*yield*/, fs.mkdir(path.dirname(file), { recursive: true })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, fs.writeFile(file, content, 'utf8')];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
});
function sampleWorkflow(id) {
    return {
        version: 'flow.workflow/v1',
        id: id,
        name: id,
        states: {
            intake: { type: 'input' }
        },
        transitions: []
    };
}
function normalizePath(value) {
    return path.normalize(value || '').toLowerCase();
}
function samplePreset(id) {
    return {
        version: common_1.FLOW_PIPELINE_PRESET_VERSION,
        id: id,
        name: 'Configured Pipeline',
        description: 'Reusable configured pipeline.',
        source: 'workspace',
        agentMarkdown: [{ relativePath: 'reusable/agent.md', content: '# Reusable Agent' }],
        workflow: {
            version: 'flow.workflow/v1',
            id: id,
            name: 'Configured Pipeline',
            agents: {
                worker: 'reusable/agent.md'
            },
            states: {
                input: { type: 'input', outputs: ['input/request.md'] },
                worker: {
                    type: 'agent',
                    agent: 'worker',
                    provider: { providerId: 'command', modelId: 'custom-command-model' },
                    systemPrompt: 'System instructions',
                    taskPrompt: 'Task instructions',
                    input: { include: ['input/request.md'] },
                    outputs: ['work/result.md'],
                    deliverables: [{ path: 'work/result.md', description: 'Result', required: true, kind: 'markdown' }]
                },
                final_report: { type: 'report', input: { include: ['work/result.md'] }, outputs: ['final/report.md'] }
            },
            transitions: [
                { id: 'input_to_worker', from: 'input', to: 'worker', on: 'run.started' },
                { id: 'worker_to_final_report', from: 'worker', to: 'final_report', on: 'workload.completed' }
            ]
        }
    };
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
