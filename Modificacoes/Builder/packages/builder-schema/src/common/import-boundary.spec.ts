// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_ROOT = path.join(PACKAGE_ROOT, 'src');

const FORBIDDEN_IMPORT_PATTERNS = [
    /^react($|\/)/,
    /^react-dom($|\/)/,
    /^@mantine\//,
    /^@measured\/puck($|\/)/,
    /^puck($|\/)/,
    /^@rjsf\//,
    /^@theia\//,
    /^@cybervinci\/builder-renderer-/,
    /^@cybervinci\/builder-editor-/,
    /^@cybervinci\/builder-property-panel-/,
    /^@cybervinci\/builder$/,
    /^@cybervinci\/builder-export-/,
    /^@cybervinci\/builder-ai$/
];

const PUBLISHED_DEPENDENCY_FIELDS = [
    'dependencies',
    'peerDependencies',
    'optionalDependencies'
];

function findTypescriptFiles(directory: string): string[] {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...findTypescriptFiles(entryPath));
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
            files.push(entryPath);
        }
    }

    return files;
}

function findImportSpecifiers(source: string): string[] {
    const specifiers: string[] = [];
    const importOrExportPattern = /\b(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;
    const dynamicImportPattern = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    const requirePattern = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

    for (const pattern of [importOrExportPattern, dynamicImportPattern, requirePattern]) {
        let match: RegExpExecArray | undefined;
        while ((match = pattern.exec(source) ?? undefined) !== undefined) {
            specifiers.push(match[1]);
        }
    }

    return specifiers;
}

function isForbiddenImport(specifier: string): boolean {
    return FORBIDDEN_IMPORT_PATTERNS.some(pattern => pattern.test(specifier));
}

describe('builder-schema import boundary', () => {

    it('does not publish dependencies on React, UI adapters, Theia, or Builder feature packages', () => {
        const packageJson = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')) as Record<string, Record<string, string> | undefined>;
        const forbiddenDependencies: string[] = [];

        for (const dependencyField of PUBLISHED_DEPENDENCY_FIELDS) {
            const dependencies = packageJson[dependencyField] ?? {};
            for (const dependencyName of Object.keys(dependencies)) {
                if (isForbiddenImport(dependencyName)) {
                    forbiddenDependencies.push(`${dependencyField}.${dependencyName}`);
                }
            }
        }

        expect(forbiddenDependencies).to.deep.equal([]);
    });

    it('does not import React, UI adapters, Theia, or Builder feature packages from source', () => {
        const violations = findTypescriptFiles(SOURCE_ROOT).flatMap(file => {
            const source = fs.readFileSync(file, 'utf8');
            return findImportSpecifiers(source)
                .filter(isForbiddenImport)
                .map(specifier => `${path.relative(PACKAGE_ROOT, file)} imports ${specifier}`);
        });

        expect(violations).to.deep.equal([]);
    });
});
