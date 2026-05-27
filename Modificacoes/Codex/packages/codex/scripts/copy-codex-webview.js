// Copyright (C) 2026 CyberVinci contributors.
// Copies official Codex webview assets from plugins.disabled into package resources.

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');
const source = path.join(repoRoot, 'plugins.disabled/OpenAI.chatgpt/extension/webview');
const target = path.join(__dirname, '../resources/webview');

function copyRecursive(from, to) {
    if (!fs.existsSync(from)) {
        if (fs.existsSync(to)) {
            console.warn(`Codex webview source missing: ${from}. Keeping bundled assets at ${to}.`);
            return;
        }
        console.error(`Codex webview source missing and no bundled assets found: ${from}`);
        process.exit(1);
    }
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

if (fs.existsSync(source) && fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
}
copyRecursive(source, target);
console.log(`Copied Codex webview assets to ${target}`);
