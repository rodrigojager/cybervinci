import { expect } from 'chai';
import {
    CSHARP_KIT_CONFIG_RELATIVE_PATH,
    CSHARP_KIT_CONFIG_SCHEMA,
    CSHARP_KIT_CONFIG_SCHEMA_ID,
    createCSharpKitConfigTemplate
} from './csharp-kit-config-schema';

describe('C# Kit workspace config schema', () => {
    it('keeps the generated template aligned with the registered JSON schema', () => {
        const template = createCSharpKitConfigTemplate();

        expect(CSHARP_KIT_CONFIG_RELATIVE_PATH).to.equal('.cybervinci/csharp-kit.json');
        expect(CSHARP_KIT_CONFIG_SCHEMA.$id).to.equal(CSHARP_KIT_CONFIG_SCHEMA_ID);
        expect(CSHARP_KIT_CONFIG_SCHEMA.default).to.deep.equal(template);
        expect(CSHARP_KIT_CONFIG_SCHEMA.defaultSnippets?.[0].body).to.deep.equal(template);
        expect(template.debugAdapters.coreclr.args).to.deep.equal(['--interpreter=vscode']);
        expect(template.languageServers.csharp.args).to.deep.equal([]);
        expect(template.languageServers.csharp.probeTimeoutMs).to.equal(7000);
        expect(CSHARP_KIT_CONFIG_SCHEMA.properties?.languageServers?.properties?.csharp).to.be.an('object');
    });
});
