// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import { ToolRequest, type LanguageModelRequest } from '@theia/ai-core/lib/common';
import { AIOutputCleanerBackendService } from '../common/ai-output-cleaner-backend-service';
import { SavedArtifact } from '../common/ai-output-cleaner-types';
import { TheiaToolCallInterceptor } from './theia-tool-call-interceptor';

class FakePreferenceService {
    constructor(protected readonly values: Record<string, unknown>) { }
    get<T>(name: string, defaultValue?: T): T {
        return (this.values[name] as T | undefined) ?? defaultValue as T;
    }
}

class FakeBackendService implements Pick<AIOutputCleanerBackendService, 'saveArtifact' | 'getSessionOverride'> {
    readonly savedRecords: Array<{ command: string; rawStdout: string; rawStderr: string }> = [];
    sessionOverride?: { sessionId: string; bypassFiltering: boolean; updatedAt: string };

    async saveArtifact(record: {
        command: string;
        rawStdout: string;
        rawStderr: string;
    }): Promise<SavedArtifact> {
        this.savedRecords.push(record);
        return {
            id: 'artifact-1',
            path: '/tmp/cybervinci-artifacts/artifact-1',
            command: record.command,
            args: [],
            startedAt: new Date(0).toISOString(),
            completedAt: new Date(0).toISOString(),
            filtersApplied: []
        };
    }

    async getSessionOverride(_sessionId: string): Promise<{ sessionId: string; bypassFiltering: boolean; updatedAt: string } | undefined> {
        return this.sessionOverride;
    }
}

class TestTheiaToolCallInterceptor extends TheiaToolCallInterceptor {
    constructor(
        preferenceService: FakePreferenceService,
        backendService: FakeBackendService
    ) {
        super();
        (this as unknown as { preferenceService: FakePreferenceService }).preferenceService = preferenceService;
        (this as unknown as { backendService: FakeBackendService }).backendService = backendService;
    }
}

