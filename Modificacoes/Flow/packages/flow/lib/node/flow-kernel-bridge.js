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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
exports.SimulatedFlowKernelBridge = exports.ExternalFlowKernelBridge = exports.HybridFlowKernelBridge = exports.FlowKernelBridge = void 0;
exports.mapKernelRunToFlowRun = mapKernelRunToFlowRun;
var child_process_1 = require("child_process");
var Ajv = require("@theia/core/shared/ajv");
var fsSync = require("fs");
var fs = require("fs/promises");
var http = require("http");
var https = require("https");
var os = require("os");
var path = require("path");
var readline_1 = require("readline");
var file_uri_1 = require("@theia/core/lib/common/file-uri");
var common_1 = require("@theia/core/lib/common");
var inversify_1 = require("@theia/core/shared/inversify");
var common_2 = require("../common");
var flow_workload_executor_1 = require("./flow-workload-executor");
var command_effect_host_adapter_1 = require("./command-effect-host-adapter");
var flow_path_policy_1 = require("./flow-path-policy");
var contractsSchema = require("./schemas/contracts.schema.json");
var flowContractSchemaValidator = new Ajv({
    allErrors: true,
    validateSchema: false
}).compile(normalizeFlowSchemaForAjv(contractsSchema));
function normalizeFlowSchemaForAjv(schema) {
    var $schema = schema.$schema, normalizedSchema = __rest(schema, ["$schema"]);
    return normalizedSchema;
}
function defaultRequestTimeoutMs() {
    var configured = process.env.FLOW_KERNEL_TIMEOUT_MS || process.env.AGENCY_KERNEL_TIMEOUT_MS;
    var timeout = Number.parseInt(configured || '', 10);
    return Number.isFinite(timeout) && timeout > 0 ? timeout : 30000;
}
var AGENT_KERNEL_STDERR_BUFFER_BYTES = 64 * 1024;
exports.FlowKernelBridge = Symbol('FlowKernelBridge');
function resolveKernelBridgePreference() {
    var configured = (process.env.FLOW_KERNEL_MODE || process.env.FLOW_KERNEL_EXECUTION_MODE || '')
        .trim()
        .toLowerCase();
    if (configured === 'simulated' || configured === 'force-simulated' || configured === 'mock' || configured === 'fake') {
        return 'simulated';
    }
    if (configured === 'external' || configured === 'durable' || configured === 'kernel') {
        return 'external';
    }
    return 'auto';
}
function formatKernelBridgeError(operation, error) {
    var message = error instanceof Error ? error.message : String(error);
    return "External Flow Kernel ".concat(operation, " failed: ").concat(message);
}
function simulatedExecutionMessage(operation) {
    return "Explicitly using simulated execution for ".concat(operation, ".");
}
function externalKernelUnavailableError(operation) {
    return new Error("External Flow Kernel ".concat(operation, " is unavailable. Simulated fallback is disabled; set FLOW_KERNEL_MODE=simulated only for explicit test/dev simulation."));
}
function externalKernelOperationError(operation, error) {
    return new Error("".concat(formatKernelBridgeError(operation, error), ". Simulated fallback is disabled."));
}
var PersistentStdioTransport = /** @class */ (function () {
    function PersistentStdioTransport(command) {
        this.command = command;
        this.closed = false;
        this.running = false;
        this.pending = new Map();
        this.stderrBuffer = '';
        this.stderrBufferBytes = AGENT_KERNEL_STDERR_BUFFER_BYTES;
    }
    PersistentStdioTransport.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureRunning()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PersistentStdioTransport.prototype.healthCheck = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.request({ type: 'status', id: "status-".concat((0, common_1.generateUuid)()) })];
                    case 1:
                        response = _a.sent();
                        ensureResponseType(response, 'status.ok');
                        return [2 /*return*/];
                }
            });
        });
    };
    PersistentStdioTransport.prototype.restart = function () {
        return __awaiter(this, arguments, void 0, function (reason) {
            var message;
            if (reason === void 0) { reason = 'Kernel daemon restart requested.'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.closed) {
                            throw new Error('Flow Kernel transport is closed and cannot be restarted.');
                        }
                        message = "Flow Kernel transport is restarting. ".concat(reason);
                        this.failPending(new Error(message));
                        this.stopProcess();
                        this.ready = undefined;
                        return [4 /*yield*/, this.startProcess()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PersistentStdioTransport.prototype.shutdown = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.closed = true;
                this.failPending(new Error('Flow Kernel transport shutdown requested.'));
                this.stopProcess();
                return [2 /*return*/];
            });
        });
    };
    PersistentStdioTransport.prototype.getStderrSnapshot = function (maxBytes) {
        if (maxBytes === void 0) { maxBytes = this.stderrBufferBytes; }
        if (!this.stderrBuffer.length) {
            return '';
        }
        if (maxBytes <= 0 || this.stderrBuffer.length <= maxBytes) {
            return this.stderrBuffer;
        }
        return this.stderrBuffer.slice(this.stderrBuffer.length - maxBytes);
    };
    PersistentStdioTransport.prototype.request = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, id;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureRunning()];
                    case 1:
                        _a.sent();
                        if (!this.process) {
                            throw new Error('Flow Kernel transport process is not running.');
                        }
                        payload = __assign(__assign({}, message), { id: message.id || (0, common_1.generateUuid)() });
                        id = String(payload.id);
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                var timeoutMs = defaultRequestTimeoutMs();
                                var timeout = setTimeout(function () {
                                    _this.pending.delete(id);
                                    reject(new Error("Flow Kernel request timed out after ".concat(timeoutMs, "ms (id=").concat(id, ").")));
                                }, timeoutMs);
                                _this.pending.set(id, {
                                    resolve: function (response) {
                                        clearTimeout(timeout);
                                        if (response.type === 'error' || response.error) {
                                            var reason = response.error || "Flow Kernel responded with error for ".concat(id, ".");
                                            reject(new Error(String(reason)));
                                            return;
                                        }
                                        resolve(response);
                                    },
                                    reject: reject,
                                    timeout: timeout
                                });
                                var process = _this.process;
                                if (!process) {
                                    reject(new Error('Flow Kernel transport process is not running.'));
                                    return;
                                }
                                var text = "".concat(JSON.stringify(payload), "\n");
                                try {
                                    process.stdin.write(text, 'utf8');
                                }
                                catch (error) {
                                    clearTimeout(timeout);
                                    _this.pending.delete(id);
                                    reject(new Error(error instanceof Error ? error.message : "Failed to write request ".concat(id, " to Flow Kernel stdin.")));
                                }
                            })];
                }
            });
        });
    };
    PersistentStdioTransport.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.closed = true;
                this.failPending(new Error('Flow Kernel transport closed.'));
                this.stopProcess();
                this.running = false;
                return [2 /*return*/];
            });
        });
    };
    PersistentStdioTransport.prototype.ensureRunning = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.process && this.running && !this.closed) {
                            return [2 /*return*/];
                        }
                        if (!!this.ready) return [3 /*break*/, 4];
                        this.ready = (function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this.startProcess()];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.ready];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        this.ready = undefined;
                        throw error_1;
                    case 4: return [4 /*yield*/, this.ready];
                    case 5:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PersistentStdioTransport.prototype.startProcess = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var child = (0, child_process_1.spawn)(_this.command.executable, __spreadArray(__spreadArray([], _this.command.argsPrefix, true), ['serve', '--stdio'], false), {
                            cwd: _this.command.cwd,
                            windowsHide: true
                        });
                        _this.process = child;
                        _this.stderrBuffer = '';
                        child.stdout.setEncoding('utf8');
                        child.stderr.setEncoding('utf8');
                        child.stderr.on('data', function (chunk) {
                            _this.captureStderr(String(chunk));
                        });
                        _this.lineReader = (0, readline_1.createInterface)({ input: child.stdout, crlfDelay: Infinity });
                        _this.lineReader.on('line', function (line) { return _this.onLine(line); });
                        child.once('error', function (error) {
                            _this.stopProcess();
                            reject(new Error("Cannot start Flow Kernel daemon: ".concat(error.message)));
                        });
                        child.once('spawn', function () {
                            _this.running = true;
                            child.once('close', function (code, signal) {
                                var reason = code === 0
                                    ? "Flow Kernel daemon stopped."
                                    : "Flow Kernel daemon exited with code ".concat(code || 0).concat(signal ? " (".concat(signal, ")") : '', ".");
                                _this.failPending(new Error("".concat(reason).concat(_this.stderrBuffer ? " ".concat(_this.stderrBuffer) : '')));
                                _this.ready = undefined;
                                _this.stopProcess();
                            });
                            resolve();
                        });
                    })];
            });
        });
    };
    PersistentStdioTransport.prototype.captureStderr = function (chunk) {
        this.stderrBuffer += chunk;
        if (this.stderrBuffer.length <= this.stderrBufferBytes) {
            return;
        }
        this.stderrBuffer = this.stderrBuffer.slice(this.stderrBuffer.length - this.stderrBufferBytes);
    };
    PersistentStdioTransport.prototype.onLine = function (line) {
        var raw = line.trim();
        if (!raw) {
            return;
        }
        var response;
        try {
            response = JSON.parse(raw);
        }
        catch (_a) {
            return;
        }
        var requestId = typeof response.id === 'string' ? response.id : typeof response.requestId === 'string' ? response.requestId : undefined;
        if (!requestId) {
            return;
        }
        var waiter = this.pending.get(requestId);
        if (!waiter) {
            return;
        }
        this.pending.delete(requestId);
        waiter.resolve(response);
    };
    PersistentStdioTransport.prototype.failPending = function (error) {
        for (var _i = 0, _a = this.pending.values(); _i < _a.length; _i++) {
            var waiter = _a[_i];
            clearTimeout(waiter.timeout);
            waiter.reject(error);
        }
        this.pending.clear();
    };
    PersistentStdioTransport.prototype.stopProcess = function () {
        var _a;
        this.running = false;
        this.ready = undefined;
        (_a = this.lineReader) === null || _a === void 0 ? void 0 : _a.close();
        this.lineReader = undefined;
        if (this.process) {
            var child = this.process;
            this.process = undefined;
            child.removeAllListeners();
            child.kill();
        }
    };
    return PersistentStdioTransport;
}());
var PersistentHttpTransport = /** @class */ (function () {
    function PersistentHttpTransport(endpoint) {
        this.endpoint = endpoint;
    }
    PersistentHttpTransport.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.healthCheck()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PersistentHttpTransport.prototype.healthCheck = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.request({ type: 'status', id: "status-".concat((0, common_1.generateUuid)()) })];
                    case 1:
                        response = _a.sent();
                        ensureResponseType(response, 'status.ok');
                        return [2 /*return*/];
                }
            });
        });
    };
    PersistentHttpTransport.prototype.restart = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error('HTTP kernel transport does not manage a local process.');
            });
        });
    };
    PersistentHttpTransport.prototype.shutdown = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Promise.resolve()];
            });
        });
    };
    PersistentHttpTransport.prototype.getStderrSnapshot = function () {
        return '';
    };
    PersistentHttpTransport.prototype.request = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, response, kernelResponse, reason;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        payload = __assign(__assign({}, message), { id: message.id || (0, common_1.generateUuid)() });
                        return [4 /*yield*/, postKernelHttpMessage(this.endpoint, payload)];
                    case 1:
                        response = _a.sent();
                        if (!response.type) {
                            throw new Error('Flow Kernel HTTP response missing response type.');
                        }
                        kernelResponse = response;
                        if (kernelResponse.type === 'error' || kernelResponse.error) {
                            reason = kernelResponse.error || "Flow Kernel responded with error for ".concat(kernelResponse.id || 'request', ".");
                            throw new Error(String(reason));
                        }
                        return [2 /*return*/, kernelResponse];
                }
            });
        });
    };
    PersistentHttpTransport.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Promise.resolve()];
            });
        });
    };
    return PersistentHttpTransport;
}());
var PersistentWebSocketTransport = /** @class */ (function () {
    function PersistentWebSocketTransport(endpoint) {
        this.endpoint = endpoint;
        this.closed = false;
        this.pending = new Map();
        this.pushListeners = new Set();
        this.disconnectListeners = new Set();
    }
    PersistentWebSocketTransport.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureOpen()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PersistentWebSocketTransport.prototype.healthCheck = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.request({ type: 'status', id: "status-".concat((0, common_1.generateUuid)()) })];
                    case 1:
                        response = _a.sent();
                        ensureResponseType(response, 'status.ok');
                        return [2 /*return*/];
                }
            });
        });
    };
    PersistentWebSocketTransport.prototype.restart = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error('WebSocket kernel transport does not manage a local process.');
            });
        });
    };
    PersistentWebSocketTransport.prototype.shutdown = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.close()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PersistentWebSocketTransport.prototype.getStderrSnapshot = function () {
        return '';
    };
    PersistentWebSocketTransport.prototype.request = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var socket, payload, id;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureOpen()];
                    case 1:
                        _a.sent();
                        socket = this.socket;
                        if (!socket || socket.readyState !== 1) {
                            throw new Error('Flow Kernel WebSocket is not open.');
                        }
                        payload = __assign(__assign({}, message), { id: message.id || (0, common_1.generateUuid)() });
                        id = String(payload.id);
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                var timeoutMs = defaultRequestTimeoutMs();
                                var timeout = setTimeout(function () {
                                    _this.pending.delete(id);
                                    reject(new Error("Flow Kernel WebSocket request timed out after ".concat(timeoutMs, "ms (id=").concat(id, ").")));
                                }, timeoutMs);
                                _this.pending.set(id, {
                                    resolve: function (response) {
                                        clearTimeout(timeout);
                                        if (response.type === 'error' || response.error) {
                                            var reason = response.error || "Flow Kernel responded with error for ".concat(id, ".");
                                            reject(new Error(String(reason)));
                                            return;
                                        }
                                        resolve(response);
                                    },
                                    reject: reject,
                                    timeout: timeout
                                });
                                try {
                                    socket.send(JSON.stringify(payload));
                                }
                                catch (error) {
                                    clearTimeout(timeout);
                                    _this.pending.delete(id);
                                    reject(new Error(error instanceof Error ? error.message : "Failed to write request ".concat(id, " to Flow Kernel WebSocket.")));
                                }
                            })];
                }
            });
        });
    };
    PersistentWebSocketTransport.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            var socket;
            return __generator(this, function (_a) {
                this.closed = true;
                this.failPending(new Error('Flow Kernel WebSocket transport closed.'));
                this.pushListeners.clear();
                this.disconnectListeners.clear();
                socket = this.socket;
                this.socket = undefined;
                this.opening = undefined;
                if (socket && (socket.readyState === 0 || socket.readyState === 1)) {
                    socket.close(1000, 'Flow transport closed.');
                }
                return [2 /*return*/];
            });
        });
    };
    PersistentWebSocketTransport.prototype.ensureOpen = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_2;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (((_a = this.socket) === null || _a === void 0 ? void 0 : _a.readyState) === 1) {
                            return [2 /*return*/];
                        }
                        if (this.closed) {
                            throw new Error('Flow Kernel WebSocket transport is closed.');
                        }
                        if (!this.opening) {
                            this.opening = this.openSocket();
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.opening];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _b.sent();
                        this.opening = undefined;
                        throw error_2;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    PersistentWebSocketTransport.prototype.openSocket = function () {
        return __awaiter(this, void 0, void 0, function () {
            var WebSocketCtor, socket;
            var _this = this;
            return __generator(this, function (_a) {
                WebSocketCtor = resolveRuntimeWebSocket();
                socket = new WebSocketCtor(this.endpoint);
                socket.binaryType = 'arraybuffer';
                this.socket = socket;
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var timeoutMs = defaultRequestTimeoutMs();
                        var timeout = setTimeout(function () {
                            reject(new Error("Flow Kernel WebSocket did not open within ".concat(timeoutMs, "ms.")));
                            socket.close();
                        }, timeoutMs);
                        socket.onopen = function () {
                            clearTimeout(timeout);
                            resolve();
                        };
                        socket.onerror = function (event) {
                            clearTimeout(timeout);
                            reject(new Error("Flow Kernel WebSocket connection failed: ".concat(formatWebSocketEvent(event))));
                        };
                        socket.onmessage = function (event) { return _this.onMessage(event.data); };
                        socket.onclose = function (event) {
                            clearTimeout(timeout);
                            if (_this.socket === socket) {
                                _this.socket = undefined;
                            }
                            _this.opening = undefined;
                            var error = new Error("Flow Kernel WebSocket closed: ".concat(formatWebSocketEvent(event)));
                            _this.failPending(error);
                            if (!_this.closed) {
                                _this.emitDisconnect(error);
                            }
                        };
                    })];
            });
        });
    };
    PersistentWebSocketTransport.prototype.onMessage = function (data) {
        var raw = typeof data === 'string'
            ? data
            : Buffer.isBuffer(data)
                ? data.toString('utf8')
                : data instanceof ArrayBuffer
                    ? Buffer.from(data).toString('utf8')
                    : '';
        if (!raw) {
            return;
        }
        var response;
        try {
            response = JSON.parse(raw);
        }
        catch (_a) {
            return;
        }
        var requestId = typeof response.id === 'string' ? response.id : typeof response.requestId === 'string' ? response.requestId : undefined;
        if (!requestId) {
            this.emitPushMessage(response);
            return;
        }
        var waiter = this.pending.get(requestId);
        if (!waiter) {
            this.emitPushMessage(response);
            return;
        }
        this.pending.delete(requestId);
        waiter.resolve(response);
    };
    PersistentWebSocketTransport.prototype.onPushMessage = function (listener) {
        var _this = this;
        this.pushListeners.add(listener);
        return function () { return _this.pushListeners.delete(listener); };
    };
    PersistentWebSocketTransport.prototype.onDisconnect = function (listener) {
        var _this = this;
        this.disconnectListeners.add(listener);
        return function () { return _this.disconnectListeners.delete(listener); };
    };
    PersistentWebSocketTransport.prototype.emitPushMessage = function (message) {
        for (var _i = 0, _a = __spreadArray([], this.pushListeners, true); _i < _a.length; _i++) {
            var listener = _a[_i];
            listener(message);
        }
    };
    PersistentWebSocketTransport.prototype.emitDisconnect = function (error) {
        for (var _i = 0, _a = __spreadArray([], this.disconnectListeners, true); _i < _a.length; _i++) {
            var listener = _a[_i];
            listener(error);
        }
    };
    PersistentWebSocketTransport.prototype.failPending = function (error) {
        for (var _i = 0, _a = this.pending.values(); _i < _a.length; _i++) {
            var waiter = _a[_i];
            clearTimeout(waiter.timeout);
            waiter.reject(error);
        }
        this.pending.clear();
    };
    return PersistentWebSocketTransport;
}());
var FlowKernelTransport = /** @class */ (function () {
    function FlowKernelTransport() {
        this.pushListeners = new Set();
        this.transportDisposers = [];
    }
    FlowKernelTransport.prototype.available = function () {
        return Boolean(resolveKernelHttpEndpoint() || resolveKernelCommand());
    };
    FlowKernelTransport.prototype.supportsPushMessages = function () {
        var endpoint = resolveKernelHttpEndpoint();
        return Boolean(endpoint && isKernelWebSocketEndpoint(endpoint));
    };
    FlowKernelTransport.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var transport, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.resolveTransport()];
                    case 1:
                        transport = _a.sent();
                        if (!transport.start) return [3 /*break*/, 3];
                        return [4 /*yield*/, transport.start()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                    case 3: return [4 /*yield*/, transport.request({ type: 'status', id: "status-".concat((0, common_1.generateUuid)()) })];
                    case 4:
                        response = _a.sent();
                        ensureResponseType(response, 'status.ok');
                        return [2 /*return*/];
                }
            });
        });
    };
    FlowKernelTransport.prototype.healthCheck = function () {
        return __awaiter(this, void 0, void 0, function () {
            var transport, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.resolveTransport()];
                    case 1:
                        transport = _a.sent();
                        if (!transport.healthCheck) return [3 /*break*/, 3];
                        return [4 /*yield*/, transport.healthCheck()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                    case 3: return [4 /*yield*/, transport.request({ type: 'status', id: "status-".concat((0, common_1.generateUuid)()) })];
                    case 4:
                        response = _a.sent();
                        ensureResponseType(response, 'status.ok');
                        return [2 /*return*/];
                }
            });
        });
    };
    FlowKernelTransport.prototype.restart = function () {
        return __awaiter(this, arguments, void 0, function (reason) {
            var transport;
            if (reason === void 0) { reason = 'Kernel restart requested from host.'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.resolveTransport()];
                    case 1:
                        transport = _a.sent();
                        if (!transport.restart) return [3 /*break*/, 3];
                        return [4 /*yield*/, transport.restart(reason)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                    case 3: throw new Error('Flow Kernel transport does not support controlled restart in this mode.');
                }
            });
        });
    };
    FlowKernelTransport.prototype.shutdown = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.transport) {
                            return [2 /*return*/];
                        }
                        if (!this.transport.shutdown) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.transport.shutdown()];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, Promise.resolve(this.transport.close()).catch(function () {
                            // ignore transport shutdown failure while recovering.
                        })];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        this.transport = undefined;
                        this.init = undefined;
                        this.disposeTransportListeners();
                        return [2 /*return*/];
                }
            });
        });
    };
    FlowKernelTransport.prototype.getStderrSnapshot = function (maxBytes) {
        if (maxBytes === void 0) { maxBytes = 65536; }
        if (!this.transport || !this.transport.getStderrSnapshot) {
            return '';
        }
        return this.transport.getStderrSnapshot(maxBytes);
    };
    FlowKernelTransport.prototype.onPushMessage = function (listener) {
        return __awaiter(this, void 0, void 0, function () {
            var transport;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.pushListeners.add(listener);
                        return [4 /*yield*/, this.resolveTransport()];
                    case 1:
                        transport = _a.sent();
                        this.attachTransportListeners(transport);
                        return [2 /*return*/, function () { return _this.pushListeners.delete(listener); }];
                }
            });
        });
    };
    FlowKernelTransport.prototype.request = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var transport, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.resolveTransport()];
                    case 1:
                        transport = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 6]);
                        return [4 /*yield*/, transport.request(message)];
                    case 3: return [2 /*return*/, _a.sent()];
                    case 4:
                        error_3 = _a.sent();
                        if (this.transport) {
                            this.transport = undefined;
                        }
                        this.init = undefined;
                        this.disposeTransportListeners();
                        return [4 /*yield*/, Promise.resolve(transport.close()).catch(function () {
                                // ignore close failures while recovering transport.
                            })];
                    case 5:
                        _a.sent();
                        throw error_3;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    FlowKernelTransport.prototype.resolveTransport = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, error_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (this.transport) {
                            return [2 /*return*/, this.transport];
                        }
                        if (!this.init) {
                            this.init = this.createTransport();
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        _a = this;
                        return [4 /*yield*/, this.init];
                    case 2:
                        _a.transport = _b.sent();
                        this.attachTransportListeners(this.transport);
                        return [2 /*return*/, this.transport];
                    case 3:
                        error_4 = _b.sent();
                        this.init = undefined;
                        throw error_4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    FlowKernelTransport.prototype.createTransport = function () {
        return __awaiter(this, void 0, void 0, function () {
            var httpEndpoint, transport_1, command, transport;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        httpEndpoint = resolveKernelHttpEndpoint();
                        if (!httpEndpoint) return [3 /*break*/, 2];
                        transport_1 = isKernelWebSocketEndpoint(httpEndpoint)
                            ? new PersistentWebSocketTransport(httpEndpoint)
                            : new PersistentHttpTransport(httpEndpoint);
                        return [4 /*yield*/, this.handshake(transport_1)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, transport_1];
                    case 2:
                        command = resolveKernelCommand();
                        if (!command) {
                            throw new Error('Flow Kernel daemon configuration was not found.');
                        }
                        transport = new PersistentStdioTransport(command);
                        return [4 /*yield*/, this.handshake(transport)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, transport];
                }
            });
        });
    };
    FlowKernelTransport.prototype.handshake = function (transport) {
        return __awaiter(this, void 0, void 0, function () {
            var handshake;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, transport.request({ type: 'handshake', id: "hs-".concat((0, common_1.generateUuid)()) })];
                    case 1:
                        handshake = _a.sent();
                        ensureResponseType(handshake, 'handshake.ok');
                        if (handshake.protocol !== common_2.AGENCY_KERNEL_PROTOCOL_VERSION) {
                            throw new Error("Unsupported Flow Kernel protocol \"".concat(String(handshake.protocol), "\"; expected \"").concat(common_2.AGENCY_KERNEL_PROTOCOL_VERSION, "\"."));
                        }
                        if (handshake.version !== common_2.AGENCY_KERNEL_WORKFLOW_VERSION) {
                            throw new Error("Unsupported Flow Kernel workflow version \"".concat(String(handshake.version), "\"; expected \"").concat(common_2.AGENCY_KERNEL_WORKFLOW_VERSION, "\"."));
                        }
                        return [4 /*yield*/, this.handshakeStatus(transport)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    FlowKernelTransport.prototype.handshakeStatus = function (transport) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!transport.healthCheck) return [3 /*break*/, 2];
                        return [4 /*yield*/, transport.healthCheck()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                    case 2: return [4 /*yield*/, transport.request({ type: 'status', id: "st-".concat((0, common_1.generateUuid)()) })];
                    case 3:
                        response = _a.sent();
                        ensureResponseType(response, 'status.ok');
                        return [2 /*return*/];
                }
            });
        });
    };
    FlowKernelTransport.prototype.attachTransportListeners = function (transport) {
        var _this = this;
        this.disposeTransportListeners();
        if (transport.onPushMessage) {
            this.transportDisposers.push(transport.onPushMessage(function (message) { return _this.emitPushMessage(message); }));
        }
        if (transport.onDisconnect) {
            this.transportDisposers.push(transport.onDisconnect(function () {
                void _this.reconnectAfterDisconnect(transport);
            }));
        }
    };
    FlowKernelTransport.prototype.disposeTransportListeners = function () {
        for (var _i = 0, _a = this.transportDisposers.splice(0); _i < _a.length; _i++) {
            var dispose = _a[_i];
            dispose();
        }
    };
    FlowKernelTransport.prototype.emitPushMessage = function (message) {
        for (var _i = 0, _a = __spreadArray([], this.pushListeners, true); _i < _a.length; _i++) {
            var listener = _a[_i];
            listener(message);
        }
    };
    FlowKernelTransport.prototype.reconnectAfterDisconnect = function (transport) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.transport !== transport || this.reconnecting) {
                            return [2 /*return*/];
                        }
                        this.transport = undefined;
                        this.init = undefined;
                        this.disposeTransportListeners();
                        this.reconnecting = (function () { return __awaiter(_this, void 0, void 0, function () {
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _b.trys.push([0, 3, 4, 5]);
                                        return [4 /*yield*/, Promise.resolve(transport.close()).catch(function () { return undefined; })];
                                    case 1:
                                        _b.sent();
                                        return [4 /*yield*/, this.resolveTransport()];
                                    case 2:
                                        _b.sent();
                                        return [3 /*break*/, 5];
                                    case 3:
                                        _a = _b.sent();
                                        this.init = undefined;
                                        return [3 /*break*/, 5];
                                    case 4:
                                        this.reconnecting = undefined;
                                        return [7 /*endfinally*/];
                                    case 5: return [2 /*return*/];
                                }
                            });
                        }); })();
                        return [4 /*yield*/, this.reconnecting];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return FlowKernelTransport;
}());
var HybridFlowKernelBridge = function () {
    var _classDecorators = [(0, inversify_1.injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var HybridFlowKernelBridge = _classThis = /** @class */ (function () {
        function HybridFlowKernelBridge_1(workloadExecutor, commandEffectHostAdapter, memoryAdapter) {
            if (workloadExecutor === void 0) { workloadExecutor = new flow_workload_executor_1.ProviderBackedFlowWorkloadExecutor(); }
            if (commandEffectHostAdapter === void 0) { commandEffectHostAdapter = new command_effect_host_adapter_1.LocalCommandEffectHostAdapter(); }
            this.external = new ExternalFlowKernelBridge(workloadExecutor, memoryAdapter, commandEffectHostAdapter);
            this.simulated = new SimulatedFlowKernelBridge(workloadExecutor);
        }
        HybridFlowKernelBridge_1.prototype.shouldUseExternalKernel = function (operation_1) {
            return __awaiter(this, arguments, void 0, function (operation, requireExternal) {
                var preference, mode, error_5;
                var _a, _b;
                if (requireExternal === void 0) { requireExternal = false; }
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            preference = resolveKernelBridgePreference();
                            if (preference === 'simulated') {
                                if (requireExternal) {
                                    throw new Error("External Flow Kernel ".concat(operation, " is required for this run, but simulated mode was explicitly selected."));
                                }
                                return [2 /*return*/, false];
                            }
                            if (!((_b = (_a = this.external).available) === null || _b === void 0 ? void 0 : _b.call(_a))) {
                                throw externalKernelUnavailableError(operation);
                            }
                            _c.label = 1;
                        case 1:
                            _c.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.external.getBridgeMode()];
                        case 2:
                            mode = _c.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            error_5 = _c.sent();
                            throw externalKernelOperationError("".concat(operation, " availability check"), error_5);
                        case 4:
                            if (mode !== 'external') {
                                throw externalKernelUnavailableError(operation);
                            }
                            return [2 /*return*/, true];
                    }
                });
            });
        };
        HybridFlowKernelBridge_1.prototype.getBridgeMode = function () {
            return __awaiter(this, void 0, void 0, function () {
                var mode, error_6;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (resolveKernelBridgePreference() === 'simulated') {
                                return [2 /*return*/, 'simulated'];
                            }
                            if (!((_b = (_a = this.external).available) === null || _b === void 0 ? void 0 : _b.call(_a))) {
                                throw externalKernelUnavailableError('getBridgeMode');
                            }
                            _c.label = 1;
                        case 1:
                            _c.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.external.getBridgeMode()];
                        case 2:
                            mode = _c.sent();
                            if (mode !== 'external') {
                                throw externalKernelUnavailableError('getBridgeMode');
                            }
                            return [2 /*return*/, mode];
                        case 3:
                            error_6 = _c.sent();
                            throw externalKernelOperationError('getBridgeMode', error_6);
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        HybridFlowKernelBridge_1.prototype.supportsRunEventStream = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                var _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            if (!((_c = (_b = this.external).available) === null || _c === void 0 ? void 0 : _c.call(_b)) || resolveKernelBridgePreference() === 'simulated') {
                                return [2 /*return*/, false];
                            }
                            _f.label = 1;
                        case 1:
                            _f.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, ((_e = (_d = this.external).supportsRunEventStream) === null || _e === void 0 ? void 0 : _e.call(_d))];
                        case 2: return [2 /*return*/, (_f.sent()) === true];
                        case 3:
                            _a = _f.sent();
                            return [2 /*return*/, false];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        HybridFlowKernelBridge_1.prototype.startRun = function (workflow, prompt, projectSummary, workspaceRootUri) {
            return __awaiter(this, void 0, void 0, function () {
                var run_1, error_7, run;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.shouldUseExternalKernel('startRun')];
                        case 1:
                            if (!_a.sent()) return [3 /*break*/, 5];
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.external.startRun(workflow, prompt, projectSummary, workspaceRootUri)];
                        case 3:
                            run_1 = _a.sent();
                            return [2 /*return*/, setExecutionMode(run_1, 'kernel_external', 'Execution by external kernel daemon.')];
                        case 4:
                            error_7 = _a.sent();
                            throw externalKernelOperationError('startRun', error_7);
                        case 5: return [4 /*yield*/, this.simulated.startRun(workflow, prompt, projectSummary, workspaceRootUri)];
                        case 6:
                            run = _a.sent();
                            return [2 /*return*/, setExecutionMode(run, 'kernel_simulated', simulatedExecutionMessage('startRun'))];
                    }
                });
            });
        };
        HybridFlowKernelBridge_1.prototype.tickRun = function (workflow, run, workspaceRootUri) {
            return __awaiter(this, void 0, void 0, function () {
                var runUsesDurableKernel, updated_1, error_8, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            runUsesDurableKernel = shouldUseExternalKernel(run);
                            if (!runUsesDurableKernel) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.shouldUseExternalKernel('tickRun', true)];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.external.tickRun(workflow, run, workspaceRootUri)];
                        case 3:
                            updated_1 = _a.sent();
                            return [2 /*return*/, setExecutionMode(updated_1, 'kernel_external', 'Execution mode set to external kernel.')];
                        case 4:
                            error_8 = _a.sent();
                            throw externalKernelOperationError('tickRun', error_8);
                        case 5: return [4 /*yield*/, this.simulated.tickRun(workflow, run, workspaceRootUri)];
                        case 6:
                            updated = _a.sent();
                            return [2 /*return*/, ensureExecutionMode(updated, run)];
                    }
                });
            });
        };
        HybridFlowKernelBridge_1.prototype.approveGate = function (workflow, run, request, workspaceRootUri) {
            return __awaiter(this, void 0, void 0, function () {
                var runUsesDurableKernel, updated_2, error_9, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            runUsesDurableKernel = shouldUseExternalKernel(run);
                            if (!runUsesDurableKernel) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.shouldUseExternalKernel('approveGate', true)];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.external.approveGate(workflow, run, request, workspaceRootUri)];
                        case 3:
                            updated_2 = _a.sent();
                            return [2 /*return*/, setExecutionMode(updated_2, 'kernel_external', 'Execution mode set to external kernel.')];
                        case 4:
                            error_9 = _a.sent();
                            throw externalKernelOperationError('approveGate', error_9);
                        case 5: return [4 /*yield*/, this.simulated.approveGate(workflow, run, request, workspaceRootUri)];
                        case 6:
                            updated = _a.sent();
                            return [2 /*return*/, ensureExecutionMode(updated, run)];
                    }
                });
            });
        };
        HybridFlowKernelBridge_1.prototype.refreshRun = function (workflow, run) {
            return __awaiter(this, void 0, void 0, function () {
                var refreshed, error_10;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!shouldUseExternalKernel(run)) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.shouldUseExternalKernel('refreshRun', true)];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.external.refreshRun(workflow, run)];
                        case 3:
                            refreshed = _a.sent();
                            return [2 /*return*/, setExecutionMode(refreshed, 'kernel_external', 'Execution mode set to external kernel.')];
                        case 4:
                            error_10 = _a.sent();
                            throw externalKernelOperationError('refreshRun', error_10);
                        case 5: return [2 /*return*/, this.simulated.refreshRun(workflow, run)];
                    }
                });
            });
        };
        HybridFlowKernelBridge_1.prototype.subscribeRunEvents = function (workflow, run, workspaceRootUri, listener, errorListener) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, _b, error_11;
                var _this = this;
                var _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            _b = shouldUseExternalKernel(run);
                            if (!_b) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.shouldUseExternalKernel('subscribeRunEvents', true)];
                        case 1:
                            _b = (_e.sent());
                            _e.label = 2;
                        case 2:
                            _a = _b;
                            if (!_a) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.supportsRunEventStream()];
                        case 3:
                            _a = (_e.sent());
                            _e.label = 4;
                        case 4:
                            if (!_a) return [3 /*break*/, 8];
                            _e.label = 5;
                        case 5:
                            _e.trys.push([5, 7, , 8]);
                            return [4 /*yield*/, ((_d = (_c = this.external).subscribeRunEvents) === null || _d === void 0 ? void 0 : _d.call(_c, workflow, run, workspaceRootUri, function (updated) { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        listener(setExecutionMode(updated, 'kernel_external', 'Execution mode set to external kernel.'));
                                        return [2 /*return*/];
                                    });
                                }); }, errorListener))];
                        case 6: return [2 /*return*/, (_e.sent()) || (function () { return undefined; })];
                        case 7:
                            error_11 = _e.sent();
                            errorListener === null || errorListener === void 0 ? void 0 : errorListener(externalKernelOperationError('subscribeRunEvents', error_11));
                            return [3 /*break*/, 8];
                        case 8:
                            errorListener === null || errorListener === void 0 ? void 0 : errorListener(new Error('Kernel event stream is unavailable for the current execution mode.'));
                            return [2 /*return*/, function () { return undefined; }];
                    }
                });
            });
        };
        HybridFlowKernelBridge_1.prototype.pauseRun = function (workflow, run, reason) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.lifecycleRun('pauseRun', workflow, run, reason)];
                });
            });
        };
        HybridFlowKernelBridge_1.prototype.resumeRun = function (workflow, run, reason) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.lifecycleRun('resumeRun', workflow, run, reason)];
                });
            });
        };
        HybridFlowKernelBridge_1.prototype.cancelRun = function (workflow, run, reason) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.lifecycleRun('cancelRun', workflow, run, reason)];
                });
            });
        };
        HybridFlowKernelBridge_1.prototype.lifecycleRun = function (operation, workflow, run, reason) {
            return __awaiter(this, void 0, void 0, function () {
                var updated_3, error_12, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!shouldUseExternalKernel(run)) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.shouldUseExternalKernel(operation, true)];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.external[operation](workflow, run, reason)];
                        case 3:
                            updated_3 = _a.sent();
                            return [2 /*return*/, setExecutionMode(updated_3, 'kernel_external', 'Execution mode set to external kernel.')];
                        case 4:
                            error_12 = _a.sent();
                            throw externalKernelOperationError(operation, error_12);
                        case 5: return [4 /*yield*/, this.simulated[operation](workflow, run, reason)];
                        case 6:
                            updated = _a.sent();
                            return [2 /*return*/, ensureExecutionMode(updated, run)];
                    }
                });
            });
        };
        return HybridFlowKernelBridge_1;
    }());
    __setFunctionName(_classThis, "HybridFlowKernelBridge");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        HybridFlowKernelBridge = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return HybridFlowKernelBridge = _classThis;
}();
exports.HybridFlowKernelBridge = HybridFlowKernelBridge;
var ExternalFlowKernelBridge = /** @class */ (function () {
    function ExternalFlowKernelBridge(workloadExecutor, memoryAdapter, commandEffectHostAdapter) {
        if (workloadExecutor === void 0) { workloadExecutor = new flow_workload_executor_1.ProviderBackedFlowWorkloadExecutor(); }
        if (commandEffectHostAdapter === void 0) { commandEffectHostAdapter = new command_effect_host_adapter_1.LocalCommandEffectHostAdapter(); }
        this.workloadExecutor = workloadExecutor;
        this.memoryAdapter = memoryAdapter;
        this.commandEffectHostAdapter = commandEffectHostAdapter;
        this.transport = new FlowKernelTransport();
    }
    ExternalFlowKernelBridge.prototype.available = function () {
        return this.transport.available();
    };
    ExternalFlowKernelBridge.prototype.supportsRunEventStream = function () {
        return this.available() && this.transport.supportsPushMessages();
    };
    ExternalFlowKernelBridge.prototype.startKernelProcess = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.transport.start()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ExternalFlowKernelBridge.prototype.checkKernelHealth = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.transport.healthCheck()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ExternalFlowKernelBridge.prototype.restartKernelProcess = function (reason) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.transport.restart(reason)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ExternalFlowKernelBridge.prototype.shutdownKernelProcess = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.transport.shutdown()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ExternalFlowKernelBridge.prototype.getKernelStderr = function (maxBytes) {
        var _a, _b;
        if (maxBytes === void 0) { maxBytes = 65536; }
        return ((_b = (_a = this.transport).getStderrSnapshot) === null || _b === void 0 ? void 0 : _b.call(_a, maxBytes)) || '';
    };
    ExternalFlowKernelBridge.prototype.getBridgeMode = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.available()) {
                            return [2 /*return*/, 'simulated'];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.checkKernelHealth()];
                    case 2:
                        _b.sent();
                        return [2 /*return*/, 'external'];
                    case 3:
                        _a = _b.sent();
                        return [2 /*return*/, 'simulated'];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ExternalFlowKernelBridge.prototype.startRun = function (workflow, prompt, projectSummary, workspaceRootUri) {
        return __awaiter(this, void 0, void 0, function () {
            var validation, limitedPrompt, limitedProjectSummary, kernelWorkflow, workDir, storeDir, response, kernelRun, events;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        validation = (0, common_2.validateFlowWorkflow)(workflow);
                        if (!validation.valid) {
                            throw new Error(validation.errors.map(function (error) { return error.message; }).join('\n'));
                        }
                        limitedPrompt = (0, common_2.truncateFlowText)(prompt, common_2.FlowSizeLimits.promptBytes, 'prompt');
                        limitedProjectSummary = (0, common_2.truncateFlowText)(projectSummary, common_2.FlowSizeLimits.contextPackBytes, 'project summary');
                        kernelWorkflow = toKernelWorkflow(workflow);
                        return [4 /*yield*/, this.validateKernelWorkflow(kernelWorkflow)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, fs.mkdtemp(path.join(os.tmpdir(), 'flow-kernel-run-'))];
                    case 2:
                        workDir = _a.sent();
                        storeDir = path.join(workDir, 'runs');
                        return [4 /*yield*/, this.requestWithReconnect({
                                type: 'start_run',
                                workflow: kernelWorkflow,
                                input: limitedPrompt,
                                storeDir: storeDir
                            })];
                    case 3:
                        response = _a.sent();
                        ensureResponseType(response, 'start_run.ok');
                        kernelRun = getKernelRun(response);
                        return [4 /*yield*/, this.processHostRequests(workflow, limitedPrompt, kernelRun, storeDir, workspaceRootUri, {
                                storeDir: storeDir,
                                kernelRunId: kernelRun.id,
                                projectSummary: limitedProjectSummary
                            }, response.requests)];
                    case 4:
                        kernelRun = _a.sent();
                        return [4 /*yield*/, this.getKernelEvents({ runId: kernelRun.id, storeDir: storeDir })];
                    case 5:
                        events = _a.sent();
                        return [2 /*return*/, mapKernelRunToFlowRun(workflow, limitedPrompt, kernelRun, events, {
                                storeDir: storeDir,
                                kernelRunId: kernelRun.id,
                                projectSummary: limitedProjectSummary
                            })];
                }
            });
        });
    };
    ExternalFlowKernelBridge.prototype.validateKernelWorkflow = function (workflow) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.requestWithReconnect({
                            type: 'validate_workflow',
                            workflow: workflow
                        })];
                    case 1:
                        response = _a.sent();
                        ensureResponseType(response, 'validate_workflow.ok');
                        return [2 /*return*/];
                }
            });
        });
    };
    ExternalFlowKernelBridge.prototype.tickRun = function (workflow, run, workspaceRootUri) {
        return __awaiter(this, void 0, void 0, function () {
            var metadata, response, kernelRun, events;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        metadata = kernelMetadata(run);
                        if (!metadata) {
                            throw new Error('External Flow Kernel metadata is missing.');
                        }
                        return [4 /*yield*/, this.requestWithReconnect({
                                type: 'tick_run',
                                runId: metadata.kernelRunId,
                                storeDir: metadata.storeDir
                            })];
                    case 1:
                        response = _a.sent();
                        ensureResponseType(response, 'tick_run.ok');
                        kernelRun = getKernelRun(response);
                        return [4 /*yield*/, this.processHostRequests(workflow, run.prompt, kernelRun, metadata.storeDir, workspaceRootUri, metadata, response.requests, run)];
                    case 2:
                        kernelRun = _a.sent();
                        return [4 /*yield*/, this.getKernelEvents({ runId: kernelRun.id, storeDir: metadata.storeDir })];
                    case 3:
                        events = _a.sent();
                        return [2 /*return*/, mapKernelRunToFlowRun(workflow, run.prompt, kernelRun, events, metadata, run)];
                }
            });
        });
    };
    ExternalFlowKernelBridge.prototype.approveGate = function (workflow, run, request, workspaceRootUri) {
        return __awaiter(this, void 0, void 0, function () {
            var metadata, requestType, response, kernelRun, events;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        metadata = kernelMetadata(run);
                        if (!metadata) {
                            throw new Error('External Flow Kernel metadata is missing.');
                        }
                        if (request.decision === 'revision_requested') {
                            throw new Error('External Flow Kernel gates support approve/reject decisions only.');
                        }
                        requestType = request.decision === 'approved' ? 'gate_approved' : 'gate_rejected';
                        return [4 /*yield*/, this.requestWithReconnect({
                                type: requestType,
                                runId: metadata.kernelRunId,
                                gateId: request.gateId,
                                storeDir: metadata.storeDir,
                                note: request.note
                            })];
                    case 1:
                        response = _a.sent();
                        ensureResponseType(response, "".concat(requestType, ".ok"));
                        kernelRun = getKernelRun(response);
                        return [4 /*yield*/, this.processHostRequests(workflow, run.prompt, kernelRun, metadata.storeDir, workspaceRootUri, metadata, response.requests, run)];
                    case 2:
                        kernelRun = _a.sent();
                        return [4 /*yield*/, this.getKernelEvents({ runId: kernelRun.id, storeDir: metadata.storeDir })];
                    case 3:
                        events = _a.sent();
                        return [2 /*return*/, mapKernelRunToFlowRun(workflow, run.prompt, kernelRun, events, metadata, run)];
                }
            });
        });
    };
    ExternalFlowKernelBridge.prototype.pauseRun = function (workflow, run, reason) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.lifecycleRun('pause_run', 'pause_run.ok', workflow, run, reason)];
            });
        });
    };
    ExternalFlowKernelBridge.prototype.resumeRun = function (workflow, run, reason) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.lifecycleRun('resume_run', 'resume_run.ok', workflow, run, reason)];
            });
        });
    };
    ExternalFlowKernelBridge.prototype.cancelRun = function (workflow, run, reason) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.lifecycleRun('cancel_run', 'cancel_run.ok', workflow, run, reason)];
            });
        });
    };
    ExternalFlowKernelBridge.prototype.refreshRun = function (workflow, run) {
        return __awaiter(this, void 0, void 0, function () {
            var metadata, kernelRun, events;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        metadata = kernelMetadata(run);
                        if (!metadata) {
                            throw new Error('External Flow Kernel metadata is missing.');
                        }
                        return [4 /*yield*/, this.getKernelRun(metadata)];
                    case 1:
                        kernelRun = _a.sent();
                        return [4 /*yield*/, this.getKernelEvents({ runId: kernelRun.id, storeDir: metadata.storeDir })];
                    case 2:
                        events = _a.sent();
                        return [2 /*return*/, mapKernelRunToFlowRun(workflow, run.prompt, kernelRun, events, metadata, run)];
                }
            });
        });
    };
    ExternalFlowKernelBridge.prototype.subscribeRunEvents = function (workflow, run, workspaceRootUri, listener, errorListener) {
        return __awaiter(this, void 0, void 0, function () {
            var metadata, latestRun, active, dispose;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        metadata = kernelMetadata(run);
                        if (!metadata) {
                            throw new Error('External Flow Kernel metadata is missing.');
                        }
                        latestRun = run;
                        active = true;
                        return [4 /*yield*/, this.transport.onPushMessage(function (message) { return __awaiter(_this, void 0, void 0, function () {
                                var pushedEvents, kernelRun, events, _a, _b, error_13;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            if (!active) {
                                                return [2 /*return*/];
                                            }
                                            pushedEvents = normalizePushedKernelEvents(message).filter(function (event) { return event.runId === metadata.kernelRunId; });
                                            if (pushedEvents.length === 0) {
                                                return [2 /*return*/];
                                            }
                                            _c.label = 1;
                                        case 1:
                                            _c.trys.push([1, 4, , 5]);
                                            return [4 /*yield*/, this.getKernelRun(metadata)];
                                        case 2:
                                            kernelRun = _c.sent();
                                            _a = dedupeKernelEvents;
                                            _b = [[]];
                                            return [4 /*yield*/, this.getKernelEvents({ runId: metadata.kernelRunId, storeDir: metadata.storeDir })];
                                        case 3:
                                            events = _a.apply(void 0, [__spreadArray.apply(void 0, [__spreadArray.apply(void 0, _b.concat([_c.sent(), true])), pushedEvents, true])]);
                                            latestRun = mapKernelRunToFlowRun(workflow, latestRun.prompt, kernelRun, events, metadata, latestRun);
                                            listener(latestRun);
                                            return [3 /*break*/, 5];
                                        case 4:
                                            error_13 = _c.sent();
                                            errorListener === null || errorListener === void 0 ? void 0 : errorListener(error_13 instanceof Error ? error_13 : new Error(String(error_13)));
                                            return [3 /*break*/, 5];
                                        case 5: return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 1:
                        dispose = _a.sent();
                        return [2 /*return*/, function () {
                                active = false;
                                dispose();
                            }];
                }
            });
        });
    };
    ExternalFlowKernelBridge.prototype.processHostRequests = function (workflow, prompt, kernelRun, storeDir, workspaceRootUri, metadata, rawRequests, previousRun) {
        return __awaiter(this, void 0, void 0, function () {
            var currentRun, requests, handled, _loop_1, this_1, round, state_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        currentRun = kernelRun;
                        requests = normalizeKernelRequests(rawRequests, storeDir);
                        handled = new Set();
                        _loop_1 = function (round) {
                            var hostRequests, workloadRequests, _i, workloadRequests_1, request, events, flowRun_1, results, _b, results_1, result, _c, hostRequests_1, request;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        hostRequests = requests.filter(function (request) { return !handled.has(requestKey(request)); });
                                        if (hostRequests.length === 0) {
                                            return [2 /*return*/, { value: currentRun }];
                                        }
                                        requests = [];
                                        hostRequests.forEach(function (request) { return handled.add(requestKey(request)); });
                                        workloadRequests = hostRequests.filter(isKernelWorkloadRequest);
                                        _i = 0, workloadRequests_1 = workloadRequests;
                                        _d.label = 1;
                                    case 1:
                                        if (!(_i < workloadRequests_1.length)) return [3 /*break*/, 4];
                                        request = workloadRequests_1[_i];
                                        return [4 /*yield*/, this_1.requestWithReconnect({
                                                type: 'workload_started',
                                                runId: request.runId,
                                                storeDir: request.storeDir,
                                                workloadId: request.workloadId
                                            })];
                                    case 2:
                                        _d.sent();
                                        _d.label = 3;
                                    case 3:
                                        _i++;
                                        return [3 /*break*/, 1];
                                    case 4:
                                        if (!(workloadRequests.length > 0)) return [3 /*break*/, 10];
                                        return [4 /*yield*/, this_1.getKernelEvents({ runId: currentRun.id, storeDir: storeDir })];
                                    case 5:
                                        events = _d.sent();
                                        flowRun_1 = mapKernelRunToFlowRun(workflow, prompt, currentRun, events, metadata, previousRun);
                                        return [4 /*yield*/, Promise.all(workloadRequests.map(function (request) {
                                                return _this.executeHostWorkload(workflow, flowRun_1, request, workspaceRootUri);
                                            }))];
                                    case 6:
                                        results = _d.sent();
                                        _b = 0, results_1 = results;
                                        _d.label = 7;
                                    case 7:
                                        if (!(_b < results_1.length)) return [3 /*break*/, 10];
                                        result = results_1[_b];
                                        return [4 /*yield*/, this_1.commitHostWorkloadResult(storeDir, currentRun.id, result)];
                                    case 8:
                                        currentRun = _d.sent();
                                        requests = requests.concat(normalizeKernelRequests(currentRun.requests, storeDir));
                                        _d.label = 9;
                                    case 9:
                                        _b++;
                                        return [3 /*break*/, 7];
                                    case 10:
                                        _c = 0, hostRequests_1 = hostRequests;
                                        _d.label = 11;
                                    case 11:
                                        if (!(_c < hostRequests_1.length)) return [3 /*break*/, 14];
                                        request = hostRequests_1[_c];
                                        if (!!isKernelWorkloadRequest(request)) return [3 /*break*/, 13];
                                        return [4 /*yield*/, this_1.processNonWorkloadHostRequest(currentRun, request)];
                                    case 12:
                                        currentRun = _d.sent();
                                        requests = requests.concat(normalizeKernelRequests(currentRun.requests, storeDir));
                                        _d.label = 13;
                                    case 13:
                                        _c++;
                                        return [3 /*break*/, 11];
                                    case 14: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        round = 0;
                        _a.label = 1;
                    case 1:
                        if (!(round < 25)) return [3 /*break*/, 4];
                        return [5 /*yield**/, _loop_1(round)];
                    case 2:
                        state_1 = _a.sent();
                        if (typeof state_1 === "object")
                            return [2 /*return*/, state_1.value];
                        _a.label = 3;
                    case 3:
                        round += 1;
                        return [3 /*break*/, 1];
                    case 4: throw new Error('External Flow Kernel host request processing exceeded the safety limit.');
                }
            });
        });
    };
    ExternalFlowKernelBridge.prototype.processNonWorkloadHostRequest = function (currentRun, request) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (request.type) {
                    case 'request_human_gate':
                        return [2 /*return*/, currentRun];
                    case 'request_artifact_open':
                        return [2 /*return*/, this.recordArtifactOpenAvailability(currentRun, request)];
                    default:
                        throw new Error("External Flow Kernel emitted unsupported host request type \"".concat(request.type, "\"."));
                }
                return [2 /*return*/];
            });
        });
    };
    ExternalFlowKernelBridge.prototype.recordArtifactOpenAvailability = function (currentRun, request) {
        return __awaiter(this, void 0, void 0, function () {
            var artifactId, target, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        artifactId = request.artifactId || request.id;
                        target = request.path || artifactId;
                        return [4 /*yield*/, this.requestWithReconnect({
                                type: 'signal_recorded',
                                runId: request.runId,
                                storeDir: request.storeDir,
                                stateId: request.stateId,
                                workloadId: request.workloadId,
                                key: "artifact.".concat(artifactId, ".open.available"),
                                value: {
                                    artifactId: artifactId,
                                    target: target,
                                    available: Boolean(target),
                                    autoOpen: false,
                                    requiresUserAction: true,
                                    disposition: 'available_for_user_requested_open'
                                }
                            })];
                    case 1:
                        response = _a.sent();
                        ensureResponseType(response, 'signal_recorded.ok');
                        return [2 /*return*/, getKernelRun(response)];
                }
            });
        });
    };
    ExternalFlowKernelBridge.prototype.executeHostWorkload = function (workflow, run, request, workspaceRootUri) {
        return __awaiter(this, void 0, void 0, function () {
            var workload, state, isolatedRun, isolatedWorkload;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (request.type === 'request_context_pack') {
                            return [2 /*return*/, this.executeContextPackRequest(workflow, run, request, workspaceRootUri)];
                        }
                        if (request.type === 'request_memory_write') {
                            return [2 /*return*/, this.proposeMemoryWriteRequest(run, request)];
                        }
                        if (request.type === 'request_command_execution') {
                            return [2 /*return*/, this.executeCommandExecutionRequest(workflow, run, request, workspaceRootUri)];
                        }
                        workload = run.workloads.find(function (candidate) { return candidate.id === request.workloadId; });
                        if (!workload) {
                            throw new Error("Kernel requested unknown workload \"".concat(request.workloadId, "\"."));
                        }
                        state = getState(workflow, workload.stateId);
                        isolatedRun = cloneFlowRun(run);
                        isolatedWorkload = isolatedRun.workloads.find(function (candidate) { return candidate.id === workload.id; });
                        if (!isolatedWorkload) {
                            throw new Error("Kernel workload \"".concat(workload.id, "\" was not available in isolated execution context."));
                        }
                        return [4 /*yield*/, materializeWorkflowInputArtifacts(workflow, isolatedRun, workspaceRootUri)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.workloadExecutor.execute({
                                workflow: workflow,
                                run: isolatedRun,
                                state: state,
                                workload: isolatedWorkload,
                                workspaceRootUri: workspaceRootUri
                            })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, diffHostWorkloadResult(run, isolatedRun, isolatedWorkload)];
                }
            });
        });
    };
    ExternalFlowKernelBridge.prototype.executeContextPackRequest = function (workflow, run, request, workspaceRootUri) {
        return __awaiter(this, void 0, void 0, function () {
            var workload, pack, artifact;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.memoryAdapter) {
                            return [2 /*return*/, {
                                    workloadId: request.workloadId,
                                    stateId: request.stateId,
                                    artifacts: [],
                                    effects: [],
                                    signals: [],
                                    issues: [],
                                    failed: true,
                                    error: 'Memory adapter is not available for request_context_pack.'
                                }];
                        }
                        workload = run.workloads.find(function (candidate) { return candidate.id === request.workloadId; });
                        return [4 /*yield*/, this.memoryAdapter.buildContextPack(workspaceRootUri, workflow, workload)];
                    case 1:
                        pack = _a.sent();
                        return [4 /*yield*/, this.writeContextPackArtifact(request, pack)];
                    case 2:
                        artifact = _a.sent();
                        return [2 /*return*/, {
                                workloadId: request.workloadId,
                                stateId: request.stateId,
                                agent: workload === null || workload === void 0 ? void 0 : workload.agent,
                                artifacts: [artifact],
                                effects: [],
                                signals: [{
                                        runId: request.runId,
                                        stateId: request.stateId,
                                        key: 'memory.context_pack.built',
                                        value: true,
                                        createdAt: timestamp()
                                    }],
                                issues: [],
                                failed: false
                            }];
                }
            });
        });
    };
    ExternalFlowKernelBridge.prototype.proposeMemoryWriteRequest = function (run, request) {
        var workload = run.workloads.find(function (candidate) { return candidate.id === request.workloadId; });
        var summary = "Memory write requested by workflow state \"".concat(request.stateId, "\". Review and approve the generated memory candidate before persistence.");
        return {
            workloadId: request.workloadId,
            stateId: request.stateId,
            agent: workload === null || workload === void 0 ? void 0 : workload.agent,
            artifacts: [],
            effects: [{
                    id: stableId('memory-write-effect', request.runId, request.workloadId, request.id),
                    runId: request.runId,
                    stateId: request.stateId,
                    kind: 'memory_write',
                    type: 'memory.write',
                    status: 'proposed',
                    approvalPolicy: 'human_gate_required',
                    summary: summary
                }],
            signals: [{
                    runId: request.runId,
                    stateId: request.stateId,
                    key: 'memory_write.candidate_proposed',
                    value: request.id,
                    createdAt: timestamp()
                }],
            issues: [],
            failed: false
        };
    };
    ExternalFlowKernelBridge.prototype.executeCommandExecutionRequest = function (workflow, run, request, workspaceRootUri) {
        return __awaiter(this, void 0, void 0, function () {
            var workload, state, command, result, failed, effect;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        workload = run.workloads.find(function (candidate) { return candidate.id === request.workloadId; });
                        state = getState(workflow, request.stateId || (workload === null || workload === void 0 ? void 0 : workload.stateId) || '');
                        command = toTrimmedString(state.command);
                        if (!command) {
                            return [2 /*return*/, {
                                    workloadId: request.workloadId,
                                    stateId: request.stateId,
                                    agent: workload === null || workload === void 0 ? void 0 : workload.agent,
                                    artifacts: [],
                                    effects: [],
                                    signals: [],
                                    issues: [{ severity: 'blocking', type: 'command_policy', summary: "Command request \"".concat(request.id, "\" has no command configured.") }],
                                    failed: true,
                                    error: "Command request \"".concat(request.id, "\" has no command configured.")
                                }];
                        }
                        return [4 /*yield*/, this.commandEffectHostAdapter.apply(workspaceRootUri, {
                                command: command,
                                cwd: toTrimmedString(state.cwd),
                                env: parseRecordEnv(state.env),
                                allowedEnv: parseStringArray(state.allowedEnv),
                                allowedCommands: parseStringArray(state.allowedCommands),
                                timeoutMs: parseOptionalNumber(state.timeoutMs),
                                approvalPolicy: toTrimmedString(state.approvalPolicy)
                            })];
                    case 1:
                        result = _a.sent();
                        failed = result.status === 'failed' || result.status === 'blocked';
                        effect = {
                            id: stableId('command-effect', request.runId, request.workloadId, request.id),
                            runId: request.runId,
                            stateId: request.stateId,
                            kind: 'command',
                            type: 'command.executed',
                            command: command,
                            cwd: result.relativeCwd,
                            env: result.env,
                            timeoutMs: result.timeoutMs,
                            exitCode: result.exitCode,
                            stdout: (0, common_2.truncateFlowText)(result.stdout || '', common_2.FlowSizeLimits.commandOutputBytes, 'command stdout'),
                            stderr: (0, common_2.truncateFlowText)(result.stderr || '', common_2.FlowSizeLimits.commandOutputBytes, 'command stderr'),
                            timedOut: result.timedOut,
                            approvalPolicy: result.approvalPolicy,
                            status: result.status,
                            summary: "Command \"".concat(result.executable, "\" ").concat(result.status, " for ").concat(request.stateId, ".")
                        };
                        return [2 /*return*/, {
                                workloadId: request.workloadId,
                                stateId: request.stateId,
                                agent: workload === null || workload === void 0 ? void 0 : workload.agent,
                                artifacts: [],
                                effects: [effect],
                                signals: [{
                                        runId: request.runId,
                                        stateId: request.stateId,
                                        key: 'command_execution.status',
                                        value: result.status,
                                        createdAt: timestamp()
                                    }],
                                issues: failed ? [{ severity: 'blocking', type: 'command_execution', summary: effect.summary }] : [],
                                failed: failed,
                                error: failed ? (result.stderr || effect.summary) : undefined
                            }];
                }
            });
        });
    };
    ExternalFlowKernelBridge.prototype.writeContextPackArtifact = function (request, pack) {
        return __awaiter(this, void 0, void 0, function () {
            var artifactId, artifactPath;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        artifactId = stableId('context-pack', request.runId, request.workloadId);
                        artifactPath = path.join(request.storeDir, 'host-artifacts', request.runId, "".concat(artifactId, ".json"));
                        return [4 /*yield*/, fs.mkdir(path.dirname(artifactPath), { recursive: true })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, fs.writeFile(artifactPath, JSON.stringify((0, common_2.limitFlowJsonValue)(pack, common_2.FlowSizeLimits.contextPackBytes, 'context pack'), undefined, 2), 'utf8')];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, {
                                id: artifactId,
                                runId: request.runId,
                                stateId: request.stateId,
                                uri: artifactPath,
                                kind: 'other',
                                summary: pack.summary,
                                createdAt: timestamp()
                            }];
                }
            });
        });
    };
    ExternalFlowKernelBridge.prototype.commitHostWorkloadResult = function (storeDir, runId, result) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, artifact, _b, _c, effect, _d, _e, signal, _f, _g, issue, response;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        _i = 0, _a = result.artifacts;
                        _h.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        artifact = _a[_i];
                        return [4 /*yield*/, this.requestWithReconnect({
                                type: 'artifact_created',
                                runId: runId,
                                storeDir: storeDir,
                                artifactId: artifact.id,
                                artifactType: artifact.kind,
                                path: artifact.uri,
                                stateId: artifact.stateId,
                                workloadId: result.workloadId,
                                producer: result.agent
                            })];
                    case 2:
                        _h.sent();
                        _h.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        _b = 0, _c = result.effects;
                        _h.label = 5;
                    case 5:
                        if (!(_b < _c.length)) return [3 /*break*/, 8];
                        effect = _c[_b];
                        return [4 /*yield*/, this.requestWithReconnect({
                                type: 'effect_recorded',
                                runId: runId,
                                storeDir: storeDir,
                                stateId: effect.stateId,
                                workloadId: result.workloadId,
                                effectType: effect.type || effect.kind,
                                effect: effect,
                                path: effect.path,
                                command: effect.command,
                                hashBefore: effect.hashBefore,
                                hashAfter: effect.hashAfter,
                                patch: effect.patch,
                                summary: effect.summary,
                                status: effect.status,
                                approvalPolicy: effect.approvalPolicy
                            })];
                    case 6:
                        _h.sent();
                        _h.label = 7;
                    case 7:
                        _b++;
                        return [3 /*break*/, 5];
                    case 8:
                        _d = 0, _e = result.signals;
                        _h.label = 9;
                    case 9:
                        if (!(_d < _e.length)) return [3 /*break*/, 12];
                        signal = _e[_d];
                        return [4 /*yield*/, this.requestWithReconnect({
                                type: 'signal_recorded',
                                runId: runId,
                                storeDir: storeDir,
                                stateId: signal.stateId,
                                workloadId: result.workloadId,
                                key: signal.key,
                                value: signal.value
                            })];
                    case 10:
                        _h.sent();
                        _h.label = 11;
                    case 11:
                        _d++;
                        return [3 /*break*/, 9];
                    case 12:
                        _f = 0, _g = result.issues;
                        _h.label = 13;
                    case 13:
                        if (!(_f < _g.length)) return [3 /*break*/, 16];
                        issue = _g[_f];
                        return [4 /*yield*/, this.requestWithReconnect({
                                type: 'issue_recorded',
                                runId: runId,
                                storeDir: storeDir,
                                stateId: result.stateId,
                                workloadId: result.workloadId,
                                issue: issue
                            })];
                    case 14:
                        _h.sent();
                        _h.label = 15;
                    case 15:
                        _f++;
                        return [3 /*break*/, 13];
                    case 16: return [4 /*yield*/, this.requestWithReconnect({
                            type: result.failed ? 'workload_failed' : 'workload_completed',
                            runId: runId,
                            storeDir: storeDir,
                            workloadId: result.workloadId,
                            error: result.error
                        })];
                    case 17:
                        response = _h.sent();
                        ensureResponseType(response, result.failed ? 'workload_failed.ok' : 'workload_completed.ok');
                        return [2 /*return*/, getKernelRun(response)];
                }
            });
        });
    };
    ExternalFlowKernelBridge.prototype.getKernelEvents = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var response, events;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.requestWithReconnect({
                            type: 'list_events',
                            runId: request.runId,
                            storeDir: request.storeDir
                        })];
                    case 1:
                        response = _a.sent();
                        ensureResponseType(response, 'list_events.ok');
                        events = response.events;
                        if (!Array.isArray(events)) {
                            throw new Error('Kernel event list response is invalid.');
                        }
                        return [2 /*return*/, dedupeKernelEvents(events)];
                }
            });
        });
    };
    ExternalFlowKernelBridge.prototype.lifecycleRun = function (type, responseType, workflow, run, reason) {
        return __awaiter(this, void 0, void 0, function () {
            var metadata, response, kernelRun, events;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        metadata = kernelMetadata(run);
                        if (!metadata) {
                            throw new Error('External Flow Kernel metadata is missing.');
                        }
                        return [4 /*yield*/, this.requestWithReconnect({
                                type: type,
                                runId: metadata.kernelRunId,
                                storeDir: metadata.storeDir,
                                reason: reason
                            })];
                    case 1:
                        response = _a.sent();
                        ensureResponseType(response, responseType);
                        kernelRun = getKernelRun(response);
                        return [4 /*yield*/, this.getKernelEvents({ runId: kernelRun.id, storeDir: metadata.storeDir })];
                    case 2:
                        events = _a.sent();
                        return [2 /*return*/, mapKernelRunToFlowRun(workflow, run.prompt, kernelRun, events, metadata, run)];
                }
            });
        });
    };
    ExternalFlowKernelBridge.prototype.getKernelRun = function (metadata) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.requestWithReconnect({
                            type: 'get_run',
                            runId: metadata.kernelRunId,
                            storeDir: metadata.storeDir
                        })];
                    case 1:
                        response = _a.sent();
                        ensureResponseType(response, 'get_run.ok');
                        return [2 /*return*/, getKernelRun(response)];
                }
            });
        });
    };
    ExternalFlowKernelBridge.prototype.requestWithReconnect = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var lastError, attempt, error_14, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        attempt = 0;
                        _b.label = 1;
                    case 1:
                        if (!(attempt < 2)) return [3 /*break*/, 10];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 9]);
                        return [4 /*yield*/, this.transport.request(message)];
                    case 3: return [2 /*return*/, _b.sent()];
                    case 4:
                        error_14 = _b.sent();
                        lastError = error_14 instanceof Error ? error_14 : new Error(String(error_14));
                        if (!this.transport.restart || attempt >= 1) {
                            return [3 /*break*/, 10];
                        }
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, this.transport.restart("Kernel transport reconnection after ".concat(message.type, " failure."))];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        _a = _b.sent();
                        return [3 /*break*/, 10];
                    case 8: return [3 /*break*/, 9];
                    case 9:
                        attempt++;
                        return [3 /*break*/, 1];
                    case 10: throw lastError || new Error('Kernel request failed after reconnect attempt.');
                }
            });
        });
    };
    return ExternalFlowKernelBridge;
}());
exports.ExternalFlowKernelBridge = ExternalFlowKernelBridge;
var SimulatedFlowKernelBridge = function () {
    var _classDecorators = [(0, inversify_1.injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var SimulatedFlowKernelBridge = _classThis = /** @class */ (function () {
        function SimulatedFlowKernelBridge_1(workloadExecutor) {
            if (workloadExecutor === void 0) { workloadExecutor = new flow_workload_executor_1.ProviderBackedFlowWorkloadExecutor(); }
            this.workloadExecutor = workloadExecutor;
        }
        SimulatedFlowKernelBridge_1.prototype.getBridgeMode = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, 'simulated'];
                });
            });
        };
        SimulatedFlowKernelBridge_1.prototype.supportsRunEventStream = function () {
            return false;
        };
        SimulatedFlowKernelBridge_1.prototype.refreshRun = function (workflow, run) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, preserveFlowRunContext(run, run)];
                });
            });
        };
        SimulatedFlowKernelBridge_1.prototype.startRun = function (workflow, prompt, projectSummary, workspaceRootUri) {
            return __awaiter(this, void 0, void 0, function () {
                var validation, now, runId, startStateId, stateStatuses, run;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            validation = (0, common_2.validateFlowWorkflow)(workflow);
                            if (!validation.valid) {
                                throw new Error(validation.errors.map(function (error) { return error.message; }).join('\n'));
                            }
                            now = timestamp();
                            runId = (0, common_1.generateUuid)();
                            startStateId = findStartStateId(workflow);
                            stateStatuses = buildInitialStateStatuses(workflow);
                            stateStatuses[startStateId] = 'running';
                            run = {
                                id: runId,
                                workflowId: workflow.id,
                                prompt: (0, common_2.truncateFlowText)(prompt, common_2.FlowSizeLimits.promptBytes, 'prompt'),
                                status: 'running',
                                createdAt: now,
                                updatedAt: now,
                                currentStateIds: [startStateId],
                                stateStatuses: stateStatuses,
                                workloads: [],
                                events: [],
                                artifacts: [],
                                effects: [],
                                signals: [],
                                gates: [],
                                tick: 0
                            };
                            run.executionMode = 'kernel_simulated';
                            run.executionModeMessage = 'Kernel simulator started.';
                            pushEvent(run, {
                                type: 'run.started',
                                workflowId: workflow.id,
                                message: "Run started for \"".concat(workflow.name, "\"."),
                                payload: {
                                    prompt: (0, common_2.truncateFlowText)(prompt, common_2.FlowSizeLimits.promptBytes, 'prompt'),
                                    projectSummary: (0, common_2.truncateFlowText)(projectSummary, common_2.FlowSizeLimits.contextPackBytes, 'project summary')
                                }
                            });
                            return [4 /*yield*/, enterState(workflow, run, startStateId, workspaceRootUri)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, run];
                    }
                });
            });
        };
        SimulatedFlowKernelBridge_1.prototype.tickRun = function (workflow, run, workspaceRootUri) {
            return __awaiter(this, void 0, void 0, function () {
                var activeStateIds, activeStateId, activeWorkloads, failedWorkload, activeParent, activeWorkload, state, context;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
                                return [2 /*return*/, run];
                            }
                            if (run.status === 'paused') {
                                pushEvent(run, {
                                    type: 'transition.evaluated',
                                    message: 'Run is paused.',
                                    payload: { reason: 'manual_pause' }
                                });
                                return [2 /*return*/, touch(run)];
                            }
                            if (run.status === 'waiting_gate') {
                                pushEvent(run, {
                                    type: 'transition.evaluated',
                                    message: 'Run is waiting for a human gate decision.',
                                    payload: { pendingGates: run.gates.filter(function (gate) { return gate.status === 'pending'; }).map(function (gate) { return gate.id; }) }
                                });
                                return [2 /*return*/, touch(run)];
                            }
                            run.tick += 1;
                            activeStateIds = __spreadArray([], run.currentStateIds, true);
                            activeStateId = activeStateIds[0];
                            if (!activeStateId) {
                                completeRun(run);
                                return [2 /*return*/, run];
                            }
                            activeWorkloads = run.workloads.filter(function (workload) { return activeStateIds.includes(workload.stateId) && (workload.status === 'running' || workload.status === 'ready'); });
                            if (!(activeWorkloads.length > 0)) return [3 /*break*/, 6];
                            return [4 /*yield*/, Promise.all(activeWorkloads.map(function (activeWorkload) { return __awaiter(_this, void 0, void 0, function () {
                                    var state, context;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                state = getState(workflow, activeWorkload.stateId);
                                                context = {
                                                    workflow: workflow,
                                                    run: run,
                                                    state: state,
                                                    workload: activeWorkload
                                                };
                                                if (workspaceRootUri) {
                                                    context.workspaceRootUri = workspaceRootUri;
                                                }
                                                return [4 /*yield*/, this.workloadExecutor.execute(context)];
                                            case 1:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); }))];
                        case 1:
                            _a.sent();
                            failedWorkload = activeWorkloads.find(function (workload) { return workload.status === 'failed'; });
                            if (!failedWorkload) return [3 /*break*/, 3];
                            run.stateStatuses[failedWorkload.stateId] = 'failed';
                            return [4 /*yield*/, advanceFromState(workflow, run, failedWorkload.stateId, workspaceRootUri, 'failed')];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, touch(run)];
                        case 3:
                            activeParent = findActiveParallelParent(workflow, activeStateIds);
                            if (!(activeParent && activeWorkloads.every(function (workload) { return workload.status === 'done'; }))) return [3 /*break*/, 5];
                            run.stateStatuses[activeParent] = 'done';
                            pushEvent(run, {
                                type: 'state.completed',
                                stateId: activeParent,
                                message: "Parallel state \"".concat(activeParent, "\" completed.")
                            });
                            return [4 /*yield*/, advanceFromState(workflow, run, activeParent, workspaceRootUri, 'success')];
                        case 4:
                            _a.sent();
                            return [2 /*return*/, touch(run)];
                        case 5: return [3 /*break*/, 9];
                        case 6:
                            activeWorkload = run.workloads.find(function (workload) { return workload.stateId === activeStateId && (workload.status === 'running' || workload.status === 'ready'); });
                            if (!activeWorkload) return [3 /*break*/, 9];
                            state = getState(workflow, activeWorkload.stateId);
                            context = {
                                workflow: workflow,
                                run: run,
                                state: state,
                                workload: activeWorkload
                            };
                            if (workspaceRootUri) {
                                context.workspaceRootUri = workspaceRootUri;
                            }
                            return [4 /*yield*/, this.workloadExecutor.execute(context)];
                        case 7:
                            _a.sent();
                            if (!(activeWorkload.status === 'failed')) return [3 /*break*/, 9];
                            run.stateStatuses[activeWorkload.stateId] = 'failed';
                            return [4 /*yield*/, advanceFromState(workflow, run, activeWorkload.stateId, workspaceRootUri, 'failed')];
                        case 8:
                            _a.sent();
                            return [2 /*return*/, touch(run)];
                        case 9:
                            if (requiresGate(workflow, activeStateId)) {
                                createGate(workflow, run, activeStateId);
                                return [2 /*return*/, touch(run)];
                            }
                            return [4 /*yield*/, advanceFromState(workflow, run, activeStateId, workspaceRootUri, 'success')];
                        case 10:
                            _a.sent();
                            return [2 /*return*/, touch(run)];
                    }
                });
            });
        };
        SimulatedFlowKernelBridge_1.prototype.approveGate = function (workflow, run, request, workspaceRootUri) {
            return __awaiter(this, void 0, void 0, function () {
                var gate, gateDecision, eventType, gateStateId, explicitRoute;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            gate = run.gates.find(function (candidate) { return candidate.id === request.gateId; });
                            if (!gate) {
                                throw new Error("Unknown gate \"".concat(request.gateId, "\"."));
                            }
                            gateDecision = resolveGateDecision(gate, request);
                            gate.status = request.decision;
                            gate.selectedDecisionId = (gateDecision === null || gateDecision === void 0 ? void 0 : gateDecision.id) || request.decisionId || request.decision;
                            gate.selectedTargetStateId = request.targetStateId || (gateDecision === null || gateDecision === void 0 ? void 0 : gateDecision.to);
                            gate.note = request.note;
                            eventType = request.decision === 'approved' ? 'gate.approved' : request.decision === 'rejected' ? 'gate.rejected' : 'gate.revision_requested';
                            pushEvent(run, {
                                type: eventType,
                                gateId: gate.id,
                                stateId: gate.stateId,
                                message: "Gate \"".concat(gate.title, "\" ").concat(request.decision, "."),
                                payload: {
                                    note: request.note,
                                    decisionId: gate.selectedDecisionId,
                                    targetStateId: gate.selectedTargetStateId,
                                    approvedBy: request.approvedBy
                                }
                            });
                            gateStateId = gate.stateId;
                            if (!gateStateId) return [3 /*break*/, 5];
                            run.status = 'running';
                            run.stateStatuses[gateStateId] = request.decision === 'rejected' ? 'failed' : 'done';
                            run.signals.push({
                                key: gateStateId === 'contract_gate' ? 'contract.status' : "".concat(gateStateId, ".status"),
                                value: request.decision,
                                stateId: gateStateId,
                                runId: run.id,
                                createdAt: timestamp()
                            });
                            explicitRoute = gateDecisionRoute(gateDecision, request);
                            if (!explicitRoute) return [3 /*break*/, 2];
                            return [4 /*yield*/, applyOutcomeRoute(workflow, run, gateStateId, (gateDecision === null || gateDecision === void 0 ? void 0 : gateDecision.outcome) || request.decision, explicitRoute, workspaceRootUri)];
                        case 1:
                            _a.sent();
                            return [3 /*break*/, 4];
                        case 2: return [4 /*yield*/, advanceFromState(workflow, run, gateStateId, workspaceRootUri, (gateDecision === null || gateDecision === void 0 ? void 0 : gateDecision.outcome) || request.decision)];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [3 /*break*/, 6];
                        case 5:
                            run.status = request.decision === 'rejected' ? 'failed' : 'waiting_gate';
                            _a.label = 6;
                        case 6: return [2 /*return*/, touch(run)];
                    }
                });
            });
        };
        SimulatedFlowKernelBridge_1.prototype.pauseRun = function (_workflow, run, reason) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled' || run.status === 'paused') {
                        return [2 /*return*/, run];
                    }
                    run.status = 'paused';
                    pushEvent(run, {
                        type: 'run.paused',
                        message: reason || 'Run paused.',
                        payload: { reason: reason }
                    });
                    return [2 /*return*/, touch(run)];
                });
            });
        };
        SimulatedFlowKernelBridge_1.prototype.resumeRun = function (_workflow, run, reason) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (run.status !== 'paused') {
                        return [2 /*return*/, run];
                    }
                    run.status = run.gates.some(function (gate) { return gate.status === 'pending'; }) ? 'waiting_gate' : 'running';
                    pushEvent(run, {
                        type: 'run.resumed',
                        message: reason || 'Run resumed.',
                        payload: { reason: reason }
                    });
                    return [2 /*return*/, touch(run)];
                });
            });
        };
        SimulatedFlowKernelBridge_1.prototype.cancelRun = function (_workflow, run, reason) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
                        return [2 /*return*/, run];
                    }
                    run.status = 'cancelled';
                    pushEvent(run, {
                        type: 'run.cancelled',
                        message: reason || 'Run cancelled.',
                        payload: { reason: reason }
                    });
                    return [2 /*return*/, touch(run)];
                });
            });
        };
        return SimulatedFlowKernelBridge_1;
    }());
    __setFunctionName(_classThis, "SimulatedFlowKernelBridge");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SimulatedFlowKernelBridge = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SimulatedFlowKernelBridge = _classThis;
}();
exports.SimulatedFlowKernelBridge = SimulatedFlowKernelBridge;
function enterState(workflow, run, stateId, workspaceRootUri) {
    return __awaiter(this, void 0, void 0, function () {
        var state, _i, _a, _b, branchId, branch, workload_1, workload;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    state = getState(workflow, stateId);
                    if (state.type === 'parallel' && state.branches) {
                        run.currentStateIds = Object.keys(state.branches);
                    }
                    else {
                        run.currentStateIds = [stateId];
                    }
                    run.stateStatuses[stateId] = state.type === 'gate' ? 'review' : 'running';
                    pushEvent(run, {
                        type: 'state.entered',
                        stateId: stateId,
                        message: "Entered state \"".concat(stateId, "\".")
                    });
                    if (state.type === 'gate') {
                        createGate(workflow, run, stateId);
                        return [2 /*return*/];
                    }
                    if (!(state.type === 'loop')) return [3 /*break*/, 2];
                    return [4 /*yield*/, enterLoopState(workflow, run, stateId, state, workspaceRootUri)];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
                case 2:
                    if (!(state.type === 'input')) return [3 /*break*/, 5];
                    return [4 /*yield*/, materializeInputStateArtifacts(run, stateId, state, workspaceRootUri)];
                case 3:
                    _c.sent();
                    run.stateStatuses[stateId] = 'done';
                    pushEvent(run, {
                        type: 'state.completed',
                        stateId: stateId,
                        message: "State \"".concat(stateId, "\" completed.")
                    });
                    return [4 /*yield*/, advanceFromState(workflow, run, stateId, workspaceRootUri, 'success')];
                case 4:
                    _c.sent();
                    return [2 /*return*/];
                case 5:
                    if (state.type === 'parallel' && state.branches) {
                        for (_i = 0, _a = Object.entries(state.branches); _i < _a.length; _i++) {
                            _b = _a[_i], branchId = _b[0], branch = _b[1];
                            run.stateStatuses[branchId] = 'running';
                            workload_1 = createWorkload(run, branchId, __assign(__assign({}, branch), { id: branchId }));
                            run.workloads.push(workload_1);
                            pushEvent(run, {
                                type: 'workload.created',
                                stateId: branchId,
                                workloadId: workload_1.id,
                                message: "Workload \"".concat(workload_1.id, "\" created for branch \"").concat(branchId, "\".")
                            });
                            workload_1.status = 'running';
                            pushEvent(run, {
                                type: 'workload.started',
                                stateId: branchId,
                                workloadId: workload_1.id,
                                message: "Workload \"".concat(workload_1.id, "\" started.")
                            });
                        }
                        return [2 /*return*/];
                    }
                    workload = createWorkload(run, stateId, state);
                    run.workloads.push(workload);
                    pushEvent(run, {
                        type: 'workload.created',
                        stateId: stateId,
                        workloadId: workload.id,
                        message: "Workload \"".concat(workload.id, "\" created for state \"").concat(stateId, "\".")
                    });
                    workload.status = 'running';
                    pushEvent(run, {
                        type: 'workload.started',
                        stateId: stateId,
                        workloadId: workload.id,
                        message: "Workload \"".concat(workload.id, "\" started.")
                    });
                    return [2 /*return*/];
            }
        });
    });
}
function advanceFromState(workflow_1, run_2, stateId_1, workspaceRootUri_1) {
    return __awaiter(this, arguments, void 0, function (workflow, run, stateId, workspaceRootUri, outcome) {
        var outcomeRoute, transitions, transition, transitionId;
        if (outcome === void 0) { outcome = 'success'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    outcomeRoute = resolveOutcomeRoute(workflow, run, stateId, outcome);
                    if (!outcomeRoute) return [3 /*break*/, 2];
                    return [4 /*yield*/, applyOutcomeRoute(workflow, run, stateId, outcome, outcomeRoute, workspaceRootUri)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, true];
                case 2:
                    transitions = (workflow.transitions || [])
                        .filter(function (transition) { return transition.from === stateId; })
                        .sort(function (left, right) { return (right.priority || 0) - (left.priority || 0); });
                    if (transitions.length === 0) {
                        if (outcome === 'failed' || outcome === 'error' || outcome === 'rejected' || run.stateStatuses[stateId] === 'failed') {
                            failRun(run, stateId, "State \"".concat(stateId, "\" finished with outcome \"").concat(outcome, "\" and no route handled it."));
                            return [2 /*return*/, true];
                        }
                        completeRun(run);
                        return [2 /*return*/, true];
                    }
                    transition = transitions.find(function (candidate) { return transitionMatchesOutcome(candidate, outcome) && evaluateGuard(workflow, run, candidate.guard); });
                    if (!transition) {
                        if (run.stateStatuses[stateId] === 'failed') {
                            run.status = 'failed';
                            pushEvent(run, {
                                type: 'transition.evaluated',
                                stateId: stateId,
                                message: "No transition guard matched for failed state \"".concat(stateId, "\".")
                            });
                            return [2 /*return*/, true];
                        }
                        completeRun(run);
                        return [2 /*return*/, true];
                    }
                    transitionId = transition.id || "".concat(transition.from, "-").concat(transition.to);
                    pushEvent(run, {
                        type: 'transition.evaluated',
                        transitionId: transitionId,
                        stateId: stateId,
                        message: "Transition \"".concat(transition.from, "\" -> \"").concat(transition.to, "\" evaluated."),
                        payload: { guard: transition.guard }
                    });
                    pushEvent(run, {
                        type: 'transition.fired',
                        transitionId: transitionId,
                        stateId: stateId,
                        message: "Transition \"".concat(transition.from, "\" -> \"").concat(transition.to, "\" fired."),
                        payload: { loopCounter: transitionLoopCounter(transition.guard) }
                    });
                    return [4 /*yield*/, enterState(workflow, run, transition.to, workspaceRootUri)];
                case 3:
                    _a.sent();
                    return [2 /*return*/, true];
            }
        });
    });
}
function transitionMatchesOutcome(transition, outcome) {
    var expectedEvents = outcomeRouteTransitionEvents(outcome);
    return expectedEvents.includes(transition.on);
}
function enterLoopState(workflow, run, stateId, state, workspaceRootUri) {
    return __awaiter(this, void 0, void 0, function () {
        var config, iterationCount, maxIterations, iteration;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    config = state.loop;
                    if (!(config === null || config === void 0 ? void 0 : config.body)) {
                        failRun(run, stateId, "Loop state \"".concat(stateId, "\" does not declare a body state."));
                        return [2 /*return*/];
                    }
                    if (!(config.until && evaluateGuard(workflow, run, config.until))) return [3 /*break*/, 2];
                    run.stateStatuses[stateId] = 'done';
                    pushEvent(run, {
                        type: 'loop.completed',
                        stateId: stateId,
                        message: "Loop \"".concat(stateId, "\" completed because its until guard matched.")
                    });
                    pushEvent(run, {
                        type: 'state.completed',
                        stateId: stateId,
                        message: "State \"".concat(stateId, "\" completed.")
                    });
                    return [4 /*yield*/, advanceFromState(workflow, run, stateId, workspaceRootUri, 'success')];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
                case 2:
                    iterationCount = loopIterationCount(run, stateId, config.counter);
                    maxIterations = typeof config.maxIterations === 'number' ? config.maxIterations : 1;
                    if (!(iterationCount >= maxIterations)) return [3 /*break*/, 4];
                    run.stateStatuses[stateId] = 'failed';
                    pushEvent(run, {
                        type: 'loop.exhausted',
                        stateId: stateId,
                        message: "Loop \"".concat(stateId, "\" exhausted after ").concat(iterationCount, " iteration(s)."),
                        payload: { maxIterations: maxIterations, counter: config.counter }
                    });
                    return [4 /*yield*/, advanceFromState(workflow, run, stateId, workspaceRootUri, 'exhausted')];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
                case 4:
                    iteration = iterationCount + 1;
                    run.signals.push({
                        key: config.counter || "".concat(stateId, ".iteration"),
                        value: iteration,
                        stateId: stateId,
                        runId: run.id,
                        createdAt: timestamp()
                    });
                    pushEvent(run, {
                        type: 'loop.iteration_started',
                        stateId: stateId,
                        message: "Loop \"".concat(stateId, "\" started iteration ").concat(iteration, "."),
                        payload: {
                            iteration: iteration,
                            counter: config.counter,
                            body: config.body,
                            repair: config.repair
                        }
                    });
                    return [4 /*yield*/, enterState(workflow, run, config.body, workspaceRootUri)];
                case 5:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function applyOutcomeRoute(workflow, run, stateId, outcome, route, workspaceRootUri) {
    return __awaiter(this, void 0, void 0, function () {
        var normalizedRoute, transitionId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    normalizedRoute = typeof route === 'string' ? { to: route } : route;
                    transitionId = outcomeRouteTransitionId(workflow, stateId, outcome, normalizedRoute);
                    pushEvent(run, {
                        type: 'state.outcome_resolved',
                        transitionId: transitionId,
                        stateId: stateId,
                        message: "State \"".concat(stateId, "\" resolved outcome \"").concat(outcome, "\"."),
                        payload: __assign({}, normalizedRoute)
                    });
                    if (!normalizedRoute.to) return [3 /*break*/, 2];
                    run.status = 'running';
                    return [4 /*yield*/, enterState(workflow, run, normalizedRoute.to, workspaceRootUri)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
                case 2:
                    switch (normalizedRoute.action) {
                        case 'complete':
                        case 'stop':
                            completeRun(run);
                            return [2 /*return*/];
                        case 'fail':
                            failRun(run, stateId, normalizedRoute.note || "State \"".concat(stateId, "\" failed with outcome \"").concat(outcome, "\"."));
                            return [2 /*return*/];
                        case 'cancel':
                            run.status = 'cancelled';
                            run.currentStateIds = [];
                            pushEvent(run, {
                                type: 'run.cancelled',
                                stateId: stateId,
                                message: normalizedRoute.note || "Run cancelled by outcome \"".concat(outcome, "\".")
                            });
                            touch(run);
                            return [2 /*return*/];
                        case 'pause':
                            run.status = 'paused';
                            run.currentStateIds = [stateId];
                            run.stateStatuses[stateId] = 'waiting';
                            pushEvent(run, {
                                type: 'run.paused',
                                stateId: stateId,
                                message: normalizedRoute.note || "Run paused by outcome \"".concat(outcome, "\".")
                            });
                            touch(run);
                            return [2 /*return*/];
                        case 'wait':
                            run.status = 'waiting_gate';
                            run.currentStateIds = [stateId];
                            run.stateStatuses[stateId] = 'waiting';
                            pushEvent(run, {
                                type: 'transition.evaluated',
                                transitionId: transitionId,
                                stateId: stateId,
                                message: normalizedRoute.note || "Run is waiting after outcome \"".concat(outcome, "\".")
                            });
                            touch(run);
                            return [2 /*return*/];
                        case 'continue':
                        default:
                            completeRun(run);
                            return [2 /*return*/];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function outcomeRouteTransitionId(workflow, stateId, outcome, route) {
    if (!route.to) {
        return undefined;
    }
    var preferredEvents = outcomeRouteTransitionEvents(outcome);
    var candidates = (workflow.transitions || []).filter(function (transition) { return transition.from === stateId && transition.to === route.to; });
    var preferred = candidates.find(function (transition) { return preferredEvents.includes(transition.on); });
    var transition = preferred || (candidates.length === 1 ? candidates[0] : undefined);
    return transition ? transition.id || "".concat(transition.from, "-").concat(transition.to) : undefined;
}
function outcomeRouteTransitionEvents(outcome) {
    switch (outcome) {
        case 'approved':
            return ['gate.approved', 'state.completed', 'workload.completed'];
        case 'rejected':
        case 'revision_requested':
        case 'changes_requested':
        case 'failed':
        case 'error':
            return ['gate.rejected', 'workload.failed', 'workload.completed', 'state.completed'];
        case 'success':
        case 'completed':
        default:
            return ['state.completed', 'workload.completed', 'run.started', 'gate.approved'];
    }
}
function resolveOutcomeRoute(workflow, run, stateId, outcome) {
    var _a;
    var state = getState(workflow, stateId);
    var aliases = outcomeAliases(outcome);
    for (var _i = 0, aliases_1 = aliases; _i < aliases_1.length; _i++) {
        var alias = aliases_1[_i];
        var route = (_a = state.outcomes) === null || _a === void 0 ? void 0 : _a[alias];
        if (route) {
            return route;
        }
    }
    if (outcome === 'failed' || outcome === 'error' || outcome === 'rejected') {
        var repairRoute = resolveLoopRepairRoute(workflow, stateId);
        if (repairRoute) {
            return repairRoute;
        }
    }
    if (outcome === 'success' || outcome === 'completed' || outcome === 'approved') {
        var loopController = findLoopControllerForBody(workflow, stateId);
        if (loopController) {
            return loopController;
        }
    }
    return undefined;
}
function outcomeAliases(outcome) {
    var aliases = [outcome];
    if (outcome === 'success') {
        aliases.push('completed', 'approved');
    }
    else if (outcome === 'completed') {
        aliases.push('success', 'approved');
    }
    else if (outcome === 'approved') {
        aliases.push('success', 'completed');
    }
    else if (outcome === 'failed') {
        aliases.push('error', 'rejected');
    }
    else if (outcome === 'error') {
        aliases.push('failed');
    }
    else if (outcome === 'revision_requested') {
        aliases.push('changes_requested', 'failed');
    }
    return Array.from(new Set(aliases));
}
function resolveLoopRepairRoute(workflow, stateId) {
    var _a;
    for (var _i = 0, _b = Object.entries(workflow.states); _i < _b.length; _i++) {
        var _c = _b[_i], candidateId = _c[0], candidate = _c[1];
        if (candidate.type === 'loop' && ((_a = candidate.loop) === null || _a === void 0 ? void 0 : _a.body) === stateId && candidate.loop.repair) {
            return {
                to: candidate.loop.repair,
                label: "Repair ".concat(stateId),
                note: "Loop \"".concat(candidateId, "\" routed failed body \"").concat(stateId, "\" to repair.")
            };
        }
    }
    return undefined;
}
function findLoopControllerForBody(workflow, stateId) {
    var _a, _b;
    for (var _i = 0, _c = Object.entries(workflow.states); _i < _c.length; _i++) {
        var _d = _c[_i], candidateId = _d[0], candidate = _d[1];
        if (candidate.type === 'loop' && (((_a = candidate.loop) === null || _a === void 0 ? void 0 : _a.body) === stateId || ((_b = candidate.loop) === null || _b === void 0 ? void 0 : _b.repair) === stateId)) {
            return {
                to: candidateId,
                label: "Return to loop ".concat(candidateId)
            };
        }
    }
    return undefined;
}
function loopIterationCount(run, stateId, counter) {
    return run.events.filter(function (event) {
        var _a;
        return event.type === 'loop.iteration_started'
            && event.stateId === stateId
            && (!counter || ((_a = event.payload) === null || _a === void 0 ? void 0 : _a.counter) === counter);
    }).length;
}
function resolveGateDecision(gate, request) {
    return (gate.decisions || []).find(function (decision) { return decision.id === request.decisionId; })
        || (gate.decisions || []).find(function (decision) { return decision.id === request.decision; })
        || defaultGateDecision(request.decision);
}
function defaultGateDecision(decision) {
    if (decision === 'approved') {
        return { id: 'approved', label: 'Approve', outcome: 'approved' };
    }
    if (decision === 'revision_requested') {
        return { id: 'revision_requested', label: 'Request changes', outcome: 'revision_requested', action: 'wait', allowTargetSelection: true };
    }
    return { id: 'rejected', label: 'Reject', outcome: 'rejected', action: 'fail' };
}
function gateDecisionRoute(decision, request) {
    if (request.targetStateId) {
        return { to: request.targetStateId, label: decision === null || decision === void 0 ? void 0 : decision.label };
    }
    if ((decision === null || decision === void 0 ? void 0 : decision.to) || (decision === null || decision === void 0 ? void 0 : decision.action)) {
        return {
            to: decision.to,
            action: decision.action,
            label: decision.label
        };
    }
    return undefined;
}
function failRun(run, stateId, message) {
    run.status = 'failed';
    run.currentStateIds = [];
    if (stateId) {
        run.stateStatuses[stateId] = 'failed';
    }
    pushEvent(run, {
        type: 'state.failed',
        stateId: stateId,
        message: message
    });
    pushEvent(run, {
        type: 'run.failed',
        stateId: stateId,
        message: message
    });
    touch(run);
}
function materializeInputStateArtifacts(run, stateId, state, workspaceRootUri) {
    return __awaiter(this, void 0, void 0, function () {
        var outputs, workspaceRoot, inputDir, _i, outputs_1, output, relativeParts, artifactPath, content, artifactUri;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    outputs = state.outputs && state.outputs.length > 0 ? state.outputs : ['input/request.md'];
                    workspaceRoot = path.resolve(workspaceRootUri ? file_uri_1.FileUri.fsPath(workspaceRootUri) : os.homedir());
                    inputDir = path.join((0, flow_path_policy_1.resolveFlowRunDirectory)(workspaceRoot, run.id), 'input');
                    _i = 0, outputs_1 = outputs;
                    _a.label = 1;
                case 1:
                    if (!(_i < outputs_1.length)) return [3 /*break*/, 5];
                    output = outputs_1[_i];
                    relativeParts = (0, flow_path_policy_1.splitFlowRelativePath)(output);
                    artifactPath = path.join.apply(path, __spreadArray([inputDir], relativeParts, false));
                    content = inputArtifactContent(output, run.prompt);
                    return [4 /*yield*/, fs.mkdir(path.dirname(artifactPath), { recursive: true })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, fs.writeFile(artifactPath, content, 'utf8')];
                case 3:
                    _a.sent();
                    artifactUri = file_uri_1.FileUri.create(artifactPath).toString();
                    upsertRunArtifact(run, {
                        id: stableId('artifact', run.id, stateId, output),
                        runId: run.id,
                        stateId: stateId,
                        uri: artifactUri,
                        kind: 'input',
                        summary: output,
                        createdAt: timestamp()
                    });
                    pushEvent(run, {
                        type: 'artifact.created',
                        stateId: stateId,
                        message: "Input artifact \"".concat(output, "\" created."),
                        payload: { uri: artifactUri }
                    });
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function materializeWorkflowInputArtifacts(workflow, run, workspaceRootUri) {
    return __awaiter(this, void 0, void 0, function () {
        var _i, _a, _b, stateId, state;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _i = 0, _a = Object.entries(workflow.states);
                    _c.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    _b = _a[_i], stateId = _b[0], state = _b[1];
                    if (!(state.type === 'input')) return [3 /*break*/, 3];
                    return [4 /*yield*/, materializeInputStateArtifacts(run, stateId, state, workspaceRootUri)];
                case 2:
                    _c.sent();
                    _c.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function inputArtifactContent(output, prompt) {
    if (output.toLowerCase().endsWith('.json')) {
        return JSON.stringify({ prompt: prompt }, undefined, 2);
    }
    return ['# Request', '', prompt || 'No prompt was provided.'].join('\n');
}
function upsertRunArtifact(run, artifact) {
    var index = run.artifacts.findIndex(function (item) { return item.id === artifact.id; });
    if (index === -1) {
        run.artifacts.push(artifact);
        return;
    }
    run.artifacts[index] = artifact;
}
function findActiveParallelParent(workflow, activeStateIds) {
    var active = new Set(activeStateIds);
    for (var _i = 0, _a = Object.entries(workflow.states); _i < _a.length; _i++) {
        var _b = _a[_i], stateId = _b[0], state = _b[1];
        var branchIds = Object.keys(state.branches || {});
        if (branchIds.length > 0 && branchIds.every(function (branchId) { return active.has(branchId); })) {
            return stateId;
        }
    }
    return undefined;
}
function evaluateGuard(workflow, run, guard) {
    if (!guard || Object.keys(guard).length === 0) {
        return true;
    }
    return Object.entries(guard).every(function (_a) {
        var key = _a[0], value = _a[1];
        switch (key) {
            case 'all':
                return Array.isArray(value) && value.every(function (item) { return evaluateGuard(workflow, run, item); });
            case 'any':
                return Array.isArray(value) && value.some(function (item) { return evaluateGuard(workflow, run, item); });
            case 'artifact.exists':
                return typeof value === 'string' && run.artifacts.some(function (artifact) { var _a; return artifact.uri.includes(value) || ((_a = artifact.summary) === null || _a === void 0 ? void 0 : _a.includes(value)); });
            case 'artifact.validates':
                return artifactValidates(run, value);
            case 'signal.equals':
                return signalEquals(run, value);
            case 'gate.status':
                return gateStatusEquals(run, value);
            case 'effect.status':
                return effectStatusEquals(run, value);
            case 'branches.all_completed':
                return Array.isArray(value) && value.every(function (branchId) { return run.stateStatuses[String(branchId)] === 'done'; });
            case 'loop.lt':
                return loopCount(run, value) < loopMax(value);
            case 'loop.gte':
                return loopCount(run, value) >= loopMax(value);
            default:
                return true;
        }
    });
}
function artifactValidates(run, value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    var record = value;
    var artifactPath = typeof record.path === 'string' ? record.path : '';
    var schema = typeof record.schema === 'string' ? record.schema : '';
    if (!artifactPath || (schema !== 'contracts.schema.json' && schema !== 'flow-kernel/schemas/contracts.schema.json')) {
        return false;
    }
    var artifact = run.artifacts.find(function (candidate) { return artifactMatchesPath(candidate, artifactPath); });
    if (!artifact) {
        return false;
    }
    try {
        var filePath = artifactFilePath(artifact.uri);
        var raw = filePath && fsSync.existsSync(filePath) ? fsSync.readFileSync(filePath, 'utf8') : '';
        if (!raw.trim()) {
            return false;
        }
        var parsed = JSON.parse(raw);
        return flowContractSchemaValidator(parsed) === true;
    }
    catch (_a) {
        return false;
    }
}
function artifactFilePath(uri) {
    if (!uri) {
        return undefined;
    }
    if (uri.startsWith('file:')) {
        return file_uri_1.FileUri.fsPath(uri);
    }
    return uri;
}
function artifactMatchesPath(artifact, artifactPath) {
    var normalizedPath = normalizeArtifactGuardPath(artifactPath);
    return normalizeArtifactGuardPath(artifact.uri).includes(normalizedPath)
        || normalizeArtifactGuardPath(artifact.summary || '').includes(normalizedPath);
}
function normalizeArtifactGuardPath(value) {
    return value.replace(/\\/g, '/');
}
function signalEquals(run, value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    var record = value;
    var key = String(record.key || '');
    return run.signals.some(function (signal) { return signal.key === key && signal.value === record.value; });
}
function gateStatusEquals(run, value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    var record = value;
    return run.gates.some(function (gate) { return gate.id === record.id && gate.status === record.value; });
}
function effectStatusEquals(run, value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    var record = value;
    var kind = typeof record.kind === 'string' ? record.kind : undefined;
    return run.effects.some(function (effect) {
        return (!kind || effect.kind === kind)
            && effect.status === record.value;
    });
}
function loopCount(run, value) {
    var counter = loopCounter(value);
    if (!counter) {
        return 0;
    }
    return run.events.filter(function (event) { var _a; return event.type === 'transition.fired' && ((_a = event.payload) === null || _a === void 0 ? void 0 : _a.loopCounter) === counter; }).length;
}
function loopMax(value) {
    if (!value || typeof value !== 'object') {
        return 0;
    }
    var raw = value.max;
    return typeof raw === 'number' ? raw : Number(raw || 0);
}
function loopCounter(value) {
    if (!value || typeof value !== 'object') {
        return undefined;
    }
    var record = value;
    return typeof record.counter === 'string' ? record.counter : typeof record.key === 'string' ? record.key : undefined;
}
function transitionLoopCounter(guard) {
    if (!guard) {
        return undefined;
    }
    for (var _i = 0, _a = Object.entries(guard); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        if (key === 'loop.lt') {
            return loopCounter(value);
        }
        if ((key === 'all' || key === 'any') && Array.isArray(value)) {
            for (var _c = 0, value_1 = value; _c < value_1.length; _c++) {
                var item = value_1[_c];
                var found = transitionLoopCounter(item);
                if (found) {
                    return found;
                }
            }
        }
    }
    return undefined;
}
function createGate(workflow, run, stateId) {
    var _a;
    var state = getState(workflow, stateId);
    var existing = run.gates.find(function (gate) { return gate.stateId === stateId && gate.status === 'pending'; });
    if (existing) {
        run.status = 'waiting_gate';
        return;
    }
    var configuredGate = (_a = state.gates) === null || _a === void 0 ? void 0 : _a[0];
    var gate = {
        id: (configuredGate === null || configuredGate === void 0 ? void 0 : configuredGate.id) || (0, common_1.generateUuid)(),
        title: (configuredGate === null || configuredGate === void 0 ? void 0 : configuredGate.title) || "Approve ".concat(stateId),
        prompt: (configuredGate === null || configuredGate === void 0 ? void 0 : configuredGate.prompt) || "Approve state \"".concat(stateId, "\" before the run continues."),
        decisions: (configuredGate === null || configuredGate === void 0 ? void 0 : configuredGate.decisions) || [
            { id: 'approved', label: 'Approve', outcome: 'approved' },
            { id: 'revision_requested', label: 'Request changes', outcome: 'revision_requested', action: 'wait', allowTargetSelection: true },
            { id: 'rejected', label: 'Reject', outcome: 'rejected', action: 'fail' }
        ],
        stateId: stateId,
        status: 'pending'
    };
    run.gates.push(gate);
    run.status = 'waiting_gate';
    run.stateStatuses[stateId] = 'review';
    pushEvent(run, {
        type: 'gate.created',
        stateId: stateId,
        gateId: gate.id,
        message: "Human gate \"".concat(gate.title, "\" is waiting.")
    });
}
function requiresGate(workflow, stateId) {
    var _a;
    var state = getState(workflow, stateId);
    return Boolean((_a = state.gates) === null || _a === void 0 ? void 0 : _a.length);
}
function createWorkload(run, stateId, state) {
    var _a;
    var now = timestamp();
    return {
        id: (0, common_1.generateUuid)(),
        runId: run.id,
        stateId: stateId,
        agent: state.agent,
        status: 'ready',
        inputArtifacts: ((_a = state.input) === null || _a === void 0 ? void 0 : _a.include) || [],
        outputArtifacts: [],
        issues: [],
        effectIds: [],
        createdAt: now,
        updatedAt: now
    };
}
function completeRun(run) {
    run.status = 'completed';
    run.currentStateIds = [];
    pushEvent(run, {
        type: 'run.completed',
        message: 'Run completed.'
    });
    touch(run);
}
function buildInitialStateStatuses(workflow) {
    var statuses = {};
    for (var _i = 0, _a = Object.entries(workflow.states); _i < _a.length; _i++) {
        var _b = _a[_i], stateId = _b[0], state = _b[1];
        statuses[stateId] = 'pending';
        for (var _c = 0, _d = Object.keys(state.branches || {}); _c < _d.length; _c++) {
            var branchId = _d[_c];
            statuses[branchId] = 'pending';
        }
    }
    return statuses;
}
function findStartStateId(workflow) {
    var stateIds = new Set(Object.keys(workflow.states));
    var targets = new Set((workflow.transitions || []).map(function (transition) { return transition.to; }));
    return __spreadArray([], stateIds, true).find(function (stateId) { return !targets.has(stateId); }) || __spreadArray([], stateIds, true)[0];
}
function getState(workflow, stateId) {
    var _a;
    var direct = workflow.states[stateId];
    if (direct) {
        return direct;
    }
    for (var _i = 0, _b = Object.values(workflow.states); _i < _b.length; _i++) {
        var state = _b[_i];
        var branch = (_a = state.branches) === null || _a === void 0 ? void 0 : _a[stateId];
        if (branch) {
            return branch;
        }
    }
    throw new Error("Unknown workflow state \"".concat(stateId, "\"."));
}
function pushEvent(run, event) {
    run.events.push(__assign(__assign({}, event), { payload: event.payload ? (0, common_2.limitFlowJsonValue)(event.payload, common_2.FlowSizeLimits.eventPayloadBytes, 'event payload') : undefined, id: (0, common_1.generateUuid)(), runId: run.id, timestamp: timestamp() }));
}
function touch(run) {
    run.updatedAt = timestamp();
    return run;
}
function timestamp() {
    return new Date().toISOString();
}
function stableId(prefix) {
    var parts = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        parts[_i - 1] = arguments[_i];
    }
    return "".concat(prefix, "-").concat(parts.join('-').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || (0, common_1.generateUuid)());
}
function mapKernelRunToFlowRun(workflow, prompt, kernelRun, kernelEvents, metadata, previousRun) {
    var activeStates = new Set(Object.entries(kernelRun.activeStates || {}).filter(function (_a) {
        var active = _a[1];
        return active;
    }).map(function (_a) {
        var stateId = _a[0];
        return stateId;
    }));
    var completedStates = new Set(Object.entries(kernelRun.completedStates || {}).filter(function (_a) {
        var done = _a[1];
        return done;
    }).map(function (_a) {
        var stateId = _a[0];
        return stateId;
    }));
    var stateStatuses = buildInitialStateStatuses(workflow);
    for (var _i = 0, _a = Object.keys(stateStatuses); _i < _a.length; _i++) {
        var stateId = _a[_i];
        if (completedStates.has(stateId)) {
            stateStatuses[stateId] = 'done';
        }
        else if (activeStates.has(stateId)) {
            stateStatuses[stateId] = kernelRun.status === 'waiting' ? 'waiting' : 'running';
        }
    }
    var workloads = Object.values(kernelRun.workloads || {}).map(function (workload) { return mapKernelWorkload(workload); });
    var artifacts = Object.values(kernelRun.artifacts || {}).map(function (artifact) { return ({
        id: artifact.id,
        runId: kernelRun.id,
        stateId: artifact.stateId || '',
        uri: artifact.path,
        kind: artifactKind(artifact),
        summary: artifact.path,
        createdAt: normalizeTime(artifact.createdAt)
    }); });
    var effects = (kernelRun.effects || []).map(function (effect) { return ({
        id: effect.id || (0, common_1.generateUuid)(),
        runId: kernelRun.id,
        stateId: effect.stateId || '',
        kind: effectKind(effect),
        status: 'applied',
        type: effect.type,
        path: effect.path,
        command: effect.command,
        hashBefore: effect.hashBefore,
        hashAfter: effect.hashAfter,
        patch: effect.patch,
        approvalPolicy: effect.approvalPolicy,
        summary: effect.summary || effect.path || effect.command || effect.type
    }); });
    var signals = Object.entries(kernelRun.signals || {}).map(function (_a) {
        var key = _a[0], value = _a[1];
        return ({
            key: key,
            value: value,
            runId: kernelRun.id,
            createdAt: normalizeTime(kernelRun.updatedAt)
        });
    });
    var events = mergeKernelEvents((previousRun === null || previousRun === void 0 ? void 0 : previousRun.events) || [], kernelEvents, metadata);
    var gateDecisionById = new Map();
    for (var _b = 0, kernelEvents_1 = kernelEvents; _b < kernelEvents_1.length; _b++) {
        var event_1 = kernelEvents_1[_b];
        if ((event_1.type === 'gate.approved' || event_1.type === 'gate.rejected') && (event_1.gateId || event_1.stateId)) {
            gateDecisionById.set(event_1.gateId || event_1.stateId || '', event_1.type === 'gate.approved' ? 'approved' : 'rejected');
        }
    }
    var gates = kernelEvents
        .filter(function (event) { return event.type === 'gate.waiting'; })
        .map(function (event) {
        var gateId = event.gateId || event.stateId || (0, common_1.generateUuid)();
        return {
            id: gateId,
            title: "Approve ".concat(event.stateId || event.gateId),
            stateId: event.stateId,
            status: gateDecisionById.get(gateId) || 'pending',
            prompt: event.message || 'Approve this gate before the run continues.'
        };
    });
    var run = {
        id: kernelRun.id,
        workflowId: workflow.id,
        prompt: prompt,
        status: mapKernelStatus(kernelRun.status),
        createdAt: normalizeTime(kernelRun.createdAt),
        updatedAt: normalizeTime(kernelRun.updatedAt),
        externalKernelMetadata: metadata,
        currentStateIds: __spreadArray([], activeStates, true),
        stateStatuses: stateStatuses,
        workloads: workloads,
        events: events,
        artifacts: artifacts,
        effects: effects,
        signals: signals,
        gates: gates,
        tick: kernelEvents.filter(function (event) { return event.type === 'clock.tick'; }).length
    };
    attachSecondRunSuggestionFromEvents(run);
    if (previousRun) {
        preserveFlowRunContext(previousRun, run);
    }
    return run;
}
function preserveFlowRunContext(source, target) {
    if (source.file && !target.file) {
        target.file = source.file;
    }
    if (source.externalKernelMetadata) {
        target.externalKernelMetadata = source.externalKernelMetadata;
    }
    target.contextPack = source.contextPack;
    target.workloadContextPacks = source.workloadContextPacks;
    target.memoryCandidates = source.memoryCandidates;
    target.memoryWrites = source.memoryWrites;
    if (source.secondRunSuggestion && source.secondRunSuggestion.status !== 'suggested') {
        target.secondRunSuggestion = source.secondRunSuggestion;
    }
    else if (source.secondRunSuggestion && !target.secondRunSuggestion) {
        target.secondRunSuggestion = source.secondRunSuggestion;
    }
    if (!source.executionMode) {
        return target;
    }
    target.executionMode = source.executionMode;
    target.executionModeMessage = source.executionModeMessage;
    return target;
}
function parseKernelEventId(raw) {
    if (!/^\d+$/.test(raw)) {
        return undefined;
    }
    var seq = Number.parseInt(raw, 10);
    return Number.isFinite(seq) && Number.isInteger(seq) ? seq : undefined;
}
function dedupeKernelEvents(events) {
    var bySeq = new Map();
    for (var _i = 0, events_1 = events; _i < events_1.length; _i++) {
        var event_2 = events_1[_i];
        if (!Number.isInteger(event_2.seq)) {
            continue;
        }
        bySeq.set(event_2.seq, event_2);
    }
    return __spreadArray([], bySeq.entries(), true).sort(function (left, right) { return left[0] - right[0]; })
        .map(function (_a) {
        var event = _a[1];
        return event;
    });
}
function mergeKernelEvents(existing, incoming, metadata) {
    var _a, _b, _c, _d;
    if (existing === void 0) { existing = []; }
    var hasIncomingRunStarted = incoming.some(function (event) { return event.type === 'run.started'; });
    var localEvents = existing.filter(function (event) { return parseKernelEventId(event.id) === undefined
        && !(hasIncomingRunStarted && isSyntheticExternalRunStarted(event)); });
    var bySeq = new Map();
    for (var _i = 0, existing_1 = existing; _i < existing_1.length; _i++) {
        var event_3 = existing_1[_i];
        var seq = parseKernelEventId(event_3.id);
        if (seq === undefined) {
            continue;
        }
        bySeq.set(seq, event_3);
    }
    for (var _e = 0, _f = dedupeKernelEvents(incoming); _e < _f.length; _e++) {
        var event_4 = _f[_e];
        bySeq.set(event_4.seq, mapKernelEvent(event_4, metadata));
    }
    var mergedKernel = __spreadArray([], bySeq.entries(), true).sort(function (left, right) { return left[0] - right[0]; })
        .map(function (_a) {
        var event = _a[1];
        return event;
    });
    if (!mergedKernel.some(function (event) { return event.type === 'run.started'; })) {
        mergedKernel.unshift({
            id: (0, common_1.generateUuid)(),
            runId: ((_a = incoming[0]) === null || _a === void 0 ? void 0 : _a.runId) || (((_b = existing[0]) === null || _b === void 0 ? void 0 : _b.runId) || ''),
            workflowId: (_c = existing[0]) === null || _c === void 0 ? void 0 : _c.workflowId,
            type: 'run.started',
            timestamp: ((_d = existing[0]) === null || _d === void 0 ? void 0 : _d.timestamp) || normalizeTime(new Date().toISOString()),
            message: 'Run started by external Flow Kernel.',
            payload: { kernel: metadata }
        });
    }
    else {
        for (var _g = 0, mergedKernel_1 = mergedKernel; _g < mergedKernel_1.length; _g++) {
            var event_5 = mergedKernel_1[_g];
            if (event_5.type === 'run.started') {
                event_5.payload = __assign(__assign({}, event_5.payload), { kernel: metadata });
                break;
            }
        }
    }
    return __spreadArray(__spreadArray([], mergedKernel, true), localEvents, true);
}
function isSyntheticExternalRunStarted(event) {
    return event.type === 'run.started'
        && event.message === 'Run started by external Flow Kernel.';
}
function normalizePushedKernelEvents(message) {
    var rawEvents = Array.isArray(message.events)
        ? message.events
        : Array.isArray(message.data)
            ? message.data
            : Array.isArray(message.event)
                ? message.event
                : isKernelEventLike(message)
                    ? [message]
                    : isKernelEventLike(message.event)
                        ? [message.event]
                        : [];
    return rawEvents.filter(isKernelEventLike).map(function (event) { return event; });
}
function isKernelEventLike(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    var event = value;
    return typeof event.seq === 'number'
        && typeof event.type === 'string'
        && typeof event.runId === 'string'
        && typeof event.time === 'string';
}
function mapKernelWorkload(workload) {
    var _a;
    return {
        id: workload.id,
        runId: workload.runId,
        stateId: workload.stateId,
        branchId: workload.parentState,
        agent: workload.agent,
        attempt: workload.attempt,
        previousWorkloadId: workload.previousWorkloadId,
        status: mapKernelWorkloadStatus(workload.status),
        inputArtifacts: ((_a = workload.input) === null || _a === void 0 ? void 0 : _a.include) || [],
        outputArtifacts: workload.outputs || [],
        issues: [],
        effectIds: [],
        createdAt: normalizeTime(workload.createdAt),
        updatedAt: normalizeTime(workload.completedAt || workload.startedAt || workload.createdAt)
    };
}
function normalizeKernelRequests(raw, storeDir) {
    if (!Array.isArray(raw)) {
        return [];
    }
    return raw
        .filter(function (request) { return Boolean(request) && typeof request === 'object'; })
        .map(function (request) { return ({
        id: String(request.id || request.requestId || request.workloadId || ''),
        type: String(request.type || ''),
        runId: String(request.runId || ''),
        workloadId: String(request.workloadId || request.id || ''),
        stateId: String(request.stateId || ''),
        storeDir: storeDir,
        artifactId: optionalString(request.artifactId),
        gateId: optionalString(request.gateId),
        path: optionalString(request.path)
    }); })
        .filter(function (request) { return request.id && request.type && request.runId && (isKernelWorkloadRequest(request) ? Boolean(request.workloadId) : true); });
}
function requestKey(request) {
    return "".concat(request.type, ":").concat(request.runId, ":").concat(request.workloadId, ":").concat(request.id);
}
function isKernelWorkloadRequest(request) {
    return request.type === 'execute_workload'
        || request.type === 'request_context_pack'
        || request.type === 'request_memory_write'
        || request.type === 'request_command_execution';
}
function optionalString(value) {
    if (value === undefined || value === null) {
        return undefined;
    }
    var text = String(value);
    return text ? text : undefined;
}
function cloneFlowRun(run) {
    return JSON.parse(JSON.stringify(run));
}
function diffHostWorkloadResult(before, after, workload) {
    var beforeArtifacts = new Set(before.artifacts.map(function (artifact) { return artifact.id; }));
    var beforeEffects = new Set(before.effects.map(function (effect) { return effect.id; }));
    var beforeSignals = new Set(before.signals.map(function (signal) { return "".concat(signal.key, ":").concat(signal.createdAt || '', ":").concat(String(signal.value)); }));
    var artifacts = after.artifacts.filter(function (artifact) { return !beforeArtifacts.has(artifact.id) || workload.outputArtifacts.includes(artifact.uri); });
    var effects = after.effects.filter(function (effect) { return !beforeEffects.has(effect.id) || workload.effectIds.includes(effect.id); });
    var signals = after.signals.filter(function (signal) { return !beforeSignals.has("".concat(signal.key, ":").concat(signal.createdAt || '', ":").concat(String(signal.value)))
        || signal.stateId === workload.stateId; });
    var issues = workload.issues.map(function (issue) { return ({ severity: 'non_blocking', type: 'workload_issue', summary: issue }); });
    return {
        workloadId: workload.id,
        stateId: workload.stateId,
        agent: workload.agent,
        artifacts: artifacts,
        effects: effects,
        signals: signals,
        issues: issues,
        failed: workload.status === 'failed',
        error: workload.issues[0]
    };
}
function mapKernelEvent(event, metadata) {
    return {
        id: String(event.seq),
        runId: event.runId,
        type: mapKernelEventType(event.type),
        timestamp: normalizeTime(event.time),
        stateId: event.stateId,
        transitionId: event.transitionId,
        workloadId: event.workloadId,
        gateId: event.gateId,
        message: event.message || event.type,
        payload: event.type === 'run.started' ? __assign(__assign({}, event.data), { kernel: metadata }) : event.data
    };
}
function attachSecondRunSuggestionFromEvents(run) {
    var issues = run.events
        .filter(function (event) { return event.type === 'issue.recorded'; })
        .map(function (event) { return event.payload; })
        .filter(function (payload) { return Boolean(payload) && typeof payload === 'object'; })
        .map(function (payload) { return ({
        severity: stringValue(payload.severity) || 'non_blocking',
        type: stringValue(payload.type) || 'workload_issue',
        summary: stringValue(payload.summary) || stringValue(payload.message) || 'Issue recorded during run.',
        producer: stringValue(payload.producer),
        impact: stringValue(payload.impact),
        suggestedFollowup: stringValue(payload.suggestedFollowup)
    }); })
        .filter(function (issue) { return issue.summary && isSecondRunIssue(issue); });
    if (issues.length === 0) {
        return;
    }
    var deduped = dedupeIssues(issues);
    var reason = "QA/agentes registraram ".concat(deduped.length, " melhoria(s) fora de escopo ou problema(s) nao bloqueante(s).");
    run.secondRunSuggestion = {
        id: "second-run-".concat(run.id),
        status: 'suggested',
        reason: reason,
        title: 'Segunda run sugerida',
        sourceRunId: run.id,
        sourceIssueCount: deduped.length,
        issues: deduped,
        prompt: [
            "Continue a partir da run ".concat(run.id, "."),
            reason,
            '',
            'Trate apenas os follow-ups abaixo, preservando o escopo entregue na run original:',
            deduped.map(function (issue) { return "- [".concat(issue.severity, "] ").concat(issue.type, ": ").concat(issue.summary); }).join('\n')
        ].join('\n'),
        createdAt: run.updatedAt
    };
}
function dedupeIssues(issues) {
    var seen = new Set();
    var result = [];
    for (var _i = 0, issues_1 = issues; _i < issues_1.length; _i++) {
        var issue = issues_1[_i];
        var key = "".concat(issue.severity, ":").concat(issue.type, ":").concat(issue.summary);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        result.push(issue);
    }
    return result;
}
function isSecondRunIssue(issue) {
    var severity = (issue.severity || '').toLowerCase();
    var text = [issue.type, issue.summary, issue.suggestedFollowup].join(' ').toLowerCase();
    return severity === 'non_blocking'
        || severity === 'warning'
        || severity === 'minor'
        || text.includes('out-of-scope')
        || text.includes('out of scope')
        || text.includes('fora de escopo')
        || text.includes('followup')
        || text.includes('follow-up')
        || text.includes('melhoria')
        || text.includes('improvement')
        || text.includes('second run')
        || text.includes('segunda run');
}
function stringValue(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function toTrimmedString(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function parseStringArray(value) {
    return Array.isArray(value) ? value.map(function (item) { return toTrimmedString(item); }).filter(Boolean) : [];
}
function parseOptionalNumber(value) {
    var parsed = typeof value === 'number' ? value : Number.parseInt(toTrimmedString(value), 10);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function parseRecordEnv(value) {
    if (!isRecord(value)) {
        return {};
    }
    var env = {};
    for (var _i = 0, _a = Object.entries(value); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], raw = _b[1];
        if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
            env[key] = raw;
        }
    }
    return env;
}
function mapKernelStatus(status) {
    switch (status) {
        case 'completed': return 'completed';
        case 'failed': return 'failed';
        case 'cancelled': return 'cancelled';
        case 'paused': return 'paused';
        case 'waiting': return 'waiting_gate';
        default: return 'running';
    }
}
function mapKernelWorkloadStatus(status) {
    switch (status) {
        case 'started': return 'running';
        case 'completed': return 'done';
        case 'failed': return 'failed';
        default: return 'pending';
    }
}
function mapKernelEventType(type) {
    switch (type) {
        case 'run.started': return 'run.started';
        case 'run.completed': return 'run.completed';
        case 'run.failed': return 'run.failed';
        case 'run.cancelled': return 'run.cancelled';
        case 'run.paused': return 'run.paused';
        case 'run.resumed': return 'run.resumed';
        case 'state.entered': return 'state.entered';
        case 'state.completed': return 'state.completed';
        case 'workload.created': return 'workload.created';
        case 'workload.requeued': return 'workload.requeued';
        case 'workload.started': return 'workload.started';
        case 'workload.failed': return 'workload.failed';
        case 'workload.completed': return 'workload.completed';
        case 'workload.retry': return 'workload.retry';
        case 'artifact.created': return 'artifact.created';
        case 'transition.fired': return 'transition.fired';
        case 'gate.approved': return 'gate.approved';
        case 'gate.rejected': return 'gate.rejected';
        case 'gate.waiting': return 'gate.created';
        case 'effect.recorded': return 'effect.proposed';
        case 'issue.recorded': return 'issue.recorded';
        case 'signal.recorded': return 'signal.emitted';
        case 'transition.checked':
        case 'transition.check_requested':
        case 'clock.tick':
        default:
            return 'transition.evaluated';
    }
}
function artifactKind(artifact) {
    if (artifact.type === 'contract') {
        return 'contract';
    }
    if (artifact.path.endsWith('.md')) {
        return 'report';
    }
    if (artifact.path.endsWith('.log')) {
        return 'log';
    }
    return 'other';
}
function effectKind(effect) {
    switch (effect.type) {
        case 'file.edited':
        case 'file.create':
        case 'file.created':
        case 'file.deleted':
            return 'file_write';
        case 'command.executed':
            return 'command';
        case 'memory.write':
            return 'memory_write';
        default:
            return 'other';
    }
}
function toKernelWorkflow(workflow) {
    var states = {};
    for (var _i = 0, _a = Object.entries(workflow.states); _i < _a.length; _i++) {
        var _b = _a[_i], stateId = _b[0], state = _b[1];
        states[stateId] = toKernelState(state);
    }
    return {
        version: workflow.version,
        id: workflow.id,
        name: workflow.name,
        requires: workflow.requires,
        agents: workflow.agents,
        states: states,
        transitions: workflow.transitions
    };
}
function toKernelState(state) {
    var _a, _b;
    var branches = {};
    for (var _i = 0, _c = Object.entries(state.branches || {}); _i < _c.length; _i++) {
        var _d = _c[_i], branchId = _d[0], branch = _d[1];
        branches[branchId] = toKernelState(branch);
    }
    return {
        type: state.type,
        agent: state.agent,
        playbookId: state.playbookId,
        playbook: state.playbook,
        prompt: state.prompt,
        playbookInput: state.playbookInput,
        agentRole: state.agentRole,
        provider: state.provider,
        modelExecution: state.modelExecution,
        input: state.input,
        timeoutMs: state.timeoutMs,
        outputs: state.outputs,
        waitFor: state.waitFor,
        branches: Object.keys(branches).length ? branches : undefined,
        dynamicParallel: state.dynamicParallel,
        tournament: state.tournament,
        gateId: (_b = (_a = state.gates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.id,
        retry: state.retry,
        signals: state.signals,
        effects: state.effects
    };
}
function kernelMetadata(run) {
    var _a;
    if (run.externalKernelMetadata && run.externalKernelMetadata.kernelRunId && run.externalKernelMetadata.storeDir) {
        return run.externalKernelMetadata;
    }
    for (var _i = 0, _b = run.events; _i < _b.length; _i++) {
        var event_6 = _b[_i];
        var kernel = (_a = event_6.payload) === null || _a === void 0 ? void 0 : _a.kernel;
        if ((kernel === null || kernel === void 0 ? void 0 : kernel.kernelRunId) && kernel.storeDir) {
            return kernel;
        }
    }
    return undefined;
}
function shouldUseExternalKernel(run) {
    return run.executionMode === 'kernel_external' || Boolean(kernelMetadata(run));
}
function ensureExecutionMode(run, source) {
    if (run.executionMode) {
        return run;
    }
    return setExecutionMode(run, source.executionMode || 'kernel_simulated', source.executionModeMessage);
}
function setExecutionMode(run, executionMode, executionModeMessage) {
    run.executionMode = executionMode;
    if (executionModeMessage) {
        run.executionModeMessage = executionModeMessage;
    }
    return run;
}
function postKernelHttpMessage(url, message) {
    return __awaiter(this, void 0, void 0, function () {
        var normalized, body;
        return __generator(this, function (_a) {
            normalized = new URL(url);
            body = JSON.stringify(message);
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var request = (normalized.protocol === 'https:' ? https : http).request({
                        protocol: normalized.protocol,
                        hostname: normalized.hostname,
                        port: normalized.port,
                        path: "".concat(normalized.pathname).concat(normalized.search),
                        method: 'POST',
                        headers: {
                            'content-type': 'application/json',
                            'content-length': Buffer.byteLength(body)
                        }
                    });
                    request.on('error', function (error) {
                        reject(error);
                    });
                    request.on('response', function (response) {
                        var raw = '';
                        response.on('data', function (chunk) {
                            raw += chunk;
                        });
                        response.on('end', function () {
                            if (response.statusCode !== 200) {
                                reject(new Error("Flow Kernel HTTP responded with status ".concat(response.statusCode, ": ").concat(raw)));
                                return;
                            }
                            try {
                                resolve(JSON.parse(raw || '{}'));
                            }
                            catch (error) {
                                reject(error);
                            }
                        });
                    });
                    request.write(body);
                    request.end();
                })];
        });
    });
}
function resolveKernelCommand() {
    var configured = process.env.FLOW_KERNEL_CLI || process.env.AGENCY_KERNEL_CLI;
    if (configured) {
        return { executable: configured, argsPrefix: [] };
    }
    for (var _i = 0, _a = resolveKernelSearchRoots(); _i < _a.length; _i++) {
        var cwd = _a[_i];
        var localMain = path.join(cwd, 'flow-kernel', 'cmd', 'flow-kernel', 'main.go');
        if (fileExistsSyncish(localMain)) {
            return { executable: 'go', argsPrefix: ['run', './flow-kernel/cmd/flow-kernel'], cwd: cwd };
        }
    }
    return undefined;
}
function resolveKernelSearchRoots() {
    var seeds = [
        process.cwd(),
        path.resolve(__dirname, '..', '..', '..', '..')
    ];
    var roots = [];
    var seen = new Set();
    var addRoot = function (candidate) {
        var resolved = path.resolve(candidate);
        var key = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
        if (seen.has(key)) {
            return;
        }
        seen.add(key);
        roots.push(resolved);
    };
    for (var _i = 0, seeds_1 = seeds; _i < seeds_1.length; _i++) {
        var seed = seeds_1[_i];
        var current = path.resolve(seed);
        for (var depth = 0; depth < 8; depth += 1) {
            addRoot(current);
            addRoot(path.join(current, 'Modificacoes', 'Flow'));
            addRoot(path.join(current, 'Flow'));
            var parent_1 = path.dirname(current);
            if (parent_1 === current) {
                break;
            }
            current = parent_1;
        }
    }
    return roots;
}
function resolveKernelHttpEndpoint() {
    var configured = process.env.FLOW_KERNEL_HTTP || process.env.AGENCY_KERNEL_HTTP;
    if (!configured) {
        return undefined;
    }
    var target = configured.includes('://') ? configured : "http://".concat(configured);
    var parsed = new URL(target);
    if (parsed.protocol === 'ws:' || parsed.protocol === 'wss:') {
        if (parsed.pathname === '/' || parsed.pathname === '') {
            parsed.pathname = '/ws';
        }
        return parsed.toString();
    }
    if (parsed.pathname === '/' || parsed.pathname === '' || parsed.pathname === '/ws') {
        parsed.pathname = '/message';
    }
    return parsed.toString();
}
function isKernelWebSocketEndpoint(endpoint) {
    var protocol = new URL(endpoint).protocol;
    return protocol === 'ws:' || protocol === 'wss:';
}
function resolveRuntimeWebSocket() {
    var WebSocketCtor = globalThis.WebSocket;
    if (!WebSocketCtor) {
        throw new Error('WebSocket endpoints require a runtime WebSocket implementation. Use Node.js >=22 or configure the HTTP endpoint.');
    }
    return WebSocketCtor;
}
function formatWebSocketEvent(event) {
    if (event instanceof Error) {
        return event.message;
    }
    if (event && typeof event === 'object') {
        var record = event;
        var code = record.code === undefined ? '' : " code=".concat(String(record.code));
        var reason = record.reason === undefined ? '' : " reason=".concat(String(record.reason));
        var message = record.message === undefined ? '' : " message=".concat(String(record.message));
        return "".concat(code).concat(reason).concat(message).trim() || 'no details';
    }
    return String(event || 'no details');
}
function fileExistsSyncish(file) {
    try {
        // eslint-disable-next-line no-sync
        return require('fs').existsSync(file);
    }
    catch (_a) {
        return false;
    }
}
function normalizeTime(value) {
    return value ? new Date(value).toISOString() : timestamp();
}
function ensureResponseType(response, expectedType) {
    if (response.type !== expectedType) {
        throw new Error("Unexpected kernel response type: \"".concat(response.type, "\" (expected ").concat(expectedType, ")."));
    }
}
function getKernelRun(response) {
    var run = response.run;
    if (!run || typeof run !== 'object') {
        throw new Error('Kernel response did not include a valid run payload.');
    }
    return run;
}
