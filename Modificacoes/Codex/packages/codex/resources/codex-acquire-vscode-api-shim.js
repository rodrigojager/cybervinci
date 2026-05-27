// VS Code acquireVsCodeApi shim — bridges Codex official webview IPC to CyberVinci host.
(function () {
    'use strict';
    const CHANNEL = 'codex-webview-ipc';
    const webviewId = new URLSearchParams(window.location.search).get('webviewId') || 'default';
    let state = undefined;

    function postToHost(message) {
        window.parent.postMessage({ channel: CHANNEL, webviewId: webviewId, message: message }, '*');
    }

    window.addEventListener('message', function (event) {
        const data = event.data;
        if (!data || typeof data !== 'object' || typeof data.type !== 'string') {
            return;
        }
        if (data.channel === CHANNEL) {
            return;
        }
        window.dispatchEvent(new CustomEvent('codex-host-message', { detail: data }));
    });

    window.acquireVsCodeApi = function () {
        return {
            postMessage: function (msg) {
                postToHost(msg);
            },
            getState: function () {
                return state;
            },
            setState: function (next) {
                state = next;
            }
        };
    };

    window.electronBridge = window.electronBridge || {
        getSharedObjectSnapshotValue: function () {
            return undefined;
        },
        getBuildFlavor: function () {
            return 'theia-browser';
        }
    };

    postToHost({ type: 'webview-ready' });
})();
