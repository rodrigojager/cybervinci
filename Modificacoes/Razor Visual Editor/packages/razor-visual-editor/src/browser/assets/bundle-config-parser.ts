import URI from '@theia/core/lib/common/uri';
import { injectable } from '@theia/core/shared/inversify';
import { FileService } from '@theia/filesystem/lib/browser/file-service';

export interface RazorMvcBundleMap {
    styles: Map<string, string[]>;
    scripts: Map<string, string[]>;
}

@injectable()
export class RazorMvcBundleConfigParser {
    async parse(workspaceRoot: URI | undefined, fileService: FileService): Promise<RazorMvcBundleMap> {
        const empty = { styles: new Map<string, string[]>(), scripts: new Map<string, string[]>() };
        if (!workspaceRoot) {
            return empty;
        }
        const bundleConfig = workspaceRoot.resolve('App_Start/BundleConfig.cs');
        if (!await fileService.exists(bundleConfig)) {
            return empty;
        }
        const content = (await fileService.read(bundleConfig)).value.toString();
        return {
            styles: this.parseBundles(content, 'StyleBundle'),
            scripts: this.parseBundles(content, 'ScriptBundle')
        };
    }

    protected parseBundles(content: string, bundleType: 'StyleBundle' | 'ScriptBundle'): Map<string, string[]> {
        const result = new Map<string, string[]>();
        const pattern = new RegExp(`new\\s+${bundleType}\\s*\\(\\s*"([^"]+)"\\s*\\)\\s*\\.Include\\s*\\(([\\s\\S]*?)\\)`, 'g');
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(content)) !== null) {
            const bundlePath = match[1];
            const includes = Array.from(match[2].matchAll(/"([^"]+)"/g)).map(include => include[1]);
            if (bundlePath && includes.length > 0) {
                result.set(bundlePath, includes);
            }
        }
        return result;
    }
}
