import { inject, injectable } from '@theia/core/shared/inversify';
import { nls } from '@theia/core/lib/common';
import {
    GeneratedFile,
    ArenaArtifact,
    ArenaOutputType,
    ArenaRunRequest,
    ArenaRunResult
} from '../../common';
import { LanguageModelArenaService } from '../language-model-arena-service';
import { IArenaRunner, ArenaRunnerCancellationToken } from './arena-runner';

interface ApiLlmArtifactResponse {
    artifactType?: ArenaOutputType;
    files?: Array<{
        path?: string;
        content?: string;
        contentType?: string;
        language?: string;
    }>;
    rawNotes?: string;
}

@injectable()
export class ApiLlmArenaRunner implements IArenaRunner {

    @inject(LanguageModelArenaService)
    protected readonly languageModelService: LanguageModelArenaService;

    readonly info = {
        id: 'api-llm',
        name: nls.localize('theia/arena/runner/apiLlm/name', 'API LLM Runner'),
        description: nls.localize('theia/arena/runner/apiLlm/description', 'Runs candidates through the configured Theia AI language-model registry.'),
        available: true,
        capabilities: {
            supportsFilesystem: false,
            supportsModelSelection: true,
            supportsReasoningEffort: true,
            supportsDiff: false
        }
    };

    async run(request: ArenaRunRequest, cancellationToken?: ArenaRunnerCancellationToken): Promise<ArenaRunResult> {
        const started = Date.now();
        try {
            if (cancellationToken?.isCancellationRequested) {
                throw new Error(nls.localize('theia/arena/candidateCancelled', 'Arena candidate {0} was cancelled.', request.candidateLabel));
            }
            const rawOutput = await this.languageModelService.completeText(
                'Você executa agentes da Arena e retorna artefatos normalizados. Responda em JSON válido.',
                this.createCandidatePrompt(request),
                { model: request.model, reasoningEffort: request.reasoningEffort },
                true
            );
            if (cancellationToken?.isCancellationRequested) {
                throw new Error(nls.localize('theia/arena/candidateCancelled', 'Arena candidate {0} was cancelled.', request.candidateLabel));
            }
            return {
                candidateLabel: request.candidateLabel,
                status: 'succeeded',
                artifact: this.parseArtifact(rawOutput, request.outputType),
                logs: [
                    nls.localize('theia/arena/apiLlmRunnerExecutedCandidate', 'API LLM runner executed candidate {0}.', request.candidateLabel),
                    request.model ? nls.localize('theia/arena/modelLog', 'Model: {0}', request.model) : nls.localize('theia/arena/firstReadyModelLog', 'Model: first ready Theia AI model')
                ],
                latencyMs: Date.now() - started
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                candidateLabel: request.candidateLabel,
                status: 'failed',
                artifact: {
                    artifactType: request.outputType,
                    files: [],
                    rawOutput: '',
                    parsedSuccessfully: false,
                    error: message
                },
                logs: [message],
                latencyMs: Date.now() - started,
                error: message
            };
        }
    }

    protected createCandidatePrompt(request: ArenaRunRequest): string {
        return `SYSTEM / PLAYGROUND RULES:
Você está executando dentro da Arena.
Esta é uma disputa A/B/C de prompts.
Não mencione a disputa no resultado final.
Siga o contrato de saída.
Trabalhe conceitualmente como se estivesse em workspace temporário.
Não use caminhos absolutos.
Não tente acessar arquivos fora do workspace.
Se não conseguir cumprir, retorne erro claro.

AGENT PROMPT:
${request.agentMarkdown}

USER TASK:
${request.userTask}

OUTPUT TYPE:
${request.outputType}

OUTPUT CONTRACT:
Retorne JSON válido neste formato:
{
  "artifactType": "markdown|webpage|code|json|document|generic",
  "files": [
    {
      "path": "output/result.md",
      "content": "...",
      "contentType": "text/markdown",
      "language": "markdown"
    }
  ],
  "rawNotes": "opcional"
}

Regras:
- Todos os caminhos devem ser relativos e começar com output/.
- Não retorne caminhos absolutos, ../, ..\\, file://, C:\\, /etc/ ou UNC.
- Para webpage, prefira output/index.html.
- Para json, o arquivo principal deve conter JSON válido.`;
    }

