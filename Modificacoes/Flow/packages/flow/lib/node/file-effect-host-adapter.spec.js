"use strict";
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
var file_effect_host_adapter_1 = require("./file-effect-host-adapter");
describe('LocalFileEffectHostAdapter', function () {
    var workspaceRoot;
    var workspaceRootUri;
    var adapter;
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.mkdtemp(path.join(os.tmpdir(), 'flow-file-effect-'))];
                case 1:
                    workspaceRoot = _a.sent();
                    workspaceRootUri = file_uri_1.FileUri.create(workspaceRoot).toString();
                    adapter = new file_effect_host_adapter_1.LocalFileEffectHostAdapter();
                    return [2 /*return*/];
            }
        });
    }); });
    afterEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.rm(workspaceRoot, { recursive: true, force: true })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('generates a diff before applying a file creation', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prepared, applied, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, adapter.prepare(workspaceRootUri, {
                        type: 'file.created',
                        path: 'src/notes.md',
                        content: '# Notes\n'
                    })];
                case 1:
                    prepared = _b.sent();
                    (0, chai_1.expect)(prepared.relativePath).to.equal('src/notes.md');
                    (0, chai_1.expect)(prepared.patch).to.contain('--- a/src/notes.md');
                    (0, chai_1.expect)(prepared.patch).to.contain('+++ b/src/notes.md');
                    (0, chai_1.expect)(prepared.patch).to.contain('+# Notes');
                    (0, chai_1.expect)(prepared.requiresApproval).to.equal(false);
                    return [4 /*yield*/, expectRejected(fs.readFile(path.join(workspaceRoot, 'src', 'notes.md'), 'utf8'))];
                case 2:
                    _b.sent();
                    return [4 /*yield*/, adapter.apply(workspaceRootUri, {
                            type: 'file.created',
                            path: 'src/notes.md',
                            content: '# Notes\n'
                        })];
                case 3:
                    applied = _b.sent();
                    (0, chai_1.expect)(applied.applied).to.equal(true);
                    _a = chai_1.expect;
                    return [4 /*yield*/, fs.readFile(path.join(workspaceRoot, 'src', 'notes.md'), 'utf8')];
                case 4:
                    _a.apply(void 0, [_b.sent()]).to.equal('# Notes\n');
                    return [2 /*return*/];
            }
        });
    }); });
    it('blocks path traversal and absolute paths', function () { return __awaiter(void 0, void 0, void 0, function () {
        var outside;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    outside = path.join(path.dirname(workspaceRoot), 'outside.md');
                    return [4 /*yield*/, expectRejected(adapter.prepare(workspaceRootUri, {
                            type: 'file.created',
                            path: '../outside.md',
                            content: 'outside'
                        }))];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, expectRejected(adapter.prepare(workspaceRootUri, {
                            type: 'file.created',
                            path: path.join(workspaceRoot, 'absolute.md'),
                            content: 'outside'
                        }))];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, expectRejected(adapter.apply(workspaceRootUri, {
                            type: 'file.created',
                            path: 'safe/../../outside.md',
                            content: 'outside'
                        }, true))];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, expectRejected(fs.readFile(outside, 'utf8'))];
                case 4:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('requires approval for destructive edits and does not write until approved', function () { return __awaiter(void 0, void 0, void 0, function () {
        var target, skipped, _a, applied, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    target = path.join(workspaceRoot, 'docs', 'guide.md');
                    return [4 /*yield*/, fs.mkdir(path.dirname(target), { recursive: true })];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, fs.writeFile(target, 'line one\nline two\n', 'utf8')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, adapter.apply(workspaceRootUri, {
                            type: 'file.edited',
                            path: 'docs/guide.md',
                            content: 'line one\n',
                            approvalPolicy: 'auto_apply'
                        })];
                case 3:
                    skipped = _c.sent();
                    (0, chai_1.expect)(skipped.applied).to.equal(false);
                    (0, chai_1.expect)(skipped.requiresApproval).to.equal(true);
                    (0, chai_1.expect)(skipped.approvalPolicy).to.equal('human_gate_required');
                    (0, chai_1.expect)(skipped.riskReasons).to.include('destructive file effect');
                    (0, chai_1.expect)(skipped.reason).to.contain('approval required');
                    _a = chai_1.expect;
                    return [4 /*yield*/, fs.readFile(target, 'utf8')];
                case 4:
                    _a.apply(void 0, [_c.sent()]).to.equal('line one\nline two\n');
                    return [4 /*yield*/, adapter.apply(workspaceRootUri, {
                            type: 'file.edited',
                            path: 'docs/guide.md',
                            content: 'line one\n'
                        }, true)];
                case 5:
                    applied = _c.sent();
                    (0, chai_1.expect)(applied.applied).to.equal(true);
                    _b = chai_1.expect;
                    return [4 /*yield*/, fs.readFile(target, 'utf8')];
                case 6:
                    _b.apply(void 0, [_c.sent()]).to.equal('line one\n');
                    return [2 /*return*/];
            }
        });
    }); });
    it('requires approval for destructive deletes and does not delete until approved', function () { return __awaiter(void 0, void 0, void 0, function () {
        var target, skipped, _a, applied;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    target = path.join(workspaceRoot, 'docs', 'obsolete.md');
                    return [4 /*yield*/, fs.mkdir(path.dirname(target), { recursive: true })];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, fs.writeFile(target, 'remove me\n', 'utf8')];
                case 2:
                    _b.sent();
                    return [4 /*yield*/, adapter.apply(workspaceRootUri, {
                            type: 'file.deleted',
                            path: 'docs/obsolete.md',
                            approvalPolicy: 'auto_apply'
                        })];
                case 3:
                    skipped = _b.sent();
                    (0, chai_1.expect)(skipped.applied).to.equal(false);
                    (0, chai_1.expect)(skipped.requiresApproval).to.equal(true);
                    (0, chai_1.expect)(skipped.approvalPolicy).to.equal('human_gate_required');
                    (0, chai_1.expect)(skipped.riskReasons).to.include('destructive file effect');
                    _a = chai_1.expect;
                    return [4 /*yield*/, fs.readFile(target, 'utf8')];
                case 4:
                    _a.apply(void 0, [_b.sent()]).to.equal('remove me\n');
                    return [4 /*yield*/, adapter.apply(workspaceRootUri, {
                            type: 'file.deleted',
                            path: 'docs/obsolete.md'
                        }, true)];
                case 5:
                    applied = _b.sent();
                    (0, chai_1.expect)(applied.applied).to.equal(true);
                    return [4 /*yield*/, expectRejected(fs.readFile(target, 'utf8'))];
                case 6:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('requires approval when a file effect targets a path outside the allowlist', function () { return __awaiter(void 0, void 0, void 0, function () {
        var skipped, applied, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, adapter.apply(workspaceRootUri, {
                        type: 'file.created',
                        path: 'src/app.ts',
                        content: 'export const value = 1;\n',
                        allowedPaths: ['docs/report.md'],
                        approvalPolicy: 'auto_apply'
                    })];
                case 1:
                    skipped = _b.sent();
                    (0, chai_1.expect)(skipped.applied).to.equal(false);
                    (0, chai_1.expect)(skipped.requiresApproval).to.equal(true);
                    (0, chai_1.expect)(skipped.approvalPolicy).to.equal('human_gate_required');
                    (0, chai_1.expect)(skipped.riskReasons).to.include('path outside allowlist: src/app.ts');
                    return [4 /*yield*/, expectRejected(fs.readFile(path.join(workspaceRoot, 'src', 'app.ts'), 'utf8'))];
                case 2:
                    _b.sent();
                    return [4 /*yield*/, adapter.apply(workspaceRootUri, {
                            type: 'file.created',
                            path: 'src/app.ts',
                            content: 'export const value = 1;\n',
                            allowedPaths: ['docs/report.md'],
                            approvalPolicy: 'auto_apply'
                        }, true)];
                case 3:
                    applied = _b.sent();
                    (0, chai_1.expect)(applied.applied).to.equal(true);
                    _a = chai_1.expect;
                    return [4 /*yield*/, fs.readFile(path.join(workspaceRoot, 'src', 'app.ts'), 'utf8')];
                case 4:
                    _a.apply(void 0, [_b.sent()]).to.equal('export const value = 1;\n');
                    return [2 /*return*/];
            }
        });
    }); });
    it('blocks denied file effect paths even when they are otherwise allowed', function () { return __awaiter(void 0, void 0, void 0, function () {
        var blocked;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, adapter.apply(workspaceRootUri, {
                        type: 'file.created',
                        path: 'secrets/token.txt',
                        content: 'secret\n',
                        allowedPaths: ['secrets/'],
                        deniedPaths: ['secrets/'],
                        approvalPolicy: 'auto_apply'
                    }, true)];
                case 1:
                    blocked = _a.sent();
                    (0, chai_1.expect)(blocked.applied).to.equal(false);
                    (0, chai_1.expect)(blocked.blocked).to.equal(true);
                    (0, chai_1.expect)(blocked.approvalPolicy).to.equal('blocked');
                    (0, chai_1.expect)(blocked.reason).to.contain('path denied by policy: secrets/token.txt');
                    return [4 /*yield*/, expectRejected(fs.readFile(path.join(workspaceRoot, 'secrets', 'token.txt'), 'utf8'))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('blocks writes into Theia and Flow internal storage', function () { return __awaiter(void 0, void 0, void 0, function () {
        var blocked;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, adapter.apply(workspaceRootUri, {
                        type: 'file.created',
                        path: '.theia/flow/runs/other-run/report.md',
                        content: 'cross-run write\n',
                        approvalPolicy: 'auto_apply'
                    }, true)];
                case 1:
                    blocked = _a.sent();
                    (0, chai_1.expect)(blocked.applied).to.equal(false);
                    (0, chai_1.expect)(blocked.blocked).to.equal(true);
                    (0, chai_1.expect)(blocked.approvalPolicy).to.equal('blocked');
                    (0, chai_1.expect)(blocked.reason).to.contain('path targets internal Theia/Flow storage');
                    return [4 /*yield*/, expectRejected(fs.readFile(path.join(workspaceRoot, '.theia', 'flow', 'runs', 'other-run', 'report.md'), 'utf8'))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('blocks file effects that cross a workspace symlink boundary', function () { return __awaiter(void 0, void 0, void 0, function () {
        var outsideRoot, outsideTarget, linkPath, blocked;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.mkdtemp(path.join(os.tmpdir(), 'flow-file-effect-outside-'))];
                case 1:
                    outsideRoot = _a.sent();
                    outsideTarget = path.join(outsideRoot, 'escaped.md');
                    linkPath = path.join(workspaceRoot, 'linked');
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 6, 8]);
                    return [4 /*yield*/, fs.symlink(outsideRoot, linkPath, 'dir')];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, adapter.apply(workspaceRootUri, {
                            type: 'file.created',
                            path: 'linked/escaped.md',
                            content: 'escaped\n',
                            approvalPolicy: 'auto_apply'
                        }, true)];
                case 4:
                    blocked = _a.sent();
                    (0, chai_1.expect)(blocked.applied).to.equal(false);
                    (0, chai_1.expect)(blocked.blocked).to.equal(true);
                    (0, chai_1.expect)(blocked.approvalPolicy).to.equal('blocked');
                    (0, chai_1.expect)(blocked.reason).to.contain('path crosses a symbolic link inside the workspace: linked');
                    return [4 /*yield*/, expectRejected(fs.readFile(outsideTarget, 'utf8'))];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 8];
                case 6: return [4 /*yield*/, fs.rm(outsideRoot, { recursive: true, force: true })];
                case 7:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    }); });
    it('requires approval when hashBefore conflicts', function () { return __awaiter(void 0, void 0, void 0, function () {
        var target, skipped, _a, applied, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    target = path.join(workspaceRoot, 'src', 'app.ts');
                    return [4 /*yield*/, fs.mkdir(path.dirname(target), { recursive: true })];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, fs.writeFile(target, 'const value = 1;\n', 'utf8')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, adapter.apply(workspaceRootUri, {
                            type: 'file.edited',
                            path: 'src/app.ts',
                            content: 'const value = 2;\n',
                            hashBefore: 'sha256:not-the-current-hash',
                            approvalPolicy: 'auto_apply'
                        })];
                case 3:
                    skipped = _c.sent();
                    (0, chai_1.expect)(skipped.applied).to.equal(false);
                    (0, chai_1.expect)(skipped.blocked).to.equal(false);
                    (0, chai_1.expect)(skipped.requiresApproval).to.equal(true);
                    (0, chai_1.expect)(skipped.approvalPolicy).to.equal('human_gate_required');
                    (0, chai_1.expect)(skipped.riskReasons).to.include('hashBefore mismatch for src/app.ts');
                    (0, chai_1.expect)(skipped.reason).to.contain('approval required');
                    _a = chai_1.expect;
                    return [4 /*yield*/, fs.readFile(target, 'utf8')];
                case 4:
                    _a.apply(void 0, [_c.sent()]).to.equal('const value = 1;\n');
                    return [4 /*yield*/, adapter.apply(workspaceRootUri, {
                            type: 'file.edited',
                            path: 'src/app.ts',
                            content: 'const value = 2;\n',
                            hashBefore: 'sha256:not-the-current-hash',
                            approvalPolicy: 'auto_apply'
                        }, true)];
                case 5:
                    applied = _c.sent();
                    (0, chai_1.expect)(applied.applied).to.equal(true);
                    _b = chai_1.expect;
                    return [4 /*yield*/, fs.readFile(target, 'utf8')];
                case 6:
                    _b.apply(void 0, [_c.sent()]).to.equal('const value = 2;\n');
                    return [2 /*return*/];
            }
        });
    }); });
});
function expectRejected(action) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, action];
                case 1:
                    _b.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/];
                case 3: throw new Error('Expected promise to be rejected.');
            }
        });
    });
}
