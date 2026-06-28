import { injectable } from '@theia/core/shared/inversify';
import { nls } from '@theia/core/lib/common';
import {
    GeneratedFile,
    ArenaArtifact,
    ArenaOutputType,
    ArenaRunRequest,
    ArenaRunResult
} from '../../common';
import { IArenaRunner, ArenaRunnerCancellationToken } from './arena-runner';

@injectable()
export class MockArenaRunner implements IArenaRunner {

    readonly info = {
        id: 'mock',
        name: nls.localize('theia/arena/runner/mock/name', 'Mock Runner'),
        description: nls.localize('theia/arena/runner/mock/description', 'Development runner that returns deterministic artifacts without calling an LLM or CLI.'),
        available: true,
        capabilities: {
            supportsFilesystem: true,
            supportsModelSelection: false,
            supportsReasoningEffort: false,
            supportsDiff: false
        }
    };

    async run(request: ArenaRunRequest, cancellationToken?: ArenaRunnerCancellationToken): Promise<ArenaRunResult> {
        if (cancellationToken?.isCancellationRequested) {
            throw new Error(nls.localize('theia/arena/candidateCancelled', 'Arena candidate {0} was cancelled.', request.candidateLabel));
        }
        const started = Date.now();
        const rawOutput = this.createRawOutput(request);
        const file = this.createFile(request.outputType, rawOutput);
        const artifact: ArenaArtifact = {
            artifactType: request.outputType,
            files: [file],
            rawOutput,
            parsedSuccessfully: true,
            error: null
        };
        return {
            candidateLabel: request.candidateLabel,
            status: 'succeeded',
            artifact,
            logs: [
                nls.localize('theia/arena/mockRunnerExecutedCandidate', 'Mock runner executed candidate {0}.', request.candidateLabel),
                nls.localize('theia/arena/workspaceSandbox', 'Workspace sandbox: {0}', request.workspaceRoot)
            ],
            latencyMs: Date.now() - started
        };
    }

    protected createRawOutput(request: ArenaRunRequest): string {
        const promptPreview = request.agentMarkdown.trim().split(/\r?\n/).slice(0, 8).join('\n');
        if (request.outputType === 'json') {
            return JSON.stringify({
                candidate: request.candidateLabel,
                task: request.userTask,
                summary: nls.localize('theia/arena/mockArenaResult', 'Mock Arena result'),
                promptPreview
            }, undefined, 2);
        }
        if (request.outputType === 'webpage') {
            const title = `${nls.localize('theia/arena/arenaResult', 'Arena Result')} ${request.candidateLabel}`;
            return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>${this.escapeHtml(title)}</title></head>
<body>
<main>
<h1>${this.escapeHtml(title)}</h1>
<p>${this.escapeHtml(request.userTask)}</p>
<pre>${this.escapeHtml(promptPreview)}</pre>
</main>
</body>
</html>`;
        }
        return `# ${nls.localize('theia/arena/arenaResult', 'Arena Result')} ${request.candidateLabel}

${nls.localize('theia/arena/taskLabel', 'Task')}:
${request.userTask}

${nls.localize('theia/arena/outputType', 'Output Type')}: ${request.outputType}

${nls.localize('theia/arena/promptPreview', 'Prompt preview')}:
${promptPreview}

${nls.localize('theia/arena/mockRunnerArtifactNote', 'This is a deterministic Mock Runner artifact. Replace the runner with an API or CLI adapter to execute real agents.')}`;
    }

    protected createFile(outputType: ArenaOutputType, rawOutput: string): GeneratedFile {
        const byType: Record<ArenaOutputType, Pick<GeneratedFile, 'path' | 'contentType' | 'language'>> = {
            markdown: { path: 'output/result.md', contentType: 'text/markdown', language: 'markdown' },
            webpage: { path: 'output/index.html', contentType: 'text/html', language: 'html' },
            code: { path: 'output/result.txt', contentType: 'text/plain', language: 'text' },
            json: { path: 'output/result.json', contentType: 'application/json', language: 'json' },
            document: { path: 'output/result.md', contentType: 'text/markdown', language: 'markdown' },
            generic: { path: 'output/result.txt', contentType: 'text/plain', language: 'text' }
        };
        const file = byType[outputType];
        return {
            ...file,
            content: rawOutput,
            sizeBytes: Buffer.byteLength(rawOutput, 'utf8')
        };
    }

    protected escapeHtml(value: string): string {
        return value.replace(/[&<>"']/g, char => {
            switch (char) {
                case '&': return '&amp;';
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '"': return '&quot;';
                default: return '&#39;';
            }
        });
    }
}
