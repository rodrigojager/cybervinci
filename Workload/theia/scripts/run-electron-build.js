#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const electronApp = path.join(repoRoot, 'examples', 'electron');
const rootBin = path.join(repoRoot, 'node_modules', '.bin');
const delimiter = path.delimiter;
const pathKey = Object.keys(process.env).find(key => key.toLowerCase() === 'path') || 'PATH';
const currentPath = process.env[pathKey] || '';
const env = {
  ...process.env,
};
env[pathKey] = `${rootBin}${delimiter}${currentPath}`;
env.PATH = env[pathKey];

function run(command, args = []) {
  const result = spawnSync(command, args, {
    cwd: electronApp,
    env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('theiaext', ['build']);
run('node', ['../../scripts/run-electron-rebuild.js']);
run('theia', ['build', '--mode', 'development']);
