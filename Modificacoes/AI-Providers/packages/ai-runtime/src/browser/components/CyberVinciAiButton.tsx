// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import * as React from '@theia/core/shared/react';

export interface CyberVinciAiButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    active?: boolean;
    label?: string;
    iconClassName?: string;
}

export const CyberVinciAiButton: React.FC<CyberVinciAiButtonProps> = ({
    active,
    label = 'AI',
    iconClassName = 'codicon codicon-sparkle',
    className,
    title,
    ...props
}) => (
    <button
        {...props}
        type={props.type ?? 'button'}
        title={title ?? label}
        className={[
            'theia-button',
            'cv-ai-runtime-button',
            active ? 'cv-ai-runtime-button--active' : '',
            className ?? ''
        ].filter(Boolean).join(' ')}
    >
        <i className={iconClassName} aria-hidden='true' />
        {label ? <span>{label}</span> : undefined}
    </button>
);
