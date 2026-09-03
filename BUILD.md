# STASH — Build & Release Guide

STASH is a single shared React/TypeScript application that ships as three
targets built from one codebase:

- a **PWA** (primary, Cloudflare-hostable)
- a **Capacitor Android** app
- a **Tauri Windows** desktop app

There is no account, no cloud backend, no subscription, no paid API and no
Firebase/Google auth. All data lives in IndexedDB on the device.

```
STASH shared React app
├── PWA        (vinext / Vite, served as a static + Worker bundle)
├── Capacitor  Android  (android/)
└── Tauri      Windows   (src-tauri/)
```

---

## Prerequisites

- Node.js >= 22.13 and pnpm
- Web: a Chromium browser to verify the PWA
- Android build: JDK 17+, Android Studio / SDK + `ANDROID_HOME`
- Windows build: Rust (current stable) + the Visual Studio MSVC toolchain
  (or WSL with the Tauri prerequisites). Tauri builds the Windows target on
  a Windows host (or via `cargo-xwin`/cross-compilation).

---

## Common build steps

Install dependencies once:

```bash
pnpm install
```

---

## Web / PWA

```bash
# Development
pnpm dev                       # http://localhost:3000, app at /app

# Static prerendered production build
pnpm build:web                 # = vinext build --prerender-all

# The manifest + manual service worker in public/ make it installable/offline.
# Build output lands in dist/ (dist/client for static assets, dist/server for the Worker).
```

Offline behaviour is provided by `public/sw.js` (network-first for navigation
with a cached app-shell fallback; stale-while-revalidate for assets).

### Verify the PWA
1. `pnpm build:web`
2. Serve `dist/client` (or run the Worker) and open `/` and `/app`.
3. In DevTools → Application: confirm the manifest, a registered service worker
   and cached assets. Use the offline toggle to confirm `/app` still opens.
4. `pnpm lint`, `pnpm test`, `pnpm build` must all pass.

---

## Capacitor — Android APK

The Android project is generated at `android/` and consumes the static
`dist/native-web` bundle (the prerendered `/app` route + client assets).

```bash
# 1. Build the static web bundle for native shells
pnpm build:web                 # prerender all routes
pnpm build:native-web          # cheap: assemble dist/native-web from dist/

# 2. Copy the web bundle + register Capacitor plugins into android/
pnpm android:sync              # = cap sync android

# 3. Debug APK (requires Android SDK + JDK)
pnpm android:debug             # = cd android && ./gradlew assembleDebug
#   Output: android/app/build/outputs/apk/debug/app-debug.apk

# 4. Release APK (signing configured in android/app/build.gradle)
pnpm android:release           # = cd android && ./gradlew assembleRelease
#   Output: android/app/build/outputs/apk/release/app-release.apk
```

### App identity
- applicationId / namespace: `com.stash.app`
- App name / label: `STASH`

### Native details
- Splash: branded STASH splash drawables (dark teal + icon) are pre-generated.
- Launcher icons: branded STASH icons are pre-generated per density.
- Status bar / safe areas: `@capacitor/status-bar` + CSS `env(safe-area-inset-*)`.
- Back button: `@capacitor/app` is linked; the shell routes home before exiting.
- File import/export: `@capacitor/filesystem` + `@capacitor/share` power the
  native save/share of backups; web falls back to the browser download.

---

## Tauri — Windows desktop app

The Tauri project is generated at `src-tauri/` and consumes the same
`dist/native-web` bundle.

```bash
# 1. Build the static web bundle for native shells
pnpm build:web
pnpm build:native-web

# 2. Dev (opens a native window against the Vite dev server)
pnpm tauri:dev                 # = tauri dev

# 3. Windows installer / executable
pnpm tauri:build               # = tauri build
#   Outputs under src-tauri/target/release/bundle/:
#     - NSIS/.exe installer (e.g. STASH_1.0.0_x64-setup.exe)
#     - MSI (if WiX is installed)
#     - raw STASH.exe under src-tauri/target/release/
```

### App identity
- identifier: `com.stash.app`
- productName: `STASH`
- window: 1000×720 (min 480×640), centered, resizable, native controls.

### Native details
- Branded icons (`src-tauri/icons/`) are pre-generated.
- File import/export: `tauri-plugin-dialog` + `tauri-plugin-fs` are registered
  and granted in `src-tauri/capabilities/default.json`.
- Offline: the app is a fully local bundle; there is no network dependency.
- CSP is configured in `src-tauri/tauri.conf.json`.

---

## Code sharing

All business logic lives in `lib/stash/` and `components/stash/`. The only
platform-specific code is `lib/stash/platform.ts`, a thin adapter that
feature-detects **web / capacitor / tauri** and chooses the right native API
(or a browser fallback) for saving files, picking files, sharing, the Android
back button and the status bar.
