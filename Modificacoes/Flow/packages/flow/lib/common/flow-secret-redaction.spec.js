"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var flow_secret_redaction_1 = require("./flow-secret-redaction");
describe('Flow secret redaction', function () {
    it('redacts common secret shapes in text', function () {
        var redacted = (0, flow_secret_redaction_1.redactFlowSecretsText)([
            'token=secret-value',
            'OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz',
            'password: supersecret',
            'Authorization: Bearer ghp_abcdefghijklmnopqrstuvwxyz',
            '-----BEGIN PRIVATE KEY-----\nvery-private-material\n-----END PRIVATE KEY-----',
            'Server=db;Database=app;User Id=admin;Password=connectionsecret;'
        ].join('\n'));
        (0, chai_1.expect)(redacted).to.contain('token=[REDACTED]');
        (0, chai_1.expect)(redacted).to.contain('OPENAI_API_KEY=[REDACTED]');
        (0, chai_1.expect)(redacted).to.contain('password: [REDACTED]');
        (0, chai_1.expect)(redacted).to.contain('Bearer [REDACTED]');
        (0, chai_1.expect)(redacted).to.contain('[REDACTED]');
        (0, chai_1.expect)(redacted).to.not.contain('secret-value');
        (0, chai_1.expect)(redacted).to.not.contain('sk-abcdefghijklmnopqrstuvwxyz');
        (0, chai_1.expect)(redacted).to.not.contain('supersecret');
        (0, chai_1.expect)(redacted).to.not.contain('very-private-material');
        (0, chai_1.expect)(redacted).to.not.contain('connectionsecret');
    });
    it('redacts nested JSON values without changing shape', function () {
        var redacted = (0, flow_secret_redaction_1.redactFlowSecretsValue)({
            prompt: 'Use token=abcdefghijklmnopqrst',
            effects: [{ stdout: 'password=verysecretvalue' }]
        });
        (0, chai_1.expect)(redacted).to.deep.equal({
            prompt: 'Use token=[REDACTED]',
            effects: [{ stdout: 'password=[REDACTED]' }]
        });
    });
});
