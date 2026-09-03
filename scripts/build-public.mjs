// Assembles a fully self-contained static bundle for free public hosts
// (GitHub Pages, Cloudflare Pages, Netlify, plain nginx, ...).
//
// vinext prerenders every route to `dist/server/prerendered-routes/*.html`
// and drops the client chunks / static assets under `dist/client`. This
// script fuses the two into a single `dist/public/` folder that any
// static host can serve as-is. It also prefixes every absolute URL with
// the configured `PUBLIC_BASE_PATH` so the bundle works on both:
//   * a user/org GitHub Pages site that serves at the root  (BASE="")
//   * a project GitHub Pages site that serves at /<repo>/   (BASE="/stash2026")
//
// Differences from `build-native-web.mjs`:
//   * All 7 prerendered routes are written as `<route>/index.html`, so
//     deep links work on a static host (no SSR runtime to fall back to).
//   * The service-worker `navigator.serviceWorker.register(...)` call is
//     kept (we WANT offline + iOS Add-to-Home-Screen), and re-pointed at
//     the base path so scope and SW URL stay in lockstep.
//   * The manifest, icon URLs, and SW precache list are rewritten to
//     match the base path.
//   * A `.nojekyll` and a fallback `404.html` are written so GitHub
//     Pages does not run the site through Jekyll (which ignores `_next/`)
//
// Why this exists in addition to `build:native-web`:
//   The native shells (Capacitor / Tauri) load a single `index.html`
//   and never see the network. A public deploy needs every route
//   served as its own HTML file so direct deep-links (e.g.
//   https://<host>/install) and the service worker's offline
//   navigation fallback both work.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const clientDir = path.join(root, 'dist', 'client');
const prerenderDir = path.join(root, 'dist', 'server', 'prerendered-routes');
const outDir = path.join(root, 'dist', 'public');

// PUBLIC_BASE_PATH is empty for root-hosted sites and "/<repo>" for
// GitHub Pages project sites. We never emit a trailing slash here so
// the resulting URLs are easy to grep; the post-process step normalizes
// any double slashes that would otherwise appear in HTML attributes.
const rawBase = (process.env.PUBLIC_BASE_PATH ?? '/stash2026').trim();
const base = rawBase === '/' ? '' : rawBase.replace(/\/+$/, '');

