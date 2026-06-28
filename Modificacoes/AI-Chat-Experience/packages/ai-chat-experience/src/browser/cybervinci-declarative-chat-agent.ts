// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import {
    AbstractStreamParsingChatAgent,
    ChatAgent,
    ChatAgentLocation,
    ChatMode,
    ChatSessionContext,
    MutableChatRequestModel,
    SystemMessageDescription
} from '@theia/ai-chat/lib/common';
import {
    AgentSpecificVariables,
    AIVariableContext,
    LanguageModelRequirement,
    PromptVariantSet,
    ToolInvocationRegistry
} from '@theia/ai-core';
import { ErrorChatResponseContentImpl } from '@theia/ai-chat/lib/common/chat-model';
import { inject, injectable, optional } from '@theia/core/shared/inversify';
import {
    CyberVinciDeclarativeChatAgent,
    CyberVinciDeclarativeChatMode,
    CyberVinciDeclarativeLanguageModelRequirement,
    CyberVinciDeclarativePromptVariant
} from '../common';
import { CyberVinciNativeTheiaAgentAdapter } from './cybervinci-native-agent-adapter';
import { CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX, CyberVinciPlaybookRuntime } from './cybervinci-playbook-runtime';

const DEFAULT_LANGUAGE_MODEL_REQUIREMENT: LanguageModelRequirement = {
    purpose: 'chat',
    identifier: 'default/code'
};

@injectable()
export class CyberVinciDeclarativePromptChatAgent extends AbstractStreamParsingChatAgent {

    @inject(ToolInvocationRegistry) @optional()
    protected readonly toolInvocationRegistry: ToolInvocationRegistry | undefined;

    id = 'CyberVinciDeclarativePromptAgent';
    name = 'CyberVinci Declarative Prompt Agent';
    override description = '';
    override iconClass = 'codicon codicon-copilot';
    override tags = ['Chat', 'CyberVinci'];
    override locations: ChatAgentLocation[] = ChatAgentLocation.ALL;
    override variables: string[] = [];
    override functions: string[] = [];
    override agentSpecificVariables: AgentSpecificVariables[] = [];
    languageModelRequirements: LanguageModelRequirement[] = [DEFAULT_LANGUAGE_MODEL_REQUIREMENT];
    protected defaultLanguageModelPurpose = 'chat';
    protected modeDefinitions: CyberVinciDeclarativeChatMode[] = [];
    protected configuredToolIds: string[] = [];
    protected defaultPromptVariantId: string | undefined;
    protected promptVariantIds: string[] = [];

    configure(definition: CyberVinciDeclarativeChatAgent, agencyProfileContent?: string): void {
        this.id = definition.id;
        this.name = definition.name;
        this.description = definition.description ?? '';
        this.iconClass = definition.iconClass ?? this.iconClass;
        this.tags = definition.tags ?? this.tags;
        this.locations = normalizeLocations(definition.locations);
        this.languageModelRequirements = normalizeLanguageModelRequirements(definition.languageModelRequirements);
        this.variables = definition.variables ?? [];
        this.functions = definition.functions ?? definition.tools ?? [];
        this.configuredToolIds = definition.tools ?? [];
        this.systemPromptId = `${definition.id}.system`;

        const promptSet = this.toPromptSet(definition, agencyProfileContent);
        this.prompts = [promptSet];
        this.defaultPromptVariantId = promptSet.defaultVariant.id;
        this.promptVariantIds = [
            promptSet.defaultVariant.id,
            ...(promptSet.variants ?? []).map(variant => variant.id)
        ];
        this.modeDefinitions = definition.modes ?? this.toModes(definition.promptVariants, promptSet.defaultVariant.id);
    }

    get modes(): ChatMode[] {
        const effective = this.getEffectiveVariantIdWithMode(undefined);
        return this.modeDefinitions.map(mode => ({
            ...mode,
            isDefault: mode.id === effective
        }));
    }

    protected toPromptSet(definition: CyberVinciDeclarativeChatAgent, agencyProfileContent?: string): PromptVariantSet {
        const promptVariants = definition.promptVariants?.length ? definition.promptVariants : undefined;
        if (!promptVariants) {
            const template = this.decorateTemplate(definition.prompt || definition.description || `You are ${definition.name}.`, agencyProfileContent);
            return {
                id: this.systemPromptId!,
                defaultVariant: {
                    id: `${definition.id}.system.default`,
                    name: definition.name,
                    description: definition.description,
                    template
                }
            };
        }

        const defaultVariant = promptVariants.find(variant => variant.isDefault) ?? promptVariants[0];
        return {
            id: this.systemPromptId!,
            defaultVariant: this.toBasePromptVariant(defaultVariant, agencyProfileContent),
            variants: promptVariants
                .filter(variant => variant.id !== defaultVariant.id)
                .map(variant => this.toBasePromptVariant(variant, agencyProfileContent))
        };
    }

