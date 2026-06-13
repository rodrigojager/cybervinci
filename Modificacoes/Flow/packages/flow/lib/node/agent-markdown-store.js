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
exports.AgentMarkdownStore = void 0;
var fs = require("fs/promises");
var os = require("os");
var path = require("path");
var file_uri_1 = require("@theia/core/lib/common/file-uri");
var inversify_1 = require("@theia/core/shared/inversify");
var MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown']);
var AgentMarkdownStore = function () {
    var _classDecorators = [(0, inversify_1.injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AgentMarkdownStore = _classThis = /** @class */ (function () {
        function AgentMarkdownStore_1() {
        }
        AgentMarkdownStore_1.prototype.listAgents = function (workspaceRootUri) {
            return __awaiter(this, void 0, void 0, function () {
                var root, files, summaries;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.ensureAgentsDir(workspaceRootUri)];
                        case 1:
                            root = _a.sent();
                            return [4 /*yield*/, this.collectMarkdownFiles(root)];
                        case 2:
                            files = _a.sent();
                            return [4 /*yield*/, Promise.all(files.map(function (file) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                    return [2 /*return*/, this.summary(root, file)];
                                }); }); }))];
                        case 3:
                            summaries = _a.sent();
                            return [2 /*return*/, summaries.sort(function (left, right) { return left.relativePath.localeCompare(right.relativePath); })];
                    }
                });
            });
        };
        AgentMarkdownStore_1.prototype.readAgent = function (workspaceRootUri_1, relativePath_1) {
            return __awaiter(this, arguments, void 0, function (workspaceRootUri, relativePath, options) {
                var root, file, _a, _b;
                var _c;
                if (options === void 0) { options = {}; }
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.ensureAgentsDir(workspaceRootUri)];
                        case 1:
                            root = _d.sent();
                            file = this.agentFile(root, relativePath);
                            return [4 /*yield*/, exists(file)];
                        case 2:
                            if (!!(_d.sent())) return [3 /*break*/, 4];
                            if (!options.createIfMissing) {
                                return [2 /*return*/, undefined];
                            }
                            return [4 /*yield*/, this.writeAgent(workspaceRootUri, relativePath, defaultAgentTemplate(relativePath, options.title))];
                        case 3:
                            _d.sent();
                            _d.label = 4;
                        case 4:
                            _a = [{}];
                            return [4 /*yield*/, this.summary(root, file)];
                        case 5:
                            _b = [__assign.apply(void 0, _a.concat([_d.sent()]))];
                            _c = {};
                            return [4 /*yield*/, fs.readFile(file, 'utf8')];
                        case 6: return [2 /*return*/, __assign.apply(void 0, _b.concat([(_c.content = _d.sent(), _c)]))];
                    }
                });
            });
        };
        AgentMarkdownStore_1.prototype.writeAgent = function (workspaceRootUri, relativePath, content) {
            return __awaiter(this, void 0, void 0, function () {
                var root, file, _a, _b;
                var _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.ensureAgentsDir(workspaceRootUri)];
                        case 1:
                            root = _d.sent();
                            file = this.agentFile(root, relativePath);
                            return [4 /*yield*/, fs.mkdir(path.dirname(file), { recursive: true })];
                        case 2:
                            _d.sent();
                            return [4 /*yield*/, fs.writeFile(file, normalizeMarkdown(content), 'utf8')];
                        case 3:
                            _d.sent();
                            _a = [{}];
                            return [4 /*yield*/, this.summary(root, file)];
                        case 4:
                            _b = [__assign.apply(void 0, _a.concat([_d.sent()]))];
                            _c = {};
                            return [4 /*yield*/, fs.readFile(file, 'utf8')];
                        case 5: return [2 /*return*/, __assign.apply(void 0, _b.concat([(_c.content = _d.sent(), _c)]))];
                    }
                });
            });
        };
        AgentMarkdownStore_1.prototype.createAgent = function (workspaceRootUri_1, relativePath_1) {
            return __awaiter(this, arguments, void 0, function (workspaceRootUri, relativePath, options) {
                var root, file, _a, _b;
                var _c;
                var _d;
                if (options === void 0) { options = {}; }
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0: return [4 /*yield*/, this.ensureAgentsDir(workspaceRootUri)];
                        case 1:
                            root = _e.sent();
                            file = this.agentFile(root, relativePath);
                            return [4 /*yield*/, exists(file)];
                        case 2:
                            if (_e.sent()) {
                                throw new Error("Agent markdown \"".concat(relativePath, "\" already exists."));
                            }
                            return [4 /*yield*/, fs.mkdir(path.dirname(file), { recursive: true })];
                        case 3:
                            _e.sent();
                            return [4 /*yield*/, fs.writeFile(file, normalizeMarkdown((_d = options.content) !== null && _d !== void 0 ? _d : defaultAgentTemplate(relativePath, options.title)), 'utf8')];
                        case 4:
                            _e.sent();
                            _a = [{}];
                            return [4 /*yield*/, this.summary(root, file)];
                        case 5:
                            _b = [__assign.apply(void 0, _a.concat([_e.sent()]))];
                            _c = {};
                            return [4 /*yield*/, fs.readFile(file, 'utf8')];
                        case 6: return [2 /*return*/, __assign.apply(void 0, _b.concat([(_c.content = _e.sent(), _c)]))];
                    }
                });
            });
        };
        AgentMarkdownStore_1.prototype.duplicateAgent = function (workspaceRootUri_1, sourceRelativePath_1, targetRelativePath_1) {
            return __awaiter(this, arguments, void 0, function (workspaceRootUri, sourceRelativePath, targetRelativePath, options) {
                var root, sourceFile, targetFile, sourceContent, _a, _b;
                var _c;
                if (options === void 0) { options = {}; }
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.ensureAgentsDir(workspaceRootUri)];
                        case 1:
                            root = _d.sent();
                            sourceFile = this.agentFile(root, sourceRelativePath);
                            targetFile = this.agentFile(root, targetRelativePath);
                            return [4 /*yield*/, exists(sourceFile)];
                        case 2:
                            if (!(_d.sent())) {
                                throw new Error("Agent markdown \"".concat(sourceRelativePath, "\" was not found."));
                            }
                            return [4 /*yield*/, exists(targetFile)];
                        case 3:
                            if (_d.sent()) {
                                throw new Error("Agent markdown \"".concat(targetRelativePath, "\" already exists."));
                            }
                            return [4 /*yield*/, fs.mkdir(path.dirname(targetFile), { recursive: true })];
                        case 4:
                            _d.sent();
                            return [4 /*yield*/, fs.readFile(sourceFile, 'utf8')];
                        case 5:
                            sourceContent = _d.sent();
                            return [4 /*yield*/, fs.writeFile(targetFile, normalizeMarkdown(options.title ? retitleMarkdown(sourceContent, options.title) : sourceContent), 'utf8')];
                        case 6:
                            _d.sent();
                            _a = [{}];
                            return [4 /*yield*/, this.summary(root, targetFile)];
                        case 7:
                            _b = [__assign.apply(void 0, _a.concat([_d.sent()]))];
                            _c = {};
                            return [4 /*yield*/, fs.readFile(targetFile, 'utf8')];
                        case 8: return [2 /*return*/, __assign.apply(void 0, _b.concat([(_c.content = _d.sent(), _c)]))];
                    }
                });
            });
        };
        AgentMarkdownStore_1.prototype.renameAgent = function (workspaceRootUri, sourceRelativePath, targetRelativePath) {
            return __awaiter(this, void 0, void 0, function () {
                var root, sourceFile, targetFile, _a, _b;
                var _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.ensureAgentsDir(workspaceRootUri)];
                        case 1:
                            root = _d.sent();
                            sourceFile = this.agentFile(root, sourceRelativePath);
                            targetFile = this.agentFile(root, targetRelativePath);
                            return [4 /*yield*/, exists(sourceFile)];
                        case 2:
                            if (!(_d.sent())) {
                                throw new Error("Agent markdown \"".concat(sourceRelativePath, "\" was not found."));
                            }
                            return [4 /*yield*/, exists(targetFile)];
                        case 3:
                            if (_d.sent()) {
                                throw new Error("Agent markdown \"".concat(targetRelativePath, "\" already exists."));
                            }
                            return [4 /*yield*/, fs.mkdir(path.dirname(targetFile), { recursive: true })];
                        case 4:
                            _d.sent();
                            return [4 /*yield*/, fs.rename(sourceFile, targetFile)];
                        case 5:
                            _d.sent();
                            _a = [{}];
                            return [4 /*yield*/, this.summary(root, targetFile)];
                        case 6:
                            _b = [__assign.apply(void 0, _a.concat([_d.sent()]))];
                            _c = {};
                            return [4 /*yield*/, fs.readFile(targetFile, 'utf8')];
                        case 7: return [2 /*return*/, __assign.apply(void 0, _b.concat([(_c.content = _d.sent(), _c)]))];
                    }
                });
            });
        };
        AgentMarkdownStore_1.prototype.ensureAgentsDir = function (workspaceRootUri) {
            return __awaiter(this, void 0, void 0, function () {
                var dir;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            dir = path.join(storageRoot(workspaceRootUri), 'agents');
                            return [4 /*yield*/, fs.mkdir(dir, { recursive: true })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, dir];
                    }
                });
            });
        };
        AgentMarkdownStore_1.prototype.agentFile = function (root, relativePath) {
            assertMarkdownPath(relativePath);
            var file = path.resolve(root, relativePath);
            assertInsideRoot(root, file);
            return file;
        };
        AgentMarkdownStore_1.prototype.collectMarkdownFiles = function (root_1) {
            return __awaiter(this, arguments, void 0, function (root, dir) {
                var entries, files, _i, entries_1, entry, file, _a, _b, _c;
                if (dir === void 0) { dir = root; }
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, fs.readdir(dir, { withFileTypes: true })];
                        case 1:
                            entries = _d.sent();
                            files = [];
                            _i = 0, entries_1 = entries;
                            _d.label = 2;
                        case 2:
                            if (!(_i < entries_1.length)) return [3 /*break*/, 6];
                            entry = entries_1[_i];
                            file = path.join(dir, entry.name);
                            if (!entry.isDirectory()) return [3 /*break*/, 4];
                            _b = (_a = files.push).apply;
                            _c = [files];
                            return [4 /*yield*/, this.collectMarkdownFiles(root, file)];
                        case 3:
                            _b.apply(_a, _c.concat([_d.sent()]));
                            return [3 /*break*/, 5];
                        case 4:
                            if (entry.isFile() && isMarkdownPath(entry.name)) {
                                files.push(file);
                            }
                            _d.label = 5;
                        case 5:
                            _i++;
                            return [3 /*break*/, 2];
                        case 6: return [2 /*return*/, files];
                    }
                });
            });
        };
        AgentMarkdownStore_1.prototype.summary = function (root, file) {
            return __awaiter(this, void 0, void 0, function () {
                var stat, relativePath;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, fs.stat(file)];
                        case 1:
                            stat = _a.sent();
                            relativePath = path.relative(root, file).split(path.sep).join('/');
                            return [2 /*return*/, {
                                    path: file,
                                    uri: file_uri_1.FileUri.create(file).toString(),
                                    relativePath: relativePath,
                                    updatedAt: stat.mtime.toISOString()
                                }];
                    }
                });
            });
        };
        return AgentMarkdownStore_1;
    }());
    __setFunctionName(_classThis, "AgentMarkdownStore");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AgentMarkdownStore = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AgentMarkdownStore = _classThis;
}();
exports.AgentMarkdownStore = AgentMarkdownStore;
function storageRoot(workspaceRootUri) {
    if (workspaceRootUri) {
        return path.join(file_uri_1.FileUri.fsPath(workspaceRootUri), '.theia', 'flow');
    }
    return path.join(os.homedir(), '.theia', 'flow');
}
function assertMarkdownPath(relativePath) {
    if (!relativePath || path.isAbsolute(relativePath) || relativePath.split(/[\\/]+/).some(function (segment) { return segment === '..'; })) {
        throw new Error("Agent path must be a relative Markdown path inside the workspace agent store: ".concat(relativePath));
    }
    if (!isMarkdownPath(relativePath)) {
        throw new Error("Agent path must use a Markdown extension: ".concat(relativePath));
    }
}
function assertInsideRoot(root, file) {
    var relative = path.relative(path.resolve(root), file);
    if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error("Agent path escapes the workspace agent store: ".concat(file));
    }
}
function isMarkdownPath(value) {
    return MARKDOWN_EXTENSIONS.has(path.extname(value).toLowerCase());
}
function defaultAgentTemplate(relativePath, title) {
    var name = title || path.basename(relativePath, path.extname(relativePath)).replace(/[-_]+/g, ' ');
    return [
        "# ".concat(titleCase(name)),
        '',
        '## Role',
        '',
        'Describe the reusable agent role here.',
        '',
        '> Agent Markdown is advisory execution context only. Workflow structure, transitions, guards, joins, loops, gates, and orchestration rules stay in the workflow file and Flow Kernel.',
        '',
        '## Instructions',
        '',
        '- Define the expected inputs.',
        '- Describe the work this agent should perform.',
        '- List the Markdown outputs this agent should produce.'
    ].join('\n');
}
function titleCase(value) {
    return value.replace(/\b\w/g, function (match) { return match.toUpperCase(); });
}
function normalizeMarkdown(content) {
    return content.endsWith('\n') ? content : "".concat(content, "\n");
}
function retitleMarkdown(content, title) {
    var lines = normalizeMarkdown(content).split('\n');
    var headingIndex = lines.findIndex(function (line) { return line.startsWith('# '); });
    if (headingIndex >= 0) {
        lines[headingIndex] = "# ".concat(titleCase(title));
        return lines.join('\n');
    }
    return "# ".concat(titleCase(title), "\n\n").concat(content);
}
function exists(file) {
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
