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

import { nls } from '@theia/core';
import { codicon, ReactWidget } from '@theia/core/lib/browser';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { Agent, AgentService } from '@theia/ai-core';
import { Skill } from '@theia/ai-core/lib/common/skill';
import { SkillService } from '@theia/ai-core/lib/browser/skill-service';

interface CapabilityItem {
    id: string;
    name: string;
    description: string;
    type: 'agent' | 'skill';
    enabled: boolean;
}

interface ToggleableSkillService extends SkillService {
    getAllSkills(): Skill[];
    enableSkill(name: string): Promise<void>;
    disableSkill(name: string): Promise<void>;
    isEnabled(name: string): boolean;
}

@injectable()
export class AICapabilitiesConfigurationWidget extends ReactWidget {
    static readonly ID = 'ai-capabilities-configuration-widget';
    static readonly LABEL = nls.localize('theia/ai/ide/capabilitiesConfiguration/label', 'AI Capabilities');

    @inject(AgentService)
    protected readonly agentService: AgentService;

    @inject(SkillService)
    protected readonly skillService: SkillService;

    protected items: CapabilityItem[] = [];

    @postConstruct()
    protected init(): void {
        this.id = AICapabilitiesConfigurationWidget.ID;
        this.title.label = AICapabilitiesConfigurationWidget.LABEL;
        this.title.closable = false;
        this.addClass('ai-configuration-widget');

        this.loadItems();
        this.update();
        this.toDispose.pushAll([
            this.agentService.onDidChangeAgents(() => {
                this.loadItems();
                this.update();
            }),
            this.skillService.onSkillsChanged(() => {
                this.loadItems();
                this.update();
            })
        ]);
    }

    protected loadItems(): void {
        const agents = this.agentService.getAllAgents().map(agent => this.agentToItem(agent));
        const skills = this.toggleableSkillService.getAllSkills().map((skill: Skill) => this.skillToItem(skill));
        this.items = [...agents, ...skills].sort((a, b) => {
            const typeCompare = a.type.localeCompare(b.type);
            return typeCompare || a.name.localeCompare(b.name);
        });
    }

    protected get toggleableSkillService(): ToggleableSkillService {
        return this.skillService as ToggleableSkillService;
    }

    protected agentToItem(agent: Agent): CapabilityItem {
        return {
            id: agent.id,
            name: agent.name,
            description: agent.description,
            type: 'agent',
            enabled: this.agentService.isEnabled(agent.id)
        };
    }

    protected skillToItem(skill: Skill): CapabilityItem {
        return {
            id: skill.name,
            name: skill.name,
            description: skill.description,
            type: 'skill',
            enabled: this.toggleableSkillService.isEnabled(skill.name)
        };
    }

    protected toggleCapability = async (item: CapabilityItem): Promise<void> => {
        if (item.type === 'agent') {
            if (item.enabled) {
                await this.agentService.disableAgent(item.id);
            } else {
                await this.agentService.enableAgent(item.id);
            }
        } else if (item.enabled) {
            await this.toggleableSkillService.disableSkill(item.id);
        } else {
            await this.toggleableSkillService.enableSkill(item.id);
        }
        this.loadItems();
        this.update();
    };

    protected render(): React.ReactNode {
        return <div className="ai-capabilities-configuration-container">
            {this.items.length === 0 ? (
                <div className="ai-empty-state-content">
                    {nls.localize('theia/ai/ide/capabilitiesConfiguration/empty', 'No AI capabilities available')}
                </div>
            ) : (
                <div className="ai-configuration-table-container">
                    <table className="ai-configuration-table ai-capabilities-table">
                        <thead>
                            <tr>
                                <th className="capability-state-column">{nls.localizeByDefault('Enabled')}</th>
                                <th className="capability-type-column">{nls.localizeByDefault('Type')}</th>
                                <th className="capability-name-column">{nls.localizeByDefault('Name')}</th>
                                <th className="capability-description-column">{nls.localizeByDefault('Description')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {this.items.map(item => this.renderCapabilityRow(item))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>;
    }

    protected renderCapabilityRow(item: CapabilityItem): React.ReactNode {
        return <tr key={`${item.type}:${item.id}`} className={item.enabled ? 'capability-enabled' : 'capability-disabled'}>
            <td className="capability-state-column">
                <label className="agent-enable-toggle" title={item.enabled ? nls.localizeByDefault('Enabled') : nls.localizeByDefault('Disabled')}>
                    <div className="toggle-switch">
                        <input type="checkbox" checked={item.enabled} onChange={() => this.toggleCapability(item)} />
                        <span className="toggle-slider"></span>
                    </div>
                </label>
            </td>
            <td className="capability-type-column">
                <span className={`capability-type ${item.type === 'agent' ? codicon('hubot') : codicon('symbol-method')}`}></span>
                {item.type === 'agent'
                    ? nls.localizeByDefault('Agent')
                    : nls.localizeByDefault('Skill')}
            </td>
            <td className="capability-name-column">
                <span>{item.name}</span>
                <pre className="ai-id-label">{nls.localizeByDefault('ID')}: {item.id}</pre>
            </td>
            <td className="capability-description-column">
                <span>{item.description}</span>
            </td>
        </tr>;
    }
}
