import { AbstractViewContribution, FrontendApplication } from '@theia/core/lib/browser';
import { CommandRegistry, MenuModelRegistry } from '@theia/core/lib/common';
import { FlowWidget } from './flow-widget';
export declare class FlowContribution extends AbstractViewContribution<FlowWidget> {
    constructor();
    initializeLayout(_app: FrontendApplication): Promise<void>;
    registerCommands(commands: CommandRegistry): void;
    registerMenus(menus: MenuModelRegistry): void;
    get defaultIconClass(): string;
}
