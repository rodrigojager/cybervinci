"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalImageEffectHostAdapter = exports.ImageEffectHostAdapter = void 0;
var child_process_1 = require("child_process");
var fs = require("fs/promises");
var path = require("path");
var file_uri_1 = require("@theia/core/lib/common/file-uri");
var inversify_1 = require("@theia/core/shared/inversify");
var common_1 = require("../common");
var flow_path_policy_1 = require("./flow-path-policy");
exports.ImageEffectHostAdapter = Symbol('ImageEffectHostAdapter');
var LocalImageEffectHostAdapter = function () {
    var _classDecorators = [(0, inversify_1.injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var LocalImageEffectHostAdapter = _classThis = /** @class */ (function () {
        function LocalImageEffectHostAdapter_1() {
        }
        LocalImageEffectHostAdapter_1.prototype.apply = function (workspaceRootUri_1, runId_1, workloadId_1, effect_1) {
            return __awaiter(this, arguments, void 0, function (workspaceRootUri, runId, workloadId, effect, approved) {
                var command, prompt, artifactPath, mimeType, absolutePath, provider, policy, result;
                if (approved === void 0) { approved = false; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            command = imageProviderCommand(effect.provider);
                            prompt = normalizePrompt(effect.prompt || effect.summary);
                            artifactPath = normalizeArtifactPath(effect.artifactPath || effect.path || "images/".concat(workloadId, ".png"));
                            mimeType = normalizeMimeType(effect.mimeType, artifactPath);
                            absolutePath = resolveArtifactFile(workspaceRootUri, runId, artifactPath);
                            provider = effect.provider || 'command';
                            policy = (0, common_1.decideFlowApprovalPolicy)({
                                action: 'image_effect',
                                requestedPolicy: effect.approvalPolicy,
                                approved: approved
                            });
                            if (!command) {
                                return [2 /*return*/, {
                                        applied: false,
                                        status: 'blocked',
                                        provider: provider,
                                        prompt: prompt,
                                        artifactPath: artifactPath,
                                        absolutePath: absolutePath,
                                        mimeType: mimeType,
                                        reason: 'Image provider is not configured. Set FLOW_IMAGE_PROVIDER_COMMAND to enable image effects.',
                                        approvalPolicy: policy.policy,
                                        requiresApproval: policy.requiresApproval
                                    }];
                            }
                            if (policy.blocked || !policy.approved) {
                                return [2 /*return*/, {
                                        applied: false,
                                        status: policy.status === 'blocked' ? 'blocked' : 'proposed',
                                        provider: provider,
                                        prompt: prompt,
                                        artifactPath: artifactPath,
                                        absolutePath: absolutePath,
                                        mimeType: mimeType,
                                        reason: policy.message,
                                        approvalPolicy: policy.policy,
                                        requiresApproval: policy.requiresApproval
                                    }];
                            }
                            return [4 /*yield*/, invokeImageProvider(command, { prompt: prompt, artifactPath: artifactPath, mimeType: mimeType, runId: runId, workloadId: workloadId })];
                        case 1:
                            result = _a.sent();
                            if (result.status !== 'applied' || !result.content.length) {
                                return [2 /*return*/, {
                                        applied: false,
                                        status: result.status,
                                        provider: provider,
                                        prompt: prompt,
                                        artifactPath: artifactPath,
                                        absolutePath: absolutePath,
                                        mimeType: mimeType,
                                        stdout: result.stdout,
                                        stderr: result.stderr,
                                        reason: result.stderr || 'Image provider did not return image content.',
                                        approvalPolicy: policy.policy,
                                        requiresApproval: policy.requiresApproval
                                    }];
                            }
                            return [4 /*yield*/, fs.mkdir(path.dirname(absolutePath), { recursive: true })];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, fs.writeFile(absolutePath, result.content)];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, {
                                    applied: true,
                                    status: 'applied',
                                    provider: provider,
                                    prompt: prompt,
                                    artifactPath: artifactPath,
                                    absolutePath: absolutePath,
                                    uri: file_uri_1.FileUri.create(absolutePath).toString(),
                                    mimeType: mimeType,
                                    bytes: result.content.length,
                                    stdout: result.stdout,
                                    stderr: result.stderr,
                                    approvalPolicy: policy.policy,
                                    requiresApproval: policy.requiresApproval
                                }];
                    }
                });
            });
        };
        return LocalImageEffectHostAdapter_1;
    }());
    __setFunctionName(_classThis, "LocalImageEffectHostAdapter");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LocalImageEffectHostAdapter = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LocalImageEffectHostAdapter = _classThis;
}();
exports.LocalImageEffectHostAdapter = LocalImageEffectHostAdapter;
function imageProviderCommand(provider) {
    var providerKey = provider ? provider.trim().replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase() : '';
    var providerSpecific = providerKey ? process.env["FLOW_IMAGE_PROVIDER_".concat(providerKey, "_COMMAND")] : undefined;
    return providerSpecific || process.env.FLOW_IMAGE_PROVIDER_COMMAND || undefined;
}
function resolveArtifactFile(workspaceRootUri, runId, artifactPath) {
    if (!workspaceRootUri) {
        throw new Error('workspaceRootUri is required to apply image effects.');
    }
    var workspaceRoot = path.resolve(file_uri_1.FileUri.fsPath(workspaceRootUri));
    var runArtifactRoot = path.resolve((0, flow_path_policy_1.resolveFlowRunDirectory)(workspaceRoot, runId), 'artifacts');
    var absolutePath = path.resolve(runArtifactRoot, artifactPath);
    var relative = path.relative(runArtifactRoot, absolutePath);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error("Image artifact path escapes the run artifact directory: ".concat(artifactPath));
    }
    return absolutePath;
}
function normalizePrompt(value) {
    var prompt = value === null || value === void 0 ? void 0 : value.trim();
    if (!prompt) {
        throw new Error('Image effect prompt is required.');
    }
    return prompt;
}
function normalizeArtifactPath(value) {
    var normalized = value.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/').trim();
    if (!normalized || normalized.includes('\0') || path.isAbsolute(normalized)) {
        throw new Error("Image artifact path must be relative: ".concat(value));
    }
    return normalized.split('/').filter(Boolean).map(function (segment) { return segment.replace(/[^a-zA-Z0-9._-]/g, '_'); }).join('/');
}
function normalizeMimeType(value, artifactPath) {
    var trimmed = value === null || value === void 0 ? void 0 : value.trim();
    if (trimmed) {
        return trimmed;
    }
    var ext = path.extname(artifactPath).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') {
        return 'image/jpeg';
    }
    if (ext === '.webp') {
        return 'image/webp';
    }
    return 'image/png';
}
function invokeImageProvider(command, payload) {
    return new Promise(function (resolve) {
        var _a, _b;
        var child = (0, child_process_1.spawn)(command, [], { shell: true, windowsHide: true });
        var stdout = '';
        var stderr = '';
        (_a = child.stdout) === null || _a === void 0 ? void 0 : _a.on('data', function (chunk) { return stdout += String(chunk); });
        (_b = child.stderr) === null || _b === void 0 ? void 0 : _b.on('data', function (chunk) { return stderr += String(chunk); });
        child.on('error', function (error) { return resolve({ status: 'failed', content: Buffer.alloc(0), stdout: stdout, stderr: error.message }); });
        child.on('close', function (code) {
            if (code !== 0) {
                resolve({ status: 'failed', content: Buffer.alloc(0), stdout: stdout, stderr: stderr });
                return;
            }
            decodeProviderOutput(stdout).then(function (content) {
                resolve({ status: 'applied', content: content, stdout: redact(stdout), stderr: redact(stderr) });
            }).catch(function (error) {
                resolve({ status: 'failed', content: Buffer.alloc(0), stdout: redact(stdout), stderr: error.message });
            });
        });
        child.stdin.end(JSON.stringify(payload));
    });
}
function decodeProviderOutput(stdout) {
    return __awaiter(this, void 0, void 0, function () {
        var raw, parsed, encoded;
        var _a;
        return __generator(this, function (_b) {
            raw = stdout.trim();
            if (!raw) {
                return [2 /*return*/, Buffer.alloc(0)];
            }
            try {
                parsed = JSON.parse(raw);
                encoded = parsed.base64 || ((_a = parsed.dataUri) === null || _a === void 0 ? void 0 : _a.replace(/^data:[^;]+;base64,/, ''));
                if (encoded) {
                    return [2 /*return*/, Buffer.from(encoded, 'base64')];
                }
                if (parsed.path) {
                    return [2 /*return*/, fs.readFile(parsed.path)];
                }
            }
            catch (_c) {
                // fall through to raw base64
            }
            return [2 /*return*/, Buffer.from(raw.replace(/^data:[^;]+;base64,/, ''), 'base64')];
        });
    });
}
function redact(value) {
    return value.replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*([^\s]+)/gi, '$1=[REDACTED]').slice(0, 12000);
}
