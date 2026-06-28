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
import { createBuilderDocument, resolveBuilderNodeDataBinding, type BuilderNode } from './index';

describe('resolveBuilderNodeDataBinding', () => {

    it('resolves static data source values and field bindings with safe paths only', () => {
        const document = createBuilderDocument({ id: 'dashboard' });
        document.dataSources = {
            sales: {
                type: 'static',
                config: {
                    data: {
                        rows: [
                            {
                                id: 'row-1',
                                customer: { name: 'Ada' },
                                total: 42
                            }
                        ]
                    }
                }
            }
        };
        const node: BuilderNode = {
            id: 'metric',
            type: 'MetricCard',
            data: {
                sourceId: 'sales',
                path: '$.rows[0]',
                fields: {
                    customer: { path: 'customer.name' },
                    total: { path: 'total' },
                    missing: { path: 'missing.value', fallback: 'N/A' }
                }
            }
        };

        expect(resolveBuilderNodeDataBinding(document, node)).to.deep.equal({
            sourceId: 'sales',
            sourceType: 'static',
            value: {
                id: 'row-1',
                customer: { name: 'Ada' },
                total: 42
            },
            fields: {
                customer: 'Ada',
                total: 42,
                missing: 'N/A'
            },
            errors: []
        });
    });

    it('resolves mock repeat items without executing path-like expressions', () => {
        const document = createBuilderDocument({ id: 'dashboard' });
        document.dataSources = {
            sales: {
                type: 'mock',
                config: {
                    data: {
                        rows: [
                            { id: 'a' },
                            { id: 'b' },
                            { id: 'c' }
                        ]
                    }
                }
            }
        };
        const node: BuilderNode = {
            id: 'table',
            type: 'DataTable',
            data: {
                sourceId: 'sales',
                path: 'rows',
                repeat: {
                    sourceId: 'sales',
                    limit: 2
                }
            }
        };

        expect(resolveBuilderNodeDataBinding(document, node)).to.deep.equal({
            sourceId: 'sales',
            sourceType: 'mock',
            value: [
                { id: 'a' },
                { id: 'b' },
                { id: 'c' }
            ],
            fields: {},
            repeatItems: [
                { id: 'a' },
                { id: 'b' }
            ],
            errors: []
        });

        node.data!.path = 'rows.map(item => item.id)';

        const unsafe = resolveBuilderNodeDataBinding(document, node);
        expect(unsafe.repeatItems).to.equal(undefined);
        expect(unsafe.errors).to.deep.include({
            path: 'node(table).data.path',
            message: "Builder data binding path 'rows.map(item => item.id)' must use safe dot or numeric bracket notation.",
            nodeId: 'table'
        });
    });

    it('accepts source as a safe alias for the existing sourceId binding field', () => {
        const document = createBuilderDocument({ id: 'dashboard' });
        document.dataSources = {
            users: {
                type: 'static',
                config: {
                    data: {
                        current: {
                            name: 'Grace'
                        }
                    }
                }
            }
        };

        expect(resolveBuilderNodeDataBinding(document, {
            id: 'user-name',
            type: 'Text',
            data: {
                source: 'users',
                path: 'current.name'
            }
        })).to.deep.equal({
            sourceId: 'users',
            sourceType: 'static',
            value: 'Grace',
            fields: {},
            errors: []
        });
    });

    it('reports unsupported or missing dataSources instead of falling back to executable behavior', () => {
        const document = createBuilderDocument({ id: 'dashboard' });
        document.dataSources = {
            remote: {
                type: 'http',
                config: {
                    url: 'https://example.invalid/api'
                }
            }
        };

        expect(resolveBuilderNodeDataBinding(document, {
            id: 'remote-table',
            type: 'DataTable',
            data: {
                sourceId: 'remote'
            }
        })).to.deep.equal({
            sourceId: 'remote',
            sourceType: 'http',
            fields: {},
            errors: [
                {
                    path: 'node(remote-table).data.sourceId',
                    message: "Builder data binding can resolve only static or mock dataSources in the MVP, received 'http'.",
                    nodeId: 'remote-table',
                    sourceId: 'remote'
                }
            ]
        });

        expect(resolveBuilderNodeDataBinding(document, {
            id: 'missing-table',
            type: 'DataTable',
            data: {
                sourceId: 'missing'
            }
        }).errors).to.deep.equal([
            {
                path: 'node(missing-table).data.sourceId',
                message: "Builder data binding references unknown dataSource 'missing'.",
                nodeId: 'missing-table',
                sourceId: 'missing'
            }
        ]);
    });
});
