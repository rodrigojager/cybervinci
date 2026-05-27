import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { injectable } from '@theia/core/shared/inversify';
import * as yaml from 'js-yaml';
import { FlowArtifact, FlowEffect, FlowFileMetadata, FlowRun, FlowRunExportResult, FlowWorkflow, FlowWorkflowExportResult, FlowWorkflowFileFormat, FlowWorkflowState, FlowWorkflowVersion, compareFlowWorkflowStructure, instantiateFlowWorkflowTemplate, listFlowWorkflowTemplates, redactFlowRunForDisplay, redactFlowSecretsText, validateFlowWorkflow } from '../common';
import { KernelEvent, KernelRunState, mapKernelRunToFlowRun } from './flow-kernel-bridge';

const WORKFLOW_EXTENSIONS = ['.json', '.yaml', '.yml'];
const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown']);
const JSON_FORMAT: FlowWorkflowFileFormat = 'json';
const YAML_FORMAT: FlowWorkflowFileFormat = 'yaml';
const UNKNOWN_FORMAT: FlowWorkflowFileFormat = 'unknown';

@injectable()
export class FlowStore {

    async listWorkflows(workspaceRootUri?: string): Promise<FlowWorkflow[]> {
        const dir = await this.ensureDir(workspaceRootUri, 'workflows');
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const workflows: FlowWorkflow[] = [];
        for (const entry of entries) {
            if (entry.isFile() && isWorkflowFile(entry.name)) {
                workflows.push(await this.readWorkflowFile(path.join(dir, entry.name)));
            }
        }
        return workflows.sort((left, right) => left.name.localeCompare(right.name));
    }

    async getWorkflow(workspaceRootUri: string | undefined, workflowId: string): Promise<FlowWorkflow | undefined> {
        const file = await this.findWorkflowFile(workspaceRootUri, workflowId);
        if (!file) {
            return undefined;
        }
        try {
            return await this.readWorkflowFile(file);
        } catch {
            return undefined;
        }
    }

    async openWorkflowFile(filePathOrUri: string): Promise<FlowWorkflow> {
        return this.readWorkflowFile(this.fsPath(filePathOrUri));
    }

    async importWorkflow(workspaceRootUri: string | undefined, filePathOrUri: string): Promise<FlowWorkflow> {
        const source = this.fsPath(filePathOrUri);
        const workflow = await this.readImportWorkflow(source);
        const validation = validateFlowWorkflow(workflow);
        if (!validation.valid) {
            throw new Error(`Imported workflow "${workflow.id || source}" is invalid: ${validation.errors.map(error => error.message).join('; ')}`);
        }
        const format = await this.importWorkflowFormat(source);
        const file = await this.workflowFile(workspaceRootUri, workflow.id, format);
        await this.saveWorkflow(workspaceRootUri, { ...workflow, file: undefined }, file, { origin: 'import', message: `Imported from ${source}` });
        const saved = await this.getWorkflow(workspaceRootUri, workflow.id);
        if (!saved) {
            throw new Error(`Imported workflow "${workflow.id}" could not be reloaded.`);
        }
        return saved;
    }

    async exportWorkflow(workspaceRootUri: string | undefined, workflow: FlowWorkflow, targetPathOrUri?: string): Promise<FlowWorkflowExportResult> {
        const exportedAt = new Date().toISOString();
        const exportDir = targetPathOrUri
            ? normalizeWindowsDriveLetter(path.resolve(this.fsPath(targetPathOrUri)))
            : path.join(await this.ensureDir(workspaceRootUri, 'exports'), `${sanitizeFileName(workflow.id)}-${timestampFilePart(exportedAt)}`);
        await fs.rm(exportDir, { recursive: true, force: true });
        await fs.mkdir(exportDir, { recursive: true });

        const files: string[] = [];
        const addFile = async (relativePath: string, content: string | Buffer): Promise<void> => {
            const target = safePackagePath(exportDir, relativePath);
            await fs.mkdir(path.dirname(target), { recursive: true });
            await fs.writeFile(target, content);
            files.push(relativePath.split(path.sep).join('/'));
        };
        const copyFile = async (source: string, relativePath: string): Promise<void> => {
            const target = safePackagePath(exportDir, relativePath);
            await fs.mkdir(path.dirname(target), { recursive: true });
            await fs.copyFile(source, target);
            files.push(relativePath.split(path.sep).join('/'));
        };

        const workflowFormat = workflow.file?.format === YAML_FORMAT ? YAML_FORMAT : JSON_FORMAT;
        const workflowPackagePath = `workflow/${sanitizeFileName(workflow.id)}${workflowExtension(workflowFormat)}`;
        if (workflowFormat === YAML_FORMAT) {
            await addFile(workflowPackagePath, yaml.dump(stripFileMetadata(workflow), { lineWidth: 120, noRefs: true, sortKeys: false }));
        } else {
            await addFile(workflowPackagePath, `${JSON.stringify(stripFileMetadata(workflow), undefined, 2)}\n`);
        }

        const agentsRoot = path.join(storageRoot(workspaceRootUri), 'agents');
        const missingAgents: string[] = [];
        for (const agentPath of referencedAgentPaths(workflow)) {
            const source = safeExistingSource(agentsRoot, agentPath);
            if (source && await fileExists(source)) {
                await copyFile(source, `agents/${agentPath}`);
            } else {
                missingAgents.push(agentPath);
            }
        }

        const contractRoots = [
            path.join(storageRoot(workspaceRootUri), 'contracts'),
            workspaceRootUri ? FileUri.fsPath(workspaceRootUri) : undefined
        ].filter((value): value is string => Boolean(value));
        const missingContracts: string[] = [];
        for (const contractPath of referencedContractPaths(workflow)) {
            const source = await firstExistingSource(contractRoots, contractPath);
            if (source) {
                await copyFile(source, contractPath);
            } else {
                missingContracts.push(contractPath);
            }
        }

        const metadata = {
            schemaVersion: 'flow.workflow-export/v1',
            exportedAt,
            workflowId: workflow.id,
            workflowName: workflow.name,
            sourceWorkflowFile: workflow.file,
            counts: {
                agents: referencedAgentPaths(workflow).length,
                contracts: referencedContractPaths(workflow).length,
                missingAgents: missingAgents.length,
                missingContracts: missingContracts.length
            }
        };
        await addFile('metadata.json', `${JSON.stringify(metadata, undefined, 2)}\n`);
        const manifest = {
            schemaVersion: 'flow.workflow-export-manifest/v1',
            packageType: 'flow.workflow',
            workflowId: workflow.id,
            workflowFile: workflowPackagePath,
            exportedAt,
            files: [...files, 'manifest.json'].sort(),
            agents: referencedAgentPaths(workflow),
            contracts: referencedContractPaths(workflow),
            missingAgents,
            missingContracts
        };
        await addFile('manifest.json', `${JSON.stringify(manifest, undefined, 2)}\n`);

        return {
            path: exportDir,
            uri: FileUri.create(exportDir).toString(),
            workflowId: workflow.id,
            manifestPath: path.join(exportDir, 'manifest.json'),
            files: [...files].sort(),
            missingAgents,
            missingContracts
        };
    }

