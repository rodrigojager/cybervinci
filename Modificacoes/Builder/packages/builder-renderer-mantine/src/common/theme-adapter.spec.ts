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
import type { BuilderTheme } from '@cybervinci/builder-schema';
import {
    createBuilderEventHandler,
    createMantineProviderAdapter,
    builderThemeModeToMantineColorScheme,
    builderThemeToMantineTheme,
    BuilderEventExecutionError,
    executeBuilderEvent
} from './index';

describe('Builder Mantine theme adapter', () => {

    it('maps the canonical Builder theme to MantineProvider props without Mantine types in schema', () => {
        const theme: BuilderTheme = {
            mode: 'dark',
            primaryColor: 'brand',
            radius: 'lg',
            fontFamily: 'Inter, sans-serif',
            spacing: {
                xs: 4,
                content: '2rem'
            },
            tokens: {
                colors: {
                    brand: [
                        '#eef6ff',
                        '#d9ecff',
                        '#b9dcff',
                        '#8ac6ff',
                        '#58adfa',
                        '#2d94ee',
                        '#167bd3',
                        '#0c60a8',
                        '#094b84',
                        '#073966'
                    ],
                    ignored: [1]
                },
                surface: '#ffffff'
            }
        };

        expect(createMantineProviderAdapter(theme)).to.deep.equal({
            defaultColorScheme: 'dark',
            theme: {
                primaryColor: 'brand',
                defaultRadius: 'lg',
                fontFamily: 'Inter, sans-serif',
                spacing: {
                    xs: 4,
                    content: '2rem'
                },
                colors: {
                    brand: [
                        '#eef6ff',
                        '#d9ecff',
                        '#b9dcff',
                        '#8ac6ff',
                        '#58adfa',
                        '#2d94ee',
                        '#167bd3',
                        '#0c60a8',
                        '#094b84',
                        '#073966'
                    ]
                },
                other: {
                    surface: '#ffffff'
                }
            }
        });
    });

    it('maps absent and auto modes to Mantine color scheme defaults', () => {
        expect(builderThemeModeToMantineColorScheme(undefined)).to.equal('light');
        expect(builderThemeModeToMantineColorScheme('light')).to.equal('light');
        expect(builderThemeModeToMantineColorScheme('dark')).to.equal('dark');
        expect(builderThemeModeToMantineColorScheme('auto')).to.equal('auto');
    });

    it('converts canonical none radius to Mantine zero radius', () => {
        expect(builderThemeToMantineTheme({ radius: 'none' })).to.deep.equal({
            defaultRadius: 0
        });
    });

    it('does not share mutable spacing or color arrays with the source Builder theme', () => {
        const theme: BuilderTheme = {
            spacing: {
                md: 16
            },
            tokens: {
                colors: {
                    brand: ['#fff', '#000']
                }
            }
        };

        const adapted = builderThemeToMantineTheme(theme);
        theme.spacing!.md = 20;
        (theme.tokens!.colors as { brand: string[] }).brand[0] = '#ddd';

        expect(adapted.spacing).to.deep.equal({ md: 16 });
        expect(adapted.colors).to.deep.equal({ brand: ['#fff', '#000'] });
    });

    it('executes events only through registered actions', () => {
        const calls: Array<[string, Record<string, unknown> | undefined]> = [];
        const event = {
            preventDefaultCalled: false,
            stopPropagationCalled: false,
            preventDefault() {
                this.preventDefaultCalled = true;
            },
            stopPropagation() {
                this.stopPropagationCalled = true;
            }
        };

        executeBuilderEvent({
            registry: undefined as never,
            onAction: (actionId, params) => calls.push([actionId, params])
        }, {
            document: {
                schemaVersion: '1.0.0',
                metadata: { id: 'doc', name: 'Doc' },
                page: { id: 'page', title: 'Page', route: '/' },
                actions: {
                    openContact: {
                        type: 'openModal',
                        params: {
                            modalId: 'contact'
                        }
                    }
                },
                tree: {
                    id: 'root',
                    type: 'Page'
                }
            },
            node: {
                id: 'button',
                type: 'Button',
                events: {
                    onClick: {
                        actionId: 'openContact',
                        params: {
                            source: 'hero'
                        },
                        preventDefault: true,
                        stopPropagation: true
                    }
                }
            },
            eventName: 'onClick',
            event
        });

        expect(calls).to.deep.equal([
            ['openContact', { modalId: 'contact', source: 'hero' }]
        ]);
        expect(event.preventDefaultCalled).to.equal(true);
        expect(event.stopPropagationCalled).to.equal(true);
    });

    it('rejects event bindings that reference missing actions at execution time', () => {
        expect(() => executeBuilderEvent({
            registry: undefined as never,
            onAction: () => undefined
        }, {
            document: {
                schemaVersion: '1.0.0',
                metadata: { id: 'doc', name: 'Doc' },
                page: { id: 'page', title: 'Page', route: '/' },
                tree: {
                    id: 'root',
                    type: 'Page'
                }
            },
            node: {
                id: 'button',
                type: 'Button',
                events: {
                    onClick: {
                        actionId: 'missingAction'
                    }
                }
            },
            eventName: 'onClick'
        })).to.throw(BuilderEventExecutionError, "Builder event 'onClick' references unknown action 'missingAction'.");
    });

    it('rejects JavaScript handler strings at execution time', () => {
        expect(() => executeBuilderEvent({
            registry: undefined as never,
            onAction: () => undefined
        }, {
            document: {
                schemaVersion: '1.0.0',
                metadata: { id: 'doc', name: 'Doc' },
                page: { id: 'page', title: 'Page', route: '/' },
                actions: {
                    openContact: {
                        type: 'openModal'
                    }
                },
                tree: {
                    id: 'root',
                    type: 'Page'
                }
            },
            node: {
                id: 'button',
                type: 'Button',
                events: {
                    onClick: {
                        actionId: 'openContact',
                        handler: '() => alert("xss")'
                    } as never
                }
            },
            eventName: 'onClick'
        })).to.throw(BuilderEventExecutionError, "Builder event 'onClick' must not contain JavaScript handler strings; use actionId instead.");
    });

    it('creates no handler for nodes without the requested event', () => {
        const handler = createBuilderEventHandler({
            registry: undefined as never
        }, {
            document: {
                schemaVersion: '1.0.0',
                metadata: { id: 'doc', name: 'Doc' },
                page: { id: 'page', title: 'Page', route: '/' },
                tree: {
                    id: 'root',
                    type: 'Page'
                }
            },
            node: {
                id: 'text',
                type: 'Text'
            },
            eventName: 'onClick'
        });

        expect(handler).to.equal(undefined);
    });
});
