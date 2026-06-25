"use strict";
// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyberVinciChatDomControlsContribution = void 0;
var common_1 = require("@cybervinci/ai-runtime/lib/common");
var common_2 = require("@cybervinci/flow/lib/common");
var browser_1 = require("@theia/core/lib/browser");
var core_1 = require("@theia/core");
var preferences_1 = require("@theia/core/lib/common/preferences");
var disposable_1 = require("@theia/core/lib/common/disposable");
var inversify_1 = require("@theia/core/shared/inversify");
var React = require("@theia/core/shared/react");
var client_1 = require("@theia/core/shared/react-dom/client");
var common_3 = require("../common");
var cybervinci_chat_input_options_contribution_1 = require("./cybervinci-chat-input-options-contribution");
var cybervinci_ai_chat_experience_preferences_1 = require("./cybervinci-ai-chat-experience-preferences");
var cybervinci_chat_ai_execution_controls_1 = require("./cybervinci-chat-ai-execution-controls");
var CyberVinciChatDomControlsContribution = function () {
    var _classDecorators = [(0, inversify_1.injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _experienceService_decorators;
    var _experienceService_initializers = [];
    var _experienceService_extraInitializers = [];
    var _preferenceService_decorators;
    var _preferenceService_initializers = [];
    var _preferenceService_extraInitializers = [];
    var _commandService_decorators;
    var _commandService_initializers = [];
    var _commandService_extraInitializers = [];
    var _hoverService_decorators;
    var _hoverService_initializers = [];
    var _hoverService_extraInitializers = [];
    var _flowService_decorators;
    var _flowService_initializers = [];
    var _flowService_extraInitializers = [];
    var _aiRuntimeService_decorators;
    var _aiRuntimeService_initializers = [];
    var _aiRuntimeService_extraInitializers = [];
    var CyberVinciChatDomControlsContribution = _classThis = /** @class */ (function () {
        function CyberVinciChatDomControlsContribution_1() {
            this.experienceService = __runInitializers(this, _experienceService_initializers, void 0);
            this.preferenceService = (__runInitializers(this, _experienceService_extraInitializers), __runInitializers(this, _preferenceService_initializers, void 0));
            this.commandService = (__runInitializers(this, _preferenceService_extraInitializers), __runInitializers(this, _commandService_initializers, void 0));
            this.hoverService = (__runInitializers(this, _commandService_extraInitializers), __runInitializers(this, _hoverService_initializers, void 0));
            this.flowService = (__runInitializers(this, _hoverService_extraInitializers), __runInitializers(this, _flowService_initializers, void 0));
            this.aiRuntimeService = (__runInitializers(this, _flowService_extraInitializers), __runInitializers(this, _aiRuntimeService_initializers, void 0));
            this.toDispose = (__runInitializers(this, _aiRuntimeService_extraInitializers), new disposable_1.DisposableCollection());
            this.renderScheduled = false;
            this.roots = new WeakMap();
            this.lastFlowModes = new WeakMap();
        }
        CyberVinciChatDomControlsContribution_1.prototype.onStart = function () {
            // The React contribution hook is the authoritative integration path.
            // Keep this legacy fallback inert so a stale binding cannot duplicate the toolbar.
        };
        CyberVinciChatDomControlsContribution_1.prototype.onStop = function () {
            this.toDispose.dispose();
        };
        CyberVinciChatDomControlsContribution_1.prototype.renderControls = function () {
            var _a;
            var leftBars = Array.from(document.querySelectorAll('.chat-input-widget .theia-ChatInputOptions-left'));
            for (var _i = 0, leftBars_1 = leftBars; _i < leftBars_1.length; _i++) {
                var leftBar = leftBars_1[_i];
                var mount = leftBar.querySelector(':scope > .cybervinci-chat-experience-controls');
                if (mount && !this.roots.has(mount)) {
                    continue;
                }
                if (!mount) {
                    mount = document.createElement('span');
                    mount.className = 'cybervinci-chat-experience-controls';
                    leftBar.insertBefore(mount, leftBar.firstChild);
                }
                var flowMode = this.readFlowMode();
                if (this.lastFlowModes.get(mount) === flowMode && mount.childElementCount > 0) {
                    continue;
                }
                this.lastFlowModes.set(mount, flowMode);
                var root = (_a = this.roots.get(mount)) !== null && _a !== void 0 ? _a : (0, client_1.createRoot)(mount);
                this.roots.set(mount, root);
                root.render(<cybervinci_chat_input_options_contribution_1.CyberVinciChatExperienceControls service={this.experienceService} aiRuntimeService={this.aiRuntimeService} flowService={this.flowService} preferenceService={this.preferenceService} commandService={this.commandService} flowMode={flowMode} hoverService={this.hoverService}/>);
            }
        };
        CyberVinciChatDomControlsContribution_1.prototype.scheduleRenderControls = function () {
            var _this = this;
            if (this.renderScheduled) {
                return;
            }
            this.renderScheduled = true;
            window.requestAnimationFrame(function () {
                _this.renderScheduled = false;
                _this.renderControls();
            });
        };
        CyberVinciChatDomControlsContribution_1.prototype.readFlowMode = function () {
            return (0, cybervinci_chat_ai_execution_controls_1.normalizeCyberVinciFlowChatMode)(this.preferenceService.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_FLOW_MODE_PREF, 'chat'));
        };
        return CyberVinciChatDomControlsContribution_1;
    }());
    __setFunctionName(_classThis, "CyberVinciChatDomControlsContribution");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _experienceService_decorators = [(0, inversify_1.inject)(common_3.CyberVinciAiChatExperienceService)];
        _preferenceService_decorators = [(0, inversify_1.inject)(preferences_1.PreferenceService)];
        _commandService_decorators = [(0, inversify_1.inject)(core_1.CommandService)];
        _hoverService_decorators = [(0, inversify_1.inject)(browser_1.HoverService)];
        _flowService_decorators = [(0, inversify_1.inject)(common_2.FlowService), (0, inversify_1.optional)()];
        _aiRuntimeService_decorators = [(0, inversify_1.inject)(common_1.CyberVinciAiRuntimeService), (0, inversify_1.optional)()];
        __esDecorate(null, null, _experienceService_decorators, { kind: "field", name: "experienceService", static: false, private: false, access: { has: function (obj) { return "experienceService" in obj; }, get: function (obj) { return obj.experienceService; }, set: function (obj, value) { obj.experienceService = value; } }, metadata: _metadata }, _experienceService_initializers, _experienceService_extraInitializers);
        __esDecorate(null, null, _preferenceService_decorators, { kind: "field", name: "preferenceService", static: false, private: false, access: { has: function (obj) { return "preferenceService" in obj; }, get: function (obj) { return obj.preferenceService; }, set: function (obj, value) { obj.preferenceService = value; } }, metadata: _metadata }, _preferenceService_initializers, _preferenceService_extraInitializers);
        __esDecorate(null, null, _commandService_decorators, { kind: "field", name: "commandService", static: false, private: false, access: { has: function (obj) { return "commandService" in obj; }, get: function (obj) { return obj.commandService; }, set: function (obj, value) { obj.commandService = value; } }, metadata: _metadata }, _commandService_initializers, _commandService_extraInitializers);
        __esDecorate(null, null, _hoverService_decorators, { kind: "field", name: "hoverService", static: false, private: false, access: { has: function (obj) { return "hoverService" in obj; }, get: function (obj) { return obj.hoverService; }, set: function (obj, value) { obj.hoverService = value; } }, metadata: _metadata }, _hoverService_initializers, _hoverService_extraInitializers);
        __esDecorate(null, null, _flowService_decorators, { kind: "field", name: "flowService", static: false, private: false, access: { has: function (obj) { return "flowService" in obj; }, get: function (obj) { return obj.flowService; }, set: function (obj, value) { obj.flowService = value; } }, metadata: _metadata }, _flowService_initializers, _flowService_extraInitializers);
        __esDecorate(null, null, _aiRuntimeService_decorators, { kind: "field", name: "aiRuntimeService", static: false, private: false, access: { has: function (obj) { return "aiRuntimeService" in obj; }, get: function (obj) { return obj.aiRuntimeService; }, set: function (obj, value) { obj.aiRuntimeService = value; } }, metadata: _metadata }, _aiRuntimeService_initializers, _aiRuntimeService_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CyberVinciChatDomControlsContribution = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CyberVinciChatDomControlsContribution = _classThis;
}();
exports.CyberVinciChatDomControlsContribution = CyberVinciChatDomControlsContribution;