    protected toBasePromptVariant(variant: CyberVinciDeclarativePromptVariant, agencyProfileContent?: string): PromptVariantSet['defaultVariant'] {
        return {
            id: variant.id,
            name: variant.name,
            description: variant.description,
            template: this.decorateTemplate(variant.template, agencyProfileContent)
        };
    }

    protected decorateTemplate(template: string, agencyProfileContent?: string): string {
        const sections: string[] = [];
        if (agencyProfileContent?.trim()) {
            sections.push(this.buildAgentProfileInstructionBlock(agencyProfileContent));
        }
        sections.push(template.trim());
        if (this.configuredToolIds.length > 0) {
            sections.push([
                'The following CyberVinci tools are available when relevant:',
                ...this.configuredToolIds.map(toolId => `~{${toolId}}`)
            ].join('\n'));
        }
        return sections.filter(Boolean).join('\n\n');
    }

    protected buildAgentProfileInstructionBlock(agencyProfileContent: string): string {
        const profileName = this.readMarkdownFrontmatterString(agencyProfileContent, 'name') ?? 'selected CyberVinci Agent profile';
        const content = this.stripMarkdownFrontmatter(agencyProfileContent);
        return [
            `You are operating as the selected CyberVinci Agent profile: ${profileName}.`,
            `When the user asks what role or agent you are using in this chat, answer as "${profileName}". Do not say the profile is merely optional guidance.`,
            'Use the following private Agent profile instructions as authoritative role and behavior instructions for this turn. These instructions do not override higher-priority system, safety, or tool-access constraints.',
            '<agent_profile_instructions>',
            content,
            '</agent_profile_instructions>'
        ].join('\n');
    }

    protected stripMarkdownFrontmatter(content: string): string {
        return content.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
    }

