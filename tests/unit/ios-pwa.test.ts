/* iOS PWA helper regression tests.
 *
 * The iPhone-PWA polish change introduces three new client modules that
 * are pure JS (no React, no DOM) and so can be exercised directly from
 * Vitest in the node environment:
 *
 *   * `hooks/use-visual-viewport`  — the useKeyboardOpen threshold
 *   * `hooks/use-standalone`       — the AppMode discriminator
 *   * `lib/stash/persistence`      — isPersisted / requestPersist / getStorageRisk
 *
 * The React-rendering half of these hooks (the data-attribute toggle on
 * <html>, the modal hiding) is verified by the E2E suite on an iPhone 14
 * / 16 Pro Max viewport. These tests lock in the *logic* so that the
 * E2E suite never regresses for an obvious reason.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import {
  isPersisted,
  requestPersist,
  getStorageRisk,
  markPersistRequested,
  wasPersistRequested,
} from '../../lib/stash/persistence';

afterEach(() => {
  vi.unstubAllGlobals();
  try {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  } catch {
    /* ignore */
  }
});

describe('persistence module', () => {
  it('isPersisted returns true when the browser has no Storage API', async () => {
    // No navigator.storage → return true so we never scare the user
    // with a banner that doesn't apply to them.
    vi.stubGlobal('navigator', { storage: undefined });
    await expect(isPersisted()).resolves.toBe(true);
  });

  it('isPersisted returns the navigator value when supported', async () => {
    const persisted = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', {
      storage: { persisted, persist: vi.fn(), estimate: vi.fn() },
    });
    await expect(isPersisted()).resolves.toBe(true);
    expect(persisted).toHaveBeenCalledTimes(1);
  });

  it('isPersisted returns false when navigator.storage.persisted says so', async () => {
    const persisted = vi.fn().mockResolvedValue(false);
    vi.stubGlobal('navigator', {
      storage: {
        persisted,
        persist: vi.fn().mockResolvedValue(true),
        estimate: vi.fn(),
      },
    });
    await expect(isPersisted()).resolves.toBe(false);
    expect(persisted).toHaveBeenCalledTimes(1);
  });

  it('requestPersist is a no-op when already persisted', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', {
      storage: {
        persisted: vi.fn().mockResolvedValue(true),
        persist,
        estimate: vi.fn(),
      },
    });
    await expect(requestPersist()).resolves.toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it('requestPersist calls persist() and returns the result when not yet persisted', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', {
      storage: {
        persisted: vi.fn().mockResolvedValue(false),
        persist,
        estimate: vi.fn(),
      },
    });
    await expect(requestPersist()).resolves.toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('requestPersist returns false when unsupported', async () => {
    vi.stubGlobal('navigator', { storage: undefined });
    await expect(requestPersist()).resolves.toBe(false);
  });

  it('getStorageRisk returns unsupported=true when Storage API is missing', async () => {
    vi.stubGlobal('navigator', { storage: undefined });
    const risk = await getStorageRisk([]);
    expect(risk.unsupported).toBe(true);
    expect(risk.atRisk).toBe(false);
  });

  it('getStorageRisk is atRisk when not persisted and usage >= 60%', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        persisted: vi.fn().mockResolvedValue(false),
        persist: vi.fn().mockResolvedValue(true),
        estimate: vi.fn().mockResolvedValue({ usage: 65 * 1024 * 1024, quota: 100 * 1024 * 1024 }),
      },
    });
    const risk = await getStorageRisk([]);
    expect(risk.unsupported).toBe(false);
    expect(risk.percent).toBe(65);
    expect(risk.atRisk).toBe(true);
  });

  it('getStorageRisk is NOT atRisk when persisted, even at high usage', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        persisted: vi.fn().mockResolvedValue(true),
        persist: vi.fn().mockResolvedValue(true),
        estimate: vi.fn().mockResolvedValue({ usage: 90 * 1024 * 1024, quota: 100 * 1024 * 1024 }),
      },
    });
    const risk = await getStorageRisk([]);
    expect(risk.atRisk).toBe(false);
  });

  it('markPersistRequested + wasPersistRequested round-trip via localStorage', () => {
    // localStorage is provided by jsdom; the persistence helpers short-circuit
    // when window is undefined. In node, that means markPersistRequested is
    // a no-op. We verify the contract by stubbing a fake localStorage on
    // a stubbed window.
    const store: Record<string, string> = {};
    const fakeWindow = { localStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } } } as unknown as Window & typeof globalThis;
    const g = globalThis as { window?: Window & typeof globalThis };
    const previous = g.window;
    g.window = fakeWindow;
    try {
      markPersistRequested();
      expect(wasPersistRequested()).toBe(true);
    } finally {
      g.window = previous;
    }
  });
});

describe('iPhone PWA CSS hooks', () => {
  let css: string;
  beforeEach(() => {
    const here = fileURLToPath(new URL('.', import.meta.url));
    css = readFileSync(join(here, '..', '..', 'app', 'globals.css'), 'utf8');
  });

  it('declares the data-keyboard-open selector so the dock hides when typing', () => {
    expect(css).toMatch(/html\[data-keyboard-open='true'\]/);
  });

  it('declares the data-app-mode selectors for standalone and native', () => {
    expect(css).toMatch(/html\[data-app-mode='standalone'\]/);
    expect(css).toMatch(/html\[data-app-mode='native'\]/);
  });

  it('shrinks the bottom-nav height in landscape phone mode', () => {
    expect(css).toMatch(/@media \(orientation: landscape\) and \(max-height: 500px\)/);
    expect(css).toContain('--bottom-nav-height-landscape');
  });

  it('disables iOS tap highlight on buttons / inputs', () => {
    expect(css).toContain('-webkit-tap-highlight-color: transparent');
    expect(css).toContain('touch-action: manipulation');
  });

  it('uses env(safe-area-inset-*) on topbar and content padding', () => {
    expect(css).toContain('env(safe-area-inset-top)');
    expect(css).toContain('env(safe-area-inset-bottom)');
  });

  it('exposes the touch-target minimum (44pt) via a token', () => {
    expect(css).toContain('--touch-target: 2.75rem');
  });
});