    async exportRun(workspaceRootUri: string | undefined, workflow: FlowWorkflow, run: FlowRun, targetPathOrUri?: string): Promise<FlowRunExportResult> {
        const exportedAt = new Date().toISOString();
        const exportDir = targetPathOrUri
            ? normalizeWindowsDriveLetter(path.resolve(this.fsPath(targetPathOrUri)))
            : path.join(await this.ensureDir(workspaceRootUri, 'exports'), `${sanitizeFileName(run.id)}-${timestampFilePart(exportedAt)}`);
        await fs.rm(exportDir, { recursive: true, force: true });
        await fs.mkdir(exportDir, { recursive: true });

        const files: string[] = [];
        const missingArtifacts: string[] = [];
        const addFile = async (relativePath: string, content: string | Buffer): Promise<void> => {
            const target = safePackagePath(exportDir, relativePath);
            await fs.mkdir(path.dirname(target), { recursive: true });
            await fs.writeFile(target, content);
            files.push(relativePath.split(path.sep).join('/'));
        };
        const copyFile = async (source: string, relativePath: string): Promise<void> => {
            const target = safePackagePath(exportDir, relativePath);
            await fs.mkdir(path.dirname(target), { recursive: true });
            await fs.copyFile(source, target);
            files.push(relativePath.split(path.sep).join('/'));
        };

        const safeRun = redactFlowRunForDisplay(run);
        const runForExport = kernelCompatibleRunExport(workflow, safeRun);
        await addFile('run.json', `${JSON.stringify(runForExport, undefined, 2)}\n`);
        await addFile('events.jsonl', safeRun.events.map(event => JSON.stringify(event)).join('\n') + (safeRun.events.length ? '\n' : ''));
        await addFile('artifacts.json', `${JSON.stringify(safeRun.artifacts, undefined, 2)}\n`);
        await addFile('effects.json', `${JSON.stringify(safeRun.effects, undefined, 2)}\n`);
        const issues = collectRunIssues(safeRun);
        await addFile('issues.json', `${JSON.stringify(issues, undefined, 2)}\n`);
        const capabilities = workflow.requires?.capabilities || [];
        const agents = collectRunAgents(workflow, safeRun);
        const contracts = referencedContractPaths(workflow);
        const memoryWrites = collectRunMemoryWrites(safeRun);
        const finalReport = buildRunExportReport(safeRun, issues, exportedAt, capabilities, agents, contracts, memoryWrites);
        await addFile('capabilities.json', `${JSON.stringify(capabilities, undefined, 2)}\n`);
        await addFile('agents.json', `${JSON.stringify(agents, undefined, 2)}\n`);
        await addFile('contracts.json', `${JSON.stringify(contracts, undefined, 2)}\n`);
        await addFile('memory-writes.json', `${JSON.stringify(memoryWrites, undefined, 2)}\n`);
        await addFile('final-report.json', `${JSON.stringify(finalReport, undefined, 2)}\n`);
        await addFile('final-report.md', renderRunExportReport(finalReport));

        for (const artifact of safeRun.artifacts) {
            const source = this.resolveArtifactSource(workspaceRootUri, run.id, artifact);
            const packagePath = `artifacts/${sanitizeFileName(artifact.stateId || 'state')}/${safeArtifactPackageName(artifact)}`;
            if (source && await fileExists(source)) {
                await copyFile(source, packagePath);
            } else {
                missingArtifacts.push(artifact.uri);
            }
        }

        const manifest = {
            schemaVersion: 'flow.run-export-manifest/v1',
            packageType: 'flow.run',
            runId: run.id,
            workflowId: run.workflowId,
            exportedAt,
            eventCount: run.events.length,
            artifactCount: run.artifacts.length,
            capabilityCount: capabilities.length,
            agentCount: agents.length,
            contractCount: contracts.length,
            effectCount: run.effects.length,
            issueCount: issues.length,
            memoryWriteCount: memoryWrites.length,
            finalReport: {
                json: 'final-report.json',
                markdown: 'final-report.md'
            },
            components: {
                capabilities: 'capabilities.json',
                agents: 'agents.json',
                contracts: 'contracts.json',
                artifacts: 'artifacts.json',
                effects: 'effects.json',
                issues: 'issues.json',
                memoryWrites: 'memory-writes.json'
            },
            files: [...files, 'manifest.json'].sort(),
            missingArtifacts
        };
        await addFile('manifest.json', `${JSON.stringify(manifest, undefined, 2)}\n`);

        return {
            path: exportDir,
            uri: FileUri.create(exportDir).toString(),
            runId: run.id,
            manifestPath: path.join(exportDir, 'manifest.json'),
            files: [...files].sort(),
            missingArtifacts
        };
    }

