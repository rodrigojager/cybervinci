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
exports.LocalFileEffectHostAdapter = exports.FileEffectHostAdapter = void 0;
var crypto = require("crypto");
var fs = require("fs/promises");
var path = require("path");
var file_uri_1 = require("@theia/core/lib/common/file-uri");
var inversify_1 = require("@theia/core/shared/inversify");
var common_1 = require("../common");
var flow_path_policy_1 = require("./flow-path-policy");
exports.FileEffectHostAdapter = Symbol('FileEffectHostAdapter');
var LocalFileEffectHostAdapter = function () {
    var _classDecorators = [(0, inversify_1.injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var LocalFileEffectHostAdapter = _classThis = /** @class */ (function () {
        function LocalFileEffectHostAdapter_1() {
        }
        LocalFileEffectHostAdapter_1.prototype.prepare = function (workspaceRootUri, effect) {
            return __awaiter(this, void 0, void 0, function () {
                var type, workspaceRoot, resolved, current, contentBefore, contentAfter, hashBefore, hashAfter, hashConflict, destructive, outsideAllowlist, deniedPath, internalPath, symlinkBoundary, riskReasons, policy;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            type = normalizeFileEffectType(effect.type);
                            workspaceRoot = resolveWorkspaceRoot(workspaceRootUri);
                            resolved = (0, flow_path_policy_1.resolveFlowWorkspacePath)(workspaceRoot, effect.path);
                            return [4 /*yield*/, readExistingText(resolved.absolutePath)];
                        case 1:
                            current = _a.sent();
                            contentBefore = current.content;
                            contentAfter = nextContent(type, effect, contentBefore);
                            hashBefore = sha256(contentBefore);
                            hashAfter = sha256(contentAfter);
                            hashConflict = Boolean(effect.hashBefore && effect.hashBefore !== hashBefore);
                            destructive = type === 'file.deleted' || (type === 'file.edited' && current.existed && contentAfter.length < contentBefore.length);
                            outsideAllowlist = (0, flow_path_policy_1.isOutsideFlowAllowlist)(resolved.relativePath, effect.allowedPaths);
                            deniedPath = (0, flow_path_policy_1.isDeniedFlowPath)(resolved.relativePath, effect.deniedPaths);
                            internalPath = (0, flow_path_policy_1.isFlowInternalPath)(resolved.relativePath);
                            return [4 /*yield*/, findSymlinkBoundary(workspaceRoot, resolved.absolutePath)];
                        case 2:
                            symlinkBoundary = _a.sent();
                            riskReasons = [
                                destructive ? 'destructive file effect' : undefined,
                                outsideAllowlist ? "path outside allowlist: ".concat(resolved.relativePath) : undefined,
                                hashConflict ? "hashBefore mismatch for ".concat(resolved.relativePath) : undefined
                            ].filter(function (reason) { return Boolean(reason); });
                            policy = (0, common_1.decideFlowApprovalPolicy)({
                                action: 'file_effect',
                                requestedPolicy: effect.approvalPolicy,
                                riskReasons: riskReasons,
                                blockedReasons: [
                                    deniedPath ? "path denied by policy: ".concat(resolved.relativePath) : undefined,
                                    internalPath ? "path targets internal Theia/Flow storage: ".concat(resolved.relativePath) : undefined,
                                    symlinkBoundary ? "path crosses a symbolic link inside the workspace: ".concat(symlinkBoundary) : undefined
                                ].filter(function (reason) { return Boolean(reason); })
                            });
                            return [2 /*return*/, {
                                    type: type,
                                    workspaceRoot: workspaceRoot,
                                    relativePath: resolved.relativePath,
                                    absolutePath: resolved.absolutePath,
                                    existedBefore: current.existed,
                                    contentBefore: contentBefore,
                                    contentAfter: contentAfter,
                                    hashBefore: hashBefore,
                                    hashAfter: hashAfter,
                                    patch: unifiedDiff(resolved.relativePath, contentBefore, contentAfter),
                                    approvalPolicy: policy.policy,
                                    requiresApproval: policy.requiresApproval,
                                    blocked: policy.blocked,
                                    riskReasons: riskReasons,
                                    reason: policy.message
                                }];
                    }
                });
            });
        };
        LocalFileEffectHostAdapter_1.prototype.apply = function (workspaceRootUri_1, effect_1) {
            return __awaiter(this, arguments, void 0, function (workspaceRootUri, effect, approved) {
                var prepared;
                if (approved === void 0) { approved = false; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prepare(workspaceRootUri, effect)];
                        case 1:
                            prepared = _a.sent();
                            if (prepared.blocked) {
                                return [2 /*return*/, __assign(__assign({}, prepared), { applied: false })];
                            }
                            if (prepared.requiresApproval && !approved) {
                                return [2 /*return*/, __assign(__assign({}, prepared), { applied: false, reason: "approval required by ".concat(prepared.approvalPolicy) })];
                            }
                            if (!(prepared.type === 'file.deleted')) return [3 /*break*/, 4];
                            if (!prepared.existedBefore) return [3 /*break*/, 3];
                            return [4 /*yield*/, fs.rm(prepared.absolutePath)];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3: return [2 /*return*/, __assign(__assign({}, prepared), { applied: true })];
                        case 4: return [4 /*yield*/, fs.mkdir(path.dirname(prepared.absolutePath), { recursive: true })];
                        case 5:
                            _a.sent();
                            return [4 /*yield*/, fs.writeFile(prepared.absolutePath, prepared.contentAfter, 'utf8')];
                        case 6:
                            _a.sent();
                            return [2 /*return*/, __assign(__assign({}, prepared), { applied: true })];
                    }
                });
            });
        };
        return LocalFileEffectHostAdapter_1;
    }());
    __setFunctionName(_classThis, "LocalFileEffectHostAdapter");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LocalFileEffectHostAdapter = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LocalFileEffectHostAdapter = _classThis;
}();
exports.LocalFileEffectHostAdapter = LocalFileEffectHostAdapter;
function resolveWorkspaceRoot(workspaceRootUri) {
    if (!workspaceRootUri) {
        throw new Error('workspaceRootUri is required to apply file effects.');
    }
    return path.resolve(file_uri_1.FileUri.fsPath(workspaceRootUri));
}
function readExistingText(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var stat, error_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fs.stat(filePath)];
                case 1:
                    stat = _b.sent();
                    if (!stat.isFile()) {
                        throw new Error("File effect target is not a file: ".concat(filePath));
                    }
                    _a = { existed: true };
                    return [4 /*yield*/, fs.readFile(filePath, 'utf8')];
                case 2: return [2 /*return*/, (_a.content = _b.sent(), _a)];
                case 3:
                    error_1 = _b.sent();
                    if (error_1.code === 'ENOENT') {
                        return [2 /*return*/, { existed: false, content: '' }];
                    }
                    throw error_1;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function findSymlinkBoundary(workspaceRoot, absolutePath) {
    return __awaiter(this, void 0, void 0, function () {
        var resolvedRoot, current, candidates, _i, _a, candidate, stat, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    resolvedRoot = path.resolve(workspaceRoot);
                    current = path.resolve(absolutePath);
                    candidates = [];
                    while (current.startsWith(resolvedRoot) && current !== resolvedRoot) {
                        candidates.push(current);
                        current = path.dirname(current);
                    }
                    _i = 0, _a = candidates.reverse();
                    _b.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 6];
                    candidate = _a[_i];
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, fs.lstat(candidate)];
                case 3:
                    stat = _b.sent();
                    if (stat.isSymbolicLink()) {
                        return [2 /*return*/, path.relative(resolvedRoot, candidate).replace(/\\/g, '/')];
                    }
                    return [3 /*break*/, 5];
                case 4:
                    error_2 = _b.sent();
                    if (error_2.code === 'ENOENT') {
                        return [3 /*break*/, 5];
                    }
                    throw error_2;
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/, undefined];
            }
        });
    });
}
function normalizeFileEffectType(type) {
    if (type === 'file.created' || type === 'file.edited' || type === 'file.deleted') {
        return type;
    }
    throw new Error("Unsupported file effect type: ".concat(type));
}
function nextContent(type, effect, contentBefore) {
    if (type === 'file.deleted') {
        return '';
    }
    if (effect.content === undefined) {
        if (type === 'file.edited') {
            return contentBefore;
        }
        throw new Error("".concat(type, " effect content is required."));
    }
    return normalizeText(effect.content);
}
function sha256(content) {
    return "sha256:".concat(crypto.createHash('sha256').update(content, 'utf8').digest('hex'));
}
function unifiedDiff(relativePath, before, after) {
    if (before === after) {
        return "--- a/".concat(relativePath, "\n+++ b/").concat(relativePath, "\n");
    }
    var beforeLines = splitLines(before);
    var afterLines = splitLines(after);
    return __spreadArray(__spreadArray([
        "--- a/".concat(relativePath),
        "+++ b/".concat(relativePath),
        "@@ -1,".concat(beforeLines.length, " +1,").concat(afterLines.length, " @@")
    ], beforeLines.map(function (line) { return "-".concat(line); }), true), afterLines.map(function (line) { return "+".concat(line); }), true).join('\n') + '\n';
}
function splitLines(content) {
    if (!content) {
        return [];
    }
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n$/, '').split('\n');
}
function normalizeText(content) {
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