    protected parseArtifact(rawOutput: string, fallbackType: ArenaOutputType): ArenaArtifact {
        try {
            const parsed = this.parseJson(rawOutput) as ApiLlmArtifactResponse;
            const artifactType = this.isOutputType(parsed.artifactType) ? parsed.artifactType : fallbackType;
            const files = (parsed.files ?? [])
                .map(file => this.toGeneratedFile(file, artifactType))
                .filter((file): file is GeneratedFile => Boolean(file));
            if (!files.length) {
                throw new Error(nls.localize('theia/arena/llmReturnedNoValidFiles', 'LLM returned no valid files.'));
            }
            return {
                artifactType,
                files,
                rawOutput: files[0].content || parsed.rawNotes || rawOutput,
                parsedSuccessfully: true,
                error: null
            };
        } catch (error) {
            const file = this.defaultFile(fallbackType, rawOutput);
            return {
                artifactType: fallbackType,
                files: [file],
                rawOutput,
                parsedSuccessfully: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    protected parseJson(rawOutput: string): unknown {
        const trimmed = rawOutput.trim();
        if (trimmed.startsWith('```json')) {
            const match = /```json\s*([\s\S]*?)\s*```/.exec(trimmed);
            if (match) {
                return JSON.parse(match[1]);
            }
        }
        return JSON.parse(trimmed);
    }

    protected toGeneratedFile(file: NonNullable<ApiLlmArtifactResponse['files']>[number], artifactType: ArenaOutputType): GeneratedFile | undefined {
        if (!file.path || typeof file.content !== 'string') {
            return undefined;
        }
        if (!this.isSafeOutputPath(file.path)) {
            return undefined;
        }
        const contentType = file.contentType || this.contentTypeFor(artifactType);
        return {
            path: file.path.replace(/\\/g, '/'),
            content: file.content,
            contentType,
            language: file.language || this.languageFor(artifactType),
            sizeBytes: Buffer.byteLength(file.content, 'utf8')
        };
    }

    protected defaultFile(outputType: ArenaOutputType, content: string): GeneratedFile {
        const pathByType: Record<ArenaOutputType, string> = {
            markdown: 'output/result.md',
            webpage: 'output/index.html',
            code: 'output/result.txt',
            json: 'output/result.json',
            document: 'output/result.md',
            generic: 'output/result.txt'
        };
        return {
            path: pathByType[outputType],
            content,
            contentType: this.contentTypeFor(outputType),
            language: this.languageFor(outputType),
            sizeBytes: Buffer.byteLength(content, 'utf8')
        };
    }

    protected isSafeOutputPath(value: string): boolean {
        const normalized = value.replace(/\\/g, '/');
        return Boolean(
            normalized.startsWith('output/') &&
            !normalized.includes('../') &&
            !normalized.includes('://') &&
            !normalized.startsWith('/') &&
            !/^[a-zA-Z]:/.test(value) &&
            !value.startsWith('\\\\')
        );
    }

    protected isOutputType(value: unknown): value is ArenaOutputType {
        return typeof value === 'string' && ['markdown', 'webpage', 'code', 'json', 'document', 'generic'].includes(value);
    }

    protected contentTypeFor(outputType: ArenaOutputType): string {
        switch (outputType) {
            case 'markdown':
            case 'document':
                return 'text/markdown';
            case 'webpage':
                return 'text/html';
            case 'json':
                return 'application/json';
            default:
                return 'text/plain';
        }
    }

    protected languageFor(outputType: ArenaOutputType): string {
        switch (outputType) {
            case 'markdown':
            case 'document':
                return 'markdown';
            case 'webpage':
                return 'html';
            case 'json':
                return 'json';
            default:
                return 'text';
        }
    }
}
