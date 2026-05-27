// *****************************************************************************
// Copyright (C) 2026 TypeFox GmbH.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { LibraryServiceImpl } from './library-service-impl';

describe('LibraryServiceImpl', () => {
    let tempRoot: string;
    let previousStore: string | undefined;
    let previousRegistry: string | undefined;
    let previousUpdateChecks: string | undefined;

    beforeEach(async () => {
        previousStore = process.env.THEIA_AI_DOCS_STORE;
        previousRegistry = process.env.THEIA_AI_DOCS_REGISTRY;
        previousUpdateChecks = process.env.THEIA_AI_DOCS_UPDATE_CHECK_ENABLED;
        tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'theia-library-test-'));
        process.env.THEIA_AI_DOCS_STORE = path.join(tempRoot, '.store');
        process.env.THEIA_AI_DOCS_UPDATE_CHECK_ENABLED = 'false';
        delete process.env.THEIA_AI_DOCS_REGISTRY;
        await fs.writeFile(path.join(tempRoot, 'package.json'), JSON.stringify({
            dependencies: {
                next: '14.2.32',
                react: '18.2.0'
            }
        }), 'utf8');
    });

    afterEach(async () => {
        if (previousStore === undefined) {
            delete process.env.THEIA_AI_DOCS_STORE;
        } else {
            process.env.THEIA_AI_DOCS_STORE = previousStore;
        }
        if (previousRegistry === undefined) {
            delete process.env.THEIA_AI_DOCS_REGISTRY;
        } else {
            process.env.THEIA_AI_DOCS_REGISTRY = previousRegistry;
        }
        if (previousUpdateChecks === undefined) {
            delete process.env.THEIA_AI_DOCS_UPDATE_CHECK_ENABLED;
        } else {
            process.env.THEIA_AI_DOCS_UPDATE_CHECK_ENABLED = previousUpdateChecks;
        }
        await fs.rm(tempRoot, { recursive: true, force: true });
    });

    it('detects workspace dependencies, installs docs, pins a lockfile, and searches locally', async () => {
        const service = new LibraryServiceImpl();

        const detection = await service.detectWorkspace(tempRoot);
        expect(detection.suggestions.map(suggestion => suggestion.packageId)).to.include.members(['nextjs', 'react']);

        const installed = await service.installPackage({
            packageId: 'nextjs',
            version: '14.2.32',
            workspacePath: tempRoot,
            pinToWorkspace: true
        });
        expect(installed.id).to.equal('nextjs');
        expect(installed.version).to.equal('14.2.32');

        const lockfile = await service.readLockfile(tempRoot);
        expect(lockfile?.docs).to.have.length(1);
        expect(lockfile?.docs[0].resolvedVersion).to.equal('14.2.32');

        const searchResults = await service.searchDocs('workspace lockfile latest', { packageId: 'nextjs' });
        expect(searchResults).to.have.length.greaterThan(0);
        expect(searchResults[0].version).to.equal('14.2.32');
    });

    it('indexes and searches generic workspace sections', async () => {
        const service = new LibraryServiceImpl();

        const indexed = await service.indexWorkspaceSections({
            workspacePath: tempRoot,
            source: 'memory',
            replace: true,
            sections: [{
                id: 'chunk-1',
                workspacePath: tempRoot,
                source: 'memory',
                sourceId: 'file-1',
                relativePath: 'src/service.ts',
                languageId: 'typescript',
                sectionKind: 'symbol',
                title: 'SampleService.run',
                content: 'export class SampleService { run() { return "workspace bm25 section"; } }',
                startLine: 1,
                endLine: 3,
                tokenCount: 12,
                metadata: {
                    symbolName: 'SampleService'
                }
            }]
        });
        expect(indexed.sectionCount).to.equal(1);

        const searchResults = await service.searchWorkspaceSections('bm25 SampleService', {
            workspacePath: tempRoot,
            source: 'memory',
            maxResults: 5
        });
        expect(searchResults).to.have.length(1);
        expect(searchResults[0].relativePath).to.equal('src/service.ts');
        expect(searchResults[0].metadata?.symbolName).to.equal('SampleService');
    });

    it('loads registry packages from THEIA_AI_DOCS_REGISTRY and builds from a local folder source', async () => {
        const registryPath = path.join(tempRoot, 'registry');
        const docsPath = path.join(tempRoot, 'docs-source');
        await fs.mkdir(path.join(registryPath, 'packages', 'sample', 'versions'), { recursive: true });
        await fs.mkdir(docsPath, { recursive: true });
        await fs.writeFile(path.join(docsPath, 'guide.md'), [
            '# Sample Guide',
            '',
            'Use the pinned sample API when the project depends on sample-lib 1.0.0.'
        ].join('\n'), 'utf8');
        await fs.writeFile(path.join(registryPath, 'packages', 'sample', 'manifest.json'), JSON.stringify({
            id: 'sample',
            name: 'Sample Lib',
            ecosystem: 'npm',
            package_name: 'sample-lib',
            package_manager: 'npm',
            sources: [{ type: 'local_folder', url: docsPath }],
            license: { content_license: 'MIT', redistribution_allowed: true },
            versioning: { strategy: 'manual' }
        }), 'utf8');
        await fs.writeFile(path.join(registryPath, 'packages', 'sample', 'versions', '1.0.0.json'), JSON.stringify({
            package_id: 'sample',
            version: '1.0.0',
            source_type: 'local_folder',
            source_url: docsPath
        }), 'utf8');
        await fs.writeFile(path.join(tempRoot, 'package.json'), JSON.stringify({
            dependencies: { 'sample-lib': '1.0.0' }
        }), 'utf8');
        process.env.THEIA_AI_DOCS_REGISTRY = registryPath;

        const service = new LibraryServiceImpl();
        const available = await service.listAvailablePackages();
        expect(available.map(candidate => candidate.id)).to.deep.equal(['sample']);

        const detection = await service.detectWorkspace(tempRoot);
        expect(detection.suggestions[0].packageId).to.equal('sample');

        await service.installPackage({
            packageId: 'sample',
            version: '1.0.0',
            workspacePath: tempRoot,
            pinToWorkspace: true
        });
        const searchResults = await service.searchDocs('pinned sample api', { packageId: 'sample' });
        expect(searchResults).to.have.length.greaterThan(0);
        expect(searchResults[0].content).to.contain('pinned sample API');
    });

    it('loads YAML registry packages and validates manifest/version schemas', async () => {
        const registryPath = path.join(tempRoot, 'yaml-registry');
        const docsPath = path.join(tempRoot, 'yaml-docs');
        await fs.mkdir(path.join(registryPath, 'packages', 'yaml-sample', 'versions'), { recursive: true });
        await fs.mkdir(docsPath, { recursive: true });
        await fs.writeFile(path.join(docsPath, 'guide.md'), '# YAML Sample\n\nPinned YAML documentation content.', 'utf8');
        await fs.writeFile(path.join(registryPath, 'packages', 'yaml-sample', 'manifest.yaml'), [
            'id: yaml-sample',
            'name: YAML Sample',
            'ecosystem: npm',
            'package_name: yaml-sample-lib',
            'package_manager: npm',
            'sources:',
            '  - type: local_folder',
            `    url: ${docsPath.replace(/\\/g, '/')}`,
            '    include:',
            '      - "*.md"',
            'license:',
            '  content_license: MIT',
            '  redistribution_allowed: true'
        ].join('\n'), 'utf8');
        await fs.writeFile(path.join(registryPath, 'packages', 'yaml-sample', 'versions', '2.0.0.yaml'), [
            'package_id: yaml-sample',
            'version: "2.0.0"',
            'source_type: local_folder',
            `source_url: ${docsPath.replace(/\\/g, '/')}`
        ].join('\n'), 'utf8');
        process.env.THEIA_AI_DOCS_REGISTRY = registryPath;

        const service = new LibraryServiceImpl();
        const validation = await service.validateRegistry();
        expect(validation.valid, JSON.stringify(validation.errors)).to.be.true;

        const installed = await service.installPackage({ packageId: 'yaml-sample', version: '2.0.0' });
        expect(installed.documentCount).to.equal(1);
        const searchResults = await service.searchDocs('YAML documentation', { packageId: 'yaml-sample' });
        expect(searchResults).to.have.length.greaterThan(0);
    });

    it('detects Maven, Gradle, Go, and Cargo dependencies', async () => {
        await fs.writeFile(path.join(tempRoot, 'pom.xml'), [
            '<project><dependencies>',
            '<dependency><groupId>org.junit.jupiter</groupId><artifactId>junit-jupiter</artifactId><version>5.10.0</version></dependency>',
            '</dependencies></project>'
        ].join(''), 'utf8');
        await fs.writeFile(path.join(tempRoot, 'build.gradle'), 'dependencies { implementation "com.google.guava:guava:33.0.0-jre" }', 'utf8');
        await fs.writeFile(path.join(tempRoot, 'go.mod'), [
            'module example.com/app',
            'require (',
            '  github.com/gin-gonic/gin v1.10.0',
            ')'
        ].join('\n'), 'utf8');
        await fs.writeFile(path.join(tempRoot, 'Cargo.toml'), [
            '[package]',
            'name = "sample"',
            'version = "0.1.0"',
            '',
            '[dependencies]',
            'serde = "1.0"',
            'tokio = { version = "1.37", features = ["full"] }'
        ].join('\n'), 'utf8');

        const service = new LibraryServiceImpl();
        const detection = await service.detectWorkspace(tempRoot);
        const dependencies = detection.dependencies.map(dependency => `${dependency.ecosystem}:${dependency.packageName}:${dependency.versionRange ?? ''}`);
        expect(dependencies).to.include('maven:org.junit.jupiter:junit-jupiter:5.10.0');
        expect(dependencies).to.include('gradle:com.google.guava:guava:33.0.0-jre');
        expect(dependencies).to.include('go:github.com/gin-gonic/gin:1.10.0');
        expect(dependencies).to.include('rust:serde:1.0');
        expect(dependencies).to.include('rust:tokio:1.37');
    });
});
