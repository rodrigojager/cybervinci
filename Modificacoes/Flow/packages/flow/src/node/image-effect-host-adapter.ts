import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { injectable } from '@theia/core/shared/inversify';
import { decideFlowApprovalPolicy } from '../common';
import { resolveFlowRunDirectory } from './flow-path-policy';

export const ImageEffectHostAdapter = Symbol('ImageEffectHostAdapter');

export interface ImageEffectRequest {
    type: string;
    prompt?: string;
    path?: string;
    artifactPath?: string;
    mimeType?: string;
    provider?: string;
    summary?: string;
    approvalPolicy?: string;
}

export interface AppliedImageEffect {
    applied: boolean;
    status: 'proposed' | 'applied' | 'blocked' | 'failed';
    provider: string;
    prompt: string;
    artifactPath: string;
    absolutePath: string;
    uri?: string;
    mimeType: string;
    bytes?: number;
    stdout?: string;
    stderr?: string;
    reason?: string;
    approvalPolicy?: string;
    requiresApproval?: boolean;
}

export interface ImageEffectHostAdapter {
    apply(workspaceRootUri: string | undefined, runId: string, workloadId: string, effect: ImageEffectRequest, approved?: boolean): Promise<AppliedImageEffect>;
}

@injectable()
export class LocalImageEffectHostAdapter implements ImageEffectHostAdapter {

    async apply(workspaceRootUri: string | undefined, runId: string, workloadId: string, effect: ImageEffectRequest, approved = false): Promise<AppliedImageEffect> {
        const command = imageProviderCommand(effect.provider);
        const prompt = normalizePrompt(effect.prompt || effect.summary);
        const artifactPath = normalizeArtifactPath(effect.artifactPath || effect.path || `images/${workloadId}.png`);
        const mimeType = normalizeMimeType(effect.mimeType, artifactPath);
        const absolutePath = resolveArtifactFile(workspaceRootUri, runId, artifactPath);
        const provider = effect.provider || 'command';
        const policy = decideFlowApprovalPolicy({
            action: 'image_effect',
            requestedPolicy: effect.approvalPolicy,
            approved
        });
        if (!command) {
            return {
                applied: false,
                status: 'blocked',
                provider,
                prompt,
                artifactPath,
                absolutePath,
                mimeType,
                reason: 'Image provider is not configured. Set FLOW_IMAGE_PROVIDER_COMMAND to enable image effects.',
                approvalPolicy: policy.policy,
                requiresApproval: policy.requiresApproval
            };
        }
        if (policy.blocked || !policy.approved) {
            return {
                applied: false,
                status: policy.status === 'blocked' ? 'blocked' : 'proposed',
                provider,
                prompt,
                artifactPath,
                absolutePath,
                mimeType,
                reason: policy.message,
                approvalPolicy: policy.policy,
                requiresApproval: policy.requiresApproval
            };
        }

        const result = await invokeImageProvider(command, { prompt, artifactPath, mimeType, runId, workloadId });
        if (result.status !== 'applied' || !result.content.length) {
            return {
                applied: false,
                status: result.status,
                provider,
                prompt,
                artifactPath,
                absolutePath,
                mimeType,
                stdout: result.stdout,
                stderr: result.stderr,
                reason: result.stderr || 'Image provider did not return image content.',
                approvalPolicy: policy.policy,
                requiresApproval: policy.requiresApproval
            };
        }
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.writeFile(absolutePath, result.content);
        return {
            applied: true,
            status: 'applied',
            provider,
            prompt,
            artifactPath,
            absolutePath,
            uri: FileUri.create(absolutePath).toString(),
            mimeType,
            bytes: result.content.length,
            stdout: result.stdout,
            stderr: result.stderr,
            approvalPolicy: policy.policy,
            requiresApproval: policy.requiresApproval
        };
    }
}