    async importRun(workspaceRootUri: string | undefined, filePathOrUri: string): Promise<FlowRun> {
        const source = this.fsPath(filePathOrUri);
        const packageSource = await this.runExportDir(source);
        const runFile = path.join(packageSource, 'run.json');
        const eventsFile = path.join(packageSource, 'events.jsonl');
        const manifestFile = path.join(packageSource, 'manifest.json');
        const [kernelRun, events, manifest] = await Promise.all([
            this.readJson<KernelRunState>(runFile),
            this.readJsonLines<KernelEvent>(eventsFile),
            fileExists(manifestFile).then(exists => exists ? this.readJson<Record<string, unknown>>(manifestFile) : undefined)
        ]);
        const workflow = {
            ...kernelRun.workflow,
            id: kernelRun.workflow?.id || kernelRun.workflowId,
            name: kernelRun.workflow?.name || kernelRun.workflowId,
            states: kernelRun.workflow?.states || {},
            transitions: kernelRun.workflow?.transitions || []
        } as FlowWorkflow;
        const importedAt = new Date().toISOString();
        const packageDir = path.join(await this.ensureDir(workspaceRootUri, 'runs'), sanitizeFileName(kernelRun.id), 'import');
        if (path.resolve(packageSource) !== path.resolve(packageDir)) {
            await fs.rm(packageDir, { recursive: true, force: true });
            await copyDirectory(packageSource, packageDir);
        }
        let run = mapKernelRunToFlowRun(workflow, kernelRun.input || '', kernelRun, events, {
            kernelRunId: kernelRun.id,
            storeDir: packageDir
        });
        run = {
            ...run,
            executionMode: 'kernel_external',
            executionModeMessage: 'Imported audit package. This run is read-only.',
            audit: {
                readOnly: true,
                importedAt,
                sourcePath: packageSource,
                packagePath: packageDir,
                workflow: {
                    ...workflow,
                    file: {
                        path: path.join(packageDir, 'run.json'),
                        uri: FileUri.create(path.join(packageDir, 'run.json')).toString(),
                        format: JSON_FORMAT,
                        updatedAt: importedAt,
                        editable: false,
                        unsupportedReason: 'Workflow embedded in an imported run audit package is read-only.'
                    }
                },
                manifest
            },
            artifacts: run.artifacts.map(artifact => ({
                ...artifact,
                uri: this.importedArtifactUri(packageDir, artifact.uri)
            })),
            workloads: run.workloads.map(workload => ({
                ...workload,
                outputArtifacts: workload.outputArtifacts.map(artifact => this.importedArtifactUri(packageDir, artifact))
            }))
        };
        await this.saveRun(workspaceRootUri, run);
        const saved = await this.getRun(workspaceRootUri, run.id);
        if (!saved) {
            throw new Error(`Imported run "${run.id}" could not be reloaded.`);
        }
        return saved;
    }

    async saveWorkflow(
        workspaceRootUri: string | undefined,
        workflow: FlowWorkflow,
        filePathOrUri?: string,
        version: { author?: string; origin?: string; message?: string } = {}
    ): Promise<void> {
        const file = filePathOrUri ? this.fsPath(filePathOrUri) : workflow.file?.path || await this.workflowFile(workspaceRootUri, workflow.id);
        const format = workflowFileFormat(file);
        const before = await this.readWorkflowFile(file).catch(() => undefined);
        if (format === JSON_FORMAT) {
            await this.writeJson(file, stripFileMetadata(workflow));
        } else if (format === YAML_FORMAT) {
            await this.writeYaml(file, stripFileMetadata(workflow));
        } else {
            throw new Error(`Unsupported workflow file format for "${file}". Use .json, .yaml, or .yml.`);
        }
        const saved = await this.readWorkflowFile(file);
        await this.recordWorkflowVersion(workspaceRootUri, saved, before, {
            author: version.author,
            origin: version.origin || (before ? 'save' : 'create'),
            message: version.message
        });
    }

    async listWorkflowVersions(workspaceRootUri: string | undefined, workflowId: string): Promise<FlowWorkflowVersion[]> {
        const dir = await this.workflowHistoryDir(workspaceRootUri, workflowId);
        const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
        const versions: FlowWorkflowVersion[] = [];
        for (const entry of entries) {
            if (entry.isFile() && entry.name.endsWith('.json')) {
                versions.push(await this.readJson<FlowWorkflowVersion>(path.join(dir, entry.name)));
            }
        }
        return versions.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    }

