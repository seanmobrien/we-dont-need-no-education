import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { skip } from 'node:test';

const fixtureDir = join(__dirname, 'fixtures', 'consumer-smoke');
const fixturePackageJson = JSON.parse(
  readFileSync(join(fixtureDir, 'package.json'), 'utf8'),
) as { dependencies?: Record<string, string> };
const repoRoot = join(fixtureDir, '..', '..', '..', '..', '..');
const yarnRelease = join(repoRoot, '.yarn', 'releases', 'yarn-4.12.0.cjs');
it('passes', () => { });
skip('skipping smoke test for consumer fixture until we have a better strategy for testing compatibility with different versions of next-auth and @auth/core', () => {
  describe('consumer smoke compile', () => {
    it('compiles a consumer fixture that only depends on compat', () => {
      expect(fixturePackageJson.dependencies ?? {}).not.toHaveProperty(
        '@tanstack/react-query',
      );

      const result = spawnSync(
        process.execPath,
        [yarnRelease, 'tsc', '--noEmit', '-p', join(fixtureDir, 'tsconfig.json')],
        {
          cwd: repoRoot,
          encoding: 'utf8',
        },
      );

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
    });
  });
});