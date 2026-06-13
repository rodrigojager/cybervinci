import * as fs from 'fs';
import * as path from 'path';
import { injectable } from '@theia/core/shared/inversify';
import { IJSONSchema, IJSONSchemaSnippet } from '@theia/core/lib/common/json-schema';
import { DebugConfiguration } from '@theia/debug/lib/common/debug-configuration';
import { DebugAdapterContribution, DebugAdapterExecutable } from '@theia/debug/lib/common/debug-model';
import { CSHARP_KIT_CONFIG_RELATIVE_PATH } from '../common/csharp-kit-config-schema';
import { CSharpDebugAdapterWorkspaceConfig, resolveCSharpDebugAdapterStatus } from './csharp-coreclr-debug-adapter';

const DOTNET_TOOL_MANIFEST_RELATIVE_PATHS = ['.config/dotnet-tools.json', 'dotnet-tools.json'];

abstract class BaseCSharpCoreClrDebugAdapterContribution implements DebugAdapterContribution {
    abstract readonly type: string;
    readonly label = 'C# Kit CoreCLR';
    readonly languages = ['csharp'];

    getSchemaAttributes(): IJSONSchema[] {
        return [{
            type: 'object',
            required: ['type', 'request', 'name'],
            properties: {
                type: {
                    enum: [this.type]
                },
                request: {
                    enum: ['launch', 'attach']
                },
                name: {
                    type: 'string'
                },
                program: {
                    type: 'string',
                    description: 'Path to the .NET assembly DLL to debug.'
                },
                cwd: {
                    type: 'string',
                    description: 'Working directory for the debug target.'
                },
                args: {
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                },
                env: {
                    type: 'object'
                },
                stopAtEntry: {
                    type: 'boolean'
                },
                processId: {
                    type: ['string', 'number'],
                    description: 'Process id for attach requests.'
                }
            }
        }];
    }

    getConfigurationSnippets(): IJSONSchemaSnippet[] {
        return [{
            label: `C# Kit: ${this.type} launch`,
            body: {
                type: this.type,
                request: 'launch',
                name: 'C# Kit: Debug .NET',
                program: '^"${workspaceFolder}/bin/Debug/<target-framework>/<assembly>.dll"',
                cwd: '^"${workspaceFolder}"',
                console: 'integratedTerminal',
                stopAtEntry: false
            }
        }];
    }

    provideDebugAdapterExecutable(config: DebugConfiguration): DebugAdapterExecutable | undefined {
        const workspacePath = this.workspacePathFromDebugConfiguration(config);
        const status = resolveCSharpDebugAdapterStatus(
            process.env,
            workspacePath,
            workspacePath ? this.readDebugAdapterConfig(workspacePath) : undefined,
            CSHARP_KIT_CONFIG_RELATIVE_PATH
        );
        if (status.mode !== 'ready' || !status.command) {
            return undefined;
        }
        return {
            command: status.command,
            args: status.args
        };
    }

    protected workspacePathFromDebugConfiguration(config: DebugConfiguration): string | undefined {
        for (const candidate of [config.cwd, typeof config.program === 'string' ? path.dirname(config.program) : undefined]) {
            if (!this.isResolvedLocalPath(candidate)) {
                continue;
            }
            const configRoot = this.findConfigRoot(candidate);
            if (configRoot) {
                return configRoot;
            }
        }
        return undefined;
    }

    protected isResolvedLocalPath(value: unknown): value is string {
        return typeof value === 'string'
            && Boolean(value.trim())
            && !value.includes('${')
            && !value.startsWith('file:')
            && path.isAbsolute(value);
    }

    protected findConfigRoot(startPath: string): string | undefined {
        let directory = fs.existsSync(startPath) && fs.statSync(startPath).isFile() ? path.dirname(startPath) : startPath;
        while (directory) {
            if (
                fs.existsSync(path.join(directory, ...CSHARP_KIT_CONFIG_RELATIVE_PATH.split('/')))
                || DOTNET_TOOL_MANIFEST_RELATIVE_PATHS.some(relativePath => fs.existsSync(path.join(directory, ...relativePath.split('/'))))
            ) {
                return directory;
            }
            const parent = path.dirname(directory);
            if (parent === directory) {
                return undefined;
            }
            directory = parent;
        }
        return undefined;
    }

    protected readDebugAdapterConfig(workspacePath: string): CSharpDebugAdapterWorkspaceConfig | undefined {
        try {
            const parsed = JSON.parse(fs.readFileSync(path.join(workspacePath, ...CSHARP_KIT_CONFIG_RELATIVE_PATH.split('/')), 'utf8'));
            return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
                ? parsed as CSharpDebugAdapterWorkspaceConfig
                : undefined;
        } catch {
            return undefined;
        }
    }
}

@injectable()
export class CSharpCoreClrDebugAdapterContribution extends BaseCSharpCoreClrDebugAdapterContribution {
    readonly type = 'coreclr';
}

@injectable()
export class CSharpClrDebugAdapterContribution extends BaseCSharpCoreClrDebugAdapterContribution {
    readonly type = 'clr';
}