    async restoreWorkflowVersion(
        workspaceRootUri: string | undefined,
        workflowId: string,
        versionId: string,
        options: { author?: string; message?: string } = {}
    ): Promise<FlowWorkflow> {
        const versions = await this.listWorkflowVersions(workspaceRootUri, workflowId);
        const version = versions.find(candidate => candidate.id === versionId);
        if (!version) {
            throw new Error(`Workflow version "${versionId}" was not found for "${workflowId}".`);
        }
        const file = await this.findWorkflowFile(workspaceRootUri, workflowId) || await this.workflowFile(workspaceRootUri, workflowId, version.workflow.file?.format || JSON_FORMAT);
        await this.saveWorkflow(workspaceRootUri, { ...version.workflow, file: undefined }, file, {
            author: options.author,
            origin: 'restore',
            message: options.message || `Restored version ${versionId}`
        });
        const restored = await this.getWorkflow(workspaceRootUri, workflowId);
        if (!restored) {
            throw new Error(`Restored workflow "${workflowId}" could not be reloaded.`);
        }
        return restored;
    }

    async createWorkflowFromTemplate(
        workspaceRootUri: string | undefined,
        templateId: string,
        options: { workflowId?: string; name?: string; description?: string } = {}
    ): Promise<FlowWorkflow> {
        const template = listFlowWorkflowTemplates().find(candidate => candidate.id === templateId);
        if (!template) {
            throw new Error(`Unknown flow workflow template "${templateId}".`);
        }
        const identity = await this.nextWorkflowIdentity(workspaceRootUri, options.workflowId || template.id, options.name || template.name);
        const workflow = instantiateFlowWorkflowTemplate(templateId, {
            id: identity.id,
            name: identity.name,
            description: options.description
        });
        await this.saveWorkflow(workspaceRootUri, workflow, undefined, { origin: 'create', message: `Created from template ${templateId}` });
        const saved = await this.getWorkflow(workspaceRootUri, workflow.id);
        if (!saved) {
            throw new Error(`Created workflow "${workflow.id}" could not be reloaded.`);
        }
        return saved;
    }

    async listRuns(workspaceRootUri?: string): Promise<FlowRun[]> {
        const dir = await this.ensureDir(workspaceRootUri, 'runs');
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const runs: FlowRun[] = [];
        for (const entry of entries) {
            if (entry.isFile() && entry.name.endsWith('.json')) {
                runs.push(await this.readRunFile(path.join(dir, entry.name)));
            }
        }
        return runs.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    }

    async getRun(workspaceRootUri: string | undefined, runId: string): Promise<FlowRun | undefined> {
        const file = await this.runFile(workspaceRootUri, runId);
        try {
            return await this.readRunFile(file);
        } catch {
            return undefined;
        }
    }

    async saveRun(workspaceRootUri: string | undefined, run: FlowRun): Promise<void> {
        const file = await this.runFile(workspaceRootUri, run.id);
        await this.writeJson(file, stripFileMetadata(redactFlowRunForDisplay(run)));
    }

    async writeRunReport(workspaceRootUri: string | undefined, runId: string, relativePath: string, content: string): Promise<string> {
        const dir = path.join(await this.ensureDir(workspaceRootUri, 'runs'), sanitizeFileName(runId), 'final');
        await fs.mkdir(dir, { recursive: true });
        const file = path.join(dir, sanitizeFileName(relativePath || 'report.md'));
        await fs.writeFile(file, redactFlowSecretsText(content) || '', 'utf8');
        return FileUri.create(file).toString();
    }

    async workflowFileMetadata(workspaceRootUri: string | undefined, workflowId: string): Promise<FlowFileMetadata> {
        const file = await this.findWorkflowFile(workspaceRootUri, workflowId) || await this.workflowFile(workspaceRootUri, workflowId);
        const format = workflowFileFormat(file);
        return this.fileMetadata(file, format, format === JSON_FORMAT || format === YAML_FORMAT);
    }

    async runFileMetadata(workspaceRootUri: string | undefined, runId: string): Promise<FlowFileMetadata> {
        return this.fileMetadata(await this.runFile(workspaceRootUri, runId), JSON_FORMAT, true);
    }

    protected async workflowFile(workspaceRootUri: string | undefined, workflowId: string, format: FlowWorkflowFileFormat = JSON_FORMAT): Promise<string> {
        const dir = await this.ensureDir(workspaceRootUri, 'workflows');
        return path.join(dir, `${sanitizeFileName(workflowId)}${workflowExtension(format)}`);
    }

    protected async nextWorkflowIdentity(workspaceRootUri: string | undefined, requestedId: string, requestedName: string): Promise<{ id: string; name: string }> {
        const baseId = sanitizeWorkflowId(requestedId);
        const workflows = await this.listWorkflows(workspaceRootUri);
        const existingIds = new Set(workflows.map(workflow => workflow.id));
        for (let index = 1; ; index++) {
            const id = index === 1 ? baseId : `${baseId}_${index}`;
            const file = await this.workflowFile(workspaceRootUri, id);
            const candidateExists = await fileExists(file);
            if (!existingIds.has(id) && !candidateExists) {
                return {
                    id,
                    name: index === 1 ? requestedName : `${requestedName} ${index}`
                };
            }
        }
    }

    protected async runFile(workspaceRootUri: string | undefined, runId: string): Promise<string> {
        const dir = await this.ensureDir(workspaceRootUri, 'runs');
        return path.join(dir, `${sanitizeFileName(runId)}.json`);
    }

    protected async findWorkflowFile(workspaceRootUri: string | undefined, workflowId: string): Promise<string | undefined> {
        const dir = await this.ensureDir(workspaceRootUri, 'workflows');
        for (const extension of WORKFLOW_EXTENSIONS) {
            const candidate = path.join(dir, `${sanitizeFileName(workflowId)}${extension}`);
            try {
                await fs.access(candidate);
                return candidate;
            } catch {
                // Continue looking for another on-disk representation.
            }
        }
        const workflows = await this.listWorkflows(workspaceRootUri);
        return workflows.find(workflow => workflow.id === workflowId)?.file?.path;
    }

