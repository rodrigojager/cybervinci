export declare const CommandEffectHostAdapter: any;
export interface CommandEffectRequest {
    command: string;
    cwd?: string;
    env?: Record<string, string | number | boolean | undefined>;
    allowedEnv?: string[];
    allowedCommands?: string[];
    timeoutMs?: number;
    approvalPolicy?: string;
}
export interface PreparedCommandEffect {
    command: string;
    args: string[];
    executable: string;
    workspaceRoot: string;
    cwd: string;
    relativeCwd: string;
    env: Record<string, string>;
    timeoutMs: number;
    approvalPolicy: string;
    requiresApproval: boolean;
    blocked: boolean;
    riskReasons: string[];
    reason?: string;
}
export interface AppliedCommandEffect extends PreparedCommandEffect {
    applied: boolean;
    status: 'proposed' | 'applied' | 'blocked' | 'failed';
    exitCode?: number | null;
    signal?: string | null;
    stdout: string;
    stderr: string;
    timedOut: boolean;
    startedAt?: string;
    completedAt?: string;
}
export interface CommandEffectHostAdapter {
    prepare(workspaceRootUri: string | undefined, effect: CommandEffectRequest): Promise<PreparedCommandEffect>;
    apply(workspaceRootUri: string | undefined, effect: CommandEffectRequest, approved?: boolean): Promise<AppliedCommandEffect>;
}
export declare class LocalCommandEffectHostAdapter implements CommandEffectHostAdapter {
    prepare(workspaceRootUri: string | undefined, effect: CommandEffectRequest): Promise<PreparedCommandEffect>;
    apply(workspaceRootUri: string | undefined, effect: CommandEffectRequest, approved?: boolean): Promise<AppliedCommandEffect>;
}
