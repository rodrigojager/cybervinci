// *****************************************************************************
// Copyright (C) 2026 TypeFox GmbH.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { generateUuid } from '@theia/core';
import { injectable } from '@theia/core/shared/inversify';
import * as crypto from 'crypto';
import { execFile } from 'child_process';
import * as fs from 'fs/promises';
import { createRequire } from 'module';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import {
    DocumentationCheckRun,
    DocumentationRegistryPackage,
    DocumentationRegistryVersion,
    DocsSkill,
    LibraryBundle,
    LibraryService,
    DocsSourceType,
    DocsLockfile,
    DocsSearchOptions,
    DocsSearchResult,
    DocsSuggestion,
    IndexWorkspaceSectionsRequest,
    IndexWorkspaceSectionsResult,
    InstallDocsPackageRequest,
    InstalledDocsPackage,
    PinnedDocsPackage,
    RegistryContributionResult,
    RegistryValidationResult,
    WorkspaceSection,
    WorkspaceSectionSearchOptions,
    WorkspaceSectionSearchResult,
    WorkspaceDependency,
    WorkspaceDocsDetection
} from '../common/library-service';

const execFileAsync = promisify(execFile);
const MAX_FETCHED_DOCUMENTS = 50;
const REGISTRY_ENV = 'THEIA_AI_DOCS_REGISTRY';
const UPDATE_CHECK_ENABLED_ENV = 'THEIA_AI_DOCS_UPDATE_CHECK_ENABLED';
const UPDATE_CHECK_INTERVAL_ENV = 'THEIA_AI_DOCS_UPDATE_CHECK_INTERVAL';
const nodeRequire = createRequire(__filename);

interface SqliteModule {
    DatabaseSync: new (databasePath: string, options?: { readOnly?: boolean }) => {
        exec(sql: string): void;
        prepare(sql: string): {
            run(...params: unknown[]): unknown;
            all(...params: unknown[]): unknown[];
        };
        close(): void;
    };
}

interface AjvModule {
    new(options?: object): {
        validate(schema: object, data: unknown): boolean;
        errorsText(): string;
    };
}

interface JsYamlModule {
    load(content: string): unknown;
    dump?(value: unknown, options?: object): string;
}

interface AdmZipConstructor {
    new(input: Buffer): {
        extractAllTo(targetPath: string, overwrite?: boolean): void;
    };
}

interface StoredDocsIndex {
    package: InstalledDocsPackage;
    documents: Array<{
        id: string;
        title: string;
        originalUrl?: string;
        localPath?: string;
        fetchedAt: string;
        sections: Array<{
            id: string;
            heading: string;
            content: string;
            contentHashSha256: string;
            order: number;
        }>;
    }>;
}

interface StoredWorkspaceSectionsIndex {
    version: 1;
    updatedAt: string;
    sections: WorkspaceSection[];
}

interface SourceDocument {
    title: string;
    content: string;
    originalUrl?: string;
    localPath?: string;
    fetchedAt: string;
    etag?: string;
    lastModifiedHeader?: string;
}

interface BuildResult {
    index: StoredDocsIndex;
    sourceCommit?: string;
    etag?: string;
    lastModifiedHeader?: string;
    buildStrategy: DocsSourceType | 'artifact';
    sqliteArtifactPath?: string;
}

@injectable()
export class LibraryServiceImpl implements LibraryService {
    protected readonly lockfileName = '.context-docs.lock.yaml';
    protected updateTimer?: NodeJS.Timeout;

    constructor() {
        this.startUpdateScheduler();
    }

    async getStorePath(): Promise<string> {
        return process.env.CYBERVINCI_AI_DOCS_STORE
            || process.env.THEIA_AI_DOCS_STORE
            || path.join(os.homedir(), '.cybervinci', 'library');
    }

    async listAvailablePackages(): Promise<DocumentationRegistryPackage[]> {
        await this.ensureStore();
        const configuredRegistry = await this.loadConfiguredRegistry();
        return configuredRegistry.length > 0 ? configuredRegistry : this.seedRegistry();
    }

    async validateRegistry(): Promise<RegistryValidationResult> {
        const registryLocation = process.env[REGISTRY_ENV] ?? 'builtin';
        const errors: RegistryValidationResult['errors'] = [];
        try {
            const packages = await this.listAvailablePackages();
            const manifestSchema = await this.loadSchema('package-manifest.schema.json');
            const versionSchema = await this.loadSchema('package-version.schema.json');
            for (const registryPackage of packages) {
                this.validateWithSchema(manifestSchema, this.toExternalManifest(registryPackage), errors, `${registryPackage.id}/manifest`);
                for (const version of registryPackage.versions) {
                    this.validateWithSchema(versionSchema, this.toExternalVersion(version), errors, `${registryPackage.id}/${version.version}`);
                }
            }
        } catch (error) {
            errors.push({ message: error instanceof Error ? error.message : String(error) });
        }
        return {
            valid: errors.length === 0,
            source: registryLocation,
            errors
        };
    }

    async listInstalledPackages(): Promise<InstalledDocsPackage[]> {
        const storePath = await this.getStorePath();
        const packagesPath = path.join(storePath, 'packages');
        const result: InstalledDocsPackage[] = [];
        for (const packageId of await this.readDirNames(packagesPath)) {
            for (const version of await this.readDirNames(path.join(packagesPath, packageId))) {
                const metadata = await this.readJson<InstalledDocsPackage>(path.join(packagesPath, packageId, version, 'package.json'));
                if (metadata) {
                    result.push(metadata);
                }
            }
        }
        return result.sort((a, b) => `${a.id}@${a.version}`.localeCompare(`${b.id}@${b.version}`));
    }

    async detectWorkspace(workspacePath: string): Promise<WorkspaceDocsDetection> {
        const dependencies = await this.detectDependencies(workspacePath);
        const registry = await this.listAvailablePackages();
        const installed = await this.listInstalledPackages();
        const lockfile = await this.readLockfile(workspacePath);
        const suggestions: DocsSuggestion[] = [];

        for (const dependency of dependencies) {
            for (const registryPackage of registry) {
                if (!this.matchesRegistryPackage(dependency, registryPackage)) {
                    continue;
                }
                const resolvedVersion = this.resolveVersion(registryPackage, dependency.versionRange);
                suggestions.push({
                    packageId: registryPackage.id,
                    packageName: dependency.packageName,
                    registryName: registryPackage.name,
                    ecosystem: registryPackage.ecosystem,
                    requestedVersion: dependency.versionRange,
                    resolvedVersion: resolvedVersion?.version,
                    installed: installed.some(candidate => candidate.id === registryPackage.id && candidate.version === resolvedVersion?.version),
                    pinned: lockfile?.docs.some(candidate => candidate.id === registryPackage.id && candidate.resolvedVersion === resolvedVersion?.version) ?? false,
                    reason: `${dependency.packageName} detected in ${path.basename(dependency.sourceFile)}`
                });
            }
        }

        return {
            workspacePath,
            dependencies,
            suggestions: this.uniqueSuggestions(suggestions)
        };
    }

    async installPackage(request: InstallDocsPackageRequest): Promise<InstalledDocsPackage> {
        const registryPackage = (await this.listAvailablePackages()).find(candidate => candidate.id === request.packageId);
        if (!registryPackage) {
            throw new Error(`Unknown documentation package: ${request.packageId}`);
        }
        const registryVersion = this.resolveVersion(registryPackage, request.version);
        if (!registryVersion) {
            throw new Error(`No version found for ${request.packageId}${request.version ? ` matching ${request.version}` : ''}`);
        }
        if (registryPackage.license?.redistributionAllowed === 'unknown' && request.allowUnknownLicense !== true) {
            await this.appendLog(`install allowed as local build with unknown redistribution license: ${registryPackage.id}@${registryVersion.version}`);
        }

        const packagePath = await this.packagePath(registryPackage.id, registryVersion.version);
        await fs.mkdir(packagePath, { recursive: true });

        const now = new Date().toISOString();
        const buildResult = await this.buildOrDownloadPackage(registryPackage, registryVersion, packagePath, now);
        const index = buildResult.index;
        const indexPath = path.join(packagePath, 'index.json');
        await this.writeJson(indexPath, index);
        const artifactHash = await this.sha256File(indexPath);
        const normalizedContentHash = this.sha256(this.normalize(index.documents.flatMap(document =>
            document.sections.map(section => section.content)
        ).join('\n')));

        const metadata: InstalledDocsPackage = {
            id: registryPackage.id,
            sourceId: registryPackage.id,
            name: registryPackage.name,
            version: registryVersion.version,
            dbPath: indexPath,
            packagePath,
            sizeBytes: Buffer.byteLength(JSON.stringify(index)),
            sectionCount: index.documents.reduce((sum, document) => sum + document.sections.length, 0),
            documentCount: index.documents.length,
            tokenCount: index.documents.reduce((sum, document) => sum + document.sections.reduce((inner, section) => inner + this.estimateTokens(section.content), 0), 0),
            createdAt: now,
            createdBy: 'theia-library',
            isActive: true,
            isLegacy: this.isLegacyVersion(registryPackage, registryVersion.version),
            license: registryPackage.license?.contentLicense,
            redistributionAllowed: registryPackage.license?.redistributionAllowed ?? 'unknown',
            notes: registryVersion.artifact?.url ? 'Installed from registry artifact metadata.' : 'Generated as a local mock index for the MVP.',
            sourceUrl: registryVersion.sourceUrl,
            sourceRef: registryVersion.sourceRef,
            sourceCommit: buildResult.sourceCommit ?? registryVersion.sourceCommit,
            contentHashSha256: artifactHash,
            normalizedContentHashSha256: normalizedContentHash,
            etag: buildResult.etag,
            lastModifiedHeader: buildResult.lastModifiedHeader,
            buildStrategy: buildResult.buildStrategy
        };
        index.package = metadata;

        await this.writeJson(indexPath, index);
        const sqlitePath = buildResult.sqliteArtifactPath ?? await this.tryCreateSqliteIndex(packagePath, index, metadata);
        if (sqlitePath) {
            metadata.dbPath = sqlitePath;
            metadata.notes = `${metadata.notes ?? ''} SQLite FTS5 index is available.`.trim();
            index.package = metadata;
        }
        await this.writeJson(path.join(packagePath, 'package.json'), metadata);
        await this.writeJson(indexPath, index);
        await this.writeJson(path.join(packagePath, 'source.json'), registryVersion);
        await this.writeJson(path.join(packagePath, 'checksums.json'), {
            package_db_hash_sha256: await this.sha256File(indexPath),
            normalized_content_hash_sha256: normalizedContentHash,
            manifest_hash_sha256: this.sha256(JSON.stringify(registryPackage)),
            generated_at: now
        });
        await this.appendLog(`installed ${metadata.id}@${metadata.version} ${metadata.contentHashSha256 ?? ''}`);

        if (request.pinToWorkspace && request.workspacePath) {
            await this.pinPackageToWorkspace(request.workspacePath, metadata.id, metadata.version);
        }
        return metadata;
    }

    async searchDocs(query: string, options: DocsSearchOptions = {}): Promise<DocsSearchResult[]> {
        const maxResults = options.maxResults ?? 10;
        const terms = this.searchTerms(query);
        const packages = await this.listInstalledPackages();
        const results: DocsSearchResult[] = [];

        for (const installedPackage of packages) {
            if (options.packageId && installedPackage.id !== options.packageId) {
                continue;
            }
            if (options.version && installedPackage.version !== options.version) {
                continue;
            }
            if (installedPackage.dbPath.endsWith('.db')) {
                const sqliteResults = await this.trySearchSqlite(installedPackage, terms, maxResults);
                if (sqliteResults) {
                    results.push(...sqliteResults);
                    continue;
                }
            }
            const jsonIndexPath = installedPackage.dbPath.endsWith('.db') ? path.join(installedPackage.packagePath, 'index.json') : installedPackage.dbPath;
            const index = await this.readJson<StoredDocsIndex>(jsonIndexPath);
            if (!index) {
                continue;
            }
            for (const document of index.documents) {
                for (const section of document.sections) {
                    const haystack = `${document.title} ${section.heading} ${section.content}`.toLowerCase();
                    const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
                    if (score === 0 && terms.length > 0) {
                        continue;
                    }
                    results.push({
                        packageId: installedPackage.id,
                        packageName: installedPackage.name,
                        version: installedPackage.version,
                        title: document.title,
                        heading: section.heading,
                        snippet: this.createSnippet(section.content, terms),
                        content: section.content,
                        originalUrl: document.originalUrl,
                        localPath: document.localPath,
                        score,
                        fetchedAt: document.fetchedAt,
                        sourceCommit: installedPackage.sourceCommit,
                        isOutdated: installedPackage.isLegacy
                    });
                }
            }
        }

        return results.sort((a, b) => b.score - a.score || a.packageId.localeCompare(b.packageId)).slice(0, maxResults);
    }

