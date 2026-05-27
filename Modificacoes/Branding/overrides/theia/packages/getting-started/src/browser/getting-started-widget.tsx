// *****************************************************************************
// Copyright (C) 2018 Ericsson and others.
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

import { codicon, CommonCommands, Key, KeyCode, LabelProvider, Message, ReactWidget } from '@theia/core/lib/browser';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
import { CommandRegistry, environment, isOSX, Path, PreferenceService } from '@theia/core/lib/common';
import { ApplicationInfo, ApplicationServer } from '@theia/core/lib/common/application-protocol';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { nls } from '@theia/core/lib/common/nls';
import URI from '@theia/core/lib/common/uri';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { KeymapsCommands } from '@theia/keymaps/lib/browser';
import { WorkspaceCommands, WorkspaceService } from '@theia/workspace/lib/browser';
import { CyberVinciCommandIds } from '@cybervinci/branding/lib/common';

/**
 * Default implementation of the `GettingStartedWidget`.
 * The widget is displayed when there are currently no workspaces present.
 * Some of the features displayed include:
 * - `open` commands.
 * - `recently used workspaces`.
 * - `settings` commands.
 * - `help` commands.
 * - helpful links.
 */
@injectable()
export class GettingStartedWidget extends ReactWidget {

    /**
     * The widget `id`.
     */
    static readonly ID = 'getting.started.widget';
    /**
     * The widget `label` which is used for display purposes.
     */
    static readonly LABEL = nls.localizeByDefault('Welcome');

    /**
     * The `ApplicationInfo` for the application if available.
     * Used in order to obtain the version number of the application.
     */
    protected applicationInfo: ApplicationInfo | undefined;
    /**
     * The application name which is used for display purposes.
     */
    protected applicationName = FrontendApplicationConfigProvider.get().applicationName;

    protected home: string | undefined;

    /**
     * The recently used workspaces limit.
     * Used in order to limit the number of recently used workspaces to display.
     */
    protected recentLimit = 5;
    /**
     * The list of recently used workspaces.
     */
    protected recentWorkspaces: string[] = [];

    /**
     * Indicates whether the "ai-core" extension is available.
     */
    protected aiIsIncluded: boolean;

    /**
     * Collection of useful links to display for end users.
     */
    @inject(ApplicationServer)
    protected readonly appServer: ApplicationServer;

    @inject(CommandRegistry)
    protected readonly commandRegistry: CommandRegistry;

    @inject(EnvVariablesServer)
    protected readonly environments: EnvVariablesServer;

    @inject(LabelProvider)
    protected readonly labelProvider: LabelProvider;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    @postConstruct()
    protected init(): void {
        this.doInit();
    }

    protected async doInit(): Promise<void> {
        this.id = GettingStartedWidget.ID;
        this.title.label = GettingStartedWidget.LABEL;
        this.title.caption = GettingStartedWidget.LABEL;
        this.title.closable = true;

        this.applicationInfo = await this.appServer.getApplicationInfo();
        this.recentWorkspaces = await this.workspaceService.recentWorkspaces();
        this.home = new URI(await this.environments.getHomeDirUri()).path.toString();

        const extensions = await this.appServer.getExtensionsInfos();
        this.aiIsIncluded = extensions.find(ext => ext.name === '@theia/ai-core') !== undefined;
        this.update();
    }

