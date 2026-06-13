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
var index_1 = require("./index");
describe('Flow workflow source editor contracts', function () {
    it('round-trips YAML editor content while preserving workflow file metadata', function () {
        var workflow = sampleWorkflow({
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
        var source = (0, index_1.formatWorkflowSource)(workflow);
        var parsed = (0, index_1.parseWorkflowSource)(source.replace('Source Workflow', 'Edited YAML Workflow'), workflow);
        (0, chai_1.expect)(source).to.contain('version: flow.workflow/v1');
        (0, chai_1.expect)(source).not.to.contain('file:');
        (0, chai_1.expect)(parsed.name).to.equal('Edited YAML Workflow');
        (0, chai_1.expect)(parsed.file).to.deep.equal(workflow.file);
        (0, chai_1.expect)(parsed.states.build.provider).to.deep.equal(workflow.states.build.provider);
        (0, chai_1.expect)(parsed.states.build.deliverables).to.deep.equal(workflow.states.build.deliverables);
    });
    it('round-trips JSON editor content while preserving workflow file metadata', function () {
        var workflow = sampleWorkflow({
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
        var source = (0, index_1.formatWorkflowSource)(workflow);
        var parsed = (0, index_1.parseWorkflowSource)(source.replace('Source Workflow', 'Edited JSON Workflow'), workflow);
        (0, chai_1.expect)(source).to.contain('\n  "version": "flow.workflow/v1",\n');
        (0, chai_1.expect)(source).not.to.contain('"file"');
        (0, chai_1.expect)(parsed.name).to.equal('Edited JSON Workflow');
        (0, chai_1.expect)(parsed.file).to.deep.equal(workflow.file);
        (0, chai_1.expect)(parsed.states.build.provider).to.deep.equal(workflow.states.build.provider);
        (0, chai_1.expect)(parsed.states.build.deliverables).to.deep.equal(workflow.states.build.deliverables);
    });
    it('reports structural diff between file workflow and canvas workflow edits', function () {
        var fileWorkflow = sampleWorkflow();
        var canvasWorkflow = __assign(__assign({}, fileWorkflow), { agents: {
                architect: 'agents/architect.md',
                qa: 'agents/qa.md'
            }, states: __assign(__assign({}, fileWorkflow.states), { build: { type: 'agent', agent: 'architect', outputs: ['build/result.md'] } }), transitions: [
                { id: 'intake_to_build', from: 'intake', to: 'build', on: 'run.started', guard: { 'artifact.exists': 'input/request.md' } }
            ], requires: {
                capabilities: ['llm.agent.execute']
            }, templateId: 'contracted_parallel_delivery' });
        var diff = (0, index_1.compareFlowWorkflowStructure)(fileWorkflow, canvasWorkflow);
        (0, chai_1.expect)(diff.items).to.deep.include({ kind: 'agent', change: 'added', id: 'qa', summary: 'agents/qa.md' });
        (0, chai_1.expect)(diff.items).to.deep.include({ kind: 'capability', change: 'added', id: 'llm.agent.execute', summary: 'true' });
        (0, chai_1.expect)(diff.items).to.deep.include({ kind: 'template', change: 'added', id: 'templateId', summary: 'contracted_parallel_delivery' });
        (0, chai_1.expect)(diff.items).to.deep.include({ kind: 'state', change: 'added', id: 'build', summary: 'agent' });
        (0, chai_1.expect)(diff.items).to.deep.include({ kind: 'transition', change: 'added', id: 'intake_to_build', summary: 'intake -> build' });
        (0, chai_1.expect)(diff.items).to.deep.include({ kind: 'guard', change: 'added', id: 'intake_to_build', summary: 'artifact.exists' });
    });
    it('keeps a newly declared Markdown agent valid when referenced by a workflow state', function () {
        var workflow = sampleWorkflow({
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
        var validation = (0, index_1.validateFlowWorkflow)(workflow);
        (0, chai_1.expect)(validation.valid).to.equal(true);
        (0, chai_1.expect)(validation.warnings.map(function (warning) { return warning.code; })).not.to.include('state.agent.reference.missing');
    });
    it('detects an edited Markdown agent reference that is absent from workflow agents', function () {
        var workflow = sampleWorkflow({
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
        var validation = (0, index_1.validateFlowWorkflow)(workflow);
        (0, chai_1.expect)(validation.valid).to.equal(true);
        (0, chai_1.expect)(validation.warnings).to.deep.include({
            code: 'state.agent.reference.missing',
            message: 'Agent state "build" references missing workflow agent "reviewer".',
            path: 'states.build.agent'
        });
    });
    it('detects a missing referenced agent after parsing source from the editor', function () {
        var currentWorkflow = sampleWorkflow({
            file: {
                path: '/workspace/.theia/flow/workflows/source.json',
                uri: 'file:///workspace/.theia/flow/workflows/source.json',
                format: 'json',
                editable: true,
                updatedAt: '2026-05-20T00:00:00.000Z'
            }
        });
        var parsed = (0, index_1.parseWorkflowSource)(JSON.stringify(__assign(__assign({}, currentWorkflow), { file: undefined, agents: { architect: 'agents/architect.md' }, states: {
                intake: { type: 'input' },
                build: { type: 'agent', agent: 'missing_agent' }
            }, transitions: [{ from: 'intake', to: 'build', on: 'run.started' }] })), currentWorkflow);
        var validation = (0, index_1.validateFlowWorkflow)(parsed);
        (0, chai_1.expect)(validation.warnings.map(function (warning) { return warning.code; })).to.include('state.agent.reference.missing');
    });
});
function sampleWorkflow(overrides) {
    if (overrides === void 0) { overrides = {}; }
    return __assign({ version: 'flow.workflow/v1', id: 'source_workflow', name: 'Source Workflow', agents: {
            architect: 'agents/architect.md'
        }, states: {
            intake: { type: 'input' }
        }, transitions: [] }, overrides);
}
