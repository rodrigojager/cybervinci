"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlowSizeLimits = void 0;
exports.flowByteLength = flowByteLength;
exports.truncateFlowText = truncateFlowText;
exports.limitFlowJsonValue = limitFlowJsonValue;
exports.limitFlowJsonString = limitFlowJsonString;
exports.FlowSizeLimits = {
    promptBytes: 64 * 1024,
    contextPackBytes: 256 * 1024,
    artifactBytes: 1024 * 1024,
    eventPayloadBytes: 64 * 1024,
    commandOutputBytes: 64 * 1024,
    reportBytes: 512 * 1024,
    resultJsonBytes: 1024 * 1024
};
var encoder = new TextEncoder();
function flowByteLength(value) {
    return encoder.encode(value).length;
}
function truncateFlowText(value, maxBytes, label) {
    if (flowByteLength(value) <= maxBytes) {
        return value;
    }
    var marker = "\n\n[Flow truncated ".concat(label, " to ").concat(maxBytes, " bytes.]\n");
    var markerBytes = flowByteLength(marker);
    var target = Math.max(0, maxBytes - markerBytes);
    var used = 0;
    var out = '';
    for (var _i = 0, value_1 = value; _i < value_1.length; _i++) {
        var char = value_1[_i];
        var next = flowByteLength(char);
        if (used + next > target) {
            break;
        }
        out += char;
        used += next;
    }
    return out + marker;
}
function limitFlowJsonValue(value, maxBytes, label) {
    var json = JSON.stringify(value);
    var bytes = flowByteLength(json);
    if (bytes <= maxBytes) {
        return value;
    }
    return {
        truncated: true,
        label: label,
        maxBytes: maxBytes,
        originalBytes: bytes
    };
}
function limitFlowJsonString(value, maxBytes, label) {
    var json = "".concat(JSON.stringify(value, undefined, 2), "\n");
    if (flowByteLength(json) <= maxBytes) {
        return json;
    }
    return "".concat(JSON.stringify(limitFlowJsonValue(value, maxBytes, label), undefined, 2), "\n");
}
