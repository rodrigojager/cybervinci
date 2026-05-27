import { deepStrictEqual, ok, strictEqual } from 'assert';
import { createDefaultBuilderComponentRegistry, type BuilderComponentDefinition } from '@cybervinci/builder-registry';
import { createBuilderDocument, serializeBuilderDocumentJson, type BuilderDocument, type BuilderJsonValue, type BuilderNode } from '@cybervinci/builder-schema';
import * as React from '@theia/core/shared/react';
import { BuilderPropertyPanel, createPropertyPanelModel, formatRjsfValidationErrors, isBuilderPropsObject, type BuilderRjsfFormProps } from './index';

describe('builder-property-panel-rjsf', () => {
    const definition: BuilderComponentDefinition = {
        type: 'Text',
        displayName: 'Text',
        category: 'Typography',
        propsSchema: {
            type: 'object',
            properties: {
                children: { type: 'string' },
                color: { type: 'string' }
            }
        },
        uiSchema: {
            children: {
                'ui:widget': 'textarea'
            }
        },
        defaultProps: {
            children: 'Default text',
            color: 'dark'
        }
    };

    const node: BuilderNode = {
        id: 'node-1',
        type: 'Text',
        props: {
            children: 'Hello'
        }
    };

    it('creates an RJSF model from the selected node and component definition', () => {
        const model = createPropertyPanelModel(node, definition);

        strictEqual(model.nodeId, 'node-1');
        strictEqual(model.componentType, 'Text');
        strictEqual(model.propsSchema, definition.propsSchema);
        strictEqual(model.uiSchema, definition.uiSchema);
        strictEqual(model.formData.children, 'Hello');
        strictEqual(model.formData.color, 'dark');
    });

    it('uses component defaults when selected node props are absent', () => {
        const model = createPropertyPanelModel({ id: 'node-2', type: 'Text' }, definition);

        strictEqual(model.formData.children, 'Default text');
        strictEqual(model.formData.color, 'dark');
    });

    it('rejects non-object form data', () => {
        strictEqual(isBuilderPropsObject(undefined), false);
        strictEqual(isBuilderPropsObject([]), false);
        strictEqual(isBuilderPropsObject({ children: 'Hello' }), true);
    });

    it('renders the supplied RJSF form component with registry schema and node props', () => {
        let changedProps: Record<string, unknown> | undefined;
        let submittedProps: Record<string, unknown> | undefined;
        let validationErrors: string[] = [];

        const Form = (props: BuilderRjsfFormProps): React.ReactElement => React.createElement('form', undefined, props.children);

        const element = BuilderPropertyPanel({
            node,
            definition,
            formComponent: Form,
            onChange: nextProps => {
                changedProps = nextProps;
            },
            onSubmit: nextProps => {
                submittedProps = nextProps;
            },
            onValidationError: errors => {
                validationErrors = errors;
            }
        });
        const formElement = element.props.children as React.ReactElement<BuilderRjsfFormProps>;
        const formProps = formElement.props;

        formProps.onChange?.({ formData: { children: 'Updated' } });
        formProps.onSubmit?.({ formData: { children: 'Submitted' } });
        formProps.onChange?.({ formData: { children: 42 }, errors: [{ property: '.children', message: 'must be string' }] });
        strictEqual(validationErrors[0], 'children: must be string');
        formProps.onChange?.({ formData: [] });

        strictEqual(formProps.schema, definition.propsSchema);
        strictEqual(formProps.uiSchema, definition.uiSchema);
        strictEqual(formProps.formData.children, 'Hello');
        strictEqual(formProps.formData.color, 'dark');
        strictEqual(changedProps?.children, 'Updated');
        strictEqual(submittedProps?.children, 'Submitted');
        strictEqual(changedProps?.children, 'Updated');
    });

    it('formats RJSF validation errors for display in the property panel', () => {
        const messages = formatRjsfValidationErrors([
            { property: '.children', message: 'must be string' },
            { stack: 'required property color' }
        ]);

        strictEqual(messages[0], 'children: must be string');
        strictEqual(messages[1], 'required property color');
    });

    it('keeps selected Button edits, preview, and serialized JSON synchronized while rejecting invalid enums', () => {
        const registry = createDefaultBuilderComponentRegistry();
        const buttonDefinition = registry.get('Button');
        ok(buttonDefinition);

        let document = createBuilderDocument({ id: 'button-panel-sync', title: 'Button panel sync' });
        document.tree.children = [
            {
                id: 'primary-action',
                type: 'Button',
                props: {
                    children: 'Save',
                    color: 'blue',
                    size: 'md'
                }
            }
        ];
        let serializedJson = serializeBuilderDocumentJson(document);
        let preview = renderButtonPreview(document, 'primary-action');
        let validationErrors: string[] = [];

        const Form = (props: BuilderRjsfFormProps): React.ReactElement => React.createElement('form', undefined, props.children);
        const selectedNode = document.tree.children[0];
        const panel = BuilderPropertyPanel({
            node: selectedNode,
            definition: buttonDefinition,
            formComponent: Form,
            onChange: nextProps => {
                document = updateNodeProps(document, 'primary-action', nextProps as Record<string, BuilderJsonValue>);
                serializedJson = serializeBuilderDocumentJson(document);
                preview = renderButtonPreview(document, 'primary-action');
            },
            onValidationError: errors => {
                validationErrors = errors;
            }
        });
        const formElement = panel.props.children as React.ReactElement<BuilderRjsfFormProps>;
        const formProps = formElement.props;
        const sizeSchema = (buttonDefinition.propsSchema.properties as Record<string, Record<string, unknown>>).size;

        strictEqual(formProps.formData.children, 'Save');
        strictEqual(formProps.formData.color, 'blue');
        strictEqual(formProps.formData.size, 'md');
        deepStrictEqual(sizeSchema.enum, ['xs', 'sm', 'md', 'lg', 'xl']);
        strictEqual(preview.label, 'Save');

        formProps.onChange?.({
            formData: {
                children: 'Launch',
                color: 'green',
                size: 'lg',
                variant: 'filled',
                type: 'button'
            }
        });

        strictEqual(validationErrors.length, 0);
        deepStrictEqual(document.tree.children[0].props, {
            children: 'Launch',
            color: 'green',
            size: 'lg',
            variant: 'filled',
            type: 'button'
        });
        deepStrictEqual(JSON.parse(serializedJson).tree.children[0].props, document.tree.children[0].props);
        deepStrictEqual(preview, {
            nodeId: 'primary-action',
            label: 'Launch',
            color: 'green',
            size: 'lg'
        });

        formProps.onChange?.({
            formData: {
                children: 'Broken',
                color: 'red',
                size: 'xxl'
            },
            errors: [{ property: '.size', message: 'must be equal to one of the allowed values' }]
        });

        deepStrictEqual(validationErrors, ['size: must be equal to one of the allowed values']);
        strictEqual(document.tree.children[0].props.children, 'Launch');
        strictEqual(document.tree.children[0].props.color, 'green');
        strictEqual(document.tree.children[0].props.size, 'lg');
        strictEqual(JSON.parse(serializedJson).tree.children[0].props.size, 'lg');
        deepStrictEqual(preview, {
            nodeId: 'primary-action',
            label: 'Launch',
            color: 'green',
            size: 'lg'
        });
    });
});

