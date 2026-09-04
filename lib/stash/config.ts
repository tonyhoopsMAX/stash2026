// ─────────────────────────────────────────────────────────────────────────────
// STASH central configuration.
//
// This is the ONE file to edit when rebranding or re-pointing the app:
//   * `support.kofiUrl`   → the Ko-fi page opened by "Support STASH".
//   * `updates.android.manifestUrl` → where "Check for updates" reads the
//     lightweight remote `version.json` (see docs/releases-and-updates.md).
//   * `version`           → the in-app version string kept in sync with
//     `android/app/build.gradle` (versionName) and `package.json`.
//
// Nothing in STASH talks to a payment provider — the support links are plain
// external URLs opened in the system browser / new tab.
// ─────────────────────────────────────────────────────────────────────────────

export const STASH_CONFIG = {
  app: {
    name: 'STASH',
    tagline: 'Save now. Find it when it matters.',
    /** Bundled web-app identity. Keep in sync with android/app/build.gradle
     *  `versionName` and the About screen. */
    version: {
      name: '1.0.0',
      /** Android versionCode — bump by exactly +1 for every APK you ship.
       *  NEVER change applicationId or the signing keystore, or users cannot
       *  install the new APK over the old one (data would require a
       *  backup/export round-trip instead). */
      code: 1,
    },
    android: {
      /** Package/application ID. Frozen for the life of the app. */
      applicationId: 'com.stash.app',
    },
  },

  support: {
    /** TODO: replace with the real Ko-fi page before publishing.
     *  Everything in-app links OUT; there is no in-app payment processing. */
    kofiUrl: 'https://ko-fi.com/stashapp',
    /** Text used by the native share sheet / Web Share API. */
    shareTitle: 'STASH',
    shareText: 'STASH — a private, local-first place for screenshots, links, notes, files, and ideas.',
    /** Fallback share URL for browsers without Web Share. Empty string →
     *  the share falls back to the current origin (works on any host). */
    shareFallbackUrl: '',
  },

  updates: {
    android: {
      /** Lightweight JSON endpoint checked by Settings → About →
       *  "Check for updates". Deploy `public/version.json` next to the PWA
       *  (Cloudflare Pages) and point this at its absolute URL, e.g.
       *    https://<project>.pages.dev/version.json
       *  It MUST be absolute: the Capacitor WebView has no network origin of
       *  its own, so a relative path would resolve against the bundled
       *  localhost and always report "up to date". */
      manifestUrl: 'https://stash-update-manifest.example.com/version.json',
      /** How long the (non-store) fetch may hang before we surface an
       *  error instead of a spinner. */
      timeoutMs: 8_000,
    },
  },

  storage: {
    /** localStorage mirror of the selected theme id, written on every change
     *  and read by the inline bootstrap in app/layout.tsx BEFORE first paint
     *  so the chosen theme never flashes. */
    themeKey: 'stash-theme-id',
    recentSearchesKey: 'stash-recent-searches',
  },
} as const;

/** Absolute URL for the share fallback: configured URL wins, otherwise the
 *  current origin (PWA host / Pages deployment). */
export function resolveShareUrl(): string {
  const configured = STASH_CONFIG.support.shareFallbackUrl.trim();
  if (configured) return configured;
  if (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null') {
    return window.location.origin;
  }
  return 'https://github.com/tonyhoopsMAX/stash2026';
}
