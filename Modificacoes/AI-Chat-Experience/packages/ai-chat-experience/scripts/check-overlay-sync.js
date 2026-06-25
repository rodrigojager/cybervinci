#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const packageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageRoot, '..', '..', '..', '..');
const workloadPackageRoot = path.join(repoRoot, 'Workload', 'theia', 'packages', 'cybervinci-ai-chat-experience');
const overlayPackageRoot = path.join(repoRoot, 'Modificacoes', 'AI-Chat-Experience', 'packages', 'ai-chat-experience');
const overlayCatalogRoot = path.join(repoRoot, 'Modificacoes', 'AI-Chat-Experience', 'config');

const packageRelativePaths = [
  'config',
  'scripts',
  'src',
  'package.json',
  'tsconfig.json'
];

function walk(target) {
  if (!fs.existsSync(target)) {
    return [];
  }
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    return [target];
  }
  return fs.readdirSync(target, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(target, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function relativeFileSet(root, entries) {
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(root, entry);
    for (const file of walk(absolute)) {
      files.push(path.relative(root, file).split(path.sep).join('/'));
    }
  }
  return files.sort();
}

function compareTrees(sourceRoot, mirrorRoot, entries, label) {
  const sourceFiles = relativeFileSet(sourceRoot, entries);
  const mirrorFiles = relativeFileSet(mirrorRoot, entries);
  const all = new Set([...sourceFiles, ...mirrorFiles]);
  const problems = [];
  for (const relative of [...all].sort()) {
    const source = path.join(sourceRoot, ...relative.split('/'));
    const mirror = path.join(mirrorRoot, ...relative.split('/'));
    if (!fs.existsSync(source)) {
      problems.push(`${label}: source missing '${relative}'`);
      continue;
    }
    if (!fs.existsSync(mirror)) {
      problems.push(`${label}: mirror missing '${relative}'`);
      continue;
    }
    if (hashFile(source) !== hashFile(mirror)) {
      problems.push(`${label}: content differs for '${relative}'`);
    }
  }
  return { checked: all.size, problems };
}

function main() {
  const packageResult = compareTrees(workloadPackageRoot, overlayPackageRoot, packageRelativePaths, 'package mirror');
  const catalogResult = compareTrees(path.join(workloadPackageRoot, 'config'), overlayCatalogRoot, ['marketplace', 'system'], 'catalog root mirror');
  const problems = [...packageResult.problems, ...catalogResult.problems];
  if (problems.length) {
    for (const problem of problems) {
      console.error(problem);
    }
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({
    ok: true,
    packageFilesChecked: packageResult.checked,
    catalogFilesChecked: catalogResult.checked
  }, null, 2));
}

main();
