import { expect } from 'chai';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser';
import { OpenPencilBackendService, OpenPencilBackendAiGenerationRequest } from '../common/openpencil-protocol';
import { OpenPencilDocument } from '../common/openpencil-types';
import {
    OpenPencilAiActivePageLayoutSummary,
    OpenPencilAiDesignRequest,
    OpenPencilAiSkillContext
} from './openpencil-design-command-service';
import { OpenPencilBackendCodexAiDesignProvider } from './openpencil-backend-codex-ai-design-provider';

describe('OpenPencilBackendCodexAiDesignProvider', () => {

    it('forwards request mode and active page layout to the backend RPC', async () => {
        let forwardedRequest: OpenPencilBackendAiGenerationRequest | undefined;
        const backendService: OpenPencilBackendService = {
            async getIntegrationInfo() {
                throw new Error('not used');
            },
            async getCapabilities() {
                throw new Error('not used');
            },
            async listBridgeOperations() {
                throw new Error('not used');
            },
            async executeBridgeOperation() {
                throw new Error('not used');
            },
            async generateAiOperations(request: OpenPencilBackendAiGenerationRequest) {
                forwardedRequest = request;
                return { operations: [], diagnostics: ['forwarded'] };
            },
            async getStatus() {
                throw new Error('not used');
            }
        };
        const connectionProvider = {
            createProxy: <T>(_path: string): T => backendService as unknown as T
        } satisfies Pick<WebSocketConnectionProvider, 'createProxy'>;
        const provider = new OpenPencilBackendCodexAiDesignProvider();
        Object.assign(provider, { connectionProvider });

        const document: OpenPencilDocument = {
            version: '0.7.6',
            name: 'Forwarding test',
            activePageId: 'page-1',
            children: [],
            pages: [{
                id: 'page-1',
                name: 'Page 1',
                children: []
            }]
        };
        const activePageLayout: OpenPencilAiActivePageLayoutSummary = {
            id: 'page-1',
            name: 'Page 1',
            bounds: { x: 0, y: 0, width: 800, height: 600 },
            contentBottom: 240,
            topLevelNodeCount: 1,
            topLevelNodes: [{
                id: 'hero-card',
                type: 'frame',
                name: 'Hero card',
                role: 'region',
                contentExcerpt: 'Hero card',
                x: 48,
                y: 32,
                width: 320,
                height: 180,
                childCount: 0
            }]
        };
        const request: OpenPencilAiDesignRequest = {
            prompt: 'Continue the design',
            uri: 'file:///workspace/forwarding-test.op',
            document,
            selection: [],
            mode: 'continuation'
        };
        const context: OpenPencilAiSkillContext = {
            adapter: 'pen-ai-skills-in-process',
            phase: 'generation',
            operationFormat: 'OpenPencilDesignOperation[]',
            operationExamples: [],
            responseContract: {
                format: 'json',
                rootProperty: 'operations',
                guidance: 'return operations only'
            },
            documentContext: {
                documentName: 'Forwarding test',
                requestMode: 'continuation',
                activePageId: 'page-1',
                activePageName: 'Page 1',
                nodeCount: 1,
                selectedNodeIds: [],
                selectedNodes: [],
                activePageLayout
            },
            skills: []
        };

        const result = await provider.generateOperations(request, context);

        expect(result.diagnostics).to.deep.equal(['forwarded']);
        expect(forwardedRequest).to.deep.equal({
            prompt: 'Continue the design',
            uri: 'file:///workspace/forwarding-test.op',
            document,
            selection: [],
            mode: 'continuation',
            activePageLayout
        });
    });
});
