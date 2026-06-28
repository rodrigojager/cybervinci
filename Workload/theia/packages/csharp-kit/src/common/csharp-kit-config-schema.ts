import { IJSONSchema } from '@theia/core/lib/common/json-schema';

export const CSHARP_KIT_CONFIG_RELATIVE_PATH = '.cybervinci/csharp-kit.json';
export const CSHARP_KIT_CONFIG_SCHEMA_ID = 'cybervinci://schemas/csharp-kit';

export interface CSharpKitConfigTemplate {
    roslyn: {
        analyzerPath: string;
        timeoutMs: number;
    };
    debugAdapters: {
        coreclr: {
            command: string;
            args: string[];
        };
    };
    languageServers: {
        csharp: {
            command: string;
            args: string[];
            probeTimeoutMs: number;
        };
        razor: {
            command: string;
            args: string[];
            probeTimeoutMs: number;
        };
    };
}

export function createCSharpKitConfigTemplate(): CSharpKitConfigTemplate {
    return {
        roslyn: {
            analyzerPath: '',
            timeoutMs: 30000
        },
        debugAdapters: {
            coreclr: {
                command: '',
                args: ['--interpreter=vscode']
            }
        },
        languageServers: {
            csharp: {
                command: '',
                args: [],
                probeTimeoutMs: 7000
            },
            razor: {
                command: '',
                args: [],
                probeTimeoutMs: 7000
            }
        }
    };
}

function createCSharpKitConfigTemplateJson(): IJSONSchema['default'] {
    return createCSharpKitConfigTemplate() as unknown as IJSONSchema['default'];
}

const commandArgsSchema: IJSONSchema = {
    anyOf: [
        {
            type: 'array',
            items: {
                type: 'string'
            },
            default: []
        },
        {
            type: 'string',
            description: 'Command-line arguments split with shell-like quoting.'
        }
    ]
};

const commandConfigSchema: IJSONSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        id: {
            type: 'string',
            description: 'Optional stable adapter id displayed by C# Kit.'
        },
        label: {
            type: 'string',
            description: 'Optional display label for the adapter status panel.'
        },
        command: {
            type: 'string',
            description: 'Executable name on PATH or path relative to the workspace root.',
            default: ''
        },
        args: commandArgsSchema,
        probeTimeoutMs: {
            type: 'integer',
            minimum: 1000,
            description: 'Maximum time for the LSP initialize probe before reporting a timeout.',
            default: 7000
        }
    }
};

const debugAdapterConfigSchema: IJSONSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        command: {
            type: 'string',
            description: 'netcoredbg, vsdbg or another DAP-compatible executable name on PATH or path relative to the workspace root.',
            default: ''
        },
        args: commandArgsSchema
    }
};

export const CSHARP_KIT_CONFIG_SCHEMA: IJSONSchema = {
    $id: CSHARP_KIT_CONFIG_SCHEMA_ID,
    title: 'CyberVinci C# Kit workspace adapter configuration',
    type: 'object',
    additionalProperties: false,
    allowComments: true,
    allowTrailingCommas: true,
    default: createCSharpKitConfigTemplateJson(),
    defaultSnippets: [
        {
            label: 'C# Kit adapter configuration',
            description: 'Configure workspace-local Roslyn, CoreCLR and language-server adapter commands.',
            body: createCSharpKitConfigTemplateJson()
        }
    ],
    properties: {
        roslyn: {
            type: 'object',
            additionalProperties: false,
            description: 'CyberVinci Memory Roslyn sidecar settings.',
            properties: {
                analyzerPath: {
                    type: 'string',
                    description: 'Path to CyberVinci.Memory.RoslynSidecar.dll, relative to the workspace root or absolute.',
                    default: ''
                },
                timeoutMs: {
                    type: 'integer',
                    minimum: 1000,
                    description: 'Maximum time for a Roslyn semantic inventory request.',
                    default: 30000
                }
            }
        },
        debugAdapters: {
            type: 'object',
            additionalProperties: false,
            description: 'DAP debug adapters used by generated coreclr/clr launch profiles.',
            properties: {
                coreclr: debugAdapterConfigSchema,
                netcoredbg: debugAdapterConfigSchema
            }
        },
        languageServers: {
            type: 'object',
            additionalProperties: false,
            description: 'External LSP server commands that C# Kit can discover and probe without VSIX packaging.',
            properties: {
                csharp: commandConfigSchema,
                razor: commandConfigSchema
            }
        }
    }
};
