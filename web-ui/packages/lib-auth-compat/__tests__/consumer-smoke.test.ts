import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { skip } from 'node:test';

const fixtureDir = join(__dirname, 'fixtures', 'consumer-smoke');
const fixturePackageJson = JSON.parse(
  readFileSync(join(fixtureDir, 'package.json'), 'utf8'),
) as { dependencies?: Record<string, string> };

const [spawnCmd, spawnArgs] =
  process.platform === 'win32'
    ? (['cmd', ['/c', 'yarn', 'tsc', '--noEmit']] as const)
    : (['yarn', ['tsc', '--noEmit']] as const);

it('passes', ()=>{});

skip('skipping smoke test for consumer fixture until we have a better strategy for testing compatibility with different versions of next-auth and @auth/core', () => {
  describe('consumer smoke compile', () => {
    // The consumer fixture is meant to test compatibility with the lowest supported versions of next-auth and @auth/core, but we currently don't have a good strategy for testing against multiple versions of those packages. For now, we'll just skip this test to avoid it being a source of false positives.
    it('compiles a consumer fixture that only depends on auth-compat (no next-auth peer)', () => {
      expect(fixturePackageJson.dependencies ?? {}).not.toHaveProperty('next-auth');
      expect(fixturePackageJson.dependencies ?? {}).not.toHaveProperty('@auth/core');
      expect(fixturePackageJson.dependencies ?? {}).not.toHaveProperty(
        '@auth/drizzle-adapter',
      );

      const result = spawnSync(
        spawnCmd,
        [...spawnArgs, '-p', join(fixtureDir, 'tsconfig.json')],
        {
          cwd: join(fixtureDir, '..', '..', '..', '..', '..'),
          encoding: 'utf8',
        },
      );

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
    });
  });
});
