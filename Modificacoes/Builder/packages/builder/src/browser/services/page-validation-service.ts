import {
    validateBuilderDocumentActionsAgainstRegistry,
    validateBuilderDocumentDataSourcesAgainstRegistry,
    validateBuilderDocumentTypesAgainstRegistry,
    type BuilderActionRegistry,
    type BuilderComponentRegistry,
    type BuilderDataSourceRegistry
} from '@cybervinci/builder-registry';
import { validateBuilderDocumentStructure, type BuilderDocument } from '@cybervinci/builder-schema';

export interface PageValidationRegistries {
    readonly components: BuilderComponentRegistry;
    readonly actions: BuilderActionRegistry;
    readonly dataSources: BuilderDataSourceRegistry;
}

export interface PageValidationIssue {
    readonly path: string;
    readonly message: string;
    readonly nodeId?: string;
    readonly subjectId?: string;
    readonly subjectType?: string;
}

export function validatePageDocument(document: BuilderDocument, registries: PageValidationRegistries): PageValidationIssue[] {
    return [
        ...validateBuilderDocumentStructure(document).errors,
        ...validateBuilderDocumentTypesAgainstRegistry(document, registries.components).errors,
        ...validateBuilderDocumentActionsAgainstRegistry(document, registries.actions).errors.map(error => ({
            path: error.path,
            message: error.message,
            subjectId: error.actionId,
            subjectType: error.actionType
        })),
        ...validateBuilderDocumentDataSourcesAgainstRegistry(document, registries.dataSources).errors.map(error => ({
            path: error.path,
            message: error.message,
            subjectId: error.dataSourceId,
            subjectType: error.dataSourceType
        }))
    ];
}
