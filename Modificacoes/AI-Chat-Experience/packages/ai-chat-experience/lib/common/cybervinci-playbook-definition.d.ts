export type CyberVinciPlaybookCatalogVersion = 'cybervinci.playbook/v1';
export type CyberVinciPlaybookStateType = 'start' | 'guard' | 'tool' | 'ai' | 'ask' | 'condition' | 'flow' | 'playbook' | 'parallel' | 'response' | 'end';
export type CyberVinciPlaybookSource = 'core' | 'system' | 'system-override' | 'user';
export interface CyberVinciPlaybookTransition {
    to: string;
    when?: CyberVinciPlaybookCondition | string;
    label?: string;
}
export interface CyberVinciPlaybookAskOption {
    id: string;
    label: string;
    next?: string;
}
export interface CyberVinciPlaybookConditionCase {
    if: CyberVinciPlaybookCondition | string;
    next: string;
}
export interface CyberVinciPlaybookCondition {
    exists?: unknown;
    lengthGreaterThan?: [unknown, number];
    equals?: [unknown, unknown];
    not?: CyberVinciPlaybookCondition | string | unknown;
    and?: Array<CyberVinciPlaybookCondition | string | unknown>;
    or?: Array<CyberVinciPlaybookCondition | string | unknown>;
}
export interface CyberVinciPlaybookRetry {
    max?: number;
    delayMs?: number;
}
export interface CyberVinciPlaybookState {
    id: string;
    type: CyberVinciPlaybookStateType;
    label?: string;
    description?: string;
    prompt?: string;
    template?: string;
    tool?: string;
    guard?: string;
    agent?: string;
    provider?: 'inherit' | Record<string, unknown>;
    input?: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
    outputMode?: 'text' | 'json';
    args?: Record<string, unknown>;
    saveAs?: string;
    playbook?: string;
    playbookId?: string;
    branches?: string[];
    flowId?: string;
    mode?: 'saved' | 'dynamic' | 'authoring';
    workflowId?: string;
    preferSaved?: boolean;
    authoringDraft?: unknown;
    route?: 'direct' | 'saved-flow' | 'dynamic-workflow';
    text?: string;
    options?: CyberVinciPlaybookAskOption[];
    cases?: CyberVinciPlaybookConditionCase[];
    default?: string;
    next?: string;
    onPass?: string;
    onFail?: string;
    onError?: string;
    retry?: CyberVinciPlaybookRetry;
    transitions?: CyberVinciPlaybookTransition[];
}
export interface CyberVinciPlaybookDefinition {
    version?: CyberVinciPlaybookCatalogVersion | 1;
    id: string;
    name: string;
    description?: string;
    category?: string;
    source?: CyberVinciPlaybookSource;
    sourcePath?: string;
    entry: string;
    states: CyberVinciPlaybookState[];
    uses?: {
        tools?: string[];
        guards?: string[];
        skills?: string[];
        flows?: string[];
    };
    defaults?: {
        agent?: string;
        provider?: Record<string, unknown>;
        modelExecution?: Record<string, unknown>;
    };
    tools?: string[];
    guards?: string[];
    tags?: string[];
    enabled?: boolean;
}
export interface CyberVinciPlaybookSummary {
    id: string;
    name: string;
    description?: string;
    category: string;
    source?: CyberVinciPlaybookSource;
    sourcePath?: string;
    enabled?: boolean;
}
//# sourceMappingURL=cybervinci-playbook-definition.d.ts.map