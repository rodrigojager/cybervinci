// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { FrontendApplicationContribution, LabelProvider, StatusBar, StatusBarAlignment } from '@theia/core/lib/browser';
import { Command, CommandContribution, CommandRegistry, MessageService } from '@theia/core/lib/common';
import { Disposable, DisposableCollection } from '@theia/core/lib/common/disposable';
import { FileUri } from '@theia/core/lib/common/file-uri';
import URI from '@theia/core/lib/common/uri';
import { FileStat } from '@theia/filesystem/lib/common/files';
import { inject, injectable } from '@theia/core/shared/inversify';
import { CyberVinciAiChatWorkdirService } from './cybervinci-ai-chat-workdir-service';

export namespace CyberVinciAiChatWorkdirCommands {
    export const SELECT: Command = {
        id: 'cybervinci.aiChat.workdir.select',
        category: 'CyberVinci',
        label: 'Select AI Workdir'
    };
}

@injectable()
export class CyberVinciAiChatWorkdirContribution implements FrontendApplicationContribution, CommandContribution {

    protected static readonly STATUS_BAR_ID = 'cybervinci-ai-chat-workdir';
    protected static readonly STATUS_BAR_DOM_ID = `status-bar-${CyberVinciAiChatWorkdirContribution.STATUS_BAR_ID}`;

    @inject(StatusBar)
    protected readonly statusBar: StatusBar;

    @inject(LabelProvider)
    protected readonly labelProvider: LabelProvider;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(CyberVinciAiChatWorkdirService)
    protected readonly workdirService: CyberVinciAiChatWorkdirService;

    protected readonly toDispose = new DisposableCollection();
    protected readonly selectorDisposables = new DisposableCollection();
    protected selectorNode: HTMLElement | undefined;
    protected selectorAnchor: HTMLElement | undefined;
    protected selectorBrowseUri: URI | undefined;
    protected renderSequence = 0;

    onStart(): void {
        this.updateStatusBarItem();
        this.toDispose.push(this.workdirService.onDidChangeWorkdir(() => this.updateStatusBarItem()));
    }

