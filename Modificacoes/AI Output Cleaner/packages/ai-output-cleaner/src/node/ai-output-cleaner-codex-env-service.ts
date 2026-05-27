// *****************************************************************************
// Copyright (C) 2026.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import * as os from 'os';
import * as path from 'path';
import { PreferenceService } from '@theia/core';
import { inject, injectable } from '@theia/core/shared/inversify';
import {
    OUTPUT_CLEANER_CODEX_ENABLED_PREF,
    OUTPUT_CLEANER_CODEX_WRAPPERS_ENABLED_PREF,
    OUTPUT_CLEANER_ENABLED_PREF,
    OUTPUT_CLEANER_MODE_PREF
} from '../common/ai-output-cleaner-preferences';
import {
    OUTPUT_CLEANER_CODEX_ENV_ARTIFACT_ROOT,
    OUTPUT_CLEANER_CODEX_ENV_DISABLED,
    OUTPUT_CLEANER_CODEX_ENV_ENABLED,
    OUTPUT_CLEANER_CODEX_ENV_LEGACY_DISABLED,
    OUTPUT_CLEANER_CODEX_ENV_MODE,
    OUTPUT_CLEANER_CODEX_ENV_ORIGINAL_PATH,
    OUTPUT_CLEANER_CODEX_ENV_SESSION,
    OUTPUT_CLEANER_CODEX_ENV_WRAPPER_BIN,
    AIOutputCleanerCodexEnvPreferences,
    AIOutputCleanerCodexEnvResolution
} from '../common/ai-output-cleaner-codex-env-types';
import { AIOutputCleanerMode } from '../common/ai-output-cleaner-types';
import { AIOutputCleanerArtifactStore } from './ai-output-cleaner-artifact-store';
import { AIOutputCleanerCommandWrapperManager } from './ai-output-cleaner-command-wrapper-manager';
import { OUTPUT_CLEANER_WRAPPER_COMMANDS_PREF } from '../common/ai-output-cleaner-preferences';
import {
    AIOutputCleanerCliAdapterCapabilities,
    AIOutputCleanerCliEnvironmentContext
} from './ai-output-cleaner-cli-adapter-registry';

export interface AIOutputCleanerCliEnvResolution extends AIOutputCleanerCodexEnvResolution {
    cliId: string;
    capabilities: AIOutputCleanerCliAdapterCapabilities;
}

@injectable()
export class AIOutputCleanerCodexEnvService {

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    @inject(AIOutputCleanerArtifactStore)
    protected readonly artifactStore: AIOutputCleanerArtifactStore;

    @inject(AIOutputCleanerCommandWrapperManager)
    protected readonly wrapperManager: AIOutputCleanerCommandWrapperManager;

    async resolveForCli(context: AIOutputCleanerCliEnvironmentContext): Promise<AIOutputCleanerCliEnvResolution> {
        const preferences = this.readPreferences();
        const disabled = this.isDisabledByKillSwitch() || !preferences.enabled || !preferences.codexEnabled;
        const sessionOverride = context.sessionId ? await this.artifactStore.getSessionOverride(context.sessionId) : undefined;
        const mode = sessionOverride?.bypassFiltering ? 'raw' : preferences.mode;
        const artifactRoot = await this.artifactStore.getArtifactRootPath();
        const wrapperBin = this.getWrapperBinPath();
        const originalPath = process.env[this.findPathKey()] ?? '';
        const env: Record<string, string> = {
            [OUTPUT_CLEANER_CODEX_ENV_ENABLED]: disabled ? '0' : '1',
            [OUTPUT_CLEANER_CODEX_ENV_MODE]: mode,
            [OUTPUT_CLEANER_CODEX_ENV_ARTIFACT_ROOT]: artifactRoot,
            [OUTPUT_CLEANER_CODEX_ENV_ORIGINAL_PATH]: originalPath
        };
        if (context.sessionId) {
            env[OUTPUT_CLEANER_CODEX_ENV_SESSION] = context.sessionId;
        }
        const pathEntries: string[] = [];
        if (!disabled && preferences.wrappersEnabled) {
            await this.wrapperManager.ensureWrappers(wrapperBin, preferences.wrapperCommands);
            env[OUTPUT_CLEANER_CODEX_ENV_WRAPPER_BIN] = wrapperBin;
            pathEntries.push(wrapperBin);
        }
        const capabilities = this.buildCliCapabilities(disabled, preferences.wrappersEnabled, Object.keys(env));
        return {
            cliId: context.cliId,
            enabled: !disabled,
            env,
            pathEntries,
            capabilities,
            fingerprint: JSON.stringify({
                cliId: context.cliId,
                enabled: !disabled,
                mode,
                wrappersEnabled: preferences.wrappersEnabled && !disabled,
                sessionId: context.sessionId || '',
                bypassFiltering: sessionOverride?.bypassFiltering === true,
                wrapperBin: preferences.wrappersEnabled && !disabled ? wrapperBin : '',
                artifactRoot,
                wrapperCommands: preferences.wrapperCommands
            })
        };
    }

