export interface AgentMarkdownFile {
    path: string;
    uri: string;
    relativePath: string;
    content: string;
    updatedAt: string;
    source?: 'workspace' | 'catalog';
}
export interface AgentMarkdownSummary {
    path: string;
    uri: string;
    relativePath: string;
    updatedAt: string;
    source?: 'workspace' | 'catalog';
}
export interface ReadAgentMarkdownOptions {
    createIfMissing?: boolean;
    title?: string;
}
export interface CreateAgentMarkdownOptions {
    title?: string;
    content?: string;
}
export interface DuplicateAgentMarkdownOptions {
    title?: string;
}
export declare class AgentMarkdownStore {
    listAgents(workspaceRootUri?: string): Promise<AgentMarkdownSummary[]>;
    readAgent(workspaceRootUri: string | undefined, relativePath: string, options?: ReadAgentMarkdownOptions): Promise<AgentMarkdownFile | undefined>;
    writeAgent(workspaceRootUri: string | undefined, relativePath: string, content: string): Promise<AgentMarkdownFile>;
    createAgent(workspaceRootUri: string | undefined, relativePath: string, options?: CreateAgentMarkdownOptions): Promise<AgentMarkdownFile>;
    duplicateAgent(workspaceRootUri: string | undefined, sourceRelativePath: string, targetRelativePath: string, options?: DuplicateAgentMarkdownOptions): Promise<AgentMarkdownFile>;
    renameAgent(workspaceRootUri: string | undefined, sourceRelativePath: string, targetRelativePath: string): Promise<AgentMarkdownFile>;
    protected ensureAgentsDir(workspaceRootUri: string | undefined): Promise<string>;
    protected agentFile(root: string, relativePath: string): string;
    protected collectMarkdownFiles(root: string, dir?: string): Promise<string[]>;
    protected listCatalogAgents(): Promise<AgentMarkdownSummary[]>;
    protected summary(root: string, file: string): Promise<AgentMarkdownSummary>;
    protected catalogSummary(root: string, file: string): Promise<AgentMarkdownSummary>;
    protected catalogAgentFile(relativePath: string): Promise<{
        root: string;
        file: string;
    } | undefined>;
    protected resolveAgencyAgentCatalogRoot(): Promise<string | undefined>;
    protected isCatalogMetadataFile(root: string, file: string): boolean;
}
