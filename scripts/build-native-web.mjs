// Assemblies a static, self-contained web bundle for the native shells
// (Capacitor Android and Tauri Windows).
//
// vinext prerenders each route to `dist/server/prerendered-routes/*.html` with
// `--prerender-all`, and drops the client chunks/static assets under
// `dist/client`. Native wrappers cannot run the SSR server, so we combine the
// prerendered `/app` route (as `index.html`) with the client assets into a
// single folder that can be served from disk.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const clientDir = path.join(root, 'dist', 'client');
const prerenderDir = path.join(root, 'dist', 'server', 'prerendered-routes');
const outDir = path.join(root, 'dist', 'native-web');

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

function copyFile(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Missing source file: ${src}`);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

// 1. Reset the output folder.
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

// 2. Copy all client static assets (chunks, css, images, icons, manifest, sw).
copyDir(clientDir, outDir);

// 3. The native shell boots into the STASH app, so the prerendered `/app`
//    route becomes `index.html`. The marketing landing page is kept as
//    `index-landing.html` for reference but is not the app entry.
copyFile(path.join(prerenderDir, 'app.html'), path.join(outDir, 'index.html'));
if (fs.existsSync(path.join(prerenderDir, 'index.html'))) {
  copyFile(path.join(prerenderDir, 'index.html'), path.join(outDir, 'index-landing.html'));
}

// 4. Remove the service worker registration reference that is meaningless in a
//    native WebView (native assets are bundled locally, so offline comes free).
//    We still ship the file for completeness, but strip the register call so it
//    does not warn in the WebView console.
const indexPath = path.join(outDir, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/navigator\.serviceWorker\.register\([^)]*\)/g, 'void 0');
fs.writeFileSync(indexPath, html, 'utf8');

const size = fs.statSync(indexPath).size;
console.log(`[native-web] Built ${outDir}`);
console.log(`[native-web] index.html (${size} bytes) ${path.relative(root, indexPath)}`);

export { outDir };
