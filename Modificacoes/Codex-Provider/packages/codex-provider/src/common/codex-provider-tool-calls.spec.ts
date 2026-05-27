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
import { CODEX_CLI_RENDERED_TOOL_CALLS } from './codex-provider-tool-calls';

describe('Codex Provider rendered tool calls', () => {
    it('covers Codex Provider internal and external tool surfaces', () => {
        expect([...CODEX_CLI_RENDERED_TOOL_CALLS]).members([
            'file_change',
            'mcp_tool_call',
            'command_execution',
            'todo_list',
            'web_search',
            'unified_diff',
            'dynamic_tool_call',
            'collab_agent_tool_call',
            'image_view',
            'image_generation',
            'review_mode',
            'context_compaction'
        ]);
    });
});
