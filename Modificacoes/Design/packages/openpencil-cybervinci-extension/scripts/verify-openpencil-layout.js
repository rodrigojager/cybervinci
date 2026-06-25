#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const targetPath = args.find(arg => !arg.startsWith('--'));
if (!targetPath) {
  console.error('Usage: node verify-openpencil-layout.js <design.op> [--profile page] [--min-nodes 50]');
  process.exit(2);
}

const optionValue = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback;
};

const profile = optionValue('profile', 'generic');
const minNodes = Number.parseInt(optionValue('min-nodes', profile === 'page' ? '50' : '8'), 10);
const minSections = Number.parseInt(optionValue('min-sections', profile === 'page' ? '5' : '1'), 10);
const minText = Number.parseInt(optionValue('min-text', profile === 'page' ? '12' : '2'), 10);
const minVisual = Number.parseInt(optionValue('min-visual', profile === 'page' ? '6' : '1'), 10);
const minHeight = Number.parseInt(optionValue('min-height', profile === 'page' ? '1000' : '120'), 10);

const numeric = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const textContent = node => {
  if (typeof node.content === 'string') {
    return node.content;
  }
  if (Array.isArray(node.content)) {
    return node.content.map(segment => typeof segment?.text === 'string' ? segment.text : '').join('');
  }
  return '';
};

const labelOf = node => `${node.id ?? ''} ${node.name ?? ''} ${node.role ?? ''}`.toLowerCase();
const visible = node => node && node.visible !== false && node.opacity !== 0;
const widthOf = node => Math.max(0, numeric(node.width, 0));
const heightOf = node => Math.max(0, numeric(node.height, node.type === 'text' ? 18 : 0));
const rectOf = (entry, relative = false) => ({
  x: relative ? numeric(entry.node.x, 0) : entry.absX,
  y: relative ? numeric(entry.node.y, 0) : entry.absY,
  width: widthOf(entry.node),
  height: heightOf(entry.node)
});

const areaOf = rect => Math.max(0, rect.width) * Math.max(0, rect.height);
const intersectionArea = (left, right) => {
  const x1 = Math.max(left.x, right.x);
  const y1 = Math.max(left.y, right.y);
  const x2 = Math.min(left.x + left.width, right.x + right.width);
  const y2 = Math.min(left.y + left.height, right.y + right.height);
  return Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
};

const isText = node => node.type === 'text' && textContent(node).trim().length > 0;
const isVisual = node => ['image', 'icon_font', 'ellipse', 'polygon', 'path', 'line'].includes(node.type)
  || (node.type === 'rectangle' && widthOf(node) >= 8 && heightOf(node) >= 8);
const isContainer = node => ['frame', 'group'].includes(node.type);
const isSectionLike = node => {
  const label = labelOf(node);
  return isContainer(node)
    && (widthOf(node) >= 480 || heightOf(node) >= 120 || (node.children?.length ?? 0) >= 3
      || /\b(section|region|grupo|grid|row|linha|shelf|prateleira|banner|panel|painel|header|footer|hero|content|conteudo|conteúdo)\b/.test(label));
};
const isCardLike = node => {
  const label = labelOf(node);
  return ['frame', 'group', 'rectangle'].includes(node.type)
    && widthOf(node) >= 90
    && heightOf(node) >= 50
    && ((node.children?.length ?? 0) >= 2 || /\b(card|tile|item|product|produto|offer|oferta|module|modulo|módulo)\b/.test(label));
};
const isBackgroundLike = node => {
  const label = labelOf(node);
  return /\b(background|backdrop|fundo|bg|base|surface|container|wrapper|shell|page|root|section|canvas|area)\b/.test(label)
    || ['page', 'section', 'main', 'header', 'footer', 'navigation'].includes(node.role);
};
const isRenderableContent = node => {
  if (!visible(node)) {
    return false;
  }
  if (isText(node)) {
    return true;
  }
  if (node.type === 'image' || node.type === 'icon_font') {
    return widthOf(node) >= 8 && heightOf(node) >= 8;
  }
  if (['ellipse', 'polygon', 'path', 'line'].includes(node.type)) {
    return widthOf(node) >= 6 && heightOf(node) >= 6;
  }
  if (node.type === 'rectangle') {
    return widthOf(node) >= 8 && heightOf(node) >= 8 && !isBackgroundLike(node);
  }
  if (isContainer(node)) {
    return isCardLike(node) || isSectionLike(node);
  }
  return false;
};

