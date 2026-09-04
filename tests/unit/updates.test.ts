/* Update-channel regression tests.
 *
 * Covers BOTH release paths introduced with the v1 polish:
 *
 *  * Android: pure logic of the version.json flow (compare/parse/newer), the
 *    fetch wrapper's timeout/no-store behavior, and the graceful
 *    "unreachable" state when the endpoint is still a placeholder.
 *  * PWA: the service worker must go to *waiting* on updates (no silent
 *    skipWaiting), honor SKIP_WAITING, never cache /version.json, and the
 *    registration script in app/layout.tsx must emit the window event the
 *    in-app banner listens for.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bundledVersionLabel,
  checkForAndroidUpdate,
  compareVersionNames,
  isNewer,
  parseVersionJson,
  readInstalledBuild,
} from '../../lib/stash/updates';
import { STASH_CONFIG } from '../../lib/stash/config';

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

afterEach(() => vi.unstubAllGlobals());

describe('compareVersionNames', () => {
  it('compares numeric dot segments, not lexically', () => {
    expect(compareVersionNames('1.10.0', '1.9.9')).toBe(1);
    expect(compareVersionNames('1.2.3', '1.2.10')).toBe(-1);
    expect(compareVersionNames('2.0', '2.0.0')).toBe(0);
    expect(compareVersionNames('v1.0.1', '1.0.0')).toBe(1);
  });
});

describe('parseVersionJson', () => {
  it('accepts a well-formed manifest', () => {
    const release = parseVersionJson({
      versionName: '1.1.0',
      versionCode: 2,
      url: 'https://example.com/STASH-1.1.0.apk',
      notes: 'Themes everywhere!',
      releasedAt: '2026-10-01',
    });
    expect(release).toEqual({
      versionName: '1.1.0',
      versionCode: 2,
      url: 'https://example.com/STASH-1.1.0.apk',
      notes: 'Themes everywhere!',
      releasedAt: '2026-10-01',
    });
  });

  it('rejects malformed or dangerous payloads', () => {
    expect(parseVersionJson(null)).toBeNull();
    expect(parseVersionJson('nope')).toBeNull();
    expect(parseVersionJson({ versionName: '', versionCode: 1, url: 'https://x/app.apk' })).toBeNull();
    expect(parseVersionJson({ versionName: '1', url: 'javascript:alert(1)' })).toBeNull();
    // Missing versionCode is tolerated (falls back to name compare), not fatal.
    expect(parseVersionJson({ versionName: '1.5', url: 'https://x/a.apk' })?.versionCode).toBe(0);
  });

  it('ships a valid template in public/version.json', () => {
    const raw = JSON.parse(read('../../public/version.json'));
    expect(parseVersionJson(raw)).not.toBeNull();
  });
});

describe('isNewer', () => {
  it('prefers versionCode when both sides have one (Android semantics)', () => {
    // Remote code 5 over installed 4 → update available (even if the names
    // look "older" — the code is what Android itself enforces).
    expect(isNewer({ versionName: '1.0.0', versionCode: 5, url: 'x' }, { versionName: '9.9.9', versionCode: 4 })).toBe(true);
    // Equal codes → never "newer".
    expect(isNewer({ versionName: '1.0.0', versionCode: 5, url: 'x' }, { versionName: '1.0.0', versionCode: 5 })).toBe(false);
  });
  it('falls back to name compare without codes', () => {
    expect(isNewer({ versionName: '1.2.0', versionCode: 0, url: 'x' }, { versionName: '1.2.0' })).toBe(false);
    expect(isNewer({ versionName: '1.2.1', versionCode: 0, url: 'x' }, { versionName: '1.2.0', versionCode: 7 })).toBe(true);
  });
});

describe('readInstalledBuild (web fallback = bundled version)', () => {
  it('uses the config version outside Capacitor', async () => {
    // node env: no window.Capacitor → bundled identity
    expect(await readInstalledBuild()).toEqual({
      versionName: STASH_CONFIG.app.version.name,
      versionCode: STASH_CONFIG.app.version.code,
    });
  });
});

describe('checkForAndroidUpdate', () => {
  it('reports "available" with details when the remote is newer', async () => {
    const payload = {
      versionName: '99.0.0',
      versionCode: 999,
      url: 'https://example.com/STASH-99.0.0.apk',
      notes: 'Test notes',
    };
    const fetchMock = vi.fn(async (_input: string | URL, _init?: RequestInit) => ({ ok: true, json: async () => payload }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await checkForAndroidUpdate();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ cache: 'no-store' });
    expect(result.status).toBe('available');
    if (result.status === 'available') {
      expect(result.latest.notes).toBe('Test notes');
      expect(result.latest.url).toBe('https://example.com/STASH-99.0.0.apk');
    }
  });

  it('is graceful (up-to-date / unreachable) instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect((await checkForAndroidUpdate()).status).toBe('unreachable');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ versionName: '0.0.1', versionCode: 1, url: 'https://x/app.apk' }) })));
    expect((await checkForAndroidUpdate()).status).toBe('up-to-date');
  });
});

describe('PWA service-worker update handling', () => {
  const sw = read('../../public/sw.js');
  const layout = read('../../app/layout.tsx');
  const hook = read('../../hooks/use-sw-update.ts');

  it('bumps the cache and never silently skipWaiting on updates', () => {
    expect(sw).toMatch(/CACHE_NAME = 'stash-pwa-v[2-9]/);
    expect(sw).toContain('registration.active');
    expect(sw).toMatch(/if \(!isUpdate\) await self\.skipWaiting\(\)/);
    expect(sw).toContain("type === 'SKIP_WAITING'");
  });

  it('never caches the Android version.json manifest', () => {
    expect(sw).toContain("url.pathname === '/version.json'");
  });

  it('registration detects waiting workers and emits the banner event', () => {
    expect(layout).toContain('serviceWorker.register("/sw.js",{scope:"/"})');
    expect(layout).toContain('stash-sw-update');
    expect(hook).toContain('getRegistration()');
    expect(hook).toContain("postMessage({ type: 'SKIP_WAITING' })");
    expect(hook).toContain('controllerchange');
  });

  it('the About screen explains the PWA path instead of the APK flow', () => {
    const screens = read('../../components/stash/screens.tsx');
    expect(screens).toContain('Update available');
    expect(screens).toContain('Check for updates');
    expect(screens).toContain('Download update');
    expect(screens).toContain('checkForAndroidUpdate');
    expect(screens).toContain('openExternal');
  });

  it('bundled version label matches config', () => {
    expect(bundledVersionLabel()).toBe(`Version ${STASH_CONFIG.app.version.name}`);
  });
});