    async indexWorkspaceSections(request: IndexWorkspaceSectionsRequest): Promise<IndexWorkspaceSectionsResult> {
        await this.ensureStore();
        const now = new Date().toISOString();
        const workspacePath = this.workspaceKey(request.workspacePath);
        const source = request.source;
        const current = await this.readWorkspaceSectionsIndex();
        const retained = request.replace === false
            ? current.sections
            : current.sections.filter(section => this.workspaceKey(section.workspacePath) !== workspacePath || section.source !== source);
        const sections = request.sections.map(section => this.normalizeWorkspaceSection(section, workspacePath, source, now));
        const index: StoredWorkspaceSectionsIndex = {
            version: 1,
            updatedAt: now,
            sections: [...retained, ...sections]
        };
        await this.writeJson(await this.workspaceSectionsJsonPath(), index);
        const sqliteAvailable = await this.tryCreateWorkspaceSectionsSqlite(index);
        await this.appendLog(`indexed ${sections.length} workspace sections for ${source} in ${workspacePath}`);
        return {
            workspacePath,
            source,
            sectionCount: sections.length,
            indexedAt: now,
            sqliteAvailable
        };
    }

    async searchWorkspaceSections(query: string, options: WorkspaceSectionSearchOptions = {}): Promise<WorkspaceSectionSearchResult[]> {
        const maxResults = options.maxResults ?? 20;
        const terms = this.workspaceSearchTerms(query);
        const sqliteResults = await this.trySearchWorkspaceSectionsSqlite(terms, maxResults, options);
        if (sqliteResults) {
            return sqliteResults;
        }
        const index = await this.readWorkspaceSectionsIndex();
        const workspacePath = options.workspacePath ? this.workspaceKey(options.workspacePath) : undefined;
        return index.sections
            .filter(section => !workspacePath || this.workspaceKey(section.workspacePath) === workspacePath)
            .filter(section => !options.source || section.source === options.source)
            .filter(section => !options.sectionKind || section.sectionKind === options.sectionKind)
            .map(section => ({ section, score: this.workspaceSectionScore(section, terms) }))
            .filter(item => terms.length === 0 || item.score > 0)
            .sort((left, right) => right.score - left.score || (left.section.relativePath ?? left.section.title).localeCompare(right.section.relativePath ?? right.section.title))
            .slice(0, maxResults)
            .map(item => ({
                ...item.section,
                snippet: this.createSnippet(item.section.content, terms),
                score: item.score
            }));
    }

    async listSkills(): Promise<DocsSkill[]> {
        const configuredSkills = await this.loadConfiguredSkills();
        return configuredSkills.length > 0 ? configuredSkills : this.seedSkills();
    }

    async getApplicableSkills(workspacePath: string): Promise<DocsSkill[]> {
        const detection = await this.detectWorkspace(workspacePath);
        const dependencies = new Set(detection.dependencies.map(dependency => dependency.packageName.toLowerCase()));
        const files = new Set((await this.findWorkspaceFiles(workspacePath, 3)).map(file => path.basename(file).toLowerCase()));
        return (await this.listSkills()).filter(skill => skill.appliesTo.some(rule => {
            const matchesPackage = rule.package ? dependencies.has(rule.package.toLowerCase()) : true;
            const matchesFiles = rule.files?.length ? rule.files.some(file => files.has(path.basename(file).toLowerCase())) : true;
            return matchesPackage && matchesFiles;
        }));
    }

    async readLockfile(workspacePath: string): Promise<DocsLockfile | undefined> {
        const globalPinPath = await this.workspaceDocsPinPath(workspacePath);
        const globalPin = await this.readJson<DocsLockfile>(globalPinPath);
        if (globalPin) {
            return globalPin;
        }
        const filePath = path.join(workspacePath, this.lockfileName);
        try {
            return this.parseLockfile(await fs.readFile(filePath, 'utf8'));
        } catch {
            return undefined;
        }
    }

    async pinPackageToWorkspace(workspacePath: string, packageId: string, version?: string): Promise<DocsLockfile> {
        const installed = await this.listInstalledPackages();
        const selected = installed.find(candidate => candidate.id === packageId && (!version || candidate.version === version));
        if (!selected) {
            throw new Error(`Install ${packageId}${version ? `@${version}` : ''} before pinning it to the workspace.`);
        }

        const current = await this.readLockfile(workspacePath);
        const pinned: PinnedDocsPackage = {
            id: selected.id,
            package: selected.id,
            requestedVersion: version ?? selected.version,
            resolvedVersion: selected.version,
            sourceType: 'artifact',
            sourceUrl: selected.sourceUrl ?? selected.dbPath,
            sourceRef: selected.sourceRef,
            sourceCommit: selected.sourceCommit,
            artifactSha256: selected.contentHashSha256,
            installedAt: new Date().toISOString()
        };
        const docs = [...(current?.docs.filter(candidate => candidate.id !== packageId) ?? []), pinned];
        const lockfile: DocsLockfile = {
            version: 1,
            generatedAt: new Date().toISOString(),
            docs: docs.sort((a, b) => a.id.localeCompare(b.id))
        };
        const pinPath = await this.workspaceDocsPinPath(workspacePath);
        await this.writeJson(pinPath, lockfile);
        await this.appendLog(`pinned ${selected.id}@${selected.version} for ${workspacePath} in IDE storage`);
        return lockfile;
    }

    async getWorkspaceLibrary(workspacePath: string, userQuestion: string): Promise<LibraryBundle> {
        const lockfile = await this.readLockfile(workspacePath);
        const pinnedDocs = lockfile?.docs ?? [];
        const applicableSkills = await this.getApplicableSkills(workspacePath);
        const warnings: string[] = [];
        const packageId = pinnedDocs.length === 1 ? pinnedDocs[0].id : undefined;
        const results = await this.searchDocs(userQuestion, {
            packageId,
            maxResults: 8
        });
        if (!lockfile) {
            warnings.push('No IDE docs pin found for this workspace. Results may include any installed documentation version.');
        }
        for (const result of results) {
            if (result.isOutdated) {
                warnings.push(`${result.packageName} ${result.version} is a legacy documentation package. Keep using it when it matches the project lock.`);
            }
        }
        return {
            query: userQuestion,
            workspacePath,
            pinnedDocs,
            applicableSkills,
            results,
            warnings: [...new Set(warnings)]
        };
    }

    async checkUpdates(packageId?: string): Promise<DocumentationCheckRun[]> {
        const registry = await this.listAvailablePackages();
        const installed = (await this.listInstalledPackages()).filter(candidate => !packageId || candidate.id === packageId);
        const runs: DocumentationCheckRun[] = [];
        for (const candidate of installed) {
            const startedAt = new Date().toISOString();
            const registryPackage = registry.find(available => available.id === candidate.id);
            const packageManagerVersion = registryPackage ? await this.getLatestPackageManagerVersion(registryPackage).catch(() => undefined) : undefined;
            const latestVersion = packageManagerVersion ?? registryPackage?.versions[registryPackage.versions.length - 1]?.version;
            const hasNewerVersion = latestVersion !== undefined && latestVersion !== candidate.version;
            const run: DocumentationCheckRun = {
                id: generateUuid(),
                sourceId: candidate.id,
                startedAt,
                finishedAt: new Date().toISOString(),
                result: hasNewerVersion ? 'new_version_available' : 'unchanged',
                previousHash: candidate.contentHashSha256,
                previousVersion: candidate.version,
                newVersion: hasNewerVersion ? latestVersion : candidate.version
            };
            if (!hasNewerVersion) {
                try {
                    await this.enrichCheckRunWithSourceState(candidate, run);
                } catch (error) {
                    run.result = 'check_failed';
                    run.errorMessage = error instanceof Error ? error.message : String(error);
                } finally {
                    run.finishedAt = new Date().toISOString();
                }
            }
            runs.push(run);
        }
        await this.appendLog(`checked updates for ${packageId ?? 'all'}: ${runs.map(run => `${run.sourceId}:${run.result}`).join(', ')}`);
        return runs;
    }

    async generateRegistryContribution(packageId: string, version: string, workspacePath: string): Promise<RegistryContributionResult> {
        const registryPackage = (await this.listAvailablePackages()).find(candidate => candidate.id === packageId);
        const registryVersion = registryPackage?.versions.find(candidate => candidate.version === version);
        if (!registryPackage || !registryVersion) {
            throw new Error(`Cannot generate contribution for unknown package ${packageId}@${version}.`);
        }
        const installedPackage = (await this.listInstalledPackages()).find(candidate => candidate.id === packageId && candidate.version === version);
        const contributionPath = path.join(workspacePath, '.docs-registry-contribution', 'packages', packageId);
        const crawlerPath = path.join(workspacePath, '.docs-registry-contribution', 'crawlers');
        await fs.mkdir(path.join(contributionPath, 'versions'), { recursive: true });
        await fs.mkdir(crawlerPath, { recursive: true });
        const manifest = this.stripUndefined(this.toExternalManifest(registryPackage));
        const versionMetadata = this.stripUndefined({
            ...this.toExternalVersion(registryVersion),
            checksums: {
                package_db_hash_sha256: installedPackage?.contentHashSha256,
                normalized_content_hash_sha256: installedPackage?.normalizedContentHashSha256
            }
        });
        const crawlerRecipe = this.stripUndefined({
            id: `${packageId}-${registryVersion.sourceType}`,
            package_id: packageId,
            source_type: registryVersion.sourceType,
            source_url: registryVersion.sourceUrl,
            source_ref: registryVersion.sourceRef,
            docs_path: registryPackage.sources.find(source => source.type === registryVersion.sourceType)?.docsPath,
            include: registryPackage.sources.find(source => source.type === registryVersion.sourceType)?.include,
            exclude: registryPackage.sources.find(source => source.type === registryVersion.sourceType)?.exclude,
            execute_javascript: false
        });
        const files = [
            path.join(contributionPath, 'manifest.yaml'),
            path.join(contributionPath, 'versions', `${version}.yaml`),
            path.join(crawlerPath, `${packageId}-${registryVersion.sourceType}.yaml`),
            path.join(contributionPath, 'checksums.json'),
            path.join(contributionPath, 'build-report.md')
        ];
        await fs.writeFile(files[0], this.dumpYaml(manifest), 'utf8');
        await fs.writeFile(files[1], this.dumpYaml(versionMetadata), 'utf8');
        await fs.writeFile(files[2], this.dumpYaml(crawlerRecipe), 'utf8');
        await this.writeJson(files[3], {
            package_db_hash_sha256: installedPackage?.contentHashSha256,
            normalized_content_hash_sha256: installedPackage?.normalizedContentHashSha256,
            manifest_hash_sha256: this.sha256(JSON.stringify(manifest)),
            version_hash_sha256: this.sha256(JSON.stringify(versionMetadata)),
            generated_at: new Date().toISOString()
        });
        const validationErrors: RegistryValidationResult['errors'] = [];
        this.validateWithSchema(await this.loadSchema('package-manifest.schema.json'), manifest, validationErrors, files[0]);
        this.validateWithSchema(await this.loadSchema('package-version.schema.json'), versionMetadata, validationErrors, files[1]);
        await fs.writeFile(files[4], [
            `# ${registryPackage.name} ${version}`,
            '',
            `- Source: ${registryVersion.sourceUrl}`,
            `- Redistribution: ${registryPackage.license?.redistributionAllowed ?? 'unknown'}`,
            `- Package hash: ${installedPackage?.contentHashSha256 ?? 'not installed'}`,
            `- Normalized content hash: ${installedPackage?.normalizedContentHashSha256 ?? 'not installed'}`,
            `- Validation: ${validationErrors.length === 0 ? 'passed' : validationErrors.map(error => error.message).join('; ')}`,
            '- Artifact publishing is intentionally manual when redistribution is unknown or false.',
            '- Generated files are ready for a registry pull request.'
        ].join('\n'), 'utf8');
        const branchName = `docs/${packageId}-${version}`;
        const commitMessage = `Add ${registryPackage.name} ${version} documentation metadata`;
        const preparedBranch = await this.prepareRegistryContributionBranch(
            path.join(workspacePath, '.docs-registry-contribution'),
            packageId,
            branchName,
            commitMessage
        ).catch(error => {
            this.appendLog(`registry branch preparation skipped: ${error instanceof Error ? error.message : String(error)}`).catch(() => undefined);
            return false;
        });
        return {
            contributionPath,
            files,
            branchName: preparedBranch ? branchName : undefined,
            commitMessage,
            summary: `Generated registry contribution files for ${packageId}@${version}.`
        };
    }

