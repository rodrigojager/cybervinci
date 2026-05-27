import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

describe('OpenPencil browser acceptance contract', () => {

    const repoRoot = findRepoRoot(__dirname);

    function readWorkspaceFile(relativePath: string): string {
        return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
    }

    it('keeps a Playwright acceptance flow for create/open, structured edit, save, and reopen', () => {
        const source = readWorkspaceFile('examples/playwright/src/tests/openpencil-acceptance.test.ts');

        expect(source).to.contain('OpenPencil browser acceptance');
        expect(source).to.contain('CyberVinci');
        expect(source).to.contain('Canvas: New Design');
        expect(source).to.contain('canvas-acceptance.op');
        expect(source).to.contain('expectAiCommandPaletteEntryVisible');
        expect(source).to.contain('Canvas: Generate with AI');
        expect(source).to.contain('Canvas: Import Figma JSON');
        expect(source).to.contain('Canvas: Apply Structured Command');
        expect(source).to.contain('Persisted acceptance title');
        expect(source).to.contain('acceptance-cta-label');
        expect(source).to.contain('File > Save');
        expect(source).to.contain('reopenDesignFromExplorer');
        expect(source).to.contain('expectLayerVisible');
        expect(source).to.contain('expectCanvasVisible');
        expect(source).to.contain('expectCanvasSurfaceNotBlank');
        expect(source).to.contain('expectExportCodegenUiVisible');
        expect(source).to.contain('exportGeneratedFilesFromUi');
        expect(source).to.contain('expectExportFile');
        expect(source).to.contain('Export document to HTML');
        expect(source).to.contain('Export selection to React');
        expect(source).to.contain('Export document to SVG');
        expect(source).to.contain('Export target');
        expect(source).to.contain('Selection only');
        expect(source).to.contain('Jetpack Compose');
        expect(source).to.contain('fun OpenPencilDesign()');
        expect(source).to.contain('Acceptance Details');
        expect(source).to.contain('setActivePage');
        expect(source).to.contain('expectSavedDocument');
    });

    it('documents the CyberVinci menu and Welcome launch path for operators', () => {
        const source = readWorkspaceFile('docs/openpencil-parity.md');

        expect(source).to.contain('CyberVinci > Canvas');
        expect(source).to.contain('Welcome');
        expect(source).to.contain('Canvas: New Design');
        expect(source).to.contain('Canvas: New Design');
        expect(source).to.contain('Canvas: Generate with AI');
        expect(source).to.contain('provider hook');
        expect(source).to.contain('Canvas: Import Figma JSON');
        expect(source).to.contain('figma-structural-json');
        expect(source).to.contain('npm --workspace @theia/playwright run ui-tests -- --grep "OpenPencil browser acceptance"');
        expect(source).to.contain('pen-codegen');
        expect(source).to.contain('pen-codegen-direct');
        expect(source).to.contain('HTML, React, SVG, and Jetpack Compose');
        expect(source).to.contain('Page switching uses the structured command path');
        expect(source).to.contain('openpencil.backend.status.get');
        expect(source).to.contain('openpencil.mcp.tools.list');
        expect(source).to.contain('openpencil.cli.commands.list');
        expect(source).to.contain('openpencil.codegen.targets.list');
        expect(source).to.contain('openpencil.codegen.adapter.status');
        expect(source).to.contain('openpencil.codegen.generate');
        expect(source).to.contain('openpencil.codegen.generate.all');
        expect(source).to.contain('adapter-unavailable');
        expect(source).to.contain('complete in-editor export picker for all supported targets');
    });

    it('keeps OpenPencil browser acceptance running inside the same CyberVinci host that loads AI Output Cleaner', () => {
        const browserHostPackage = JSON.parse(readWorkspaceFile('examples/browser/package.json')) as {
            dependencies: Record<string, string>;
        };
        const cleanerCommands = readWorkspaceFile('packages/ai-output-cleaner/src/common/ai-output-cleaner-commands.ts');

        expect(browserHostPackage.dependencies).to.have.property('@cybervinci/openpencil-extension');
        expect(browserHostPackage.dependencies).to.have.property('@cybervinci/ai-output-cleaner');
        expect(cleanerCommands).to.contain("id: 'cybervinci.aiOutputCleaner.showStatus'");
        expect(cleanerCommands).to.contain("id: 'cybervinci.aiOutputCleaner.openArtifacts'");
    });

    it('keeps the objective parity matrix honest about complete, fallback, and non-applicable areas', () => {
        const source = readWorkspaceFile('docs/openpencil-original-parity-matrix.md');

        expect(source).to.contain('**Complete**');
        expect(source).to.contain('**Integrated-with-fallback**');
        expect(source).not.to.contain('**Pending**');
        expect(source).to.contain('**Not-applicable**');
        expect(source).to.contain('| Visual editor shell | Integrated-with-fallback |');
        expect(source).to.contain('| Layers | Integrated-with-fallback |');
        expect(source).to.contain('| Pages | Complete |');
        expect(source).to.contain('Browser acceptance adds a second page and switches active pages through structured commands');
        expect(source).to.contain('| Properties | Integrated-with-fallback |');
        expect(source).to.contain('| Canvas tools and gestures | Integrated-with-fallback |');
        expect(source).to.contain('booleanNodes');
        expect(source).to.contain('convertToPath');
        expect(source).to.contain('updatePathAnchors');
        expect(source).to.contain('Canvas/runtime non-empty checks sample canvas pixels when available');
        expect(source).to.contain('| Import | Integrated-with-fallback |');
        expect(source).to.contain('figma-json');
        expect(source).to.contain('figma-clipboard-html');
        expect(source).to.contain('figma-fig-base64');
        expect(source).to.contain('| Export / codegen backend | Integrated-with-fallback |');
        expect(source).to.contain('| Export picker UI | Complete |');
        expect(source).to.contain('Playwright reads generated HTML, React, SVG, and Jetpack Compose files');
        expect(source).to.contain('Toolbar exposes a complete target picker');
        expect(source).to.contain('| AI commands | Integrated-with-fallback |');
        expect(source).to.contain('OpenPencilAiDesignProvider');
        expect(source).to.contain('deterministic fallback');
        expect(source).to.contain('| In-process MCP / CLI-compatible bridge | Integrated-with-fallback |');
        expect(source).to.contain('externalProcessStarted: false');
        expect(source).to.contain('| Persistence | Complete |');
        expect(source).to.contain('| Electron | Not-applicable |');
        expect(source).to.contain('| Browser | Complete |');
        expect(source).to.contain('| Testing | Complete |');
        expect(source).to.contain('No Electron-specific OpenPencil UI acceptance is added in this round');
        expect(source).to.contain('| Original OpenPencil App sync backend | Not-applicable |');
        expect(source).to.contain('| External MCP server | Not-applicable |');
        expect(source).to.contain('| Original standalone CLI process execution | Not-applicable |');
        expect(source).to.contain('| Original Figma plugin workflow | Not-applicable |');
    });
});

function findRepoRoot(start: string): string {
    let current = path.resolve(start);
    while (true) {
        const manifestPath = path.join(current, 'package.json');
        if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { workspaces?: string[] };
            if (manifest.workspaces?.includes('packages/*')) {
                return current;
            }
        }
        const parent = path.dirname(current);
        if (parent === current) {
            throw new Error(`Could not find repository root from ${start}.`);
        }
        current = parent;
    }
}
