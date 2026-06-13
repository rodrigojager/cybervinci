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
var image_effect_host_adapter_1 = require("./image-effect-host-adapter");
describe('LocalImageEffectHostAdapter', function () {
    var workspaceRoot;
    var workspaceRootUri;
    var adapter;
    var previousProvider;
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.mkdtemp(path.join(os.tmpdir(), 'flow-image-effect-'))];
                case 1:
                    workspaceRoot = _a.sent();
                    workspaceRootUri = file_uri_1.FileUri.create(workspaceRoot).toString();
                    adapter = new image_effect_host_adapter_1.LocalImageEffectHostAdapter();
                    previousProvider = process.env.FLOW_IMAGE_PROVIDER_COMMAND;
                    delete process.env.FLOW_IMAGE_PROVIDER_COMMAND;
                    return [2 /*return*/];
            }
        });
    }); });
    afterEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (previousProvider === undefined) {
                        delete process.env.FLOW_IMAGE_PROVIDER_COMMAND;
                    }
                    else {
                        process.env.FLOW_IMAGE_PROVIDER_COMMAND = previousProvider;
                    }
                    return [4 /*yield*/, fs.rm(workspaceRoot, { recursive: true, force: true })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('blocks image effects when no provider is configured', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, adapter.apply(workspaceRootUri, 'run-1', 'workload-1', {
                        type: 'image.generate',
                        prompt: 'A compact UI mockup.',
                        artifactPath: 'images/mockup.png',
                        approvalPolicy: 'auto_apply'
                    }, true)];
                case 1:
                    result = _a.sent();
                    (0, chai_1.expect)(result.applied).to.equal(false);
                    (0, chai_1.expect)(result.status).to.equal('blocked');
                    (0, chai_1.expect)(result.reason).to.contain('Image provider is not configured');
                    return [4 /*yield*/, expectRejected(fs.access(path.join(workspaceRoot, '.theia', 'flow', 'runs', 'run-1', 'artifacts', 'images', 'mockup.png')))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('runs a configured mock provider and writes the image artifact after approval', function () { return __awaiter(void 0, void 0, void 0, function () {
        var proposed, applied, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    process.env.FLOW_IMAGE_PROVIDER_COMMAND = "\"".concat(process.execPath, "\" -e \"process.stdin.resume();process.stdin.on('end',()=>console.log(JSON.stringify({base64:Buffer.from('mock-image').toString('base64')})))\"");
                    return [4 /*yield*/, adapter.apply(workspaceRootUri, 'run-1', 'workload-1', {
                            type: 'image.generate',
                            prompt: 'A compact UI mockup.',
                            artifactPath: 'images/mockup.png'
                        })];
                case 1:
                    proposed = _b.sent();
                    (0, chai_1.expect)(proposed.applied).to.equal(false);
                    (0, chai_1.expect)(proposed.status).to.equal('proposed');
                    (0, chai_1.expect)(proposed.requiresApproval).to.equal(true);
                    return [4 /*yield*/, adapter.apply(workspaceRootUri, 'run-1', 'workload-1', {
                            type: 'image.generate',
                            prompt: 'A compact UI mockup.',
                            artifactPath: 'images/mockup.png'
                        }, true)];
                case 2:
                    applied = _b.sent();
                    (0, chai_1.expect)(applied.applied).to.equal(true);
                    (0, chai_1.expect)(applied.status).to.equal('applied');
                    (0, chai_1.expect)(applied.mimeType).to.equal('image/png');
                    (0, chai_1.expect)(applied.bytes).to.equal(Buffer.byteLength('mock-image'));
                    _a = chai_1.expect;
                    return [4 /*yield*/, fs.readFile(path.join(workspaceRoot, '.theia', 'flow', 'runs', 'run-1', 'artifacts', 'images', 'mockup.png'), 'utf8')];
                case 3:
                    _a.apply(void 0, [_b.sent()]).to.equal('mock-image');
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
