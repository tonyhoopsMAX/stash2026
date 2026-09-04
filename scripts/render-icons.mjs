// Renders the full STASH branding matrix from the vector masters in brand/:
// Android adaptive/launcher icons + splashes, PWA icons (any/maskable),
// apple-touch-icon, and favicons (+ .ico). Rasterization uses `sharp`
// (librsvg-backed, installed as a dev dependency) — no browser or system
// SVG toolchain needed. ImageMagick (`convert`) is only used to compose the
// multi-size favicon.ico and is optional.
//
//   node scripts/render-icons.mjs    (writes the repo asset dirs)
//
// One universal icon + one universal splash for ALL 10 themes.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Render an SVG (already sized in exact pixels via width/height attrs) to PNG.
async function raster(svg, width, height, { transparent = true } = {}) {
  const { default: sharp } = await import('sharp');
  let pipeline = sharp(Buffer.from(svg), { density: 96 }).resize({ width, height, fit: 'fill' });
  if (!transparent) pipeline = pipeline.flatten({ background: '#000000' });
  return pipeline.png().toBuffer();
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const brand = path.join(root, 'brand');
const tmp = path.join(root, '.icons-tmp');
mkdirSync(tmp, { recursive: true });

const MARK_INNER = (() => {
  const svg = readFileSync(path.join(brand, 'stash-mark.svg'), 'utf8');
  const inner = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1];
  if (!inner) throw new Error('stash-mark.svg has unexpected shape');
  return inner;
})();
const FOREGROUND_INNER = (() => {
  const svg = readFileSync(path.join(brand, 'stash-foreground.svg'), 'utf8');
  const inner = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1];
  if (!inner) throw new Error('stash-foreground.svg has unexpected shape');
  return inner;
})();
const MONO_INNER = (() => {
  const svg = readFileSync(path.join(brand, 'stash-monochrome.svg'), 'utf8');
  const inner = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1];
  return inner;
})();

const BG_GRADIENT = `
  <defs>
    <linearGradient id="bg" x1="80" y1="24" x2="430" y2="500" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0c2626"/><stop offset=".55" stop-color="#071516"/><stop offset="1" stop-color="#040d0e"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.32" cy="0.2" r="0.9">
      <stop stop-color="#25dac5" stop-opacity=".3"/><stop offset="1" stop-color="#25dac5" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

/** 512-viewBox icon canvases. `variant`: rounded | square | circle. */
function iconSvg(variant = 'rounded', markScale = 0.82, bleed = false) {
  const bgShape =
    variant === 'rounded' ? '<rect width="512" height="512" rx="112" fill="url(#bg)"/>' :
    variant === 'circle' ? '<circle cx="256" cy="256" r="256" fill="url(#bg)"/>' :
    '<rect width="512" height="512" fill="url(#bg)"/>';
  const s = markScale / (bleed ? 1.06 : 1);
  const pad = (512 - 512 * s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  ${BG_GRADIENT}${bgShape}<rect width="512" height="512" rx="${variant === 'rounded' ? 112 : 0}" fill="url(#glow)"/>
  <svg x="${pad}" y="${pad}" width="${512 * s}" height="${512 * s}" viewBox="0 0 512 512" fill="none">${MARK_INNER}</svg>
</svg>`;
}

/** Maskable: full-bleed square, mark inside the circular safe zone (~60%). */
function maskableSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs><linearGradient id="bg2" x1="80" y1="24" x2="430" y2="500" gradientUnits="userSpaceOnUse"><stop stop-color="#0c2626"/><stop offset="1" stop-color="#050f10"/></linearGradient></defs>
  <rect width="512" height="512" fill="url(#bg2)"/>
  <svg x="110" y="110" width="292" height="292" viewBox="0 0 512 512" fill="none">${MARK_INNER}</svg>
</svg>`;
}

/** Splash canvas at WxH: centered mark + STASH wordmark. */
function splashSvg(width, height) {
  const isPortrait = height >= width;
  const box = Math.min(width, height);
  const mark = Math.round(box * (isPortrait ? 0.3 : 0.42));
  const word = Math.round(box * (isPortrait ? 0.058 : 0.048));
  const cx = width / 2;
  const cy = height / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
  <defs>
    <radialGradient id="glow" cx="0.5" cy="${(cy / height).toFixed(3)}" r="0.75">
      <stop stop-color="#18b3a3" stop-opacity=".34"/><stop offset="1" stop-color="#18b3a3" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="#061112"/>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>
  <svg x="${cx - mark / 2}" y="${cy - mark / 2 - word * 1.7}" width="${mark}" height="${mark}" viewBox="0 0 512 512" fill="none">${MARK_INNER}</svg>
  <text x="${cx}" y="${cy + mark / 2 + word * 1.15}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="${word}" font-weight="bold" letter-spacing="${word * 0.62}" fill="#d9fff7">STASH</text>
</svg>`;
}

const JOBS = [];
const P = (file) => path.join(tmp, file);
const job = (file, svg, width, height = width) => JOBS.push({ file, svg, width, height });