    protected async ensureStore(): Promise<void> {
        const storePath = await this.getStorePath();
        await fs.mkdir(path.join(storePath, 'registry-cache'), { recursive: true });
        await fs.mkdir(path.join(storePath, 'packages'), { recursive: true });
        await fs.mkdir(path.join(storePath, 'workspace-sections'), { recursive: true });
        await fs.mkdir(path.join(storePath, 'workspace-pins'), { recursive: true });
        await fs.mkdir(path.join(storePath, 'skills'), { recursive: true });
        await fs.mkdir(path.join(storePath, 'logs'), { recursive: true });
    }

    protected async packagePath(packageId: string, version: string): Promise<string> {
        return path.join(await this.getStorePath(), 'packages', packageId, version);
    }

    protected async workspaceSectionsJsonPath(): Promise<string> {
        return path.join(await this.getStorePath(), 'workspace-sections', 'index.json');
    }

    protected async workspaceSectionsSqlitePath(): Promise<string> {
        return path.join(await this.getStorePath(), 'workspace-sections', 'workspace-sections.db');
    }

    protected async workspaceDocsPinPath(workspacePath: string): Promise<string> {
        return path.join(await this.getStorePath(), 'workspace-pins', `${this.sha256(this.workspaceKey(workspacePath))}.json`);
    }

    protected async loadSchema(fileName: string): Promise<object> {
        const schemaPath = path.resolve(__dirname, '..', '..', 'schemas', fileName);
        try {
            return this.toAjvCompatibleSchema(JSON.parse(await fs.readFile(schemaPath, 'utf8')) as object);
        } catch {
            return this.toAjvCompatibleSchema(JSON.parse(await fs.readFile(path.resolve(process.cwd(), 'packages', 'library', 'schemas', fileName), 'utf8')) as object);
        }
    }

    protected toAjvCompatibleSchema(schema: object): object {
        const copy = { ...schema } as Record<string, unknown>;
        delete copy.$schema;
        return copy;
    }

    protected validateWithSchema(schema: object, data: unknown, errors: RegistryValidationResult['errors'], file: string): void {
        const Ajv = this.getAjvModule();
        if (!Ajv) {
            return;
        }
        const ajv = new Ajv({ allErrors: true, strict: false });
        if (!ajv.validate(schema, data)) {
            errors.push({ file, message: ajv.errorsText() });
        }
    }

    protected toExternalManifest(registryPackage: DocumentationRegistryPackage): object {
        return {
            id: registryPackage.id,
            name: registryPackage.name,
            ecosystem: registryPackage.ecosystem,
            package_name: registryPackage.packageName,
            package_manager: registryPackage.packageManager,
            homepage: registryPackage.homepage,
            repository: registryPackage.repository,
            sources: registryPackage.sources.map(source => ({
                type: source.type,
                url: source.url,
                docs_path: source.docsPath,
                include: source.include,
                exclude: source.exclude,
                content_selectors: source.contentSelectors,
                max_documents: source.maxDocuments,
                execute_javascript: source.executeJavascript,
                headers: source.headers
            })),
            versioning: registryPackage.versioning ? {
                strategy: registryPackage.versioning.strategy,
                tag_pattern: registryPackage.versioning.tagPattern
            } : undefined,
            license: registryPackage.license ? {
                content_license: registryPackage.license.contentLicense,
                redistribution_allowed: registryPackage.license.redistributionAllowed
            } : undefined,
            update_policy: registryPackage.updatePolicy ? {
                check_interval: registryPackage.updatePolicy.checkInterval,
                compare: registryPackage.updatePolicy.compare
            } : undefined
        };
    }

    protected toExternalVersion(version: DocumentationRegistryVersion): object {
        return {
            package_id: version.packageId,
            version: version.version,
            source_type: version.sourceType,
            source_url: version.sourceUrl,
            source_ref: version.sourceRef,
            source_commit: version.sourceCommit,
            fetched_at: version.fetchedAt,
            artifact: version.artifact ? {
                type: version.artifact.type,
                url: version.artifact.url,
                sha256: version.artifact.sha256,
                size_bytes: version.artifact.sizeBytes,
                archive_root: version.artifact.archiveRoot
            } : undefined,
            stats: version.stats ? {
                document_count: version.stats.documentCount,
                section_count: version.stats.sectionCount,
                token_count: version.stats.tokenCount
            } : undefined
        };
    }

    protected async tryCreateSqliteIndex(packagePath: string, index: StoredDocsIndex, metadata: InstalledDocsPackage): Promise<string | undefined> {
        const sqlite = this.getSqliteModule();
        if (!sqlite) {
            await this.appendLog('SQLite FTS5 unavailable; using JSON index fallback');
            return undefined;
        }
        const dbPath = path.join(packagePath, 'package.db');
        try {
            await fs.rm(dbPath, { force: true });
            const database = new sqlite.DatabaseSync(dbPath);
            database.exec([
                'CREATE VIRTUAL TABLE docs_fts USING fts5(',
                'package_id UNINDEXED, package_name UNINDEXED, version UNINDEXED,',
                'title, heading, content, original_url UNINDEXED, local_path UNINDEXED,',
                'fetched_at UNINDEXED, source_commit UNINDEXED, is_outdated UNINDEXED',
                ')'
            ].join(' '));
            const insert = database.prepare([
                'INSERT INTO docs_fts (',
                'package_id, package_name, version, title, heading, content, original_url, local_path, fetched_at, source_commit, is_outdated',
                ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            ].join(' '));
            for (const document of index.documents) {
                for (const section of document.sections) {
                    insert.run(
                        metadata.id,
                        metadata.name,
                        metadata.version,
                        document.title,
                        section.heading,
                        section.content,
                        document.originalUrl ?? '',
                        document.localPath ?? '',
                        document.fetchedAt,
                        metadata.sourceCommit ?? '',
                        metadata.isLegacy ? 'true' : 'false'
                    );
                }
            }
            database.close();
            await this.appendLog(`SQLite FTS5 index created for ${metadata.id}@${metadata.version}`);
            return dbPath;
        } catch (error) {
            await this.appendLog(`SQLite FTS5 index failed: ${error instanceof Error ? error.message : String(error)}`);
            return undefined;
        }
    }

    protected async trySearchSqlite(
        installedPackage: InstalledDocsPackage,
        terms: string[],
        maxResults: number
    ): Promise<DocsSearchResult[] | undefined> {
        const sqlite = this.getSqliteModule();
        if (!sqlite) {
            return undefined;
        }
        try {
            const database = new sqlite.DatabaseSync(installedPackage.dbPath, { readOnly: true });
            const query = terms.length > 0
                ? terms.map(term => `"${term.replace(/"/g, '""')}"`).join(' OR ')
                : '*';
            const rows = database.prepare([
                'SELECT package_id, package_name, version, title, heading, content, original_url, local_path,',
                'fetched_at, source_commit, is_outdated, bm25(docs_fts) AS rank',
                'FROM docs_fts',
                terms.length > 0 ? 'WHERE docs_fts MATCH ?' : '',
                'ORDER BY rank LIMIT ?'
            ].join(' ')).all(...(terms.length > 0 ? [query, maxResults] : [maxResults])) as Array<Record<string, unknown>>;
            database.close();
            return rows.map(row => ({
                packageId: String(row.package_id),
                packageName: String(row.package_name),
                version: String(row.version),
                title: String(row.title),
                heading: String(row.heading),
                snippet: this.createSnippet(String(row.content), terms),
                content: String(row.content),
                originalUrl: this.optionalString(row.original_url),
                localPath: this.optionalString(row.local_path),
                score: Math.abs(Number(row.rank ?? 0)),
                fetchedAt: this.optionalString(row.fetched_at),
                sourceCommit: this.optionalString(row.source_commit),
                isOutdated: row.is_outdated === 'true'
            }));
        } catch {
            return undefined;
        }
    }

