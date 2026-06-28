import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { injectable } from '@theia/core/shared/inversify';

export interface AgentMarkdownFile {
    path: string;
    uri: string;
    relativePath: string;
    content: string;
    updatedAt: string;
}

export interface AgentMarkdownSummary {
    path: string;
    uri: string;
    relativePath: string;
    updatedAt: string;
}

export interface AgentCatalogSummary {
    id: string;
    title: string;
    category: string;
    sourceRelativePath: string;
    sourcePath: string;
    sourceUri: string;
    workspaceRelativePath: string;
    workspaceUri?: string;
    imported: boolean;
    updatedAt: string;
    excerpt?: string;
}

export interface AgentCatalogFile extends AgentCatalogSummary {
    content: string;
}

export interface ListAgentCatalogOptions {
    search?: string;
    category?: string;
    limit?: number;
}

export interface ReadAgentMarkdownOptions {
    createIfMissing?: boolean;
    title?: string;
}

export interface CreateAgentMarkdownOptions {
    title?: string;
    content?: string;
}

export interface DuplicateAgentMarkdownOptions {
    title?: string;
}

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown']);

@injectable()
export class AgentMarkdownStore {

    async listAgents(workspaceRootUri?: string): Promise<AgentMarkdownSummary[]> {
        const root = await this.ensureAgentsDir(workspaceRootUri);
        const files = await this.collectMarkdownFiles(root);
        const summaries = await Promise.all(files.map(async file => this.summary(root, file)));
        return summaries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    }

    async listCatalogAgents(workspaceRootUri?: string, options: ListAgentCatalogOptions = {}): Promise<AgentCatalogSummary[]> {
        const catalogRoot = await this.resolveCatalogRoot();
        if (!catalogRoot) {
            return [];
        }
        const root = await this.ensureAgentsDir(workspaceRootUri);
        const files = await this.collectMarkdownFiles(catalogRoot);
        const query = options.search?.trim().toLowerCase();
        const category = options.category?.trim().toLowerCase();
        const summaries: AgentCatalogSummary[] = [];
        for (const file of files) {
            const summary = await this.catalogSummary(catalogRoot, root, file);
            if (category && summary.category.toLowerCase() !== category) {
                continue;
            }
            if (query && !catalogSearchText(summary).includes(query)) {
                continue;
            }
            summaries.push(summary);
        }
        const sorted = summaries.sort((left, right) => {
            if (left.category !== right.category) {
                return left.category.localeCompare(right.category);
            }
            return left.title.localeCompare(right.title);
        });
        return options.limit && options.limit > 0 ? sorted.slice(0, options.limit) : sorted;
    }

    async readCatalogAgent(workspaceRootUri: string | undefined, catalogId: string): Promise<AgentCatalogFile | undefined> {
        const catalogRoot = await this.resolveCatalogRoot();
        if (!catalogRoot) {
            return undefined;
        }
        const root = await this.ensureAgentsDir(workspaceRootUri);
        const sourceRelativePath = sourceRelativePathFromCatalogId(catalogId);
        const file = path.resolve(catalogRoot, sourceRelativePath);
        assertInsideRoot(catalogRoot, file);
        if (!isMarkdownPath(file) || !await exists(file)) {
            return undefined;
        }
        return {
            ...await this.catalogSummary(catalogRoot, root, file),
            content: await fs.readFile(file, 'utf8')
        };
    }

    async importCatalogAgent(
        workspaceRootUri: string | undefined,
        catalogId: string,
        targetRelativePath?: string,
        overwrite: boolean = false
    ): Promise<AgentMarkdownFile> {
        const catalogAgent = await this.readCatalogAgent(workspaceRootUri, catalogId);
        if (!catalogAgent) {
            throw new Error(`Agent catalog item "${catalogId}" was not found.`);
        }
        const relativePath = targetRelativePath || catalogAgent.workspaceRelativePath;
        const existing = await this.readAgent(workspaceRootUri, relativePath);
        if (existing && !overwrite) {
            return existing;
        }
        return this.writeAgent(workspaceRootUri, relativePath, catalogAgent.content);
    }

    async readAgent(workspaceRootUri: string | undefined, relativePath: string, options: ReadAgentMarkdownOptions = {}): Promise<AgentMarkdownFile | undefined> {
        const root = await this.ensureAgentsDir(workspaceRootUri);
        const file = this.agentFile(root, relativePath);
        if (!await exists(file)) {
            if (!options.createIfMissing) {
                return undefined;
            }
            await this.writeAgent(workspaceRootUri, relativePath, defaultAgentTemplate(relativePath, options.title));
        }
        return {
            ...await this.summary(root, file),
            content: await fs.readFile(file, 'utf8')
        };
    }

