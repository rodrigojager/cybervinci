import { expect } from 'chai';
import { deriveFlowCanvasModel } from './flow-derivation';
import {
    getFlowWorkflowTemplate,
    instantiateFlowWorkflowTemplate,
    listFlowWorkflowTemplates
} from './flow-templates';
import { FlowWorkflowState } from './flow-types';
import { validateFlowWorkflow } from './flow-validation';

describe('Flow workflow templates', () => {

    it('provides the initial deterministic template library', () => {
        const templates = listFlowWorkflowTemplates();

        expect(templates.map(template => template.id)).to.deep.equal([
            'simple_specialist',
            'linear_chain',
            'review_loop',
            'contracted_parallel_delivery',
            'content_factory',
            'conditional_contract',
            'human_approval_gate',
            'memory_consolidation'
        ]);
    });

    for (const template of listFlowWorkflowTemplates()) {
        it(`validates and derives a canvas for ${template.id}`, () => {
            const validation = validateFlowWorkflow(template.workflow);
            const canvas = deriveFlowCanvasModel(template.workflow);
            const agentStates = allStates(template.workflow.states).filter(state => state.type === 'agent');

            expect(validation.valid, validation.errors.map(error => error.message).join('\n')).to.equal(true);
            expect(template.workflow.version).to.equal('flow.workflow/v1');
            expect(canvas.nodes.length).to.be.greaterThan(0);
            expect(canvas.edges.length).to.equal(template.workflow.transitions.length);
            expect(agentStates.length).to.be.greaterThan(0);
            expect(Object.values(template.workflow.agents || {})).to.satisfy((paths: string[]) => paths.every(path => path.endsWith('.md')));
            expect(agentStates.map(state => state.agent)).to.satisfy((agentIds: Array<string | undefined>) => agentIds.every(Boolean));
            expect(template.workflow.requires?.capabilities).to.satisfy((capabilities: string[] | undefined) => Array.isArray(capabilities) && capabilities.length > 0);
        });
    }

    it('declares required host capabilities for templates that use agents, gates, effects, or Memory', () => {
        const requiredCapabilities = Object.fromEntries(listFlowWorkflowTemplates().map(template => [
            template.id,
            template.workflow.requires?.capabilities
        ]));

        expect(requiredCapabilities).to.deep.equal({
            simple_specialist: ['llm.agent.execute', 'filesystem.artifacts'],
            linear_chain: ['llm.agent.execute', 'filesystem.artifacts'],
            review_loop: ['llm.agent.execute', 'filesystem.artifacts'],
            contracted_parallel_delivery: [
                'llm.agent.execute',
                'memory.context',
                'human.approval',
                'filesystem.edit',
                'image.generate',
                'filesystem.artifacts'
            ],
            content_factory: ['llm.agent.execute', 'filesystem.artifacts'],
            conditional_contract: ['llm.agent.execute', 'filesystem.edit', 'filesystem.artifacts'],
            human_approval_gate: ['llm.agent.execute', 'human.approval', 'filesystem.edit', 'filesystem.artifacts'],
            memory_consolidation: [
                'llm.agent.execute',
                'memory.context',
                'human.approval',
                'memory.write.explicit',
                'memory.write.provider',
                'filesystem.artifacts'
            ]
        });
    });

    it('keeps conditional contract routing explicit and guard driven', () => {
        const template = getFlowWorkflowTemplate('conditional_contract');

        expect(template?.workflow.states.contract_design?.outputs).to.include.members([
            'contracts/work-orders/backend.md',
            'contracts/work-orders/frontend.md',
            'contracts/work-orders/designer.md',
            'contracts/work-orders/qa.md'
        ]);
        expect(template?.workflow.transitions.find(transition => transition.id === 'planning_to_contract_design')?.guard).to.deep.equal({
            'signal.equals': { key: 'planning.needs_parallel_contract', value: true }
        });
        expect(template?.workflow.transitions.find(transition => transition.id === 'planning_to_implementation')?.guard).to.deep.equal({
            'signal.equals': { key: 'planning.needs_parallel_contract', value: false }
        });
    });

    it('keeps contract design mandatory only for the dependent parallel delivery template', () => {
        const template = getFlowWorkflowTemplate('contracted_parallel_delivery');

        expect(template?.workflow.states.contract_design?.type).to.equal('agent');
        expect(template?.workflow.states.parallel_delivery?.type).to.equal('parallel');
        expect(template?.workflow.transitions.find(transition => transition.id === 'architecture_to_contract_design')).to.deep.include({
            from: 'architecture',
            to: 'contract_design',
            on: 'workload.completed'
        });
        expect(template?.workflow.transitions.find(transition => transition.id === 'contract_design_to_contract_gate')?.guard).to.deep.equal({
            all: [
                { 'artifact.exists': 'contracts/contracts.json' },
                { 'artifact.validates': { path: 'contracts/contracts.json', schema: 'contracts.schema.json' } }
            ]
        });
        expect(template?.workflow.states.qa?.input?.include).to.include.members([
            'contracts/contracts.json',
            'contracts/work-orders/qa.md'
        ]);
        expect(getFlowWorkflowTemplate('conditional_contract')?.workflow.transitions.find(transition => transition.id === 'planning_to_contract_design')?.guard).to.deep.equal({
            'signal.equals': { key: 'planning.needs_parallel_contract', value: true }
        });
    });

    it('bounds review and repair loops with explicit guards', () => {
        const reviewLoop = getFlowWorkflowTemplate('review_loop');
        const parallelDelivery = getFlowWorkflowTemplate('contracted_parallel_delivery');

        expect(reviewLoop?.workflow.transitions.find(transition => transition.id === 'reviewer_failed_to_repair')?.guard).to.deep.equal({
            all: [
                { 'signal.equals': { key: 'review.status', value: 'failed' } },
                { 'loop.lt': { counter: 'repair', max: 2 } }
            ]
        });
        expect(parallelDelivery?.workflow.transitions.find(transition => transition.id === 'qa_failed_to_repair_loop')?.guard).to.deep.equal({
            all: [
                { 'signal.equals': { key: 'qa.status', value: 'failed' } },
                { 'loop.lt': { counter: 'qa_repair', max: 1 } }
            ]
        });
    });

    it('instantiates templates with a new workflow id and name without mutating the source', () => {
        const workflow = instantiateFlowWorkflowTemplate('simple_specialist', {
            id: 'custom_workflow',
            name: 'Custom Workflow',
            description: 'Custom description'
        });
        workflow.states.input.outputs = ['changed.md'];

        const source = getFlowWorkflowTemplate('simple_specialist');

        expect(workflow.id).to.equal('custom_workflow');
        expect(workflow.name).to.equal('Custom Workflow');
        expect(workflow.description).to.equal('Custom description');
        expect(source?.workflow.states.input.outputs).to.deep.equal(['input/request.md']);
    });
});

function allStates(states: Record<string, FlowWorkflowState>): FlowWorkflowState[] {
    return Object.values(states).flatMap(state => [state, ...Object.values(state.branches || {})]);
}
