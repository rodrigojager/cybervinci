import {
    createBuilderPuckConfig,
    type BuilderPuckConfig,
    type BuilderPuckConfigOptions
} from '@cybervinci/builder-editor-puck';
import { type BuilderComponentRegistry } from '@cybervinci/builder-registry';

export interface CyberVinciPuckConfigOptions {
    readonly registry: BuilderComponentRegistry;
    readonly includeUnknownFallback?: boolean;
}

export function createCyberVinciPuckConfig(options: CyberVinciPuckConfigOptions): BuilderPuckConfig {
    const adapterOptions: BuilderPuckConfigOptions = {
        registry: options.registry,
        includeUnknownFallback: options.includeUnknownFallback
    };
    return createBuilderPuckConfig(adapterOptions);
}
