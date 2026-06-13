import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

interface PackageManifest {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
}

describe('OpenPencil pen-react runtime integration contract', () => {

    const repoRoot = findRepoRoot(__dirname);
    const packageRoot = findPackageRoot(__dirname);

    function readRepoFile(relativePath: string): string {
        return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
    }

    function readPackageFile(relativePath: string): string {
        return fs.readFileSync(path.join(packageRoot, relativePath), 'utf8');
    }

    it('keeps pen-react on the host React singleton instead of declaring a second React runtime', () => {
        const manifest = JSON.parse(readRepoFile('vendor/openpencil/packages/pen-react/package.json')) as PackageManifest;
        const productionDependencies = {
            ...(manifest.dependencies ?? {}),
            ...(manifest.optionalDependencies ?? {})
        };

        expect(productionDependencies).not.to.have.property('react');
        expect(productionDependencies).not.to.have.property('react-dom');
        expect(manifest.devDependencies ?? {}).not.to.have.property('react');
        expect(manifest.devDependencies ?? {}).not.to.have.property('react-dom');
        expect(manifest.peerDependencies?.react).to.contain('^18.3.1');
        expect(manifest.peerDependencies?.react).to.contain('^19.0.0');
        expect(manifest.peerDependencies?.['react-dom']).to.contain('^18.3.1');
        expect(manifest.peerDependencies?.['react-dom']).to.contain('^19.0.0');
    });

    it('mounts pen-react through a Theia React host without direct React imports in the widget', () => {
        const widgetSource = readPackageFile('src/browser/openpencil-editor-widget.tsx');
        const hostSource = readPackageFile('src/browser/openpencil-react-runtime-host.tsx');
        const extensionManifest = JSON.parse(readPackageFile('package.json')) as PackageManifest;

        expect(widgetSource).to.contain("import * as React from '@theia/core/shared/react';");
        expect(widgetSource).not.to.match(/from ['"]react['"]/);
        expect(widgetSource).not.to.match(/from ['"]react-dom(?:\/client)?['"]/);
        expect(widgetSource).not.to.contain('@zseven-w/pen-react');
        expect(widgetSource).to.contain('<OpenPencilReactRuntimeHost');

        expect(hostSource).to.contain("import * as React from '@theia/core/shared/react';");
        expect(hostSource).to.contain("require('@zseven-w/pen-react')");
        expect(hostSource).to.contain('DesignProvider: bundledPenReactModule.DesignProvider');
        expect(hostSource).to.contain('DesignCanvas: bundledPenReactModule.DesignCanvas');
        expect(hostSource).to.contain('CoreToolbar: bundledPenReactModule.CoreToolbar');
        expect(hostSource).to.contain('LayerPanel: bundledPenReactModule.LayerPanel');
        expect(hostSource).to.contain('PropertyPanel: bundledPenReactModule.PropertyPanel');
        expect(hostSource).to.contain('StatusBar: bundledPenReactModule.StatusBar');
        expect(hostSource).to.contain('useViewport: bundledPenReactModule.useViewport');
        expect(hostSource).to.contain('toOpenPencilRuntimeDocument');
        expect(hostSource).to.contain('fromOpenPencilRuntimeDocument');
        expect(hostSource).to.contain('toOpenPencilRuntimeDocument(document, page.id)');
        expect(hostSource).to.contain('resolveRuntimeActivePageId(runtimeEngineRef.current, next, page.id)');
        expect(hostSource).to.contain('fromOpenPencilRuntimeDocument(next, activePageId, document)');
        expect(hostSource).to.contain("require('canvaskit-wasm/bin/canvaskit.wasm')");
        expect(hostSource).to.contain('canvasKitPath={resolveCanvasKitFile}');
        expect(hostSource).to.contain('onReady={handleCanvasReady}');
        expect(extensionManifest.dependencies?.react).to.equal(undefined);
        expect(extensionManifest.dependencies?.['react-dom']).to.equal(undefined);
    });

    it('keeps the Theia adapter and fallback canvas explicit around the mounted pen-react runtime', () => {
        const widgetSource = readPackageFile('src/browser/openpencil-editor-widget.tsx');
        const hostSource = readPackageFile('src/browser/openpencil-react-runtime-host.tsx');
        const commandServiceSource = readPackageFile('src/browser/openpencil-design-command-service.ts');
        const backendSource = readPackageFile('src/node/openpencil-backend-service.ts');

        expect(widgetSource).to.contain('implements Navigatable, SaveableSource, OpenPencilDesignSession');
        expect(widgetSource).to.contain('this.commandService.registerSession(this)');
        expect(widgetSource).to.contain('protected renderCanvas(page: OpenPencilPage, nodes: OpenPencilNode[]): React.ReactNode');
        expect(widgetSource).to.contain('protected renderFallbackShell');
        expect(widgetSource).to.contain('const fallback = this.renderFallbackShell(document, page, nodes, selected);');
        expect(widgetSource).to.contain('fallback={fallback}');
        expect(hostSource).to.contain('OpenPencilRuntimeBoundary');
        expect(hostSource).to.contain('return <>{fallback}</>;');
        expect(hostSource).to.contain('<CoreToolbar');
        expect(hostSource).to.contain("className='openpencil-sdk-topbar-actions'");
        expect(hostSource).to.contain('{toolbarTrailing}');
        expect(hostSource).to.contain('<LayerPanel');
        expect(hostSource).to.contain('<PropertyPanel');
        expect(hostSource).to.contain('OpenPencilRuntimeStatusDetails');
        expect(hostSource).to.contain('useViewport');
        expect(hostSource).to.contain('formatRuntimeNodeGeometry');
        expect(hostSource).to.contain('openpencil-sdk-status-cluster');
        expect(hostSource).to.contain('openpencil-sdk-status-detail');
        expect(hostSource).to.contain('selection:change');
        expect(hostSource).to.contain('viewport:change');
        expect(hostSource).to.contain('node:hover');
        expect(hostSource).to.contain('page:change');
        expect(hostSource).to.contain('syncRuntimeSelection');
        expect(hostSource).to.contain('syncRuntimeActivePage');
        expect(hostSource).to.contain('ensureRuntimeEngineCompatibility');
        expect(hostSource).to.contain('engine.setZoom');
        expect(hostSource).to.contain('engine.getParentOf');
        expect(hostSource).to.contain('typeof reactType === \'symbol\'');
        expect(widgetSource).to.contain('selectedIds={this.selectedIds}');
        expect(widgetSource).to.contain('dirty={this.dirty}');
        expect(widgetSource).to.contain('resourceName={this.uri.path.base}');
        expect(widgetSource).to.contain('onSelectionChange={nextSelection => this.setSelection(nextSelection)}');
        expect(commandServiceSource).to.contain('export interface OpenPencilDesignSession');
        expect(commandServiceSource).to.contain('export interface OpenPencilApplyOperationsOptions');
        expect(commandServiceSource).to.contain('applyOperationsToDocument(document: OpenPencilDocument, selection: string[], operations: OpenPencilDesignOperation[], options?: OpenPencilApplyOperationsOptions)');
        expect(backendSource).to.contain("reactIsolation: 'pen-react'");
        expect(backendSource).to.contain('mounts DesignProvider, DesignCanvas, CoreToolbar, LayerPanel, and PropertyPanel');
        expect(backendSource).to.contain('local SVG canvas remains as a fallback');
    });

    it('documents the vendored pen-react controls used before adding adapter-only UI', () => {
        const indexSource = readRepoFile('vendor/openpencil/packages/pen-react/src/index.ts');
        const propertyPanelSource = readRepoFile('vendor/openpencil/packages/pen-react/src/components/property-panel.tsx');
        const statusBarSource = readRepoFile('vendor/openpencil/packages/pen-react/src/components/status-bar.tsx');
        const layerPanelSource = readRepoFile('vendor/openpencil/packages/pen-react/src/components/layer-panel.tsx');

        expect(indexSource).to.contain('export { CoreToolbar }');
        expect(indexSource).to.contain('export { LayerPanel }');
        expect(indexSource).to.contain('export { PropertyPanel }');
        expect(indexSource).to.contain('export { BooleanToolbar }');
        expect(indexSource).to.contain('export { PageTabs }');
        expect(indexSource).to.contain('export { StatusBar }');
        expect(indexSource).to.contain('export { useViewport }');

        expect(propertyPanelSource).to.contain('<SizeSection');
        expect(propertyPanelSource).to.contain('<LayoutSection');
        expect(propertyPanelSource).to.contain('<TextLayoutSection');
        expect(propertyPanelSource).to.contain('<AppearanceSection');
        expect(propertyPanelSource).to.contain('<FillSection');
        expect(propertyPanelSource).to.contain('<StrokeSection');
        expect(propertyPanelSource).to.contain('<TextSection');
        expect(propertyPanelSource).to.contain('<EffectsSection');
        expect(propertyPanelSource).to.contain('<ImageSection');
        expect(propertyPanelSource).to.contain('<ExportSection');

        expect(statusBarSource).to.contain('useViewport');
        expect(statusBarSource).to.contain('handleZoomOut');
        expect(statusBarSource).to.contain('handleZoomIn');
        expect(statusBarSource).to.contain('handleZoomReset');
        expect(layerPanelSource).to.contain('<PageTabs');
        expect(layerPanelSource).to.contain('handleToggleVisibility');
        expect(layerPanelSource).to.contain('handleToggleLock');
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

