import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { injectable } from '@theia/core/shared/inversify';
import { decideFlowApprovalPolicy } from '../common';
import { isFlowInternalPath, isDeniedFlowPath, isOutsideFlowAllowlist, resolveFlowWorkspacePath } from './flow-path-policy';

export const FileEffectHostAdapter = Symbol('FileEffectHostAdapter');

export type FileEffectType = 'file.created' | 'file.edited' | 'file.deleted';

export interface FileEffectRequest {
    type: FileEffectType | string;
    path: string;
    content?: string;
    hashBefore?: string;
    approvalPolicy?: string;
    allowedPaths?: string[];
    deniedPaths?: string[];
}

export interface PreparedFileEffect {
    type: FileEffectType;
    workspaceRoot: string;
    relativePath: string;
    absolutePath: string;
    existedBefore: boolean;
    contentBefore: string;
    contentAfter: string;
    hashBefore: string;
    hashAfter: string;
    patch: string;
    approvalPolicy: string;
    requiresApproval: boolean;
    blocked: boolean;
    riskReasons: string[];
    reason?: string;
}

export interface AppliedFileEffect extends PreparedFileEffect {
    applied: boolean;
}

export interface FileEffectHostAdapter {
    prepare(workspaceRootUri: string | undefined, effect: FileEffectRequest): Promise<PreparedFileEffect>;
    apply(workspaceRootUri: string | undefined, effect: FileEffectRequest, approved?: boolean): Promise<AppliedFileEffect>;
}

@injectable()
export class LocalFileEffectHostAdapter implements FileEffectHostAdapter {

    async prepare(workspaceRootUri: string | undefined, effect: FileEffectRequest): Promise<PreparedFileEffect> {
        const type = normalizeFileEffectType(effect.type);
        const workspaceRoot = resolveWorkspaceRoot(workspaceRootUri);
        const resolved = resolveFlowWorkspacePath(workspaceRoot, effect.path);
        const current = await readExistingText(resolved.absolutePath);
        const contentBefore = current.content;
        const contentAfter = nextContent(type, effect, contentBefore);
        const hashBefore = sha256(contentBefore);
        const hashAfter = sha256(contentAfter);
        const hashConflict = Boolean(effect.hashBefore && effect.hashBefore !== hashBefore);
        const destructive = type === 'file.deleted' || (type === 'file.edited' && current.existed && contentAfter.length < contentBefore.length);
        const outsideAllowlist = isOutsideFlowAllowlist(resolved.relativePath, effect.allowedPaths);
        const deniedPath = isDeniedFlowPath(resolved.relativePath, effect.deniedPaths);
        const internalPath = isFlowInternalPath(resolved.relativePath);
        const symlinkBoundary = await findSymlinkBoundary(workspaceRoot, resolved.absolutePath);
        const riskReasons = [
            destructive ? 'destructive file effect' : undefined,
            outsideAllowlist ? `path outside allowlist: ${resolved.relativePath}` : undefined,
            hashConflict ? `hashBefore mismatch for ${resolved.relativePath}` : undefined
        ].filter((reason): reason is string => Boolean(reason));
        const policy = decideFlowApprovalPolicy({
            action: 'file_effect',
            requestedPolicy: effect.approvalPolicy,
            riskReasons,
            blockedReasons: [
                deniedPath ? `path denied by policy: ${resolved.relativePath}` : undefined,
                internalPath ? `path targets internal Theia/Flow storage: ${resolved.relativePath}` : undefined,
                symlinkBoundary ? `path crosses a symbolic link inside the workspace: ${symlinkBoundary}` : undefined
            ].filter((reason): reason is string => Boolean(reason))
        });

        return {
            type,
            workspaceRoot,
            relativePath: resolved.relativePath,
            absolutePath: resolved.absolutePath,
            existedBefore: current.existed,
            contentBefore,
            contentAfter,
            hashBefore,
            hashAfter,
            patch: unifiedDiff(resolved.relativePath, contentBefore, contentAfter),
            approvalPolicy: policy.policy,
            requiresApproval: policy.requiresApproval,
            blocked: policy.blocked,
            riskReasons,
            reason: policy.message
        };
    }

