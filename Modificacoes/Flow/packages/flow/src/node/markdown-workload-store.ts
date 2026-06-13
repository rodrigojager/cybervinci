import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { injectable } from '@theia/core/shared/inversify';
import {
    FlowArtifact,
    FlowContextPack,
    FlowEffect,
    FlowRun,
    FlowWorkflow,
    FlowWorkflowState,
    FlowWorkload,
    FlowWorkloadOutputArtifact,
    FlowWorkloadOutputEnvelope,
    FlowWorkloadResultEffect,
    FlowWorkloadResultIssue,
    FlowSizeLimits,
    MemoryCandidate,
    limitFlowJsonString,
    redactFlowSecretsText,
    redactFlowSecretsValue,
    truncateFlowText
} from '../common';
import { splitFlowRelativePath } from './flow-path-policy';

interface AggregatedIssue extends FlowWorkloadResultIssue {
    runId: string;
    workloadId: string;
    stateId: string;
    severity: 'blocking' | 'non_blocking' | 'followup';
    sourceSeverity?: string;
}

interface WorkloadAuditLink {
    id: string;
    kind: string;
    uri: string;
    path: string;
    artifactId?: string;
    effectIds?: string[];
    issueCount?: number;
    memoryCandidateIds?: string[];
    source?: string;
}

interface WorkloadAuditLinks {
    schemaVersion: 'flow.workload.audit-links/v1';
    runId: string;
    workflowId: string;
    stateId: string;
    workloadId: string;
    links: WorkloadAuditLink[];
}

@injectable()
export class MarkdownWorkloadStore {

    async materializeRun(workspaceRootUri: string | undefined, workflow: FlowWorkflow, run: FlowRun): Promise<FlowRun> {
        const root = runRoot(workspaceRootUri, run.id);
        await fs.mkdir(root, { recursive: true });
        const artifacts = new Map(run.artifacts.map(artifact => [artifact.id, artifact]));
        const effects = new Map(run.effects.map(effect => [effect.id, effect]));
        const workloads = [...run.workloads];

        for (const workload of workloads) {
            const state = findState(workflow, workload.stateId);
            const workloadDir = path.join(root, 'workloads', sanitizeFileName(workload.id));
            await this.writeInputEnvelope(workloadDir, workflow, run, workload);
            const outputEnvelope = await this.writeOutputEnvelope(workloadDir, workflow, run, workload, state);
            this.registerOutputArtifacts(workloadDir, run, workload, outputEnvelope, artifacts);
            await this.writeAuditLinks(workloadDir, workflow, run, workload, outputEnvelope, artifacts);
            this.registerEnvelopeEffect(workload, run, effects);
        }

        await this.writeAggregatedIssues(root, run.id, workloads);

        return {
            ...run,
            workloads,
            artifacts: [...artifacts.values()],
            effects: [...effects.values()]
        };
    }

    protected async writeInputEnvelope(workloadDir: string, workflow: FlowWorkflow, run: FlowRun, workload: FlowWorkload): Promise<void> {
        const inputDir = path.join(workloadDir, 'input');
        await fs.mkdir(path.join(inputDir, 'artifacts'), { recursive: true });
        await fs.writeFile(path.join(inputDir, 'prompt.md'), truncateFlowText(redactFlowSecretsText(run.prompt) || '', FlowSizeLimits.promptBytes, 'prompt'), 'utf8');
        await fs.writeFile(path.join(inputDir, 'context-pack.md'), renderContextPack(resolveContextPackForWorkload(run, workload), workflow, workload), 'utf8');
        await fs.writeFile(path.join(inputDir, 'work-order.md'), renderWorkOrder(workflow, workload), 'utf8');

        for (const included of workload.inputArtifacts) {
            const targetFile = path.join(inputDir, 'artifacts', ...splitArtifactPath(included));
            const sourceFile = findInputArtifactPath(run, included);
            if (!sourceFile) {
                continue;
            }
            const content = await readTextFile(sourceFile);
            if (content === undefined) {
                continue;
            }
            await fs.mkdir(path.dirname(targetFile), { recursive: true });
            await fs.writeFile(targetFile, content, 'utf8');
        }
    }

