import { FileUri } from '@theia/core/lib/common/file-uri';
import { AbstractViewContribution, ConfirmDialog, FrontendApplication } from '@theia/core/lib/browser';
import { CommandRegistry, MenuModelRegistry, MessageService, nls } from '@theia/core/lib/common';
import { CYBERVINCI_MENU_ITEMS } from '@cybervinci/branding/lib/common';
import { inject, injectable } from '@theia/core/shared/inversify';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { MemoryService } from '../common';
import { MemoryCommands, MemoryMenus } from './memory-commands';
import { MemoryTab, MemoryWidget } from './memory-widget';

@injectable()
export class MemoryContribution extends AbstractViewContribution<MemoryWidget> {

    @inject(MemoryService)
    protected readonly memoryService: MemoryService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    constructor() {
        super({
            widgetId: MemoryWidget.ID,
            widgetName: MemoryWidget.LABEL,
            defaultWidgetOptions: {
                area: 'left',
                rank: 840
            },
            toggleCommandId: 'memory.toggle'
        });
    }

    async initializeLayout(_app: FrontendApplication): Promise<void> {
        // Memory is opt-in and opens only when the user chooses it.
    }

    override registerCommands(registry: CommandRegistry): void {
        super.registerCommands(registry);
        registry.registerCommand(MemoryCommands.OPEN, {
            execute: () => this.openMemory('overview')
        });
        registry.registerCommand({ id: 'project-intelligence.open' }, {
            execute: () => registry.executeCommand(MemoryCommands.OPEN.id)
        });
        registry.registerCommand(MemoryCommands.OPEN_CODE_GRAPH, {
            execute: () => this.openMemory('code-graph')
        });
        registry.registerCommand({ id: 'project-intelligence.open-code-graph' }, {
            execute: () => registry.executeCommand(MemoryCommands.OPEN_CODE_GRAPH.id)
        });
        registry.registerCommand(MemoryCommands.OPEN_DOCUMENT_GRAPH, {
            execute: () => this.openMemory('documents-graph')
        });
        registry.registerCommand({ id: 'project-intelligence.open-document-graph' }, {
            execute: () => registry.executeCommand(MemoryCommands.OPEN_DOCUMENT_GRAPH.id)
        });
        registry.registerCommand(MemoryCommands.OPEN_PROJECT_MEMORY_GRAPH, {
            execute: () => this.openMemory('project-memories')
        });
        registry.registerCommand({ id: 'project-intelligence.open-project-memory-graph' }, {
            execute: () => registry.executeCommand(MemoryCommands.OPEN_PROJECT_MEMORY_GRAPH.id)
        });
        registry.registerCommand(MemoryCommands.OPEN_PREFERENCES_GRAPH, {
            execute: () => this.openMemory('preferences')
        });
        registry.registerCommand({ id: 'project-intelligence.open-preferences-graph' }, {
            execute: () => registry.executeCommand(MemoryCommands.OPEN_PREFERENCES_GRAPH.id)
        });
        registry.registerCommand(MemoryCommands.OPEN_SKILLS_REVIEW, {
            execute: () => this.openMemory('skills')
        });
        registry.registerCommand({ id: 'project-intelligence.open-skills-review' }, {
            execute: () => registry.executeCommand(MemoryCommands.OPEN_SKILLS_REVIEW.id)
        });
        registry.registerCommand(MemoryCommands.OPEN_SETTINGS, {
            execute: () => this.openMemory('settings')
        });
        registry.registerCommand({ id: 'project-intelligence.open-settings' }, {
            execute: () => registry.executeCommand(MemoryCommands.OPEN_SETTINGS.id)
        });
        registry.registerCommand(MemoryCommands.OPEN_IMPACT, {
            execute: () => this.openMemory('impact')
        });
        registry.registerCommand({ id: 'project-intelligence.open-impact' }, {
            execute: () => registry.executeCommand(MemoryCommands.OPEN_IMPACT.id)
        });
        registry.registerCommand(MemoryCommands.OPEN_EVENTS, {
            execute: () => this.openMemory('events')
        });
        registry.registerCommand({ id: 'project-intelligence.open-events' }, {
            execute: () => registry.executeCommand(MemoryCommands.OPEN_EVENTS.id)
        });
        registry.registerCommand(MemoryCommands.DETECT_CHANGE_IMPACT_FROM_GIT_DIFF, {
            execute: async () => this.detectChangeImpactFromGitDiff()
        });
        registry.registerCommand({ id: 'project-intelligence.detect-change-impact-from-git-diff' }, {
            execute: () => registry.executeCommand(MemoryCommands.DETECT_CHANGE_IMPACT_FROM_GIT_DIFF.id)
        });
        registry.registerCommand(MemoryCommands.INDEX_WORKSPACE, {
            execute: async () => this.indexWorkspace()
        });
        registry.registerCommand({ id: 'project-intelligence.index-workspace' }, {
            execute: () => registry.executeCommand(MemoryCommands.INDEX_WORKSPACE.id)
        });
        registry.registerCommand(MemoryCommands.FORGET_WORKSPACE_LEARNING_DATA, {
            execute: async () => this.forgetWorkspaceLearningData()
        });
        registry.registerCommand({ id: 'project-intelligence.forget-workspace-learning-data' }, {
            execute: () => registry.executeCommand(MemoryCommands.FORGET_WORKSPACE_LEARNING_DATA.id)
        });
    }

