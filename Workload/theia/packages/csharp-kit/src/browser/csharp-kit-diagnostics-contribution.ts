import URI from '@theia/core/lib/common/uri';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { MessageService } from '@theia/core/lib/common';
import { ProblemManager } from '@theia/markers/lib/browser';
import { Diagnostic, DiagnosticSeverity } from '@theia/core/shared/vscode-languageserver-protocol';
import { inject, injectable } from '@theia/core/shared/inversify';
import { CSharpDiagnostic, CSharpDiagnosticRequest, CSharpKitService } from '../common';

const CSHARP_DIAGNOSTICS_OWNER = 'cybervinci-csharp-kit';
const CSHARP_LANGUAGE_SERVER_DIAGNOSTICS_OWNER = 'cybervinci-csharp-kit-language-server';
const CSHARP_LANGUAGE_SERVER_WORKSPACE_DIAGNOSTICS_OWNER = 'cybervinci-csharp-kit-language-server-workspace';

@injectable()
export class CSharpKitDiagnosticsContribution {

    @inject(CSharpKitService)
    protected readonly service: CSharpKitService;

    @inject(ProblemManager)
    protected readonly problemManager: ProblemManager;

    @inject(MessageService)
    protected readonly messages: MessageService;

    protected markedUris = new Set<string>();
    protected languageServerMarkedUris = new Set<string>();
    protected languageServerWorkspaceMarkedUris = new Set<string>();

    async refreshDiagnostics(request: CSharpDiagnosticRequest): Promise<void> {
        const result = await this.service.getDiagnostics(request);
        this.publishDiagnostics(result.diagnostics);

        if (result.commandResult.ok) {
            this.messages.info(`Loaded ${result.diagnostics.length} C# diagnostic(s).`);
        } else if (result.diagnostics.length > 0) {
            this.messages.warn(`C# build reported ${result.diagnostics.length} diagnostic(s).`);
        } else {
            this.messages.error(this.compactOutput(result.rawOutput) || 'C# build failed without parseable diagnostics.');
        }
    }

    async refreshLanguageServerWorkspaceDiagnostics(workspacePath: string): Promise<void> {
        const results = await Promise.all((['csharp', 'razor'] as const).map(language =>
            this.service.getLanguageServerWorkspaceDiagnostics({ workspacePath, language }).catch(() => undefined)
        ));
        const diagnostics = results
            .filter((result): result is NonNullable<typeof result> => !!result && result.source === 'language-server')
            .flatMap(result => result.diagnostics);
        this.publishLanguageServerWorkspaceDiagnostics(diagnostics);

        const available = results.filter(result => result?.source === 'language-server');
        if (available.length) {
            this.messages.info(`Loaded ${diagnostics.length} C# language-server workspace diagnostic(s).`);
        } else {
            const detail = results.find(result => result?.detail)?.detail;
            this.messages.warn(detail ?? 'No C# language server with workspace diagnostics is available.');
        }
    }

    protected publishDiagnostics(diagnostics: readonly CSharpDiagnostic[]): void {
        const grouped = new Map<string, Diagnostic[]>();
        for (const diagnostic of diagnostics) {
            const uri = FileUri.create(diagnostic.path).toString();
            const markers = grouped.get(uri) ?? [];
            markers.push(this.toMarker(diagnostic, 'C# Kit'));
            grouped.set(uri, markers);
        }

        const nextUris = new Set(grouped.keys());
        for (const uri of this.markedUris) {
            if (!nextUris.has(uri)) {
                this.problemManager.setMarkers(new URI(uri), CSHARP_DIAGNOSTICS_OWNER, []);
            }
        }
        for (const [uri, markers] of grouped) {
            this.problemManager.setMarkers(new URI(uri), CSHARP_DIAGNOSTICS_OWNER, markers);
        }
        this.markedUris = nextUris;
    }

    publishLanguageServerDocumentDiagnostics(documentUri: string, diagnostics: readonly CSharpDiagnostic[]): void {
        const markers = diagnostics.map(diagnostic => this.toMarker(diagnostic, 'C# Language Server'));
        this.problemManager.setMarkers(new URI(documentUri), CSHARP_LANGUAGE_SERVER_DIAGNOSTICS_OWNER, markers);
        if (markers.length) {
            this.languageServerMarkedUris.add(documentUri);
        } else {
            this.languageServerMarkedUris.delete(documentUri);
        }
    }

    clearLanguageServerDocumentDiagnostics(documentUri: string): void {
        if (!this.languageServerMarkedUris.has(documentUri)) {
            return;
        }
        this.problemManager.setMarkers(new URI(documentUri), CSHARP_LANGUAGE_SERVER_DIAGNOSTICS_OWNER, []);
        this.languageServerMarkedUris.delete(documentUri);
    }

    protected publishLanguageServerWorkspaceDiagnostics(diagnostics: readonly CSharpDiagnostic[]): void {
        const grouped = new Map<string, Diagnostic[]>();
        for (const diagnostic of diagnostics) {
            const uri = FileUri.create(diagnostic.path).toString();
            const markers = grouped.get(uri) ?? [];
            markers.push(this.toMarker(diagnostic, 'C# Language Server'));
            grouped.set(uri, markers);
        }

        const nextUris = new Set(grouped.keys());
        for (const uri of this.languageServerWorkspaceMarkedUris) {
            if (!nextUris.has(uri)) {
                this.problemManager.setMarkers(new URI(uri), CSHARP_LANGUAGE_SERVER_WORKSPACE_DIAGNOSTICS_OWNER, []);
            }
        }
        for (const [uri, markers] of grouped) {
            this.problemManager.setMarkers(new URI(uri), CSHARP_LANGUAGE_SERVER_WORKSPACE_DIAGNOSTICS_OWNER, markers);
        }
        this.languageServerWorkspaceMarkedUris = nextUris;
    }

    protected toMarker(diagnostic: CSharpDiagnostic, source: string): Diagnostic {
        const startLine = Math.max(0, diagnostic.line - 1);
        const startCharacter = Math.max(0, diagnostic.column - 1);
        const endLine = Math.max(startLine, (diagnostic.endLine ?? diagnostic.line) - 1);
        const endCharacter = Math.max(startCharacter + 1, (diagnostic.endColumn ?? diagnostic.column + 1) - 1);
        return {
            range: {
                start: {
                    line: startLine,
                    character: startCharacter
                },
                end: {
                    line: endLine,
                    character: endCharacter
                }
            },
            severity: this.toSeverity(diagnostic.severity),
            code: diagnostic.code,
            source,
            message: diagnostic.message
        };
    }

    protected toSeverity(severity: CSharpDiagnostic['severity']): DiagnosticSeverity {
        switch (severity) {
            case 'error':
                return DiagnosticSeverity.Error;
            case 'warning':
                return DiagnosticSeverity.Warning;
            default:
                return DiagnosticSeverity.Information;
        }
    }

    protected compactOutput(output: string): string {
        return output
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean)
            .slice(-5)
            .join('\n');
    }
}