    protected async writeOutputEnvelope(
        workloadDir: string,
        workflow: FlowWorkflow,
        run: FlowRun,
        workload: FlowWorkload,
        state: FlowWorkflowState | undefined
    ): Promise<FlowWorkloadOutputEnvelope> {
        const outputDir = path.join(workloadDir, 'output');
        const artifactsDir = path.join(outputDir, 'artifacts');
        await fs.mkdir(artifactsDir, { recursive: true });

        const expectedOutputs = state?.outputs || [];
        const stateEffects = run.effects.filter(effect => effect.stateId === workload.stateId);
        const stateSignals = run.signals.filter(signal => signal.stateId === workload.stateId);
        const stateMemoryCandidates = (run.memoryCandidates || []).filter(candidate => candidate.stateId === workload.stateId);
        const outputEnvelope = resolveWorkloadOutputEnvelope(
            workload,
            expectedOutputs,
            stateEffects,
            stateSignals,
            stateMemoryCandidates
        );

        for (const output of outputEnvelope.artifacts) {
            const artifactFile = path.join(artifactsDir, ...splitArtifactPath(output.path));
            await fs.mkdir(path.dirname(artifactFile), { recursive: true });
            await writeFileIfMissing(artifactFile, renderArtifact(workflow, run, workload, output.path));
        }

        await fs.writeFile(path.join(outputDir, 'report.md'), truncateFlowText(renderReport(workflow, run, workload, outputEnvelope), FlowSizeLimits.reportBytes, 'report'), 'utf8');
        await fs.writeFile(path.join(outputDir, 'result.json'), limitFlowJsonString(redactFlowSecretsValue(outputEnvelope), FlowSizeLimits.resultJsonBytes, 'result.json'), 'utf8');
        await fs.writeFile(path.join(outputDir, 'effects.json'), `${JSON.stringify(redactFlowSecretsValue(outputEnvelope.effects), undefined, 2)}\n`, 'utf8');
        await fs.writeFile(path.join(outputDir, 'signals.json'), `${JSON.stringify(redactFlowSecretsValue(outputEnvelope.signals), undefined, 2)}\n`, 'utf8');
        await fs.writeFile(path.join(outputDir, 'issues.jsonl'), outputEnvelope.issues.map(issue => JSON.stringify(redactFlowSecretsValue(issue))).join('\n'), 'utf8');
        await fs.writeFile(
            path.join(outputDir, 'memory-candidates.jsonl'),
            (outputEnvelope.memoryCandidates || []).map(candidate => JSON.stringify(redactFlowSecretsValue(candidate))).join('\n'),
            'utf8'
        );

        return outputEnvelope;
    }

    protected async writeAuditLinks(
        workloadDir: string,
        workflow: FlowWorkflow,
        run: FlowRun,
        workload: FlowWorkload,
        outputEnvelope: FlowWorkloadOutputEnvelope,
        artifacts: Map<string, FlowArtifact>
    ): Promise<void> {
        const auditFile = path.join(workloadDir, 'output', 'audit-links.json');
        const links = buildAuditLinks(workloadDir, workflow, run, workload, outputEnvelope);
        await fs.writeFile(auditFile, limitFlowJsonString(redactFlowSecretsValue(links), FlowSizeLimits.resultJsonBytes, 'audit-links.json'), 'utf8');

        const artifactId = stableId('artifact', run.id, workload.id, 'audit-links.json');
        artifacts.set(artifactId, {
            id: artifactId,
            runId: run.id,
            stateId: workload.stateId,
            uri: FileUri.create(auditFile).toString(),
            kind: 'other',
            summary: `Audit links for ${workload.stateId}.`,
            createdAt: run.updatedAt
        });
        addUnique(workload.outputArtifacts, FileUri.create(auditFile).toString());
    }

