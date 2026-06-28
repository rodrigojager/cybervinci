// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import {
    createWrapperExecutionPlan,
    parseWrapperCliArgs
} from './ai-output-cleaner-command-wrapper';

describe('ai-output-cleaner-command-wrapper', () => {

    it('buffers short deterministic git commands', () => {
        const plan = createWrapperExecutionPlan('git', ['status']);

        expect(plan.shouldBufferOutput).to.equal(true);
    });

    it('does not buffer long-running npm installs by default', () => {
        const plan = createWrapperExecutionPlan('npm', ['install']);

        expect(plan.shouldBufferOutput).to.equal(false);
    });

    it('parses wrapper CLI arguments', () => {
        const parsed = parseWrapperCliArgs(['--command', 'git', 'status']);

        expect(parsed).to.deep.equal({
            command: 'git',
            args: ['status']
        });
    });
});
