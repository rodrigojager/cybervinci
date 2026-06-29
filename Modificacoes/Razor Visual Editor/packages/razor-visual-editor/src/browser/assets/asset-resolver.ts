import URI from '@theia/core/lib/common/uri';
import { inject, injectable } from '@theia/core/shared/inversify';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { AssetReference, AssetResolutionResult } from '../types/asset-reference';
import { RazorMvcBundleConfigParser } from './bundle-config-parser';
import { RazorVisualCssLoader } from './css-loader';
import { RazorVisualPathResolver } from './path-resolver';

@injectable()
export class RazorVisualAssetResolver {
    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(RazorVisualPathResolver)
    protected readonly pathResolver: RazorVisualPathResolver;

    @inject(RazorVisualCssLoader)
    protected readonly cssLoader: RazorVisualCssLoader;

    @inject(RazorMvcBundleConfigParser)
    protected readonly bundleParser: RazorMvcBundleConfigParser;

    async resolve(content: string, sourceUri: URI): Promise<AssetResolutionResult> {
        const assets: AssetReference[] = [];
        const css: string[] = [];
        const warnings: string[] = [];
        const workspaceRoot = this.pathResolver.workspaceRootFor(sourceUri, this.workspaceService);
        const bundles = await this.bundleParser.parse(workspaceRoot, this.fileService);

        for (const href of this.extractCssLinks(content)) {
            const asset = await this.resolveCssAsset(href, sourceUri, 'link');
            assets.push(asset);
            if (asset.content) {
                css.push(asset.content);
            }
            if (asset.warning) {
                warnings.push(asset.warning);
            }
        }

        for (const bundlePath of this.extractStyleBundles(content)) {
            const includes = bundles.styles.get(bundlePath);
            if (!includes) {
                const warning = `CSS bundle not found: ${bundlePath}`;
                assets.push({ kind: 'bundle', requestedPath: bundlePath, source: 'bundle', warning });
                warnings.push(warning);
                continue;
            }
            for (const include of includes) {
                const asset = await this.resolveCssAsset(include, sourceUri, 'bundle');
                assets.push(asset);
                if (asset.content) {
                    css.push(asset.content);
                }
                if (asset.warning) {
                    warnings.push(asset.warning);
                }
            }
        }

        for (const script of this.extractScriptLinks(content)) {
            const warning = `JavaScript ignored in editor preview: ${script}`;
            assets.push({ kind: 'script', requestedPath: script, source: 'script', warning });
            warnings.push(warning);
        }

        for (const script of this.extractScriptBundles(content)) {
            const warning = `JavaScript bundle ignored in editor preview: ${script}`;
            assets.push({ kind: 'script', requestedPath: script, source: 'bundle', warning });
            warnings.push(warning);
        }

        return { assets, css, warnings };
    }

    protected async resolveCssAsset(requestedPath: string, sourceUri: URI, source: 'link' | 'bundle'): Promise<AssetReference> {
        const resolvedUri = await this.pathResolver.resolveWorkspaceAsset(requestedPath, sourceUri, this.workspaceService, this.fileService);
        if (!resolvedUri) {
            return {
                kind: source === 'bundle' ? 'bundle' : 'css',
                requestedPath,
                source,
                warning: `CSS not found: ${requestedPath}`
            };
        }
        return {
            kind: source === 'bundle' ? 'bundle' : 'css',
            requestedPath,
            resolvedUri,
            content: await this.cssLoader.readCss(resolvedUri, this.fileService),
            source
        };
    }

    protected extractCssLinks(content: string): string[] {
        const links: string[] = [];
        for (const match of content.matchAll(/<link\b[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*>/gi)) {
            const href = this.extractCssHref(match[0]);
            if (href) {
                links.push(href);
            }
        }
        return links;
    }

    protected extractCssHref(linkTag: string): string | undefined {
        const razorPath = /@(?:Url\.)?(?:Content|Href)\s*\(\s*["']([^"']+)["']\s*\)/i.exec(linkTag)?.[1];
        if (razorPath) {
            return razorPath;
        }
        return /\bhref\s*=\s*["']([^"']+)["']/i.exec(linkTag)?.[1];
    }

    protected extractScriptLinks(content: string): string[] {
        return Array.from(content.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)).map(match => match[1]);
    }

    protected extractStyleBundles(content: string): string[] {
        return Array.from(content.matchAll(/@Styles\.Render\s*\(\s*["']([^"']+)["']\s*\)/g)).map(match => match[1]);
    }

    protected extractScriptBundles(content: string): string[] {
        return Array.from(content.matchAll(/@Scripts\.Render\s*\(\s*["']([^"']+)["']\s*\)/g)).map(match => match[1]);
    }
}
