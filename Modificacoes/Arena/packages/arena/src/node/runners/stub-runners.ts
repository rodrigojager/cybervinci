import { injectable } from '@theia/core/shared/inversify';
import { nls } from '@theia/core/lib/common';
import { ArenaRunRequest, ArenaRunResult, ArenaRunnerInfo } from '../../common';
import { IArenaRunner, ArenaRunnerCancellationToken } from './arena-runner';

@injectable()
export abstract class StubArenaRunner implements IArenaRunner {

    abstract readonly info: ArenaRunnerInfo;

    async run(request: ArenaRunRequest, _cancellationToken?: ArenaRunnerCancellationToken): Promise<ArenaRunResult> {
        const message = nls.localize('theia/arena/stubRunnerNotImplemented', '{0} is registered as a Arena adapter stub but is not implemented yet.', this.info.name);
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
            latencyMs: 0,
            error: message
        };
    }
}

export class ClaudeCodeArenaRunner extends StubArenaRunner {
    readonly info = createStubInfo(
        'claude-code',
        nls.localize('theia/arena/runner/claudeCode/name', 'Claude Code Runner'),
        nls.localize('theia/arena/runner/claudeCode/description', 'Future adapter for Claude Code running only inside Arena sandboxes.'),
        true,
        true
    );
}

export class GeminiCliArenaRunner extends StubArenaRunner {
    readonly info = createStubInfo(
        'gemini-cli',
        nls.localize('theia/arena/runner/geminiCli/name', 'Gemini CLI Runner'),
        nls.localize('theia/arena/runner/geminiCli/description', 'Future adapter for Gemini CLI running only inside Arena sandboxes.'),
        true,
        true
    );
}

export class GenericCliArenaRunner extends StubArenaRunner {
    readonly info = createStubInfo(
        'generic-cli',
        nls.localize('theia/arena/runner/genericCli/name', 'Generic CLI Runner'),
        nls.localize('theia/arena/runner/genericCli/description', 'Future adapter for a configurable local CLI runner.'),
        true,
        true
    );
}

export class RemoteArenaRunner extends StubArenaRunner {
    readonly info = createStubInfo(
        'remote',
        nls.localize('theia/arena/runner/remote/name', 'Remote Runner'),
        nls.localize('theia/arena/runner/remote/description', 'Future adapter for remote Arena execution.'),
        true,
        true
    );
}

function createStubInfo(id: string, name: string, description: string, supportsModelSelection: boolean, supportsReasoningEffort: boolean): ArenaRunnerInfo {
    return {
        id,
        name,
        description,
        available: false,
        capabilities: {
            supportsFilesystem: true,
            supportsModelSelection,
            supportsReasoningEffort,
            supportsDiff: true,
            isStub: true
        }
    };
}