const shouldIgnoreOverlap = (left, right, leftRect, rightRect, overlap) => {
  if (overlap <= 0) {
    return true;
  }
  const leftArea = areaOf(leftRect);
  const rightArea = areaOf(rightRect);
  if (!leftArea || !rightArea) {
    return true;
  }
  const smallerRatio = overlap / Math.min(leftArea, rightArea);
  const leftBackground = isBackgroundLike(left) && !isText(left) && !isCardLike(left);
  const rightBackground = isBackgroundLike(right) && !isText(right) && !isCardLike(right);
  if ((leftBackground || rightBackground) && smallerRatio >= 0.72) {
    return true;
  }
  if ((left.role === 'overlay' || right.role === 'overlay') && smallerRatio < 0.18) {
    return true;
  }
  return false;
};

const overlapThreshold = (left, right) => {
  if (isText(left) && isText(right)) {
    return 0.05;
  }
  if (isText(left) || isText(right)) {
    return 0.12;
  }
  if (isCardLike(left) && isCardLike(right)) {
    return 0.18;
  }
  if (isVisual(left) || isVisual(right)) {
    return 0.22;
  }
  return 0.30;
};

const doc = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
const activePage = doc.pages?.find(page => page.id === doc.activePageId) ?? doc.pages?.[0];
if (!activePage) {
  console.error(JSON.stringify({ ok: false, errors: ['design has no active page'] }, null, 2));
  process.exit(1);
}

const entries = [];
const byParent = new Map();

const visit = (nodes, parentEntry, offsetX, offsetY, depth) => {
  for (const node of nodes ?? []) {
    if (!visible(node)) {
      continue;
    }
    const entry = {
      node,
      parent: parentEntry?.node ?? null,
      parentEntry,
      depth,
      absX: offsetX + numeric(node.x, 0),
      absY: offsetY + numeric(node.y, 0)
    };
    entries.push(entry);
    const parentKey = parentEntry?.node?.id ?? '__page__';
    if (!byParent.has(parentKey)) {
      byParent.set(parentKey, []);
    }
    byParent.get(parentKey).push(entry);
    visit(node.children, entry, entry.absX, entry.absY, depth + 1);
  }
};

visit(activePage.children, null, 0, 0, 0);

const topLevel = entries.filter(entry => entry.depth === 0);
const rootCandidate = topLevel
  .filter(entry => isContainer(entry.node))
  .sort((left, right) => {
    const leftLabel = labelOf(left.node);
    const rightLabel = labelOf(right.node);
    const leftPage = /\b(page|root|main|document|artboard|canvas|composition|screen|view|pagina|página)\b/.test(leftLabel) ? 1 : 0;
    const rightPage = /\b(page|root|main|document|artboard|canvas|composition|screen|view|pagina|página)\b/.test(rightLabel) ? 1 : 0;
    return rightPage - leftPage || areaOf(rectOf(right)) - areaOf(rectOf(left));
  })[0];

const errors = [];
const warnings = [];
const overlaps = [];
const escapes = [];

for (const [parentKey, siblings] of byParent.entries()) {
  const checked = siblings.filter(entry => {
    const node = entry.node;
    return widthOf(node) > 0 && heightOf(node) > 0 && !isBackgroundLike(node);
  });
  for (let index = 0; index < checked.length; index++) {
    for (let other = index + 1; other < checked.length; other++) {
      const left = checked[index];
      const right = checked[other];
      const leftRect = rectOf(left);
      const rightRect = rectOf(right);
      const overlap = intersectionArea(leftRect, rightRect);
      if (shouldIgnoreOverlap(left.node, right.node, leftRect, rightRect, overlap)) {
        continue;
      }
      const ratio = overlap / Math.min(areaOf(leftRect), areaOf(rightRect));
      if (ratio >= overlapThreshold(left.node, right.node)) {
        overlaps.push({
          parent: parentKey,
          left: left.node.id ?? left.node.name,
          right: right.node.id ?? right.node.name,
          ratio: Number(ratio.toFixed(3))
        });
      }
    }
  }
}

