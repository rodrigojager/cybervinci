// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { AIOutputCleanerMode } from './ai-output-cleaner-types';

export const OUTPUT_CLEANER_CODEX_ENV_DISABLED = 'CYBERVINCI_OUTPUT_CLEANER_DISABLED';
export const OUTPUT_CLEANER_CODEX_ENV_LEGACY_DISABLED = 'CYBERVINCI_AI_BRIDGE_DISABLED';
export const OUTPUT_CLEANER_CODEX_ENV_ENABLED = 'CYBERVINCI_OUTPUT_CLEANER';
export const OUTPUT_CLEANER_CODEX_ENV_MODE = 'CYBERVINCI_OUTPUT_CLEANER_MODE';
export const OUTPUT_CLEANER_CODEX_ENV_SESSION = 'CYBERVINCI_OUTPUT_CLEANER_SESSION';
export const OUTPUT_CLEANER_CODEX_ENV_WRAPPER_BIN = 'CYBERVINCI_OUTPUT_CLEANER_WRAPPER_BIN';
export const OUTPUT_CLEANER_CODEX_ENV_ARTIFACT_ROOT = 'CYBERVINCI_OUTPUT_CLEANER_ARTIFACT_ROOT';
export const OUTPUT_CLEANER_CODEX_ENV_ORIGINAL_PATH = 'CYBERVINCI_OUTPUT_CLEANER_ORIGINAL_PATH';

export interface AIOutputCleanerCodexEnvPreferences {
    enabled: boolean;
    mode: AIOutputCleanerMode;
    codexEnabled: boolean;
    wrappersEnabled: boolean;
    wrapperCommands: string[];
}

export interface AIOutputCleanerCodexEnvResolution {
    enabled: boolean;
    env: Record<string, string>;
    pathEntries: string[];
    fingerprint: string;
}

