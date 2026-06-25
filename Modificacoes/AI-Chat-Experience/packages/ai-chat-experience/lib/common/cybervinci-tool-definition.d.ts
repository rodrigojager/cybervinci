export type CyberVinciToolCatalogVersion = 'cybervinci.tool/v1';
export type CyberVinciToolKind = 'tool' | 'guard' | 'action' | 'query' | 'effect' | 'ai' | 'flow' | 'ui';
export type CyberVinciToolSource = 'core' | 'system' | 'system-override' | 'user';
export type CyberVinciToolImplementation = 'host' | 'command' | 'theia-tool' | 'composite';
export interface CyberVinciToolParameterSchema {
    type?: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
}
export interface CyberVinciToolEntry {
    type?: 'core' | 'command' | 'script' | 'mcp' | 'flow' | 'canvas' | 'provider' | 'http' | 'theia-tool' | 'composite';
    ref?: string;
    command?: string;
    args?: unknown[];
}
export interface CyberVinciToolPolicy {
    approval?: 'never' | 'on-risk' | 'always';
    readonly?: boolean;
    requiresConfirmation?: boolean;
    requiresApproval?: boolean;
    allowWorkspaceWrite?: boolean;
    allowNetwork?: boolean;
    allowShell?: boolean;
    allowedCommands?: string[];
    allowedEnv?: string[];
    allowedPaths?: string[];
    deniedPaths?: string[];
    timeoutMs?: number;
}
export interface CyberVinciToolCapabilities {
    requires?: string[];
}
export interface CyberVinciCompositeToolStep {
    id?: string;
    tool: string;
    args?: Record<string, unknown>;
    saveAs?: string;
    stopOnFail?: boolean;
}
export interface CyberVinciToolDefinition {
    version?: CyberVinciToolCatalogVersion | 1;
    id: string;
    name: string;
    kind?: CyberVinciToolKind;
    source?: CyberVinciToolSource;
    sourcePath?: string;
    description?: string;
    category?: string;
    parameters?: CyberVinciToolParameterSchema;
    inputSchema?: CyberVinciToolParameterSchema | Record<string, unknown>;
    outputSchema?: CyberVinciToolParameterSchema | Record<string, unknown>;
    entry?: CyberVinciToolEntry;
    implementation?: CyberVinciToolImplementation;
    exposeToModel?: boolean;
    protected?: boolean;
    command?: string;
    theiaToolId?: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    shell?: boolean;
    timeoutMs?: number;
    policy?: CyberVinciToolPolicy;
    capabilities?: CyberVinciToolCapabilities;
    steps?: CyberVinciCompositeToolStep[];
}
export interface CyberVinciToolExecutionResult {
    exitCode: number | null;
    stdout: string;
    stderr: string;
}
export interface CyberVinciHostToolExecutionContext {
    requestId: string;
    playbookId?: string;
    stateId?: string;
    input: Record<string, unknown>;
    state: Record<string, unknown>;
    invokeNativeAgent?: () => Promise<void>;
    chatRequest?: unknown;
}
export interface CyberVinciHostToolExecutionResult {
    ok: boolean;
    value?: unknown;
    message?: string;
    diagnostics?: string[];
    stop?: boolean;
}
export type CyberVinciDeclarativeTool = CyberVinciToolDefinition;
export type CyberVinciDeclarativeToolExecutionResult = CyberVinciToolExecutionResult;
//# sourceMappingURL=cybervinci-tool-definition.d.ts.map