describe('TheiaToolCallInterceptor', () => {
    const request: LanguageModelRequest & { sessionId?: string } = {
        sessionId: 'session-1',
        messages: [{ actor: 'user', type: 'text', text: 'verifique o git status' }]
    };
    const tool: ToolRequest = {
        id: 'command_execution',
        name: 'Command Execution',
        parameters: { type: 'object', properties: {} },
        handler: async () => ''
    };

    function createInterceptor(overrides: Record<string, unknown> = {}): {
        interceptor: TestTheiaToolCallInterceptor;
        backendService: FakeBackendService;
    } {
        const backendService = new FakeBackendService();
        return {
            interceptor: new TestTheiaToolCallInterceptor(
                new FakePreferenceService({
                    'cybervinci.aiOutputCleaner.enabled': true,
                    'cybervinci.aiOutputCleaner.theiaTools.enabled': true,
                    'cybervinci.aiOutputCleaner.mode': 'safe',
                    'cybervinci.aiOutputCleaner.rawArtifacts.enabled': true,
                    'cybervinci.aiOutputCleaner.showFilteringNotice': true,
                    'cybervinci.aiOutputCleaner.statusAware.enabled': true,
                    'cybervinci.aiOutputCleaner.wrapperCommands': ['git', 'rg', 'npm', 'pnpm', 'yarn', 'node', 'python', 'pytest', 'cargo', 'docker'],
                    'cybervinci.aiOutputCleaner.literalBypassPatterns': ['mojibake', 'encoding', 'utf-8', 'latin-1', 'caracteres', 'simbolos', 'conteudo literal', 'texto quebrado', 'acento', 'corrompido', 'escape sequence', 'ansi'],
                    'cybervinci.aiOutputCleaner.statusIntentPatterns': ['ainda esta rodando', 'ja terminou', 'travou', 'progresso'],
                    ...overrides
                }),
                backendService
            ),
            backendService
        };
    }

    it('filters git status advice lines for command results and persists the raw artifact', async () => {
        const { interceptor, backendService } = createInterceptor();
        const rawResult = JSON.stringify({
            command: 'git status',
            aggregated_output: [
                'On branch main',
                '(use "git add <file>..." to update what will be committed)',
                'modified: package.json'
            ].join('\n'),
            exit_code: 0
        });

        const result = await interceptor.intercept(request, tool, JSON.stringify({ command: 'git status' }), rawResult);

        expect(result).to.be.a('string');
        const parsed = JSON.parse(result as string) as { aggregated_output: string };
        expect(parsed.aggregated_output).to.contain('On branch main');
        expect(parsed.aggregated_output).to.contain('modified: package.json');
        expect(parsed.aggregated_output).to.contain('cybervinci://output-artifact/');
        expect(backendService.savedRecords).to.have.lengthOf(1);
        expect(backendService.savedRecords[0].rawStdout).to.contain('use "git add <file>..."');
    });

    it('does not change tool results when frontend interception is disabled', async () => {
        const { interceptor, backendService } = createInterceptor({
            'cybervinci.aiOutputCleaner.enabled': false
        });
        const rawResult = 'literal output';

        const result = await interceptor.intercept(request, tool, JSON.stringify({ command: 'git status' }), rawResult);

        expect(result).to.equal(rawResult);
        expect(backendService.savedRecords).to.have.lengthOf(0);
    });

    it('bypasses literal-intent prompts without dropping the raw artifact reference', async () => {
        const { interceptor } = createInterceptor();
        const literalRequest: LanguageModelRequest = {
            messages: [{ actor: 'user', type: 'text', text: 'investigue mojibake e encoding desse output' }]
        };

        const result = await interceptor.intercept(literalRequest, tool, JSON.stringify({ command: 'git status' }), 'Ã§\nlinha literal');

        expect(result).to.be.a('string');
        expect(result as string).to.contain('Ã§');
        expect(result as string).to.contain('bypassed filtering');
        expect(result as string).to.contain('cybervinci://output-artifact/');
    });

    it('rewrites text tool-call content results and preserves non-text items', async () => {
        const { interceptor } = createInterceptor();
        const result = await interceptor.intercept(
            request,
            tool,
            JSON.stringify({ command: 'git status' }),
            {
                content: [
                    { type: 'text', text: 'On branch main\n(use "git add <file>..." to update what will be committed)' },
                    { type: 'image', base64data: 'abc', mimeType: 'image/png' }
                ]
            }
        );

        const toolCallContent = result as { content: Array<{ type: string; text?: string }> };
        expect(toolCallContent.content[0].type).to.equal('text');
        expect(toolCallContent.content.some(item => item.type === 'image')).to.be.true;
        expect(toolCallContent.content.some(item => item.text?.includes('cybervinci://output-artifact/'))).to.be.true;
    });

    it('passes through non-command tools unchanged', async () => {
        const { interceptor, backendService } = createInterceptor();
        const nonCommandTool: ToolRequest = {
            id: 'read_context',
            name: 'Read Context',
            parameters: { type: 'object', properties: {} },
            handler: async () => ''
        };
        const rawResult = 'context snapshot';

        const result = await interceptor.intercept(request, nonCommandTool, '{}', rawResult);

        expect(result).to.equal(rawResult);
        expect(backendService.savedRecords).to.have.lengthOf(0);
    });

    it('bypasses filtering for sessions explicitly marked to use raw output', async () => {
        const { interceptor, backendService } = createInterceptor();
        backendService.sessionOverride = {
            sessionId: 'session-1',
            bypassFiltering: true,
            updatedAt: '2026-01-01T10:00:00.000Z'
        };
        const rawResult = JSON.stringify({
            command: 'git status',
            aggregated_output: [
                'On branch main',
                '(use "git add <file>..." to update what will be committed)',
                'modified: package.json'
            ].join('\n'),
            exit_code: 0
        });

        const result = await interceptor.intercept(request, tool, JSON.stringify({ command: 'git status' }), rawResult);

        const parsed = JSON.parse(result as string) as { aggregated_output: string };
        expect(parsed.aggregated_output).to.contain('use "git add <file>..."');
        expect(backendService.savedRecords[0].rawStdout).to.contain('modified: package.json');
    });
});
