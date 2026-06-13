#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const packageRoot = path.resolve(__dirname, '..');
const serviceModulePath = path.join(packageRoot, 'lib', 'node', 'csharp-kit-service.js');

if (!fs.existsSync(serviceModulePath)) {
    console.error(`Missing compiled service module at ${serviceModulePath}. Run npm run compile before this readiness check.`);
    process.exit(2);
}

try {
    require('@theia/core/shared/reflect-metadata');
} catch (_error) {
    try {
        require('reflect-metadata');
    } catch (_fallbackError) {
        // The direct service import may still work depending on the Theia bundle.
    }
}

const { CSharpKitServiceImpl } = require(serviceModulePath);

function usage() {
    return [
        'Usage: node ./scripts/runtime-readiness.js [--workspace <path>] [--require-full] [--require-all-adapters] [--require-roslyn] [--probe-language-servers]',
        '',
        'Default mode prints the C# Kit readiness summary and exits 0 when inspection succeeds.',
        '--require-full fails unless the C# runtime readiness capability is ready for the inspected workspace.',
        '--require-all-adapters additionally requires CoreCLR debug, C# LSP and Razor LSP adapters to be ready.',
        '--require-roslyn additionally requires the Roslyn semantic sidecar to be ready.',
        '--probe-language-servers runs LSP initialize probes and fails unless ready C#/Razor adapters initialize successfully.'
    ].join('\n');
}

function parseArgs(argv) {
    const result = {
        workspacePath: process.cwd(),
        requireFull: false,
        requireAllAdapters: false,
        requireRoslyn: false,
        probeLanguageServers: false
    };
    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];
        switch (arg) {
            case '--workspace':
            case '-w': {
                const value = argv[++index];
                if (!value) {
                    throw new Error(`${arg} requires a path.`);
                }
                result.workspacePath = value;
                break;
            }
            case '--require-full':
                result.requireFull = true;
                break;
            case '--require-all-adapters':
                result.requireAllAdapters = true;
                break;
            case '--require-roslyn':
                result.requireRoslyn = true;
                break;
            case '--probe-language-servers':
                result.probeLanguageServers = true;
                break;
            case '--help':
            case '-h':
                console.log(usage());
                process.exit(0);
                break;
            default:
                throw new Error(`Unknown argument: ${arg}`);
        }
    }
    return result;
}

function capability(inspection, id) {
    return inspection.capabilities.find(candidate => candidate.id === id);
}

function languageServer(inspection, language) {
    return inspection.languageServers.find(candidate => candidate.language === language);
}

function adapterSummary(adapter) {
    return {
        id: adapter.id,
        label: adapter.label,
        language: adapter.language,
        mode: adapter.mode,
        source: adapter.source,
        command: adapter.command,
        args: adapter.args,
        detail: adapter.detail
    };
}

function collectMissing(inspection, options, languageServerProbes) {
    const missing = [];
    const runtimeReadiness = capability(inspection, 'csharp-runtime-readiness');
    const csharpLsp = languageServer(inspection, 'csharp');
    const razorLsp = languageServer(inspection, 'razor');

    if (!inspection.dotnet.available) {
        missing.push('dotnet SDK');
    }
    if (options.requireFull && runtimeReadiness?.state !== 'ready') {
        missing.push(`runtime readiness (${runtimeReadiness?.state ?? 'missing'})`);
    }
    if (options.requireAllAdapters) {
        if (inspection.debugAdapter.mode !== 'ready') {
            missing.push('CoreCLR debug adapter');
        }
        if (csharpLsp?.mode !== 'ready') {
            missing.push('C# language server adapter');
        }
        if (razorLsp?.mode !== 'ready') {
            missing.push('Razor language server adapter');
        }
    }
    if (options.requireRoslyn && inspection.roslyn.mode !== 'semantic-ready') {
        missing.push('Roslyn semantic sidecar');
    }
    if (options.probeLanguageServers) {
        for (const language of ['csharp', 'razor']) {
            const probe = languageServerProbes?.probes.find(candidate => candidate.language === language);
            if (!probe?.ok) {
                missing.push(`${language} language server initialize probe`);
            }
        }
    }
    return missing;
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const workspacePath = path.resolve(options.workspacePath);
    const service = new CSharpKitServiceImpl();
    const inspection = await service.inspectWorkspace({ workspacePath });
    const runtimeReadiness = capability(inspection, 'csharp-runtime-readiness');
    const languageServerProbes = options.probeLanguageServers
        ? await service.probeLanguageServers({ workspacePath })
        : undefined;
    const missing = collectMissing(inspection, options, languageServerProbes);

    const summary = {
        ok: missing.length === 0,
        strict: {
            requireFull: options.requireFull,
            requireAllAdapters: options.requireAllAdapters,
            requireRoslyn: options.requireRoslyn,
            probeLanguageServers: options.probeLanguageServers
        },
        workspacePath: inspection.workspacePath,
        dotnet: {
            available: inspection.dotnet.available,
            executable: inspection.dotnet.executable,
            version: inspection.dotnet.version,
            sdkCount: inspection.dotnet.sdks.length,
            runtimeCount: inspection.dotnet.runtimes.length,
            error: inspection.dotnet.error
        },
        runtimeReadiness,
        debugAdapter: inspection.debugAdapter,
        languageServers: inspection.languageServers.map(adapterSummary),
        languageServerProbes,
        roslyn: inspection.roslyn,
        projectCount: inspection.projects.length,
        solutionCount: inspection.solutions.length,
        toolManifestCount: inspection.toolManifests.length,
        missing,
        recommendations: inspection.recommendations
    };
    console.log(JSON.stringify(summary, undefined, 2));
    if (missing.length) {
        process.exitCode = 3;
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