    protected registerOutputArtifacts(
        workloadDir: string,
        run: FlowRun,
        workload: FlowWorkload,
        outputEnvelope: FlowWorkloadOutputEnvelope,
        artifacts: Map<string, FlowArtifact>
    ): void {
        const now = run.updatedAt;
        const reportFile = path.join(workloadDir, 'output', 'report.md');
        const reportId = stableId('artifact', run.id, workload.id, 'report.md');
        artifacts.set(reportId, {
            id: reportId,
            runId: run.id,
            stateId: workload.stateId,
            uri: FileUri.create(reportFile).toString(),
            kind: 'report',
            summary: `Markdown report for ${workload.stateId}.`,
            createdAt: now
        });
        workload.reportUri = FileUri.create(reportFile).toString();
        addUnique(workload.outputArtifacts, workload.reportUri);

        for (const output of outputEnvelope.artifacts) {
            const outputFile = path.join(workloadDir, 'output', 'artifacts', ...splitArtifactPath(output.path));
            const artifactId = output.id || stableId('artifact', run.id, workload.id, output.path);
            artifacts.set(artifactId, {
                id: artifactId,
                runId: run.id,
                stateId: workload.stateId,
                uri: FileUri.create(outputFile).toString(),
                kind: artifactKindFromPath(output.path),
                summary: output.path,
                createdAt: now
            });
            addUnique(workload.outputArtifacts, FileUri.create(outputFile).toString());
        }
    }

    protected registerEnvelopeEffect(workload: FlowWorkload, run: FlowRun, effects: Map<string, FlowEffect>): void {
        const effectId = stableId('effect', run.id, workload.id, 'workload-envelope');
        effects.set(effectId, {
            id: effectId,
            runId: run.id,
            stateId: workload.stateId,
            kind: 'file_write',
            status: 'applied',
            summary: `Materialized Markdown workload envelope for ${workload.stateId}.`
        });
        addUnique(workload.effectIds, effectId);
    }

    protected async writeAggregatedIssues(root: string, runId: string, workloads: FlowWorkload[]): Promise<void> {
        const aggregate = await aggregateIssues(root, runId, workloads);
        const issuesDir = path.join(root, 'issues');
        await fs.mkdir(issuesDir, { recursive: true });
        await fs.writeFile(path.join(issuesDir, 'issues.jsonl'), renderJsonLines(aggregate.all), 'utf8');
        await fs.writeFile(path.join(issuesDir, 'blocking.jsonl'), renderJsonLines(aggregate.blocking), 'utf8');
        await fs.writeFile(path.join(issuesDir, 'non_blocking.jsonl'), renderJsonLines(aggregate.nonBlocking), 'utf8');
        await fs.writeFile(path.join(issuesDir, 'followup.jsonl'), renderJsonLines(aggregate.followup), 'utf8');
        await fs.writeFile(path.join(issuesDir, 'summary.json'), `${JSON.stringify({
            runId,
            counts: {
                all: aggregate.all.length,
                blocking: aggregate.blocking.length,
                non_blocking: aggregate.nonBlocking.length,
                followup: aggregate.followup.length
            },
            blocking: aggregate.blocking,
            non_blocking: aggregate.nonBlocking,
            followup: aggregate.followup
        }, undefined, 2)}\n`, 'utf8');
    }
}