    async resolveForSession(sessionId?: string): Promise<AIOutputCleanerCodexEnvResolution> {
        const { enabled, env, pathEntries, fingerprint } = await this.resolveForCli(this.buildSessionContext(sessionId));
        return {
            enabled,
            env,
            pathEntries,
            fingerprint
        };
    }

    async recreateWrappers(commands?: string[]): Promise<string[]> {
        const preferences = this.readPreferences();
        const wrapperBin = this.getWrapperBinPath();
        return this.wrapperManager.ensureWrappers(wrapperBin, commands && commands.length > 0 ? commands : preferences.wrapperCommands);
    }

    protected readPreferences(): AIOutputCleanerCodexEnvPreferences {
        return {
            enabled: this.preferenceService.get<boolean>(OUTPUT_CLEANER_ENABLED_PREF, false),
            mode: this.preferenceService.get<AIOutputCleanerMode>(OUTPUT_CLEANER_MODE_PREF, 'safe'),
            codexEnabled: this.preferenceService.get<boolean>(OUTPUT_CLEANER_CODEX_ENABLED_PREF, true),
            wrappersEnabled: this.preferenceService.get<boolean>(OUTPUT_CLEANER_CODEX_WRAPPERS_ENABLED_PREF, true),
            wrapperCommands: this.preferenceService.get<string[]>(OUTPUT_CLEANER_WRAPPER_COMMANDS_PREF, [])
        };
    }

    protected isDisabledByKillSwitch(): boolean {
        return this.isTruthyEnv(process.env[OUTPUT_CLEANER_CODEX_ENV_DISABLED]) ||
            this.isTruthyEnv(process.env[OUTPUT_CLEANER_CODEX_ENV_LEGACY_DISABLED]);
    }

    protected isTruthyEnv(value: string | undefined): boolean {
        if (!value) {
            return false;
        }
        return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
    }

    protected getWrapperBinPath(): string {
        return path.join(os.homedir(), '.cybervinci', 'ai-output-cleaner', 'bin');
    }

    protected findPathKey(): string {
        return Object.keys(process.env).find(key => key.toLowerCase() === 'path') || 'PATH';
    }

    protected buildSessionContext(sessionId?: string): AIOutputCleanerCliEnvironmentContext {
        return {
            cliId: 'codex',
            sessionId
        };
    }

    protected buildCliCapabilities(disabled: boolean, wrappersEnabled: boolean, envKeys: string[]): AIOutputCleanerCliAdapterCapabilities {
        return {
            env: {
                variables: envKeys,
                pathEntries: !disabled && wrappersEnabled,
                fingerprint: true
            },
            hooks: ['spawn-env'],
            sandbox: ['kill-switch', 'mode-env', 'path-capture', 'wrapper-bin'],
            stream: ['session-env']
        };
    }
}

