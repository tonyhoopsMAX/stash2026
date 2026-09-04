// ─────────────────────────────────────────────────────────────────────────────
// STASH theme registry — the single source of truth for the 10 launch themes.
//
// Architecture
//   * The *visual* identity of each theme lives entirely in design tokens in
//     `app/globals.css`, scoped to `[data-theme="<id> …>"]` selectors. One
//     token set drives surfaces, radii, borders, glass, backgrounds, shadows,
//     nav treatment, buttons, density, icon containers and decoration. No
//     screen, component, or JSX branch is duplicated per theme.
//   * This registry only holds what TypeScript needs: the theme list, copy
//     for the Appearance screen's preview cards, and the scheme/accent colors
//     used for `<meta name="theme-color">`, the Android status bar, and the
//     manifest-adjacent chrome.
//   * `cssAttr` is written verbatim to `document.documentElement.dataset.theme`
//     (and onto each preview card). Space-separated `variant-*` tokens activate
//     the few *structural* component variants (bottom-nav shape, press
//     effects, tile buttons) that pure color tokens cannot express.
//
// To add theme #11: add an entry here + a `[data-theme='…'] token block in
// globals.css. Nothing else.
// ─────────────────────────────────────────────────────────────────────────────

import { STASH_CONFIG } from './config';

const THEME_STORAGE_KEY = STASH_CONFIG.storage.themeKey;

export type ThemeId =
  | 'og'
  | 'archive-paper'
  | 'neo-brutal'
  | 'pastel-cloud'
  | 'noir-atelier'
  | 'aurora-flow'
  | 'focused-grid'
  | 'zen-archive'
  | 'soft-journal'
  | 'metro-pop';

export interface StashTheme {
  id: ThemeId;
  name: string;
  /** One-liner shown on the Appearance preview card. */
  description: string;
  /** Dominant color scheme — drives meta theme-color, the Android status bar
   *  icon tint, and the iOS `black-translucent` vs `default` choice. */
  scheme: 'light' | 'dark';
  /** Accent used for the splash mark, focus rings, and the theme-color meta. */
  accent: string;
  /** Page background — used for `theme-color`, the status bar on Android, and
   *  to pick light/dark status-bar icons. */
  statusBarColor: string;
  /** [background, accent, ink] swatches rendered on the preview card header. */
  swatches: [string, string, string];
  /** Short typographic treatment label shown on the preview card. */
  typeLabel: 'Geist' | 'Serif' | 'Display' | 'Mono';
  /** Written verbatim to `html[data-theme]`. The leading token must be the
   *  theme id; `variant-*` tokens opt into structural CSS variants. */
  cssAttr: string;
}

