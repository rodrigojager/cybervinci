import { ContextPack, MemoryService, RetrievalResult } from '@cybervinci/memory/lib/common';
import { FlowContextPack, FlowRun, FlowWorkflow, FlowWorkload, MemoryCandidate, MemoryWrite } from '../common';
export interface MemoryAdapterReport {
    provider: 'local' | 'external' | 'missing';
    available: boolean;
    detail?: string;
    missingService?: string;
}
export declare const MemoryAdapter: any;
export interface MemoryAdapter {
    report(): Promise<MemoryAdapterReport>;
    buildContextPack(workspaceRootUri: string | undefined, workflow: FlowWorkflow, workload?: FlowWorkload): Promise<FlowContextPack>;
    collectMemoryCandidates(run: FlowRun): Promise<MemoryCandidate[]>;
    writeApprovedMemory(memoryWrite: MemoryWrite, workspaceRootUri?: string): Promise<MemoryWrite>;
}
export declare class LocalMemoryAdapter implements MemoryAdapter {
    protected readonly memoryService?: MemoryService;
    report(): Promise<MemoryAdapterReport>;
    buildContextPack(workspaceRootUri: string | undefined, workflow: FlowWorkflow, workload?: FlowWorkload): Promise<FlowContextPack>;
    protected buildFallbackContextPack(workspaceRootUri: string | undefined, workflow: FlowWorkflow, workload: FlowWorkload | undefined, agentIds: string[], referencedFiles: string[], missingService: string | undefined): FlowContextPack;
    protected safeDashboard(workspacePath: string): Promise<MemoryDashboardLike | undefined>;
    collectMemoryCandidates(run: FlowRun): Promise<MemoryCandidate[]>;
    writeApprovedMemory(memoryWrite: MemoryWrite, workspaceRootUri?: string): Promise<MemoryWrite>;
    protected toFlowContextPack(workspaceRootUri: string, workflow: FlowWorkflow, agentIds: string[], referencedFiles: string[], retrievalResults: RetrievalResult[], contextPack: ContextPack, dashboard?: MemoryDashboardLike, workload?: FlowWorkload): FlowContextPack;
}
interface MemoryDashboardLike {
    files?: MemoryDashboardFileLike[];
    symbols?: Array<{
        name: string;
        fullName?: string;
        languageId?: string;
    }>;
    codeChunks?: Array<{
        path?: string;
        symbolName?: string;
        summary?: string;
        content?: string;
    }>;
    memories?: Array<{
        title: string;
        content?: string;
        scope?: string;
        memoryType?: string;
        importance?: string;
        source?: string;
        evidence?: string;
        tags?: string[];
    }>;
    skills?: Array<{
        name: string;
        description?: string;
        guidance?: string[];
        tags?: string[];
    }>;
    settings?: {
        optIn?: Record<string, boolean | undefined>;
        enabled?: boolean;
        memoryEnabled?: boolean;
        graphEnabled?: boolean;
    };
    graphs?: {
        preferences?: {
            nodes?: Array<{
                label: string;
                detail?: string;
            }>;
        };
        projectMemories?: {
            nodes?: Array<{
                label: string;
                detail?: string;
            }>;
        };
        code?: {
            nodes?: Array<{
                label: string;
                detail?: string;
                relativePath?: string;
            }>;
        };
    };
}
type MemoryDashboardFileLike = {
    path?: string;
    relativePath?: string;
    language?: string;
    languageId?: string;
    tags?: string[];
    lineCount?: number;
};
export {};
