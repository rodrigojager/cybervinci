// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { AbstractDialog } from '@theia/core/lib/browser/dialogs';
import { nls } from '@theia/core/lib/common/nls';
import { Message } from '@theia/core/shared/@lumino/messaging';

export interface CyberVinciChatGoalDialogOptions {
    readonly title?: string;
    readonly initialValue?: string;
    readonly acceptLabel?: string;
}

export class CyberVinciChatGoalDialog extends AbstractDialog<string> {

    protected readonly textarea: HTMLTextAreaElement;

    constructor(options: CyberVinciChatGoalDialogOptions = {}) {
        super({
            title: options.title ?? nls.localize('theia/cybervinci/ai-chat/goal/dialogTitle', 'Set Virtual Goal'),
            maxWidth: 560
        });
        this.node.classList.add('cybervinci-goal-dialog');
        const container = document.createElement('div');
        container.classList.add('cybervinci-goal-dialog__body');

        const label = document.createElement('label');
        label.classList.add('cybervinci-goal-dialog__label');
        label.textContent = nls.localize('theia/cybervinci/ai-chat/goal/dialogLabel', 'Objective');

        this.textarea = document.createElement('textarea');
        this.textarea.classList.add('cybervinci-goal-dialog__textarea');
        this.textarea.value = options.initialValue ?? '';
        this.textarea.placeholder = nls.localize('theia/cybervinci/ai-chat/goal/dialogPlaceholder', 'Describe the outcome CyberVinci should keep pursuing.');
        this.textarea.maxLength = 4000;
        this.textarea.addEventListener('input', () => this.update());

        label.appendChild(this.textarea);
        container.appendChild(label);
        this.contentNode.appendChild(container);

        this.appendCloseButton(nls.localizeByDefault('Cancel'));
        this.appendAcceptButton(options.acceptLabel ?? nls.localizeByDefault('Save'));
    }

    override get value(): string {
        return this.textarea.value.trim();
    }

    protected override onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        window.setTimeout(() => {
            this.textarea.focus();
            this.textarea.select();
        }, 0);
    }

    protected override isValid(value: string): string {
        if (!value.trim()) {
            return nls.localize('theia/cybervinci/ai-chat/goal/emptyObjective', 'Enter a goal objective.');
        }
        return '';
    }
}