if (!fs.existsSync(clientDir)) {
  throw new Error(
    `Missing client assets at ${clientDir}. Run \`pnpm build:web\` first.`
  );
}
if (!fs.existsSync(prerenderDir)) {
  throw new Error(
    `Missing prerendered HTML at ${prerenderDir}. Run \`pnpm build:web\` first.`
  );
}

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Missing source directory: ${src}`);
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function writeFile(p, contents) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, contents, 'utf8');
}

// Prefix every absolute URL (in attribute values or JSON string fields)
// with the base path. We deliberately only rewrite leading slashes so
// we don't damage relative URLs that the build emits for in-document
// navigation. This is a string-level transform, not a parser, but
// `vinext`/`Vite` always emit a `href="/foo"` / `src="/foo"` shape for
// absolute asset references, so the only false positives would be
// inlined text like `<p>Visit /docs for help</p>` — and we don't ship
// any of that in the prerendered HTML.
function prefixUrl(absolutePath) {
  if (!absolutePath.startsWith('/')) return absolutePath;
  // Special-case the bare "/" so we don't turn it into "//".
  if (absolutePath === '/') return base ? `${base}/` : '/';
  return `${base}${absolutePath}`;
}

// Same shape, but only for use inside JSON string values. We do NOT
// touch the keys, only the values that look like absolute URLs.
function rewriteManifest(manifest) {
  const urlFields = new Set([
    'id',
    'start_url',
    'scope',
    'src',
    'url',
  ]);
  function walk(value) {
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = urlFields.has(k) && typeof v === 'string'
          ? prefixUrl(v)
          : walk(v);
      }
      return out;
    }
    return value;
  }
  return walk(manifest);
}

function rewriteHtml(html) {
  // The vinext prerenderer emits a known set of absolute paths:
  //   * Asset URLs in HTML attributes:  href="/..."  src="/..."
  //     data-rsc-css-href="/..."
  //   * The inline SW registration block:
  //       navigator.serviceWorker.register("/sw.js", {scope: "/"})
  //     (in both the plain <script> form and the JSON-escaped RSC form)
  //   * Asset URLs inside the RSC payload's modulepreload + link
  //     registry, e.g. `:HL["/_next/static/css/..."]`.
  //
  // We rewrite all four shapes in a single pass by replacing every
  // string literal that starts with "/" + an asset path with its
  // base-prefixed equivalent. This is safe because the only "/"-
  // prefixed string literals in the prerendered HTML are (a) the
  // routes themselves (`"/app"`, `"/install"`, ...), which are the
  // canonical Next.js route names and must stay un-prefixed so the
  // client router's basePath stripping works, and (b) the asset URLs
  // listed above. We only rewrite the asset paths, not the route
  // names.
  let out = html;
  // Helper: a RegExp that matches a quoted or unquoted absolute path
  // that begins with one of the asset prefixes we want to rewrite.
  // We list the prefixes explicitly so route names like "/app" are
  // not affected.
  const ASSET_PREFIXES = [
    '/_next/',
    '/sw.js',
    '/manifest.webmanifest',
    '/manifest.json',
    '/favicon',
    '/icon.svg',
    '/apple-touch-icon',
    '/maskable-icon',
    '/pwa-',
    '/screenshot-',
  ];
  // Each prefix is matched at a quote boundary or after a `="`/
  // after a JSON-escaped `\"` so we don't touch e.g. comments.
  for (const p of ASSET_PREFIXES) {
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Plain form:  "/_next/..." inside a "..." or '...' string.
    const plainDouble = new RegExp(`"(${escaped}[^"]*)"`, 'g');
    const plainSingle = new RegExp(`'(${escaped}[^']*)'`, 'g');
    out = out.replace(plainDouble, (_m, url) => {
      return JSON.stringify(prefixUrl(url));
    });
    out = out.replace(plainSingle, (_m, url) => {
      return JSON.stringify(prefixUrl(url));
    });
    // JSON-escaped form:  \\"/_next/...\\"  (i.e. \"/_next/...\" inside
    // a JSON string that's itself been string-escaped for embedding
    // in an HTML <script>).
    const jsonEscaped = new RegExp(`\\\\"(${escaped}[^"]*)\\\\"`, 'g');
    out = out.replace(jsonEscaped, (_m, url) => {
      // Reconstruct the JSON-escaped form: each " becomes \" so the
      // string literal in the file is `\\"/stash2026/_next/...\\"`.
      const rewritten = JSON.stringify(prefixUrl(url));
      return `\\${rewritten.slice(0, -1)}\\"`;
    });
  }

  // Special case: the inline service worker scope attribute is
  //   {scope: "/"}     (plain form, in the <script> tag)
  //   {scope: \"/\"}    (JSON-escaped form, in the RSC payload)
  // The bare "/" is not in ASSET_PREFIXES (we want route names like
  // "/app" to keep their un-prefixed form), so we rewrite it here.
  const rootScope = JSON.stringify(prefixUrl('/'));
  out = out.replaceAll('{scope:"/"}', `{scope:${rootScope}}`);
  out = out.replaceAll("{scope: '/'}", `{scope: ${rootScope}}`);
  out = out.replaceAll(
    '{scope:\\\\\\"/\\\\\\"}',
    `{scope:\\\\\\"${prefixUrl('/').replace(/"/g, '')}\\\\\\"}`
  );
  return out;
}

function rewriteSw(js) {
  // The SW references absolute paths in its precache list and in the
  // navigation fallback. Rewrite both with the same prefixUrl() so
  // offline navigations land on the right cached copy.
  return js
    .replace(
      /'(?:\/|\/(?:[A-Za-z0-9_./-]*))'/g,
      (m) => {
        const inner = m.slice(1, -1);
        return JSON.stringify(prefixUrl(inner));
      }
    )
    // scope-restricted rewrites for `caches.match('/app')` etc. The
    // generic regex above also catches them, so this is belt + braces.
    .replaceAll("'/app'", JSON.stringify(prefixUrl('/app')))
    .replaceAll("'/'", JSON.stringify(prefixUrl('/')));
}

