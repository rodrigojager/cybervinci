import { inject, injectable, optional } from '@theia/core/shared/inversify';
import {
    CyberVinciAiRuntimeService,
    CyberVinciAiTaskResult
} from '@cybervinci/ai-runtime/lib/common';
import {
    OpenPencilAiDesignProvider,
    OpenPencilAiDesignProviderResult,
    OpenPencilAiDesignRequest,
    OpenPencilAiSkillContext
} from './openpencil-design-command-service';
import { OpenPencilDesignOperation } from '../common/openpencil-types';

interface OpenPencilAiRuntimeResponse {
    contract?: string;
    operations?: OpenPencilDesignOperation[];
    diagnostics?: string[];
    summary?: string;
}

@injectable()
export class OpenPencilAiRuntimeDesignProvider implements OpenPencilAiDesignProvider {

    readonly id = 'openpencil.cybervinci-ai-runtime';
    readonly label = 'CyberVinci AI Runtime';
    readonly priority = 300;

    @inject(CyberVinciAiRuntimeService) @optional()
    protected readonly aiRuntime: CyberVinciAiRuntimeService | undefined;

    async generateOperations(request: OpenPencilAiDesignRequest, context: OpenPencilAiSkillContext): Promise<OpenPencilAiDesignProviderResult> {
        if (!this.aiRuntime) {
            return {
                diagnostics: ['CyberVinci AI Runtime is not available in this frontend container.']
            };
        }
        const result = await this.aiRuntime.runTask<OpenPencilAiRuntimeTaskInput, OpenPencilAiRuntimeResponse>({
            surfaceId: 'openpencil-design',
            action: 'canvas.generateOperations',
            workspacePath: request.workspacePath,
            sessionId: this.sessionId(request, context),
            userPrompt: request.prompt,
            systemPrompt: this.createSystemPrompt(request),
            input: this.createInput(request, context),
            context: {
                mode: request.workspacePath ? 'memory-if-available' : 'none',
                queries: [
                    request.prompt,
                    `OpenPencil Canvas ${request.mode ?? context.phase}`,
                    context.documentContext.documentName
                ],
                maxItems: 5,
                tokenBudget: 3000,
                taskId: 'openpencil-design'
            },
            output: {
                mode: 'json',
                schemaName: 'openpencil_design_operations',
                schema: OPENPENCIL_AI_RUNTIME_RESPONSE_SCHEMA,
                instructions: [
                    'Return only one JSON object.',
                    'The JSON object must use contract "openpencil.design-operations.v1".',
                    'The operations array must contain OpenPencilDesignOperation objects only.',
                    'Do not include markdown, prose, DOM patches, HTML, CSS, shell commands, or filesystem edits.'
                ].join(' ')
            },
            effectPolicy: {
                previewOnly: true,
                workspaceWrites: 'forbidden',
                shellExecution: 'forbidden',
                requireUserConfirmation: false
            },
            execution: {
                approvalPolicy: 'never',
                sandboxMode: 'read-only',
                webSearch: 'disabled',
                ...request.execution
            }
        });
        return this.toProviderResult(result);
    }

    protected createSystemPrompt(request: OpenPencilAiDesignRequest): string {
        return [
            'You are CyberVinci Canvas AI for OpenPencil.',
            'Generate or edit the .op document by returning structured OpenPencilDesignOperation JSON only.',
            'You are provider-neutral: follow this contract regardless of the selected provider, model, runtime, or reasoning effort.',
            'Preserve existing node IDs unless creating new nodes.',
            'For incremental stages, produce operations for the current stage only; do not wait to design the entire page if the stage asks for one section, skeleton, content pass, or refinement pass.',
            request.mode === 'continuation'
                ? 'Continuation mode: keep existing content, preserve geometry, and add or refine only what the user requested.'
                : undefined,
            request.selection.length
                ? 'Selected-node edit mode: preserve selected node IDs unless replacement is explicitly required.'
                : undefined
        ].filter(Boolean).join(' ');
    }