    protected async tryCreateWorkspaceSectionsSqlite(index: StoredWorkspaceSectionsIndex): Promise<boolean> {
        const sqlite = this.getSqliteModule();
        if (!sqlite) {
            await this.appendLog('SQLite FTS5 unavailable; using workspace sections JSON fallback');
            return false;
        }
        const dbPath = await this.workspaceSectionsSqlitePath();
        try {
            await fs.rm(dbPath, { force: true });
            const database = new sqlite.DatabaseSync(dbPath);
            database.exec([
                'CREATE VIRTUAL TABLE workspace_sections_fts USING fts5(',
                'id UNINDEXED, workspace_path UNINDEXED, source UNINDEXED, source_id UNINDEXED, uri UNINDEXED,',
                'relative_path, language_id UNINDEXED, section_kind UNINDEXED, title, content, content_hash UNINDEXED,',
                'start_line UNINDEXED, end_line UNINDEXED, token_count UNINDEXED, indexed_at UNINDEXED, metadata_json UNINDEXED',
                ')'
            ].join(' '));
            const insert = database.prepare([
                'INSERT INTO workspace_sections_fts (',
                'id, workspace_path, source, source_id, uri, relative_path, language_id, section_kind, title, content, content_hash,',
                'start_line, end_line, token_count, indexed_at, metadata_json',
                ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            ].join(' '));
            for (const section of index.sections) {
                insert.run(
                    section.id,
                    this.workspaceKey(section.workspacePath),
                    section.source,
                    section.sourceId ?? '',
                    section.uri ?? '',
                    section.relativePath ?? '',
                    section.languageId ?? '',
                    section.sectionKind ?? '',
                    section.title,
                    section.content,
                    section.contentHash ?? '',
                    section.startLine ?? 0,
                    section.endLine ?? 0,
                    section.tokenCount ?? 0,
                    section.indexedAt ?? '',
                    JSON.stringify(section.metadata ?? {})
                );
            }
            database.close();
            await this.appendLog(`SQLite FTS5 workspace sections index created with ${index.sections.length} sections`);
            return true;
        } catch (error) {
            await this.appendLog(`SQLite FTS5 workspace sections index failed: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    protected async trySearchWorkspaceSectionsSqlite(
        terms: string[],
        maxResults: number,
        options: WorkspaceSectionSearchOptions
    ): Promise<WorkspaceSectionSearchResult[] | undefined> {
        const sqlite = this.getSqliteModule();
        if (!sqlite) {
            return undefined;
        }
        try {
            await fs.stat(await this.workspaceSectionsSqlitePath());
            const clauses: string[] = [];
            const params: unknown[] = [];
            const workspacePath = options.workspacePath ? this.workspaceKey(options.workspacePath) : undefined;
            if (workspacePath) {
                clauses.push('workspace_path = ?');
                params.push(workspacePath);
            }
            if (options.source) {
                clauses.push('source = ?');
                params.push(options.source);
            }
            if (options.sectionKind) {
                clauses.push('section_kind = ?');
                params.push(options.sectionKind);
            }
            if (terms.length > 0) {
                clauses.push('workspace_sections_fts MATCH ?');
                params.push(this.ftsQuery(terms));
            }
            const database = new sqlite.DatabaseSync(await this.workspaceSectionsSqlitePath(), { readOnly: true });
            const rows = database.prepare([
                'SELECT id, workspace_path, source, source_id, uri, relative_path, language_id, section_kind, title, content, content_hash,',
                'start_line, end_line, token_count, indexed_at, metadata_json',
                terms.length > 0 ? ', bm25(workspace_sections_fts) AS rank' : ', 0.25 AS rank',
                'FROM workspace_sections_fts',
                clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
                terms.length > 0 ? 'ORDER BY rank LIMIT ?' : 'ORDER BY indexed_at DESC LIMIT ?'
            ].join(' ')).all(...params, maxResults) as Array<Record<string, unknown>>;
            database.close();
            return rows.map(row => {
                const content = String(row.content);
                return {
                    id: String(row.id),
                    workspacePath: String(row.workspace_path),
                    source: String(row.source),
                    sourceId: this.optionalString(row.source_id),
                    uri: this.optionalString(row.uri),
                    relativePath: this.optionalString(row.relative_path),
                    languageId: this.optionalString(row.language_id),
                    sectionKind: this.optionalString(row.section_kind),
                    title: String(row.title),
                    content,
                    contentHash: this.optionalString(row.content_hash),
                    startLine: this.optionalNumber(row.start_line),
                    endLine: this.optionalNumber(row.end_line),
                    tokenCount: this.optionalNumber(row.token_count),
                    indexedAt: this.optionalString(row.indexed_at),
                    metadata: this.parseWorkspaceSectionMetadata(row.metadata_json),
                    snippet: this.createSnippet(content, terms),
                    score: terms.length > 0 ? Math.abs(Number(row.rank ?? 0)) : 0.25
                };
            });
        } catch {
            return undefined;
        }
    }

    protected getSqliteModule(): SqliteModule | undefined {
        try {
            return nodeRequire('node:sqlite') as SqliteModule;
        } catch {
            return undefined;
        }
    }

    protected getYamlModule(): JsYamlModule | undefined {
        try {
            return nodeRequire('js-yaml') as JsYamlModule;
        } catch {
            return undefined;
        }
    }

    protected getAjvModule(): AjvModule | undefined {
        try {
            return nodeRequire('ajv') as AjvModule;
        } catch {
            return undefined;
        }
    }

    protected getAdmZip(): AdmZipConstructor | undefined {
        try {
            return nodeRequire('adm-zip') as AdmZipConstructor;
        } catch {
            return undefined;
        }
    }

    protected startUpdateScheduler(): void {
        const enabled = process.env[UPDATE_CHECK_ENABLED_ENV] !== 'false';
        const interval = process.env[UPDATE_CHECK_INTERVAL_ENV] ?? 'daily';
        const intervalMs = this.updateIntervalMs(interval);
        if (!enabled || intervalMs === undefined) {
            return;
        }
        this.updateTimer = setInterval(() => {
            this.checkUpdates().catch(error => {
                this.appendLog(`scheduled update check failed: ${error instanceof Error ? error.message : String(error)}`).catch(() => undefined);
            });
        }, intervalMs);
        this.updateTimer.unref?.();
    }

    protected updateIntervalMs(interval: string): number | undefined {
        if (interval === 'manual') {
            return undefined;
        }
        if (interval === 'weekly') {
            return 7 * 24 * 60 * 60 * 1000;
        }
        if (interval === 'monthly') {
            return 30 * 24 * 60 * 60 * 1000;
        }
        if (/^\d+$/.test(interval)) {
            return Number(interval);
        }
        return 24 * 60 * 60 * 1000;
    }

    protected async loadConfiguredRegistry(): Promise<DocumentationRegistryPackage[]> {
        const registryLocation = process.env[REGISTRY_ENV];
        if (!registryLocation) {
            return [];
        }
        try {
            const packages = registryLocation.startsWith('http://') || registryLocation.startsWith('https://')
                ? await this.loadRegistryFromUrl(registryLocation)
                : await this.loadRegistryFromPath(registryLocation);
            await this.writeJson(path.join(await this.getStorePath(), 'registry-cache', 'index.json'), {
                source: registryLocation,
                loaded_at: new Date().toISOString(),
                packages
            });
            return packages;
        } catch (error) {
            await this.appendLog(`registry load failed from ${registryLocation}: ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }

    protected async loadRegistryFromUrl(registryUrl: string): Promise<DocumentationRegistryPackage[]> {
        const normalizedUrl = registryUrl.replace(/\/$/, '');
        const response = await fetch(`${normalizedUrl}/index.json`);
        if (response.ok) {
            return this.toRegistryPackages(await response.json());
        }
        const packagesResponse = await fetch(`${normalizedUrl}/packages.json`);
        if (packagesResponse.ok) {
            return this.toRegistryPackages(await packagesResponse.json());
        }
        throw new Error(`Registry URL must expose index.json or packages.json: ${registryUrl}`);
    }

    protected async loadRegistryFromPath(registryPath: string): Promise<DocumentationRegistryPackage[]> {
        const absolutePath = path.resolve(registryPath);
        const stat = await fs.stat(absolutePath);
        if (stat.isFile()) {
            return this.toRegistryPackages(await this.readStructuredFile(absolutePath));
        }

        const indexPath = path.join(absolutePath, 'index.json');
        const index = await this.readJson<unknown>(indexPath);
        if (index) {
            return this.toRegistryPackages(index);
        }

        const packagesPath = path.join(absolutePath, 'packages');
        const packages: DocumentationRegistryPackage[] = [];
        for (const packageId of await this.readDirNames(packagesPath)) {
            const packagePath = path.join(packagesPath, packageId);
            const manifest = await this.readStructuredFile(path.join(packagePath, 'manifest.json'))
                .catch(() => this.readStructuredFile(path.join(packagePath, 'manifest.yaml')))
                .catch(() => this.readStructuredFile(path.join(packagePath, 'manifest.yml')));
            const versions: DocumentationRegistryVersion[] = [];
            for (const versionFile of await this.readFiles(path.join(packagePath, 'versions'), ['.json', '.yaml', '.yml'])) {
                versions.push(this.toRegistryVersion(await this.readStructuredFile(versionFile)));
            }
            packages.push(this.toRegistryPackage({ ...(manifest as object), versions }));
        }
        return packages;
    }

    protected toRegistryPackages(value: unknown): DocumentationRegistryPackage[] {
        const record = value as { packages?: unknown[] };
        const rawPackages = Array.isArray(value) ? value : record.packages;
        return (rawPackages ?? []).map(raw => this.toRegistryPackage(raw));
    }

    protected toRegistryPackage(value: unknown): DocumentationRegistryPackage {
        const raw = value as Record<string, unknown>;
        const versioning = raw.versioning as Record<string, unknown> | undefined;
        const license = raw.license as Record<string, unknown> | undefined;
        const updatePolicy = (raw.updatePolicy ?? raw.update_policy) as Record<string, unknown> | undefined;
        return {
            id: String(raw.id),
            name: String(raw.name),
            ecosystem: this.optionalString(raw.ecosystem),
            packageName: this.optionalString(raw.packageName ?? raw.package_name),
            packageManager: this.optionalString(raw.packageManager ?? raw.package_manager),
            homepage: this.optionalString(raw.homepage),
            repository: this.optionalString(raw.repository),
            sources: ((raw.sources as unknown[]) ?? []).map(source => {
                const rawSource = source as Record<string, unknown>;
                return {
                    type: rawSource.type as DocsSourceType,
                    url: String(rawSource.url),
                    docsPath: this.optionalStringArray(rawSource.docsPath ?? rawSource.docs_path),
                    include: this.optionalStringArray(rawSource.include),
                    exclude: this.optionalStringArray(rawSource.exclude),
                    contentSelectors: this.optionalStringArray(rawSource.contentSelectors ?? rawSource.content_selectors),
                    maxDocuments: this.optionalNumber(rawSource.maxDocuments ?? rawSource.max_documents),
                    executeJavascript: false,
                    headers: this.optionalStringRecord(rawSource.headers)
                };
            }),
            versioning: versioning ? {
                strategy: versioning.strategy as NonNullable<DocumentationRegistryPackage['versioning']>['strategy'],
                tagPattern: this.optionalString(versioning.tagPattern ?? versioning.tag_pattern)
            } : undefined,
            license: license ? {
                contentLicense: this.optionalString(license.contentLicense ?? license.content_license),
                redistributionAllowed: (license.redistributionAllowed
                    ?? license.redistribution_allowed
                    ?? 'unknown') as NonNullable<DocumentationRegistryPackage['license']>['redistributionAllowed']
            } : undefined,
            updatePolicy: updatePolicy ? {
                checkInterval: (updatePolicy.checkInterval
                    ?? updatePolicy.check_interval) as NonNullable<DocumentationRegistryPackage['updatePolicy']>['checkInterval'],
                compare: this.optionalStringArray(updatePolicy.compare)
            } : undefined,
            versions: ((raw.versions as unknown[]) ?? []).map(version => this.toRegistryVersion(version))
        };
    }

    protected toRegistryVersion(value: unknown): DocumentationRegistryVersion {
        const raw = value as Record<string, unknown>;
        const artifact = raw.artifact as Record<string, unknown> | undefined;
        const stats = raw.stats as Record<string, unknown> | undefined;
        return {
            packageId: String(raw.packageId ?? raw.package_id),
            version: String(raw.version),
            sourceType: (raw.sourceType ?? raw.source_type) as DocsSourceType,
            sourceUrl: String(raw.sourceUrl ?? raw.source_url),
            sourceRef: this.optionalString(raw.sourceRef ?? raw.source_ref),
            sourceCommit: this.optionalString(raw.sourceCommit ?? raw.source_commit),
            fetchedAt: this.optionalString(raw.fetchedAt ?? raw.fetched_at),
            artifact: artifact ? {
                type: artifact.type as NonNullable<DocumentationRegistryVersion['artifact']>['type'],
                url: this.optionalString(artifact.url),
                sha256: this.optionalString(artifact.sha256),
                sizeBytes: this.optionalNumber(artifact.sizeBytes ?? artifact.size_bytes),
                archiveRoot: this.optionalString(artifact.archiveRoot ?? artifact.archive_root)
            } : undefined,
            stats: stats ? {
                documentCount: Number(stats.documentCount ?? stats.document_count ?? 0),
                sectionCount: Number(stats.sectionCount ?? stats.section_count ?? 0),
                tokenCount: this.optionalNumber(stats.tokenCount ?? stats.token_count)
            } : undefined
        };
    }

    protected async buildOrDownloadPackage(
        registryPackage: DocumentationRegistryPackage,
        registryVersion: DocumentationRegistryVersion,
        packagePath: string,
        fetchedAt: string
    ): Promise<BuildResult> {
        if (registryVersion.artifact?.url) {
            const artifact = await this.fetchArtifactIndex(registryVersion, packagePath, fetchedAt);
            if (artifact) {
                return artifact;
            }
        }
        if (!process.env[REGISTRY_ENV]) {
            return {
                index: this.createMockIndex(registryPackage, registryVersion, fetchedAt),
                sourceCommit: registryVersion.sourceCommit,
                buildStrategy: 'artifact'
            };
        }
        return this.buildPackageFromSource(registryPackage, registryVersion, packagePath, fetchedAt);
    }

    protected async fetchArtifactIndex(
        registryVersion: DocumentationRegistryVersion,
        packagePath: string,
        fetchedAt: string
    ): Promise<BuildResult | undefined> {
        const artifact = registryVersion.artifact;
        if (!artifact?.url) {
            return undefined;
        }
        const bytes = await this.readBytes(artifact.url);
        const sha256 = this.sha256Buffer(bytes);
        if (artifact.sha256 && artifact.sha256 !== sha256) {
            throw new Error(`Artifact checksum mismatch for ${artifact.url}`);
        }
        if (artifact.type === 'json_index') {
            const index = JSON.parse(bytes.toString('utf8')) as StoredDocsIndex;
            this.ensureIndexFetchedAt(index, fetchedAt);
            return { index, buildStrategy: 'artifact' };
        }
        if (artifact.type === 'sqlite') {
            const dbPath = path.join(packagePath, 'package.db');
            await fs.writeFile(dbPath, bytes);
            return {
                index: this.createMockIndex(
                    { id: registryVersion.packageId, name: registryVersion.packageId, sources: [], versions: [] } as DocumentationRegistryPackage,
                    registryVersion,
                    fetchedAt
                ),
                buildStrategy: 'artifact',
                sqliteArtifactPath: dbPath
            };
        }
        if (artifact.type === 'archive') {
            const extractPath = path.join(packagePath, 'artifact-extracted');
            await fs.rm(extractPath, { recursive: true, force: true });
            await fs.mkdir(extractPath, { recursive: true });
            await this.extractArchive(artifact.url, bytes, extractPath);
            const root = artifact.archiveRoot ? path.join(extractPath, artifact.archiveRoot) : extractPath;
            const documents = await this.buildFromLocalFolder(root, undefined, fetchedAt, root);
            return {
                index: this.createIndexFromDocuments(
                    { id: registryVersion.packageId, name: registryVersion.packageId, sources: [], versions: [] } as DocumentationRegistryPackage,
                    registryVersion,
                    documents,
                    fetchedAt
                ),
                buildStrategy: 'artifact'
            };
        }
        return undefined;
    }

    protected async buildPackageFromSource(
        registryPackage: DocumentationRegistryPackage,
        registryVersion: DocumentationRegistryVersion,
        packagePath: string,
        fetchedAt: string
    ): Promise<BuildResult> {
        const source = registryPackage.sources.find(candidate => candidate.type === registryVersion.sourceType)
            ?? registryPackage.sources[0]
            ?? { type: registryVersion.sourceType, url: registryVersion.sourceUrl };
        let documents: SourceDocument[] = [];
        let sourceCommit: string | undefined = registryVersion.sourceCommit;
        let etag: string | undefined;
        let lastModifiedHeader: string | undefined;

        if (source.type === 'git') {
            const gitResult = await this.buildFromGitSource(source, registryVersion, packagePath, fetchedAt);
            documents = gitResult.documents;
            sourceCommit = gitResult.sourceCommit;
        } else if (source.type === 'local_folder') {
            documents = await this.buildFromLocalFolder(source.url, source.docsPath, fetchedAt, source.url, source);
        } else if (source.type === 'llms_txt') {
            const llmsResult = await this.buildFromLlmsTxt(source, fetchedAt);
            documents = llmsResult.documents;
            etag = llmsResult.etag;
            lastModifiedHeader = llmsResult.lastModifiedHeader;
        } else if (source.type === 'sitemap') {
            documents = await this.buildFromSitemap(source, fetchedAt);
        } else if (source.type === 'website' || source.type === 'single_url') {
            const document = await this.fetchSourceDocument(source.url, fetchedAt, source);
            documents = [document];
            etag = document.etag;
            lastModifiedHeader = document.lastModifiedHeader;
        }

        const index = this.createIndexFromDocuments(registryPackage, registryVersion, documents, fetchedAt);
        return {
            index,
            sourceCommit,
            etag,
            lastModifiedHeader,
            buildStrategy: source.type
        };
    }

    protected async buildFromGitSource(
        source: DocumentationRegistryPackage['sources'][number],
        registryVersion: DocumentationRegistryVersion,
        packagePath: string,
        fetchedAt: string
    ): Promise<{ documents: SourceDocument[]; sourceCommit?: string }> {
        const checkoutPath = path.join(packagePath, 'source-checkout');
        await fs.rm(checkoutPath, { recursive: true, force: true });
        const cloneArgs = ['clone', '--depth', '1'];
        if (registryVersion.sourceRef) {
            cloneArgs.push('--branch', registryVersion.sourceRef);
        }
        cloneArgs.push(source.url, checkoutPath);
        await execFileAsync('git', cloneArgs, { windowsHide: true });
        if (registryVersion.sourceCommit) {
            await execFileAsync('git', ['checkout', registryVersion.sourceCommit], { cwd: checkoutPath, windowsHide: true });
        }
        const sourceCommit = (await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: checkoutPath, windowsHide: true })).stdout.trim();
        const roots = source.docsPath?.length ? source.docsPath.map(relative => path.join(checkoutPath, relative)) : [checkoutPath];
        const documents: SourceDocument[] = [];
        for (const root of roots) {
            documents.push(...await this.buildFromLocalFolder(root, undefined, fetchedAt, checkoutPath, source));
        }
        return { documents, sourceCommit };
    }

