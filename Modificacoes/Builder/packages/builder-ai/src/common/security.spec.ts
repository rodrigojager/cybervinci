// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
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

import { expect } from 'chai';
import { createBuilderDocument } from '@cybervinci/builder-schema';
import {
    createDefaultBuilderActionRegistry,
    createDefaultBuilderComponentRegistry,
    createDefaultBuilderDataSourceRegistry
} from '@cybervinci/builder-registry';
import {
    BuilderAiPatchApplyError,
    BuilderAiResponseParseError,
    applyBuilderAiPatch,
    parseBuilderAiResponse,
    validateBuilderAiPatch
} from './index';

describe('Builder AI security validation', () => {

    const componentRegistry = createDefaultBuilderComponentRegistry();
    const actionRegistry = createDefaultBuilderActionRegistry();
    const dataSourceRegistry = createDefaultBuilderDataSourceRegistry();

    it('rejects a malicious AI response with executable fields before applying it', () => {
        const document = createBuilderDocument({ id: 'ai-malicious' });
        const patch = parseBuilderAiResponse(JSON.stringify({
            operations: [{
                type: 'insertNode',
                payload: {
                    parentNodeId: document.tree.id,
                    node: {
                        id: 'xss-markdown',
                        type: 'Markdown',
                        props: {
                            content: '<script>alert(document.cookie)</script>',
                            allowHtml: true
                        },
                        events: {
                            onClick: 'alert(1)'
                        }
                    }
                }
            }],
            requiresAcceptance: false
        }));

        const validation = validateBuilderAiPatch(patch, {
            currentDocument: document,
            componentRegistry,
            actionRegistry,
            dataSourceRegistry
        });

        expect(validation.valid).to.equal(false);
        expect(validation.errors.map(error => error.message)).to.include.members([
            'Builder value must not contain JavaScript, scripts, eval, Function constructors, imports, or template expressions.',
            "Builder event 'onClick' must be an object action binding; JavaScript handler strings are not allowed."
        ]);
        expect(() => applyBuilderAiPatch(patch, {
            currentDocument: document,
            componentRegistry,
            actionRegistry,
            dataSourceRegistry
        })).to.throw(BuilderAiPatchApplyError, 'operation is invalid');
        expect(document.tree.children).to.deep.equal([]);
    });

    it('rejects AI responses that exceed the configured JSON size limit', () => {
        const oversizedResponse = JSON.stringify({
            operations: [{
                type: 'updateNodeProps',
                payload: {
                    nodeId: 'hero',
                    props: {
                        children: 'x'.repeat(1024)
                    }
                }
            }]
        });

        expect(() => parseBuilderAiResponse(oversizedResponse, {
            maxResponseSizeBytes: 128
        })).to.throw(BuilderAiResponseParseError, 'response exceeds the maximum size of 128 bytes');
    });

    it('rejects malicious response envelopes and prototype-pollution keys', () => {
        expect(() => parseBuilderAiResponse([
            '{"operations":[{"type":"removeNode","payload":{"nodeId":"hero"}}]}',
            '<img src=x onerror=alert(1)>'
        ].join('\n'))).to.throw(BuilderAiResponseParseError, 'text after the JSON object is not allowed');

        expect(() => parseBuilderAiResponse(
            '{"operations":[{"type":"updateNodeProps","payload":{"nodeId":"hero","props":{"constructor":{"prototype":{"polluted":true}}}}}]}'
        )).to.throw(BuilderAiResponseParseError, "forbidden key 'constructor'");
    });
});