function resolveWorkloadOutputEnvelope(
    workload: FlowWorkload,
    expectedOutputs: string[],
    stateEffects: FlowEffect[],
    stateSignals: Array<{ key: string; value: string | number | boolean }>,
    memoryCandidates: MemoryCandidate[]
): FlowWorkloadOutputEnvelope {
    const fallbackOutputs = expectedOutputs.length > 0 ? expectedOutputs : ['report.md'];
    const fallbackArtifacts = fallbackOutputs.map(output => ({
        id: stableId('artifact', workload.runId, workload.id, output),
        path: output,
        type: flowArtifactKind(output)
    }));
    const fallbackSignals = Object.fromEntries(stateSignals.map(signal => [signal.key, signal.value]));
    const fallbackIssues = workload.issues.map(issue => ({
        severity: 'non_blocking',
        type: 'workload_issue',
        summary: issue
    }));
    const fallbackEffects = stateEffects.map(effect => ({
        type: effect.type || effect.kind,
        summary: effect.summary,
        path: effect.path,
        command: effect.command,
        cwd: effect.cwd,
        env: effect.env,
        timeoutMs: effect.timeoutMs,
        exitCode: effect.exitCode,
        stdout: effect.stdout,
        stderr: effect.stderr,
        timedOut: effect.timedOut,
        hashBefore: effect.hashBefore,
        hashAfter: effect.hashAfter,
        patch: effect.patch,
        approvalPolicy: effect.approvalPolicy,
        status: effect.status
    }));
    const fallbackResult = {
        status: normalizeWorkloadStatus(workload.status),
        summary: `Workload ${workload.id} for state ${workload.stateId} is ${workload.status}.`,
        artifacts: fallbackArtifacts,
        signals: fallbackSignals,
        issues: fallbackIssues
    };

    if (!workload.outputEnvelope) {
        return {
            status: normalizeWorkloadStatus(workload.status),
            result: fallbackResult,
            artifacts: fallbackArtifacts,
            effects: fallbackEffects,
            signals: fallbackSignals,
            issues: fallbackIssues,
            report: '',
            memoryCandidates
        };
    }

    const envelope = workload.outputEnvelope;
    const status = normalizeWorkloadStatus(envelope.status || workload.status);
    const artifacts = normalizeOutputArtifacts(workload.runId, workload.id, envelope.artifacts, fallbackArtifacts);
    const resultArtifacts = normalizeOutputArtifacts(
        workload.runId,
        workload.id,
        envelope.result?.artifacts,
        artifacts
    );
    const signals = Object.keys(envelope.signals || {}).length ? envelope.signals : fallbackSignals;
    const resultSignals = envelope.result && Object.keys(envelope.result.signals || {}).length
        ? envelope.result.signals
        : signals;
    const issues = envelope.issues?.length ? normalizeOutputIssues(envelope.issues) : fallbackIssues;
    const resultIssues = envelope.result?.issues?.length ? normalizeOutputIssues(envelope.result.issues) : issues;
    const effects = envelope.effects?.length ? normalizeOutputEffects(envelope.effects) : fallbackEffects;

    return {
        status,
        result: {
            status: normalizeWorkloadStatus(envelope.result?.status || status),
            summary: toTrimmedString(envelope.result?.summary) || fallbackResult.summary,
            artifacts: resultArtifacts,
            signals: resultSignals,
            issues: resultIssues
        },
        artifacts,
        effects,
        signals,
        issues,
        report: toTrimmedString(envelope.report) || fallbackResult.summary,
        memoryCandidates: normalizeMemoryCandidates(envelope.memoryCandidates, memoryCandidates)
    };
}

function normalizeOutputArtifacts(
    runId: string,
    workloadId: string,
    source: FlowWorkloadOutputArtifact[] | undefined,
    fallback: FlowWorkloadOutputArtifact[]
): FlowWorkloadOutputArtifact[] {
    const entries = source && source.length ? source : fallback;
    const byPath = new Map<string, FlowWorkloadOutputArtifact>();
    for (const entry of entries) {
        const pathValue = toTrimmedString(entry?.path) || fallback[0]?.path;
        if (!pathValue) {
            continue;
        }
        const normalizedPath = normalizeArtifactPath(pathValue);
        if (byPath.has(normalizedPath)) {
            continue;
        }
        byPath.set(normalizedPath, {
            id: toTrimmedString(entry?.id) || stableId('artifact', runId, workloadId, pathValue),
            path: pathValue,
            type: toTrimmedString(entry?.type) || flowArtifactKind(pathValue),
            hash: toTrimmedString(entry?.hash) || undefined
        });
    }
    return [...byPath.values()];
}

function normalizeOutputEffects(effects: unknown[]): FlowWorkloadResultEffect[] {
    return effects.filter(isRecord).map(effect => ({
        type: toTrimmedString(effect.type) || 'other',
        summary: toTrimmedString(effect.summary) || toTrimmedString(effect.type) || 'workload effect',
        path: toTrimmedString(effect.path),
        content: toOptionalString(effect.content),
        command: toTrimmedString(effect.command),
        cwd: toTrimmedString(effect.cwd),
        env: normalizeEffectEnv(effect.env),
        allowedEnv: normalizeStringArray(effect.allowedEnv),
        allowedCommands: normalizeStringArray(effect.allowedCommands),
        timeoutMs: normalizeOptionalNumber(effect.timeoutMs),
        exitCode: normalizeOptionalNumber(effect.exitCode),
        stdout: truncateFlowText(toTrimmedString(effect.stdout), FlowSizeLimits.commandOutputBytes, 'command stdout'),
        stderr: truncateFlowText(toTrimmedString(effect.stderr), FlowSizeLimits.commandOutputBytes, 'command stderr'),
        timedOut: effect.timedOut === true,
        hashBefore: toTrimmedString(effect.hashBefore),
        hashAfter: toTrimmedString(effect.hashAfter),
        patch: toTrimmedString(effect.patch),
        approvalPolicy: toTrimmedString(effect.approvalPolicy),
        status: toTrimmedString(effect.status)
    }));
}

