import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

describe('OpenPencil Theia UX integration contract', () => {

    const packageRoot = findPackageRoot(__dirname);

    function readPackageFile(relativePath: string): string {
        return fs.readFileSync(path.join(packageRoot, relativePath), 'utf8');
    }

    it('contributes clear commands, menus, and keybindings for .op files', () => {
        const contributionSource = readPackageFile('src/browser/openpencil-editor-contribution.ts');
        const moduleSource = readPackageFile('src/browser/openpencil-frontend-module.ts');

        expect(contributionSource).to.contain('implements FrontendApplicationContribution, CommandContribution, MenuContribution, KeybindingContribution');
        expect(contributionSource).to.contain('OpenWithService');
        expect(contributionSource).to.contain('FOCUS_EDITOR');
        expect(contributionSource).to.contain('NEW_DESIGN');
        expect(contributionSource).to.contain('IMPORT_FIGMA_JSON');
        expect(contributionSource).to.contain('OPEN_AS_JSON');
        expect(contributionSource).to.contain('EXPORT_DOCUMENT');
        expect(contributionSource).to.contain('EXPORT_SELECTION');
        expect(contributionSource).to.contain('EXPORT_SVG');
        expect(contributionSource).to.contain('GENERATE_WITH_AI');
        expect(contributionSource).to.contain('PROMPT_TO_DESIGN');
        expect(contributionSource).to.contain('EDIT_SELECTED_NODE_WITH_AI');
        expect(contributionSource).to.contain('APPLY_STRUCTURED_COMMAND');
        expect(contributionSource).to.contain('APPLY_AI_EDIT_JSON');
        expect(contributionSource).to.contain('PREVIEW_AI_EDIT_SUMMARY');
        expect(contributionSource).to.contain('SHOW_DOCUMENT_SUMMARY');
        expect(contributionSource).to.contain('CREATE_COMMAND_FILE');
        expect(contributionSource).to.contain('CREATE_AI_EDIT_COMMAND_FILE');
        expect(contributionSource).to.contain('APPLY_COMMAND_FILE');
        expect(contributionSource).to.contain('SHOW_BACKEND_STATUS');
        expect(contributionSource).to.contain('LIST_CODEGEN_TARGETS');
        expect(contributionSource).to.contain('LIST_MCP_TOOLS');
        expect(contributionSource).to.contain('LIST_CLI_COMMANDS');
        expect(contributionSource).to.contain('OpenPencilMenus.OPENPENCIL');
        expect(contributionSource).to.contain('CommonMenus.FILE_NEW_CONTRIBUTIONS');
        expect(contributionSource).to.contain('OpenPencilMenus.FILE_NAVIGATOR');
        expect(contributionSource).to.contain('registerKeybindings');
        expect(contributionSource).to.contain('ctrlcmd+alt+p');
        expect(contributionSource).to.contain('ctrlcmd+alt+e');
        expect(contributionSource).to.contain('ctrlcmd+alt+j');

        expect(moduleSource).to.contain('bind(FrontendApplicationContribution).toService(OpenPencilEditorContribution)');
        expect(moduleSource).to.contain('bind(KeybindingContribution).toService(OpenPencilEditorContribution)');
    });

    it('keeps .op labeling and user-facing failure messages in the Theia layer', () => {
        const contributionSource = readPackageFile('src/browser/openpencil-editor-contribution.ts');
        const moduleSource = readPackageFile('src/browser/openpencil-frontend-module.ts');

        expect(contributionSource).to.contain('OpenPencilLabelProviderContribution');
        expect(contributionSource).to.contain("codicon('symbol-color')");
        expect(contributionSource).to.contain('OpenPencil design');
        expect(contributionSource).to.contain('Could not ${action}');
        expect(contributionSource).to.contain('Open a Canvas visual editor before exporting.');
        expect(contributionSource).to.contain('Select at least one Canvas node before exporting the selection.');

        expect(moduleSource).to.contain('bind(LabelProviderContribution).toService(OpenPencilLabelProviderContribution)');
    });

    it('keeps command-palette AI and sidecar file flows behind the structured command service', () => {
        const contributionSource = readPackageFile('src/browser/openpencil-editor-contribution.ts');

        expect(contributionSource).to.contain('Canvas: Generate with AI');
        expect(contributionSource).to.contain('Canvas: Prompt to Design');
        expect(contributionSource).to.contain('Canvas: Edit Selected Node with AI');
        expect(contributionSource).to.contain('Canvas: Import Figma JSON');
        expect(contributionSource).to.contain('Canvas: Apply Structured Command');
        expect(contributionSource).to.contain('Canvas: Apply AI Edit JSON');
        expect(contributionSource).to.contain('Canvas: Preview AI Edit Summary');
        expect(contributionSource).to.contain('Canvas: Create Command File');
        expect(contributionSource).to.contain('Canvas: Create AI Edit Command File');
        expect(contributionSource).to.contain('Canvas: Apply Commands from File');
        expect(contributionSource).to.contain('Canvas: Show Document Summary');
        expect(contributionSource).to.contain('Canvas: Show Bridge Status');
        expect(contributionSource).to.contain('Canvas: List Codegen Targets');
        expect(contributionSource).to.contain('Canvas: List MCP-Compatible Tools');
        expect(contributionSource).to.contain('Canvas: List CLI-Compatible Commands');
        expect(contributionSource).to.contain('OpenPencilMenus.OPENPENCIL');
        expect(contributionSource).to.contain('WebSocketConnectionProvider');
        expect(contributionSource).to.contain('OPENPENCIL_BACKEND_PATH');
        expect(contributionSource).to.contain('openpencil.codegen.targets.list');
        expect(contributionSource).to.contain('openpencil.mcp.tools.list');
        expect(contributionSource).to.contain('openpencil.cli.commands.list');
        expect(contributionSource).to.contain('openpencil.document.import');
        expect(contributionSource).to.contain("format: 'auto'");
        expect(contributionSource).to.contain('current selection: ${this.formatSelection');
        expect(contributionSource).to.contain('this.commandService.generateAiOperations');
        expect(contributionSource).to.contain('this.commandService.streamAiOperations');
        expect(contributionSource).to.contain('readAiExecutionChoice');
        expect(contributionSource).to.contain('executeStreamingAiPromptWithFeedback');
        expect(contributionSource).to.contain('executeIncrementalAiPromptWithFeedback');
        expect(contributionSource).to.contain('{ quiet: true, batchSize: 1 }');
        expect(contributionSource).to.contain('OPENPENCIL_AI_INCREMENTAL_KEY');
        expect(contributionSource).to.contain('createAiPreviewFile');
        expect(contributionSource).to.contain('runAiPromptFlow');
        expect(contributionSource).to.contain('promptToDesign');
        expect(contributionSource).to.contain('editSelectedNodeWithAi');
        expect(contributionSource).to.contain('this.commandService.validateDocument');
        expect(contributionSource).to.contain('Apply');
        expect(contributionSource).to.contain('Always Apply');
        expect(contributionSource).to.contain('Review Changes');
        expect(contributionSource).to.contain('Keep');
        expect(contributionSource).to.contain('OPENPENCIL_AI_AUTO_APPLY_KEY');
        expect(contributionSource).to.contain('applyGeneratedAiOperations');
        expect(contributionSource).to.contain('widget.applyOperations(operations)');
        expect(contributionSource).to.contain('this.commandService.applyOperationsToDocument(this.documents.cloneDocument(document), widget.getSelection(), operations)');
        expect(contributionSource).to.contain('this.commandService.exportDocument');
        expect(contributionSource).to.contain('this.commandService.getDocumentSummary');
        expect(contributionSource).to.contain('.openpencil-commands.json');
        expect(contributionSource).to.contain('.openpencil-ai-edit.json');
        expect(contributionSource).to.contain('.openpencil-ai-preview.json');
        expect(contributionSource).to.contain('.openpencil-summary.json');
        expect(contributionSource).to.contain('parseStructuredOperations');
        expect(contributionSource).to.contain('isDesignOperation');
        expect(contributionSource).not.to.contain('querySelector');
        expect(contributionSource).not.to.contain('getElementById');
        expect(contributionSource).not.to.contain('document.querySelector');
        expect(contributionSource).not.to.contain('local mock');
    });

    it('registers provider-neutral AI Runtime first and keeps legacy language-model fallback behind the OpenPencil provider extension point', () => {
        const moduleSource = readPackageFile('src/browser/openpencil-frontend-module.ts');
        const runtimeProviderSource = readPackageFile('src/browser/openpencil-ai-runtime-design-provider.ts');
        const serviceSource = readPackageFile('src/browser/openpencil-design-command-service.ts');

        expect(moduleSource).to.contain('bindRootContributionProvider(bind, OpenPencilAiDesignProvider)');
        expect(moduleSource).to.contain('OpenPencilAiRuntimeDesignProvider');
        expect(moduleSource.indexOf('OpenPencilAiRuntimeDesignProvider')).to.be.lessThan(moduleSource.indexOf('OpenPencilBackendCodexAiDesignProvider'));
        expect(runtimeProviderSource).to.contain('CyberVinciAiRuntimeService');
        expect(runtimeProviderSource).to.contain('CyberVinciAiRuntimeFrontendService');
        expect(runtimeProviderSource).to.contain("surfaceId: 'openpencil-design'");
        expect(runtimeProviderSource).to.contain("action: 'canvas.generateOperations'");
        expect(runtimeProviderSource).to.contain("action: 'canvas.streamOperations'");
        expect(runtimeProviderSource).to.contain('streamOperations');
        expect(runtimeProviderSource).to.contain('openpencil_design_operation_events');
        expect(runtimeProviderSource).to.contain('tokenBudget: 8000');
        expect(runtimeProviderSource).to.contain('one vertical page frame about 1200px wide');
        expect(runtimeProviderSource).to.contain('request.execution');
        expect(moduleSource).to.contain('OpenPencilCyberVinciAiDesignProvider');
        expect(serviceSource).to.contain('LanguageModelRegistry');
        expect(serviceSource).to.contain('LanguageModelService');
        expect(serviceSource).to.contain('openpencil-design');
        expect(serviceSource).to.contain('openpencil.design-operations.v1');
        expect(serviceSource).to.contain('OpenPencilAiDesignStreamEvent');
        expect(serviceSource).to.contain('streamAiOperations');
        expect(serviceSource).to.contain('validateAiOperationsPreview');
        expect(serviceSource).to.contain('Do not return DOM selectors');
    });

    it('keeps product export/codegen entry points coherent in menus and the editor toolbar', () => {
        const contributionSource = readPackageFile('src/browser/openpencil-editor-contribution.ts');
        const widgetSource = readPackageFile('src/browser/openpencil-editor-widget.tsx');

        expect(contributionSource).to.contain('Canvas: Export Document to Code');
        expect(contributionSource).to.contain('Canvas: Export Selection to Code');
        expect(contributionSource).to.contain('Canvas: Export Document to SVG');
        expect(contributionSource).to.contain("const format = selectionOnly ? 'react-tailwind' : 'html-css';");
        expect(contributionSource).to.contain("const extension = selectionOnly ? '.tsx' : '.html';");
        expect(contributionSource).to.contain("this.commandService.exportDocument(document, widget.getSelection(), format, selectionOnly)");
        expect(contributionSource).to.contain("this.commandService.exportDocument(document, widget.getSelection(), 'svg', false)");

        expect(widgetSource).to.contain("title='Export document to HTML'");
        expect(widgetSource).to.contain("title='Export selection to React'");
        expect(widgetSource).to.contain("title='Export document to SVG'");
        expect(widgetSource).to.contain('toolbarTrailing={this.renderRuntimeToolbarTrailing()}');
        expect(widgetSource).to.contain('renderQuickExportButtons');
        expect(widgetSource).to.contain("aria-label='Canvas export and code generation'");
        expect(widgetSource).to.contain("title='Export target'");
        expect(widgetSource).to.contain("title='Export scope'");
        expect(widgetSource).to.contain("Selection only");
        expect(widgetSource).to.contain("pen-codegen-direct");
        expect(widgetSource).to.contain("react-tailwind");
        expect(widgetSource).to.contain("vue");
        expect(widgetSource).to.contain("svelte");
        expect(widgetSource).to.contain("react-native");
        expect(widgetSource).to.contain("flutter");
        expect(widgetSource).to.contain("swiftui");
        expect(widgetSource).to.contain("jetpack-compose");
        expect(widgetSource).to.contain("openpencil-json");
        expect(widgetSource).to.contain("openpencil-summary-json");
        expect(widgetSource).to.contain("this.exportCurrentDocument('html-css')");
        expect(widgetSource).to.contain("this.exportCurrentDocument('react-tailwind', true)");
        expect(widgetSource).to.contain("this.exportCurrentDocument('svg')");
        expect(widgetSource).to.contain('this.getExportTarget(format).extension');
    });

    it('keeps vector-editing controls available in the Theia editor shell', () => {
        const serviceSource = readPackageFile('src/browser/openpencil-design-command-service.ts');
        const widgetSource = readPackageFile('src/browser/openpencil-editor-widget.tsx');

        expect(serviceSource).to.contain("case 'booleanNodes'");
        expect(serviceSource).to.contain("case 'convertToPath'");
        expect(serviceSource).to.contain("case 'updatePathAnchors'");
        expect(serviceSource).to.contain('openPencilRuntimeVectorOperations');

        expect(widgetSource).to.contain("this.applyBooleanOperation('union')");
        expect(widgetSource).to.contain("this.applyBooleanOperation('subtract')");
        expect(widgetSource).to.contain("this.applyBooleanOperation('intersect')");
        expect(widgetSource).to.contain("this.applyBooleanOperation('exclude')");
        expect(widgetSource).to.contain("operation: 'convertToPath'");
        expect(widgetSource).to.contain("operation: 'updatePathAnchors'");
        expect(widgetSource).to.contain('renderPathAnchors');
    });
});

function findPackageRoot(start: string): string {
    let current = path.resolve(start);
    while (true) {
        const manifestPath = path.join(current, 'package.json');
        if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { name?: string };
            if (manifest.name === '@cybervinci/openpencil-extension') {
                return current;
            }
        }
        const parent = path.dirname(current);
        if (parent === current) {
            throw new Error(`Could not find OpenPencil package root from ${start}.`);
        }
        current = parent;
    }
}

