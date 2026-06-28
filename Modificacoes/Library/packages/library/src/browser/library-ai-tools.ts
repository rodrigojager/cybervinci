// *****************************************************************************
// Copyright (C) 2026 TypeFox GmbH.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    CapabilityType,
    GenericCapabilitiesContribution,
    GenericCapabilityGroup,
    ToolCallResult,
    ToolProvider,
    ToolRequest
} from '@theia/ai-core';
import { nls } from '@theia/core';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { inject, injectable } from '@theia/core/shared/inversify';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { LibraryService, DocsSearchOptions, InstallDocsPackageRequest } from '../common/library-service';

const PROVIDER_NAME = 'library';

export namespace LibraryToolIds {
    export const SEARCH = 'docs.search';
    export const GET_WORKSPACE_CONTEXT = 'docs.get_workspace_context';
    export const LIST_INSTALLED = 'docs.list_installed';
    export const INSTALL = 'docs.install';
    export const CHECK_UPDATES = 'docs.check_updates';

    export const ALL = [
        SEARCH,
        GET_WORKSPACE_CONTEXT,
        LIST_INSTALLED,
        INSTALL,
        CHECK_UPDATES
    ];
}

abstract class AbstractLibraryToolProvider implements ToolProvider {
    @inject(LibraryService)
    protected readonly libraryService: LibraryService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    abstract getTool(): ToolRequest;

    protected parseArgs<T extends object>(argString: string): T {
        return (argString ? JSON.parse(argString) : {}) as T;
    }

    protected async workspacePath(): Promise<string | undefined> {
        const roots = await this.workspaceService.roots;
        const root = roots[0];
        return root ? FileUri.fsPath(root.resource.toString()) : undefined;
    }
}

@injectable()
export class DocsSearchToolProvider extends AbstractLibraryToolProvider {
    getTool(): ToolRequest {
        return {
            id: LibraryToolIds.SEARCH,
            name: LibraryToolIds.SEARCH,
            providerName: PROVIDER_NAME,
            description: nls.localize(
                'theia/ai/docs/tools/search/description',
                'Search installed versioned documentation. Prefer this before answering framework, SDK, or API questions.'
            ),
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: nls.localize('theia/ai/docs/tools/search/query', 'Natural language query or API/topic to search for.')
                    },
                    packageId: {
                        type: 'string',
                        description: nls.localize('theia/ai/docs/tools/packageId', 'Optional documentation package id, for example nextjs or react.')
                    },
                    version: {
                        type: 'string',
                        description: nls.localize('theia/ai/docs/tools/version', 'Optional pinned documentation version.')
                    },
                    maxResults: {
                        type: 'integer',
                        description: nls.localize('theia/ai/docs/tools/maxResults', 'Maximum number of results to return.')
                    }
                },
                required: ['query']
            },
            handler: async (argString: string): Promise<ToolCallResult> => {
                const args = this.parseArgs<DocsSearchOptions & { query: string }>(argString);
                return this.libraryService.searchDocs(args.query, {
                    packageId: args.packageId,
                    version: args.version,
                    maxResults: args.maxResults
                });
            },
            getArgumentsShortLabel: args => ({ label: this.parseArgs<{ query?: string }>(args).query ?? '', hasMore: true })
        };
    }
}

@injectable()
export class DocsWorkspaceContextToolProvider extends AbstractLibraryToolProvider {
    getTool(): ToolRequest {
        return {
            id: LibraryToolIds.GET_WORKSPACE_CONTEXT,
            name: LibraryToolIds.GET_WORKSPACE_CONTEXT,
            providerName: PROVIDER_NAME,
            description: nls.localize(
                'theia/ai/docs/tools/workspaceContext/description',
                'Return documentation context for the current workspace, honoring .context-docs.lock.yaml when present.'
            ),
            parameters: {
                type: 'object',
                properties: {
                    question: {
                        type: 'string',
                        description: nls.localize('theia/ai/docs/tools/workspaceContext/question', 'User question to resolve against pinned local documentation.')
                    },
                    workspacePath: {
                        type: 'string',
                        description: nls.localize(
                            'theia/ai/docs/tools/workspacePath',
                            'Optional absolute workspace path. Defaults to the current Theia workspace.'
                        )
                    }
                },
                required: ['question']
            },
            handler: async (argString: string): Promise<ToolCallResult> => {
                const args = this.parseArgs<{ question: string; workspacePath?: string }>(argString);
                const workspacePath = args.workspacePath ?? await this.workspacePath();
                if (!workspacePath) {
                    return { error: nls.localize('theia/ai/docs/tools/noWorkspace', 'No workspace is open.') };
                }
                return this.libraryService.getWorkspaceLibrary(workspacePath, args.question);
            },
            getArgumentsShortLabel: args => ({ label: this.parseArgs<{ question?: string }>(args).question ?? '', hasMore: true })
        };
    }
}

@injectable()
export class DocsListInstalledToolProvider extends AbstractLibraryToolProvider {
    getTool(): ToolRequest {
        return {
            id: LibraryToolIds.LIST_INSTALLED,
            name: LibraryToolIds.LIST_INSTALLED,
            providerName: PROVIDER_NAME,
            description: nls.localize(
                'theia/ai/docs/tools/listInstalled/description',
                'List locally installed documentation packages, versions, hashes, and local index paths.'
            ),
            parameters: {
                type: 'object',
                properties: {}
            },
            handler: async (): Promise<ToolCallResult> => this.libraryService.listInstalledPackages()
        };
    }
}

