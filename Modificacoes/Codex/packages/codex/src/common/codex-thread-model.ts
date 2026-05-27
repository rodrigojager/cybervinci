// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    CodexProviderApprovalRequestMessage,
    CodexProviderStreamMessage,
    CodexProviderUserInputRequestMessage
} from '@cybervinci/codex-provider/lib/common/codex-provider-service';

export type CodexThreadRole = 'user' | 'assistant' | 'system' | 'tool' | 'thinking';

export interface CodexThreadMessage {
    id: string;
    role: CodexThreadRole;
    text: string;
    toolType?: string;
    toolData?: Record<string, unknown>;
    finished?: boolean;
}

export interface CodexThread {
    id: string;
    sessionId: string;
    title: string;
    updatedAt: number;
    messages: CodexThreadMessage[];
}

export interface CodexPendingApproval {
    threadId: string;
    message: CodexProviderApprovalRequestMessage;
}

export interface CodexPendingUserInput {
    threadId: string;
    message: CodexProviderUserInputRequestMessage;
}

export interface CodexStreamReducerState {
    messages: CodexThreadMessage[];
    streamingAssistantId?: string;
    streamingThinkingId?: string;
    activeToolIds: Map<string, string>;
}

export function createEmptyReducerState(): CodexStreamReducerState {
    return {
        messages: [],
        activeToolIds: new Map<string, string>()
    };
}

export function applyCodexStreamMessage(
    state: CodexStreamReducerState,
    message: CodexProviderStreamMessage
): CodexStreamReducerState {
    if (message.type === 'approval-request' || message.type === 'user-input-request' || message.type === 'login-event') {
        return state;
    }
    if (message.type !== 'notification') {
        return state;
    }
    const method = message.method;
    const params = asRecord(message.params);
    if (method === 'item/agentMessage/delta') {
        const delta = readString(params, 'delta');
        if (!delta) {
            return state;
        }
        const itemId = readString(params, 'itemId') || state.streamingAssistantId || 'assistant-stream';
        const messages = [...state.messages];
        const index = messages.findIndex(entry => entry.id === itemId);
        if (index >= 0) {
            messages[index] = { ...messages[index], text: messages[index].text + delta };
        } else {
            messages.push({ id: itemId, role: 'assistant', text: delta });
        }
        return { ...state, messages, streamingAssistantId: itemId };
    }
    if (method === 'item/plan/delta' || method === 'item/reasoning/textDelta' || method === 'item/reasoning/summaryTextDelta') {
        const delta = readString(params, 'delta');
        if (!delta) {
            return state;
        }
        const itemId = readString(params, 'itemId') || state.streamingThinkingId || 'thinking-stream';
        const messages = [...state.messages];
        const index = messages.findIndex(entry => entry.id === itemId);
        if (index >= 0) {
            messages[index] = { ...messages[index], text: messages[index].text + delta };
        } else {
            messages.push({ id: itemId, role: 'thinking', text: delta });
        }
        return { ...state, messages, streamingThinkingId: itemId };
    }
    if (method === 'item/started' || method === 'item/updated') {
        const item = asRecord(params.item);
        const type = normalizeToolType(readString(item, 'type'));
        if (!type || !isRenderableToolType(type)) {
            return state;
        }
        const itemId = readString(item, 'id') || readString(params, 'itemId') || `${type}-${state.messages.length}`;
        const activeToolIds = new Map(state.activeToolIds);
        activeToolIds.set(itemId, type);
        const messages = [...state.messages];
        const index = messages.findIndex(entry => entry.id === itemId);
        const next: CodexThreadMessage = {
            id: itemId,
            role: 'tool',
            text: summarizeTool(type, item),
            toolType: type,
            toolData: item,
            finished: false
        };
        if (index >= 0) {
            messages[index] = { ...messages[index], ...next };
        } else {
            messages.push(next);
        }
        return { ...state, messages, activeToolIds };
    }
    if (method === 'item/completed' || method === 'patch_apply_end') {
        const item = asRecord(params.item ?? params);
        const itemId = readString(item, 'id') || readString(params, 'itemId') || readString(params, 'call_id');
        if (!itemId) {
            return state;
        }
        const messages = state.messages.map(entry => entry.id === itemId
            ? {
                ...entry,
                finished: true,
                toolData: Object.keys(item).length > 0 ? item : entry.toolData,
                text: entry.toolType ? summarizeTool(entry.toolType, { ...asRecord(entry.toolData), ...item }) : entry.text
            }
            : entry);
        const activeToolIds = new Map(state.activeToolIds);
        activeToolIds.delete(itemId);
        return { ...state, messages, activeToolIds };
    }
    if (method === 'error' || method === 'warning' || method === 'configWarning') {
        return {
            ...state,
            messages: [...state.messages, {
                id: `error-${state.messages.length}`,
                role: 'system',
                text: displayText(params)
            }]
        };
    }
    if (method === 'task_complete') {
        const lastMessage = readString(params, 'last_agent_message');
        if (!lastMessage) {
            return state;
        }
        return {
            ...state,
            messages: [...state.messages, {
                id: `task-complete-${state.messages.length}`,
                role: 'assistant',
                text: lastMessage,
                finished: true
            }],
            streamingAssistantId: undefined,
            streamingThinkingId: undefined
        };
    }
    if (method === 'turn/started') {
        return { ...state, streamingAssistantId: undefined, streamingThinkingId: undefined };
    }
    if (method === 'turn/completed' || method === 'turn/failed') {
        return { ...state, streamingAssistantId: undefined, streamingThinkingId: undefined };
    }
    return state;
}

