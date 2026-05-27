import { WebSocketConnectionProvider } from '@theia/core/lib/browser';
import { inject, injectable } from '@theia/core/shared/inversify';
import { OPENPENCIL_BACKEND_PATH, OpenPencilBackendService } from '../common/openpencil-protocol';
import {
    OpenPencilAiSkillContext,
    OpenPencilAiDesignProvider,
    OpenPencilAiDesignProviderResult,
    OpenPencilAiDesignRequest
} from './openpencil-design-command-service';

@injectable()
export class OpenPencilBackendCodexAiDesignProvider implements OpenPencilAiDesignProvider {

    readonly id = 'openpencil.cybervinci-backend-codex';
    readonly label = 'CyberVinci Codex backend';
    readonly priority = 200;

    @inject(WebSocketConnectionProvider)
    protected readonly connectionProvider: WebSocketConnectionProvider;

    protected backendService: OpenPencilBackendService | undefined;

    async generateOperations(request: OpenPencilAiDesignRequest, context: OpenPencilAiSkillContext): Promise<OpenPencilAiDesignProviderResult> {
        try {
            const result = await this.getBackendService().generateAiOperations({
                prompt: request.prompt,
                document: request.document,
                selection: request.selection,
                uri: request.uri,
                mode: request.mode,
                activePageLayout: context.documentContext.activePageLayout
            });
            return {
                operations: result.operations,
                diagnostics: result.diagnostics
            };
        } catch (error) {
            return {
                diagnostics: [`Backend Codex generation failed: ${error instanceof Error ? error.message : String(error)}`]
            };
        }
    }

    protected getBackendService(): OpenPencilBackendService {
        if (!this.backendService) {
            this.backendService = this.connectionProvider.createProxy<OpenPencilBackendService>(OPENPENCIL_BACKEND_PATH);
        }
        return this.backendService;
    }
}
