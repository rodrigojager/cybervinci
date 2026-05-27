import { expect } from 'chai';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { FileUri } from '@theia/core/lib/common/file-uri';
import * as yaml from 'js-yaml';
import { FlowWorkflow } from '../common';
import { FlowStore } from './flow-store';

describe('FlowStore', () => {

    let tempDir: string;
    let workspaceRootUri: string;
    let store: FlowStore;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flow-store-'));
        workspaceRootUri = FileUri.create(tempDir).toString();
        store = new FlowStore();
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('attaches workflow file metadata when listing JSON workflows', async () => {
        const workflow = sampleWorkflow('sample_json');
        await writeWorkflowFile('sample_json.json', workflow);

        const workflows = await store.listWorkflows(workspaceRootUri);

        expect(workflows).to.have.length(1);
        expect(workflows[0].file?.format).to.equal('json');
        expect(workflows[0].file?.editable).to.equal(true);
        expect(normalizePath(workflows[0].file?.path)).to.equal(normalizePath(workflowPath('sample_json.json')));
        expect(workflows[0].file?.uri).to.equal(FileUri.create(workflowPath('sample_json.json')).toString());
        expect(workflows[0].file?.updatedAt).to.be.a('string');
    });

    it('saves pretty JSON without persisting file metadata', async () => {
        const workflow = sampleWorkflow('pretty_json');
        await store.saveWorkflow(workspaceRootUri, {
            ...workflow,
            file: {
                path: workflowPath('pretty_json.json'),
                uri: FileUri.create(workflowPath('pretty_json.json')).toString(),
                format: 'json',
                updatedAt: '2026-05-19T00:00:00.000Z',
                editable: true
            }
        });

        const content = await fs.readFile(workflowPath('pretty_json.json'), 'utf8');

        expect(content).to.contain('\n  "version": "flow.workflow/v1",\n');
        expect(content.endsWith('\n')).to.equal(true);
        expect(JSON.parse(content)).not.to.have.property('file');
    });

    it('discovers editable YAML workflows with full workflow metadata', async () => {
        await writeWorkflowFile('sample_yaml.yaml', [
            'version: flow.workflow/v1',
            'id: sample_yaml',
            'name: Sample YAML',
            'states:',
            '  intake:',
            '    type: input',
            '    layout:',
            '      x: 80',
            '      y: 120',
            'transitions: []'
        ].join('\n'));

        const workflows = await store.listWorkflows(workspaceRootUri);

        expect(workflows).to.have.length(1);
        expect(workflows[0].id).to.equal('sample_yaml');
        expect(workflows[0].name).to.equal('Sample YAML');
        expect(workflows[0].states.intake.layout).to.deep.equal({ x: 80, y: 120 });
        expect(workflows[0].file?.format).to.equal('yaml');
        expect(workflows[0].file?.editable).to.equal(true);
        expect(workflows[0].file?.unsupportedReason).to.equal(undefined);
    });

    it('round-trips editable YAML workflows without persisting file metadata', async () => {
        const yamlPath = workflowPath('sample_yaml.yml');
        await writeWorkflowFile('sample_yaml.yml', [
            'version: flow.workflow/v1',
            'id: sample_yaml',
            'name: Sample YAML',
            'states:',
            '  intake:',
            '    type: input',
            'transitions: []'
        ].join('\n'));
        const workflow = await store.openWorkflowFile(yamlPath);
        expect(workflow.file?.format).to.equal('yaml');
        expect(workflow.file?.editable).to.equal(true);

        await store.saveWorkflow(workspaceRootUri, {
            ...workflow,
            name: 'Sample YAML Edited',
            states: {
                ...workflow.states,
                intake: { ...workflow.states.intake, layout: { x: 44, y: 55 } },
                review: { type: 'gate', description: 'Approve generated YAML workflow changes.' }
            },
            transitions: [{ id: 'intake_to_review', from: 'intake', to: 'review', on: 'workload.completed' }]
        }, yamlPath);

        const content = await fs.readFile(yamlPath, 'utf8');
        const savedRaw = yaml.load(content) as Record<string, unknown>;
        const reloaded = await store.openWorkflowFile(yamlPath);

        expect(content).not.to.contain('file:');
        expect(savedRaw).not.to.have.property('file');
        expect(savedRaw.name).to.equal('Sample YAML Edited');
        expect(reloaded.file?.format).to.equal('yaml');
        expect(reloaded.file?.editable).to.equal(true);
        expect(reloaded.name).to.equal('Sample YAML Edited');
        expect(reloaded.states.intake.layout).to.deep.equal({ x: 44, y: 55 });
        expect(reloaded.states.review.type).to.equal('gate');
        expect(reloaded.transitions).to.deep.equal([{ id: 'intake_to_review', from: 'intake', to: 'review', on: 'workload.completed' }]);
    });

    it('records local workflow versions with author, origin, date, diff, and restore support', async () => {
        const workflow = sampleWorkflow('versioned');
        await store.saveWorkflow(workspaceRootUri, workflow, undefined, {
            author: 'Architect',
            origin: 'create',
            message: 'Initial workflow'
        });
        await store.saveWorkflow(workspaceRootUri, {
            ...workflow,
            name: 'Versioned Edited',
            states: {
                ...workflow.states,
                review: { type: 'gate' }
            },
            transitions: [{ id: 'intake_to_review', from: 'intake', to: 'review', on: 'run.started' }]
        }, undefined, {
            author: 'Designer',
            origin: 'save',
            message: 'Add review gate'
        });

        const versions = await store.listWorkflowVersions(workspaceRootUri, workflow.id);

        expect(versions).to.have.length(2);
        expect(versions[0].author).to.equal('Designer');
        expect(versions[0].origin).to.equal('save');
        expect(versions[0].message).to.equal('Add review gate');
        expect(versions[0].createdAt).to.be.a('string');
        expect(versions[0].diff.map(item => `${item.kind}:${item.change}:${item.id}`)).to.include.members([
            'metadata:changed:name',
            'state:added:review',
            'transition:added:intake_to_review'
        ]);
        expect(versions[1].origin).to.equal('create');
        expect(versions[1].diff[0]).to.deep.include({ kind: 'source', change: 'added', id: 'versioned' });

        const restored = await store.restoreWorkflowVersion(workspaceRootUri, workflow.id, versions[1].id, {
            author: 'QA',
            message: 'Rollback to initial version'
        });
        const restoredVersions = await store.listWorkflowVersions(workspaceRootUri, workflow.id);

        expect(restored.name).to.equal('versioned');
        expect(restored.states).not.to.have.property('review');
        expect(restoredVersions[0].origin).to.equal('restore');
        expect(restoredVersions[0].author).to.equal('QA');
        expect(restoredVersions[0].message).to.equal('Rollback to initial version');
        expect(restoredVersions[0].diff.map(item => `${item.kind}:${item.change}:${item.id}`)).to.include.members([
            'metadata:changed:name',
            'state:removed:review',
            'transition:removed:intake_to_review'
        ]);
    });

    it('creates JSON workflows from templates without mutating template sources', async () => {
        const workflow = await store.createWorkflowFromTemplate(workspaceRootUri, 'simple_specialist');

        expect(workflow.id).to.equal('simple_specialist');
        expect(workflow.name).to.equal('Simple Specialist');
        expect(workflow.file?.format).to.equal('json');
        expect(workflow.file?.editable).to.equal(true);
        expect(normalizePath(workflow.file?.path)).to.equal(normalizePath(workflowPath('simple_specialist.json')));

        const content = JSON.parse(await fs.readFile(workflowPath('simple_specialist.json'), 'utf8')) as FlowWorkflow;
        expect(content).not.to.have.property('file');
        expect(content.states.input.outputs).to.deep.equal(['input/request.md']);
    });

    it('allocates a new workflow id when creating the same template twice', async () => {
        await store.createWorkflowFromTemplate(workspaceRootUri, 'simple_specialist');

        const workflow = await store.createWorkflowFromTemplate(workspaceRootUri, 'simple_specialist');

        expect(workflow.id).to.equal('simple_specialist_2');
        expect(workflow.name).to.equal('Simple Specialist 2');
        expect(normalizePath(workflow.file?.path)).to.equal(normalizePath(workflowPath('simple_specialist_2.json')));
    });

    it('imports an exported YAML workflow while preserving id, agents, states, transitions, and format', async () => {
        const source = path.join(tempDir, 'exported-workflow.yaml');
        await fs.writeFile(source, [
            'version: flow.workflow/v1',
            'id: imported_yaml',
            'name: Imported YAML',
            'metadata:',
            '  owner: studio',
            'agents:',
            '  reviewer: agents/reviewer.md',
            'states:',
            '  intake:',
            '    type: input',
            '  review:',
            '    type: agent',
            '    agent: reviewer',
            'transitions:',
            '  - id: intake_to_review',
            '    from: intake',
            '    to: review',
            '    on: run.started'
        ].join('\n'), 'utf8');

        const workflow = await store.importWorkflow(workspaceRootUri, source);

        expect(workflow.id).to.equal('imported_yaml');
        expect(workflow.name).to.equal('Imported YAML');
        expect(workflow.agents).to.deep.equal({ reviewer: 'agents/reviewer.md' });
        expect(workflow.states.review.agent).to.equal('reviewer');
        expect(workflow.transitions).to.deep.equal([{ id: 'intake_to_review', from: 'intake', to: 'review', on: 'run.started' }]);
        expect((workflow as FlowWorkflow & { metadata?: { owner: string } }).metadata).to.deep.equal({ owner: 'studio' });
        expect(workflow.file?.format).to.equal('yaml');
        expect(normalizePath(workflow.file?.path)).to.equal(normalizePath(workflowPath('imported_yaml.yaml')));
    });

    it('imports a CLI run export directory from embedded run workflow as JSON', async () => {
        const exportDir = path.join(tempDir, 'cli-export');
        await fs.mkdir(exportDir, { recursive: true });
        await fs.writeFile(path.join(exportDir, 'manifest.json'), JSON.stringify({
            runId: 'run-1',
            workflowId: 'cli_exported',
            files: ['run.json', 'events.jsonl', 'manifest.json']
        }), 'utf8');
        await fs.writeFile(path.join(exportDir, 'run.json'), `${JSON.stringify({
            id: 'run-1',
            workflowId: 'cli_exported',
            workflow: {
                version: 'flow.workflow/v1',
                id: 'cli_exported',
                name: 'CLI Exported',
                agents: {
                    architect: 'agents/architect.md'
                },
                states: {
                    intake: { type: 'input' },
                    architecture: { type: 'agent', agent: 'architect' }
                },
                transitions: [
                    { from: 'intake', to: 'architecture', on: 'run.started' }
                ]
            }
        }, undefined, 2)}\n`, 'utf8');

        const workflow = await store.importWorkflow(workspaceRootUri, exportDir);

        expect(workflow.id).to.equal('cli_exported');
        expect(workflow.name).to.equal('CLI Exported');
        expect(workflow.agents).to.deep.equal({ architect: 'agents/architect.md' });
        expect(workflow.states.architecture.agent).to.equal('architect');
        expect(workflow.transitions).to.deep.equal([{ from: 'intake', to: 'architecture', on: 'run.started' }]);
        expect(workflow.file?.format).to.equal('json');
        expect(normalizePath(workflow.file?.path)).to.equal(normalizePath(workflowPath('cli_exported.json')));
    });

    it('imports a workflow from a CLI run.json file URI', async () => {
        const exportDir = path.join(tempDir, 'cli-run-json-export');
        const runFile = path.join(exportDir, 'run.json');
        await fs.mkdir(exportDir, { recursive: true });
        await fs.writeFile(runFile, `${JSON.stringify({
            id: 'run-from-uri',
            workflowId: 'workflow_from_run_uri',
            workflow: {
                version: 'flow.workflow/v1',
                id: 'workflow_from_run_uri',
                name: 'Workflow From Run URI',
                states: {
                    intake: { type: 'input' },
                    done: { type: 'report' }
                },
                transitions: [
                    { id: 'intake_to_done', from: 'intake', to: 'done', on: 'run.started' }
                ]
            }
        }, undefined, 2)}\n`, 'utf8');

        const workflow = await store.importWorkflow(workspaceRootUri, FileUri.create(runFile).toString());

        expect(workflow.id).to.equal('workflow_from_run_uri');
        expect(workflow.name).to.equal('Workflow From Run URI');
        expect(workflow.states.done.type).to.equal('report');
        expect(workflow.transitions).to.deep.equal([{ id: 'intake_to_done', from: 'intake', to: 'done', on: 'run.started' }]);
        expect(workflow.file?.format).to.equal('json');
        expect(JSON.parse(await fs.readFile(workflowPath('workflow_from_run_uri.json'), 'utf8'))).not.to.have.property('file');
    });

    it('imports a CLI run export as a read-only audit run with events, manifest, and copied artifacts', async () => {
        const exportDir = path.join(tempDir, 'run-export');
        await fs.mkdir(path.join(exportDir, 'reports'), { recursive: true });
        await fs.writeFile(path.join(exportDir, 'reports', 'summary.md'), '# Summary\n', 'utf8');
        await fs.writeFile(path.join(exportDir, 'manifest.json'), JSON.stringify({
            runId: 'run-1',
            workflowId: 'audit_workflow',
            eventCount: 2,
            artifactCount: 1,
            files: ['run.json', 'events.jsonl', 'manifest.json', 'reports/summary.md']
        }), 'utf8');
        await fs.writeFile(path.join(exportDir, 'events.jsonl'), [
            JSON.stringify({ seq: 1, time: '2026-05-19T00:00:00Z', type: 'run.started', runId: 'run-1', message: 'started' }),
            JSON.stringify({ seq: 2, time: '2026-05-19T00:00:01Z', type: 'artifact.created', runId: 'run-1', stateId: 'report', message: 'artifact', data: { path: 'reports/summary.md' } })
        ].join('\n'), 'utf8');
        await fs.writeFile(path.join(exportDir, 'run.json'), `${JSON.stringify({
            id: 'run-1',
            workflowId: 'audit_workflow',
            input: 'ship audit import',
            status: 'completed',
            createdAt: '2026-05-19T00:00:00Z',
            updatedAt: '2026-05-19T00:00:01Z',
            activeStates: {},
            completedStates: { intake: true, report: true },
            workflow: {
                version: 'flow.workflow/v1',
                id: 'audit_workflow',
                name: 'Audit Workflow',
                states: {
                    intake: { type: 'input' },
                    report: { type: 'report' }
                },
                transitions: [
                    { from: 'intake', to: 'report', on: 'run.started' }
                ]
            },
            workloads: {
                wl_0001: {
                    id: 'wl_0001',
                    runId: 'run-1',
                    stateId: 'report',
                    type: 'report',
                    status: 'completed',
                    outputs: ['reports/summary.md'],
                    createdAt: '2026-05-19T00:00:00Z',
                    completedAt: '2026-05-19T00:00:01Z'
                }
            },
            artifacts: {
                summary: {
                    id: 'summary',
                    type: 'report',
                    path: 'reports/summary.md',
                    stateId: 'report',
                    workloadId: 'wl_0001',
                    createdAt: '2026-05-19T00:00:01Z'
                }
            }
        }, undefined, 2)}\n`, 'utf8');

        const run = await store.importRun(workspaceRootUri, exportDir);

        expect(run.id).to.equal('run-1');
        expect(run.prompt).to.equal('ship audit import');
        expect(run.audit?.readOnly).to.equal(true);
        expect(run.audit?.manifest?.runId).to.equal('run-1');
        expect(run.events.map(event => event.type)).to.include.members(['run.started', 'artifact.created']);
        expect(run.artifacts[0].uri).to.contain('reports');
        expect(run.artifacts[0].uri).to.match(/^file:/);
        expect(run.workloads[0].outputArtifacts[0]).to.match(/^file:/);
        expect(await fileExists(path.join(tempDir, '.theia', 'flow', 'runs', 'run-1', 'import', 'reports', 'summary.md'))).to.equal(true);
    });

    it('imports a run export when the source is run.json instead of the export directory', async () => {
        const exportDir = path.join(tempDir, 'run-json-import');
        await fs.mkdir(exportDir, { recursive: true });
        await fs.writeFile(path.join(exportDir, 'events.jsonl'), `${JSON.stringify({
            seq: 1,
            time: '2026-05-20T12:00:00Z',
            type: 'run.started',
            runId: 'run-json-import'
        })}\n`, 'utf8');
        await fs.writeFile(path.join(exportDir, 'run.json'), `${JSON.stringify({
            id: 'run-json-import',
            workflowId: 'workflow_for_run_json_import',
            input: 'import from run file',
            status: 'running',
            createdAt: '2026-05-20T12:00:00Z',
            updatedAt: '2026-05-20T12:00:00Z',
            activeStates: { intake: true },
            completedStates: {},
            workflow: {
                version: 'flow.workflow/v1',
                id: 'workflow_for_run_json_import',
                states: {
                    intake: { type: 'input' }
                },
                transitions: []
            },
            workloads: {},
            artifacts: {}
        }, undefined, 2)}\n`, 'utf8');

        const run = await store.importRun(workspaceRootUri, path.join(exportDir, 'run.json'));

        expect(run.id).to.equal('run-json-import');
        expect(run.prompt).to.equal('import from run file');
        expect(run.audit?.readOnly).to.equal(true);
        expect(run.audit?.sourcePath).to.equal(exportDir);
        expect(run.events.map(event => event.type)).to.deep.equal(['run.started']);
    });

    it('exports a complete workflow package with workflow file, referenced agents, contracts, metadata, and manifest', async () => {
        const workflow: FlowWorkflow = {
            ...sampleWorkflow('full_export'),
            name: 'Full Export',
            agents: {
                architect: 'agents/architect.md',
                qa: 'agents/qa.md'
            },
            states: {
                intake: { type: 'input', outputs: ['input/request.md'] },
                contract: {
                    type: 'agent',
                    agent: 'architect',
                    input: { include: ['input/request.md'] },
                    outputs: ['contracts/shared.md', 'contracts/contracts.json', 'schemas/api.json']
                },
                qa: {
                    type: 'agent',
                    agent: 'qa',
                    input: { include: ['contracts/contracts.json'] }
                }
            },
            transitions: [
                { from: 'intake', to: 'contract', on: 'run.started' },
                { from: 'contract', to: 'qa', on: 'workload.completed' }
            ]
        };
        await store.saveWorkflow(workspaceRootUri, workflow);
        await writeStorageFile('agents/agents/architect.md', '# Architect\n');
        await writeStorageFile('agents/agents/qa.md', '# QA\n');
        await writeWorkspaceFile('contracts/shared.md', '# Shared\n');
        await writeWorkspaceFile('contracts/contracts.json', '{"packageId":"contracts-1"}\n');
        await writeWorkspaceFile('schemas/api.json', '{"type":"object"}\n');

        const exported = await store.exportWorkflow(workspaceRootUri, await store.openWorkflowFile(workflowPath('full_export.json')));

        expect(exported.workflowId).to.equal('full_export');
        expect(exported.missingAgents).to.deep.equal([]);
        expect(exported.missingContracts).to.deep.equal([]);
        expect(exported.files).to.include.members([
            'workflow/full_export.json',
            'agents/agents/architect.md',
            'agents/agents/qa.md',
            'contracts/shared.md',
            'contracts/contracts.json',
            'schemas/api.json',
            'metadata.json',
            'manifest.json'
        ]);
        const manifest = JSON.parse(await fs.readFile(path.join(exported.path, 'manifest.json'), 'utf8')) as Record<string, unknown>;
        expect(manifest.schemaVersion).to.equal('flow.workflow-export-manifest/v1');
        expect(manifest.workflowFile).to.equal('workflow/full_export.json');
        expect(manifest.agents).to.deep.equal(['agents/architect.md', 'agents/qa.md']);
        expect(manifest.contracts).to.deep.equal(['contracts/contracts.json', 'contracts/shared.md', 'schemas/api.json']);
        expect(JSON.parse(await fs.readFile(path.join(exported.path, 'workflow', 'full_export.json'), 'utf8'))).not.to.have.property('file');
    });

    it('exports a workflow package to an explicit target URI and replaces stale package files', async () => {
        const workflow = sampleWorkflow('targeted_export');
        const targetDir = path.join(tempDir, 'targeted-workflow-export');
        await fs.mkdir(targetDir, { recursive: true });
        await fs.writeFile(path.join(targetDir, 'stale.txt'), 'stale\n', 'utf8');
        await store.saveWorkflow(workspaceRootUri, workflow);

        const exported = await store.exportWorkflow(workspaceRootUri, await store.openWorkflowFile(workflowPath('targeted_export.json')), FileUri.create(targetDir).toString());

        expect(exported.path).to.equal(targetDir);
        expect(await fileExists(path.join(targetDir, 'stale.txt'))).to.equal(false);
        expect(exported.files).to.include.members(['workflow/targeted_export.json', 'metadata.json', 'manifest.json']);
        expect(JSON.parse(await fs.readFile(path.join(targetDir, 'manifest.json'), 'utf8'))).to.deep.include({
            schemaVersion: 'flow.workflow-export-manifest/v1',
            packageType: 'flow.workflow',
            workflowId: 'targeted_export'
        });
    });

    it('exports a complete run audit package aligned with flow export files', async () => {
        const workflow: FlowWorkflow = {
            ...sampleWorkflow('run_export_workflow'),
            agents: {
                writer: 'agents/writer.md'
            },
            requires: {
                capabilities: ['llm.agent.execute', 'filesystem.edit']
            },
            states: {
                intake: {
                    type: 'agent',
                    agent: 'writer',
                    input: { include: ['contracts/contracts.json'] },
                    outputs: ['final/report.md']
                }
            }
        };
        await store.saveWorkflow(workspaceRootUri, workflow);
        const artifactFile = path.join(tempDir, '.theia', 'flow', 'runs', 'run-1', 'final', 'report.md');
        await fs.mkdir(path.dirname(artifactFile), { recursive: true });
        await fs.writeFile(artifactFile, '# Final\n', 'utf8');
        const run = {
            id: 'run-1',
            workflowId: workflow.id,
            prompt: 'ship audit export',
            status: 'completed' as const,
            createdAt: '2026-05-20T10:00:00.000Z',
            updatedAt: '2026-05-20T10:05:00.000Z',
            currentStateIds: [],
            stateStatuses: { intake: 'done' as const },
            workloads: [{
                id: 'wl-1',
                runId: 'run-1',
                stateId: 'intake',
                agent: 'writer',
                status: 'done' as const,
                inputArtifacts: ['contracts/contracts.json'],
                outputArtifacts: [FileUri.create(artifactFile).toString()],
                issues: ['QA follow-up'],
                effectIds: ['effect-1'],
                createdAt: '2026-05-20T10:00:00.000Z',
                updatedAt: '2026-05-20T10:05:00.000Z'
            }],
            events: [{
                id: 'event-1',
                runId: 'run-1',
                workflowId: workflow.id,
                type: 'run.completed' as const,
                timestamp: '2026-05-20T10:05:00.000Z',
                message: 'completed'
            }],
            artifacts: [{
                id: 'artifact-1',
                runId: 'run-1',
                stateId: 'final',
                uri: FileUri.create(artifactFile).toString(),
                kind: 'report' as const,
                summary: 'Final report',
                createdAt: '2026-05-20T10:05:00.000Z'
            }],
            effects: [{
                id: 'effect-1',
                runId: 'run-1',
                stateId: 'intake',
                kind: 'file' as const,
                type: 'file.edited',
                path: 'src/index.ts',
                status: 'applied' as const,
                summary: 'Updated source'
            }],
            signals: [],
            gates: [],
            memoryWrites: [{
                id: 'memory-1',
                runId: 'run-1',
                candidateId: 'candidate-1',
                status: 'written' as const,
                content: 'Keep the final report path stable.',
                approvedAt: '2026-05-20T10:05:00.000Z',
                scope: 'project' as const,
                target: 'project.decision'
            }],
            tick: 2
        };

        const exported = await store.exportRun(workspaceRootUri, workflow, run);

        expect(exported.runId).to.equal('run-1');
        expect(exported.missingArtifacts).to.deep.equal([]);
        expect(exported.files).to.include.members([
            'run.json',
            'events.jsonl',
            'capabilities.json',
            'agents.json',
            'contracts.json',
            'artifacts.json',
            'effects.json',
            'issues.json',
            'memory-writes.json',
            'final-report.json',
            'final-report.md',
            'manifest.json'
        ]);
        const manifest = JSON.parse(await fs.readFile(path.join(exported.path, 'manifest.json'), 'utf8')) as Record<string, unknown>;
        expect(manifest.schemaVersion).to.equal('flow.run-export-manifest/v1');
        expect(manifest.eventCount).to.equal(1);
        expect(manifest.artifactCount).to.equal(1);
        expect(manifest.capabilityCount).to.equal(2);
        expect(manifest.agentCount).to.equal(1);
        expect(manifest.contractCount).to.equal(1);
        expect(manifest.effectCount).to.equal(1);
        expect(manifest.issueCount).to.equal(1);
        expect(manifest.memoryWriteCount).to.equal(1);
        expect(manifest.components).to.deep.include({
            capabilities: 'capabilities.json',
            agents: 'agents.json',
            contracts: 'contracts.json',
            effects: 'effects.json',
            issues: 'issues.json',
            memoryWrites: 'memory-writes.json'
        });
        expect(manifest.finalReport).to.deep.equal({ json: 'final-report.json', markdown: 'final-report.md' });
        expect(await fileExists(path.join(exported.path, 'artifacts', 'final', 'artifact-1-report.md'))).to.equal(true);
        expect(await fs.readFile(path.join(exported.path, 'events.jsonl'), 'utf8')).to.contain('"run.completed"');
        expect(JSON.parse(await fs.readFile(path.join(exported.path, 'run.json'), 'utf8'))).to.have.property('workflow');
        expect(JSON.parse(await fs.readFile(path.join(exported.path, 'capabilities.json'), 'utf8'))).to.deep.equal(['llm.agent.execute', 'filesystem.edit']);
        expect(JSON.parse(await fs.readFile(path.join(exported.path, 'agents.json'), 'utf8'))[0]).to.deep.include({ id: 'writer', path: 'agents/writer.md' });
        expect(JSON.parse(await fs.readFile(path.join(exported.path, 'contracts.json'), 'utf8'))).to.deep.equal(['contracts/contracts.json']);
        expect(JSON.parse(await fs.readFile(path.join(exported.path, 'memory-writes.json'), 'utf8'))[0]).to.deep.include({ id: 'memory-1', candidateId: 'candidate-1' });
        expect(JSON.parse(await fs.readFile(path.join(exported.path, 'final-report.json'), 'utf8'))).to.deep.include({
            schemaVersion: 'flow.run-final-report/v1',
            runId: 'run-1',
            workflowId: 'run_export_workflow'
        });
    });

    it('exports a run audit package to an explicit target path and reports missing artifacts', async () => {
        const workflow = sampleWorkflow('targeted_run_export_workflow');
        const targetDir = path.join(tempDir, 'targeted-run-export');
        await fs.mkdir(targetDir, { recursive: true });
        await fs.writeFile(path.join(targetDir, 'old.json'), '{}\n', 'utf8');
        const missingArtifactUri = FileUri.create(path.join(tempDir, 'missing-report.md')).toString();
        const run = {
            id: 'targeted-run-export',
            workflowId: workflow.id,
            prompt: 'export run to target',
            status: 'completed' as const,
            createdAt: '2026-05-20T13:00:00.000Z',
            updatedAt: '2026-05-20T13:01:00.000Z',
            currentStateIds: [],
            stateStatuses: { intake: 'done' as const },
            workloads: [],
            events: [],
            artifacts: [{
                id: 'missing-artifact',
                runId: 'targeted-run-export',
                stateId: 'intake',
                uri: missingArtifactUri,
                kind: 'report' as const,
                summary: 'Missing report',
                createdAt: '2026-05-20T13:01:00.000Z'
            }],
            effects: [],
            signals: [],
            gates: [],
            tick: 1
        };

        const exported = await store.exportRun(workspaceRootUri, workflow, run, targetDir);

        expect(exported.path).to.equal(targetDir);
        expect(await fileExists(path.join(targetDir, 'old.json'))).to.equal(false);
        expect(exported.missingArtifacts).to.deep.equal([missingArtifactUri]);
        expect(exported.files).to.include.members(['run.json', 'events.jsonl', 'artifacts.json', 'manifest.json']);
        const manifest = JSON.parse(await fs.readFile(path.join(targetDir, 'manifest.json'), 'utf8')) as Record<string, unknown>;
        expect(manifest.missingArtifacts).to.deep.equal([missingArtifactUri]);
        expect(manifest.artifactCount).to.equal(1);
    });

    it('restores an older YAML workflow version without converting the workflow file to JSON', async () => {
        const yamlPath = workflowPath('restore_yaml.yaml');
        await store.saveWorkflow(workspaceRootUri, sampleWorkflow('restore_yaml'), yamlPath, {
            author: 'Architect',
            origin: 'create',
            message: 'Initial YAML'
        });
        await store.saveWorkflow(workspaceRootUri, {
            ...sampleWorkflow('restore_yaml'),
            name: 'Restore YAML Edited',
            states: {
                intake: { type: 'input' },
                qa: { type: 'agent', agent: 'qa' }
            },
            transitions: [{ id: 'intake_to_qa', from: 'intake', to: 'qa', on: 'run.started' }]
        }, yamlPath, {
            origin: 'save',
            message: 'Add QA'
        });
        const versions = await store.listWorkflowVersions(workspaceRootUri, 'restore_yaml');
        const initialVersion = versions.find(version => version.origin === 'create');
        expect(initialVersion).to.not.equal(undefined);

        const restored = await store.restoreWorkflowVersion(workspaceRootUri, 'restore_yaml', initialVersion!.id);

        expect(restored.file?.format).to.equal('yaml');
        expect(normalizePath(restored.file?.path)).to.equal(normalizePath(yamlPath));
        expect(restored.states).not.to.have.property('qa');
        expect(await fileExists(workflowPath('restore_yaml.json'))).to.equal(false);
        expect(yaml.load(await fs.readFile(yamlPath, 'utf8'))).to.deep.include({
            version: 'flow.workflow/v1',
            id: 'restore_yaml',
            name: 'restore_yaml'
        });
    });

    it('records version diffs for metadata, agent, capability, guard, state, and transition changes', async () => {
        const workflow: FlowWorkflow = {
            ...sampleWorkflow('diff_versions'),
            agents: {
                architect: 'agents/architect.md'
            },
            requires: {
                capabilities: ['filesystem.write']
            },
            transitions: [
                { id: 'intake_to_architect', from: 'intake', to: 'architect', on: 'run.started' }
            ],
            states: {
                intake: { type: 'input' },
                architect: { type: 'agent', agent: 'architect' }
            }
        };
        await store.saveWorkflow(workspaceRootUri, workflow, undefined, { origin: 'create' });
        await store.saveWorkflow(workspaceRootUri, {
            ...workflow,
            name: 'Diff Versions Edited',
            agents: {
                reviewer: 'agents/reviewer.md'
            },
            requires: {
                capabilities: ['llm.agent.execute']
            },
            states: {
                intake: { type: 'input' },
                review: { type: 'gate' }
            },
            transitions: [
                { id: 'intake_to_review', from: 'intake', to: 'review', on: 'run.started', guard: { approved: true } }
            ]
        }, undefined, { origin: 'save' });

        const latest = (await store.listWorkflowVersions(workspaceRootUri, workflow.id)).find(version => version.origin === 'save');
        expect(latest).to.not.equal(undefined);
        const diff = latest!.diff.map(item => `${item.kind}:${item.change}:${item.id}:${item.summary}`);

        expect(diff).to.include.members([
            'metadata:changed:name:diff_versions -> Diff Versions Edited',
            'agent:removed:architect:agents/architect.md',
            'agent:added:reviewer:agents/reviewer.md',
            'capability:removed:filesystem.write:true',
            'capability:added:llm.agent.execute:true',
            'state:removed:architect:agent',
            'state:added:review:gate',
            'transition:removed:intake_to_architect:intake -> architect',
            'transition:added:intake_to_review:intake -> review',
            'guard:added:intake_to_review:approved'
        ]);
    });

    it('attaches run file metadata and exposes run path metadata', async () => {
        await store.saveRun(workspaceRootUri, {
            id: 'run-1',
            workflowId: 'workflow-1',
            prompt: 'ship',
            status: 'idle',
            createdAt: '2026-05-19T00:00:00.000Z',
            updatedAt: '2026-05-19T00:00:00.000Z',
            currentStateIds: [],
            stateStatuses: {},
            workloads: [],
            events: [],
            artifacts: [],
            effects: [],
            signals: [],
            gates: [],
            externalKernelMetadata: {
                kernelRunId: 'kernel-run-1',
                storeDir: '/tmp/kernel-runs',
                workflowFile: '/tmp/workflow.json'
            },
            tick: 0
        });

        const run = await store.getRun(workspaceRootUri, 'run-1');
        const metadata = await store.runFileMetadata(workspaceRootUri, 'run-1');

        expect(run?.file?.path).to.equal(metadata.path);
        expect(normalizePath(metadata.path)).to.equal(normalizePath(path.join(tempDir, '.theia', 'flow', 'runs', 'run-1.json')));
        expect(metadata.format).to.equal('json');
        expect(run?.externalKernelMetadata).to.deep.equal({
            kernelRunId: 'kernel-run-1',
            storeDir: '/tmp/kernel-runs',
            workflowFile: '/tmp/workflow.json'
        });
    });

    async function writeWorkflowFile(fileName: string, content: FlowWorkflow | string): Promise<void> {
        const workflowsDir = path.join(tempDir, '.theia', 'flow', 'workflows');
        await fs.mkdir(workflowsDir, { recursive: true });
        await fs.writeFile(path.join(workflowsDir, fileName), typeof content === 'string' ? content : `${JSON.stringify(content, undefined, 2)}\n`, 'utf8');
    }

    function workflowPath(fileName: string): string {
        return path.join(tempDir, '.theia', 'flow', 'workflows', fileName);
    }

    async function writeStorageFile(relativePath: string, content: string): Promise<void> {
        const file = path.join(tempDir, '.theia', 'flow', relativePath);
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, content, 'utf8');
    }

    async function writeWorkspaceFile(relativePath: string, content: string): Promise<void> {
        const file = path.join(tempDir, relativePath);
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, content, 'utf8');
    }
});

function sampleWorkflow(id: string): FlowWorkflow {
    return {
        version: 'flow.workflow/v1',
        id,
        name: id,
        states: {
            intake: { type: 'input' }
        },
        transitions: []
    };
}

function normalizePath(value: string | undefined): string {
    return path.normalize(value || '').toLowerCase();
}

async function fileExists(file: string): Promise<boolean> {
    try {
        await fs.access(file);
        return true;
    } catch {
        return false;
    }
}