function normalizeOutputIssues(issues: unknown[]): FlowWorkloadResultIssue[] {
    const normalized = issues
        .filter(isRecord)
        .map(issue => ({
            severity: toTrimmedString(issue.severity) || 'non_blocking',
            type: toTrimmedString(issue.type) || 'workload_issue',
            summary: toTrimmedString(issue.summary),
            producer: toTrimmedString(issue.producer) || undefined,
            impact: toTrimmedString(issue.impact) || undefined,
            suggestedFollowup: toTrimmedString(issue.suggestedFollowup) || undefined
        }))
        .filter(item => item.summary.length > 0);
    return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeMemoryCandidates(
    source: MemoryCandidate[] | undefined,
    fallback: MemoryCandidate[]
): MemoryCandidate[] {
    const candidates = source && source.length ? source : fallback;
    const byId = new Map<string, MemoryCandidate>();
    for (const candidate of candidates) {
        if (!candidate || !candidate.content) {
            continue;
        }
        const id = candidate.id || workloadCandidateId(candidate);
        byId.set(id, { ...candidate, id });
    }
    return [...byId.values()];
}

async function aggregateIssues(root: string, runId: string, workloads: FlowWorkload[]): Promise<{
    all: AggregatedIssue[];
    blocking: AggregatedIssue[];
    nonBlocking: AggregatedIssue[];
    followup: AggregatedIssue[];
}> {
    const byKey = new Map<string, AggregatedIssue>();
    for (const workload of workloads) {
        const issuesFile = path.join(root, 'workloads', sanitizeFileName(workload.id), 'output', 'issues.jsonl');
        const issues = await readIssueJsonLines(issuesFile);
        for (const issue of issues) {
            const normalized = normalizeAggregatedIssue(runId, workload, issue);
            if (!normalized) {
                continue;
            }
            const key = issueDedupeKey(normalized);
            const existing = byKey.get(key);
            if (!existing || severityRank(normalized.severity) > severityRank(existing.severity)) {
                byKey.set(key, normalized);
            }
        }
    }
    const all = [...byKey.values()].sort(compareAggregatedIssues);
    return {
        all,
        blocking: all.filter(issue => issue.severity === 'blocking'),
        nonBlocking: all.filter(issue => issue.severity === 'non_blocking'),
        followup: all.filter(issue => issue.severity === 'followup')
    };
}

async function readIssueJsonLines(filePath: string): Promise<unknown[]> {
    const content = await fs.readFile(filePath, 'utf8').catch(() => '');
    return content.split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .flatMap(line => {
            try {
                return [JSON.parse(line)];
            } catch {
                return [];
            }
        });
}

function normalizeAggregatedIssue(runId: string, workload: FlowWorkload, value: unknown): AggregatedIssue | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const summary = toTrimmedString(value.summary) || toTrimmedString(value.message);
    if (!summary) {
        return undefined;
    }
    const sourceSeverity = toTrimmedString(value.severity);
    return {
        runId,
        workloadId: workload.id,
        stateId: workload.stateId,
        severity: normalizeIssueSeverity(sourceSeverity, value),
        sourceSeverity: sourceSeverity || undefined,
        type: toTrimmedString(value.type) || 'workload_issue',
        summary,
        producer: toTrimmedString(value.producer) || undefined,
        impact: toTrimmedString(value.impact) || undefined,
        suggestedFollowup: toTrimmedString(value.suggestedFollowup) || undefined
    };
}

function normalizeIssueSeverity(value: string, issue: Record<string, unknown>): AggregatedIssue['severity'] {
    const normalized = value.toLowerCase().replace(/[\s-]+/g, '_');
    if (['blocking', 'blocker', 'critical', 'fatal', 'high', 'error', 'failed', 'failure'].includes(normalized)) {
        return 'blocking';
    }
    if (
        ['followup', 'follow_up', 'deferred', 'todo', 'later'].includes(normalized)
        || Boolean(toTrimmedString(issue.suggestedFollowup))
        || toTrimmedString(issue.type).toLowerCase().includes('followup')
    ) {
        return 'followup';
    }
    return 'non_blocking';
}

