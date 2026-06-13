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
var command_effect_host_adapter_1 = require("./command-effect-host-adapter");
describe('LocalCommandEffectHostAdapter', function () {
    var workspaceRoot;
    var workspaceRootUri;
    var adapter;
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.mkdtemp(path.join(os.tmpdir(), 'flow-command-effect-'))];
                case 1:
                    workspaceRoot = _a.sent();
                    workspaceRootUri = file_uri_1.FileUri.create(workspaceRoot).toString();
                    adapter = new command_effect_host_adapter_1.LocalCommandEffectHostAdapter();
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
    it('executes an allowlisted command with allowed env and redacted stdout', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, adapter.apply(workspaceRootUri, {
                        command: JSON.stringify([process.execPath, '-e', "console.log(process.env.VISIBLE + ' token=secret-value')"]),
                        env: {
                            VISIBLE: 'ok',
                            HIDDEN: 'no'
                        },
                        allowedEnv: ['VISIBLE'],
                        allowedCommands: [process.execPath],
                        approvalPolicy: 'auto_apply',
                        timeoutMs: 5000
                    }, true)];
                case 1:
                    result = _a.sent();
                    (0, chai_1.expect)(result.status).to.equal('applied');
                    (0, chai_1.expect)(result.applied).to.equal(true);
                    (0, chai_1.expect)(result.exitCode).to.equal(0);
                    (0, chai_1.expect)(result.stdout).to.contain('ok');
                    (0, chai_1.expect)(result.stdout).to.contain('token=[REDACTED]');
                    (0, chai_1.expect)(result.env).to.deep.equal({ VISIBLE: 'ok' });
                    return [2 /*return*/];
            }
        });
    }); });
    it('blocks commands outside the allowlist without executing them', function () { return __awaiter(void 0, void 0, void 0, function () {
        var marker, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    marker = path.join(workspaceRoot, 'blocked-marker.txt');
                    return [4 /*yield*/, adapter.apply(workspaceRootUri, {
                            command: JSON.stringify([process.execPath, '-e', "require('fs').writeFileSync(".concat(JSON.stringify(marker), ", 'ran')")]),
                            allowedCommands: ['not-node'],
                            approvalPolicy: 'auto_apply'
                        }, true)];
                case 1:
                    result = _a.sent();
                    (0, chai_1.expect)(result.status).to.equal('blocked');
                    (0, chai_1.expect)(result.applied).to.equal(false);
                    (0, chai_1.expect)(result.stderr).to.contain('command outside allowlist');
                    return [4 /*yield*/, expectRejected(fs.readFile(marker, 'utf8'))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('treats missing approval as rejected and does not execute the command', function () { return __awaiter(void 0, void 0, void 0, function () {
        var marker, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    marker = path.join(workspaceRoot, 'approval-marker.txt');
                    return [4 /*yield*/, adapter.apply(workspaceRootUri, {
                            command: JSON.stringify([process.execPath, '-e', "require('fs').writeFileSync(".concat(JSON.stringify(marker), ", 'ran')")]),
                            allowedCommands: [process.execPath],
                            approvalPolicy: 'human_gate_required'
                        })];
                case 1:
                    result = _a.sent();
                    (0, chai_1.expect)(result.status).to.equal('proposed');
                    (0, chai_1.expect)(result.applied).to.equal(false);
                    (0, chai_1.expect)(result.stderr).to.contain('approval required');
                    return [4 /*yield*/, expectRejected(fs.readFile(marker, 'utf8'))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('rejects cwd traversal outside the workspace', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, expectRejected(adapter.prepare(workspaceRootUri, {
                        command: "".concat(process.execPath, " -v"),
                        cwd: '..',
                        allowedCommands: [process.execPath]
                    }))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('fails timed out commands and records timeout metadata', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, adapter.apply(workspaceRootUri, {
                        command: JSON.stringify([process.execPath, '-e', 'setTimeout(() => undefined, 1000)']),
                        allowedCommands: [process.execPath],
                        approvalPolicy: 'auto_apply',
                        timeoutMs: 50
                    }, true)];
                case 1:
                    result = _a.sent();
                    (0, chai_1.expect)(result.status).to.equal('failed');
                    (0, chai_1.expect)(result.applied).to.equal(true);
                    (0, chai_1.expect)(result.timedOut).to.equal(true);
                    (0, chai_1.expect)(result.timeoutMs).to.equal(50);
                    (0, chai_1.expect)(result.completedAt).to.be.a('string');
                    return [2 /*return*/];
            }
        });
    }); });
    it('truncates large stdout while preserving redaction', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, adapter.apply(workspaceRootUri, {
                        command: JSON.stringify([process.execPath, '-e', "process.stdout.write('token=secret-value\\n' + 'x'.repeat(13000))"]),
                        allowedCommands: [process.execPath],
                        approvalPolicy: 'auto_apply',
                        timeoutMs: 5000
                    }, true)];
                case 1:
                    result = _a.sent();
                    (0, chai_1.expect)(result.status).to.equal('applied');
                    (0, chai_1.expect)(result.stdout).to.contain('token=[REDACTED]');
                    (0, chai_1.expect)(result.stdout).to.have.length.greaterThan(12000);
                    (0, chai_1.expect)(result.stdout).to.contain('[truncated command output]');
                    (0, chai_1.expect)(result.stdout).to.not.contain('secret-value');
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
