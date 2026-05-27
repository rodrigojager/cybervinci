import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { nls } from '@theia/core/lib/common';
import { injectable } from '@theia/core/shared/inversify';
import {
    GeneratedFile,
    ArenaCandidateLabel,
    ArenaOutputType
} from '../common';

export interface ArenaSandbox {
    root: string;
    candidates: Partial<Record<ArenaCandidateLabel, string>>;
}

@injectable()
export class WorkspaceSandboxService {

    async createSandbox(disputeId: string, labels: ArenaCandidateLabel[]): Promise<ArenaSandbox> {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), `arena-${disputeId}-`));
        const candidates: Partial<Record<ArenaCandidateLabel, string>> = {};
        for (const label of labels) {
            const candidateRoot = path.join(root, label);
            candidates[label] = candidateRoot;
            await fs.mkdir(path.join(candidateRoot, '.playground'), { recursive: true });
            await fs.mkdir(path.join(candidateRoot, 'output'), { recursive: true });
            await fs.mkdir(path.join(candidateRoot, 'work'), { recursive: true });
            await fs.mkdir(path.join(candidateRoot, 'logs'), { recursive: true });
        }
        return { root, candidates };
    }

    async writeCandidateSnapshot(candidateRoot: string, agentMarkdown: string, task: string, outputType: ArenaOutputType): Promise<void> {
        await fs.writeFile(path.join(candidateRoot, '.playground', 'agent.md'), agentMarkdown, 'utf8');
        await fs.writeFile(path.join(candidateRoot, '.playground', 'task.md'), task, 'utf8');
        await fs.writeFile(path.join(candidateRoot, '.playground', 'rules.md'), this.createRules(), 'utf8');
        await fs.writeFile(path.join(candidateRoot, '.playground', 'expected-output.md'), this.createOutputContract(outputType), 'utf8');
    }

    async persistArtifactFiles(candidateRoot: string, files: GeneratedFile[]): Promise<void> {
        for (const file of files) {
            this.validateArtifactPath(file.path);
            const destination = path.resolve(candidateRoot, file.path);
            const outputRoot = path.resolve(candidateRoot, 'output');
            if (!destination.startsWith(outputRoot + path.sep) && destination !== outputRoot) {
                throw new Error(nls.localize('theia/arena/artifactPathMustStayInOutput', 'Artifact path must stay in output/: {0}', file.path));
            }
            await fs.mkdir(path.dirname(destination), { recursive: true });
            await fs.writeFile(destination, file.content, 'utf8');
        }
    }

    validateArtifactPath(relativePath: string): void {
        const normalized = relativePath.replace(/\\/g, '/');
        if (!normalized || normalized.startsWith('/') || normalized.includes('://') || normalized.includes('../') || normalized.includes('..\\')) {
            throw new Error(nls.localize('theia/arena/unsafeArtifactPath', 'Unsafe artifact path: {0}', relativePath));
        }
        if (/^[a-zA-Z]:/.test(relativePath) || relativePath.startsWith('\\\\') || normalized.startsWith('/etc/')) {
            throw new Error(nls.localize('theia/arena/unsafeArtifactPath', 'Unsafe artifact path: {0}', relativePath));
        }
        if (!normalized.startsWith('output/')) {
            throw new Error(nls.localize('theia/arena/artifactPathRelativeToOutput', 'Artifact path must be relative to output/: {0}', relativePath));
        }
    }

    async cleanup(root: string): Promise<void> {
        const resolvedRoot = path.resolve(root);
        const tempRoot = path.resolve(os.tmpdir());
        if (!resolvedRoot.startsWith(tempRoot + path.sep)) {
            throw new Error(nls.localize('theia/arena/refuseSandboxCleanupOutsideTemp', 'Refusing to remove Arena sandbox outside temp root: {0}', root));
        }
        await fs.rm(resolvedRoot, { recursive: true, force: true });
    }

    protected createRules(): string {
        return `SYSTEM / PLAYGROUND RULES:
Você está executando dentro da Arena.
Esta é uma disputa A/B/C de prompts.
Não mencione a disputa no resultado final.
Siga o contrato de saída.
Trabalhe apenas no workspace temporário.
Coloque o resultado final na pasta output/, quando estiver usando runner de filesystem.
Não use caminhos absolutos.
Não tente acessar arquivos fora do workspace.
Se não conseguir cumprir, retorne erro claro.`;
    }

    protected createOutputContract(outputType: ArenaOutputType): string {
        return `OUTPUT TYPE: ${outputType}

For filesystem runners, write final artifacts under output/ only.
For API runners, return normalized JSON with artifactType, files, and rawNotes when possible.`;
    }
}
