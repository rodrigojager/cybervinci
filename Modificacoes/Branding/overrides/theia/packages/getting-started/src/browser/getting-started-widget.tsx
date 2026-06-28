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
import { MessageService } from '@theia/core/lib/common/message-service';
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
    static readonly LABEL = nls.localize('theia/getting-started/cyberVinci/welcomeLabel', 'Boas-vindas');

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
    protected releasesUrl: string | undefined;

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

    @inject(MessageService)
    protected readonly messageService: MessageService;

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
        this.releasesUrl = await this.resolveReleasesUrl();

        const extensions = await this.appServer.getExtensionsInfos();
        this.aiIsIncluded = extensions.find(ext => ext.name === '@theia/ai-core') !== undefined;
        this.update();
    }

    protected async resolveReleasesUrl(): Promise<string | undefined> {
        const explicit = (await this.environments.getValue('CYBERVINCI_RELEASES_URL'))?.value?.trim();
        if (explicit) {
            return explicit;
        }
        const repository = (await this.environments.getValue('CYBERVINCI_RELEASE_REPOSITORY'))?.value?.trim();
        if (repository && /^[\w.-]+\/[\w.-]+$/.test(repository)) {
            return `https://github.com/${repository}/releases/latest`;
        }
        return undefined;
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
                <div className='flex-grid'>
                    <div className='col'>
                        {this.renderCyberVinciResources()}
                    </div>
                </div>
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
                        'Uma IDE agêntica AI-first para trabalho profissional.')}
                </p>
                <p className='cybervinci-welcome-body'>
                    {nls.localize('theia/getting-started/cyberVinci/body',
                        'Coordene múltiplos agentes de inteligência artificial como uma agência profissional dentro do seu ambiente de desenvolvimento, da exploração e planejamento até implementação, review e entrega.')}
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
                {nls.localize('theia/getting-started/cyberVinci/newFile', 'Novo arquivo...')}
            </a>
        </div>;

        const open = requireSingleOpen && <div className='gs-action-container'>
            <a
                role={'button'}
                tabIndex={0}
                onClick={this.doOpen}
                onKeyDown={this.doOpenEnter}>
                {nls.localize('theia/getting-started/cyberVinci/open', 'Abrir')}
            </a>
        </div>;

        const openFile = !requireSingleOpen && <div className='gs-action-container'>
            <a
                role={'button'}
                tabIndex={0}
                onClick={this.doOpenFile}
                onKeyDown={this.doOpenFileEnter}>
                {nls.localize('theia/getting-started/cyberVinci/openFile', 'Abrir arquivo')}
            </a>
        </div>;

        const openFolder = !requireSingleOpen && <div className='gs-action-container'>
            <a
                role={'button'}
                tabIndex={0}
                onClick={this.doOpenFolder}
                onKeyDown={this.doOpenFolderEnter}>
                {nls.localize('theia/getting-started/cyberVinci/openFolder', 'Abrir pasta')}
            </a>
        </div>;

        const openWorkspace = (
            <a
                role={'button'}
                tabIndex={0}
                onClick={this.doOpenWorkspace}
                onKeyDown={this.doOpenWorkspaceEnter}>
                {nls.localize('theia/getting-started/cyberVinci/openWorkspace', 'Abrir workspace')}
            </a>
        );

        return <div className='gs-section'>
            <h3 className='gs-section-header'><i className={codicon('folder-opened')}></i>{nls.localize('theia/getting-started/cyberVinci/start', 'Começar')}</h3>
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
                {nls.localize('theia/getting-started/cyberVinci/more', 'Mais...')}
            </a>
        </div>;
        return <div className='gs-section'>
            <h3 className='gs-section-header'>
                <i className={codicon('history')}></i>{nls.localize('theia/getting-started/cyberVinci/recent', 'Recentes')}
            </h3>
            {items.length > 0 ? content : <p className='gs-no-recent'>
                {nls.localize('theia/getting-started/cyberVinci/noRecentFolders', 'Você não tem pastas recentes,') + ' '}
                <a
                    role={'button'}
                    tabIndex={0}
                    onClick={this.doOpenFolder}
                    onKeyDown={this.doOpenFolderEnter}>
                    {nls.localize('theia/getting-started/cyberVinci/openAFolder', 'abra uma pasta')}
                </a>
                {' ' + nls.localize('theia/getting-started/cyberVinci/toStart', 'para começar.')}
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
                {nls.localize('theia/getting-started/cyberVinci/settings', 'Configurações')}
            </h3>
            <div className='gs-action-container'>
                <a
                    role={'button'}
                    tabIndex={0}
                    onClick={this.doOpenPreferences}
                    onKeyDown={this.doOpenPreferencesEnter}>
                    {nls.localize('theia/getting-started/cyberVinci/openSettings', 'Abrir configurações')}
                </a>
            </div>
            <div className='gs-action-container'>
                <a
                    role={'button'}
                    tabIndex={0}
                    onClick={this.doOpenKeyboardShortcuts}
                    onKeyDown={this.doOpenKeyboardShortcutsEnter}>
                    {nls.localize('theia/getting-started/cyberVinci/openKeyboardShortcuts', 'Abrir atalhos de teclado')}
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
                {nls.localize('theia/getting-started/cyberVinci/help', 'Ajuda')}
            </h3>
            <div className='gs-action-container'>
                <a
                    role={'button'}
                    tabIndex={0}
                    onClick={() => this.doOpenAIChatView()}
                    onKeyDown={(e: React.KeyboardEvent) => this.doOpenAIChatViewEnter(e)}>
                    {nls.localize('theia/getting-started/cyberVinci/openAgencyChat', 'Abrir AI Agency Chat')}
                </a>
            </div>
            <div className='gs-action-container'>
                <a
                    role={'button'}
                    tabIndex={0}
                    onClick={this.doOpenCyberVinciUpdates}
                    onKeyDown={this.doOpenCyberVinciUpdatesEnter}>
                    {nls.localize('theia/getting-started/cyberVinci/checkUpdates', 'Verificar atualizações')}
                </a>
            </div>
            <div className='gs-action-container'>
                <a
                    role={'button'}
                    tabIndex={0}
                    onClick={this.doOpenPreferences}
                    onKeyDown={this.doOpenPreferencesEnter}>
                    {nls.localize('theia/getting-started/cyberVinci/openSettings', 'Abrir configurações')}
                </a>
            </div>
            <div className='gs-action-container'>
                <a
                    role={'button'}
                    tabIndex={0}
                    onClick={this.doOpenKeyboardShortcuts}
                    onKeyDown={this.doOpenKeyboardShortcutsEnter}>
                    {nls.localize('theia/getting-started/cyberVinci/openKeyboardShortcuts', 'Abrir atalhos de teclado')}
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
                    {this.applicationInfo ? nls.localize('theia/getting-started/cyberVinci/version', 'Versão: {0}', this.applicationInfo.version) : ''}
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
                    'Use agentes especializados, chat neutro de provedor, orquestração visual com Flow, design no Canvas, Playbooks e ferramentas de workspace revisáveis mantendo todo o workflow dentro da IDE.')}
            </p>
            <div className='gs-action-container'>
                <a
                    role={'button'}
                    style={{ fontSize: 'var(--theia-ui-font-size2)' }}
                    tabIndex={0}
                    onClick={() => this.doOpenAIChatView()}
                    onKeyDown={(e: React.KeyboardEvent) => this.doOpenAIChatViewEnter(e)}>
                    {nls.localize('theia/getting-started/cyberVinci/openAIChatView', 'Abrir CyberVinci Chat')}
                </a>
            </div>
            <div className='gs-action-container'>
                <a
                    role={'button'}
                    tabIndex={0}
                    onClick={() => this.doOpenFlow()}
                    onKeyDown={(e: React.KeyboardEvent) => this.doOpenFlowEnter(e)}>
                    {nls.localize('theia/getting-started/cyberVinci/openFlow', 'Abrir Flow')}
                </a>
            </div>
            <div className='gs-action-container'>
                <a
                    role={'button'}
                    tabIndex={0}
                    onClick={() => this.doOpenCanvas()}
                    onKeyDown={(e: React.KeyboardEvent) => this.doOpenCanvasEnter(e)}>
                    {nls.localize('theia/getting-started/cyberVinci/openCanvas', 'Novo design no Canvas')}
                </a>
            </div>
        </div>;
    }

    protected renderCyberVinciResources(): React.ReactNode {
        const resources = [
            {
                icon: 'symbol-misc',
                title: nls.localize('theia/getting-started/cyberVinci/resources/superIde/title', 'Super IDE harness de AI'),
                body: nls.localize('theia/getting-started/cyberVinci/resources/superIde/body',
                    'Ferramentas integradas para coordenar agentes, modelos, provedores, Flow, Canvas, edição visual, Playbooks, temas e automações em workflows agênticos, não apenas em programação.')
            },
            {
                icon: 'repo-forked',
                title: nls.localize('theia/getting-started/cyberVinci/resources/providers/title', 'Não seja refém de um provedor'),
                body: nls.localize('theia/getting-started/cyberVinci/resources/providers/body',
                    'Escolha provedor, modelo, runtime local ou modo de execução por rodada de chat e por etapa de Flow para manter custo, qualidade e disponibilidade sob seu controle.')
            },
            {
                icon: 'circuit-board',
                title: nls.localize('theia/getting-started/cyberVinci/resources/virtualTools/title', 'Virtual Tools para qualquer modelo'),
                body: nls.localize('theia/getting-started/cyberVinci/resources/virtualTools/body',
                    'Virtual Reasoning e Virtual Goal adicionam ciclos visíveis de pensamento, continuação de objetivo, tempo decorrido e contagem de rounds mesmo quando o modelo não oferece isso nativamente.')
            },
            {
                icon: 'type-hierarchy-sub',
                title: nls.localize('theia/getting-started/cyberVinci/resources/flow/title', 'Flow visual reutilizável'),
                body: nls.localize('theia/getting-started/cyberVinci/resources/flow/body',
                    'Crie workflows com etapas, entradas, saídas, provedores, modelos, verificações condicionais, loops, gates, artefatos e pontos de entrada reutilizáveis no chat.')
            },
            {
                icon: 'layout',
                title: nls.localize('theia/getting-started/cyberVinci/resources/design/title', 'Canvas e edição visual'),
                body: nls.localize('theia/getting-started/cyberVinci/resources/design/body',
                    'Desenhe interfaces no Canvas, importe fontes Figma/OpenPencil, gere código e edite HTML/cshtml visualmente com contexto do elemento selecionado e assistência de AI.')
            },
            {
                icon: 'verified',
                title: nls.localize('theia/getting-started/cyberVinci/resources/playbooks/title', 'Agentes e Playbooks'),
                body: nls.localize('theia/getting-started/cyberVinci/resources/playbooks/body',
                    'Use personas profissionais curadas sob demanda e Playbooks com etapas, validações, ferramentas e gates determinísticos para reduzir desvios operacionais.')
            },
            {
                icon: 'color-mode',
                title: nls.localize('theia/getting-started/cyberVinci/resources/platform/title', 'Temas e extensões'),
                body: nls.localize('theia/getting-started/cyberVinci/resources/platform/body',
                    'Use temas do CyberVinci, base Theia, compatibilidade com extensões do VS Code, preview Markdown com Mermaid, integração com Codex e ferramentas opcionais de C#.')
            }
        ];

        return <div className='gs-section cybervinci-resource-section'>
            <div className='cybervinci-resource-header'>
                <h3 className='gs-section-header'>
                    <i className={codicon('rocket')}></i>
                    {nls.localize('theia/getting-started/cyberVinci/resources/header', 'Recursos principais')}
                </h3>
                <p>
                    {nls.localize('theia/getting-started/cyberVinci/resources/summary',
                        'O CyberVinci reúne independência de provedor, controles avançados de AI para muitos modelos, orquestração visual de workflows, superfícies de design e ferramentas de implementação em um único workspace.')}
                </p>
            </div>
            <div className='cybervinci-resource-grid'>
                {resources.map(resource => <article className='cybervinci-resource-card' key={resource.title}>
                    <i className={codicon(resource.icon)}></i>
                    <h4>{resource.title}</h4>
                    <p>{resource.body}</p>
                </article>)}
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
                            'O CyberVinci foi projetado com AI como superfície principal de trabalho: um chat central, múltiplos provedores, execução de ferramentas, alterações revisáveis e orquestração de equipes de agentes especializados.')}
                    </p>
                    <div className='gs-action-container'>
                        <a
                            role={'button'}
                            style={{ fontSize: 'var(--theia-ui-font-size2)' }}
                            tabIndex={0}
                            onClick={() => this.doOpenAIChatView()}
                            onKeyDown={(e: React.KeyboardEvent) => this.doOpenAIChatViewEnter(e)}>
                            {nls.localize('theia/getting-started/cyberVinci/openAIChatView', 'Abrir CyberVinci Chat')}
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

    protected doOpenCyberVinciUpdates = () => {
        if (!this.releasesUrl) {
            this.messageService.warn(nls.localize(
                'theia/getting-started/cyberVinci/checkUpdatesNotConfigured',
                'Configure CYBERVINCI_RELEASES_URL ou CYBERVINCI_RELEASE_REPOSITORY para habilitar atualizações via GitHub Releases.'
            ));
            return;
        }
        window.open(this.releasesUrl, '_blank', 'noopener');
    };
    protected doOpenCyberVinciUpdatesEnter = (e: React.KeyboardEvent) => {
        if (this.isEnterKey(e)) {
            this.doOpenCyberVinciUpdates();
        }
    };

    protected doOpenFlow = () => this.commandRegistry.executeCommand(CyberVinciCommandIds.FLOW_OPEN);
    protected doOpenFlowEnter = (e: React.KeyboardEvent) => {
        if (this.isEnterKey(e)) {
            this.doOpenFlow();
        }
    };

    protected doOpenCanvas = () => this.commandRegistry.executeCommand('openpencil.newDesign');
    protected doOpenCanvasEnter = (e: React.KeyboardEvent) => {
        if (this.isEnterKey(e)) {
            this.doOpenCanvas();
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
                {nls.localize('theia/getting-started/cyberVinci/showWelcomeOnStartup', 'Mostrar página de boas-vindas ao iniciar')}
            </label>
        </div>
    );
}
