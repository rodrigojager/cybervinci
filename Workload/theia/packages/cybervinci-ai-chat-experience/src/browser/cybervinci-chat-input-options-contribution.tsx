// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { CyberVinciAiRuntimeService } from '@cybervinci/ai-runtime/lib/common';
import { FlowService, FlowWorkflow } from '@cybervinci/flow/lib/common';
import { AIChatInputOptionsContribution } from '@theia/ai-chat-ui/lib/browser/chat-input-widget';
import { HoverService } from '@theia/core/lib/browser';
import { CommandService } from '@theia/core';
import { PreferenceScope, PreferenceService } from '@theia/core/lib/common/preferences';
import { nls } from '@theia/core/lib/common/nls';
import { inject, injectable, optional } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import * as ReactDOM from '@theia/core/shared/react-dom';
import { CyberVinciAgentSummary, CyberVinciAiChatExperienceService, CyberVinciPlaybookSummary } from '../common';
import {
    CYBERVINCI_AI_CHAT_AGENT_PROFILE_FAVORITES_PREF,
    CYBERVINCI_AI_CHAT_AGENT_PROFILE_PREF,
    CYBERVINCI_AI_CHAT_FLOW_MODE_PREF,
    CYBERVINCI_AI_CHAT_PLAYBOOK_PREF,
    CYBERVINCI_AI_CHAT_SAVED_WORKFLOW_PREF
} from './cybervinci-ai-chat-experience-preferences';
import {
    CyberVinciChatAiExecutionControls,
    CyberVinciChatModeSelector,
    CyberVinciChatVirtualToolsSelector,
    CyberVinciChatWorkflowRoutingSelector,
    CyberVinciFlowChatMode,
    hoverHandler,
    normalizeCyberVinciFlowChatMode,
    positionCyberVinciChatMenu
} from './cybervinci-chat-ai-execution-controls';
import { CyberVinciChatGoalService } from './cybervinci-ai-chat-goal-service';

@injectable()
export class CyberVinciChatInputOptionsContribution implements AIChatInputOptionsContribution {

    @inject(CyberVinciAiChatExperienceService)
    protected readonly experienceService: CyberVinciAiChatExperienceService;

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    @inject(CommandService)
    protected readonly commandService: CommandService;

    @inject(FlowService) @optional()
    protected readonly flowService: FlowService | undefined;

    @inject(CyberVinciAiRuntimeService) @optional()
    protected readonly aiRuntimeService: CyberVinciAiRuntimeService | undefined;

    @inject(CyberVinciChatGoalService)
    protected readonly goalService: CyberVinciChatGoalService;

    render(context: AIChatInputOptionsContribution.Context): React.ReactNode {
        const flowMode = this.getFlowMode();
        return (
            <CyberVinciChatExperienceControls
                key='cybervinci-chat-experience-controls'
                service={this.experienceService}
                aiRuntimeService={this.aiRuntimeService}
                flowService={this.flowService}
                preferenceService={this.preferenceService}
                commandService={this.commandService}
                goalService={this.goalService}
                chatModel={context.chatModel}
                flowMode={flowMode}
                disabled={!context.enabled || context.pending}
                hoverService={context.hoverService}
            />
        );
    }

    protected getFlowMode(): CyberVinciFlowChatMode {
        return normalizeCyberVinciFlowChatMode(this.preferenceService.get(CYBERVINCI_AI_CHAT_FLOW_MODE_PREF, 'chat'));
    }
}

export const CyberVinciChatExperienceControls: React.FunctionComponent<{
    service: CyberVinciAiChatExperienceService;
    aiRuntimeService?: CyberVinciAiRuntimeService;
    flowService?: FlowService;
    preferenceService: PreferenceService;
    commandService: CommandService;
    goalService: CyberVinciChatGoalService;
    chatModel?: AIChatInputOptionsContribution.Context['chatModel'];
    flowMode: CyberVinciFlowChatMode;
    disabled?: boolean;
    hoverService: HoverService;
}> = ({ service, aiRuntimeService, flowService, preferenceService, commandService, goalService, chatModel, flowMode, disabled, hoverService }) => {
    const [effectiveFlowMode, setEffectiveFlowMode] = React.useState(() =>
        normalizeCyberVinciFlowChatMode(preferenceService.get(CYBERVINCI_AI_CHAT_FLOW_MODE_PREF, flowMode))
    );

    React.useEffect(() => {
        const disposable = preferenceService.onPreferenceChanged(event => {
            if (event.preferenceName === CYBERVINCI_AI_CHAT_FLOW_MODE_PREF) {
                setEffectiveFlowMode(normalizeCyberVinciFlowChatMode(preferenceService.get(CYBERVINCI_AI_CHAT_FLOW_MODE_PREF, 'chat')));
            }
        });
        return () => disposable.dispose();
    }, [preferenceService]);

    return (
        <span
            key='cybervinci-chat-experience-controls'
            className='cybervinci-chat-experience-controls'
            data-cybervinci-contribution='true'
            data-cybervinci-toolbar='ai-chat'
        >
            <AgentProfileSelector
                service={service}
                preferenceService={preferenceService}
                commandService={commandService}
                disabled={disabled}
                hoverService={hoverService}
            />
            <CyberVinciChatModeSelector
                preferenceService={preferenceService}
                disabled={disabled}
                hoverService={hoverService}
            />
            <PlaybookSelector
                service={service}
                preferenceService={preferenceService}
                commandService={commandService}
                disabled={disabled}
                hoverService={hoverService}
            />
            <CyberVinciChatWorkflowRoutingSelector
                preferenceService={preferenceService}
                currentMode={effectiveFlowMode}
                disabled={disabled}
                hoverService={hoverService}
                onModeChange={setEffectiveFlowMode}
            />
            {effectiveFlowMode === 'saved' && flowService && (
                <SavedWorkflowSelector
                    flowService={flowService}
                    preferenceService={preferenceService}
                    disabled={disabled}
                    hoverService={hoverService}
                />
            )}
            {effectiveFlowMode !== 'saved' && (
                <CyberVinciChatAiExecutionControls
                    aiRuntimeService={aiRuntimeService}
                    preferenceService={preferenceService}
                    commandService={commandService}
                    flowMode={effectiveFlowMode}
                    disabled={disabled}
                    hoverService={hoverService}
                />
            )}
            {effectiveFlowMode === 'chat' && (
                <CyberVinciChatVirtualToolsSelector
                    preferenceService={preferenceService}
                    goalService={goalService}
                    chatModel={chatModel}
                    disabled={disabled}
                    hoverService={hoverService}
                />
            )}
        </span>
    );
};

