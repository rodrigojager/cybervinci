"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLOW_CAPABILITIES = void 0;
exports.FLOW_CAPABILITIES = {
    workflowFileSource: true,
    visualCanvas: true,
    workloadKanban: true,
    runEventStream: true,
    humanGates: true,
    runLifecycleControls: true,
    llmAgentExecution: 'unavailable',
    llmAgentProvider: 'missing',
    filesystemEdit: 'blocked',
    filesystemEditPolicy: 'missing',
    imageGeneration: 'unavailable',
    imageProvider: 'missing',
    commandExecution: false,
    commandExecutionPolicy: 'blocked',
    memoryAdapter: true,
    memoryProvider: 'missing',
    explicitMemoryWrites: true,
    demoMode: 'off',
    kernelBridge: 'simulated',
    deterministicFallback: true,
    deterministicFallbackReason: 'No external Flow Kernel is confirmed; host uses deterministic local simulation and does not satisfy real provider/effect capabilities.'
};
