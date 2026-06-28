import { expect } from 'chai';
import {
    FLOW_DYNAMIC_AUTHORING_AGENT_ID,
    FLOW_DYNAMIC_AUTHORING_PURPOSE,
    FlowDynamicAuthoringAgent
} from './flow-dynamic-authoring-agent';

describe('FlowDynamicAuthoringAgent', () => {
    it('exposes the language model requirement used by Dynamic Flow AI authoring', () => {
        const agent = new FlowDynamicAuthoringAgent();

        expect(agent.id).to.equal(FLOW_DYNAMIC_AUTHORING_AGENT_ID);
        expect(agent.languageModelRequirements).to.deep.equal([{
            purpose: FLOW_DYNAMIC_AUTHORING_PURPOSE
        }]);
        expect(agent.description).to.contain('Dynamic Flow decisions');
        expect(agent.description).to.contain('model dropdown');
    });
});