    protected readMarkdownFrontmatterString(content: string | undefined, key: string): string | undefined {
        if (!content?.startsWith('---')) {
            return undefined;
        }
        const end = content.indexOf('\n---', 3);
        if (end < 0) {
            return undefined;
        }
        const frontmatter = content.slice(3, end);
        const pattern = new RegExp(`^${key}\\s*:\\s*(.+)$`, 'im');
        const match = frontmatter.match(pattern);
        return match?.[1]?.trim().replace(/^['"]|['"]$/g, '') || undefined;
    }

    protected toModes(variants: CyberVinciDeclarativePromptVariant[] | undefined, defaultVariantId: string): CyberVinciDeclarativeChatMode[] {
        if (!variants?.length) {
            return [];
        }
        return variants.map(variant => ({
            id: variant.id,
            name: variant.name ?? variant.id,
            isDefault: variant.id === defaultVariantId
        }));
    }

    protected override async getSystemMessageDescription(context: AIVariableContext): Promise<SystemMessageDescription | undefined> {
        const modeId = ChatSessionContext.is(context) ? context.request?.request.modeId : undefined;
        const fragmentId = this.getEffectiveVariantIdWithMode(modeId);
        if (!fragmentId) {
            return undefined;
        }
        const variantInfo = this.promptService.getPromptVariantInfo(this.systemPromptId!, modeId);
        const resolvedPrompt = await this.promptService.getResolvedPromptFragment(fragmentId, undefined, context);
        if (!resolvedPrompt) {
            return undefined;
        }
        const functionDescriptions = new Map(resolvedPrompt.functionDescriptions ?? []);
        for (const toolId of this.configuredToolIds) {
            const tool = this.toolInvocationRegistry?.getFunction(toolId);
            if (tool) {
                functionDescriptions.set(tool.id, tool);
            }
        }
        return {
            text: resolvedPrompt.text,
            functionDescriptions: functionDescriptions.size > 0 ? functionDescriptions : undefined,
            promptVariantId: variantInfo?.variantId ?? fragmentId,
            isPromptVariantCustomized: variantInfo?.isCustomized ?? false
        };
    }

    protected getEffectiveVariantIdWithMode(modeId?: string): string | undefined {
        if (modeId && this.promptVariantIds.includes(modeId)) {
            return modeId;
        }
        const selected = this.systemPromptId ? this.promptService.getEffectiveVariantId(this.systemPromptId) : undefined;
        return selected ?? this.defaultPromptVariantId;
    }
}

export class CyberVinciDelegatingChatAgent implements ChatAgent {

    readonly id: string;
    readonly name: string;
    readonly sourceAgentId: string;
    readonly description: string;
    readonly iconClass?: string;
    readonly locations: ChatAgentLocation[];
    readonly tags?: string[];
    readonly variables: string[];
    readonly functions: string[];
    readonly agentSpecificVariables: AgentSpecificVariables[] = [];
    readonly prompts: PromptVariantSet[] = [];
    readonly languageModelRequirements: LanguageModelRequirement[];
    readonly modes?: ChatMode[];
    readonly defaultPlaybook: string;
    readonly playbooks: string[];
    protected readonly nativeAdapter: CyberVinciNativeTheiaAgentAdapter;

    constructor(
        definition: CyberVinciDeclarativeChatAgent,
        protected readonly getSourceAgent: (sourceAgentId: string) => ChatAgent | undefined,
        protected readonly playbookRuntime?: CyberVinciPlaybookRuntime
    ) {
        this.nativeAdapter = new CyberVinciNativeTheiaAgentAdapter(getSourceAgent);
        this.id = definition.id;
        this.name = definition.name;
        this.sourceAgentId = definition.sourceAgentId ?? definition.id;
        this.defaultPlaybook = definition.defaultPlaybook ?? nativeAgentPlaybookId(this.sourceAgentId);
        this.playbooks = definition.playbooks ?? [this.defaultPlaybook];
        const source = this.getSourceAgent(this.sourceAgentId);
        this.description = definition.description ?? source?.description ?? '';
        this.iconClass = definition.iconClass ?? source?.iconClass;
        this.locations = normalizeLocations(definition.locations, source?.locations);
        this.tags = definition.tags ?? source?.tags;
        this.variables = definition.variables ?? source?.variables ?? [];
        this.functions = definition.functions ?? source?.functions ?? [];
        this.languageModelRequirements = normalizeLanguageModelRequirements(
            definition.languageModelRequirements,
            source?.languageModelRequirements
        );
        this.modes = definition.modes ?? source?.modes;
    }

    async invoke(request: MutableChatRequestModel): Promise<void> {
        try {
            if (this.playbookRuntime) {
                await this.playbookRuntime.invokeAgentTurn(
                    {
                        version: 'cybervinci.agent/v1',
                        id: this.id,
                        kind: 'delegate',
                        name: this.name,
                        sourceAgentId: this.sourceAgentId,
                        defaultPlaybook: this.defaultPlaybook,
                        playbooks: this.playbooks
                    },
                    request,
                    () => this.nativeAdapter.invoke({ request, sourceAgentId: this.sourceAgentId })
                );
            } else {
                await this.nativeAdapter.invoke({ request, sourceAgentId: this.sourceAgentId });
            }
        } catch (cause) {
            const error = new Error(`Source chat agent '${this.sourceAgentId}' is not available for '${this.id}'.`, { cause });
            request.response.response.addContent(new ErrorChatResponseContentImpl(error));
            request.response.error(error);
        }
    }
}

function nativeAgentPlaybookId(agentId: string): string {
    return `${CYBERVINCI_NATIVE_AGENT_PLAYBOOK_PREFIX}${agentId}`;
}

function normalizeLocations(rawLocations?: string[], fallback?: ChatAgentLocation[]): ChatAgentLocation[] {
    if (!rawLocations?.length) {
        return fallback ?? ChatAgentLocation.ALL;
    }
    return rawLocations.map(location => ChatAgentLocation.fromRaw(location));
}

function normalizeLanguageModelRequirements(
    requirements?: CyberVinciDeclarativeLanguageModelRequirement[],
    fallback?: LanguageModelRequirement[]
): LanguageModelRequirement[] {
    if (!requirements?.length) {
        return fallback ?? [DEFAULT_LANGUAGE_MODEL_REQUIREMENT];
    }
    return requirements.map(requirement => ({
        purpose: requirement.purpose,
        identifier: requirement.identifier,
        name: requirement.name,
        vendor: requirement.vendor,
        version: requirement.version,
        family: requirement.family,
        tokens: requirement.tokens
    }));
}