function imageProviderCommand(provider?: string): string | undefined {
    const providerKey = provider ? provider.trim().replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase() : '';
    const providerSpecific = providerKey ? process.env[`FLOW_IMAGE_PROVIDER_${providerKey}_COMMAND`] : undefined;
    return providerSpecific || process.env.FLOW_IMAGE_PROVIDER_COMMAND || undefined;
}

function resolveArtifactFile(workspaceRootUri: string | undefined, runId: string, artifactPath: string): string {
    if (!workspaceRootUri) {
        throw new Error('workspaceRootUri is required to apply image effects.');
    }
    const workspaceRoot = path.resolve(FileUri.fsPath(workspaceRootUri));
    const runArtifactRoot = path.resolve(resolveFlowRunDirectory(workspaceRoot, runId), 'artifacts');
    const absolutePath = path.resolve(runArtifactRoot, artifactPath);
    const relative = path.relative(runArtifactRoot, absolutePath);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error(`Image artifact path escapes the run artifact directory: ${artifactPath}`);
    }
    return absolutePath;
}

function normalizePrompt(value: string | undefined): string {
    const prompt = value?.trim();
    if (!prompt) {
        throw new Error('Image effect prompt is required.');
    }
    return prompt;
}

function normalizeArtifactPath(value: string): string {
    const normalized = value.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/').trim();
    if (!normalized || normalized.includes('\0') || path.isAbsolute(normalized)) {
        throw new Error(`Image artifact path must be relative: ${value}`);
    }
    return normalized.split('/').filter(Boolean).map(segment => segment.replace(/[^a-zA-Z0-9._-]/g, '_')).join('/');
}

function normalizeMimeType(value: string | undefined, artifactPath: string): string {
    const trimmed = value?.trim();
    if (trimmed) {
        return trimmed;
    }
    const ext = path.extname(artifactPath).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') {
        return 'image/jpeg';
    }
    if (ext === '.webp') {
        return 'image/webp';
    }
    return 'image/png';
}

function invokeImageProvider(
    command: string,
    payload: Record<string, string>
): Promise<{ status: 'applied' | 'failed'; content: Buffer; stdout: string; stderr: string }> {
    return new Promise(resolve => {
        const child = spawn(command, [], { shell: true, windowsHide: true });
        let stdout = '';
        let stderr = '';
        child.stdout?.on('data', chunk => stdout += String(chunk));
        child.stderr?.on('data', chunk => stderr += String(chunk));
        child.on('error', error => resolve({ status: 'failed', content: Buffer.alloc(0), stdout, stderr: error.message }));
        child.on('close', code => {
            if (code !== 0) {
                resolve({ status: 'failed', content: Buffer.alloc(0), stdout, stderr });
                return;
            }
            decodeProviderOutput(stdout).then(content => {
                resolve({ status: 'applied', content, stdout: redact(stdout), stderr: redact(stderr) });
            }).catch(error => {
                resolve({ status: 'failed', content: Buffer.alloc(0), stdout: redact(stdout), stderr: error.message });
            });
        });
        child.stdin.end(JSON.stringify(payload));
    });
}

async function decodeProviderOutput(stdout: string): Promise<Buffer> {
    const raw = stdout.trim();
    if (!raw) {
        return Buffer.alloc(0);
    }
    try {
        const parsed = JSON.parse(raw) as { base64?: string; dataUri?: string; path?: string };
        const encoded = parsed.base64 || parsed.dataUri?.replace(/^data:[^;]+;base64,/, '');
        if (encoded) {
            return Buffer.from(encoded, 'base64');
        }
        if (parsed.path) {
            return fs.readFile(parsed.path);
        }
    } catch {
        // fall through to raw base64
    }
    return Buffer.from(raw.replace(/^data:[^;]+;base64,/, ''), 'base64');
}

function redact(value: string): string {
    return value.replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*([^\s]+)/gi, '$1=[REDACTED]').slice(0, 12000);
}