// --- Step 1. Reset and copy client assets. -------------------------------
rmrf(outDir);
fs.mkdirSync(outDir, { recursive: true });
copyDir(clientDir, outDir);

// --- Step 2. Rewrite the manifest files in place. ------------------------
for (const name of ['manifest.json', 'manifest.webmanifest']) {
  const inPath = path.join(clientDir, name);
  if (!fs.existsSync(inPath)) continue;
  const parsed = JSON.parse(fs.readFileSync(inPath, 'utf8'));
  const rewritten = rewriteManifest(parsed);
  writeFile(path.join(outDir, name), JSON.stringify(rewritten, null, 2) + '\n');
}

// --- Step 3. Rewrite the service worker in place. ------------------------
const swIn = path.join(clientDir, 'sw.js');
if (fs.existsSync(swIn)) {
  const sw = fs.readFileSync(swIn, 'utf8');
  writeFile(path.join(outDir, 'sw.js'), rewriteSw(sw));
}

// --- Step 4. Write every prerendered route as <route>/index.html. -------
const ROUTES = [
  { file: 'index.html', route: '/' },
  { file: 'app.html', route: '/app' },
  { file: 'install.html', route: '/install' },
  { file: 'changelog.html', route: '/changelog' },
  { file: 'privacy.html', route: '/privacy' },
  { file: 'terms.html', route: '/terms' },
];
for (const { file, route } of ROUTES) {
  const src = path.join(prerenderDir, file);
  if (!fs.existsSync(src)) {
    console.warn(`[public] skipping missing route: ${file}`);
    continue;
  }
  const html = fs.readFileSync(src, 'utf8');
  const rewritten = rewriteHtml(html);
  const dest = route === '/'
    ? path.join(outDir, 'index.html')
    : path.join(outDir, route.slice(1), 'index.html');
  writeFile(dest, rewritten);
  console.log(
    `[public] route ${route.padEnd(12)} -> ${path.relative(root, dest)}`
  );
}

// --- Step 5. 404 fallback. ---------------------------------------------
// GitHub Pages serves 404.html for any path that doesn't exist on disk.
// We point that at the prerendered 404 page (which vinext renders as
// the standard "404: This page could not be found." layout). The PWA
// already handles offline navigations in the SW, so this only fires for
// genuinely unknown URLs.
{
  const src = path.join(prerenderDir, '404.html');
  if (fs.existsSync(src)) {
    const html = fs.readFileSync(src, 'utf8');
    writeFile(path.join(outDir, '404.html'), rewriteHtml(html));
    console.log(`[public] route /404 (fallback) -> dist/public/404.html`);
  }
}

// --- Step 6. .nojekyll so GitHub Pages doesn't run Jekyll on the build.
// Jekyll would otherwise strip the `_next/` directory and silently
// break every asset reference in the prerendered HTML.
writeFile(path.join(outDir, '.nojekyll'), '');

// --- Step 7. _headers (Cloudflare Pages / Netlify style cache rules).
// GitHub Pages ignores this file, but the same artifact can be
// uploaded to CF Pages / Netlify by pointing their build at the same
// `dist/public` directory.
const headersFile = path.join(clientDir, '_headers');
if (fs.existsSync(headersFile)) {
  fs.copyFileSync(headersFile, path.join(outDir, '_headers'));
}

// --- Summary. ---------------------------------------------------------
const totalBytes = (() => {
  let n = 0;
  function walk(p) {
    for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
      const fp = path.join(p, entry.name);
      if (entry.isDirectory()) walk(fp);
      else n += fs.statSync(fp).size;
    }
  }
  walk(outDir);
  return n;
})();

console.log(
  `\n[public] Built ${outDir} (${(totalBytes / 1024).toFixed(1)} KiB) base="${base || '/'}"`
);
console.log(`[public] Service worker scope: ${prefixUrl('/')}`);
console.log(`[public] Manifest start_url:   ${prefixUrl('/app')}`);

export { outDir, base };