    protected async buildFromLocalFolder(
        folderPath: string,
        docsPath: string[] | undefined,
        fetchedAt: string,
        basePath = folderPath,
        source?: DocumentationRegistryPackage['sources'][number]
    ): Promise<SourceDocument[]> {
        const roots = docsPath?.length ? docsPath.map(relative => path.join(folderPath, relative)) : [folderPath];
        const files: string[] = [];
        for (const root of roots) {
            files.push(...await this.findDocumentationFiles(root));
        }
        const documents: SourceDocument[] = [];
        const selectedFiles = files
            .filter(file => this.matchesCrawlerRules(path.relative(basePath, file), source))
            .slice(0, source?.maxDocuments ?? MAX_FETCHED_DOCUMENTS);
        for (const file of selectedFiles) {
            const content = await fs.readFile(file, 'utf8');
            documents.push({
                title: this.titleFromContent(content) ?? path.basename(file),
                content: this.extractText(content, path.extname(file)),
                localPath: path.relative(basePath, file),
                fetchedAt
            });
        }
        return documents;
    }

    protected async buildFromLlmsTxt(source: DocumentationRegistryPackage['sources'][number], fetchedAt: string): Promise<{
        documents: SourceDocument[];
        etag?: string;
        lastModifiedHeader?: string;
    }> {
        const llms = await this.fetchSourceDocument(source.url, fetchedAt, source);
        const urls = this.extractUrls(llms.content).slice(0, source.maxDocuments ?? MAX_FETCHED_DOCUMENTS);
        const documents = [llms];
        for (const referencedUrl of urls) {
            documents.push(await this.fetchSourceDocument(referencedUrl, fetchedAt, source));
        }
        return {
            documents,
            etag: llms.etag,
            lastModifiedHeader: llms.lastModifiedHeader
        };
    }

