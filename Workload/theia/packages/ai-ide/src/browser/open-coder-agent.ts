// *****************************************************************************
// Copyright (C) 2026 EclipseSource GmbH.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    ChatMode,
    ChatRequestModel,
    ChatSession,
    CommandChatResponseContentImpl,
    ErrorChatResponseContentImpl,
    HorizontalLayoutChatResponseContentImpl,
    MarkdownChatResponseContentImpl,
    MutableChatModel,
    MutableChatRequestModel,
    QuestionResponseContentImpl,
    ThinkingChatResponseContentImpl,
    ToolCallChatResponseContentImpl
} from '@theia/ai-chat/lib/common';
import { ChangeSetFileElementFactory } from '@theia/ai-chat/lib/browser/change-set-file-element';
import { AI_CHAT_NEW_CHAT_WINDOW_COMMAND, ChatCommands } from '@theia/ai-chat-ui/lib/browser/chat-view-commands';
import { ImageContent, LanguageModelMessage, PromptVariantSet, ReasoningLevel, TokenUsageService } from '@theia/ai-core';
import {
    CODEX_CLI_CONFIGURE_COMMAND,
    CODEX_CLI_LOGIN_COMMAND,
    CODEX_CLI_RESTART_COMMAND,
    CODEX_CLI_SHOW_OUTPUT_COMMAND,
    CODEX_CLI_STATUS_COMMAND
} from '@cybervinci/ai-providers/lib/browser/ai-providers-command-contribution';
import { CYBERVINCI_AI_PROVIDER_LANGUAGE_MODEL_ID } from '@cybervinci/ai-providers/lib/browser/ai-providers-language-model';
import {
    CodexProviderApprovalRequestMessage,
    CodexProviderFileUpdateChange,
    CodexProviderInputItem,
    CodexProviderNotificationMessage,
    CodexProviderOptions,
    CodexProviderStreamMessage,
    CodexProviderUserInputRequestMessage
} from '@cybervinci/ai-providers/lib/common';
import { CodexProviderRuntimeProvider } from '@cybervinci/ai-providers/lib/browser/ai-providers-runtime-provider';
import { nls } from '@theia/core';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
import { Disposable } from '@theia/core/lib/common';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { MarkdownStringImpl } from '@theia/core/lib/common/markdown-rendering';
import { PreferenceService } from '@theia/core/lib/common/preferences';
import URI from '@theia/core/lib/common/uri';
import { inject, injectable } from '@theia/core/shared/inversify';
import { EditorManager } from '@theia/editor/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { FileChangeType, FileStat } from '@theia/filesystem/lib/common/files';
import { ProblemManager } from '@theia/markers/lib/browser';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { CoderAgent } from './coder-agent';
import {
    OPEN_CODER_AGENT_MODE_NEXT_TEMPLATE_ID,
    OPEN_CODER_AGENT_MODE_TEMPLATE_ID,
    OPEN_CODER_EDIT_TEMPLATE_ID,
    OPEN_CODER_SYSTEM_PROMPT_ID,
    getOpenCoderAgentModeNextPromptTemplate,
    getOpenCoderAgentModePromptTemplate,
    getOpenCoderPromptTemplateEdit,
    getOpenCoderPromptTemplateEditNext
} from '../common/open-coder-prompt-template';
import { Command, CommandService } from '@theia/core/lib/common/command';

export const OpenCoderAgentId = 'OpenCoder';
const OPEN_CODER_CODEX_CLI_STREAMED_MESSAGES_KEY = 'openCoderCodexProviderStreamedMessages';
const OPEN_CODER_CODEX_CLI_FILE_CHANGE_SNAPSHOTS_KEY = 'openCoderCodexProviderFileChangeSnapshots';
const OPEN_CODER_CODEX_CLI_INPUT_TOKENS_KEY = 'openCoderCodexProviderInputTokens';
const OPEN_CODER_CODEX_CLI_OUTPUT_TOKENS_KEY = 'openCoderCodexProviderOutputTokens';
const OPEN_CODER_CODEX_CLI_OBSERVED_FILE_CHANGES_KEY = 'openCoderCodexProviderObservedFileChanges';
const OPEN_CODER_CODEX_CLI_READ_ONLY_MODE_ID = 'ai-providers-read-only';
const OPEN_CODER_CODEX_CLI_WORKSPACE_MODE_ID = 'ai-providers-workspace-write';
const OPEN_CODER_CODEX_CLI_FULL_ACCESS_MODE_ID = 'ai-providers-danger-full-access';
const OPEN_CODER_CODEX_CLI_PLAN_MODE_ID = 'ai-providers-plan';
const CYBERVINCI_AI_CHAT_WORKDIR_PREF = 'cybervinci.aiChat.workdir';
const CODEX_CLI_CONTEXT_TEXT_LIMIT = 12000;
const CODEX_CLI_SELECTION_TEXT_LIMIT = 8000;
const CODEX_CLI_DIAGNOSTIC_LIMIT = 20;
const CODEX_CLI_WORKSPACE_SNAPSHOT_MAX_FILES = 200;
const CODEX_CLI_WORKSPACE_SNAPSHOT_MAX_DEPTH = 2;
const CODEX_CLI_WORKSPACE_SNAPSHOT_MAX_FILE_SIZE = 256 * 1024;

const CODEX_CLI_LOCAL_COMMANDS = new Map([
    ['login', CODEX_CLI_LOGIN_COMMAND],
    ['status', CODEX_CLI_STATUS_COMMAND],
    ['restart', CODEX_CLI_RESTART_COMMAND],
    ['config', CODEX_CLI_CONFIGURE_COMMAND],
    ['output', CODEX_CLI_SHOW_OUTPUT_COMMAND]
]);

interface CodexProviderFileChangeSnapshot {
    uri: URI;
    originalState: string;
    existed: boolean;
    kind?: string;
}

interface CodexProviderObservedFileChange {
    uri: URI;
    kind: 'add' | 'modify' | 'delete';
}

@injectable()
export class OpenCoderAgent extends CoderAgent {
    @inject(CodexProviderRuntimeProvider)
    protected readonly codexProviderRuntime: CodexProviderRuntimeProvider;

    @inject(CommandService)
    protected readonly commandService: CommandService;

    @inject(ChangeSetFileElementFactory)
    protected readonly codexProviderFileChangeFactory: ChangeSetFileElementFactory;

    @inject(FileService)
    protected readonly codexProviderFileService: FileService;

    @inject(WorkspaceService)
    protected readonly codexProviderWorkspaceService: WorkspaceService;

    @inject(PreferenceService)
    protected readonly codexProviderPreferenceService: PreferenceService;

    @inject(EditorManager)
    protected readonly codexProviderEditorManager: EditorManager;

    @inject(ProblemManager)
    protected readonly codexProviderProblemManager: ProblemManager;

    @inject(TokenUsageService)
    protected override readonly tokenUsageService: TokenUsageService;

    override id: string = OpenCoderAgentId;
    override name = 'CyberVinci';
    override iconClass: string = 'codicon codicon-hubot';

    override description = nls.localize('theia/ai/workspace/openCoderAgent/description',
        'CyberVinci is an open source, provider-neutral AI coding agent integrated into {0}. It can inspect workspace context, propose or apply file changes, ' +
        'run validation workflows in agent mode, and use the configured CyberVinci language model provider.',
        FrontendApplicationConfigProvider.get().applicationName);

    protected override readonly modeDefinitions: Omit<ChatMode, 'isDefault'>[] = [
        {
            id: OPEN_CODER_EDIT_TEMPLATE_ID,
            name: nls.localize('theia/ai/ide/openCoderAgent/mode/edit', 'Edit Mode')
        },
        {
            id: OPEN_CODER_AGENT_MODE_TEMPLATE_ID,
            name: nls.localizeByDefault('Agent Mode')
        },
        {
            id: OPEN_CODER_AGENT_MODE_NEXT_TEMPLATE_ID,
            name: nls.localize('theia/ai/ide/openCoderAgent/mode/agentNext', 'Agent Mode (Next)')
        },
        {
            id: OPEN_CODER_CODEX_CLI_READ_ONLY_MODE_ID,
            name: nls.localize('theia/ai/ide/openCoderAgent/mode/codexProviderReadOnly', 'Codex Read-Only')
        },
        {
            id: OPEN_CODER_CODEX_CLI_WORKSPACE_MODE_ID,
            name: nls.localize('theia/ai/ide/openCoderAgent/mode/codexProviderWorkspace', 'Codex Workspace')
        },
        {
            id: OPEN_CODER_CODEX_CLI_FULL_ACCESS_MODE_ID,
            name: nls.localize('theia/ai/ide/openCoderAgent/mode/codexProviderFullAccess', 'Codex Full Access')
        },
        {
            id: OPEN_CODER_CODEX_CLI_PLAN_MODE_ID,
            name: nls.localize('theia/ai/ide/openCoderAgent/mode/codexProviderPlan', 'Codex Plan')
        },
    ];

