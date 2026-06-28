#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { pathToFileURL } = require('url');

const packageRoot = path.resolve(__dirname, '..');
const fixturePath = path.join(packageRoot, 'scripts', 'fixtures', 'native-theia-chat-agents.json');
const url = process.env.CYBERVINCI_AI_CHAT_UI_URL || 'http://127.0.0.1:3000';
const timeout = Number(process.env.CYBERVINCI_AI_CHAT_UI_TIMEOUT || 45000);
const expectedNativeAgents = JSON.parse(fs.readFileSync(fixturePath, 'utf8')).agents;
const validateFlowPlaybook = process.argv.includes('--flow-playbook')
  || process.env.CYBERVINCI_AI_CHAT_UI_VALIDATE_FLOW_PLAYBOOK === '1';

function createCanvasQaRealEditorFixture() {
  const dir = path.join(packageRoot, '.ui-smoke');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `canvas-qa-real-${Date.now().toString(36)}.op`);
  const document = {
    version: '0.7.6',
    name: 'Saara Amazon clone real editor smoke',
    activePageId: 'page-1',
    children: [],
    pages: [{
      id: 'page-1',
      name: 'Page 1',
      width: 900,
      height: 900,
      background: '#ffffff',
      gridSize: 20,
      showGrid: true,
      snapToGrid: false,
      children: [
        {
          id: 'header',
          name: 'Saara header',
          type: 'frame',
          x: 0,
          y: 0,
          width: 900,
          height: 96,
          fill: [{ type: 'solid', color: '#111827' }],
          children: []
        },
        {
          id: 'search-input',
          name: 'Search input',
          type: 'text',
          x: 24,
          y: 40,
          width: 320,
          height: 30,
          content: 'Buscar produtos',
          fontSize: 16,
          fill: [{ type: 'solid', color: '#111827' }]
        },
        {
          id: 'search-button-card',
          name: 'Search button oversized card',
          type: 'rectangle',
          x: 80,
          y: 44,
          width: 280,
          height: 82,
          content: 'Botao de busca gigante',
          fill: [{ type: 'solid', color: '#f59e0b' }]
        },
        {
          id: 'long-copy',
          name: 'Long cramped copy',
          type: 'text',
          x: 24,
          y: 150,
          width: 120,
          height: 18,
          content: 'Texto muito longo que nao cabe nessa area pequena e deve gerar overflow visual',
          fontSize: 16,
          fill: [{ type: 'solid', color: '#111827' }]
        },
        {
          id: 'product-card',
          name: 'Produto card',
          type: 'rectangle',
          x: 850,
          y: 220,
          width: 130,
          height: 90,
          content: 'Produto em oferta',
          fill: [{ type: 'solid', color: '#f8fafc' }],
          stroke: { color: '#cbd5e1', width: 1 }
        }
      ]
    }]
  };
  fs.writeFileSync(filePath, `${JSON.stringify(document, null, 2)}\n`);
  return { filePath, dir, uri: pathToFileURL(filePath).href };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function visibleRect(rect) {
  return rect && rect.width > 0 && rect.height > 0;
}

async function pageHasVisibleChat(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('.chat-input-widget')).some(element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  }));
}

async function clickVisibleText(page, text) {
  return page.evaluate(expected => {
    const visible = element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const matches = Array.from(document.querySelectorAll('a, button, span, div'))
      .filter(element => visible(element) && (element.textContent || '').trim() === expected)
      .sort((left, right) => {
        const priority = element => element.tagName === 'A' || element.tagName === 'BUTTON' ? 0 : element.tagName === 'SPAN' ? 1 : 2;
        const leftRect = left.getBoundingClientRect();
        const rightRect = right.getBoundingClientRect();
        return priority(left) - priority(right) || (leftRect.width * leftRect.height) - (rightRect.width * rightRect.height);
      });
    const match = matches[0];
    if (!match) {
      return false;
    }
    match.click();
    return true;
  }, text);
}

async function openCyberVinciChat(page) {
  await delay(6000);
  if (await pageHasVisibleChat(page)) {
    return;
  }
  for (const label of ['Open CyberVinci Chat', 'Open AI Agency Chat']) {
    if (await clickVisibleText(page, label)) {
      try {
        await page.waitForFunction(() => Array.from(document.querySelectorAll('.chat-input-widget')).some(element => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }), { timeout: 12000 });
        return;
      } catch {
        // Try the next public entry point.
      }
    }
  }

  await page.keyboard.down('Control');
  await page.keyboard.down('Shift');
  await page.keyboard.press('P');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Control');
  await delay(500);
  await page.keyboard.type('Open AI Agency Chat');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => Array.from(document.querySelectorAll('.chat-input-widget')).some(element => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }), { timeout: 12000 });
}