// — web / PWA —
job('icon-rounded-1024.png', iconSvg('rounded'), 1024);
job('pwa-64x64.png', iconSvg('rounded'), 64);
job('pwa-192x192.png', iconSvg('rounded'), 192);
job('pwa-512x512.png', iconSvg('rounded'), 512);
job('maskable-icon-512x512.png', maskableSvg(), 512);
job('maskable-icon-192x192.png', maskableSvg(), 192);
job('apple-touch-icon-180x180.png', iconSvg('square', 0.74), 180);
job('favicon-48.png', iconSvg('rounded', 0.88), 48);
job('favicon-32.png', iconSvg('rounded', 0.88), 32);
job('favicon-16.png', iconSvg('rounded', 0.92), 16);

// — Android legacy + adaptive layers —
const ANDROID_DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [dpi, scale] of Object.entries(ANDROID_DENSITIES)) {
  const px = Math.round(48 * scale);
  job(`ic_launcher-${dpi}.png`, iconSvg('square', 0.9), px);
  job(`ic_launcher_round-${dpi}.png`, iconSvg('circle', 0.72), px);
  job(`fg-${dpi}.png`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 432" fill="none">${FOREGROUND_INNER}</svg>`, Math.round(108 * scale));
  job(`mono-${dpi}.png`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 432" fill="none">${MONO_INNER}</svg>`, Math.round(108 * scale));
}

// — splashes (Capacitor matrix, portrait + landscape) —
const SPLASH_SIZES = {
  mdpi: [320, 480],
  hdpi: [480, 720],
  xhdpi: [720, 1280],
  xxhdpi: [1080, 1920],
  xxxhdpi: [1440, 2560],
};
for (const [dpi, [w, h]] of Object.entries(SPLASH_SIZES)) {
  job(`splash-port-${dpi}.png`, splashSvg(w, h), w, h);
  job(`splash-land-${dpi}.png`, splashSvg(h, w), h, w);
}

// — rasterize every job with sharp/librsvg —
// Inject exact pixel sizing so libvips renders the SVG at (or above) the
// target size; `raster` then fits it down to the precise canvas.
const sized = (svg, w, h) =>
  /<svg[^>]*\swidth=/.test(svg) ? svg : svg.replace('<svg ', `<svg width="${w}" height="${h}" `);

for (const { file, svg, width, height } of JOBS) {
  const png = await raster(sized(svg, width, height), width, height);
  writeFileSync(P(file), png);
}
console.log(`[icons] rasterized ${JOBS.length} PNGs`);

// — place into repo —
function copy(src, dest) {
  const abs = path.join(root, dest);
  mkdirSync(path.dirname(abs), { recursive: true });
  execSync(`cp ${JSON.stringify(P(src))} ${JSON.stringify(abs)}`);
}

// public/
copy('pwa-64x64.png', 'public/pwa-64x64.png');
copy('pwa-192x192.png', 'public/pwa-192x192.png');
copy('pwa-512x512.png', 'public/pwa-512x512.png');
copy('maskable-icon-512x512.png', 'public/maskable-icon-512x512.png');
copy('apple-touch-icon-180x180.png', 'public/apple-touch-icon-180x180.png');
try {
  execSync(`convert -background none ${P('favicon-16.png')} ${P('favicon-32.png')} ${P('favicon-48.png')} ${path.join(root, 'public/favicon.ico')}`);
} catch {
  console.warn('[icons] ImageMagick unavailable — wrote PNG favicons, favicon.ico left untouched');
  copy('favicon-48.png', 'public/favicon-48.png');
}
writeFileSync(path.join(root, 'public/icon.svg'), readFileSync(path.join(brand, 'stash-master.svg')));
writeFileSync(path.join(root, 'public/favicon.svg'), readFileSync(path.join(brand, 'stash-master.svg')));
console.log('[icons] public/ updated (icons + favicon + svg masters)');

// android res
const res = 'android/app/src/main/res';
const DPR = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
for (const dpi of DPR) {
  copy(`ic_launcher-${dpi}.png`, `${res}/mipmap-${dpi}/ic_launcher.png`);
  copy(`ic_launcher-${dpi}.png`, `${res}/mipmap-${dpi}/ic_launcher_round.png`);
  copy(`fg-${dpi}.png`, `${res}/mipmap-${dpi}/ic_launcher_foreground.png`);
  copy(`mono-${dpi}.png`, `${res}/mipmap-${dpi}/ic_launcher_monochrome.png`);
  copy(`splash-port-${dpi}.png`, `${res}/drawable-port-${dpi}/splash.png`);
  copy(`splash-land-${dpi}.png`, `${res}/drawable-land-${dpi}/splash.png`);
}
copy('splash-port-mdpi.png', `${res}/drawable/splash.png`);
console.log('[icons] android res updated (launcher/round/foreground/splash at 5 densities)');

console.log('\n[icons] Done. Verify with `identify public/pwa-512x512.png` and open public/icon.svg in a browser.');
