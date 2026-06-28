// VS Code acquireVsCodeApi shim - bridges Codex official webview IPC to CyberVinci host.
(function () {
    'use strict';

    const CHANNEL = 'codex-webview-ipc';
    const EXTENSION_VERSION = '26.5527.31454';
    const BUILD_FLAVOR = 'prod';
    const query = new URLSearchParams(window.location.search);
    const webviewId = query.get('webviewId') || 'default';
    let state;

    function readMeta(name) {
        const node = document.querySelector('meta[name="' + name + '"]');
        return node && node.getAttribute('content') || undefined;
    }

    const appSessionId = readMeta('codex-session-id') || ('theia-' + Math.random().toString(36).slice(2));
    const sharedObjects = new Map([
        ['host_config', { id: 'local', display_name: 'Local', kind: 'local' }]
    ]);

    function postToHost(message) {
        window.parent.postMessage({ channel: CHANNEL, webviewId: webviewId, message: message }, '*');
    }

    function logError(prefix, error) {
        const message = prefix + ': ' + ((error && (error.stack || error.message)) || String(error));
        postToHost({ type: 'log-message', message: message });
        try {
            console.error(message, error);
        } catch {
            // no-op
        }
    }

    let hostThemeVariant;
    const themeVariantListeners = new Set();

    function normalizeThemeVariant(value) {
        return value === 'light' || value === 'dark' ? value : undefined;
    }

    function getSystemThemeVariant() {
        const hostVariant = normalizeThemeVariant(hostThemeVariant);
        return hostVariant || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }

    function notifyThemeVariantListeners() {
        const variant = getSystemThemeVariant();
        themeVariantListeners.forEach(function (listener) {
            listener(variant);
        });
    }

    function relayHostMessageForOfficialRouter(event, data) {
        if (data.__codexShimRelayed || event.origin === window.location.origin) {
            return;
        }
        const relayedData = Object.assign({}, data, { __codexShimRelayed: true });
        window.dispatchEvent(new MessageEvent('message', {
            data: relayedData,
            origin: window.location.origin,
            source: window
        }));
    }

    let nextCapnRpcImportId = 1;
    const pendingCapnRpcInstructions = new Map();
    const capnRpcServices = {};

    function postCapnRpcMessage(message) {
        window.postMessage({
            type: 'vscode-capn-rpc-message',
            message: JSON.stringify(message)
        }, window.location.origin || '*');
    }

    function devalueCapnRpcValue(value) {
        if (value === undefined) {
            return ['undefined'];
        }
        if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
            return value;
        }
        if (Array.isArray(value)) {
            return [value.map(devalueCapnRpcValue)];
        }
        if (typeof value === 'object') {
            const result = {};
            for (const key in value) {
                if (Object.prototype.hasOwnProperty.call(value, key)) {
                    result[key] = devalueCapnRpcValue(value[key]);
                }
            }
            return result;
        }
        return ['undefined'];
    }

    function getCapnRpcValueForPath(path) {
        if (!Array.isArray(path) || path.length === 0) {
            return { services: capnRpcServices };
        }
        if (path[0] !== 'services') {
            return undefined;
        }
        let value = capnRpcServices;
        for (const key of path.slice(1)) {
            if (!value || typeof value !== 'object' || !Object.prototype.hasOwnProperty.call(value, key)) {
                return undefined;
            }
            value = value[key];
        }
        return value;
    }

    function getCapnRpcPath(instruction) {
        if (Array.isArray(instruction) && instruction[0] === 'pipeline' && Array.isArray(instruction[2])) {
            return instruction[2];
        }
        return [];
    }

    function resolveCapnRpcImport(importId, instruction) {
        const value = getCapnRpcValueForPath(getCapnRpcPath(instruction));
        postCapnRpcMessage(['resolve', importId, devalueCapnRpcValue(value)]);
    }

    function handleCapnRpcMessage(msg) {
        if (!msg || typeof msg !== 'object' || msg.type !== 'vscode-capn-rpc-message' || typeof msg.message !== 'string') {
            return false;
        }
        let payload;
        try {
            payload = JSON.parse(msg.message);
        } catch {
            return true;
        }
        if (!Array.isArray(payload)) {
            return true;
        }
        switch (payload[0]) {
            case 'push': {
                pendingCapnRpcInstructions.set(nextCapnRpcImportId++, payload[1]);
                return true;
            }
            case 'pull': {
                const importId = payload[1];
                if (typeof importId !== 'number') {
                    return true;
                }
                resolveCapnRpcImport(importId, pendingCapnRpcInstructions.get(importId));
                return true;
            }
            case 'release': {
                const importId = payload[1];
                if (typeof importId === 'number') {
                    pendingCapnRpcInstructions.delete(importId);
                }
                return true;
            }
            case 'abort':
                pendingCapnRpcInstructions.clear();
                return true;
            default:
                return true;
        }
    }

    window.addEventListener('error', function (event) {
        logError('webview-error', event.error || event.message);
    });

    window.addEventListener('unhandledrejection', function (event) {
        logError('webview-unhandled-rejection', event.reason);
    });

    window.addEventListener('message', function (event) {
        const data = event.data;
        if (!data || typeof data !== 'object' || typeof data.type !== 'string') {
            return;
        }
        if (data.channel === CHANNEL) {
            return;
        }
        if (data.type === 'theme-updated') {
            const nextVariant = normalizeThemeVariant((data.theme && data.theme.variant) || data.variant);
            if (nextVariant && nextVariant !== hostThemeVariant) {
                hostThemeVariant = nextVariant;
                notifyThemeVariantListeners();
            }
        }
        if (data.type === 'shared-object-updated' && typeof data.key === 'string') {
            sharedObjects.set(data.key, data.value);
        }
        window.dispatchEvent(new CustomEvent('codex-host-message', { detail: data }));
        relayHostMessageForOfficialRouter(event, data);
    });

    const vscodeApi = {
        postMessage: function (msg) {
            if (handleCapnRpcMessage(msg)) {
                return;
            }
            postToHost(msg);
        },
        getState: function () {
            return state;
        },
        setState: function (next) {
            state = next;
        }
    };

    window.acquireVsCodeApi = function () {
        return vscodeApi;
    };

    const bridgeDefaults = {
        getSharedObjectSnapshotValue: function (key) {
            return sharedObjects.get(key);
        },
        getBuildFlavor: function () {
            return readMeta('codex-build-flavor') || BUILD_FLAVOR;
        },
        getAppSessionId: function () {
            return appSessionId;
        },
        getSentryInitOptions: function () {
            return {
                appVersion: EXTENSION_VERSION,
                buildFlavor: readMeta('codex-build-flavor') || BUILD_FLAVOR,
                codexAppSessionId: appSessionId,
                extensionVersion: EXTENSION_VERSION
            };
        },
        getPathForFile: function (file) {
            return file && (file.path || file.fsPath || file.name) || null;
        },
        getSystemThemeVariant: getSystemThemeVariant,
        subscribeToSystemThemeVariant: function (listener) {
            themeVariantListeners.add(listener);
            if (!window.matchMedia) {
                return function () {
                    themeVariantListeners.delete(listener);
                };
            }
            const media = window.matchMedia('(prefers-color-scheme: dark)');
            const wrapped = function () {
                if (!hostThemeVariant) {
                    listener(getSystemThemeVariant());
                }
            };
            if (media.addEventListener) {
                media.addEventListener('change', wrapped);
                return function () {
                    themeVariantListeners.delete(listener);
                    media.removeEventListener('change', wrapped);
                };
            }
            media.addListener(wrapped);
            return function () {
                themeVariantListeners.delete(listener);
                media.removeListener(wrapped);
            };
        }
    };

    window.electronBridge = Object.assign({}, bridgeDefaults, window.electronBridge || {});
    window.__CODEX_THEIA_BRIDGE__ = { appSessionId: appSessionId, buildFlavor: BUILD_FLAVOR, webviewId: webviewId };
    postToHost({ type: 'webview-ready' });
})();
