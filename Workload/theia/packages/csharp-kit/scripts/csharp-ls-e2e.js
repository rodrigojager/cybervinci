#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const packageRoot = path.resolve(__dirname, '..');
const adapterModulePath = path.join(packageRoot, 'lib', 'node', 'csharp-language-server-adapter.js');

if (!fs.existsSync(adapterModulePath)) {
    console.error(`Missing compiled adapter module at ${adapterModulePath}. Run npm run compile before this E2E check.`);
    process.exit(2);
}

const {
    resolveCSharpLanguageServerAdapterStatuses,
    probeCSharpLanguageServerAdapter
} = require(adapterModulePath);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-csharp-ls-e2e-'));
const keepTemp = process.env.CSHARP_KIT_KEEP_E2E_TEMP === '1';

function runDotnet(args, cwd = tempRoot) {
    execFileSync('dotnet', args, {
        cwd,
        stdio: 'inherit'
    });
}

async function main() {
    runDotnet(['new', 'tool-manifest']);
    runDotnet(['tool', 'install', 'csharp-ls']);
    runDotnet(['new', 'console', '--name', 'SampleApp', '--framework', 'net8.0']);

    const adapters = resolveCSharpLanguageServerAdapterStatuses(process.env, tempRoot);
    const adapter = adapters.find(candidate => candidate.language === 'csharp');
    if (!adapter || adapter.mode !== 'ready') {
        console.error('C# language server adapter was not ready.');
        console.error(JSON.stringify(adapter, undefined, 2));
        process.exitCode = 3;
        return;
    }

    const probe = await probeCSharpLanguageServerAdapter(adapter, tempRoot, 30000);
    const summary = {
        adapterId: adapter.id,
        adapterSource: adapter.source,
        command: adapter.command,
        args: adapter.args,
        ok: probe.ok,
        mode: probe.mode,
        serverName: probe.serverName,
        serverVersion: probe.serverVersion,
        capabilityCount: probe.capabilityKeys.length,
        capabilityKeys: probe.capabilityKeys,
        detail: probe.detail,
        durationMs: probe.durationMs
    };
    console.log(JSON.stringify(summary, undefined, 2));
    if (!probe.ok) {
        process.exitCode = 4;
    }
}

main()
    .catch(error => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => {
        if (keepTemp) {
            console.log(`Kept E2E workspace: ${tempRoot}`);
            return;
        }
        fs.rmSync(tempRoot, { recursive: true, force: true });
    });