    override registerMenus(menus: MenuModelRegistry): void {
        super.registerMenus(menus);
        menus.registerSubmenu(MemoryMenus.MEMORY, CYBERVINCI_MENU_ITEMS.MEMORY.label, {
            sortString: '4',
            icon: CYBERVINCI_MENU_ITEMS.MEMORY.iconClass
        });
        menus.registerMenuAction(MemoryMenus.MEMORY, {
            commandId: MemoryCommands.OPEN_CODE_GRAPH.id,
            label: nls.localize('theia/memory/cyberVinci/codeGraph', 'Code Graph'),
            order: '0'
        });
        menus.registerMenuAction(MemoryMenus.MEMORY, {
            commandId: MemoryCommands.OPEN_DOCUMENT_GRAPH.id,
            label: nls.localize('theia/memory/cyberVinci/documentGraph', 'Document Graph'),
            order: '1'
        });
        menus.registerMenuAction(MemoryMenus.MEMORY, {
            commandId: MemoryCommands.OPEN_PROJECT_MEMORY_GRAPH.id,
            label: nls.localize('theia/memory/cyberVinci/projectMemoryGraph', 'Project Memories Graph'),
            order: '2'
        });
        menus.registerMenuAction(MemoryMenus.MEMORY, {
            commandId: MemoryCommands.OPEN_PREFERENCES_GRAPH.id,
            label: nls.localize('theia/memory/cyberVinci/preferencesGraph', 'IDE Memories Graph'),
            order: '3'
        });
        menus.registerMenuAction(MemoryMenus.MEMORY, {
            commandId: MemoryCommands.OPEN_SKILLS_REVIEW.id,
            label: nls.localize('theia/memory/cyberVinci/skillsReview', 'Skills Awaiting Approval or Deletion'),
            order: '4'
        });
        menus.registerMenuAction(MemoryMenus.MEMORY, {
            commandId: MemoryCommands.OPEN_SETTINGS.id,
            label: nls.localize('theia/memory/cyberVinci/settings', 'Settings'),
            order: '5'
        });
        menus.registerMenuAction(MemoryMenus.MEMORY, {
            commandId: MemoryCommands.OPEN_IMPACT.id,
            label: nls.localize('theia/memory/cyberVinci/impact', 'Change Impact'),
            order: '6'
        });
        menus.registerMenuAction(MemoryMenus.MEMORY, {
            commandId: MemoryCommands.DETECT_CHANGE_IMPACT_FROM_GIT_DIFF.id,
            label: nls.localize('theia/memory/cyberVinci/detectImpactFromGitDiff', 'Detect Change Impact from Git Diff'),
            order: '6.1'
        });
        menus.registerMenuAction(MemoryMenus.MEMORY, {
            commandId: MemoryCommands.OPEN_EVENTS.id,
            label: nls.localize('theia/memory/cyberVinci/events', 'Events and Audit'),
            order: '6.5'
        });
        menus.registerMenuAction(MemoryMenus.MEMORY, {
            commandId: MemoryCommands.INDEX_WORKSPACE.id,
            label: nls.localize('theia/memory/cyberVinci/indexWorkspace', 'Index Current Workspace'),
            order: '7'
        });
        menus.registerMenuAction(MemoryMenus.MEMORY, {
            commandId: MemoryCommands.FORGET_WORKSPACE_LEARNING_DATA.id,
            label: nls.localize('theia/memory/cyberVinci/forgetWorkspaceLearning', 'Forget Workspace Prompt Learning'),
            order: '8'
        });
    }

    protected async openMemory(tab: MemoryTab): Promise<void> {
        const widget = await this.openView({ activate: true });
        await widget.refresh(tab);
    }

    protected async indexWorkspace(): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const result = await this.memoryService.indexWorkspace({ workspacePath });
        await this.openMemory('overview');
        this.messageService.info(nls.localize(
            'theia/memory/indexed',
            'Memory indexed {0} files, {1} symbols, and {2} relations.',
            result.fileCount,
            result.symbolCount,
            result.relationCount
        ));
    }

    protected async detectChangeImpactFromGitDiff(): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const result = await this.memoryService.detectChangeImpactFromGitDiff({ workspacePath });
        await this.openMemory('impact');
        this.messageService.info(nls.localize(
            'theia/memory/changeImpactDetected',
            'Memory detected {0} changed files from {1} and {2} impacted files.',
            result.changeSet.changedFilePaths.length,
            result.changeSet.source,
            result.impacts.length
        ));
    }

    protected async forgetWorkspaceLearningData(): Promise<void> {
        const workspacePath = await this.getWorkspacePath();
        if (!workspacePath) {
            return;
        }
        const confirmed = await new ConfirmDialog({
            title: nls.localize('theia/memory/forgetWorkspaceLearningTitle', 'Forget Workspace Prompt Learning'),
            msg: nls.localize('theia/memory/forgetWorkspaceLearningMessage', 'Delete prompt learning events and memories derived from prompts for this workspace? Indexed code, graph data, manually approved memories, skills, and other audit events are kept.')
        }).open();
        if (!confirmed) {
            return;
        }
        const result = await this.memoryService.forgetWorkspaceLearningData({ workspacePath });
        await this.openMemory('events');
        this.messageService.info(nls.localize(
            'theia/memory/forgotWorkspaceLearning',
            'Deleted {0} prompt events and {1} derived memories for this workspace.',
            result.promptEventsDeleted,
            result.derivedMemoriesDeleted
        ));
    }

    protected async getWorkspacePath(): Promise<string | undefined> {
        const roots = await this.workspaceService.roots;
        const root = roots[0];
        if (!root) {
            this.messageService.warn(nls.localize('theia/memory/noWorkspace', 'Open a workspace before using Memory.'));
            return undefined;
        }
        return FileUri.fsPath(root.resource.toString());
    }

    get defaultIconClass(): string {
        return CYBERVINCI_MENU_ITEMS.MEMORY.iconClass;
    }
}