    onStop(): void {
        this.closeSelector();
        this.selectorDisposables.dispose();
        this.toDispose.dispose();
        this.statusBar.removeElement(CyberVinciAiChatWorkdirContribution.STATUS_BAR_ID);
    }

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(CyberVinciAiChatWorkdirCommands.SELECT, {
            execute: () => this.toggleSelector(this.getStatusBarElement())
        });
    }

    protected async updateStatusBarItem(): Promise<void> {
        const uri = this.workdirService.getEffectiveWorkdirUri();
        const path = uri ? FileUri.fsPath(uri) : undefined;
        const label = uri ? this.toStatusLabel(uri) : 'No Workdir';
        await this.statusBar.setElement(CyberVinciAiChatWorkdirContribution.STATUS_BAR_ID, {
            name: 'CyberVinci AI Workdir',
            text: `$(root-folder) ${label}`,
            alignment: StatusBarAlignment.RIGHT,
            priority: 98,
            tooltip: path ? `AI workdir: ${path}` : 'Select AI workdir',
            onclick: event => {
                event.stopPropagation();
                this.toggleSelector(event.currentTarget as HTMLElement);
            }
        });
    }

    protected toStatusLabel(uri: URI): string {
        return this.labelProvider.getName(uri) || uri.path.base || FileUri.fsPath(uri);
    }

    protected toggleSelector(anchor = this.getStatusBarElement()): void {
        if (this.selectorNode) {
            this.closeSelector();
            return;
        }
        this.openSelector(anchor);
    }

    protected openSelector(anchor?: HTMLElement): void {
        this.closeSelector();
        this.selectorAnchor = anchor;
        this.selectorBrowseUri = this.workdirService.getEffectiveWorkdirUri();

        const node = document.createElement('div');
        node.className = 'cybervinci-workdir-dropdown';
        node.tabIndex = -1;
        node.setAttribute('role', 'dialog');
        node.setAttribute('aria-label', 'CyberVinci AI Workdir');
        node.addEventListener('keydown', event => this.handleSelectorKeydown(event));

        document.body.appendChild(node);
        this.selectorNode = node;
        this.positionSelector();
        this.installSelectorListeners();
        void this.renderSelector();
        node.focus();
    }

    protected async renderSelector(): Promise<void> {
        const node = this.selectorNode;
        const uri = this.selectorBrowseUri;
        if (!node) {
            return;
        }
        const sequence = ++this.renderSequence;
        node.textContent = '';

        if (!uri) {
            node.appendChild(this.createMessage('No workspace is open. Open a folder before selecting an AI workdir.'));
            return;
        }

        node.appendChild(this.createHeader(uri));
        const list = document.createElement('div');
        list.className = 'cybervinci-workdir-dropdown__list';
        list.appendChild(this.createMessage('Loading directories...'));
        node.appendChild(list);

        try {
            const [currentStat, directories] = await Promise.all([
                this.workdirService.ensureDirectory(uri),
                this.workdirService.listChildDirectories(uri)
            ]);
            if (sequence !== this.renderSequence || !this.selectorNode) {
                return;
            }
            list.textContent = '';
            this.appendNavigationItems(list, currentStat);
            if (directories.length) {
                for (const directory of directories) {
                    list.appendChild(this.createDirectoryItem(directory));
                }
            } else {
                list.appendChild(this.createMessage('No child directories.'));
            }
            this.positionSelector();
        } catch (error) {
            if (sequence !== this.renderSequence || !this.selectorNode) {
                return;
            }
            list.textContent = '';
            list.appendChild(this.createMessage(this.toErrorMessage(error), 'error'));
        }
    }

    protected createHeader(uri: URI): HTMLElement {
        const header = document.createElement('div');
        header.className = 'cybervinci-workdir-dropdown__header';

        const titleRow = document.createElement('div');
        titleRow.className = 'cybervinci-workdir-dropdown__title-row';

        const title = document.createElement('strong');
        title.textContent = this.toStatusLabel(uri);

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'cybervinci-workdir-dropdown__icon-button codicon codicon-close';
        closeButton.title = 'Close';
        closeButton.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            this.closeSelector();
        });

        titleRow.append(title, closeButton);

        const path = document.createElement('code');
        path.textContent = FileUri.fsPath(uri);

        const actions = document.createElement('div');
        actions.className = 'cybervinci-workdir-dropdown__actions';

        const apply = document.createElement('button');
        apply.type = 'button';
        apply.className = 'cybervinci-workdir-dropdown__primary';
        apply.textContent = 'Use this directory';
        apply.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            void this.applyWorkdir(uri);
        });
        actions.appendChild(apply);

        const workspaceRoot = this.workdirService.getWorkspaceRootUri();
        if (workspaceRoot && !this.isSameUri(workspaceRoot, uri)) {
            const root = document.createElement('button');
            root.type = 'button';
            root.textContent = 'Go to workspace root';
            root.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                this.navigateTo(workspaceRoot);
            });
            actions.appendChild(root);
        }

        header.append(titleRow, path, actions);
        return header;
    }

    protected appendNavigationItems(list: HTMLElement, current: FileStat): void {
        const parent = current.resource.parent;
        if (!this.isSameUri(parent, current.resource)) {
            list.appendChild(this.createNavigationItem(parent, '..', 'Parent directory', 'arrow-up'));
        }
    }

    protected createDirectoryItem(directory: FileStat): HTMLButtonElement {
        return this.createNavigationItem(
            directory.resource,
            this.labelProvider.getName(directory.resource) || directory.resource.path.base,
            '',
            'folder'
        );
    }

    protected createNavigationItem(uri: URI, label: string, detail: string | undefined, icon: string): HTMLButtonElement {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'cybervinci-workdir-dropdown__item';

        const iconNode = document.createElement('span');
        iconNode.className = `cybervinci-workdir-dropdown__item-icon codicon codicon-${icon}`;
        iconNode.setAttribute('aria-hidden', 'true');

        const text = document.createElement('span');
        text.className = 'cybervinci-workdir-dropdown__item-text';

        const labelNode = document.createElement('span');
        labelNode.className = 'cybervinci-workdir-dropdown__item-label';
        labelNode.textContent = label;

        text.appendChild(labelNode);
        if (detail?.trim()) {
            const detailNode = document.createElement('span');
            detailNode.className = 'cybervinci-workdir-dropdown__item-detail';
            detailNode.textContent = detail.trim();
            text.appendChild(detailNode);
        } else {
            item.classList.add('cybervinci-workdir-dropdown__item--single-line');
        }
        item.append(iconNode, text);
        item.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            this.navigateTo(uri);
        });
        return item;
    }

    protected createMessage(message: string, severity: 'info' | 'error' = 'info'): HTMLElement {
        const node = document.createElement('div');
        node.className = `cybervinci-workdir-dropdown__message cybervinci-workdir-dropdown__message--${severity}`;
        node.textContent = message;
        return node;
    }

    protected navigateTo(uri: URI): void {
        this.selectorBrowseUri = uri;
        void this.renderSelector();
    }

    protected async applyWorkdir(uri: URI): Promise<void> {
        this.closeSelector();
        try {
            await this.workdirService.setWorkdir(uri, { updateWorkspace: true });
        } catch (error) {
            this.messageService.error(`Could not set AI workdir: ${this.toErrorMessage(error)}`);
        }
    }

    protected installSelectorListeners(): void {
        this.selectorDisposables.dispose();
        this.selectorDisposables.pushAll([
            this.addDocumentListener('mousedown', event => this.closeSelectorOnOutsideClick(event), true),
            this.addDocumentListener('focusin', event => this.closeSelectorOnOutsideFocus(event), true),
            this.addWindowListener('resize', () => this.positionSelector()),
            this.addWindowListener('scroll', () => this.positionSelector(), true)
        ]);
    }

    protected addDocumentListener<K extends keyof DocumentEventMap>(type: K, listener: (event: DocumentEventMap[K]) => void, options?: boolean | AddEventListenerOptions): Disposable {
        document.addEventListener(type, listener, options);
        return Disposable.create(() => document.removeEventListener(type, listener, options));
    }

    protected addWindowListener<K extends keyof WindowEventMap>(type: K, listener: (event: WindowEventMap[K]) => void, options?: boolean | AddEventListenerOptions): Disposable {
        window.addEventListener(type, listener, options);
        return Disposable.create(() => window.removeEventListener(type, listener, options));
    }

    protected closeSelectorOnOutsideClick(event: MouseEvent): void {
        const target = event.target as Node | null;
        if (target && (this.selectorNode?.contains(target) || this.selectorAnchor?.contains(target))) {
            return;
        }
        this.closeSelector();
    }

    protected closeSelectorOnOutsideFocus(event: FocusEvent): void {
        const target = event.target as Node | null;
        if (target && (this.selectorNode?.contains(target) || this.selectorAnchor?.contains(target))) {
            return;
        }
        this.closeSelector();
    }

    protected handleSelectorKeydown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            event.preventDefault();
            this.closeSelector();
            this.selectorAnchor?.focus();
        }
    }

    protected positionSelector(): void {
        const node = this.selectorNode;
        if (!node) {
            return;
        }

        const anchor = this.selectorAnchor ?? this.getStatusBarElement();
        const anchorRect = anchor?.getBoundingClientRect();
        const width = 420;
        const margin = 8;
        const right = anchorRect ? window.innerWidth - anchorRect.right : margin;
        const bottom = anchorRect ? window.innerHeight - anchorRect.top + 4 : 30;
        const maxHeight = Math.min(420, window.innerHeight - bottom - margin);

        node.style.width = `${Math.min(width, window.innerWidth - (margin * 2))}px`;
        node.style.right = `${Math.max(margin, right)}px`;
        node.style.bottom = `${Math.max(margin, bottom)}px`;
        node.style.maxHeight = `${Math.max(180, maxHeight)}px`;
    }

    protected closeSelector(): void {
        this.selectorDisposables.dispose();
        this.selectorNode?.remove();
        this.selectorNode = undefined;
        this.selectorAnchor = undefined;
        this.selectorBrowseUri = undefined;
    }

    protected isSameUri(left: URI, right: URI): boolean {
        return left.toString() === right.toString();
    }

    protected toErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }

    protected getStatusBarElement(): HTMLElement | undefined {
        return document.getElementById(CyberVinciAiChatWorkdirContribution.STATUS_BAR_DOM_ID) ?? undefined;
    }
}
