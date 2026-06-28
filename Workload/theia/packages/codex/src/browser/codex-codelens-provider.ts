// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { inject, injectable } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { PreferenceService } from '@theia/core/lib/common/preferences';
import * as monaco from '@theia/monaco-editor-core';
import { CodexExtensionCommands } from '../common/codex-commands';
import { CodexExtensionPreferences } from '../common/codex-preferences';

const TODO_PATTERN = /\bTODO\b[:\s].+/i;

@injectable()
export class CodexCodeLensProvider implements monaco.languages.CodeLensProvider {

    @inject(PreferenceService)
    protected readonly preferences: PreferenceService;

    provideCodeLenses(model: monaco.editor.ITextModel): monaco.languages.ProviderResult<monaco.languages.CodeLensList> {
        if (!this.preferences.get<boolean>(CodexExtensionPreferences.COMMENT_CODE_LENS_ENABLED, true)) {
            return { lenses: [] };
        }
        const lenses: monaco.languages.CodeLens[] = [];
        for (let line = 1; line <= model.getLineCount(); line++) {
            const text = model.getLineContent(line);
            if (!TODO_PATTERN.test(text)) {
                continue;
            }
            lenses.push({
                range: new monaco.Range(line, 1, line, text.length + 1),
                id: String(line),
                command: {
                    id: CodexExtensionCommands.IMPLEMENT_TODO.id,
                    title: 'Implement with Codex',
                    arguments: [{ todoText: text.trim(), uri: model.uri.toString(), line }]
                }
            });
        }
        return { lenses };
    }
}

@injectable()
export class CodexCodeLensContribution implements FrontendApplicationContribution {

    @inject(CodexCodeLensProvider)
    protected readonly provider: CodexCodeLensProvider;

    onStart(): void {
        monaco.languages.registerCodeLensProvider({ pattern: '**' }, this.provider);
    }
}
