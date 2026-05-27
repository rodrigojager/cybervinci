// *****************************************************************************
// Copyright (C) 2026 CyberVinci contributors.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect, test, type Locator } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TheiaApp } from '../theia-app';
import { TheiaAppLoader } from '../theia-app-loader';

test.describe('Flow', () => {

    let app: TheiaApp;

    test.beforeAll(async ({ playwright, browser }) => {
        app = await TheiaAppLoader.load({ playwright, browser });
        await app.page.setViewportSize({ width: 1440, height: 1000 });
    });

    test.afterAll(async () => {
        await app.page.close();
    });

    test('creates a workflow from a template and captures the visible desktop canvas', async () => {
        await ensureFlowOpen();

        const studio = app.page.locator('.flow');
        await expect(studio).toBeVisible();

        await app.page.getByLabel('Workflow template').selectOption('contracted_parallel_delivery');
        await app.page.getByTitle('Create workflow from template').click();

        const canvas = app.page.locator('.flow__flow').first();
        await expect(canvas).toBeVisible();
        await expect(canvas).toHaveAttribute('aria-label', /Contracted Parallel Delivery workflow canvas/);
        expect(await app.page.locator('.flow__flow-node').count()).toBeGreaterThanOrEqual(9);
        await expect(app.page.locator('.flow__flow-edge')).not.toHaveCount(0);
        await expect(app.page.getByText('contracted_parallel_delivery')).toBeVisible();
        await expect(canvas.getByText('Contract Design')).toBeVisible();
        await expect(canvas.getByText('Parallel Delivery')).toBeVisible();
        await expect(canvas.getByText('Final Report')).toBeVisible();

        await studio.screenshot({ path: test.info().outputPath('flow-desktop.png') });
    });

    test('runs workflow through external kernel protocol and human gate updates', async () => {
        await ensureFlowOpen();

        const studio = app.page.locator('.flow');
        await expect(studio).toBeVisible();

        await app.page.getByLabel('Workflow template').selectOption('human_approval_gate');
        await app.page.getByTitle('Create workflow from template').click();
        await expect(app.page.getByText('template_human_approval_gate')).toBeVisible();

        await app.page.getByTitle('Start run').click();
        await expect(app.page.getByLabel('Run observability').getByText('Status')).toBeVisible();
        await expect(app.page.getByLabel('Run observability').getByText('Kernel externo')).toBeVisible();
        await expect(app.page.getByLabel('Flow runtime status').getByText('Event stream')).toBeVisible();

        await tickUntilGateIsPending();

        const inspector = app.page.locator('.flow__inspector');
        await expect(inspector.getByText('human_gate')).toBeVisible();
        await expect(inspector.getByText('Approve execution')).toBeVisible();
        await expect(inspector.locator('.flow__gate').filter({ hasText: 'pending' })).toBeVisible();

        const kanban = app.page.getByLabel('Workloads');
        await expect(kanban.getByText('plan')).toBeVisible();
        await expect(kanban.getByText('planner')).toBeVisible();
        await expect(kanban.getByText(/artifacts/)).toBeVisible();

        const eventLog = app.page.getByLabel('Run events');
        await expect(eventLog.getByText('gate.created')).toBeVisible();
        await expect(eventLog.getByText('Human gate "Approve execution" is waiting.')).toBeVisible();

        await inspector.getByRole('button', { name: 'Approve' }).click();
        await expect(inspector.locator('.flow__gate').filter({ hasText: 'approved' })).toBeVisible();
        await expect(eventLog.getByText('gate.approved')).toBeVisible();
        await expect(eventLog.getByText('Gate "Approve execution" approved.')).toBeVisible();

        await tickUntilRunTextIsVisible(kanban.getByText('execution'));
        await expect(kanban.getByText('executor')).toBeVisible();
        await expect(app.page.getByLabel('Run observability').getByText(/running|completed/)).toBeVisible();
    });

    test('creates, persists, reloads, and streams an external-kernel workflow without manual refresh', async () => {
        await ensureFlowOpen();

        const studio = app.page.locator('.flow');
        await expect(studio).toBeVisible();

        await app.page.getByLabel('Workflow template').selectOption('simple_specialist');
        await app.page.getByTitle('Create workflow from template').click();
        await expect(app.page.getByText('template_simple_specialist')).toBeVisible();

        const canvas = app.page.locator('.flow__flow').first();
        await expect(canvas).toBeVisible();
        await canvas.getByTitle('Drag to add report state').click();

        const finalReportNode = canvas.locator('.flow__flow-node[title="final_report: report"]');
        const addedReportNode = canvas.locator('.flow__flow-node[title="report: report"]');
        await expect(finalReportNode).toBeVisible();
        await expect(addedReportNode).toBeVisible();

        await finalReportNode.getByLabel('Start transition from final_report').click();
        await addedReportNode.getByLabel('Connect final_report to report').click();
        await expect(canvas.getByLabel('Transition final_report to report on workload.completed')).toBeVisible();

        await app.page.getByTitle('Save workflow file').first().click();
        const savePreview = app.page.getByLabel('Workflow structural save preview');
        await expect(savePreview).toBeVisible();
        await expect(savePreview.getByText('final_report_to_report')).toBeVisible();
        await savePreview.getByRole('button', { name: 'Save changes' }).click();
        await expect(savePreview).toBeHidden();

        await app.page.getByTitle('Reload workflow file').click();
        await expect(canvas.locator('.flow__flow-node[title="report: report"]')).toBeVisible();
        await expect(canvas.getByLabel('Transition final_report to report on workload.completed')).toBeVisible();

        let forbiddenManualRefresh = false;
        app.page.on('request', request => {
            const body = request.postData() || '';
            if (body.includes('refresh') || body.includes('tickRun') || body.includes('tick_run')) {
                forbiddenManualRefresh = true;
            }
        });

        await app.page.getByTitle('Start run').click();

        const observability = app.page.getByLabel('Run observability');
        await expect(observability.getByText('Status')).toBeVisible();
        await expect(observability.getByText('Kernel externo')).toBeVisible();
        await expect(app.page.getByLabel('Flow runtime status').getByText('Event stream')).toBeVisible();
        await expect(app.page.getByTitle('Tick disabled while kernel event stream is active')).toBeDisabled();

        const eventLog = app.page.getByLabel('Run events');
        await expect(eventLog.getByText('run.started')).toBeVisible();
        await expect(eventLog.getByText(/workload\.completed|run\.completed/)).toBeVisible({ timeout: 10000 });
        await expect(app.page.getByLabel('Workloads').getByText(/done|running/)).toBeVisible();

        expect(forbiddenManualRefresh).toBe(false);
        await studio.screenshot({ path: test.info().outputPath('flow-event-stream.png') });
    });

    test('opens artifact viewer previews for Markdown report and JSON result artifacts', async () => {
        await ensureFlowOpen();

        const studio = app.page.locator('.flow');
        await expect(studio).toBeVisible();

        await app.page.getByLabel('Workflow template').selectOption('simple_specialist');
        await app.page.getByTitle('Create workflow from template').click();
        await expect(app.page.getByText('template_simple_specialist')).toBeVisible();

        await app.page.getByTitle('Start run').click();

        const artifactBrowser = app.page.locator('.flow__artifact-browser');
        await expect(artifactBrowser).toBeVisible();

        const reportArtifact = artifactBrowser.locator('.flow__artifact-selector-item').filter({ hasText: 'report.md' }).first();
        await expect(reportArtifact).toBeVisible({ timeout: 10000 });
        await expect(reportArtifact).toContainText('Markdown report');
        await reportArtifact.click();

        const viewer = artifactBrowser.locator('.flow__artifact-viewer');
        await expect(viewer).toBeVisible();
        await expect(viewer).toContainText('report.md');
        await expect(viewer.locator('.flow__artifact-markdown')).toBeVisible();
        await expect(viewer.locator('.flow__artifact-markdown')).toContainText('Workload Report');
        await expect(viewer.locator('.flow__artifact-markdown')).toContainText('specialist');

        const resultArtifact = artifactBrowser.locator('.flow__artifact-selector-item').filter({ hasText: 'result.json' }).first();
        await expect(resultArtifact).toBeVisible();
        await expect(resultArtifact).toContainText('JSON result');
        await resultArtifact.click();

        await expect(viewer).toContainText('result.json');
        const jsonPreview = viewer.locator('.flow__artifact-json pre');
        await expect(jsonPreview).toBeVisible();
        await expect(jsonPreview).toContainText('"status": "completed"');
        await expect(jsonPreview).toContainText('"artifacts"');
        await expect(jsonPreview).toContainText('"reports/result.json"');

        await studio.screenshot({ path: test.info().outputPath('flow-artifact-viewer.png') });
    });

    test('runs Contracted Parallel Delivery with provider-level E2E mock over the external kernel protocol', async () => {
        test.setTimeout(120000);
        await ensureFlowOpen();

        const studio = app.page.locator('.flow');
        await expect(studio).toBeVisible();

        await selectWorkflowTemplate('contracted_parallel_delivery');
        await app.page.getByTitle('Create workflow from template').click();
        await expect(app.page.getByText('template_contracted_parallel_delivery')).toBeVisible();
        await configureCpdE2eMockCapabilities();

        await app.page.getByLabel('Run prompt').fill('E2E mock: deliver a contracted feature with one QA repair.');
        await app.page.getByTitle('Start run').click();

        const observability = app.page.getByLabel('Run observability');
        await expect(observability.getByText('Kernel externo')).toBeVisible();
        await expect(observability.getByText('Mock Memory context pack')).toBeVisible();
        const runtimeStatus = app.page.getByLabel('Flow runtime status');
        await expect(runtimeStatus.getByText('Event stream')).toBeVisible();
        await expect(runtimeStatus.getByText('E2E mock explicito')).toBeVisible();
        await expect(runtimeStatus.getByText('LLM provider')).toBeVisible();
        await expect(runtimeStatus.getByText('mock')).toBeVisible();
        await expect(runtimeStatus.getByText('llm.agent.execute')).toBeVisible();
        await expect(runtimeStatus.getByText('filesystem.edit: blocked / policy missing')).toBeVisible();
        if (await imageProviderIsConfigured(runtimeStatus)) {
            await expect(runtimeStatus.getByText('image.generate: available / provider configured')).toBeVisible();
        } else {
            await expect(runtimeStatus.getByText('image.generate: unavailable / provider missing')).toBeVisible();
        }

        const eventLog = app.page.getByLabel('Run events');
        await expect(eventLog.getByText('run.started')).toBeVisible();
        await expect(eventLog.getByText('workload.started')).toBeVisible();
        await tickUntilGateIsPending();

        const inspector = app.page.locator('.flow__inspector');
        await expect(inspector.getByText('Approve delivery contract')).toBeVisible();
        await expect(eventLog.getByText('gate.created')).toBeVisible();
        await inspector.getByRole('button', { name: 'Approve' }).click();
        await expect(inspector.locator('.flow__gate').filter({ hasText: 'approved' })).toBeVisible();

        await expect(eventLog.getByText('gate.approved')).toBeVisible();
        await tickUntilRunTextIsVisible(app.page.getByLabel('Workloads').getByText('backend_work'));
        await tickUntilRunTextIsVisible(app.page.getByLabel('Workloads').getByText('frontend_work'));
        await tickUntilRunTextIsVisible(app.page.getByLabel('Workloads').getByText('designer_work'));
        await expect(eventLog.getByText('artifact.created').first()).toBeVisible();
        await expect(eventLog.getByText('signal.emitted').first()).toBeVisible();
        await tickUntilRunTextIsVisible(eventLog.getByText('qa_failed_to_repair_loop'));
        await tickUntilRunTextIsVisible(eventLog.getByText('repair_loop_to_qa'));
        await tickUntilRunTextIsVisible(eventLog.getByText('qa_passed_to_final_report'));
        await tickUntilRunTextIsVisible(observability.getByText('completed'));

        const artifactBrowser = app.page.locator('.flow__artifact-browser');
        await expect(artifactBrowser).toContainText('contracts/contracts.json');
        await expect(artifactBrowser).toContainText('delivery/backend.md');
        await expect(artifactBrowser).toContainText('delivery/frontend.md');
        await expect(artifactBrowser).toContainText('delivery/design-assets.md');
        await expect(artifactBrowser).toContainText('qa/report.md');
        await expect(artifactBrowser).toContainText('final/report.md');

        const finalReport = observability.locator('.flow__final-report-summary');
        await expect(finalReport).toContainText('Relatorio final');
        await expect(finalReport.getByLabel('Final report metrics')).toContainText('Workloads');
        await expect(finalReport).toContainText('Mock QA failed before repair.');

        await expect(eventLog.getByText('run.completed')).toBeVisible();
        await finalReport.screenshot({ path: test.info().outputPath('flow-cpd-final-report.png') });
        await studio.screenshot({ path: test.info().outputPath('flow-contracted-parallel-delivery-e2e.png') });
    });

    test('blocks an image effect workflow when the image provider is absent', async () => {
        test.setTimeout(60000);
        await ensureFlowOpen();

        const runtimeStatus = app.page.getByLabel('Flow runtime status');
        test.skip(await imageProviderIsConfigured(runtimeStatus), 'Image provider is configured for this E2E run.');

        await selectWorkflowTemplate('contracted_parallel_delivery');
        await app.page.getByTitle('Create workflow from template').click();
        await expect(app.page.getByText('template_contracted_parallel_delivery')).toBeVisible();
        await configureCpdE2eMockCapabilities({ imageGenerate: true });

        await expect(runtimeStatus.getByText('image.generate: unavailable / provider missing')).toBeVisible();
        await app.page.getByLabel('Run prompt').fill('E2E mock: require an image effect without an image provider.');
        await app.page.getByTitle('Start run').click();

        await expect(app.page.locator('.flow__error')).toContainText('Missing required host capabilities');
        await expect(app.page.locator('.flow__error')).toContainText('image.generate');
        await expect(app.page.getByLabel('Run events').getByText('run.started')).toHaveCount(0);
    });

    test('reviews and applies a provider image effect with mock provider, artifact, event, and final report evidence', async () => {
        test.setTimeout(120000);
        await ensureFlowOpen();

        const runtimeStatus = app.page.getByLabel('Flow runtime status');
        test.skip(!await imageProviderIsConfigured(runtimeStatus), 'Set FLOW_E2E_IMAGE_PROVIDER_MOCK=1 to run image provider E2E coverage.');

        const studio = app.page.locator('.flow');
        await expect(studio).toBeVisible();

        await selectWorkflowTemplate('contracted_parallel_delivery');
        await app.page.getByTitle('Create workflow from template').click();
        await expect(app.page.getByText('template_contracted_parallel_delivery')).toBeVisible();
        await configureCpdE2eMockCapabilities({ imageGenerate: true });

        await expect(runtimeStatus.getByText('image.generate: available / provider configured')).toBeVisible();
        await app.page.getByLabel('Run prompt').fill('E2E mock: propose a reviewed image effect and apply it after approval.');
        await app.page.getByTitle('Start run').click();

        const eventLog = app.page.getByLabel('Run events');
        await tickUntilGateIsPending();
        const inspector = app.page.locator('.flow__inspector');
        await inspector.getByRole('button', { name: 'Approve' }).click();
        await expect(eventLog.getByText('gate.approved')).toBeVisible();

        await tickUntilRunTextIsVisible(eventLog.getByText('effect.proposed'));

        const effectReview = app.page.getByLabel('Effect review');
        const imageEffect = effectReview.locator('.flow__effect-card').filter({ hasText: 'images/feature-icon.png' });
        await expect(imageEffect).toBeVisible();
        await expect(imageEffect).toContainText('image / proposed');
        await expect(imageEffect).toContainText('human_gate_required');
        await expect(imageEffect).toContainText('Generate an auditable E2E image effect.');

        await imageEffect.getByPlaceholder('Approval/rejection note').fill('Approved by E2E image effect review.');
        await imageEffect.getByRole('button', { name: 'Apply' }).click();
        await expect(imageEffect).toContainText('image / applied');

        await expect(eventLog.getByText('effect.applied')).toBeVisible();
        await expect(eventLog.getByText(/Effect applied for ".*images\/feature-icon\.png"/)).toBeVisible();

        const artifactBrowser = app.page.locator('.flow__artifact-browser');
        await expect(artifactBrowser).toContainText('images/feature-icon.png');
        await expect.poll(async () => findWorkspaceFileContent('feature-icon.png')).toBe('flow-e2e-image');

        await app.page.getByTitle('Finalize run with report').click();
        const finalReport = app.page.getByLabel('Run observability').locator('.flow__final-report-summary');
        await expect(finalReport).toContainText('Relatorio final');
        await expect(finalReport).toContainText('Effects');
        await expect(finalReport).toContainText('Generate an auditable E2E image effect.');
        await expect(finalReport).toContainText('image/applied');

        await studio.screenshot({ path: test.info().outputPath('flow-image-effect-review-e2e.png') });
    });

    test('reviews and applies a provider file effect with diff, artifact, event, and final report evidence', async () => {
        test.setTimeout(120000);
        await ensureFlowOpen();

        const studio = app.page.locator('.flow');
        await expect(studio).toBeVisible();

        await selectWorkflowTemplate('contracted_parallel_delivery');
        await app.page.getByTitle('Create workflow from template').click();
        await expect(app.page.getByText('template_contracted_parallel_delivery')).toBeVisible();
        await configureCpdE2eMockCapabilities({ filesystemEdit: true });

        await app.page.getByLabel('Run prompt').fill('E2E mock: propose a reviewed file effect and apply it after approval.');
        await app.page.getByTitle('Start run').click();

        const eventLog = app.page.getByLabel('Run events');
        await tickUntilGateIsPending();
        const inspector = app.page.locator('.flow__inspector');
        await inspector.getByRole('button', { name: 'Approve' }).click();
        await expect(eventLog.getByText('gate.approved')).toBeVisible();

        await tickUntilRunTextIsVisible(eventLog.getByText('effect.proposed'));

        const effectReview = app.page.getByLabel('Effect review');
        const fileEffect = effectReview.locator('.flow__effect-card').filter({ hasText: 'src/flow-e2e-effect.txt' });
        await expect(fileEffect).toBeVisible();
        await expect(fileEffect).toContainText('file / proposed');
        await expect(fileEffect).toContainText('human_gate_required');
        await expect(fileEffect.locator('.flow__patch-viewer')).toContainText('+++ b/src/flow-e2e-effect.txt');
        await expect(fileEffect.locator('.flow__patch-viewer')).toContainText('+Flow E2E file effect applied.');

        await fileEffect.getByPlaceholder('Approval/rejection note').fill('Approved by E2E effect review.');
        await fileEffect.getByRole('button', { name: 'Apply' }).click();
        await expect(fileEffect).toContainText('file / applied');

        const appliedFile = path.join(app.workspace.path, 'src', 'flow-e2e-effect.txt');
        await expect.poll(async () => fs.readFile(appliedFile, 'utf8').catch(() => '')).toContain('Flow E2E file effect applied.');

        await expect(eventLog.getByText('effect.applied')).toBeVisible();
        await expect(eventLog.getByText('Effect applied for "src/flow-e2e-effect.txt".')).toBeVisible();

        const artifactBrowser = app.page.locator('.flow__artifact-browser');
        await expect(artifactBrowser).toContainText('effects/');
        await expect(artifactBrowser).toContainText('-applied.diff');

        await app.page.getByTitle('Finalize run with report').click();
        const finalReport = app.page.getByLabel('Run observability').locator('.flow__final-report-summary');
        await expect(finalReport).toContainText('Relatorio final');
        await expect(finalReport).toContainText('Effects');
        await expect(finalReport).toContainText('Create an auditable E2E file effect.');
        await expect(finalReport).toContainText('file/applied');

        await studio.screenshot({ path: test.info().outputPath('flow-effect-review-e2e.png') });
    });

    test('approves memory candidate write through mocked Memory', async () => {
        await ensureFlowOpen();

        const studio = app.page.locator('.flow');
        await expect(studio).toBeVisible();

        await app.page.getByLabel('Workflow template').selectOption('memory_consolidation');
        await app.page.getByTitle('Create workflow from template').click();
        await expect(app.page.getByText('template_memory_consolidation')).toBeVisible();

        await app.page.getByTitle('Start run').click();

        const observability = app.page.getByLabel('Run observability');
        await expect(observability.getByText(/Mock Memory context pack/)).toBeVisible();

        await tickUntilGateIsPending();

        const inspector = app.page.locator('.flow__inspector');
        await expect(inspector.getByText('Approve memory write')).toBeVisible();
        await inspector.getByRole('button', { name: 'Approve' }).click();
        await expect(inspector.locator('.flow__gate').filter({ hasText: 'approved' })).toBeVisible();

        const memoryCandidate = observability.locator('.flow__memory-candidate').first();
        await tickUntilMemoryCandidateIsVisible(memoryCandidate);
        await expect(memoryCandidate).toContainText('summary / candidate');
        await expect(memoryCandidate).toContainText('A workflow step proposed a memory_write effect.');

        await memoryCandidate.getByRole('button', { name: 'Review' }).click();
        const content = memoryCandidate.getByLabel(/Memory candidate .* content/);
        await content.fill('Persist the approved Flow memory candidate from the E2E mock.');
        await memoryCandidate.getByRole('combobox').selectOption('project');
        await memoryCandidate.getByPlaceholder('Memory target').fill('flow-e2e');
        await memoryCandidate.getByRole('button', { name: 'Write' }).click();

        await expect(memoryCandidate).toContainText('summary / written');

        const memoryWrites = observability.locator('.flow__run-list').filter({ hasText: 'Memory writes' });
        await expect(memoryWrites).toContainText('written / flow-e2e');
        await expect(memoryWrites).toContainText('Persist the approved Flow memory candidate from the E2E mock.');

        const eventLog = app.page.getByLabel('Run events');
        await expect(eventLog.getByText('memory_write.approved')).toBeVisible();
        await expect(eventLog.getByText('memory_write.written')).toBeVisible();
        await expect(eventLog.getByText(/written to Memory memory/)).toBeVisible();

        await memoryWrites.screenshot({ path: test.info().outputPath('flow-memory-write.png') });
        await studio.screenshot({ path: test.info().outputPath('flow-memory-candidate-approval.png') });
    });

    test('persists editable canvas add state and transition after workflow reload', async () => {
        await ensureFlowOpen();

        const studio = app.page.locator('.flow');
        await expect(studio).toBeVisible();

        await app.page.getByLabel('Workflow template').selectOption('simple_specialist');
        await app.page.getByTitle('Create workflow from template').click();
        await expect(app.page.getByText('template_simple_specialist')).toBeVisible();

        const canvas = app.page.locator('.flow__flow').first();
        await expect(canvas).toBeVisible();
        await canvas.getByTitle('Drag to add report state').click();

        const finalReportNode = canvas.locator('.flow__flow-node[title="final_report: report"]');
        const addedReportNode = canvas.locator('.flow__flow-node[title="report: report"]');
        await expect(finalReportNode).toBeVisible();
        await expect(addedReportNode).toBeVisible();

        await finalReportNode.getByLabel('Start transition from final_report').click();
        await addedReportNode.getByLabel('Connect final_report to report').click();

        const addedTransition = canvas.getByLabel('Transition final_report to report on workload.completed');
        await expect(addedTransition).toBeVisible();

        await app.page.getByTitle('Save workflow file').first().click();
        const savePreview = app.page.getByLabel('Workflow structural save preview');
        await expect(savePreview).toBeVisible();
        await expect(savePreview.getByText('report')).toBeVisible();
        await expect(savePreview.getByText('final_report_to_report')).toBeVisible();
        await savePreview.getByRole('button', { name: 'Save changes' }).click();
        await expect(savePreview).toBeHidden();

        await app.page.getByTitle('Reload workflow file').click();
        await expect(canvas.locator('.flow__flow-node[title="report: report"]')).toBeVisible();
        await expect(canvas.getByLabel('Transition final_report to report on workload.completed')).toBeVisible();
    });

    async function ensureFlowOpen(): Promise<void> {
        const existing = app.page.locator('.flow');
        if (await existing.isVisible().catch(() => false)) {
            return;
        }
        const opened = await app.page.evaluate(async () => {
            type TheiaWindow = Window & {
                theia?: {
                    container?: { get: (service: unknown) => { executeCommand: (id: string) => Promise<unknown> } };
                    [module: string]: unknown;
                };
            };
            const theia = (window as TheiaWindow).theia;
            const commandModule = theia?.['@theia/core/lib/common/command'] as { CommandService?: unknown } | undefined;
            if (!theia?.container || !commandModule?.CommandService) {
                return false;
            }
            await theia.container.get(commandModule.CommandService).executeCommand('flow.open');
            return true;
        }).catch(() => false);
        if (!opened) {
            await app.quickCommandPalette.type('Flow: Open');
            await app.quickCommandPalette.trigger('Flow: Open');
        }
        await expect(existing).toBeVisible({ timeout: 15000 });
        await expect(app.page.getByLabel('Workflow template')).toBeEnabled({ timeout: 30000 });
    }

    async function selectWorkflowTemplate(templateId: string): Promise<void> {
        const selector = app.page.getByLabel('Workflow template');
        await expect(selector).toBeEnabled({ timeout: 30000 });
        await expect(selector.locator(`option[value="${templateId}"]`)).toHaveCount(1, { timeout: 30000 });
        await selector.selectOption(templateId);
    }

    async function configureCpdE2eMockCapabilities(options: { filesystemEdit?: boolean; imageGenerate?: boolean } = {}): Promise<void> {
        const source = app.page.getByLabel('Workflow JSON source');
        await expect(source).toBeVisible();
        const workflow = JSON.parse(await source.inputValue()) as { requires?: { capabilities?: string[] } };
        const capabilities = [
            'llm.agent.execute.e2e_mock',
            'host.demo_mode.e2e',
            'kernel.bridge.external',
            'run.event_stream',
            'memory.context',
            'human.approval',
            'filesystem.artifacts'
        ];
        if (options.filesystemEdit) {
            capabilities.push('filesystem.edit');
        }
        if (options.imageGenerate) {
            capabilities.push('image.generate');
        }
        workflow.requires = {
            ...workflow.requires,
            capabilities
        };
        await source.fill(JSON.stringify(workflow, null, 2));
        await app.page.getByTitle('Apply JSON to workflow').click();
        await expect(app.page.getByLabel('Workflow JSON editor').getByText('valid')).toBeVisible();
        await expect(source).toHaveValue(/llm\.agent\.execute\.e2e_mock/);
        await expect(source).not.toHaveValue(/"llm\.agent\.execute"/);
        if (options.filesystemEdit) {
            await expect(source).toHaveValue(/"filesystem\.edit"/);
        } else {
            await expect(source).not.toHaveValue(/"filesystem\.edit"/);
        }
        if (options.imageGenerate) {
            await expect(source).toHaveValue(/"image\.generate"/);
        } else {
            await expect(source).not.toHaveValue(/"image\.generate"/);
        }
    }

    async function imageProviderIsConfigured(runtimeStatus: Locator): Promise<boolean> {
        return runtimeStatus.getByText('image.generate: available / provider configured').isVisible().catch(() => false);
    }

    async function findWorkspaceFileContent(fileName: string): Promise<string> {
        const root = path.join(app.workspace.path, '.theia', 'flow', 'runs');
        return findFileContent(root, fileName);
    }

    async function findFileContent(directory: string, fileName: string): Promise<string> {
        const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
        for (const entry of entries) {
            const fullPath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                const nested = await findFileContent(fullPath, fileName);
                if (nested) {
                    return nested;
                }
            } else if (entry.name === fileName) {
                return fs.readFile(fullPath, 'utf8');
            }
        }
        return '';
    }

    async function tickUntilGateIsPending(): Promise<void> {
        const gate = app.page.locator('.flow__gate').filter({ hasText: 'pending' });
        for (let attempt = 0; attempt < 6; attempt++) {
            if (await gate.isVisible().catch(() => false)) {
                return;
            }
            const tick = app.page.getByTitle('Tick run manually (fallback)');
            if (await tick.isEnabled().catch(() => false)) {
                await tick.click();
            }
            await app.page.waitForTimeout(100);
        }
        await expect(gate).toBeVisible();
    }

    async function tickUntilMemoryCandidateIsVisible(memoryCandidate: Locator): Promise<void> {
        for (let attempt = 0; attempt < 8; attempt++) {
            if (await memoryCandidate.isVisible().catch(() => false)) {
                return;
            }
            const tick = app.page.getByTitle('Tick run manually (fallback)');
            if (await tick.isEnabled().catch(() => false)) {
                await tick.click();
            }
            await app.page.waitForTimeout(150);
        }
        await expect(memoryCandidate).toBeVisible();
    }

    async function tickUntilRunTextIsVisible(locator: Locator): Promise<void> {
        for (let attempt = 0; attempt < 18; attempt++) {
            if (await locator.isVisible().catch(() => false)) {
                return;
            }
            const tick = app.page.getByTitle('Tick run manually (fallback)');
            if (await tick.isEnabled().catch(() => false)) {
                await tick.click();
            }
            await app.page.waitForTimeout(250);
        }
        await expect(locator).toBeVisible();
    }
});
