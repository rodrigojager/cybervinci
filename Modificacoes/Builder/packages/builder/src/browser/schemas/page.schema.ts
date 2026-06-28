import { Builder_SCHEMA_VERSION } from '@cybervinci/builder-schema';

export const cyberVinciPageSchema = {
    type: 'object',
    required: ['schemaVersion', 'metadata', 'page', 'tree'],
    properties: {
        schemaVersion: {
            type: 'string',
            const: Builder_SCHEMA_VERSION
        },
        metadata: {
            type: 'object'
        },
        page: {
            type: 'object'
        },
        theme: {
            type: 'object'
        },
        dataSources: {
            type: 'object'
        },
        actions: {
            type: 'object'
        },
        states: {
            type: 'object'
        },
        permissions: {
            type: 'object'
        },
        tree: {
            type: 'object',
            required: ['id', 'type']
        }
    },
    additionalProperties: true
} as const;
