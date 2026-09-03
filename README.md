# STASH

STASH is a private, local-first, installable PWA for saving screenshots, images, links, notes, files, and other things worth remembering. Version 1 stores application data and media in IndexedDB; no account, paid backend, or AI service is required.

## Build with GitHub Actions (no local toolchains)

You do **not** need Android Studio, the Android SDK, Rust, Visual Studio, MSVC, or
Playwright browsers installed on your machine. GitHub builds everything for you.

### Build Android APK

1. Open the **Actions** tab on GitHub.
2. Click **Build Android APK**.
3. Click **Run workflow** and choose the release branch (default `master`).
4. Wait for the run to finish, then open the **STASH-Android-Debug** artifact and download `STASH-debug.apk`.

### Build Windows App

1. Open the **Actions** tab on GitHub.
2. Click **Build Windows App**.
3. Click **Run workflow** and choose the release branch.
4. When the run finishes, open the **STASH-Windows** artifact and download `STASH.exe` / `STASH-Setup.exe`.

> The Windows build is unsigned, so Windows SmartScreen may show
> "Unknown Publisher". That is expected for this private/test build.

---

## Run locally (for developers)

Requirements: Node.js 22.13 or newer and pnpm.

    pnpm install
    pnpm dev

Open http://localhost:3000. The public site is at / and the application is at /app.

## Validate and build

    pnpm install
    pnpm lint
    pnpm test
    pnpm build:web    # statically prerendered production bundle (recommended)

The deployment bundle is produced in dist/. The Cloudflare Worker entry point is dist/server/index.js and static assets are in dist/client.

## Native builds (Android & Windows)

The same React core also ships as a **Capacitor Android** app (`android/`) and a
**Tauri Windows** app (`src-tauri/`). Both consume the static `dist/native-web`
bundle produced from the shared app. See [`BUILD.md`](./BUILD.md) for the
exact commands and toolchain requirements.

    pnpm build:web
    pnpm build:native-web
    pnpm android:sync && pnpm android:debug   # Android APK (needs Android SDK)
    pnpm tauri:build                          # Windows installer (needs Rust/MSVC)

## Deploy at zero cost

The current Vinext/Vite build contains a small React Server Components request handler, so deploy it as a Cloudflare Worker rather than a static Pages-only upload. It is eligible for Cloudflare's free Workers tier and requires no database or object-storage service.

1. Create a free Cloudflare account and install Wrangler if it is not already available: pnpm add -D wrangler.
2. Authenticate once: pnpm wrangler login.
3. Build: pnpm build.
4. Deploy the generated Worker: pnpm wrangler deploy --config dist/server/wrangler.json.
5. Open the workers.dev URL printed by Wrangler.

No environment variables, migrations, databases, buckets, paid plans, authentication service, or API keys are required.

For Cloudflare Pages specifically, a future pure-static export can target dist/client; the current Vinext release does not emit complete route HTML for every page, so uploading only that directory would omit the request handler.

## Architecture

- app/ — public routes, application entry point, metadata, and global Fluid Material tokens
- components/stash/ — app shell, dialogs, screen composition, and reusable product UI
- lib/stash/ — data types, Dexie persistence, Zustand state, search, backup, and resurfacing logic
- tests/unit/ — deterministic search and resurfacing tests
- tests/e2e/ — Playwright desktop/mobile product flows

The persistence layer is isolated from UI and state orchestration, leaving room for a future optional sync adapter without rewriting the product surface.

## Local-data notes

- Browser storage can be cleared by browser settings, profile cleanup, or device resets.
- Export backups regularly for important content.
- Reminder dates are stored and organized locally. System notifications depend on browser permission and platform support.
- External URL titles and previews are not fetched in version 1, preserving the no-backend and offline constraints.
