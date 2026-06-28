import { FlowCapabilities, FlowWorkflow } from './flow-types';

export interface FlowCapabilityResolution {
    required: string[];
    provided: string[];
    missing: string[];
}

export interface MissingCapabilityMessageOptions {
    workflow?: FlowWorkflow;
    host?: string;
    executionMode?: string;
}

export function resolveFlowWorkflowCapabilities(workflow: FlowWorkflow, capabilities: FlowCapabilities): FlowCapabilityResolution {
    const required = [...new Set(workflow.requires?.capabilities || [])].sort();
    const provided = required.filter(capability => isCapabilityAvailable(capability, capabilities));
    const missing = required.filter(capability => !provided.includes(capability));
    return { required, provided, missing };
}

export function isCapabilityAvailable(capability: string, capabilities: FlowCapabilities): boolean {
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

function hasRealLlmAgentExecutionCapability(capabilities: FlowCapabilities): boolean {
    return capabilities.llmAgentExecution === 'available'
        && capabilities.llmAgentProvider === 'configured';
}

function hasRealFilesystemEditCapability(capabilities: FlowCapabilities): boolean {
    return capabilities.filesystemEdit === 'available'
        && capabilities.filesystemEditPolicy === 'configured';
}

function hasRealImageGenerationCapability(capabilities: FlowCapabilities): boolean {
    return capabilities.imageGeneration === 'available'
        && capabilities.imageProvider === 'configured';
}

function hasRealCommandExecutionCapability(capabilities: FlowCapabilities): boolean {
    return capabilities.commandExecution
        && capabilities.commandExecutionPolicy === 'configured';
}

export function formatMissingCapabilities(missing: string[], options: MissingCapabilityMessageOptions = {}): string {
    const host = options.host?.trim() || 'current host';
    const executionMode = options.executionMode?.trim() || 'unknown';
    const details = missing.map(capability => {
        const affectedStates = options.workflow ? affectedWorkflowStatesForCapability(options.workflow, capability) : [];
        const affected = affectedStates.length > 0 ? affectedStates.join(', ') : 'workflow';
        return `${capability} (states: ${affected}; host: ${host}; execution mode: ${executionMode}; action: ${enablementActionForCapability(capability)})`;
    });
    return missing.length === 1
        ? `Missing Flow host capability: ${details[0]}.`
        : `Missing Flow host capabilities: ${details.join('; ')}.`;
}

export function enablementActionForCapability(capability: string): string {
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
            return `advertise ${capability} only after the host implements and configures it`;
    }
}

export function affectedWorkflowStatesForCapability(workflow: FlowWorkflow, capability: string): string[] {
    const affected: string[] = [];
    visitWorkflowStates(workflow.states, (stateId, state) => {
        if (stateRequiresCapability(state, capability)) {
            affected.push(stateId);
        }
    });
    return [...new Set(affected)].sort();
}

function visitWorkflowStates(states: FlowWorkflow['states'] | undefined, visitor: (stateId: string, state: FlowWorkflow['states'][string]) => void): void {
    for (const [stateId, state] of Object.entries(states || {})) {
        visitor(state.id || stateId, state);
        visitWorkflowStates(state.branches, visitor);
    }
}

function stateRequiresCapability(state: FlowWorkflow['states'][string], capability: string): boolean {
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
            return state.type === 'gate' || Boolean(state.gates?.length);
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

function stateHasEffect(state: FlowWorkflow['states'][string], typePrefix: string): boolean {
    const effects = state.effects;
    if (!Array.isArray(effects)) {
        return false;
    }
    return effects.some(effect => {
        if (!effect || typeof effect !== 'object') {
            return false;
        }
        const type = (effect as { type?: unknown }).type;
        return typeof type === 'string' && type.startsWith(typePrefix);
    });
}
