# STASH

STASH is a private, local-first, installable PWA for saving screenshots, images, links, notes, files, and other things worth remembering. Version 1 stores application data and media in IndexedDB; no account, paid backend, or AI service is required.

## Run locally

Requirements: Node.js 22.13 or newer and pnpm.

    pnpm install
    pnpm dev

Open http://localhost:3000. The public site is at / and the application is at /app.

## Validate and build

    pnpm lint
    pnpm test
    pnpm exec playwright install chromium
    pnpm test:e2e
    pnpm build

The deployment bundle is produced in dist/. The Cloudflare Worker entry point is dist/server/index.js and static assets are in dist/client.

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
