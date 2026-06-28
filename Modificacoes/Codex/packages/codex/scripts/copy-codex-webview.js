// Copyright (C) 2026 CyberVinci contributors.
// Copies official Codex webview assets into package resources.

const fs = require('fs');
const os = require('os');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');
const target = path.join(__dirname, '../resources/webview');

const source = resolveWebviewSource();

if (!source) {
    if (fs.existsSync(target)) {
        console.warn(`Codex webview source missing. Keeping bundled assets at ${target}.`);
        process.exit(0);
    }
    console.error('Codex webview source missing and no bundled assets found.');
    console.error('Install the OpenAI Codex VS Code extension or set CODEX_VSCODE_EXTENSION_WEBVIEW.');
    process.exit(1);
}

if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
}
copyRecursive(source, target);
applyCompatibilityPatches(target);
console.log(`Copied Codex webview assets from ${source} to ${target}`);

function resolveWebviewSource() {
    const envSource = process.env.CODEX_VSCODE_EXTENSION_WEBVIEW;
    const candidates = [
        envSource,
        ...discoverInstalledWebviews(path.join(os.homedir(), '.vscode', 'extensions')),
        ...discoverInstalledWebviews(path.join(os.homedir(), '.cursor', 'extensions')),
        path.join(repoRoot, 'plugins.disabled', 'OpenAI.chatgpt', 'webview'),
        path.join(repoRoot, 'plugins.disabled', 'OpenAI.chatgpt', 'extension', 'webview')
    ];
    for (const candidate of candidates) {
        const webviewPath = normalizeWebviewPath(candidate);
        if (webviewPath) {
            return webviewPath;
        }
    }
    return undefined;
}

function discoverInstalledWebviews(extensionsRoot) {
    if (!fs.existsSync(extensionsRoot)) {
        return [];
    }
    return fs.readdirSync(extensionsRoot, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && /^openai\.chatgpt-/i.test(entry.name))
        .map(entry => ({
            name: entry.name,
            path: path.join(extensionsRoot, entry.name, 'webview'),
            version: extractVersion(entry.name),
            mtimeMs: safeStat(path.join(extensionsRoot, entry.name)).mtimeMs
        }))
        .filter(candidate => hasIndexHtml(candidate.path))
        .sort((left, right) => compareVersions(right.version, left.version) || right.mtimeMs - left.mtimeMs)
        .map(candidate => candidate.path);
}

function normalizeWebviewPath(candidate) {
    if (!candidate) {
        return undefined;
    }
    const resolved = path.resolve(candidate);
    const candidates = [
        resolved,
        path.join(resolved, 'webview'),
        path.join(resolved, 'extension', 'webview')
    ];
    return candidates.find(hasIndexHtml);
}

function hasIndexHtml(candidate) {
    return typeof candidate === 'string' && fs.existsSync(path.join(candidate, 'index.html'));
}

function extractVersion(extensionDirectoryName) {
    const match = /^openai\.chatgpt-(\d+(?:\.\d+)*)/i.exec(extensionDirectoryName);
    return match ? match[1] : '0';
}

function compareVersions(left, right) {
    const leftParts = left.split('.').map(Number);
    const rightParts = right.split('.').map(Number);
    const length = Math.max(leftParts.length, rightParts.length);
    for (let index = 0; index < length; index += 1) {
        const delta = (leftParts[index] || 0) - (rightParts[index] || 0);
        if (delta !== 0) {
            return delta;
        }
    }
    return 0;
}

function safeStat(candidate) {
    try {
        return fs.statSync(candidate);
    } catch {
        return { mtimeMs: 0 };
    }
}

function copyRecursive(from, to) {
    fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
        const srcPath = path.join(from, entry.name);
        const destPath = path.join(to, entry.name);
        if (entry.isDirectory()) {
            copyRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function applyCompatibilityPatches(webviewRoot) {
    const assetsRoot = path.join(webviewRoot, 'assets');
    if (!fs.existsSync(assetsRoot)) {
        return;
    }
    const remoteVisibilityFile = fs.readdirSync(assetsRoot)
        .find(name => /^remote-connection-visibility-.*\.js$/.test(name));
    if (!remoteVisibilityFile) {
        return;
    }
    const filePath = path.join(assetsRoot, remoteVisibilityFile);
    const sourceText = fs.readFileSync(filePath, 'utf8');
    const patched = sourceText
        .replace('n?.config[`features.remote_connections`]', 'n?.config?.[`features.remote_connections`]')
        .replace('n?.config.features', 'n?.config?.features');
    if (patched !== sourceText) {
        fs.writeFileSync(filePath, patched);
    }
}