    override prompts: PromptVariantSet[] = [{
        id: OPEN_CODER_SYSTEM_PROMPT_ID,
        defaultVariant: getOpenCoderAgentModePromptTemplate(),
        variants: [getOpenCoderPromptTemplateEdit(), getOpenCoderAgentModeNextPromptTemplate(), getOpenCoderPromptTemplateEditNext()]
    }];

    protected override systemPromptId: string | undefined = OPEN_CODER_SYSTEM_PROMPT_ID;

    override async invoke(request: MutableChatRequestModel): Promise<void> {
        try {
            const languageModel = await this.getLanguageModel(this.defaultLanguageModelPurpose);
            if (languageModel.id !== CYBERVINCI_AI_PROVIDER_LANGUAGE_MODEL_ID) {
                await super.invoke(request);
                return;
            }

            if (await this.handleLocalCodexProviderSlashCommand(request)) {
                return;
            }

            if (this.isAgentModeRequest(request) && !this.agentModeConfirmation.isAcknowledged()) {
                const confirmed = await this.agentModeConfirmation.requestConfirmation(request);
                if (!confirmed) {
                    await this.switchToEditMode();
                }
            }

            await this.invokeWithCodexProviderRuntime(request);
            this.suggest(request);
        } catch (error) {
            if (this.isCancellationLikeError(error)) {
                request.response.complete();
                return;
            }
            const formattedError = this.formatCodexProviderRuntimeError(error);
            request.response.response.addContent(new ErrorChatResponseContentImpl(new Error(formattedError)));
            this.addCodexProviderErrorActions(request, formattedError);
            request.response.error(new Error(formattedError));
        }
    }

    protected async invokeWithCodexProviderRuntime(request: MutableChatRequestModel): Promise<void> {
        const context = {
            model: request.session,
            request,
            capabilityOverrides: request.request.capabilityOverrides,
            genericCapabilitySelections: request.request.genericCapabilitySelections
        };
        const systemMessageDescription = await this.getSystemMessageDescription(context);
        if (systemMessageDescription?.promptVariantId) {
            request.response.setPromptVariantInfo(
                this.toPromptVariantDisplayName(systemMessageDescription.promptVariantId),
                systemMessageDescription.isPromptVariantCustomized ?? false
            );
        }

        const messages = await this.getMessages(request.session);
        const currentRequestText = this.toCodexProviderCurrentRequestText(request);
        const hasCurrentRequest = messages.some(message =>
            LanguageModelMessage.isTextMessage(message) && message.actor === 'user' && message.text.trim() === currentRequestText
        );
        if (currentRequestText && !hasCurrentRequest) {
            messages.push({
                actor: 'user',
                type: 'text',
                text: currentRequestText
            });
        }
        if (systemMessageDescription) {
            messages.unshift({
                actor: 'system',
                type: 'text',
                text: systemMessageDescription.text
            });
        }

        const fileWatcher = await this.watchCodexProviderWorkspaceChanges(request);
        try {
            const stream = await this.codexProviderRuntime.send({
                prompt: this.toCodexPrompt(messages, request),
                input: this.toCodexInput(messages, request),
                sessionId: request.session.id,
                options: this.toCodexOptions(request)
            }, request.response.cancellationToken);

            for await (const message of stream) {
                await this.handleCodexProviderMessage(message, request);
            }
        } finally {
            await this.waitForCodexProviderFileEvents();
            fileWatcher.dispose();
        }
        await this.publishCodexProviderObservedWorkspaceChanges(request);
        request.response.complete();
    }

    protected toCodexOptions(request: MutableChatRequestModel): Partial<CodexProviderOptions> {
        const reasoning = this.getSessionSettings(request).commonSettings?.reasoning?.level;
        const options: Partial<CodexProviderOptions> = {
            reasoningEffort: this.toCodexReasoningEffort(reasoning),
            collaborationMode: 'default'
        };
        const sandboxMode = this.toCodexSandboxMode(request);
        if (sandboxMode) {
            options.sandboxMode = sandboxMode;
        }
        const approvalPolicy = this.toCodexApprovalPolicy(request);
        if (approvalPolicy) {
            options.approvalPolicy = approvalPolicy;
        }
        if (this.hasCodexProviderControl(request, 'plan') || request.request.modeId === OPEN_CODER_CODEX_CLI_PLAN_MODE_ID) {
            options.collaborationMode = 'plan';
        }
        const cwd = this.resolveCodexProviderWorkdir();
        if (cwd) {
            options.cwd = cwd;
        }
        return options;
    }

    protected resolveCodexProviderWorkdir(): string | undefined {
        const configured = this.codexProviderPreferenceService.get<string>(CYBERVINCI_AI_CHAT_WORKDIR_PREF, undefined);
        if (typeof configured === 'string' && configured.trim()) {
            return configured.trim();
        }
        const editorUri = this.codexProviderEditorManager.currentEditor?.editor?.uri;
        const workspaceRoot = this.codexProviderWorkspaceService.getWorkspaceRootUri(editorUri)
            ?? this.codexProviderWorkspaceService.tryGetRoots()[0]?.resource;
        return workspaceRoot ? FileUri.fsPath(workspaceRoot) : undefined;
    }

    protected toCodexSandboxMode(request: MutableChatRequestModel): CodexProviderOptions['sandboxMode'] | undefined {
        if (this.hasCodexProviderControl(request, 'fullaccess') || request.request.modeId === OPEN_CODER_CODEX_CLI_FULL_ACCESS_MODE_ID) {
            return 'danger-full-access';
        }
        if (this.hasCodexProviderControl(request, 'workspace') || request.request.modeId === OPEN_CODER_CODEX_CLI_WORKSPACE_MODE_ID) {
            return 'workspace-write';
        }
        if (this.hasCodexProviderControl(request, 'readonly') || this.hasCodexProviderControl(request, 'plan') ||
            request.request.modeId === OPEN_CODER_CODEX_CLI_READ_ONLY_MODE_ID || request.request.modeId === OPEN_CODER_CODEX_CLI_PLAN_MODE_ID) {
            return 'read-only';
        }
        return this.isAgentModeRequest(request) ? 'workspace-write' : 'read-only';
    }

    protected toCodexApprovalPolicy(request: MutableChatRequestModel): CodexProviderOptions['approvalPolicy'] | undefined {
        if (this.hasCodexProviderControl(request, 'readonly') || this.hasCodexProviderControl(request, 'plan') ||
            request.request.modeId === OPEN_CODER_CODEX_CLI_READ_ONLY_MODE_ID || request.request.modeId === OPEN_CODER_CODEX_CLI_PLAN_MODE_ID) {
            return 'never';
        }
        return this.isAgentModeRequest(request) ? undefined : 'never';
    }

    protected toPromptVariantDisplayName(promptVariantId: string): string {
        return this.modeDefinitions.find(mode => mode.id === promptVariantId)?.name ?? promptVariantId;
    }

    protected toCodexReasoningEffort(level: ReasoningLevel | undefined): CodexProviderOptions['reasoningEffort'] {
        if (level === 'minimal' || level === 'low') {
            return 'low';
        }
        if (level === 'medium' || level === 'high') {
            return level;
        }
        return undefined;
    }

    protected toCodexPrompt(messages: LanguageModelMessage[], request: MutableChatRequestModel): string {
        const currentText = this.toCodexProviderCurrentRequestText(request);
        const prompt = messages.map(message => {
            if (LanguageModelMessage.isTextMessage(message)) {
                const text = message.text === request.request.text.trim()
                    ? currentText
                    : message.actor === 'user' || message.text === currentText ? this.stripCodexProviderControls(message.text) : message.text;
                return `[${message.actor}] ${text}`;
            }
            if (LanguageModelMessage.isToolUseMessage(message)) {
                return `[ai] Tool request ${message.name}: ${JSON.stringify(message.input)}`;
            }
            if (LanguageModelMessage.isToolResultMessage(message)) {
                return `[user] Tool result ${message.name}: ${this.toDisplayText(message.content)}`;
            }
            if (LanguageModelMessage.isThinkingMessage(message)) {
                return `[ai-thinking] ${message.thinking}`;
            }
            if (LanguageModelMessage.isImageMessage(message)) {
                return `[${message.actor}] Image context attached.`;
            }
            return '';
        }).filter(Boolean).join('\n\n');
        const ideContext = this.toCodexProviderIdeContext();
        const runtimeInstruction = this.toCodexProviderRuntimeInstruction();
        const promptWithContext = [runtimeInstruction, ideContext, prompt].filter(Boolean).join('\n\n');
        if (this.hasCodexProviderControl(request, 'plan') || request.request.modeId === OPEN_CODER_CODEX_CLI_PLAN_MODE_ID) {
            const planInstruction = '[system] Plan mode is active. Inspect the workspace and propose a concrete plan. ' +
                'Do not modify files or run mutating commands unless the user explicitly asks to execute the plan.';
            return [
                planInstruction,
                promptWithContext
            ].join('\n\n');
        }
        return promptWithContext;
    }

