// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { MemoryLanguageAnalyzer } from '../common';

export const MemoryLanguageAnalyzerContribution = Symbol('MemoryLanguageAnalyzerContribution');

export interface RankedMemoryLanguageAnalyzer extends MemoryLanguageAnalyzer {
    readonly priority?: number;
}