async function visibleSelectorCount(page, selector) {
  return page.evaluate(sel => Array.from(document.querySelectorAll(sel)).filter(element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  }).length, selector);
}

async function validateLayout(page, viewportLabel) {
  const result = await page.evaluate(() => {
    const visible = element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const rectOf = element => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      };
    };
    const problems = [];
    const widget = Array.from(document.querySelectorAll('.chat-input-widget')).find(visible);
    if (!widget) {
      return { problems: ['visible chat input widget was not found'] };
    }
    const box = widget.querySelector('.theia-ChatInput-Editor-Box') || widget;
    const boxRect = rectOf(box);
    const toolbars = Array.from(widget.querySelectorAll('.cybervinci-chat-experience-controls[data-cybervinci-contribution="true"]')).filter(visible);
    if (toolbars.length !== 1) {
      problems.push(`expected exactly one visible CyberVinci toolbar, found ${toolbars.length}`);
    }
    for (const control of ['agent-profile', 'chatMode', 'playbook', 'workflow', 'provider', 'model', 'effort', 'variant', 'serviceTier']) {
      if (!Array.from(widget.querySelectorAll(`[data-cybervinci-control="${control}"]`)).some(visible)) {
        problems.push(`missing visible control '${control}'`);
      }
    }
    const workflowText = Array.from(widget.querySelectorAll('[data-cybervinci-control="workflow"]')).find(visible)?.textContent?.trim() || '';
    if (/^Chat\b/.test(workflowText) && !Array.from(widget.querySelectorAll('[data-cybervinci-control="virtual"]')).some(visible)) {
      problems.push("missing visible Direct Chat control 'virtual'");
    }
    if (Array.from(widget.querySelectorAll('[data-cybervinci-control="vision-judge-toggle"], [data-cybervinci-control="vision-provider"], [data-cybervinci-control="vision-model"]')).some(visible)) {
      problems.push('Vision Judge controls must not render in the AI Chat toolbar');
    }
    if (Array.from(widget.querySelectorAll('.theia-capabilities-collapsed-bar .theia-ChatInput-CapabilityChip')).some(visible)) {
      problems.push('collapsed capability chips must not render in the CyberVinci composer');
    }
    if (Array.from(widget.querySelectorAll('.chat-agent-suggestions')).some(visible)) {
      problems.push('chat agent suggestion chips must not render in the CyberVinci composer');
    }
    for (const label of ['Attach elements to context', 'Mention or pin a chat agent', 'Toggle Capabilities Configuration']) {
      if (!Array.from(widget.querySelectorAll(`[aria-label="${label}"]`)).some(visible)) {
        problems.push(`missing native chat action '${label}'`);
      }
    }
    const send = Array.from(widget.querySelectorAll('[aria-label^="Send"]')).find(visible);
    if (!send) {
      problems.push('visible Send button was not found');
    } else {
      const sendRect = rectOf(send);
      if (sendRect.right > boxRect.right + 2 || sendRect.left < boxRect.left - 2) {
        problems.push('Send button is outside the chat input card bounds');
      }
      if (boxRect.right - sendRect.right > 28) {
        problems.push('Send button is not aligned to the right side of the chat input card');
      }
    }
    const boundedElements = Array.from(widget.querySelectorAll([
      '.theia-ChatInput-CapabilityChip',
      '.cybervinci-chat-experience-controls',
      '[data-cybervinci-control]',
      '[aria-label="Attach elements to context"]',
      '[aria-label="Mention or pin a chat agent"]',
      '[aria-label="Toggle Capabilities Configuration"]',
      '[aria-label^="Send"]'
    ].join(','))).filter(visible);
    for (const element of boundedElements) {
      const rect = rectOf(element);
      if (rect.left < boxRect.left - 2 || rect.right > boxRect.right + 2) {
        problems.push(`element overflows chat card: ${element.getAttribute('data-cybervinci-control') || element.getAttribute('aria-label') || element.textContent?.trim() || element.className}`);
      }
    }
    if (box.scrollWidth > box.clientWidth + 2) {
      problems.push(`chat card has horizontal overflow: scrollWidth=${box.scrollWidth}, clientWidth=${box.clientWidth}`);
    }
    return {
      problems,
      box: boxRect,
      controls: boundedElements.length,
      toolbarText: toolbars[0]?.textContent?.trim()
    };
  });
  assert.deepStrictEqual(result.problems, [], `${viewportLabel} layout problems:\n${JSON.stringify(result, null, 2)}`);
  return result;
}