@injectable()
export class DocsInstallToolProvider extends AbstractLibraryToolProvider {
    getTool(): ToolRequest {
        return {
            id: LibraryToolIds.INSTALL,
            name: LibraryToolIds.INSTALL,
            providerName: PROVIDER_NAME,
            description: nls.localize(
                'theia/ai/docs/tools/install/description',
                'Install or locally build a versioned documentation package from the configured registry.'
            ),
            parameters: {
                type: 'object',
                properties: {
                    packageId: {
                        type: 'string',
                        description: nls.localize('theia/ai/docs/tools/install/packageId', 'Registry package id to install.')
                    },
                    version: {
                        type: 'string',
                        description: nls.localize(
                            'theia/ai/docs/tools/install/version',
                            'Documentation version. Defaults to the best matching/latest registry version.'
                        )
                    },
                    pinToWorkspace: {
                        type: 'boolean',
                        description: nls.localize(
                            'theia/ai/docs/tools/install/pinToWorkspace',
                            'Whether to update .context-docs.lock.yaml in the current workspace.'
                        )
                    },
                    allowUnknownLicense: {
                        type: 'boolean',
                        description: nls.localize(
                            'theia/ai/docs/tools/install/allowUnknownLicense',
                            'Allow local build when redistribution policy is unknown.'
                        )
                    },
                    workspacePath: {
                        type: 'string',
                        description: nls.localize('theia/ai/docs/tools/install/workspacePath', 'Optional absolute workspace path.')
                    }
                },
                required: ['packageId']
            },
            handler: async (argString: string): Promise<ToolCallResult> => {
                const args = this.parseArgs<InstallDocsPackageRequest>(argString);
                const workspacePath = args.workspacePath ?? await this.workspacePath();
                return this.libraryService.installPackage({
                    ...args,
                    workspacePath,
                    pinToWorkspace: args.pinToWorkspace ?? Boolean(workspacePath)
                });
            },
            getArgumentsShortLabel: args => ({ label: this.parseArgs<{ packageId?: string }>(args).packageId ?? '', hasMore: true })
        };
    }
}

@injectable()
export class DocsCheckUpdatesToolProvider extends AbstractLibraryToolProvider {
    getTool(): ToolRequest {
        return {
            id: LibraryToolIds.CHECK_UPDATES,
            name: LibraryToolIds.CHECK_UPDATES,
            providerName: PROVIDER_NAME,
            description: nls.localize(
                'theia/ai/docs/tools/checkUpdates/description',
                'Check installed documentation packages for changed sources or newer registry/package-manager versions.'
            ),
            parameters: {
                type: 'object',
                properties: {
                    packageId: {
                        type: 'string',
                        description: nls.localize('theia/ai/docs/tools/checkUpdates/packageId', 'Optional installed documentation package id.')
                    }
                }
            },
            handler: async (argString: string): Promise<ToolCallResult> => {
                const args = this.parseArgs<{ packageId?: string }>(argString);
                return this.libraryService.checkUpdates(args.packageId);
            },
            getArgumentsShortLabel: args => ({
                label: this.parseArgs<{ packageId?: string }>(args).packageId ?? nls.localizeByDefault('All'),
                hasMore: false
            })
        };
    }
}

@injectable()
export class LibraryGenericCapabilitiesContribution implements GenericCapabilitiesContribution {
    readonly capabilityType: CapabilityType = 'functions';

    async getAvailableCapabilities(): Promise<GenericCapabilityGroup[]> {
        return [{
            name: nls.localize('theia/ai/docs/capabilities/group', 'Versioned Documentation'),
            items: [
                {
                    id: LibraryToolIds.SEARCH,
                    name: nls.localize('theia/ai/docs/capabilities/search/name', 'Search versioned docs'),
                    description: nls.localize('theia/ai/docs/capabilities/search/description', 'Search installed local documentation packages.')
                },
                {
                    id: LibraryToolIds.GET_WORKSPACE_CONTEXT,
                    name: nls.localize('theia/ai/docs/capabilities/workspaceContext/name', 'Workspace docs context'),
                    description: nls.localize(
                        'theia/ai/docs/capabilities/workspaceContext/description',
                        'Return context that honors the workspace documentation lockfile.'
                    )
                },
                {
                    id: LibraryToolIds.LIST_INSTALLED,
                    name: nls.localize('theia/ai/docs/capabilities/listInstalled/name', 'List installed docs'),
                    description: nls.localize('theia/ai/docs/capabilities/listInstalled/description', 'List locally installed documentation packages.')
                },
                {
                    id: LibraryToolIds.INSTALL,
                    name: nls.localize('theia/ai/docs/capabilities/install/name', 'Install docs package'),
                    description: nls.localize('theia/ai/docs/capabilities/install/description', 'Install or locally build a documentation package.')
                },
                {
                    id: LibraryToolIds.CHECK_UPDATES,
                    name: nls.localize('theia/ai/docs/capabilities/checkUpdates/name', 'Check docs updates'),
                    description: nls.localize(
                        'theia/ai/docs/capabilities/checkUpdates/description',
                        'Check for changed documentation sources or newer versions.'
                    )
                }
            ]
        }];
    }
}