    protected createInput(request: OpenPencilAiDesignRequest, context: OpenPencilAiSkillContext): OpenPencilAiRuntimeTaskInput {
        return {
            contract: 'openpencil.ai-runtime-task.v1',
            request: {
                mode: request.mode ?? context.phase,
                uri: request.uri,
                selection: request.selection
            },
            documentContext: context.documentContext,
            responseContract: context.responseContract,
            operationExamples: context.operationExamples,
            designGuidance: context.skills.map(skill => ({
                name: skill.name,
                phase: skill.phase,
                category: skill.category,
                sourcePath: skill.sourcePath,
                guidance: skill.guidance,
                tags: skill.tags,
                platform: skill.platform,
                content: skill.content
            }))
        };
    }

    protected toProviderResult(result: CyberVinciAiTaskResult<OpenPencilAiRuntimeResponse>): OpenPencilAiDesignProviderResult {
        const structured = result.structured;
        const diagnostics = [
            ...result.diagnostics,
            ...(structured?.diagnostics ?? [])
        ];
        if (structured?.summary) {
            diagnostics.push(`AI Runtime summary: ${structured.summary}`);
        }
        if (structured?.contract && structured.contract !== 'openpencil.design-operations.v1') {
            diagnostics.push(`AI Runtime returned unknown contract '${structured.contract}'; accepting operations after local validation.`);
        }
        return {
            operations: structured?.operations,
            diagnostics
        };
    }

    protected sessionId(request: OpenPencilAiDesignRequest, context: OpenPencilAiSkillContext): string {
        const uri = request.uri ?? context.documentContext.documentName;
        return `openpencil:${uri}:${request.mode ?? context.phase}`;
    }
}

interface OpenPencilAiRuntimeTaskInput {
    contract: 'openpencil.ai-runtime-task.v1';
    request: {
        mode: OpenPencilAiDesignRequest['mode'] | OpenPencilAiSkillContext['phase'];
        uri?: string;
        selection: string[];
    };
    documentContext: OpenPencilAiSkillContext['documentContext'];
    responseContract: OpenPencilAiSkillContext['responseContract'];
    operationExamples: OpenPencilAiSkillContext['operationExamples'];
    designGuidance: Array<Pick<OpenPencilAiSkillContext['skills'][number], 'name' | 'phase' | 'category' | 'sourcePath' | 'guidance' | 'tags' | 'platform' | 'content'>>;
}

const OPENPENCIL_AI_RUNTIME_RESPONSE_SCHEMA: Record<string, unknown> = {
    type: 'object',
    additionalProperties: false,
    required: ['contract', 'operations'],
    properties: {
        contract: {
            type: 'string',
            enum: ['openpencil.design-operations.v1']
        },
        summary: {
            type: 'string'
        },
        diagnostics: {
            type: 'array',
            items: { type: 'string' }
        },
        operations: {
            type: 'array',
            minItems: 1,
            items: {
                type: 'object',
                additionalProperties: true,
                required: ['operation'],
                properties: {
                    operation: {
                        type: 'string',
                        enum: [
                            'addNode',
                            'createNode',
                            'updateNode',
                            'removeNode',
                            'deleteNode',
                            'replaceNode',
                            'moveNode',
                            'resizeNode',
                            'moveToParent',
                            'nudgeNodes',
                            'alignNodes',
                            'distributeNodes',
                            'duplicateNode',
                            'reorderNode',
                            'bringForward',
                            'sendBackward',
                            'bringToFront',
                            'sendToBack',
                            'groupNodes',
                            'ungroupNode',
                            'booleanNodes',
                            'convertToPath',
                            'updatePathAnchors',
                            'updatePathAnchor',
                            'updatePathHandle',
                            'insertPathAnchor',
                            'removePathAnchor',
                            'addPage',
                            'updatePage',
                            'removePage',
                            'setActivePage',
                            'setVariable',
                            'updateVariable',
                            'removeVariable',
                            'setThemes',
                            'updateThemeAxis',
                            'removeThemeAxis',
                            'setNodeTheme',
                            'clearNodeTheme',
                            'setNodeLayout',
                            'autoLayoutNode',
                            'setSelection'
                        ]
                    }
                }
            }
        }
    }
};
