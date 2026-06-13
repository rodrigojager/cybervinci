import { CommonMenus, FrontendApplicationContribution, StatusBar, StatusBarAlignment } from '@theia/core/lib/browser';
import { ThemeService } from '@theia/core/lib/browser/theming';
import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core/lib/common';
import { Disposable, DisposableCollection } from '@theia/core/lib/common/disposable';
import { inject, injectable } from '@theia/core/shared/inversify';
import { MonacoThemeRegistry } from '@theia/monaco/lib/browser/textmate/monaco-theme-registry';
import { CYBERVINCI_THEME_BODY_CLASS, CYBERVINCI_THEME_CLASS_NAMES, CYBERVINCI_THEME_IDS, CYBERVINCI_THEME_INFOS, CYBERVINCI_THEMES, CyberVinciThemeInfo } from './cybervinci-themes';

export namespace CyberVinciThemeCommands {
    export const SELECT: Command = {
        id: 'cybervinci.themes.select',
        category: 'CyberVinci',
        label: 'CyberVinci Themes...'
    };
}

@injectable()
export class CyberVinciThemeContribution implements FrontendApplicationContribution, CommandContribution, MenuContribution {

    protected static readonly STATUS_BAR_ID = 'cybervinci-theme-selector';
    protected static readonly STATUS_BAR_DOM_ID = `status-bar-${CyberVinciThemeContribution.STATUS_BAR_ID}`;

    @inject(MonacoThemeRegistry)
    protected readonly monacoThemeRegistry: MonacoThemeRegistry;

    @inject(ThemeService)
    protected readonly themeService: ThemeService;

    @inject(StatusBar)
    protected readonly statusBar: StatusBar;

    protected readonly toDispose = new DisposableCollection();
    protected readonly selectorDisposables = new DisposableCollection();
    protected selectorNode: HTMLElement | undefined;
    protected selectorAnchor: HTMLElement | undefined;
    protected selectorResetTo: string | undefined;
    protected selectorActiveId: string | undefined;

    onStart(): void {
        for (const theme of CYBERVINCI_THEMES) {
            const id = theme.id ?? theme.label;
            const data = this.monacoThemeRegistry.register(theme.json, theme.includes, id, theme.uiTheme);
            this.toDispose.push(this.themeService.register({
                id,
                type: 'dark',
                label: theme.label,
                description: theme.description,
                editorTheme: data.name!
            }));
        }

        this.syncBodyThemeClass();
        this.updateStatusBarItem();
        this.toDispose.push(this.themeService.onDidColorThemeChange(() => {
            this.syncBodyThemeClass();
            this.updateStatusBarItem();
        }));
    }

    onStop(): void {
        this.closeThemeSelector(false);
        this.selectorDisposables.dispose();
        this.toDispose.dispose();
        this.clearBodyThemeClass();
        this.statusBar.removeElement(CyberVinciThemeContribution.STATUS_BAR_ID);
    }

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(CyberVinciThemeCommands.SELECT, {
            execute: () => this.toggleThemeSelector(this.getStatusBarElement())
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.FILE_SETTINGS_SUBMENU_THEME, {
            commandId: CyberVinciThemeCommands.SELECT.id,
            label: CyberVinciThemeCommands.SELECT.label,
            order: '0_cybervinci'
        });
        menus.registerMenuAction(CommonMenus.MANAGE_SETTINGS_THEMES, {
            commandId: CyberVinciThemeCommands.SELECT.id,
            label: CyberVinciThemeCommands.SELECT.label,
            order: '0_cybervinci'
        });
        menus.registerMenuAction(CommonMenus.VIEW_APPEARANCE_SUBMENU, {
            commandId: CyberVinciThemeCommands.SELECT.id,
            label: CyberVinciThemeCommands.SELECT.label,
            order: '0_cybervinci'
        });
    }

    protected async updateStatusBarItem(): Promise<void> {
        const info = this.getCurrentCyberVinciThemeInfo();
        await this.statusBar.setElement(CyberVinciThemeContribution.STATUS_BAR_ID, {
            name: 'CyberVinci Theme',
            text: info ? `$(symbol-color) ${info.shortLabel}` : '$(symbol-color) CyberVinci Themes',
            alignment: StatusBarAlignment.RIGHT,
            priority: 99,
            tooltip: 'Select CyberVinci Theme',
            onclick: event => {
                event.stopPropagation();
                this.toggleThemeSelector(event.currentTarget as HTMLElement);
            }
        });
    }

