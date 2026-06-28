import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const srcRoot = join(packageRoot, 'src');

const react19OnlyChecks = [
  {
    name: 'React 19 use() API',
    pattern: /(?:\bReact\s*\.\s*)?\buse\s*\(/,
  },
  {
    name: 'React 19 useActionState() API',
    pattern: /\buseActionState\s*\(/,
  },
  {
    name: 'React 19 useOptimistic() API',
    pattern: /\buseOptimistic\s*\(/,
  },
  {
    name: 'React 19-only named import from react',
    pattern:
      /import\s*\{[^}]*\b(?:use|useActionState|useOptimistic)\b[^}]*\}\s*from\s*['"]react['"]/,
  },
];

const sourceExtensions = new Set(['.ts', '.tsx']);

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      yield* walk(fullPath);
      continue;
    }
    if (sourceExtensions.has(extname(fullPath))) {
      yield fullPath;
    }
  }
}

const failures = [];

for (const filePath of walk(srcRoot)) {
  const source = readFileSync(filePath, 'utf8');
  for (const check of react19OnlyChecks) {
    if (check.pattern.test(source)) {
      failures.push(`${filePath}: ${check.name}`);
    }
  }
}

if (failures.length > 0) {
  console.error('React 18 compatibility check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('React 18 compatibility check passed: no React 19-only APIs found.');
