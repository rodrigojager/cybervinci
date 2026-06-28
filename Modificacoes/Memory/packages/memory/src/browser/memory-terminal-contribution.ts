import { FrontendApplication, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { DisposableCollection } from '@theia/core/lib/common';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { inject, injectable, preDestroy } from '@theia/core/shared/inversify';
import { TerminalService } from '@theia/terminal/lib/browser/base/terminal-service';
import { TerminalWidget } from '@theia/terminal/lib/browser/base/terminal-widget';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { MemoryService } from '../common';

@injectable()
export class MemoryTerminalContribution implements FrontendApplicationContribution {

    @inject(MemoryService)
    protected readonly memoryService: MemoryService;

    @inject(TerminalService)
    protected readonly terminalService: TerminalService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    protected readonly toDispose = new DisposableCollection();
    protected readonly terminalDisposables = new Map<string, DisposableCollection>();
    protected readonly lastCommandByTerminal = new Map<string, { command: string; recordedAt: number }>();

    onStart(_app: FrontendApplication): void {
        for (const terminal of this.terminalService.all) {
            this.trackTerminal(terminal);
        }
        this.toDispose.push(this.terminalService.onDidCreateTerminal(terminal => this.trackTerminal(terminal)));
    }

    @preDestroy()
    protected dispose(): void {
        for (const disposables of this.terminalDisposables.values()) {
            disposables.dispose();
        }
        this.terminalDisposables.clear();
        this.toDispose.dispose();
    }

    protected trackTerminal(terminal: TerminalWidget): void {
        if (this.terminalDisposables.has(terminal.id)) {
            return;
        }
        const disposables = new DisposableCollection();
        const history = terminal.commandHistoryState;
        if (history) {
            disposables.push(history.onTerminalCommandStart(() => {
                const command = history.currentCommand.trim();
                if (command) {
                    this.recordTerminalCommand(terminal, command).catch(() => undefined);
                }
            }));
        }
        disposables.push(terminal.onTerminalDidClose(() => {
            disposables.dispose();
            this.terminalDisposables.delete(terminal.id);
            this.lastCommandByTerminal.delete(terminal.id);
        }));
        this.terminalDisposables.set(terminal.id, disposables);
    }

    protected async recordTerminalCommand(terminal: TerminalWidget, command: string): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const settings = await this.memoryService.getSettings(workspacePath);
        if (settings.enabled !== true || settings.optIn?.events !== true) {
            return;
        }
        const now = Date.now();
        const previous = this.lastCommandByTerminal.get(terminal.id);
        if (previous?.command === command && now - previous.recordedAt < 1000) {
            return;
        }
        this.lastCommandByTerminal.set(terminal.id, { command, recordedAt: now });
        await this.memoryService.recordEvent({
            workspacePath,
            eventType: 'terminal.command',
            payload: JSON.stringify({
                source: 'terminal-shell-integration',
                terminalId: terminal.terminalId,
                terminalKind: terminal.kind,
                command
            })
        });
    }

    protected async getWorkspacePath(): Promise<string | undefined> {
        const roots = await this.workspaceService.roots;
        return roots[0] ? FileUri.fsPath(roots[0].resource.toString()) : undefined;
    }
}
