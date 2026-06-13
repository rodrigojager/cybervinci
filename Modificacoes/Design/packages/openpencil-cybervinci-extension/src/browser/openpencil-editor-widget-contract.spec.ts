import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

describe('OpenPencilEditorWidget parity contract', () => {

    const packageRoot = findPackageRoot(__dirname);

    function readPackageFile(relativePath: string): string {
        return fs.readFileSync(path.join(packageRoot, relativePath), 'utf8');
    }

    it('keeps Theia load, save, revert, and dirty state wired to .op serialization', () => {
        const source = readPackageFile('src/browser/openpencil-editor-widget.tsx');

        expect(source).to.contain('implements Navigatable, SaveableSource, OpenPencilDesignSession');
        expect(source).to.contain('readonly saveable: Saveable;');
        expect(source).to.contain('get dirty(): boolean');
        expect(source).to.contain('get onDirtyChanged(): Event<void>');
        expect(source).to.contain('get onContentChanged(): Event<void>');
        expect(source).to.contain('save: () => self.save()');
        expect(source).to.contain('revert: () => self.revert()');
        expect(source).to.contain('filters: () => ({ [`${cybervinciCanvasProductLabel} Design`]: [\'op\'] })');
        expect(source).to.contain('this.fileService.read(this.uri)');
        expect(source).to.contain('this.documents.deserialize(content)');
        expect(source).to.contain('this.lastSavedContent = this.documents.serialize(this.document)');
        expect(source).to.contain('this.fileService.writeFile(this.uri, BinaryBuffer.fromString(serialized))');
        expect(source).to.contain('this.lastSavedContent = serialized');
        expect(source).to.contain('this.documents.serialize(this.document) !== this.lastSavedContent');
        expect(source).to.contain('this.setDirty(false)');
        expect(source).to.contain('this.updateDirtyState(true)');
        expect(source).to.contain('this.captureUndoSnapshot()');
    });

    it('keeps the fallback visual editor shell feature-complete around the runtime canvas', () => {
        const source = readPackageFile('src/browser/openpencil-editor-widget.tsx');

        expect(source).to.contain('<OpenPencilReactRuntimeHost');
        expect(source).to.contain('const fallback = this.renderFallbackShell(document, page, nodes, selected);');
        expect(source).to.contain('fallback={fallback}');
        expect(source).to.contain('className=\'openpencil-toolbar\'');
        expect(source).to.contain('this.renderPageStrip()');
        expect(source).to.contain('className=\'openpencil-layers\'');
        expect(source).to.contain('className={`openpencil-canvas-wrap');
        expect(source).to.contain('className=\'openpencil-properties\'');
        expect(source).to.contain('className=\'openpencil-status\'');
        expect(source).to.contain('this.selectionStatusLabel(page)');
        expect(source).to.contain('Math.round(this.canvasZoom * 100)');
        expect(source).to.contain('className=\'openpencil-canvas\'');
        expect(source).to.contain('viewBox={`0 0 ${width} ${height}`}');
        expect(source).to.contain('className=\'openpencil-canvas-bg\'');
        expect(source).to.contain('className=\'openpencil-grid-fill\'');
        expect(source).to.contain('protected nodesInPaintOrder(nodes: OpenPencilNode[]): OpenPencilNode[]');
        expect(source).to.contain('this.nodesInPaintOrder(nodes).map(node => this.renderNode(node))');
        expect(source).to.contain('this.nodesInPaintOrder(node.children ?? []).map(child => this.renderNode({ ...child, x: (child.x ?? 0) + x, y: (child.y ?? 0) + y }))');
        expect(source).to.contain('this.renderMarquee()');
        expect(source).to.contain('className=\'openpencil-selection\'');
        expect(source).to.contain('className=\'openpencil-resize-handle\'');
        expect(source).to.contain('node.type === \'rectangle\'');
        expect(source).to.contain('node.type === \'ellipse\'');
        expect(source).to.contain('node.type === \'line\'');
        expect(source).to.contain('node.type === \'text\'');
        expect(source).to.contain('node.type === \'image\'');
        expect(source).to.contain('node.type === \'polygon\'');
        expect(source).to.contain('node.type === \'path\'');
    });

    it('keeps the OpenPencil original editor anatomy while mapping colors through Theia tokens', () => {
        const widgetSource = readPackageFile('src/browser/openpencil-editor-widget.tsx');
        const runtimeSource = readPackageFile('src/browser/openpencil-react-runtime-host.tsx');
        const styles = readPackageFile('src/browser/style/openpencil-editor.css');

        expect(widgetSource).to.contain('protected renderTopBar(document: OpenPencilDocument, page: OpenPencilPage): React.ReactNode');
        expect(widgetSource).to.contain("className='openpencil-topbar'");
        expect(widgetSource).to.contain("className='openpencil-toolbar'");
        expect(widgetSource).to.contain("className='openpencil-boolean-toolbar'");
        expect(widgetSource).to.contain("className='openpencil-selection-toolbar'");
        expect(widgetSource).to.contain("className='openpencil-file-menu-shell'");
        expect(widgetSource).to.contain("className='openpencil-menu openpencil-shape-menu'");
        expect(widgetSource).to.contain("const OPENPENCIL_IMPORT_FIGMA_JSON_COMMAND = 'openpencil.importFigmaJson'");
        expect(widgetSource).to.contain('protected layerPanelWidth = 224;');
        expect(widgetSource).to.contain('protected propertiesPanelWidth = 256;');
        expect(widgetSource).to.contain("onPointerDown={event => this.startPanelResize(event, 'layers')}");
        expect(widgetSource).to.contain("onPointerDown={event => this.startPanelResize(event, 'properties')}");

        expect(runtimeSource).to.contain("className='openpencil-sdk-app'");
        expect(runtimeSource).to.contain("className='openpencil-sdk-topbar'");
        expect(runtimeSource).to.contain("className='openpencil-sdk-workspace'");
        expect(runtimeSource).to.contain("<CoreToolbar className='openpencil-sdk-toolbar' />");
        expect(runtimeSource).to.contain("className='openpencil-sdk-status-cluster'");

        expect(styles).to.contain('--openpencil-background: var(--theia-editor-background)');
        expect(styles).to.contain('--openpencil-card: var(--theia-sideBar-background, var(--theia-editor-background))');
        expect(styles).to.contain('--openpencil-accent: var(--theia-list-activeSelectionBackground, var(--theia-toolbar-activeBackground))');
        expect(styles).to.contain('--openpencil-sdk-component: var(--theia-list-activeSelectionBackground, var(--openpencil-sdk-ring))');
        expect(styles).to.contain('Theme-bound Canvas chrome');
        expect(styles).to.contain('--openpencil-accent: var(--theia-button-background, var(--theia-list-activeSelectionBackground, var(--theia-focusBorder)))');
        expect(styles).to.contain('.openpencil-sdk-shell .openpencil-sdk-toolbar button[aria-pressed="true"]');
        expect(styles).not.to.contain('openpencil-figma');
        expect(styles).not.to.contain('#0d99ff');
        expect(styles).not.to.contain('rgba(');
        expect(styles).not.to.contain('#3b82f6');
        expect(styles).not.to.contain('#2563eb');
        expect(styles).to.contain('.openpencil-toolbar');
        expect(styles).to.contain('flex-direction: column');
        expect(styles).to.contain('.openpencil-property-grid input[type="checkbox"]');
        expect(styles).to.contain('.openpencil-property-grid input[type="color"]');
        expect(styles).to.contain('width: 18px !important');
        expect(styles).to.contain('width: 46px !important');
        expect(styles).to.contain('justify-content: center');
        expect(styles).to.contain('.openpencil-sdk-shell .openpencil-sdk-toolbar');
        expect(styles).to.contain('--openpencil-sdk-card: var(--openpencil-card)');
        expect(styles).to.contain('button[aria-label="Shape options"] svg');
        expect(styles).to.contain('[class~="left-full"][class~="top-0"][class~="bg-card"] button');
        expect(styles).to.contain('[class~="bg-card"][class~="border"][class~="shadow-lg"] button');
        expect(styles).to.contain('position: absolute !important');
        expect(styles).to.contain('z-index: 5000 !important');
    });

    it('keeps fallback properties aligned with the richer pen-react property panel surface', () => {
        const source = readPackageFile('src/browser/openpencil-editor-widget.tsx');

        expect(source).to.contain('className=\'openpencil-property-meta openpencil-property-wide\'');
        expect(source).to.contain('this.renderSizeValueInput(\'Width\'');
        expect(source).to.contain('this.renderSizeValueInput(\'Height\'');
        expect(source).to.contain('Fill opacity');
        expect(source).to.contain('Stroke opacity');
        expect(source).to.contain('openpencil-property-section openpencil-property-wide\'>Layout');
        expect(source).to.contain('Direction');
        expect(source).to.contain('Justify');
        expect(source).to.contain('Align');
        expect(source).to.contain('Clip content');
        expect(source).to.contain('Font family');
        expect(source).to.contain('Vertical align');
        expect(source).to.contain('Line height');
        expect(source).to.contain('Letter spacing');
        expect(source).to.contain('Text growth');
        expect(source).to.contain('Object fit');
        expect(source).to.contain('Effects JSON');
        expect(source).to.contain('Description');
    });

    it('exposes the complete export and codegen target surface in the editor toolbar', () => {
        const source = readPackageFile('src/browser/openpencil-editor-widget.tsx');

        for (const format of [
            'html-css',
            'react-tailwind',
            'vue',
            'svelte',
            'react-native',
            'flutter',
            'swiftui',
            'jetpack-compose',
            'svg',
            'openpencil-json',
            'openpencil-summary-json'
        ]) {
            expect(source).to.contain(`format: '${format}'`);
            expect(source).to.contain('data-export-format={entry.format}');
        }

        for (const extension of ['.html', '.tsx', '.vue', '.svelte', '.dart', '.swift', '.kt', '.svg', '.op.json', '.openpencil-summary.json']) {
            expect(source).to.contain(`extension: '${extension}'`);
        }

        expect(source).to.contain("adapter: 'pen-codegen-direct'");
        expect(source).to.contain("adapter: 'local-serializer'");
        expect(source).to.contain("adapter: 'local-svg-fallback'");
        expect(source).to.contain("protected exportFormat: OpenPencilExportFormat = 'html-css'");
        expect(source).to.contain("protected exportScope: OpenPencilExportScope = 'document'");
        expect(source).to.contain("this.exportCurrentDocument(this.exportFormat, this.exportScope === 'selection')");
        expect(source).to.contain('this.getExportTarget(format).extension');
    });

    it('exposes OpenPencil design-code and component library affordances in the editor toolbar', () => {
        const source = readPackageFile('src/browser/openpencil-editor-widget.tsx');
        const styles = readPackageFile('src/browser/style/openpencil-editor.css');

        expect(source).to.contain("const OPENPENCIL_OPEN_AS_JSON_COMMAND = 'openpencil.openAsJson'");
        expect(source).to.contain("const OPENPENCIL_EXPORT_UI_KIT_COMMAND = 'openpencil.exportUIKit'");
        expect(source).to.contain('protected renderDesignInteropButtons(): React.ReactNode');
        expect(source).to.contain("className='openpencil-toolbar-group openpencil-design-actions'");
        expect(source).to.contain("className='theia-button openpencil-design-json-run'");
        expect(source).to.contain('Open Design-as-Code JSON for this design');
        expect(source).to.contain('this.executeOpenPencilCommand(OPENPENCIL_OPEN_AS_JSON_COMMAND, this.uri)');
        expect(source).to.contain("className='theia-button openpencil-components-run'");
        expect(source).to.contain('Export selection or page as a Components UI kit');
        expect(source).to.contain('this.executeOpenPencilCommand(OPENPENCIL_EXPORT_UI_KIT_COMMAND)');
        expect(source).to.contain("codicon('extensions')");
        expect(styles).to.contain('.openpencil-design-actions');
        expect(styles).to.contain('.openpencil-runtime-export-toolbar .openpencil-export-meta');
    });

    it('exposes Continue Design with AI command wiring in the editor toolbar and contribution', () => {
        const widgetSource = readPackageFile('src/browser/openpencil-editor-widget.tsx');
        const contributionSource = readPackageFile('src/browser/openpencil-editor-contribution.ts');

        expect(widgetSource).to.contain('OPENPENCIL_CONTINUE_DESIGN_WITH_AI_COMMAND');
        expect(widgetSource).to.contain("openpencil.continueDesignWithAi");
        expect(widgetSource).to.contain('Continue');
        expect(widgetSource).to.contain('this.executeOpenPencilCommand(OPENPENCIL_CONTINUE_DESIGN_WITH_AI_COMMAND, this.uri)');
        expect(contributionSource).to.contain('CONTINUE_DESIGN_WITH_AI');
        expect(contributionSource).to.contain('continueDesignWithAi');
        expect(contributionSource).to.contain("requestMode: 'continuation'");
    });

    it('keeps selection-only export disabled when the editor has no selection', () => {
        const source = readPackageFile('src/browser/openpencil-editor-widget.tsx');

        expect(source).to.contain('const selectionUnavailable = !this.selectedIds.length;');
        expect(source).to.contain("const exportDisabled = this.exportScope === 'selection' && selectionUnavailable;");
        expect(source).to.contain("<option value='selection' disabled={selectionUnavailable}>Selection only</option>");
        expect(source).to.contain('disabled={exportDisabled}');
        expect(source).to.contain('Select at least one node to export selection only');
    });

    it('keeps AI toolbar status detailed while progressive operations render between frames', () => {
        const source = readPackageFile('src/browser/openpencil-editor-widget.tsx');

        expect(source).to.contain("export type OpenPencilAiStatusPhase = 'preparing' | 'validating' | 'applying' | 'complete' | 'error';");
        expect(source).to.contain('setAiStatus(status: OpenPencilAiStatus | string | undefined)');
        expect(source).to.contain('clearAiStatusSoon(delayMs = 2400)');
        expect(source).to.contain('createAiRollbackSnapshot()');
        expect(source).to.contain('restoreAiRollbackSnapshot(snapshot: OpenPencilDocumentStateSnapshot)');
        expect(source).to.contain('applyOperationsProgressively(operations: OpenPencilDesignOperation[], options: OpenPencilProgressiveApplyOptions = {})');
        expect(source).to.contain('applyOptions?: OpenPencilApplyOperationsOptions;');
        expect(source).to.contain('this.commandService.applyOperationsToDocument(this.document, currentSelection, [operation], options.applyOptions)');
        expect(source).to.contain('await options.onProgress?.({ applied, total, result: lastResult });');
        expect(source).to.contain('await this.waitForProgressiveApplyFrame(delayMs);');
        expect(source).to.contain('requestAnimationFrame(() => {');
        expect(source).to.contain('Operation ${applied + 1}/${total} failed');
        expect(source).to.contain('this.undoStack.push(initialSnapshot)');
        expect(source).to.contain("this.aiStatus.phase !== 'complete' && this.aiStatus.phase !== 'error'");
        expect(source).to.contain("<span>{this.aiStatus ? aiLabel : 'AI Edit'}</span>");
    });

    it('keeps CyberVinci AI apply validation-gated, progress-aware, and partial-failure counted', () => {
        const source = readPackageFile('src/browser/openpencil-editor-contribution.ts');

        expect(source).to.contain('OPENPENCIL_AI_PROGRESSIVE_APPLY_DELAY_MS');
        expect(source).to.contain("this.createAiStatus('preparing', 'Preparing'");
        expect(source).to.contain("this.createAiStatus('validating', 'Validating'");
        expect(source).to.contain('const applyValidation = this.commandService.validateDocument(applyPreview.document);');
        expect(source).to.contain('await widget.applyOperationsProgressively(operations, {');
        expect(source).to.contain('normalizeVisibleBounds: true');
        expect(source).to.contain('this.createAiApplyingStatus(applyProgress.applied, applyProgress.total)');
        expect(source).to.contain("this.createAiStatus('complete', 'Done'");
        expect(source).to.contain("this.createAiStatus('error', 'Error'");
        expect(source).to.contain('Canvas AI edit stopped after applying ${result.applied}/${result.total}');
        expect(source).to.contain('progress?.report({ message: status.detail ?? status.label });');
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

