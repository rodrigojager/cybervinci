import { reactExporter, type BuilderReactExportResult } from '@cybervinci/builder-export-react';
import { type BuilderComponentRegistry } from '@cybervinci/builder-registry';
import { type BuilderDocument } from '@cybervinci/builder-schema';

export interface PageReactExportOptions {
    readonly registry?: BuilderComponentRegistry;
    readonly includeCanonicalDocument?: boolean;
}

export function exportPageToReactTsx(document: BuilderDocument, options: PageReactExportOptions = {}): BuilderReactExportResult {
    return reactExporter(document, {
        registry: options.registry,
        componentImportPath: '@mantine/core',
        includeCanonicalDocument: options.includeCanonicalDocument ?? true,
        pretty: true
    });
}
