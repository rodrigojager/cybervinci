// *****************************************************************************
// Copyright (C) 2026 TypeFox GmbH.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

export const LibraryService = Symbol('LibraryService');
export const LibraryServicePath = '/services/library';

export type DocsSourceType =
    | 'git'
    | 'llms_txt'
    | 'sitemap'
    | 'website'
    | 'local_folder'
    | 'artifact'
    | 'single_url'
    | 'npm'
    | 'nuget'
    | 'pip'
    | 'maven'
    | 'openapi'
    | 'swagger'
    | 'confluence'
    | 'notion'
    | 'markdown_zip';
export type DocumentationStatus = 'active' | 'outdated' | 'failed' | 'archived';
export type RedistributionPolicy = boolean | 'unknown';
export type DocumentationCheckResult = 'unchanged' | 'changed_same_version' | 'new_version_available' | 'source_unavailable' | 'check_failed';

export interface DocumentationSource {
    id: string;
    name: string;
    packageManager?: string;
    ecosystem?: string;
    sourceType: DocsSourceType;
    sourceUrl: string;
    docsPath?: string[];
    requestedVersion?: string;
    resolvedVersion?: string;
    resolvedRef?: string;
    resolvedCommitSha?: string;
    etag?: string;
    lastModifiedHeader?: string;
    contentHashSha256?: string;
    packageDbHashSha256?: string;
    fetchedAt?: string;
    lastCheckedAt?: string;
    nextCheckAt?: string;
    status: DocumentationStatus;
}

export interface RegistrySource {
    type: DocsSourceType;
    url: string;
    docsPath?: string[];
    include?: string[];
    exclude?: string[];
    contentSelectors?: string[];
    maxDocuments?: number;
    executeJavascript?: false;
    headers?: Record<string, string>;
}

export interface RegistryArtifact {
    type: 'json_index' | 'sqlite' | 'archive';
    url?: string;
    sha256?: string;
    sizeBytes?: number;
    archiveRoot?: string;
}

export interface DocsSkill {
    id: string;
    name: string;
    appliesTo: Array<{
        package?: string;
        files?: string[];
    }>;
    preferredDocs: Array<{
        package: string;
        versionSource: string;
    }>;
    rules: string[];
    body: string;
}

export interface DocumentationRegistryPackage {
    id: string;
    name: string;
    ecosystem?: string;
    packageName?: string;
    packageManager?: string;
    homepage?: string;
    repository?: string;
    sources: RegistrySource[];
    versioning?: {
        strategy: 'git_tags' | 'fixed' | 'package_manager' | 'manual';
        tagPattern?: string;
    };
    license?: {
        contentLicense?: string;
        redistributionAllowed: RedistributionPolicy;
    };
    updatePolicy?: {
        checkInterval?: 'manual' | 'daily' | 'weekly' | 'monthly';
        compare?: string[];
    };
    versions: DocumentationRegistryVersion[];
}

export interface DocumentationRegistryVersion {
    packageId: string;
    version: string;
    sourceType: DocsSourceType;
    sourceUrl: string;
    sourceRef?: string;
    sourceCommit?: string;
    fetchedAt?: string;
    artifact?: RegistryArtifact;
    stats?: {
        documentCount: number;
        sectionCount: number;
        tokenCount?: number;
    };
}

export interface DocumentationPackage {
    id: string;
    sourceId: string;
    name: string;
    version: string;
    dbPath: string;
    sizeBytes: number;
    sectionCount: number;
    documentCount: number;
    tokenCount?: number;
    createdAt: string;
    createdBy?: string;
    isActive: boolean;
    isLegacy: boolean;
    license?: string;
    redistributionAllowed: RedistributionPolicy;
    notes?: string;
}

export interface DocumentationDocument {
    id: string;
    packageId: string;
    originalUrl?: string;
    localPath?: string;
    title?: string;
    contentHashSha256: string;
    normalizedContentHashSha256: string;
    fetchedAt: string;
    lastSeenAt: string;
}

export interface DocumentationSection {
    id: string;
    documentId: string;
    packageId: string;
    heading?: string;
    content: string;
    contentHashSha256: string;
    order: number;
    tokenCount?: number;
}

export interface InstalledDocsPackage extends DocumentationPackage {
    packagePath: string;
    sourceUrl?: string;
    sourceRef?: string;
    sourceCommit?: string;
    contentHashSha256?: string;
    normalizedContentHashSha256?: string;
    etag?: string;
    lastModifiedHeader?: string;
    lastCheckedAt?: string;
    buildStrategy?: DocsSourceType | 'artifact';
}

export interface DocsSearchOptions {
    packageId?: string;
    version?: string;
    ecosystem?: string;
    title?: string;
    path?: string;
    sourceUrl?: string;
    tags?: string[];
    maxResults?: number;
}

export interface DocsSearchResult {
    packageId: string;
    packageName: string;
    version: string;
    title: string;
    heading?: string;
    snippet: string;
    content: string;
    originalUrl?: string;
    localPath?: string;
    score: number;
    fetchedAt?: string;
    sourceCommit?: string;
    isOutdated?: boolean;
}

