import { expect } from 'chai';
import { redactFlowSecretsText, redactFlowSecretsValue } from './flow-secret-redaction';

describe('Flow secret redaction', () => {

    it('redacts common secret shapes in text', () => {
        const redacted = redactFlowSecretsText([
            'token=secret-value',
            'OPENAI_API_KEY=REDACTED_OPENAI_KEY',
            'password: supersecret',
            'Authorization: Bearer GITHUB_TOKEN_EXAMPLE',
            'EXAMPLE_PRIVATE_KEY_BLOCK',
            'Server=db;Database=app;User Id=admin;Password=connectionsecret;'
        ].join('\n'));

        expect(redacted).to.contain('token=[REDACTED]');
        expect(redacted).to.contain('OPENAI_API_KEY=[REDACTED]');
        expect(redacted).to.contain('password: [REDACTED]');
        expect(redacted).to.contain('Bearer [REDACTED]');
        expect(redacted).to.contain('[REDACTED]');
        expect(redacted).to.not.contain('secret-value');
        expect(redacted).to.not.contain('REDACTED_OPENAI_KEY');
        expect(redacted).to.not.contain('supersecret');
        expect(redacted).to.not.contain('very-private-material');
        expect(redacted).to.not.contain('connectionsecret');
    });

    it('redacts nested JSON values without changing shape', () => {
        const redacted = redactFlowSecretsValue({
            prompt: 'Use token=abcdefghijklmnopqrst',
            effects: [{ stdout: 'password=verysecretvalue' }]
        });

        expect(redacted).to.deep.equal({
            prompt: 'Use token=[REDACTED]',
            effects: [{ stdout: 'password=[REDACTED]' }]
        });
    });
});