async function clickVisible(page, selector) {
  await page.waitForFunction(sel => Array.from(document.querySelectorAll(sel)).some(element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  }), { timeout }, selector);
  await page.evaluate(sel => {
    const target = Array.from(document.querySelectorAll(sel)).find(element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });
    target?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    target?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    target?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  }, selector);
}

async function setChatInputText(page, text) {
  await page.waitForFunction(() => {
    const visible = element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    return Array.from(document.querySelectorAll('.chat-input-widget'))
      .some(widget => visible(widget) && widget.querySelector('.monaco-editor textarea'));
  }, { timeout });
  const point = await page.evaluate(() => {
    const visible = element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const widget = Array.from(document.querySelectorAll('.chat-input-widget'))
      .find(candidate => visible(candidate) && candidate.querySelector('.monaco-editor textarea'));
    const editor = widget?.querySelector('.monaco-editor') || widget;
    const rect = editor?.getBoundingClientRect();
    return rect ? { x: rect.left + Math.min(24, rect.width / 2), y: rect.top + Math.min(18, rect.height / 2) } : undefined;
  });
  if (point) {
    await page.mouse.click(point.x, point.y);
  }
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  if (text) {
    await page.keyboard.type(text);
  }
}

async function validateAgentSelector(page) {
  await clickVisible(page, '[data-cybervinci-control="agent-profile"]');
  await page.waitForSelector('[data-cybervinci-menu="agent-profile"]', { timeout });
  const menuReport = await page.evaluate(() => {
    const menu = document.querySelector('[data-cybervinci-menu="agent-profile"]');
    const rect = menu.getBoundingClientRect();
    return {
      rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      search: !!menu.querySelector('[data-cybervinci-control="agent-profile-search"]'),
      groups: menu.querySelectorAll('[data-cybervinci-agent-group]').length,
      text: menu.textContent || ''
    };
  });
  assert.ok(menuReport.search, 'Agent selector must include search input');
  assert.ok(menuReport.groups > 0, 'Agent selector must render grouped Agents');
  assert.ok(menuReport.rect.top >= 0, `Agent selector top is clipped: ${JSON.stringify(menuReport)}`);
  assert.ok(menuReport.rect.bottom <= menuReport.viewport.height + 1, `Agent selector bottom is clipped: ${JSON.stringify(menuReport)}`);
  assert.ok(menuReport.rect.left >= 0 && menuReport.rect.right <= menuReport.viewport.width + 1, `Agent selector is outside viewport: ${JSON.stringify(menuReport)}`);

  await clickVisible(page, '[data-cybervinci-agent-group]');
  await page.waitForFunction(() => {
    const menu = document.querySelector('[data-cybervinci-menu="agent-profile"]');
    return !!menu && menu.querySelectorAll('[data-cybervinci-agent-action="favorite"]').length > 0;
  }, { timeout });
  const actionReport = await page.evaluate(() => {
    const menu = document.querySelector('[data-cybervinci-menu="agent-profile"]');
    return {
      favoriteActions: menu.querySelectorAll('[data-cybervinci-agent-action="favorite"]').length,
      editActions: menu.querySelectorAll('[data-cybervinci-agent-action="edit"]').length,
      duplicateActions: menu.querySelectorAll('[data-cybervinci-agent-action="duplicate"]').length,
      origins: menu.querySelectorAll('.theia-ChatInput-AgencyAgentOrigin').length,
      text: menu.textContent || ''
    };
  });
  assert.ok(actionReport.favoriteActions > 0, 'Agent selector must expose favorite actions');
  assert.ok(actionReport.editActions > 0, 'Agent selector must expose source edit actions');
  assert.ok(actionReport.duplicateActions > 0, 'Agent selector must expose duplicate actions');
  assert.ok(actionReport.origins > 0, 'Agent selector must show Agent profile origin paths');

  await page.keyboard.type('architect');
  await page.waitForFunction(() => {
    const menu = document.querySelector('[data-cybervinci-menu="agent-profile"]');
    return !!menu && /Architect/i.test(menu.textContent || '');
  }, { timeout });
  const searchReport = await page.evaluate(() => {
    const menu = document.querySelector('[data-cybervinci-menu="agent-profile"]');
    const optionTexts = Array.from(menu.querySelectorAll('[data-cybervinci-agent-id]')).map(option => (option.textContent || '').trim());
    return { optionTexts, text: menu.textContent || '' };
  });
  assert.ok(searchReport.text.includes('Architect'), 'Agent selector search must find Architect');
  assert.ok(!searchReport.optionTexts.some(text => /^name:/i.test(text)), 'Agent selector options must not repeat redundant "name:" labels');
  await page.keyboard.press('Escape');
}