const AgentProfileSelector: React.FunctionComponent<{
    service: CyberVinciAiChatExperienceService;
    preferenceService: PreferenceService;
    commandService: CommandService;
    disabled?: boolean;
    hoverService: HoverService;
}> = ({ service, preferenceService, commandService, disabled, hoverService }) => {
    const [agents, setAgents] = React.useState<CyberVinciAgentSummary[]>([]);
    const [selected, setSelected] = React.useState(() => preferenceService.get<string>(CYBERVINCI_AI_CHAT_AGENT_PROFILE_PREF, '') ?? '');
    const [favorites, setFavorites] = React.useState<string[]>(() => normalizeStringArrayPreference(preferenceService.get(CYBERVINCI_AI_CHAT_AGENT_PROFILE_FAVORITES_PREF, [])));
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(() => new Set());
    const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties | undefined>();
    const rootRef = React.useRef<HTMLSpanElement | null>(null);
    const buttonRef = React.useRef<HTMLButtonElement | null>(null);
    const menuRef = React.useRef<HTMLDivElement | null>(null);
    const searchRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        let disposed = false;
        service.listAgents().then(result => {
            if (!disposed) {
                setAgents(result);
            }
        }).catch(() => {
            if (!disposed) {
                setAgents([]);
            }
        });
        const disposable = preferenceService.onPreferenceChanged(event => {
            if (event.preferenceName === CYBERVINCI_AI_CHAT_AGENT_PROFILE_PREF) {
                setSelected(preferenceService.get<string>(CYBERVINCI_AI_CHAT_AGENT_PROFILE_PREF, '') ?? '');
            }
            if (event.preferenceName === CYBERVINCI_AI_CHAT_AGENT_PROFILE_FAVORITES_PREF) {
                setFavorites(normalizeStringArrayPreference(preferenceService.get(CYBERVINCI_AI_CHAT_AGENT_PROFILE_FAVORITES_PREF, [])));
            }
        });
        return () => {
            disposed = true;
            disposable.dispose();
        };
    }, [service, preferenceService]);

    React.useEffect(() => {
        const close = (event: MouseEvent): void => {
            const target = event.target as Node;
            if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
                return;
            }
            setOpen(false);
        };
        const closeOnEscape = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', close, true);
        document.addEventListener('keydown', closeOnEscape, true);
        return () => {
            document.removeEventListener('mousedown', close, true);
            document.removeEventListener('keydown', closeOnEscape, true);
        };
    }, []);

    React.useEffect(() => {
        if (!open) {
            return;
        }
        const handle = window.requestAnimationFrame(() => searchRef.current?.focus());
        return () => window.cancelAnimationFrame(handle);
    }, [open]);

    React.useLayoutEffect(() => {
        if (!open) {
            setMenuStyle(undefined);
            return;
        }
        const updateMenuStyle = (): void => {
            const button = buttonRef.current;
            if (!button) {
                return;
            }
            const rect = button.getBoundingClientRect();
            const menuWidth = Math.min(360, window.innerWidth - 24);
            setMenuStyle(positionCyberVinciChatMenu(rect, menuWidth, 460));
        };
        updateMenuStyle();
        window.addEventListener('resize', updateMenuStyle);
        window.addEventListener('scroll', updateMenuStyle, true);
        return () => {
            window.removeEventListener('resize', updateMenuStyle);
            window.removeEventListener('scroll', updateMenuStyle, true);
        };
    }, [open]);

    const groups = React.useMemo(() => {
        const favoriteSet = new Set(favorites);
        const favoriteAgents = agents.filter(agent => favoriteSet.has(agent.id));
        const byCategory = new Map<string, CyberVinciAgentSummary[]>();
        for (const agent of agents.filter(agent => !favoriteSet.has(agent.id))) {
            const category = agent.category || 'general';
            const current = byCategory.get(category) ?? [];
            current.push(agent);
            byCategory.set(category, current);
        }
        const categoryGroups = Array.from(byCategory.entries())
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([category, groupAgents]) => ({
                category,
                agents: groupAgents.sort((left, right) => left.name.localeCompare(right.name))
            }));
        return favoriteAgents.length
            ? [{
                category: 'favorites',
                agents: favoriteAgents.sort((left, right) => left.name.localeCompare(right.name))
            }, ...categoryGroups]
            : categoryGroups;
    }, [agents, favorites]);

    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filteredGroups = React.useMemo(() => {
        if (!normalizedQuery) {
            return groups;
        }
        return groups
            .map(group => ({
                category: group.category,
                agents: group.agents.filter(agent => [
                    agent.name,
                    agent.description,
                    agent.category,
                    agent.relativePath,
                    agent.id
                ].filter(Boolean).some(value => String(value).toLocaleLowerCase().includes(normalizedQuery)))
            }))
            .filter(group => group.agents.length > 0);
    }, [groups, normalizedQuery]);

    const selectedAgent = agents.find(agent => agent.id === selected);

    React.useEffect(() => {
        if (selectedAgent?.category) {
            setExpandedGroups(current => {
                if (current.has(selectedAgent.category)) {
                    return current;
                }
                const next = new Set(current);
                next.add(selectedAgent.category);
                return next;
            });
        }
    }, [selectedAgent]);

    React.useEffect(() => {
        if (!open || !normalizedQuery) {
            return;
        }
        setExpandedGroups(new Set(filteredGroups.map(group => group.category)));
    }, [filteredGroups, normalizedQuery, open]);

    const title = selectedAgent
        ? `${selectedAgent.category}/${selectedAgent.name}${selectedAgent.description ? ` - ${selectedAgent.description}` : ''}`
        : nls.localize('theia/cybervinci/ai-chat/noAgentProfileSelected', 'No Agent profile selected');

    const selectAgent = async (agentId: string): Promise<void> => {
        setSelected(agentId);
        setOpen(false);
        setQuery('');
        await preferenceService.set(CYBERVINCI_AI_CHAT_AGENT_PROFILE_PREF, agentId || undefined, PreferenceScope.User);
    };

    const refreshAgents = async (): Promise<void> => {
        const result = await service.listAgents();
        setAgents(result);
    };

    const openAgent = async (agent: CyberVinciAgentSummary): Promise<void> => {
        const result = await service.getAgentProfilePath(agent.id);
        if (result.ok && result.path) {
            await commandService.executeCommand('cybervinci.aiChat.openCatalogPath', result.path);
        }
    };

    const duplicateAgent = async (agent: CyberVinciAgentSummary): Promise<void> => {
        const result = await service.duplicateAgentProfileToUser(agent.id);
        if (result.ok) {
            await refreshAgents();
            if (result.id) {
                setSelected(result.id);
                await preferenceService.set(CYBERVINCI_AI_CHAT_AGENT_PROFILE_PREF, result.id, PreferenceScope.User);
            }
            if (result.path) {
                await commandService.executeCommand('cybervinci.aiChat.openCatalogPath', result.path);
            }
        }
    };

    const toggleFavorite = async (agent: CyberVinciAgentSummary): Promise<void> => {
        const next = favorites.includes(agent.id)
            ? favorites.filter(id => id !== agent.id)
            : [...favorites, agent.id];
        setFavorites(next);
        await preferenceService.set(CYBERVINCI_AI_CHAT_AGENT_PROFILE_FAVORITES_PREF, next, PreferenceScope.User);
    };

    const toggleGroup = (category: string): void => {
        setExpandedGroups(current => {
            const next = new Set(current);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

    const menu = open ? (
        <div className='theia-ChatInput-AgencyAgentMenu' data-cybervinci-menu='agent-profile' style={menuStyle} ref={menuRef}>
            <div className='theia-ChatInput-AgencyAgentSearch'>
                <span className='codicon codicon-search' />
                <input
                    ref={searchRef}
                    className='theia-ChatInput-AgencyAgentSearchInput'
                    data-cybervinci-control='agent-profile-search'
                    value={query}
                    placeholder={nls.localize('theia/cybervinci/ai-chat/searchAgents', 'Search Agents')}
                    aria-label={nls.localize('theia/cybervinci/ai-chat/searchAgentsAria', 'Search Agents')}
                    onChange={event => setQuery(event.currentTarget.value)}
                    onKeyDown={event => {
                        if (event.key === 'Escape') {
                            setOpen(false);
                        }
                        event.stopPropagation();
                    }}
                />
                {query ? (
                    <button
                        type='button'
                        className='theia-ChatInput-AgencyAgentSearchClear'
                        aria-label={nls.localize('theia/cybervinci/ai-chat/clearAgentSearch', 'Clear Agent search')}
                        onClick={() => setQuery('')}
                    >
                        <span className='codicon codicon-close' />
                    </button>
                ) : undefined}
            </div>
            {selectedAgent ? (
                <button
                    type='button'
                    className='theia-ChatInput-AgencyAgentOption no-agent'
                    data-cybervinci-agent-id=''
                    onClick={() => selectAgent('')}
                >
                    <span className='theia-ChatInput-AgencyAgentName'>
                        {nls.localize('theia/cybervinci/ai-chat/clearAgentProfile', 'Clear Agent profile')}
                    </span>
                </button>
            ) : undefined}
            {filteredGroups.length === 0 ? (
                <div className='theia-ChatInput-AgencyAgentEmpty'>
                    {nls.localize('theia/cybervinci/ai-chat/noMatchingAgents', 'No matching Agents')}
                </div>
            ) : undefined}
            {filteredGroups.map(group => {
                const expanded = expandedGroups.has(group.category);
                return (
                    <div className='theia-ChatInput-AgencyAgentGroup' key={group.category}>
                        <button
                            type='button'
                            className={`theia-ChatInput-AgencyAgentGroupHeader${expanded ? ' expanded' : ''}`}
                            data-cybervinci-agent-group={group.category}
                            onClick={() => toggleGroup(group.category)}
                        >
                            <span className={`codicon codicon-chevron-${expanded ? 'down' : 'right'}`} />
                            <span className='theia-ChatInput-AgencyAgentGroupLabel'>{formatAgentCategory(group.category)}</span>
                            <span className='theia-ChatInput-AgencyAgentGroupCount'>{group.agents.length}</span>
                        </button>
                        {expanded && group.agents.map(agent => (
                            <div
                                key={agent.id}
                                className={`theia-ChatInput-AgencyAgentOptionRow${agent.id === selected ? ' selected' : ''}`}
                                data-cybervinci-agent-id={agent.id}
                            >
                                <button
                                    type='button'
                                    className='theia-ChatInput-AgencyAgentOption agent'
                                    title={agent.description}
                                    onClick={() => selectAgent(agent.id)}
                                >
                                    <span className='theia-ChatInput-AgencyAgentName'>{agent.name}</span>
                                    {agent.description ? <span className='theia-ChatInput-AgencyAgentDetail'>{agent.description}</span> : undefined}
                                    <span className='theia-ChatInput-AgencyAgentOrigin'>{agent.relativePath}</span>
                                </button>
                                <span className='theia-ChatInput-AgencyAgentActions'>
                                    <button
                                        type='button'
                                        className={`theia-ChatInput-AgencyAgentAction${favorites.includes(agent.id) ? ' active' : ''}`}
                                        data-cybervinci-agent-action='favorite'
                                        aria-label={favorites.includes(agent.id)
                                            ? nls.localize('theia/cybervinci/ai-chat/unfavoriteAgent', 'Remove Agent from favorites')
                                            : nls.localize('theia/cybervinci/ai-chat/favoriteAgent', 'Add Agent to favorites')}
                                        title={favorites.includes(agent.id)
                                            ? nls.localize('theia/cybervinci/ai-chat/unfavoriteAgentTitle', 'Remove from favorites')
                                            : nls.localize('theia/cybervinci/ai-chat/favoriteAgentTitle', 'Add to favorites')}
                                        onClick={event => {
                                            event.stopPropagation();
                                            toggleFavorite(agent);
                                        }}
                                    >
                                        <span className={`codicon codicon-star-${favorites.includes(agent.id) ? 'full' : 'empty'}`} />
                                    </button>
                                    <button
                                        type='button'
                                        className='theia-ChatInput-AgencyAgentAction'
                                        data-cybervinci-agent-action='edit'
                                        aria-label={nls.localize('theia/cybervinci/ai-chat/editAgentProfile', 'Open Agent profile source')}
                                        title={nls.localize('theia/cybervinci/ai-chat/editAgentProfileTitle', 'Open source markdown')}
                                        onClick={event => {
                                            event.stopPropagation();
                                            openAgent(agent);
                                        }}
                                    >
                                        <span className='codicon codicon-go-to-file' />
                                    </button>
                                    <button
                                        type='button'
                                        className='theia-ChatInput-AgencyAgentAction'
                                        data-cybervinci-agent-action='duplicate'
                                        aria-label={nls.localize('theia/cybervinci/ai-chat/duplicateAgentProfile', 'Duplicate Agent profile')}
                                        title={nls.localize('theia/cybervinci/ai-chat/duplicateAgentProfileTitle', 'Duplicate into editable _user profile')}
                                        onClick={event => {
                                            event.stopPropagation();
                                            duplicateAgent(agent);
                                        }}
                                    >
                                        <span className='codicon codicon-copy' />
                                    </button>
                                </span>
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    ) : undefined;

    return (
        <span className='theia-ChatInput-AgentProfileControl' ref={rootRef} onMouseEnter={hoverHandler(hoverService, title)}>
            <button
                ref={buttonRef}
                type='button'
                className={`theia-ChatInput-AiProviderButton compact theia-ChatInput-AgentProfileButton${selected ? ' selected' : ''}`}
                disabled={disabled}
                data-cybervinci-control='agent-profile'
                title={title}
                aria-label={title}
                aria-expanded={open}
                onClick={() => setOpen(current => !current)}
            >
                <span className='codicon codicon-account' />
                <span className='theia-ChatInput-AiProviderButtonLabel'>
                    {selectedAgent?.name ?? nls.localize('theia/cybervinci/ai-chat/agentProfile', 'Agent')}
                </span>
                <span className='codicon codicon-chevron-down' />
            </button>
            {menu ? ReactDOM.createPortal(menu, document.body) : undefined}
        </span>
    );
};

function formatAgentCategory(category: string): string {
    if (category === 'favorites') {
        return 'Favorites';
    }
    return category
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function normalizeStringArrayPreference(value: unknown): string[] {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string' && !!item.trim())
        : [];
}

const DIRECT_CHAT_PLAYBOOK_ID = 'direct-chat';

function noPlaybookOption(): CyberVinciPlaybookSummary {
    return {
        id: DIRECT_CHAT_PLAYBOOK_ID,
        name: nls.localize('theia/cybervinci/ai-chat/noPlaybook', 'No Playbook'),
        category: 'Chat',
        enabled: true,
        description: nls.localize(
            'theia/cybervinci/ai-chat/noPlaybookDescription',
            'Clear the selected Playbook and use the normal chat route.'
        )
    };
}

function normalizePlaybookForSelector(playbook: CyberVinciPlaybookSummary): CyberVinciPlaybookSummary {
    if (playbook.id !== DIRECT_CHAT_PLAYBOOK_ID) {
        return playbook;
    }
    return {
        ...playbook,
        ...noPlaybookOption(),
        category: playbook.category || 'Chat',
        source: playbook.source
    };
}

const PlaybookSelector: React.FunctionComponent<{
    service: CyberVinciAiChatExperienceService;
    preferenceService: PreferenceService;
    commandService: CommandService;
    disabled?: boolean;
    hoverService: HoverService;
}> = ({ service, preferenceService, commandService, disabled, hoverService }) => {
    const [playbooks, setPlaybooks] = React.useState<CyberVinciPlaybookSummary[]>([]);
    const [selected, setSelected] = React.useState(() => preferenceService.get<string>(CYBERVINCI_AI_CHAT_PLAYBOOK_PREF, DIRECT_CHAT_PLAYBOOK_ID) ?? DIRECT_CHAT_PLAYBOOK_ID);
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(() => new Set(['Chat']));
    const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties | undefined>();
    const rootRef = React.useRef<HTMLSpanElement | null>(null);
    const buttonRef = React.useRef<HTMLButtonElement | null>(null);
    const menuRef = React.useRef<HTMLDivElement | null>(null);
    const searchRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        let disposed = false;
        service.listPlaybooks().then(result => {
            if (!disposed) {
                setPlaybooks(result);
            }
        }).catch(() => {
            if (!disposed) {
                setPlaybooks([noPlaybookOption()]);
            }
        });
        const disposable = preferenceService.onPreferenceChanged(event => {
            if (event.preferenceName === CYBERVINCI_AI_CHAT_PLAYBOOK_PREF) {
                setSelected(preferenceService.get<string>(CYBERVINCI_AI_CHAT_PLAYBOOK_PREF, DIRECT_CHAT_PLAYBOOK_ID) ?? DIRECT_CHAT_PLAYBOOK_ID);
            }
        });
        return () => {
            disposed = true;
            disposable.dispose();
        };
    }, [service, preferenceService]);

    React.useEffect(() => {
        const close = (event: MouseEvent): void => {
            const target = event.target as Node;
            if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
                return;
            }
            setOpen(false);
        };
        const closeOnEscape = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', close, true);
        document.addEventListener('keydown', closeOnEscape, true);
        return () => {
            document.removeEventListener('mousedown', close, true);
            document.removeEventListener('keydown', closeOnEscape, true);
        };
    }, []);

    React.useEffect(() => {
        if (!open) {
            return;
        }
        const handle = window.requestAnimationFrame(() => searchRef.current?.focus());
        return () => window.cancelAnimationFrame(handle);
    }, [open]);

    React.useLayoutEffect(() => {
        if (!open) {
            setMenuStyle(undefined);
            return;
        }
        const updateMenuStyle = (): void => {
            const button = buttonRef.current;
            if (!button) {
                return;
            }
            const rect = button.getBoundingClientRect();
            const menuWidth = Math.min(420, window.innerWidth - 24);
            setMenuStyle(positionCyberVinciChatMenu(rect, menuWidth, 460));
        };
        updateMenuStyle();
        window.addEventListener('resize', updateMenuStyle);
        window.addEventListener('scroll', updateMenuStyle, true);
        return () => {
            window.removeEventListener('resize', updateMenuStyle);
            window.removeEventListener('scroll', updateMenuStyle, true);
        };
    }, [open]);

    const effectivePlaybooks = React.useMemo(() => {
        const fallback = noPlaybookOption();
        const items = (playbooks.length ? playbooks : [fallback]).map(normalizePlaybookForSelector);
        return items.some(playbook => playbook.id === fallback.id) ? items : [fallback, ...items];
    }, [playbooks]);
    const selectedPlaybook =
        effectivePlaybooks.find(playbook => playbook.id === selected && playbook.enabled !== false) ??
        effectivePlaybooks.find(playbook => playbook.id === DIRECT_CHAT_PLAYBOOK_ID) ??
        effectivePlaybooks.find(playbook => playbook.enabled !== false) ??
        effectivePlaybooks[0];
    const menuPlaybooks = React.useMemo(
        () => effectivePlaybooks.filter(playbook => playbook.enabled !== false),
        [effectivePlaybooks]
    );
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const groupedPlaybooks = React.useMemo(() => {
        const byCategory = new Map<string, CyberVinciPlaybookSummary[]>();
        for (const playbook of menuPlaybooks) {
            const category = playbook.category || 'Playbooks';
            const current = byCategory.get(category) ?? [];
            current.push(playbook);
            byCategory.set(category, current);
        }
        return Array.from(byCategory.entries())
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([category, groupPlaybooks]) => ({
                category,
                playbooks: groupPlaybooks.sort((left, right) => left.name.localeCompare(right.name))
            }));
    }, [menuPlaybooks]);
    const filteredGroups = React.useMemo(() => {
        if (!normalizedQuery) {
            return groupedPlaybooks;
        }
        return groupedPlaybooks
            .map(group => ({
                category: group.category,
                playbooks: group.playbooks.filter(playbook => [
                    playbook.name,
                    playbook.description,
                    playbook.category,
                    playbook.id,
                    playbook.source
                ].filter(Boolean).some(value => String(value).toLocaleLowerCase().includes(normalizedQuery)))
            }))
            .filter(group => group.playbooks.length > 0);
    }, [groupedPlaybooks, normalizedQuery]);

    React.useEffect(() => {
        if (selectedPlaybook?.category) {
            setExpandedGroups(current => {
                if (current.has(selectedPlaybook.category)) {
                    return current;
                }
                const next = new Set(current);
                next.add(selectedPlaybook.category);
                return next;
            });
        }
    }, [selectedPlaybook]);

    React.useEffect(() => {
        if (!open || !normalizedQuery) {
            return;
        }
        setExpandedGroups(new Set(filteredGroups.map(group => group.category)));
    }, [filteredGroups, normalizedQuery, open]);

    const title = selectedPlaybook.description
        ? `${selectedPlaybook.name} - ${selectedPlaybook.description}`
        : nls.localize('theia/cybervinci/ai-chat/playbook/title', 'Playbook');

    const selectPlaybook = async (playbook: CyberVinciPlaybookSummary): Promise<void> => {
        if (playbook.enabled === false) {
            return;
        }
        const next = playbook.id || DIRECT_CHAT_PLAYBOOK_ID;
        setSelected(next);
        setOpen(false);
        setQuery('');
        await preferenceService.set(CYBERVINCI_AI_CHAT_PLAYBOOK_PREF, next, PreferenceScope.User);
    };

    const clearPlaybook = async (): Promise<void> => {
        await selectPlaybook(noPlaybookOption());
    };

    const toggleGroup = (category: string): void => {
        setExpandedGroups(current => {
            const next = new Set(current);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

    const executePlaybookCommand = async (commandId: string): Promise<void> => {
        setOpen(false);
        await commandService.executeCommand(commandId);
    };

    const menu = open ? (
        <div className='theia-ChatInput-PlaybookMenu' data-cybervinci-menu='playbook' style={menuStyle} ref={menuRef}>
            <div className='theia-ChatInput-PlaybookMenuHeader'>
                <div className='theia-ChatInput-AgencyAgentSearch'>
                    <span className='codicon codicon-search' />
                    <input
                        ref={searchRef}
                        className='theia-ChatInput-AgencyAgentSearchInput'
                        data-cybervinci-control='playbook-search'
                        value={query}
                        placeholder={nls.localize('theia/cybervinci/ai-chat/searchPlaybooks', 'Search Playbooks')}
                        aria-label={nls.localize('theia/cybervinci/ai-chat/searchPlaybooksAria', 'Search Playbooks')}
                        onChange={event => setQuery(event.currentTarget.value)}
                        onKeyDown={event => {
                            if (event.key === 'Escape') {
                                setOpen(false);
                            }
                            event.stopPropagation();
                        }}
                    />
                    {query ? (
                        <button
                            type='button'
                            className='theia-ChatInput-AgencyAgentSearchClear'
                            aria-label={nls.localize('theia/cybervinci/ai-chat/clearPlaybookSearch', 'Clear Playbook search')}
                            onClick={() => setQuery('')}
                        >
                            <span className='codicon codicon-close' />
                        </button>
                    ) : undefined}
                </div>
                <div className='theia-ChatInput-PlaybookActions'>
                    <button
                        type='button'
                        className='theia-ChatInput-PlaybookAction'
                        data-cybervinci-action='clear-playbook'
                        aria-label={nls.localize('theia/cybervinci/ai-chat/clearPlaybookSelection', 'Clear Playbook selection')}
                        title={nls.localize('theia/cybervinci/ai-chat/clearPlaybookSelectionTitle', 'Clear Playbook selection')}
                        disabled={disabled || selectedPlaybook.id === DIRECT_CHAT_PLAYBOOK_ID}
                        onClick={clearPlaybook}
                    >
                        <span className='codicon codicon-close' />
                    </button>
                    <button
                        type='button'
                        className='theia-ChatInput-PlaybookAction'
                        data-cybervinci-action='playbook-manager'
                        aria-label={nls.localize('theia/cybervinci/ai-chat/openPlaybookManager', 'Open Playbook Manager')}
                        title={nls.localize('theia/cybervinci/ai-chat/openPlaybookManagerTitle', 'Open Playbook Manager')}
                        onClick={() => executePlaybookCommand('cybervinci.aiChat.showPlaybookManager')}
                    >
                        <span className='codicon codicon-list-tree' />
                    </button>
                    <button
                        type='button'
                        className='theia-ChatInput-PlaybookAction'
                        data-cybervinci-action='playbook-runs'
                        aria-label={nls.localize('theia/cybervinci/ai-chat/openPlaybookRuns', 'Open Playbook Runs')}
                        title={nls.localize('theia/cybervinci/ai-chat/openPlaybookRunsTitle', 'Open Playbook Runs')}
                        onClick={() => executePlaybookCommand('cybervinci.aiChat.showPlaybookRuns')}
                    >
                        <span className='codicon codicon-history' />
                    </button>
                </div>
            </div>
            {filteredGroups.length === 0 ? (
                <div className='theia-ChatInput-AgencyAgentEmpty'>
                    {nls.localize('theia/cybervinci/ai-chat/noMatchingPlaybooks', 'No matching Playbooks')}
                </div>
            ) : undefined}
            {filteredGroups.map(group => {
                const expanded = expandedGroups.has(group.category);
                return (
                    <div className='theia-ChatInput-PlaybookGroup' key={group.category}>
                        <button
                            type='button'
                            className={`theia-ChatInput-AgencyAgentGroupHeader${expanded ? ' expanded' : ''}`}
                            data-cybervinci-playbook-group={group.category}
                            onClick={() => toggleGroup(group.category)}
                        >
                            <span className={`codicon codicon-chevron-${expanded ? 'down' : 'right'}`} />
                            <span className='theia-ChatInput-AgencyAgentGroupLabel'>{formatAgentCategory(group.category)}</span>
                            <span className='theia-ChatInput-AgencyAgentGroupCount'>{group.playbooks.length}</span>
                        </button>
                        {expanded && group.playbooks.map(playbook => {
                            const warnings = playbookWarnings(playbook);
                            return (
                                <button
                                    key={playbook.id}
                                    type='button'
                                    className={`theia-ChatInput-PlaybookOption${playbook.id === selectedPlaybook.id ? ' selected' : ''}${playbook.enabled === false ? ' disabled' : ''}`}
                                    data-cybervinci-playbook-id={playbook.id}
                                    data-cybervinci-playbook-warning={warnings.join(',')}
                                    title={playbook.description}
                                    disabled={disabled || playbook.enabled === false}
                                    onClick={() => selectPlaybook(playbook)}
                                >
                                    <span className='theia-ChatInput-PlaybookName'>{playbook.name}</span>
                                    <span className='theia-ChatInput-PlaybookBadges'>
                                        {warnings.map(warning => (
                                            <span className='theia-ChatInput-PlaybookBadge' key={warning}>{warning}</span>
                                        ))}
                                    </span>
                                    {playbook.description ? <span className='theia-ChatInput-PlaybookDetail'>{playbook.description}</span> : undefined}
                                </button>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    ) : undefined;

    return (
        <span className='theia-ChatInput-PlaybookControl' ref={rootRef} onMouseEnter={hoverHandler(hoverService, title)}>
            <button
                ref={buttonRef}
                type='button'
                className={`theia-ChatInput-AiProviderButton compact theia-ChatInput-PlaybookButton${selectedPlaybook.id !== DIRECT_CHAT_PLAYBOOK_ID ? ' selected' : ''}`}
                disabled={disabled}
                data-cybervinci-control='playbook'
                title={title}
                aria-label={title}
                aria-expanded={open}
                onClick={() => setOpen(current => !current)}
            >
                <span className='codicon codicon-list-tree' />
                <span className='theia-ChatInput-AiProviderButtonLabel'>
                    {selectedPlaybook.name}
                </span>
                <span className='codicon codicon-chevron-down' />
            </button>
            {menu ? ReactDOM.createPortal(menu, document.body) : undefined}
        </span>
    );
};

function playbookWarnings(playbook: CyberVinciPlaybookSummary): string[] {
    const warnings: string[] = [];
    if (/canvas/i.test(`${playbook.id} ${playbook.category} ${playbook.name}`)) {
        warnings.push('Canvas');
    }
    if (/flow/i.test(`${playbook.id} ${playbook.category} ${playbook.name}`)) {
        warnings.push('Flow');
    }
    if (playbook.id === DIRECT_CHAT_PLAYBOOK_ID) {
        warnings.push('default');
    }
    return warnings;
}

const SavedWorkflowSelector: React.FunctionComponent<{
    flowService: FlowService;
    preferenceService: PreferenceService;
    disabled?: boolean;
    hoverService: HoverService;
}> = ({ flowService, preferenceService, disabled, hoverService }) => {
    const [workflows, setWorkflows] = React.useState<FlowWorkflow[]>([]);
    const [selected, setSelected] = React.useState(() => preferenceService.get<string>(CYBERVINCI_AI_CHAT_SAVED_WORKFLOW_PREF, '') ?? '');
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties | undefined>();
    const rootRef = React.useRef<HTMLSpanElement | null>(null);
    const buttonRef = React.useRef<HTMLButtonElement | null>(null);
    const menuRef = React.useRef<HTMLDivElement | null>(null);
    const searchRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        let disposed = false;
        flowService.listWorkflows({}).then(result => {
            if (!disposed) {
                setWorkflows(result);
            }
        }).catch(() => {
            if (!disposed) {
                setWorkflows([]);
            }
        });
        const disposable = preferenceService.onPreferenceChanged(event => {
            if (event.preferenceName === CYBERVINCI_AI_CHAT_SAVED_WORKFLOW_PREF) {
                setSelected(preferenceService.get<string>(CYBERVINCI_AI_CHAT_SAVED_WORKFLOW_PREF, '') ?? '');
            }
        });
        return () => {
            disposed = true;
            disposable.dispose();
        };
    }, [flowService, preferenceService]);

    React.useEffect(() => {
        const close = (event: MouseEvent): void => {
            const target = event.target as Node;
            if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
                return;
            }
            setOpen(false);
        };
        const closeOnEscape = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', close, true);
        document.addEventListener('keydown', closeOnEscape, true);
        return () => {
            document.removeEventListener('mousedown', close, true);
            document.removeEventListener('keydown', closeOnEscape, true);
        };
    }, []);

    React.useEffect(() => {
        if (!open) {
            return;
        }
        const handle = window.requestAnimationFrame(() => searchRef.current?.focus());
        return () => window.cancelAnimationFrame(handle);
    }, [open]);

    React.useLayoutEffect(() => {
        if (!open) {
            setMenuStyle(undefined);
            return;
        }
        const updateMenuStyle = (): void => {
            const button = buttonRef.current;
            if (!button) {
                return;
            }
            const rect = button.getBoundingClientRect();
            const menuWidth = Math.min(420, window.innerWidth - 24);
            setMenuStyle(positionCyberVinciChatMenu(rect, menuWidth, 460));
        };
        updateMenuStyle();
        window.addEventListener('resize', updateMenuStyle);
        window.addEventListener('scroll', updateMenuStyle, true);
        return () => {
            window.removeEventListener('resize', updateMenuStyle);
            window.removeEventListener('scroll', updateMenuStyle, true);
        };
    }, [open]);

    const selectedWorkflow = workflows.find(workflow => workflow.id === selected);
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filteredWorkflows = React.useMemo(() => {
        const sorted = [...workflows].sort((left, right) => flowWorkflowLabel(left).localeCompare(flowWorkflowLabel(right)));
        if (!normalizedQuery) {
            return sorted;
        }
        return sorted.filter(workflow => [
            workflow.id,
            workflow.name,
            workflow.description,
            workflow.file?.path,
            workflow.file?.format,
            ...(workflow.requires?.capabilities ?? [])
        ].filter(Boolean).some(value => String(value).toLocaleLowerCase().includes(normalizedQuery)));
    }, [normalizedQuery, workflows]);

    const title = selectedWorkflow
        ? `${flowWorkflowLabel(selectedWorkflow)} - ${flowWorkflowDetail(selectedWorkflow)}`
        : nls.localize('theia/cybervinci/ai-chat/savedFlow/title', 'Saved Flow workflow');
    const selectedLabel = selectedWorkflow
        ? flowWorkflowLabel(selectedWorkflow)
        : selected
            ? selected
            : nls.localize('theia/cybervinci/ai-chat/savedFlow/chooseAtRun', 'Choose flow');

    const selectWorkflow = async (workflowId: string): Promise<void> => {
        setSelected(workflowId);
        setOpen(false);
        setQuery('');
        await preferenceService.set(CYBERVINCI_AI_CHAT_SAVED_WORKFLOW_PREF, workflowId || undefined, PreferenceScope.User);
    };

    const menu = open ? (
        <div className='theia-ChatInput-PlaybookMenu theia-ChatInput-SavedWorkflowMenu' data-cybervinci-menu='saved-workflow' style={menuStyle} ref={menuRef}>
            <div className='theia-ChatInput-PlaybookMenuHeader'>
                <div className='theia-ChatInput-AgencyAgentSearch'>
                    <span className='codicon codicon-search' />
                    <input
                        ref={searchRef}
                        className='theia-ChatInput-AgencyAgentSearchInput'
                        data-cybervinci-control='saved-workflow-search'
                        value={query}
                        placeholder={nls.localize('theia/cybervinci/ai-chat/searchSavedFlows', 'Search saved flows')}
                        aria-label={nls.localize('theia/cybervinci/ai-chat/searchSavedFlowsAria', 'Search saved flows')}
                        onChange={event => setQuery(event.currentTarget.value)}
                        onKeyDown={event => {
                            if (event.key === 'Escape') {
                                setOpen(false);
                            }
                            event.stopPropagation();
                        }}
                    />
                    {query ? (
                        <button
                            type='button'
                            className='theia-ChatInput-AgencyAgentSearchClear'
                            aria-label={nls.localize('theia/cybervinci/ai-chat/clearSavedFlowSearch', 'Clear Saved Flow search')}
                            onClick={() => setQuery('')}
                        >
                            <span className='codicon codicon-close' />
                        </button>
                    ) : undefined}
                </div>
            </div>
            <button
                type='button'
                className={`theia-ChatInput-PlaybookOption${!selected ? ' selected' : ''}`}
                data-cybervinci-saved-workflow-id=''
                onClick={() => selectWorkflow('')}
            >
                <span className='theia-ChatInput-PlaybookName'>{nls.localize('theia/cybervinci/ai-chat/savedFlow/chooseAtRun', 'Choose flow')}</span>
                <span className='theia-ChatInput-PlaybookBadges'>
                    <span className='theia-ChatInput-PlaybookBadge'>runtime pick</span>
                </span>
                <span className='theia-ChatInput-PlaybookDetail'>Ask Flow to choose a saved workflow at run time.</span>
            </button>
            {filteredWorkflows.length === 0 ? (
                <div className='theia-ChatInput-AgencyAgentEmpty'>
                    {nls.localize('theia/cybervinci/ai-chat/noMatchingSavedFlows', 'No matching Saved Flows')}
                </div>
            ) : undefined}
            {filteredWorkflows.map(workflow => {
                const badges = flowWorkflowBadges(workflow);
                return (
                    <button
                        key={workflow.id}
                        type='button'
                        className={`theia-ChatInput-PlaybookOption theia-ChatInput-SavedWorkflowOption${workflow.id === selected ? ' selected' : ''}`}
                        data-cybervinci-saved-workflow-id={workflow.id}
                        title={flowWorkflowDetail(workflow)}
                        disabled={disabled}
                        onClick={() => selectWorkflow(workflow.id)}
                    >
                        <span className='theia-ChatInput-PlaybookName'>{flowWorkflowLabel(workflow)}</span>
                        <span className='theia-ChatInput-PlaybookBadges'>
                            {badges.map(badge => (
                                <span className='theia-ChatInput-PlaybookBadge' key={badge}>{badge}</span>
                            ))}
                        </span>
                        <span className='theia-ChatInput-PlaybookDetail'>{flowWorkflowDetail(workflow)}</span>
                    </button>
                );
            })}
        </div>
    ) : undefined;

    return (
        <span className='theia-ChatInput-SavedWorkflowControl' data-cybervinci-control='saved-workflow' ref={rootRef} onMouseEnter={hoverHandler(hoverService, title)}>
            <button
                ref={buttonRef}
                type='button'
                className={`theia-ChatInput-AiProviderButton compact theia-ChatInput-SavedWorkflowButton${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
                disabled={disabled}
                title={title}
                aria-label={title}
                aria-expanded={open}
                onClick={() => setOpen(current => !current)}
            >
                <span className='codicon codicon-git-branch' />
                <span className='theia-ChatInput-AiProviderButtonLabel'>{selectedLabel}</span>
                <span className='codicon codicon-chevron-down' />
            </button>
            {menu ? ReactDOM.createPortal(menu, document.body) : undefined}
        </span>
    );
};

function flowWorkflowLabel(workflow: FlowWorkflow): string {
    return workflow.name?.trim() || workflow.id;
}

function flowWorkflowDetail(workflow: FlowWorkflow): string {
    const stateCount = Object.keys(workflow.states ?? {}).length;
    const transitionCount = workflow.transitions?.length ?? 0;
    const capabilities = workflow.requires?.capabilities?.length
        ? `capabilities=${workflow.requires.capabilities.join(', ')}`
        : 'capabilities=none';
    const file = workflow.file?.path
        ? `${workflow.file.path}${workflow.file.editable === false ? ' readonly' : ''}`
        : 'no file';
    return [
        workflow.description,
        `${stateCount} state(s)`,
        `${transitionCount} transition(s)`,
        capabilities,
        file
    ].filter(Boolean).join(' | ');
}

function flowWorkflowBadges(workflow: FlowWorkflow): string[] {
    const badges = [
        `${Object.keys(workflow.states ?? {}).length} states`,
        `${workflow.transitions?.length ?? 0} edges`
    ];
    if (workflow.file?.format && workflow.file.format !== 'unknown') {
        badges.push(workflow.file.format);
    }
    if (workflow.file?.editable === false) {
        badges.push('readonly');
    }
    if (workflow.requires?.capabilities?.length) {
        badges.push(`${workflow.requires.capabilities.length} caps`);
    }
    return badges;
}
