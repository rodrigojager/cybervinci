import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { inject, injectable } from '@theia/core/shared/inversify';
import { WorkspaceSandboxService } from './workspace-sandbox-service';

const ARENA_TMP_PREFIX = 'arena-';
const DEFAULT_SWEEP_MAX_AGE_MS = 120 * 60 * 1000;

@injectable()
export class CleanupService implements BackendApplicationContribution {

    @inject(WorkspaceSandboxService)
    protected readonly sandboxService: WorkspaceSandboxService;

    async onStart(): Promise<void> {
        await this.sweepAbandonedSandboxes();
    }

    async cleanup(root: string | undefined): Promise<void> {
        if (root) {
            await this.sandboxService.cleanup(root);
        }
    }

    async sweepAbandonedSandboxes(maxAgeMs: number = DEFAULT_SWEEP_MAX_AGE_MS): Promise<void> {
        const tmpRoot = os.tmpdir();
        const cutoff = Date.now() - maxAgeMs;
        let entries: { name: string; isDirectory(): boolean }[];
        try {
            entries = await fs.readdir(tmpRoot, { withFileTypes: true });
        } catch {
            return;
        }
        await Promise.all(entries.map(async entry => {
            if (!entry.isDirectory() || !entry.name.startsWith(ARENA_TMP_PREFIX)) {
                return;
            }
            const candidate = path.join(tmpRoot, entry.name);
            try {
                const stat = await fs.stat(candidate);
                if (stat.mtimeMs < cutoff) {
                    await this.sandboxService.cleanup(candidate);
                }
            } catch {
                // Best-effort cleanup. Failed removals are retried on the next backend start.
            }
        }));
    }
}
