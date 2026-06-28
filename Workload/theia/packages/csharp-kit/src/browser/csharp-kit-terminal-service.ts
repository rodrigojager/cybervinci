import { waitForEvent } from '@theia/core/lib/common/promise-util';
import { inject, injectable } from '@theia/core/shared/inversify';
import { TerminalService } from '@theia/terminal/lib/browser/base/terminal-service';
import { TerminalWidget } from '@theia/terminal/lib/browser/base/terminal-widget';

@injectable()
export class CSharpKitTerminalService {

    @inject(TerminalService)
    protected readonly terminalService: TerminalService;

    async runDotnet(cwd: string, args: string[], title = 'C# Kit'): Promise<TerminalWidget> {
        const terminal = await this.terminalService.newTerminal({
            title,
            cwd,
            kind: 'cybervinci-csharp-kit',
            useServerTitle: false
        });
        this.terminalService.open(terminal, { mode: 'activate' });
        await terminal.start();
        try {
            await waitForEvent(terminal.onOutput, 1500);
        } catch {
            // Shell integration is helpful but not required before sending the command.
        }
        await terminal.executeCommand({
            cwd,
            args: ['dotnet', ...args]
        });
        return terminal;
    }
}
