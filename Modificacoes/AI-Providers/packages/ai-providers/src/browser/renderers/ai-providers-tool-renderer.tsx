// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ChatResponseContent, ToolCallChatResponseContent } from '@theia/ai-chat/lib/common';
import { ChatResponsePartRenderer } from '@theia/ai-chat-ui/lib/browser/chat-response-part-renderer';
import { nls } from '@theia/core';
import { codicon } from '@theia/core/lib/browser';
import { injectable } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { ReactNode } from '@theia/core/shared/react';
import { CODEX_CLI_RENDERED_TOOL_CALLS } from '../../common/ai-providers-tool-calls';

@injectable()
export class CodexProviderToolRenderer implements ChatResponsePartRenderer<ToolCallChatResponseContent> {

    canHandle(response: ChatResponseContent): number {
        if (response.kind !== 'toolCall') {
            return 0;
        }
        const name = (response as ToolCallChatResponseContent).name;
        return name && CODEX_CLI_RENDERED_TOOL_CALLS.has(name) ? 30 : 0;
    }

    render(content: ToolCallChatResponseContent): ReactNode {
        const args = this.parseObject(content.arguments);
        const result = this.parseObject(content.result);
        const item = Object.keys(result).length > 0 ? result : args;
        if (content.name === 'file_change') {
            return <FileChangeTool item={item} finished={!!content.finished} />;
        }
        if (content.name === 'mcp_tool_call') {
            return <McpToolCall item={item} finished={!!content.finished} />;
        }
        if (content.name === 'command_execution') {
            return <CommandExecutionTool item={item} finished={!!content.finished} />;
        }
        if (content.name === 'todo_list') {
            return <TodoListTool item={item} />;
        }
        if (content.name === 'web_search') {
            return <WebSearchTool item={item} finished={!!content.finished} />;
        }
        if (content.name === 'unified_diff') {
            return <UnifiedDiffTool item={item} />;
        }
        return <GenericCodexTool name={content.name || 'codex_tool'} item={item} finished={!!content.finished} />;
    }

    protected parseObject(value: unknown): Record<string, unknown> {
        if (!value) {
            return {};
        }
        if (typeof value === 'object') {
            return value as Record<string, unknown>;
        }
        if (typeof value !== 'string') {
            return {};
        }
        try {
            const parsed = JSON.parse(value);
            return typeof parsed === 'object' && parsed ? parsed : {};
        } catch {
            return {};
        }
    }
}

