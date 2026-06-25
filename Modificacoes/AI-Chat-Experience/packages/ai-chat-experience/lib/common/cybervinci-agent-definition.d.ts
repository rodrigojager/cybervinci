export type CyberVinciAgentCatalogVersion = 'cybervinci.agent/v1';
export type CyberVinciAgentKind = 'native' | 'delegate' | 'prompt' | 'markdown' | 'flow' | 'external' | 'profile';
export interface CyberVinciAgentModeDefinition {
    id: string;
    name: string;
    isDefault?: boolean;
}
export interface CyberVinciAgentPromptVariant {
    id: string;
    name?: string;
    description?: string;
    template: string;
    isDefault?: boolean;
}
export interface CyberVinciAgentLanguageModelRequirement {
    purpose: string;
    identifier?: string;
    name?: string;
    vendor?: string;
    version?: string;
    family?: string;
    tokens?: number;
}
export interface CyberVinciNativePreservationPolicy {
    invoke?: boolean;
    modes?: boolean;
    prompts?: boolean;
    variables?: boolean;
    functions?: boolean;
    languageModelRequirements?: boolean;
}
export interface CyberVinciAgentToolCapability {
    id: string;
    kind?: 'tool' | 'guard' | 'action' | 'query' | 'effect' | 'ai' | 'flow' | 'ui' | string;
    source?: 'native' | 'playbook' | 'theia' | 'catalog' | 'system' | 'user' | string;
    description?: string;
    required?: boolean;
}
export interface CyberVinciAgentPromptCapability {
    id: string;
    defaultVariant?: string;
    variants?: string[];
}
export interface CyberVinciAgentVariableCapability {
    id: string;
    description?: string;
    usedInPrompt?: boolean;
}
export interface CyberVinciAgentCapabilityProfile {
    tools?: CyberVinciAgentToolCapability[];
    guards?: CyberVinciAgentToolCapability[];
    variables?: string[];
    agentSpecificVariables?: CyberVinciAgentVariableCapability[];
    functions?: string[];
    promptFunctionRefs?: string[];
    mcpPromptRefs?: string[];
    modes?: string[];
    prompts?: string[];
    promptSets?: CyberVinciAgentPromptCapability[];
    languageModels?: string[];
}
export type CyberVinciAgentMigrationStrategy = 'playbook-overlay-native-delegate' | 'playbook-autonomous-preferred-native-fallback' | 'playbook-autonomous';
export interface CyberVinciAgentMigrationReadyStatus {
    editableUserCopy?: boolean;
    capabilityProfile?: boolean;
    replacementStillUsesNativeDelegate?: boolean;
    fallbackStillUsesNativeDelegate?: boolean;
    [key: string]: unknown;
}
export interface CyberVinciAgentMigrationStatus {
    strategy: CyberVinciAgentMigrationStrategy;
    autonomousPlaybook?: boolean;
    nativeDelegate?: boolean;
    nativeDelegateFallback?: boolean;
    nativeDelegateTool?: string;
    selectedPlaybook?: string;
    sourceAgentId?: string;
    deterministicCoverage?: string[];
    migrationReady?: CyberVinciAgentMigrationReadyStatus;
    [key: string]: unknown;
}
export interface CyberVinciAgentDefinition {
    version?: CyberVinciAgentCatalogVersion | 1;
    id: string;
    name: string;
    kind: CyberVinciAgentKind;
    category?: string;
    description?: string;
    sourceAgentId?: string;
    source?: 'system' | 'system-override' | 'user' | 'runtime';
    sourcePath?: string;
    relativePath?: string;
    iconClass?: string;
    locations?: string[];
    tags?: string[];
    showInChat?: boolean;
    prompt?: string;
    promptVariants?: CyberVinciAgentPromptVariant[];
    defaultPlaybook?: string;
    playbooks?: string[];
    providerDefaults?: Record<string, unknown>;
    modes?: CyberVinciAgentModeDefinition[];
    agentProfile?: string;
    agencyProfile?: string;
    languageModelRequirements?: CyberVinciAgentLanguageModelRequirement[];
    tools?: string[];
    capabilityProfile?: CyberVinciAgentCapabilityProfile;
    variables?: string[];
    functions?: string[];
    preserveNative?: CyberVinciNativePreservationPolicy;
    migrationStatus?: CyberVinciAgentMigrationStatus;
}
export interface CyberVinciAgentSummary {
    id: string;
    name: string;
    category: string;
    relativePath: string;
    description?: string;
    kind?: CyberVinciAgentKind;
    source?: CyberVinciAgentDefinition['source'];
    sourcePath?: string;
}
export interface CyberVinciAgent extends CyberVinciAgentSummary {
    content: string;
}
export type CyberVinciAgencyAgentSummary = CyberVinciAgentSummary;
export type CyberVinciAgencyAgent = CyberVinciAgent;
export type CyberVinciDeclarativeChatAgentKind = Exclude<CyberVinciAgentKind, 'profile'>;
export type CyberVinciDeclarativeChatMode = CyberVinciAgentModeDefinition;
export type CyberVinciDeclarativePromptVariant = CyberVinciAgentPromptVariant;
export type CyberVinciDeclarativeLanguageModelRequirement = CyberVinciAgentLanguageModelRequirement;
export type CyberVinciDeclarativeChatAgent = CyberVinciAgentDefinition;
