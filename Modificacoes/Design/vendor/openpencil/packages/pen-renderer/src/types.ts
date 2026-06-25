import type { PenNode } from '@zseven-w/pen-types';

export type { ViewportState } from '@zseven-w/pen-types';

export interface RenderNode {
  node: PenNode;
  absX: number;
  absY: number;
  absW: number;
  absH: number;
  clipRect?: { x: number; y: number; w: number; h: number; rx: number };
}

/** Injectable icon lookup function for resolving icon names to SVG path data. */
export interface IconLookupFn {
  (name: string): { d: string; iconId: string; style: 'stroke' | 'fill' } | null;
}

export interface PenRendererOptions {
  /** URL pattern for CanvasKit WASM files. Default: '/canvaskit/' */
  canvasKitPath?: string | ((file: string) => string);
  /** Base URL for bundled font files. Used only when bundled font loading is enabled. */
  fontBasePath?: string;
  /** Fetch bundled font files before CDN fallback. Default: enabled only when fontBasePath is provided. */
  loadBundledFonts?: boolean;
  /** Custom Google Fonts CSS endpoint. Default: 'https://fonts.googleapis.com/css2' */
  googleFontsCssUrl?: string;
  /** Icon lookup function. Default: null (icons render as fallback circle) */
  iconLookup?: IconLookupFn;
  /** Theme variant to use for variable resolution. Default: first variant per axis */
  themeVariant?: Record<string, string>;
  /** Background color. Default: '#1a1a1a' */
  backgroundColor?: string;
  /** Device pixel ratio override. Default: window.devicePixelRatio */
  devicePixelRatio?: number;
  /** Default fonts to preload. Default: ['Inter', 'Noto Sans SC'] */
  defaultFonts?: string[];
}