    async writeAgent(workspaceRootUri: string | undefined, relativePath: string, content: string): Promise<AgentMarkdownFile> {
        const root = await this.ensureAgentsDir(workspaceRootUri);
        const file = this.agentFile(root, relativePath);
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, normalizeMarkdown(content), 'utf8');
        return {
            ...await this.summary(root, file),
            content: await fs.readFile(file, 'utf8')
        };
    }

    async createAgent(workspaceRootUri: string | undefined, relativePath: string, options: CreateAgentMarkdownOptions = {}): Promise<AgentMarkdownFile> {
        const root = await this.ensureAgentsDir(workspaceRootUri);
        const file = this.agentFile(root, relativePath);
        if (await exists(file)) {
            throw new Error(`Agent markdown "${relativePath}" already exists.`);
        }
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, normalizeMarkdown(options.content ?? defaultAgentTemplate(relativePath, options.title)), 'utf8');
        return {
            ...await this.summary(root, file),
            content: await fs.readFile(file, 'utf8')
        };
    }

    async duplicateAgent(workspaceRootUri: string | undefined, sourceRelativePath: string, targetRelativePath: string, options: DuplicateAgentMarkdownOptions = {}): Promise<AgentMarkdownFile> {
        const root = await this.ensureAgentsDir(workspaceRootUri);
        const sourceFile = this.agentFile(root, sourceRelativePath);
        const targetFile = this.agentFile(root, targetRelativePath);
        if (!await exists(sourceFile)) {
            throw new Error(`Agent markdown "${sourceRelativePath}" was not found.`);
        }
        if (await exists(targetFile)) {
            throw new Error(`Agent markdown "${targetRelativePath}" already exists.`);
        }
        await fs.mkdir(path.dirname(targetFile), { recursive: true });
        const sourceContent = await fs.readFile(sourceFile, 'utf8');
        await fs.writeFile(targetFile, normalizeMarkdown(options.title ? retitleMarkdown(sourceContent, options.title) : sourceContent), 'utf8');
        return {
            ...await this.summary(root, targetFile),
            content: await fs.readFile(targetFile, 'utf8')
        };
    }

    async renameAgent(workspaceRootUri: string | undefined, sourceRelativePath: string, targetRelativePath: string): Promise<AgentMarkdownFile> {
        const root = await this.ensureAgentsDir(workspaceRootUri);
        const sourceFile = this.agentFile(root, sourceRelativePath);
        const targetFile = this.agentFile(root, targetRelativePath);
        if (!await exists(sourceFile)) {
            throw new Error(`Agent markdown "${sourceRelativePath}" was not found.`);
        }
        if (await exists(targetFile)) {
            throw new Error(`Agent markdown "${targetRelativePath}" already exists.`);
        }
        await fs.mkdir(path.dirname(targetFile), { recursive: true });
        await fs.rename(sourceFile, targetFile);
        return {
            ...await this.summary(root, targetFile),
            content: await fs.readFile(targetFile, 'utf8')
        };
    }

    protected async ensureAgentsDir(workspaceRootUri: string | undefined): Promise<string> {
        const dir = path.join(storageRoot(workspaceRootUri), 'agents');
        await fs.mkdir(dir, { recursive: true });
        return dir;
    }

    protected agentFile(root: string, relativePath: string): string {
        assertMarkdownPath(relativePath);
        const file = path.resolve(root, relativePath);
        assertInsideRoot(root, file);
        return file;
    }

    protected async collectMarkdownFiles(root: string, dir: string = root): Promise<string[]> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files: string[] = [];
        for (const entry of entries) {
            const file = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                files.push(...await this.collectMarkdownFiles(root, file));
            } else if (entry.isFile() && isMarkdownPath(entry.name)) {
                files.push(file);
            }
        }
        return files;
    }

    protected async summary(root: string, file: string): Promise<AgentMarkdownSummary> {
        const stat = await fs.stat(file);
        const relativePath = path.relative(root, file).split(path.sep).join('/');
        return {
            path: file,
            uri: FileUri.create(file).toString(),
            relativePath,
            updatedAt: stat.mtime.toISOString()
        };
    }

    protected async catalogSummary(catalogRoot: string, workspaceAgentsRoot: string, file: string): Promise<AgentCatalogSummary> {
        const stat = await fs.stat(file);
        const sourceRelativePath = path.relative(catalogRoot, file).split(path.sep).join('/');
        const workspaceRelativePath = catalogWorkspaceRelativePath(sourceRelativePath);
        const workspaceFile = this.agentFile(workspaceAgentsRoot, workspaceRelativePath);
        const content = await fs.readFile(file, 'utf8');
        const imported = await exists(workspaceFile);
        return {
            id: catalogIdFromSourceRelativePath(sourceRelativePath),
            title: catalogTitle(sourceRelativePath, content),
            category: catalogCategory(sourceRelativePath),
            sourceRelativePath,
            sourcePath: file,
            sourceUri: FileUri.create(file).toString(),
            workspaceRelativePath,
            workspaceUri: imported ? FileUri.create(workspaceFile).toString() : undefined,
            imported,
            updatedAt: stat.mtime.toISOString(),
            excerpt: catalogExcerpt(content)
        };
    }

    protected async resolveCatalogRoot(): Promise<string | undefined> {
        const configured = process.env.FLOW_AGENT_CATALOG_ROOT?.trim();
        if (configured) {
            const configuredRoot = path.resolve(configured);
            return await exists(configuredRoot) ? configuredRoot : undefined;
        }
        let current = path.resolve(process.cwd());
        for (let depth = 0; depth < 10; depth++) {
            const candidate = path.join(current, 'Modificacoes', 'Skills', 'Manual', 'Agency Agents');
            if (await exists(candidate)) {
                return candidate;
            }
            const parent = path.dirname(current);
            if (parent === current) {
                break;
            }
            current = parent;
        }
        return undefined;
    }
}

