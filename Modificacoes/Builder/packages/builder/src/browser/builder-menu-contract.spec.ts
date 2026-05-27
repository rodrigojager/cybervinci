import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

describe('Builder Builder CyberVinci menu contract', () => {
    it('registers the builder submenu under the shared CyberVinci menu path', () => {
        const contributionSource = fs.readFileSync(
            path.resolve(process.cwd(), 'src/browser/builder-contribution.ts'),
            'utf8'
        );

        expect(contributionSource).to.contain("import { CYBERVINCI_MENU_ITEMS, CyberVinciMenus } from '@cybervinci/branding/lib/common';");
        expect(contributionSource).to.contain('export const BUILDER = CyberVinciMenus.BUILDER;');
        expect(contributionSource).to.contain('CYBERVINCI_MENU_ITEMS.BUILDER.label');
        expect(contributionSource).to.contain('CYBERVINCI_MENU_ITEMS.BUILDER.iconClass');
    });
});
