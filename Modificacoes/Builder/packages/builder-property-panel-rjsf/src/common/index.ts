import type { BuilderComponentDefinition } from '@cybervinci/builder-registry';
import type { BuilderNode } from '@cybervinci/builder-schema';
import * as React from '@theia/core/shared/react';

export interface BuilderPropertyPanelModel {
    nodeId: string;
    componentType: string;
    propsSchema: Record<string, unknown>;
    uiSchema?: Record<string, unknown>;
    formData: Record<string, unknown>;
}

export interface BuilderRjsfChangeEvent {
    formData?: unknown;
    errors?: BuilderRjsfValidationError[];
}

export interface BuilderRjsfSubmitEvent {
    formData?: unknown;
    errors?: BuilderRjsfValidationError[];
}

export interface BuilderRjsfValidationError {
    property?: string;
    message?: string;
    stack?: string;
}

export interface BuilderRjsfFormProps {
    schema: Record<string, unknown>;
    uiSchema?: Record<string, unknown>;
    formData: Record<string, unknown>;
    validator?: unknown;
    liveValidate?: boolean;
    omitExtraData?: boolean;
    liveOmit?: boolean;
    showErrorList?: false | 'top' | 'bottom';
    noHtml5Validate?: boolean;
    onChange?: (event: BuilderRjsfChangeEvent) => void;
    onSubmit?: (event: BuilderRjsfSubmitEvent) => void;
    children?: React.ReactNode;
}

export type BuilderRjsfFormComponent = React.ComponentType<BuilderRjsfFormProps>;

export interface BuilderPropertyPanelProps {
    node: BuilderNode;
    definition: BuilderComponentDefinition;
    formComponent: BuilderRjsfFormComponent;
    validator?: unknown;
    liveValidate?: boolean;
    onChange?: (props: Record<string, unknown>) => void;
    onSubmit?: (props: Record<string, unknown>) => void;
    onValidationError?: (messages: string[]) => void;
}

function createInitialFormData(node: BuilderNode, definition: BuilderComponentDefinition): Record<string, unknown> {
    return {
        ...(definition.defaultProps ?? {}),
        ...(node.props ?? {})
    };
}

export function createPropertyPanelModel(node: BuilderNode, definition: BuilderComponentDefinition): BuilderPropertyPanelModel {
    return {
        nodeId: node.id,
        componentType: node.type,
        propsSchema: definition.propsSchema,
        uiSchema: definition.uiSchema,
        formData: createInitialFormData(node, definition)
    };
}

export function isBuilderPropsObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function formatRjsfValidationErrors(errors: BuilderRjsfValidationError[] | undefined): string[] {
    return (errors ?? []).map(error => {
        const property = error.property?.replace(/^\./, '');
        const message = error.message ?? error.stack ?? 'Invalid value.';
        return property ? `${property}: ${message}` : message;
    });
}

export function BuilderPropertyPanel(props: BuilderPropertyPanelProps): React.ReactElement {
    const model = createPropertyPanelModel(props.node, props.definition);
    const Form = props.formComponent;

    const handleChange = (event: BuilderRjsfChangeEvent): void => {
        const errors = formatRjsfValidationErrors(event.errors);
        if (errors.length > 0) {
            props.onValidationError?.(errors);
            return;
        }
        props.onValidationError?.([]);
        if (isBuilderPropsObject(event.formData)) {
            props.onChange?.(event.formData);
        }
    };

    const handleSubmit = (event: BuilderRjsfSubmitEvent): void => {
        const errors = formatRjsfValidationErrors(event.errors);
        if (errors.length > 0) {
            props.onValidationError?.(errors);
            return;
        }
        props.onValidationError?.([]);
        if (isBuilderPropsObject(event.formData)) {
            props.onSubmit?.(event.formData);
        }
    };

    return React.createElement(
        'section',
        {
            className: 'builder-rjsf-property-panel',
            'data-node-id': model.nodeId,
            'data-component-type': model.componentType
        },
        React.createElement(
            Form,
            {
                schema: model.propsSchema,
                uiSchema: model.uiSchema,
                formData: model.formData,
                validator: props.validator,
                liveValidate: props.liveValidate ?? true,
                omitExtraData: true,
                liveOmit: true,
                showErrorList: 'bottom',
                noHtml5Validate: true,
                onChange: handleChange,
                onSubmit: handleSubmit
            },
            React.createElement('button', { type: 'submit' }, 'Apply Properties')
        )
    );
}
