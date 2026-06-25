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
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var flow_capabilities_1 = require("./flow-capabilities");
var flow_capability_resolution_1 = require("./flow-capability-resolution");
describe('Flow capability resolution', function () {
    it('accepts workflows that require capabilities provided by the current host adapter', function () {
        var resolution = (0, flow_capability_resolution_1.resolveFlowWorkflowCapabilities)(workflowWithCapabilities('workflow.file.source', 'visual.canvas', 'workload.kanban', 'run.event_stream', 'human.approval', 'memory.write.explicit', 'kernel.bridge.simulated', 'host.deterministic_fallback', 'filesystem.artifacts'), flow_capabilities_1.FLOW_CAPABILITIES);
        (0, chai_1.expect)(resolution.missing).to.deep.equal([]);
        (0, chai_1.expect)(resolution.provided).to.deep.equal(resolution.required);
    });
    it('reports unavailable host capabilities explicitly', function () {
        var resolution = (0, flow_capability_resolution_1.resolveFlowWorkflowCapabilities)(workflowWithCapabilities('llm.agent.execute', 'memory.context', 'filesystem.edit', 'image.generate', 'command.execute', 'kernel.bridge.external'), flow_capabilities_1.FLOW_CAPABILITIES);
        (0, chai_1.expect)(resolution.missing).to.deep.equal([
            'command.execute',
            'filesystem.edit',
            'image.generate',
            'kernel.bridge.external',
            'llm.agent.execute',
            'memory.context'
        ]);
        (0, chai_1.expect)((0, flow_capability_resolution_1.formatMissingCapabilities)(resolution.missing)).to.contain('llm.agent.execute');
    });
    it('formats missing capability diagnostics with capability, affected state, host, execution mode, and action', function () {
        var workflow = workflowWithCapabilities('command.execute');
        workflow.states.command_step = {
            type: 'command',
            command: 'npm test'
        };
        (0, chai_1.expect)((0, flow_capability_resolution_1.formatMissingCapabilities)(['command.execute'], {
            workflow: workflow,
            host: 'CyberVinci (simulated kernel bridge)',
            executionMode: 'kernel_simulated; demo=off; deterministicFallback=on'
        })).to.equal('Missing Flow host capability: command.execute '
            + '(states: command_step; host: CyberVinci (simulated kernel bridge); '
            + 'execution mode: kernel_simulated; demo=off; deterministicFallback=on; '
            + 'action: configure command execution policy with allowlisted commands/env/cwd, timeout, output redaction, and approvals).');
    });
    it('falls back to workflow when a missing capability has no specific affected state', function () {
        var workflow = workflowWithCapabilities('kernel.bridge.external');
        (0, chai_1.expect)((0, flow_capability_resolution_1.formatMissingCapabilities)(['kernel.bridge.external'], {
            workflow: workflow,
            host: 'CyberVinci (simulated kernel bridge)'
        })).to.equal('Missing Flow host capability: kernel.bridge.external '
            + '(states: workflow; host: CyberVinci (simulated kernel bridge); execution mode: unknown; '
            + 'action: start and select an external Flow Kernel bridge for this run).');
    });
    it('identifies states affected by capability-specific workload requirements', function () {
        var workflow = workflowWithCapabilities('filesystem.edit', 'image.generate', 'llm.agent.execute');
        workflow.states.agent_step = { type: 'agent', agent: 'builder' };
        workflow.states.file_step = {
            type: 'agent',
            effects: [{ type: 'file.edited', path: 'src/app.ts' }]
        };
        workflow.states.image_step = {
            type: 'agent',
            effects: [{ type: 'image.generate', artifactPath: 'images/hero.png' }]
        };
        (0, chai_1.expect)((0, flow_capability_resolution_1.affectedWorkflowStatesForCapability)(workflow, 'filesystem.edit')).to.deep.equal(['file_step']);
        (0, chai_1.expect)((0, flow_capability_resolution_1.affectedWorkflowStatesForCapability)(workflow, 'image.generate')).to.deep.equal(['image_step']);
        (0, chai_1.expect)((0, flow_capability_resolution_1.affectedWorkflowStatesForCapability)(workflow, 'llm.agent.execute')).to.deep.equal(['agent_step', 'file_step', 'image_step']);
    });
    it('deduplicates and sorts capability declarations for stable diagnostics', function () {
        var resolution = (0, flow_capability_resolution_1.resolveFlowWorkflowCapabilities)(workflowWithCapabilities('image.generate', 'human.approval', 'image.generate'), flow_capabilities_1.FLOW_CAPABILITIES);
        (0, chai_1.expect)(resolution.required).to.deep.equal(['human.approval', 'image.generate']);
        (0, chai_1.expect)(resolution.provided).to.deep.equal(['human.approval']);
        (0, chai_1.expect)(resolution.missing).to.deep.equal(['image.generate']);
    });
    it('accepts command.execute only when the host explicitly declares command execution', function () {
        var resolution = (0, flow_capability_resolution_1.resolveFlowWorkflowCapabilities)(workflowWithCapabilities('command.execute'), __assign(__assign({}, flow_capabilities_1.FLOW_CAPABILITIES), { commandExecution: true, commandExecutionPolicy: 'configured' }));
        (0, chai_1.expect)(resolution.provided).to.deep.equal(['command.execute']);
        (0, chai_1.expect)(resolution.missing).to.deep.equal([]);
    });
    it('accepts playbook.run only when the host binds a Playbook runner', function () {
        var workflow = workflowWithCapabilities('playbook.run');
        workflow.states.design_qa = {
            type: 'playbook',
            playbookId: 'canvas-design-qa'
        };
        var unavailable = (0, flow_capability_resolution_1.resolveFlowWorkflowCapabilities)(workflow, flow_capabilities_1.FLOW_CAPABILITIES);
        var available = (0, flow_capability_resolution_1.resolveFlowWorkflowCapabilities)(workflow, __assign(__assign({}, flow_capabilities_1.FLOW_CAPABILITIES), { playbookExecution: 'available' }));
        (0, chai_1.expect)(unavailable.provided).to.deep.equal([]);
        (0, chai_1.expect)(unavailable.missing).to.deep.equal(['playbook.run']);
        (0, chai_1.expect)(available.provided).to.deep.equal(['playbook.run']);
        (0, chai_1.expect)(available.missing).to.deep.equal([]);
        (0, chai_1.expect)((0, flow_capability_resolution_1.formatMissingCapabilities)(['playbook.run'], { workflow: workflow }))
            .to.equal('Missing Flow host capability: playbook.run (states: design_qa; host: current host; execution mode: unknown; action: bind a FlowPlaybookRunner host adapter before advertising playbook.run).');
    });
    it('identifies playbook states affected by playbook.run', function () {
        var workflow = workflowWithCapabilities('playbook.run');
        workflow.states.playbook_step = {
            type: 'playbook',
            playbookId: 'direct-chat'
        };
        (0, chai_1.expect)((0, flow_capability_resolution_1.affectedWorkflowStatesForCapability)(workflow, 'playbook.run')).to.deep.equal(['playbook_step']);
    });
    it('does not advertise command.execute as a real capability without a complete command policy path', function () {
        var resolution = (0, flow_capability_resolution_1.resolveFlowWorkflowCapabilities)(workflowWithCapabilities('command.execute'), __assign(__assign({}, flow_capabilities_1.FLOW_CAPABILITIES), { commandExecution: true }));
        (0, chai_1.expect)(resolution.provided).to.deep.equal([]);
        (0, chai_1.expect)(resolution.missing).to.deep.equal(['command.execute']);
    });
    it('keeps command.execute blocked by default even when other real host capabilities are available', function () {
        var resolution = (0, flow_capability_resolution_1.resolveFlowWorkflowCapabilities)(workflowWithCapabilities('llm.agent.execute', 'command.execute'), __assign(__assign({}, flow_capabilities_1.FLOW_CAPABILITIES), { llmAgentExecution: 'available', llmAgentProvider: 'configured', deterministicFallback: false }));
        (0, chai_1.expect)(resolution.provided).to.deep.equal(['llm.agent.execute']);
        (0, chai_1.expect)(resolution.missing).to.deep.equal(['command.execute']);
    });
    it('resolves hosts with partial capabilities without treating unrelated capabilities as missing', function () {
        var resolution = (0, flow_capability_resolution_1.resolveFlowWorkflowCapabilities)(workflowWithCapabilities('command.execute', 'human.approval', 'kernel.bridge.external', 'memory.context.local', 'run.event_stream'), __assign(__assign({}, flow_capabilities_1.FLOW_CAPABILITIES), { commandExecution: true, commandExecutionPolicy: 'configured', kernelBridge: 'external', memoryAdapter: true, memoryProvider: 'missing', runEventStream: false }));
        (0, chai_1.expect)(resolution.provided).to.deep.equal([
            'command.execute',
            'human.approval',
            'kernel.bridge.external',
            'memory.context.local'
        ]);
        (0, chai_1.expect)(resolution.missing).to.deep.equal(['run.event_stream']);
    });
    it('does not allow deterministic fallback to satisfy real provider capabilities', function () {
        var resolution = (0, flow_capability_resolution_1.resolveFlowWorkflowCapabilities)(workflowWithCapabilities('llm.agent.execute', 'host.deterministic_fallback', 'memory.context', 'memory.context.local', 'memory.write.provider', 'memory.write.explicit', 'kernel.bridge.simulated'), __assign(__assign({}, flow_capabilities_1.FLOW_CAPABILITIES), { memoryAdapter: true, memoryProvider: 'missing', explicitMemoryWrites: true, kernelBridge: 'simulated' }));
        (0, chai_1.expect)(resolution.provided).to.deep.equal([
            'host.deterministic_fallback',
            'kernel.bridge.simulated',
            'memory.context.local',
            'memory.write.explicit'
        ]);
        (0, chai_1.expect)(resolution.missing).to.deep.equal([
            'llm.agent.execute',
            'memory.context',
            'memory.write.provider'
        ]);
    });
    it('requires explicit real providers and complete policies for real host capabilities', function () {
        var resolution = (0, flow_capability_resolution_1.resolveFlowWorkflowCapabilities)(workflowWithCapabilities('llm.agent.execute', 'filesystem.edit', 'image.generate', 'command.execute', 'memory.context'), __assign(__assign({}, flow_capabilities_1.FLOW_CAPABILITIES), { llmAgentExecution: 'available', llmAgentProvider: 'configured', filesystemEdit: 'available', filesystemEditPolicy: 'configured', imageGeneration: 'available', imageProvider: 'configured', commandExecution: true, commandExecutionPolicy: 'configured', memoryAdapter: true, memoryProvider: 'external', deterministicFallback: false, kernelBridge: 'external' }));
        (0, chai_1.expect)(resolution.provided).to.deep.equal([
            'command.execute',
            'filesystem.edit',
            'image.generate',
            'llm.agent.execute',
            'memory.context'
        ]);
        (0, chai_1.expect)(resolution.missing).to.deep.equal([]);
    });
    it('allows configured real providers even when the kernel bridge is simulated', function () {
        var resolution = (0, flow_capability_resolution_1.resolveFlowWorkflowCapabilities)(workflowWithCapabilities('llm.agent.execute', 'filesystem.edit', 'image.generate', 'host.deterministic_fallback'), __assign(__assign({}, flow_capabilities_1.FLOW_CAPABILITIES), { llmAgentExecution: 'available', llmAgentProvider: 'configured', filesystemEdit: 'available', filesystemEditPolicy: 'configured', imageGeneration: 'available', imageProvider: 'configured', deterministicFallback: true, demoMode: 'off' }));
        (0, chai_1.expect)(resolution.provided).to.deep.equal([
            'filesystem.edit',
            'host.deterministic_fallback',
            'image.generate',
            'llm.agent.execute'
        ]);
        (0, chai_1.expect)(resolution.missing).to.deep.equal([]);
    });
    it('requires a configured image provider before advertising image.generate', function () {
        var resolution = (0, flow_capability_resolution_1.resolveFlowWorkflowCapabilities)(workflowWithCapabilities('filesystem.edit', 'image.generate'), __assign(__assign({}, flow_capabilities_1.FLOW_CAPABILITIES), { filesystemEdit: 'available', filesystemEditPolicy: 'configured', imageGeneration: 'available', imageProvider: 'missing', deterministicFallback: false }));
        (0, chai_1.expect)(resolution.provided).to.deep.equal(['filesystem.edit']);
        (0, chai_1.expect)(resolution.missing).to.deep.equal(['image.generate']);
    });
    it('requires Memory provider presence for memory.context', function () {
        var resolution = (0, flow_capability_resolution_1.resolveFlowWorkflowCapabilities)(workflowWithCapabilities('memory.context', 'memory.context.local', 'memory.write.provider', 'memory.write.explicit'), __assign(__assign({}, flow_capabilities_1.FLOW_CAPABILITIES), { memoryAdapter: false, memoryProvider: 'missing', explicitMemoryWrites: true }));
        (0, chai_1.expect)(resolution.provided).to.deep.equal(['memory.write.explicit']);
        (0, chai_1.expect)(resolution.missing).to.deep.equal([
            'memory.context',
            'memory.context.local',
            'memory.write.provider'
        ]);
    });
    it('does not advertise real host capabilities from partial dynamic fields', function () {
        var workflow = workflowWithCapabilities('llm.agent.execute', 'filesystem.edit', 'image.generate', 'command.execute');
        var missingExecutionSide = (0, flow_capability_resolution_1.resolveFlowWorkflowCapabilities)(workflow, __assign(__assign({}, flow_capabilities_1.FLOW_CAPABILITIES), { llmAgentProvider: 'configured', filesystemEditPolicy: 'configured', imageProvider: 'configured', commandExecutionPolicy: 'configured' }));
        var missingProviderOrPolicySide = (0, flow_capability_resolution_1.resolveFlowWorkflowCapabilities)(workflow, __assign(__assign({}, flow_capabilities_1.FLOW_CAPABILITIES), { llmAgentExecution: 'available', filesystemEdit: 'available', imageGeneration: 'available', commandExecution: true }));
        (0, chai_1.expect)(missingExecutionSide.provided).to.deep.equal([]);
        (0, chai_1.expect)(missingExecutionSide.missing).to.deep.equal([
            'command.execute',
            'filesystem.edit',
            'image.generate',
            'llm.agent.execute'
        ]);
        (0, chai_1.expect)(missingProviderOrPolicySide.provided).to.deep.equal([]);
        (0, chai_1.expect)(missingProviderOrPolicySide.missing).to.deep.equal(missingExecutionSide.missing);
    });
    it('keeps mock agent execution separate from real LLM capability', function () {
        var resolution = (0, flow_capability_resolution_1.resolveFlowWorkflowCapabilities)(workflowWithCapabilities('llm.agent.execute', 'llm.agent.execute.mock', 'llm.agent.execute.e2e_mock', 'host.demo_mode.e2e', 'host.demo_mode.demo', 'host.demo_mode'), __assign(__assign({}, flow_capabilities_1.FLOW_CAPABILITIES), { llmAgentExecution: 'mock', llmAgentProvider: 'mock', demoMode: 'e2e' }));
        (0, chai_1.expect)(resolution.provided).to.deep.equal([
            'host.demo_mode',
            'host.demo_mode.e2e',
            'llm.agent.execute.e2e_mock',
            'llm.agent.execute.mock'
        ]);
        (0, chai_1.expect)(resolution.missing).to.deep.equal([
            'host.demo_mode.demo',
            'llm.agent.execute'
        ]);
    });
    it('formats actionable errors for partial hosts when fallback is prohibited', function () {
        var workflow = workflowWithCapabilities('llm.agent.execute', 'memory.context');
        workflow.states.architect = { type: 'agent', agent: 'architect' };
        workflow.states.context_pack = { type: 'context' };
        (0, chai_1.expect)((0, flow_capability_resolution_1.formatMissingCapabilities)(['llm.agent.execute', 'memory.context'], {
            workflow: workflow,
            host: 'VS Code portable host (deterministic fallback only)',
            executionMode: 'kernel_simulated; demo=off; deterministicFallback=on'
        })).to.equal('Missing Flow host capabilities: '
            + 'llm.agent.execute (states: architect; host: VS Code portable host (deterministic fallback only); '
            + 'execution mode: kernel_simulated; demo=off; deterministicFallback=on; '
            + 'action: configure a real LLM provider/model for Flow or require llm.agent.execute.mock in explicit demo/e2e mode); '
            + 'memory.context (states: context_pack; host: VS Code portable host (deterministic fallback only); '
            + 'execution mode: kernel_simulated; demo=off; deterministicFallback=on; '
            + 'action: connect a local or external Memory adapter that can build scoped context packs).');
    });
});
function workflowWithCapabilities() {
    var capabilities = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        capabilities[_i] = arguments[_i];
    }
    return {
        version: 'flow.workflow/v1',
        id: 'capability_workflow',
        name: 'Capability Workflow',
        requires: { capabilities: capabilities },
        states: {
            input: { type: 'input' }
        },
        transitions: []
    };
}
