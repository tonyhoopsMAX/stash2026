/* Responsive typography regression tests.

 * The shared responsive typography fix for STASH (PWA + Capacitor Android +
 * Tauri Windows) is encoded as CSS custom properties and a small set of
 * well-known utility classes in app/globals.css. These tests read the
 * stylesheet source and assert that:
 *
 *  1. The shared --font-* / --leading-* / --stack-* / --bottom-nav-*
 *     tokens are present, so all three targets can use one source of truth.
 *  2. The bottom-nav reserve is a function of the dock height + offset
 *     and the device safe-area-inset-bottom, so PWA / Android / Windows
 *     all clear the floating dock.
 *  3. The page-subtitle never has a negative top margin (those caused
 *     visible heading/subtitle collisions on small screens, in the
 *     Android Capacitor shell, and on the Windows Tauri window).
 *  4. The Home greeting uses the shared --font-display token (so PWA,
 *     Android and Windows render the same size at the same width).
 *
 * Reading the CSS source is intentional: the test fails fast if anyone
 * regresses the typography fix even if they forget to update a TSX
 * file. It also means the assertions are framework-agnostic — we don't
 * need a JSDOM render to verify the rule.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const cssPath = fileURLToPath(new URL('../../app/globals.css', import.meta.url));
const css = readFileSync(cssPath, 'utf8');

function extractTokenBlock(cssSource: string, name: string): string | null {
  // Match `--name: ...;` allowing nested parentheses / calc() so we can
  // inspect multi-value tokens like --bottom-nav-reserve.
  const re = new RegExp(`${name.replace(/[-/\\^$*+?.()|[\\]{}]/g, '\\$&')}\\s*:\\s*([^;]+);`);
  const match = re.exec(cssSource);
  return match ? match[1].trim() : null;
}

describe('shared responsive typography tokens', () => {
  it('declares the full fluid type scale', () => {
    for (const name of [
      '--font-display',
      '--font-h1',
      '--font-h2',
      '--font-h3',
      '--font-body',
      '--font-caption',
      '--font-eyebrow',
      '--leading-display',
      '--leading-heading',
      '--leading-body',
      '--stack-heading',
      '--stack-section',
      '--bottom-nav-height',
      '--bottom-nav-offset',
      '--bottom-nav-reserve',
    ]) {
      expect(extractTokenBlock(css, name), `expected token ${name} to be declared in globals.css`).toBeTruthy();
    }
  });

  it('uses clamp() for the fluid type scale', () => {
    for (const name of [
      '--font-display',
      '--font-h1',
      '--font-h2',
      '--font-h3',
      '--font-body',
      '--font-caption',
      '--font-eyebrow',
    ]) {
      const value = extractTokenBlock(css, name) ?? '';
      expect(value, `${name} should use clamp() for fluid sizing`).toMatch(/^clamp\(/);
    }
  });

  it('reserves bottom space that always clears the floating dock + safe area', () => {
    const reserve = extractTokenBlock(css, '--bottom-nav-reserve') ?? '';
    // The reserve must combine the dock height, the dock offset, and the
    // device safe-area-inset-bottom. All three are needed so content
    // doesn't hide behind the dock on PWA, Android, or Windows.
    expect(reserve).toContain('--bottom-nav-height');
    expect(reserve).toContain('--bottom-nav-offset');
    expect(reserve).toContain('safe-area-inset-bottom');
  });

  it('applies the shared reserve to .app-content', () => {
    const rule = /\.app-content\s*\{[^}]*\}/m.exec(css)?.[0] ?? '';
    expect(rule).toContain('--bottom-nav-reserve');
  });

  it('positions the bottom-nav using the shared offset token', () => {
    const rule = /\.bottom-nav\s*\{[^}]*\}/m.exec(css)?.[0] ?? '';
    expect(rule).toContain('--bottom-nav-offset');
    expect(rule).toContain('--bottom-nav-height');
    expect(rule).toContain('safe-area-inset-bottom');
  });

  it('uses positive (non-negative) top spacing on .page-subtitle', () => {
    const rule = /\.page-subtitle\s*\{[^}]*\}/m.exec(css)?.[0] ?? '';
    expect(rule).toBeTruthy();
    // No `margin-top: -` allowed — that caused visual collisions.
    expect(rule).not.toMatch(/margin-top\s*:\s*-/);
    // The subtitle must use a positive stack token.
    const marginTop = /margin-top\s*:\s*([^;]+);/.exec(rule)?.[1]?.trim() ?? '';
    expect(marginTop).toBeTruthy();
    expect(marginTop.startsWith('-')).toBe(false);
    expect(marginTop).toBe('var(--stack-heading)');
  });

  it('shares the Home greeting type via the --font-display token', () => {
    const rule = /\.home-greeting\s*\{[^}]*\}/m.exec(css)?.[0] ?? '';
    expect(rule).toBeTruthy();
    expect(rule).toContain('--font-display');
    expect(rule).toContain('--leading-display');
  });

  it('applies the shared --font-h1 to page-header titles', () => {
    const rule = /\.page-header h1, \.page-header-title\s*\{[^}]*\}/m.exec(css)?.[0] ?? '';
    expect(rule).toBeTruthy();
    expect(rule).toContain('--font-h1');
  });
});
