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
    source?: 'workspace' | 'catalog';
}

export interface AgentMarkdownSummary {
    path: string;
    uri: string;
    relativePath: string;
    updatedAt: string;
    source?: 'workspace' | 'catalog';
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
const AGENCY_AGENT_CATALOG_PREFIX = 'agents/agency/';
const AGENCY_AGENT_CATALOG_ROOT_SEGMENTS = ['Skills', 'Manual', 'Agency Agents'];

@injectable()
export class AgentMarkdownStore {

    async listAgents(workspaceRootUri?: string): Promise<AgentMarkdownSummary[]> {
        const root = await this.ensureAgentsDir(workspaceRootUri);
        const files = await this.collectMarkdownFiles(root);
        const workspaceSummaries = await Promise.all(files.map(async file => ({
            ...await this.summary(root, file),
            source: 'workspace' as const
        })));
        const catalogSummaries = await this.listCatalogAgents();
        const workspacePaths = new Set(workspaceSummaries.map(summary => summary.relativePath));
        return [
            ...workspaceSummaries,
            ...catalogSummaries.filter(summary => !workspacePaths.has(summary.relativePath))
        ].sort((left, right) => sourceRank(left.source) - sourceRank(right.source) || left.relativePath.localeCompare(right.relativePath));
    }

    async readAgent(workspaceRootUri: string | undefined, relativePath: string, options: ReadAgentMarkdownOptions = {}): Promise<AgentMarkdownFile | undefined> {
        const root = await this.ensureAgentsDir(workspaceRootUri);
        const file = this.agentFile(root, relativePath);
        if (!await exists(file)) {
            const catalogFile = await this.catalogAgentFile(relativePath);
            if (catalogFile) {
                return {
                    ...await this.catalogSummary(catalogFile.root, catalogFile.file),
                    content: await fs.readFile(catalogFile.file, 'utf8')
                };
            }
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
        if (await exists(targetFile)) {
            throw new Error(`Agent markdown "${targetRelativePath}" already exists.`);
        }
        let sourceContent: string | undefined;
        if (await exists(sourceFile)) {
            sourceContent = await fs.readFile(sourceFile, 'utf8');
        } else {
            const catalogFile = await this.catalogAgentFile(sourceRelativePath);
            if (catalogFile) {
                sourceContent = await fs.readFile(catalogFile.file, 'utf8');
            }
        }
        if (sourceContent === undefined) {
            throw new Error(`Agent markdown "${sourceRelativePath}" was not found.`);
        }
        await fs.mkdir(path.dirname(targetFile), { recursive: true });
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

    protected async listCatalogAgents(): Promise<AgentMarkdownSummary[]> {
        const root = await this.resolveAgencyAgentCatalogRoot();
        if (!root) {
            return [];
        }
        const files = (await this.collectMarkdownFiles(root))
            .filter(file => !this.isCatalogMetadataFile(root, file));
        return Promise.all(files.map(async file => this.catalogSummary(root, file)));
    }

    protected async summary(root: string, file: string): Promise<AgentMarkdownSummary> {
        const stat = await fs.stat(file);
        const relativePath = path.relative(root, file).split(path.sep).join('/');
        return {
            path: file,
            uri: FileUri.create(file).toString(),
            relativePath,
            updatedAt: stat.mtime.toISOString(),
            source: 'workspace'
        };
    }

    protected async catalogSummary(root: string, file: string): Promise<AgentMarkdownSummary> {
        const stat = await fs.stat(file);
        const relativePath = `${AGENCY_AGENT_CATALOG_PREFIX}${path.relative(root, file).split(path.sep).join('/')}`;
        return {
            path: file,
            uri: FileUri.create(file).toString(),
            relativePath,
            updatedAt: stat.mtime.toISOString(),
            source: 'catalog'
        };
    }

    protected async catalogAgentFile(relativePath: string): Promise<{ root: string; file: string } | undefined> {
        if (!relativePath.startsWith(AGENCY_AGENT_CATALOG_PREFIX)) {
            return undefined;
        }
        const root = await this.resolveAgencyAgentCatalogRoot();
        if (!root) {
            return undefined;
        }
        const catalogRelativePath = relativePath.slice(AGENCY_AGENT_CATALOG_PREFIX.length);
        assertMarkdownPath(catalogRelativePath);
        const file = path.resolve(root, catalogRelativePath);
        assertInsideRoot(root, file);
        if (await exists(file)) {
            return { root, file };
        }
        return undefined;
    }

    protected async resolveAgencyAgentCatalogRoot(): Promise<string | undefined> {
        const envPath = process.env.CYBERVINCI_AGENCY_AGENTS_DIR;
        const candidates = [
            envPath,
            path.resolve(process.cwd(), ...AGENCY_AGENT_CATALOG_ROOT_SEGMENTS),
            path.resolve(process.cwd(), '..', '..', 'Modificacoes', ...AGENCY_AGENT_CATALOG_ROOT_SEGMENTS),
            path.resolve(__dirname, '..', '..', '..', '..', '..', ...AGENCY_AGENT_CATALOG_ROOT_SEGMENTS),
            path.resolve(__dirname, '..', '..', '..', '..', '..', '..', 'Modificacoes', ...AGENCY_AGENT_CATALOG_ROOT_SEGMENTS)
        ].filter((candidate): candidate is string => !!candidate);
        for (const candidate of candidates) {
            if (await isDirectory(candidate)) {
                return candidate;
            }
        }
        return undefined;
    }

    protected isCatalogMetadataFile(root: string, file: string): boolean {
        const relativePath = path.relative(root, file).split(path.sep).join('/').toLowerCase();
        return relativePath === 'readme.md' || relativePath === 'readme-cybervinci.md' || relativePath === 'license.md';
    }
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

async function isDirectory(file: string): Promise<boolean> {
    try {
        return (await fs.stat(file)).isDirectory();
    } catch {
        return false;
    }
}

function sourceRank(source: AgentMarkdownSummary['source']): number {
    return source === 'workspace' ? 0 : 1;
}