export function summarizeThreadTitle(firstUserMessage: string): string {
    const normalized = firstUserMessage.replace(/\s+/g, ' ').trim();
    if (!normalized) {
        return 'New thread';
    }
    return normalized.length > 48 ? `${normalized.slice(0, 45)}...` : normalized;
}

function normalizeToolType(type: string | undefined): string | undefined {
    if (!type) {
        return undefined;
    }
    if (type === 'agentMessage') {
        return 'agent_message';
    }
    if (type === 'commandExecution') {
        return 'command_execution';
    }
    if (type === 'fileChange') {
        return 'file_change';
    }
    if (type === 'mcpToolCall') {
        return 'mcp_tool_call';
    }
    if (type === 'webSearch') {
        return 'web_search';
    }
    if (type === 'todoList') {
        return 'todo_list';
    }
    return type.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function isRenderableToolType(type: string): boolean {
    return type === 'command_execution' ||
        type === 'todo_list' ||
        type === 'web_search' ||
        type === 'mcp_tool_call' ||
        type === 'file_change' ||
        type === 'unified_diff' ||
        type === 'review_mode' ||
        type === 'context_compaction';
}

function summarizeTool(type: string, item: Record<string, unknown>): string {
    if (type === 'command_execution') {
        return readString(item, 'command') || readString(item, 'cmd') || 'Running command';
    }
    if (type === 'file_change') {
        const changes = Array.isArray(item.changes) ? item.changes.length : 0;
        return changes > 0 ? `Updating ${changes} file(s)` : 'Updating files';
    }
    if (type === 'web_search') {
        return readString(item, 'query') || 'Searching the web';
    }
    if (type === 'todo_list') {
        return 'Updating task list';
    }
    if (type === 'mcp_tool_call') {
        const server = readString(item, 'server');
        const tool = readString(item, 'tool');
        return server && tool ? `${server}: ${tool}` : 'Running MCP tool';
    }
    return type.replace(/_/g, ' ');
}

function asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value ? value as Record<string, unknown> : {};
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
    const value = record[key];
    return typeof value === 'string' ? value : undefined;
}

function displayText(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'object' && value) {
        const record = value as Record<string, unknown>;
        return readString(record, 'message') || readString(record, 'error') || JSON.stringify(value);
    }
    return String(value ?? '');
}
