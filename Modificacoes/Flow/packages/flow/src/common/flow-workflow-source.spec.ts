import { expect } from 'chai';
import {
    FlowWorkflow,
    compareFlowWorkflowStructure,
    formatWorkflowSource,
    parseWorkflowSource,
    validateFlowWorkflow
} from './index';

describe('Flow workflow source editor contracts', () => {

    it('round-trips YAML editor content while preserving workflow file metadata', () => {
        const workflow = sampleWorkflow({
            file: {
                path: '/workspace/.theia/flow/workflows/source.yaml',
                uri: 'file:///workspace/.theia/flow/workflows/source.yaml',
                format: 'yaml',
                editable: true,
                updatedAt: '2026-05-20T00:00:00.000Z'
            },
            states: {
                intake: { type: 'input' },
                build: {
                    type: 'agent',
                    agent: 'architect',
                    provider: {
                        providerId: 'openai',
                        modelId: 'gpt-5',
                        options: { temperature: 0.1 }
                    },
                    systemPrompt: 'You are an implementation planner.',
                    taskPrompt: 'Draft the implementation steps.',
                    outputs: ['reports/build.md'],
                    deliverables: [
                        {
                            path: 'reports/build.md',
                            description: 'Build summary',
                            required: true,
                            kind: 'markdown'
                        }
                    ]
                }
            },
            transitions: [
                { from: 'intake', to: 'build', on: 'run.started' }
            ]
        });

        const source = formatWorkflowSource(workflow);
        const parsed = parseWorkflowSource(source.replace('Source Workflow', 'Edited YAML Workflow'), workflow);

        expect(source).to.contain('version: flow.workflow/v1');
        expect(source).not.to.contain('file:');
        expect(parsed.name).to.equal('Edited YAML Workflow');
        expect(parsed.file).to.deep.equal(workflow.file);
        expect(parsed.states.build.provider).to.deep.equal(workflow.states.build.provider);
        expect(parsed.states.build.deliverables).to.deep.equal(workflow.states.build.deliverables);
    });

    it('round-trips JSON editor content while preserving workflow file metadata', () => {
        const workflow = sampleWorkflow({
            file: {
                path: '/workspace/.theia/flow/workflows/source.json',
                uri: 'file:///workspace/.theia/flow/workflows/source.json',
                format: 'json',
                editable: true,
                updatedAt: '2026-05-20T00:00:00.000Z'
            },
            states: {
                intake: { type: 'input' },
                build: {
                    type: 'agent',
                    agent: 'architect',
                    provider: {
                        providerId: 'anthropic',
                        modelId: 'claude-sonnet-4',
                        options: { maxTokens: 2048 }
                    },
                    systemPrompt: 'You are an implementation planner.',
                    taskPrompt: 'Draft the implementation steps.',
                    outputs: ['reports/build.json'],
                    deliverables: [
                        {
                            path: 'reports/build.json',
                            description: 'Build summary',
                            required: false,
                            kind: 'json'
                        }
                    ]
                }
            },
            transitions: [
                { from: 'intake', to: 'build', on: 'run.started' }
            ]
        });

        const source = formatWorkflowSource(workflow);
        const parsed = parseWorkflowSource(source.replace('Source Workflow', 'Edited JSON Workflow'), workflow);

        expect(source).to.contain('\n  "version": "flow.workflow/v1",\n');
        expect(source).not.to.contain('"file"');
        expect(parsed.name).to.equal('Edited JSON Workflow');
        expect(parsed.file).to.deep.equal(workflow.file);
        expect(parsed.states.build.provider).to.deep.equal(workflow.states.build.provider);
        expect(parsed.states.build.deliverables).to.deep.equal(workflow.states.build.deliverables);
    });

    it('reports structural diff between file workflow and canvas workflow edits', () => {
        const fileWorkflow = sampleWorkflow();
        const canvasWorkflow: FlowWorkflow = {
            ...fileWorkflow,
            agents: {
                architect: 'agents/architect.md',
                qa: 'agents/qa.md'
            },
            states: {
                ...fileWorkflow.states,
                build: { type: 'agent', agent: 'architect', outputs: ['build/result.md'] }
            },
            transitions: [
                { id: 'intake_to_build', from: 'intake', to: 'build', on: 'run.started', guard: { 'artifact.exists': 'input/request.md' } }
            ],
            requires: {
                capabilities: ['llm.agent.execute']
            },
            templateId: 'contracted_parallel_delivery'
        };

        const diff = compareFlowWorkflowStructure(fileWorkflow, canvasWorkflow);

        expect(diff.items).to.deep.include({ kind: 'agent', change: 'added', id: 'qa', summary: 'agents/qa.md' });
        expect(diff.items).to.deep.include({ kind: 'capability', change: 'added', id: 'llm.agent.execute', summary: 'true' });
        expect(diff.items).to.deep.include({ kind: 'template', change: 'added', id: 'templateId', summary: 'contracted_parallel_delivery' });
        expect(diff.items).to.deep.include({ kind: 'state', change: 'added', id: 'build', summary: 'agent' });
        expect(diff.items).to.deep.include({ kind: 'transition', change: 'added', id: 'intake_to_build', summary: 'intake -> build' });
        expect(diff.items).to.deep.include({ kind: 'guard', change: 'added', id: 'intake_to_build', summary: 'artifact.exists' });
    });

    it('keeps a newly declared Markdown agent valid when referenced by a workflow state', () => {
        const workflow = sampleWorkflow({
            agents: {
                builder: 'agents/builder.md'
            },
            states: {
                intake: { type: 'input' },
                build: { type: 'agent', agent: 'builder', outputs: ['build/result.md'] }
            },
            transitions: [
                { id: 'intake_to_build', from: 'intake', to: 'build', on: 'run.started' }
            ]
        });

        const validation = validateFlowWorkflow(workflow);

        expect(validation.valid).to.equal(true);
        expect(validation.warnings.map(warning => warning.code)).not.to.include('state.agent.reference.missing');
    });

    it('detects an edited Markdown agent reference that is absent from workflow agents', () => {
        const workflow = sampleWorkflow({
            agents: {
                builder: 'agents/builder.md'
            },
            states: {
                intake: { type: 'input' },
                build: { type: 'agent', agent: 'reviewer', outputs: ['build/result.md'] }
            },
            transitions: [
                { id: 'intake_to_build', from: 'intake', to: 'build', on: 'run.started' }
            ]
        });

        const validation = validateFlowWorkflow(workflow);

        expect(validation.valid).to.equal(true);
        expect(validation.warnings).to.deep.include({
            code: 'state.agent.reference.missing',
            message: 'Agent state "build" references missing workflow agent "reviewer".',
            path: 'states.build.agent'
        });
    });

    it('detects a missing referenced agent after parsing source from the editor', () => {
        const currentWorkflow = sampleWorkflow({
            file: {
                path: '/workspace/.theia/flow/workflows/source.json',
                uri: 'file:///workspace/.theia/flow/workflows/source.json',
                format: 'json',
                editable: true,
                updatedAt: '2026-05-20T00:00:00.000Z'
            }
        });
        const parsed = parseWorkflowSource(JSON.stringify({
            ...currentWorkflow,
            file: undefined,
            agents: { architect: 'agents/architect.md' },
            states: {
                intake: { type: 'input' },
                build: { type: 'agent', agent: 'missing_agent' }
            },
            transitions: [{ from: 'intake', to: 'build', on: 'run.started' }]
        }), currentWorkflow);

        const validation = validateFlowWorkflow(parsed);

        expect(validation.warnings.map(warning => warning.code)).to.include('state.agent.reference.missing');
    });
});

function sampleWorkflow(overrides: Partial<FlowWorkflow> = {}): FlowWorkflow {
    return {
        version: 'flow.workflow/v1',
        id: 'source_workflow',
        name: 'Source Workflow',
        agents: {
            architect: 'agents/architect.md'
        },
        states: {
            intake: { type: 'input' }
        },
        transitions: [],
        ...overrides
    };
}