    protected toCodexProviderRuntimeInstruction(): string {
        return '[system] CyberVinci is running through CyberVinci AI Providers for this turn. ' +
            'Use the CyberVinci AI Providers runtime tools directly for workspace inspection, shell commands, patching, and file edits. ' +
            'Prefer patch/file-change operations over shell redirection or ad-hoc file-writing commands when editing files, so CyberVinci can show reviewable diffs. ' +
            'When the user asks to create, edit, delete, test, or inspect files, perform the requested work within the active sandbox instead of only saying you are ready. ' +
            'Treat Theia-specific tool syntax in older prompt fragments as product guidance, not as callable tools, unless a matching CyberVinci AI Providers tool is actually available.';
    }

    protected waitForCodexProviderFileEvents(): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, 500));
    }

    protected toCodexInput(messages: LanguageModelMessage[], request: MutableChatRequestModel): CodexProviderInputItem[] {
        const input: CodexProviderInputItem[] = [{
            type: 'text',
            text: this.toCodexPrompt(messages, request),
            text_elements: []
        }];
        for (const message of messages) {
            if (!LanguageModelMessage.isImageMessage(message)) {
                continue;
            }
            if (ImageContent.isUrl(message.image)) {
                input.push({ type: 'image', url: message.image.url });
            } else if (ImageContent.isBase64(message.image)) {
                input.push({ type: 'image', url: `data:${message.image.mimeType};base64,${message.image.base64data}` });
            }
        }
        return input;
    }

    protected toCodexProviderIdeContext(): string {
        const sections: string[] = [];
        const workdir = this.resolveCodexProviderWorkdir();
        if (workdir) {
            sections.push(`Default AI workdir:\n- ${workdir}\nUse this as the default location for relative paths unless the user explicitly names another directory.`);
        }
        const roots = this.codexProviderWorkspaceService.tryGetRoots().map(root => root.resource.path.fsPath());
        if (roots.length) {
            sections.push(`Workspace roots:\n${roots.map(root => `- ${root}`).join('\n')}`);
        }

        const openEditors = this.codexProviderEditorManager.all
            .map(widget => widget.editor?.uri?.path.fsPath())
            .filter((uri): uri is string => !!uri);
        if (openEditors.length) {
            sections.push(`Open editors:\n${openEditors.slice(0, 10).map(uri => `- ${uri}`).join('\n')}`);
        }

        const editor = this.codexProviderEditorManager.currentEditor?.editor;
        if (editor) {
            const selection = editor.selection;
            const currentFile = editor.uri.path.fsPath();
            const cursor = editor.cursor;
            const selectedText = this.truncateCodexProviderContext(editor.document.getText(selection), CODEX_CLI_SELECTION_TEXT_LIMIT);
            const fileContext: string[] = [
                `Current file: ${currentFile}`,
                `Cursor: line ${cursor.line + 1}, column ${cursor.character + 1}`,
                `Selection: lines ${selection.start.line + 1}:${selection.start.character + 1}-${selection.end.line + 1}:${selection.end.character + 1}`
            ];
            if (selectedText.trim()) {
                fileContext.push(`Selected text:\n\`\`\`\n${selectedText}\n\`\`\``);
            } else {
                const visibleText = this.truncateCodexProviderContext(this.getVisibleEditorText(), CODEX_CLI_SELECTION_TEXT_LIMIT);
                if (visibleText.trim()) {
                    fileContext.push(`Visible editor text:\n\`\`\`\n${visibleText}\n\`\`\``);
                }
            }
            const diagnostics = this.getCodexProviderCurrentFileDiagnostics();
            if (diagnostics) {
                fileContext.push(diagnostics);
            }
            sections.push(fileContext.join('\n'));
        }

        if (!sections.length) {
            return '';
        }
        return `[system] CyberVinci IDE context for this turn. Use it as local editor state; do not quote it back unless relevant.\n\n${sections.join('\n\n')}`;
    }

    protected getVisibleEditorText(): string {
        const editor = this.codexProviderEditorManager.currentEditor?.editor;
        if (!editor) {
            return '';
        }
        const ranges = editor.getVisibleRanges().slice(0, 3);
        return ranges.map(range => {
            const text = editor.document.getText(range);
            return `Lines ${range.start.line + 1}-${range.end.line + 1}:\n${text}`;
        }).join('\n\n');
    }

    protected getCodexProviderCurrentFileDiagnostics(): string {
        const editor = this.codexProviderEditorManager.currentEditor?.editor;
        if (!editor) {
            return '';
        }
        const markers = this.codexProviderProblemManager.findMarkers({ uri: editor.uri })
            .filter(marker => marker.data.severity !== 3 && marker.data.severity !== 4)
            .slice(0, CODEX_CLI_DIAGNOSTIC_LIMIT);
        if (!markers.length) {
            return '';
        }
        return `Diagnostics:\n${markers.map(marker => {
            const range = marker.data.range;
            const source = marker.data.source ? ` [${marker.data.source}]` : '';
            return `- ${this.toDiagnosticSeverityLabel(marker.data.severity)}${source} line ${range.start.line + 1}:${range.start.character + 1}: ${marker.data.message}`;
        }).join('\n')}`;
    }

    protected toDiagnosticSeverityLabel(severity: number | undefined): string {
        if (severity === 1) {
            return 'Error';
        }
        if (severity === 2) {
            return 'Warning';
        }
        return 'Diagnostic';
    }

    protected truncateCodexProviderContext(text: string, limit: number = CODEX_CLI_CONTEXT_TEXT_LIMIT): string {
        if (text.length <= limit) {
            return text;
        }
        return `${text.slice(0, limit)}\n...[truncated ${text.length - limit} characters]`;
    }

    protected formatCodexProviderRuntimeError(error: unknown): string {
        const message = error instanceof Error ? error.message : String(error);
        const lower = message.toLowerCase();
        if (lower.includes('not recognized') || lower.includes('enoent') || lower.includes('not found')) {
            return `${message}\n\nCyberVinci AI Providers is not available. Install the selected CLI or configure the selected direct provider in AI Configuration > CyberVinci AI Providers.`;
        }
        if (lower.includes('login') || lower.includes('auth') || lower.includes('unauthorized') || lower.includes('not authenticated')) {
            return `${message}\n\nUse /login in the CyberVinci chat or sign in/configure credentials in AI Configuration > CyberVinci AI Providers.`;
        }
        if (lower.includes('app-server exited')) {
            return `${message}\n\nUse /restart or open "CyberVinci AI Providers: Show Output" for the runtime log, then retry the turn.`;
        }
        return message;
    }

    protected addCodexProviderErrorActions(request: MutableChatRequestModel, message: string): void {
        const lower = message.toLowerCase();
        const actions = [
            lower.includes('login') || lower.includes('auth') || lower.includes('unauthorized') || lower.includes('not authenticated')
                ? new CommandChatResponseContentImpl(CODEX_CLI_LOGIN_COMMAND)
                : undefined,
            new CommandChatResponseContentImpl(CODEX_CLI_RESTART_COMMAND),
            new CommandChatResponseContentImpl(CODEX_CLI_SHOW_OUTPUT_COMMAND),
            new CommandChatResponseContentImpl(CODEX_CLI_CONFIGURE_COMMAND)
        ].filter((action): action is CommandChatResponseContentImpl => !!action);
        request.response.response.addContent(new HorizontalLayoutChatResponseContentImpl(actions));
    }

    protected async handleLocalCodexProviderSlashCommand(request: MutableChatRequestModel): Promise<boolean> {
        const threadCommand = this.readCodexProviderThreadCommand(request.request.text);
        if (threadCommand) {
            await this.handleCodexProviderThreadCommand(threadCommand, request);
            return true;
        }
        if (this.hasCodexProviderControl(request, 'retry') && !this.findPreviousCodexProviderRequestText(request)) {
            request.response.response.addContent(new MarkdownChatResponseContentImpl(
                nls.localize('theia/ai/ide/openCoderAgent/codexProviderRetryUnavailable', 'There is no previous CyberVinci request to retry in this chat.')
            ));
            request.response.complete();
            return true;
        }
        const command = this.readCodexProviderLocalCommand(request.request.text);
        if (!command) {
            return false;
        }
        this.commandService.executeCommand(command.command.id);
        request.response.response.addContent(new MarkdownChatResponseContentImpl(
            nls.localize('theia/ai/ide/openCoderAgent/codexProviderCommandExecuted', 'Executed: {0}', command.command.label ?? command.name)
        ));
        request.response.complete();
        return true;
    }

    protected async handleCodexProviderThreadCommand(
        command: { name: 'compact' | 'newthread' | 'thread', argument?: string },
        request: MutableChatRequestModel
    ): Promise<void> {
        let resultMessage: string | undefined;
        if (command.name === 'compact') {
            const result = await this.codexProviderRuntime.compactThread(request.session.id);
            resultMessage = result.message;
        } else if (command.name === 'newthread') {
            const result = await this.codexProviderRuntime.resetThread(request.session.id);
            resultMessage = result.message;
        } else {
            const threadId = command.argument?.trim();
            if (!threadId) {
                resultMessage = nls.localize('theia/ai/ide/openCoderAgent/codexProviderThreadUsage',
                    'Usage: /thread <codex-thread-id>');
            } else {
                const result = await this.codexProviderRuntime.setThread(request.session.id, threadId);
                resultMessage = result.message;
            }
        }
        request.response.response.addContent(new MarkdownChatResponseContentImpl(resultMessage ?? command.name));
        request.response.complete();
    }

    protected readCodexProviderThreadCommand(text: string): { name: 'compact' | 'newthread' | 'thread', argument?: string } | undefined {
        const match = text.match(/(?:^|\s)(?:\/|#prompt:(?:(?:ai-providers|codex-provider)-slash-)?)(compact|newthread|thread)\b\|?\s*([\s\S]*)?$/);
        if (!match) {
            return undefined;
        }
        return {
            name: match[1] as 'compact' | 'newthread' | 'thread',
            argument: match[2]?.trim()
        };
    }

    protected readCodexProviderLocalCommand(text: string): { name: string, command: Command } | undefined {
        const match = text.match(/(?:^|\s)(?:\/|#prompt:(?:(?:ai-providers|codex-provider)-slash-)?)(login|status|restart|config|output)\b/);
        if (!match) {
            return undefined;
        }
        const name = match[1];
        const command = CODEX_CLI_LOCAL_COMMANDS.get(name);
        return command ? { name, command } : undefined;
    }

    protected hasCodexProviderControl(request: MutableChatRequestModel, command: string): boolean {
        return new RegExp(`(?:^|\\s)(?:/|#prompt:(?:(?:ai-providers|codex-provider)-slash-)?)${command}\\b`).test(request.request.text);
    }

    protected toCodexProviderCurrentRequestText(request: MutableChatRequestModel): string {
        const stripped = this.stripCodexProviderControls(request.request.text);
        if (this.hasCodexProviderControl(request, 'retry')) {
            const previous = this.findPreviousCodexProviderRequestText(request);
            if (previous) {
                return stripped
                    ? `Retry the previous request with this additional instruction: ${stripped}\n\nPrevious request:\n${previous}`
                    : previous;
            }
        }
        if (this.hasCodexProviderControl(request, 'continue')) {
            return stripped
                ? `Continue the previous task from where it stopped. Additional instruction: ${stripped}`
                : 'Continue the previous task from where it stopped. If there are pending file changes or validations, continue them.';
        }
        return stripped || request.request.text.trim();
    }

    protected findPreviousCodexProviderRequestText(request: MutableChatRequestModel): string | undefined {
        const requests = request.session.getRequests();
        for (let index = requests.length - 1; index >= 0; index--) {
            const candidate = requests[index];
            if (candidate.id === request.id) {
                continue;
            }
            if (this.readCodexProviderLocalCommand(candidate.request.text) || this.readCodexProviderThreadCommand(candidate.request.text)) {
                continue;
            }
            const text = this.stripCodexProviderControls(candidate.request.text);
            if (text && !this.isCodexProviderCommandOnlyRequest(candidate.request.text)) {
                return text;
            }
        }
        return undefined;
    }

    protected isCodexProviderCommandOnlyRequest(text: string): boolean {
        return !this.stripCodexProviderControls(text);
    }

    protected stripCodexProviderControls(text: string): string {
        return text
            .replace(new RegExp(`@${OpenCoderAgentId}\\b`, 'g'), ' ')
            .replace(/(?:^|\s)(?:\/|#prompt:(?:(?:ai-providers|codex-provider)-slash-)?)(?:readonly|workspace|fullaccess|plan|continue|retry)\b\|?/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    protected isCancellationLikeError(error: unknown): boolean {
        return error instanceof Error && (error.name === 'Canceled' || error.message === 'Canceled' || error.message === 'Cancelled');
    }

    protected override async switchToEditMode(): Promise<void> {
        if (this.systemPromptId) {
            await this.promptService.updateSelectedVariantId(this.id, this.systemPromptId, OPEN_CODER_EDIT_TEMPLATE_ID);
        }
    }

    protected async handleCodexProviderMessage(message: CodexProviderStreamMessage, request: MutableChatRequestModel): Promise<void> {
        if (message.type === 'approval-request') {
            await this.handleApprovalRequest(message, request);
        } else if (message.type === 'user-input-request') {
            this.handleUserInputRequest(message, request);
        } else if (message.type === 'notification') {
            await this.handleNotification(message, request);
        } else if (message.type === 'login-event') {
            request.response.response.addContent(new MarkdownChatResponseContentImpl(this.formatJsonBlock(message.method, message.params)));
        }
    }

    protected async handleApprovalRequest(message: CodexProviderApprovalRequestMessage, request: MutableChatRequestModel): Promise<void> {
        await this.captureCodexProviderFileChangeSnapshots(message.changes ?? [], request, message.workingDirectory);

        const details = [
            message.command ? `Command: \`${message.command}\`` : undefined,
            message.changes?.length ? `Files: ${message.changes.map(change => `\`${change.path}\``).join(', ')}` : undefined,
            message.workingDirectory ? `Working directory: \`${message.workingDirectory}\`` : undefined,
            message.grantRoot ? `Grant root: \`${message.grantRoot}\`` : undefined,
            message.reason ? `Reason: ${message.reason}` : undefined
        ].filter(Boolean).join('\n\n');

        if (details) {
            request.response.response.addContent(new MarkdownChatResponseContentImpl(details));
        }
        if (message.permissions) {
            request.response.response.addContent(new MarkdownChatResponseContentImpl(
                `Permissions requested:\n\n\`\`\`json\n${JSON.stringify(message.permissions, undefined, 2)}\n\`\`\``
            ));
        }

        request.response.response.addContent(new QuestionResponseContentImpl(
            message.title,
            message.options,
            request,
            selectedOption => this.codexProviderRuntime.sendApprovalResponse({
                type: 'approval-response',
                requestId: message.requestId,
                decision: selectedOption.value ?? 'cancel'
            }),
            {
                header: nls.localize('theia/ai/ide/openCoderAgent/codexProviderApprovalHeader', 'CyberVinci AI Providers approval'),
                onSkip: () => this.codexProviderRuntime.sendApprovalResponse({
                    type: 'approval-response',
                    requestId: message.requestId,
                    decision: 'cancel'
                })
            }
        ));
        request.response.waitForInput();
    }

    protected handleUserInputRequest(message: CodexProviderUserInputRequestMessage, request: MutableChatRequestModel): void {
        const answers: Record<string, { answers: string[] }> = {};
        let pending = message.questions.length;
        const onAnswered = () => {
            pending--;
            if (pending <= 0) {
                this.codexProviderRuntime.sendUserInputResponse({ type: 'user-input-response', requestId: message.requestId, answers });
            }
        };

        if (pending === 0) {
            this.codexProviderRuntime.sendUserInputResponse({ type: 'user-input-response', requestId: message.requestId, answers });
            return;
        }

        for (const questionItem of message.questions) {
            const options = questionItem.options.length > 0 ? questionItem.options : [{ text: 'Continue', value: '' }];
            request.response.response.addContent(new QuestionResponseContentImpl(
                questionItem.question,
                options,
                request,
                selectedOption => {
                    answers[questionItem.id] = { answers: [selectedOption.value ?? selectedOption.text] };
                    onAnswered();
                },
                {
                    header: questionItem.header ?? message.title,
                    onSkip: () => {
                        answers[questionItem.id] = { answers: [] };
                        onAnswered();
                    }
                }
            ));
        }
        request.response.waitForInput();
    }

    protected async handleNotification(message: CodexProviderNotificationMessage, request: MutableChatRequestModel): Promise<void> {
        const { method, params } = message;
        if (method === 'item/agentMessage/delta') {
            const itemId = this.readString(params, 'itemId');
            if (itemId) {
                this.getStreamedMessageIds(request).add(itemId);
            }
            this.addMarkdown(request, this.readString(params, 'delta'));
        } else if (method === 'item/plan/delta' || method === 'item/reasoning/textDelta' || method === 'item/reasoning/summaryTextDelta') {
            request.response.response.addContent(new ThinkingChatResponseContentImpl(this.readString(params, 'delta'), OpenCoderAgentId));
        } else if (method === 'turn/plan/updated') {
            this.handlePlanUpdated(params, request);
        } else if (method === 'turn/diff/updated') {
            this.handleTurnDiffUpdated(params, request);
        } else if (method === 'thread/tokenUsage/updated') {
            await this.handleTokenUsageUpdated(params, request);
        } else if (method === 'patch_apply_end') {
            await this.handlePatchApplyEnd(params, request);
        } else if (method === 'item/fileChange/patchUpdated') {
            await this.handleFileChangePatchUpdated(params, request);
        } else if (method === 'task_complete') {
            this.addMarkdown(request, this.readString(params, 'last_agent_message'));
        } else if (method === 'item/started' || method === 'item/updated') {
            await this.handleItemProgress(params, request);
        } else if (method === 'item/completed') {
            await this.handleItemCompleted(params, request);
        } else if (method === 'error' || method === 'warning' || method === 'configWarning') {
            request.response.response.addContent(new ErrorChatResponseContentImpl(new Error(this.toDisplayText(params))));
        } else if (method === 'item/mcpToolCall/progress') {
            this.handleMcpToolProgress(params, request);
        } else if (method === 'item/autoApprovalReview/started' || method === 'item/autoApprovalReview/completed') {
            request.response.response.addContent(new ThinkingChatResponseContentImpl(this.toDisplayText(params), OpenCoderAgentId));
        } else if (method === 'item/commandExecution/outputDelta' || method === 'command/exec/outputDelta' ||
            method === 'process/outputDelta' || method === 'item/fileChange/outputDelta') {
            const delta = this.readString(params, 'delta');
            if (delta) {
                request.response.response.addContent(new MarkdownChatResponseContentImpl(`\`\`\`\n${delta}\n\`\`\``));
            }
        }
    }

    protected async handlePatchApplyEnd(params: unknown, request: MutableChatRequestModel): Promise<void> {
        const status = this.readString(params, 'status') || (this.readBoolean(params, 'success') ? 'completed' : 'failed');
        const item = {
            type: 'file_change',
            id: this.readString(params, 'call_id') || 'ai-providers-file-change',
            changes: this.readCodexProviderPatchChanges(params),
            status
        };
        request.response.response.addContent(new ToolCallChatResponseContentImpl(
            item.id,
            item.type,
            this.extractToolArguments(item.type, item),
            true,
            JSON.stringify(item)
        ));
        this.publishCodexProviderFileChanges(item, request).catch(() => { });
    }

    protected async handleFileChangePatchUpdated(params: unknown, request: MutableChatRequestModel): Promise<void> {
        const item = {
            type: 'file_change',
            id: this.readString(params, 'itemId') || 'ai-providers-file-change',
            changes: this.readArray(params, 'changes'),
            status: 'running'
        };
        request.response.response.addContent(new ToolCallChatResponseContentImpl(
            item.id,
            item.type,
            this.extractToolArguments(item.type, item),
            false,
            undefined
        ));
        this.captureCodexProviderFileChangeSnapshots(this.readCodexProviderFileChanges(item), request).catch(() => { });
    }

    protected async handleTokenUsageUpdated(params: unknown, request: MutableChatRequestModel): Promise<void> {
        const tokenUsage = this.readObject(params, 'tokenUsage');
        const last = this.readObject(tokenUsage, 'last');
        const inputTokens = this.readNumber(last, 'inputTokens');
        const outputTokens = this.readNumber(last, 'outputTokens');
        if (inputTokens === undefined || outputTokens === undefined) {
            return;
        }
        request.response.setTokenUsage({
            inputTokens,
            outputTokens,
            cacheReadInputTokens: this.readNumber(last, 'cachedInputTokens')
        });
        request.addData(OPEN_CODER_CODEX_CLI_INPUT_TOKENS_KEY, inputTokens);
        request.addData(OPEN_CODER_CODEX_CLI_OUTPUT_TOKENS_KEY, outputTokens);
        this.updateSessionTokenSuggestion(request);
        await this.tokenUsageService.recordTokenUsage('cybervinci/ai-providers', {
            inputTokens,
            outputTokens,
            cachedInputTokens: this.readNumber(last, 'cachedInputTokens'),
            requestId: request.id
        });
    }

    protected updateSessionTokenSuggestion(request: MutableChatRequestModel): void {
        let inputTokens = 0;
        let outputTokens = 0;
        for (const sessionRequest of request.session.getRequests()) {
            inputTokens += sessionRequest.getDataByKey(OPEN_CODER_CODEX_CLI_INPUT_TOKENS_KEY) as number ?? 0;
            outputTokens += sessionRequest.getDataByKey(OPEN_CODER_CODEX_CLI_OUTPUT_TOKENS_KEY) as number ?? 0;
        }
        request.session.setSuggestions([`↑ ${this.formatTokenCount(inputTokens)} | ↓ ${this.formatTokenCount(outputTokens)}`]);
    }

    protected formatTokenCount(tokens: number): string {
        return tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}K` : String(tokens);
    }

    protected handlePlanUpdated(params: unknown, request: MutableChatRequestModel): void {
        const plan = this.readArray(params, 'plan');
        if (plan.length === 0) {
            return;
        }
        const item = {
            type: 'todo_list',
            id: this.readString(params, 'turnId') || 'ai-providers-plan',
            items: plan.map((entry, index) => ({
                text: this.readString(entry, 'step') || `Step ${index + 1}`,
                completed: this.readString(entry, 'status') === 'completed'
            }))
        };
        request.response.response.addContent(new ToolCallChatResponseContentImpl(
            item.id,
            'todo_list',
            this.extractToolArguments('todo_list', item),
            true,
            JSON.stringify(item)
        ));
    }

    protected handleTurnDiffUpdated(params: unknown, request: MutableChatRequestModel): void {
        const diff = this.readString(params, 'diff');
        if (!diff) {
            return;
        }
        const item = {
            type: 'unified_diff',
            id: this.readString(params, 'turnId') || 'ai-providers-diff',
            diff,
            status: 'updated'
        };
        request.response.response.addContent(new ToolCallChatResponseContentImpl(
            item.id,
            item.type,
            this.extractToolArguments(item.type, item),
            true,
            JSON.stringify(item)
        ));
    }

    protected handleMcpToolProgress(params: unknown, request: MutableChatRequestModel): void {
        const item = {
            type: 'mcp_tool_call',
            id: this.readString(params, 'itemId') || 'ai-providers-mcp-tool',
            server: this.readString(params, 'server'),
            tool: this.readString(params, 'tool'),
            status: this.readString(params, 'message') || 'running'
        };
        request.response.response.addContent(new ToolCallChatResponseContentImpl(
            item.id,
            item.type,
            this.extractToolArguments(item.type, item),
            false,
            undefined
        ));
    }

    protected async handleItemProgress(params: unknown, request: MutableChatRequestModel): Promise<void> {
        const item = this.toCodexSdkItem(this.readObject(params, 'item'));
        const type = this.readString(item, 'type');
        if (!this.isRenderableToolType(type)) {
            return;
        }
        request.response.response.addContent(new ToolCallChatResponseContentImpl(
            this.readString(item, 'id') || undefined,
            type,
            this.extractToolArguments(type, item),
            false,
            undefined
        ));
        if (type === 'file_change') {
            this.captureCodexProviderFileChangeSnapshots(this.readCodexProviderFileChanges(item), request).catch(() => { });
        }
    }

    protected async handleItemCompleted(params: unknown, request: MutableChatRequestModel): Promise<void> {
        const item = this.toCodexSdkItem(this.readObject(params, 'item'));
        const type = typeof item.type === 'string' ? item.type : undefined;
        if (type === 'agent_message') {
            if (this.getStreamedMessageIds(request).has(this.readString(item, 'id'))) {
                return;
            }
            this.addMarkdown(request, this.readString(item, 'text') || this.readString(item, 'message'));
        } else if (type === 'reasoning') {
            request.response.response.addContent(new ThinkingChatResponseContentImpl(this.toDisplayText(item), OpenCoderAgentId));
        } else if (type && this.isRenderableToolType(type)) {
            request.response.response.addContent(new ToolCallChatResponseContentImpl(
                this.readString(item, 'id') || undefined,
                type,
                this.extractToolArguments(type, item),
                true,
                JSON.stringify(item)
            ));
            if (type === 'file_change') {
                this.publishCodexProviderFileChanges(item, request).catch(() => { });
            }
        } else if (type === 'error') {
            request.response.response.addContent(new ErrorChatResponseContentImpl(new Error(this.readString(item, 'message') || this.toDisplayText(item))));
        }
    }

    protected async captureCodexProviderFileChangeSnapshots(
        changes: CodexProviderFileUpdateChange[],
        request: MutableChatRequestModel,
        workingDirectory?: string
    ): Promise<void> {
        if (changes.length === 0) {
            return;
        }
        const snapshots = this.getCodexProviderFileChangeSnapshots(request);
        for (const change of changes) {
            const uri = await this.toCodexProviderFileUri(change.path, workingDirectory);
            if (!uri || snapshots.has(uri.toString())) {
                continue;
            }
            const existed = await this.codexProviderFileService.exists(uri);
            const originalState = existed ? await this.tryReadCodexProviderTextFile(uri) : '';
            if (originalState === undefined) {
                continue;
            }
            snapshots.set(uri.toString(), {
                uri,
                originalState,
                existed,
                kind: change.kind
            });
        }
    }

    protected async publishCodexProviderFileChanges(item: Record<string, unknown>, request: MutableChatRequestModel): Promise<void> {
        if (this.readString(item, 'status') === 'failed') {
            return;
        }
        const changes = this.readCodexProviderFileChanges(item);
        if (changes.length === 0) {
            return;
        }
        let published = false;
        const snapshots = this.getCodexProviderFileChangeSnapshots(request);
        const workingDirectory = this.readString(item, 'cwd') || this.readString(item, 'workingDirectory');
        for (const change of changes) {
            const uri = await this.toCodexProviderFileUri(change.path, workingDirectory);
            if (!uri) {
                continue;
            }
            const snapshot = snapshots.get(uri.toString());
            const existed = await this.codexProviderFileService.exists(uri);
            const targetState = existed ? await this.tryReadCodexProviderTextFile(uri) : '';
            if (targetState === undefined) {
                continue;
            }
            const originalState = snapshot?.originalState;
            const originallyExisted = snapshot?.existed ?? change.kind !== 'add';

            if (originalState === undefined && change.kind !== 'add') {
                continue;
            }
            if ((originalState ?? '') === targetState) {
                continue;
            }

            request.session.changeSet.addElements(this.codexProviderFileChangeFactory({
                uri,
                type: this.toCodexProviderChangeSetType(change.kind, originallyExisted, existed),
                state: 'applied',
                originalState: originalState ?? '',
                targetState,
                requestId: request.id,
                chatSessionId: request.session.id
            }));
            published = true;
        }
        if (published) {
            request.session.changeSet.setTitle(nls.localize('theia/ai/ide/openCoderAgent/codexProviderChangeSetTitle', 'Changes by CyberVinci AI Providers'));
        }
    }

    protected async watchCodexProviderWorkspaceChanges(request: MutableChatRequestModel): Promise<Disposable> {
        await this.captureCodexProviderInitialWorkspaceSnapshots(request);
        const observed = this.getCodexProviderObservedFileChanges(request);
        return this.codexProviderFileService.onDidFilesChange(event => {
            for (const change of event.changes) {
                if (!this.isCodexProviderWorkspaceFile(change.resource)) {
                    continue;
                }
                const kind = change.type === FileChangeType.ADDED ? 'add' : change.type === FileChangeType.DELETED ? 'delete' : 'modify';
                observed.set(change.resource.toString(), { uri: change.resource, kind });
                this.revealCodexProviderObservedFileChange(change.resource, kind).catch(() => { });
            }
        });
    }

    protected async revealCodexProviderObservedFileChange(uri: URI, kind: CodexProviderObservedFileChange['kind']): Promise<void> {
        if (kind === 'delete') {
            return;
        }
        let stat: FileStat;
        try {
            stat = await this.codexProviderFileService.resolve(uri);
        } catch {
            return;
        }
        if (!this.shouldSnapshotCodexProviderFile(stat)) {
            return;
        }
        if (await this.tryReadCodexProviderTextFile(uri) === undefined) {
            return;
        }
        await this.codexProviderEditorManager.open(uri, { mode: 'reveal' });
    }

    protected async captureCodexProviderInitialWorkspaceSnapshots(request: MutableChatRequestModel): Promise<void> {
        const snapshots = this.getCodexProviderFileChangeSnapshots(request);
        const candidates = new Map<string, URI>();
        for (const editor of this.codexProviderEditorManager.all) {
            const uri = editor.editor?.uri;
            if (uri && this.isCodexProviderWorkspaceFile(uri)) {
                candidates.set(uri.toString(), uri);
            }
        }
        for (const root of this.codexProviderWorkspaceService.tryGetRoots()) {
            await this.collectCodexProviderSnapshotCandidates(root.resource, candidates, 0);
            if (candidates.size >= CODEX_CLI_WORKSPACE_SNAPSHOT_MAX_FILES) {
                break;
            }
        }
        for (const uri of candidates.values()) {
            if (snapshots.has(uri.toString())) {
                continue;
            }
            const originalState = await this.tryReadCodexProviderTextFile(uri);
            if (originalState === undefined) {
                continue;
            }
            snapshots.set(uri.toString(), {
                uri,
                originalState,
                existed: true
            });
        }
    }

    protected async collectCodexProviderSnapshotCandidates(uri: URI, candidates: Map<string, URI>, depth: number): Promise<void> {
        if (candidates.size >= CODEX_CLI_WORKSPACE_SNAPSHOT_MAX_FILES || depth > CODEX_CLI_WORKSPACE_SNAPSHOT_MAX_DEPTH) {
            return;
        }
        let stat: FileStat;
        try {
            stat = await this.codexProviderFileService.resolve(uri);
        } catch {
            return;
        }
        if (stat.isFile) {
            if (this.shouldSnapshotCodexProviderFile(stat)) {
                candidates.set(uri.toString(), uri);
            }
            return;
        }
        if (!stat.isDirectory || this.isIgnoredCodexProviderWorkspacePath(uri)) {
            return;
        }
        for (const child of stat.children ?? []) {
            if (candidates.size >= CODEX_CLI_WORKSPACE_SNAPSHOT_MAX_FILES) {
                return;
            }
            if (child.isDirectory) {
                if (!this.isIgnoredCodexProviderWorkspacePath(child.resource)) {
                    await this.collectCodexProviderSnapshotCandidates(child.resource, candidates, depth + 1);
                }
            } else if (this.shouldSnapshotCodexProviderFile(child)) {
                candidates.set(child.resource.toString(), child.resource);
            }
        }
    }

    protected shouldSnapshotCodexProviderFile(stat: FileStat): boolean {
        return stat.isFile &&
            (stat.size ?? 0) <= CODEX_CLI_WORKSPACE_SNAPSHOT_MAX_FILE_SIZE &&
            !this.isIgnoredCodexProviderWorkspacePath(stat.resource);
    }

    protected async publishCodexProviderObservedWorkspaceChanges(request: MutableChatRequestModel): Promise<void> {
        await this.scanCodexProviderWorkspaceChanges(request);
        const observed = this.getCodexProviderObservedFileChanges(request);
        if (observed.size === 0) {
            return;
        }
        const snapshots = this.getCodexProviderFileChangeSnapshots(request);
        let published = false;
        const renderedChanges: CodexProviderFileUpdateChange[] = [];
        for (const change of observed.values()) {
            const snapshot = snapshots.get(change.uri.toString());
            const exists = await this.codexProviderFileService.exists(change.uri);
            const targetState = exists ? await this.tryReadCodexProviderTextFile(change.uri) : '';
            if (targetState === undefined) {
                continue;
            }
            const originalState = snapshot?.originalState ?? '';
            const originallyExisted = snapshot?.existed ?? change.kind !== 'add';
            if (change.kind === 'modify' && !snapshot) {
                continue;
            }
            if (originallyExisted && exists && originalState === targetState) {
                continue;
            }
            request.session.changeSet.addElements(this.codexProviderFileChangeFactory({
                uri: change.uri,
                type: this.toCodexProviderChangeSetType(change.kind, originallyExisted, exists),
                state: 'applied',
                originalState,
                targetState,
                requestId: request.id,
                chatSessionId: request.session.id
            }));
            renderedChanges.push({
                path: this.toCodexProviderDisplayPath(change.uri),
                kind: this.toCodexProviderChangeSetType(change.kind, originallyExisted, exists)
            });
            published = true;
        }
        if (published) {
            const item = {
                type: 'file_change',
                id: 'ai-providers-observed-file-change',
                changes: renderedChanges,
                status: 'completed'
            };
            request.response.response.addContent(new ToolCallChatResponseContentImpl(
                item.id,
                item.type,
                this.extractToolArguments(item.type, item),
                true,
                JSON.stringify(item)
            ));
            request.session.changeSet.setTitle(nls.localize('theia/ai/ide/openCoderAgent/codexProviderChangeSetTitle', 'Changes by CyberVinci AI Providers'));
        }
    }

    protected toCodexProviderDisplayPath(uri: URI): string {
        for (const root of this.codexProviderWorkspaceService.tryGetRoots()) {
            if (root.resource.isEqualOrParent(uri)) {
                return root.resource.relative(uri)?.toString() ?? uri.path.fsPath();
            }
        }
        return uri.path.fsPath();
    }

    protected async scanCodexProviderWorkspaceChanges(request: MutableChatRequestModel): Promise<void> {
        const snapshots = this.getCodexProviderFileChangeSnapshots(request);
        const observed = this.getCodexProviderObservedFileChanges(request);
        const currentCandidates = new Map<string, URI>();
        for (const root of this.codexProviderWorkspaceService.tryGetRoots()) {
            await this.collectCodexProviderSnapshotCandidates(root.resource, currentCandidates, 0);
            if (currentCandidates.size >= CODEX_CLI_WORKSPACE_SNAPSHOT_MAX_FILES) {
                break;
            }
        }

        for (const [key, uri] of currentCandidates) {
            const snapshot = snapshots.get(key);
            if (!snapshot) {
                observed.set(key, { uri, kind: 'add' });
                continue;
            }
            const targetState = await this.tryReadCodexProviderTextFile(uri);
            if (targetState !== undefined && targetState !== snapshot.originalState) {
                observed.set(key, { uri, kind: 'modify' });
            }
        }

        for (const [key, snapshot] of snapshots) {
            if (!this.isCodexProviderWorkspaceFile(snapshot.uri) || currentCandidates.has(key)) {
                continue;
            }
            if (!await this.codexProviderFileService.exists(snapshot.uri)) {
                observed.set(key, { uri: snapshot.uri, kind: 'delete' });
            }
        }
    }

    protected readCodexProviderFileChanges(item: Record<string, unknown>): CodexProviderFileUpdateChange[] {
        return this.readArray(item, 'changes').map(change => ({
            path: this.readString(change, 'path'),
            kind: this.readCodexProviderChangeKind(change),
            diff: this.readString(change, 'diff')
        })).filter(change => !!change.path);
    }

    protected getCodexProviderFileChangeSnapshots(request: MutableChatRequestModel): Map<string, CodexProviderFileChangeSnapshot> {
        let snapshots = request.getDataByKey(OPEN_CODER_CODEX_CLI_FILE_CHANGE_SNAPSHOTS_KEY) as Map<string, CodexProviderFileChangeSnapshot> | undefined;
        if (!snapshots) {
            snapshots = new Map<string, CodexProviderFileChangeSnapshot>();
            request.addData(OPEN_CODER_CODEX_CLI_FILE_CHANGE_SNAPSHOTS_KEY, snapshots);
        }
        return snapshots;
    }

    protected getCodexProviderObservedFileChanges(request: MutableChatRequestModel): Map<string, CodexProviderObservedFileChange> {
        let changes = request.getDataByKey(OPEN_CODER_CODEX_CLI_OBSERVED_FILE_CHANGES_KEY) as Map<string, CodexProviderObservedFileChange> | undefined;
        if (!changes) {
            changes = new Map<string, CodexProviderObservedFileChange>();
            request.addData(OPEN_CODER_CODEX_CLI_OBSERVED_FILE_CHANGES_KEY, changes);
        }
        return changes;
    }

    protected async tryReadCodexProviderTextFile(uri: URI): Promise<string | undefined> {
        try {
            const content = await this.codexProviderFileService.read(uri);
            return content.value.toString();
        } catch {
            return undefined;
        }
    }

    protected async toCodexProviderFileUri(filePath: string, workingDirectory?: string): Promise<URI | undefined> {
        if (!filePath) {
            return undefined;
        }
        if (this.isAbsoluteCodexProviderPath(filePath)) {
            return FileUri.create(filePath);
        }
        if (this.isCodexProviderUriString(filePath)) {
            return new URI(filePath);
        }
        if (workingDirectory) {
            return this.toCodexProviderDirectoryUri(workingDirectory).resolve(this.normalizeCodexProviderRelativePath(filePath));
        }
        const roots = this.codexProviderWorkspaceService.tryGetRoots();
        const root = roots[0]?.resource;
        return root?.resolve(this.normalizeCodexProviderRelativePath(filePath));
    }

    protected isAbsoluteCodexProviderPath(filePath: string): boolean {
        return /^[a-zA-Z]:[\\/]/.test(filePath) || filePath.startsWith('/') || filePath.startsWith('\\\\');
    }

    protected isCodexProviderUriString(value: string): boolean {
        return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);
    }

    protected toCodexProviderDirectoryUri(value: string): URI {
        if (this.isAbsoluteCodexProviderPath(value)) {
            return FileUri.create(value);
        }
        if (this.isCodexProviderUriString(value)) {
            return new URI(value);
        }
        return FileUri.create(value);
    }

    protected normalizeCodexProviderRelativePath(filePath: string): string {
        return filePath.replace(/\\/g, '/').replace(/^\.?\//, '');
    }

    protected toCodexProviderChangeSetType(kind: string | undefined, originallyExisted: boolean, exists: boolean): 'add' | 'modify' | 'delete' {
        if (kind === 'add' || (!originallyExisted && exists)) {
            return 'add';
        }
        if (kind === 'delete' || (originallyExisted && !exists)) {
            return 'delete';
        }
        return 'modify';
    }

    protected isCodexProviderWorkspaceFile(uri: URI): boolean {
        if (this.isIgnoredCodexProviderWorkspacePath(uri)) {
            return false;
        }
        return this.codexProviderWorkspaceService.tryGetRoots().some(root => root.resource.isEqualOrParent(uri));
    }

    protected isIgnoredCodexProviderWorkspacePath(uri: URI): boolean {
        const segments = uri.path.toString().split('/').filter(Boolean);
        return segments.some(segment => [
            '.git',
            '.theia',
            'node_modules',
            'lib',
            'src-gen',
            'dist',
            'build',
            'coverage',
            'plugins.disabled',
            '.codex-app-server-types'
        ].includes(segment));
    }

    protected isRenderableToolType(type: string | undefined): boolean {
        return type === 'command_execution' ||
            type === 'todo_list' ||
            type === 'web_search' ||
            type === 'mcp_tool_call' ||
            type === 'file_change' ||
            type === 'dynamic_tool_call' ||
            type === 'collab_agent_tool_call' ||
            type === 'image_view' ||
            type === 'image_generation' ||
            type === 'unified_diff' ||
            type === 'review_mode' ||
            type === 'context_compaction';
    }

    protected toCodexSdkItem(item: Record<string, unknown>): Record<string, unknown> {
        const type = this.readString(item, 'type');
        if (type === 'agentMessage') {
            return { ...item, type: 'agent_message' };
        }
        if (type === 'commandExecution') {
            return {
                ...item,
                type: 'command_execution',
                aggregated_output: this.readString(item, 'aggregatedOutput'),
                exit_code: this.readNumber(item, 'exitCode')
            };
        }
        if (type === 'fileChange') {
            return { ...item, type: 'file_change' };
        }
        if (type === 'mcpToolCall') {
            return { ...item, type: 'mcp_tool_call' };
        }
        if (type === 'webSearch') {
            return { ...item, type: 'web_search' };
        }
        if (type === 'todoList') {
            return { ...item, type: 'todo_list' };
        }
        if (type === 'dynamicToolCall') {
            return { ...item, type: 'dynamic_tool_call' };
        }
        if (type === 'collabAgentToolCall') {
            return { ...item, type: 'collab_agent_tool_call' };
        }
        if (type === 'imageView') {
            return { ...item, type: 'image_view' };
        }
        if (type === 'imageGeneration') {
            return { ...item, type: 'image_generation' };
        }
        if (type === 'enteredReviewMode' || type === 'exitedReviewMode') {
            return { ...item, type: 'review_mode', status: type };
        }
        if (type === 'contextCompaction') {
            return { ...item, type: 'context_compaction' };
        }
        return item;
    }

    protected extractToolArguments(type: string, item: Record<string, unknown>): string {
        const args: Record<string, unknown> = {};
        if (type === 'command_execution') {
            args.command = this.readString(item, 'command') || this.readString(item, 'cmd');
            args.status = this.readString(item, 'status');
            args.exit_code = this.readNumber(item, 'exit_code');
        } else if (type === 'file_change') {
            args.changes = item.changes;
            args.status = this.readString(item, 'status');
        } else if (type === 'mcp_tool_call') {
            args.server = this.readString(item, 'server');
            args.tool = this.readString(item, 'tool');
            args.status = this.readString(item, 'status');
        } else if (type === 'web_search') {
            args.query = this.readString(item, 'query');
        } else if (type === 'todo_list') {
            args.id = this.readString(item, 'id');
            args.items = item.items;
        } else if (type === 'unified_diff') {
            args.diff = this.readString(item, 'diff');
            args.status = this.readString(item, 'status');
        } else if (type === 'dynamic_tool_call') {
            args.namespace = this.readString(item, 'namespace');
            args.tool = this.readString(item, 'tool');
            args.status = this.readString(item, 'status');
            args.arguments = item.arguments;
            args.success = this.readBoolean(item, 'success');
        } else if (type === 'collab_agent_tool_call') {
            args.tool = this.readString(item, 'tool');
            args.status = this.readString(item, 'status');
            args.prompt = this.readString(item, 'prompt');
            args.model = this.readString(item, 'model');
            args.reasoningEffort = this.readString(item, 'reasoningEffort');
        } else if (type === 'image_view') {
            args.path = this.readString(item, 'path');
        } else if (type === 'image_generation') {
            args.status = this.readString(item, 'status');
            args.revisedPrompt = this.readString(item, 'revisedPrompt');
            args.savedPath = this.readString(item, 'savedPath');
        } else if (type === 'review_mode' || type === 'context_compaction') {
            args.status = this.readString(item, 'status');
            args.review = this.readString(item, 'review');
        }
        return JSON.stringify(args);
    }

    protected getStreamedMessageIds(request: MutableChatRequestModel): Set<string> {
        let streamedIds = request.getDataByKey(OPEN_CODER_CODEX_CLI_STREAMED_MESSAGES_KEY) as Set<string> | undefined;
        if (!streamedIds) {
            streamedIds = new Set<string>();
            request.addData(OPEN_CODER_CODEX_CLI_STREAMED_MESSAGES_KEY, streamedIds);
        }
        return streamedIds;
    }

    protected addMarkdown(request: MutableChatRequestModel, text: string): void {
        if (text) {
            request.response.response.addContent(new MarkdownChatResponseContentImpl(text));
        }
    }

    protected formatJsonBlock(title: string, params: unknown): string {
        return `**${title}**\n\n\`\`\`json\n${JSON.stringify(params, undefined, 2)}\n\`\`\``;
    }

    protected readString(source: unknown, key: string): string {
        if (typeof source === 'object' && source && key in source) {
            const value = (source as Record<string, unknown>)[key];
            return typeof value === 'string' ? value : '';
        }
        return '';
    }

    protected readNumber(source: unknown, key: string): number | undefined {
        if (typeof source === 'object' && source && key in source) {
            const value = (source as Record<string, unknown>)[key];
            return typeof value === 'number' ? value : undefined;
        }
        return undefined;
    }

    protected readObject(source: unknown, key: string): Record<string, unknown> {
        if (typeof source === 'object' && source && key in source) {
            const value = (source as Record<string, unknown>)[key];
            return typeof value === 'object' && value ? value as Record<string, unknown> : {};
        }
        return {};
    }

    protected readArray(source: unknown, key: string): unknown[] {
        if (typeof source === 'object' && source && key in source) {
            const value = (source as Record<string, unknown>)[key];
            return Array.isArray(value) ? value : [];
        }
        return [];
    }

    protected readBoolean(source: unknown, key: string): boolean | undefined {
        if (typeof source === 'object' && source && key in source) {
            const value = (source as Record<string, unknown>)[key];
            return typeof value === 'boolean' ? value : undefined;
        }
        return undefined;
    }

    protected readCodexProviderPatchChanges(source: unknown): CodexProviderFileUpdateChange[] {
        const changes = this.readObject(source, 'changes');
        return Object.entries(changes).map(([path, value]) => ({
            path,
            kind: this.readString(value, 'type') || this.readCodexProviderChangeKind(value),
            diff: this.readString(value, 'diff')
        })).filter(change => !!change.path);
    }

    protected readCodexProviderChangeKind(source: unknown): string {
        const kind = this.readString(source, 'kind');
        if (kind) {
            return kind;
        }
        return this.readString(this.readObject(source, 'kind'), 'type');
    }

    protected toDisplayText(value: unknown): string {
        return typeof value === 'string' ? value : JSON.stringify(value, undefined, 2);
    }

    protected override isAgentModeRequest(request: MutableChatRequestModel): boolean {
        const modeId = request.request.modeId;
        if (modeId) {
            return modeId === OPEN_CODER_AGENT_MODE_TEMPLATE_ID ||
                modeId === OPEN_CODER_AGENT_MODE_NEXT_TEMPLATE_ID ||
                modeId === OPEN_CODER_CODEX_CLI_WORKSPACE_MODE_ID ||
                modeId === OPEN_CODER_CODEX_CLI_FULL_ACCESS_MODE_ID;
        }
        if (this.hasCodexProviderControl(request, 'workspace') || this.hasCodexProviderControl(request, 'fullaccess')) {
            return true;
        }
        const effectiveVariantId = this.getEffectiveVariantIdWithMode(undefined);
        return effectiveVariantId === OPEN_CODER_AGENT_MODE_TEMPLATE_ID || effectiveVariantId === OPEN_CODER_AGENT_MODE_NEXT_TEMPLATE_ID;
    }

    override async suggest(context: ChatSession | ChatRequestModel): Promise<void> {
        const contextIsRequest = ChatRequestModel.is(context);
        const model = contextIsRequest ? context.session : context.model;
        const session = contextIsRequest ? this.chatService.getSessions().find(candidate => candidate.model.id === model.id) : context;
        if (!(model instanceof MutableChatModel) || !session) { return; }
        if (model.isEmpty()) {
            model.setSuggestions([
                {
                    kind: 'callback',
                    callback: () => this.chatService.sendRequest(session.id, {
                        text: `@${OpenCoderAgentId} ${nls.localize('theia/ai/ide/openCoderAgent/suggestion/fixProblems/prompt',
                            'please look at {0} and fix any problems.', '#_f')}`
                    }),
                    content: nls.localize('theia/ai/ide/openCoderAgent/suggestion/fixProblems/content', '[Fix problems]({0}) in the current file.', '_callback')
                },
                {
                    kind: 'callback',
                    callback: () => this.chatService.sendRequest(session.id, {
                        text: `@${OpenCoderAgentId} /workspace `
                    }),
                    content: nls.localize('theia/ai/ide/openCoderAgent/suggestion/codexWorkspace',
                        '[Start with workspace access]({0})', '_callback')
                },
                {
                    kind: 'callback',
                    callback: () => this.commandService.executeCommand(CODEX_CLI_CONFIGURE_COMMAND.id),
                    content: nls.localize('theia/ai/ide/openCoderAgent/suggestion/codexConfig',
                        '[Configure CyberVinci AI Providers]({0})', '_callback')
                }
            ]);
        } else {
            model.setSuggestions([
                {
                    kind: 'callback',
                    callback: () => this.chatService.sendRequest(session.id, {
                        text: `@${OpenCoderAgentId} /continue`
                    }),
                    content: nls.localize('theia/ai/ide/openCoderAgent/suggestion/codexContinue',
                        '[Continue]({0})', '_callback')
                },
                {
                    kind: 'callback',
                    callback: () => this.chatService.sendRequest(session.id, {
                        text: `@${OpenCoderAgentId} /retry`
                    }),
                    content: nls.localize('theia/ai/ide/openCoderAgent/suggestion/codexRetry',
                        '[Retry]({0})', '_callback')
                },
                {
                    kind: 'callback',
                    callback: () => this.chatService.sendRequest(session.id, {
                        text: `@${OpenCoderAgentId} /compact`
                    }),
                    content: nls.localize('theia/ai/ide/openCoderAgent/suggestion/codexCompact',
                        '[Compact]({0})', '_callback')
                },
                new MarkdownStringImpl(nls.localize('theia/ai/ide/openCoderAgent/suggestion/startNewChat',
                    'Keep chats short and focused. [Start a new chat]({0}) for a new task or [start a new chat with a summary of this one]({1}).',
                    `command:${AI_CHAT_NEW_CHAT_WINDOW_COMMAND.id}`, `command:${ChatCommands.AI_CHAT_NEW_WITH_TASK_CONTEXT.id}`))
            ]);
        }
    }
}
