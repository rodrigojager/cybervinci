import { inject, injectable, named } from '@theia/core/shared/inversify';
import { ContributionProvider, nls } from '@theia/core/lib/common';
import { ArenaRunnerInfo } from '../common';
import { IArenaRunner } from './runners/arena-runner';

@injectable()
export class ArenaRunnerRegistry {

    @inject(ContributionProvider) @named(IArenaRunner)
    protected readonly runners: ContributionProvider<IArenaRunner>;

    listRunners(): ArenaRunnerInfo[] {
        return this.runners.getContributions().map(runner => runner.info);
    }

    getRunner(id: string): IArenaRunner {
        const runner = this.runners.getContributions().find(candidate => candidate.info.id === id);
        if (!runner) {
            throw new Error(nls.localize('theia/arena/unknownRunner', 'Unknown Arena runner: {0}', id));
        }
        return runner;
    }
}
