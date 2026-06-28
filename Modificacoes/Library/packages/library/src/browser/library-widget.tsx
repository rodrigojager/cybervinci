// *****************************************************************************
// Copyright (C) 2026 TypeFox GmbH.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { FileUri } from '@theia/core/lib/common/file-uri';
import { codicon, ReactWidget } from '@theia/core/lib/browser';
import { MessageService, nls } from '@theia/core';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import {
    LibraryService,
    DocsLockfile,
    DocsSkill,
    DocsSuggestion,
    DocumentationRegistryPackage,
    InstalledDocsPackage,
    WorkspaceDocsDetection
} from '../common/library-service';

interface LibraryWidgetState {
    storePath?: string;
    available: DocumentationRegistryPackage[];
    installed: InstalledDocsPackage[];
    detection?: WorkspaceDocsDetection;
    lockfile?: DocsLockfile;
    skills: DocsSkill[];
    loading: boolean;
}

@injectable()
export class LibraryWidget extends ReactWidget {
    static readonly ID = 'library-widget';
    static readonly LABEL = nls.localize('theia/ai/docs/view/label', 'Library');

    @inject(LibraryService)
    protected readonly libraryService: LibraryService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    protected state: LibraryWidgetState = {
        available: [],
        installed: [],
        skills: [],
        loading: true
    };

    constructor() {
        super();
        this.id = LibraryWidget.ID;
        this.title.label = LibraryWidget.LABEL;
        this.title.caption = LibraryWidget.LABEL;
        this.title.closable = true;
        this.title.iconClass = codicon('library');
    }

    @postConstruct()
    protected init(): void {
        this.addClass('library-widget');
        this.refresh();
    }

    async refresh(): Promise<void> {
        this.state = { ...this.state, loading: true };
        this.update();
        const workspacePath = await this.getWorkspacePath();
        const [storePath, available, installed, skills, detection, lockfile] = await Promise.all([
            this.libraryService.getStorePath(),
            this.libraryService.listAvailablePackages(),
            this.libraryService.listInstalledPackages(),
            workspacePath ? this.libraryService.getApplicableSkills(workspacePath) : this.libraryService.listSkills(),
            workspacePath ? this.libraryService.detectWorkspace(workspacePath) : undefined,
            workspacePath ? this.libraryService.readLockfile(workspacePath) : undefined
        ]);
        this.state = {
            storePath,
            available,
            installed,
            skills,
            detection,
            lockfile,
            loading: false
        };
        this.update();
    }

    protected render(): React.ReactNode {
        return (
            <div className='library-root'>
                <div className='library-toolbar'>
                    <button className='theia-button' title={nls.localizeByDefault('Refresh')} onClick={() => this.refresh()}>
                        <i className={codicon('refresh')} />
                    </button>
                    <button
                        className='theia-button'
                        title={nls.localize('theia/ai/docs/toolbar/installFirst', 'Install first suggestion')}
                        onClick={() => this.installFirstSuggestion()}
                    >
                        <i className={codicon('cloud-download')} />
                    </button>
                    <button
                        className='theia-button'
                        title={nls.localize('theia/ai/docs/toolbar/pinFirst', 'Pin first installed package')}
                        onClick={() => this.pinFirstInstalled()}
                    >
                        <i className={codicon('pinned')} />
                    </button>
                    <button
                        className='theia-button'
                        title={nls.localize('theia/ai/docs/toolbar/checkUpdates', 'Check installed documentation updates')}
                        onClick={() => this.checkUpdates()}
                    >
                        <i className={codicon('sync')} />
                    </button>
                    <button
                        className='theia-button'
                        title={nls.localizeByDefault('Close')}
                        onClick={() => this.close()}
                    >
                        <i className={codicon('close')} />
                    </button>
                </div>
                {this.state.loading && <div className='library-empty'>
                    {nls.localize('theia/ai/docs/loading', 'Loading documentation context...')}
                </div>}
                {!this.state.loading && <>
                    {this.renderWorkspace()}
                    {this.renderInstalled()}
                    {this.renderSkills()}
                    {this.renderAvailable()}
                </>}
            </div>
        );
    }

    protected renderWorkspace(): React.ReactNode {
        const detection = this.state.detection;
        return (
            <section className='library-section'>
                <h3>{nls.localizeByDefault('Workspace')}</h3>
                {!detection && <div className='library-empty'>{nls.localize('theia/ai/docs/noWorkspaceShort', 'No workspace open.')}</div>}
                {detection && <>
                    <div className='library-meta'>
                        {nls.localize(
                            'theia/ai/docs/workspace/counts',
                            '{0} dependencies, {1} suggestions',
                            detection.dependencies.length,
                            detection.suggestions.length
                        )}
                    </div>
                    {detection.suggestions.length === 0 && <div className='library-empty'>
                        {nls.localize('theia/ai/docs/noSuggestions', 'No matching documentation suggestions.')}
                    </div>}
                    {detection.suggestions.map(suggestion => this.renderSuggestion(suggestion))}
                    {this.state.lockfile && <div className='library-lock'>
                        {nls.localize('theia/ai/docs/lock/status', 'Lockfile pins {0} package(s).', this.state.lockfile.docs.length)}
                    </div>}
                </>}
            </section>
        );
    }

