// CI-only helper: reads Playwright's JUnit report and surfaces every failing
// test as a GitHub Actions annotation (`::error::`). Exits 0 so this step
// never fails the job — it only makes the E2E failure visible in the run's
// "Annotations", which is simpler to inspect than digging through logs.
import { readFileSync, existsSync } from 'node:fs';

const file = 'test-results/junit.xml';

if (!existsSync(file)) {
  console.log('::error::E2E failed but no junit.xml report was produced');
  process.exit(0);
}

let xml;
try {
  xml = readFileSync(file, 'utf8');
} catch (err) {
  console.log(`::error::Could not read ${file}: ${err.message}`);
  process.exit(0);
}

// Match each <testcase ...> ... (optional <failure .../>) ... </testcase>.
const re =
  /<testcase\b([^>]*)>([\s\S]*?)<\/testcase>|<testcase\b([^>]*)\/\s*>/g;

let matched = false;
let m;
while ((m = re.exec(xml)) !== null) {
  const attrs = m[1] || m[3] || '';
  const inner = m[2] || '';
  const name = /\bname="([^"]*)"/.exec(attrs)?.[1] ?? '?';
  const cls = /classname="([^"]*)"/.exec(attrs)?.[1] ?? '?';
  const failBody = /<failure\b([^>]*)>([\s\S]*?)<\/failure>/.exec(inner);
  if (!failBody) continue;
  matched = true;
  const fattrs = failBody[1];
  const innerText = (failBody[2] || '').replace(/\s+/g, ' ').trim();
  let msg = /message="([^"]*)"/.exec(fattrs)?.[1] ?? '';
  const decode = (s) =>
    s.replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>')
      .replaceAll('&amp;', '&').replaceAll('&apos;', "'");
  msg = decode(msg).slice(0, 600);
  console.log(`::error title=E2E FAILED::${cls} :: ${name}`);
  if (msg) console.log(`::error file=${file}::E2E assertion error: ${msg}`);
  if (innerText) console.log(`::error file=${file}::E2E detail: ${decode(innerText).slice(0, 1200)}`);
}

if (!matched) {
  console.log('::error::E2E failed, but no failing testcase was found in junit.xml');
}
