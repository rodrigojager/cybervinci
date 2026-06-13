"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.FlowContribution = void 0;
var browser_1 = require("@theia/core/lib/browser");
var common_1 = require("@theia/core/lib/common");
var common_2 = require("@cybervinci/branding/lib/common");
var inversify_1 = require("@theia/core/shared/inversify");
var common_3 = require("../common");
var flow_widget_1 = require("./flow-widget");
var FlowContribution = function () {
    var _classDecorators = [(0, inversify_1.injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _classSuper = browser_1.AbstractViewContribution;
    var FlowContribution = _classThis = /** @class */ (function (_super) {
        __extends(FlowContribution_1, _super);
        function FlowContribution_1() {
            return _super.call(this, {
                widgetId: flow_widget_1.FlowWidget.ID,
                widgetName: flow_widget_1.FlowWidget.LABEL,
                defaultWidgetOptions: {
                    area: 'main',
                    rank: 420
                },
                toggleCommandId: 'flow.toggle'
            }) || this;
        }
        FlowContribution_1.prototype.initializeLayout = function (_app) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, undefined];
                });
            });
        };
        FlowContribution_1.prototype.registerCommands = function (commands) {
            var _this = this;
            _super.prototype.registerCommands.call(this, commands);
            commands.registerCommand(common_3.FlowCommands.OPEN, {
                execute: function () { return _this.openView({ activate: true }); }
            });
            commands.registerCommand(common_3.FlowCommands.START_WORKFLOW, {
                execute: function (options) { return __awaiter(_this, void 0, void 0, function () {
                    var widget;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.openView({ activate: true })];
                            case 1:
                                widget = _a.sent();
                                return [4 /*yield*/, widget.runWorkflowFromExternalPrompt(normalizeFlowCommandOptions(options))];
                            case 2:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); }
            });
            commands.registerCommand(common_3.FlowCommands.RUN_DYNAMIC_WORKFLOW, {
                execute: function (options) { return __awaiter(_this, void 0, void 0, function () {
                    var widget;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.openView({ activate: true })];
                            case 1:
                                widget = _a.sent();
                                return [4 /*yield*/, widget.runDynamicWorkflowFromExternalPrompt(normalizeFlowCommandOptions(options))];
                            case 2:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); }
            });
            commands.registerCommand(common_3.FlowCommands.Legacy.OPEN, {
                execute: function () { return commands.executeCommand(common_3.FlowCommands.OPEN.id); }
            });
        };
        FlowContribution_1.prototype.registerMenus = function (menus) {
            _super.prototype.registerMenus.call(this, menus);
            menus.registerSubmenu(common_3.FlowMenus.FLOW, common_1.nls.localize('theia/flow/cyberVinci/menu', common_2.CYBERVINCI_MENU_ITEMS.FLOW.label), {
                sortString: '6',
                icon: common_2.CYBERVINCI_MENU_ITEMS.FLOW.iconClass
            });
            menus.registerMenuAction(common_3.FlowMenus.FLOW, {
                commandId: common_3.FlowCommands.OPEN.id,
                label: common_1.nls.localize('theia/flow/cyberVinci/open', 'Open Flow'),
                order: '0'
            });
            menus.registerMenuAction(common_3.FlowMenus.FLOW, {
                commandId: common_3.FlowCommands.START_WORKFLOW.id,
                label: common_1.nls.localize('theia/flow/cyberVinci/startWorkflow', 'Start selected workflow'),
                order: '1'
            });
            menus.registerMenuAction(common_3.FlowMenus.FLOW, {
                commandId: common_3.FlowCommands.RUN_DYNAMIC_WORKFLOW.id,
                label: common_1.nls.localize('theia/flow/cyberVinci/runDynamicWorkflow', 'Run dynamic workflow'),
                order: '2'
            });
            menus.registerMenuAction(browser_1.CommonMenus.VIEW_VIEWS, {
                commandId: common_3.FlowCommands.OPEN.id,
                label: common_1.nls.localize('theia/flow/view/open', 'Flow')
            });
        };
        Object.defineProperty(FlowContribution_1.prototype, "defaultIconClass", {
            get: function () {
                return common_2.CYBERVINCI_MENU_ITEMS.FLOW.iconClass;
            },
            enumerable: false,
            configurable: true
        });
        return FlowContribution_1;
    }(_classSuper));
    __setFunctionName(_classThis, "FlowContribution");
    (function () {
        var _a;
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        FlowContribution = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return FlowContribution = _classThis;
}();
exports.FlowContribution = FlowContribution;
function normalizeFlowCommandOptions(options) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
        return {};
    }
    var record = options;
    var normalized = {};
    var prompt = stringOption(record.prompt);
    var message = stringOption(record.message);
    var input = stringOption(record.input);
    var workflowId = stringOption(record.workflowId);
    var workspaceRootUri = stringOption(record.workspaceRootUri);
    if (prompt) {
        normalized.prompt = prompt;
    }
    if (message) {
        normalized.message = message;
    }
    if (input) {
        normalized.input = input;
    }
    if (workflowId) {
        normalized.workflowId = workflowId;
    }
    if (workspaceRootUri) {
        normalized.workspaceRootUri = workspaceRootUri;
    }
    if (typeof record.preferSaved === 'boolean') {
        normalized.preferSaved = record.preferSaved;
    }
    if (isRecord(record.parameters)) {
        normalized.parameters = record.parameters;
    }
    if (isRecord(record.roleOverrides)) {
        normalized.roleOverrides = record.roleOverrides;
    }
    if (isRecord(record.authoringDraft)) {
        normalized.authoringDraft = record.authoringDraft;
    }
    else if (isRecord(record.draft)) {
        normalized.draft = record.draft;
    }
    return normalized;
}
function stringOption(value) {
    return typeof value === 'string' ? value : undefined;
}
function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
