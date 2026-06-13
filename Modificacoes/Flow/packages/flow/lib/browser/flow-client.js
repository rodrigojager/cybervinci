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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlowClientImpl = void 0;
var inversify_1 = require("@theia/core/shared/inversify");
var FlowClientImpl = function () {
    var _classDecorators = [(0, inversify_1.injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var FlowClientImpl = _classThis = /** @class */ (function () {
        function FlowClientImpl_1() {
            this.runUpdateListeners = new Set();
            this.runErrorListeners = new Set();
        }
        FlowClientImpl_1.prototype.onRunUpdated = function (update) {
            for (var _i = 0, _a = this.runUpdateListeners; _i < _a.length; _i++) {
                var listener = _a[_i];
                listener(update);
            }
        };
        FlowClientImpl_1.prototype.onRunStreamError = function (error) {
            for (var _i = 0, _a = this.runErrorListeners; _i < _a.length; _i++) {
                var listener = _a[_i];
                listener(error);
            }
        };
        FlowClientImpl_1.prototype.onRunUpdate = function (listener) {
            var _this = this;
            this.runUpdateListeners.add(listener);
            return function () { return _this.runUpdateListeners.delete(listener); };
        };
        FlowClientImpl_1.prototype.onRunError = function (listener) {
            var _this = this;
            this.runErrorListeners.add(listener);
            return function () { return _this.runErrorListeners.delete(listener); };
        };
        return FlowClientImpl_1;
    }());
    __setFunctionName(_classThis, "FlowClientImpl");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        FlowClientImpl = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return FlowClientImpl = _classThis;
}();
exports.FlowClientImpl = FlowClientImpl;