const FileChangeTool: React.FC<{ item: Record<string, unknown>, finished: boolean }> = ({ item, finished }) => {
    const [expandedDiff, setExpandedDiff] = React.useState<string | undefined>();
    const changes = Array.isArray(item.changes) ? item.changes as Array<Record<string, unknown>> : [];
    const status = stringValue(item.status) || (finished ? nls.localizeByDefault('Done') : nls.localizeByDefault('Running'));
    const title = finished
        ? nls.localize('theia/ai-providers/fileChangesApplied', 'File changes')
        : nls.localize('theia/ai-providers/fileChangesRunning', 'Changing files');
    return (
        <div className="ai-providers-tool container">
            <div className="ai-providers-tool header">
                <div className="ai-providers-tool header-left">
                    <span className={`${codicon(finished ? 'diff' : 'loading')} ai-providers-tool icon ${finished ? '' : 'theia-animation-spin'}`} />
                    <span className="ai-providers-tool title">{title}</span>
                    <span className="ai-providers-tool muted">{status}</span>
                </div>
                <div className="ai-providers-tool header-right">
                    <span className="ai-providers-tool badge">
                        {nls.localizeByDefault('{0} files', changes.length)}
                    </span>
                </div>
            </div>
            {changes.length > 0 && (
                <div className="ai-providers-tool details">
                    {changes.map((change, index) => {
                        const diff = stringValue(change.diff);
                        const path = stringValue(change.path);
                        const expanded = expandedDiff === path;
                        return (
                            <React.Fragment key={index}>
                                <div
                                    className={`ai-providers-tool row ${diff ? 'clickable' : ''}`}
                                    onClick={() => diff && setExpandedDiff(expanded ? undefined : path)}
                                >
                                    {diff && <span className={`${codicon(expanded ? 'chevron-down' : 'chevron-right')} ai-providers-tool icon`} />}
                                    <span className="ai-providers-tool change-kind">{stringValue(change.kind) || nls.localizeByDefault('Change')}</span>
                                    <code className="ai-providers-tool path">{path}</code>
                                </div>
                                {diff && expanded && <pre className="ai-providers-tool output diff">{diff}</pre>}
                            </React.Fragment>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const CommandExecutionTool: React.FC<{ item: Record<string, unknown>, finished: boolean }> = ({ item, finished }) => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const command = stringValue(item.command) || stringValue(item.cmd) || nls.localizeByDefault('Executing');
    const output = stringValue(item.aggregated_output) || stringValue(item.aggregatedOutput);
    const exitCode = numberValue(item.exit_code) ?? numberValue(item.exitCode);
    const hasOutput = output.trim().length > 0;
    const status = stringValue(item.status) || (finished ? nls.localizeByDefault('Done') : nls.localizeByDefault('Running'));
    return (
        <div className="ai-providers-tool container">
            <div
                className={`ai-providers-tool header ${hasOutput ? 'clickable' : ''}`}
                onClick={() => hasOutput && setIsExpanded(!isExpanded)}
            >
                <div className="ai-providers-tool header-left">
                    {hasOutput && <span className={`${codicon(isExpanded ? 'chevron-down' : 'chevron-right')} ai-providers-tool icon`} />}
                    <span className={`${codicon(finished ? 'terminal' : 'loading')} ai-providers-tool icon ${finished ? '' : 'theia-animation-spin'}`} />
                    <span className="ai-providers-tool title">{nls.localizeByDefault('Terminal')}</span>
                    <code className="ai-providers-tool path">{command}</code>
                </div>
                <div className="ai-providers-tool header-right">
                    <span className={`ai-providers-tool badge ${exitCode === 0 ? 'success' : exitCode === undefined ? '' : 'error'}`}>
                        {exitCode === undefined ? status : nls.localize('theia/ai-providers/exitCode', 'Exit code: {0}', exitCode)}
                    </span>
                </div>
            </div>
            {hasOutput && isExpanded && <pre className="ai-providers-tool output">{output}</pre>}
        </div>
    );
};

const TodoListTool: React.FC<{ item: Record<string, unknown> }> = ({ item }) => {
    const items = Array.isArray(item.items) ? item.items as Array<Record<string, unknown>> : [];
    const completed = items.filter(candidate => booleanValue(candidate.completed)).length;
    return (
        <div className="ai-providers-tool container">
            <div className="ai-providers-tool header">
                <div className="ai-providers-tool header-left">
                    <span className={`${codicon('checklist')} ai-providers-tool icon`} />
                    <span className="ai-providers-tool title">{nls.localize('theia/ai-providers/todoList', 'Plan')}</span>
                    <span className="ai-providers-tool muted">{nls.localize('theia/ai-providers/completedCount', '{0}/{1} completed', completed, items.length)}</span>
                </div>
                <div className="ai-providers-tool header-right">
                    <span className="ai-providers-tool badge">{nls.localize('theia/ai-providers/itemCount', '{0} items', items.length)}</span>
                </div>
            </div>
            {items.length > 0 && (
                <div className="ai-providers-tool details">
                    {items.map((todo, index) => (
                        <div key={index} className="ai-providers-tool row">
                            <span className={`${codicon(booleanValue(todo.completed) ? 'check' : 'circle-outline')} ai-providers-tool icon`} />
                            <span className={booleanValue(todo.completed) ? 'ai-providers-tool done' : ''}>{stringValue(todo.text)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const WebSearchTool: React.FC<{ item: Record<string, unknown>, finished: boolean }> = ({ item, finished }) => {
    const query = stringValue(item.query);
    return (
        <div className="ai-providers-tool container">
            <div className="ai-providers-tool header">
                <div className="ai-providers-tool header-left">
                    <span className={`${codicon(finished ? 'globe' : 'loading')} ai-providers-tool icon ${finished ? '' : 'theia-animation-spin'}`} />
                    <span className="ai-providers-tool title">
                        {finished ? nls.localize('theia/ai-providers/webSearched', 'Searched') : nls.localize('theia/ai-providers/webSearching', 'Searching')}
                    </span>
                    {query && <span className="ai-providers-tool path">{query}</span>}
                </div>
                <div className="ai-providers-tool header-right">
                    <span className="ai-providers-tool badge">{nls.localizeByDefault('Web Search')}</span>
                </div>
            </div>
        </div>
    );
};

const UnifiedDiffTool: React.FC<{ item: Record<string, unknown> }> = ({ item }) => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const diff = stringValue(item.diff);
    return (
        <div className="ai-providers-tool container">
            <div className={`ai-providers-tool header ${diff ? 'clickable' : ''}`} onClick={() => diff && setIsExpanded(!isExpanded)}>
                <div className="ai-providers-tool header-left">
                    {diff && <span className={`${codicon(isExpanded ? 'chevron-down' : 'chevron-right')} ai-providers-tool icon`} />}
                    <span className={`${codicon('diff')} ai-providers-tool icon`} />
                    <span className="ai-providers-tool title">{nls.localize('theia/ai-providers/unifiedDiff', 'Workspace diff')}</span>
                </div>
                <div className="ai-providers-tool header-right">
                    <span className="ai-providers-tool badge">{stringValue(item.status) || nls.localizeByDefault('Updated')}</span>
                </div>
            </div>
            {diff && isExpanded && <pre className="ai-providers-tool output diff">{diff}</pre>}
        </div>
    );
};

const McpToolCall: React.FC<{ item: Record<string, unknown>, finished: boolean }> = ({ item, finished }) => {
    const server = stringValue(item.server) || nls.localize('theia/ai-providers/mcpServerUnknown', 'MCP server');
    const tool = stringValue(item.tool) || nls.localize('theia/ai-providers/mcpToolUnknown', 'tool');
    const status = stringValue(item.status) || (finished ? nls.localizeByDefault('Done') : nls.localizeByDefault('Running'));
    return (
        <div className="ai-providers-tool container">
            <div className="ai-providers-tool header">
                <div className="ai-providers-tool header-left">
                    <span className={`${codicon(finished ? 'plug' : 'loading')} ai-providers-tool icon ${finished ? '' : 'theia-animation-spin'}`} />
                    <span className="ai-providers-tool title">{nls.localize('theia/ai-providers/mcpToolCall', 'MCP tool')}</span>
                    <code className="ai-providers-tool path">{server}/{tool}</code>
                </div>
                <div className="ai-providers-tool header-right">
                    <span className="ai-providers-tool badge">{status}</span>
                </div>
            </div>
        </div>
    );
};

const GenericCodexTool: React.FC<{ name: string, item: Record<string, unknown>, finished: boolean }> = ({ name, item, finished }) => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const status = stringValue(item.status) || (finished ? nls.localizeByDefault('Done') : nls.localizeByDefault('Running'));
    const title = toTitle(name);
    const details = JSON.stringify(item, undefined, 2);
    return (
        <div className="ai-providers-tool container">
            <div className="ai-providers-tool header clickable" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="ai-providers-tool header-left">
                    <span className={`${codicon(isExpanded ? 'chevron-down' : 'chevron-right')} ai-providers-tool icon`} />
                    <span className={`${codicon(finished ? 'tools' : 'loading')} ai-providers-tool icon ${finished ? '' : 'theia-animation-spin'}`} />
                    <span className="ai-providers-tool title">{title}</span>
                    {stringValue(item.tool) && <code className="ai-providers-tool path">{stringValue(item.tool)}</code>}
                    {stringValue(item.path) && <code className="ai-providers-tool path">{stringValue(item.path)}</code>}
                </div>
                <div className="ai-providers-tool header-right">
                    <span className="ai-providers-tool badge">{status}</span>
                </div>
            </div>
            {isExpanded && <pre className="ai-providers-tool output">{details}</pre>}
        </div>
    );
};

function toTitle(name: string): string {
    return name
        .split('_')
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function stringValue(value: unknown): string {
    if (typeof value === 'object' && value && 'type' in value) {
        const type = (value as { type: unknown }).type;
        return typeof type === 'string' ? type : '';
    }
    return typeof value === 'string' ? value : '';
}

function numberValue(value: unknown): number | undefined {
    return typeof value === 'number' ? value : undefined;
}

function booleanValue(value: unknown): boolean {
    return value === true;
}
