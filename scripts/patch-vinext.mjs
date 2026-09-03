import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFile = path.join(__dirname, '..', 'node_modules', 'vinext', 'dist', 'shims', 'fetch-cache.js');

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');
  const targetCode = `const _PATCH_KEY = Symbol.for("vinext.fetchCache.patchInstalled");
function _ensurePatchInstalled() {
\tif (_g[_PATCH_KEY]) return;
\t_g[_PATCH_KEY] = true;
\tglobalThis.fetch = createPatchedFetch();
}`;

  const replacementCode = `const _PATCH_KEY = Symbol.for("vinext.fetchCache.patchInstalled");
function _ensurePatchInstalled() {
\tif (_g[_PATCH_KEY]) return;
\t_g[_PATCH_KEY] = true;
\tif (typeof window !== "undefined") return;
\ttry {
\t\tglobalThis.fetch = createPatchedFetch();
\t} catch {
\t\ttry {
\t\t\tObject.defineProperty(globalThis, "fetch", {
\t\t\t\tvalue: createPatchedFetch(),
\t\t\t\twritable: true,
\t\t\t\tconfigurable: true
\t\t\t});
\t\t} catch {}
\t}
}`;

  if (content.includes(targetCode)) {
    content = content.replace(targetCode, replacementCode);
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('[patch-vinext] Successfully patched vinext fetch-cache.js');
  } else if (content.includes('typeof window !== "undefined"')) {
    console.log('[patch-vinext] vinext fetch-cache.js already patched');
  } else {
    console.warn('[patch-vinext] Target snippet not found in fetch-cache.js');
  }
}