    protected renderSuggestion(suggestion: DocsSuggestion): React.ReactNode {
        return (
            <div className='library-row' key={`${suggestion.packageId}-${suggestion.resolvedVersion}`}>
                <div>
                    <div className='library-name'>{suggestion.registryName} {suggestion.resolvedVersion}</div>
                    <div className='library-meta'>{suggestion.reason}</div>
                </div>
                <div className='library-row-end'>
                    <div className='library-state'>
                        {suggestion.pinned
                            ? nls.localizeByDefault('Pinned')
                            : suggestion.installed
                                ? nls.localizeByDefault('Installed')
                                : nls.localizeByDefault('Available')}
                    </div>
                    <div className='library-actions'>
                        {!suggestion.installed && <button
                            className='library-icon-button'
                            title={nls.localize('theia/ai/docs/action/install', 'Install documentation')}
                            onClick={() => this.installSuggestion(suggestion)}
                        >
                            <i className={codicon('cloud-download')} />
                        </button>}
                        {suggestion.installed && !suggestion.pinned && <button
                            className='library-icon-button'
                            title={nls.localize('theia/ai/docs/action/pin', 'Pin documentation version')}
                            onClick={() => this.pinPackage(suggestion.packageId, suggestion.resolvedVersion)}
                        >
                            <i className={codicon('pinned')} />
                        </button>}
                        {this.renderOpenSourceButton(suggestion.packageId)}
                    </div>
                </div>
            </div>
        );
    }

