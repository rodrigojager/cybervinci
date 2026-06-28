// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import * as chai from 'chai';
import { CodexFetchProxyService } from './codex-fetch-proxy-service';

const expect = chai.expect;

describe('CodexFetchProxyService', () => {
    it('serves neutral ChatGPT web fallbacks without hitting Cloudflare', async () => {
        const service = new CodexFetchProxyService();

        const response = await service.fetch({
            requestId: 'tasks',
            method: 'GET',
            url: '/wham/tasks/list?limit=20&task_filter=current'
        });

        expect(response.responseType).to.equal('success');
        expect(response.status).to.equal(200);
        expect(JSON.parse(response.bodyJsonString ?? '{}')).to.deep.equal({ items: [], cursor: null });
    });

    it('returns JSON for Statsig calls that expect parseable payloads', async () => {
        const service = new CodexFetchProxyService();

        const response = await service.fetch({
            requestId: 'statsig',
            method: 'POST',
            url: 'https://ab.chatgpt.com/v1/initialize'
        });

        expect(response.responseType).to.equal('success');
        expect(response.status).to.equal(200);
        expect(JSON.parse(response.bodyJsonString ?? '')).to.include({ has_updates: false });
    });
});