function issueDedupeKey(issue: AggregatedIssue): string {
    return [
        issue.severity,
        issue.type.toLowerCase(),
        issue.summary.toLowerCase().replace(/\s+/g, ' '),
        (issue.impact || '').toLowerCase().replace(/\s+/g, ' ')
    ].join('|');
}

function severityRank(severity: AggregatedIssue['severity']): number {
    return severity === 'blocking' ? 3 : severity === 'followup' ? 2 : 1;
}

function compareAggregatedIssues(left: AggregatedIssue, right: AggregatedIssue): number {
    return severityRank(right.severity) - severityRank(left.severity)
        || left.stateId.localeCompare(right.stateId)
        || left.workloadId.localeCompare(right.workloadId)
        || left.summary.localeCompare(right.summary);
}

function renderJsonLines(values: unknown[]): string {
    return values.map(value => JSON.stringify(value)).join('\n') + (values.length ? '\n' : '');
}

function workloadIdFromCandidate(candidate: MemoryCandidate): string {
    return candidate.runId || 'run';
}

function workloadCandidateId(candidate: MemoryCandidate): string {
    return stableId('memory-candidate', workloadIdFromCandidate(candidate), candidate.stateId || 'state', candidate.kind);
}

function normalizeWorkloadStatus(value: string | undefined): string {
    const normalized = toTrimmedString(value).toLowerCase();
    if (!normalized || normalized === 'ok' || normalized === 'success') {
        return 'completed';
    }
    if (normalized === 'done') {
        return 'completed';
    }
    return ['pending', 'ready', 'running', 'completed', 'failed', 'waiting', 'review', 'done'].includes(normalized)
        ? normalized
        : 'completed';
}

function renderContextPack(contextPack: FlowContextPack | undefined, workflow: FlowWorkflow, workload: FlowWorkload): string {
    const redactedContextPack = redactFlowSecretsValue(contextPack);
    const files = redactedContextPack?.files.map(file => `- ${file.uri}: ${file.reason}`).join('\n') || '- none';
    return truncateFlowText(redactFlowSecretsText([
        `# Context Pack - ${workload.stateId}`,
        '',
        redactedContextPack?.summary || `Workflow "${workflow.name}" context is unavailable.`,
        '',
        '## Files',
        files,
        '',
        '## Signals',
        ...(redactedContextPack?.signals || []).map(signal => `- ${signal.key}: ${String(signal.value)}`),
        '',
        ...(redactedContextPack?.sections || []).flatMap(section => [
            `## ${section.title}`,
            ...section.items.map(item => `- ${item.title}: ${item.content}`)
        ])
    ].join('\n')) || '', FlowSizeLimits.contextPackBytes, 'context pack');
}

function resolveContextPackForWorkload(run: FlowRun, workload: FlowWorkload): FlowContextPack | undefined {
    return run.workloadContextPacks?.[workload.id] || run.contextPack;
}

function renderWorkOrder(workflow: FlowWorkflow, workload: FlowWorkload): string {
    const agentPath = workload.agent ? workflow.agents?.[workload.agent] || workload.agent : 'system';
    return [
        `# Work Order - ${workload.stateId}`,
        '',
        `Workflow: ${workflow.name}`,
        `Workload: ${workload.id}`,
        `Agent: ${agentPath}`,
        '',
        '## Inputs',
        ...(workload.inputArtifacts.length ? workload.inputArtifacts.map(input => `- ${input}`) : ['- none'])
    ].join('\n');
}

function renderReport(
    workflow: FlowWorkflow,
    run: FlowRun,
    workload: FlowWorkload,
    envelope: FlowWorkloadOutputEnvelope
): string {
    const outputs = envelope.artifacts.map(artifact => artifact.path);
    const effects = envelope.effects;
    const signalEntries = Object.entries(envelope.signals || {});
    const auditLinks = buildAuditLinks('', workflow, run, workload, envelope).links;
    return redactFlowSecretsText([
        `# Report - ${workload.stateId}`,
        '',
        `Workflow: ${workflow.name}`,
        `Run: ${run.id}`,
        `Status: ${envelope.status}`,
        '',
        '## Outputs',
        ...(outputs.length ? outputs.map(output => `- ${output}`) : ['- report.md']),
        '',
        '## Summary',
        envelope.result.summary,
        '',
        '## Effects',
        ...(effects.length ? effects.map(effect => `- ${effect.type}: ${effect.summary}`).filter(line => line.length > 2) : ['- none']),
        '',
        '## Signals',
        ...(signalEntries.length ? signalEntries.map(([key, value]) => `- ${key}: ${String(value)}`) : ['- none']),
        '',
        '## Issues',
        ...(envelope.issues.length ? envelope.issues.map(issue => `- ${issue.summary}`).filter(line => line.length > 2) : ['- none']),
        '',
        '## Memory candidates',
        ...(envelope.memoryCandidates && envelope.memoryCandidates.length
            ? envelope.memoryCandidates.map(candidate => `- ${candidate.source} / ${candidate.kind}: ${candidate.content}`)
            : ['- none']),
        '',
        '## Audit links',
        ...auditLinks.map(link => `- ${link.kind}: ${link.path}`)
    ].join('\n')) || '';
}

