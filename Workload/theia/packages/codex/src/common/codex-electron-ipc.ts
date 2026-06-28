// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

export const CODEX_ELECTRON_GET_SHARED_OBJECT = 'codex-electron:get-shared-object';
export const CODEX_ELECTRON_SET_SHARED_OBJECT = 'codex-electron:set-shared-object';
export const CODEX_ELECTRON_GET_BUILD_FLAVOR = 'codex-electron:get-build-flavor';
export const CODEX_ELECTRON_DISMISS_HOTKEY_WINDOW = 'codex-electron:dismiss-hotkey-window';
export const CODEX_ELECTRON_TOGGLE_HOTKEY_WINDOW = 'codex-electron:toggle-hotkey-window';
export const CODEX_ELECTRON_DICTATION_HOLD = 'codex-electron:dictation-hold';
export const CODEX_ELECTRON_DICTATION_TOGGLE = 'codex-electron:dictation-toggle';

export type CodexElectronBuildFlavor = 'theia-electron' | 'theia-browser';