    protected override onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        const elArr = this.node.getElementsByTagName('a');
        if (elArr && elArr.length > 0) {
            (elArr[0] as HTMLElement).focus();
        }
    }

    /**
     * Render the content of the widget.
     */
    protected render(): React.ReactNode {
        return <div className='gs-container'>
            <div className='gs-content-container'>
                {this.renderHeader()}
                <hr className='gs-hr' />
                {this.aiIsIncluded &&
                    <div className='flex-grid'>
                        <div className='col'>
                            {this.renderNews()}
                        </div>
                    </div>
                }
                <div className='flex-grid'>
                    <div className='col'>
                        {this.renderStart()}
                    </div>
                </div>
                <div className='flex-grid'>
                    <div className='col'>
                        {this.renderRecentWorkspaces()}
                    </div>
                </div>
                <div className='flex-grid'>
                    <div className='col'>
                        {this.renderSettings()}
                    </div>
                </div>
                <div className='flex-grid'>
                    <div className='col'>
                        {this.renderHelp()}
                    </div>
                </div>
                <div className='flex-grid'>
                    <div className='col'>
                        {this.renderVersion()}
                    </div>
                </div>
            </div>
            <div className='gs-preference-container'>
                {this.renderPreferences()}
            </div>
        </div>;
    }

    /**
     * Render the widget header.
     * Renders the title `{applicationName} Getting Started`.
     */
    protected renderHeader(): React.ReactNode {
        return <div className='gs-header cybervinci-welcome-hero'>
            <div className='cybervinci-welcome-art' aria-hidden='true' />
            <div className='cybervinci-welcome-copy'>
                <h1>{this.applicationName}</h1>
                <p className='cybervinci-welcome-lead'>
                    {nls.localize('theia/getting-started/cyberVinci/lead',
                        'An AI-first agentic IDE for professional work.')}
                </p>
                <p className='cybervinci-welcome-body'>
                    {nls.localize('theia/getting-started/cyberVinci/body',
                        'Coordinate multiple artificial intelligence agents as a professional agency inside your development environment, from exploration and planning to implementation, review, and delivery.')}
                </p>
            </div>
        </div>;
    }

    /**
     * Render the `Start` section.
     * Displays a collection of "start-to-work" related commands like `open` commands and some other.
     */
    protected renderStart(): React.ReactNode {
        const requireSingleOpen = isOSX || !environment.electron.is();

        const createFile = <div className='gs-action-container'>
            <a
                role={'button'}
                tabIndex={0}
                onClick={this.doCreateFile}
                onKeyDown={this.doCreateFileEnter}>
                {nls.localizeByDefault('New File...')}
            </a>
        </div>;

        const open = requireSingleOpen && <div className='gs-action-container'>
            <a
                role={'button'}
                tabIndex={0}
                onClick={this.doOpen}
                onKeyDown={this.doOpenEnter}>
                {nls.localizeByDefault('Open')}
            </a>
        </div>;

        const openFile = !requireSingleOpen && <div className='gs-action-container'>
            <a
                role={'button'}
                tabIndex={0}
                onClick={this.doOpenFile}
                onKeyDown={this.doOpenFileEnter}>
                {nls.localizeByDefault('Open File')}
            </a>
        </div>;

        const openFolder = !requireSingleOpen && <div className='gs-action-container'>
            <a
                role={'button'}
                tabIndex={0}
                onClick={this.doOpenFolder}
                onKeyDown={this.doOpenFolderEnter}>
                {nls.localizeByDefault('Open Folder')}
            </a>
        </div>;

        const openWorkspace = (
            <a
                role={'button'}
                tabIndex={0}
                onClick={this.doOpenWorkspace}
                onKeyDown={this.doOpenWorkspaceEnter}>
                {nls.localizeByDefault('Open Workspace')}
            </a>
        );

        return <div className='gs-section'>
            <h3 className='gs-section-header'><i className={codicon('folder-opened')}></i>{nls.localizeByDefault('Start')}</h3>
            {createFile}
            {open}
            {openFile}
            {openFolder}
            {openWorkspace}
        </div>;
    }

    /**
     * Render the recently used workspaces section.
     */
    protected renderRecentWorkspaces(): React.ReactNode {
        const items = this.recentWorkspaces;
        const paths = this.buildPaths(items);
        const content = paths.slice(0, this.recentLimit).map((item, index) =>
            <div className='gs-action-container' key={index}>
                <a
                    role={'button'}
                    tabIndex={0}
                    onClick={() => this.open(new URI(items[index]))}
                    onKeyDown={(e: React.KeyboardEvent) => this.openEnter(e, new URI(items[index]))}>
                    {this.labelProvider.getName(new URI(items[index]))}
                </a>
                <span className='gs-action-details'>
                    {item}
                </span>
            </div>
        );
        // If the recently used workspaces list exceeds the limit, display `More...` which triggers the recently used workspaces quick-open menu upon selection.
        const more = paths.length > this.recentLimit && <div className='gs-action-container'>
            <a
                role={'button'}
                tabIndex={0}
                onClick={this.doOpenRecentWorkspace}
                onKeyDown={this.doOpenRecentWorkspaceEnter}>
                {nls.localizeByDefault('More...')}
            </a>
        </div>;
        return <div className='gs-section'>
            <h3 className='gs-section-header'>
                <i className={codicon('history')}></i>{nls.localizeByDefault('Recent')}
            </h3>
            {items.length > 0 ? content : <p className='gs-no-recent'>
                {nls.localizeByDefault('You have no recent folders,') + ' '}
                <a
                    role={'button'}
                    tabIndex={0}
                    onClick={this.doOpenFolder}
                    onKeyDown={this.doOpenFolderEnter}>
                    {nls.localizeByDefault('open a folder')}
                </a>
                {' ' + nls.localizeByDefault('to start.')}
            </p>}
            {more}
        </div>;
    }

    /**
     * Render the settings section.
     * Generally used to display useful links.
     */
    protected renderSettings(): React.ReactNode {
        return <div className='gs-section'>
            <h3 className='gs-section-header'>
                <i className={codicon('settings-gear')}></i>
                {nls.localizeByDefault('Settings')}
            </h3>
            <div className='gs-action-container'>
                <a
                    role={'button'}
                    tabIndex={0}
                    onClick={this.doOpenPreferences}
                    onKeyDown={this.doOpenPreferencesEnter}>
                    {nls.localizeByDefault('Open Settings')}
                </a>
            </div>
            <div className='gs-action-container'>
                <a
                    role={'button'}
                    tabIndex={0}
                    onClick={this.doOpenKeyboardShortcuts}
                    onKeyDown={this.doOpenKeyboardShortcutsEnter}>
                    {nls.localizeByDefault('Open Keyboard Shortcuts')}
                </a>
            </div>
        </div>;
    }

    /**
     * Render the help section.
     */
    protected renderHelp(): React.ReactNode {
        return <div className='gs-section'>
            <h3 className='gs-section-header'>
                <i className={codicon('question')}></i>
                {nls.localizeByDefault('Help')}
            </h3>
            <div className='gs-action-container'>
                <a
                    role={'button'}
                    tabIndex={0}
                    onClick={() => this.doOpenAIChatView()}
                    onKeyDown={(e: React.KeyboardEvent) => this.doOpenAIChatViewEnter(e)}>
                    {nls.localize('theia/getting-started/cyberVinci/openAgencyChat', 'Open AI Agency Chat')}
                </a>
            </div>
            <div className='gs-action-container'>
                <a
                    role={'button'}
                    tabIndex={0}
                    onClick={this.doOpenPreferences}
                    onKeyDown={this.doOpenPreferencesEnter}>
                    {nls.localizeByDefault('Open Settings')}
                </a>
            </div>
            <div className='gs-action-container'>
                <a
                    role={'button'}
                    tabIndex={0}
                    onClick={this.doOpenKeyboardShortcuts}
                    onKeyDown={this.doOpenKeyboardShortcutsEnter}>
                    {nls.localizeByDefault('Open Keyboard Shortcuts')}
                </a>
            </div>
        </div>;
    }

    /**
     * Render the version section.
     */
    protected renderVersion(): React.ReactNode {
        return <div className='gs-section'>
            <div className='gs-action-container'>
                <p className='gs-sub-header' >
                    {this.applicationInfo ? nls.localizeByDefault('Version: {0}', this.applicationInfo.version) : ''}
                </p>
            </div>
        </div>;
    }

    protected renderPreferences(): React.ReactNode {
        return <WelcomePreferences preferenceService={this.preferenceService}></WelcomePreferences>;
    }

    protected renderNews(): React.ReactNode {
        return <div className='gs-section'>
            <h3 className='gs-section-header'>
                <i className={codicon('sparkle')}></i>
                {nls.localize('theia/getting-started/cyberVinci/agencyHeader', 'AI Agency Workspace')}
            </h3>
            <p className='gs-no-recent'>
                {nls.localize('theia/getting-started/cyberVinci/agencySummary',
                    'Use specialized agents for coding, shell work, repository operations, tests, research, and review while keeping the whole workflow inside the IDE.')}
            </p>
            <div className='gs-action-container'>
                <a
                    role={'button'}
                    style={{ fontSize: 'var(--theia-ui-font-size2)' }}
                    tabIndex={0}
                    onClick={() => this.doOpenAIChatView()}
                    onKeyDown={(e: React.KeyboardEvent) => this.doOpenAIChatViewEnter(e)}>
                    {nls.localize('theia/getting-started/cyberVinci/openAIChatView', 'Open CyberVinci Chat')}
                </a>
            </div>
            <div className='gs-action-container'>
                <a
                    role={'button'}
                    tabIndex={0}
                    onClick={() => this.doOpenArena()}
                    onKeyDown={(e: React.KeyboardEvent) => this.doOpenArenaEnter(e)}>
                    {nls.localize('theia/getting-started/cyberVinci/openArena', 'New Arena A/B Test')}
                </a>
            </div>
            <div className='gs-action-container'>
                <a
                    role={'button'}
                    tabIndex={0}
                    onClick={() => this.doOpenLibrary()}
                    onKeyDown={(e: React.KeyboardEvent) => this.doOpenLibraryEnter(e)}>
                    {nls.localize('theia/getting-started/cyberVinci/openLibrary', 'Open Documentation Manager')}
                </a>
            </div>
        </div>;
    }

    protected renderAIBanner(): React.ReactNode {
        return <div className='gs-container gs-aifeature-container'>
            <div className='flex-grid'>
                <div className='col'>
                    <h3 className='gs-section-header'>
                        <i className={codicon('hubot')}></i>
                        {nls.localize('theia/getting-started/cyberVinci/firstHeader', 'Agentic development starts here')}
                    </h3>
                    <p className='gs-action-container'>
                        {nls.localize('theia/getting-started/cyberVinci/features',
                            'CyberVinci is designed around AI as a first-class development surface: one primary chat, multiple providers, tool execution, reviewable changes, and orchestration for teams of specialized agents.')}
                    </p>
                    <div className='gs-action-container'>
                        <a
                            role={'button'}
                            style={{ fontSize: 'var(--theia-ui-font-size2)' }}
                            tabIndex={0}
                            onClick={() => this.doOpenAIChatView()}
                            onKeyDown={(e: React.KeyboardEvent) => this.doOpenAIChatViewEnter(e)}>
                            {nls.localize('theia/getting-started/cyberVinci/openAIChatView', 'Open CyberVinci Chat')}
                        </a>
                    </div>
                </div>
            </div>
        </div>;
    }

    protected doOpenAIChatView = () => this.commandRegistry.executeCommand(CyberVinciCommandIds.OPEN_CHAT);
    protected doOpenAIChatViewEnter = (e: React.KeyboardEvent) => {
        if (this.isEnterKey(e)) {
            this.doOpenAIChatView();
        }
    };

    protected doOpenArena = () => this.commandRegistry.executeCommand(CyberVinciCommandIds.ARENA_NEW_DUEL);
    protected doOpenArenaEnter = (e: React.KeyboardEvent) => {
        if (this.isEnterKey(e)) {
            this.doOpenArena();
        }
    };

    protected doOpenLibrary = () => this.commandRegistry.executeCommand(CyberVinciCommandIds.DOCUMENTATION_MANAGER);
    protected doOpenLibraryEnter = (e: React.KeyboardEvent) => {
        if (this.isEnterKey(e)) {
            this.doOpenLibrary();
        }
    };

    /**
     * Build the list of workspace paths.
     * @param workspaces {string[]} the list of workspaces.
     * @returns {string[]} the list of workspace paths.
     */
    protected buildPaths(workspaces: string[]): string[] {
        const paths: string[] = [];
        workspaces.forEach(workspace => {
            const uri = new URI(workspace);
            const pathLabel = this.labelProvider.getLongName(uri);
            const path = this.home ? Path.tildify(pathLabel, this.home) : pathLabel;
            paths.push(path);
        });
        return paths;
    }

    /**
     * Trigger the create file command.
     */
    protected doCreateFile = () => this.commandRegistry.executeCommand(CommonCommands.PICK_NEW_FILE.id);
    protected doCreateFileEnter = (e: React.KeyboardEvent) => {
        if (this.isEnterKey(e)) {
            this.doCreateFile();
        }
    };

    /**
     * Trigger the open command.
     */
    protected doOpen = () => this.commandRegistry.executeCommand(WorkspaceCommands.OPEN.id);
    protected doOpenEnter = (e: React.KeyboardEvent) => {
        if (this.isEnterKey(e)) {
            this.doOpen();
        }
    };

    /**
     * Trigger the open file command.
     */
    protected doOpenFile = () => this.commandRegistry.executeCommand(WorkspaceCommands.OPEN_FILE.id);
    protected doOpenFileEnter = (e: React.KeyboardEvent) => {
        if (this.isEnterKey(e)) {
            this.doOpenFile();
        }
    };

    /**
     * Trigger the open folder command.
     */
    protected doOpenFolder = () => this.commandRegistry.executeCommand(WorkspaceCommands.OPEN_FOLDER.id);
    protected doOpenFolderEnter = (e: React.KeyboardEvent) => {
        if (this.isEnterKey(e)) {
            this.doOpenFolder();
        }
    };

    /**
     * Trigger the open workspace command.
     */
    protected doOpenWorkspace = () => this.commandRegistry.executeCommand(WorkspaceCommands.OPEN_WORKSPACE.id);
    protected doOpenWorkspaceEnter = (e: React.KeyboardEvent) => {
        if (this.isEnterKey(e)) {
            this.doOpenWorkspace();
        }
    };

    /**
     * Trigger the open recent workspace command.
     */
    protected doOpenRecentWorkspace = () => this.commandRegistry.executeCommand(WorkspaceCommands.OPEN_RECENT_WORKSPACE.id);
    protected doOpenRecentWorkspaceEnter = (e: React.KeyboardEvent) => {
        if (this.isEnterKey(e)) {
            this.doOpenRecentWorkspace();
        }
    };

    /**
     * Trigger the open preferences command.
     * Used to open the preferences widget.
     */
    protected doOpenPreferences = () => this.commandRegistry.executeCommand(CommonCommands.OPEN_PREFERENCES.id);
    protected doOpenPreferencesEnter = (e: React.KeyboardEvent) => {
        if (this.isEnterKey(e)) {
            this.doOpenPreferences();
        }
    };

    /**
     * Trigger the open keyboard shortcuts command.
     * Used to open the keyboard shortcuts widget.
     */
    protected doOpenKeyboardShortcuts = () => this.commandRegistry.executeCommand(KeymapsCommands.OPEN_KEYMAPS.id);
    protected doOpenKeyboardShortcutsEnter = (e: React.KeyboardEvent) => {
        if (this.isEnterKey(e)) {
            this.doOpenKeyboardShortcuts();
        }
    };

    /**
     * Open a workspace given its uri.
     * @param uri {URI} the workspace uri.
     */
    protected open = (uri: URI) => this.workspaceService.open(uri);
    protected openEnter = (e: React.KeyboardEvent, uri: URI) => {
        if (this.isEnterKey(e)) {
            this.open(uri);
        }
    };

    protected isEnterKey(e: React.KeyboardEvent): boolean {
        return Key.ENTER.keyCode === KeyCode.createKeyCode(e.nativeEvent).key?.keyCode;
    }
}

export interface PreferencesProps {
    preferenceService: PreferenceService;
}

function WelcomePreferences(props: PreferencesProps): JSX.Element {
    const [startupEditor, setStartupEditor] = React.useState<string>(
        props.preferenceService.get('workbench.startupEditor', 'welcomePage')
    );
    React.useEffect(() => {
        const prefListener = props.preferenceService.onPreferenceChanged(change => {
            if (change.preferenceName === 'workbench.startupEditor') {
                const prefValue = props.preferenceService.get<string>('workbench.startupEditor', 'none');
                setStartupEditor(prefValue);
            }
        });
        return () => prefListener.dispose();
    }, [props.preferenceService]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.checked ? 'welcomePage' : 'none';
        props.preferenceService.updateValue('workbench.startupEditor', newValue);
    };
    return (
        <div className='gs-preference'>
            <input
                type="checkbox"
                className="theia-input"
                id="startupEditor"
                onChange={handleChange}
                checked={startupEditor === 'welcomePage' || startupEditor === 'welcomePageInEmptyWorkbench'}
            />
            <label htmlFor="startupEditor">
                {nls.localizeByDefault('Show welcome page on startup')}
            </label>
        </div>
    );
}
