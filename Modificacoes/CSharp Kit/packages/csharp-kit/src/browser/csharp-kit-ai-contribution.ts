import {
    AIVariable,
    AIVariableContext,
    AIVariableContribution,
    AIVariableResolutionRequest,
    AIVariableResolver,
    AIVariableService,
    PromptService,
    PromptText,
    ResolvedAIContextVariable
} from '@theia/ai-core';
import { FrontendApplicationContribution, codiconArray } from '@theia/core/lib/browser';
import { QuickInputService } from '@theia/core/lib/browser/quick-input';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { MessageService, SelectionService, UriSelection, nls } from '@theia/core/lib/common';
import { inject, injectable } from '@theia/core/shared/inversify';
import * as monaco from '@theia/monaco-editor-core';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { CSharpKitService } from '../common';
import { listCSharpAIContextTargetOptions, quoteCSharpAIContextArgument, resolveCSharpAIContextTarget } from '../common/csharp-ai-context';

export const CSHARP_CONTEXT_VARIABLE: AIVariable = {
    id: 'cybervinci-csharp-context-provider',
    name: 'csharp_context',
    label: nls.localize('theia/csharp-kit/ai/contextVariableLabel', 'C# Context'),
    description: nls.localize(
        'theia/csharp-kit/ai/contextVariableDescription',
        'CyberVinci C# Kit AI/Memory context pack for the selected C# project, source file or workspace.'
    ),
    iconClasses: codiconArray('symbol-class'),
    isContextVariable: true,
    args: [{
        name: 'target',
        description: nls.localize(
            'theia/csharp-kit/ai/contextVariableArg',
            'Optional project name, project path, source file path, or "workspace".'
        ),
        isOptional: true
    }]
};

export const CSHARP_CONTEXT_PROMPT_ID = 'cybervinci-csharp-context';
export const CSHARP_TESTS_PROMPT_ID = 'cybervinci-csharp-tests';
export const CSHARP_REVIEW_PROMPT_ID = 'cybervinci-csharp-review';

@injectable()
export class CSharpKitAIContribution implements FrontendApplicationContribution, AIVariableContribution, AIVariableResolver {

    @inject(CSharpKitService)
    protected readonly service: CSharpKitService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(SelectionService)
    protected readonly selectionService: SelectionService;

    @inject(QuickInputService)
    protected readonly quickInputService: QuickInputService;

    @inject(MessageService)
    protected readonly messages: MessageService;

    @inject(PromptService)
    protected readonly promptService: PromptService;

    onStart(): void {
        this.promptService.addBuiltInPromptFragment({
            id: CSHARP_CONTEXT_PROMPT_ID,
            name: nls.localize('theia/csharp-kit/ai/contextPromptName', 'C# AI/Memory Context'),
            description: nls.localize('theia/csharp-kit/ai/contextPromptDescription', 'Attach the selected C# Kit AI/Memory context pack.'),
            template: [
                'Use the following CyberVinci C# Kit AI/Memory context pack before answering.',
                '',
                '{{csharp_context}}'
            ].join('\n'),
            isCommand: true,
            commandName: 'csharp-context',
            commandDescription: nls.localize('theia/csharp-kit/ai/contextCommandDescription', 'Attach the selected C# project context pack')
        });
        this.promptService.addBuiltInPromptFragment({
            id: CSHARP_TESTS_PROMPT_ID,
            name: nls.localize('theia/csharp-kit/ai/testsPromptName', 'C# Test Context'),
            description: nls.localize('theia/csharp-kit/ai/testsPromptDescription', 'Use C# Kit context to reason about missing or weak tests.'),
            template: [
                'Use the following CyberVinci C# Kit AI/Memory context pack.',
                'Focus on test coverage, test runner constraints, endpoint behavior and safe verification commands.',
                '',
                '{{csharp_context}}'
            ].join('\n'),
            isCommand: true,
            commandName: 'csharp-tests',
            commandDescription: nls.localize('theia/csharp-kit/ai/testsCommandDescription', 'Use selected C# context for test work')
        });
        this.promptService.addBuiltInPromptFragment({
            id: CSHARP_REVIEW_PROMPT_ID,
            name: nls.localize('theia/csharp-kit/ai/reviewPromptName', 'C# Review Context'),
            description: nls.localize('theia/csharp-kit/ai/reviewPromptDescription', 'Use C# Kit context to review project architecture and risk.'),
            template: [
                'Use the following CyberVinci C# Kit AI/Memory context pack.',
                'Focus on architecture, dependency boundaries, package/configuration risk, endpoints and test gaps.',
                '',
                '{{csharp_context}}'
            ].join('\n'),
            isCommand: true,
            commandName: 'csharp-review',
            commandDescription: nls.localize('theia/csharp-kit/ai/reviewCommandDescription', 'Use selected C# context for project review')
        });
    }