    protected toggleThemeSelector(anchor = this.getStatusBarElement()): void {
        if (this.selectorNode) {
            this.closeThemeSelector(true);
            return;
        }
        this.openThemeSelector(anchor);
    }

    protected openThemeSelector(anchor?: HTMLElement): void {
        this.closeThemeSelector(false);
        this.selectorAnchor = anchor;
        this.selectorResetTo = this.themeService.getCurrentTheme().id;
        this.selectorActiveId = this.selectorResetTo;

        const node = document.createElement('div');
        node.className = 'cybervinci-theme-dropdown';
        node.tabIndex = -1;
        node.setAttribute('role', 'listbox');
        node.setAttribute('aria-label', 'CyberVinci Themes');
        node.addEventListener('keydown', event => this.handleSelectorKeydown(event));

        this.renderSelectorItems(node);
        document.body.appendChild(node);
        this.selectorNode = node;
        this.positionThemeSelector();
        this.installSelectorListeners();
        this.focusActiveTheme();
    }

    protected renderSelectorItems(container: HTMLElement): void {
        container.textContent = '';
        let currentFamily = '';

        for (const theme of CYBERVINCI_THEME_INFOS) {
            if (theme.family !== currentFamily) {
                currentFamily = theme.family;
                const group = document.createElement('div');
                group.className = 'cybervinci-theme-dropdown__group';
                group.textContent = currentFamily;
                container.appendChild(group);
            }

            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'cybervinci-theme-dropdown__item';
            item.dataset.themeId = theme.id;
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', String(this.themeService.getCurrentTheme().id === theme.id));

            const marker = document.createElement('span');
            marker.className = 'cybervinci-theme-dropdown__marker codicon codicon-check';
            marker.setAttribute('aria-hidden', 'true');

            const label = document.createElement('span');
            label.className = 'cybervinci-theme-dropdown__label';
            label.textContent = theme.shortLabel;

            item.append(marker, label);
            item.addEventListener('mouseenter', () => this.previewTheme(theme.id));
            item.addEventListener('focus', () => this.previewTheme(theme.id));
            item.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                this.selectTheme(theme.id);
            });
            container.appendChild(item);
        }
    }

    protected installSelectorListeners(): void {
        this.selectorDisposables.dispose();
        const disposables = [
            this.addDocumentListener('mousedown', event => this.closeSelectorOnOutsideClick(event), true),
            this.addDocumentListener('focusin', event => this.closeSelectorOnOutsideFocus(event), true),
            this.addWindowListener('resize', () => this.positionThemeSelector()),
            this.addWindowListener('scroll', () => this.positionThemeSelector(), true)
        ];
        for (const disposable of disposables) {
            this.selectorDisposables.push(disposable);
        }
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
        this.closeThemeSelector(true);
    }

    protected closeSelectorOnOutsideFocus(event: FocusEvent): void {
        const target = event.target as Node | null;
        if (target && (this.selectorNode?.contains(target) || this.selectorAnchor?.contains(target))) {
            return;
        }
        this.closeThemeSelector(true);
    }

    protected handleSelectorKeydown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            event.preventDefault();
            this.closeThemeSelector(true);
            this.selectorAnchor?.focus();
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const activeId = this.getFocusedThemeId() ?? this.selectorActiveId;
            if (activeId) {
                this.selectTheme(activeId);
            }
            return;
        }

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            this.focusRelativeTheme(event.key === 'ArrowDown' ? 1 : -1);
        }
    }

    protected selectTheme(themeId: string): void {
        this.selectorResetTo = undefined;
        this.themeService.setCurrentTheme(themeId, true);
        this.closeThemeSelector(false);
        this.selectorAnchor?.focus();
    }

    protected previewTheme(themeId: string): void {
        this.selectorActiveId = themeId;
        this.themeService.setCurrentTheme(themeId, false);
        this.updateSelectorState();
    }

    protected closeThemeSelector(revert: boolean): void {
        if (revert && this.selectorResetTo) {
            this.themeService.setCurrentTheme(this.selectorResetTo, false);
        }
        this.selectorDisposables.dispose();
        this.selectorNode?.remove();
        this.selectorNode = undefined;
        this.selectorAnchor = undefined;
        this.selectorResetTo = undefined;
        this.selectorActiveId = undefined;
    }

    protected positionThemeSelector(): void {
        const node = this.selectorNode;
        if (!node) {
            return;
        }

        const anchor = this.selectorAnchor ?? this.getStatusBarElement();
        const anchorRect = anchor?.getBoundingClientRect();
        const width = 260;
        const margin = 8;
        const right = anchorRect ? window.innerWidth - anchorRect.right : margin;
        const bottom = anchorRect ? window.innerHeight - anchorRect.top + 4 : 30;
        const maxHeight = Math.min(360, window.innerHeight - bottom - margin);

        node.style.width = `${width}px`;
        node.style.right = `${Math.max(margin, right)}px`;
        node.style.bottom = `${Math.max(margin, bottom)}px`;
        node.style.maxHeight = `${Math.max(180, maxHeight)}px`;
    }

    protected focusActiveTheme(): void {
        const activeId = this.selectorActiveId;
        const activeButton = activeId && this.selectorNode?.querySelector<HTMLButtonElement>(`[data-theme-id="${activeId}"]`);
        const fallbackButton = this.selectorNode?.querySelector<HTMLButtonElement>('.cybervinci-theme-dropdown__item');
        (activeButton || fallbackButton || this.selectorNode)?.focus();
    }

    protected focusRelativeTheme(offset: number): void {
        const buttons = Array.from(this.selectorNode?.querySelectorAll<HTMLButtonElement>('.cybervinci-theme-dropdown__item') ?? []);
        if (!buttons.length) {
            return;
        }
        const focused = document.activeElement instanceof HTMLButtonElement ? document.activeElement : undefined;
        const focusedIndex = focused ? buttons.indexOf(focused) : -1;
        const activeIndex = buttons.findIndex(button => button.dataset.themeId === this.selectorActiveId);
        const currentIndex = focusedIndex >= 0 ? focusedIndex : activeIndex;
        const nextIndex = (currentIndex + offset + buttons.length) % buttons.length;
        buttons[nextIndex].focus();
    }

    protected getFocusedThemeId(): string | undefined {
        const active = document.activeElement;
        if (active instanceof HTMLElement && this.selectorNode?.contains(active)) {
            return active.dataset.themeId;
        }
    }

    protected updateSelectorState(): void {
        const currentThemeId = this.themeService.getCurrentTheme().id;
        for (const item of Array.from(this.selectorNode?.querySelectorAll<HTMLButtonElement>('.cybervinci-theme-dropdown__item') ?? [])) {
            const isCurrent = item.dataset.themeId === currentThemeId;
            const isActive = item.dataset.themeId === this.selectorActiveId;
            item.classList.toggle('cybervinci-theme-dropdown__item--current', isCurrent);
            item.classList.toggle('cybervinci-theme-dropdown__item--active', isActive);
            item.setAttribute('aria-selected', String(isActive));
        }
    }

    protected getCurrentCyberVinciThemeInfo(): CyberVinciThemeInfo | undefined {
        const currentThemeId = this.themeService.getCurrentTheme().id;
        return CYBERVINCI_THEME_INFOS.find(theme => theme.id === currentThemeId);
    }

    protected syncBodyThemeClass(): void {
        const currentThemeId = this.themeService.getCurrentTheme().id;
        const active = CYBERVINCI_THEME_IDS.includes(currentThemeId);

        this.clearBodyThemeClass();
        if (active) {
            document.body.classList.add(CYBERVINCI_THEME_BODY_CLASS, `cybervinci-theme-${currentThemeId.replace(/^cybervinci-/, '')}`);
        }
    }

    protected clearBodyThemeClass(): void {
        document.body.classList.remove(CYBERVINCI_THEME_BODY_CLASS, ...CYBERVINCI_THEME_CLASS_NAMES);
    }

    protected getStatusBarElement(): HTMLElement | undefined {
        return document.getElementById(CyberVinciThemeContribution.STATUS_BAR_DOM_ID) ?? undefined;
    }
}