function buildAuditLinks(
    workloadDir: string,
    workflow: FlowWorkflow,
    run: FlowRun,
    workload: FlowWorkload,
    envelope: FlowWorkloadOutputEnvelope
): WorkloadAuditLinks {
    const outputArtifactIds = new Map(
        envelope.artifacts.map(artifact => [normalizeArtifactPath(artifact.path), artifact.id])
    );
    const fileUri = (relativePath: string): string => workloadDir
        ? FileUri.create(path.join(workloadDir, ...relativePath.split('/'))).toString()
        : relativePath;
    const inputLinks: WorkloadAuditLink[] = [
        {
            id: stableId('link', run.id, workload.id, 'prompt'),
            kind: 'prompt',
            path: 'input/prompt.md',
            uri: fileUri('input/prompt.md'),
            source: 'run.prompt'
        },
        {
            id: stableId('link', run.id, workload.id, 'context-pack'),
            kind: 'context_pack',
            path: 'input/context-pack.md',
            uri: fileUri('input/context-pack.md'),
            source: run.workloadContextPacks?.[workload.id] ? 'run.workloadContextPacks' : 'run.contextPack'
        },
        {
            id: stableId('link', run.id, workload.id, 'work-order'),
            kind: 'work_order',
            path: 'input/work-order.md',
            uri: fileUri('input/work-order.md'),
            source: 'workflow.state'
        }
    ];
    const outputLinks: WorkloadAuditLink[] = [
        {
            id: stableId('link', run.id, workload.id, 'result'),
            kind: 'result',
            path: 'output/result.json',
            uri: fileUri('output/result.json'),
            artifactId: stableId('artifact', run.id, workload.id, 'result.json')
        },
        {
            id: stableId('link', run.id, workload.id, 'report'),
            kind: 'report',
            path: 'output/report.md',
            uri: fileUri('output/report.md'),
            artifactId: stableId('artifact', run.id, workload.id, 'report.md')
        },
        {
            id: stableId('link', run.id, workload.id, 'effects'),
            kind: 'effects',
            path: 'output/effects.json',
            uri: fileUri('output/effects.json'),
            effectIds: run.effects.filter(effect => effect.stateId === workload.stateId).map(effect => effect.id)
        },
        {
            id: stableId('link', run.id, workload.id, 'issues'),
            kind: 'issues',
            path: 'output/issues.jsonl',
            uri: fileUri('output/issues.jsonl'),
            issueCount: envelope.issues.length
        },
        {
            id: stableId('link', run.id, workload.id, 'memory-candidates'),
            kind: 'memory_candidates',
            path: 'output/memory-candidates.jsonl',
            uri: fileUri('output/memory-candidates.jsonl'),
            memoryCandidateIds: (envelope.memoryCandidates || []).map(candidate => candidate.id)
        },
        ...envelope.artifacts.map(artifact => {
            const normalizedPath = normalizeArtifactPath(artifact.path);
            return {
                id: stableId('link', run.id, workload.id, normalizedPath),
                kind: 'artifact',
                path: `output/artifacts/${normalizedPath}`,
                uri: fileUri(`output/artifacts/${normalizedPath}`),
                artifactId: outputArtifactIds.get(normalizedPath) || stableId('artifact', run.id, workload.id, normalizedPath),
                source: artifact.path
            };
        })
    ];
    return {
        schemaVersion: 'flow.workload.audit-links/v1',
        runId: run.id,
        workflowId: workflow.id,
        stateId: workload.stateId,
        workloadId: workload.id,
        links: [...inputLinks, ...outputLinks]
    };
}

