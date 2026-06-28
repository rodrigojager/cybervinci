// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable } from 'inversify';
import { PreloadContribution } from './preloader';

const CYBERVINCI_ICON_STORAGE_KEY = 'workbench.cyberVinciIcon';
const DEFAULT_CYBERVINCI_ICON = 'dourado-ciano-e-branco';
const CYBERVINCI_APP_ICON_CLASS_PREFIX = 'cybervinci-app-icon-';
const CYBERVINCI_ICON_IDS = new Set([
    'azul-e-branco',
    'branco-e-laranja',
    'branco',
    'dourado-ciano-e-branco',
    'roxo-e-branco',
    'verde-e-branco'
]);

@injectable()
export class CyberVinciIconPreloadContribution implements PreloadContribution {

    initialize(): void {
        const preload = document.querySelector('.theia-preload');
        if (!preload) {
            return;
        }
        const storedIcon = window.localStorage.getItem(CYBERVINCI_ICON_STORAGE_KEY);
        const iconId = storedIcon && CYBERVINCI_ICON_IDS.has(storedIcon) ? storedIcon : DEFAULT_CYBERVINCI_ICON;
        preload.classList.add(`cybervinci-icon-${iconId}`);
        document.body.classList.add(`${CYBERVINCI_APP_ICON_CLASS_PREFIX}${iconId}`);
    }

}
