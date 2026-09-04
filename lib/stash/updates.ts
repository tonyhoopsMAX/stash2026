// Android APK update channel — the whole flow is:
//
//   1. A tiny `version.json` lives at `STASH_CONFIG.updates.android.manifestUrl`
//      (deployed alongside the PWA on Cloudflare Pages, or anywhere static).
//   2. Settings → About → "Check for updates" fetches it with `no-store`,
//      compares `versionName`/`versionCode` against the *installed* build.
//   3. If newer: show current + latest + release notes + "Download update".
//      The download link opens the APK URL externally (system browser).
//
// There is deliberately no in-app install/permission dance: Android installs
// the downloaded APK itself. Because the package id (com.stash.app) and signing
// key are stable, installing the new APK upgrades over the old one and keeps
// the app's data (IndexedDB WebView storage) intact.

import { STASH_CONFIG } from './config';

export interface LatestRelease {
  versionName: string;
  versionCode: number;
  /** Absolute URL of the newer APK — opened externally. */
  url: string;
  /** Markdown-free release notes (plain text paragraphs). */
  notes?: string;
  releasedAt?: string;
}

export interface InstalledBuild {
  versionName: string;
  versionCode?: number;
}

export type UpdateCheckResult =
  | { status: 'up-to-date'; latest: LatestRelease }
  | { status: 'available'; latest: LatestRelease }
  | { status: 'unreachable'; error: string };

/** Numeric dot-segment compare: "1.2.10" > "1.2.9" > "1.2". Returns
 *  -1 | 0 | 1. Non-numeric segments compare as 0 (defensive). */
export function compareVersionNames(a: string, b: string): -1 | 0 | 1 {
  const pa = String(a).trim().replace(/^v/i, '').split('.');
  const pb = String(b).trim().replace(/^v/i, '').split('.');
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const na = Number.parseInt(pa[i] ?? '0', 10) || 0;
    const nb = Number.parseInt(pb[i] ?? '0', 10) || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

/** Validate + normalize the remote payload. Anything malformed → null so the
 *  UI can show a friendly error instead of crashing on a typo'd JSON. */
export function parseVersionJson(raw: unknown): LatestRelease | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.versionName !== 'string' || !value.versionName.trim()) return null;
  const versionCode = Number(value.versionCode);
  if (typeof value.url !== 'string' || !/^https?:\/\//i.test(value.url.trim())) return null;
  return {
    versionName: value.versionName.trim(),
    versionCode: Number.isInteger(versionCode) && versionCode > 0 ? versionCode : 0,
    url: value.url.trim(),
    notes: typeof value.notes === 'string' && value.notes.trim() ? value.notes.trim() : undefined,
    releasedAt: typeof value.releasedAt === 'string' ? value.releasedAt : undefined,
  };
}

/** versionCode wins when both sides have one (Android semantics); fall back
 *  to the dotted version name. */
export function isNewer(latest: LatestRelease, installed: InstalledBuild): boolean {
  if (latest.versionCode > 0 && typeof installed.versionCode === 'number' && installed.versionCode > 0) {
    return latest.versionCode > installed.versionCode;
  }
  return compareVersionNames(latest.versionName, installed.versionName) > 0;
}

export async function fetchLatestRelease(fetchImpl: typeof fetch = globalThis.fetch): Promise<LatestRelease | null> {
  const url = STASH_CONFIG.updates.android.manifestUrl;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STASH_CONFIG.updates.android.timeoutMs);
  try {
    const response = await fetchImpl(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) return null;
    return parseVersionJson(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Read the *installed* native build info (@capacitor/app) or fall back to
 *  the bundled config version (web builds / unit tests / WebView-less dev). */
export async function readInstalledBuild(): Promise<InstalledBuild> {
  try {
    if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
      const { App } = await import('@capacitor/app');
      const info = await App.getInfo();
      const numeric = Number.parseInt((info.build ?? '').replace(/\D/g, ''), 10);
      return { versionName: info.version, versionCode: Number.isFinite(numeric) ? numeric : undefined };
    }
  } catch {
    /* plugin unavailable — fall through to the bundled version */
  }
  return { versionName: STASH_CONFIG.app.version.name, versionCode: STASH_CONFIG.app.version.code };
}

export async function checkForAndroidUpdate(): Promise<UpdateCheckResult> {
  const [latest, installed] = await Promise.all([fetchLatestRelease(), readInstalledBuild()]);
  if (!latest) {
    return {
      status: 'unreachable',
      error: 'Could not reach the update server. Check your connection, or the update URL in lib/stash/config.ts.',
    };
  }
  return isNewer(latest, installed) ? { status: 'available', latest } : { status: 'up-to-date', latest };
}

/** The installed build, exported for the About screen header row. */
export function bundledVersionLabel(): string {
  return `Version ${STASH_CONFIG.app.version.name}`;
}
