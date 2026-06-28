import URI from '@theia/core/lib/common/uri';
import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import { inject, injectable } from '@theia/core/shared/inversify';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { EditorDocument } from '../types/editor-document';
import { SaveResult, VisualSaveDecision } from '../types/save-result';
import { RazorProtector } from '../razor/razor-protector';
import { stableHash } from '../razor/razor-source-map';
import { RazorVisualBackupService } from './backup-service';
import { RazorVisualDiffService } from './diff-service';
import { DiffBeforeSaveDialog } from '../components/DiffBeforeSaveDialog';
import { CssVariableSaveChange } from '../types/css-variable';

export interface RazorVisualSaveRequest {
    document: EditorDocument;
    html: string;
    css: string;
    cssVariableChanges?: CssVariableSaveChange[];
    targetUri?: URI;
    requireDiff: boolean;
}

@injectable()
export class RazorVisualFileSaveService {
    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(RazorProtector)
    protected readonly razorProtector: RazorProtector;

    @inject(RazorVisualBackupService)
    protected readonly backupService: RazorVisualBackupService;

    @inject(RazorVisualDiffService)
    protected readonly diffService: RazorVisualDiffService;

    async save(request: RazorVisualSaveRequest): Promise<SaveResult> {
        const targetUri = request.targetUri ?? request.document.uri;
        const currentFile = await this.fileService.read(request.document.uri);
        const currentContent = currentFile.value.toString();
        if (!request.targetUri && stableHash(currentContent) !== request.document.originalHash) {
            throw new Error('The file changed on disk since the visual editor opened it. Reload before saving.');
        }

        const exportedHtml = this.composeHtml(request.html, request.css);
        const restored = request.document.sourceMap
            ? this.razorProtector.restore(exportedHtml, request.document.sourceMap)
            : { html: exportedHtml, issues: [] };
        const blockingIssues = restored.issues.filter(issue => issue.severity === 'error');
        if (blockingIssues.length > 0) {
            throw new Error(blockingIssues.map(issue => issue.message).join('\n'));
        }

        const finalContent = restored.html;
        let disableFutureDiffPrompt = false;
        if (request.document.isRazor && request.requireDiff) {
            const decision = await this.confirmRazorDiff(request.document.originalContent, finalContent);
            if (decision === 'cancel') {
                return { saved: false, warnings: [] };
            }
            disableFutureDiffPrompt = decision === 'saveWithoutAskingAgain';
        }

        const cssSaveResult = await this.saveCssVariableChanges(request.cssVariableChanges ?? []);
        const backupUri = await this.backupService.createSiblingBackup(targetUri, currentContent, this.fileService);
        await this.fileService.writeFile(targetUri, BinaryBuffer.fromString(finalContent));
        const warnings = [
            ...restored.issues.filter(issue => issue.severity === 'warning').map(issue => issue.message),
            ...cssSaveResult.warnings
        ];
        return {
            saved: true,
            savedUri: targetUri.toString(),
            backupUri: backupUri.toString(),
            warnings,
            updatedAssetUris: cssSaveResult.updatedUris,
            disableFutureDiffPrompt
        };
    }

    createDiff(original: string, modified: string): string {
        return this.diffService.createUnifiedDiff(original, modified);
    }

    protected async confirmRazorDiff(original: string, modified: string): Promise<VisualSaveDecision> {
        const dialog = new DiffBeforeSaveDialog({
            title: 'Review Razor save diff',
            original,
            modified,
            diff: this.diffService.createUnifiedDiff(original, modified)
        });
        return (await dialog.open()) ?? 'cancel';
    }

    protected composeHtml(html: string, css: string): string {
        const trimmedCss = css.trim();
        if (!trimmedCss) {
            return html;
        }
        return `${html}\n<style data-cv-grapes-css="true">\n${trimmedCss}\n</style>\n`;
    }

    protected async saveCssVariableChanges(changes: CssVariableSaveChange[]): Promise<{ warnings: string[]; updatedUris: string[] }> {
        const warnings: string[] = [];
        const updatedUris: string[] = [];
        const bySource = new Map<string, CssVariableSaveChange[]>();
        for (const change of changes) {
            if (!change.sourceUri) {
                warnings.push(`CSS variable ${change.name} could not be saved to a source stylesheet.`);
                continue;
            }
            bySource.set(change.sourceUri, [...(bySource.get(change.sourceUri) ?? []), change]);
        }

        for (const [sourceUri, sourceChanges] of bySource) {
            const uri = new URI(sourceUri);
            const file = await this.fileService.read(uri);
            const originalCss = file.value.toString();
            let modifiedCss = originalCss;
            for (const change of sourceChanges) {
                const nextCss = replaceCssVariable(modifiedCss, change.name, change.value);
                if (nextCss === modifiedCss) {
                    warnings.push(`CSS variable ${change.name} was not found in ${change.source}.`);
                }
                modifiedCss = nextCss;
            }
            if (modifiedCss !== originalCss) {
                const backupUri = await this.backupService.createSiblingBackup(uri, originalCss, this.fileService);
                await this.fileService.writeFile(uri, BinaryBuffer.fromString(modifiedCss));
                updatedUris.push(uri.toString());
                warnings.push(`Updated CSS variables in ${uri.path.base}. Backup: ${backupUri.toString()}`);
            }
        }

        return { warnings, updatedUris };
    }
}

function replaceCssVariable(css: string, name: string, value: string): string {
    const pattern = new RegExp(`(${escapeRegExp(name)}\\s*:\\s*)([^;{}]+)(;)`, 'g');
    return css.replace(pattern, (_match, prefix: string, _oldValue: string, suffix: string) => `${prefix}${value}${suffix}`);
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