    protected renderInstalled(): React.ReactNode {
        return (
            <section className='library-section'>
                <h3>{nls.localizeByDefault('Installed')}</h3>
                {this.state.installed.length === 0 && <div className='library-empty'>
                    {nls.localize('theia/ai/docs/installed/empty', 'No local documentation packages installed.')}
                </div>}
                {this.state.installed.map(packageInfo => (
                    <div className='library-row' key={`${packageInfo.id}-${packageInfo.version}`}>
                        <div>
                            <div className='library-name'>{packageInfo.name} {packageInfo.version}</div>
                            <div className='library-meta'>
                                {nls.localize(
                                    'theia/ai/docs/installed/stats',
                                    '{0} docs, {1} sections',
                                    packageInfo.documentCount,
                                    packageInfo.sectionCount
                                )}
                            </div>
                        </div>
                        <div className='library-row-end'>
                            <div className={packageInfo.isLegacy ? 'library-state library-warning' : 'library-state'}>
                                {packageInfo.isLegacy
                                    ? nls.localize('theia/ai/docs/state/legacy', 'Legacy')
                                    : nls.localizeByDefault('Current')}
                            </div>
                            <div className='library-actions'>
                                <button
                                    className='library-icon-button'
                                    title={nls.localize('theia/ai/docs/action/pin', 'Pin documentation version')}
                                    onClick={() => this.pinPackage(packageInfo.id, packageInfo.version)}
                                >
                                    <i className={codicon('pinned')} />
                                </button>
                                <button
                                    className='library-icon-button'
                                    title={nls.localize('theia/ai/docs/action/checkPackageUpdates', 'Check updates for this package')}
                                    onClick={() => this.checkUpdates(packageInfo.id)}
                                >
                                    <i className={codicon('sync')} />
                                </button>
                                {this.renderInstalledOpenSourceButton(packageInfo.sourceUrl)}
                                <button
                                    className='library-icon-button'
                                    title={nls.localize('theia/ai/docs/action/generateContribution', 'Generate registry contribution')}
                                    onClick={() => this.generateContribution(packageInfo.id, packageInfo.version)}
                                >
                                    <i className={codicon('git-pull-request')} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </section>
        );
    }

    protected renderAvailable(): React.ReactNode {
        return (
            <section className='library-section'>
                <h3>{nls.localize('theia/ai/docs/available/title', 'Registry')}</h3>
                {this.state.available.map(packageInfo => (
                    <div className='library-row' key={packageInfo.id}>
                        <div>
                            <div className='library-name'>{packageInfo.name}</div>
                            <div className='library-meta'>{packageInfo.versions.map(version => version.version).join(', ')}</div>
                        </div>
                        <div className='library-row-end'>
                            <div className='library-state'>{packageInfo.ecosystem}</div>
                            <div className='library-actions'>
                                <button
                                    className='library-icon-button'
                                    title={nls.localize('theia/ai/docs/action/installLatest', 'Install latest registry version')}
                                    onClick={() => this.installLatest(packageInfo.id)}
                                >
                                    <i className={codicon('cloud-download')} />
                                </button>
                                {this.renderOpenSourceButton(packageInfo.id)}
                            </div>
                        </div>
                    </div>
                ))}
                {this.state.storePath && <div className='library-store'>{this.state.storePath}</div>}
            </section>
        );
    }

    protected renderOpenSourceButton(packageId: string): React.ReactNode {
        const packageInfo = this.state.available.find(candidate => candidate.id === packageId);
        const url = packageInfo?.homepage ?? packageInfo?.repository ?? packageInfo?.sources[0]?.url;
        if (!url) {
            return undefined;
        }
        return <button
            className='library-icon-button'
            title={nls.localize('theia/ai/docs/action/openSource', 'Open original source')}
            onClick={() => this.openSource(url)}
        >
            <i className={codicon('link-external')} />
        </button>;
    }

    protected renderInstalledOpenSourceButton(sourceUrl?: string): React.ReactNode {
        if (!sourceUrl) {
            return undefined;
        }
        return <button
            className='library-icon-button'
            title={nls.localize('theia/ai/docs/action/openSource', 'Open original source')}
            onClick={() => this.openSource(sourceUrl)}
        >
            <i className={codicon('link-external')} />
        </button>;
    }

    protected renderSkills(): React.ReactNode {
        return (
            <section className='library-section'>
                <h3>{nls.localizeByDefault('Skills')}</h3>
                {this.state.skills.length === 0 && <div className='library-empty'>
                    {nls.localize('theia/ai/docs/skills/empty', 'No documentation skills apply to this workspace.')}
                </div>}
                {this.state.skills.map(skill => (
                    <div className='library-row' key={skill.id}>
                        <div>
                            <div className='library-name'>{skill.name}</div>
                            <div className='library-meta'>{skill.rules.join(', ')}</div>
                        </div>
                        <div className='library-state'>{skill.preferredDocs.length}</div>
                    </div>
                ))}
            </section>
        );
    }

    protected async installFirstSuggestion(): Promise<void> {
        const suggestion = this.state.detection?.suggestions.find(candidate => !candidate.installed) ?? this.state.detection?.suggestions[0];
        if (!suggestion) {
            this.messageService.info(nls.localize('theia/ai/docs/install/noSuggestion', 'No documentation suggestion to install.'));
            return;
        }
        await this.installSuggestion(suggestion);
    }

    protected async installSuggestion(suggestion: DocsSuggestion): Promise<void> {
        await this.libraryService.installPackage({
            packageId: suggestion.packageId,
            version: suggestion.resolvedVersion,
            workspacePath: await this.getWorkspacePath(),
            pinToWorkspace: true
        });
        await this.refresh();
    }

    protected async installLatest(packageId: string): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        const packageInfo = this.state.available.find(candidate => candidate.id === packageId);
        const version = packageInfo?.versions[packageInfo.versions.length - 1]?.version;
        await this.libraryService.installPackage({
            packageId,
            version,
            workspacePath,
            pinToWorkspace: Boolean(workspacePath)
        });
        await this.refresh();
    }

    protected async pinFirstInstalled(): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        const installed = this.state.installed[0];
        if (!workspacePath || !installed) {
            this.messageService.info(nls.localize('theia/ai/docs/pin/notReady', 'Open a workspace and install documentation before pinning.'));
            return;
        }
        await this.libraryService.pinPackageToWorkspace(workspacePath, installed.id, installed.version);
        await this.refresh();
    }

    protected async pinPackage(packageId: string, version?: string): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            this.messageService.info(nls.localize('theia/ai/docs/pin/notReady', 'Open a workspace and install documentation before pinning.'));
            return;
        }
        await this.libraryService.pinPackageToWorkspace(workspacePath, packageId, version);
        await this.refresh();
    }

    protected async checkUpdates(packageId?: string): Promise<void> {
        const runs = await this.libraryService.checkUpdates(packageId);
        const changed = runs.filter(run => run.result === 'new_version_available' || run.result === 'changed_same_version').length;
        this.messageService.info(nls.localize('theia/ai/docs/check/result', 'Checked {0} package(s). {1} changed.', runs.length, changed));
        await this.refresh();
    }

    protected async generateContribution(packageId: string, version: string): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            this.messageService.info(nls.localize('theia/ai/docs/contribution/noWorkspace', 'Open a workspace before generating registry contribution files.'));
            return;
        }
        const result = await this.libraryService.generateRegistryContribution(packageId, version, workspacePath);
        this.messageService.info(nls.localize('theia/ai/docs/contribution/success', 'Generated registry contribution at {0}.', result.contributionPath));
    }

    protected openSource(url: string): void {
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    protected async getWorkspacePath(): Promise<string | undefined> {
        const roots = await this.workspaceService.roots;
        const root = roots[0];
        return root ? FileUri.fsPath(root.resource.toString()) : undefined;
    }
}
