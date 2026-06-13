import { JsonSchemaContribution, JsonSchemaDataStore, JsonSchemaRegisterContext } from '@theia/core/lib/browser/json-schema-store';
import URI from '@theia/core/lib/common/uri';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { CSHARP_KIT_CONFIG_RELATIVE_PATH, CSHARP_KIT_CONFIG_SCHEMA, CSHARP_KIT_CONFIG_SCHEMA_ID } from '../common/csharp-kit-config-schema';

@injectable()
export class CSharpKitConfigSchemaContribution implements JsonSchemaContribution {
    protected readonly uri = new URI(CSHARP_KIT_CONFIG_SCHEMA_ID);

    @inject(JsonSchemaDataStore)
    protected readonly schemaStore: JsonSchemaDataStore;

    @postConstruct()
    protected init(): void {
        this.schemaStore.setSchema(this.uri, CSHARP_KIT_CONFIG_SCHEMA);
    }

    registerSchemas(context: JsonSchemaRegisterContext): void {
        context.registerSchema({
            fileMatch: [
                `file://**/${CSHARP_KIT_CONFIG_RELATIVE_PATH}`,
                CSHARP_KIT_CONFIG_RELATIVE_PATH
            ],
            url: this.uri.toString()
        });
    }
}
