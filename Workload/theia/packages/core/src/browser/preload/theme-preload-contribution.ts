// *****************************************************************************
// Copyright (C) 2023 TypeFox and others.
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

import { PreloadContribution } from './preloader';
import { DEFAULT_BACKGROUND_COLOR_STORAGE_KEY } from '../frontend-application-config-provider';
import { injectable } from 'inversify';
import { DefaultTheme } from '@theia/application-package/lib/application-props';

@injectable()
export class ThemePreloadContribution implements PreloadContribution {

    initialize(): void {
        const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        const value = window.localStorage.getItem(DEFAULT_BACKGROUND_COLOR_STORAGE_KEY) || DefaultTheme.defaultBackgroundColor(dark);
        document.documentElement.style.setProperty('--theia-editor-background', value);
        const storedTheme = window.localStorage.getItem('theme');
        const storedThemeType = window.localStorage.getItem('theme.type') || this.getBuiltinThemeType(storedTheme);
        if (storedThemeType) {
            document.body.classList.remove('theia-light', 'theia-dark', 'theia-hc', 'theia-hcLight');
            document.body.classList.add(`theia-${storedThemeType}`);
        }
    }

    protected getBuiltinThemeType(themeId: string | null): string | undefined {
        switch (themeId) {
            case 'dark':
                return 'dark';
            case 'light':
                return 'light';
            case 'hc-theia':
                return 'hc';
            case 'hc-theia-light':
                return 'hcLight';
            default:
                return undefined;
        }
    }

}
