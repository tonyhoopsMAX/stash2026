/* Theme-system regression tests.
 *
 * The v1 theme engine is "tokens in CSS + one registry in TS". These tests
 * lock the contract between them so a theme can never silently become a
 * color-swap-only stub or lose its persisted application:
 *
 *  1. The registry defines EXACTLY the ten launch themes with honest metadata
 *     (name, description, scheme, swatches, structural variant hooks).
 *  2. Every theme has a real token block in app/globals.css binding at least
 *     the core surface/color tokens — and every `variant-*` hook referenced by
 *     a theme has a matching structural rule (nav shape, press effect…).
 *  3. The Appearance screen is a theme browser: one preview card per registry
 *     entry, applying + persisting via the store, with the pre-paint mirror
 *     bootstrap wired into app/layout.tsx.
 *  4. Central config invariants: Ko-fi + update endpoints are external URLs,
 *     and the in-app version/package identity stays in sync with
 *     android/app/build.gradle.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { STASH_CONFIG } from '../../lib/stash/config';
import { DEFAULT_THEME_ID, STASH_THEMES, getTheme } from '../../lib/stash/themes';

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const css = read('../../app/globals.css');
const screens = read('../../components/stash/screens.tsx');
const appShell = read('../../components/stash/AppShell.tsx');
const layout = read('../../app/layout.tsx');
const store = read('../../lib/stash/store.ts');
const gradle = read('../../android/app/build.gradle');

const EXPECTED_IDS = [
  'og',
  'archive-paper',
  'neo-brutal',
  'pastel-cloud',
  'noir-atelier',
  'aurora-flow',
  'focused-grid',
  'zen-archive',
  'soft-journal',
  'metro-pop',
] as const;

describe('theme registry', () => {
  it('defines exactly the ten launch themes, in order', () => {
    expect(STASH_THEMES.map((t) => t.id)).toEqual([...EXPECTED_IDS]);
  });

  it('gives every theme honest preview metadata (not color-only stubs)', () => {
    for (const theme of STASH_THEMES) {
      expect(theme.name.length, `name for ${theme.id}`).toBeGreaterThan(1);
      expect(theme.description.length, `description for ${theme.id}`).toBeGreaterThanOrEqual(20);
      expect(theme.description.length, `description for ${theme.id} stays card-sized`).toBeLessThan(140);
      expect(['light', 'dark']).toContain(theme.scheme);
      expect(theme.swatches).toHaveLength(3);
      for (const swatch of theme.swatches) expect(swatch).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.statusBarColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(['Geist', 'Serif', 'Display', 'Mono']).toContain(theme.typeLabel);
      // cssAttr always leads with the theme id so [data-theme^=id] matches.
      expect(theme.cssAttr.startsWith(theme.id), `cssAttr for ${theme.id}`).toBe(true);
    }
  });

  it('has unique names and no unknown variant hooks', () => {
    const names = STASH_THEMES.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    const knownVariants = new Set([
      'variant-nav-bar',
      'variant-nav-tabs',
      'variant-nav-tiles',
      'variant-brutal',
      'variant-tiles',
      'variant-aurora',
    ]);
    for (const theme of STASH_THEMES) {
      for (const token of theme.cssAttr.split(/\s+/).slice(1)) {
        expect(knownVariants.has(token), `unknown variant hook "${token}" on ${theme.id}`).toBe(true);
      }
    }
  });

  it('falls back to OG for unknown persisted ids (never crashes boot)', () => {
    expect(getTheme('not-a-theme').id).toBe(DEFAULT_THEME_ID);
    expect(getTheme(undefined).id).toBe(DEFAULT_THEME_ID);
    expect(getTheme(null).id).toBe(DEFAULT_THEME_ID);
  });
});

describe('globals.css theme engine', () => {
  it('declares a token block for every theme id', () => {
    for (const id of EXPECTED_IDS) {
      expect(css, `missing [data-theme^='${id}'] block`).toContain(`[data-theme^='${id}']`);
    }
  });

  it('binds core tokens in every theme block (surfaces + accents, not just colors)', () => {
    for (const id of EXPECTED_IDS) {
      const match = new RegExp(`\\[data-theme\\^='${id}'\\]\\s*\\{([\\s\\S]*?)\\n\\}`).exec(css);
      expect(match, `no block body for ${id}`).toBeTruthy();
      const body = match![1];
      for (const token of ['--background', '--foreground', '--stash-accent', '--t-bg', '--t-surface']) {
        expect(body, `${id} should bind ${token}`).toContain(token);
      }
      // Themes other than OG must re-skin structure, not just palette:
      // radius / border / typography / density tokens are part of the contract.
      if (id !== 'og') {
        const shapeSignals = ['--t-radius', '--t-border-w', '--t-font-display', '--t-display', '--t-density', '--t-nav', '--t-bg-image', '--t-card', '--t-icon', '--t-blur', '--t-shadow'];
        expect(
          shapeSignals.some((signal) => body.includes(signal)),
          `${id} must restyle at least one structural token (typography/surface/nav/decoration)`
        ).toBe(true);
      }
    }
  });

  it('every variant hook has a structural rule', () => {
    for (const variant of ['variant-nav-bar', 'variant-nav-tabs', 'variant-nav-tiles', 'variant-brutal', 'variant-tiles', 'variant-aurora']) {
      expect(css, `missing structural rules for ${variant}`).toContain(`[data-theme~='${variant}']`);
    }
  });

  it('keeps the shared layout-reserve tokens intact for the theme system', () => {
    // Flush bar/tile navs zero the offset; the reserve must derive from it so
    // content clearance adapts per theme instead of hard-coding.
    expect(css).toMatch(/--bottom-nav-reserve:\s*calc\(var\(--bottom-nav-height\) \+ var\(--bottom-nav-offset\) \+ env\(safe-area-inset-bottom\)\)/);
    expect(css).toMatch(/\[data-theme~='variant-nav-bar'\][^{]*\{[\s\S]*?border-radius:\s*0;/);
  });

  it('scoped [data-theme] selectors let preview cards render unapplied themes', () => {
    // Rules must NOT be html-only ([data-theme] not `html[data-theme]`) for
    // the gallery to scope tokens onto small preview wrappers.
    expect(css).toMatch(/\n\[data-theme\^='neo-brutal'\]/);
    expect(css).toContain('.theme-mini');
    expect(css).toContain('.theme-card');
  });
});

describe('appearance screen = theme browser (shared components, zero duplication)', () => {
  it('renders one card per registry theme, tapping applies instantly', () => {
    expect(screens).toContain('STASH_THEMES.map');
    expect(screens).toContain('theme-card-${theme.id}');
    expect(screens).toContain('updateSettings({ themeId: theme.id })');
    expect(screens).toContain('ThemeMiniPreview');
  });

  it('shows selected-state indicator, name, and description on cards', () => {
    expect(screens).toContain('theme-card-check');
    expect(screens).toContain('theme-card-meta');
    expect(screens).toMatch(/<strong>\{theme\.name\}<\/strong>\s*\n\s*<small>\{theme\.description\}<\/small>/);
  });

  it('scopes previews with data-theme so tokens render the theme, not the app default', () => {
    expect(screens).toContain('data-theme={theme.cssAttr}');
  });

  it('AppShell applies the theme via the document attribute (no per-screen branches)', () => {
    expect(appShell).toContain('applyThemeToDocument(settings.themeId)');
    expect(appShell).toContain('applyStatusBar(theme)');
    // The legacy per-accent DOM mutation must be gone.
    expect(appShell).not.toContain("setProperty('--stash-accent'");
    expect(appShell).not.toContain("classList.toggle('dark'");
  });

  it('persists across restarts: IndexedDB settings + pre-paint localStorage mirror', () => {
    expect(store).toContain('persistThemeId(patch.themeId)');
    expect(store).toContain('readStoredThemeId()');
    expect(layout).toContain('stash-theme-id');
    expect(layout).toContain('setAttribute("data-theme"');
    // bootstrap is serialized from the registry (single source of truth)
    expect(layout).toContain('JSON.stringify(themeBootstrap)');
  });
});

describe('central config + branding + identity invariants', () => {
  it('exposes the Ko-fi URL from exactly one config file, external only', () => {
    expect(STASH_CONFIG.support.kofiUrl).toMatch(/^https:\/\/(www\.)?ko-fi\.com\/[A-Za-z0-9._-]+\/?$/);
    // No payment providers may appear in app code.
    const combined = screens + store + css;
    for (const banned of ['stripe', 'paypal', 'play://billing', 'in-app-purchase']) {
      expect(combined.toLowerCase(), `payment processing (${banned}) must not exist`).not.toContain(banned);
    }
  });

  it('keeps the update endpoint absolute + https (native shell has no web origin)', () => {
    expect(STASH_CONFIG.updates.android.manifestUrl).toMatch(/^https:\/\/[^\s]+version\.json$/);
    expect(STASH_CONFIG.updates.android.timeoutMs).toBeGreaterThan(1000);
  });

  it('version name is mirrored in gradle + package.json', () => {
    expect(gradle).toContain(`versionName "${STASH_CONFIG.app.version.name}"`);
    const pkg = JSON.parse(read('../../package.json'));
    expect(pkg.version).toBe(STASH_CONFIG.app.version.name);
    expect(gradle).toContain(`versionCode ${STASH_CONFIG.app.version.code}`);
  });

  it('preserves the Android package id everywhere it appears', () => {
    const appId = STASH_CONFIG.app.android.applicationId;
    expect(appId).toBe('com.stash.app');
    expect(gradle).toContain(`applicationId "${appId}"`);
    const manifest = read('../../android/app/src/main/AndroidManifest.xml');
    expect(manifest).toContain('${applicationId}.fileprovider');
    expect(readFileSync(fileURLToPath(new URL('../../capacitor.config.ts', import.meta.url)), 'utf8')).toContain(appId);
  });

  it('ships one universal app icon + splash (same asset across all themes)', () => {
    // Manifests reference the universal icons at ROOT paths (Cloudflare Pages).
    const webmanifest = JSON.parse(read('../../public/manifest.webmanifest'));
    for (const icon of webmanifest.icons) {
      expect(icon.src.startsWith('/'), `icon src must be root-absolute: ${icon.src}`).toBe(true);
    }
    expect(webmanifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
    expect(webmanifest.start_url).toBe('/app');
    expect(webmanifest.scope).toBe('/');
    // The render pipeline covers adaptive + splash from the same brand masters.
    const renderScript = read('../../scripts/render-icons.mjs');
    for (const target of ['ic_launcher_foreground.png', 'ic_launcher_monochrome.png', 'splash-port', 'apple-touch-icon-180x180.png', 'maskable-icon-512x512.png', 'favicon.ico']) {
      expect(renderScript, `render script must emit ${target}`).toContain(target);
    }
    for (const master of ['stash-master.svg', 'stash-mark.svg', 'stash-foreground.svg', 'stash-monochrome.svg']) {
      expect(() => read(`../../brand/${master}`), `brand master ${master} missing`).not.toThrow();
    }
  });
});