async function validateProviderMenus(page) {
  await clickVisible(page, '[data-cybervinci-control="provider"]');
  await page.waitForSelector('[data-cybervinci-menu="provider"]', { timeout });
  let report = await menuViewportReport(page, '[data-cybervinci-menu="provider"]');
  assert.ok(report.rect.width <= 260, `Provider menu is wider than needed: ${JSON.stringify(report)}`);
  assert.ok(report.options >= 4, `Provider menu should expose configured providers: ${JSON.stringify(report)}`);
  await page.keyboard.press('Escape');

  await clickVisible(page, '[data-cybervinci-control="model"]');
  await page.waitForSelector('[data-cybervinci-menu="model"]', { timeout });
  report = await menuViewportReport(page, '[data-cybervinci-menu="model"]');
  assert.ok(report.rect.width >= 360, `Model menu is too narrow for model names and badges: ${JSON.stringify(report)}`);
  assert.ok(report.scrollWidth <= report.clientWidth + 2, `Model menu has horizontal overflow: ${JSON.stringify(report)}`);
  await page.keyboard.press('Escape');

  await clickVisible(page, '[data-cybervinci-control="workflow"]');
  await page.waitForSelector('[data-cybervinci-menu="workflow"]', { timeout });
  report = await menuViewportReport(page, '[data-cybervinci-menu="workflow"]');
  assert.ok(/Direct/.test(report.text) && /Saved Flow/.test(report.text) && /Dynamic Workflow/.test(report.text), `Workflow menu options are incomplete: ${JSON.stringify(report)}`);
  await page.keyboard.press('Escape');
}

async function validateRuntimeBridge(page) {
  await page.waitForFunction(() => {
    const diagnostics = window.__cyberVinciAiChatExperienceDiagnostics;
    return !!diagnostics
      && typeof diagnostics.getRuntimeDiagnostics === 'function'
      && typeof diagnostics.runFrontendBridgeSmoke === 'function'
      && typeof diagnostics.runRunInspectorObservabilitySmoke === 'function'
      && typeof diagnostics.startPlaybookPersistenceReloadSmoke === 'function'
      && typeof diagnostics.finishPlaybookPersistenceReloadSmoke === 'function'
      && typeof diagnostics.runCatalogManagerEditingSmoke === 'function'
      && typeof diagnostics.runCanvasDesignQaRealEditorSmoke === 'function';
  }, { timeout });
  const report = await page.evaluate(async () => {
    const diagnosticsApi = window.__cyberVinciAiChatExperienceDiagnostics;
    const diagnostics = await diagnosticsApi.getRuntimeDiagnostics();
    const smoke = await diagnosticsApi.runFrontendBridgeSmoke();
    return { diagnostics, smoke };
  });
  assert.equal(report.diagnostics.frontendClientConnected, true, `Frontend RPC client must be connected: ${JSON.stringify(report)}`);
  assert.equal(report.diagnostics.flowPlaybookBridgeProtocol, 'cybervinci-ai-chat-experience-rpc');
  assert.equal(report.smoke.ok, true, `Frontend bridge smoke failed: ${JSON.stringify(report)}`);
  assert.equal(report.smoke.frontendClientConnected, true, `Frontend bridge smoke did not see the client: ${JSON.stringify(report)}`);
  assert.equal(report.smoke.delegated, true, `Frontend bridge smoke did not delegate to the client: ${JSON.stringify(report)}`);
  assert.equal(report.smoke.signals?.['cybervinci.playbook.frontend'], true, `Frontend bridge smoke missing frontend signal: ${JSON.stringify(report)}`);
  return report;
}

