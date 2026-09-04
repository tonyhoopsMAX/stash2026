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

## Deploy at zero cost — Cloudflare Pages (production)

The PWA ships as a **fully static root-path bundle** for Cloudflare Pages free tier. The GitHub Pages flow is deprecated and disabled.

    pnpm build:pages        # → dist/public (all routes prerendered, manifest + sw at root)

Then either let `.github/workflows/deploy-cloudflare-pages.yml` handle it (set the `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets once), or connect the repo in the Pages dashboard with build command `pnpm install --frozen-lockfile && pnpm build:pages` and output directory `dist/public`. Full guide: [`docs/cloudflare-pages-deploy.md`](./docs/cloudflare-pages-deploy.md).

No environment variables, databases, buckets, or paid plans are required. A Workers deployment (`pnpm build && pnpm wrangler deploy --config dist/server/wrangler.json`) remains available for the SSR variant but is not needed for v1.

## Themes, branding, support & updates

- **10 themes** (OG, Archive Paper, Neo Brutal, Pastel Cloud, Noir Atelier, Aurora Flow, Focused Grid, Zen Archive, Soft Journal, Metro Pop) built as design-token blocks in `app/globals.css` + a registry in `lib/stash/themes.ts`; the Appearance screen is a live-preview theme browser that persists across restarts.
- One **universal STASH identity** (icon + splash) across Android, PWA, iPhone, and favicon — regenerated with `pnpm icons:render` from the `brand/` vector masters.
- **Support STASH** (Ko-fi + Share) in Settings/About — external links only, configured in `lib/stash/config.ts`.
- **Android update check** in Settings/About via a lightweight `version.json`; **PWA** updates surface as an "Update available / Refresh now" prompt. See [`docs/releases-and-updates.md`](./docs/releases-and-updates.md).

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
