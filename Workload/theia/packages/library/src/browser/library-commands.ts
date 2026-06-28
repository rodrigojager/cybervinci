// *****************************************************************************
// Copyright (C) 2026 TypeFox GmbH.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { Command, nls } from '@theia/core';

export namespace LibraryCommands {
    export const OPEN_MANAGER: Command = {
        id: 'library.open-manager',
        label: nls.localize('theia/ai/docs/openManager/label', 'Docs: Open Documentation Manager')
    };
    export const DETECT_WORKSPACE: Command = {
        id: 'library.detect-workspace',
        label: nls.localize('theia/ai/docs/detectWorkspace/label', 'Docs: Detect Workspace Documentation')
    };
    export const INSTALL_PACKAGE: Command = {
        id: 'library.install-package',
        label: nls.localize('theia/ai/docs/installPackage/label', 'Docs: Install Documentation Package')
    };
    export const ADD_SOURCE: Command = {
        id: 'library.add-source',
        label: nls.localize('theia/ai/docs/addSource/label', 'Docs: Add Documentation Source')
    };
    export const CHECK_UPDATES: Command = {
        id: 'library.check-updates',
        label: nls.localize('theia/ai/docs/checkUpdates/label', 'Docs: Check Documentation Updates')
    };
    export const REBUILD_INDEX: Command = {
        id: 'library.rebuild-index',
        label: nls.localize('theia/ai/docs/rebuildIndex/label', 'Docs: Rebuild Local Documentation Index')
    };
    export const PIN_VERSION: Command = {
        id: 'library.pin-version',
        label: nls.localize('theia/ai/docs/pinVersion/label', 'Docs: Pin Documentation Version')
    };
    export const GENERATE_LOCKFILE: Command = {
        id: 'library.generate-lockfile',
        label: nls.localize('theia/ai/docs/generateLockfile/label', 'Docs: Generate Lockfile')
    };
    export const UPDATE_LOCKFILE: Command = {
        id: 'library.update-lockfile',
        label: nls.localize('theia/ai/docs/updateLockfile/label', 'Docs: Update Lockfile')
    };
    export const VALIDATE_LOCKFILE: Command = {
        id: 'library.validate-lockfile',
        label: nls.localize('theia/ai/docs/validateLockfile/label', 'Docs: Validate Lockfile')
    };
    export const VALIDATE_REGISTRY: Command = {
        id: 'library.validate-registry',
        label: nls.localize('theia/ai/docs/validateRegistry/label', 'Docs: Validate Documentation Registry')
    };
    export const GENERATE_CONTRIBUTION: Command = {
        id: 'library.generate-contribution',
        label: nls.localize('theia/ai/docs/generateContribution/label', 'Docs: Generate Registry Contribution')
    };
    export const OPEN_STORE: Command = {
        id: 'library.open-store',
        label: nls.localize('theia/ai/docs/openStore/label', 'Docs: Open Local Documentation Store')
    };
    export const SEARCH_INSTALLED: Command = {
        id: 'library.search-installed',
        label: nls.localize('theia/ai/docs/searchInstalled/label', 'Docs: Search Installed Documentation')
    };
}