async function validatePlaybookPersistenceReload(page) {
  await page.waitForFunction(() => {
    const diagnostics = window.__cyberVinciAiChatExperienceDiagnostics;
    return !!diagnostics && typeof diagnostics.startPlaybookPersistenceReloadSmoke === 'function';
  }, { timeout });
  const started = await page.evaluate(async () => window.__cyberVinciAiChatExperienceDiagnostics.startPlaybookPersistenceReloadSmoke());
  assert.equal(started.ok, true, `Could not create persisted paused Playbook run before reload: ${JSON.stringify(started, null, 2)}`);
  assert.ok(started.requestId, `Persistence reload smoke did not return a requestId: ${JSON.stringify(started, null, 2)}`);
  await page.reload({ waitUntil: 'domcontentloaded', timeout });
  await page.waitForFunction(() => {
    const diagnostics = window.__cyberVinciAiChatExperienceDiagnostics;
    return !!diagnostics && typeof diagnostics.finishPlaybookPersistenceReloadSmoke === 'function';
  }, { timeout });
  const finished = await page.evaluate(async requestId => window.__cyberVinciAiChatExperienceDiagnostics.finishPlaybookPersistenceReloadSmoke(requestId), started.requestId);
  assert.equal(finished.ok, true, `Persisted Playbook run was not resumed after browser reload: ${JSON.stringify({ started, finished }, null, 2)}`);
  assert.equal(finished.foundAfterReload, true, `Persisted run was not loaded into the new runtime after reload: ${JSON.stringify({ started, finished }, null, 2)}`);
  assert.equal(finished.beforeStatus, 'paused', `Reloaded run should still be paused before resume: ${JSON.stringify({ started, finished }, null, 2)}`);
  assert.equal(finished.afterStatus, 'completed', `Reloaded run should complete after resume: ${JSON.stringify({ started, finished }, null, 2)}`);
  assert.equal(finished.resumedEventSeen, true, `Reloaded run should record a resumed event: ${JSON.stringify({ started, finished }, null, 2)}`);
  return { started, finished };
}

async function validateCatalogManagerEditing(page) {
  await page.waitForFunction(() => {
    const diagnostics = window.__cyberVinciAiChatExperienceDiagnostics;
    return !!diagnostics && typeof diagnostics.runCatalogManagerEditingSmoke === 'function';
  }, { timeout });
  const report = await page.evaluate(async () => window.__cyberVinciAiChatExperienceDiagnostics.runCatalogManagerEditingSmoke());
  assert.equal(report.ok, true, `Catalog Manager editing smoke failed: ${JSON.stringify(report, null, 2)}`);
  assert.ok(Array.isArray(report.duplicates) && report.duplicates.length >= 3, `Catalog Manager editing smoke must duplicate Agent, Tool, and Playbook: ${JSON.stringify(report, null, 2)}`);
  assert.ok(Array.isArray(report.deleted) && report.deleted.length >= 4, `Catalog Manager editing smoke must delete duplicated user items and companion Playbook: ${JSON.stringify(report, null, 2)}`);
  assert.equal(report.duplicates.every(item => item.ok === true), true, `Catalog Manager duplicate actions failed: ${JSON.stringify(report, null, 2)}`);
  assert.equal(report.deleted.every(item => item.ok === true), true, `Catalog Manager delete actions failed: ${JSON.stringify(report, null, 2)}`);
  assert.equal(report.override?.ok, true, `Catalog Manager system override action failed: ${JSON.stringify(report, null, 2)}`);
  assert.equal(report.restore?.ok, true, `Catalog Manager restore action failed: ${JSON.stringify(report, null, 2)}`);
  return report;
}