    protected async buildFromSitemap(source: DocumentationRegistryPackage['sources'][number], fetchedAt: string): Promise<SourceDocument[]> {
        const sitemap = await this.fetchText(source.url, source.headers);
        const urls = [...sitemap.body.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)]
            .map(match => match[1])
            .filter(Boolean)
            .filter(url => this.matchesCrawlerRules(url, source))
            .slice(0, source.maxDocuments ?? MAX_FETCHED_DOCUMENTS);
        const documents: SourceDocument[] = [];
        for (const pageUrl of urls) {
            documents.push(await this.fetchSourceDocument(pageUrl, fetchedAt, source));
        }
        return documents;
    }

    protected async fetchSourceDocument(
        url: string,
        fetchedAt: string,
        source?: DocumentationRegistryPackage['sources'][number]
    ): Promise<SourceDocument> {
        const response = await this.fetchText(url, source?.headers);
        return {
            title: this.titleFromContent(response.body) ?? url,
            content: this.extractText(response.body, this.extensionFromUrl(url), source?.contentSelectors),
            originalUrl: url,
            fetchedAt,
            etag: response.etag,
            lastModifiedHeader: response.lastModifiedHeader
        };
    }

    protected createIndexFromDocuments(
        registryPackage: DocumentationRegistryPackage,
        registryVersion: DocumentationRegistryVersion,
        documents: SourceDocument[],
        fetchedAt: string
    ): StoredDocsIndex {
        if (documents.length === 0) {
            return this.createMockIndex(registryPackage, registryVersion, fetchedAt);
        }
        return {
            package: {} as InstalledDocsPackage,
            documents: documents.map((document, documentIndex) => {
                const sections = this.splitSections(document.content).map((section, sectionIndex) => ({
                    id: `${registryPackage.id}-${registryVersion.version}-${documentIndex}-${sectionIndex}`,
                    heading: section.heading,
                    content: section.content,
                    contentHashSha256: this.sha256(section.content),
                    order: sectionIndex
                }));
                return {
                    id: `${registryPackage.id}-${registryVersion.version}-${documentIndex}`,
                    title: document.title,
                    originalUrl: document.originalUrl,
                    localPath: document.localPath,
                    fetchedAt: document.fetchedAt,
                    sections
                };
            })
        };
    }

    protected async loadConfiguredSkills(): Promise<DocsSkill[]> {
        const registryLocation = process.env[REGISTRY_ENV];
        if (!registryLocation || registryLocation.startsWith('http://') || registryLocation.startsWith('https://')) {
            return [];
        }
        const skillsPath = path.join(path.resolve(registryLocation), 'skills');
        const skills: DocsSkill[] = [];
        for (const skillFile of await this.readFiles(skillsPath, ['.yaml', '.yml', '.json'])) {
            const raw = await fs.readFile(skillFile, 'utf8');
            const parsed = skillFile.endsWith('.json') ? JSON.parse(raw) : this.parseFrontmatterSkill(raw);
            skills.push(this.toSkill(parsed, raw));
        }
        return skills;
    }

    protected seedSkills(): DocsSkill[] {
        return [
            {
                id: 'skill-nextjs',
                name: 'Next.js Assistant',
                appliesTo: [{ package: 'next', files: ['package.json'] }],
                preferredDocs: [
                    { package: 'nextjs', versionSource: 'project_package_json' },
                    { package: 'react', versionSource: 'project_package_json' }
                ],
                rules: [
                    'never_use_latest_if_project_version_exists',
                    'always_cite_doc_version',
                    'warn_when_docs_are_outdated'
                ],
                body: 'Consult local pinned Next.js and React documentation before suggesting APIs.'
            },
            {
                id: 'skill-dotnet',
                name: '.NET Assistant',
                appliesTo: [{ package: 'Microsoft.NETCore.App', files: ['*.csproj'] }],
                preferredDocs: [
                    { package: 'dotnet', versionSource: 'project_target_framework' },
                    { package: 'efcore', versionSource: 'project_package_reference' }
                ],
                rules: [
                    'never_use_latest_if_project_version_exists',
                    'always_cite_doc_version',
                    'warn_when_docs_are_outdated'
                ],
                body: 'Consult local pinned .NET and EF Core documentation before suggesting APIs.'
            }
        ];
    }

    protected toSkill(value: unknown, rawBody = ''): DocsSkill {
        const raw = value as Record<string, unknown>;
        return {
            id: String(raw.id),
            name: String(raw.name),
            appliesTo: ((raw.appliesTo ?? raw.applies_to) as unknown[] ?? []).map(rule => {
                const rawRule = rule as Record<string, unknown>;
                return {
                    package: this.optionalString(rawRule.package),
                    files: this.optionalStringArray(rawRule.files)
                };
            }),
            preferredDocs: ((raw.preferredDocs ?? raw.preferred_docs) as unknown[] ?? []).map(rule => {
                const rawRule = rule as Record<string, unknown>;
                return {
                    package: String(rawRule.package),
                    versionSource: String(rawRule.versionSource ?? rawRule.version_source)
                };
            }),
            rules: this.optionalStringArray(raw.rules) ?? [],
            body: this.optionalString(raw.body) ?? rawBody.replace(/^---[\s\S]*?---/, '').trim()
        };
    }

    protected parseFrontmatterSkill(content: string): unknown {
        const match = content.match(/^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/);
        if (!match) {
            return { id: 'skill', name: 'Skill', body: content };
        }
        return {
            ...this.parseSimpleYaml(match[1]),
            body: match[2].trim()
        };
    }

    protected async enrichCheckRunWithSourceState(candidate: InstalledDocsPackage, run: DocumentationCheckRun): Promise<void> {
        if (candidate.sourceUrl?.startsWith('http://') || candidate.sourceUrl?.startsWith('https://')) {
            const response = await fetch(candidate.sourceUrl, { method: 'HEAD' });
            if (!response.ok) {
                run.result = 'source_unavailable';
                run.errorMessage = `${response.status} ${response.statusText}`;
                return;
            }
            const etag = response.headers.get('etag') ?? undefined;
            const lastModified = response.headers.get('last-modified') ?? undefined;
            run.newHash = etag ?? lastModified;
            if ((etag && candidate.etag && etag !== candidate.etag)
                || (lastModified && candidate.lastModifiedHeader && lastModified !== candidate.lastModifiedHeader)) {
                run.result = 'changed_same_version';
            }
            return;
        }

        if (candidate.buildStrategy === 'git' && candidate.sourceUrl && candidate.sourceRef) {
            const output = await execFileAsync('git', ['ls-remote', candidate.sourceUrl, candidate.sourceRef], { windowsHide: true });
            const remoteCommit = output.stdout.split(/\s+/)[0];
            run.newHash = remoteCommit;
            if (remoteCommit && candidate.sourceCommit && remoteCommit !== candidate.sourceCommit) {
                run.result = 'changed_same_version';
            }
        }
    }

    protected async prepareRegistryContributionBranch(
        contributionPath: string,
        packageId: string,
        branchName: string,
        commitMessage: string
    ): Promise<boolean> {
        const registryLocation = process.env[REGISTRY_ENV];
        if (!registryLocation || registryLocation.startsWith('http://') || registryLocation.endsWith('.json')) {
            return false;
        }
        const registryPath = path.resolve(registryLocation);
        const gitPath = path.join(registryPath, '.git');
        try {
            await fs.stat(gitPath);
        } catch {
            return false;
        }
        const status = (await execFileAsync('git', ['status', '--porcelain'], { cwd: registryPath, windowsHide: true })).stdout.trim();
        if (status) {
            await this.appendLog(`registry branch preparation skipped because ${registryPath} has uncommitted changes`);
            return false;
        }
        await execFileAsync('git', ['switch', '-C', branchName], { cwd: registryPath, windowsHide: true });
        await fs.cp(path.join(contributionPath, 'packages', packageId), path.join(registryPath, 'packages', packageId), { recursive: true, force: true });
        await fs.cp(path.join(contributionPath, 'crawlers'), path.join(registryPath, 'crawlers'), { recursive: true, force: true });
        await execFileAsync('git', ['add', path.join('packages', packageId), 'crawlers'], { cwd: registryPath, windowsHide: true });
        await execFileAsync('git', ['commit', '-m', commitMessage], { cwd: registryPath, windowsHide: true })
            .catch(() => undefined);
        return true;
    }

    protected async getLatestPackageManagerVersion(registryPackage: DocumentationRegistryPackage): Promise<string | undefined> {
        const packageName = registryPackage.packageName;
        if (!packageName || !registryPackage.packageManager) {
            return undefined;
        }
        if (registryPackage.packageManager === 'npm') {
            const response = await this.fetchText(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`);
            return this.optionalString((JSON.parse(response.body) as Record<string, unknown>).version);
        }
        if (registryPackage.packageManager === 'pip') {
            const response = await this.fetchText(`https://pypi.org/pypi/${encodeURIComponent(packageName)}/json`);
            return this.optionalString(((JSON.parse(response.body) as Record<string, unknown>).info as Record<string, unknown> | undefined)?.version);
        }
        if (registryPackage.packageManager === 'nuget') {
            const response = await this.fetchText(`https://api.nuget.org/v3-flatcontainer/${packageName.toLowerCase()}/index.json`);
            const versions = (JSON.parse(response.body) as { versions?: string[] }).versions ?? [];
            return versions[versions.length - 1];
        }
        if (registryPackage.packageManager === 'maven') {
            const [groupId, artifactId] = packageName.includes(':') ? packageName.split(':') : ['', packageName];
            const response = await this.fetchText(
                `https://search.maven.org/solrsearch/select?q=g:%22${encodeURIComponent(groupId)}%22+AND+a:%22${encodeURIComponent(artifactId)}%22&rows=1&wt=json`
            );
            const searchResponse = (JSON.parse(response.body) as Record<string, unknown>).response as Record<string, unknown> | undefined;
            const docs = (searchResponse?.docs as Array<Record<string, unknown>> | undefined) ?? [];
            return this.optionalString(docs[0]?.latestVersion);
        }
        return undefined;
    }

    protected async findDocumentationFiles(root: string): Promise<string[]> {
        const files: string[] = [];
        const extensions = new Set(['.md', '.mdx', '.rst', '.txt', '.html', '.htm']);
        const ignored = new Set(['.git', 'node_modules', 'dist', 'lib', 'out', 'build']);
        const visit = async (folder: string): Promise<void> => {
            let entries: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
            try {
                entries = await fs.readdir(folder, { withFileTypes: true });
            } catch {
                return;
            }
            for (const entry of entries) {
                const absolute = path.join(folder, entry.name);
                if (entry.isDirectory() && !ignored.has(entry.name)) {
                    await visit(absolute);
                } else if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) {
                    files.push(absolute);
                }
            }
        };
        await visit(root);
        return files;
    }

    protected matchesCrawlerRules(relativePath: string, source?: DocumentationRegistryPackage['sources'][number]): boolean {
        const normalized = relativePath.replace(/\\/g, '/');
        if (source?.include?.length && !source.include.some(pattern => this.matchesSimplePattern(normalized, pattern))) {
            return false;
        }
        if (source?.exclude?.some(pattern => this.matchesSimplePattern(normalized, pattern))) {
            return false;
        }
        return true;
    }

    protected matchesSimplePattern(value: string, pattern: string): boolean {
        const normalized = pattern.replace(/\\/g, '/');
        if (normalized === value || value.includes(normalized)) {
            return true;
        }
        const escaped = normalized.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
        return new RegExp(`^${escaped}$`).test(value);
    }

    protected splitSections(content: string): Array<{ heading: string; content: string }> {
        const lines = content.split(/\r?\n/);
        const sections: Array<{ heading: string; content: string[] }> = [];
        for (const line of lines) {
            const heading = line.match(/^#{1,6}\s+(.+)$/)?.[1] ?? line.match(/^(.+)\n[=-]+$/)?.[1];
            if (heading || sections.length === 0) {
                sections.push({
                    heading: heading ?? 'Overview',
                    content: heading ? [] : [line]
                });
            } else {
                sections[sections.length - 1].content.push(line);
            }
        }
        return sections
            .map(section => ({ heading: section.heading, content: section.content.join('\n').trim() }))
            .filter(section => section.content.length > 0)
            .slice(0, 500);
    }

    protected extractText(content: string, extension: string, contentSelectors?: string[]): string {
        const lowerExtension = extension.toLowerCase();
        if (lowerExtension === '.html' || lowerExtension === '.htm' || content.includes('<html')) {
            const selectedContent = this.extractHtmlBySelectors(content, contentSelectors) ?? content;
            return selectedContent
                .replace(/<script[\s\S]*?<\/script>/gi, ' ')
                .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
                .replace(/<[^>]+>/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/\s+/g, ' ')
                .trim();
        }
        return content
            .replace(/```[\s\S]*?```/g, block => block.replace(/```[a-zA-Z0-9_-]*|```/g, ''))
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/^\s{0,3}[-*+]\s+/gm, '')
            .replace(/^\s{0,3}>\s?/gm, '')
            .trim();
    }

    protected extractHtmlBySelectors(content: string, contentSelectors: string[] | undefined): string | undefined {
        if (!contentSelectors?.length) {
            return undefined;
        }
        const chunks: string[] = [];
        for (const selector of contentSelectors) {
            if (selector.startsWith('#')) {
                const id = selector.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const match = content.match(new RegExp(`<([a-zA-Z0-9-]+)[^>]*id=["']${id}["'][^>]*>[\\s\\S]*?<\\/\\1>`, 'i'));
                if (match) {
                    chunks.push(match[0]);
                }
            } else if (selector.startsWith('.')) {
                const className = selector.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const match = content.match(new RegExp(`<([a-zA-Z0-9-]+)[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>[\\s\\S]*?<\\/\\1>`, 'i'));
                if (match) {
                    chunks.push(match[0]);
                }
            } else {
                const tag = selector.replace(/[^a-zA-Z0-9-]/g, '');
                const match = content.match(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'i'));
                if (match) {
                    chunks.push(match[0]);
                }
            }
        }
        return chunks.length > 0 ? chunks.join('\n') : undefined;
    }

    protected titleFromContent(content: string): string | undefined {
        return content.match(/<title>\s*([^<]+)\s*<\/title>/i)?.[1]?.trim()
            ?? content.match(/^#\s+(.+)$/m)?.[1]?.trim()
            ?? content.match(/^(.+)\n=+$/m)?.[1]?.trim();
    }

    protected extractUrls(content: string): string[] {
        const urls = new Set<string>();
        for (const match of content.matchAll(/https?:\/\/[^\s)>"']+/g)) {
            urls.add(match[0]);
        }
        return [...urls];
    }

    protected extensionFromUrl(url: string): string {
        try {
            return path.extname(new URL(url).pathname);
        } catch {
            return '';
        }
    }

    protected async fetchText(url: string, headers: Record<string, string> = {}): Promise<{ body: string; etag?: string; lastModifiedHeader?: string }> {
        let lastError: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const response = await fetch(url, {
                    headers: {
                        'user-agent': 'theia-library',
                        ...headers
                    }
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
                }
                return {
                    body: await response.text(),
                    etag: response.headers.get('etag') ?? undefined,
                    lastModifiedHeader: response.headers.get('last-modified') ?? undefined
                };
            } catch (error) {
                lastError = error;
                await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
            }
        }
        throw lastError;
    }

    protected async readBytes(location: string): Promise<Buffer> {
        if (location.startsWith('http://') || location.startsWith('https://')) {
            const response = await fetch(location);
            if (!response.ok) {
                throw new Error(`Failed to download ${location}: ${response.status} ${response.statusText}`);
            }
            return Buffer.from(await response.arrayBuffer());
        }
        return fs.readFile(path.resolve(location));
    }

    protected async extractArchive(location: string, bytes: Buffer, targetPath: string): Promise<void> {
        const lower = location.toLowerCase();
        if (lower.endsWith('.zip')) {
            const AdmZip = this.getAdmZip();
            if (!AdmZip) {
                throw new Error('adm-zip is unavailable for zip artifact extraction.');
            }
            new AdmZip(bytes).extractAllTo(targetPath, true);
            return;
        }
        if (lower.endsWith('.tar') || lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
            const archivePath = path.join(targetPath, lower.endsWith('.tar') ? 'artifact.tar' : 'artifact.tgz');
            await fs.writeFile(archivePath, bytes);
            const tarModule = nodeRequire('tar') as { x(options: { file: string; cwd: string }): Promise<void> };
            await tarModule.x({ file: archivePath, cwd: targetPath });
            await fs.rm(archivePath, { force: true });
            return;
        }
        throw new Error(`Unsupported archive artifact: ${location}`);
    }

    protected ensureIndexFetchedAt(index: StoredDocsIndex, fetchedAt: string): void {
        for (const document of index.documents) {
            document.fetchedAt = document.fetchedAt ?? fetchedAt;
        }
    }

    protected seedRegistry(): DocumentationRegistryPackage[] {
        return [
            {
                id: 'nextjs',
                name: 'Next.js',
                ecosystem: 'npm',
                packageName: 'next',
                packageManager: 'npm',
                homepage: 'https://nextjs.org',
                repository: 'https://github.com/vercel/next.js',
                sources: [
                    { type: 'git', url: 'https://github.com/vercel/next.js', docsPath: ['docs'] },
                    { type: 'llms_txt', url: 'https://nextjs.org/llms.txt' }
                ],
                versioning: { strategy: 'git_tags', tagPattern: 'v{version}' },
                license: { contentLicense: 'unknown', redistributionAllowed: false },
                updatePolicy: { checkInterval: 'daily', compare: ['git_tag', 'source_commit', 'content_hash_sha256'] },
                versions: [
                    this.version('nextjs', '14.2.32', 'https://github.com/vercel/next.js', 'v14.2.32'),
                    this.version('nextjs', '15.0.4', 'https://github.com/vercel/next.js', 'v15.0.4'),
                    this.version('nextjs', '16.0.0', 'https://github.com/vercel/next.js', 'v16.0.0')
                ]
            },
            {
                id: 'react',
                name: 'React',
                ecosystem: 'npm',
                packageName: 'react',
                packageManager: 'npm',
                homepage: 'https://react.dev',
                repository: 'https://github.com/facebook/react',
                sources: [
                    { type: 'website', url: 'https://react.dev' },
                    { type: 'git', url: 'https://github.com/reactjs/react.dev', docsPath: ['src/content'] }
                ],
                versioning: { strategy: 'manual' },
                license: { contentLicense: 'CC-BY-4.0', redistributionAllowed: true },
                updatePolicy: { checkInterval: 'weekly', compare: ['source_commit', 'content_hash_sha256'] },
                versions: [
                    this.version('react', '18.2.0', 'https://github.com/reactjs/react.dev', '18.2.0'),
                    this.version('react', '19.0.0', 'https://github.com/reactjs/react.dev', '19.0.0')
                ]
            },
            {
                id: 'dotnet',
                name: '.NET',
                ecosystem: 'dotnet',
                packageName: 'Microsoft.NETCore.App',
                packageManager: 'nuget',
                homepage: 'https://learn.microsoft.com/dotnet',
                repository: 'https://github.com/dotnet/docs',
                sources: [
                    { type: 'git', url: 'https://github.com/dotnet/docs', docsPath: ['docs'] }
                ],
                versioning: { strategy: 'manual' },
                license: { contentLicense: 'CC-BY-4.0', redistributionAllowed: true },
                updatePolicy: { checkInterval: 'weekly', compare: ['source_commit', 'content_hash_sha256'] },
                versions: [
                    this.version('dotnet', '8.0', 'https://github.com/dotnet/docs', 'main'),
                    this.version('dotnet', '9.0', 'https://github.com/dotnet/docs', 'main')
                ]
            },
            {
                id: 'efcore',
                name: 'Entity Framework Core',
                ecosystem: 'dotnet',
                packageName: 'Microsoft.EntityFrameworkCore',
                packageManager: 'nuget',
                homepage: 'https://learn.microsoft.com/ef/core',
                repository: 'https://github.com/dotnet/EntityFramework.Docs',
                sources: [
                    { type: 'git', url: 'https://github.com/dotnet/EntityFramework.Docs', docsPath: ['entity-framework/core'] }
                ],
                versioning: { strategy: 'manual' },
                license: { contentLicense: 'CC-BY-4.0', redistributionAllowed: true },
                updatePolicy: { checkInterval: 'weekly', compare: ['source_commit', 'content_hash_sha256'] },
                versions: [
                    this.version('efcore', '8.0', 'https://github.com/dotnet/EntityFramework.Docs', 'main'),
                    this.version('efcore', '9.0', 'https://github.com/dotnet/EntityFramework.Docs', 'main')
                ]
            }
        ];
    }

    protected version(packageId: string, version: string, sourceUrl: string, sourceRef: string): DocumentationRegistryVersion {
        return {
            packageId,
            version,
            sourceType: 'git',
            sourceUrl,
            sourceRef,
            fetchedAt: '2026-05-17T00:00:00.000Z',
            artifact: { type: 'json_index' },
            stats: { documentCount: 1, sectionCount: 3, tokenCount: 360 }
        };
    }

    protected createMockIndex(registryPackage: DocumentationRegistryPackage, registryVersion: DocumentationRegistryVersion, fetchedAt: string): StoredDocsIndex {
        const source = registryPackage.sources[0];
        const title = `${registryPackage.name} ${registryVersion.version} Local Context`;
        const sections = [
            {
                heading: 'Version policy',
                content: [
                    `${registryPackage.name} documentation is pinned to ${registryVersion.version}.`,
                    'Agents must prefer this version over latest documentation when a workspace lockfile references it.'
                ].join(' ')
            },
            {
                heading: 'Source metadata',
                content: [
                    `Source type ${registryVersion.sourceType}; URL ${registryVersion.sourceUrl};`,
                    `ref ${registryVersion.sourceRef ?? 'unknown'}.`,
                    `Redistribution is ${registryPackage.license?.redistributionAllowed ?? 'unknown'}.`
                ].join(' ')
            },
            {
                heading: 'MVP package',
                content: [
                    'This local package is a JSON index generated by Theia.',
                    'Future builds can replace it with a SQLite FTS5 artifact, git crawler output,',
                    'llms.txt content, sitemap content, or single URL extraction without changing the service contract.'
                ].join(' ')
            }
        ].map((section, index) => ({
            id: `${registryPackage.id}-${registryVersion.version}-${index}`,
            heading: section.heading,
            content: section.content,
            contentHashSha256: this.sha256(this.normalize(section.content)),
            order: index
        }));
        return {
            package: {} as InstalledDocsPackage,
            documents: [
                {
                    id: `${registryPackage.id}-${registryVersion.version}`,
                    title,
                    originalUrl: source?.url,
                    fetchedAt,
                    sections
                }
            ]
        };
    }

    protected async detectDependencies(workspacePath: string): Promise<WorkspaceDependency[]> {
        const dependencies: WorkspaceDependency[] = [];
        const files = await this.findWorkspaceFiles(workspacePath, 3);
        for (const file of files) {
            if (path.basename(file) === 'package.json') {
                const packageJson = await this.readJson<Record<string, unknown>>(file);
                for (const key of ['dependencies', 'devDependencies', 'peerDependencies'] as const) {
                    const values = packageJson?.[key] as Record<string, string> | undefined;
                    for (const [packageName, versionRange] of Object.entries(values ?? {})) {
                        dependencies.push({
                            packageName,
                            versionRange,
                            ecosystem: 'npm',
                            sourceFile: file,
                            kind: key === 'dependencies' ? 'dependency' : key === 'devDependencies' ? 'devDependency' : 'peerDependency'
                        });
                    }
                }
            } else if (file.endsWith('.csproj')) {
                const content = await fs.readFile(file, 'utf8');
                const target = content.match(/<TargetFramework>([^<]+)<\/TargetFramework>/i)?.[1];
                if (target) {
                    dependencies.push({
                        packageName: 'Microsoft.NETCore.App',
                        versionRange: target.replace(/^net/, ''),
                        ecosystem: 'dotnet',
                        sourceFile: file,
                        kind: 'targetFramework'
                    });
                }
                for (const match of content.matchAll(/<PackageReference\s+Include="([^"]+)"\s+Version="([^"]+)"/gi)) {
                    dependencies.push({
                        packageName: match[1],
                        versionRange: match[2],
                        ecosystem: 'dotnet',
                        sourceFile: file,
                        kind: 'packageReference'
                    });
                }
            } else if (path.basename(file) === 'composer.json') {
                const composer = await this.readJson<Record<string, unknown>>(file);
                for (const key of ['require', 'require-dev'] as const) {
                    const values = composer?.[key] as Record<string, string> | undefined;
                    for (const [packageName, versionRange] of Object.entries(values ?? {})) {
                        dependencies.push({
                            packageName,
                            versionRange,
                            ecosystem: 'composer',
                            sourceFile: file,
                            kind: key === 'require' ? 'dependency' : 'devDependency'
                        });
                    }
                }
            } else if (path.basename(file) === 'pyproject.toml') {
                const content = await fs.readFile(file, 'utf8');
                for (const match of content.matchAll(/['"]?([A-Za-z0-9_.-]+)(?:[<>=!~]=?[^"',\]]*)?['"]?/g)) {
                    if (match[1] && !['project', 'dependencies', 'optional-dependencies'].includes(match[1])) {
                        dependencies.push({ packageName: match[1], ecosystem: 'python', sourceFile: file, kind: 'dependency' });
                    }
                }
            } else if (path.basename(file) === 'pom.xml') {
                dependencies.push(...await this.detectPomDependencies(file));
            } else if (path.basename(file) === 'build.gradle' || path.basename(file) === 'build.gradle.kts') {
                dependencies.push(...await this.detectGradleDependencies(file));
            } else if (path.basename(file) === 'go.mod') {
                dependencies.push(...await this.detectGoDependencies(file));
            } else if (path.basename(file) === 'Cargo.toml') {
                dependencies.push(...await this.detectCargoDependencies(file));
            }
        }
        return dependencies;
    }

    protected async detectPomDependencies(file: string): Promise<WorkspaceDependency[]> {
        const content = await fs.readFile(file, 'utf8');
        const dependencies: WorkspaceDependency[] = [];
        const dependencyExpression = new RegExp([
            '<dependency>[\\s\\S]*?<groupId>([^<]+)</groupId>',
            '[\\s\\S]*?<artifactId>([^<]+)</artifactId>',
            '[\\s\\S]*?(?:<version>([^<]+)</version>)?[\\s\\S]*?</dependency>'
        ].join(''), 'g');
        for (const match of content.matchAll(dependencyExpression)) {
            dependencies.push({
                packageName: `${match[1]}:${match[2]}`,
                versionRange: match[3],
                ecosystem: 'maven',
                sourceFile: file,
                kind: 'mavenDependency'
            });
        }
        return dependencies;
    }

    protected async detectGradleDependencies(file: string): Promise<WorkspaceDependency[]> {
        const content = await fs.readFile(file, 'utf8');
        const dependencies: WorkspaceDependency[] = [];
        for (const match of content.matchAll(/(?:implementation|api|compileOnly|runtimeOnly|testImplementation)\(?\s*['"]([^:'"]+):([^:'"]+):([^'"]+)['"]/g)) {
            dependencies.push({
                packageName: `${match[1]}:${match[2]}`,
                versionRange: match[3],
                ecosystem: 'gradle',
                sourceFile: file,
                kind: 'gradleDependency'
            });
        }
        return dependencies;
    }

    protected async detectGoDependencies(file: string): Promise<WorkspaceDependency[]> {
        const content = await fs.readFile(file, 'utf8');
        return [...content.matchAll(/^\s*([a-zA-Z0-9_.:/-]+\.[a-zA-Z0-9_.:/-]+)\s+v?([^\s]+)$/gm)].map(match => ({
            packageName: match[1],
            versionRange: match[2],
            ecosystem: 'go' as const,
            sourceFile: file,
            kind: 'goRequire' as const
        }));
    }

    protected async detectCargoDependencies(file: string): Promise<WorkspaceDependency[]> {
        const content = await fs.readFile(file, 'utf8');
        const dependencies: WorkspaceDependency[] = [];
        const dependencyBlock = content.match(/\[dependencies\]([\s\S]*?)(?:\n\[|$)/)?.[1] ?? '';
        for (const match of dependencyBlock.matchAll(/^\s*([A-Za-z0-9_-]+)\s*=\s*(?:"([^"]+)"|\{[^}]*version\s*=\s*"([^"]+)")/gm)) {
            dependencies.push({
                packageName: match[1],
                versionRange: match[2] ?? match[3],
                ecosystem: 'rust',
                sourceFile: file,
                kind: 'cargoDependency'
            });
        }
        return dependencies;
    }

    protected async findWorkspaceFiles(root: string, maxDepth: number): Promise<string[]> {
        const result: string[] = [];
        const ignored = new Set(['.git', 'node_modules', 'lib', 'dist', 'out', '.cybervinci', '.theia-ai-docs']);
        const visit = async (folder: string, depth: number): Promise<void> => {
            if (depth > maxDepth) {
                return;
            }
            let entries: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
            try {
                entries = await fs.readdir(folder, { withFileTypes: true });
            } catch {
                return;
            }
            for (const entry of entries) {
                if (ignored.has(entry.name)) {
                    continue;
                }
                const absolute = path.join(folder, entry.name);
                if (entry.isDirectory()) {
                    await visit(absolute, depth + 1);
                } else if (entry.isFile() && (
                    entry.name === 'package.json'
                    || entry.name === 'composer.json'
                    || entry.name === 'pyproject.toml'
                    || entry.name === 'pom.xml'
                    || entry.name === 'build.gradle'
                    || entry.name === 'build.gradle.kts'
                    || entry.name === 'go.mod'
                    || entry.name === 'Cargo.toml'
                    || entry.name.endsWith('.csproj')
                )) {
                    result.push(absolute);
                }
            }
        };
        await visit(root, 0);
        return result;
    }

    protected matchesRegistryPackage(dependency: WorkspaceDependency, registryPackage: DocumentationRegistryPackage): boolean {
        if (dependency.ecosystem === 'dotnet' && dependency.kind === 'targetFramework' && registryPackage.id === 'dotnet') {
            return true;
        }
        if (dependency.ecosystem === 'gradle' && registryPackage.ecosystem === 'maven') {
            return dependency.packageName.toLowerCase() === (registryPackage.packageName ?? registryPackage.id).toLowerCase();
        }
        return dependency.packageName.toLowerCase() === (registryPackage.packageName ?? registryPackage.id).toLowerCase();
    }

    protected resolveVersion(registryPackage: DocumentationRegistryPackage, requested?: string): DocumentationRegistryVersion | undefined {
        const versions = registryPackage.versions;
        if (!requested) {
            return versions[versions.length - 1];
        }
        const normalized = requested.replace(/^[~^>=<\s]*/, '').replace(/^net/, '');
        const exact = versions.find(candidate => candidate.version === normalized);
        if (exact) {
            return exact;
        }
        const major = normalized.match(/^(\d+)/)?.[1];
        return versions.find(candidate => candidate.version.startsWith(`${major}.`)) ?? versions[versions.length - 1];
    }

    protected uniqueSuggestions(suggestions: DocsSuggestion[]): DocsSuggestion[] {
        const byKey = new Map<string, DocsSuggestion>();
        for (const suggestion of suggestions) {
            byKey.set(`${suggestion.packageId}@${suggestion.resolvedVersion}`, suggestion);
        }
        return [...byKey.values()].sort((a, b) => a.packageId.localeCompare(b.packageId));
    }

    protected isLegacyVersion(registryPackage: DocumentationRegistryPackage, version: string): boolean {
        const latest = registryPackage.versions[registryPackage.versions.length - 1]?.version;
        return latest !== undefined && latest !== version;
    }

    protected serializeLockfile(lockfile: DocsLockfile): string {
        const lines = [
            'version: 1',
            `generated_at: "${lockfile.generatedAt}"`,
            '',
            'docs:'
        ];
        for (const doc of lockfile.docs) {
            lines.push(`  - id: ${doc.id}`);
            lines.push(`    package: ${doc.package}`);
            lines.push(`    requested_version: "${doc.requestedVersion}"`);
            lines.push(`    resolved_version: "${doc.resolvedVersion}"`);
            lines.push(`    source_type: ${doc.sourceType}`);
            lines.push(`    source_url: "${doc.sourceUrl}"`);
            if (doc.sourceRef) {
                lines.push(`    source_ref: "${doc.sourceRef}"`);
            }
            if (doc.sourceCommit) {
                lines.push(`    source_commit: "${doc.sourceCommit}"`);
            }
            if (doc.artifactSha256) {
                lines.push(`    artifact_sha256: "${doc.artifactSha256}"`);
            }
            lines.push(`    installed_at: "${doc.installedAt}"`);
        }
        return `${lines.join('\n')}\n`;
    }

    protected parseLockfile(content: string): DocsLockfile {
        const generatedAt = content.match(/generated_at:\s*"([^"]+)"/)?.[1] ?? new Date().toISOString();
        const docs: PinnedDocsPackage[] = [];
        for (const block of content.split(/\n\s*-\s+id:\s+/).slice(1)) {
            const id = block.match(/^([^\n]+)/)?.[1]?.trim() ?? '';
            const value = (name: string): string | undefined => block.match(new RegExp(`${name}:\\s+"?([^"\\n]+)"?`))?.[1]?.trim();
            docs.push({
                id,
                package: value('package') ?? id,
                requestedVersion: value('requested_version') ?? '',
                resolvedVersion: value('resolved_version') ?? '',
                sourceType: (value('source_type') ?? 'artifact') as PinnedDocsPackage['sourceType'],
                sourceUrl: value('source_url') ?? '',
                sourceRef: value('source_ref'),
                sourceCommit: value('source_commit'),
                artifactSha256: value('artifact_sha256'),
                installedAt: value('installed_at') ?? generatedAt
            });
        }
        return { version: 1, generatedAt, docs };
    }

    protected searchTerms(query: string): string[] {
        return this.normalize(query).split(' ').filter(term => term.length > 2);
    }

    protected workspaceSearchTerms(query: string): string[] {
        return query.toLowerCase().match(/[a-z0-9_.$#-]{2,}/g)?.slice(0, 12) ?? [];
    }

    protected ftsQuery(terms: string[]): string {
        return terms.map(term => `"${term.replace(/"/g, '""')}"`).join(' OR ');
    }

    protected workspaceSectionScore(section: WorkspaceSection, terms: string[]): number {
        if (terms.length === 0) {
            return 0.25;
        }
        const haystack = [
            section.relativePath,
            section.title,
            section.languageId,
            section.sectionKind,
            section.content,
            ...Object.values(section.metadata ?? {})
        ].filter(value => value !== undefined).join(' ').toLowerCase();
        return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0) / terms.length;
    }

    protected createSnippet(content: string, terms: string[]): string {
        const normalized = content.toLowerCase();
        const firstIndex = terms.map(term => normalized.indexOf(term)).filter(index => index >= 0).sort((a, b) => a - b)[0] ?? 0;
        const start = Math.max(0, firstIndex - 80);
        return content.slice(start, start + 240).trim();
    }

    protected normalize(content: string): string {
        return content.toLowerCase().replace(/\s+/g, ' ').trim();
    }

    protected workspaceKey(workspacePath: string): string {
        return path.resolve(workspacePath || '.').toLowerCase();
    }

    protected estimateTokens(content: string): number {
        return Math.ceil(content.split(/\s+/).filter(Boolean).length * 1.3);
    }

    protected sha256(content: string): string {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    protected sha256Buffer(content: Buffer): string {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    protected async sha256File(filePath: string): Promise<string> {
        return this.sha256(await fs.readFile(filePath, 'utf8'));
    }

    protected async readDirNames(folderPath: string): Promise<string[]> {
        try {
            return (await fs.readdir(folderPath, { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name);
        } catch {
            return [];
        }
    }

    protected async readFiles(folderPath: string, extensions: string[]): Promise<string[]> {
        try {
            return (await fs.readdir(folderPath, { withFileTypes: true }))
                .filter(entry => entry.isFile() && extensions.includes(path.extname(entry.name).toLowerCase()))
                .map(entry => path.join(folderPath, entry.name));
        } catch {
            return [];
        }
    }

    protected async readJson<T>(filePath: string): Promise<T | undefined> {
        try {
            return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
        } catch {
            return undefined;
        }
    }

    protected async readWorkspaceSectionsIndex(): Promise<StoredWorkspaceSectionsIndex> {
        return await this.readJson<StoredWorkspaceSectionsIndex>(await this.workspaceSectionsJsonPath()) ?? {
            version: 1,
            updatedAt: new Date().toISOString(),
            sections: []
        };
    }

    protected normalizeWorkspaceSection(section: WorkspaceSection, workspacePath: string, source: string, indexedAt: string): WorkspaceSection {
        return this.stripUndefined({
            ...section,
            workspacePath,
            source,
            contentHash: section.contentHash ?? this.sha256(section.content),
            indexedAt: section.indexedAt ?? indexedAt
        });
    }

    protected parseWorkspaceSectionMetadata(value: unknown): Record<string, string | number | boolean | undefined> | undefined {
        try {
            const parsed = JSON.parse(String(value ?? '{}')) as unknown;
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return undefined;
            }
            return parsed as Record<string, string | number | boolean | undefined>;
        } catch {
            return undefined;
        }
    }

    protected async readStructuredFile(filePath: string): Promise<unknown> {
        const content = await fs.readFile(filePath, 'utf8');
        if (filePath.endsWith('.json')) {
            return JSON.parse(content);
        }
        const yaml = this.getYamlModule();
        return yaml ? yaml.load(content) : this.parseSimpleYaml(content);
    }

    protected parseSimpleYaml(content: string): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        const lines = content.split(/\r?\n/);
        let currentKey: string | undefined;
        let currentArray: unknown[] | undefined;
        let currentObject: Record<string, unknown> | undefined;
        for (const rawLine of lines) {
            const line = rawLine.replace(/\s+#.*$/, '');
            if (!line.trim()) {
                continue;
            }
            const topLevel = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
            if (topLevel) {
                currentKey = this.toCamelCase(topLevel[1]);
                const value = topLevel[2];
                if (!value) {
                    currentArray = [];
                    result[currentKey] = currentArray;
                } else {
                    result[currentKey] = this.parseScalar(value);
                    currentArray = undefined;
                }
                currentObject = undefined;
                continue;
            }
            const arrayItem = line.match(/^\s*-\s*(.*)$/);
            if (arrayItem && currentArray) {
                const value = arrayItem[1];
                if (value.includes(':')) {
                    currentObject = {};
                    currentArray.push(currentObject);
                    const [key, ...rest] = value.split(':');
                    currentObject[this.toCamelCase(key.trim())] = this.parseScalar(rest.join(':').trim());
                } else {
                    currentArray.push(this.parseScalar(value));
                    currentObject = undefined;
                }
                continue;
            }
            const nested = line.match(/^\s+([A-Za-z0-9_-]+):\s*(.*)$/);
            if (nested && currentObject) {
                currentObject[this.toCamelCase(nested[1])] = this.parseScalar(nested[2]);
            }
        }
        return result;
    }

    protected parseScalar(value: string): unknown {
        const trimmed = value.trim();
        if (trimmed === 'true') {
            return true;
        }
        if (trimmed === 'false') {
            return false;
        }
        if (trimmed === 'unknown') {
            return 'unknown';
        }
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            return trimmed.slice(1, -1).split(',').map(item => this.parseScalar(item.trim()));
        }
        return trimmed.replace(/^["']|["']$/g, '');
    }

    protected toCamelCase(value: string): string {
        return value.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
    }

    protected optionalString(value: unknown): string | undefined {
        return typeof value === 'string' && value.length > 0 ? value : undefined;
    }

    protected optionalStringArray(value: unknown): string[] | undefined {
        return Array.isArray(value) ? value.map(item => String(item)) : undefined;
    }

    protected optionalNumber(value: unknown): number | undefined {
        return typeof value === 'number' ? value : undefined;
    }

    protected optionalStringRecord(value: unknown): Record<string, string> | undefined {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return undefined;
        }
        return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, String(entry)]));
    }

    protected stripUndefined<T>(value: T): T {
        if (Array.isArray(value)) {
            return value.map(item => this.stripUndefined(item)).filter(item => item !== undefined) as T;
        }
        if (!value || typeof value !== 'object') {
            return value;
        }
        return Object.fromEntries(Object.entries(value)
            .filter(([, entry]) => entry !== undefined)
            .map(([key, entry]) => [key, this.stripUndefined(entry)])) as T;
    }

    protected dumpYaml(value: unknown): string {
        const yaml = this.getYamlModule();
        if (yaml?.dump) {
            return yaml.dump(value, { noRefs: true, lineWidth: 120 });
        }
        return `${JSON.stringify(value, undefined, 2)}\n`;
    }

    protected async writeJson(filePath: string, value: unknown): Promise<void> {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, `${JSON.stringify(value, undefined, 2)}\n`, 'utf8');
    }

    protected async appendLog(message: string): Promise<void> {
        await this.ensureStore();
        await fs.appendFile(path.join(await this.getStorePath(), 'logs', 'update-checks.log'), `${new Date().toISOString()} ${message}\n`, 'utf8');
    }
}
