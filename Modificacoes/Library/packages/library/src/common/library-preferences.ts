// *****************************************************************************
// Copyright (C) 2026 TypeFox GmbH.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { nls, PreferenceSchema } from '@theia/core';

export const DOCS_REGISTRY_URL_PREF = 'docs.registry.url';
export const DOCS_REGISTRY_LOCAL_PATH_PREF = 'docs.registry.localPath';
export const DOCS_STORE_PATH_PREF = 'docs.store.path';
export const DOCS_UPDATE_CHECK_ENABLED_PREF = 'docs.updateCheck.enabled';
export const DOCS_UPDATE_CHECK_INTERVAL_PREF = 'docs.updateCheck.interval';
export const DOCS_INSTALL_PREFER_PROJECT_VERSION_PREF = 'docs.install.preferProjectVersion';
export const DOCS_INSTALL_ALLOW_UNKNOWN_LICENSE_PREF = 'docs.install.allowUnknownLicense';
export const DOCS_SEARCH_MAX_RESULTS_PREF = 'docs.search.maxResults';
export const DOCS_SEARCH_USE_SQLITE_PREF = 'docs.search.useSqlite';
export const DOCS_AGENT_ALWAYS_PREFER_PINNED_DOCS_PREF = 'docs.agent.alwaysPreferPinnedDocs';
export const DOCS_AGENT_WARN_ON_OUTDATED_DOCS_PREF = 'docs.agent.warnOnOutdatedDocs';

export const LibraryPreferenceSchema: PreferenceSchema = {
    properties: {
        [DOCS_REGISTRY_URL_PREF]: {
            type: 'string',
            default: '',
            title: nls.localize('theia/ai/docs/registryUrl/title', 'Documentation registry URL')
        },
        [DOCS_REGISTRY_LOCAL_PATH_PREF]: {
            type: 'string',
            default: '',
            title: nls.localize('theia/ai/docs/registryLocalPath/title', 'Local documentation registry path')
        },
        [DOCS_STORE_PATH_PREF]: {
            type: 'string',
            default: '',
            title: nls.localize('theia/ai/docs/storePath/title', 'Local documentation store path')
        },
        [DOCS_UPDATE_CHECK_ENABLED_PREF]: {
            type: 'boolean',
            default: true,
            title: nls.localize('theia/ai/docs/updateEnabled/title', 'Enable documentation update checks')
        },
        [DOCS_UPDATE_CHECK_INTERVAL_PREF]: {
            type: 'string',
            enum: ['manual', 'daily', 'weekly', 'monthly'],
            default: 'daily',
            title: nls.localize('theia/ai/docs/updateInterval/title', 'Documentation update check interval')
        },
        [DOCS_INSTALL_PREFER_PROJECT_VERSION_PREF]: {
            type: 'boolean',
            default: true,
            title: nls.localize('theia/ai/docs/preferProjectVersion/title', 'Prefer detected project documentation versions')
        },
        [DOCS_INSTALL_ALLOW_UNKNOWN_LICENSE_PREF]: {
            type: 'boolean',
            default: false,
            title: nls.localize('theia/ai/docs/allowUnknownLicense/title', 'Allow installing documentation with unknown redistribution license')
        },
        [DOCS_SEARCH_MAX_RESULTS_PREF]: {
            type: 'number',
            default: 10,
            minimum: 1,
            maximum: 100,
            title: nls.localize('theia/ai/docs/searchMax/title', 'Maximum local documentation search results')
        },
        [DOCS_SEARCH_USE_SQLITE_PREF]: {
            type: 'boolean',
            default: false,
            title: nls.localize('theia/ai/docs/useSqlite/title', 'Use SQLite FTS when available')
        },
        [DOCS_AGENT_ALWAYS_PREFER_PINNED_DOCS_PREF]: {
            type: 'boolean',
            default: true,
            title: nls.localize('theia/ai/docs/preferPinned/title', 'Agents prefer pinned documentation')
        },
        [DOCS_AGENT_WARN_ON_OUTDATED_DOCS_PREF]: {
            type: 'boolean',
            default: true,
            title: nls.localize('theia/ai/docs/warnOutdated/title', 'Warn agents when documentation is outdated')
        }
    }
};
