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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalCommandEffectHostAdapter = exports.CommandEffectHostAdapter = void 0;
var child_process_1 = require("child_process");
var path = require("path");
var file_uri_1 = require("@theia/core/lib/common/file-uri");
var inversify_1 = require("@theia/core/shared/inversify");
var common_1 = require("../common");
exports.CommandEffectHostAdapter = Symbol('CommandEffectHostAdapter');
var LocalCommandEffectHostAdapter = function () {
    var _classDecorators = [(0, inversify_1.injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var LocalCommandEffectHostAdapter = _classThis = /** @class */ (function () {
        function LocalCommandEffectHostAdapter_1() {
        }
        LocalCommandEffectHostAdapter_1.prototype.prepare = function (workspaceRootUri, effect) {
            return __awaiter(this, void 0, void 0, function () {
                var workspaceRoot, parsed, cwd, env, executable, args, outsideCommandAllowlist, hasEnvOutsideAllowlist, riskReasons, policy;
                return __generator(this, function (_a) {
                    workspaceRoot = resolveWorkspaceRoot(workspaceRootUri);
                    parsed = parseCommandLine(effect.command);
                    if (!parsed.length) {
                        throw new Error('Command effect command is required.');
                    }
                    cwd = resolveWorkspaceCwd(workspaceRoot, effect.cwd);
                    env = filterEnv(effect.env, effect.allowedEnv);
                    executable = parsed[0];
                    args = parsed.slice(1);
                    outsideCommandAllowlist = isOutsideCommandAllowlist(executable, effect.allowedCommands);
                    hasEnvOutsideAllowlist = Object.keys(effect.env || {}).some(function (key) { return !isAllowedEnvKey(key, effect.allowedEnv); });
                    riskReasons = [
                        outsideCommandAllowlist ? "command outside allowlist: ".concat(executable) : undefined,
                        hasEnvOutsideAllowlist ? 'environment contains keys outside allowlist' : undefined
                    ].filter(function (reason) { return Boolean(reason); });
                    policy = (0, common_1.decideFlowApprovalPolicy)({
                        action: 'command_effect',
                        requestedPolicy: effect.approvalPolicy,
                        riskReasons: riskReasons,
                        blockedReasons: outsideCommandAllowlist ? ["command outside allowlist: ".concat(executable)] : []
                    });
                    return [2 /*return*/, {
                            command: effect.command,
                            executable: executable,
                            args: args,
                            workspaceRoot: workspaceRoot,
                            cwd: cwd.absolutePath,
                            relativeCwd: cwd.relativePath,
                            env: env,
                            timeoutMs: normalizeTimeoutMs(effect.timeoutMs),
                            approvalPolicy: policy.policy,
                            requiresApproval: policy.requiresApproval,
                            blocked: policy.blocked,
                            riskReasons: riskReasons,
                            reason: policy.message
                        }];
                });
            });
        };
        LocalCommandEffectHostAdapter_1.prototype.apply = function (workspaceRootUri_1, effect_1) {
            return __awaiter(this, arguments, void 0, function (workspaceRootUri, effect, approved) {
                var prepared;
                if (approved === void 0) { approved = false; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prepare(workspaceRootUri, effect)];
                        case 1:
                            prepared = _a.sent();
                            if (prepared.blocked) {
                                return [2 /*return*/, commandResult(prepared, 'blocked', false, { stderr: prepared.reason || 'command blocked by policy' })];
                            }
                            if (prepared.requiresApproval && !approved) {
                                return [2 /*return*/, commandResult(prepared, 'proposed', false, { stderr: "approval required by ".concat(prepared.approvalPolicy) })];
                            }
                            return [2 /*return*/, executePreparedCommand(prepared)];
                    }
                });
            });
        };
        return LocalCommandEffectHostAdapter_1;
    }());
    __setFunctionName(_classThis, "LocalCommandEffectHostAdapter");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LocalCommandEffectHostAdapter = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LocalCommandEffectHostAdapter = _classThis;
}();
exports.LocalCommandEffectHostAdapter = LocalCommandEffectHostAdapter;
function resolveWorkspaceRoot(workspaceRootUri) {
    if (!workspaceRootUri) {
        throw new Error('workspaceRootUri is required to apply command effects.');
    }
    return path.resolve(file_uri_1.FileUri.fsPath(workspaceRootUri));
}
function resolveWorkspaceCwd(workspaceRoot, requestedCwd) {
    var normalizedRequest = (requestedCwd || '.').replace(/\\/g, '/').trim() || '.';
    if (path.isAbsolute(normalizedRequest) || normalizedRequest.includes('\0')) {
        throw new Error("Command effect cwd must be relative inside the workspace: ".concat(requestedCwd));
    }
    var absolutePath = path.resolve(workspaceRoot, normalizedRequest);
    var relativeToWorkspace = path.relative(workspaceRoot, absolutePath);
    if (relativeToWorkspace.startsWith('..') || path.isAbsolute(relativeToWorkspace)) {
        throw new Error("Command effect cwd escapes the workspace: ".concat(requestedCwd));
    }
    return {
        absolutePath: absolutePath,
        relativePath: relativeToWorkspace.replace(/\\/g, '/') || '.'
    };
}
function filterEnv(env, allowedEnv) {
    var filtered = {};
    for (var _i = 0, _a = Object.entries(env || {}); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        if (!isAllowedEnvKey(key, allowedEnv) || value === undefined) {
            continue;
        }
        filtered[key] = String(value);
    }
    return filtered;
}
function isAllowedEnvKey(key, allowedEnv) {
    var normalizedKey = key.trim();
    if (!normalizedKey || normalizedKey.includes('\0')) {
        return false;
    }
    if (!allowedEnv || allowedEnv.length === 0) {
        return false;
    }
    return allowedEnv.includes(normalizedKey);
}
function isOutsideCommandAllowlist(executable, allowedCommands) {
    var allowed = (allowedCommands || []).map(function (command) { return command.trim(); }).filter(Boolean);
    if (!allowed.length) {
        return true;
    }
    return !allowed.includes(executable);
}
function normalizeTimeoutMs(timeoutMs) {
    var parsed = Number.parseInt(String(timeoutMs !== null && timeoutMs !== void 0 ? timeoutMs : ''), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
        return Math.min(parsed, 300000);
    }
    return 30000;
}
function executePreparedCommand(prepared) {
    var startedAt = new Date().toISOString();
    return new Promise(function (resolve) {
        var _a, _b;
        var child = (0, child_process_1.spawn)(prepared.executable, prepared.args, {
            cwd: prepared.cwd,
            env: __assign(__assign({}, process.env), prepared.env),
            shell: false,
            windowsHide: true
        });
        var stdout = '';
        var stderr = '';
        var timedOut = false;
        var timer = setTimeout(function () {
            timedOut = true;
            child.kill();
        }, prepared.timeoutMs);
        (_a = child.stdout) === null || _a === void 0 ? void 0 : _a.on('data', function (chunk) { return stdout += String(chunk); });
        (_b = child.stderr) === null || _b === void 0 ? void 0 : _b.on('data', function (chunk) { return stderr += String(chunk); });
        child.on('error', function (error) {
            clearTimeout(timer);
            resolve(commandResult(prepared, 'failed', true, {
                stderr: error.message,
                timedOut: timedOut,
                startedAt: startedAt,
                completedAt: new Date().toISOString()
            }));
        });
        child.on('close', function (exitCode, signal) {
            clearTimeout(timer);
            resolve(commandResult(prepared, exitCode === 0 && !timedOut ? 'applied' : 'failed', true, {
                exitCode: exitCode,
                signal: signal,
                stdout: stdout,
                stderr: stderr,
                timedOut: timedOut,
                startedAt: startedAt,
                completedAt: new Date().toISOString()
            }));
        });
    });
}
function commandResult(prepared, status, applied, patch) {
    return __assign(__assign({}, prepared), { applied: applied, status: status, exitCode: patch.exitCode, signal: patch.signal, stdout: redactOutput(patch.stdout || ''), stderr: redactOutput(patch.stderr || ''), timedOut: Boolean(patch.timedOut), startedAt: patch.startedAt, completedAt: patch.completedAt });
}
function redactOutput(value) {
    var redacted = (0, common_1.redactFlowSecretsText)(value) || '';
    if (redacted.length <= 12000) {
        return redacted;
    }
    return "".concat(redacted.slice(0, 12000), "\n[truncated command output]");
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
            // fall through to shell-like split
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
