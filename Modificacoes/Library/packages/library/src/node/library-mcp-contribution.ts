// *****************************************************************************
// Copyright (C) 2026 TypeFox GmbH.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { MCPBackendContribution } from '@theia/ai-mcp-server/lib/node/mcp-theia-server';
import { nls } from '@theia/core';
import { injectable, inject } from '@theia/core/shared/inversify';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { LibraryService } from '../common/library-service';

@injectable()
export class LibraryMcpContribution implements MCPBackendContribution {
    @inject(LibraryService)
    protected readonly libraryService: LibraryService;

    configure(server: McpServer): void {
        const mcpServer = server as unknown as {
            registerTool(
                name: string,
                config: object,
                handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>
            ): void;
        };
        mcpServer.registerTool('docs.search', {
            title: nls.localize('theia/ai/docs/mcp/search/title', 'Search installed documentation'),
            description: nls.localize('theia/ai/docs/mcp/search/description', 'Search locally installed versioned documentation packages.'),
            inputSchema: {
                query: z.string(),
                packageId: z.string().optional(),
                version: z.string().optional(),
                maxResults: z.number().optional()
            }
        }, async args => this.result(await this.libraryService.searchDocs(this.requiredStringArg(args.query, 'query'), {
            packageId: this.stringArg(args.packageId),
            version: this.stringArg(args.version),
            maxResults: this.numberArg(args.maxResults)
        })));

        mcpServer.registerTool('docs.get_package', {
            title: nls.localize('theia/ai/docs/mcp/getPackage/title', 'Get documentation package'),
            description: nls.localize(
                'theia/ai/docs/mcp/getPackage/description',
                'Return installed package metadata for a package id and optional version.'
            ),
            inputSchema: {
                packageId: z.string(),
                version: z.string().optional()
            }
        }, async args => {
            const packageId = this.requiredStringArg(args.packageId, 'packageId');
            const version = this.stringArg(args.version);
            const packages = await this.libraryService.listInstalledPackages();
            return this.result(packages.filter(candidate =>
                candidate.id === packageId && (!version || candidate.version === version)
            ));
        });

        mcpServer.registerTool('docs.list_installed', {
            title: nls.localize('theia/ai/docs/mcp/listInstalled/title', 'List installed documentation'),
            description: nls.localize('theia/ai/docs/mcp/listInstalled/description', 'List all locally installed documentation packages.')
        }, async () => this.result(await this.libraryService.listInstalledPackages()));

        mcpServer.registerTool('docs.install', {
            title: nls.localize('theia/ai/docs/mcp/install/title', 'Install documentation package'),
            description: nls.localize('theia/ai/docs/mcp/install/description', 'Install a versioned documentation package from the configured registry.'),
            inputSchema: {
                packageId: z.string(),
                version: z.string().optional(),
                workspacePath: z.string().optional(),
                pinToWorkspace: z.boolean().optional()
            }
        }, async args => this.result(await this.libraryService.installPackage({
            packageId: this.requiredStringArg(args.packageId, 'packageId'),
            version: this.stringArg(args.version),
            workspacePath: this.stringArg(args.workspacePath),
            pinToWorkspace: this.booleanArg(args.pinToWorkspace)
        })));

        mcpServer.registerTool('docs.check_updates', {
            title: nls.localize('theia/ai/docs/mcp/checkUpdates/title', 'Check documentation updates'),
            description: nls.localize(
                'theia/ai/docs/mcp/checkUpdates/description',
                'Check installed documentation packages for registry, Git, or HTTP updates.'
            ),
            inputSchema: {
                packageId: z.string().optional()
            }
        }, async args => this.result(await this.libraryService.checkUpdates(this.stringArg(args.packageId))));

        mcpServer.registerTool('docs.list_available', {
            title: nls.localize('theia/ai/docs/mcp/listAvailable/title', 'List available documentation'),
            description: nls.localize('theia/ai/docs/mcp/listAvailable/description', 'List packages available in the configured documentation registry.')
        }, async () => this.result(await this.libraryService.listAvailablePackages()));
    }

    protected result(value: unknown): { content: Array<{ type: 'text'; text: string }> } {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify(value, undefined, 2)
            }]
        };
    }

    protected stringArg(value: unknown): string | undefined {
        return typeof value === 'string' ? value : undefined;
    }

    protected requiredStringArg(value: unknown, name: string): string {
        if (typeof value !== 'string') {
            throw new Error(nls.localize('theia/ai/docs/mcp/missingStringArg', 'Missing required string argument: {0}', name));
        }
        return value;
    }

    protected numberArg(value: unknown): number | undefined {
        return typeof value === 'number' ? value : undefined;
    }

    protected booleanArg(value: unknown): boolean | undefined {
        return typeof value === 'boolean' ? value : undefined;
    }
}