export interface WorkspaceSection {
    id: string;
    workspacePath: string;
    source: string;
    sourceId?: string;
    uri?: string;
    relativePath?: string;
    languageId?: string;
    sectionKind?: string;
    title: string;
    content: string;
    contentHash?: string;
    startLine?: number;
    endLine?: number;
    tokenCount?: number;
    indexedAt?: string;
    metadata?: Record<string, string | number | boolean | undefined>;
}

export interface IndexWorkspaceSectionsRequest {
    workspacePath: string;
    source: string;
    sections: WorkspaceSection[];
    replace?: boolean;
}

export interface IndexWorkspaceSectionsResult {
    workspacePath: string;
    source: string;
    sectionCount: number;
    indexedAt: string;
    sqliteAvailable: boolean;
}

export interface WorkspaceSectionSearchOptions {
    workspacePath?: string;
    source?: string;
    sectionKind?: string;
    maxResults?: number;
}

export interface WorkspaceSectionSearchResult extends WorkspaceSection {
    snippet: string;
    score: number;
}

export interface PinnedDocsPackage {
    id: string;
    package: string;
    requestedVersion: string;
    resolvedVersion: string;
    sourceType: DocsSourceType;
    sourceUrl: string;
    sourceRef?: string;
    sourceCommit?: string;
    artifactSha256?: string;
    installedAt: string;
}

export interface DocsLockfile {
    version: 1;
    generatedAt: string;
    docs: PinnedDocsPackage[];
}

export interface WorkspaceDependency {
    packageName: string;
    versionRange?: string;
    ecosystem: 'npm' | 'composer' | 'dotnet' | 'python' | 'maven' | 'gradle' | 'go' | 'rust';
    sourceFile: string;
    kind:
        | 'dependency'
        | 'devDependency'
        | 'peerDependency'
        | 'targetFramework'
        | 'packageReference'
        | 'mavenDependency'
        | 'gradleDependency'
        | 'goRequire'
        | 'cargoDependency';
}

export interface WorkspaceDocsDetection {
    workspacePath: string;
    dependencies: WorkspaceDependency[];
    suggestions: DocsSuggestion[];
}

export interface DocsSuggestion {
    packageId: string;
    packageName: string;
    registryName: string;
    ecosystem?: string;
    requestedVersion?: string;
    resolvedVersion?: string;
    installed: boolean;
    pinned: boolean;
    reason: string;
}

export interface InstallDocsPackageRequest {
    packageId: string;
    version?: string;
    workspacePath?: string;
    pinToWorkspace?: boolean;
    allowUnknownLicense?: boolean;
}

export interface DocumentationCheckRun {
    id: string;
    sourceId: string;
    startedAt: string;
    finishedAt: string;
    result: DocumentationCheckResult;
    previousHash?: string;
    newHash?: string;
    previousVersion?: string;
    newVersion?: string;
    errorMessage?: string;
}

export interface LibraryBundle {
    query: string;
    workspacePath: string;
    pinnedDocs: PinnedDocsPackage[];
    applicableSkills: DocsSkill[];
    results: DocsSearchResult[];
    warnings: string[];
}

export interface RegistryContributionResult {
    contributionPath: string;
    files: string[];
    branchName?: string;
    commitMessage?: string;
    summary: string;
}

export interface RegistryValidationResult {
    valid: boolean;
    source: string;
    errors: Array<{
        file?: string;
        message: string;
    }>;
}

export interface LibraryService {
    getStorePath(): Promise<string>;
    listAvailablePackages(): Promise<DocumentationRegistryPackage[]>;
    validateRegistry(): Promise<RegistryValidationResult>;
    listInstalledPackages(): Promise<InstalledDocsPackage[]>;
    detectWorkspace(workspacePath: string): Promise<WorkspaceDocsDetection>;
    installPackage(request: InstallDocsPackageRequest): Promise<InstalledDocsPackage>;
    searchDocs(query: string, options?: DocsSearchOptions): Promise<DocsSearchResult[]>;
    indexWorkspaceSections(request: IndexWorkspaceSectionsRequest): Promise<IndexWorkspaceSectionsResult>;
    searchWorkspaceSections(query: string, options?: WorkspaceSectionSearchOptions): Promise<WorkspaceSectionSearchResult[]>;
    listSkills(): Promise<DocsSkill[]>;
    getApplicableSkills(workspacePath: string): Promise<DocsSkill[]>;
    readLockfile(workspacePath: string): Promise<DocsLockfile | undefined>;
    pinPackageToWorkspace(workspacePath: string, packageId: string, version?: string): Promise<DocsLockfile>;
    getWorkspaceLibrary(workspacePath: string, userQuestion: string): Promise<LibraryBundle>;
    checkUpdates(packageId?: string): Promise<DocumentationCheckRun[]>;
    generateRegistryContribution(packageId: string, version: string, workspacePath: string): Promise<RegistryContributionResult>;
}
