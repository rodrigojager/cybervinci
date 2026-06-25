"use strict";
// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyberVinciAiPromptPanel = void 0;
const React = require("@theia/core/shared/react");
const CyberVinciAiExecutionPicker_1 = require("./CyberVinciAiExecutionPicker");
const CyberVinciAiPromptPanel = ({ service, title, surfaceId, action, workspacePath, defaultPrompt = '', placeholder, systemPrompt, input, output, effectPolicy, buildRequest, onConfigureProvider, onResult, onClose }) => {
    const [prompt, setPrompt] = React.useState(defaultPrompt);
    const [execution, setExecution] = React.useState({
        reasoningPolicy: 'auto',
        reasoningEffort: 'medium'
    });
    const [running, setRunning] = React.useState(false);
    const [error, setError] = React.useState();
    const [selectedProvider, setSelectedProvider] = React.useState();
    const unavailableProvider = selectedProvider && (!selectedProvider.available || !!selectedProvider.configurationRequired?.length)
        ? selectedProvider
        : undefined;
    const submit = async () => {
        if (!prompt.trim() || running) {
            return;
        }
        if (unavailableProvider) {
            setError(unavailableProvider.configurationRequired?.length
                ? `Configuration required: ${unavailableProvider.configurationRequired.join(', ')}`
                : unavailableProvider.message ?? 'Configure this provider before running AI.');
            return;
        }
        setRunning(true);
        setError(undefined);
        try {
            const request = buildRequest ? buildRequest({ prompt, execution }) : {
                surfaceId,
                action,
                workspacePath,
                userPrompt: prompt,
                systemPrompt,
                input,
                output,
                effectPolicy,
                execution
            };
            const result = await service.runTask({
                ...request,
                surfaceId: request.surfaceId ?? surfaceId,
                action: request.action ?? action,
                workspacePath: request.workspacePath ?? workspacePath,
                userPrompt: request.userPrompt ?? prompt,
                execution: {
                    ...execution,
                    ...request.execution
                }
            });
            await onResult(result);
        }
        catch (reason) {
            setError(String(reason?.message ?? reason));
        }
        finally {
            setRunning(false);
        }
    };
    return (React.createElement("section", { className: 'cv-ai-runtime-prompt-panel' },
        React.createElement("header", null,
            React.createElement("h3", null, title),
            onClose ? (React.createElement("button", { type: 'button', className: 'cv-ai-runtime-icon-button', title: 'Close', onClick: onClose },
                React.createElement("i", { className: 'codicon codicon-close', "aria-hidden": 'true' }))) : undefined),
        React.createElement(CyberVinciAiExecutionPicker_1.CyberVinciAiExecutionPicker, { service: service, workspacePath: workspacePath, value: execution, disabled: running, onConfigureProvider: onConfigureProvider, onSelectedProviderChange: setSelectedProvider, onChange: setExecution }),
        React.createElement("textarea", { value: prompt, disabled: running, placeholder: placeholder, onChange: event => setPrompt(event.currentTarget.value) }),
        error ? React.createElement("div", { className: 'cv-ai-runtime-error' }, error) : undefined,
        React.createElement("footer", null,
            React.createElement("button", { type: 'button', className: 'theia-button secondary', disabled: running, onClick: onClose }, "Cancel"),
            React.createElement("button", { type: 'button', className: 'theia-button main', disabled: running || !prompt.trim() || !!unavailableProvider, onClick: submit }, running ? 'Running...' : 'Run AI'))));
};
exports.CyberVinciAiPromptPanel = CyberVinciAiPromptPanel;
//# sourceMappingURL=CyberVinciAiPromptPanel.js.map