"use strict";
// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyberVinciChatExperienceControls = exports.CyberVinciChatInputOptionsContribution = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@cybervinci/ai-runtime/lib/common");
const common_2 = require("@cybervinci/flow/lib/common");
const core_1 = require("@theia/core");
const preferences_1 = require("@theia/core/lib/common/preferences");
const nls_1 = require("@theia/core/lib/common/nls");
const inversify_1 = require("@theia/core/shared/inversify");
const React = require("@theia/core/shared/react");
const ReactDOM = require("@theia/core/shared/react-dom");
const common_3 = require("../common");
const cybervinci_ai_chat_experience_preferences_1 = require("./cybervinci-ai-chat-experience-preferences");
const cybervinci_chat_ai_execution_controls_1 = require("./cybervinci-chat-ai-execution-controls");
let CyberVinciChatInputOptionsContribution = class CyberVinciChatInputOptionsContribution {
    render(context) {
        const flowMode = this.getFlowMode();
        return (React.createElement(exports.CyberVinciChatExperienceControls, { key: 'cybervinci-chat-experience-controls', service: this.experienceService, aiRuntimeService: this.aiRuntimeService, flowService: this.flowService, preferenceService: this.preferenceService, commandService: this.commandService, flowMode: flowMode, disabled: !context.enabled || context.pending, hoverService: context.hoverService }));
    }
    getFlowMode() {
        return (0, cybervinci_chat_ai_execution_controls_1.normalizeCyberVinciFlowChatMode)(this.preferenceService.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_FLOW_MODE_PREF, 'chat'));
    }
};
exports.CyberVinciChatInputOptionsContribution = CyberVinciChatInputOptionsContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(common_3.CyberVinciAiChatExperienceService),
    tslib_1.__metadata("design:type", Object)
], CyberVinciChatInputOptionsContribution.prototype, "experienceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(preferences_1.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], CyberVinciChatInputOptionsContribution.prototype, "preferenceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.CommandService),
    tslib_1.__metadata("design:type", Object)
], CyberVinciChatInputOptionsContribution.prototype, "commandService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_2.FlowService),
    (0, inversify_1.optional)(),
    tslib_1.__metadata("design:type", Object)
], CyberVinciChatInputOptionsContribution.prototype, "flowService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.CyberVinciAiRuntimeService),
    (0, inversify_1.optional)(),
    tslib_1.__metadata("design:type", Object)
], CyberVinciChatInputOptionsContribution.prototype, "aiRuntimeService", void 0);
exports.CyberVinciChatInputOptionsContribution = CyberVinciChatInputOptionsContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], CyberVinciChatInputOptionsContribution);
const CyberVinciChatExperienceControls = ({ service, aiRuntimeService, flowService, preferenceService, commandService, flowMode, disabled, hoverService }) => {
    const [effectiveFlowMode, setEffectiveFlowMode] = React.useState(() => (0, cybervinci_chat_ai_execution_controls_1.normalizeCyberVinciFlowChatMode)(preferenceService.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_FLOW_MODE_PREF, flowMode)));
    React.useEffect(() => {
        const disposable = preferenceService.onPreferenceChanged(event => {
            if (event.preferenceName === cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_FLOW_MODE_PREF) {
                setEffectiveFlowMode((0, cybervinci_chat_ai_execution_controls_1.normalizeCyberVinciFlowChatMode)(preferenceService.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_FLOW_MODE_PREF, 'chat')));
            }
        });
        return () => disposable.dispose();
    }, [preferenceService]);
    return (React.createElement("span", { key: 'cybervinci-chat-experience-controls', className: 'cybervinci-chat-experience-controls', "data-cybervinci-contribution": 'true', "data-cybervinci-toolbar": 'ai-chat' },
        React.createElement(AgentProfileSelector, { service: service, preferenceService: preferenceService, commandService: commandService, disabled: disabled, hoverService: hoverService }),
        React.createElement(cybervinci_chat_ai_execution_controls_1.CyberVinciChatModeSelector, { preferenceService: preferenceService, disabled: disabled, hoverService: hoverService }),
        React.createElement(PlaybookSelector, { service: service, preferenceService: preferenceService, commandService: commandService, disabled: disabled, hoverService: hoverService }),
        React.createElement(cybervinci_chat_ai_execution_controls_1.CyberVinciChatWorkflowRoutingSelector, { preferenceService: preferenceService, currentMode: effectiveFlowMode, disabled: disabled, hoverService: hoverService, onModeChange: setEffectiveFlowMode }),
        effectiveFlowMode === 'saved' && flowService && (React.createElement(SavedWorkflowSelector, { flowService: flowService, preferenceService: preferenceService, disabled: disabled, hoverService: hoverService })),
        effectiveFlowMode !== 'saved' && (React.createElement(cybervinci_chat_ai_execution_controls_1.CyberVinciChatAiExecutionControls, { aiRuntimeService: aiRuntimeService, preferenceService: preferenceService, commandService: commandService, flowMode: effectiveFlowMode, disabled: disabled, hoverService: hoverService })),
        effectiveFlowMode === 'chat' && (React.createElement(cybervinci_chat_ai_execution_controls_1.CyberVinciChatVirtualReasoningSelector, { preferenceService: preferenceService, disabled: disabled, hoverService: hoverService }))));
};
exports.CyberVinciChatExperienceControls = CyberVinciChatExperienceControls;
const AgentProfileSelector = ({ service, preferenceService, commandService, disabled, hoverService }) => {
    const [agents, setAgents] = React.useState([]);
    const [selected, setSelected] = React.useState(() => preferenceService.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_AGENT_PROFILE_PREF, '') ?? '');
    const [favorites, setFavorites] = React.useState(() => normalizeStringArrayPreference(preferenceService.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_AGENT_PROFILE_FAVORITES_PREF, [])));
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const [expandedGroups, setExpandedGroups] = React.useState(() => new Set());
    const [menuStyle, setMenuStyle] = React.useState();
    const rootRef = React.useRef(null);
    const buttonRef = React.useRef(null);
    const menuRef = React.useRef(null);
    const searchRef = React.useRef(null);
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
            if (event.preferenceName === cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_AGENT_PROFILE_PREF) {
                setSelected(preferenceService.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_AGENT_PROFILE_PREF, '') ?? '');
            }
            if (event.preferenceName === cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_AGENT_PROFILE_FAVORITES_PREF) {
                setFavorites(normalizeStringArrayPreference(preferenceService.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_AGENT_PROFILE_FAVORITES_PREF, [])));
            }
        });
        return () => {
            disposed = true;
            disposable.dispose();
        };
    }, [service, preferenceService]);
    React.useEffect(() => {
        const close = (event) => {
            const target = event.target;
            if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
                return;
            }
            setOpen(false);
        };
        const closeOnEscape = (event) => {
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
        const updateMenuStyle = () => {
            const button = buttonRef.current;
            if (!button) {
                return;
            }
            const rect = button.getBoundingClientRect();
            const menuWidth = Math.min(360, window.innerWidth - 24);
            setMenuStyle((0, cybervinci_chat_ai_execution_controls_1.positionCyberVinciChatMenu)(rect, menuWidth, 460));
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
        const byCategory = new Map();
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
        : nls_1.nls.localize('theia/cybervinci/ai-chat/noAgentProfileSelected', 'No Agent profile selected');
    const selectAgent = async (agentId) => {
        setSelected(agentId);
        setOpen(false);
        setQuery('');
        await preferenceService.set(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_AGENT_PROFILE_PREF, agentId || undefined, preferences_1.PreferenceScope.User);
    };
    const refreshAgents = async () => {
        const result = await service.listAgents();
        setAgents(result);
    };
    const openAgent = async (agent) => {
        const result = await service.getAgentProfilePath(agent.id);
        if (result.ok && result.path) {
            await commandService.executeCommand('cybervinci.aiChat.openCatalogPath', result.path);
        }
    };
    const duplicateAgent = async (agent) => {
        const result = await service.duplicateAgentProfileToUser(agent.id);
        if (result.ok) {
            await refreshAgents();
            if (result.id) {
                setSelected(result.id);
                await preferenceService.set(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_AGENT_PROFILE_PREF, result.id, preferences_1.PreferenceScope.User);
            }
            if (result.path) {
                await commandService.executeCommand('cybervinci.aiChat.openCatalogPath', result.path);
            }
        }
    };
    const toggleFavorite = async (agent) => {
        const next = favorites.includes(agent.id)
            ? favorites.filter(id => id !== agent.id)
            : [...favorites, agent.id];
        setFavorites(next);
        await preferenceService.set(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_AGENT_PROFILE_FAVORITES_PREF, next, preferences_1.PreferenceScope.User);
    };
    const toggleGroup = (category) => {
        setExpandedGroups(current => {
            const next = new Set(current);
            if (next.has(category)) {
                next.delete(category);
            }
            else {
                next.add(category);
            }
            return next;
        });
    };
    const menu = open ? (React.createElement("div", { className: 'theia-ChatInput-AgencyAgentMenu', "data-cybervinci-menu": 'agent-profile', style: menuStyle, ref: menuRef },
        React.createElement("div", { className: 'theia-ChatInput-AgencyAgentSearch' },
            React.createElement("span", { className: 'codicon codicon-search' }),
            React.createElement("input", { ref: searchRef, className: 'theia-ChatInput-AgencyAgentSearchInput', "data-cybervinci-control": 'agent-profile-search', value: query, placeholder: nls_1.nls.localize('theia/cybervinci/ai-chat/searchAgents', 'Search Agents'), "aria-label": nls_1.nls.localize('theia/cybervinci/ai-chat/searchAgentsAria', 'Search Agents'), onChange: event => setQuery(event.currentTarget.value), onKeyDown: event => {
                    if (event.key === 'Escape') {
                        setOpen(false);
                    }
                    event.stopPropagation();
                } }),
            query ? (React.createElement("button", { type: 'button', className: 'theia-ChatInput-AgencyAgentSearchClear', "aria-label": nls_1.nls.localize('theia/cybervinci/ai-chat/clearAgentSearch', 'Clear Agent search'), onClick: () => setQuery('') },
                React.createElement("span", { className: 'codicon codicon-close' }))) : undefined),
        selectedAgent ? (React.createElement("button", { type: 'button', className: 'theia-ChatInput-AgencyAgentOption no-agent', "data-cybervinci-agent-id": '', onClick: () => selectAgent('') },
            React.createElement("span", { className: 'theia-ChatInput-AgencyAgentName' }, nls_1.nls.localize('theia/cybervinci/ai-chat/clearAgentProfile', 'Clear Agent profile')))) : undefined,
        filteredGroups.length === 0 ? (React.createElement("div", { className: 'theia-ChatInput-AgencyAgentEmpty' }, nls_1.nls.localize('theia/cybervinci/ai-chat/noMatchingAgents', 'No matching Agents'))) : undefined,
        filteredGroups.map(group => {
            const expanded = expandedGroups.has(group.category);
            return (React.createElement("div", { className: 'theia-ChatInput-AgencyAgentGroup', key: group.category },
                React.createElement("button", { type: 'button', className: `theia-ChatInput-AgencyAgentGroupHeader${expanded ? ' expanded' : ''}`, "data-cybervinci-agent-group": group.category, onClick: () => toggleGroup(group.category) },
                    React.createElement("span", { className: `codicon codicon-chevron-${expanded ? 'down' : 'right'}` }),
                    React.createElement("span", { className: 'theia-ChatInput-AgencyAgentGroupLabel' }, formatAgentCategory(group.category)),
                    React.createElement("span", { className: 'theia-ChatInput-AgencyAgentGroupCount' }, group.agents.length)),
                expanded && group.agents.map(agent => (React.createElement("div", { key: agent.id, className: `theia-ChatInput-AgencyAgentOptionRow${agent.id === selected ? ' selected' : ''}`, "data-cybervinci-agent-id": agent.id },
                    React.createElement("button", { type: 'button', className: 'theia-ChatInput-AgencyAgentOption agent', title: agent.description, onClick: () => selectAgent(agent.id) },
                        React.createElement("span", { className: 'theia-ChatInput-AgencyAgentName' }, agent.name),
                        agent.description ? React.createElement("span", { className: 'theia-ChatInput-AgencyAgentDetail' }, agent.description) : undefined,
                        React.createElement("span", { className: 'theia-ChatInput-AgencyAgentOrigin' }, agent.relativePath)),
                    React.createElement("span", { className: 'theia-ChatInput-AgencyAgentActions' },
                        React.createElement("button", { type: 'button', className: `theia-ChatInput-AgencyAgentAction${favorites.includes(agent.id) ? ' active' : ''}`, "data-cybervinci-agent-action": 'favorite', "aria-label": favorites.includes(agent.id)
                                ? nls_1.nls.localize('theia/cybervinci/ai-chat/unfavoriteAgent', 'Remove Agent from favorites')
                                : nls_1.nls.localize('theia/cybervinci/ai-chat/favoriteAgent', 'Add Agent to favorites'), title: favorites.includes(agent.id)
                                ? nls_1.nls.localize('theia/cybervinci/ai-chat/unfavoriteAgentTitle', 'Remove from favorites')
                                : nls_1.nls.localize('theia/cybervinci/ai-chat/favoriteAgentTitle', 'Add to favorites'), onClick: event => {
                                event.stopPropagation();
                                toggleFavorite(agent);
                            } },
                            React.createElement("span", { className: `codicon codicon-star-${favorites.includes(agent.id) ? 'full' : 'empty'}` })),
                        React.createElement("button", { type: 'button', className: 'theia-ChatInput-AgencyAgentAction', "data-cybervinci-agent-action": 'edit', "aria-label": nls_1.nls.localize('theia/cybervinci/ai-chat/editAgentProfile', 'Open Agent profile source'), title: nls_1.nls.localize('theia/cybervinci/ai-chat/editAgentProfileTitle', 'Open source markdown'), onClick: event => {
                                event.stopPropagation();
                                openAgent(agent);
                            } },
                            React.createElement("span", { className: 'codicon codicon-go-to-file' })),
                        React.createElement("button", { type: 'button', className: 'theia-ChatInput-AgencyAgentAction', "data-cybervinci-agent-action": 'duplicate', "aria-label": nls_1.nls.localize('theia/cybervinci/ai-chat/duplicateAgentProfile', 'Duplicate Agent profile'), title: nls_1.nls.localize('theia/cybervinci/ai-chat/duplicateAgentProfileTitle', 'Duplicate into editable _user profile'), onClick: event => {
                                event.stopPropagation();
                                duplicateAgent(agent);
                            } },
                            React.createElement("span", { className: 'codicon codicon-copy' }))))))));
        }))) : undefined;
    return (React.createElement("span", { className: 'theia-ChatInput-AgentProfileControl', ref: rootRef, onMouseEnter: (0, cybervinci_chat_ai_execution_controls_1.hoverHandler)(hoverService, title) },
        React.createElement("button", { ref: buttonRef, type: 'button', className: `theia-ChatInput-AiProviderButton compact theia-ChatInput-AgentProfileButton${selected ? ' selected' : ''}`, disabled: disabled, "data-cybervinci-control": 'agent-profile', title: title, "aria-label": title, "aria-expanded": open, onClick: () => setOpen(current => !current) },
            React.createElement("span", { className: 'codicon codicon-account' }),
            React.createElement("span", { className: 'theia-ChatInput-AiProviderButtonLabel' }, selectedAgent?.name ?? nls_1.nls.localize('theia/cybervinci/ai-chat/agentProfile', 'Agent')),
            React.createElement("span", { className: 'codicon codicon-chevron-down' })),
        menu ? ReactDOM.createPortal(menu, document.body) : undefined));
};
function formatAgentCategory(category) {
    if (category === 'favorites') {
        return 'Favorites';
    }
    return category
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase());
}
function normalizeStringArrayPreference(value) {
    return Array.isArray(value)
        ? value.filter((item) => typeof item === 'string' && !!item.trim())
        : [];
}
const DIRECT_CHAT_PLAYBOOK_ID = 'direct-chat';
function noPlaybookOption() {
    return {
        id: DIRECT_CHAT_PLAYBOOK_ID,
        name: nls_1.nls.localize('theia/cybervinci/ai-chat/noPlaybook', 'No Playbook'),
        category: 'Chat',
        enabled: true,
        description: nls_1.nls.localize('theia/cybervinci/ai-chat/noPlaybookDescription', 'Clear the selected Playbook and use the normal chat route.')
    };
}
function normalizePlaybookForSelector(playbook) {
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
const PlaybookSelector = ({ service, preferenceService, commandService, disabled, hoverService }) => {
    const [playbooks, setPlaybooks] = React.useState([]);
    const [selected, setSelected] = React.useState(() => preferenceService.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_PLAYBOOK_PREF, DIRECT_CHAT_PLAYBOOK_ID) ?? DIRECT_CHAT_PLAYBOOK_ID);
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const [expandedGroups, setExpandedGroups] = React.useState(() => new Set(['Chat']));
    const [menuStyle, setMenuStyle] = React.useState();
    const rootRef = React.useRef(null);
    const buttonRef = React.useRef(null);
    const menuRef = React.useRef(null);
    const searchRef = React.useRef(null);
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
            if (event.preferenceName === cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_PLAYBOOK_PREF) {
                setSelected(preferenceService.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_PLAYBOOK_PREF, DIRECT_CHAT_PLAYBOOK_ID) ?? DIRECT_CHAT_PLAYBOOK_ID);
            }
        });
        return () => {
            disposed = true;
            disposable.dispose();
        };
    }, [service, preferenceService]);
    React.useEffect(() => {
        const close = (event) => {
            const target = event.target;
            if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
                return;
            }
            setOpen(false);
        };
        const closeOnEscape = (event) => {
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
        const updateMenuStyle = () => {
            const button = buttonRef.current;
            if (!button) {
                return;
            }
            const rect = button.getBoundingClientRect();
            const menuWidth = Math.min(420, window.innerWidth - 24);
            setMenuStyle((0, cybervinci_chat_ai_execution_controls_1.positionCyberVinciChatMenu)(rect, menuWidth, 460));
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
    const selectedPlaybook = effectivePlaybooks.find(playbook => playbook.id === selected && playbook.enabled !== false) ??
        effectivePlaybooks.find(playbook => playbook.id === DIRECT_CHAT_PLAYBOOK_ID) ??
        effectivePlaybooks.find(playbook => playbook.enabled !== false) ??
        effectivePlaybooks[0];
    const menuPlaybooks = React.useMemo(() => effectivePlaybooks.filter(playbook => playbook.enabled !== false), [effectivePlaybooks]);
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const groupedPlaybooks = React.useMemo(() => {
        const byCategory = new Map();
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
        : nls_1.nls.localize('theia/cybervinci/ai-chat/playbook/title', 'Playbook');
    const selectPlaybook = async (playbook) => {
        if (playbook.enabled === false) {
            return;
        }
        const next = playbook.id || DIRECT_CHAT_PLAYBOOK_ID;
        setSelected(next);
        setOpen(false);
        setQuery('');
        await preferenceService.set(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_PLAYBOOK_PREF, next, preferences_1.PreferenceScope.User);
    };
    const clearPlaybook = async () => {
        await selectPlaybook(noPlaybookOption());
    };
    const toggleGroup = (category) => {
        setExpandedGroups(current => {
            const next = new Set(current);
            if (next.has(category)) {
                next.delete(category);
            }
            else {
                next.add(category);
            }
            return next;
        });
    };
    const executePlaybookCommand = async (commandId) => {
        setOpen(false);
        await commandService.executeCommand(commandId);
    };
    const menu = open ? (React.createElement("div", { className: 'theia-ChatInput-PlaybookMenu', "data-cybervinci-menu": 'playbook', style: menuStyle, ref: menuRef },
        React.createElement("div", { className: 'theia-ChatInput-PlaybookMenuHeader' },
            React.createElement("div", { className: 'theia-ChatInput-AgencyAgentSearch' },
                React.createElement("span", { className: 'codicon codicon-search' }),
                React.createElement("input", { ref: searchRef, className: 'theia-ChatInput-AgencyAgentSearchInput', "data-cybervinci-control": 'playbook-search', value: query, placeholder: nls_1.nls.localize('theia/cybervinci/ai-chat/searchPlaybooks', 'Search Playbooks'), "aria-label": nls_1.nls.localize('theia/cybervinci/ai-chat/searchPlaybooksAria', 'Search Playbooks'), onChange: event => setQuery(event.currentTarget.value), onKeyDown: event => {
                        if (event.key === 'Escape') {
                            setOpen(false);
                        }
                        event.stopPropagation();
                    } }),
                query ? (React.createElement("button", { type: 'button', className: 'theia-ChatInput-AgencyAgentSearchClear', "aria-label": nls_1.nls.localize('theia/cybervinci/ai-chat/clearPlaybookSearch', 'Clear Playbook search'), onClick: () => setQuery('') },
                    React.createElement("span", { className: 'codicon codicon-close' }))) : undefined),
            React.createElement("div", { className: 'theia-ChatInput-PlaybookActions' },
                React.createElement("button", { type: 'button', className: 'theia-ChatInput-PlaybookAction', "data-cybervinci-action": 'clear-playbook', "aria-label": nls_1.nls.localize('theia/cybervinci/ai-chat/clearPlaybookSelection', 'Clear Playbook selection'), title: nls_1.nls.localize('theia/cybervinci/ai-chat/clearPlaybookSelectionTitle', 'Clear Playbook selection'), disabled: disabled || selectedPlaybook.id === DIRECT_CHAT_PLAYBOOK_ID, onClick: clearPlaybook },
                    React.createElement("span", { className: 'codicon codicon-close' })),
                React.createElement("button", { type: 'button', className: 'theia-ChatInput-PlaybookAction', "data-cybervinci-action": 'playbook-manager', "aria-label": nls_1.nls.localize('theia/cybervinci/ai-chat/openPlaybookManager', 'Open Playbook Manager'), title: nls_1.nls.localize('theia/cybervinci/ai-chat/openPlaybookManagerTitle', 'Open Playbook Manager'), onClick: () => executePlaybookCommand('cybervinci.aiChat.showPlaybookManager') },
                    React.createElement("span", { className: 'codicon codicon-list-tree' })),
                React.createElement("button", { type: 'button', className: 'theia-ChatInput-PlaybookAction', "data-cybervinci-action": 'playbook-runs', "aria-label": nls_1.nls.localize('theia/cybervinci/ai-chat/openPlaybookRuns', 'Open Playbook Runs'), title: nls_1.nls.localize('theia/cybervinci/ai-chat/openPlaybookRunsTitle', 'Open Playbook Runs'), onClick: () => executePlaybookCommand('cybervinci.aiChat.showPlaybookRuns') },
                    React.createElement("span", { className: 'codicon codicon-history' })))),
        filteredGroups.length === 0 ? (React.createElement("div", { className: 'theia-ChatInput-AgencyAgentEmpty' }, nls_1.nls.localize('theia/cybervinci/ai-chat/noMatchingPlaybooks', 'No matching Playbooks'))) : undefined,
        filteredGroups.map(group => {
            const expanded = expandedGroups.has(group.category);
            return (React.createElement("div", { className: 'theia-ChatInput-PlaybookGroup', key: group.category },
                React.createElement("button", { type: 'button', className: `theia-ChatInput-AgencyAgentGroupHeader${expanded ? ' expanded' : ''}`, "data-cybervinci-playbook-group": group.category, onClick: () => toggleGroup(group.category) },
                    React.createElement("span", { className: `codicon codicon-chevron-${expanded ? 'down' : 'right'}` }),
                    React.createElement("span", { className: 'theia-ChatInput-AgencyAgentGroupLabel' }, formatAgentCategory(group.category)),
                    React.createElement("span", { className: 'theia-ChatInput-AgencyAgentGroupCount' }, group.playbooks.length)),
                expanded && group.playbooks.map(playbook => {
                    const warnings = playbookWarnings(playbook);
                    return (React.createElement("button", { key: playbook.id, type: 'button', className: `theia-ChatInput-PlaybookOption${playbook.id === selectedPlaybook.id ? ' selected' : ''}${playbook.enabled === false ? ' disabled' : ''}`, "data-cybervinci-playbook-id": playbook.id, "data-cybervinci-playbook-warning": warnings.join(','), title: playbook.description, disabled: disabled || playbook.enabled === false, onClick: () => selectPlaybook(playbook) },
                        React.createElement("span", { className: 'theia-ChatInput-PlaybookName' }, playbook.name),
                        React.createElement("span", { className: 'theia-ChatInput-PlaybookBadges' }, warnings.map(warning => (React.createElement("span", { className: 'theia-ChatInput-PlaybookBadge', key: warning }, warning)))),
                        playbook.description ? React.createElement("span", { className: 'theia-ChatInput-PlaybookDetail' }, playbook.description) : undefined));
                })));
        }))) : undefined;
    return (React.createElement("span", { className: 'theia-ChatInput-PlaybookControl', ref: rootRef, onMouseEnter: (0, cybervinci_chat_ai_execution_controls_1.hoverHandler)(hoverService, title) },
        React.createElement("button", { ref: buttonRef, type: 'button', className: `theia-ChatInput-AiProviderButton compact theia-ChatInput-PlaybookButton${selectedPlaybook.id !== DIRECT_CHAT_PLAYBOOK_ID ? ' selected' : ''}`, disabled: disabled, "data-cybervinci-control": 'playbook', title: title, "aria-label": title, "aria-expanded": open, onClick: () => setOpen(current => !current) },
            React.createElement("span", { className: 'codicon codicon-list-tree' }),
            React.createElement("span", { className: 'theia-ChatInput-AiProviderButtonLabel' }, selectedPlaybook.name),
            React.createElement("span", { className: 'codicon codicon-chevron-down' })),
        menu ? ReactDOM.createPortal(menu, document.body) : undefined));
};
function playbookWarnings(playbook) {
    const warnings = [];
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
const SavedWorkflowSelector = ({ flowService, preferenceService, disabled, hoverService }) => {
    const [workflows, setWorkflows] = React.useState([]);
    const [selected, setSelected] = React.useState(() => preferenceService.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_SAVED_WORKFLOW_PREF, '') ?? '');
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const [menuStyle, setMenuStyle] = React.useState();
    const rootRef = React.useRef(null);
    const buttonRef = React.useRef(null);
    const menuRef = React.useRef(null);
    const searchRef = React.useRef(null);
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
            if (event.preferenceName === cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_SAVED_WORKFLOW_PREF) {
                setSelected(preferenceService.get(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_SAVED_WORKFLOW_PREF, '') ?? '');
            }
        });
        return () => {
            disposed = true;
            disposable.dispose();
        };
    }, [flowService, preferenceService]);
    React.useEffect(() => {
        const close = (event) => {
            const target = event.target;
            if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
                return;
            }
            setOpen(false);
        };
        const closeOnEscape = (event) => {
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
        const updateMenuStyle = () => {
            const button = buttonRef.current;
            if (!button) {
                return;
            }
            const rect = button.getBoundingClientRect();
            const menuWidth = Math.min(420, window.innerWidth - 24);
            setMenuStyle((0, cybervinci_chat_ai_execution_controls_1.positionCyberVinciChatMenu)(rect, menuWidth, 460));
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
        : nls_1.nls.localize('theia/cybervinci/ai-chat/savedFlow/title', 'Saved Flow workflow');
    const selectedLabel = selectedWorkflow
        ? flowWorkflowLabel(selectedWorkflow)
        : selected
            ? selected
            : nls_1.nls.localize('theia/cybervinci/ai-chat/savedFlow/chooseAtRun', 'Choose flow');
    const selectWorkflow = async (workflowId) => {
        setSelected(workflowId);
        setOpen(false);
        setQuery('');
        await preferenceService.set(cybervinci_ai_chat_experience_preferences_1.CYBERVINCI_AI_CHAT_SAVED_WORKFLOW_PREF, workflowId || undefined, preferences_1.PreferenceScope.User);
    };
    const menu = open ? (React.createElement("div", { className: 'theia-ChatInput-PlaybookMenu theia-ChatInput-SavedWorkflowMenu', "data-cybervinci-menu": 'saved-workflow', style: menuStyle, ref: menuRef },
        React.createElement("div", { className: 'theia-ChatInput-PlaybookMenuHeader' },
            React.createElement("div", { className: 'theia-ChatInput-AgencyAgentSearch' },
                React.createElement("span", { className: 'codicon codicon-search' }),
                React.createElement("input", { ref: searchRef, className: 'theia-ChatInput-AgencyAgentSearchInput', "data-cybervinci-control": 'saved-workflow-search', value: query, placeholder: nls_1.nls.localize('theia/cybervinci/ai-chat/searchSavedFlows', 'Search saved flows'), "aria-label": nls_1.nls.localize('theia/cybervinci/ai-chat/searchSavedFlowsAria', 'Search saved flows'), onChange: event => setQuery(event.currentTarget.value), onKeyDown: event => {
                        if (event.key === 'Escape') {
                            setOpen(false);
                        }
                        event.stopPropagation();
                    } }),
                query ? (React.createElement("button", { type: 'button', className: 'theia-ChatInput-AgencyAgentSearchClear', "aria-label": nls_1.nls.localize('theia/cybervinci/ai-chat/clearSavedFlowSearch', 'Clear Saved Flow search'), onClick: () => setQuery('') },
                    React.createElement("span", { className: 'codicon codicon-close' }))) : undefined)),
        React.createElement("button", { type: 'button', className: `theia-ChatInput-PlaybookOption${!selected ? ' selected' : ''}`, "data-cybervinci-saved-workflow-id": '', onClick: () => selectWorkflow('') },
            React.createElement("span", { className: 'theia-ChatInput-PlaybookName' }, nls_1.nls.localize('theia/cybervinci/ai-chat/savedFlow/chooseAtRun', 'Choose flow')),
            React.createElement("span", { className: 'theia-ChatInput-PlaybookBadges' },
                React.createElement("span", { className: 'theia-ChatInput-PlaybookBadge' }, "runtime pick")),
            React.createElement("span", { className: 'theia-ChatInput-PlaybookDetail' }, "Ask Flow to choose a saved workflow at run time.")),
        filteredWorkflows.length === 0 ? (React.createElement("div", { className: 'theia-ChatInput-AgencyAgentEmpty' }, nls_1.nls.localize('theia/cybervinci/ai-chat/noMatchingSavedFlows', 'No matching Saved Flows'))) : undefined,
        filteredWorkflows.map(workflow => {
            const badges = flowWorkflowBadges(workflow);
            return (React.createElement("button", { key: workflow.id, type: 'button', className: `theia-ChatInput-PlaybookOption theia-ChatInput-SavedWorkflowOption${workflow.id === selected ? ' selected' : ''}`, "data-cybervinci-saved-workflow-id": workflow.id, title: flowWorkflowDetail(workflow), disabled: disabled, onClick: () => selectWorkflow(workflow.id) },
                React.createElement("span", { className: 'theia-ChatInput-PlaybookName' }, flowWorkflowLabel(workflow)),
                React.createElement("span", { className: 'theia-ChatInput-PlaybookBadges' }, badges.map(badge => (React.createElement("span", { className: 'theia-ChatInput-PlaybookBadge', key: badge }, badge)))),
                React.createElement("span", { className: 'theia-ChatInput-PlaybookDetail' }, flowWorkflowDetail(workflow))));
        }))) : undefined;
    return (React.createElement("span", { className: 'theia-ChatInput-SavedWorkflowControl', "data-cybervinci-control": 'saved-workflow', ref: rootRef, onMouseEnter: (0, cybervinci_chat_ai_execution_controls_1.hoverHandler)(hoverService, title) },
        React.createElement("button", { ref: buttonRef, type: 'button', className: `theia-ChatInput-AiProviderButton compact theia-ChatInput-SavedWorkflowButton${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}`, disabled: disabled, title: title, "aria-label": title, "aria-expanded": open, onClick: () => setOpen(current => !current) },
            React.createElement("span", { className: 'codicon codicon-git-branch' }),
            React.createElement("span", { className: 'theia-ChatInput-AiProviderButtonLabel' }, selectedLabel),
            React.createElement("span", { className: 'codicon codicon-chevron-down' })),
        menu ? ReactDOM.createPortal(menu, document.body) : undefined));
};
function flowWorkflowLabel(workflow) {
    return workflow.name?.trim() || workflow.id;
}
function flowWorkflowDetail(workflow) {
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
function flowWorkflowBadges(workflow) {
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
//# sourceMappingURL=cybervinci-chat-input-options-contribution.js.map