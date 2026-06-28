#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const rootBin = path.join(root, 'node_modules', '.bin');
const separator = path.delimiter;
const pathKey = Object.keys(process.env).find(key => key.toLowerCase() === 'path') || 'PATH';
const currentPath = process.env[pathKey] || '';

process.env[pathKey] = `${rootBin}${separator}${currentPath}`;
process.env.PATH = process.env[pathKey];

const command = process.platform === 'win32' ? 'theia.cmd' : 'theia';
const modules = [
  'keytar',
  'ssh2',
  'native-keymap',
  'find-git-repositories',
  'drivelist',
  'node-pty'
];
const result = spawnSync(command, ['rebuild:electron', '--cacheRoot', '../..', '--modules', modules.join(',')], {
  cwd: path.join(root, 'examples', 'electron'),
  env: process.env,
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