async function validateCanvasDesignQaRealEditor(page) {
  const fixture = createCanvasQaRealEditorFixture();
  try {
    await page.waitForFunction(() => {
      const diagnostics = window.__cyberVinciAiChatExperienceDiagnostics;
      return !!diagnostics && typeof diagnostics.runCanvasDesignQaRealEditorSmoke === 'function';
    }, { timeout });
    const report = await page.evaluate(async options => window.__cyberVinciAiChatExperienceDiagnostics.runCanvasDesignQaRealEditorSmoke(options), {
      uri: fixture.uri,
      prompt: 'Clone Amazon as Saara; keep the search input and orange search button as one compact row, fix overlaps/off-canvas/text overflow, and include the footer.'
    });
    assert.equal(report.ok, true, `Canvas Design QA real editor smoke failed: ${JSON.stringify(report, null, 2)}`);
    assert.equal(report.runStatus, 'completed', `Canvas Design QA real editor run did not complete: ${JSON.stringify(report, null, 2)}`);
    assert.ok(report.applied > 0, `Canvas Design QA real editor smoke must apply repair operations: ${JSON.stringify(report, null, 2)}`);
    assert.equal(report.verificationPassed, true, `Canvas Design QA real editor smoke must verify repaired output: ${JSON.stringify(report, null, 2)}`);
    assert.equal(report.restored, true, `Canvas Design QA real editor smoke must restore the temporary document: ${JSON.stringify(report, null, 2)}`);
    assert.ok(report.afterChildCount > report.beforeChildCount, `Canvas Design QA real editor smoke should add a footer during repair: ${JSON.stringify(report, null, 2)}`);
    assert.ok(String(report.reportMarkdown || '').includes('# Canvas Design QA Real Editor Smoke'), `Canvas Design QA real editor smoke must expose a markdown QA report: ${JSON.stringify(report, null, 2)}`);
    const states = new Set((report.events || []).map(event => event.stateId).filter(Boolean));
    for (const stateId of ['capture-document', 'layout-diagnostics', 'vision-judge', 'apply-suggested-operations', 'verify']) {
      assert.ok(states.has(stateId), `Canvas Design QA real editor run missed state '${stateId}': ${JSON.stringify(report, null, 2)}`);
    }
    return report;
  } finally {
    try {
      fs.rmSync(fixture.dir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup; the app-side smoke restores and closes the document first.
    }
  }
}

async function validateRunInspectorObservability(page) {
  await page.waitForFunction(() => {
    const diagnostics = window.__cyberVinciAiChatExperienceDiagnostics;
    return !!diagnostics && typeof diagnostics.runRunInspectorObservabilitySmoke === 'function';
  }, { timeout });
  const report = await page.evaluate(async () => window.__cyberVinciAiChatExperienceDiagnostics.runRunInspectorObservabilitySmoke());
  assert.equal(report.ok, true, `Run Inspector observability smoke failed: ${JSON.stringify(report, null, 2)}`);
  assert.equal(report.rawSecretsPresent, false, `Run Inspector observability exports leaked synthetic secrets: ${JSON.stringify(report, null, 2)}`);
  assert.equal(report.tokenCounterPreserved, true, `Run Inspector observability redacted non-secret token counters: ${JSON.stringify(report, null, 2)}`);
  assert.ok(report.artifactCount >= 5, `Run Inspector observability must expose checkpoint/failure/event artifacts: ${JSON.stringify(report, null, 2)}`);
  assert.ok(report.timelineEventCount >= 3, `Run Inspector observability must expose a timeline: ${JSON.stringify(report, null, 2)}`);
  assert.ok(report.diagnosticCount >= 4, `Run Inspector observability must aggregate run/checkpoint/failure diagnostics: ${JSON.stringify(report, null, 2)}`);
  assert.equal(report.hasFailureRecovery, true, `Run Inspector observability must expose failure recovery artifacts: ${JSON.stringify(report, null, 2)}`);
  assert.equal(report.hasTimelineMarkdown, true, `Run Inspector observability must export timeline Markdown: ${JSON.stringify(report, null, 2)}`);
  assert.equal(report.hasDiagnosticsMarkdown, true, `Run Inspector observability must export diagnostics Markdown: ${JSON.stringify(report, null, 2)}`);
  return report;
}

async function validateFlowPlaybookBridge(page) {
  await page.waitForFunction(() => {
    const diagnostics = window.__cyberVinciFlowDiagnostics;
    return !!diagnostics && typeof diagnostics.runPlaybookBridgeSmoke === 'function';
  }, { timeout });
  const report = await page.evaluate(async () => window.__cyberVinciFlowDiagnostics.runPlaybookBridgeSmoke());
  assert.equal(report.ok, true, `Flow -> Playbook browser smoke failed. Start the app with FLOW_KERNEL_MODE=simulated and FLOW_MEMORY_FALLBACK=true for this gate.\n${JSON.stringify(report, null, 2)}`);
  assert.equal(report.workflowId, 'cybervinci_flow_playbook_bridge_smoke');
  assert.equal(report.status, 'completed', `Flow run did not complete: ${JSON.stringify(report, null, 2)}`);
  assert.equal(report.stateStatuses?.run_playbook, 'done', `Flow playbook state did not finish: ${JSON.stringify(report, null, 2)}`);
  assert.equal(report.frontendSignal?.value, true, `Flow run did not delegate to the frontend playbook bridge: ${JSON.stringify(report, null, 2)}`);
  assert.equal(report.playbookSignal?.value, '__cybervinci.frontend-rpc-smoke', `Flow run did not execute the expected playbook: ${JSON.stringify(report, null, 2)}`);
  assert.equal(report.issueCount, 0, `Flow run produced issues: ${JSON.stringify(report, null, 2)}`);
  assert.ok(Array.isArray(report.workloadStatuses) && report.workloadStatuses.some(workload => {
    return workload.stateId === 'run_playbook'
      && workload.status === 'done'
      && Array.isArray(workload.outputs)
      && workload.outputs.some(output => output.includes('/playbook/result.json'));
  }), `Flow run did not persist playbook/result.json: ${JSON.stringify(report, null, 2)}`);
  return report;
}

async function validatePlaybookSelector(page) {
  await clickVisible(page, '[data-cybervinci-control="playbook"]');
  await page.waitForSelector('[data-cybervinci-menu="playbook"]', { timeout });
  const report = await page.evaluate(() => {
    const menu = document.querySelector('[data-cybervinci-menu="playbook"]');
    const rect = menu.getBoundingClientRect();
    return {
      rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      search: !!menu.querySelector('[data-cybervinci-control="playbook-search"]'),
      groups: menu.querySelectorAll('[data-cybervinci-playbook-group]').length,
      clearAction: !!menu.querySelector('[data-cybervinci-action="clear-playbook"]'),
      managerAction: !!menu.querySelector('[data-cybervinci-action="playbook-manager"]'),
      runsAction: !!menu.querySelector('[data-cybervinci-action="playbook-runs"]'),
      warnings: Array.from(menu.querySelectorAll('[data-cybervinci-playbook-warning]')).map(option => option.getAttribute('data-cybervinci-playbook-warning') || ''),
      text: menu.textContent || ''
    };
  });
  assert.ok(report.search, 'Playbook selector must include search input');
  assert.ok(report.groups > 0, 'Playbook selector must render grouped Playbooks');
  assert.ok(report.clearAction, 'Playbook selector must expose a clear selection action');
  assert.ok(report.managerAction, 'Playbook selector must expose Playbook Manager action');
  assert.ok(report.runsAction, 'Playbook selector must expose Playbook Runs action');
  assert.ok(report.text.includes('No Playbook'), `Playbook selector must expose an explicit deselect/default option: ${JSON.stringify(report)}`);
  assert.ok(report.warnings.some(value => value.includes('default') || value.includes('Flow') || value.includes('Canvas') || value.includes('native delegate')), `Playbook selector must show capability warnings/badges: ${JSON.stringify(report)}`);
  assert.ok(report.rect.top >= 0, `Playbook selector top is clipped: ${JSON.stringify(report)}`);
  assert.ok(report.rect.bottom <= report.viewport.height + 1, `Playbook selector bottom is clipped: ${JSON.stringify(report)}`);
  assert.ok(report.rect.left >= 0 && report.rect.right <= report.viewport.width + 1, `Playbook selector is outside viewport: ${JSON.stringify(report)}`);

  await page.keyboard.type('flow');
  await page.waitForFunction(() => {
    const menu = document.querySelector('[data-cybervinci-menu="playbook"]');
    return !!menu && /flow/i.test(menu.textContent || '');
  }, { timeout });
  await page.keyboard.press('Escape');
}

async function validatePlaybookMentionSync(page) {
  await setChatInputText(page, '@GitHub inspect the pull request');
  await page.waitForFunction(() => {
    const button = document.querySelector('[data-cybervinci-control="playbook"]');
    return !!button
      && /GitHub/.test(button.textContent || '')
      && button.classList.contains('selected');
  }, { timeout });
  const selectedReport = await page.evaluate(() => {
    const button = document.querySelector('[data-cybervinci-control="playbook"]');
    const style = button ? getComputedStyle(button) : undefined;
    return {
      text: button?.textContent || '',
      selected: button?.classList.contains('selected') ?? false,
      borderColor: style?.borderColor
    };
  });
  assert.ok(selectedReport.text.includes('GitHub'), `@GitHub must select the GitHub Playbook: ${JSON.stringify(selectedReport)}`);
  assert.equal(selectedReport.selected, true, `@GitHub selected Playbook must be visually highlighted: ${JSON.stringify(selectedReport)}`);

  await page.keyboard.press('Escape');
  await setChatInputText(page, '');
  await page.waitForFunction(() => {
    const button = document.querySelector('[data-cybervinci-control="playbook"]');
    return !!button
      && /No Playbook/.test(button.textContent || '')
      && !button.classList.contains('selected');
  }, { timeout });
}

async function menuViewportReport(page, selector) {
  return page.evaluate(sel => {
    const menu = document.querySelector(sel);
    const rect = menu.getBoundingClientRect();
    return {
      rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scrollWidth: menu.scrollWidth,
      clientWidth: menu.clientWidth,
      options: menu.querySelectorAll('[data-cybervinci-option], .theia-ChatInput-AiProviderMenuOption').length,
      text: menu.textContent || ''
    };
  }, selector);
}

async function validateNativeMentionMenu(page) {
  await clickVisible(page, '[aria-label="Mention or pin a chat agent"]');
  await page.waitForSelector('.monaco-list[role="listbox"]', { timeout });
  await delay(500);
  const report = await page.evaluate(() => {
    const list = document.querySelector('.monaco-list[role="listbox"]');
    const rect = list.getBoundingClientRect();
    return {
      rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      text: list.textContent || '',
      optionCount: list.querySelectorAll('.monaco-list-row, [role="option"]').length
    };
  });
  assert.ok(report.optionCount >= 8, `Native @ menu did not render enough options: ${JSON.stringify(report)}`);
  assert.ok(report.rect.top >= 0 && report.rect.bottom <= report.viewport.height + 1, `Native @ menu is clipped vertically: ${JSON.stringify(report)}`);
  assert.ok(report.rect.left >= 0 && report.rect.right <= report.viewport.width + 1, `Native @ menu is clipped horizontally: ${JSON.stringify(report)}`);
  for (const name of ['CyberVinci', 'Coder', 'Architect', 'AppTester', 'Command']) {
    assert.ok(report.text.includes(name), `Native @ menu is missing visible agent '${name}': ${JSON.stringify(report)}`);
  }
  for (const agent of expectedNativeAgents) {
    assert.ok(agent.id && agent.sourceAgentId && agent.name, `Native @ fixture entry is incomplete: ${JSON.stringify(agent)}`);
  }
  await page.keyboard.press('Escape');
}

async function main() {
  const browser = await puppeteer.launch({
    headless: process.env.CYBERVINCI_AI_CHAT_UI_HEADLESS === '0' ? false : 'new',
    args: ['--no-sandbox', '--disable-gpu']
  });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(timeout);
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    await page.waitForFunction(() => document.body && document.body.innerText.length > 0, { timeout });
    await openCyberVinciChat(page);

    const desktop = await validateLayout(page, 'desktop');
    const runtimeBridge = await validateRuntimeBridge(page);
    const runInspectorObservability = await validateRunInspectorObservability(page);
    const playbookPersistenceReload = await validatePlaybookPersistenceReload(page);
    const catalogManagerEditing = await validateCatalogManagerEditing(page);
    const canvasDesignQaRealEditor = await validateCanvasDesignQaRealEditor(page);
    await openCyberVinciChat(page);
    const flowPlaybookBridge = validateFlowPlaybook ? await validateFlowPlaybookBridge(page) : undefined;
    await validateAgentSelector(page);
    await validatePlaybookSelector(page);
    await validatePlaybookMentionSync(page);
    await validateProviderMenus(page);
    await validateNativeMentionMenu(page);

    await page.setViewport({ width: 900, height: 760 });
    await delay(500);
    const narrow = await validateLayout(page, 'narrow');

    assert.strictEqual(await visibleSelectorCount(page, '.cybervinci-chat-experience-controls[data-cybervinci-contribution="true"]'), 1, 'CyberVinci toolbar must not render as duplicate visible rows');

    console.log(JSON.stringify({
      ok: true,
      url,
      checkedNativeAgentFixtureEntries: expectedNativeAgents.length,
      runtimeBridge,
      runInspectorObservability,
      playbookPersistenceReload,
      catalogManagerEditing,
      canvasDesignQaRealEditor,
      flowPlaybookBridge,
      desktop,
      narrow
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
