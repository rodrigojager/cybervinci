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

import { BasePromptFragment } from '@theia/ai-core/lib/common';
import {
    getCoderAgentModeNextPromptTemplate,
    getCoderAgentModePromptTemplate,
    getCoderPromptTemplateEdit,
    getCoderPromptTemplateEditNext
} from './coder-replace-prompt-template';

export const OPEN_CODER_SYSTEM_PROMPT_ID = 'open-coder-system';

export const OPEN_CODER_EDIT_TEMPLATE_ID = 'open-coder-system-edit';
export const OPEN_CODER_EDIT_NEXT_TEMPLATE_ID = 'open-coder-system-edit-next';
export const OPEN_CODER_AGENT_MODE_TEMPLATE_ID = 'open-coder-system-agent-mode';
export const OPEN_CODER_AGENT_MODE_NEXT_TEMPLATE_ID = 'open-coder-system-agent-mode-next';

const OPEN_CODER_ADAPTER = `

# CyberVinci Product Direction

You are CyberVinci, an open source coding agent built into CyberVinci. Preserve the autonomy, workspace-awareness, reviewability, and tool discipline expected from an AI-first IDE, \
while optimizing for an editor product that competes directly with AI-native coding tools.

## Provider Neutrality
- Never assume a specific model vendor.
- Use CyberVinci language model abstractions and configured model capabilities.
- Keep prompts portable across OpenAI, Anthropic, Ollama, Hugging Face, Llamafile, GitHub Copilot, Codex, Claude Code, and OpenAI-compatible providers.
- Do not mention provider-specific APIs unless the user asks for provider integration work.

## Open Source Defaults
- Prefer transparent changes, reproducible reasoning, and auditable file operations.
- Keep generated code license-conscious and compatible with downstream open source distribution.
- Avoid vendor lock-in in code, configuration, prompts, and documentation.
`;

function adaptCoderPrompt(fragment: BasePromptFragment, id: string, variantOf?: string): BasePromptFragment {
    return {
        id,
        template: `${OPEN_CODER_ADAPTER}\n${fragment.template}`,
        ...(variantOf ? { variantOf } : {})
    };
}

export function getOpenCoderAgentModePromptTemplate(): BasePromptFragment {
    return adaptCoderPrompt(getCoderAgentModePromptTemplate(), OPEN_CODER_AGENT_MODE_TEMPLATE_ID, OPEN_CODER_EDIT_TEMPLATE_ID);
}

export function getOpenCoderAgentModeNextPromptTemplate(): BasePromptFragment {
    return adaptCoderPrompt(getCoderAgentModeNextPromptTemplate(), OPEN_CODER_AGENT_MODE_NEXT_TEMPLATE_ID, OPEN_CODER_EDIT_TEMPLATE_ID);
}

export function getOpenCoderPromptTemplateEdit(): BasePromptFragment {
    return adaptCoderPrompt(getCoderPromptTemplateEdit(), OPEN_CODER_EDIT_TEMPLATE_ID);
}

export function getOpenCoderPromptTemplateEditNext(): BasePromptFragment {
    return adaptCoderPrompt(getCoderPromptTemplateEditNext(), OPEN_CODER_EDIT_NEXT_TEMPLATE_ID, OPEN_CODER_EDIT_TEMPLATE_ID);
}
