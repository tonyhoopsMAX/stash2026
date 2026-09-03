# Deploying the STASH PWA to GitHub Pages

STASH ships as a **static PWA bundle** that can be hosted on any free
HTTPS host. The recommended target is **GitHub Pages**: every push to
`master` is automatically built and published at
`https://<owner>.github.io/<repo>/` via `.github/workflows/deploy-pages.yml`.

This page walks through:

1. One-time repo setup
2. The first deploy and how to find the URL
3. iPhone install instructions (the goal of this whole workflow)
4. Optional: custom domain or root deployment
5. Troubleshooting

## 1. One-time repo setup

After this PR is merged:

1. Go to **Settings → Pages** in the GitHub UI.
2. Under **Source**, choose **GitHub Actions** (not "Deploy from a
   branch"). Save.
3. No secrets are required. The default `GITHUB_TOKEN` is enough.

The next push to `master` (or any `arena/**` working branch) will
trigger the `Deploy to GitHub Pages` workflow. The first run will:

- Install dependencies with `pnpm`.
- Run `pnpm build:public`, which:
  - Prerenders all 7 routes (`/`, `/app`, `/install`, `/changelog`,
    `/privacy`, `/terms`, plus a `404.html`) with `vinext build`.
  - Rewrites every absolute URL in the bundle with `PUBLIC_BASE_PATH`
    (default `/<repo>`).
  - Writes a `.nojekyll` so GitHub Pages does not run Jekyll on the
    `_next/` directory.
  - Writes a static `404.html` fallback for unknown paths.
  - Re-points the manifest `start_url` / `scope`, the icon `src`s,
    the service-worker scope, and the precache list at the same base
    path, so the PWA installs at the right URL on iOS.
- Uploads the bundle to GitHub Pages.

## 2. Finding the deployed URL

After the first successful run, the workflow summary page links to the
deployed site. The URL is:

```
https://<owner>.github.io/<repo>/
```

For the `tonyhoopsMAX/stash2026` repo the default URL is:

```
https://tonyhoopsMAX.github.io/stash2026/
```

The install page at `/install` and the app at `/app` are both
prerendered and reachable directly.

## 3. iPhone install (the goal)

Open the deployed URL in **Safari on iOS**:

1. Open `https://<owner>.github.io/<repo>/` in Safari.
2. Tap the **Share** button (square with arrow up) at the bottom of
   the screen.
3. Scroll and tap **Add to Home Screen**.
4. Confirm by tapping **Add** in the top-right.

The STASH icon appears on your home screen. It opens in full-screen
mode, works offline (the service worker precaches the app shell), and
uses the same safe-area-aware layout as a native app.

**Why not Chrome or Firefox on iOS?** Apple only allows Safari to
install PWAs. The app still loads in other browsers; it just won't
appear on the home screen.

## 4. Optional: custom domain or root deployment

By default the workflow sets `PUBLIC_BASE_PATH=/<repo>`, which is
correct for project pages. To use a custom domain instead:

1. Add a `CNAME` file to the repo root containing your domain
   (`stash.example.com`). GitHub Pages picks it up automatically.
2. In the repo settings, go to **Settings → Secrets and variables →
   Actions → Variables** and add:
   - **Name**: `PUBLIC_BASE_PATH`
   - **Value**: `` (empty)
3. Trigger a re-run of the `Deploy to GitHub Pages` workflow (or push
   to `master`).

An empty `PUBLIC_BASE_PATH` is also what you want for a **user/org
GitHub Pages site** (a separate repo named exactly
`<owner>.github.io`). In that case the deployed URL becomes
`https://<owner>.github.io/` with the STASH app at `/app`.

## 5. Troubleshooting

- **"Add to Home Screen" missing in Safari**: confirm you're using
  Safari (not Chrome / Firefox), the page fully loaded, and that the
  manifest is reachable at `<url>/manifest.webmanifest`.
- **Service worker not registering**: open the page in Safari, then
  Safari → Develop → Service Workers → confirm the worker is active.
  The worker registers itself once the page loads.
- **404 on `/install` or `/app`**: confirm the deploy completed
  (`gh run list --workflow=deploy-pages`) and that the URL ends with a
  trailing slash (`/install/` and `/app/` both work, bare `/install`
  and `/app` should redirect).
- **Custom domain not resolving**: confirm the CNAME file is in the
  repo root and DNS has a CNAME record pointing to
  `<owner>.github.io.`.
- **To force a redeploy**: re-run the workflow from the Actions tab,
  or push an empty commit (`git commit --allow-empty -m "redeploy"`).

## Hard constraints honored

- **No paid Apple services**: no App Store Connect, no TestFlight,
  no Apple Pay, no Sign in with Apple, no APNs. The PWA installs
  through Safari, free.
- **No native iOS signing**: no Xcode, no provisioning profiles, no
  Capacitor iOS shell. The same prerendered bundle is consumed by
  every entry point.
- **Android + Windows workflows unchanged**: the Capacitor Android
  shell and the Tauri Windows shell still build from
  `pnpm build:native-web`. The `build:public` and `deploy-pages.yml`
  files are additive; they do not touch the Android or Windows
  pipelines.
