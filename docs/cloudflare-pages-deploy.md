# Deploying STASH to Cloudflare Pages (production PWA host)

STASH's web/PWA target is **Cloudflare Pages free tier**, served at the **root
path** (`https://<project>.pages.dev/`, app at `/app`). GitHub Pages is no
longer used for production — see the deprecation banner in
[`github-pages-deploy.md`](./github-pages-deploy.md).

Why Pages: root-path hosting (correct SW scope + manifest URLs), free HTTPS,
fast global CDN, private-repo support, unlimited static bandwidth on the free
plan, `_headers` support, and instant rollback from the dashboard.

---

## 1 — What the build produces

```bash
pnpm build:pages          # = pnpm build:web && node scripts/build-public.mjs
```

`dist/public/` is a fully self-contained static bundle:

| Path                         | Purpose                                              |
| ---------------------------- | ---------------------------------------------------- |
| `index.html` + `<route>/index.html` | every prerendered route as its own file     |
| `app/index.html`             | the STASH app entry                                  |
| `manifest.webmanifest`, `manifest.json` | installability (root-absolute icon paths) |
| `sw.js`                      | offline app shell + update prompt plumbing            |
| `pwa-*.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico/svg`, `icon.svg` | universal STASH branding |
| `version.json`               | Android update channel (see releases-and-updates.md) |
| `_headers`                   | cache policy: `sw.js` revalidates, hashed chunks are immutable |
| `404.html`, `.nojekyll`      | deep-link fallback / legacy hosts                    |

Everything is **root-path** — no `/stash2026/` prefix. The base path only ever
needs overriding for the deprecated GitHub Pages flow
(`PUBLIC_BASE_PATH=/<repo> node scripts/build-public.mjs`).

## 2 — Option A: CI deploys automatically (recommended)

1. Cloudflare dashboard → **My Profile → API Tokens → Create Token** →
   template *Edit Cloudflare Workers* (needs **Account · Cloudflare Pages ·
   Edit**). Copy the token.
2. Account ID: any Pages/R2 screen shows it in the right-hand rail.
3. GitHub repo → **Settings → Secrets and variables → Actions**:
   * secret `CLOUDFLARE_API_TOKEN`
   * secret `CLOUDFLARE_ACCOUNT_ID`
   * (optional) variable `CF_PAGES_PROJECT` — defaults to `stash`
4. Create the Pages project once (dashboard → Workers & Pages → Create →
   Pages → "Connect to Git" *or* just let the first CI deploy create it via
   `wrangler pages deploy`).
5. Push to `master` → **Deploy to Cloudflare Pages** workflow builds, verifies
   the bundle, and deploys. Without the secrets it builds and *skips* the
   deploy step instead of failing.

## 3 — Option B: Cloudflare builds from the (private) repo

Dashboard → Workers & Pages → Create application → Pages → **Connect to Git**
(install the Cloudflare GitHub App and grant it access to this **private**
repo — Cloudflare reads it only at deploy time).

| Setting | Value |
| --- | --- |
| Build command | `pnpm install --frozen-lockfile && pnpm build:pages` |
| Build output directory | `dist/public` |
| Root directory | `/` (repo root) |
| Node version env | `NODE_VERSION=22` |

No base path setting is needed (default `/` is correct — that's the whole
point of moving off GitHub Pages).

## 4 — After deploy, verify

- `https://<project>.pages.dev/` → landing; `/app` → the working app.
- DevTools → Application: manifest parses, icons resolve, service worker
  registered at scope `/`, offline toggle keeps `/app` loading.
- Run Lighthouse PWA (installable ✓).
- iPhone Safari: Share → **Add to Home Screen** → launches standalone with the
  STASH icon + dark brand background; works offline after first visit.
- Updating: commit → deploy → reload twice (or wait) → the in-app
  **“Update available / Refresh now”** pill appears; Refresh activates the new
  bundle. (`/sw.js` is served `must-revalidate` via `_headers`.)
- If you bind a custom domain: set `STASH_CONFIG.support.shareFallbackUrl`
  to it (optional) and remember `ko-fi` stays in `lib/stash/config.ts`.

## 5 — Notes & constraints

- Pages `_headers` is honored; `_redirects` is intentionally **not** used —
  all routes are prerendered real files, so SPA fallback would only mask 404s.
- Free tier: static requests are unmetered; functions are irrelevant here
  (Pages deployment is static-only; the Workers deploy path in
  `pnpm build` + `wrangler deploy` remains available but is not needed).
- The APK update manifest (`version.json`) lives in `public/` so it ships with
  every Pages deploy for free — see `docs/releases-and-updates.md`.