    async apply(workspaceRootUri: string | undefined, effect: FileEffectRequest, approved = false): Promise<AppliedFileEffect> {
        const prepared = await this.prepare(workspaceRootUri, effect);
        if (prepared.blocked) {
            return { ...prepared, applied: false };
        }
        if (prepared.requiresApproval && !approved) {
            return { ...prepared, applied: false, reason: `approval required by ${prepared.approvalPolicy}` };
        }
        if (prepared.type === 'file.deleted') {
            if (prepared.existedBefore) {
                await fs.rm(prepared.absolutePath);
            }
            return { ...prepared, applied: true };
        }
        await fs.mkdir(path.dirname(prepared.absolutePath), { recursive: true });
        await fs.writeFile(prepared.absolutePath, prepared.contentAfter, 'utf8');
        return { ...prepared, applied: true };
    }
}

function resolveWorkspaceRoot(workspaceRootUri: string | undefined): string {
    if (!workspaceRootUri) {
        throw new Error('workspaceRootUri is required to apply file effects.');
    }
    return path.resolve(FileUri.fsPath(workspaceRootUri));
}

async function readExistingText(filePath: string): Promise<{ existed: boolean; content: string }> {
    try {
        const stat = await fs.stat(filePath);
        if (!stat.isFile()) {
            throw new Error(`File effect target is not a file: ${filePath}`);
        }
        return { existed: true, content: await fs.readFile(filePath, 'utf8') };
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return { existed: false, content: '' };
        }
        throw error;
    }
}

async function findSymlinkBoundary(workspaceRoot: string, absolutePath: string): Promise<string | undefined> {
    const resolvedRoot = path.resolve(workspaceRoot);
    let current = path.resolve(absolutePath);
    const candidates: string[] = [];
    while (current.startsWith(resolvedRoot) && current !== resolvedRoot) {
        candidates.push(current);
        current = path.dirname(current);
    }
    for (const candidate of candidates.reverse()) {
        try {
            const stat = await fs.lstat(candidate);
            if (stat.isSymbolicLink()) {
                return path.relative(resolvedRoot, candidate).replace(/\\/g, '/');
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                continue;
            }
            throw error;
        }
    }
    return undefined;
}

function normalizeFileEffectType(type: string): FileEffectType {
    if (type === 'file.created' || type === 'file.edited' || type === 'file.deleted') {
        return type;
    }
    throw new Error(`Unsupported file effect type: ${type}`);
}

function nextContent(type: FileEffectType, effect: FileEffectRequest, contentBefore: string): string {
    if (type === 'file.deleted') {
        return '';
    }
    if (effect.content === undefined) {
        if (type === 'file.edited') {
            return contentBefore;
        }
        throw new Error(`${type} effect content is required.`);
    }
    return normalizeText(effect.content);
}

function sha256(content: string): string {
    return `sha256:${crypto.createHash('sha256').update(content, 'utf8').digest('hex')}`;
}

function unifiedDiff(relativePath: string, before: string, after: string): string {
    if (before === after) {
        return `--- a/${relativePath}\n+++ b/${relativePath}\n`;
    }
    const beforeLines = splitLines(before);
    const afterLines = splitLines(after);
    return [
        `--- a/${relativePath}`,
        `+++ b/${relativePath}`,
        `@@ -1,${beforeLines.length} +1,${afterLines.length} @@`,
        ...beforeLines.map(line => `-${line}`),
        ...afterLines.map(line => `+${line}`)
    ].join('\n') + '\n';
}

function splitLines(content: string): string[] {
    if (!content) {
        return [];
    }
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n$/, '').split('\n');
}

function normalizeText(content: string): string {
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