function renderArtifact(workflow: FlowWorkflow, run: FlowRun, workload: FlowWorkload, output: string): string {
    return [
        `# ${output}`,
        '',
        `Generated placeholder artifact for workflow "${workflow.name}".`,
        `Run: ${run.id}`,
        `Workload: ${workload.id}`,
        '',
        'This file is part of the normalized Flow workload output envelope.'
    ].join('\n');
}

function runRoot(workspaceRootUri: string | undefined, runId: string): string {
    const root = workspaceRootUri ? FileUri.fsPath(workspaceRootUri) : os.homedir();
    return path.join(root, '.theia', 'flow', 'runs', sanitizeFileName(runId));
}

function findState(workflow: FlowWorkflow, stateId: string): FlowWorkflowState | undefined {
    if (workflow.states[stateId]) {
        return workflow.states[stateId];
    }
    for (const state of Object.values(workflow.states)) {
        if (state.branches?.[stateId]) {
            return state.branches[stateId];
        }
    }
    return undefined;
}

function splitArtifactPath(value: string): string[] {
    return splitFlowRelativePath(value).map(sanitizeFileName);
}

function findInputArtifactPath(run: FlowRun, requestedPath: string): string | undefined {
    const normalizedRequested = normalizeArtifactPath(requestedPath);
    for (const artifact of run.artifacts) {
        const artifactPath = artifactPathFromUri(artifact.uri);
        if (!artifactPath) {
            continue;
        }
        const normalizedArtifactPath = normalizeArtifactPath(artifactPath);
        const normalizedSummary = normalizeArtifactPath(artifact.summary || '');
        if (normalizedSummary === normalizedRequested || normalizedArtifactPath.endsWith(`/${normalizedRequested}`)) {
            return artifactPath;
        }
    }
    return undefined;
}

function artifactPathFromUri(uri: string): string | undefined {
    if (!uri) {
        return undefined;
    }
    if (uri.startsWith('file://')) {
        try {
            return FileUri.fsPath(uri);
        } catch {
            return undefined;
        }
    }
    return path.isAbsolute(uri) ? uri : undefined;
}

function flowArtifactKind(output: string): FlowArtifact['kind'] {
    if (output.includes('contract')) {
        return 'contract';
    }
    if (output.includes('work-order')) {
        return 'work_order';
    }
    if (output.endsWith('.patch') || output.endsWith('.diff')) {
        return 'patch';
    }
    if (output.endsWith('.md')) {
        return 'report';
    }
    if (output.endsWith('.log') || output.endsWith('.txt')) {
        return 'log';
    }
    return 'other';
}

function artifactKindFromPath(output: string): FlowArtifact['kind'] {
    return flowArtifactKind(output);
}

function normalizeArtifactPath(value: string): string {
    return value
        .replace(/\\/g, '/')
        .replace(/^\.\//, '')
        .replace(/\/+/g, '/')
        .replace(/^\/+/, '');
}

async function readTextFile(file: string): Promise<string | undefined> {
    try {
        return await fs.readFile(file, 'utf8');
    } catch {
        return undefined;
    }
}

function stableId(prefix: string, ...parts: string[]): string {
    return `${prefix}-${parts.join('-').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

function sanitizeFileName(value: string): string {
    return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function addUnique(target: string[], value: string): void {
    if (!target.includes(value)) {
        target.push(value);
    }
}

function toTrimmedString(value: unknown): string {
    if (typeof value === 'string') {
        return value.trim();
    }
    return '';
}

function toOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

function normalizeStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }
    const normalized = value.map(item => toTrimmedString(item)).filter(Boolean);
    return normalized.length ? normalized : undefined;
}

function normalizeOptionalNumber(value: unknown): number | undefined {
    const parsed = typeof value === 'number' ? value : Number.parseInt(toTrimmedString(value), 10);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeEffectEnv(value: unknown): Record<string, string | number | boolean> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return undefined;
    }
    const env: Record<string, string | number | boolean> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
        if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
            env[key] = raw;
        }
    }
    return Object.keys(env).length ? env : undefined;
}

async function writeFileIfMissing(filePath: string, content: string): Promise<void> {
    try {
        await fs.access(filePath);
        return;
    } catch {
        await fs.writeFile(filePath, content, 'utf8');
    }
}