interface ButtonPreview {
    nodeId: string;
    label: unknown;
    color: unknown;
    size: unknown;
}

function updateNodeProps(document: BuilderDocument, nodeId: string, props: Record<string, BuilderJsonValue>): BuilderDocument {
    return {
        ...document,
        tree: updateNodePropsInTree(document.tree, nodeId, props)
    };
}

function updateNodePropsInTree(node: BuilderNode, nodeId: string, props: Record<string, BuilderJsonValue>): BuilderNode {
    if (node.id === nodeId) {
        return {
            ...node,
            props: {
                ...props
            }
        };
    }

    return {
        ...node,
        children: node.children?.map(child => updateNodePropsInTree(child, nodeId, props)),
        slots: updateSlotNodes(node.slots, nodeId, props)
    };
}

function updateSlotNodes(slots: BuilderNode['slots'], nodeId: string, props: Record<string, BuilderJsonValue>): BuilderNode['slots'] {
    if (!slots) {
        return undefined;
    }

    return Object.fromEntries(
        Object.entries(slots).map(([slotName, slotNodes]) => [
            slotName,
            slotNodes.map(slotNode => updateNodePropsInTree(slotNode, nodeId, props))
        ])
    );
}

function renderButtonPreview(document: BuilderDocument, nodeId: string): ButtonPreview {
    const node = findNode(document.tree, nodeId);
    ok(node);

    return {
        nodeId: node.id,
        label: node.props?.children,
        color: node.props?.color,
        size: node.props?.size
    };
}

function findNode(node: BuilderNode, nodeId: string): BuilderNode | undefined {
    if (node.id === nodeId) {
        return node;
    }

    for (const child of node.children ?? []) {
        const match = findNode(child, nodeId);
        if (match) {
            return match;
        }
    }

    for (const slotNodes of Object.values(node.slots ?? {})) {
        for (const slotNode of slotNodes) {
            const match = findNode(slotNode, nodeId);
            if (match) {
                return match;
            }
        }
    }

    return undefined;
}
