/* Tests for the public-deploy build script.
 *
 * `scripts/build-public.mjs` is what the GitHub Pages workflow runs after
 * `pnpm build:web`. Its job is to fuse the prerendered HTML + client
 * assets into a self-contained static bundle that any HTTP host (Pages,
 * Cloudflare Pages, plain nginx) can serve, and to prefix every absolute
 * URL with `PUBLIC_BASE_PATH` so the same artifact works for both a
 * root-hosted user/org site (BASE="") and a project site (BASE="/stash").
 *
 * The build script is plain ESM, so we spawn `node` against the actual
 * script. The unit-test runner does not run `pnpm build:web` first, so
 * we kick off one prerender build in `beforeAll` (it produces the
 * `dist/server/prerendered-routes/*.html` + `dist/client/*` that the
 * public script consumes). That's heavier than importing the script
 * directly, but it matches what the CI does and protects against
 * regressions that would only surface in the bundled output (e.g.
 * double-slashes, missed escapes).
 */
import { spawnSync } from 'node:child_process';
import { beforeAll, describe, expect, it } from 'vitest';

type RunResult = { stdout: string; stderr: string; status: number };

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv = process.env): RunResult {
  const result = spawnSync(cmd, args, {
    env,
    encoding: 'utf8',
    cwd: process.cwd(),
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status ?? 0,
  };
}

function runBuildPublic(basePath: string | null): RunResult {
  const env = { ...process.env };
  if (basePath !== null) env.PUBLIC_BASE_PATH = basePath;
  return run('node', ['scripts/build-public.mjs'], env);
}

describe('build-public.mjs', () => {
  // Prerender once. The other test files in the suite don't need the
  // dist/ tree, so we do this here to keep the public-deploy tests
  // self-contained. The same command is what the CI's `pnpm build:web`
  // step runs before the E2E suite, so we're matching the real path.
  beforeAll(() => {
    const pr = run('pnpm', ['build:web']);
    if (pr.status !== 0) {
      throw new Error(
        `pnpm build:web exited with status ${pr.status}\nstdout:\n${pr.stdout}\nstderr:\n${pr.stderr}`
      );
    }
  }, 60_000);

  it('rewrites the manifest start_url, scope, and icon srcs to the base path', () => {
    const { stdout, status } = runBuildPublic('/stash2026');
    expect(status, stdout).toBe(0);
    expect(stdout).toMatch(/start_url:\s+\/stash2026\/app/);
    expect(stdout).toMatch(/Service worker scope:\s+\/stash2026\//);
  });

  it('emits every prerendered route as <route>/index.html so deep links work on a static host', () => {
    const { stdout, status } = runBuildPublic('/stash2026');
    expect(status, stdout).toBe(0);
    for (const route of [
      'index.html',
      'app/index.html',
      'install/index.html',
      'changelog/index.html',
      'privacy/index.html',
      'terms/index.html',
      '404.html',
    ]) {
      expect(stdout, `route missing: ${route}`).toContain(route);
    }
  });

  it('writes a .nojekyll file so GitHub Pages does not run Jekyll on the build', () => {
    const { stdout, status } = runBuildPublic('/stash2026');
    expect(status, stdout).toBe(0);
    expect(stdout).toMatch(/Built .*dist\/public/);
  });

  it('treats PUBLIC_BASE_PATH="" as a root deployment (no prefix)', () => {
    const { stdout, status } = runBuildPublic('');
    expect(status, stdout).toBe(0);
    expect(stdout).toMatch(/start_url:\s+\/app\b/);
    expect(stdout).toMatch(/Service worker scope:\s+\/$/m);
  });

  it('treats PUBLIC_BASE_PATH="/" the same as the empty string (root)', () => {
    const { stdout, status } = runBuildPublic('/');
    expect(status, stdout).toBe(0);
    expect(stdout).toMatch(/start_url:\s+\/app\b/);
    expect(stdout).toMatch(/Service worker scope:\s+\/$/m);
  });
});


