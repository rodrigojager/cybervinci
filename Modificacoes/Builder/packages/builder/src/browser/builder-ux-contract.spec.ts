import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

describe('Builder Builder UX contract', () => {
    it('keeps side-rail navigation, AI review, style presets, and theme presets discoverable', () => {
        const widgetSource = fs.readFileSync(
            path.resolve(process.cwd(), 'src/browser/builder-widget.tsx'),
            'utf8'
        );
        const contributionSource = fs.readFileSync(
            path.resolve(process.cwd(), 'src/browser/builder-contribution.ts'),
            'utf8'
        );
        const styleSource = fs.readFileSync(
            path.resolve(process.cwd(), 'src/browser/style/index.css'),
            'utf8'
        );

        expect(widgetSource).to.contain('builder-tool-rail-button');
        expect(widgetSource).to.contain('stageAiPatch');
        expect(contributionSource).to.contain('stageAiPatch');
        expect(widgetSource).to.contain('Builder_STYLE_PRESETS');
        expect(widgetSource).to.contain('Builder_THEME_PRESETS');
        expect(widgetSource).to.contain('resetSelectedStyle');

        expect(styleSource).to.contain('.builder-tool-rail-button');
        expect(styleSource).to.contain('.builder-context-strip');
        expect(styleSource).to.contain('.builder-style-presets');
        expect(styleSource).to.contain('.builder-theme-presets');
    });
});
