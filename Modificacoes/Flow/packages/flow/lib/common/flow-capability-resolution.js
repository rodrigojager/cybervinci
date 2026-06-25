"use strict";
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
exports.resolveFlowWorkflowCapabilities = resolveFlowWorkflowCapabilities;
exports.isCapabilityAvailable = isCapabilityAvailable;
exports.formatMissingCapabilities = formatMissingCapabilities;
exports.enablementActionForCapability = enablementActionForCapability;
exports.affectedWorkflowStatesForCapability = affectedWorkflowStatesForCapability;
function resolveFlowWorkflowCapabilities(workflow, capabilities) {
    var _a;
    var required = __spreadArray([], new Set(((_a = workflow.requires) === null || _a === void 0 ? void 0 : _a.capabilities) || []), true).sort();
    var provided = required.filter(function (capability) { return isCapabilityAvailable(capability, capabilities); });
    var missing = required.filter(function (capability) { return !provided.includes(capability); });
    return { required: required, provided: provided, missing: missing };
}
function isCapabilityAvailable(capability, capabilities) {
    switch (capability) {
        case 'workflow.file.source':
        case 'workflow.file.edit':
            return capabilities.workflowFileSource;
        case 'visual.canvas':
            return capabilities.visualCanvas;
        case 'workload.kanban':
            return capabilities.workloadKanban;
        case 'run.event_stream':
            return capabilities.runEventStream;
        case 'human.approval':
            return capabilities.humanGates;
        case 'run.lifecycle_controls':
            return capabilities.runLifecycleControls;
        case 'memory.context':
            return capabilities.memoryAdapter && capabilities.memoryProvider !== 'missing';
        case 'memory.context.local':
            return capabilities.memoryAdapter;
        case 'memory.write.explicit':
            return capabilities.explicitMemoryWrites;
        case 'memory.write.provider':
            return capabilities.explicitMemoryWrites && capabilities.memoryProvider !== 'missing';
        case 'host.demo_mode':
            return capabilities.demoMode !== 'off';
        case 'host.demo_mode.demo':
            return capabilities.demoMode === 'demo';
        case 'host.demo_mode.e2e':
            return capabilities.demoMode === 'e2e';
        case 'kernel.bridge.simulated':
            return capabilities.kernelBridge === 'simulated';
        case 'kernel.bridge.external':
            return capabilities.kernelBridge === 'external';
        case 'host.deterministic_fallback':
            return capabilities.deterministicFallback;
        case 'filesystem.artifacts':
            return true;
        case 'filesystem.edit':
            return hasRealFilesystemEditCapability(capabilities);
        case 'image.generate':
            return hasRealImageGenerationCapability(capabilities);
        case 'llm.agent.execute':
            return hasRealLlmAgentExecutionCapability(capabilities);
        case 'playbook.run':
            return capabilities.playbookExecution === 'available';
        case 'llm.agent.execute.mock':
        case 'llm.agent.execute.e2e_mock':
            return capabilities.demoMode !== 'off' && capabilities.llmAgentExecution === 'mock' && capabilities.llmAgentProvider === 'mock';
        case 'command.execute':
            return hasRealCommandExecutionCapability(capabilities);
        default:
            return false;
    }
}
function hasRealLlmAgentExecutionCapability(capabilities) {
    return capabilities.llmAgentExecution === 'available'
        && capabilities.llmAgentProvider === 'configured';
}
function hasRealFilesystemEditCapability(capabilities) {
    return capabilities.filesystemEdit === 'available'
        && capabilities.filesystemEditPolicy === 'configured';
}
function hasRealImageGenerationCapability(capabilities) {
    return capabilities.imageGeneration === 'available'
        && capabilities.imageProvider === 'configured';
}
function hasRealCommandExecutionCapability(capabilities) {
    return capabilities.commandExecution
        && capabilities.commandExecutionPolicy === 'configured';
}
function formatMissingCapabilities(missing, options) {
    var _a, _b;
    if (options === void 0) { options = {}; }
    var host = ((_a = options.host) === null || _a === void 0 ? void 0 : _a.trim()) || 'current host';
    var executionMode = ((_b = options.executionMode) === null || _b === void 0 ? void 0 : _b.trim()) || 'unknown';
    var details = missing.map(function (capability) {
        var affectedStates = options.workflow ? affectedWorkflowStatesForCapability(options.workflow, capability) : [];
        var affected = affectedStates.length > 0 ? affectedStates.join(', ') : 'workflow';
        return "".concat(capability, " (states: ").concat(affected, "; host: ").concat(host, "; execution mode: ").concat(executionMode, "; action: ").concat(enablementActionForCapability(capability), ")");
    });
    return missing.length === 1
        ? "Missing Flow host capability: ".concat(details[0], ".")
        : "Missing Flow host capabilities: ".concat(details.join('; '), ".");
}
function enablementActionForCapability(capability) {
    switch (capability) {
        case 'llm.agent.execute':
            return 'configure a real LLM provider/model for Flow or require llm.agent.execute.mock in explicit demo/e2e mode';
        case 'filesystem.edit':
            return 'enable the safe file-effect adapter with prepare/diff/approval/apply/audit policy';
        case 'image.generate':
            return 'configure an image provider and approval/audit flow before advertising image.generate';
        case 'command.execute':
            return 'configure command execution policy with allowlisted commands/env/cwd, timeout, output redaction, and approvals';
        case 'playbook.run':
            return 'bind a FlowPlaybookRunner host adapter before advertising playbook.run';
        case 'memory.context':
            return 'connect a local or external Memory adapter that can build scoped context packs';
        case 'memory.context.local':
            return 'connect the Memory adapter in this host';
        case 'memory.write.provider':
            return 'connect a memory provider through Memory and keep writes behind explicit approval';
        case 'memory.write.explicit':
            return 'enable the explicit memory-write review and approval flow';
        case 'human.approval':
            return 'enable human gate approval handling in the host';
        case 'kernel.bridge.external':
            return 'start and select an external Flow Kernel bridge for this run';
        case 'kernel.bridge.simulated':
            return 'select the simulated kernel bridge explicitly';
        case 'run.event_stream':
            return 'enable kernel run event streaming or the host event-driven equivalent';
        case 'run.lifecycle_controls':
            return 'enable run pause/resume/cancel controls in the host';
        case 'workflow.file.source':
        case 'workflow.file.edit':
            return 'open the workflow from an editable workflow file';
        case 'visual.canvas':
            return 'enable the Flow visual canvas host package';
        case 'workload.kanban':
            return 'enable workload kanban projection for Flow runs';
        case 'host.demo_mode':
        case 'host.demo_mode.demo':
        case 'host.demo_mode.e2e':
            return 'start Flow with explicit demo/e2e mock mode enabled';
        case 'host.deterministic_fallback':
            return 'allow deterministic fallback explicitly for this workflow';
        case 'filesystem.artifacts':
            return 'enable artifact storage for the current workspace';
        default:
            return "advertise ".concat(capability, " only after the host implements and configures it");
    }
}
function affectedWorkflowStatesForCapability(workflow, capability) {
    var affected = [];
    visitWorkflowStates(workflow.states, function (stateId, state) {
        if (stateRequiresCapability(state, capability)) {
            affected.push(stateId);
        }
    });
    return __spreadArray([], new Set(affected), true).sort();
}
function visitWorkflowStates(states, visitor) {
    for (var _i = 0, _a = Object.entries(states || {}); _i < _a.length; _i++) {
        var _b = _a[_i], stateId = _b[0], state = _b[1];
        visitor(state.id || stateId, state);
        visitWorkflowStates(state.branches, visitor);
    }
}
function stateRequiresCapability(state, capability) {
    var _a;
    switch (capability) {
        case 'llm.agent.execute':
            return state.type === 'agent';
        case 'playbook.run':
            return state.type === 'playbook';
        case 'command.execute':
            return state.type === 'command' || stateHasEffect(state, 'command.');
        case 'filesystem.edit':
            return stateHasEffect(state, 'file.');
        case 'image.generate':
            return stateHasEffect(state, 'image.');
        case 'human.approval':
            return state.type === 'gate' || Boolean((_a = state.gates) === null || _a === void 0 ? void 0 : _a.length);
        case 'memory.context':
        case 'memory.context.local':
            return state.type === 'context';
        case 'memory.write.explicit':
        case 'memory.write.provider':
            return state.type === 'memory_write' || stateHasEffect(state, 'memory.write');
        default:
            return false;
    }
}
function stateHasEffect(state, typePrefix) {
    var effects = state.effects;
    if (!Array.isArray(effects)) {
        return false;
    }
    return effects.some(function (effect) {
        if (!effect || typeof effect !== 'object') {
            return false;
        }
        var type = effect.type;
        return typeof type === 'string' && type.startsWith(typePrefix);
    });
}