    registerVariables(service: AIVariableService): void {
        service.registerResolver(CSHARP_CONTEXT_VARIABLE, this);
        service.registerArgumentPicker(CSHARP_CONTEXT_VARIABLE, () => this.pickContextTarget());
        service.registerArgumentCompletionProvider(CSHARP_CONTEXT_VARIABLE, (model, position) => this.provideContextTargetCompletionItems(model, position));
    }

    canResolve(request: AIVariableResolutionRequest, _context: AIVariableContext): number {
        return request.variable.name === CSHARP_CONTEXT_VARIABLE.name ? 1 : 0;
    }

    async resolve(request: AIVariableResolutionRequest, _context: AIVariableContext): Promise<ResolvedAIContextVariable | undefined> {
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            const value = nls.localize('theia/csharp-kit/ai/noWorkspaceContext', 'No workspace is open for C# Kit context.');
            return {
                variable: CSHARP_CONTEXT_VARIABLE,
                arg: request.arg,
                value,
                contextValue: value
            };
        }
        const inspection = await this.service.inspectWorkspace({ workspacePath });
        const target = resolveCSharpAIContextTarget(workspacePath, inspection, request.arg, this.selectedPath());
        const result = await this.service.getCodeContext({
            workspacePath,
            solutionPath: target.solutionPath,
            projectPath: target.projectPath,
            documentPath: target.documentPath
        });
        const value = [
            `C# Kit context target: ${target.label} (${target.source})`,
            '',
            result.prompt
        ].join('\n');
        return {
            variable: CSHARP_CONTEXT_VARIABLE,
            arg: request.arg,
            value,
            contextValue: value
        };
    }

    protected async pickContextTarget(): Promise<string | undefined> {
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            this.messages.warn(nls.localize('theia/csharp-kit/ai/openWorkspaceBeforeContext', 'Open a workspace before selecting C# context.'));
            return undefined;
        }
        const inspection = await this.service.inspectWorkspace({ workspacePath });
        const picked = await this.quickInputService.pick(listCSharpAIContextTargetOptions(workspacePath, inspection), {
            placeHolder: nls.localize('theia/csharp-kit/ai/contextPickPlaceholder', 'Select C# context target')
        });
        return picked ? quoteCSharpAIContextArgument(picked.arg) : undefined;
    }

    protected async provideContextTargetCompletionItems(
        model: monaco.editor.ITextModel,
        position: monaco.Position
    ): Promise<monaco.languages.CompletionItem[] | undefined> {
        const lineContent = model.getLineContent(position.lineNumber);
        const triggerCharIndex = lineContent.lastIndexOf(PromptText.VARIABLE_SEPARATOR_CHAR, position.column - 1);
        if (triggerCharIndex === -1) {
            return undefined;
        }
        const requiredVariable = `${PromptText.VARIABLE_CHAR}${CSHARP_CONTEXT_VARIABLE.name}`;
        if (triggerCharIndex < requiredVariable.length ||
            lineContent.substring(triggerCharIndex - requiredVariable.length, triggerCharIndex) !== requiredVariable) {
            return undefined;
        }
        const workspacePath = await this.workspacePath();
        if (!workspacePath) {
            return undefined;
        }
        const inspection = await this.service.inspectWorkspace({ workspacePath });
        const range = new monaco.Range(position.lineNumber, triggerCharIndex + 2, position.lineNumber, position.column);
        return listCSharpAIContextTargetOptions(workspacePath, inspection).map((option, index) => ({
            label: option.label,
            kind: option.kind === 'workspace'
                ? monaco.languages.CompletionItemKind.Folder
                : option.kind === 'solution'
                    ? monaco.languages.CompletionItemKind.Struct
                    : option.kind === 'project'
                        ? monaco.languages.CompletionItemKind.Module
                        : monaco.languages.CompletionItemKind.File,
            insertText: quoteCSharpAIContextArgument(option.arg),
            range,
            detail: option.detail,
            documentation: option.description,
            sortText: `${String(index).padStart(4, '0')}:${option.label}`
        }));
    }

    protected async workspacePath(): Promise<string | undefined> {
        const roots = await this.workspaceService.roots;
        const root = roots[0];
        return root ? FileUri.fsPath(root.resource.toString()) : undefined;
    }

    protected selectedPath(): string | undefined {
        const uri = UriSelection.getUri(this.selectionService.selection);
        return uri ? FileUri.fsPath(uri.toString()) : undefined;
    }
}
