import { ArenaRunRequest, ArenaRunnerInfo, ArenaRunResult } from '../../common';

export const IArenaRunner = Symbol('IArenaRunner');

export interface ArenaRunnerCancellationToken {
    readonly isCancellationRequested: boolean;
    onCancellationRequested(listener: () => void): void;
}

export interface IArenaRunner {
    readonly info: ArenaRunnerInfo;
    run(request: ArenaRunRequest, cancellationToken?: ArenaRunnerCancellationToken): Promise<ArenaRunResult>;
}
