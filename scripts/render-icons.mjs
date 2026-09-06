// STASH branding renderer.
// Generates Android adaptive/legacy icons, Android splash assets, PWA/iOS
// home-screen icons, and favicons from the vector masters in brand/.
//
// Android adaptive foregrounds intentionally keep the visible mark inside
// roughly 57% of the 108dp canvas. Android launchers apply their own masks and
// zoom, so extra transparent padding here prevents the mark being cropped.
//
//   pnpm icons:render
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function raster(svg, width, height, { transparent = true } = {}) {
  const { default: sharp } = await import('sharp');
  let pipeline = sharp(Buffer.from(svg), { density: 96 }).resize({ width, height, fit: 'fill' });
  if (!transparent) pipeline = pipeline.flatten({ background: '#061311' });
  return pipeline.png().toBuffer();
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const brand = path.join(root, 'brand');
const tmp = path.join(root, '.icons-tmp');
mkdirSync(tmp, { recursive: true });

function svgInner(file) {
  const svg = readFileSync(path.join(brand, file), 'utf8');
  const inner = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1];
  if (!inner) throw new Error(`${file} has unexpected SVG structure`);
  return inner;
}

const MARK_INNER = svgInner('stash-mark.svg');
const MONO_INNER = svgInner('stash-monochrome.svg');

const BG_DEFS = `
  <defs>
    <linearGradient id="bg" x1="54" y1="40" x2="456" y2="474" gradientUnits="userSpaceOnUse">
      <stop stop-color="#123b38"/><stop offset=".5" stop-color="#071817"/><stop offset="1" stop-color="#03100f"/>
    </linearGradient>
    <radialGradient id="halo" cx=".24" cy=".18" r=".86">
      <stop stop-color="#42f0cf" stop-opacity=".35"/><stop offset=".58" stop-color="#21c5ae" stop-opacity=".08"/><stop offset="1" stop-color="#21c5ae" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

/** Standalone icon canvas. The mark is deliberately restrained for launcher masks. */
function iconSvg(variant = 'rounded', markScale = 0.68) {
  const bgShape =
    variant === 'rounded'
      ? '<rect width="512" height="512" rx="116" fill="url(#bg)"/>'
      : variant === 'circle'
        ? '<circle cx="256" cy="256" r="256" fill="url(#bg)"/>'
        : '<rect width="512" height="512" fill="url(#bg)"/>';
  const pad = (512 - 512 * markScale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  ${BG_DEFS}${bgShape}
  <rect width="512" height="512" rx="${variant === 'rounded' ? 116 : 0}" fill="url(#halo)"/>
  <svg x="${pad}" y="${pad}" width="${512 * markScale}" height="${512 * markScale}" viewBox="0 0 512 512" fill="none">${MARK_INNER}</svg>
</svg>`;
}

/** Android adaptive foreground: 248px mark on a 432px canvas (~57%). */
function adaptiveForegroundSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 432" fill="none">
  <svg x="92" y="92" width="248" height="248" viewBox="0 0 512 512" fill="none">${MARK_INNER}</svg>
</svg>`;
}

function adaptiveMonochromeSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 432" fill="none">
  <svg x="92" y="92" width="248" height="248" viewBox="0 0 512 512" fill="none">${MONO_INNER}</svg>
</svg>`;
}

/** Maskable PWA icon: full bleed background with mark inside the safe zone. */
function maskableSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  ${BG_DEFS}<rect width="512" height="512" fill="url(#bg)"/><rect width="512" height="512" fill="url(#halo)"/>
  <svg x="105" y="105" width="302" height="302" viewBox="0 0 512 512" fill="none">${MARK_INNER}</svg>
</svg>`;
}

/** New splash: calm dark-green field, subtle halo rings, compact mark + wordmark. */
function splashSvg(width, height) {
  const portrait = height >= width;
  const box = Math.min(width, height);
  const mark = Math.round(box * (portrait ? 0.17 : 0.2));
  const word = Math.max(16, Math.round(box * (portrait ? 0.052 : 0.036)));
  const tagline = Math.max(8, Math.round(word * 0.38));
  const cx = width / 2;
  const cy = height / 2;
  const markY = cy - mark * 0.72;
  const ring1 = Math.round(mark * 1.38);
  const ring2 = Math.round(mark * 1.78);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
  <defs>
    <radialGradient id="splashGlow" cx=".5" cy=".5" r=".62">
      <stop stop-color="#1b8f80" stop-opacity=".32"/><stop offset=".55" stop-color="#0e5148" stop-opacity=".14"/><stop offset="1" stop-color="#03100f" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="splashBg" x1="0" y1="0" x2="${width}" y2="${height}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#103b36"/><stop offset=".48" stop-color="#0a342f"/><stop offset="1" stop-color="#061d1b"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#splashBg)"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${box * 0.46}" ry="${box * 0.46}" fill="url(#splashGlow)"/>
  <circle cx="${cx}" cy="${markY + mark / 2}" r="${ring2 / 2}" stroke="#65e7d0" stroke-opacity=".055" stroke-width="1"/>
  <circle cx="${cx}" cy="${markY + mark / 2}" r="${ring1 / 2}" stroke="#65e7d0" stroke-opacity=".10" stroke-width="1.5"/>
  <svg x="${cx - mark / 2}" y="${markY}" width="${mark}" height="${mark}" viewBox="0 0 512 512" fill="none">${MARK_INNER}</svg>
  <text x="${cx}" y="${markY + mark + word * 1.18}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="${word}" font-weight="600" letter-spacing="${word * 0.48}" fill="#effffb">STASH</text>
  <text x="${cx}" y="${markY + mark + word * 2.05}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="${tagline}" font-weight="600" letter-spacing="${tagline * 0.5}" fill="#83cfbf">SAVE NOW · FIND LATER</text>
</svg>`;
}

