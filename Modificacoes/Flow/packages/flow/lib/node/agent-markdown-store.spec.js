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
var chai_1 = require("chai");
var fs = require("fs/promises");
var os = require("os");
var path = require("path");
var file_uri_1 = require("@theia/core/lib/common/file-uri");
var agent_markdown_store_1 = require("./agent-markdown-store");
describe('AgentMarkdownStore', function () {
    var tempDir;
    var workspaceRootUri;
    var store;
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.mkdtemp(path.join(os.tmpdir(), 'flow-agent-store-'))];
                case 1:
                    tempDir = _a.sent();
                    workspaceRootUri = file_uri_1.FileUri.create(tempDir).toString();
                    store = new agent_markdown_store_1.AgentMarkdownStore();
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
    it('writes and reads Markdown agents from the workspace store', function () { return __awaiter(void 0, void 0, void 0, function () {
        var written, read;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, store.writeAgent(workspaceRootUri, 'specialists/builder.md', '# Builder\n\nBuild the feature.')];
                case 1:
                    written = _a.sent();
                    return [4 /*yield*/, store.readAgent(workspaceRootUri, 'specialists/builder.md')];
                case 2:
                    read = _a.sent();
                    (0, chai_1.expect)(read === null || read === void 0 ? void 0 : read.content).to.equal('# Builder\n\nBuild the feature.\n');
                    (0, chai_1.expect)(read === null || read === void 0 ? void 0 : read.relativePath).to.equal('specialists/builder.md');
                    (0, chai_1.expect)(normalizePath(written.path)).to.equal(normalizePath(agentPath('specialists', 'builder.md')));
                    (0, chai_1.expect)(written.uri).to.equal(file_uri_1.FileUri.create(agentPath('specialists', 'builder.md')).toString());
                    return [2 /*return*/];
            }
        });
    }); });
    it('lists Markdown agents recursively in relative path order', function () { return __awaiter(void 0, void 0, void 0, function () {
        var agents;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, store.writeAgent(workspaceRootUri, 'reviewer.md', '# Reviewer')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, store.writeAgent(workspaceRootUri, 'specialists/builder.md', '# Builder')];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, fs.writeFile(agentPath('notes.txt'), 'ignore me', 'utf8')];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, store.listAgents(workspaceRootUri)];
                case 4:
                    agents = _a.sent();
                    (0, chai_1.expect)(agents.map(function (agent) { return agent.relativePath; })).to.deep.equal([
                        'reviewer.md',
                        'specialists/builder.md'
                    ]);
                    (0, chai_1.expect)(agents.every(function (agent) { return normalizePath(agent.path).startsWith(normalizePath(path.join(tempDir, '.theia', 'flow', 'agents'))); })).to.equal(true);
                    return [2 /*return*/];
            }
        });
    }); });
    it('can create a default Markdown template for a missing referenced agent', function () { return __awaiter(void 0, void 0, void 0, function () {
        var agent, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, store.readAgent(workspaceRootUri, 'planner.md', { createIfMissing: true })];
                case 1:
                    agent = _b.sent();
                    (0, chai_1.expect)(agent === null || agent === void 0 ? void 0 : agent.content).to.contain('# Planner');
                    (0, chai_1.expect)(agent === null || agent === void 0 ? void 0 : agent.content).to.contain('## Instructions');
                    (0, chai_1.expect)(agent === null || agent === void 0 ? void 0 : agent.content).to.contain('Workflow structure, transitions, guards, joins, loops, gates, and orchestration rules stay in the workflow file and Flow Kernel.');
                    _a = chai_1.expect;
                    return [4 /*yield*/, fs.readFile(agentPath('planner.md'), 'utf8')];
                case 2:
                    _a.apply(void 0, [_b.sent()]).to.equal(agent === null || agent === void 0 ? void 0 : agent.content);
                    return [2 /*return*/];
            }
        });
    }); });
    it('creates a new Markdown agent and refuses to overwrite an existing file', function () { return __awaiter(void 0, void 0, void 0, function () {
        var agent;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, store.createAgent(workspaceRootUri, 'specialists/designer.md', { title: 'Product Designer' })];
                case 1:
                    agent = _a.sent();
                    (0, chai_1.expect)(agent.relativePath).to.equal('specialists/designer.md');
                    (0, chai_1.expect)(agent.content).to.contain('# Product Designer');
                    return [4 /*yield*/, expectAnyRejected(function () { return store.createAgent(workspaceRootUri, 'specialists/designer.md'); }, 'already exists')];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('edits an existing Markdown agent without changing its relative path', function () { return __awaiter(void 0, void 0, void 0, function () {
        var edited, _a;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, store.createAgent(workspaceRootUri, 'specialists/reviewer.md', { title: 'Reviewer' })];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, store.writeAgent(workspaceRootUri, 'specialists/reviewer.md', '# Reviewer\n\nValidate contract changes.')];
                case 2:
                    edited = _c.sent();
                    (0, chai_1.expect)(edited.relativePath).to.equal('specialists/reviewer.md');
                    (0, chai_1.expect)(edited.content).to.equal('# Reviewer\n\nValidate contract changes.\n');
                    _a = chai_1.expect;
                    return [4 /*yield*/, store.readAgent(workspaceRootUri, 'specialists/reviewer.md')];
                case 3:
                    _a.apply(void 0, [(_b = (_c.sent())) === null || _b === void 0 ? void 0 : _b.content]).to.equal(edited.content);
                    return [2 /*return*/];
            }
        });
    }); });
    it('duplicates an existing Markdown agent into a new safe path', function () { return __awaiter(void 0, void 0, void 0, function () {
        var duplicate;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, store.writeAgent(workspaceRootUri, 'builder.md', '# Builder\n\nBuild the feature.')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, store.duplicateAgent(workspaceRootUri, 'builder.md', 'copies/builder-copy.md', { title: 'Builder Copy' })];
                case 2:
                    duplicate = _a.sent();
                    (0, chai_1.expect)(duplicate.relativePath).to.equal('copies/builder-copy.md');
                    (0, chai_1.expect)(duplicate.content).to.contain('# Builder Copy');
                    (0, chai_1.expect)(duplicate.content).to.contain('Build the feature.');
                    return [4 /*yield*/, expectRejected(function () { return store.duplicateAgent(workspaceRootUri, '../builder.md', 'copy.md'); })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, expectRejected(function () { return store.duplicateAgent(workspaceRootUri, 'builder.md', '../copy.md'); })];
                case 4:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('renames an existing Markdown agent into a new safe path', function () { return __awaiter(void 0, void 0, void 0, function () {
        var renamed, _a, _b;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, store.writeAgent(workspaceRootUri, 'drafts/reviewer.md', '# Reviewer')];
                case 1:
                    _d.sent();
                    return [4 /*yield*/, store.renameAgent(workspaceRootUri, 'drafts/reviewer.md', 'reviewer.md')];
                case 2:
                    renamed = _d.sent();
                    (0, chai_1.expect)(renamed.relativePath).to.equal('reviewer.md');
                    _a = chai_1.expect;
                    return [4 /*yield*/, store.readAgent(workspaceRootUri, 'drafts/reviewer.md')];
                case 3:
                    _a.apply(void 0, [_d.sent()]).to.equal(undefined);
                    _b = chai_1.expect;
                    return [4 /*yield*/, store.readAgent(workspaceRootUri, 'reviewer.md')];
                case 4:
                    _b.apply(void 0, [(_c = (_d.sent())) === null || _c === void 0 ? void 0 : _c.content]).to.equal('# Reviewer\n');
                    return [4 /*yield*/, expectRejected(function () { return store.renameAgent(workspaceRootUri, 'reviewer.md', '../../outside.md'); })];
                case 5:
                    _d.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('rejects path traversal outside the workspace agent store', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, expectRejected(function () { return store.writeAgent(workspaceRootUri, '../outside.md', '# Outside'); })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, expectRejected(function () { return store.readAgent(workspaceRootUri, 'nested/../../outside.md'); })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, expectRejected(function () { return store.writeAgent(workspaceRootUri, path.join(tempDir, 'absolute.md'), '# Absolute'); })];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    function agentPath() {
        var segments = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            segments[_i] = arguments[_i];
        }
        return path.join.apply(path, __spreadArray([tempDir, '.theia', 'flow', 'agents'], segments, false));
    }
});
function expectRejected(action) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, expectAnyRejected(action, 'Agent path')];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function expectAnyRejected(action, message) {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, action()];
                case 1:
                    _a.sent();
                    throw new Error('Expected operation to fail.');
                case 2:
                    error_1 = _a.sent();
                    (0, chai_1.expect)(error_1).to.be.instanceOf(Error);
                    (0, chai_1.expect)(error_1.message).to.contain(message);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function normalizePath(value) {
    return path.normalize(value).toLowerCase();
}
