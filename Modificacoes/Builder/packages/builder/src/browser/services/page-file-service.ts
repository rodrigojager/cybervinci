import URI from '@theia/core/lib/common/uri';
import { Builder_FILE_EXTENSION, BUILDER_FILE_EXTENSIONS, isBuilderFileName } from '../../common';

export interface PageFileIdentity {
    readonly uri: URI;
    readonly fileName: string;
    readonly isLegacyBuilderFile: boolean;
}

export function createPageFileIdentity(uri: URI): PageFileIdentity {
    const fileName = uri.path.base;
    return {
        uri,
        fileName,
        isLegacyBuilderFile: !fileName.endsWith(Builder_FILE_EXTENSION)
    };
}

export function assertPageBuilderFileName(uri: URI): void {
    if (!isBuilderFileName(uri.path.toString())) {
        throw new Error(`CyberVinci page files must use one of these extensions: ${BUILDER_FILE_EXTENSIONS.join(', ')}.`);
    }
}
