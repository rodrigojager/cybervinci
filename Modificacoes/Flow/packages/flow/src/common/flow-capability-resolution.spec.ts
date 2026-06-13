import { expect } from 'chai';
import { FLOW_CAPABILITIES } from './flow-capabilities';
import { affectedWorkflowStatesForCapability, formatMissingCapabilities, resolveFlowWorkflowCapabilities } from './flow-capability-resolution';
import { FlowWorkflow } from './flow-types';

describe('Flow capability resolution', () => {

    it('accepts workflows that require capabilities provided by the current host adapter', () => {
        const resolution = resolveFlowWorkflowCapabilities(workflowWithCapabilities(
            'workflow.file.source',
            'visual.canvas',
            'workload.kanban',
            'run.event_stream',
            'human.approval',
            'memory.write.explicit',
            'kernel.bridge.simulated',
            'host.deterministic_fallback',
            'filesystem.artifacts'
        ), FLOW_CAPABILITIES);

        expect(resolution.missing).to.deep.equal([]);
        expect(resolution.provided).to.deep.equal(resolution.required);
    });

    it('reports unavailable host capabilities explicitly', () => {
        const resolution = resolveFlowWorkflowCapabilities(workflowWithCapabilities(
            'llm.agent.execute',
            'memory.context',
            'filesystem.edit',
            'image.generate',
            'command.execute',
            'kernel.bridge.external'
        ), FLOW_CAPABILITIES);

        expect(resolution.missing).to.deep.equal([
            'command.execute',
            'filesystem.edit',
            'image.generate',
            'kernel.bridge.external',
            'llm.agent.execute',
            'memory.context'
        ]);
        expect(formatMissingCapabilities(resolution.missing)).to.contain('llm.agent.execute');
    });

    it('formats missing capability diagnostics with capability, affected state, host, execution mode, and action', () => {
        const workflow = workflowWithCapabilities('command.execute');
        workflow.states.command_step = {
            type: 'command',
            command: 'npm test'
        };

        expect(formatMissingCapabilities(['command.execute'], {
            workflow,
            host: 'CyberVinci (simulated kernel bridge)',
            executionMode: 'kernel_simulated; demo=off; deterministicFallback=on'
        })).to.equal(
            'Missing Flow host capability: command.execute '
            + '(states: command_step; host: CyberVinci (simulated kernel bridge); '
            + 'execution mode: kernel_simulated; demo=off; deterministicFallback=on; '
            + 'action: configure command execution policy with allowlisted commands/env/cwd, timeout, output redaction, and approvals).'
        );
    });

    it('falls back to workflow when a missing capability has no specific affected state', () => {
        const workflow = workflowWithCapabilities('kernel.bridge.external');

        expect(formatMissingCapabilities(['kernel.bridge.external'], {
            workflow,
            host: 'CyberVinci (simulated kernel bridge)'
        })).to.equal(
            'Missing Flow host capability: kernel.bridge.external '
            + '(states: workflow; host: CyberVinci (simulated kernel bridge); execution mode: unknown; '
            + 'action: start and select an external Flow Kernel bridge for this run).'
        );
    });

    it('identifies states affected by capability-specific workload requirements', () => {
        const workflow = workflowWithCapabilities('filesystem.edit', 'image.generate', 'llm.agent.execute');
        workflow.states.agent_step = { type: 'agent', agent: 'builder' };
        workflow.states.file_step = {
            type: 'agent',
            effects: [{ type: 'file.edited', path: 'src/app.ts' }]
        };
        workflow.states.image_step = {
            type: 'agent',
            effects: [{ type: 'image.generate', artifactPath: 'images/hero.png' }]
        };

        expect(affectedWorkflowStatesForCapability(workflow, 'filesystem.edit')).to.deep.equal(['file_step']);
        expect(affectedWorkflowStatesForCapability(workflow, 'image.generate')).to.deep.equal(['image_step']);
        expect(affectedWorkflowStatesForCapability(workflow, 'llm.agent.execute')).to.deep.equal(['agent_step', 'file_step', 'image_step']);
    });

    it('deduplicates and sorts capability declarations for stable diagnostics', () => {
        const resolution = resolveFlowWorkflowCapabilities(workflowWithCapabilities(
            'image.generate',
            'human.approval',
            'image.generate'
        ), FLOW_CAPABILITIES);

        expect(resolution.required).to.deep.equal(['human.approval', 'image.generate']);
        expect(resolution.provided).to.deep.equal(['human.approval']);
        expect(resolution.missing).to.deep.equal(['image.generate']);
    });

    it('accepts command.execute only when the host explicitly declares command execution', () => {
        const resolution = resolveFlowWorkflowCapabilities(workflowWithCapabilities(
            'command.execute'
        ), {
            ...FLOW_CAPABILITIES,
            commandExecution: true,
            commandExecutionPolicy: 'configured'
        });

        expect(resolution.provided).to.deep.equal(['command.execute']);
        expect(resolution.missing).to.deep.equal([]);
    });

    it('does not advertise command.execute as a real capability without a complete command policy path', () => {
        const resolution = resolveFlowWorkflowCapabilities(workflowWithCapabilities(
            'command.execute'
        ), {
            ...FLOW_CAPABILITIES,
            commandExecution: true
        });

        expect(resolution.provided).to.deep.equal([]);
        expect(resolution.missing).to.deep.equal(['command.execute']);
    });

    it('keeps command.execute blocked by default even when other real host capabilities are available', () => {
        const resolution = resolveFlowWorkflowCapabilities(workflowWithCapabilities(
            'llm.agent.execute',
            'command.execute'
        ), {
            ...FLOW_CAPABILITIES,
            llmAgentExecution: 'available',
            llmAgentProvider: 'configured',
            deterministicFallback: false
        });

        expect(resolution.provided).to.deep.equal(['llm.agent.execute']);
        expect(resolution.missing).to.deep.equal(['command.execute']);
    });

    it('resolves hosts with partial capabilities without treating unrelated capabilities as missing', () => {
        const resolution = resolveFlowWorkflowCapabilities(workflowWithCapabilities(
            'command.execute',
            'human.approval',
            'kernel.bridge.external',
            'memory.context.local',
            'run.event_stream'
        ), {
            ...FLOW_CAPABILITIES,
            commandExecution: true,
            commandExecutionPolicy: 'configured',
            kernelBridge: 'external',
            memoryAdapter: true,
            memoryProvider: 'missing',
            runEventStream: false
        });

        expect(resolution.provided).to.deep.equal([
            'command.execute',
            'human.approval',
            'kernel.bridge.external',
            'memory.context.local'
        ]);
        expect(resolution.missing).to.deep.equal(['run.event_stream']);
    });

    it('does not allow deterministic fallback to satisfy real provider capabilities', () => {
        const resolution = resolveFlowWorkflowCapabilities(workflowWithCapabilities(
            'llm.agent.execute',
            'host.deterministic_fallback',
            'memory.context',
            'memory.context.local',
            'memory.write.provider',
            'memory.write.explicit',
            'kernel.bridge.simulated'
        ), {
            ...FLOW_CAPABILITIES,
            memoryAdapter: true,
            memoryProvider: 'missing',
            explicitMemoryWrites: true,
            kernelBridge: 'simulated'
        });

        expect(resolution.provided).to.deep.equal([
            'host.deterministic_fallback',
            'kernel.bridge.simulated',
            'memory.context.local',
            'memory.write.explicit'
        ]);
        expect(resolution.missing).to.deep.equal([
            'llm.agent.execute',
            'memory.context',
            'memory.write.provider'
        ]);
    });

    it('requires explicit real providers and complete policies for real host capabilities', () => {
        const resolution = resolveFlowWorkflowCapabilities(workflowWithCapabilities(
            'llm.agent.execute',
            'filesystem.edit',
            'image.generate',
            'command.execute',
            'memory.context'
        ), {
            ...FLOW_CAPABILITIES,
            llmAgentExecution: 'available',
            llmAgentProvider: 'configured',
            filesystemEdit: 'available',
            filesystemEditPolicy: 'configured',
            imageGeneration: 'available',
            imageProvider: 'configured',
            commandExecution: true,
            commandExecutionPolicy: 'configured',
            memoryAdapter: true,
            memoryProvider: 'external',
            deterministicFallback: false,
            kernelBridge: 'external'
        });

        expect(resolution.provided).to.deep.equal([
            'command.execute',
            'filesystem.edit',
            'image.generate',
            'llm.agent.execute',
            'memory.context'
        ]);
        expect(resolution.missing).to.deep.equal([]);
    });

    it('allows configured real providers even when the kernel bridge is simulated', () => {
        const resolution = resolveFlowWorkflowCapabilities(workflowWithCapabilities(
            'llm.agent.execute',
            'filesystem.edit',
            'image.generate',
            'host.deterministic_fallback'
        ), {
            ...FLOW_CAPABILITIES,
            llmAgentExecution: 'available',
            llmAgentProvider: 'configured',
            filesystemEdit: 'available',
            filesystemEditPolicy: 'configured',
            imageGeneration: 'available',
            imageProvider: 'configured',
            deterministicFallback: true,
            demoMode: 'off'
        });

        expect(resolution.provided).to.deep.equal([
            'filesystem.edit',
            'host.deterministic_fallback',
            'image.generate',
            'llm.agent.execute'
        ]);
        expect(resolution.missing).to.deep.equal([]);
    });

    it('requires a configured image provider before advertising image.generate', () => {
        const resolution = resolveFlowWorkflowCapabilities(workflowWithCapabilities(
            'filesystem.edit',
            'image.generate'
        ), {
            ...FLOW_CAPABILITIES,
            filesystemEdit: 'available',
            filesystemEditPolicy: 'configured',
            imageGeneration: 'available',
            imageProvider: 'missing',
            deterministicFallback: false
        });

        expect(resolution.provided).to.deep.equal(['filesystem.edit']);
        expect(resolution.missing).to.deep.equal(['image.generate']);
    });

    it('requires Memory provider presence for memory.context', () => {
        const resolution = resolveFlowWorkflowCapabilities(workflowWithCapabilities(
            'memory.context',
            'memory.context.local',
            'memory.write.provider',
            'memory.write.explicit'
        ), {
            ...FLOW_CAPABILITIES,
            memoryAdapter: false,
            memoryProvider: 'missing',
            explicitMemoryWrites: true
        });

        expect(resolution.provided).to.deep.equal(['memory.write.explicit']);
        expect(resolution.missing).to.deep.equal([
            'memory.context',
            'memory.context.local',
            'memory.write.provider'
        ]);
    });

    it('does not advertise real host capabilities from partial dynamic fields', () => {
        const workflow = workflowWithCapabilities(
            'llm.agent.execute',
            'filesystem.edit',
            'image.generate',
            'command.execute'
        );

        const missingExecutionSide = resolveFlowWorkflowCapabilities(workflow, {
            ...FLOW_CAPABILITIES,
            llmAgentProvider: 'configured',
            filesystemEditPolicy: 'configured',
            imageProvider: 'configured',
            commandExecutionPolicy: 'configured'
        });
        const missingProviderOrPolicySide = resolveFlowWorkflowCapabilities(workflow, {
            ...FLOW_CAPABILITIES,
            llmAgentExecution: 'available',
            filesystemEdit: 'available',
            imageGeneration: 'available',
            commandExecution: true
        });

        expect(missingExecutionSide.provided).to.deep.equal([]);
        expect(missingExecutionSide.missing).to.deep.equal([
            'command.execute',
            'filesystem.edit',
            'image.generate',
            'llm.agent.execute'
        ]);
        expect(missingProviderOrPolicySide.provided).to.deep.equal([]);
        expect(missingProviderOrPolicySide.missing).to.deep.equal(missingExecutionSide.missing);
    });

    it('keeps mock agent execution separate from real LLM capability', () => {
        const resolution = resolveFlowWorkflowCapabilities(workflowWithCapabilities(
            'llm.agent.execute',
            'llm.agent.execute.mock',
            'llm.agent.execute.e2e_mock',
            'host.demo_mode.e2e',
            'host.demo_mode.demo',
            'host.demo_mode'
        ), {
            ...FLOW_CAPABILITIES,
            llmAgentExecution: 'mock',
            llmAgentProvider: 'mock',
            demoMode: 'e2e'
        });

        expect(resolution.provided).to.deep.equal([
            'host.demo_mode',
            'host.demo_mode.e2e',
            'llm.agent.execute.e2e_mock',
            'llm.agent.execute.mock'
        ]);
        expect(resolution.missing).to.deep.equal([
            'host.demo_mode.demo',
            'llm.agent.execute'
        ]);
    });

    it('formats actionable errors for partial hosts when fallback is prohibited', () => {
        const workflow = workflowWithCapabilities('llm.agent.execute', 'memory.context');
        workflow.states.architect = { type: 'agent', agent: 'architect' };
        workflow.states.context_pack = { type: 'context' };

        expect(formatMissingCapabilities(['llm.agent.execute', 'memory.context'], {
            workflow,
            host: 'VS Code portable host (deterministic fallback only)',
            executionMode: 'kernel_simulated; demo=off; deterministicFallback=on'
        })).to.equal(
            'Missing Flow host capabilities: '
            + 'llm.agent.execute (states: architect; host: VS Code portable host (deterministic fallback only); '
            + 'execution mode: kernel_simulated; demo=off; deterministicFallback=on; '
            + 'action: configure a real LLM provider/model for Flow or require llm.agent.execute.mock in explicit demo/e2e mode); '
            + 'memory.context (states: context_pack; host: VS Code portable host (deterministic fallback only); '
            + 'execution mode: kernel_simulated; demo=off; deterministicFallback=on; '
            + 'action: connect a local or external Memory adapter that can build scoped context packs).'
        );
    });
});

function workflowWithCapabilities(...capabilities: string[]): FlowWorkflow {
    return {
        version: 'flow.workflow/v1',
        id: 'capability_workflow',
        name: 'Capability Workflow',
        requires: { capabilities },
        states: {
            input: { type: 'input' }
        },
        transitions: []
    };
}