    protected async ensureDir(workspaceRootUri: string | undefined, child: 'workflows' | 'runs' | 'exports' | 'workflow-history'): Promise<string> {
        const root = storageRoot(workspaceRootUri);
        const dir = path.join(root, child);
        await fs.mkdir(dir, { recursive: true });
        return dir;
    }

    protected async readJson<T>(file: string): Promise<T> {
        const content = await fs.readFile(file, 'utf8');
        return JSON.parse(content) as T;
    }

    protected async readJsonLines<T>(file: string): Promise<T[]> {
        const content = await fs.readFile(file, 'utf8');
        return content.split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => JSON.parse(line) as T);
    }

    protected async readWorkflowFile(file: string): Promise<FlowWorkflow> {
        const format = workflowFileFormat(file);
        if (format === JSON_FORMAT) {
            return {
                ...await this.readJson<FlowWorkflow>(file),
                file: await this.fileMetadata(file, format, true)
            };
        }
        if (format === YAML_FORMAT) {
            const content = await fs.readFile(file, 'utf8');
            const workflow = yaml.load(content) as Partial<FlowWorkflow> | undefined;
            if (!workflow || typeof workflow !== 'object') {
                throw new Error(`YAML workflow "${file}" must contain a mapping object.`);
            }
            return {
                ...(workflow as FlowWorkflow),
                version: workflow.version || 'flow.workflow/v1',
                id: workflow.id || path.basename(file, path.extname(file)),
                name: workflow.name || path.basename(file),
                states: workflow.states || {},
                transitions: workflow.transitions || [],
                file: await this.fileMetadata(file, format, true)
            };
        }
        throw new Error(`Unsupported workflow file format for "${file}". Use .json, .yaml, or .yml.`);
    }

    protected async readRunFile(file: string): Promise<FlowRun> {
        return {
            ...await this.readJson<FlowRun>(file),
            file: await this.fileMetadata(file, JSON_FORMAT, true)
        };
    }

    protected async writeJson(file: string, value: unknown): Promise<void> {
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, `${JSON.stringify(value, undefined, 2)}\n`, 'utf8');
    }

    protected async writeYaml(file: string, value: unknown): Promise<void> {
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, yaml.dump(value, { lineWidth: 120, noRefs: true, sortKeys: false }), 'utf8');
    }

    protected async recordWorkflowVersion(
        workspaceRootUri: string | undefined,
        workflow: FlowWorkflow,
        before: FlowWorkflow | undefined,
        options: { author?: string; origin?: string; message?: string }
    ): Promise<void> {
        const createdAt = new Date().toISOString();
        const idBase = `${timestampFilePart(createdAt)}-${sanitizeFileName(options.origin || 'save')}`;
        const diff = before ? compareFlowWorkflowStructure(before, workflow).items : [{
            kind: 'source' as const,
            change: 'added' as const,
            id: workflow.id,
            summary: 'Workflow created'
        }];
        const version: FlowWorkflowVersion = {
            id: idBase,
            workflowId: workflow.id,
            createdAt,
            author: options.author || process.env.USERNAME || process.env.USER || 'Flow',
            origin: options.origin || 'save',
            message: options.message,
            workflow: stripFileMetadata(workflow) as FlowWorkflow,
            file: workflow.file,
            diff
        };
        const dir = await this.workflowHistoryDir(workspaceRootUri, workflow.id);
        version.id = await this.nextWorkflowVersionId(dir, idBase);
        await this.writeJson(path.join(dir, `${version.id}.json`), version);
    }

    protected async nextWorkflowVersionId(dir: string, idBase: string): Promise<string> {
        for (let index = 0; ; index++) {
            const id = index === 0 ? idBase : `${idBase}-${index + 1}`;
            if (!await fileExists(path.join(dir, `${id}.json`))) {
                return id;
            }
        }
    }

    protected async workflowHistoryDir(workspaceRootUri: string | undefined, workflowId: string): Promise<string> {
        return path.join(await this.ensureDir(workspaceRootUri, 'workflow-history'), sanitizeFileName(workflowId));
    }

    protected async fileMetadata(file: string, format: FlowWorkflowFileFormat, editable: boolean, unsupportedReason?: string): Promise<FlowFileMetadata> {
        const stat = await fs.stat(file).catch(() => undefined);
        return {
            path: file,
            uri: FileUri.create(file).toString(),
            format,
            updatedAt: (stat?.mtime || new Date()).toISOString(),
            editable,
            unsupportedReason
        };
    }

    protected fsPath(filePathOrUri: string): string {
        if (filePathOrUri.startsWith('file:')) {
            return FileUri.fsPath(filePathOrUri);
        }
        return filePathOrUri;
    }

    protected async readImportWorkflow(source: string): Promise<FlowWorkflow> {
        const stat = await fs.stat(source);
        if (stat.isDirectory()) {
            return this.readWorkflowFromRunExport(path.join(source, 'run.json'));
        }
        if (path.basename(source).toLowerCase() === 'run.json') {
            return this.readWorkflowFromRunExport(source);
        }
        if (isWorkflowFile(path.basename(source))) {
            return this.openWorkflowFile(source);
        }
        throw new Error(`Unsupported workflow import source "${source}". Use a workflow .json/.yaml/.yml file, a CLI export directory, or run.json.`);
    }

    protected async readWorkflowFromRunExport(runFile: string): Promise<FlowWorkflow> {
        const run = await this.readJson<{ workflow?: FlowWorkflow; workflowId?: string }>(runFile);
        if (!run.workflow) {
            throw new Error(`Run export "${runFile}" does not contain an embedded workflow.`);
        }
        return {
            ...run.workflow,
            id: run.workflow.id || run.workflowId || path.basename(path.dirname(runFile)),
            name: run.workflow.name || run.workflow.id || run.workflowId || path.basename(path.dirname(runFile)),
            states: run.workflow.states || {},
            transitions: run.workflow.transitions || [],
            file: undefined
        };
    }

    protected async importWorkflowFormat(source: string): Promise<FlowWorkflowFileFormat> {
        const stat = await fs.stat(source);
        if (stat.isDirectory() || path.basename(source).toLowerCase() === 'run.json') {
            return JSON_FORMAT;
        }
        const format = workflowFileFormat(source);
        return format === YAML_FORMAT ? YAML_FORMAT : JSON_FORMAT;
    }

    protected async runExportDir(source: string): Promise<string> {
        const stat = await fs.stat(source);
        const dir = stat.isDirectory() ? source : path.dirname(source);
        const missing = [];
        for (const file of ['run.json', 'events.jsonl']) {
            if (!await fileExists(path.join(dir, file))) {
                missing.push(file);
            }
        }
        if (missing.length > 0) {
            throw new Error(`Run import source "${source}" is missing ${missing.join(', ')}.`);
        }
        return dir;
    }

    protected importedArtifactUri(packageDir: string, artifactPath: string): string {
        if (/^[a-z][a-z0-9+.-]*:/i.test(artifactPath)) {
            return artifactPath;
        }
        const normalized = path.normalize(artifactPath).replace(/^(\.\.[\\/])+/, '');
        return FileUri.create(path.join(packageDir, normalized)).toString();
    }

    protected resolveArtifactSource(workspaceRootUri: string | undefined, runId: string, artifact: FlowArtifact): string | undefined {
        if (artifact.uri.startsWith('file:')) {
            return FileUri.fsPath(artifact.uri);
        }
        if (artifact.uri.startsWith('flow:')) {
            const parsed = new URL(artifact.uri);
            const artifactRunId = parsed.hostname || runId;
            const parts = parsed.pathname.split('/').filter(Boolean);
            if (parts.length >= 2) {
                const [stateId, ...artifactPath] = parts;
                return path.join(storageRoot(workspaceRootUri), 'runs', sanitizeFileName(artifactRunId), sanitizeFileName(stateId), 'output', 'artifacts', ...artifactPath.map(sanitizeFileName));
            }
        }
        if (!/^[a-z][a-z0-9+.-]*:/i.test(artifact.uri)) {
            const workspaceRoot = workspaceRootUri ? FileUri.fsPath(workspaceRootUri) : process.cwd();
            return safeExistingSource(storageRoot(workspaceRootUri), artifact.uri) || safeExistingSource(workspaceRoot, artifact.uri);
        }
        return undefined;
    }
}