const JOBS = [];
const P = (file) => path.join(tmp, file);
const job = (file, svg, width, height = width) => JOBS.push({ file, svg, width, height });

// Web / PWA / iPhone.
job('pwa-64x64.png', iconSvg('rounded', 0.68), 64);
job('pwa-192x192.png', iconSvg('rounded', 0.68), 192);
job('pwa-512x512.png', iconSvg('rounded', 0.68), 512);
job('maskable-icon-512x512.png', maskableSvg(), 512);
job('apple-touch-icon-180x180.png', iconSvg('square', 0.62), 180);
job('favicon-48.png', iconSvg('rounded', 0.72), 48);
job('favicon-32.png', iconSvg('rounded', 0.74), 32);
job('favicon-16.png', iconSvg('rounded', 0.78), 16);

// Android legacy + adaptive layers.
const ANDROID_DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [dpi, scale] of Object.entries(ANDROID_DENSITIES)) {
  const px = Math.round(48 * scale);
  job(`ic_launcher-${dpi}.png`, iconSvg('square', 0.64), px);
  job(`ic_launcher_round-${dpi}.png`, iconSvg('circle', 0.6), px);
  job(`fg-${dpi}.png`, adaptiveForegroundSvg(), Math.round(108 * scale));
  job(`mono-${dpi}.png`, adaptiveMonochromeSvg(), Math.round(108 * scale));
}

// Capacitor splash matrix.
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

const sized = (svg, w, h) =>
  /<svg[^>]*\swidth=/.test(svg) ? svg : svg.replace('<svg ', `<svg width="${w}" height="${h}" `);

for (const { file, svg, width, height } of JOBS) {
  const png = await raster(sized(svg, width, height), width, height);
  writeFileSync(P(file), png);
}
console.log(`[icons] rasterized ${JOBS.length} PNGs`);

function copy(src, dest) {
  const abs = path.join(root, dest);
  mkdirSync(path.dirname(abs), { recursive: true });
  execSync(`cp ${JSON.stringify(P(src))} ${JSON.stringify(abs)}`);
}

copy('pwa-64x64.png', 'public/pwa-64x64.png');
copy('pwa-192x192.png', 'public/pwa-192x192.png');
copy('pwa-512x512.png', 'public/pwa-512x512.png');
copy('maskable-icon-512x512.png', 'public/maskable-icon-512x512.png');
copy('apple-touch-icon-180x180.png', 'public/apple-touch-icon-180x180.png');
try {
  execSync(`convert -background none ${P('favicon-16.png')} ${P('favicon-32.png')} ${P('favicon-48.png')} ${path.join(root, 'public/favicon.ico')}`);
} catch {
  console.warn('[icons] ImageMagick unavailable — favicon.ico left untouched');
  copy('favicon-48.png', 'public/favicon-48.png');
}
writeFileSync(path.join(root, 'public/icon.svg'), readFileSync(path.join(brand, 'stash-master.svg')));
writeFileSync(path.join(root, 'public/favicon.svg'), readFileSync(path.join(brand, 'stash-master.svg')));

const res = 'android/app/src/main/res';
const DPR = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
for (const dpi of DPR) {
  copy(`ic_launcher-${dpi}.png`, `${res}/mipmap-${dpi}/ic_launcher.png`);
  copy(`ic_launcher_round-${dpi}.png`, `${res}/mipmap-${dpi}/ic_launcher_round.png`);
  copy(`fg-${dpi}.png`, `${res}/mipmap-${dpi}/ic_launcher_foreground.png`);
  copy(`mono-${dpi}.png`, `${res}/mipmap-${dpi}/ic_launcher_monochrome.png`);
  copy(`splash-port-${dpi}.png`, `${res}/drawable-port-${dpi}/splash.png`);
  copy(`splash-land-${dpi}.png`, `${res}/drawable-land-${dpi}/splash.png`);
}
copy('splash-port-mdpi.png', `${res}/drawable/splash.png`);

console.log('[icons] Done — launcher artwork is centered inside the adaptive safe zone.');
