# STASH release & update channels (v1)

One codebase, three update paths:

| Platform        | Update channel                                                    |
| --------------- | ----------------------------------------------------------------- |
| **Web / PWA**   | Re-deploy to Cloudflare Pages → in-app “Update available / Refresh now” pill (service worker waits for user consent, never swaps silently) |
| **iPhone PWA**  | Same as web. iOS 17+ refreshes the cached PWA automatically; on older iOS the update applies on the next cold open |
| **Android APK** | Settings → About → **Check for updates** against `version.json`; “Download update” opens the APK externally and Android installs it **over** the existing app |
| **Windows/Tauri** | Paused for v1 — code stays in-tree, no release pipeline runs for it |

---

## Android: upgrade-over-install contract

`/app` → Settings → About → Updates shows *current*, *latest*, release notes
and a **Download update** button. It compares the installed build (via
`@capacitor/app` `App.getInfo()`) with the remote `version.json`.

For a user to install a newer APK **without uninstalling** (data intact), two
invariants must hold forever:

1. **Same package id** — `applicationId "com.stash.app"` (see
   `android/app/build.gradle` + `lib/stash/config.ts` `app.android`).
   Never change it. WebView IndexedDB (all STASH data) is partitioned per
   package id.
2. **Same signing key** — Android refuses `INSTALL_FAILED_UPDATE_INCOMPATIBLE`
   when the signature differs.
   * **Debug builds**: the debug keystore is auto-generated per build machine
     (`~/.android/debug.keystore`). Any device keeps working when *you* rebuild
     locally (same machine ⇒ same key). CI-built debug APKs get a fresh key on
     every runner, so treat cross-run debug upgrades as reinstall-time.
   * **Release builds**: generate ONE keystore, back it up offline, keep it
     forever.

```bash
# one-time keystore creation (JDK 17+):
keytool -genkeypair -v -keystore stash-release.keystore -alias stash \
  -keyalg RSA -keysize 2048 -validity 10000

# then build signed release:
export STASH_KEYSTORE_PATH=/abs/path/stash-release.keystore
export STASH_KEYSTORE_PASSWORD=…  STASH_KEY_ALIAS=stash  STASH_KEY_PASSWORD=…
pnpm build:web && pnpm build:native-web && pnpm android:sync && pnpm android:release
```

`android/app/build.gradle` already wires these env vars into a
`stashRelease` signing config (unsigned fallback when unset — the current CI
flow is unchanged). In GitHub Actions you can store the keystore as a base64
secret and write it to a temp file before `assembleRelease`.

## `version.json` — the update manifest

Served **root-absolute** next to the PWA (Cloudflare Pages → `/version.json`),
because the private repo can't expose public release assets without a token.
The file ships from `public/version.json` with every deploy; the service worker
explicitly never caches it.

Schema (see `lib/stash/updates.ts` `parseVersionJson`):

```json
{
  "versionName": "1.1.0",
  "versionCode": 2,
  "url": "https://<host>/STASH-1.1.0.apk",
  "notes": "What changed. Plain text, blank-line paragraphs.",
  "releasedAt": "2026-10-01"
}
```

**Endpoint config lives in ONE place**: `lib/stash/config.ts` →
`updates.android.manifestUrl`. The default is a placeholder until you know
your Pages hostname — replace it with
`https://<project>.pages.dev/version.json`.

## Shipping a new Android version — checklist

1. Bump `versionCode` (+1) and `versionName` in `android/app/build.gradle`.
2. Mirror `versionName`/`versionCode` into `lib/stash/config.ts`
   (`app.version`) and `public/version.json`.
3. Write the release notes paragraph in `app/changelog/page.tsx`.
4. Build & sign the APK (see above); publish the APK at its `url`
   (Pages `/apk/` dir, R2 bucket, or any HTTPS host — GitHub Releases works
   for public repos only).
5. Deploy the web bundle (Pages) so the new `version.json` goes live.
6. `git tag vX.Y.Z && git push --tags` → the `Release` workflow rebuilds and
   attaches artifacts to the tag.

## PWA update behavior (web + iPhone)

* `public/sw.js` bumps `CACHE_NAME` to activate cleanly; new bundles install
  as **waiting**, never skipping on their own.
* When waiting, AppShell shows a themed “**Update available** / **Refresh
  now**” pill (top of the screen). *Refresh now* posts `SKIP_WAITING`, waits
  for `controllerchange`, reloads once — the reload itself busts the network-
  first navigation cache with the fresh shell.
* Marketing pages don't block refresh; users can dismiss nothing — the pill
  never overlays content and hides while the keyboard is open.
* iPhone standalone PWA: after the refresh, the new version is what launches.
  iOS may serve the pre-refresh bundle for one background-to-foreground cycle.

## Rollback

Cloudflare Pages: dashboard → project → Deployments → **Rollback** (one click).
Android: publish a `version.json` pointing at the older `versionCode` is NOT
possible (downgrades are rejected); the last APK at its URL stays installable
manually.
