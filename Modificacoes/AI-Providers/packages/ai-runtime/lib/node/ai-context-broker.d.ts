import { ContextPack, MemoryContextSuggestionResult, MemoryService, RetrievalResult } from '@cybervinci/memory/lib/common';
import { CyberVinciAiContextReport, CyberVinciAiTaskRequest } from '../common';
export interface CyberVinciAiPreparedContext {
    report: CyberVinciAiContextReport;
    promptSection?: string;
}
export declare class CyberVinciAiContextBroker {
    protected readonly memoryService?: MemoryService;
    prepare(request: CyberVinciAiTaskRequest): Promise<CyberVinciAiPreparedContext>;
    protected toContextPrompt(request: CyberVinciAiTaskRequest): string;
    protected toRetrievalResults(result: MemoryContextSuggestionResult): RetrievalResult[];
    protected toReport(suggestions: MemoryContextSuggestionResult, pack: ContextPack): CyberVinciAiContextReport;
    protected toPromptSection(pack: ContextPack): string | undefined;
    protected empty(requested: boolean, message: string): CyberVinciAiPreparedContext;
}
//# sourceMappingURL=ai-context-broker.d.ts.map