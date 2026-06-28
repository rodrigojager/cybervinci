import { expect } from 'chai';
import * as fsp from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {
    CSHARP_CORECLR_DEBUG_ADAPTER_ARGS_ENV,
    CSHARP_CORECLR_DEBUG_ADAPTER_ENV,
    NETCOREDBG_ARGS_ENV,
    NETCOREDBG_DAP_ARGS,
    NETCOREDBG_PATH_ENV,
    resolveCSharpDebugAdapterStatus
} from './csharp-coreclr-debug-adapter';

describe('resolveCSharpDebugAdapterStatus', () => {
    let workspacePath: string;

    beforeEach(async () => {
        workspacePath = await fsp.mkdtemp(path.join(os.tmpdir(), 'cv-netcoredbg-'));
    });

    afterEach(async () => {
        await fsp.rm(workspacePath, { recursive: true, force: true });
    });

    it('detects an explicitly configured debug adapter', async () => {
        const adapterPath = path.join(workspacePath, process.platform === 'win32' ? 'netcoredbg.exe' : 'netcoredbg');
        await fsp.writeFile(adapterPath, '', 'utf8');

        const status = resolveCSharpDebugAdapterStatus({
            [CSHARP_CORECLR_DEBUG_ADAPTER_ENV]: adapterPath,
            PATH: ''
        });

        expect(status.mode).to.equal('ready');
        expect(status.command).to.equal(adapterPath);
        expect(status.args).to.deep.equal(NETCOREDBG_DAP_ARGS);
    });

    it('uses explicitly configured debug adapter args from CyberVinci env vars', async () => {
        const adapterPath = path.join(workspacePath, process.platform === 'win32' ? 'netcoredbg.exe' : 'netcoredbg');
        await fsp.writeFile(adapterPath, '', 'utf8');

        const status = resolveCSharpDebugAdapterStatus({
            [CSHARP_CORECLR_DEBUG_ADAPTER_ENV]: adapterPath,
            [CSHARP_CORECLR_DEBUG_ADAPTER_ARGS_ENV]: '--interpreter=vscode --engineLogging "--log=file path.log"',
            PATH: ''
        });

        expect(status.mode).to.equal('ready');
        expect(status.command).to.equal(adapterPath);
        expect(status.args).to.deep.equal(['--interpreter=vscode', '--engineLogging', '--log=file path.log']);
    });

    it('uses legacy NETCOREDBG args when NETCOREDBG_PATH selects the adapter', async () => {
        const adapterPath = path.join(workspacePath, process.platform === 'win32' ? 'netcoredbg.exe' : 'netcoredbg');
        await fsp.writeFile(adapterPath, '', 'utf8');

        const status = resolveCSharpDebugAdapterStatus({
            [NETCOREDBG_PATH_ENV]: adapterPath,
            [NETCOREDBG_ARGS_ENV]: '--interpreter=vscode --engineLogging',
            PATH: ''
        });

        expect(status.mode).to.equal('ready');
        expect(status.envVar).to.equal(NETCOREDBG_PATH_ENV);
        expect(status.args).to.deep.equal(['--interpreter=vscode', '--engineLogging']);
    });

    it('reports a missing configured debug adapter', () => {
        const status = resolveCSharpDebugAdapterStatus({
            [CSHARP_CORECLR_DEBUG_ADAPTER_ENV]: path.join(workspacePath, 'missing-netcoredbg'),
            [CSHARP_CORECLR_DEBUG_ADAPTER_ARGS_ENV]: '--interpreter=vscode --engineLogging',
            PATH: ''
        });

        expect(status.mode).to.equal('configured-missing');
        expect(status.args).to.deep.equal(['--interpreter=vscode', '--engineLogging']);
    });

    it('detects workspace-configured debug adapters', async () => {
        const toolsDirectory = path.join(workspacePath, '.tools');
        const adapterName = process.platform === 'win32' ? 'workspace-netcoredbg.exe' : 'workspace-netcoredbg';
        const adapterPath = path.join(toolsDirectory, adapterName);
        await fsp.mkdir(toolsDirectory, { recursive: true });
        await fsp.writeFile(adapterPath, '', 'utf8');

        const status = resolveCSharpDebugAdapterStatus({
            PATH: ''
        }, workspacePath, {
            debugAdapters: {
                coreclr: {
                    command: `.tools/${adapterName}`,
                    args: ['--interpreter=vscode', '--engineLogging']
                }
            }
        });

        expect(status.mode).to.equal('ready');
        expect(status.command).to.equal(adapterPath);
        expect(status.args).to.deep.equal(['--interpreter=vscode', '--engineLogging']);
        expect(status.detail).to.contain('.cybervinci/csharp-kit.json');
    });

    it('detects netcoredbg on PATH', async () => {
        const adapterName = process.platform === 'win32' ? 'netcoredbg.exe' : 'netcoredbg';
        const adapterPath = path.join(workspacePath, adapterName);
        await fsp.writeFile(adapterPath, '', 'utf8');

        const status = resolveCSharpDebugAdapterStatus({
            PATH: workspacePath,
            PATHEXT: '.EXE'
        });

        expect(status.mode).to.equal('ready');
        expect(status.command).to.equal(adapterPath);
    });

    it('detects netcoredbg from a workspace dotnet tool manifest', async () => {
        const dotnetName = process.platform === 'win32' ? 'dotnet.exe' : 'dotnet';
        const dotnetPath = path.join(workspacePath, dotnetName);
        const manifestPath = path.join(workspacePath, 'dotnet-tools.json');
        await fsp.writeFile(dotnetPath, '', 'utf8');
        await fsp.writeFile(manifestPath, JSON.stringify({
            version: 1,
            isRoot: true,
            tools: {
                'custom-netcoredbg': {
                    version: '1.0.0',
                    commands: ['netcoredbg']
                }
            }
        }), 'utf8');

        const status = resolveCSharpDebugAdapterStatus({
            PATH: workspacePath,
            PATHEXT: '.EXE'
        }, workspacePath);

        expect(status.mode).to.equal('ready');
        expect(status.command).to.equal(dotnetPath);
        expect(status.args).to.deep.equal(['tool', 'run', 'netcoredbg', ...NETCOREDBG_DAP_ARGS]);
        expect(status.detail).to.contain('dotnet-tools.json');
    });

    it('detects vsdbg from an installed VS Code C# extension runtime', async () => {
        const debuggerDirectory = process.platform === 'win32'
            ? path.join(workspacePath, '.vscode', 'extensions', 'ms-dotnettools.csharp-2.140.8-win32-x64', '.debugger', 'x86_64')
            : path.join(workspacePath, '.vscode', 'extensions', 'ms-dotnettools.csharp-2.140.8', '.debugger');
        const adapterName = process.platform === 'win32' ? 'vsdbg.exe' : 'vsdbg';
        const adapterPath = path.join(debuggerDirectory, adapterName);
        await fsp.mkdir(debuggerDirectory, { recursive: true });
        await fsp.writeFile(adapterPath, '', 'utf8');

        const status = resolveCSharpDebugAdapterStatus({
            PATH: '',
            USERPROFILE: workspacePath,
            HOME: workspacePath
        }, workspacePath);

        expect(status.mode).to.equal('ready');
        expect(status.adapter).to.equal('vsdbg');
        expect(status.command).to.equal(adapterPath);
        expect(status.args).to.deep.equal(NETCOREDBG_DAP_ARGS);
        expect(status.detail).to.contain('VS Code C# extension');
    });
});