for (const entry of entries) {
  const parent = entry.parentEntry;
  if (!parent) {
    const pageWidth = numeric(activePage.width, 0);
    const x = numeric(entry.node.x, 0);
    const right = x + widthOf(entry.node);
    if (pageWidth > 0 && (x < -2 || right > pageWidth + 2)) {
      escapes.push({ parent: '__page__', node: entry.node.id ?? entry.node.name, left: x, right, limit: pageWidth });
    }
    continue;
  }
  const parentWidth = widthOf(parent.node);
  if (parentWidth <= 0 || isBackgroundLike(entry.node)) {
    continue;
  }
  const x = numeric(entry.node.x, 0);
  const right = x + widthOf(entry.node);
  if (x < -2 || right > parentWidth + 2) {
    escapes.push({ parent: parent.node.id ?? parent.node.name, node: entry.node.id ?? entry.node.name, left: x, right, limit: parentWidth });
  }
}

const placeholderTexts = entries
  .filter(entry => isText(entry.node))
  .map(entry => textContent(entry.node).replace(/\s+/g, ' ').trim())
  .filter(text => /\b(Edit this embedded \.op design inside Theia|OpenPencil Design|Canvas AI completed page|generated skeleton|placeholder)\b/i.test(text));

const metrics = {
  file: path.resolve(targetPath),
  profile,
  pageWidth: numeric(activePage.width, 0),
  pageHeight: numeric(activePage.height, 0),
  rootId: rootCandidate?.node?.id,
  rootWidth: rootCandidate ? widthOf(rootCandidate.node) : 0,
  rootHeight: rootCandidate ? heightOf(rootCandidate.node) : 0,
  rootChildren: rootCandidate?.node?.children?.filter(visible).length ?? 0,
  nodeCount: entries.length,
  contentNodeCount: entries.filter(entry => isRenderableContent(entry.node)).length,
  sectionCount: entries.filter(entry => isSectionLike(entry.node)).length,
  textCount: entries.filter(entry => isText(entry.node)).length,
  visualCount: entries.filter(entry => isVisual(entry.node)).length,
  cardLikeCount: entries.filter(entry => isCardLike(entry.node)).length,
  maxBottom: Math.round(entries.reduce((max, entry) => Math.max(max, entry.absY + heightOf(entry.node)), 0)),
  overlapCount: overlaps.length,
  escapeCount: escapes.length,
  placeholderTextCount: placeholderTexts.length
};

if (!entries.length) {
  errors.push('active page has no visible nodes');
}
if (placeholderTexts.length) {
  errors.push(`visible editor or generated-placeholder text found: ${placeholderTexts.slice(0, 3).join(' | ')}`);
}
if (overlaps.length) {
  errors.push(`reportable sibling overlaps found: ${overlaps.slice(0, 5).map(issue => `${issue.left}/${issue.right}@${issue.ratio}`).join(', ')}`);
}
if (escapes.length) {
  errors.push(`visible nodes escape their parent/page horizontally: ${escapes.slice(0, 5).map(issue => `${issue.node}->${issue.parent} right ${Math.round(issue.right)}>${Math.round(issue.limit)}`).join(', ')}`);
}
if (profile === 'page') {
  if (!rootCandidate) {
    errors.push('no top-level page/artboard frame found');
  } else {
    if (metrics.rootWidth < 900 || metrics.rootWidth > 1440) {
      errors.push(`page root width ${metrics.rootWidth} is outside expected 900-1440px range`);
    }
    if (metrics.rootHeight < minHeight) {
      errors.push(`page root height ${metrics.rootHeight} is below ${minHeight}px`);
    }
    if (metrics.rootChildren < 3) {
      errors.push(`page root has only ${metrics.rootChildren} visible top-level children`);
    }
  }
  if (metrics.contentNodeCount < minNodes) {
    errors.push(`content node count ${metrics.contentNodeCount} is below ${minNodes}`);
  }
  if (metrics.sectionCount < minSections) {
    errors.push(`section count ${metrics.sectionCount} is below ${minSections}`);
  }
  if (metrics.textCount < minText) {
    errors.push(`text count ${metrics.textCount} is below ${minText}`);
  }
  if (metrics.visualCount < minVisual) {
    errors.push(`visual count ${metrics.visualCount} is below ${minVisual}`);
  }
}

const result = {
  ok: errors.length === 0,
  metrics,
  errors,
  warnings,
  overlaps: overlaps.slice(0, 20),
  escapes: escapes.slice(0, 20)
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