function storageRoot(workspaceRootUri?: string): string {
    if (workspaceRootUri) {
        return path.join(FileUri.fsPath(workspaceRootUri), '.theia', 'flow');
    }
    return path.join(os.homedir(), '.theia', 'flow');
}

function sanitizeFileName(value: string): string {
    return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function sanitizeWorkflowId(value: string): string {
    return sanitizeFileName(value.trim().toLowerCase().replace(/\s+/g, '_')) || 'workflow';
}

async function fileExists(file: string): Promise<boolean> {
    try {
        await fs.access(file);
        return true;
    } catch {
        return false;
    }
}

function isWorkflowFile(fileName: string): boolean {
    return WORKFLOW_EXTENSIONS.includes(path.extname(fileName).toLowerCase());
}

function isMarkdownPath(value: string): boolean {
    return MARKDOWN_EXTENSIONS.has(path.extname(value).toLowerCase());
}

function workflowFileFormat(file: string): FlowWorkflowFileFormat {
    const extension = path.extname(file).toLowerCase();
    if (extension === '.json') {
        return JSON_FORMAT;
    }
    if (extension === '.yaml' || extension === '.yml') {
        return YAML_FORMAT;
    }
    return UNKNOWN_FORMAT;
}

async function copyDirectory(source: string, target: string): Promise<void> {
    await fs.mkdir(target, { recursive: true });
    const entries = await fs.readdir(source, { withFileTypes: true });
    for (const entry of entries) {
        const sourcePath = path.join(source, entry.name);
        const targetPath = path.join(target, entry.name);
        if (entry.isDirectory()) {
            await copyDirectory(sourcePath, targetPath);
        } else if (entry.isFile()) {
            await fs.copyFile(sourcePath, targetPath);
        }
    }
}

function workflowExtension(format: FlowWorkflowFileFormat): '.json' | '.yaml' {
    return format === YAML_FORMAT ? '.yaml' : '.json';
}

function stripFileMetadata<T extends { file?: FlowFileMetadata }>(value: T): Omit<T, 'file'> {
    const serializable: Partial<T> = { ...value };
    delete serializable.file;
    return serializable as Omit<T, 'file'>;
}

function referencedAgentPaths(workflow: FlowWorkflow): string[] {
    const paths = Object.values(workflow.agents || {}).filter(value => typeof value === 'string' && isMarkdownPath(value));
    const visitState = (state: FlowWorkflowState): void => {
        if (state.agent && isMarkdownPath(state.agent)) {
            paths.push(state.agent);
        }
        for (const branch of Object.values(state.branches || {})) {
            visitState(branch);
        }
    };
    for (const state of Object.values(workflow.states || {})) {
        visitState(state);
    }
    return uniqueSorted(paths);
}

function referencedContractPaths(workflow: FlowWorkflow): string[] {
    const paths: string[] = [];
    const visitState = (state: FlowWorkflowState): void => {
        for (const value of [...(state.outputs || []), ...(state.input?.include || [])]) {
            if (isExportedContractPath(value)) {
                paths.push(value);
            }
        }
        for (const branch of Object.values(state.branches || {})) {
            visitState(branch);
        }
    };
    for (const state of Object.values(workflow.states || {})) {
        visitState(state);
    }
    for (const transition of workflow.transitions || []) {
        collectContractPathsFromValue(transition.guard, paths);
    }
    return uniqueSorted(paths);
}

function collectContractPathsFromValue(value: unknown, paths: string[]): void {
    if (typeof value === 'string') {
        if (isExportedContractPath(value)) {
            paths.push(value);
        }
        return;
    }
    if (Array.isArray(value)) {
        for (const item of value) {
            collectContractPathsFromValue(item, paths);
        }
        return;
    }
    if (value && typeof value === 'object') {
        for (const item of Object.values(value as Record<string, unknown>)) {
            collectContractPathsFromValue(item, paths);
        }
    }
}

function isExportedContractPath(value: string): boolean {
    const normalized = value.replace(/\\/g, '/');
    return normalized.startsWith('contracts/') || normalized.startsWith('schemas/');
}

function uniqueSorted(values: string[]): string[] {
    return [...new Set(values.map(value => value.replace(/\\/g, '/')))].sort();
}

function collectRunIssues(run: FlowRun): Array<Record<string, unknown>> {
    const issues: Array<Record<string, unknown>> = [];
    for (const workload of run.workloads) {
        for (const issue of workload.issues) {
            issues.push({
                runId: run.id,
                workloadId: workload.id,
                stateId: workload.stateId,
                summary: issue
            });
        }
        for (const issue of workload.outputEnvelope?.issues || []) {
            issues.push({
                ...issue,
                runId: run.id,
                workloadId: workload.id,
                stateId: workload.stateId
            });
        }
    }
    for (const event of run.events) {
        if (event.type === 'issue.recorded') {
            issues.push({
                runId: run.id,
                eventId: event.id,
                stateId: event.stateId,
                workloadId: event.workloadId,
                ...(event.payload || {}),
                summary: event.message
            });
        }
    }
    return issues;
}

function collectRunAgents(workflow: FlowWorkflow, run: FlowRun): Array<Record<string, unknown>> {
    interface RunAgentExport {
        id: string;
        path?: string;
        states: string[];
        workloads: string[];
    }
    const agents = new Map<string, RunAgentExport>();
    const ensure = (id: string | undefined): RunAgentExport => {
        const agentId = id || '(unassigned)';
        const existing = agents.get(agentId);
        if (existing) {
            return existing;
        }
        const created: RunAgentExport = {
            id: agentId,
            path: workflow.agents?.[agentId],
            states: [],
            workloads: []
        };
        agents.set(agentId, created);
        return created;
    };
    for (const id of Object.keys(workflow.agents || {})) {
        ensure(id);
    }
    for (const workload of run.workloads) {
        const agent = ensure(workload.agent);
        pushUnique(agent.states, workload.stateId);
        pushUnique(agent.workloads, workload.id);
    }
    return [...agents.values()].map(agent => ({
        ...agent,
        states: [...agent.states].sort(),
        workloads: [...agent.workloads].sort()
    })).sort((left, right) => left.id.localeCompare(right.id));
}

function collectRunMemoryWrites(run: FlowRun): Array<Record<string, unknown>> {
    const writes: Array<Record<string, unknown>> = [
        ...(run.memoryWrites || []).map(write => ({ ...write, source: 'run.memoryWrites' }))
    ];
    for (const effect of run.effects) {
        if (effect.kind === 'memory_write' || effect.type === 'memory.write') {
            writes.push({ ...effect, source: 'effects' });
        }
    }
    for (const event of run.events) {
        if (event.type.startsWith('memory_write.')) {
            writes.push({
                ...(event.payload || {}),
                id: event.id,
                runId: event.runId,
                stateId: event.stateId,
                workloadId: event.workloadId,
                timestamp: event.timestamp,
                source: 'events'
            });
        }
    }
    return writes;
}

function buildRunExportReport(
    run: FlowRun,
    issues: Array<Record<string, unknown>>,
    exportedAt: string,
    capabilities: string[],
    agents: Array<Record<string, unknown>>,
    contracts: string[],
    memoryWrites: Array<Record<string, unknown>>
): Record<string, unknown> {
    return {
        schemaVersion: 'flow.run-final-report/v1',
        runId: run.id,
        workflowId: run.workflowId,
        status: run.status,
        prompt: run.prompt,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        exportedAt,
        capabilities,
        agents,
        contracts,
        artifacts: run.artifacts,
        effects: run.effects,
        issues,
        memoryWrites,
        secondRunSuggestion: run.secondRunSuggestion
    };
}

function kernelCompatibleRunExport(workflow: FlowWorkflow, run: FlowRun): Record<string, unknown> {
    return {
        id: run.id,
        workflowId: run.workflowId,
        workflow: stripFileMetadata(workflow),
        input: run.prompt,
        status: run.status === 'waiting_gate' ? 'waiting' : run.status,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        activeStates: Object.fromEntries(run.currentStateIds.map(stateId => [stateId, true])),
        completedStates: Object.fromEntries(Object.entries(run.stateStatuses).filter(([, status]) => status === 'done').map(([stateId]) => [stateId, true])),
        workloads: Object.fromEntries(run.workloads.map(workload => [workload.id, {
            id: workload.id,
            runId: workload.runId,
            stateId: workload.stateId,
            agent: workload.agent,
            status: workload.status === 'done' ? 'completed' : workload.status === 'running' ? 'started' : workload.status,
            attempt: workload.attempt,
            previousWorkloadId: workload.previousWorkloadId,
            input: { include: workload.inputArtifacts },
            outputs: workload.outputArtifacts,
            createdAt: workload.createdAt,
            completedAt: workload.status === 'done' ? workload.updatedAt : undefined
        }])),
        artifacts: Object.fromEntries(run.artifacts.map(artifact => [artifact.id, {
            id: artifact.id,
            type: artifact.kind,
            path: artifact.uri,
            stateId: artifact.stateId,
            createdAt: artifact.createdAt
        }])),
        effects: run.effects.map(effect => ({
            id: effect.id,
            type: effect.type || effect.kind,
            path: effect.path || effect.artifactPath,
            command: effect.command,
            hashBefore: effect.hashBefore,
            hashAfter: effect.hashAfter,
            patch: effect.patch,
            summary: effect.summary,
            status: effect.status,
            approvalPolicy: effect.approvalPolicy,
            stateId: effect.stateId
        })),
        signals: Object.fromEntries(run.signals.map(signal => [signal.key, signal.value])),
        flow: stripFileMetadata(run)
    };
}

function renderRunExportReport(report: Record<string, unknown>): string {
    const artifacts = report.artifacts as FlowArtifact[];
    const effects = report.effects as FlowEffect[];
    const issues = report.issues as Array<Record<string, unknown>>;
    const capabilities = report.capabilities as string[];
    const agents = report.agents as Array<Record<string, unknown>>;
    const contracts = report.contracts as string[];
    const memoryWrites = report.memoryWrites as Array<Record<string, unknown>>;
    return [
        '# Flow Run Export',
        '',
        `Run: ${report.runId}`,
        `Workflow: ${report.workflowId}`,
        `Status: ${report.status}`,
        `Created: ${report.createdAt}`,
        `Updated: ${report.updatedAt}`,
        `Exported: ${report.exportedAt}`,
        '',
        '## Contents',
        '',
        `- Capabilities: ${capabilities.length}`,
        `- Agents: ${agents.length}`,
        `- Contracts: ${contracts.length}`,
        `- Artifacts: ${artifacts.length}`,
        `- Effects: ${effects.length}`,
        `- Issues: ${issues.length}`,
        `- Memory writes: ${memoryWrites.length}`,
        '',
        '## Capabilities',
        '',
        ...(capabilities.length ? capabilities.map(capability => `- ${capability}`) : ['- None']),
        '',
        '## Agents',
        '',
        ...(agents.length ? agents.map(agent => `- ${String(agent.id)}${agent.path ? `: ${String(agent.path)}` : ''}`) : ['- None']),
        '',
        '## Contracts',
        '',
        ...(contracts.length ? contracts.map(contract => `- ${contract}`) : ['- None']),
        '',
        '## Artifacts',
        '',
        ...(artifacts.length ? artifacts.map(artifact => `- ${artifact.kind}: ${artifact.summary || artifact.uri}`) : ['- None']),
        '',
        '## Effects',
        '',
        ...(effects.length ? effects.map(effect => `- ${effect.kind}/${effect.status}: ${effect.summary}`) : ['- None']),
        '',
        '## Memory Writes',
        '',
        ...(memoryWrites.length ? memoryWrites.map(write => `- ${String(write.id || write.key || write.source || 'memory.write')}`) : ['- None']),
        '',
        '## Issues',
        '',
        ...(issues.length ? issues.map(issue => `- ${String(issue.severity || 'issue')}: ${String(issue.summary || issue.type || 'Recorded issue')}`) : ['- None'])
    ].join('\n');
}

function pushUnique(values: string[], value: string | undefined): void {
    if (value && !values.includes(value)) {
        values.push(value);
    }
}

function safeArtifactPackageName(artifact: FlowArtifact): string {
    const uriPath = artifact.uri.startsWith('file:')
        ? FileUri.fsPath(artifact.uri)
        : artifact.uri.replace(/^flow:\/\/[^/]+\//, '');
    const base = path.basename(uriPath) || `${artifact.id}.artifact`;
    return `${sanitizeFileName(artifact.id)}-${sanitizeFileName(base)}`;
}

function safeExistingSource(root: string, relativePath: string): string | undefined {
    if (!relativePath || path.isAbsolute(relativePath) || relativePath.split(/[\\/]+/).some(segment => segment === '..')) {
        return undefined;
    }
    const file = path.resolve(root, relativePath);
    const relative = path.relative(path.resolve(root), file);
    if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
        return undefined;
    }
    return file;
}

async function firstExistingSource(roots: string[], relativePath: string): Promise<string | undefined> {
    for (const root of roots) {
        const source = safeExistingSource(root, relativePath);
        if (source && await fileExists(source)) {
            return source;
        }
    }
    return undefined;
}

function safePackagePath(root: string, relativePath: string): string {
    const file = safeExistingSource(root, relativePath);
    if (!file) {
        throw new Error(`Export package path escapes the workflow export: ${relativePath}`);
    }
    return file;
}

function timestampFilePart(value: string): string {
    return value.replace(/[:.]/g, '-');
}

function normalizeWindowsDriveLetter(value: string): string {
    return value.replace(/^[a-z]:/, drive => drive.toUpperCase());
}

