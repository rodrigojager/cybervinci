import { CyberVinciCatalogDiagnostic, CyberVinciDeclarativeChatAgent, CyberVinciPlaybookDefinition, CyberVinciPlaybookState, CyberVinciToolDefinition } from '../common';
export interface CyberVinciCatalogValidationResult<T> {
    value?: T;
    diagnostics: CyberVinciCatalogDiagnostic[];
}
export declare class CyberVinciCatalogValidator {
    validateAgent(candidate: unknown, source: string): CyberVinciCatalogValidationResult<CyberVinciDeclarativeChatAgent>;
    validateTool(candidate: unknown, source: string): CyberVinciCatalogValidationResult<CyberVinciToolDefinition>;
    validatePlaybook(candidate: unknown, source: string): CyberVinciCatalogValidationResult<CyberVinciPlaybookDefinition>;
    protected validatePlaybookState(candidate: unknown, index: number, playbookId: string, source: string): CyberVinciCatalogValidationResult<CyberVinciPlaybookState>;
    protected referencedStates(state: CyberVinciPlaybookState): string[];
    protected validateAiState(candidate: Record<string, unknown>, stateId: string, playbookId: string, source: string, diagnostics: CyberVinciCatalogDiagnostic[]): void;
    protected validateAskState(candidate: Record<string, unknown>, stateId: string, playbookId: string, source: string, diagnostics: CyberVinciCatalogDiagnostic[]): void;
    protected validateConditionState(candidate: Record<string, unknown>, stateId: string, playbookId: string, source: string, diagnostics: CyberVinciCatalogDiagnostic[]): void;
    protected validateFlowState(candidate: Record<string, unknown>, stateId: string, playbookId: string, source: string, diagnostics: CyberVinciCatalogDiagnostic[]): void;
    protected validateParallelState(candidate: Record<string, unknown>, stateId: string, playbookId: string, source: string, diagnostics: CyberVinciCatalogDiagnostic[]): void;
    protected validateTransitions(value: unknown, stateId: string, playbookId: string, source: string, diagnostics: CyberVinciCatalogDiagnostic[]): void;
    protected validateAskOptions(value: unknown, stateId: string, playbookId: string, source: string, diagnostics: CyberVinciCatalogDiagnostic[], required?: boolean): void;
    protected validateConditionCases(value: unknown, stateId: string, playbookId: string, source: string, diagnostics: CyberVinciCatalogDiagnostic[], required?: boolean): void;
    protected validateStringArray(value: unknown, field: string, label: string, id: string | undefined, source: string, diagnostics: CyberVinciCatalogDiagnostic[]): void;
    protected isRecord(candidate: unknown): candidate is Record<string, unknown>;
    protected string(value: unknown): string | undefined;
    protected invalid<T>(message: string, source: string, id?: string): CyberVinciCatalogValidationResult<T>;
    protected error(message: string, source: string, id?: string): CyberVinciCatalogDiagnostic;
    protected warn(message: string, source: string, id?: string): CyberVinciCatalogDiagnostic;
}
