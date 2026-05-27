import * as fs from 'fs/promises';
import * as path from 'path';
import { nls } from '@theia/core/lib/common';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { injectable } from '@theia/core/shared/inversify';
import { ArenaAgentSummary, ArenaSaveAgentRequest } from '../common';

const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules', 'lib', 'src-gen', '.browser_modules', '.cache', 'plugins', 'plugins.disabled']);
const MAX_SCAN_DEPTH = 32;
const MAX_AGENT_FILES = 5000;

@injectable()
export class PromptLibraryService {

    async listAgents(workspaceRootUris: string[]): Promise<ArenaAgentSummary[]> {
        const roots = this.toWorkspaceRoots(workspaceRootUris);
        const agents: ArenaAgentSummary[] = [];
        for (const root of roots) {
            await this.scanMarkdown(root, path.join(root, '.arena', 'agents'), agents, 0);
            await this.scanMarkdown(root, root, agents, 0);
            if (agents.length >= MAX_AGENT_FILES) {
                break;
            }
        }
        return this.dedupeAgents(agents).sort((left, right) => {
            if (left.source !== right.source) {
                return left.source === 'arena' ? -1 : 1;
            }
            return left.relativePath.localeCompare(right.relativePath);
        });
    }

    async readAgent(uri: string, workspaceRootUris: string[]): Promise<{ name: string; content: string }> {
        const filePath = this.uriToPath(uri);
        this.assertInsideWorkspace(filePath, this.toWorkspaceRoots(workspaceRootUris));
        const content = await fs.readFile(filePath, 'utf8');
        return {
            name: path.basename(filePath, path.extname(filePath)),
            content
        };
    }

    async saveAgent(request: ArenaSaveAgentRequest): Promise<string> {
        const root = this.getPrimaryRoot(request.workspaceRootUris);
        const folder = path.join(root, '.arena', 'agents');
        await fs.mkdir(folder, { recursive: true });
        const safeName = this.sanitizeName(request.name || 'agent');
        const filePath = path.join(folder, `${safeName}.md`);
        const body = request.notes ? `<!-- ${request.notes.replace(/-->/g, '-- >')} -->\n\n${request.contentMarkdown}` : request.contentMarkdown;
        await fs.writeFile(filePath, body, 'utf8');
        return FileUri.create(filePath).toString();
    }

    async saveArtifact(workspaceRootUris: string[], disputeId: string, label: string, files: { path: string; content: string }[]): Promise<string> {
        const root = this.getPrimaryRoot(workspaceRootUris);
        const folder = path.join(root, '.arena', 'artifacts', disputeId, label);
        await fs.mkdir(folder, { recursive: true });
        let firstFile = folder;
        for (const file of files) {
            const safeRelativePath = file.path.replace(/\\/g, '/').replace(/^output\//, '');
            if (!safeRelativePath || safeRelativePath.includes('../') || safeRelativePath.includes('://') || /^[a-zA-Z]:/.test(safeRelativePath)) {
                throw new Error(nls.localize('theia/arena/unsafeArtifactSavePath', 'Unsafe artifact save path: {0}', file.path));
            }
            const destination = path.resolve(folder, safeRelativePath);
            if (!destination.startsWith(path.resolve(folder) + path.sep) && destination !== path.resolve(folder)) {
                throw new Error(nls.localize('theia/arena/artifactPathEscapesDestination', 'Artifact save path escapes destination: {0}', file.path));
            }
            await fs.mkdir(path.dirname(destination), { recursive: true });
            await fs.writeFile(destination, file.content, 'utf8');
            if (firstFile === folder) {
                firstFile = destination;
            }
        }
        return FileUri.create(firstFile).toString();
    }

    async savePatch(workspaceRootUris: string[], disputeId: string, label: string, gitDiff: string): Promise<string> {
        if (!gitDiff.trim()) {
            throw new Error(nls.localize('theia/arena/noPatchToSave', 'Selected winner does not have a patch/diff to save.'));
        }
        const root = this.getPrimaryRoot(workspaceRootUris);
        const folder = path.join(root, '.arena', 'patches');
        await fs.mkdir(folder, { recursive: true });
        const filePath = path.join(folder, `${this.sanitizeName(disputeId)}-${this.sanitizeName(label)}.patch`);
        await fs.writeFile(filePath, gitDiff, 'utf8');
        return FileUri.create(filePath).toString();
    }

    protected async scanMarkdown(root: string, directory: string, agents: ArenaAgentSummary[], depth: number): Promise<void> {
        if (depth > MAX_SCAN_DEPTH || agents.length >= MAX_AGENT_FILES) {
            return;
        }
        let entries: { name: string; isDirectory(): boolean; isFile(): boolean }[];
        try {
            entries = await fs.readdir(directory, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            if (agents.length >= MAX_AGENT_FILES) {
                return;
            }
            const fullPath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                if (!IGNORED_DIRECTORIES.has(entry.name)) {
                    await this.scanMarkdown(root, fullPath, agents, depth + 1);
                }
                continue;
            }
            if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) {
                continue;
            }
            const stat = await fs.stat(fullPath);
            const relativePath = path.relative(root, fullPath).replace(/\\/g, '/');
            agents.push({
                id: FileUri.create(fullPath).toString(),
                name: path.basename(entry.name, '.md'),
                uri: FileUri.create(fullPath).toString(),
                relativePath,
                source: relativePath.startsWith('.arena/') ? 'arena' : 'workspace',
                sizeBytes: stat.size,
                updatedAt: stat.mtime.toISOString()
            });
        }
    }

    protected dedupeAgents(agents: ArenaAgentSummary[]): ArenaAgentSummary[] {
        const byUri = new Map<string, ArenaAgentSummary>();
        for (const agent of agents) {
            byUri.set(agent.uri, agent);
        }
        return Array.from(byUri.values());
    }

    protected getPrimaryRoot(workspaceRootUris: string[]): string {
        const roots = this.toWorkspaceRoots(workspaceRootUris);
        if (!roots.length) {
            throw new Error(nls.localize('theia/arena/openWorkspaceRequired', 'Arena needs an open workspace to save files.'));
        }
        return roots[0];
    }

    protected toWorkspaceRoots(workspaceRootUris: string[]): string[] {
        return workspaceRootUris.map(uri => path.resolve(this.uriToPath(uri)));
    }

    protected uriToPath(uri: string): string {
        return path.resolve(FileUri.fsPath(uri));
    }

    protected assertInsideWorkspace(filePath: string, roots: string[]): void {
        const resolved = path.resolve(filePath);
        if (!roots.some(root => resolved === root || resolved.startsWith(root + path.sep))) {
            throw new Error(nls.localize('theia/arena/fileOutsideWorkspace', 'File is outside the current workspace: {0}', filePath));
        }
    }

    protected sanitizeName(name: string): string {
        return name.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'agent';
    }
}