function catalogSearchText(summary: AgentCatalogSummary): string {
    return [
        summary.title,
        summary.category,
        summary.sourceRelativePath,
        summary.workspaceRelativePath,
        summary.excerpt
    ].filter(Boolean).join(' ').toLowerCase();
}

function catalogWorkspaceRelativePath(sourceRelativePath: string): string {
    return `agency/${sourceRelativePath.replace(/^\/+/, '')}`;
}

function catalogIdFromSourceRelativePath(sourceRelativePath: string): string {
    return `agency:${sourceRelativePath.split(path.sep).join('/')}`;
}

function sourceRelativePathFromCatalogId(catalogId: string): string {
    return catalogId.startsWith('agency:') ? catalogId.slice('agency:'.length) : catalogId;
}

function catalogCategory(sourceRelativePath: string): string {
    const segments = sourceRelativePath.split('/');
    return segments.length > 1 ? segments[0] : 'overview';
}

function catalogTitle(sourceRelativePath: string, content: string): string {
    const heading = content.split(/\r?\n/).find(line => /^#\s+/.test(line))?.replace(/^#\s+/, '').trim();
    if (heading) {
        return heading;
    }
    return titleCase(path.basename(sourceRelativePath, path.extname(sourceRelativePath)).replace(/[-_]+/g, ' '));
}

function catalogExcerpt(content: string): string | undefined {
    const lines = content.split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#') && !line.startsWith('---'));
    const excerpt = lines.slice(0, 2).join(' ');
    return excerpt ? truncate(excerpt, 180) : undefined;
}

function truncate(value: string, maxLength: number): string {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}...`;
}

function storageRoot(workspaceRootUri?: string): string {
    if (workspaceRootUri) {
        return path.join(FileUri.fsPath(workspaceRootUri), '.theia', 'flow');
    }
    return path.join(os.homedir(), '.theia', 'flow');
}

function assertMarkdownPath(relativePath: string): void {
    if (!relativePath || path.isAbsolute(relativePath) || relativePath.split(/[\\/]+/).some(segment => segment === '..')) {
        throw new Error(`Agent path must be a relative Markdown path inside the workspace agent store: ${relativePath}`);
    }
    if (!isMarkdownPath(relativePath)) {
        throw new Error(`Agent path must use a Markdown extension: ${relativePath}`);
    }
}

function assertInsideRoot(root: string, file: string): void {
    const relative = path.relative(path.resolve(root), file);
    if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error(`Agent path escapes the workspace agent store: ${file}`);
    }
}

function isMarkdownPath(value: string): boolean {
    return MARKDOWN_EXTENSIONS.has(path.extname(value).toLowerCase());
}

function defaultAgentTemplate(relativePath: string, title?: string): string {
    const name = title || path.basename(relativePath, path.extname(relativePath)).replace(/[-_]+/g, ' ');
    return [
        `# ${titleCase(name)}`,
        '',
        '## Role',
        '',
        'Describe the reusable agent role here.',
        '',
        '> Agent Markdown is advisory execution context only. Workflow structure, transitions, guards, joins, loops, gates, and orchestration rules stay in the workflow file and Flow Kernel.',
        '',
        '## Instructions',
        '',
        '- Define the expected inputs.',
        '- Describe the work this agent should perform.',
        '- List the Markdown outputs this agent should produce.'
    ].join('\n');
}

function titleCase(value: string): string {
    return value.replace(/\b\w/g, match => match.toUpperCase());
}

function normalizeMarkdown(content: string): string {
    return content.endsWith('\n') ? content : `${content}\n`;
}

function retitleMarkdown(content: string, title: string): string {
    const lines = normalizeMarkdown(content).split('\n');
    const headingIndex = lines.findIndex(line => line.startsWith('# '));
    if (headingIndex >= 0) {
        lines[headingIndex] = `# ${titleCase(title)}`;
        return lines.join('\n');
    }
    return `# ${titleCase(title)}\n\n${content}`;
}

async function exists(file: string): Promise<boolean> {
    try {
        await fs.access(file);
        return true;
    } catch {
        return false;
    }
}
