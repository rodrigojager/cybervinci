// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

const { spawn } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const kernelAddress = process.env.FLOW_E2E_KERNEL_ADDR || '127.0.0.1:7331';
const kernelEndpoint = `ws://${kernelAddress}/ws`;
const mockImageProviderCommand = `"${process.execPath}" -e "process.stdin.resume();process.stdin.on('end',()=>console.log(JSON.stringify({base64:Buffer.from('flow-e2e-image').toString('base64'),mimeType:'image/png'})))"`;

const children = [];

function spawnChild(command, args, options) {
    const child = spawn(command, args, {
        cwd: options.cwd,
        env: options.env || process.env,
        shell: process.platform === 'win32',
        stdio: options.stdio || 'inherit',
        windowsHide: true
    });
    children.push(child);
    child.on('exit', (code, signal) => {
        if (shuttingDown) {
            return;
        }
        shutdown(code || (signal ? 1 : 0));
    });
    return child;
}

let shuttingDown = false;

function shutdown(code = 0) {
    shuttingDown = true;
    for (const child of children) {
        if (!child.killed) {
            child.kill();
        }
    }
    process.exit(code);
}

process.on('SIGINT', () => shutdown(130));
process.on('SIGTERM', () => shutdown(143));

const kernel = spawnChild('go', ['run', './flow-kernel/cmd/flow-kernel', 'serve', '--http', kernelAddress], {
    cwd: repoRoot
});

const startupDelayMs = Number.parseInt(process.env.FLOW_E2E_KERNEL_STARTUP_DELAY_MS || '1500', 10);
setTimeout(() => {
    const imageProviderEnv = process.env.FLOW_E2E_IMAGE_PROVIDER_MOCK === '1'
        ? { FLOW_IMAGE_PROVIDER_COMMAND: process.env.FLOW_IMAGE_PROVIDER_COMMAND || mockImageProviderCommand }
        : {};
    spawnChild('npm', ['run', 'theia:start'], {
        cwd: path.resolve(repoRoot, 'examples', 'playwright'),
        env: {
            ...process.env,
            ...imageProviderEnv,
            FLOW_KERNEL_MODE: 'external',
            FLOW_KERNEL_HTTP: kernelEndpoint,
            FLOW_MEMORY_PROVIDER: 'mock',
            FLOW_AGENT_PROVIDER: 'e2e-mock'
        }
    });
}, Number.isFinite(startupDelayMs) ? startupDelayMs : 1500);

kernel.on('error', error => {
    console.error(`Failed to start Flow Kernel for E2E: ${error.message}`);
    shutdown(1);
});
