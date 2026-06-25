"use strict";
// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyberVinciAiButton = void 0;
const React = require("@theia/core/shared/react");
const CyberVinciAiButton = ({ active, label = 'AI', iconClassName = 'codicon codicon-sparkle', className, title, ...props }) => (React.createElement("button", { ...props, type: props.type ?? 'button', title: title ?? label, className: [
        'theia-button',
        'cv-ai-runtime-button',
        active ? 'cv-ai-runtime-button--active' : '',
        className ?? ''
    ].filter(Boolean).join(' ') },
    React.createElement("i", { className: iconClassName, "aria-hidden": 'true' }),
    label ? React.createElement("span", null, label) : undefined));
exports.CyberVinciAiButton = CyberVinciAiButton;
//# sourceMappingURL=CyberVinciAiButton.js.map