import { type BuilderComponentDefinition, type BuilderComponentRegistry } from '@cybervinci/builder-registry';

export function getComponentSchema(registry: BuilderComponentRegistry, type: string): BuilderComponentDefinition['propsSchema'] | undefined {
    return registry.get(type)?.propsSchema;
}

export function getComponentUiSchema(registry: BuilderComponentRegistry, type: string): BuilderComponentDefinition['uiSchema'] | undefined {
    return registry.get(type)?.uiSchema;
}
