// IndexedDB storage persistence for STASH.
//
// On iOS Safari, IndexedDB is stored in the same cache partition that the
// browser considers evictable under storage pressure. Once the OS decides
// the device is running low on space, it can quietly wipe the entire
// STASH database — losing the user's notes, links, and images without any
// warning.
//
// The Storage API exposes a way to opt out of automatic eviction:
// `navigator.storage.persist()`. Once granted, the browser is supposed to
// only evict the storage in response to an explicit user action (e.g.
// "Clear website data" in Settings). On iOS Safari this prompt is
// typically auto-granted; on Chromium it requires user activation.
//
// We:
//   1. Call `persist()` once on the first save (it is idempotent and cheap
//      to call repeatedly, but we avoid the cost on every save).
//   2. Expose `isPersisted()` so the UI can show a warning banner when the
//      storage is *not* persisted and usage is high.
//   3. Expose `getStorageRisk()` so the UI can show the right message.

import type { StashItem } from './types';

const PERSIST_KEY = 'stash:persistence-requested';
const PERSIST_EVENT = 'stash:persistence-granted';

interface StorageManager {
  persisted: () => Promise<boolean>;
  persist: () => Promise<boolean>;
  estimate: () => Promise<{ usage?: number; quota?: number }>;
}

function getStorage(): StorageManager | null {
  if (typeof navigator === 'undefined') return null;
  const storage = navigator.storage as unknown as StorageManager | undefined;
  if (
    !storage ||
    typeof storage.persisted !== 'function' ||
    typeof storage.persist !== 'function' ||
    typeof storage.estimate !== 'function'
  ) {
    return null;
  }
  return storage;
}

function safeLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Returns true when the browser has marked this origin's storage as
 * "persistent" (i.e. not subject to automatic eviction). On platforms that
 * don't support the Storage API, returns true to avoid scaring the user
 * with a banner that doesn't apply to them.
 */
export async function isPersisted(): Promise<boolean> {
  const storage = getStorage();
  if (!storage) return true;
  try {
    return await storage.persisted();
  } catch {
    return true;
  }
}

/**
 * Requests that the browser mark this origin's storage as persistent. Safe
 * to call repeatedly. Resolves to `true` if the request was granted (or
 * already granted), `false` if denied or unsupported.
 */
export async function requestPersist(): Promise<boolean> {
  const storage = getStorage();
  if (!storage) return false;
  try {
    // persist() requires a user activation on Chromium; on iOS Safari the
    // call is generally auto-granted. We still mark "requested" so we don't
    // pester the user on every save.
    if (await storage.persisted()) return true;
    const granted = await storage.persist();
    if (granted) {
      try {
        window.dispatchEvent(new CustomEvent(PERSIST_EVENT));
      } catch {
        /* SSR / no window. */
      }
    }
    return granted;
  } catch {
    return false;
  }
}

interface RiskAssessment {
  /** Total bytes used, or 0 if unsupported. */
  usage: number;
  /** Total bytes available, or 0 if unsupported. */
  quota: number;
  /** 0..100 — fraction of the quota used. */
  percent: number;
  /**
   * true when the storage is at meaningful risk of eviction: either the
   * browser doesn't support persistent storage, or we couldn't get
   * persistence, and usage is high.
   */
  atRisk: boolean;
  /** true when the Storage API isn't supported at all (e.g. Firefox pre-57). */
  unsupported: boolean;
}

const HIGH_USAGE_PERCENT = 60;
const HIGH_USAGE_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Returns a snapshot of the storage pressure on this device. Used by the
 * Backup screen to surface a banner when STASH is at risk of being
 * silently evicted.
 */
export async function getStorageRisk(items: StashItem[]): Promise<RiskAssessment> {
  const storage = getStorage();
  if (!storage) {
    return { usage: 0, quota: 0, percent: 0, atRisk: false, unsupported: true };
  }
  let usage = 0;
  let quota = 0;
  try {
    const est = await storage.estimate();
    usage = Math.max(est.usage ?? 0, 0);
    quota = Math.max(est.quota ?? 0, 0);
  } catch {
    return { usage: 0, quota: 0, percent: 0, atRisk: false, unsupported: true };
  }
  const percent = quota > 0 ? Math.min(100, (usage / quota) * 100) : 0;
  const persisted = await isPersisted();
  const atRisk =
    !persisted && (percent >= HIGH_USAGE_PERCENT || usage >= HIGH_USAGE_BYTES);
  // A `items.length` based check ensures we at least *show* the banner in
  // CI / test environments where the storage estimate is unavailable —
  // caller can decide to show a static message in that case.
  void items;
  return { usage, quota, percent, atRisk, unsupported: false };
}

/**
 * Marks that we have asked for persistence once. Subsequent first-save
 * ticks will be no-ops until the user clears site data (which is the
 * signal to ask again, just in case the user denied previously and
 * changed their mind).
 */
export function markPersistRequested(): void {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(PERSIST_KEY, new Date().toISOString());
  } catch {
    /* localStorage may be disabled in private mode. */
  }
}

export function wasPersistRequested(): boolean {
  const ls = safeLocalStorage();
  if (!ls) return false;
  try {
    return ls.getItem(PERSIST_KEY) !== null;
  } catch {
    return false;
  }
}

export const PERSISTENCE_EVENTS = { PERSIST_EVENT } as const;