export const STASH_THEMES: readonly StashTheme[] = [
  {
    id: 'og',
    name: 'OG',
    description: 'The original STASH — deep teal ink, floating glass, soft glow.',
    scheme: 'dark',
    accent: '#25dac5',
    statusBarColor: '#061112',
    swatches: ['#061112', '#25dac5', '#eafffb'],
    typeLabel: 'Geist',
    cssAttr: 'og',
  },
  {
    id: 'archive-paper',
    name: 'Archive Paper',
    description: 'Index cards on laid paper — ruled lines, ink hairlines, stamp-red accents.',
    scheme: 'light',
    accent: '#b4552c',
    statusBarColor: '#f2ecdf',
    swatches: ['#f2ecdf', '#b4552c', '#241f17'],
    typeLabel: 'Serif',
    cssAttr: 'archive-paper variant-nav-bar',
  },
  {
    id: 'neo-brutal',
    name: 'Neo Brutal',
    description: 'Raw blocks, thick outlines, hard offset shadows. Zero apologies.',
    scheme: 'light',
    accent: '#ffde3d',
    statusBarColor: '#f4f2ea',
    swatches: ['#f4f2ea', '#ffde3d', '#12100b'],
    typeLabel: 'Display',
    cssAttr: 'neo-brutal variant-nav-bar variant-brutal',
  },
  {
    id: 'pastel-cloud',
    name: 'Pastel Cloud',
    description: 'Weightless pastel bubbles, big radii, and gentle frosted glow.',
    scheme: 'light',
    accent: '#8f7ff7',
    statusBarColor: '#f6f2fb',
    swatches: ['#f6f2fb', '#8f7ff7', '#3a3356'],
    typeLabel: 'Geist',
    cssAttr: 'pastel-cloud',
  },
  {
    id: 'noir-atelier',
    name: 'Noir Atelier',
    description: 'Candlelit black with champagne hairlines and quiet serif detail.',
    scheme: 'dark',
    accent: '#d8b982',
    statusBarColor: '#0b0a0c',
    swatches: ['#0b0a0c', '#d8b982', '#efe7d8'],
    typeLabel: 'Serif',
    cssAttr: 'noir-atelier',
  },
  {
    id: 'aurora-flow',
    name: 'Aurora Flow',
    description: 'Northern lights drifting over dark glass — slow, liquid, alive.',
    scheme: 'dark',
    accent: '#6ef3c0',
    statusBarColor: '#050b14',
    swatches: ['#050b14', '#6ef3c0', '#b48cff'],
    typeLabel: 'Geist',
    cssAttr: 'aurora-flow variant-aurora',
  },
  {
    id: 'focused-grid',
    name: 'Focused Grid',
    description: 'Blueprint grid, mono labels, dense rows — a workbench, not a mood board.',
    scheme: 'light',
    accent: '#2f6bed',
    statusBarColor: '#eef1f5',
    swatches: ['#eef1f5', '#2f6bed', '#1c2430'],
    typeLabel: 'Mono',
    cssAttr: 'focused-grid variant-nav-tabs',
  },
  {
    id: 'zen-archive',
    name: 'Zen Archive',
    description: 'Moss, sandstone, and long quiet margins. Matte surfaces, no shadows.',
    scheme: 'dark',
    accent: '#a9c9ae',
    statusBarColor: '#141d19',
    swatches: ['#141d19', '#a9c9ae', '#e9e4d6'],
    typeLabel: 'Geist',
    cssAttr: 'zen-archive',
  },
  {
    id: 'soft-journal',
    name: 'Soft Journal',
    description: 'Cream journal pages, terracotta ribbons, ruled warmth for slow saving.',
    scheme: 'light',
    accent: '#c2664f',
    statusBarColor: '#faf4ea',
    swatches: ['#faf4ea', '#c2664f', '#41322a'],
    typeLabel: 'Serif',
    cssAttr: 'soft-journal',
  },
  {
    id: 'metro-pop',
    name: 'Metro Pop',
    description: 'Glossy flat tiles, bold caps, playful squares — an app in primary colors.',
    scheme: 'light',
    accent: '#2b62ff',
    statusBarColor: '#f5f7fb',
    swatches: ['#f5f7fb', '#2b62ff', '#141a26'],
    typeLabel: 'Display',
    cssAttr: 'metro-pop variant-nav-tiles variant-tiles',
  },
] as const;

export const DEFAULT_THEME_ID: ThemeId = 'og';

const themeIndex = new Map<ThemeId, StashTheme>(STASH_THEMES.map((theme) => [theme.id, theme]));

/** Never throws — unknown/legacy ids fall back to the OG theme so an old
 *  persisted setting can never break the app on boot. */
export function getTheme(id: string | undefined | null): StashTheme {
  return themeIndex.get((id ?? '') as ThemeId) ?? themeIndex.get(DEFAULT_THEME_ID)!;
}

/** Read the pre-hydration theme mirror (written by the store + bootstrap
 *  script) so the first paint and the splash match the persisted theme. */
export function readStoredThemeId(): ThemeId | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw && themeIndex.has(raw as ThemeId)) return raw as ThemeId;
  } catch {
    /* private mode / storage disabled — fall through to defaults */
  }
  return undefined;
}

/** Write the localStorage mirror consumed by the inline bootstrap script in
 *  app/layout.tsx (single source for the key: STASH_CONFIG.storage.themeKey). */
export function persistThemeId(id: ThemeId): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    /* storage disabled — IndexedDB still holds the setting */
  }
}

/**
 * Bind a theme to the live document:
 *   * `html[data-theme]`   → all --t-* tokens + variant hooks cascade (CSS does
 *                            the entire re-skin; no component rerenders needed).
 *   * `html[data-scheme]`  → light-scheme fallbacks for legacy utilities.
 *   * `<meta name="theme-color">` → browser chrome / iOS status-bar tint.
 * Pure DOM writes — safe to call from an effect and idempotent.
 */
export function applyThemeToDocument(id: string | null | undefined): StashTheme {
  const theme = getTheme(id);
  if (typeof document === 'undefined') return theme;
  const root = document.documentElement;
  root.dataset.theme = theme.cssAttr;
  root.dataset.scheme = theme.scheme;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = theme.statusBarColor;
  return theme;
}
