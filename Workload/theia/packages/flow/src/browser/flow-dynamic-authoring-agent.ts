import { Agent, LanguageModelRequirement } from '@theia/ai-core/lib/common';
import { injectable } from '@theia/core/shared/inversify';
import { FLOW_DYNAMIC_AUTHORING_AGENT_ID, FLOW_DYNAMIC_AUTHORING_PURPOSE } from '../common';

export { FLOW_DYNAMIC_AUTHORING_AGENT_ID, FLOW_DYNAMIC_AUTHORING_PURPOSE };

@injectable()
export class FlowDynamicAuthoringAgent implements Agent {
    readonly id = FLOW_DYNAMIC_AUTHORING_AGENT_ID;
    readonly name = 'CyberVinci Flow';
    readonly description = [
        'Configures the language model used to author Dynamic Flow decisions.',
        'This model chooses saved workflows, built-in patterns, or generated Flow drafts from chat prompts.',
        'Users configure it through the AI Configuration model dropdown; JSON and YAML remain internal.'
    ].join(' ');
    readonly variables: string[] = [];
    readonly prompts = [];
    readonly languageModelRequirements: LanguageModelRequirement[] = [{
        purpose: FLOW_DYNAMIC_AUTHORING_PURPOSE
    }];
    readonly tags = ['Flow', 'Dynamic Workflow'];
    readonly agentSpecificVariables = [];
    readonly functions = [];
}
